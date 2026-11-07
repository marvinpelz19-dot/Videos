#!/usr/bin/env node
// Paid media generation through FAL for a launch film: landscape plates,
// short live-action style b-roll clips and the instrumental soundtrack.
//
//   node generate.mjs --jobs media.json --out assets/generated [--dry-run]
//        [--resolution 1080p|2k|4k] [--only id1,id2] [--resubmit-failed]
//
// --resolution matches the film's render size: plates are generated at
// 2560x1440 for 1080p and at 3840x2160 for 2K and 4K.
//
// media.json: { "jobs": [
//   { "id": "plate-salt-flat", "kind": "plate", "prompt": "..." },
//   { "id": "clip-desk-night", "kind": "clip", "prompt": "...", "duration": 5 },
//   { "id": "soundtrack", "kind": "music", "prompt": "...", "seconds": 120 } ] }
//
// Every job is recorded in <out>/tasks.json with its FAL request id. Running
// the command again resumes polling and downloading; it never pays twice for
// the same id and input. A failed job is only submitted again with
// --resubmit-failed, which the user must approve first.
import fs from 'node:fs';
import path from 'node:path';
import { Ledger, inputHash, submit, waitFor, download } from './lib/fal.mjs';

const MODELS = {
  plate: 'openai/gpt-image-2.5/flare/text-to-image',
  clip: 'bytedance/seedance-2.5/text-to-video',
  music: 'elevenlabs/music/v2.5',
};
const PLATE_STYLE =
  'Photorealistic landscape photograph, bright natural daylight, soft haze, calm and minimal, pastel palette, generous open sky in the upper third for a title, medium-format camera, fine natural detail. No people, no text, no logos, no watermark.';
const CLIP_STYLE = 'Cinematic, realistic, soft natural light, shallow depth of field, slow gentle camera move. No readable text, no logos, no watermark.';

const PLATE_SIZES = {
  '1080p': { width: 2560, height: 1440 },
  '2k': { width: 3840, height: 2160 },
  '4k': { width: 3840, height: 2160 },
};
const RESOLUTION_ALIASES = { fhd: '1080p', '1440p': '2k', qhd: '2k', '2160p': '4k', uhd: '4k' };

const args = parseArgs(process.argv.slice(2));
if (!args.jobs || !args.out) {
  console.error('Usage: node generate.mjs --jobs media.json --out <dir> [--dry-run] [--resolution 1080p|2k|4k] [--only a,b] [--resubmit-failed]');
  process.exit(2);
}
const resolutionKey = String(args.resolution || '1080p').toLowerCase();
const PLATE_SIZE = PLATE_SIZES[RESOLUTION_ALIASES[resolutionKey] || resolutionKey];
if (!PLATE_SIZE) {
  console.error(`Unknown --resolution ${args.resolution}. Use 1080p (default), 2k or 4k.`);
  process.exit(2);
}
const spec = JSON.parse(fs.readFileSync(path.resolve(args.jobs), 'utf8'));
const out = path.resolve(args.out);
const ledger = new Ledger(path.join(out, 'tasks.json'));
const only = args.only ? String(args.only).split(',') : null;
const jobs = (spec.jobs || []).filter((j) => !only || only.includes(j.id));

// GPT Image 2.5 accepts explicit sizes with both edges multiples of 16, the
// long edge at most 3840 px and 655,360-8,294,400 pixels in total.
function checkPlateSize(id, size) {
  if (typeof size === 'string') return size;
  const { width, height } = size || {};
  const pixels = width * height;
  const ok =
    Number.isInteger(width) && Number.isInteger(height) &&
    width % 16 === 0 && height % 16 === 0 &&
    Math.max(width, height) <= 3840 &&
    Math.max(width, height) / Math.min(width, height) <= 3 &&
    pixels >= 655360 && pixels <= 8294400;
  if (!ok) throw new Error(`${id}: plate size ${width}x${height} is not allowed (multiples of 16, long edge <= 3840, 655,360-8,294,400 pixels)`);
  return { width, height };
}

