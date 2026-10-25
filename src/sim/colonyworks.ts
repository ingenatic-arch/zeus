/**
 * Colonies that grow up (slice 43): a colony's stages, the works you fund
 * there, what it asks of you, the governors you choose for it, and the goods
 * that leave your quay for it.
 *
 * - **Stages.** By its people: an outpost (tents on the beach) from landing,
 *   a settlement from 150, a town from 400, a city from 900; it steps down
 *   only if a raid takes it below four fifths of its stage's threshold. The
 *   stage sets how much each of its people makes, and which works open.
 * - **What it makes** is measures of its good a person (against what one of
 *   your own works makes), not drachmas a person, so a cheap good no longer
 *   comes in by the thousand (phase 5's finding). A harbour adds a quarter, a
 *   miser governor a tenth, and a second trade a second good at half the rate.
 * - **Works** (fields, a harbour, an agora, a temple, walls, a second trade)
 *   open at a stage and cost drachmas, paid when funded, and goods shipped
 *   from your quay; each is built a few months after its goods land.
 * - **Wants.** Now and then (never in winter, never for its own good) it asks
 *   for something by a day: met in time it remembers and grows faster for a
 *   year; late, a little; not sent, it remembers that too.
 * - **Governors.** At a landing, a death or a dismissal you choose from three
 *   candidates, each with a trait; until you do (a month) the council holds
 *   it, then picks the first. At a landing the first is the settlers' own
 *   leader with slice 37's trait, and governs while you choose.
 * - **Shipping out.** A shipment (`Cargo`) for one colony: your ship sails
 *   in and anchors off the jetty; porters (`shipper` walkers) carry its goods
 *   from the nearest granary or storehouse down to the quay, a boat rows them
 *   out; she sails out of the bay and along the colony's lane, and lands.
 *   Its own walkers and ship: the trading post's dockers (trade.ts) are not
 *   touched.
 *
 * What it changes in the city: the porters on the roads, the ship at anchor
 * and the boat rowing out, and (through colonies.ts) what comes back.
 * Pure: the dice are hashes of Greece's seed with salts of their own, so no
 * older roll moves. Nothing here runs in a town with no colony or shipment.
 */
import type { CoastMap } from '../map/bake';
import { HORIZON_ALONG, lineLength, siteLaneId, siteOf, SITES, wayOf, wayPoints as tableWay } from '../map/greece';
import { hash2 } from '../map/noise';
import { dhypot } from '../map/dmath';
import { findBuilding } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import type { Command } from './commands';
import { news } from './diplomacy';
import { dayWords } from './favours';
import { nearestBy } from './food';
import { ARMOUR, CHEESE, COPPER, FLEECE, held, HORSES, MARBLE, MEAT, OIL, setHeld, TIMBER, WARE_NAMES, WHEAT, WINE, type Ware } from './foods';
import { MEN } from './folk';
import { blockaded } from './lanes';
import { door, roadsBeside } from './rounds';
import { visitorAt } from './routes';
import { lateWords, seasonAt, AUTUMN, SPRING, SUMMER, stormDelay, WINTER } from './seasons';
import type { SimState, Visitor, Walker } from './state';
import { note } from './stockbook';
import { berthOf, leaveTicks, PRICES, sailable, SAIL_IN, shipRoute, SHIP_ANCHORED, SHIP_COMING, SHIP_LEAVING, storeKind, tradeIndex, TRADE_GOODS, tradingPost, pastMouth } from './trade';
import { pay, spendable } from './treasury';
import { newWalker, roadPoints, setPath, speedOf } from './walk';
import { memoryWorth } from './world';
import { colonyOf, laneTicks, peopleOf, pointOn, pathLen, quaySpot, siteKey, type Colony, type GovTrait } from './colonies';

// ---------------------------------------------------------------------------
// The records (inside slice 37's Colony, and `cargoes` in the empire).

/** A work you can fund in a colony. */
export type WorkKind = 'fields' | 'harbour' | 'agora' | 'temple' | 'walls' | 'trade';
export const WORK_KINDS: readonly WorkKind[] = ['fields', 'harbour', 'agora', 'temple', 'walls', 'trade'];

/** A work funded in a colony: its goods on their way (shipping), going up (building), or built. */
export interface ColonyWork {
  kind: WorkKind;
  phase: 'shipping' | 'building' | 'built';
  /** When it was funded, when it is (or was) done, and the shipment its goods go in (0 once landed). */
  at: number;
  done: number;
  cargo: number;
}

/** What a colony may ask for. */
export type WantKind = 'wheat' | 'wine' | 'oil' | 'fleece' | 'timber' | 'armour';

/** A colony's ask: what, how much, why, by when; the shipment carrying it (0: not sent); how it ended. */
export interface Want {
  kind: WantKind;
  /** The trade good (TRADE_GOODS index) and how much. */
  good: number;
  amount: number;
  at: number;
  due: number;
  cargo: number;
  /** '' while it stands; met (landed in time), late, or ignored (nothing sent by its day). */
  end: '' | 'met' | 'late' | 'ignored';
  ended: number;
}

/** A governor you could choose. */
export interface Candidate {
  name: string;
  trait: GovTrait;
}

/** A lift or a drag on a colony's growth for a while (a want met or ignored): people a year for every hundred, until a tick. */
export interface Boost {
  why: string;
  rate: number;
  until: number;
}

/** One good in a shipment: for a want or a work, how much, how much is on the quay or aboard (`got`) and with porters on the road (`out`). */
export interface CargoItem {
  kind: 'want' | 'work';
  work: WorkKind | '';
  good: number;
  amount: number;
  got: number;
  out: number;
}

/** Goods going out from your quay to a colony: loading (your ship coming in or at anchor, the porters carrying), leaving (sailing out of the bay), sea, done. */
export interface Cargo {
  id: number;
  site: string;
  /** The trading post they leave from, and when it was ordered. */
  post: number;
  at: number;
  items: CargoItem[];
  phase: 'loading' | 'leaving' | 'sea' | 'done';
  ship: Visitor | null;
  /** On the map: when she cleared the gulf, and how long the voyage takes. */
  start: number;
  dur: number;
  /** When the next porter may set out. */
  next: number;
}

/** Slice 43's fields on a colony (Colony extends these). */
export interface ColonyGrowth {
  /** 0 outpost, 1 settlement, 2 town, 3 city. */
  stage: number;
  works: ColonyWork[];
  want: Want | null;
  /** When it may ask for something next. */
  wantNext: number;
  boosts: Boost[];
  /** Governors to choose from (empty: none to choose), by when the council chooses, and since when its governor has held it. */
  candidates: Candidate[];
  chooseBy: number;
  govSince: number;
}

// ---------------------------------------------------------------------------
// The numbers.

export const STAGE_NAMES = ['outpost', 'settlement', 'town', 'city'] as const;
/** Its people from which each stage begins. */
export const STAGE_FROM = [0, 150, 400, 900] as const;
/** It steps down only below this share of its stage's threshold (a raid). */
const STEP_DOWN = 0.8;
/** What each of its people makes at each stage, against a town's. */
const STAGE_RATE = [0.5, 0.8, 1, 1.1] as const;
/**
 * What a person in a colony makes of each good a year at a town's rate, in
 * measures: set so that a colony of 400 at a fair share (two fifths) sends
 * about a third to a half of what one of your own works makes in a year
 * (a press 3,600 oil, a quarry or a camp 1,200, a mine 2,400 copper).
 */
