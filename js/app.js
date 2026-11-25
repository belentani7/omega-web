/**
 * Omega Cosmos entry point.
 * One local deployment; original galaxy routes remain independent and intact.
 */
import { WORLDS, GALAXIES, validateCosmosModel } from './data.js';
import { ObservableState, stateFromUrl } from './state.js';
import { CosmosRenderer } from './renderer.js';
import { CameraRig } from './camera.js';
import { AudioBus } from './audio.js';
import { QualityController } from './quality.js';
import { CosmosUI } from './ui.js';
import { SignalOverlay } from './overlay.js';
import { applyMotionPreference, announce } from './accessibility.js';
import { validateTranslations } from './i18n.js';
import { clamp } from './math.js';

class OmegaApp {
  constructor() {
    this.initialized = false;
    this.disposed = false;
    this.paused = false;
    this.frameHandle = 0;
    this.lastTime = 0;
    this.lastRendered = 0;
    this.time = 0;
    this.frameCount = 0;
    this.totalRendered = 0;
    this.lastPerformanceUpdate = 0;
    this.lastFrameDuration = 16;
    this.removeMotionListener = null;
    this.handlers = [];
    this.pendingWorld = null;
    this.rendererFallback = false;
    this.timers = [];
    this.reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.state = new ObservableState({
      ...stateFromUrl(location.search),
      reducedMotion: this.reduced
    });
    this.quality = new QualityController({
      mode: this.state.select('quality'),
      reduced: this.reduced,
      onChange: () => this.resize()
    });
    this.camera = null;
    this.audio = null;
    this.renderer = null;
    this.overlay = null;
    this.ui = null;
  }

  initialize() {
    if (this.initialized) return;
    const modelErrors = validateCosmosModel();
    const i18nErrors = validateTranslations();
    if (modelErrors.length || i18nErrors.length) {
      throw new Error([...modelErrors, ...i18nErrors].join('; '));
    }
    const canvas = document.getElementById('world-canvas');
    const overlayCanvas = document.getElementById('overlay-canvas');
    this.audio = new AudioBus({
      onError: message => this.ui?.showToast(message),
      onState: () => {}
    });
    this.camera = new CameraRig(canvas, {
      mode: this.state.select('camera'),
      reduced: this.reduced,
      onMode: mode => {
        this.state.set({ camera: mode });
        this.ui?.renderCamera();
      }
    });
    this.renderer = new CosmosRenderer(canvas, {
      onMode: mode => {
        if (mode !== 'webgl') {
          this.rendererFallback = true;
          this.ui?.showError('WebGL unavailable. Canvas2D is active.');
        }
      },
      onError: error => {
        this.ui?.showError(error);
      }
    });
    this.overlay = new SignalOverlay(overlayCanvas, { reduced: this.reduced });
    if (this.renderer.mode !== 'webgl' || this.rendererFallback === true) {
      // El renderer informa antes de que exista la interfaz: se repite aquí para
      // que la degradación a Canvas2D quede visible y anunciada, no silenciosa.
      this.rendererFallback = true;
    }
    this.ui = new CosmosUI({
      state: this.state,
      camera: this.camera,
      quality: this.quality,
      audio: this.audio,
      renderer: this.renderer,
      onWorldChange: worldId => this.changeWorld(worldId),
      onError: error => console.error('[OMEGA UI]', error)
    });
    this.initialized = true;
    if (this.rendererFallback) {
      this.ui.showError('WebGL unavailable. Canvas2D is active.');
    }
    this.subscribe();
    this.resize();
    this.changeWorld(this.state.select('world'), { initial: true });
    this.frameHandle = requestAnimationFrame(now => this.update(now));
    this.timers.push(setTimeout(() => this.ui.hideLoader(), 700));
    this.timers.push(setTimeout(() => this.verifyShaders(), 3500));
    this.registerDiagnostics();
    this.applyUrl();
  }

  subscribe() {
    this.listen(window, 'resize', () => this.resize(), { passive: true });
    this.listen(document, 'visibilitychange', () => {
      this.quality.setVisible(!document.hidden);
      if (document.hidden) {
        this.audio.suspend();
      } else {
        this.audio.resume();
        this.lastTime = performance.now();
      }
    });
    this.listen(window, 'pagehide', () => {
      this.audio.suspend();
    });
    this.listen(window, 'pageshow', () => {
      this.audio.resume();
    });
    this.listen(window, 'orientationchange', () => {
      this.timers.push(setTimeout(() => this.resize(), 120));
    });
    this.listen(window, 'error', event => {
      if (event.filename?.includes('/omega/')) {
        console.error('[OMEGA] Unexpected runtime error:', event.error);
      }
    });
    this.listen(window, 'unhandledrejection', event => {
      console.warn('[OMEGA] Rejected async action:', event.reason);
    });
    this.removeMotionListener = applyMotionPreference(reduced => {
      this.reduced = reduced;
      this.quality.setReducedMotion(reduced);
      this.overlay.setReducedMotion(reduced);
      this.camera.reduced = reduced;
      this.camera.autoRotate = !reduced && this.camera.mode === 'cinematic';
      this.state.set({ reducedMotion: reduced });
    });
    this.state.subscribe((next, previous) => {
      if (next.quality !== previous.quality) {
        this.quality.setMode(next.quality);
        this.resize();
      }
      if (next.paused !== previous.paused) {
        this.paused = next.paused;
        if (!this.paused) this.lastTime = performance.now();
      }
      if (next.language !== previous.language) {
        this.audio.setWorld(next.world);
      }
    });
  }

