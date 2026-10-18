/**
 * Favours, offers and tribute: what the rulers ask of you, and what your
 * answer does.
 *
 * - **Requests.** Now and then a ruler who is wary or better asks for goods
 *   (or drachmas) by a deadline, and says why. You can promise it, send it,
 *   refuse it, or let it run out. What you send leaves the city as a gift
 *   does (diplomacy.ts: fetched by the yard's porters or the post's dockers,
 *   then out by caravan or ship and along the road or the lane) and counts
 *   when it arrives. Sent in time it lifts the mood a good deal; late, half
 *   as much; refused it costs some, let run out a little less, and a promise
 *   broken costs the most and fades slowest.
 * - **Offers.** A pleased ruler with a route open now and then offers a deal
 *   for a year: to buy a good of yours at their usual price however much you
 *   sell, or to sell you one at a fifth off. Taking one is a promise too: at
 *   the end of its year, a deal you barely used is a promise broken.
 * - **Tribute.** A proud or warlike ruler who is wary of you or worse, and
 *   whose city is far stronger than yours, can demand tribute, once or
 *   yearly. Paying lifts the mood a little; refusing costs a lot, and from a
 *   ruler who is cold or worse it is where threats will come from (slice 20:
 *   `angered`).
 *
 * They start only once your city has opened its first route, never in the
 * six months after it; no ruler has two open at once, and Greece no more
 * than two. What is random is a hash of Greece's seed, the month and the
 * city (as a whim is), so Greece's own generator and its harvests draw
 * exactly as before, and a town that keeps to itself is never asked anything.
 * Pure.
 */
import type { CoastMap } from '../map/bake';
import { PLACES, RULED, type CityId } from '../map/greece';
import { hash2 } from '../map/noise';
import { findBuilding } from './buildings';
import { dateOfTick, formatYear, TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { dispatch, fairGift, giftWay, giftWords, heraldTicks, news, settleMood } from './diplomacy';
import { HANDLE } from './food';
import { answerThreat, peaceArrived, threatFromTribute, threatLive, threatRefusal } from './raids';
import { WARE_NAMES, held } from './foods';
import { rateOf } from './labour';
import { roadSearch, nearestReached } from './roads';
import { roadsBeside } from './rounds';
import { caravanEntry, landTicks, routeOf, voyageTicks, yearlyLimit } from './routes';
import type { Deal, Gift, Memory, SimState, Walker, World, WorldCity } from './state';
import { berthOf, cityHolds, DOCKER_GAP, DOCKER_TAKE, leaveTicks, SAIL_OUT, shipRoute, SHIP_LEAVING, storeKind, TRADE_GOODS } from './trade';
import { spendable } from './treasury';
import { SENDING_FETCH_SPEED, SENDING_SPEED } from './walk';
import { cityOf, COLD, fadeFor, moodOf, rulerName, rulerShort, sellsAndBuys, yourPrice } from './world';

// ---------------------------------------------------------------------------
// The numbers.

/** None until this long after your city's first route. */
export const ASK_AFTER = 6 * TICKS_PER_MONTH;
/** No more than this many open across Greece. */
export const MOST_OPEN = 2;
/** A ruler waits this long after their last deal was settled before the next. */
const ASK_GAP = 3 * TICKS_PER_MONTH;
/** Greece waits this long after any ruler's last new deal before the next (so they come now and then, not one on another's heels). */
export const GREECE_GAP = 2 * TICKS_PER_MONTH;

/** Requests: how often (a month in so many), three times as often after a poor or failed harvest (for four months); how big (a share of a fair gift, in measures and in coin); within how long. */
const REQUEST_ODDS = 1 / 14;
const HUNGRY_ODDS = 3;
const HUNGRY_FOR = 4 * TICKS_PER_MONTH;
const REQUEST_VALUE = 0.6;
const REQUEST_LEAST = 200;
const REQUEST_MOST = 1000;
const COIN_LEAST = 150;
const COIN_MOST = 1000;
/** Requests for coin now and then, even when they could ask for goods. */
const COIN_ODDS = 0.25;
export const REQUEST_GOODS_DAYS = 4 * TICKS_PER_MONTH;
export const REQUEST_COIN_DAYS = 2 * TICKS_PER_MONTH;

/** Offers: how pleased a ruler must be, how often (twice as often when warm), how long to answer, how long it runs. */
export const OFFER_PLEASED = 15;
const OFFER_ODDS = 1 / 10;
export const OFFER_ANSWER = 2 * TICKS_PER_MONTH;
export const OFFER_RUNS = TICKS_PER_YEAR;
/** A deal you take is kept if at least this share of its limit goes under it in its year. */
export const OFFER_KEPT = 0.25;
/** A sell offer's price: this share of today's. */
const OFFER_OFF = 0.8;
/** How much more than their usual yearly limit a ruler offers to buy. */
const OFFER_MORE = 1.25;
/** An offer to buy a good of yours needs this much of it in store beyond what the city keeps (or some sold this year). */
const OFFER_SPARE = 300;

/** Tribute: how often, never within two years of their last, how big (a fair gift's worth), yearly one time in three at three fifths of it, for three years; within how long. */
const TRIBUTE_ODDS = 1 / 10;
const TRIBUTE_GAP = 2 * TICKS_PER_YEAR;
const TRIBUTE_VALUE = 1;
const TRIBUTE_YEARLY = 1 / 3;
const TRIBUTE_YEARLY_SHARE = 0.6;
export const TRIBUTE_YEARS = 3;
export const TRIBUTE_DAYS = 3 * TICKS_PER_MONTH;

/** What each answer is worth to the mood, and how long it is remembered (before personality bends it). */
export const WORTH = {
  promise: 4,
  met: 25,
  refused: -15,
  lapsed: -10,
  broken: -35,
  paid: 8,
  defied: -30,
  taken: 5,
  kept: 8,
  reneged: -20,
  declined: -3,
  peace: 10,
  spent: 25,
} as const;
export const FADE = {
  met: 24 * TICKS_PER_MONTH,
  refused: 24 * TICKS_PER_MONTH,
  lapsed: 18 * TICKS_PER_MONTH,
  broken: 48 * TICKS_PER_MONTH,
  paid: 12 * TICKS_PER_MONTH,
  defied: 36 * TICKS_PER_MONTH,
  taken: 12 * TICKS_PER_MONTH,
  kept: 12 * TICKS_PER_MONTH,
  reneged: 36 * TICKS_PER_MONTH,
  declined: 6 * TICKS_PER_MONTH,
  peace: 12 * TICKS_PER_MONTH,
  spent: 18 * TICKS_PER_MONTH,
} as const;

/** How strong each ruled city is: about how many people it has (a city far bigger than yours can demand tribute). */
export const STRENGTH: Partial<Record<CityId, number>> = { athens: 7000, sparta: 6000, corinth: 5500, troy: 6500 };

/** What makes each trade good in your city (TRADE_GOODS order): a request asks for what you make or hold. */
const MAKERS = ['farm', 'lodge', 'dairy', 'press', 'pasture', 'winery'] as const;

const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const cityName = (id: CityId): string => PLACES[id].name;
/** "Corinth’s", "Athens’". */
const whose = (id: CityId): string => (cityName(id).endsWith('s') ? `${cityName(id)}’` : `${cityName(id)}’s`);
const round = (x: number, to: number): number => Math.round(x / to) * to;
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));
const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

