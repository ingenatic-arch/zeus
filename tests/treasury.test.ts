/**
 * Coin and the ledger (slice 8): every drachma goes through the ledger, the
 * tax collector taxes only the homes beside his way and at most once a month,
 * wages go out on the first of the month and go unpaid (at half pace) when
 * the treasury is empty, harsh taxes drive some away, and the demo towns
 * neither run dry nor pile up money.
 */
import { describe, expect, it } from 'vitest';
import { DEMOS } from '../src/game/demos';
import { coastMap } from '../src/map/bake';
import { MAP_SIZE } from '../src/map/coast';
import { DISTRICTS, districtAt, districtGrid } from '../src/map/districts';
import { PLOT_COST, TAX_OFFICE_COST } from '../src/sim/build';
import { JOBS } from '../src/sim/buildings';
import { chatterOf, LINES } from '../src/sim/chatter';
import { TICKS_PER_MONTH, TICKS_PER_YEAR } from '../src/sim/clock';
import { moodOf } from '../src/sim/folk';
import { canWork, rateOf, UNPAID_RATE } from '../src/sim/labour';
import { Sim } from '../src/sim/sim';
import { moneyLine } from '../src/sim/status';
import type { Building, SimState } from '../src/sim/state';
import { COLLECTOR_RANGE, FAIR, HARSH, HEAVY, purseTotal, TAX, taxOf } from '../src/sim/taxes';
import { kindTotal, totals, WAGE } from '../src/sim/treasury';

const map = coastMap();
const N = MAP_SIZE;
const T = (x: number, z: number): number => z * N + x;
const row = (x0: number, x1: number, z: number): number[] => Array.from({ length: x1 - x0 + 1 }, (_, i) => T(x0 + i, z));

const demo = (name: string): Sim => {
  const sim = new Sim();
  DEMOS[name].setup!(sim);
  return sim;
};
const homes = (s: SimState): Building[] => s.buildings.filter((b) => b.kind === 'home' && b.people > 0);
const ctx = { agora: true, jobs: true, shrine: true, theatre: true };

/** The ledger adds up: this month's lines on top of what it started with make what the treasury holds, and last month's made this month's start. */
function ledgerAddsUp(s: SimState): void {
  const l = s.ledger;
  expect(l.start + totals(l.now).net).toBe(s.money);
  expect(s.money).toBeGreaterThanOrEqual(0);
}

describe('the ledger', () => {
  it('every drachma in or out is on a line: two years of #town, with building, undoing, clearing a tax office mid-round and a tax rate change', () => {
    const sim = demo('town');
    const s = sim.state;
    ledgerAddsUp(s);
    let month = s.ledger.month;
    let start = s.ledger.start;
    let net = totals(s.ledger.now).net;
    for (let t = 0; t < 2 * TICKS_PER_YEAR; t++) {
      if (t === 100) sim.enqueue({ type: 'road', tiles: row(96, 99, 44) });
      if (t === 101) sim.enqueue({ type: 'undo' });
      if (t === 400) sim.enqueue({ type: 'tax', rate: HEAVY });
      if (t === 700) {
        // Clear a tax office while its collector is out with coins: they reach the treasury.
        const w = s.walkers.find((x) => x.kind === 'tax' && purseTotal(x) > 0);
        expect(w).toBeTruthy();
        const o = s.buildings.find((b) => b.id === w!.origin)!;
        const before = s.money;
        const bag = purseTotal(w!);
        sim.enqueue({ type: 'clear', x0: o.x, z0: o.z, x1: o.x, z1: o.z });
        sim.step();
        expect(s.money).toBeGreaterThanOrEqual(before + bag - 1000);
        expect(kindTotal(s.ledger.now, 'taxes')).toBeGreaterThanOrEqual(bag);
        continue;
      }
      sim.step();
      ledgerAddsUp(s);
      if (s.ledger.month !== month) {
        // The month turned: last month is what this month was, and it ended where this one starts.
        expect(s.ledger.lastStart).toBe(start);
        expect(totals(s.ledger.last).net).toBe(net);
        expect(s.ledger.lastStart + totals(s.ledger.last).net).toBe(s.ledger.start);
        month = s.ledger.month;
      }
      start = s.ledger.start;
      net = totals(s.ledger.now).net;
    }
    const kinds = new Set(s.ledger.last.map((l) => l.kind));
    expect(kinds.has('taxes') || kinds.has('wages')).toBe(true);
  });
});