  listen(target, event, listener, options) {
    target.addEventListener(event, listener, options);
    this.handlers.push(() => target.removeEventListener(event, listener, options));
  }

  changeWorld(worldId, options = {}) {
    const index = WORLDS.findIndex(world => world.id === worldId);
    if (index < 0) return;
    this.pendingWorld = null;
    this.renderer.setWorld(worldId);
    this.overlay.setWorld(worldId);
    this.camera.snapToWorld(index);
    this.audio.setWorld(worldId);
    document.body.dataset.world = worldId;
    if (!options.initial) {
      announce(WORLDS[index].title[this.state.select('language')]);
    }
    this.time = 0;
  }

  resize() {
    if (!this.renderer || !this.overlay) return;
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    const settings = this.quality.getSettings();
    this.renderer.resize(width, height, settings.dpr);
    this.overlay.resize(width, height, Math.min(1.5, settings.dpr));
  }

  update(now) {
    if (this.disposed) return;
    this.frameHandle = requestAnimationFrame(next => this.update(next));
    if (!this.initialized || document.hidden) return;
    // Account for frames intentionally skipped by ECO / adaptive FPS.
    // Updating lastTime before the render budget causes slow-motion at 30 FPS.
    if (!this.quality.shouldRender(this.lastRendered, now)) return;
    const elapsedMs = this.lastTime ? Math.min(100, Math.max(0, now - this.lastTime)) : 16;
    this.lastTime = now;
    this.lastRendered = now;
    const delta = clamp(elapsedMs / 1000, 0, .05);
    if (!this.paused) this.time += delta;
    this.camera.update(this.paused ? 0 : delta, this.time);
    const settings = this.quality.getSettings();
    const audioLevel = this.audio.sampleLevel(delta);
    const frame = {
      now,
      delta,
      time: this.time,
      camera: this.camera.getSnapshot(),
      pointer: this.camera.pointer,
      quality: settings.shader,
      reduced: this.reduced || this.paused,
      audio: audioLevel
    };
    if (!this.paused || this.totalRendered === 0) {
      this.renderer.draw(frame);
      if (settings.profile !== 'eco') {
        this.overlay.draw(frame);
      } else if (this.overlay.context) {
        // Remove decorations left by the previous high-quality frame.
        this.overlay.context.clearRect(0, 0, this.overlay.width, this.overlay.height);
      }
      this.totalRendered++;
    }
    this.quality.reportFrame(elapsedMs, now);
    this.frameCount++;
    if (now - this.lastPerformanceUpdate > 1800) {
      this.lastPerformanceUpdate = now;
      this.ui.renderPerformance(settings.fps, this.renderer.mode);
    }
  }

  verifyShaders() {
    if (this.disposed || !this.renderer) return;
    // Compile one at a time during idle periods on clients with spare capacity.
    // A failed world keeps the primary navigation usable and is not misreported.
    const ids = [...Object.keys(this.renderer.worldColors)];
    const failures = [];
    const compileNext = () => {
      if (this.disposed || !ids.length) {
        if (failures.length) this.ui.showError(failures.join('; ').slice(0, 280));
        return;
      }
      const id = ids.shift();
      if (!this.renderer.gl) return;
      try {
        if (!this.renderer.programs.has(id)) {
          const program = this.renderer.createProgram(id);
          this.renderer.programs.set(id, program);
        }
      } catch (error) {
        failures.push(id + ': ' + String(error.message).slice(0, 45));
      }
      const callback = () => compileNext();
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(callback, { timeout: 250 });
      } else {
        this.timers.push(setTimeout(callback, 150));
      }
    };
    compileNext();
  }

  applyUrl() {
    const language = this.state.select('language');
    const world = this.state.select('world');
    const url = new URL(location.href);
    if (!url.searchParams.has('lang')) url.searchParams.set('lang', language);
    if (!url.searchParams.has('world')) url.searchParams.set('world', world);
    history.replaceState({ world }, '', url.pathname + url.search + url.hash);
  }

  registerDiagnostics() {
    // A compact read-only API for local browser QA; no sensitive data or writes.
    Object.defineProperty(window, 'BELENTANI_COSMOS', {
      configurable: true,
      value: Object.freeze({
        version: '2.0.0',
        worlds: WORLDS.map(world => world.id),
        galaxyCount: GALAXIES.length,
        getStatus: () => ({
          world: this.state.select('world'),
          language: this.state.select('language'),
          renderMode: this.renderer.mode,
          quality: this.quality.getSettings(),
          camera: this.camera.getSnapshot(),
          audio: this.audio.getStatus(),
          framesRendered: this.totalRendered
        })
      })
    });
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frameHandle);
    for (const timer of this.timers) clearTimeout(timer);
    for (const remove of this.handlers) remove();
    this.removeMotionListener?.();
    this.ui?.dispose();
    this.audio?.dispose();
    this.camera?.dispose();
    this.overlay?.dispose();
    this.renderer?.dispose();
    this.state?.dispose();
    delete window.BELENTANI_COSMOS;
  }
}

function boot() {
  const app = new OmegaApp();
  try {
    app.initialize();
  } catch (error) {
    console.error('[OMEGA BOOT]', error);
    const loader = document.getElementById('loading');
    if (loader) loader.hidden = true;
    const banner = document.getElementById('error-banner');
    const message = document.getElementById('error-message');
    if (message) message.textContent = String(error.message || error).slice(0, 250);
    if (banner) banner.hidden = false;
  }
  return app;
}

export { OmegaApp };

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
