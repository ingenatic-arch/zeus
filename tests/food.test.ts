import { describe, expect, it } from 'vitest';
import { coastMap } from '../src/map/bake';
import { MAP_SIZE } from '../src/map/coast';
import { AGORA_COST, BRIDGE_COST, FARM_COST, GRANARY_COST, isBridge, ROAD_COST, roadRefusal } from '../src/sim/build';
import { COTTAGE, HOME_CAPACITY, HUT, JOBS } from '../src/sim/buildings';
import { TICKS_PER_MONTH } from '../src/sim/clock';
import { BARN, FOOD_LASTS, GROW, harvestOf, VENDOR_RANGE } from '../src/sim/food';
import { DECLINE_AFTER, RENT } from '../src/sim/houses';
import { rateOf, shareWork } from '../src/sim/labour';
import { roadRoute } from '../src/sim/roads';
import { distFrom } from '../src/sim/rounds';
import { Sim } from '../src/sim/sim';
import { homeStatus } from '../src/sim/status';
import { TILE_ROAD, type Building, type SimState } from '../src/sim/state';

const map = coastMap();
const N = MAP_SIZE;
const T = (x: number, z: number): number => z * N + x;
const row = (x0: number, x1: number, z: number): number[] => Array.from({ length: x1 - x0 + 1 }, (_, i) => T(x0 + i, z));

const kind = (s: SimState, k: Building['kind']): Building => {
  const b = s.buildings.find((o) => o.kind === k);
  if (!b) throw new Error(`no ${k}`);
  return b;
};

/**
 * A road in from the west edge along the plain south of the river land, with
 * homes along it, a fountain, a farm on the fertile ground at its east end, a
 * granary and the agora.
 */
function village(seed = 5, opts: { homes?: number; fountain?: boolean } = {}): Sim {
  const sim = new Sim(seed);
  sim.enqueue({ type: 'road', tiles: row(0, 56, 70) });
  const plots: number[] = [];
  for (let x = 2; x <= 18 && plots.length < (opts.homes ?? 18); x += 2) plots.push(T(x, 68), T(x, 71));
  sim.enqueue({ type: 'plots', at: plots.slice(0, opts.homes ?? 18) });
  if (opts.fountain ?? true) sim.enqueue({ type: 'fountain', at: [T(24, 71)] });
  sim.enqueue({ type: 'build', kind: 'farm', at: [T(52, 67)] });
  sim.enqueue({ type: 'build', kind: 'granary', at: [T(30, 71)] });
  sim.enqueue({ type: 'build', kind: 'agora', at: [T(20, 71)] });
  return sim;
}

/** Run, checking that carts, porters and the vendor stand on a road whenever they reach a waypoint on the map, and the vendor stays within her reach. */
function watch(sim: Sim, ticks: number, onStep?: (s: SimState) => void): Set<string> {
  const seen = new Map<number, string>();
  const kinds = new Set<string>();
  for (let i = 0; i < ticks; i++) {
    sim.step();
    const s = sim.state;
    for (const w of s.walkers) {
      if (w.kind !== 'cart' && w.kind !== 'porter' && w.kind !== 'food') continue;
      kinds.add(w.kind);
      const key = `${w.route}:${w.seg}`;
      if (seen.get(w.id) === key) continue;
      seen.set(w.id, key);
      const t = w.tiles[w.seg];
      if (t < 0) continue;
      expect(s.tiles[t]).toBe(TILE_ROAD);
      if (w.kind === 'food') {
        const a = s.buildings.find((b) => b.id === w.origin)!;
        const d = distFrom(s, N, a)[t];
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(VENDOR_RANGE);
      }
    }
    onStep?.(s);
  }
  return kinds;
}

