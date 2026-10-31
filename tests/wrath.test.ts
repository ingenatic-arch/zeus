/**
 * Wrath (slice 57): no omen before the city is noticed or with wrath's switch
 * off; an angry god's omen a month ahead, naming the god, the curse, the day
 * and the reasons; one omen at a time; turned when the god is lifted past
 * angry (and never landing then); a curse never lands before its omen's
 * month; every curse lands on a prepared town and does what it says;
 * determinism; the migration and a save round-trip.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import { bake } from '../scripts/bake';
import { decodeSave, encodeSave } from '../src/game/saves';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { migrate } from '../src/sim/migrate';
import { curseNow, godCrime, godMood, godPace, honour, moodOfGod, type CurseId } from '../src/sim/pantheon';
import { SIM_STATE_VERSION, type SimState } from '../src/sim/state';
import { worship } from '../src/sim/worship';
import { beginOmen, CURSES, GOD_CURSES, OMEN_LEAD, omenOf, stepWrath } from '../src/sim/wrath';
import { demoSim } from './prepared';
import { TRADE_TICKS } from '../src/sim/routes';
// Merge of slice 57 with the trunk.
import { breakNow } from '../src/sim/battle';
import { raidersOf } from '../src/sim/raids';
import { CURSE_CLEAR, marchOf } from '../src/sim/godwar';
import { courtyard, heroOf, sendRefusal } from '../src/sim/heroes';
import { heroAnswer, marchingWith, WAR_CLEAR } from '../src/sim/wrath';
import { beside as besideTiles, findBuilding } from '../src/sim/buildings';
import { buildingRefusal } from '../src/sim/build';
import { totals } from '../src/sim/treasury';
import { TILE_ROAD, TILE_WALL, type Raid } from '../src/sim/state';
import type { GodFigure } from '../src/sim/epiphany';

/** Tiles a hero's hall could stand on, beside a road, nearest the map's middle first. */
function hallSpots(sim: Sim): number[] {
  const n = sim.map.size;
  const s = sim.state;
  const out: Array<[number, number]> = [];
  for (let t = 0; t < n * n; t++) {
    const x = t % n;
    const z = Math.floor(t / n);
    if (buildingRefusal(sim.map, s, 'herohall', x, z) === '' && besideTiles(n, x, z, 4).some((u) => s.tiles[u] === TILE_ROAD)) out.push([t, Math.hypot(x - n / 2, z - n / 2)]);
  }
  return out.sort((a, b) => a[1] - b[1] || a[0] - b[0]).slice(0, 40).map(([t]) => t);
}

const wrathOf = (s: SimState) => s.gods.wrath;
const said = (s: SimState, from: number) => s.messages.log.filter((m) => m.id >= from && m.kind === 'wrath');

/** #richtown, the gods and their wrath on (it is noticed: about 900 people). */
function rich() {
  const sim = demoSim('richtown');
  sim.enqueue({ type: 'gods', on: true });
  sim.enqueue({ type: 'wrath', on: true });
  sim.flush();
  return sim;
}

