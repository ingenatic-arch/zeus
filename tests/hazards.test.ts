/**
 * Fire and collapse (slice 12): fire risk and wear on every building, the
 * watch post's watchman and the architect's office's inspector, smouldering
 * and burning, fire that spreads next door one building at a time, creaking
 * and falling in, rubble that must be cleared for a fee, and the ledger.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { DEMOS } from '../src/game/demos';
import { decodeSave, encodeSave } from '../src/game/saves';
import { coastMap } from '../src/map/bake';
import { buildingRefusal, CLEAR_SMALL, plotRefusal, RUBBLE_REFUSAL, roadRefusal } from '../src/sim/build';
import { findBuilding } from '../src/sim/buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import {
  BURN_DAYS,
  BURNT,
  catchable,
  CREAK_DAYS,
  DAYS_JITTER,
  FALLEN,
  FIRE_BURNING,
  FIRE_NONE,
  FIRE_SMOULDER,
  HAZARD_FULL,
  riskRate,
  SMOULDER_DAYS,
  wearRate,
} from '../src/sim/hazards';
import { replay, serialize, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type Building, type SimState } from '../src/sim/state';
import { totals } from '../src/sim/treasury';

const map = coastMap();
const N = map.size;
const T = (x: number, z: number): number => z * N + x;

const demo = (name: string): Sim => {
  const sim = new Sim();
  DEMOS[name].setup!(sim);
  return sim;
};
const at = (s: SimState, x: number, z: number): Building => {
  const b = findBuilding(s, s.tiles[T(x, z)]);
  if (!b) throw new Error(`nothing at ${x}, ${z}`);
  return b;
};
const send = (sim: Sim, c: Parameters<Sim['enqueue']>[0]): void => {
  sim.enqueue(c);
  sim.flush();
};
const ledgerAddsUp = (s: SimState): void => expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);

/*
 * The tests burn #food's west row: five cottages side by side along the main
 * road (x 16 to 25 on row 78), the lane east of them, no watch posts or
 * architects.
 */
/** A spot beside the main road, just west of the row, for a watch post or an architect's office. */
const POST = { x: 14, z: 81 };

describe('fire risk and wear', () => {
  it('rise faster in crowded houses and busy workshops (fire) and in big buildings (wear), and not at all while switched off', () => {
    const s = demo('town').state;
    const homes = s.buildings.filter((b) => b.kind === 'home' && b.level === 5);
    const full = homes.reduce((a, b) => (b.people > a.people ? b : a));
    const empty = { ...full, people: 0 };
    expect(riskRate(s, full)).toBeGreaterThan(riskRate(s, empty) * 1.4);
    const press = s.buildings.find((b) => b.kind === 'press')!;
    const farm = s.buildings.find((b) => b.kind === 'farm')!;
    const theatre = s.buildings.find((b) => b.kind === 'theatre')!;
    expect(riskRate(s, theatre)).toBeGreaterThan(riskRate(s, farm) * 1.4);
    expect(riskRate(s, press)).toBeGreaterThan(riskRate(s, farm) * 1.4);
    const granary = s.buildings.find((b) => b.kind === 'granary')!;
    expect(wearRate(s, granary)).toBeGreaterThan(wearRate(s, full) * 1.3);
    // Fountains never burn; nothing burns or wears while the switch is off.
    expect(riskRate(s, s.buildings.find((b) => b.kind === 'fountain')!)).toBe(0);
    const sim = demo('food');
    send(sim, { type: 'hazards', on: false });
    sim.run(TICKS_PER_MONTH);
    expect(sim.state.buildings.every((b) => b.risk === 0 && b.wear === 0)).toBe(true);
    send(sim, { type: 'hazards', on: true });
    sim.run(TICKS_PER_MONTH);
    expect(sim.state.buildings.filter((b) => b.risk > 0).length).toBeGreaterThan(30);
  });

  it('every demo opens with no fire risk or wear anywhere, and #food and #town don’t smoulder within half a year (#town not within two years)', () => {
    for (const name of ['food', 'fine', 'town']) {
      const s = demo(name).state;
      expect(s.hazards).toBe(true);
      expect(s.buildings.every((b) => b.risk === 0 && b.wear === 0 && b.fire === FIRE_NONE && b.creakAt === 0)).toBe(true);
    }
    const food = demo('food');
    food.run(6 * TICKS_PER_MONTH);
    expect(food.state.buildings.some((b) => b.fire !== FIRE_NONE || b.creakAt > 0)).toBe(false);
    const town = demo('town');
    for (let m = 0; m < 24; m++) {
      town.run(TICKS_PER_MONTH);
      expect(town.state.buildings.some((b) => b.fire !== FIRE_NONE || b.creakAt > 0 || b.kind === 'rubble')).toBe(false);
    }
  });
});

