/**
 * Prueba de integración REAL del host: monta `index.html` en jsdom, fuerza la
 * caída a Canvas 2D (jsdom no implementa WebGL) y arranca `js/app.js` como lo
 * haría el navegador. Verifica que la interfaz se construye sobre el marcado
 * publicado: ocho mundos, cincuenta portales, cinco firmas y controles vivos.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const hostHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

/** Contexto 2D mínimo: cualquier método devuelve un no-op y las propiedades se guardan. */
function createContext2D() {
  const gradient = { addColorStop() {} };
  return new Proxy({}, {
    get(target, property) {
      if (property in target) return target[property];
      if (property === 'createRadialGradient' || property === 'createLinearGradient') return () => gradient;
      if (property === 'measureText') return () => ({ width: 10 });
      if (property === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return () => {};
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    }
  });
}

let instance = 0;

async function bootHost() {
  const dom = new JSDOM(hostHtml, { url: 'http://localhost/index.html', pretendToBeVisual: false });
  const { window } = dom;
  const frames = [];

  window.matchMedia = query => ({
    matches: /prefers-reduced-motion/.test(query),
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent() { return false; }
  });
  window.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
  window.cancelAnimationFrame = () => {};
  // No se ejecuta el callback: el render no debe arrancar en una prueba de DOM.
  window.requestIdleCallback = () => 1;
  window.HTMLCanvasElement.prototype.getContext = function getContext(kind) {
    if (kind === 'webgl' || kind === 'experimental-webgl') return null;
    if (kind === '2d') {
      if (!this.__ctx) this.__ctx = createContext2D();
      return this.__ctx;
    }
    return null;
  };

  // `js/app.js` consulta estos globales al importarse.
  const previous = {};
  const shared = {
    window, document: window.document, navigator: window.navigator,
    location: window.location, history: window.history, localStorage: window.localStorage,
    HTMLElement: window.HTMLElement, HTMLCanvasElement: window.HTMLCanvasElement,
    getComputedStyle: window.getComputedStyle.bind(window),
    requestAnimationFrame: window.requestAnimationFrame,
    cancelAnimationFrame: window.cancelAnimationFrame,
    matchMedia: window.matchMedia
  };
  const assign = (key, value) => {
    try {
      globalThis[key] = value;
    } catch {
      // Algunos globales de Node (navigator) son solo de lectura.
      Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
    }
  };
  const restoreKey = (key, value) => {
    if (value === undefined) { delete globalThis[key]; return; }
    try { globalThis[key] = value; } catch { Object.defineProperty(globalThis, key, { value, configurable: true, writable: true }); }
  };
  for (const [key, value] of Object.entries(shared)) {
    previous[key] = globalThis[key];
    assign(key, value);
  }

  // Cada instancia necesita un módulo nuevo: `boot()` solo se ejecuta al importar.
  instance += 1;
  await import('../js/app.js?host-instance=' + instance);
  const cleanup = async () => {
    // El cierre del cargador está programado a 700 ms: se deja terminar antes de
    // cerrar la ventana para no cerrar con temporizadores vivos.
    await new Promise(resolve => setTimeout(resolve, 900));
    for (const [key, value] of Object.entries(previous)) restoreKey(key, value);
    window.close();
  };
  return { window, document: window.document, frames, cleanup, diagnostics: window.BELENTANI_COSMOS };
}

test('The published host boots the real application without a single runtime error', async t => {
  const errors = [];
  const originalError = console.error;
  console.error = (...args) => { errors.push(args.join(' ')); };
  let booted;
  try {
    booted = await bootHost();
  } finally {
    console.error = originalError;
  }
  t.after(() => booted.cleanup());
  const { document, window } = booted;

  assert.deepEqual(errors.filter(message => /OMEGA BOOT/.test(message)), [],
    'el arranque no debe lanzar excepciones');

  assert.equal(document.getElementById('world-list').children.length, 8, 'ocho mundos');
  assert.equal(document.getElementById('galaxy-list').children.length, 50, 'cincuenta portales');
  assert.equal(document.getElementById('signature-pips').children.length, 5, 'cinco firmas');
  assert.equal(document.getElementById('station-filter').options.length, 11, 'diez estaciones + "todas"');
  assert.equal(document.getElementById('signature-filter').options.length, 6, 'cinco firmas + "todas"');

  assert.equal(document.documentElement.lang, 'pt');
  assert.equal(document.body.dataset.world, 'galaxy');
  assert.ok(document.getElementById('hero-title').textContent.trim().length > 3, 'el héroe debe tener título');
  assert.ok(document.getElementById('hero-lead').textContent.trim().length > 10, 'el héroe debe tener texto');
  assert.match(document.getElementById('telemetry-quality').textContent, /\/ CANVAS$/,
    'sin WebGL debe informar del modo Canvas2D');
  assert.equal(document.getElementById('error-banner').hidden, false,
    'la caída a Canvas2D debe avisar mediante el banner accesible');
  assert.match(document.getElementById('error-message').textContent, /Canvas2D/);
  assert.equal(document.querySelectorAll('#world-list [aria-current="true"]').length, 1);

  const diagnostics = booted.diagnostics;
  assert.ok(diagnostics, 'window.BELENTANI_COSMOS debe existir para QA local');
  assert.equal(diagnostics.version, '2.0.0');
  assert.equal(diagnostics.galaxyCount, 50);
  assert.equal(diagnostics.getStatus().renderMode, 'canvas');
  assert.ok(window.document.getElementById('omega-announcer'));
});

test('Interacting with the published host changes world, language and camera', async t => {
  const booted = await bootHost();
  t.after(() => booted.cleanup());
  const { document } = booted;

  const worlds = [...document.querySelectorAll('#world-list .world-entry')];
  worlds[3].click();
  assert.equal(document.body.dataset.world, worlds[3].dataset.world);
  assert.equal(worlds[3].getAttribute('aria-current'), 'true');
  assert.equal(document.getElementById('telemetry-channel').textContent, '04 / 08');
  assert.match(booted.diagnostics.getStatus().world, /^[a-z]+$/);

  const language = document.getElementById('language');
  language.value = 'ca';
  language.dispatchEvent(new booted.window.Event('change', { bubbles: true }));
  assert.equal(document.documentElement.lang, 'ca');
  assert.match(booted.window.location.search, /lang=ca/);

  const quality = document.getElementById('quality-toggle');
  quality.value = 'eco';
  quality.dispatchEvent(new booted.window.Event('change', { bubbles: true }));
  assert.match(booted.window.location.search, /quality=eco/);
  assert.equal(booted.diagnostics.getStatus().quality.profile, 'eco');

  const explore = document.getElementById('explore-world');
  explore.click();
  assert.notEqual(booted.diagnostics.getStatus().camera.mode, 'cinematic');

  const drawer = document.getElementById('galaxy-drawer');
  document.getElementById('drawer-toggle').click();
  assert.ok(drawer.classList.contains('open'), 'el panel de galaxias debe abrirse');
  assert.equal(document.getElementById('drawer-toggle').getAttribute('aria-expanded'), 'true');
});