describe('omens', () => {
  it('an angry god warns a month ahead, naming the curse, the day and the reasons', () => {
    const sim = rich();
    const s = sim.state;
    const m0 = s.messages.next;
    honour(s, 'athena', -45, 'staged', 'you laughed at her owl', 0);
    sim.run(2 * TICKS_PER_DAY);
    const o = omenOf(s, 'athena')!;
    expect(o).toBeTruthy();
    expect(GOD_CURSES.athena).toContain(o.curse);
    expect(o.day - o.at).toBe(OMEN_LEAD);
    const m = said(s, m0)[0];
    expect(m.u).toBe(2);
    expect(m.words).toContain('Athena is angry');
    expect(m.words).toContain('you laughed at her owl');
    expect(m.words).toMatch(/in a month/);
    expect(wrathOf(s).omens).toHaveLength(1);
  });

  it('nothing with wrath’s switch off, before the city is noticed, or for a god above angry', () => {
    const sim = rich();
    const s = sim.state;
    honour(s, 'zeus', -25, 'staged', 'displeased only', 0);
    sim.run(3 * TICKS_PER_DAY);
    expect(wrathOf(s).omens).toHaveLength(0);
    sim.enqueue({ type: 'wrath', on: false });
    sim.flush();
    honour(s, 'zeus', -30, 'staged', 'furious now', 0);
    sim.run(3 * TICKS_PER_DAY);
    expect(wrathOf(s).omens).toHaveLength(0);
    sim.enqueue({ type: 'wrath', on: true });
    sim.flush();
    s.gods.noticedAt = -1;
    s.population = 100;
    stepWrath(s, sim.map, () => undefined);
    expect(wrathOf(s).omens).toHaveLength(0);
  });

  it('one omen at a time in the city', () => {
    const sim = rich();
    const s = sim.state;
    honour(s, 'athena', -50, 'staged', 'angry', 0);
    honour(s, 'demeter', -50, 'staged', 'angry', 0);
    sim.run(5 * TICKS_PER_DAY);
    expect(wrathOf(s).omens).toHaveLength(1);
  });

  it('lifted past angry, the god is appeased and the curse never lands', () => {
    const sim = rich();
    const s = sim.state;
    honour(s, 'demeter', -35, 'staged', 'angry', 0);
    sim.run(2 * TICKS_PER_DAY);
    expect(omenOf(s, 'demeter')?.curse).toBe('blight');
    const m0 = s.messages.next;
    worship(s, 'demeter', 15, 'festival', 'your festival to Demeter', TICKS_PER_MONTH * 12);
    expect(moodOfGod(s, 'demeter')).toBeGreaterThanOrEqual(-30);
    sim.run(2 * TICKS_PER_DAY);
    expect(omenOf(s, 'demeter')).toBeUndefined();
    expect(said(s, m0).map((m) => m.title)).toContain('Demeter is appeased');
    sim.run(OMEN_LEAD + 5 * TICKS_PER_DAY);
    expect(curseNow(s, 'blight')).toBeUndefined();
  });

  it('a festival announced in the omen’s month turns it at once, though it begins a month later (review of slice 57)', () => {
    const sim = demoSim('omen');
    const s = sim.state;
    expect(omenOf(s, 'athena')).toBeTruthy();
    const shrine = s.buildings.find((b) => b.kind === 'shrine' && b.god === 'athena')!;
    const m0 = s.messages.next;
    sim.enqueue({ type: 'festival', id: shrine.id });
    sim.flush();
    expect(s.gods.festivals.some((f) => f.god === 'athena')).toBe(true);
    sim.run(2 * TICKS_PER_DAY);
    expect(omenOf(s, 'athena')).toBeUndefined();
    expect(said(s, m0).find((m) => m.title === 'Athena is appeased')?.words).toMatch(/by the festival you announced/);
    sim.run(OMEN_LEAD);
    expect(s.legends.monsters.some((m) => m.kind === 'medusa')).toBe(false);
  });

  it('an offering turns it as soon as it sets out, however far its porter walks (review of slice 57)', () => {
    const sim = demoSim('omen');
    const s = sim.state;
    const shrine = s.buildings.find((b) => b.kind === 'shrine' && b.god === 'athena')!;
    const m0 = s.messages.next;
    sim.enqueue({ type: 'offer', id: shrine.id });
    sim.flush();
    expect(s.walkers.some((w) => w.kind === 'offering')).toBe(true);
    // (Merge of slice 57: #omen's Athena is staged at −36 now, and drifts to −34 by herself on her third day: the offering's
    //  +4 lifts her past angry then, its porter still far from the shrine.)
    sim.run(4 * TICKS_PER_DAY);
    expect(omenOf(s, 'athena')).toBeUndefined();
    expect(s.walkers.some((w) => w.kind === 'offering')).toBe(true);
    expect(said(s, m0).find((m) => m.title === 'Athena is appeased')?.words).toMatch(/by the offering on its way/);
  });

  it('a curse never lands before its month is out', () => {
    const sim = rich();
    const s = sim.state;
    honour(s, 'demeter', -50, 'staged', 'angry', 0);
    sim.run(TICKS_PER_DAY);
    const o = omenOf(s, 'demeter')!;
    sim.run(o.day - s.tick - TICKS_PER_DAY);
    expect(curseNow(s, 'blight')).toBeUndefined();
    sim.run(2 * TICKS_PER_DAY);
    expect(curseNow(s, 'blight')).toBeTruthy();
    expect(godPace(s, 'farm')).toBeLessThan(1);
  });
});

