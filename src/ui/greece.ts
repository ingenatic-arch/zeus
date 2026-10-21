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
import { caravansOnMap, everyOf, keptIn, routeOf, visitorOnMap, wareList } from '../sim/routes';
import { cityHolds, PRICES, SAIL_IN, shipNews, TRADE_GOODS } from '../sim/trade';
import { heraldWords, seizing, whose } from '../sim/loans';
import { expeditionLine, expeditionMen } from '../sim/expeditions';
import { LOAN_ICON, loanDealHtml, loanDealShort, loansTabHtml, loansTabName, soldiersHtml } from './loans';
import { fairGift, GIFT_COINS, GIFT_LOTS, giftFrom, giftMemory, giftNews, giftRefusal, giftTo, giftValue, giftWay, giftWords } from '../sim/diplomacy';
import { againstDue, answerMemory, answerRefusal, answerWorths, arrivesAt, dayWords, dealWords, dueWords, liveDeals, OFFER_KEPT, offerWords, sendRefusal, sendTicks, stronger, type SendMemo, TRIBUTE_YEARS } from '../sim/favours';
import type { Deal } from '../sim/state';
import { afloat, guardRefusal, guardsOf, LANES, piratesOn, triremeDoing, triremeName } from '../sim/fleet';
import { aimWords, bandMen, bandOut, daysToEdge, edgeWords, goodsArrive, live, lootWords, RAID_SIDE, raidersOf, raidOf, reachesEdge } from '../sim/raids';
import { pricesBlock, termsLine, termsMeaning } from './prices';
import { armyCard, fieldsCard, foeNote, labelIcons, menWords, peopleShort, rivalsHtml, siteCard, statusHtml, trendHtml, warCard } from './rivals';
import { lordWords, trendOf, wealthWord } from '../sim/growth';
import { waysHtml } from './routes';
import { cityOf, COLD, HOSTILE, MOOD_WORDS, moodOf, moodReasons, moodWord, NAME_MAX, nameRefusal, priceAfter, termsOf, TRAIT_WORDS, tyreShip, WARM, yourPrice, type MoodWord } from '../sim/world';

/** The tabs of a ruled city's page. */
export type CityTab = 'ruler' | 'prices' | 'trade' | 'loans' | 'rivals';
export const CITY_TABS: readonly CityTab[] = ['ruler', 'prices', 'trade', 'loans', 'rivals'];

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
  // A deal waiting on your answer: a scroll (a request, an offer) or a red seal (tribute).
  const open = liveDeals(s.world, id).filter((x) => x.state === 'open');
  const d = open.find((x) => x.kind === 'threat') ?? open[0];
  // (Slice 31: its people to the hundred, with an arrow while it grows or shrinks; a vassal's lord's colour beside its name.)
  const lord = c.lord ? `<i class="lord" style="background:${PLACES[c.lord]?.colour ?? '#888'}" title="${esc(cap(lordWords(c)))}"></i>` : '';
  return `${lord}<b>${esc(name)}</b><span class="sz">${peopleShort(c)}${trendHtml(trendOf(c, 'pop'))}</span>${moodFace(moodWord(moodOf(c, s.tick)), 15)}${labelIcons(s, id)}${d ? dealIcon(d) : ''}`;
}

/** The little scroll on a city's label while a request or offer waits on you; a red seal for tribute. */
export function dealIcon(d: Pick<Deal, 'kind' | 'gift'>): string {
  const sent = d.gift > 0 ? ' sent' : '';
  // A ruler's offer of a loan or ask for one: a coin on a scroll (loans.ts).
  if (d.kind === 'loanoffer' || d.kind === 'loanask') return LOAN_ICON;
  // A threat: a red seal under two crossed spears.
  if (d.kind === 'threat') return `<svg viewBox="0 0 16 16" width="15" height="15" class="ask threat${sent}" aria-hidden="true"><path d="M2.4 13.6 12.6 3.4M13.6 13.6 3.4 3.4" stroke="#5a3a22" stroke-width="1.3" stroke-linecap="round"/><path d="M12.2 1.4l2.4 2.4-2.8.6zM3.8 1.4 1.4 3.8l2.8.6z" fill="#cfd2d4" stroke="#4a4a4a" stroke-width=".5"/><circle cx="8" cy="10.2" r="3.6" fill="#b8322a" stroke="#5e1410" stroke-width=".9"/><circle cx="8" cy="10.2" r="1.1" fill="#e8c46a"/></svg>`;
  if (d.kind === 'tribute') return `<svg viewBox="0 0 16 16" width="15" height="15" class="ask tribute${sent}" aria-hidden="true"><path d="M3 3.5h8.6c1 0 1.6.7 1.6 1.6v7.4H4.6C3.7 12.5 3 11.8 3 10.9z" fill="#f4e4bf" stroke="#8a6440" stroke-width=".9"/><circle cx="10.4" cy="11" r="3" fill="#b8322a" stroke="#6e1a14" stroke-width=".8"/><path d="M9 11h2.8M10.4 9.6v2.8" stroke="#f2c7b8" stroke-width=".8"/></svg>`;
  return `<svg viewBox="0 0 16 16" width="15" height="15" class="ask ${d.kind}${sent}" aria-hidden="true"><path d="M4 2.6h8.4c.9 0 1.4.6 1.4 1.4s-.5 1.4-1.4 1.4H12v7.2c0 1-.7 1.7-1.7 1.7H3.6c.9 0 1.4-.6 1.4-1.4V4c0-.8-.5-1.4-1-1.4z" fill="#f4e4bf" stroke="#8a6440" stroke-width=".9" stroke-linejoin="round"/><path d="M6.6 7h3.6M6.6 9h3.6M6.6 11h2.4" stroke="#8a6440" stroke-width=".8" stroke-linecap="round"/></svg>`;
}

