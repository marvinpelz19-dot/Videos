/* Launch film engine.
 *
 * A storyboard (window.STORYBOARD) is a list of scenes. Every scene is a pure
 * function of time: film.seek(t) puts the stage into the exact state of time
 * t, so the renderer can capture any frame in any order. Nothing animates on
 * its own; there are no CSS transitions, keyframes or timers in render mode.
 */
(function () {
  'use strict';

  const SB = window.STORYBOARD;
  if (!SB) throw new Error('window.STORYBOARD is missing');
  const ICONS = window.FILM_ICONS || {};
  const W = 1080;
  const H = 1920;
  const FPS = (SB.meta && SB.meta.fps) || 30;
  const BPM = (SB.meta && SB.meta.bpm) || 125;
  const BEAT = 60 / BPM;
  const RENDER = /[?&]render=1/.test(location.search);
  const stage = document.getElementById('stage');
  const theme = Object.assign(
    {
      canvas: '#f5f5f5',
      ink: '#222222',
      muted: '#a9a9a9',
      accent: '#27aef5',
      night: '#060708',
      white: '#ffffff',
      dot: 'rgba(0,0,0,0.1)',
    },
    SB.theme || {}
  );
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--canvas', theme.canvas);
  rootStyle.setProperty('--ink', theme.ink);
  rootStyle.setProperty('--muted', theme.muted);
  rootStyle.setProperty('--accent', theme.accent);
  rootStyle.setProperty('--night', theme.night);
  rootStyle.setProperty('--dot', theme.dot);
  if (theme.font) rootStyle.setProperty('--font', theme.font);

  /* ------------------------------------------------------------------ */
  /* math                                                                */
  /* ------------------------------------------------------------------ */

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const inv = (a, b, v) => (b === a ? (v >= b ? 1 : 0) : clamp((v - a) / (b - a)));

  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t;
    const sy = (t) => ((ay * t + by) * t + cy) * t;
    const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i += 1) {
        const err = sx(t) - x;
        if (Math.abs(err) < 1e-6) break;
        const d = dx(t);
        if (Math.abs(d) < 1e-6) break;
        t -= err / d;
      }
      let lo = 0;
      let hi = 1;
      t = clamp(t);
      for (let i = 0; i < 20 && Math.abs(sx(t) - x) > 1e-6; i += 1) {
        if (sx(t) < x) lo = t;
        else hi = t;
        t = (lo + hi) / 2;
      }
      return sy(t);
    };
  }

  const EASE = {
    linear: (t) => t,
    in: (t) => t * t * t,
    out: (t) => 1 - Math.pow(1 - t, 3),
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outQuart: (t) => 1 - Math.pow(1 - t, 4),
    outQuint: (t) => 1 - Math.pow(1 - t, 5),
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    inOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
    outBack: (t) => {
      const c1 = 1.55;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    smooth: bezier(0.22, 1, 0.36, 1),
    glide: bezier(0.45, 0, 0.2, 1),
    swift: bezier(0.65, 0, 0.35, 1),
    snap: bezier(0.2, 0.9, 0.1, 1),
  };
  const ease = (name) => (typeof name === 'function' ? name : EASE[name] || EASE.smooth);

  function spring(t, freq = 2.1, damping = 0.52) {
    if (t <= 0) return 0;
    const w = 2 * Math.PI * freq;
    const z = damping;
    if (z >= 1) return 1 - Math.exp(-w * t) * (1 + w * t);
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
  }

  function tween(t, t0, dur, a, b, e = 'smooth') {
    return lerp(a, b, ease(e)(inv(t0, t0 + dur, t)));
  }

  /** keys: [[time, value, easeName?], ...] sorted by time. Values may be numbers or arrays. */
  function track(t, keys, defEase = 'glide') {
    if (!keys || !keys.length) return undefined;
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i += 1) {
      const [t1, v1, e1] = keys[i];
      if (t < t1) {
        const [t0, v0] = keys[i - 1];
        const p = ease(e1 || defEase)(inv(t0, t1, t));
        if (Array.isArray(v0)) return v0.map((v, j) => lerp(v, v1[j], p));
        return lerp(v0, v1, p);
      }
    }
    return keys[keys.length - 1][1];
  }

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i += 1) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function parseColor(c) {
    if (Array.isArray(c)) return c;
    const s = String(c).trim();
    if (s[0] === '#') {
      let h = s.slice(1);
      if (h.length === 3) h = h.split('').map((x) => x + x).join('');
      const n = parseInt(h.slice(0, 6), 16);
      const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
    }
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(',').map((x) => parseFloat(x));
      return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]];
    }
    return [34, 34, 34, 1];
  }
  function mixColor(a, b, t) {
    const x = parseColor(a);
    const y = parseColor(b);
    return `rgba(${Math.round(lerp(x[0], y[0], t))},${Math.round(lerp(x[1], y[1], t))},${Math.round(lerp(x[2], y[2], t))},${lerp(x[3], y[3], t).toFixed(3)})`;
  }

  /* ------------------------------------------------------------------ */
  /* dom helpers                                                         */
  /* ------------------------------------------------------------------ */

  function el(tag, cls, parent, style) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (style) Object.assign(node.style, style);
    if (parent) parent.appendChild(node);
    return node;
  }
  function svgEl(tag, attrs, parent) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, v);
    if (parent) parent.appendChild(node);
    return node;
  }
  /** Writes a style property only when it changed. */
  function css(node, prop, value) {
    const cache = node.__css || (node.__css = {});
    if (cache[prop] === value) return;
    cache[prop] = value;
    node.style[prop] = value;
  }
  function show(node, on) {
    css(node, 'display', on ? '' : 'none');
  }
  function place(node, x, y, s = 1, r = 0, extra = '') {
    let v = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px)`;
    if (s !== 1) v += ` scale(${s.toFixed(4)})`;
    if (r) v += ` rotate(${r.toFixed(3)}deg)`;
    if (extra) v += ` ${extra}`;
    css(node, 'transform', v);
  }
  function fade(node, o) {
    css(node, 'opacity', o >= 0.999 ? '1' : o <= 0.001 ? '0' : o.toFixed(3));
  }
  function blur(node, px) {
    css(node, 'filter', px > 0.05 ? `blur(${px.toFixed(2)}px)` : 'none');
  }

  const ASSETS = SB.assets || {};
  function resolve(src) {
    if (!src) return src;
    if (ASSETS[src]) return ASSETS[src];
    return src;
  }
  const isVideo = (src) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(String(src || ''));

  const pending = [];
  function loadImage(src) {
    const img = new Image();
    img.decoding = 'sync';
    img.src = resolve(src);
    pending.push(
      img.decode().catch(() => {
        console.warn('image failed', src);
      })
    );
    return img;
  }
  const videos = [];
  function loadVideo(src, opts = {}) {
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.src = resolve(src);
    v.__rate = opts.rate || 1;
    v.__offset = opts.offset || 0;
    v.__loop = opts.loop !== false;
    pending.push(
      new Promise((res) => {
        const done = () => res();
        v.addEventListener('loadeddata', done, { once: true });
        v.addEventListener('error', () => {
          console.warn('video failed', src);
          res();
        }, { once: true });
        setTimeout(done, 15000);
      })
    );
    videos.push(v);
    return v;
  }
  function media(src, opts) {
    return isVideo(src) ? loadVideo(src, opts) : loadImage(src);
  }
  const videoSeeks = [];
  /** Moves a video to scene-local time t (render mode waits for the seek). */
  function syncVideo(v, t) {
    if (!v || v.tagName !== 'VIDEO') return;
    const d = v.duration || 0;
    let target = Math.max(0, v.__offset + t * v.__rate);
    if (d > 0) target = v.__loop ? target % Math.max(0.05, d - 0.05) : Math.min(target, d - 0.04);
    if (Math.abs(v.currentTime - target) < 0.5 / FPS) return;
    videoSeeks.push(
      new Promise((res) => {
        const done = () => res();
        v.addEventListener('seeked', done, { once: true });
        setTimeout(done, 3000);
        v.currentTime = target;
      })
    );
  }

  function iconSvg(name, { stroke = 2, color = 'currentColor' } = {}) {
    const nodes = ICONS[name];
    const svg = svgEl('svg', {
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: color,
      'stroke-width': stroke,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    });
    if (!nodes) {
      svgEl('circle', { cx: 12, cy: 12, r: 9 }, svg);
      console.warn('unknown icon', name);
      return svg;
    }
    for (const [tag, attrs] of nodes) svgEl(tag, attrs, svg);
    return svg;
  }

  /** A logo, avatar, icon or image as a square-ish visual. */
  function visual(spec, size) {
    const box = el('div', '', null, { position: 'absolute', left: '0', top: '0', width: `${size}px`, height: `${size}px` });
    if (!spec) return box;
    if (typeof spec === 'string') spec = spec.startsWith('icon:') ? { icon: spec.slice(5) } : { src: spec };
    if (spec.icon) {
      box.style.color = spec.color || theme.accent;
      box.appendChild(iconSvg(spec.icon, { stroke: spec.stroke || 2 }));
    } else if (spec.src === '@mark' || spec.mark) {
      const img = loadImage(SB.brand && SB.brand.mark);
      Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'contain', display: 'block' });
      box.appendChild(img);
    } else if (spec.src) {
      const m = media(spec.src, spec);
      Object.assign(m.style, { width: '100%', height: '100%', objectFit: spec.fit || 'cover', display: 'block' });
      box.appendChild(m);
      box.__media = m;
    } else if (spec.shape) {
      box.appendChild(shapeSvg(spec));
    } else if (spec.text) {
      Object.assign(box.style, {
        borderRadius: '50%',
        background: spec.color || theme.accent,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '600',
        fontSize: `${Math.round(size * 0.42)}px`,
      });
      box.textContent = spec.text;
    }
    if (spec.radius !== undefined) {
      box.style.borderRadius = typeof spec.radius === 'number' ? `${spec.radius}px` : spec.radius;
      box.style.overflow = 'hidden';
    }
    if (spec.bg) box.style.background = spec.bg;
    return box;
  }

  function shapeSvg(spec) {
    const color = spec.color || theme.accent;
    const svg = svgEl('svg', { viewBox: '0 0 100 100', width: '100%', height: '100%', overflow: 'visible' });
    const s = spec.shape;
    const f = { fill: color };
    if (s === 'circle') svgEl('circle', { cx: 50, cy: 50, r: 48, ...f }, svg);
    else if (s === 'square') svgEl('rect', { x: 4, y: 4, width: 92, height: 92, rx: 24, ...f }, svg);
    else if (s === 'triangle') svgEl('path', { d: 'M50 4 C54 4 57 7 59 10 L96 80 C99 87 95 96 86 96 L14 96 C5 96 1 87 4 80 L41 10 C43 7 46 4 50 4 Z', ...f }, svg);
    else if (s === 'star') svgEl('path', { d: 'M50 3 L62 34 L96 36 L70 58 L79 92 L50 73 L21 92 L30 58 L4 36 L38 34 Z', 'stroke-linejoin': 'round', stroke: color, 'stroke-width': 8, ...f }, svg);
    else if (s === 'flower') {
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        svgEl('circle', { cx: 50 + Math.cos(a) * 26, cy: 50 + Math.sin(a) * 26, r: 22, ...f }, svg);
      }
      svgEl('circle', { cx: 50, cy: 50, r: 30, ...f }, svg);
    } else if (s === 'pill') svgEl('rect', { x: 2, y: 22, width: 96, height: 56, rx: 28, ...f }, svg);
    else if (s === 'heart') svgEl('path', { d: 'M50 90 C20 70 4 52 4 32 C4 16 16 6 30 6 C39 6 46 11 50 18 C54 11 61 6 70 6 C84 6 96 16 96 32 C96 52 80 70 50 90 Z', ...f }, svg);
    else svgEl('path', { d: 'M50 4 C78 4 96 22 96 50 C96 80 76 96 50 96 C22 96 4 78 4 50 C4 24 22 4 50 4 Z', ...f }, svg);
    if (spec.eyes) {
      const ey = spec.eyeY || 46;
      for (const ex of [36, 62]) {
        svgEl('ellipse', { cx: ex, cy: ey, rx: 10, ry: 12.5, fill: '#fff' }, svg);
        svgEl('ellipse', { cx: ex + 2, cy: ey + 2, rx: 5.2, ry: 6.6, fill: '#161616' }, svg);
      }
    }
    return svg;
  }

  function background(parent, bg) {
    const layer = el('div', 'layer', parent);
    const spec = typeof bg === 'string' || bg === undefined ? { kind: bg || 'canvas' } : bg;
    if (spec.plate || spec.src) {
      const wrap = el('div', 'plate', layer);
      const m = media(spec.plate || spec.src, spec);
      m.className = 'media-fill';
      wrap.appendChild(m);
      if (spec.tint) el('div', 'fill', layer, { background: spec.tint });
      return {
        layer,
        update(t, dur) {
          const push = spec.push || [1.02, 1.09];
          const s = lerp(push[0], push[1], EASE.inOutSine(inv(0, Math.max(dur, 0.01), t)));
          const pan = spec.pan || [0, 0];
          const k = inv(0, Math.max(dur, 0.01), t);
          place(wrap, pan[0] * k, pan[1] * k, s);
          syncVideo(m, t);
        },
      };
    }
    const kind = spec.kind;
    if (kind === 'night') layer.classList.add('bg-night');
    else if (kind === 'white') layer.classList.add('bg-white');
    else if (kind === 'canvas' || kind === 'dots') layer.classList.add('bg-canvas');
    else if (kind === 'plain') layer.style.background = theme.canvas;
    else layer.style.background = kind;
    return { layer, update() {} };
  }

  /* ------------------------------------------------------------------ */
  /* kinetic sentences                                                   */
  /* ------------------------------------------------------------------ */
  // Markup: words split on spaces. "|" breaks a line. [a b] accent, {a b}
  // muted, *a* bold, @mark brand mark, @icon:name Lucide icon, @img:key image.

  function parseMarkup(text) {
    const tokens = [];
    let mode = null;
    let line = 0;
    const parts = String(text).replace(/\n/g, ' | ').split(/\s+/).filter(Boolean);
    for (let raw of parts) {
      if (raw === '|') {
        line += 1;
        continue;
      }
      let tokenMode = mode;
      if (raw.startsWith('[')) {
        tokenMode = 'accent';
        mode = 'accent';
        raw = raw.slice(1);
      } else if (raw.startsWith('{')) {
        tokenMode = 'muted';
        mode = 'muted';
        raw = raw.slice(1);
      }
      let closes = false;
      if (/[\]}]/.test(raw)) {
        closes = true;
        raw = raw.replace(/[\]}]/g, '');
      }
      let bold = false;
      if (/^\*.+\*[.,!?:;]*$/.test(raw)) {
        bold = true;
        raw = raw.replace(/^\*/, '').replace(/\*([.,!?:;]*)$/, '$1');
      }
      const tok = { kind: 'word', text: raw, color: tokenMode || 'ink', bold, line };
      if (raw === '@mark') Object.assign(tok, { kind: 'mark' });
      else if (raw.startsWith('@icon:')) Object.assign(tok, { kind: 'icon', name: raw.slice(6), color: tokenMode || 'accent' });
      else if (raw.startsWith('@img:')) Object.assign(tok, { kind: 'img', name: raw.slice(5) });
      if (raw) tokens.push(tok);
      if (closes) mode = null;
    }
    return tokens;
  }

  const tokenKey = (t) => `${t.kind}:${t.text}`;

  function lcsPairs(a, b) {
    const n = a.length;
    const m = b.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i -= 1) {
      for (let j = m - 1; j >= 0; j -= 1) {
        dp[i][j] = tokenKey(a[i]) === tokenKey(b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    const pairs = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (tokenKey(a[i]) === tokenKey(b[j])) {
        pairs.push([i, j]);
        i += 1;
        j += 1;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) i += 1;
      else j += 1;
    }
    return pairs;
  }

  /** Display tracking: tighter as type gets larger. */
  function trackingFor(size) {
    if (size >= 200) return -0.03;
    if (size >= 120) return -0.02;
    if (size >= 56) return -0.006;
    return 0;
  }

  let filterSeq = 0;
  let motionDefs = null;
  function motionFilter() {
    if (!motionDefs) {
      const svg = svgEl('svg', { width: 0, height: 0, style: 'position:absolute;width:0;height:0' });
      motionDefs = svgEl('defs', {}, svg);
      document.body.appendChild(svg);
    }
    filterSeq += 1;
    const id = `mb${filterSeq}`;
    const f = svgEl('filter', { id, x: '-50%', y: '-50%', width: '200%', height: '200%' }, motionDefs);
    const g = svgEl('feGaussianBlur', { stdDeviation: '0 0' }, f);
    return { id, node: g };
  }

  function handEllipse(w, h, seed) {
    const r = rng(seed);
    const cx = w / 2;
    const cy = h / 2;
    const pts = [];
    const start = -2.2 + r() * 0.3;
    const sweep = Math.PI * 2 + 0.55;
    for (let i = 0; i <= 44; i += 1) {
      const a = start + (sweep * i) / 44;
      const wob = 1 + (r() - 0.5) * 0.035 + (i / 44) * 0.06;
      pts.push([cx + Math.cos(a) * (w / 2) * wob, cy + Math.sin(a) * (h / 2) * wob * (1 - (i / 44) * 0.05)]);
    }
    return catmull(pts);
  }
  function catmull(pts) {
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  }
  function scribblePath(w, h, seed) {
    const r = rng(seed);
    const pts = [];
    const n = 5;
    for (let i = 0; i <= n; i += 1) {
      pts.push([(w * i) / n + (r() - 0.5) * w * 0.05, h * (i % 2 ? 0.25 : 0.75) + (r() - 0.5) * h * 0.2]);
    }
    return catmull(pts);
  }
  function wavePath(w, h, seed) {
    const r = rng(seed);
    const pts = [];
    for (let i = 0; i <= 8; i += 1) pts.push([(w * i) / 8, h * 0.5 + Math.sin(i * 1.3 + r()) * h * 0.28]);
    return catmull(pts);
  }

  class Sentence {
    constructor(parent, spec, scene) {
      this.spec = spec;
      this.scene = scene;
      this.root = el('div', 'layer', parent);
      this.tone = spec.tone || 'light';
      if (this.tone === 'dark' && spec.shadow !== false) this.root.style.textShadow = '0 2px 22px rgba(0,0,0,0.28)';
      this.defaults = {
        size: 88,
        weight: 460,
        lh: 1.22,
        tracking: null,
        align: 'center',
        x: W / 2,
        y: H / 2,
        ...spec.defaults,
      };
      this.steps = (spec.steps || []).map((s) => (typeof s === 'string' ? { text: s } : { ...s }));
      let at = 0;
      this.steps.forEach((s, i) => {
        if (s.at === undefined) s.at = i === 0 ? 0 : at + 0.9;
        at = s.at;
        s.tokens = parseMarkup(s.text || '');
        s.enter = s.enter || spec.enter || 'drop';
      });
      // chain tokens across steps
      this.chains = [];
      this.steps.forEach((s, k) => {
        s.ids = new Array(s.tokens.length).fill(-1);
        if (k > 0) {
          const prev = this.steps[k - 1];
          for (const [i, j] of lcsPairs(prev.tokens, s.tokens)) s.ids[j] = prev.ids[i];
        }
        let order = 0;
        s.tokens.forEach((tok, j) => {
          if (s.ids[j] === -1) {
            const id = this.chains.length;
            this.chains.push({ id, first: k, last: k, tok, enter: s.enter, order: order++ });
            s.ids[j] = id;
          } else {
            this.chains[s.ids[j]].last = k;
          }
        });
      });
      for (const c of this.chains) c.node = this.makeNode(c.tok, c.enter);
      // typewriter tokens start where the previous token's characters end
      this.steps.forEach((st, k) => {
        let chars = 0;
        st.tokens.forEach((tok, j) => {
          const c = this.chains[st.ids[j]];
          if (c.first === k && c.enter === 'type') {
            c.typeOffset = chars;
            chars += tok.text.length + 1;
          }
        });
      });
      this.decos = (spec.deco || []).map((d) => this.makeDeco(d));
      // resolve decoration targets up front so any frame can be rendered first
      for (const d of this.decos) {
        const k = this.stepAt(d.at);
        const step = this.steps[k];
        const j = step.tokens.findIndex((tok) => tok.text === d.word || tok.text.replace(/[.,!?:;]+$/, '') === d.word);
        d.__target = j >= 0 ? step.ids[j] : -1;
        if (j < 0) console.warn(`decoration word not found: ${d.word}`);
      }
    }

    colorOf(name) {
      const dark = this.tone === 'dark';
      if (name === 'accent') return dark ? theme.accentOnDark || mixColor(theme.accent, '#ffffff', 0.38) : theme.accent;
      if (name === 'muted') return dark ? 'rgba(255,255,255,0.46)' : theme.muted;
      if (name && name[0] === '#') return name;
      return dark ? '#ffffff' : theme.ink;
    }

    makeNode(tok, enter) {
      const node = el('div', 'tok', this.root);
      node.style.fontFamily = 'var(--font)';
      if (tok.kind === 'word') {
        if (enter === 'type') {
          for (const ch of tok.text) el('span', 'ch', node).textContent = ch;
        } else node.textContent = tok.text;
      } else {
        node.classList.add('icon');
        if (tok.kind === 'icon') node.appendChild(iconSvg(tok.name, { stroke: 2 }));
        else if (tok.kind === 'mark') {
          const img = loadImage(SB.brand && SB.brand.mark);
          img.style.objectFit = 'contain';
          node.appendChild(img);
          node.__spin = this.spec.spinMark;
        } else if (tok.kind === 'img') {
          const img = loadImage(tok.name);
          img.style.objectFit = 'contain';
          if (this.spec.imgRadius !== undefined) img.style.borderRadius = this.spec.imgRadius;
          node.appendChild(img);
          node.__spin = this.spec.spinMark;
        }
      }
      if (enter === 'slide') {
        node.__mb = motionFilter();
        css(node, 'filter', `url(#${node.__mb.id})`);
      }
      show(node, false);
      return node;
    }

    makeDeco(d) {
      const svg = svgEl('svg', { class: 'deco' });
      this.root.appendChild(svg);
      const path = svgEl('path', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
      const deco = { ...d, svg, path, seed: hash(`${d.kind}${d.word}${d.at}`) };
      show(svg, false);
      return deco;
    }

    styleFor(step) {
      const size = step.size ?? this.defaults.size;
      return {
        size,
        weight: step.weight ?? this.defaults.weight,
        lh: step.lh ?? this.defaults.lh,
        tracking: step.tracking ?? this.defaults.tracking ?? trackingFor(size),
        align: step.align ?? this.defaults.align,
        x: step.x ?? this.defaults.x,
        y: step.y ?? this.defaults.y,
        iconScale: step.iconScale ?? this.defaults.iconScale ?? 0.86,
        gap: step.gap ?? this.defaults.gap ?? null,
      };
    }

    layout() {
      for (const step of this.steps) {
        const st = this.styleFor(step);
        step.st = st;
        const box = el('div', 'measure', stage, {
          fontSize: `${st.size}px`,
          fontWeight: String(st.weight),
          lineHeight: `${Math.round(st.size * st.lh)}px`,
          letterSpacing: `${st.tracking}em`,
          wordSpacing: `${st.wordSpacing ?? 0.04}em`,
          textAlign: st.align,
          fontFamily: 'var(--font)',
        });
        const lines = [];
        step.tokens.forEach((tok, j) => {
          while (lines.length <= tok.line) lines.push(el('div', 'line', box));
          const ln = lines[tok.line];
          if (ln.childNodes.length) ln.appendChild(document.createTextNode(st.gap ? '' : ' '));
          const span = el('span', tok.kind === 'word' ? 'w' : 'i', ln);
          if (tok.kind === 'word') {
            span.textContent = tok.text;
            if (tok.bold) span.style.fontWeight = '650';
          } else {
            const s = st.size * st.iconScale;
            Object.assign(span.style, { width: `${s}px`, height: `${s}px`, verticalAlign: `${-0.1 * st.size}px` });
          }
          if (st.gap && ln.childNodes.length > 1) span.style.marginLeft = `${st.gap}px`;
          tok.__span = span;
          tok.__j = j;
        });
        const bw = box.offsetWidth;
        const bh = box.offsetHeight;
        let x0 = st.x - bw / 2;
        if (st.align === 'left') x0 = st.x;
        if (st.align === 'right') x0 = st.x - bw;
        const y0 = st.y - bh / 2;
        step.box = { x: x0, y: y0, w: bw, h: bh };
        step.pos = step.tokens.map((tok) => {
          const s = tok.__span;
          return { x: x0 + s.offsetLeft, y: y0 + s.offsetTop, w: s.offsetWidth, h: s.offsetHeight, size: st.size, weight: tok.bold ? 650 : st.weight, ls: st.tracking };
        });
        box.remove();
      }
    }

    stepAt(t) {
      let k = 0;
      for (let i = 0; i < this.steps.length; i += 1) if (t >= this.steps[i].at) k = i;
      return k;
    }

    /** Current rectangle of the first token whose text matches `word`. */
    rectOf(word, t) {
      const k = this.stepAt(t);
      const step = this.steps[k];
      const j = step.tokens.findIndex((tok) => tok.text.replace(/[.,!?]$/, '') === word || tok.text === word);
      if (j < 0) return null;
      const id = step.ids[j];
      const st = this.chains[id].__state;
      return st ? { ...st, j, k } : null;
    }

    update(t) {
      const moveDur = this.spec.moveDur ?? 0.6;
      const stagger = this.spec.stagger ?? 0.075;
      const enterDur = this.spec.enterDur ?? 0.62;
      const exitDur = this.spec.exitDur ?? 0.3;
      const k = this.stepAt(t);
      const step = this.steps[k];
      const prev = this.steps[k - 1];
      const moveP = prev ? EASE.smooth(inv(step.at, step.at + moveDur, t)) : 1;
      const visible = new Set();
      step.ids.forEach((id, j) => {
        visible.add(id);
        const c = this.chains[id];
        const cur = step.pos[j];
        let pos = cur;
        let colorFrom = null;
        if (prev && c.first < k) {
          const pj = prev.ids.indexOf(id);
          const pp = prev.pos[pj];
          pos = {
            x: lerp(pp.x, cur.x, moveP),
            y: lerp(pp.y, cur.y, moveP),
            w: lerp(pp.w, cur.w, moveP),
            h: lerp(pp.h, cur.h, moveP),
            size: lerp(pp.size, cur.size, moveP),
            weight: lerp(pp.weight, cur.weight, moveP),
            ls: lerp(pp.ls, cur.ls, moveP),
          };
          if (prev.tokens[pj].color !== step.tokens[j].color) colorFrom = this.colorOf(prev.tokens[pj].color);
        }
        const target = this.colorOf(step.tokens[j].color);
        const enterStart = this.steps[c.first].at + (c.enter === 'type' ? 0 : c.order * (this.steps[c.first].stagger ?? stagger));
        const q = (t - enterStart) / enterDur;
        this.paintToken(c, pos, q, target, colorFrom ? mixColor(colorFrom, target, moveP) : null, t);
      });
      if (prev) {
        const q = (t - step.at) / exitDur;
        prev.ids.forEach((id, j) => {
          if (visible.has(id)) return;
          const c = this.chains[id];
          if (q >= 1) return;
          visible.add(id);
          const pp = prev.pos[j];
          const n = c.node;
          show(n, true);
          this.applyBox(n, c.tok, pp, 0, -0.08 * pp.size * EASE.out(clamp(q)));
          fade(n, 1 - EASE.out(clamp(q)));
          if (!n.__mb) blur(n, 6 * clamp(q));
          c.__state = null;
        });
      }
      for (const c of this.chains) if (!visible.has(c.id)) show(c.node, false);
      for (const d of this.decos) this.paintDeco(d, t);
    }

    applyBox(n, tok, pos, dx, dy, scale = 1) {
      if (tok.kind === 'word') {
        css(n, 'fontSize', `${pos.size.toFixed(2)}px`);
        css(n, 'lineHeight', `${pos.h.toFixed(2)}px`);
        css(n, 'fontWeight', String(Math.round(pos.weight)));
        css(n, 'letterSpacing', `${(pos.ls ?? trackingFor(pos.size)).toFixed(4)}em`);
      } else {
        css(n, 'width', `${pos.w.toFixed(2)}px`);
        css(n, 'height', `${pos.h.toFixed(2)}px`);
      }
      place(n, pos.x + dx, pos.y + dy, scale);
    }

    paintToken(c, pos, q, target, colorOverride, t) {
      const n = c.node;
      const tok = c.tok;
      if (q <= 0) {
        show(n, false);
        c.__state = null;
        return;
      }
      show(n, true);
      const e = c.enter;
      const s = pos.size;
      let dx = 0;
      let dy = 0;
      let sc = 1;
      let op = 1;
      let bl = 0;
      let color = colorOverride || target;
      const qq = clamp(q);
      if (e === 'drop') {
        op = EASE.out(inv(0, 0.28, q));
        const m = EASE.smooth(qq);
        dy = -0.34 * s * (1 - m);
        sc = lerp(0.8, 1, m);
        bl = 5 * (1 - EASE.out(inv(0, 0.5, q)));
        if (!colorOverride) color = mixColor(this.colorOf('muted'), target, EASE.inOut(inv(0.2, 1, q)));
      } else if (e === 'rise') {
        op = EASE.out(inv(0, 0.35, q));
        dy = 0.36 * s * (1 - EASE.smooth(qq));
        bl = 6 * (1 - EASE.out(inv(0, 0.55, q)));
        if (!colorOverride) color = mixColor(this.colorOf('muted'), target, EASE.inOut(inv(0.15, 1, q)));
      } else if (e === 'fly') {
        const m = EASE.smooth(qq);
        op = EASE.out(inv(0, 0.25, q));
        dx = -0.45 * s * (1 - m);
        dy = 0.75 * s * (1 - m);
        sc = lerp(1.32, 1, m);
        if (!colorOverride) color = mixColor(this.colorOf('muted'), target, EASE.inOut(inv(0.3, 1, q)));
      } else if (e === 'blur') {
        const m = EASE.outQuart(qq);
        op = EASE.out(inv(0, 0.4, q));
        sc = lerp(1.1, 1, m);
        bl = 22 * (1 - m);
      } else if (e === 'slide') {
        const m = EASE.outQuart(inv(0, 0.7, q));
        dx = 0.62 * W * (1 - m);
        op = EASE.out(inv(0, 0.2, q));
        if (n.__mb) n.__mb.node.setAttribute('stdDeviation', `${(60 * (1 - m)).toFixed(2)} 0`);
      } else if (e === 'type') {
        const chars = n.children;
        const cps = this.spec.cps ?? 16;
        const shown = Math.floor(Math.max(0, t - this.steps[c.first].at) * cps) - (c.typeOffset || 0);
        for (let i = 0; i < chars.length; i += 1) fade(chars[i], i < shown ? 1 : 0);
        op = shown > 0 ? 1 : 0;
      } else if (e === 'fade') {
        op = EASE.out(qq);
      } else if (e === 'pop') {
        const m = spring(Math.max(0, q) * 0.62, 2.3, 0.5);
        sc = lerp(0.4, 1, m);
        op = EASE.out(inv(0, 0.2, q));
      }
      // decorations that lift a word
      for (const d of this.decos) {
        if ((d.kind === 'insert' || d.kind === 'lift') && d.__target === c.id) {
          const p = spring(Math.max(0, t - d.at), 2.4, 0.62);
          dy += -(d.kind === 'insert' ? 0.62 : 0.34) * s * p;
          if (d.kind === 'insert') sc *= lerp(1, 0.8, p);
          if (d.recolor !== false) color = mixColor(color, this.colorOf(d.color || 'accent'), clamp(p));
        } else if ((d.kind === 'circle' || d.kind === 'color') && d.__target === c.id && d.recolor !== false) {
          color = mixColor(color, this.colorOf(d.color || 'accent'), EASE.inOut(inv(d.at, d.at + 0.35, t)));
        } else if (d.kind === 'strike' && d.__target === c.id && d.recolor !== false) {
          color = mixColor(color, this.colorOf('muted'), EASE.inOut(inv(d.at + 0.1, d.at + 0.5, t)));
        }
      }
      if (n.__spin) {
        // a coin flip, then a hold facing forward
        const period = n.__spin === true ? 1.8 : n.__spin;
        const cycle = Math.floor(Math.max(0, t) / period);
        const f = (Math.max(0, t) % period) / period;
        const a = (cycle + EASE.inOut(clamp(f / 0.42))) * 360;
        css(n, 'transform', '');
        this.applyBox(n, tok, pos, dx, dy, sc);
        css(n, 'transform', `${n.style.transform} perspective(600px) rotateY(${a.toFixed(1)}deg)`);
        n.__css.transform = null;
      } else this.applyBox(n, tok, pos, dx, dy, sc);
      fade(n, op);
      if (!n.__mb) blur(n, bl);
      css(n, 'color', color);
      c.__state = { x: pos.x + dx, y: pos.y + dy, w: pos.w * sc, h: pos.h * sc, size: s * sc };
    }

    paintDeco(d, t) {
      if (t < d.at || (d.until !== undefined && t > d.until)) {
        show(d.svg, false);
        return;
      }
      const c = this.chains[d.__target];
      const st = c && c.__state;
      if (!st || ['lift', 'color'].includes(d.kind)) {
        show(d.svg, false);
        return;
      }
      show(d.svg, true);
      const s = st.size;
      const stroke = d.stroke || Math.max(2.5, s * (d.kind === 'strike' ? 0.07 : 0.05));
      const col = this.colorOf(d.color || 'accent');
      let x;
      let y;
      let w;
      let h;
      let dpath;
      if (d.kind === 'circle') {
        w = st.w + s * 0.55;
        h = st.h * 0.95 + s * 0.2;
        x = st.x - s * 0.27;
        y = st.y + st.h * 0.02 - s * 0.1;
        dpath = d.__path || (d.__path = { w, h, d: handEllipse(w, h, d.seed) });
      } else if (d.kind === 'strike') {
        w = st.w * 1.08;
        h = s * 0.2;
        x = st.x - st.w * 0.04;
        y = st.y + st.h * 0.5 - h * 0.35;
        dpath = d.__path || (d.__path = { w, h, d: wavePath(w, h * 0.6, d.seed) });
      } else if (d.kind === 'underline') {
        w = st.w * 1.04;
        h = s * 0.24;
        x = st.x - st.w * 0.02;
        y = st.y + st.h * 0.86;
        dpath = d.__path || (d.__path = { w, h, d: wavePath(w, h, d.seed) });
      } else {
        // insert / scribble: a quick scribble under the lifted word
        w = st.w * 0.9;
        h = s * 0.3;
        x = st.x + st.w * 0.05;
        y = st.y + st.h * 0.9;
        dpath = d.__path || (d.__path = { w, h, d: scribblePath(w, h, d.seed) });
      }
      d.svg.setAttribute('width', dpath.w.toFixed(1));
      d.svg.setAttribute('height', dpath.h.toFixed(1));
      d.svg.setAttribute('viewBox', `0 0 ${dpath.w.toFixed(1)} ${dpath.h.toFixed(1)}`);
      place(d.svg, x, y, w / dpath.w);
      d.path.setAttribute('d', dpath.d);
      d.path.setAttribute('stroke', col);
      d.path.setAttribute('stroke-width', stroke.toFixed(2));
      const len = d.__len || (d.__len = d.path.getTotalLength() || 400);
      const drawDur = d.dur ?? (d.kind === 'circle' ? 0.62 : 0.42);
      const p = EASE.inOutSine(inv(d.at + (d.kind === 'insert' ? 0.12 : 0), d.at + drawDur, t));
      d.path.setAttribute('stroke-dasharray', `${len.toFixed(1)} ${len.toFixed(1)}`);
      d.path.setAttribute('stroke-dashoffset', (len * (1 - p)).toFixed(1));
    }
  }

  /* ------------------------------------------------------------------ */
  /* scenes                                                              */
  /* ------------------------------------------------------------------ */

  const REG = {};

  class Scene {
    constructor(spec) {
      this.spec = spec;
      this.root = el('div', 'scene', stage);
      this.root.dataset.type = spec.type;
      if (spec.id) this.root.dataset.id = spec.id;
      this.bg = background(this.root, spec.bg);
      this.parts = [];
      this.overlays = [];
    }
    sentence(spec, parent = this.root) {
      const s = new Sentence(parent, spec, this);
      this.parts.push(s);
      return s;
    }
    layout() {
      for (const p of this.parts) p.layout();
    }
    update(t) {
      this.bg.update(t, this.dur);
      this.draw(t);
      for (const o of this.overlays) o(t);
    }
    draw() {}
  }

  /** Peeking shapes / characters that slide in from the frame edges. */
  function peekers(scene, list) {
    for (const p of list || []) {
      const size = p.size || 620;
      const node = el('div', 'peek', scene.root, { width: `${size}px`, height: `${size}px` });
      node.appendChild(p.src ? visual({ src: p.src, fit: 'contain' }, size) : shapeSvg(p));
      if (p.src) node.firstChild.style.position = 'relative';
      const edge = p.edge || 'bottom';
      const pos = p.pos ?? 0.5;
      const depth = p.depth ?? 0.55;
      let x;
      let y;
      let ox = 0;
      let oy = 0;
      if (edge === 'bottom') {
        x = pos * W - size / 2;
        y = H - size * depth;
        oy = size;
      } else if (edge === 'top') {
        x = pos * W - size / 2;
        y = -size * (1 - depth);
        oy = -size;
      } else if (edge === 'left') {
        x = -size * (1 - depth);
        y = pos * H - size / 2;
        ox = -size;
      } else {
        x = W - size * depth;
        y = pos * H - size / 2;
        ox = size;
      }
      const rot = p.rot || 0;
      scene.overlays.push((t) => {
        const k = spring(t - (p.at || 0), 1.6, 0.62);
        const bob = Math.sin((t + (p.phase || 0)) * 2.2) * size * 0.012;
        show(node, t >= (p.at || 0));
        place(node, x + ox * (1 - k), y + oy * (1 - k) + bob, 1, rot + (1 - k) * (p.spin || 12));
      });
    }
  }

  /** Soft three-dimensional clouds built from overlapping lit spheres. */
  function cloud(parent, spec) {
    const s = spec.size || 420;
    const node = el('div', 'cloud', parent, { width: `${s}px`, height: `${s * 0.62}px` });
    const r = rng(hash(`cloud${spec.x}${spec.y}${s}`));
    el('div', 'shadow', node, { left: `${s * 0.08}px`, top: `${s * 0.5}px`, width: `${s * 0.84}px`, height: `${s * 0.16}px` });
    const blobs = [
      [0.12, 0.3, 0.3],
      [0.3, 0.12, 0.42],
      [0.55, 0.2, 0.36],
      [0.7, 0.34, 0.26],
    ];
    for (const [bx, by, br] of blobs) {
      const d = s * (br + (r() - 0.5) * 0.04);
      el('i', '', node, { left: `${bx * s}px`, top: `${by * s}px`, width: `${d}px`, height: `${d}px` });
    }
    el('div', 'base', node, { left: `${s * 0.06}px`, top: `${s * 0.36}px`, width: `${s * 0.88}px`, height: `${s * 0.2}px` });
    return node;
  }

  REG.sentence = class extends Scene {
    constructor(spec) {
      super(spec);
      this.clouds = (spec.clouds || []).map((c) => ({ ...c, node: cloud(this.root, c) }));
      const dark = spec.tone === 'dark' || spec.bg === 'night' || (spec.bg && (spec.bg.plate || spec.bg.src) && spec.tone !== 'light');
      this.text = this.sentence({ ...spec, tone: dark ? 'dark' : 'light' });
      peekers(this, spec.peek);
      this.drift = spec.drift ?? 0.035;
    }
    draw(t) {
      for (const c of this.clouds) {
        const k = EASE.out(inv(c.at || 0, (c.at || 0) + 0.8, t));
        const dx = (c.drift ?? 14) * t;
        show(c.node, t >= (c.at || 0) - 0.01);
        fade(c.node, k);
        const s = c.size || 420;
        place(c.node, c.x - s / 2 + dx, c.y - s * 0.31 + (1 - k) * 20, lerp(0.92, 1, k));
      }
      this.text.update(t);
      const z = 1 + this.drift * EASE.inOutSine(inv(0, Math.max(this.dur, 0.01), t));
      css(this.text.root, 'transformOrigin', '50% 50%');
      css(this.text.root, 'transform', `scale(${z.toFixed(4)})`);
    }
  };

  /** Short-hand: an accent line icon that is joined by its label. */
  REG.feature = class extends REG.sentence {
    constructor(spec) {
      const icon = spec.icon ? `@icon:${spec.icon}` : '@mark';
      const steps = spec.steps || [
        { at: 0, text: icon, size: spec.size || 80 },
        { at: spec.labelAt ?? 0.42, text: `${icon} ${spec.label}`, size: spec.size || 80 },
      ];
      super({ ...spec, steps, stagger: spec.stagger ?? 0.1, drift: spec.drift ?? 0.045, defaults: { iconScale: 0.92, ...(spec.defaults || {}) } });
    }
  };

  /** Black divider: a fixed lead word beside a rolling column of words. */
  REG.slot = class extends Scene {
    constructor(spec) {
      super({ ...spec, bg: spec.bg || 'night' });
      this.words = spec.words || [];
      this.size = spec.size || 150;
      this.lead = el('div', 'slot-word', this.root, { fontSize: `${this.size}px`, color: spec.leadColor || theme.accentOnDark || mixColor(theme.accent, '#ffffff', 0.22), fontWeight: '500' });
      this.lead.textContent = spec.lead || 'New';
      this.items = this.words.map((w) => {
        const n = el('div', 'slot-word', this.root, { fontSize: `${this.size}px`, color: '#ffffff' });
        n.textContent = w;
        return n;
      });
      this.target = Math.max(0, this.words.indexOf(spec.target));
      const from = spec.from !== undefined ? this.words.indexOf(spec.from) : this.target + (spec.dir === 'up' ? -1 : 1);
      this.from = clamp(from, 0, this.words.length - 1);
    }
    layout() {
      const widths = this.items.map((n) => n.offsetWidth);
      this.leadW = this.lead.offsetWidth;
      this.maxW = Math.max(...widths, 1);
      this.gap = this.size * 1.25;
      const total = this.leadW + this.gap + this.maxW;
      this.x0 = W / 2 - total / 2 + (this.spec.shift || 0);
      this.colX = this.x0 + this.leadW + this.gap;
    }
    draw(t) {
      const row = this.size * 1.33;
      const settle = this.spec.settle ?? 0.62;
      const pos = lerp(this.from, this.target, EASE.smooth(inv(0, settle, t)));
      const cy = H / 2 - this.size * 0.56;
      place(this.lead, this.x0, cy);
      this.items.forEach((n, i) => {
        const d = i - pos;
        const ad = Math.abs(d);
        const op = ad < 1 ? lerp(1, 0.4, ad) : ad < 2 ? lerp(0.4, 0.2, ad - 1) : Math.max(0, 0.2 - (ad - 2) * 0.16);
        place(n, this.colX, cy + d * row);
        fade(n, op);
        css(n, 'color', '#ffffff');
        blur(n, Math.min(3, Math.abs(pos - Math.round(pos)) * 5));
      });
    }
  };

  /** A dock row whose centre tile bounces like an app launching. */
  REG.dock = class extends Scene {
    constructor(spec) {
      super(spec);
      const n = spec.tiles || 5;
      this.tileSize = spec.tileSize || 184;
      this.mainSize = spec.mainSize || 250;
      this.tiles = [];
      const mid = Math.floor(n / 2);
      for (let i = 0; i < n; i += 1) {
        const main = i === mid;
        const size = main ? this.mainSize : this.tileSize;
        const node = el('div', `dock-tile${main ? ' main' : ''}`, this.root, { width: `${size}px`, height: `${size}px` });
        const content = (spec.tileIcons || [])[i];
        if (main) {
          const img = loadImage(spec.mark || (SB.brand && SB.brand.mark));
          node.appendChild(img);
        } else if (content && content.src) {
          const v = visual({ fit: 'cover', ...content }, size);
          Object.assign(v.style, { borderRadius: '23%', overflow: 'hidden' });
          node.appendChild(v);
        } else if (content) {
          const v = visual(content, size * 0.56);
          Object.assign(v.style, { left: `${size * 0.22}px`, top: `${size * 0.22}px`, color: '#b8b8bc' });
          node.appendChild(v);
        }
        this.tiles.push({ node, size, main, i });
      }
      this.shelf = el('div', 'dock-shelf', this.root);
      this.dot = el('div', 'dock-dot', this.root);
      this.caption = spec.caption ? this.sentence({ ...spec.caption, defaults: { size: 80, y: 690, weight: 500, ...(spec.caption.defaults || {}) } }) : null;
    }
    draw(t) {
      const gap = this.spec.gap ?? 40;
      const widths = this.tiles.map((x) => x.size);
      const total = widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1);
      let x = W / 2 - total / 2;
      const base = this.spec.y || 522;
      const lift = this.spec.bounce ?? 1;
      this.tiles.forEach((tile, i) => {
        const appear = EASE.smooth(inv(0.02 * Math.abs(i - 2), 0.35 + 0.05 * Math.abs(i - 2), t));
        let dy = 0;
        if (tile.main) {
          const bt = t - (this.spec.bounceAt ?? 0.3);
          if (bt > 0) {
            const period = 0.46;
            const n = Math.floor(bt / period);
            const f = (bt % period) / period;
            if (n < (this.spec.bounces ?? 2)) dy = -Math.sin(Math.PI * f) * 72 * lift * Math.pow(0.72, n);
          }
        }
        place(tile.node, x, base - tile.size + dy + (1 - appear) * 18, lerp(0.9, 1, appear));
        fade(tile.node, appear);
        if (tile.main) {
          place(this.dot, x + tile.size / 2 - 5, base + 16);
          fade(this.dot, appear);
        }
        x += tile.size + gap;
      });
      const shelfW = Math.min(W * 0.78, total * 1.3);
      css(this.shelf, 'width', `${shelfW}px`);
      place(this.shelf, W / 2 - shelfW / 2, base + 52);
      fade(this.shelf, EASE.out(inv(0.1, 0.6, t)));
      if (this.caption) this.caption.update(t);
    }
  };

  const CURSOR_SVG =
    '<svg viewBox="0 0 34 34" width="34" height="34"><path d="M7 3.5 L7 27.5 L12.6 22.2 L16.4 30.8 L20.6 29 L16.9 20.6 L24.6 20.6 Z" fill="#111" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>';

  /** Cursor with clicks, expressed in the coordinates of a parent layer. */
  function makeCursor(parent) {
    const node = el('div', 'cursor', parent);
    node.innerHTML = CURSOR_SVG;
    const ring = el('div', 'ripple', parent);
    show(node, false);
    show(ring, false);
    return { node, ring };
  }
  function paintCursor(cur, keys, t, toXY, scale = 1) {
    if (!keys || !keys.length || t < keys[0].at - 0.01) {
      show(cur.node, false);
      show(cur.ring, false);
      return;
    }
    const last = keys[keys.length - 1];
    if (last.hide && t > last.at) {
      show(cur.node, false);
      show(cur.ring, false);
      return;
    }
    const xy = track(t, keys.map((k) => [k.at, [k.x, k.y], k.ease || 'glide']));
    const [x, y] = toXY(xy[0], xy[1]);
    let press = 1;
    let ringT = -1;
    let ringXY = null;
    for (const k of keys) {
      if (!k.click) continue;
      const dt = t - k.at;
      if (dt >= 0 && dt < 0.2) press = 1 - 0.16 * Math.sin((dt / 0.2) * Math.PI);
      if (dt >= 0 && dt < 0.55) {
        ringT = dt / 0.55;
        ringXY = toXY(k.x, k.y);
      }
    }
    show(cur.node, true);
    fade(cur.node, EASE.out(inv(keys[0].at, keys[0].at + 0.25, t)));
    place(cur.node, x - 7 * scale, y - 4 * scale, scale * press);
    if (ringT >= 0) {
      const r = lerp(8, 46, EASE.out(ringT)) * scale;
      show(cur.ring, true);
      css(cur.ring, 'width', `${2 * r}px`);
      css(cur.ring, 'height', `${2 * r}px`);
      css(cur.ring, 'borderWidth', `${3 * scale}px`);
      place(cur.ring, ringXY[0] - r, ringXY[1] - r);
      fade(cur.ring, 1 - ringT);
    } else show(cur.ring, false);
  }

  /** Product UI on a floating window, browser, bare card or full frame. */
  REG.ui = class extends Scene {
    constructor(spec) {
      super(spec);
      this.frame = spec.frame || 'window';
      this.world = el('div', 'layer', this.root, { transformOrigin: '0 0' });
      const sources = [spec.src, ...(spec.swap || []).map((s) => s.src)];
      if (this.frame === 'full') {
        this.box = el('div', 'frame-full', this.world);
        this.medias = sources.map((src, i) => {
          const m = media(src, i === 0 ? spec : spec.swap[i - 1]);
          this.box.appendChild(m);
          return m;
        });
      } else {
        this.win = el('div', `win${spec.dark || this.frame === 'dark' ? ' dark' : ''}`, this.world);
        this.barH = this.frame === 'browser' ? 50 : this.frame === 'window' ? 38 : 0;
        if (this.barH) {
          const bar = el('div', 'bar', this.win, { height: `${this.barH}px` });
          for (let i = 0; i < 3; i += 1) el('i', '', bar);
          if (this.frame === 'browser') el('div', 'url', bar).textContent = spec.url || (SB.brand && SB.brand.domain) || '';
        }
        if (spec.radius !== undefined) this.win.style.borderRadius = `${spec.radius}px`;
        this.content = el('div', 'content', this.win, { top: `${this.barH}px` });
        this.medias = sources.map((src, i) => {
          const m = media(src, i === 0 ? spec : spec.swap[i - 1]);
          this.content.appendChild(m);
          return m;
        });
        this.overlayLayer = el('div', 'layer', this.content);
      }
      this.cursor = makeCursor(this.world);
      this.typings = (spec.typing || []).map((ty) => {
        const box = el('div', 'typing-box', this.overlayLayer || this.box, { background: ty.bg ?? '#ffffff', borderRadius: `${ty.radius ?? 10}px` });
        const txt = el('div', 'txt', box, { color: ty.color || theme.ink, fontSize: `${ty.size || 22}px`, fontWeight: String(ty.weight || 450), lineHeight: '1.35' });
        return { ...ty, box, txt };
      });
      this.rings = (spec.rings || []).map((r) => ({ ...r, node: el('div', 'focus-ring', this.overlayLayer || this.box) }));
      this.spots = (spec.spot || []).map((r) => ({ ...r, node: el('div', 'focus-ring', this.overlayLayer || this.box, { border: '0', boxShadow: '0 0 0 4000px rgba(10,10,12,0.42)', borderRadius: '14px' }) }));
      this.caption = spec.caption ? this.sentence({ ...spec.caption, defaults: { size: 80, y: 130, ...(spec.caption.defaults || {}) } }) : null;
    }
    layout() {
      super.layout();
      if (this.frame === 'full') return;
      const m = this.medias[0];
      const nw = m.naturalWidth || m.videoWidth || 1600;
      const nh = m.naturalHeight || m.videoHeight || 1000;
      // default: the whole image fits in ~86% of the frame height at zoom 1
      const fitW = ((H * (this.spec.fit ?? 0.86) - this.barH) * nw) / nh;
      this.ww = this.spec.width || Math.min(W * 0.88, fitW);
      const imgH = (this.ww * nh) / nw;
      const vp = this.spec.viewport ? this.spec.viewport * this.ww : this.spec.maxHeight ? Math.min(imgH, this.spec.maxHeight) : imgH;
      this.ch = vp;
      this.imgH = imgH;
      this.wh = this.barH + vp;
      css(this.win, 'width', `${this.ww}px`);
      css(this.win, 'height', `${this.wh}px`);
      for (const mm of this.medias) css(mm, 'width', `${this.ww}px`);
      this.x0 = (W - this.ww) / 2 + (this.spec.x || 0);
      this.y0 = (H - this.wh) / 2 + (this.spec.y || 0);
    }
    /** Image-relative coordinates (0..1 of the full screenshot) to world pixels. */
    toWorld(u, v) {
      return [this.x0 + u * this.ww, this.y0 + this.barH + v * this.imgH - (this.scrollPx || 0)];
    }
    draw(t) {
      const spec = this.spec;
      const cam = spec.camera && spec.camera.length ? spec.camera : [{ at: 0, zoom: 1 }];
      const zoom = track(t, cam.map((k) => [k.at, k.zoom ?? 1, k.ease || 'glide']));
      const focus = track(t, cam.map((k) => [k.at, k.focus || [0.5, 0.5], k.ease || 'glide']));
      const enter = spec.enter || 'rise';
      const ek = enter === 'none' ? 1 : EASE.smooth(inv(0, spec.enterDur ?? 0.8, t));
      if (this.frame === 'full') {
        const push = spec.push || [1.0, 1.06];
        const s = lerp(push[0], push[1], EASE.inOutSine(inv(0, this.dur, t))) * zoom;
        const fx = (focus[0] - 0.5) * W * (s - 1);
        const fy = (focus[1] - 0.5) * H * (s - 1);
        css(this.world, 'transformOrigin', '50% 50%');
        css(this.world, 'transform', `translate(${(-fx).toFixed(2)}px,${(-fy).toFixed(2)}px) scale(${s.toFixed(4)})`);
        this.paintSwaps(t);
        for (const m of this.medias) syncVideo(m, t);
        paintCursor(this.cursor, spec.cursor, t, (u, v) => [u * W, v * H], 1 / s);
      } else {
        const scroll = spec.scroll ? track(t, spec.scroll.map((s) => [s[0], s[1], s[2] || 'glide'])) : 0;
        this.scrollPx = scroll * Math.max(0, this.imgH - this.ch);
        const cx = this.x0 + this.ww / 2;
        const cy = this.y0 + this.wh / 2;
        const [fx, fy] = this.toWorld(focus[0], focus[1]);
        const k = clamp((zoom - 1) / 0.3);
        const px = lerp(cx, fx, k);
        const py = lerp(cy, fy, k);
        let z = zoom;
        let ty = 0;
        let op = 1;
        if (enter === 'rise') {
          ty = (1 - ek) * 90;
          z *= lerp(0.955, 1, ek);
          op = EASE.out(inv(0, 0.35, t));
        } else if (enter === 'zoom') {
          z *= lerp(1.18, 1, ek);
          op = EASE.out(inv(0, 0.3, t));
        } else if (enter === 'fade') op = EASE.out(inv(0, 0.4, t));
        const sx = W / 2 + (spec.screenX || 0);
        const sy = H / 2 + (spec.screenY || 0);
        css(this.world, 'transform', `translate(${(sx - px * z).toFixed(2)}px,${(sy - py * z + ty).toFixed(2)}px) scale(${z.toFixed(4)})`);
        fade(this.world, op);
        place(this.win, this.x0, this.y0);
        for (const m of this.medias) place(m, 0, -this.scrollPx);
        this.paintSwaps(t);
        for (const m of this.medias) syncVideo(m, t);
        paintCursor(this.cursor, spec.cursor, t, (u, v) => this.toWorld(u, v), Math.pow(z, -0.55) * 1.05);
        for (const ty2 of this.typings) this.paintTyping(ty2, t);
        for (const r of this.rings) this.paintRect(r, t, false);
        for (const r of this.spots) this.paintRect(r, t, true);
      }
      if (this.caption) this.caption.update(t);
    }
    paintSwaps(t) {
      const swaps = this.spec.swap || [];
      this.medias.forEach((m, i) => {
        if (i === 0) {
          const next = swaps[0];
          fade(m, next ? 1 - EASE.out(inv(next.at, next.at + (next.dur ?? 0.3), t)) : 1);
          return;
        }
        const s = swaps[i - 1];
        const nxt = swaps[i];
        let o = EASE.out(inv(s.at, s.at + (s.dur ?? 0.3), t));
        if (nxt) o *= 1 - EASE.out(inv(nxt.at, nxt.at + (nxt.dur ?? 0.3), t));
        fade(m, o);
      });
    }
    paintTyping(ty, t) {
      const [u, v, w, h] = ty.rect;
      const visible = t >= ty.at - (ty.lead ?? 0.25) && (ty.until === undefined || t <= ty.until);
      show(ty.box, visible);
      if (!visible) return;
      css(ty.box, 'left', `${u * this.ww}px`);
      css(ty.box, 'top', `${v * this.imgH - (this.scrollPx || 0)}px`);
      css(ty.box, 'width', `${w * this.ww}px`);
      css(ty.box, 'height', `${h * this.imgH}px`);
      css(ty.txt, 'left', `${ty.pad ?? 14}px`);
      css(ty.txt, 'top', `${ty.padY ?? ty.pad ?? 12}px`);
      css(ty.txt, 'right', `${ty.pad ?? 14}px`);
      const n = Math.max(0, Math.floor((t - ty.at) * (ty.cps || 26)));
      const text = ty.text.slice(0, n);
      const blink = n >= ty.text.length ? Math.floor((t - ty.at) * 2) % 2 === 0 : true;
      const caret = ty.caret === false ? '' : `<span class="caret" style="height:${(ty.size || 22) * 1.1}px;opacity:${blink ? 1 : 0}"></span>`;
      const html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;') + caret;
      if (ty.txt.__html !== html) {
        ty.txt.__html = html;
        ty.txt.innerHTML = html;
      }
      if (!ty.wrap) {
        // single-line input: keep the caret in view like a real text field
        css(ty.txt, 'whiteSpace', 'pre');
        css(ty.txt, 'right', 'auto');
        const room = w * this.ww - 2 * (ty.pad ?? 14);
        const over = ty.txt.scrollWidth - room;
        css(ty.txt, 'transform', over > 0 ? `translateX(${(-over).toFixed(1)}px)` : 'none');
      }
      if (ty.placeholder && n === 0) {
        ty.txt.innerHTML = `<span style="opacity:.42">${ty.placeholder}</span>${caret}`;
        ty.txt.__html = null;
      }
    }
    paintRect(r, t, spot) {
      const on = t >= r.at && (r.until === undefined || t <= r.until);
      show(r.node, on);
      if (!on) return;
      const [u, v, w, h] = r.rect;
      css(r.node, 'left', `${u * this.ww}px`);
      css(r.node, 'top', `${v * this.imgH - (this.scrollPx || 0)}px`);
      css(r.node, 'width', `${w * this.ww}px`);
      css(r.node, 'height', `${h * this.imgH}px`);
      if (r.radius !== undefined) css(r.node, 'borderRadius', `${r.radius}px`);
      const k = EASE.out(inv(r.at, r.at + 0.3, t));
      const out = r.until !== undefined ? 1 - EASE.out(inv(r.until - 0.25, r.until, t)) : 1;
      fade(r.node, k * out);
      if (!spot) place(r.node, 0, 0, lerp(1.06, 1, k));
    }
  };

  /* ----- glass cards on landscape plates ----- */

  function textBlock(parent, text, style) {
    const n = el('div', 't', parent, style);
    n.textContent = text;
    return n;
  }

  function pairCard(parent, item, w, h, glass) {
    const node = el('div', `glass ${glass}`, parent, { width: `${w}px`, height: `${h}px` });
    const icon = visual(item.icon ? { icon: item.icon, color: item.color || theme.ink } : item.img ? { src: item.img, radius: 8 } : item.mark ? { mark: true } : null, 32);
    Object.assign(icon.style, { left: '24px', top: '22px' });
    node.appendChild(icon);
    const fs = item.text.length > 64 ? 18 : item.text.length > 44 ? 20 : 22;
    textBlock(node, item.text, { left: '24px', right: '22px', top: '64px', fontSize: `${fs}px`, lineHeight: '1.3', fontWeight: '450' });
    return node;
  }

  function makeCard(scene, c) {
    const glass = c.glass || (c.kind === 'stat' ? 'clear' : 'light');
    const at = c.at ?? 0.4;
    if (c.kind === 'pairs') {
      const k = c.scale ?? 2;
      const w = c.cardW || 330;
      const h = c.cardH || 168;
      const gap = c.gap || 70;
      const cy = c.y || 650;
      const layer = el('div', 'layer', scene.root);
      const arrow = el('div', 'glass light', layer, { width: '44px', height: '44px', borderRadius: '50%' });
      const av = visual({ icon: 'arrow-right', color: '#8a8a8f' }, 22);
      Object.assign(av.style, { left: '11px', top: '11px' });
      arrow.appendChild(av);
      const items = c.items.map((it) => {
        const trig = pairCard(layer, it.trigger, w, h, glass);
        const act = pairCard(layer, it.action, w, h, glass);
        return { trig, act };
      });
      const every = c.every || 1.7;
      const tx = W / 2 - gap / 2 - w * k;
      const ax = W / 2 + gap / 2;
      for (const it of items) {
        it.trig.style.transformOrigin = '0 0';
        it.act.style.transformOrigin = '0 0';
      }
      arrow.style.transformOrigin = '50% 50%';
      return (t) => {
        const local = t - at;
        const raw = Math.floor(Math.max(0, local) / every);
        const idx = Math.min(items.length - 1, raw);
        const p = EASE.smooth(inv(0, 0.5, local - idx * every));
        items.forEach((it, i) => {
          // depth 0 is the front pair; older pairs sink one layer per cycle
          const d = i === idx ? 0 : clamp(idx - i - 1 + p, 0, 3);
          const visible = local >= 0 && i <= idx && d <= 2.2;
          show(it.trig, visible);
          show(it.act, visible);
          if (!visible) return;
          const inK = i === idx ? p : 1;
          const oy = -16 * k * Math.max(0, d);
          const s = k * (1 - 0.05 * Math.max(0, d));
          const op = d <= 0 ? EASE.out(inK) : lerp(1, 0.55, clamp(d / 2));
          const actIn = i === 0 ? EASE.smooth(inv(0.35, 0.95, local)) : 1;
          place(it.trig, tx + 8 * k * Math.max(0, d), cy - (h * k) / 2 + oy + (1 - inK) * 22 * k, s);
          place(it.act, lerp(tx, ax, actIn) + 8 * k * Math.max(0, d), cy - (h * k) / 2 + oy + (1 - inK) * 22 * k, s);
          fade(it.trig, op);
          fade(it.act, op * (i === 0 ? EASE.out(inv(0.3, 0.6, local)) : 1));
          css(it.trig, 'zIndex', String(10 - Math.round(d * 2)));
          css(it.act, 'zIndex', String(10 - Math.round(d * 2)));
          for (const n of [it.trig, it.act]) for (const ch of n.children) fade(ch, 1 - clamp(d * 1.6));
        });
        const ak = EASE.out(inv(0.55, 0.9, local));
        place(arrow, W / 2 - 22, cy - 22, lerp(0.6, 1, ak) * k * 0.9);
        fade(arrow, ak);
        css(arrow, 'zIndex', '20');
      };
    }
    if (c.kind === 'stat') {
      const k = c.scale ?? 1.36;
      const w = c.w || 470;
      const h = c.h || (212 + (c.bars || []).length * 50 + 18);
      const node = el('div', `glass ${glass}`, scene.root, { width: `${w}px`, height: `${h}px`, transformOrigin: '0 0' });
      const head = el('div', 'row', node, { top: '26px', left: '28px', right: '28px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '19px', fontWeight: '500', opacity: '0.95' });
      if (c.icon || c.mark) {
        const v = visual(c.icon ? { icon: c.icon, color: 'currentColor' } : { mark: true }, 22);
        v.style.position = 'relative';
        head.appendChild(v);
      }
      el('span', '', head).textContent = c.title || '';
      textBlock(node, c.label || '', { left: '28px', top: '72px', fontSize: '16px', opacity: '0.72' });
      const big = textBlock(node, '', { left: '28px', top: '96px', fontSize: '64px', fontWeight: '500', letterSpacing: '-0.02em' });
      textBlock(node, c.note || '', { left: '28px', top: '172px', fontSize: '14px', opacity: '0.6' });
      const bars = (c.bars || []).map((b, i) => {
        const y = 212 + i * 50;
        textBlock(node, b.label, { left: '28px', top: `${y}px`, fontSize: '15px', opacity: '0.8' });
        textBlock(node, b.display || '', { right: '28px', top: `${y}px`, fontSize: '15px', opacity: '0.8', textAlign: 'right' });
        const track2 = el('div', 'bar-track', node, { left: '28px', right: '28px', top: `${y + 24}px`, height: '10px' });
        const fill = el('div', 'bar-fill', track2, { background: b.color || 'linear-gradient(90deg, rgba(255,255,255,.55), #ffffff)' });
        return { fill, value: b.value };
      });
      const x = c.x ?? W / 2 - (w * k) / 2;
      const y = c.y ?? H / 2 - (h * k) / 2;
      return (t) => {
        const e = EASE.smooth(inv(at, at + 0.7, t));
        show(node, t >= at);
        place(node, x, y + (1 - e) * 40, lerp(0.96, 1, e) * k);
        fade(node, EASE.out(inv(at, at + 0.35, t)));
        const v = lerp(c.from ?? 0, c.value ?? 0, EASE.outQuart(inv(at + 0.25, at + 1.4, t)));
        big.textContent = `${c.prefix || ''}${v.toFixed(c.decimals ?? 1)}${c.suffix || ''}`;
        bars.forEach((b, i) => css(b.fill, 'width', `${(100 * b.value * EASE.smooth(inv(at + 0.4 + i * 0.15, at + 1.3 + i * 0.15, t))).toFixed(2)}%`));
      };
    }
    if (c.kind === 'list') {
      const k = c.scale ?? 1.9;
      const w = c.w || 520;
      const rowH = c.rowH || 66;
      const h = (c.title ? 74 : 20) + rowH * c.items.length + 14;
      const node = el('div', `glass ${glass}`, scene.root, { width: `${w}px`, height: `${h}px`, transformOrigin: '0 0' });
      if (c.title) textBlock(node, c.title, { left: '28px', top: '24px', fontSize: '20px', fontWeight: '600' });
      const rows = c.items.map((it, i) => {
        const row = el('div', 'row', node, { top: `${(c.title ? 70 : 16) + i * rowH}px`, left: '28px', right: '28px', height: `${rowH - 10}px`, display: 'flex', alignItems: 'center', gap: '16px', fontSize: '24px', fontWeight: '500' });
        const v = visual(it.icon ? { icon: it.icon, color: it.color || theme.accent } : it.img ? { src: it.img, fit: 'contain' } : { mark: true }, 34);
        v.style.position = 'relative';
        row.appendChild(v);
        el('span', '', row).textContent = it.text;
        return row;
      });
      const x = c.x ?? W / 2 - (w * k) / 2;
      const y = c.y ?? H / 2 - (h * k) / 2;
      return (t) => {
        const e = EASE.smooth(inv(at, at + 0.7, t));
        show(node, t >= at);
        place(node, x, y + (1 - e) * 36, lerp(0.97, 1, e) * k);
        fade(node, EASE.out(inv(at, at + 0.35, t)));
        rows.forEach((r, i) => {
          const rk = EASE.smooth(inv(at + 0.3 + i * (c.stagger ?? 0.22), at + 0.8 + i * (c.stagger ?? 0.22), t));
          fade(r, rk);
          place(r, (1 - rk) * 18, 0);
        });
      };
    }
    // note: a single glass card with icon, title and text
    const k = c.scale ?? 1.6;
    const w = c.w || 440;
    const node = el('div', `glass ${glass}`, scene.root, { width: `${w}px`, padding: '26px 28px', transformOrigin: '0 0' });
    node.style.position = 'absolute';
    if (c.icon || c.img || c.mark) {
      const v = visual(c.icon ? { icon: c.icon, color: c.color || (glass === 'clear' ? '#fff' : theme.accent) } : c.img ? { src: c.img, radius: 10 } : { mark: true }, 34);
      v.style.position = 'relative';
      v.style.marginBottom = '14px';
      node.appendChild(v);
    }
    if (c.title) el('div', '', node, { fontSize: '24px', fontWeight: '600', marginBottom: '8px' }).textContent = c.title;
    if (c.text) el('div', '', node, { fontSize: '20px', lineHeight: '1.4', opacity: '0.82' }).textContent = c.text;
    const x = c.x ?? W / 2 - (w * k) / 2;
    const y = c.y ?? 470;
    return (t) => {
      const e = EASE.smooth(inv(at, at + 0.7, t));
      show(node, t >= at);
      place(node, x, y + (1 - e) * 36, lerp(0.97, 1, e) * k);
      fade(node, EASE.out(inv(at, at + 0.35, t)));
    };
  }

  /** Full-bleed landscape plate with a title and optional glass cards. */
  REG.plate = class extends Scene {
    constructor(spec) {
      let tint = spec.tint;
      if (tint === undefined && spec.title) {
        const ty = (spec.title.defaults && spec.title.defaults.y) ?? (spec.cards ? 232 : 540);
        tint = ty < 420 ? 'linear-gradient(180deg, rgba(8,24,40,0.30) 0%, rgba(8,24,40,0.06) 40%, rgba(8,24,40,0) 60%)' : 'radial-gradient(60% 45% at 50% 50%, rgba(8,24,40,0.24), rgba(8,24,40,0) 100%)';
      }
      super({ ...spec, bg: { plate: spec.src, push: spec.push || [1.03, 1.1], tint, pan: spec.pan } });
      this.title = spec.title ? this.sentence({ ...spec.title, tone: spec.tone || 'dark', defaults: { size: 104, y: spec.cards ? 232 : 540, ...(spec.title.defaults || {}) } }) : null;
      this.cards = (spec.cards || []).map((c) => makeCard(this, c));
      if (this.title) css(this.title.root, 'textShadow', '0 2px 24px rgba(0,0,0,0.12)');
      peekers(this, spec.peek);
    }
    draw(t) {
      if (this.title) this.title.update(t);
      for (const c of this.cards) c(t);
    }
  };

  /* ----- phones ----- */

  function makePhone(parent, spec) {
    const pw = spec.phoneWidth || spec.width || 860;
    const ph = pw * 2.06;
    const bez = pw * 0.028;
    const node = el('div', `phone${spec.frame === 'dark' ? ' dark' : ''}`, parent, { width: `${pw}px`, height: `${ph}px`, borderRadius: `${pw * 0.155}px` });
    const screen = el('div', 'screen', node, { left: `${bez}px`, top: `${bez}px`, width: `${pw - 2 * bez}px`, height: `${ph - 2 * bez}px`, borderRadius: `${pw * 0.13}px`, background: spec.screenBg || '#ffffff' });
    const sw = pw - 2 * bez;
    const statusH = spec.status === false ? 0 : sw * 0.135;
    const content = el('div', 'layer', screen, { top: `${statusH}px` });
    const sources = [spec.src, ...(spec.swap || []).map((s) => s.src)].filter(Boolean);
    const medias = sources.map((src, i) => {
      const m = media(src, i === 0 ? spec : spec.swap[i - 1]);
      m.style.width = `${sw}px`;
      content.appendChild(m);
      return m;
    });
    if (statusH) {
      const st = el('div', 'status', screen, { top: '0', height: `${statusH}px`, padding: `0 ${sw * 0.1}px 0 ${sw * 0.12}px`, fontSize: `${sw * 0.043}px`, color: spec.statusColor || '#111', background: spec.statusBg || spec.screenBg || '#ffffff' });
      el('span', '', st).textContent = spec.time || '9:41';
      const icons = el('span', '', st, { display: 'flex', gap: `${sw * 0.012}px`, alignItems: 'center' });
      icons.innerHTML = `<svg width="${sw * 0.05}" height="${sw * 0.034}" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor"/><rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor"/></svg><svg width="${sw * 0.066}" height="${sw * 0.032}" viewBox="0 0 26 12"><rect x="0.5" y="0.5" width="22" height="11" rx="3.5" fill="none" stroke="currentColor" opacity=".45"/><rect x="2.5" y="2.5" width="16" height="7" rx="2" fill="currentColor"/><rect x="24" y="4" width="1.6" height="4" rx=".8" fill="currentColor" opacity=".45"/></svg>`;
    }
    el('div', 'island', screen, { top: `${sw * 0.028}px`, width: `${sw * 0.3}px`, height: `${sw * 0.088}px`, borderRadius: `${sw * 0.044}px` });
    const layer = el('div', 'layer', screen);
    const cursor = makeCursor(layer);
    return { node, screen, content, medias, pw, ph, sw, sh: ph - 2 * bez, statusH, layer, cursor };
  }

  function paintPhone(ph, spec, t, dur) {
    const scroll = spec.scroll ? track(t, spec.scroll.map((s) => [s[0], s[1], s[2] || 'glide'])) : 0;
    ph.medias.forEach((m, i) => {
      const nh = ((m.naturalHeight || m.videoHeight || 1) / (m.naturalWidth || m.videoWidth || 1)) * ph.sw;
      const maxScroll = Math.max(0, nh - (ph.sh - ph.statusH));
      place(m, 0, -scroll * maxScroll);
      const swaps = spec.swap || [];
      if (i === 0) fade(m, swaps[0] ? 1 - EASE.out(inv(swaps[0].at, swaps[0].at + 0.3, t)) : 1);
      else {
        let o = EASE.out(inv(swaps[i - 1].at, swaps[i - 1].at + 0.3, t));
        if (swaps[i]) o *= 1 - EASE.out(inv(swaps[i].at, swaps[i].at + 0.3, t));
        fade(m, o);
      }
      syncVideo(m, t);
    });
    const taps = (spec.taps || []).map((tp) => ({ at: tp.at, x: tp.x, y: tp.y, click: true }));
    if (taps.length) {
      const keys = [];
      for (const tp of taps) {
        keys.push({ at: tp.at - 0.35, x: tp.x + 0.05, y: tp.y + 0.05 });
        keys.push({ ...tp });
      }
      paintCursor(ph.cursor, keys, t, (u, v) => [u * ph.sw, v * ph.sh], ph.pw / 440);
      fade(ph.cursor.node, 0);
    }
    void dur;
  }

  REG.phone = class extends Scene {
    constructor(spec) {
      if (spec.headline && spec.tone !== 'light' && spec.bg && (spec.bg.plate || spec.bg.src) && spec.bg.tint === undefined) {
        spec = { ...spec, bg: { ...spec.bg, tint: 'linear-gradient(90deg, rgba(8,24,40,0.42) 0%, rgba(8,24,40,0.12) 45%, rgba(8,24,40,0) 62%)' } };
      }
      super(spec);
      this.ph = makePhone(this.root, spec);
      this.headline = spec.headline ? this.sentence({ ...spec.headline, tone: spec.tone || (spec.bg && (spec.bg.plate || spec.bg.src) ? 'dark' : 'light'), defaults: { align: 'left', x: 160, size: 100, weight: 600, lh: 1.08, ...(spec.headline.defaults || {}) } }) : null;
      peekers(this, spec.peek);
    }
    draw(t) {
      const spec = this.spec;
      const x = (spec.x ?? (this.headline ? 1365 : W / 2)) - this.ph.pw / 2;
      const y = spec.y !== undefined ? spec.y - this.ph.ph / 2 : spec.top ?? 92;
      const enter = spec.enter || 'rise';
      let dy = 0;
      let op = 1;
      if (enter === 'rise') {
        dy = (1 - spring(t, 1.25, 0.8)) * 560;
      } else if (enter === 'drop') {
        dy = -(1 - spring(t, 1.25, 0.8)) * 560;
      } else if (enter === 'fade') op = EASE.out(inv(0, 0.4, t));
      const exitAt = spec.exitAt;
      if (exitAt !== undefined && t > exitAt) dy += EASE.in(inv(exitAt, exitAt + 0.6, t)) * -(H + 200);
      place(this.ph.node, x, y + dy, spec.scale || 1, spec.tilt || 0);
      fade(this.ph.node, op);
      paintPhone(this.ph, spec, t, this.dur);
      if (this.headline) this.headline.update(t);
    }
  };

  /* ----- chat thread ----- */
  REG.chat = class extends Scene {
    constructor(spec) {
      super(spec);
      this.col = el('div', 'layer', this.root);
      this.size = spec.size || 60;
      this.items = (spec.bubbles || []).map((b) => {
        const wrap = el('div', '', this.col, { position: 'absolute', left: '0', top: '0' });
        let speaker = null;
        if (b.who) {
          speaker = el('div', 'speaker', wrap, { fontSize: `${this.size * 0.72}px` });
          const avSize = this.size * 1.05;
          if (b.avatar) {
            const av = el('div', 'av', speaker, { width: `${avSize}px`, height: `${avSize}px` });
            const v = visual(b.avatar, avSize);
            v.style.position = 'relative';
            av.appendChild(v);
          }
          el('span', '', speaker).textContent = b.who;
        }
        const bubble = el('div', `bubble${b.mine ? ' mine' : ''}`, wrap, {
          fontSize: `${this.size}px`,
          lineHeight: '1.36',
          padding: `${this.size * 0.62}px ${this.size * 0.8}px`,
          maxWidth: `${spec.maxWidth || 1300}px`,
          position: 'relative',
          marginTop: speaker ? `${this.size * 0.4}px` : '0',
          fontWeight: '450',
        });
        bubble.textContent = b.text;
        if (speaker) speaker.style.position = 'relative';
        return { ...b, wrap, bubble };
      });
    }
    layout() {
      super.layout();
      let y = 0;
      const gap = this.size * 1.1;
      for (const it of this.items) {
        it.y = y;
        it.h = it.wrap.offsetHeight;
        it.w = it.wrap.offsetWidth;
        y += it.h + gap;
      }
    }
    draw(t) {
      const x0 = this.spec.x ?? 250;
      const anchor = this.spec.anchor ?? 760;
      let lastBottom = 0;
      for (const it of this.items) if (t >= it.at) lastBottom = it.y + it.h;
      let scrollTarget = 0;
      const keys = [[0, 0]];
      for (const it of this.items) {
        const target = Math.max(0, it.y + it.h - anchor + 200);
        keys.push([it.at, keys[keys.length - 1][1]]);
        keys.push([it.at + 0.55, target, 'smooth']);
      }
      scrollTarget = track(t, keys);
      void lastBottom;
      for (const it of this.items) {
        const k = EASE.smooth(inv(it.at, it.at + 0.55, t));
        show(it.wrap, t >= it.at);
        const x = it.mine ? (this.spec.right ?? W - 440) - it.w : x0;
        place(it.wrap, x, 200 + it.y - scrollTarget + (1 - k) * 36);
        fade(it.wrap, EASE.out(inv(it.at, it.at + 0.3, t)));
      }
    }
  };

  /* ----- pill reveal with a burst of characters or tiles ----- */
  REG.burst = class extends Scene {
    constructor(spec) {
      super(spec);
      this.items = [];
      const list = spec.items || [];
      const count = spec.count || list.length;
      const r = rng(hash(`burst${count}${spec.pill}`));
      for (let i = 0; i < count; i += 1) {
        const src = list[i % Math.max(1, list.length)] || { shape: 'circle', color: theme.accent };
        const size = (src.size || spec.itemSize || 230) * lerp(0.8, 1.2, r());
        const tiled = src.src && src.tile !== false && spec.tile !== false;
        const node = el('div', `burst-item${tiled ? ' tile' : ''}`, this.root, { width: `${size}px`, height: `${size}px` });
        const v = src.src ? visual({ src: src.src, fit: src.fit || 'cover' }, size) : visual({ shape: src.shape || 'circle', color: src.color, eyes: src.eyes }, size);
        v.style.position = 'relative';
        node.appendChild(v);
        const ring = i / count;
        const a = ring * Math.PI * 2 + r() * 0.5;
        const rad = lerp(300, 600, r());
        this.items.push({
          node,
          size,
          tx: W / 2 + Math.cos(a) * rad * (W > H ? 1.35 : 0.72) - size / 2,
          ty: H / 2 + Math.sin(a) * rad * (W > H ? 0.78 : 1.45) - size / 2,
          rot: (r() - 0.5) * 50,
          delay: r() * 0.18,
        });
      }
      const ps = spec.pillSize || 92;
      this.pill = el('div', 'pill', this.root, { fontSize: `${ps}px`, height: `${ps * 1.9}px`, padding: `0 ${ps * 0.72}px`, zIndex: '5', letterSpacing: '-0.015em' });
      this.pillText = el('span', '', this.pill);
      this.texts = (spec.pillSteps || [spec.pill || '']).map((s) => (typeof s === 'string' ? { text: s } : s));
      this.texts.forEach((s, i) => {
        if (s.at === undefined) s.at = i * 0.5;
      });
      if (spec.ball) this.ball = el('div', '', this.root, { position: 'absolute', left: '0', top: '0', width: '120px', height: '120px', borderRadius: '50%', background: '#d7d7da' });
    }
    layout() {
      super.layout();
      this.widths = this.texts.map((s) => {
        this.pillText.textContent = s.text;
        return this.pill.offsetWidth;
      });
      this.pillH = this.pill.offsetHeight;
    }
    draw(t) {
      const spec = this.spec;
      const burstAt = spec.burstAt ?? 1.3;
      let k = 0;
      for (let i = 0; i < this.texts.length; i += 1) if (t >= this.texts[i].at) k = i;
      this.pillText.textContent = this.texts[k].text;
      const wPrev = this.widths[Math.max(0, k - 1)];
      const wCur = this.widths[k];
      const w = k === 0 ? wCur : lerp(wPrev, wCur, EASE.smooth(inv(this.texts[k].at, this.texts[k].at + 0.35, t)));
      css(this.pill, 'width', `${w.toFixed(1)}px`);
      const pop = spring(t, 2.4, 0.5);
      const tilt = spec.tilt ?? -7;
      const tiltK = spring(t - (spec.tiltAt ?? burstAt - 0.45), 2.6, 0.45);
      const rot = tilt * tiltK * (t < burstAt + 0.2 ? 1 : 1 - EASE.smooth(inv(burstAt + 0.2, burstAt + 0.7, t)));
      place(this.pill, W / 2 - w / 2, H / 2 - this.pillH / 2 + (spec.pillY || 0), lerp(0.35, 1, pop), rot);
      fade(this.pill, EASE.out(inv(0, 0.18, t)));
      const dark = spec.darkAtBurst !== false && t >= burstAt;
      css(this.pill, 'background', dark ? '#1c1c1e' : '#ffffff');
      css(this.pill, 'color', dark ? '#ffffff' : '#1d1d1f');
      if (this.ball) {
        const bt = t - 0.3;
        const by = H / 2 + 300 - Math.abs(Math.sin(bt * 4.2)) * 120 * Math.exp(-Math.max(0, bt) * 0.6);
        show(this.ball, t > 0.3 && t < burstAt);
        place(this.ball, W / 2 - 60 + 80, by);
      }
      for (const it of this.items) {
        const q = t - burstAt - it.delay;
        show(it.node, q > 0);
        if (q <= 0) continue;
        const m = spring(q, 1.35, 0.62);
        const x = lerp(W / 2 - it.size / 2, it.tx, m);
        const y = lerp(H / 2 - it.size / 2, it.ty, m) + Math.sin((t + it.delay * 9) * 1.9) * 6 * clamp(q);
        place(it.node, x, y, lerp(0.2, 1, clamp(m * 1.2)), it.rot * m);
      }
    }
  };

  /* ----- montage of full-bleed media ----- */
  REG.montage = class extends Scene {
    constructor(spec) {
      super({ ...spec, bg: spec.bg || 'night' });
      let at = 0;
      this.items = (spec.items || []).map((it) => {
        const item = typeof it === 'string' ? { src: it } : { ...it };
        item.start = at;
        item.len = item.dur ?? (item.beats ? item.beats * BEAT : spec.every ?? 1.6);
        at += item.len;
        const wrap = el('div', 'frame-full', this.root);
        const m = media(item.src, item);
        wrap.appendChild(m);
        if (item.window) {
          wrap.className = 'win';
          Object.assign(wrap.style, { width: '1500px', height: '844px' });
          Object.assign(m.style, { width: '100%', height: '100%', objectFit: 'cover' });
        }
        item.wrap = wrap;
        item.m = m;
        return item;
      });
      this.total = at;
    }
    draw(t) {
      const tr = this.spec.transition || 'iris';
      const td = this.spec.transitionDur ?? 0.5;
      this.items.forEach((it, i) => {
        const local = t - it.start;
        const next = this.items[i + 1];
        const visible = local >= 0 && (!next || t < next.start + td || tr === 'cut');
        const on = tr === 'cut' ? local >= 0 && (!next || t < next.start) : visible;
        show(it.wrap, on);
        if (!on) return;
        const push = it.push || this.spec.push || [1.0, 1.07];
        const s = lerp(push[0], push[1], clamp(local / (it.len + td)));
        if (it.window) place(it.wrap, (W - 1500) / 2, (H - 844) / 2, s * 0.98);
        else {
          css(it.wrap, 'transformOrigin', `${(it.focus || [0.5, 0.5])[0] * 100}% ${(it.focus || [0.5, 0.5])[1] * 100}%`);
          css(it.wrap, 'transform', `scale(${s.toFixed(4)})`);
        }
        css(it.wrap, 'zIndex', String(i + 1));
        const k = i === 0 ? 1 : EASE.smooth(inv(0, td, local));
        if (tr === 'iris' && i > 0) {
          const [ox, oy] = it.origin || [0.5, 0.5];
          const r = k * Math.hypot(W, H) * 1.02;
          css(it.wrap, 'clipPath', k >= 1 ? 'none' : `circle(${r.toFixed(1)}px at ${ox * 100}% ${oy * 100}%)`);
        } else if (tr === 'fade' && i > 0) fade(it.wrap, k);
        else if (tr === 'slide' && i > 0) css(it.wrap, 'transform', `translateX(${((1 - k) * W).toFixed(1)}px) scale(${s.toFixed(4)})`);
        syncVideo(it.m, local);
      });
    }
  };

  /* ----- photo with pins ----- */
  REG.pins = class extends Scene {
    constructor(spec) {
      const tint = spec.tint ?? (spec.headline ? 'linear-gradient(180deg, rgba(8,20,32,0.5) 0%, rgba(8,20,32,0.14) 30%, rgba(8,20,32,0) 48%)' : undefined);
      super({ ...spec, bg: spec.bg || { plate: spec.src, push: spec.push || [1.02, 1.07], tint } });
      this.headline = spec.headline ? this.sentence({ ...spec.headline, tone: spec.tone || 'dark', defaults: { size: 96, y: 170, ...(spec.headline.defaults || {}) } }) : null;
      this.pins = (spec.pins || []).map((p) => {
        const size = p.size || 150;
        const node = el('div', 'pin', this.root);
        const head = el('div', 'head', node, { width: `${size}px`, height: `${size}px` });
        const v = visual(p.img ? { src: p.img } : p.icon ? { icon: p.icon, color: '#fff' } : { shape: p.shape || 'circle', color: p.color, eyes: p.eyes }, size - 8);
        v.style.position = 'relative';
        if (p.icon) Object.assign(head.style, { background: p.color || theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' });
        if (p.icon) Object.assign(v.style, { width: `${size * 0.5}px`, height: `${size * 0.5}px` });
        head.appendChild(v);
        if (p.label) el('div', 'tag', node, { fontSize: `${p.labelSize || 30}px` }).textContent = p.label;
        return { ...p, node, size };
      });
    }
    layout() {
      super.layout();
      for (const p of this.pins) p.w = p.node.offsetWidth;
    }
    draw(t) {
      if (this.headline) this.headline.update(t);
      for (const p of this.pins) {
        const q = t - p.at;
        show(p.node, q > 0);
        if (q <= 0) continue;
        const k = spring(q, 2.1, 0.5);
        place(p.node, p.x * W - p.w / 2, p.y * H - p.size + Math.sin((t + p.x * 7) * 2) * 4, lerp(0.2, 1, k));
        fade(p.node, EASE.out(inv(0, 0.15, q)));
      }
    }
  };

  /* ----- phone and desktop linked side by side ----- */
  REG.split = class extends Scene {
    constructor(spec) {
      super(spec);
      this.ph = makePhone(this.root, { ...spec.phone, phoneWidth: spec.phone && spec.phone.phoneWidth ? spec.phone.phoneWidth : 360 });
      this.win = el('div', 'win', this.root);
      this.winMedia = media(spec.window.src, spec.window);
      this.winMedia.style.width = '100%';
      this.winMedia.style.display = 'block';
      this.win.appendChild(this.winMedia);
      this.dots = [0, 1, 2].map(() => el('div', '', this.root, { position: 'absolute', left: '0', top: '0', width: '14px', height: '14px', borderRadius: '50%', background: '#b9b9be' }));
    }
    layout() {
      super.layout();
      this.ww = this.spec.window.width || 1180;
      const nw = this.winMedia.naturalWidth || this.winMedia.videoWidth || 1600;
      const nh = this.winMedia.naturalHeight || this.winMedia.videoHeight || 1000;
      this.wh = (this.ww * nh) / nw;
      css(this.win, 'width', `${this.ww}px`);
      css(this.win, 'height', `${this.wh}px`);
    }
    draw(t) {
      const gap = 170;
      const total = this.ph.pw + gap + this.ww;
      const x0 = W / 2 - total / 2;
      const k = EASE.smooth(inv(0, 0.8, t));
      place(this.ph.node, x0 - (1 - k) * 80, H / 2 - this.ph.ph / 2);
      place(this.win, x0 + this.ph.pw + gap + (1 - k) * 80, H / 2 - this.wh / 2);
      fade(this.ph.node, k);
      fade(this.win, k);
      paintPhone(this.ph, this.spec.phone || {}, t, this.dur);
      syncVideo(this.winMedia, t);
      this.dots.forEach((d, i) => {
        const phase = (t * 2.2 - i * 0.33) % 1;
        const o = 0.35 + 0.65 * Math.max(0, Math.sin(phase * Math.PI));
        place(d, x0 + this.ph.pw + gap / 2 - 7 + (i - 1) * 30, H / 2 - 7);
        fade(d, o * k);
      });
    }
  };

  /* ----- end card ----- */
  REG.endcard = class extends Scene {
    constructor(spec) {
      super(spec);
      this.markSize = spec.markSize || 132;
      this.mark = el('div', 'brand-mark', this.root, { width: `${this.markSize}px`, height: `${this.markSize}px` });
      const img = loadImage(spec.mark || (SB.brand && SB.brand.mark));
      this.mark.appendChild(img);
      this.dot = el('div', '', this.root, { position: 'absolute', left: '0', top: '0', width: '14px', height: '14px', borderRadius: '50%', background: theme.ink });
      const wm = spec.wordmark || (SB.brand && SB.brand.wordmark);
      this.wordH = spec.wordmarkHeight || 112;
      if (wm) {
        this.word = el('div', 'wordmark', this.root, { height: `${this.wordH}px` });
        this.word.appendChild(loadImage(wm));
      } else {
        this.word = el('div', 'wordmark', this.root, { fontSize: `${spec.nameSize || 140}px`, fontWeight: String(spec.nameWeight || 600), letterSpacing: '-0.03em', lineHeight: '1', color: theme.ink });
        this.word.textContent = spec.name || (SB.brand && SB.brand.name) || '';
      }
      this.tagline = spec.tagline ? this.sentence({ steps: [{ at: spec.taglineAt ?? 1.5, text: spec.tagline }], defaults: { size: 52, y: 690, weight: 450 } }) : null;
      peekers(this, spec.peek);
    }
    layout() {
      super.layout();
      this.wordW = this.word.offsetWidth;
      this.wordHH = this.word.offsetHeight;
    }
    draw(t) {
      const spec = this.spec;
      const gap = spec.gap ?? 40;
      const withWord = spec.markOnly ? 0 : 1;
      const total = this.markSize + (gap + this.wordW) * withWord;
      const reveal = EASE.smooth(inv(spec.wordAt ?? 0.75, (spec.wordAt ?? 0.75) + 0.7, t));
      const cx = W / 2;
      const markX = lerp(cx - this.markSize / 2, cx - total / 2, withWord ? reveal : 0);
      const cy = H / 2 + (spec.y || 0);
      const dotK = EASE.out(inv(0, 0.2, t));
      show(this.dot, t < 0.42);
      place(this.dot, cx - 7, cy - 7, lerp(0.2, 1, dotK));
      const m = spring(t - 0.25, 1.9, 0.55);
      show(this.mark, t >= 0.25);
      place(this.mark, markX, cy - this.markSize / 2, clamp(m, 0, 1.2), (1 - clamp(m)) * -25);
      show(this.word, withWord && t >= (spec.wordAt ?? 0.75));
      const wx = markX + this.markSize + gap;
      place(this.word, wx, cy - this.wordHH / 2 + (this.spec.wordDy || 0));
      css(this.word, 'clipPath', `inset(-10% ${((1 - reveal) * 100).toFixed(2)}% -10% 0)`);
      if (!spec.wordmark && !(SB.brand && SB.brand.wordmark)) css(this.word, 'color', mixColor(theme.accent, theme.ink, EASE.inOut(inv((spec.wordAt ?? 0.75) + 0.2, (spec.wordAt ?? 0.75) + 1.2, t))));
      if (this.tagline) this.tagline.update(t);
    }
  };

  /* ----- a custom scene authored as HTML with per-element keyframes ----- */
  REG.html = class extends Scene {
    constructor(spec) {
      super(spec);
      const layer = el('div', 'layer', this.root);
      layer.innerHTML = spec.html || '';
      this.anims = (spec.animate || []).map((a) => ({ ...a, nodes: [...layer.querySelectorAll(a.select)] }));
    }
    draw(t) {
      for (const a of this.anims) {
        const vals = {};
        for (const [prop, keys] of Object.entries(a.props || {})) vals[prop] = track(t, keys);
        for (const n of a.nodes) {
          const tr = [];
          if (vals.x !== undefined || vals.y !== undefined) tr.push(`translate(${vals.x || 0}px,${vals.y || 0}px)`);
          if (vals.scale !== undefined) tr.push(`scale(${vals.scale})`);
          if (vals.rotate !== undefined) tr.push(`rotate(${vals.rotate}deg)`);
          if (tr.length) css(n, 'transform', tr.join(' '));
          if (vals.opacity !== undefined) fade(n, vals.opacity);
          if (vals.blur !== undefined) blur(n, vals.blur);
        }
      }
    }
  };

  /* ------------------------------------------------------------------ */
  /* timeline                                                            */
  /* ------------------------------------------------------------------ */

  const scenes = [];
  let cursorT = 0;
  for (const raw of SB.scenes) {
    const Cls = REG[raw.type];
    if (!Cls) throw new Error(`Unknown scene type: ${raw.type}`);
    const scene = new Cls(raw);
    scene.dur = raw.dur ?? (raw.beats ? raw.beats * BEAT : 2);
    scene.start = cursorT;
    scene.transition = raw.in ? (typeof raw.in === 'string' ? { type: raw.in } : raw.in) : null;
    cursorT += scene.dur;
    scenes.push(scene);
  }
  const DURATION = cursorT;

  function sceneIndexAt(t) {
    let lo = 0;
    for (let i = 0; i < scenes.length; i += 1) if (t >= scenes[i].start - 1e-6) lo = i;
    return lo;
  }

  function applyTransition(scene, t) {
    const tr = scene.transition;
    const root = scene.root;
    if (!tr) {
      css(root, 'clipPath', 'none');
      fade(root, 1);
      css(root, 'transform', 'none');
      return false;
    }
    const dur = tr.dur ?? 0.5;
    const k = EASE.smooth(inv(0, dur, t));
    const active = t < dur;
    css(root, 'clipPath', 'none');
    css(root, 'transform', 'none');
    fade(root, 1);
    blur(root, 0);
    if (!active) return false;
    if (tr.type === 'fade') fade(root, EASE.inOutSine(inv(0, dur, t)));
    else if (tr.type === 'iris') {
      const [ox, oy] = tr.origin || [0.5, 0.5];
      css(root, 'clipPath', `circle(${(k * Math.hypot(W, H)).toFixed(1)}px at ${ox * 100}% ${oy * 100}%)`);
    } else if (tr.type === 'rise') css(root, 'transform', `translateY(${((1 - k) * H).toFixed(1)}px)`);
    else if (tr.type === 'drop') css(root, 'transform', `translateY(${(-(1 - k) * H).toFixed(1)}px)`);
    else if (tr.type === 'push') css(root, 'transform', `translateX(${((1 - k) * W).toFixed(1)}px)`);
    else if (tr.type === 'zoom') {
      css(root, 'transform', `scale(${lerp(1.12, 1, k).toFixed(4)})`);
      fade(root, EASE.out(inv(0, dur * 0.7, t)));
    } else if (tr.type === 'blur') {
      fade(root, EASE.out(inv(0, dur * 0.8, t)));
      blur(root, (1 - k) * 18);
    }
    return true;
  }

  let lastVisible = [];
  function frame(t) {
    t = clamp(t, 0, Math.max(0, DURATION - 1e-4));
    const i = sceneIndexAt(t);
    const cur = scenes[i];
    const local = t - cur.start;
    const visible = [cur];
    const inTransition = applyTransition(cur, local);
    if (inTransition && scenes[i - 1]) visible.unshift(scenes[i - 1]);
    for (const s of lastVisible) if (!visible.includes(s)) s.root.classList.remove('on');
    visible.forEach((s, z) => {
      s.root.classList.add('on');
      css(s.root, 'zIndex', String(z + 1));
      s.update(t - s.start);
    });
    lastVisible = visible;
    return i;
  }

  async function seek(t) {
    videoSeeks.length = 0;
    const i = frame(t);
    if (videoSeeks.length) await Promise.all(videoSeeks.splice(0));
    return i;
  }

  const ready = (async () => {
    // Load the display face explicitly: fonts.ready alone resolves before a
    // face that no rendered text has requested yet, and layout would then be
    // measured with fallback metrics.
    const family = (theme.font || 'Inter').split(',')[0].replace(/['"]/g, '').trim();
    await Promise.all([300, 400, 500, 600, 700].map((w) => document.fonts.load(`${w} 100px "${family}"`).catch(() => null)));
    await document.fonts.ready;
    await Promise.all(pending);
    for (const s of scenes) {
      s.root.classList.add('on');
      s.layout();
      s.root.classList.remove('on');
    }
    frame(0);
    return true;
  })();

  window.__film = {
    duration: DURATION,
    fps: FPS,
    beat: BEAT,
    width: W,
    height: H,
    ready,
    seek,
    scenes: scenes.map((s, i) => ({ index: i, type: s.spec.type, id: s.spec.id || null, start: s.start, dur: s.dur, note: s.spec.note || '' })),
  };

  /* ------------------------------------------------------------------ */
  /* preview player                                                      */
  /* ------------------------------------------------------------------ */

  if (RENDER) {
    document.body.classList.add('render');
    return;
  }
  const viewport = document.getElementById('viewport');
  function fit() {
    const r = viewport.getBoundingClientRect();
    const s = Math.min(r.width / W, r.height / H);
    stage.style.transform = `translate(${(r.width - W * s) / 2}px, ${(r.height - H * s) / 2}px) scale(${s})`;
    stage.style.position = 'absolute';
    stage.style.left = '0';
    stage.style.top = '0';
  }
  window.addEventListener('resize', fit);
  fit();
  const player = document.getElementById('player');
  player.innerHTML = '<button data-act="play">Play</button><span class="time"></span><div class="track"><div class="rail"></div><div class="done"></div><div class="head"></div></div><span class="scene-name"></span>';
  const btn = player.querySelector('[data-act="play"]');
  const timeEl = player.querySelector('.time');
  const trackEl = player.querySelector('.track');
  const doneEl = player.querySelector('.done');
  const headEl = player.querySelector('.head');
  const nameEl = player.querySelector('.scene-name');
  for (const s of scenes) {
    const m = el('div', 'mark', trackEl);
    m.style.left = `${(s.start / DURATION) * 100}%`;
    m.title = `${s.spec.type}${s.spec.id ? ` · ${s.spec.id}` : ''}`;
  }
  let now = Number(new URLSearchParams(location.search).get('t') || 0);
  let playing = false;
  let last = 0;
  function paint() {
    const i = frame(now);
    const p = (now / DURATION) * 100;
    doneEl.style.width = `${p}%`;
    headEl.style.left = `${p}%`;
    timeEl.textContent = `${now.toFixed(2)}s / ${DURATION.toFixed(2)}s`;
    nameEl.textContent = `#${i} ${scenes[i].spec.type}${scenes[i].spec.id ? ` · ${scenes[i].spec.id}` : ''}`;
  }
  function loop(ts) {
    if (playing) {
      now += (ts - last) / 1000;
      if (now >= DURATION) {
        now = DURATION;
        playing = false;
        btn.textContent = 'Play';
      }
    }
    last = ts;
    paint();
    for (const v of videos) {
      if (playing && v.paused) v.play().catch(() => {});
      if (!playing && !v.paused) v.pause();
    }
    requestAnimationFrame(loop);
  }
  btn.addEventListener('click', () => {
    if (now >= DURATION - 0.01) now = 0;
    playing = !playing;
    btn.textContent = playing ? 'Pause' : 'Play';
  });
  const scrub = (e) => {
    const r = trackEl.getBoundingClientRect();
    now = clamp((e.clientX - r.left) / r.width) * DURATION;
  };
  trackEl.addEventListener('mousedown', (e) => {
    scrub(e);
    const move = (ev) => scrub(ev);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', () => window.removeEventListener('mousemove', move), { once: true });
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      btn.click();
      e.preventDefault();
    } else if (e.code === 'ArrowRight') now = Math.min(DURATION, now + (e.shiftKey ? 1 : 1 / FPS));
    else if (e.code === 'ArrowLeft') now = Math.max(0, now - (e.shiftKey ? 1 : 1 / FPS));
    else if (e.code === 'BracketRight') {
      const i = sceneIndexAt(now);
      if (scenes[i + 1]) now = scenes[i + 1].start;
    } else if (e.code === 'BracketLeft') {
      const i = sceneIndexAt(now);
      now = scenes[Math.max(0, now - scenes[i].start < 0.3 ? i - 1 : i)].start;
    }
  });
  ready.then(() => requestAnimationFrame(loop));
})();
