// Prozedurale Schiffsmodelle mit Plattentextur, Relief und Kleinteilen. Nase zeigt nach +Z (Object3D.lookAt-Konvention).
// Jedes Modell wird einmal gebaut, je Material zu einem Netz verschmolzen und danach nur noch geklont (wenige Draw Calls).
import * as THREE from '../vendor/three.module.min.js';

// ---------- Texturen ----------
function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function panelCanvas(seed, base, vary, seam, accent) {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = `rgb(${base},${base},${base})`; g.fillRect(0, 0, 512, 512);
  const cut = (x, y, w, h, d) => {   // rekursive Plattenteilung
    if (d > 4 || w < 40 || h < 40 || (d > 1 && r() < 0.22)) {
      const v = base + (r() - 0.5) * vary; g.fillStyle = `rgb(${v},${v},${v + 2})`; g.fillRect(x, y, w, h);
      g.strokeStyle = `rgba(0,0,0,${seam})`; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
      g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 1; g.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
      if (r() < 0.3) { g.fillStyle = 'rgba(0,0,0,0.35)'; for (let i = 0; i < 4; i++) g.fillRect(x + 6 + i * 7, y + 6, 4, Math.min(16, h - 12)); }   // Lüftungsschlitze
      if (r() < 0.25) { g.fillStyle = 'rgba(0,0,0,0.45)'; for (const [a, b] of [[5, 5], [w - 8, 5], [5, h - 8], [w - 8, h - 8]]) g.fillRect(x + a, y + b, 3, 3); }   // Nieten
      if (accent && r() < 0.07) { g.fillStyle = accent; g.fillRect(x + 4, y + h - 10, w - 8, 5); }
      return;
    }
    if (w > h ? r() < 0.75 : r() < 0.25) { const k = 0.3 + r() * 0.4; cut(x, y, w * k, h, d + 1); cut(x + w * k, y, w * (1 - k), h, d + 1); }
    else { const k = 0.3 + r() * 0.4; cut(x, y, w, h * k, d + 1); cut(x, y + h * k, w, h * (1 - k), d + 1); }
  };
  cut(0, 0, 512, 512, 0);
  for (let i = 0; i < 260; i++) { const v = r() < 0.5 ? 0 : 255; g.fillStyle = `rgba(${v},${v},${v},0.05)`; g.fillRect(r() * 512, r() * 512, 1 + r() * 30, 1); }   // Kratzer
  return c;
}
function texFrom(canvas, color = true) { const t = new THREE.CanvasTexture(canvas); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; if (color) t.colorSpace = THREE.SRGBColorSpace; return t; }
function windowCanvas(seed) {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'), r = rng(seed); g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 26; row++) { if (r() < 0.45) continue; const y = 8 + row * 19.5; let x = r() * 30; while (x < 500) { const w = 3 + r() * 5; if (r() < 0.55) { g.fillStyle = r() < 0.85 ? `rgba(255,${200 + r() * 40},${130 + r() * 60},${0.5 + r() * 0.5})` : 'rgba(120,200,255,0.9)'; g.fillRect(x, y, w, 3); } x += w + 3 + r() * (r() < 0.2 ? 60 : 8); } }
  return c;
}
const cLight = panelCanvas(7, 208, 34, 0.5, 'rgba(255,120,20,0.9)'), cDark = panelCanvas(23, 150, 44, 0.8, 'rgba(170,30,40,0.9)'), cHuge = panelCanvas(51, 150, 50, 0.85, 'rgba(30,32,38,0.9)');
const tLight = texFrom(cLight), tDark = texFrom(cDark), tHuge = texFrom(cHuge), bLight = texFrom(cLight, false), bDark = texFrom(cDark, false), bHuge = texFrom(cHuge, false), tWin = texFrom(windowCanvas(5));

const M = (color, map, bump, o = {}) => new THREE.MeshPhysicalMaterial({ color, map, bumpMap: bump, bumpScale: 1.4, metalness: 0.55, roughness: 0.42, clearcoat: 0.8, clearcoatRoughness: 0.22, envMapIntensity: 1.15, ...o });
const GLOW = (r, g, b) => { const m = new THREE.MeshBasicMaterial({ toneMapped: false }); m.color.setRGB(r, g, b); return m; };

export const MATS = {
  // Handelsverband: helles Blech, orange Streifen
  hull: M(0xf2f4f8, tLight, bLight), hullDark: M(0x6a7286, tLight, bLight), stripe: M(0xff7a1a, tLight, bLight, { emissive: 0x4a1500 }), glass: M(0x0b1826, null, null, { metalness: 1, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2.2 }),
  ally: M(0xdfe6f2, tLight, bLight), allyStripe: M(0x2f8dff, tLight, bLight, { emissive: 0x06224a }), metal: M(0x3a3f4c, null, null, { metalness: 1, roughness: 0.26, clearcoat: 0.3 }), red: M(0xc8281e, null, null, { emissive: 0x300400 }),
  // Unternehmerverband: Anthrazit mit Gold
  dom: M(0xc4cbd6, tDark, bDark, { metalness: 0.6, roughness: 0.42 }), domLight: M(0xe6eaf0, tDark, bDark, { metalness: 0.55 }), gold: M(0x30333b, tDark, bDark, { metalness: 0.85, roughness: 0.35 }), bullion: M(0xd9a441, tDark, bDark, { metalness: 0.9, roughness: 0.28, emissive: 0x2a1a02 }),
  domRed: M(0xb02030, tDark, bDark, { emissive: 0x3a0508 }), ace: M(0x2b2d36, tDark, bDark, { metalness: 0.85, roughness: 0.28 }), acePurple: M(0x7a2ab8, tDark, bDark, { emissive: 0x2a0850 }),
  cap: M(0xc2c8d2, tHuge, bHuge, { metalness: 0.7, roughness: 0.5, emissiveMap: tWin, emissive: 0xffffff, emissiveIntensity: 2.4, bumpScale: 2 }), capLight: M(0xe8ecf2, tHuge, bHuge, { metalness: 0.65, roughness: 0.5, bumpScale: 2 }), capDark: M(0x373a42, tHuge, bHuge, { metalness: 0.8, roughness: 0.45 }),
  cargo: M(0xa8ad98, tLight, bLight), cargoBox: M(0xd98a35, tLight, bLight), cargoBlue: M(0x3f78c9, tLight, bLight), rock: new THREE.MeshStandardMaterial({ color: 0x8d8377, roughness: 0.95, metalness: 0.05, flatShading: true }),
  white: M(0xf4f4f0, null, null, { metalness: 0.2, roughness: 0.5, side: THREE.DoubleSide }), goldFoil: M(0xd8a23a, null, null, { metalness: 1, roughness: 0.32, clearcoat: 0 }), solar: M(0xffffff, null, null, { metalness: 0.9, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.8 }),
  engine: GLOW(0.35, 1.3, 3.0), engineRed: GLOW(2.6, 0.5, 0.18), engineBig: GLOW(1.7, 0.42, 0.14), eye: GLOW(4.5, 0.5, 0.25), purple: GLOW(2.6, 0.5, 4.2),
  green: GLOW(0.4, 2.6, 0.8), core: GLOW(4.5, 2.0, 0.5), windows: GLOW(2.2, 1.8, 1.1), blueLight: GLOW(0.5, 1.6, 3.2), goldLight: GLOW(2.6, 0.5, 0.3),
};

// ---------- Bauhilfen ----------
let UVS = 7;   // Texturgröße in Welteinheiten
const _n = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
function triUV(geo) {   // Projektion entlang der dominanten Achse der Flächennormale
  const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i += 3) {
    _a.fromBufferAttribute(p, i); _b.fromBufferAttribute(p, i + 1); _c.fromBufferAttribute(p, i + 2); _n.copy(_b).sub(_a).cross(_c.sub(_a));
    const ax = Math.abs(_n.x), ay = Math.abs(_n.y), az = Math.abs(_n.z);
    for (let k = 0; k < 3; k++) { const x = p.getX(i + k), y = p.getY(i + k), z = p.getZ(i + k); uv[(i + k) * 2] = (ax > ay && ax > az ? z : x) / UVS; uv[(i + k) * 2 + 1] = (ay >= ax && ay >= az ? z : y) / UVS; }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}
