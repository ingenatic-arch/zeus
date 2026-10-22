/**
 * Rulers who remember (slice 18): what a gift is worth to a ruler and why,
 * memories fading and personalities bending them, gifts of coin and goods
 * travelling out of the city and along the map, a hostile ruler closing their
 * route and a gift opening it again, a cold ruler's slower traders, gifts back
 * from a warm ruler, the news when a mood turns, and saves.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { coastMap } from '../src/map/bake';
import { EDGE_ALONG, HORIZON_ALONG, RULED } from '../src/map/greece';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '../src/sim/clock';
import { fairGift, giftCaravan, giftFrom, giftMemory, giftOnMap, giftRefusal, giftTo, giftValue, GIFT_MAX, settleMood, stepDiplomacy } from '../src/sim/diplomacy';
import { OIL, WHEAT, WINE } from '../src/sim/foods';
import { caravanOf, caravanTraveller, FIRST_TRADER, LAND_EVERY, landTicks, routeNews, routeOf, routeRefusal, visitorOnMap, voyageTicks } from '../src/sim/routes';
import { deserialize, serialize, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type Memory, type SimState, type Trait, type WorldCity } from '../src/sim/state';
import { bookNow } from '../src/sim/stocks';
import { cityHolds, SHIP_AWAY, tradingPost } from '../src/sim/trade';
import { totals } from '../src/sim/treasury';
import { cityOf, fadeFor, freshWorld, HOSTILE, memoryWorth, moodOf, moodReasons, moodWord, stepWorld, WARM } from '../src/sim/world';
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
/** A ruler given these traits (for the sums only). */
const withTraits = (c: WorldCity, traits: Trait[]): WorldCity => ({ ...c, ruler: { ...c.ruler!, traits }, memories: [] });
/** A town of so many people, for the sums. */
const townOf = (people: number, world = freshWorld(7)): SimState => ({ population: people, tick: 0, world }) as SimState;
const OIL_K = 3;

