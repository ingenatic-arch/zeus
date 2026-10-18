/**
 * Rulers who remember: what a ruler makes of what you do, and what they do
 * about it.
 *
 * A ruler's mood is the sum of their memories (world.ts: moodOf), each worth
 * what it was when it happened, fading evenly to nothing. This module adds
 * the memories your city makes this slice, bent by the ruler's personality:
 *
 * - your gifts (coin or goods), worth more the more generous they are for a
 *   city your size, less when they come too often;
 * - their trader turning back at your city (snubbed, in world.ts);
 * - a fickle ruler's whims, once your city has dealt with Greece.
 *
 * And what the mood does: the terms (world.ts: termsOf), a cold ruler's
 * traders coming half as often again and a hostile ruler closing their
 * routes until the mood mends (routes.ts reads `closed`), and a warm ruler
 * sending you gifts now and then. When a mood passes into another word, a
 * line of news says so and why.
 *
 * Gifts travel: yours in goods are fetched from the stores by the caravan
 * yard's porters or the trading post's dockers (trade.ts: their first job),
 * leave the city (a little caravan in your colours walking out to the edge of
 * the map, or a ship sailing out of the bay), then go along the road or the
 * lane on the map of Greece, a pure function of the tick; a gift counts when
 * it arrives. A ruler's gift comes along the way to your map's edge or your
 * gulf, and its coin goes into the treasury, its goods onto the yard or the
 * quay (or into the stores).
 *
 * Pure. What is random (a whim, a gift back) is a hash of Greece's seed, the
 * month and the city, so Greece's own generator (the harvests) draws exactly
 * as before; and rulers only act on you once your city has dealt with Greece
 * (`world.contact`), so a town that keeps to itself plays exactly as it did.
 */
import type { CoastMap } from '../map/bake';
import { CITY_IDS, EDGE_ALONG, HORIZON_ALONG, lineLength, PLACES, RULED, wayOf, wayPoints as tableWay, type CityId } from '../map/greece';
import { hash2 } from '../map/noise';
import { findBuilding } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from './clock';
import { held, setHeld, WARE_NAMES, type Ware } from './foods';
import { rateOf } from './labour';
import { caravanEntry, caravanYard, landTicks, routeWay, voyageTicks, type RouteKind } from './routes';
import { door } from './rounds';
import { roomFor } from './stores';
import type { Building, Gift, Memory, SimState, World, WorldCity } from './state';
import { note } from './stockbook';
import { berthOf, cityHolds, leaveTicks, shipAt, shipRoute, SHIP_LEAVING, storeKind, TRADE_GOODS, tradeIndex, tradingPost } from './trade';
import { income, pay, spendable } from './treasury';
import { newWalker, offMapPoint, roadPoints, setPath } from './walk';
import { cityOf, fadeFor, HOSTILE, MOOD_WORDS, moodLevel, moodOf, memoryWorth, rulerName, rulerShort, WARM } from './world';

/** What you can give: drachmas, or so many of a trade good. */
export const GIFT_COINS: readonly number[] = [100, 250, 500];
export const GIFT_LOTS: readonly number[] = [200, 400, 800];
/** A gift is remembered this long (bent by personality). */
export const GIFT_FADE = 18 * TICKS_PER_MONTH;
/** A gift worth this much (in mood) when it is just a fair one for your size; and the most one gift can be worth. */
export const GIFT_BASE = 20;
export const GIFT_MAX = 40;
/** Gifts that arrived this recently make the next count for less. */
export const SOON = 6 * TICKS_PER_MONTH;
/** A fair gift for your size: this much a head of your people, at least GIFT_FLOOR. */
const FAIR_A_HEAD = 0.5;
const GIFT_FLOOR = 200;
/** A gift by sea casts off from this far in along her way (beside the jetty, not at it). */
const CAST_OFF = 0.92;
/** The longest your porters take to fetch a gift: after this it goes with what there is. */
const GATHER_MOST = 3 * TICKS_PER_MONTH;

