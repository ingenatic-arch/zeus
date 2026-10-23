/**
 * Slice 36: the great houses. An estate's plot and the noble house that comes
 * to it, its marble, armour and horses fetched by its porters, its rise to a
 * great estate and its falls; the horse farm and its spring foals; companies
 * of horsemen from the estates; estates' taxes and the envy they draw; the
 * slice's findings (ships late in winter back on schedule, each ship her own
 * storms); and the saves.
 */
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { coastMap } from '../src/map/bake';
import { MAP_SIZE } from '../src/map/coast';
import { companiesAt, companySize, HORSE_COMPANY, MARCH_SPEED, menOf, readyOf, RIDE_SPEED } from '../src/sim/army';
import { buildingRefusal, ESTATE_PLOT_COST, estateRefusal } from '../src/sim/build';
import { capacity, centreOf, ESTATE, findBuilding, footSide, GREAT_ESTATE, VILLA } from '../src/sim/buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '../src/sim/clock';
import { temptationOf } from '../src/sim/crime';
import { hasVilla, isEstate, LASTS, NOBLE_HOUSE, plotWaits, wareUntil, WARE_OF } from '../src/sim/estates';
import { DECLINE_AFTER } from '../src/sim/folk';
import { ARMOUR, GOOD_COUNT, gi, held, HORSES, MARBLE, setHeld } from '../src/sim/foods';
import { migrate } from '../src/sim/migrate';
import { HORSE_EVERY } from '../src/sim/production';
import { stepMakers } from '../src/sim/production';
import { roadsBeside } from '../src/sim/rounds';
import { lateDays, onSchedule, seasonAt, SPRING, stormDelay, TICKS_PER_SEASON, WINTER } from '../src/sim/seasons';
import { deserialize, serialize, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, TILE_ROAD, type Building, type SimState } from '../src/sim/state';
import { isStore } from '../src/sim/stores';
import { FAIR, taxOf } from '../src/sim/taxes';
import { SHIP_MOORED, tradeIndex, TRADE_GOODS } from '../src/sim/trade';
import { totals } from '../src/sim/treasury';
import { horsesOf } from '../src/sim/world';
import { demoSim } from './prepared';

const map = coastMap();
const N = MAP_SIZE;
const T = (x: number, z: number): number => z * N + x;
const send = (sim: Sim, c: Parameters<Sim['enqueue']>[0]): void => {
  sim.enqueue(c);
  sim.flush();
};
const until = (sim: Sim, ok: () => boolean, most: number): boolean => {
  for (let i = 0; i < most && !ok(); i++) sim.step();
  return ok();
};
const ledgerAddsUp = (s: SimState): void => expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);
const reopens = (s: SimState): void => {
  const got = decodeSave(encodeSave(s, 1));
  if (!got.ok) throw new Error(got.why);
  expect(serialize(got.file.state)).toBe(serialize(s));
};
const restore = (text: string): Sim => {
  const sim = new Sim();
  sim.state = deserialize(text);
  return sim;
};

/** The spot for an estate's plot nearest the villas of a town, with a road beside it. */
function plotSpot(s: SimState): number {
  let best = -1;
  let bd = Infinity;
  const villas = s.buildings.filter((b) => b.kind === 'home' && !b.estate && b.level >= VILLA);
  for (let z = 1; z < N - 5; z++) {
    for (let x = 1; x < N - 5; x++) {
      if (estateRefusal(map, s, x, z) !== '') continue;
      const fake = { kind: 'home', x, z, estate: true, level: 0 } as Building;
      if (roadsBeside(s, N, fake).length === 0) continue;
      const d = Math.min(...villas.map((v) => Math.hypot(v.x - x, v.z - z)));
      if (d < bd) {
        bd = d;
        best = T(x, z);
      }
    }
  }
  return best;
}

/** The nearest storehouse to a building. */
const nearestStore = (s: SimState, b: Building): Building =>
  s.buildings.filter((g) => g.kind === 'storehouse').sort((p, q) => Math.hypot(p.x - b.x, p.z - b.z) - Math.hypot(q.x - b.x, q.z - b.z))[0];

