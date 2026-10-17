/**
 * The tax office and its tax collector, the tax rate, and what harsh taxes do.
 *
 * A tax office beside a road, with workers, sends out a tax collector. He
 * walks the shared round (src/sim/rounds.ts), never further than his reach by
 * road, heading for the nearest homes that owe.
 * Each lived-in home beside his way pays him, by its level and the city's tax
 * rate, unless he (or another collector) called within the last month; homes
 * he never passes pay nothing. He
 * keeps the coins in his satchel, by district, and they reach the treasury
 * (as taxes, by district) when he gets back, or if he is lost on the way, or
 * his office is cleared. A short-handed office lets him rest longer; with
 * nobody working it, he doesn't go out.
 *
 * The rate (none, light, fair, heavy, harsh) is set by a command. Heavy and
 * harsh taxes sour the moods of the homes a collector calls on (moodOf); at
 * harsh, once a month, such a household that is worried or worse may send
 * someone away.
 */
import { coastMap, type CoastMap } from '../map/bake';
import { districtAt, DISTRICTS } from '../map/districts';
import { around, centreOf, livedIn, recountPopulation, VILLA } from './buildings';
import { TICKS_PER_MONTH } from './clock';
import { leavingGroups, moodOf, moveOut } from './folk';
import { canWork, rateOf } from './labour';
import { moveRounds, sendOut, type ServiceSpec } from './rounds';
import { sendLeavers } from './settlers';
import type { Building, SimState, Walker } from './state';
import { income, monthOf } from './treasury';
import { besideRoad, COLLECTOR_SPEED } from './walk';
import { restFor } from './water';

/** The rates, from none to harsh (the state keeps the index). */
export const TAX_RATES = ['none', 'light', 'fair', 'heavy', 'harsh'] as const;
export type TaxRate = (typeof TAX_RATES)[number];
export const FAIR = 2;
export const HEAVY = 3;
export const HARSH = 4;

/**
 * What a household pays the collector each month, by rate (rows) and level
 * (plot, tent, hut, cottage, townhouse, fine house, villa): the villas pay the most.
 */
export const TAX: readonly (readonly number[])[] = [
  [0, 0, 0, 0, 0, 0, 0],
  [0, 1, 2, 3, 5, 6, 8],
  [0, 2, 3, 5, 7, 9, 12],
  [0, 3, 4, 7, 10, 13, 16],
  [0, 4, 6, 9, 13, 17, 22],
];

/** What a home of this level pays at this rate. */
export const taxOf = (rate: number, level: number): number => TAX[Math.max(0, Math.min(HARSH, rate))][Math.max(0, Math.min(VILLA, level))];

/** How far by road from his office the collector ever goes, and how much fresh road a round is. */
export const COLLECTOR_RANGE = 32;
export const COLLECTOR_WALK = 32;
/** He walks half as fast again as the others (COLLECTOR_SPEED): a man with a satchel to fill, so one office can call on a neighbourhood every month. */
/** Ticks he rests between rounds at a fully staffed office, and before the first. */
export const COLLECTOR_REST = 30;
export const FIRST_COLLECTOR = 20;

/** Has a tax collector called on a home within the last month (it pays at most once in any month)? */
export const taxedLately = (s: SimState, b: Building): boolean => b.taxedAt > 0 && s.tick - b.taxedAt < TICKS_PER_MONTH;

/**
 * Does the collector want to call here? A lived-in home not taxed within the
 * last month, or one he called on while the rate was none (it paid nothing)
 * that would pay now: raising the rate from none brings taxes in at once.
 */
export const owesTax = (s: SimState, b: Building): boolean => livedIn(b) && (!taxedLately(s, b) || (b.taxPaid === 0 && taxOf(s.taxRate, b.level) > 0));

const near: Building[] = [];

