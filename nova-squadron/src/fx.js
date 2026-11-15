// Effekte: Partikel (ein Points-Objekt), Laserbolzen (ein InstancedMesh), Blitze, Schockringe, Sternenstaub.
import * as THREE from '../vendor/three.module.min.js';

function dotTexture(hard = 0.0) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25 + hard, 'rgba(255,255,255,0.7)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t;
}
const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _m = new THREE.Matrix4(), _c = new THREE.Color(), _z = new THREE.Vector3(0, 0, 1);

export class FX {
  constructor(scene, quality) {
    this.scene = scene; this.tex = dotTexture();
    const N = this.N = quality === 'low' ? 1500 : 4500; this.i = 0;
    this.pos = new Float32Array(N * 3); this.vel = new Float32Array(N * 3); this.col = new Float32Array(N * 3);
    this.life = new Float32Array(N); this.max = new Float32Array(N).fill(1); this.size = new Float32Array(N); this.drag = new Float32Array(N); this.alpha = new Float32Array(N);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1)); geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: this.tex }, scale: { value: 600 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'attribute float aSize; attribute float aAlpha; attribute vec3 color; varying vec3 vC; varying float vA; uniform float scale; void main(){ vC=color; vA=aAlpha; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=min(400.0, aSize*scale/max(1.0,-mv.z)); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform sampler2D map; varying vec3 vC; varying float vA; void main(){ float a=texture2D(map,gl_PointCoord).a*vA; gl_FragColor=vec4(vC*a,a); }',
    });
    this.points = new THREE.Points(geo, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 5; scene.add(this.points);
    // Blitze
    this.flashes = [];
    for (let i = 0; i < 28; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); s.visible = false; s.renderOrder = 6; scene.add(s); this.flashes.push({ s, t: 0, dur: 1, size: 1 }); }
    this.rings = [];
    const rg = new THREE.RingGeometry(0.95, 1, 64);
    for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide, toneMapped: false })); m.visible = false; scene.add(m); this.rings.push({ m, t: 0, dur: 1, size: 1 }); }
    // Sternenstaub: füllt einen Würfel um die Kamera und wickelt sich im Shader herum
    const D = 900, dg = new THREE.BufferGeometry(), dp = new Float32Array(D * 3); for (let i = 0; i < D * 3; i++) dp[i] = Math.random() * 500;
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
    this.dust = new THREE.Points(dg, new THREE.ShaderMaterial({
      uniforms: { cam: { value: new THREE.Vector3() }, map: { value: this.tex } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'uniform vec3 cam; varying float vA; void main(){ vec3 p=mod(position-cam+250.0,500.0)-250.0; float d=length(p); vA=smoothstep(250.0,150.0,d)*smoothstep(8.0,40.0,d); vec4 mv=viewMatrix*vec4(p+cam,1.0); gl_PointSize=clamp(900.0/max(1.0,-mv.z),1.0,5.0); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform sampler2D map; varying float vA; void main(){ float a=texture2D(map,gl_PointCoord).a*vA*0.8; gl_FragColor=vec4(vec3(0.75,0.85,1.0)*a,a); }',
    }));
    this.dust.frustumCulled = false; scene.add(this.dust);
  }
  p(x, y, z, vx, vy, vz, life, size, r, g, b, drag = 0.96) {
    const i = this.i; this.i = (i + 1) % this.N; const j = i * 3;
    this.pos[j] = x; this.pos[j + 1] = y; this.pos[j + 2] = z; this.vel[j] = vx; this.vel[j + 1] = vy; this.vel[j + 2] = vz;
    this.col[j] = r; this.col[j + 1] = g; this.col[j + 2] = b; this.life[i] = this.max[i] = life; this.size[i] = size; this.drag[i] = drag;
  }
  spark(pos, n, speed, life, size, r, g, b, inherit) {
    for (let k = 0; k < n; k++) {
      _v.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.3 + Math.random() * 0.7));
      if (inherit) _v.add(inherit);
      this.p(pos.x, pos.y, pos.z, _v.x, _v.y, _v.z, life * (0.5 + Math.random() * 0.5), size * (0.6 + Math.random() * 0.8), r, g, b);
    }
  }
  explode(pos, size = 1, tint = [1, 0.55, 0.2], inherit) {
    const n = Math.min(90, 22 + size * 14) | 0;
    this.spark(pos, n, 26 * Math.sqrt(size) + 12, 0.9 + size * 0.25, 2.4 * size + 1.5, tint[0] * 1.6, tint[1] * 1.6, tint[2] * 1.6, inherit);
    this.spark(pos, n >> 1, 60 * Math.sqrt(size) + 20, 0.5 + size * 0.1, 0.9 + size * 0.3, 2.2, 2.0, 1.6, inherit);
    this.spark(pos, n >> 2, 8 * size + 4, 1.6 + size * 0.3, 5 * size + 2, 0.28, 0.16, 0.1, inherit);
    this.flash(pos, 22 * size + 10, [2.5, 2.0, 1.5], 0.28 + size * 0.05);
    if (size >= 1.5) this.ring(pos, 30 * size, tint, 0.6 + size * 0.1);
  }
  flash(pos, size, c, dur = 0.3) { const f = this.flashes.find((f) => f.t <= 0) || this.flashes[0]; f.t = f.dur = dur; f.size = size; f.s.position.copy(pos); f.s.material.color.setRGB(c[0], c[1], c[2]); f.s.visible = true; }
  ring(pos, size, c, dur = 0.7) { const r = this.rings.find((r) => r.t <= 0) || this.rings[0]; r.t = r.dur = dur; r.size = size; r.m.position.copy(pos); r.m.material.color.setRGB(c[0] * 1.2, c[1] * 1.2, c[2] * 1.2); r.m.visible = true; }
  update(dt, camera) {
    const { pos, vel, life, max, alpha, drag, N } = this;
    for (let i = 0; i < N; i++) {
      if (life[i] <= 0) continue;
      const l = (life[i] -= dt), j = i * 3;
      if (l <= 0) { alpha[i] = 0; continue; }
      const d = Math.pow(drag[i], dt * 60); vel[j] *= d; vel[j + 1] *= d; vel[j + 2] *= d;
      pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt;
      const k = l / max[i]; alpha[i] = k * k * (3 - 2 * k);
    }
    const a = this.points.geometry.attributes; a.position.needsUpdate = a.color.needsUpdate = a.aSize.needsUpdate = a.aAlpha.needsUpdate = true;
    this.mat.uniforms.scale.value = innerHeight * 0.9;
    for (const f of this.flashes) { if (f.t <= 0) continue; f.t -= dt; const k = Math.max(0, f.t / f.dur); f.s.scale.setScalar(f.size * (1.6 - k * 0.8)); f.s.material.opacity = k * k; if (f.t <= 0) f.s.visible = false; }
    for (const r of this.rings) { if (r.t <= 0) continue; r.t -= dt; const k = Math.max(0, r.t / r.dur); r.m.scale.setScalar(r.size * (1 - k * k) + 0.1); r.m.material.opacity = k * 0.7; r.m.quaternion.copy(camera.quaternion); if (r.t <= 0) r.m.visible = false; }
    this.dust.material.uniforms.cam.value.copy(camera.position);
  }
}

