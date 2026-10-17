/**
 * What the map of Greece says: the rulers' portraits, the labels over the
 * cities, the hover card, and each city's panel (who rules it, how they feel
 * about you and why, what it sells and buys and at what price). Loaded with
 * the map, the first time it opens.
 */
import { PLACES, RULED, type CityId } from '../map/greece';
import { hash2 } from '../map/noise';
import { dateOfTick, formatDate, TICKS_PER_DAY } from '../sim/clock';
import { WARE_NAMES } from '../sim/foods';
import type { Ruler, SimState, WorldCity } from '../sim/state';
import { cityHolds, PRICES, SAIL_IN, shipNews, TRADE_GOODS } from '../sim/trade';
import { cityOf, MOOD_WORDS, moodOf, moodReasons, moodWord, NAME_MAX, nameRefusal, sellsAndBuys, TRAIT_WORDS, tyreShip, type MoodWord } from '../sim/world';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const cap = (t: string): string => `${t[0].toUpperCase()}${t.slice(1)}`;
/** A mood's number with its sign, the minus a true one as in the reasons: "+5", "−10", "0". */
const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
/** The trade goods' colours, as in the trade panel. */
const SWATCH = ['#a8874f', '#b5524a', '#f3d874', '#8aa83a', '#eee2c0', '#7a2e80'];

const SKIN = ['#efcfa8', '#e2b48a', '#cf9b72', '#b5805a', '#9a6a48'];
const HAIR = ['#2e2119', '#4a3020', '#6b4628', '#8a6a44', '#24201d', '#a59a8c'];

/** Where on the scale from hostile (0) to devoted (5) a mood word is. */
const level = (w: MoodWord): number => MOOD_WORDS.indexOf(w);

/** A small face for a mood: frowning to beaming. */
export function moodFace(w: MoodWord, size = 18): string {
  const l = level(w);
  const fill = ['#e7a08a', '#eab894', '#f0cf9c', '#f5dfa4', '#eedd8e', '#e4d77a'][l];
  const mouth = ['M7.4 16.8q4.6-3.6 9.2 0', 'M7.8 16.4q4.2-2 8.4 0', 'M8 15.6h8', 'M7.8 14.8q4.2 2 8.4 0', 'M7.4 14.4q4.6 3.4 9.2 0', 'M7 13.8q5 4.6 10 0'][l];
  const brows = l <= 1 ? '<path d="M6.6 8.2l3.6 1.4M17.4 8.2l-3.6 1.4" stroke="#4a3420" stroke-width="1.3" stroke-linecap="round"/>' : l >= 4 ? '<path d="M6.8 8.4q1.8-1.4 3.6 0M13.6 8.4q1.8-1.4 3.6 0" fill="none" stroke="#4a3420" stroke-width="1.1" stroke-linecap="round"/>' : '';
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" class="mface" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="${fill}" stroke="#4a3420" stroke-width="1.2"/><circle cx="8.8" cy="11" r="1.2" fill="#4a3420"/><circle cx="15.2" cy="11" r="1.2" fill="#4a3420"/>${brows}<path d="${mouth}" fill="none" stroke="#4a3420" stroke-width="1.5" stroke-linecap="round"/></svg>`;
}

/**
 * A ruler's portrait: a bust in a medallion in their city's colour, drawn
 * from their face seed (skin, hair, the shape of the face, a beard or not)
 * and traits (a crested helm for a warlike ruler, a gold diadem for a proud
 * or greedy one, a laurel wreath for a pious one), the brows and mouth set by
 * their mood.
 */
