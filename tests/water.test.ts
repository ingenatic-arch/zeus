import { describe, expect, it } from 'vitest';
import { coastMap } from '../src/map/bake';
import { BAY } from '../src/map/lands';
import { FOUNTAIN_COST, STARTING_MONEY } from '../src/sim/build';
import { HOME_CAPACITY } from '../src/sim/buildings';
import { arrivalInterval } from '../src/sim/settlers';
import { Sim } from '../src/sim/sim';
import { homeStatus } from '../src/sim/status';
import { TILE_ROAD, type Building, type SimState } from '../src/sim/state';
import { CARRIER_RANGE, HUT, HUT_DECLINE_AFTER, stepsToFountain, WATER, waterReach, WATER_LASTS } from '../src/sim/water';
import { distFrom } from '../src/sim/rounds';
import { DECLINE_AFTER } from '../src/sim/folk';
import { CARRIER_SPEED, wayNeeds } from '../src/sim/walk';

const map = coastMap();
const N = BAY.size;
const T = (x: number, z: number): number => z * N + x;
const row = (x0: number, x1: number, z: number): number[] => Array.from({ length: x1 - x0 + 1 }, (_, i) => T(x0 + i, z));
const col = (x: number, z0: number, z1: number): number[] => Array.from({ length: z1 - z0 + 1 }, (_, i) => T(x, z0 + i));

const at = (s: SimState, x: number, z: number): Building => {
  const b = s.buildings.find((o) => o.x === x && o.z === z);
  if (!b) throw new Error(`no building at ${x}, ${z}`);
  return b;
};

/**
 * Run the sim, checking every water carrier: whenever she reaches a waypoint
 * on the map she stands on a road, no further than her range from her fountain.
 */
function watchCarriers(sim: Sim, ticks: number, onStep?: (s: SimState) => void, checkReach = true): Set<number> {
  const seen = new Map<number, string>();
  const rounds = new Set<number>();
  for (let i = 0; i < ticks; i++) {
    sim.step();
    const s = sim.state;
    let reach: ReturnType<typeof waterReach> | null = null;
    for (const w of s.walkers) {
      if (w.kind !== 'water') continue;
      rounds.add(w.id);
      const key = `${w.route}:${w.seg}`;
      if (seen.get(w.id) === key) continue;
      seen.set(w.id, key);
      const t = w.tiles[w.seg];
      if (t < 0) continue;
      expect(s.tiles[t]).toBe(TILE_ROAD);
      if (!checkReach) continue;
      reach ??= waterReach(s, N);
      expect(reach.dist[t]).toBeGreaterThanOrEqual(0);
      expect(reach.dist[t]).toBeLessThanOrEqual(CARRIER_RANGE);
    }
    onStep?.(s);
  }
  return rounds;
}

/** A road in from the west edge with a lane running far north, a fountain by the junction, a plot near it and one at the lane's far end. */
function lane(seed = 3): Sim {
  const sim = new Sim(seed);
  sim.enqueue({ type: 'road', tiles: [...row(0, 30, 80), ...col(26, 40, 79)] });
  sim.enqueue({ type: 'fountain', at: [T(27, 81)] });
  // Near: beside the lane two tiles from the junction. Far: the lane's end, 38 road steps from the fountain.
  sim.enqueue({ type: 'plots', at: [T(24, 77), T(27, 41)] });
  return sim;
}

