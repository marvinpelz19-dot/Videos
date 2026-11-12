// NOVA SQUADRON — Spielkern: Welt, Spieler, Gegner-KI, Waffen, Missionsablauf, Kamera, Renderer.
import * as THREE from '../vendor/three.module.min.js';
import { EffectComposer } from '../vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/addons/postprocessing/OutputPass.js';
import { WEAPONS, UPGRADES, SHIPS, ENEMIES, ENVS, MISSIONS, ENDLESS, endlessPhase } from './data.js';
import { MATS, buildPlayerShip, buildEnemy, buildCapital, buildAsteroidGeos } from './ships.js';
import { FX, BoltMesh } from './fx.js';
import { sfx, initAudio, startMusic, setIntensity, audioState, applyAudioState, suspendAudio } from './audio.js';
import { createUI } from './ui.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const randUnit = (out) => out.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
const t1 = V(), t2 = V(), t3 = V(), t4 = V(), UP = V(0, 1, 0);

// ---------- Spielstand ----------
const SAVE_KEY = 'nova-squadron-save-v1';
const save = { credits: 0, up: {}, done: {}, ship: 'pfeil', bestWave: 0, bestScore: 0, set: { quality: 'high', sound: true, music: true, invertY: false, autofire: null } };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s) { Object.assign(save, s, { set: { ...save.set, ...(s.set || {}) } }); } } catch { /* ohne Speicher spielbar */ }
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* egal */ } };
const up = (id) => save.up[id] || 0;
const doneCount = () => MISSIONS.filter((m) => save.done[m.id]).length;
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (save.set.autofire === null) save.set.autofire = isTouch;
if (isTouch && !localStorage.getItem?.(SAVE_KEY)) save.set.quality = 'medium';
audioState.sound = save.set.sound; audioState.music = save.set.music;

// ---------- Renderer ----------
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 1, 16000);
const hemi = new THREE.HemisphereLight(0x8899bb, 0x221122, 0.9); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 3.2); scene.add(sun);
const fill = new THREE.DirectionalLight(0xbfd4ff, 0.9); scene.add(fill);
const rim = new THREE.DirectionalLight(0x9fc4ff, 2.4); scene.add(rim);    // Konturlicht von vorn oben: zeichnet die Silhouetten nach
const pmrem = new THREE.PMREMGenerator(renderer), envCache = {};   // Aufhelllicht von der Kamera her
let composer = null, bloom = null;
function setupQuality() {
  const q = save.set.quality;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, q === 'high' ? 2 : q === 'medium' ? 1.5 : 1));
  if (q === 'low') { composer = null; } else {
    composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.5, 0.5, 0.92); composer.addPass(bloom); composer.addPass(new OutputPass());
  }
  resize();
}
const hudCv = document.getElementById('marks'), hc = hudCv.getContext('2d');
let W = 1, H = 1, DPR = 1;
function resize() {
  W = innerWidth; H = innerHeight; DPR = Math.min(devicePixelRatio || 1, 2);
  renderer.setSize(W, H, false); composer?.setSize(W, H);
  camera.aspect = W / H; camera.updateProjectionMatrix();
  hudCv.width = W * DPR; hudCv.height = H * DPR;
}
addEventListener('resize', resize);

// ---------- Welt ----------
const texLoader = new THREE.TextureLoader(), texCache = {};
function tex(name) {
  if (!texCache[name]) { const t = texLoader.load(`./assets/${name}.jpg`, (tt) => { if (name.startsWith('sky')) { const e = tt.clone(); e.mapping = THREE.EquirectangularReflectionMapping; e.wrapS = THREE.RepeatWrapping; e.repeat.x = 1; e.needsUpdate = true; envCache[name] = pmrem.fromEquirectangular(e).texture; if (curSky === name) scene.environment = envCache[name]; } }); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texCache[name] = t; }
  return texCache[name];
}
const skyMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false });
skyMat.color.setRGB(0.62, 0.62, 0.62);
const sky = new THREE.Mesh(new THREE.SphereGeometry(8000, 48, 24), skyMat); sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
const far = new THREE.Group(); scene.add(far);       // Planet, Sonne: folgen der Kamera (unendlich weit weg)
const world = new THREE.Group(); scene.add(world);   // alles, was pro Mission neu entsteht
const fx = new FX(scene, save.set.quality), boltMesh = new BoltMesh(scene);
const rockGeos = buildAsteroidGeos();
const atmoMat = (c) => new THREE.ShaderMaterial({
  uniforms: { col: { value: new THREE.Color(c[0], c[1], c[2]) }, sunDir: { value: V() } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); vW=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*mv; }',
  fragmentShader: 'uniform vec3 col; uniform vec3 sunDir; varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ float rim=pow(1.0-abs(dot(vN,vV)),2.2); float lit=smoothstep(-0.35,0.5,dot(vW,sunDir)); gl_FragColor=vec4(col*rim*lit*1.6,rim*lit); }',
});
function glowSprite(c, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fx.tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); s.material.color.setRGB(c[0], c[1], c[2]); s.scale.setScalar(size); return s;
}
let curSky = '', menuBase = 0;
function buildEnv(env) {
  far.clear(); curSky = env.sky; scene.environment = envCache[env.sky] || null; scene.environmentIntensity = 0.85; const t = tex(env.sky); t.wrapS = THREE.MirroredRepeatWrapping; t.repeat.x = 2; skyMat.map = t; skyMat.needsUpdate = true;
  const sd = V(...env.sun).normalize(); menuBase = Math.atan2(-sd.x, -sd.z) + 0.5; sun.position.copy(sd); sun.color.setRGB(...env.sunCol); hemi.color.setHex(env.ambient); hemi.color.multiplyScalar(2.2);
  const s1 = glowSprite(env.sunCol.map((v) => v * 5), 1100); s1.position.copy(sd).multiplyScalar(7000); far.add(s1);
  const s2 = glowSprite(env.sunCol.map((v) => v * 0.35), 4200); s2.position.copy(s1.position); far.add(s2);
  const R = env.planetSize * 2600, pm = new THREE.MeshStandardMaterial({ map: tex(env.planet), roughness: 1, metalness: 0 });
  if (env.glow) { pm.emissiveMap = tex(env.planet); pm.emissive.setRGB(1.6, 0.9, 0.5); }
  const planet = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 40), pm); planet.position.set(...env.planetPos).normalize().multiplyScalar(5600); planet.rotation.set(0.3, rand(6), 0.2); far.add(planet);
  const am = atmoMat(env.atmo); am.uniforms.sunDir.value.copy(sd); const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.035, 64, 40), am); atmo.position.copy(planet.position); far.add(atmo);
  far.userData.planet = planet;
  if (env.ring) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(R * 1.3, R * 2.3, 128, 1), new THREE.ShaderMaterial({
      uniforms: { a: { value: R * 1.3 }, b: { value: R * 2.3 } }, transparent: true, side: THREE.DoubleSide, depthWrite: false,
      vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform float a; uniform float b; varying vec3 vP; void main(){ float r=(length(vP.xy)-a)/(b-a); float k=(0.55+0.45*sin(r*70.0))*(0.6+0.4*sin(r*19.0+1.3))*smoothstep(0.0,0.04,r)*smoothstep(1.0,0.9,r); gl_FragColor=vec4(vec3(0.95,0.82,0.66)*k*0.9,k*0.85); }',
    }));
    ring.position.copy(planet.position); ring.rotation.set(1.25, 0.3, 0); far.add(ring);
  }
}

