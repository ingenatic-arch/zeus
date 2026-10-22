/**
 * Slice 24: raiders fought in the streets. The battle model (melee, arrows,
 * wounds and falling, breaking), what the fallen leave behind (loot taken
 * back, the dead mourned at home, the wounded healing), hirelings, and the
 * findings carried over from slice 23's review (pay owed on dismissal, the
 * barracks with no road). Every fight here is `#battle`'s: #companies' town
 * with Sparta's band ten days from the west edge.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { COMPANY_SIZE, HEAL_DAYS, HIRED_PAY, HIRELINGS, menOf, readyOf, strength } from '../src/sim/army';
import { buildingRefusal } from '../src/sim/build';
import { findBuilding } from '../src/sim/buildings';
import { FIRE_BURNING } from '../src/sim/hazards';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { moodOf as homeMood } from '../src/sim/folk';
import { raidersOf } from '../src/sim/raids';
import { deserialize, serialize, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, TILE_ROAD, type Company, type Raid, type SimState } from '../src/sim/state';
import { bookNow } from '../src/sim/stocks';
import { townLines } from '../src/sim/status';
import { totals } from '../src/sim/treasury';
import { demoSim } from './prepared';

const N = 128;
const tile = (x: number, z: number): number => z * N + x;
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
/** A save made now opens again, the same town (slice 24's review: a ledger with the hirelings' or the loot taken back's lines was refused as damaged). */
const reopens = (s: SimState): void => {
  const got = decodeSave(encodeSave(s, 1));
  if (!got.ok) throw new Error(got.why);
  expect(serialize(got.file.state)).toBe(serialize(s));
};

/** #battle's town: Sparta's band, its hoplites and its archers. */
function battle(): { sim: Sim; s: SimState; r: Raid; hop: Company; arc: Company } {
  const sim = fresh('battle');
  const s = sim.state;
  const r = s.world.raids.find((x) => x.city === 'sparta' && x.ended === 0)!;
  const hop = s.army.companies.find((c) => c.kind === 'hoplite')!;
  const arc = s.army.companies.find((c) => c.kind === 'archer')!;
  return { sim, s, r, hop, arc };
}
/** In the band's way: the hoplites at the east end of the bridge, the archers on the rise behind. */
const HOLD_HOP = tile(40, 41);
const HOLD_ARC = tile(44, 39);
/** Off the band's way, six tiles north of its road: in bowshot, out of its sight. */
const OFF_ROAD = tile(45, 35);

/** Raiders fallen of a band, and soldiers fallen or wounded of a company. */
const losses = (s: SimState, c: Company): number => s.army.soldiers.filter((x) => x.company === c.id && x.state !== 'ready').length;