describe('what a gift is worth', () => {
  const s = townOf(800);
  const plain = withTraits(cityOf(s.world, 'corinth'), ['pious', 'warlike']);
  const worth = (c: WorldCity, good: number, amount: number, at = s): number => giftMemory(at, c, good, amount, 0).amount;

  it('more for a bigger gift, less from a bigger city, never past the most', () => {
    expect(fairGift(s)).toBe(400);
    expect(worth(plain, -1, 400)).toBe(20);
    expect(worth(plain, -1, 100)).toBeLessThan(worth(plain, -1, 250));
    expect(worth(plain, -1, 250)).toBeLessThan(worth(plain, -1, 500));
    expect(worth(plain, -1, 250, townOf(3000, s.world))).toBeLessThan(worth(plain, -1, 250));
    expect(worth(plain, -1, 100000)).toBe(GIFT_MAX);
    // Goods are worth what that city pays for them: a gift of what it is short of counts for more.
    const c = cityOf(s.world, 'corinth');
    expect(giftValue(s, 'corinth', OIL_K, 400)).toBe(Math.round(4 * c.price[OIL_K]));
  });

  it('bent by the ruler’s personality, each bend named', () => {
    const greedy = withTraits(plain, ['greedy', 'warlike']);
    expect(worth(greedy, -1, 400)).toBe(30);
    expect(giftMemory(s, greedy, -1, 400, 0).why).toMatch(/greedy: loves coin/);
    // (Greedy loves coin, not goods.)
    expect(worth(greedy, OIL_K, 400)).toBe(worth(plain, OIL_K, 400));
    expect(worth(withTraits(plain, ['generous', 'pious']), -1, 400)).toBe(25);
    expect(worth(withTraits(plain, ['shrewd', 'pious']), -1, 400)).toBe(16);
    expect(worth(withTraits(plain, ['steadfast', 'pious']), -1, 400)).toBe(15);
    // A proud ruler thinks little of a meagre gift (under half a fair one for your size), and doesn't mind a fair one.
    const proud = withTraits(plain, ['proud', 'pious']);
    expect(worth(proud, -1, 100)).toBe(Math.round(worth(plain, -1, 100) / 2));
    expect(giftMemory(s, proud, -1, 100, 0).why).toMatch(/meagre, for a city your size/);
    expect(worth(proud, -1, 400)).toBe(20);
    // Remembered half as long by a fickle ruler, half as long again by a steadfast one, and a kindness by a generous one.
    expect(fadeFor(withTraits(plain, ['fickle', 'pious']), 1000, true)).toBe(500);
    expect(fadeFor(withTraits(plain, ['steadfast', 'pious']), 1000, false)).toBe(1500);
    expect(fadeFor(withTraits(plain, ['generous', 'pious']), 1000, true)).toBe(1500);
    expect(fadeFor(withTraits(plain, ['generous', 'pious']), 1000, false)).toBe(1000);
  });

  it('less when it comes too soon after another; the reasons say so and add up to the mood', () => {
    const c = withTraits(plain, ['pious', 'warlike']);
    const first = giftMemory(s, c, -1, 400, 0);
    c.memories.push(first);
    // (In May, clear of Corinth's Isthmian Games in April, when a gift counts for more.)
    const second = giftMemory(s, c, -1, 400, 2 * TICKS_PER_MONTH);
    expect(second.amount).toBe(Math.round(20 / 1.7));
    expect(second.why).toMatch(/another so soon: kind, but…/);
    c.memories.push(second);
    // Six months on, the first no longer counts against the next.
    expect(giftMemory(s, c, -1, 400, 7 * TICKS_PER_MONTH).amount).toBe(Math.round(20 / 1.7));
    expect(giftMemory(s, c, -1, 400, 14 * TICKS_PER_MONTH).amount).toBe(20);
    // Fading: worth less over time, nothing after its fade; the reasons always sum to the mood.
    for (const t of [0, 3 * TICKS_PER_MONTH, 9 * TICKS_PER_MONTH, 20 * TICKS_PER_MONTH]) {
      expect(moodReasons(c, t).reduce((a, r) => a + r.worth, 0)).toBe(moodOf(c, t));
    }
    expect(memoryWorth(first, first.fade / 2)).toBe(10);
    expect(memoryWorth(first, first.fade)).toBe(0);
  });
});

