/**
 * Slice 31, Greece grows: the new cities join without moving the old ones'
 * dice, every city's people, wealth, army and fleet stay in bounds over a
 * long game, rivals found colonies and take vassals, a vassal breaks free
 * when its lord is beaten, and what a city's size changes for your trade,
 * your raiders and your loans.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { RULED, SITES } from '../src/map/greece';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '../src/sim/clock';
import { baseOf, bow, coloniesOf, COLONY_SAIL, nearestFree, sendSettlers, sizeWhy, vassalRefusal, vassalsOf } from '../src/sim/growth';
import { coffersOf } from '../src/sim/loans';
import { declareWar, endWar } from '../src/sim/rivals';
import { yearlyLimit } from '../src/sim/routes';
import { Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type SimState } from '../src/sim/state';
import { cityOf, freshWorld, harvestIn, scaleOf } from '../src/sim/world';

// The first four rulers of four seeds, as they were before slice 31 (name, queen, traits, face, first memories, ties to the first six, harvest and outlook).
const BEFORE = `1 athens Akastos false shrewd/fickle 805016015 7 0,0,-11,-6,-13,0 21
1 sparta Tyndareos false pious/shrewd 90777478 -10,25 0,-11,0,1,-2,0 22
1 corinth Periandros false greedy/fickle 1668321204 5,-5 0,-5,8,0,-7,0 42
1 troy Laomedon false pious/steadfast 805058135 -10,5,8 0,-15,-6,-16,0,0 11
7 athens Aigeus false proud/shrewd 447440783 -5,-18 0,0,-17,-1,-2,0 12
7 sparta Leotychidas false steadfast/warlike 1972537659 -10,5,-5,-6 0,-14,0,14,-9,0 23
7 corinth Melissa true fickle/shrewd 496911470 5,-25 0,-5,2,0,-12,0 23
7 troy Kapys false pious/proud 500093475 -10,-5,25 0,-4,-20,-20,0,0 32
42 athens Aigeus false generous/pious 708438511 5,-9 0,0,-23,-8,-5,0 12
42 sparta Polydoros false proud/steadfast 1964090078 -10,-5,5,23 0,-13,0,18,-19,0 01
42 corinth Sisyphos false proud/greedy 1740011790 5,-5,14 0,-14,11,0,-2,0 23
42 troy Kassandra true proud/generous 593767685 -10,-5,5 0,-7,-15,-9,0,0 22
1234 athens Herse true generous/proud 136383066 5,-5 0,0,-27,-3,-18,0 11
1234 sparta Gorgo true pious/steadfast 1527030265 -10,5,-18 0,-19,0,19,0,0 13
1234 corinth Sisyphos false fickle/greedy 2035822768 5,-25 0,2,5,0,-6,0 41
1234 troy Priam false generous/shrewd 743702622 -10,5,-15 0,-17,-20,-6,0,0 41`;

const NEW = ['thebes', 'argos', 'knossos', 'rhodes', 'memphis'];

/** Greece alone (a town with nothing built) played so many years. */
const greece = (seed: number, years: number): Sim => {
  const sim = new Sim(1, seed);
  sim.run(years * TICKS_PER_YEAR);
  return sim;
};

const inBounds = (s: SimState): void => {
  for (const id of RULED) {
    const c = cityOf(s.world, id);
    const b = baseOf(id);
    expect(Number.isFinite(c.pop) && Number.isFinite(c.wealth) && Number.isFinite(c.army) && Number.isFinite(c.fleet)).toBe(true);
    expect(c.pop).toBeGreaterThanOrEqual(b.pop * 0.3);
    expect(c.pop).toBeLessThanOrEqual(b.pop * 3);
    expect(c.wealth).toBeGreaterThanOrEqual(0);
    expect(c.army).toBeGreaterThanOrEqual(0);
    expect(c.fleet).toBeGreaterThanOrEqual(0);
    if (b.fleet === 0) expect(c.fleet).toBe(0);
  }
};

describe('the new cities', () => {
  it('join without moving the first four rulers, their memories, ties or harvests, and each has a ruler, goods and wants', () => {
    const rows: string[] = [];
    for (const seed of [1, 7, 42, 1234]) {
      const w = freshWorld(seed, 0, false);
      for (const c of w.cities.slice(1, 5)) rows.push(`${seed} ${c.id} ${c.ruler!.name} ${c.ruler!.female} ${c.ruler!.traits.join('/')} ${c.ruler!.face} ${c.memories.map((m) => m.amount).join(',')} ${c.ties.slice(0, 6).join(',')} ${c.harvest}${c.outlook}`);
      for (const id of NEW) {
        const c = cityOf(w, id);
        expect(c.ruler?.name.length).toBeGreaterThan(2);
        expect(c.make.some((x, k) => x > c.need[k])).toBe(true);
        expect(c.need.some((x, k) => x > c.make[k])).toBe(true);
        expect(c.pop).toBeGreaterThan(0);
        expect(c.ties.length).toBe(w.cities.length);
      }
      expect(w.sites.map((x) => x.id)).toEqual(SITES.map((x) => x.id));
      expect(w.sites.every((x) => x.owner === '' && x.bound === '')).toBe(true);
    }
    expect(rows.join('\n')).toBe(BEFORE);
  });
});

