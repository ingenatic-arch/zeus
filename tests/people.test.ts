import { describe, expect, it } from 'vitest';
import { DEMOS } from '../src/game/demos';
import { coastMap } from '../src/map/bake';
import { MAP_SIZE } from '../src/map/coast';
import { COTTAGE, HOME_CAPACITY, HUT, TENT } from '../src/sim/buildings';
import { chatterOf, LINES } from '../src/sim/chatter';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '../src/sim/clock';
import { ageOf, COTTAGE_FOOD_MIN, DECLINE_AFTER, MEN, moodOf, ORIGINS, WARN_AFTER, warningOf, WOMEN } from '../src/sim/folk';
import { canWork } from '../src/sim/labour';
import { serialize, Sim, UNDO_WINDOW, undoRefusal } from '../src/sim/sim';
import { homeStatus } from '../src/sim/status';
import type { Building, SimState } from '../src/sim/state';

const map = coastMap();
const N = MAP_SIZE;
const T = (x: number, z: number): number => z * N + x;
const row = (x0: number, x1: number, z: number): number[] => Array.from({ length: x1 - x0 + 1 }, (_, i) => T(x0 + i, z));

const of = (s: SimState, k: Building['kind']): Building => {
  const b = s.buildings.find((o) => o.kind === k);
  if (!b) throw new Error(`no ${k}`);
  return b;
};
const homes = (s: SimState): Building[] => s.buildings.filter((b) => b.kind === 'home');

/** A road in from the west with homes along it, a fountain, a farm on the river land, a granary and the agora (as in the food tests). */
function village(seed = 5): Sim {
  const sim = new Sim(seed);
  sim.enqueue({ type: 'road', tiles: row(0, 56, 70) });
  const plots: number[] = [];
  for (let x = 2; x <= 18; x += 2) plots.push(T(x, 68), T(x, 71));
  sim.enqueue({ type: 'plots', at: plots });
  sim.enqueue({ type: 'fountain', at: [T(24, 71)] });
  sim.enqueue({ type: 'build', kind: 'farm', at: [T(52, 67)] });
  sim.enqueue({ type: 'build', kind: 'granary', at: [T(30, 71)] });
  sim.enqueue({ type: 'build', kind: 'agora', at: [T(20, 71)] });
  return sim;
}

/** Every home's household numbers exactly its people, with the head first. */
function checkHouseholds(s: SimState): void {
  for (const b of homes(s)) {
    expect(b.family?.members.length ?? 0).toBe(b.people);
    if (b.family) {
      expect(b.family.members[0].role).toBe('head');
      expect(b.family.members.filter((p) => p.role === 'head').length).toBe(1);
    }
  }
}

const clearAt = (sim: Sim, b: Building): void => {
  sim.enqueue({ type: 'clear', x0: b.x, z0: b.z, x1: b.x, z1: b.z });
  sim.step();
};

describe('households', () => {
  it('number exactly their home’s people through arrivals, declines, clearing and undo, and keep their head', () => {
    const sim = village();
    for (let i = 0; i < 60; i++) {
      sim.run(100);
      checkHouseholds(sim.state);
      if (i === 20) clearAt(sim, homes(sim.state)[3]);
      if (i === 21) {
        sim.enqueue({ type: 'undo' });
        sim.step();
      }
      // Take the water away for good: huts and cottages decline, and people leave.
      if (i === 30) clearAt(sim, of(sim.state, 'fountain'));
    }
    const s = sim.state;
    expect(s.left).toBeGreaterThan(0);
    expect(homes(s).some((b) => b.family?.story.some((e) => e.what === 'left'))).toBe(true);
    checkHouseholds(s);
  });

  it('have plausible names, ages that grow with the years, and a place they came from', () => {
    const sim = village();
    sim.run(1500);
    const s = sim.state;
    const people = homes(s).flatMap((b) => b.family?.members ?? []);
    expect(people.length).toBe(s.population);
    for (const p of people) expect((p.female ? WOMEN : MEN).includes(p.name)).toBe(true);
    for (const b of homes(s)) if (b.family) expect(ORIGINS.includes(b.family.origin)).toBe(true);
    // No two people in a home share a name (the lists are long enough for that).
    for (const b of homes(s)) if (b.family) expect(new Set(b.family.members.map((p) => p.name)).size).toBe(b.family.members.length);
    const someone = people[0];
    const age = ageOf(s, someone);
    sim.run(TICKS_PER_YEAR);
    expect(ageOf(sim.state, someone)).toBe(age + 1);
  });

  it('get the same names from the same seed, and naming them changes nothing else that happens', () => {
    const a = village(9);
    const b = village(9);
    a.run(2000);
    b.run(2000);
    expect(serialize(a.state)).toEqual(serialize(b.state));
    // Without names (as before households existed) the city grows the same: same people in the same homes.
    const c = village(9);
    for (let i = 0; i < 2000; i++) {
      c.step();
      for (const h of homes(c.state)) h.family = null;
    }
    const plain = (s: SimState): string => JSON.stringify(s.buildings.map((h) => [h.id, h.level, h.people, h.waterUntil, h.foodUntil, h.stock]));
    expect(plain(c.state)).toEqual(plain(a.state));
  });
});