describe('the food chain', () => {
  it('costs what it says', () => {
    const sim = village();
    const before = sim.state.money;
    sim.step();
    expect(sim.state.buildings.map((b) => b.kind).filter((k) => k !== 'home')).toEqual(['fountain', 'farm', 'granary', 'agora']);
    expect(before - sim.state.money).toBe(57 * ROAD_COST + 18 * 10 + 150 + FARM_COST + GRANARY_COST + AGORA_COST);
  });

  it('farm to granary to stall to homes: carts and porter keep to the roads, the vendor to her reach, and fed huts become cottages', () => {
    const sim = village();
    let harvested = 0;
    let delivered = 0;
    let lastBarn = 0;
    let lastGranary = 0;
    const kinds = watch(sim, 4800, (s) => {
      const f = kind(s, 'farm');
      const g = kind(s, 'granary');
      if (f.stock > lastBarn) harvested++;
      if (g.stock > lastGranary) delivered++;
      lastBarn = f.stock;
      lastGranary = g.stock;
    });
    expect([...kinds].sort()).toEqual(['cart', 'food', 'porter']);
    expect(harvested).toBeGreaterThanOrEqual(5);
    expect(delivered).toBeGreaterThanOrEqual(5);
    const s = sim.state;
    const cottages = s.buildings.filter((b) => b.kind === 'home' && b.level === COTTAGE);
    expect(cottages.length).toBeGreaterThanOrEqual(10);
    for (const c of cottages) expect(c.people).toBeLessThanOrEqual(HOME_CAPACITY[COTTAGE]);
    expect(homeStatus(s, map, cottages[0]).detail).toMatch(/Has food/);
  });

  it('the harvest is the farm’s fertility times a full harvest, after two months at full strength', () => {
    const sim = village();
    sim.run(20);
    const f = kind(sim.state, 'farm');
    expect(rateOf(f)).toBe(0);
    // Wait for its workers.
    while (rateOf(f) < 1) sim.step();
    const start = sim.state.tick;
    const left = GROW - f.growth;
    while (f.stock === 0 && sim.state.tick < start + GROW + 50) sim.step();
    expect(Math.abs(sim.state.tick - start - left)).toBeLessThanOrEqual(2);
    expect(f.stock + sim.state.walkers.filter((w) => w.kind === 'cart').reduce((a, w) => a + w.load, 0)).toBe(harvestOf(map, f));
  });

  it('a barn with nowhere to send its grain fills up, and then nothing more grows', () => {
    const sim = new Sim(3);
    sim.enqueue({ type: 'road', tiles: row(0, 56, 70) });
    sim.enqueue({ type: 'plots', at: [T(40, 68), T(40, 71), T(44, 71), T(36, 71), T(36, 68)] });
    sim.enqueue({ type: 'build', kind: 'farm', at: [T(52, 67)] });
    sim.run(GROW * 6);
    const f = kind(sim.state, 'farm');
    expect(f.stock).toBe(BARN);
    const g = f.growth;
    sim.run(200);
    expect(f.growth).toBe(g);
    expect(homeStatus(sim.state, map, f).detail).toMatch(/barn is full/);
  });

  it('a cottage whose food runs out goes back to a hut a month later, and the people it can no longer hold walk out', () => {
    const sim = village();
    sim.run(4800);
    const s = sim.state;
    const c = s.buildings.find((b) => b.kind === 'home' && b.level === COTTAGE && b.people > HOME_CAPACITY[HUT])!;
    expect(c).toBeTruthy();
    // Take the agora away.
    const a = kind(s, 'agora');
    sim.enqueue({ type: 'clear', x0: a.x, z0: a.z, x1: a.x, z1: a.z });
    sim.step();
    expect(sim.state.walkers.some((w) => w.kind === 'food' || w.kind === 'porter')).toBe(false);
    const until = Math.max(c.foodUntil, c.since);
    sim.run(until - sim.state.tick + DECLINE_AFTER - 20);
    expect(c.level).toBe(COTTAGE);
    expect(homeStatus(sim.state, map, c).detail).toMatch(/goes back to a hut in/);
    const left = sim.state.left;
    sim.run(40);
    expect(c.level).toBe(HUT);
    expect(c.people).toBeLessThanOrEqual(HOME_CAPACITY[HUT]);
    expect(sim.state.left).toBeGreaterThan(left);
  });

  it('the vendor tops up a home’s food to last four months, paid for from the stall at a measure a person a month', () => {
    const sim = village();
    sim.run(4000);
    const s = sim.state;
    const a = kind(s, 'agora');
    // Watch servings: each tops a home up to four months, at a measure a person a month added.
    let checked = 0;
    for (let i = 0; i < 4000 && checked < 3; i++) {
      const before = new Map(s.buildings.map((b) => [b.id, b.foodUntil]));
      const stock = a.stock;
      sim.step();
      const served = s.buildings.filter((b) => b.kind === 'home' && b.foodUntil !== before.get(b.id));
      if (served.length === 0 || a.stock >= stock || a.stock === 0) continue;
      let cost = 0;
      for (const b of served) {
        expect(b.foodUntil).toBe(s.tick + FOOD_LASTS);
        cost += Math.ceil((b.people * (b.foodUntil - Math.max(before.get(b.id)!, s.tick))) / TICKS_PER_MONTH);
      }
      expect(stock - a.stock).toBe(cost);
      checked++;
    }
    expect(checked).toBe(3);
  });
});