function buildInput(job) {
  if (job.kind === 'plate') {
    return {
      prompt: job.raw ? job.prompt : `${job.prompt} ${PLATE_STYLE}`,
      image_size: checkPlateSize(job.id, job.size || PLATE_SIZE),
      quality: job.quality || 'high',
      output_format: 'jpeg',
      num_images: 1,
    };
  }
  if (job.kind === 'clip') {
    return {
      prompt: job.raw ? job.prompt : `${job.prompt} ${CLIP_STYLE}`,
      aspect_ratio: job.aspect || '16:9',
      resolution: job.resolution || '1080p',
      duration: String(job.duration || 5),
      generate_audio: false,
    };
  }
  if (job.kind === 'music') {
    return {
      prompt: job.prompt,
      music_length_ms: Math.round((job.seconds || 120) * 1000),
      force_instrumental: job.instrumental !== false,
      output_format: 'mp3_48000_192',
    };
  }
  throw new Error(`unknown kind ${job.kind} (plate | clip | music)`);
}

function outputUrl(kind, res) {
  if (kind === 'plate') return res.images && res.images[0] && res.images[0].url;
  if (kind === 'clip') return res.video && res.video.url;
  if (kind === 'music') return (res.audio && res.audio.url) || (res.audio_file && res.audio_file.url);
  return null;
}
const EXT = { plate: 'jpg', clip: 'mp4', music: 'mp3' };

// Build and validate every input before anything is submitted, so one bad
// job can never leave another paid request running without a ledger entry.
let planned;
try {
  planned = jobs.map((job) => ({ job, model: job.model || MODELS[job.kind], input: buildInput(job) }));
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

console.log(`${jobs.length} job(s): ${jobs.map((j) => `${j.id} (${j.kind})`).join(', ')}`);
if (args['dry-run']) {
  for (const { job, model, input } of planned) console.log(JSON.stringify({ id: job.id, model, input }));
  process.exit(0);
}

if (!process.env.FAL_KEY) {
  console.error('FAL_KEY is not set. Export FAL_KEY=... to generate media, or skip generation and use your own images, clips and music.');
  process.exit(2);
}

const results = [];
await Promise.all(
  planned.map(async ({ job, model, input }) => {
    const hash = inputHash(model, input);
    const file = path.join(out, `${job.id}.${EXT[job.kind]}`);
    let rec = ledger.get(job.id);
    if (rec && rec.hash === hash && rec.status === 'downloaded' && fs.existsSync(file)) {
      results.push({ id: job.id, file, skipped: true });
      return;
    }
    if (rec && rec.hash !== hash) {
      console.log(`${job.id}: prompt or settings changed; this is a new paid job.`);
      rec = null;
    }
    if (rec && rec.status === 'failed' && !args['resubmit-failed']) {
      console.log(`${job.id}: previous attempt failed (${rec.error}). Not resubmitting without --resubmit-failed.`);
      results.push({ id: job.id, failed: true });
      return;
    }
    if (!rec || rec.status === 'failed') {
      const sub = await submit(model, input);
      ledger.set(job.id, { model, hash, kind: job.kind, ...sub, status: 'submitted', submittedAt: new Date().toISOString() });
      console.log(`${job.id}: submitted ${sub.requestId}`);
      rec = ledger.get(job.id);
    } else {
      console.log(`${job.id}: resuming ${rec.requestId}`);
    }
    try {
      const res = await waitFor(rec);
      const url = outputUrl(job.kind, res);
      if (!url) throw new Error(`no output url in response: ${JSON.stringify(res).slice(0, 200)}`);
      const bytes = await download(url, file);
      ledger.set(job.id, { status: 'downloaded', url, file, bytes });
      console.log(`${job.id}: ${file} (${(bytes / 1e6).toFixed(1)} MB)`);
      results.push({ id: job.id, file });
    } catch (error) {
      if (error.terminal) ledger.set(job.id, { status: 'failed', error: String(error.message).slice(0, 300) });
      console.error(`${job.id}: ${error.message}`);
      results.push({ id: job.id, failed: true });
    }
  })
);
console.log(JSON.stringify(results, null, 1));
if (results.some((r) => r.failed)) process.exit(1);

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