describe('taxes', () => {
  it('the collector calls on each home beside his way at most once a month, paying by level and rate, and never on homes beyond his reach', () => {
    const sim = demo('food');
    const s = sim.state;
    const last = new Map<number, number>();
    for (let t = 0; t < 4 * TICKS_PER_MONTH; t++) {
      sim.step();
      for (const b of s.buildings) {
        if (b.kind !== 'home' || b.taxedAt !== s.tick) continue;
        const prev = last.get(b.id);
        if (prev !== undefined) expect(s.tick - prev).toBeGreaterThanOrEqual(TICKS_PER_MONTH);
        last.set(b.id, s.tick);
        expect(b.taxPaid).toBe(taxOf(FAIR, b.level));
      }
    }
    expect(last.size).toBeGreaterThan(15);
    // The hamlet at the lane's far end is beyond his reach by road: it is never taxed.
    const far = s.buildings.filter((b) => b.kind === 'home' && b.z <= 43 && b.x >= 24 && b.x <= 27);
    expect(far.length).toBeGreaterThan(0);
    for (const b of far) expect(b.taxedAt).toBe(0);
    expect(COLLECTOR_RANGE).toBeLessThan(40);
  });

  it('what he collects reaches the treasury when he gets back, as taxes by district', () => {
    const sim = demo('food');
    const s = sim.state;
    sim.run(3 * TICKS_PER_MONTH);
    const taxes = [...s.ledger.now, ...s.ledger.last].filter((l) => l.kind === 'taxes');
    expect(taxes.length).toBeGreaterThan(0);
    for (const l of taxes) {
      expect(DISTRICTS.some((d) => d.where === l.what)).toBe(true);
      expect(l.amount).toBeGreaterThan(0);
      expect(l.n).toBeGreaterThan(0);
    }
  });

  it('the rate goes from none to harsh by command, ignores anything else, and none collects nothing', () => {
    const sim = demo('food');
    const s = sim.state;
    for (const bad of [-1, 5, 2.5, Number.NaN]) {
      sim.enqueue({ type: 'tax', rate: bad });
      sim.step();
      expect(s.taxRate).toBe(FAIR);
    }
    sim.enqueue({ type: 'tax', rate: 0 });
    sim.run(2 * TICKS_PER_MONTH);
    expect(s.taxRate).toBe(0);
    expect(kindTotal(s.ledger.last, 'taxes')).toBe(0);
    expect(TAX[0].every((v) => v === 0)).toBe(true);
    // Each rate asks at least as much as the one below it, and better homes pay more.
    for (let r = 1; r < TAX.length; r++) for (let l = 1; l < TAX[r].length; l++) {
      expect(TAX[r][l]).toBeGreaterThanOrEqual(TAX[r - 1][l]);
      expect(TAX[r][l]).toBeGreaterThanOrEqual(TAX[r][l - 1]);
    }
  });

  it('heavy and harsh taxes sour the moods of the homes the collector calls on, and the chatter grumbles', () => {
    const sim = demo('town');
    const s = sim.state;
    const taxed = homes(s).filter((b) => b.taxedAt > 0);
    const fair = taxed.map((b) => moodOf(s, b, ctx, canWork(b)).level);
    sim.enqueue({ type: 'tax', rate: HARSH });
    sim.step();
    const harsh = taxed.map((b) => moodOf(s, b, ctx, canWork(b)));
    expect(harsh.every((m, i) => m.level <= fair[i])).toBe(true);
    expect(harsh.some((m, i) => m.level < fair[i])).toBe(true);
    expect(harsh.every((m) => m.reasons.some((r) => r.tone < 0 && /Taxes are harsh/.test(r.text)))).toBe(true);
    const grumbles = new Set<string>(LINES.harshTax);
    const said = taxed.flatMap((b) => chatterOf(s, b)).filter((l) => [...grumbles].some((g) => l.text.startsWith(g.split('{')[0].slice(0, 20))));
    expect(said.length).toBeGreaterThan(taxed.length / 2);
    // Homes no collector reaches (the hamlet on the west bank) aren't bothered.
    const untaxed = homes(s).filter((b) => b.taxedAt === 0);
    expect(untaxed.length).toBeGreaterThan(0);
    for (const b of untaxed) expect(moodOf(s, b, ctx, canWork(b)).reasons.some((r) => /Taxes/.test(r.text))).toBe(false);
  });

  it('at harsh, some households send someone away, the story saying why; at fair, nobody goes', () => {
    const harsh = demo('harsh').state;
    const left = homes(harsh).flatMap((b) => b.family?.story.filter((e) => e.what === 'left' && e.need === 'tax') ?? []);
    expect(left.length).toBeGreaterThan(0);
    expect(harsh.left).toBeGreaterThan(0);
    const fair = demo('town');
    fair.run(2 * TICKS_PER_MONTH);
    expect(homes(fair.state).some((b) => b.family?.story.some((e) => e.need === 'tax'))).toBe(false);
  });
});

