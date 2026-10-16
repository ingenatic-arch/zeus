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
import { warningOf } from '../src/sim/folk';
import { Sim } from '../src/sim/sim';
import { townLines } from '../src/sim/status';

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
