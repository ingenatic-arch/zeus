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
// Slice 46
import { LAND_KINDS, seedOf, stampLand } from '../src/map/lands';
import { LAND_GEN } from '../src/map/generate';
import { roadsIn } from '../src/map/landcheck';
import { roadRefusal, wellWater } from '../src/sim/build';
import { WATER_NONE } from '../src/map/bake';
import { districtGrid } from '../src/map/districts';
import { buildingRefusal, mapIndex, tileCopper } from '../src/sim/build';
import { tileMarble } from '../src/sim/materials';
import { berthAt, quayTiles, sailable, shipAt, SHIP_COMING, SHIP_MOORED } from '../src/sim/trade';
import { migrate } from '../src/sim/migrate';
import { createState, serialize, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION } from '../src/sim/state';
import { decodeSave, encodeSave } from '../src/game/saves';
import { DEMOS } from '../src/game/demos';
import { TILE_ROAD } from '../src/sim/state';

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
    // (Slice 46: stamped with the edition of the generator that made it.)
    expect(a.state.land).toEqual({ ...sheltered(256, 4), gen: LAND_GEN });
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
    expect(d.file.state.land).toEqual(stampLand(land));
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
    // (Merge of slice 42: slices 43, 41 and 44 merged first, so slice 42's step is the one from version 40. The save is
    // brought up through theirs first, then this step alone is checked: it adds the land and changes nothing else.)
    migrate(st);
    delete st.land;
    st.version = 40;
    const before = JSON.stringify({ ...st, version: 0 });
    const from = migrate(st);
    expect(from).toBe(40);
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

describe('the land demos', () => {
  for (const [name, size] of [
    ['landsmall', 128],
    ['landmedium', 192],
    ['landlarge', 256],
  ] as const) {
    it(`#${name} founds a new city on a ${size}-tile land, with a road in from the west edge towards the bay`, () => {
      const sim = new Sim();
      DEMOS[name].setup!(sim);
      const s = sim.state;
      expect(s.land?.size).toBe(size);
      expect(s.land?.kind).toBe('sheltered');
      expect(s.buildings).toEqual([]);
      const site = sim.map.data.site!;
      const roads = s.tiles.flatMap((v, t) => (v === TILE_ROAD ? [t] : []));
      expect(roads.some((t) => t % size === 0)).toBe(true);
      expect(roads.some((t) => Math.abs((t % size) - site.x) < 2 && Math.abs(Math.floor(t / size) - site.z) < 16)).toBe(true);
      expect(s.season.on).toBe(true);
      expect(s.crime.on).toBe(true);
    }, 120_000);
  }
});