/** Whims: how often a fickle ruler has one (a month in so many), how big, and how long they last. */
const WHIM_ODDS = 1 / 8;
const WHIM_LEAST = 10;
const WHIM_MOST = 30;
const WHIM_MONTHS = [4, 7];
/** Gifts back: how often a warm ruler sends one (a month in so many; devoted, twice as often), the least time between, and what they are worth (dr). */
const BACK_ODDS = 1 / 10;
const BACK_GAP = 8 * TICKS_PER_MONTH;
const BACK_LEAST = 150;
const BACK_MOST = 450;
/** None in the first months after your city first deals with Greece. */
const BACK_AFTER = 3 * TICKS_PER_MONTH;

const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const cityName = (id: CityId): string => PLACES[id].name;

/** "250 dr", "400 wine". */
export const giftWords = (good: number, amount: number): string => (good < 0 ? `${fmt(amount)} dr` : `${fmt(amount)} ${WARE_NAMES[TRADE_GOODS[good]]}`);

/** A fair gift for a city your size (dr): the gift that is worth GIFT_BASE to a ruler. */
export const fairGift = (s: SimState): number => Math.max(GIFT_FLOOR, Math.round((s.population * FAIR_A_HEAD) / 10) * 10);

/** What a gift is worth to the city it goes to (dr): drachmas, or the goods at its market price there. */
export function giftValue(s: SimState, to: CityId, good: number, amount: number): number {
  if (good < 0) return amount;
  return Math.round((amount * cityOf(s.world, to).price[good]) / 100);
}

/** Your gifts a ruler has had within SOON before a tick. */
const recentGifts = (c: WorldCity, tick: number): number => c.memories.filter((m) => m.kind === 'gift' && m.tick <= tick && tick - m.tick < SOON).length;

/**
 * The memory a gift makes when it arrives at a tick: 20 × √(its value ÷ a
 * fair gift for your size), at most 40, bent by the ruler's personality and
 * cut when it comes too soon after others; each bend named in the reason.
 */
export function giftMemory(s: SimState, c: WorldCity, good: number, amount: number, tick: number): Memory {
  const value = giftValue(s, c.id, good, amount);
  const fair = fairGift(s);
  let worth = GIFT_BASE * Math.sqrt(Math.max(0, value) / fair);
  const bends: string[] = [];
  const traits = c.ruler?.traits ?? [];
  if (good < 0 && traits.includes('greedy')) {
    worth *= 1.5;
    bends.push('greedy: loves coin');
  }
  if (traits.includes('generous')) {
    worth *= 1.25;
    bends.push('generous: remembers kindness');
  }
  if (traits.includes('shrewd')) {
    worth *= 0.8;
    bends.push('shrewd: hard to impress');
  }
  if (traits.includes('steadfast')) {
    worth *= 0.75;
    bends.push('steadfast: slow to change');
  }
  if (traits.includes('proud') && value < fair / 2) {
    worth *= 0.5;
    bends.push('meagre, for a city your size');
  }
  const n = recentGifts(c, tick);
  if (n > 0) {
    worth /= 1 + 0.7 * n;
    bends.push(n === 1 ? 'another so soon: kind, but…' : `the ${n + 1 === 3 ? 'third' : `${n + 1}th`} in six months: kind, but…`);
  }
  const amountNow = Math.max(1, Math.min(GIFT_MAX, Math.round(worth)));
  return {
    kind: 'gift',
    why: `your gift of ${giftWords(good, amount)}${bends.length ? ` (${bends.join('; ')})` : ''}`,
    amount: amountNow,
    tick,
    fade: fadeFor(c, GIFT_FADE, true),
  };
}

// ---------------------------------------------------------------------------
// Sending a gift.

/** How a gift to a city would go: by road or by sea, and from which depot (goods); or why it can't. */
export function giftWay(s: SimState, map: CoastMap, city: CityId, coin: boolean): { by: RouteKind; depot: Building | null } | { why: string } {
  const land = routeWay(city, 'land');
  const sea = routeWay(city, 'sea');
  if (coin) return land ? { by: 'land', depot: null } : sea ? { by: 'sea', depot: null } : { why: 'No way leads there' };
  const yard = land ? caravanYard(s) : undefined;
  if (land && yard && caravanEntry(s, map.size, yard, city)) return { by: 'land', depot: yard };
  const post = sea ? tradingPost(s) : undefined;
  if (sea && post && berthOf(map, post)) return { by: 'sea', depot: post };
  if (land && yard) return { why: 'No road leads from the caravan yard to the edge of the map' };
  if (land && sea) return { why: 'Goods go from a caravan yard by road, or from the trading post by sea: build one' };
  if (land) return { why: 'Goods go by road from a caravan yard: build one' };
  return { why: 'Goods go by sea from the trading post: build one' };
}

