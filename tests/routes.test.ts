/**
 * Routes and traders (slice 16): opening routes, caravans walking in from the
 * map's edge to the caravan yard and out again, foreign ships at the quay
 * waiting their turn at anchor, buying and selling within each city's yearly
 * limits, the ledger and stock book, determinism and saves.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { DEMOS } from '../src/game/demos';
import { decodeSave, encodeSave } from '../src/game/saves';
import { coastMap } from '../src/map/bake';
import { EDGE_ALONG, HORIZON_ALONG, lineLength, wayOf, wayPoints } from '../src/map/greece';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { held, MEAT, setHeld, WARES, WINE } from '../src/sim/foods';
import {
  caravanEntry,
  caravanOf,
  caravansOnMap,
  caravanTraveller,
  caravanYard,
  FIRST_TRADER,
  importPurse,
  LAND_EVERY,
  landTicks,
  priceAt,
  routeOf,
  routeRefusal,
  TRADE_TICKS,
  tradersNews,
  visitorAt,
  visitorOnMap,
  voyageTicks,
  soldTo,
  yearlyLimit,
} from '../src/sim/routes';
import { deserialize, replay, serialize, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type SimState } from '../src/sim/state';
import { bookNow, stockOf, totalsOf } from '../src/sim/stocks';
import { cityHolds, SHIP_ANCHORED, SHIP_AWAY, SHIP_BERTHING, SHIP_COMING, SHIP_LEAVING, SHIP_MOORED, shipNews, tradeIndex, tradingPost } from '../src/sim/trade';
import { income, pay, spendable, totals, wageBill } from '../src/sim/treasury';
import { position } from '../src/sim/walk';
import { cityOf } from '../src/sim/world';
import { demoSim } from './prepared';
import { BAY } from '../src/map/lands';

const map = coastMap();
const N = map.size;
const T = (x: number, z: number): number => z * N + x;

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
const ledgerAddsUp = (s: SimState): void => expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);
/** Run until a test holds (or `most` ticks); true if it held. */
const until = (sim: Sim, ok: () => boolean, most: number): boolean => {
  for (let i = 0; i < most && !ok(); i++) sim.step();
  return ok();
};
const MEAT_K = tradeIndex(MEAT);
const WINE_K = tradeIndex(WINE);
/** Where #routes builds its yard, and the top of its road out to the north edge. */
const NORTH_EDGE = T(86, 0);
const WEST_EDGE = T(0, 50);

/** #routes with the road to Corinth opened, selling meat and buying wine as asked. */
const corinth = (opts: { sell?: boolean; buy?: number } = {}): Sim => {
  const sim = fresh('routes');
  send(sim, { type: 'route', city: 'corinth', kind: 'land' });
  if (opts.sell) send(sim, { type: 'deal', city: 'corinth', kind: 'land', good: MEAT, sell: true });
  if (opts.buy) send(sim, { type: 'deal', city: 'corinth', kind: 'land', good: WINE, buy: true, upto: opts.buy });
  return sim;
};

