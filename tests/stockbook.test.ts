/**
 * The stock book (the side panel's record of what each ware is made, used,
 * sold and lost): it must account for every measure that comes into or goes
 * out of the city, keep its months in step with the clock, and change nothing
 * about how a town plays.
 */
import { describe, expect, it } from 'vitest';
import { TICKS_PER_MONTH } from '../src/sim/clock';
import { WARES, WHEAT, WINE, OLIVES } from '../src/sim/foods';
import { Sim } from '../src/sim/sim';
import { BOOK_MONTHS, districtOfLine } from '../src/sim/stockbook';
import { bookNow, stockOf, totalsOf } from '../src/sim/stocks';
import { demoSim } from './prepared';

const demo = (name: string): Sim => {
  const sim = demoSim(name);
  return sim;
};

describe('the stock book', () => {
  const sim = demo('richtown');
  const s = sim.state;

  it('notes what the town makes, where homes use it, what workshops use and what the ship buys', () => {
    // Run on to the last tick of a month, then through the whole of the next (a month's ticks run from its first, m * TICKS_PER_MONTH, to the one before the next).
    sim.run((TICKS_PER_MONTH - 1 - (s.tick % TICKS_PER_MONTH) + TICKS_PER_MONTH) % TICKS_PER_MONTH);
    const before = WARES.map((w) => stockOf(s, w).total);
    sim.run(TICKS_PER_MONTH);
    // Into the month after it: that month is now last month, and complete.
    sim.step();
    const b = bookNow(s);
    expect(b.full).toBe(true);
    const wheat = totalsOf(b.last, WHEAT);
    expect(wheat.made).toBeGreaterThan(0);
    expect(wheat.used).toBeGreaterThan(0);
    // Homes' use is noted by district.
    expect(b.last.some((l) => l.ware === WHEAT && l.kind === 'used' && districtOfLine(l.what) >= 0)).toBe(true);
    // Olives go into the presses.
    expect(b.last.some((l) => l.ware === OLIVES && l.kind === 'used' && l.what === 'press')).toBe(true);
    // Each ware's stock moved by exactly last month's net: nothing comes or goes unnoticed (carrying between stores changes neither).
    const after = WARES.map((w) => stockOf(s, w).total);
    WARES.forEach((w, i) => expect(after[i] - before[i] - totalsOf(b.now, w).net, `ware ${w}`).toBe(totalsOf(b.last, w).net));
  });

  it('keeps a year of months in step with the clock', () => {
    const m = Math.floor(s.tick / TICKS_PER_MONTH);
    expect(s.stocks.month).toBe(m);
    expect(s.stocks.months.length).toBeLessThanOrEqual(BOOK_MONTHS);
    const months = s.stocks.months.map((x) => x.month);
    expect(months[months.length - 1]).toBe(m - 1);
    months.forEach((x, i) => i > 0 && expect(x).toBe(months[i - 1] + 1));
  });

  it('notes what the ship buys as sold to her', () => {
    // Run on until she next sails off laden: what she paid for is in the book, this month or last.
    const visits = s.trade.ship.visits;
    for (let i = 0; i < 12 * TICKS_PER_MONTH && s.trade.ship.visits === visits; i++) sim.step();
    expect(s.trade.ship.visits).toBe(visits + 1);
    const sold = [...s.stocks.now, ...s.stocks.last].filter((l) => l.kind === 'sold' && l.what === 'tyre');
    expect(sold.length).toBeGreaterThan(0);
    const bought = s.trade.ship.lastBought.reduce((a, n) => a + n, 0);
    expect(sold.reduce((a, l) => a + l.n, 0)).toBeGreaterThanOrEqual(bought);
    void WINE;
  });
});
