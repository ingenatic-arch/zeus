/**
 * Marble and timber (slice 32): the quarry on the headland's marble, its
 * quarrymen and sledges; the loggers' camp at a wood's edge, its loggers,
 * felled trees growing back; the new goods in Greece; and a save from before
 * brought up to date.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { coastMap } from '../src/map/bake';
import { coast } from '../src/map/coast';
import { buildingRefusal } from '../src/sim/build';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { GOOD_COUNT, held, MARBLE, TIMBER } from '../src/sim/foods';
import { campWoods, CAMP_TREES_MIN, LOGS_PER_TREE, marbleOf, QUARRY_MARBLE_MIN, REGROW, standing, timberTrees } from '../src/sim/materials';
import { roadRoute } from '../src/sim/roads';
import { deserialize, serialize, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, TILE_ROAD, type Building, type SimState } from '../src/sim/state';
import { TRADE_GOODS, tradeIndex } from '../src/sim/trade';
import { cityOf, sellsAndBuys } from '../src/sim/world';
import { demoSim } from './prepared';

const N = 128;
const T = (x: number, z: number): number => z * N + x;

/** The best spot (by `score`) for a building of this kind with a road beside it, within a box. */
function spotBy(sim: Sim, kind: 'quarry' | 'loggers' | 'storehouse', side: number, box: [number, number, number, number], score: (x: number, z: number) => number): number {
  const s = sim.state;
  let best = -1;
  let bs = -Infinity;
  for (let tz = box[1]; tz <= box[3]; tz++) {
    for (let tx = box[0]; tx <= box[2]; tx++) {
      if (buildingRefusal(sim.map, s, kind, tx, tz) !== '') continue;
      const ring: number[] = [];
      for (let d = 0; d < side; d++) ring.push((tz - 1) * N + tx + d, (tz + side) * N + tx + d, (tz + d) * N + tx - 1, (tz + d) * N + tx + side);
      if (!ring.some((t) => s.tiles[t] === TILE_ROAD)) continue;
      const v = score(tx, tz);
      if (v > bs) {
        bs = v;
        best = T(tx, tz);
      }
    }
  }
  return best;
}

const send = (sim: Sim, c: Parameters<Sim['enqueue']>[0]): void => {
  sim.enqueue(c);
  sim.flush();
};

/** The first road tile found in a box, scanning as given. */
function roadIn(s: SimState, xs: number[], zs: number[]): number {
  for (const x of xs) for (const z of zs) if (s.tiles[T(x, z)] === TILE_ROAD) return T(x, z);
  return -1;
}
const range = (a: number, b: number): number[] => (a <= b ? Array.from({ length: b - a + 1 }, (_, k) => a + k) : Array.from({ length: a - b + 1 }, (_, k) => a - k));

/** #richtown's town (fires and collapse off, money to spare) with a road out to the headland, a quarry on its richest marble and a storehouse beside it. */
function quarryTown(): { sim: Sim; q: Building } {
  const sim = demoSim('richtown');
  const s = sim.state;
  s.hazards = false;
  s.money = 20000;
  const from = roadIn(s, range(95, 60), range(60, 75));
  const road = roadRoute(sim.map, s, from, T(108, 99)) ?? [];
  expect(road.length).toBeGreaterThan(0);
  send(sim, { type: 'road', tiles: road });
  const q = spotBy(sim, 'quarry', 3, [104, 95, 116, 106], (x, z) => marbleOf(sim.map, x, z, 3) - Math.hypot(x - 110, z - 101) * 0.01);
  expect(q).toBeGreaterThanOrEqual(0);
  send(sim, { type: 'build', kind: 'quarry', at: [q] });
  const st = spotBy(sim, 'storehouse', 3, [85, 60, 112, 106], (x, z) => -Math.hypot(x - 108, z - 98));
  expect(st).toBeGreaterThanOrEqual(0);
  send(sim, { type: 'build', kind: 'storehouse', at: [st] });
  return { sim, q: s.buildings.find((b) => b.kind === 'quarry')! };
}

/** #richtown's town with a road south from the west road to the west wood's edge, a loggers' camp there and a storehouse on the way. */
function campTown(): { sim: Sim; c: Building } {
  const sim = demoSim('richtown');
  const s = sim.state;
  s.hazards = false;
  s.money = 20000;
  const from = roadIn(s, range(14, 30), range(56, 40));
  const road = roadRoute(sim.map, s, from, T(18, 70)) ?? [];
  expect(road.length).toBeGreaterThan(0);
  send(sim, { type: 'road', tiles: road });
  const c = spotBy(sim, 'loggers', 2, [8, 60, 24, 74], (x, z) => -Math.hypot(x - 15, z - 72));
  expect(c).toBeGreaterThanOrEqual(0);
  send(sim, { type: 'build', kind: 'loggers', at: [c] });
  const st = spotBy(sim, 'storehouse', 3, [10, 52, 30, 70], (x, z) => -Math.hypot(x - 20, z - 60));
  send(sim, { type: 'build', kind: 'storehouse', at: [st] });
  return { sim, c: s.buildings.find((b) => b.kind === 'loggers')! };
}

