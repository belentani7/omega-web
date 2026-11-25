#!/usr/bin/env node
/**
 * Normaliza el HTML generado por la herramienta heredada:
 *  1. Elimina BOM, metadatos `superpowers`/`omega-max` y restos de su andamiaje
 *     (`<section class="superpowers-mcp">`, la regla CSS `.superpowers-badge`).
 *  2. Elimina el `<script>` con ruta absoluta de Windows, imposible de servir.
 *  3. Repunta enlaces locales roto a su ruta real en la raíz del repositorio.
 *  4. Elimina cierres de documento duplicados y líneas en blanco sobrantes.
 *
 * Uso:
 *   node tools/normalize-html.mjs           aplica los cambios
 *   node tools/normalize-html.mjs --check   solo informa (exit 1 si queda algo)
 *   node tools/normalize-html.mjs --help
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SKIP_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', 'coverage', 'playwright-report', 'htmlcov', '.arena']);

const SUPERFLUOUS_META = /\s*<meta name="(?:superpowers|omega-max)" content="[^"]*">/g;
const SUPERPOWERS_SECTION = /\s*<section class="superpowers-mcp"[\s\S]*?<\/section>/g;
const SUPERPOWERS_BADGE_CSS = /\s*\.superpowers-badge\{[^}]*\}/g;
const WINDOWS_SCRIPT = /\s*<script src="[A-Za-z]:\\[^"]*"><\/script>/g;
const DUPLICATE_CLOSE = /(<\/html>)\s*<\/body>\s*<\/html>\s*$/i;
const LINK_ATTRIBUTE = /\b(href|src)="([^"]*)"/g;
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i;

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

export function depthPrefix(file, root = ROOT) {
  const segments = relative(root, file).split(sep);
  return segments.length <= 1 ? '' : '../'.repeat(segments.length - 1);
}

/**
 * Si el destino relativo no existe pero sí existe en la raíz del repositorio,
 * devuelve la ruta corregida. En cualquier otro caso devuelve la original.
 */
export function resolveLocalLink(value, file, root = ROOT, prefix = depthPrefix(file, root)) {
  const trimmed = value.trim();
  if (!trimmed || EXTERNAL.test(trimmed)) return value;
  const [beforeFragment, ...fragment] = trimmed.split('#');
  const [path, query] = beforeFragment.split('?');
  if (!path) return value;
  if (existsSync(resolve(dirname(file), path))) return value;
  if (!existsSync(resolve(root, path))) return value;
  return prefix + path + (query ? '?' + query : '') + (fragment.length ? '#' + fragment.join('#') : '');
}

export function normalizeHtml(html, file, root = ROOT) {
  const prefix = depthPrefix(file, root);
  let output = html.charCodeAt(0) === 0xfeff ? html.slice(1) : html;
  output = output.replace(SUPERFLUOUS_META, '');
  output = output.replace(SUPERPOWERS_SECTION, '');
  output = output.replace(SUPERPOWERS_BADGE_CSS, '');
  output = output.replace(WINDOWS_SCRIPT, '');
  output = output.replace(DUPLICATE_CLOSE, '$1\n');
  output = output.replace(LINK_ATTRIBUTE, (match, attribute, value) => {
    const fixed = resolveLocalLink(value, file, root, prefix);
    return fixed === value ? match : `${attribute}="${fixed}"`;
  });
  return output.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
}

function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`normalize-html — limpia el HTML heredado.

  node tools/normalize-html.mjs           aplica los cambios en sitio
  node tools/normalize-html.mjs --check   verifica sin escribir (exit 1 si hay pendientes)
  node tools/normalize-html.mjs --help    muestra esta ayuda`);
    return 0;
  }
  const checkOnly = argv.includes('--check');
  let files = 0;
  let changed = 0;
  for (const file of walk(join(ROOT))) {
    files++;
    const original = readFileSync(file, 'utf8');
    const output = normalizeHtml(original, file);
    if (output === original) continue;
    changed++;
    console.log(`${checkOnly ? 'PENDIENTE' : 'NORMALIZADO'} ${relative(ROOT, file)}`);
    if (!checkOnly) writeFileSync(file, output, 'utf8');
  }
  console.log(`\n${files} páginas HTML revisadas · ${changed} ${checkOnly ? 'pendientes' : 'normalizadas'}`);
  if (checkOnly && changed > 0) return 1;
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main(process.argv.slice(2));
}
