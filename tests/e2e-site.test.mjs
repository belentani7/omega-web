import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.glb': 'model/gltf-binary'
};

/** Servidor estático mínimo equivalente al de producción (sin reescrituras). */
async function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
      const target = normalize(join(ROOT, relativePath.endsWith('/') ? relativePath + 'index.html' : relativePath));
      if (!target.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const info = await stat(target);
      if (info.isDirectory()) {
        response.writeHead(404).end('Not found');
        return;
      }
      const body = await readFile(target);
      response.writeHead(200, {
        'content-type': MIME[extname(target)] ?? 'application/octet-stream',
        'content-length': body.length
      });
      response.end(body);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return { server, base: `http://127.0.0.1:${port}` };
}

test('The published site serves the host, its modules and every chapter over HTTP', async t => {
  const { server, base } = await startServer();
  t.after(() => new Promise(resolve => server.close(resolve)));

  const hostResponse = await fetch(base + '/index.html');
  assert.equal(hostResponse.status, 200);
  assert.match(hostResponse.headers.get('content-type'), /text\/html/);
  const host = await hostResponse.text();
  assert.match(host, /id="world-canvas"/);
  assert.equal(host.charCodeAt(0), '<'.charCodeAt(0), 'la respuesta no debe empezar con BOM');

  const stylesheet = await fetch(base + '/css/omega.css');
  assert.equal(stylesheet.status, 200);
  assert.match(stylesheet.headers.get('content-type'), /text\/css/);
  assert.ok((await stylesheet.text()).includes('--red'));

  // Grafo de módulos real: cada import relativo del punto de entrada debe existir.
  const seen = new Set();
  const pending = ['/js/app.js'];
  while (pending.length) {
    const path = pending.pop();
    if (seen.has(path)) continue;
    seen.add(path);
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path + ' no se sirve');
    const source = await response.text();
    assert.equal(source.charCodeAt(0) === 0xfeff, false, path + ' contiene BOM');
    for (const match of source.matchAll(/from\s+'(\.[^']+)'/g)) {
      pending.push(new URL(match[1], 'http://localhost' + path).pathname);
    }
  }
  assert.ok(seen.size >= 15, 'se esperaban al menos 15 módulos, se recorrieron ' + seen.size);

  for (const page of ['/galaxias/index.html', '/galaxias/galaxia-01.html', '/galaxias/galaxia-50.html', '/galaxias/omega/index.html', '/docs.html', '/accesibilidad.html', '/privacidad.html', '/404.html']) {
    const response = await fetch(base + page);
    assert.equal(response.status, 200, page + ' no se sirve');
  }

  const missing = await fetch(base + '/no-existe.html');
  assert.equal(missing.status, 404);
});
