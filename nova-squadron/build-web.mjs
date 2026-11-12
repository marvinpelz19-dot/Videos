// Baut dist/web: die installierbare Fassung (PWA) zum Hochladen, z. B. per Netlify Drop.
// Braucht dist/Trade-Force.html (build-standalone.mjs) und icon.png (512 x 512) im Projektordner.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import crypto from 'node:crypto';
const R = path.dirname(fileURLToPath(import.meta.url)), W = path.join(R, 'dist/web');
fs.mkdirSync(W, { recursive: true });
let html = fs.readFileSync(path.join(R, 'dist/Trade-Force.html'), 'utf8');
const ver = crypto.createHash('sha1').update(html).digest('hex').slice(0, 10);
html = html.replace('<link rel="icon" href="data:,">', `<link rel="icon" href="./icon-192.png">\n<link rel="apple-touch-icon" href="./icon-192.png">\n<link rel="manifest" href="./manifest.webmanifest">\n<meta name="theme-color" content="#04060c">\n<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="apple-mobile-web-app-title" content="Trade Force">`)
  .replace('</body>', `<script>if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));</script>\n</body>`);
if (!html.includes('manifest.webmanifest') || !html.includes('sw.js')) throw new Error('Einbau fehlgeschlagen');
fs.writeFileSync(path.join(W, 'index.html'), html);
fs.writeFileSync(path.join(W, 'manifest.webmanifest'), JSON.stringify({ name: 'Trade Force · Der Krieg um Essen', short_name: 'Trade Force', start_url: './', scope: './', display: 'fullscreen', orientation: 'landscape', background_color: '#04060c', theme_color: '#04060c', icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }] }, null, 1));
// Service Worker: lädt das ganze Spiel einmal in den Gerätespeicher, danach läuft es ohne Internet
fs.writeFileSync(path.join(W, 'sw.js'), `const C = 'trade-force-${ver}', FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(C).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => { if (e.request.method !== 'GET') return; e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request).then((n) => { if ((n.ok || n.type === 'opaque') && new URL(e.request.url).origin !== location.origin) { const cp = n.clone(); caches.open(C).then((c) => c.put(e.request, cp)); } return n; }).catch(() => caches.match('./index.html')))); });
`);
for (const f of ['icon-192.png', 'icon-512.png']) if (fs.existsSync(path.join(R, f))) fs.copyFileSync(path.join(R, f), path.join(W, f)); else console.warn('fehlt:', f);
console.log('dist/web', ver, (fs.statSync(path.join(W, 'index.html')).size / 1e6).toFixed(1) + ' MB');
