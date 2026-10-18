/**
 * Raiders at the edge (slice 20): a threat from a tribute refused by a cold
 * ruler (and none from a wary one, none before the first route), its
 * deadline, one at a time, the lull, nothing else asked meanwhile; the
 * band's phases as a pure function of the tick; on your map: in at the edge
 * nearest their city, to the field or store nearest that edge, fire and
 * plunder, off again, people indoors; paid off, goods in time, a gift past
 * cold; the memories; saves and determinism.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { DEMOS } from '../src/game/demos';
import { decodeSave, encodeSave } from '../src/game/saves';
import { coastMap } from '../src/map/bake';
import { findBuilding } from '../src/sim/buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '../src/sim/clock';
import { firstRoute, makeTribute, openDeals, stepFavours, tributeSize, WORTH } from '../src/sim/favours';
import { held, WARES, type Ware } from '../src/sim/foods';
import { FIRE_BURNING } from '../src/sim/hazards';
import {
  bandsAt,
  daysToEdge,
  GATHER,
  landing,
  LULL,
  marchTicks,
  mayThreaten,
  raidChip,
  raidersOf,
  raidOnMap,
  reachesEdge,
  sheltering,
  stepRaids,
  THREAT_DAYS,
  worthRaiding,
} from '../src/sim/raids';
import { deserialize, serialize, Sim } from '../src/sim/sim';
import type { CityId } from '../src/map/greece';
import { SIM_STATE_VERSION, type Raid, type SimState } from '../src/sim/state';
import { bookNow } from '../src/sim/stocks';
import { townLines } from '../src/sim/status';
import { totals } from '../src/sim/treasury';
import { position } from '../src/sim/walk';
import { cityOf, COLD, moodOf, moodReasons } from '../src/sim/world';

const map = coastMap();

/** The demos' towns, set up once and copied for each test. */
const made: Record<string, string> = {};
const fresh = (name: string): Sim => {
  if (!made[name]) {
    const sim = new Sim();
    DEMOS[name].setup!(sim);
    made[name] = serialize(sim.state);
  }
  const sim = new Sim();
  sim.state = deserialize(made[name]);
  return sim;
};
const send = (sim: Sim, c: Parameters<Sim['enqueue']>[0]): void => {
  sim.enqueue(c);
  sim.flush();
};
const ledgerAddsUp = (s: SimState): void => expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);
const until = (sim: Sim, ok: () => boolean, most: number): boolean => {
  for (let i = 0; i < most && !ok(); i++) sim.step();
  return ok();
};
/** A ruler made cold (an old wrong, long remembered). */
const chill = (s: SimState, city: CityId): void => {
  cityOf(s.world, city).memories.push({ kind: 'history', why: 'an old wrong', amount: -40, tick: s.tick, fade: 10 * TICKS_PER_YEAR });
};
/** #caravan's town with its first route a year and more behind it (so the first year's rule doesn't stretch the times). */
const settled = (): Sim => {
  const sim = fresh('caravan');
  for (const r of sim.state.world.routes) r.opened = Math.max(1, r.opened - TICKS_PER_YEAR);
  // (And coin enough to pay them off.)
  sim.state.money += 5000;
  sim.state.ledger.start += 5000;
  return sim;
};
/** A cold ruler demands tribute and is refused: the threat that follows. */
const threatened = (sim: Sim, city: CityId = 'sparta'): Raid => {
  const s = sim.state;
  chill(s, city);
  const c = cityOf(s.world, city);
  const d = makeTribute(s, map, c, -1, tributeSize(s, c, -1, false), false);
  send(sim, { type: 'answer', deal: d.id, act: 'refuse' });
  const r = s.world.raids.find((x) => x.city === city && x.ended === 0);
  if (!r) throw new Error('no threat');
  return r;
};
/** The band in your city: the threat refused, the march run. */
const inTheCity = (sim: Sim, city: CityId = 'sparta'): Raid => {
  const r = threatened(sim, city);
  send(sim, { type: 'answer', deal: r.deal, act: 'refuse' });
  until(sim, () => r.phase === 'raiding', GATHER + marchTicks(city) + 10);
  expect(r.phase).toBe('raiding');
  return r;
};

