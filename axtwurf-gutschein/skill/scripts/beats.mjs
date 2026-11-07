#!/usr/bin/env node
// Estimates tempo, beat times and downbeats of a music track so scene cuts
// can land on the beat (build.mjs --beats beats.json).
//
//   node beats.mjs <track.mp3|wav> [--out beats.json] [--bpm 125] [--min 80 --max 170]
//
// FFmpeg decodes the audio; the analysis is a spectral-flux onset envelope,
// an autocorrelation tempo estimate with a prior around the hint, a comb
// phase search, and per-beat refinement to nearby onset peaks.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const file = process.argv[2];
const args = parseArgs(process.argv.slice(3));
if (!file || file.startsWith('--')) {
  console.error('Usage: node beats.mjs <track> [--out beats.json] [--bpm 125] [--min 80] [--max 170]');
  process.exit(2);
}
const SR = 22050;
const N = 1024;
const HOP = 256;
const dec = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
if (dec.status !== 0) {
  console.error(dec.stderr.toString());
  process.exit(1);
}
const pcm = new Float32Array(dec.stdout.buffer, dec.stdout.byteOffset, Math.floor(dec.stdout.byteLength / 4));
const duration = pcm.length / SR;

// ---- onset envelope (log-magnitude spectral flux) ----
const win = new Float32Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
const frames = Math.max(0, Math.floor((pcm.length - N) / HOP));
const re = new Float64Array(N);
const im = new Float64Array(N);
let prev = new Float64Array(N / 2);
const onset = new Float64Array(frames);
const low = new Float64Array(frames);
for (let f = 0; f < frames; f += 1) {
  const o = f * HOP;
  for (let i = 0; i < N; i += 1) {
    re[i] = pcm[o + i] * win[i];
    im[i] = 0;
  }
  fft(re, im);
  const mag = new Float64Array(N / 2);
  let flux = 0;
  let lowFlux = 0;
  for (let k = 1; k < N / 2; k += 1) {
    mag[k] = Math.log1p(100 * Math.hypot(re[k], im[k]));
    const d = mag[k] - prev[k];
    if (d > 0) {
      flux += d;
      if (k < 16) lowFlux += d;
    }
  }
  onset[f] = flux;
  low[f] = lowFlux;
  prev = mag;
}
normalizeEnvelope(onset);
normalizeEnvelope(low);
const fps = SR / HOP;

// ---- tempo: harmonic-sum autocorrelation on a fine lag grid ----
const hint = Number(args.bpm || 120);
const minBpm = Number(args.min || 80);
const maxBpm = Number(args.max || 170);
const minLag = (60 * fps) / maxBpm;
const maxLag = (60 * fps) / minBpm;
const acfLen = Math.ceil(maxLag * 4) + 2;
const acf = new Float64Array(acfLen);
for (let l = 0; l < acfLen; l += 1) {
  let s = 0;
  for (let i = l; i < onset.length; i += 1) s += onset[i] * onset[i - l];
  acf[l] = s / (onset.length - l);
}
let period = minLag;
let bestScore = -Infinity;
for (let P = minLag; P <= maxLag; P += 0.01) {
  let s = 0;
  const weights = [1, 0.85, 0.7, 0.6];
  for (let k = 1; k <= 4; k += 1) s += weights[k - 1] * interp(acf, k * P);
  const bpmP = (60 * fps) / P;
  const prior = Math.exp(-0.5 * (Math.log2(bpmP / hint) / 0.45) ** 2);
  const score = s * (0.4 + prior);
  if (score > bestScore) {
    bestScore = score;
    period = P;
  }
}

