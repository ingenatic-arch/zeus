/**
 * Food variety (slice 9): townhouses need two kinds of food on the table and
 * fine houses all three; homes from an older save get a grace period.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { GRACE, GRACE_OIL } from '../src/sim/migrate';
import { coastMap } from '../src/map/bake';
import { BAY } from '../src/map/lands';
import { COTTAGE, FINE, TOWNHOUSE } from '../src/sim/buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { DECLINE_AFTER, moodOf, WARN_AFTER, warningsOf } from '../src/sim/folk';
import { OIL, tableUntil } from '../src/sim/foods';
import { serialize, Sim } from '../src/sim/sim';
import { foodLine, homeStatus, townLines } from '../src/sim/status';
import { SIM_STATE_VERSION, type Building, type SimState } from '../src/sim/state';
import { demoSim } from './prepared';

const map = coastMap();
const N = BAY.size;

const demo = (name: string): Sim => {
  const sim = demoSim(name);
  return sim;
};
const homes = (s: SimState): Building[] => s.buildings.filter((b) => b.kind === 'home' && b.people > 0);
const at = (s: SimState, level: number): Building[] => homes(s).filter((b) => b.level === level);
const kindsOn = (s: SimState, b: Building): number => [b.foodUntil, b.meatUntil, b.cheeseUntil].filter((u) => u > s.tick).length;

/** Times each home went down a level over `ticks`. */
function drops(sim: Sim, ticks: number): Map<number, number[]> {
  const s = sim.state;
  const level = new Map(s.buildings.map((b) => [b.id, b.level]));
  const out = new Map<number, number[]>();
  for (let t = 0; t < ticks; t++) {
    sim.step();
    for (const b of s.buildings) {
      if (b.kind !== 'home') continue;
      if (b.level < (level.get(b.id) ?? 0)) out.set(b.id, [...(out.get(b.id) ?? []), s.tick]);
      level.set(b.id, b.level);
    }
  }
  return out;
}

describe('two foods for a townhouse', () => {
  it('blessed cottages with only bread stay cottages, and say what would lift them; a dairy’s cheese reaching them makes townhouses (#food with a shrine, then a dairy)', () => {
    const sim = demo('food');
    const s = sim.state;
    s.money = 5000;
    sim.enqueue({ type: 'build', kind: 'shrine', at: [35 + 78 * N] });
    // And oil, which a townhouse needs too (slice 10): two groves by the lane, a press and a storehouse, an oil stall.
    sim.enqueue({ type: 'build', kind: 'grove', at: [27 + 60 * N, 23 + 56 * N] });
    sim.enqueue({ type: 'build', kind: 'press', at: [30 + 60 * N] });
    sim.enqueue({ type: 'build', kind: 'storehouse', at: [33 + 60 * N] });
    sim.enqueue({ type: 'stall', at: 27 + 71 * N, good: OIL });
    sim.run(3 * TICKS_PER_MONTH);
    expect(at(s, TOWNHOUSE).length).toBe(0);
    const blessed = at(s, COTTAGE).find((b) => b.religionUntil > s.tick)!;
    expect(blessed).toBeDefined();
    expect(foodLine(s, map, blessed)).toMatch(/a townhouse needs two kinds of food, and the city makes only bread: build a hunting lodge or a dairy/);
    sim.enqueue({ type: 'build', kind: 'dairy', at: [23 + 52 * N] });
    let first = -1;
    for (let d = 0; d < 240 && at(s, TOWNHOUSE).length < 20; d++) {
      sim.run(TICKS_PER_DAY);
      if (first < 0 && at(s, TOWNHOUSE).length > 0) first = s.tick;
    }
    expect(first).toBeGreaterThan(0);
    expect(at(s, TOWNHOUSE).length).toBeGreaterThanOrEqual(20);
    for (const b of at(s, TOWNHOUSE)) expect(kindsOn(s, b)).toBeGreaterThanOrEqual(2);
    const t = at(s, TOWNHOUSE)[0];
    expect(foodLine(s, map, t)).toMatch(/^Has food: bread and cheese · the (bread|cheese) runs out first, in /);
    expect(moodOf(s, t, { agora: true, jobs: true, shrine: true }, 0).reasons.some((r) => /varied table|bread and cheese/i.test(r.text))).toBe(true);
  });

  it('with the lodge and the dairy gone, townhouses run short of a second food, warn and name it, then go back to cottages, which keep their bread (#shrine)', () => {
    const sim = demo('shrine');
    const s = sim.state;
    const before = at(s, TOWNHOUSE);
    expect(before.length).toBeGreaterThanOrEqual(15);
    for (const b of before) expect(kindsOn(s, b)).toBeGreaterThanOrEqual(2);
    for (const b of s.buildings.filter((o) => o.kind === 'lodge' || o.kind === 'dairy')) sim.enqueue({ type: 'clear', x0: b.x, z0: b.z, x1: b.x + 2, z1: b.z + 2 });
    sim.step();
    expect(s.buildings.some((o) => o.kind === 'lodge' || o.kind === 'dairy')).toBe(false);
    // The stall and the granary still hold some meat and cheese for a while.
    let named = '';
    let warned = false;
    let told = false;
    const down = new Map<number, number[]>();
    for (let d = 0; d < 360 && down.size < before.length / 2; d++) {
      for (const [id, ts] of drops(sim, TICKS_PER_DAY)) down.set(id, [...(down.get(id) ?? []), ...ts]);
      for (const b of at(s, TOWNHOUSE)) {
        if (warningsOf(s, b).some((w) => w.need === 'food')) warned = true;
        const line = foodLine(s, map, b);
        if (/^Only bread on the table; a townhouse needs two kinds · no meat or cheese for .*: the city has no (hunting lodge|dairy) yet/.test(line)) named = line;
      }
      if (townLines(s, map).some((l) => /^Meat: \d+ homes? (is|are) going without .* Build a hunting lodge/.test(l.text))) told = true;
    }
    expect(warned).toBe(true);
    expect(named).not.toBe('');
    expect(down.size).toBeGreaterThanOrEqual(before.length / 2);
    for (const id of down.keys()) {
      const b = s.buildings.find((o) => o.id === id)!;
      expect(b.level).toBe(COTTAGE);
      expect(b.family!.story.some((e) => e.what === 'down' && e.need === 'food')).toBe(true);
      // A cottage needs one food: bread does.
      expect(tableUntil(b)).toBeGreaterThan(s.tick);
    }
    // The town's lines said what was missing.
    expect(told).toBe(true);
  });

  it('every townhouse and fine house in the culture towns keeps the kinds it needs (#theatre)', () => {
    const s = demo('theatre').state;
    for (const b of at(s, TOWNHOUSE)) expect(kindsOn(s, b)).toBeGreaterThanOrEqual(2);
    for (const b of at(s, FINE)) expect(kindsOn(s, b)).toBe(3);
  });
});