describe('sending a gift', () => {
  it('of coin: paid at once, on its own line, a herald on the road, and the mood lifts when it arrives, with its reason', () => {
    const sim = fresh('routes');
    const s = sim.state;
    const c = cityOf(s.world, 'corinth');
    const was = moodOf(c, s.tick);
    const money = s.money;
    expect(s.world.contact).toBe(0);
    send(sim, { type: 'gift', city: 'corinth', good: -1, amount: 250 });
    expect(s.money).toBe(money - 250);
    expect(s.ledger.now.find((l) => l.kind === 'gifts')?.what).toBe('to Corinth');
    expect(s.world.contact).toBe(s.tick);
    ledgerAddsUp(s);
    const g = giftTo(s.world, 'corinth')!;
    expect(g.phase).toBe(2);
    // One at a time to each ruler.
    expect(giftRefusal(s, map, 'corinth', -1, 100)).toMatch(/still on its way/);
    expect(giftRefusal(s, map, 'sparta', -1, 100)).toBe('');
    expect(giftRefusal(s, map, 'sparta', -1, 120)).toMatch(/Not a gift/);
    expect(giftRefusal(s, map, 'tyre', -1, 100)).toMatch(/no ruler/);
    // On the map: along the road from your city, as long as a caravan takes and a day.
    expect(g.dur).toBe(landTicks('corinth') + TICKS_PER_DAY);
    const p0 = giftOnMap(g, s.tick)!;
    const p1 = giftOnMap(g, s.tick + g.dur / 2)!;
    expect(p1.along).toBeGreaterThan(p0.along);
    expect(p1.homeward).toBe(true);
    const preview = giftMemory(s, c, -1, 250, s.tick + g.dur);
    expect(until(sim, () => !giftTo(s.world, 'corinth'), g.dur + 2)).toBe(true);
    expect(moodOf(c, s.tick)).toBe(was + preview.amount);
    const top = moodReasons(c, s.tick).find((r) => /your gift of 250 dr/.test(r.why));
    expect(top?.fading).toBe(true);
    expect(s.world.news[s.world.news.length - 1].line).toMatch(/^Your gift of 250 dr reached Corinth/);
  }, 60000);

  it('refused without the money', () => {
    const sim = fresh('routes');
    const s = sim.state;
    s.money = 80;
    s.ledger.start = 80 - totals(s.ledger.now).net;
    expect(giftRefusal(s, map, 'corinth', -1, 100)).toMatch(/can’t spare/);
    send(sim, { type: 'gift', city: 'corinth', good: -1, amount: 100 });
    expect(s.world.gifts.length).toBe(0);
    expect(s.money).toBe(80);
  });

  it('of goods by road: the porters fetch it to the caravan yard, a caravan in your colours walks it out, and it travels the road', () => {
    const sim = fresh('routes');
    const s = sim.state;
    const c = cityOf(s.world, 'corinth');
    const oil = cityHolds(s, OIL);
    expect(oil).toBeGreaterThan(400);
    expect(giftRefusal(s, map, 'corinth', OIL, 400)).toBe('');
    expect(giftRefusal(s, map, 'corinth', WINE, 200)).toMatch(/hold less than 200 wine/);
    send(sim, { type: 'gift', city: 'corinth', good: OIL, amount: 400 });
    const g = giftTo(s.world, 'corinth')!;
    expect(g.phase).toBe(0);
    expect(g.depot).toBe(s.buildings.find((b) => b.kind === 'yard')!.id);
    // The yard's porters go for it.
    expect(until(sim, () => s.walkers.some((w) => w.kind === 'docker' && w.cheese === g.id), 200)).toBe(true);
    expect(until(sim, () => g.phase === 1, 3 * TICKS_PER_MONTH)).toBe(true);
    expect(g.got).toBe(400);
    // It went from the city's stock book as a gift. (Its stores no longer show it: since the vendors charge only for
    // what they bring, the groves make more oil than #routes uses, and fill the storehouse again meanwhile.)
    expect(bookNow(s).now.find((l) => l.kind === 'sold' && l.what === 'gift:corinth')?.n).toBe(400);
    const cv = giftCaravan(s, g)!;
    expect(cv.back && cv.food === 0 && cv.people === 3).toBe(true);
    expect(until(sim, () => g.phase === 2, 4 * TICKS_PER_MONTH)).toBe(true);
    expect(g.a0).toBe(EDGE_ALONG);
    expect(g.dur).toBe(landTicks('corinth'));
    const was = moodOf(c, s.tick);
    expect(until(sim, () => !giftTo(s.world, 'corinth'), g.dur + 2)).toBe(true);
    expect(moodOf(c, s.tick)).toBeGreaterThan(was);
    expect(moodReasons(c, s.tick).some((r) => /your gift of 400 oil/.test(r.why))).toBe(true);
    ledgerAddsUp(s);
  }, 120000);

  it('of goods by sea: the dockers fetch it to the quay, and a ship casts off and sails out of the bay', () => {
    const sim = fresh('quay');
    const s = sim.state;
    expect(tradingPost(s)).toBeTruthy();
    // (Troy is reached only by sea.)
    expect(giftRefusal(s, map, 'troy', WHEAT, 400)).toBe('');
    send(sim, { type: 'gift', city: 'troy', good: WHEAT, amount: 400 });
    const g = giftTo(s.world, 'troy')!;
    expect(g.by).toBe('sea');
    expect(until(sim, () => g.phase === 1, 3 * TICKS_PER_MONTH)).toBe(true);
    expect(g.ship).not.toBeNull();
    const a = giftOnMap(g, s.tick + 1)!;
    const b = giftOnMap(g, s.tick + 60)!;
    expect(b.along).toBeGreaterThan(a.along);
    expect(until(sim, () => g.phase === 2, 2 * TICKS_PER_MONTH)).toBe(true);
    expect(g.a0).toBe(HORIZON_ALONG);
    const c = cityOf(s.world, 'troy');
    const was = moodOf(c, s.tick);
    expect(until(sim, () => !giftTo(s.world, 'troy'), g.dur + 2)).toBe(true);
    expect(moodOf(c, s.tick)).toBeGreaterThan(was);
  }, 120000);
});