// ---------------------------------------------------------------------------
// Looking deals up.

/** A deal by its id. */
export const dealOf = (w: World, id: number): Deal | undefined => w.deals.find((d) => d.id === id);
/** The deals waiting on an answer or on what you sent. */
export const openDeals = (w: World): Deal[] => w.deals.filter((d) => d.state === 'open');
/** A city's deal that is open or running (an offer taken), if any. */
export const liveDeals = (w: World, city: CityId): Deal[] => w.deals.filter((d) => d.city === city && (d.state === 'open' || d.state === 'taken'));
/** The tick your city's first route opened (0: none yet). */
export const firstRoute = (w: World): number => w.routes.reduce((a, r) => (a === 0 || r.opened < a ? Math.max(1, r.opened) : a), 0);
/** A good's words: "800 wheat", "300 dr". */
export const dealWords = (d: Pick<Deal, 'good' | 'amount'>): string => giftWords(d.good, d.amount);
/** A trade good's name. */
const goodName = (k: number): string => WARE_NAMES[TRADE_GOODS[k]];

/** An offer you have taken, running now, for a good with a city on one side ('buy': they buy from you), if there is one. */
export function offerOn(w: World, city: CityId, k: number, side: 'buy' | 'sell'): Deal | undefined {
  return w.deals.find((d) => d.kind === 'offer' && d.state === 'taken' && d.city === city && d.good === k && d.side === side);
}

/** How much more can go under an offer this year. */
export const offerLeft = (d: Deal): number => Math.max(0, d.amount - d.done);

/** Goods gone under an offer (routes.ts, as a trader pays). */
export function tradedUnder(d: Deal, n: number): void {
  d.done += n;
}

/** Your price under an offer for a hundred: theirs if better than the market's with their terms now. */
export function offerPrice(s: SimState, d: Deal): number {
  const market = yourPrice(s.world, d.city, d.good, s.tick);
  return d.side === 'buy' ? Math.max(d.price, market) : Math.min(d.price, market);
}

// ---------------------------------------------------------------------------
// The memories your answers make.

type Answer = 'promise' | 'met' | 'refused' | 'lapsed' | 'broken' | 'paid' | 'defied' | 'taken' | 'kept' | 'reneged' | 'declined' | 'peace' | 'spent';

/**
 * The memory an answer makes, bent by the ruler's personality (each bend
 * named): a generous ruler remembers help more and longer, a steadfast one
 * is slower to change either way, a proud one takes a refusal, a lapse or a
 * broken promise hard, a greedy one loves tribute in coin. `share` scales it
 * (late, or short).
 */
export function answerMemory(c: WorldCity, a: Answer, why: string, tick: number, share = 1, coin = false): Memory {
  const traits = c.ruler?.traits ?? [];
  let worth: number = WORTH[a];
  const bends: string[] = [];
  const good = worth > 0;
  if (a === 'promise') return { kind: 'promise', why, amount: worth, tick, fade: 0 };
  if (good && (a === 'met' || a === 'kept') && traits.includes('generous')) {
    worth *= 1.25;
    bends.push('generous: remembers kindness');
  }
  if (a === 'paid' && coin && traits.includes('greedy')) {
    worth *= 1.5;
    bends.push('greedy: loves coin');
  }
  if (!good && a !== 'declined' && traits.includes('proud')) {
    worth *= 1.5;
    bends.push('proud: takes it hard');
  }
  if (traits.includes('steadfast')) {
    worth *= 0.75;
    bends.push('steadfast: slow to change');
  }
  if (a === 'declined' && !traits.includes('proud')) worth = 0;
  worth *= share;
  const amount = Math.round(worth) === 0 && worth !== 0 ? Math.sign(worth) : Math.round(worth);
  return { kind: a, why: `${why}${bends.length ? ` (${bends.join('; ')})` : ''}`, amount, tick, fade: fadeFor(c, FADE[a as keyof typeof FADE], good) };
}

/** Remember an answer, and say so: the line of news, with the mood's turn if it turned. */
function remember(s: SimState, d: Deal, m: Memory, line: string): void {
  const c = cityOf(s.world, d.city);
  // (A promise stands only until what follows it: this deal's own, not an offer's year ending meanwhile.)
  if (m.kind !== 'promise' && d.promised) c.memories = c.memories.filter((x) => x.kind !== 'promise');
  if (m.amount !== 0) c.memories.push(m);
  const turn = settleMood(s, c, '§', true).replace(/: §$/, '');
  if (line) news(s.world, s.tick, d.city, `${line}${m.amount !== 0 ? ` (${signed(m.amount)})` : ''}${turn ? `. ${turn}` : ''}`);
  s.rev++;
}

/** A deal is settled. */
function close(s: SimState, d: Deal, state: Deal['state']): void {
  d.state = state;
  d.ended = s.tick;
  s.rev++;
}

