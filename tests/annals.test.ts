/**
 * Slice 51: the town's annals. A month's figures are written on the first
 * tick of the next month, the last 24 kept; they add up with the treasury
 * (each month's money is the month before's plus what came in, less what
 * went out); the year's money and crime by kind are the months' own; keeping
 * them never changes how the town plays; they are saved; and an older save
 * (the state version before, and a version 37 save) loads with empty annals
 * beginning where it was saved.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { ANNAL_MONTHS, annalsOk, CRIME_ROWS, freshAnnals, groupOf, IN_GROUPS, mendAnnals, OUT_GROUPS, yearNow, yearOfMonth } from '../src/sim/annals';
import { TICKS_PER_MONTH } from '../src/sim/clock';
import { WARES } from '../src/sim/foods';
import { NEEDS } from '../src/sim/folk';
import { migrate } from '../src/sim/migrate';
import { Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type SimState } from '../src/sim/state';
import { demoSim } from './prepared';

/** The state without its annals, for comparing two towns' play. */
const without = (s: SimState): string => JSON.stringify({ ...s, annals: null });

describe('the annals', () => {
  it('#town keeps a figure for each of its last 24 months, written as each month ends', () => {
    const s = demoSim('town').state;
    const a = s.annals;
    const m = Math.floor(s.tick / TICKS_PER_MONTH);
    expect(a.months.length).toBe(Math.min(ANNAL_MONTHS, m));
    expect(a.month).toBe(m - 1);
    expect(a.months.map((x) => x.m)).toEqual(Array.from({ length: a.months.length }, (_, i) => m - a.months.length + i));
    for (const x of a.months) {
      expect(x.stock.length).toBe(WARES.length);
      expect(x.reach.length).toBe(NEEDS.length);
      expect(x.homes).toBeGreaterThan(0);
      expect(x.glad).toBeLessThanOrEqual(x.homes);
      expect(x.filled).toBeLessThanOrEqual(x.jobs);
      expect(x.sick).toBe(0);
    }
    // The town grew over its two years.
    expect(a.months[a.months.length - 1].people).toBeGreaterThan(a.months[0].people);
    expect(annalsOk(a)).toBe(true);
  });

  it('each month adds up: its money is the month before’s plus what came in, less what went out', () => {
    const s = demoSim('richtown').state;
    const ms = s.annals.months;
    expect(ms.length).toBeGreaterThan(12);
    for (let i = 1; i < ms.length; i++) expect(ms[i].money).toBe(ms[i - 1].money + ms[i].in - ms[i].out);
    // The month after the last written: from the last one's money, by this month's ledger so far.
    const l = s.ledger;
    expect(l.start).toBe(ms[ms.length - 1].money);
  });

  it('the year’s money by kind is its months’, and this year so far adds this month’s ledger', () => {
    const sim = demoSim('richtown');
    const s = sim.state;
    // Play on to the end of a month, noting each month's in and out as the annals write it.
    const end = (Math.floor(s.tick / TICKS_PER_MONTH) + 3) * TICKS_PER_MONTH;
    sim.run(end - s.tick);
    const a = s.annals;
    const y = a.year.y;
    const sum = (xs: number[]): number => xs.reduce((p, q) => p + q, 0);
    // (Its first month: March of the founding year is month 0, and each January after.)
    const first = Math.max(0, y * 12 - 2);
    expect(a.since).toBe(0);
    expect(a.months[0].m).toBeLessThanOrEqual(first);
    const months = a.months.filter((x) => yearOfMonth(x.m) === y);
    expect(months.length).toBeGreaterThan(0);
    expect(sum(a.year.in)).toBe(sum(months.map((x) => x.in)));
    expect(sum(a.year.out)).toBe(sum(months.map((x) => x.out)));
    const now = yearNow(s);
    const ledgerNow = s.ledger.now.reduce((p, l) => p + Math.max(0, l.amount), 0);
    expect(sum(now.now.in)).toBe(sum(a.year.in) + ledgerNow);
    expect(now.now.in.length).toBe(IN_GROUPS.length);
    expect(now.now.out.length).toBe(OUT_GROUPS.length);
    expect(now.now.crime.length).toBe(CRIME_ROWS.length);
  });

  it('every ledger line has a group: taxes in, wages out, and anything new in Other', () => {
    expect(IN_GROUPS[groupOf({ kind: 'taxes', amount: 5 }).i].id).toBe('taxes');
    expect(groupOf({ kind: 'wages', amount: -5 })).toEqual({ out: true, i: 0 });
    expect(OUT_GROUPS[groupOf({ kind: 'something-new', amount: -5 }).i].id).toBe('other');
    expect(IN_GROUPS[groupOf({ kind: 'refund', amount: 5 }).i].id).toBe('other');
  });

  it('keeping them never changes how the town plays', () => {
    const a = demoSim('empire');
    const b = demoSim('empire');
    b.state.annals = freshAnnals(b.state.tick);
    a.run(TICKS_PER_MONTH + 50);
    b.run(TICKS_PER_MONTH + 50);
    expect(without(b.state)).toBe(without(a.state));
    expect(b.state.annals.months.length).toBe(1);
  });

  it('a new town starts with none, and writes its first month as the second begins', () => {
    const sim = new Sim(7);
    expect(sim.state.annals.months).toEqual([]);
    sim.run(TICKS_PER_MONTH - 1);
    expect(sim.state.annals.months).toEqual([]);
    sim.run(1);
    expect(sim.state.annals.months.map((x) => x.m)).toEqual([0]);
  });

  it('they are saved, and a damaged record costs only the history', () => {
    const s = demoSim('town').state;
    const d = decodeSave(encodeSave(s, 1));
    if (!d.ok) throw new Error(d.why);
    expect(d.file.state.annals).toEqual(s.annals);
    const st = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
    (st.annals as { months: unknown[] }).months.push({ m: 'x' });
    mendAnnals(st);
    expect(st.annals).toEqual(freshAnnals(s.tick));
    // A month saved before a ware was added is padded to every ware.
    const st2 = JSON.parse(JSON.stringify(s)) as SimState;
    st2.annals.months[0].stock.pop();
    mendAnnals(st2);
    expect(st2.annals.months[0].stock.length).toBe(WARES.length);
  });

  it('a save from before (the state version before this one) loads with empty annals from its tick', () => {
    const s = JSON.parse(JSON.stringify(demoSim('town').state)) as Record<string, unknown>;
    delete s.annals;
    s.version = SIM_STATE_VERSION - 1;
    expect(migrate(s)).toBe(SIM_STATE_VERSION - 1);
    expect(s.version).toBe(SIM_STATE_VERSION);
    expect(s.annals).toEqual(freshAnnals(s.tick as number));
    const sim = new Sim();
    sim.state = s as unknown as SimState;
    const m = Math.floor(sim.state.tick / TICKS_PER_MONTH);
    sim.run((m + 1) * TICKS_PER_MONTH - sim.state.tick);
    // The month it was loaded in is the first written.
    expect(sim.state.annals.months.map((x) => x.m)).toEqual([m]);
  });

  it('a version 37 save loads with empty annals and plays on into its first written month', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/slice40-ship.save.json.gz')).toString();
    const d = decodeSave(text);
    if (!d.ok) throw new Error(d.why);
    const s = d.file.state;
    expect(s.annals.months).toEqual([]);
    expect(s.annals.since).toBe(s.tick);
    const sim = new Sim();
    sim.state = s;
    const m = Math.floor(s.tick / TICKS_PER_MONTH);
    sim.run((m + 1) * TICKS_PER_MONTH - s.tick);
    expect(s.annals.months.length).toBe(1);
    expect(s.annals.months[0].people).toBe(s.population);
  });
});
