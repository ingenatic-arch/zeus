/**
 * Saving and loading: a town saved mid-everything carries on exactly as if it
 * had never been saved, and a save that can't be read (another version,
 * damaged, missing a field, no storage at all) says so plainly and never
 * throws.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { decodeSave, encodeSave, packRuns, packTables, SAVE_FORMAT, SafeStorage, Saves, unpackRuns, unpackTables, type KeyValueStore } from '../src/game/saves';
import { coastMap } from '../src/map/bake';
import { TICKS_PER_MONTH } from '../src/sim/clock';
import { townLines } from '../src/sim/status';
import { FAIR } from '../src/sim/taxes';
import { BAY } from '../src/map/lands';
import { serialize, Sim } from '../src/sim/sim';
import { OLDEST_READABLE } from '../src/sim/migrate';
import { SIM_STATE_VERSION, type SimState } from '../src/sim/state';
import { demoSim } from './prepared';

const T = (x: number, z: number): number => z * BAY.size + x;

const demo = (name: string): Sim => {
  const sim = demoSim(name);
  return sim;
};

/** An in-memory store, optionally refusing writes the way a full one does. */
class Memory implements KeyValueStore {
  data = new Map<string, string>();
  full = false;
  getItem(k: string): string | null {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    if (this.full && k !== 'zeus-remake.probe') {
      const e = new Error('The quota has been exceeded.');
      e.name = 'QuotaExceededError';
      throw e;
    }
    this.data.set(k, v);
  }
  removeItem(k: string): void {
    this.data.delete(k);
  }
}

/** A save as envelope 1 wrote it: the state as it is, nothing packed. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const plainFile = (s: SimState): { format: string; save: number; savedAt: number; state: Record<string, any> } => ({ format: SAVE_FORMAT, save: 1, savedAt: 3, state: JSON.parse(JSON.stringify(s)) });

/** Save through the whole envelope and load back into a fresh Sim. */
function reload(a: Sim): Sim {
  const got = decodeSave(encodeSave(a.state, 1000, { x: 1, z: 2, yaw: 0.5, dist: 30, tilt: 0 }));
  if (!got.ok) throw new Error(got.why);
  const b = new Sim();
  b.state = got.file.state;
  return b;
}

describe('a save carries on identically', () => {
  it('in #closed: homes warned about two needs at once, every walker out, an undo waiting', () => {
    const a = demo('closed');
    // An action to undo, made just before saving.
    a.enqueue({ type: 'road', tiles: [T(25, 74)] });
    a.flush();
    expect(a.state.undo.length).toBeGreaterThan(0);
    let t = 0;
    while (!['water', 'food', 'priestess'].every((k) => a.state.walkers.some((w) => w.kind === k && w.steps > 2))) {
      a.step();
      expect(++t).toBeLessThan(3000);
    }
    const b = reload(a);
    expect(serialize(b.state)).toEqual(serialize(a.state));
    // The undo survives the load and does the same thing afterwards.
    for (const sim of [a, b]) {
      sim.enqueue({ type: 'undo' });
      sim.run(1200);
    }
    expect(serialize(b.state)).toEqual(serialize(a.state));
  });

  it('in #town with a tax collector out with coins in his satchel and wages owed at some workplaces', () => {
    const a = demo('dry');
    // Taxes back at fair: the collectors fill their satchels before the owed wages are paid.
    a.enqueue({ type: 'tax', rate: FAIR });
    let t = 0;
    while (!a.state.walkers.some((w) => w.kind === 'tax' && w.purse.length > 0)) {
      a.step();
      expect(++t).toBeLessThan(600);
    }
    expect(a.state.buildings.some((b) => b.owed > 0)).toBe(true);
    const b = reload(a);
    expect(serialize(b.state)).toEqual(serialize(a.state));
    a.run(1500);
    b.run(1500);
    expect(serialize(b.state)).toEqual(serialize(a.state));
  });

  it('in #hirelings, once the Cretan archers have been hired and paid (their fee and pay are ledger lines of their own)', () => {
    const a = demo('hirelings');
    const barracks = a.state.buildings.find((x) => x.kind === 'barracks');
    if (!barracks) throw new Error('no barracks');
    a.enqueue({ type: 'hire', barracks: barracks.id, kind: 'cretan' });
    a.run(2 * TICKS_PER_MONTH);
    expect([...a.state.ledger.now, ...a.state.ledger.last].some((l) => l.kind === 'hirelings')).toBe(true);
    const b = reload(a);
    a.run(600);
    b.run(600);
    expect(serialize(b.state)).toEqual(serialize(a.state));
  });

  it('in #town: a few hundred people, every kind of building and walker', () => {
    const a = demo('town');
    a.run(37);
    const b = reload(a);
    a.run(1500);
    b.run(1500);
    expect(serialize(b.state)).toEqual(serialize(a.state));
  });
});