describe('fire', () => {
  /** #food with one cottage in the middle of the west row about to top out its fire risk. */
  const kindled = (): { sim: Sim; first: Building } => {
    const sim = demo('food');
    const first = at(sim.state, 20, 78);
    first.risk = HAZARD_FULL - 0.001;
    return { sim, first };
  };

  it('with no watchman: smoulders about a month, catches, spreads only to buildings touching a fire, one at a time, and leaves rubble and no family; the same seed burns the same way', () => {
    const { sim, first } = kindled();
    const s = sim.state;
    const id = first.id;
    // It tops out within a day, and smoulders for about a month.
    sim.run(TICKS_PER_DAY);
    expect(first.fire).toBe(FIRE_SMOULDER);
    const catches = first.fireAt;
    expect(catches - s.tick).toBeGreaterThanOrEqual((SMOULDER_DAYS - DAYS_JITTER - 1) * TICKS_PER_DAY);
    expect(catches - s.tick).toBeLessThanOrEqual((SMOULDER_DAYS + DAYS_JITTER) * TICKS_PER_DAY);
    sim.run(catches - s.tick - 1);
    expect(first.fire).toBe(FIRE_SMOULDER);
    sim.run(TICKS_PER_DAY);
    expect(first.fire).toBe(FIRE_BURNING);
    // Watch it burn: each building that catches is touching one that was already burning, and no more than one catches from each fire a day.
    const people = first.people;
    const left = s.left;
    const burnt = new Set<string>();
    const lit = new Set<number>([id]);
    for (let t = 0; t < 4 * TICKS_PER_MONTH; t++) {
      const burning = s.buildings.filter((b) => b.fire === FIRE_BURNING);
      const neighbours = new Set(burning.flatMap((b) => catchable(s, N, b).map((o) => o.id)));
      sim.step();
      const now = s.buildings.filter((b) => b.fire === FIRE_BURNING && !lit.has(b.id));
      for (const b of now) {
        expect(neighbours.has(b.id)).toBe(true);
        lit.add(b.id);
      }
      expect(now.length).toBeLessThanOrEqual(burning.length);
      for (const b of s.buildings) if (b.kind === 'rubble' && b.level === BURNT) burnt.add(`${b.x},${b.z}`);
      if (s.buildings.every((b) => b.fire !== FIRE_BURNING) && burnt.size) break;
    }
    // It burnt down BURN_DAYS after catching: rubble where it stood, the family gone, the ledger counts it.
    expect(burnt.has('20,78')).toBe(true);
    expect(findBuilding(s, id)).toBeUndefined();
    const heap = at(s, 20, 78);
    expect(heap.kind).toBe('rubble');
    expect(heap.was).toBe('home');
    expect(heap.ruin).not.toBe('');
    expect(heap.people).toBe(0);
    expect(s.left).toBeGreaterThanOrEqual(left + people);
    const lost = [...s.ledger.now, ...s.ledger.last].filter((l) => l.kind === 'fire').reduce((a, l) => a + l.n, 0);
    expect(lost).toBe(burnt.size);
    // The fire spread along the row (this seed takes the cottage next door too), but never across the road or to the fountain.
    expect(burnt.size).toBeGreaterThanOrEqual(2);
    for (const k of burnt) {
      const [x, z] = k.split(',').map(Number);
      expect(z === 78 || z === 76).toBe(true);
      expect(x).toBeLessThan(26);
    }
    expect(at(s, 27, 81).kind).toBe('fountain');
    // The same seed and the same start burn the same way.
    const again = kindled();
    again.sim.run(s.tick - again.sim.state.tick);
    expect(serialize(again.sim.state)).toBe(serialize(s));
    expect(BURN_DAYS).toBeGreaterThan(0);
  });

  it('a watchman on the street puts out a smoulder as he passes, and runs to flames he can see and puts them out before they spread', () => {
    const { sim, first } = kindled();
    const s = sim.state;
    send(sim, { type: 'build', kind: 'watchpost', at: [T(POST.x, POST.z)] });
    const post = at(s, POST.x, POST.z);
    expect(post.kind).toBe('watchpost');
    // He puts out the smoulder (its risk back to nothing) well within its month.
    sim.run(TICKS_PER_DAY);
    expect(first.fire).toBe(FIRE_SMOULDER);
    let out = -1;
    for (let t = 0; t < SMOULDER_DAYS * TICKS_PER_DAY && out < 0; t++) {
      sim.step();
      if (first.fire === FIRE_NONE) out = t;
    }
    expect(out).toBeGreaterThan(0);
    expect(first.risk).toBeLessThan(10);
    // Now set it burning: the watchman (out on his round, or sent out at once) runs to it and fights it.
    first.fire = FIRE_BURNING;
    first.fireAt = s.tick + BURN_DAYS * TICKS_PER_DAY;
    first.risk = HAZARD_FULL;
    let ran = false;
    for (let t = 0; t < BURN_DAYS * TICKS_PER_DAY && first.fire === FIRE_BURNING; t++) {
      sim.step();
      if (s.walkers.some((w) => w.kind === 'watchman' && w.target === first.id)) ran = true;
    }
    expect(ran).toBe(true);
    expect(first.fire).toBe(FIRE_NONE);
    expect(findBuilding(s, first.id)).toBe(first);
    expect(s.buildings.some((b) => b.kind === 'rubble' || b.fire === FIRE_BURNING)).toBe(false);
  });
});

