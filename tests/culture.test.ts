import { describe, expect, it } from 'vitest';
import { DEMOS } from '../src/game/demos';
import { coastMap } from '../src/map/bake';
import { MAP_SIZE } from '../src/map/coast';
import { COST } from '../src/sim/build';
import { COTTAGE, FINE, HOME_CAPACITY, TOWNHOUSE } from '../src/sim/buildings';
import { chatterOf, LINES } from '../src/sim/chatter';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '../src/sim/clock';
import { ACTOR_RANGE, CULTURE_LASTS, PRIESTESS_RANGE, RELIGION_LASTS } from '../src/sim/culture';
import { ageOf, DECLINE_AFTER, leavingGroups, moodOf, needsOf, RISE_MIN, SETTLE, warningsOf, wantOf } from '../src/sim/folk';
import { canWork } from '../src/sim/labour';
import { distFrom } from '../src/sim/rounds';
import { deserialize, serialize, Sim } from '../src/sim/sim';
import { homeStatus } from '../src/sim/status';
import { TILE_ROAD, type Building, type SimState } from '../src/sim/state';

const map = coastMap();
const N = MAP_SIZE;
const homes = (s: SimState): Building[] => s.buildings.filter((b) => b.kind === 'home' && b.people > 0);
const of = (s: SimState, k: Building['kind']): Building => {
  const b = s.buildings.find((o) => o.kind === k);
  if (!b) throw new Error(`no ${k}`);
  return b;
};
const demo = (name: string): Sim => {
  const sim = new Sim();
  DEMOS[name].setup!(sim);
  return sim;
};

/** Times each home went down a level over `ticks` after a demo's setup. */
function drops(sim: Sim, ticks: number): Map<number, number[]> {
  const level = new Map(homes(sim.state).map((b) => [b.id, b.level]));
  const out = new Map<number, number[]>();
  for (let t = 0; t < ticks; t++) {
    sim.step();
    if (t % TICKS_PER_DAY) continue;
    for (const b of sim.state.buildings) {
      if (b.kind !== 'home') continue;
      const was = level.get(b.id);
      if (was !== undefined && b.level < was) out.set(b.id, [...(out.get(b.id) ?? []), sim.state.tick]);
      level.set(b.id, b.level);
    }
  }
  return out;
}

describe('the shrine and the theatre', () => {
  it('cost what they say, and are a shrine and a theatre', () => {
    expect(COST.shrine).toBe(200);
    expect(COST.theatre).toBe(400);
    const s = demo('theatre').state;
    expect(of(s, 'shrine').workers).toBeGreaterThan(0);
    expect(of(s, 'theatre').workers).toBeGreaterThan(0);
  });

  it('the priestess and the actor keep to the roads and their reach; blessed cottages become townhouses, and townhouses with plays fine houses', () => {
    const sim = demo('grow');
    // The food town at the moment the shrine goes in (#grow): all cottages and smaller.
    expect(homes(sim.state).every((b) => b.level <= COTTAGE)).toBe(true);
    const seen = new Map<number, string>();
    const kinds = new Set<string>();
    const run = demo('theatre');
    for (let i = 0; i < 2 * TICKS_PER_MONTH; i++) {
      run.step();
      const s = run.state;
      for (const w of s.walkers) {
        if (w.kind !== 'priestess' && w.kind !== 'actor') continue;
        kinds.add(w.kind);
        const key = `${w.route}:${w.seg}`;
        if (seen.get(w.id) === key) continue;
        seen.set(w.id, key);
        const t = w.tiles[w.seg];
        if (t < 0) continue;
        expect(s.tiles[t]).toBe(TILE_ROAD);
        const from = s.buildings.find((b) => b.id === w.origin)!;
        expect(from.kind).toBe(w.kind === 'priestess' ? 'shrine' : 'theatre');
        const d = distFrom(s, N, from)[t];
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(w.kind === 'priestess' ? PRIESTESS_RANGE : ACTOR_RANGE);
      }
    }
    expect([...kinds].sort()).toEqual(['actor', 'priestess']);
    const s = run.state;
    const town = homes(s).filter((b) => b.level === TOWNHOUSE);
    const fine = homes(s).filter((b) => b.level === FINE);
    expect(town.length + fine.length).toBeGreaterThanOrEqual(20);
    expect(fine.length).toBeGreaterThanOrEqual(10);
    for (const b of [...town, ...fine]) {
      expect(b.people).toBeLessThanOrEqual(HOME_CAPACITY[b.level]);
      // Nobody is warned: the priestess may be a day or two late, never ten.
      expect(warningsOf(s, b)).toEqual([]);
      expect(b.religionUntil).toBeLessThanOrEqual(s.tick + RELIGION_LASTS);
    }
    for (const b of fine) expect(b.cultureUntil).toBeLessThanOrEqual(s.tick + CULTURE_LASTS);
    expect(HOME_CAPACITY[TOWNHOUSE]).toBe(17);
    expect(HOME_CAPACITY[FINE]).toBe(21);
    expect(homeStatus(s, map, fine[0]).detail).toMatch(/Blessings · last/);
    expect(homeStatus(s, map, fine[0]).detail).toMatch(/Plays · last/);
  });

  it('the hamlet beyond the shrine’s reach stays cottages, and says why', () => {
    const s = demo('shrine').state;
    const cottages = homes(s).filter((b) => b.level === COTTAGE && b.religionUntil <= s.tick);
    expect(cottages.length).toBeGreaterThan(0);
    for (const c of cottages) {
      expect(wantOf(s, c)).toBe('religion');
      expect(homeStatus(s, map, c).detail).toMatch(/priestess|shrine/);
    }
  });
});