/** A gift of yours on its way to a city (fetching, leaving or on the road), if there is one. */
export const giftTo = (w: World, city: CityId): Gift | undefined => w.gifts.find((g) => g.from === 'home' && g.to === city);
/** A ruler's gift on its way to you, if there is one. */
export const giftFrom = (w: World, city: CityId): Gift | undefined => w.gifts.find((g) => g.from === city);

/** Why a gift can't be sent now, or '' if it can: `ware` a ware number, or -1 for drachmas. */
export function giftRefusal(s: SimState, map: CoastMap, city: CityId | string, ware: number, amount: number): string {
  if (!RULED.includes(city as CityId)) return 'There is no ruler there to give to';
  const id = city as CityId;
  if (giftTo(s.world, id)) return `Your gift to ${cityName(id)} is still on its way`;
  if (ware < 0) {
    if (!GIFT_COINS.includes(amount)) return 'Not a gift you can send';
    if (spendable(s) < amount) return `The treasury can’t spare ${fmt(amount)} dr now`;
    return '';
  }
  const k = Number.isInteger(ware) ? tradeIndex(ware as Ware) : -1;
  if (k < 0 || !GIFT_LOTS.includes(amount)) return 'Not a gift you can send';
  if (cityHolds(s, ware as Ware) < amount) return `Your ${storeKind(ware as Ware) === 'granary' ? 'granaries hold' : 'storehouses hold'} less than ${fmt(amount)} ${WARE_NAMES[ware as Ware]}`;
  const way = giftWay(s, map, id, false);
  return 'why' in way ? way.why : '';
}

/** Where a way's far end is along it, and the way's id. */
const wayFor = (city: CityId, by: RouteKind): { id: string; L: number } => {
  const w = routeWay(city, by);
  const id = w ? w.way : `${city}-${by}`;
  return { id, L: w ? lineLength(tableWay(wayOf(id))) : 0 };
};

/** Send a gift (a command; nothing if giftRefusal says no). Coin is paid at once and a herald sets off; goods are fetched first. */
export function sendGift(s: SimState, map: CoastMap, city: CityId | string, ware: number, amount: number): void {
  if (giftRefusal(s, map, city, ware, amount) !== '') return;
  const id = city as CityId;
  const w = s.world;
  const coin = ware < 0;
  const way = giftWay(s, map, id, coin) as { by: RouteKind; depot: Building | null };
  const { id: wayId, L } = wayFor(id, way.by);
  const g: Gift = {
    id: w.nextGift++,
    from: 'home',
    to: id,
    good: coin ? -1 : tradeIndex(ware as Ware),
    amount,
    got: 0,
    by: way.by,
    way: wayId,
    phase: 0,
    at: s.tick,
    depot: way.depot?.id ?? 0,
    start: 0,
    dur: 0,
    a0: 0,
    a1: L,
    ship: null,
    note: '',
  };
  if (coin) {
    pay(s, -amount, 'gifts', `to ${cityName(id)}`);
    g.got = amount;
    // A herald takes it from your city along the way: as long as a trader takes, and a day to set out.
    onTheWay(g, s.tick, 0, L, (way.by === 'land' ? landTicks(id) : voyageTicks(id) + 3 * TICKS_PER_DAY) + TICKS_PER_DAY);
  }
  w.gifts.push(g);
  if (!w.contact) w.contact = Math.max(1, s.tick);
  s.rev++;
}

/** A gift sets off along its way on the map of Greece. */
function onTheWay(g: Gift, tick: number, a0: number, a1: number, dur: number): void {
  g.phase = 2;
  g.start = tick;
  g.dur = Math.max(1, dur);
  g.a0 = a0;
  g.a1 = a1;
  g.ship = null;
}

/** What your porters or dockers have in hand for a gift: on their way to fetch it, and carrying it back. */
export function giftInHand(s: SimState, g: Gift): number {
  let n = 0;
  for (const d of s.walkers) if (d.kind === 'docker' && d.cheese === g.id) n += d.back ? d.load : d.meat;
  return n;
}