// ---------- Zustand ----------
const G = { mode: 'title', t: 0, ents: [], bolts: [], freeBolts: [], mission: null, phase: -1, phaseDef: null, phaseT: 0, cap: null, center: V(), stats: null, shake: 0, slow: 0, endT: 0, combo: 0, comboT: 0, lock: null, beamOn: false, intensity: 0 };
const P = { pos: V(), yaw: 0, pitch: 0, quat: new THREE.Quaternion(), fwd: V(0, 0, 1), right: V(-1, 0, 0), vel: V(), sx: 0, sy: 0, speed: 70, shield: 100, maxShield: 100, regenT: 0, invuln: 0, rollT: 0, rollDir: 1, rollCd: 0, boost: 0, fireCd: 0, weapon: 0, gun: 0, nova: 0, mesh: null, inner: null, def: SHIPS[0], r: 4.5, hullCd: 0, team: 0 };
const camFwd = V(0, 0, 1), eul = new THREE.Euler(0, 0, 0, 'YXZ');
const beam = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 8, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5), new THREE.MeshBasicMaterial({ blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
beam.material.color.setRGB(1.2, 2.6, 6); beam.visible = false; scene.add(beam);
const bossBeam = new THREE.Mesh(beam.geometry, new THREE.MeshBasicMaterial({ blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); bossBeam.visible = false; scene.add(bossBeam);

// ---------- Eingabe ----------
const keys = {}, input = { sx: 0, sy: 0, fire: false, boost: false, mouse: false, mx: 0, my: 0, stickId: -1, stx: 0, sty: 0, jx: 0, jy: 0 };
addEventListener('keydown', (e) => {
  if (e.repeat) return; keys[e.code] = true; if (G.mode !== 'play') { if (G.mode === 'pause' && (e.code === 'Escape' || e.code === 'KeyP')) setPause(false); return; }
  if (e.code === 'KeyQ') roll(-1); else if (e.code === 'KeyE') roll(1); else if (e.code === 'KeyF') nova();
  else if (e.code === 'Escape' || e.code === 'KeyP') setPause(true);
  else if (/^Digit[1-5]$/.test(e.code)) setWeapon(+e.code[5] - 1); else if (e.code === 'Tab') { e.preventDefault(); cycleWeapon(1); }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; input.fire = false; if (G.mode === 'play') setPause(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode === 'play') setPause(true); });
canvas.addEventListener('mousemove', (e) => { input.mouse = true; input.mx = (e.clientX / W) * 2 - 1; input.my = (e.clientY / H) * 2 - 1; });
canvas.addEventListener('mousedown', (e) => { if (e.button === 0) input.fire = true; else if (e.button === 2) roll(input.mx < 0 ? -1 : 1); });
addEventListener('mouseup', (e) => { if (e.button === 0) input.fire = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('wheel', (e) => { if (G.mode === 'play') cycleWeapon(e.deltaY > 0 ? 1 : -1); }, { passive: true });
// Touch: linker Daumen steuert (Stick entsteht, wo der Daumen aufsetzt)
const stickEl = document.getElementById('stick'), knobEl = document.getElementById('knob');
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault(); input.mouse = false;
  for (const t of e.changedTouches) if (input.stickId < 0) { input.stickId = t.identifier; input.stx = t.clientX; input.sty = t.clientY; input.jx = input.jy = 0; stickEl.hidden = false; stickEl.style.transform = `translate(${t.clientX}px,${t.clientY}px)`; knobEl.style.transform = 'translate(0,0)'; }
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) if (t.identifier === input.stickId) {
    let dx = t.clientX - input.stx, dy = t.clientY - input.sty; const R = 58, l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; }
    input.jx = dx / R; input.jy = dy / R; knobEl.style.transform = `translate(${dx}px,${dy}px)`;
  }
}, { passive: false });
const endTouch = (e) => { for (const t of e.changedTouches) if (t.identifier === input.stickId) { input.stickId = -1; input.jx = input.jy = 0; stickEl.hidden = true; } };
canvas.addEventListener('touchend', endTouch); canvas.addEventListener('touchcancel', endTouch);

// ---------- Objekte ----------
function addEnt(kind, pos, o = {}) {
  const d = ENEMIES[kind] || {};
  const e = { kind, team: 1, pos: pos.clone(), dir: V(0, 0, 1), vel: V(), speed: d.speed || 0, turn: d.turn || 0, hp: d.hp || 1, maxHp: d.hp || 1, r: d.r || 5, def: d, alive: true, state: 'attack', timer: 0, cd: rand(0.5, 2), bank: 0, objective: false, fighter: !!d.speed, tgt: null, flashT: 0, ...o };
  if (!e.mesh) { e.mesh = buildEnemy(kind); }
  e.mesh.position.copy(e.pos); world.add(e.mesh); G.ents.push(e); return e;
}
function spawnAround(dist0, dist1, out) {
  randUnit(out); if (out.dot(P.fwd) < 0.1) out.addScaledVector(P.fwd, 1.4).normalize();
  out.y *= 0.5; return out.normalize().multiplyScalar(rand(dist0, dist1)).add(P.pos);
}
function pickTarget(e) {
  const tr = G.ents.filter((x) => x.kind === 'transport');
  if (e.kind === 'bomber' && tr.length) return tr[(Math.random() * tr.length) | 0];
  if (Math.random() < 0.62) return P;
  const al = G.ents.filter((x) => x.team === 0 && x.alive); return al.length ? al[(Math.random() * al.length) | 0] : P;
}
function spawnGroup([kind, n], objective) {
  if (kind === 'cruiser' || kind === 'dread') return spawnCapital(kind === 'dread');
  if (kind === 'buoy') { for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + rand(0.6), e = addEnt('buoy', V(Math.cos(a) * rand(300, 620), rand(-120, 120), Math.sin(a) * rand(300, 620) + 250), { objective }); e.spin = rand(0.3, 0.8); } return; }
  const c = spawnAround(560, 820, V());
  for (let i = 0; i < n; i++) {
    const p = c.clone().add(randUnit(t1).multiplyScalar(rand(20, 90))), e = addEnt(kind, p, { objective });
    e.dir.copy(P.pos).sub(p).normalize(); e.tgt = pickTarget(e); e.breakDist = kind === 'bomber' ? 110 : rand(50, 90);
    if (G.mission.endless) { const k = 1 + G.phase * 0.06; e.hp = e.maxHp = e.hp * k; }
    fx.flash(p, 60, [1.2, 0.4, 0.3], 0.5);
  }
  fx.ring(c, 120, [1, 0.3, 0.2], 0.9);
}
function spawnCapital(dread) {
  const mesh = buildCapital(dread), pos = dread ? V(260, -90, 1250) : V(150, -50, 820); mesh.position.copy(pos); world.add(mesh);
  const u = mesh.userData, cap = G.cap = { mesh, pos, dread, hull: u.hull.map(([x, y, z, r]) => ({ c: V(x, y, z).add(pos), r })), dying: 0, beamT: 9, beamState: 0, beamDir: V(), muzzle: V(0, 0, 235 * u.k).add(pos), parts: [] };
  for (const [x, y, z, rot] of u.turrets) { const e = addEnt('turret', V(x, y, z).add(pos), { cap, objective: true }); e.mesh.rotation.z = rot; e.upSign = rot ? -1 : 1; cap.parts.push(e); }
  for (const [x, y, z] of u.gens) { const e = addEnt('gen', V(x, y, z).add(pos), { cap }); if (dread) e.mesh.scale.setScalar(1.3), (e.r = 18), (e.hp = e.maxHp = 520); cap.parts.push(e); }
  const core = addEnt('core', V(...u.core).add(pos), { cap, shielded: true }); if (dread) { core.hp = core.maxHp = 3600; core.mesh.scale.setScalar(1.4); core.r = 28; } cap.core = core; cap.parts.push(core);
  G.center.copy(pos);
}
function clearWorld() {
  for (const e of G.ents) world.remove(e.mesh); G.ents.length = 0; G.bolts.length = 0; world.clear(); G.cap = null; beam.visible = bossBeam.visible = false; sfx.beam(false);
}

// ---------- Mission ----------
function startMission(m) {
  initAudio(); startMusic(); clearWorld(); setShowcase(null); G.mission = m; G.phase = -1; G.phaseDef = null; G.t = 0; G.endT = 0; G.combo = 0; G.center.set(0, 0, 0);
  G.stats = { kills: 0, score: 0, credits: 0, respawns: 0, time: 0, wave: 0, convoy: 1 };
  const env = ENVS[m.env]; buildEnv(env);
  P.def = SHIPS.find((s) => s.id === save.ship) || SHIPS[0];
  P.mesh = new THREE.Group(); P.inner = buildPlayerShip(P.def.id); P.mesh.add(P.inner); world.add(P.mesh);
  P.pos.set(0, 0, 0); P.yaw = P.pitch = 0; P.maxShield = Math.round((100 + 25 * up('shield')) * P.def.shield); P.shield = P.maxShield; P.invuln = 2; P.nova = 40; P.rollT = 0; P.weapon = Math.min(P.weapon, 4);
  if (WEAPONS[P.weapon].unlock > doneCount()) P.weapon = 0;
  camFwd.set(0, 0, 1);
  for (let i = 0; i < 1 + up('wing'); i++) { const e = addEnt('ally', V((i % 2 ? 1 : -1) * (22 + i * 9), 4, -18 - i * 8), { team: 0, mesh: buildPlayerShip(i % 3 === 2 ? 'wespe' : 'pfeil', true), speed: 76, turn: 1.7, r: 5, fighter: true, slot: i, hp: 1e9 }); e.breakDist = 70; }
  for (let i = 0; i < env.asteroids; i++) {
    const r = rand(8, 46) * (Math.random() < 0.12 ? 2 : 1), p = randUnit(V()).multiplyScalar(rand(160, 1000)); p.y *= 0.45; p.z += 250;
    const mesh = new THREE.Mesh(rockGeos[i % 4], MATS.rock); mesh.scale.setScalar(r); mesh.rotation.set(rand(6), rand(6), rand(6));
    const e = addEnt('rock', p, { team: 2, mesh, r: r * 0.92, hp: r * 5, maxHp: r * 5, def: { credit: 8, score: 20, name: 'Asteroid' }, fighter: false }); e.spinAx = randUnit(V()); e.spin = rand(0.02, 0.2);
  }
  for (let i = 0; i < (m.convoy || 0); i++) addEnt('transport', V((i - 1) * 90, -30 - (i % 2) * 25, 160 - Math.abs(i - 1) * 70), { team: 0, speed: 16, hp: 900, maxHp: 900, r: 26, fighter: false, def: { name: 'Frachter' } });
  ui.showGame(m); G.mode = 'play'; setIntensity(0.5); nextPhase();
  ui.banner(m.name.toUpperCase(), m.place);
}
function nextPhase() {
  const m = G.mission; G.phase++;
  const def = m.endless ? endlessPhase(G.phase + 1) : m.phases[G.phase];
  if (!def) { G.endT = 2.6; G.phaseDef = null; return; }
  G.phaseDef = def; G.phaseT = 0; G.stats.wave = G.phase + 1;
  for (const g of def.spawn) spawnGroup(g, !def.goal);
  if (def.goal === 'core' && G.cap) { G.cap.core.shielded = false; G.cap.core.mesh.userData.shield.visible = false; fx.ring(G.cap.core.pos, 160, [0.3, 1, 0.6], 1.2); }
  (def.comms || []).forEach(([n, t], i) => setTimeout(() => G.mode !== 'title' && ui.comms(n, t), 900 + i * 3800));
  if (G.phase > 0) { sfx.phase(); ui.banner(def.label.toUpperCase(), m.endless ? '' : `Phase ${G.phase + 1} von ${m.phases.length}`); }
}
function remaining() {
  const d = G.phaseDef; if (!d) return 0;
  if (d.goal) return G.ents.reduce((n, e) => n + (e.alive && e.kind === d.goal ? 1 : 0), 0);
  return G.ents.reduce((n, e) => n + (e.alive && e.objective ? 1 : 0), 0);
}
function finishMission(quit) {
  const m = G.mission, s = G.stats; G.mode = 'result'; sfx.beam(false);
  const won = !quit || m.endless; let stars = 0, bonus = 0;
  if (won && !m.endless) {
    stars = s.respawns === 0 ? 3 : s.respawns <= 3 ? 2 : 1; if (m.convoy && s.convoy < 0.5) stars = Math.min(stars, 2);
    const idx = MISSIONS.indexOf(m), first = !save.done[m.id]; bonus = 500 * (idx + 1) * (first ? 2 : 1); save.done[m.id] = Math.max(save.done[m.id] || 0, stars);
  }
  if (m.endless) { bonus = (s.wave - 1) * 120; save.bestWave = Math.max(save.bestWave, s.wave - 1); }
  save.bestScore = Math.max(save.bestScore, s.score); save.credits += s.credits + bonus; persist();
  if (won) sfx.win(); setIntensity(0.1);
  ui.showResult({ m, s, stars, bonus, won, newWeapon: won && !m.endless ? WEAPONS.find((w) => w.unlock === doneCount() && w.unlock > 0 && stars && MISSIONS.indexOf(m) + 1 === w.unlock) : null, newShip: won && !m.endless ? SHIPS.find((x) => x.unlock === MISSIONS.indexOf(m) + 1) : null });
}
function setPause(p) { if (p && G.mode === 'play') { G.mode = 'pause'; sfx.beam(false); ui.showPause(true); } else if (!p && G.mode === 'pause') { G.mode = 'play'; ui.showPause(false); last = performance.now(); } }

// ---------- Spieleraktionen ----------
function roll(dir) { if (G.mode !== 'play' || P.rollCd > 0) return; P.rollT = 0.5; P.rollDir = dir; P.rollCd = 1.1; sfx.roll(); }
function setWeapon(i) { if (WEAPONS[i] && WEAPONS[i].unlock <= doneCount() && i !== P.weapon) { P.weapon = i; sfx.click(); ui.weaponChanged(); } }
function cycleWeapon(d) { const n = WEAPONS.filter((w) => w.unlock <= doneCount()).length; setWeapon((P.weapon + d + n) % n); }
function nova() {
  if (G.mode !== 'play' || P.nova < 100) return; P.nova = 0; sfx.nova(); G.shake = 2.2; G.slow = 0.7; ui.flash('nova');
  const dmg = 380 * (1 + 0.35 * up('nova'));
  fx.ring(P.pos, 520, [0.6, 0.9, 2], 1.1); fx.ring(P.pos, 300, [2, 1.2, 0.5], 0.8); fx.flash(P.pos, 500, [2, 2.4, 4], 0.7); fx.spark(P.pos, 90, 260, 1.0, 2.2, 0.5, 1.0, 2.6);
  for (const e of G.ents) if (e.alive && e.team !== 0 && e.pos.distanceTo(P.pos) < 520) damage(e, e.kind === 'core' || e.kind === 'gen' ? dmg * 0.6 : dmg, true);
  for (const b of G.bolts) if (b.team === 1 && b.pos.distanceTo(P.pos) < 520) b.life = 0;
}
function newBolt(pos, dir, speed, team, dmg, c, kind = 0) {
  const b = G.freeBolts.pop() || { pos: V(), vel: V(), c: null };
  b.pos.copy(pos); b.vel.copy(dir).multiplyScalar(speed); b.team = team; b.dmg = dmg; b.c = c; b.kind = kind; b.life = 2.2; b.w = 0.55; b.len = 9; b.r = team === 0 ? 2.6 : 0.5; b.target = null; b.aoe = 0;
  G.bolts.push(b); return b;
}
const muzzle = V(), aimPt = V(), aimDir = V();
function gunPos(i) { const g = P.inner.userData.guns; const p = g[i % g.length]; return muzzle.set(p[0], p[1], p[2]).applyQuaternion(P.quat).add(P.pos); }
function fire(dt) {
  const w = WEAPONS[P.weapon], dm = P.def.dmg * (1 + 0.2 * up('dmg')), multi = up('multi'), L = G.lock;
  // Zielhilfe: liegt das erfasste Ziel nahe am Fadenkreuz, zielen die Bolzen auf den Vorhaltepunkt
  if (L && L.ang < 0.2) { const tt = L.dist / (w.speed || 2000); aimPt.copy(L.e.pos).addScaledVector(L.e.vel, tt); } else aimPt.copy(P.pos).addScaledVector(P.fwd, 420);
  if (w.id === 'beam') return fireBeam(dt, w.dmg * dm * (1 + 0.25 * multi));
  if (P.fireCd > 0) return; P.fireCd = 1 / (w.rate * (1 + 0.12 * up('rate')));
  if (w.id === 'laser') {
    for (let i = 0; i <= multi; i++) { const p = gunPos(P.gun++); aimDir.copy(aimPt).sub(p).normalize(); newBolt(p, aimDir, w.speed, 0, w.dmg * dm, w.color); fx.flash(p, 5, w.color, 0.07); }
    sfx.laser();
  } else if (w.id === 'spread') {
    const n = 7 + multi * 2, p = gunPos(2).clone(); aimDir.copy(aimPt).sub(P.pos).normalize();
    for (let i = 0; i < n; i++) { const a = (i / (n - 1) - 0.5) * 0.36; t1.copy(aimDir).addScaledVector(P.right, a).addScaledVector(UP, rand(-0.03, 0.03)).normalize(); const b = newBolt(p, t1, w.speed, 0, w.dmg * dm, w.color); b.life = 1.1; b.len = 6; }
    fx.flash(p, 12, w.color, 0.1); sfx.spread();
  } else if (w.id === 'missile') {
    const tg = L ? [L.e] : []; for (const e of G.ents) if (e.alive && e.team === 1 && e !== L?.e && !e.shielded && e.pos.distanceTo(P.pos) < 800) tg.push(e);
    for (let i = 0; i < 2 + multi; i++) { const p = gunPos(i).clone(); t1.copy(P.fwd).addScaledVector(P.right, (i % 2 ? 0.25 : -0.25)).addScaledVector(UP, rand(-0.1, 0.25)).normalize(); const b = newBolt(p, t1, w.speed, 0, w.dmg * dm, w.color, 1); b.life = 4; b.w = 0.9; b.len = 4; b.target = tg.length ? tg[i % tg.length] : null; b.aoe = 16; }
    sfx.missile();
  } else if (w.id === 'orb') {
    const p = gunPos(2).clone(); aimDir.copy(aimPt).sub(p).normalize(); const b = newBolt(p, aimDir, w.speed, 0, w.dmg * dm, w.color, 2); b.life = 3; b.w = 3.4; b.len = 3.4; b.r = 5; b.aoe = 60 + multi * 14; sfx.orb(); G.shake = Math.max(G.shake, 0.3);
  }
}
function fireBeam(dt, dps) {
  const o = gunPos(2).clone(); aimDir.copy(aimPt).sub(o).normalize(); let best = 620, hit = null;
  for (const e of G.ents) {
    if (!e.alive || e.team === 0) continue; t1.copy(e.pos).sub(o); const along = t1.dot(aimDir); if (along < 0 || along > best) continue;
    const perp = Math.sqrt(Math.max(0, t1.lengthSq() - along * along)); if (perp < e.r + 3.5) { best = along; hit = e; }
  }
  if (G.cap && !G.cap.dead) for (const h of G.cap.hull) { t1.copy(h.c).sub(o); const along = t1.dot(aimDir); if (along < 0) continue; const perp2 = t1.lengthSq() - along * along; if (perp2 < h.r * h.r) { const d = along - Math.sqrt(h.r * h.r - perp2); if (d < best && d > 0) { best = d; hit = null; } } }
  beam.visible = true; beam.position.copy(o); beam.lookAt(t2.copy(o).add(aimDir)); const wv = 0.9 + Math.sin(G.t * 60) * 0.25; beam.scale.set(wv, wv, best);
  t2.copy(o).addScaledVector(aimDir, best);
  if (best < 620) { fx.spark(t2, 3, 40, 0.3, 1.6, 1, 2.2, 5); if (Math.random() < 0.3) fx.flash(t2, 14, [1, 2, 5], 0.1); }
  if (hit) damage(hit, dps * dt, false, true);
  if (!G.beamOn) { G.beamOn = true; sfx.beam(true); }
}

// ---------- Schaden ----------
function damage(e, dmg, silent, cont) {
  if (!e.alive || e.team === 0) return;
  if (e.shielded) { if (!cont || Math.random() < 0.1) { fx.spark(e.pos, 4, 30, 0.4, 2, 0.3, 2, 0.8); } return; }
  e.hp -= dmg; e.flashT = 0.08; if (!silent && !cont) { sfx.hit(); fx.flash(e.pos, e.r * 2.2 + 4, [2.2, 1.6, 1.0], 0.09); }
  if (e.hp <= 0) kill(e);
}
function kill(e) {
  e.alive = false; world.remove(e.mesh);
  const size = e.kind === 'rock' ? e.r / 12 : { drone: 1, inter: 0.9, bomber: 1.8, ace: 2.4, turret: 1.6, gen: 3, buoy: 2.2, core: 5 }[e.kind] || 1;
  fx.explode(e.pos, size, e.kind === 'rock' ? [0.7, 0.6, 0.5] : e.kind === 'ace' ? [0.8, 0.4, 1.4] : e.kind === 'gen' ? [0.3, 1.2, 0.5] : [1, 0.55, 0.2], e.vel);
  const d = e.pos.distanceTo(P.pos), pan = clamp(-t1.copy(e.pos).sub(camera.position).normalize().dot(P.right) * 1.2, -1, 1); sfx.boom(clamp(size, 0.6, 3), pan, clamp(1 - d / 900, 0, 1));
  fx.spark(e.pos, 10 + size * 6, 55 + size * 20, 1.6, 0.9, 2.6, 1.3, 0.3, e.vel);                       // glühende Trümmer
  if (size >= 1.6) { const pp = e.pos.clone(); for (let i = 1; i <= 3; i++) setTimeout(() => { if (G.mode === 'play') { fx.explode(pp.add(randUnit(t1).multiplyScalar(e.r * 0.8)), size * 0.5); } }, i * 140); }   // Folgeexplosionen
  G.shake = Math.max(G.shake, clamp((size * 90) / (d + 40), 0, 1.6));
  if (e.kind !== 'rock') { G.combo++; G.comboT = 5; G.stats.kills++; P.nova = Math.min(100, P.nova + (6 + up('nova') * 2)); }
  const mult = 1 + Math.min(G.combo, 12) * 0.25; G.stats.score += Math.round(e.def.score * mult); G.stats.credits += Math.round(e.def.credit * (1 + Math.min(G.combo, 10) * 0.05));
  if (e.kind === 'ace') { G.slow = 0.5; ui.banner('LIQUIDATOR ABGEWICKELT', '+' + e.def.credit + ' Credits'); }
  if (e.kind === 'core') { G.cap.dying = 5; G.slow = 0.8; ui.comms('Verbandschef', G.cap.dread ? 'Die Monopol bricht auseinander! Raus da, Nova Eins!' : 'Kern getroffen! Die Rendite geht hoch!'); }
}
function hitPlayer(dmg, pos) {
  if (P.invuln > 0 || P.rollT > 0 || G.mode !== 'play') return;
  P.shield -= dmg; P.regenT = 2.6; G.shake = Math.max(G.shake, 0.5); sfx.shieldHit(); ui.flash('hit'); fx.spark(pos || P.pos, 8, 30, 0.4, 2, 0.5, 1.4, 3);
  if (P.shield <= 0) {   // unendlich Leben: Notsprung statt Game Over
    G.stats.respawns++; G.combo = 0; P.shield = P.maxShield; P.invuln = 3; G.shake = 2; G.slow = 0.6; sfx.down(); ui.flash('down');
    fx.explode(P.pos, 2.4, [0.4, 0.9, 2]); ui.banner('NOTSCHILD GEZÜNDET', 'Schild voll · Leben ∞');
  }
}

// ---------- KI ----------
function updateFighter(e, dt) {
  let T = e.tgt, des = t1;
  if (e.team === 0) {     // Flügelleute: nächsten Gegner jagen, sonst Formation halten
    if (!T || !T.alive || (e.timer -= dt) < 0) { let bd = 900; T = null; for (const x of G.ents) if (x.alive && x.team === 1 && x.fighter) { const d = x.pos.distanceTo(e.pos); if (d < bd) { bd = d; T = x; } } e.tgt = T; e.timer = 3; }
    if (!T) {
      const s = e.slot; t2.set((s % 2 ? 1 : -1) * (24 + s * 8), 3, -16 - s * 7).applyQuaternion(P.quat).add(P.pos).addScaledVector(P.fwd, 60);
      des.copy(t2).sub(e.pos); const d = des.length(); des.normalize(); e.speed = clamp(P.speed * (0.7 + d / 120), 30, 190); e.state = 'form';
    } else { e.speed = 80; if (e.state === 'form') e.state = 'attack'; }
  } else if (!T || (T !== P && !T.alive)) T = e.tgt = pickTarget(e);
  let dist = 0;
  if (T && e.state !== 'form') {
    t2.copy(T.pos).sub(e.pos); dist = t2.length();
    if (e.state === 'attack') {
      des.copy(t2).addScaledVector(T.vel, dist / 260).normalize();
      if (dist < e.breakDist) { e.state = 'break'; e.timer2 = rand(1.2, 2.6); randUnit(t3); e.breakDir = (e.breakDir || V()).copy(e.dir).multiplyScalar(0.5).add(t3).normalize(); }
      if (e.kind === 'ace') {   // weicht aus, wenn der Spieler auf sie zielt
        t3.copy(e.pos).sub(P.pos).normalize(); if (t3.dot(P.fwd) > 0.985 && dist < 420 && (e.jinkCd = (e.jinkCd || 0) - dt) < 0) { e.jinkCd = 1.6; e.state = 'break'; e.timer2 = 0.7; randUnit(t3); e.breakDir = (e.breakDir || V()).crossVectors(e.dir, t3).normalize(); }
        des.addScaledVector(UP, Math.sin(G.t * 2.3 + e.cd) * 0.35).normalize();
      }
    } else { des.copy(e.breakDir); if ((e.timer2 -= dt) < 0) { e.state = 'attack'; if (e.team === 1) e.tgt = pickTarget(e); } }
  }
  if (G.cap && !G.cap.dead) for (const h of G.cap.hull) { t3.copy(e.pos).sub(h.c); const d = t3.length(); if (d < h.r + 45) des.addScaledVector(t3.normalize(), 2.5 * (1 - d / (h.r + 45)) + 0.5).normalize(); }
  const ang = e.dir.angleTo(des); t4.copy(e.dir);
  if (ang > 1e-3) e.dir.lerp(des, Math.min(1, (e.turn * dt) / ang)).normalize();
  t4.cross(e.dir); e.bank += (clamp(-t4.y * 45, -1.1, 1.1) - e.bank) * Math.min(1, dt * 5);
  e.vel.copy(e.dir).multiplyScalar(e.speed); e.pos.addScaledVector(e.vel, dt);
  e.mesh.position.copy(e.pos); e.mesh.lookAt(t3.copy(e.pos).add(e.dir)); e.mesh.rotateZ(e.bank);
  if ((e.cd -= dt) < 0 && T && e.state === 'attack' && dist < 460) {
    t2.normalize(); if (t2.dot(e.dir) > 0.975) {
      if (e.team === 0) { newBolt(e.pos, t3.copy(T.pos).addScaledVector(T.vel, dist / 400).sub(e.pos).normalize(), 400, 0, 7, [0.5, 1.6, 4]).r = 1.5; e.cd = 0.22; }
      else if (e.kind === 'bomber') { const b = newBolt(e.pos, t2, 110, 1, e.def.dmg, [0.5, 3.4, 0.9], 2); b.w = b.len = 2.6; b.life = 4.5; b.r = 2; b.target = T; e.cd = e.def.fire * rand(0.8, 1.3); }
      else { t3.copy(T.pos).addScaledVector(T.vel, dist / 190).sub(e.pos).normalize(); randUnit(t4); t3.addScaledVector(t4, e.kind === 'ace' ? 0.018 : 0.035).normalize(); const b = newBolt(e.pos, t3, 190, 1, e.def.dmg, e.kind === 'ace' ? [3, 0.6, 4.5] : [0.4, 3.6, 0.6]); b.len = 7; e.cd = e.def.fire * rand(0.6, 1.4) * (e.burst = ((e.burst || 0) + 1) % 4 ? 0.22 : 1.6); if (dist < 300 && T === P) sfx.enemyShot(clamp(-t2.dot(P.right) * -1, -1, 1)); }
    } else e.cd = 0.15;
  }
  if (e.team === 1 && e.hp < e.maxHp * 0.5 && Math.random() < dt * 30) { fx.p(e.pos.x, e.pos.y, e.pos.z, rand(-4, 4), rand(-4, 4), rand(-4, 4), 0.9, 4.5, 0.22, 0.13, 0.09); if (Math.random() < 0.4) fx.p(e.pos.x, e.pos.y, e.pos.z, rand(-8, 8), rand(-8, 8), rand(-8, 8), 0.35, 2, 2.4, 1.0, 0.2); }   // Rauch und Flammen bei Schaden
  if (e.team === 1 && (e.trailT = (e.trailT || 0) - dt) < 0) { e.trailT = 0.045; fx.p(e.pos.x - e.dir.x * 4, e.pos.y - e.dir.y * 4, e.pos.z - e.dir.z * 4, 0, 0, 0, 0.35, 2.2, e.kind === 'ace' ? 1.2 : 1.6, 0.3, e.kind === 'ace' ? 2 : 0.2); }
  if (e.pos.distanceToSquared(P.pos) < (e.r + P.r) * (e.r + P.r) && e.team === 1) { hitPlayer(18, e.pos); damage(e, 60, true); }
}
function updateStatic(e, dt) {
  if (e.kind === 'turret') {
    const d = e.pos.distanceTo(P.pos); t2.copy(P.pos).addScaledVector(P.vel, d / 200).sub(e.pos);
    const head = e.mesh.userData.head; t3.copy(t2).normalize(); if (t3.y * e.upSign > -0.15) { head.lookAt(t4.copy(e.pos).add(t2)); }
    if ((e.cd -= dt) < 0 && d < 720 && t3.y * e.upSign > -0.1) { randUnit(t4); t3.addScaledVector(t4, 0.03).normalize(); const p = t4.copy(e.pos).addScaledVector(t3, 10).addScaledVector(UP, 3 * e.upSign); const b = newBolt(p, t3, 200, 1, e.def.dmg, [4, 1.4, 0.3]); b.len = 10; b.w = 0.8; e.cd = e.def.fire * rand(0.6, 1.3); if (d < 400) sfx.enemyShot(); }
  } else if (e.kind === 'buoy') { e.mesh.rotation.y += e.spin * dt; e.mesh.rotation.x += e.spin * 0.3 * dt; }
  else if (e.kind === 'rock') { e.mesh.rotateOnAxis(e.spinAx, e.spin * dt); }
  else if (e.kind === 'core') { e.mesh.rotation.y += dt * 0.6; e.mesh.rotation.x += dt * 0.25; }
  else if (e.kind === 'transport') { e.pos.z += e.speed * dt; e.vel.set(0, 0, e.speed); e.mesh.position.copy(e.pos); if (Math.random() < 0.5) fx.p(e.pos.x + rand(-5, 5), e.pos.y, e.pos.z - 40, 0, 0, -30, 0.5, 5, 0.4, 1.4, 3); }
  if (e.team !== 0 && e.kind !== 'rock' ? false : false) return;
  if (e.kind !== 'transport' && e.pos.distanceToSquared(P.pos) < (e.r + P.r) * (e.r + P.r) && P.hullCd <= 0) { bounce(e.pos, e.r); if (e.kind === 'rock') damage(e, 40, true); }
}
function bounce(c, r) {
  t3.copy(P.pos).sub(c).normalize(); P.pos.copy(c).addScaledVector(t3, r + P.r + 2); P.hullCd = 0.5; hitPlayer(14, P.pos); G.shake = 1;
  // Nase vom Hindernis wegdrehen
  const f = t4.copy(P.fwd).addScaledVector(t3, 1.2).normalize(); P.yaw = Math.atan2(f.x, f.z); P.pitch = clamp(-Math.asin(clamp(f.y, -1, 1)), -1.3, 1.3);
}
function updateCapital(dt) {
  const c = G.cap; if (!c || c.dead) return;
  if (c.core.shielded && !c.parts.some((p) => p.alive && p.kind === 'gen') && G.phaseDef?.goal !== 'core') { /* Phase schaltet den Schild ab */ }
  if (c.dying > 0) {
    c.dying -= dt; G.shake = Math.max(G.shake, 0.5);
    if (Math.random() < dt * 14) { const h = c.hull[(Math.random() * c.hull.length) | 0]; t1.copy(h.c).add(randUnit(t2).multiplyScalar(h.r)); fx.explode(t1, rand(1.5, 4)); if (Math.random() < 0.3) sfx.boom(2); }
    if (c.dying <= 0) {
      c.dead = true; world.remove(c.mesh); for (const p of c.parts) if (p.alive) { p.alive = false; world.remove(p.mesh); }
      for (const h of c.hull) fx.explode(h.c, 5); fx.flash(c.pos, 2600, [3, 2.4, 1.8], 1.6); fx.ring(c.pos, 1500, [1, 0.6, 0.3], 2.4); sfx.nova(); G.shake = 3; ui.flash('nova'); bossBeam.visible = false;
    }
    return;
  }
  if (!c.dread) return;
  // Hauptgeschütz der Monopol: 2,2 s rote Ziellinie, dann 1,4 s Strahl
  c.beamT -= dt;
  if (c.beamState === 0 && c.beamT < 0) { c.beamState = 1; c.beamT = 2.2; c.beamDir.copy(P.pos).addScaledVector(P.vel, 0.6).sub(c.muzzle).normalize(); sfx.warn(); ui.banner('HAUPTGESCHÜTZ!', 'Raus aus der roten Linie'); }
  else if (c.beamState === 1) { if (c.beamT > 1.1) c.beamDir.lerp(t1.copy(P.pos).sub(c.muzzle).normalize(), dt * 1.5).normalize(); if (c.beamT < 0) { c.beamState = 2; c.beamT = 1.4; sfx.nova(); G.shake = 1.5; } }
  else if (c.beamState === 2 && c.beamT < 0) { c.beamState = 0; c.beamT = rand(9, 13); }
  bossBeam.visible = c.beamState > 0;
  if (c.beamState) {
    const firing = c.beamState === 2, w = firing ? 13 + Math.sin(G.t * 50) * 3 : 0.6 + (Math.sin(G.t * 20) > 0 ? 0.5 : 0);
    bossBeam.position.copy(c.muzzle); bossBeam.lookAt(t1.copy(c.muzzle).add(c.beamDir)); bossBeam.scale.set(w, w, 4000); bossBeam.material.color.setRGB(firing ? 7 : 3, firing ? 1.6 : 0.1, firing ? 0.8 : 0.1);
    if (firing) { t1.copy(P.pos).sub(c.muzzle); const al = t1.dot(c.beamDir), perp = Math.sqrt(Math.max(0, t1.lengthSq() - al * al)); if (al > 0 && perp < 16) hitPlayer(45 * dt * 6, P.pos); fx.spark(t2.copy(c.muzzle).addScaledVector(c.beamDir, rand(0, 1500)), 2, 60, 0.5, 4, 4, 1, 0.4); }
  }
}

// ---------- Bolzen ----------
function updateBolts(dt) {
  const B = G.bolts, cap = G.cap && !G.cap.dead ? G.cap : null;
  for (let i = B.length - 1; i >= 0; i--) {
    const b = B[i]; b.life -= dt;
    if (b.kind && b.target && b.target.alive !== false && b.life > 0) {   // Zielsuche (Raketen, Bomberkugeln)
      t1.copy(b.target.pos).sub(b.pos).normalize(); const sp = b.vel.length(); t2.copy(b.vel).normalize().lerp(t1, Math.min(1, dt * (b.team === 0 ? 5 : 0.9))).normalize(); b.vel.copy(t2).multiplyScalar(b.team === 0 ? Math.min(380, sp + 260 * dt) : sp);
    }
    b.pos.addScaledVector(b.vel, dt);
    if (b.kind === 1) fx.p(b.pos.x, b.pos.y, b.pos.z, rand(-3, 3), rand(-3, 3), rand(-3, 3), 0.45, 2.4, 1.6, 0.8, 0.3);
    else if (b.kind === 2 && Math.random() < 0.6) fx.p(b.pos.x, b.pos.y, b.pos.z, rand(-6, 6), rand(-6, 6), rand(-6, 6), 0.4, 3, b.c[0] * 0.5, b.c[1] * 0.5, b.c[2] * 0.5);
    let hit = false;
    if (b.life > 0) {
      if (b.team === 1) {
        if (b.pos.distanceToSquared(P.pos) < (P.r + b.r + 1) ** 2) { hitPlayer(b.dmg, b.pos); hit = true; }
        else for (const e of G.ents) if (e.alive && (e.kind === 'transport' || e.kind === 'rock') && b.pos.distanceToSquared(e.pos) < e.r * e.r) { hit = true; if (e.kind === 'transport') { e.hp = Math.max(1, e.hp - b.dmg * 2.2); fx.spark(b.pos, 5, 30, 0.4, 2, 0.4, 2, 0.6); } break; }
      } else {
        for (const e of G.ents) { if (!e.alive || e.team === 0) continue; const rr = e.r + b.r; if (b.pos.distanceToSquared(e.pos) < rr * rr) { hit = true; if (!b.aoe) { damage(e, b.dmg); fx.spark(b.pos, 5, 36, 0.3, 1.6, b.c[0], b.c[1], b.c[2]); } break; } }
      }
      if (!hit && cap) for (const h of cap.hull) if (b.pos.distanceToSquared(h.c) < h.r * h.r) { hit = true; fx.spark(b.pos, 4, 30, 0.3, 1.5, 2, 1.4, 0.6); break; }
    }
    if (hit || b.life <= 0) {
      if (b.aoe && b.team === 0 && (hit || b.kind === 2)) {
        fx.explode(b.pos, b.aoe / 22, b.kind === 2 ? [1.2, 0.4, 1.6] : [1, 0.6, 0.2]); if (b.kind === 2) { fx.ring(b.pos, b.aoe * 1.3, [1.4, 0.4, 2], 0.5); sfx.boom(1.6); G.shake = Math.max(G.shake, 0.6); } else sfx.boom(0.7);
        for (const e of G.ents) if (e.alive && e.team !== 0) { const d = e.pos.distanceTo(b.pos) - e.r; if (d < b.aoe) damage(e, b.dmg * (1 - 0.5 * Math.max(0, d) / b.aoe), true); }
      }
      B[i] = B[B.length - 1]; B.pop(); G.freeBolts.push(b);
    }
  }
}

// ---------- Spieler ----------
function updatePlayer(dt) {
  let ix = 0, iy = 0;
  if (input.stickId >= 0) { ix = input.jx; iy = input.jy; }
  else {
    ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0); iy = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
    if (!ix && !iy && input.mouse && !isTouch) { const dz = 0.06, f = (v) => (Math.abs(v) < dz ? 0 : clamp((v - Math.sign(v) * dz) / 0.6, -1, 1)); ix = f(input.mx); iy = f(input.my * (H / W > 1 ? 1 : 1.2)); }
  }
  if (save.set.invertY) iy = -iy;
  // Autopilot zurück ins Kampfgebiet
  const off = t1.copy(P.pos).sub(G.center), od = off.length(); G.outside = od > 2300;
  P.sx += (ix - P.sx) * Math.min(1, dt * 9); P.sy += (iy - P.sy) * Math.min(1, dt * 9);
  const boosting = (keys.ShiftLeft || keys.ShiftRight || input.boost) && P.rollT <= 0;
  if (boosting && P.boost < 0.05) sfx.boost();
  P.boost += ((boosting ? 1 : 0) - P.boost) * Math.min(1, dt * 4);
  const eng = 1 + 0.08 * up('engine'), turn = 1.55 * P.def.turn * eng * (1 - P.boost * 0.35);
  P.yaw -= P.sx * turn * dt; P.pitch = clamp(P.pitch + P.sy * turn * 0.85 * dt, -1.35, 1.35);
  if (G.outside) { const want = Math.atan2(-off.x, -off.z); let d = want - P.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); P.yaw += clamp(d, -1, 1) * dt * 1.2; P.pitch += (Math.asin(clamp(off.y / od, -1, 1)) * 0.5 - P.pitch) * dt; }
  eul.set(P.pitch, P.yaw, 0); P.quat.setFromEuler(eul); P.fwd.set(0, 0, 1).applyQuaternion(P.quat); P.right.set(-1, 0, 0).applyQuaternion(P.quat);
  P.speed = 72 * P.def.speed * eng * (1 + P.boost * 0.95);
  P.vel.copy(P.fwd).multiplyScalar(P.speed);
  let spin = 0;
  if (P.rollT > 0) { P.rollT -= dt; const k = 1 - P.rollT / 0.5; P.vel.addScaledVector(P.right, P.rollDir * 150 * Math.sin(k * Math.PI)); spin = P.rollDir * k * Math.PI * 2; }
  P.rollCd -= dt; P.hullCd -= dt; P.invuln -= dt; P.fireCd -= dt;
  P.pos.addScaledVector(P.vel, dt);
  P.mesh.position.copy(P.pos); P.mesh.quaternion.copy(P.quat); P.inner.rotation.set(P.sy * 0.12, 0, P.sx * 0.85 + spin);
  P.mesh.visible = P.invuln <= 0 || Math.sin(G.t * 40) > -0.3;
  if ((P.regenT -= dt) < 0 && P.shield < P.maxShield) P.shield = Math.min(P.maxShield, P.shield + (14 + 5 * up('shield')) * dt);
  P.nova = Math.min(100, P.nova + (2.2 + up('nova') * 0.9) * dt);
  for (const en of P.inner.userData.engines) { t2.set(en[0], en[1], en[2]).applyQuaternion(P.mesh.quaternion).add(P.pos); const k = 1 + P.boost * 1.6; fx.p(t2.x, t2.y, t2.z, P.vel.x * 0.3 + rand(-2, 2), P.vel.y * 0.3 + rand(-2, 2), P.vel.z * 0.3 + rand(-2, 2), 0.2 * k, 1.5 * k, 0.12, 0.42 + P.boost * 0.4, 1.0); }
  if (G.cap && !G.cap.dead && P.hullCd <= 0) for (const h of G.cap.hull) if (P.pos.distanceToSquared(h.c) < (h.r + P.r) ** 2) { bounce(h.c, h.r); break; }
  // Zielerfassung
  let best = null, bs = 1e9;
  for (const e of G.ents) {
    if (!e.alive || e.team !== 1) continue; t2.copy(e.pos).sub(P.pos); const d = t2.length(); if (d > (e.fighter ? 760 : 1000)) continue;
    const ang = Math.acos(clamp(t2.dot(P.fwd) / d, -1, 1)); if (ang > 0.42) continue; const s = ang + d / 4000 + (e.shielded ? 0.5 : 0); if (s < bs) { bs = s; best = { e, ang, dist: d }; }
  }
  G.lock = best;
  const wantFire = input.fire || keys.Space || (save.set.autofire && best && best.ang < 0.2 && !best.e.shielded);
  if (wantFire) fire(dt); if (!wantFire || WEAPONS[P.weapon].id !== 'beam') { beam.visible = false; if (G.beamOn) { G.beamOn = false; sfx.beam(false); } }
}
function updateCamera(dt) {
  camFwd.lerp(P.fwd, 1 - Math.exp(-5.5 * dt)).normalize();
  const portrait = camera.aspect < 1, dist = (portrait ? 34 : 27) + P.boost * 5;
  camera.position.copy(P.pos).addScaledVector(camFwd, -dist).addScaledVector(UP, portrait ? 10 : 7.5);
  if (G.shake > 0) { camera.position.x += rand(-1, 1) * G.shake * 1.4; camera.position.y += rand(-1, 1) * G.shake * 1.4; G.shake = Math.max(0, G.shake - dt * 2.4); }
  camera.lookAt(t1.copy(P.pos).addScaledVector(camFwd, 70).addScaledVector(UP, 3));
  const fov = (portrait ? 84 : 62) + P.boost * 14; if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 5); camera.updateProjectionMatrix(); }
  if (G.closeup) { const c = G.closeup === 1 ? P : G.closeup, r = c.r || 5; camera.position.copy(c.pos).add(t1.set(r * 2.2, r * 1.3, r * 3.4).applyQuaternion(c.mesh.quaternion)); camera.lookAt(c.pos); }
  sky.position.copy(camera.position); far.position.copy(camera.position); fill.position.copy(camFwd).multiplyScalar(-1).addScaledVector(UP, 0.6); rim.position.copy(camFwd).addScaledVector(UP, 0.9);
  if (far.userData.planet) far.userData.planet.rotation.y += dt * 0.004;
}

