/**
 * Slice 25: walls, gates and towers. Paths round walls and through gates,
 * raiders breaking in (and the cheapest way in), towers shooting, fights at
 * the wall, the ledger and undo, saves and determinism mid-siege, and the
 * migration of a slice 24 save. Every siege here is `#battle`'s town (Sparta's
 * band of 29, ten days from the west edge) with a wall drawn on its west side:
 * up the east bank of the river at x = 40, with a gate where the west road
 * crosses it (40, 41), just past the bridge.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { dhypot } from '../src/map/dmath';
import { buildingRefusal } from '../src/sim/build';
import { centreOf, findBuilding } from '../src/sim/buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { raidersOf } from '../src/sim/raids';
import { deserialize, serialize, Sim, undoRefusal } from '../src/sim/sim';
import { migrate } from '../src/sim/migrate';
import { SIM_STATE_VERSION, TILE_ROAD, TILE_WALL, type Building, type Raid, type SimState } from '../src/sim/state';
import { totals } from '../src/sim/treasury';
import { offRoadPath } from '../src/sim/wild';
import { fullOf, GATE_COST, GATE_HP, TOWER_RANGE, WALL_COST, WALL_HP, wallAt, wallJob } from '../src/sim/walls';
import { TOWER_COST } from '../src/sim/build';
import { demoSim } from './prepared';

const N = 128;
const tile = (x: number, z: number): number => z * N + x;
let made = '';
const fresh = (): Sim => {
  if (!made) made = serialize(demoSim('battle').state);
  const sim = new Sim();
  sim.state = deserialize(made);
  return sim;
};
const send = (sim: Sim, c: Parameters<Sim['enqueue']>[0]): void => {
  sim.enqueue(c);
  sim.flush();
};
const until = (sim: Sim, ok: () => boolean, most: number): boolean => {
  for (let i = 0; i < most && !ok(); i++) sim.step();
  return ok();
};
const ledgerAddsUp = (s: SimState): void => expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);
const line = (x: number, z0: number, z1: number): number[] => Array.from({ length: z1 - z0 + 1 }, (_, i) => tile(x, z0 + i));

/** The west gate, where the west road crosses the wall just past the bridge. */
const GATE = tile(40, 41);
/** Towers either side of the gate's road: north of it inside the wall, and north of it outside (both beside the road, so archers reach them). */
const TOWER_IN: [number, number] = [41, 39];
const TOWER_OUT: [number, number] = [38, 39];

/** #battle's town with the wall up the east bank (x = 40, from the hills to the river's bend) and, if asked, its two gate towers staffed. */
function walled(towers = false): { sim: Sim; s: SimState; r: Raid } {
  const sim = fresh();
  const s = sim.state;
  send(sim, { type: 'wall', tiles: line(40, 12, 45) });
  if (towers) {
    for (const [x, z] of [TOWER_IN, TOWER_OUT]) send(sim, { type: 'build', kind: 'tower', at: [tile(x, z)] });
    sim.run(TICKS_PER_DAY + 1);
  }
  const r = s.world.raids.find((x) => x.city === 'sparta' && x.ended === 0)!;
  return { sim, s, r };
}
const towersOf = (s: SimState): Building[] => s.buildings.filter((b) => b.kind === 'tower');
const fallen = (_s: SimState, r: Raid): number => r.fallen;

