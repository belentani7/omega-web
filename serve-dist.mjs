import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] || 'dist';
const port = Number(process.argv[3] || 8200);
const types = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.glsl':'text/plain','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary','.json':'application/json','.woff2':'font/woff2'};
http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(root, p);
  fs.readFile(f, (e,d)=>{
    if (e) { res.writeHead(404); res.end('404'); return; }
    res.writeHead(200, {'Content-Type': types[path.extname(f)] || 'application/octet-stream'});
    res.end(d);
  });
}).listen(port, ()=>console.log('serving', root, 'on', port));