describe('opening a route', () => {
  it('a land route needs the caravan yard, a sea route the trading post; there are only the ways there are', () => {
    const sim = fresh('town');
    const s = sim.state;
    expect(routeRefusal(s, 'corinth', 'land')).toBe('A land route needs a caravan yard, where the caravans trade');
    expect(routeRefusal(s, 'athens', 'sea')).toBe('A sea route needs the trading post, where the ships tie up');
    expect(routeRefusal(s, 'troy', 'land')).toBe('No road runs from your city to Troy');
    expect(routeRefusal(s, 'sparta', 'sea')).toBe('No sea lane runs from your city to Sparta');
    const money = s.money;
    send(sim, { type: 'route', city: 'corinth', kind: 'land' });
    send(sim, { type: 'route', city: 'troy', kind: 'land' });
    expect(s.world.routes).toEqual([]);
    expect(s.money).toBe(money);
  });

  it('opens for its fee, on its own ledger line, once; the first caravan is due a month later and nothing is ticked', () => {
    const sim = fresh('routes');
    const s = sim.state;
    expect(caravanYard(s)).toBeDefined();
    expect(routeRefusal(s, 'corinth', 'land')).toBe('');
    const money = s.money;
    send(sim, { type: 'route', city: 'corinth', kind: 'land' });
    const r = routeOf(s, 'corinth', 'land')!;
    expect(r).toBeDefined();
    expect(s.money).toBe(money - 500);
    expect(s.ledger.now.some((l) => l.kind === 'routes' && l.amount === -500 && l.what === 'Corinth by road')).toBe(true);
    expect(r.next).toBe(s.tick + FIRST_TRADER);
    expect(r.sell.some((x) => x) || r.buy.some((x) => x)).toBe(false);
    expect(routeRefusal(s, 'corinth', 'land')).toBe('This route is open already');
    send(sim, { type: 'route', city: 'corinth', kind: 'land' });
    expect(s.world.routes).toHaveLength(1);
    expect(s.money).toBe(money - 500);
    ledgerAddsUp(s);
  });

  it('a cold ruler won’t open one, and the treasury must spare the fee', () => {
    const sim = fresh('routes');
    const s = sim.state;
    const sparta = cityOf(s.world, 'sparta');
    sparta.memories.push({ kind: 'test', why: 'a test', amount: -60, tick: s.tick, fade: 0 });
    expect(routeRefusal(s, 'sparta', 'land')).toMatch(/won’t deal with you: (cold|hostile)$/);
    send(sim, { type: 'route', city: 'sparta', kind: 'land' });
    expect(routeOf(s, 'sparta', 'land')).toBeUndefined();
    pay(s, -(spendable(s) - 100), 'routes', 'a test');
    expect(routeRefusal(s, 'corinth', 'land')).toBe('Opening it costs 500 dr: the treasury can’t spare that now');
  });

  it('you can sell a city only what it buys, and buy only what it sells', () => {
    const sim = corinth();
    const s = sim.state;
    const r = routeOf(s, 'corinth', 'land')!;
    // Corinth buys meat and oil, and sells cheese, fleece and wine.
    send(sim, { type: 'deal', city: 'corinth', kind: 'land', good: WINE, sell: true });
    send(sim, { type: 'deal', city: 'corinth', kind: 'land', good: MEAT, buy: true });
    expect(r.sell[WINE_K]).toBe(false);
    expect(r.buy[MEAT_K]).toBe(false);
    send(sim, { type: 'deal', city: 'corinth', kind: 'land', good: MEAT, sell: true });
    send(sim, { type: 'deal', city: 'corinth', kind: 'land', good: WINE, buy: true, upto: 900 });
    expect(r.sell[MEAT_K]).toBe(true);
    expect(r.buy[WINE_K]).toBe(true);
    expect(r.upto[WINE_K]).toBe(900);
    send(sim, { type: 'deal', city: 'corinth', kind: 'land', good: WINE, upto: -5 });
    expect(r.upto[WINE_K]).toBe(900);
  });
});