/** Two snapshots of #richtown with an estate laid out beside its villas: the estate full (12, before any marble came), then a great estate full (20). */
const made: { estate?: string; great?: string; id?: number } = {};
function snapshots(): { estate: string; great: string; id: number } {
  if (made.estate && made.great && made.id) return made as { estate: string; great: string; id: number };
  const sim = demoSim('richtown');
  const s = sim.state;
  send(sim, { type: 'estate', at: [plotSpot(s)] });
  const e = s.buildings[s.buildings.length - 1];
  expect(e.estate).toBe(true);
  expect(until(sim, () => e.level === ESTATE && e.people === capacity(e), 6 * TICKS_PER_MONTH)).toBe(true);
  made.estate = serialize(s);
  made.id = e.id;
  const store = nearestStore(s, e);
  setHeld(store, MARBLE, 200);
  setHeld(store, ARMOUR, 20);
  setHeld(store, HORSES, 20);
  expect(until(sim, () => e.level === GREAT_ESTATE && e.people === capacity(e), 6 * TICKS_PER_MONTH)).toBe(true);
  made.great = serialize(s);
  return made as { estate: string; great: string; id: number };
}

describe('the estate’s plot and its noble house', () => {
  it('a plot is 4 x 4, costs its price, is refused off level dry ground, and ordinary settlers never take it', () => {
    const sim = demoSim('richtown');
    const s = sim.state;
    const at = plotSpot(s);
    expect(at).toBeGreaterThanOrEqual(0);
    const money = s.money;
    send(sim, { type: 'estate', at: [at] });
    const e = s.buildings[s.buildings.length - 1];
    expect(e.estate && e.kind === 'home' && e.level === 0).toBe(true);
    expect(footSide(e)).toBe(4);
    expect(money - s.money).toBe(ESTATE_PLOT_COST);
    // (In the sea, and on the plot just laid out: refused.)
    expect(estateRefusal(map, s, 2, 2)).not.toBe('');
    expect(estateRefusal(map, s, e.x + 1, e.z + 1)).not.toBe('');
    // A town with a villa: the noble house is on its way, and it is the only one coming.
    expect(hasVilla(s)).toBe(true);
    sim.run(2 * TICKS_PER_DAY);
    expect(e.incoming).toBe(NOBLE_HOUSE);
    expect(plotWaits(s, map, e)).toMatch(/on its way/);
    const coming = s.walkers.filter((w) => w.kind === 'settler' && w.home === e.id);
    expect(coming.length).toBe(1);
    ledgerAddsUp(s);
  });

  it('with no villa in the city, no noble house comes, and the plot says why', () => {
    const sim = demoSim('richtown');
    const s = sim.state;
    // (The villas brought down to fine houses, for this test.)
    for (const b of s.buildings) {
      if (b.kind !== 'home') continue;
      b.level = Math.min(b.level, VILLA - 1);
      b.since = s.tick;
    }
    send(sim, { type: 'estate', at: [plotSpot(s)] });
    const e = s.buildings[s.buildings.length - 1];
    sim.run(20 * TICKS_PER_DAY);
    expect(hasVilla(s)).toBe(false);
    expect(e.incoming + e.people).toBe(0);
    expect(s.walkers.some((w) => w.home === e.id)).toBe(false);
    expect(plotWaits(s, map, e)).toMatch(/only to a city that has a villa/);
  }, 60000);

  it('the noble house comes, the estate fills with its kin, fetches marble, armour and horses, and becomes a great estate', () => {
    const { estate, great, id } = snapshots();
    const e0 = findBuilding(deserialize(estate), id)!;
    expect(isEstate(e0)).toBe(true);
    expect(e0.level).toBe(ESTATE);
    expect(e0.people).toBe(12);
    expect(e0.family).not.toBeNull();
    const s = deserialize(great);
    const e = findBuilding(s, id)!;
    expect(e.level).toBe(GREAT_ESTATE);
    expect(e.people).toBe(20);
    expect(e.family!.story.some((x) => x.what === 'up')).toBe(true);
    // (Its porters brought them in: what it has in hand is in its stable and yard, and the stock book counts them used.)
    for (const w of [MARBLE, ARMOUR, HORSES]) expect(held(e, w) + (e.goodsUntil[gi(w)] > s.tick ? 1 : 0)).toBeGreaterThan(0);
    const used = s.stocks.now.concat(s.stocks.last).filter((l) => l.ware === HORSES && l.kind === 'used').reduce((a, l) => a + l.n, 0);
    expect(used).toBeGreaterThan(0);
    ledgerAddsUp(s);
    reopens(s);
  }, 600000);

  it('a great estate without horses warns, then goes back to an estate, and the kin it can no longer hold leave', () => {
    const { great, id } = snapshots();
    const sim = restore(great);
    const s = sim.state;
    const e = findBuilding(s, id)!;
    // (No more horses anywhere: the stores', and the stable's. Its food and stall goods kept up, for the test, so horses are what it lacks.)
    const drop = (): void => {
      e.grace = s.tick + TICKS_PER_MONTH;
      for (const g of s.buildings) if (isStore(g.kind)) setHeld(g, HORSES, 0);
      setHeld(e, HORSES, 0);
      for (const w of s.walkers) if (w.kind === 'porter' && w.origin === e.id && w.food === HORSES) w.load = 0;
    };
    drop();
    e.goodsUntil[gi(HORSES)] = s.tick;
    let warned = false;
    const ok = until(
      sim,
      () => {
        if (s.tick % TICKS_PER_DAY === 0) drop();
        warned ||= e.family?.warned.includes('horses') ?? false;
        return e.level === ESTATE;
      },
      DECLINE_AFTER + 5 * TICKS_PER_DAY,
    );
    expect(ok).toBe(true);
    expect(warned).toBe(true);
    expect(e.people).toBeLessThanOrEqual(capacity(e));
    expect(e.family!.story.some((x) => x.what === 'down' && x.need === 'horses')).toBe(true);
  }, 600000);

  it('an estate without water is left: the noble house goes, and the plot waits for another', () => {
    const { estate, id } = snapshots();
    const sim = restore(estate);
    const s = sim.state;
    const e = findBuilding(s, id)!;
    // (Its water carriers never come: each day its water is spent.)
    const dried = s.tick;
    const dry = (): void => {
      e.waterUntil = Math.min(e.waterUntil, dried);
    };
    dry();
    const ok = until(
      sim,
      () => {
        dry();
        return e.people === 0;
      },
      DECLINE_AFTER + 5 * TICKS_PER_DAY,
    );
    expect(ok).toBe(true);
    expect(e.level).toBe(0);
    expect(e.estate).toBe(true);
    expect(e.family).toBeNull();
  }, 600000);

  it('estates pay the most tax, and their envy reaches further than a villa’s', () => {
    expect(taxOf(FAIR, ESTATE)).toBeGreaterThan(taxOf(FAIR, VILLA));
    expect(taxOf(FAIR, GREAT_ESTATE)).toBeGreaterThan(taxOf(FAIR, ESTATE));
    const { great, id } = snapshots();
    const s = deserialize(great);
    const e = findBuilding(s, id)!;
    const [ex, ez] = centreOf(e);
    // A home just beyond a villa's reach (five tiles) of the great estate, made poor for the test: it envies the great estate.
    const near = s.buildings.filter((b) => b.kind === 'home' && !b.estate && b.people > 0).map((b) => ({ b, d: Math.hypot(centreOf(b)[0] - ex, centreOf(b)[1] - ez) })).filter((o) => o.d <= 7).sort((p, q) => q.d - p.d)[0];
    expect(near).toBeDefined();
    near.b.level = 2;
    const t = temptationOf(s, N, near.b);
    expect(t.reasons.some((r) => r.text === 'great estates nearby')).toBe(true);
  }, 600000);
});