describe('drawing walls', () => {
  it('a drag lays a stretch on each tile of dry ground and a gate on the road, for their price on the building line; undo takes it all back', () => {
    const sim = fresh();
    const s = sim.state;
    const before = s.money;
    send(sim, { type: 'wall', tiles: line(40, 12, 45) });
    const gates = s.walls.filter((p) => p.gate);
    expect(gates.map((p) => p.t)).toEqual([GATE]);
    expect(s.tiles[GATE]).toBe(TILE_ROAD);
    const stretches = s.walls.filter((p) => !p.gate);
    expect(stretches.length).toBeGreaterThan(15);
    for (const p of stretches) expect(s.tiles[p.t]).toBe(TILE_WALL);
    for (const p of s.walls) expect(p.hp).toBe(p.gate ? GATE_HP : WALL_HP);
    expect(before - s.money).toBe(stretches.length * WALL_COST + GATE_COST);
    const out = s.ledger.now.filter((l) => l.kind === 'building');
    expect(out.find((l) => l.what === 'wall')).toMatchObject({ amount: -stretches.length * WALL_COST, n: stretches.length });
    expect(out.find((l) => l.what === 'gate')).toMatchObject({ amount: -GATE_COST, n: 1 });
    ledgerAddsUp(s);
    // (Water, the hills and the buildings are skipped: the wall is in the list in tile order, once each.)
    for (let i = 1; i < s.walls.length; i++) expect(s.walls[i].t).toBeGreaterThan(s.walls[i - 1].t);
    // A tower on the line, beside the road, for its price.
    const m = s.money;
    expect(buildingRefusal(sim.map, s, 'tower', ...TOWER_IN)).toBe('');
    expect(buildingRefusal(sim.map, s, 'tower', 50, 20)).toMatch(/on a wall/);
    send(sim, { type: 'build', kind: 'tower', at: [tile(...TOWER_IN)] });
    expect(m - s.money).toBe(TOWER_COST);
    ledgerAddsUp(s);
    send(sim, { type: 'undo' });
    expect(s.money).toBe(m);
    send(sim, { type: 'undo' });
    expect(s.money).toBe(before);
    expect(s.walls).toEqual([]);
    expect(s.tiles[GATE]).toBe(TILE_ROAD);
    for (const t of stretches) expect(s.tiles[t.t]).toBe(0);
    ledgerAddsUp(s);
  }, 60000);

  it('a walker across country never steps on a wall: round its end or through its gate', () => {
    const { sim, s } = walled();
    const way = offRoadPath(sim.map, s, [tile(38, 30)], tile(44, 30));
    expect(way).not.toBeNull();
    for (const t of way!) expect(s.tiles[t]).not.toBe(TILE_WALL);
    expect(way!.length).toBeGreaterThan(8);
    // With no wall it walks straight across.
    const open = offRoadPath(sim.map, fresh().state, [tile(38, 30)], tile(44, 30));
    expect(open!.length).toBeLessThan(10);
  }, 60000);
});

describe('raiders and walls', () => {
  it('the band breaks the gate rather than going far round, in about twelve days; it is rubble, and the band goes on and home through it', () => {
    const { sim, s, r } = walled();
    expect(until(sim, () => r.siege === GATE, 2 * TICKS_PER_MONTH)).toBe(true);
    const band = raidersOf(s, r)!;
    expect(until(sim, () => s.army.foes.some((f) => f.raid === r.id && f.swung === s.tick), 2 * TICKS_PER_MONTH)).toBe(true);
    const start = s.tick;
    const gate = wallAt(s, GATE)!;
    expect(gate.hp).toBeGreaterThan(GATE_HP * 0.9);
    expect(until(sim, () => gate.hp <= 0, TICKS_PER_MONTH)).toBe(true);
    const took = (s.tick - start) / TICKS_PER_DAY;
    expect(took).toBeGreaterThan(9);
    expect(took).toBeLessThan(15);
    expect(r.breaches).toBe(1);
    sim.step();
    expect(r.siege).toBeLessThan(0);
    expect(wallAt(s, GATE)!.hp).toBe(0);
    expect(s.tiles[GATE]).toBe(TILE_ROAD);
    expect(s.army.news.some((n) => /broken through the gate/.test(n.line))).toBe(true);
    // On to its target, and home again through the breach without breaking anything more.
    expect(until(sim, () => band.wait > 0, TICKS_PER_MONTH)).toBe(true);
    expect(until(sim, () => r.phase !== 'raiding', 2 * TICKS_PER_MONTH)).toBe(true);
    expect(r.breaches).toBe(1);
    expect(s.walls.filter((p) => p.hp < fullOf(p)).map((p) => p.t)).toEqual([GATE]);
    // The rubble redrawn stands again, for the gate's price.
    const m = s.money;
    send(sim, { type: 'wall', tiles: [GATE] });
    expect(wallAt(s, GATE)!.hp).toBe(GATE_HP);
    expect(m - s.money).toBe(GATE_COST);
    expect(s.ledger.now.some((l) => l.kind === 'building' && l.what === 'mended')).toBe(true);
    ledgerAddsUp(s);
  }, 120000);

  it('the band goes round the end of a short wall, breaking nothing', () => {
    const sim = fresh();
    const s = sim.state;
    // Across its way in from the west edge, a few tiles long.
    send(sim, { type: 'wall', tiles: line(18, 42, 50) });
    expect(s.walls.length).toBeGreaterThan(5);
    const r = s.world.raids.find((x) => x.city === 'sparta' && x.ended === 0)!;
    expect(until(sim, () => !!raidersOf(s, r) && raidersOf(s, r)!.wait > 0, 2 * TICKS_PER_MONTH)).toBe(true);
    expect(r.breaches).toBe(0);
    for (const p of s.walls) expect(p.hp).toBe(fullOf(p));
  }, 120000);

  it('across a long wall with no gate, the band makes for a cracked stretch rather than a whole one', () => {
    const sim = fresh();
    const s = sim.state;
    send(sim, { type: 'wall', tiles: line(18, 4, 100) });
    expect(s.walls.some((p) => p.gate)).toBe(true);
    // (The west road's gate is left whole, the stretch beside the band's way in cracked.)
    const cracked = wallAt(s, tile(18, 46))!;
    expect(cracked.gate).toBe(false);
    cracked.hp = WALL_HP / 6;
    const r = s.world.raids.find((x) => x.city === 'sparta' && x.ended === 0)!;
    expect(until(sim, () => r.siege >= 0, 2 * TICKS_PER_MONTH)).toBe(true);
    expect(r.siege).toBe(tile(18, 46));
    expect(until(sim, () => cracked.hp <= 0, TICKS_PER_MONTH)).toBe(true);
    expect(s.tiles[tile(18, 46)]).toBe(0);
    expect(r.breaches).toBe(1);
  }, 120000);
});