/** A deal in a few words, for the hover card and the label's tip: "Asks for 1,000 wheat · 63 days left". */
export function dealShort(s: SimState, d: Deal): string {
  const days = Math.max(0, Math.ceil((d.due - s.tick) / TICKS_PER_DAY));
  const left = `${days === 1 ? '1 day' : `${days} days`} left`;
  if (d.kind === 'loanoffer' || d.kind === 'loanask') return loanDealShort(s, d);
  if (d.kind === 'threat') {
    const r = raidOf(s.world, d.id);
    // (A lender's army, slice 28: it comes for what you owe, and once in your city can't be paid off.)
    if (r?.loan) {
      if (r.phase === 'raiding') return 'Collectors in your city, taking what you owe';
      if (bandOut(r)) return `An army on the march to collect your debt · at your edge in ${daysToEdge(r, s.tick) === 1 ? '1 day' : `${daysToEdge(r, s.tick)} days`} · pay ${fmt(r.coin)} dr`;
      return `Sends to collect what you owe · ${fmt(r.coin)} dr · ${left}`;
    }
    if (r && r.phase === 'raiding') return `Raiders in your city · pay ${fmt(r.coin)} dr to turn them back`;
    if (r && bandOut(r)) return `Raiders on the march · at your edge in ${daysToEdge(r, s.tick) === 1 ? '1 day' : `${daysToEdge(r, s.tick)} days`} · pay ${fmt(r.coin)} dr`;
    return `Threatens your city · the price of peace ${dealWords(d)}${d.gift ? ' · sent, on its way' : ''} · ${left}`;
  }
  if (d.kind === 'offer') return d.state === 'taken' ? `Your year’s deal for ${WARE_NAMES[TRADE_GOODS[d.good]]}: ${fmt(d.done)} of ${fmt(d.amount)} so far` : `Offers a deal for ${WARE_NAMES[TRADE_GOODS[d.good]]} · answer within ${days === 1 ? '1 day' : `${days} days`}`;
  const what = d.kind === 'tribute' ? `Demands ${dealWords(d)} in tribute` : `Asks for ${dealWords(d)}`;
  return `${what}${d.gift ? ' · sent, on its way' : d.promised ? ' · promised' : ''} · ${left}`;
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
  if (key.startsWith('raid-')) return bandCard(s, Number(key.slice(5).replace('-camp', '')));
  // An army or fleet ('war-3-sparta'), the crossed swords where they meet ('war-3'), a city's fields ('fields-sparta').
  if (key.startsWith('war-')) {
    const [, n, city] = key.split('-');
    return city ? armyCard(s, Number(n), city as CityId) : warCard(s, Number(n));
  }
  if (key.startsWith('fields-')) return fieldsCard(s, key.slice(7) as CityId);
  if (key.startsWith('site-')) return siteCard(s, key.slice(5));
  if (key.startsWith('exp-')) return expeditionCard(s, Number(key.split('-')[1]));
  if (key.startsWith('pirates-')) {
    const p = s.fleet.pirates.find((x) => x.id === Number(key.slice(8)));
    if (!p) return '<b>Pirates</b>';
    const g = guardsOf(s, p.way);
    const line = p.state === 'seen' ? `Seen ${p.place}: from about ${dayWords(p.from)} they seize what of yours passes there` : `${p.place.replace(/^./, (c) => c.toUpperCase())}, seizing what of yours passes there${p.took.length ? ` (${p.took.length} taken so far)` : ''}`;
    return `<b>${esc(`Pirates · ${p.ships} ${p.ships === 1 ? 'ship' : 'ships'}`)}</b><span>${esc(line)}</span><span class="sub">${esc(g.length ? `The ${triremeName(g[0])} guards the lane` : `Send a trireme to guard the lane, from ${PLACES[p.city].name}’s page or the Military tab`)}</span>`;
  }
  if (key.startsWith('trireme-')) {
    const t = s.fleet.triremes.find((x) => x.id === Number(key.slice(8)));
    if (!t) return '<b>Your trireme</b>';
    return `<b>${esc(`The trireme ${triremeName(t)} · ${t.crew.length} rowers · ${Math.round(t.hp)}% sound`)}</b><span>${esc(triremeDoing(s, t))}</span>`;
  }
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
  if (g.loan) {
    // A herald about a loan (loans.ts).
    const h = heraldWords(s, g);
    const city = g.from === 'home' ? g.to : g.from;
    return `<b>${esc(h.head)}</b><span>${esc(h.line)}</span><span class="sub">Click for ${esc(whose(city))} Loans tab</span>`;
  }
  const yours = g.from === 'home';
  const city = yours ? g.to : g.from;
  const name = PLACES[city].name;
  const head = yours ? `Your gift to ${name}` : `A gift from ${name}`;
  return `<b>${esc(head)} · ${esc(giftWords(g.good, g.amount))}</b><span>${esc(giftNews(s, g))}</span><span class="sub">Click for ${esc(name)}’s page</span>`;
}