describe('caravans', () => {
  it('one comes in at the north edge road, walks to the yard, trades and leaves the way it came; on the map it travels in step', () => {
    const sim = corinth({ sell: true });
    const s = sim.state;
    const r = routeOf(s, 'corinth', 'land')!;
    const yard = caravanYard(s)!;
    const firstDue = r.next;
    // On the map: it sets off from Corinth and comes down the road without a jump, to the edge of your map as it is due.
    let last = Infinity;
    let onRoad = 0;
    expect(
      until(
        sim,
        () => {
          if (caravanOf(s, 'corinth')) return true;
          const ms = caravansOnMap(s, r, s.tick);
          expect(ms.length).toBeLessThanOrEqual(1);
          const m = ms[0];
          if (m) {
            onRoad++;
            expect(m.homeward).toBe(false);
            expect(m.along).toBeLessThanOrEqual(last);
            if (onRoad > 1) expect(last - m.along).toBeLessThan(0.5);
            last = m.along;
          }
          return false;
        },
        FIRST_TRADER + 10,
      ),
    ).toBe(true);
    expect(onRoad).toBeGreaterThan(20);
    expect(last).toBeGreaterThan(EDGE_ALONG);
    expect(last).toBeLessThan(EDGE_ALONG + 0.3);
    expect(s.tick).toBe(firstDue);
    // The next is due two months after this one was.
    expect(r.next).toBe(firstDue + LAND_EVERY);
    expect(caravansOnMap(s, r, s.tick)).toEqual([]);
    const w = caravanOf(s, 'corinth')!;
    expect(w.home).toBe(NORTH_EDGE);
    expect(w.people).toBe(5);
    // It walks to the yard, unloads and trades for three days.
    expect(until(sim, () => w.wait > 0, 3000)).toBe(true);
    const [x, z] = position(w);
    expect(Math.hypot(x - (yard.x + 1.5), z - (yard.z + 1.5))).toBeLessThan(4);
    const at = s.tick;
    expect(until(sim, () => w.back, TRADE_TICKS + 5)).toBe(true);
    expect(s.tick - at).toBe(TRADE_TICKS);
    expect(r.visits).toBe(1);
    // (The next is due two months after this one at the soonest; it waits at home while this one walks in and trades, slice 22.)
    expect(r.next).toBeGreaterThanOrEqual(firstDue + LAND_EVERY);
    // Out the way it came: it leaves the map at the north edge, and heads home on the map.
    let pos = position(w);
    expect(until(sim, () => { if (s.walkers.includes(w)) pos = position(w); return !s.walkers.includes(w); }, 3000)).toBe(true);
    expect(pos[1]).toBeLessThan(1);
    expect(Math.abs(pos[0] - 86.5)).toBeLessThan(1.5);
    expect(caravanTraveller(s, 'corinth', true)).toBeDefined();
    expect(caravansOnMap(s, r, s.tick)).toEqual([{ along: EDGE_ALONG, homeward: true }]);
    ledgerAddsUp(s);
  }, 30000);

  it('with no road on its side it comes in by another edge road; with none reaching the yard it turns back, and says why', () => {
    const sim = corinth();
    const s = sim.state;
    const yard = caravanYard(s)!;
    // Cut the road to the north edge: Corinth's caravans come in from the west.
    send(sim, { type: 'clear', x0: 86, z0: 0, x1: 86, z1: 0 });
    expect(s.tiles[NORTH_EDGE]).not.toBe(-1);
    expect(caravanEntry(s, N, yard, 'corinth')!.edge).toBe(WEST_EDGE);
    // The yard's own road gone: none reaches it.
    send(sim, { type: 'clear', x0: 113, z0: 41, x1: 113, z1: 41 });
    expect(caravanEntry(s, N, yard, 'corinth')).toBeNull();
    const r = routeOf(s, 'corinth', 'land')!;
    const due = r.next;
    expect(until(sim, () => r.missedAt > 0, FIRST_TRADER + 10)).toBe(true);
    expect(s.tick).toBe(due);
    expect(r.missed).toBe('road');
    expect(caravanOf(s, 'corinth')).toBeUndefined();
    expect(caravanTraveller(s, 'corinth', true)).toBeDefined();
    expect(r.next).toBeGreaterThan(s.tick);
    expect(r.visits).toBe(0);
  });

  it('sells within the year’s limit: the porters carry the surplus to the yard, and the caravan pays as it leaves', () => {
    const sim = corinth({ sell: true });
    const s = sim.state;
    const r = routeOf(s, 'corinth', 'land')!;
    const yard = caravanYard(s)!;
    // Keep no meat: all of it is surplus. And only 100 left of this year's limit.
    send(sim, { type: 'trade', good: MEAT, keep: 0 });
    expect(until(sim, () => held(yard, MEAT) >= 100 && (caravanOf(s, 'corinth')?.wait ?? 0) > 0, 4 * TICKS_PER_MONTH)).toBe(true);
    // (Slice 31: the limit follows Corinth's people, so it is read once the caravan trades.)
    const limit = yearlyLimit(s, 'corinth', MEAT_K);
    r.sold[MEAT_K] = limit - 100;
    const w = caravanOf(s, 'corinth')!;
    // It pays at your price as it settles (which then slides, as the meat piles up in Corinth).
    let price = 0;
    for (let i = 0; i < 3000 && !w.back; i++) {
      price = priceAt(s, 'corinth', MEAT_K, 100);
      sim.step();
    }
    expect(w.back).toBe(true);
    expect(r.lastSold[MEAT_K]).toBe(100);
    expect(r.sold[MEAT_K]).toBe(limit);
    expect(r.lastPaid).toBe(price);
    expect(priceAt(s, 'corinth', MEAT_K, 100)).toBeLessThan(price);
    expect(s.ledger.now.some((l) => l.kind === 'sales' && l.what === 'meat to Corinth' && l.amount === r.lastPaid)).toBe(true);
    // What it didn't take stays at the yard.
    expect(held(yard, MEAT)).toBeGreaterThan(0);
    ledgerAddsUp(s);
  }, 30000);

  it('buying: the wine is unloaded at the yard and paid for at once, and the porters carry it to the stores', () => {
    const sim = corinth({ buy: 1200 });
    const s = sim.state;
    const r = routeOf(s, 'corinth', 'land')!;
    const yard = caravanYard(s)!;
    expect(cityHolds(s, WINE)).toBe(0);
    let price = 0;
    for (let i = 0; i < 3000 && !((caravanOf(s, 'corinth')?.wait ?? 0) > 0); i++) {
      price = priceAt(s, 'corinth', WINE_K, 100);
      sim.step();
    }
    expect((caravanOf(s, 'corinth')?.wait ?? 0) > 0).toBe(true);
    const n = r.unloaded[WINE_K];
    expect(n).toBeGreaterThanOrEqual(500);
    expect(n).toBeLessThanOrEqual(1200);
    expect(held(yard, WINE)).toBe(n);
    // Paid at your price as it unloads (and dearer afterwards: the wine is gone from Corinth).
    expect(r.cost).toBe(Math.round((n * price) / 100));
    expect(s.ledger.now.some((l) => l.kind === 'imports' && l.what === 'wine from Corinth' && l.amount === -r.cost)).toBe(true);
    expect(priceAt(s, 'corinth', WINE_K, 100)).toBeGreaterThan(price);
    expect(s.stocks.now.some((l) => l.ware === WINE && l.kind === 'bought' && l.what === 'corinth' && l.n === n)).toBe(true);
    expect(until(sim, () => cityHolds(s, WINE) > 0, 600)).toBe(true);
    ledgerAddsUp(s);
  }, 30000);

  it('buying stops at what the treasury can spare now, keeping back a month’s wages', () => {
    const sim = corinth({ buy: 1200 });
    const s = sim.state;
    const r = routeOf(s, 'corinth', 'land')!;
    until(sim, () => !!caravanOf(s, 'corinth'), FIRST_TRADER + 10);
    const w = caravanOf(s, 'corinth')!;
    until(sim, () => w.path.length / 2 - 1 - w.seg < 3, 3000);
    // Just before it reaches the yard, only 100 dr to spare beyond a month's wages: it brings what that buys.
    expect(importPurse(s)).toBeGreaterThan(100);
    pay(s, -(importPurse(s) - 100), 'routes', 'a test');
    // (Slice 30: no taxes coming in day by day in the last few steps, so what it can spare is the 100 dr left here.)
    sim.enqueue({ type: 'crime', on: false });
    const money = s.money;
    expect(until(sim, () => w.wait > 0, 200)).toBe(true);
    expect(r.unloaded[WINE_K]).toBeGreaterThan(0);
    expect(r.cost).toBeLessThanOrEqual(100);
    expect(money - s.money).toBeLessThanOrEqual(100 + 20);
    expect(spendable(s)).toBeGreaterThanOrEqual(wageBill(s));
    ledgerAddsUp(s);
  }, 30000);

  it('caravans come every two months, but one at a time: to a yard far from the edge the next sets off once the last has traded, and they pass on the road', () => {
    const sim = corinth({ sell: true });
    const s = sim.state;
    const r = routeOf(s, 'corinth', 'land')!;
    const entered: number[] = [];
    const seen = new Set<number>();
    const trips = new Set<string>();
    let most = 0;
    for (let i = 0; i < FIRST_TRADER + 3 * LAND_EVERY + 10; i++) {
      sim.step();
      const here = s.walkers.filter((w) => w.kind === 'caravan');
      for (const w of here) if (!seen.has(w.id)) seen.add(w.id) && entered.push(s.tick);
      // Never two of its caravans walking in or trading at once (one walks out as the next walks in).
      expect(here.filter((w) => !w.back).length).toBeLessThanOrEqual(1);
      most = Math.max(most, here.length);
      for (const t of s.world.travellers) if (!t.homeward) trips.add(`${t.start}:${t.dur}`);
    }
    // #routes' yard is a long walk from the north edge (about two months each way), so one walks out as the next walks in, a little more than two months apart.
    expect(most).toBe(2);
    expect(entered).toHaveLength(3);
    for (const [i, t] of entered.slice(1).entries()) {
      expect(t - entered[i]).toBeGreaterThan(LAND_EVERY);
      expect(t - entered[i]).toBeLessThan(LAND_EVERY + TICKS_PER_MONTH);
    }
    // Each one's whole way down the road on the map of Greece, none cut short.
    expect([...trips].map((t) => Number(t.split(':')[1]))).toEqual([...trips].map(() => landTicks('corinth')));
    expect(r.visits).toBe(2);
    ledgerAddsUp(s);
  }, 60000);
});

