// Explosionen: Feuerbälle als Billboards mit Flammen-Shader (Rauschen statt Textur, daher nie pixelig) und echte 3D-Trümmerteile.
import * as THREE from '../vendor/three.module.min.js';

const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _m = new THREE.Matrix4(), _ax = new THREE.Vector3(), _c = new THREE.Color();
const rnd = (a, b) => a + Math.random() * (b - a);

export class Blast {
  constructor(scene, quality) {
    const N = this.N = quality === 'low' ? 260 : 720; this.i = 0;
    this.pos = new Float32Array(N * 3); this.a = new Float32Array(N * 4); this.b = new Float32Array(N * 3);
    this.vel = new Float32Array(N * 3); this.life = new Float32Array(N); this.max = new Float32Array(N).fill(1); this.size0 = new Float32Array(N); this.grow = new Float32Array(N); this.spin = new Float32Array(N);
    const geo = new THREE.InstancedBufferGeometry(), pl = new THREE.PlaneGeometry(1, 1);
    geo.index = pl.index; geo.setAttribute('position', pl.attributes.position); geo.setAttribute('uv', pl.attributes.uv);
    geo.setAttribute('iPos', new THREE.InstancedBufferAttribute(this.pos, 3)); geo.setAttribute('iA', new THREE.InstancedBufferAttribute(this.a, 4)); geo.setAttribute('iB', new THREE.InstancedBufferAttribute(this.b, 3));
    geo.instanceCount = N; geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation,
      vertexShader: `attribute vec3 iPos; attribute vec4 iA; attribute vec3 iB; varying vec2 vUv; varying vec4 vA; varying vec3 vB;
        void main(){ vUv=uv-0.5; vA=iA; vB=iB; float c=cos(iA.y), s=sin(iA.y); vec2 p=vec2(position.x*c-position.y*s, position.x*s+position.y*c)*iA.x;
          vec4 mv=viewMatrix*vec4(iPos,1.0); mv.xy+=p; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `precision highp float; varying vec2 vUv; varying vec4 vA; varying vec3 vB;
        float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*n2(p); p=p*2.03+vec2(11.3,7.1); a*=0.5; } return s; }
        void main(){ float age=vA.z; if(age>=1.0) discard; vec2 q=vUv*2.0; float r=length(q);
          vec2 sd=vec2(vA.w*37.0, vA.w*91.0); float n=fbm(q*1.9+sd+vec2(0.0,-age*1.4)); float n1=fbm(q*4.3+sd*1.7+vec2(age*0.8,0.0));
          float d=r+(n-0.5)*1.05+(n1-0.5)*0.35; float body=smoothstep(1.0,0.18,d);                       // zerfaserter Rand
          float cool=pow(1.0-age,1.7); float heat=vB.x*cool*body*(0.45+1.1*n);                           // kühlt von außen nach innen ab
          vec3 fire=mix(vec3(0.75,0.06,0.0), vec3(1.0,0.42,0.04), smoothstep(0.08,0.45,heat));
          fire=mix(fire, vec3(1.0,0.86,0.5), smoothstep(0.45,0.95,heat)); fire=mix(fire, vec3(1.0,1.0,0.95), smoothstep(0.95,1.6,heat));
          fire=mix(fire, fire.bgr, vB.z);                                                                // Farbvariante (Plasma)
          fire*=heat*1.9;
          float sm=vB.y*body*smoothstep(0.02,0.3,age)*(1.0-smoothstep(0.5,1.0,age))*(0.55+0.6*n1);
          vec3 smoke=vec3(0.07,0.06,0.055)*(0.5+n)+vec3(0.5,0.16,0.02)*cool*0.35;                         // Rauch, von innen angeglüht
          gl_FragColor=vec4(fire+smoke*sm, sm*0.9); }`,
    });
    this.mesh = new THREE.Mesh(geo, mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 4; scene.add(this.mesh);
    for (let i = 0; i < N; i++) this.a[i * 4 + 2] = 1;
    // Trümmer: Bleche, Träger, Brocken
    const D = this.D = quality === 'low' ? 60 : 180; this.di = 0; this.deb = [];
    const dg = new THREE.BoxGeometry(1, 1, 1), dm = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.75, roughness: 0.45 });
    this.dmesh = new THREE.InstancedMesh(dg, dm, D); this.dmesh.frustumCulled = false; this.dmesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    _m.makeScale(0, 0, 0); for (let i = 0; i < D; i++) { this.dmesh.setMatrixAt(i, _m); this.dmesh.setColorAt(i, _c.setRGB(0.3, 0.3, 0.33)); this.deb.push({ life: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), ax: new THREE.Vector3(1, 0, 0), ang: 0, w: 0, s: new THREE.Vector3(), max: 1, trail: 0 }); }
    scene.add(this.dmesh);
  }
  puff(x, y, z, vx, vy, vz, size, life, heat = 1.2, smoke = 0.8, grow = 1.6, plasma = 0) {
    const i = this.i; this.i = (i + 1) % this.N; const j = i * 3, k = i * 4;
    this.pos[j] = x; this.pos[j + 1] = y; this.pos[j + 2] = z; this.vel[j] = vx; this.vel[j + 1] = vy; this.vel[j + 2] = vz;
    this.a[k] = size; this.a[k + 1] = Math.random() * 6.283; this.a[k + 2] = 0; this.a[k + 3] = Math.random();
    this.b[j] = heat; this.b[j + 1] = smoke; this.b[j + 2] = plasma; this.life[i] = this.max[i] = life; this.size0[i] = size; this.grow[i] = grow; this.spin[i] = rnd(-0.8, 0.8);
  }
  chunk(pos, vel, size, tint) {
    const d = this.deb[this.di]; const idx = this.di; this.di = (this.di + 1) % this.D;
    d.pos.copy(pos); d.vel.copy(vel); d.ax.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize(); d.ang = rnd(0, 6); d.w = rnd(2, 9); d.life = d.max = rnd(1.8, 3.6); d.trail = 0;
    const t = Math.random(); if (t < 0.45) d.s.set(size * rnd(0.8, 1.8), size * 0.12, size * rnd(0.5, 1.2)); else if (t < 0.75) d.s.set(size * 0.16, size * 0.16, size * rnd(1.2, 2.6)); else d.s.set(size * rnd(0.4, 0.8), size * rnd(0.4, 0.8), size * rnd(0.4, 0.8));
    const g = rnd(0.5, 1.1); this.dmesh.setColorAt(idx, _c.setRGB(tint[0] * g, tint[1] * g, tint[2] * g)); this.dmesh.instanceColor.needsUpdate = true;
  }
  // Explosion: Kernblitz kommt vom Aufrufer; hier Feuerball, Feuerring in einer Ebene, Rauch, Trümmer
  explode(pos, size, inherit, o = {}) {
    const sq = Math.sqrt(size), ix = inherit ? inherit.x * 0.35 : 0, iy = inherit ? inherit.y * 0.35 : 0, iz = inherit ? inherit.z * 0.35 : 0, pl = o.plasma || 0;
    const n = Math.min(16, 4 + Math.round(size * 3.2));
    for (let i = 0; i < n; i++) { _v.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize(); const sp = rnd(3, 13) * sq; this.puff(pos.x + _v.x * size * 1.4, pos.y + _v.y * size * 1.4, pos.z + _v.z * size * 1.4, _v.x * sp + ix, _v.y * sp + iy, _v.z * sp + iz, rnd(7, 12) * sq, rnd(0.7, 1.25) * (0.7 + sq * 0.4), rnd(1.1, 1.7), 0.9, rnd(1.2, 2.0), pl); }
    this.puff(pos.x, pos.y, pos.z, ix, iy, iz, 13 * sq, 0.5 + sq * 0.15, 1.7, 0.3, 1.2, pl);                    // heller Kern
    if (size >= 1.2) {   // Feuerring: breitet sich in einer zufällig geneigten Ebene kreisförmig aus
      _ax.set(rnd(-1, 1), rnd(0.3, 1), rnd(-1, 1)).normalize(); _q.setFromUnitVectors(_s.set(0, 1, 0), _ax); const m = Math.min(18, 8 + Math.round(size * 3));
      for (let i = 0; i < m; i++) { const a = (i / m) * 6.283 + rnd(-0.1, 0.1); _v.set(Math.cos(a), 0, Math.sin(a)).applyQuaternion(_q); const sp = rnd(24, 34) * sq; this.puff(pos.x, pos.y, pos.z, _v.x * sp + ix, _v.y * sp + iy, _v.z * sp + iz, rnd(4, 6.5) * sq, rnd(0.55, 0.85), 1.25, 0.45, 1.3, pl); }
    }
    for (let i = 0; i < Math.min(6, 2 + size); i++) { _v.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize(); this.puff(pos.x, pos.y, pos.z, _v.x * 4 * sq + ix, _v.y * 4 * sq + iy, _v.z * 4 * sq + iz, rnd(10, 16) * sq, rnd(1.8, 3.0), 0.25, 1, 1.6, pl); }   // Rauchwolke, die stehen bleibt
    if (!o.noDebris) { const c = Math.min(26, Math.round(3 + size * 4.5)), tint = o.tint || [0.34, 0.35, 0.4]; for (let i = 0; i < c; i++) { _v.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(14, 46) * sq); if (inherit) _v.addScaledVector(inherit, 0.6); this.chunk(pos, _v, rnd(0.7, 1.6) * sq, tint); } }
  }
  update(dt) {
    const { pos, vel, a, life, max, size0, grow, spin, N } = this;
    for (let i = 0; i < N; i++) {
      if (life[i] <= 0) continue; const j = i * 3, k = i * 4, l = (life[i] -= dt);
      if (l <= 0) { a[k + 2] = 1; a[k] = 0; continue; }
      const age = 1 - l / max[i], dr = Math.pow(0.05, dt); vel[j] *= dr; vel[j + 1] *= dr; vel[j + 2] *= dr;
      pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt;
      a[k] = size0[i] * (1 + grow[i] * (1 - Math.pow(1 - age, 2.4))); a[k + 1] += spin[i] * dt; a[k + 2] = age;
    }
    const at = this.mesh.geometry.attributes; at.iPos.needsUpdate = at.iA.needsUpdate = at.iB.needsUpdate = true;
    for (let i = 0; i < this.D; i++) {
      const d = this.deb[i]; if (d.life <= 0) continue; d.life -= dt;
      if (d.life <= 0) { _m.makeScale(0, 0, 0); this.dmesh.setMatrixAt(i, _m); continue; }
      d.pos.addScaledVector(d.vel, dt); d.vel.multiplyScalar(Math.pow(0.82, dt)); d.ang += d.w * dt; const k = Math.min(1, d.life / 0.5);
      _q.setFromAxisAngle(d.ax, d.ang); _s.copy(d.s).multiplyScalar(k); _m.compose(d.pos, _q, _s); this.dmesh.setMatrixAt(i, _m);
      if ((d.trail -= dt) < 0 && d.life > d.max * 0.45) { d.trail = 0.07; const hot = d.life / d.max; this.puff(d.pos.x, d.pos.y, d.pos.z, 0, 0, 0, d.s.z * 1.6 + 1, 0.5, hot * 1.3, 0.7, 1.2); }   // brennende Schleppe
    }
    this.dmesh.instanceMatrix.needsUpdate = true;
  }
}
