/**
 * The treasury: every drachma in or out goes through `pay`, with what it was
 * for, and lands on a line of the ledger, so the ledger always adds up.
 *
 * Wages: on the first of each month every workplace is owed WAGE drachmas
 * for each worker it has. The treasury pays them in building order, each in
 * full or not at all; a workplace it can't pay keeps its wages owed for the
 * month and works at half speed (see rateOf), and the households of its
 * workers are told (see shareWork). Money that comes in pays owed wages
 * first, so wages resume as soon as there is money. Nothing owed is carried
 * into the next month: there is no debt, and the money never goes below zero.
 *
 * While the city has no tax office, the treasury keeps back what one costs:
 * neither wages nor other building can spend it, so a city that has run dry
 * can always build one and recover.
 */
import { ROWER_PAY } from './lanes';
import { COST, TAX_OFFICE_COST } from './build';
import { JOBS } from './buildings';
import { TICKS_PER_MONTH } from './clock';
import type { Building, BuildingKind, Ledger, LedgerKind, SimState } from './state';

/** What a workplace pays each of its workers on the first of the month. */
export const WAGE = 2;
/** What a soldier is paid on the first of the month (army.ts), after the workplaces' wages. */
export const SOLDIER_PAY = 3;
/** A hireling's pay a month (slice 24): three times a citizen soldier's. */
export const HIRED_PAY = 3 * SOLDIER_PAY;

/** The month (since the founding) a tick falls in. */
export const monthOf = (tick: number): number => Math.floor(tick / TICKS_PER_MONTH);

/** A ledger for a treasury that holds `money` now, in the month of `tick`. */
export function freshLedger(money: number, tick: number): Ledger {
  return { month: monthOf(tick), start: money, now: [], lastStart: money, last: [] };
}

/** Start a new month in the ledger if the month has turned. */
export function turnMonth(s: SimState): void {
  const l = s.ledger;
  const m = monthOf(s.tick);
  if (m === l.month) return;
  if (m === l.month + 1) {
    l.lastStart = l.start;
    l.last = l.now;
  } else {
    // Months with nothing in them (or time gone backwards): last month is empty.
    l.lastStart = s.money;
    l.last = [];
  }
  l.start = s.money;
  l.now = [];
  l.month = m;
}

/**
 * The one way the treasury changes: `amount` drachmas in (positive) or out
 * (negative), on the ledger line for this kind and what, counting `n`.
 */
export function pay(s: SimState, amount: number, kind: LedgerKind, what: string, n = 1): void {
  if (amount === 0 && n === 0) return;
  turnMonth(s);
  s.money += amount;
  const line = s.ledger.now.find((l) => l.kind === kind && l.what === what);
  if (line) {
    line.amount += amount;
    line.n += n;
  } else s.ledger.now.push({ kind, what, amount, n });
}

/** Money coming in: on the ledger, then to any wages still owed. */
export function income(s: SimState, amount: number, kind: LedgerKind, what: string, n = 1): void {
  pay(s, amount, kind, what, n);
  settle(s);
}

/** Does the city have a tax office? */
export const hasTaxOffice = (s: SimState): boolean => s.buildings.some((b) => b.kind === 'taxoffice');

/** What the treasury keeps back for a tax office while the city has none. */
export function reserve(s: SimState): number {
  return hasTaxOffice(s) ? 0 : TAX_OFFICE_COST;
}

/** What wages can be paid from: all but the reserve. */
export function payable(s: SimState): number {
  return Math.max(0, s.money - reserve(s));
}

/**
 * What building something of this kind (or laying road: 'road') can spend:
 * everything for a tax office (so a town can always get taxes going);
 * otherwise what is left once the reserve is kept back and any wages still
 * owed are set aside, so nothing new is built while workers go unpaid.
 */
export function spendable(s: SimState, kind: BuildingKind | 'road' = 'road'): number {
  if (kind === 'taxoffice') return s.money;
  return Math.max(0, payable(s) - owedWages(s).owed - soldiersOwed(s) - s.fleet.triremes.reduce((a, t) => a + t.owed, 0));
}