/** The tax collector's round. */
export const TAXES: ServiceSpec = {
  record: (s) => s.rounds.tax,
  range: COLLECTOR_RANGE,
  walk: COLLECTOR_WALK,
  speed: COLLECTOR_SPEED,
  // The nearest home that owes (every one counts the same, so the walk there decides): a full satchel, not one straggler.
  score: (b, s) => (owesTax(s, b) ? 0 : Infinity),
  due: () => Infinity,
  serve(s: SimState, size: number, t: number, w: Walker) {
    for (const b of besideRoad(s, size, t, near)) {
      if (!owesTax(s, b)) continue;
      const amount = taxOf(s.taxRate, b.level);
      b.taxedAt = s.tick;
      b.taxPaid = amount;
      if (amount <= 0) continue;
      const [cx, cz] = centreOf(b);
      // The coast is the only map (sim.ts's mapFor says the same).
      addToPurse(w, districtAt(coastMap(), cx, cz), amount);
    }
  },
  rest: (b) => restFor(b, COLLECTOR_REST),
  finish: (s, w) => handIn(s, w),
};

/** Add a home's tax to the satchel: [district, drachmas, homes] triples. */
function addToPurse(w: Walker, district: number, amount: number): void {
  for (let i = 0; i < w.purse.length; i += 3) {
    if (w.purse[i] === district) {
      w.purse[i + 1] += amount;
      w.purse[i + 2]++;
      return;
    }
  }
  w.purse.push(district, amount, 1);
}

/** What his satchel holds. */
export function purseTotal(w: Walker): number {
  let n = 0;
  for (let i = 1; i < w.purse.length; i += 3) n += w.purse[i];
  return n;
}

/** The collector hands in his satchel: taxes by district, into the treasury. */
export function handIn(s: SimState, w: Walker): void {
  for (let i = 0; i < w.purse.length; i += 3) income(s, w.purse[i + 1], 'taxes', DISTRICTS[w.purse[i]]?.where ?? 'elsewhere', w.purse[i + 2]);
  w.purse = [];
}

/** Tax offices: send out the collector when one is due and someone works there. */
export function stepTaxOffices(s: SimState, map: CoastMap): void {
  const size = map.size;
  for (const b of s.buildings) {
    if (b.kind !== 'taxoffice' || b.walker !== 0) continue;
    if (--b.clock > 0) continue;
    // No road to walk, or nobody to work it: look again in a little while.
    if (rateOf(b) === 0 || !sendOut(s, size, b, 'tax')) b.clock = COLLECTOR_REST;
  }
}

/** Move the tax collector one tick along. Returns false when he is done for this round. */
export function moveCollector(s: SimState, map: CoastMap, w: Walker): boolean {
  return moveRounds(s, map, w, TAXES, 'taxoffice');
}

/** At harsh, each month, about one in this many unhappy households sends someone away. */
const HARSH_LEAVE_ONE_IN = 3;
/** Households this glum or worse (worried, unhappy, fed up) may send someone away. */
const HARSH_LEAVE_MOOD = 2;
/** Households smaller than this stay put (nobody can go without breaking up the family). */
const HARSH_LEAVE_MIN = 3;

/** A small hash for choosing who goes (not state: the same household and month always give the same answer). */
function mix(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 13;
  return h >>> 0;
}

/**
 * The first of the month, at harsh taxes: some households a collector calls
 * on that are worried or worse send someone away (the smallest group that can go: a grown child,
 * or a family who joined them), their story saying the taxes drove them out.
 */
export function stepHarsh(s: SimState, map: CoastMap): void {
  if (s.taxRate < HARSH || s.tick % TICKS_PER_MONTH !== 0) return;
  const has = (k: Building['kind']): boolean => s.buildings.some((o) => o.kind === k);
  const ctx = { agora: has('agora'), jobs: s.buildings.some((o) => o.kind !== 'home'), shrine: has('shrine'), theatre: has('theatre') };
  const month = monthOf(s.tick);
  let changed = false;
  for (const b of s.buildings) {
    const f = b.family;
    if (!f || !livedIn(b) || b.people < HARSH_LEAVE_MIN || b.taxedAt === 0 || s.tick - b.taxedAt >= 2 * TICKS_PER_MONTH) continue;
    if (mix(f.seed, month) % HARSH_LEAVE_ONE_IN !== 0) continue;
    if (moodOf(s, b, ctx, canWork(b)).level > HARSH_LEAVE_MOOD) continue;
    if (leavingGroups(s, f, 1).length === 0) continue;
    const going = moveOut(s, b, 1, 'tax').length;
    if (going === 0) continue;
    b.people -= going;
    s.left += going;
    sendLeavers(s, map, going, centreOf(b), around(map.size, b));
    changed = true;
  }
  if (changed) {
    recountPopulation(s);
    s.rev++;
  }
}