const MAKES: Partial<Record<Ware, number>> = { [WHEAT]: 11, [MEAT]: 6, [CHEESE]: 6, [OIL]: 8, [FLEECE]: 6, [WINE]: 5, [COPPER]: 7.5, [ARMOUR]: 0.5, [MARBLE]: 3.75, [TIMBER]: 5.6, [HORSES]: 0.08 };
/** A harbour adds this share to what it sends; a miser governor this; a second trade makes its good at this share of the rate. */
const HARBOUR_MORE = 0.25;
const MISER_MORE = 0.1;
const SECOND_RATE = 0.5;
/** A harbour's ships sail this much quicker. */
const HARBOUR_PACE = 0.75;
/** Each site's second trade. */
export const SECOND_TRADE: Record<string, Ware> = { naxos: WINE, thasos: MARBLE, kythnos: CHEESE, melos: OIL, kythera: FLEECE, cyrene: HORSES };

/** Each work: the stage it opens at, its price (drachmas, a good and how much), how long it takes to build, and what it does. */
export const WORKS: Record<WorkKind, { name: string; stage: number; dr: number; ware: Ware; amount: number; days: number; does: string }> = {
  fields: { name: 'its fields', stage: 0, dr: 200, ware: WHEAT, amount: 200, days: 60, does: 'it feeds itself: a quarter more newcomers and +2 a year in every hundred from its own harvests, and no more asking for wheat after a hard winter' },
  harbour: { name: 'a harbour', stage: 1, dr: 500, ware: TIMBER, amount: 150, days: 90, does: 'its ships sail a quarter quicker both ways, and its share is a quarter larger' },
  agora: { name: 'an agora', stage: 1, dr: 400, ware: TIMBER, amount: 120, days: 60, does: 'loyalty +6' },
  temple: { name: 'a temple', stage: 2, dr: 600, ware: MARBLE, amount: 120, days: 120, does: 'loyalty +8' },
  walls: { name: 'walls', stage: 2, dr: 800, ware: TIMBER, amount: 200, days: 120, does: 'raids fail more often (the walls turn about 45 in 100 away), one that gets in takes a third as many and leaves the season’s ship, and it can’t be claimed' },
  trade: { name: 'a second trade', stage: 2, dr: 500, ware: COPPER, amount: 150, days: 90, does: 'a second good to send you' },
};
/** What goods are for, in a work's price ("timber for its jetty"). */
const WORK_GOODS_FOR: Record<WorkKind, string> = { fields: 'seed corn', harbour: 'for its jetty', agora: 'for its stalls and colonnade', temple: 'for its columns', walls: 'for its gates, towers and scaffolds', trade: 'for its tools' };
/** Loyalty from works. */
const AGORA_LOYALTY = 6;
const TEMPLE_LOYALTY = 8;
/** Fields: newcomers drawn, and its own harvests a year (in a hundred). */
const FIELDS_NEWCOMERS = 0.25;
const FIELDS_GROWTH = 0.02;
/** Walls turn this share of raids away, a soldier governor this (more behind walls); a raid that gets in takes this share of what it would. */
const WALLS_HOLD = 0.45;
const SOLDIER_HOLD = 0.2;
const WALLED_TAKES = 1 / 3;

/** Wants: the first after 6 to 12 months, the next 8 to 16 months after the last ended; its day; how much a person; kept for the page a year. */
const WANT_FIRST = 6 * TICKS_PER_MONTH;
const WANT_GAP = 8 * TICKS_PER_MONTH;
const WANT_SPREAD = 6 * TICKS_PER_MONTH;
const WANT_DAYS = 150 * TICKS_PER_DAY;
const WANT_KEEP = TICKS_PER_YEAR;
export const WANT_WARES: Record<WantKind, Ware> = { wheat: WHEAT, wine: WINE, oil: OIL, fleece: FLEECE, timber: TIMBER, armour: ARMOUR };
const WANT_PER: Record<WantKind, number> = { wheat: 0.6, wine: 0.25, oil: 0.3, fleece: 0.3, timber: 0.25, armour: 0.05 };
export const WANT_WHY: Record<WantKind, string> = {
  wheat: 'after a hard winter its stores are empty',
  wine: 'for its festival',
  oil: 'for its lamps and its gymnasium',
  fleece: 'for cloaks before the winter',
  timber: 'a storm tore its roofs',
  armour: 'for its militia',
};
/** A want met in time, late, or ignored: what it remembers (and fades over), and its growth for a year after. */
const MET = { amount: 10, fade: 3 * TICKS_PER_YEAR };
const LATE = { amount: 3, fade: 2 * TICKS_PER_YEAR };
const IGNORED = { amount: -10, fade: 4 * TICKS_PER_YEAR };
const MET_GROWTH = 0.04;
const HUNGRY_GROWTH = -0.03;

/** Governors: the council chooses after a month; one may die after eight years in office, one month in so many from then; dismissing one costs this. */
const CHOOSE_DAYS = 30 * TICKS_PER_DAY;
const OLD_IN_OFFICE = 8 * TICKS_PER_YEAR;
const DIES_ODDS = 1 / 24;
const DISMISSED = { amount: -5, fade: 2 * TICKS_PER_YEAR };
const DISMISSED_FAVOURITE = { amount: -15, fade: 3 * TICKS_PER_YEAR };
/** The traits a new candidate may have (slice 37's four and this slice's four). */
const CANDIDATE_TRAITS: readonly GovTrait[] = ['builder', 'miser', 'soldier', 'favourite', 'loyal', 'steady', 'proud', 'grasping'];
/** A builder's works cost this share and take this share of the time. */
const BUILDER_COST = 0.75;
const BUILDER_TIME = 2 / 3;
/** What each trait does, in words, for the candidates. */
export const TRAIT_DOES: Record<GovTrait, string> = {
  builder: 'works cost a quarter less and go up in two thirds the time; +1 a year in every hundred',
  miser: 'its ships carry a tenth more; −1 a year in every hundred; loyalty −3',
  soldier: 'raids fail more often: about 20 in 100 turned away by his men, more behind walls',
  favourite: 'loyalty +8, +1 a year in every hundred; dismissing him costs −15',
  loyal: 'loyalty +10',
  steady: 'loyalty +5',
  proud: 'loyalty −10 once it is over 500 people',
  grasping: 'loyalty −10 while its share is heavy',
};
const TRAIT_GROWTH: Partial<Record<GovTrait, number>> = { builder: 0.01, miser: -0.01, favourite: 0.01 };
const FAVOURITE_LOYALTY = 8;
const MISER_LOYALTY = -3;

/** Shipping out: porters a shipment keeps on the road at once, half a day apart; what a porter carries of each good; how long your ship waits before sailing with what is aboard. */
const PORTERS_MOST = 4;
const PORTER_GAP = TICKS_PER_DAY / 2;
const PORTER_LOAD: Partial<Record<Ware, number>> = { [WHEAT]: 50, [MEAT]: 40, [CHEESE]: 40, [OIL]: 40, [FLEECE]: 40, [WINE]: 40, [COPPER]: 40, [ARMOUR]: 5, [MARBLE]: 25, [TIMBER]: 25, [HORSES]: 2 };
const SHIP_WAITS = 120 * TICKS_PER_DAY;
/** The boat's trip out to her and back (the city's rowing boat keeps this pace too), and how many porters' loads it takes out a trip.
 * (Review of slice 43: at 0.8 day a trip it crossed the dozen tiles to her anchorage at ten times a walker's pace; now about twice.) */
export const ROW_TRIP = 4 * TICKS_PER_DAY;
const ROW_LOADS = 2;
/** She anchors this far back from the jetty (further out than a colony's share ship, which lies near its end), and to the other side from the settlers' ship first. */
const ANCHOR_BACK = 12;
const ANCHOR_ASIDE = [2.6, -2.6, 1.4, -1.4, 0] as const;

