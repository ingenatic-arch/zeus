/**
 * The town's annals (slice 51): a figure for each month, so the overview can
 * draw the last two years and say how things have moved.
 *
 * - **A month's figures** (`AnnalMonth`) are written on the first tick of
 *   the next month: the people, homes and how many are glad, jobs and
 *   workers, the treasury and what came in and went out, what is in store
 *   of every ware, how many homes each service reached, crimes and catches,
 *   the sick and the well-kept homes, soldiers and ships, vassals and
 *   colonists. Plain numbers, the last ANNAL_MONTHS months kept.
 * - **The year** (`AnnalYear`, this year so far and last year, by the city's
 *   calendar): the treasury's coming in and going out by kind (IN_GROUPS,
 *   OUT_GROUPS), and crime by kind (CRIME_ROWS), for the overview's
 *   Treasury and Crime pages.
 * - What happens this month so far is read live from the ledger and crime's
 *   tallies (`yearNow`, `figures`); only finished months are written.
 *
 * Nothing in the sim reads the annals, so keeping them never changes how the
 * town plays. Pure: no random numbers, no clock but the tick.
 *
 * Merge of slice 51 with slice 49: `sick` is everyone ill at the month's
 * end, and `health` the month's tally from health.ts (fell ill, died, fled
 * the plague; left out of a month with none, to keep saves small).
 *
 * Merge of slice 51 with slice 45: a crime is one criminal act, counted as
 * the court's monthly rate counts it (justice.ts' RATE_KINDS: a theft, a
 * crowd's pockets picked, a building smashed, a fire set, a lot smuggled, the
 * takings skimmed), so the month's crimes, the year's by kind and the quarters
 * all agree. The court's sentences, the prisoners home again and the
 * breakouts are counted for the month as they happen (`court`, justice.ts
 * adds to it), and written with the month.
 */
import { canWorkIn, workforce } from './labour';
import { livedIn } from './buildings';
import { START_MONTH, TICKS_PER_MONTH } from './clock';
import { moodCtx, talliesNow, type CrimeTally } from './crime';
// Merge of slice 51 with slice 45: the court's monthly rate, its punishments.
import { PUNISHMENTS, RATE_KINDS, type RateMonth } from './justice';
import { moodOf, needsOf, NEEDS, untilOf } from './folk';
import { WARES } from './foods';
import { peopleOf } from './colonies';
import { stockOf } from './stocks';
import type { LedgerLine, SimState } from './state';

/** How many months the annals keep. */
export const ANNAL_MONTHS = 24;

/** One month's figures, written when it ends. */
export interface AnnalMonth {
  /** The month it is for (months since the founding). */
  m: number;
  /** People, lived-in homes, and how many homes are content or getting by. */
  people: number;
  homes: number;
  glad: number;
  /** Everyone who had come and left since the founding, at the month's end (the month's own: the difference from the month before). */
  came: number;
  went: number;
  /** Jobs, and how many were filled. */
  jobs: number;
  filled: number;
  /** The treasury at the month's end, and what came in and went out over the month. */
  money: number;
  in: number;
  out: number;
  /** What the city held of each ware at the month's end (WARES order). */
  stock: number[];
  /** Of the homes whose level needs each service (NEEDS order), the share that had it at the month's end, in percent (-1: no home needed it). */
  reach: number[];
  /** The month's crimes (every kind, each act once, as the court's rate counts them), and criminals caught. */
  crimes: number;
  caught: number;
  /** Merge of slice 45: the court's month (COURT_ROWS order: sentences by punishment, home again, broken out; empty for a month with none, to keep saves small), and those in prison at its end. */
  court: number[];
  jailed: number;
  /** The sick at the month's end, and the share of homes with water and food on the table, in percent (-1: no homes). */
  sick: number;
  well: number;
  /** Merge of slice 49: the month's health (HEALTH_ROWS order: fell ill, died, households fled the plague; left out of a month with none, to keep saves small). */
  health?: number[];
  /** Soldiers in your companies, and triremes afloat or building. */
  soldiers: number;
  ships: number;
  /** Your vassals, and the people of your colonies. */
  vassals: number;
  colonists: number;
}

