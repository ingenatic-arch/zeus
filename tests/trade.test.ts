/**
 * The ship comes in (slice 13): the trading post on the bay shore, its
 * dockers carrying the surplus to the quay, the merchant ship's schedule,
 * voyage and visit, sales on the ledger, and saves.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { DEMOS } from '../src/game/demos';
import { decodeSave, encodeSave } from '../src/game/saves';
import { coastMap } from '../src/map/bake';
import { buildingRefusal, Ground, mapIndex } from '../src/sim/build';
import { TICKS_PER_DAY } from '../src/sim/clock';
import { coming, held, MEAT, WARE_NAMES, WHEAT } from '../src/sim/foods';
import { replay, serialize, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type SimState } from '../src/sim/state';
import {
  berthAt,
  DEFAULT_KEEP,
  FIRST_SHIP,
  freshTrade,
  LOADING,
  priceFor,
  QUAY_ROOM,
  quayTiles,
  SAIL_IN,
  sailable,
  SHIP_AWAY,
  SHIP_COMING,
  SHIP_EVERY,
  SHIP_LEAVING,
  SHIP_MOORED,
  shipAt,
  shoreRefusal,
  storeKind,
  TRADE_GOODS,
  tradingPost,
  leaveTicks,
} from '../src/sim/trade';
import { owedWages, totals } from '../src/sim/treasury';

const map = coastMap();
const N = map.size;
const T = (x: number, z: number): number => z * N + x;
/** Where the trade demos build their post: the bay's north-east shore below #town. */
const POST = { x: 73, z: 69 };

const demo = (name: string): Sim => {
  const sim = new Sim();
  DEMOS[name].setup!(sim);
  return sim;
};
const send = (sim: Sim, c: Parameters<Sim['enqueue']>[0]): void => {
  sim.enqueue(c);
  sim.flush();
};
const ledgerAddsUp = (s: SimState): void => expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);
/** Run until a test holds (or `most` ticks). */
const until = (sim: Sim, ok: () => boolean, most: number): void => {
  for (let i = 0; i < most && !ok(); i++) sim.step();
};

describe('where the trading post goes', () => {
  it('only on the bay shore by deep water, one at a time; the tool’s tint agrees with the refusals', () => {
    const s = new Sim().state;
    expect(buildingRefusal(map, s, 'trading', 60, 40)).toBe('A trading post goes on the bay shore: no sea beside it here');
    expect(buildingRefusal(map, s, 'trading', POST.x, POST.z)).toBe('');
    expect(buildingRefusal(map, s, 'trading', 67, 67)).toBe('');
    // Somewhere on the shore the water is too shallow for her.
    const ground = mapIndex(map).ground;
    const tint = quayTiles(map);
    let shallow = 0;
    let checked = 0;
    for (let z = 0; z + 3 <= N; z++) {
      for (let x = 0; x + 3 <= N; x++) {
        let dry = true;
        for (let d = 0; d < 9 && dry; d++) dry = ground[T(x + (d % 3), z + Math.floor(d / 3))] === Ground.Ok;
        if (!dry) continue;
        const r = shoreRefusal(map, x, z);
        if (r.startsWith('The water off this shore')) shallow++;
        if (r === '') {
          checked++;
          for (let d = 0; d < 9; d++) expect(tint[T(x + (d % 3), z + Math.floor(d / 3))]).toBe(1);
          // The berth is deep water joined to the open sea, the jetty no longer than allowed.
          const b = berthAt(map, x, z)!;
          expect(sailable(map, b.x, b.z)).toBe(true);
          expect(b.len).toBeLessThanOrEqual(7);
        }
      }
    }
    expect(shallow).toBeGreaterThan(10);
    expect(checked).toBeGreaterThan(10);
    const sim = new Sim();
    send(sim, { type: 'build', kind: 'trading', at: [T(POST.x, POST.z)] });
    expect(tradingPost(sim.state)).toBeDefined();
    expect(buildingRefusal(map, sim.state, 'trading', 67, 67)).toBe('Only one trading post: the ship calls at one quay');
  });
});

