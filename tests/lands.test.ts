/**
 * Lands of any size (slice 42): the land in the state, the generated
 * sheltered bay at every size, checked playable by the game's own rules; the
 * Bay exactly as before; saves of a generated land, and saves from before.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { bakeCoast, coastMap, type CoastMap } from '../src/map/bake';
import { generateCoast } from '../src/map/generate';
import { landCheck } from '../src/map/landcheck';
import { BAY, LAND_SIZES, landMap, landOf, landProblem, mapOf, sizeOf, type Land } from '../src/map/lands';
import { districtGrid } from '../src/map/districts';
import { buildingRefusal, mapIndex, tileCopper } from '../src/sim/build';
import { tileMarble } from '../src/sim/materials';
import { berthAt, quayTiles, sailable, shipAt, SHIP_COMING, SHIP_MOORED } from '../src/sim/trade';
import { migrate } from '../src/sim/migrate';
import { createState, serialize, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION } from '../src/sim/state';
import { decodeSave, encodeSave } from '../src/game/saves';

const sheltered = (size: number, seed: number): Land => ({ kind: 'sheltered', size, seed });
const sha = (a: ArrayLike<number> & { buffer: ArrayBufferLike; byteOffset: number; byteLength: number }): string =>
  createHash('sha1').update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)).digest('hex').slice(0, 12);

/** A baked map's every array, hashed. */
function hashes(map: CoastMap): Record<string, string | number> {
  const n = map.size;
  const cu = new Float32Array(n * n);
  const ma = new Float32Array(n * n);
  for (let t = 0; t < n * n; t++) {
    cu[t] = tileCopper(map, t);
    ma[t] = tileMarble(map, t);
  }
  return {
    heights: sha(map.heights),
    fertility: sha(map.fertility),
    rock: sha(map.rock),
    shore: sha(map.shore),
    tileWater: sha(map.tileWater),
    tileFertility: sha(map.tileFertility),
    riverXs: sha(map.river.xs),
    riverSurface: sha(map.river.surface),
    trees: createHash('sha1').update(JSON.stringify(map.trees)).digest('hex').slice(0, 12),
    treeCount: map.trees.length,
    copper: sha(cu),
    marble: sha(ma),
    districts: sha(districtGrid(map)),
    ground: sha(mapIndex(map).ground),
    quays: sha(quayTiles(map)),
  };
}

describe('the Bay', () => {
  it('bakes bit for bit as it did before slice 42 (every array, the trees, and the grids the sim derives)', () => {
    // Taken at 53e5bb4, the commit this slice started from.
    expect(hashes(coastMap())).toEqual({
      heights: '9262e5f48307',
      fertility: '6d5b6ab22d07',
      rock: 'ce6252b1f204',
      shore: '6c1b2ae03be1',
      tileWater: '4397e146a19e',
      tileFertility: 'ac20f3c2cab6',
      riverXs: 'a71f6f489d2c',
      riverSurface: '050b95b9b78f',
      trees: '4cf4648e3f14',
      treeCount: 4011,
      copper: '1a012445c308',
      marble: 'a2aff5940877',
      districts: '69ca3e4ae712',
      ground: '80978d5afa80',
      quays: '509188c85a45',
    });
  });

  it('is the land of a state with none, and of a new game', () => {
    expect(landOf({})).toBe(BAY);
    expect(sizeOf({})).toBe(128);
    expect(mapOf({})).toBe(coastMap());
    const s = createState(1);
    expect(s.land).toEqual({ kind: 'bay', size: 128, seed: 0 });
    expect(s.tiles.length).toBe(128 * 128);
  });
});

