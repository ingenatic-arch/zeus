/**
 * Prices that move (slice 17): each city's stocks pushed by your trade and
 * its harvests, wearing off; the price, its arrow and its reason; the ruler's
 * terms; sane bounds over many years; Tyre steady; Greece kept apart from the
 * city; saves.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { DEMOS } from '../src/game/demos';
import { decodeSave, encodeSave } from '../src/game/saves';
import { RULED, type CityId } from '../src/map/greece';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '../src/sim/clock';
import { WINE } from '../src/sim/foods';
import { priceAt, routeOf, yearlyLimit } from '../src/sim/routes';
import { serialize, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type Memory, type SimState, type World } from '../src/sim/state';
import { PRICES, TRADE_GOODS, tradeIndex } from '../src/sim/trade';
import { totals } from '../src/sim/treasury';
import {
  arrowOf,
  cityOf,
  freshWorld,
  harvestIn,
  isHarvest,
  lastHarvest,
  moodOf,
  outlookWords,
  priceWhy,
  sellsAndBuys,
  stepWorld,
  termsOf,
  traded,
  usualPrice,
  yourPrice,
} from '../src/sim/world';
import { stepDiplomacy } from '../src/sim/diplomacy';

const WHEAT_K = 0;
const OIL_K = 3;

/** Greece on its own, from a seed at a tick: stepped as the sim steps it (its prices and its rulers' moods; it reads nothing of the city). */
interface Greece {
  s: SimState;
  run(ticks: number, each?: (s: SimState) => void): void;
}
function greece(seed: number, tick = 0): Greece {
  const s = { tick, world: freshWorld(seed, tick) } as SimState;
  return {
    s,
    run(ticks, each) {
      for (let i = 0; i < ticks; i++) {
        s.tick++;
        stepWorld(s);
        stepDiplomacy(s);
        each?.(s);
      }
    },
  };
}
const w = (g: Greece): World => g.s.world;
const prices = (g: Greece, id: CityId): number[] => cityOf(w(g), id).price.slice();