// ---------------------------------------------------------------------------
// The rulers ask.

/** Greece's dice for a month, a city and a purpose (a hash: Greece's own generator, and the harvests it draws, are never touched). */
const dice = (w: World, month: number, i: number, salt: number): number => hash2(month, i * 37 + salt, (w.seed ^ 0x66617673) | 0);

/** Could your city send goods to a ruler at all (a caravan yard with a road out to theirs, or a trading post on a lane to them)? */
const canSendGoods = (s: SimState, map: CoastMap, city: CityId): boolean => !('why' in giftWay(s, map, city, false));

/** Does your city make a trade good (has the workplace that makes it)? */
const makes = (s: SimState, k: number): boolean => s.buildings.some((b) => b.kind === MAKERS[k]);

/** How strong a ruled city is against yours: its people, and whether it is far stronger (half as big again, or more). */
export function stronger(s: SimState, city: CityId): { theirs: number; far: boolean } {
  const theirs = STRENGTH[city] ?? 0;
  return { theirs, far: theirs >= s.population * 1.5 };
}

/** Can this ruler demand tribute of you now: proud or warlike, wary or worse, and far stronger? */
export function mayDemand(s: SimState, c: WorldCity): boolean {
  const t = c.ruler?.traits ?? [];
  return (t.includes('proud') || t.includes('warlike')) && moodOf(c, s.tick) < 0 && stronger(s, c.id).far;
}

/** A new deal (raids.ts makes threats with it). */
export function makeDeal(s: SimState, kind: Deal['kind'], city: CityId, good: number, amount: number, due: number, why: string): Deal {
  const w = s.world;
  const d: Deal = { id: w.nextDeal++, kind, city, good, amount, at: s.tick, due, state: 'open', why, promised: false, gift: 0, got: 0, ended: 0, side: '', price: 0, done: 0, until: 0, yearly: false, paid: 0, angry: false };
  w.deals.push(d);
  s.rev++;
  return d;
}

/** "four months", "two months". */
const monthsWords = (ticks: number): string => {
  const m = Math.round(ticks / TICKS_PER_MONTH);
  return m === 1 ? 'a month' : `${['', 'one', 'two', 'three', 'four', 'five', 'six'][m] ?? m} months`;
};

/** Why they ask for a good, in words. */
export function askWhy(c: WorldCity, k: number, tick: number): string {
  if (k === 0 && c.harvest <= 1 && tick - lastHarvestOf(tick) < HUNGRY_FOR) return c.harvest === 0 ? 'their harvest failed' : 'their harvest was poor';
  return ['their granaries run low', 'for the feasts at their table', 'their dairies make too little', 'their lamps and baths are short of oil', 'their weavers want for fleece', 'for their festivals and their table'][k];
}

/** The tick of the latest first of September at or before a tick (the harvest). */
function lastHarvestOf(tick: number): number {
  // (As world.ts counts it: September is month 8, the founding in March.)
  const since = (((tick + (2 - 8) * TICKS_PER_MONTH) % TICKS_PER_YEAR) + TICKS_PER_YEAR) % TICKS_PER_YEAR;
  return tick - since;
}

/** Why they ask for coin, in words, by the dice. */
const COIN_WHYS = ['to mend the walls of their city', 'to rebuild a temple struck by lightning', 'to pay for their games', 'to fit out new ships'];

/**
 * How long a ruler gives you for goods or coin: `base`, or longer if sending
 * it from your city would take most of that (they know how far your stores
 * are from the road): what it would take, a quarter again and a fortnight, in
 * whole months, at most eight.
 */
export function deadlineFor(s: SimState, map: CoastMap, city: CityId, good: number, amount: number, base: number): number {
  const t = sendTicks(s, map, { city, good, amount });
  if (t < 0) return base;
  const need = Math.ceil((t * 1.25 + 15 * TICKS_PER_DAY) / TICKS_PER_MONTH) * TICKS_PER_MONTH;
  return Math.min(8 * TICKS_PER_MONTH, Math.max(base, need));
}

/** A ruler asks for goods (a trade good's index) or drachmas (-1): a request with its deadline, and a line of news. */
export function makeRequest(s: SimState, map: CoastMap, c: WorldCity, good: number, amount: number, why: string): Deal {
  const days = deadlineFor(s, map, c.id, good, amount, good < 0 ? REQUEST_COIN_DAYS : REQUEST_GOODS_DAYS);
  const d = makeDeal(s, 'request', c.id, good, amount, s.tick + days, why);
  news(s.world, s.tick, c.id, `${rulerName(c)} asks for ${dealWords(d)} within ${monthsWords(days)}: ${why}`);
  return d;
}

/** What a request for a good from a city your size is: about three fifths of a fair gift in value, 200 to 1,000, and no more than three fifths of what your stores hold (half, if you don't make it). */
export function requestSize(s: SimState, c: WorldCity, k: number): number {
  const value = REQUEST_VALUE * fairGift(s);
  const n = clamp(round((value * 100) / Math.max(1, c.price[k]), 100), REQUEST_LEAST, REQUEST_MOST);
  return Math.min(n, Math.max(REQUEST_LEAST, Math.floor((cityHolds(s, TRADE_GOODS[k]) * (makes(s, k) ? 0.6 : 0.5)) / 100) * 100));
}
/** What a request for coin is, for a city your size. */
export const requestCoin = (s: SimState): number => clamp(round(REQUEST_VALUE * fairGift(s), 50), COIN_LEAST, COIN_MOST);

/** A ruler demands tribute: drachmas (-1) or goods, once or yearly. */
export function makeTribute(s: SimState, map: CoastMap, c: WorldCity, good: number, amount: number, yearly: boolean): Deal {
  const { theirs } = stronger(s, c.id);
  const he = c.ruler?.female ? 'the queen' : c.ruler?.title.startsWith('King') ? 'the king' : c.ruler?.title.startsWith('Archon') ? 'the archon' : 'the lord';
  const why = `${cityName(c.id)} is far stronger than your city (about ${fmt(theirs)} people to your ${fmt(s.population)}), and ${he} is ${moodOf(c, s.tick) <= COLD ? 'cold' : 'wary'} towards you`;
  const days = deadlineFor(s, map, c.id, good, amount, TRIBUTE_DAYS);
  const d = makeDeal(s, 'tribute', c.id, good, amount, s.tick + days, why);
  d.yearly = yearly;
  news(s.world, s.tick, c.id, `${rulerName(c)} demands ${dealWords(d)} in tribute${yearly ? ' every year' : ''}, within ${monthsWords(days)}: ${why}`);
  return d;
}