// ---- beats: dynamic programming tracker (onset strength vs. tempo consistency) ----
const tight = Number(args.tightness || 120);
const score = new Float64Array(onset.length);
const back = new Int32Array(onset.length).fill(-1);
for (let t = 0; t < onset.length; t += 1) {
  let best = 0;
  let arg = -1;
  const lo = Math.max(0, Math.floor(t - 2 * period));
  const hi = Math.floor(t - period / 2);
  for (let tau = lo; tau <= hi; tau += 1) {
    const d = Math.log((t - tau) / period);
    const v = score[tau] - tight * d * d;
    if (arg < 0 || v > best) {
      best = v;
      arg = tau;
    }
  }
  score[t] = onset[t] + (arg >= 0 ? Math.max(0, best) : 0);
  back[t] = arg >= 0 && best > 0 ? arg : -1;
}
// start backtracking from the strongest candidate within the last period
let endT = onset.length - 1;
let endV = -Infinity;
for (let t = Math.max(0, Math.floor(onset.length - period)); t < onset.length; t += 1) {
  if (score[t] > endV) {
    endV = score[t];
    endT = t;
  }
}
const frameBeats = [];
for (let t = endT; t >= 0; t = back[t]) {
  frameBeats.push(t);
  if (back[t] < 0) break;
}
frameBeats.reverse();
// trim weak leading beats (silence / pickup) below 10% of the median onset
const vals = frameBeats.map((f) => onset[f]).sort((a, b) => a - b);
const med = vals[Math.floor(vals.length / 2)] || 0;
while (frameBeats.length > 8 && onset[frameBeats[0]] < med * 0.1) frameBeats.shift();
const beats = frameBeats.map((f) => Number(((f * HOP + N / 2) / SR).toFixed(3)));
const ibis = beats.slice(1).map((b, i) => b - beats[i]).sort((a, b) => a - b);
const medIbi = ibis[Math.floor(ibis.length / 2)] || period / fps;
const bpm = 60 / medIbi;
// ---- downbeats: the beat position (mod 4) with most low-band energy ----
const bars = [0, 0, 0, 0];
beats.forEach((b, i) => {
  const f = Math.round((b * SR - N / 2) / HOP);
  bars[i % 4] += low[Math.max(0, Math.min(low.length - 1, f))] || 0;
});
const offset = bars.indexOf(Math.max(...bars));
const downbeats = beats.filter((_, i) => i % 4 === offset);
// ---- loudness sections (1 s RMS) help place breaks and drops ----
const rms = [];
for (let s = 0; s < Math.floor(duration); s += 1) {
  let acc = 0;
  for (let i = s * SR; i < (s + 1) * SR && i < pcm.length; i += 1) acc += pcm[i] * pcm[i];
  rms.push(Number((10 * Math.log10(acc / SR + 1e-12)).toFixed(1)));
}
const result = {
  file: path.resolve(file),
  duration: Number(duration.toFixed(3)),
  bpm: Number(bpm.toFixed(2)),
  beatPeriod: Number((60 / bpm).toFixed(4)),
  firstBeat: beats[0],
  beats,
  downbeats,
  rmsDbPerSecond: rms,
};
const out = args.out ? path.resolve(args.out) : null;
if (out) fs.writeFileSync(out, JSON.stringify(result, null, 1));
console.log(JSON.stringify({ out, duration: result.duration, bpm: result.bpm, firstBeat: result.firstBeat, beats: beats.length, firstDownbeat: downbeats[0] }, null, 1));

function interp(arr, t) {
  const i = Math.floor(t);
  const f = t - i;
  return (arr[i] || 0) * (1 - f) + (arr[i + 1] || 0) * f;
}
function normalizeEnvelope(env) {
  // subtract a moving average and half-wave rectify
  const w = 16;
  const out = new Float64Array(env.length);
  let acc = 0;
  for (let i = 0; i < env.length; i += 1) {
    acc += env[i];
    if (i >= w) acc -= env[i - w];
    const mean = acc / Math.min(i + 1, w);
    out[i] = Math.max(0, env[i] - mean);
  }
  let max = 0;
  for (const v of out) max = Math.max(max, v);
  for (let i = 0; i < env.length; i += 1) env[i] = max > 0 ? out[i] / max : 0;
}
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let j = 0; j < len / 2; j += 1) {
        const ar = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci;
        const ai = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr;
        re[i + j + len / 2] = re[i + j] - ar;
        im[i + j + len / 2] = im[i + j] - ai;
        re[i + j] += ar;
        im[i + j] += ai;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
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
