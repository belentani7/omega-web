import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PI, TAU, clamp, saturate, lerp, invLerp, remap,
  smoothstep, smootherstep, easeOutCubic, easeInOutSine,
  exponentialDamp, wrap, shortestAngle, lerpAngle,
  vec3, add3, subtract3, scale3, dot3, cross3,
  length3, normalize3, distance3D, projectPerspective,
  hash32, createRng, randomRange, randomGaussian,
  hexToRgb, rgbToHex, mixColors, radians, degrees,
  sphericalToCartesian, cartesianToSpherical,
  parseInteger, parseFloatSafe, nearlyEqual, sampleCatmullRom,
  median, percentile, movingAverage, safeJsonParse, uniqueBy,
  binarySearchNearest, assert as omegaAssert
} from '../js/math.js';

test('clamp restricts boundaries and guards NaN', () => {
  assert.equal(clamp(-20, 0, 10), 0);
  assert.equal(clamp(20, 0, 10), 10);
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(NaN, 0, 10), 0);
});

test('saturation remains in unit interval', () => {
  for (const value of [-1, 0, .2, .5, .9, 1, 3]) {
    assert.ok(saturate(value) >= 0 && saturate(value) <= 1);
  }
});

test('linear interpolation agrees with inverse interpolation', () => {
  for (let n = 0; n < 100; n++) {
    const alpha = n / 100;
    const value = lerp(-5, 18, alpha);
    assert.ok(nearlyEqual(invLerp(-5, 18, value), alpha));
  }
});

test('remapping to a new range handles basic cases', () => {
  assert.equal(remap(.5, 0, 1, 10, 20), 15);
  assert.equal(remap(0, 0, 1, -1, 1), -1);
});

test('smoothstep has exact edges and monotonic interior', () => {
  assert.equal(smoothstep(0, 1, -1), 0);
  assert.equal(smoothstep(0, 1, 2), 1);
  let previous = -1;
  for (let n = 0; n <= 100; n++) {
    const value = smoothstep(0, 1, n / 100);
    assert.ok(value >= previous);
    previous = value;
  }
});

test('smootherstep is smoother near endpoints', () => {
  assert.equal(smootherstep(0, 1, 0), 0);
  assert.equal(smootherstep(0, 1, 1), 1);
  assert.ok(smootherstep(0, 1, .1) < smoothstep(0, 1, .1));
});

test('easing functions preserve endpoints', () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.equal(easeInOutSine(0), 0);
  assert.ok(nearlyEqual(easeInOutSine(1), 1));
});

test('exponential damping converges on a target', () => {
  let value = 0;
  for (let i = 0; i < 100; i++) value = exponentialDamp(value, 9, 10, .016);
  assert.ok(Math.abs(value - 9) < .001);
});

test('angle wrapping handles positive and negative multiples', () => {
  assert.ok(nearlyEqual(wrap(TAU, 0, TAU), 0));
  assert.ok(nearlyEqual(wrap(-PI, 0, TAU), PI));
  assert.ok(nearlyEqual(shortestAngle(0, TAU - .2), -.2));
  assert.ok(nearlyEqual(lerpAngle(0, TAU - .2, .5), -.1));
});

test('vec3 operations follow elementary vector algebra', () => {
  const a = vec3(1, 2, 3);
  const b = vec3(4, 5, 6);
  assert.deepEqual(add3(a, b), vec3(5, 7, 9));
  assert.deepEqual(subtract3(b, a), vec3(3, 3, 3));
  assert.deepEqual(scale3(a, 2), vec3(2, 4, 6));
  assert.equal(dot3(a, b), 32);
  assert.deepEqual(cross3(vec3(1, 0, 0), vec3(0, 1, 0)), vec3(0, 0, 1));
});

test('vector norm and distance are correct', () => {
  assert.equal(length3(vec3(3, 4, 0)), 5);
  assert.equal(distance3D(vec3(1, 2, 3), vec3(4, 6, 3)), 5);
  assert.ok(nearlyEqual(length3(normalize3(vec3(3, 4, 0))), 1));
  assert.deepEqual(normalize3(vec3()), vec3());
});