/** #buywine's town, with Corinth's lord made furious (as #hostile does). */
const furious = (): Sim => {
  const sim = fresh('buywine');
  const c = cityOf(sim.state.world, 'corinth');
  c.memories.push({ kind: 'staged', why: 'furious with your city', amount: -80, tick: sim.state.tick, fade: 0 });
  return sim;
};

describe('what the mood does to a route', () => {
  it('a hostile ruler closes it: no caravan sets off, the news says so; a gift that lifts the mood past hostile opens it again', () => {
    const sim = furious();
    const s = sim.state;
    const c = cityOf(s.world, 'corinth');
    const r = routeOf(s, 'corinth', 'land')!;
    // (#buywine opens with the next caravan already set off on the road on the map: closing the road calls it home.)
    const onRoad = caravanTraveller(s, 'corinth', false);
    expect(until(sim, () => r.closed > 0, TICKS_PER_DAY + 1)).toBe(true);
    if (onRoad) expect(onRoad.homeward).toBe(true);
    expect(caravanTraveller(s, 'corinth', false)).toBeUndefined();
    expect(moodWord(moodOf(c, s.tick))).toBe('hostile');
    expect(s.world.news[s.world.news.length - 1].line).toMatch(/is hostile now, and has closed the road to your city: furious with your city/);
    expect(routeRefusal(s, 'corinth', 'sea')).toMatch(/won’t deal with you: hostile/);
    // The caravan already in the city trades and goes; then months go by and no caravan comes.
    expect(until(sim, () => !caravanOf(s, 'corinth'), 6 * TICKS_PER_MONTH)).toBe(true);
    const landed = r.visits;
    sim.run(6 * TICKS_PER_MONTH);
    expect(caravanTraveller(s, 'corinth', false)).toBeUndefined();
    expect(r.visits).toBe(landed);
    expect(routeNews(s, r).line).toMatch(/is hostile and has closed the road/);
    // Mended with gifts.
    const need = HOSTILE + 1 - moodOf(c, s.tick);
    let sent = 0;
    while (moodOf(c, s.tick) <= HOSTILE && sent < 6) {
      send(sim, { type: 'gift', city: 'corinth', good: -1, amount: 500 });
      sent++;
      until(sim, () => !giftTo(s.world, 'corinth'), TICKS_PER_MONTH);
    }
    expect(need).toBeGreaterThan(0);
    expect(r.closed).toBe(0);
    expect(s.world.news[s.world.news.length - 1].line).toMatch(/has opened the road again/);
    // The next caravan comes a month after.
    expect(r.next - s.tick).toBeGreaterThanOrEqual(FIRST_TRADER - TICKS_PER_DAY);
    expect(until(sim, () => r.visits > landed, 6 * TICKS_PER_MONTH)).toBe(true);
    ledgerAddsUp(s);
  }, 120000);

  it('a hostile ruler closing a sea route turns their ship at sea round where she is, and sends none while it is closed', () => {
    const sim = fresh('athensship');
    const s = sim.state;
    const r = routeOf(s, 'athens', 'sea')!;
    const lane = (): ReturnType<typeof visitorOnMap> => visitorOnMap(r, s.tick);
    // Out at sea on her way in, past the middle of her voyage.
    expect(until(sim, () => lane().where === 'sea' && !lane().homeward && lane().along < 22, TICKS_PER_YEAR)).toBe(true);
    const was = lane().along;
    cityOf(s.world, 'athens').memories.push({ kind: 'staged', why: 'furious with your city', amount: -90, tick: s.tick, fade: 0 });
    expect(until(sim, () => r.closed > 0, TICKS_PER_DAY + 1)).toBe(true);
    const now = lane();
    expect(now.where).toBe('sea');
    expect(now.homeward).toBe(true);
    // (Where she was, give or take a day's sail.)
    expect(Math.abs(now.along - was)).toBeLessThan(6);
    expect(until(sim, () => lane().where === 'home', voyageTicks('athens') + 2)).toBe(true);
    sim.run(3 * TICKS_PER_MONTH);
    expect(lane().where).toBe('home');
    expect(r.ship!.phase).toBe(SHIP_AWAY);
  }, 120000);

  it('a cold ruler’s caravans come half as often again', () => {
    const sim = fresh('buywine');
    const s = sim.state;
    const c = cityOf(s.world, 'corinth');
    const r = routeOf(s, 'corinth', 'land')!;
    c.memories.push({ kind: 'staged', why: 'cross with your city', amount: -40 - moodOf(c, s.tick), tick: s.tick, fade: 0 });
    expect(moodWord(moodOf(c, s.tick))).toBe('cold');
    // At the edge of the map, the next is due three months after.
    const at = (): number => s.tick;
    let edge = 0;
    until(sim, () => !caravanTraveller(s, 'corinth', false) && r.next > s.tick + LAND_EVERY, 4 * TICKS_PER_MONTH);
    edge = at();
    expect(r.next - edge).toBeGreaterThan(LAND_EVERY);
    expect(r.next - edge).toBeLessThanOrEqual(Math.round(LAND_EVERY * 1.5));
  }, 60000);
});