/**
 * What building one of this kind costs now: its price, except that while the
 * city has no tax office, or can't pay this month's wages, one costs at most
 * what the treasury holds, so a town that has run dry, or cleared its only
 * office, can always get taxes coming in again (every drachma that comes in
 * goes to the wages owed, so it could otherwise never save up for an office
 * to reach the homes no collector calls on).
 */
export function priceOf(s: SimState, kind: BuildingKind): number {
  const c = COST[kind];
  return kind === 'taxoffice' && (!hasTaxOffice(s) || owedWages(s).owed > 0) ? Math.min(c, Math.max(0, s.money)) : c;
}

/** Is a building a workplace (one that has jobs, so pays wages)? */
export const isWorkplace = (b: Building): boolean => JOBS[b.kind] > 0;

/** The first of the month: every workplace is owed its workers' wages, and the treasury pays what it can. */
export function stepWages(s: SimState): void {
  if (s.tick % TICKS_PER_MONTH !== 0) return;
  turnMonth(s);
  for (const b of s.buildings) b.owed = isWorkplace(b) ? b.workers * WAGE : 0;
  settle(s);
}

/**
 * Pay the wages still owed, each workplace in full or not at all: the tax
 * offices first (so their collectors keep their pace while money is short,
 * and the town gets back on its feet sooner), then the rest in building order.
 */
export function settle(s: SimState): void {
  for (let pass = 0; pass < 2; pass++) {
    for (const b of s.buildings) {
      if (b.owed <= 0 || (b.kind === 'taxoffice') !== (pass === 0)) continue;
      if (payable(s) < b.owed) continue;
      pay(s, -b.owed, 'wages', b.kind, b.owed / WAGE);
      b.owed = 0;
    }
  }
  // Then the soldiers, company by company, each in full or not at all.
  // (Hirelings on their own line.)
  for (const c of s.army.companies) {
    if (c.owed <= 0 || payable(s) < c.owed) continue;
    if (c.hired) pay(s, -c.owed, 'hirelings', 'pay', c.owed / HIRED_PAY);
    else pay(s, -c.owed, 'soldiers', 'soldiers', c.owed / SOLDIER_PAY);
    c.owed = 0;
  }
  // Then what dismissed companies were still owed (slice 23's review: dismissing forgot it).
  if (s.army.owed > 0 && payable(s) >= s.army.owed) {
    pay(s, -s.army.owed, 'soldiers', 'soldiers', s.army.owed / SOLDIER_PAY);
    s.army.owed = 0;
  }
  // Then the rowers (slice 26), trireme by trireme, each crew in full or not at all.
  for (const t of s.fleet.triremes) {
    if (t.owed <= 0 || payable(s) < t.owed) continue;
    pay(s, -t.owed, 'rowers', 'rowers', t.owed / ROWER_PAY);
    t.owed = 0;
  }
}

/** Soldiers' pay owed and unpaid this month (drachmas). */
export const soldiersOwed = (s: SimState): number => s.army.companies.reduce((a, c) => a + c.owed, s.army.owed);

/** Wages owed and unpaid this month: how much, and at how many workplaces. */
export function owedWages(s: SimState): { owed: number; places: number; workers: number } {
  let owed = 0;
  let places = 0;
  for (const b of s.buildings) {
    if (b.owed <= 0) continue;
    owed += b.owed;
    places++;
  }
  return { owed, places, workers: owed / WAGE };
}

/** What wages cost a month at the workplaces' present staffing. */
export function wageBill(s: SimState): number {
  let w = 0;
  for (const b of s.buildings) if (isWorkplace(b)) w += b.workers * WAGE;
  return w;
}

/** A ledger's lines added up: in, out and the net. */
export function totals(lines: readonly { amount: number }[]): { in: number; out: number; net: number } {
  let i = 0;
  let o = 0;
  for (const l of lines) {
    if (l.amount >= 0) i += l.amount;
    else o -= l.amount;
  }
  return { in: i, out: o, net: i - o };
}

/** What a ledger's lines of one kind add up to (negative for money out). */
export function kindTotal(lines: readonly { kind: LedgerKind; amount: number }[], kind: LedgerKind): number {
  let n = 0;
  for (const l of lines) if (l.kind === kind) n += l.amount;
  return n;
}
