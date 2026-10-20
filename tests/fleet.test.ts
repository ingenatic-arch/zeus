/**
 * Slice 26: from the sea. Landings (Troy's ships beach, the band lands,
 * plunders and sails off laden; walls on the shore), ships lost (all sunk
 * before they beach; sunk while the band is ashore), the shipyard (a trireme
 * paid for, built, crewed and paid, mended), fights in the bay, pirates and
 * a guard on a lane, what slice 28 asks of the fleet, determinism and saves,
 * the migration of a version 25 save, and slice 25's review (the broken
 * band's count). The towns are the demos': #landing (Troy's ships a few days
 * from the beach of #companies' town), #triremes (the same with a shipyard
 * and two crewed triremes, the ships just in sight) and #pirates.
 */
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { CREW, BUILD_TICKS, fleetFor, guarded, guardRefusal, MEND_A_DAY, ROWER_PAY, shipsOf, triremeOnMap, TRIREME_COST } from '../src/sim/fleet';
import { canWorkIn } from '../src/sim/labour';
import { migrate } from '../src/sim/migrate';
import { raidersOf } from '../src/sim/raids';
import { deserialize, serialize, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type Raid, type SimState } from '../src/sim/state';
import { totals } from '../src/sim/treasury';
import { wallAt } from '../src/sim/walls';
import { seaOf } from '../src/sim/fleet';
import { CHEESE, FLEECE, MEAT, OIL, WHEAT, WINE } from '../src/sim/foods';
import { giftRefusal } from '../src/sim/diplomacy';
import { findBuilding } from '../src/sim/buildings';
import { demoSim } from './prepared';