describe('foreign ships', () => {
  /** Her pace at sea on the map (table units a tick): steady over her voyage, the fastest she ever moves there. */
  const SEA_PACE = (lineLength(wayPoints(wayOf('athens-sea'))) - HORIZON_ALONG) / voyageTicks('athens');
  /** Where she is each tick, and the biggest step between two ticks, in the bay and on the map. */
  const watch = (sim: Sim, city: 'athens', ticks: number, each?: () => void): { bay: number; sea: number } => {
    const s = sim.state;
    const r = routeOf(s, city, 'sea')!;
    let bay = 0;
    let sea = 0;
    let p = visitorAt(r.ship!, s.tick, BAY.size);
    let m = visitorOnMap(r, s.tick, BAY.size);
    for (let i = 0; i < ticks; i++) {
      sim.step();
      const q = visitorAt(r.ship!, s.tick, BAY.size);
      const n = visitorOnMap(r, s.tick, BAY.size);
      if (p && q) bay = Math.max(bay, Math.hypot(q.x - p.x, q.z - p.z));
      sea = Math.max(sea, Math.abs(n.along - m.along));
      p = q;
      m = n;
      each?.();
    }
    return { bay, sea };
  };

  it('ties up at the jetty, unloads what you ordered, loads what she buys, pays and sails, never jumping', () => {
    const sim = fresh('athensship');
    const s = sim.state;
    const r = routeOf(s, 'athens', 'sea')!;
    const post = tradingPost(s)!;
    // The demo opens as she comes in up the bay; the traders chip names her first once she is here (the Tyre ship is due).
    expect(r.ship!.phase).toBe(SHIP_COMING);
    for (let i = 0; i < TICKS_PER_MONTH && r.ship!.phase !== SHIP_MOORED; i++) sim.step();
    expect(r.ship!.phase).toBe(SHIP_MOORED);
    expect(tradersNews(s, shipNews(s)).map((n) => n.who)).toEqual(['athens-sea', 'tyre']);
    expect(r.unloaded[WINE_K]).toBe(600);
    expect(s.ledger.now.some((l) => l.kind === 'imports' && l.what === 'wine from Athens')).toBe(true);
    let sales = false;
    const steps = watch(sim, 'athens', 2 * TICKS_PER_MONTH, () => {
      if (r.ship!.phase === SHIP_LEAVING && s.tick === r.ship!.since) sales = s.ledger.now.some((l) => l.kind === 'sales' && l.what.endsWith(' to Athens'));
    });
    expect(r.visits).toBe(1);
    expect(r.lastSold.reduce((a, n) => a + n, 0)).toBeGreaterThan(0);
    expect(r.lastPaid).toBeGreaterThan(0);
    expect(sales).toBe(true);
    // What she didn't buy stays on the quay.
    expect(held(post, WINE)).toBe(0);
    expect(steps.bay).toBeLessThan(1.5);
    expect(steps.sea).toBeLessThan(SEA_PACE * 1.05);
    ledgerAddsUp(s);
  }, 30000);

  it('while the Tyre ship is loading another anchors in the bay and waits, then comes alongside; the jetty is never shared', () => {
    const sim = fresh('anchor');
    const s = sim.state;
    const r = routeOf(s, 'athens', 'sea')!;
    const v = r.ship!;
    expect(v.phase).toBe(SHIP_ANCHORED);
    expect(v.aside).not.toBe(0);
    expect(v.stop).toBeLessThan(1);
    expect(s.trade.ship.phase).toBe(SHIP_MOORED);
    const phases: number[] = [];
    const steps = watch(sim, 'athens', 2 * TICKS_PER_MONTH, () => {
      if (phases[phases.length - 1] !== v.phase) phases.push(v.phase);
      expect(v.phase === SHIP_MOORED && s.trade.ship.phase === SHIP_MOORED).toBe(false);
      if (v.phase === SHIP_BERTHING || v.phase === SHIP_MOORED) expect(s.trade.ship.phase === SHIP_LEAVING && s.tick - s.trade.ship.since < 2).toBe(false);
    });
    expect(phases.slice(0, 5)).toEqual([SHIP_ANCHORED, SHIP_BERTHING, SHIP_MOORED, SHIP_LEAVING, SHIP_AWAY]);
    expect(r.visits).toBe(1);
    expect(steps.bay).toBeLessThan(1.5);
    expect(steps.sea).toBeLessThan(SEA_PACE * 1.05);
    ledgerAddsUp(s);
  }, 30000);
});

