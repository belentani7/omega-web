import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mojibakeScore, repairMojibake, stripBom, inspectFile } from '../tools/fix-encoding.mjs';
import { resolveLocalLink, normalizeHtml, depthPrefix } from '../tools/normalize-html.mjs';
import { validateLink, extractLinks, auditLinks } from '../tools/check-links.mjs';
import { analyseStylesheet, collectSelectors } from '../tools/audit-css.mjs';

/** Construye texto a partir de puntos de código, sin dañar el propio fichero. */
const cp = (...codes) => String.fromCharCode(...codes);

test('Windows-1252 mojibake is detected and repaired exactly', () => {
  // Secuencia real: '·' y '—' y 'Ó' guardados tras leer UTF-8 como Windows-1252.
  const damaged = 'GALAXIA 01 ' + cp(0xC2, 0xB7) + ' EL ENTRE '
    + cp(0xE2, 0x20AC, 0x201D) + ' LA ROCA ' + cp(0xC2, 0xB7)
    + ' ESTACI' + cp(0xC3, 0x201C) + 'N 1';
  assert.ok(mojibakeScore(damaged) >= 4, 'el detector debe reconocer el daño');
  const fixed = repairMojibake(damaged);
  assert.equal(fixed, 'GALAXIA 01 ' + cp(0xB7) + ' EL ENTRE ' + cp(0x2014)
    + ' LA ROCA ' + cp(0xB7) + ' ESTACI' + cp(0xD3) + 'N 1');
  assert.equal(mojibakeScore(fixed), 0);
});

test('Valid Portuguese text is never reported as damaged', () => {
  const clean = 'A CONSTELAÇÃO, A NAVEGAÇÃO e a ESTAÇÃO — tudo legítimo…';
  assert.equal(mojibakeScore(clean), 0);
  assert.equal(repairMojibake(clean), null);
});

test('The BOM is stripped and files are only rewritten once', () => {
  assert.equal(stripBom('\uFEFFhola'), 'hola');
  const directory = mkdtempSync(join(tmpdir(), 'omega-encoding-'));
  const file = join(directory, 'page.html');
  writeFileSync(file, '\uFEFF<title>N' + cp(0xC3, 0x0161) + 'CLEO</title>', 'utf8');
  const first = inspectFile(file);
  assert.equal(first.changed, true);
  assert.equal(first.after, 0);
  writeFileSync(file, first.text, 'utf8');
  assert.equal(inspectFile(file).changed, false);
  assert.equal(readFileSync(file, 'utf8'), '<title>N' + cp(0xDA) + 'CLEO</title>');
});

test('Local links are resolved against the repository root when nested', () => {
  const root = mkdtempSync(join(tmpdir(), 'omega-links-'));
  mkdirSync(join(root, 'galaxias'));
  writeFileSync(join(root, 'docs.html'), '<!DOCTYPE html>');
  writeFileSync(join(root, 'galaxias', 'page.html'), '');
  const nested = join(root, 'galaxias', 'page.html');
  assert.equal(depthPrefix(nested, root), '../');
  assert.equal(resolveLocalLink('docs.html', nested, root, '../'), '../docs.html');
  assert.equal(resolveLocalLink('https://example.com', nested, root, '../'), 'https://example.com');
  assert.equal(resolveLocalLink('#ancla', nested, root, '../'), '#ancla');
  assert.equal(resolveLocalLink('no-existe.html', nested, root, '../'), 'no-existe.html');
});

test('The HTML normalizer removes legacy scaffolding without touching content', () => {
  const root = mkdtempSync(join(tmpdir(), 'omega-normalize-'));
  const file = join(root, 'index.html');
  const source = [
    '<!DOCTYPE html>',
    '<html lang="es"><head><meta name="superpowers" content="x"><meta name="omega-max" content="y">',
    '<style>.superpowers-badge{color:red}</style></head>',
    '<body><section class="superpowers-mcp"><h2>HUB</h2></section>',
    '<script src="C:\\Users\\USER\\legacy\\omega-superpowers-client.js"></script>',
    '<p>Contenido real</p></body></html>'
  ].join('\n');
  const output = normalizeHtml(source, file, root);
  assert.ok(!output.includes('superpowers'));
  assert.ok(!output.includes('C:\\Users'));
  assert.match(output, /Contenido real/);
});

test('Link validation flags missing files and Windows paths only', () => {
  const root = mkdtempSync(join(tmpdir(), 'omega-check-'));
  const html = join(root, 'index.html');
  writeFileSync(html, '<!DOCTYPE html>');
  assert.equal(validateLink(html, 'index.html', root), null);
  assert.equal(validateLink(html, 'https://example.com/x', root), null);
  assert.equal(validateLink(html, 'mailto:hola@example.com', root), null);
  assert.match(String(validateLink(html, 'falta.html', root)), /no existe/);
  assert.match(String(validateLink(html, 'C:\\Users\\x.js', root)), /Windows/);
  assert.match(String(validateLink(html, '#', root)), /ancla vacía/);
  assert.deepEqual(extractLinks('<a href="a.html">x</a><img src="b.png">'), ['a.html', 'b.png']);
  assert.deepEqual(auditLinks(root), []);
});

test('CSS audit separates media overrides from real duplicates', () => {
  const css = ':root{--used:#fff;--dead:#000}a{color:var(--used)}@media (max-width:720px){a{color:red}}a{color:blue}';
  const stats = analyseStylesheet(css);
  assert.deepEqual(stats.unusedTokens, ['--dead']);
  assert.deepEqual(stats.duplicatedSelectors, ['raíz → a']);
  const scopes = collectSelectors('@media (min-width:1px){a{color:red}}a{color:blue}');
  assert.deepEqual([...scopes.keys()], ['@media (min-width:1px)', 'raíz']);
});