/** A year's money by kind, and crime by kind. */
export interface AnnalYear {
  /** The year it is for (the city's calendar years since the founding year: 0 is the founding year). */
  y: number;
  /** Drachmas in and out by group (IN_GROUPS, OUT_GROUPS order; out as positive sums). */
  in: number[];
  out: number[];
  /** Crime by kind (CRIME_ROWS order). */
  crime: number[];
}

export interface Annals {
  /** The last month written (months since the founding; -1: none yet). */
  month: number;
  /** The tick the record begins: 0 for a new game; an older save's tick when it was loaded (its earlier months weren't kept). */
  since: number;
  months: AnnalMonth[];
  /** Merge of slice 45: this month's court so far (COURT_ROWS order), added to as it happens (justice.ts). */
  court: number[];
  /** This year's finished months, and last year (null: none kept). */
  year: AnnalYear;
  last: AnnalYear | null;
}

/** The treasury's kinds of coming in, each with the ledger's kinds it gathers ('other': anything else that came in). */
export const IN_GROUPS: ReadonlyArray<{ id: string; name: string; kinds: readonly string[] }> = [
  { id: 'taxes', name: 'Taxes', kinds: ['taxes'] },
  { id: 'trade', name: 'Trade', kinds: ['sales'] },
  { id: 'empire', name: 'Tribute, gifts and spoils', kinds: ['vassals', 'given', 'collected', 'recovered'] },
  // (Merge of slice 47: the colonies' and free allies' share of their trade, in coin.)
  { id: 'colonytrade', name: 'Colonies’ trade', kinds: ['colonytrade'] },
  { id: 'loans', name: 'Loans', kinds: ['borrowed', 'repayment', 'returned'] },
  { id: 'fines', name: 'Fines', kinds: ['fines'] },
  { id: 'other', name: 'Other', kinds: [] },
];

/** The treasury's kinds of going out ('other': anything else that went out). */
export const OUT_GROUPS: ReadonlyArray<{ id: string; name: string; kinds: readonly string[] }> = [
  { id: 'wages', name: 'Wages', kinds: ['wages'] },
  { id: 'army', name: 'Soldiers and rowers', kinds: ['soldiers', 'hirelings', 'rowers'] },
  { id: 'building', name: 'Building and repairs', kinds: ['building', 'clearing', 'repairs'] },
  { id: 'trade', name: 'Bought abroad', kinds: ['imports', 'routes'] },
  { id: 'greece', name: 'Gifts, tribute and colonies', kinds: ['gifts', 'favours', 'tribute', 'peace', 'colonies'] },
  { id: 'loans', name: 'Loans', kinds: ['lent', 'repaid'] },
  { id: 'lost', name: 'Stolen, raided and seized', kinds: ['raid', 'stolen', 'skimmed', 'seized'] },
  { id: 'other', name: 'Other', kinds: [] },
];

/**
 * The court's rows (merge of slice 45): a sentence of each punishment (PUNISHMENTS order), then a prisoner or labourer
 * home again, then one broken out of prison.
 */
export const COURT_ROWS: ReadonlyArray<{ key: string; name: string }> = [
  { key: 'fine', name: 'Fined by the court' },
  { key: 'stocks', name: 'Put in the stocks' },
  { key: 'prison', name: 'Sent to prison' },
  { key: 'labour', name: 'Sent to hard labour' },
  { key: 'exile', name: 'Exiled' },
  { key: 'execution', name: 'Put to death' },
  { key: 'freed', name: 'Home from their sentence' },
  { key: 'broke', name: 'Broke out of prison' },
];
/** COURT_ROWS' index of the prisoners home again, and of those broken out (a sentence's is its punishment's in PUNISHMENTS). */
export const COURT_FREED = PUNISHMENTS.length;
export const COURT_BROKE = PUNISHMENTS.length + 1;
const freshCourt = (): number[] => COURT_ROWS.map(() => 0);

/** Where a crime row's figure comes from: the court's rate (a kind, the caught, the tried), crime's tally, or the court's month. */
type RowFrom = { rate: number } | { caught: true } | { tried: true } | { tally: keyof CrimeTally } | { court: number };