export function portrait(r: Ruler, colour: string, mood: MoodWord, size = 96): string {
  const f = r.face;
  const pick = <T,>(xs: readonly T[], k: number): T => xs[Math.floor(hash2(f, k, 0x9a) * xs.length)];
  const skin = pick(SKIN, 1);
  const old = hash2(f, 2, 0x9a) < 0.3;
  const hair = old ? HAIR[5] : pick(HAIR.slice(0, 5), 3);
  const rx = 15 + hash2(f, 4, 0x9a) * 3;
  const ry = 19 + hash2(f, 5, 0x9a) * 3;
  const beard = !r.female && hash2(f, 6, 0x9a) < 0.85;
  const helm = r.traits.includes('warlike');
  const diadem = !helm && (r.traits.includes('proud') || r.traits.includes('greedy'));
  const laurel = !helm && !diadem && r.traits.includes('pious');
  const l = level(mood);
  const cy = 46;
  const eyeY = cy - 1;
  const browTilt = [3.2, 2.2, 0.8, 0, -0.8, -1.4][l];
  const mouthY = cy + 10.5;
  const curve = [-3.2, -1.8, -0.4, 1.2, 2.6, 3.6][l];
  const parts: string[] = [];
  // The medallion and the shoulders, in the city's colour, with a gold brooch.
  parts.push(`<circle cx="50" cy="50" r="47" fill="#fbf2dd" stroke="${colour}" stroke-width="4"/>`);
  parts.push(`<clipPath id="pc${f}"><circle cx="50" cy="50" r="45"/></clipPath><g clip-path="url(#pc${f})">`);
  parts.push(`<path d="M50 40c-9 0-17 4-21 12" fill="none"/>`);
  if (r.female) parts.push(`<path d="M${50 - rx - 5} ${cy - 4}q-3 26 4 36h${2 * rx + 2}q7-10 4-36z" fill="${hair}"/>`);
  parts.push(`<path d="M12 104c2-22 16-32 38-32s36 10 38 32z" fill="${colour}"/>`);
  parts.push(`<path d="M30 80q20 12 40 0" fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="2"/>`);
  parts.push(`<circle cx="${r.female ? 64 : 36}" cy="82" r="3" fill="#e2b84a" stroke="#8a6420" stroke-width="0.8"/>`);
  parts.push(`<rect x="44" y="${cy + 14}" width="12" height="14" rx="3" fill="${skin}"/>`);
  // The head.
  parts.push(`<ellipse cx="50" cy="${cy}" rx="${rx}" ry="${ry}" fill="${skin}" stroke="rgba(80,50,30,0.35)" stroke-width="0.8"/>`);
  if (beard) parts.push(`<path d="M${50 - rx + 1} ${cy + 1}q2 ${ry + 6} ${rx - 1} ${ry + 6}q${rx - 1} 0 ${rx - 1} -${ry + 6}q-3 9 -${rx - 1} 10q-${rx - 4} -1 -${rx - 1} -10z" fill="${hair}"/>`);
  // Hair on top (under a helm it doesn't show).
  if (!helm) parts.push(`<path d="M${50 - rx - 1} ${cy - 2}q1-${ry + 4} ${rx + 1} -${ry + 3}q${rx + 1} -1 ${rx + 1} ${ry + 3}q-6-9-${rx + 1}-10q-${rx - 6} 1-${rx + 1} 10z" fill="${hair}"/>`);
  // Eyes, brows, nose and mouth.
  parts.push(`<ellipse cx="${50 - rx * 0.4}" cy="${eyeY}" rx="2" ry="1.5" fill="#3a2a1c"/><ellipse cx="${50 + rx * 0.4}" cy="${eyeY}" rx="2" ry="1.5" fill="#3a2a1c"/>`);
  parts.push(`<path d="M${50 - rx * 0.62} ${eyeY - 5 - browTilt}L${50 - rx * 0.18} ${eyeY - 5 + browTilt}M${50 + rx * 0.62} ${eyeY - 5 - browTilt}L${50 + rx * 0.18} ${eyeY - 5 + browTilt}" stroke="${old ? '#8a8078' : '#3a2a1c'}" stroke-width="1.8" stroke-linecap="round"/>`);
  parts.push(`<path d="M50 ${eyeY + 1}l-1.6 7h3.2" fill="none" stroke="rgba(90,55,35,0.55)" stroke-width="1.2" stroke-linejoin="round"/>`);
  parts.push(`<path d="M44 ${mouthY}q6 ${curve} 12 0" fill="none" stroke="${beard ? '#f4e6d0' : '#8a3a2a'}" stroke-width="1.8" stroke-linecap="round"/>`);
  if (helm) {
    // A Corinthian helm, bronze, with a crest of horsehair in the city's colour.
    parts.push(`<path d="M${50 - rx - 3} ${cy + 6}q-1-${ry + 12} ${rx + 3}-${ry + 12}q${rx + 4} 0 ${rx + 3} ${ry + 12}l-4 0q0-8-4-10h-${2 * rx - 14}q-4 2-4 10z" fill="#c08a3c" stroke="#7a5420" stroke-width="1"/>`);
    parts.push(`<path d="M${50 - rx - 6} ${cy - ry - 2}q${rx + 6}-18 ${2 * rx + 12} 0q-${rx + 6}-8-${2 * rx + 12} 0z" fill="${colour}" stroke="rgba(0,0,0,0.25)" stroke-width="0.8"/>`);
  }
  if (diadem) parts.push(`<path d="M${50 - rx + 1} ${cy - ry + 7}l4-7 4 5 4-8 4 8 4-5 4 7z" fill="#e8c04a" stroke="#8a6420" stroke-width="0.9"/>`);
  if (laurel) {
    const leaves: string[] = [];
    for (let k = 0; k < 7; k++) {
      const a = Math.PI * (0.15 + (k / 6) * 0.7);
      const x = 50 + Math.cos(Math.PI - a) * (rx + 1);
      const y = cy - 6 - Math.sin(a) * (ry - 3);
      leaves.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="3.4" ry="1.7" transform="rotate(${((a * 180) / Math.PI - 90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="#6f8f3c"/>`);
    }
    parts.push(leaves.join(''));
  }
  if (r.female && !helm && !diadem && !laurel) parts.push(`<path d="M${50 - rx + 2} ${cy - ry + 8}q${rx - 2}-6 ${2 * rx - 4} 0" fill="none" stroke="#e8c04a" stroke-width="2"/>`);
  parts.push('</g>');
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" class="portrait" aria-hidden="true">${parts.join('')}</svg>`;
}

