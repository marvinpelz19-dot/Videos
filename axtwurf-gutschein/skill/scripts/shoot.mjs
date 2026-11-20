#!/usr/bin/env node
// Screenshots one part of a live page as a crisp film asset: a DOM element
// (by CSS selector or by visible text), or a clip rectangle, at 2x or 3x.
// Overlays are hidden, never accepted.
//
//   node shoot.mjs --url <https://...> --out ui.png --selector "main .app-window"
//   node shoot.mjs --url <...> --out card.png --text "Give each Bot a job" --up 3
//   node shoot.mjs --url <...> --out hero.png --clip 0,80,1440,820 [--scroll 1200]
//   options: --mobile  --scale 2  --pad 24  --wait 2500  --headed  --hide ".banner,.nav"
import path from 'node:path';
import fs from 'node:fs';
import { launchChromium } from './lib/browser.mjs';

const a = parseArgs(process.argv.slice(2));
if (!a.url || !a.out || (!a.selector && !a.text && !a.clip)) {
  console.error('Usage: node shoot.mjs --url <url> --out <file.png> (--selector <css> | --text <visible text> [--up N] | --clip x,y,w,h) [--mobile] [--scale 2] [--pad 24] [--scroll y] [--hide css] [--headed]');
  process.exit(2);
}
const mobile = Boolean(a.mobile);
const browser = await launchChromium({ headless: !a.headed });
try {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: Number(a.width || 1440), height: Number(a.height || 900) },
    deviceScaleFactor: Number(a.scale || (mobile ? 3 : 2)),
    isMobile: mobile,
    hasTouch: mobile,
    locale: 'en-US',
    ...(mobile ? { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1' } : {}),
  });
  const page = await context.newPage();
  await page.goto(a.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch {}
  await page.waitForTimeout(Number(a.wait || 2500));
  await page.evaluate(() => {
    const words = /(cookie|consent|gdpr|we use cookies|accept all|onetrust)/i;
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if ((cs.position === 'fixed' || cs.position === 'sticky') && (words.test(el.innerText || '') || words.test(el.id || ''))) el.style.setProperty('display', 'none', 'important');
    }
  });
  if (a.hide) await page.addStyleTag({ content: `${a.hide}{visibility:hidden !important}` });
  // walk the page once so lazy media loads
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < Math.min(h, 20000); y += 700) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  const out = path.resolve(a.out);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  if (a.clip) {
    if (a.scroll) {
      await page.evaluate((top) => window.scrollTo(0, top), Number(a.scroll));
      await page.waitForTimeout(900);
    }
    const [x, y, w, hh] = String(a.clip).split(',').map(Number);
    // clip is in document coordinates
    await page.screenshot({ path: out, fullPage: true, clip: { x, y, width: w, height: hh } });
  } else {
    let handle;
    if (a.selector) handle = await page.$(a.selector);
    else {
      handle = await page.evaluateHandle(({ text, up }) => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
        let best = null;
        while (walker.nextNode()) {
          const el = walker.currentNode;
          if ((el.innerText || '').trim() === text || (el.childElementCount === 0 && (el.textContent || '').trim().includes(text))) {
            best = el;
            break;
          }
        }
        for (let i = 0; best && i < up; i += 1) best = best.parentElement;
        return best;
      }, { text: a.text, up: Number(a.up || 0) });
    }
    const el = handle && handle.asElement ? handle.asElement() : null;
    if (!el) throw new Error('Element not found');
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    const box = await el.boundingBox();
    const scrollY = await page.evaluate(() => window.scrollY);
    const pad = Number(a.pad || 0);
    // document coordinates, so elements taller than the viewport still fit
    await page.screenshot({ path: out, fullPage: true, clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y + scrollY - pad), width: box.width + pad * 2, height: box.height + pad * 2 } });
  }
  console.log(out);
} finally {
  await Promise.race([browser.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}

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