describe('collapse', () => {
  it('a creaking house falls in about a month later with no inspector (and nothing else does); with one passing it is made sound', () => {
    const worn = (): { sim: Sim; b: Building } => {
      const sim = demo('food');
      const b = at(sim.state, 20, 78);
      b.wear = HAZARD_FULL - 0.001;
      return { sim, b };
    };
    const { sim, b } = worn();
    const s = sim.state;
    sim.run(TICKS_PER_DAY);
    expect(b.creakAt).toBeGreaterThan(s.tick + (CREAK_DAYS - DAYS_JITTER - 1) * TICKS_PER_DAY);
    sim.run(b.creakAt - s.tick + TICKS_PER_DAY);
    const heap = at(s, 20, 78);
    expect(heap.kind).toBe('rubble');
    expect(heap.level).toBe(FALLEN);
    expect(s.buildings.filter((o) => o.kind === 'rubble').length).toBe(1);
    expect(s.ledger.now.concat(s.ledger.last).some((l) => l.kind === 'collapse' && l.what === 'home')).toBe(true);
    // With an architect's office beside the road, its inspector comes by in time.
    const saved = worn();
    send(saved.sim, { type: 'build', kind: 'architect', at: [T(POST.x, POST.z)] });
    saved.sim.run(CREAK_DAYS * TICKS_PER_DAY + 2 * TICKS_PER_DAY);
    expect(findBuilding(saved.sim.state, saved.b.id)).toBe(saved.b);
    expect(saved.b.creakAt).toBe(0);
    expect(saved.b.wear).toBeLessThan(100);
  });
});