const stored = (s: SimState, w: number): number => s.buildings.filter((b) => b.kind === 'storehouse').reduce((a, b) => a + held(b, w), 0);
const made = (s: SimState, w: number): number => [...s.stocks.months.map((m) => m.made[w] ?? 0), ...s.stocks.now.filter((l) => l.kind === 'made' && l.ware === w).map((l) => l.n)].reduce((a, n) => a + n, 0);

describe('marble in the rock', () => {
  it('each outcrop has rock rich enough for a quarry, and a quarry is refused elsewhere', () => {
    const sim = new Sim();
    expect(buildingRefusal(sim.map, sim.state, 'quarry', 60, 50)).toMatch(/No marble/);
    for (const o of coast.marble) {
      let ok = false;
      for (let z = Math.floor(o.z - o.r); z <= o.z + o.r && !ok; z++) for (let x = Math.floor(o.x - o.r); x <= o.x + o.r && !ok; x++) ok = buildingRefusal(sim.map, sim.state, 'quarry', x, z) === '' && marbleOf(sim.map, x, z, 3) >= QUARRY_MARBLE_MIN;
      expect(ok, o.place).toBe(true);
    }
  });
});

describe('the quarry', () => {
  it('staffed, its quarrymen cut blocks at about the planned rate and its sledges take them to the storehouse', () => {
    const { sim, q } = quarryTown();
    const s = sim.state;
    sim.run(TICKS_PER_DAY + 2);
    expect(q.workers).toBe(8);
    expect(s.walkers.filter((w) => w.kind === 'quarryman' && w.origin === q.id).length).toBe(4);
    let sledges = 0;
    const t0 = s.tick;
    const m0 = made(s, MARBLE);
    for (let k = 0; k < 2 * TICKS_PER_MONTH; k += 10) {
      sim.run(10);
      sledges = Math.max(sledges, s.walkers.filter((w) => w.kind === 'sledge').length);
    }
    const cut = made(s, MARBLE) - m0;
    const months = (s.tick - t0) / TICKS_PER_MONTH;
    // About 100 blocks a month on rock this rich (the stack may fill and hold them back a little).
    expect(cut / months).toBeGreaterThan(60);
    expect(cut / months).toBeLessThan(110);
    expect(sledges).toBeGreaterThan(0);
    expect(stored(s, MARBLE)).toBeGreaterThan(0);
  });

  it('a quarry with nobody working it cuts nothing', () => {
    const sim = demoSim('richtown');
    const s = sim.state;
    s.hazards = false;
    s.money = 20000;
    // On the marble with no road to it: no workers can reach it.
    let at = -1;
    for (let z = 98; z < 106 && at < 0; z++) for (let x = 106; x < 115 && at < 0; x++) if (buildingRefusal(sim.map, s, 'quarry', x, z) === '') at = T(x, z);
    send(sim, { type: 'build', kind: 'quarry', at: [at] });
    const q = s.buildings.find((b) => b.kind === 'quarry')!;
    sim.run(TICKS_PER_MONTH);
    expect(q.workers).toBe(0);
    expect(s.walkers.some((w) => w.kind === 'quarryman')).toBe(false);
    expect(held(q, MARBLE)).toBe(0);
  });
});

describe('the loggers’ camp', () => {
  it('is refused with no wood in reach, and allowed at a wood’s edge', () => {
    const sim = new Sim();
    expect(buildingRefusal(sim.map, sim.state, 'loggers', 60, 50)).toMatch(/wood’s edge/);
    for (const w of coast.woods) expect(campWoods(sim.map, sim.state, { x: Math.round(w.x - w.r), z: Math.round(w.z) }).standing.length + 1).toBeGreaterThan(CAMP_TREES_MIN);
    // The olive trees are never timber.
    const map = coastMap();
    expect(timberTrees(map).every((i) => map.trees[i].kind === 1 || map.trees[i].kind === 2)).toBe(true);
  });

  it('its loggers fell trees and bring the logs home; the camp strips its reach, and the wood grows back after REGROW and not before', () => {
    const { sim, c } = campTown();
    const s = sim.state;
    const inReach = campWoods(sim.map, s, c).standing.length;
    expect(inReach).toBeGreaterThanOrEqual(CAMP_TREES_MIN);
    sim.run(2 * TICKS_PER_MONTH);
    expect(s.materials.felled.length).toBeGreaterThan(0);
    expect(made(s, TIMBER)).toBeGreaterThan(0);
    expect(made(s, TIMBER) % LOGS_PER_TREE).toBe(0);
    // Every tree in reach falls in time, and then nothing is felled until one grows back.
    const first = s.materials.felled[0];
    for (let k = 0; k < 12 && campWoods(sim.map, s, c).standing.length > 0; k++) sim.run(TICKS_PER_MONTH);
    expect(campWoods(sim.map, s, c).standing.length).toBe(0);
    expect(s.materials.felled.length).toBeGreaterThanOrEqual(inReach);
    expect(standing(s, first.tree)).toBe(false);
    // Just before its two years are up, still a stump; just after, standing (and soon felled again).
    sim.run(first.at + REGROW - TICKS_PER_DAY - s.tick);
    expect(standing(s, first.tree)).toBe(false);
    sim.run(2 * TICKS_PER_DAY);
    const again = s.materials.felled.find((f) => f.tree === first.tree);
    expect(standing(s, first.tree) || (again !== undefined && again.at > first.at)).toBe(true);
    expect(stored(s, TIMBER)).toBeGreaterThan(0);
  });

  it('a tree cleared away under a logger’s axe sends him to another', () => {
    const { sim } = campTown();
    const s = sim.state;
    let w = s.walkers.find((x) => x.kind === 'logger' && x.steps === 1);
    for (let k = 0; k < 60 && !w; k++) {
      sim.run(5);
      w = s.walkers.find((x) => x.kind === 'logger' && x.steps === 1);
    }
    expect(w).toBeDefined();
    const tree = w!.food;
    const t = sim.map.trees[tree];
    send(sim, { type: 'clear', x0: Math.floor(t.x), z0: Math.floor(t.z), x1: Math.floor(t.x), z1: Math.floor(t.z) });
    expect(standing(s, tree)).toBe(false);
    sim.step();
    const now = s.walkers.find((x) => x.id === w!.id);
    // He is after another tree, or on his way home.
    expect(now === undefined || now.food !== tree || now.back).toBe(true);
    expect(s.materials.felled.some((f) => f.tree === tree)).toBe(false);
  });
});

