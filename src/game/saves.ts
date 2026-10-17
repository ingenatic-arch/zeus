/**
 * Saving and loading a town in the browser. Host code: it reads the sim's
 * state and, on load, hands a whole state back before the game starts; it
 * never reaches into the sim while it runs.
 *
 * A save is the whole SimState as plain JSON inside a small envelope (what
 * the menu shows about it, when it was saved, where the camera was). Browser
 * storage belongs to one viewer, can come back empty, and can throw (private
 * windows, blocked site data, previews, a full quota), so every read and
 * write is wrapped, and the game plays on without it.
 */
import { MAP_SIZE } from '../map/coast';
import { dateOfTick, formatDate } from '../sim/clock';
import { migrate } from '../sim/migrate';
import { BUILDING_KINDS, ROUND_KINDS, SIM_STATE_VERSION, WALKER_KINDS, type Round, type SimState } from '../sim/state';
import { GOOD_COUNT } from '../sim/foods';
import { TRADE_GOODS } from '../sim/trade';

export const SAVE_FORMAT = 'zeus-remake-save';
/**
 * Bump when the envelope changes. The state inside has its own version
 * (SIM_STATE_VERSION). 2: the round records (where each kind of walker has
 * been, a number per tile, mostly nothing) are packed as runs. 3: every list
 * of records (buildings, walkers, family members and their stories, herds…)
 * is packed as rows of values against a shared table of key lists (see
 * packTables), and the tiles as runs. 1 and 2 are still read.
 */
export const SAVE_VERSION = 3;

/** The autosave, and the save made by hand. */
export type Slot = 'auto' | 'manual';
export const SLOTS: readonly Slot[] = ['manual', 'auto'];
const KEYS: Record<Slot, string> = { auto: 'zeus-remake.save.auto', manual: 'zeus-remake.save.manual' };

/** What the save menu shows about a save without reading the whole town. */
export interface SaveLabel {
  /** "June, 748 BC". */
  date: string;
  people: number;
  money: number;
  homes: number;
  tick: number;
}

/** Where the camera was. */
export interface SavedView {
  x: number;
  z: number;
  yaw: number;
  dist: number;
  tilt?: number;
}

export interface SaveFile {
  format: string;
  save: number;
  label: SaveLabel;
  /** Wall-clock milliseconds when it was saved (only ever shown, as "3 minutes ago"). */
  savedAt: number;
  view?: SavedView;
  state: SimState;
  /** On load only: the state version the save was brought up from (see migrate.ts), or absent. */
  from?: number;
}

/** The part of the Web Storage API a save needs. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Storage that never throws. `get` fetches the store (reading
 * `window.localStorage` can itself throw); a probe write decides whether
 * saving works here at all.
 */
export class SafeStorage {
  private store: KeyValueStore | null = null;
  readonly available: boolean;

  constructor(get: () => KeyValueStore | null | undefined) {
    try {
      this.store = get() ?? null;
      if (this.store) {
        const probe = 'zeus-remake.probe';
        this.store.setItem(probe, '1');
        const ok = this.store.getItem(probe) === '1';
        this.store.removeItem(probe);
        if (!ok) this.store = null;
      }
    } catch {
      this.store = null;
    }
    this.available = this.store !== null;
  }

  read(key: string): string | null {
    if (!this.store) return null;
    try {
      return this.store.getItem(key);
    } catch {
      return null;
    }
  }

  /** '' when written; otherwise why not, in plain words. */
  write(key: string, value: string): string {
    if (!this.store) return 'Saving isn’t available in this window.';
    try {
      this.store.setItem(key, value);
      return '';
    } catch (e) {
      const full = e instanceof Error && /quota|full|exceed/i.test(`${e.name} ${e.message}`);
      return full ? 'The browser’s storage for this page is full, so it couldn’t be saved.' : 'The browser wouldn’t let the game save just now.';
    }
  }
}

/** The browser's local storage, wrapped (reading `localStorage` itself can throw). */
export function browserStorage(): SafeStorage {
  return new SafeStorage(() => (typeof localStorage === 'undefined' ? null : localStorage));
}

