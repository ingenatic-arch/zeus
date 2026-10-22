/**
 * Colonies (slice 37): founding one (the households named go, their homes
 * stand empty, they walk down to the quay by road, board, sail and land),
 * its price and refusals; the colony growing with its causes named, sending
 * its share by ship into a store; loyalty and its reasons; freedom warned a
 * season ahead; threats driven off, called off, landing; determinism, saves
 * and the migration; Greece's free sites; and the trireme guards' odds.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '../src/sim/clock';
import { colonyGrowth, colonyList, colonyLoyalty, colonyOf, colonyRefusal, fightOdds, fightRoll, FOUND_COST, FOUND_WHEAT, foundingOf, foundingPlan, foundRefusal, guardsAtHome, peopleOf, plantColony, siteRecord, threatenColony } from '../src/sim/colonies';
import { expeditionRefusal } from '../src/sim/expeditions';
import { held, TIMBER, WHEAT } from '../src/sim/foods';
import { RULED } from '../src/map/greece';
import { migrate } from '../src/sim/migrate';
import { deserialize, serialize, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, TILE_ROAD, type SimState } from '../src/sim/state';
import { totals } from '../src/sim/treasury';
import { income } from '../src/sim/treasury';
import { SAIL_IN, SHIP_ANCHORED } from '../src/sim/trade';
import { cityOf } from '../src/sim/world';
import { demoSim } from './prepared';

const made: Record<string, string> = {};
const fresh = (name: string): Sim => {
  if (!made[name]) made[name] = serialize(demoSim(name).state);
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
const ledgerAddsUp = (s: SimState): void => expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);
const lines = (s: SimState): string[] => s.world.news.map((n) => n.line);
const granaryWheat = (s: SimState): number => s.buildings.reduce((a, b) => a + (b.kind === 'granary' ? held(b, WHEAT) : 0), 0);
const bookLine = (s: SimState, ware: number, kind: string, what: string): number => [...s.stocks.now, ...s.stocks.last].filter((l) => l.ware === ware && l.kind === kind && l.what === what).reduce((a, l) => a + l.n, 0);
/** A trading town (richtown's) with the drachmas to found a colony. */
const rich = (): Sim => {
  const sim = fresh('richtown');
  income(sim.state, 3000, 'given', 'for the test');
  return sim;
};

