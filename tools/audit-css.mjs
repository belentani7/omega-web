#!/usr/bin/env node
/**
 * Auditoría del CSS propio: peso real (crudo y gzip), reglas duplicadas,
 * custom properties declaradas pero nunca usadas y número de `!important`.
 *
 * Uso:
 *   node tools/audit-css.mjs            informe
 *   node tools/audit-css.mjs --check    exit 1 si hay tokens muertos o selectores duplicados
 *   node tools/audit-css.mjs --help
 */
import { gzipSync } from 'node:zlib';
import { readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SHEETS = ['css/omega.css', 'css/site.css'];

/** Quita comentarios para analizar solo reglas reales. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Agrupa selectores por ámbito (raíz o bloque `@media`/`@supports`).
 * Un mismo selector declarado en `@media` no es un duplicado: es un override.
 */
export function collectSelectors(css) {
  const scopes = new Map();
  const stack = [];
  let buffer = '';
  for (const char of css) {
    if (char === '{') {
      const prelude = buffer.trim().replace(/\s+/g, ' ');
      buffer = '';
      if (prelude.startsWith('@')) {
        stack.push(prelude);
      } else {
        const key = stack.filter(entry => entry !== '#rule').join(' >> ') || 'raíz';
        if (!scopes.has(key)) scopes.set(key, []);
        if (prelude) scopes.get(key).push(prelude);
        stack.push('#rule');
      }
    } else if (char === '}') {
      buffer = '';
      if (stack.length) stack.pop();
    } else {
      buffer += char;
    }
  }
  return scopes;
}

export function analyseStylesheet(source) {
  const clean = stripComments(source);
  const declared = [...clean.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map(match => match[1]);
  const used = new Set([...clean.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)].map(match => match[1]));
  const unusedTokens = [...new Set(declared)].filter(token => !used.has(token));
  const scopes = collectSelectors(clean);
  const selectors = [...scopes.values()].flat();
  const duplicatedSelectors = [];
  for (const [scope, list] of scopes) {
    for (const selector of new Set(list)) {
      if (list.filter(value => value === selector).length > 1) duplicatedSelectors.push(`${scope} → ${selector}`);
    }
  }
  const bytes = Buffer.byteLength(source, 'utf8');
  return {
    bytes,
    gzipBytes: gzipSync(source).length,
    rules: selectors.length,
    declarations: [...clean.matchAll(/[a-z-]+\s*:/gi)].length,
    important: (clean.match(/!important/g) ?? []).length,
    unusedTokens,
    duplicatedSelectors
  };
}

function formatBytes(bytes) {
  return bytes >= 1024 ? (bytes / 1024).toFixed(1) + ' kB' : bytes + ' B';
}

function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`audit-css — audita las hojas de estilo propias.

  node tools/audit-css.mjs           informe de tamaño y calidad
  node tools/audit-css.mjs --check   exit 1 si hay tokens muertos o selectores duplicados
  node tools/audit-css.mjs --help    esta ayuda`);
    return 0;
  }
  let failed = false;
  let totalBytes = 0;
  let totalGzip = 0;
  for (const sheet of SHEETS) {
    const path = join(ROOT, sheet);
    const source = readFileSync(path, 'utf8');
    const stats = analyseStylesheet(source);
    const onDisk = statSync(path).size;
    totalBytes += stats.bytes;
    totalGzip += stats.gzipBytes;
    console.log(`${relative(ROOT, path)} · ${formatBytes(stats.bytes)} (${formatBytes(stats.gzipBytes)} gzip) · ${stats.rules} reglas · ${stats.important} !important`);
    if (onDisk !== stats.bytes) console.log(`  aviso: el tamaño en disco (${onDisk} B) no coincide con el leído`);
    for (const token of stats.unusedTokens) {
      console.log(`  token sin uso: ${token}`);
      failed = true;
    }
    for (const selector of stats.duplicatedSelectors) {
      console.log(`  selector declarado dos veces: ${selector}`);
      failed = true;
    }
  }
  console.log(`\nTotal propio: ${formatBytes(totalBytes)} (${formatBytes(totalGzip)} gzip)`);
  if (argv.includes('--check') && failed) return 1;
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main(process.argv.slice(2));
}
