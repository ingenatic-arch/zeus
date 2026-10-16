/**
 * Saving and loading: a town saved mid-everything carries on exactly as if it
 * had never been saved, and a save that can't be read (another version,
 * damaged, missing a field, no storage at all) says so plainly and never
 * throws.
 */
import { describe, expect, it } from 'vitest';
import { DEMOS } from '../src/game/demos';
import { decodeSave, encodeSave, SafeStorage, Saves, type KeyValueStore } from '../src/game/saves';
import { MAP_SIZE } from '../src/map/coast';
import { serialize, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION } from '../src/sim/state';

const T = (x: number, z: number): number => z * MAP_SIZE + x;

const demo = (name: string): Sim => {
  const sim = new Sim();
  DEMOS[name].setup!(sim);
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

/** Save through the whole envelope and load back into a fresh Sim. */
function reload(a: Sim): Sim {
  const got = decodeSave(encodeSave(a.state, 1000, { x: 1, z: 2, yaw: 0.5, dist: 30, tilt: 0 }));
  if (!got.ok) throw new Error(got.why);
  const b = new Sim();
  b.state = got.file.state;
  return b;
}

describe('a save carries on identically', () => {
  it('in #closed: homes warned about three needs at once, every walker out, an undo waiting', () => {
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

  it('in #town: a few hundred people, every kind of building and walker', () => {
    const a = demo('town');
    a.run(37);
    const b = reload(a);
    a.run(1500);
    b.run(1500);
    expect(serialize(b.state)).toEqual(serialize(a.state));
  });
});

describe('a save that can’t be read says why', () => {
  const good = encodeSave(demo('streets').state, 5);

  it('a save from another version of the state', () => {
    const f = JSON.parse(good);
    f.state.version = SIM_STATE_VERSION - 1;
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
    ];
    for (const brk of breaks) {
      const f = JSON.parse(good);
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
