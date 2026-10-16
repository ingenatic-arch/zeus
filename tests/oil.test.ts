/**
 * Olives and oil, and the storehouse (slice 10): olive groves on the dry
 * slopes, the olive press, the storehouse, carts for olives and oil, the
 * agora's oil stall and its vendor, and townhouses that need oil.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { DEMOS } from '../src/game/demos';
import { decodeSave, encodeSave } from '../src/game/saves';
import { coastMap } from '../src/map/bake';
import { MAP_SIZE } from '../src/map/coast';
import { buildingRefusal, GROVE_OLIVE_MIN, oliveOf, STALL_COST } from '../src/sim/build';
import { COTTAGE, FINE, jobsAt, TOWNHOUSE } from '../src/sim/buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { DECLINE_AFTER, needsOf, WARN_AFTER, wantOf, warningsOf } from '../src/sim/folk';
import { CHEESE, gi, held, MEAT, OIL, OLIVES, WHEAT } from '../src/sim/foods';
import { hasStall, OIL_LASTS, OIL_PEOPLE, OIL_ROUND, stallRefusal } from '../src/sim/goods';
import { GRACE_OIL } from '../src/sim/migrate';
import { OLIVE_GROW, olivesOf, PRESS_BATCH, PRESS_EVERY, stepMakers } from '../src/sim/production';
import { roadsBeside } from '../src/sim/rounds';
import { deserialize, serialize, Sim } from '../src/sim/sim';
import { homeStatus, oilLine } from '../src/sim/status';
import { SIM_STATE_VERSION, type Building, type SimState } from '../src/sim/state';
import { totals } from '../src/sim/treasury';

const map = coastMap();
const N = MAP_SIZE;
const T = (x: number, z: number): number => z * N + x;

const demo = (name: string): Sim => {
  const sim = new Sim();
  DEMOS[name].setup!(sim);
  return sim;
};
const homes = (s: SimState): Building[] => s.buildings.filter((b) => b.kind === 'home' && b.people > 0);
const kinds = (s: SimState, k: Building['kind']): Building[] => s.buildings.filter((b) => b.kind === k);
const ledgerAddsUp = (s: SimState): void => expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);

/** #grove's town (blessed cottages with bread, meat and cheese, no oil) with the whole oil chain built by the lane. */
function withOil(): Sim {
  const sim = demo('grove');
  sim.enqueue({ type: 'build', kind: 'grove', at: [T(27, 60), T(23, 56)] });
  sim.enqueue({ type: 'build', kind: 'press', at: [T(30, 60)] });
  sim.enqueue({ type: 'build', kind: 'storehouse', at: [T(33, 60)] });
  sim.enqueue({ type: 'stall', at: T(27, 71), good: OIL });
  sim.flush();
  return sim;
}

describe('the olive grove and the press', () => {
  it('a grove needs dry olive ground: not the river land; it takes slopes too uneven for a press', () => {
    const s = new Sim().state;
    // The fertile river bank where the farms go.
    expect(oliveOf(map, 47, 60, 3)).toBeLessThan(GROVE_OLIVE_MIN);
    expect(buildingRefusal(map, s, 'grove', 47, 60)).toMatch(/^Poor ground for olives/);
    // The slope north of #town's core.
    expect(buildingRefusal(map, s, 'grove', 83, 23)).toBe('');
    expect(buildingRefusal(map, s, 'press', 83, 23)).toMatch(/uneven/);
  });

  it('a grove harvests by its olive ground and its workers; a press makes oil only from the olives in hand', () => {
    const s = new Sim().state;
    const sim = new Sim();
    sim.state = s;
    s.money = 5000;
    sim.enqueue({ type: 'road', tiles: Array.from({ length: 12 }, (_, i) => T(86, 22 + i)) });
    sim.enqueue({ type: 'build', kind: 'grove', at: [T(83, 23), T(87, 23)] });
    sim.flush();
    const [full, half] = kinds(s, 'grove');
    // No homes, so no shared-out workers: staff them by hand and step the makers alone (no press yet, so no carts).
    full.workers = jobsAt(full);
    half.workers = jobsAt(half) / 2;
    for (let t = 0; t < OLIVE_GROW; t++) stepMakers(s, map);
    expect(held(full, OLIVES)).toBe(olivesOf(map, full));
    expect(olivesOf(map, full)).toBeGreaterThan(300);
    expect(held(half, OLIVES)).toBe(0);
    for (let t = 0; t < OLIVE_GROW; t++) stepMakers(s, map);
    expect(held(half, OLIVES)).toBe(olivesOf(map, half));
    sim.enqueue({ type: 'build', kind: 'press', at: [T(83, 27)] });
    sim.flush();
    const press = kinds(s, 'press')[0];
    press.workers = jobsAt(press);
    for (const g of [full, half]) g.goods[gi(OLIVES)] = 0;
    // The press has no olives: it makes nothing.
    expect(held(press, OIL)).toBe(0);
    press.goods[gi(OLIVES)] = 2 * PRESS_BATCH;
    for (let t = 0; t < 3 * PRESS_EVERY; t++) stepMakers(s, map);
    expect(held(press, OIL)).toBe(2 * PRESS_BATCH);
    expect(held(press, OLIVES)).toBe(0);
  });
});

