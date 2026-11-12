// Oberfläche: Titel, Hangar (Einsätze, Schiff, Upgrades, Einstellungen), HUD, Pause, Ergebnis.
import { WEAPONS, UPGRADES, SHIPS, MISSIONS, ENDLESS, STORY, COMICS, ENEMIES, upgradeCost } from './data.js';
import { sfx } from './audio.js';

const $ = (id) => document.getElementById(id);
const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}${extra}</svg>`;
// Symbole statt Schrift: Waffen und Touch-Tasten
const ICON = {
  laser: svg('<path d="M5 19 11 9M11 21l6-10"/><path d="M12 7l1.5-2.5M18 9l1.5-2.5" stroke-width="2.6"/>'),
  spread: svg('<path d="M12 21V4M12 21 4 7M12 21l8-14M12 21 7.5 5M12 21l4.5-16"/>'),
  missile: svg('<path d="M12 2c2.4 2.6 3 5.6 3 9v6H9v-6c0-3.4.6-6.4 3-9z"/><path d="M9 14l-3 4v2l3-1.6M15 14l3 4v2l-3-1.6M11 20.5 12 23l1-2.5"/>'),
  beam: svg('<path d="M3 12h18" stroke-width="3.4"/><path d="M3 7.5h4M3 16.5h4M17 7.5h4M17 16.5h4"/>'),
  orb: svg('<circle cx="12" cy="12" r="4.6"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>'),
  wing: svg('<path d="M12 3l2 7 7 5v2l-7-2-.6 4 2.100 1.600V22l-3.500-1-3.500 1v-1.400l2.100-1.600L10 15l-7 2v-2l7-5z"/>'),
  shield: svg('<path d="M12 2.500l8 3v6c0 5-3.400 8.600-8 10-4.600-1.400-8-5-8-10v-6z"/><path d="M9 12l2.200 2.200L15.500 10"/>'),
  chain: svg('<path d="M13 2 5 13h5l-1.500 9L18 10h-5.500z"/>'),
  shrap: svg('<circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.600 5.600l2.800 2.800M15.600 15.600l2.800 2.800M18.400 5.600l-2.800 2.800M8.400 15.600l-2.800 2.800"/>'),
  fire: svg('<circle cx="12" cy="12" r="6.5"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>', '<circle cx="12" cy="12" r="1.3" fill="currentColor"/>'),
  boost: svg('<path d="M5 13l7-7 7 7M5 19l7-7 7 7"/>'), brake: svg('<path d="M5 5l7 7 7-7M5 11l7 7 7-7"/>'),
  roll: svg('<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20.5 3.5v4.2h-4.2"/>'),
  loop: svg('<path d="M3 18h6.5c4.6 0 8-2.9 8-6.6A4.6 4.6 0 0 0 12.8 7C10.300 7 8.500 8.800 8.500 11.200c0 3.800 3.800 6.800 8.500 6.800h4"/>'),
  turn: svg('<path d="M7 21V9.500a5 5 0 0 1 10 0V17"/><path d="M13 13.500l4 4 4-4"/>'),
  pause: svg('<path d="M8.500 5v14M15.500 5v14" stroke-width="3"/>'),
  full: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  nova: svg('<circle cx="12" cy="12" r="2.200" fill="currentColor"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="10" stroke-dasharray="3 3.200"/>'),
};
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
    $('b-start').onclick = () => { api.audio(); sfx.click(); if (save.seenIntro) api.toHangar(); else showIntro(); };
  }

  // Story-Einstieg: drei Karten, danach geht es in den Hangar mit der Flugschule als erstem Einsatz
  // Comic zum Durchklicken: ein Bild nach dem anderen, Sprechblasen ploppen einzeln auf. Tippen, Klick, Leertaste oder Pfeil = weiter.
  const asset = (n) => globalThis.NOVA_ASSETS?.[n] || `./assets/${n}.jpg`;
  let comicNext = null;
  function showComic(panels, title, onDone, m) {
    if (!panels || !panels.length) return onDone(); hud.hidden = touch.hidden = true; screen.hidden = false; screen.className = 'screen comic'; api.showcase(null);
    const total = panels.length + (m ? 1 : 0), who = [...new Set(panels.flatMap((p) => p.lines.map((l) => l[0])))]; let i = 0, j = 0;
    const foes = m && m.phases ? [...new Set(m.phases.flatMap((p) => (p.spawn || []).map(([k]) => ({ cruiser: 'Kreuzer Rendite', dread: 'Flaggschiff Monopol', target: 'Übungsziele' }[k] || ENEMIES[k]?.name)).filter(Boolean)))] : [];
    screen.innerHTML = `<div class="cv"><header class="cvh"><h2 class="ctitle">${esc(title)}</h2><button class="btn ghost" id="c-skip">${m ? 'Zum Ziel' : 'Überspringen'}</button></header><div class="cstage" id="c-stage"></div>
      <footer class="cvf"><div class="cdots" id="c-dots"></div><span class="chint">${api.isTouch ? 'Tippen: weiter' : 'Klick oder Leertaste: weiter'}</span></footer></div>`;
    const stage = $('c-stage'), finish = () => { comicNext = null; onDone(); };
    const bubbles = (p, upto, pop) => p.lines.slice(0, upto + 1).map((l, k) => `<div class="bubble b${who.indexOf(l[0]) % 2}${k === upto && pop ? ' pop' : ''}"><b>${esc(l[0])}</b>${esc(l[1])}</div>`).join('');
    const draw = (enter) => {
      $('c-dots').innerHTML = Array.from({ length: total }, (_, k) => `<i class="${k < i ? 'on' : k === i ? 'cur' : ''}"></i>`).join('');
      if (i >= panels.length) {   // letzte Seite vor dem Einsatz: das Ziel
        stage.innerHTML = `<div class="cpanel cgoal big enter"><span class="burst">Dein Ziel</span><b>${esc(m.aim)}</b><p>${esc(m.why)}</p>${foes.length ? `<p class="foes"><i>Gegner</i> ${foes.map(esc).join(' · ')}</p>` : ''}<div class="row"><button class="btn big" id="c-go">Einsatz starten</button><button class="btn ghost dark" id="c-back">Zurück zum Hangar</button></div></div>`;
        $('c-go').onclick = (e) => { e.stopPropagation(); sfx.click(); finish(); }; $('c-back').onclick = (e) => { e.stopPropagation(); sfx.click(); comicNext = null; api.toHangar(); }; $('c-skip').hidden = true; return;
      }
      const p = panels[i];
      if (enter) { stage.innerHTML = `<figure class="cpanel big enter t${i % 2}"><img src="${asset(p.img)}" alt=""><figcaption class="ccap">${esc(p.cap)}</figcaption>${p.fx ? `<span class="cfx">${esc(p.fx)}</span>` : ''}<div class="cbubs" id="c-bubs">${bubbles(p, 0, true)}</div></figure>`; const nx = panels[i + 1]; if (nx) new Image().src = asset(nx.img); }
      else $('c-bubs').innerHTML = bubbles(p, j, true);
    };
    comicNext = () => { const p = panels[i]; if (p && j < p.lines.length - 1) { j++; sfx.click(); draw(false); } else if (i < total - 1) { i++; j = 0; sfx.roll(); draw(true); } else if (!m) { sfx.click(); finish(); } };
    stage.onclick = () => comicNext && comicNext(); $('c-skip').onclick = () => { sfx.click(); if (m) { i = panels.length; j = 0; draw(true); } else finish(); };
    draw(true);
  }
  addEventListener('keydown', (e) => { if (comicNext && !screen.hidden && screen.classList.contains('comic') && ['Space', 'Enter', 'ArrowRight'].includes(e.code)) { e.preventDefault(); comicNext(); } });
  const startStory = (m) => (m.endless || !COMICS[m.id] ? api.start(m) : showComic(COMICS[m.id].pre, COMICS[m.id].title, () => api.start(m), m));
  function showIntro() { showComic(COMICS.intro.pre, COMICS.intro.title, () => { save.seenIntro = true; api.persist(); api.toHangar(); }); }

  function showHangar() {
    hud.hidden = touch.hidden = true; screen.hidden = false; screen.className = 'screen hangar' + (tab === 'ship' ? ' view' : ''); api.showcase(tab === 'ship' ? save.ship : null);
    if (!sel) sel = save.done.m0 ? ENDLESS : MISSIONS[0];
    const tabs = [['missions', 'Spielen'], ['ship', 'Schiff & Waffen'], ['upgrades', 'Upgrades'], ['settings', 'Einstellungen']];
    screen.innerHTML = `<header class="bar"><div class="brand">NOVA SQUADRON</div>
      <div class="credits"><span>Credits</span><b>${fmt(save.credits)}</b><button class="ibtn" id="b-full" aria-label="Vollbild" title="Vollbild">${ICON.full}</button></div></header>
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
      const k = b.dataset.set; if (k === 'quality') { save.set.quality = b.dataset.v; api.quality(); } else if (k === 'pace') { save.set.pace = +b.dataset.v; api.settings(); } else { save.set[k] = !save.set[k]; api.settings(); } sfx.click(); showHangar();
    }));
    const go = $('b-go'); if (go) go.onclick = () => { sfx.click(); startStory(sel); };
    $('b-full').onclick = () => api.fullscreen();
  }
  function missions() {
    const cards = MISSIONS.map((m, i) => {
      const open = missionOpen(i), st = save.done[m.id] || 0;
      return `<button class="mcard${sel === m ? ' on' : ''}${open ? '' : ' locked'}" data-m="${i}" ${open ? '' : 'disabled'}>
        <span class="num">${i + 1}</span><span class="mt"><b>${esc(m.name)}</b><small>${open ? esc(m.place) : 'Gesperrt · vorherigen Einsatz abschließen'}</small></span>${open ? stars(st) : '<span class="lock">▣</span>'}</button>`;
    }).join('');
    const eOpen = true;
    const endless = `<button class="mcard endless${sel === ENDLESS ? ' on' : ''}${eOpen ? '' : ' locked'}" data-m="endless" ${eOpen ? '' : 'disabled'}><span class="num">∞</span><span class="mt"><b>${ENDLESS.name}</b><small>${save.bestWave ? `Rekord: Welle ${save.bestWave}` : 'Wellen, Upgrades, Bosse'}</small></span></button>`;
    const m = sel, i = m.n, w = WEAPONS.find((x) => x.unlock > 0 && x.unlock === i), s = SHIPS.find((x) => x.unlock > 0 && x.unlock === i);
    const reward = m.endless ? 'Nach jeder Welle eines von zwei Upgrades · nach jedem Boss ein Sonder-Upgrade · Credits je Welle' : [w && !save.done[m.id] ? `Neue Waffe: ${w.name}` : '', s && !save.done[m.id] ? `Neues Schiff: ${s.name}` : '', `${fmt(m.tutorial ? (save.done[m.id] ? 100 : 500) : 500 * i * (save.done[m.id] ? 1 : 2))} Credits`].filter(Boolean).join(' · ');
    return `<div class="mgrid"><div class="mlist"><p class="listh">Hauptspiel</p>${endless}<p class="listh">Story · Der Krieg um Essen</p>${cards}</div>
      <section class="brief"><p class="eyebrow">${m.endless ? 'Dauergefecht' : `Kapitel ${MISSIONS.indexOf(m) + 1} von ${MISSIONS.length}`} · ${esc(m.place)}</p><h2>${esc(m.name)}</h2><p>${esc(m.brief)}</p>
      <p class="reward aim"><span>Dein Ziel</span> ${esc(m.aim || '')}</p><p class="reward"><span>Warum</span> ${esc(m.why || '')}</p>
      ${m.phases ? `<p class="reward"><span>Meilensteine</span></p><ol class="phases">${m.phases.map((p) => `<li>${esc(p.label)}</li>`).join('')}</ol>` : ''}
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
      ${tg('sound', 'Effekte', 'Waffen, Explosionen, Funk')}${tg('music', 'Musik', 'Eigene Filmmusik: Hörner, Streicher, Taikos')}${tg('autofire', 'Auto-Feuer', 'Feuert selbst, sobald ein Ziel im Fadenkreuz liegt')}<div class="ucard"><div><b>Spieltempo</b><small>Wie schnell alles abläuft. Dein Schub bleibt immer stark.</small></div><span class="seg">${[[0.75, 'Ruhig'], [0.88, 'Normal'], [1, 'Schnell']].map(([v, n]) => `<button class="btn${s.pace === v ? '' : ' ghost'}" data-set="pace" data-v="${v}">${n}</button>`).join('')}</span></div>${tg('invertY', 'Höhenruder umkehren', 'Stick nach unten zieht die Nase hoch')}</div>
      <div class="keys"><h2 class="sec">Musik</h2><p>Gefecht: „Imminent Threat“ von Matthew Pablo (matthewpablo.com), Lizenz CC BY 3.0. Hangar: „Dark Orchestra“ von szegvari, Lizenz CC0. Beide aus dem quelloffenen Spiel Naev. Fanfare und Ersatzmusik: eigens für dieses Spiel.</p></div>
      <div class="keys"><h2 class="sec">Steuerung</h2><p><b>Tastatur und Maus:</b> Maus oder WASD steuern · Leertaste oder linke Maustaste feuert · Umschalt Schub · Q / E Ausweichrolle · F Nova-Welle · 1–5 oder Mausrad Waffe · Esc Pause</p><p><b>Touch:</b> linker Daumen steuert · rechts Feuer, Schub, Rolle, Nova · Waffe antippen zum Wechseln</p></div>`;
  }

  // ---- HUD ----
  let pipsTotal = 0, goalT = 0;
  function pips(done) { $('pips').innerHTML = pipsTotal ? Array.from({ length: pipsTotal }, (_, i) => `<i class="${i < done ? 'on' : i === done ? 'cur' : ''}"></i>`).join('') : ''; }
  function milestone(n, total, bonus) { pips(n); goalT = 0; $('goal').classList.remove('show'); banner(total ? `MEILENSTEIN ${n} VON ${total} ERREICHT` : `WELLE ${n} ÜBERSTANDEN`, `+${fmt(bonus)} Credits`); }
  function showGame(m, total = 0) {
    pipsTotal = total; pips(0); const gc = $('goal'); gc.innerHTML = `<em>${esc(m.name)} · ${esc(m.place)}</em><span>Dein Ziel</span><b>${esc(m.aim || m.name)}</b><p>${esc(m.why || '')}</p><small>${total ? total + ' Meilensteine' : 'Ohne Ende'} · Leben ∞ · Munition ∞</small>`; if (m.waves) { gc.classList.add('show'); goalT = 3.5; } else { gc.classList.remove('show'); goalT = 0; banner(m.name.toUpperCase(), m.aim); }   // Story: das Ziel stand schon im Comic
    screen.hidden = true; hud.hidden = false; touch.hidden = !api.isTouch; lastWeaponKey = ''; $('comms').classList.remove('show'); $('banner').classList.remove('show');
    $('boss').hidden = true; $('convoy').hidden = !m.convoy; weaponChanged(true);
  }
  function weaponChanged(force) {
    const cur = api.getWeapon(), list = WEAPONS.map((w, i) => i).filter((i) => api.weaponOpen(i)), jam = api.getJam(), over = api.getOver(), key = cur + ':' + list.join('') + ':' + jam + ':' + over; if (key === lastWeaponKey && !force) return; lastWeaponKey = key;
    $('weapons').innerHTML = list.length < 2 ? '' : list.map((i) => { const w = WEAPONS[i]; return `<button class="wchip${i === cur ? ' on' : ''}${i === jam ? ' jam' : ''}${over[i] === '1' ? ' hot' : ''}" data-w="${i}" aria-label="${w.name}" title="${w.name}" style="--wc:rgb(${w.color.map((c) => Math.min(255, 70 + c * 60) | 0).join(',')})">${ICON[w.id]}<span>${i + 1}</span></button>`; }).join('');
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
    set($('boss'), 'hidden', !(G.cap && !G.cap.dead));
    if (G.cap) { const c = G.cap.core; $('boss-fill').style.transform = `scaleX(${Math.max(0, c.hp / c.maxHp)})`; set($('boss-name'), 'textContent', (G.cap.dread ? 'Flaggschiff Monopol' : 'Kreuzer Rendite') + (c.shielded ? ' · Kern abgeschirmt' : ' · Kern')); }
    if (G.mission.convoy) { $('convoy-fill').style.transform = `scaleX(${G.stats.convoy})`; }
    weaponChanged();
    if (goalT > 0 && (goalT -= 0.06) <= 0) $('goal').classList.remove('show');
    $('spd').parentNode.classList.toggle('stun', P.stun > 0.25);
    if (bannerT > 0 && (bannerT -= 0.06) <= 0) $('banner').classList.remove('show');
    if (commsT > 0 && (commsT -= 0.06) <= 0) $('comms').classList.remove('show');
  }
  function toastMenu(t) { const el = $('mtoast'); el.textContent = t; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
  function toast(t) { const el = $('toast'); el.textContent = t; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
  function banner(t, sub = '') { $('banner').innerHTML = `<b>${esc(t)}</b><small>${esc(sub)}</small>`; $('banner').classList.add('show'); bannerT = 2.6; }
  function comms(name, text) { $('comms').innerHTML = `<b>${esc(name)}</b><span>${esc(text)}</span>`; $('comms').classList.add('show'); commsT = 4.6; sfx.radio(); }
  function flash(type) { const f = $('flash'); f.className = ''; void f.offsetWidth; f.className = 'f-' + type; }

  // Upgrade-Auswahl nach jeder Welle: zwei Karten, antippen oder Taste 1 / 2
  let choiceCb = null;
  function showChoice({ boss, wave, opts }, cb) {
    const el = $('choice'); choiceCb = cb; el.hidden = false; goalT = 0; bannerT = 0; $('goal').classList.remove('show'); $('banner').classList.remove('show'); el.className = boss ? 'boss' : '';
    el.innerHTML = `<p class="eyebrow">${boss ? 'Boss besiegt · Sonder-Upgrade' : `Welle ${wave} geschafft`}</p><h2>${boss ? 'Wähle deine Belohnung' : 'Wähle ein Upgrade'}</h2><div class="cards">${opts.map((o, i) => `<button class="ccard" data-c="${i}">${ICON[o.icon] || ICON.orb}<b>${esc(o.name)}</b><span>${esc(o.desc)}</span>${o.max ? `<i class="pips">${Array.from({ length: o.max }, (_, k) => `<i class="${k < o.lvl ? 'on' : k === o.lvl ? 'new' : ''}"></i>`).join('')}</i>` : '<i class="once">Einmalig</i>'}<em>${i + 1}</em></button>`).join('')}</div>`;
    el.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { const c = choiceCb; choiceCb = null; if (c) c(opts[+b.dataset.c]); }));
  }
  function hideChoice() { $('choice').hidden = true; choiceCb = null; }
  addEventListener('keydown', (e) => { if (!choiceCb) return; const b = $('choice').querySelector(`[data-c="${e.code === 'Digit1' ? 0 : e.code === 'Digit2' ? 1 : -1}"]`); if (b) b.click(); });
  function showPause(on) {
    if (!on) { screen.hidden = true; return; }
    screen.hidden = false; screen.className = 'screen pause';
    screen.innerHTML = `<div class="modal"><p class="eyebrow">Pause</p><h2>Einsatz angehalten</h2>
      <button class="btn big" id="p-res">Weiterfliegen</button><button class="btn ghost" id="p-full">Vollbild an / aus</button><button class="btn ghost" id="p-quit">Einsatz beenden</button></div>`;
    $('p-res').onclick = () => { sfx.click(); api.resume(); }; $('p-full').onclick = () => api.fullscreen(); $('p-quit').onclick = () => { sfx.click(); api.quit(); };
  }
  let outroSeen = false;
  function showResult(r) {
    const { m, s, stars: st, bonus, won, newWeapon, newShip } = r;
    if (won && !m.endless && COMICS[m.id]?.post && !r.postSeen) { r.postSeen = true; return showComic(COMICS[m.id].post, COMICS[m.id].title, () => showResult(r)); }   // erst die Siegesszene, dann die Abrechnung
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
    if ($('r-next')) $('r-next').onclick = () => { sfx.click(); sel = next; startStory(next); };
  }

  // Touch-Tasten
  const hold = (id, fn) => { const b = $(id); const on = (e) => { e.preventDefault(); b.classList.add('down'); fn(true); }, off = (e) => { e.preventDefault(); b.classList.remove('down'); fn(false); }; b.addEventListener('touchstart', on, { passive: false }); b.addEventListener('touchend', off); b.addEventListener('touchcancel', off); b.addEventListener('mousedown', on); b.addEventListener('mouseup', off); b.addEventListener('mouseleave', () => { b.classList.remove('down'); fn(false); }); };
  hold('t-fire', api.act.fire); hold('t-boost', api.act.boost);
  const tap = (id, fn) => { const b = $(id); b.addEventListener('touchstart', (e) => { e.preventDefault(); fn(); }, { passive: false }); b.addEventListener('click', fn); };
  hold('t-brake', api.act.brake); tap('t-loop', () => api.act.maneuver('loop')); tap('t-turn', () => api.act.maneuver('turn'));
  tap('t-rr', () => api.act.rollAuto()); tap('goal', () => { goalT = 0.01; });
  for (const [id, ic] of [['t-fire', 'fire'], ['t-boost', 'boost'], ['t-brake', 'brake'], ['t-rr', 'roll'], ['t-loop', 'loop'], ['t-turn', 'turn'], ['t-nova', 'nova']]) $(id).innerHTML = ICON[ic]; $('b-pause').innerHTML = ICON.pause; tap('t-nova', () => api.act.nova()); tap('nova', () => api.act.nova()); tap('b-pause', () => api.pause());

  return { toastMenu, showChoice, hideChoice, milestone, toast, showTitle, showHangar, showGame, showPause, showResult, hud: hudUpdate, banner, comms, flash, weaponChanged };
}
