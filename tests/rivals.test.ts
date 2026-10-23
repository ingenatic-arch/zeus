/**
 * Greece goes on (slice 21): rulers' feelings for each other and their
 * reasons, quarrels and friendships by Greece's own dice; feuds and wars
 * (when they may come, who declares, the armies' places as a pure function
 * of the tick, the end the dice chose at the start, the bonds after, the
 * lulls); the war and festival pushes on prices and their reasons; the
 * festival gift; requests from both sides; the cooling for trading with or
 * helping one side; independence from the city's dice and the city; saves.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { lineLength, meetAlong, rivalPoints, rivalWay, type CityId } from '../src/map/greece';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '../src/sim/clock';
import { giftMemory } from '../src/sim/diplomacy';
import { FESTIVALS, festivalOn, nextFestival } from '../src/sim/festivals';
import { openDeals } from '../src/sim/favours';
import { held, OIL as OIL_WARE, setHeld } from '../src/sim/foods';
import {
  armiesOnMap,
  declareWar,
  endWar,
  FOE_HELP,
  FOE_TRADE,
  FOE_TRADE_MOST,
  GREECE_PEACE,
  mutual,
  PAIR_LULL,
  PAIRS,
  STAND_OFF,
  tieOf,
  tieReasons,
  tieWord,
  tradedWithFoe,
  helpCost,
  WAR_AT,
  warBar,
  WAR_FROM,
  WAR_LEAST,
  WAR_MOST,
  warOf,
  warOn,
} from '../src/sim/rivals';
import { deserialize, serialize, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type SimState, type War } from '../src/sim/state';
import { cityOf, priceWhy, usualPrice } from '../src/sim/world';
import { demoSim } from './prepared';

/** The demos' towns, set up once and copied for each test. */
const made: Record<string, string> = {};
const fresh = (name: string): Sim => {
  if (!made[name]) {
    const sim = demoSim(name);
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
const until = (sim: Sim, ok: () => boolean, most: number): boolean => {
  for (let i = 0; i < most && !ok(); i++) sim.step();
  return ok();
};
/** The city's own state, without Greece (and the counters that only tell the screen to redraw). */
const cityState = (s: SimState): string => {
  const { world: _w, rev: _r, stocks: _st, looks: _l, ...rest } = s as SimState & { stocks?: unknown; looks?: unknown };
  return JSON.stringify(rest);
};
/** A deep quarrel between two rulers, both ways (staged, long remembered). */
const quarrel = (s: SimState, x: CityId, y: CityId, amount: number): void => {
  cityOf(s.world, x).bonds.push({ kind: 'staged', city: y, why: `a staged quarrel with ${y}`, amount, tick: s.tick, fade: 0 });
  cityOf(s.world, y).bonds.push({ kind: 'staged', city: x, why: `a staged quarrel with ${x}`, amount, tick: s.tick, fade: 0 });
};
/** A war staged between two rulers (any war on in Greece ended first: one at a time). */
const stage = (s: SimState, a: CityId, b: CityId): War => {
  for (const x of s.world.wars) if (!x.ended) endWar(s, x);
  return declareWar(s, a, b, 'a staged quarrel');
};
const WHEAT = 0;
const MEAT = 1;
const FLEECE = 4;
const WINE = 5;

describe('feelings between rulers', () => {
  it('each feeling is its reasons added up, and they move with quarrels and friendships by the dice', () => {
    const sim = new Sim(1, 7);
    const s = sim.state;
    const kinds = new Set<string>();
    for (let m = 0; m < 48; m++) {
      sim.run(TICKS_PER_MONTH);
      for (const [x, y] of PAIRS)
        for (const [a, b] of [
          [x, y],
          [y, x],
        ] as const)
          expect(tieReasons(s.world, a, b, s.tick).reduce((n, r) => n + r.worth, 0)).toBe(tieOf(s.world, a, b, s.tick));
      for (const c of s.world.cities) for (const b of c.bonds) kinds.add(b.kind);
    }
    expect(kinds.has('quarrel')).toBe(true);
    expect(kinds.has('friendship')).toBe(true);
    // Each reason in words, the history first among the fixed ones.
    const r = tieReasons(s.world, 'athens', 'sparta', s.tick);
    expect(r.some((x) => x.why === 'old rivals for the leadership of Greece' && x.worth < 0 && !x.fading)).toBe(true);
    expect(tieWord(40)).toBe('friends');
    expect(tieWord(-30)).toBe('feuding');
    expect(tieWord(10, true)).toBe('at war');
  }, 60000);

  it('the same seed gives the same Greece over years, a different one a different one, and the city’s dice are never touched', () => {
    const play = (worldSeed: number): SimState => {
      const sim = new Sim(1, worldSeed);
      sim.run(5 * TICKS_PER_YEAR);
      return sim.state;
    };
    const a = play(7);
    const b = play(7);
    const c = play(8);
    expect(JSON.stringify(a.world)).toBe(JSON.stringify(b.world));
    expect(JSON.stringify(a.world.cities.map((x) => x.bonds))).not.toBe(JSON.stringify(c.world.cities.map((x) => x.bonds)));
    // A war staged in one copy: Greece's own dice (and so its harvests) and the city are as they were.
    const sim = new Sim(1, 7);
    sim.run(WAR_FROM + TICKS_PER_DAY);
    const copy = new Sim();
    copy.state = deserialize(serialize(sim.state));
    if (!warOn(copy.state.world)) declareWar(copy.state, 'sparta', 'athens', 'a staged quarrel');
    sim.run(TICKS_PER_YEAR);
    copy.run(TICKS_PER_YEAR);
    expect(copy.state.world.rng).toEqual(sim.state.world.rng);
    // (Slice 31: the harvests' sizes follow each city's people, which a war changes; the harvests themselves don't.)
    expect(copy.state.world.cities.map((x) => [x.harvest, x.outlook])).toEqual(sim.state.world.cities.map((x) => [x.harvest, x.outlook]));
    expect(cityState(copy.state)).toBe(cityState(sim.state));
  }, 120000);
});

describe('wars between rivals', () => {
  it('none before the third year; then a pair far enough out goes to war, the angrier declaring it', () => {
    const sim = new Sim(1, 7);
    const s = sim.state;
    quarrel(s, 'athens', 'sparta', -60);
    cityOf(s.world, 'sparta').bonds.push({ kind: 'staged', city: 'athens', why: 'an insult at the games', amount: -20, tick: 0, fade: 0 });
    sim.run(WAR_FROM - 1);
    expect(s.world.wars).toEqual([]);
    expect(s.world.feuds).toContain('athens-sparta');
    until(sim, () => s.world.wars.length > 0, 2 * TICKS_PER_YEAR);
    const x = s.world.wars[0];
    expect(x).toBeDefined();
    expect([x.a, x.b].sort()).toEqual(['athens', 'sparta']);
    expect(x.a).toBe('sparta');
    expect(x.start % TICKS_PER_MONTH).toBe(0);
    expect(x.until - x.start).toBeGreaterThanOrEqual(WAR_LEAST);
    expect(x.until - x.start).toBeLessThanOrEqual(WAR_MOST);
    expect(cityOf(s.world, 'sparta').war).toBe('athens');
    expect(cityOf(s.world, 'athens').war).toBe('sparta');
    expect(s.world.news.at(-1)?.line).toMatch(/has declared war on Athens: .*march to meet at Megara; the way between them is closed/);
    expect(tieReasons(s.world, 'athens', 'sparta', s.tick).some((r) => r.why === 'at war with Sparta')).toBe(true);
  }, 120000);

  it('one war at a time; none for six months after one ends, nor between the same pair for three years', () => {
    const sim = new Sim(1, 7);
    const s = sim.state;
    sim.run(WAR_FROM + TICKS_PER_DAY);
    for (const x of s.world.wars) if (!x.ended) endWar(s, x);
    s.world.wars = [];
    const x = declareWar(s, 'sparta', 'athens', 'a staged quarrel');
    quarrel(s, 'corinth', 'troy', -80);
    quarrel(s, 'athens', 'sparta', -80);
    sim.run(x.until - s.tick - 1);
    expect(s.world.wars.filter((v) => !v.ended).length).toBe(1);
    expect(warOf(s.world, 'corinth')).toBeUndefined();
    sim.run(1);
    expect(x.ended).toBe(x.until);
    sim.run(GREECE_PEACE - TICKS_PER_DAY);
    expect(s.world.wars.length).toBe(1);
    until(sim, () => s.world.wars.length > 1, 2 * TICKS_PER_YEAR);
    const next = s.world.wars[1];
    expect(next).toBeDefined();
    expect(next.start - x.ended).toBeGreaterThanOrEqual(GREECE_PEACE);
    // Corinth and Troy, not Athens and Sparta again so soon.
    expect([next.a, next.b].sort()).toEqual(['corinth', 'troy']);
    expect(next.by).toBe('sea');
    expect(next.start - x.ended).toBeLessThan(PAIR_LULL);
  }, 120000);

  it('the armies’ places are a pure function of the tick: out from their cities, standing apart at the meeting place, home after', () => {
    const sim = new Sim(1, 7);
    const s = sim.state;
    const x = declareWar(s, 'sparta', 'athens', 'a staged quarrel');
    const way = rivalWay('sparta', 'athens')!;
    const L = lineLength(rivalPoints(way));
    const meet = meetAlong(way);
    const at = (t: number): ReturnType<typeof armiesOnMap> => armiesOnMap(x, t);
    expect(at(x.start - 1)).toEqual([]);
    const first = at(x.start);
    expect(first.length).toBe(2);
    const end = (city: CityId): number => (city === way.a ? 0 : L);
    for (const a of first) {
      expect(a.phase).toBe('out');
      expect(a.along).toBeCloseTo(end(a.city), 5);
    }
    const mid = at(x.start + 60 * TICKS_PER_DAY);
    for (const a of mid) {
      expect(a.phase).toBe('standing');
      expect(Math.abs(a.along - meet)).toBeCloseTo(STAND_OFF, 5);
      // Facing each other.
      expect(Math.sign(meet - a.along)).toBe(a.facing);
    }
    expect(at(x.start + 60 * TICKS_PER_DAY)).toEqual(mid);
    x.ended = x.start + 70 * TICKS_PER_DAY;
    const home = at(x.ended + TICKS_PER_DAY);
    for (const a of home) expect(a.phase).toBe('home');
    expect(at(x.ended + TICKS_PER_YEAR)).toEqual([]);
  });

  it('it ends as the dice said at its start; each remembers how; the loser poorer for a while, its prices saying why', () => {
    const sim = new Sim(1, 7);
    const s = sim.state;
    sim.run(30 * TICKS_PER_DAY);
    const x = declareWar(s, 'sparta', 'athens', 'a staged quarrel');
    x.fate = 'athens';
    const sparta = cityOf(s.world, 'sparta');
    const athens = cityOf(s.world, 'athens');
    const before = [WHEAT, MEAT, FLEECE].map((k) => sparta.price[k]);
    sim.run(30 * TICKS_PER_DAY);
    for (const c of [sparta, athens])
      for (const k of [WHEAT, FLEECE]) {
        expect(c.price[k]).toBeGreaterThan(usualPrice(c, k) * 1.15);
        const why = priceWhy(c, k, s.tick, s.world);
        expect(why.push).toBe('war');
        expect(why.why).toBe(`their war with ${c === sparta ? 'Athens' : 'Sparta'}`);
      }
    expect([WHEAT, MEAT, FLEECE].map((k) => sparta.price[k]).every((p, i) => p > before[i])).toBe(true);
    // The battle half-way, hinting the end.
    until(sim, () => x.told, x.until - s.tick);
    expect(s.world.news.at(-1)?.line).toMatch(/A battle at Megara between Sparta and Athens: Athens had the better of it/);
    until(sim, () => x.ended > 0, x.until - s.tick + 1);
    expect(x.ended).toBe(x.until);
    expect(sparta.war).toBe('');
    expect(athens.war).toBe('');
    expect(sparta.bonds.some((b) => b.kind === 'war')).toBe(false);
    expect(sparta.bonds.find((b) => b.kind === 'lost')?.why).toBe('lost the war to Athens, and bitter about it');
    expect(athens.bonds.find((b) => b.kind === 'won')?.city).toBe('sparta');
    expect(s.world.news.at(-1)?.line).toMatch(/Athens has won its war with Sparta/);
    sim.run(TICKS_PER_DAY);
    const lost = sparta.price[WHEAT];
    expect(lost).toBeGreaterThan(usualPrice(sparta, WHEAT) * 1.3);
    expect(priceWhy(sparta, WHEAT, s.tick, s.world).why).toBe('they lost their war with Athens');
    expect(lost / usualPrice(sparta, WHEAT)).toBeGreaterThan(athens.price[WHEAT] / usualPrice(athens, WHEAT));
    // Easing over the months.
    sim.run(8 * TICKS_PER_MONTH);
    expect(sparta.price[WHEAT]).toBeLessThan(lost);
  }, 60000);

  it('a peace leaves both a little bitter, and food easing in both', () => {
    const sim = new Sim(1, 7);
    const s = sim.state;
    const x = declareWar(s, 'corinth', 'troy', 'harbour dues');
    x.fate = 'peace';
    expect(x.by).toBe('sea');
    sim.run(x.until - s.tick + TICKS_PER_DAY);
    for (const id of ['corinth', 'troy'] as const) {
      const b = cityOf(s.world, id).bonds.find((v) => v.kind === 'peace');
      expect(b?.amount).toBeLessThan(0);
      expect(b?.why).toMatch(/ended in a weary peace/);
    }
    expect(s.world.news.at(-1)?.line).toMatch(/have made peace/);
  });

  it('after a long quiet the bar for war comes down, a step a year, to −20 at most; counted from the last war’s end', () => {
    const s = new Sim(1, 7).state;
    s.world.wars = [];
    expect(warBar(s.world, WAR_FROM)).toBe(WAR_AT);
    expect(warBar(s.world, WAR_FROM + TICKS_PER_YEAR - 1)).toBe(WAR_AT);
    expect(warBar(s.world, WAR_FROM + TICKS_PER_YEAR)).toBe(WAR_AT + 10);
    expect(warBar(s.world, WAR_FROM + 2 * TICKS_PER_YEAR)).toBe(-20);
    expect(warBar(s.world, WAR_FROM + 9 * TICKS_PER_YEAR)).toBe(-20);
    s.tick = WAR_FROM + 3 * TICKS_PER_YEAR;
    const x = declareWar(s, 'sparta', 'athens', 'a staged quarrel');
    // (While a war is on, and for a year after it ends, the bar is where it was.)
    expect(warBar(s.world, s.tick + TICKS_PER_MONTH)).toBe(WAR_AT);
    x.ended = s.tick + 4 * TICKS_PER_MONTH;
    expect(warBar(s.world, x.ended + TICKS_PER_YEAR - 1)).toBe(WAR_AT);
    expect(warBar(s.world, x.ended + TICKS_PER_YEAR)).toBe(WAR_AT + 10);
    expect(warBar(s.world, x.ended + 2 * TICKS_PER_YEAR)).toBe(-20);
  });

  it('a price two pushes have made dear names both, the bigger first; a good the war on now leaves alone is named by the war before', () => {
    const sim = new Sim(1, 7);
    const s = sim.state;
    const athens = cityOf(s.world, 'athens');
    // Athens loses a war to Corinth just before the Panathenaia, then Sparta declares war on it.
    const fest = nextFestival('athens', WAR_FROM)!;
    s.tick = fest.start - 20 * TICKS_PER_DAY;
    const lost = stage(s, 'corinth', 'athens');
    lost.fate = 'corinth';
    endWar(s, lost);
    sim.run(25 * TICKS_PER_DAY);
    expect(festivalOn('athens', s.tick)).toBe(true);
    const wine = priceWhy(athens, WINE, s.tick, s.world);
    expect(wine.word).toBe('dear');
    expect(wine.why).toMatch(/^(the Panathenaia is on, and they lost their war with Corinth|they lost their war with Corinth, and the Panathenaia is on)$/);
    declareWar(s, 'sparta', 'athens', 'a staged quarrel');
    const OIL = 3;
    expect(priceWhy(athens, OIL, s.tick, s.world).why).toMatch(/^they lost their war with Corinth/);
    expect(priceWhy(athens, WHEAT, s.tick, s.world).why).toMatch(/^their war with Sparta/);
  }, 60000);
});

describe('festivals', () => {
  it('on at their months every year, wine and meat dear there, easing after; news as each begins', () => {
    const sim = new Sim(1, 7);
    const s = sim.state;
    const athens = cityOf(s.world, 'athens');
    // July of the first year: the Panathenaia (the game starts in March).
    const july = 4 * TICKS_PER_MONTH;
    expect(nextFestival('athens', 0)).toEqual({ start: july, end: july + TICKS_PER_MONTH });
    expect(nextFestival('athens', july + TICKS_PER_MONTH)?.start).toBe(july + TICKS_PER_YEAR);
    expect(nextFestival('troy', 0)).toBeNull();
    for (const f of FESTIVALS) expect(festivalOn(f.city, ((f.month - 2 + 12) % 12) * TICKS_PER_MONTH + 5)).toBe(true);
    sim.run(july + 15 * TICKS_PER_DAY);
    expect(athens.festival).toBe(july + TICKS_PER_MONTH);
    expect(s.world.news.some((n) => n.city === 'athens' && /^The Panathenaia begins in Athens: wine there is \d+ a hundred/.test(n.line))).toBe(true);
    for (const k of [WINE, MEAT]) expect(athens.price[k]).toBeGreaterThan(usualPrice(athens, k) * 1.2);
    const why = priceWhy(athens, WINE, s.tick, s.world);
    expect(why.push).toBe('festival');
    expect(why.why).toBe('the Panathenaia is on');
    // Wheat unmoved by it.
    expect(athens.feast[WHEAT]).toBe(0);
    const peak = athens.price[WINE];
    sim.run(4 * TICKS_PER_MONTH);
    expect(athens.festival).toBe(0);
    expect(athens.price[WINE]).toBeLessThan(peak);
  }, 60000);

  it('a gift that arrives while it is on counts half as much again (twice to a pious ruler), and says so', () => {
    const sim = new Sim(1, 7);
    const s = sim.state;
    const athens = cityOf(s.world, 'athens');
    const july = 4 * TICKS_PER_MONTH;
    const before = giftMemory(s, athens, -1, 100, july - 2 * TICKS_PER_MONTH);
    const during = giftMemory(s, athens, -1, 100, july + 5 * TICKS_PER_DAY);
    const pious = athens.ruler!.traits.includes('pious');
    expect(during.why).toContain(`for the Panathenaia${pious ? ', and pious' : ''}`);
    expect(before.why).not.toContain('Panathenaia');
    expect(during.amount / before.amount).toBeCloseTo(pious ? 2 : 1.5, 0);
  });
});

describe('your part in it', () => {
  it('both sides of a war ask your city for help, for their armies', () => {
    const sim = fresh('caravan');
    const s = sim.state;
    for (const r of s.world.routes) r.opened = Math.max(1, r.opened - TICKS_PER_YEAR);
    s.world.deals = [];
    const x = stage(s, 'sparta', 'athens');
    x.until = x.start + WAR_MOST;
    const asked = (id: CityId): boolean => openDeals(s.world).some((d) => d.city === id && d.kind === 'request');
    // (Integrating slice 33 with 31: other rulers' deals are set aside as they come, so the two open places stay for the war's
    // two sides. In the merged #caravan history Argos demanded tribute in the war's fourth month, filling the second place
    // before Sparta's dice came up.)
    const sides = (): boolean => {
      s.world.deals = s.world.deals.filter((d) => d.city === 'sparta' || d.city === 'athens');
      return asked('sparta') && asked('athens');
    };
    expect(until(sim, sides, WAR_MOST)).toBe(true);
    for (const id of ['sparta', 'athens'] as const) {
      const d = openDeals(s.world).find((v) => v.city === id)!;
      expect(d.why).toMatch(/they are at war with (Athens|Sparta)$/);
    }
  }, 120000);

  it('trading with one side cools the other: one memory for the war, growing to a cap, its visits counted', () => {
    const sim = new Sim(1, 7);
    const s = sim.state;
    declareWar(s, 'sparta', 'corinth', 'a staged quarrel');
    const sparta = cityOf(s.world, 'sparta');
    const proud = sparta.ruler!.traits.includes('proud') ? 1.5 : 1;
    tradedWithFoe(s, 'corinth');
    let m = sparta.memories.filter((x) => x.kind === 'foetrade');
    expect(m.length).toBe(1);
    expect(m[0].amount).toBe(Math.round(FOE_TRADE * proud));
    expect(m[0].why).toBe('you trade with their enemy Corinth (during the war)');
    for (let i = 0; i < 10; i++) tradedWithFoe(s, 'corinth');
    m = sparta.memories.filter((x) => x.kind === 'foetrade');
    expect(m.length).toBe(1);
    expect(m[0].amount).toBe(Math.round(FOE_TRADE_MOST * proud));
    expect(m[0].why).toBe('you trade with their enemy Corinth (11 visits during the war)');
    // Nothing for a city at peace.
    tradedWithFoe(s, 'troy');
    expect(cityOf(s.world, 'athens').memories.some((x) => x.kind === 'foetrade')).toBe(false);
  });

  it('a caravan from a city at war trading at your city cools its enemy; a gift sent to one side cools the other as it is sent', () => {
    const sim = fresh('caravan');
    const s = sim.state;
    stage(s, 'sparta', 'corinth');
    const sparta = cityOf(s.world, 'sparta');
    const r = s.world.routes.find((x) => x.city === 'corinth')!;
    const visits = r.visits;
    // (Slice 33: #caravan opens in April, its storehouse nearly out of the oil Corinth buys after the winter's thin picking: some to sell.)
    for (const b of s.buildings) if (b.kind === 'storehouse') setHeld(b, OIL_WARE, held(b, OIL_WARE) + 600);
    until(sim, () => r.visits > visits, 2 * TICKS_PER_MONTH);
    expect(sparta.memories.find((x) => x.kind === 'foetrade')?.why).toMatch(/you trade with their enemy Corinth/);
    s.money += 2000;
    s.ledger.start += 2000;
    expect(helpCost(s.world, 'corinth')).toEqual({ foe: 'sparta', amount: FOE_HELP * (sparta.ruler?.traits.includes('proud') ? 1.5 : 1) });
    expect(helpCost(s.world, 'troy')).toBeNull();
    send(sim, { type: 'gift', city: 'corinth', good: -1, amount: 250 });
    // (Sparta hears of it as it is sent, not weeks later when it arrives: by then the war may be over.)
    expect(sparta.memories.find((x) => x.kind === 'foehelp')?.why).toBe('you sent 250 dr to their enemy Corinth during the war');
  }, 120000);

  // (Slice 40: a sending goes quicker now, so the wheat reaches Sparta before the war is over, not after it.)
  it('in #war, wheat sent to Sparta cools Athens at once, once only, and reaches Sparta', () => {
    const sim = fresh('war');
    const s = sim.state;
    const x = warOn(s.world)!;
    expect(x.fate).toBe('athens');
    const ask = s.world.deals.find((d) => d.city === 'sparta' && d.state === 'open')!;
    send(sim, { type: 'answer', deal: ask.id, act: 'send' });
    const athens = cityOf(s.world, 'athens');
    expect(athens.memories.find((m) => m.kind === 'foehelp')?.why).toBe('you sent 1,000 wheat to their enemy Sparta during the war');
    until(sim, () => ask.state !== 'open', TICKS_PER_YEAR);
    expect(ask.state).toBe('met');
    expect(athens.memories.filter((m) => m.kind === 'foehelp').length).toBe(1);
  }, 120000);
});

describe('independence and saves', () => {
  it('a town with no route plays exactly as before through Greece’s wars and festivals', () => {
    const sim = fresh('town');
    const copy = new Sim();
    copy.state = deserialize(serialize(sim.state));
    if (!warOn(copy.state.world)) declareWar(copy.state, 'sparta', 'athens', 'a staged quarrel');
    quarrel(copy.state, 'corinth', 'athens', -50);
    for (const n of [TICKS_PER_MONTH, TICKS_PER_YEAR]) {
      sim.run(n);
      copy.run(n);
      expect(cityState(copy.state)).toBe(cityState(sim.state));
    }
  }, 120000);

  it('a town with a war on round-trips through a save', () => {
    const sim = new Sim(1, 7);
    const s = sim.state;
    sim.run(20 * TICKS_PER_DAY);
    declareWar(s, 'sparta', 'athens', 'a staged quarrel');
    sim.run(TICKS_PER_MONTH);
    const got = decodeSave(encodeSave(s, 1));
    if (!got.ok) throw new Error(got.why);
    expect(serialize(got.file.state)).toBe(serialize(s));
    const copy = new Sim();
    copy.state = got.file.state;
    sim.run(TICKS_PER_MONTH);
    copy.run(TICKS_PER_MONTH);
    expect(serialize(copy.state)).toBe(serialize(sim.state));
  });

  it('a slice 20 save (version 20, a request open) loads with no wars and plays on into Greece’s doings', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/slice20-request.save.json.gz')).toString();
    expect(JSON.parse(text).state.version).toBe(20);
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    const s = got.file.state;
    expect(s.version).toBe(SIM_STATE_VERSION);
    expect(s.world.wars).toEqual([]);
    expect(s.world.feuds).toEqual([]);
    for (const c of s.world.cities) {
      expect(c.bonds).toEqual([]);
      expect(c.war).toBe('');
    }
    const ties = PAIRS.map(([x, y]) => mutual(s.world, x, y, s.tick));
    const sim = new Sim();
    sim.state = s;
    sim.run(TICKS_PER_YEAR);
    expect(s.world.cities.some((c) => c.bonds.length > 0)).toBe(true);
    expect(PAIRS.map(([x, y]) => mutual(s.world, x, y, s.tick))).not.toEqual(ties);
    expect(decodeSave(encodeSave(s, 1)).ok).toBe(true);
  }, 60000);
});