describe('the review of slice 25', () => {
  it('a wall all along the edge of the map does not turn the band away: it breaks in through it', () => {
    const sim = fresh();
    const s = sim.state;
    s.money += 5000;
    send(sim, { type: 'wall', tiles: line(0, 0, N - 1) });
    expect(s.walls.length).toBeGreaterThan(40);
    const r = s.world.raids.find((x) => x.city === 'sparta' && x.ended === 0)!;
    expect(until(sim, () => r.phase !== 'marching' && r.phase !== 'gathering', 2 * TICKS_PER_MONTH)).toBe(true);
    expect(r.phase).toBe('raiding');
    expect(r.siege % N).toBe(0);
    expect(until(sim, () => r.breaches > 0, 2 * TICKS_PER_MONTH)).toBe(true);
    expect(wallAt(s, r.edge)!.hp).toBe(0);
  }, 120000);

  it('a gate under the rams can’t be mended until the band has gone', () => {
    const { sim, s, r } = walled();
    expect(until(sim, () => r.siege === GATE && s.army.foes.some((f) => f.raid === r.id && f.swung === s.tick), 2 * TICKS_PER_MONTH)).toBe(true);
    sim.run(2 * TICKS_PER_DAY);
    const gate = wallAt(s, GATE)!;
    const hp = gate.hp;
    expect(hp).toBeLessThan(GATE_HP);
    expect(wallJob(sim.map, s, GATE)).toMatchObject({ what: 'none', why: expect.stringMatching(/hammering/) });
    const m = s.money;
    send(sim, { type: 'wall', tiles: [GATE] });
    expect(gate.hp).toBeLessThanOrEqual(hp);
    expect(s.money).toBeGreaterThanOrEqual(m - 1);
  }, 120000);

  it('undo doesn’t hand back the price of a wall raiders have cracked', () => {
    const sim = fresh();
    const s = sim.state;
    const before = s.money;
    send(sim, { type: 'wall', tiles: line(40, 12, 45) });
    wallAt(s, GATE)!.hp = GATE_HP / 2;
    expect(undoRefusal(s)).toMatch(/cracked/);
    send(sim, { type: 'undo' });
    expect(s.walls.length).toBeGreaterThan(15);
    expect(s.money).toBeLessThan(before);
    ledgerAddsUp(s);
  }, 60000);

  it('a version 24 save from the loans’ own line of work (loans, no walls) loads with no walls', () => {
    const st = JSON.parse(serialize(fresh().state)) as Record<string, unknown>;
    delete st.walls;
    for (const r of (st.world as { raids: Array<Record<string, unknown>> }).raids) {
      delete r.siege;
      delete r.breaches;
    }
    st.version = 24;
    expect(migrate(st)).toBe(24);
    expect(st.version).toBe(SIM_STATE_VERSION);
    expect(st.walls).toEqual([]);
    for (const r of (st.world as { raids: Array<Record<string, unknown>> }).raids) expect(r.siege).toBe(-1);
  }, 60000);
});

