/**
 * The money, tuned by playing (slice 14): the targets the tuning was made
 * against, so a later change that breaks them shows up. Harsh taxes with
 * teeth, a quick recovery from running dry, villas the road to riches, and
 * #richtown, the prepared richer town.
 */
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { FINE, VILLA } from '../src/sim/buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { CHEESE, FLEECE, MEAT, OIL, WHEAT, WINE } from '../src/sim/foods';
import { arrivalInterval, HARSH_SLOWER } from '../src/sim/settlers';
import { replay, serialize, Sim } from '../src/sim/sim';
import type { SimState } from '../src/sim/state';
import { FAIR, HARSH, TAX_RATES, taxOf } from '../src/sim/taxes';
import { OLD_GOODS, SHIP_COMING, tradingPost } from '../src/sim/trade';
import { totals } from '../src/sim/treasury';
import { demoSim, liveSim } from './prepared';

const demo = (name: string): Sim => {
  const sim = demoSim(name);
  return sim;
};
const send = (sim: Sim, c: Parameters<Sim['enqueue']>[0]): void => {
  sim.enqueue(c);
  sim.flush();
};
const lived = (s: SimState) => s.buildings.filter((b) => b.kind === 'home' && b.people > 0);
const count = (s: SimState, kind: string): number => s.buildings.filter((b) => b.kind === kind).length;
const ledgerAddsUp = (s: SimState): void => expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);

describe('the money', () => {
  it('a villa pays clearly more than a fine house at every rate but none; the lower levels pay as before', () => {
    for (let r = 1; r < TAX_RATES.length; r++) expect(taxOf(r, VILLA)).toBeGreaterThanOrEqual(1.5 * taxOf(r, FINE));
    expect(taxOf(0, VILLA)).toBe(0);
    // A tent, a hut and a cottage at fair: as in phase 1.
    expect([1, 2, 3].map((l) => taxOf(FAIR, l))).toEqual([2, 3, 5]);
  });

  it('harsh taxes have teeth: more coin for a few months, but whole households leave and #town shrinks over a year where fair grows it; back at fair it recovers', () => {
    const fair = demo('town');
    const harsh = demo('town');
    expect(serialize(harsh.state)).toEqual(serialize(fair.state));
    const start = { people: fair.state.population, money: fair.state.money };
    send(harsh, { type: 'tax', rate: HARSH });
    fair.run(3 * TICKS_PER_MONTH);
    harsh.run(3 * TICKS_PER_MONTH);
    expect(harsh.state.money - start.money).toBeGreaterThan(fair.state.money - start.money);
    fair.run(9 * TICKS_PER_MONTH);
    harsh.run(9 * TICKS_PER_MONTH);
    expect(fair.state.population).toBeGreaterThan(start.people);
    expect(harsh.state.population).toBeLessThan(0.8 * start.people);
    expect(fair.state.taxGone).toEqual([]);
    expect(harsh.state.taxGone.length).toBeGreaterThan(10);
    ledgerAddsUp(harsh.state);
    // Set back to fair, newcomers come again and it grows.
    const low = harsh.state.population;
    send(harsh, { type: 'tax', rate: FAIR });
    harsh.run(6 * TICKS_PER_MONTH);
    expect(harsh.state.population).toBeGreaterThan(low + 50);
  });

  it('a household that leaves for harsh taxes leaves an empty plot and says so in the record; it is all through the command queue, so a replay is identical', () => {
    const sim = liveSim('harsh');
    const s = sim.state;
    sim.run(4 * TICKS_PER_MONTH);
    expect(s.taxGone.length).toBeGreaterThan(0);
    // The plots they left are empty (no family, nobody coming in from them).
    const empty = s.buildings.filter((b) => b.kind === 'home' && b.level === 0 && b.people === 0);
    expect(empty.length).toBeGreaterThan(0);
    for (const b of empty) expect(b.family).toBeNull();
    expect(serialize(replay(s.seed, sim.log, s.tick).state)).toEqual(serialize(s));
  });

  it('while taxes are harsh, newcomers come a third as often', () => {
    for (const [room, water] of [[0, 0], [40, 1], [200, 3]]) expect(arrivalInterval(room, water, true)).toBe(HARSH_SLOWER * arrivalInterval(room, water));
  });

  it('#dry set back to fair pays its owed wages within a fortnight: the collectors are paid first', () => {
    const sim = demo('dry');
    const s = sim.state;
    expect(s.buildings.some((b) => b.owed > 0)).toBe(true);
    // Its tax offices' wages were paid before the rest.
    expect(s.buildings.filter((b) => b.kind === 'taxoffice').every((b) => b.owed === 0)).toBe(true);
    send(sim, { type: 'tax', rate: FAIR });
    let t = 0;
    while (s.buildings.some((b) => b.owed > 0) && t < 2 * TICKS_PER_MONTH) {
      sim.step();
      t++;
    }
    expect(t).toBeLessThanOrEqual(14 * TICKS_PER_DAY);
  });
});

