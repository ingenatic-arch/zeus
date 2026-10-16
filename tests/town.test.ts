/**
 * #town, the prepared town Oliver opens first, and the town's shortfall lines.
 * The town must hold what its check-in promises: every house level, every
 * kind of building, the bridge, a few hundred people, and two years of play
 * without anyone going down or leaving.
 */
import { describe, expect, it } from 'vitest';
import { DEMOS } from '../src/game/demos';
import { coastMap, type CoastMap } from '../src/map/bake';
import { COTTAGE, FINE } from '../src/sim/buildings';
import { TICKS_PER_DAY, TICKS_PER_YEAR } from '../src/sim/clock';
import { mapIndex } from '../src/sim/build';
import { warningOf } from '../src/sim/folk';
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
    // A home may be warned for a few days while a walker comes round. Since slice 8's history (three tax
    // offices, the east street and the theatre later), the far ends of the one priestess's reach (the two
    // fine houses at the core's east end, and the first townhouses on the east street) go up to about
    // eleven days without her blessing a few times in two years: 98 warned home-days, none down a level.
    // It is not the walkers' routing (unchanged); slice 7's history had 12. Since slice 10's history (three
    // wheat farms, an oil chain up the slope from the north street's east end), the two homes at the core's far
    // east end also run a few days past their water a few times (59 home-days): 141 in all, none down a level.
    expect(warnedDays).toBeLessThan(160);
  });
});

describe('the shortfall lines', () => {
  it('a town short of bread says how much the farms grow and the town eats, without hovering', () => {
    const lines = townLines(demo('missing').state, map);
    const bread = lines.find((l) => l.need === 'food');
    expect(bread?.text).toMatch(/^Bread: the farms grow about [\d,]+ measures of wheat a month and the town eats about [\d,]+\. .* would keep it fed\./);
    expect(bread?.at).toBeGreaterThan(0);
  });

  it('a town eating more than its farms grow, with full granaries, has no bread line until the stores would run out within half a year', () => {
    // #food (bread only) with two of its three farms cleared. (Slice 6's case, #grow played on with the
    // shrine and the theatre, no longer eats more wheat than it grows: since slice 9 its townhouses and
    // fine houses share their table with cheese and meat.)
    const sim = demo('food');
    const s = sim.state;
    for (const [x, z] of [
      [44, 60],
      [48, 64],
    ])
      sim.enqueue({ type: 'clear', x0: x, z0: z, x1: x, z1: z });
    sim.flush();
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
    // #food (bread only), with a few more people in its cottages so the farms grow only a little more
    // than the town eats, and two cottages the vendor hasn't reached in a while. (Slice 7 found this case
    // by playing a town of fine houses on; since slice 9 those share their table with meat and cheese, so
    // their wheat runs well ahead, and the case is set up by hand.)
    const sim = demo('food');
    const s = sim.state;
    const cottages = s.buildings.filter((b) => b.kind === 'home' && b.level === COTTAGE && b.people > 0);
    const bal0 = foodBalance(s, map);
    // Eaten up to just under what the farms grow, a tenth short of the spare.
    let extra = Math.ceil(bal0.grown / 1.04 - bal0.eaten);
    for (let i = 0; extra > 0; i = (i + 1) % cottages.length, extra--) cottages[i].people++;
    for (const c of cottages.slice(0, 2)) c.foodUntil = s.tick - 20 * TICKS_PER_DAY;
    const bal = foodBalance(s, map);
    expect(bal.grown).toBeGreaterThanOrEqual(bal.eaten);
    expect(bal.grown).toBeLessThan(bal.eaten * BREAD_SPARE);
    const line = townLines(s, map).find((l) => l.need === 'food')?.text ?? '';
    // The case the line used to miss: enough on paper, too little to spare.
    expect(line).toMatch(/^Bread: .* too little to spare\. (A home is|[\d,]+ homes are) already going without between harvests\. (Another farm|\w+ more farms) would keep it fed\.$/);
    // Fed again, no line.
    for (const c of cottages.slice(0, 2)) c.foodUntil = s.tick + 30 * TICKS_PER_DAY;
    expect(townLines(s, map).some((l) => l.need === 'food')).toBe(false);
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
