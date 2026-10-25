/**
 * Colonies that grow up (slice 43): stages at their thresholds; what a
 * colony sends, retuned; works funded, their goods carried down to the quay
 * by porters, shipped, landed and built, with their effects; wants met in
 * time, ignored, and never asked in winter; governors chosen, by you or the
 * council, and dismissed; determinism, saves and the migration.
 */
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '../src/sim/clock';
import { colonyGrowth, colonyLoyalty, colonyYear, peopleOf, plantColony, siteRecord, threatenColony, fightRoll, type Colony } from '../src/sim/colonies';
import { askColony, cargoesFor, ownDefence, sendsYear, shipPace, stageFor, stageOf, workRefusal, worksRefusal, WORKS, type WorkKind } from '../src/sim/colonyworks';
import { held, MARBLE, setHeld, TIMBER, WHEAT, COPPER, OIL, FLEECE } from '../src/sim/foods';
import { migrate } from '../src/sim/migrate';
import { deserialize, serialize, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type SimState } from '../src/sim/state';
import { totals, income } from '../src/sim/treasury';
import { SHIP_ANCHORED, tradeIndex } from '../src/sim/trade';
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
const stored = (s: SimState, ware: number): number => s.buildings.reduce((a, b) => a + held(b, ware), 0);
const bookLine = (s: SimState, ware: number, kind: string, what: string): number => [...s.stocks.now, ...s.stocks.last].filter((l) => l.ware === ware && l.kind === kind && l.what === what).reduce((a, l) => a + l.n, 0);
/** Put some of a good into the town's first storehouse (or granary). */
const stock = (s: SimState, ware: number, n: number, kind: 'storehouse' | 'granary' = 'storehouse'): void => {
  const b = s.buildings.find((x) => x.kind === kind)!;
  setHeld(b, ware, held(b, ware) + n);
};
/** #richtown's trading town with money in hand and a colony on Thasos of so many people. */
const withColony = (people = 255): { sim: Sim; s: SimState; c: Colony } => {
  const sim = fresh('richtown');
  income(sim.state, 5000, 'given', 'for the test');
  const c = plantColony(sim.state, 'thasos', people, sim.state.tick - TICKS_PER_YEAR);
  return { sim, s: sim.state, c };
};
const build = (c: Colony, kind: WorkKind): void => {
  c.works.push({ kind, phase: 'built', at: 0, done: 0, cargo: 0 });
};

describe('stages and what a colony sends', () => {
  it('steps up at 150, 400 and 900 people, and down only below four fifths of its threshold', () => {
    expect([0, 149, 150, 399, 400, 899, 900, 2000].map((n) => stageFor(n))).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect(stageFor(130, 1)).toBe(1);
    expect(stageFor(119, 1)).toBe(0);
    expect(stageFor(330, 2)).toBe(2);
    expect(stageFor(310, 2)).toBe(1);
  });

  it('a colony that grows past a threshold becomes a settlement, with the news naming the works that open', () => {
    const { sim, s, c } = withColony(148);
    expect(stageOf(c)).toBe(0);
    expect(until(sim, () => stageOf(c) === 1, 8 * TICKS_PER_MONTH)).toBe(true);
    expect(peopleOf(s, c)).toBeGreaterThanOrEqual(150);
    expect(lines(s).some((x) => /Nea Thasos has grown into a settlement of \d+ people: a harbour and an agora can be built there now/.test(x))).toBe(true);
  }, 120000);

  it('a colony of 400 at a fair share sends measures against your own works, no longer cheap goods by the thousand; a harbour adds a quarter', () => {
    const fair = 0.4;
    const year = (ware: number): number => sendsYear(tradeIndex(ware), 400, 2, fair).amount;
    expect(year(OIL)).toBe(1280);
    expect(year(WHEAT)).toBe(1760);
    expect(year(COPPER)).toBe(1200);
    expect(year(FLEECE)).toBe(960);
    expect(year(TIMBER)).toBe(900);
    expect(year(MARBLE)).toBe(600);
    expect(sendsYear(tradeIndex(OIL), 400, 2, fair, 0.25).amount).toBe(1600);
    // An outpost makes half a town's, a settlement four fifths.
    expect(sendsYear(tradeIndex(TIMBER), 400, 0, fair).amount).toBe(450);
    const { s, c } = withColony(400);
    expect(stageOf(c)).toBe(2);
    const before = colonyYear(s, c).amount;
    build(c, 'harbour');
    expect(Math.abs(colonyYear(s, c).amount - before * 1.25)).toBeLessThanOrEqual(10);
    expect(shipPace(c)).toBe(0.75);
  });
});