describe('growth', () => {
  it('over thirty years every city stays in bounds, with its reasons adding up to its change', () => {
    // (Review of slice 31: on several seeds, and within half and twice its base each year, not only the hard bounds.)
    for (const seed of [1, 42]) {
      const sim = new Sim(1, seed);
      for (let y = 0; y < 30; y++) {
        sim.run(TICKS_PER_YEAR);
        for (const id of RULED) {
          const c = cityOf(sim.state.world, id);
          expect(c.pop / baseOf(id).pop).toBeGreaterThan(0.5);
          expect(c.pop / baseOf(id).pop).toBeLessThan(2);
        }
      }
      inBounds(sim.state);
    }
    const s = greece(7, 30).state;
    inBounds(s);
    for (const id of RULED) {
      const c = cityOf(s.world, id);
      for (const what of ['pop', 'wealth', 'army', 'fleet'] as const) {
        const x = sizeWhy(c, what);
        const total = c.grew.reduce((n, g) => n + g[what], 0);
        expect(Math.abs(x.now - x.was - total)).toBeLessThan(1e-6 + Math.abs(total) * 1e-9);
      }
      // Only this year's and last year's causes are kept.
      expect(new Set(c.grew.map((g) => g.year)).size).toBeLessThanOrEqual(2);
    }
  }, 240000);

  it('rivals found colonies on the empty sites and take weaker neighbours as vassals, each told as news of Greece', () => {
    let colonies = 0;
    let vassals = 0;
    // (Slice 34: a rival takes a vassal only when it is weak or beaten, so rarer: seed 5 is one where Sparta takes Argos, in its thirteenth year.)
    for (const seed of [1, 7, 42, 5]) {
      const s = greece(seed, 15).state;
      inBounds(s);
      colonies += s.world.sites.filter((x) => x.owner).length;
      vassals += s.world.cities.filter((c) => c.lord).length + s.world.news.filter((n) => n.greece && / has bowed to /.test(n.line)).length;
      // (The news keeps its last lines only: the latest colony's is there.)
      const last = s.world.sites.filter((y) => y.owner).sort((a, b) => b.since - a.since)[0];
      if (last && s.tick - last.since < TICKS_PER_YEAR) expect(s.world.news.some((n) => n.greece && n.line.includes(`colony on ${SITES.find((p) => p.id === last.id)!.name}`))).toBe(true);
    }
    expect(colonies).toBeGreaterThan(0);
    expect(vassals).toBeGreaterThan(0);
  }, 240000);

  it('settlers land three months after they are sent; a site taken first sends them home; the founder makes the site’s good', () => {
    const sim = greece(7, 3);
    const s = sim.state;
    const rhodes = cityOf(s.world, 'rhodes');
    const athens = cityOf(s.world, 'athens');
    const naxos = s.world.sites.find((x) => x.id === 'naxos')!;
    naxos.owner = '';
    naxos.bound = '';
    const before = rhodes.wealth;
    sendSettlers(s, rhodes, naxos, 'staged');
    expect(rhodes.wealth).toBeLessThan(before);
    expect(s.world.news.at(-1)!.line).toMatch(/Rhodes is fitting out ships for settlers bound for Naxos/);
    sim.run(COLONY_SAIL + TICKS_PER_MONTH);
    expect(naxos.owner).toBe('rhodes');
    expect(coloniesOf(s.world, 'rhodes')).toContain(naxos);
    // A second lot bound for the same site finds it taken.
    sendSettlers(s, athens, naxos);
    sim.run(COLONY_SAIL + TICKS_PER_MONTH);
    expect(naxos.owner).toBe('rhodes');
    expect(s.world.news.some((n) => /settlers found Naxos already taken by Rhodes/.test(n.line))).toBe(true);
    // Melos's fleece: what its founder makes of it grows.
    const melos = s.world.sites.find((x) => x.id === 'melos')!;
    if (!melos.owner) {
      const made = athens.make.slice();
      sendSettlers(s, athens, melos);
      sim.run(COLONY_SAIL + TICKS_PER_MONTH);
      expect(athens.make.some((x, k) => x > made[k])).toBe(true);
    }
    expect(nearestFree(s.world, 'rhodes')?.owner ?? '').toBe('');
  }, 120000);

  it('a vassal pays its lord, goes to no war of its own, and breaks free when its lord loses a war', () => {
    const sim = greece(7, 4);
    const s = sim.state;
    for (const x of s.world.wars.filter((y) => !y.ended)) endWar(s, x);
    const sparta = cityOf(s.world, 'sparta');
    const argos = cityOf(s.world, 'argos');
    argos.lord = '';
    sparta.lord = '';
    bow(s, sparta, argos, 'staged');
    expect(vassalsOf(s.world, 'sparta')).toContain(argos);
    expect(vassalRefusal(s, sparta, argos)).toBe('a vassal already');
    expect(s.world.news.at(-1)!.line).toMatch(/Argos has bowed to Sparta/);
    sim.run(TICKS_PER_MONTH);
    expect(argos.grew.some((g) => g.why === 'bowed to Sparta' && g.wealth < 0)).toBe(true);
    expect(sparta.grew.some((g) => g.why === 'tribute from Argos' && g.wealth > 0)).toBe(true);
    // Sparta beaten by Athens: Argos throws off its rule within the month.
    const x = declareWar(s, 'athens', 'sparta', 'staged');
    x.fate = 'athens';
    x.until = s.tick + TICKS_PER_DAY;
    sim.run(TICKS_PER_DAY * 2);
    if (!x.ended) endWar(s, x);
    sim.run(TICKS_PER_MONTH);
    expect(argos.lord).toBe('');
    expect(s.world.news.some((n) => /Argos has thrown off Sparta’s rule/.test(n.line))).toBe(true);
    expect(sparta.grew.some((g) => g.kind === 'defeat')).toBe(true);
  }, 120000);

  it('a bigger city trades more with you, a richer one lends more and cheaper, a bigger army sends a bigger band', () => {
    const s = greece(7, 1).state;
    const c = cityOf(s.world, 'corinth');
    const k = c.make.findIndex((x, i) => Math.abs(x - c.need[i]) >= 1000);
    const was = { pop: c.pop, wealth: c.wealth };
    c.pop = baseOf('corinth').pop;
    const small = yearlyLimit(s, 'corinth', k);
    c.pop = baseOf('corinth').pop * 1.6;
    expect(scaleOf(c)).toBeCloseTo(1.6);
    expect(yearlyLimit(s, 'corinth', k)).toBeGreaterThan(small);
    c.wealth = baseOf('corinth').wealth;
    const plain = coffersOf(c)!;
    c.wealth = baseOf('corinth').wealth * 1.6;
    const rich = coffersOf(c)!;
    expect(rich.spare).toBeGreaterThan(plain.spare);
    expect(rich.rate).toBeLessThan(plain.rate);
    expect(rich.words).toMatch(/has grown rich/);
    Object.assign(c, was);
  });
});