test('projection returns finite normalized coordinates', () => {
  const projection = projectPerspective(vec3(.2, .2, 1), 0, 0, 1.2, 16 / 9);
  assert.ok(Number.isFinite(projection.x));
  assert.ok(Number.isFinite(projection.y));
  assert.ok(Number.isFinite(projection.depth));
  assert.equal(projection.visible, true);
});

test('random generator is deterministic for the project seed', () => {
  const first = createRng(43207);
  const second = createRng(43207);
  for (let n = 0; n < 200; n++) {
    assert.equal(first(), second());
  }
  assert.notEqual(hash32(1), hash32(2));
});

test('uniform and Gaussian random variates remain finite', () => {
  const rng = createRng(10);
  for (let n = 0; n < 200; n++) {
    assert.ok(randomRange(rng, -4, 5) >= -4);
    assert.ok(Number.isFinite(randomGaussian(rng)));
  }
});

test('color parsing and interpolation preserve expected channels', () => {
  assert.deepEqual(hexToRgb('#ff003c'), [255, 0, 60]);
  assert.deepEqual(hexToRgb('#fff'), [255, 255, 255]);
  assert.equal(rgbToHex(255, 0, 60), '#ff003c');
  assert.equal(mixColors('#000000', '#ffffff', 0), '#000000');
  assert.equal(mixColors('#000000', '#ffffff', 1), '#ffffff');
});

test('spherical conversions roundtrip', () => {
  const point = sphericalToCartesian(3, 1.23, -.3);
  const back = cartesianToSpherical(point);
  assert.ok(nearlyEqual(back.radius, 3));
  assert.ok(nearlyEqual(back.azimuth, 1.23));
  assert.ok(nearlyEqual(back.elevation, -.3));
});

test('degrees and radians are inverse transformations', () => {
  assert.ok(nearlyEqual(radians(180), PI));
  assert.ok(nearlyEqual(degrees(PI), 180));
});

test('number parsing falls back for nonnumeric strings', () => {
  assert.equal(parseInteger('12', 1, 0, 20), 12);
  assert.equal(parseInteger('bad', 1, 0, 20), 1);
  assert.equal(parseInteger('99', 1, 0, 20), 20);
  assert.equal(parseFloatSafe('3.14', 1, 0, 10), 3.14);
  assert.equal(parseFloatSafe('bad', 1, 0, 10), 1);
});

test('Catmull-Rom passes through central control points', () => {
  assert.ok(nearlyEqual(sampleCatmullRom(-5, 1, 3, 9, 0), 1));
  assert.ok(nearlyEqual(sampleCatmullRom(-5, 1, 3, 9, 1), 3));
});

test('median and percentile are order independent', () => {
  assert.equal(median([3, 1, 4, 2, 5]), 3);
  assert.equal(median([3, 1, 4, 2]), 2.5);
  assert.equal(percentile([1, 3, 5, 7, 9], .5), 5);
  assert.equal(median([]), 0);
});

test('moving average initializes and blends', () => {
  assert.equal(movingAverage(null, 10), 10);
  assert.equal(movingAverage(0, 10, .5), 5);
});

test('JSON parsing is failure-tolerant', () => {
  assert.deepEqual(safeJsonParse('{"a":2}'), { a: 2 });
  assert.equal(safeJsonParse('{a:'), null);
});

test('uniqueBy removes duplicate keys without sorting items', () => {
  const result = uniqueBy([{ id: 2 }, { id: 1 }, { id: 2 }], item => item.id);
  assert.deepEqual(result.map(item => item.id), [2, 1]);
});

test('binary search returns the nearest ordered entry', () => {
  const values = [1, 3, 5, 7, 9];
  assert.equal(binarySearchNearest(values, 4.9), 2);
  assert.equal(binarySearchNearest(values, .2), 0);
  assert.equal(binarySearchNearest(values, 10), 4);
  assert.equal(binarySearchNearest([], 10), -1);
});

test('assert helper reports meaningful failures', () => {
  assert.doesNotThrow(() => omegaAssert(true));
  assert.throws(() => omegaAssert(false, 'bad state'), /bad state/);
});