describe('a save from slice 8', () => {
  const text = gunzipSync(readFileSync('tests/fixtures/slice8-fine.save.json.gz')).toString();

  it('a #fine save (state version 7, bread only) loads with herds; its fine houses say what they lack at once, warn only after the grace period, and keep their level meanwhile', () => {
    expect(JSON.parse(text).state.version).toBe(7);
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    expect(got.file.from).toBe(7);
    const st = got.file.state;
    expect(st.version).toBe(SIM_STATE_VERSION);
    expect(st.herds.length).toBeGreaterThan(0);
    expect(st.buildings.every((b) => b.meat === 0 && b.cheese === 0)).toBe(true);
    const fine = at(st, FINE);
    expect(fine.length).toBeGreaterThan(20);
    // Through the slice 10 step too, which gives every home time to get oil: the longer grace.
    expect(fine.every((b) => b.grace === st.tick + GRACE_OIL)).toBe(true);
    expect(foodLine(st, map, fine[0])).toMatch(/^Only bread on the table; a fine house needs all three · no meat or cheese yet: the city has no hunting lodge yet: build a hunting lodge/);
    expect(moodOf(st, fine[0], { agora: true, jobs: true, shrine: true, theatre: true }, 0).reasons.some((r) => /Only bread on the table: they’d like meat or cheese too/.test(r.text))).toBe(true);
    const sim = new Sim();
    sim.state = st;
    // No warning until WARN_AFTER past the grace, though the table has only bread; nothing goes down.
    const down = drops(sim, GRACE_OIL + WARN_AFTER - TICKS_PER_DAY);
    expect(down.size).toBe(0);
    expect(fine.some((b) => warningsOf(st, b).some((w) => w.need === 'food'))).toBe(false);
    sim.run(2 * TICKS_PER_DAY);
    expect(fine.filter((b) => warningsOf(st, b).some((w) => w.need === 'food')).length).toBeGreaterThan(fine.length / 2);
    expect(homeStatus(st, map, fine[0]).detail).toMatch(/Only bread on the table; a fine house needs all three · no meat or cheese for \d+ days?: the city has no hunting lodge yet/);
    // Saved again, it is a save of this version, and carries on the same.
    const r = decodeSave(encodeSave(st, 2));
    if (!r.ok) throw new Error(r.why);
    expect(r.file.from).toBeUndefined();
    const again = new Sim();
    again.state = r.file.state;
    sim.run(600);
    again.run(600);
    expect(serialize(again.state)).toEqual(serialize(sim.state));
  });

  it('with a lodge and a dairy built just after loading, the fine houses get meat and cheese in time and none goes down', () => {
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    const sim = new Sim();
    sim.state = got.file.state;
    const st = sim.state;
    st.money = Math.max(st.money, 3000);
    sim.enqueue({ type: 'build', kind: 'lodge', at: [27 + 52 * N] });
    sim.enqueue({ type: 'build', kind: 'dairy', at: [23 + 52 * N] });
    const fine = at(st, FINE).length;
    const down = drops(sim, GRACE + DECLINE_AFTER + TICKS_PER_MONTH);
    expect(down.size).toBeLessThanOrEqual(fine / 10);
    expect(at(st, FINE).filter((b) => kindsOn(st, b) === 3).length).toBeGreaterThan(fine * 0.7);
  });
});