describe('the works and the save', () => {
  it('the same commands give the same quarry and camp, and a save mid-felling plays on identically', () => {
    const a = quarryTown().sim;
    const b = new Sim();
    b.state = deserialize(serialize(a.state));
    for (const sim of [a, b]) {
      const s = sim.state;
      const from = roadIn(s, range(14, 30), range(56, 40));
      send(sim, { type: 'road', tiles: roadRoute(sim.map, s, from, T(18, 70)) ?? [] });
      send(sim, { type: 'build', kind: 'loggers', at: [spotBy(sim, 'loggers', 2, [8, 60, 24, 74], (x, z) => -Math.hypot(x - 15, z - 72))] });
      sim.run(TICKS_PER_MONTH);
    }
    expect(serialize(b.state)).toBe(serialize(a.state));
    expect(a.state.materials.felled.length).toBeGreaterThan(0);
    expect(a.state.walkers.some((w) => w.kind === 'logger')).toBe(true);
    expect(a.state.walkers.some((w) => w.kind === 'quarryman')).toBe(true);
    // Through a save and back, mid-felling.
    const r = decodeSave(encodeSave(a.state, 1));
    if (!r.ok) throw new Error(r.why);
    const c = new Sim();
    c.state = r.file.state;
    a.run(TICKS_PER_MONTH);
    c.run(TICKS_PER_MONTH);
    expect(serialize(c.state)).toBe(serialize(a.state));
  });

  it('a save from before marble and timber (version 27, phase 4’s) loads: no tree felled, every goods list padded, and it plays on', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/phase4-bronze.save.json.gz')).toString();
    // (The fixture's own version, phase 4's: a literal, as a migration step's test may use, so it holds when the version is renumbered at merge.)
    expect(JSON.parse(text).state.version).toBe(27);
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    const st = got.file.state;
    expect(st.version).toBe(SIM_STATE_VERSION);
    expect(st.materials.felled).toEqual([]);
    expect(st.buildings.every((b) => b.goods.length === GOOD_COUNT && b.goodsIn.length === GOOD_COUNT)).toBe(true);
    expect(st.trade.sell.length).toBe(TRADE_GOODS.length);
    for (const c of st.world.cities) for (const k of ['make', 'need', 'price', 'stock', 'trail', 'history', 'dealt'] as const) expect(c[k].length, `${c.id} ${k}`).toBe(TRADE_GOODS.length);
    for (const r of st.world.routes) expect(r.sell.length).toBe(TRADE_GOODS.length);
    const athens = cityOf(st.world, 'athens');
    expect(athens.make[tradeIndex(MARBLE)]).toBeGreaterThan(athens.need[tradeIndex(MARBLE)]);
    const sim = new Sim();
    sim.state = st;
    const people = st.population;
    sim.run(TICKS_PER_MONTH);
    expect(Math.abs(st.population - people)).toBeLessThan(people * 0.2);
  });
});

describe('marble and timber in Greece', () => {
  it('Athens sells marble and Troy timber; no other city buys or sells either', () => {
    const w = new Sim().state.world;
    const m = tradeIndex(MARBLE);
    const t = tradeIndex(TIMBER);
    expect(m).toBeGreaterThanOrEqual(0);
    expect(t).toBeGreaterThanOrEqual(0);
    for (const c of w.cities) {
      if (!c.ruler) continue;
      const { sells, buys } = sellsAndBuys(c);
      expect(sells.includes(m), c.id).toBe(c.id === 'athens');
      expect(sells.includes(t), c.id).toBe(c.id === 'troy');
      expect(buys.includes(m) || buys.includes(t), c.id).toBe(false);
    }
  });
});