describe('warn, then decline', () => {
  /** A village run until it has cottages, then the fountain cleared. */
  function dried(): { sim: Sim; c: Building } {
    const sim = village();
    sim.run(4800);
    const c = homes(sim.state).find((b) => b.level === COTTAGE && b.people > HOME_CAPACITY[HUT])!;
    expect(c).toBeTruthy();
    clearAt(sim, of(sim.state, 'fountain'));
    return { sim, c };
  }

  it('a home out of water warns after ten days, stays as it is for two months, then drops one level and some of the family walk out', () => {
    const { sim, c } = dried();
    const out = c.waterUntil;
    sim.run(out - sim.state.tick + WARN_AFTER - TICKS_PER_DAY);
    expect(warningOf(sim.state, c)).toBeNull();
    sim.run(2 * TICKS_PER_DAY);
    const w = warningOf(sim.state, c);
    expect(w?.need).toBe('water');
    expect(w!.left).toBeGreaterThan(DECLINE_AFTER - WARN_AFTER - 3 * TICKS_PER_DAY);
    expect(c.family?.story.at(-1)?.what).toBe('warn');
    expect(homeStatus(sim.state, map, c).detail).toMatch(/No water for .* goes back to a hut in/);
    // Still a cottage just before the two months are up.
    sim.run(out + DECLINE_AFTER - sim.state.tick - 20);
    expect(c.level).toBe(COTTAGE);
    const people = c.people;
    sim.run(40);
    expect(c.level).toBe(HUT);
    expect(c.people).toBe(Math.min(people, HOME_CAPACITY[HUT]));
    expect(c.family!.members.length).toBe(c.people);
    const story = c.family!.story;
    expect(story.some((e) => e.what === 'down' && e.need === 'water')).toBe(true);
    const left = story.find((e) => e.what === 'left');
    expect(left?.names.length).toBe(people - c.people);
    // One level at a time: the hut warns afresh, and is still a hut until another two months have passed.
    sim.run(DECLINE_AFTER - 40);
    expect(c.level).toBe(HUT);
    sim.run(40);
    expect(c.level).toBe(TENT);
    expect(c.people).toBeLessThanOrEqual(HOME_CAPACITY[TENT]);
  });

  it('water coming back in time clears the warning, and the story says so', () => {
    const { sim, c } = dried();
    sim.run(c.waterUntil - sim.state.tick + WARN_AFTER + TICKS_PER_MONTH);
    expect(warningOf(sim.state, c)).not.toBeNull();
    sim.enqueue({ type: 'undo' });
    sim.step();
    // The undo brought the fountain back only if it was within the month: rebuild it either way.
    if (!sim.state.buildings.some((b) => b.kind === 'fountain')) {
      sim.enqueue({ type: 'fountain', at: [T(24, 71)] });
      sim.step();
    }
    for (let i = 0; i < 40 && warningOf(sim.state, c); i++) sim.run(TICKS_PER_DAY * 3);
    expect(warningOf(sim.state, c)).toBeNull();
    sim.run(TICKS_PER_DAY);
    expect(c.level).toBe(COTTAGE);
    expect(c.family!.story.at(-1)?.what).toBe('relief');
    expect(c.family!.warned).toEqual([]);
  });

  it('a hut with water becomes a cottage only with a month’s bread in hand', () => {
    const sim = village();
    sim.run(1200);
    const s = sim.state;
    const h = homes(s).find((b) => b.level === HUT && b.waterUntil > s.tick + TICKS_PER_MONTH)!;
    expect(h).toBeTruthy();
    // A few days' bread: still a hut after its daily look.
    h.foodUntil = s.tick + COTTAGE_FOOD_MIN - 5 * TICKS_PER_DAY;
    for (let i = 0; i < TICKS_PER_DAY; i++) {
      sim.step();
      if (h.foodUntil < s.tick + TICKS_PER_MONTH) h.foodUntil = Math.max(h.foodUntil, s.tick + 5 * TICKS_PER_DAY);
    }
    expect(h.level).toBe(HUT);
    h.foodUntil = s.tick + COTTAGE_FOOD_MIN + TICKS_PER_DAY * 2;
    sim.run(TICKS_PER_DAY);
    expect(h.level).toBe(COTTAGE);
    expect(h.family!.story.at(-1)?.what).toBe('up');
  });
});