const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));
const siteName = (id: string): string => siteOf(id)?.name ?? id;
const goodWord = (k: number): string => (k >= 0 ? WARE_NAMES[TRADE_GOODS[k]] : 'goods');
const amountWords = (k: number, n: number): string => (TRADE_GOODS[k] === ARMOUR ? `${fmt(n)} ${n === 1 ? 'set' : 'sets'} of armour` : TRADE_GOODS[k] === HORSES ? `${fmt(n)} ${n === 1 ? 'horse' : 'horses'}` : `${fmt(n)} ${goodWord(k)}`);
export { amountWords as cargoWords };
const capFirst = (t: string): string => (t ? `${t[0].toUpperCase()}${t.slice(1)}` : t);

/** Greece's dice for a colony's growing up (a hash: no generator is touched; salts of its own, past colonies.ts'). */
const dice = (s: SimState, a: number, i: number, salt: number): number => hash2(a, i * 41 + salt, (s.world.seed ^ 0x636f6c6f) | 0);
const siteIndex = (site: string): number => SITES.findIndex((p) => p.id === site);

// ---------------------------------------------------------------------------
// Stages and what a colony makes.

/** The stage a colony of so many people stands at, from the one it stood at (it steps up at each threshold, down only below four fifths of it). */
export function stageFor(people: number, was = 0): number {
  let k = clamp(Math.floor(was), 0, 3);
  while (k < 3 && people >= STAGE_FROM[k + 1]) k++;
  while (k > 0 && people < STAGE_FROM[k] * STEP_DOWN) k--;
  return k;
}

/** A colony's stage. */
export const stageOf = (c: Colony): number => clamp(c.stage ?? 0, 0, 3);

/** Is a work built in a colony? */
export const built = (c: Colony, kind: WorkKind): boolean => (c.works ?? []).some((w) => w.kind === kind && w.phase === 'built');
/** A work's record in a colony, if funded. */
export const workOf = (c: Colony, kind: WorkKind): ColonyWork | undefined => (c.works ?? []).find((w) => w.kind === kind);

/** Its governor's trait (none while the council holds it). */
export const govTrait = (c: Colony): GovTrait | null => (c.governor ? c.trait : null);

/** The second trade's good at a site (TRADE_GOODS index; -1 none). */
export function secondGood(site: string): number {
  const w = SECOND_TRADE[site];
  return w === undefined ? -1 : tradeIndex(w);
}

/**
 * What a colony of so many people at a stage sends a year of a good at a
 * share (the share's fraction of what it makes), in measures and drachmas
 * at the ship's prices; `more` is what a harbour or a miser adds.
 */
export function sendsYear(k: number, people: number, stage: number, share: number, more = 0, rate = 1): { amount: number; dr: number } {
  if (k < 0) return { amount: 0, dr: 0 };
  const per = MAKES[TRADE_GOODS[k]] ?? 0;
  const raw = people * per * STAGE_RATE[clamp(stage, 0, 3)] * share * rate * (1 + more);
  const step = TRADE_GOODS[k] === HORSES || TRADE_GOODS[k] === ARMOUR ? 1 : 10;
  const amount = Math.round(raw / step) * step;
  return { amount, dr: Math.round((amount * PRICES[k]) / 100) };
}

/** What a harbour and its governor add to what a colony sends (a share: 0.25 is a quarter more). */
export function sendsMore(c: Colony): number {
  return (built(c, 'harbour') ? HARBOUR_MORE : 0) + (govTrait(c) === 'miser' ? MISER_MORE : 0);
}

/** How much quicker a colony's ships sail (1: as before; less with its harbour). */
export const shipPace = (c: Colony | undefined): number => (c && built(c, 'harbour') ? HARBOUR_PACE : 1);

/** Its second trade's year at a share, if built ({amount 0} if not). */
export function secondYear(s: SimState, c: Colony, shareFrac: number): { good: number; amount: number; dr: number } {
  const k = secondGood(c.site);
  if (k < 0 || !built(c, 'trade')) return { good: k, amount: 0, dr: 0 };
  return { good: k, ...sendsYear(k, peopleOf(s, c), stageOf(c), shareFrac, sendsMore(c), SECOND_RATE) };
}

// ---------------------------------------------------------------------------
// What the works, the wants and the governor do to its growth and loyalty (colonies.ts asks).

/** Extra causes of a colony's growth (people a year), for colonyGrowth. */
export function growthCauses(s: SimState, c: Colony, winter: boolean, newcomers: number, pop: number, room: number): Array<{ why: string; n: number }> {
  const out: Array<{ why: string; n: number }> = [];
  if (built(c, 'fields')) {
    out.push({ why: winter ? 'newcomers drawn by its fields (none sail in winter)' : 'newcomers drawn by its fields', n: Math.round(newcomers * FIELDS_NEWCOMERS) });
    out.push({ why: 'its own fields feed it', n: Math.round(pop * FIELDS_GROWTH * room) });
  }
  const t = govTrait(c);
  const g = t ? TRAIT_GROWTH[t] : undefined;
  if (g) out.push({ why: `${c.governor}, its governor, ${t === 'builder' ? 'builds for newcomers' : t === 'miser' ? 'pinches its people' : 'is loved by its people'}`, n: Math.round(pop * g * room) });
  for (const b of c.boosts ?? []) if (s.tick < b.until) out.push({ why: b.why, n: Math.round(pop * b.rate * (b.rate > 0 ? room : 1)) });
  return out;
}

/** Extra reasons for a colony's loyalty, for colonyLoyalty. */
export function loyaltyCauses(c: Colony): Array<{ why: string; n: number }> {
  const out: Array<{ why: string; n: number }> = [];
  if (built(c, 'agora')) out.push({ why: 'its agora, which you paid for', n: AGORA_LOYALTY });
  if (built(c, 'temple')) out.push({ why: 'its temple, which you paid for', n: TEMPLE_LOYALTY });
  const t = govTrait(c);
  if (t === 'favourite') out.push({ why: `${c.governor}, its governor, is a favourite of its people`, n: FAVOURITE_LOYALTY });
  if (t === 'miser') out.push({ why: `${c.governor}, its governor, is a miser: he pinches its people`, n: MISER_LOYALTY });
  return out;
}

/** How often a colony turns raiders away by itself: its walls and a soldier governor (0 to 1). */
export function ownDefence(c: Colony): number {
  const walls = built(c, 'walls') ? WALLS_HOLD : 0;
  const soldier = govTrait(c) === 'soldier' ? SOLDIER_HOLD : 0;
  return Math.round((1 - (1 - walls) * (1 - soldier)) * 100) / 100;
}

/** Its defence in words: "its walls", "its walls and its soldier governor's men" ('' none). */
export function defenceWords(c: Colony): string {
  const walls = built(c, 'walls');
  const soldier = govTrait(c) === 'soldier';
  return walls && soldier ? `its walls and ${c.governor}’s men` : walls ? 'its walls' : soldier ? `${c.governor}’s men` : '';
}

/** The share of its people a raid that gets in takes (walls: a third as many). */
export const raidTakes = (c: Colony, base: number): number => (built(c, 'walls') ? base * WALLED_TAKES : base);

/** Is it walled (so it can't be claimed)? */
export const walled = (c: Colony): boolean => built(c, 'walls');

// ---------------------------------------------------------------------------
// A colony's new fields, at its landing (colonies.ts) or planted by a demo.

/** Slice 43's fields for a colony landing or planted at `since`, with its stage from its people. */
export function freshGrowth(s: SimState, site: string, people: number, since: number): ColonyGrowth {
  const i = Math.max(0, siteIndex(site));
  return { stage: stageFor(people), works: [], want: null, wantNext: since + WANT_FIRST + Math.floor(dice(s, since, i, 21) * WANT_SPREAD), boosts: [], candidates: [], chooseBy: 0, govSince: since };
}

