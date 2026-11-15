/** Semantic DOM interface. Every control invokes an actual action. */
import { WORLDS, GALAXIES, SIGNATURES, STATIONS, filterGalaxies, galaxyHref, galaxyTitle, adjacentWorld } from './data.js';
import { translate as t } from './i18n.js';

const $ = id => document.getElementById(id);

// Share original galaxy reading history (omega_story) with the immersive entry.
function readGalaxyVisits() {
  try {
    const list = JSON.parse(localStorage.getItem('omega_story') || '[]');
    return new Set((Array.isArray(list) ? list : [])
      .map(value => String(value))
      .filter(value => /^\d{1,2}$/.test(value))
      .map(value => value.padStart(2, '0'))
      .filter(value => Number(value) >= 1 && Number(value) <= 50));
  } catch { return new Set(); }
}

function markGalaxyVisit(number) {
  const id = String(number).padStart(2, '0');
  const next = readGalaxyVisits();
  next.add(id);
  try { localStorage.setItem('omega_story', JSON.stringify([...next].slice(-50))); }
  catch { /* History is optional when browser storage is restricted. */ }
}


function element(tag, className, text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export class CosmosUI {
  constructor({ state, camera, quality, audio, renderer, onWorldChange, onError }) {
    this.state = state;
    this.camera = camera;
    this.quality = quality;
    this.audio = audio;
    this.renderer = renderer;
    this.onWorldChange = onWorldChange;
    this.onError = onError ?? console.error;
    this.elements = {};
    this.worldButtons = new Map();
    this.galaxyLinks = [];
    this.listeners = [];
    this.unsubscribe = null;
    this.toastTimeout = null;
    this.errorShown = false;
    this.visibleGalaxies = 50;
    this.cinema = false;
    this.mobileWorlds = false;
    this.createView();
    this.bindEvents();
    this.unsubscribe = this.state.subscribe((next, previous) => this.render(next, previous), true);
  }

  cache() {
    const ids = [
      'world-list','world-heading','world-counter','world-introduction','world-coordinate','world-nav-toggle','cinema-toggle',
      'hero-chapter','hero-title','hero-lead','hero-type','next-world','explore-world',
      'telemetry-mode','telemetry-quality','telemetry-channel','telemetry-link',
      'details-eyebrow','details-title','details-copy','details-facts',
      'drawer-kicker','galaxy-drawer-title','drawer-lead','galaxy-list',
      'signature-filter','station-filter','galaxy-count','signature-pips',
      'signature-caption','signature-description','signature-filter-label',
      'station-filter-label','language','world-previous','world-next',
      'quick-location','drawer-toggle','drawer-content','galaxy-drawer',
      'details-close','details-expand','world-details','audio-toggle','motion-toggle',
      'fullscreen-toggle','quality-toggle','classic-link','input-hint',
      'connection-status','loading','loading-caption','fps-reading','toast',
      'error-banner','error-message','error-dismiss'
    ];
    for (const id of ids) {
      const node = $(id);
      if (node) this.elements[id] = node;
    }
  }

  createView() {
    this.cache();
    this.buildWorldNavigation();
    this.buildGalaxyNavigation();
    this.buildSignatureNavigation();
    this.buildFilters();
  }

  listen(target, event, callback, options) {
    target?.addEventListener(event, callback, options);
    if (target) this.listeners.push(() => target.removeEventListener(event, callback, options));
  }

  buildWorldNavigation() {
    const list = $('world-list');
    const fragment = document.createDocumentFragment();
    for (const world of WORLDS) {
      const item = element('li', 'world-item');
      const button = element('button', 'world-entry');
      button.type = 'button';
      button.dataset.world = world.id;
      button.setAttribute('aria-label', world.title.pt);
      const number = element('span', 'entry-n', world.number);
      const description = element('span', 'entry-text');
      const heading = element('strong', 'entry-title', world.title.pt);
      const caption = element('small', 'entry-caption', world.kind);
      const glyph = element('span', 'entry-glyph', world.glyph);
      glyph.setAttribute('aria-hidden', 'true');
      description.append(heading, caption);
      button.append(number, description, glyph);
      item.append(button);
      fragment.append(item);
      this.worldButtons.set(world.id, button);
      this.listen(button, 'click', () => this.setWorld(world.id));
    }
    list.append(fragment);
  }

  buildGalaxyNavigation() {
    const fragment = document.createDocumentFragment();
    for (const galaxy of GALAXIES) {
      const link = element('a', 'galaxy-link');
      link.style.setProperty('--node-color', galaxy.color);
      link.dataset.signature = String(galaxy.signature);
      link.dataset.station = String(galaxy.station);
      link.dataset.number = String(galaxy.number);
      const number = element('b', 'galaxy-number', String(galaxy.number).padStart(2, '0'));
      const meta = element('span', 'galaxy-meta');
      const heading = element('strong', 'galaxy-title', galaxyTitle(galaxy, 'pt'));
      const subheading = element('small', 'galaxy-signature', SIGNATURES[galaxy.signature].code);
      const arrow = element('i', '', '↗');
      arrow.setAttribute('aria-hidden', 'true');
      meta.append(heading, subheading);
      link.append(number, meta, arrow);
      this.listen(link, 'click', () => {
        markGalaxyVisit(galaxy.number);
        this.renderGalaxies(this.state.get(), this.state.select('language'));
      });
      fragment.append(link);
      this.galaxyLinks.push({ galaxy, link, heading, subheading });
    }
    $('galaxy-list').append(fragment);
  }

  buildSignatureNavigation() {
    const fragment = document.createDocumentFragment();
    SIGNATURES.forEach((signature, index) => {
      const button = element('button', 'signature-pip');
      button.type = 'button';
      button.title = signature.code + ' / ' + signature.title;
      button.setAttribute('aria-label', signature.code + ', ' + signature.title);
      button.setAttribute('aria-pressed', 'false');
      button.style.setProperty('--pip-color', signature.color);
      button.dataset.signature = String(index);
      this.listen(button, 'click', () => {
        const current = this.state.select('signatureFilter');
        this.state.set({
          signatureFilter: current === String(index) ? 'all' : String(index),
          drawerOpen: true
        });
      });
      fragment.append(button);
    });
    $('signature-pips').append(fragment);
  }

  buildFilters() {
    const signatureSelect = $('signature-filter');
    const stationSelect = $('station-filter');
    SIGNATURES.forEach((signature, index) => {
      const option = element('option', '', signature.name);
      option.value = String(index);
      signatureSelect.append(option);
    });
    STATIONS.forEach((station, index) => {
      const option = element('option', '', station.title.pt);
      option.value = String(index);
      stationSelect.append(option);
    });
  }

  bindEvents() {
    this.listen($('world-previous'), 'click', () => this.navigate(-1));
    this.listen($('world-next'), 'click', () => this.navigate(1));
    this.listen($('next-world'), 'click', () => this.navigate(1));
    this.listen($('explore-world'), 'click', () => this.toggleCamera());
    this.listen($('language'), 'change', event => this.changeLanguage(event.target.value));
    this.listen($('signature-filter'), 'change', event => {
      this.state.set({ signatureFilter: event.target.value });
    });
    this.listen($('station-filter'), 'change', event => {
      this.state.set({ stationFilter: event.target.value });
    });
    this.listen($('drawer-toggle'), 'click', () => this.toggleDrawer());
    this.listen($('details-close'), 'click', () => this.toggleDetails());
    this.listen($('details-expand'), 'click', () => this.toggleDetails());
    this.listen($('cinema-toggle'), 'click', () => this.toggleCinema());
    this.listen($('world-nav-toggle'), 'click', () => this.toggleMobileWorlds());
    this.listen($('motion-toggle'), 'click', () => this.toggleMotion());
    this.listen($('audio-toggle'), 'click', () => this.toggleAudio());
    this.listen($('fullscreen-toggle'), 'click', () => this.toggleFullscreen());
    this.listen($('error-dismiss'), 'click', () => { $('error-banner').hidden = true; });
    this.listen(document, 'keydown', event => this.keyboardEvent(event));
    this.listen(document, 'fullscreenchange', () => this.renderFullscreen());
    this.listen(window, 'popstate', () => {
      const params = new URLSearchParams(location.search);
      const id = params.get('world');
      const language = params.get('lang');
      if (WORLDS.some(world => world.id === id)) this.setWorld(id, { url: false });
      if (['pt','es','en','ca'].includes(language)) this.changeLanguage(language, false);
    });
  }

  setWorld(id, options = {}) {
    if (!WORLDS.some(world => world.id === id)) return false;
    this.state.visit(id);
    if (this.mobileWorlds && typeof window !== 'undefined' && window.innerWidth <= 720) this.toggleMobileWorlds(false);
    this.onWorldChange(id);
    if (options.url !== false) this.writeUrl();
    return true;
  }

  navigate(direction) {
    const target = adjacentWorld(this.state.select('world'), direction);
    this.setWorld(target.id);
    return target;
  }

  toggleCamera() {
    const current = this.camera.mode;
    const mode = current === 'free' ? 'cinematic' : 'free';
    this.camera.setMode(mode);
    this.state.set({ camera: mode });
    this.renderCamera();
  }

  changeLanguage(language, updateUrl = true) {
    if (!['pt', 'es', 'en', 'ca'].includes(language)) return;
    this.state.set({ language });
    if (updateUrl) this.writeUrl();
  }

  toggleCinema(force) {
    this.cinema = typeof force === 'boolean' ? force : !this.cinema;
    document.body.classList.toggle('cinema-mode', this.cinema);
    const button = $('cinema-toggle');
    button?.setAttribute('aria-pressed', String(this.cinema));
    const label = t(this.state.select('language'), this.cinema ? 'cinemaOff' : 'cinemaOn');
    button?.setAttribute('aria-label', label);
    if (button) button.title = label + ' · C';
    if (this.cinema && document.activeElement && !document.activeElement.closest('.topbar, .quick-nav')) {
      button?.focus({ preventScroll: true });
    }
    return this.cinema;
  }

  toggleMobileWorlds(force) {
    this.mobileWorlds = typeof force === 'boolean' ? force : !this.mobileWorlds;
    document.querySelector('.world-nav')?.classList.toggle('expanded-mobile', this.mobileWorlds);
    const button = $('world-nav-toggle');
    button?.setAttribute('aria-expanded', String(this.mobileWorlds));
    const label = t(this.state.select('language'), this.mobileWorlds ? 'worldsHide' : 'worldsShow');
    button?.setAttribute('aria-label', label);
    if (button) button.title = label;
    return this.mobileWorlds;
  }

  toggleDrawer() {
    this.state.set({ drawerOpen: !this.state.select('drawerOpen') });
  }

  toggleDetails() {
    this.state.set({ detailsOpen: !this.state.select('detailsOpen') });
  }

  toggleMotion() {
    this.state.set({ paused: !this.state.select('paused') });
  }

  async toggleAudio() {
    const enabled = await this.audio.toggle();
    this.state.set({ audio: enabled });
  }

  async toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (error) {
      this.showToast(error.message || String(error));
    }
  }

  renderFullscreen() {
    const button = $('fullscreen-toggle');
    const active = Boolean(document.fullscreenElement);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', t(this.state.select('language'), active ? 'exitFullscreen' : 'fullscreen'));
  }

  keyboardEvent(event) {
    const element = document.activeElement;
    if (element?.matches('input,textarea,select,[contenteditable="true"]')) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this.navigate(-1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.navigate(1);
        break;
      case 'c':
      case 'C':
        event.preventDefault();
        this.toggleCinema();
        break;
      case 'Escape':
        if (this.state.select('drawerOpen')) this.toggleDrawer();
        else this.camera.reset({ mode: 'cinematic' });
        break;
      case 'Enter':
        if (element === document.body && this.state.select('drawerOpen')) {
          $('galaxy-list').querySelector('a:not([hidden])')?.focus();
        }
        break;
      default:
        break;
    }
  }

  writeUrl() {
    const state = this.state.get();
    const url = new URL(location.href);
    url.searchParams.set('world', state.world);
    url.searchParams.set('lang', state.language);
    if (state.quality !== 'auto') url.searchParams.set('quality', state.quality);
    else url.searchParams.delete('quality');
    history.replaceState({ world: state.world }, '', url.pathname + url.search + url.hash);
  }

  render(state, previous = state) {
    document.documentElement.lang = state.language;
    document.body.dataset.world = state.world;
    document.body.dataset.quality = state.quality;
    const lang = state.language;
    const world = WORLDS.find(item => item.id === state.world) ?? WORLDS[0];
    const index = WORLDS.indexOf(world);
    this.renderNavigation(world, index, lang);
    this.renderHero(world, index, lang);
    this.renderDetails(world, index, lang, state.detailsOpen);
    this.renderDrawer(state, lang);
    this.renderGalaxies(state, lang);
    this.renderActions(state, lang);
    if (state.world !== previous.world) {
      this.worldButtons.get(world.id)?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }

  renderNavigation(world, index, language) {
    $('world-introduction').textContent = t(language, 'intro');
    $('world-counter').textContent = String(index + 1).padStart(2, '0') + ' / 08';
    $('world-coordinate').textContent = 'JUDAS / ' + world.number + ' / 08';
    $('signature-caption').textContent = t(language, 'signatures');
    $('signature-description').textContent = t(language, 'motto');
    $('world-previous').setAttribute('aria-label', t(language, 'previous'));
    $('world-next').setAttribute('aria-label', t(language, 'next'));
    $('quick-location').textContent = String(index + 1).padStart(2, '0') + ' / 08';
    for (const entry of WORLDS) {
      const button = this.worldButtons.get(entry.id);
      button.setAttribute('aria-current', entry.id === world.id ? 'true' : 'false');
      button.setAttribute('aria-label', entry.title[language]);
      button.querySelector('.entry-title').textContent = entry.title[language];
    }
  }

  renderHero(world, index, language) {
    $('hero-chapter').textContent = t(language, 'world').toUpperCase() + ' ' + world.number + ' / 08';
    $('hero-type').textContent = world.kind;
    const title = $('hero-title');
    title.replaceChildren(document.createTextNode(world.hero[0] + ' '), element('span', '', world.hero[1]));
    $('hero-lead').textContent = world.essence[language];
    $('telemetry-channel').textContent = world.number + ' / 08';
    $('next-world').firstChild.textContent = t(language, 'enter') + ' ';
    this.renderCamera();
  }

  renderCamera() {
    const lang = this.state.select('language');
    const free = this.camera.mode === 'free';
    $('explore-world').firstChild.textContent = t(lang, free ? 'cinematic' : 'explore') + ' ';
    $('telemetry-mode').textContent = this.camera.mode.toUpperCase() + ' FLIGHT';
  }

  renderDetails(world, index, language, open) {
    $('details-eyebrow').textContent = 'TRANSMISSION / ' + world.number;
    $('details-title').textContent = world.title[language];
    $('details-copy').textContent = world.essence[language];
    const dl = document.createElement('dl');
    dl.className = 'details-facts';
    for (const [label, value] of world.facts) {
      const item = element('div', 'fact');
      item.append(element('dt', '', label), element('dd', '', value));
      dl.append(item);
    }
    $('details-facts').replaceWith(dl);
    dl.id = 'details-facts';
    const panel = $('world-details');
    panel.classList.toggle('collapsed', !open);
    $('details-expand').setAttribute('aria-expanded', String(open));
    $('details-expand').textContent = t(language, open ? 'collapse' : 'expand');
    $('details-close').textContent = open ? '−' : '+';
    $('details-close').setAttribute('aria-label', t(language, open ? 'collapse' : 'expand'));
  }

  renderDrawer(state, language) {
    $('drawer-kicker').textContent = t(language, 'original');
    $('galaxy-drawer-title').firstChild.textContent = t(language, 'galaxies') + ' ';
    $('drawer-lead').textContent = t(language, 'galleryIntro');
    $('signature-filter-label').textContent = t(language, 'signature');
    $('station-filter-label').textContent = t(language, 'station');
    $('signature-filter').firstElementChild.textContent = t(language, 'all');
    $('station-filter').firstElementChild.textContent = t(language, 'all');
    $('signature-filter').value = state.signatureFilter;
    $('station-filter').value = state.stationFilter;
    STATIONS.forEach((entry, i) => {
      $('station-filter').options[i + 1].textContent = entry.title[language];
    });
    const drawer = $('galaxy-drawer');
    drawer.classList.toggle('open', state.drawerOpen);
    $('drawer-toggle').setAttribute('aria-expanded', String(state.drawerOpen));
    $('drawer-toggle').setAttribute('aria-label', t(language, state.drawerOpen ? 'collapse' : 'expand'));
  }

  renderGalaxies(state, language) {
    const visible = new Set(filterGalaxies(state.signatureFilter, state.stationFilter).map(x => x.number));
    const visited = readGalaxyVisits();
    for (const entry of this.galaxyLinks) {
      entry.link.hidden = !visible.has(entry.galaxy.number);
      entry.link.href = galaxyHref(entry.galaxy, language);
      entry.link.classList.toggle('is-visited', visited.has(String(entry.galaxy.number).padStart(2, '0')));
      entry.heading.textContent = galaxyTitle(entry.galaxy, language);
      entry.link.setAttribute('aria-label', String(entry.galaxy.number).padStart(2, '0') + ' ' + entry.heading.textContent + ', ' + entry.subheading.textContent);
    }
    this.visibleGalaxies = visible.size;
    $('galaxy-count').textContent = visible.size + ' / 50 ' + t(language, 'portals') + ' · ' + visited.size + '/50 ✓';
    for (const pip of $('signature-pips').children) {
      pip.setAttribute('aria-pressed', String(pip.dataset.signature === state.signatureFilter));
    }
  }

  renderActions(state, language) {
    $('language').value = language;
    $('classic-link').firstChild.textContent = t(language, 'classic') + ' ';
    $('input-hint').textContent = t(language, 'inputHint');
    $('connection-status').textContent = t(language, 'ready');
    $('loading-caption').textContent = t(language, 'loading');
    $('motion-toggle').setAttribute('aria-pressed', String(state.paused));
    $('motion-toggle').setAttribute('aria-label', t(language, state.paused ? 'play' : 'pause'));
    $('motion-toggle').firstElementChild.textContent = state.paused ? '▶' : 'Ⅱ';
    $('cinema-toggle').setAttribute('aria-pressed', String(this.cinema));
    $('cinema-toggle').setAttribute('aria-label', t(language, this.cinema ? 'cinemaOff' : 'cinemaOn'));
    $('cinema-toggle').title = t(language, this.cinema ? 'cinemaOff' : 'cinemaOn') + ' · C';
    $('world-nav-toggle').setAttribute('aria-expanded', String(this.mobileWorlds));
    $('world-nav-toggle').setAttribute('aria-label', t(language, this.mobileWorlds ? 'worldsHide' : 'worldsShow'));
    $('audio-toggle').setAttribute('aria-pressed', String(state.audio));
    $('audio-toggle').setAttribute('aria-label', t(language, state.audio ? 'soundOff' : 'soundOn'));
    $('audio-toggle').firstElementChild.textContent = state.audio ? '♫' : '♪';
    $('telemetry-quality').textContent = this.quality.profile.toUpperCase() + ' / ' + this.renderer.mode.toUpperCase();
    this.renderFullscreen();
  }

  renderPerformance(fps, mode) {
    $('fps-reading').textContent = Math.round(fps) + ' FPS';
    $('telemetry-quality').textContent = this.quality.profile.toUpperCase() + ' / ' + mode.toUpperCase();
  }

  showToast(message, durationMs = 2500) {
    if (!message) return;
    const toast = $('toast');
    toast.textContent = String(message);
    toast.classList.add('visible');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => toast.classList.remove('visible'), durationMs);
  }

  showError(message) {
    if (!message) return;
    const banner = $('error-banner');
    $('error-message').textContent = String(message).slice(0, 280);
    banner.hidden = false;
    this.errorShown = true;
  }

  hideLoader() {
    const loading = $('loading');
    loading.classList.add('closed');
    setTimeout(() => loading.remove(), 1100);
  }

  dispose() {
    if (this.unsubscribe) this.unsubscribe();
    for (const remove of this.listeners) remove();
    clearTimeout(this.toastTimeout);
    this.listeners.length = 0;
  }
}