/** The little caravan taking a gift out of the city, if it is walking. */
export const giftCaravan = (s: SimState, g: Gift): SimState['walkers'][number] | undefined => s.walkers.find((x) => x.kind === 'caravan' && x.cheese === g.id);

/** How many donkeys carry a gift of goods. */
const donkeysFor = (amount: number): number => (amount >= 800 ? 4 : amount >= 400 ? 3 : 2);

/** Your gift of goods is all fetched (or the stores ran out): it leaves the city. */
function leave(s: SimState, map: CoastMap, g: Gift): void {
  const w = s.world;
  if (g.got <= 0) {
    // Nothing could be fetched: the gift is given up.
    w.gifts = w.gifts.filter((x) => x !== g);
    news(w, s.tick, g.to, `Your gift for ${cityName(g.to)} was given up: there was no ${WARE_NAMES[TRADE_GOODS[g.good]]} in the stores to send`);
    return;
  }
  g.amount = g.got;
  note(s, TRADE_GOODS[g.good], 'sold', `gift:${g.to}`, g.got);
  const depot = findBuilding(s, g.depot);
  const { L } = wayFor(g.to, g.by);
  g.phase = 1;
  g.start = s.tick;
  if (g.by === 'land') {
    const entry = depot ? caravanEntry(s, map.size, depot, g.to) : null;
    if (!depot || !entry) {
      onTheWay(g, s.tick, EDGE_ALONG, L, landTicks(g.to));
      return;
    }
    // Out through the streets to the edge on that city's side, the way its caravans come in.
    const tiles = entry.tiles.slice().reverse();
    const c = newWalker(s, 'caravan', donkeysFor(g.amount));
    c.origin = depot.id;
    c.food = CITY_IDS.indexOf('home');
    c.home = entry.edge;
    c.back = true;
    c.cheese = g.id;
    c.since = s.tick;
    const [dx, dz] = door(map.size, depot, tiles[0]);
    const [ox, oz] = offMapPoint(map.size, entry.edge);
    setPath(c, [[dx, dz, -1], ...roadPoints(s, map.size, tiles), [ox, oz, -1]]);
    s.walkers.push(c);
    s.looks++;
    return;
  }
  const berth = depot ? berthOf(map, depot) : null;
  if (!berth) {
    onTheWay(g, s.tick, HORIZON_ALONG, L, voyageTicks(g.to));
    return;
  }
  // She casts off from beside the jetty and sails out of the bay, as a ship leaves.
  g.ship = { phase: SHIP_LEAVING, since: s.tick, turned: CAST_OFF, path: shipRoute(map, berth) };
}

/** A gift arrives: yours makes a memory (and maybe a line of news as the mood turns); a ruler's goes into your treasury or stores. */
function arrive(s: SimState, g: Gift): void {
  const w = s.world;
  w.gifts = w.gifts.filter((x) => x !== g);
  if (g.from === 'home') {
    const c = cityOf(w, g.to);
    if (!c.ruler) return;
    const m = giftMemory(s, c, g.good, g.amount, s.tick);
    c.memories.push(m);
    const words = giftWords(g.good, g.amount);
    const turn = settleMood(s, c, `your gift of ${words}`, true);
    const pleased = m.amount >= 15 ? 'is delighted' : m.amount >= 6 ? 'is pleased' : 'is pleased, a little';
    // (The turn's line names the gift as its cause: here it is said once, at the start.)
    news(w, s.tick, g.to, turn ? `Your gift of ${words} reached ${cityName(g.to)} (+${m.amount}): ${turn.replace(/: your gift of .*$/, '')}` : `Your gift of ${words} reached ${cityName(g.to)}: ${rulerShort(c)} ${pleased} (+${m.amount})`);
    return;
  }
  // A ruler's gift to you.
  const c = cityOf(w, g.from);
  const name = cityName(g.from);
  if (g.good < 0) income(s, g.amount, 'given', `from ${name}`);
  else {
    const ware = TRADE_GOODS[g.good];
    let left = g.amount;
    // Onto the caravan yard or the quay, for the porters or dockers to carry to the stores; or straight into the stores.
    const depot = g.by === 'land' ? caravanYard(s) : tradingPost(s);
    if (depot) {
      const room = depot.kind === 'yard' ? 1600 - held(depot, ware) : 2400 - held(depot, ware);
      const n = Math.max(0, Math.min(left, room));
      setHeld(depot, ware, held(depot, ware) + n);
      left -= n;
    }
    for (const b of s.buildings) {
      if (left <= 0) break;
      if (b.kind !== storeKind(ware)) continue;
      const n = Math.min(left, roomFor(b, ware));
      if (n <= 0) continue;
      setHeld(b, ware, held(b, ware) + n);
      left -= n;
    }
    const got = g.amount - left;
    if (got > 0) note(s, ware, 'bought', `gift:${g.from}`, got);
    s.looks++;
    g.amount = got;
  }
  news(w, s.tick, g.from, `A gift from ${name}: ${rulerShort(c)} sends you ${giftWords(g.good, g.amount)}, ${g.note}`);
  s.rev++;
}