/** The card over a war band on the map: whose, how many, where, and when it reaches you (or that it has turned back). */
function bandCard(s: SimState, id: number): string {
  const r = s.world.raids.find((x) => x.id === id);
  if (!r) return '<b>A war band</b>';
  const name = PLACES[r.city].name;
  const whose = name.endsWith('s') ? `${name}’` : `${name}’s`;
  const edge = reachesEdge(s, r);
  const n = Math.max(1, Math.ceil((edge - s.tick) / TICKS_PER_DAY));
  const when = `${n === 1 ? '1 day' : `${n} days`} (${dayWords(edge)})`;
  const line =
    r.phase === 'gathering'
      ? `Gathering at ${name} to ${r.by === 'sea' ? 'sail' : 'march'} on your city: ${edgeWords(r)} in about ${when}`
      : r.phase === 'marching'
        ? `${r.by === 'sea' ? 'Sailing' : 'Marching'} on your city: ${edgeWords(r)} in about ${when}`
        : r.end === 'paid'
          ? `Paid off: going home to ${name}`
          : r.end === 'called'
            ? `Called off: going home to ${name}`
            : `Going home to ${name}${r.took ? ` with ${fmt(r.took)} ${WARE_NAMES[r.ware]}` : ''}`;
  const pay = live(r) ? `Pay ${fmt(r.coin)} dr on ${whose} page to turn them back` : `Click for ${name}’s page`;
  if (r.loan) return `<b>${esc(`${whose} army · ${r.men} men`)}</b><span>${esc(line.replace(/to (march|sail) on your city/, 'to collect what you owe').replace('on your city:', 'on your city, to collect what you owe:'))}</span><span class="sub">${esc(pay)}</span>`;
  return `<b>${esc(`${whose} raiders · ${r.men} men`)}</b><span>${esc(line)}</span><span class="sub">${esc(pay)}</span>`;
}

/** The card over your expedition on the map (slice 28): who, how many, where and when; after the fight, how it went. */
function expeditionCard(s: SimState, id: number): string {
  const e = s.world.expeditions.find((x) => x.id === id);
  if (!e) return '<b>Your soldiers</b>';
  const name = PLACES[e.city].name;
  const head = `Your ${e.kind === 'raid' ? 'raiding party' : 'army'} · ${expeditionMen(s, e)} men`;
  const after = e.report.length ? `<span>${esc(e.report[1] ?? '')}</span>` : `<span>${esc(e.loan ? `After the ${fmt(s.world.loans.find((l) => l.id === e.loan)?.owed ?? 0)} dr ${name} owes you` : `Against ${name}, which owes you nothing`)}</span>`;
  return `<b>${esc(head)}</b><span>${esc(expeditionLine(s, e))}</span>${after}<span class="sub">Click for ${esc(whose(e.city))} Loans tab</span>`;
}