export function labelOf(s: SimState): SaveLabel {
  return {
    date: formatDate(dateOfTick(s.tick)),
    people: s.population,
    money: s.money,
    homes: s.buildings.filter((b) => b.kind === 'home' && b.people > 0).length,
    tick: s.tick,
  };
}

/** A save, as the text that goes into storage. */
export function encodeSave(s: SimState, savedAt: number, view?: SavedView): string {
  const rounds: Record<string, { walked: number[]; exits: number[] }> = {};
  for (const k of Object.keys(s.rounds) as Round[]) rounds[k] = { walked: packRuns(s.rounds[k].walked), exits: packRuns(s.rounds[k].exits) };
  const shapes: string[][] = [];
  const state = packTables({ ...s, rounds, tiles: packRuns(s.tiles) }, shapes, new Map());
  const file = { format: SAVE_FORMAT, save: SAVE_VERSION, label: labelOf(s), savedAt, view, shapes, state };
  return JSON.stringify(file);
}

/** The key that marks a packed list of records (no record in the state has it). */
const ROWS = '$rows';

/**
 * A value as it goes into a save, losslessly smaller: every list of records
 * (plain objects) becomes { $rows: [[shape, value, value, …], …] }, each row
 * the record's values in the order of its keys, its key list kept once in
 * `shapes` (shared by every record with the same keys in the same order).
 * Values are packed in turn. Keys whose value is undefined are dropped, as
 * JSON drops them. unpackTables undoes it.
 */
export function packTables(v: unknown, shapes: string[][], ids: Map<string, number>): unknown {
  if (Array.isArray(v)) {
    if (v.length > 0 && v.every(isObj)) {
      return {
        [ROWS]: v.map((o) => {
          const keys = Object.keys(o).filter((k) => o[k] !== undefined);
          const sig = keys.join('\u0000');
          let id = ids.get(sig);
          if (id === undefined) {
            id = shapes.length;
            shapes.push(keys);
            ids.set(sig, id);
          }
          return [id, ...keys.map((k) => packTables(o[k], shapes, ids))];
        }),
      };
    }
    return v.map((x) => packTables(x, shapes, ids));
  }
  if (isObj(v)) {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) if (x !== undefined) out[k] = packTables(x, shapes, ids);
    return out;
  }
  return v;
}

/** A packed value back (see packTables), or throws if its rows don't fit the shapes. */
export function unpackTables(v: unknown, shapes: readonly (readonly string[])[]): unknown {
  if (Array.isArray(v)) return v.map((x) => unpackTables(x, shapes));
  if (!isObj(v)) return v;
  const rows = v[ROWS];
  if (Array.isArray(rows) && Object.keys(v).length === 1) {
    return rows.map((r) => {
      if (!Array.isArray(r) || !Number.isInteger(r[0]) || !shapes[r[0]] || shapes[r[0]].length !== r.length - 1) throw new Error('bad row');
      const keys = shapes[r[0]];
      const o: Record<string, unknown> = {};
      for (let i = 0; i < keys.length; i++) o[keys[i]] = unpackTables(r[i + 1], shapes);
      return o;
    });
  }
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v)) out[k] = unpackTables(x, shapes);
  return out;
}

/** A long list of numbers, mostly runs of the same one, as [value, count, value, count, …]. */
export function packRuns(a: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < a.length; ) {
    let j = i + 1;
    while (j < a.length && a[j] === a[i]) j++;
    out.push(a[i], j - i);
    i = j;
  }
  return out;
}

/** The list back from its runs, or null if the runs don't make a list of `len` numbers. */
export function unpackRuns(p: unknown, len: number): number[] | null {
  if (!Array.isArray(p) || p.length % 2 !== 0) return null;
  const out: number[] = [];
  for (let i = 0; i < p.length; i += 2) {
    const v = p[i];
    const c = p[i + 1];
    if (!fin(v) || !Number.isInteger(c) || c < 1 || out.length + c > len) return null;
    for (let k = 0; k < c; k++) out.push(v);
  }
  return out.length === len ? out : null;
}