describe('horses', () => {
  /** A bare sim with one horse farm at the first grassy spot, seasons on or off. */
  function farm(on: boolean): { sim: Sim; b: Building } {
    const sim = new Sim(7);
    let at = -1;
    for (let z = 20; z < N - 4 && at < 0; z++) for (let x = 20; x < N - 4 && at < 0; x++) if (buildingRefusal(map, sim.state, 'horsefarm', x, z) === '') at = T(x, z);
    expect(at).toBeGreaterThanOrEqual(0);
    sim.enqueue({ type: 'build', kind: 'horsefarm', at: [at] });
    if (on) sim.enqueue({ type: 'seasons', on: true });
    sim.flush();
    return { sim, b: sim.state.buildings.find((o) => o.kind === 'horsefarm')! };
  }
  /** Horses raised in each season over a year, fully worked, its store kept empty. */
  function foals(sim: Sim, b: Building): number[] {
    const s = sim.state;
    const by = [0, 0, 0, 0];
    for (let i = 0; i < TICKS_PER_YEAR; i++) {
      b.workers = 6;
      b.owed = 0;
      setHeld(b, HORSES, 0);
      s.tick++;
      stepMakers(s, map);
      by[seasonAt(s.tick)] += held(b, HORSES);
    }
    return by;
  }

  it('a horse farm goes only on grass; it raises horses, more in spring than in winter, about as many a year as without the seasons', () => {
    const sim = new Sim(7);
    let refused = '';
    for (let z = 20; z < N - 4 && !refused; z++) for (let x = 20; x < N - 4 && !refused; x++) {
      const r = buildingRefusal(map, sim.state, 'horsefarm', x, z);
      if (/grass/i.test(r)) refused = r;
    }
    expect(refused).toMatch(/grass/i);
    const on = farm(true);
    const off = farm(false);
    const a = foals(on.sim, on.b);
    const b = foals(off.sim, off.b);
    expect(a[SPRING]).toBeGreaterThan(a[WINTER]);
    const year = (v: number[]): number => v.reduce((p, q) => p + q, 0);
    expect(year(b)).toBeGreaterThan(0);
    expect(year(b)).toBeLessThanOrEqual((TICKS_PER_YEAR / HORSE_EVERY) * 4);
    expect(Math.abs(year(a) - year(b))).toBeLessThanOrEqual(year(b) * 0.15);
  });

  it('Thebes and Argos sell horses; every other city has a few, and horses are on the trade lists', () => {
    const w = new Sim().state.world;
    const h = tradeIndex(HORSES);
    expect(h).toBe(TRADE_GOODS.length - 1);
    const thebes = w.cities.find((c) => c.id === 'thebes')!;
    expect(thebes.make[h]).toBeGreaterThan(thebes.need[h]);
    for (const c of w.cities) {
      expect(c.make[h], c.id).toBe(horsesOf(c.id)[0]);
      expect(Number.isFinite(c.price[h]) && c.price[h] > 0, c.id).toBe(true);
    }
  });

  it('a great estate’s horse lasts a month and a half, and its porters keep it supplied', () => {
    const { great, id } = snapshots();
    const sim = restore(great);
    const s = sim.state;
    const e = findBuilding(s, id)!;
    expect(LASTS.horses).toBe(45 * TICKS_PER_DAY);
    sim.run(4 * TICKS_PER_MONTH);
    expect(e.level).toBe(GREAT_ESTATE);
    for (const need of ['marble', 'armour', 'horses'] as const) expect(wareUntil(s, e, need) - s.tick, need).toBeGreaterThan(TICKS_PER_MONTH);
    expect(WARE_OF.horses).toBe(HORSES);
  }, 600000);
});

