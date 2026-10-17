/**
 * The stock book: what the city makes, uses, sells, buys and loses of each
 * ware, a month at a time, kept like the ledger (treasury.ts) so the side
 * panel can say a ware's net, where it is used and how it has moved over the
 * year. Every place a ware comes into or goes out of the city notes it here:
 * a harvest, a batch, a hunter's kill (made); a vendor's round topping up homes,
 * a press or winery taking its olives or grapes (used); the ship loading
 * (sold); fire, collapse or clearing (lost). Carrying a ware from one store to
 * another changes nothing here.
 *
 * Nothing in the sim reads it, so it can never change how a town plays: only
 * the UI does. A month turns on its first tick (stepBook), or on the next note.
 */
import { coastMap } from '../map/bake';
import { districtAt } from '../map/districts';
import { TICKS_PER_MONTH } from './clock';
import type { Building, SimState, StockBook, StockKind, StockLine, StockMonth } from './state';

/** The month (since the founding) a tick falls in (as the ledger counts them). */
const monthOf = (tick: number): number => Math.floor(tick / TICKS_PER_MONTH);

/** How many months the book keeps in short. */
export const BOOK_MONTHS = 12;

/** The kinds of line, in the order the book's months keep their totals. */
export const STOCK_KINDS: readonly StockKind[] = ['made', 'used', 'sold', 'bought', 'lost'];

/** An empty book for the month of `tick`. */
export function freshBook(tick: number): StockBook {
  return { month: monthOf(tick), now: [], last: [], months: [] };
}

/** A month's lines in short. */
export function monthTotals(month: number, lines: readonly StockLine[]): StockMonth {
  const m: StockMonth = { month, made: [], used: [], sold: [], bought: [], lost: [] };
  for (const l of lines) {
    const arr = m[l.kind];
    while (arr.length <= l.ware) arr.push(0);
    arr[l.ware] += l.n;
  }
  return m;
}

/** Start a new month in the book if the month has turned: this month's lines become last month's, and go into the year in short. */
export function turnBook(s: SimState): void {
  const b = s.stocks;
  const m = monthOf(s.tick);
  if (m === b.month) return;
  if (m < b.month) {
    // Time gone backwards (it can't, in play): start the book afresh.
    s.stocks = freshBook(s.tick);
    return;
  }
  b.months.push(monthTotals(b.month, b.now));
  // Months with nothing in them (a town saved before the book was kept, loaded later) are empty months.
  for (let k = b.month + 1; k < m && k - b.month <= BOOK_MONTHS; k++) b.months.push(monthTotals(k, []));
  if (b.months.length > BOOK_MONTHS) b.months.splice(0, b.months.length - BOOK_MONTHS);
  b.last = m === b.month + 1 ? b.now : [];
  b.now = [];
  b.month = m;
}

/** The first tick of a month turns the book, even when nothing is noted that month. */
export function stepBook(s: SimState): void {
  if (s.tick % TICKS_PER_MONTH === 0) turnBook(s);
}

/** Note `n` measures of a ware, of a kind, about a thing (see StockLine). */
export function note(s: SimState, ware: number, kind: StockKind, what: string, n: number): void {
  if (n === 0) return;
  turnBook(s);
  const lines = s.stocks.now;
  for (const l of lines) {
    if (l.ware === ware && l.kind === kind && l.what === what) {
      l.n += n;
      return;
    }
  }
  lines.push({ ware, kind, what, n });
}

/** What a stock line's `what` is for homes in a district. */
export const homesIn = (district: number): string => `homes:${district}`;

/** The district of a `homes:` line (-1 for any other line). */
export const districtOfLine = (what: string): number => (what.startsWith('homes:') ? Number(what.slice(6)) : -1);

/** `n` measures of a ware taken home by the household in `home` (from a vendor's round). */
export function noteHomeUse(s: SimState, ware: number, home: Building, n: number): void {
  if (n <= 0) return;
  // The district under the middle of the home (homes are 2 x 2).
  note(s, ware, 'used', homesIn(districtAt(coastMap(), home.x + 1, home.z + 1)), n);
}