describe('the ship', () => {
  it('is due three months after the post is built, shows SAIL_IN before, ties up, loads, sails off, and comes every three months; she sails only on deep water', () => {
    const sim = new Sim();
    const s = sim.state;
    const ship = s.trade.ship;
    sim.run(5);
    expect(ship.due).toBe(0);
    send(sim, { type: 'build', kind: 'trading', at: [T(POST.x, POST.z)] });
    sim.step();
    const due = ship.due;
    expect(due).toBe(s.tick + FIRST_SHIP);
    sim.run(due - SAIL_IN - 1 - s.tick);
    expect(ship.phase).toBe(SHIP_AWAY);
    expect(shipAt(ship, s.tick)).toBeNull();
    sim.step();
    expect(ship.phase).toBe(SHIP_COMING);
    // Coming in: always on deep water (or beyond the edge), always further in, never jumping.
    let last = shipAt(ship, s.tick)!;
    expect(last.inward).toBe(0);
    for (let t = s.tick; t <= due; t += 0.25) {
      const at = shipAt(ship, t)!;
      expect(sailable(map, at.x, at.z)).toBe(true);
      expect(at.inward).toBeGreaterThanOrEqual(last.inward);
      expect(Math.hypot(at.x - last.x, at.z - last.z)).toBeLessThan(4);
      last = at;
    }
    sim.run(due - s.tick);
    expect(ship.phase).toBe(SHIP_MOORED);
    const berth = berthAt(map, POST.x, POST.z)!;
    const moored = shipAt(ship, s.tick + 0.5)!;
    expect([moored.x, moored.z]).toEqual([berth.x, berth.z]);
    sim.run(LOADING);
    expect(ship.phase).toBe(SHIP_LEAVING);
    expect(ship.visits).toBe(1);
    // Nothing was for sale: she paid nothing.
    expect(ship.lastPaid).toBe(0);
    expect(ship.due).toBe(due + SHIP_EVERY);
    sim.run(leaveTicks(ship));
    expect(ship.phase).toBe(SHIP_AWAY);
    sim.run(ship.due - SAIL_IN - s.tick);
    expect(ship.phase).toBe(SHIP_COMING);
  });

  it('turns back when the post is cleared, and none is due until another is built', () => {
    const sim = new Sim();
    const s = sim.state;
    const ship = s.trade.ship;
    send(sim, { type: 'build', kind: 'trading', at: [T(POST.x, POST.z)] });
    until(sim, () => ship.phase === SHIP_COMING && s.tick - ship.since >= 30, FIRST_SHIP + 10);
    const before = shipAt(ship, s.tick)!;
    send(sim, { type: 'clear', x0: POST.x, z0: POST.z, x1: POST.x + 2, z1: POST.z + 2 });
    sim.step();
    expect(ship.phase).toBe(SHIP_LEAVING);
    expect(ship.due).toBe(0);
    // From where she was, back out the way she came.
    const turned = shipAt(ship, s.tick)!;
    expect(Math.hypot(turned.x - before.x, turned.z - before.z)).toBeLessThan(4);
    sim.run(leaveTicks(ship) + 1);
    expect(ship.phase).toBe(SHIP_AWAY);
    sim.run(SHIP_EVERY);
    expect(ship.phase).toBe(SHIP_AWAY);
    send(sim, { type: 'build', kind: 'trading', at: [T(67, 67)] });
    sim.step();
    expect(ship.due).toBe(s.tick + FIRST_SHIP);
  });
});

