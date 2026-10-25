/**
 * A colonial empire (slice 47): a company stationed in a colony (marched to
 * the quay, rowed out, sailed, holding it, brought home), triremes stationed
 * for good, a strike from a colony, the colonies' trade and your share of
 * it, the militia against a raid and in your wars, a treaty that makes a
 * free ally; slice 43's findings (reachable stores, a shipment called off or
 * sailed with what is aboard); determinism, saves and the migration.
 */
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { marchRefusal } from '../src/sim/army';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '../src/sim/clock';
import { colonyLoyalty, colonyOf, fightRoll, plantColony, siteRecord, threatenColony, type Colony, type ColonyThreat } from '../src/sim/colonies';
import { cargoesFor, ownDefence, reachedStores, WORKS } from '../src/sim/colonyworks';
import { colonyTrade, freedOf, garrisonHold, holdWith, homeTicks, militiaMightNow, militiaReady, passagesFor, stationedThere, strikeTicks } from '../src/sim/colonyempire';
import { expeditionPlan } from '../src/sim/expeditions';
import { held, setHeld, TIMBER } from '../src/sim/foods';
import { migrate } from '../src/sim/migrate';
import { threaten } from '../src/sim/raids';
import { roadsBeside } from '../src/sim/rounds';
import { deserialize, serialize, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, TILE_EMPTY, type SimState } from '../src/sim/state';
import { totals } from '../src/sim/treasury';
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
const base = (): { sim: Sim; s: SimState; naxos: Colony } => {
  const sim = fresh('colonybase');
  return { sim, s: sim.state, naxos: colonyOf(sim.state, 'naxos') as Colony };
};
/** #colonybase with its company stationed on Nea Naxos (played until it has landed). */
const stationed = (): { sim: Sim; s: SimState; naxos: Colony } => {
  const b = base();
  send(b.sim, { type: 'colonyempire', act: 'station', site: 'naxos', company: b.s.army.companies[0].id });
  until(b.sim, () => !!stationedThere(b.s, b.naxos), 4 * TICKS_PER_MONTH);
  return b;
};
/** The first tick from now whose threat roll for a colony passes `ok`. */
const dayWhere = (s: SimState, c: Colony, ok: (roll: number) => boolean): number => {
  for (let k = 0; k < 4 * TICKS_PER_MONTH; k++) if (ok(fightRoll(s, c, { at: s.tick + k } as ColonyThreat))) return k;
  return -1;
};

