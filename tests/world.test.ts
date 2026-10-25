/**
 * Greece (slice 15): rulers shuffled from the world's own seed, moods that
 * are the sum of their reasons, steady prices from each city's character,
 * renaming your city through the queue, the Tyre ship on the map in step with
 * the city, and the world kept apart from the city's random numbers.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { DEMOS } from '../src/game/demos';
import { decodeSave, encodeSave } from '../src/game/saves';
import { CITY_IDS, HORIZON_ALONG, lineLength, PLACES, RIVAL_WAYS, RULED, SITES, wayOf, wayPoints, WAYS } from '../src/map/greece';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '../src/sim/clock';
import { Sim } from '../src/sim/sim';
import type { SimState } from '../src/sim/state';
import { PRICES, SHIP_AWAY, SHIP_COMING, SHIP_LEAVING, SHIP_MOORED, TRADE_GOODS } from '../src/sim/trade';
import { cityOf, DEFAULT_NAME, freshWorld, memoryWorth, moodOf, moodReasons, moodWord, nameRefusal, sellsAndBuys, TRAITS, tyreShip, usualPrice, VOYAGE } from '../src/sim/world';
import { project } from '../src/map/greece';
import { OUTLINES, ISLES } from '../src/map/aegean';

/** The city's part of the state: everything but Greece. */
const city = (s: SimState): string => {
  // Slice 44: the message log tells Greece's news, so it differs with Greece too.
  const { world: _w, messages: _m, ...rest } = s;
  return JSON.stringify(rest);
};

describe('rulers', () => {
  it('each ruled city has a ruler with a name, a title and two traits that go together; yours and Tyre have none', () => {
    for (let seed = 1; seed < 40; seed++) {
      const w = freshWorld(seed);
      expect(w.cities.map((c) => c.id)).toEqual(CITY_IDS);
      for (const c of w.cities) {
        if (!RULED.includes(c.id)) {
          expect(c.ruler).toBeNull();
          expect(c.memories).toEqual([]);
          continue;
        }
        const r = c.ruler!;
        expect(r.name.length).toBeGreaterThan(2);
        expect(r.title).toContain(PLACES[c.id].name);
        expect(r.traits).toHaveLength(2);
        expect(new Set(r.traits).size).toBe(2);
        for (const t of r.traits) expect(TRAITS).toContain(t);
        expect(r.traits.includes('greedy') && r.traits.includes('generous')).toBe(false);
        expect(r.traits.includes('fickle') && r.traits.includes('steadfast')).toBe(false);
      }
    }
  });

  it('the same seed gives the same Greece; different seeds shuffle the rulers', () => {
    expect(JSON.stringify(freshWorld(7))).toBe(JSON.stringify(freshWorld(7)));
    const names = new Set<string>();
    const traits = new Set<string>();
    for (let seed = 1; seed < 20; seed++) {
      const w = freshWorld(seed);
      names.add(w.cities.map((c) => c.ruler?.name ?? '').join());
      traits.add(w.cities.map((c) => c.ruler?.traits.join('+') ?? '').join());
    }
    expect(names.size).toBeGreaterThan(15);
    expect(traits.size).toBeGreaterThan(15);
  });

  it('Sparta leans warlike', () => {
    let warlike = 0;
    for (let seed = 1; seed <= 200; seed++) if (cityOf(freshWorld(seed), 'sparta').ruler!.traits.includes('warlike')) warlike++;
    expect(warlike).toBeGreaterThan(70);
  });
});

