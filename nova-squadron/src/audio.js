// Klang komplett synthetisch (WebAudio): Waffen, Explosionen, Oberfläche und eine generative Musikspur.
import { SAMPLES } from './samples.js';

let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null, reverb = null;
let musicOn = false, musicTimer = 0, step = 0, intensity = 0, nextT = 0;
export const audioState = { sound: true, music: true };

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC();
  master = ctx.createDynamicsCompressor(); master.threshold.value = -14; master.ratio.value = 6; master.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.5; sfxBus.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = 0.5; musicBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // Hall: künstliche Impulsantwort (2,4 s abklingendes Rauschen)
  const ir = ctx.createBuffer(2, ctx.sampleRate * 2.4, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const x = ir.getChannelData(c); for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / x.length, 3.2); }
  reverb = ctx.createConvolver(); reverb.buffer = ir; const rg = ctx.createGain(); rg.gain.value = 0.5; reverb.connect(rg).connect(sfxBus);
  buildBank(); applyAudioState();
  // echte Aufnahmen dekodieren (asynchron; bis dahin spielt die Synthese allein)
  for (const [k, b64] of Object.entries(SAMPLES)) { try { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); ctx.decodeAudioData(u.buffer, (buf) => { rec[k] = [buf]; }, () => {}); } catch { /* ohne Aufnahme weiter */ } }
  // Verzerrer für den Explosionskörper
  drive = ctx.createWaveShaper(); const cv = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; cv[i] = Math.tanh(x * 3.2); } drive.curve = cv; drive.connect(sfxBus); drive.connect(reverb);
}
const rec = {}; let drive = null, eng = null;
export function applyAudioState() {
  if (!ctx) return;
  sfxBus.gain.value = audioState.sound ? 0.5 : 0; musicBus.gain.value = audioState.music ? 0.5 : 0;
}
function env(g, t, a, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
function tone(type, f0, f1, dur, vol, bus = sfxBus, when = 0, attack = 0.005) {
  if (!ctx) return; const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  env(g, t, attack, vol, dur); o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, vol, f0, f1, q = 0.8, type = 'lowpass') {
  if (!ctx) return; const t = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; s.loop = true; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  env(g, t, 0.004, vol, dur); s.connect(f).connect(g).connect(sfxBus); s.start(t, Math.random()); s.stop(t + dur + 0.05);
}
// Abgemischte Effekte: jsfxr-Schichten (sfxr-Presets „laserShoot“, „explosion“, „hitHurt“ als Ausgangspunkt, wie in
// vielen Spiele-Repos üblich) plus eigene Synthese (Druckwelle, Raketenschub, Metallklang) und ein Raumhall.
let bank = null;
function buildBank() {
  const J = globalThis.jsfxr?.sfxr; if (!J || !ctx) return;
  const mk = (preset, over) => { try { const p = J.generate(preset); Object.assign(p, over, { sound_vol: 0.3, sample_rate: 44100, sample_size: 16 }); return J.toWebAudio(p, ctx).buffer; } catch { return null; } };
  const base = { p_vib_strength: 0, p_vib_speed: 0, p_arp_mod: 0, p_arp_speed: 0, p_repeat_speed: 0, p_freq_dramp: 0, p_duty_ramp: 0, p_lpf_ramp: 0, p_hpf_ramp: 0, p_env_attack: 0 };
  bank = {
    // Laser: Sägezahn mit schnellem Abwärts-Sweep und Phaser, drei Tonhöhen gegen Maschinengewehr-Monotonie
    laser: [0.6, 0.66, 0.55].map((f) => mk('laserShoot', { ...base, wave_type: 1, p_base_freq: f, p_freq_limit: 0.12, p_freq_ramp: -0.3, p_env_sustain: 0.08, p_env_punch: 0.35, p_env_decay: 0.2, p_pha_offset: 0.18, p_pha_ramp: -0.22, p_hpf_freq: 0.12, p_lpf_freq: 1, p_lpf_resonance: 0, p_duty: 0.5 })),
    enemy: [0.42, 0.47].map((f) => mk('laserShoot', { ...base, wave_type: 0, p_base_freq: f, p_freq_limit: 0.1, p_freq_ramp: -0.22, p_env_sustain: 0.06, p_env_punch: 0.2, p_env_decay: 0.16, p_duty: 0.3, p_pha_offset: -0.1, p_pha_ramp: 0.1, p_hpf_freq: 0.2, p_lpf_freq: 0.8, p_lpf_resonance: 0.3 })),
    spread: [mk('laserShoot', { ...base, wave_type: 3, p_base_freq: 0.5, p_freq_limit: 0, p_freq_ramp: -0.18, p_env_sustain: 0.1, p_env_punch: 0.5, p_env_decay: 0.3, p_pha_offset: 0.3, p_pha_ramp: -0.2, p_hpf_freq: 0.25, p_lpf_freq: 1, p_lpf_resonance: 0, p_duty: 0 })],
    boom: [0.1, 0.14, 0.08, 0.18].map((f, i) => mk('explosion', { ...base, wave_type: 3, p_base_freq: f, p_freq_limit: 0, p_freq_ramp: -0.04 - i * 0.02, p_env_sustain: 0.22 + i * 0.04, p_env_punch: 0.7, p_env_decay: 0.62, p_pha_offset: i % 2 ? 0.2 : 0, p_pha_ramp: -0.05, p_hpf_freq: 0, p_lpf_freq: 0.85, p_lpf_resonance: 0, p_duty: 0, p_repeat_speed: i === 3 ? 0.55 : 0 })),
    hit: [0.5, 0.62, 0.42].map((f) => mk('hitHurt', { ...base, wave_type: 3, p_base_freq: f, p_freq_limit: 0, p_freq_ramp: -0.45, p_env_sustain: 0.02, p_env_punch: 0.4, p_env_decay: 0.13, p_hpf_freq: 0.3, p_lpf_freq: 1, p_lpf_resonance: 0, p_pha_offset: 0, p_pha_ramp: 0, p_duty: 0 })),
  };
  for (const k in bank) bank[k] = bank[k].filter(Boolean);
}
function play(list, vol = 1, rate = 1, pan = 0, wet = 0.25) {
  if (!ctx || !list || !list.length) return false;
  const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = list[(Math.random() * list.length) | 0]; s.playbackRate.value = rate * (0.94 + Math.random() * 0.12); g.gain.value = vol;
  let out = s.connect(g); if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); out = g.connect(p); }
  out.connect(sfxBus); if (wet && reverb) { const w = ctx.createGain(); w.gain.value = wet; out.connect(w).connect(reverb); }
  s.start(); return true;
}
function ping(f, dur, vol, pan = 0) {   // Metalltreffer: zwei unharmonische Sinustöne
  tone('sine', f, f * 0.98, dur, vol); tone('sine', f * 2.76, f * 2.7, dur * 0.6, vol * 0.5); tone('triangle', f * 5.4, f * 5.2, dur * 0.3, vol * 0.25);
}
let lastShot = 0, lastHit = 0, lastBoom = 0;
export const sfx = {
  laser() { if (!ctx || ctx.currentTime - lastShot < 0.05) return; lastShot = ctx.currentTime; if (!play(bank?.laser, 0.5, 1, 0, 0.12)) tone('sawtooth', 1500, 240, 0.13, 0.22); tone('sine', 320, 90, 0.08, 0.16); },
  spread() { play(bank?.spread, 0.7, 0.9, 0, 0.3); play(bank?.laser, 0.3, 0.6); tone('sine', 150, 50, 0.22, 0.4); },
  missile() {   // Zündung, Schub-Fauchen, tiefes Grollen
    noise(0.09, 0.5, 3000, 900, 0.8); noise(0.9, 0.34, 500, 4200, 1.4, 'bandpass'); noise(1.1, 0.3, 240, 90, 0.7); tone('sawtooth', 95, 48, 0.8, 0.22, sfxBus, 0, 0.03); tone('sine', 620, 1500, 0.5, 0.05, sfxBus, 0.05, 0.1);
  },
  orb() { play(rec.heavy, 0.7, 0.7, 0, 0.4); tone('sine', 190, 42, 0.7, 0.6); tone('sawtooth', 520, 60, 0.5, 0.16); noise(0.5, 0.25, 1200, 200, 2, 'bandpass'); play(bank?.spread, 0.3, 0.45, 0, 0.5); },
  enemyShot(pan = 0) { if (!play(bank?.enemy, 0.16, 1, pan, 0.2)) tone('square', 640, 180, 0.1, 0.05); },
  hit() { if (!ctx || ctx.currentTime - lastHit < 0.035) return; lastHit = ctx.currentTime; play(bank?.hit, 0.3, 1.1, 0, 0.1); ping(1900 + Math.random() * 900, 0.09, 0.05); },
  shieldHit() { play(bank?.hit, 0.6, 0.6, 0, 0.3); noise(0.25, 0.35, 5200, 700, 3, 'bandpass'); tone('sine', 210, 60, 0.3, 0.4); tone('sawtooth', 2400, 300, 0.2, 0.06); },
  // Explosion in Schichten (Knall, Körper, Sub, Feuerball, Trümmer, Hall), nach gängigen Sounddesign-Rezepten:
  // heller Transient über 1 kHz, Aufnahme tiefer abgespielt für Größe, trockener Sub mit Tonhöhenfall, dunkler langer Nachhall.
  boom(size = 1, pan = 0, near = 1) {
    if (!ctx) return; if (ctx.currentTime - lastBoom < 0.05) return; lastBoom = ctx.currentTime; const v = Math.min(1, 0.3 + near * 0.7), t = ctx.currentTime, big = Math.sqrt(size);
    noise(0.012, 0.9 * v, 6000, 2500, 0.7, 'highpass'); noise(0.05, 0.5 * v, 3200, 900, 1.2, 'bandpass');            // Knall
    if (rec.crunch) {                                                                                                   // Körper: Aufnahme, je größer desto tiefer
      const s1 = ctx.createBufferSource(), g1 = ctx.createGain(), lp = ctx.createBiquadFilter(); s1.buffer = rec.crunch[0]; s1.playbackRate.value = (1.15 / big) * (0.9 + Math.random() * 0.22);
      lp.type = 'lowpass'; lp.frequency.value = 1400 + near * 9000; g1.gain.value = Math.min(1.2, 0.6 + size * 0.22) * v; let o = s1.connect(lp).connect(g1);
      if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; o = o.connect(p); } o.connect(drive); s1.start(t, Math.random() * 0.02);
      if (size > 1.3) { const s2 = ctx.createBufferSource(), g2 = ctx.createGain(); s2.buffer = rec.crunch[0]; s2.playbackRate.value = 0.42 / big; g2.gain.value = 0.55 * v; s2.connect(g2).connect(sfxBus); s2.start(t + 0.03); }   // zweite Lage, zwei Oktaven tiefer
    } else play(bank?.boom, Math.min(1, 0.5 + size * 0.2) * v, 1.25 / big, pan, 0.5);
    tone('sine', 62 / Math.sqrt(big), 24, 0.3 + size * 0.22, 0.95 * v);                                                // Sub, trocken
    noise(0.7 + size * 0.5, 0.42 * v, 140, 55, 1.1, 'bandpass'); noise(1.1 + size * 0.6, 0.2 * v, 700 / big, 50, 0.5); // Feuerball und Grollen
    const n = Math.min(9, 2 + Math.round(size * 2.5));                                                                  // Trümmer: kurze, helle Splitter verstreut
    for (let i = 0; i < n; i++) setTimeout(() => { if (rec.crunch) { const s3 = ctx.createBufferSource(), g3 = ctx.createGain(), hp = ctx.createBiquadFilter(); s3.buffer = rec.crunch[0]; s3.playbackRate.value = 1.8 + Math.random() * 2.4; hp.type = 'highpass'; hp.frequency.value = 1200; g3.gain.value = (0.05 + Math.random() * 0.12) * v; s3.connect(hp).connect(g3).connect(sfxBus); g3.connect(reverb); s3.start(ctx.currentTime, 0.05 + Math.random() * 0.2, 0.09 + Math.random() * 0.12); } else play(bank?.hit, 0.15 * v, 0.5 + Math.random() * 0.5, pan, 0.5); }, 90 + Math.random() * (350 + size * 380));
  },
  // Jeder Gegnertyp stirbt mit eigenem Klang: Grundexplosion plus Signatur
  death(kind, size = 1, pan = 0, near = 1) {
    if (!ctx) return; const v = Math.min(1, 0.3 + near * 0.7), later = (ms, f) => setTimeout(f, ms);
    if (kind === 'rock') { noise(0.5, 0.5 * v, 500, 90, 0.7); noise(0.9, 0.3 * v, 220, 60, 0.6); for (let i = 0; i < 4; i++) later(60 + i * 90, () => noise(0.12, 0.3 * v, 700 + Math.random() * 600, 200, 1.5, 'bandpass')); tone('sine', 70, 30, 0.5, 0.5 * v); return; }   // Bröckeln ohne Feuerknall
    sfx.boom(size, pan, near);
    if (kind === 'drone' || kind === 'target') { ping(520 + Math.random() * 200, 0.3, 0.1 * v); later(70, () => play(bank?.hit, 0.3 * v, 0.7, pan, 0.4)); }                              // Blech reißt
    else if (kind === 'inter') { tone('sawtooth', 2600, 160, 0.28, 0.12 * v); noise(0.2, 0.25 * v, 6000, 900, 2, 'bandpass'); }                                                         // schriller Abriss
    else if (kind === 'kami') { for (let i = 0; i < 4; i++) later(i * 45, () => noise(0.05, 0.55 * v, 3500, 1200, 1, 'bandpass')); tone('square', 900, 90, 0.2, 0.12 * v); }            // Knallkette
    else if (kind === 'bomber') { later(260, () => { tone('sine', 52, 24, 0.9, 0.9 * v); noise(1.1, 0.4 * v, 300, 50, 0.6); play(rec.crunch, 0.6 * v, 0.5, pan, 0.6); }); }             // Bombenlast geht nach
    else if (kind === 'jammer') { for (let i = 0; i < 7; i++) later(i * 50, () => tone('square', 400 + Math.random() * 2400, 200 + Math.random() * 800, 0.06, 0.1 * v)); noise(0.5, 0.2 * v, 5000, 300, 5, 'bandpass'); }   // Elektronik schmort
    else if (kind === 'shielder') { for (const f of [3100, 2300, 1700, 1250, 900]) tone('sine', f, f * 0.5, 0.7, 0.07 * v); noise(0.6, 0.3 * v, 9000, 2500, 0.6, 'highpass'); tone('sawtooth', 500, 50, 0.8, 0.12 * v); }   // Schild zerspringt wie Glas
    else if (kind === 'ace') { tone('sawtooth', 1400, 60, 1.1, 0.2 * v); tone('sawtooth', 1407, 62, 1.1, 0.2 * v); later(350, () => sfx.boom(size * 1.2, pan, near)); }                 // lang gezogener Absturz
    else if (kind === 'turret') { ping(240, 0.6, 0.16 * v); ping(331, 0.5, 0.1 * v); }                                                                                                    // Stahlglocke
    else if (kind === 'gen' || kind === 'buoy') { tone('sawtooth', 420, 36, 1.3, 0.22 * v); tone('sine', 840, 60, 1.1, 0.12 * v); }                                                       // fährt herunter
    else if (kind === 'corvette' || kind === 'hauler' || kind === 'core') { tone('sawtooth', 74, 38, 2.4, 0.3 * v, sfxBus, 0, 0.3); tone('sawtooth', 111, 52, 2.2, 0.16 * v, sfxBus, 0.2, 0.3); for (let i = 1; i <= 4; i++) later(i * 330, () => { tone('sine', 60, 24, 0.8, 0.7 * v); noise(0.9, 0.3 * v, 500, 60, 0.6); }); }   // Rumpf ächzt und rollt aus
  },
  // Überhitzung: Zischen wie Dampf, dazu ein abfallender Warnton
  overheat() { noise(1.3, 0.4, 7000, 2500, 0.8, 'highpass'); noise(0.9, 0.25, 3000, 900, 2, 'bandpass'); tone('square', 1200, 300, 0.5, 0.12); tone('square', 900, 220, 0.5, 0.1, sfxBus, 0.16); },
  cooled() { tone('sine', 700, 1050, 0.12, 0.12); tone('sine', 1050, 1400, 0.14, 0.1, sfxBus, 0.09); },
  heavy(vol = 0.5, rate = 1, pan = 0) { if (!play(rec.heavy, vol, rate, pan, 0.35)) tone('sawtooth', 500 * rate, 70, 0.4, vol * 0.4); },
  // Triebwerk: läuft durch, Tonhöhe und Lautstärke folgen dem Tempo (0 = Bremse, 1 = Reise, 2 = Schub)
  engine(k) {
    if (!ctx) return;
    if (k < 0) { if (eng) { eng.g.gain.setTargetAtTime(0, ctx.currentTime, 0.1); } return; }
    if (!eng) { const o = ctx.createOscillator(), o2 = ctx.createOscillator(), n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), ng = ctx.createGain(); o.type = 'sawtooth'; o2.type = 'triangle'; n.buffer = noiseBuf; n.loop = true; f.type = 'lowpass'; ng.gain.value = 0.5; g.gain.value = 0; o.connect(f); o2.connect(f); n.connect(ng).connect(f); f.connect(g).connect(sfxBus); o.start(); o2.start(); n.start(); eng = { o, o2, f, g }; }
    const tt = ctx.currentTime; eng.o.frequency.setTargetAtTime(38 + k * 26, tt, 0.15); eng.o2.frequency.setTargetAtTime(77 + k * 55, tt, 0.15); eng.f.frequency.setTargetAtTime(160 + k * 520, tt, 0.15); eng.g.gain.setTargetAtTime(0.035 + k * 0.05, tt, 0.15);
  },
  // Erfolgsfanfare: Blechbläser in D-Dur, Pauke, Becken. big = Bosssieg (länger, mit Schlussakkord)
  fanfare(big) {
    if (!ctx) return; duck(big ? 4.5 : 3); const t0 = ctx.currentTime + 0.05, seq = big ? [[62, 0, 0.22], [66, 0.22, 0.22], [69, 0.44, 0.22], [74, 0.66, 0.5], [71, 1.16, 0.22], [74, 1.38, 0.22], [78, 1.6, 1.6]] : [[62, 0, 0.16], [66, 0.16, 0.16], [69, 0.32, 0.16], [74, 0.48, 1.1]];
    const brass = (m, t, d, v) => { for (const [det, oc] of [[-7, 0], [6, 0], [0, -12], [3, 12]]) { const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = 440 * Math.pow(2, (m + oc - 69) / 12); o.detune.value = det; f.type = 'lowpass'; f.frequency.setValueAtTime(700, t); f.frequency.linearRampToValueAtTime(2600, t + 0.06); f.frequency.linearRampToValueAtTime(1500, t + d); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * (oc === 12 ? 0.4 : 1), t + 0.03); g.gain.setValueAtTime(v * (oc === 12 ? 0.4 : 1), t + d * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.12); o.connect(f).connect(g).connect(sfxBus); g.connect(reverb); o.start(t); o.stop(t + d + 0.2); } };
    for (const [m, at, d] of seq) brass(m, t0 + at, d, 0.07);
    const last = seq[seq.length - 1]; for (const iv of [4, 7]) brass(last[0] - 12 + iv, t0 + last[1], last[2], 0.045);        // Schlussakkord
    for (const at of big ? [0, 0.66, 1.6] : [0, 0.48]) setTimeout(() => { tone('sine', 110, 40, 0.6, 0.7); noise(0.08, 0.3, 900, 300); }, (at + 0.05) * 1000);   // Pauke
    setTimeout(() => noise(big ? 2.4 : 1.4, 0.22, 9000, 5000, 0.5, 'highpass'), (last[1] + 0.05) * 1000);                         // Becken
  },
  jam() { tone('square', 1400, 200, 0.35, 0.16); tone('sawtooth', 90, 60, 0.4, 0.2); noise(0.3, 0.25, 4000, 500, 3, 'bandpass'); },
  pick() { tone('triangle', 587, 587, 0.12, 0.2); tone('triangle', 880, 880, 0.16, 0.2, sfxBus, 0.1); tone('triangle', 1175, 1175, 0.4, 0.2, sfxBus, 0.2); },
  loop() { noise(1.3, 0.3, 300, 2600, 1.1, 'bandpass'); tone('sawtooth', 90, 240, 0.7, 0.14, sfxBus, 0, 0.1); tone('sawtooth', 240, 80, 0.7, 0.12, sfxBus, 0.7, 0.05); },
  nova() { play(rec.crunch, 1, 0.35, 0, 0.9); play(rec.heavy, 0.6, 0.4, 0, 0.6); noise(1.8, 0.9, 160, 7000, 0.7); tone('sine', 55, 28, 1.8, 1); tone('sawtooth', 180, 1900, 0.8, 0.2); play(bank?.boom, 1, 0.5, 0, 0.8); },
  down() { tone('sawtooth', 600, 80, 0.7, 0.35); noise(0.9, 0.6, 3000, 80); play(bank?.boom, 0.8, 0.8, 0, 0.6); },
  boost() { noise(0.7, 0.26, 260, 2600, 1.2, 'bandpass'); tone('sawtooth', 70, 130, 0.6, 0.12, sfxBus, 0, 0.1); },
  roll() { noise(0.35, 0.2, 1400, 380, 1.5, 'bandpass'); },
  flyby(kind) { const f = kind === 'ace' ? 1.35 : kind === 'bomber' ? 0.6 : 1; noise(0.6, 0.2, 2400 * f, 420 * f, 5, 'bandpass'); tone('sawtooth', 300 * f, 95 * f, 0.55, 0.045); },
  click() { tone('sine', 880, 1320, 0.07, 0.12); },
  radio() { noise(0.07, 0.12, 3000, 2600, 4, 'bandpass'); tone('square', 1250, 1250, 0.05, 0.05, sfxBus, 0.06); },
  buy() { tone('sine', 660, 660, 0.1, 0.16); tone('sine', 990, 990, 0.16, 0.16, sfxBus, 0.09); tone('sine', 1320, 1320, 0.26, 0.14, sfxBus, 0.18); },
  deny() { tone('square', 180, 120, 0.16, 0.12); },
  warn() { for (let i = 0; i < 3; i++) tone('square', 880, 660, 0.16, 0.14, sfxBus, i * 0.24); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone('triangle', f, f, 0.5, 0.2, sfxBus, i * 0.13)); },
  phase() { tone('triangle', 440, 440, 0.2, 0.15); tone('triangle', 660, 660, 0.3, 0.15, sfxBus, 0.14); },
  beam(on) {
    if (!ctx) return;
    if (on && !sfx._b) { const o = ctx.createOscillator(), o2 = ctx.createOscillator(), l = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = 92; o2.type = 'square'; o2.frequency.value = 1104; l.frequency.value = 31; lg.gain.value = 0.05; l.connect(lg).connect(g.gain); g.gain.value = 0.1; o.connect(g); o2.connect(g); g.connect(sfxBus); if (reverb) g.connect(reverb); o.start(); o2.start(); l.start(); sfx._b = { o, o2, l, g }; play(bank?.laser, 0.5, 0.4); }
    else if (!on && sfx._b) { const b = sfx._b; sfx._b = null; b.g.gain.setTargetAtTime(0, ctx.currentTime, 0.04); for (const n of [b.o, b.o2, b.l]) n.stop(ctx.currentTime + 0.25); }
  },
};