// ---------- HUD-Markierungen (Canvas) ----------
const pv = V();
function project(p) { pv.copy(p).project(camera); return { x: (pv.x * 0.5 + 0.5) * W, y: (-pv.y * 0.5 + 0.5) * H, behind: pv.z > 1 }; }
function drawMarks() {
  hc.setTransform(DPR, 0, 0, DPR, 0, 0); hc.clearRect(0, 0, W, H); if (G.mode !== 'play') return;
  const goal = G.phaseDef?.goal; let arrows = 0;
  hc.lineWidth = 1.5; hc.font = '600 11px "Chakra Petch", sans-serif'; hc.textAlign = 'center';
  for (const e of G.ents) {
    if (!e.alive || e.team !== 1) continue; const obj = goal ? e.kind === goal : e.objective, s = project(e.pos), d = e.pos.distanceTo(P.pos);
    const on = !s.behind && s.x > 0 && s.x < W && s.y > 0 && s.y < H, col = obj ? '#ffb347' : '#ff5a4d';
    if (on) {
      if (d > 1400 && !obj) continue; const r = clamp((e.r * 520) / d, 7, 46); hc.strokeStyle = col; hc.globalAlpha = obj ? 0.95 : 0.6;
      hc.beginPath(); for (const [ax, ay] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { hc.moveTo(s.x + ax * r, s.y + ay * r * 0.5); hc.lineTo(s.x + ax * r, s.y + ay * r); hc.lineTo(s.x + ax * r * 0.5, s.y + ay * r); } hc.stroke();
      if (e.hp < e.maxHp) { hc.globalAlpha = 0.9; hc.fillStyle = '#2a0d0d'; hc.fillRect(s.x - r, s.y - r - 7, r * 2, 3); hc.fillStyle = col; hc.fillRect(s.x - r, s.y - r - 7, r * 2 * clamp(e.hp / e.maxHp, 0, 1), 3); }
    } else if ((obj || d < 500) && arrows < 10) {
      arrows++; let dx = s.x - W / 2, dy = s.y - H / 2; if (s.behind) { dx = -dx; dy = -dy; } const a = Math.atan2(dy, dx), rx = W / 2 - 34, ry = H / 2 - 34, k = Math.min(rx / Math.abs(Math.cos(a) || 1e-6), ry / Math.abs(Math.sin(a) || 1e-6));
      hc.save(); hc.translate(W / 2 + Math.cos(a) * k, H / 2 + Math.sin(a) * k); hc.rotate(a); hc.globalAlpha = obj ? 0.95 : 0.55; hc.fillStyle = col; hc.beginPath(); hc.moveTo(12, 0); hc.lineTo(-6, -8); hc.lineTo(-2, 0); hc.lineTo(-6, 8); hc.closePath(); hc.fill(); hc.restore();
    }
  }
  for (const e of G.ents) if (e.alive && e.kind === 'transport') { const s = project(e.pos); if (!s.behind) { hc.globalAlpha = 0.8; hc.strokeStyle = '#59c8ff'; hc.strokeRect(s.x - 14, s.y - 8, 28, 16); hc.fillStyle = '#59c8ff'; hc.fillRect(s.x - 14, s.y + 12, 28 * (e.hp / e.maxHp), 3); } }
  // Fadenkreuz und Zielerfassung
  const c = project(t1.copy(P.pos).addScaledVector(P.fwd, 420)); hc.globalAlpha = 0.9; hc.strokeStyle = '#eaf6ff'; hc.lineWidth = 1.5;
  hc.beginPath(); hc.arc(c.x, c.y, 13, 0, 6.283); for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { hc.moveTo(c.x + ax * 18, c.y + ay * 18); hc.lineTo(c.x + ax * 26, c.y + ay * 26); } hc.stroke(); hc.fillStyle = '#eaf6ff'; hc.fillRect(c.x - 1, c.y - 1, 2, 2);
  const L = G.lock;
  if (L) {
    const s = project(L.e.pos), r = clamp((L.e.r * 520) / L.dist, 12, 54) + 6, hot = L.ang < 0.2 && !L.e.shielded; hc.strokeStyle = hot ? '#7dffb0' : '#ffd166'; hc.lineWidth = 2; hc.globalAlpha = 1;
    hc.save(); hc.translate(s.x, s.y); hc.rotate(G.t * 1.5); hc.beginPath(); for (let i = 0; i < 4; i++) { hc.moveTo(Math.cos(i * 1.571 + 0.3) * r, Math.sin(i * 1.571 + 0.3) * r); hc.arc(0, 0, r, i * 1.571 + 0.3, i * 1.571 + 1.27); } hc.stroke(); hc.restore();
    hc.fillStyle = hc.strokeStyle; hc.fillText(`${L.e.def.name.toUpperCase()}  ${Math.round(L.dist)} m${L.e.shielded ? '  · SCHILD' : ''}`, s.x, s.y + r + 16);
    if (hot && L.e.fighter) { const lp = project(t1.copy(L.e.pos).addScaledVector(L.e.vel, L.dist / (WEAPONS[P.weapon].speed || 2000))); hc.beginPath(); hc.arc(lp.x, lp.y, 4, 0, 6.283); hc.stroke(); }
  }
  hc.globalAlpha = 1;
}

// ---------- Hauptschleife ----------
let last = performance.now(), hudT = 0, menuYaw = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (G.mode === 'play') {
    if (G.slow > 0) { G.slow -= dt; dt *= 0.35; }
    G.t += dt; G.stats.time += dt;
    updatePlayer(dt);
    for (const e of G.ents) { if (!e.alive) continue; if (e.fighter) updateFighter(e, dt); else updateStatic(e, dt); if (e.flashT > 0) e.flashT -= dt; }
    updateCapital(dt); updateBolts(dt);
    for (let i = G.ents.length - 1; i >= 0; i--) if (!G.ents[i].alive) G.ents.splice(i, 1);
    if ((G.comboT -= dt) < 0) G.combo = 0;
    const tr = G.ents.filter((e) => e.kind === 'transport'); if (tr.length) { G.stats.convoy = tr.reduce((s, e) => s + e.hp / e.maxHp, 0) / tr.length; G.center.set(0, -30, tr[0].pos.z); }
    // Phasenfortschritt
    if (G.phaseDef) { G.phaseT += dt; if (G.phaseT > 1 && remaining() === 0) nextPhase(); }
    else if (G.endT > 0 && !(G.cap && !G.cap.dead)) { G.endT -= dt; if (G.endT <= 0) finishMission(false); }
    const threat = G.ents.some((e) => e.team === 1 && e.alive); G.intensity += ((threat ? 1 : 0.4) - G.intensity) * dt; setIntensity(G.intensity);
    updateCamera(dt); fx.update(dt, camera); boltMesh.draw(G.bolts);
    if ((hudT -= dt) < 0) { hudT = 0.06; ui.hud({ P, G, remaining: remaining(), outside: G.outside }); }
  } else if (G.mode !== 'pause') {
    // Hangar und Titel: langsamer Kameraschwenk durch den Himmel
    menuYaw += dt * 0.05; const my = menuBase + Math.sin(menuYaw) * 0.35; camera.position.set(0, 0, 0); if (Math.abs(camera.fov - 62) > 0.1) { camera.fov = 62; camera.updateProjectionMatrix(); } camera.lookAt(Math.sin(my) * 10, 0.6 + Math.sin(menuYaw * 0.7) * 0.5, Math.cos(my) * 10); sky.position.set(0, 0, 0); far.position.set(0, 0, 0);
    if (showcase.children.length) {   // Hangar: gewähltes Schiff dreht sich vor der Kamera
      camera.updateMatrixWorld(); const tall = camera.aspect < 1;
      showcase.position.set(0, tall ? 4.6 : 3.4, tall ? -40 : -22).applyMatrix4(camera.matrixWorld); showcase.rotation.set(0.28, showcase.rotation.y + dt * 0.5, 0.1);
      camera.getWorldDirection(t1); fill.position.copy(t1).multiplyScalar(-1).addScaledVector(UP, 0.6); rim.position.copy(t1).addScaledVector(UP, 0.9);
    }
    fx.update(dt, camera); boltMesh.draw(G.bolts);
  }
  drawMarks();
  if (composer) composer.render(); else renderer.render(scene, camera);
}

