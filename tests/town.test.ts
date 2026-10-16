/**
 * #town, the prepared town Oliver opens first, and the town's shortfall lines.
 * The town must hold what its check-in promises: every house level, every
 * kind of building, the bridge, a few hundred people, and two years of play
 * without anyone going down or leaving.
 */
import { describe, expect, it } from 'vitest';
import { DEMOS } from '../src/game/demos';
import { coastMap, type CoastMap } from '../src/map/bake';
import { FINE } from '../src/sim/buildings';
import { TICKS_PER_DAY, TICKS_PER_YEAR } from '../src/sim/clock';
import { mapIndex } from '../src/sim/build';
import { warningOf, warningsOf } from '../src/sim/folk';
import { Sim } from '../src/sim/sim';
import { BREAD_LEAD_MONTHS, BREAD_SPARE, foodBalance, townLines } from '../src/sim/status';

const map: CoastMap = coastMap();
const demo = (name: string): Sim => {
  const sim = new Sim();
  DEMOS[name].setup!(sim);
  return sim;
};

describe('#town', () => {
  const sim = demo('town');
  const s = sim.state;

  it('has every house level, every kind of building, the bridge and a few hundred people', () => {
    const lived = s.buildings.filter((b) => b.kind === 'home' && b.people > 0);
    for (let level = 1; level <= FINE; level++) expect(lived.filter((b) => b.level === level).length, `level ${level}`).toBeGreaterThan(0);
    for (const kind of ['fountain', 'farm', 'granary', 'agora', 'shrine', 'theatre']) expect(s.buildings.some((b) => b.kind === kind), kind).toBe(true);
    expect(s.population).toBeGreaterThan(300);
    expect(s.population).toBeLessThan(900);
    // A road over the river.
    const ix = mapIndex(map);
    expect(s.tiles.some((t, i) => t === -1 && ix.ground[i] === 3)).toBe(true);
    // Fed and staffed, so nothing on the shortfall line when it opens.
    expect(townLines(s, map)).toEqual([]);
    expect(s.walkers.length).toBeGreaterThan(20);
  });

  it('two years on, nobody has gone down a level or been warned for long', () => {
    const level = new Map(s.buildings.map((b) => [b.id, b.level]));
    let drops = 0;
    let warnedDays = 0;
    for (let t = 0; t < 2 * TICKS_PER_YEAR; t += TICKS_PER_DAY) {
      sim.run(TICKS_PER_DAY);
      for (const b of s.buildings) {
        if (b.kind !== 'home') continue;
        if (b.level < (level.get(b.id) ?? 0)) drops++;
        level.set(b.id, b.level);
        if (warningOf(s, b)) warnedDays++;
      }
    }
    expect(drops).toBe(0);
    // A home may be warned for a few days while a walker comes round; nobody waits weeks.
    expect(warnedDays).toBeLessThan(60);
  });
});