describe('workers', () => {
  it('half of each household can work, and they go to the nearest workplace first', () => {
    const sim = new Sim(1);
    sim.enqueue({ type: 'road', tiles: row(0, 56, 70) });
    sim.enqueue({ type: 'plots', at: [T(4, 71)] });
    // A granary near the home and one far along the road.
    sim.enqueue({ type: 'build', kind: 'granary', at: [T(8, 71)] });
    sim.enqueue({ type: 'build', kind: 'granary', at: [T(40, 71)] });
    sim.step();
    const s = sim.state;
    const home = s.buildings[0];
    Object.assign(home, { level: 1, people: 5 });
    shareWork(s, map);
    const [near, far] = s.buildings.filter((b) => b.kind === 'granary');
    expect(home.workers).toBe(2);
    expect(near.workers).toBe(2);
    expect(far.workers).toBe(0);
    // A bigger household fills the near one, then the far one.
    Object.assign(home, { level: COTTAGE, people: 13 });
    shareWork(s, map);
    expect(near.workers).toBe(JOBS.granary);
    expect(far.workers).toBe(0);
    Object.assign(home, { people: 30 });
    shareWork(s, map);
    expect(near.workers).toBe(JOBS.granary);
    expect(far.workers).toBe(JOBS.granary);
    expect(home.workers).toBe(12);
  });

  it('a short-handed farm grows slower in proportion, and says so; more homes fill its jobs', () => {
    const sim = new Sim(5);
    sim.enqueue({ type: 'road', tiles: row(0, 56, 70) });
    sim.enqueue({ type: 'plots', at: [T(44, 71), T(40, 71)] });
    sim.enqueue({ type: 'build', kind: 'farm', at: [T(52, 67)] });
    sim.run(900);
    const s = sim.state;
    const f = kind(s, 'farm');
    expect(f.workers).toBeGreaterThan(0);
    expect(f.workers).toBeLessThan(JOBS.farm);
    const g0 = f.growth;
    sim.run(9);
    expect(f.growth - g0).toBeCloseTo(9 * rateOf(f), 6);
    expect(homeStatus(s, map, f).detail).toMatch(/Short of workers: \d+ of 10 · working at \d+%/);
    // More housing.
    const plots: number[] = [];
    for (let x = 30; x <= 38; x += 2) plots.push(T(x, 71), T(x, 68));
    sim.enqueue({ type: 'plots', at: plots });
    sim.run(2000);
    expect(f.workers).toBe(JOBS.farm);
    expect(homeStatus(s, map, f).detail).toMatch(/Workers: 10 of 10/);
  });

  it('a fountain with nobody to work it sends no carrier, and says why', () => {
    const sim = new Sim(1);
    sim.enqueue({ type: 'road', tiles: row(0, 20, 80) });
    sim.enqueue({ type: 'fountain', at: [T(10, 81)] });
    sim.run(500);
    expect(sim.state.walkers.some((w) => w.kind === 'water')).toBe(false);
    expect(homeStatus(sim.state, map, sim.state.buildings[0]).detail).toMatch(/No workers/);
  });
});