describe('a generated sheltered bay', () => {
  it('is the same land from the same size and seed, and another from another seed', () => {
    for (const size of LAND_SIZES) {
      expect(JSON.stringify(generateCoast('sheltered', size, 7))).toBe(JSON.stringify(generateCoast('sheltered', size, 7)));
      expect(JSON.stringify(generateCoast('sheltered', size, 7))).not.toBe(JSON.stringify(generateCoast('sheltered', size, 8)));
    }
    const a = bakeCoast(generateCoast('sheltered', 192, 5));
    const b = bakeCoast(generateCoast('sheltered', 192, 5));
    expect(a.size).toBe(192);
    expect(hashes(a)).toEqual(hashes(b));
    expect(() => generateCoast('volcano', 128, 1)).toThrow();
  });

  it('bakes a large land in a few seconds at most, even on a loaded machine (the page measures the real time)', () => {
    const t0 = performance.now();
    const map = bakeCoast(generateCoast('sheltered', 256, 99));
    const ms = performance.now() - t0;
    expect(map.size).toBe(256);
    expect(ms).toBeLessThan(6000);
  });

  // Every seed tried at every size: room for a city, the roads in from three edges, and somewhere for each kind of work.
  const tries: Array<[number, number[]]> = [
    [128, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]],
    [192, [1, 2, 3, 4, 5, 6]],
    [256, [1, 2, 3, 4]],
  ];
  for (const [size, seeds] of tries) {
    it(`is playable at ${size} tiles, on every seed tried`, () => {
      for (const seed of seeds) {
        const land = sheltered(size, seed);
        const s = createState(1, 'coast', 1, land);
        const map = mapOf(s);
        expect(map.size).toBe(size);
        expect(s.tiles.length).toBe(size * size);
        const rep = landCheck(map, s);
        expect([seed, rep.problems]).toEqual([seed, []]);
        expect(rep.room).toBeGreaterThan(size * size * 0.4);
      }
    }, 120_000);
  }

  it('the playability check turns a land down when the game would (here, a trading post already built: only one per town)', () => {
    const sim = new Sim();
    expect(landCheck(sim.map, sim.state).ok).toBe(true);
    sim.enqueue({ type: 'build', kind: 'trading', at: [69 * 128 + 73] });
    sim.flush();
    const rep = landCheck(sim.map, sim.state);
    expect(rep.ok).toBe(false);
    expect(rep.problems).toEqual(['nowhere for a trading post the roads in reach']);
  });
});

describe('founding on a land', () => {
  it('founds a town on a generated land, plays the same twice, and keeps the land', () => {
    const land = sheltered(192, 3);
    const a = new Sim(1, 1, land);
    const b = new Sim(1, 1, land);
    expect(a.map.size).toBe(192);
    const spot = landCheck(a.map, a.state).spots.farm;
    for (const sim of [a, b]) {
      sim.enqueue({ type: 'build', kind: 'farm', at: [spot] });
      sim.run(600);
    }
    expect(a.state.buildings.some((x) => x.kind === 'farm')).toBe(true);
    expect(serialize(a.state)).toEqual(serialize(b.state));
    // found() starts again on another land.
    a.found(sheltered(256, 4));
    expect(a.state.tick).toBe(0);
    expect(a.map.size).toBe(256);
    expect(a.state.land).toEqual(sheltered(256, 4));
    expect(a.state.buildings).toEqual([]);
  });

  it('a ship sails in from beyond a large land’s edge, on deep water, to the berth', () => {
    const land = sheltered(256, 2);
    const sim = new Sim(1, 1, land);
    const s = sim.state;
    const map = sim.map;
    const n = map.size;
    const at = landCheck(map, s).spots.trading;
    const x = at % n;
    const z = Math.floor(at / n);
    expect(buildingRefusal(map, s, 'trading', x, z)).toBe('');
    sim.enqueue({ type: 'build', kind: 'trading', at: [at] });
    sim.flush();
    sim.step();
    const ship = s.trade.ship;
    sim.run(ship.due - s.tick - 1);
    expect(ship.phase).toBe(SHIP_COMING);
    const first = shipAt(ship, ship.since, n)!;
    // She shows beyond the edge of this land (not the Bay's).
    expect(first.x < 0 || first.z > n || first.x > n).toBe(true);
    let last = first;
    for (let t = ship.since; t <= ship.due; t += 0.5) {
      const p = shipAt(ship, t, n)!;
      expect(sailable(map, p.x, p.z)).toBe(true);
      expect(p.inward).toBeGreaterThanOrEqual(last.inward);
      expect(Math.hypot(p.x - last.x, p.z - last.z)).toBeLessThan(4);
      last = p;
    }
    sim.run(2);
    expect(ship.phase).toBe(SHIP_MOORED);
    const berth = berthAt(map, x, z)!;
    const moored = shipAt(ship, s.tick + 0.5, n)!;
    expect([moored.x, moored.z]).toEqual([berth.x, berth.z]);
  }, 120_000);
});

