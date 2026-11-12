// NOVA SQUADRON — Spielkern: Welt, Spieler, Gegner-KI, Waffen, Missionsablauf, Kamera, Renderer.
import * as THREE from '../vendor/three.module.min.js';
import { EffectComposer } from '../vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/addons/postprocessing/OutputPass.js';
import { WEAPONS, UPGRADES, SHIPS, ENEMIES, ENVS, MISSIONS, ENDLESS, wavePhase, RUN_UPS, BOSS_UPS } from './data.js';
import { MATS, ROCK_MATS, buildPlayerShip, buildEnemy, buildCapital, buildAsteroidGeos, buildStation, buildSatellite } from './ships.js';
import { Blast } from './blast.js';
import { FX, BoltMesh } from './fx.js';
import { sfx, initAudio, startMusic, setIntensity, setScene, musicInfo, audioState, applyAudioState, suspendAudio } from './audio.js';
import { createUI } from './ui.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const randUnit = (out) => out.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
const t1 = V(), t2 = V(), t3 = V(), t4 = V(), UP = V(0, 1, 0);

// ---------- Spielstand ----------
const SAVE_KEY = 'nova-squadron-save-v1';
const save = { seenIntro: false, credits: 0, up: {}, done: {}, ship: 'pfeil', bestWave: 0, bestScore: 0, set: { pace: 0.88, quality: 'high', sound: true, music: true, invertY: false, autofire: null } };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s) { Object.assign(save, s, { set: { ...save.set, ...(s.set || {}) } }); } } catch { /* ohne Speicher spielbar */ }
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* egal */ } };
const up = (id) => (save.up[id] || 0) + (G.run?.up[id] || 0);   // Hangar-Upgrades plus Upgrades des laufenden Wellen-Gefechts
const doneCount = () => MISSIONS.filter((m) => !m.tutorial && save.done[m.id]).length;
const weaponOpen = (i) => !!WEAPONS[i] && (G.run ? G.run.weapons.has(i) : WEAPONS[i].unlock <= doneCount() || !!G.mission?.tutorial);
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
  if (!texCache[name]) { const t = texLoader.load(globalThis.NOVA_ASSETS?.[name] || `./assets/${name}.jpg`, (tt) => { if (name.startsWith('sky')) { const e = tt.clone(); e.mapping = THREE.EquirectangularReflectionMapping; e.wrapS = THREE.RepeatWrapping; e.repeat.x = 1; e.needsUpdate = true; envCache[name] = pmrem.fromEquirectangular(e).texture; if (curSky === name) scene.environment = envCache[name]; } }); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texCache[name] = t; }
  return texCache[name];
}
const skyMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false });
skyMat.color.setRGB(0.62, 0.62, 0.62);
const sky = new THREE.Mesh(new THREE.SphereGeometry(8000, 48, 24), skyMat); sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
const far = new THREE.Group(); scene.add(far);       // Planet, Sonne: folgen der Kamera (unendlich weit weg)
const world = new THREE.Group(); scene.add(world);   // alles, was pro Mission neu entsteht
const fx = new FX(scene, save.set.quality), boltMesh = new BoltMesh(scene), blast = new Blast(scene, save.set.quality);
// Explosion: Blitz, Druckring, wenige heiße Funken, dazu Feuerball, Feuerring, Rauch und Trümmer aus blast.js
function explode(pos, size = 1, tint = [1, 0.55, 0.2], inherit, o = {}) {
  fx.flash(pos, 13 * size + 9, [1.7, 1.4, 1.0], 0.14 + size * 0.02); if (o.ring) fx.ring(pos, 30 * size, tint, 0.5 + size * 0.08);
  fx.spark(pos, Math.min(40, 8 + size * 7) | 0, 70 * Math.sqrt(size) + 25, 0.7 + size * 0.12, 0.55 + size * 0.1, 2.6, 1.7, 0.7, inherit);
  blast.explode(pos, size, inherit, { plasma: tint[2] > tint[0] * 1.2 ? 1 : 0, ...o });
}
const rockGeos = buildAsteroidGeos(save.set.quality === 'low' ? 8 : 16);
{ const rt = tex('tex_rock'); rt.wrapS = rt.wrapT = THREE.RepeatWrapping; for (const m of ROCK_MATS) { m.map = rt; m.bumpMap = rt; } const st = tex('tex_solar'); st.wrapS = st.wrapT = THREE.RepeatWrapping; MATS.solar.map = st; }
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
const G = { run: null, locks: [], choiceT: 0, mode: 'title', t: 0, ents: [], bolts: [], freeBolts: [], mission: null, phase: -1, phaseDef: null, phaseT: 0, cap: null, center: V(), stats: null, shake: 0, slow: 0, endT: 0, combo: 0, comboT: 0, lock: null, beamOn: false, intensity: 0 };
const P = { heat: [0, 0, 0, 0, 0], over: [0, 0, 0, 0, 0], heatT: 0, pos: V(), yaw: 0, pitch: 0, quat: new THREE.Quaternion(), fwd: V(0, 0, 1), right: V(-1, 0, 0), vel: V(), sx: 0, sy: 0, speed: 70, shield: 100, maxShield: 100, regenT: 0, invuln: 0, rollT: 0, rollDir: 1, rollCd: 0, boost: 0, fireCd: 0, weapon: 0, gun: 0, nova: 0, mesh: null, inner: null, def: SHIPS[0], r: 4.5, hullCd: 0, team: 0 };
const CORV_GUNS = [[20, -0.4, 14], [-20, -0.4, 14], [14, 2.4, 24], [-14, 2.4, 24], [3.4, 8.6, 28], [-3.4, 8.6, 28]];
const qMan = new THREE.Quaternion(), XAX = V(1, 0, 0);
const camFwd = V(0, 0, 1), eul = new THREE.Euler(0, 0, 0, 'YXZ');
// Nova-Welle: flacher Ring in der Ebene des Schiffs und eine dünne Kugelschale
const waveRing = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.09, 160, 1, true), new THREE.ShaderMaterial({ uniforms: { fade: { value: 1 }, time: { value: 0 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  vertexShader: 'varying float vY; varying float vA; void main(){ vY=position.y/0.045; vA=atan(position.z,position.x); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform float fade; uniform float time; varying float vY; varying float vA; void main(){ float core=exp(-vY*vY*26.0); float halo=exp(-vY*vY*3.2); float fl=0.75+0.25*sin(vA*46.0+time*14.0)*sin(vA*17.0-time*9.0); gl_FragColor=vec4((vec3(1.3,1.6,2.4)*core*1.0+vec3(0.25,0.55,1.5)*halo*0.35*fl)*fade,1.0); }' }));
const waveShell = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.ShaderMaterial({ uniforms: { fade: { value: 1 } }, transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
  fragmentShader: 'uniform float fade; varying vec3 vN; varying vec3 vV; void main(){ float rim=pow(1.0-abs(dot(vN,vV)),3.0); float edge=pow(1.0-abs(dot(vN,vV)),9.0); gl_FragColor=vec4((vec3(0.3,0.55,1.3)*rim*0.5+vec3(0.9,1.3,2.4)*edge*2.6)*fade,1.0); }' }));