describe('the books', () => {
  it('the stock book accounts for every measure bought and sold through the routes', () => {
    const sim = corinth({ sell: true, buy: 1200 });
    const s = sim.state;
    send(sim, { type: 'trade', good: MEAT, keep: 0 });
    // Month by month while the caravan comes and trades: each ware's stock moves by exactly the month's net.
    const r = routeOf(s, 'corinth', 'land')!;
    sim.run((TICKS_PER_MONTH - 1 - (s.tick % TICKS_PER_MONTH) + TICKS_PER_MONTH) % TICKS_PER_MONTH);
    const before = WARES.map((w) => stockOf(s, w).total);
    const sum = WARES.map(() => 0);
    for (let m = 0; m < 8 && !(r.visits >= 1 && s.tick > r.lastAt + TICKS_PER_DAY); m++) {
      sim.run(TICKS_PER_MONTH);
      if (m === 0) sim.step();
      const b = bookNow(s);
      WARES.forEach((w, i) => {
        sum[i] += totalsOf(b.last, w).net;
        expect(stockOf(s, w).total - before[i], `ware ${w}`).toBe(sum[i] + totalsOf(b.now, w).net);
      });
    }
    expect(r.visits).toBe(1);
    const lines = [...s.stocks.now, ...s.stocks.last];
    expect(lines.some((l) => l.ware === WINE && l.kind === 'bought' && l.what === 'corinth') || r.lastBought[WINE_K] > 0).toBe(true);
    ledgerAddsUp(s);
  }, 30000);
});