describe('the threat', () => {
  it('a tribute refused by a cold ruler threatens at once; by a wary one, not', () => {
    for (const cold of [false, true]) {
      const sim = settled();
      const s = sim.state;
      const c = cityOf(s.world, 'sparta');
      if (cold) chill(s, 'sparta');
      const d = makeTribute(s, map, c, -1, tributeSize(s, c, -1, false), false);
      send(sim, { type: 'answer', deal: d.id, act: 'refuse' });
      expect(s.world.raids.length).toBe(cold ? 1 : 0);
      expect(d.angry).toBe(false);
      if (!cold) continue;
      const r = s.world.raids[0];
      const t = s.world.deals.find((x) => x.id === r.deal)!;
      expect(t.kind).toBe('threat');
      expect(t.due - s.tick).toBeGreaterThanOrEqual(THREAT_DAYS);
      expect(r.coin).toBeGreaterThanOrEqual(300);
      expect(r.men).toBeGreaterThanOrEqual(8);
      expect(r.men).toBeLessThanOrEqual(12);
      // On the town lines, and as news that can't wait.
      expect(townLines(s, map).find((l) => l.need === 'raid')?.text).toMatch(/threatens your city: pay [\d,]+ dr/);
      expect(s.world.news.at(-1)?.urgent).toBe(true);
    }
  }, 60000);

  it('no band at your edge within a year of your first route, whether you wait or refuse', () => {
    for (const act of ['wait', 'refuse']) {
      const sim = fresh('caravan');
      const s = sim.state;
      const first = firstRoute(s.world);
      expect(s.tick - first).toBeLessThan(TICKS_PER_YEAR);
      const r = threatened(sim);
      if (act === 'refuse') send(sim, { type: 'answer', deal: r.deal, act: 'refuse' });
      expect(reachesEdge(s, r)).toBeGreaterThanOrEqual(first + TICKS_PER_YEAR);
    }
  }, 60000);

  it('none before the first route, even from a hostile warlike ruler', () => {
    const sim = fresh('town');
    const s = sim.state;
    expect(s.world.routes.length).toBe(0);
    cityOf(s.world, 'sparta').memories.push({ kind: 'history', why: 'x', amount: -90, tick: s.tick, fade: 0 });
    const t0 = Math.ceil(s.tick / TICKS_PER_MONTH) * TICKS_PER_MONTH;
    for (let m = 0; m < 24; m++) {
      s.tick = t0 + m * TICKS_PER_MONTH;
      stepRaids(s, map);
    }
    expect(s.world.raids).toEqual([]);
  }, 60000);

  it('one at a time: a second refused while one is live waits its turn, after the lull', () => {
    const sim = settled();
    const s = sim.state;
    const r = threatened(sim, 'sparta');
    chill(s, 'corinth');
    const c = cityOf(s.world, 'corinth');
    const d = makeTribute(s, map, c, -1, tributeSize(s, c, -1, false), false);
    send(sim, { type: 'answer', deal: d.id, act: 'refuse' });
    expect(s.world.raids.length).toBe(1);
    expect(d.angry).toBe(true);
    // Paid off: the lull (three months for anyone, a year for Sparta), then Corinth's threat on a month's turn.
    send(sim, { type: 'answer', deal: r.deal, act: 'send' });
    until(sim, () => r.ended > 0, 2 * TICKS_PER_MONTH);
    expect(r.end).toBe('paid');
    expect(mayThreaten(s, 'corinth')).toBe(false);
    until(sim, () => s.world.raids.length > 1, 5 * TICKS_PER_MONTH);
    const next = s.world.raids[1];
    expect(next.city).toBe('corinth');
    expect(next.start - r.ended).toBeGreaterThanOrEqual(3 * TICKS_PER_MONTH);
    expect(d.angry).toBe(false);
    expect(mayThreaten(s, 'sparta')).toBe(false);
    s.tick = r.ended + LULL + 1;
    next.ended = 1;
    expect(mayThreaten(s, 'sparta')).toBe(true);
  }, 120000);

  it('while a threat is live no ruler asks anything new, and a yearly tribute coming round waits', () => {
    const sim = settled();
    const s = sim.state;
    const c = cityOf(s.world, 'athens');
    const y = makeTribute(s, map, c, -1, tributeSize(s, c, -1, true), true);
    y.state = 'met';
    y.paid = 1;
    y.ended = s.tick;
    y.until = s.tick + 3 * TICKS_PER_MONTH;
    threatened(sim);
    const deals = s.world.deals.length;
    const t0 = Math.ceil(s.tick / TICKS_PER_MONTH) * TICKS_PER_MONTH;
    for (let day = 0; day < 6 * 30; day++) {
      s.tick = t0 + day * TICKS_PER_DAY;
      stepFavours(s, map);
    }
    expect(s.world.deals.length).toBe(deals);
    expect(y.state).toBe('met');
    expect(y.until).toBeGreaterThan(s.tick);
    expect(openDeals(s.world).filter((d) => d.kind !== 'threat')).toEqual([]);
  }, 60000);
});