/** The tribute a ruler would demand of a city your size: a fair gift's worth (yearly, three fifths of it), in coin or goods they are short of. */
export function tributeSize(s: SimState, c: WorldCity, good: number, yearly: boolean): number {
  const value = TRIBUTE_VALUE * fairGift(s) * (yearly ? TRIBUTE_YEARLY_SHARE : 1);
  if (good < 0) return clamp(round(value, 50), 300, 2000);
  return clamp(round((value * 100) / Math.max(1, c.price[good]), 100), REQUEST_LEAST, 1600);
}

/** A pleased ruler offers a deal for a year: to buy a good of yours at their usual price however much you sell ('buy'), or to sell you one at a fifth off ('sell'). */
export function makeOffer(s: SimState, c: WorldCity, k: number, side: 'buy' | 'sell'): Deal {
  const today = yourPrice(s.world, c.id, k, s.tick);
  // (Buying: today's price, held for the year however much you sell, and a quarter more than they usually take; selling: a fifth off today's.)
  const price = side === 'buy' ? today : Math.max(1, Math.round(today * OFFER_OFF));
  const limit = yearlyLimit(s, c.id, k);
  const amount = side === 'buy' ? clamp(round(limit * OFFER_MORE, 100), 600, 4000) : limit;
  const why = side === 'buy' ? `${cityName(c.id)} is short of ${goodName(k)}, and ${rulerShort(c)} is pleased with your city` : `${cityName(c.id)} has ${goodName(k)} to spare, and ${rulerShort(c)} is pleased with your city`;
  const d = makeDeal(s, 'offer', c.id, k, amount, s.tick + OFFER_ANSWER, why);
  d.side = side;
  d.price = price;
  news(s.world, s.tick, c.id, `${rulerName(c)} offers ${offerWords(d)}`);
  return d;
}

/** What an offer is, in words: "to buy all the oil you can send for a year at today’s price, 90 a hundred, however much you sell, up to 2,000". */
export function offerWords(d: Deal): string {
  const name = goodName(d.good);
  return d.side === 'buy'
    ? `to buy all the ${name} you can send for a year at today’s price, ${d.price} a hundred, however much you sell, up to ${fmt(d.amount)}`
    : `you ${name} at a fifth off for a year, at ${d.price} a hundred, up to ${fmt(d.amount)}`;
}

/** Whether a ruler is free to ask now: no deal of theirs open, none settled in the last three months. */
function free(s: SimState, c: WorldCity): boolean {
  return !s.world.deals.some((d) => d.city === c.id && (d.state === 'open' || (d.ended > 0 && s.tick - d.ended < ASK_GAP)));
}

/** A year's offer of a ruler's that you took, still running (they make no other until it ends). */
const offerRunning = (w: World, city: CityId): boolean => w.deals.some((d) => d.city === city && d.kind === 'offer' && d.state === 'taken');

/**
 * On the first of each month, once your first route is six months old,
 * fewer than two deals are open and none was made in the last two months:
 * each ruler in turn, if free, may demand tribute (if they can), else ask a
 * favour (wary or better), else make an offer (pleased, with a route open,
 * and none of theirs running). One new deal at a time.
 */
function asks(s: SimState, map: CoastMap): void {
  const w = s.world;
  const first = firstRoute(w);
  if (!first || s.tick - first < ASK_AFTER || openDeals(w).length >= MOST_OPEN || threatLive(w)) return;
  if (w.deals.some((d) => s.tick - d.at < GREECE_GAP)) return;
  const month = Math.floor(s.tick / TICKS_PER_MONTH);
  for (let i = 0; i < w.cities.length; i++) {
    const c = w.cities[i];
    if (!c.ruler || !RULED.includes(c.id) || !free(s, c)) continue;
    if (tribute(s, map, c, month, i) || request(s, map, c, month, i) || offer(s, c, month, i)) return;
  }
}

function tribute(s: SimState, map: CoastMap, c: WorldCity, month: number, i: number): boolean {
  const w = s.world;
  if (!mayDemand(s, c)) return false;
  if (w.deals.some((d) => d.kind === 'tribute' && d.city === c.id && s.tick - Math.max(d.at, d.ended) < TRIBUTE_GAP)) return false;
  if (dice(w, month, i, 1) >= TRIBUTE_ODDS) return false;
  const { buys } = sellsAndBuys(c);
  const goods = canSendGoods(s, map, c.id) ? buys.filter((k) => makes(s, k) || cityHolds(s, TRADE_GOODS[k]) >= 400) : [];
  const good = goods.length && dice(w, month, i, 2) < 0.4 ? goods[Math.floor(dice(w, month, i, 3) * goods.length)] : -1;
  const yearly = dice(w, month, i, 4) < TRIBUTE_YEARLY;
  makeTribute(s, map, c, good, tributeSize(s, c, good, yearly), yearly);
  return true;
}

function request(s: SimState, map: CoastMap, c: WorldCity, month: number, i: number): boolean {
  const w = s.world;
  if (moodOf(c, s.tick) <= COLD) return false;
  const hungry = c.harvest <= 1 && s.tick - lastHarvestOf(s.tick) < HUNGRY_FOR;
  if (dice(w, month, i, 11) >= REQUEST_ODDS * (hungry ? HUNGRY_ODDS : 1)) return false;
  const { buys } = sellsAndBuys(c);
  const wants = hungry && !buys.includes(0) ? [0, ...buys] : buys;
  // (Goods only if your city could send them to them at all: a yard with a road out, or a post on a lane to them; else coin.)
  const goods = canSendGoods(s, map, c.id) ? wants.filter((k) => makes(s, k) || cityHolds(s, TRADE_GOODS[k]) >= 300) : [];
  // (After a poor or failed harvest they ask for wheat if you have it.)
  const good = hungry && goods.includes(0) ? 0 : goods.length && dice(w, month, i, 12) >= COIN_ODDS ? goods[Math.floor(dice(w, month, i, 13) * goods.length)] : -1;
  if (good < 0) makeRequest(s, map, c, -1, requestCoin(s), COIN_WHYS[Math.floor(dice(w, month, i, 14) * COIN_WHYS.length)]);
  else makeRequest(s, map, c, good, requestSize(s, c, good), askWhy(c, good, s.tick));
  return true;
}