describe('rent', () => {
  it('each lived-in household pays by its level on the first day of the month', () => {
    const sim = village(5, { homes: 4 });
    sim.run(TICKS_PER_MONTH - 1);
    const s = sim.state;
    const homes = s.buildings.filter((b) => b.kind === 'home');
    Object.assign(homes[0], { level: 1, people: 3 });
    Object.assign(homes[1], { level: HUT, people: 7, waterUntil: 1e6 });
    Object.assign(homes[2], { level: COTTAGE, people: 11, waterUntil: 1e6, foodUntil: 1e6 });
    Object.assign(homes[3], { level: 0, people: 0, incoming: 0 });
    const before = s.money;
    sim.step();
    expect(s.money - before).toBe(RENT[1] + RENT[HUT] + RENT[COTTAGE]);
    expect(s.rent).toEqual({ paid: RENT[1] + RENT[HUT] + RENT[COTTAGE], homes: 3 });
  });
});

describe('bridges', () => {
  // Row 41 crosses the river's upper reaches: land at x 30, river and bank 31-37, land at 38.
  it('a straight road across a narrow stretch of river is laid as a bridge, and charged as one', () => {
    const sim = new Sim(1);
    const route = roadRoute(map, sim.state, T(26, 41), T(42, 41));
    expect(route).toEqual(row(26, 42, 41));
    const before = sim.state.money;
    sim.enqueue({ type: 'road', tiles: route! });
    sim.step();
    for (let x = 26; x <= 42; x++) expect(sim.state.tiles[T(x, 41)]).toBe(TILE_ROAD);
    const wet = row(26, 42, 41).filter((t) => isBridge(map, sim.state, t));
    expect(wet.length).toBe(7);
    expect(before - sim.state.money).toBe(10 * ROAD_COST + 7 * BRIDGE_COST);
  });

  it('a drag straight across near an existing bridge builds a new one rather than going round over the old', () => {
    const sim = new Sim(1);
    sim.enqueue({ type: 'road', tiles: [...Array.from({ length: 6 }, (_, i) => T(26, 36 + i)), ...roadRoute(map, sim.state, T(26, 41), T(44, 41))!, T(27, 36), T(28, 36), T(29, 36)] });
    sim.step();
    expect(row(31, 37, 41).every((t) => isBridge(map, sim.state, t))).toBe(true);
    const route = roadRoute(map, sim.state, T(29, 36), T(40, 36));
    expect(route).toEqual(row(29, 40, 36));
  });

  it('refuses a span too wide, the sea, or one not on the drag’s line', () => {
    const s = new Sim(1).state;
    // Too wide on the lower river.
    expect(roadRoute(map, s, T(50, 61), T(65, 60))).toBeNull();
    // A bridge is only found on the drag's own row or column: dragging diagonally across the narrow stretch finds none.
    expect(roadRoute(map, s, T(28, 38), T(40, 44))).toBeNull();
    // Sending the wet tiles alone, or a broken span, lays nothing.
    const sim = new Sim(1);
    sim.enqueue({ type: 'road', tiles: row(31, 35, 41) });
    sim.step();
    expect(sim.state.tiles.filter((t) => t === TILE_ROAD).length).toBe(0);
    expect(sim.state.money).toBe(5000);
  });

  it('walkers cross it; clearing one tile clears the whole bridge and undo puts it back', () => {
    const sim = new Sim(2);
    // A road in from the west edge, north to row 41, then east over the bridge to homes on the far bank.
    const lane = Array.from({ length: 80 - 41 }, (_, i) => T(20, 79 - i));
    sim.enqueue({ type: 'road', tiles: [...row(0, 20, 80), ...lane, ...row(20, 30, 41)] });
    sim.step();
    sim.enqueue({ type: 'road', tiles: roadRoute(map, sim.state, T(30, 41), T(44, 41))! });
    sim.enqueue({ type: 'plots', at: [T(40, 42), T(42, 42)] });
    sim.run(1500);
    const far = sim.state.buildings.filter((b) => b.kind === 'home' && b.x >= 40);
    expect(far.every((b) => b.people > 0)).toBe(true);
    const roads = sim.state.tiles.filter((t) => t === TILE_ROAD).length;
    sim.enqueue({ type: 'clear', x0: 34, z0: 41, x1: 34, z1: 41 });
    sim.step();
    for (let x = 31; x <= 37; x++) expect(sim.state.tiles[T(x, 41)]).not.toBe(TILE_ROAD);
    expect(sim.state.tiles[T(30, 41)]).toBe(TILE_ROAD);
    expect(sim.state.tiles.filter((t) => t === TILE_ROAD).length).toBe(roads - 7);
    sim.enqueue({ type: 'undo' });
    sim.step();
    expect(sim.state.tiles.filter((t) => t === TILE_ROAD).length).toBe(roads);
  });

  it('no road may join a bridge from the side', () => {
    const sim = new Sim(1);
    sim.enqueue({ type: 'road', tiles: row(26, 42, 41) });
    sim.step();
    expect(isBridge(map, sim.state, T(31, 41))).toBe(true);
    // (31, 42) is dry land beside the bridge's first tile: a road there would join it sideways.
    expect(roadRefusal(map, sim.state, 31, 42)).toMatch(/side of a bridge/);
    // Its end, on the bank, is fine.
    expect(roadRefusal(map, sim.state, 30, 42)).toBe('');
  });
});