/**
 * Crime by kind (merge of slice 45): each kind of crime as an act (`crime`, from the court's rate, RATE_KINDS order),
 * then what they took, the caught, the tried and the fines, then the court's sentences, home-comings and breakouts
 * (`court`).
 */
export const CRIME_ROWS: ReadonlyArray<{ key: string; name: string; crime: boolean; dr?: boolean; court?: boolean; from: RowFrom }> = [
  { key: 'theft', name: 'Thefts', crime: true, from: { rate: RATE_KINDS.indexOf('theft') } },
  { key: 'pickpocket', name: 'Crowds’ pockets picked', crime: true, from: { rate: RATE_KINDS.indexOf('pickpocket') } },
  { key: 'vandal', name: 'Buildings smashed', crime: true, from: { rate: RATE_KINDS.indexOf('vandal') } },
  { key: 'arson', name: 'Fires set', crime: true, from: { rate: RATE_KINDS.indexOf('arson') } },
  { key: 'smuggling', name: 'Goods smuggled', crime: true, from: { rate: RATE_KINDS.indexOf('smuggling') } },
  { key: 'skimming', name: 'Takings skimmed', crime: true, from: { rate: RATE_KINDS.indexOf('skimming') } },
  { key: 'picked', name: 'Purses cut', crime: false, from: { tally: 'picked' } },
  { key: 'skimmed', name: 'Skimmed from taxes', crime: false, dr: true, from: { tally: 'skimmed' } },
  { key: 'caught', name: 'Caught', crime: false, from: { caught: true } },
  { key: 'tried', name: 'Tried at the court', crime: false, from: { tried: true } },
  { key: 'fines', name: 'Fines', crime: false, dr: true, from: { tally: 'fines' } },
  ...COURT_ROWS.map((r, i) => ({ key: r.key, name: r.name, crime: false, court: true, from: { court: i } })),
];

/** The court's rate for a month (this month's, or a closed one kept), or null if it has none. Pure. */
export function rateFor(s: SimState, month: number): RateMonth | null {
  const c = s.crime;
  if (c.rate?.month === month) return c.rate;
  return c.rates?.find((r) => r.month === month) ?? null;
}

/** The crimes in a month of the rate (every kind, each act once). */
export const crimesIn = (r: RateMonth | null): number => (r ? r.n.reduce((a, b) => a + b, 0) : 0);

/** Each crime row's figure for a month, from its rate, crime's tally and the court's month. */
export function crimeRows(t: CrimeTally, r: RateMonth | null, court: readonly number[]): number[] {
  return CRIME_ROWS.map(({ from: f }) => ('rate' in f ? (r?.n[f.rate] ?? 0) : 'caught' in f ? (r?.caught ?? 0) : 'tried' in f ? (r?.tried ?? 0) : 'tally' in f ? (t[f.tally] ?? 0) : (court[f.court] ?? 0)));
}

/** Those in prison now. */
export const jailedNow = (s: SimState): number => s.crime.held.filter((x) => x.as === 'prison').length;

/** The year of the city's calendar a month falls in (0: the founding year). */
export const yearOfMonth = (m: number): number => Math.floor((m + START_MONTH) / 12);

const freshYear = (y: number): AnnalYear => ({ y, in: IN_GROUPS.map(() => 0), out: OUT_GROUPS.map(() => 0), crime: CRIME_ROWS.map(() => 0) });

/** Empty annals, beginning at `tick` (a new game's 0; an older save's tick when it was loaded). */
export function freshAnnals(tick = 0): Annals {
  const m = Math.floor(tick / TICKS_PER_MONTH);
  return { month: m - 1, since: tick, months: [], court: freshCourt(), year: freshYear(yearOfMonth(m)), last: null };
}

/** Which group a ledger line goes in: its index in IN_GROUPS (money in) or OUT_GROUPS (money out). */
export function groupOf(l: { kind: string; amount: number }): { out: boolean; i: number } {
  const out = l.amount < 0;
  const groups = out ? OUT_GROUPS : IN_GROUPS;
  const i = groups.findIndex((g) => g.kinds.includes(l.kind));
  return { out, i: i < 0 ? groups.length - 1 : i };
}