describe('the band on the map of Greece', () => {
  it('gathers, marches, and its place is a pure function of the tick; the chip counts the days', () => {
    const sim = settled();
    const s = sim.state;
    const r = threatened(sim);
    expect(raidOnMap(r, s.tick)).toBe(null);
    expect(raidChip(s, r)).toBe(null);
    send(sim, { type: 'answer', deal: r.deal, act: 'refuse' });
    expect(r.phase).toBe('gathering');
    expect(raidOnMap(r, s.tick)?.gathering).toBe(true);
    const days = daysToEdge(r, s.tick);
    expect(days).toBe(Math.ceil((GATHER + marchTicks('sparta')) / TICKS_PER_DAY));
    expect(raidChip(s, r)?.chip).toBe(`Sparta’s raiders · ${days} days`);
    until(sim, () => r.phase === 'marching', GATHER + 1);
    const a = raidOnMap(r, s.tick)!.along;
    const later = raidOnMap(r, s.tick + 50)!.along;
    expect(later).toBeLessThan(a);
    expect(raidOnMap(r, s.tick + 50)).toEqual(raidOnMap(r, s.tick + 50));
    expect(daysToEdge(r, s.tick)).toBeLessThan(days);
  }, 60000);
});

describe('on your map', () => {
  it('in at the edge nearest their city, to the field nearest it; never a house', () => {
    const s = fresh('caravan').state;
    const size = map.size;
    const sparta = landing(s, map, 'sparta')!;
    expect(sparta.edge % size).toBe(0);
    expect(sparta.path[0][0]).toBeLessThan(0);
    const corinth = landing(s, map, 'corinth')!;
    expect(Math.floor(corinth.edge / size)).toBe(0);
    const troy = landing(s, map, 'troy')!;
    expect(troy.edge % size).toBe(size - 1);
    for (const l of [sparta, corinth, troy]) {
      expect(worthRaiding(l.target)).toBe(true);
      expect(l.target.kind).not.toBe('home');
    }
    expect(s.buildings.filter((b) => b.kind === 'home').some(worthRaiding)).toBe(false);
  }, 60000);

  it('a field set alight and its barn carried off (the stock book and the ledger say so), and off the map again', () => {
    const sim = settled();
    const s = sim.state;
    const r = inTheCity(sim);
    const band = raidersOf(s, r)!;
    expect(band.people).toBe(r.men);
    const farm = findBuilding(s, r.target)!;
    expect(farm.kind).toBe('farm');
    until(sim, () => r.took > 0, TICKS_PER_MONTH);
    expect(r.fired).toBe(true);
    expect(findBuilding(s, r.target)?.fire ?? FIRE_BURNING).toBe(FIRE_BURNING);
    expect(band.back).toBe(true);
    expect(band.load).toBe(r.took);
    expect(r.took).toBeLessThanOrEqual(r.men * 80);
    const lost = bookNow(s).now.find((l) => l.kind === 'lost' && l.what === 'raid:sparta');
    expect(lost?.n).toBe(r.took);
    expect(s.ledger.now.find((l) => l.kind === 'raid')?.n).toBe(r.took);
    ledgerAddsUp(s);
    until(sim, () => !raidersOf(s, r), TICKS_PER_MONTH);
    expect(raidersOf(s, r)).toBeUndefined();
    expect(r.end).toBe('raided');
    expect(r.phase).toBe('homeward');
    expect(s.world.deals.find((d) => d.id === r.deal)?.state).toBe('raided');
  }, 120000);

  it('a store plundered: never more than half of it', () => {
    const sim = settled();
    const s = sim.state;
    // (Troy's band comes in from the east, where the storehouse stands nearest.)
    const l = landing(s, map, 'troy')!;
    expect(l.target.kind).toBe('storehouse');
    const before = WARES.map((w) => held(l.target, w));
    const r = inTheCity(sim, 'troy');
    until(sim, () => r.took > 0, TICKS_PER_MONTH);
    const store = findBuilding(s, r.target)!;
    expect(r.took).toBeGreaterThan(0);
    expect(r.took).toBeLessThanOrEqual(Math.floor(before[WARES.indexOf(r.ware as Ware)] / 2));
    expect(held(store, r.ware as Ware)).toBeLessThan(before[WARES.indexOf(r.ware as Ware)]);
    expect(bookNow(s).now.find((x) => x.kind === 'lost' && x.what === 'raid:troy')?.n).toBe(r.took);
  }, 120000);

  it('walkers near the band run indoors (stop, unseen), but not the watchmen', () => {
    const sim = settled();
    const s = sim.state;
    const r = inTheCity(sim);
    const band = raidersOf(s, r)!;
    const [x, z] = position(band);
    const bands = bandsAt(s);
    expect(bands).toEqual([x, z]);
    const near = { ...band, kind: 'water' as const, path: [x + 2, z, x + 3, z], seg: 0, along: 0 };
    expect(sheltering(bands, near)).toBe(true);
    expect(sheltering(bands, { ...near, kind: 'watchman' })).toBe(false);
    expect(sheltering(bands, { ...near, path: [x + 20, z, x + 21, z] })).toBe(false);
  }, 120000);
});