describe('going up, and staying up', () => {
  it('a cottage becomes a townhouse only with a month of everything in hand, after a month as a cottage', () => {
    const sim = demo('grow');
    sim.enqueue({ type: 'build', kind: 'shrine', at: [78 * N + 35] });
    sim.run(TICKS_PER_DAY);
    const s = sim.state;
    const c = homes(s).find((b) => b.level === COTTAGE && b.waterUntil > s.tick + RISE_MIN && b.foodUntil > s.tick + RISE_MIN)!;
    expect(c).toBeTruthy();
    const keep = (blessed: number): void => {
      c.waterUntil = Math.max(c.waterUntil, s.tick + 3 * TICKS_PER_MONTH);
      c.foodUntil = Math.max(c.foodUntil, s.tick + 3 * TICKS_PER_MONTH);
      c.religionUntil = s.tick + blessed;
    };
    // Just moved up: blessed and well supplied, but still a cottage until it has been one a month.
    c.since = s.tick;
    for (let i = 0; i < SETTLE - 2 * TICKS_PER_DAY; i++) {
      keep(2 * RISE_MIN);
      sim.step();
    }
    expect(c.level).toBe(COTTAGE);
    // Settled, but with only a few days' blessing in hand: still a cottage.
    for (let i = 0; i < 4 * TICKS_PER_DAY; i++) {
      keep(RISE_MIN - 5 * TICKS_PER_DAY);
      sim.step();
    }
    expect(c.level).toBe(COTTAGE);
    keep(RISE_MIN + 2 * TICKS_PER_DAY);
    sim.run(TICKS_PER_DAY);
    expect(c.level).toBe(TOWNHOUSE);
    expect(c.family!.story.at(-1)?.what).toBe('up');
    expect(needsOf(c)).toEqual(['water', 'food', 'religion']);
  });

  it('no homes go back and forth: the town with a shrine, and with a theatre too, over two years', () => {
    expect(drops(demo('shrine'), 2 * TICKS_PER_YEAR).size).toBe(0);
    expect(drops(demo('theatre'), 2 * TICKS_PER_YEAR).size).toBe(0);
  });
});

describe('warn, then decline, for blessings and plays', () => {
  it('with the theatre gone, fine houses warn about plays, then go back to townhouses (no further) and the families they can’t hold walk out (#closed)', () => {
    const sim = demo('closed');
    const s = sim.state;
    const fine = homes(s).filter((b) => b.level === FINE);
    expect(fine.length).toBeGreaterThan(20);
    const warned = fine.filter((b) => warningsOf(s, b).some((w) => w.need === 'culture'));
    expect(warned.length).toBeGreaterThan(15);
    expect(homeStatus(s, map, warned[0]).detail).toMatch(/No plays for .* goes back to a townhouse in/);
    // Some homes in the cut-off street warn about three needs at once.
    expect(homes(s).some((b) => warningsOf(s, b).length >= 3)).toBe(true);
    const people = new Map(warned.map((b) => [b.id, b.people]));
    const down = drops(sim, 2 * TICKS_PER_MONTH);
    for (const b of warned) {
      expect(down.has(b.id)).toBe(true);
      expect(b.level).toBe(TOWNHOUSE);
      expect(b.people).toBe(Math.min(people.get(b.id)!, HOME_CAPACITY[TOWNHOUSE]));
      expect(b.family!.members.length).toBe(b.people);
      expect(b.family!.story.some((e) => e.what === 'down' && e.need === 'culture')).toBe(true);
    }
    // One level at a time: a townhouse that just came down doesn't drop again before another DECLINE_AFTER.
    const more = drops(sim, DECLINE_AFTER - 2 * TICKS_PER_DAY);
    for (const b of warned) expect(more.has(b.id)).toBe(false);
    // With the shrine still there, they stay townhouses.
    const again = drops(sim, 6 * TICKS_PER_MONTH);
    for (const b of warned) if (b.religionUntil > sim.state.tick) expect(again.has(b.id)).toBe(false);
  });
});

