/**
 * Favours, offers and tribute (slice 19): when rulers may ask (six months
 * after your first route, two deals open at most, one a ruler), what each
 * answer is worth and how long it is remembered, a request sent (the goods
 * leaving the stores and the city, arriving by the day it said), promised and
 * broken, refused, let run out; a year's offer taken and kept or not;
 * tribute only from the proud or warlike who are far stronger, refused (a
 * threat follows from a cold ruler) or paid yearly; the news one piece at a
 * time; and saves.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { coastMap } from '../src/map/bake';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '../src/sim/clock';
import {
  answerMemory,
  answerRefusal,
  ASK_AFTER,
  deadlineFor,
  firstRoute,
  makeOffer,
  makeRequest,
  makeTribute,
  mayDemand,
  mayOffer,
  offerGoods,
  MOST_OPEN,
  OFFER_KEPT,
  offerLeft,
  offerPrice,
  openDeals,
  REQUEST_GOODS_DAYS,
  requestCoin,
  requestSize,
  sendTicks,
  stepFavours,
  TRIBUTE_DAYS,
  tributeSize,
  WORTH,
} from '../src/sim/favours';
import { WHEAT } from '../src/sim/foods';
import { routeOf } from '../src/sim/routes';
import { deserialize, serialize, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type Deal, type SimState, type Trait, type WorldCity } from '../src/sim/state';
import { newsNow, townLines } from '../src/sim/status';
import { bookNow } from '../src/sim/stocks';
import { cityHolds, TRADE_GOODS } from '../src/sim/trade';
import { totals } from '../src/sim/treasury';
import { cityOf, COLD, freshWorld, moodOf, yourPrice } from '../src/sim/world';
import { demoSim } from './prepared';

const map = coastMap();

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
const until = (sim: Sim, ok: () => boolean, most: number): boolean => {
  for (let i = 0; i < most && !ok(); i++) sim.step();
  return ok();
};
const withTraits = (c: WorldCity, traits: Trait[]): WorldCity => ({ ...c, ruler: { ...c.ruler!, traits }, memories: [] });
/** A ruler asks the town for a good (a trade good's index) or coin (-1), of the usual size. */
const ask = (s: SimState, city: 'athens' | 'sparta' | 'corinth' | 'troy', good: number): Deal => {
  const c = cityOf(s.world, city);
  return makeRequest(s, map, c, good, good < 0 ? requestCoin(s) : requestSize(s, c, good), 'for the test');
};
const OIL_K = 3;
const WHEAT_K = 0;

describe('when rulers ask', () => {
  it('nothing until six months after the first route; never more than two open, nor two from one ruler', () => {
    const sim = fresh('caravan');
    const s = sim.state;
    const first = firstRoute(s.world);
    expect(first).toBeGreaterThan(0);
    expect(s.world.deals).toEqual([]);
    let earliest = Infinity;
    for (let day = 0; day < 3 * 360; day++) {
      sim.run(TICKS_PER_DAY);
      const open = openDeals(s.world);
      expect(open.length).toBeLessThanOrEqual(MOST_OPEN);
      expect(new Set(open.map((d) => d.city)).size).toBe(open.length);
      for (const d of s.world.deals) earliest = Math.min(earliest, d.at);
    }
    expect(s.world.nextDeal).toBeGreaterThan(3);
    expect(earliest).toBeGreaterThanOrEqual(first + ASK_AFTER);
    ledgerAddsUp(s);
  }, 180000);

  it('a gift alone is not a route: with no route open, no ruler asks anything', () => {
    const s = fresh('caravan').state;
    s.world.routes = [];
    const t0 = Math.ceil(s.tick / TICKS_PER_MONTH) * TICKS_PER_MONTH;
    for (let m = 0; m < 24; m++) {
      s.tick = t0 + m * TICKS_PER_MONTH;
      stepFavours(s, map);
    }
    expect(s.world.deals).toEqual([]);
  });

  it('the time given is enough to send it: at least what sending would take, a quarter again', () => {
    const s = fresh('caravan').state;
    for (const [city, good] of [['sparta', WHEAT_K], ['corinth', OIL_K], ['sparta', -1]] as const) {
      const amount = good < 0 ? 400 : 1000;
      const t = sendTicks(s, map, { city, good, amount });
      expect(t).toBeGreaterThan(0);
      const due = deadlineFor(s, map, city, good, amount, good < 0 ? 2 * TICKS_PER_MONTH : REQUEST_GOODS_DAYS);
      expect(due).toBeGreaterThanOrEqual(t * 1.25);
    }
  });
});