/** Your gifts and the rulers', once a tick: fetching, leaving the city, travelling, arriving. Nothing happens with none on the way. */
export function stepGifts(s: SimState, map: CoastMap): void {
  const w = s.world;
  if (w.gifts.length === 0) return;
  for (const g of w.gifts.slice()) {
    if (g.phase === 0) {
      const depot = findBuilding(s, g.depot);
      const inHand = giftInHand(s, g);
      // All fetched; or nothing more to fetch (none in the stores, none in hand), or the depot gone, or it has taken too long: it goes with what there is.
      const done = g.got >= g.amount || (inHand === 0 && (cityHolds(s, TRADE_GOODS[g.good]) <= 0 || !depot || s.tick - g.at >= GATHER_MOST));
      if (done) leave(s, map, g);
    } else if (g.phase === 1) {
      const { L } = wayFor(g.to, g.by);
      if (g.by === 'land') {
        if (!giftCaravan(s, g)) onTheWay(g, s.tick, EDGE_ALONG, L, landTicks(g.to));
      } else if (!g.ship || s.tick >= g.ship.since + leaveTicks(g.ship)) onTheWay(g, s.tick, HORIZON_ALONG, L, voyageTicks(g.to));
    } else if (s.tick >= g.start + g.dur) arrive(s, g);
  }
}

/** Where a gift is on the map of Greece at a tick: a distance along its way from your city (0 at your quay), and which way it goes; null while it is still in your city. */
export function giftOnMap(g: Gift, tick: number): { along: number; homeward: boolean } | null {
  const toThem = g.from === 'home';
  if (g.phase === 1 && g.by === 'sea' && g.ship) {
    // Sailing out of the bay: where she is in it, as the city sees her (the horizon is the gulf's mouth).
    const at = shipAt(g.ship, tick);
    return { along: HORIZON_ALONG * (1 - (at ? at.inward : 0)), homeward: true };
  }
  if (g.phase !== 2) return null;
  const u = Math.max(0, Math.min(1, (tick - g.start) / g.dur));
  return { along: g.a0 + (g.a1 - g.a0) * u, homeward: toThem };
}

// ---------------------------------------------------------------------------
// The mood: its turns, the routes it closes, whims and gifts back.

/** A line of news from Greece. */
function news(w: World, tick: number, city: CityId, line: string): void {
  w.news.push({ tick, city, line });
  if (w.news.length > 12) w.news.splice(0, w.news.length - 12);
}

/** "the road", "the sea route", "the road and the sea route". */
function waysWords(kinds: RouteKind[]): string {
  const ws = kinds.map((k) => (k === 'land' ? 'the road' : 'the sea route'));
  return ws.length === 2 ? `${ws[0]} and ${ws[1]}` : (ws[0] ?? 'the way');
}

/** Why a mood moved, when nothing named it: what was added today, or what is fading the way it moved. */
function causeOf(c: WorldCity, tick: number, up: boolean): string {
  const today = c.memories.filter((m) => tick - m.tick <= TICKS_PER_DAY && m.tick <= tick && m.amount !== 0 && m.amount > 0 === up);
  if (today.length) return today[today.length - 1].why;
  let best: Memory | null = null;
  let bw = 0;
  for (const m of c.memories) {
    if (m.fade <= 0) continue;
    const v = memoryWorth(m, tick);
    // Moving up: a bad memory fading; moving down: a good one.
    if ((up ? v < 0 : v > 0) && Math.abs(v) >= bw) {
      bw = Math.abs(v);
      best = m;
    }
  }
  return best ? `${best.why}, and that is fading` : '';
}