/** Can this ruler make you an offer now: pleased, with a route of theirs open, and no year's deal of theirs already running? */
export function mayOffer(s: SimState, c: WorldCity): boolean {
  return moodOf(c, s.tick) >= OFFER_PLEASED && !offerRunning(s.world, c.id) && s.world.routes.some((r) => r.city === c.id && r.closed === 0);
}

/** The goods of yours a ruler would offer to buy: ones they are short of that your city makes and has to spare (some sold to a trader this year, or enough beyond the keep figure in store now), so the year's deal can be kept. */
export function offerGoods(s: SimState, c: WorldCity): number[] {
  return sellsAndBuys(c).buys.filter((k) => makes(s, k) && (s.world.routes.some((r) => r.sold[k] > 0) || cityHolds(s, TRADE_GOODS[k]) - s.trade.keep[k] >= OFFER_SPARE));
}

function offer(s: SimState, c: WorldCity, month: number, i: number): boolean {
  const w = s.world;
  if (!mayOffer(s, c)) return false;
  if (dice(w, month, i, 21) >= OFFER_ODDS * (moodOf(c, s.tick) >= 30 ? 2 : 1)) return false;
  const { sells } = sellsAndBuys(c);
  const yours = offerGoods(s, c);
  if (yours.length) makeOffer(s, c, yours[Math.floor(dice(w, month, i, 22) * yours.length)], 'buy');
  else if (sells.length) makeOffer(s, c, sells[Math.floor(dice(w, month, i, 23) * sells.length)], 'sell');
  else return false;
  return true;
}

// ---------------------------------------------------------------------------
// Each day: deadlines, offers running out, yearly tribute coming round.

/**
 * Once a day: deals past their deadline with nothing on its way are settled
 * (a promise broken, a request let run out, tribute ignored, an offer
 * lapsed), offers taken come to the end of their year (kept or broken) or
 * end with their route closed, yearly tribute comes round again; on the
 * first of the month, perhaps a new deal. Nothing at all before your city's
 * first route.
 */
export function stepFavours(s: SimState, map: CoastMap): void {
  if (s.tick % TICKS_PER_DAY !== 0) return;
  const w = s.world;
  if (w.routes.length === 0 && w.deals.length === 0) return;
  for (const d of w.deals.slice()) {
    if (d.kind === 'threat') continue; // (raids.ts)
    if (d.state === 'open' && s.tick >= d.due && d.gift === 0) overdue(s, map, d);
    else if (d.state === 'taken') running(s, d);
    else if (d.state === 'met' && d.kind === 'tribute' && d.yearly && d.paid < TRIBUTE_YEARS && d.until > 0 && s.tick >= d.until - TRIBUTE_DAYS) comesRound(s, d);
  }
  if (s.tick % TICKS_PER_MONTH === 0) {
    asks(s, map);
    // Deals settled over a year ago are let go.
    if (w.deals.some((d) => d.ended > 0 && s.tick - d.ended > TICKS_PER_YEAR && !(d.kind === 'tribute' && d.yearly && d.state === 'met' && d.paid < TRIBUTE_YEARS))) {
      w.deals = w.deals.filter((d) => !(d.ended > 0 && s.tick - d.ended > TICKS_PER_YEAR) || (d.kind === 'tribute' && d.yearly && d.state === 'met' && d.paid < TRIBUTE_YEARS));
    }
  }
}

/** A deal's deadline has passed and nothing is on its way. */
function overdue(s: SimState, map: CoastMap, d: Deal): void {
  const c = cityOf(s.world, d.city);
  const words = dealWords(d);
  if (d.kind === 'offer') {
    close(s, d, 'lapsed');
    news(s.world, s.tick, d.city, `${whose(d.city)} offer for ${goodName(d.good)} has lapsed unanswered`);
    return;
  }
  if (d.kind === 'request') {
    if (d.promised) {
      close(s, d, 'broken');
      remember(s, d, answerMemory(c, 'broken', `you promised them ${words} and it never came`, s.tick), `You promised ${cityName(d.city)} ${words} and none came by the day: ${rulerShort(c)} will not soon forget it`);
    } else {
      close(s, d, 'lapsed');
      remember(s, d, answerMemory(c, 'lapsed', `you ignored their request for ${words}`, s.tick), `${whose(d.city)} request for ${words} ran out unanswered`);
    }
    return;
  }
  defy(s, map, d, `you ignored their demand for tribute (${words})`, `You let ${whose(d.city)} demand for tribute run out`, 'lapsed');
}

/** Tribute refused (or ignored): a heavy memory, and from a ruler who is cold or worse, the start of threats (`angered`). */
function defy(s: SimState, map: CoastMap, d: Deal, why: string, line: string, state: 'refused' | 'lapsed'): void {
  const c = cityOf(s.world, d.city);
  const cold = moodOf(c, s.tick) <= COLD;
  close(s, d, state);
  remember(s, d, answerMemory(c, 'defied', why, s.tick), cold ? `${line}: ${rulerShort(c)} is cold towards you, and will not let it pass` : line);
  if (cold) angered(s, map, c, d);
}

/**
 * A tribute refused by a ruler who is cold or worse: a threat follows (a
 * deadline and a price of peace, then raiders; raids.ts), at once if no
 * other threat is live, else on a later month's turn (the deal is marked).
 */
export function angered(s: SimState, map: CoastMap, c: WorldCity, d: Deal): void {
  threatFromTribute(s, map, c, d);
}