describe('saves', () => {
  it('a Greece with colonies, settlers on their way and a vassal saves and loads as it was', () => {
    const sim = greece(7, 4);
    const s = sim.state;
    const free = s.world.sites.filter((x) => !x.owner && !x.bound);
    if (free.length) sendSettlers(s, cityOf(s.world, 'rhodes'), free[0]);
    if (!s.world.cities.some((c) => c.lord)) bow(s, cityOf(s.world, 'thebes'), cityOf(s.world, 'argos'));
    const got = decodeSave(encodeSave(s, 1));
    if (!got.ok) throw new Error(got.why);
    expect(JSON.stringify(got.file.state.world)).toBe(JSON.stringify(s.world));
  }, 120000);

  it('a phase 4 save (the state version before this slice: #rivals at slice 29) loads, with Greece grown to eleven cities', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/slice29-rivals.save.json.gz')).toString();
    // (Phase 4's last version, 27, whatever number this slice takes when the lines merge: a test of the migration step itself.)
    expect(JSON.parse(text).state.version).toBe(27);
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    const s = got.file.state;
    expect(s.version).toBe(SIM_STATE_VERSION);
    expect(s.world.cities.map((c) => c.id).slice(0, 6)).toEqual(['home', 'athens', 'sparta', 'corinth', 'troy', 'tyre']);
    for (const id of NEW) expect(cityOf(s.world, id).ruler).toBeTruthy();
    // The old four keep their rulers, and their sizes start at their usual size (so prices and limits are as they were).
    for (const id of ['athens', 'sparta', 'corinth', 'troy']) expect(cityOf(s.world, id).pop).toBe(baseOf(id).pop);
    expect(s.world.sites.length).toBe(SITES.length);
    const sim = new Sim();
    sim.state = s;
    sim.run(TICKS_PER_MONTH);
    inBounds(s);
    expect(decodeSave(encodeSave(s, 1)).ok).toBe(true);
  }, 60000);
});

describe('harvests', () => {
  it('a newcomer’s harvest outlook comes from the year, not from Greece’s dice', () => {
    const w = freshWorld(7, 0, false);
    const rng = JSON.stringify(w.rng);
    harvestIn(w, 'knossos', 2, TICKS_PER_YEAR);
    expect(JSON.stringify(w.rng)).toBe(rng);
  });
});