describe('the water carrier', () => {
  it('walks only on roads, within her range, comes home, and sets off again', () => {
    const sim = lane();
    const rounds = watchCarriers(sim, 3000);
    expect(rounds.size).toBeGreaterThanOrEqual(3);
    expect(sim.state.money).toBeLessThanOrEqual(STARTING_MONEY - FOUNTAIN_COST);
  });

  it('waters the homes beside her way: tents become huts, and settlers fill them', () => {
    const sim = lane();
    watchCarriers(sim, 4000);
    const near = at(sim.state, 24, 77);
    expect(near.level).toBe(HUT);
    expect(near.people).toBe(HOME_CAPACITY[HUT]);
    expect(near.waterUntil).toBeGreaterThan(sim.state.tick);
  });

  it('never reaches the end of a lane beyond her range, and the hover tip says why', () => {
    const sim = lane();
    watchCarriers(sim, 4000);
    const far = at(sim.state, 27, 41);
    expect(far.level).toBe(1);
    expect(far.waterUntil).toBe(0);
    const st = homeStatus(sim.state, map, far);
    expect(st.detail).toMatch(/No water/);
    expect(st.detail).toMatch(new RegExp(`\\b(3[3-9]|4\\d) steps away by road; its water carrier goes ${CARRIER_RANGE} at most`));
  });

  it('a hut whose water runs out warns, goes back to a tent DECLINE_AFTER later, and the people it can no longer hold walk out', () => {
    const sim = lane();
    sim.run(4000);
    const near = at(sim.state, 24, 77);
    expect(near.level).toBe(HUT);
    const left = sim.state.left;
    // Take the fountain away.
    sim.enqueue({ type: 'clear', x0: 27, z0: 81, x1: 27, z1: 81 });
    sim.step();
    expect(sim.state.walkers.some((w) => w.kind === 'water')).toBe(false);
    const until = near.waterUntil;
    sim.run(until - sim.state.tick + HUT_DECLINE_AFTER - 20);
    expect(near.level).toBe(HUT);
    expect(homeStatus(sim.state, map, near).detail).toMatch(/goes back to a tent in/);
    sim.run(40);
    expect(near.level).toBe(1);
    expect(near.people).toBeLessThanOrEqual(HOME_CAPACITY[1]);
    expect(sim.state.left).toBeGreaterThanOrEqual(left + HOME_CAPACITY[HUT] - HOME_CAPACITY[1]);
    expect(sim.state.walkers.some((w) => w.kind === 'leaver')).toBe(true);
  });

  it('turns round where the road is cut, never stepping off it, and the fountain keeps sending her', () => {
    const sim = lane(5);
    // Cut the lane a few tiles up, repeatedly, while she walks.
    let cuts = 0;
    const rounds = watchCarriers(sim, 3000, (s) => {
      if (s.tick % 97 === 0) {
        const z = 60 + (cuts++ % 15);
        sim.enqueue({ type: 'clear', x0: 26, z0: z, x1: 26, z1: z });
      }
      // (Only once there is a cut to undo: an undo before the first would take the plots away, and with them the fountain's workers.)
      if (s.tick % 97 === 50 && s.tick > 97) sim.enqueue({ type: 'undo' });
      // (A cut can leave her on a stretch no longer joined to her fountain, so reach isn't checked here.)
    }, false);
    expect(rounds.size).toBeGreaterThanOrEqual(2);
  });

  it('a fountain with no road beside it sends nobody, and its tip says so', () => {
    const sim = new Sim(1);
    sim.enqueue({ type: 'fountain', at: [T(10, 78)] });
    sim.run(500);
    expect(sim.state.walkers).toEqual([]);
    expect(homeStatus(sim.state, map, sim.state.buildings[0]).detail).toMatch(/Needs a road/);
  });

  it('clearing a fountain takes its carrier away; undo brings it back as a fountain; undoing the fountain refunds it', () => {
    const sim = new Sim(1);
    sim.enqueue({ type: 'road', tiles: row(0, 20, 80) });
    // A family nearby to work the fountain (it needs workers since slice 4).
    sim.enqueue({ type: 'plots', at: [T(4, 78)] });
    sim.run(400);
    expect(sim.state.population).toBeGreaterThan(0);
    const before = sim.state.money;
    sim.enqueue({ type: 'fountain', at: [T(10, 81)] });
    sim.run(60);
    expect(sim.state.money).toBe(before - FOUNTAIN_COST);
    expect(sim.state.walkers.filter((w) => w.kind === 'water').length).toBe(1);
    sim.enqueue({ type: 'clear', x0: 10, z0: 81, x1: 11, z1: 82 });
    sim.step();
    expect(sim.state.buildings.map((b) => b.kind)).toEqual(['home']);
    expect(sim.state.walkers.filter((w) => w.kind === 'water').length).toBe(0);
    sim.enqueue({ type: 'undo' });
    sim.step();
    expect(sim.state.buildings.map((b) => b.kind)).toEqual(['home', 'fountain']);
    sim.run(60);
    expect(sim.state.walkers.filter((w) => w.kind === 'water').length).toBe(1);
    sim.enqueue({ type: 'undo' });
    sim.step();
    expect(sim.state.buildings.map((b) => b.kind)).toEqual(['home']);
    // (No month began meanwhile, so no rent came in.)
    expect(sim.state.money).toBe(before);
  });
});

