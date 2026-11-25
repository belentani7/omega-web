import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { requiredRuntimeIds, auditDocument } from '../tools/check-html.mjs';

const root = new URL('../', import.meta.url);
const host = readFileSync(new URL('index.html', root), 'utf8');

test('The Cosmos host declares every id the runtime queries', () => {
  const present = new Set([...host.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]));
  const missing = requiredRuntimeIds(new URL('../', import.meta.url).pathname).filter(id => !present.has(id));
  assert.deepEqual(missing, []);
  assert.ok(requiredRuntimeIds(new URL('../', import.meta.url).pathname).length >= 55);
});

test('The host wires the module entry point and the visual system', () => {
  assert.match(host, /<script type="module" src="js\/app\.js"><\/script>/);
  assert.match(host, /<link rel="stylesheet" href="css\/omega\.css">/);
  assert.match(host, /<canvas id="world-canvas"/);
  assert.match(host, /<canvas id="overlay-canvas"/);
});

test('Nodes mutated through firstChild start with a real text node', () => {
  for (const id of ['next-world', 'explore-world', 'classic-link', 'galaxy-drawer-title']) {
    const element = host.match(new RegExp(`<[a-z][a-z0-9]* id="${id}"[^>]*>([\\s\\S]*?)</`));
    assert.ok(element, id + ' is missing from the host');
    const inner = element[1];
    assert.ok(!/^\s*</.test(inner), id + ' must begin with text, not with a child element');
    assert.ok(inner.trim().length > 0, id + ' must not be empty');
  }
});

test('Filter selects expose an "all" option as their first child', () => {
  for (const id of ['signature-filter', 'station-filter', 'language', 'quality-toggle']) {
    const select = host.match(new RegExp(`<(?:select|option)[^>]*id="${id}"[^>]*>([\\s\\S]*?)</`)) ?? [];
    const html = select[0] ?? '';
    const first = html.match(/<option value="([^"]+)"[^>]*>/);
    assert.ok(first, id + ' has no options');
    if (id === 'signature-filter' || id === 'station-filter') assert.equal(first[1], 'all');
  }
});

test('The host document passes the same structural audit as every other page', () => {
  assert.deepEqual(auditDocument('index.html', host), []);
});

test('Every galaxy chapter exists for the fifty canonical routes', () => {
  for (let index = 1; index <= 50; index++) {
    const name = 'galaxia-' + String(index).padStart(2, '0') + '.html';
    assert.ok(existsSync(new URL('galaxias/' + name, root)), name + ' is missing');
  }
});

test('The immersive app has a single canonical implementation', () => {
  assert.ok(existsSync(new URL('js/app.js', root)));
  assert.ok(!existsSync(new URL('galaxias/omega/js/app.js', root)),
    'galaxias/omega must not duplicate the runtime');
  const redirect = readFileSync(new URL('galaxias/omega/index.html', root), 'utf8');
  assert.match(redirect, /url=\.\.\/\.\.\/index\.html/);
  assert.match(redirect, /canonical" href="\.\.\/\.\.\/index\.html"/);
});