/** An offer you took, running: it ends with its route closed (no blame), or at the end of its year, kept or broken. */
function running(s: SimState, d: Deal): void {
  const c = cityOf(s.world, d.city);
  const name = goodName(d.good);
  if (!s.world.routes.some((r) => r.city === d.city && r.closed === 0)) {
    close(s, d, 'ended');
    news(s.world, s.tick, d.city, `Your year’s deal with ${cityName(d.city)} for ${name} has ended: ${rulerShort(c)} has closed the way`);
    return;
  }
  if (s.tick < d.until) return;
  if (d.done >= d.amount * OFFER_KEPT) {
    close(s, d, 'kept');
    remember(s, d, answerMemory(c, 'kept', `you kept to the year’s deal for ${name}`, s.tick), `Your year’s deal with ${cityName(d.city)} for ${name} is done, and you kept your side (${fmt(d.done)} ${d.side === 'buy' ? 'sold' : 'bought'})`);
  } else {
    close(s, d, 'broken');
    remember(s, d, answerMemory(c, 'reneged', `you took up their offer for ${name}, and ${d.side === 'buy' ? 'sent' : 'bought'} too little`, s.tick), `Your year’s deal with ${cityName(d.city)} for ${name} is done, and you ${d.side === 'buy' ? 'sent' : 'bought'} only ${fmt(d.done)} of the ${fmt(Math.ceil(d.amount * OFFER_KEPT))} you were bound to`);
  }
}

/** A yearly tribute comes round again, three months before it is due; or ends, if the ruler has warmed to cordial. */
function comesRound(s: SimState, d: Deal): void {
  const c = cityOf(s.world, d.city);
  // (It waits a month at a time while its ruler has another deal open, two are open in Greece, or a threat is live: never stacking up badly.)
  const w = s.world;
  if (threatLive(w) || openDeals(w).length >= MOST_OPEN || w.deals.some((x) => x !== d && x.city === d.city && x.state === 'open')) {
    d.until = Math.max(d.until, s.tick + TRIBUTE_DAYS + TICKS_PER_MONTH);
    s.rev++;
    return;
  }
  if (moodOf(c, s.tick) >= 0 || !stronger(s, d.city).far) {
    d.yearly = false;
    d.until = 0;
    news(s.world, s.tick, d.city, `${rulerName(c)} asks no more tribute of your city`);
    s.rev++;
    return;
  }
  d.state = 'open';
  d.at = s.tick;
  d.due = d.until;
  d.until = 0;
  d.ended = 0;
  d.gift = 0;
  d.got = 0;
  news(s.world, s.tick, d.city, `${whose(d.city)} yearly tribute comes round again: ${dealWords(d)} ${dueWords(s, d)}`);
  s.rev++;
}

// ---------------------------------------------------------------------------
// Your answers (the `answer` command).

export type Act = 'promise' | 'send' | 'refuse' | 'take' | 'decline' | 'goods';

/** Why what you would send for a deal can't go now, or '' if it can (`way`: why goods can't go that way, if already known). */
export function sendRefusal(s: SimState, map: CoastMap, d: Deal, way?: string): string {
  if (d.state !== 'open' || (d.kind !== 'request' && d.kind !== 'tribute')) return 'Nothing to send';
  if (d.gift) return 'It is on its way';
  if (d.good < 0) return spendable(s) < d.amount ? `The treasury can’t spare ${fmt(d.amount)} dr now` : '';
  const w = TRADE_GOODS[d.good];
  if (cityHolds(s, w) < d.amount) return `Your ${storeKind(w) === 'granary' ? 'granaries hold' : 'storehouses hold'} ${fmt(cityHolds(s, w))} ${WARE_NAMES[w]}, less than ${fmt(d.amount)}`;
  if (way !== undefined) return way;
  const g = giftWay(s, map, d.city, false);
  return 'why' in g ? g.why : '';
}

/** Why an answer can't be given now, or '' if it can. */
export function answerRefusal(s: SimState, map: CoastMap, d: Deal | undefined, act: Act): string {
  if (!d || d.state !== 'open') return 'It is settled';
  if (d.kind === 'threat') return threatRefusal(s, map, d, act);
  if (act === 'goods') return 'Not a threat';
  if (act === 'send') return sendRefusal(s, map, d);
  if (act === 'promise') return d.kind !== 'request' ? 'Only a request can be promised' : d.promised ? 'You have promised it' : d.gift ? 'It is on its way' : '';
  if (act === 'refuse') return d.kind === 'offer' ? 'Decline an offer instead' : d.gift ? 'It is on its way' : '';
  if (act === 'take' || act === 'decline') return d.kind !== 'offer' ? 'Not an offer' : act === 'take' && !s.world.routes.some((r) => r.city === d.city && r.closed === 0) ? `No route to ${cityName(d.city)} is open` : '';
  return 'Not an answer';
}

/** Answer a deal (a command; nothing if answerRefusal says no). */
export function answer(s: SimState, map: CoastMap, id: number, act: string): void {
  const d = dealOf(s.world, id);
  if (!d || answerRefusal(s, map, d, act as Act) !== '') return;
  if (d.kind === 'threat') {
    answerThreat(s, map, d, act);
    return;
  }
  const c = cityOf(s.world, d.city);
  const words = dealWords(d);
  if (act === 'promise') {
    d.promised = true;
    remember(s, d, answerMemory(c, 'promise', `you promised them ${words}`, s.tick), '');
    return;
  }
  if (act === 'send') {
    const g = dispatch(s, map, d.city, d.good < 0 ? -1 : TRADE_GOODS[d.good], d.amount, d.id, d.kind === 'tribute' ? 'tribute' : 'favours');
    d.gift = g.id;
    s.rev++;
    return;
  }
  if (act === 'refuse') {
    if (d.kind === 'tribute') {
      defy(s, map, d, `you refused them tribute (${words})`, `You refused ${cityName(d.city)} its tribute of ${words}`, 'refused');
      return;
    }
    if (d.promised) {
      close(s, d, 'broken');
      remember(s, d, answerMemory(c, 'broken', `you promised them ${words}, then refused`, s.tick), `You went back on your promise of ${words} to ${cityName(d.city)}`);
      return;
    }
    close(s, d, 'refused');
    remember(s, d, answerMemory(c, 'refused', `you refused their request for ${words}`, s.tick), `You refused ${whose(d.city)} request for ${words}`);
    return;
  }
  if (act === 'take') {
    d.state = 'taken';
    d.until = s.tick + OFFER_RUNS;
    // Ticked for sale (or to buy) on your routes to them.
    for (const r of s.world.routes) {
      if (r.city !== d.city) continue;
      if (d.side === 'buy') r.sell[d.good] = true;
      else r.buy[d.good] = true;
    }
    remember(s, d, answerMemory(c, 'taken', `you took up their offer for ${goodName(d.good)}`, s.tick), '');
    return;
  }
  if (act === 'decline') {
    close(s, d, 'declined');
    remember(s, d, answerMemory(c, 'declined', `you turned down their offer for ${goodName(d.good)}`, s.tick), '');
  }
}