describe('the rulers act on you only once your city deals with Greece', () => {
  /** Greece on its own, stepped as the sim steps it, with one ruler given traits and a mood. */
  const alone = (seed: number, traits: Trait[], mood: number, contact: number): SimState => {
    const s = { tick: 0, world: freshWorld(seed), population: 600 } as SimState;
    const c = cityOf(s.world, 'corinth');
    c.ruler!.traits = traits;
    c.memories = [{ kind: 'staged', why: 'set for the test', amount: mood, tick: 0, fade: 0 }];
    c.feel = 3;
    s.world.contact = contact;
    return s;
  };
  const run = (s: SimState, ticks: number): void => {
    for (let i = 0; i < ticks; i++) {
      s.tick++;
      stepWorld(s);
      stepDiplomacy(s);
    }
  };

  it('a fickle ruler’s whims come now and then, within their bounds, one at a time; never before contact, never for a ruler not fickle', () => {
    for (const seed of [3, 11, 29]) {
      const s = alone(seed, ['fickle', 'pious'], 0, 1);
      run(s, 10 * TICKS_PER_YEAR);
      const whims = cityOf(s.world, 'corinth').memories.filter((m) => m.kind === 'whim');
      // (Faded ones are let go: count those still remembered, and the news of the turns they made.)
      for (const m of whims) {
        expect(Math.abs(m.amount)).toBeGreaterThanOrEqual(10);
        expect(Math.abs(m.amount)).toBeLessThanOrEqual(30);
        expect(m.fade).toBeGreaterThanOrEqual(4 * TICKS_PER_MONTH);
        expect(m.fade).toBeLessThanOrEqual(7 * TICKS_PER_MONTH);
      }
      expect(whims.filter((m) => memoryWorth(m, s.tick) !== 0).length).toBeLessThanOrEqual(1);
      const turns = s.world.news.filter((n) => n.city === 'corinth' && /for now/.test(n.line));
      expect(turns.length).toBeGreaterThan(0);
    }
    for (const [traits, contact] of [[['fickle', 'pious'], 0], [['proud', 'pious'], 1]] as Array<[Trait[], number]>) {
      const s = alone(5, traits, 0, contact);
      run(s, 5 * TICKS_PER_YEAR);
      expect(cityOf(s.world, 'corinth').memories.some((m) => m.kind === 'whim')).toBe(false);
    }
  }, 60000);

  it('a warm ruler sends you gifts now and then, a cold one never, nor any before contact', () => {
    const s = alone(7, ['generous', 'pious'], 50, 1);
    let sent = 0;
    for (let i = 0; i < 5 * TICKS_PER_YEAR; i++) {
      s.tick++;
      stepWorld(s);
      stepDiplomacy(s);
      const g = giftFrom(s.world, 'corinth');
      if (g && g.start === s.tick) {
        sent++;
        expect(g.to).toBe('home');
        expect(g.a1).toBe(EDGE_ALONG);
        expect(g.note).toMatch(/friendship/);
        // (Greece alone has no city to arrive in: let it go.)
        s.world.gifts = [];
      }
    }
    expect(sent).toBeGreaterThan(0);
    expect(sent).toBeLessThanOrEqual(8);
    for (const [mood, contact] of [[WARM - 1, 1], [50, 0]]) {
      const q = alone(7, ['generous', 'pious'], mood, contact);
      run(q, 5 * TICKS_PER_YEAR);
      expect(giftFrom(q.world, 'corinth')).toBeUndefined();
      expect(cityOf(q.world, 'corinth').gave).toBe(0);
    }
  }, 60000);

  it('a ruler’s gift reaches your treasury or your stores, on the ledger and the stock book', () => {
    const sim = fresh('buywine');
    const s = sim.state;
    const c = cityOf(s.world, 'corinth');
    c.memories.push({ kind: 'staged', why: 'very fond of your city', amount: 70, tick: s.tick, fade: 0 });
    settleMood(s, c);
    const money = s.money;
    let coin = 0;
    let goods = 0;
    until(
      sim,
      () => {
        const g = giftFrom(s.world, 'corinth');
        if (g && g.start + g.dur === s.tick + 1) {
          if (g.good < 0) coin += g.amount;
          else goods++;
        }
        return coin > 0 || goods > 0;
      },
      3 * TICKS_PER_YEAR,
    );
    expect(coin + goods).toBeGreaterThan(0);
    sim.step();
    sim.step();
    const news = s.world.news[s.world.news.length - 1].line;
    expect(news).toMatch(/^A gift from Corinth: Lord \w+ sends you/);
    if (coin) expect(s.ledger.now.some((l) => l.kind === 'given' && l.what === 'from Corinth') || s.ledger.last.some((l) => l.kind === 'given')).toBe(true);
    else expect(bookNow(s).now.some((l) => l.kind === 'bought' && l.what === 'gift:corinth')).toBe(true);
    expect(s.money).not.toBeNaN();
    expect(money).toBeGreaterThan(0);
    ledgerAddsUp(s);
  }, 120000);
});