// Slice 46
describe('many lands', () => {
  const KINDS = LAND_KINDS.filter((k) => k !== 'bay');

  it('every kind is the same land from the same size and seed, and another from another seed', () => {
    for (const kind of KINDS) {
      for (const size of [128, 256]) {
        const a = JSON.stringify(generateCoast(kind, size, 11));
        expect(a).toBe(JSON.stringify(generateCoast(kind, size, 11)));
        expect(a).not.toBe(JSON.stringify(generateCoast(kind, size, 12)));
      }
    }
    // Each kind is its own land, not another's from the same seed.
    const all = KINDS.map((k) => JSON.stringify(generateCoast(k, 192, 5)));
    expect(new Set(all).size).toBe(KINDS.length);
  });

  it('slice 42’s sheltered bay is kept as the first edition, bit for bit (taken at 87f8476), and a new land is the second', () => {
    const one = (size: number, seed: number): Land => ({ kind: 'sheltered', size, seed, gen: 1 });
    expect(hashes(bakeCoast(generateCoast('sheltered', 128, 1, 1)))).toEqual({
      heights: '6c7428512648',
      fertility: '9dd68ea689b9',
      rock: '7b761f68727d',
      shore: '9b33f8a811fa',
      tileWater: '4181744898d8',
      tileFertility: '9d0792d8643f',
      riverXs: '0a52968241c5',
      riverSurface: '0b31b2f95bde',
      trees: 'dcd0b33da4a4',
      treeCount: 4243,
      copper: '2fe32546a63d',
      marble: '0acf57f46cdf',
      districts: '80f5f8be11e0',
      ground: '4add30e6bf91',
      quays: '6b13653f0782',
    });
    expect(hashes(landMap(one(192, 4))).heights).toBe('9471992bd814');
    expect(createState(1, 'coast', 1, sheltered(128, 1)).land).toEqual({ ...sheltered(128, 1), gen: LAND_GEN });
    expect(createState(1, 'coast', 1, one(128, 1)).land).toEqual(one(128, 1));
    expect(createState(1).land).toEqual(BAY);
    expect(landProblem(one(128, 1))).toBe('');
    expect(landProblem({ kind: 'delta', size: 128, seed: 1, gen: 1 })).not.toBe('');
    expect(landProblem({ kind: 'delta', size: 128, seed: 1, gen: LAND_GEN + 1 })).toMatch(/newer/);
    expect(() => generateCoast('delta', 128, 1, 1)).toThrow();
  });

  it('a seed is a word: any case, letters and digits only, the same word always the same land', () => {
    expect(seedOf('Heron')).toBe(seedOf('heron'));
    expect(seedOf('he ron!')).toBe(seedOf('heron'));
    expect(seedOf('heron')).not.toBe(seedOf('herons'));
    expect(Number.isInteger(seedOf('heron')) && seedOf('heron') >= 0).toBe(true);
  });

  it('bakes a large land of every kind in a few seconds at most, even on a loaded machine (the page measures the real time)', () => {
    for (const kind of KINDS) {
      const t0 = performance.now();
      const map = bakeCoast(generateCoast(kind, 256, 99));
      const ms = performance.now() - t0;
      expect(map.size).toBe(256);
      expect([kind, ms < 6000]).toEqual([kind, true]);
    }
  }, 120_000);

  // Every kind at every size, over many seeds (more by hand while tuning): room for a city, roads in from three edges, somewhere for each kind of work,
  // and the road in from the nearest edge to where the city starts, every tile of it one the game lays.
  const tries: Array<[number, number[]]> = [
    [128, [1, 2, 3, 4, 5, 6]],
    [192, [1, 2, 3]],
    [256, [1, 2]],
  ];
  for (const kind of KINDS) {
    for (const [size, seeds] of tries) {
      it(`a ${kind} is playable at ${size} tiles, on every seed tried, with its road in`, () => {
        for (const seed of seeds) {
          const land: Land = { kind, size, seed };
          const sim = new Sim(1, 1, land);
          const map = sim.map;
          const rep = landCheck(map, sim.state);
          expect([kind, size, seed, rep.problems]).toEqual([kind, size, seed, []]);
          const r = roadsIn(map, sim.state);
          expect(r.road.length).toBeGreaterThan(0);
          // (From an edge, short: the far-roads finding was a walk of months on a large land.)
          const [first] = r.road;
          const fx = first % size;
          const fz = Math.floor(first / size);
          expect(fx === 0 || fx === size - 1 || fz === 0).toBe(true);
          expect(r.road.length).toBeLessThan(110);
          const last = r.road[r.road.length - 1];
          const site = map.data.site!;
          expect(Math.hypot((last % size) + 0.5 - site.x, Math.floor(last / size) + 0.5 - site.z)).toBeLessThan(12);
          sim.enqueue({ type: 'road', tiles: r.road });
          sim.flush();
          const laid = sim.state.tiles.filter((v) => v === TILE_ROAD).length;
          expect([seed, laid]).toEqual([seed, new Set(r.road).size]);
        }
      }, 300_000);
    }
  }

  it('a town on every kind saves and loads on the same land, and the land bakes the same again', () => {
    for (const kind of KINDS) {
      const land: Land = { kind, size: 128, seed: 3 };
      const sim = new Sim(5, 5, land);
      const spot = landCheck(sim.map, sim.state).spots.farm;
      sim.enqueue({ type: 'build', kind: 'farm', at: [spot] });
      sim.run(120);
      const d = decodeSave(encodeSave(sim.state, 1));
      if (!d.ok) throw new Error(d.why);
      expect(d.file.state.land).toEqual({ ...land, gen: LAND_GEN });
      expect(hashes(bakeCoast(generateCoast(kind, 128, 3)))).toEqual(hashes(mapOf(d.file.state)));
      const again = new Sim(5, 5, land);
      again.state = d.file.state;
      sim.run(120);
      again.run(120);
      expect(serialize(again.state)).toEqual(serialize(sim.state));
    }
  }, 300_000);

  it('on the dry plain a fountain needs water under the ground (by the river, a spring or the shore), and says so; elsewhere it goes anywhere', () => {
    const sim = new Sim(1, 1, { kind: 'dryplain', size: 128, seed: 2 });
    const map = sim.map;
    const s = sim.state;
    const n = map.size;
    expect(map.groundwater).not.toBeNull();
    let dry = -1;
    let wet = -1;
    for (let t = 0; t < n * n && (dry < 0 || wet < 0); t++) {
      const x = t % n;
      const z = Math.floor(t / n);
      if (map.tileWater[t] !== WATER_NONE || roadRefusal(map, s, x, z) !== '') continue;
      const r = buildingRefusal(map, s, 'fountain', x, z);
      if (dry < 0 && !wellWater(map, x, z, 1)) {
        expect(r).toMatch(/Too dry for a fountain/);
        dry = t;
      }
      if (wet < 0 && wellWater(map, x, z, 1) && r === '') wet = t;
    }
    expect(dry).toBeGreaterThanOrEqual(0);
    expect(wet).toBeGreaterThanOrEqual(0);
    // Most of the plain is dry, but not all of it.
    let under = 0;
    for (let t = 0; t < n * n; t++) under += map.groundwater![t];
    expect(under).toBeGreaterThan(n * n * 0.1);
    expect(under).toBeLessThan(n * n * 0.6);
    for (const kind of ['delta', 'woods', 'sheltered'] as const) expect(landMap({ kind, size: 128, seed: 2 }).groundwater).toBeNull();
    expect(coastMap().groundwater).toBeNull();
  });

  it('the migration step marks a generated land from before as the first edition, and changes nothing else', () => {
    const st = createState(1, 'coast', 1, sheltered(128, 1)) as unknown as Record<string, unknown>;
    const plain = JSON.parse(JSON.stringify(st));
    delete plain.land.gen;
    plain.version = 41;
    const before = JSON.stringify({ ...plain, land: null, version: 0 });
    expect(migrate(plain)).toBe(41);
    expect(plain.land).toEqual({ ...sheltered(128, 1), gen: 1 });
    expect(plain.version).toBe(42);
    expect(JSON.stringify({ ...plain, land: null, version: 0 })).toBe(before);
    // The Bay, and a land already stamped, as they were.
    const bay = JSON.parse(JSON.stringify(createState(1)));
    bay.version = 41;
    migrate(bay);
    expect(bay.land).toEqual(BAY);
    const stamped = JSON.parse(JSON.stringify(st));
    stamped.version = 41;
    migrate(stamped);
    expect(stamped.land.gen).toBe(LAND_GEN);
    expect(SIM_STATE_VERSION).toBeGreaterThanOrEqual(42);
  });

  for (const [name, kind] of [
    ['delta', 'delta'],
    ['dryplain', 'dryplain'],
    ['islands', 'islands'],
    ['mountains', 'mountains'],
    ['woods', 'woods'],
    ['sheltered', 'sheltered'],
  ] as const) {
    it(`#${name} founds a new city on a ${kind}, its road in laid from the nearest edge`, () => {
      const sim = new Sim();
      DEMOS[name].setup!(sim);
      const s = sim.state;
      expect(s.land?.kind).toBe(kind);
      expect(s.land?.gen).toBe(LAND_GEN);
      expect(s.buildings).toEqual([]);
      const roads = s.tiles.flatMap((v, t) => (v === TILE_ROAD ? [t] : []));
      expect(roads.length).toBeGreaterThan(20);
      const n = sim.map.size;
      expect(roads.some((t) => t % n === 0 || t % n === n - 1 || t < n)).toBe(true);
    }, 120_000);
  }
});