/** "since the founding", "since March, 748 BC". */
const since = (tick: number): string => (tick <= 0 ? 'since the founding' : `since ${formatDate(dateOfTick(tick))}`);

/** What a ruled city's label shows: its name and the ruler's mood face. */
export function labelHtml(s: SimState, id: CityId): string {
  const c = cityOf(s.world, id);
  const name = id === 'home' ? s.world.name : PLACES[id].name;
  if (!c.ruler) return `<b>${esc(name)}</b>${id === 'home' ? '<span class="you">you</span>' : ''}`;
  return `<b>${esc(name)}</b>${moodFace(moodWord(moodOf(c, s.tick)), 15)}`;
}

/** The card under the pointer over a city (or the Tyre ship). */
export function hoverHtml(s: SimState, id: CityId | 'ship'): string {
  if (id === 'ship') {
    const t = tyreShip(s, s.tick);
    const news = shipNews(s);
    const where = t.where === 'tyre' ? 'In port at Tyre' : t.where === 'sea' ? (t.homeward ? 'Sailing home to Tyre' : 'Sailing to your city from Tyre') : (news?.line ?? 'In your bay');
    return `<b>The merchant ship from Tyre</b><span>${esc(where)}</span><span class="sub">She is the ship your trading post sees: her sail on your horizon is this sail</span>`;
  }
  const c = cityOf(s.world, id);
  if (id === 'home') return `<b>${esc(s.world.name)}</b><span>Your city · ${fmt(s.population)} people</span><span class="sub">Click to see your city’s page</span>`;
  if (!c.ruler) return `<b>${PLACES[id].name}</b><span>${esc(cap(PLACES[id].blurb))}</span><span class="sub">Click for what its merchants buy</span>`;
  const m = moodOf(c, s.tick);
  const w = moodWord(m);
  return `${portrait(c.ruler, PLACES[id].colour, w, 64)}<div><b>${esc(PLACES[id].name)}</b><span>${esc(c.ruler.title.replace(/ of .*/, ''))} ${esc(c.ruler.name)} · ${c.ruler.traits.join(', ')}</span><span class="mood">${moodFace(w, 16)} ${cap(w)} towards you (${signed(m)})</span><span class="sub">Click to meet them</span></div>`;
}

