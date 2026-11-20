#!/usr/bin/env node
// Builds a previewable film folder from a storyboard JSON file.
//
//   node build.mjs --storyboard storyboard.json --out film [--beats beats.json]
//
// Local media referenced anywhere in the storyboard (relative to the
// storyboard file) is copied into <out>/assets and rewritten. Only the Lucide
// icons the storyboard uses are bundled. With --beats, scene boundaries are
// snapped to the nearest beat of the analysed soundtrack.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ENGINE = path.resolve(HERE, '..', 'references', 'engine');
const MEDIA = /\.(png|jpe?g|webp|gif|svg|avif|mp4|webm|mov|m4v)$/i;
const KNOWN = ['sentence', 'feature', 'slot', 'dock', 'ui', 'plate', 'phone', 'chat', 'burst', 'montage', 'pins', 'split', 'endcard', 'html'];

const args = parseArgs(process.argv.slice(2));
if (!args.storyboard || !args.out) {
  console.error('Usage: node build.mjs --storyboard <storyboard.json> --out <film-dir> [--beats beats.json]');
  process.exit(2);
}
const sbPath = path.resolve(args.storyboard);
const sbDir = path.dirname(sbPath);
const out = path.resolve(args.out);
const sb = JSON.parse(fs.readFileSync(sbPath, 'utf8'));
const problems = [];
const warnings = [];

if (!Array.isArray(sb.scenes) || sb.scenes.length === 0) problems.push('storyboard.scenes must be a non-empty array');
sb.meta = { fps: 30, bpm: 125, ...(sb.meta || {}) };
const beat = 60 / sb.meta.bpm;

fs.mkdirSync(path.join(out, 'assets'), { recursive: true });
fs.mkdirSync(path.join(out, 'fonts'), { recursive: true });

// ---- copy media and rewrite references ----
const copied = new Map();
function copyAsset(ref) {
  if (/^(https?:|data:)/.test(ref)) return ref;
  const abs = path.isAbsolute(ref) ? ref : path.resolve(sbDir, ref);
  if (!fs.existsSync(abs)) {
    problems.push(`missing asset: ${ref}`);
    return ref;
  }
  if (copied.has(abs)) return copied.get(abs);
  const buf = fs.readFileSync(abs);
  const digest = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);
  const name = `${path.basename(abs, path.extname(abs)).replace(/[^a-z0-9._-]+/gi, '-').slice(0, 48)}-${digest}${path.extname(abs).toLowerCase()}`;
  fs.writeFileSync(path.join(out, 'assets', name), buf);
  const rel = `assets/${name}`;
  copied.set(abs, rel);
  return rel;
}
const icons = new Set(['arrow-right']);
function walk(node, key) {
  if (Array.isArray(node)) return node.map((v) => walk(v, key));
  if (node && typeof node === 'object') {
    const next = {};
    for (const [k, v] of Object.entries(node)) next[k] = walk(v, k);
    return next;
  }
  if (typeof node !== 'string') return node;
  if (key === 'icon') icons.add(node);
  if (node.startsWith('icon:')) icons.add(node.slice(5));
  for (const m of node.matchAll(/@icon:([a-z0-9-]+)/g)) icons.add(m[1]);
  let value = node.replace(/@img:(\S+)/g, (all, ref) => (MEDIA.test(ref) ? `@img:${copyAsset(ref)}` : all));
  if (key !== 'text' && key !== 'html' && MEDIA.test(value) && !value.includes(' ')) value = copyAsset(value);
  return value;
}
const built = walk(sb);