describe('works you fund', () => {
  it('a harbour: paid for, its timber carried down to the quay by porters, shipped, landed and built', () => {
    const { sim, s, c } = withColony(255);
    stock(s, TIMBER, 400);
    expect(workRefusal(s, sim.map, c, 'temple')).toMatch(/when Nea Thasos is a town \(400 people\)/);
    expect(workRefusal(s, sim.map, c, 'harbour')).toBe('');
    const money = s.money;
    const timber = stored(s, TIMBER);
    send(sim, { type: 'colonyworks', act: 'work', site: 'thasos', work: 'harbour' });
    expect(s.money).toBe(money - WORKS.harbour.dr);
    expect(s.ledger.now.some((l) => l.kind === 'colonies' && l.what === 'Works for Nea Thasos' && l.amount === -WORKS.harbour.dr)).toBe(true);
    ledgerAddsUp(s);
    expect(workRefusal(s, sim.map, c, 'harbour')).toMatch(/on their way/);
    const x = cargoesFor(s, 'thasos')[0];
    expect(x.items[0]).toMatchObject({ kind: 'work', work: 'harbour', amount: 150 });
    // Porters walk it down to the quay, the ship anchors, everything goes aboard, she sails.
    expect(until(sim, () => s.walkers.some((w) => w.kind === 'shipper'), 2 * TICKS_PER_DAY)).toBe(true);
    expect(until(sim, () => x.ship?.phase === SHIP_ANCHORED, 25 * TICKS_PER_DAY)).toBe(true);
    expect(until(sim, () => x.phase !== 'loading', 20 * TICKS_PER_DAY)).toBe(true);
    expect(stored(s, TIMBER)).toBe(timber - 150);
    expect(bookLine(s, TIMBER, 'sold', 'colony:thasos')).toBe(150);
    expect(s.walkers.some((w) => w.kind === 'shipper')).toBe(false);
    expect(until(sim, () => c.works[0].phase === 'building', 3 * TICKS_PER_MONTH)).toBe(true);
    expect(cargoesFor(s, 'thasos').length).toBe(0);
    expect(until(sim, () => c.works[0].phase === 'built', 4 * TICKS_PER_MONTH)).toBe(true);
    expect(lines(s).some((x) => /A harbour stands finished at Nea Thasos/.test(x))).toBe(true);
    ledgerAddsUp(s);
  }, 240000);

  it('refuses with too little money, the goods not in your stores, no trading post, or a work already funded', () => {
    const { sim, s, c } = withColony(255);
    expect(workRefusal(s, sim.map, c, 'harbour')).toMatch(/needs 150 timber .*you have 0/);
    stock(s, TIMBER, 400);
    const money = s.money;
    s.money = 100;
    expect(workRefusal(s, sim.map, c, 'harbour')).toMatch(/costs 500 dr/);
    s.money = money;
    send(sim, { type: 'colonyworks', act: 'work', site: 'thasos', work: 'agora' });
    // The agora's timber is promised: what is left over is what counts.
    expect(workRefusal(s, sim.map, c, 'harbour')).toBe('');
    stock(s, TIMBER, -200);
    expect(workRefusal(s, sim.map, c, 'harbour')).toMatch(/needs 150 timber .*you have 80/);
    const town = fresh('town');
    const tc = plantColony(town.state, 'thasos', 255);
    expect(workRefusal(town.state, town.map, tc, 'agora')).toMatch(/trading post/);
    // A refused act does nothing.
    const before = JSON.stringify([s.empire, s.money]);
    send(sim, { type: 'colonyworks', act: 'work', site: 'thasos', work: 'temple' });
    expect(JSON.stringify([s.empire, s.money])).toBe(before);
    expect(worksRefusal(s, sim.map, 'work', 'naxos', 'agora')).toMatch(/not your colony/);
  });

  it('the agora and the temple are named in its loyalty; fields in its growth; a second trade sends a second good', () => {
    const { s, c } = withColony(450);
    const base = colonyLoyalty(s, c).target;
    build(c, 'agora');
    build(c, 'temple');
    const l = colonyLoyalty(s, c);
    expect(l.target).toBe(Math.min(100, base + 14));
    expect(l.why.some((x) => /its agora/.test(x.why) && x.n === 6)).toBe(true);
    expect(l.why.some((x) => /its temple/.test(x.why) && x.n === 8)).toBe(true);
    const grows = colonyGrowth(s, c).reduce((a, x) => a + x.n, 0);
    build(c, 'fields');
    const g = colonyGrowth(s, c);
    expect(g.some((x) => /its own fields feed it/.test(x.why) && x.n > 0)).toBe(true);
    expect(g.reduce((a, x) => a + x.n, 0)).toBeGreaterThan(grows);
    build(c, 'trade');
    // Thasos' second trade is marble.
    const t0 = s.empire.tribute.length;
    c.next = s.tick;
    const sim = new Sim();
    sim.state = s;
    until(sim, () => s.empire.tribute.length > t0, 2 * TICKS_PER_DAY);
    const ships = s.empire.tribute.slice(t0);
    expect(ships.map((t) => t.good).sort()).toEqual([tradeIndex(TIMBER), tradeIndex(MARBLE)].sort());
  });

  it('walls turn raids away by themselves on the same roll past your triremes, and a raid that gets in takes a third as many and leaves the ship', () => {
    let driven = 0;
    let raided = 0;
    for (const seed of [11, 12, 13, 14, 15, 16, 17, 18]) {
      const { sim, s, c } = withColony(600);
      s.world.seed = seed;
      build(c, 'walls');
      expect(ownDefence(c)).toBe(0.45);
      const t = threatenColony(s, c, 'athens', 'claim');
      const roll = fightRoll(s, c, t);
      const pop = siteRecord(s, 'thasos')!.pop;
      until(sim, () => t.end !== '', t.due - s.tick + 2 * TICKS_PER_DAY);
      if (roll < 0.45) {
        expect(t.end).toBe('driven');
        driven++;
      } else {
        // (Claimed? No: a walled colony can't be claimed.)
        expect(t.end).toBe('raided');
        expect(c.skip).toBe(false);
        expect(pop - siteRecord(s, 'thasos')!.pop).toBeLessThanOrEqual(Math.round(pop * 0.05) + 1);
        raided++;
      }
    }
    expect(driven + raided).toBe(8);
  }, 240000);
});