// ---- Musik: eigene Filmmusik in d-Moll, live erzeugt. Schichten je nach Lage: Chorfläche und Hornthema (immer),
// Streicher-Ostinato und Taikos (Gefecht), hohe Spiccato-Streicher (hitziges Gefecht), Blech-„Braam“ (Großkampfschiff).
const PROG = [[38, 0], [38, 0], [34, 1], [34, 1], [41, 1], [41, 1], [36, 1], [33, 1]];        // Dm Dm B B F F C A  (0 = Moll, 1 = Dur)
const THEME = [[62, 0, 8], [69, 8, 8], [65, 16, 12], [64, 28, 4], [62, 32, 8], [70, 40, 8], [69, 48, 16], [72, 64, 8], [69, 72, 8], [65, 80, 12], [67, 92, 4], [64, 96, 8], [67, 104, 8], [69, 112, 8], [73, 120, 8]];   // Ton, Start, Länge in Sechzehnteln
const OST = [0, 0, 7, 0, 12, 0, 7, 0, 0, 0, 7, 0, 12, 7, 3, 7];
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
let mVerb = null;
function voice(type, f, t, dur, vol, cut, att = 0.01, det = 0, wet = 0.3, cutEnd = 0) {
  const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter(); o.type = type; o.frequency.value = f; o.detune.value = det;
  fl.type = 'lowpass'; fl.frequency.setValueAtTime(cut, t); if (cutEnd) fl.frequency.exponentialRampToValueAtTime(cutEnd, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.setValueAtTime(vol, t + Math.max(att, dur * 0.6)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(fl).connect(g).connect(musicBus); if (wet && mVerb) { const w = ctx.createGain(); w.gain.value = wet; g.connect(w).connect(mVerb); }
  o.start(t); o.stop(t + dur + 0.05);
}
function drum(t, vol, f0 = 95, len = 0.5) {   // Taiko: Fell (Sinus mit Tonhöhenfall) plus Schlägel (Rauschen)
  const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(34, t + len * 0.6); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len); o.connect(g).connect(musicBus); if (mVerb) g.connect(mVerb); o.start(t); o.stop(t + len + 0.05);
  const n = ctx.createBufferSource(), ng = ctx.createGain(), nf = ctx.createBiquadFilter(); n.buffer = noiseBuf; nf.type = 'lowpass'; nf.frequency.value = 900; ng.gain.setValueAtTime(vol * 0.5, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); n.connect(nf).connect(ng).connect(musicBus); n.start(t, Math.random()); n.stop(t + 0.12);
}
function musicStep(t) {
  if (orchestra()) { step++; return; }
  if (!mVerb) { mVerb = ctx.createConvolver(); mVerb.buffer = reverb.buffer; const g = ctx.createGain(); g.gain.value = 0.7; mVerb.connect(g).connect(musicBus); }
  const I = intensity, bar = Math.floor(step / 16) % 8, s = step % 16, [root, maj] = PROG[bar], third = maj ? 4 : 3, ch = [0, third, 7], sp = 60 / (84 + Math.min(1, I) * 30) / 4;
  if (s === 0) {   // Chorfläche: Akkord in zwei Oktaven, leicht verstimmt
    for (const iv of ch) for (const oc of [12, 24]) voice('sawtooth', hz(root + oc + iv), t, sp * 17, 0.035, 420 + I * 500, sp * 5, (Math.random() - 0.5) * 16, 0.6);
    voice('sine', hz(root - 12), t, sp * 17, 0.22, 200, 0.2, 0, 0);
    if (I > 0.9 && bar % 4 === 0) for (const d of [-14, -5, 6, 13]) voice('sawtooth', hz(root - 12), t, sp * 30, 0.085, 150, 0.12, d, 0.5, 1300);   // Braam
  }
  for (const [note, st, len] of THEME) if (st === bar * 16 + s) { const v = 0.05 + (1 - Math.min(1, I)) * 0.05; voice('sawtooth', hz(note - 12), t, sp * len * 1.05, v, 950, 0.07, -6, 0.7); voice('sawtooth', hz(note - 12), t, sp * len * 1.05, v, 950, 0.07, 7, 0.7); voice('triangle', hz(note), t, sp * len, v * 0.5, 1800, 0.09, 0, 0.7); }   // Hörner
  if (I > 0.25) {
    if (s % 2 === 0 || I > 0.75) { const n = root + (OST[s] === 3 ? third : OST[s]); voice('sawtooth', hz(n), t, sp * 1.5, (s % 4 === 0 ? 0.11 : 0.07) * Math.min(1, I + 0.3), 500 + I * 900, 0.004, 0, 0.15, 220); voice('sawtooth', hz(n + 12), t, sp * 1.2, 0.03 * I, 1400, 0.004, 9, 0.15, 300); }   // tiefe Streicher
    if (s === 0) drum(t, 0.7 * Math.min(1, I + 0.2), 105, 0.7); else if (s === 8) drum(t, 0.5 * I, 90, 0.5);
    if (bar % 2 === 1 && s >= 12) drum(t, (0.2 + (s - 12) * 0.09) * I, 120 + (s - 12) * 8, 0.25);                       // Auftakt-Wirbel
    if (I > 0.6 && (s === 6 || s === 14)) drum(t, 0.3 * I, 150, 0.2);
  }
  if (I > 0.55) { const iv = ch[[0, 1, 2, 1, 2, 1, 0, 1, 2, 0, 1, 2, 1, 0, 2, 1][s]]; voice('sawtooth', hz(root + 36 + iv), t, sp * 0.9, 0.028 * I, 2600, 0.003, 0, 0.35, 700); }   // hohe Spiccato-Streicher
  if (bar === 7 && s === 8) { const n = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter(); n.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(5000, t + sp * 8); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09 + I * 0.1, t + sp * 7.6); g.gain.exponentialRampToValueAtTime(0.0001, t + sp * 8.4); n.connect(f).connect(g).connect(musicBus); if (mVerb) g.connect(mVerb); n.start(t, 0); n.stop(t + sp * 9); }   // Anschwellen vor der Eins
  step++;
}
export function setIntensity(v) { intensity = v; }
// Orchesterstücke (Dateien in assets/, Lizenz siehe README). Läuft eines, schweigt die erzeugte Musik; sie bleibt als Ersatz.
const tracks = {}; let scene = '';
function track(name) {
  if (!tracks[name]) {
    const el = new Audio(); el.loop = true; el.preload = 'auto'; el.src = globalThis.NOVA_MUSIC?.[name] || `./assets/${name}.mp3`;
    const tr = (tracks[name] = { el, g: ctx.createGain(), ok: true }); tr.g.gain.value = 0; el.addEventListener('error', () => { tr.ok = false; });
    try { ctx.createMediaElementSource(el).connect(tr.g).connect(musicBus); } catch { tr.ok = false; }
  }
  return tracks[name];
}
const orchestra = () => { const t = tracks[scene]; return !!(t && t.ok && !t.el.paused && t.el.readyState >= 2); };
export function setScene(name) {   // 'music_hangar' oder 'music_battle'
  if (!ctx || scene === name) return; scene = name; const now = ctx.currentTime;
  for (const k in tracks) { tracks[k].g.gain.setTargetAtTime(0, now, 0.5); const el = tracks[k].el; if (k !== name) setTimeout(() => { if (scene !== k) el.pause(); }, 2500); }
  const t = track(name); t.g.gain.setTargetAtTime(name === 'music_battle' ? 0.8 : 0.6, now, 0.8); t.el.play().catch(() => { t.ok = t.ok && true; });
}
export const musicInfo = () => { const t = tracks[scene]; return { scene, ok: !!t?.ok, paused: t?.el.paused, time: +(t?.el.currentTime || 0).toFixed(1), orchestra: orchestra() }; };
export function duck(sec = 3) { const t = tracks[scene]; if (!t || !ctx) return; const now = ctx.currentTime, v = scene === 'music_battle' ? 0.8 : 0.6; t.g.gain.cancelScheduledValues(now); t.g.gain.setTargetAtTime(0.18, now, 0.15); t.g.gain.setTargetAtTime(v, now + sec, 0.7); }
export function startMusic() {
  if (!ctx || musicOn) return; musicOn = true; nextT = ctx.currentTime + 0.1;
  musicTimer = setInterval(() => { if (!ctx || ctx.state !== 'running') return; const sp = 60 / (84 + Math.min(1, intensity) * 30) / 4; if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05; while (nextT < ctx.currentTime + 0.25) { musicStep(nextT); nextT += sp; } }, 60);
}
export function suspendAudio(s) { if (ctx) (s ? ctx.suspend() : ctx.resume()); }