describe('where she goes', () => {
  /** Every lived-in home within her reach has been watered within the last `ticks`. */
  function noneStarved(sim: Sim, ticks: number): void {
    const s = sim.state;
    const reach = waterReach(s, N);
    for (const b of s.buildings) {
      if (b.kind !== 'home' || b.level === 0) continue;
      const d = stepsToFountain(reach, s, N, b);
      if (d < 0 || d > CARRIER_RANGE) continue;
      expect(b.waterUntil - WATER_LASTS, `home at ${b.x}, ${b.z}, ${d} steps away`).toBeGreaterThan(s.tick - ticks);
    }
  }

  it('crosses a long empty stretch of road to homes still within her reach, even with homes by her fountain', () => {
    const sim = new Sim(7);
    sim.enqueue({ type: 'road', tiles: [...row(0, 22, 80), ...col(20, 55, 79)] });
    sim.enqueue({ type: 'fountain', at: [T(21, 81)] });
    // Two homes by the fountain; the rest 21 to 25 road steps up the lane, past 16 tiles of empty road.
    sim.enqueue({ type: 'plots', at: [T(16, 78), T(16, 81), T(21, 55), T(18, 55), T(21, 57), T(18, 57), T(21, 59), T(18, 59)] });
    for (let k = 0; k < 4; k++) {
      watchCarriers(sim, 3000);
      noneStarved(sim, 3000);
    }
    expect(sim.state.buildings.filter((b) => b.level === HUT).length).toBe(8);
  });

  it('on a loop her reach cuts in two, she takes turns round both sides and no home in reach goes dry for good', () => {
    const sim = new Sim(6);
    sim.enqueue({ type: 'road', tiles: [...row(0, 10, 70), ...row(10, 30, 60), ...row(10, 30, 76), ...col(10, 60, 76), ...col(30, 60, 76)] });
    sim.enqueue({ type: 'fountain', at: [T(11, 66)] });
    const at: number[] = [];
    for (let x = 11; x <= 29; x += 2) at.push(T(x, 58), T(x, 61), T(x, 74), T(x, 77));
    sim.enqueue({ type: 'plots', at });
    for (let k = 0; k < 4; k++) {
      watchCarriers(sim, 3000);
      noneStarved(sim, 3000);
    }
  });
});

describe('who she goes to first', () => {
  /**
   * A fountain at the middle of a long street, a hut at each end, ten road
   * steps either way from the junction by the fountain: which way does she
   * choose there, west or east?
   */
  function street(): { sim: Sim; west: Building; east: Building; choose: () => 'west' | 'east' } {
    const sim = new Sim(5);
    sim.enqueue({ type: 'road', tiles: row(0, 40, 80) });
    sim.enqueue({ type: 'fountain', at: [T(20, 81)] });
    sim.enqueue({ type: 'plots', at: [T(10, 78), T(30, 78)] });
    sim.run(5);
    const s = sim.state;
    const west = at(s, 10, 78);
    const east = at(s, 30, 78);
    for (const b of [west, east]) Object.assign(b, { level: HUT, people: 5 });
    s.tick = 10000;
    const choose = (): 'west' | 'east' => {
      const f = s.buildings.find((b) => b.kind === 'fountain')!;
      const [w, e] = wayNeeds(s, N, distFrom(s, N, f), CARRIER_RANGE, WATER.score, 1 / CARRIER_SPEED, T(20, 80), [T(19, 80), T(21, 80)], false, WATER.due);
      return w <= e ? 'west' : 'east';
    };
    return { sim, west, east, choose };
  }

  it('with nobody warned, the home whose water runs out first (as before)', () => {
    const { west, east, choose } = street();
    Object.assign(west, { waterUntil: 10300, since: 0 });
    Object.assign(east, { waterUntil: 10200, since: 0 });
    expect(choose()).toBe('east');
    west.waterUntil = 10100;
    expect(choose()).toBe('west');
  });

  it('the home closest to going down, not one that has just gone down after going without longer', () => {
    const { west, east, choose } = street();
    // West ran dry long ago but has just gone down a level (a fresh two months); east ran dry later, and is ten days from going down.
    Object.assign(west, { waterUntil: 2000, since: 9900 });
    Object.assign(east, { waterUntil: 10000 - DECLINE_AFTER + 100, since: 0 });
    expect(choose()).toBe('east');
  });

  it('not a home she would reach too late to save, while another can still be saved', () => {
    const { west, east, choose } = street();
    // West goes down in 30 ticks, but she needs about 85 to get there; east has a month left.
    Object.assign(west, { waterUntil: 10030 - DECLINE_AFTER, since: 0 });
    Object.assign(east, { waterUntil: 10300 - DECLINE_AFTER, since: 0 });
    expect(choose()).toBe('east');
    // With nobody else wanting her, she still goes to it.
    Object.assign(east, { level: 0, people: 0 });
    expect(choose()).toBe('west');
  });
});

