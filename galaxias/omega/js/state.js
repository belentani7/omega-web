/**
 * URL-addressable, privacy-preserving local state store.
 * Never writes remote analytics or collects personal information.
 */
import { WORLDS, SIGNATURES, STATIONS } from './data.js';
import { safeJsonParse, clamp } from './math.js';

export const STATE_VERSION = 2;
export const STORAGE_KEY = 'belentani_omega_cosmos_v2';
export const VALID_LANGUAGES = Object.freeze(['pt', 'es', 'en', 'ca']);
export const QUALITY_MODES = Object.freeze(['auto', 'eco', 'high', 'ultra']);
export const CAMERA_MODES = Object.freeze(['cinematic', 'orbit', 'free']);

export const DEFAULT_STATE = Object.freeze({
  world: 'galaxy',
  language: 'pt',
  quality: 'auto',
  camera: 'cinematic',
  audio: false,
  muted: false,
  reducedMotion: false,
  paused: false,
  signatureFilter: 'all',
  stationFilter: 'all',
  drawerOpen: false,
  detailsOpen: true,
  visited: [],
  lastVisit: 0
});

export function sanitizeState(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const validWorlds = new Set(WORLDS.map(world => world.id));
  const world = validWorlds.has(source.world) ? source.world : DEFAULT_STATE.world;
  const language = VALID_LANGUAGES.includes(source.language) ? source.language : DEFAULT_STATE.language;
  const quality = QUALITY_MODES.includes(source.quality) ? source.quality : DEFAULT_STATE.quality;
  const camera = CAMERA_MODES.includes(source.camera) ? source.camera : DEFAULT_STATE.camera;
  const signatureFilter = source.signatureFilter === 'all'
    ? 'all'
    : Number.isInteger(Number(source.signatureFilter)) && Number(source.signatureFilter) >= 0 && Number(source.signatureFilter) < SIGNATURES.length
      ? String(source.signatureFilter) : 'all';
  const stationFilter = source.stationFilter === 'all'
    ? 'all'
    : Number.isInteger(Number(source.stationFilter)) && Number(source.stationFilter) >= 0 && Number(source.stationFilter) < STATIONS.length
      ? String(source.stationFilter) : 'all';
  const rawVisited = Array.isArray(source.visited) ? source.visited : [];
  const visited = [...new Set(rawVisited.filter(id => typeof id === 'string' && validWorlds.has(id)))];
  return {
    world,
    language,
    quality,
    camera,
    audio: source.audio === true,
    muted: source.muted === true,
    reducedMotion: source.reducedMotion === true,
    paused: source.paused === true,
    signatureFilter,
    stationFilter,
    drawerOpen: source.drawerOpen === true,
    detailsOpen: source.detailsOpen !== false,
    visited,
    lastVisit: Number.isFinite(source.lastVisit) ? clamp(source.lastVisit, 0, 9999999999999) : 0
  };
}

export function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = safeJsonParse(raw, null);
    return sanitizeState(parsed);
  } catch {
    return sanitizeState();
  }
}

export function persistState(state) {
  try {
    const snapshot = sanitizeState(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: STATE_VERSION,
      ...snapshot,
      audio: false,
      paused: false,
      lastVisit: Date.now()
    }));
    return true;
  } catch {
    return false;
  }
}

export function stateFromUrl(search = '') {
  const params = new URLSearchParams(search);
  const patch = {};
  const world = params.get('world');
  const language = params.get('lang');
  const quality = params.get('quality');
  if (world && WORLDS.some(entry => entry.id === world)) patch.world = world;
  if (VALID_LANGUAGES.includes(language)) patch.language = language;
  if (QUALITY_MODES.includes(quality)) patch.quality = quality;
  return patch;
}

export function buildStateUrl(state, locationObject = location) {
  const params = new URLSearchParams(locationObject.search);
  params.set('world', state.world);
  params.set('lang', state.language);
  if (state.quality === 'auto') params.delete('quality');
  else params.set('quality', state.quality);
  return locationObject.pathname + '?' + params.toString() + locationObject.hash;
}

export class ObservableState {
  constructor(initial = {}) {
    this.value = sanitizeState({ ...readState(), ...initial });
    this.listeners = new Set();
    this.dirty = false;
    this.batchDepth = 0;
    this.disposed = false;
  }

  get() {
    return { ...this.value, visited: [...this.value.visited] };
  }

  select(key) {
    return this.value[key];
  }

  set(patch, options = {}) {
    if (this.disposed) return false;
    const next = sanitizeState({ ...this.value, ...patch });
    const changed = Object.keys(next).some(key => JSON.stringify(next[key]) !== JSON.stringify(this.value[key]));
    if (!changed) return false;
    const previous = this.value;
    this.value = next;
    this.dirty = true;
    if (this.batchDepth === 0) this.notify(previous);
    if (options.persist !== false) persistState(next);
    return true;
  }

  transaction(fn) {
    const previous = this.value;
    this.batchDepth++;
    try {
      fn(this);
    } finally {
      this.batchDepth--;
      if (this.batchDepth === 0 && this.dirty) this.notify(previous);
    }
  }

  notify(previous) {
    this.dirty = false;
    for (const listener of [...this.listeners]) {
      try {
        listener(this.get(), { ...previous });
      } catch (error) {
        console.error('[OMEGA STATE] listener:', error);
      }
    }
  }

  subscribe(listener, immediate = false) {
    if (typeof listener !== 'function') throw new TypeError('A state listener must be a function.');
    this.listeners.add(listener);
    if (immediate) listener(this.get(), this.get());
    return () => this.listeners.delete(listener);
  }

  visit(worldId) {
    if (!WORLDS.some(world => world.id === worldId)) return false;
    const visited = [...this.value.visited];
    if (!visited.includes(worldId)) visited.push(worldId);
    this.set({ world: worldId, visited });
    return true;
  }

  reset(options = {}) {
    const preserveLanguage = options.preserveLanguage !== false;
    this.set({
      ...DEFAULT_STATE,
      language: preserveLanguage ? this.value.language : DEFAULT_STATE.language
    });
  }

  dispose() {
    this.listeners.clear();
    this.disposed = true;
  }
}