describe('saves and lands', () => {
  it('a town on a large land saves and loads on the same land, and plays on the same', () => {
    const land = sheltered(256, 1);
    const sim = new Sim(5, 5, land);
    const spot = landCheck(sim.map, sim.state).spots.farm;
    sim.enqueue({ type: 'build', kind: 'farm', at: [spot] });
    sim.run(300);
    const d = decodeSave(encodeSave(sim.state, 1));
    if (!d.ok) throw new Error(d.why);
    expect(d.file.state.land).toEqual(land);
    expect(d.file.state.tiles.length).toBe(256 * 256);
    const again = new Sim(5, 5, land);
    again.state = d.file.state;
    sim.run(300);
    again.run(300);
    expect(serialize(again.state)).toEqual(serialize(sim.state));
  }, 120_000);

  it('refuses a save on a land this game can’t make, saying so', () => {
    const sim = new Sim(5, 5, sheltered(128, 2));
    const text = encodeSave(sim.state, 1);
    for (const [land, why] of [
      [{ kind: 'volcano', size: 128, seed: 2 }, /kind of land/],
      [{ kind: 'sheltered', size: 100, seed: 2 }, /size/],
      [{ kind: 'sheltered', size: 128, seed: -1 }, /seed/],
      [{ kind: 'bay', size: 256, seed: 0 }, /land/],
    ] as const) {
      const g = JSON.parse(text);
      g.state.land = land;
      const d = decodeSave(JSON.stringify(g));
      expect(d.ok).toBe(false);
      if (!d.ok) expect(d.why).toMatch(why);
    }
    expect(landProblem(BAY)).toBe('');
    expect(landProblem(sheltered(256, 0xffffffff))).toBe('');
  });

  it('the migration step puts a town from before on the Bay, and nothing else changes', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/slice40-ship.save.json.gz')).toString();
    const st = JSON.parse(text).state;
    // (The trunk's version when slice 42 began, a literal: another line's slice may merge between.)
    expect(st.version).toBe(37);
    expect(st.land).toBeUndefined();
    const before = JSON.stringify({ ...st, version: 0 });
    const from = migrate(st);
    expect(from).toBe(37);
    expect(st.land).toEqual({ kind: 'bay', size: 128, seed: 0 });
    const { land: _land, ...rest } = st;
    expect(JSON.stringify({ ...rest, version: 0 })).toBe(before);
  });

  it('a #ship save from before slice 42 (state version 37) loads on the Bay, plays on, and round-trips', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/slice40-ship.save.json.gz')).toString();
    const d = decodeSave(text);
    if (!d.ok) throw new Error(d.why);
    expect(d.file.from).toBe(37);
    const st = d.file.state;
    expect(st.version).toBe(SIM_STATE_VERSION);
    expect(st.land).toEqual(BAY);
    expect(mapOf(st)).toBe(landMap(BAY));
    const sim = new Sim();
    sim.state = st;
    const people = st.population;
    sim.run(600);
    expect(sim.state.population).toBeGreaterThan(people * 0.8);
    const back = decodeSave(encodeSave(sim.state, 2));
    if (!back.ok) throw new Error(back.why);
    const again = new Sim();
    again.state = back.file.state;
    sim.run(300);
    again.run(300);
    expect(serialize(again.state)).toEqual(serialize(sim.state));
  }, 120_000);
});