const goodRow = (k: number, price: string, title: string): string =>
  `<li title="${esc(title)}"><i style="background:${SWATCH[k]}"></i><span class="g">${cap(WARE_NAMES[TRADE_GOODS[k]])}</span><span class="p">${price}</span></li>`;

/** The goods a city sells and buys, at what price, against Tyre's. */
function goodsBlock(c: WorldCity, name: string): string {
  const { sells, buys } = sellsAndBuys(c);
  const row = (k: number, buying: boolean): string => {
    const p = c.price[k];
    const t = PRICES[k];
    const d = Math.round(((p - t) / t) * 100);
    const vs = d === 0 ? 'as Tyre' : `Tyre ${t}`;
    const title = buying
      ? `${name} is short of ${WARE_NAMES[TRADE_GOODS[k]]}: makes about ${fmt(c.make[k])} a year and uses about ${fmt(c.need[k])}, so it pays ${p} dr for 100 (the Tyre ship pays ${t})`
      : `${name} makes plenty of ${WARE_NAMES[TRADE_GOODS[k]]}: about ${fmt(c.make[k])} a year and uses about ${fmt(c.need[k])}, so it asks ${p} dr for 100 (the Tyre ship pays ${t})`;
    return goodRow(k, `<b>${p}</b> dr <em>${vs}</em>`, title);
  };
  return `<div class="trade2"><section><h3>${esc(name)} sells</h3><ul class="goodlist">${sells.map((k) => row(k, false)).join('') || '<li class="none">Nothing to spare</li>'}</ul></section><section><h3>${esc(name)} buys</h3><ul class="goodlist">${buys.map((k) => row(k, true)).join('') || '<li class="none">Nothing it lacks</li>'}</ul></section></div><p class="foot">Prices are per 100 and steady for now. Cheap where it has plenty, dear where it is short.</p>`;
}

/** How a city is reached from yours. */
const REACH: Partial<Record<CityId, string>> = {
  athens: 'By sea, out of the gulf and up the Saronic Gulf to the Piraeus.',
  sparta: 'By road only, over the hills by Tegea and down the Eurotas valley.',
  corinth: 'By road through Nemea, or by sea to its eastern harbour.',
  troy: 'By sea only, the long way through the islands and up the Aegean.',
  tyre: 'By sea, far to the south-east: its merchant ship comes to your trading post.',
};