/** Three candidates to govern a colony: the first given (a landing's leader), the rest from the dice, each trait different. */
export function candidatesFor(s: SimState, c: Colony, first?: Candidate): Candidate[] {
  const i = Math.max(0, siteIndex(c.site));
  const out: Candidate[] = first ? [first] : [];
  for (let k = 0; out.length < 3 && k < 40; k++) {
    const trait = CANDIDATE_TRAITS[Math.floor(dice(s, s.tick + k, i, 31) * CANDIDATE_TRAITS.length)];
    const name = MEN[Math.floor(dice(s, s.tick + k, i, 32) * MEN.length)];
    if (out.some((o) => o.trait === trait || o.name === name) || name === c.governor) continue;
    out.push({ name, trait });
  }
  return out;
}

/** At a landing: its leader governs while you choose from him and two others. */
export function offerAtLanding(s: SimState, c: Colony): void {
  c.candidates = candidatesFor(s, c, { name: c.governor, trait: c.trait });
  c.chooseBy = s.tick + CHOOSE_DAYS;
}

// ---------------------------------------------------------------------------
// Looking things up.

/** Shipments for a colony (or all), not yet done. */
export const cargoesFor = (s: SimState, site?: string): Cargo[] => (s.empire.cargoes ?? []).filter((x) => x.phase !== 'done' && (!site || x.site === site));
/** A shipment by its id. */
export const cargoOf = (s: SimState, id: number): Cargo | undefined => (s.empire.cargoes ?? []).find((x) => x.id === id);
/** A colony's shipment still loading at your quay, if any. */
export const loadingFor = (s: SimState, site: string): Cargo | undefined => cargoesFor(s, site).find((x) => x.phase === 'loading');

/** How much of a good your stores hold (granaries for foods, storehouses for goods). */
function storedOf(s: SimState, k: number): number {
  const w = TRADE_GOODS[k];
  const kind = storeKind(w);
  return s.buildings.reduce((a, b) => a + (b.kind === kind ? held(b, w) : 0), 0);
}

/** How much of a good your stores hold, less what shipments still loading will take of it. */
export function spareOf(s: SimState, k: number): number {
  const have = storedOf(s, k);
  let promised = 0;
  for (const x of cargoesFor(s)) if (x.phase === 'loading') for (const it of x.items) if (it.good === k) promised += Math.max(0, it.amount - it.got - it.out);
  return Math.max(0, have - promised);
}

/** A work's price in a colony now (a builder's cost less). */
export function workPrice(c: Colony, kind: WorkKind): { dr: number; good: number; amount: number; days: number } {
  const w = WORKS[kind];
  const builder = govTrait(c) === 'builder';
  return { dr: Math.round((w.dr * (builder ? BUILDER_COST : 1)) / 10) * 10, good: tradeIndex(w.ware), amount: w.amount, days: Math.round(w.days * (builder ? BUILDER_TIME : 1)) };
}

/** What a work's goods are for, in words: "150 timber for its jetty". */
export const workGoodsWords = (kind: WorkKind): string => {
  const w = WORKS[kind];
  const k = tradeIndex(w.ware);
  return kind === 'fields' ? `${amountWords(k, w.amount)} as seed corn` : `${amountWords(k, w.amount)} ${WORK_GOODS_FOR[kind]}`;
};

/** Why goods can't leave your quay now ('' if they can). */
export function shipRefusal(s: SimState, map: CoastMap): string {
  const post = tradingPost(s);
  if (!post || !berthOf(map, post)) return 'Goods for a colony sail from your quay: build a trading post on the bay shore';
  if (!roadsBeside(s, map.size, post).length) return 'No road reaches the trading post for the porters';
  return '';
}

/** Why a work can't be funded in a colony now ('' if it can). */
export function workRefusal(s: SimState, map: CoastMap, c: Colony, kind: WorkKind): string {
  const w = WORKS[kind];
  if (!w) return 'Not a work';
  if (kind === 'trade' && secondGood(c.site) < 0) return 'Its site has no second trade';
  const had = workOf(c, kind);
  if (had) return had.phase === 'built' ? 'It is built' : had.phase === 'building' ? 'It is going up' : 'Its goods are on their way';
  if (stageOf(c) < w.stage) return `It opens when ${c.name} is a ${STAGE_NAMES[w.stage]} (${fmt(STAGE_FROM[w.stage])} people)`;
  const ship = shipRefusal(s, map);
  if (ship) return ship;
  const p = workPrice(c, kind);
  if (spendable(s) < p.dr) return `It costs ${fmt(p.dr)} dr: you have ${fmt(spendable(s))} to spend`;
  const spare = spareOf(s, p.good);
  if (spare < p.amount) return `It needs ${amountWords(p.good, p.amount)} from your ${storeKind(TRADE_GOODS[p.good]) === 'granary' ? 'granaries' : 'storehouses'}: you have ${fmt(spare)}${TRADE_GOODS[p.good] === MARBLE ? ' (quarry it on the headland, or buy it)' : TRADE_GOODS[p.good] === TIMBER ? ' (cut it at a loggers’ camp, or buy it)' : TRADE_GOODS[p.good] === COPPER ? ' (mine it, or buy it)' : ''}`;
  return '';
}

/** Why a colony's want can't be sent now ('' if it can). */
export function wantRefusal(s: SimState, map: CoastMap, c: Colony): string {
  const w = c.want;
  if (!w || w.end !== '') return 'It asks for nothing now';
  if (w.cargo) return 'It is on its way';
  const ship = shipRefusal(s, map);
  if (ship) return ship;
  const spare = spareOf(s, w.good);
  if (spare < w.amount) return `It asks for ${amountWords(w.good, w.amount)}: your ${storeKind(TRADE_GOODS[w.good]) === 'granary' ? 'granaries' : 'storehouses'} hold ${fmt(spare)} to spare`;
  return '';
}

/** Why a governor can't be chosen or dismissed now ('' if it can). */
export function governorRefusal(c: Colony, act: 'governor' | 'dismiss', n?: number): string {
  if (act === 'governor') return c.candidates.length && Number.isInteger(n) && (n as number) >= 0 && (n as number) < c.candidates.length ? '' : 'Nobody to choose';
  if (c.candidates.length) return c.governor ? 'Choose from the candidates first' : 'It has no governor to dismiss: choose one';
  return c.governor ? '' : 'It has no governor';
}

// ---------------------------------------------------------------------------
// Shipping out.

/** A ship for goods to a colony: from the gulf to her anchorage off the jetty (null if there is no way in). */
function newShip(s: SimState, map: CoastMap, postId: number): Visitor | null {
  const post = findBuilding(s, postId);
  const berth = post ? berthOf(map, post) : null;
  if (!berth) return null;
  const path = shipRoute(map, berth);
  if (path.length < 4) return null;
  const L = pathLen(path);
  const ship: Visitor = { phase: SHIP_COMING, since: s.tick, turned: 1, path, post: postId, stop: Math.max(0.3, 1 - ANCHOR_BACK / Math.max(1, L)), aside: 0 };
  const at = pointOn(path, ship.stop * L);
  ship.aside = ANCHOR_ASIDE.find((a) => a === 0 || [0.5, 1].every((k) => sailable(map, at.x - at.dz * a * k, at.z + at.dx * a * k))) ?? 0;
  return ship;
}

