#!/usr/bin/env node
/**
 * Validador estructural del HTML publicado.
 *
 * Comprueba, para cada página:
 *  - doctype, `lang`, `charset` temprano, `title` y `viewport`;
 *  - ids únicos y exactamente un `<h1>`;
 *  - ausencia de `href="#"`, `javascript:`, rutas de Windows y manejadores inline;
 *  - balance de `<style>`/`<script>`.
 *
 * Y para el host de la experiencia Cosmos (`index.html`):
 *  - que existan todos los ids que el runtime consulta en `js/*.js`.
 *
 * Uso:
 *   node tools/check-html.mjs            informe
 *   node tools/check-html.mjs --check    exit 1 si hay problemas
 *   node tools/check-html.mjs --help
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SKIP_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', 'coverage', 'playwright-report', 'htmlcov', '.arena']);

function* walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRECTORIES.has(entry.name)) continue;
      yield* walk(join(directory, entry.name));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      yield join(directory, entry.name);
    }
  }
}

/** Ids que el runtime de la experiencia Cosmos necesita encontrar en el DOM. */
export function requiredRuntimeIds(root = ROOT) {
  const files = ['app.js', 'ui.js', 'renderer.js', 'accessibility.js'].map(name => join(root, 'js', name));
  const ids = new Set();
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/(?:\$\(|getElementById\()\s*'([a-z][a-z0-9-]+)'/g)) {
      ids.add(match[1]);
    }
  }
  return [...ids].sort();
}

export function auditDocument(path, html) {
  const issues = [];
  const head = html.slice(0, 2048);
  if (!/^<!DOCTYPE html>/i.test(html.trimStart())) issues.push('falta <!DOCTYPE html> al inicio');
  if (!/<html[^>]*\slang="[a-z]{2}(?:-[A-Za-z]{2,})?"/i.test(head)) issues.push('falta lang en <html>');
  if (!/<meta charset="utf-8"/i.test(head)) issues.push('falta <meta charset="utf-8"> en los primeros 2 KB');
  if (!/<meta name="viewport"[^>]*width=device-width/i.test(head)) issues.push('falta viewport con width=device-width');
  const title = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (!title || !title[1].trim()) issues.push('title vacío o ausente');

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  for (const id of new Set(duplicates)) issues.push(`id duplicado: ${id}`);

  const h1 = (html.match(/<h1[\s>]/gi) ?? []).length;
  if (h1 !== 1) issues.push(`${h1} elementos <h1> (se espera exactamente 1)`);

  if (/href="#"/.test(html)) issues.push('enlace con href="#" (destino inexistente)');
  if (/href="javascript:/i.test(html)) issues.push('enlace javascript: (bloqueado por políticas del navegador)');
  if (/[A-Za-z]:\\\\/.test(html)) issues.push('ruta absoluta de Windows incrustada');
  if (/\son(?:click|change|submit|load|error|keydown)\s*=/i.test(html)) issues.push('manejador de evento inline');

  for (const tag of ['style', 'script']) {
    const open = (html.match(new RegExp(`<${tag}[\\s>]`, 'gi')) ?? []).length;
    const close = (html.match(new RegExp(`</${tag}>`, 'gi')) ?? []).length;
    if (open !== close) issues.push(`etiquetas <${tag}> desbalanceadas (${open} abren, ${close} cierran)`);
  }
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map(match => match[0]);
  for (const image of images) {
    if (!/\salt=/.test(image)) issues.push(`<img> sin alt: ${image.slice(0, 60)}`);
  }
  return issues;
}

function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`check-html — valida estructura del HTML y el contrato del host.

  node tools/check-html.mjs           informe
  node tools/check-html.mjs --check   exit 1 si hay problemas
  node tools/check-html.mjs --help    esta ayuda`);
    return 0;
  }
  const problems = [];
  let pages = 0;
  for (const file of walk(join(ROOT))) {
    pages++;
    const name = relative(ROOT, file);
    const html = readFileSync(file, 'utf8');
    for (const issue of auditDocument(file, html)) problems.push(`${name}: ${issue}`);
  }

  const hostHtml = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const hostIds = new Set([...hostHtml.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]));
  const missing = requiredRuntimeIds().filter(id => !hostIds.has(id));
  for (const id of missing) problems.push(`index.html: falta el id "${id}" que el runtime consulta`);

  for (const problem of problems) console.log(problem);
  console.log(`\n${pages} páginas · ${requiredRuntimeIds().length} ids de runtime · ${problems.length} problemas`);
  if (argv.includes('--check') && problems.length > 0) return 1;
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main(process.argv.slice(2));
}