describe('clearing and undo', () => {
  it('a cleared farm’s carts vanish and give back the room they reserved; an undone granary comes back with its grain', () => {
    const sim = village();
    // Until a cart is on its way to the granary.
    while (!sim.state.walkers.some((w) => w.kind === 'cart' && !w.back)) sim.step();
    const s = sim.state;
    const g = kind(s, 'granary');
    expect(g.incoming).toBeGreaterThan(0);
    const f = kind(s, 'farm');
    sim.enqueue({ type: 'clear', x0: f.x, z0: f.z, x1: f.x, z1: f.z });
    sim.step();
    expect(sim.state.walkers.some((w) => w.kind === 'cart')).toBe(false);
    expect(g.incoming).toBe(0);
    // Fill the granary a little, clear it, undo.
    g.stock = 777;
    sim.enqueue({ type: 'clear', x0: g.x + 1, z0: g.z + 1, x1: g.x + 1, z1: g.z + 1 });
    sim.step();
    expect(sim.state.buildings.some((b) => b.kind === 'granary')).toBe(false);
    sim.enqueue({ type: 'undo' });
    sim.step();
    expect(kind(sim.state, 'granary').stock).toBe(777);
    // Its workers are shared out again within a day.
    sim.run(12);
    expect(kind(sim.state, 'granary').workers).toBeGreaterThan(0);
  });

  it('a cart whose granary is cleared takes its load home to the barn', () => {
    const sim = village();
    while (!sim.state.walkers.some((w) => w.kind === 'cart' && !w.back && w.seg > 3)) sim.step();
    const s = sim.state;
    const cart = s.walkers.find((w) => w.kind === 'cart' && !w.back)!;
    const load = cart.load;
    const f = kind(s, 'farm');
    const barn = f.stock;
    const g = kind(s, 'granary');
    sim.enqueue({ type: 'clear', x0: g.x, z0: g.z, x1: g.x, z1: g.z });
    sim.step();
    expect(cart.back).toBe(true);
    sim.run(1500);
    expect(sim.state.walkers.some((w) => w.id === cart.id)).toBe(false);
    expect(f.stock).toBeGreaterThanOrEqual(Math.min(BARN, barn + load));
  });
});
