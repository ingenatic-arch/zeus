/**
 * Monuments (slice 35): the sites' stages waiting for their materials, the
 * ox carts that haul them from the storehouses and the masons' builders; what
 * a finished Lighthouse, Colossus and Stadium do; and a town with a site saved,
 * replayed and brought up from before.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { buildingRefusal } from '../src/sim/build';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { held, MARBLE, setHeld, TIMBER } from '../src/sim/foods';
import { pirateBand, PIRATE_PLACES } from '../src/sim/fleet';
import { moodOf as homeMood } from '../src/sim/folk';
import { migrate } from '../src/sim/migrate';
import { COLOSSUS_MOOD, COLOSSUS_WHY, FIRST_GAMES, gamesMood, lit, piratesKeepClear, progressOf, STAGES, workOf, type Site } from '../src/sim/monuments';
import { buildersAt, cartsTo, VISITOR_PAYS } from '../src/sim/monumentworks';
import { siteStatus } from '../src/sim/monumentstatus';
import { roadRoute } from '../src/sim/roads';
import { deserialize, serialize, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, TILE_ROAD, type Building, type SimState } from '../src/sim/state';
import { sailInTicks, SAIL_IN, SHIP_COMING } from '../src/sim/trade';
import { income, totals } from '../src/sim/treasury';
import { cityOf, moodReasons } from '../src/sim/world';
import { loyaltyOf, take } from '../src/sim/vassals';
import { demoSim } from './prepared';

const N = 128;
const T = (x: number, z: number): number => z * N + x;
const send = (sim: Sim, c: Parameters<Sim['enqueue']>[0]): void => {
  sim.enqueue(c);
  sim.flush();
};

/** The Lighthouse's site in #quarry's town: on the high ground above the bay's east shore, a spur of road to it from the quarry road, two masons' yards by the quarry road, the storehouse there stocked with marble and timber. */
function lighthouseTown(): { sim: Sim; site: Building; store: Building } {
  const sim = demoSim('quarry');
  const s = sim.state;
  send(sim, { type: 'hazards', on: false });
  income(s, 8000, 'sales', 'a test');
  send(sim, { type: 'road', tiles: roadRoute(sim.map, s, T(100, 94), T(107, 94)) ?? [] });
  send(sim, { type: 'build', kind: 'lighthouse', at: [T(97, 93)] });
  send(sim, { type: 'build', kind: 'masons', at: [T(111, 95), T(111, 98)] });
  const site = s.buildings.find((b) => b.kind === 'lighthouse')!;
  const store = s.buildings.find((b) => b.kind === 'storehouse' && b.x === 105 && b.z === 86)!;
  setHeld(store, MARBLE, 800);
  setHeld(store, TIMBER, 400);
  return { sim, site, store };
}

const siteOf = (s: SimState, kind: string): Site => s.monuments.sites.find((x) => x.kind === kind)!;

/** Run until `done` (or `most` ticks), checking `each` every tick; returns the ticks run. */
function runUntil(sim: Sim, done: () => boolean, most: number, each?: () => void): number {
  let n = 0;
  while (!done() && n < most) {
    sim.step();
    each?.();
    n++;
  }
  return n;
}

/** Finish the stage a site is on now, as if its builders had just done the last of its work (then a tick). */
function finishStage(sim: Sim, x: Site): void {
  x.building = true;
  x.work = workOf(STAGES[x.kind][x.stage]);
  sim.step();
}

/** A spot for a building of this kind (the first found), with a road beside it if `road`. */
function spotFor(sim: Sim, kind: 'colossus' | 'stadium', side: number, road = true, box = [1, 1, N - side - 1, N - side - 1]): number {
  const s = sim.state;
  for (let tz = box[1]; tz <= box[3]; tz++) {
    for (let tx = box[0]; tx <= box[2]; tx++) {
      if (buildingRefusal(sim.map, s, kind, tx, tz) !== '') continue;
      const ring: number[] = [];
      for (let d = 0; d < side; d++) ring.push((tz - 1) * N + tx + d, (tz + side) * N + tx + d, (tz + d) * N + tx - 1, (tz + d) * N + tx + side);
      if (!road || ring.some((t) => s.tiles[t] === TILE_ROAD)) return T(tx, tz);
    }
  }
  return -1;
}