describe('the shortfall lines', () => {
  it('a town short of bread says how much the farms grow and the town eats, without hovering', () => {
    const lines = townLines(demo('missing').state, map);
    const bread = lines.find((l) => l.need === 'food');
    expect(bread?.text).toMatch(/^Bread: the farms grow about [\d,]+ measures of wheat a month and the town eats about [\d,]+\. .* would keep it fed\./);
    expect(bread?.at).toBeGreaterThan(0);
  });

  it('a town eating a little more than its farms grow, with full granaries, has no bread line until the stores would run out within half a year', () => {
    // #grow played on as in slice 6's check-in (the shrine, then the theatre), without more farms.
    const sim = demo('grow');
    const s = sim.state;
    const n = map.size;
    sim.enqueue({ type: 'build', kind: 'shrine', at: [35 + 78 * n] });
    sim.run(90 * TICKS_PER_DAY);
    sim.enqueue({ type: 'build', kind: 'theatre', at: [35 + 81 * n] });
    sim.run(60 * TICKS_PER_DAY);
    const bal = foodBalance(s, map);
    expect(bal.eaten).toBeGreaterThan(bal.grown);
    expect(townLines(s, map).some((l) => l.need === 'food')).toBe(false);
    // Left to grow, the line comes once the stores are within BREAD_LEAD_MONTHS of running out.
    let line = '';
    for (let d = 0; d < 200 && !line; d++) {
      sim.run(TICKS_PER_DAY);
      line = townLines(s, map).find((l) => l.need === 'food')?.text ?? '';
    }
    const m = /run empty in about (\d+) months/.exec(line);
    expect(m && Number(m[1])).toBeGreaterThan(0);
    expect(Number(m![1])).toBeLessThanOrEqual(BREAD_LEAD_MONTHS);
  });

  it('homes going without bread while the farms grow barely more than the town eats bring the bread line, with how many farms would fix it', () => {
    // A town built the way a player would: streets, a fountain, three farms, a granary and an agora, then the shrine and the theatre, and a fourth farm.
    const sim = new Sim();
    const s = sim.state;
    const n = map.size;
    const T = (x: number, z: number): number => z * n + x;
    const row = (x0: number, x1: number, z: number): number[] => Array.from({ length: x1 - x0 + 1 }, (_, i) => T(x0 + i, z));
    const col = (x: number, z0: number, z1: number): number[] => Array.from({ length: z1 - z0 + 1 }, (_, i) => T(x, z0 + i));
    const at = (t: number, c: Parameters<Sim['enqueue']>[0]): void => {
      if (s.tick < t) sim.run(t - s.tick);
      sim.enqueue(c);
      sim.flush();
    };
    at(0, { type: 'road', tiles: [...row(0, 36, 80), ...col(26, 42, 79), ...row(27, 34, 70), ...row(16, 25, 74)] });
    at(0, {
      type: 'plots',
      at: [
        ...[16, 18, 20, 22, 24, 27, 29, 31, 33].map((x) => T(x, 78)),
        ...[16, 18, 20, 22, 24, 29, 31, 33].map((x) => T(x, 81)),
        ...[16, 18, 20, 22, 24].map((x) => T(x, 72)),
        ...[16, 18, 20].map((x) => T(x, 75)),
        T(24, 76),
        T(27, 76),
        T(27, 74),
        ...[27, 29, 31, 33].map((x) => T(x, 68)),
        T(31, 71),
        T(33, 71),
        ...[66, 64, 46, 44, 42].flatMap((z) => [T(24, z), T(27, z)]),
      ],
    });
    at(100, { type: 'fountain', at: [T(27, 81)] });
    at(600, { type: 'road', tiles: row(27, 50, 63) });
    at(600, { type: 'build', kind: 'farm', at: [T(47, 60)] });
    at(600, { type: 'build', kind: 'granary', at: [T(35, 64)] });
    at(600, { type: 'build', kind: 'agora', at: [T(27, 71)] });
    at(900, { type: 'build', kind: 'farm', at: [T(44, 60)] });
    at(1200, { type: 'build', kind: 'farm', at: [T(48, 64)] });
    at(3600, { type: 'build', kind: 'shrine', at: [T(35, 78)] });
    at(3600, { type: 'fountain', at: [T(24, 48)] });
    at(3600, { type: 'build', kind: 'agora', at: [T(27, 48)] });
    at(3600, { type: 'road', tiles: row(51, 53, 63) });
    at(4500, { type: 'build', kind: 'theatre', at: [T(35, 81)] });
    at(4500, { type: 'build', kind: 'farm', at: [T(41, 60)] });
    // Whenever a home warns about bread while the farms grow less than a tenth more than the town eats, a line says so.
    let seen = '';
    for (let d = 0; d < 300; d++) {
      sim.run(TICKS_PER_DAY);
      const bal = foodBalance(s, map);
      const hungry = s.buildings.some((b) => b.kind === 'home' && warningsOf(s, b).some((w) => w.need === 'food'));
      if (!hungry || bal.grown >= bal.eaten * BREAD_SPARE) continue;
      const line = townLines(s, map).find((l) => l.need === 'food')?.text ?? '';
      expect(line, `day ${d}`).toMatch(/^Bread: .*(would keep it fed|would feed it)/);
      if (bal.grown >= bal.eaten) seen = line;
    }
    // The case the line used to miss: enough on paper, too little to spare.
    expect(seen).toMatch(/too little to spare\. (A home is|[\d,]+ homes are) already going without between harvests\. (Another farm|\w+ more farms) would keep it fed\.$/);
  });

  it('a town short of hands says how many jobs are unfilled and where', () => {
    const lines = townLines(demo('workers').state, map);
    const w = lines.find((l) => l.need === 'workers');
    expect(w?.text).toMatch(/^Workers: \d+ jobs? unfilled\. The [\w ]+ has \d+ of \d+/);
  });

  it('a town that wants for nothing has no lines', () => {
    expect(townLines(demo('fine').state, map)).toEqual([]);
    expect(townLines(demo('streets').state, map)).toEqual([]);
  });
});