describe('carts, the storehouse, the stall and its vendor', () => {
  it('olive carts go to the press, oil carts to the storehouse, food carts to the granary; the porter brings oil to the stall and the vendor takes it round', () => {
    const sim = withOil();
    const s = sim.state;
    const target = (id: number): Building['kind'] | undefined => s.buildings.find((b) => b.id === id)?.kind;
    const seen = new Set<string>();
    let porter = false;
    let vendor = false;
    for (let t = 0; t < 5 * TICKS_PER_MONTH; t++) {
      sim.step();
      for (const w of s.walkers) {
        if (w.kind === 'cart' && w.target && !w.back) {
          const to = target(w.target);
          seen.add(`${w.food}>${to}`);
          if (w.food === OLIVES) expect(to).toBe('press');
          if (w.food === OIL) expect(to).toBe('storehouse');
          if (w.food === WHEAT || w.food === MEAT || w.food === CHEESE) expect(to).toBe('granary');
        }
        if (w.kind === 'porter' && w.food === OIL) {
          porter = true;
          if (w.target) expect(target(w.target)).toBe('storehouse');
        }
        if (w.kind === 'oil') vendor = true;
      }
    }
    expect(seen.has(`${OLIVES}>press`)).toBe(true);
    expect(seen.has(`${OIL}>storehouse`)).toBe(true);
    expect(porter).toBe(true);
    expect(vendor).toBe(true);
    expect(homes(s).filter((b) => b.goodsUntil[gi(OIL)] > s.tick).length).toBeGreaterThan(10);
    ledgerAddsUp(s);
  });

  it('oil carts whose storehouse is cleared go home with their load', () => {
    const sim = withOil();
    const s = sim.state;
    let t = 0;
    while (!s.walkers.some((w) => w.kind === 'cart' && w.food === OIL && w.load > 0 && !w.back) && t++ < 6 * TICKS_PER_MONTH) sim.step();
    const cart = s.walkers.find((w) => w.kind === 'cart' && w.food === OIL && w.load > 0 && !w.back)!;
    expect(cart).toBeDefined();
    sim.enqueue({ type: 'clear', x0: 33, z0: 60, x1: 33, z1: 60 });
    sim.step();
    expect(kinds(s, 'storehouse').length).toBe(0);
    const press = kinds(s, 'press')[0];
    const before = held(press, OIL);
    const load = cart.load;
    for (let i = 0; i < TICKS_PER_MONTH && s.walkers.includes(cart); i++) sim.step();
    expect(s.walkers.includes(cart)).toBe(false);
    expect(held(press, OIL)).toBeGreaterThanOrEqual(Math.min(before + load, 600) - 3 * PRESS_BATCH);
  });

  it('the stall: added at its price on the ledger, refused without an agora, a road or a second time; undo takes it off and refunds it; clearing the agora takes it', () => {
    const sim = demo('grove');
    const s = sim.state;
    const a = kinds(s, 'agora').find((o) => o.x === 27 && o.z === 71)!;
    expect(stallRefusal(s, N, T(40, 70), OIL, s.money)).toMatch(/click one/);
    expect(stallRefusal(s, N, T(28, 72), OIL, 10)).toBe('Not enough money');
    const money = s.money;
    sim.enqueue({ type: 'stall', at: T(28, 72), good: OIL });
    sim.flush();
    expect(hasStall(a, OIL)).toBe(true);
    expect(s.money).toBe(money - STALL_COST);
    expect(s.ledger.now.some((l) => l.kind === 'building' && l.amount === -STALL_COST)).toBe(true);
    expect(jobsAt(a)).toBeGreaterThan(jobsAt({ ...a, stalls: 0 }));
    expect(stallRefusal(s, N, T(27, 71), OIL, s.money)).toMatch(/already/);
    ledgerAddsUp(s);
    sim.enqueue({ type: 'undo' });
    sim.flush();
    expect(hasStall(a, OIL)).toBe(false);
    expect(s.money).toBe(money);
    ledgerAddsUp(s);
    sim.enqueue({ type: 'stall', at: T(27, 71), good: OIL });
    sim.enqueue({ type: 'clear', x0: 27, z0: 71, x1: 29, z1: 73 });
    sim.flush();
    expect(s.buildings.includes(a)).toBe(false);
    expect(s.walkers.some((w) => w.kind === 'oil')).toBe(false);
    // An agora with no road beside it.
    const lone = new Sim();
    lone.state.money = 5000;
    lone.enqueue({ type: 'build', kind: 'agora', at: [T(40, 70)] });
    lone.flush();
    expect(roadsBeside(lone.state, N, kinds(lone.state, 'agora')[0]).length).toBe(0);
    expect(stallRefusal(lone.state, N, T(40, 70), OIL, 5000)).toMatch(/road/);
  });

  it('a visit tops a home up to six months of oil, a jar a month for every six people', () => {
    const s = demo('fine').state;
    const a = kinds(s, 'agora').find((o) => hasStall(o, OIL))!;
    const b = homes(s).find((h) => h.level === FINE && roadsBeside(s, N, h).length > 0)!;
    b.goodsUntil[gi(OIL)] = 0;
    a.goods[gi(OIL)] = 500;
    const w = { origin: a.id } as Parameters<typeof OIL_ROUND.serve>[3];
    // Every other home beside that road is full already.
    for (const h of homes(s)) if (h !== b) h.goodsUntil[gi(OIL)] = s.tick + OIL_LASTS;
    OIL_ROUND.serve(s, N, roadsBeside(s, N, b)[0], w);
    expect(b.goodsUntil[gi(OIL)]).toBe(s.tick + OIL_LASTS);
    expect(500 - held(a, OIL)).toBe(Math.ceil((b.people * OIL_LASTS) / (TICKS_PER_MONTH * OIL_PEOPLE)));
  });
});

