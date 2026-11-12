// Baut den Comic als eigene Leseseite (comic/page.html) aus src/data.js
import fs from 'node:fs';
import { COMICS, MISSIONS } from './src/data.js';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let n = 0;
const panel = (p) => `<figure class="panel"><img src="./assets/${p.img}.jpg" alt="" loading="${n++ < 2 ? 'eager' : 'lazy'}" width="930" height="620"><div class="txt"><figcaption class="cap">${esc(p.cap)}</figcaption>${p.fx ? `<span class="fx">${esc(p.fx)}</span>` : ''}${p.lines.map(([w, t], i) => `<p class="bub b${i % 2}"><b>${esc(w)}</b>${esc(t)}</p>`).join('')}</div></figure>`;
const chapter = (t) => `<h2 class="chap">${esc(t)}</h2>`;
let out = chapter(COMICS.intro.title) + COMICS.intro.pre.map(panel).join('\n');
MISSIONS.forEach((m, i) => {
  const c = COMICS[m.id]; if (!c) return;
  out += '\n' + chapter(c.title) + c.pre.map(panel).join('\n');
  out += `\n<aside class="mission"><span class="burst">Einsatz ${i + 1}</span><h3>${esc(m.name)}</h3><p class="aim"><i>Dein Ziel</i> ${esc(m.aim)}</p><p>${esc(m.why || '')}</p><p class="go">Einsatz ${i + 1} abschließen, dann geht der Comic weiter ↓</p></aside>\n`;
  out += (c.post || []).map(panel).join('\n');
});
out += '<p class="end">Ende</p>';
const html = `<title>Nova Squadron Comic</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@700&display=swap">
<style>
:root { --bg: #0b0d14; --dot: rgba(255,255,255,.07); --fg: #f4ead2; --dim: #9aa0b4; --paper: #f4ead2; --ink: #14131a; --yellow: #ffd84a; --red: #c8281e; --shadow: #000; }
@media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) { --bg: #e9e2d0; --dot: rgba(20,19,26,.09); --fg: #14131a; --dim: #5d5a52; --shadow: rgba(20,19,26,.55); } }
:root[data-theme="light"] { --bg: #e9e2d0; --dot: rgba(20,19,26,.09); --fg: #14131a; --dim: #5d5a52; --shadow: rgba(20,19,26,.55); }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #0b0d14; --dot: rgba(255,255,255,.07); --fg: #f4ead2; --dim: #9aa0b4; --shadow: #000; } }
:root[data-theme="dark"] { --bg: #0b0d14; --dot: rgba(255,255,255,.07); --fg: #f4ead2; --dim: #9aa0b4; --shadow: #000; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg) radial-gradient(var(--dot) 1.2px, transparent 1.6px) 0 0 / 14px 14px; color: var(--fg); font-family: "Comic Neue", "Comic Sans MS", "Trebuchet MS", sans-serif; font-weight: 700; }
main { max-width: 1180px; margin: 0 auto; padding: 20px 16px 80px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 26px; overflow-x: clip; } .panel > * { min-width: 0; }
h1 { font-family: "Bangers", Impact, sans-serif; font-weight: 400; font-size: clamp(34px, 7vw, 72px); letter-spacing: .03em; margin: 10px 0 0; color: var(--yellow); text-shadow: 3px 3px 0 var(--red), 6px 6px 0 var(--shadow); transform: rotate(-1.5deg); line-height: 1; }
.sub { margin: 0; color: var(--dim); font-size: 16px; }
.chap { font-family: "Bangers", Impact, sans-serif; font-weight: 400; font-size: clamp(24px, 4vw, 40px); letter-spacing: .04em; margin: 26px 0 -8px; color: var(--yellow); text-shadow: 2px 2px 0 var(--red), 4px 4px 0 var(--shadow); text-wrap: balance; }
.panel { margin: 0; display: grid; grid-template-columns: 68% 32%; background: var(--paper); color: var(--ink); border: 4px solid var(--ink); box-shadow: 8px 8px 0 var(--shadow); }
.panel:nth-of-type(odd) { transform: rotate(-.3deg); } .panel:nth-of-type(even) { transform: rotate(.3deg); }
.panel img { display: block; width: 100%; height: 100%; aspect-ratio: 3 / 2; object-fit: cover; border-right: 4px solid var(--ink); }
.txt { display: flex; flex-direction: column; gap: 8px; padding-bottom: 10px; min-width: 0; }
.cap { background: var(--yellow); border-bottom: 3px solid var(--ink); padding: 8px 12px 7px; font-size: clamp(13px, 1.5vw, 16px); line-height: 1.25; text-transform: uppercase; }
.fx { align-self: center; font-family: "Bangers", Impact, sans-serif; font-weight: 400; font-size: clamp(26px, 3.6vw, 44px); color: var(--yellow); -webkit-text-stroke: 1.5px var(--ink); text-shadow: 3px 3px 0 var(--red); transform: rotate(-4deg); }
.bub { margin: 0 10px; max-width: 94%; background: #fff; border: 3px solid var(--ink); border-radius: 18px; padding: 6px 12px 8px; font-size: clamp(14px, 1.55vw, 17px); line-height: 1.25; box-shadow: 3px 3px 0 rgba(0,0,0,.5); }
.bub.b0 { align-self: flex-start; border-bottom-left-radius: 2px; } .bub.b1 { align-self: flex-end; border-bottom-right-radius: 2px; }
.bub b { display: block; font-family: "Bangers", Impact, sans-serif; font-weight: 400; letter-spacing: .05em; color: var(--red); }
.mission { position: relative; margin: 6px auto; width: min(100%, 760px); background: var(--ink) ; color: #f4ead2; border: 4px solid var(--yellow); box-shadow: 8px 8px 0 var(--shadow); padding: 54px 22px 18px; text-align: center; }
.mission .burst { position: absolute; left: 16px; top: -14px; transform: rotate(-5deg); font-family: "Bangers", Impact, sans-serif; font-size: 30px; letter-spacing: .04em; color: #fff; background: var(--red); border: 3px solid #f4ead2; padding: 4px 16px; }
.mission h3 { font-family: "Bangers", Impact, sans-serif; font-weight: 400; font-size: clamp(26px, 4.4vw, 42px); letter-spacing: .04em; margin: 0 0 8px; color: var(--yellow); }
.mission p { margin: 6px 0; font-size: 16px; line-height: 1.35; text-wrap: pretty; } .mission i { font-style: normal; font-family: "Bangers", Impact, sans-serif; letter-spacing: .06em; color: var(--yellow); margin-right: 6px; }
.mission .go { margin-top: 14px; color: var(--yellow); font-size: 17px; }
.end { text-align: center; font-family: "Bangers", Impact, sans-serif; font-size: 44px; color: var(--yellow); text-shadow: 3px 3px 0 var(--red); margin: 20px 0 0; }
@media (max-width: 760px) { .panel { grid-template-columns: 1fr; transform: none !important; } .panel img { height: auto; border-right: 0; border-bottom: 4px solid var(--ink); } main { gap: 20px; } }
</style>
<main>
<h1>Nova Squadron</h1>
<p class="sub">Der Krieg um Essen · der ganze Comic zum Durchscrollen, mit den Einsätzen dazwischen</p>
${out}
</main>
`;
fs.writeFileSync('comic/page.html', html);
const imgs = [...new Set(html.match(/assets\/[a-z0-9_]+\.jpg/g))];
fs.writeFileSync('comic/files.json', JSON.stringify(Object.fromEntries(imgs.map((f) => [f, { from: f }]))));
console.log('seiten', n, 'bilder', imgs.length);