describe('a company stationed in a colony', () => {
  it('marches to the quay, is rowed out eight a trip once your ship is at anchor, sails, and holds the colony', () => {
    const { sim, s, naxos } = base();
    const c = s.army.companies[0];
    expect(c.hired).toBe('arcadian');
    send(sim, { type: 'colonyempire', act: 'station', site: 'naxos', company: c.id });
    expect(c.posted).toBe('naxos');
    expect(naxos.garrison).toBe(c.id);
    expect(c.order).toBe('march');
    const p = passagesFor(s, 'naxos')[0];
    expect(p.dir).toBe('out');
    // (Not to be marched elsewhere or dismissed while it goes.)
    expect(marchRefusal(s, sim.map, c, 0)).toMatch(/Stationed in a colony/);
    expect(until(sim, () => p.trips === 1, 2 * TICKS_PER_MONTH)).toBe(true);
    expect(p.men.length).toBe(8);
    expect(s.army.soldiers.filter((x) => x.company === c.id && x.state === 'away').length).toBe(8);
    expect(until(sim, () => p.phase === 'leaving', TICKS_PER_MONTH)).toBe(true);
    expect(p.trips).toBe(2);
    expect(p.men.length).toBe(16);
    expect(until(sim, () => !!stationedThere(s, naxos), 2 * TICKS_PER_MONTH)).toBe(true);
    expect(garrisonHold(s, naxos)).toBe(0.45);
    expect(colonyLoyalty(s, naxos).why.some((w) => w.n === 6 && /stationed there to hold it/.test(w.why))).toBe(true);
    expect(lines(s).some((x) => /has landed at Nea Naxos and holds it/.test(x))).toBe(true);
    // Refused a second company.
    sim.enqueue({ type: 'colonyempire', act: 'station', site: 'naxos' });
    sim.flush();
    expect(passagesFor(s, 'naxos').length).toBe(0);
  }, 240000);

  it('turns raiders away by itself on the threat roll: a roll its own defence alone would lose is won with it', () => {
    const { sim, s, naxos } = stationed();
    const own = ownDefence(naxos);
    const both = holdWith(s, naxos, own);
    expect(both).toBeGreaterThan(own);
    const k = dayWhere(s, naxos, (r) => r >= own && r < both);
    expect(k).toBeGreaterThanOrEqual(0);
    sim.run(k);
    const t = threatenColony(s, naxos, 'rhodes', 'raid');
    // (The triremes stay home: only the company and its own defence.)
    expect(until(sim, () => t.end !== '', 3 * TICKS_PER_MONTH)).toBe(true);
    expect(t.end).toBe('driven');
    expect(t.line).toMatch(/1st company of hoplites turned Rhodes’ \d ships away/);
  }, 240000);

  it('is brought home: your ship sails in, the men are rowed ashore at the quay and march to their barracks', () => {
    const { sim, s, naxos } = stationed();
    const c = s.army.companies[0];
    send(sim, { type: 'colonyempire', act: 'home', site: 'naxos' });
    expect(naxos.garrison).toBe(0);
    expect(garrisonHold(s, naxos)).toBe(0);
    expect(until(sim, () => c.away === 0 && c.order !== 'away', 3 * TICKS_PER_MONTH)).toBe(true);
    expect(until(sim, () => c.order === 'drill', 2 * TICKS_PER_MONTH)).toBe(true);
    expect(c.posted).toBe('');
    expect(s.army.soldiers.filter((x) => x.company === c.id && x.state === 'away').length).toBe(0);
  }, 240000);
});

describe('triremes stationed off a colony', () => {
  it('stay after a threat has passed, count in the odds and its loyalty; slice 37’s guards still come home', () => {
    const { sim, s, naxos } = base();
    send(sim, { type: 'colonyempire', act: 'ships', site: 'naxos' });
    expect(naxos.ships.length).toBe(2);
    expect(naxos.guards.length).toBe(0);
    // (#colonybase's Rhodes threat: a roll two triremes win.)
    const t = naxos.threat as ColonyThreat;
    expect(until(sim, () => t.end !== '', 3 * TICKS_PER_MONTH)).toBe(true);
    expect(t.end).toBe('driven');
    expect(t.line).toMatch(/your 2 triremes drove off/);
    sim.run(TICKS_PER_DAY);
    expect(naxos.ships.length).toBe(2);
    expect(s.fleet.triremes.every((x) => x.order === 'lane' && x.lane === 'naxos-colony')).toBe(true);
    expect(colonyLoyalty(s, naxos).why.some((w) => w.n === 4 && /stationed off its shore/.test(w.why))).toBe(true);
    send(sim, { type: 'colonyempire', act: 'shipshome', site: 'naxos' });
    expect(naxos.ships.length).toBe(0);
    expect(s.fleet.triremes.every((x) => x.order === 'bay')).toBe(true);
  }, 240000);
});

describe('a strike from a colony', () => {
  it('is shorter than from home, takes only the stationed company, calls the threat off, and the company holds the colony again after', () => {
    const { sim, s, naxos } = stationed();
    const c = s.army.companies[0];
    expect(strikeTicks(s, 'naxos', 'rhodes')).toBeLessThan(homeTicks('rhodes') * 0.7);
    const t = threatenColony(s, naxos, 'rhodes', 'raid');
    const before = s.money;
    send(sim, { type: 'colonyempire', act: 'strike', site: 'naxos', city: 'rhodes' });
    const e = s.world.expeditions[s.world.expeditions.length - 1];
    expect(e.from).toBe('naxos');
    expect(e.companies).toEqual([c.id]);
    expect(e.phase).toBe('marching');
    expect(e.dur).toBe(strikeTicks(s, 'naxos', 'rhodes'));
    sim.run(TICKS_PER_DAY);
    expect(t.end).toBe('off');
    expect(until(sim, () => e.phase === 'done', 3 * TICKS_PER_MONTH)).toBe(true);
    expect(c.away).toBe(-1);
    expect(stationedThere(s, naxos)).toBe(c);
    if (e.won) expect(s.money).toBeGreaterThan(before);
    ledgerAddsUp(s);
  }, 240000);
});