/** Which city a thing on the map belongs to (a trader's or a gift's), for the page a click opens. */
export function cityOfTraveller(s: SimState, key: string): CityId | null {
  if (key.startsWith('exp-')) return s.world.expeditions.find((x) => x.id === Number(key.split('-')[1]))?.city ?? null;
  if (key.startsWith('raid-')) return s.world.raids.find((x) => x.id === Number(key.slice(5).replace('-camp', '')))?.city ?? null;
  if (key.startsWith('fields-')) return key.slice(7) as CityId;
  if (key.startsWith('site-')) {
    const x = s.world.sites.find((y) => y.id === key.slice(5));
    return x?.owner || x?.bound || null;
  }
  if (key.startsWith('pirates-')) return s.fleet.pirates.find((x) => x.id === Number(key.slice(8)))?.city ?? null;
  if (key.startsWith('trireme-')) {
    const t = s.fleet.triremes.find((x) => x.id === Number(key.slice(8)));
    return LANES.find((l) => l.way === t?.lane)?.city ?? null;
  }
  if (key.startsWith('war-')) {
    const [, n, city] = key.split('-');
    return (city as CityId | undefined) ?? s.world.wars.find((x) => x.id === Number(n))?.a ?? null;
  }
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
  const deals = liveDeals(s.world, id)
    .map((d) => `<span class="deal">${dealIcon(d)} ${esc(dealShort(s, d))}</span>`)
    .join('');
  return `${portrait(c.ruler, PLACES[id].colour, w, 64)}<div><b>${esc(PLACES[id].name)}</b><span>${esc(c.ruler.title.replace(/ of .*/, ''))} ${esc(c.ruler.name)} · ${c.ruler.traits.join(', ')}</span><span class="mood">${moodFace(w, 16)} ${cap(w)} towards you (${signed(m)})</span><span>${fmt(c.pop)} people${trendHtml(trendOf(c, 'pop'))} · ${esc(wealthWord(c))} · ${menWords(c.army)}${c.lord ? ` · ${esc(lordWords(c))}` : ''}</span>${deals}<span class="sub">Click to meet them</span></div>`;
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
  // (Slice 31.)
  thebes: 'By road only, north through Corinth, over the isthmus by Megara and over Mount Kithairon into Boeotia.',
  argos: 'By road only, a short way west over the hills: the Argives’ old town looks down on your plain.',
  knossos: 'By sea only, south out of the gulf, past Cape Maleas and across to Crete.',
  rhodes: 'By sea only, the long way south-east through the islands, past Karpathos.',
  memphis: 'By sea only, the longest voyage: south past Crete and across the open sea to the mouths of the Nile.',
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
    if (r.closed > 0 && seizing(s.world, id)) out.push(`<li class="bad"><b>The ${way} is closed over your unpaid debt</b> (since ${formatDate(dateOfTick(r.closed))}): no ${who} sets off, and ${they} seizes your goods on it. It opens again once the debt is paid (the Loans tab).</li>`);
    else if (r.closed > 0) out.push(`<li class="bad"><b>The ${way} is closed</b> (since ${formatDate(dateOfTick(r.closed))}): no ${who} sets off until the mood mends past hostile (${signed(HOSTILE + 1)} or better, ${HOSTILE + 1 - m} more than now). A gift can mend it.</li>`);
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
  // (The road searches behind each button's arrival time, done once for the whole page.)
  const memo: SendMemo = {};
  const button = (ware: number, k: number, amount: number): string => {
    const why = map ? giftRefusal(s, map, id, ware, amount, ware < 0 ? undefined : wayWhy) : '';
    // (What it is worth when it arrives, as it will be judged then: a gift landing in a festival counts for more, one sent today but arriving after it doesn't.)
    const t = map && !why ? sendTicks(s, map, { city: id, good: k, amount }, k < 0 ? undefined : memo) : -1;
    const mem = giftMemory(s, c, k, amount, s.tick + Math.max(0, t));
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
  const foe = foeNote(s, id);
  return `<section class="gifts"><h3>Send a gift</h3><ul class="giftrows">${rows.join('')}</ul>${goodsNote}${coming}${foe ? `<p class="none foe">${esc(foe)}</p>` : ''}
<p class="foot">Each shows what it would add to the mood when it arrives. A fair gift for a city your size is about ${fmt(fairGift(s))} dr: more counts for more, but less than you’d think, and gifts within six months of each other count for less. Goods are fetched from your stores to the caravan yard or the trading post, and leave from there.</p></section>`;
}

/** "+31", "−15": a memory's worth, for the buttons. */
const worthEm = (n: number | undefined): string => (n === undefined || n === 0 ? '' : `<em class="${n > 0 ? 'up' : 'down'}">${signed(n)}</em>`);

/** "fading over two years". */
const fadeWords = (ticks: number): string => (ticks <= 0 ? 'until it is settled' : ticks % TICKS_PER_YEAR === 0 ? `fading over ${['', 'a year', 'two years', 'three years', 'four years', 'five years', 'six years'][ticks / TICKS_PER_YEAR] ?? `${ticks / TICKS_PER_YEAR} years`}` : `fading over ${months(ticks)}`);

/** A deal's answer button: its act, its label, what it would do to the mood, and why it can't be given (disabled) or what it means (its tip). */
function actButton(s: SimState, map: CoastMap | undefined, d: Deal, act: 'promise' | 'send' | 'refuse' | 'take' | 'decline', label: string, worth: number | undefined, tip: string): string {
  const why = map ? answerRefusal(s, map, d, act) : '';
  return `<button data-deal="${d.id}" data-act="${act}" class="${act}" title="${esc(why || tip)}"${why ? ' disabled' : ''}>${esc(label)}${worthEm(worth)}</button>`;
}

/** When what you would send (or have sent) arrives, against the deadline. */
function etaLine(s: SimState, map: CoastMap | undefined, d: Deal): string {
  if (!map) return '';
  const g = d.gift ? s.world.gifts.find((x) => x.id === d.gift) : undefined;
  if (g) {
    const at = arrivesAt(s, map, g);
    return `<p class="eta sent">${esc(giftNews(s, g))}. It arrives about ${esc(dayWords(at))}, ${esc(againstDue(at, d.due))}.</p>`;
  }
  const why = sendRefusal(s, map, d);
  if (why) return `<p class="eta no">${esc(why)}.</p>`;
  const t = sendTicks(s, map, d);
  if (t < 0) return '';
  const how = d.good < 0 ? 'a herald takes it' : 'fetched from your stores, then out of the city and along the way';
  return `<p class="eta">If sent now (${how}), it arrives about ${esc(dayWords(s.tick + t))}, ${esc(againstDue(s.tick + t, d.due))}.</p>`;
}

/** One of a ruler's deals: what they ask or offer and why, by when, your answers with what each does to the mood, and when a sending would arrive. */
function dealHtml(s: SimState, d: Deal, map: CoastMap | undefined): string {
  if (d.kind === 'loanoffer' || d.kind === 'loanask') return loanDealHtml(s, d);
  const c = cityOf(s.world, d.city);
  const they = c.ruler?.female ? 'she' : 'he';
  const w = answerWorths(s, d);
  const name = PLACES[d.city].name;
  const words = dealWords(d);
  if (d.kind === 'offer') {
    const ware = WARE_NAMES[TRADE_GOODS[d.good]];
    const bound = Math.ceil(d.amount * OFFER_KEPT);
    const today = yourPriceNow(s, d);
    if (d.state === 'taken') {
      const share = Math.min(1, d.done / Math.max(1, d.amount));
      const done = d.done >= bound;
      return `<div class="deal offer taken">${dealIcon(d)}<div><b>Your year’s deal</b>: ${esc(name)} ${d.side === 'buy' ? `buys your ${ware} at ${d.price} a hundred, however much you sell` : `sells you ${ware} at ${d.price} a hundred`}, up to ${fmt(d.amount)}, until ${esc(dayWords(d.until))}.
<div class="bar"><i style="width:${(share * 100).toFixed(1)}%"></i><s style="left:${(OFFER_KEPT * 100).toFixed(0)}%"></s></div>
<p class="if">${fmt(d.done)} ${d.side === 'buy' ? 'sold' : 'bought'} so far${done ? `: enough to keep your word (${fmt(bound)})` : `: at least ${fmt(bound)} by then to keep your word, or it counts as a promise broken (${signed(w.reneged?.amount ?? 0)})`}. The market ${d.side === 'buy' ? 'pays' : 'asks'} ${today} today.${d.side === 'buy' && !done ? esc(spareWords(s, d)) : ''}</p></div></div>`;
    }
    return `<div class="deal offer">${dealIcon(d)}<div><b>${esc(cap(rulerTitle(c)))} offers</b> ${esc(offerWords(d))}. <span class="why">${esc(cap(d.why))}.</span>
<p class="if">${d.side === 'buy' ? `Without it, what ${esc(name)} pays falls as you sell: ${today} today, about ${priceAfter(s.world, d.city, d.good, d.amount, s.tick)} after another ${fmt(d.amount)} (and it comes back only slowly).${esc(spareWords(s, d))}` : `Today ${esc(name)} asks ${today} a hundred.`} Taking it is a promise: ${d.side === 'buy' ? 'sell' : 'buy'} at least ${fmt(bound)} in the year, or it counts as broken (${signed(w.reneged?.amount ?? 0)}). Answer ${esc(dueWords(s, d))}.</p>
<div class="acts">${actButton(s, map, d, 'take', 'Take it', w.taken?.amount, `${cap(w.taken?.why ?? '')}: ${signed(w.taken?.amount ?? 0)}, and ${ware} ticked ${d.side === 'buy' ? 'for sale' : 'to buy'} on your routes to ${name}`)}${actButton(s, map, d, 'decline', 'Decline', w.declined?.amount, w.declined?.amount ? `${cap(w.declined.why)}: ${signed(w.declined.amount)}` : 'Nothing lost but the deal')}</div></div></div>`;
  }
  if (d.kind === 'threat') return threatHtml(s, d, map);
  if (d.kind === 'tribute') {
    const cold = moodOf(c, s.tick) <= COLD;
    const { theirs } = stronger(s, d.city);
    const yearly = d.yearly ? ` every year (${d.paid ? `paid ${d.paid} of ${TRIBUTE_YEARS}` : `for ${TRIBUTE_YEARS} years`})` : '';
    const acts = d.gift
      ? ''
      : `<div class="acts">${actButton(s, map, d, 'send', 'Pay it', w.paid?.amount, `${cap(w.paid?.why ?? '')}: ${signed(w.paid?.amount ?? 0)}, ${fadeWords(w.paid?.fade ?? 0)}`)}${actButton(s, map, d, 'refuse', 'Refuse', w.defied?.amount, `${cap(w.defied?.why ?? '')}: ${signed(w.defied?.amount ?? 0)}, ${fadeWords(w.defied?.fade ?? 0)}${cold ? `; and ${they} is cold towards you, so ${they} will not let it pass` : ''}`)}</div>`;
    return `<div class="deal tribute${d.gift ? ' sent' : ''}">${dealIcon(d)}<div><b>${esc(cap(rulerTitle(c)))} demands ${esc(words)} in tribute</b>${esc(yearly)}, ${esc(dueWords(s, d))}. <span class="why">${esc(cap(d.why))}.</span>
${acts}${etaLine(s, map, d)}<p class="if">${d.gift ? '' : `Refused, or let run out: ${signed(w.defied?.amount ?? 0)}, ${fadeWords(w.defied?.fade ?? 0)}. `}${cold ? `${cap(they)} is cold towards you: refused, ${they} will not let it pass, and threats will follow.` : `If ${they} turns cold, a refusal will not be let pass.`} (${esc(name)} has about ${fmt(theirs)} people to your ${fmt(s.population)}.)</p></div></div>`;
  }
  // (Sent now, would it be late? Then the button shows what late is worth.)
  const t = map && !d.gift ? sendTicks(s, map, d) : -1;
  const late = t >= 0 && s.tick + t > d.due;
  const acts = d.gift
    ? ''
    : `<div class="acts">${actButton(s, map, d, 'send', late ? 'Send it, late' : 'Send it', late ? w.late?.amount : w.met?.amount, `${cap(w.met?.why ?? '')}: ${signed(w.met?.amount ?? 0)} if it arrives by the day (${signed(w.late?.amount ?? 0)} if late), ${fadeWords(w.met?.fade ?? 0)}`)}${d.promised ? '' : actButton(s, map, d, 'promise', 'Promise', w.promise?.amount, `Promise it now and send it later: ${signed(w.promise?.amount ?? 0)} while the promise stands; but if nothing has been sent by the day, it is a promise broken (${signed(w.broken?.amount ?? 0)}, ${fadeWords(w.broken?.fade ?? 0)})`)}${actButton(s, map, d, 'refuse', 'Refuse', d.promised ? w.broken?.amount : w.refused?.amount, d.promised ? `Going back on your promise is a promise broken: ${signed(w.broken?.amount ?? 0)}, ${fadeWords(w.broken?.fade ?? 0)}` : `${cap(w.refused?.why ?? '')}: ${signed(w.refused?.amount ?? 0)}, ${fadeWords(w.refused?.fade ?? 0)}`)}</div>`;
  const stakes = d.gift
    ? ''
    : d.promised
      ? `You promised it: if nothing has been sent by the day, it is a promise broken (${signed(w.broken?.amount ?? 0)}, ${fadeWords(w.broken?.fade ?? 0)}).`
      : `Let run out: ${signed(w.lapsed?.amount ?? 0)}. Promised and not sent by the day: ${signed(w.broken?.amount ?? 0)}, ${fadeWords(w.broken?.fade ?? 0)}.`;
  // (At war: what sending it costs you with the enemy, said before you send.)
  const foe = d.gift ? '' : foeNote(s, d.city);
  return `<div class="deal request${d.promised ? ' promised' : ''}${d.gift ? ' sent' : ''}">${dealIcon(d)}<div><b>${esc(cap(rulerTitle(c)))} asks for ${esc(words)}</b>, ${esc(dueWords(s, d))}${d.promised && !d.gift ? ' · <i>you promised it</i>' : ''}. <span class="why">${esc(cap(d.why))}.</span>
${acts}${etaLine(s, map, d)}${stakes ? `<p class="if">${esc(stakes)}</p>` : ''}${foe ? `<p class="if foe">${esc(foe)}</p>` : ''}</div></div>`;
}

/**
 * A threat: what it would cost to stop it (coin, or goods), by when, and
 * what follows if nothing comes; or, the band out, where it is and when it
 * reaches you; your answers (pay, send the goods, refuse) and when what you
 * send would arrive, against the band.
 */
function threatHtml(s: SimState, d: Deal, map: CoastMap | undefined): string {
  const c = cityOf(s.world, d.city);
  const r = raidOf(s.world, d.id);
  if (!r) return '';
  const they = c.ruler?.female ? 'she' : 'he';
  const his = c.ruler?.female ? 'her' : 'his';
  const name = PLACES[d.city].name;
  const whose = name.endsWith('s') ? `${name}’` : `${name}’s`;
  const coin = `${fmt(r.coin)} dr`;
  const goods = r.alt >= 0 ? giftWords(r.alt, r.altAmount) : '';
  const peace = answerMemory(c, 'peace', 'you paid them to call off their raiders', s.tick);
  const edge = reachesEdge(s, r);
  const days = (t: number): string => {
    const n = Math.max(1, Math.ceil((t - s.tick) / TICKS_PER_DAY));
    return n === 1 ? '1 day' : `${n} days`;
  };
  const side = edgeWords(r);
  const sea = r.by === 'sea';
  const band = raidersOf(s, r);
  let head: string;
  let where: string;
  if (r.loan) {
    // A lender's army (slice 28): what you owe, by its day, or men come to take it.
    if (r.phase === 'threat') {
      head = `${cap(rulerTitle(c))} sends to collect what you owe`;
      where = `Pay the ${coin} still owed by ${dayWords(d.due)} (${days(d.due)}). If nothing comes by then, ${r.men} of ${his} men gather at ${name} and ${sea ? 'sail' : 'march'} on your city to take it: ${side} about ${dayWords(edge)}, for your stores and your treasury. They take no more than is owed, and set nothing alight.`;
    } else if (r.phase === 'raiding') {
      head = `${cap(whose)} men are in your city, collecting`;
      where = band?.back ? `${bandMen(r) - r.fallen} men, ${sea ? 'making back for their ships' : 'leaving your land the way they came'}${lootWords(r) ? `, with ${lootWords(r)}` : ''}: what they carry off comes off the debt.` : `${bandMen(r) - r.fallen} men ${sea ? (r.landed > 0 ? 'landed from their ships' : 'in ships in your bay') : `in at the ${RAID_SIDE[r.city]} edge`}, taking what is owed from your stores and treasury. They can’t be paid off now: fight them, or let them take it.`;
    } else {
      head = `${cap(whose)} army ${r.phase === 'gathering' ? 'is gathering' : 'is on the march'} to collect`;
      where = `${r.men} men, ${side} about ${dayWords(edge)} (${days(edge)}). Pay the ${coin} now and they turn back at once, wherever they are.`;
    }
  } else if (r.phase === 'threat') {
    head = `${cap(rulerTitle(c))} threatens your city`;
    where = `Pay ${coin}${goods ? `, or send ${goods}` : ''}, by ${dayWords(d.due)} (${days(d.due)}). If nothing comes by then, ${r.men} of ${his} men gather at ${name} and ${sea ? 'sail' : 'march'} on your city: ${side} about ${dayWords(edge)}, for the ${sea ? 'stores nearest the beach where they land' : 'fields and stores nearest it'}.`;
  } else if (r.phase === 'raiding') {
    const at = r.aim ? aimWords({ kind: r.aim }) : 'your fields';
    head = `${cap(whose)} raiders are in your city`;
    where = band?.back
      ? `${bandMen(r)} men, ${sea ? 'making back for their ships' : 'leaving your land the way they came'}${band.load ? `, with ${fmt(band.load)} ${WARE_NAMES[band.meat]}` : ''}.`
      : `${bandMen(r)} men ${sea ? (r.landed > 0 ? 'landed from their ships' : 'in ships in your bay') : `in at the ${RAID_SIDE[r.city]} edge`}, ${band && band.wait > 0 ? `at ${at}` : `making for ${at}`}. Pay ${coin} now and they turn back at once, with whatever they have taken.`;
  } else {
    head = `${cap(whose)} raiders ${r.phase === 'gathering' ? 'are gathering' : 'are on the march'}`;
    where = `${r.men} men, ${side} about ${dayWords(edge)} (${days(edge)}). Pay ${coin} now and they turn back at once, wherever they are.`;
  }
  const out = bandOut(r);
  const coinTip = r.loan ? `Repays the loan in full now: the steps stop, and ${his} routes open again${out ? '; the army turns back' : ''}` : out ? `Paid at once, and the band turns back: ${cap(peace.why)}, ${signed(peace.amount)}, ${fadeWords(peace.fade)}` : `A herald takes it to ${name}: ${cap(peace.why)}, ${signed(peace.amount)}, ${fadeWords(peace.fade)}`;
  const button = (act: 'send' | 'goods' | 'refuse', label: string, worth: number | undefined, tip: string): string => {
    const why = map ? answerRefusal(s, map, d, act) : '';
    return `<button data-deal="${d.id}" data-act="${act}" class="${act === 'goods' ? 'send' : act}" title="${esc(why || tip)}"${why ? ' disabled' : ''}>${esc(label)}${worthEm(worth)}</button>`;
  };
  const acts =
    d.gift || !live(r) || band?.back
      ? ''
      : `<div class="acts">${button('send', `Pay ${coin}`, r.loan ? undefined : peace.amount, coinTip)}${r.alt >= 0 ? button('goods', `Send ${goods}`, peace.amount, `Fetched from your stores and sent to ${name}: when it arrives, the threat is lifted${out ? ' and the band turns back, if it has not already done its worst' : ''}`) : ''}${r.phase === 'threat' ? button('refuse', 'Refuse', undefined, `${cap(they)} sends ${his} ${r.loan ? 'army' : 'raiders'} at once`) : ''}</div>`;
  // When what you send would arrive (or what you sent will), against the day and the band.
  let eta = '';
  if (map && d.gift) {
    const g = s.world.gifts.find((x) => x.id === d.gift);
    if (g) {
      const at = arrivesAt(s, map, g);
      eta = `<p class="eta sent">${esc(giftNews(s, g))}. It arrives about ${esc(dayWords(at))}${r.phase === 'threat' ? `; ${they} waits for it` : out ? (at < edge ? ', before the raiders reach your land' : ', after the raiders reach your land') : ''}.</p>`;
    }
  } else if (map && live(r) && r.alt >= 0) {
    const at = goodsArrive(s, map, r);
    if (at > 0) eta = `<p class="eta">The ${esc(goods)}, sent now, would reach ${esc(name)} about ${esc(dayWords(at))}${r.phase === 'threat' ? (at <= d.due ? ', before the day' : `, after the day (${they} waits for what is on its way)`) : out ? (at < edge ? ', before the raiders reach your land' : ', after the raiders reach your land: only coin turns them back now') : ''}.</p>`;
  }
  const mood = moodOf(c, s.tick);
  const ifs = r.loan
    ? live(r)
      ? `Paid, the loan is repaid (Greece still remembers it went unpaid). Not paid, what ${his} men carry off comes off the debt; if they are beaten off with nothing, the debt stands and ${they} sends again about four months later. No gift calls them off.`
      : ''
    : live(r)
    ? `Paid: ${signed(peace.amount)}, ${fadeWords(peace.fade)}, and no threat from ${them(c)} for a year. Raided: ${his} anger is partly spent (${signed(answerMemory(c, 'spent', '', s.tick).amount)}), and no threat from ${them(c)} for two years. A gift that warms ${them(c)} past cold (${signed(mood)} now; cold ends at ${signed(COLD)}) calls them off too.`
    : '';
  return `<div class="deal threat${d.gift ? ' sent' : ''}">${dealIcon(d)}<div><b>${esc(head)}</b>. <span class="why">${esc(cap(d.why))}.</span>
<p>${esc(where)}</p>${acts}${eta}${ifs ? `<p class="if">${esc(ifs)}</p>` : ''}</div></div>`;
}

const them = (c: ReturnType<typeof cityOf>): string => (c.ruler?.female ? 'her' : 'him');

/** For an offer to buy your goods: what your stores hold beyond the keep figure, and whether that is too little for the deal (" Your storehouses hold 650 oil and keep 800: none goes until you keep less, on the Trade tab."). */
function spareWords(s: SimState, d: Deal): string {
  const ware = WARE_NAMES[TRADE_GOODS[d.good]];
  const holds = cityHolds(s, TRADE_GOODS[d.good]);
  const keep = s.trade.keep[d.good];
  const where = keptIn(d.good);
  if (holds <= keep) return ` Your ${where} hold ${fmt(holds)} ${ware} and keep ${fmt(keep)}: none goes until you make more or keep less (the Trade tab).`;
  return ` Your ${where} hold ${fmt(holds)} ${ware}, and keep ${fmt(keep)}.`;
}

/** "the king", "the archon", "the lady". */
function rulerTitle(c: ReturnType<typeof cityOf>): string {
  const t = (c.ruler?.title ?? '').replace(/ of .*/, '').toLowerCase();
  return t ? `the ${t}` : PLACES[c.id].name;
}

/** Your price with a city for a deal's good today (what the market pays or asks, with the terms). */
const yourPriceNow = (s: SimState, d: Deal): number => yourPrice(s.world, d.city, d.good, s.tick);

/** What a ruler asks of you, offers you, or demands: the deals open or running, at the top of their Ruler tab. */
function dealsHtml(s: SimState, id: CityId, map: CoastMap | undefined): string {
  const deals = liveDeals(s.world, id);
  if (!deals.length) return '';
  const c = cityOf(s.world, id);
  deals.sort((a, b) => Number(b.kind === 'threat') - Number(a.kind === 'threat'));
  const head = deals.some((d) => d.kind === 'threat') ? `What ${c.ruler?.female ? 'she' : 'he'} threatens` : deals.some((d) => d.kind === 'tribute') ? `What ${c.ruler?.female ? 'she' : 'he'} demands` : deals.every((d) => d.kind === 'offer' || d.kind === 'loanoffer') ? `What ${c.ruler?.female ? 'she' : 'he'} offers` : `What ${c.ruler?.female ? 'she' : 'he'} asks of you`;
  return `<section class="deals"><h3>${head}</h3>${deals.map((d) => dealHtml(s, d, map)).join('')}</section>`;
}

/**
 * The sea lane to a city (slice 26): pirates on it, the triremes guarding
 * it, and buttons to send one out or bring her home ('' when the city has no
 * lane with a pirates' place, or there is nothing to say).
 */
function laneHtml(s: SimState, id: CityId): string {
  const lane = LANES.find((l) => l.city === id);
  if (!lane) return '';
  const p = piratesOn(s, lane.way);
  const ts = s.fleet.triremes.filter((t) => afloat(t) && t.state !== 'building');
  const trades = s.world.routes.some((r) => r.city === id && r.kind === 'sea');
  if (!p && !ts.length && !trades) return '';
  const guards = guardsOf(s, lane.way);
  const lines: string[] = [];
  if (p) {
    const when = p.state === 'seen' ? `they start seizing what of yours passes there about ${dayWords(p.from)}` : `seizing what of yours passes there${p.took.length ? `: ${p.took.slice(-3).join(', ')}` : ''}`;
    lines.push(`<p><b>${esc(`Pirates ${p.place}`)}</b></p><p>${esc(`${p.ships} ${p.ships === 1 ? 'ship' : 'ships'}; ${when}.`)}</p>`);
  } else lines.push(`<p>${esc(`No pirates seen on the lane to ${PLACES[id].name}.`)}</p>`);
  for (const t of guards) lines.push(`<p>${esc(`${triremeDoing(s, t).replace(/^./, (c) => c.toUpperCase())}: the ${triremeName(t)}, ${Math.round(t.hp)}% sound.`)}</p>`);
  const rep = s.fleet.reports.filter((r) => r.way === lane.way).slice(-1)[0];
  if (rep) lines.push(`<p class="if"><small>${esc(dayWords(rep.tick))}</small> ${esc(rep.line)}.</p>`);
  const send = ts
    .filter((t) => !(t.order === 'lane' && t.lane === lane.way))
    .map((t) => {
      const no = guardRefusal(t, lane.way);
      return `<button data-guard="${t.id}" data-lane="${lane.way}" class="send" title="${esc(no || `She rows out of your bay and along the lane to ${PLACES[id].name}, and keeps watch ${lane.name}: what of yours passes there is safe`)}"${no ? ' disabled' : ''}>Send the ${esc(triremeName(t))} to guard it</button>`;
    });
  const home = guards.map((t) => `<button data-trihome="${t.id}" title="Back along the lane, into your bay and to her mooring">Bring the ${esc(triremeName(t))} home</button>`);
  const none = ts.length ? '' : '<p class="if"><small>A shipyard on your shore (B ×7) builds triremes that can guard the lane.</small></p>';
  return `<section class="deals lane"><h3>The sea lane</h3><div class="deal${p && !guards.length ? ' tribute' : ''}"><div>${lines.join('')}${send.length || home.length ? `<div class="acts">${send.join('')}${home.join('')}</div>` : none}</div></div></section>`;
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
  const tabName: Record<CityTab, string> = { ruler: 'Ruler', prices: 'Prices', trade: closed ? 'Trade · closed' : routes.length ? `Trade · ${routes.length} open` : 'Trade', loans: loansTabName(s, id), rivals: c.war ? 'Rivals · at war' : 'Rivals' };
  const tabs = CITY_TABS.map((k) => `<button data-tab="${k}"${k === tab ? ' class="on"' : ''}${k === 'trade' && closed ? ` title="${seizing(s.world, id) ? 'Closed over your unpaid debt: see the Loans tab' : 'The ruler has closed the way: see the Ruler tab'}"` : ''}>${tabName[k]}</button>`).join('');
  const pane = (k: CityTab, html: string): string => `<div class="pane" data-pane="${k}"${k === tab ? '' : ' hidden'}>${html}</div>`;
  return `<header class="ruler"><div class="kicker">${esc(place.name)} · ${esc(place.blurb)}</div>
<div class="who">${portrait(r, place.colour, w, 104)}<div><h2>${esc(r.name)}</h2><div class="from">${esc(r.title)}</div><ul class="traits">${traits}</ul></div></div>
<div class="moodline">${moodFace(w, 30)}<div><div class="word">${cap(w)} <span class="num">${signed(m)}</span></div><p class="terms" title="${esc(termsMeaning(s, id))}">${esc(termsLine(s, id))}</p></div></div>${statusHtml(s, id)}</header>
<nav class="citytabs">${tabs}</nav>
${pane('ruler', `${dealsHtml(s, id, map)}${laneHtml(s, id)}<section class="feel"><h3>How ${r.female ? 'she' : 'he'} feels about you</h3><ul class="whys">${reasons || '<li>Nothing either way yet</li>'}</ul></section>
${meansHtml(s, id)}
${giftsHtml(s, id, map)}${s.army.companies.length && !s.world.loans.some((l) => l.city === id && l.side === 'out' && l.state === 'overdue') ? `<details class="nocause"><summary>Send your soldiers against ${esc(place.name)}</summary>${soldiersHtml(s, id, false)}</details>` : ''}`)}
${pane('prices', pricesBlock(s, id, false))}
${pane('trade', `${waysHtml(s, id, false)}<section><h3>Getting there</h3><p class="line">${esc(REACH[id] ?? '')}</p></section>`)}
${pane('loans', tab === 'loans' ? loansTabHtml(s, id) : '')}
${pane('rivals', tab === 'rivals' ? rivalsHtml(s, id) : '')}`;
}

/** Every ruled city's mood in a word, for the probe and the smoke test. */
export const moods = (s: SimState): Record<string, string> => Object.fromEntries(RULED.map((id) => [id, moodWord(moodOf(cityOf(s.world, id), s.tick))]));