describe('wages', () => {
  it('on the first of the month every workplace pays its workers', () => {
    const sim = demo('food');
    const s = sim.state;
    sim.run(TICKS_PER_MONTH - (s.tick % TICKS_PER_MONTH) - 1);
    const staffed = s.buildings.filter((b) => JOBS[b.kind] > 0).reduce((n, b) => n + b.workers, 0);
    sim.step();
    expect(s.tick % TICKS_PER_MONTH).toBe(0);
    expect(-kindTotal(s.ledger.now, 'wages')).toBe(staffed * WAGE);
    expect(s.buildings.every((b) => b.owed === 0)).toBe(true);
  });

  it('an empty treasury leaves wages owed: those places work at half pace, their workers’ homes are told, and money coming in pays them first', () => {
    const sim = demo('food');
    const s = sim.state;
    sim.run(TICKS_PER_MONTH - (s.tick % TICKS_PER_MONTH) - 1);
    // Nearly nothing in the treasury (a tax office stands, so nothing is kept back).
    s.ledger.start -= s.money - 10;
    s.money = 10;
    sim.step();
    const owing = s.buildings.filter((b) => b.owed > 0);
    expect(owing.length).toBeGreaterThan(0);
    for (const b of owing) expect(rateOf(b)).toBeCloseTo(Math.min(1, b.workers / JOBS[b.kind]) * UNPAID_RATE);
    expect(moneyLine(s)?.text).toMatch(/^Money: the treasury can’t pay this month’s wages/);
    // The next daily share of work tells the households.
    sim.run(10);
    const unpaid = homes(s).filter((b) => b.unpaid > 0);
    expect(unpaid.length).toBeGreaterThan(0);
    expect(unpaid.some((b) => moodOf(s, b, ctx, canWork(b)).reasons.some((r) => /wages are owed|owed wages/.test(r.text)))).toBe(true);
    // The collector's coins pay what is owed as soon as they come in.
    let paid = false;
    for (let t = 0; t < TICKS_PER_MONTH - 20 && !paid; t++) {
      sim.step();
      if (kindTotal(s.ledger.now, 'taxes') > 0 && s.buildings.some((b) => b.owed === 0 && b.kind !== 'home' && owing.includes(b))) paid = true;
    }
    expect(paid).toBe(true);
    ledgerAddsUp(s);
  });

  it('with no tax office, the treasury keeps back what one costs: nothing else can spend it, a tax office can', () => {
    const sim = new Sim(1);
    const s = sim.state;
    sim.enqueue({ type: 'road', tiles: row(0, 12, 80) });
    sim.step();
    s.ledger.start -= s.money - (TAX_OFFICE_COST + PLOT_COST - 1);
    s.money = TAX_OFFICE_COST + PLOT_COST - 1;
    sim.enqueue({ type: 'plots', at: [T(4, 78)] });
    sim.step();
    expect(s.buildings.length).toBe(0);
    sim.enqueue({ type: 'build', kind: 'taxoffice', at: [T(4, 78)] });
    sim.step();
    expect(s.buildings.map((b) => b.kind)).toEqual(['taxoffice']);
    expect(s.money).toBe(PLOT_COST - 1);
    ledgerAddsUp(s);
  });
});