describe('founding a colony', () => {
  it('the four households named go: their homes stand empty, they walk down to the quay by road, board your ship, sail and land; the site is yours', () => {
    const sim = rich();
    const s = sim.state;
    const plan = foundingPlan(s, sim.map, 'thasos');
    expect(plan.refusal).toBe('');
    expect(plan.households.length).toBe(4);
    const money = s.money;
    const wheat = granaryWheat(s);
    const people = s.population;
    send(sim, { type: 'colony', act: 'found', site: 'thasos' });
    const f = foundingOf(s, 'thasos')!;
    expect(f.households.map((h) => h.home)).toEqual(plan.households.map((h) => h.home));
    // The price: drachmas on a ledger line of its own, wheat out of the granaries and in the stock book.
    expect(s.money).toBe(money - FOUND_COST);
    expect(s.ledger.now.some((l) => l.kind === 'colonies' && l.amount === -FOUND_COST)).toBe(true);
    ledgerAddsUp(s);
    expect(granaryWheat(s)).toBe(wheat - FOUND_WHEAT);
    expect(bookLine(s, WHEAT, 'sold', 'colony:thasos')).toBe(FOUND_WHEAT);
    expect(siteRecord(s, 'thasos')!.bound).toBe('home');
    // They pack, set out, and their homes stand empty (their level kept).
    const levels = new Map(plan.households.map((h) => [h.home, s.buildings.find((b) => b.id === h.home)!.level]));
    expect(until(sim, () => f.households.every((h) => h.state !== 'packing'), 4 * TICKS_PER_DAY)).toBe(true);
    for (const h of f.households) {
      const b = s.buildings.find((x) => x.id === h.home)!;
      expect(b.people).toBe(0);
      expect(b.family).toBeNull();
      expect(b.level).toBe(levels.get(h.home));
    }
    expect(f.households.reduce((a, h) => a + h.people, 0)).toBe(plan.people);
    void people;
    // Walking down by road: every road tile of their way is a road.
    const walkers = s.walkers.filter((w) => w.kind === 'colonist');
    expect(walkers.length).toBe(4);
    for (const w of walkers) expect(w.tiles.filter((t) => t >= 0).every((t) => s.tiles[t] === TILE_ROAD)).toBe(true);
    // Your ship anchors; they go aboard; she sails; they land.
    expect(until(sim, () => f.ship?.phase === SHIP_ANCHORED, SAIL_IN + 2)).toBe(true);
    expect(until(sim, () => f.phase !== 'gathering', 2 * TICKS_PER_MONTH)).toBe(true);
    expect(f.people).toBe(plan.people);
    expect(s.walkers.some((w) => w.kind === 'colonist')).toBe(false);
    expect(until(sim, () => !!colonyOf(s, 'thasos'), 3 * TICKS_PER_MONTH)).toBe(true);
    const c = colonyOf(s, 'thasos')!;
    expect(siteRecord(s, 'thasos')!.owner).toBe('home');
    expect(peopleOf(s, c)).toBe(plan.people);
    expect(c.name).toBe('Nea Thasos');
    expect(c.governor).toBe(plan.households[0].head);
    expect(lines(s).some((x) => /founded Nea Thasos/.test(x))).toBe(true);
    ledgerAddsUp(s);
  }, 240000);

  it('refuses with no trading post, a site taken or bound for, too little money or wheat, too few households, or a founding under way', () => {
    const town = fresh('town');
    expect(foundRefusal(town.state, town.map, 'thasos')).toMatch(/trading post/);
    const sim = rich();
    const s = sim.state;
    const site = siteRecord(s, 'naxos')!;
    site.owner = 'athens';
    expect(foundRefusal(s, sim.map, 'naxos')).toMatch(/Athens’ colony/);
    site.owner = '';
    site.bound = 'rhodes';
    expect(foundRefusal(s, sim.map, 'naxos')).toMatch(/Rhodes’s settlers/);
    site.bound = '';
    expect(foundRefusal(s, sim.map, 'naxos', 3)).toMatch(/Four households/);
    const money = s.money;
    s.money = 500;
    expect(foundRefusal(s, sim.map, 'naxos')).toMatch(/costs 1,000 dr/);
    s.money = money;
    const wheat = s.buildings.filter((b) => b.kind === 'granary').map((b) => b.stock);
    for (const b of s.buildings) if (b.kind === 'granary') b.stock = 50;
    expect(foundRefusal(s, sim.map, 'naxos')).toMatch(/wheat/);
    s.buildings.filter((b) => b.kind === 'granary').forEach((b, i) => (b.stock = wheat[i]));
    expect(foundRefusal(s, sim.map, 'naxos')).toBe('');
    send(sim, { type: 'colony', act: 'found', site: 'naxos' });
    expect(foundRefusal(s, sim.map, 'kythnos')).toMatch(/one founding at a time/);
    expect(foundRefusal(s, sim.map, 'naxos')).toMatch(/on their way/);
    // A refused act does nothing.
    const before = JSON.stringify([s.empire, s.money, s.world.sites, s.buildings]);
    send(sim, { type: 'colony', act: 'found', site: 'kythnos' });
    expect(JSON.stringify([s.empire, s.money, s.world.sites, s.buildings])).toBe(before);
  }, 120000);
});

