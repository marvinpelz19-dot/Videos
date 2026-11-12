// Oberfläche: Titel, Hangar (Einsätze, Schiff, Upgrades, Einstellungen), HUD, Pause, Ergebnis.
import { WEAPONS, UPGRADES, SHIPS, MISSIONS, ENDLESS, STORY, upgradeCost } from './data.js';
import { sfx } from './audio.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n) => Math.round(n).toLocaleString('de-DE');
const stars = (n, of = 3) => '<span class="stars">' + '★'.repeat(n) + '<i>' + '★'.repeat(of - n) + '</i></span>';

export function createUI(api) {
  const { save } = api, screen = $('screen'), hud = $('hud'), touch = $('touch');
  let tab = 'missions', sel = null, bannerT = 0, commsT = 0, lastWeaponKey = '';
  document.body.classList.toggle('touch', api.isTouch);

  const unlockedW = () => WEAPONS.filter((w, i) => api.weaponOpen(i));
  const missionOpen = (i) => i <= 1 || !!save.done[MISSIONS[i - 1].id];

  function showTitle() {
    hud.hidden = touch.hidden = true; screen.hidden = false; screen.className = 'screen title';
    screen.innerHTML = `<div class="title-art"></div><div class="title-box">
      <p class="eyebrow">Handelsverband gegen Unternehmerverband · Der Krieg um Essen</p>
      <h1>NOVA<br>SQUADRON</h1>
      <p class="lede">${STORY.intro}</p><p class="lede small">Sechs Einsätze, fünf Waffen. Unendlich Munition, unendlich Leben.</p>
      <button class="btn big" id="b-start">Zum Hangar</button>
      <p class="hint">${api.isTouch ? 'Linker Daumen steuert, rechts feuern.' : 'Maus oder WASD steuern · Leertaste oder Maustaste feuert'}</p></div>`;
    $('b-start').onclick = () => { api.audio(); sfx.click(); if (save.seenIntro) api.toHangar(); else showIntro(0); };
  }

  // Story-Einstieg: drei Karten, danach geht es in den Hangar mit der Flugschule als erstem Einsatz
  function showIntro(i) {
    const [h, p] = STORY.cards[i], last = i === STORY.cards.length - 1;
    screen.className = 'screen title intro';
    screen.innerHTML = `<div class="title-art"></div><div class="title-box"><p class="eyebrow">Der Krieg um Essen · ${i + 1} von ${STORY.cards.length}</p>
      <h2 class="story-h">${esc(h)}</h2><p class="lede story-p">${esc(p)}</p>
      <div class="row"><button class="btn big" id="i-next">${last ? 'Zur Flugschule' : 'Weiter'}</button>${last ? '' : '<button class="btn ghost" id="i-skip">Überspringen</button>'}</div></div>`;
    const done = () => { save.seenIntro = true; api.persist(); api.toHangar(); };
    $('i-next').onclick = () => { sfx.click(); if (last) done(); else showIntro(i + 1); };
    if ($('i-skip')) $('i-skip').onclick = () => { sfx.click(); done(); };
  }

  function showHangar() {
    hud.hidden = touch.hidden = true; screen.hidden = false; screen.className = 'screen hangar' + (tab === 'ship' ? ' view' : ''); api.showcase(tab === 'ship' ? save.ship : null);
    if (!sel) sel = MISSIONS.find((m, i) => missionOpen(i) && !save.done[m.id]) || MISSIONS[0];
    const tabs = [['missions', 'Einsätze'], ['ship', 'Schiff & Waffen'], ['upgrades', 'Upgrades'], ['settings', 'Einstellungen']];
    screen.innerHTML = `<header class="bar"><div class="brand">NOVA SQUADRON</div>
      <div class="credits"><span>Credits</span><b>${fmt(save.credits)}</b></div></header>
      <nav class="tabs">${tabs.map(([k, n]) => `<button class="tab${k === tab ? ' on' : ''}" data-tab="${k}">${n}</button>`).join('')}</nav>
      <main class="pane">${{ missions, ship, upgrades, settings }[tab]()}</main>`;
    screen.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; sfx.click(); showHangar(); }));
    screen.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => { sel = b.dataset.m === 'endless' ? ENDLESS : MISSIONS[+b.dataset.m]; sfx.click(); showHangar(); }));
    screen.querySelectorAll('[data-up]').forEach((b) => (b.onclick = () => {
      const u = UPGRADES.find((x) => x.id === b.dataset.up), l = api.up(u.id), c = upgradeCost(l);
      if (l < u.max && save.credits >= c) { save.credits -= c; save.up[u.id] = l + 1; api.persist(); sfx.buy(); showHangar(); } else sfx.deny();
    }));
    screen.querySelectorAll('[data-ship]').forEach((b) => (b.onclick = () => { save.ship = b.dataset.ship; api.persist(); sfx.click(); showHangar(); }));
    screen.querySelectorAll('[data-set]').forEach((b) => (b.onclick = () => {
      const k = b.dataset.set; if (k === 'quality') { save.set.quality = b.dataset.v; api.quality(); } else { save.set[k] = !save.set[k]; api.settings(); } sfx.click(); showHangar();
    }));
    const go = $('b-go'); if (go) go.onclick = () => { sfx.click(); api.start(sel); };
  }
  function missions() {
    const cards = MISSIONS.map((m, i) => {
      const open = missionOpen(i), st = save.done[m.id] || 0;
      return `<button class="mcard${sel === m ? ' on' : ''}${open ? '' : ' locked'}" data-m="${i}" ${open ? '' : 'disabled'}>
        <span class="num">${m.tutorial ? 'T' : m.n}</span><span class="mt"><b>${esc(m.name)}</b><small>${open ? esc(m.place) : 'Gesperrt · vorherigen Einsatz abschließen'}</small></span>${open ? stars(st) : '<span class="lock">▣</span>'}</button>`;
    }).join('');
    const eOpen = !!save.done.m1;
    const endless = `<button class="mcard endless${sel === ENDLESS ? ' on' : ''}${eOpen ? '' : ' locked'}" data-m="endless" ${eOpen ? '' : 'disabled'}><span class="num">∞</span><span class="mt"><b>${ENDLESS.name}</b><small>${eOpen ? (save.bestWave ? `Rekord: Welle ${save.bestWave}` : ENDLESS.place) : 'Gesperrt · Einsatz 1 abschließen'}</small></span></button>`;
    const m = sel, i = m.n, w = WEAPONS.find((x) => x.unlock > 0 && x.unlock === i), s = SHIPS.find((x) => x.unlock > 0 && x.unlock === i);
    const reward = m.endless ? 'Credits je Welle' : [w && !save.done[m.id] ? `Neue Waffe: ${w.name}` : '', s && !save.done[m.id] ? `Neues Schiff: ${s.name}` : '', `${fmt(m.tutorial ? (save.done[m.id] ? 100 : 500) : 500 * i * (save.done[m.id] ? 1 : 2))} Credits`].filter(Boolean).join(' · ');
    return `<div class="mgrid"><div class="mlist">${cards}${endless}</div>
      <section class="brief"><p class="eyebrow">${m.endless ? 'Dauergefecht' : m.tutorial ? 'Ausbildung' : `Einsatz ${i} von ${MISSIONS.length - 1}`} · ${esc(m.place)}</p><h2>${esc(m.name)}</h2><p>${esc(m.brief)}</p>
      ${m.phases ? `<ol class="phases">${m.phases.map((p) => `<li>${esc(p.label)}</li>`).join('')}</ol>` : ''}
      <p class="reward"><span>Belohnung</span> ${esc(reward)}</p>
      <p class="reward"><span>Wertung</span> ★★★ ohne Notschild · ★★ bis drei · ★ darüber</p>
      <button class="btn big" id="b-go">Starten</button></section></div>`;
  }
  function ship() {
    const n = api.doneCount();
    const ships = SHIPS.map((s) => {
      const open = s.unlock <= n, bar = (v) => `<i class="stat"><i style="transform:scaleX(${Math.min(1, v / 1.6)})"></i></i>`;
      return `<button class="scard${save.ship === s.id ? ' on' : ''}${open ? '' : ' locked'}" data-ship="${s.id}" ${open ? '' : 'disabled'}>
        <b>${s.name}</b><small>${open ? s.role : `Nach Einsatz ${s.unlock}`}</small><p>${s.desc}</p>
        <dl><dt>Tempo</dt><dd>${bar(s.speed)}</dd><dt>Wendigkeit</dt><dd>${bar(s.turn)}</dd><dt>Feuerkraft</dt><dd>${bar(s.dmg)}</dd><dt>Schild</dt><dd>${bar(s.shield)}</dd></dl>
        <span class="pick">${save.ship === s.id ? 'Gewählt' : open ? 'Wählen' : 'Gesperrt'}</span></button>`;
    }).join('');
    const weapons = WEAPONS.map((w, i) => `<li class="${w.unlock <= n ? '' : 'locked'}"><span class="key">${i + 1}</span><b>${w.name}</b><small>${w.unlock <= n ? w.desc : `Nach Einsatz ${w.unlock}`}</small><em>∞</em></li>`).join('');
    return `<div class="viewer" aria-hidden="true"></div><h2 class="sec">Schiff</h2><div class="ships">${ships}</div><h2 class="sec">Waffen <small>alle mit unendlich Munition</small></h2><ul class="wlist">${weapons}</ul>`;
  }
  function upgrades() {
    return `<div class="ups">${UPGRADES.map((u) => {
      const l = api.up(u.id), c = upgradeCost(l), full = l >= u.max, can = !full && save.credits >= c;
      return `<div class="ucard"><div><b>${u.name}</b><small>${u.desc}</small><span class="pips">${Array.from({ length: u.max }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('')}</span></div>
        <button class="btn${can ? '' : ' off'}" data-up="${u.id}" ${full ? 'disabled' : ''}>${full ? 'Maximal' : fmt(c) + ' Cr'}</button></div>`;
    }).join('')}</div><p class="note">Credits gibt es für jeden Abschuss und jeden Einsatz. Serien ohne Pause erhöhen den Ertrag.</p>`;
  }
  function settings() {
    const s = save.set, tg = (k, n, d) => `<div class="ucard"><div><b>${n}</b><small>${d}</small></div><button class="btn" data-set="${k}">${s[k] ? 'An' : 'Aus'}</button></div>`;
    return `<div class="ups"><div class="ucard"><div><b>Grafik</b><small>Hoch mit Leuchteffekten. Niedrig für ältere Geräte.</small></div><span class="seg">${[['low', 'Niedrig'], ['medium', 'Mittel'], ['high', 'Hoch']].map(([v, n]) => `<button class="btn${s.quality === v ? '' : ' ghost'}" data-set="quality" data-v="${v}">${n}</button>`).join('')}</span></div>
      ${tg('sound', 'Effekte', 'Waffen, Explosionen, Funk')}${tg('music', 'Musik', 'Der Marsch der Nova Squadron')}${tg('autofire', 'Auto-Feuer', 'Feuert selbst, sobald ein Ziel im Fadenkreuz liegt')}${tg('invertY', 'Höhenruder umkehren', 'Stick nach unten zieht die Nase hoch')}</div>
      <div class="keys"><h2 class="sec">Steuerung</h2><p><b>Tastatur und Maus:</b> Maus oder WASD steuern · Leertaste oder linke Maustaste feuert · Umschalt Schub · Q / E Ausweichrolle · F Nova-Welle · 1–5 oder Mausrad Waffe · Esc Pause</p><p><b>Touch:</b> linker Daumen steuert · rechts Feuer, Schub, Rolle, Nova · Waffe antippen zum Wechseln</p></div>`;
  }

  // ---- HUD ----
  function showGame(m) {
    screen.hidden = true; hud.hidden = false; touch.hidden = !api.isTouch; lastWeaponKey = ''; $('comms').classList.remove('show'); $('banner').classList.remove('show');
    $('boss').hidden = !(m.boss || m.id === 'm4'); $('convoy').hidden = !m.convoy; weaponChanged();
  }
  function weaponChanged() {
    const cur = api.getWeapon(), list = unlockedW(), key = cur + ':' + list.length; if (key === lastWeaponKey) return; lastWeaponKey = key;
    $('weapons').innerHTML = list.map((w, i) => `<button class="wchip${i === cur ? ' on' : ''}" data-w="${i}" style="--wc:rgb(${w.color.map((c) => Math.min(255, 70 + c * 60) | 0).join(',')})"><span>${i + 1}</span>${w.short}<em>∞</em></button>`).join('');
    $('weapons').querySelectorAll('[data-w]').forEach((b) => (b.onclick = () => api.act.setWeapon(+b.dataset.w)));
  }
  const set = (el, k, v) => { if (el[k] !== v) el[k] = v; };
  function hudUpdate({ P, G, remaining, outside }) {
    $('shield-fill').style.transform = `scaleX(${Math.max(0, P.shield / P.maxShield)})`; $('shield').classList.toggle('low', P.shield / P.maxShield < 0.3);
    $('nova-fill').style.transform = `scaleX(${P.nova / 100})`; $('nova').classList.toggle('ready', P.nova >= 100); $('t-nova').classList.toggle('ready', P.nova >= 100);
    set($('score'), 'textContent', fmt(G.stats.score)); set($('cr'), 'textContent', '+' + fmt(G.stats.credits));
    const cb = $('combo'); cb.hidden = G.combo < 2; set(cb, 'textContent', '×' + G.combo + ' Serie');
    const d = G.phaseDef; set($('obj'), 'textContent', d ? d.label : G.endT > 0 ? 'Einsatz erfüllt' : ''); const hint = d && (api.isTouch ? d.hintTouch : d.hint); set($('obj-n'), 'textContent', d && remaining ? (hint ? hint : 'Noch ' + remaining) : '');
    set($('spd'), 'textContent', String(Math.round(P.speed * 3.6)));
    set($('warn'), 'hidden', !outside);
    if (G.cap) { const c = G.cap.core; $('boss-fill').style.transform = `scaleX(${Math.max(0, c.hp / c.maxHp)})`; set($('boss-name'), 'textContent', (G.cap.dread ? 'Flaggschiff Monopol' : 'Kreuzer Rendite') + (c.shielded ? ' · Kern abgeschirmt' : ' · Kern')); }
    if (G.mission.convoy) { $('convoy-fill').style.transform = `scaleX(${G.stats.convoy})`; }
    weaponChanged();
    if (bannerT > 0 && (bannerT -= 0.06) <= 0) $('banner').classList.remove('show');
    if (commsT > 0 && (commsT -= 0.06) <= 0) $('comms').classList.remove('show');
  }
  function toast(t) { const el = $('toast'); el.textContent = t; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
  function banner(t, sub = '') { $('banner').innerHTML = `<b>${esc(t)}</b><small>${esc(sub)}</small>`; $('banner').classList.add('show'); bannerT = 2.6; }
  function comms(name, text) { $('comms').innerHTML = `<b>${esc(name)}</b><span>${esc(text)}</span>`; $('comms').classList.add('show'); commsT = 4.6; sfx.radio(); }
  function flash(type) { const f = $('flash'); f.className = ''; void f.offsetWidth; f.className = 'f-' + type; }

  function showPause(on) {
    if (!on) { screen.hidden = true; return; }
    screen.hidden = false; screen.className = 'screen pause';
    screen.innerHTML = `<div class="modal"><p class="eyebrow">Pause</p><h2>Einsatz angehalten</h2>
      <button class="btn big" id="p-res">Weiterfliegen</button><button class="btn ghost" id="p-quit">Einsatz beenden</button></div>`;
    $('p-res').onclick = () => { sfx.click(); api.resume(); }; $('p-quit').onclick = () => { sfx.click(); api.quit(); };
  }
  function showResult({ m, s, stars: st, bonus, won, newWeapon, newShip }) {
    hud.hidden = touch.hidden = true; screen.hidden = false; screen.className = 'screen pause';
    const mm = Math.floor(s.time / 60), ss = String(Math.floor(s.time % 60)).padStart(2, '0');
    const next = MISSIONS[MISSIONS.indexOf(m) + 1];
    screen.innerHTML = `<div class="modal result"><p class="eyebrow">${esc(m.place)}</p><h2>${m.endless ? `Welle ${s.wave - 1} überstanden` : m.id === 'm6' ? 'Essen gehört dem Handel' : 'Einsatz erfüllt'}</h2>
      ${m.endless ? '' : `<div class="bigstars">${stars(st)}</div>`}
      <dl class="rows"><dt>Abschüsse</dt><dd>${s.kills}</dd><dt>Punkte</dt><dd>${fmt(s.score)}</dd><dt>Flugzeit</dt><dd>${mm}:${ss}</dd><dt>Notschild gezündet</dt><dd>${s.respawns}×</dd>
      ${m.convoy ? `<dt>Konvoi</dt><dd>${Math.round(s.convoy * 100)} %</dd>` : ''}<dt>Abschussprämien</dt><dd>${fmt(s.credits)} Cr</dd><dt>Einsatzbonus</dt><dd>${fmt(bonus)} Cr</dd></dl>
      ${newWeapon ? `<p class="unlock">Neue Waffe: <b>${newWeapon.name}</b></p>` : ''}${newShip ? `<p class="unlock">Neues Schiff: <b>${newShip.name}</b></p>` : ''}
      ${m.id === 'm6' ? `<p class="unlock outro">${STORY.outro}</p>` : ''}
      ${next && won ? '<button class="btn big" id="r-next">Nächster Einsatz</button>' : ''}<button class="btn ${next && won ? 'ghost' : 'big'}" id="r-hangar">Zum Hangar</button></div>`;
    $('r-hangar').onclick = () => { sfx.click(); sel = next && won ? next : m; api.toHangar(); };
    if ($('r-next')) $('r-next').onclick = () => { sfx.click(); sel = next; api.start(next); };
  }

  // Touch-Tasten
  const hold = (id, fn) => { const b = $(id); const on = (e) => { e.preventDefault(); b.classList.add('down'); fn(true); }, off = (e) => { e.preventDefault(); b.classList.remove('down'); fn(false); }; b.addEventListener('touchstart', on, { passive: false }); b.addEventListener('touchend', off); b.addEventListener('touchcancel', off); b.addEventListener('mousedown', on); b.addEventListener('mouseup', off); b.addEventListener('mouseleave', () => { b.classList.remove('down'); fn(false); }); };
  hold('t-fire', api.act.fire); hold('t-boost', api.act.boost);
  const tap = (id, fn) => { const b = $(id); b.addEventListener('touchstart', (e) => { e.preventDefault(); fn(); }, { passive: false }); b.addEventListener('click', fn); };
  hold('t-brake', api.act.brake); tap('t-loop', () => api.act.maneuver('loop')); tap('t-turn', () => api.act.maneuver('turn'));
  tap('t-rl', () => api.act.roll(-1)); tap('t-rr', () => api.act.roll(1)); tap('t-nova', () => api.act.nova()); tap('nova', () => api.act.nova()); tap('b-pause', () => api.pause());

  return { toast, showTitle, showHangar, showGame, showPause, showResult, hud: hudUpdate, banner, comms, flash, weaponChanged };
}
