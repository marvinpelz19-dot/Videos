#!/usr/bin/env node
// Captures a product website for storyboard research: sharp desktop and
// mobile screenshots, headline copy, calls to action, logo candidates,
// color tokens and large media. Nothing on the page is clicked; overlays
// such as cookie banners are hidden, never accepted.
//
// Usage:
//   node capture.mjs --url https://example.com --out ./capture
//        [--pages /features,/pricing] [--max-shots 10] [--no-mobile]
//        [--no-media] [--headed] [--wait 2500] [--scale 2]
//
// --scale sets the desktop device scale (default 2). Use 3 when the film
// will be rendered in 2K or 4K so UI push-ins stay sharp.
import fs from 'node:fs';
import path from 'node:path';
import { launchChromium } from './lib/browser.mjs';

const args = parseArgs(process.argv.slice(2));
if (!args.url || !args.out) {
  console.error('Usage: node capture.mjs --url <https://...> --out <dir> [--pages /a,/b] [--max-shots 10] [--no-mobile] [--no-media] [--headed]');
  process.exit(2);
}
const OUT = path.resolve(args.out);
const MAX_SHOTS = Number(args['max-shots'] ?? 10);
const SETTLE = Number(args.wait ?? 2500);
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'media'), { recursive: true });

const HIDE_OVERLAYS = () => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const words = /(cookie|consent|gdpr|privacy choices|we use cookies|accept all|reject all|onetrust|didomi|usercentrics)/i;
  let hidden = 0;
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
    const r = el.getBoundingClientRect();
    const area = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
    const text = (el.innerText || '').slice(0, 600);
    const isBanner = words.test(text) || words.test(el.id || '') || words.test(String(el.className || ''));
    const isBlocking = area > vw * vh * 0.35 && cs.position === 'fixed' && Number(cs.zIndex || 0) >= 10 && r.top <= 5;
    if (isBanner || (isBlocking && !el.querySelector('nav, header'))) {
      el.style.setProperty('display', 'none', 'important');
      hidden += 1;
    }
  }
  document.documentElement.style.setProperty('overflow', 'auto', 'important');
  document.body.style.setProperty('overflow', 'auto', 'important');
  return hidden;
};