function part(g, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); g.add(m); return m;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const tube = (rFront, rBack, len, seg = 16) => new THREE.CylinderGeometry(rFront, rBack, len, seg).rotateX(Math.PI / 2);   // entlang Z, rFront vorn
const disc = (r, seg = 12) => new THREE.CircleGeometry(r, seg).rotateY(Math.PI);                                           // Düsenglut, schaut nach hinten
function plate(pts, t = 0.3) {   // flache Platte aus 2D-Umriss [x,z]
  const s = new THREE.Shape(); pts.forEach(([x, z], i) => (i ? s.lineTo(x, z) : s.moveTo(x, z)));
  const bv = Math.min(0.09, t * 0.3), g = new THREE.ExtrudeGeometry(s, { depth: t - bv * 2, bevelEnabled: true, bevelSize: bv, bevelThickness: bv, bevelSegments: 2, bevelOffset: -bv }); g.rotateX(Math.PI / 2); g.translate(0, t / 2 - bv, 0); return g;   // gefaste Kanten
}
const mirror = (pts) => pts.map(([x, z]) => [-x, z]).reverse();
// Verschmilzt alle direkten Mesh-Kinder je Material zu einem Netz. Untergruppen (bewegliche Teile) bleiben erhalten.
function bake(group) {
  const by = new Map(), keep = [];
  for (const ch of [...group.children]) {
    if (!ch.isMesh || ch.userData.keep) { keep.push(ch); if (ch.isGroup) bake(ch); continue; }
    ch.updateMatrix(); const g = triUV(ch.geometry.clone().applyMatrix4(ch.matrix)); if (!by.has(ch.material)) by.set(ch.material, []); by.get(ch.material).push(g);
  }
  group.clear();
  for (const [mat, list] of by) {
    let n = 0; for (const g of list) n += g.attributes.position.count; const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
    for (const g of list) { if (!g.attributes.normal) g.computeVertexNormals(); pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.computeBoundingSphere();
    group.add(new THREE.Mesh(geo, mat));
  }
  for (const k of keep) group.add(k); return group;
}
// Kanone mit Kühlrippen und Mündung
function cannon(g, x, y, z, len, r = 0.16) {
  part(g, tube(r, r * 1.5, len, 10), MATS.metal, x, y, z); part(g, tube(r * 2.4, r * 2.4, len * 0.2, 10), MATS.hullDark, x, y, z - len * 0.3);
  for (let i = 0; i < 4; i++) part(g, tube(r * 2.0, r * 2.0, len * 0.025, 10), MATS.metal, x, y, z - len * 0.12 + i * len * 0.06);   // Kühlrippen
  part(g, tube(r * 1.9, r * 1.3, len * 0.09, 10), MATS.metal, x, y, z + len * 0.46); part(g, tube(r * 0.9, r * 0.9, len * 0.012, 8), MATS.eye, x, y, z + len * 0.508);   // Mündung mit Glut
}
// Rakete am Pylon: Körper, Spitze, Leitwerk
function missile(g, x, y, z, len = 2.6, r = 0.2) {
  part(g, tube(r, r, len, 10), MATS.hull, x, y, z); part(g, new THREE.ConeGeometry(r, len * 0.24, 10).rotateX(Math.PI / 2), MATS.red, x, y, z + len * 0.62);
  part(g, tube(r * 1.06, r * 1.06, len * 0.08, 10), MATS.red, x, y, z + len * 0.3); part(g, tube(r * 0.8, r * 0.6, len * 0.08, 8), MATS.metal, x, y, z - len * 0.54);
  for (let i = 0; i < 4; i++) part(g, box(r * 2.6, 0.03, len * 0.2), MATS.metal, x, y, z - len * 0.4, 0, 0, i * 0.785);
  part(g, box(0.1, y < 0 ? 0.34 : 0.3, len * 0.5), MATS.hullDark, x, y + r + 0.14, z);
}
// Triebwerksgondel mit Einlassring und Glut
function nacelle(g, x, y, z, r, len, mat, glow) {
  part(g, tube(r * 0.82, r, len, 10), mat, x, y, z); part(g, tube(r * 1.08, r * 1.08, len * 0.12, 10), MATS.metal, x, y, z + len * 0.42);
  part(g, tube(r * 1.05, r * 0.86, len * 0.2, 10), MATS.metal, x, y, z - len * 0.5); part(g, disc(r * 0.74), glow, x, y, z - len * 0.61);
  part(g, new THREE.ConeGeometry(r * 0.45, len * 0.3, 8).rotateX(Math.PI / 2), MATS.metal, x, y, z + len * 0.55);
}

// ---------- Handelsverband ----------
function buildPfeil(hull, stripe) {
  const g = new THREE.Group();
  part(g, tube(0.16, 0.95, 7, 8), hull, 0, 0, 4.4, 0, 0, 0, 1, 0.8, 1);                 // lange Nase
  part(g, tube(0.95, 1.25, 4.6, 8), hull, 0, 0, -1.4, 0, 0, 0, 1, 0.86, 1);             // Rumpf
  part(g, box(2.2, 1.5, 3.4), MATS.hullDark, 0, 0, -5.2);                               // Heck
  part(g, box(0.5, 0.12, 5.4), stripe, 0, 0.62, 4.4, 0.105);                            // Nasenstreifen
  part(g, new THREE.SphereGeometry(0.8, 10, 8), MATS.glass, 0, 0.72, 0.6, 0, 0, 0, 0.8, 0.72, 2.3);   // Kanzel
  for (const z of [-0.6, 0.6, 1.7]) part(g, box(1.36, 0.07, 0.08), MATS.metal, 0, 1.2 - Math.abs(z - 0.6) * 0.12, z);   // Kanzelstreben
  part(g, box(0.07, 0.08, 3.4), MATS.metal, 0, 1.3, 0.6);
  part(g, new THREE.SphereGeometry(0.42, 8, 6, 0, 6.283, 0, 1.571), MATS.blueLight, 0, 0.66, -1.9);   // Sensorkuppel
  part(g, box(1.0, 0.3, 1.2), MATS.metal, 0, 0.6, -2.0);
  const wing = [[1.0, 1.6], [6.6, -3.2], [6.6, -5.4], [1.0, -4.9]];
  part(g, plate(wing, 0.26), hull); part(g, plate(mirror(wing), 0.26), hull);
  const band = [[3.2, -0.3], [4.3, -1.25], [4.3, -5.15], [3.2, -5.05]];
  part(g, plate(band, 0.32), stripe); part(g, plate(mirror(band), 0.32), stripe);
  const flap = [[1.4, -4.4], [6.2, -4.9], [6.2, -5.6], [1.4, -5.3]];
  part(g, plate(flap, 0.34), MATS.hullDark); part(g, plate(mirror(flap), 0.34), MATS.hullDark);
  for (const s of [-1, 1]) {
    cannon(g, s * 6.6, 0, -0.6, 7.6, 0.15); part(g, box(0.5, 0.5, 2.6), MATS.hullDark, s * 6.6, 0, -4);
    nacelle(g, s * 1.95, 0.55, -4.6, 0.78, 3.6, hull, MATS.engine); nacelle(g, s * 1.75, -0.6, -4.9, 0.56, 3.0, MATS.hullDark, MATS.engine);
    part(g, box(0.16, 0.5, 2.2), MATS.metal, s * 1.05, -0.5, 2.4);                       // Torpedorohre
    part(g, box(1.6, 0.1, 0.5), MATS.metal, s * 3.0, 0.2, -1.2, 0, s * -0.7, 0);          // Leitungen auf dem Flügel
    part(g, box(0.5, 0.14, 0.9), stripe, s * 5.4, 0.2, -4.0);
    missile(g, s * 3.1, -0.52, -2.2); missile(g, s * 4.5, -0.52, -3.0, 2.2, 0.17);
  }
  part(g, box(0.18, 1.9, 2.4), stripe, 0, 1.5, -5.2, -0.4); part(g, box(0.1, 1.4, 0.1), MATS.metal, 0.5, 1.4, -4.4);   // Seitenleitwerk, Antenne
  g.userData = { guns: [[-6.6, 0, 3.4], [6.6, 0, 3.4], [-1.05, -0.5, 4], [1.05, -0.5, 4]], engines: [[-1.95, 0.55, -6.9], [1.95, 0.55, -6.9]] };
  return g;
}
function buildWespe(hull, stripe) {
  const g = new THREE.Group();
  part(g, tube(0.1, 0.8, 8, 8), hull, 0, 0, 3, 0, 0, 0, 1, 0.7, 1); part(g, tube(0.8, 1.0, 4.4, 8), hull, 0, 0, -3.2, 0, 0, 0, 1, 0.8, 1);
  part(g, new THREE.SphereGeometry(0.66, 10, 8), MATS.glass, 0, 0.55, 0.3, 0, 0, 0, 0.8, 0.7, 2.4); part(g, box(0.06, 0.07, 3), MATS.metal, 0, 1.0, 0.3);
  part(g, box(0.4, 0.1, 5), stripe, 0, 0.5, 3.4, 0.09);
  const wing = [[0.6, -0.6], [4.8, -6.6], [3.5, -6.6], [0.6, -4.4]];
  for (const up of [-1, 1]) for (const s of [-1, 1]) {
    part(g, plate(s > 0 ? wing : mirror(wing), 0.2), up > 0 ? hull : MATS.hullDark, 0, 0, 0, 0, 0, s * up * 0.44);
    const tipX = s * 4.1 * Math.cos(0.44), tipY = up * 4.1 * Math.sin(0.44);
    cannon(g, tipX, tipY, -4.2, 5, 0.11); part(g, box(0.5, 0.12, 1.6), stripe, tipX * 0.72, tipY * 0.72 + up * 0.14, -4.6, 0, 0, s * up * 0.44);
  }
  nacelle(g, 0, 0, -5.4, 1.0, 3.2, MATS.hullDark, MATS.engine); for (const s of [-1, 1]) nacelle(g, s * 1.2, 0, -4.6, 0.42, 2.6, hull, MATS.engine);
  g.userData = { guns: [[-3.7, 1.75, -1.6], [3.7, 1.75, -1.6], [-3.7, -1.75, -1.6], [3.7, -1.75, -1.6]], engines: [[0, 0, -7.4]] };
  return g;
}
function buildBastion(hull, stripe) {
  const g = new THREE.Group();
  part(g, box(3.2, 1.9, 8.4), hull, 0, 0, -0.4); part(g, tube(0.5, 1.75, 4, 4), hull, 0, 0, 5.8, 0, 0, Math.PI / 4, 1, 0.76, 1);
  part(g, box(3.4, 0.5, 5), MATS.hullDark, 0, -1.0, -0.6); part(g, box(1.2, 0.14, 7), stripe, 0, 0.98, -0.2);
  part(g, new THREE.SphereGeometry(0.95, 10, 8), MATS.glass, 0, 1.0, 2.6, 0, 0, 0, 0.9, 0.7, 1.9); for (const z of [1.6, 2.6, 3.6]) part(g, box(1.6, 0.07, 0.08), MATS.metal, 0, 1.56 - Math.abs(z - 2.6) * 0.1, z);
  const wing = [[1.6, 2.4], [7, 0.2], [7, -3.4], [1.6, -4.6]];
  part(g, plate(wing, 0.5), hull); part(g, plate(mirror(wing), 0.5), hull);
  const band = [[3.6, 1.6], [4.8, 1.1], [4.8, -3.9], [3.6, -4.15]]; part(g, plate(band, 0.56), stripe); part(g, plate(mirror(band), 0.56), stripe);
  for (const s of [-1, 1]) {
    part(g, box(1.6, 1.7, 6.6), MATS.hullDark, s * 7, 0, -1.2); part(g, box(1.7, 0.4, 2), stripe, s * 7, 0.7, -1.4);
    cannon(g, s * 7, 0.5, 4, 5.6, 0.2); cannon(g, s * 7, -0.5, 4, 5.6, 0.2);
    nacelle(g, s * 2.4, 0.2, -5.6, 1.05, 3.6, hull, MATS.engine); part(g, box(0.9, 0.9, 2.4), MATS.metal, s * 4.6, -0.7, -0.4); missile(g, s * 3.2, -0.72, 0, 3, 0.24); missile(g, s * 5.8, -0.72, -0.8, 3, 0.24);   // Raketenbehälter und Raketen
    part(g, box(0.14, 1.6, 2), stripe, s * 2.4, 1.6, -5.6, -0.3);
  }
  g.userData = { guns: [[-7, 0.5, 7], [7, 0.5, 7], [-7, -0.5, 7], [7, -0.5, 7]], engines: [[-2.4, 0.2, -7.9], [2.4, 0.2, -7.9]] };
  return g;
}

// ---------- Unternehmerverband ----------
function buildDrone() {   // „Heuschrecke“: Kugelkanzel im Keil, zwei nach vorn gebogene Zangenflügel
  const g = new THREE.Group();
  part(g, tube(0.5, 1.45, 4.4, 6), MATS.dom, 0, 0, -0.4); part(g, new THREE.SphereGeometry(1.15, 10, 8), MATS.domLight, 0, 0.1, 1.5);
  part(g, new THREE.SphereGeometry(0.62, 8, 6), MATS.eye, 0, 0.16, 2.25); part(g, new THREE.TorusGeometry(0.78, 0.12, 5, 12), MATS.gold, 0, 0.16, 2.2);
  const claw = [[1.0, -2.6], [4.4, -1.4], [3.7, 5.0], [2.7, 0.9], [1.0, 1.0]];
  part(g, plate(claw, 0.42), MATS.dom); part(g, plate(mirror(claw), 0.42), MATS.dom);
  const edge = [[3.3, 1.6], [3.7, 5.0], [4.4, -1.4], [3.9, -1.2]]; part(g, plate(edge, 0.5), MATS.gold); part(g, plate(mirror(edge), 0.5), MATS.gold);
  for (const s of [-1, 1]) { part(g, tube(0.1, 0.16, 3, 5), MATS.metal, s * 3.0, -0.3, 2.6); part(g, box(1.8, 0.2, 0.5), MATS.metal, s * 1.9, 0.3, -1.2, 0, s * 0.3, 0); part(g, box(0.5, 0.5, 1.4), MATS.domRed, s * 2.2, 0, -1.9); }
  part(g, tube(1.2, 0.95, 0.9, 8), MATS.metal, 0, 0, -2.9); part(g, disc(0.85, 8), MATS.engineRed, 0, 0, -3.37);
  return g;
}
function buildDrone2() {  // „Zwilling“: zwei Ausleger, Kanzel dazwischen
  const g = new THREE.Group();
  for (const s of [-1, 1]) { part(g, tube(0.25, 0.8, 9, 6), MATS.dom, s * 2.6, 0, 0.4); part(g, disc(0.55, 8), MATS.engineRed, s * 2.6, 0, -4.12); part(g, box(0.3, 2.2, 2.4), MATS.gold, s * 2.6, 0.9, -3); part(g, tube(0.1, 0.14, 3, 5), MATS.metal, s * 2.6, -0.5, 4.6); }
  part(g, box(5.6, 0.4, 2.6), MATS.domLight, 0, 0, -0.6); part(g, new THREE.SphereGeometry(1.0, 10, 8), MATS.dom, 0, 0.2, 0.2); part(g, new THREE.SphereGeometry(0.5, 8, 6), MATS.eye, 0, 0.3, 1.0); part(g, box(5.6, 0.2, 0.5), MATS.domRed, 0, 0.3, -1.6);
  return g;
}
function buildDrone3() {  // „Rochen“: flacher Nurflügler mit hochgezogenen Spitzen
  const g = new THREE.Group(), w = [[0, 4.4], [5.6, -1.6], [5.2, -3.2], [1.6, -2.2], [0, -3.4]];
  part(g, plate(w, 0.5), MATS.dom); part(g, plate(mirror(w), 0.5), MATS.dom); part(g, plate([[0, 2.6], [2.2, -0.6], [0, -1.6]], 0.7), MATS.domLight); part(g, plate(mirror([[0, 2.6], [2.2, -0.6], [0, -1.6]]), 0.7), MATS.domLight);
  for (const s of [-1, 1]) { part(g, box(0.3, 1.8, 1.8), MATS.gold, s * 5.3, 0.8, -2.4, 0, 0, s * -0.3); part(g, tube(0.1, 0.14, 2.6, 5), MATS.metal, s * 1.6, -0.3, 2.6); part(g, disc(0.5, 8), MATS.engineRed, s * 1.0, 0.1, -2.72); part(g, tube(0.6, 0.5, 0.8, 8), MATS.metal, s * 1.0, 0.1, -2.3); }
  part(g, new THREE.SphereGeometry(0.55, 8, 6), MATS.eye, 0, 0.45, 1.6, 0, 0, 0, 0.8, 0.6, 1.8);
  return g;
}
function buildInter2() {  // „Sichel“: vorwärts gepfeilte Flügel
  const g = new THREE.Group(), w = [[0.4, -3.6], [4.6, 2.6], [3.6, 3.0], [0.4, -0.6]];
  part(g, tube(0.08, 0.8, 10, 6), MATS.domLight, 0, 0, 0.4); part(g, plate(w, 0.24), MATS.dom); part(g, plate(mirror(w), 0.24), MATS.dom);
  for (const s of [-1, 1]) { part(g, box(0.4, 0.3, 1.6), MATS.domRed, s * 4.1, 0, 2.4); part(g, tube(0.08, 0.12, 2.6, 5), MATS.metal, s * 4.1, 0, 3.8); }
  part(g, box(0.2, 1.8, 2), MATS.gold, 0, 0.9, -3.6, -0.3); part(g, new THREE.SphereGeometry(0.45, 8, 6), MATS.eye, 0, 0.4, 1.2, 0, 0, 0, 0.7, 0.5, 2); part(g, disc(0.7, 8), MATS.engineRed, 0, 0, -4.62);
  return g;
}
function buildInter() {   // „Kurshai“: Nadel mit drei Finnen
  const g = new THREE.Group();
  part(g, tube(0.06, 0.85, 9, 6), MATS.domLight, 0, 0, 0.4); part(g, new THREE.SphereGeometry(0.5, 8, 6), MATS.eye, 0, 0.42, 0.8, 0, 0, 0, 0.7, 0.5, 2);
  const fin = [[0.3, -0.6], [3.8, -5.2], [2.4, -5.2], [0.3, -3.6]], tip = [[2.4, -5.2], [3.8, -5.2], [3.3, -4.4]];
  for (let i = 0; i < 3; i++) { const a = (i * Math.PI * 2) / 3 + Math.PI / 2; part(g, plate(fin, 0.22), MATS.dom, 0, 0, 0, 0, 0, a); part(g, plate(tip, 0.3), MATS.gold, 0, 0, 0, 0, 0, a); }
  part(g, tube(0.95, 0.8, 1.2, 8), MATS.metal, 0, 0, -4.4); part(g, disc(0.7, 8), MATS.engineRed, 0, 0, -5.02); part(g, tube(1.0, 1.0, 0.3, 8), MATS.gold, 0, 0, -3.2);
  return g;
}
function buildBomber() {  // „Abmahner“: Doppelrumpf mit Bombenschacht
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    part(g, tube(1.0, 2.1, 11, 8), MATS.dom, s * 3.4, 0, 0); part(g, tube(2.2, 1.9, 1.4, 8), MATS.metal, s * 3.4, 0, -6); part(g, disc(1.6, 10), MATS.engineRed, s * 3.4, 0, -6.72);
    part(g, tube(2.2, 2.2, 0.5, 8), MATS.gold, s * 3.4, 0, -2); part(g, new THREE.SphereGeometry(0.8, 8, 6), MATS.eye, s * 3.4, 0.6, 3.4, 0, 0, 0, 0.8, 0.6, 1.6);
    part(g, box(0.2, 2.6, 3), MATS.domRed, s * 3.4, 2.4, -4, -0.3); cannon(g, s * 5.4, -0.4, 1, 4, 0.16);
  }
  part(g, box(5, 1.5, 5.4), MATS.domLight, 0, 0, -0.5); part(g, box(3, 1.2, 3.4), MATS.metal, 0, -1.2, -0.4);
  part(g, new THREE.SphereGeometry(1.3, 8, 6), MATS.green, 0, -1.7, 0.4); part(g, box(11.6, 0.36, 2.4), MATS.dom, 0, 0.95, -3.4); part(g, box(11.6, 0.4, 0.5), MATS.gold, 0, 0.95, -4.5);
  return g;
}
function buildAce() {     // „Liquidator“: schwarze Sichelflügel mit violetter Schneide
  const g = new THREE.Group();
  part(g, tube(0.08, 1.15, 11, 6), MATS.ace, 0, 0, 0.8, 0, 0, 0, 1, 0.7, 1); part(g, tube(1.15, 0.9, 2.4, 6), MATS.metal, 0, 0, -5.8, 0, 0, 0, 1, 0.7, 1);
  const blade = [[0.8, 1.5], [6.6, -1.6], [7.8, 5.8], [5.5, 0.5], [0.8, -4.2]];
  part(g, plate(blade, 0.28), MATS.ace); part(g, plate(mirror(blade), 0.28), MATS.ace);
  const edge = [[5.5, 0.5], [7.8, 5.8], [6.3, 0.3]], inner = [[1.4, 0.4], [4.6, -1.3], [4.6, -2.0], [1.4, -2.4]];
  part(g, plate(edge, 0.36), MATS.acePurple); part(g, plate(mirror(edge), 0.36), MATS.acePurple); part(g, plate(inner, 0.34), MATS.gold); part(g, plate(mirror(inner), 0.34), MATS.gold);
  part(g, new THREE.SphereGeometry(0.62, 8, 6), MATS.purple, 0, 0.5, 1.6, 0, 0, 0, 0.8, 0.6, 2.2);
  for (const s of [-1, 1]) { cannon(g, s * 2.4, -0.2, 1.4, 4.4, 0.13); part(g, box(0.14, 1.8, 2.2), MATS.acePurple, s * 1.2, 1.1, -4.6, -0.4, 0, s * -0.35); }
  part(g, disc(0.8, 8), MATS.purple, 0, 0, -7.02);
  return g;
}
function buildTurret() {
  const g = new THREE.Group();
  part(g, new THREE.CylinderGeometry(5, 6.5, 3, 10), MATS.domLight); part(g, new THREE.CylinderGeometry(6.8, 6.8, 0.6, 10), MATS.gold, 0, -1.2, 0);
  part(g, new THREE.SphereGeometry(4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), MATS.dom, 0, 1.2, 0);
  const head = new THREE.Group(); head.position.y = 3; g.add(head);
  part(head, box(5, 2.4, 4), MATS.dom, 0, 0.6, 0.5);
  for (const s of [-1, 1]) { part(head, tube(0.45, 0.75, 9, 6), MATS.metal, s * 1.4, 0.6, 5.5); part(head, tube(0.9, 0.9, 1.2, 6), MATS.domRed, s * 1.4, 0.6, 3); part(head, tube(0.7, 0.5, 0.8, 6), MATS.gold, s * 1.4, 0.6, 9.8); }
  part(head, new THREE.SphereGeometry(0.9, 6, 4), MATS.eye, 0, 2, 0.6);
  g.userData.head = head;
  return g;
}
function buildGen() {
  const g = new THREE.Group();
  part(g, new THREE.CylinderGeometry(11, 13, 5, 12), MATS.domLight); part(g, new THREE.CylinderGeometry(13.4, 13.4, 1, 12), MATS.gold, 0, -2, 0);
  part(g, new THREE.SphereGeometry(9.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), MATS.green, 0, 2, 0);
  for (let i = 0; i < 6; i++) { const a = i * 1.047; part(g, box(1.1, 15, 1.1), MATS.dom, Math.cos(a) * 10.5, 5, Math.sin(a) * 10.5); part(g, box(1.6, 1, 1.6), MATS.gold, Math.cos(a) * 10.5, 12.6, Math.sin(a) * 10.5); }
  part(g, new THREE.TorusGeometry(10.5, 0.5, 5, 18).rotateX(Math.PI / 2), MATS.metal, 0, 9, 0);
  return g;
}
function buildBuoy() {    // „Werbeboje“ mit vier Leuchttafeln
  const g = new THREE.Group();
  part(g, new THREE.OctahedronGeometry(6), MATS.dom, 0, 0, 0, 0, 0, 0, 1, 1.5, 1); part(g, new THREE.TorusGeometry(9, 0.6, 6, 20).rotateX(Math.PI / 2), MATS.gold);
  part(g, new THREE.TorusGeometry(7, 0.4, 6, 20), MATS.eye, 0, 0, 0, 0.6, 0.4); part(g, new THREE.SphereGeometry(2.4, 8, 6), MATS.eye);
  for (let i = 0; i < 4; i++) { const a = i * 1.571; part(g, box(7, 4, 0.3), MATS.goldLight, Math.cos(a) * 12, 0, Math.sin(a) * 12, 0, -a + 1.571, 0); part(g, box(3.4, 0.4, 0.4), MATS.metal, Math.cos(a) * 9.4, 0, Math.sin(a) * 9.4, 0, -a, 0); }
  part(g, box(0.3, 9, 0.3), MATS.metal, 0, 12, 0); part(g, new THREE.SphereGeometry(0.7, 6, 4), MATS.eye, 0, 16.6, 0);
  return g;
}
function buildCore() {
  const g = new THREE.Group();
  part(g, new THREE.IcosahedronGeometry(13, 1), MATS.core);
  const sh = new THREE.Mesh(new THREE.SphereGeometry(21, 20, 14), new THREE.MeshBasicMaterial({ color: 0x3a8cff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  sh.userData.keep = true; g.add(sh); g.userData.shield = sh;
  part(g, new THREE.TorusGeometry(17, 1.4, 6, 20).rotateX(Math.PI / 2), MATS.gold); part(g, new THREE.TorusGeometry(17, 1.4, 6, 20), MATS.domLight, 0, 0, 0, 0, Math.PI / 2);
  part(g, new THREE.TorusGeometry(17, 1.0, 6, 20), MATS.domLight);
  return g;
}
function buildTransport() {
  const g = new THREE.Group();
  part(g, box(9, 7, 60), MATS.cargo); part(g, box(5, 2, 56), MATS.hullDark, 0, 4.2, 0); part(g, box(12, 9, 12), MATS.ally, 0, 2, 34); part(g, tube(3, 6.5, 8, 4), MATS.ally, 0, 1.4, 43, 0, 0, Math.PI / 4, 1, 0.7, 1);
  part(g, box(8.4, 2, 0.4), MATS.windows, 0, 5, 40.2); part(g, box(12.4, 1.4, 6), MATS.allyStripe, 0, -1, 34);
  const cols = [MATS.cargoBox, MATS.cargoBlue, MATS.hullDark, MATS.cargoBox];
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { part(g, box(8, 8, 11), cols[(i + (s > 0 ? 1 : 0)) % 4], s * 9, 0, -22 + i * 13); part(g, box(8.3, 0.5, 11.3), MATS.metal, s * 9, 0, -22 + i * 13); part(g, box(8.3, 8.3, 0.5), MATS.metal, s * 9, 0, -22 + i * 13); }
  for (const s of [-1, 1]) { nacelle(g, s * 5, 0, -35, 4.2, 12, MATS.hullDark, MATS.engine); part(g, box(0.4, 10, 0.4), MATS.metal, s * 4, 9, 30); }
  part(g, new THREE.SphereGeometry(2.2, 8, 6, 0, 6.283, 0, 1.571), MATS.metal, 0, 6.5, 30);
  return g;
}

function buildKami() {    // „Spekulant“: fliegende Sprengladung mit Stacheln
  const g = new THREE.Group();
  part(g, new THREE.IcosahedronGeometry(1.5, 1), MATS.dom); part(g, new THREE.SphereGeometry(0.85, 8, 6), MATS.eye, 0, 0, 1.1);
  for (let i = 0; i < 6; i++) { const a = i * 1.047; part(g, new THREE.ConeGeometry(0.3, 2.8, 6), MATS.gold, Math.cos(a) * 2, Math.sin(a) * 2, -0.3, 0, 0, a - 1.571); }
  part(g, tube(0.9, 0.7, 1.6, 8), MATS.metal, 0, 0, -1.8); part(g, disc(0.6, 8), MATS.engineRed, 0, 0, -2.62); part(g, new THREE.TorusGeometry(1.7, 0.16, 5, 14), MATS.domRed);
  return g;
}
function buildHauler() {  // „Goldtransporter“: gepanzerter Frachter mit Goldcontainern
  const g = new THREE.Group();
  part(g, box(10, 9, 64), MATS.dom); part(g, box(14, 11, 12), MATS.domLight, 0, 1, 34); part(g, tube(3, 7.5, 9, 4), MATS.dom, 0, 1, 44.5, 0, 0, Math.PI / 4, 1, 0.75, 1);
  part(g, box(10, 1.6, 0.5), MATS.eye, 0, 4.4, 40.2); part(g, box(6, 2.4, 60), MATS.domLight, 0, 5.6, -2);
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { part(g, box(8, 8, 12), MATS.bullion, s * 9.4, 0, -24 + i * 14); part(g, box(8.4, 0.6, 12.4), MATS.metal, s * 9.4, 0, -24 + i * 14); part(g, box(8.4, 8.4, 0.6), MATS.metal, s * 9.4, 0, -24 + i * 14); }
  for (const s of [-1, 1]) { nacelle(g, s * 5.4, 0, -37, 4.4, 13, MATS.metal, MATS.engineRed); cannon(g, s * 3, 8, 20, 12, 0.5); }
  part(g, new THREE.CylinderGeometry(4, 5, 2.4, 10), MATS.domLight, 0, 7.6, 16);
  return g;
}

function buildCorvette() { // „Vollstrecker“: Kanonenboot mit sechs Geschützen
  const g = new THREE.Group();
  part(g, box(13, 9, 58), MATS.dom); part(g, tube(2, 7.4, 20, 4), MATS.domLight, 0, 0, 39, 0, 0, Math.PI / 4, 1, 0.66, 1); part(g, box(9, 4, 44), MATS.domLight, 0, 6, -4); part(g, box(8, 3, 40), MATS.metal, 0, -5.6, -2);
  part(g, box(10, 7, 12), MATS.dom, 0, 11, -14); part(g, box(11, 2.4, 6), MATS.domLight, 0, 15, -12); part(g, box(9.6, 1.1, 0.5), MATS.eye, 0, 15.2, -8.9); part(g, box(0.4, 9, 0.4), MATS.metal, 3, 20, -17); part(g, box(0.4, 6, 0.4), MATS.metal, -3, 18.6, -18);
  for (const s of [-1, 1]) {
    part(g, box(10, 3, 30), MATS.dom, s * 11, -1, -10); part(g, plate(s > 0 ? [[6, 12], [22, -8], [22, -22], [6, -24]] : mirror([[6, 12], [22, -8], [22, -22], [6, -24]]), 1.2), MATS.domLight, 0, -1, 0);
    part(g, box(1, 1.4, 56), MATS.gold, s * 6.6, 3, 0); part(g, box(10.2, 0.7, 30.2), MATS.gold, s * 11, 0.7, -10);
    nacelle(g, s * 12, -1, -28, 4.2, 14, MATS.metal, MATS.engineRed); cannon(g, s * 20, -0.4, 2, 20, 0.6); cannon(g, s * 14, 2.4, 14, 16, 0.5); cannon(g, s * 3.4, 8.6, 20, 14, 0.45);
    part(g, box(2.4, 2.4, 6), MATS.domRed, s * 20, -0.4, -9); for (let i = 0; i < 3; i++) part(g, box(0.5, 1.6, 2), MATS.eye, s * 6.8, 0, -16 + i * 12);
  }
  nacelle(g, 0, 1, -31, 5, 12, MATS.dom, MATS.engineRed); part(g, new THREE.SphereGeometry(2.6, 10, 6, 0, 6.283, 0, 1.571), MATS.metal, 0, 8, 10); part(g, box(5, 0.4, 5), MATS.goldLight, 0, -7.3, 14);
  return g;
}

function buildJammer() {   // „Störer“: Pfeilrumpf mit großer Störschüssel
  const g = new THREE.Group();
  part(g, tube(0.2, 1.1, 8, 6), MATS.dom, 0, 0, 0.5); part(g, box(5.4, 0.3, 2.6), MATS.domLight, 0, 0, -1.6); part(g, box(0.3, 2.6, 2.2), MATS.gold, 0, 1.2, -2.4);
  for (const s of [-1, 1]) { part(g, box(0.3, 2.4, 3.4), MATS.gold, s * 2.7, 0, -1.6); part(g, tube(0.1, 0.1, 3, 5), MATS.metal, s * 2.7, 1.4, -0.6); }
  const d = new THREE.Mesh(new THREE.SphereGeometry(2.2, 14, 8, 0, 6.283, 0, 0.9).rotateX(-Math.PI / 2), MATS.domLight); d.position.set(0, 1.3, 1.2); d.material = MATS.white; g.add(d);
  part(g, new THREE.SphereGeometry(0.5, 8, 6), MATS.purple, 0, 1.3, 2.4); part(g, tube(0.06, 0.06, 2.4, 4), MATS.metal, 0, 1.3, 1.2);
  part(g, disc(0.8, 8), MATS.purple, 0, 0, -3.52); part(g, tube(1.0, 0.8, 1.0, 8), MATS.metal, 0, 0, -3);
  return g;
}
function buildShielder() { // „Schildträger“: Kern in drei Projektorringen
  const g = new THREE.Group();
  part(g, new THREE.OctahedronGeometry(2.6, 1), MATS.dom); part(g, new THREE.SphereGeometry(1.5, 10, 8), MATS.blueLight);
  for (let i = 0; i < 3; i++) part(g, new THREE.TorusGeometry(5, 0.35, 6, 28), i ? MATS.domLight : MATS.gold, 0, 0, 0, i * 1.047, i * 0.7, 0);
  for (let i = 0; i < 4; i++) { const a = i * 1.571; part(g, box(0.5, 0.5, 3.4), MATS.metal, Math.cos(a) * 3.6, Math.sin(a) * 3.6, 0, 0, 0, a); part(g, new THREE.SphereGeometry(0.5, 6, 4), MATS.blueLight, Math.cos(a) * 5, Math.sin(a) * 5, 0); }
  part(g, tube(1.4, 1.1, 1.6, 8), MATS.metal, 0, 0, -3.2); part(g, disc(0.9, 8), MATS.engineRed, 0, 0, -4.02);
  return g;
}

// Großkampfschiff. k = 1: Kreuzer Rendite (ca. 430 lang), k = 1.9: Flaggschiff Monopol.
// Liefert Rumpfkugeln (Kollision) und Plätze für Türme, Generatoren und Kern in lokalen Koordinaten.
export function buildCapital(dread) {
  const g = new THREE.Group(), k = dread ? 1.9 : 1, r = rng(dread ? 91 : 37); UVS = 60;
  const P = (geo, mat, x, y, z, ...rest) => part(g, geo, mat, x * k, y * k, z * k, ...rest);
  const B = (w, h, d) => box(w * k, h * k, d * k);
  P(B(46, 34, 300), MATS.cap, 0, 0, 0);                                            // Rückgrat
  P(B(34, 6, 280), MATS.capLight, 0, 19, 0); P(B(20, 5, 240), MATS.cap, 0, 23.5, 10);   // gestufter Rücken
  P(B(30, 5, 260), MATS.capDark, 0, -19, 0);                                       // Kiel
  P(B(86, 20, 120), MATS.cap, 0, -4, -80); P(B(70, 6, 100), MATS.capLight, 0, 8, -84);   // Heckblock
  P(B(30, 26, 90), MATS.capLight, 0, 0, 190); P(tube(3 * k, 15 * k, 40 * k, 4), MATS.cap, 0, 0, 252, 0, 0, Math.PI / 4);   // Bug
  for (const s of [-1, 1]) {
    P(B(14, 12, 150), MATS.cap, s * 34, 0, 150); P(tube(1.5 * k, 6 * k, 30 * k, 4), MATS.capLight, s * 34, 0, 238, 0, 0, Math.PI / 4);   // Gabelzinken
    P(B(8, 4, 60), MATS.capDark, s * 26, 0, 110);
    P(B(20, 44, 60), MATS.capDark, s * 52, 0, -110); P(B(21, 3, 60), MATS.gold, s * 52, 14, -110); P(B(21, 3, 60), MATS.gold, s * 52, -14, -110);   // Triebwerksgondeln
    P(tube(17 * k, 15 * k, 10 * k, 12), MATS.metal, s * 52, 0, -144); P(disc(13.5 * k, 16), MATS.engineBig, s * 52, 0, -149.2);
    for (const y of [-13, 13]) { P(tube(7 * k, 6 * k, 8 * k, 10), MATS.metal, s * 22, y * 0.6, -143); P(disc(5.4 * k, 12), MATS.engineBig, s * 22, y * 0.6, -147.2); }
    P(B(1.4, 14, 50), MATS.capDark, s * 23.4, -2, 60); P(B(0.8, 6, 44), MATS.blueLight, s * 23.9, -2, 60);     // Hangarbucht mit blauem Kraftfeld
    P(B(1, 1, 290), MATS.gold, s * 23.3, 12, 0); P(B(1, 1, 290), MATS.gold, s * 23.3, -12, 0);                 // Zierleisten
    for (let i = 0; i < 5; i++) P(tube(1.2 * k, 1.2 * k, 50 * k, 6), MATS.metal, s * 24.5, 8 - i * 0.4, -100 + i * 52);   // Rohrleitungen
    P(B(10, 10, 26), MATS.capLight, s * 30, -6, -10); P(tube(1 * k, 1.6 * k, 22 * k, 6), MATS.metal, s * 33, -6, 14);   // Seitenbatterien
  }
  // Brückenturm mit Masten und Schüssel
  P(B(34, 14, 40), MATS.cap, 0, 26, -60); P(B(26, 10, 30), MATS.capLight, 0, 38, -62); P(B(40, 5, 16), MATS.cap, 0, 45.5, -58); P(B(38, 1.6, 0.6), MATS.windows, 0, 46, -49.8);
  P(B(1.2, 22, 1.2), MATS.metal, -12, 58, -66); P(B(1.2, 30, 1.2), MATS.metal, 10, 62, -70); P(B(8, 0.8, 0.8), MATS.metal, 10, 70, -70);
  P(new THREE.SphereGeometry(6 * k, 10, 6, 0, 6.283, 0, 1.2), MATS.capLight, -10, 50, -72, Math.PI); P(new THREE.SphereGeometry(1.2 * k, 6, 4), MATS.eye, 10, 77.5, -70);
  // Ringsektion mit Speichen
  P(new THREE.TorusGeometry(58 * k, 5 * k, 6, 20), MATS.cap, 0, 0, 40); P(new THREE.TorusGeometry(58 * k, 1.2 * k, 5, 20), MATS.gold, 0, 0, 43.4);
  for (let i = 0; i < 4; i++) { const a = i * 1.571 + 0.785; P(B(4, 36, 5), MATS.capDark, Math.cos(a) * 40, Math.sin(a) * 40, 40, 0, 0, a - 1.571); }
  if (dread) { P(tube(7 * k, 9 * k, 70 * k, 10), MATS.metal, 0, 0, 205); P(tube(10 * k, 10 * k, 6 * k, 10), MATS.gold, 0, 0, 236); P(disc(6 * k, 12).rotateY(Math.PI), MATS.eye, 0, 0, 240.2); }   // Hauptgeschütz
  // Kleinteile: Aufbauten, Kästen, Antennen auf Rücken, Kiel und Flanken
  for (let i = 0; i < (dread ? 260 : 190); i++) {
    const z = -140 + r() * 280, side = r(), w = 2 + r() * 7, h = 1.5 + r() * 5, d = 3 + r() * 14, mat = r() < 0.5 ? MATS.capLight : r() < 0.8 ? MATS.capDark : MATS.metal;
    if (side < 0.4) P(B(w, h, d), mat, (r() - 0.5) * 30, 22 + h / 2 + (Math.abs(z - 10) < 115 && r() < 0.5 ? 4 : 0), z);
    else if (side < 0.62) P(B(w, h, d), mat, (r() - 0.5) * 26, -21.5 - h / 2, z);
    else if (side < 0.82) P(B(h * 0.6, w, d), mat, (r() < 0.5 ? -1 : 1) * (23 + h * 0.3), (r() - 0.5) * 22, z);
    else P(B(w, h, d * 0.6), mat, (r() - 0.5) * 80, 6 + h / 2 + (r() < 0.5 ? 5 : 0), -130 + r() * 100);
  }
  for (let i = 0; i < 16; i++) P(B(0.5, 8 + r() * 14, 0.5), MATS.metal, (r() - 0.5) * 28, 30, -130 + r() * 260);
  const hull = [];
  for (let z = -135; z <= 225; z += 30) hull.push([0, 0, z * k, 20 * k]);
  for (const s of [-1, 1]) { hull.push([s * 50 * k, -4 * k, -110 * k, 18 * k]); hull.push([s * 34 * k, 0, 140 * k, 12 * k]); hull.push([s * 34 * k, 0, 190 * k, 12 * k]); }
  hull.push([0, 34 * k, -60 * k, 17 * k]);
  const top = 26 * k + 2, bot = 21.5 * k + 2, turrets = [];
  for (const z of dread ? [-20, 30, 90, 124] : [0, 70, 120]) turrets.push([0, top, z * k, 0]);
  turrets.push([0, 13 * k + 2, 205 * k, 0]); if (dread) turrets.push([0, 13 * k + 2, 170 * k, 0]);
  for (const z of dread ? [-100, -30, 60, 120] : [-90, 20, 110]) turrets.push([0, -bot, z * k, Math.PI]);
  for (const s of [-1, 1]) { turrets.push([s * 34 * k, 6 * k + 2, 120 * k, 0]); if (dread) { turrets.push([s * 43 * k, 11 * k + 2, -110 * k, 0]); turrets.push([s * 34 * k, 6 * k + 2, 200 * k, 0]); } }
  const gens = dread ? [[-28 * k, 11 * k + 3, -40 * k], [28 * k, 11 * k + 3, -40 * k], [0, 22 * k + 3, -128 * k]] : [[-30, 14, -100], [30, 14, -100]];
  const core = dread ? [0, -(21.5 * k + 26), 40 * k] : [0, 0, -182];
  bake(g); UVS = 7;
  g.userData = { hull, turrets, gens, core, len: 300 * k, k };
  return g;
}

// ---------- Fabrik: einmal bauen, verschmelzen, dann klonen ----------
const BUILD = { drone: buildDrone, inter: buildInter, bomber: buildBomber, ace: buildAce, turret: buildTurret, gen: buildGen, buoy: buildBuoy, core: buildCore, transport: buildTransport, kami: buildKami, hauler: buildHauler, target: buildBuoy, corvette: buildCorvette, jammer: buildJammer, shielder: buildShielder, drone2: buildDrone2, drone3: buildDrone3, inter2: buildInter2 };
const protos = {};
function fromProto(key, make) {
  if (!protos[key]) { UVS = key === 'transport' || key === 'hauler' || key === 'corvette' ? 14 : ['gen', 'turret', 'core', 'buoy'].includes(key) ? 10 : 7; const g = make(), ud = g.userData; bake(g); g.userData = ud; protos[key] = g; UVS = 7; }
  const p = protos[key], c = p.clone(true); c.userData = { ...p.userData };
  if (p.userData.head) c.userData.head = c.children[p.children.indexOf(p.userData.head)];
  if (p.userData.shield) { const i = p.children.indexOf(p.userData.shield); c.children[i].material = p.userData.shield.material.clone(); c.userData.shield = c.children[i]; }
  return c;
}
export const buildEnemy = (kind) => fromProto(kind, BUILD[kind]);
export function buildPlayerShip(id, ally = false) {
  const hull = ally ? MATS.ally : MATS.hull, stripe = ally ? MATS.allyStripe : MATS.stripe;
  return fromProto(id + (ally ? '_a' : ''), () => (id === 'wespe' ? buildWespe(hull, stripe) : id === 'bastion' ? buildBastion(hull, stripe) : buildPfeil(hull, stripe)));
}

// ---------- Asteroiden: Fraktal-Rauschen plus Einschlagkrater, glatte Normalen aus der Höhenfunktion ----------
function noise3(seed) {
  const h = (x, y, z) => { const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 13.37) * 43758.5453; return n - Math.floor(n); };
  const sm = (t) => t * t * (3 - 2 * t), mix = (a, b, t) => a + (b - a) * t;
  const n = (x, y, z) => { const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), u = sm(x - xi), v = sm(y - yi), w = sm(z - zi);
    return mix(mix(mix(h(xi, yi, zi), h(xi + 1, yi, zi), u), mix(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v), mix(mix(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), mix(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v), w); };
  return (x, y, z, oct) => { let a = 0.5, s = 0, f = 1; for (let i = 0; i < oct; i++) { s += a * n(x * f, y * f, z * f); f *= 2.07; a *= 0.5; } return s; };
}
export function buildAsteroidGeos(detail = 16, count = 6) {
  const out = [], d = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3(), p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3();
  for (let v = 0; v < count; v++) {
    const r = rng(101 + v * 7), fb = noise3(v + 1), sx = 0.8 + r() * 0.5, sy = 0.6 + r() * 0.35, sz = 0.85 + r() * 0.6, craters = [];
    for (let i = 0; i < 9 + v; i++) { const c = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(); craters.push({ c, s: 0.12 + r() * r() * 0.5, depth: 0.05 + r() * 0.1 }); }
    const f = (dir, out) => {   // Punkt auf der Oberfläche in Richtung dir
      let h = 1 + 0.5 * (fb(dir.x * 1.3 + 5, dir.y * 1.3, dir.z * 1.3, 4) - 0.47) + 0.16 * (fb(dir.x * 4.1, dir.y * 4.1 + 9, dir.z * 4.1, 3) - 0.47) + 0.045 * (fb(dir.x * 13, dir.y * 13, dir.z * 13 + 3, 2) - 0.47);
      for (const k of craters) { const ang = Math.acos(Math.min(1, dir.dot(k.c))); if (ang < k.s * 1.5) { const x = ang / k.s; h += x < 1 ? k.depth * (x * x - 1) * (0.6 + 0.4 * x) : 0; h += k.depth * 0.45 * Math.exp(-(((x - 1.02) / 0.16) ** 2)); } }   // Schüssel und aufgeworfener Rand
      return out.set(dir.x * h * sx, dir.y * h * sy, dir.z * h * sz);
    };
    const geo = new THREE.IcosahedronGeometry(1, detail), pos = geo.attributes.position, nor = new Float32Array(pos.count * 3);
    for (let j = 0; j < pos.count; j++) {
      d.fromBufferAttribute(pos, j).normalize(); t1.set(d.y, -d.x, 0); if (t1.lengthSq() < 0.01) t1.set(0, d.z, -d.y); t1.normalize(); t2.crossVectors(d, t1);
      f(d, p0); f(p1.copy(d).addScaledVector(t1, 0.012).normalize(), p1); f(p2.copy(d).addScaledVector(t2, 0.012).normalize(), p2);
      p1.sub(p0); p2.sub(p0); p1.cross(p2).normalize(); if (p1.dot(d) < 0) p1.negate();
      pos.setXYZ(j, p0.x, p0.y, p0.z); nor[j * 3] = p1.x; nor[j * 3 + 1] = p1.y; nor[j * 3 + 2] = p1.z;
    }
    UVS = 1.3; const g2 = triUV(geo); UVS = 7; g2.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g2.computeBoundingSphere(); out.push(g2);
  }
  return out;
}
export const ROCK_MATS = [0xffffff, 0xd9c2ad, 0xb9bcc4].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.96, metalness: 0.04, bumpScale: 2.6 }));