describe('what an answer is worth', () => {
  const w = freshWorld(7);
  const plain = withTraits(cityOf(w, 'corinth'), ['pious', 'shrewd']);
  const worth = (c: WorldCity, a: Parameters<typeof answerMemory>[1], coin = false): number => answerMemory(c, a, 'x', 0, 1, coin).amount;

  it('help is remembered kindly, a refusal less so, a broken promise worst of all; each personality bends it, and says how', () => {
    expect(worth(plain, 'met')).toBe(WORTH.met);
    expect(worth(plain, 'refused')).toBe(WORTH.refused);
    expect(worth(plain, 'broken')).toBe(WORTH.broken);
    expect(WORTH.broken).toBeLessThan(WORTH.refused);
    expect(WORTH.refused).toBeLessThan(WORTH.lapsed);
    expect(worth(withTraits(plain, ['generous']), 'met')).toBe(Math.round(WORTH.met * 1.25));
    const proud = answerMemory(withTraits(plain, ['proud']), 'broken', 'x', 0);
    expect(proud.amount).toBe(Math.round(WORTH.broken * 1.5));
    expect(proud.why).toMatch(/proud/);
    expect(worth(withTraits(plain, ['greedy']), 'paid', true)).toBe(Math.round(WORTH.paid * 1.5));
    expect(worth(withTraits(plain, ['greedy']), 'paid', false)).toBe(WORTH.paid);
    expect(worth(withTraits(plain, ['steadfast']), 'refused')).toBe(Math.round(WORTH.refused * 0.75));
    // Only a proud ruler minds an offer turned down.
    expect(worth(plain, 'declined')).toBe(0);
    expect(worth(withTraits(plain, ['proud']), 'declined')).toBe(WORTH.declined);
  });

  it('a broken promise is remembered longest, defied tribute next', () => {
    const fade = (a: Parameters<typeof answerMemory>[1]): number => answerMemory(plain, a, 'x', 0).fade;
    for (const a of ['met', 'refused', 'lapsed', 'paid', 'defied', 'taken', 'kept', 'declined'] as const) expect(fade('broken')).toBeGreaterThan(fade(a));
    for (const a of ['met', 'refused', 'lapsed', 'paid', 'taken', 'kept', 'declined'] as const) expect(fade('defied')).toBeGreaterThan(fade(a));
  });
});