const EXTRACT = () => {
  const abs = (u) => {
    try { return new URL(u, location.href).href; } catch { return null; }
  };
  const meta = (sel) => document.querySelector(sel)?.getAttribute('content') || null;
  const txt = (el) => (el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim();
  const rectOf = (el) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const headings = [...document.querySelectorAll('h1, h2, h3')]
    .filter((h) => txt(h) && h.getBoundingClientRect().width > 0)
    .slice(0, 80)
    .map((h) => {
      let para = '';
      let sib = h.nextElementSibling;
      for (let i = 0; i < 3 && sib && !para; i += 1) {
        if (/^(P|DIV|SPAN)$/.test(sib.tagName)) para = txt(sib).slice(0, 280);
        sib = sib.nextElementSibling;
      }
      if (!para) {
        const p = h.parentElement?.querySelector('p');
        if (p) para = txt(p).slice(0, 280);
      }
      return { tag: h.tagName.toLowerCase(), text: txt(h).slice(0, 200), para, ...rectOf(h) };
    });
  const ctas = [...document.querySelectorAll('a, button')]
    .map((el) => ({ text: txt(el).slice(0, 60), href: el.getAttribute('href') ? abs(el.getAttribute('href')) : null, el }))
    .filter((c) => c.text && c.text.length > 1 && c.text.length < 40)
    .filter((c) => {
      const cs = getComputedStyle(c.el);
      const bg = cs.backgroundColor;
      return bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
    })
    .slice(0, 30)
    .map((c) => ({ text: c.text, href: c.href, bg: getComputedStyle(c.el).backgroundColor, color: getComputedStyle(c.el).color }));
  const nav = [...document.querySelectorAll('header a, nav a')]
    .map((a) => ({ text: txt(a).slice(0, 60), href: abs(a.getAttribute('href') || '') }))
    .filter((a) => a.text && a.href && a.href.startsWith(location.origin))
    .slice(0, 40);
  const logoCandidates = [];
  const pushLogo = (kind, value, extra = {}) => {
    if (value && !logoCandidates.some((l) => l.value === value)) logoCandidates.push({ kind, value, ...extra });
  };
  for (const el of document.querySelectorAll('header img, nav img, a[href="/"] img, [class*="logo" i] img, img[alt*="logo" i], img[src*="logo" i]')) {
    pushLogo('img', abs(el.currentSrc || el.src), { alt: el.alt || '', w: el.naturalWidth, h: el.naturalHeight });
  }
  for (const el of document.querySelectorAll('header svg, nav svg, a[href="/"] svg, [class*="logo" i] svg')) {
    const r = el.getBoundingClientRect();
    if (r.width < 14 || r.height < 10 || r.width > 420) continue;
    const clone = el.cloneNode(true);
    const color = getComputedStyle(el).color;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    if (!clone.getAttribute('viewBox') && r.width && r.height) clone.setAttribute('viewBox', `0 0 ${Math.round(r.width)} ${Math.round(r.height)}`);
    let markup = clone.outerHTML.replace(/currentColor/g, color);
    pushLogo('svg', markup.slice(0, 200000), { w: Math.round(r.width), h: Math.round(r.height), color });
    if (logoCandidates.filter((l) => l.kind === 'svg').length >= 6) break;
  }
  for (const link of document.querySelectorAll('link[rel*="icon" i], link[rel="apple-touch-icon"], link[rel="mask-icon"]')) {
    pushLogo('icon', abs(link.getAttribute('href')), { rel: link.getAttribute('rel'), sizes: link.getAttribute('sizes') || '' });
  }
  const images = [...document.images]
    .map((img) => ({ src: abs(img.currentSrc || img.src), alt: img.alt || '', nw: img.naturalWidth, nh: img.naturalHeight, ...rectOf(img) }))
    .filter((i) => i.src && !i.src.startsWith('data:') && i.nw >= 320 && i.nh >= 200)
    .sort((a, b) => b.w * b.h - a.w * a.h)
    .slice(0, 60);
  const bgImages = [];
  for (const el of document.querySelectorAll('section, div, header, figure')) {
    const bg = getComputedStyle(el).backgroundImage;
    const m = bg && bg.match(/url\(["']?([^"')]+)["']?\)/);
    if (!m) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 400 || r.height < 240) continue;
    bgImages.push({ src: abs(m[1]), ...rectOf(el) });
    if (bgImages.length >= 20) break;
  }
  const videos = [...document.querySelectorAll('video')]
    .map((v) => ({ src: abs(v.currentSrc || v.src || v.querySelector('source')?.src || ''), poster: v.poster ? abs(v.poster) : null, ...rectOf(v) }))
    .filter((v) => v.src || v.poster)
    .slice(0, 12);
  const bodyCs = getComputedStyle(document.body);
  const h1 = document.querySelector('h1');
  const fonts = new Set();
  for (const el of [document.body, h1, document.querySelector('h2'), document.querySelector('p'), document.querySelector('button')]) {
    if (el) fonts.add(getComputedStyle(el).fontFamily);
  }
  return {
    url: location.href,
    title: document.title,
    description: meta('meta[name="description"]'),
    og: {
      title: meta('meta[property="og:title"]'),
      description: meta('meta[property="og:description"]'),
      image: meta('meta[property="og:image"]') ? abs(meta('meta[property="og:image"]')) : null,
      siteName: meta('meta[property="og:site_name"]'),
    },
    themeColor: meta('meta[name="theme-color"]'),
    lang: document.documentElement.lang || null,
    pageHeight: Math.round(document.documentElement.scrollHeight),
    colors: {
      background: bodyCs.backgroundColor,
      text: bodyCs.color,
      h1: h1 ? getComputedStyle(h1).color : null,
    },
    fonts: [...fonts],
    headings,
    ctas,
    nav,
    logoCandidates,
    images,
    bgImages,
    videos,
  };
};

async function settle(page, ms) {
  try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch {}
  await page.waitForTimeout(ms);
}

async function autoscroll(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = await page.evaluate(() => Math.round(innerHeight * 0.8));
  for (let y = 0; y < Math.min(height, 24000); y += step) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(260);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(700);
}