describe('curses', () => {
  const checks: Partial<Record<CurseId, (s: SimState, before: SimState) => void>> = {
    lightning: (s) => expect(s.buildings.filter((b) => b.fire === 2).length).toBeGreaterThan(0),
    earthquake: (s, b) => expect(s.buildings.filter((x) => x.kind === 'rubble').length).toBeGreaterThan(b.buildings.filter((x) => x.kind === 'rubble').length),
    quarrels: (s, b) => expect(s.left).toBeGreaterThan(b.left),
    heartbreak: (s, b) => {
      expect(s.left).toBeGreaterThan(b.left);
      expect(godMood(s)?.w).toBe(-2);
    },
    blight: (s) => expect(godPace(s, 'farm')).toBe(0.25),
    olives: (s) => expect(godPace(s, 'grove')).toBe(0),
    plague: (s) => expect(s.health.outbreak).toBeTruthy(),
    herds: (s, b) => expect(s.herds.reduce((a, h) => a + h.head, 0)).toBeLessThan(b.herds.reduce((a, h) => a + h.head, 0)),
    forge: (s) => expect(s.buildings.filter((b) => b.fire === 2).length).toBeGreaterThan(0),
    thieves: (s) => expect(godCrime(s)).toBe(2),
    riot: (s, b) => expect(s.crime.broken.length).toBeGreaterThan(b.crime.broken.length),
    shipwreck: (s) => expect(curseNow(s, 'shipwreck')).toBeTruthy(),
  };
  for (const c of Object.keys(CURSES) as CurseId[]) {
    it(`${c} lands, says what it did, and does it`, () => {
      const sim = rich();
      const s = sim.state;
      const C = CURSES[c];
      honour(s, C.god, -50, 'staged', 'angry', 0);
      const o = beginOmen(s, sim.map, C.god, c, 3 * TICKS_PER_DAY);
      // (Brawls want a barracks, and the caravans a caravan yard, which #richtown hasn't: they can't be aimed there.)
      if (c === 'brawls' || c === 'caravans') {
        expect(o).toBeNull();
        return;
      }
      expect(o).toBeTruthy();
      const before = structuredClone(s);
      const m0 = s.messages.next;
      sim.run(4 * TICKS_PER_DAY);
      expect(omenOf(s, C.god)).toBeUndefined();
      const landed = said(s, m0).find((m) => (m.title ?? '').endsWith('wrath'));
      expect(landed?.words.length ?? 0).toBeGreaterThan(20);
      if (C.monster) expect(s.legends.monsters.some((m) => m.kind === C.monster)).toBe(true);
      checks[c]?.(s, before);
      expect(s.ledger.start + s.ledger.now.reduce((a, l) => a + l.amount, 0)).toBe(s.money);
    });
  }
});

describe('ships and caravans lost (review of slice 57)', () => {
  it('under Poseidon’s storms the merchant ship sailing for your quay is lost, and said; after the season she comes again', () => {
    const sim = rich();
    const s = sim.state;
    honour(s, 'poseidon', -50, 'staged', 'angry', 0);
    expect(beginOmen(s, sim.map, 'poseidon', 'shipwreck', 2 * TICKS_PER_DAY)).toBeTruthy();
    const m0 = s.messages.next;
    sim.run(3 * TICKS_PER_DAY);
    // (She was already in the bay as it landed: she trades. Every ship that sets sail after it is lost.)
    sim.run(TICKS_PER_MONTH);
    const v = s.trade.ship.visits;
    sim.run(2 * TICKS_PER_MONTH - 5 * TICKS_PER_DAY);
    expect(curseNow(s, 'shipwreck')).toBeTruthy();
    expect(s.trade.ship.visits).toBe(v);
    expect(said(s, m0).map((m) => m.title)).toContain('The merchant ship is lost');
    expect(s.ledger.start + s.ledger.now.reduce((a, l) => a + l.amount, 0)).toBe(s.money);
    sim.run(10 * TICKS_PER_DAY);
    expect(curseNow(s, 'shipwreck')).toBeUndefined();
  });

  it('under Hermes’s robbers every caravan on its way to you is lost, and said', () => {
    const sim = demoSim('buywine');
    const s = sim.state;
    sim.enqueue({ type: 'gods', on: true });
    sim.enqueue({ type: 'wrath', on: true });
    sim.flush();
    honour(s, 'hermes', -50, 'staged', 'angry', 0);
    expect(beginOmen(s, sim.map, 'hermes', 'caravans', 2 * TICKS_PER_DAY)).toBeTruthy();
    const m0 = s.messages.next;
    // (A caravan already in your streets as it lands still trades: every one that comes to your map's edge after it is lost.)
    sim.run(3 * TICKS_PER_DAY + 2 * TRADE_TICKS);
    const visits = s.world.routes.map((r) => r.visits);
    sim.run(3 * TICKS_PER_MONTH - 3 * TICKS_PER_DAY - 2 * TRADE_TICKS - TICKS_PER_DAY);
    expect(curseNow(s, 'caravans')).toBeTruthy();
    expect(s.world.routes.map((r) => r.visits)).toEqual(visits);
    expect(said(s, m0).filter((m) => m.title === 'A caravan is lost').length).toBeGreaterThan(0);
  });
});