describe('who leaves a big household', () => {
  it('whole families together, never the head, and as few extra as can be, quickly', () => {
    const s = demo('fine').state;
    const big = homes(s).filter((b) => b.level >= TOWNHOUSE && b.family);
    expect(big.length).toBeGreaterThan(20);
    let calls = 0;
    let over = 0;
    const start = performance.now();
    for (const b of big) {
      const f = b.family!;
      for (let n = 1; n < f.members.length; n++) {
        const groups = leavingGroups(s, f, n);
        calls++;
        const going = new Set(groups.flat());
        expect(going.size).toBe(groups.flat().length);
        expect(going.size).toBeGreaterThanOrEqual(n);
        expect(going.has(0)).toBe(false);
        over += going.size - n;
        for (let i = 0; i < f.members.length; i++) {
          if (going.has(i)) continue;
          const p = f.members[i];
          const tied = p.role === 'wife' || p.role === 'husband' || ((p.role === 'son' || p.role === 'daughter') && ageOf(s, p) < 16);
          // Whoever stays with a tie stays with the person they're tied to.
          if (tied) expect(f.members.some((q, j) => q.name === p.kin && !going.has(j)), `${p.name} left without ${p.kin}`).toBe(true);
        }
      }
    }
    const ms = performance.now() - start;
    expect(over / calls).toBeLessThan(1.5);
    expect(ms / calls).toBeLessThan(2);
  });
});

describe('mood and chatter', () => {
  it('a fine house enjoys its evenings at the theatre; a cottage the priestess doesn’t reach says so', () => {
    const s = demo('fine').state;
    const ctx = { agora: true, jobs: true, shrine: true, theatre: true };
    const fine = homes(s).find((b) => b.level === FINE && b.cultureUntil > s.tick && b.religionUntil > s.tick)!;
    const m = moodOf(s, fine, ctx, canWork(fine));
    expect(m.reasons.some((r) => r.tone > 0 && /theatre/.test(r.text))).toBe(true);
    const lonely = homes(s).find((b) => b.level === COTTAGE && b.religionUntil <= s.tick);
    if (lonely) expect(moodOf(s, lonely, ctx, canWork(lonely)).reasons.some((r) => r.tone < 0 && /priestess/.test(r.text))).toBe(true);
  });

  it('townhouses and fine houses talk about the shrine and the plays, every name filled in, and the hut’s lines stay the hut’s', () => {
    const sim = demo('fine');
    const s = sim.state;
    const said = new Set<string>();
    for (let k = 0; k < 6; k++) {
      for (const b of homes(s)) {
        if (!b.family) continue;
        const lines = chatterOf(s, b);
        expect(lines.length).toBe(2);
        for (const l of lines) {
          expect(b.family.members.includes(l.who)).toBe(true);
          expect(l.text).not.toMatch(/[{}]/);
          said.add(l.text);
        }
      }
      sim.run(12 * TICKS_PER_DAY);
    }
    const fromList = (list: readonly string[]): number => list.filter((t) => [...said].some((x) => x.split(/\s+/).slice(-3).join(' ') === t.split(/\s+/).slice(-3).join(' '))).length;
    expect(fromList(LINES.fine)).toBeGreaterThan(2);
    for (const list of [LINES.townhouse, LINES.townhousePlays, LINES.fine, LINES.cottageBlessed, LINES.noShrine, LINES.noPlays]) expect(list.length).toBeGreaterThanOrEqual(6);
  });
});

describe('saves', () => {
  it('a save round-trip carries on identically with the priestess and the actor on their rounds', () => {
    const a = demo('theatre');
    let t = 0;
    while (!(a.state.walkers.some((w) => w.kind === 'priestess' && w.seg > 2) && a.state.walkers.some((w) => w.kind === 'actor' && w.seg > 2))) {
      a.step();
      expect(++t).toBeLessThan(2000);
    }
    const b = new Sim();
    b.state = deserialize(serialize(a.state));
    a.run(1500);
    b.run(1500);
    expect(serialize(b.state)).toEqual(serialize(a.state));
  });
});