describe('townhouses need oil', () => {
  it('blessed cottages with two foods but no oil stay cottages and say why; once the vendor brings oil they climb', () => {
    const sim = demo('grove');
    const s = sim.state;
    expect(homes(s).filter((b) => b.level >= TOWNHOUSE).length).toBe(0);
    const c = homes(s).find((b) => b.level === COTTAGE && b.religionUntil > s.tick && b.cheeseUntil > s.tick && b.meatUntil > s.tick)!;
    expect(c).toBeDefined();
    // Nothing is wanting yet (a cottage wants oil once the city has an oil stall, as it wants blessings once there is a shrine).
    expect(wantOf(s, c)).toBe('');
    expect(oilLine(s, map, c)).toBe('');
    // The chain, as Oliver would build it.
    sim.enqueue({ type: 'build', kind: 'grove', at: [T(27, 60), T(23, 56)] });
    sim.enqueue({ type: 'build', kind: 'press', at: [T(30, 60)] });
    sim.enqueue({ type: 'build', kind: 'storehouse', at: [T(33, 60)] });
    sim.enqueue({ type: 'stall', at: T(27, 71), good: OIL });
    sim.flush();
    expect(wantOf(s, c)).toBe('oil');
    expect(oilLine(s, map, c)).toMatch(/^No oil · /);
    let first = -1;
    for (let d = 0; d < 300 && first < 0; d++) {
      sim.run(TICKS_PER_DAY);
      if (homes(s).some((b) => b.level === TOWNHOUSE)) first = s.tick;
    }
    expect(first).toBeGreaterThan(0);
    for (const b of homes(s).filter((h) => h.level === TOWNHOUSE)) {
      expect(needsOf(b)).toContain('oil');
      expect(b.goodsUntil[gi(OIL)]).toBeGreaterThan(s.tick);
    }
  });

  it('fine houses that lose their oil warn, then go back to townhouses two months on, and say it was the oil (#nooil)', () => {
    const sim = demo('nooil');
    const s = sim.state;
    const warned = homes(s).filter((b) => warningsOf(s, b).some((w) => w.need === 'oil'));
    expect(warned.length).toBeGreaterThan(3);
    const first = s.buildings.find((b) => b.id === DEMOS.nooil.open!(s))!;
    expect(homeStatus(s, map, first).detail).toMatch(/No oil for \d+ days? · goes back to a townhouse in/);
    expect(homeStatus(s, map, first).detail).toMatch(/no olive press yet/);
    const level = first.level;
    const left = warningsOf(s, first).find((w) => w.need === 'oil')!.left;
    expect(left).toBeLessThanOrEqual(TICKS_PER_MONTH);
    sim.run(left + 2 * TICKS_PER_DAY);
    expect(first.level).toBe(level - 1);
    expect(first.family!.story.some((e) => e.what === 'down' && e.need === 'oil')).toBe(true);
    // Warned WARN_AFTER after the oil ran out, down DECLINE_AFTER after (two months on).
    expect(DECLINE_AFTER - WARN_AFTER).toBe(2 * TICKS_PER_MONTH);
  });
});

