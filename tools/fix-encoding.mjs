#!/usr/bin/env node
/**
 * Repara texto con "mojibake" (UTF-8 leído como Latin-1 y re-guardado) y
 * elimina el BOM inicial de los ficheros de texto del repositorio.
 *
 * Uso:
 *   node tools/fix-encoding.mjs            # repara en sitio
 *   node tools/fix-encoding.mjs --check    # solo informa (código 1 si hay problemas)
 *   node tools/fix-encoding.mjs --help
 *
 * Seguridad: solo reescribe un fichero cuando la conversión Latin-1 -> UTF-8
 * produce texto válido y reduce de forma estricta las marcas de mojibake.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TEXT_EXTENSIONS = new Set(['.html', '.css', '.js', '.mjs', '.json', '.md', '.txt', '.xml', '.webmanifest', '.svg', '.py']);
const SKIP_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', 'static', 'coverage', 'playwright-report', 'htmlcov', '.arena']);

/**
 * Marcas inequívocas de UTF-8 leído como Windows-1252/Latin-1: un byte guía
 * (U+00C2, U+00C3 o U+00E2) seguido de un byte de continuación 0x80-0xBF.
 * Así "CONSTELAÇÃO" (portugués correcto) no se confunde con texto dañado.
 */
const CONTINUATION = '\u00A0-\u00BF\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6'
  + '\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014'
  + '\u02DC\u2122\u0161\u203A\u0153\u017E\u0178';
const MOJIBAKE = new RegExp('[\u00C2\u00C3\u00E2][' + CONTINUATION + ']', 'g');

/**
 * Los 27 caracteres que Windows-1252 coloca en 0x80-0x9F y que Latin-1 no
 * define. Se necesitan para invertir el daño real: el byte 0x97 (guion largo
 * en UTF-8) se guardó como el carácter U+2014 leído en Windows-1252.
 */
const CP1252_SPECIAL = Object.freeze({
  '\u20AC': 0x80, '\u201A': 0x82, '\u0192': 0x83, '\u201E': 0x84,
  '\u2026': 0x85, '\u2020': 0x86, '\u2021': 0x87, '\u02C6': 0x88,
  '\u2030': 0x89, '\u0160': 0x8A, '\u2039': 0x8B, '\u0152': 0x8C,
  '\u017D': 0x8E, '\u2018': 0x91, '\u2019': 0x92, '\u201C': 0x93,
  '\u201D': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97,
  '\u02DC': 0x98, '\u2122': 0x99, '\u0161': 0x9A, '\u203A': 0x9B,
  '\u0153': 0x9C, '\u017E': 0x9E, '\u0178': 0x9F
});

export function mojibakeScore(text) {
  return (text.match(MOJIBAKE) ?? []).length;
}

/** Convierte texto "leído como Windows-1252" a bytes; null si hay un punto de código imposible. */
function toCp1252Bytes(text) {
  const bytes = Buffer.alloc(text.length);
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const code = char.codePointAt(0);
    const mapped = CP1252_SPECIAL[char];
    if (mapped !== undefined) bytes[index] = mapped;
    else if (code <= 0xFF) bytes[index] = code;
    else return null;
  }
  return bytes;
}

/**
 * Devuelve el texto corregido, o null si no hay nada que corregir.
 * Solo acepta la conversión si es verificable en ambos sentidos.
 * @param {string} text
 */
export function repairMojibake(text) {
  if (mojibakeScore(text) === 0) return null;
  const bytes = toCp1252Bytes(text);
  if (bytes === null) return null;
  const decoded = bytes.toString('utf8');
  if (decoded.includes('\uFFFD')) return null;
  // La verificación fuerte es semántica: el texto decodificado debe ser UTF-8
  // válido y contener menos marcas de mojibake que el original. No se exige
  // identidad de bytes porque 0x94 y 0x97 colapsan en el mismo carácter final.
  if (mojibakeScore(decoded) >= mojibakeScore(text)) return null;
  if (mojibakeScore(decoded) !== 0) return null;
  return decoded;
}

export function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function* walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRECTORIES.has(entry.name)) continue;
      yield* walk(join(directory, entry.name));
    } else if (entry.isFile() && TEXT_EXTENSIONS.has(extname(entry.name))) {
      yield join(directory, entry.name);
    }
  }
}

export function inspectFile(path) {
  const original = readFileSync(path, 'utf8');
  let text = stripBom(original);
  const repaired = repairMojibake(text);
  if (repaired !== null) text = repaired;
  const changed = text !== original;
  return { changed, text, before: mojibakeScore(original), after: mojibakeScore(text) };
}

function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`fix-encoding — repara mojibake UTF-8 y elimina BOM.

  node tools/fix-encoding.mjs           repara los ficheros en sitio
  node tools/fix-encoding.mjs --check   verifica sin escribir (exit 1 si hay problemas)
  node tools/fix-encoding.mjs --help    muestra esta ayuda`);
    return 0;
  }
  const checkOnly = argv.includes('--check');
  let files = 0;
  let damaged = 0;
  let bom = 0;
  let written = 0;
  for (const path of walk(ROOT)) {
    files++;
    const original = readFileSync(path, 'utf8');
    if (original.charCodeAt(0) === 0xfeff) bom++;
    const result = inspectFile(path);
    if (result.before > 0) damaged++;
    if (!result.changed) continue;
    written++;
    const name = relative(ROOT, path);
    console.log(`${checkOnly ? 'PENDIENTE' : 'REPARADO '} ${name} (marcas ${result.before} → ${result.after})`);
    if (!checkOnly) writeFileSync(path, result.text, 'utf8');
  }
  console.log(`\n${files} ficheros de texto revisados · ${damaged} con mojibake · ${bom} con BOM · ${written} ${checkOnly ? 'pendientes' : 'reescritos'}`);
  if (checkOnly && (damaged > 0 || bom > 0)) return 1;
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main(process.argv.slice(2));
}