describe('moods', () => {
  it('a mood is the sum of its reasons, starts between cold and warm, and names the history', () => {
    for (let seed = 1; seed < 60; seed++) {
      const w = freshWorld(seed);
      for (const id of RULED) {
        const c = cityOf(w, id);
        const m = moodOf(c, 0);
        expect(moodReasons(c, 0).reduce((a, r) => a + r.worth, 0)).toBe(m);
        expect(['cold', 'wary', 'cordial', 'warm']).toContain(moodWord(m));
      }
      expect(cityOf(w, 'sparta').memories.some((m) => m.kind === 'history' && m.amount < 0)).toBe(true);
    }
  });

  it('a town from before Greece gets rulers between wary and cordial', () => {
    for (let seed = 1; seed < 60; seed++) {
      const w = freshWorld(seed, 5000, true);
      for (const id of RULED) expect(['wary', 'cordial']).toContain(moodWord(moodOf(cityOf(w, id), 5000)));
    }
  });

  it('first word of your city fades, and is let go once it has', () => {
    const m = { kind: 'first', why: '', amount: 20, tick: 100, fade: 1000 };
    expect(memoryWorth(m, 100)).toBe(20);
    expect(memoryWorth(m, 600)).toBe(10);
    expect(memoryWorth(m, 1100)).toBe(0);
    expect(memoryWorth({ ...m, fade: 0 }, 1e9)).toBe(20);
    const sim = new Sim(3);
    const c = cityOf(sim.state.world, 'athens');
    const first = c.memories.find((x) => x.kind === 'first');
    if (!first) return;
    sim.run(first.fade + TICKS_PER_MONTH);
    expect(cityOf(sim.state.world, 'athens').memories.some((x) => x.kind === 'first')).toBe(false);
  });

  it('mood words', () => {
    expect([-80, -40, -10, 0, 20, 45, 70].map(moodWord)).toEqual(['hostile', 'cold', 'wary', 'cordial', 'cordial', 'warm', 'devoted']);
  });
});

describe('goods and prices', () => {
  it('each ruled city sells some goods and buys others, by its character, dearer where it is short', () => {
    for (let seed = 1; seed < 40; seed++) {
      const w = freshWorld(seed);
      for (const id of RULED) {
        const c = cityOf(w, id);
        const { sells, buys } = sellsAndBuys(c);
        expect(sells.length).toBeGreaterThanOrEqual(1);
        expect(buys.length).toBeGreaterThanOrEqual(1);
        // (Its usual prices: last autumn's harvest moves some of them a little at the start.)
        for (const k of sells) expect(usualPrice(c, k)).toBeLessThan(PRICES[k]);
        for (const k of buys) expect(usualPrice(c, k)).toBeGreaterThan(PRICES[k]);
        for (const k of TRADE_GOODS.keys()) expect(usualPrice(c, k)).toBeGreaterThan(PRICES[k] * 0.6);
      }
      // Athens is hungry for wheat, Sparta short of wine, Troy rich in fleece.
      expect(sellsAndBuys(cityOf(w, 'athens')).buys).toContain(0);
      expect(sellsAndBuys(cityOf(w, 'sparta')).buys).toContain(5);
      expect(sellsAndBuys(cityOf(w, 'troy')).sells).toContain(4);
      // Tyre keeps the ship's steady prices.
      expect(cityOf(w, 'tyre').price).toEqual(PRICES);
    }
  });

  it('a year of prices is kept, month by month', () => {
    const sim = new Sim(5);
    sim.run(TICKS_PER_YEAR + 5);
    const c = cityOf(sim.state.world, 'corinth');
    expect(c.history.every((h) => h.length === 12)).toBe(true);
    // (The last is the first of this month's.)
    sim.run(TICKS_PER_MONTH - 5);
    expect(c.history.map((h) => h[11])).toEqual(c.price);
  });
});

describe('your city’s name', () => {
  it('is renamed through the queue, refuses what isn’t a name, and replays the same', () => {
    const sim = new Sim();
    expect(sim.state.world.name).toBe(DEFAULT_NAME);
    for (const bad of ['', ' x ', '1234', 'a'.repeat(30), '<b>Argos</b>']) expect(nameRefusal(bad)).not.toBe('');
    sim.enqueue({ type: 'name', name: '<script>' });
    sim.step();
    expect(sim.state.world.name).toBe(DEFAULT_NAME);
    sim.enqueue({ type: 'name', name: '  Argos   Nova ' });
    sim.step();
    expect(sim.state.world.name).toBe('Argos Nova');
    sim.enqueue({ type: 'name', name: 'Kalliste’s Rest' });
    sim.run(10);
    expect(sim.state.world.name).toBe('Kalliste’s Rest');
  });
});