// ---------- Kulisse: Handelsstation und Relais-Satelliten ----------
function dishGeo(r, depth) { const pts = []; for (let i = 0; i <= 10; i++) { const x = (i / 10) * r; pts.push(new THREE.Vector2(x, (x * x) / (r * r) * depth)); } return new THREE.LatheGeometry(pts, 28).rotateX(Math.PI / 2); }
function dish(g, x, y, z, r, rx = 0, ry = 0) {
  const d = new THREE.Group(); d.position.set(x, y, z); d.rotation.set(rx, ry, 0);
  const m = part(d, dishGeo(r, r * 0.34), MATS.white); m.material = MATS.white; part(d, dishGeo(r * 0.98, r * 0.33), MATS.metal, 0, 0, -0.06 * r);
  part(d, tube(r * 0.03, r * 0.03, r * 0.9, 6), MATS.metal, 0, 0, r * 0.45); part(d, new THREE.SphereGeometry(r * 0.09, 8, 6), MATS.gold, 0, 0, r * 0.9);
  for (let i = 0; i < 3; i++) { const a = i * 2.094; part(d, tube(r * 0.015, r * 0.015, r * 1.0, 4), MATS.metal, Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, r * 0.5, Math.sin(a) * 0.72, -Math.cos(a) * 0.72, 0); }
  part(d, tube(r * 0.1, r * 0.14, r * 0.5, 8), MATS.hullDark, 0, 0, -r * 0.22);
  d.updateMatrix(); for (const c of [...d.children]) { c.applyMatrix4(d.matrix); g.add(c); }
}
function solarWing(g, x, y, z, w, h, rz = 0) {
  part(g, box(w, 0.25, h), MATS.solar, x, y, z, 0, 0, rz); part(g, box(w * 1.02, 0.35, 0.3), MATS.metal, x, y, z, 0, 0, rz); part(g, box(0.3, 0.35, h * 1.02), MATS.metal, x, y, z, 0, 0, rz);
  for (const s of [-1, 1]) part(g, box(w * 1.02, 0.35, 0.25), MATS.metal, x, y, z + s * h * 0.5, 0, 0, rz);
}
export function buildSatellite() {
  if (protos.sat) return protos.sat.clone(true);
  const g = new THREE.Group(); UVS = 6;
  part(g, box(3, 3, 5), MATS.goldFoil); part(g, box(3.2, 0.3, 5.2), MATS.metal, 0, 1.4, 0); part(g, box(2, 2, 1.4), MATS.hullDark, 0, 0, -3.1);
  for (const s of [-1, 1]) { part(g, tube(0.15, 0.15, 3, 6).rotateY(Math.PI / 2), MATS.metal, s * 3, 0, 0); solarWing(g, s * 9.5, 0, 0, 10, 4.2, 0.25 * s); }
  dish(g, 0, 2.6, 0.6, 3.2, -0.9, 0.2); dish(g, 0, -2, 2.2, 1.3, 0.7, 0);
  part(g, box(0.12, 5, 0.12), MATS.metal, 1, 3.8, -2); part(g, new THREE.SphereGeometry(0.25, 6, 4), MATS.eye, 1, 6.4, -2); part(g, tube(0.5, 0.7, 1.2, 8), MATS.metal, 0, 0, -4.2); part(g, box(1.2, 1.2, 0.2), MATS.blueLight, -0.6, 0.4, 2.55);
  bake(g); UVS = 7; protos.sat = g; return g.clone(true);
}
export function buildStation() {
  const g = new THREE.Group(), r = rng(77); UVS = 26;
  const cyl = (rt, rb, h, seg = 24) => new THREE.CylinderGeometry(rt, rb, h, seg);
  part(g, cyl(16, 16, 90), MATS.cap); part(g, cyl(22, 22, 14), MATS.capLight, 0, 26, 0); part(g, cyl(22, 22, 14), MATS.capLight, 0, -26, 0); part(g, cyl(9, 16, 16), MATS.capLight, 0, 53, 0); part(g, cyl(16, 7, 22), MATS.capDark, 0, -56, 0);
  part(g, cyl(22.4, 22.4, 1.2), MATS.gold, 0, 33.4, 0); part(g, cyl(22.4, 22.4, 1.2), MATS.gold, 0, -33.4, 0); part(g, cyl(16.3, 16.3, 2.4), MATS.windows, 0, 8, 0); part(g, cyl(16.3, 16.3, 1.6), MATS.windows, 0, -10, 0);
  for (const [y, R, t] of [[0, 92, 9], [0, 60, 4]]) { part(g, new THREE.TorusGeometry(R, t, 10, 56).rotateX(Math.PI / 2), MATS.cap, 0, y, 0); part(g, new THREE.TorusGeometry(R + t * 0.72, t * 0.2, 6, 56).rotateX(Math.PI / 2), MATS.windows, 0, y, 0); part(g, new THREE.TorusGeometry(R, t * 1.04, 4, 56).rotateX(Math.PI / 2), MATS.gold, 0, y + t * 0.72, 0, 0, 0, 0, 1, 0.12, 1); }
  for (let i = 0; i < 6; i++) { const a = i * 1.047; part(g, box(4, 4, 78), MATS.capDark, Math.cos(a) * 53, 0, Math.sin(a) * 53, 0, -a + 1.571, 0); part(g, box(9, 7, 12), MATS.capLight, Math.cos(a) * 92, 8, Math.sin(a) * 92, 0, -a + 1.571, 0); }
  for (let i = 0; i < 4; i++) { const a = i * 1.571 + 0.785, x = Math.cos(a), z = Math.sin(a); part(g, box(2, 2, 50), MATS.metal, x * 40, -46, z * 40, 0, -a + 1.571, 0); const w = new THREE.Group(); w.position.set(x * 86, -46, z * 86); w.rotation.y = -a; solarWing(w, 0, 0, 0, 52, 22, 0.5); w.updateMatrix(); for (const c of [...w.children]) { c.applyMatrix4(w.matrix); g.add(c); } }
  part(g, cyl(1.2, 1.2, 60, 8), MATS.metal, 0, 90, 0); part(g, new THREE.SphereGeometry(2.2, 8, 6), MATS.eye, 0, 121, 0); for (const y of [74, 86, 98]) part(g, box(14, 0.6, 0.6), MATS.metal, 0, y, 0);
  dish(g, 14, 66, 0, 11, -1.1, 0.6); dish(g, -12, 64, 6, 7, -0.8, -1.2); dish(g, 0, -70, 0, 9, 1.571, 0);
  for (let i = 0; i < 70; i++) { const a = r() * 6.283, y = (r() - 0.5) * 84, w = 2 + r() * 5; part(g, box(w, 2 + r() * 5, w), r() < 0.5 ? MATS.capLight : MATS.capDark, Math.cos(a) * 16.6, y, Math.sin(a) * 16.6, 0, -a, 0); }
  for (let i = 0; i < 4; i++) { const a = i * 1.571; part(g, box(10, 8, 22), MATS.capDark, Math.cos(a) * 30, 0, Math.sin(a) * 30, 0, -a + 1.571, 0); part(g, box(7, 5, 0.6), MATS.blueLight, Math.cos(a) * 41.2, 0, Math.sin(a) * 41.2, 0, -a + 1.571, 0); }   // Hangartore
  bake(g); UVS = 7; return g;
}