describe('monuments', () => {
  it('go only where they belong, one of each to a city', () => {
    const sim = demoSim('quarry');
    const s = sim.state;
    // The Lighthouse on the plain by the river, or on the beach: no.
    expect(buildingRefusal(sim.map, s, 'lighthouse', 40, 60)).toMatch(/by the sea/);
    expect(buildingRefusal(sim.map, s, 'lighthouse', 97, 93)).toBe('');
    const { sim: lsim } = lighthouseTown();
    expect(buildingRefusal(lsim.map, lsim.state, 'lighthouse', 122, 106)).toMatch(/Only one Lighthouse/);
    expect(buildingRefusal(sim.map, s, 'colossus', 40, 60)).toMatch(/shore/);
    expect(spotFor(sim, 'colossus', 3, false)).toBeGreaterThan(0);
    expect(spotFor(sim, 'stadium', 6)).toBeGreaterThan(0);
  });

  it('wait for their materials on site, hauled by ox cart, then are built stage by stage by the masons’ builders', () => {
    const { sim, site, store } = lighthouseTown();
    const s = sim.state;
    const x = siteOf(s, 'lighthouse');
    expect(x.stage).toBe(0);
    expect(x.building).toBe(false);
    expect(progressOf(x)).toBe(0);
    // The site says what it waits for.
    expect(siteStatus(s, sim.map, site).detail).toMatch(/The foundations \(stage 1 of 3.*waits for its materials[\s\S]*of 200 marble on site[\s\S]*of 80 timber on site/);
    // Carts set out from the storehouse with marble and timber; the stage waits until all of it is there.
    let carts = 0;
    let early = false;
    const need = STAGES.lighthouse[0];
    runUntil(sim, () => x.building, 4 * TICKS_PER_MONTH, () => {
      carts = Math.max(carts, cartsTo(s, x.id).length);
      if (!x.building && (held(site, MARBLE) > need.marble || held(site, TIMBER) > need.timber)) early = true;
    });
    expect(x.building).toBe(true);
    expect(carts).toBeGreaterThan(1);
    expect(early).toBe(false);
    expect(held(store, MARBLE)).toBeLessThan(800);
    expect(s.stocks.now.some((l) => l.ware === MARBLE && l.kind === 'used' && l.what === 'monuments' && l.n === need.marble)).toBe(true);
    // The builders come, never more than the stage wants, and its work goes on as they are there.
    let most = 0;
    let fair = true;
    runUntil(sim, () => x.stage > 0, 3 * TICKS_PER_MONTH, () => {
      const here = buildersAt(s, x.id);
      most = Math.max(most, here);
      if (here > need.builders) fair = false;
    });
    expect(x.stage).toBe(1);
    expect(x.done.length).toBe(1);
    expect(most).toBeGreaterThan(0);
    expect(most).toBeLessThanOrEqual(need.builders);
    expect(fair).toBe(true);
    expect(progressOf(x)).toBeCloseTo(1 / 3, 5);
    expect(siteStatus(s, sim.map, site).title).toBe('The Lighthouse · 33% built');
  });

  it('take twice as long with half the builders: each builder there does a tick of work a tick', () => {
    const { sim } = lighthouseTown();
    const s = sim.state;
    const x = siteOf(s, 'lighthouse');
    runUntil(sim, () => x.building && buildersAt(s, x.id) > 0, 6 * TICKS_PER_MONTH);
    for (let k = 0; k < 40; k++) {
      const before = x.work;
      sim.step();
      const here = Math.min(buildersAt(s, x.id), STAGES.lighthouse[x.stage].builders);
      if (x.building && x.done.length === 0) expect(x.work - before).toBe(here);
    }
  });

  it('a finished Lighthouse brings the ship in faster, more often, and keeps the pirates off', () => {
    const { sim } = lighthouseTown();
    const s = sim.state;
    const x = siteOf(s, 'lighthouse');
    for (let k = 0; k < 3; k++) finishStage(sim, x);
    expect(x.finished).toBeGreaterThan(0);
    expect(progressOf(x)).toBe(1);
    expect(lit(s)).toBe(true);
    // Every ruler noticed.
    for (const c of s.world.cities) if (c.ruler) expect(c.memories.some((m) => m.kind === 'monument')).toBe(true);
    // The next ship sails in in twelve days, not twenty.
    const ship = s.trade.ship;
    runUntil(sim, () => ship.phase === SHIP_COMING && ship.pace !== undefined, 6 * TICKS_PER_MONTH);
    expect(ship.phase).toBe(SHIP_COMING);
    expect(sailInTicks(ship)).toBe(Math.round(SAIL_IN * 0.6));
    expect(ship.due - ship.since).toBe(sailInTicks(ship));
    // Pirates seen on a lane sail off at once.
    expect(piratesKeepClear(s)).toBe(true);
    const p = pirateBand(s, PIRATE_PLACES[0].way, 2)!;
    sim.run(TICKS_PER_DAY);
    expect(p.state).toBe('gone');
  });

  it('a finished Colossus warms every ruler for good', () => {
    const sim = demoSim('quarry');
    const s = sim.state;
    send(sim, { type: 'hazards', on: false });
    income(s, 8000, 'sales', 'a test');
    const at = spotFor(sim, 'colossus', 3, false);
    send(sim, { type: 'build', kind: 'colossus', at: [at] });
    const x = siteOf(s, 'colossus');
    for (let k = 0; k < 3; k++) finishStage(sim, x);
    expect(x.finished).toBeGreaterThan(0);
    sim.run(2 * TICKS_PER_MONTH);
    for (const c of s.world.cities) {
      if (!c.ruler) continue;
      const m = c.memories.find((y) => y.kind === 'colossus')!;
      expect(m.amount).toBe(COLOSSUS_MOOD);
      expect(m.fade).toBe(0);
      expect(moodReasons(c, s.tick).some((r) => r.why === COLOSSUS_WHY && !r.fading)).toBe(true);
    }
  });

  // (At the merge of slices 34 and 35: the Colossus named in a vassal's loyalty, and vassals and allies send athletes whatever their mood.)
  it('the Colossus shows in a vassal’s loyalty, and a cold vassal and ally still send athletes to the games', () => {
    const sim = demoSim('quarry');
    const s = sim.state;
    send(sim, { type: 'hazards', on: false });
    income(s, 12000, 'sales', 'a test');
    const corinth = cityOf(s.world, 'corinth');
    const v = take(s, corinth, 'debt', 'a test');
    const sparta = cityOf(s.world, 'sparta');
    s.empire.allies.push({ city: 'sparta', since: s.tick, refused: [], declined: 0 });
    send(sim, { type: 'build', kind: 'colossus', at: [spotFor(sim, 'colossus', 3, false)] });
    const col = siteOf(s, 'colossus');
    for (let k = 0; k < 3; k++) finishStage(sim, col);
    expect(col.finished).toBeGreaterThan(0);
    expect(loyaltyOf(s, v).why.some((r) => r.why === 'they speak of your Colossus' && r.n > 0)).toBe(true);
    send(sim, { type: 'build', kind: 'stadium', at: [spotFor(sim, 'stadium', 6, true, [20, 20, 80, 60])] });
    const st = siteOf(s, 'stadium');
    for (let k = 0; k < 3; k++) finishStage(sim, st);
    const g = s.monuments.games;
    sim.run(g.next - s.tick - 1);
    // Both turned cold just before the games open.
    for (const c of [corinth, sparta]) c.memories.push({ kind: 'test', why: 'a test', amount: -100, tick: s.tick, fade: 0 });
    const athens = cityOf(s.world, 'athens');
    athens.memories.push({ kind: 'test', why: 'a test', amount: -100, tick: s.tick, fade: 0 });
    sim.run(2);
    expect(g.held).toBe(1);
    expect(corinth.memories.some((m) => m.kind === 'games')).toBe(true);
    expect(sparta.memories.some((m) => m.kind === 'games')).toBe(true);
    // (A cold city that is neither still stays home.)
    expect(athens.memories.some((m) => m.kind === 'games')).toBe(false);
  });

  it('a finished Stadium holds games: visitors walk in and pay, and the city’s mood lifts', () => {
    const sim = demoSim('quarry');
    const s = sim.state;
    send(sim, { type: 'hazards', on: false });
    income(s, 8000, 'sales', 'a test');
    // (In the town, near the roads in from the edge of the map.)
    send(sim, { type: 'build', kind: 'stadium', at: [spotFor(sim, 'stadium', 6, true, [20, 20, 80, 60])] });
    const x = siteOf(s, 'stadium');
    for (let k = 0; k < 3; k++) finishStage(sim, x);
    const g = s.monuments.games;
    expect(g.next).toBe(x.finished + FIRST_GAMES);
    expect(gamesMood(s)).toBeNull();
    sim.run(g.next - s.tick + 2 * TICKS_PER_DAY);
    expect(g.held).toBe(1);
    expect(g.until).toBeGreaterThan(s.tick);
    expect(g.visitors).toBeGreaterThan(0);
    expect(g.takings).toBe(g.visitors * VISITOR_PAYS);
    expect(s.walkers.some((w) => w.kind === 'visitor')).toBe(true);
    const line = s.ledger.now.find((l) => l.kind === 'sales' && l.what === 'visitors at the games') ?? s.ledger.last.find((l) => l.kind === 'sales' && l.what === 'visitors at the games');
    expect(line?.amount ?? 0).toBeGreaterThan(0);
    expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);
    expect(gamesMood(s)?.w).toBe(2);
    const home = s.buildings.find((b) => b.kind === 'home' && b.people > 0)!;
    expect(homeMood(s, home, { agora: true, jobs: true }, 0).reasons.some((r) => r.text === 'The games are on at the Stadium')).toBe(true);
  });

  it('play the same twice, and save and load mid-build', () => {
    const a = lighthouseTown().sim;
    const b = lighthouseTown().sim;
    a.run(2 * TICKS_PER_MONTH);
    b.run(2 * TICKS_PER_MONTH);
    expect(serialize(a.state)).toBe(serialize(b.state));
    const text = serialize(a.state);
    const back = deserialize(text);
    expect(serialize(back)).toBe(text);
    const c = new Sim();
    c.state = back;
    a.run(TICKS_PER_MONTH);
    c.run(TICKS_PER_MONTH);
    expect(serialize(c.state)).toBe(serialize(a.state));
    const d = decodeSave(encodeSave(a.state, 0));
    expect(d.ok).toBe(true);
  });

  it('a town from before has no monument and no games', () => {
    const sim = demoSim('quarry');
    const now = serialize(sim.state);
    // (Review: the step that brings in the monuments is found by trying each version from the newest down, so this holds
    // when the lines' versions are renumbered at merge and other steps come after it.)
    let m: SimState['monuments'] | undefined;
    for (let v = SIM_STATE_VERSION - 1; v >= 28 && !m; v--) {
      const old = JSON.parse(now) as Record<string, unknown>;
      delete old.monuments;
      old.version = v;
      expect(migrate(old)).toBe(v);
      expect(old.version).toBe(SIM_STATE_VERSION);
      m = old.monuments as SimState['monuments'] | undefined;
    }
    expect(m?.sites).toEqual([]);
    expect(m?.games.next).toBe(0);
  });

  it('a phase 4 save (version 27) comes up through every step with no monument, and plays on', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/phase4-bronze.save.json.gz')).toString();
    expect(JSON.parse(text).state.version).toBe(27);
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    expect(got.file.state.version).toBe(SIM_STATE_VERSION);
    expect(got.file.state.monuments.sites).toEqual([]);
    const sim = new Sim();
    sim.state = got.file.state;
    sim.run(TICKS_PER_MONTH);
    expect(sim.state.monuments.sites).toEqual([]);
  });
});