describe('the colonies’ trade', () => {
  it('a town of 400 trades about 1,600 dr a year and pays you a third; a harbour half again; halved under 40 loyalty; nothing while it talks of freedom', () => {
    const { s } = base();
    const c = plantColony(s, 'melos', 400, s.tick - TICKS_PER_YEAR);
    c.loyalty = 60;
    expect(colonyTrade(s, c)).toMatchObject({ trade: 1600, share: 533 });
    c.works.push({ kind: 'harbour', phase: 'built', at: 0, done: 0, cargo: 0 });
    expect(colonyTrade(s, c)).toMatchObject({ trade: 2400, share: 800 });
    c.loyalty = 35;
    expect(colonyTrade(s, c).share).toBe(400);
    expect(colonyTrade(s, c).why.join(' ')).toMatch(/halved: its loyalty is under 40/);
    c.talk = s.tick;
    expect(colonyTrade(s, c).share).toBe(0);
  });

  it('comes in coin with the season’s share ship, on the ledger as the colonies’ trade', () => {
    const { sim, s } = base();
    const coming = (x: (typeof s.empire.tribute)[number]): boolean => !!x.colony && (x.coin ?? 0) > 0 && x.phase !== 'done';
    expect(until(sim, () => s.empire.tribute.some(coming), 4 * TICKS_PER_MONTH)).toBe(true);
    const t = s.empire.tribute.find(coming)!;
    expect(until(sim, () => t.phase === 'done', 3 * TICKS_PER_MONTH)).toBe(true);
    const from = colonyOf(s, t.colony!)!.name;
    expect([...s.ledger.now, ...s.ledger.last].some((l) => l.kind === 'colonytrade' && l.what === `from ${from}` && l.amount >= t.coin!)).toBe(true);
    expect(lines(s).some((l) => l.includes(`and ${t.coin} dr of its trade into the treasury`))).toBe(true);
    ledgerAddsUp(s);
  }, 240000);
});

describe('the militia', () => {
  it('a raid on your city: a town’s militia sail in, come ashore at your quay and stand by what the raiders make for; home after', () => {
    const { sim, s } = base();
    const ready = militiaReady(s);
    expect(ready.map((m) => m.site)).toEqual(['thasos']);
    const sparta = cityOf(s.world, 'sparta');
    sparta.memories.push({ kind: 'staged', why: 'for the test', amount: -80, tick: s.tick, fade: TICKS_PER_YEAR });
    const r = threaten(s, sim.map, sparta, 'for the test');
    send(sim, { type: 'answer', deal: r.deal, act: 'refuse' });
    sim.run(TICKS_PER_DAY);
    const m = s.empire.militia.find((x) => x.raid === r.id)!;
    expect(m.site).toBe('thasos');
    expect(m.men).toBe(ready[0].men);
    expect(until(sim, () => m.phase === 'ashore', 3 * TICKS_PER_MONTH)).toBe(true);
    const c = s.army.companies.find((x) => x.id === m.company)!;
    expect(c.militia).toBe('Nea Thasos');
    expect(s.army.soldiers.filter((x) => x.company === c.id).length).toBe(m.men);
    expect(lines(s).some((x) => /The militia of Nea Thasos, \d+ men, are ashore at your quay/.test(x))).toBe(true);
    expect(until(sim, () => m.phase === 'home' || m.phase === 'done', 8 * TICKS_PER_MONTH)).toBe(true);
    expect(s.army.companies.some((x) => x.militia)).toBe(false);
  }, 240000);

  it('in your wars: a full force’s plan counts their might, a raid’s does not', () => {
    const { s } = base();
    expect(militiaMightNow(s)).toBeGreaterThan(0);
    const force = expeditionPlan(s, 'athens', 'force');
    const raid = expeditionPlan(s, 'athens', 'raid');
    const own = s.army.companies.reduce((a, c) => a + s.army.soldiers.filter((x) => x.company === c.id && x.state === 'ready').length * 1.2, 0);
    expect(force.ours).toBe(Math.round(own) + militiaMightNow(s));
    expect(raid.ours).toBe(Math.round(own));
  });
});

