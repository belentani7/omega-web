#!/usr/bin/env node
/**
 * Verificador de enlaces internos y de recursos locales del sitio estático.
 *
 * Uso:
 *   node tools/check-links.mjs            # informe
 *   node tools/check-links.mjs --check    # exit 1 si hay enlaces roto (CI)
 *   node tools/check-links.mjs --help
 *
 * Reglas:
 *  - Los enlaces internos (href/src relativos) deben resolver a un fichero real.
 *  - Se ignoran URLs absolutas (http, https, mailto, tel), anclas puras (#x),
 *    plantillas ({{…}}), atributos vacíos y la carpeta dist/ (artefacto de build).
 *  - Los ficheros con rutas tipo C:\\... se reportan como error de plataforma.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SKIP_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', 'coverage', 'playwright-report', 'htmlcov', '.arena']);
const LINK_PATTERN = /(?:href|src)\s*=\s*"([^"]*)"/g;

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

export function extractLinks(html) {
  return [...html.matchAll(LINK_PATTERN)].map(match => match[1]);
}

/** Devuelve un motivo de error o null si el enlace es válido o externo. */
export function validateLink(htmlFile, href, root = ROOT) {
  const value = href.trim();
  if (!value || value === '#') {
    return value === '#' ? 'ancla vacía href="#"' : null;
  }
  if (/^(?:[a-z]+:)?\/\//i.test(value) || /^(?:mailto|tel|data|javascript):/i.test(value)) return null;
  if (value.startsWith('#')) return null;
  if (/^[a-zA-Z]:[\\/]/.test(value) || value.includes('\\\\')) return `ruta de Windows incrustada: ${value}`;
  if (value.includes('{{') || value.includes('${')) return null;
  const path = value.split('#')[0].split('?')[0];
  if (!path) return null;
  const target = path.startsWith('/') ? join(root, path) : resolve(dirname(htmlFile), path);
  if (existsSync(target)) {
    const stats = statSync(target);
    if (stats.isDirectory()) return existsSync(join(target, 'index.html')) ? null : `directorio sin index.html: ${value}`;
    return null;
  }
  // Un enlace relativo sin extensión puede resolverse a .html en GitHub Pages.
  if (!extname(target) && existsSync(target + '.html')) return null;
  return `no existe: ${value}`;
}

export function auditLinks(root = ROOT) {
  const problems = [];
  for (const file of walk(join(root))) {
    const html = readFileSync(file, 'utf8');
    for (const href of extractLinks(html)) {
      const reason = validateLink(file, href, root);
      if (reason) problems.push({ file: relative(root, file), href, reason });
    }
  }
  return problems;
}

/** Comprueba que los ids que el runtime necesita existen en el HTML. */
export function auditRequiredIds(htmlFile, requiredIds) {
  const html = readFileSync(htmlFile, 'utf8');
  const present = new Set([...html.matchAll(/\bid\s*=\s*"([^"]+)"/g)].map(match => match[1]));
  return requiredIds.filter(id => !present.has(id));
}

function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`check-links — verifica enlaces internos del sitio.

  node tools/check-links.mjs           informe de enlaces
  node tools/check-links.mjs --check   exit 1 si hay enlaces roto
  node tools/check-links.mjs --help    esta ayuda`);
    return 0;
  }
  const problems = auditLinks();
  const pages = [...walk(join(ROOT))].length;
  for (const problem of problems) {
    console.log(`${problem.file} → ${problem.href} (${problem.reason})`);
  }
  console.log(`\n${pages} páginas HTML revisadas · ${problems.length} enlaces con problemas`);
  if (argv.includes('--check') && problems.length > 0) return 1;
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main(process.argv.slice(2));
}