describe('your trade moves a city’s prices', () => {
  it('selling lowers the price, says so, and wears off as the months pass', () => {
    const a = greece(5);
    const b = greece(5);
    a.run(10);
    b.run(10);
    const c = cityOf(w(a), 'corinth');
    const before = c.price[OIL_K];
    expect(priceWhy(c, OIL_K, a.s.tick).push).not.toBe('you');
    traded(w(a), 'corinth', OIL_K, 800);
    // At once: the next trader sees it.
    expect(c.price[OIL_K]).toBeLessThan(before * 0.85);
    const why = priceWhy(c, OIL_K, a.s.tick);
    expect(why).toMatchObject({ push: 'you', word: c.price[OIL_K] < why.usual ? 'cheap' : 'usual', why: 'you sold them 800 in the last year' });
    // Within a fortnight the arrow points down.
    a.run(5 * TICKS_PER_DAY);
    b.run(5 * TICKS_PER_DAY);
    expect(arrowOf(c, OIL_K)).toBe(-1);
    // Two months on it is recovering (the arrow up), and two years on it is as if you had never sold (harvests and all).
    a.run(2 * TICKS_PER_MONTH);
    b.run(2 * TICKS_PER_MONTH);
    expect(c.price[OIL_K]).toBeLessThan(prices(b, 'corinth')[OIL_K]);
    expect(arrowOf(c, OIL_K)).toBe(1);
    a.run(2 * TICKS_PER_YEAR);
    b.run(2 * TICKS_PER_YEAR);
    expect(Math.abs(c.price[OIL_K] - prices(b, 'corinth')[OIL_K])).toBeLessThanOrEqual(1);
    expect(Math.abs(c.yours[OIL_K])).toBeLessThan(10);
    // The year's record of what you sold has moved on too.
    expect(c.dealt[OIL_K].every((n) => n === 0)).toBe(true);
    // And a year later the push has worn off to nothing at all (not a sliver left over by the rounding).
    a.run(TICKS_PER_YEAR);
    expect(c.yours[OIL_K]).toBe(0);
  });

  it('a new Greece’s arrows all start steady, whatever the rounding of its prices', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const g = greece(seed);
      for (const id of RULED) for (const k of TRADE_GOODS.keys()) expect(arrowOf(cityOf(w(g), id), k)).toBe(0);
      g.run(10 * TICKS_PER_DAY);
      for (const id of RULED) for (const k of TRADE_GOODS.keys()) expect(arrowOf(cityOf(w(g), id), k)).toBe(0);
    }
  });

  it('a price the trade has left near its usual level names no push, and an old push says so', () => {
    const g = greece(5);
    g.run(10);
    const c = cityOf(w(g), 'corinth');
    // A little bought back after a sale: the price is within 3% of usual, so it is "usual", whatever is left of the pushes.
    traded(w(g), 'corinth', OIL_K, 40);
    if (Math.abs(c.price[OIL_K] - usualPrice(c, OIL_K)) <= usualPrice(c, OIL_K) * 0.02) expect(priceWhy(c, OIL_K, g.s.tick)).toMatchObject({ word: 'usual', push: 'usual' });
    // A big sale, then a small one a year later: what is left of the first is more than the year's dealings, and the reason says so.
    traded(w(g), 'corinth', OIL_K, 3000);
    g.run(13 * TICKS_PER_MONTH);
    traded(w(g), 'corinth', OIL_K, 100);
    expect(priceWhy(c, OIL_K, g.s.tick).why).toBe('you sold them 100 in the last year, and more before');
  });

  it('buying raises the price, and the reason says what you bought', () => {
    const g = greece(9);
    g.run(10);
    const c = cityOf(w(g), 'corinth');
    const k = sellsAndBuys(c).sells[0];
    const before = c.price[k];
    traded(w(g), 'corinth', k, -1000);
    expect(c.price[k]).toBeGreaterThan(before);
    expect(priceWhy(c, k, g.s.tick)).toMatchObject({ push: 'you', why: 'you bought 1,000 from them in the last year' });
  });

  it('through a route: each caravan pays at the price its last left, which slides visit after visit', () => {
    const sim = new Sim();
    DEMOS.routes.setup!(sim);
    const s = sim.state;
    const send = (c: Parameters<Sim['enqueue']>[0]): void => {
      sim.enqueue(c);
      sim.flush();
    };
    send({ type: 'route', city: 'corinth', kind: 'land' });
    send({ type: 'deal', city: 'corinth', kind: 'land', good: TRADE_GOODS[OIL_K], sell: true });
    // Keep no oil: everything the town has beyond the stalls goes to Corinth.
    send({ type: 'trade', good: TRADE_GOODS[OIL_K], keep: 0 });
    const r = routeOf(s, 'corinth', 'land')!;
    const paid: number[] = [];
    let visits = 0;
    for (let i = 0; i < 9 * TICKS_PER_MONTH && paid.length < 3; i++) {
      sim.step();
      if (r.visits !== visits) {
        visits = r.visits;
        if (r.lastSold[OIL_K] > 0) paid.push(Math.round((r.lastPaid * 100) / r.lastSold[OIL_K]));
      }
    }
    expect(paid.length).toBe(3);
    expect(paid[1]).toBeLessThan(paid[0]);
    expect(priceWhy(cityOf(s.world, 'corinth'), OIL_K, s.tick).push).toBe('you');
    expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);
  }, 60000);
});

describe('harvests', () => {
  it('come in on the first of September, each the one foreseen, said from June', () => {
    expect(isHarvest(6 * TICKS_PER_MONTH)).toBe(true);
    expect(isHarvest(6 * TICKS_PER_MONTH + TICKS_PER_YEAR)).toBe(true);
    expect(isHarvest(7 * TICKS_PER_MONTH)).toBe(false);
    expect(lastHarvest(0)).toBe(-6 * TICKS_PER_MONTH);
    const g = greece(3);
    const c = cityOf(w(g), 'athens');
    expect(outlookWords(c, g.s.tick)).toBe('');
    g.run(3 * TICKS_PER_MONTH + 1);
    expect(outlookWords(c, g.s.tick)).not.toBe('');
    const foreseen = c.outlook;
    g.run(3 * TICKS_PER_MONTH - 1);
    expect(c.harvest).toBe(foreseen);
    expect(outlookWords(c, g.s.tick)).toBe('');
  });

  it('a failed harvest sends wheat soaring in that city alone, says why, and is news; a rich one makes it cheap', () => {
    const a = greece(12);
    const b = greece(12);
    a.run(TICKS_PER_MONTH);
    b.run(TICKS_PER_MONTH);
    harvestIn(w(a), 'athens', 0);
    const c = cityOf(w(a), 'athens');
    expect(c.price[WHEAT_K]).toBeGreaterThan(prices(b, 'athens')[WHEAT_K] * 1.5);
    for (const id of RULED.filter((x) => x !== 'athens')) expect(prices(a, id)).toEqual(prices(b, id));
    expect(priceWhy(c, WHEAT_K, a.s.tick)).toMatchObject({ push: 'harvest', word: 'dear', why: 'their harvest failed last autumn' });
    // Oil and wine feel it less; fleece not at all.
    expect(c.price[4]).toBe(prices(b, 'athens')[4]);
    a.run(3 * TICKS_PER_DAY);
    expect(arrowOf(c, WHEAT_K)).toBe(1);
    const rich = greece(12);
    rich.run(TICKS_PER_MONTH);
    harvestIn(w(rich), 'sparta', 4);
    expect(cityOf(w(rich), 'sparta').price[WHEAT_K]).toBeLessThan(prices(b, 'sparta')[WHEAT_K]);
    expect(priceWhy(cityOf(w(rich), 'sparta'), WHEAT_K, rich.s.tick).why).toBe('a rich harvest last autumn');
  });

  it('the news of a failed or rich harvest, when Greece rolls one', () => {
    // Somewhere in twenty years a harvest fails, and a line of news says so.
    const g = greece(21);
    g.run(20 * TICKS_PER_YEAR);
    const news = w(g).news;
    expect(news.length).toBeGreaterThan(0);
    expect(news.some((n) => /harvest has failed, and wheat there is \d+ a hundred \(it was \d+\)/.test(n.line))).toBe(true);
    expect(news.length).toBeLessThanOrEqual(12);
  });
});