// ---------------------------------------------------------------------------
// What you sent arrives (diplomacy.ts calls these).

/** What you sent for a deal has arrived: a request met (late, or short), tribute paid (and a yearly one's next due date set). */
export function delivered(s: SimState, g: Gift): void {
  const d = dealOf(s.world, g.deal);
  if (d && d.kind === 'threat') {
    peaceArrived(s, g, d);
    return;
  }
  if (!d || d.state !== 'open') return;
  const c = cityOf(s.world, d.city);
  d.gift = 0;
  d.got = g.amount;
  const late = s.tick > d.due;
  const share = Math.min(1, g.amount / Math.max(1, d.amount));
  const short = share < 1 ? ` (only ${fmt(g.amount)} of the ${fmt(d.amount)} they asked for)` : '';
  const words = dealWords(d);
  if (d.kind === 'tribute') {
    d.paid++;
    close(s, d, 'met');
    if (d.yearly && d.paid < TRIBUTE_YEARS) d.until = d.due + TICKS_PER_YEAR;
    remember(s, d, answerMemory(c, 'paid', `you paid the tribute they demanded (${words})${short}`, s.tick, share, d.good < 0), `Your tribute of ${dealWords({ good: d.good, amount: g.amount })} reached ${cityName(d.city)}`);
    return;
  }
  close(s, d, late ? 'late' : 'met');
  const why = late ? `you sent the ${words} they asked for, late${short}` : `you sent the ${words} they asked for${short}`;
  remember(s, d, answerMemory(c, 'met', why, s.tick, share * (late ? 0.5 : 1)), `Your ${dealWords({ good: d.good, amount: g.amount })} reached ${cityName(d.city)}${late ? ', late' : ''}: ${rulerShort(c)} is ${late ? 'glad of it, late as it is' : 'grateful'}`);
}

/** What you sent for a deal could not go (nothing in the stores to fetch): it waits to be sent again. */
export function undelivered(s: SimState, g: Gift): void {
  const d = dealOf(s.world, g.deal);
  if (!d) return;
  d.gift = 0;
  news(s.world, s.tick, d.city, `The ${goodName(g.good)} for ${cityName(d.city)} could not be sent: there was none in the stores`);
  s.rev++;
}

// ---------------------------------------------------------------------------
// When it would arrive.

/** How long fetching so many of a good from the stores to a depot takes, about (ticks): the farthest store needed and back, the loading, and the porters setting off two days apart. */
function fetchTicks(s: SimState, map: CoastMap, depotId: number, k: number, amount: number): number {
  const depot = findBuilding(s, depotId);
  if (!depot || amount <= 0) return 0;
  const size = map.size;
  const search = roadSearch(s, size, roadsBeside(s, size, depot));
  const w = TRADE_GOODS[k];
  const stores: Array<[number, number]> = [];
  for (const b of s.buildings) {
    if (b.kind !== storeKind(w) || held(b, w) <= 0) continue;
    const at = nearestReached(search, roadsBeside(s, size, b));
    if (at >= 0) stores.push([search.dist[at], held(b, w)]);
  }
  stores.sort((a, b) => a[0] - b[0]);
  let left = amount;
  let far = 0;
  let loads = 0;
  for (const [dist, n] of stores) {
    if (left <= 0) break;
    far = dist;
    const take = Math.min(left, n);
    loads += Math.ceil(take / DOCKER_TAKE[k]);
    left -= take;
  }
  const rate = Math.max(0.25, rateOf(depot));
  return Math.round((2 * (far + 2)) / SENDING_FETCH_SPEED + HANDLE / rate + DOCKER_GAP * Math.max(0, loads - 1) / rate + TICKS_PER_DAY);
}

/** How long sending a deal's goods (or coin) would take from now, until it arrives (ticks), or -1 if it can't go. */
export function sendTicks(s: SimState, map: CoastMap, d: Pick<Deal, 'city' | 'good' | 'amount'>): number {
  if (d.good < 0) {
    const way = giftWay(s, map, d.city, true);
    return 'why' in way ? -1 : heraldTicks(d.city, way.by);
  }
  const way = giftWay(s, map, d.city, false);
  if ('why' in way || !way.depot) return -1;
  return fetchTicks(s, map, way.depot.id, d.good, d.amount) + outTicks(s, map, way.by, way.depot.id, d.city);
}

/** From the depot out of the city and along the road or the lane, to them (ticks). */
function outTicks(s: SimState, map: CoastMap, by: 'land' | 'sea', depotId: number, city: CityId): number {
  const depot = findBuilding(s, depotId);
  if (by === 'land') {
    const entry = depot ? caravanEntry(s, map.size, depot, city) : null;
    return (entry ? Math.round((entry.tiles.length + 6) / SENDING_SPEED) : 0) + landTicks(city);
  }
  const berth = depot ? berthOf(map, depot) : null;
  return (berth ? leaveTicks({ phase: SHIP_LEAVING, since: 0, turned: 0.92, path: shipRoute(map, berth) }) : SAIL_OUT) + voyageTicks(city);
}