describe('a request', () => {
  it('sent: the goods go from the stores to the yard, a caravan carries them out, and they arrive about when it said, in time', () => {
    const sim = fresh('caravan');
    const s = sim.state;
    const c = cityOf(s.world, 'sparta');
    const d = ask(s, 'sparta', WHEAT_K);
    expect(d.amount).toBeGreaterThanOrEqual(200);
    expect(d.amount).toBeLessThanOrEqual(cityHolds(s, WHEAT) * 0.6);
    const before = moodOf(c, s.tick);
    const eta = s.tick + sendTicks(s, map, d);
    expect(eta).toBeLessThan(d.due);
    expect(townLines(s, map).some((l) => l.need === 'favour' && /Sparta/.test(l.text))).toBe(true);
    send(sim, { type: 'answer', deal: d.id, act: 'send' });
    const g = s.world.gifts.find((x) => x.deal === d.id)!;
    expect(g).toBeDefined();
    expect(d.gift).toBe(g.id);
    let caravan = false;
    let porters = false;
    let booked = 0;
    const book = (): number => bookNow(s).now.filter((l) => l.kind === 'sold' && l.what === 'sent:sparta').reduce((a, l) => a + l.n, 0);
    until(
      sim,
      () => {
        if (s.tick % TICKS_PER_MONTH === TICKS_PER_MONTH - 1) booked += book();
        if (s.walkers.some((w) => w.kind === 'caravan' && w.cheese === g.id)) caravan = true;
        if (s.walkers.some((w) => w.kind === 'docker' && w.cheese === g.id)) porters = true;
        return d.state !== 'open';
      },
      8 * TICKS_PER_MONTH,
    );
    expect(porters).toBe(true);
    expect(caravan).toBe(true);
    expect(d.state).toBe('met');
    expect(Math.abs(s.tick - eta)).toBeLessThan(10 * TICKS_PER_DAY);
    expect(c.memories.find((m) => m.kind === 'met')?.amount).toBe(Math.round(WORTH.met * 1.25)); // (Eurykrates is generous)
    expect(moodOf(c, s.tick)).toBeGreaterThan(before + 20);
    expect(s.world.news.some((n) => /reached Sparta/.test(n.line))).toBe(true);
    expect(booked + (s.tick % TICKS_PER_MONTH === TICKS_PER_MONTH - 1 ? 0 : book())).toBe(d.amount);
  }, 120000);

  it('in coin: paid out of the treasury at once, on its own line, and the herald brings it', () => {
    const sim = fresh('caravan');
    const s = sim.state;
    const d = ask(s, 'corinth', -1);
    const money = s.money;
    send(sim, { type: 'answer', deal: d.id, act: 'send' });
    expect(s.money).toBe(money - d.amount);
    expect(s.ledger.now.find((l) => l.kind === 'favours')?.amount).toBe(-d.amount);
    ledgerAddsUp(s);
    until(sim, () => d.state !== 'open', 2 * TICKS_PER_MONTH);
    expect(d.state).toBe('met');
  });

  it('promised: a little goodwill at once; let run out, the promise is broken and remembered worst', () => {
    const sim = fresh('caravan');
    const s = sim.state;
    const c = cityOf(s.world, 'athens');
    const d = ask(s, 'athens', WHEAT_K);
    send(sim, { type: 'answer', deal: d.id, act: 'promise' });
    expect(d.promised).toBe(true);
    expect(c.memories.find((m) => m.kind === 'promise')?.amount).toBe(WORTH.promise);
    expect(answerRefusal(s, map, d, 'promise')).toMatch(/promised/);
    d.due = s.tick + 5 * TICKS_PER_DAY;
    sim.run(6 * TICKS_PER_DAY);
    expect(d.state).toBe('broken');
    expect(c.memories.some((m) => m.kind === 'promise')).toBe(false);
    expect(c.memories.find((m) => m.kind === 'broken')?.amount).toBe(WORTH.broken);
    expect(s.world.news.some((n) => /promised Athens/.test(n.line))).toBe(true);
  });

  it('promised, then refused: broken too; refused outright: a lesser sting; let run out unpromised: less again', () => {
    for (const [promise, act, state, kind] of [
      [true, 'refuse', 'broken', 'broken'],
      [false, 'refuse', 'refused', 'refused'],
      [false, 'wait', 'lapsed', 'lapsed'],
    ] as const) {
      const sim = fresh('caravan');
      const s = sim.state;
      const c = cityOf(s.world, 'corinth');
      const d = ask(s, 'corinth', OIL_K);
      if (promise) send(sim, { type: 'answer', deal: d.id, act: 'promise' });
      if (act === 'refuse') send(sim, { type: 'answer', deal: d.id, act: 'refuse' });
      else {
        d.due = s.tick + TICKS_PER_DAY;
        sim.run(2 * TICKS_PER_DAY);
      }
      expect(d.state).toBe(state);
      expect(c.memories.find((m) => m.kind === kind)?.amount).toBe(WORTH[kind]);
    }
  });

  it('refuses answers that cannot be given, in plain words, and a wrong answer changes nothing', () => {
    const sim = fresh('caravan');
    const s = sim.state;
    const d = ask(s, 'sparta', WHEAT_K);
    d.amount = 1_000_000;
    expect(answerRefusal(s, map, d, 'send')).toMatch(/granaries hold/);
    expect(answerRefusal(s, map, d, 'take')).toMatch(/Not an offer/);
    const before = JSON.stringify([s.world, s.money, s.walkers]);
    send(sim, { type: 'answer', deal: d.id, act: 'send' });
    send(sim, { type: 'answer', deal: 999, act: 'refuse' });
    send(sim, { type: 'answer', deal: d.id, act: 'take' });
    expect(JSON.stringify([s.world, s.money, s.walkers])).toBe(before);
    expect(d.state).toBe('open');
    expect(d.gift).toBe(0);
  });
});