/** Put goods on a shipment for a colony: the one loading if there is one, else a new one with your ship sailing in. Its id. */
function ship(s: SimState, map: CoastMap, site: string, item: CargoItem): number {
  const e = s.empire;
  if (!e.cargoes) e.cargoes = [];
  const had = loadingFor(s, site);
  if (had) {
    had.items.push(item);
    return had.id;
  }
  const post = tradingPost(s) as NonNullable<ReturnType<typeof tradingPost>>;
  const x: Cargo = { id: e.nextId++, site, post: post.id, at: s.tick, items: [item], phase: 'loading', ship: newShip(s, map, post.id), start: 0, dur: 0, next: s.tick };
  e.cargoes.push(x);
  return x.id;
}

/** A porter sets out from the nearest store holding a good, by road to the trading post and onto the quay. False if no store holds it. */
function sendPorter(s: SimState, map: CoastMap, x: Cargo, i: number): boolean {
  const it = x.items[i];
  const post = findBuilding(s, x.post);
  if (!post) return false;
  const w = TRADE_GOODS[it.good];
  const kind = storeKind(w);
  const n = map.size;
  const roads = roadsBeside(s, n, post);
  const found = nearestBy(s, n, roads, (g) => g.kind === kind && held(g, w) > 0);
  if (!found) return false;
  const take = Math.min(PORTER_LOAD[w] ?? 40, held(found.g, w), it.amount - it.got - it.out);
  if (take <= 0) return false;
  setHeld(found.g, w, held(found.g, w) - take);
  note(s, w, 'sold', `colony:${x.site}`, take);
  s.looks++;
  it.out += take;
  const p = newWalker(s, 'shipper', 1);
  p.origin = x.id;
  p.target = post.id;
  p.food = w;
  p.load = take;
  p.steps = i;
  p.since = s.tick;
  p.home = found.g.id;
  const way = found.way.slice().reverse();
  const spot = quaySpot(map, post, 2 + (i % 4)) ?? [post.x + 1, post.z + 1];
  const [sx, sz] = door(n, found.g, way[0]);
  const [px, pz] = door(n, post, way[way.length - 1]);
  setPath(p, [[sx, sz, -1], ...roadPoints(s, n, way), [px, pz, -1], [spot[0], spot[1], -1]]);
  s.walkers.push(p);
  return true;
}

/** Move a porter a tick (sim.ts' walkers): down the roads to the quay, where his load goes into the shipment. False once he is done. */
export function moveShipper(s: SimState, w: Walker): boolean {
  const x = cargoOf(s, w.origin);
  const it = x?.items[w.steps];
  if (!x || !it || x.phase !== 'loading') return false;
  let move = speedOf(w);
  for (let guard = 0; guard < 8 && move > 0; guard++) {
    const last = w.path.length / 2 - 1;
    if (w.seg >= last) break;
    const i = w.seg * 2;
    const len = dhypot(w.path[i + 2] - w.path[i], w.path[i + 3] - w.path[i + 1]);
    if (w.along + move < len) {
      w.along += move;
      w.walked += move;
      return true;
    }
    move -= len - w.along;
    w.walked += len - w.along;
    w.seg++;
    w.along = 0;
  }
  if (w.seg < w.path.length / 2 - 1) return true;
  it.out = Math.max(0, it.out - w.load);
  it.got += w.load;
  w.load = 0;
  s.rev++;
  return false;
}

/** Is every good of a shipment on the quay or aboard? */
const allIn = (x: Cargo): boolean => x.items.every((it) => it.got >= it.amount && it.out <= 0);

/** Each tick, a shipment: porters setting out, your ship coming in and at anchor, sailing, the voyage, the landing. */
function stepCargo(s: SimState, map: CoastMap, x: Cargo): void {
  if (x.phase === 'loading') {
    const out = s.walkers.filter((w) => w.kind === 'shipper' && w.origin === x.id).length;
    if (out < PORTERS_MOST && s.tick >= x.next) {
      const i = x.items.findIndex((it) => it.amount - it.got - it.out > 0);
      if (i >= 0) {
        sendPorter(s, map, x, i);
        x.next = s.tick + PORTER_GAP;
      }
    }
    const v = x.ship;
    const closed = !!blockaded(s);
    if (v && v.phase === SHIP_COMING && closed && !pastMouth(v.path, visitorAt(v, s.tick)?.inward ?? 0)) v.since++;
    if (v && v.phase === SHIP_COMING && s.tick >= v.since + SAIL_IN) {
      v.phase = SHIP_ANCHORED;
      v.since = s.tick;
      s.rev++;
    }
    const anchored = !v || v.phase === SHIP_ANCHORED;
    const late = s.tick >= x.at + SHIP_WAITS && out === 0;
    // (A boat rows the loads out to her one at a time: she sails once the last is aboard.)
    const rowed = !v || s.tick >= v.since + rowTicks(x);
    if (anchored && !closed && rowed && (allIn(x) || late) && x.items.some((it) => it.got > 0)) sail(s, x);
  } else if (x.phase === 'leaving') {
    if (!x.ship || s.tick >= x.ship.since + leaveTicks(x.ship)) {
      x.ship = null;
      x.phase = 'sea';
      x.start = s.tick;
      const voyage = Math.round(laneTicks(x.site) * shipPace(colonyOf(s, x.site)));
      x.dur = voyage + stormDelay(s, `cargo-${x.site}`, s.tick + voyage);
      s.rev++;
    }
  } else if (x.phase === 'sea' && s.tick >= x.start + x.dur) land(s, x);
}

/** How many porters' loads so much of a good makes, and how long the boat takes to row so many out to her. */
const loadsOf = (good: number, n: number): number => Math.ceil(Math.max(0, n) / (PORTER_LOAD[TRADE_GOODS[good]] ?? 40));
const rowingFor = (loads: number): number => Math.ceil(loads / ROW_LOADS) * ROW_TRIP;

/** How long the boat takes to row a shipment's loads out to her at anchor (what is on the quay or aboard; `all`: everything it will carry), two porters' loads a trip. */
export function rowTicks(x: Cargo, all = false): number {
  let loads = 0;
  for (const it of x.items) loads += loadsOf(it.good, all ? it.amount : it.got);
  return rowingFor(loads);
}

/** She sails out of the bay with what is aboard. */
function sail(s: SimState, x: Cargo): void {
  x.phase = 'leaving';
  if (x.ship) {
    x.ship.phase = SHIP_LEAVING;
    x.ship.turned = x.ship.stop;
    x.ship.since = s.tick;
  }
  const c = colonyOf(s, x.site);
  news(s.world, s.tick, siteKey(x.site), `Your ship sails for ${c?.name ?? siteName(x.site)} with ${cargoList(x)}: she lands about ${dayWords(landsAbout(s, x))}`);
  s.rev++;
}