describe('who moves away', () => {
  it('whole families go together: never the head, never a partner or a young child without the rest of their family', () => {
    // The one-farm town of #missing, where bread is short and homes go down a level again and again.
    const sim = new Sim();
    DEMOS.missing.setup!(sim);
    let drops = 0;
    let extra = 0;
    for (let t = 0; t < 2 * TICKS_PER_YEAR; t++) {
      const before = new Map(homes(sim.state).map((b) => [b.id, { level: b.level, people: b.people }]));
      sim.step();
      for (const b of homes(sim.state)) {
        const was = before.get(b.id);
        if (!was || b.level >= was.level || !b.family) continue;
        drops++;
        const cap = HOME_CAPACITY[b.level];
        expect(b.people).toBeLessThanOrEqual(cap);
        extra += cap - b.people - Math.max(0, cap - was.people);
        const f = b.family;
        expect(f.members[0].role).toBe('head');
        const here = new Set(f.members.map((p) => p.name));
        for (const p of f.members) {
          const tied = p.role === 'wife' || p.role === 'husband' || ((p.role === 'son' || p.role === 'daughter') && ageOf(sim.state, p) < 16);
          if (tied) expect(here.has(p.kin), `${p.name}, ${p.role} of ${p.kin}, left behind`).toBe(true);
        }
      }
    }
    expect(drops).toBeGreaterThan(10);
    // Families mostly fit what has to go exactly (74 drops, none over, when written).
    expect(extra).toBeLessThanOrEqual(drops / 4);
  });
});

describe('mood and chatter', () => {
  it('a watered, fed cottage is content; one a month out of water is worried or worse, and says why', () => {
    const sim = village();
    sim.run(4800);
    const s = sim.state;
    const c = homes(s).find((b) => b.level === COTTAGE && b.waterUntil > s.tick && b.foodUntil > s.tick)!;
    const ctx = { agora: true, jobs: true };
    expect(moodOf(s, c, ctx, canWork(c)).word).toBe('Content');
    clearAt(sim, of(s, 'fountain'));
    sim.run(c.waterUntil - sim.state.tick + TICKS_PER_MONTH + WARN_AFTER);
    const m = moodOf(sim.state, c, ctx, canWork(c));
    expect(m.level).toBeLessThanOrEqual(2);
    expect(m.reasons.some((r) => r.tone < 0 && /No water for/.test(r.text))).toBe(true);
  });

  it('says the same for the same state, two different lines from people who live there, with every name filled in', () => {
    const sim = village();
    sim.run(3000);
    const s = sim.state;
    for (const b of homes(s)) {
      if (!b.family) continue;
      const a = chatterOf(s, b);
      expect(a).toEqual(chatterOf(s, b));
      expect(a.length).toBe(2);
      expect(a[0].text).not.toBe(a[1].text);
      for (const l of a) {
        expect(b.family.members.includes(l.who)).toBe(true);
        expect(l.text).not.toMatch(/[{}]/);
      }
    }
    for (const list of Object.values(LINES)) expect(list.length).toBeGreaterThanOrEqual(3);
  });

  it('goes through its lines rather than repeating one soon', () => {
    const sim = village();
    sim.run(3000);
    const b = homes(sim.state).find((h) => h.level === COTTAGE)!;
    const seen: string[] = [];
    for (let i = 0; i < 12; i++) {
      seen.push(chatterOf(sim.state, b)[1].text);
      sim.run(12 * TICKS_PER_DAY);
    }
    expect(new Set(seen).size).toBeGreaterThanOrEqual(10);
  });
});