describe('Greece is kept apart from the city', () => {
  it('a town plays the same whichever Greece it is in', () => {
    const a = new Sim(0x2e05, 1);
    const b = new Sim(0x2e05, 999);
    expect(a.state.world.cities[1].ruler).not.toEqual(b.state.world.cities[1].ruler);
    DEMOS.town.setup!(a);
    DEMOS.town.setup!(b);
    a.run(TICKS_PER_MONTH * 2);
    b.run(TICKS_PER_MONTH * 2);
    expect(city(a.state)).toBe(city(b.state));
  });

  it('a demo’s Greece comes from its seed, so it opens the same each time', () => {
    const a = new Sim();
    const b = new Sim();
    DEMOS.sail.setup!(a);
    DEMOS.sail.setup!(b);
    expect(JSON.stringify(a.state.world)).toBe(JSON.stringify(b.state.world));
  });
});

describe('saves', () => {
  it('Greece is saved and loaded with the town, renamed and all', () => {
    const sim = new Sim(11, 12);
    sim.enqueue({ type: 'name', name: 'Tiryns' });
    sim.run(TICKS_PER_MONTH + 3);
    const got = decodeSave(encodeSave(sim.state, 1));
    expect(got.ok).toBe(true);
    if (!got.ok) return;
    expect(JSON.stringify(got.file.state)).toBe(JSON.stringify(sim.state));
    expect(got.file.state.world.name).toBe('Tiryns');
  });

  for (const [file, from] of [['slice14-richtown', 13], ['slice13-harsh', 12]] as const) {
    it(`an older town (${file}) gets a fresh Greece from its seed, every ruler between wary and cordial, and plays on`, () => {
      const text = gunzipSync(readFileSync(`tests/fixtures/${file}.save.json.gz`)).toString();
      const got = decodeSave(text);
      expect(got.ok).toBe(true);
      if (!got.ok) return;
      expect(got.file.from).toBe(from);
      const s = got.file.state;
      expect(s.world.name).toBe(DEFAULT_NAME);
      expect(s.world.routes).toEqual([]);
      for (const id of RULED) expect(['wary', 'cordial']).toContain(moodWord(moodOf(cityOf(s.world, id), s.tick)));
      const people = s.population;
      const sim = new Sim();
      sim.state = s;
      sim.run(TICKS_PER_MONTH);
      expect(sim.state.population).toBeGreaterThan(people * 0.8);
      // Saved again, it comes back the same.
      const again = decodeSave(encodeSave(sim.state, 2));
      expect(again.ok && JSON.stringify(again.file.state)).toBe(JSON.stringify(sim.state));
    });
  }

  it('a save whose Greece is damaged is refused in plain words', () => {
    const sim = new Sim();
    const file = JSON.parse(encodeSave(sim.state, 1));
    file.state.world.name = 7;
    const got = decodeSave(JSON.stringify(file));
    expect(got.ok).toBe(false);
    if (!got.ok) expect(got.why).toContain('Greece');
  });
});