describe('the ruler’s terms', () => {
  it('a warm ruler pays you more and asks less; a cold one the other way, at most a fifth', () => {
    const g = greece(7);
    const c = cityOf(w(g), 'corinth');
    const set = (amount: number): void => {
      c.memories = [{ kind: 'test', why: 'a test', amount, tick: 0, fade: 0 } as Memory];
    };
    const { sells, buys } = sellsAndBuys(c);
    set(45);
    expect(termsOf(c, 0)).toBe(15);
    expect(yourPrice(w(g), 'corinth', buys[0], 0)).toBe(Math.round(c.price[buys[0]] * 1.15));
    expect(yourPrice(w(g), 'corinth', sells[0], 0)).toBe(Math.round(c.price[sells[0]] * 0.85));
    set(-300);
    expect(termsOf(c, 0)).toBe(-20);
    expect(yourPrice(w(g), 'corinth', buys[0], 0)).toBe(Math.round(c.price[buys[0]] * 0.8));
    expect(yourPrice(w(g), 'corinth', sells[0], 0)).toBe(Math.round(c.price[sells[0]] * 1.2));
    expect(termsOf(cityOf(w(g), 'tyre'), 0)).toBe(0);
  });

  it('a route trades at your price: the market price and the terms', () => {
    const sim = new Sim();
    DEMOS.routes.setup!(sim);
    const s = sim.state;
    const c = cityOf(s.world, 'corinth');
    const k = tradeIndex(WINE);
    const t = termsOf(c, s.tick);
    expect(t).toBe(Math.max(-20, Math.min(20, Math.round(moodOf(c, s.tick) / 3))));
    expect(priceAt(s, 'corinth', k, 1000)).toBe(Math.round((1000 * yourPrice(s.world, 'corinth', k, s.tick)) / 100));
  });
});

describe('sane bounds', () => {
  it('over twenty years, trading hard or not at all, every price stays between a quarter and three times the Tyre price, and comes back', () => {
    for (const seed of [1, 2, 3, 4]) {
      const hard = greece(seed);
      const calm = greece(seed);
      let lo = Infinity;
      let hi = 0;
      const check = (g: Greece): void => {
        for (const id of RULED) {
          const c = cityOf(w(g), id);
          c.price.forEach((p, k) => {
            lo = Math.min(lo, p / PRICES[k]);
            hi = Math.max(hi, p / PRICES[k]);
            // (Half to twice its usual price, give or take the rounding.)
            expect(p).toBeGreaterThanOrEqual(Math.floor(usualPrice(c, k) / 2) - 1);
            expect(p).toBeLessThanOrEqual(usualPrice(c, k) * 2 + 1);
          });
        }
      };
      // Every month, sell each city its whole year's limit of what it buys and buy all it sells (more than any route can), in twelfths.
      hard.run(20 * TICKS_PER_YEAR, (s) => {
        if (s.tick % TICKS_PER_MONTH !== 0) return;
        for (const id of RULED) {
          const c = cityOf(s.world, id);
          const { sells, buys } = sellsAndBuys(c);
          for (const k of buys) traded(s.world, id, k, Math.round(yearlyLimit(s, id, k) / 12));
          for (const k of sells) traded(s.world, id, k, -Math.round(yearlyLimit(s, id, k) / 12));
        }
        check(hard);
      });
      calm.run(20 * TICKS_PER_YEAR, (s) => {
        if (s.tick % TICKS_PER_MONTH === 0) check(calm);
      });
      expect(lo).toBeGreaterThanOrEqual(0.25);
      expect(hi).toBeLessThanOrEqual(3);
      // Three years after the trading stops, the hard-traded Greece is the calm one again (the same harvests fell on both).
      hard.run(3 * TICKS_PER_YEAR);
      calm.run(3 * TICKS_PER_YEAR);
      for (const id of RULED) {
        const a = prices(hard, id);
        const b = prices(calm, id);
        a.forEach((p, k) => expect(Math.abs(p - b[k])).toBeLessThanOrEqual(1));
      }
    }
  }, 60000);

  it('Tyre’s prices never move', () => {
    const g = greece(8);
    g.run(5 * TICKS_PER_YEAR);
    expect(cityOf(w(g), 'tyre').price).toEqual(PRICES);
    expect(cityOf(w(g), 'tyre').history.every((h, k) => h.every((p) => p === PRICES[k]))).toBe(true);
  });
});