// ---- scene checks and timing ----
let t = 0;
const rows = [];
built.scenes.forEach((s, i) => {
  if (!KNOWN.includes(s.type)) problems.push(`scene ${i}: unknown type "${s.type}"`);
  if (s.dur === undefined && s.beats === undefined) warnings.push(`scene ${i} (${s.type}) has no beats/dur; engine default 2s`);
  const dur = s.dur ?? (s.beats ? s.beats * beat : 2);
  if (dur < 0.4) warnings.push(`scene ${i} is very short (${dur.toFixed(2)}s)`);
  if (s.type === 'sentence' || s.type === 'feature') {
    const steps = s.steps || [];
    for (const st of steps) {
      const at = typeof st === 'string' ? 0 : st.at || 0;
      if (at > dur) warnings.push(`scene ${i}: step at ${at}s starts after the scene ends (${dur.toFixed(2)}s)`);
      const text = typeof st === 'string' ? st : st.text || '';
      const size = (typeof st === 'object' && st.size) || (s.defaults && s.defaults.size) || 64;
      const longest = Math.max(...text.split('|').map((l) => l.replace(/@\S+/g, 'MM').replace(/[[\]{}*]/g, '').length));
      if (longest * size * 0.55 > 1700) warnings.push(`scene ${i}: "${text.slice(0, 40)}" may overflow the frame at ${size}px`);
    }
  }
  if (s.type === 'ui' && !s.src) problems.push(`scene ${i}: ui needs src`);
  if (s.type === 'plate' && !s.src) problems.push(`scene ${i}: plate needs src`);
  rows.push({ i, type: s.type, id: s.id || '', start: t, dur });
  t += dur;
});

// ---- optional beat snapping ----
if (args.beats) {
  const beats = JSON.parse(fs.readFileSync(path.resolve(args.beats), 'utf8'));
  const grid = beats.beats || [];
  if (grid.length > 4) {
    let acc = 0;
    let snappedStart = 0;
    for (const s of built.scenes) {
      const d = s.dur ?? (s.beats ? s.beats * beat : 2);
      acc += d;
      let best = acc;
      let bestErr = Infinity;
      for (const b of grid) {
        const err = Math.abs(b - acc);
        if (err < bestErr) {
          bestErr = err;
          best = b;
        }
      }
      const nd = Math.max(0.4, best - snappedStart);
      s.dur = Number(nd.toFixed(4));
      delete s.beats;
      snappedStart += nd;
    }
    console.log(`Snapped ${built.scenes.length} scene boundaries to ${grid.length} beats.`);
  }
}

// ---- engine files ----
for (const f of ['film.js', 'film.css']) fs.copyFileSync(path.join(ENGINE, f), path.join(out, f));
fs.copyFileSync(path.join(ENGINE, 'fonts', 'InterVariable-latin.woff2'), path.join(out, 'fonts', 'InterVariable-latin.woff2'));
const lucide = JSON.parse(fs.readFileSync(path.join(ENGINE, 'lucide-nodes.json'), 'utf8'));
const subset = {};
for (const name of icons) {
  if (lucide[name]) subset[name] = lucide[name];
  else warnings.push(`unknown Lucide icon "${name}" (see references/engine/lucide-nodes.json)`);
}
fs.writeFileSync(path.join(out, 'icons.js'), `window.FILM_ICONS=${JSON.stringify(subset)};\n`);
fs.writeFileSync(path.join(out, 'storyboard.js'), `window.STORYBOARD=${JSON.stringify(built, null, 1)};\n`);
fs.writeFileSync(
  path.join(out, 'index.html'),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml((built.meta && built.meta.title) || 'Launch film')}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="film.css">
</head>
<body>
<div id="viewport"><div id="stage"></div></div>
<div id="player"></div>
<script src="icons.js"></script>
<script src="storyboard.js"></script>
<script src="film.js"></script>
</body>
</html>
`
);

const total = built.scenes.reduce((a, s) => a + (s.dur ?? (s.beats ? s.beats * beat : 2)), 0);
console.log(`Built ${out}`);
console.log(`Scenes: ${built.scenes.length}  Duration: ${total.toFixed(2)}s  Assets copied: ${copied.size}  Icons: ${Object.keys(subset).length}`);
for (const r of rows) console.log(`  #${String(r.i).padStart(2, '0')} ${r.start.toFixed(2).padStart(7)}s  ${r.dur.toFixed(2).padStart(5)}s  ${r.type}${r.id ? ` · ${r.id}` : ''}`);
for (const w of warnings) console.log(`WARN ${w}`);
if (problems.length) {
  for (const p of problems) console.error(`ERROR ${p}`);
  process.exit(1);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
function parseArgs(list) {
  const o = {};
  for (let i = 0; i < list.length; i += 1) {
    if (!list[i].startsWith('--')) continue;
    const k = list[i].slice(2);
    const v = list[i + 1];
    if (v === undefined || v.startsWith('--')) o[k] = true;
    else {
      o[k] = v;
      i += 1;
    }
  }
  return o;
}