describe('rubble', () => {
  it('must be cleared before anything is built there, for a small fee on the ledger; undo brings the heap back and the fee', () => {
    const sim = demo('food');
    const s = sim.state;
    const b = at(s, 20, 78);
    b.wear = HAZARD_FULL - 0.001;
    sim.run(TICKS_PER_DAY);
    sim.run(b.creakAt - s.tick + TICKS_PER_DAY);
    const heap = at(s, 20, 78);
    expect(heap.kind).toBe('rubble');
    expect(plotRefusal(map, s, 20, 78)).toBe(RUBBLE_REFUSAL);
    expect(buildingRefusal(map, s, 'shrine', 20, 78)).toBe(RUBBLE_REFUSAL);
    expect(roadRefusal(map, s, 21, 79)).toBe(RUBBLE_REFUSAL);
    ledgerAddsUp(s);
    const money = s.money;
    send(sim, { type: 'clear', x0: 20, z0: 78, x1: 21, z1: 79 });
    expect(s.money).toBe(money - CLEAR_SMALL);
    expect(s.ledger.now.find((l) => l.kind === 'clearing')).toEqual({ kind: 'clearing', what: 'home', amount: -CLEAR_SMALL, n: 1 });
    ledgerAddsUp(s);
    expect(plotRefusal(map, s, 20, 78)).toBe('');
    send(sim, { type: 'undo' });
    expect(s.money).toBe(money);
    const back = at(s, 20, 78);
    expect(back.kind).toBe('rubble');
    expect(back.level).toBe(FALLEN);
    expect(back.was).toBe('home');
    expect(back.ruin).toBe(heap.ruin);
    // It fell when it fell: undo doesn't make it news again.
    expect(back.placed).toBe(heap.placed);
    ledgerAddsUp(s);
    // Cleared again, a plot goes up where it stood.
    send(sim, { type: 'clear', x0: 20, z0: 78, x1: 20, z1: 78 });
    send(sim, { type: 'plots', at: [T(20, 78)] });
    expect(at(s, 20, 78).kind).toBe('home');
  });
});

describe('undo', () => {
  it('brings a cleared workplace back as near to burning or falling as it was, and no longer refunds a building that has since burnt down', () => {
    const sim = demo('food');
    const s = sim.state;
    const g = s.buildings.find((b) => b.kind === 'granary')!;
    g.risk = HAZARD_FULL - 0.001;
    g.wear = HAZARD_FULL - 0.001;
    sim.run(TICKS_PER_DAY);
    expect(g.fire).toBe(FIRE_SMOULDER);
    expect(g.creakAt).toBeGreaterThan(0);
    const { fireAt, creakAt } = g;
    send(sim, { type: 'clear', x0: g.x, z0: g.z, x1: g.x, z1: g.z });
    expect(findBuilding(s, g.id)).toBeUndefined();
    send(sim, { type: 'undo' });
    const back = at(s, g.x, g.z);
    expect(back.kind).toBe('granary');
    expect([back.fire, back.fireAt, back.risk, back.creakAt]).toEqual([FIRE_SMOULDER, fireAt, HAZARD_FULL, creakAt]);
    // A shrine put up beside the fire burns down within the month: undoing it takes nothing away and gives nothing back.
    const money = s.money;
    send(sim, { type: 'build', kind: 'shrine', at: [T(POST.x, POST.z)] });
    const shrine = at(s, POST.x, POST.z);
    expect(s.money).toBeLessThan(money);
    shrine.risk = HAZARD_FULL;
    shrine.fire = FIRE_BURNING;
    shrine.fireAt = s.tick + 1;
    sim.run(TICKS_PER_DAY + 1);
    expect(at(s, POST.x, POST.z).kind).toBe('rubble');
    const before = s.money;
    send(sim, { type: 'undo' });
    expect(s.money).toBe(before);
    expect(at(s, POST.x, POST.z).kind).toBe('rubble');
    ledgerAddsUp(s);
  });
});

