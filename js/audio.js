/**
 * First-party procedural audio bus.
 * No remote audio, no external services and no autoplay without a gesture.
 * WebAudio oscillators provide a subtle ambient chord, not a fake song player.
 */
import { clamp, exponentialDamp } from './math.js';

const AUDIO_FREQUENCY = 432;
const AUDIO_LIMIT = .085;
const WORLD_NOTES = Object.freeze({
  galaxy: [1, 1.5, 2],
  planets: [1, 1.25, 1.5],
  blackhole: [.5, 1, 1.4983],
  ocean: [.5, 1, 1.3348],
  aurora: [1, 1.26, 1.49],
  clouds: [.75, 1, 1.6],
  storm: [.5, 1, 2.02],
  solar: [1, 1.498, 2.248]
});

export class AudioBus {
  constructor(options = {}) {
    this.context = null;
    this.master = null;
    this.compressor = null;
    this.filter = null;
    this.oscillators = [];
    this.gains = [];
    this.lfo = null;
    this.lfoGain = null;
    this.analyser = null;
    this.data = null;
    this.running = false;
    this.muted = false;
    this.world = 'galaxy';
    this.level = 0;
    this.targetLevel = 0;
    this.onState = options.onState ?? (() => {});
    this.onError = options.onError ?? (() => {});
    this.gestureUnlocked = false;
    this.volume = clamp(options.volume ?? .42, 0, 1);
  }

  getAudioContextClass() {
    if (typeof window === 'undefined') return null;
    return window.AudioContext || window.webkitAudioContext || null;
  }

  async start() {
    if (this.running) return true;
    const AudioContext = this.getAudioContextClass();
    if (!AudioContext) {
      this.onError('This browser does not support WebAudio.');
      return false;
    }
    try {
      this.context = new AudioContext({ latencyHint: 'interactive' });
      await this.context.resume();
      this.compressor = this.context.createDynamicsCompressor();
      this.compressor.threshold.value = -18;
      this.compressor.knee.value = 8;
      this.compressor.ratio.value = 2;
      this.compressor.attack.value = .06;
      this.compressor.release.value = .35;
      this.filter = this.context.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 480;
      this.filter.Q.value = .34;
      this.master = this.context.createGain();
      this.master.gain.value = 0;
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = .9;
      this.data = new Uint8Array(this.analyser.frequencyBinCount);
      this.filter.connect(this.compressor);
      this.compressor.connect(this.master);
      this.master.connect(this.analyser);
      this.analyser.connect(this.context.destination);
      this.createVoices();
      this.createLFO();
      this.setWorld(this.world);
      this.running = true;
      this.gestureUnlocked = true;
      this.setLevel(this.volume, .75);
      this.onState('playing');
      return true;
    } catch (error) {
      this.onError(error.message || String(error));
      await this.dispose();
      return false;
    }
  }

  createVoices() {
    const ctx = this.context;
    for (let index = 0; index < 3; index++) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = index === 0 ? 'sine' : index === 1 ? 'triangle' : 'sine';
      oscillator.frequency.value = AUDIO_FREQUENCY;
      oscillator.detune.value = index === 0 ? -3 : index === 1 ? 2 : 0;
      gain.gain.value = index === 0 ? .18 : index === 1 ? .075 : .035;
      oscillator.connect(gain);
      gain.connect(this.filter);
      oscillator.start();
      this.oscillators.push(oscillator);
      this.gains.push(gain);
    }
  }

  createLFO() {
    const ctx = this.context;
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = .067;
    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.value = 85;
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.filter.frequency);
    this.lfo.start();
  }

  setWorld(worldId) {
    this.world = worldId;
    if (!this.context || !this.oscillators.length) return;
    const notes = WORLD_NOTES[worldId] ?? WORLD_NOTES.galaxy;
    const now = this.context.currentTime;
    this.oscillators.forEach((oscillator, index) => {
      const note = AUDIO_FREQUENCY * notes[index];
      oscillator.frequency.cancelScheduledValues(now);
      oscillator.frequency.setTargetAtTime(note, now, .38 + index * .1);
    });
    const brightness = {
      galaxy: 480,
      planets: 670,
      blackhole: 260,
      ocean: 540,
      aurora: 790,
      clouds: 390,
      storm: 220,
      solar: 830
    };
    this.filter.frequency.setTargetAtTime(brightness[worldId] ?? 480, now, .6);
  }

  setLevel(level, seconds = .25) {
    const normalized = clamp(level, 0, 1);
    this.volume = normalized;
    if (!this.master || !this.context) return;
    const now = this.context.currentTime;
    const target = this.muted ? .000001 : normalized * AUDIO_LIMIT;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(Math.max(.000001, target), now, Math.max(.005, seconds / 4));
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    this.setLevel(this.volume);
    this.onState(this.muted ? 'muted' : this.running ? 'playing' : 'stopped');
  }

  async stop() {
    if (!this.context) return;
    this.setLevel(0, .14);
    await new Promise(resolve => setTimeout(resolve, 150));
    await this.dispose();
    this.onState('stopped');
  }

  async toggle() {
    if (this.running) {
      await this.stop();
      return false;
    }
    return this.start();
  }

  suspend() {
    if (this.context && this.context.state === 'running') this.context.suspend();
  }

  resume() {
    if (this.context && this.running && this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  sampleLevel(deltaSeconds = .016) {
    if (!this.analyser || !this.data || !this.running) {
      this.level = exponentialDamp(this.level, 0, 3, deltaSeconds);
      return this.level;
    }
    this.analyser.getByteFrequencyData(this.data);
    let sum = 0;
    const bins = Math.min(this.data.length, 25);
    for (let index = 0; index < bins; index++) sum += this.data[index];
    const rms = sum / Math.max(1, bins) / 255;
    this.level = exponentialDamp(this.level, Math.min(1, rms * 3.2), 4, deltaSeconds);
    return this.level;
  }

  getStatus() {
    return {
      running: this.running,
      muted: this.muted,
      frequency: AUDIO_FREQUENCY,
      world: this.world,
      level: this.level,
      contextState: this.context?.state ?? 'closed'
    };
  }

  async dispose() {
    this.running = false;
    for (const oscillator of this.oscillators) {
      try { oscillator.stop(); } catch { /* Already stopped. */ }
      oscillator.disconnect();
    }
    this.oscillators.length = 0;
    for (const gain of this.gains) gain.disconnect();
    this.gains.length = 0;
    if (this.lfo) {
      try { this.lfo.stop(); } catch { /* Already stopped. */ }
      this.lfo.disconnect();
      this.lfo = null;
    }
    this.lfoGain?.disconnect();
    this.lfoGain = null;
    this.filter?.disconnect();
    this.master?.disconnect();
    this.compressor?.disconnect();
    this.analyser?.disconnect();
    if (this.context && this.context.state !== 'closed') await this.context.close();
    this.context = null;
    this.master = null;
    this.filter = null;
    this.compressor = null;
    this.analyser = null;
    this.data = null;
  }
}