const showcase = new THREE.Group(); scene.add(showcase);
function setShowcase(id) { showcase.clear(); if (id) showcase.add(buildPlayerShip(id)); }

// ---------- Oberfläche ----------
const ui = createUI({
  save, persist, up, doneCount, isTouch,
  start: startMission,
  resume: () => setPause(false),
  pause: () => setPause(true),
  quit: () => { if (G.mission?.endless && G.stats.wave > 1) { G.mode = 'play'; ui.showPause(false); finishMission(true); } else toHangar(); },
  toHangar: () => toHangar(),
  settings: () => { audioState.sound = save.set.sound; audioState.music = save.set.music; applyAudioState(); persist(); },
  quality: () => { persist(); setupQuality(); },
  act: { roll, nova, setWeapon, cycleWeapon, fire: (v) => { input.fire = v; }, boost: (v) => { input.boost = v; } },
  audio: () => { initAudio(); startMusic(); },
  getWeapon: () => P.weapon,
  showcase: setShowcase,
});
function toHangar() { clearWorld(); G.mode = 'hangar'; G.mission = null; setIntensity(0.1); buildEnv(ENVS[['kerasis', 'belt', 'deep'][doneCount() % 3]]); ui.showHangar(); }
window.claude?.hot?.snapshot?.(() => ({}));
setupQuality(); buildEnv(ENVS.kerasis); ui.showTitle(); requestAnimationFrame(frame);
if (new URLSearchParams(location.search).has('debug')) window.__nova = { G, P, save, startMission, MISSIONS, ENDLESS, kill, nextPhase, finishMission, input, toHangar };