/** When what was sent for a deal arrives, about (a tick), from where it is now. */
export function arrivesAt(s: SimState, map: CoastMap, g: Gift): number {
  if (g.phase === 2) return g.start + g.dur;
  if (g.phase === 1) {
    if (g.by === 'sea') return (g.ship ? g.ship.since + leaveTicks(g.ship) : s.tick) + voyageTicks(g.to);
    const c = s.walkers.find((x) => x.kind === 'caravan' && x.cheese === g.id);
    return s.tick + Math.round((c ? pathLeft(c) : 0) / SENDING_SPEED) + landTicks(g.to);
  }
  // Fetching: the porters already on their way (to the stores and back, or back), and any of it not yet sent for.
  const depot = findBuilding(s, g.depot);
  const rate = Math.max(0.25, depot ? rateOf(depot) : 1);
  let fetching = 0;
  let carried = 0;
  for (const w of s.walkers) {
    if (w.kind !== 'docker' || w.cheese !== g.id) continue;
    carried += w.back ? w.load : w.meat;
    // (Going: the rest of the way there, and all the way back.)
    const left = pathLeft(w);
    const way = w.back ? left : left + pathLeft({ ...w, seg: 0, along: 0 });
    fetching = Math.max(fetching, Math.round(way / SENDING_FETCH_SPEED + (w.back ? 0 : w.wait > 0 ? w.wait / rate : HANDLE / rate)));
  }
  const rest = g.amount - g.got - carried;
  if (rest > 0) fetching = Math.max(fetching, fetchTicks(s, map, g.depot, g.good, rest));
  return s.tick + fetching + outTicks(s, map, g.by, g.depot, g.to);
}

/** How far a walker has still to go along her path (tiles). */
function pathLeft(w: Pick<Walker, 'path' | 'seg' | 'along'>): number {
  let left = -w.along;
  for (let i = w.seg * 2; i + 3 < w.path.length; i += 2) left += Math.hypot(w.path[i + 2] - w.path[i], w.path[i + 3] - w.path[i + 1]);
  return Math.max(0, left);
}

/** "12 June 748 BC". */
export const dayWords = (tick: number): string => {
  const d = dateOfTick(tick);
  return `${d.day} ${d.monthName} ${formatYear(d.yearBC)}`;
};

/** How an arrival stands against a deadline: "38 days before the deadline", "12 days after it". */
export function againstDue(at: number, due: number): string {
  const days = Math.round((due - at) / TICKS_PER_DAY);
  if (days === 0) return 'on the day it is due';
  return days > 0 ? `${days === 1 ? 'a day' : `${days} days`} before it is due` : `${-days === 1 ? 'a day' : `${-days} days`} after it is due: late`;
}

/** What you sent for a deal, on its way, in words (giftNews's, for the panels and tips). */
export function sentWords(s: SimState, g: Gift, d: Deal | undefined): string {
  const name = cityName(g.to);
  const what = d?.kind === 'tribute' ? `Your tribute of ${giftWords(g.good, g.amount)} for ${name}` : `The ${giftWords(g.good, g.amount)} for ${name}`;
  const days = (t: number): string => {
    const n = Math.max(1, Math.ceil((t - s.tick) / TICKS_PER_DAY));
    return n === 1 ? '1 day' : `${n} days`;
  };
  if (g.phase === 0) {
    const depot = findBuilding(s, g.depot);
    const where = depot?.kind === 'yard' ? 'the caravan yard' : 'the quay';
    const who = depot?.kind === 'yard' ? 'porters' : 'dockers';
    const stalled = depot && rateOf(depot) === 0 ? `: ${where} has no workers to fetch it` : '';
    return `${what}: the ${who} are fetching it from the stores to ${where} (${fmt(g.got)} there so far)${stalled}`;
  }
  if (g.phase === 1) return g.by === 'land' ? `${what} is leaving the city by the road out` : `${what} is sailing out of the bay`;
  return `${what} is on its way: it arrives in ${days(g.start + g.dur)}`;
}

/** A deal's deadline, in words: "by 12 June 748 BC (63 days)". */
export function dueWords(s: SimState, d: Deal): string {
  const days = Math.max(0, Math.ceil((d.due - s.tick) / TICKS_PER_DAY));
  return `by ${dayWords(d.due)} (${days === 1 ? '1 day' : `${days} days`})`;
}

/** What each answer to a deal would do to the ruler's mood now, for the buttons: the memory each would make. */
export function answerWorths(s: SimState, d: Deal): Partial<Record<'promise' | 'met' | 'late' | 'refused' | 'lapsed' | 'broken' | 'paid' | 'defied' | 'taken' | 'kept' | 'reneged' | 'declined', Memory>> {
  const c = cityOf(s.world, d.city);
  const t = s.tick;
  const words = dealWords(d);
  if (d.kind === 'request')
    return {
      promise: answerMemory(c, 'promise', `you promised them ${words}`, t),
      met: answerMemory(c, 'met', `you sent the ${words} they asked for`, t),
      late: answerMemory(c, 'met', `you sent the ${words} they asked for, late`, t, 0.5),
      refused: answerMemory(c, 'refused', `you refused their request for ${words}`, t),
      lapsed: answerMemory(c, 'lapsed', `you ignored their request for ${words}`, t),
      broken: answerMemory(c, 'broken', `you promised them ${words} and it never came`, t),
    };
  if (d.kind === 'tribute') return { paid: answerMemory(c, 'paid', `you paid the tribute they demanded (${words})`, t, 1, d.good < 0), defied: answerMemory(c, 'defied', `you refused them tribute (${words})`, t) };
  return {
    taken: answerMemory(c, 'taken', `you took up their offer for ${goodName(d.good)}`, t),
    kept: answerMemory(c, 'kept', `you kept to the year’s deal for ${goodName(d.good)}`, t),
    reneged: answerMemory(c, 'reneged', `you took up their offer, and sent too little`, t),
    declined: answerMemory(c, 'declined', `you turned down their offer`, t),
  };
}

/** The route a deal's goods would trade over, if one is open (for the offer's lines). */
export const dealRoute = (s: SimState, d: Deal): ReturnType<typeof routeOf> => routeOf(s, d.city, 'land') ?? routeOf(s, d.city, 'sea');
