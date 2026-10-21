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
 * (as taxes, by district) at the end of each day he is out (slice 30; before,
 * when he got back), or if he is lost on the way, or his office is cleared. A short-handed office lets him rest longer; with
 * nobody working it, he doesn't go out.
 *
 * The rate (none, light, fair, heavy, harsh) is set by a command. Heavy and
 * harsh taxes sour the moods of the homes a collector calls on (moodOf); at
 * harsh, once a month, such a household that is worried or worse may send
 * someone away.
 */
import type { CoastMap } from '../map/bake';
import { districtAt, DISTRICTS } from '../map/districts';
import { around, centreOf, livedIn, recountPopulation, VILLA } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from './clock';
import { leavingGroups, moodOf, moveOut } from './folk';
import { canWorkIn, rateOf } from './labour';
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
  [0, 1, 2, 3, 5, 7, 12],
  [0, 2, 3, 5, 7, 10, 18],
  [0, 3, 4, 7, 10, 14, 25],
  [0, 4, 6, 9, 13, 18, 32],
];

/** What a full home of this level pays at this rate. */
export const taxOf = (rate: number, level: number): number => TAX[Math.max(0, Math.min(HARSH, rate))][Math.max(0, Math.min(VILLA, level))];

/** What this household owes the collector at the city's rate (its level's tax). */
export const taxFor = (s: SimState, b: Building): number => (b.people > 0 ? taxOf(s.taxRate, b.level) : 0);

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
  serve(s: SimState, size: number, t: number, w: Walker, map: CoastMap) {
    for (const b of besideRoad(s, size, t, near)) {
      if (!owesTax(s, b)) continue;
      const amount = taxFor(s, b);
      b.taxedAt = s.tick;
      b.taxPaid = amount;
      if (amount <= 0) continue;
      const [cx, cz] = centreOf(b);
      addToPurse(w, districtAt(map, cx, cz), amount);
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
  // Slice 30: each collector out hands in his satchel at the end of every day (with crime's switch on, so a demo's
  // history plays as it did): the same ledger lines, taxes by district, coming in day by day instead of in lumps.
  if (s.crime.on && s.tick % TICKS_PER_DAY === 0) for (const w of s.walkers) if (w.kind === 'tax' && w.purse.length) handIn(s, w);
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

/**
 * At harsh, each month, what each household a collector has called on lately
 * does, by its mood (MOODS: 0 fed up … 4 content): out of HARSH_DIE chances,
 * how many see it pack up and leave whole, and how many more see it send
 * someone away. Content households stay put.
 */
const HARSH_DIE = 12;
const HARSH_GO: readonly number[] = [6, 6, 3, 1, 0];
const HARSH_SEND: readonly number[] = [0, 0, 6, 5, 0];
/**
 * Slice 30: harsh taxes bite harder (with crime's switch on, so a demo's history plays as it did): a fed-up or
 * unhappy household leaves two chances in three, a worried one one in three, one getting by one in six, and one
 * getting by may send someone away too.
 */
const HARSH_GO_NOW: readonly number[] = [8, 8, 4, 2, 0];
const HARSH_SEND_NOW: readonly number[] = [0, 0, 6, 5, 1];
/** Households smaller than this send nobody away on their own (nobody can go without breaking up the family). */
const HARSH_LEAVE_MIN = 3;
/** How long the city remembers households driven out by the taxes (taxGone): a year. */
export const TAX_GONE_KEPT = 12 * TICKS_PER_MONTH;

/** A small hash for choosing who goes (not state: the same household and month always give the same answer). */
function mix(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 13;
  return h >>> 0;
}

/** Households that left whole for the taxes in the last `within` ticks. */
export const goneForTaxes = (s: SimState, within = TICKS_PER_MONTH): number => s.taxGone.filter((t) => s.tick - t < within).length;

/**
 * The first of the month, at harsh taxes, among the households a collector
 * has called on lately: some that are unhappy or fed up pack up and leave the
 * city whole, their home left an empty plot for newcomers (who, while taxes
 * are harsh, come a third as often: see settlers.ts); some that are worried
 * send someone away (the smallest group that can go: a grown child, or a
 * family who joined them), their story saying the taxes drove them out.
 */
export function stepHarsh(s: SimState, map: CoastMap): void {
  if (s.tick % TICKS_PER_MONTH !== 0) return;
  // The city's memory of households driven out keeps a year.
  if (s.taxGone.length && s.tick - s.taxGone[0] >= TAX_GONE_KEPT) s.taxGone = s.taxGone.filter((t) => s.tick - t < TAX_GONE_KEPT);
  if (s.taxRate < HARSH) return;
  const has = (k: Building['kind']): boolean => s.buildings.some((o) => o.kind === k);
  const ctx = { agora: has('agora'), jobs: s.buildings.some((o) => o.kind !== 'home'), shrine: has('shrine'), theatre: has('theatre') };
  const month = monthOf(s.tick);
  let changed = false;
  for (const b of s.buildings) {
    const f = b.family;
    if (!f || !livedIn(b) || b.taxedAt === 0 || s.tick - b.taxedAt >= 2 * TICKS_PER_MONTH) continue;
    const mood = moodOf(s, b, ctx, canWorkIn(s, b)).level;
    const roll = mix(f.seed, month) % HARSH_DIE;
    const go = s.crime.on ? HARSH_GO_NOW : HARSH_GO;
    const send = s.crime.on ? HARSH_SEND_NOW : HARSH_SEND;
    if (roll >= go[mood] + send[mood]) continue;
    if (roll < go[mood]) {
      // The whole household packs up and goes.
      const going = b.people;
      leaveWhole(s, b);
      s.left += going;
      sendLeavers(s, map, going, centreOf(b), around(map.size, b));
      s.taxGone.push(s.tick);
      changed = true;
      continue;
    }
    if (b.people < HARSH_LEAVE_MIN || leavingGroups(s, f, 1).length === 0) continue;
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

/** A household leaves its home whole: the house stands empty, a plot again, until newcomers come. */
function leaveWhole(s: SimState, b: Building): void {
  b.people = 0;
  b.family = null;
  b.level = 0;
  b.since = s.tick;
  b.workers = 0;
  b.unpaid = 0;
}