describe('saves from before', () => {
  const text = gunzipSync(readFileSync('tests/fixtures/phase1-food.save.json.gz')).toString();

  it('a phase 1 save (state version 6, rent and all) loads: rent is gone, taxes are fair, no tax office yet, and it plays on', () => {
    expect(JSON.parse(text).state.version).toBe(6);
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    expect(got.file.from).toBe(6);
    const st = got.file.state;
    expect(st.version).toBe(SIM_STATE_VERSION);
    expect((st as unknown as Record<string, unknown>).rent).toBeUndefined();
    expect(st.taxRate).toBe(FAIR);
    expect(st.ledger.start).toBe(st.money);
    expect(st.rounds.tax.walked.length).toBe(BAY.size * BAY.size);
    expect(st.buildings.every((b) => b.owed === 0 && b.taxedAt === 0)).toBe(true);
    expect(st.walkers.every((w) => Array.isArray(w.purse))).toBe(true);
    const sim = new Sim();
    sim.state = st;
    const before = st.money;
    sim.run(2 * TICKS_PER_MONTH);
    // Wages go out and nothing comes in until a tax office is built: the money line says so.
    expect(st.money).toBeLessThan(before);
    expect(townLines(st, coastMap()).find((l) => l.need === 'money')?.text).toMatch(/no taxes come in without a tax office/);
    // Saved again, it is a save of this version, and carries on the same.
    const again = new Sim();
    const r = decodeSave(encodeSave(st, 2));
    if (!r.ok) throw new Error(r.why);
    expect(r.file.from).toBeUndefined();
    again.state = r.file.state;
    sim.run(600);
    again.run(600);
    expect(serialize(again.state)).toEqual(serialize(sim.state));
  });

  it('the save menu lists a phase 1 save as one it can open', () => {
    const store = new Memory();
    store.setItem('zeus-remake.save.manual', text);
    const saves = new Saves(new SafeStorage(() => store));
    const info = saves.info('manual');
    expect(info?.why).toBe('');
    expect(saves.newest()).toBe('manual');
  });

  it('a save written before round records were packed (envelope 1), or before lists of records were (envelope 2), still opens', () => {
    const s = demo('food').state;
    const r = decodeSave(JSON.stringify(plainFile(s)));
    if (!r.ok) throw new Error(r.why);
    expect(serialize(r.file.state)).toEqual(serialize(s));
    const two = plainFile(s);
    two.save = 2;
    const rounds: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(s.rounds)) rounds[k] = { walked: packRuns(v.walked), exits: packRuns(v.exits) };
    two.state.rounds = rounds;
    const r2 = decodeSave(JSON.stringify(two));
    if (!r2.ok) throw new Error(r2.why);
    expect(serialize(r2.file.state)).toEqual(serialize(s));
  });

  it('envelope 3 packs every list of records as rows against a table of key lists, losslessly, and the tiles as runs: #town saves in about half the space of slice 13 (258 KB)', () => {
    const s = demo('town').state;
    const text = encodeSave(s, 4);
    // (Slice 31: Greece's eleven cities, with what moved their people, wealth and arms, add about 10 KB.)
    // (Slice 33 at the merge: #town opens 15 days later and keeps the seasons' record: 175,210 characters then.)
    // (The crews of walkers: three water carriers, food vendors and the rest out at once, each with her trail: 183,450.)
    // (Slice 51: the annals, a figure for each of the last two years' months, add about 3,300 characters: 192,911.)
    // (Slice 49: each building's health and physician's call, and the physicians' crews: 190,511.)
    // (Slice 49 at the merge, with slice 51's annals: 194,232, after leaving a month's health figures out when it had none.
    //  Leaving the buildings' health and physician out at 0 made it bigger, not smaller: each building left without them is
    //  a second shape with every key. So the budget goes up once, by the least that holds it.)
    expect(text.length).toBeLessThan(194_500);
    const f = JSON.parse(text);
    expect(f.save).toBe(3);
    expect(Object.keys(f.state.buildings)).toEqual(['$rows']);
    const r = decodeSave(text);
    if (!r.ok) throw new Error(r.why);
    // The same keys in the same order come back.
    expect(JSON.stringify(r.file.state)).toEqual(JSON.stringify(s));
    expect(packTables([], [], new Map())).toEqual([]);
    const shapes: string[][] = [];
    const v = [{ a: 1, b: [{ c: 'x' }, { d: null }] }, { b: [], a: 2 }];
    expect(unpackTables(packTables(v, shapes, new Map()), shapes)).toEqual(v);
    expect(shapes.length).toBe(4);
    // A row that doesn't fit its key list, or a missing table, is refused as damaged.
    for (const brk of [(g: any) => g.state.buildings.$rows[0].pop(), (g: any) => delete g.shapes, (g: any) => (g.state.tiles = [0, 5])]) {
      const g = JSON.parse(text);
      brk(g);
      const bad = decodeSave(JSON.stringify(g));
      expect(bad.ok).toBe(false);
      if (!bad.ok) expect(bad.why).toMatch(/damaged/);
    }
  });

  it('a #harsh save from slice 13 (state version 12, envelope 2) loads, plays on under the new harsh rules, and saves again identically', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/slice13-harsh.save.json.gz')).toString();
    const raw = JSON.parse(text);
    expect([raw.save, raw.state.version, raw.state.taxRate]).toEqual([2, 12, 4]);
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    expect(got.file.from).toBe(12);
    const st = got.file.state;
    expect(st.version).toBe(SIM_STATE_VERSION);
    expect(st.taxGone).toEqual([]);
    // The stock book (version 14) starts empty in the month it was loaded, and fills in as it plays.
    expect(st.stocks).toEqual({ month: Math.floor(st.tick / TICKS_PER_MONTH), now: [], last: [], months: [] });
    const sim = new Sim();
    sim.state = st;
    sim.run(3 * TICKS_PER_MONTH);
    expect(st.taxGone.length).toBeGreaterThan(0);
    expect(st.stocks.months.length).toBe(3);
    expect(st.stocks.now.length).toBeGreaterThan(0);
    const r = decodeSave(encodeSave(st, 2));
    if (!r.ok) throw new Error(r.why);
    expect(r.file.from).toBeUndefined();
    const again = new Sim();
    again.state = r.file.state;
    sim.run(600);
    again.run(600);
    expect(serialize(again.state)).toEqual(serialize(sim.state));
  });

  it('the round records are packed as runs', () => {
    const text = encodeSave(demo('town').state, 4);
    const a = [0, 0, 0, 5, 5, 7, 0, 0];
    expect(packRuns(a)).toEqual([0, 3, 5, 2, 7, 1, 0, 2]);
    expect(unpackRuns(packRuns(a), a.length)).toEqual(a);
    expect(unpackRuns([0, 3], 4)).toBeNull();
    expect(unpackRuns([0, 5], 4)).toBeNull();
    expect(unpackRuns([0, -1, 0, 5], 4)).toBeNull();
    const f = JSON.parse(text);
    f.state.rounds.water.walked = [0, 3];
    const r = decodeSave(JSON.stringify(f));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.why).toMatch(/damaged/);
  });
});