describe('the news when a mood turns', () => {
  it('names the turn and why: a gift, or a memory fading', () => {
    const s = { tick: 0, world: freshWorld(9), population: 600 } as SimState;
    const c = cityOf(s.world, 'sparta');
    c.memories = [{ kind: 'first', why: 'first word of your city pleased them', amount: 5, tick: 0, fade: 10 * TICKS_PER_DAY } as Memory];
    c.feel = 3;
    // A town that has never dealt with Greece hears nothing of it.
    const quiet = { tick: 0, world: freshWorld(9), population: 600 } as SimState;
    cityOf(quiet.world, 'sparta').memories = [{ kind: 'staged', why: 'cross with your city', amount: -40, tick: 0, fade: 0 } as Memory];
    quiet.tick = TICKS_PER_DAY;
    stepDiplomacy(quiet);
    expect(cityOf(quiet.world, 'sparta').feel).toBe(1);
    expect(quiet.world.news.length).toBe(0);
    s.world.contact = 1;
    for (let i = 0; i < 12 * TICKS_PER_DAY; i++) {
      s.tick++;
      stepDiplomacy(s);
    }
    // From cordial (+5) to nothing… still cordial (0); one point lower would be wary.
    c.memories.push({ kind: 'staged', why: 'cross with your city', amount: -1, tick: s.tick, fade: 0 });
    s.tick += TICKS_PER_DAY - (s.tick % TICKS_PER_DAY);
    stepDiplomacy(s);
    expect(s.world.news[s.world.news.length - 1].line).toBe('King ' + c.ruler!.name + ' of Sparta has turned wary towards you: cross with your city');
    c.memories.push({ kind: 'gift', why: 'your gift of 250 dr', amount: 35, tick: s.tick, fade: 100 * TICKS_PER_DAY });
    expect(settleMood(s, c)).toMatch(/has warmed to you, warm now: your gift of 250 dr$/);
    expect(c.feel).toBe(4);
    // A turn that comes of a memory fading says which, in words.
    const t = { tick: 0, world: freshWorld(9), population: 600 } as SimState;
    const d = cityOf(t.world, 'sparta');
    d.memories = [{ kind: 'first', why: 'first word of your city pleased them', amount: 5, tick: 0, fade: 10 * TICKS_PER_DAY } as Memory, { kind: 'staged', why: 'cross with your city', amount: -1, tick: 0, fade: 0 } as Memory];
    d.feel = 3;
    t.world.contact = 1;
    for (let i = 0; i < 12 * TICKS_PER_DAY; i++) {
      t.tick++;
      stepDiplomacy(t);
    }
    expect(t.world.news[t.world.news.length - 1].line).toBe('King ' + d.ruler!.name + ' of Sparta has turned wary towards you: the good first word of your city is wearing off');
  });
});