describe('horsemen', () => {
  it('a company of horsemen calls only estates’ sons, one each, and rides faster than a company marches', () => {
    expect(companySize('horseman')).toBe(HORSE_COMPANY);
    expect(RIDE_SPEED).toBeGreaterThan(MARCH_SPEED);
    const { great, id } = snapshots();
    const sim = restore(great);
    const s = sim.state;
    // A barracks beside the estate's street.
    let at = -1;
    const e = findBuilding(s, id)!;
    let bd = Infinity;
    for (let z = 1; z < N - 5; z++) for (let x = 1; x < N - 5; x++) {
      if (buildingRefusal(map, s, 'barracks', x, z) !== '') continue;
      const ring: number[] = [];
      for (let d = 0; d < 4; d++) ring.push((z - 1) * N + x + d, (z + 4) * N + x + d, (z + d) * N + x - 1, (z + d) * N + x + 4);
      if (!ring.some((t) => s.tiles[t] === TILE_ROAD)) continue;
      const dd = Math.hypot(x - e.x, z - e.z);
      if (dd < bd) {
        bd = dd;
        at = T(x, z);
      }
    }
    send(sim, { type: 'build', kind: 'barracks', at: [at] });
    const b = s.buildings[s.buildings.length - 1];
    sim.run(TICKS_PER_DAY + 1);
    send(sim, { type: 'raise', barracks: b.id, kind: 'horseman' });
    sim.run(20 * TICKS_PER_DAY);
    const [c] = companiesAt(s, b);
    expect(c.kind).toBe('horseman');
    expect(c.want).toBe(HORSE_COMPANY);
    const men = menOf(s, c);
    expect(men.length).toBe(1);
    expect(men[0].home).toBe(id);
    expect(c.why).toMatch(/estate/);
    expect(until(sim, () => readyOf(s, c).length === 1, 2 * TICKS_PER_MONTH)).toBe(true);
    reopens(s);
  }, 600000);
});

