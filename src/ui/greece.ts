/**
 * What the map of Greece says: the rulers' portraits, the labels over the
 * cities, the hover card, and each city's panel (who rules it, how they feel
 * about you and why, its prices with their arrows, charts and reasons, and its
 * trade routes). Loaded with
 * the map, the first time it opens.
 */
import type { CoastMap } from '../map/bake';
import { PLACES, RULED, type CityId } from '../map/greece';
import { hash2 } from '../map/noise';
import { dateOfTick, formatDate, TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '../sim/clock';
import { WARE_NAMES } from '../sim/foods';
import type { Gift, Ruler, SimState, TradeRoute } from '../sim/state';
import { caravansOnMap, everyOf, routeOf, visitorOnMap, wareList } from '../sim/routes';
import { cityHolds, PRICES, SAIL_IN, shipNews, TRADE_GOODS } from '../sim/trade';
import { fairGift, GIFT_COINS, GIFT_LOTS, giftFrom, giftMemory, giftNews, giftRefusal, giftTo, giftValue, giftWay, giftWords } from '../sim/diplomacy';
import { pricesBlock, termsLine, termsMeaning } from './prices';
import { waysHtml } from './routes';
import { cityOf, COLD, HOSTILE, MOOD_WORDS, moodOf, moodReasons, moodWord, NAME_MAX, nameRefusal, termsOf, TRAIT_WORDS, tyreShip, WARM, type MoodWord } from '../sim/world';

/** The tabs of a ruled city's page. */
export type CityTab = 'ruler' | 'prices' | 'trade';
export const CITY_TABS: readonly CityTab[] = ['ruler', 'prices', 'trade'];

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

/** The goods a route's trader comes for and brings, in words: " · for your oil and meat · bringing the wine you buy". */
function tradesWords(r: TradeRoute): string {
  const names = (ticks: readonly boolean[]): string[] => ticks.map((on, k) => (on ? WARE_NAMES[TRADE_GOODS[k]] : '')).filter((x) => x);
  const and = (xs: string[]): string => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
  const sell = names(r.sell);
  const buy = names(r.buy);
  return `${sell.length ? ` · for your ${and(sell)}` : ''}${buy.length ? ` · bringing the ${and(buy)} you buy` : ''}`;
}

/** The card over a route's trader on the map ('corinth-sea', 'corinth-land-0'): who, coming or going, when, and what for. */
function travellerHtml(s: SimState, key: string): string {
  if (key.startsWith('gift-')) return giftCard(s, Number(key.slice(5)));
  const [city, kind, nth] = key.split('-') as [CityId, 'land' | 'sea', string?];
  const r = routeOf(s, city, kind);
  const name = PLACES[city]?.name ?? city;
  if (!r) return `<b>A trader from ${esc(name)}</b>`;
  const days = (t: number): string => {
    const d = Math.max(1, Math.ceil((t - s.tick) / TICKS_PER_DAY));
    return d === 1 ? '1 day' : `${d} days`;
  };
  // (Heading home with the route closed: called home, or home from its last visit before it closed.)
  const paid = r.closed > 0 ? `: ${PLACES[city]?.name ?? city}’s ruler has closed the ${kind === 'land' ? 'road' : 'sea route'}` : r.visits > 0 && r.lastPaid > 0 ? ` · paid ${fmt(r.lastPaid)} dr for ${wareList(r.lastSold)}` : '';
  if (kind === 'sea') {
    const v = visitorOnMap(r, s.tick);
    const line = v.homeward ? `Sailing home to ${name}${paid}` : `Sailing to your city: due at your jetty in ${days(r.next)}${tradesWords(r)}`;
    return `<b>The ship from ${esc(name)}</b><span>${esc(line)}</span><span class="sub">Click for ${esc(name)}’s page</span>`;
  }
  const c = caravansOnMap(s, r, s.tick)[Number(nth ?? 0)];
  const home = c?.homeward ?? false;
  const line = home ? `On the road home to ${name}${paid}` : `On the road to your city: at the edge of your map in ${days(r.next)}${tradesWords(r)}`;
  return `<b>A caravan from ${esc(name)}</b><span>${esc(line)}</span><span class="sub">Click for ${esc(name)}’s page</span>`;
}

/** The card over a gift on the map: whose, to whom, what, and when it arrives. */
function giftCard(s: SimState, id: number): string {
  const g = s.world.gifts.find((x) => x.id === id);
  if (!g) return '<b>A gift</b>';
  const yours = g.from === 'home';
  const city = yours ? g.to : g.from;
  const name = PLACES[city].name;
  const head = yours ? `Your gift to ${name}` : `A gift from ${name}`;
  return `<b>${esc(head)} · ${esc(giftWords(g.good, g.amount))}</b><span>${esc(giftNews(s, g))}</span><span class="sub">Click for ${esc(name)}’s page</span>`;
}

/** Which city a thing on the map belongs to (a trader's or a gift's), for the page a click opens. */
export function cityOfTraveller(s: SimState, key: string): CityId | null {
  if (key.startsWith('gift-')) {
    const g = s.world.gifts.find((x) => x.id === Number(key.slice(5)));
    return g ? (g.from === 'home' ? g.to : g.from) : null;
  }
  return key.split('-')[0] as CityId;
}

/** The card under the pointer over a city (or the Tyre ship, or a route's trader). */
export function hoverHtml(s: SimState, hit: CityId | 'ship' | `trav:${string}`): string {
  if (hit.startsWith('trav:')) return travellerHtml(s, hit.slice(5));
  const id = hit as CityId | 'ship';
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

/** How a city is reached from yours. */
const REACH: Partial<Record<CityId, string>> = {
  athens: 'By sea, out of the gulf and up the Saronic Gulf to the Piraeus, or the long road north through Corinth and over the isthmus.',
  sparta: 'By road only, over the hills by Tegea and down the Eurotas valley.',
  corinth: 'By road through Nemea, or by sea to its eastern harbour.',
  troy: 'By sea only, the long way through the islands and up the Aegean.',
  tyre: 'By sea, far to the south-east: its merchant ship comes to your trading post.',
};

const months = (ticks: number): string => {
  const m = Math.round((ticks / TICKS_PER_MONTH) * 2) / 2;
  return m === 1 ? 'a month' : m === 2 ? 'two months' : m === 3 ? 'three months' : `${String(m).replace('.5', '½')} months`;
};

/** What a ruler's mood means for your city, a line each: their traders, their routes, their gifts, and where it is heading. */
function meansHtml(s: SimState, id: CityId): string {
  const c = cityOf(s.world, id);
  const m = moodOf(c, s.tick);
  const they = c.ruler?.female ? 'she' : 'he';
  const out: string[] = [];
  const routes = s.world.routes.filter((r) => r.city === id);
  for (const r of routes) {
    const who = r.kind === 'land' ? 'caravan' : 'ship';
    const way = r.kind === 'land' ? 'road' : 'sea route';
    if (r.closed > 0) out.push(`<li class="bad"><b>The ${way} is closed</b> (since ${formatDate(dateOfTick(r.closed))}): no ${who} sets off until the mood mends past hostile (${signed(HOSTILE + 1)} or better, ${HOSTILE + 1 - m} more than now). A gift can mend it.</li>`);
    else if (m <= COLD) out.push(`<li class="bad"><b>Cold:</b> a ${who} every ${months(everyOf(s, r))} instead of ${months(r.kind === 'land' ? 2 * TICKS_PER_MONTH : 3 * TICKS_PER_MONTH)}. At ${signed(HOSTILE)} ${they} closes the ${way}.</li>`);
    else out.push(`<li>A ${who} every ${months(everyOf(s, r))} by the ${way}. Cold (${signed(COLD)} or worse), ${they} sends them half as often again; hostile (${signed(HOSTILE)}), ${they} closes it.</li>`);
  }
  if (!routes.length) out.push(m <= COLD ? `<li class="bad">No route open, and while ${they} is cold or worse ${they} won’t open one.</li>` : `<li>No route open yet: the Trade tab opens one.</li>`);
  if (m >= WARM) out.push(`<li class="good"><b>Warm:</b> now and then ${they} sends your city a gift${s.world.contact ? '' : ', once you have dealt with Greece'}.</li>`);
  // (Not while cold or worse: gifts back are beside the point then.)
  else if (m > COLD) out.push(`<li>Warm (${WARM} or better), ${they} would send you a gift now and then.</li>`);
  // Where the mood is heading as its memories fade: a year on, as things stand.
  const later = moodOf(c, s.tick + TICKS_PER_YEAR);
  if (later !== m) {
    const t = termsOf(c, s.tick + TICKS_PER_YEAR);
    const how = t > 0 ? `prices ${t}% in your favour` : t < 0 ? `prices ${-t}% against you` : 'prices as the market';
    out.push(`<li class="ahead">A year on, as things stand: ${signed(later)}, ${moodWord(later)}, ${how} (as what ${they} remembers fades).</li>`);
  } else out.push(`<li class="ahead">Nothing ${they} remembers is fading: ${they} stays as ${they} is until something happens.</li>`);
  return `<section class="means"><h3>What it means for you</h3><ul class="means">${out.join('')}</ul></section>`;
}

/** The gift buttons: drachmas, and each trade good your stores hold enough of, each with what it would be worth to the ruler now. */
function giftsHtml(s: SimState, id: CityId, map: CoastMap | undefined): string {
  const c = cityOf(s.world, id);
  const name = PLACES[id].name;
  const out = giftTo(s.world, id);
  const back = giftFrom(s.world, id);
  const coming = back ? `<p class="giftnews theirs">${esc(giftNews(s, back))}.</p>` : '';
  if (out) return `<section class="gifts"><h3>Gifts</h3><p class="giftnews">${esc(giftNews(s, out))}.</p>${coming}<p class="foot">One gift on its way to ${esc(name)} at a time. It counts when it arrives.</p></section>`;
  // (Whether goods can go that way at all, found once for every row.)
  const goodsWay = map ? giftWay(s, map, id, false) : null;
  const wayWhy = goodsWay && 'why' in goodsWay ? goodsWay.why : '';
  const button = (ware: number, k: number, amount: number): string => {
    const why = map ? giftRefusal(s, map, id, ware, amount, ware < 0 ? undefined : wayWhy) : '';
    const mem = giftMemory(s, c, k, amount, s.tick);
    const label = k < 0 ? `${fmt(amount)} dr` : fmt(amount);
    const value = k >= 0 ? ` (worth ${fmt(giftValue(s, id, k, amount))} dr in ${name})` : '';
    const title = why || `${cap(mem.why)}${value}: +${mem.amount} to the mood when it arrives, fading over ${months(mem.fade)}`;
    return `<button data-gift="${ware}" data-amount="${amount}" title="${esc(title)}"${why ? ' disabled' : ''}>${label}<em>+${mem.amount}</em></button>`;
  };
  const rows: string[] = [];
  rows.push(`<li><span class="g"><i class="coin"></i>Drachmas</span><span class="b">${GIFT_COINS.map((n) => button(-1, -1, n)).join('')}</span></li>`);
  let goods = 0;
  TRADE_GOODS.forEach((w, k) => {
    const have = cityHolds(s, w);
    if (have < GIFT_LOTS[0]) return;
    goods++;
    rows.push(`<li><span class="g" title="${esc(`Your stores hold ${fmt(have)} ${WARE_NAMES[w]}`)}"><i style="background:${SWATCH[k]}"></i>${cap(WARE_NAMES[w])}</span><span class="b">${GIFT_LOTS.map((n) => button(w, k, n)).join('')}</span></li>`);
  });
  // (Why goods can't go, if it is the way rather than the stores: no yard or post.)
  const first = TRADE_GOODS.find((w) => cityHolds(s, w) >= GIFT_LOTS[0]);
  const way = map && first !== undefined ? giftRefusal(s, map, id, first, GIFT_LOTS[0], wayWhy) : '';
  const goodsNote = !goods ? `<p class="none">Goods: your stores hold none of the trade goods to spare (${GIFT_LOTS[0]} at the least).</p>` : /caravan yard|trading post|edge of the map/.test(way) ? `<p class="none">${esc(way)}.</p>` : '';
  return `<section class="gifts"><h3>Send a gift</h3><ul class="giftrows">${rows.join('')}</ul>${goodsNote}${coming}
<p class="foot">Each shows what it would add to the mood when it arrives. A fair gift for a city your size is about ${fmt(fairGift(s))} dr: more counts for more, but less than you’d think, and gifts within six months of each other count for less. Goods are fetched from your stores to the caravan yard or the trading post, and leave from there.</p></section>`;
}

/** A gift on its way (the hover card's and the map's). */
export const giftKey = (g: Gift): string => `gift-${g.id}`;

/** A city's panel. `renaming` shows your city's name as a text box; a ruled city's page opens on `tab`. */
export function panelHtml(s: SimState, id: CityId, renaming: boolean, nameDraft: string, tab: CityTab = 'ruler', map?: CoastMap): string {
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
  const routes = s.world.routes.filter((x) => x.city === id);
  const closed = routes.some((x) => x.closed > 0);
  const tabName: Record<CityTab, string> = { ruler: 'Ruler', prices: 'Prices', trade: closed ? 'Trade · closed' : routes.length ? `Trade · ${routes.length} open` : 'Trade' };
  const tabs = CITY_TABS.map((k) => `<button data-tab="${k}"${k === tab ? ' class="on"' : ''}${k === 'trade' && closed ? ' title="The ruler has closed the way: see the Ruler tab"' : ''}>${tabName[k]}</button>`).join('');
  const pane = (k: CityTab, html: string): string => `<div class="pane" data-pane="${k}"${k === tab ? '' : ' hidden'}>${html}</div>`;
  return `<header class="ruler"><div class="kicker">${esc(place.name)} · ${esc(place.blurb)}</div>
<div class="who">${portrait(r, place.colour, w, 104)}<div><h2>${esc(r.name)}</h2><div class="from">${esc(r.title)}</div><ul class="traits">${traits}</ul></div></div>
<div class="moodline">${moodFace(w, 30)}<div><div class="word">${cap(w)} <span class="num">${signed(m)}</span></div><p class="terms" title="${esc(termsMeaning(s, id))}">${esc(termsLine(s, id))}</p></div></div></header>
<nav class="citytabs">${tabs}</nav>
${pane('ruler', `<section class="feel"><h3>How ${r.female ? 'she' : 'he'} feels about you</h3><ul class="whys">${reasons || '<li>Nothing either way yet</li>'}</ul></section>
${meansHtml(s, id)}
${giftsHtml(s, id, map)}`)}
${pane('prices', pricesBlock(s, id, false))}
${pane('trade', `${waysHtml(s, id, false)}<section><h3>Getting there</h3><p class="line">${esc(REACH[id] ?? '')}</p></section>`)}`;
}

/** Every ruled city's mood in a word, for the probe and the smoke test. */
export const moods = (s: SimState): Record<string, string> => Object.fromEntries(RULED.map((id) => [id, moodWord(moodOf(cityOf(s.world, id), s.tick))]));