/** Add a month's ledger lines and crime rows (crimeRows) into a year. */
export function addToYear(y: AnnalYear, lines: readonly LedgerLine[], crime: readonly number[]): void {
  for (const l of lines) {
    if (!l.amount) continue;
    const g = groupOf(l);
    if (g.out) y.out[g.i] = (y.out[g.i] ?? 0) - l.amount;
    else y.in[g.i] = (y.in[g.i] ?? 0) + l.amount;
  }
  CRIME_ROWS.forEach((_, i) => (y.crime[i] = (y.crime[i] ?? 0) + (crime[i] ?? 0)));
}

/** Merge of slice 49: the sick in the city now. */
export const sickNow = (s: SimState): number => (s.health?.on ? s.health.sick.length : 0);

/** Merge of slice 49: the month's health rows (a month's `health`, in this order). */
export const HEALTH_ROWS: ReadonlyArray<{ key: 'ill' | 'died' | 'fled'; name: string }> = [
  { key: 'ill', name: 'Fell ill' },
  { key: 'died', name: 'Died' },
  { key: 'fled', name: 'Households fled the plague' },
];

/** Merge of slice 49: a month's health rows from health's tally of it (`last` once the month has ended, `now` while it runs), or none. */
export function healthRows(s: SimState, month: number): number[] {
  const h = s.health;
  if (!h) return [];
  const t = h.month === month ? h.now : h.month === month + 1 ? h.last : null;
  return t ? HEALTH_ROWS.map((r) => t[r.key]) : HEALTH_ROWS.map(() => 0);
}

/** The figures that stand at a moment (everything but the month's flows): for the month's end, and for "now" on the overview. */
export function figures(s: SimState): Omit<AnnalMonth, 'm' | 'in' | 'out' | 'crimes' | 'caught' | 'court' | 'health'> {
  const homes = s.buildings.filter(livedIn);
  const ctx = moodCtx(s);
  let glad = 0;
  let well = 0;
  for (const b of homes) {
    if (moodOf(s, b, ctx, canWorkIn(s, b)).level >= 3) glad++;
    const needs = needsOf(b);
    const wet = b.waterUntil > s.tick;
    const fed = !needs.includes('food') || untilOf(b, 'food') > s.tick;
    if (wet && fed) well++;
  }
  const reach = NEEDS.map((n) => {
    let need = 0;
    let have = 0;
    for (const b of homes) {
      if (!needsOf(b).includes(n)) continue;
      need++;
      if (untilOf(b, n) > s.tick) have++;
    }
    return need ? Math.round((have / need) * 100) : -1;
  });
  const wf = workforce(s);
  return {
    people: s.population,
    homes: homes.length,
    glad,
    came: s.arrived,
    went: s.left,
    jobs: wf.jobs,
    filled: wf.filled,
    money: s.money,
    stock: WARES.map((w) => stockOf(s, w).total),
    reach,
    sick: sickNow(s),
    well: homes.length ? Math.round((well / homes.length) * 100) : -1,
    // (Merge of slice 47: your own companies' men, not an ally's or a colony's militia.)
    soldiers: s.army.soldiers.filter((x) => x.state !== 'fallen' && x.state !== 'leaving' && !s.army.companies.find((c) => c.id === x.company)?.ally).length,
    ships: s.fleet.triremes.filter((t) => t.state !== 'sinking').length,
    vassals: s.empire.vassals.length,
    colonists: s.empire.colonies.reduce((a, c) => a + peopleOf(s, c), 0),
    jailed: jailedNow(s),
  };
}

/** The ledger's lines for the month before this one, as of now, and the treasury at its end. */
function lastMonthsLedger(s: SimState, m: number): { lines: readonly LedgerLine[]; money: number } {
  const l = s.ledger;
  if (l.month === m) return { lines: l.last, money: l.start };
  if (l.month === m - 1) return { lines: l.now, money: s.money };
  return { lines: [], money: s.money };
}

