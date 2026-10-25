// Slice 33: the turning year. The calendar from the tick, the seasons' paces (a year's harvest the same, its
// shape not), winter's storms holding ships back and armies home, the weather, the switch that keeps a bare
// town as it was, and the slice's findings in crime (the treasury's coin back from a caught thief).
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { coastMap } from '../src/map/bake';
import { BAY } from '../src/map/lands';
import { decodeSave, encodeSave } from '../src/game/saves';
import { DEMOS, thiefStreet } from '../src/game/demos';
import { JOBS } from '../src/sim/buildings';
import { dateOfTick, TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '../src/sim/clock';
import { catchThief, daysToThief, setOut, temptationOf, TREASURY_COIN, watchedLately } from '../src/sim/crime';
import { CHEESE, held, OLIVES, setHeld } from '../src/sim/foods';
import { stepMakers } from '../src/sim/production';
import {
  armiesHome,
  AUTUMN,
  FAIR,
  lateDays,
  PACES,
  paceOf,
  RAIN,
  seasonAt,
  seasonNews,
  SPRING,
  STORM,
  stormDelay,
  SUMMER,
  ticksToGrow,
  TICKS_PER_SEASON,
  weatherOn,
  WINTER,
  LATE_LEAST,
  LATE_MOST,
} from '../src/sim/seasons';
import { createState, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type Building, type SimState } from '../src/sim/state';
import { townLines } from '../src/sim/status';
import { shipNews, SHIP_AWAY } from '../src/sim/trade';
import { totals } from '../src/sim/treasury';
import { stepWild } from '../src/sim/wild';
import { demoSim } from './prepared';

const map = coastMap();
const N = BAY.size;
const T = (x: number, z: number): number => z * N + x;

/** A bare sim with one maker of `kind` at (x, z), its seasons switched as asked. */
function maker(kind: 'farm' | 'grove' | 'dairy', x: number, z: number, on: boolean): { sim: Sim; b: Building } {
  const sim = new Sim(7);
  sim.enqueue({ type: 'build', kind, at: [T(x, z)] });
  if (on) sim.enqueue({ type: 'seasons', on: true });
  sim.flush();
  const b = sim.state.buildings.find((o) => o.kind === kind);
  if (!b) throw new Error(`no ${kind}`);
  return { sim, b };
}

/** Its harvests (or batches) by the season they came in, over `ticks` from the founding, fully worked and its store kept empty. */
function harvests(sim: Sim, b: Building, ware: number, ticks: number): number[] {
  const s = sim.state;
  const by = [0, 0, 0, 0];
  for (let i = 0; i < ticks; i++) {
    b.workers = JOBS[b.kind as keyof typeof JOBS];
    b.owed = 0;
    setHeld(b, ware, 0);
    s.tick++;
    stepMakers(s, map);
    by[seasonAt(s.tick)] += held(b, ware);
  }
  return by;
}

describe('the calendar', () => {
  it('starts in spring on 1 March and turns every three months, the year keeping its length', () => {
    expect(dateOfTick(0).month).toBe(2);
    expect(seasonAt(0)).toBe(SPRING);
    expect(seasonAt(TICKS_PER_SEASON - 1)).toBe(SPRING);
    expect(seasonAt(TICKS_PER_SEASON)).toBe(SUMMER);
    expect(dateOfTick(TICKS_PER_SEASON).month).toBe(5); // June
    expect(seasonAt(2 * TICKS_PER_SEASON)).toBe(AUTUMN);
    expect(dateOfTick(2 * TICKS_PER_SEASON).month).toBe(8); // September
    expect(seasonAt(3 * TICKS_PER_SEASON)).toBe(WINTER);
    expect(dateOfTick(3 * TICKS_PER_SEASON).month).toBe(11); // December
    expect(seasonAt(TICKS_PER_YEAR)).toBe(SPRING);
    expect(4 * TICKS_PER_SEASON).toBe(TICKS_PER_YEAR);
  });

  it('every pace averages one over the year, and is one with the switch off', () => {
    for (const p of Object.values(PACES)) expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(4, 10);
    const s = createState();
    expect(s.season.on).toBe(false);
    for (const tick of [0, 1000, 2000, 3000]) {
      s.tick = tick;
      for (const r of ['wheat', 'fruit', 'flock', 'wild'] as const) expect(paceOf(s, r)).toBe(1);
    }
    expect(seasonNews(s)).toBeNull();
    expect(weatherOn(s, 300)).toBe(FAIR);
    expect(stormDelay(s, 'tyre', 3 * TICKS_PER_SEASON + 10)).toBe(0);
  });

  it('works out how long a crop takes through the seasons ahead', () => {
    const s = createState();
    s.season.on = true;
    // Late summer: the rest of summer at 1.1, then autumn at 1.4.
    s.tick = 2 * TICKS_PER_SEASON - 100;
    const t = ticksToGrow(s, 'wheat', 300, 1);
    expect(t).toBeCloseTo(100 + (300 - 110) / 1.4, 6);
    expect(ticksToGrow(s, 'wheat', 300, 0)).toBe(Infinity);
    s.season.on = false;
    expect(ticksToGrow(s, 'wheat', 300, 0.5)).toBe(600);
  });
});

describe('the rhythm of the year', () => {
  it('a farm brings in about what it did in a year, most of it in autumn and least in winter', () => {
    const off = maker('farm', 52, 67, false);
    const on = maker('farm', 52, 67, true);
    const a = harvests(off.sim, off.b, 0, TICKS_PER_YEAR);
    const b = harvests(on.sim, on.b, 0, TICKS_PER_YEAR);
    const sum = (xs: number[]): number => xs.reduce((p, q) => p + q, 0);
    const one = Math.max(...a.filter((x) => x > 0)) / 2;
    // Within one harvest over the year.
    expect(Math.abs(sum(b) - sum(a))).toBeLessThanOrEqual(Math.max(...b) + one);
    expect(b[AUTUMN]).toBeGreaterThan(b[WINTER]);
    expect(b[AUTUMN]).toBeGreaterThan(a[AUTUMN]);
    expect(b[WINTER]).toBeLessThan(a[WINTER]);
  });

  it('a grove’s olives are picked mostly in autumn', () => {
    const on = maker('grove', 83, 23, true);
    const b = harvests(on.sim, on.b, OLIVES, 2 * TICKS_PER_YEAR);
    expect(b[AUTUMN]).toBeGreaterThan(b[SPRING]);
    expect(b[AUTUMN]).toBeGreaterThan(b[WINTER]);
  });

  it('a dairy gives most in spring, when the goats kid, and least in winter', () => {
    const on = maker('dairy', 50, 38, true);
    const b = harvests(on.sim, on.b, CHEESE, TICKS_PER_YEAR);
    expect(b[SPRING]).toBeGreaterThan(b[SUMMER]);
    expect(b[SUMMER]).toBeGreaterThan(b[WINTER]);
  });

  it('the wild herds grow back faster in spring', () => {
    const regrown = (tick: number): number => {
      const s = createState();
      s.season.on = true;
      s.tick = tick;
      const h = s.herds[0];
      h.head = h.full - 1;
      h.grow = 100;
      let n = 0;
      while (h.head < h.full && n < 1000) {
        s.tick++;
        stepWild(s, map);
        n++;
      }
      return n;
    };
    expect(regrown(10)).toBeLessThan(regrown(TICKS_PER_SEASON + 10));
    expect(regrown(TICKS_PER_SEASON + 10)).toBeLessThan(regrown(3 * TICKS_PER_SEASON + 10));
  });
});

describe('winter at sea and on land', () => {
  it('a ship due in winter is held back a week or two, and one due in summer is on time', () => {
    const s = createState();
    s.season.on = true;
    for (let day = 0; day < 90; day += 7) {
      const due = 3 * TICKS_PER_SEASON + day * TICKS_PER_DAY;
      const late = stormDelay(s, 'tyre', due);
      expect(late).toBeGreaterThanOrEqual(LATE_LEAST * TICKS_PER_DAY);
      expect(late).toBeLessThanOrEqual(LATE_MOST * TICKS_PER_DAY);
      expect(lateDays(s, 'tyre')).toBe(late / TICKS_PER_DAY);
    }
    expect(stormDelay(s, 'tyre', TICKS_PER_SEASON + 40)).toBe(0);
    expect(lateDays(s, 'tyre')).toBe(0);
  });

  it('the merchant ship of a winter visit says she is late, and why', () => {
    const sim = demoSim('richtown');
    const s = sim.state;
    // Played on to a visit due in winter.
    let found = false;
    for (let i = 0; i < 3 * TICKS_PER_YEAR && !found; i++) {
      sim.step();
      found = s.trade.ship.phase === SHIP_AWAY && seasonAt(s.trade.ship.due) === WINTER && lateDays(s, 'tyre') > 0;
    }
    expect(found).toBe(true);
    const news = shipNews(s)!;
    expect(news.short).toMatch(/^Ship late/);
    expect(news.line).toMatch(/late: winter storms in the gulf held her back \d+ days/);
  });

  it('winter keeps most rulers’ bands at home, two times in three', () => {
    const s = createState();
    s.season.on = true;
    let winter = 0;
    let summer = 0;
    for (let salt = 0; salt < 3000; salt++) {
      if (armiesHome(s, 3 * TICKS_PER_SEASON + 40, salt)) winter++;
      if (armiesHome(s, TICKS_PER_SEASON + 40, salt)) summer++;
    }
    expect(summer).toBe(0);
    expect(winter / 3000).toBeGreaterThan(0.6);
    expect(winter / 3000).toBeLessThan(0.73);
    s.season.on = false;
    expect(armiesHome(s, 3 * TICKS_PER_SEASON + 40, 1)).toBe(false);
  });
});

describe('the weather', () => {
  it('rains most in winter, hardly in summer, and storms only in late autumn and winter', () => {
    const s = createState();
    s.season.on = true;
    const wet = [0, 0, 0, 0];
    const storms = [0, 0, 0, 0];
    for (let day = 0; day < 360 * 20; day++) {
      const w = weatherOn(s, day);
      const season = seasonAt(day * TICKS_PER_DAY);
      if (w !== FAIR) wet[season]++;
      if (w === STORM) storms[season]++;
      expect([FAIR, RAIN, STORM]).toContain(w);
    }
    expect(wet[WINTER]).toBeGreaterThan(wet[SPRING]);
    expect(wet[SPRING]).toBeGreaterThan(wet[SUMMER]);
    expect(storms[SPRING] + storms[SUMMER]).toBe(0);
    expect(storms[WINTER]).toBeGreaterThan(storms[AUTUMN]);
    // The same town, the same weather.
    expect(Array.from({ length: 50 }, (_, d) => weatherOn(s, d))).toEqual(Array.from({ length: 50 }, (_, d) => weatherOn(s, d)));
  });
});

describe('the winter line', () => {
  it('warns in late autumn when the granaries won’t carry the town to spring, and not with the seasons off', () => {
    const sim = demoSim('seasons');
    const s = sim.state;
    // Late November of its year, the granaries and stalls emptied and all but one farm left without workers.
    s.tick = Math.floor(s.tick / TICKS_PER_YEAR) * TICKS_PER_YEAR + 8 * TICKS_PER_MONTH + 19 * TICKS_PER_DAY;
    expect(seasonAt(s.tick)).toBe(AUTUMN);
    for (const b of s.buildings) if (b.kind === 'granary' || b.kind === 'agora') b.stock = 0;
    const farms = s.buildings.filter((b) => b.kind === 'farm');
    for (const f of farms.slice(1)) f.workers = 0;
    const line = townLines(s, sim.map).find((l) => l.need === 'season');
    expect(line?.text).toMatch(/^Winter in 11 days: the fields give little until spring, about [\d,]+ measures of wheat a month against the [\d,]+ the town eats/);
    s.season.on = false;
    expect(townLines(s, sim.map).some((l) => l.need === 'season')).toBe(false);
  });
});

describe('the switch and the saves', () => {
  it('a new game, every demo’s history and an old save have the seasons on; a bare state has them off', () => {
    expect(createState().season.on).toBe(false);
    const sim = new Sim();
    DEMOS.streets.setup!(sim);
    expect(sim.state.season.on).toBe(true);
    // From the first tick of its history.
    expect(sim.log[0].command).toEqual({ type: 'seasons', on: true });
  });

  it('the same town played a year with the seasons on gives the same state twice', () => {
    const a = demoSim('town');
    const b = demoSim('town');
    a.run(TICKS_PER_YEAR);
    b.run(TICKS_PER_YEAR);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
    expect(a.state.season.on).toBe(true);
  });

  it('a slice 30 save loads with the seasons on and plays on', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/slice30-nowatch.save.json.gz')).toString();
    // (Slice 30's version on the trunk, a literal as in the other save tests: another line's slice may merge between.)
    expect(JSON.parse(text).state.version).toBe(28);
    const d = decodeSave(text);
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    const s = d.file.state;
    expect(s.version).toBe(SIM_STATE_VERSION);
    expect(s.season).toEqual({ on: true, late: {} });
    const sim = new Sim();
    sim.state = s;
    sim.run(TICKS_PER_MONTH);
    expect(sim.state.population).toBeGreaterThan(0);
    // And round-trips.
    const back = decodeSave(encodeSave(sim.state, 1));
    expect(back.ok && back.file.state.season).toEqual(sim.state.season);
  });
});