async function shootSections(page, prefix, maxShots, headings) {
  const vh = await page.evaluate(() => innerHeight);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const stops = [0];
  for (const h of headings) {
    if (h.tag === 'h3') continue;
    const y = Math.max(0, h.y - Math.round(vh * 0.18));
    if (stops.every((s) => Math.abs(s - y) > vh * 0.6)) stops.push(y);
  }
  for (let y = vh; y < total - vh * 0.5 && stops.length < maxShots * 2; y += vh) {
    if (stops.every((s) => Math.abs(s - y) > vh * 0.6)) stops.push(y);
  }
  stops.sort((a, b) => a - b);
  const picked = stops.slice(0, maxShots);
  const shots = [];
  for (const [i, y] of picked.entries()) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(650);
    await page.evaluate(HIDE_OVERLAYS);
    const file = `shots/${prefix}-${String(i).padStart(2, '0')}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    shots.push({ file, scrollY: y });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  return shots;
}

async function download(context, url, base) {
  try {
    const res = await context.request.get(url, { timeout: 30000 });
    if (!res.ok()) return null;
    const type = res.headers()['content-type'] || '';
    const ext = type.includes('svg') ? 'svg' : type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('gif') ? 'gif' : type.includes('avif') ? 'avif' : type.includes('mp4') ? 'mp4' : type.includes('webm') ? 'webm' : type.includes('icon') ? 'ico' : 'jpg';
    const body = await res.body();
    if (body.length < 400) return null;
    const file = `media/${base}.${ext}`;
    fs.writeFileSync(path.join(OUT, file), body);
    return { file, bytes: body.length, type };
  } catch {
    return null;
  }
}

const browser = await launchChromium({ headless: !args.headed });
const report = { capturedAt: new Date().toISOString(), input: args.url, pages: [] };
try {
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: Number(args.scale || 2),
    locale: 'en-US',
    colorScheme: args.dark ? 'dark' : 'light',
  });
  const page = await desktop.newPage();
  const response = await page.goto(args.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  report.status = response?.status() ?? null;
  await settle(page, SETTLE);
  await page.evaluate(HIDE_OVERLAYS);
  await autoscroll(page);
  const info = await page.evaluate(EXTRACT);
  const heroFile = 'shots/desktop-hero.png';
  await page.evaluate(HIDE_OVERLAYS);
  await page.screenshot({ path: path.join(OUT, heroFile) });
  const shots = await shootSections(page, 'desktop', MAX_SHOTS, info.headings);
  try {
    await page.screenshot({ path: path.join(OUT, 'shots/desktop-full.jpg'), fullPage: true, type: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: 1440, height: Math.min(info.pageHeight, 9000) } });
  } catch {}
  report.pages.push({ kind: 'desktop', ...info, hero: heroFile, shots });

  for (const sub of String(args.pages || '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const target = new URL(sub, info.url).href;
    try {
      await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await settle(page, SETTLE);
      await page.evaluate(HIDE_OVERLAYS);
      await autoscroll(page);
      const subInfo = await page.evaluate(EXTRACT);
      const slug = sub.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'page';
      const subShots = await shootSections(page, `page-${slug}`, Math.max(3, Math.round(MAX_SHOTS / 2)), subInfo.headings);
      report.pages.push({ kind: 'subpage', path: sub, ...subInfo, images: subInfo.images.slice(0, 20), shots: subShots });
    } catch (error) {
      report.pages.push({ kind: 'subpage', path: sub, error: String(error.message || error) });
    }
  }

  if (!args['no-media']) {
    const media = [];
    const seen = new Set();
    const queue = [
      ...info.logoCandidates.filter((l) => l.kind !== 'svg').map((l, i) => ({ url: l.value, base: `logo-${i}` })),
      ...(info.og.image ? [{ url: info.og.image, base: 'og-image' }] : []),
      ...info.images.slice(0, 24).map((img, i) => ({ url: img.src, base: `img-${String(i).padStart(2, '0')}`, alt: img.alt })),
      ...info.bgImages.slice(0, 10).map((img, i) => ({ url: img.src, base: `bg-${String(i).padStart(2, '0')}` })),
      ...info.videos.filter((v) => v.poster).map((v, i) => ({ url: v.poster, base: `poster-${i}` })),
    ];
    if (args.videos) queue.push(...info.videos.filter((v) => v.src).map((v, i) => ({ url: v.src, base: `video-${i}` })));
    for (const item of queue) {
      if (!item.url || seen.has(item.url)) continue;
      seen.add(item.url);
      const saved = await download(desktop, item.url, item.base);
      if (saved) media.push({ ...saved, url: item.url, alt: item.alt || '' });
    }
    info.logoCandidates
      .filter((l) => l.kind === 'svg')
      .forEach((l, i) => {
        const file = `media/logo-svg-${i}.svg`;
        fs.writeFileSync(path.join(OUT, file), l.value);
        media.push({ file, type: 'image/svg+xml', inline: true, w: l.w, h: l.h });
      });
    report.media = media;
  }
  await desktop.close();

  if (!args['no-mobile']) {
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      locale: 'en-US',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
    });
    const mpage = await mobile.newPage();
    try {
      await mpage.goto(args.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await settle(mpage, SETTLE);
      await mpage.evaluate(HIDE_OVERLAYS);
      await autoscroll(mpage);
      const mInfo = await mpage.evaluate(EXTRACT);
      const mShots = await shootSections(mpage, 'mobile', Math.max(4, Math.round(MAX_SHOTS * 0.6)), mInfo.headings);
      report.pages.push({ kind: 'mobile', url: mInfo.url, shots: mShots });
    } catch (error) {
      report.pages.push({ kind: 'mobile', error: String(error.message || error) });
    }
    await mobile.close();
  }
} finally {
  await Promise.race([browser.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}

fs.writeFileSync(path.join(OUT, 'site.json'), JSON.stringify(report, null, 2));
const main = report.pages[0] || {};
console.log(JSON.stringify({
  out: OUT,
  status: report.status,
  title: main.title,
  description: main.description,
  headings: (main.headings || []).slice(0, 14).map((h) => `${h.tag}: ${h.text}`),
  shots: report.pages.flatMap((p) => (p.shots || []).map((s) => s.file)),
  media: (report.media || []).length,
}, null, 2));

function parseArgs(list) {
  const out = {};
  for (let i = 0; i < list.length; i += 1) {
    const token = list[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = list[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i += 1; }
  }
  return out;
}