describe('the colony', () => {
  it('grows with its causes named, and sends its share by ship into a store, in the stock book', () => {
    const sim = rich();
    const s = sim.state;
    const c = plantColony(s, 'thasos', 400);
    const g = colonyGrowth(s, c);
    expect(g.find((x) => /newcomers/.test(x.why))!.n).toBeGreaterThan(0);
    expect(g.find((x) => /children/.test(x.why))!.n).toBeGreaterThan(0);
    const timber = s.buildings.reduce((a, b) => a + held(b, TIMBER), 0);
    expect(until(sim, () => c.sent > 0, 8 * TICKS_PER_MONTH)).toBe(true);
    expect(bookLine(s, TIMBER, 'bought', 'colony:thasos')).toBeGreaterThan(0);
    expect(s.buildings.reduce((a, b) => a + held(b, TIMBER), 0)).toBeGreaterThan(timber);
    expect(peopleOf(s, c)).toBeGreaterThan(400);
    expect(lines(s).some((x) => /Nea Thasos’s share is in: \d+ timber/.test(x))).toBe(true);
  }, 240000);

  it('a heavier share lowers its loyalty, every reason named; the years loosen its ties', () => {
    const s = fresh('richtown').state;
    const c = plantColony(s, 'thasos', 400);
    const fair = colonyLoyalty(s, c);
    c.share = 2;
    const heavy = colonyLoyalty(s, c);
    expect(heavy.target).toBe(fair.target - 20);
    expect(heavy.why.some((x) => x.why === 'a heavy share' && x.n === -20)).toBe(true);
    expect(heavy.target).toBe(Math.max(0, Math.min(100, 50 + heavy.why.reduce((a, x) => a + x.n, 0))));
    const ties = (l: typeof fair): number => l.why.find((x) => /your own people/.test(x.why))?.n ?? 0;
    c.since = s.tick - 6 * TICKS_PER_YEAR;
    expect(ties(colonyLoyalty(s, c))).toBeLessThan(ties(heavy));
    c.since = s.tick - 13 * TICKS_PER_YEAR;
    expect(ties(colonyLoyalty(s, c))).toBe(0);
  });

  it('a large colony squeezed hard talks of freedom a season ahead, stands down when its loyalty mends, and goes free on the day if not; a small one never does', () => {
    const sim = rich();
    const s = sim.state;
    const big = plantColony(s, 'thasos', 900, s.tick - 15 * TICKS_PER_YEAR, 'Lykos', 'proud');
    const small = plantColony(s, 'kythnos', 300, s.tick - 15 * TICKS_PER_YEAR, 'Kallias', 'grasping');
    big.share = 2;
    small.share = 2;
    expect(until(sim, () => big.talk > 0, 8 * TICKS_PER_MONTH)).toBe(true);
    expect(big.frees - big.talk).toBe(90 * TICKS_PER_DAY);
    expect(lines(s).some((x) => /Nea Thasos talks of freedom: loyalty \d+ \(/.test(x))).toBe(true);
    expect(small.talk).toBe(0);
    // Lightened, it mends and stands down.
    const saved = serialize(s);
    send(sim, { type: 'colony', act: 'share', site: 'thasos', share: 0 });
    expect(until(sim, () => big.talk === 0, 4 * TICKS_PER_MONTH)).toBe(true);
    expect(colonyOf(s, 'thasos')).toBe(big);
    // Left as it was: free on its day, its site marked free, nobody founds there again.
    sim.state = deserialize(saved);
    const t = sim.state;
    const b2 = colonyOf(t, 'thasos')!;
    expect(until(sim, () => !colonyOf(t, 'thasos'), b2.frees - t.tick + TICKS_PER_MONTH + 1)).toBe(true);
    expect(siteRecord(t, 'thasos')!.free).toBe('Nea Thasos');
    expect(siteRecord(t, 'thasos')!.owner).toBe('');
    expect(foundRefusal(t, sim.map, 'thasos')).toMatch(/stands free/);
    expect(colonyOf(t, 'kythnos')).toBeTruthy();
    expect(colonyOf(t, 'kythnos')!.talk).toBe(0);
  }, 240000);
});

describe('threats to a colony', () => {
  it('an unanswered raid takes people and the next shipment, and is remembered; a claim takes a small colony', () => {
    const sim = rich();
    const s = sim.state;
    const c = plantColony(s, 'thasos', 600);
    const t = threatenColony(s, c, 'sparta', 'raid');
    expect(lines(s).some((x) => /ships of Sparta are sailing for Nea Thasos to raid it/.test(x))).toBe(true);
    expect(until(sim, () => t.end !== '', t.due - s.tick + TICKS_PER_DAY + 1)).toBe(true);
    expect(t.end).toBe('raided');
    expect(peopleOf(s, c)).toBeLessThan(600);
    expect(c.skip).toBe(true);
    expect(colonyLoyalty(s, c).why.some((x) => /sacked by Sparta while you did nothing/.test(x.why) && x.n < 0)).toBe(true);
    const k = plantColony(s, 'kythnos', 100);
    const t2 = threatenColony(s, k, 'athens');
    expect(t2.kind).toBe('claim');
    expect(until(sim, () => t2.end !== '', t2.due - s.tick + TICKS_PER_DAY + 1)).toBe(true);
    expect(t2.end).toBe('claimed');
    expect(siteRecord(s, 'kythnos')!.owner).toBe('athens');
    expect(colonyOf(s, 'kythnos')).toBeUndefined();
  }, 240000);

  it('your army striking at the raider’s city calls the threat off', () => {
    const sim = fresh('collect');
    const s = sim.state;
    const c = plantColony(s, 'thasos', 600);
    const foe = RULED.find((id) => expeditionRefusal(s, id, 'force') === '');
    expect(foe).toBeTruthy();
    const t = threatenColony(s, c, foe!, 'raid');
    send(sim, { type: 'expedition', city: foe!, kind: 'force' });
    sim.run(TICKS_PER_DAY + 1);
    expect(t.end).toBe('off');
    expect(colonyLoyalty(s, c).why.some((x) => /you struck at/.test(x.why) && x.n > 0)).toBe(true);
  }, 240000);

  it('triremes sent to guard it sail out along its lane, and drive the raiders off as the odds and the dice say', () => {
    const sim = fresh('triremes');
    const s = sim.state;
    const c = plantColony(s, 'thasos', 600);
    const home = guardsAtHome(s);
    expect(home.length).toBeGreaterThan(0);
    const t = threatenColony(s, c, 'sparta', 'raid');
    expect(colonyRefusal(s, sim.map, 'guard', 'thasos')).toBe('');
    send(sim, { type: 'colony', act: 'guard', site: 'thasos' });
    expect(c.guards).toEqual(home);
    expect(s.fleet.triremes.filter((x) => home.includes(x.id)).every((x) => x.order === 'lane' && x.lane === 'thasos-colony')).toBe(true);
    const odds = fightOdds(home.length, t.ships);
    const roll = fightRoll(s, c, t);
    expect(until(sim, () => t.end !== '', t.due - s.tick + TICKS_PER_DAY + 1)).toBe(true);
    expect(t.end).toBe(roll < odds ? 'driven' : 'raided');
    // Home again once it is over.
    expect(c.guards).toEqual([]);
    expect(s.fleet.triremes.filter((x) => home.includes(x.id)).every((x) => x.order === 'bay')).toBe(true);
  }, 240000);

  it('the dice over many seeds land near the odds shown', () => {
    const s = fresh('richtown').state;
    const c = plantColony(s, 'thasos', 600);
    for (const [ours, theirs] of [[1, 2], [2, 2], [4, 2]]) {
      const p = fightOdds(ours, theirs);
      let won = 0;
      const n = 600;
      for (let i = 0; i < n; i++) {
        s.world.seed = 1000 + i * 7919;
        if (fightRoll(s, c, { city: 'sparta', kind: 'raid', at: 5000 + i, due: 0, ships: theirs, men: 0, exp: 0, end: '', line: '' }) < p) won++;
      }
      expect(Math.abs(won / n - p)).toBeLessThan(0.06);
    }
    expect(fightOdds(2, 2)).toBeCloseTo(0.7, 5);
    expect(fightOdds(4, 2)).toBeCloseTo(0.9, 5);
  });
});

describe('determinism and saves', () => {
  it('the same commands give the same colony', () => {
    const a = rich();
    const b = rich();
    for (const sim of [a, b]) {
      send(sim, { type: 'colony', act: 'found', site: 'thasos' });
      sim.run(4 * TICKS_PER_MONTH);
    }
    expect(colonyList(a.state).length).toBeGreaterThan(0);
    expect(serialize(a.state)).toBe(serialize(b.state));
  }, 240000);

  it('a town with families on the quay and the ship at anchor round-trips, and plays on the same', () => {
    const sim = rich();
    const s = sim.state;
    send(sim, { type: 'colony', act: 'found', site: 'thasos' });
    const f = foundingOf(s, 'thasos')!;
    expect(until(sim, () => f.ship?.phase === SHIP_ANCHORED && f.households.some((h) => h.state === 'quay' || h.state === 'aboard'), 2 * TICKS_PER_MONTH)).toBe(true);
    const got = decodeSave(encodeSave(s, 1));
    if (!got.ok) throw new Error(got.why);
    expect(JSON.stringify(got.file.state.empire)).toBe(JSON.stringify(s.empire));
    const other = new Sim();
    other.state = got.file.state;
    sim.run(2 * TICKS_PER_MONTH);
    other.run(2 * TICKS_PER_MONTH);
    expect(serialize(other.state)).toBe(serialize(sim.state));
  }, 240000);

  it('the migration fills only its own fields on an older state, and a version 27 save loads through every step', () => {
    const s = JSON.parse(serialize(fresh('richtown').state)) as Record<string, unknown> & { empire: Record<string, unknown>; world: { sites: Array<Record<string, unknown>> } };
    delete s.empire.colonies;
    delete s.empire.foundings;
    for (const x of s.world.sites) delete x.free;
    s.version = SIM_STATE_VERSION - 1;
    const vassals = JSON.stringify(s.empire.vassals);
    expect(migrate(s)).toBe(SIM_STATE_VERSION - 1);
    expect(s.version).toBe(SIM_STATE_VERSION);
    expect(s.empire.colonies).toEqual([]);
    expect(s.empire.foundings).toEqual([]);
    expect(s.world.sites.every((x) => x.free === '')).toBe(true);
    expect(JSON.stringify(s.empire.vassals)).toBe(vassals);
    const text = gunzipSync(readFileSync('tests/fixtures/slice29-rivals.save.json.gz')).toString();
    expect(JSON.parse(text).state.version).toBe(27);
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    expect(got.file.state.version).toBe(SIM_STATE_VERSION);
    expect(got.file.state.empire.colonies).toEqual([]);
    expect(got.file.state.world.sites.every((x) => x.free === '')).toBe(true);
    const sim = new Sim();
    sim.state = got.file.state;
    sim.run(TICKS_PER_MONTH);
    expect(decodeSave(encodeSave(sim.state, 1)).ok).toBe(true);
  }, 120000);
});

describe('Greece’s free sites (the finding of slice 31)', () => {
  it('over twenty seeds, two or more sites are free at year ten in nearly every run, and more stay free into the second decade than before', () => {
    let two = 0;
    let at15 = 0;
    let founded = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const sim = new Sim(seed);
      const s = sim.state;
      sim.run(10 * TICKS_PER_YEAR);
      const free = s.world.sites.filter((x) => !x.owner && !x.bound).length;
      if (free >= 2) two++;
      sim.run(5 * TICKS_PER_YEAR);
      at15 += s.world.sites.filter((x) => !x.owner && !x.bound).length;
      founded += s.world.sites.filter((x) => x.owner).length;
    }
    expect(two).toBeGreaterThanOrEqual(18);
    // (Before: 2.85 on average at year fifteen; a rival colony still happens.)
    expect(at15 / 20).toBeGreaterThan(3);
    expect(founded).toBeGreaterThan(20);
    void cityOf;
  }, 600000);
});