/** What a shipment carries, in words: "150 timber and 200 wheat". */
export function cargoList(x: Cargo): string {
  const by = new Map<number, number>();
  for (const it of x.items) by.set(it.good, (by.get(it.good) ?? 0) + Math.max(it.got, 0));
  const xs = [...by].filter(([, n]) => n > 0).map(([k, n]) => amountWords(k, n));
  if (xs.length <= 1) return xs[0] ?? 'nothing';
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

/** About when a shipment lands. */
export function landsAbout(s: SimState, x: Cargo): number {
  if (x.phase === 'sea') return x.start + x.dur;
  const pace = shipPace(colonyOf(s, x.site));
  // (Review of slice 43: loading, she sails once in and the boat has rowed everything out to her.)
  const v = x.ship;
  const rowed = v ? (v.phase === SHIP_COMING ? v.since + SAIL_IN : v.since) + rowTicks(x, true) : s.tick;
  const out = v && x.phase === 'leaving' ? Math.max(0, v.since + leaveTicks(v) - s.tick) : x.phase === 'loading' ? Math.max(0, rowed - s.tick) + leaveTicks({ turned: v?.stop ?? 1 } as Visitor) : 0;
  return s.tick + out + Math.round(laneTicks(x.site) * pace);
}

/** If goods (so much of a good) were sent for a colony now, about when they would land (your ship in, the boat rowing them out to her, out and over). */
export function wouldLand(s: SimState, site: string, good = -1, amount = 0): number {
  const had = loadingFor(s, site);
  const rowing = good >= 0 ? rowingFor(loadsOf(good, amount)) : 0;
  if (had) return Math.max(landsAbout(s, had) + rowing, s.tick + 2 * TICKS_PER_DAY + Math.round(laneTicks(site) * shipPace(colonyOf(s, site))));
  return s.tick + SAIL_IN + rowing + leaveTicks({ turned: 0.9 } as Visitor) + Math.round(laneTicks(site) * shipPace(colonyOf(s, site)));
}

/** A shipment lands: its want met (or late), its works begun. */
function land(s: SimState, x: Cargo): void {
  x.phase = 'done';
  const c = colonyOf(s, x.site);
  if (!c) {
    news(s.world, s.tick, siteKey(x.site), `Your ship reached ${siteName(x.site)}, but it is yours no more: ${cargoList(x)} went to waste`);
    s.rev++;
    return;
  }
  const done: string[] = [];
  for (const it of x.items) {
    if (it.kind === 'want') {
      const w = c.want;
      if (!w || w.cargo !== x.id || w.end !== '') continue;
      const all = it.got >= it.amount;
      w.end = all && s.tick <= w.due ? 'met' : 'late';
      w.ended = s.tick;
      c.wantNext = s.tick + WANT_GAP + Math.floor(dice(s, s.tick, siteIndex(c.site), 22) * WANT_SPREAD);
      const what = amountWords(w.good, it.got);
      if (w.end === 'met') {
        remember(c, s.tick, 'want', `you sent the ${goodWord(w.good)} it asked for`, MET.amount, MET.fade);
        c.boosts.push({ why: `the ${goodWord(w.good)} you sent it`, rate: MET_GROWTH, until: s.tick + TICKS_PER_YEAR });
        done.push(`the ${what} it asked for came in time: it is grateful (+${MET.amount}) and grows faster for a year`);
      } else {
        remember(c, s.tick, 'want', all ? `your ${goodWord(w.good)} came late, but it came` : `you sent part of the ${goodWord(w.good)} it asked for`, LATE.amount, LATE.fade);
        done.push(`the ${what} it asked for came ${all ? 'late' : 'short'} (+${LATE.amount})`);
      }
    } else if (it.work) {
      const wk = workOf(c, it.work);
      if (!wk || wk.phase !== 'shipping' || wk.cargo !== x.id) continue;
      const short = it.amount > 0 ? clamp(1 - it.got / it.amount, 0, 1) : 0;
      const p = workPrice(c, it.work);
      wk.phase = 'building';
      wk.cargo = 0;
      wk.done = s.tick + Math.round(p.days * TICKS_PER_DAY * (1 + 2 * short));
      done.push(`${WORKS[it.work].name} is going up: done about ${dayWords(wk.done)}`);
    }
  }
  news(s.world, s.tick, siteKey(x.site), `Your ship has landed ${cargoList(x)} at ${c.name}${done.length ? `: ${done.join('; ')}` : ''}`, false);
  s.rev++;
}

function remember(c: Colony, tick: number, kind: string, why: string, amount: number, fade: number): void {
  c.memories.push({ kind, why, amount, tick, fade });
  c.memories = c.memories.filter((m) => memoryWorth(m, tick) !== 0 || m.tick === tick);
}

// ---------------------------------------------------------------------------
// Wants.

/** What a colony would ask for now (null: nothing fits). */
function pickWant(s: SimState, c: Colony): WantKind | null {
  const season = s.season?.on ? seasonAt(s.tick) : -1;
  if (season === WINTER) return null;
  const own = new Set<number>([tradeIndexOf(c.site)]);
  if (built(c, 'trade')) own.add(secondGood(c.site));
  const stage = stageOf(c);
  const threatened = !!c.threat && s.tick - c.threat.at < 2 * TICKS_PER_YEAR;
  const weights: Array<[WantKind, number]> = [
    ['wheat', !built(c, 'fields') && (season === SPRING || season === -1) ? 3 : 0],
    ['wine', season === SUMMER || season === AUTUMN || season === -1 ? 2 : 0],
    ['oil', stage >= 1 ? 1 : 0],
    ['fleece', season === AUTUMN || season === -1 ? 2 : 0],
    ['timber', season === SPRING || season === -1 ? 1 : 0],
    ['armour', stage >= 2 || threatened ? 1 : 0],
  ];
  const ok = weights.filter(([k, n]) => n > 0 && !own.has(tradeIndex(WANT_WARES[k])));
  const total = ok.reduce((a, [, n]) => a + n, 0);
  if (!total) return null;
  let r = dice(s, s.tick, siteIndex(c.site), 23) * total;
  for (const [k, n] of ok) {
    if (r < n) return k;
    r -= n;
  }
  return ok[ok.length - 1][0];
}

const tradeIndexOf = (site: string): number => {
  const p = siteOf(site);
  const w = p ? ({ wheat: WHEAT, oil: OIL, fleece: FLEECE, copper: COPPER, marble: MARBLE, timber: TIMBER } as Record<string, Ware>)[p.good] : undefined;
  return w === undefined ? -1 : tradeIndex(w);
};

/** How much of a good a colony of so many asks for. */
export function wantAmount(kind: WantKind, people: number): number {
  if (kind === 'armour') return Math.max(10, Math.round((people * WANT_PER.armour) / 5) * 5);
  return Math.max(50, Math.round((people * WANT_PER[kind]) / 10) * 10);
}

/** A colony asks for something (demos and tests call this to stage one, `why` naming it so). */
export function askColony(s: SimState, c: Colony, kind: WantKind, why = ''): Want {
  const k = tradeIndex(WANT_WARES[kind]);
  const w: Want = { kind, good: k, amount: wantAmount(kind, peopleOf(s, c)), at: s.tick, due: s.tick + WANT_DAYS, cargo: 0, end: '', ended: 0 };
  c.want = w;
  news(s.world, s.tick, siteKey(c.site), `${c.name} asks you for ${amountWords(k, w.amount)}: ${WANT_WHY[kind]}${why ? ` (${why})` : ''}. Send it from its page by ${dayWords(w.due)}: it will remember either way`, true);
  s.rev++;
  return w;
}

// ---------------------------------------------------------------------------
// Each tick.

/** Once a month for each colony: its stage, a want, its governor's health and the council's choice. */
function monthly(s: SimState, c: Colony): void {
  const pop = peopleOf(s, c);
  const was = stageOf(c);
  const now = stageFor(pop, was);
  if (now !== was) {
    c.stage = now;
    const opens = WORK_KINDS.filter((k) => WORKS[k].stage === now && (k !== 'trade' || secondGood(c.site) >= 0)).map((k) => WORKS[k].name);
    news(s.world, s.tick, siteKey(c.site), now > was ? `${c.name} has grown into a ${STAGE_NAMES[now]} of ${fmt(pop)} people${opens.length ? `: ${listWords(opens)} can be built there now, from its page` : ''}` : `${c.name} has shrunk to a ${STAGE_NAMES[now]} (${fmt(pop)} people)`, now < was);
    s.rev++;
  }
  // (Wants: one at a time, none asked in winter.)
  if (c.want && c.want.end !== '' && s.tick - c.want.ended > WANT_KEEP) c.want = null;
  if ((!c.want || c.want.end !== '') && s.tick >= c.wantNext) {
    const k = pickWant(s, c);
    if (k) askColony(s, c, k);
  }
  c.boosts = c.boosts.filter((b) => s.tick < b.until);
  // (A governor long in office may die.)
  const i = Math.max(0, siteIndex(c.site));
  if (c.governor && !c.candidates.length && s.tick - c.govSince > OLD_IN_OFFICE && dice(s, Math.floor(s.tick / TICKS_PER_MONTH), i, 24) < DIES_ODDS) {
    const was = c.governor;
    // (Review of slice 43: the candidates found while his name is still on the colony, so the dead man is not offered again.)
    c.candidates = candidatesFor(s, c);
    c.governor = '';
    c.chooseBy = s.tick + CHOOSE_DAYS;
    news(s.world, s.tick, siteKey(c.site), `${was}, governor of ${c.name} these ${Math.floor((s.tick - c.govSince) / TICKS_PER_YEAR)} years, has died. Its council holds it until you choose another from its page, by ${dayWords(c.chooseBy)}`, true);
    s.rev++;
  }
}

const listWords = (xs: string[]): string => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** Each day for each colony: a want's day passing, works finished, the council's choice. */
function daily(s: SimState, c: Colony): void {
  const w = c.want;
  if (w && w.end === '' && !w.cargo && s.tick >= w.due) {
    w.end = 'ignored';
    w.ended = s.tick;
    c.wantNext = s.tick + WANT_GAP + Math.floor(dice(s, s.tick, siteIndex(c.site), 22) * WANT_SPREAD);
    remember(c, s.tick, 'want', `you sent nothing when it asked for ${goodWord(w.good)}`, IGNORED.amount, IGNORED.fade);
    if (w.kind === 'wheat') c.boosts.push({ why: 'a hungry spring: you sent no wheat', rate: HUNGRY_GROWTH, until: s.tick + TICKS_PER_YEAR });
    news(s.world, s.tick, siteKey(c.site), `${c.name} asked you for ${amountWords(w.good, w.amount)} and nothing came: it remembers (${IGNORED.amount})`, true);
    s.rev++;
  }
  for (const wk of c.works) {
    if (wk.phase === 'building' && s.tick >= wk.done) {
      wk.phase = 'built';
      wk.done = s.tick;
      news(s.world, s.tick, siteKey(c.site), `${capFirst(WORKS[wk.kind].name)} stands finished at ${c.name}: ${WORKS[wk.kind].does}`);
      s.rev++;
    }
  }
  if (c.candidates.length && s.tick >= c.chooseBy) {
    // (The council chooses the first: at a landing, the settlers' own leader.)
    choose(s, c, 0, true);
  }
}

/** A governor chosen (by you, or the council). */
function choose(s: SimState, c: Colony, n: number, council: boolean): void {
  const g = c.candidates[n];
  if (!g) return;
  const same = c.governor === g.name && c.trait === g.trait;
  c.governor = g.name;
  c.trait = g.trait;
  c.candidates = [];
  c.chooseBy = 0;
  if (!same) c.govSince = s.tick;
  news(s.world, s.tick, siteKey(c.site), `${council ? `${c.name}’s council has chosen` : 'You have chosen'} ${g.name} to govern ${council ? 'it' : c.name}: ${TRAIT_WORDS[g.trait]} (${TRAIT_DOES[g.trait]})`);
  s.rev++;
}

/** A trait in a few words: "a builder". */
export const TRAIT_WORDS: Record<GovTrait, string> = { builder: 'a builder', miser: 'a miser', soldier: 'a soldier', favourite: 'a favourite of the people', loyal: 'loyal to your city', steady: 'steady, a careful hand', proud: 'proud', grasping: 'grasping' };

/** Slice 43's tick: shipments (porters, the ship, the voyage, landing); each colony's day (wants, works, the council) and month (stage, wants, governors). Nothing with no colony and no shipment. */
export function stepColonyWorks(s: SimState, map: CoastMap): void {
  const e = s.empire;
  const xs = e.cargoes ?? [];
  if (!e.colonies.length && !xs.length) return;
  for (const x of xs.slice()) stepCargo(s, map, x);
  if (xs.some((x) => x.phase === 'done')) e.cargoes = xs.filter((x) => x.phase !== 'done');
  if (s.tick % TICKS_PER_DAY !== 0) return;
  for (const c of e.colonies) daily(s, c);
  if (s.tick % TICKS_PER_MONTH === 0) for (const c of e.colonies) monthly(s, c);
}

// ---------------------------------------------------------------------------
// Your acts (the `colonyworks` command).

/** Why an act can't be done now ('' if it can). */
export function worksRefusal(s: SimState, map: CoastMap, act: string, site: string, work?: string, n?: number): string {
  const c = colonyOf(s, site);
  if (!c) return `${siteName(site)} is not your colony`;
  if (act === 'work') return WORKS[work as WorkKind] ? workRefusal(s, map, c, work as WorkKind) : 'Not a work';
  if (act === 'want') return wantRefusal(s, map, c);
  if (act === 'governor' || act === 'dismiss') return governorRefusal(c, act, n);
  return 'Not an act';
}

/** Do an act (worksRefusal said yes). */
export function worksCommand(s: SimState, map: CoastMap, cmd: Extract<Command, { type: 'colonyworks' }>): void {
  const site = String(cmd.site ?? '');
  if (worksRefusal(s, map, cmd.act, site, cmd.work, cmd.n) !== '') return;
  const c = colonyOf(s, site) as Colony;
  if (cmd.act === 'work') {
    const kind = cmd.work as WorkKind;
    const p = workPrice(c, kind);
    pay(s, -p.dr, 'colonies', `Works for ${c.name}`);
    const id = ship(s, map, site, { kind: 'work', work: kind, good: p.good, amount: p.amount, got: 0, out: 0 });
    c.works.push({ kind, phase: 'shipping', at: s.tick, done: 0, cargo: id });
    news(s.world, s.tick, siteKey(site), `You have funded ${WORKS[kind].name} for ${c.name} (${fmt(p.dr)} dr): porters carry ${amountWords(p.good, p.amount)} down to your quay, and your ship takes it there. It lands about ${dayWords(wouldLand(s, site))}`);
  } else if (cmd.act === 'want') {
    const w = c.want as Want;
    w.cargo = ship(s, map, site, { kind: 'want', work: '', good: w.good, amount: w.amount, got: 0, out: 0 });
    news(s.world, s.tick, siteKey(site), `You send ${c.name} the ${amountWords(w.good, w.amount)} it asked for: porters carry it down to your quay, and it lands about ${dayWords(wouldLand(s, site))}${wouldLand(s, site) > w.due ? ', after its day' : ', in time'}`);
  } else if (cmd.act === 'governor') choose(s, c, cmd.n as number, false);
  else if (cmd.act === 'dismiss') {
    const was = c.governor;
    const fav = c.trait === 'favourite';
    const m = fav ? DISMISSED_FAVOURITE : DISMISSED;
    remember(c, s.tick, 'dismissed', fav ? `you dismissed ${was}, its people’s favourite` : `you dismissed its governor, ${was}`, m.amount, m.fade);
    // (Review of slice 43: nor the man just dismissed.)
    c.candidates = candidatesFor(s, c);
    c.governor = '';
    c.chooseBy = s.tick + CHOOSE_DAYS;
    news(s.world, s.tick, siteKey(site), `You have dismissed ${was}, governor of ${c.name} (${m.amount}). Its council holds it until you choose another, by ${dayWords(c.chooseBy)}`);
  }
  s.rev++;
}

// ---------------------------------------------------------------------------
// For the map, the city, the hovers and the town lines.

/** Where a shipment's ship is on the map of Greece (distance along the colony's lane; null once landed). */
export function cargoOnMap(x: Cargo, tick: number): { along: number; where: 'bay' | 'quay' | 'sea' } | null {
  if (x.phase === 'loading') {
    const v = x.ship;
    if (!v || v.phase === SHIP_ANCHORED) return { along: 0, where: 'quay' };
    const u = clamp((tick - v.since) / SAIL_IN, 0, 1);
    return { along: HORIZON_ALONG * (1 - u), where: 'bay' };
  }
  if (x.phase === 'leaving') {
    const v = x.ship;
    const u = v ? clamp((tick - v.since) / Math.max(1, leaveTicks(v)), 0, 1) : 1;
    return { along: HORIZON_ALONG * u, where: 'bay' };
  }
  if (x.phase === 'sea') {
    const L = lineLength(tableWay(wayOf(siteLaneId(x.site))));
    const u = clamp((tick - x.start) / Math.max(1, x.dur), 0, 1);
    return { along: HORIZON_ALONG + (L - HORIZON_ALONG) * u, where: 'sea' };
  }
  return null;
}

/** A shipment in words for the page and the hovers: what is on the quay, what is missing, where the ship is. */
export function cargoDoing(s: SimState, x: Cargo): string {
  const c = colonyOf(s, x.site);
  const to = c?.name ?? siteName(x.site);
  if (x.phase === 'leaving') return `Sailing out of the bay for ${to} with ${cargoList(x)}: she lands about ${dayWords(landsAbout(s, x))}`;
  if (x.phase === 'sea') return `At sea for ${to} with ${cargoList(x)}: she lands about ${dayWords(x.start + x.dur)}${lateWords(s, `cargo-${x.site}`)}`;
  const parts = x.items.map((it) => `${fmt(Math.min(it.got, it.amount))} of ${amountWords(it.good, it.amount)}`);
  // (Review of slice 43: "hold none" when they hold none, not when what they hold is all promised to this shipment.)
  const short = x.items.filter((it) => it.amount - it.got - it.out > 0 && storedOf(s, it.good) <= 0 && !s.walkers.some((w) => w.kind === 'shipper' && w.origin === x.id && w.steps === x.items.indexOf(it)));
  const missing = short.length ? ` Waiting for ${listWords(short.map((it) => goodWord(it.good)))}: your stores hold none` : '';
  const b = blockaded(s);
  const v = x.ship;
  const held = b && v ? (v.phase === SHIP_COMING && !pastMouth(v.path, visitorAt(v, s.tick)?.inward ?? 0) ? ` Your ship waits outside the harbour: the mouth is held by a blockade.` : v.phase === SHIP_ANCHORED && allIn(x) ? ` Your ship waits at anchor, laden: the mouth is held by a blockade.` : '') : '';
  const where = !v ? '' : v.phase === SHIP_ANCHORED ? 'your ship rides at anchor off the jetty, and a boat rows the goods out to her' : `your ship sails in about ${dayWords(v.since + SAIL_IN)}`;
  return `Porters carry the goods for ${to} down to your quay: ${parts.join(', ')} on the quay or aboard; ${where}.${missing}${held}`;
}

/** A porter's hover. */
export function shipperDoing(s: SimState, w: Walker): { title: string; detail: string } {
  const x = cargoOf(s, w.origin);
  const c = x ? colonyOf(s, x.site) : undefined;
  const to = c?.name ?? (x ? siteName(x.site) : 'a colony');
  const k = tradeIndex(w.food);
  const it = x?.items[w.steps];
  const what = it?.kind === 'want' ? 'the goods it asked for' : it?.work ? `its ${WORKS[it.work].name.replace(/^(a|an|its) /, '')}` : 'it';
  return { title: `A porter for ${to} · ${amountWords(k, w.load)}`, detail: `Carrying ${amountWords(k, w.load)} from the ${findBuilding(s, w.home)?.kind ?? 'store'} down to the quay, for ${what}. A boat rows it out to your ship` };
}

/** Your shipment ship's hover in the bay. */
export function cargoShipStatus(s: SimState, x: Cargo): { title: string; detail: string } {
  const c = colonyOf(s, x.site);
  return { title: `Your ship for ${c?.name ?? siteName(x.site)}`, detail: `${cargoDoing(s, x)}\nOn the map of Greece she sails the lane to ${siteName(x.site)}` };
}

/** The line under the top bar, if a colony's want or a shipment needs you: a want not yet sent (rank 2), a shipment loading (rank 1). */
export function worksTownLine(s: SimState): { text: string; site: string; urgent: boolean; rank: number } | null {
  const want = s.empire.colonies.filter((c) => c.want && c.want.end === '' && !c.want.cargo).sort((a, b) => (a.want as Want).due - (b.want as Want).due)[0];
  if (want) {
    const w = want.want as Want;
    const days = Math.max(1, Math.ceil((w.due - s.tick) / TICKS_PER_DAY));
    return { text: `${want.name} asks you for ${amountWords(w.good, w.amount)} (${WANT_WHY[w.kind]}): send it from its page on the map of Greece within ${days} days.`, site: want.site, urgent: days <= 45, rank: 2 };
  }
  const x = cargoesFor(s).find((y) => y.phase === 'loading');
  if (x) {
    const c = colonyOf(s, x.site);
    const got = x.items.reduce((a, it) => a + Math.min(it.got, it.amount), 0);
    const all = x.items.reduce((a, it) => a + it.amount, 0);
    return { text: `Porters carry goods down to your quay for ${c?.name ?? siteName(x.site)}: ${fmt(got)} of ${fmt(all)} aboard or on the quay.`, site: x.site, urgent: false, rank: 1 };
  }
  return null;
}

/** For the rowing boat: an anchored ship with something on the quay to row out (a shipment loading with goods in, or settlers waiting). Each: where the quay spot is (post id) and which ship. */
export function rowingOut(s: SimState): Array<{ post: number; ship: Visitor }> {
  const out: Array<{ post: number; ship: Visitor }> = [];
  for (const x of cargoesFor(s)) if (x.phase === 'loading' && x.ship?.phase === SHIP_ANCHORED && x.items.some((it) => it.got > 0)) out.push({ post: x.post, ship: x.ship });
  for (const f of s.empire.foundings) if (f.phase === 'gathering' && f.ship?.phase === SHIP_ANCHORED && f.households.some((h) => h.state === 'quay')) out.push({ post: f.post, ship: f.ship });
  return out;
}

/** The save's check of this slice's records (saves.ts asks). */
export function colonyWorksOk(e: Record<string, unknown>): boolean {
  const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
  const fin = (x: unknown): boolean => typeof x === 'number' && Number.isFinite(x);
  if (!Array.isArray(e.cargoes)) return false;
  const colOk = (c: Record<string, unknown>): boolean =>
    fin(c.stage) && fin(c.wantNext) && fin(c.chooseBy) && fin(c.govSince) && Array.isArray(c.works) && Array.isArray(c.boosts) && Array.isArray(c.candidates) && (c.want === null || isObj(c.want)) &&
    (c.works as unknown[]).every((w) => isObj(w) && WORK_KINDS.includes(w.kind as WorkKind) && ['shipping', 'building', 'built'].includes(w.phase as string) && fin(w.at) && fin(w.done) && fin(w.cargo));
  const cargoOk = (x: unknown): boolean => isObj(x) && typeof x.site === 'string' && ['loading', 'leaving', 'sea', 'done'].includes(x.phase as string) && Array.isArray(x.items) && (x.ship === null || isObj(x.ship)) && ['id', 'post', 'at', 'start', 'dur', 'next'].every((k) => fin(x[k])) && (x.items as unknown[]).every((it) => isObj(it) && ['good', 'amount', 'got', 'out'].every((k) => fin(it[k])));
  return (e.colonies as unknown[]).every((c) => isObj(c) && colOk(c)) && (e.cargoes as unknown[]).every(cargoOk);
}