describe('a save that can’t be read says why', () => {
  const streets = demo('streets').state;
  const good = encodeSave(streets, 5);

  it('a save from another version of the state', () => {
    const f = JSON.parse(good);
    // Phase 1's version (6) is brought up to date (see the migration tests); older than that can't be.
    f.state.version = OLDEST_READABLE - 1;
    const r = decodeSave(JSON.stringify(f));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.why).toMatch(/older version of the game/);
    f.state.version = SIM_STATE_VERSION + 1;
    const n = decodeSave(JSON.stringify(f));
    if (!n.ok) expect(n.why).toMatch(/newer version/);
    else throw new Error('a newer save opened');
  });

  it('a newer envelope, someone else’s file, garbage and nothing at all', () => {
    const f = JSON.parse(good);
    f.save = 99;
    const cases: Array<[string | null, RegExp]> = [
      [JSON.stringify(f), /newer version/],
      [JSON.stringify({ hello: 1 }), /isn’t a saved town from this game/],
      [good.slice(0, good.length / 2), /damaged/],
      ['[1,2', /damaged/],
      [null, /no save/],
      ['', /no save/],
    ];
    for (const [text, why] of cases) {
      const r = decodeSave(text);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.why).toMatch(why);
    }
  });

  it('a field the game reads is missing or of the wrong kind', () => {
    const breaks: Array<(st: Record<string, any>) => void> = [
      (st) => delete st.tick,
      (st) => (st.tiles = st.tiles.slice(1)),
      (st) => delete st.buildings[0].waterUntil,
      (st) => (st.buildings[0].kind = 'palace'),
      (st) => delete st.rounds.culture,
      (st) => (st.walkers = [{ kind: 'settler' }]),
      (st) => (st.buildings.find((b: any) => b.family).family.members = 'nobody'),
      (st) => (st.buildings = [st.buildings[1], st.buildings[0], ...st.buildings.slice(2)]),
      (st) => (st.mapId = 'mars'),
      (st) => delete st.ledger,
      (st) => (st.ledger.now = [{ kind: 'bribes', what: '', amount: 1, n: 1 }]),
      (st) => delete st.rounds.tax,
      (st) => delete st.buildings[0].owed,
      (st) => delete st.taxRate,
    ];
    for (const brk of breaks) {
      // (On a save's state as the game reads it: an envelope 1 file, nothing packed.)
      const f = plainFile(streets);
      brk(f.state);
      const r = decodeSave(JSON.stringify(f));
      expect(r.ok, brk.toString()).toBe(false);
      if (!r.ok) expect(r.why).toMatch(/damaged/);
    }
  });

  it('a damaged undo list costs only the undo', () => {
    const f = JSON.parse(good);
    f.state.undo = [{ roads: 'x' }];
    const r = decodeSave(JSON.stringify(f));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.file.state.undo).toEqual([]);
  });
});

