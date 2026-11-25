import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SIGNATURES, STATIONS, WORLDS, GALAXIES,
  createGalaxies, galaxyHref, galaxyTitle, filterGalaxies,
  findGalaxy, findWorld, adjacentWorld, validateCosmosModel
} from '../js/data.js';

test('The canonical data model is intact', () => {
  assert.equal(SIGNATURES.length, 5);
  assert.equal(STATIONS.length, 10);
  assert.equal(WORLDS.length, 8);
  assert.equal(GALAXIES.length, 50);
  assert.deepEqual(validateCosmosModel(), []);
});

test('Every original galaxy has a distinct number and route', () => {
  const numbers = GALAXIES.map(node => node.number);
  const paths = GALAXIES.map(node => node.path);
  assert.equal(new Set(numbers).size, 50);
  assert.equal(new Set(paths).size, 50);
  for (let i = 0; i < 50; i++) {
    assert.equal(numbers[i], i + 1);
    assert.equal(paths[i], '../galaxia-' + String(i + 1).padStart(2, '0') + '.html');
  }
});

test('Canonical signature IDs match the original file order', () => {
  assert.equal(SIGNATURES[0].id, 'pedro');
  assert.equal(SIGNATURES[1].id, 'marcos');
  assert.equal(SIGNATURES[2].id, 'santos');
  assert.equal(SIGNATURES[3].id, 'belentani');
  assert.equal(SIGNATURES[4].id, 'human');
});

test('First and last galaxy map to their correct signatures', () => {
  assert.equal(findGalaxy(1).signature, 0);
  assert.equal(findGalaxy(1).station, 0);
  assert.equal(findGalaxy(50).signature, 4);
  assert.equal(findGalaxy(50).station, 9);
  assert.equal(findGalaxy(0), null);
  assert.equal(findGalaxy(51), null);
});

test('Routes preserve the original page for every language', () => {
  for (const node of GALAXIES) {
    for (const language of ['pt', 'es', 'en', 'ca']) {
      const destination = galaxyHref(node, language);
      assert.equal(destination, node.path + '?lang=' + language);
      assert.ok(!destination.includes('http'));
      assert.ok(!destination.includes('javascript:'));
    }
  }
});

test('Unrecognized language uses safe Portuguese fallback', () => {
  assert.equal(galaxyHref(findGalaxy(1), 'xx'), '../galaxia-01.html?lang=pt');
  assert.equal(galaxyHref(findGalaxy(1), '../bad'), '../galaxia-01.html?lang=pt');
  assert.equal(galaxyTitle(findGalaxy(1), 'nonsense'), 'O ENTRE');
});

test('All titles exist for all four languages', () => {
  for (const station of STATIONS) {
    for (const language of ['pt', 'es', 'en', 'ca']) {
      assert.equal(typeof station.title[language], 'string');
      assert.ok(station.title[language].length > 0);
    }
  }
  for (const world of WORLDS) {
    for (const language of ['pt', 'es', 'en', 'ca']) {
      assert.ok(world.title[language]);
      assert.ok(world.essence[language]);
    }
  }
});

test('Station filtering returns exactly five signature variants', () => {
  for (let station = 0; station < 10; station++) {
    const results = filterGalaxies('all', String(station));
    assert.equal(results.length, 5);
    assert.ok(results.every(node => node.station === station));
  }
});

test('Signature filtering returns exactly ten story chapters', () => {
  for (let signature = 0; signature < 5; signature++) {
    const results = filterGalaxies(String(signature), 'all');
    assert.equal(results.length, 10);
    assert.ok(results.every(node => node.signature === signature));
  }
});

test('Combined signature and station filter returns one galaxy', () => {
  for (let signature = 0; signature < 5; signature++) {
    for (let station = 0; station < 10; station++) {
      const results = filterGalaxies(String(signature), String(station));
      assert.equal(results.length, 1);
      assert.equal(results[0].number, signature * 10 + station + 1);
    }
  }
});

test('All-originals filter returns fifty destinations', () => {
  assert.equal(filterGalaxies('all', 'all').length, 50);
});

test('Generated model produces the same ordered paths each time', () => {
  const a = createGalaxies();
  const b = createGalaxies();
  assert.deepEqual(a, b);
  assert.notEqual(a, b);
  assert.ok(Object.isFrozen(a));
});

test('World identifiers are unique and every world includes a narrative', () => {
  assert.equal(new Set(WORLDS.map(world => world.id)).size, 8);
  for (const world of WORLDS) {
    assert.match(world.number, /^[0-9]{2}$/);
    assert.ok(world.kind);
    assert.ok(world.hero.length === 2);
    assert.ok(world.facts.length >= 3);
    assert.match(world.accent, /^#[a-fA-F0-9]{6}$/);
    assert.equal(findWorld(world.id), world);
  }
});

test('World navigation wraps forward and backward', () => {
  assert.equal(adjacentWorld('galaxy', -1).id, 'solar');
  assert.equal(adjacentWorld('solar', 1).id, 'galaxy');
  assert.equal(adjacentWorld('planets', 1).id, 'blackhole');
  assert.equal(adjacentWorld('galaxy', 3).id, 'ocean');
});

test('Galaxies retain immutable node identity', () => {
  assert.throws(() => { GALAXIES[0].number = 50; }, TypeError);
  assert.throws(() => { GALAXIES.push({}); }, TypeError);
});