/** Unpack a version-2 save's round records in place ('' if fine, or what's wrong). */
function unpackRounds(st: unknown): string {
  if (!isObj(st) || !isObj(st.rounds)) return '';
  const n = MAP_SIZE * MAP_SIZE;
  for (const [k, r] of Object.entries(st.rounds)) {
    if (!isObj(r)) continue;
    const walked = unpackRuns(r.walked, n);
    const exits = unpackRuns(r.exits, n);
    if (!walked || !exits) return `This save is damaged (the ${k} rounds are wrong), so it can’t be opened.`;
    r.walked = walked;
    r.exits = exits;
  }
  return '';
}

export type Decoded = { ok: true; file: SaveFile } | { ok: false; why: string };

/** Read a save back, or say plainly why it can't be. Never throws. */
export function decodeSave(text: string | null): Decoded {
  if (text === null || text === '') return { ok: false, why: 'There is no save there.' };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, why: 'This save is damaged: it isn’t a saved town the game can read.' };
  }
  if (!isObj(data) || data.format !== SAVE_FORMAT) return { ok: false, why: 'This isn’t a saved town from this game.' };
  if (typeof data.save !== 'number' || data.save > SAVE_VERSION) return { ok: false, why: `This save was made by a newer version of the game (save format ${String(data.save)}), so this one can’t open it.` };
  if (data.save >= 3) {
    const shapes = data.shapes;
    const bad = { ok: false as const, why: 'This save is damaged (its lists of buildings, walkers and families are wrong), so it can’t be opened.' };
    if (!Array.isArray(shapes) || !shapes.every(strs)) return bad;
    try {
      data.state = unpackTables(data.state, shapes as string[][]);
    } catch {
      return bad;
    }
    // The tiles are packed as runs too.
    if (isObj(data.state)) {
      const tiles = unpackRuns(data.state.tiles, MAP_SIZE * MAP_SIZE);
      if (!tiles) return { ok: false, why: 'This save is damaged (its map of roads and buildings is wrong), so it can’t be opened.' };
      data.state.tiles = tiles;
    }
  }
  if (data.save >= 2) {
    const bad = unpackRounds(data.state);
    if (bad) return { ok: false, why: bad };
  }
  // An older town is brought up to date first (rent became taxes in version 7).
  const from = migrate(data.state);
  const why = stateProblem(data.state);
  if (why) return { ok: false, why };
  const state = data.state as SimState;
  // A damaged undo list only costs the undo: it is dropped rather than refusing the town.
  if (!undoOk(state.undo)) state.undo = [];
  const view = isObj(data.view) && ['x', 'z', 'yaw', 'dist'].every((k) => fin((data.view as Record<string, unknown>)[k])) ? (data.view as unknown as SavedView) : undefined;
  const label = isObj(data.label) ? (data.label as unknown as SaveLabel) : labelOf(state);
  const file: SaveFile = { format: SAVE_FORMAT, save: data.save, label, savedAt: fin(data.savedAt) ? data.savedAt : 0, view, state };
  if (from) file.from = from;
  return { ok: true, file };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const nums = (v: unknown, len?: number): boolean => Array.isArray(v) && (len === undefined || v.length === len) && v.every(fin);
const strs = (v: unknown): boolean => Array.isArray(v) && v.every((x) => typeof x === 'string');