describe('towers', () => {
  it('staffed towers either side of the gate shoot the band while it hammers, only within range; men fall', () => {
    const { sim, s, r } = walled(true);
    const towers = towersOf(s);
    expect(towers.map((b) => b.workers)).toEqual([4, 4]);
    expect(until(sim, () => r.siege === GATE && s.army.foes.some((f) => f.raid === r.id && f.swung === s.tick), 2 * TICKS_PER_MONTH)).toBe(true);
    let shots = 0;
    const seen = new Set<unknown>();
    until(
      sim,
      () => {
        for (const a of s.army.arrows) {
          if (a.h0 === undefined || seen.has(a)) continue;
          seen.add(a);
          shots++;
          const d = Math.min(...towers.map((b) => dhypot(a.x1 - centreOf(b)[0], a.z1 - centreOf(b)[1])));
          expect(d).toBeLessThan(TOWER_RANGE + 1.5);
        }
        return (wallAt(s, GATE)?.hp ?? 0) <= 0;
      },
      TICKS_PER_MONTH,
    );
    expect(shots).toBeGreaterThan(20);
    expect(fallen(s, r)).toBeGreaterThanOrEqual(3);
  }, 120000);

  it('a tower with no road beside it gets no archers and shoots nothing', () => {
    const sim = fresh();
    const s = sim.state;
    send(sim, { type: 'wall', tiles: line(40, 12, 45) });
    send(sim, { type: 'build', kind: 'tower', at: [tile(41, 36)] });
    const r = s.world.raids.find((x) => x.city === 'sparta' && x.ended === 0)!;
    expect(towersOf(s).length).toBe(1);
    until(sim, () => r.siege === GATE && s.army.foes.some((f) => f.raid === r.id && f.swung === s.tick), 2 * TICKS_PER_MONTH);
    sim.run(3 * TICKS_PER_DAY);
    expect(towersOf(s)[0].workers).toBe(0);
    expect(s.army.arrows.some((a) => a.h0 !== undefined)).toBe(false);
    expect(fallen(s, r)).toBe(0);
  }, 120000);
});

describe('fights at the wall', () => {
  it('archers behind the wall wear the band down at the gate, and none of them is touched before it breaks', () => {
    const { sim, s, r } = walled();
    const arc = s.army.companies.find((c) => c.kind === 'archer')!;
    send(sim, { type: 'banner', company: arc.id, tile: tile(43, 38) });
    expect(until(sim, () => r.siege === GATE && s.army.foes.some((f) => f.raid === r.id && f.swung === s.tick), 2 * TICKS_PER_MONTH)).toBe(true);
    until(sim, () => (wallAt(s, GATE)?.hp ?? 0) <= 0, TICKS_PER_MONTH);
    expect(s.army.soldiers.filter((x) => x.company === arc.id && x.state !== 'ready').length).toBe(0);
    expect(fallen(s, r)).toBeGreaterThan(0);
    // Nobody stood on the wall.
    for (const f of s.army.foes) expect(s.tiles[Math.floor(f.z) * N + Math.floor(f.x)]).not.toBe(TILE_WALL);
  }, 120000);

  it('a company marches out through the gate to a banner beyond the wall, as soon as with no wall', () => {
    const timeTo = (sim: Sim): number => {
      const s = sim.state;
      const hop = s.army.companies.find((c) => c.kind === 'hoplite')!;
      const t0 = s.tick;
      send(sim, { type: 'banner', company: hop.id, tile: tile(38, 41) });
      expect(until(sim, () => hop.order === 'hold', 3 * TICKS_PER_MONTH)).toBe(true);
      return s.tick - t0;
    };
    const open = timeTo(fresh());
    const { sim } = walled();
    const shut = timeTo(sim);
    expect(shut).toBeLessThanOrEqual(open + 2 * TICKS_PER_DAY);
  }, 120000);
});

describe('saves and determinism', () => {
  it('the same siege twice comes out the same; a save mid-siege plays on the same', () => {
    const a = walled(true);
    const b = walled(true);
    until(a.sim, () => a.r.siege === GATE && (wallAt(a.s, GATE)?.hp ?? GATE_HP) < GATE_HP * 0.7, 2 * TICKS_PER_MONTH);
    expect(wallAt(a.s, GATE)!.hp).toBeLessThan(GATE_HP * 0.7);
    b.sim.run(a.s.tick - b.s.tick);
    expect(serialize(b.s)).toBe(serialize(a.s));
    const got = decodeSave(encodeSave(a.s, 1));
    if (!got.ok) throw new Error(got.why);
    expect(serialize(got.file.state)).toBe(serialize(a.s));
    const copy = new Sim();
    copy.state = got.file.state;
    for (const n of [40, 300]) {
      a.sim.run(n);
      copy.run(n);
      expect(serialize(copy.state)).toBe(serialize(a.s));
    }
  }, 120000);

  it('a slice 24 save (version 23, the band in the city) loads with no walls and plays on', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/slice24-battle.save.json.gz')).toString();
    expect(JSON.parse(text).state.version).toBe(23);
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    const s = got.file.state;
    expect(s.version).toBe(SIM_STATE_VERSION);
    expect(s.walls).toEqual([]);
    for (const r of s.world.raids) {
      expect(r.siege).toBe(-1);
      expect(r.breaches).toBe(0);
    }
    const sim = new Sim();
    sim.state = s;
    sim.run(TICKS_PER_MONTH);
    expect(decodeSave(encodeSave(s, 1)).ok).toBe(true);
    void findBuilding;
  }, 60000);
});