/**
 * Bring what follows from a ruler's mood up to date: their routes closed when
 * hostile and opened again when not, and the word for their mood. Returns the
 * line of news for a turn ('' if the word is the same), with `cause`, or the
 * newest reason, named in it.
 */
export function settleMood(s: SimState, c: WorldCity, cause = '', named = false): string {
  if (!c.ruler) return '';
  const mood = moodOf(c, s.tick);
  const hostile = mood <= HOSTILE;
  const closed: RouteKind[] = [];
  const opened: RouteKind[] = [];
  for (const r of s.world.routes) {
    if (r.city !== c.id) continue;
    if (hostile && r.closed === 0) {
      r.closed = s.tick;
      closed.push(r.kind);
    } else if (!hostile && r.closed > 0) {
      r.closed = 0;
      opened.push(r.kind);
    }
  }
  if (closed.length || opened.length) s.rev++;
  const lvl = moodLevel(mood);
  if (lvl === c.feel) return '';
  const up = lvl > c.feel;
  c.feel = lvl;
  const name = named ? rulerShort(c) : rulerName(c);
  const why = cause || causeOf(c, s.tick, up);
  const word = MOOD_WORDS[lvl];
  const because = why ? `: ${why}` : '';
  if (closed.length) return `${name} is hostile now, and has closed ${waysWords(closed)} to your city${because}`;
  // Warming into cordial or better, softening while still wary or worse; cooling while still cordial or better, turning below it.
  const turn = up ? (lvl >= 3 ? `${name} has warmed to you, ${word} now` : `${name} has softened towards you, ${word} now`) : lvl >= 3 ? `${name} has cooled towards you, ${word} now` : `${name} has turned ${word} towards you`;
  return `${turn}${opened.length ? `, and has opened ${waysWords(opened)} again` : ''}${because}`;
}

/** Greece's dice for a month and a city (a hash: Greece's own generator, and the harvests it draws, are never touched). */
const dice = (w: World, month: number, i: number, salt: number): number => hash2(month, i * 31 + salt, (w.seed ^ 0x6d656d) | 0);

/**
 * The rulers, once a day: each mood's turns (a line of news) and its routes
 * closed or opened. On the first of each month, once your city has dealt with
 * Greece: a fickle ruler's whims, and a warm ruler's gifts back.
 */
export function stepDiplomacy(s: SimState): void {
  if (s.tick % TICKS_PER_DAY !== 0) return;
  const w = s.world;
  for (const c of w.cities) {
    if (!c.ruler) continue;
    const line = settleMood(s, c);
    // (A town that keeps to itself hears nothing of moods drifting as first impressions fade: its lines under the top bar stay as they were.)
    if (line && w.contact) news(w, s.tick, c.id, line);
  }
  if (s.tick % TICKS_PER_MONTH !== 0 || !w.contact) return;
  const month = Math.floor(s.tick / TICKS_PER_MONTH);
  w.cities.forEach((c, i) => {
    if (!c.ruler) return;
    whim(s, c, month, i);
    giftBack(s, c, month, i);
  });
}

/** A fickle ruler, now and then, takes a fancy to your city or a dislike to it, for a few months. */
function whim(s: SimState, c: WorldCity, month: number, i: number): void {
  const w = s.world;
  if (!c.ruler?.traits.includes('fickle')) return;
  if (c.memories.some((m) => m.kind === 'whim' && memoryWorth(m, s.tick) !== 0)) return;
  if (dice(w, month, i, 1) >= WHIM_ODDS) return;
  const up = dice(w, month, i, 2) < 0.5;
  const size = WHIM_LEAST + Math.round(dice(w, month, i, 3) * (WHIM_MOST - WHIM_LEAST));
  const months = WHIM_MONTHS[0] + Math.floor(dice(w, month, i, 4) * (WHIM_MONTHS[1] - WHIM_MONTHS[0] + 1));
  c.memories.push({
    kind: 'whim',
    why: up ? 'in high good humour with your city, for now' : 'in a black temper with your city, for now',
    amount: up ? size : -size,
    tick: s.tick,
    fade: months * TICKS_PER_MONTH,
  });
  const line = settleMood(s, c);
  if (line) news(w, s.tick, c.id, line);
}