describe('wants', () => {
  it('asked for wheat and sent in time: porters carry it from the granaries, it lands, it is met, remembered, and it grows faster for a year', () => {
    const { sim, s, c } = withColony(255);
    const w = askColony(s, c, 'wheat');
    expect(w.amount).toBe(150);
    expect(lines(s).some((x) => /Nea Thasos asks you for 150 wheat: after a hard winter its stores are empty/.test(x))).toBe(true);
    expect(worksRefusal(s, sim.map, 'want', 'thasos')).toBe('');
    const wheat = stored(s, WHEAT);
    send(sim, { type: 'colonyworks', act: 'want', site: 'thasos' });
    expect(w.cargo).toBeGreaterThan(0);
    expect(worksRefusal(s, sim.map, 'want', 'thasos')).toMatch(/on its way/);
    const x = cargoesFor(s, 'thasos')[0];
    expect(until(sim, () => x.items[0].got >= 150, 20 * TICKS_PER_DAY)).toBe(true);
    expect(bookLine(s, WHEAT, 'sold', 'colony:thasos')).toBe(150);
    void wheat;
    expect(until(sim, () => w.end !== '', 3 * TICKS_PER_MONTH)).toBe(true);
    expect(w.end).toBe('met');
    expect(colonyLoyalty(s, c).why.some((x) => /the wheat it asked for/.test(x.why) && x.n > 0)).toBe(true);
    expect(colonyGrowth(s, c).some((x) => /the wheat you sent it/.test(x.why) && x.n > 0)).toBe(true);
  }, 240000);

  it('not sent by its day, it is ignored and remembered; a hungry spring slows it', () => {
    const { sim, s, c } = withColony(255);
    const w = askColony(s, c, 'wheat');
    expect(until(sim, () => w.end !== '', w.due - s.tick + 2 * TICKS_PER_DAY)).toBe(true);
    expect(w.end).toBe('ignored');
    expect(colonyLoyalty(s, c).why.some((x) => /you sent nothing when it asked for wheat/.test(x.why) && x.n === -10)).toBe(true);
    expect(colonyGrowth(s, c).some((x) => /a hungry spring/.test(x.why) && x.n < 0)).toBe(true);
  }, 120000);

  it('comes now and then, never in winter, never for its own good', () => {
    const { sim, s, c } = withColony(300);
    expect(s.season.on).toBe(true);
    const asked: Array<{ good: number; at: number }> = [];
    let last = -1;
    for (let y = 0; y < 6 * 12; y++) {
      sim.run(TICKS_PER_MONTH);
      if (c.want && c.want.at !== last) {
        last = c.want.at;
        asked.push({ good: c.want.good, at: c.want.at });
      }
    }
    expect(asked.length).toBeGreaterThanOrEqual(3);
    for (const a of asked) {
      expect(a.good).not.toBe(tradeIndex(TIMBER));
      expect(Math.floor(a.at / (3 * TICKS_PER_MONTH)) % 4).not.toBe(3);
    }
  }, 240000);
});