const ROUNDS: readonly Round[] = ROUND_KINDS;
const KINDS: readonly string[] = BUILDING_KINDS;
const WALKERS: readonly string[] = WALKER_KINDS;
const LEDGER_KINDS = ['taxes', 'sales', 'refund', 'wages', 'building', 'fire', 'collapse', 'clearing'];
const STATE_NUMBERS = ['seed', 'tick', 'commandsApplied', 'money', 'population', 'nextId', 'settlerClock', 'rev', 'looks', 'tilesRev', 'arrived', 'left', 'taxRate'];
const BUILDING_NUMBERS = [
  'id', 'x', 'z', 'level', 'people', 'incoming', 'placed', 'since', 'waterUntil', 'walker', 'clock', 'turn', 'foodUntil', 'religionUntil', 'cultureUntil', 'workers', 'stock', 'growth',
  'taxedAt', 'taxPaid', 'unpaid', 'owed', 'meat', 'cheese', 'meatIn', 'cheeseIn', 'meatUntil', 'cheeseUntil', 'grace', 'stalls',
  'risk', 'wear', 'fire', 'fireAt', 'creakAt',
];
/** A building's goods: one number per good. */
const BUILDING_GOODS = ['goods', 'goodsIn', 'goodsUntil', 'vclock', 'fetch'];
const WALKER_NUMBERS = ['id', 'people', 'home', 'seg', 'along', 'walked', 'route', 'origin', 'steps', 'since', 'target', 'load', 'food', 'meat', 'cheese', 'wait'];
const HERD_NUMBERS = ['hx', 'hz', 'r', 'x', 'z', 'tx', 'tz', 'head', 'full', 'clock', 'grow', 'fled'];

/**
 * What is wrong with a saved state, in plain words, or '' if it has the shape
 * the game reads: every field the sim and the views use is there and of the
 * right kind, so a bad save is refused before anything draws it.
 */
export function stateProblem(st: unknown): string {
  const damaged = (what: string): string => `This save is damaged (${what}), so it can’t be opened.`;
  if (!isObj(st)) return damaged('the town is missing');
  if (st.version !== SIM_STATE_VERSION) {
    const v = typeof st.version === 'number' ? st.version : '?';
    return typeof st.version === 'number' && st.version > SIM_STATE_VERSION
      ? `This save was made by a newer version of the game (version ${v}), so this one can’t open it.`
      : `This save is from an older version of the game (version ${v}); this one reads version ${SIM_STATE_VERSION}, so it can’t be opened.`;
  }
  if (st.mapId !== 'coast') return damaged('it is on a map this game doesn’t have');
  for (const k of STATE_NUMBERS) if (!fin(st[k])) return damaged(`its ${k} is missing`);
  if (typeof st.hazards !== 'boolean') return damaged('whether fire and wear build up is missing');
  if (!nums(st.rng, 4) || !nums(st.folk, 4) || !nums(st.wild, 4)) return damaged('its random numbers are missing');
  if (!Array.isArray(st.herds)) return damaged('its wild herds are missing');
  for (const h of st.herds as unknown[]) {
    if (!isObj(h) || (h.kind !== 'deer' && h.kind !== 'boar') || typeof h.place !== 'string' || !HERD_NUMBERS.every((k) => fin(h[k]))) return damaged('a wild herd is wrong');
  }
  if (!isObj(st.wind) || !fin(st.wind.angle) || !fin(st.wind.strength)) return damaged('its wind is missing');
  if (!ledgerOk(st.ledger)) return damaged('its ledger is missing');
  const n = MAP_SIZE * MAP_SIZE;
  if (!nums(st.tiles, n) || !(st.tiles as number[]).every((t) => Number.isInteger(t) && t >= -1)) return damaged('its map of roads and buildings is wrong');
  if (!isObj(st.rounds)) return damaged('the walkers’ rounds are missing');
  for (const sv of ROUNDS) {
    const r = (st.rounds as Record<string, unknown>)[sv];
    if (!isObj(r) || !nums(r.walked, n) || !nums(r.exits, n)) return damaged(`the ${sv} rounds are wrong`);
  }
  if (!nums(st.cleared)) return damaged('its cleared trees are wrong');
  if (!Array.isArray(st.buildings)) return damaged('its buildings are missing');
  let lastId = 0;
  for (const b of st.buildings as unknown[]) {
    if (!isObj(b) || typeof b.kind !== 'string' || !KINDS.includes(b.kind)) return damaged('a building is of no known kind');
    for (const k of BUILDING_NUMBERS) if (!fin(b[k])) return damaged(`a building’s ${k} is missing`);
    for (const k of BUILDING_GOODS) if (!nums(b[k], GOOD_COUNT)) return damaged(`a building’s ${k} is wrong`);
    // Buildings are kept in id order (looking one up relies on it).
    if ((b.id as number) <= lastId) return damaged('its buildings are out of order');
    lastId = b.id as number;
    if (b.family !== null && !familyOk(b.family)) return damaged('a household is incomplete');
    if (typeof b.ruin !== 'string' || typeof b.was !== 'string' || (b.was !== '' && !KINDS.includes(b.was))) return damaged('a heap of rubble is wrong');
  }
  if (!Array.isArray(st.walkers)) return damaged('its walkers are missing');
  for (const w of st.walkers as unknown[]) {
    if (!isObj(w) || typeof w.kind !== 'string' || !WALKERS.includes(w.kind)) return damaged('a walker is of no known kind');
    for (const k of WALKER_NUMBERS) if (!fin(w[k])) return damaged(`a walker’s ${k} is missing`);
    if (typeof w.back !== 'boolean' || !nums(w.path) || !nums(w.tiles) || !nums(w.trail)) return damaged('a walker’s way is missing');
    if (!nums(w.purse) || (w.purse as number[]).length % 3 !== 0) return damaged('a tax collector’s satchel is wrong');
    const pts = (w.path as number[]).length / 2;
    if (pts < 1 || (w.tiles as number[]).length !== pts || (w.seg as number) < 0 || (w.seg as number) >= pts) return damaged('a walker is off her way');
  }
  if (!Array.isArray(st.undo)) return damaged('its undo list is missing');
  if (!tradeOk(st.trade)) return damaged('its trading post’s record is wrong');
  if (!nums(st.taxGone)) return damaged('its record of households driven out by taxes is wrong');
  return '';
}

