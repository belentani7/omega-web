import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const runtime = readFileSync(new URL('../galaxias/core/galaxia.js', import.meta.url), 'utf8');

function createChapter(language) {
  const store = new Map();
  const links = ['galaxia-02.html', 'index.html'].map(href => ({
    href,
    getAttribute(name) { return name === 'href' ? this.href : null; },
    setAttribute(name, value) { if (name === 'href') this.href = value; }
  }));
  const label = {
    textContent: 'SIGUIENTE',
    getAttribute(name) { return name === 'data-i18n' ? 'next' : null; }
  };
  const mirror = { textContent: 'ORIGINAL' };
  const nav = {
    omega: null,
    querySelector() { return null; },
    insertBefore(node) { this.omega = node; }
  };
  const document = {
    body: { style: { setProperty() {} }, classList: { add() {}, remove() {} } },
    documentElement: {
      lang: 'es',
      style: { setProperty() {} },
      attrs: {},
      setAttribute(name, value) { this.attrs[name] = value; },
      getAttribute(name) { return this.attrs[name] ?? null; }
    },
    getElementById(id) { return id === 'espejo' ? mirror : null; },
    querySelector(selector) { return selector === '.hbar .waveC' ? nav : null; },
    querySelectorAll(selector) {
      if (selector === '[data-i18n]') return [label];
      if (selector === 'a[href]') return links;
      return [];
    },
    createElement(tag) {
      return {
        tagName: tag,
        href: '', textContent: '',
        setAttribute(name, value) { this[name] = value; }
      };
    }
  };
  const location = { search: '?lang=' + language, href: '' };
  const window = { matchMedia: () => ({ matches: true }) };
  const listeners = new Map();
  runInNewContext(runtime, {
    window, document, location,
    navigator: { language: 'es-ES' }, URLSearchParams,
    localStorage: {
      getItem(key) { return store.get(key) ?? null; },
      setItem(key, value) { store.set(key, value); }
    },
    addEventListener(name, listener) { listeners.set(name, listener); }
  });
  const cfg = {
    id: '04', estacion: 3, beat: 2.2,
    prev: 'galaxia-03.html', next: 'galaxia-05.html',
    espejo: { pt: 'O CANTO', es: 'EL CANTO', en: 'THE SONG', ca: 'EL CANT' },
    ui: {
      pt: { next: 'SEGUINTE' },
      es: { next: 'SIGUIENTE' },
      en: { next: 'NEXT' },
      ca: { next: 'SEGÜENT' }
    }
  };
  window.mountGalaxia(cfg);
  return { window, document, mirror, links, nav, label, location, listeners, store, cfg };
}

for (const language of ['pt', 'es', 'en', 'ca']) {
  test('Classic original chapter respects ' + language.toUpperCase() + ' and returns to Omega', () => {
    const result = createChapter(language);
    assert.equal(result.document.documentElement.lang, language);
    assert.equal(result.window.GALAXIA.lang, language);
    assert.equal(result.mirror.textContent, result.cfg.espejo[language]);
    assert.equal(result.label.textContent, result.cfg.ui[language].next);
    assert.equal(result.links[0].href, 'galaxia-02.html?lang=' + language);
    assert.equal(result.links[1].href, 'index.html?lang=' + language);
    assert.equal(result.nav.omega.href, 'omega/index.html?lang=' + language);
    assert.deepEqual(JSON.parse(result.store.get('omega_story')), ['04']);
  });
}

test('Original keyboard paths retain language and provide direct OMEGA access', () => {
  const result = createChapter('ca');
  const keydown = result.listeners.get('keydown');
  assert.equal(typeof keydown, 'function');
  keydown({ key: 'ArrowRight', target: { tagName: 'DIV' } });
  assert.equal(result.location.href, 'galaxia-05.html?lang=ca');
  keydown({ key: 'o', target: { tagName: 'DIV' } });
  assert.equal(result.location.href, 'omega/index.html?lang=ca');
  keydown({ key: 'Escape', target: { tagName: 'DIV' } });
  assert.equal(result.location.href, 'index.html?lang=ca');
});