describe('the battle', () => {
  it('two companies in the band’s way break it: half its men fall, it runs, takes nothing, and nobody fights forever', () => {
    const { sim, s, r, hop, arc } = battle();
    expect(r.phase).toBe('marching');
    send(sim, { type: 'banner', company: hop.id, tile: HOLD_HOP });
    send(sim, { type: 'banner', company: arc.id, tile: HOLD_ARC });
    let arrows = 0;
    let fighting = 0;
    let first = 0;
    let told = 0;
    let line = false;
    let held = 0;
    until(
      sim,
      () => {
        if (!held && hop.order === 'hold' && arc.order === 'hold') held = s.tick;
        if (s.army.news.length !== told) {
          told = s.army.news.length;
          line ||= townLines(s, sim.map).some((l) => l.need === 'battle');
        }
        arrows = Math.max(arrows, s.army.arrows.length);
        if (s.army.foes.some((f) => f.state === 'fight')) {
          fighting++;
          first ||= s.tick;
        }
        return r.phase === 'homeward' && s.army.foes.length === 0 && s.army.arrows.length === 0;
      },
      3 * TICKS_PER_MONTH,
    );
    expect(r.phase).toBe('homeward');
    expect(r.broke).toBe(true);
    expect(r.fallen).toBeGreaterThanOrEqual(Math.ceil(r.men / 2));
    expect(r.took).toBe(0);
    expect(r.stole).toBe(0);
    expect(arrows).toBeGreaterThan(0);
    // (Nobody fights forever: the fight is over within days. Since the crews of walkers changed the town's history, 18.)
    expect(fighting).toBeGreaterThan(0);
    expect(fighting).toBeLessThan(21 * TICKS_PER_DAY);
    // (Time to place them: sent as #battle opens, both companies stand in their ranks days before the band comes. Slice 24's review: at the old march they were there less than a day before it.)
    expect(held).toBeGreaterThan(0);
    expect(first - held).toBeGreaterThanOrEqual(5 * TICKS_PER_DAY);
    expect(s.army.foes).toEqual([]);
    expect(s.army.news.some((n) => /^Your soldiers broke Sparta’s raiders .*: \d+ of their \d+ men fell/.test(n.line))).toBe(true);
    expect(line).toBe(true);
    ledgerAddsUp(s);
  }, 120000);

  it('hoplites beat an equal number of raiders, man for man', () => {
    const { sim, s, r, hop } = battle();
    r.men = COMPANY_SIZE;
    send(sim, { type: 'banner', company: hop.id, tile: HOLD_HOP });
    until(sim, () => r.broke || r.phase === 'homeward', 3 * TICKS_PER_MONTH);
    expect(r.broke).toBe(true);
    expect(r.fallen).toBeGreaterThanOrEqual(COMPANY_SIZE / 2);
    expect(losses(s, hop)).toBeLessThan(r.fallen);
    expect(hop.routed).toBe(false);
  }, 120000);

  it('archers out of the band’s sight wear it down with arrows, and none of them is touched', () => {
    const { sim, s, r, arc } = battle();
    send(sim, { type: 'banner', company: arc.id, tile: OFF_ROAD });
    let loosed = 0;
    until(
      sim,
      () => {
        loosed += s.army.arrows.filter((a) => a.t0 === s.tick).length;
        return r.took > 0 || r.phase === 'homeward';
      },
      3 * TICKS_PER_MONTH,
    );
    expect(loosed).toBeGreaterThan(10);
    expect(r.fallen).toBeGreaterThan(0);
    expect(losses(s, arc)).toBe(0);
  }, 120000);

  it('a company that loses half its men breaks and runs for its barracks; its dead are mourned at home, its wounded heal, and it fills again', () => {
    const { sim, s, r, arc } = battle();
    // (Archers alone, hand to hand with the whole band on the bridge: raiders beat archers in melee.)
    send(sim, { type: 'banner', company: arc.id, tile: HOLD_HOP });
    const homes = new Map<number, number>();
    for (const x of s.army.soldiers) if (x.company === arc.id) homes.set(x.id, findBuilding(s, x.home)!.people);
    const dead: Array<{ id: number; name: string; home: number; drop: number }> = [];
    const hurt: Array<{ id: number; name: string; home: number; drop: number }> = [];
    const seen = new Set<number>();
    const watch = (): void => {
      for (const x of s.army.soldiers) {
        if (!homes.has(x.id) || seen.has(x.id) || (x.state !== 'fallen' && x.state !== 'wounded')) continue;
        seen.add(x.id);
        (x.state === 'fallen' ? dead : hurt).push({ id: x.id, name: x.name, home: x.home, drop: homes.get(x.id)! - findBuilding(s, x.home)!.people });
      }
      for (const x of s.army.soldiers) if (homes.has(x.id) && !seen.has(x.id)) homes.set(x.id, findBuilding(s, x.home)!.people);
    };
    until(sim, () => (watch(), arc.routed), 3 * TICKS_PER_MONTH);
    expect(arc.routed).toBe(true);
    expect(arc.order).toBe('return');
    expect(r.broke).toBe(false);
    // (A broken company runs, and the raiders let it go: nobody else of it falls on the way back. Slice 24's review: they cut it down as it ran.)
    const [killed, wounded] = [r.killed, r.wounded];
    for (let i = 0; i < 10 * TICKS_PER_DAY; i++) {
      sim.step();
      watch();
    }
    expect([r.killed, r.wounded]).toEqual([killed, wounded]);
    expect(s.army.news.some((n) => /has lost half its men and breaks/.test(n.line))).toBe(true);
    expect(dead.length + hurt.length).toBeGreaterThanOrEqual(COMPANY_SIZE / 2);
    expect(dead.length).toBeGreaterThan(0);
    expect(hurt.length).toBeGreaterThan(0);
    // The dead: one fewer in the house, the house's story, its mood, and the town hears.
    for (const x of dead) {
      const b = findBuilding(s, x.home)!;
      expect(x.drop).toBe(1);
      expect(b.family?.story.some((e) => e.what === 'fell' && e.names[0] === x.name)).toBe(true);
      expect(homeMood(s, b, { agora: true, jobs: true }, 0).reasons.some((m) => m.text.startsWith(`Mourning ${x.name}`))).toBe(true);
    }
    expect(s.army.news.some((n) => dead.some((x) => n.line.startsWith(`${x.name}, `)) && /mourns him/.test(n.line))).toBe(true);
    // The wounded get up, walk back and heal; the company calls men in the dead's places.
    // (A man whose home the band burns on its way out leaves the company, wounded or not.)
    const ids = hurt.map((x) => x.id);
    const state = (id: number): string => s.army.soldiers.find((x) => x.id === id)?.state ?? 'gone';
    until(sim, () => ids.every((id) => state(id) === 'healing' || state(id) === 'gone'), 2 * TICKS_PER_MONTH);
    const healing = ids.filter((id) => state(id) === 'healing');
    expect(healing.length).toBeGreaterThan(0);
    expect(healing.length).toBeGreaterThanOrEqual(ids.length - 2);
    expect(strength(s).wounded).toBeGreaterThanOrEqual(healing.length);
    sim.run((HEAL_DAYS + 2) * TICKS_PER_DAY);
    for (const id of healing) expect(['ready', 'healing', 'gone']).toContain(state(id));
    expect(healing.filter((id) => state(id) === 'ready').length).toBeGreaterThan(0);
    expect(menOf(s, arc).length).toBe(COMPANY_SIZE);
    expect(readyOf(s, arc).length).toBeGreaterThan(COMPANY_SIZE / 2);
  }, 240000);
});