/** A warm ruler, now and then, sends you a gift: drachmas, or goods they make plenty of. */
function giftBack(s: SimState, c: WorldCity, month: number, i: number): void {
  const w = s.world;
  const r = c.ruler;
  if (!r) return;
  const mood = moodOf(c, s.tick);
  if (mood < WARM || s.tick - w.contact < BACK_AFTER || (c.gave > 0 && s.tick - c.gave < BACK_GAP) || giftFrom(w, c.id)) return;
  let odds = BACK_ODDS * (moodLevel(mood) >= 5 ? 2 : 1);
  if (r.traits.includes('generous')) odds *= 2;
  if (r.traits.includes('greedy')) odds *= 0.5;
  if (dice(w, month, i, 5) >= odds) return;
  const value = BACK_LEAST + dice(w, month, i, 6) * (BACK_MOST - BACK_LEAST);
  // Goods they make plenty of (more often than coin), worth about the same, or drachmas.
  const sells = TRADE_GOODS.map((_, k) => k).filter((k) => c.make[k] > c.need[k] * 1.15);
  let good = -1;
  let amount = Math.round(value / 50) * 50;
  if (sells.length && dice(w, month, i, 7) < 0.6) {
    good = sells[Math.floor(dice(w, month, i, 8) * sells.length)];
    amount = Math.max(200, Math.min(800, Math.round((value * 100) / Math.max(1, c.price[good]) / 50) * 50));
  }
  const by: RouteKind = routeWay(c.id, 'land') ? 'land' : 'sea';
  const { id: way, L } = wayFor(c.id, by);
  const yours = c.memories.some((m) => m.kind === 'gift' && s.tick - m.tick < 12 * TICKS_PER_MONTH);
  const g: Gift = {
    id: w.nextGift++,
    from: c.id,
    to: 'home',
    good,
    amount,
    got: amount,
    by,
    way,
    phase: 2,
    at: s.tick,
    depot: 0,
    start: 0,
    dur: 0,
    a0: L,
    a1: L,
    ship: null,
    note: yours ? 'in return for your gifts' : moodLevel(mood) >= 5 ? 'out of friendship' : 'in thanks for your friendship',
  };
  onTheWay(g, s.tick, L, by === 'land' ? EDGE_ALONG : HORIZON_ALONG, by === 'land' ? landTicks(c.id) : voyageTicks(c.id));
  w.gifts.push(g);
  c.gave = s.tick;
}

// ---------------------------------------------------------------------------
// What the panels say.

/** A gift on its way, in words, for the panels and tips. */
export function giftNews(s: SimState, g: Gift): string {
  const days = (t: number): string => {
    const d = Math.max(1, Math.ceil((t - s.tick) / TICKS_PER_DAY));
    return d === 1 ? '1 day' : `${d} days`;
  };
  const words = giftWords(g.good, g.amount);
  if (g.from !== 'home') return `${cityName(g.from)}’s gift of ${words} is on its way to you: at ${g.by === 'land' ? 'the edge of your map' : 'your gulf'} in ${days(g.start + g.dur)}`;
  const to = cityName(g.to);
  if (g.phase === 0) {
    const depot = findBuilding(s, g.depot);
    const where = depot?.kind === 'yard' ? 'the caravan yard' : 'the quay';
    const who = depot?.kind === 'yard' ? 'porters' : 'dockers';
    const stalled = depot && rateOf(depot) === 0 ? `: ${where} has no workers to fetch it` : '';
    return `Your gift of ${words} for ${to}: the ${who} are fetching it from the stores to ${where} (${fmt(g.got)} there so far)${stalled}`;
  }
  if (g.phase === 1) return g.by === 'land' ? `Your gift of ${words} is leaving the city for ${to}, by the road out` : `Your gift of ${words} is sailing out of the bay for ${to}`;
  return `Your gift of ${words} is on its way to ${to}: it arrives in ${days(g.start + g.dur)}`;
}
