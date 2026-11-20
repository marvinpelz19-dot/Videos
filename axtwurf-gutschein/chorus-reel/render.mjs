// Renders index.html frame by frame (deterministic window.seek(t)) and muxes the soundtrack.
//   node render.mjs [--out renders/chorus-reel.mp4] [--snap 1.5,5,8]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(path.join(process.env.FILM_NODE_MODULES || '/opt/node22/lib/node_modules', 'noop.js'));
const { chromium } = require('playwright');
const HERE = path.dirname(new URL(import.meta.url).pathname);
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, l) => (v.startsWith('--') ? [...a, [v.slice(2), l[i + 1]]] : a), []));
const out = path.resolve(HERE, args.out || 'renders/chorus-reel.mp4');

const browser = await chromium.launch({ args: ['--hide-scrollbars', '--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto('file://' + path.join(HERE, 'index.html'));
await page.evaluate(() => window.ready);
const film = await page.evaluate(() => window.FILM);

if (args.snap) {
  fs.mkdirSync(path.join(HERE, 'snapshots'), { recursive: true });
  for (const t of args.snap.split(',').map(Number)) {
    await page.evaluate((x) => window.seek(x), t);
    await page.screenshot({ path: path.join(HERE, 'snapshots', `t${t.toFixed(3)}.png`) });
  }
  console.log(JSON.stringify(film, null, 1));
  await browser.close();
  process.exit(0);
}

fs.mkdirSync(path.dirname(out), { recursive: true });
const frames = Math.round(film.END * film.FPS);
const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(film.FPS), '-i', '-',
  '-i', path.join(HERE, 'assets', 'soundtrack.mp3'),
  '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium',
  '-c:a', 'aac', '-b:a', '256k', '-af', `afade=t=out:st=${(film.END - 1).toFixed(2)}:d=1`, '-t', String(film.END), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
for (let i = 0; i < frames; i += 1) {
  await page.evaluate((x) => window.seek(x), i / film.FPS);
  const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % 60 === 0) process.stdout.write(`\r${i}/${frames}`);
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await browser.close();
console.log(`\nWrote ${out}`);