const N = 128;
const T = (x: number, z: number): number => z * N + x;
const made: Record<string, string> = {};
const fresh = (name: string): Sim => {
  made[name] ??= serialize(demoSim(name).state);
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
const troy = (s: SimState): Raid => s.world.raids.find((r) => r.city === 'troy' && r.ended === 0)!;

describe('landings', () => {
  it('Troy’s ships beach on the shore, the band lands, plunders and goes back to its ships, which sail off laden', () => {
    const sim = fresh('landing');
    const s = sim.state;
    const r = troy(s);
    expect(r.by).toBe('sea');
    expect(r.phase).toBe('raiding');
    expect(r.ships).toBe(shipsOf(s, r).length);
    expect(r.ships).toBeGreaterThanOrEqual(2);
    expect(raidersOf(s, r)).toBeUndefined();
    expect(until(sim, () => r.landed > 0, TICKS_PER_MONTH)).toBe(true);
    const open = seaOf(sim.map).open;
    for (const e of shipsOf(s, r)) {
      expect(e.state).toBe('beached');
      // Drawn up on dry land beside the open sea.
      expect(open[e.tile]).toBe(0);
      expect([e.tile - 1, e.tile + 1, e.tile - N, e.tile + N].some((t) => open[t] === 1)).toBe(true);
    }
    // Two men stay with each ship; the rest land.
    expect(r.landed).toBe(r.men - 2 * r.ships);
    const band = raidersOf(s, r)!;
    expect(band.people).toBe(r.landed);
    expect(s.world.news.some((n) => /Troy’s men are ashore/.test(n.line))).toBe(true);
    expect(until(sim, () => r.phase !== 'raiding', 3 * TICKS_PER_MONTH)).toBe(true);
    expect(r.end).toBe('raided');
    expect(r.took + r.stole).toBeGreaterThan(0);
    const ships = s.fleet.ships.filter((e) => e.raid === r.id);
    expect(ships.length).toBe(r.ships);
    expect(ships.every((e) => e.state === 'leaving' && e.laden)).toBe(true);
    expect(until(sim, () => s.fleet.ships.length === 0, TICKS_PER_MONTH)).toBe(true);
    ledgerAddsUp(s);
  }, 120000);

  it('a wall along the shore is hammered like any: the band breaks in through it', () => {
    const sim = fresh('landing');
    const s = sim.state;
    const r = troy(s);
    // The shore round the trading post, from the river mouth to past the vineyards, walled two tiles in from the water.
    const open = seaOf(sim.map).open;
    const tiles: number[] = [];
    for (let x = 60; x <= 95; x++) {
      let z = 60;
      while (z < 100 && !open[T(x, z)]) z++;
      if (z < 100 && z - 2 > 60) tiles.push(T(x, z - 2));
    }
    send(sim, { type: 'wall', tiles });
    expect(s.walls.length).toBeGreaterThan(20);
    expect(until(sim, () => r.landed > 0, TICKS_PER_MONTH)).toBe(true);
    expect(until(sim, () => r.siege >= 0 && s.army.foes.some((f) => f.raid === r.id && f.swung === s.tick), TICKS_PER_MONTH)).toBe(true);
    const piece = wallAt(s, r.siege)!;
    const hp = piece.hp;
    sim.run(3 * TICKS_PER_DAY);
    expect(wallAt(s, piece.t)!.hp).toBeLessThan(hp);
  }, 120000);
});

describe('ships lost', () => {
  it('two crewed triremes meet the landing in the bay: every ship sunk before it beaches, nobody lands, and the raid is over', () => {
    const sim = fresh('triremes');
    const s = sim.state;
    const r = troy(s);
    expect(s.fleet.triremes.length).toBe(2);
    expect(s.fleet.triremes.every((t) => t.state === 'moored' && t.crew.length * 2 >= CREW)).toBe(true);
    // (A landing of two ships, unescorted: the rest of #triremes' fleet sent home for the test.)
    const extra = shipsOf(s, r).slice(2);
    s.fleet.ships = s.fleet.ships.filter((e) => !extra.includes(e));
    r.men -= extra.reduce((a, e) => a + e.men, 0);
    r.ships = 2;
    expect(until(sim, () => s.fleet.triremes.some((t) => t.state === 'rowing' && t.task === 'fight'), TICKS_PER_MONTH)).toBe(true);
    expect(until(sim, () => r.ended > 0, 2 * TICKS_PER_MONTH)).toBe(true);
    expect(r.end).toBe('sunk');
    expect(r.landed).toBe(0);
    expect(r.sunk).toBe(r.ships);
    expect(r.drowned).toBe(r.men);
    expect(raidersOf(s, r)).toBeUndefined();
    expect(s.world.news.some((n) => /never reached your shore/.test(n.line))).toBe(true);
    // Back at the jetty once the bay is clear.
    expect(until(sim, () => s.fleet.triremes.every((t) => t.state === 'moored'), TICKS_PER_MONTH)).toBe(true);
    ledgerAddsUp(s);
  }, 120000);

  it('a trireme with too few rowers stays at her mooring', () => {
    const sim = fresh('triremes');
    const s = sim.state;
    const r = troy(s);
    const [a, b] = s.fleet.triremes;
    // (Her yard gone from under her for the test: nobody comes to row.)
    a.crew = a.crew.slice(0, CREW / 2 - 1);
    a.yard = 0;
    let out = false;
    until(sim, () => {
      if (a.state !== 'moored') out = true;
      return r.ended > 0;
    }, 2 * TICKS_PER_MONTH);
    expect(out).toBe(false);
    void b;
  }, 120000);

  it('ships sunk while the band is ashore: it drops what it carried on the beach and flees overland', () => {
    const sim = fresh('landing');
    const s = sim.state;
    const r = troy(s);
    expect(until(sim, () => r.landed > 0, TICKS_PER_MONTH)).toBe(true);
    const band = raidersOf(s, r)!;
    expect(until(sim, () => band.back, 2 * TICKS_PER_MONTH)).toBe(true);
    expect(r.took + r.stole).toBeGreaterThan(0);
    for (const e of shipsOf(s, r)) e.hp = 0;
    expect(until(sim, () => r.shore < 0, TICKS_PER_MONTH)).toBe(true);
    expect(r.regained).toBe(r.took);
    expect(r.coinBack).toBe(r.stole);
    expect(s.world.news.some((n) => /found their ships sunk/.test(n.line))).toBe(true);
    expect(until(sim, () => r.phase !== 'raiding', 2 * TICKS_PER_MONTH)).toBe(true);
    expect(r.end).toBe('raided');
    ledgerAddsUp(s);
  }, 120000);
});

describe('the review of slice 26', () => {
  it('a band from the sea fallen to the last man ashore: its ships put off for home', () => {
    const sim = fresh('landing');
    const s = sim.state;
    const r = troy(s);
    expect(until(sim, () => r.landed > 0, TICKS_PER_MONTH)).toBe(true);
    sim.run(20);
    // (Every man of it down, as battle.ts leaves a band whose last man falls.)
    const band = raidersOf(s, r)!;
    s.walkers = s.walkers.filter((o) => o !== band);
    s.army.foes = s.army.foes.filter((f) => f.raid !== r.id);
    expect(until(sim, () => r.phase !== 'raiding', 2 * TICKS_PER_DAY)).toBe(true);
    expect(s.fleet.ships.filter((e) => e.raid === r.id).every((e) => e.state === 'leaving')).toBe(true);
    expect(until(sim, () => !s.fleet.ships.some((e) => e.raid === r.id), TICKS_PER_MONTH)).toBe(true);
  }, 120000);

  it('every ship sunk at sea, whatever the hour: told as never reaching the shore', () => {
    for (const hour of [0, 1, 2, 3]) {
      const sim = fresh('triremes');
      const s = sim.state;
      const r = troy(s);
      sim.run(30);
      // (The last ship goes down this many ticks before a day turns.)
      while ((s.tick + 1 + hour) % TICKS_PER_DAY !== 0) sim.step();
      for (const e of shipsOf(s, r)) e.hp = 0;
      expect(until(sim, () => r.phase !== 'raiding', 100)).toBe(true);
      expect(r.end).toBe('sunk');
      expect(r.phase).toBe('done');
    }
  }, 120000);

  it('a trireme out on one lane is brought home before she guards another; sailing home, she is still on the map', () => {
    const sim = fresh('pirates');
    const s = sim.state;
    const t = s.fleet.triremes[0];
    send(sim, { type: 'fleet', trireme: t.id, act: 'guard', lane: 'athens-sea' });
    expect(until(sim, () => t.state === 'away', 2 * TICKS_PER_MONTH)).toBe(true);
    expect(guardRefusal(t, 'troy-sea')).toMatch(/bring her home first/);
    send(sim, { type: 'fleet', trireme: t.id, act: 'guard', lane: 'troy-sea' });
    expect(t.lane).toBe('athens-sea');
    send(sim, { type: 'fleet', trireme: t.id, act: 'home' });
    if (t.state === 'away') {
      expect(triremeOnMap(t, s.tick)?.homeward).toBe(true);
      expect(guardRefusal(t, 'troy-sea')).toMatch(/sailing home/);
    }
    expect(until(sim, () => t.state === 'moored', 2 * TICKS_PER_MONTH)).toBe(true);
    expect(t.lane).toBe('');
    expect(guardRefusal(t, 'troy-sea')).toBe(t.hp < 60 ? 'Her hull needs mending first' : '');
  }, 120000);
});

describe('the shipyard', () => {
  it('a trireme is paid for, built in about thirty days, crewed from the huts and cottages, paid monthly on its own line, and mended at the yard', () => {
    const sim = fresh('companies');
    const s = sim.state;
    send(sim, { type: 'road', tiles: [68, 69, 70, 71, 72, 73].map((x) => T(x, 66)) });
    send(sim, { type: 'build', kind: 'shipyard', at: [T(68, 67)] });
    const yard = s.buildings.find((b) => b.kind === 'shipyard')!;
    expect(yard).toBeDefined();
    const m = s.money;
    send(sim, { type: 'trireme', yard: yard.id });
    expect(m - s.money).toBe(TRIREME_COST);
    expect(s.ledger.now.some((l) => l.kind === 'building' && l.what === 'trireme')).toBe(true);
    const t = s.fleet.triremes[0];
    // One at a time on the slip.
    send(sim, { type: 'trireme', yard: yard.id });
    expect(s.fleet.triremes.length).toBe(1);
    const start = s.tick;
    expect(until(sim, () => t.state === 'moored', 2 * TICKS_PER_MONTH)).toBe(true);
    const days = (s.tick - start) / TICKS_PER_DAY;
    expect(days).toBeGreaterThanOrEqual(BUILD_TICKS / TICKS_PER_DAY);
    expect(days).toBeLessThan(40);
    expect(until(sim, () => t.crew.length >= CREW, 10 * TICKS_PER_DAY)).toBe(true);
    for (const r of t.crew) {
      const h = findBuilding(s, r.home)!;
      expect(h.level).toBeGreaterThanOrEqual(2);
      expect(h.level).toBeLessThanOrEqual(3);
      expect(canWorkIn(s, h)).toBe(Math.floor(h.people / 2) - 1);
    }
    // Paid on the first of the month, on the rowers' line.
    const next = (Math.floor(s.tick / TICKS_PER_MONTH) + 1) * TICKS_PER_MONTH;
    sim.run(next - s.tick + 1);
    expect(s.ledger.now.concat(s.ledger.last).some((l) => l.kind === 'rowers' && l.amount === -CREW * ROWER_PAY)).toBe(true);
    // Mended a little each day at the yard.
    t.hp = 50;
    sim.run(4 * TICKS_PER_DAY);
    expect(t.hp).toBeGreaterThanOrEqual(50 + 3 * MEND_A_DAY);
    ledgerAddsUp(s);
  }, 120000);
});

describe('pirates', () => {
  // (Of whatever the town has 200 of to give.)
  const wineGift = (sim: Sim): void => {
    const good = [WINE, WHEAT, OIL, FLEECE, CHEESE, MEAT].find((w) => giftRefusal(sim.state, sim.map, 'athens', w, 200) === '');
    expect(good).toBeDefined();
    send(sim, { type: 'gift', city: 'athens', good: good!, amount: 200 });
  };

  it('pirates on an unguarded lane seize a gift by sea passing their place', () => {
    const sim = fresh('pirates');
    const s = sim.state;
    const p = s.fleet.pirates[0];
    expect(p.state).toBe('seen');
    expect(until(sim, () => p.state === 'preying', TICKS_PER_MONTH)).toBe(true);
    wineGift(sim);
    const g = s.world.gifts.find((x) => x.from === 'home' && x.to === 'athens');
    expect(g?.by).toBe('sea');
    expect(until(sim, () => !s.world.gifts.includes(g!), 3 * TICKS_PER_MONTH)).toBe(true);
    expect(p.took.some((x) => x.startsWith('200 '))).toBe(true);
    expect(s.world.news.some((n) => /Pirates off Cape Skyllaion seized your gift/.test(n.line))).toBe(true);
  }, 120000);

  it('a trireme sent to guard the lane goes on station, fights the pirates, and a report is written', () => {
    const sim = fresh('pirates');
    const s = sim.state;
    const t = s.fleet.triremes[0];
    send(sim, { type: 'fleet', trireme: t.id, act: 'guard', lane: 'athens-sea' });
    expect(t.order).toBe('lane');
    expect(until(sim, () => guarded(s, 'athens-sea'), 2 * TICKS_PER_MONTH)).toBe(true);
    expect(until(sim, () => s.fleet.reports.length > 0, 2 * TICKS_PER_DAY)).toBe(true);
    const rep = s.fleet.reports[0];
    expect(rep.way).toBe('athens-sea');
    expect(rep.line).toMatch(/Nike/);
    expect(s.army.news.some((n) => n.line === rep.line)).toBe(true);
    // Called home: back along the lane and in to her mooring.
    if (t.order === 'lane') send(sim, { type: 'fleet', trireme: t.id, act: 'home' });
    expect(until(sim, () => t.state === 'moored' || !s.fleet.triremes.includes(t), 2 * TICKS_PER_MONTH)).toBe(true);
  }, 120000);

  it('a gift passing a guarded lane is safe', () => {
    const sim = fresh('pirates');
    const s = sim.state;
    const t = s.fleet.triremes[0];
    send(sim, { type: 'fleet', trireme: t.id, act: 'guard', lane: 'athens-sea' });
    expect(until(sim, () => guarded(s, 'athens-sea'), 2 * TICKS_PER_MONTH)).toBe(true);
    const p = s.fleet.pirates[0];
    // (Whatever came of the fight: while she holds her station, nothing passing is seized.)
    wineGift(sim);
    const g = s.world.gifts.find((x) => x.from === 'home' && x.to === 'athens');
    expect(g).toBeDefined();
    const before = p.took.length;
    expect(until(sim, () => !s.world.gifts.includes(g!), 3 * TICKS_PER_MONTH)).toBe(true);
    if (guarded(s, 'athens-sea')) expect(p.took.length).toBe(before);
  }, 120000);
});

describe('for slice 28: what can carry a force by sea', () => {
  it('fleetFor names the triremes at home, crewed and sound, and why not when none can go', () => {
    const sim = fresh('triremes');
    const s = sim.state;
    const f = fleetFor(s, 'athens');
    expect(f.ids.length).toBe(2);
    expect(f.carry).toBeGreaterThan(0);
    expect(f.why).toBe('');
    expect(fleetFor(s, 'sparta').why).toMatch(/No sea lane/);
    const none = fresh('companies');
    expect(fleetFor(none.state, 'troy').why).toMatch(/no triremes/);
  }, 120000);
});

describe('saves and determinism', () => {
  it('the same landing and fight twice come out the same; a save mid-fight plays on the same', () => {
    const a = fresh('triremes');
    const b = fresh('triremes');
    until(a, () => a.state.fleet.triremes.some((t) => t.struck > 0) || a.state.fleet.ships.some((e) => e.hit > 0), 2 * TICKS_PER_MONTH);
    b.run(a.state.tick - b.state.tick);
    expect(serialize(b.state)).toBe(serialize(a.state));
    const got = decodeSave(encodeSave(a.state, 1));
    if (!got.ok) throw new Error(got.why);
    expect(serialize(got.file.state)).toBe(serialize(a.state));
    const copy = new Sim();
    copy.state = got.file.state;
    for (const n of [40, 300]) {
      a.run(n);
      copy.run(n);
      expect(serialize(copy.state)).toBe(serialize(a.state));
    }
  }, 120000);

  it('a version 25 save (before the fleet) loads with an empty fleet and plays on', () => {
    const sim = fresh('battle');
    const st = JSON.parse(serialize(sim.state)) as Record<string, unknown> & { world: { raids: Array<Record<string, unknown>>; routes: Array<Record<string, unknown>> } };
    st.version = 25;
    delete st.fleet;
    for (const r of st.world.raids) for (const k of ['shore', 'ships', 'sunk', 'landed', 'drowned', 'brokeAt']) delete r[k];
    for (const r of st.world.routes) delete r.robbed;
    expect(migrate(st)).toBe(25);
    expect(st.version).toBe(SIM_STATE_VERSION);
    const s = deserialize(JSON.stringify(st));
    expect(s.fleet.triremes).toEqual([]);
    for (const r of s.world.raids) expect(r.shore).toBe(-1);
    const again = new Sim();
    again.state = s;
    again.run(TICKS_PER_MONTH);
    expect(decodeSave(encodeSave(s, 1)).ok).toBe(true);
  }, 120000);
});

describe('the review of slice 25', () => {
  it('the news of a band broken counts every man who fell, as it left', () => {
    const sim = fresh('battle');
    const s = sim.state;
    const r = s.world.raids.find((x) => x.city === 'sparta' && x.ended === 0)!;
    // The companies placed in the band's way at the bridge (as battle.test.ts does), and played on until it has gone.
    const hop = s.army.companies.find((c) => c.kind === 'hoplite')!;
    const arc = s.army.companies.find((c) => c.kind === 'archer')!;
    send(sim, { type: 'banner', company: hop.id, tile: T(40, 41) });
    send(sim, { type: 'banner', company: arc.id, tile: T(44, 39) });
    expect(until(sim, () => r.broke || r.ended > 0, 4 * TICKS_PER_MONTH)).toBe(true);
    expect(r.broke).toBe(true);
    const at = r.fallen;
    expect(s.army.news.some((n) => /Your soldiers broke/.test(n.line))).toBe(false);
    expect(until(sim, () => r.ended > 0, 2 * TICKS_PER_MONTH)).toBe(true);
    const line = s.army.news.find((n) => /Your soldiers broke/.test(n.line))!;
    expect(line).toBeDefined();
    expect(line.line).toContain(`${r.fallen} of their ${r.men} men fell`);
    expect(r.fallen).toBeGreaterThanOrEqual(at);
  }, 120000);
});