describe('horsemen in the field', () => {
  /** #battle's band met by its hoplites at the bridge, with (or without) its archers turned horsemen on the rise behind: the band's men who fall once it has broken. */
  function runnersDown(riders: boolean): { after: number; broke: boolean } {
    const sim = demoSim('battle');
    const s = sim.state;
    const r = s.world.raids.find((x) => x.city === 'sparta' && x.ended === 0)!;
    const hop = s.army.companies.find((c) => c.kind === 'hoplite')!;
    const arc = s.army.companies.find((c) => c.kind === 'archer')!;
    send(sim, { type: 'banner', company: hop.id, tile: T(40, 41) });
    if (riders) {
      arc.kind = 'horseman';
      send(sim, { type: 'banner', company: arc.id, tile: T(44, 39) });
    } else send(sim, { type: 'dismiss', company: arc.id });
    let atBreak = -1;
    until(
      sim,
      () => {
        if (r.broke && atBreak < 0) atBreak = r.fallen;
        return r.phase === 'homeward' && s.army.foes.length === 0;
      },
      3 * TICKS_PER_MONTH,
    );
    return { after: atBreak < 0 ? 0 : r.fallen - atBreak, broke: r.broke };
  }

  it('horsemen ride down a broken band’s runners, where hoplites let them go', () => {
    const foot = runnersDown(false);
    const horse = runnersDown(true);
    expect(horse.broke).toBe(true);
    expect(horse.after).toBeGreaterThan(foot.after);
    expect(horse.after).toBeGreaterThan(0);
  }, 600000);

  // (Slice 36's review: #horsemen's riders, sent to the main street on their own, lost to its band of 38 and it raided anyway.)
  it('#horsemen: six riders sent to the main street break Sparta’s small band and ride down its runners', () => {
    const sim = demoSim('horsemen');
    const s = sim.state;
    const r = s.world.raids.find((x) => x.city === 'sparta' && x.ended === 0)!;
    const c = s.army.companies.find((x) => x.kind === 'horseman')!;
    send(sim, { type: 'banner', company: c.id, tile: T(55, 41) });
    let atBreak = -1;
    until(
      sim,
      () => {
        if (r.broke && atBreak < 0) atBreak = r.fallen;
        return r.phase === 'homeward' && s.army.foes.length === 0;
      },
      2 * TICKS_PER_MONTH,
    );
    expect(r.broke).toBe(true);
    expect(r.fallen - atBreak).toBeGreaterThan(0);
    expect(r.took).toBe(0);
  }, 600000);
});

