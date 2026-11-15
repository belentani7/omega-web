/**
 * Numerically stable helpers shared by camera, sky overlays, physics and tests.
 * There are no browser dependencies in this module.
 */
export const PI = Math.PI;
export const TAU = Math.PI * 2;
export const HALF_PI = Math.PI / 2;
export const RAD = Math.PI / 180;
export const DEG = 180 / Math.PI;
export const EPS = 1e-8;

export function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export function saturate(value) {
  return clamp(value, 0, 1);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function invLerp(a, b, value) {
  return Math.abs(b - a) < EPS ? 0 : (value - a) / (b - a);
}

export function remap(value, a, b, c, d) {
  return lerp(c, d, invLerp(a, b, value));
}

export function smoothstep(min, max, value) {
  const t = saturate(invLerp(min, max, value));
  return t * t * (3 - 2 * t);
}

export function smootherstep(min, max, value) {
  const t = saturate(invLerp(min, max, value));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function easeOutCubic(value) {
  const t = saturate(value);
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutQuint(value) {
  const t = saturate(value);
  return 1 - Math.pow(1 - t, 5);
}

export function easeInOutSine(value) {
  return (1 - Math.cos(Math.PI * saturate(value))) / 2;
}

export function exponentialDamp(from, to, rate, deltaSeconds) {
  return lerp(from, to, 1 - Math.exp(-rate * Math.max(0, deltaSeconds)));
}

export function wrap(value, min, max) {
  const period = max - min;
  if (Math.abs(period) < EPS) return min;
  return min + ((value - min) % period + period) % period;
}

export function shortestAngle(from, to) {
  return wrap(to - from + PI, 0, TAU) - PI;
}

export function lerpAngle(from, to, t) {
  return from + shortestAngle(from, to) * saturate(t);
}

export function distance2D(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function distance3D(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function vec3(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

export function add3(a, b) {
  return vec3(a.x + b.x, a.y + b.y, a.z + b.z);
}

export function subtract3(a, b) {
  return vec3(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function scale3(a, scalar) {
  return vec3(a.x * scalar, a.y * scalar, a.z * scalar);
}

export function dot3(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross3(a, b) {
  return vec3(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x
  );
}

export function length3(a) {
  return Math.hypot(a.x, a.y, a.z);
}

export function normalize3(a) {
  const length = length3(a);
  return length <= EPS ? vec3(0, 0, 0) : scale3(a, 1 / length);
}

export function projectPerspective(point, yaw, pitch, fov, aspect) {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const x = point.x * cy - point.z * sy;
  const z = point.x * sy + point.z * cy;
  const y = point.y * cp - z * sp;
  const depth = point.y * sp + z * cp + 4.0;
  const scale = 1 / Math.tan(fov / 2);
  return {
    x: (x * scale) / (Math.max(.01, depth) * aspect),
    y: (y * scale) / Math.max(.01, depth),
    depth,
    visible: depth > .01
  };
}

export function hash32(value) {
  let x = value | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

export function createRng(seed = 43207) {
  let state = hash32(seed);
  return function nextRandom() {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function randomRange(rng, a, b) {
  return a + rng() * (b - a);
}

export function randomGaussian(rng) {
  const a = Math.max(EPS, rng());
  const b = rng();
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(TAU * b);
}

export function hexToRgb(hex) {
  if (typeof hex !== 'string') return [0, 0, 0];
  let code = hex.replace('#', '');
  if (code.length === 3) code = code.split('').map(char => char + char).join('');
  const n = Number.parseInt(code, 16);
  if (!Number.isFinite(n)) return [0, 0, 0];
  return [(n >>> 16) & 255, (n >>> 8) & 255, n & 255];
}

export function rgbToHex(r, g, b) {
  const channels = [r, g, b].map(v => clamp(Math.round(v), 0, 255));
  return '#' + channels.map(v => v.toString(16).padStart(2, '0')).join('');
}

export function mixColors(a, b, t) {
  const c = hexToRgb(a);
  const d = hexToRgb(b);
  return rgbToHex(...c.map((v, i) => lerp(v, d[i], saturate(t))));
}

export function radians(degrees) {
  return degrees * RAD;
}

export function degrees(radiansValue) {
  return radiansValue * DEG;
}

export function sphericalToCartesian(radius, azimuth, elevation) {
  return vec3(
    radius * Math.cos(elevation) * Math.cos(azimuth),
    radius * Math.sin(elevation),
    radius * Math.cos(elevation) * Math.sin(azimuth)
  );
}

export function cartesianToSpherical(point) {
  const radius = length3(point);
  if (radius <= EPS) return { radius: 0, azimuth: 0, elevation: 0 };
  return {
    radius,
    azimuth: Math.atan2(point.z, point.x),
    elevation: Math.asin(clamp(point.y / radius, -1, 1))
  };
}

export function parseInteger(value, fallback, min, max) {
  const result = Number.parseInt(String(value), 10);
  return Number.isFinite(result) ? clamp(result, min, max) : fallback;
}

export function parseFloatSafe(value, fallback, min, max) {
  const result = Number.parseFloat(String(value));
  return Number.isFinite(result) ? clamp(result, min, max) : fallback;
}

export function isFiniteVec3(value) {
  return !!value && Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z);
}

export function nearlyEqual(a, b, epsilon = 1e-6) {
  return Math.abs(a - b) <= epsilon * Math.max(1, Math.abs(a), Math.abs(b));
}

export function sampleCatmullRom(a, b, c, d, t) {
  const x = saturate(t);
  const x2 = x * x;
  const x3 = x2 * x;
  return .5 * ((2 * b) + (-a + c) * x + (2 * a - 5 * b + 4 * c - d) * x2 + (-a + 3 * b - 3 * c + d) * x3);
}

export function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

export function percentile(values, portion) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * saturate(portion);
  const floor = Math.floor(index);
  const remainder = index - floor;
  return lerp(sorted[floor], sorted[Math.min(sorted.length - 1, floor + 1)], remainder);
}

export function movingAverage(previous, current, factor = .2) {
  return previous == null ? current : lerp(previous, current, saturate(factor));
}

export function debounce(fn, delay = 200) {
  let handle;
  const wrapped = (...args) => {
    clearTimeout(handle);
    handle = setTimeout(() => fn(...args), delay);
  };
  wrapped.cancel = () => clearTimeout(handle);
  return wrapped;
}

export function throttle(fn, delay = 100) {
  let last = -Infinity;
  return (...args) => {
    const now = performance.now();
    if (now - last >= delay) {
      last = now;
      fn(...args);
    }
  };
}

export function assert(condition, message = 'Assertion failed') {
  if (!condition) throw new Error(message);
}

export function safeJsonParse(raw, fallback = null) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function range(start, count, increment = 1) {
  return Array.from({ length: count }, (_, index) => start + index * increment);
}

export function uniqueBy(items, getKey) {
  const set = new Set();
  return items.filter(item => {
    const key = getKey(item);
    if (set.has(key)) return false;
    set.add(key);
    return true;
  });
}

export function binarySearchNearest(array, value, getValue = x => x) {
  if (!array.length) return -1;
  let left = 0;
  let right = array.length - 1;
  while (left < right) {
    const middle = (left + right) >>> 1;
    if (getValue(array[middle]) < value) left = middle + 1;
    else right = middle;
  }
  if (left === 0) return 0;
  return Math.abs(getValue(array[left]) - value) < Math.abs(getValue(array[left - 1]) - value) ? left : left - 1;
}