describe('a treaty for freedom', () => {
  it('only for a colony that talks of freedom; it becomes a free ally, sends its share of its trade and its militia', () => {
    const { sim, s } = base();
    sim.enqueue({ type: 'colonyempire', act: 'free', site: 'naxos' });
    sim.flush();
    expect(freedOf(s, 'naxos')).toBeUndefined();
    const f = fresh('freeally');
    const t = f.state;
    const c = colonyOf(t, 'thasos') as Colony;
    expect(c.talk).toBeGreaterThan(0);
    send(f, { type: 'colonyempire', act: 'free', site: 'thasos' });
    expect(colonyOf(t, 'thasos')).toBeUndefined();
    const ally = freedOf(t, 'thasos')!;
    expect(ally.name).toBe('Nea Thasos');
    expect(siteRecord(t, 'thasos')).toMatchObject({ owner: '', free: 'Nea Thasos' });
    expect(militiaReady(t).some((m) => m.site === 'thasos')).toBe(true);
    expect(lines(t).some((x) => /You have signed a treaty with Nea Thasos: it stands free/.test(x))).toBe(true);
    const coin = (): number => t.empire.tribute.filter((x) => x.colony === 'thasos' && x.good < 0 && x.phase === 'done').length;
    expect(until(f, () => coin() > 0, 6 * TICKS_PER_MONTH)).toBe(true);
    ledgerAddsUp(t);
  }, 240000);
});