describe('#richtown', () => {
  const sim = demo('richtown');
  const s = sim.state;

  it('opens on what it promises: several hundred people, every chain, villas beside fine houses, every kind of round walker, and the ship coming in to the post', () => {
    expect(s.population).toBeGreaterThan(700);
    expect(s.population).toBeLessThan(1000);
    for (const k of ['farm', 'granary', 'lodge', 'dairy', 'grove', 'press', 'pasture', 'vineyard', 'winery', 'trading', 'watchpost', 'architect', 'taxoffice', 'theatre', 'shrine'])
      expect(count(s, k), k).toBeGreaterThan(0);
    expect(count(s, 'storehouse')).toBeGreaterThanOrEqual(2);
    const levels = lived(s).map((b) => b.level);
    expect(levels.filter((l) => l === VILLA).length).toBeGreaterThanOrEqual(15);
    expect(levels.filter((l) => l === FINE).length).toBeGreaterThan(0);
    for (const k of ['watchman', 'inspector', 'tax', 'water', 'food', 'oil', 'wine', 'docker', 'cart', 'hunter'])
      expect(s.walkers.some((w) => w.kind === k), k).toBe(true);
    const post = tradingPost(s)!;
    expect(post).toBeTruthy();
    // Every good of phase 3 ticked for sale; copper and armour (slice 23) kept for the town's own army.
    expect(s.trade.sell.slice(0, OLD_GOODS).every((on) => on)).toBe(true);
    expect([WHEAT, MEAT, CHEESE, OIL, FLEECE, WINE].length).toBe(OLD_GOODS);
    expect(s.trade.sell.slice(OLD_GOODS).some((on) => on)).toBe(false);
    expect(s.trade.ship.phase).toBe(SHIP_COMING);
    expect(s.taxRate).toBe(FAIR);
    expect(s.buildings.every((b) => b.owed === 0)).toBe(true);
    expect(s.hazards).toBe(true);
  });

  it('saves and loads identically, and plays on the same', () => {
    const r = decodeSave(encodeSave(s, 1));
    if (!r.ok) throw new Error(r.why);
    expect(serialize(r.file.state)).toEqual(serialize(s));
    const again = new Sim();
    again.state = r.file.state;
    sim.run(300);
    again.run(300);
    expect(serialize(again.state)).toEqual(serialize(s));
  });

  it('gains over a year at fair, its villas and the ship paying: the road to riches', () => {
    const sim2 = demo('richtown');
    const s2 = sim2.state;
    const start = s2.money;
    let sales = 0;
    for (let m = 0; m < 12; m++) {
      sim2.run(TICKS_PER_MONTH);
      sales += s2.ledger.last.filter((l) => l.kind === 'sales').reduce((n, l) => n + l.amount, 0);
      expect(s2.buildings.every((b) => b.owed === 0)).toBe(true);
    }
    expect(s2.money - start).toBeGreaterThan(2000);
    expect(sales).toBeGreaterThan(600);
    ledgerAddsUp(s2);
  });
});
