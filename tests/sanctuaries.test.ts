/**
 * Sanctuaries (slice 54): a sanctuary to one of the twelve marked out (5 x 5,
 * one to a god, paid through the treasury), raised in its three stages by the
 * monuments' ox carts (its god's sacred good from whichever store keeps it)
 * and masons' builders, noticed by its god at each stage, a standing honour
 * once finished and staffed, dimmed after a season without workers, its
 * priests sent out; the same twice; saved and brought up from before.
 */
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { buildingRefusal, SANCTUARY_COST } from '../src/sim/build';
import { footSide, jobsAt, SANCTUARY_JOBS } from '../src/sim/buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { PRIESTESS_RANGE } from '../src/sim/culture';
import { held, MARBLE, setHeld, TIMBER, WHEAT, COPPER } from '../src/sim/foods';
import { migrate } from '../src/sim/migrate';
import { needOf, progressOf, sacredMeasure, siteMaterials, stagesOf, workOf, type Site } from '../src/sim/monuments';
import { cartsTo, isBronze, smithsAt } from '../src/sim/monumentworks';
import { siteStatus } from '../src/sim/monumentstatus';
import { GODS, moodOfGod, reasonsOf } from '../src/sim/pantheon';
import { DIM_AFTER, dimmed, PRIEST_RANGE, priestsRound, sanctuaryDone, sanctuaryOf, sanctuaryRefusal, STAGE_HONOUR, STANDING_HONOUR, standingWhy } from '../src/sim/sanctuaries';
import { deserialize, serialize, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, TILE_ROAD, type Building } from '../src/sim/state';
import { income } from '../src/sim/treasury';
import { demoSim } from './prepared';

const N = 128;
const T = (x: number, z: number): number => z * N + x;
const send = (sim: Sim, c: Parameters<Sim['enqueue']>[0]): void => {
  sim.enqueue(c);
  sim.flush();
};

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
  x.work = workOf(stagesOf(x)[x.stage]);
  sim.step();
}

/** Spots for a sanctuary (5 x 5) with a road beside them, nearest a point first. */
function spotsNear(sim: Sim, cx: number, cz: number, reach = 20): number[] {
  const s = sim.state;
  const out: Array<[number, number]> = [];
  for (let tz = cz - reach; tz <= cz + reach; tz++) {
    for (let tx = cx - reach; tx <= cx + reach; tx++) {
      if (tx < 1 || tz < 1 || tx > N - 6 || tz > N - 6) continue;
      if (buildingRefusal(sim.map, s, 'sanctuary', tx, tz) !== '') continue;
      const ring: number[] = [];
      for (let d = 0; d < 5; d++) ring.push((tz - 1) * N + tx + d, (tz + 5) * N + tx + d, (tz + d) * N + tx - 1, (tz + d) * N + tx + 5);
      if (!ring.some((t) => s.tiles[t] === TILE_ROAD)) continue;
      out.push([T(tx, tz), Math.abs(tx - cx) + Math.abs(tz - cz)]);
    }
  }
  return out.sort((a, b) => a[1] - b[1] || a[0] - b[0]).map((o) => o[0]);
}

/** #quarry's town with a sanctuary to Demeter marked out near its east storehouse (stocked with marble and timber), a masons' yard by it. */
function sanctuaryTown(): { sim: Sim; b: Building; x: Site; store: Building } {
  const sim = demoSim('quarry');
  const s = sim.state;
  send(sim, { type: 'hazards', on: false });
  income(s, 8000, 'sales', 'a test');
  const store = s.buildings.find((b) => b.kind === 'storehouse' && b.x === 105 && b.z === 86)!;
  const spot = spotsNear(sim, 100, 80)[0];
  send(sim, { type: 'sanctuary', god: 'demeter', at: [spot] });
  send(sim, { type: 'build', kind: 'masons', at: [T(111, 95), T(111, 98)] });
  setHeld(store, MARBLE, 800);
  setHeld(store, TIMBER, 400);
  const b = s.buildings.find((g) => g.kind === 'sanctuary')!;
  return { sim, b, x: sanctuaryOf(s, 'demeter')!, store };
}