/** The first tick of each month: last month's figures into the annals (nothing else in the town moves). */
export function stepAnnals(s: SimState): void {
  if (s.tick % TICKS_PER_MONTH !== 0 || s.tick === 0) return;
  const a = s.annals;
  const m = Math.floor(s.tick / TICKS_PER_MONTH);
  const ended = m - 1;
  if (ended <= a.month) return;
  const { lines, money } = lastMonthsLedger(s, m);
  const t = talliesNow(s).last;
  const r = rateFor(s, ended);
  const court = a.court ?? freshCourt();
  let i = 0;
  let o = 0;
  for (const x of lines) {
    if (x.amount > 0) i += x.amount;
    else o -= x.amount;
  }
  const now = figures(s);
  // (Merge of slice 49: health's tally rolls over before the annals are written, so last month's is health's `last`.)
  const hr = healthRows(s, ended);
  a.months.push({ m: ended, ...now, money, in: i, out: o, crimes: crimesIn(r), caught: r?.caught ?? 0, court: court.some((n) => n > 0) ? court.slice() : [], ...(hr.some((n) => n > 0) ? { health: hr } : {}) });
  if (a.months.length > ANNAL_MONTHS) a.months.splice(0, a.months.length - ANNAL_MONTHS);
  // The year: a new one begun moves this one to last.
  const y = yearOfMonth(ended);
  if (a.year.y !== y) {
    a.last = a.year.y === y - 1 ? a.year : null;
    a.year = freshYear(y);
  }
  addToYear(a.year, lines, crimeRows(t, r, court));
  a.court = freshCourt();
  a.month = ended;
}

/** This year so far (its finished months and this month's, as of now) and last year, for the overview. Pure. */
export function yearNow(s: SimState): { now: AnnalYear; last: AnnalYear | null } {
  const a = s.annals;
  const m = Math.floor(s.tick / TICKS_PER_MONTH);
  const y = yearOfMonth(m);
  const now = freshYear(y);
  let last: AnnalYear | null = null;
  if (a.year.y === y) {
    now.in = a.year.in.slice();
    now.out = a.year.out.slice();
    now.crime = a.year.crime.slice();
    last = a.last && a.last.y === y - 1 ? a.last : null;
  } else if (a.year.y === y - 1) last = a.year;
  const l = s.ledger;
  addToYear(now, l.month === m ? l.now : [], crimeRows(talliesNow(s).now, rateFor(s, m), a.court ?? []));
  return { now, last };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const finList = (v: unknown): boolean => Array.isArray(v) && v.every(fin);
const yearOk = (y: unknown): boolean => isObj(y) && fin(y.y) && finList(y.in) && finList(y.out) && finList(y.crime);
const MONTH_NUMBERS = ['m', 'people', 'homes', 'glad', 'came', 'went', 'jobs', 'filled', 'money', 'in', 'out', 'crimes', 'caught', 'sick', 'well', 'soldiers', 'ships', 'vassals', 'colonists', 'jailed'] as const;

/** Are saved annals whole? */
export function annalsOk(a: unknown): boolean {
  if (!isObj(a) || !fin(a.month) || !fin(a.since) || !Array.isArray(a.months) || !finList(a.court) || !yearOk(a.year) || !(a.last === null || yearOk(a.last))) return false;
  // (Merge of slice 49: a month's health is left out when there was none.)
  return a.months.every((x) => isObj(x) && MONTH_NUMBERS.every((k) => fin(x[k])) && finList(x.stock) && finList(x.reach) && finList(x.court) && (x.health === undefined || finList(x.health)));
}

/**
 * A saved town whose annals are damaged or missing keeps everything else:
 * they start again, empty, from its tick (only the history is lost). For the
 * save reader, after migrating. A month's wares are padded to however many
 * wares there are.
 */
export function mendAnnals(st: unknown): void {
  if (!isObj(st)) return;
  if (annalsOk(st.annals)) {
    const an = st.annals as Annals;
    for (const x of an.months) {
      while (x.stock.length < WARES.length) x.stock.push(0);
    }
    while (an.court.length < COURT_ROWS.length) an.court.push(0);
    for (const y of [an.year, an.last]) if (y) while (y.crime.length < CRIME_ROWS.length) y.crime.push(0);
    return;
  }
  st.annals = freshAnnals(fin(st.tick) ? st.tick : 0);
}