describe('loot', () => {
  it('a band let through carries off goods and drachmas; its fallen give theirs back (to a store, and to the treasury on its own line); a save then opens', () => {
    const { sim, s, r } = battle();
    until(sim, () => (raidersOf(s, r)?.back ?? false) && r.stole > 0, 3 * TICKS_PER_MONTH);
    expect(r.took).toBeGreaterThan(0);
    expect(r.stole).toBeGreaterThan(0);
    expect(s.ledger.now.find((l) => l.kind === 'raid' && l.amount === -r.stole)).toBeDefined();
    ledgerAddsUp(s);
    // (Half of them struck down where they stand.)
    const up = s.army.foes.filter((f) => f.raid === r.id && f.state !== 'fallen');
    for (const f of up.slice(0, Math.ceil(up.length / 2))) f.hp = 0;
    const money = s.money;
    const lostBefore = bookNow(s).now.filter((l) => l.kind === 'lost' && l.what === 'raid:sparta').reduce((a, l) => a + l.n, 0);
    sim.step();
    expect(r.broke).toBe(true);
    expect(r.coinBack).toBeGreaterThan(0);
    expect(r.coinBack).toBeLessThanOrEqual(r.stole);
    expect(s.money).toBeGreaterThanOrEqual(money + r.coinBack - 50);
    expect(s.ledger.now.find((l) => l.kind === 'recovered')?.amount).toBe(r.coinBack);
    expect(r.regained).toBeGreaterThan(0);
    const lost = (): number => bookNow(s).now.filter((l) => l.kind === 'lost' && l.what === 'raid:sparta').reduce((a, l) => a + l.n, 0);
    expect(lost() - lostBefore).toBe(-r.regained);
    ledgerAddsUp(s);
    reopens(s);
    until(sim, () => r.phase === 'homeward', 2 * TICKS_PER_MONTH);
    expect(s.world.news.some((n) => /raiders have gone: \d+ of their \d+ men fell and the rest ran, .* carried off/.test(n.line)), JSON.stringify(s.world.news.slice(-3))).toBe(true);
  }, 120000);
});