describe('Greece is kept apart from the city', () => {
  it('its prices are the same whatever the city does, while no route is open', () => {
    const busy = new Sim();
    DEMOS.town.setup!(busy);
    const g = greece(busy.state.world.seed);
    // (The town's Greece was made at tick 0 and has stepped with it since.)
    g.run(busy.state.tick);
    busy.run(TICKS_PER_YEAR);
    g.run(TICKS_PER_YEAR);
    expect(JSON.stringify(busy.state.world.cities)).toBe(JSON.stringify(w(g).cities));
  }, 60000);
});

describe('saves', () => {
  it('a town with moving prices round-trips and plays on the same', () => {
    const sim = new Sim();
    DEMOS.routes.setup!(sim);
    sim.enqueue({ type: 'route', city: 'corinth', kind: 'land' });
    sim.run(TICKS_PER_MONTH);
    traded(sim.state.world, 'corinth', OIL_K, 500);
    harvestIn(sim.state.world, 'athens', 0);
    const got = decodeSave(encodeSave(sim.state, 1));
    if (!got.ok) throw new Error(got.why);
    expect(serialize(got.file.state)).toBe(serialize(sim.state));
    const again = new Sim();
    again.state = got.file.state;
    sim.run(TICKS_PER_MONTH);
    again.run(TICKS_PER_MONTH);
    expect(serialize(again.state)).toBe(serialize(sim.state));
  }, 60000);

  it('a slice 16 save (state version 16, buying wine from Corinth) loads with its prices where they were, and plays on', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/slice16-buywine.save.json.gz')).toString();
    const raw = JSON.parse(text);
    expect(raw.state.version).toBe(16);
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    expect(got.file.from).toBe(16);
    const s = got.file.state;
    expect(s.version).toBe(SIM_STATE_VERSION);
    const c = cityOf(s.world, 'corinth');
    // (Before this slice every price was its usual one.)
    expect(c.price).toEqual(TRADE_GOODS.map((_, k) => usualPrice(c, k)));
    expect(c.yours.every((n) => n === 0) && c.crop.every((n) => n === 0)).toBe(true);
    expect(c.outlook).toBe(2);
    // Every arrow starts steady.
    for (const id of RULED) for (const k of TRADE_GOODS.keys()) expect(arrowOf(cityOf(s.world, id), k)).toBe(0);
    const sim = new Sim();
    sim.state = s;
    const k = tradeIndex(WINE);
    const before = c.price[k];
    sim.run(2 * TICKS_PER_MONTH);
    // The caravan unloaded the wine it was bringing: Corinth's wine is dearer for it.
    expect(routeOf(s, 'corinth', 'land')!.visits).toBeGreaterThan(0);
    expect(c.price[k]).toBeGreaterThan(before);
    expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);
    expect(decodeSave(encodeSave(s, 1)).ok).toBe(true);
  }, 60000);

  it('refuses a damaged price record in plain words', () => {
    const sim = new Sim();
    const c = cityOf(sim.state.world, 'athens');
    c.dealt = [[1, 2]];
    const got = decodeSave(encodeSave(sim.state, 1));
    expect(got.ok).toBe(false);
    if (!got.ok) expect(got.why).toBe('This save is damaged (its map of Greece is wrong), so it can’t be opened.');
  });
});
