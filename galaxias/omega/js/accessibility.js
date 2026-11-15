/** Keyboard and assistive-technology safeguards for a canvas-first experience. */
import { clamp } from './math.js';

export function prefersReducedMotion() {
  return typeof matchMedia === 'function'
    ? matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

export function prefersHighContrast() {
  return typeof matchMedia === 'function'
    ? matchMedia('(prefers-contrast: more)').matches
    : false;
}

export function announce(message, priority = 'polite') {
  let region = document.getElementById('omega-announcer');
  if (!region) {
    region = document.createElement('div');
    region.id = 'omega-announcer';
    region.className = 'visually-hidden';
    region.setAttribute('role', 'status');
    document.body.append(region);
  }
  region.setAttribute('aria-live', priority);
  region.textContent = '';
  requestAnimationFrame(() => { region.textContent = String(message); });
}

export function isFocusable(element) {
  if (!element || element.matches('[disabled],[hidden],[inert]')) return false;
  if (element.closest('[hidden],[inert]')) return false;
  if (element.getClientRects().length === 0) return false;
  return element.matches('a[href],button,select,textarea,input,[tabindex]:not([tabindex="-1"])');
}

export function getFocusable(container) {
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');
  return [...container.querySelectorAll(selectors)].filter(isFocusable);
}

export function trapFocus(container, event) {
  if (event.key !== 'Tab') return;
  const focusables = getFocusable(container);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function setAriaPressed(element, state) {
  if (element) element.setAttribute('aria-pressed', String(Boolean(state)));
}

export function setAriaExpanded(element, state) {
  if (element) element.setAttribute('aria-expanded', String(Boolean(state)));
}

export function applyMotionPreference(callback) {
  if (typeof matchMedia !== 'function') return () => {};
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const change = () => callback(Boolean(media.matches));
  change();
  media.addEventListener?.('change', change);
  return () => media.removeEventListener?.('change', change);
}

export function focusWithoutScroll(element) {
  if (!element || typeof element.focus !== 'function') return false;
  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
  return true;
}

export function readableDuration(seconds, language = 'pt') {
  const total = clamp(Math.round(seconds), 0, 86400);
  const minutes = Math.floor(total / 60);
  const remainder = String(total % 60).padStart(2, '0');
  const text = minutes + ':' + remainder;
  return language === 'en' ? text + ' minutes' : text;
}

export function textContrastRatio(foreground, background) {
  function luminance(hex) {
    const channels = hex.replace('#', '').match(/.{2}/g).map(c => Number.parseInt(c, 16) / 255);
    return channels.map(value => value <= .04045 ? value / 12.92 : Math.pow((value + .055) / 1.055, 2.4))
      .reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
  }
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

export function keyboardHelp(language = 'pt') {
  const translations = {
    pt: ['Setas: mudar o mundo', 'Arrastar: orbitar', 'Roda: zoom', 'WASD: voo livre', 'Escape: recentrar'],
    es: ['Flechas: cambiar de mundo', 'Arrastrar: orbitar', 'Rueda: zoom', 'WASD: vuelo libre', 'Escape: centrar'],
    en: ['Arrows: change world', 'Drag: orbit', 'Wheel: zoom', 'WASD: free flight', 'Escape: recenter'],
    ca: ['Fletxes: canviar de món', 'Arrossegar: orbitar', 'Roda: zoom', 'WASD: vol lliure', 'Escape: centrar']
  };
  return translations[language] ?? translations.pt;
}