describe('stopping them', () => {
  it('coin paid while the band marches: paid at once, the band turns round on the map, the ledger adds up', () => {
    const sim = settled();
    const s = sim.state;
    const r = threatened(sim);
    send(sim, { type: 'answer', deal: r.deal, act: 'refuse' });
    until(sim, () => r.phase === 'marching', GATHER + 1);
    sim.run(30);
    const money = s.money;
    const at = raidOnMap(r, s.tick)!.along;
    send(sim, { type: 'answer', deal: r.deal, act: 'send' });
    expect(s.money).toBe(money - r.coin);
    expect(s.ledger.now.find((l) => l.kind === 'peace')?.amount).toBe(-r.coin);
    expect(r.phase).toBe('turned');
    expect(r.end).toBe('paid');
    expect(raidOnMap(r, s.tick)!.along).toBeCloseTo(at, 5);
    expect(raidOnMap(r, s.tick + 10)!.along).toBeGreaterThan(at);
    expect(raidOnMap(r, s.tick)!.homeward).toBe(true);
    ledgerAddsUp(s);
    const c = cityOf(s.world, 'sparta');
    expect(c.memories.at(-1)?.kind).toBe('peace');
  }, 60000);

  it('coin paid while they are in your city: they turn for the edge with what they have', () => {
    const sim = settled();
    const s = sim.state;
    const r = inTheCity(sim);
    sim.run(20);
    send(sim, { type: 'answer', deal: r.deal, act: 'send' });
    expect(r.end).toBe('paid');
    sim.step();
    const band = raidersOf(s, r)!;
    expect(band.back).toBe(true);
    until(sim, () => !raidersOf(s, r), TICKS_PER_MONTH);
    expect(r.took).toBe(0);
    expect(r.fired).toBe(false);
    ledgerAddsUp(s);
  }, 120000);

  it('the goods sent: they count on arrival and the threat is lifted (the ruler waits for them)', () => {
    const sim = settled();
    const s = sim.state;
    const r = threatened(sim);
    expect(r.alt).toBeGreaterThanOrEqual(0);
    send(sim, { type: 'answer', deal: r.deal, act: 'goods' });
    const d = s.world.deals.find((x) => x.id === r.deal)!;
    expect(d.gift).toBeGreaterThan(0);
    // (Past the day, the ruler waits for what is on its way.)
    until(sim, () => r.ended > 0, d.due - s.tick + 3 * TICKS_PER_MONTH);
    expect(r.end).toBe('paid');
    expect(r.phase).toBe('done');
  }, 120000);

  it('a gift that lifts the mood past cold calls the band off', () => {
    const sim = settled();
    const s = sim.state;
    const r = threatened(sim);
    send(sim, { type: 'answer', deal: r.deal, act: 'refuse' });
    const c = cityOf(s.world, 'sparta');
    c.memories.push({ kind: 'gift', why: 'your gift', amount: 120, tick: s.tick, fade: TICKS_PER_YEAR });
    expect(moodOf(c, s.tick)).toBeGreaterThan(COLD);
    sim.run(TICKS_PER_DAY + 1);
    expect(r.end).toBe('called');
    expect(['turned', 'done']).toContain(r.phase);
  }, 60000);
});

