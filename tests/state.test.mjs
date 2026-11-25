import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_STATE, STATE_VERSION, VALID_LANGUAGES, QUALITY_MODES,
  sanitizeState, stateFromUrl, buildStateUrl, ObservableState
} from '../js/state.js';
import { translate, validateTranslations, getLanguage } from '../js/i18n.js';

test('Default state begins with the canonical first world', () => {
  assert.equal(DEFAULT_STATE.world, 'galaxy');
  assert.equal(DEFAULT_STATE.language, 'pt');
  assert.equal(DEFAULT_STATE.quality, 'auto');
  assert.ok(STATE_VERSION >= 2);
});

test('Untrusted URL state cannot pick nonexistent worlds', () => {
  const state = sanitizeState({ world: 'https://evil.example', language: 'unknown', quality: 'danger' });
  assert.equal(state.world, 'galaxy');
  assert.equal(state.language, 'pt');
  assert.equal(state.quality, 'auto');
});

test('State sanitization uses bounded filter indices', () => {
  assert.equal(sanitizeState({ signatureFilter: '4' }).signatureFilter, '4');
  assert.equal(sanitizeState({ signatureFilter: '999' }).signatureFilter, 'all');
  assert.equal(sanitizeState({ stationFilter: '9' }).stationFilter, '9');
  assert.equal(sanitizeState({ stationFilter: '10' }).stationFilter, 'all');
  assert.equal(sanitizeState({ stationFilter: '-1' }).stationFilter, 'all');
});

test('State sanitization does not trust false-looking strings', () => {
  assert.equal(sanitizeState({ audio: 'true' }).audio, false);
  assert.equal(sanitizeState({ drawerOpen: 'true' }).drawerOpen, false);
  assert.equal(sanitizeState({ paused: true }).paused, true);
  assert.equal(sanitizeState({ detailsOpen: false }).detailsOpen, false);
});

test('Visited worlds are unique and limited to defined worlds', () => {
  const visited = sanitizeState({ visited: ['ocean', 'ocean', 'galaxy', 'nosuch'] }).visited;
  assert.deepEqual(visited, ['ocean', 'galaxy']);
});

test('Invalid timestamp is discarded', () => {
  assert.equal(sanitizeState({ lastVisit: Infinity }).lastVisit, 0);
  assert.equal(sanitizeState({ lastVisit: -20 }).lastVisit, 0);
});

test('URL parsing handles an absent or unexpected value', () => {
  assert.deepEqual(stateFromUrl('?world=unknown&lang=xx&quality=unlimited'), {});
  assert.deepEqual(stateFromUrl(''), {});
});

test('URL parsing retains valid user selections', () => {
  assert.deepEqual(stateFromUrl('?world=aurora&lang=ca&quality=eco'), {
    world: 'aurora',
    language: 'ca',
    quality: 'eco'
  });
});

test('URL builder updates selected fields and leaves arbitrary hash intact', () => {
  const url = buildStateUrl({ world: 'ocean', language: 'en', quality: 'high' }, {
    pathname: '/galaxias/omega/',
    search: '?extra=1',
    hash: '#cosmos'
  });
  assert.match(url, /world=ocean/);
  assert.match(url, /lang=en/);
  assert.match(url, /quality=high/);
  assert.match(url, /extra=1/);
  assert.ok(url.endsWith('#cosmos'));
});

test('Translation dictionary contains four complete locales', () => {
  assert.deepEqual(validateTranslations(), []);
  for (const language of VALID_LANGUAGES) {
    assert.ok(translate(language, 'galaxies'));
    assert.ok(translate(language, 'enter'));
    assert.ok(translate(language, 'original'));
  }
});

test('Unknown translation key returns visible key, never undefined', () => {
  assert.equal(translate('pt', 'missing-key'), 'missing-key');
});

test('Locale fallback uses Portuguese for unsupported browsers', () => {
  assert.equal(getLanguage('xx', 'zh-CN'), 'pt');
  assert.equal(getLanguage('invalid', 'es-ES'), 'es');
  assert.equal(getLanguage('ca', 'en-GB'), 'ca');
});

test('Quality modes have bounded known choices', () => {
  assert.deepEqual(QUALITY_MODES, ['auto', 'eco', 'high', 'ultra']);
  for (const quality of QUALITY_MODES) {
    assert.equal(sanitizeState({ quality }).quality, quality);
  }
});

test('ObservableState subscriptions see new state and previous state', () => {
  const store = new ObservableState();
  let notifications = 0;
  const unsubscribe = store.subscribe((next, prev) => {
    notifications++;
    assert.equal(next.world, 'storm');
    assert.notEqual(next.world, prev.world);
  });
  store.set({ world: 'storm' }, { persist: false });
  assert.equal(notifications, 1);
  unsubscribe();
  store.dispose();
});

test('Transactions notify only at the end of the batch', () => {
  const store = new ObservableState();
  let calls = 0;
  store.subscribe(() => { calls++; });
  store.transaction(s => {
    s.set({ world: 'ocean' }, { persist: false });
    s.set({ language: 'es' }, { persist: false });
    assert.equal(calls, 0);
  });
  assert.equal(calls, 1);
  store.dispose();
});

test('Visit tracking records every world only once', () => {
  const store = new ObservableState();
  store.visit('galaxy');
  store.visit('galaxy');
  store.visit('solar');
  assert.ok(store.get().visited.includes('galaxy'));
  assert.ok(store.get().visited.includes('solar'));
  assert.equal(store.get().visited.filter(id => id === 'galaxy').length, 1);
  store.dispose();
});

test('Disposed state cannot accept new writes', () => {
  const store = new ObservableState();
  store.dispose();
  assert.equal(store.set({ world: 'planets' }), false);
});