describe('saves', () => {
  const text = gunzipSync(readFileSync('tests/fixtures/slice9-fine.save.json.gz')).toString();

  it('a #fine save from slice 9 (state version 8) loads with oil missing, warns only after the grace, and saves again identically', () => {
    expect(JSON.parse(text).state.version).toBe(8);
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    expect(got.file.from).toBe(8);
    const st = got.file.state;
    expect(st.version).toBe(SIM_STATE_VERSION);
    expect(st.rounds.oil).toBeDefined();
    for (const b of st.buildings) {
      expect(b.goods.every((g) => g === 0)).toBe(true);
      expect(b.stalls).toBe(0);
      if (b.kind === 'home') expect(b.grace).toBeGreaterThanOrEqual(st.tick + GRACE_OIL);
    }
    const fine = homes(st).filter((b) => b.level === FINE);
    expect(fine.length).toBeGreaterThan(20);
    expect(oilLine(st, map, fine[0])).toMatch(/^No oil yet · they’ll put up with it for 8 months more: the city has no olive grove yet/);
    const sim = new Sim();
    sim.state = st;
    // Nothing warns of oil, and nothing goes down for it, until WARN_AFTER past the grace.
    sim.run(GRACE_OIL + WARN_AFTER - TICKS_PER_DAY);
    expect(homes(st).some((b) => warningsOf(st, b).some((w) => w.need === 'oil'))).toBe(false);
    expect(homes(st).some((b) => b.family?.story.some((e) => e.what === 'down' && e.need === 'oil'))).toBe(false);
    sim.run(2 * TICKS_PER_DAY);
    expect(homes(st).filter((b) => warningsOf(st, b).some((w) => w.need === 'oil')).length).toBeGreaterThan(10);
    // Saved again, it is a save of this version, and carries on the same.
    const r = decodeSave(encodeSave(st, 2));
    if (!r.ok) throw new Error(r.why);
    expect(r.file.from).toBeUndefined();
    const again = new Sim();
    again.state = r.file.state;
    sim.run(600);
    again.run(600);
    expect(serialize(again.state)).toEqual(serialize(sim.state));
  });

  it('a town mid-chain (carts with olives and oil on the road, the porter and the vendor out) saves and carries on identically, and runs the same every time', () => {
    const sim = demo('oil');
    const s = sim.state;
    let t = 0;
    const busy = (): boolean =>
      s.walkers.some((w) => w.kind === 'cart' && w.food === OLIVES) && s.walkers.some((w) => w.kind === 'cart' && w.food === OIL) && s.walkers.some((w) => w.kind === 'oil');
    while (!busy() && t++ < 2 * TICKS_PER_MONTH) sim.step();
    expect(busy()).toBe(true);
    const copy = new Sim();
    copy.state = deserialize(serialize(s));
    sim.run(900);
    copy.run(900);
    expect(serialize(copy.state)).toEqual(serialize(s));
    expect(serialize(demo('oil').state)).toEqual(serialize(demo('oil').state));
  });
});
