/**
 * Meat and cheese (slice 9): the herds beyond the houses, the hunters who go
 * out after them across country, the dairy's goats, and the three foods on
 * their way from the lodge and the dairy through the granary to the table.
 */
import { describe, expect, it } from 'vitest';
import { coastMap } from '../src/map/bake';
import { HERDS, MAP_SIZE } from '../src/map/coast';
import { buildingRefusal, Ground, mapIndex } from '../src/sim/build';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { CHEESE_BATCH, CHEESE_EVERY, cheeseOf, GRANARY_ROOM, STALL_ROOM } from '../src/sim/food';
import { herdsInReach, HUNT_RANGE, MAX_HUNTERS, MEAT_KILL } from '../src/sim/hunt';
import { rateOf } from '../src/sim/labour';
import { deserialize, serialize, Sim } from '../src/sim/sim';
import { herdStatus, lodgeStatus } from '../src/sim/status';
import { TILE_EMPTY, TILE_ROAD, type Building, type SimState } from '../src/sim/state';
import { position } from '../src/sim/walk';
import { freshHerds, herdGround, MIN_HEAD, offRoadPath, REGROW, regrowIn, walkable } from '../src/sim/wild';
import { demoSim } from './prepared';

const map = coastMap();
const N = MAP_SIZE;
const ground = mapIndex(map).ground;
const firm = (t: number): boolean => ground[t] === Ground.Ok || ground[t] === Ground.SteepForHome;
const tileAt = (x: number, z: number): number => Math.floor(z) * N + Math.floor(x);

const demo = (name: string): Sim => {
  const sim = demoSim(name);
  return sim;
};
const kinds = (s: SimState, k: Building['kind']): Building[] => s.buildings.filter((b) => b.kind === k);

/** Every herd stands on open, firm ground (never water, the river's banks, a cliff, a road or a building), and keeps its last two head. */
function herdsOk(s: SimState): void {
  for (const h of s.herds) {
    const t = tileAt(h.x, h.z);
    expect(firm(t), `${h.kind} ${h.place} at ${h.x.toFixed(1)},${h.z.toFixed(1)}`).toBe(true);
    expect(s.tiles[t]).toBe(TILE_EMPTY);
    expect(h.head).toBeGreaterThanOrEqual(MIN_HEAD);
    expect(h.head).toBeLessThanOrEqual(h.full);
  }
}