describe('settlers and water', () => {
  it('come sooner with more room, and sooner still with water', () => {
    expect(arrivalInterval(5, 0)).toBe(34);
    expect(arrivalInterval(200, 0)).toBe(12);
    expect(arrivalInterval(5, 1)).toBeLessThan(arrivalInterval(5, 0));
    expect(arrivalInterval(0, 0)).toBe(40);
  });

  it('a group whose home is cleared goes to another home with room for all of them, not just the first with any room', () => {
    const sim = new Sim(2);
    sim.enqueue({ type: 'road', tiles: row(0, 30, 80) });
    sim.enqueue({ type: 'plots', at: [T(4, 78), T(8, 78), T(28, 78)] });
    sim.step();
    const s = sim.state;
    // A tent with room for one, and a hut with room for five.
    Object.assign(at(s, 4, 78), { level: 1, people: 4 });
    Object.assign(at(s, 8, 78), { level: HUT, people: 4, waterUntil: 1e6 });
    // Wait for a group on its way to the empty plot at the far end.
    const target = at(s, 28, 78);
    // ...and walking on the map's road, not still beyond its edge.
    while (!s.walkers.some((w) => w.kind === 'settler' && w.home === target.id && w.tiles[w.seg] >= 0)) sim.step();
    const group = sim.state.walkers.find((w) => w.home === target.id)!;
    const n = group.people;
    sim.enqueue({ type: 'clear', x0: 28, z0: 78, x1: 28, z1: 78 });
    sim.step();
    const w = sim.state.walkers.find((o) => o.id === group.id)!;
    expect(w.kind).toBe('settler');
    expect(w.people).toBe(n);
    expect(w.home).toBe(at(sim.state, 8, 78).id);
  });
});

describe('reach', () => {
  it('counts road steps from the tiles beside every fountain', () => {
    const sim = lane();
    sim.step();
    const reach = waterReach(sim.state, N);
    expect(reach.dist[T(27, 80)]).toBe(0);
    expect(reach.dist[T(26, 80)]).toBe(1);
    expect(reach.dist[T(26, 50)]).toBe(31);
    expect(reach.dist[T(5, 70)]).toBe(-1);
  });

  it('she heads for the homes that need her, and does not walk an empty road out to the edge of the map', () => {
    const sim = new Sim(4);
    sim.enqueue({ type: 'road', tiles: row(0, 34, 80) });
    sim.enqueue({ type: 'fountain', at: [T(20, 81)] });
    // Homes only east of the fountain.
    sim.enqueue({ type: 'plots', at: [T(24, 78), T(27, 78), T(30, 78)] });
    // Once families live there (before, with nobody to water, she wanders everywhere).
    sim.run(800);
    const earlier = new Set(sim.state.walkers.map((w) => w.id));
    let westmost = Infinity;
    watchCarriers(sim, 3000, (s) => {
      for (const w of s.walkers) if (w.kind === 'water' && !earlier.has(w.id) && w.tiles[w.seg] >= 0) westmost = Math.min(westmost, w.tiles[w.seg] % N);
    });
    expect(westmost).toBeGreaterThanOrEqual(19);
    for (const b of sim.state.buildings) if (b.kind === 'home') expect(b.waterUntil).toBeGreaterThan(sim.state.tick);
    expect(WATER_LASTS).toBeGreaterThan(0);
  });
});
