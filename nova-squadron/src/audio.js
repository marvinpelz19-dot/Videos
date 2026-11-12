// Klang komplett synthetisch (WebAudio): Waffen, Explosionen, Oberfläche und eine generative Musikspur.
let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null, reverb = null;
let musicOn = false, musicTimer = 0, step = 0, intensity = 0, nextT = 0;
export const audioState = { sound: true, music: true };

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC();
  master = ctx.createDynamicsCompressor(); master.threshold.value = -14; master.ratio.value = 6; master.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.5; sfxBus.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = 0.34; musicBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // Hall: künstliche Impulsantwort (2,4 s abklingendes Rauschen)
  const ir = ctx.createBuffer(2, ctx.sampleRate * 2.4, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const x = ir.getChannelData(c); for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / x.length, 3.2); }
  reverb = ctx.createConvolver(); reverb.buffer = ir; const rg = ctx.createGain(); rg.gain.value = 0.5; reverb.connect(rg).connect(sfxBus);
  buildBank(); applyAudioState();
}
export function applyAudioState() {
  if (!ctx) return;
  sfxBus.gain.value = audioState.sound ? 0.5 : 0; musicBus.gain.value = audioState.music ? 0.34 : 0;
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
  orb() { tone('sine', 190, 42, 0.7, 0.6); tone('sawtooth', 520, 60, 0.5, 0.16); noise(0.5, 0.25, 1200, 200, 2, 'bandpass'); play(bank?.spread, 0.3, 0.45, 0, 0.5); },
  enemyShot(pan = 0) { if (!play(bank?.enemy, 0.16, 1, pan, 0.2)) tone('square', 640, 180, 0.1, 0.05); },
  hit() { if (!ctx || ctx.currentTime - lastHit < 0.035) return; lastHit = ctx.currentTime; play(bank?.hit, 0.3, 1.1, 0, 0.1); ping(1900 + Math.random() * 900, 0.09, 0.05); },
  shieldHit() { play(bank?.hit, 0.6, 0.6, 0, 0.3); noise(0.25, 0.35, 5200, 700, 3, 'bandpass'); tone('sine', 210, 60, 0.3, 0.4); tone('sawtooth', 2400, 300, 0.2, 0.06); },
  boom(size = 1, pan = 0, near = 1) {
    if (!ctx) return; if (ctx.currentTime - lastBoom < 0.04) return; lastBoom = ctx.currentTime; const v = Math.min(1, 0.35 + near * 0.65);
    play(bank?.boom, Math.min(1, 0.5 + size * 0.2) * v, 1.25 / Math.sqrt(size), pan, 0.5);                     // Krachen
    tone('sine', 150 / Math.sqrt(size), 26, 0.5 + size * 0.35, 0.75 * v);                                       // Druckwelle
    noise(0.9 + size * 0.5, 0.3 * v, 900 / size, 60, 0.5);                                                      // Grollen
    if (size > 1.2) for (let i = 0; i < 3; i++) setTimeout(() => play(bank?.hit, 0.2 * v, 0.5 + Math.random() * 0.4, pan, 0.5), 120 + i * 110 + Math.random() * 80);   // Trümmer
  },
  nova() { noise(1.8, 0.9, 160, 7000, 0.7); tone('sine', 55, 28, 1.8, 1); tone('sawtooth', 180, 1900, 0.8, 0.2); play(bank?.boom, 1, 0.5, 0, 0.8); },
  down() { tone('sawtooth', 600, 80, 0.7, 0.35); noise(0.9, 0.6, 3000, 80); play(bank?.boom, 0.8, 0.8, 0, 0.6); },
  boost() { noise(0.7, 0.26, 260, 2600, 1.2, 'bandpass'); tone('sawtooth', 70, 130, 0.6, 0.12, sfxBus, 0, 0.1); },
  roll() { noise(0.35, 0.2, 1400, 380, 1.5, 'bandpass'); },
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

// ---- Musik: düsterer Marsch in d-Moll, 16tel-Raster. intensity 0 (Hangar) bis 1 (Kampf). ----
const ROOTS = [38, 38, 34, 36, 38, 41, 36, 33];           // D D Bb C D F C A
const CHORD = { 38: [0, 3, 7], 34: [0, 4, 7], 36: [0, 4, 7], 41: [0, 4, 7], 33: [0, 4, 7] };
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
function musicStep(t) {
  const bar = Math.floor(step / 16) % ROOTS.length, s = step % 16, root = ROOTS[bar], ch = CHORD[root];
  if (s === 0) {                                           // Fläche
    for (const iv of ch) { const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = hz(root + 12 + iv); o.detune.value = (Math.random() - 0.5) * 14; f.type = 'lowpass'; f.frequency.value = 500 + intensity * 900; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07, t + 0.5); g.gain.linearRampToValueAtTime(0.0001, t + 2.1); o.connect(f).connect(g).connect(musicBus); o.start(t); o.stop(t + 2.2); }
    tone('sine', hz(root - 12), hz(root - 12), 1.9, 0.3, musicBus, t - ctx.currentTime, 0.05);
  }
  if (intensity > 0.3) {
    if (s % 4 === 0 || (s === 14 && bar % 2)) tone('sine', 110, 38, 0.22, 0.55 * intensity, musicBus, t - ctx.currentTime);   // Trommel
    if (s % 2 === 0) tone('sawtooth', hz(root), hz(root), 0.11, 0.1 * intensity, musicBus, t - ctx.currentTime);               // Bass-Ostinato
    if (s === 4 || s === 12) { const g = ctx.createGain(), n = ctx.createBufferSource(), f = ctx.createBiquadFilter(); n.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 2500; env(g, t, 0.002, 0.12 * intensity, 0.12); n.connect(f).connect(g).connect(musicBus); n.start(t, Math.random()); n.stop(t + 0.15); }
  }
  const arp = [0, 2, 1, 2, 0, 2, 1, 2, 0, 1, 2, 1, 0, 2, 1, 0][s];
  if (s % 2 === 0 || intensity > 0.6) tone('triangle', hz(root + 24 + ch[arp]), hz(root + 24 + ch[arp]), 0.16, 0.05 + 0.04 * intensity, musicBus, t - ctx.currentTime);
  if (s === 0 && bar % 4 === 0) { [0, 7, 12].forEach((iv, i) => tone('square', hz(62 + iv), hz(62 + iv), 0.5, 0.035 + intensity * 0.03, musicBus, t - ctx.currentTime + i * 0.25, 0.03)); }   // Fanfare
  step++;
}
export function setIntensity(v) { intensity = v; }
export function startMusic() {
  if (!ctx || musicOn) return; musicOn = true; nextT = ctx.currentTime + 0.1;
  musicTimer = setInterval(() => { if (!ctx || ctx.state !== 'running') return; const sp = 60 / (96 + intensity * 30) / 4; if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05; while (nextT < ctx.currentTime + 0.25) { musicStep(nextT); nextT += sp; } }, 60);
}
export function suspendAudio(s) { if (ctx) (s ? ctx.suspend() : ctx.resume()); }