describe('slice 43’s findings', () => {
  it('counts only the stores the trading post’s roads reach', () => {
    const { s } = base();
    const reach = reachedStores(s)!;
    const store = s.buildings.find((b) => b.kind === 'storehouse' && reach.has(b.id))!;
    expect(store).toBeDefined();
    for (const t of roadsBeside(s, Math.round(Math.sqrt(s.tiles.length)), store)) s.tiles[t] = TILE_EMPTY;
    expect(reachedStores(s)!.has(store.id)).toBe(false);
  });

  it('a shipment called off: its goods back in the stores, the work’s drachmas back, and it can be funded again', () => {
    const { sim, s, naxos } = base();
    const store = s.buildings.find((b) => b.kind === 'storehouse' && reachedStores(s)!.has(b.id))!;
    setHeld(store, TIMBER, held(store, TIMBER) + 400);
    const money = s.money;
    const timber = s.buildings.reduce((a, b) => a + held(b, TIMBER), 0);
    send(sim, { type: 'colonyworks', act: 'work', site: 'naxos', work: 'harbour' });
    expect(s.money).toBe(money - WORKS.harbour.dr);
    sim.run(3 * TICKS_PER_DAY);
    const before = s.money;
    send(sim, { type: 'colonyempire', act: 'cancel', site: 'naxos' });
    expect(cargoesFor(s, 'naxos').length).toBe(0);
    expect(naxos.works.some((w) => w.kind === 'harbour')).toBe(false);
    expect(s.money).toBe(before + WORKS.harbour.dr);
    expect(s.buildings.reduce((a, b) => a + held(b, TIMBER), 0)).toBe(timber);
    expect(s.walkers.some((w) => w.kind === 'shipper')).toBe(false);
    ledgerAddsUp(s);
  }, 240000);

  it('sails with what is aboard when told; with nothing aboard after four months she is called off by herself, the page saying why', () => {
    const { sim, s } = base();
    const store = s.buildings.find((b) => b.kind === 'storehouse' && reachedStores(s)!.has(b.id))!;
    setHeld(store, TIMBER, held(store, TIMBER) + 400);
    send(sim, { type: 'colonyworks', act: 'work', site: 'naxos', work: 'harbour' });
    const x = cargoesFor(s, 'naxos')[0];
    // (Some timber down to the quay, then the stores emptied of it: she would wait for the rest.)
    expect(until(sim, () => x.items[0].got > 0 && x.ship?.phase === 4 && x.items[0].out === 0, 2 * TICKS_PER_MONTH)).toBe(true);
    for (const b of s.buildings) if (held(b, TIMBER) > 0) setHeld(b, TIMBER, 0);
    sim.run(2 * TICKS_PER_DAY);
    send(sim, { type: 'colonyempire', act: 'sail', site: 'naxos' });
    expect(x.phase).toBe('leaving');
    // Nothing aboard: called off after four months.
    const melos = plantColony(s, 'melos', 200, s.tick - TICKS_PER_YEAR);
    melos.stage = 1;
    setHeld(store, TIMBER, 300);
    send(sim, { type: 'colonyworks', act: 'work', site: 'melos', work: 'harbour' });
    const y = cargoesFor(s, 'melos')[0];
    // (No timber in the city for four months: what comes in by sea or from the yards is taken away at once.)
    const dry = (): void => {
      for (const b of s.buildings) if (held(b, TIMBER) > 0) setHeld(b, TIMBER, 0);
    };
    dry();
    expect(until(sim, () => (dry(), y.phase === 'done'), 5 * TICKS_PER_MONTH)).toBe(true);
    expect(melos.works.some((w) => w.kind === 'harbour')).toBe(false);
    expect(lines(s).some((l) => /Your shipment for Nea Melos is called off \(nothing reached your quay in four months/.test(l))).toBe(true);
    ledgerAddsUp(s);
  }, 240000);
});

describe('determinism, saves and the migration', () => {
  it('the same commands give the same empire, with a company at sea, triremes stationed and the militia out; a save mid-way plays on the same', () => {
    const run = (cut: boolean): string => {
      const { sim, s } = base();
      send(sim, { type: 'colonyempire', act: 'ships', site: 'naxos', n: 1 });
      send(sim, { type: 'colonyempire', act: 'station', site: 'naxos', company: s.army.companies[0].id });
      const sparta = cityOf(s.world, 'sparta');
      sparta.memories.push({ kind: 'staged', why: 'for the test', amount: -80, tick: s.tick, fade: TICKS_PER_YEAR });
      const r = threaten(s, sim.map, sparta, 'for the test');
      send(sim, { type: 'answer', deal: r.deal, act: 'refuse' });
      sim.run(35 * TICKS_PER_DAY);
      expect(passagesFor(s).length + s.empire.militia.length).toBeGreaterThan(0);
      if (cut) {
        const back = decodeSave(encodeSave(sim.state, 0));
        expect(back.ok).toBe(true);
        if (back.ok) sim.state = back.file.state;
      }
      sim.run(TICKS_PER_MONTH);
      return serialize(sim.state);
    };
    const a = run(false);
    expect(run(false)).toBe(a);
    expect(run(true)).toBe(a);
  }, 360000);

  it('a state from before this slice loads: nothing stationed, sailing or freed', () => {
    const { s } = base();
    const old = JSON.parse(serialize(s)) as Record<string, unknown> & { empire: Record<string, unknown> & { colonies: Array<Record<string, unknown>> } };
    old.version = 38; // (this step's own: renumbered at merge)
    for (const k of ['passages', 'militia', 'freed']) delete old.empire[k];
    for (const c of old.empire.colonies) for (const k of ['garrison', 'ships']) delete c[k];
    migrate(old);
    expect(old.version).toBe(SIM_STATE_VERSION);
    expect(old.empire.passages).toEqual([]);
    expect(old.empire.militia).toEqual([]);
    expect(old.empire.freed).toEqual([]);
    expect(old.empire.colonies.every((c) => c.garrison === 0 && Array.isArray(c.ships) && (c.ships as unknown[]).length === 0)).toBe(true);
    const sim = new Sim();
    sim.state = deserialize(JSON.stringify(old));
    sim.run(TICKS_PER_MONTH);
  });
});