describe('an offer', () => {
  it('taken: the good is ticked on the route, sold at their price or better, beyond their usual limit, and counted', () => {
    const sim = fresh('prices');
    const s = sim.state;
    const c = cityOf(s.world, 'corinth');
    const d = makeOffer(s, c, OIL_K, 'buy');
    expect(d.price).toBeGreaterThanOrEqual(yourPrice(s.world, 'corinth', OIL_K, s.tick));
    send(sim, { type: 'answer', deal: d.id, act: 'take' });
    expect(d.state).toBe('taken');
    expect(routeOf(s, 'corinth', 'land')!.sell[OIL_K]).toBe(true);
    expect(offerPrice(s, d)).toBeGreaterThanOrEqual(yourPrice(s.world, 'corinth', OIL_K, s.tick));
    expect(until(sim, () => d.done > 0, 6 * TICKS_PER_MONTH)).toBe(true);
    expect(offerLeft(d)).toBe(d.amount - d.done);
    ledgerAddsUp(s);
  }, 120000);

  it('kept to (a quarter of it or more by the year end): remembered kindly; too little: remembered as reneging', () => {
    for (const [done, state, kind] of [
      [1, 'kept', 'kept'],
      [0, 'broken', 'reneged'],
    ] as const) {
      const sim = fresh('prices');
      const s = sim.state;
      const c = cityOf(s.world, 'corinth');
      const d = makeOffer(s, c, OIL_K, 'buy');
      send(sim, { type: 'answer', deal: d.id, act: 'take' });
      d.done = Math.ceil(d.amount * OFFER_KEPT) * done;
      d.until = s.tick + TICKS_PER_DAY;
      sim.run(2 * TICKS_PER_DAY);
      expect(d.state).toBe(state);
      expect(c.memories.some((m) => m.kind === kind)).toBe(true);
    }
  });

  it('let lapse unanswered: no memory at all; declined: none unless the ruler is proud', () => {
    const sim = fresh('prices');
    const s = sim.state;
    const c = cityOf(s.world, 'corinth');
    const n = c.memories.length;
    const d = makeOffer(s, c, OIL_K, 'buy');
    d.due = s.tick + TICKS_PER_DAY;
    sim.run(2 * TICKS_PER_DAY);
    expect(d.state).toBe('lapsed');
    expect(c.memories.length).toBe(n);
  });
});

