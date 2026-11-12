// Lokaler Server: node serve.mjs  →  http://127.0.0.1:8188/
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(fileURLToPath(import.meta.url)), PORT = Number(process.argv[2]) || 8188;
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.css': 'text/css' };
http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html', file = path.resolve(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (err, data) => { if (err) return res.writeHead(404).end(); res.writeHead(200, { 'Content-Type': T[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }).end(data); });
}).listen(PORT, '127.0.0.1', () => console.log(`Nova Squadron läuft auf http://127.0.0.1:${PORT}/`));
