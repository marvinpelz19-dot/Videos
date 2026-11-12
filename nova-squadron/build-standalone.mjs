// Baut dist/Nova-Squadron.html: eine einzige Datei, die per Doppelklick im Browser läuft (ohne Server, ohne Internet).
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { buildSync } from 'esbuild';
const R = path.dirname(fileURLToPath(import.meta.url)), rd = (f) => fs.readFileSync(path.join(R, f), 'utf8');
const uri = (f) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(R, 'assets', f)).toString('base64');
const js = buildSync({ entryPoints: [path.join(R, 'src/game.js')], bundle: true, minify: true, format: 'iife', write: false, legalComments: 'none' }).outputFiles[0].text;
const assets = Object.fromEntries(fs.readdirSync(path.join(R, 'assets')).filter((f) => f !== 'keyart.jpg').map((f) => [f.replace('.jpg', ''), uri(f)]));
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');
let page = rd('page.html').replace('url("./assets/keyart.jpg")', `url("${uri('keyart.jpg')}")`);
page = page.replace(/<script src="\.\/vendor\/jsfxr\/riffwave\.js"><\/script>\s*<script src="\.\/vendor\/jsfxr\/sfxr\.js"><\/script>\s*<script type="module" src="\.\/src\/game\.js"><\/script>/,
  () => `<script>${safe(rd('vendor/jsfxr/riffwave.js'))}</script>\n<script>${safe(rd('vendor/jsfxr/sfxr.js'))}</script>\n<script>window.NOVA_ASSETS=${JSON.stringify(assets)};</script>\n<script>${safe(js)}</script>`);
if (page.includes('src="./')) throw new Error('Skripte nicht ersetzt');
fs.mkdirSync(path.join(R, 'dist'), { recursive: true });
fs.writeFileSync(path.join(R, 'dist/Nova-Squadron.html'), `<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n<link rel="icon" href="data:,">\n</head>\n<body style="margin:0">\n${page}</body>\n</html>\n`);
console.log('dist/Nova-Squadron.html', (fs.statSync(path.join(R, 'dist/Nova-Squadron.html')).size / 1e6).toFixed(1) + ' MB');
