/**
 * Canvas overlay for optical calibration marks, signal trails and atmospheric
 * particles. This is an optional decoration and never intercepts input.
 */
import { createRng, clamp, TAU } from './math.js';

export class SignalOverlay {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { alpha: true });
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.reduced = Boolean(options.reduced);
    this.visible = true;
    this.world = 'galaxy';
    this.time = 0;
    this.frames = 0;
    this.random = createRng(43207);
    this.particles = this.createParticles(220);
    this.connectionColor = '#ff003c';
  }

  createParticles(count) {
    return Array.from({ length: count }, (_, index) => ({
      id: index,
      x: this.random(),
      y: this.random(),
      z: this.random(),
      speed: this.random() * .0009 + .00008,
      size: this.random() * 1.1 + .2,
      opacity: this.random() * .6 + .18,
      phase: this.random() * TAU,
      hue: this.random() < .09 ? 0 : 1
    }));
  }

  setWorld(id) {
    this.world = id;
    const colors = {
      galaxy: '#ff003c',
      planets: '#ff8d5c',
      blackhole: '#ff5164',
      ocean: '#65f7ff',
      aurora: '#68e0be',
      clouds: '#b4acff',
      storm: '#a686ff',
      solar: '#ffd45c'
    };
    this.connectionColor = colors[id] || colors.galaxy;
  }

  resize(width, height, dpr = 1) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.dpr = clamp(dpr, .5, 2);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.context?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  draw(frame) {
    if (!this.visible || !this.context) return;
    const ctx = this.context;
    ctx.clearRect(0, 0, this.width, this.height);
    if (this.reduced) return;
    this.time = frame.time;
    this.frames++;
    if (this.world === 'galaxy' || this.world === 'solar') this.drawStarTrails(frame);
    if (this.world === 'ocean') this.drawSeaMist(frame);
    if (this.world === 'storm') this.drawRainOverlay(frame);
    if (this.world === 'blackhole') this.drawLensGuides(frame);
    this.drawSignalMarkers(frame);
  }

  drawStarTrails(frame) {
    const ctx = this.context;
    const w = this.width;
    const h = this.height;
    const active = this.world === 'solar' ? .08 : .16;
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      const drift = frame.time * particle.speed * 40;
      const x = ((particle.x + drift * .014) % 1) * w;
      const y = ((particle.y + Math.sin(frame.time * .06 + particle.phase) * .002) % 1) * h;
      const opacity = particle.opacity * active;
      ctx.fillStyle = particle.hue ? `rgba(244,244,252,${opacity})` : `rgba(255,70,120,${opacity})`;
      ctx.beginPath();
      ctx.arc(x, y, particle.size, 0, TAU);
      ctx.fill();
    }
  }

  drawSeaMist(frame) {
    const ctx = this.context;
    const w = this.width;
    const h = this.height;
    const base = h * (.52 + Math.sin(frame.time * .02) * .007);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let band = 0; band < 7; band++) {
      const y = base + band * h * .035;
      const drift = Math.sin(frame.time * .08 + band * .71) * w * .02;
      const gradient = ctx.createLinearGradient(0, y - 3, 0, y + 32);
      gradient.addColorStop(0, 'rgba(100,225,255,0)');
      gradient.addColorStop(.5, `rgba(90,160,200,${.012 / (band + 1)})`);
      gradient.addColorStop(1, 'rgba(100,225,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(drift, y - 3, w, 35);
    }
    ctx.restore();
  }

  drawRainOverlay(frame) {
    const ctx = this.context;
    const w = this.width;
    const h = this.height;
    ctx.save();
    ctx.strokeStyle = 'rgba(158,174,220,.06)';
    ctx.lineWidth = .6;
    ctx.beginPath();
    for (let i = 0; i < 55; i++) {
      const particle = this.particles[i];
      const y = (particle.y + frame.time * particle.speed * 2) % 1 * h;
      const x = particle.x * w;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 7, y + 27);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawLensGuides(frame) {
    const ctx = this.context;
    const x = this.width * .54;
    const y = this.height * .49;
    const radius = Math.min(this.width, this.height) * .17;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,140,120,.045)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 14]);
    ctx.beginPath();
    ctx.ellipse(x, y, radius * 1.35, radius * .62, frame.camera.yaw * .04, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  drawSignalMarkers(frame) {
    const ctx = this.context;
    const w = this.width;
    const h = this.height;
    const opacity = this.world === 'solar' ? .15 : .055;
    ctx.save();
    ctx.strokeStyle = this.connectionColor;
    ctx.globalAlpha = opacity;
    ctx.lineWidth = .8;
    const x = w * .52;
    const y = h * .48;
    const arm = Math.min(w, h) * .015;
    ctx.beginPath();
    ctx.moveTo(x - arm, y);
    ctx.lineTo(x - arm * .28, y);
    ctx.moveTo(x + arm * .28, y);
    ctx.lineTo(x + arm, y);
    ctx.moveTo(x, y - arm);
    ctx.lineTo(x, y - arm * .28);
    ctx.moveTo(x, y + arm * .28);
    ctx.lineTo(x, y + arm);
    ctx.stroke();
    ctx.restore();
  }

  setReducedMotion(reduced) {
    this.reduced = Boolean(reduced);
    if (this.reduced) this.context?.clearRect(0, 0, this.width, this.height);
  }

  dispose() {
    this.visible = false;
    this.particles.length = 0;
    this.context?.clearRect(0, 0, this.width, this.height);
    this.context = null;
  }
}