describe('governors', () => {
  it('at a landing, the settlers’ own leader governs while you choose from him and two others', () => {
    const sim = fresh('richtown');
    income(sim.state, 3000, 'given', 'for the test');
    const s = sim.state;
    send(sim, { type: 'colony', act: 'found', site: 'thasos' });
    expect(until(sim, () => s.empire.colonies.length > 0, 8 * TICKS_PER_MONTH)).toBe(true);
    const c = s.empire.colonies[0];
    expect(c.candidates.length).toBe(3);
    expect(c.candidates[0]).toEqual({ name: c.governor, trait: c.trait });
    expect(c.chooseBy).toBe(s.tick + 30 * TICKS_PER_DAY);
    expect(stageOf(c)).toBe(0);
  }, 240000);

  it('dismissed: it costs loyalty and offers three candidates with their traits; you choose one, or the council chooses the first after a month', () => {
    const { sim, s, c } = withColony(255);
    expect(worksRefusal(s, sim.map, 'dismiss', 'thasos')).toBe('');
    send(sim, { type: 'colonyworks', act: 'dismiss', site: 'thasos' });
    expect(c.governor).toBe('');
    expect(c.candidates.length).toBe(3);
    expect(new Set(c.candidates.map((x) => x.trait)).size).toBe(3);
    expect(colonyLoyalty(s, c).why.some((x) => /you dismissed its governor/.test(x.why) && x.n === -5)).toBe(true);
    const pick = c.candidates[1];
    send(sim, { type: 'colonyworks', act: 'governor', site: 'thasos', n: 1 });
    expect(c.governor).toBe(pick.name);
    expect(c.trait).toBe(pick.trait);
    expect(c.candidates.length).toBe(0);
    // Again, and left to the council (review of slice 43: the man dismissed is never among those offered).
    send(sim, { type: 'colonyworks', act: 'dismiss', site: 'thasos' });
    expect(c.candidates.some((x) => x.name === pick.name)).toBe(false);
    const first = c.candidates[0];
    expect(until(sim, () => !!c.governor, 31 * TICKS_PER_DAY)).toBe(true);
    expect(c.governor).toBe(first.name);
    expect(lines(s).some((x) => /council has chosen/.test(x))).toBe(true);
  });

  it('a builder’s works cost a quarter less; a favourite is named in its loyalty; a soldier turns raiders away by himself', () => {
    const { sim, s, c } = withColony(255);
    stock(s, TIMBER, 400);
    c.trait = 'builder';
    const money = s.money;
    send(sim, { type: 'colonyworks', act: 'work', site: 'thasos', work: 'harbour' });
    expect(s.money).toBe(money - 380);
    c.trait = 'favourite';
    expect(colonyLoyalty(s, c).why.some((x) => /favourite/.test(x.why) && x.n === 8)).toBe(true);
    c.trait = 'soldier';
    expect(ownDefence(c)).toBe(0.2);
    build(c, 'walls');
    expect(ownDefence(c)).toBe(0.56);
  });
});

describe('determinism, saves and the migration', () => {
  it('the same commands give the same colony, with a want, a work and goods at sea; a save mid-way plays on the same', () => {
    const run = (cut: boolean): string => {
      const { sim, s, c } = withColony(255);
      stock(s, TIMBER, 400);
      askColony(s, c, 'wheat');
      send(sim, { type: 'colonyworks', act: 'want', site: 'thasos' });
      send(sim, { type: 'colonyworks', act: 'work', site: 'thasos', work: 'harbour' });
      sim.run(6 * TICKS_PER_DAY);
      expect(s.walkers.some((w) => w.kind === 'shipper') || cargoesFor(s, 'thasos').length > 0).toBe(true);
      if (cut) {
        const text = encodeSave(sim.state, 0);
        const back = decodeSave(text);
        expect(back.ok).toBe(true);
        if (back.ok) sim.state = back.file.state;
      }
      sim.run(2 * TICKS_PER_MONTH);
      return serialize(sim.state);
    };
    const a = run(false);
    expect(run(false)).toBe(a);
    expect(run(true)).toBe(a);
  }, 240000);

  it('a version 37 state loads: its colonies stand at their stage, with nothing funded, asked or on its way', () => {
    const { s } = withColony(450);
    const old = JSON.parse(serialize(s)) as Record<string, unknown> & { empire: Record<string, unknown> & { colonies: Array<Record<string, unknown>> } };
    old.version = 37;
    delete old.empire.cargoes;
    for (const c of old.empire.colonies) for (const k of ['stage', 'works', 'want', 'wantNext', 'boosts', 'candidates', 'chooseBy', 'govSince']) delete c[k];
    migrate(old);
    expect(old.version).toBe(SIM_STATE_VERSION);
    expect(old.empire.cargoes).toEqual([]);
    const c = old.empire.colonies[0];
    expect(c.stage).toBe(2);
    expect(c.works).toEqual([]);
    expect(c.want).toBeNull();
    expect(c.candidates).toEqual([]);
    expect(c.govSince).toBe(c.since);
    expect(c.wantNext).toBe(s.tick + 6 * TICKS_PER_MONTH);
    const sim = new Sim();
    sim.state = deserialize(JSON.stringify(old));
    sim.run(TICKS_PER_MONTH);
  });
});