const street0 = (s: SimState): Building[] => thiefStreet(s).filter((b) => b.people > 0);

describe('slice 30’s findings', () => {
  it('#thieves’ core has a watch post whose round stops short of the hut street, and its first thief is still a few days off', () => {
    const sim = demoSim('thieves');
    const s: SimState = sim.state;
    const posts = s.buildings.filter((b) => b.kind === 'watchpost');
    expect(street0(s).some((b) => daysToThief(b, temptationOf(s, map.size, b)) <= 6) || s.walkers.some((w) => w.kind === 'thief')).toBe(true);
    // (A history is played with fire off, so the watchman has been out little: a few weeks of his rounds. Since
    // the crews of walkers changed the history, #thieves opens as he walks home from the west bank: 30 days.)
    sim.run(30 * TICKS_PER_DAY);
    // The core's (at the west end of its north street), beside the west bank's.
    expect(posts.some((b) => b.x >= 60 && b.x <= 87 && b.z >= 30 && b.z <= 43)).toBe(true);
    const street = street0(s);
    expect(street.length).toBeGreaterThan(0);
    for (const b of street) expect(watchedLately(s, map.size, b)).toBe(false);
    // His round takes him by homes of the core (slice 36: within a month; with the ships back on their schedule after a winter it opens ten days sooner, his round then out along the far end), and never by the hut street.
    const core = s.buildings.filter((b) => b.kind === 'home' && b.people > 0 && b.x >= 62 && b.x <= 86 && b.z >= 31 && b.z <= 42);
    let by = false;
    for (let d = 14; d < 30 && !by; d += 2) {
      by = core.some((b) => watchedLately(s, map.size, b));
      for (const b of street0(s)) expect(watchedLately(s, map.size, b)).toBe(false);
      if (!by) sim.run(2 * TICKS_PER_DAY);
    }
    expect(by).toBe(true);
  });

  it('a thief caught with the tax office’s coin after the office has gone hands it back to the treasury', () => {
    const sim = demoSim('richtown');
    const s: SimState = sim.state;
    const office = s.buildings.find((b) => b.kind === 'taxoffice')!;
    const home = s.buildings.find((b) => b.kind === 'home' && b.people > 0 && b.family)!;
    const w = setOut(s, map.size, home, office);
    expect(w).not.toBeNull();
    if (!w) return;
    // As if he had robbed it: the coin out of the treasury, marked as the treasury's.
    sim.enqueue({ type: 'clear', x0: office.x, z0: office.z, x1: office.x, z1: office.z });
    sim.flush();
    expect(s.buildings.some((b) => b.id === office.id)).toBe(false);
    w.food = TREASURY_COIN;
    w.load = 20;
    w.back = true;
    const before = s.money;
    catchThief(s, map, w);
    expect(s.money - before).toBeGreaterThanOrEqual(20);
    expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);
  });
});