const SHIP_NUMBERS = ['phase', 'due', 'since', 'turned', 'post', 'visits', 'lastAt', 'lastPaid'];

function tradeOk(t: unknown): boolean {
  if (!isObj(t) || !Array.isArray(t.sell) || t.sell.length !== TRADE_GOODS.length || !t.sell.every((v: unknown) => typeof v === 'boolean')) return false;
  if (!nums(t.keep, TRADE_GOODS.length) || !isObj(t.ship)) return false;
  const sh = t.ship;
  if (!SHIP_NUMBERS.every((k) => fin(sh[k])) || !nums(sh.hold, TRADE_GOODS.length) || !nums(sh.lastBought, TRADE_GOODS.length) || !nums(sh.path)) return false;
  return (sh.path as number[]).length % 2 === 0 && [0, 1, 2, 3].includes(sh.phase as number);
}

function ledgerOk(l: unknown): boolean {
  if (!isObj(l) || !fin(l.month) || !fin(l.start) || !fin(l.lastStart) || !Array.isArray(l.now) || !Array.isArray(l.last)) return false;
  return [...l.now, ...l.last].every((x: unknown) => isObj(x) && typeof x.kind === 'string' && LEDGER_KINDS.includes(x.kind) && typeof x.what === 'string' && fin(x.amount) && fin(x.n));
}

function familyOk(f: unknown): boolean {
  if (!isObj(f)) return false;
  if (typeof f.name !== 'string' || typeof f.origin !== 'string' || !fin(f.came) || !fin(f.seed)) return false;
  if (!Array.isArray(f.members) || !Array.isArray(f.story) || !strs(f.warned)) return false;
  for (const p of f.members as unknown[]) {
    if (!isObj(p) || typeof p.name !== 'string' || typeof p.female !== 'boolean' || !fin(p.born) || typeof p.role !== 'string' || typeof p.kin !== 'string') return false;
  }
  for (const e of f.story as unknown[]) {
    if (!isObj(e) || !fin(e.tick) || typeof e.what !== 'string' || typeof e.need !== 'string' || !fin(e.level) || !strs(e.names)) return false;
  }
  return true;
}