describe('afterwards', () => {
  it('the anger partly spent; paying off remembered; the reasons add up to the mood', () => {
    const sim = settled();
    const s = sim.state;
    const r = inTheCity(sim);
    until(sim, () => r.ended > 0, 2 * TICKS_PER_MONTH);
    const c = cityOf(s.world, 'sparta');
    const spent = c.memories.find((m) => m.kind === 'spent')!;
    expect(spent.amount).toBeGreaterThan(0);
    expect(spent.amount).toBeLessThanOrEqual(WORTH.spent);
    expect(moodReasons(c, s.tick).reduce((a, x) => a + x.worth, 0)).toBe(moodOf(c, s.tick));
    expect(mayThreaten(s, 'sparta')).toBe(false);
  }, 120000);
});

describe('saves and determinism', () => {
  it('a town with raiders in the city round-trips and plays on the same', () => {
    const sim = settled();
    const s = sim.state;
    inTheCity(sim);
    sim.run(30);
    const got = decodeSave(encodeSave(s, 1));
    if (!got.ok) throw new Error(got.why);
    const copy = new Sim();
    copy.state = got.file.state;
    for (const n of [300, 600]) {
      sim.run(n);
      copy.run(n);
      expect(serialize(copy.state)).toBe(serialize(sim.state));
    }
  }, 120000);

  it('a slice 19 save (version 19, a tribute marked angry) loads with no raids, and the threat comes on the month’s turn', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/slice19-angry.save.json.gz')).toString();
    expect(JSON.parse(text).state.version).toBe(19);
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    const s = got.file.state;
    expect(s.version).toBe(SIM_STATE_VERSION);
    expect(s.world.raids).toEqual([]);
    expect(s.world.deals.some((d) => d.angry)).toBe(true);
    const sim = new Sim();
    sim.state = s;
    until(sim, () => s.world.raids.length > 0, TICKS_PER_MONTH + 1);
    expect(s.world.raids[0].city).toBe('sparta');
    expect(s.world.deals.some((d) => d.angry)).toBe(false);
    expect(decodeSave(encodeSave(s, 1)).ok).toBe(true);
  }, 60000);

  it('the same seed and commands give the same raid', () => {
    const play = (): string => {
      const sim = settled();
      const r = inTheCity(sim);
      until(sim, () => r.ended > 0, 2 * TICKS_PER_MONTH);
      return serialize(sim.state);
    };
    expect(play()).toBe(play());
  }, 120000);
});