describe('determinism and saves', () => {
  it('the same seed and commands give the same town with routes open; a replay of the log rebuilds it', () => {
    const a = new Sim();
    DEMOS.buywine.setup!(a);
    const b = new Sim();
    DEMOS.buywine.setup!(b);
    a.run(TICKS_PER_MONTH);
    b.run(TICKS_PER_MONTH);
    expect(serialize(a.state)).toBe(serialize(b.state));
    const re = replay(a.state.seed, a.log, a.state.tick);
    expect(serialize(re.state)).toBe(serialize(a.state));
  }, 60000);

  it('a town with a caravan on the road, one in the city and a ship at anchor round-trips and plays on the same', () => {
    for (const name of ['caravan', 'anchor']) {
      const sim = fresh(name);
      if (name === 'caravan') expect(caravanOf(sim.state, 'corinth')).toBeDefined();
      const got = decodeSave(encodeSave(sim.state, 1));
      if (!got.ok) throw new Error(got.why);
      expect(JSON.stringify(got.file.state)).toBe(JSON.stringify(sim.state));
      const again = new Sim();
      again.state = got.file.state;
      sim.run(TICKS_PER_MONTH);
      again.run(TICKS_PER_MONTH);
      expect(serialize(again.state)).toBe(serialize(sim.state));
    }
  }, 30000);

  it('a slice 15 save (state version 15) loads with no routes, plays on, and can open one', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/slice15-quay.save.json.gz')).toString();
    expect(JSON.parse(text).state.version).toBe(15);
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    expect(got.file.from).toBe(15);
    const s = got.file.state;
    expect(s.version).toBe(SIM_STATE_VERSION);
    expect(s.world.routes).toEqual([]);
    expect(s.world.travellers).toEqual([]);
    const sim = new Sim();
    sim.state = s;
    sim.run(TICKS_PER_MONTH);
    expect(tradingPost(s)).toBeDefined();
    income(s, 2000, 'sales', 'a test');
    send(sim, { type: 'route', city: 'athens', kind: 'sea' });
    expect(routeOf(s, 'athens', 'sea')).toBeDefined();
    sim.run(TICKS_PER_DAY);
    ledgerAddsUp(s);
  });

  it('refuses a damaged route in plain words', () => {
    const sim = corinth();
    const r = sim.state.world.routes[0];
    expect(decodeSave(encodeSave(sim.state, 1)).ok).toBe(true);
    r.sell = [true];
    const got = decodeSave(encodeSave(sim.state, 1));
    expect(got.ok).toBe(false);
    if (!got.ok) expect(got.why).toBe('This save is damaged (its map of Greece is wrong), so it can’t be opened.');
    r.sell = r.buy.slice();
    r.city = 'babylon' as never;
    expect(decodeSave(encodeSave(sim.state, 1)).ok).toBe(false);
  });

  it('a town that never opens a route or builds a yard never touches the routes', () => {
    const sim = fresh('quay');
    sim.run(2 * TICKS_PER_MONTH);
    expect(sim.state.world.routes).toEqual([]);
    expect(sim.state.world.travellers).toEqual([]);
    expect(sim.state.walkers.some((w) => w.kind === 'caravan')).toBe(false);
    void setHeld;
  });
});