function undoOk(u: unknown): boolean {
  if (!Array.isArray(u)) return false;
  return u.every(
    (e) =>
      isObj(e) &&
      nums(e.roads) &&
      nums(e.plots) &&
      nums(e.removedRoads) &&
      nums(e.removedPlots) &&
      nums(e.removedIds) &&
      strs(e.removedKinds) &&
      nums(e.removedStock) &&
      (e.removedMeat === undefined || nums(e.removedMeat)) &&
      (e.removedCheese === undefined || nums(e.removedCheese)) &&
      (e.removedGoods === undefined || (Array.isArray(e.removedGoods) && e.removedGoods.every((g: unknown) => nums(g, GOOD_COUNT)))) &&
      (e.removedStalls === undefined || nums(e.removedStalls)) &&
      (e.stalls === undefined || (nums(e.stalls) && (e.stalls as number[]).length % 2 === 0)) &&
      (e.removedWas === undefined || strs(e.removedWas)) &&
      (e.removedLevels === undefined || nums(e.removedLevels)) &&
      (e.removedNames === undefined || strs(e.removedNames)) &&
      (e.removedHazards === undefined || nums(e.removedHazards)) &&
      nums(e.trees) &&
      fin(e.cost) &&
      fin(e.tick),
  );
}

/** What the menu knows about a slot: its label and when it was saved, or why it can't be read. */
export type SlotInfo = { label: SaveLabel; savedAt: number; why: '' } | { label: null; savedAt: 0; why: string } | null;

/** The two save slots in browser storage. */
export class Saves {
  constructor(readonly storage: SafeStorage) {}

  get available(): boolean {
    return this.storage.available;
  }

  /** Save the town to a slot: '' when saved, or why not. */
  save(slot: Slot, s: SimState, savedAt: number, view?: SavedView): string {
    let text: string;
    try {
      text = encodeSave(s, savedAt, view);
    } catch {
      return 'The town couldn’t be written down to save it.';
    }
    return this.storage.write(KEYS[slot], text);
  }

  /** A slot's save, read in full. */
  load(slot: Slot): Decoded {
    return decodeSave(this.storage.read(KEYS[slot]));
  }

  /** What's in a slot, read lightly for the menu (null: empty). */
  info(slot: Slot): SlotInfo {
    const text = this.storage.read(KEYS[slot]);
    if (text === null || text === '') return null;
    // The label sits at the front of the envelope; reading it doesn't need the whole town checked.
    try {
      const data = JSON.parse(text) as Partial<SaveFile>;
      if (data.format !== SAVE_FORMAT || !data.label || typeof data.label.date !== 'string') return { label: null, savedAt: 0, why: 'Damaged, or not a saved town' };
      const v = data.state?.version;
      const readable = typeof v === 'number' && v <= SIM_STATE_VERSION && (v === SIM_STATE_VERSION || migrate({ version: v }) !== 0);
      if (typeof data.save !== 'number' || data.save > SAVE_VERSION || !readable) return { label: null, savedAt: 0, why: `From another version of the game (version ${String(v ?? '?')})` };
      return { label: data.label, savedAt: fin(data.savedAt) ? data.savedAt : 0, why: '' };
    } catch {
      return { label: null, savedAt: 0, why: 'Damaged' };
    }
  }

  /** The slot with the newest readable save, or null if neither has one. */
  newest(): Slot | null {
    let best: Slot | null = null;
    let at = -Infinity;
    for (const slot of SLOTS) {
      const i = this.info(slot);
      if (i && i.label && i.savedAt >= at) {
        best = slot;
        at = i.savedAt;
      }
    }
    return best;
  }
}

/** "just now", "3 minutes ago", "2 hours ago", "yesterday", "5 days ago". */
export function ago(then: number, now: number): string {
  const s = Math.max(0, (now - then) / 1000);
  if (s < 50) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return m <= 1 ? 'a minute ago' : `${m} minutes ago`;
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? 'an hour ago' : `${h} hours ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}