describe('the herds', () => {
  it('start whole, each on open ground within its range, and the same every time', () => {
    const s = new Sim().state;
    expect(s.herds.length).toBe(HERDS.length);
    s.herds.forEach((h, i) => {
      expect(herdGround(map, s, tileAt(h.x, h.z))).toBe(true);
      expect(Math.hypot(h.x - HERDS[i].x, h.z - HERDS[i].z)).toBeLessThanOrEqual(HERDS[i].r);
      expect(h.head).toBe(HERDS[i].head);
    });
    expect(freshHerds(map, s)).toEqual(new Sim(99).state.herds);
  });

  it('wander for a year without ever stepping into the sea, onto a cliff, a road or a building, with hunters after them (#town)', () => {
    const sim = demo('town');
    const s = sim.state;
    const herds0 = s.herds.map((h) => [h.x, h.z]);
    let hunters = 0;
    let kills = 0;
    let heads = s.herds.reduce((n, h) => n + h.head, 0);
    for (let t = 0; t < 12 * TICKS_PER_MONTH; t++) {
      sim.step();
      if (t % 5 === 0) herdsOk(s);
      const now = s.herds.reduce((n, h) => n + h.head, 0);
      if (now < heads) kills += heads - now;
      heads = now;
      for (const w of s.walkers) {
        if (w.kind !== 'hunter') continue;
        hunters = Math.max(hunters, s.walkers.filter((o) => o.kind === 'hunter' && o.origin === w.origin).length);
        // A hunter walks firm ground and roads, never water, cliffs or anyone's house (only his own lodge's door).
        const [x, z] = position(w);
        const tile = tileAt(x, z);
        const on = s.tiles[tile];
        expect(on === TILE_ROAD || on === w.origin || (on === TILE_EMPTY && firm(tile)), `hunter at ${x.toFixed(2)},${z.toFixed(2)}`).toBe(true);
      }
    }
    expect(kills).toBeGreaterThan(5);
    expect(hunters).toBeGreaterThan(0);
    expect(hunters).toBeLessThanOrEqual(MAX_HUNTERS);
    // They moved about.
    expect(s.herds.some((h, i) => Math.hypot(h.x - herds0[i][0], h.z - herds0[i][1]) > 1)).toBe(true);
  });

  it('a herd hunted down to its last two grows back, slowly while thin and faster as it fills out, never past full', () => {
    const sim = new Sim();
    const s = sim.state;
    const h = s.herds[0];
    h.head = MIN_HEAD;
    h.grow = regrowIn(h);
    expect(regrowIn(h)).toBe(Math.round((REGROW * h.full) / MIN_HEAD));
    const at: number[] = [];
    let last = h.head;
    for (let t = 0; t < 8 * TICKS_PER_MONTH; t++) {
      sim.step();
      if (h.head !== last) {
        expect(h.head).toBe(last + 1);
        at.push(s.tick);
        last = h.head;
      }
    }
    expect(h.head).toBe(h.full);
    expect(at.length).toBe(h.full - MIN_HEAD);
    // Each head comes sooner than the one before.
    for (let i = 2; i < at.length; i++) expect(at[i] - at[i - 1]).toBeLessThan(at[i - 1] - at[i - 2]);
    // The last comes ten days or so after the one before it.
    expect(at[at.length - 1] - at[at.length - 2]).toBeLessThanOrEqual(Math.round((REGROW * h.full) / (h.full - 1)));
    expect(herdStatus(s, h).detail).toMatch(/Whole: \d+ head/);
  });
});

describe('across country', () => {
  it('a way on foot goes tile to tile over walkable ground, never cutting the corner of a cliff, the water or a house', () => {
    const s = demo('town').state;
    const free: number[] = [];
    for (let t = 0; t < N * N; t += 37) if (walkable(map, s, t)) free.push(t);
    let found = 0;
    for (let k = 0; k < 40; k++) {
      const a = free[(k * 7919) % free.length];
      const b = free[(k * 104729 + 13) % free.length];
      const way = offRoadPath(map, s, [a], b);
      if (!way) continue;
      found++;
      expect(way[0]).toBe(a);
      expect(way[way.length - 1]).toBe(b);
      for (let i = 0; i < way.length; i++) {
        expect(walkable(map, s, way[i])).toBe(true);
        if (i === 0) continue;
        const dx = (way[i] % N) - (way[i - 1] % N);
        const dz = Math.floor(way[i] / N) - Math.floor(way[i - 1] / N);
        expect(Math.max(Math.abs(dx), Math.abs(dz))).toBe(1);
        if (dx !== 0 && dz !== 0) {
          expect(walkable(map, s, way[i - 1] + dx)).toBe(true);
          expect(walkable(map, s, way[i - 1] + dz * N)).toBe(true);
        }
      }
    }
    expect(found).toBeGreaterThan(20);
    // Into the sea: no way at all.
    const sea = ground.findIndex((g) => g === Ground.Water);
    expect(offRoadPath(map, s, [free[0]], sea)).toBeNull();
  });
});