describe('saves', () => {
  it('a town with gifts on their way (fetching, walking out, on the road) round-trips and plays on the same', () => {
    const sim = fresh('routes');
    send(sim, { type: 'gift', city: 'corinth', good: OIL, amount: 400 });
    send(sim, { type: 'gift', city: 'sparta', good: -1, amount: 100 });
    sim.run(40);
    const s = sim.state;
    expect(s.world.gifts.length).toBe(2);
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

  it('a slice 17 save (state version 17, a caravan walking in) loads with its moods where they were, and plays on', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/slice17-caravan.save.json.gz')).toString();
    expect(JSON.parse(text).state.version).toBe(17);
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    expect(got.file.from).toBe(17);
    const s = got.file.state;
    expect(s.version).toBe(SIM_STATE_VERSION);
    expect(s.world.gifts).toEqual([]);
    expect(s.world.contact).toBe(routeOf(s, 'corinth', 'land')!.opened);
    for (const id of RULED) {
      const c = cityOf(s.world, id);
      expect(c.gave).toBe(0);
      expect(['hostile', 'cold', 'wary', 'cordial', 'warm', 'devoted'][c.feel]).toBe(moodWord(moodOf(c, s.tick)));
    }
    expect(routeOf(s, 'corinth', 'land')!.closed).toBe(0);
    const sim = new Sim();
    sim.state = s;
    sim.run(TICKS_PER_MONTH);
    send(sim, { type: 'gift', city: 'corinth', good: -1, amount: 100 });
    sim.run(TICKS_PER_MONTH);
    expect(moodReasons(cityOf(s.world, 'corinth'), s.tick).some((r) => /your gift of 100 dr/.test(r.why))).toBe(true);
    ledgerAddsUp(s);
    expect(decodeSave(encodeSave(s, 1)).ok).toBe(true);
  }, 60000);

  it('refuses a damaged gift in plain words', () => {
    const sim = fresh('routes');
    send(sim, { type: 'gift', city: 'corinth', good: -1, amount: 100 });
    const st = JSON.parse(serialize(sim.state));
    st.world.gifts[0].by = 'air';
    const text = encodeSave(st as SimState, 1);
    const got = decodeSave(text);
    expect(got.ok).toBe(false);
    if (!got.ok) expect(got.why).toMatch(/map of Greece is wrong/);
  });
});