describe('browser storage that isn’t there', () => {
  const town = demo('streets').state;

  it('a store that throws on every touch, or none at all: not available, and nothing throws', () => {
    const throwing: KeyValueStore = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      },
    };
    for (const get of [
      () => {
        throw new Error('The operation is insecure.');
      },
      () => null,
      () => throwing,
    ]) {
      const saves = new Saves(new SafeStorage(get));
      expect(saves.available).toBe(false);
      expect(saves.save('manual', town, 1)).toMatch(/Saving isn’t available in this window/);
      expect(saves.info('manual')).toBe(null);
      expect(saves.newest()).toBe(null);
      const r = saves.load('auto');
      expect(r.ok).toBe(false);
    }
  });

  it('a full store says so, and the save already there is kept', () => {
    const mem = new Memory();
    const saves = new Saves(new SafeStorage(() => mem));
    expect(saves.available).toBe(true);
    expect(saves.save('auto', town, 10)).toBe('');
    mem.full = true;
    expect(saves.save('auto', town, 20)).toMatch(/full/);
    const i = saves.info('auto');
    expect(i && i.savedAt).toBe(10);
  });

  it('two slots, the newest one first, each labelled', () => {
    const mem = new Memory();
    const saves = new Saves(new SafeStorage(() => mem));
    expect(saves.newest()).toBe(null);
    saves.save('manual', town, 100);
    saves.save('auto', town, 200);
    expect(saves.newest()).toBe('auto');
    saves.save('manual', town, 300);
    expect(saves.newest()).toBe('manual');
    const i = saves.info('manual');
    expect(i?.label?.people).toBe(town.population);
    mem.setItem('zeus-remake.save.auto', 'nonsense');
    expect(saves.info('auto')?.why).toBeTruthy();
    expect(saves.newest()).toBe('manual');
  });
});