describe('determinism and saves', () => {
  it('the same town and anger choose the same curse, aim and day, and land the same', () => {
    const run = () => {
      const sim = rich();
      honour(sim.state, 'poseidon', -50, 'staged', 'angry', 0);
      sim.run(2 * TICKS_PER_DAY);
      const o = { ...omenOf(sim.state, 'poseidon')! };
      sim.run(OMEN_LEAD + 2 * TICKS_PER_DAY);
      return { o, people: sim.state.population, money: sim.state.money, n: sim.state.buildings.length, tiles: sim.state.tiles.join(',') };
    };
    expect(run()).toEqual(run());
  });

  it('a state from before slice 57 gets its record of wrath, on with the gods', () => {
    const sim = rich();
    const st = JSON.parse(JSON.stringify(sim.state));
    delete st.gods.wrath;
    // (Slice 57 is version 55, hooked at 54: named, so a later slice's merge can't move it.)
    st.version = 54;
    expect(migrate(st)).toBe(54);
    expect(st.version).toBe(SIM_STATE_VERSION);
    expect(st.gods.wrath).toEqual({ on: true, omens: [], spells: [], asked: {}, given: {}, cursed: {} });
  });

  it('a groundwork save (state 48) and a phase 6 save (state 47) load, wrath on with the gods, and play on', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/groundwork-town.save.json.gz')).toString();
    for (const strip of [false, true]) {
      let t = text;
      if (strip) {
        const file = JSON.parse(t);
        expect(file.state.version).toBe(48);
        delete file.state.gods;
        file.state.version = 47;
        t = JSON.stringify(file);
      }
      const got = decodeSave(t);
      if (!got.ok) throw new Error(got.why);
      const s = got.file.state;
      expect(s.version).toBe(SIM_STATE_VERSION);
      expect(s.gods.wrath).toEqual({ on: s.gods.on, omens: [], spells: [], asked: {}, given: {}, cursed: {} });
      const sim = new Sim();
      sim.state = s;
      sim.run(TICKS_PER_MONTH);
      expect(s.gods.wrath.omens).toHaveLength(0);
    }
  });

  it('the three demos keep as saves (a god come in wrath too), and a broken record of wrath is refused plainly', () => {
    for (const n of ['omen', 'blessing', 'wrath']) expect(bake(n), n).toBeTruthy();
    const file = JSON.parse(bake('wrath')!);
    const st = decodeSave(JSON.stringify(file));
    expect(st.ok && st.file.state.gods.walks.figures.some((f) => f.why === 'wrath')).toBe(true);
    const sim = rich();
    honour(sim.state, 'athena', -50, 'staged', 'angry', 0);
    beginOmen(sim.state, sim.map, 'athena', 'medusa');
    const broken = JSON.parse(JSON.stringify(sim.state));
    broken.gods.wrath.omens[0].curse = 'locusts';
    const d = decodeSave(encodeSave(broken, 0));
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.why).toMatch(/blessings and wrath/);
  }, 1200000);

  it('a save round-trip keeps an omen running and a curse in force', () => {
    const sim = rich();
    const s = sim.state;
    honour(s, 'hermes', -50, 'staged', 'angry', 0);
    beginOmen(s, sim.map, 'hermes', 'thieves', 2 * TICKS_PER_DAY);
    sim.run(3 * TICKS_PER_DAY);
    honour(s, 'athena', -50, 'staged', 'angry', 0);
    beginOmen(s, sim.map, 'athena', 'olives');
    const d = decodeSave(encodeSave(s, 0));
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.file.state.gods.wrath).toEqual(s.gods.wrath);
    expect(curseNow(d.file.state, 'thieves')).toBeTruthy();
  });
});