describe('dockers and sales', () => {
  it('carry only the surplus of the goods for sale, never overfill the quay, and the ship pays for what was on it at the prices shown', () => {
    const sim = demo('quay');
    const s = sim.state;
    const post = tradingPost(s)!;
    const ship = s.trade.ship;
    expect(TRADE_GOODS.reduce((n, w) => n + held(post, w), 0)).toBeGreaterThan(0);
    const check = (): void => {
      for (const [k, w] of TRADE_GOODS.entries()) {
        expect(held(post, w) + coming(post, w)).toBeLessThanOrEqual(QUAY_ROOM);
        if (!s.trade.sell[k]) expect(s.walkers.some((d) => d.kind === 'docker' && d.food === w && !d.back && d.load === 0)).toBe(false);
      }
      for (const d of s.walkers) if (d.kind === 'docker' && !d.back && d.target) expect(s.buildings.find((b) => b.id === d.target)!.kind).toBe(storeKind(d.food));
    };
    // Until she ties up, and every day of the loading: then what she bought, she paid for.
    for (let i = 0; i < SHIP_EVERY && ship.phase !== SHIP_MOORED; i++) {
      sim.step();
      if (i % 10 === 0) check();
    }
    expect(ship.phase).toBe(SHIP_MOORED);
    const onQuay = TRADE_GOODS.map((w, k) => (s.trade.sell[k] ? held(post, w) : 0));
    const money = s.money;
    sim.run(LOADING);
    expect(ship.phase).toBe(SHIP_LEAVING);
    // She took at least what was on the quay as she tied up (dockers may have brought more while she loaded).
    for (let k = 0; k < TRADE_GOODS.length; k++) expect(ship.lastBought[k]).toBeGreaterThanOrEqual(onQuay[k]);
    const paid = ship.lastBought.reduce((n, q, k) => n + priceFor(k, q), 0);
    expect(ship.lastPaid).toBe(paid);
    expect(paid).toBeGreaterThan(300);
    // On the ledger as sales, by good, with the measures.
    for (const [k, w] of TRADE_GOODS.entries()) {
      const line = s.ledger.now.find((l) => l.kind === 'sales' && l.what === WARE_NAMES[w]);
      if (ship.lastBought[k] > 0) expect(line).toMatchObject({ amount: priceFor(k, ship.lastBought[k]), n: ship.lastBought[k] });
      else expect(line).toBeUndefined();
    }
    expect(s.money).toBeGreaterThanOrEqual(money);
    ledgerAddsUp(s);
  });

  it('carry goods back when they are no longer for sale (as the stores have room), and fetch nothing the city keeps', () => {
    // #black's quay has meat on it, and its granary room for more.
    const sim = demo('black');
    const s = sim.state;
    const post = tradingPost(s)!;
    const quay = held(post, MEAT);
    expect(quay).toBeGreaterThan(0);
    // Meat no longer for sale: no docker goes for it, and the next one takes the quay's back to the granary.
    send(sim, { type: 'trade', good: MEAT, sell: false });
    // (Any already on their way for it come back with none.)
    const fetching = (w: number): number[] => s.walkers.filter((d) => d.kind === 'docker' && d.food === w && d.load === 0 && !d.back).map((d) => d.id);
    const already = new Set(fetching(MEAT));
    let back = 0;
    // (Its four dockers are all out as it opens: the first back takes the meat.)
    for (let i = 0; i < 90 * TICKS_PER_DAY; i++) {
      sim.step();
      for (const d of s.walkers) if (d.kind === 'docker' && d.food === MEAT && d.load > 0 && !d.back) back = Math.max(back, d.load);
      expect(fetching(MEAT).filter((id) => !already.has(id))).toEqual([]);
    }
    expect(back).toBeGreaterThan(0);
    expect(held(post, MEAT)).toBeLessThan(quay);
    // Keeping more wheat than the city has: nothing is fetched.
    send(sim, { type: 'trade', good: WHEAT, keep: 20000 });
    const before = new Set(fetching(WHEAT));
    for (let i = 0; i < 20 * TICKS_PER_DAY; i++) {
      sim.step();
      expect(fetching(WHEAT).filter((id) => !before.has(id))).toEqual([]);
    }
  });

  it('#black: the treasury has run dry with wages owed, and the ship’s visit pays them and puts it back in the black', () => {
    const sim = demo('black');
    const s = sim.state;
    const ship = s.trade.ship;
    expect(ship.phase).toBe(SHIP_COMING);
    expect(owedWages(s).owed).toBeGreaterThan(0);
    expect(s.money).toBeLessThan(50);
    const post = tradingPost(s)!;
    expect(TRADE_GOODS.reduce((n, w, k) => n + priceFor(k, held(post, w)), 0)).toBeGreaterThan(500);
    until(sim, () => ship.phase === SHIP_LEAVING, SAIL_IN + LOADING + 10);
    expect(owedWages(s).owed).toBe(0);
    expect(s.money).toBeGreaterThan(300);
    ledgerAddsUp(s);
  }, 20000);
});

describe('saves and determinism', () => {
  it('a #town save from slice 12 (state version 11) loads with nothing for sale and no ship due, and saves again identically', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/slice12-town.save.json.gz')).toString();
    expect(JSON.parse(text).state.version).toBe(11);
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    expect(got.file.from).toBe(11);
    const st = got.file.state;
    expect(st.version).toBe(SIM_STATE_VERSION);
    expect(st.trade).toEqual(freshTrade());
    expect(st.trade.keep).toEqual(DEFAULT_KEEP);
    const sim = new Sim();
    sim.state = st;
    sim.run(300);
    expect(st.trade.ship.due).toBe(0);
    const r = decodeSave(encodeSave(st, 2));
    if (!r.ok) throw new Error(r.why);
    expect(r.file.from).toBeUndefined();
    const again = new Sim();
    again.state = r.file.state;
    sim.run(600);
    again.run(600);
    expect(serialize(again.state)).toEqual(serialize(sim.state));
  });

  it('a save with the ship sailing in and dockers on the road carries on identically; a replay of the log rebuilds the same town', () => {
    const sim = demo('sail');
    const r = decodeSave(encodeSave(sim.state, 1));
    if (!r.ok) throw new Error(r.why);
    const again = new Sim();
    again.state = r.file.state;
    sim.run(SAIL_IN + LOADING + 20);
    again.run(SAIL_IN + LOADING + 20);
    expect(serialize(again.state)).toEqual(serialize(sim.state));
    expect(sim.state.trade.ship.visits).toBe(1);
    const re = replay(sim.state.seed, sim.log, sim.state.tick);
    expect(serialize(re.state)).toEqual(serialize(sim.state));
  }, 20000);

  it('refuses a damaged trade record in plain words', () => {
    const sim = new Sim();
    const st = JSON.parse(encodeSave(sim.state, 1));
    st.state.trade.sell = [true];
    const got = decodeSave(JSON.stringify(st));
    expect(got.ok).toBe(false);
    if (!got.ok) expect(got.why).toBe('This save is damaged (its trading post’s record is wrong), so it can’t be opened.');
  });

  it('a town that never builds a post never changes its trade record', () => {
    for (const name of ['town', 'food']) expect(demo(name).state.trade).toEqual(freshTrade());
  });
});