describe('the hunting lodge', () => {
  it('sends hunters out to a herd and back with meat; carts take it to the granary (#hunter)', () => {
    const sim = demo('hunter');
    const s = sim.state;
    const lodge = kinds(s, 'lodge')[0];
    expect(rateOf(lodge)).toBe(1);
    expect(herdsInReach(s, lodge).every((g) => g.d <= HUNT_RANGE)).toBe(true);
    const granaryMeat = (): number => kinds(s, 'granary').reduce((n, g) => n + g.meat + g.meatIn, 0);
    let back = 0;
    let carts = 0;
    let stalked = false;
    const seen = new Set<number>();
    const before = granaryMeat();
    for (let t = 0; t < 2 * TICKS_PER_MONTH; t++) {
      sim.step();
      for (const w of s.walkers) {
        if (w.kind === 'hunter' && w.wait > 0) stalked = true;
        if (w.kind === 'hunter' && w.back && w.load === MEAT_KILL && !seen.has(w.id)) {
          seen.add(w.id);
          back++;
        }
        if (w.kind === 'cart' && w.origin === lodge.id) carts++;
      }
    }
    expect(stalked).toBe(true);
    expect(back).toBeGreaterThanOrEqual(3);
    expect(carts).toBeGreaterThan(0);
    expect(granaryMeat() + kinds(s, 'agora').reduce((n, a) => n + a.meat, 0)).toBeGreaterThan(0);
    expect(granaryMeat()).toBeLessThanOrEqual(GRANARY_ROOM[1] * kinds(s, 'granary').length + before);
    expect(lodgeStatus(s, map, lodge).detail).toMatch(/Workers: 6 of 6/);
  });

  it('three lodges on one valley thin its herd to the last two, and the lodges go short and say why (#overhunt)', () => {
    const sim = demo('overhunt');
    const s = sim.state;
    const lodges = kinds(s, 'lodge');
    expect(lodges.length).toBe(3);
    const deer = s.herds.find((h) => h.place === 'below the crags')!;
    let thinnest = deer.head;
    let scarce = '';
    // (Slice 33: #overhunt opens in May, its deer twice as many as before for the spring's calves, which grow back twice as
    // fast in spring: thinned to the last two in the autumn, when they grow back half as fast.)
    for (let d = 0; d < 240; d++) {
      sim.run(TICKS_PER_DAY);
      herdsOk(s);
      thinnest = Math.min(thinnest, deer.head);
      for (const l of lodges) {
        const why = lodgeStatus(s, map, l).detail;
        if (/Game is scarce: the deer below the crags has 2 head, and hunters leave every herd its last 2/.test(why)) scarce = why;
      }
    }
    expect(thinnest).toBe(MIN_HEAD);
    expect(scarce).toMatch(/grows back a head only every \d+ days/);
    // Left alone, it comes back.
    for (const l of lodges) sim.enqueue({ type: 'clear', x0: l.x, z0: l.z, x1: l.x + 2, z1: l.z + 2 });
    sim.run(5 * TICKS_PER_MONTH);
    expect(kinds(s, 'lodge').length).toBe(0);
    expect(deer.head).toBe(deer.full);
  });

  it('a lodge with no herd in reach says how far the nearest is', () => {
    const sim = new Sim();
    const s = sim.state;
    s.money = 10000;
    // Out on the plain, far from any herd (a lodge reaches a herd by the ground it roams, since slice 10).
    const far = s.herds.map((h) => h);
    for (const h of far) {
      h.x = h.hx = 0.5;
      h.z = h.hz = 0.5;
    }
    sim.enqueue({ type: 'road', tiles: [40, 41, 42, 43].map((x) => x + 70 * N) });
    sim.enqueue({ type: 'build', kind: 'lodge', at: [40 + 71 * N] });
    sim.step();
    const l = kinds(s, 'lodge')[0];
    expect(l).toBeDefined();
    expect(lodgeStatus(s, map, l).detail).toMatch(/No game within reach: the nearest herd is the \w+ [^,]+, \d+ tiles off; hunters go 40 at most/);
  });
});