describe('undo', () => {
  it('reaches back a month, not further', () => {
    const sim = new Sim(4);
    sim.enqueue({ type: 'road', tiles: row(30, 40, 60) });
    sim.step();
    sim.run(UNDO_WINDOW - 5);
    expect(undoRefusal(sim.state)).toBe('');
    sim.run(10);
    expect(undoRefusal(sim.state)).toMatch(/about a month/);
    sim.enqueue({ type: 'undo' });
    sim.step();
    expect(sim.state.tiles[T(35, 60)]).toBe(-1);
    expect(sim.state.undo.length).toBe(0);
  });

  it('never unplaces a home a family has moved into, or a granary with grain in it', () => {
    const sim = new Sim(4);
    sim.enqueue({ type: 'road', tiles: row(0, 14, 80) });
    sim.step();
    sim.enqueue({ type: 'plots', at: [T(4, 78)] });
    sim.step();
    while (sim.state.population === 0) sim.step();
    expect(undoRefusal(sim.state)).toMatch(/family has moved in/);
    const money = sim.state.money;
    sim.enqueue({ type: 'undo' });
    sim.step();
    expect(homes(sim.state).length).toBe(1);
    expect(sim.state.money).toBeGreaterThanOrEqual(money);
    sim.enqueue({ type: 'build', kind: 'granary', at: [T(8, 81)] });
    sim.step();
    expect(undoRefusal(sim.state)).toBe('');
    of(sim.state, 'granary').stock = 100;
    expect(undoRefusal(sim.state)).toMatch(/grain stored/);
  });
});

describe('a town that has enough', () => {
  /** Declines over three in-game years after a demo's setup. */
  function declines(setup: (sim: Sim) => void): number {
    const sim = new Sim();
    setup(sim);
    const level = new Map(homes(sim.state).map((b) => [b.id, b.level]));
    let n = 0;
    for (let t = 0; t < 3 * TICKS_PER_YEAR; t++) {
      sim.step();
      if (t % TICKS_PER_DAY) continue;
      for (const b of homes(sim.state)) {
        const was = level.get(b.id);
        if (was !== undefined && b.level < was) n++;
        level.set(b.id, b.level);
      }
    }
    return n;
  }

  it('has no homes going back and forth: #food and #workers over three years', () => {
    expect(declines(DEMOS.food.setup!)).toBe(0);
    expect(declines(DEMOS.workers.setup!)).toBe(0);
  });

  it('nor with the agora at the edge of town, where the vendor reaches the far homes late (slice 4 review)', () => {
    const edge = (sim: Sim): void => {
      DEMOS.chain.setup!(sim);
      const at = (c: Parameters<Sim['enqueue']>[0]): void => {
        sim.enqueue(c);
        sim.flush();
      };
      at({ type: 'road', tiles: row(27, 50, 63) });
      at({ type: 'build', kind: 'farm', at: [T(47, 60)] });
      at({ type: 'build', kind: 'granary', at: [T(35, 64)] });
      at({ type: 'build', kind: 'agora', at: [T(30, 64)] });
      sim.run(200);
      at({ type: 'build', kind: 'farm', at: [T(44, 60)] });
      sim.run(200);
      at({ type: 'build', kind: 'farm', at: [T(48, 64)] });
      sim.run(1200);
    };
    expect(declines(edge)).toBe(0);
  });
});