// Merge of slice 57 with the trunk: wrath meets the gods in war (slice 60) and the heroes (slice 59).
describe('wrath and the rest, at the merge', () => {
  const step = (sim: Sim, ok: () => boolean, most: number): boolean => {
    for (let i = 0; i < most && !ok(); i++) sim.step();
    return ok();
  };
  /** #battle: Sparta's band on the road to the west edge; Ares (Sparta's patron) staged furious, so he marches with it. */
  const battle = () => {
    const sim = demoSim('battle');
    const s = sim.state;
    honour(s, 'ares', -75, 'staged', 'you paid tribute to Athens', 0);
    const r = s.world.raids.find((x) => x.city === 'sparta' && x.ended === 0)!;
    return { sim, s, r };
  };
  const ares = (s: SimState) => s.gods.walks.figures.filter((f) => f.god === 'ares');

  it('a god marching with a band holds their curse, said, until a week after the band has gone; it lands then', () => {
    const { sim, s, r } = battle();
    const m0 = s.messages.next;
    const o = beginOmen(s, sim.map, 'ares', 'brawls', 2 * TICKS_PER_DAY)!;
    expect(o).toBeTruthy();
    expect(step(sim, () => !!marchOf(s, r.id), 2 * TICKS_PER_DAY)).toBe(true);
    // Its day comes and goes while he marches: it waits, said once.
    sim.run(5 * TICKS_PER_DAY);
    expect(omenOf(s, 'ares')).toBe(o);
    expect(o.held).toBeGreaterThan(0);
    expect(o.day - s.tick).toBeGreaterThanOrEqual(WAR_CLEAR - TICKS_PER_DAY);
    const waits = said(s, m0).filter((x) => /^Ares marches with Sparta’s raiders against you, and his curse waits for them/.test(x.words));
    expect(waits).toHaveLength(1);
    expect(marchingWith(s, 'ares')).toBe('Sparta’s raiders');
    // The band on your map, then broken: he goes home with it; the curse comes a week after, said.
    expect(step(sim, () => r.phase === 'raiding' && !!raidersOf(s, r), 60 * TICKS_PER_DAY)).toBe(true);
    expect(omenOf(s, 'ares')).toBe(o);
    breakNow(s, sim.map, r, 'for the test');
    expect(step(sim, () => s.gods.war.marches.length === 0, 10 * TICKS_PER_DAY)).toBe(true);
    const gone = s.tick;
    expect(step(sim, () => !omenOf(s, 'ares'), 3 * WAR_CLEAR)).toBe(true);
    expect(s.tick - gone).toBeGreaterThanOrEqual(WAR_CLEAR - TICKS_PER_DAY);
    const after = said(s, m0);
    expect(after.some((x) => /^The band Ares marched with is gone, and he turns back to his curse/.test(x.words))).toBe(true);
    expect(after[after.length - 1].title).toBe('Ares’s wrath');
  }, 600_000);

  it('one figure per god: a god in wrath leaves the place for the band, and rises with it only once gone', () => {
    const { sim, s, r } = battle();
    // (Staged: Ares standing in wrath over the town's heart, his curse eight days off, as wrath.ts would have him, as the band
    //  calls on him.)
    const o = beginOmen(s, sim.map, 'ares', 'lightning', 8 * TICKS_PER_DAY)!;
    expect(o).toBeTruthy();
    const b = s.buildings.find((x) => x.kind === 'agora') ?? s.buildings[0];
    const f: GodFigure = { id: s.gods.walks.next++, god: 'ares', x: b.x + 1, z: b.z + 1, px: b.x + 1, pz: b.z + 1, heading: 0, state: 'blessing', since: s.tick, why: 'wrath', words: 'he has come in wrath', stops: [{ id: b.id, x: b.x + 1, z: b.z + 1 }], at: 0, came: s.tick, leaves: o.day + 6 * TICKS_PER_DAY, blessed: [] };
    s.gods.walks.figures.push(f);
    o.figure = f.id;
    expect(step(sim, () => !!marchOf(s, r.id), 2 * TICKS_PER_DAY)).toBe(true);
    let most = 0;
    let risen = false;
    for (let i = 0; i < 60 * TICKS_PER_DAY && !risen; i++) {
      sim.step();
      most = Math.max(most, ares(s).length);
      const m = marchOf(s, r.id);
      risen = !!m && m.figure > 0;
    }
    expect(most).toBe(1);
    expect(o.figure).toBe(0);
    expect(s.gods.walks.figures.some((x) => x.id === f.id)).toBe(false);
  }, 600_000);

  it('a god whose curse has just landed rises with a band no sooner than a week after', () => {
    const risen = (s: SimState, r: Raid): boolean => (marchOf(s, r.id)?.figure ?? 0) > 0;
    // When Ares would rise with the band...
    const a = battle();
    const t0 = a.s.tick;
    expect(step(a.sim, () => risen(a.s, a.r), 90 * TICKS_PER_DAY)).toBe(true);
    const plain = a.s.tick - t0;
    // ...and the same town with his curse landing a day before that: he waits the week out.
    const b = battle();
    for (let i = 0; i < plain - TICKS_PER_DAY; i++) b.sim.step();
    expect(risen(b.s, b.r)).toBe(false);
    b.s.gods.wrath.cursed.ares = b.s.tick;
    const tc = b.s.tick;
    expect(step(b.sim, () => risen(b.s, b.r), 30 * TICKS_PER_DAY)).toBe(true);
    expect(b.s.tick - tc).toBeGreaterThanOrEqual(CURSE_CLEAR);
  }, 900_000);

  it('a monster’s omen says which hero could answer, and its landing whether a hero of yours can reach the lair', () => {
    const sim = rich();
    const s = sim.state;
    expect(heroAnswer(s, 'medusa')).toBe('Only a hero can slay Medusa: raise a hall to Perseus or Heracles and meet what they ask.');
    // Perseus come to a hall (staged, as #herogod's).
    s.money = Math.max(s.money, 5000);
    s.ledger.start = s.money - totals(s.ledger.now).net;
    sim.enqueue({ type: 'herohall', hero: 'perseus', at: hallSpots(sim) });
    sim.flush();
    const c = heroOf(s, 'perseus')!;
    expect(c).toBeTruthy();
    const hall = findBuilding(s, c.hall)!;
    [c.x, c.z] = courtyard(hall);
    Object.assign(c, { state: 'home', came: s.tick, word: s.tick, by: 'road', wish: s.tick, next: s.tick + 99 * TICKS_PER_DAY });
    honour(s, 'athena', -45 - moodOfGod(s, 'athena'), 'staged', 'angry', 0);
    const m0 = s.messages.next;
    const o = beginOmen(s, sim.map, 'athena', 'medusa', 2 * TICKS_PER_DAY)!;
    expect(said(s, m0)[0].words).toMatch(/Only a hero can slay Medusa, and Perseus lives in your city and could answer it\.$/);
    // (Staged: a ring of wall round the lair she is coming to, three tiles out, with no gate.)
    const n = sim.map.size;
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) if (Math.max(Math.abs(dx), Math.abs(dz)) === 3) s.tiles[(Math.floor(o.z) + dz) * n + Math.floor(o.x) + dx] = TILE_WALL;
    s.rev++;
    expect(step(sim, () => s.legends.monsters.some((x) => x.kind === 'medusa'), 4 * TICKS_PER_DAY)).toBe(true);
    const beast = s.legends.monsters.find((x) => x.kind === 'medusa')!;
    const landed = said(s, m0).pop()!;
    expect(landed.words).toMatch(/Only a hero can slay her, but Perseus can’t reach her lair on foot: walls, buildings or water stand in the way\.$/);
    // And the hall's Send button says so too, once she has settled.
    expect(step(sim, () => beast.state === 'lair', 3 * TICKS_PER_MONTH)).toBe(true);
    expect(sendRefusal(s, 'perseus', beast.id)).toMatch(/^Perseus can’t reach Medusa’s .* on foot: walls, buildings or water stand in the way$/);
  }, 600_000);
});