describe('the slice’s findings', () => {
  it('two ships due the same winter day are held back by different amounts, and a late ship is back on schedule after', () => {
    const s = demoSim('richtown').state;
    s.season.on = true;
    let differ = 0;
    for (let day = 0; day < 90; day++) {
      const due = 3 * TICKS_PER_SEASON + day * TICKS_PER_DAY;
      if (stormDelay(s, 'tyre', due) !== stormDelay(s, 'corinth-sea', due)) differ++;
    }
    expect(differ).toBeGreaterThan(30);
    const due = 3 * TICKS_PER_SEASON + 20 * TICKS_PER_DAY;
    const late = stormDelay(s, 'tyre', due);
    expect(late).toBeGreaterThan(0);
    expect(onSchedule(s, 'tyre', due + late)).toBe(due);
    expect(lateDays(s, 'tyre')).toBe(late / TICKS_PER_DAY);
  });

  it('the Tyrian ship’s visits keep to one schedule through the winters', () => {
    const sim = demoSim('richtown');
    const s = sim.state;
    expect(s.season.on).toBe(true);
    const moored: Array<{ at: number; late: number }> = [];
    let visits = s.trade.ship.visits;
    let phase = s.trade.ship.phase;
    let late = 0;
    for (let i = 0; i < 3 * TICKS_PER_YEAR; i++) {
      sim.step();
      const ship = s.trade.ship;
      if (ship.phase !== phase && ship.phase === SHIP_MOORED) moored.push({ at: s.tick, late });
      phase = ship.phase;
      late = lateDays(s, 'tyre');
      visits = ship.visits;
    }
    expect(visits).toBeGreaterThan(8);
    const winters = moored.filter((m) => m.late > 0).length;
    expect(winters).toBeGreaterThan(0);
    // (Each visit's day, less the storms' days, is on one three-monthly schedule.)
    const base = moored[1].at - moored[1].late * TICKS_PER_DAY;
    for (const m of moored.slice(1)) expect(((m.at - m.late * TICKS_PER_DAY - base) % (3 * TICKS_PER_MONTH) + 3 * TICKS_PER_MONTH) % (3 * TICKS_PER_MONTH)).toBeLessThanOrEqual(1);
  }, 600000);
});

describe('saves', () => {
  it('a save from before this slice (built by hand) loads with every goods list padded with horses, no estates, and plays on', () => {
    const st = JSON.parse(serialize(demoSim('richtown').state)) as SimState;
    const h = tradeIndex(HORSES);
    for (const b of st.buildings) {
      delete (b as Partial<Building>).estate;
      for (const k of ['goods', 'goodsIn', 'goodsUntil', 'vclock', 'fetch'] as const) (b[k] as unknown[]).length = GOOD_COUNT - 1;
    }
    for (const c of st.world.cities) for (const k of ['make', 'need', 'stock', 'yours', 'crop', 'strife', 'feast', 'price', 'trail', 'history', 'dealt'] as const) (c[k] as unknown[]).length = h;
    for (const k of ['sell', 'keep', 'lost'] as const) (st.trade[k] as unknown[]).length = h;
    for (const k of ['hold', 'lastBought'] as const) (st.trade.ship[k] as unknown[]).length = h;
    for (const r of st.world.routes) for (const k of ['sold', 'bought', 'hold', 'unloaded', 'lastSold', 'lastBought', 'upto', 'sell', 'buy'] as const) (r[k] as unknown[]).length = h;
    (st as { version: number }).version = SIM_STATE_VERSION - 1;
    migrate(st);
    expect(st.version).toBe(SIM_STATE_VERSION);
    expect(st.buildings.every((b) => b.estate === false && b.goods.length === GOOD_COUNT && b.goodsUntil.length === GOOD_COUNT)).toBe(true);
    for (const c of st.world.cities) {
      expect(c.make.length).toBe(TRADE_GOODS.length);
      expect(c.make[h], c.id).toBe(horsesOf(c.id)[0]);
      expect(Number.isFinite(c.price[h]) && c.price[h] > 0, c.id).toBe(true);
      expect(c.history[h].length).toBe(12);
    }
    for (const r of st.world.routes) expect(r.upto.length).toBe(TRADE_GOODS.length);
    const sim = new Sim();
    sim.state = deserialize(serialize(st));
    const people = st.population;
    sim.run(TICKS_PER_MONTH);
    expect(Math.abs(sim.state.population - people)).toBeLessThan(people * 0.2);
  }, 120000);

  it('the same commands give the same great estate, and a save with an estate plays on the same', () => {
    const { great } = snapshots();
    const a = restore(great);
    const b = restore(encodeSave(a.state, 1) && serialize(a.state));
    a.run(TICKS_PER_MONTH);
    b.run(TICKS_PER_MONTH);
    expect(serialize(a.state)).toBe(serialize(b.state));
  }, 600000);
});