describe('an offer, and what else is going on', () => {
  it('to sell you a good: a fifth off today’s price, the trader’s imports paid at it and counted under it', () => {
    const sim = fresh('buywine');
    const s = sim.state;
    const c = cityOf(s.world, 'corinth');
    const WINE_K = 5;
    const today = yourPrice(s.world, 'corinth', WINE_K, s.tick);
    const d = makeOffer(s, c, WINE_K, 'sell');
    expect(d.price).toBe(Math.round(today * 0.8));
    send(sim, { type: 'answer', deal: d.id, act: 'take' });
    expect(routeOf(s, 'corinth', 'land')!.buy[WINE_K]).toBe(true);
    expect(until(sim, () => d.done > 0, 6 * TICKS_PER_MONTH)).toBe(true);
    const line = s.ledger.now.concat(s.ledger.last).find((l) => l.kind === 'imports' && /wine/.test(l.what))!;
    expect(line).toBeDefined();
    expect((-line.amount * 100) / line.n).toBeLessThanOrEqual(d.price + 1);
    ledgerAddsUp(s);
  }, 120000);

  it('none to buy a good your city has none to spare of, and no second offer while one of theirs runs', () => {
    const sim = fresh('caravan');
    const s = sim.state;
    const c = cityOf(s.world, 'corinth');
    c.memories.push({ kind: 'staged', why: 'x', amount: 40, tick: s.tick, fade: 10 * TICKS_PER_YEAR });
    expect(mayOffer(s, c)).toBe(true);
    // (Oil: the town makes it, sells none, and keeps more than it holds.)
    for (const r of s.world.routes) r.sold[OIL_K] = 0;
    s.trade.keep[OIL_K] = cityHolds(s, TRADE_GOODS[OIL_K]) + 100;
    expect(offerGoods(s, c)).not.toContain(OIL_K);
    s.trade.keep[OIL_K] = 0;
    if (cityHolds(s, TRADE_GOODS[OIL_K]) >= 300) expect(offerGoods(s, c)).toContain(OIL_K);
    const d = makeOffer(s, c, OIL_K, 'buy');
    send(sim, { type: 'answer', deal: d.id, act: 'take' });
    expect(mayOffer(s, c)).toBe(false);
  });

  it('a promise to a ruler stands until its own request is settled, not when their year’s deal ends meanwhile', () => {
    const sim = fresh('prices');
    const s = sim.state;
    const c = cityOf(s.world, 'corinth');
    const o = makeOffer(s, c, OIL_K, 'buy');
    send(sim, { type: 'answer', deal: o.id, act: 'take' });
    const r = ask(s, 'corinth', -1);
    send(sim, { type: 'answer', deal: r.id, act: 'promise' });
    o.done = o.amount;
    o.until = s.tick + TICKS_PER_DAY;
    sim.run(2 * TICKS_PER_DAY);
    expect(o.state).toBe('kept');
    expect(c.memories.some((m) => m.kind === 'promise')).toBe(true);
  });
});

describe('tribute', () => {
  it('only from a proud or warlike ruler, wary or worse, and far stronger than your city', () => {
    const s = fresh('caravan').state;
    const sparta = cityOf(s.world, 'sparta');
    expect(sparta.ruler!.traits).toContain('warlike');
    expect(moodOf(sparta, s.tick)).toBeLessThan(0);
    expect(mayDemand(s, sparta)).toBe(true);
    expect(mayDemand(s, cityOf(s.world, 'athens'))).toBe(false);
    expect(mayDemand({ ...s, population: 5000 } as SimState, sparta)).toBe(false);
    expect(mayDemand(s, { ...sparta, memories: [...sparta.memories, { kind: 'gift', why: 'x', amount: 40, tick: s.tick, fade: TICKS_PER_YEAR }] })).toBe(false);
  });

  it('refused while wary: a heavy memory and no more; refused while cold: a threat follows (raids.test.ts)', () => {
    for (const cold of [false, true]) {
      const sim = fresh('caravan');
      const s = sim.state;
      const c = cityOf(s.world, 'sparta');
      if (cold) c.memories.push({ kind: 'history', why: 'x', amount: -40, tick: s.tick, fade: 10 * TICKS_PER_YEAR });
      expect(moodOf(c, s.tick) <= COLD).toBe(cold);
      const d = makeTribute(s, map, c, -1, tributeSize(s, c, -1, false), false);
      send(sim, { type: 'answer', deal: d.id, act: 'refuse' });
      expect(d.state).toBe('refused');
      expect(c.memories.find((m) => m.kind === 'defied')?.amount).toBe(WORTH.defied);
      expect(d.angry).toBe(false);
      expect(s.world.raids.length).toBe(cold ? 1 : 0);
    }
  });

  it('paid yearly: on the tribute line, and it comes round again three months before the year is up', () => {
    const sim = fresh('caravan');
    const s = sim.state;
    const c = cityOf(s.world, 'sparta');
    const d = makeTribute(s, map, c, -1, tributeSize(s, c, -1, true), true);
    const due = d.due;
    send(sim, { type: 'answer', deal: d.id, act: 'send' });
    expect(s.ledger.now.find((l) => l.kind === 'tribute')?.amount).toBe(-d.amount);
    until(sim, () => d.state !== 'open', 2 * TICKS_PER_MONTH);
    expect(d.state).toBe('met');
    expect(d.paid).toBe(1);
    expect(d.until).toBe(due + TICKS_PER_YEAR);
    expect(c.memories.some((m) => m.kind === 'paid')).toBe(true);
    // (Bring the next year forward.)
    d.until = s.tick + TRIBUTE_DAYS + TICKS_PER_DAY;
    const next = d.until;
    sim.run(3 * TICKS_PER_DAY);
    expect(d.state).toBe('open');
    expect(d.due).toBe(next);
    ledgerAddsUp(s);
  });
});