describe('fire', () => {
  it('a band let through sets buildings alight on its way, but never the stores or the tax office it came to plunder', () => {
    const { sim, s, r } = battle();
    const plundered = (id: number): boolean => ['granary', 'storehouse', 'taxoffice'].includes(findBuilding(s, id)?.kind ?? '');
    let lit = 0;
    let burning = new Set(s.buildings.filter((b) => b.fire === FIRE_BURNING).map((b) => b.id));
    until(
      sim,
      () => {
        const now = new Set(s.buildings.filter((b) => b.fire === FIRE_BURNING).map((b) => b.id));
        // (A building the band set alight this tick: one burning now that wasn't, as its count of fires goes up.)
        if (r.fires > lit) {
          lit = r.fires;
          const fresh = [...now].filter((id) => !burning.has(id));
          expect(fresh.length).toBeGreaterThan(0);
          for (const id of fresh) expect(plundered(id), findBuilding(s, id)?.kind).toBe(false);
        }
        burning = now;
        return r.phase === 'homeward';
      },
      3 * TICKS_PER_MONTH,
    );
    expect(r.took).toBeGreaterThan(0);
    expect(r.stole).toBeGreaterThan(0);
    expect(r.fires).toBeGreaterThan(0);
    // (Nor the tax office as they come to it: with nothing in it that counts as worth carrying, it was set alight every time.)
    expect(r.fired).toBe(false);
    for (const b of s.buildings) if (b.kind === 'granary' || b.kind === 'taxoffice') expect(b.fire).not.toBe(FIRE_BURNING);
    expect(s.buildings.some((b) => b.kind === 'taxoffice')).toBe(true);
  }, 120000);
});

describe('hirelings', () => {
  it('hired for a fee, they walk in from the edge armed, take nobody from your homes, are paid three times a citizen (a save then opens), and walk off when unpaid', () => {
    const sim = fresh('hirelings');
    const s = sim.state;
    const b = s.buildings.find((x) => x.kind === 'barracks')!;
    const people = s.population;
    const money = s.money;
    send(sim, { type: 'hire', barracks: b.id, kind: 'arcadian' });
    const c = s.army.companies.find((x) => x.hired === 'arcadian')!;
    expect(c).toBeDefined();
    expect(c.kind).toBe('hoplite');
    expect(s.money).toBe(money - HIRELINGS.arcadian.fee);
    expect(s.ledger.now.find((l) => l.kind === 'hirelings')?.amount).toBe(-HIRELINGS.arcadian.fee);
    const men = menOf(s, c);
    expect(men.length).toBe(COMPANY_SIZE);
    for (const x of men) {
      expect(x.home).toBe(0);
      expect(x.armed).toBe(true);
      expect(HIRELINGS.arcadian.from as readonly string[]).toContain(x.house);
    }
    until(sim, () => readyOf(s, c).length === COMPANY_SIZE, 15 * TICKS_PER_DAY);
    expect(readyOf(s, c).length).toBe(COMPANY_SIZE);
    expect(s.population).toBeGreaterThanOrEqual(people - 5);
    // Their pay: three times a citizen's, on the hirelings' line.
    until(sim, () => s.tick % TICKS_PER_MONTH === 1, TICKS_PER_MONTH + 1);
    expect(s.ledger.now.find((l) => l.kind === 'hirelings' && l.what === 'pay')?.amount).toBe(-COMPANY_SIZE * HIRED_PAY);
    ledgerAddsUp(s);
    reopens(s);
    // An empty treasury: a month unpaid, and they walk off.
    s.ledger.start -= s.money + 2000;
    s.money = -2000;
    until(sim, () => !s.army.companies.includes(c), 2 * TICKS_PER_MONTH + 2);
    expect(s.army.companies.includes(c)).toBe(false);
    expect(s.army.news.some((n) => /Arcadian hoplites .* have had no pay for a month/.test(n.line))).toBe(true);
    until(sim, () => !s.army.soldiers.some((x) => x.house && x.home === 0), TICKS_PER_MONTH);
    expect(s.army.soldiers.filter((x) => x.home === 0)).toEqual([]);
  }, 120000);
});