describe('sanctuaries', () => {
  it('are marked out 5 x 5 beside a road, one to a god, paid for through the treasury', () => {
    const sim = demoSim('quarry');
    const s = sim.state;
    income(s, 8000, 'sales', 'a test');
    const spots = spotsNear(sim, 100, 80);
    expect(spots.length).toBeGreaterThan(1);
    const before = s.money;
    send(sim, { type: 'sanctuary', god: 'demeter', at: [spots[0]] });
    const b = s.buildings.find((g) => g.kind === 'sanctuary')!;
    expect(b).toBeDefined();
    expect(b.god).toBe('demeter');
    expect(footSide(b)).toBe(5);
    expect(s.money).toBe(before - SANCTUARY_COST);
    expect(s.ledger.now.some((l) => l.kind === 'building' && l.what === 'sanctuary' && l.amount === -SANCTUARY_COST)).toBe(true);
    expect(s.ledger.start + s.ledger.now.reduce((a, l) => a + l.amount, 0)).toBeCloseTo(s.money, 6);
    const x = sanctuaryOf(s, 'demeter')!;
    expect(x.kind).toBe('sanctuary');
    expect(x.god).toBe('demeter');
    expect(x.idle).toBe(0);
    // No workers while it rises.
    expect(jobsAt(b)).toBe(0);
    // A second to Demeter is refused, with the reason; another god's is not.
    expect(sanctuaryRefusal(s, 'demeter')).toMatch(/already.*One to a god/);
    expect(sanctuaryRefusal(s, 'apollo')).toBe('');
    const free = spotsNear(sim, 100, 80);
    send(sim, { type: 'sanctuary', god: 'demeter', at: [free[0]] });
    expect(s.buildings.filter((g) => g.kind === 'sanctuary').length).toBe(1);
    expect(s.money).toBe(before - SANCTUARY_COST);
    send(sim, { type: 'sanctuary', god: 'apollo', at: [free[0]] });
    expect(s.buildings.filter((g) => g.kind === 'sanctuary').length).toBe(2);
    expect(sanctuaryOf(s, 'apollo')?.god).toBe('apollo');
    // A god the city doesn't know places nothing.
    send(sim, { type: 'sanctuary', god: 'cronus' as never, at: [spotsNear(sim, 100, 80)[0]] });
    expect(s.buildings.filter((g) => g.kind === 'sanctuary').length).toBe(2);
  });

  it('rise stage by stage: materials hauled by ox cart, the sacred good from the granary, the bronze waiting for the smiths', () => {
    const { sim, b, x, store } = sanctuaryTown();
    const s = sim.state;
    const st = stagesOf(x);
    expect(st.length).toBe(3);
    expect(st[2].ware).toBe(GODS.demeter.sacred);
    expect(needOf(st[2], WHEAT)).toBe(sacredMeasure(WHEAT));
    expect(siteMaterials(x)).toContain(WHEAT);
    // The site says what it waits for.
    expect(siteStatus(s, sim.map, b).title).toBe('The sanctuary to Demeter · 0% built');
    expect(siteStatus(s, sim.map, b).detail).toMatch(/The foundations \(stage 1 of 3[\s\S]*of 160 marble on site[\s\S]*of 80 timber on site/);
    // Carts bring marble and timber, then the foundations start.
    let carts = 0;
    runUntil(sim, () => x.building, 4 * TICKS_PER_MONTH, () => (carts = Math.max(carts, cartsTo(s, x.id).length)));
    expect(x.building).toBe(true);
    expect(carts).toBeGreaterThan(1);
    expect(held(store, MARBLE)).toBeLessThan(800);
    // The builders work it through.
    runUntil(sim, () => x.stage > 0, 6 * TICKS_PER_MONTH);
    expect(x.stage).toBe(1);
    expect(progressOf(x)).toBeCloseTo(1 / 3, 5);
    finishStage(sim, x);
    expect(x.stage).toBe(2);
    // The last stage: its wheat comes from the granary by ox cart.
    const granary = s.buildings.find((g) => g.kind === 'granary')!;
    let fromGranary = false;
    runUntil(sim, () => fromGranary, 2 * TICKS_PER_MONTH, () => {
      if (cartsTo(s, x.id).some((k) => k.food === WHEAT && k.origin === granary.id)) fromGranary = true;
    });
    expect(fromGranary).toBe(true);
    // With everything on site but no smiths, the bronze waits.
    expect(smithsAt(s)).toBe(false);
    for (const w of siteMaterials(x)) setHeld(b, w, needOf(st[2], w));
    expect(held(b, COPPER)).toBe(120);
    sim.run(5 * TICKS_PER_DAY);
    expect(isBronze(x)).toBe(true);
    expect(x.building).toBe(false);
    expect(siteStatus(s, sim.map, b).detail).toMatch(/armour/);
    finishStage(sim, x);
    expect(x.finished).toBeGreaterThan(0);
    expect(sanctuaryDone(s, 'demeter')).toBe(true);
    expect(b.level).toBe(1);
    expect(jobsAt(b)).toBe(SANCTUARY_JOBS);
  });

  it('are noticed by their god: each stage remembered, a standing honour finished and staffed, lapsed when dimmed, gone when taken down', () => {
    const { sim, b, x } = sanctuaryTown();
    const s = sim.state;
    const moodBefore = moodOfGod(s, 'demeter');
    finishStage(sim, x);
    const r0 = reasonsOf(s, 'demeter').find((r) => r.kind === 'sanctuary-stage')!;
    expect(r0.worth).toBe(STAGE_HONOUR[0]);
    expect(r0.fading).toBe(true);
    finishStage(sim, x);
    finishStage(sim, x);
    expect(x.finished).toBeGreaterThan(0);
    const standing = reasonsOf(s, 'demeter').find((r) => r.why === standingWhy('demeter'))!;
    expect(standing.worth).toBe(STANDING_HONOUR);
    expect(standing.fading).toBe(false);
    expect(moodOfGod(s, 'demeter')).toBeGreaterThan(moodBefore + STANDING_HONOUR);
    // Its workers come; then it is left without them for a season.
    runUntil(sim, () => b.workers > 0, 2 * TICKS_PER_MONTH);
    expect(b.workers).toBeGreaterThan(0);
    b.paused = 1;
    runUntil(sim, () => dimmed(s, x), DIM_AFTER + 3 * TICKS_PER_DAY);
    expect(dimmed(s, x)).toBe(true);
    sim.run(TICKS_PER_DAY);
    expect(reasonsOf(s, 'demeter').some((r) => r.why === standingWhy('demeter'))).toBe(false);
    expect(s.messages.log.some((m) => m.kind === 'sanctuary' && /without priests for a season/.test(m.words))).toBe(true);
    // Its workers back: honoured again.
    b.paused = 0;
    runUntil(sim, () => !dimmed(s, x), 2 * TICKS_PER_MONTH);
    expect(dimmed(s, x)).toBe(false);
    expect(reasonsOf(s, 'demeter').find((r) => r.why === standingWhy('demeter'))?.worth).toBe(STANDING_HONOUR);
    // Taken down: the honour goes with it.
    send(sim, { type: 'clear', x0: b.x, z0: b.z, x1: b.x + 4, z1: b.z + 4 });
    sim.step();
    expect(sanctuaryOf(s, 'demeter')).toBeUndefined();
    expect(reasonsOf(s, 'demeter').some((r) => r.why === standingWhy('demeter'))).toBe(false);
  });

  it('send priests once finished and staffed, half as far again as a priestess', () => {
    const { sim, b, x } = sanctuaryTown();
    const s = sim.state;
    expect(PRIEST_RANGE).toBe(PRIESTESS_RANGE * 1.5);
    expect(priestsRound().range).toBe(PRIEST_RANGE);
    // Not while it rises.
    sim.run(TICKS_PER_MONTH);
    expect(s.walkers.some((w) => w.kind === 'priest')).toBe(false);
    for (let k = 0; k < 3; k++) finishStage(sim, x);
    let blessed = 0;
    runUntil(sim, () => blessed > 0, 3 * TICKS_PER_MONTH, () => {
      const p = s.walkers.find((w) => w.kind === 'priest' && w.origin === b.id && w.walked > 5);
      if (p) blessed = s.buildings.filter((h) => h.kind === 'home' && h.religionUntil > s.tick + 3 * TICKS_PER_MONTH).length;
    });
    expect(s.walkers.some((w) => w.kind === 'priest' && w.origin === b.id)).toBe(true);
    expect(blessed).toBeGreaterThan(0);
  });

  it('play the same twice, and save and load mid-build', () => {
    const a = sanctuaryTown().sim;
    const c = sanctuaryTown().sim;
    a.run(2 * TICKS_PER_MONTH);
    c.run(2 * TICKS_PER_MONTH);
    expect(serialize(a.state)).toBe(serialize(c.state));
    const text = serialize(a.state);
    const back = deserialize(text);
    expect(serialize(back)).toBe(text);
    const d = new Sim();
    d.state = back;
    a.run(TICKS_PER_MONTH);
    d.run(TICKS_PER_MONTH);
    expect(serialize(d.state)).toBe(serialize(a.state));
    const got = decodeSave(encodeSave(a.state, 0));
    expect(got.ok).toBe(true);
  });

  it('a save from before sanctuaries (version 50, and 47 through every step since) loads, its monuments’ sites given no idle time', () => {
    const { sim } = sanctuaryTown();
    const s = sim.state;
    // (A monument's site stands in for the older town's: built by hand as an older save would hold it.)
    const now = JSON.parse(serialize(s)) as Record<string, unknown>;
    const mon = now.monuments as { sites: Array<Record<string, unknown>> };
    mon.sites = mon.sites.filter((y) => y.kind !== 'sanctuary').concat([{ id: 999999, kind: 'lighthouse', stage: 1, building: false, work: 0, marked: 0, done: [10], finished: 0 }]);
    now.buildings = (now.buildings as Array<Record<string, unknown>>).filter((g) => g.kind !== 'sanctuary');
    // (50: the version before this step, slice 56's, renumbered at the merge; 47: phase 6's, before the gods.)
    for (const v of [50, 47]) {
      const old = JSON.parse(JSON.stringify(now)) as Record<string, unknown>;
      old.version = v;
      if (v === 47) delete old.gods;
      expect(migrate(old)).toBe(v);
      expect(old.version).toBe(SIM_STATE_VERSION);
      const sites = (old.monuments as { sites: Array<Record<string, unknown>> }).sites;
      expect(sites.find((y) => y.id === 999999)?.idle).toBe(0);
    }
  });
});