describe('the news from Greece', () => {
  it('shows one piece at a time, each in turn, saying how many more wait', () => {
    const s = fresh('caravan').state;
    s.world.news = [0, 1, 2].map((i) => ({ tick: s.tick, city: 'corinth' as const, line: `line ${i}` }));
    expect(newsNow(s)).toEqual({ item: s.world.news[0], waiting: 2 });
    s.tick += 5 * TICKS_PER_DAY;
    expect(newsNow(s)?.item.line).toBe('line 1');
    s.tick += 5 * TICKS_PER_DAY;
    expect(newsNow(s)).toEqual({ item: s.world.news[2], waiting: 0 });
    s.tick += 14 * TICKS_PER_DAY;
    expect(newsNow(s)).toBe(null);
  });
});

describe('saves', () => {
  it('a town with a promise, a sending on its way and a demand open round-trips and plays on the same', () => {
    const sim = fresh('caravan');
    const s = sim.state;
    const a = ask(s, 'athens', WHEAT_K);
    send(sim, { type: 'answer', deal: a.id, act: 'promise' });
    const b = ask(s, 'corinth', OIL_K);
    send(sim, { type: 'answer', deal: b.id, act: 'send' });
    const c = cityOf(s.world, 'sparta');
    makeTribute(s, map, c, -1, tributeSize(s, c, -1, true), true);
    sim.run(40);
    const got = decodeSave(encodeSave(s, 1));
    if (!got.ok) throw new Error(got.why);
    const copy = new Sim();
    copy.state = got.file.state;
    for (const n of [600, 900]) {
      sim.run(n);
      copy.run(n);
      expect(serialize(copy.state)).toBe(serialize(sim.state));
    }
  }, 120000);

  it('a slice 18 save (state version 18, a gift being fetched) loads with no deals, and plays on', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/slice18-hostile.save.json.gz')).toString();
    expect(JSON.parse(text).state.version).toBe(18);
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    expect(got.file.from).toBe(18);
    const s = got.file.state;
    expect(s.version).toBe(SIM_STATE_VERSION);
    expect(s.world.deals).toEqual([]);
    expect(s.world.nextDeal).toBe(1);
    expect(s.world.gifts.length).toBeGreaterThan(0);
    for (const g of s.world.gifts) expect(g.deal).toBe(0);
    const sim = new Sim();
    sim.state = s;
    sim.run(TICKS_PER_MONTH);
    const d = ask(s, 'sparta', -1);
    send(sim, { type: 'answer', deal: d.id, act: 'send' });
    sim.run(TICKS_PER_MONTH);
    expect(d.state).toBe('met');
    ledgerAddsUp(s);
    expect(decodeSave(encodeSave(s, 1)).ok).toBe(true);
  }, 60000);

  it('refuses a damaged deal in plain words', () => {
    const sim = fresh('caravan');
    ask(sim.state, 'corinth', -1);
    const st = JSON.parse(serialize(sim.state));
    st.world.deals[0].state = 'maybe';
    const got = decodeSave(encodeSave(st as SimState, 1));
    expect(got.ok).toBe(false);
    if (!got.ok) expect(got.why).toMatch(/map of Greece is wrong/);
  });
});