describe('slice 23’s findings', () => {
  it('a company dismissed with pay owed: what it was owed is still paid when money comes', () => {
    const { sim, s, hop } = battle();
    // (Slice 30: with taxes coming in by the satchel, as when this was written; day by day, the first day's taxes pay what is owed at once.)
    send(sim, { type: 'crime', on: false });
    const keep = s.money;
    s.ledger.start -= keep + 100;
    s.money = -100;
    until(sim, () => hop.owed > 0, TICKS_PER_MONTH + 1);
    const owed = hop.owed;
    expect(owed).toBeGreaterThan(0);
    send(sim, { type: 'dismiss', company: hop.id });
    expect(s.army.owed).toBe(owed);
    // (Money comes in: what the dismissed were owed is paid on the soldiers' line.)
    const before = s.ledger.now.filter((l) => l.kind === 'soldiers').reduce((a, l) => a + l.amount, 0);
    s.ledger.start += keep + 5000;
    s.money += keep + 5000;
    until(sim, () => s.army.owed === 0, TICKS_PER_MONTH + 1);
    expect(s.army.owed).toBe(0);
    const after = s.ledger.now.filter((l) => l.kind === 'soldiers').reduce((a, l) => a + l.amount, 0);
    expect(after).toBeLessThanOrEqual(before - owed);
    ledgerAddsUp(s);
  }, 120000);

  it('a barracks with no road beside it says so, not that no home can spare a man', () => {
    const sim = fresh('richtown');
    const s = sim.state;
    s.money += 5000;
    s.ledger.start += 5000;
    let at = -1;
    for (let z = 20; z < N - 20 && at < 0; z++) {
      for (let x = 20; x < N - 20 && at < 0; x++) {
        if (buildingRefusal(sim.map, s, 'barracks', x, z) !== '') continue;
        let road = false;
        for (let dz = -1; dz <= 4; dz++) for (let dx = -1; dx <= 4; dx++) if (s.tiles[(z + dz) * N + x + dx] === TILE_ROAD) road = true;
        if (!road) at = z * N + x;
      }
    }
    expect(at).toBeGreaterThan(0);
    send(sim, { type: 'build', kind: 'barracks', at: [at] });
    const b = s.buildings.find((x) => x.kind === 'barracks')!;
    expect(b).toBeDefined();
    send(sim, { type: 'raise', barracks: b.id, kind: 'archer' });
    const c = s.army.companies.find((x) => x.barracks === b.id)!;
    sim.run(2 * TICKS_PER_DAY);
    expect(c.why).toMatch(/needs a road beside it/);
  }, 120000);
});

describe('saves and determinism', () => {
  it('the same battle twice comes out the same; a save mid-battle plays on the same', () => {
    const a = battle();
    const b = battle();
    for (const x of [a, b]) {
      send(x.sim, { type: 'banner', company: x.hop.id, tile: HOLD_HOP });
      send(x.sim, { type: 'banner', company: x.arc.id, tile: HOLD_ARC });
    }
    until(a.sim, () => a.s.army.foes.some((f) => f.state === 'fight'), 3 * TICKS_PER_MONTH);
    expect(a.s.army.foes.some((f) => f.state === 'fight')).toBe(true);
    b.sim.run(a.s.tick - b.s.tick);
    expect(serialize(b.s)).toBe(serialize(a.s));
    const got = decodeSave(encodeSave(a.s, 1));
    if (!got.ok) throw new Error(got.why);
    const copy = new Sim();
    copy.state = got.file.state;
    for (const n of [40, 300]) {
      a.sim.run(n);
      copy.run(n);
      expect(serialize(copy.state)).toBe(serialize(a.s));
    }
  }, 120000);

  it('a slice 23 save (version 22, a company on the march) loads with no raiders on the army’s books, and plays on', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/slice23-companies.save.json.gz')).toString();
    expect(JSON.parse(text).state.version).toBe(22);
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    const s = got.file.state;
    expect(s.version).toBe(SIM_STATE_VERSION);
    expect(s.army.foes).toEqual([]);
    expect(s.army.arrows).toEqual([]);
    expect(s.army.owed).toBe(0);
    expect(s.army.companies.map((c) => c.order)).toEqual(['march', 'drill']);
    for (const c of s.army.companies) {
      expect(c.hired).toBe('');
      expect(c.routed).toBe(false);
    }
    for (const x of s.army.soldiers) expect(x.foe).toBe(0);
    const sim = new Sim();
    sim.state = s;
    sim.run(TICKS_PER_MONTH);
    expect(s.army.companies[0].order).toBe('hold');
    expect(decodeSave(encodeSave(s, 1)).ok).toBe(true);
  }, 60000);
});
