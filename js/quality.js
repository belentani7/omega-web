/** Adaptive resolution and quality budget, conservative on mobile GPUs. */
import { clamp, median, movingAverage, percentile } from './math.js';

const PROFILES = Object.freeze({
  eco: { dpr: .65, shader: .32, maxFps: 30, samples: 18, batteryFriendly: true },
  high: { dpr: 1, shader: .72, maxFps: 60, samples: 36, batteryFriendly: false },
  ultra: { dpr: 1.5, shader: 1, maxFps: 60, samples: 54, batteryFriendly: false }
});

export class QualityController {
  constructor(options = {}) {
    this.requested = options.mode ?? 'auto';
    this.profile = 'high';
    this.history = [];
    this.lastSample = 0;
    this.fps = 0;
    this.averageFps = null;
    this.sampleCount = 0;
    this.lastChange = 0;
    this.goodWindows = 0;
    this.badWindows = 0;
    this.slowThreshold = 26;
    this.fastThreshold = 54;
    this.cooldownMs = 12000;
    this.warmupMs = 3500;
    this.createdAt = performance.now();
    this.reduced = options.reduced ?? false;
    this.mobile = this.detectMobile();
    this.saveData = this.detectDataSaver();
    this.batteryLow = false;
    this.visible = true;
    this.onChange = options.onChange ?? (() => {});
    if (this.requested !== 'auto') this.profile = this.requested;
    else this.profile = this.mobile || this.saveData ? 'eco' : 'high';
    this.detectBattery();
  }

  detectMobile() {
    if (typeof navigator === 'undefined') return false;
    const touchPoints = Number(navigator.maxTouchPoints || 0);
    const smallScreen = typeof window !== 'undefined' && window.innerWidth < 800;
    return touchPoints > 0 && smallScreen;
  }

  detectDataSaver() {
    if (typeof navigator === 'undefined') return false;
    return Boolean(navigator.connection?.saveData);
  }

  async detectBattery() {
    if (typeof navigator === 'undefined' || !navigator.getBattery) return;
    try {
      const battery = await navigator.getBattery();
      const update = () => {
        this.batteryLow = battery.level < .17 && !battery.charging;
        if (this.batteryLow && this.requested === 'auto') this.setProfile('eco');
      };
      update();
      battery.addEventListener('levelchange', update);
      battery.addEventListener('chargingchange', update);
    } catch { /* Battery state is optional and privacy sensitive. */ }
  }

  setMode(mode) {
    if (!['auto', 'eco', 'high', 'ultra'].includes(mode)) return false;
    this.requested = mode;
    this.setProfile(mode === 'auto' ? (this.mobile ? 'eco' : 'high') : mode);
    return true;
  }

  cycleMode() {
    const choices = ['auto', 'eco', 'high', 'ultra'];
    const currentIndex = choices.indexOf(this.requested);
    const next = choices[(currentIndex + 1) % choices.length];
    this.setMode(next);
    return next;
  }

  setProfile(name) {
    if (!(name in PROFILES) || this.profile === name) return;
    const previous = this.profile;
    this.profile = name;
    this.lastChange = performance.now();
    this.goodWindows = 0;
    this.badWindows = 0;
    this.onChange(name, previous, this.getSettings());
  }

  reportFrame(deltaMs, now = performance.now()) {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0 || deltaMs > 500) return;
    if (!this.visible) return;
    this.history.push(deltaMs);
    if (this.history.length > 120) this.history.shift();
    this.sampleCount++;
    if (now - this.lastSample < 1600 || this.history.length < 8) return;
    this.lastSample = now;
    const frameMs = median(this.history);
    this.fps = clamp(1000 / frameMs, 0, 144);
    this.averageFps = movingAverage(this.averageFps, this.fps, .24);
    this.adapt(now);
  }

  adapt(now) {
    if (this.requested !== 'auto') return;
    if (now - this.createdAt < this.warmupMs) return;
    if (now - this.lastChange < this.cooldownMs) return;
    const fps = this.averageFps ?? this.fps;
    if (fps < this.slowThreshold) {
      this.badWindows++;
      this.goodWindows = 0;
    } else if (fps > this.fastThreshold) {
      this.goodWindows++;
      this.badWindows = 0;
    } else {
      this.goodWindows = 0;
      this.badWindows = 0;
    }
    if (this.badWindows >= 2) {
      this.setProfile('eco');
    } else if (this.goodWindows >= 5 && !this.mobile && !this.saveData && !this.batteryLow) {
      this.setProfile('high');
    }
  }

  getSettings() {
    const profile = PROFILES[this.profile] ?? PROFILES.high;
    const deviceDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    return {
      mode: this.requested,
      profile: this.profile,
      dpr: Math.min(deviceDpr, profile.dpr),
      shader: profile.shader,
      maxFps: this.reduced ? 24 : profile.maxFps,
      samples: profile.samples,
      fps: Math.round(this.fps),
      averageFps: Math.round(this.averageFps ?? 0),
      p90FrameMs: percentile(this.history, .9),
      mobile: this.mobile,
      saveData: this.saveData,
      reduced: this.reduced
    };
  }

  shouldRender(lastFrame, now) {
    if (!this.visible) return false;
    const { maxFps } = this.getSettings();
    if (!lastFrame) return true;
    return now - lastFrame >= 1000 / maxFps - 1;
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    if (this.visible) {
      this.history = [];
      this.lastSample = 0;
    }
  }

  setReducedMotion(reduced) {
    this.reduced = Boolean(reduced);
  }
}