describe('the map', () => {
  /** Is a lon, lat point on land (in an outline or an island blob)? */
  const onLand = (lon: number, lat: number): boolean => {
    const inside = (poly: ReadonlyArray<readonly [number, number]>): boolean => {
      let c = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i];
        const [xj, yj] = poly[j];
        if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    if (OUTLINES.some(inside)) return true;
    return ISLES.some((i) => {
      const a = -(i.turn ?? 0);
      const dx = lon - i.lon;
      const dy = lat - i.lat;
      const u = dx * Math.cos(a) - dy * Math.sin(a);
      const v = dx * Math.sin(a) + dy * Math.cos(a);
      return (u / i.rx) ** 2 + (v / i.ry) ** 2 < 1;
    });
  };

  it('every city but Tyre and Memphis (beyond the table’s edge) stands on land, and the sea lanes keep to the water between their ends', () => {
    for (const id of CITY_IDS) if (id !== 'tyre' && id !== 'memphis') expect([id, onLand(PLACES[id].lon, PLACES[id].lat)]).toEqual([id, true]);
    // (Slice 31: the sites too, but Cyrene, on the Libyan shore beyond the edge; and the rivals' lanes.)
    for (const x of SITES) if (x.id !== 'cyrene') expect([x.id, onLand(x.lon, x.lat)]).toEqual([x.id, true]);
    for (const w of [...WAYS, ...RIVAL_WAYS]) {
      if (w.kind !== 'sea') continue;
      const p = w.pts;
      for (let i = 1; i + 2 < p.length; i++) {
        for (let f = 0; f < 1; f += 0.05) {
          const lon = p[i][0] + (p[i + 1][0] - p[i][0]) * f;
          const lat = p[i][1] + (p[i + 1][1] - p[i][1]) * f;
          expect([w.id, i, f, onLand(lon, lat)]).toEqual([w.id, i, f, false]);
        }
      }
    }
  });

  it('the roads keep to the land', () => {
    for (const w of [...WAYS, ...RIVAL_WAYS]) {
      if (w.kind !== 'land') continue;
      for (const [lon, lat] of w.pts) expect([w.id, lon, lat, onLand(lon, lat)]).toEqual([w.id, lon, lat, true]);
    }
  });

  it('the table is about as wide as it is deep', () => {
    const [x0, z0] = project(20, 41.2);
    const [x1, z1] = project(29, 34.7);
    expect(x0).toBe(0);
    expect(z0).toBe(0);
    expect(x1 / z1).toBeGreaterThan(0.9);
    expect(x1 / z1).toBeLessThan(1.25);
  });
});

describe('the Tyre ship on the map', () => {
  /** #sail's town, played on through a whole visit and the next, sampling her place on the map. */
  it('sails from Tyre to your gulf, in with the city’s ship, and home again, without a jump', () => {
    const sim = new Sim();
    DEMOS.trade.setup!(sim);
    const L = lineLength(wayPoints(wayOf('tyre-sea')));
    // No post yet: she is in Tyre.
    expect(tyreShip(sim.state, sim.state.tick).where).toBe('tyre');
    expect(tyreShip(sim.state, sim.state.tick).along).toBeCloseTo(L);
    const s0 = new Sim();
    DEMOS.sail.setup!(s0);
    const s = s0.state;
    let last = tyreShip(s, s.tick).along;
    const phases = new Set<number>();
    let maxStep = 0;
    let atQuay = false;
    let inTyre = false;
    const seenHorizon: number[] = [];
    for (let i = 0; i < 4 * TICKS_PER_MONTH; i++) {
      s0.step();
      const t = tyreShip(s, s.tick);
      phases.add(s.trade.ship.phase);
      maxStep = Math.max(maxStep, Math.abs(t.along - last));
      // Halfway between ticks too.
      const mid = tyreShip(s, s.tick + 0.5);
      maxStep = Math.max(maxStep, Math.abs(mid.along - t.along));
      if (s.trade.ship.phase === SHIP_MOORED) {
        atQuay = true;
        expect(t.along).toBe(0);
      }
      if (s.trade.ship.phase === SHIP_COMING || s.trade.ship.phase === SHIP_LEAVING) expect(t.along).toBeLessThanOrEqual(HORIZON_ALONG + 1e-9);
      if (s.trade.ship.phase === SHIP_AWAY && t.along > HORIZON_ALONG) seenHorizon.push(t.along);
      if (t.where === 'tyre') inTyre = true;
      last = t.along;
    }
    expect([...phases].sort()).toEqual([SHIP_AWAY, SHIP_COMING, SHIP_MOORED, SHIP_LEAVING]);
    expect(atQuay).toBe(true);
    expect(inTyre).toBe(true);
    expect(seenHorizon.length).toBeGreaterThan(VOYAGE);
    // At most the lane's length over the voyage (a little more for rounding) in a tick: never a jump.
    expect(maxStep).toBeLessThan((L / VOYAGE) * 1.5);
    expect(VOYAGE).toBe(20 * TICKS_PER_DAY);
  });
});