// Bolzen-Renderer: bis zu cap längliche Leuchtkörper mit Farbe je Instanz
export class BoltMesh {
  constructor(scene, cap = 700) {
    this.cap = cap;
    const geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 6).rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    this.mesh = new THREE.InstancedMesh(geo, mat, cap); this.mesh.frustumCulled = false; this.mesh.count = 0;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.setColorAt(0, _c.setRGB(1, 1, 1)); scene.add(this.mesh);
  }
  draw(bolts) {
    let n = 0; const m = this.mesh;
    for (const b of bolts) {
      if (n >= this.cap) break; if (b.kind === 1) continue;   // Raketen zeichnet MissileMesh
      _v.copy(b.vel).normalize(); _q.setFromUnitVectors(_z, _v); _s.set(b.w, b.w, b.len); _m.compose(b.pos, _q, _s);
      m.setMatrixAt(n, _m); m.setColorAt(n, _c.setRGB(b.c[0], b.c[1], b.c[2])); n++;
    }
    m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }
}

// Raketen als kleine 3D-Modelle: Rumpf, Spitze, vier Leitflossen, Düse und Triebwerksflamme
function mergeColored(parts) {
  const pos = [], nor = [], col = [];
  for (const [g, c] of parts) { const n = g.toNonIndexed(); pos.push(...n.attributes.position.array); nor.push(...n.attributes.normal.array); for (let i = 0; i < n.attributes.position.count; i++) col.push(c[0], c[1], c[2]); }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return out;
}
export class MissileMesh {
  constructor(scene, cap = 96) {
    this.cap = cap; const X = Math.PI / 2, parts = [
      [new THREE.CylinderGeometry(0.5, 0.5, 4, 12).rotateX(X), [0.86, 0.87, 0.9]],
      [new THREE.CylinderGeometry(0.53, 0.53, 0.45, 12).rotateX(X).translate(0, 0, 1.2), [1, 0.42, 0.08]],
      [new THREE.CylinderGeometry(0.53, 0.53, 0.22, 12).rotateX(X).translate(0, 0, -0.6), [0.1, 0.16, 0.38]],
      [new THREE.ConeGeometry(0.5, 1.5, 12).rotateX(X).translate(0, 0, 2.75), [1, 0.42, 0.08]],
      [new THREE.CylinderGeometry(0.3, 0.44, 0.6, 10).rotateX(X).translate(0, 0, -2.3), [0.13, 0.13, 0.15]],
    ];
    for (let i = 0; i < 4; i++) parts.push([new THREE.BoxGeometry(0.09, 1.25, 1.3).translate(0, 0.85, -1.45).rotateZ(i * X), [0.1, 0.16, 0.38]]);
    this.mesh = new THREE.InstancedMesh(mergeColored(parts), new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.45, roughness: 0.38, emissive: 0x222222 }), cap);
    const fg = new THREE.ConeGeometry(0.42, 3.4, 8).rotateX(-X).translate(0, 0, -4.2);
    this.flame = new THREE.InstancedMesh(fg, new THREE.MeshBasicMaterial({ color: new THREE.Color(4.5, 2.2, 0.5), toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }), cap);
    for (const m of [this.mesh, this.flame]) { m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); }
  }
  draw(bolts) {
    let n = 0;
    for (const b of bolts) {
      if (b.kind !== 1 || n >= this.cap) continue;
      _v.copy(b.vel).normalize(); _q.setFromUnitVectors(_z, _v); _s.set(1.5, 1.5, 1.5); _m.compose(b.pos, _q, _s); this.mesh.setMatrixAt(n, _m);
      const f = 1.2 + Math.random() * 0.7; _s.set(1.5, 1.5, 1.5 * f); _m.compose(b.pos, _q, _s); this.flame.setMatrixAt(n, _m); n++;
    }
    for (const m of [this.mesh, this.flame]) { m.count = n; m.instanceMatrix.needsUpdate = true; }
  }
}