/** A city's panel. `renaming` shows your city's name as a text box. */
export function panelHtml(s: SimState, id: CityId, renaming: boolean, nameDraft: string): string {
  const c = cityOf(s.world, id);
  const place = PLACES[id];
  if (id === 'home') {
    const homes = s.buildings.filter((b) => b.kind === 'home' && b.people > 0).length;
    const why = renaming ? nameRefusal(nameDraft) : '';
    const name = renaming
      ? `<form class="rename"><input name="cityname" maxlength="${NAME_MAX}" value="${esc(nameDraft)}" aria-label="Your city’s name" autocomplete="off" spellcheck="false"><button type="submit" class="ok"${why ? ' disabled' : ''}>Name it</button><button type="button" class="cancel">Cancel</button></form>${why && nameDraft.trim() ? `<div class="why">${esc(why)}</div>` : ''}`
      : `<h2>${esc(s.world.name)} <button class="renamebtn" title="Rename your city" aria-label="Rename your city">✎</button></h2>`;
    const stores = TRADE_GOODS.map((w, k) => goodRow(k, `${fmt(cityHolds(s, w))}${s.trade.sell[k] ? ' <em>for sale</em>' : ''}`, `Your ${k < 3 ? 'granaries' : 'storehouses'} hold ${fmt(cityHolds(s, w))} ${WARE_NAMES[w]}${s.trade.sell[k] ? ', and it is ticked for sale to the Tyre ship' : ''}`)).join('');
    return `<header><div class="kicker">Your city · ${esc(place.blurb.replace('your city, ', ''))}</div>${name}<div class="from">${fmt(s.population)} people in ${fmt(homes)} homes</div></header>
<section><h3>In your stores</h3><ul class="goodlist">${stores}</ul></section>
<p class="foot">Between Corinth to the north, by road, and Sparta over the hills to the south-west; the sea lanes run out of the gulf to Athens, Troy and Tyre.</p>`;
  }
  if (!c.ruler) {
    const t = tyreShip(s, s.tick);
    const news = shipNews(s);
    const where = t.where === 'tyre' ? (news ? `In port at Tyre. ${news.line}.` : 'In port at Tyre: she will call once you build a trading post on your bay shore.') : t.where === 'sea' ? (t.homeward ? `Sailing home to Tyre${news ? `. ${news.line}` : ''}.` : `Sailing to your city: her sail shows on your horizon in ${Math.max(1, Math.ceil((s.trade.ship.due - SAIL_IN - s.tick) / TICKS_PER_DAY))} days.`) : `${news?.line ?? 'In your bay'}.`;
    const all = TRADE_GOODS.map((_, k) => goodRow(k, `<b>${PRICES[k]}</b> dr`, `The Tyre ship pays ${PRICES[k]} dr for 100 ${WARE_NAMES[TRADE_GOODS[k]]}`)).join('');
    return `<header><div class="kicker">${esc(cap(place.blurb))}</div><h2>${place.name}</h2><div class="from">No ruler to deal with: a great market of the Phoenicians, too big for your selling to move its prices</div></header>
<section><h3>Its merchants buy</h3><ul class="goodlist">${all}</ul></section>
<section><h3>The ship</h3><p class="line">${esc(where)}</p></section>
<p class="foot">${esc(REACH.tyre ?? '')}</p>`;
  }
  const r = c.ruler;
  const m = moodOf(c, s.tick);
  const w = moodWord(m);
  const reasons = moodReasons(c, s.tick)
    .map((x) => `<li class="${x.worth > 0 ? 'good' : 'bad'}"><span class="v">${x.worth > 0 ? '+' : '−'}${Math.abs(x.worth)}</span><span class="t">${esc(cap(x.why))}<em>${since(x.tick)}${x.fading ? ', fading' : ''}</em></span></li>`)
    .join('');
  const traits = r.traits.map((t) => `<li><b>${cap(t)}</b>: ${TRAIT_WORDS[t]}</li>`).join('');
  return `<header class="ruler"><div class="kicker">${esc(place.name)} · ${esc(place.blurb)}</div>
<div class="who">${portrait(r, place.colour, w, 104)}<div><h2>${esc(r.name)}</h2><div class="from">${esc(r.title)}</div><ul class="traits">${traits}</ul></div></div></header>
<section class="feel"><h3>How ${r.female ? 'she' : 'he'} feels about you</h3><div class="moodline">${moodFace(w, 30)}<div><div class="word">${cap(w)}</div><div class="num">${signed(m)} in all</div></div></div><ul class="whys">${reasons || '<li>Nothing either way yet</li>'}</ul></section>
${goodsBlock(c, place.name)}
<section><h3>Getting there</h3><p class="line">${esc(REACH[id] ?? '')} No trade routes are open to Greece yet.</p></section>`;
}

/** Every ruled city's mood in a word, for the probe and the smoke test. */
export const moods = (s: SimState): Record<string, string> => Object.fromEntries(RULED.map((id) => [id, moodWord(moodOf(cityOf(s.world, id), s.tick))]));