describe('the dairy', () => {
  it('makes cheese at the rate its grass allows and refuses rock and sand (#dairy)', () => {
    const sim = demo('dairy');
    const s = sim.state;
    const d = kinds(s, 'dairy')[0];
    expect(rateOf(d)).toBe(1);
    const best = cheeseOf(map, d);
    expect(best).toBeGreaterThan(0);
    expect(best).toBeLessThanOrEqual((CHEESE_BATCH * TICKS_PER_MONTH) / CHEESE_EVERY);
    // Over two months, the cheese it made (in store, on carts, in the granary and on the stall) is about what it says.
    const all = (): number =>
      d.cheese +
      s.walkers.filter((w) => w.kind === 'cart' && w.origin === d.id).reduce((n, w) => n + w.load, 0) +
      kinds(s, 'granary').reduce((n, g) => n + g.cheese, 0) +
      kinds(s, 'agora').reduce((n, a) => n + a.cheese, 0);
    let made = 0;
    // With room for it all (the town eats less cheese than the dairy makes, so its store fills in time).
    d.cheese = 0;
    for (const g of kinds(s, 'granary')) g.cheese = 0;
    // (A batch is made when the goats' count wraps round; a cart may leave with it the same tick.)
    let was = d.growth;
    for (let t = 0; t < 2 * TICKS_PER_MONTH; t++) {
      sim.step();
      if (d.growth < was) made += CHEESE_BATCH;
      was = d.growth;
    }
    expect(made).toBeGreaterThan(best * 2 * 0.8);
    expect(made).toBeLessThan(best * 2 * 1.2 + CHEESE_BATCH);
    expect(all()).toBeGreaterThan(0);
    // Rock and sand: no goats.
    const refusals = new Set<string>();
    for (let t = 0; t < N * N; t += 97) {
      const why = buildingRefusal(map, s, 'dairy', t % N, Math.floor(t / N));
      if (why) refusals.add(why);
    }
    expect([...refusals].some((w) => /Too little grass for goats/.test(w))).toBe(true);
  });
});

describe('the food vendor’s basket', () => {
  it('a stall holds every food it has room for; the porter brings a mix (#town)', () => {
    const sim = demo('town');
    const s = sim.state;
    const a = kinds(s, 'agora')[0];
    let mixed = false;
    // (Since slice 11's history the stalls open full, so the first porter with meat and cheese goes about two months on.)
    for (let t = 0; t < 3 * TICKS_PER_MONTH; t++) {
      sim.step();
      expect(a.stock).toBeLessThanOrEqual(STALL_ROOM[0]);
      expect(a.meat).toBeLessThanOrEqual(STALL_ROOM[1]);
      expect(a.cheese).toBeLessThanOrEqual(STALL_ROOM[2]);
      if (s.walkers.some((w) => w.kind === 'porter' && w.load + w.meat + w.cheese > 0 && (w.meat > 0 || w.cheese > 0))) mixed = true;
    }
    expect(mixed).toBe(true);
    // Every fine house has all three on the table; every townhouse at least two.
    const homes = s.buildings.filter((b) => b.kind === 'home' && b.people > 0);
    const kindsOn = (b: Building): number => [b.foodUntil, b.meatUntil, b.cheeseUntil].filter((u) => u > s.tick).length;
    for (const b of homes) if (b.level === 5) expect(kindsOn(b)).toBe(3);
    for (const b of homes) if (b.level === 4) expect(kindsOn(b)).toBeGreaterThanOrEqual(2);
  });
});

describe('determinism with the wild', () => {
  it('the same town with hunters and herds plays out the same twice, and a save made mid-hunt carries on the same', () => {
    const a = demo('hunter');
    const b = demo('hunter');
    a.run(600);
    b.run(600);
    expect(serialize(a.state)).toEqual(serialize(b.state));
    // Wait for a hunter stalking.
    for (let t = 0; t < 2000 && !a.state.walkers.some((w) => w.kind === 'hunter' && w.wait > 0); t++) a.step();
    expect(a.state.walkers.some((w) => w.kind === 'hunter' && w.wait > 0)).toBe(true);
    const c = new Sim();
    c.state = deserialize(serialize(a.state));
    a.run(900);
    c.run(900);
    expect(serialize(c.state)).toEqual(serialize(a.state));
  });
});

describe('#hunter (review of slice 9)', () => {
  it('opens as a hunter steps out of the lodge for a herd, so the camera goes out with him', () => {
    const s = demo('hunter').state;
    const out = s.walkers.filter((w) => w.kind === 'hunter' && !w.back && w.wait === 0).sort((a, b) => a.walked - b.walked);
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].walked).toBeLessThan(1);
    expect(s.herds[out[0].food].head).toBeGreaterThan(MIN_HEAD);
  });
});