describe('saves and determinism', () => {
  it('a #town save from slice 11 (state version 10) loads with no fire risk or wear, fire and wear switched on, and saves again identically', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/slice11-town.save.json.gz')).toString();
    expect(JSON.parse(text).state.version).toBe(10);
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    expect(got.file.from).toBe(10);
    const st = got.file.state;
    expect(st.version).toBe(SIM_STATE_VERSION);
    expect(st.hazards).toBe(true);
    expect(st.rounds.fire.walked.length).toBe(N * N);
    expect(st.rounds.wear.exits.length).toBe(N * N);
    for (const b of st.buildings) {
      expect([b.risk, b.wear, b.fire, b.fireAt, b.creakAt]).toEqual([0, 0, 0, 0, 0]);
      expect([b.was, b.ruin]).toEqual(['', '']);
    }
    const sim = new Sim();
    sim.state = st;
    sim.run(TICKS_PER_MONTH);
    expect(st.buildings.some((b) => b.risk > 0)).toBe(true);
    const r = decodeSave(encodeSave(st, 2));
    if (!r.ok) throw new Error(r.why);
    expect(r.file.from).toBeUndefined();
    const again = new Sim();
    again.state = r.file.state;
    sim.run(600);
    again.run(600);
    expect(serialize(again.state)).toEqual(serialize(sim.state));
  });

  it('a save in the middle of a fire, with a watchman running to it, carries on identically; a replay of the log rebuilds the same burnt town', () => {
    const sim = demo('blaze');
    const s = sim.state;
    expect(s.buildings.filter((b) => b.fire === FIRE_BURNING).length).toBeGreaterThanOrEqual(2);
    // On until a watchman is running to a fire (or fighting one), then save.
    for (let t = 0; t < 2 * TICKS_PER_MONTH && !s.walkers.some((w) => w.kind === 'watchman' && w.target > 0); t++) sim.step();
    expect(s.walkers.some((w) => w.kind === 'watchman' && w.target > 0)).toBe(true);
    const r = decodeSave(encodeSave(s, 1));
    if (!r.ok) throw new Error(r.why);
    const copy = new Sim();
    copy.state = r.file.state;
    sim.run(900);
    copy.run(900);
    expect(serialize(copy.state)).toEqual(serialize(sim.state));
    expect(s.buildings.some((b) => b.kind === 'rubble')).toBe(true);
    // The whole history, fire and all, from the seed and the command log.
    const again = replay(s.seed, sim.log, s.tick);
    expect(serialize(again.state)).toEqual(serialize(s));
  });

  it('the fire demos open on what they promise: #fire on a thread of smoke, #blaze on a spreading fire, #rubble on burnt-out rubble, #creak on a creaking building', () => {
    const fire = demo('fire').state;
    expect(fire.buildings.filter((b) => b.fire === FIRE_SMOULDER).length).toBe(1);
    expect(fire.buildings.some((b) => b.fire === FIRE_BURNING || b.kind === 'rubble')).toBe(false);
    const blaze = demo('blaze').state;
    expect(blaze.buildings.filter((b) => b.fire === FIRE_BURNING).length).toBeGreaterThanOrEqual(2);
    const rubble = demo('rubble').state;
    expect(rubble.buildings.filter((b) => b.kind === 'rubble' && b.level === BURNT).length).toBeGreaterThanOrEqual(2);
    expect(rubble.buildings.some((b) => b.fire === FIRE_BURNING)).toBe(false);
    const creak = demo('creak').state;
    expect(creak.buildings.filter((b) => b.creakAt > 0).length).toBe(1);
    expect(creak.buildings.some((b) => b.kind === 'rubble' || b.fire !== FIRE_NONE)).toBe(false);
  }, 30000);
});