describe('slice 31', () => {
  it('one yearly limit for a city, whether you trade with it by road or by sea', () => {
    const sim = corinth({ sell: true });
    const s = sim.state;
    const r = routeOf(s, 'corinth', 'land')!;
    const yard = caravanYard(s)!;
    send(sim, { type: 'trade', good: MEAT, keep: 0 });
    expect(until(sim, () => held(yard, MEAT) >= 100 && (caravanOf(s, 'corinth')?.wait ?? 0) > 0, 4 * TICKS_PER_MONTH)).toBe(true);
    // A sea route to Corinth has sold all but 100 of this year's meat: the caravan takes no more than the 100.
    const sea = { ...r, kind: 'sea' as const, sold: r.sold.map(() => 0), bought: r.bought.map(() => 0), hold: r.hold.map(() => 0), ship: null };
    s.world.routes.push(sea);
    sea.sold[MEAT_K] = yearlyLimit(s, 'corinth', MEAT_K) - 100;
    expect(soldTo(s, 'corinth', MEAT_K)).toBe(r.sold[MEAT_K] + sea.sold[MEAT_K]);
    const w = caravanOf(s, 'corinth')!;
    for (let i = 0; i < 3000 && !w.back; i++) sim.step();
    expect(w.back).toBe(true);
    expect(r.lastSold[MEAT_K]).toBeLessThanOrEqual(100);
    expect(soldTo(s, 'corinth', MEAT_K)).toBeLessThanOrEqual(yearlyLimit(s, 'corinth', MEAT_K));
  }, 30000);

  it('a caravan trading in your streets when its road is closed pays for what it has loaded and leaves', () => {
    const sim = corinth({ sell: true });
    const s = sim.state;
    const r = routeOf(s, 'corinth', 'land')!;
    const yard = caravanYard(s)!;
    send(sim, { type: 'trade', good: MEAT, keep: 0 });
    expect(until(sim, () => (caravanOf(s, 'corinth')?.wait ?? 0) > 0, 4 * TICKS_PER_MONTH)).toBe(true);
    const w = caravanOf(s, 'corinth')!;
    const visits = r.visits;
    r.closed = s.tick;
    sim.step();
    expect(w.back).toBe(true);
    expect(w.wait).toBe(0);
    expect(r.visits).toBe(visits + 1);
    const left = held(yard, MEAT);
    sim.run(2 * TICKS_PER_DAY);
    expect(held(yard, MEAT)).toBeGreaterThanOrEqual(left);
  }, 30000);
});
