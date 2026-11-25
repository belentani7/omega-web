import test from 'node:test';
import assert from 'node:assert/strict';
import { CANON } from '../js/canon-tokens.mjs';

test('CANON keeps the artist identity colours verified by contrast', () => {
  assert.equal(CANON.colors.black, '#050505');
  assert.equal(CANON.colors.neonRed, '#FF073A');
  assert.equal(CANON.colors.gold, '#D4AF37');
  assert.equal(CANON.colors.cyan, '#4de8e0');
  assert.equal(CANON.colors.violet.from, '#7A2BFF');
  assert.equal(CANON.colors.violet.to, '#9B5CFF');
  assert.match(CANON.colors.violet.gradient, /^linear-gradient\(135deg/);
});

test('CANON exposes a complete spacing and typography scale', () => {
  const expected = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'];
  assert.deepEqual(Object.keys(CANON.spacing), expected);
  for (const value of Object.values(CANON.spacing)) assert.match(value, /^\d+px$/);
  assert.ok(CANON.typography.fontFamily.sans.includes('Sora'));
  assert.ok(CANON.typography.fontFamily.mono.includes('JetBrains Mono'));
  assert.equal(CANON.typography.fontWeight.bold, 700);
});

test('CANON glow shadows reuse the identity colours', () => {
  assert.ok(CANON.shadows.glow.includes('rgba(122, 43, 255'));
  assert.ok(CANON.shadows.glowRed.includes('rgba(255, 7, 58'));
  assert.ok(CANON.shadows.glowGold.includes('rgba(212, 175, 55'));
});

test('Every CANON colour is a valid hex value', () => {
  const walk = (node, path) => {
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === 'string') {
        if (/^#/.test(value)) assert.match(value, /^#[0-9A-Fa-f]{6}$/, path + '.' + key);
      } else if (value && typeof value === 'object') {
        walk(value, path + '.' + key);
      }
    }
  };
  walk(CANON.colors, 'colors');
});