waveRing.visible = waveShell.visible = false; waveRing.frustumCulled = waveShell.frustumCulled = false; scene.add(waveRing, waveShell);
const beam = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 8, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5), new THREE.MeshBasicMaterial({ blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
beam.material.color.setRGB(1.2, 2.6, 6); beam.visible = false; scene.add(beam);
const bossBeam = new THREE.Mesh(beam.geometry, new THREE.MeshBasicMaterial({ blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); bossBeam.visible = false; scene.add(bossBeam);

// ---------- Eingabe ----------
const keys = {}, input = { sx: 0, sy: 0, fire: false, boost: false, mouse: false, mx: 0, my: 0, stickId: -1, stx: 0, sty: 0, jx: 0, jy: 0 };
addEventListener('keydown', (e) => {
  if (e.repeat) return; keys[e.code] = true; if (G.mode !== 'play') { if (G.mode === 'pause' && (e.code === 'Escape' || e.code === 'KeyP')) setPause(false); return; }
  if (e.code === 'KeyQ') roll(-1); else if (e.code === 'KeyE') roll(1); else if (e.code === 'KeyF') nova(); else if (e.code === 'KeyR') maneuver('loop'); else if (e.code === 'KeyX') maneuver('turn');
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
  const e = { kind, team: 1, pos: pos.clone(), dir: V(0, 0, 1), vel: V(), speed: d.speed || 0, turn: d.turn || 0, hp: d.hp || 1, maxHp: d.hp || 1, r: d.r || 5, def: d, alive: true, state: 'attack', timer: 0, cd: rand(0.5, 2), bank: 0, objective: false, fighter: !!d.speed && !d.static, tgt: null, flashT: 0, ...o };
  if (!e.mesh) { const v = kind === 'drone' ? ['drone', 'drone2', 'drone3'] : kind === 'inter' ? ['inter', 'inter2'] : [kind]; e.mesh = buildEnemy(v[(Math.random() * v.length) | 0]); }   // mehrere Rumpfformen je Typ
  if (e.team === 1 && e.fighter && !d.big) { e.mesh.scale.setScalar(1.3); e.r *= 1.25; }   // Gegner größer als die eigenen Jäger
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
  if (kind === 'target') { for (let i = 0; i < n; i++) { const e = addEnt('target', t1.copy(P.pos).addScaledVector(P.fwd, 260 + i * 70).addScaledVector(P.right, (i - (n - 1) / 2) * 80).addScaledVector(UP, (i % 2) * 40 - 10), { objective }); e.spin = 0.5; fx.flash(e.pos, 50, [1, 0.8, 0.3], 0.5); } return; }
  if (kind === 'hauler') { for (let i = 0; i < n; i++) { const p = spawnAround(600, 760, V()), e = addEnt('hauler', p, { objective }); e.dir.copy(P.pos).sub(p).cross(UP).normalize().multiplyScalar(i % 2 ? 1 : -1); e.dir.y = 0; e.dir.normalize(); fx.flash(p, 120, [1.4, 1.0, 0.3], 0.7); fx.ring(p, 160, [1, 0.7, 0.2], 1); } return; }
  if (kind === 'buoy') { for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + rand(0.6), e = addEnt('buoy', V(Math.cos(a) * rand(300, 620), rand(-120, 120), Math.sin(a) * rand(300, 620) + 250), { objective }); e.spin = rand(0.3, 0.8); } return; }
  const c = spawnAround(560, 820, V());
  for (let i = 0; i < n; i++) {
    const p = c.clone().add(randUnit(t1).multiplyScalar(rand(20, 90))), e = addEnt(kind, p, { objective });
    e.dir.copy(P.pos).sub(p).normalize(); e.tgt = pickTarget(e); e.breakDist = kind === 'bomber' ? 110 : kind === 'kami' ? 0 : kind === 'corvette' ? 240 : rand(50, 90); if (kind === 'kami') e.tgt = P;
    if (G.mission.endless) { const k = (1 + G.phase * 0.05) * (G.phaseDef?.boss && (kind === 'corvette' || kind === 'ace') ? 1.6 : 1); e.hp = e.maxHp = e.hp * k; }
    e.baseSpeed = e.speed * rand(0.72, 1.2); e.pace = 1; e.paceT = rand(1.5, 5);   // jeder fliegt sein eigenes Tempo
    fx.flash(p, 60, [1.2, 0.4, 0.3], 0.5);
  }
  fx.ring(c, 120, [1, 0.3, 0.2], 0.9);
}
function spawnCapital(dread) {
  const mesh = buildCapital(dread), pos = dread ? V(260, -90, 1250) : V(150, -50, 820); mesh.position.copy(pos); world.add(mesh);
  const u = mesh.userData, cap = G.cap = { mesh, pos, dread, hull: u.hull.map(([x, y, z, r]) => ({ c: V(x, y, z).add(pos), r })), dying: 0, beamT: 9, beamState: 0, beamDir: V(), muzzle: V(0, 0, 235 * u.k).add(pos), parts: [] };
  for (const [x, y, z, rot] of u.turrets) { const e = addEnt('turret', V(x, y, z).add(pos), { cap, objective: true }); e.mesh.rotation.z = rot; e.upSign = rot ? -1 : 1; cap.parts.push(e); }
  for (const [x, y, z] of u.gens) { const e = addEnt('gen', V(x, y, z).add(pos), { cap }); if (dread) e.mesh.scale.setScalar(1.3), (e.r = 18), (e.hp = e.maxHp = 950); cap.parts.push(e); }
  const core = addEnt('core', V(...u.core).add(pos), { cap, shielded: true }); if (dread) { core.hp = core.maxHp = 7000; core.mesh.scale.setScalar(1.4); core.r = 28; } cap.core = core; cap.parts.push(core);
  G.center.copy(pos);
}
function addAlly() {
  const i = G.ents.filter((e) => e.kind === 'ally').length, e = addEnt('ally', t1.set((i % 2 ? 1 : -1) * (22 + i * 9), 4, -18 - i * 8).applyQuaternion(P.quat).add(P.pos), { team: 0, mesh: buildPlayerShip(i % 3 === 2 ? 'wespe' : 'pfeil', true), speed: 76, turn: 1.7, r: 5, fighter: true, slot: i, hp: 1e9 });
  e.breakDist = 70; fx.flash(e.pos, 40, [0.6, 1.2, 3], 0.5); return e;
}
function addRock(p, r, gen = 0) {
  const i = (Math.random() * 1000) | 0, mesh = new THREE.Mesh(rockGeos[i % rockGeos.length], ROCK_MATS[i % 3]); mesh.scale.setScalar(r); mesh.rotation.set(rand(6), rand(6), rand(6));
  const e = addEnt('rock', p, { team: 2, mesh, r: r * 0.9, hp: r * 4, maxHp: r * 4, def: { credit: 8, score: 20, name: 'Asteroid' }, fighter: false, gen }); e.spinAx = randUnit(V()); e.spin = rand(0.03, 0.22) * (1 + gen); randUnit(e.vel).multiplyScalar(rand(3, 15)); e.vel.y *= 0.3; return e;
}
function clearWorld() {
  G.wave = null; waveRing.visible = waveShell.visible = false; for (const e of G.ents) world.remove(e.mesh); G.ents.length = 0; G.bolts.length = 0; world.clear(); G.cap = null; beam.visible = bossBeam.visible = false; sfx.beam(false);
}

// ---------- Mission ----------
function startMission(m) {
  initAudio(); startMusic(); clearWorld(); setShowcase(null); P.man = null; P.flip = 0; P.brake = 0; P.manCd = 0; G.did = {}; G.mission = m; G.run = m.waves ? { up: {}, weapons: new Set([0]) } : null; G.choiceT = 0; G.locks = []; P.jam = null; P.tailCd = 0; P.heat = [0, 0, 0, 0, 0]; P.over = [0, 0, 0, 0, 0]; P.heatT = 0; setScene('music_battle'); G.phase = -1; G.phaseDef = null; G.t = 0; G.endT = 0; G.combo = 0; G.center.set(0, 0, 0);
  G.stats = { kills: 0, score: 0, credits: 0, respawns: 0, time: 0, wave: 0, convoy: 1, miles: 0 }; G.wave = null; P.stun = 0;
  const env = ENVS[m.env]; buildEnv(env);
  P.def = SHIPS.find((s) => s.id === save.ship) || SHIPS[0];
  P.mesh = new THREE.Group(); P.inner = buildPlayerShip(P.def.id); P.mesh.add(P.inner); world.add(P.mesh);
  P.pos.set(0, 0, 0); P.yaw = P.pitch = 0;   recalcShield(true); P.invuln = 2; P.nova = 40; P.rollT = 0; P.weapon = Math.min(P.weapon, 4);
  if (!weaponOpen(P.weapon) || m.tutorial || m.waves) P.weapon = 0;
  camFwd.set(0, 0, 1);
  for (let i = 0; i < 1 + up('wing'); i++) addAlly();
  for (let i = 0; i < Math.max(14, env.asteroids); i++) {   // Asteroiden treiben durch jedes Kampfgebiet
    const r = rand(7, 40) * (Math.random() < 0.14 ? 2.2 : 1), p = randUnit(V()).multiplyScalar(rand(170, 1150)); p.y *= 0.45; p.z += 250; addRock(p, r);
  }
  if (m.station) { const e = addEnt('station', V(-420, 50, 640), { team: 0, mesh: buildStation(), r: 34, hp: 1e9, fighter: false, solid: true, def: { name: 'Handelsstation' } }); e.mesh.rotation.z = 0.25; }
  for (let i = 0; i < 4; i++) { const p = randUnit(V()).multiplyScalar(rand(260, 900)); p.y *= 0.4; p.z += 300; const e = addEnt('sat', p, { team: 0, mesh: buildSatellite(), r: 7, hp: 1e9, fighter: false, solid: true, def: { name: 'Relais-Satellit' } }); e.mesh.rotation.set(rand(6), rand(6), rand(6)); e.spin = rand(0.05, 0.2); }
  for (let i = 0; i < (m.convoy || 0); i++) addEnt('transport', V((i - 1) * 90, -30 - (i % 2) * 25, 160 - Math.abs(i - 1) * 70), { team: 0, speed: 16, hp: 900, maxHp: 900, r: 26, fighter: false, def: { name: 'Frachter' } });
  ui.showGame(m, m.endless ? 0 : m.phases.length); G.mode = 'play'; setIntensity(0.5); nextPhase();
}
function nextPhase() {
  const m = G.mission; G.phase++;
  if (G.phase > 0 && !m.waves) {   // Meilenstein: jede abgeschlossene Phase zählt und bringt eine Prämie
    const bonus = m.tutorial ? 30 : 60 + 40 * (m.n || 2); G.stats.credits += bonus; G.stats.miles = G.phase; sfx.phase();
    ui.milestone(G.phase, m.endless ? 0 : m.phases.length, bonus);
  }
  const def = m.endless ? wavePhase(G.phase + 1) : m.phases[G.phase];
  if (!def) { G.endT = 2.6; G.phaseDef = null; return; }
  G.phaseDef = def; G.phaseT = 0; G.stats.wave = G.phase + 1; G.did = {}; if (def.task === 'nova') P.nova = 100;
  for (const g of def.spawn || []) spawnGroup(g, !def.goal);
  if (def.goal === 'core' && G.cap) { G.cap.core.shielded = false; G.cap.core.mesh.userData.shield.visible = false; fx.ring(G.cap.core.pos, 160, [0.3, 1, 0.6], 1.2); }
  (def.comms || []).forEach(([n, t], i) => setTimeout(() => G.mode !== 'title' && ui.comms(n, t), 900 + i * 3800));
  if (G.phase > 0) setTimeout(() => { if (G.mode === 'play' && G.phaseDef === def) ui.banner(def.label.toUpperCase(), m.endless ? '' : `Nächstes Ziel · ${G.phase + 1} von ${m.phases.length}`); }, 1900);
}
// Wellen-Gefecht: Welle geschafft, Fanfare, dann eines von zwei Upgrades wählen (nach einem Boss zusätzlich ein Sonder-Upgrade)
function waveDone() {
  const boss = !!G.phaseDef.boss, n = G.phase + 1, bonus = 80 + 20 * n + (boss ? 400 : 0); G.bossPick = boss; G.stats.credits += bonus; G.stats.miles = n; save.bestWave = Math.max(save.bestWave, n);
  sfx.fanfare(boss); G.slow = 0.5; if (boss) ui.comms('Charlie', 'WUFF! (Mini übersetzt: Das war der Boss.)'); ui.banner(boss ? 'BOSS BESIEGT' : `WELLE ${n} GESCHAFFT`, `+${bonus} Credits · Upgrade wählen`); G.choiceT = boss ? 2.8 : 1.8;
}
function pickOptions(boss) {
  const r = G.run, lv = (id) => r.up[id] || 0, next = WEAPONS.findIndex((w, i) => !r.weapons.has(i));
  let pool = (boss ? BOSS_UPS : RUN_UPS).filter((u) => (u.id === 'weapon' || u.id === 'arsenal' ? next >= 0 : true) && (u.max ? lv(u.id) < u.max : true) && (u.id === 'lock' ? r.weapons.has(2) : true) && (u.id === 'super' ? !lv('super') : true))
    .map((u) => (u.id === 'weapon' ? { ...u, name: 'Neue Waffe: ' + WEAPONS[next].name, desc: WEAPONS[next].desc, w: next, icon: WEAPONS[next].id } : u));
  const out = []; if (!boss && next >= 0 && (G.phase === 0 || G.phase === 2 || G.phase === 5)) { const w = pool.find((u) => u.id === 'weapon'); out.push(w); pool = pool.filter((u) => u !== w); }   // früh eine zweite Waffe anbieten
  while (out.length < 2 && pool.length) out.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
  return out.map((u) => ({ ...u, lvl: lv(u.id) }));
}
function recalcShield(fill) { P.maxShield = Math.round((100 + 25 * up('shield')) * P.def.shield); if (fill) P.shield = P.maxShield; }
function applyUp(o) {
  const r = G.run, add = (id, n = 1) => { r.up[id] = (r.up[id] || 0) + n; }; add(o.id); sfx.pick();
  if (o.id === 'weapon') { r.weapons.add(o.w); P.weapon = o.w; } else if (o.id === 'arsenal') { WEAPONS.forEach((w, i) => r.weapons.add(i)); }
  else if (o.id === 'wing') addAlly(); else if (o.id === 'squad') { add('wing', 2); addAlly(); addAlly(); }
  else if (o.id === 'over') add('dmg', 3); else if (o.id === 'aegis') add('shield', 4); else if (o.id === 'super') add('nova', 2);
  recalcShield(true); ui.weaponChanged(true);
}
function openChoice() {
  G.mode = 'choice'; sfx.engine(-1); sfx.beam(false); const boss = G.bossPick, opts = pickOptions(boss);
  if (!opts.length) { G.bossPick = false; G.mode = 'play'; last = performance.now(); return nextPhase(); }
  ui.showChoice({ boss, wave: G.phase + 1, opts }, (o) => { applyUp(o); if (G.bossPick) { G.bossPick = false; openChoice(); } else { ui.hideChoice(); G.mode = 'play'; last = performance.now(); nextPhase(); } });
}
function remaining() {
  const d = G.phaseDef; if (!d) return 0;
  if (d.task) return (d.task === 'speed' ? G.did.boost && G.did.brake : G.did[d.task]) ? 0 : 1;
  if (d.goal) return G.ents.reduce((n, e) => n + (e.alive && e.kind === d.goal ? 1 : 0), 0);
  return G.ents.reduce((n, e) => n + (e.alive && e.objective ? 1 : 0), 0);
}
function finishMission(quit) {
  const m = G.mission, s = G.stats; G.mode = 'result'; sfx.beam(false); sfx.engine(-1);
  const won = !quit || m.endless; let stars = 0, bonus = 0;
  if (won && !m.endless) {
    stars = s.respawns === 0 ? 3 : s.respawns <= 3 ? 2 : 1; if (m.convoy && s.convoy < 0.5) stars = Math.min(stars, 2);
    const first = !save.done[m.id]; bonus = m.tutorial ? (first ? 500 : 100) : 500 * m.n * (first ? 2 : 1); if (m.tutorial) stars = 3; save.done[m.id] = Math.max(save.done[m.id] || 0, stars);
  }
  if (m.endless) { bonus = (s.wave - 1) * 120; save.bestWave = Math.max(save.bestWave, s.wave - 1); }
  save.bestScore = Math.max(save.bestScore, s.score); save.credits += s.credits + bonus; persist();
  if (won) sfx.win(); setIntensity(0.1);
  ui.showResult({ m, s, stars, bonus, won, newWeapon: won && !m.endless ? WEAPONS.find((w) => w.unlock === doneCount() && w.unlock > 0 && stars && m.n === w.unlock) : null, newShip: won && !m.endless ? SHIPS.find((x) => x.unlock > 0 && x.unlock === m.n) : null });
}
function setPause(p) { if (p && G.mode === 'play') { G.mode = 'pause'; sfx.beam(false); sfx.engine(-1); ui.showPause(true); } else if (!p && G.mode === 'pause') { G.mode = 'play'; ui.showPause(false); last = performance.now(); } }

// ---------- Spieleraktionen ----------
function roll(dir) { if (G.mode !== 'play' || P.rollCd > 0 || P.man) return; P.rollT = 0.5; P.rollDir = dir; P.rollCd = 1.1; sfx.roll(); G.did.roll = true; }
// Kunstflug: Looping (voller Kreis, danach gleiche Richtung) und Wende (halber Looping mit Rolle, danach Gegenrichtung). Unverwundbar dabei.
function maneuver(type) { if (G.mode !== 'play' || P.man || P.rollT > 0 || P.manCd > 0) return; P.man = { type, t: 0, dur: type === 'loop' ? 1.7 : 1.2, base: P.quat.clone() }; P.manCd = (type === 'loop' ? 1.7 : 1.2) + 0.3; sfx.loop(); G.did[type] = true; ui.banner(type === 'loop' ? 'LOOPING' : 'WENDE', ''); }
function setWeapon(i) { if (P.jam && P.jam.w === i) return sfx.deny(); if (weaponOpen(i) && i !== P.weapon) { P.weapon = i; sfx.click(); G.did.weapon = true; ui.weaponChanged(true); ui.toast(WEAPONS[i].name + ' · Munition ∞'); } }
function cycleWeapon(d) { const n = WEAPONS.filter((w, i) => weaponOpen(i)).length; setWeapon((P.weapon + d + n) % n); }
function nova() {   // Nova-Welle: ein Ring aus Energie läuft vom Schiff nach außen und trifft, was er erreicht
  if (G.mode !== 'play' || P.nova < 100) return; P.nova = 0; G.did.nova = true; sfx.nova(); G.shake = 1.6; ui.flash('nova');
  G.wave = { pos: P.pos.clone(), r: 8, max: 520 * (1 + 0.12 * up('nova')) * (1 + (G.run?.up.super || 0)), dmg: 380 * (1 + 0.35 * up('nova')), hit: new Set() };
  waveRing.quaternion.copy(P.quat); waveRing.visible = waveShell.visible = true; fx.flash(P.pos, 120, [2, 2.4, 4], 0.35);
}
function updateWave(dt) {
  const w = G.wave; if (!w) return; w.r += (300 + w.r * 0.9) * dt; const k = w.r / w.max;
  for (const e of G.ents) if (e.alive && e.team !== 0 && !w.hit.has(e) && e.pos.distanceTo(w.pos) - e.r < w.r) {
    w.hit.add(e); const fall = 1 - 0.45 * k; damage(e, (e.kind === 'core' || e.kind === 'gen' ? 0.6 : 1) * w.dmg * fall, true); fx.flash(e.pos, e.r * 3 + 10, [1.4, 2, 4], 0.2);
    if (e.alive && e.fighter) { t1.copy(e.pos).sub(w.pos).normalize(); e.state = 'break'; e.timer2 = 1.4; e.breakDir = (e.breakDir || V()).copy(t1); }   // Überlebende werden weggedrückt
  }
  for (const b of G.bolts) if (b.team === 1 && b.pos.distanceTo(w.pos) < w.r) b.life = 0;
  for (let i = 0; i < 10; i++) { const a = rand(6.283); t1.set(Math.cos(a) * w.r, rand(-2, 2), Math.sin(a) * w.r).applyQuaternion(waveRing.quaternion).add(w.pos); fx.p(t1.x, t1.y, t1.z, 0, 0, 0, 0.35, 2.2, 0.6, 1.2, 3); }
  waveRing.position.copy(w.pos); waveRing.scale.setScalar(w.r); waveShell.position.copy(w.pos); waveShell.scale.setScalar(w.r);
  waveRing.material.uniforms.fade.value = waveShell.material.uniforms.fade.value = 1 - k * k; waveRing.material.uniforms.time.value = G.t;
  if (k >= 1) { G.wave = null; waveRing.visible = waveShell.visible = false; }
}
function newBolt(pos, dir, speed, team, dmg, c, kind = 0) {
  const b = G.freeBolts.pop() || { pos: V(), vel: V(), c: null };
  b.emp = false; b.chain = false;
  b.pos.copy(pos); b.vel.copy(dir).multiplyScalar(speed); b.team = team; b.dmg = dmg; b.c = c; b.kind = kind; b.life = 2.2; b.w = 0.55; b.len = 9; b.r = team === 0 ? 2.6 : 0.5; b.target = null; b.aoe = 0;
  G.bolts.push(b); return b;
}
const muzzle = V(), aimPt = V(), aimDir = V();
function gunPos(i) { const g = P.inner.userData.guns; const p = g[i % g.length]; return muzzle.set(p[0], p[1], p[2]).applyQuaternion(P.quat).add(P.pos); }
const HEAT = { laser: 0.034, spread: 0.15, missile: 0.21, orb: 0.36, beam: 0.34 };   // Wärme je Schuss (Lanze: je Sekunde)
function addHeat(w, amt) {
  const h = (P.heat[P.weapon] = (P.heat[P.weapon] || 0) + amt); P.heatT = 0.45;
  if (h >= 1) { P.over[P.weapon] = 1.8; P.heat[P.weapon] = 1; sfx.overheat(); ui.toast(w.name + ' überhitzt'); ui.weaponChanged(true); for (let i = 0; i < 6; i++) { const p = gunPos(i); blast.puff(p.x, p.y, p.z, 0, 0, 0, 2.6, 0.9, 0.5, 0.9, 1.6); } }
}
function fire(dt) {
  if (P.jam && P.jam.w === P.weapon) { beam.visible = false; return; }
  if (P.over[P.weapon] > 0) { beam.visible = false; if (G.beamOn) { G.beamOn = false; sfx.beam(false); } return; }
  const w = WEAPONS[P.weapon], dm = P.def.dmg * (1 + 0.2 * up('dmg')), multi = up('multi'), L = G.lock;
  // Zielhilfe: liegt das erfasste Ziel nahe am Fadenkreuz, zielen die Bolzen auf den Vorhaltepunkt
  if (L && L.ang < 0.2) { const tt = L.dist / (w.speed || 2000); aimPt.copy(L.e.pos).addScaledVector(L.e.vel, tt); } else aimPt.copy(P.pos).addScaledVector(P.fwd, 420);
  if (w.id === 'beam') { addHeat(w, HEAT.beam * dt); return fireBeam(dt, w.dmg * dm * (1 + 0.25 * multi)); }
  if (P.fireCd > 0) return; P.fireCd = 1 / (w.rate * (1 + 0.12 * up('rate'))); addHeat(w, HEAT[w.id]);
  if (w.id === 'laser') {
    for (let i = 0; i <= multi; i++) { const p = gunPos(P.gun++); aimDir.copy(aimPt).sub(p).normalize(); newBolt(p, aimDir, w.speed, 0, w.dmg * dm, w.color).chain = true; fx.flash(p, 5, w.color, 0.07); }
    sfx.laser();
  } else if (w.id === 'spread') {
    const n = 7 + multi * 2, p = gunPos(2).clone(); aimDir.copy(aimPt).sub(P.pos).normalize();
    for (let i = 0; i < n; i++) { const a = (i / (n - 1) - 0.5) * 0.36; t1.copy(aimDir).addScaledVector(P.right, a).addScaledVector(UP, rand(-0.03, 0.03)).normalize(); const b = newBolt(p, t1, w.speed, 0, w.dmg * dm, w.color); b.life = 1.1; b.len = 6; }
    fx.flash(p, 12, w.color, 0.1); sfx.spread();
  } else if (w.id === 'missile') {
    const tg = G.locks;   // nur was im Visier liegt; ohne Erfassung fliegen die Raketen geradeaus
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
  if (e.guardT > 0 && !silent) { dmg *= 0.25; fx.spark(e.pos, 3, 30, 0.3, 1.8, 0.4, 1.4, 4); }   // im Feld eines Schildträgers
  if (e.shielded) { if (!cont || Math.random() < 0.1) { fx.spark(e.pos, 4, 30, 0.4, 2, 0.3, 2, 0.8); } return; }
  e.hp -= dmg; e.flashT = 0.08; G.hitT = 0.14; if (!silent && !cont) { sfx.hit(); fx.flash(e.pos, e.r * 2.2 + 4, [2.2, 1.6, 1.0], 0.09); }
  if (e.hp <= 0) kill(e);
}
function kill(e) {
  e.alive = false; world.remove(e.mesh);
  if (e.kind === 'rock') {   // Asteroiden zerbrechen in Bruchstücke, die auseinandertreiben
    explode(e.pos, Math.min(3, e.r / 11), [0.6, 0.55, 0.5], e.vel, { heat: 0.35, tint: [0.42, 0.38, 0.34] }); sfx.death('rock', 1, 0, clamp(1 - e.pos.distanceTo(P.pos) / 900, 0, 1));
    if (e.r > 11 && e.gen < 2) for (let i = 0; i < (e.r > 30 ? 4 : 3); i++) { const f = addRock(t1.copy(e.pos).add(randUnit(t2).multiplyScalar(e.r * 0.5)), (e.r / 0.9) * rand(0.32, 0.5), e.gen + 1); f.vel.copy(t2).multiplyScalar(rand(14, 30)).add(e.vel); }
    G.stats.score += 20; G.stats.credits += 8; return;
  }
  if (e.team === 1 && up('shrap')) for (let i = 0; i < 5 * up('shrap'); i++) { const b = newBolt(e.pos, randUnit(t1), 320, 0, 14, [3.4, 2.4, 0.5]); b.life = 0.55; b.len = 5; }
  if (up('aegis')) { P.regenT = 0; P.shield = Math.min(P.maxShield, P.shield + 12); }
  const size = e.kind === 'rock' ? e.r / 12 : { drone: 1, inter: 0.9, bomber: 1.8, ace: 2.4, turret: 1.6, gen: 3, buoy: 2.2, core: 5, kami: 1.3, hauler: 4.5, target: 1.6, corvette: 5, jammer: 1.1, shielder: 1.7 }[e.kind] || 1;
  explode(e.pos, size, e.kind === 'rock' ? [0.7, 0.6, 0.5] : e.kind === 'ace' ? [0.8, 0.4, 1.4] : e.kind === 'gen' ? [0.3, 1.2, 0.5] : [1, 0.55, 0.2], e.vel, { ring: size >= 2.2 });
  const d = e.pos.distanceTo(P.pos), pan = clamp(-t1.copy(e.pos).sub(camera.position).normalize().dot(P.right) * 1.2, -1, 1); sfx.death(e.kind, clamp(size, 0.6, 3), pan, clamp(1 - d / 900, 0, 1));
  fx.spark(e.pos, 10 + size * 6, 55 + size * 20, 1.6, 0.9, 2.6, 1.3, 0.3, e.vel);                       // glühende Trümmer
  if (size >= 1.6) { const pp = e.pos.clone(); for (let i = 1; i <= 3; i++) setTimeout(() => { if (G.mode === 'play') { explode(pp.add(randUnit(t1).multiplyScalar(e.r * 0.8)), size * 0.5); } }, i * 140); }   // Folgeexplosionen
  G.shake = Math.max(G.shake, clamp((size * 90) / (d + 40), 0, 1.6));
  if (e.kind !== 'rock') { G.combo++; G.comboT = 5; G.stats.kills++; P.nova = Math.min(100, P.nova + (6 + up('nova') * 2)); }
  const mult = 1 + Math.min(G.combo, 12) * 0.25; G.stats.score += Math.round(e.def.score * mult); G.stats.credits += Math.round(e.def.credit * (1 + Math.min(G.combo, 10) * 0.05));
  if (e.kind !== 'rock') { G.slow = Math.max(G.slow, e.def.big ? 0.9 : 0.07); ui.toast(`${e.def.name} zerstört · +${e.def.credit} Cr`); }   // kurzer Stillstand: der Abschuss soll sitzen
  if (e.kind === 'corvette') { G.shake = 2.4; ui.banner('KORVETTE VERNICHTET', '+' + e.def.credit + ' Credits'); const pp = e.pos.clone(), dd = e.dir.clone(); for (let i = 0; i < 6; i++) setTimeout(() => { if (G.mode === 'play') explode(t1.copy(pp).addScaledVector(dd, (i - 2.5) * 11).add(randUnit(t2).multiplyScalar(5)), rand(1.6, 3)); }, 120 + i * 170); }
  if (e.kind === 'ace') { G.slow = 0.5; ui.banner('LIQUIDATOR ABGEWICKELT', '+' + e.def.credit + ' Credits'); }
  if (e.kind === 'core') { G.cap.dying = 5; G.slow = 0.8; ui.comms('Astrid', G.cap.dread ? 'Die Monopol bricht auseinander! Raus da, Nova Eins!' : 'Kern getroffen! Die Rendite geht hoch!'); }
}
function jamWeapon() {   // Störkugel: die aktive Waffe fällt aus, das Spiel schaltet auf eine andere um
  if (P.invuln > 0 || P.rollT > 0 || P.man || P.jam) return; const w = P.weapon, other = WEAPONS.findIndex((x, i) => i !== w && weaponOpen(i));
  P.jam = { w, t: other >= 0 ? 6 : 2.5 }; sfx.jam(); ui.flash('hit'); G.shake = Math.max(G.shake, 0.6); ui.banner('WAFFE GESTÖRT', WEAPONS[w].name + (other >= 0 ? ' fällt 6 s aus' : ' fällt kurz aus')); if (other >= 0) P.weapon = other; ui.weaponChanged(true);
}
function chain(from, dmg) {   // Kettenblitz
  let bd = 120, tg = null; for (const e of G.ents) if (e.alive && e.team === 1 && e !== from) { const d = e.pos.distanceTo(from.pos); if (d < bd) { bd = d; tg = e; } }
  if (!tg) return; for (let i = 0; i <= 8; i++) { t1.copy(from.pos).lerp(tg.pos, i / 8).add(randUnit(t2).multiplyScalar(2.5)); fx.p(t1.x, t1.y, t1.z, 0, 0, 0, 0.22, 2.4, 1.2, 2.2, 5); }
  fx.flash(tg.pos, tg.r * 2 + 6, [1, 2, 5], 0.12); damage(tg, dmg * 0.35 * up('chain'), true);
}
function hitPlayer(dmg, pos) {
  if (P.invuln > 0 || P.rollT > 0 || P.man || G.mode !== 'play') return;
  P.shield -= dmg * 0.6; P.regenT = 2.6; if (P.stun < 0.3) ui.toast('Treffer · Antrieb gedrosselt'); P.stun = Math.min(1, P.stun + (0.34 + dmg * 0.012) / (1 + up('stab')));   // Treffer kosten vor allem Tempo
  G.shake = Math.max(G.shake, 0.5); sfx.shieldHit(); ui.flash('hit'); fx.spark(pos || P.pos, 8, 30, 0.4, 2, 0.5, 1.4, 3);
  if (P.shield <= 0) {   // unendlich Leben: Notsprung statt Game Over
    G.stats.respawns++; G.combo = 0; P.shield = P.maxShield; P.invuln = 3; G.shake = 2; G.slow = 0.6; sfx.down(); ui.flash('down');
    explode(P.pos, 2.4, [0.4, 0.9, 2]); ui.banner('NOTSCHILD GEZÜNDET', 'Schild voll · Leben ∞'); ui.comms('Charlie', 'Wuff! Wuff! (Mini übersetzt: Schild steht wieder.)');
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
  if (e.baseSpeed) { if ((e.paceT -= dt) < 0) { e.paceT = rand(2.5, 6); e.pace = [0.55, 0.85, 1, 1, 1.5][(Math.random() * 5) | 0]; } e.speed += (e.baseSpeed * e.pace - e.speed) * Math.min(1, dt * 1.5); }   // mal schleichen, mal sprinten
  if (e.guardT > 0) e.guardT -= dt;
  if (e.kind === 'shielder') { if ((e.cd -= dt) < 0) { e.cd = 0.25; for (const o of G.ents) if (o !== e && o.alive && o.team === 1 && o.kind !== 'shielder' && o.pos.distanceToSquared(e.pos) < 150 * 150) o.guardT = 0.45; if (Math.random() < 0.3) fx.ring(e.pos, 150, [0.15, 0.4, 1.1], 0.5); } return; }
  if (e.kind === 'jammer') {
    if ((e.cd -= dt) < 0 && dist < 560 && e.state === 'attack') { t2.normalize(); if (t2.dot(e.dir) > 0.9) { const b = newBolt(e.pos, t2, 125, 1, 0, [3.2, 0.6, 4.6], 2); b.w = b.len = 3.2; b.life = 5; b.r = 2.5; b.target = P; b.emp = true; e.cd = e.def.fire * rand(0.8, 1.3); sfx.heavy(0.2, 2.2); } else e.cd = 0.2; }
    return;
  }
  if (e.kind === 'corvette') {   // sechs Geschütze feuern reihum, egal wohin der Bug zeigt
    const d = e.pos.distanceTo(P.pos);
    if ((e.cd -= dt) < 0 && d < 720) { const g = CORV_GUNS[(e.gun = ((e.gun || 0) + 1) % 6)]; t3.set(g[0], g[1], g[2]).applyQuaternion(e.mesh.quaternion).add(e.pos); t2.copy(P.pos).addScaledVector(P.vel, d / 210).sub(t3).normalize(); randUnit(t4); t2.addScaledVector(t4, 0.03).normalize(); const b = newBolt(t3, t2, 210, 1, e.def.dmg, [4, 2.2, 0.4]); b.len = 12; b.w = 0.9; fx.flash(t3, 9, [3, 1.6, 0.4], 0.08); e.cd = e.def.fire * rand(0.7, 1.4); if (d < 450) sfx.heavy(0.13, 1.6); }
    if (e.pos.distanceToSquared(P.pos) < (e.r + P.r) ** 2 && P.hullCd <= 0) bounce(e.pos, e.r);
    return;
  }
  if ((e.cd -= dt) < 0 && T && e.state === 'attack' && dist < 460 && e.def.fire !== 0) {
    t2.normalize(); if (t2.dot(e.dir) > 0.975) {
      if (e.team === 0) { newBolt(e.pos, t3.copy(T.pos).addScaledVector(T.vel, dist / 400).sub(e.pos).normalize(), 400, 0, 7, [0.5, 1.6, 4]).r = 1.5; e.cd = 0.22; }
      else if (e.kind === 'bomber') { const b = newBolt(e.pos, t2, 110, 1, e.def.dmg, [3.6, 2.0, 0.3], 2); b.w = b.len = 2.6; b.life = 4.5; b.r = 2; b.target = T; e.cd = e.def.fire * rand(0.8, 1.3); }
      else { t3.copy(T.pos).addScaledVector(T.vel, dist / 190).sub(e.pos).normalize(); randUnit(t4); t3.addScaledVector(t4, e.kind === 'ace' ? 0.018 : 0.035).normalize(); const b = newBolt(e.pos, t3, 190, 1, e.def.dmg, e.kind === 'ace' ? [3, 0.6, 4.5] : [3.8, 0.8, 0.25]); b.len = 5; b.w = 0.45; e.cd = e.def.fire * rand(0.6, 1.4) * (e.burst = ((e.burst || 0) + 1) % 4 ? 0.22 : 1.6); if (dist < 300 && T === P) sfx.enemyShot(clamp(-t2.dot(P.right) * -1, -1, 1)); }
    } else e.cd = 0.15;
  }
  if (e.team === 1 && e.hp < e.maxHp * 0.6 && Math.random() < dt * (e.def.big ? 26 : 14)) { const k = e.hp / e.maxHp, o = e.def.big ? 14 : 2; blast.puff(e.pos.x + rand(-o, o), e.pos.y + rand(-o * 0.3, o * 0.3), e.pos.z + rand(-o, o), 0, 0, 0, (e.def.big ? 9 : 4) * rand(0.7, 1.3), 0.9, k < 0.3 ? 1.1 : 0.2, 0.9, 1.5); }   // unter 60 % Rauch, unter 30 % Flammen
  if (e.team === 1 && (e.trailT = (e.trailT || 0) - dt) < 0) { e.trailT = 0.045; fx.p(e.pos.x - e.dir.x * 4, e.pos.y - e.dir.y * 4, e.pos.z - e.dir.z * 4, 0, 0, 0, 0.35, 2.2, e.kind === 'ace' ? 1.2 : 1.6, 0.3, e.kind === 'ace' ? 2 : 0.2); }
  if (e.pos.distanceToSquared(P.pos) < (e.r + P.r) * (e.r + P.r) && e.team === 1) { hitPlayer(e.kind === 'kami' ? 28 : 18, e.pos); damage(e, 60, true); }
}
function updateStatic(e, dt) {
  if (e.kind === 'turret') {
    const d = e.pos.distanceTo(P.pos); t2.copy(P.pos).addScaledVector(P.vel, d / 200).sub(e.pos);
    const head = e.mesh.userData.head; t3.copy(t2).normalize(); if (t3.y * e.upSign > -0.15) { head.lookAt(t4.copy(e.pos).add(t2)); }
    if ((e.cd -= dt) < 0 && d < 720 && t3.y * e.upSign > -0.1) { randUnit(t4); t3.addScaledVector(t4, 0.03).normalize(); const p = t4.copy(e.pos).addScaledVector(t3, 10).addScaledVector(UP, 3 * e.upSign); const b = newBolt(p, t3, 200, 1, e.def.dmg, [4, 1.4, 0.3]); b.len = 10; b.w = 0.8; e.cd = e.def.fire * rand(0.6, 1.3); if (d < 400) sfx.heavy(0.16, 1.7); }
  } else if (e.kind === 'buoy') { e.mesh.rotation.y += e.spin * dt; e.mesh.rotation.x += e.spin * 0.3 * dt; }
  else if (e.kind === 'rock') {
    e.mesh.rotateOnAxis(e.spinAx, e.spin * dt); e.pos.addScaledVector(e.vel, dt);
    t3.copy(e.pos).sub(G.center); if (t3.lengthSq() > 1500 * 1500) e.pos.copy(G.center).addScaledVector(t3, -0.96);   // am Rand wieder hereinholen
    e.mesh.position.copy(e.pos);
  }
  else if (e.kind === 'station') { e.mesh.rotateY(dt * 0.05); }
  else if (e.kind === 'sat') { e.mesh.rotateY(dt * e.spin); }
  else if (e.kind === 'core') { e.mesh.rotation.y += dt * 0.6; e.mesh.rotation.x += dt * 0.25; }
  else if (e.kind === 'hauler') {   // Goldtransporter: zieht stur seine Bahn und wehrt sich mit zwei Bordkanonen
    e.vel.copy(e.dir).multiplyScalar(e.speed); e.pos.addScaledVector(e.vel, dt); e.mesh.position.copy(e.pos); e.mesh.lookAt(t3.copy(e.pos).add(e.dir));
    if (Math.random() < 0.5) fx.p(e.pos.x - e.dir.x * 40, e.pos.y, e.pos.z - e.dir.z * 40, 0, 0, 0, 0.6, 6, 2.0, 0.6, 0.2);
    const d = e.pos.distanceTo(P.pos); if ((e.cd -= dt) < 0 && d < 620) { t3.copy(P.pos).addScaledVector(P.vel, d / 200).sub(e.pos).normalize(); randUnit(t4); t3.addScaledVector(t4, 0.035).normalize(); const b = newBolt(t4.copy(e.pos).addScaledVector(UP, 9), t3, 200, 1, e.def.dmg, [4, 2.4, 0.4]); b.len = 10; b.w = 0.8; e.cd = e.def.fire * rand(0.6, 1.3); if (d < 400) sfx.heavy(0.14, 1.5); }
  }
  else if (e.kind === 'target') { e.mesh.rotation.y += dt * 0.6; }
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
  if (c.core.shielded && G.mission.waves && !c.parts.some((p) => p.alive && p.kind === 'gen')) { c.core.shielded = false; c.core.mesh.userData.shield.visible = false; fx.ring(c.core.pos, 160, [0.3, 0.6, 1.4], 1.2); ui.banner('KERNSCHILD GEFALLEN', 'Jetzt den Kern'); }
  if (c.dying > 0) {
    c.dying -= dt; G.shake = Math.max(G.shake, 0.5);
    if (Math.random() < dt * 14) { const h = c.hull[(Math.random() * c.hull.length) | 0]; t1.copy(h.c).add(randUnit(t2).multiplyScalar(h.r)); explode(t1, rand(1.5, 4)); if (Math.random() < 0.3) sfx.boom(2); }
    if (c.dying <= 0) {
      c.dead = true; world.remove(c.mesh); for (const p of c.parts) if (p.alive) { p.alive = false; world.remove(p.mesh); }
      for (const h of c.hull) explode(h.c, 5); fx.flash(c.pos, 2600, [3, 2.4, 1.8], 1.6); fx.ring(c.pos, 1500, [1, 0.6, 0.3], 2.4); sfx.nova(); G.shake = 3; ui.flash('nova'); bossBeam.visible = false;
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
        if (b.pos.distanceToSquared(P.pos) < (P.r + b.r + 1) ** 2) { if (b.emp) jamWeapon(); else hitPlayer(b.dmg, b.pos); hit = true; }
        else for (const e of G.ents) if (e.alive && (e.kind === 'transport' || e.kind === 'rock' || e.solid) && b.pos.distanceToSquared(e.pos) < e.r * e.r) { hit = true; if (e.kind === 'transport') { e.hp = Math.max(1, e.hp - b.dmg * 2.2); fx.spark(b.pos, 5, 30, 0.4, 2, 0.4, 2, 0.6); } break; }
      } else {
        for (const e of G.ents) { if (!e.alive) continue; if (e.team === 0) { if (e.solid && b.pos.distanceToSquared(e.pos) < e.r * e.r) { hit = true; fx.spark(b.pos, 4, 30, 0.3, 1.4, 2, 1.6, 1); break; } continue; } const rr = e.r + b.r; if (b.pos.distanceToSquared(e.pos) < rr * rr) { hit = true; if (!b.aoe) { damage(e, b.dmg); fx.spark(b.pos, 5, 36, 0.3, 1.6, b.c[0], b.c[1], b.c[2]); if (b.chain && up('chain')) chain(e, b.dmg); } break; } }
      }
      if (!hit && cap) for (const h of cap.hull) if (b.pos.distanceToSquared(h.c) < h.r * h.r) { hit = true; fx.spark(b.pos, 4, 30, 0.3, 1.5, 2, 1.4, 0.6); break; }
    }
    if (hit || b.life <= 0) {
      if (b.aoe && b.team === 0 && (hit || b.kind === 2)) {
        explode(b.pos, b.aoe / 22, b.kind === 2 ? [1.2, 0.4, 1.6] : [1, 0.6, 0.2]); if (b.kind === 2) { fx.ring(b.pos, b.aoe * 1.3, [1.4, 0.4, 2], 0.5); sfx.boom(1.6); G.shake = Math.max(G.shake, 0.6); } else sfx.boom(0.7);
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
  P.stun = Math.max(0, P.stun - dt * 0.5);
  const boosting = (keys.ShiftLeft || keys.ShiftRight || input.boost) && P.rollT <= 0 && P.stun < 0.5, braking = (keys.KeyC || keys.ControlLeft || input.brake) && !boosting;
  if (boosting && P.boost < 0.05) sfx.boost();
  P.boost += ((boosting ? 1 : 0) - P.boost) * Math.min(1, dt * 4); P.brake += ((braking ? 1 : 0) - P.brake) * Math.min(1, dt * 5);
  if (P.boost > 0.8) G.did.boost = true; if (P.brake > 0.8) G.did.brake = true; P.manCd -= dt;
  const eng = 1 + 0.08 * up('engine'), turn = 1.55 * P.def.turn * eng * (1 - P.boost * 0.35) * (1 + P.brake * 0.45);
  if (P.man) {   // Kunstflugfigur: Drehung um die eigene Querachse, Steuerung ruht
    const m = P.man; m.t += dt; const k = Math.min(1, m.t / m.dur), e = k * k * (3 - 2 * k);
    P.quat.copy(m.base).multiply(qMan.setFromAxisAngle(XAX, -e * (m.type === 'loop' ? Math.PI * 2 : Math.PI)));
    if (k >= 1) { if (m.type === 'turn') { P.yaw += Math.PI; P.pitch = -P.pitch; P.flip = Math.PI; } P.man = null; }
  }
  if (!P.man) {
    P.yaw -= P.sx * turn * dt; P.pitch = clamp(P.pitch + P.sy * turn * 0.85 * dt, -1.35, 1.35);
    if (G.outside) { const want = Math.atan2(-off.x, -off.z); let d = want - P.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); P.yaw += clamp(d, -1, 1) * dt * 1.2; P.pitch += (Math.asin(clamp(off.y / od, -1, 1)) * 0.5 - P.pitch) * dt; }
    eul.set(P.pitch, P.yaw, 0); P.quat.setFromEuler(eul);
  }
  P.flip = Math.max(0, (P.flip || 0) - dt * 5.5);
  P.fwd.set(0, 0, 1).applyQuaternion(P.quat); P.right.set(-1, 0, 0).applyQuaternion(P.quat);
  P.speed = 86 * P.def.speed * eng * (1 + P.boost * 1.3) * (1 - P.brake * 0.55) * (P.man ? 1.25 : 1) * (1 - 0.58 * P.stun);
  if (P.stun > 0.25 && Math.random() < dt * 22) { t2.set(rand(-3, 3), rand(-1, 1), -5).applyQuaternion(P.quat).add(P.pos); blast.puff(t2.x, t2.y, t2.z, 0, 0, 0, 3.2, 0.7, 0.5 * P.stun, 0.8, 1.4); }   // qualmender Antrieb
  P.vel.copy(P.fwd).multiplyScalar(P.speed);
  let spin = 0;
  if (P.rollT > 0) { P.rollT -= dt; const k = 1 - P.rollT / 0.5; P.vel.addScaledVector(P.right, P.rollDir * 150 * Math.sin(k * Math.PI)); spin = P.rollDir * k * Math.PI * 2; }
  P.rollCd -= dt; P.hullCd -= dt; P.invuln -= dt; P.fireCd -= dt;
  P.pos.addScaledVector(P.vel, dt);
  P.mesh.position.copy(P.pos); P.mesh.quaternion.copy(P.quat); P.inner.rotation.set(P.sy * 0.12, 0, P.sx * 0.85 + spin + P.flip);
  P.mesh.visible = P.invuln <= 0 || Math.sin(G.t * 40) > -0.3;
  if ((P.regenT -= dt) < 0 && P.shield < P.maxShield) P.shield = Math.min(P.maxShield, P.shield + (14 + 5 * up('shield')) * dt);
  P.nova = Math.min(100, P.nova + (2.2 + up('nova') * 0.9) * (1 + (G.run?.up.super || 0)) * dt);
  for (const en of P.inner.userData.engines) { t2.set(en[0], en[1], en[2]).applyQuaternion(P.mesh.quaternion).add(P.pos); const k = 1 + P.boost * 1.6; fx.p(t2.x, t2.y, t2.z, P.vel.x * 0.3 + rand(-2, 2), P.vel.y * 0.3 + rand(-2, 2), P.vel.z * 0.3 + rand(-2, 2), 0.2 * k, 1.5 * k, 0.12, 0.42 + P.boost * 0.4, 1.0); }
  if (G.cap && !G.cap.dead && P.hullCd <= 0) for (const h of G.cap.hull) if (P.pos.distanceToSquared(h.c) < (h.r + P.r) ** 2) { bounce(h.c, h.r); break; }
  // Zielerfassung
  let best = null, bs = 1e9;
  for (const e of G.ents) {
    if (!e.alive || e.team !== 1) continue; t2.copy(e.pos).sub(P.pos); const d = t2.length(); if (d > (e.fighter ? 760 : 1000)) continue;
    const ang = Math.acos(clamp(t2.dot(P.fwd) / d, -1, 1)); if (ang > 0.42) continue; const s = ang + d / 4000 + (e.shielded ? 0.5 : 0); if (s < bs) { bs = s; best = { e, ang, dist: d }; }
  }
  G.lock = best;
  P.heatT -= dt; for (let i = 0; i < WEAPONS.length; i++) {   // abkühlen: langsam unter Dauerfeuer, schnell in Feuerpausen
    if (P.over[i] > 0) { if ((P.over[i] -= dt) <= 0) { P.heat[i] = 0.3; sfx.cooled(); ui.weaponChanged(true); } continue; }
    if (P.heat[i] > 0) P.heat[i] = Math.max(0, P.heat[i] - dt * (i === P.weapon && P.heatT > 0 ? 0.14 : 0.5));
  }
  // Raketen-Erfassung: Ziele innerhalb des Visierkegels, die nächsten am Fadenkreuz zuerst
  G.locks.length = 0;
  if (WEAPONS[P.weapon].id === 'missile') { const c = []; for (const e of G.ents) { if (!e.alive || e.team !== 1 || e.shielded) continue; t2.copy(e.pos).sub(P.pos); const d = t2.length(); if (d > 850) continue; const a = Math.acos(clamp(t2.dot(P.fwd) / d, -1, 1)); if (a < 0.26) c.push([a, e]); } c.sort((x, y) => x[0] - y[0]); for (const [, e] of c.slice(0, 2 + up('multi') + 2 * up('lock'))) G.locks.push(e); }
  if (P.jam && (P.jam.t -= dt) <= 0) { P.jam = null; ui.toast('Waffe wieder bereit'); ui.weaponChanged(true); }
  if (up('tail') && (P.tailCd -= dt) <= 0) {   // Heckgeschütz
    let bd = 340, tg = null; for (const e of G.ents) if (e.alive && e.team === 1) { t2.copy(e.pos).sub(P.pos); const d = t2.length(); if (d < bd && t2.dot(P.fwd) < 0) { bd = d; tg = e; } }
    if (tg) { t2.copy(tg.pos).addScaledVector(tg.vel, bd / 420).sub(P.pos).normalize(); const b = newBolt(t3.copy(P.pos).addScaledVector(P.fwd, -5), t2, 420, 0, 9 * (1 + 0.2 * up('dmg')), [3.2, 2.2, 0.5]); b.len = 6; P.tailCd = 0.5 / up('tail'); } else P.tailCd = 0.15;
  }
  const wantFire = input.fire || keys.Space || (save.set.autofire && best && best.ang < 0.2 && !best.e.shielded);
  if (wantFire) fire(dt); if (!wantFire || WEAPONS[P.weapon].id !== 'beam') { beam.visible = false; if (G.beamOn) { G.beamOn = false; sfx.beam(false); } }
}
function updateCamera(dt) {
  if (!P.man) { if (camFwd.dot(P.fwd) < -0.9) camFwd.addScaledVector(P.right, 0.4).normalize(); camFwd.lerp(P.fwd, 1 - Math.exp(-5.5 * dt)).normalize(); }   // in der Figur bleibt die Kamera stehen und zeigt sie von außen
  const portrait = camera.aspect < 1, dist = (portrait ? 34 : 27) + P.boost * 5 - P.brake * 4 + (P.man ? 16 : 0);
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
    const on = !s.behind && s.x > 0 && s.x < W && s.y > 0 && s.y < H, col = e.guardT > 0 ? '#59c8ff' : obj ? '#ffb347' : '#ff5a4d';
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
  const c = project(t1.copy(P.pos).addScaledVector(P.fwd, 420));
  { const h = P.heat[P.weapon] || 0, ov = P.over[P.weapon] > 0; if (h > 0.12 || ov) { hc.globalAlpha = 0.9; hc.lineWidth = 3; hc.strokeStyle = ov ? (Math.sin(G.t * 30) > 0 ? '#ff4d4d' : '#7a1f1f') : h > 0.75 ? '#ff7a3c' : '#ffd166'; hc.beginPath(); hc.arc(c.x, c.y, 21, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * Math.min(1, h)); hc.stroke(); } }   // Hitzeanzeige: Bogen ums Fadenkreuz
  if (G.hitT > 0) { hc.globalAlpha = Math.min(1, G.hitT / 0.08); hc.strokeStyle = '#ffd166'; hc.lineWidth = 2.5; hc.beginPath(); for (const [ax, ay] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { hc.moveTo(c.x + ax * 9, c.y + ay * 9); hc.lineTo(c.x + ax * 19, c.y + ay * 19); } hc.stroke(); }   // Treffermarke
  hc.globalAlpha = 0.9; hc.strokeStyle = '#eaf6ff'; hc.lineWidth = 1.5;
  hc.beginPath(); hc.arc(c.x, c.y, 13, 0, 6.283); for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { hc.moveTo(c.x + ax * 18, c.y + ay * 18); hc.lineTo(c.x + ax * 26, c.y + ay * 26); } hc.stroke(); hc.fillStyle = '#eaf6ff'; hc.fillRect(c.x - 1, c.y - 1, 2, 2);
  const L = G.lock;
  if (L) {
    const s = project(L.e.pos), r = clamp((L.e.r * 520) / L.dist, 12, 54) + 6, hot = L.ang < 0.2 && !L.e.shielded; hc.strokeStyle = hot ? '#ffffff' : '#ffd166'; hc.lineWidth = 1.5; hc.globalAlpha = 1;
    hc.save(); hc.translate(s.x, s.y); hc.rotate(G.t * 1.5); hc.beginPath(); for (let i = 0; i < 4; i++) { hc.moveTo(Math.cos(i * 1.571 + 0.3) * r, Math.sin(i * 1.571 + 0.3) * r); hc.arc(0, 0, r, i * 1.571 + 0.3, i * 1.571 + 1.27); } hc.stroke(); hc.restore();
    if (L.e.def.big || L.e.cap) { hc.fillStyle = hc.strokeStyle; hc.globalAlpha = 0.8; hc.fillText(L.e.def.name.toUpperCase(), s.x, s.y + r + 14); hc.globalAlpha = 1; }
    if (hot && L.e.fighter) { const lp = project(t1.copy(L.e.pos).addScaledVector(L.e.vel, L.dist / (WEAPONS[P.weapon].speed || 2000))); hc.beginPath(); hc.arc(lp.x, lp.y, 4, 0, 6.283); hc.stroke(); }
  }
  hc.strokeStyle = '#ff9a3c'; hc.lineWidth = 2; for (const e of G.locks) { const q = project(e.pos); if (q.behind) continue; const r = clamp((e.r * 520) / e.pos.distanceTo(P.pos), 9, 40) + 4; hc.beginPath(); hc.moveTo(q.x, q.y - r); hc.lineTo(q.x + r, q.y); hc.lineTo(q.x, q.y + r); hc.lineTo(q.x - r, q.y); hc.closePath(); hc.stroke(); }   // Raketen-Erfassung
  hc.globalAlpha = 1;
}

// ---------- Hauptschleife ----------
let last = performance.now(), hudT = 0, menuYaw = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (G.mode === 'play') {
    if (G.slow > 0) { G.slow -= dt; dt *= 0.35; }
    dt *= save.set.pace;   // Spieltempo aus den Einstellungen
    G.t += dt; G.stats.time += dt;
    updatePlayer(dt);
    for (const e of G.ents) { if (!e.alive) continue; if (e.fighter) updateFighter(e, dt); else updateStatic(e, dt); if (e.flashT > 0) e.flashT -= dt; }
    updateCapital(dt); updateBolts(dt);
    for (let i = G.ents.length - 1; i >= 0; i--) if (!G.ents[i].alive) G.ents.splice(i, 1);
    if ((G.comboT -= dt) < 0) G.combo = 0;
    const tr = G.ents.filter((e) => e.kind === 'transport'); if (tr.length) { G.stats.convoy = tr.reduce((s, e) => s + e.hp / e.maxHp, 0) / tr.length; G.center.set(0, -30, tr[0].pos.z); }
    // Phasenfortschritt
    if (G.phaseDef) {
      G.phaseT += dt;
      if (G.choiceT > 0) { if ((G.choiceT -= dt) <= 0) openChoice(); }
      else if (G.phaseT > 1 && remaining() === 0) { if (G.mission.waves) waveDone(); else nextPhase(); }
    }
    else if (G.endT > 0 && !(G.cap && !G.cap.dead)) { G.endT -= dt; if (G.endT <= 0) finishMission(false); }
    const threat = G.ents.some((e) => e.team === 1 && e.alive); G.intensity += ((threat ? 1 : 0.4) - G.intensity) * dt; setIntensity(G.intensity * (G.cap && !G.cap.dead ? 1.25 : G.ents.some((e) => e.def.big && e.alive) ? 1.1 : 0.85));
    updateWave(dt); if (G.hitT > 0) G.hitT -= dt;
    updateCamera(dt); fx.update(dt, camera); blast.update(dt); boltMesh.draw(G.bolts);
    if ((hudT -= dt) < 0) { hudT = 0.06; sfx.engine(1 + P.boost - P.brake * 0.7 + (P.man ? 0.6 : 0)); ui.hud({ P, G, remaining: remaining(), outside: G.outside }); }
  } else if (G.mode !== 'pause' && G.mode !== 'choice') {
    // Hangar und Titel: langsamer Kameraschwenk durch den Himmel
    menuYaw += dt * 0.05; const my = menuBase + Math.sin(menuYaw) * 0.35; camera.position.set(0, 0, 0); if (Math.abs(camera.fov - 62) > 0.1) { camera.fov = 62; camera.updateProjectionMatrix(); } camera.lookAt(Math.sin(my) * 10, 0.6 + Math.sin(menuYaw * 0.7) * 0.5, Math.cos(my) * 10); sky.position.set(0, 0, 0); far.position.set(0, 0, 0);
    if (showcase.children.length) {   // Hangar: gewähltes Schiff dreht sich vor der Kamera
      camera.updateMatrixWorld(); const tall = camera.aspect < 1;
      showcase.position.set(0, tall ? 4.6 : 3.4, tall ? -40 : -22).applyMatrix4(camera.matrixWorld); showcase.rotation.set(0.28, showcase.rotation.y + dt * 0.5, 0.1);
      camera.getWorldDirection(t1); fill.position.copy(t1).multiplyScalar(-1).addScaledVector(UP, 0.6); rim.position.copy(t1).addScaledVector(UP, 0.9);
    }
    fx.update(dt, camera); blast.update(dt); boltMesh.draw(G.bolts);
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
  act: { rollAuto: () => roll(P.sx < -0.15 ? -1 : 1), roll, nova, setWeapon, cycleWeapon, maneuver, fire: (v) => { input.fire = v; }, boost: (v) => { input.boost = v; }, brake: (v) => { input.brake = v; } },
  weaponOpen,
  audio: () => { initAudio(); startMusic(); setScene('music_hangar'); },
  getJam: () => (P.jam ? P.jam.w : -1), getOver: () => P.over.map((v) => (v > 0 ? 1 : 0)).join(''),
  fullscreen: toggleFullscreen,
  getWeapon: () => P.weapon,
  showcase: setShowcase,
});
function toggleFullscreen() {   // Vollbild: klappt in Chrome, Edge, Firefox und auf dem iPad; wo es nicht geht, sagt es die Meldung
  const el = document.documentElement, on = document.fullscreenElement || document.webkitFullscreenElement;
  try { if (on) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else { const r = (el.requestFullscreen || el.webkitRequestFullscreen); if (!r) throw 0; const pr = r.call(el, { navigationUI: 'hide' }); if (pr && pr.catch) pr.catch(() => ui.toastMenu('Vollbild ist hier gesperrt. Seite im Browser öffnen oder zum Home-Bildschirm hinzufügen.')); } }
  catch { ui.toastMenu('Vollbild ist hier gesperrt. Seite im Browser öffnen oder zum Home-Bildschirm hinzufügen.'); }
}
function toHangar() { clearWorld(); G.mode = 'hangar'; G.mission = null; G.run = null; setScene('music_hangar'); ui.hideChoice(); setIntensity(0.1); buildEnv(ENVS[['kerasis', 'belt', 'deep'][doneCount() % 3]]); ui.showHangar(); }
window.claude?.hot?.snapshot?.(() => ({}));
setupQuality(); buildEnv(ENVS.kerasis); ui.showTitle(); requestAnimationFrame(frame);
if (new URLSearchParams(location.search).has('debug')) window.__nova = { spawn: (kinds) => kinds.forEach((k) => spawnGroup([k, 1], true)), musicInfo, G, P, save, startMission, MISSIONS, ENDLESS, kill, nextPhase, finishMission, input, toHangar };