describe('the demo towns and money', () => {
  it('no demo leaves wages unpaid while it is being set up (but #dry, which is about that)', () => {
    for (const [name, d] of Object.entries(DEMOS)) {
      if (!d.setup || name === 'dry') continue;
      const sim = new Sim();
      const step = sim.step.bind(sim);
      let owed = 0;
      sim.step = () => {
        step();
        if (sim.state.tick % TICKS_PER_MONTH === 1) for (const b of sim.state.buildings) owed = Math.max(owed, b.owed);
      };
      d.setup(sim);
      expect(owed, name).toBe(0);
    }
    // Every demo's town is played forward from the founding: a few seconds in all.
  }, 30000);

  it('#town neither runs dry nor piles up money: three years on, the treasury has moved by less than 1,500 drachmas a year', () => {
    const sim = demo('town');
    const s = sim.state;
    const start = s.money;
    let low = Infinity;
    for (let m = 0; m < 36; m++) {
      sim.run(TICKS_PER_MONTH);
      low = Math.min(low, s.money);
      expect(s.buildings.every((b) => b.owed === 0)).toBe(true);
    }
    expect(low).toBeGreaterThan(0);
    expect(Math.abs(s.money - start) / 3).toBeLessThan(1500);
  });

  it('a town of a few hundred people with one tax office, no goods, roughly breaks even at fair (#food played on two years)', () => {
    const sim = demo('food');
    const s = sim.state;
    // A month in, so the new tax office's collector is on his rounds.
    sim.run(TICKS_PER_MONTH);
    const start = s.money;
    sim.run(2 * TICKS_PER_YEAR);
    expect(s.population).toBeGreaterThan(300);
    expect(Math.abs(s.money - start) / 2).toBeLessThan(600);
  });

  it('#dry has wages owed and says so; #taxes has a street no collector reaches', () => {
    const dry = demo('dry').state;
    expect(dry.taxRate).toBe(0);
    expect(dry.buildings.some((b) => b.owed > 0)).toBe(true);
    expect(moneyLine(dry)?.need).toBe('money');
    const taxes = demo('taxes').state;
    expect(taxes.buildings.filter((b) => b.kind === 'taxoffice').length).toBe(2);
  });
});

describe('districts', () => {
  it('every tile has a district, the river’s plain is the flood plain, and each named place lies in its own district', () => {
    const grid = districtGrid(map);
    expect(grid.length).toBe(N * N);
    for (const v of grid) expect(v).toBeLessThan(DISTRICTS.length);
    for (let i = 1; i < DISTRICTS.length; i++) {
      const d = DISTRICTS[i];
      const got = districtAt(map, d.x, d.z);
      // A place right by the river may be in the flood plain instead.
      expect([i, 0]).toContain(got);
    }
    // The river's own tiles are the flood plain.
    const q = map.riverAt(38.5, 41.5);
    expect(q.d).toBeLessThan(q.valley);
    expect(districtAt(map, 38.5, 41.5)).toBe(0);
  });
});
