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
// Slice 42: a save's land.
import { BAY, landProblem } from '../map/lands';
import { dateOfTick, formatDate } from '../sim/clock';
import { migrate } from '../sim/migrate';
// Slice 44.
import { mendMessages } from '../sim/messages';
// Slice 51.
import { mendAnnals } from '../sim/annals';
import { BUILDING_KINDS, ROUND_KINDS, SIM_STATE_VERSION, WALKER_KINDS, type Round, type SimState, type StockKind } from '../sim/state';
// Slice 43.
import { colonyWorksOk } from '../sim/colonyworks';
// Slice 47: a colonial empire.
import { colonyEmpireOk } from '../sim/colonyempire';
import { STOCK_KINDS } from '../sim/stockbook';
import { GOOD_COUNT } from '../sim/foods';
import { TRADE_GOODS } from '../sim/trade';
import { CITY_IDS, RULED } from '../map/greece';
// Slice 41.
import { NEWS_KINDS } from '../sim/crime';
// Slice 45: the court and the prison.
import { CASE_KINDS, LAW_ROWS, PUNISHMENTS, RATE_KINDS } from '../sim/justice';
// Phase 7 groundwork.
import { GOD_IDS } from '../sim/pantheon';
// Slice 55.
import { MONSTER_IDS } from '../sim/pantheon';
// Slice 56.
import { VISIT_WHYS } from '../sim/epiphany';

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
  const n = sideOf(st) ** 2;
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
      // (Slice 42: as many as its land has, once the land is one this game makes.)
      if (data.state.land !== undefined && landProblem(data.state.land)) return { ok: false, why: `This save is damaged (${landProblem(data.state.land)}), so it can’t be opened.` };
      const tiles = unpackRuns(data.state.tiles, sideOf(data.state) ** 2);
      if (!tiles) return { ok: false, why: 'This save is damaged (its map of roads and buildings is wrong), so it can’t be opened.' };
      data.state.tiles = tiles;
    }
    // (Once more through JSON: records rebuilt key by key above are slower for the sim to read, a fifth slower to run, than the same records as JSON makes them, each with its fields in the record itself. Slice 22, found with the prepared demo towns.)
    data.state = JSON.parse(JSON.stringify(data.state));
  }
  if (data.save >= 2) {
    const bad = unpackRounds(data.state);
    if (bad) return { ok: false, why: bad };
  }
  // An older town is brought up to date first (rent became taxes in version 7).
  const from = migrate(data.state);
  // Slice 44: a damaged message log costs only the history (messages.ts).
  mendMessages(data.state);
  // Slice 51: damaged annals cost only their history (annals.ts).
  mendAnnals(data.state);
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
/** Slice 42: a saved state's map's side, in tiles: its land's if it is one this game makes, or the Bay's (a land that isn't is refused by stateProblem; slice 42's review: never unpacked to its size first). */
const sideOf = (st: Record<string, unknown>): number => (isObj(st.land) && !landProblem(st.land) ? (st.land.size as number) : BAY.size);
const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const nums = (v: unknown, len?: number): boolean => Array.isArray(v) && (len === undefined || v.length === len) && v.every(fin);
const strs = (v: unknown): boolean => Array.isArray(v) && v.every((x) => typeof x === 'string');

const ROUNDS: readonly Round[] = ROUND_KINDS;
const KINDS: readonly string[] = BUILDING_KINDS;
const WALKERS: readonly string[] = WALKER_KINDS;
const LEDGER_KINDS = ['taxes', 'sales', 'refund', 'wages', 'building', 'fire', 'collapse', 'clearing', 'imports', 'routes', 'gifts', 'given', 'favours', 'tribute', 'peace', 'raid', 'soldiers', 'hirelings', 'recovered', 'borrowed', 'repaid', 'lent', 'repayment', 'returned', 'rowers', 'seized', 'collected'];
const STATE_NUMBERS = ['seed', 'tick', 'commandsApplied', 'money', 'population', 'nextId', 'settlerClock', 'rev', 'looks', 'tilesRev', 'arrived', 'left', 'taxRate'];
const BUILDING_NUMBERS = [
  'id', 'x', 'z', 'level', 'people', 'incoming', 'placed', 'since', 'waterUntil', 'walker', 'clock', 'turn', 'foodUntil', 'religionUntil', 'cultureUntil', 'workers', 'stock', 'growth',
  'taxedAt', 'taxPaid', 'unpaid', 'owed', 'meat', 'cheese', 'meatIn', 'cheeseIn', 'meatUntil', 'cheeseUntil', 'grace', 'stalls',
  'risk', 'wear', 'fire', 'fireAt', 'creakAt',
];
// Slice 30: a home's temptation to crime, and the ledger's thefts and fines.
BUILDING_NUMBERS.push('tempt', 'robbedAt');
LEDGER_KINDS.push('stolen', 'fines');
// Slice 34: tribute from your vassals.
LEDGER_KINDS.push('vassals');
// Slice 37: founding a colony.
LEDGER_KINDS.push('colonies');
// Slice 41: repairs to what vandals smashed, and what crooked tax collectors kept back.
LEDGER_KINDS.push('repairs', 'skimmed');
// Slice 47: your share of your colonies' and free allies' trade.
LEDGER_KINDS.push('colonytrade');
// Slice 53: festivals to the gods.
LEDGER_KINDS.push('worship');
// Slice 49: a home's health and the physician's last call.
BUILDING_NUMBERS.push('health', 'physician');
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
  // Slice 42: its land (none: the Bay).
  if (st.land !== undefined && landProblem(st.land)) return damaged(landProblem(st.land));
  for (const k of STATE_NUMBERS) if (!fin(st[k])) return damaged(`its ${k} is missing`);
  if (typeof st.hazards !== 'boolean') return damaged('whether fire and wear build up is missing');
  if (!nums(st.rng, 4) || !nums(st.folk, 4) || !nums(st.wild, 4)) return damaged('its random numbers are missing');
  if (!Array.isArray(st.herds)) return damaged('its wild herds are missing');
  for (const h of st.herds as unknown[]) {
    if (!isObj(h) || (h.kind !== 'deer' && h.kind !== 'boar') || typeof h.place !== 'string' || !HERD_NUMBERS.every((k) => fin(h[k]))) return damaged('a wild herd is wrong');
  }
  if (!isObj(st.wind) || !fin(st.wind.angle) || !fin(st.wind.strength)) return damaged('its wind is missing');
  if (!ledgerOk(st.ledger)) return damaged('its ledger is missing');
  const n = sideOf(st) ** 2;
  if (!nums(st.tiles, n) || !(st.tiles as number[]).every((t) => Number.isInteger(t) && t >= -2)) return damaged('its map of roads and buildings is wrong');
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
    // Slice 36.
    if (typeof b.estate !== 'boolean') return damaged('whether a home is an estate is missing');
    // Slice 48.
    if ((b.paused !== 0 && b.paused !== 1) || (b.first !== 0 && b.first !== 1) || !nums(b.rules)) return damaged('a building’s orders or a store’s rules are wrong');
    // Phase 7 groundwork.
    if (b.god !== undefined && !GOD_IDS.includes(b.god as never)) return damaged('a shrine is dedicated to no known god');
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
  if (!worldOk(st.world)) return damaged('its map of Greece is wrong');
  if (!bookOk(st.stocks)) return damaged('its stock book is wrong');
  if (!armyOk(st.army)) return damaged('its army is wrong');
  if (!wallsOk(st.walls, st.tiles as number[])) return damaged('its walls are wrong');
  if (!fleetOk(st.fleet)) return damaged('its fleet is wrong');
  // Slice 30.
  if (!crimeOk(st.crime)) return damaged('its record of crime is wrong');
  // Slice 32.
  if (!materialsOk(st.materials)) return damaged('its record of felled trees is wrong');
  // Slice 33.
  if (!seasonOk(st.season)) return damaged('its record of the seasons is wrong');
  // Slice 34.
  if (!empireOk(st.empire)) return damaged('its record of vassals and allies is wrong');
  // Slice 35.
  if (!monumentsOk(st.monuments)) return damaged('its record of the monuments is wrong');
  // Slice 39.
  if (!ambitionOk(st.ambition)) return damaged('its record of the ambitions is wrong');
  // Slice 49.
  if (!healthOk(st.health)) return damaged('its record of health and plague is wrong');
  // Phase 7 groundwork.
  if (!godsOk(st.gods)) return damaged('its record of the gods is wrong');
  // Slice 55.
  if (!legendsOk(st.legends)) return damaged('its record of monsters is wrong');
  // Slice 56.
  if (!walksOk((st.gods as Record<string, unknown>).walks)) return damaged('its record of the gods in the city is wrong');
  // Slice 53: worship's record (festivals, the last of each, the months of moods, homes glad from a procession).
  if (!worshipOk(st.gods)) return damaged('its record of the gods’ worship is wrong');
  return '';
}

// Slice 55
const BEAST_STATES = ['coming', 'settling', 'lair', 'raiding', 'returning', 'healing', 'leaving'];
const BEAST_NUMBERS = ['chase', 'calm', 'shot', 'id', 'came', 'settled', 'lair', 'mouth', 'hp', 'full', 'x', 'z', 'face', 'walked', 'seg', 'along', 'target', 'siege', 'smash', 'wait', 'next', 'raids', 'last', 'killed', 'stoned', 'men', 'dead', 'foe', 'fought', 'swung', 'cool'];
const LAIRS = ['cave', 'marsh', 'shore'];
/** Slice 55: the monsters on the land (each of a known kind, sent by one of the twelve, with its way, its lair and its numbers), Medusa's stones, and those slain. */
function legendsOk(l: unknown): boolean {
  if (!isObj(l) || !fin(l.next) || !Array.isArray(l.monsters) || !Array.isArray(l.stones) || !Array.isArray(l.slain)) return false;
  const beast = (m: unknown): boolean =>
    isObj(m) &&
    MONSTER_IDS.includes(m.kind as never) &&
    GOD_IDS.includes(m.god as never) &&
    BEAST_STATES.includes(m.state as string) &&
    LAIRS.includes(m.den as string) &&
    BEAST_NUMBERS.every((k) => fin(m[k])) &&
    nums(m.path) &&
    (m.path as number[]).length % 2 === 0 &&
    ['why', 'aim', 'lastWords'].every((k) => typeof m[k] === 'string') &&
    typeof m.warned === 'boolean' &&
    typeof m.broke === 'boolean' &&
    Array.isArray(m.wrecked) &&
    (m.wrecked as unknown[]).every((w) => typeof w === 'string');
  const stone = (x: unknown): boolean => isObj(x) && ['x', 'z', 'face', 'tick'].every((k) => fin(x[k])) && typeof x.kind === 'string';
  const slain = (x: unknown): boolean => isObj(x) && MONSTER_IDS.includes(x.kind as never) && LAIRS.includes(x.den as string) && fin(x.lair) && fin(x.tick) && typeof x.by === 'string';
  return (l.monsters as unknown[]).every(beast) && (l.stones as unknown[]).every(stone) && (l.slain as unknown[]).every(slain);
}

/** Slice 53: worship's record on the gods. */
function worshipOk(g: unknown): boolean {
  if (!isObj(g) || !Array.isArray(g.festivals) || !isObj(g.worshipped) || !isObj(g.lastFestival) || !isObj(g.months) || !fin(g.month) || !isObj(g.festive)) return false;
  const { worshipped, lastFestival, months, festive } = g;
  return (
    g.festivals.every((f) => isObj(f) && (GOD_IDS as readonly unknown[]).includes(f.god) && ['shrine', 'at', 'day', 'walker'].every((k) => fin(f[k]))) &&
    GOD_IDS.every((id) => (worshipped[id] === undefined || fin(worshipped[id])) && (lastFestival[id] === undefined || fin(lastFestival[id])) && (months[id] === undefined || (Array.isArray(months[id]) && (months[id] as unknown[]).every(fin)))) &&
    Object.values(festive).every((v) => Array.isArray(v) && v.length === 2 && v.every(fin))
  );
}

/** Phase 7 groundwork: the gods' switch, when the city was noticed, and each of the twelve's memories. */
function godsOk(g: unknown): boolean {
  if (!isObj(g) || typeof g.on !== 'boolean' || !fin(g.noticedAt) || !isObj(g.memories)) return false;
  const mem = g.memories;
  return GOD_IDS.every((id) => Array.isArray(mem[id]) && (mem[id] as unknown[]).every((m) => isObj(m) && typeof m.kind === 'string' && typeof m.why === 'string' && fin(m.amount) && fin(m.tick) && fin(m.fade)));
}

/** Slice 56: the gods in the city, the places they blessed, who was loving, when each last came. */
function walksOk(w: unknown): boolean {
  if (!isObj(w) || !fin(w.next) || !Array.isArray(w.figures) || !Array.isArray(w.blessed) || !Array.isArray(w.loving) || !isObj(w.last) || !Object.entries(w.last).every(([g, t]) => GOD_IDS.includes(g as never) && fin(t))) return false;
  const god = (g: unknown): boolean => GOD_IDS.includes(g as never);
  const states = ['arriving', 'walking', 'blessing', 'leaving', 'posing'];
  return (
    (w.loving as unknown[]).every(god) &&
    (w.blessed as unknown[]).every((b) => isObj(b) && fin(b.id) && fin(b.until) && god(b.god)) &&
    (w.figures as unknown[]).every(
      (f) =>
        isObj(f) &&
        god(f.god) &&
        ['id', 'x', 'z', 'px', 'pz', 'heading', 'since', 'at', 'came', 'leaves'].every((k) => fin(f[k])) &&
        states.includes(f.state as string) &&
        VISIT_WHYS.includes(f.why as never) &&
        typeof f.words === 'string' &&
        nums(f.blessed) &&
        Array.isArray(f.stops) &&
        (f.stops as unknown[]).every((p) => isObj(p) && fin(p.id) && fin(p.x) && fin(p.z)),
    )
  );
}

/** Slice 49: health's switch, the sick, plague in Greece and in the city, the fever, the quarantine and the tallies. */
function healthOk(h: unknown): boolean {
  if (!isObj(h) || typeof h.on !== 'boolean' || !['since', 'next', 'quarantine', 'lastPlague', 'month'].every((k) => fin(h[k]))) return false;
  const rows = (v: unknown, keys: string[], ok: (x: Record<string, unknown>) => boolean = () => true): boolean => Array.isArray(v) && v.every((x) => isObj(x) && keys.every((k) => fin(x[k])) && ok(x));
  const tally = (t: unknown): boolean => isObj(t) && ['ill', 'mended', 'died', 'fled'].every((k) => fin(t[k]));
  const o = h.outbreak;
  const f = h.fever;
  return (
    rows(h.sick, ['id', 'home', 'since', 'until', 'plague', 'tended', 'bed'], (x) => typeof x.name === 'string' && typeof x.female === 'boolean') &&
    rows(h.greece, ['from', 'until', 'warned'], (x) => typeof x.city === 'string') &&
    (o === null || (isObj(o) && typeof o.from === 'string' && ['start', 'until', 'ill', 'dead', 'fled'].every((k) => fin(o[k])) && nums(o.struck))) &&
    (f === null || (isObj(f) && ['home', 'since', 'homes'].every((k) => fin(f[k])))) &&
    tally(h.now) &&
    tally(h.last)
  );
}

/** The ambitions (slice 39): the switch, the milestones reached (each by its id, when, and quietly or not), fame and the grand finish. */
function ambitionOk(a: unknown): boolean {
  if (!isObj(a) || typeof a.on !== 'boolean' || typeof a.looked !== 'boolean' || !fin(a.fameUntil) || !fin(a.grand) || typeof a.grandQuiet !== 'boolean' || !Array.isArray(a.reached)) return false;
  return (a.reached as unknown[]).every((l) => isObj(l) && typeof l.id === 'string' && fin(l.tick) && typeof l.quiet === 'boolean' && typeof l.note === 'string');
}

/** The seasons (slice 33): the switch, and the ships winter has held back (days, by ship). */
function seasonOk(c: unknown): boolean {
  return isObj(c) && typeof c.on === 'boolean' && isObj(c.late) && Object.values(c.late).every(fin);
}

/** Your vassals and allies (slice 34): each record's cities, kinds and numbers. */
function empireOk(e: unknown): boolean {
  if (!isObj(e) || !fin(e.nextId) || !['vassals', 'allies', 'heralds', 'tribute', 'aid', 'calls', 'conquests'].every((k) => Array.isArray(e[k]))) return false;
  const ruled = (c: unknown): boolean => RULED.includes(c as never);
  const all = (k: string, ok: (x: Record<string, unknown>) => boolean): boolean => (e[k] as unknown[]).every((x) => isObj(x) && ok(x));
  return (
    all('vassals', (v) => ruled(v.city) && ['conquest', 'awe', 'debt'].includes(v.how as string) && ['since', 'good', 'weight', 'loyalty', 'next', 'sent', 'worth', 'arming', 'rises'].every((k) => fin(v[k]))) &&
    all('allies', (a) => ruled(a.city) && fin(a.since) && nums(a.refused) && fin(a.declined)) &&
    all('heralds', (h) => ruled(h.city) && ['submit', 'debt', 'alliance'].includes(h.kind as string) && ['', 'yes', 'no', 'friends'].includes(h.answer as string) && typeof h.why === 'string' && typeof h.line === 'string' && ['id', 'loan', 'at', 'due', 'odds'].every((k) => fin(h[k]))) &&
    all('tribute', (t) => (ruled(t.city) || (t.city === 'home' && typeof t.colony === 'string')) && ['land', 'sea'].includes(t.by as string) && ['road', 'bay', 'city', 'done'].includes(t.phase as string) && typeof t.way === 'string' && typeof t.how === 'string' && (t.ship === null || isObj(t.ship)) && ['id', 'good', 'amount', 'worth', 'start', 'dur', 'put', 'lost', 'store', 'ended'].every((k) => fin(t[k]))) &&
    all('aid', (a) => ruled(a.city) && ['road', 'city', 'home', 'done'].includes(a.phase as string) && typeof a.way === 'string' && typeof a.line === 'string' && ['id', 'raid', 'men', 'start', 'dur', 'company'].every((k) => fin(a[k]))) &&
    all('calls', (c) => ruled(c.ally) && ruled(c.foe) && ['open', 'joined', 'refused', 'lapsed', 'over'].includes(c.state as string) && ['id', 'war', 'at', 'due', 'expedition'].every((k) => fin(c[k]))) &&
    all('conquests', (q) => ruled(q.city) && fin(q.expedition) && Array.isArray(q.helpers) && Array.isArray(q.declined) && Array.isArray(q.theirs) && typeof q.crush === 'boolean') &&
    // Slice 37: your colonies and a colony on its way.
    Array.isArray(e.colonies) &&
    Array.isArray(e.foundings) &&
    all('colonies', (c) => typeof c.site === 'string' && typeof c.name === 'string' && typeof c.governor === 'string' && typeof c.trait === 'string' && Array.isArray(c.memories) && Array.isArray(c.guards) && Array.isArray(c.homes) && typeof c.skip === 'boolean' && (c.threat === null || isObj(c.threat)) && ['since', 'settlers', 'share', 'loyalty', 'next', 'sent', 'worth', 'talk', 'frees'].every((k) => fin(c[k]))) &&
    all('foundings', (f) => typeof f.site === 'string' && ['gathering', 'leaving', 'sea', 'done'].includes(f.phase as string) && Array.isArray(f.households) && (f.ship === null || isObj(f.ship)) && ['id', 'at', 'cost', 'wheat', 'post', 'until', 'start', 'dur', 'people'].every((k) => fin(f[k]))) &&
    // Slice 43: your colonies' stages, works, wants and governors, and goods going out to them.
    colonyWorksOk(e) &&
    // Slice 47: companies sailing to and from your colonies, the militia, free allies, and what is stationed in each colony.
    colonyEmpireOk(e)
  );
}

/** The monuments (slice 35): each site's building, kind, stage and work, and the Stadium's games. */
function monumentsOk(m: unknown): boolean {
  if (!isObj(m) || !Array.isArray(m.sites) || !isObj(m.games)) return false;
  const g = m.games;
  if (!['next', 'until', 'held', 'groups', 'visitors', 'takings', 'ended'].every((k) => fin(g[k]))) return false;
  return (m.sites as unknown[]).every(
    (x) =>
      isObj(x) &&
      Number.isInteger(x.id) &&
      // (Slice 54: or a sanctuary, to a known god; and when a finished one lost its workers.)
      (x.kind === 'lighthouse' || x.kind === 'colossus' || x.kind === 'stadium' || (x.kind === 'sanctuary' && GOD_IDS.includes(x.god as never))) &&
      fin(x.idle) &&
      Number.isInteger(x.stage) &&
      (x.stage as number) >= 0 &&
      (x.stage as number) <= 3 &&
      typeof x.building === 'boolean' &&
      fin(x.work) &&
      fin(x.marked) &&
      fin(x.finished) &&
      Array.isArray(x.done) &&
      (x.done as unknown[]).every(fin),
  );
}

/** Crime (slice 30): the switch, the news and the month's tallies. */
function crimeOk(c: unknown): boolean {
  if (!isObj(c) || typeof c.on !== 'boolean' || !fin(c.month) || !Array.isArray(c.news)) return false;
  // (Slice 41: the tallies' new counts, and the new kinds of news.)
  const tallyOk = (t: unknown): boolean => isObj(t) && ['thefts', 'caught', 'coin', 'goods', 'fines', 'picked', 'smashed', 'arson', 'smuggled', 'skimmed', 'beaten'].every((k) => fin(t[k]));
  if (!tallyOk(c.now) || !tallyOk(c.last)) return false;
  if (!(c.news as unknown[]).every((n) => isObj(n) && fin(n.tick) && fin(n.at) && typeof n.line === 'string' && (NEWS_KINDS as readonly unknown[]).includes(n.kind))) return false;
  return crimeKindsOk(c) && justiceOk(c);
}

/** Slice 41: the new kinds' switch, what is smashed, talk of burning, the quarters' heat and the gangs. */
function crimeKindsOk(c: Record<string, unknown>): boolean {
  if (typeof c.kinds !== 'boolean' || !fin(c.arsonAt) || !nums(c.heat) || !nums(c.seats)) return false;
  const rows = (v: unknown, keys: string[], strings: string[] = []): boolean => Array.isArray(v) && v.every((x) => isObj(x) && keys.every((k) => fin(x[k])) && strings.every((k) => typeof x[k] === 'string'));
  return rows(c.broken, ['at', 'part', 'tick'], ['by']) && rows(c.talk, ['home', 'since', 'at']) && rows(c.gangs, ['den', 'district', 'formed', 'next', 'covered'], ['name']);
}

/** Slice 45: the law, the cases at court, those serving, the stocks, the prisons' unrest, the monthly rate and the last cut. */
function justiceOk(c: Record<string, unknown>): boolean {
  const law = c.law;
  if (!isObj(law) || !LAW_ROWS.every((r) => (PUNISHMENTS as readonly unknown[]).includes(law[r]))) return false;
  const kind = (x: Record<string, unknown>): boolean => typeof x.name === 'string' && typeof x.female === 'boolean' && (CASE_KINDS as readonly unknown[]).includes(x.kind);
  const rows = (v: unknown, keys: string[], ok: (x: Record<string, unknown>) => boolean): boolean => Array.isArray(v) && v.every((x) => isObj(x) && keys.every((k) => fin(x[k])) && ok(x));
  const rateOk = (r: unknown): boolean => isObj(r) && fin(r.month) && fin(r.people) && fin(r.caught) && fin(r.tried) && nums(r.n) && (r.n as unknown[]).length === RATE_KINDS.length;
  const cut = c.cut;
  return (
    rows(c.cases, ['home', 'court', 'since', 'trial'], (x) => kind(x) && typeof x.gang === 'boolean') &&
    rows(c.held, ['home', 'level', 'at', 'since', 'until'], (x) => kind(x) && typeof x.gang === 'boolean' && (x.as === 'prison' || x.as === 'labour')) &&
    rows(c.stocks, ['home', 'at', 'since', 'until'], kind) &&
    rows(c.jails, ['at', 'unrest', 'warned'], () => true) &&
    rateOk(c.rate) &&
    Array.isArray(c.rates) &&
    (c.rates as unknown[]).every(rateOk) &&
    isObj(cut) &&
    fin(cut.tick) &&
    ['', 'execution', 'exile'].includes(cut.what as string) &&
    typeof cut.who === 'string'
  );
}

/** The trees the loggers have felled (slice 32): each by its number in the map's plants, and the tick it fell. */
function materialsOk(m: unknown): boolean {
  if (!isObj(m) || !Array.isArray(m.felled)) return false;
  return (m.felled as unknown[]).every((f) => isObj(f) && Number.isInteger(f.tree) && (f.tree as number) >= 0 && fin(f.at));
}

const TRIREME_NUMBERS = ['id', 'n', 'yard', 'x', 'z', 'hx', 'hz', 'along', 'hp', 'work', 'foe', 'cool', 'rammed', 'struck', 'start', 'dur', 'a0', 'a1', 'sank', 'owed'];
const ENEMY_NUMBERS = ['id', 'raid', 'slot', 'x', 'z', 'hx', 'hz', 'along', 'from', 'hp', 'men', 'bx', 'bz', 'tile', 'struck', 'hit', 'sank', 'cool'];
const PIRATE_NUMBERS = ['id', 'ships', 'seen', 'from', 'until', 'fought'];
// Slice 38: blockades, oars and repairs, warships.
const BLOCKADE_NUMBERS = ['id', 'of', 'ships', 'seen', 'arrives', 'holds', 'until', 'sunk', 'ended'];
const optFin = (x: unknown): boolean => x === undefined || (typeof x === 'number' && Number.isFinite(x));
function seasOk(f: Record<string, unknown>): boolean {
  if (!Array.isArray(f.blockades)) return false;
  const blockadeOk = (b: unknown): boolean => isObj(b) && BLOCKADE_NUMBERS.every((k) => fin(b[k])) && CITY_IDS.includes(b.city as never) && ['raid', 'expedition', 'call', 'rose', 'staged'].includes(b.cause as string) && typeof b.why === 'string' && ['sailing', 'coming', 'holding', 'over'].includes(b.phase as string) && ['', 'broken', 'peace', 'supplies', 'winter', 'harbour'].includes(b.end as string);
  const triremeOk = (t: unknown): boolean => isObj(t) && fin(t.oars) && typeof t.mend === 'boolean';
  const shipOk = (e: unknown): boolean => isObj(e) && optFin(e.blockade) && optFin(e.pace);
  const pirateOk = (p: unknown): boolean => isObj(p) && (p.of === undefined || CITY_IDS.includes(p.of as never)) && optFin(p.war) && (p.met === undefined || nums(p.met));
  return (f.blockades as unknown[]).every(blockadeOk) && (f.triremes as unknown[]).every(triremeOk) && (f.ships as unknown[]).every(shipOk) && (f.pirates as unknown[]).every(pirateOk);
}

/** The fleet (slice 26): triremes (with their crews), enemy ships, pirates and the sea fights' reports. */
function fleetOk(f: unknown): boolean {
  if (!isObj(f) || !fin(f.nextId) || ![f.triremes, f.ships, f.pirates, f.reports].every(Array.isArray)) return false;
  const way = (p: unknown): boolean => nums(p) && (p as number[]).length % 2 === 0;
  const rowerOk = (r: unknown): boolean => isObj(r) && fin(r.home) && typeof r.name === 'string' && typeof r.father === 'string' && typeof r.house === 'string' && ['head', 'son', 'husband', 'brother', 'cousin'].includes(r.kin as string);
  const triremeOk = (t: unknown): boolean =>
    isObj(t) && TRIREME_NUMBERS.every((k) => fin(t[k])) && ['building', 'moored', 'rowing', 'away', 'sinking'].includes(t.state as string) && ['', 'fight', 'home', 'out', 'in'].includes(t.task as string) && ['bay', 'lane', 'away'].includes(t.order as string) && typeof t.lane === 'string' && typeof t.homeward === 'boolean' && way(t.path) && Array.isArray(t.crew) && t.crew.every(rowerOk);
  // (Slice 38: or holding a harbour's mouth; a lane's city any name, for lanes still to come.)
  const shipOk = (e: unknown): boolean => isObj(e) && ENEMY_NUMBERS.every((k) => fin(e[k])) && ['sailing', 'beached', 'leaving', 'sinking', 'holding'].includes(e.state as string) && typeof e.laden === 'boolean' && way(e.path);
  const pirateOk = (p: unknown): boolean => isObj(p) && PIRATE_NUMBERS.every((k) => fin(p[k])) && typeof p.way === 'string' && typeof p.city === 'string' && typeof p.place === 'string' && ['seen', 'preying', 'gone', 'beaten'].includes(p.state as string) && strs(p.took);
  const reportOk = (r: unknown): boolean => isObj(r) && fin(r.tick) && typeof r.way === 'string' && typeof r.city === 'string' && typeof r.won === 'boolean' && typeof r.line === 'string';
  return (f.triremes as unknown[]).every(triremeOk) && (f.ships as unknown[]).every(shipOk) && (f.pirates as unknown[]).every(pirateOk) && (f.reports as unknown[]).every(reportOk) && seasOk(f);
}

/** The walls: each stretch's tile (in order, once each), its strength and whether it is a gate; every standing stretch, and nothing else, marked as wall on the map. */
function wallsOk(ws: unknown, tiles: readonly number[]): boolean {
  if (!Array.isArray(ws)) return false;
  let last = -1;
  let up = 0;
  for (const p of ws as unknown[]) {
    if (!isObj(p) || !Number.isInteger(p.t) || !fin(p.hp) || typeof p.gate !== 'boolean' || (p.hp as number) < 0) return false;
    if ((p.t as number) <= last || (p.t as number) >= tiles.length) return false;
    last = p.t as number;
    if ((p.hp as number) > 0 && !p.gate) {
      if (tiles[p.t as number] !== -2) return false;
      up++;
    }
  }
  return tiles.filter((t) => t === -2).length === up;
}

const COMPANY_NUMBERS = ['id', 'n', 'barracks', 'emblem', 'x', 'z', 'face', 'along', 'target', 'want', 'raised', 'owed'];
const SOLDIER_NUMBERS = ['id', 'company', 'slot', 'home', 'x', 'z', 'face', 'seg', 'walked', 'hp'];

/** The army: its companies (kind, order, banner, march) and their men (who they are, what they are doing, where). */
function armyOk(a: unknown): boolean {
  if (!isObj(a) || !fin(a.nextId) || !Array.isArray(a.companies) || !Array.isArray(a.soldiers)) return false;
  const companyOk = (c: unknown): boolean =>
    isObj(c) && COMPANY_NUMBERS.every((k) => fin(c[k])) && (c.kind === 'hoplite' || c.kind === 'archer' || c.kind === 'horseman') && ['drill', 'march', 'hold', 'return', 'away'].includes(c.order as string) && (c.away === undefined || fin(c.away)) && nums(c.path) && (c.path as number[]).length % 2 === 0 && typeof c.why === 'string';
  const soldierOk = (x: unknown): boolean =>
    isObj(x) && SOLDIER_NUMBERS.every((k) => fin(x[k])) && ['coming', 'arming', 'ready', 'leaving', 'fallen', 'wounded', 'healing', 'away'].includes(x.state as string) && typeof x.name === 'string' && typeof x.father === 'string' && typeof x.house === 'string' && (x.kin === undefined || ['head', 'son', 'husband', 'brother', 'cousin'].includes(x.kin as string)) && typeof x.armed === 'boolean' && nums(x.path) && (x.path as number[]).length % 2 === 0;
  return a.companies.every(companyOk) && a.soldiers.every(soldierOk);
}

/** Greece: its seed and random numbers, your city's name, and the six cities in order with their rulers, memories and goods. */
function worldOk(w: unknown): boolean {
  if (!isObj(w) || !fin(w.seed) || !nums(w.rng, 4) || typeof w.name !== 'string' || !Array.isArray(w.cities) || w.cities.length !== CITY_IDS.length) return false;
  if (![w.routes, w.deals, w.travellers, w.news, w.gifts, w.raids, w.wars].every(Array.isArray) || !fin(w.nextGift) || !fin(w.contact) || !fin(w.nextDeal) || !fin(w.nextRaid) || !fin(w.nextWar) || !strs(w.feuds) || !Array.isArray(w.loans) || !fin(w.nextLoan) || !Array.isArray(w.expeditions) || !fin(w.nextExpedition)) return false;
  if (!(w.gifts as unknown[]).every(giftOk) || !(w.deals as unknown[]).every(dealOk) || !(w.raids as unknown[]).every(raidOk) || !(w.wars as unknown[]).every(warOk) || !(w.loans as unknown[]).every(loanOk) || !(w.expeditions as unknown[]).every(expeditionOk)) return false;
  const g = TRADE_GOODS.length;
  if (!(w.routes as unknown[]).every(routeOk)) return false;
  if (!(w.travellers as unknown[]).every((t) => isObj(t) && typeof t.kind === 'string' && typeof t.city === 'string' && typeof t.way === 'string' && fin(t.start) && fin(t.dur) && typeof t.homeward === 'boolean')) return false;
  // Slice 31: the sites, and each city's size, lord and record of growth.
  if (!Array.isArray(w.sites) || !(w.sites as unknown[]).every((x) => isObj(x) && typeof x.id === 'string' && typeof x.owner === 'string' && typeof x.bound === 'string' && typeof x.free === 'string' && ['since', 'pop', 'told', 'lands'].every((k) => fin(x[k])))) return false;
  if (!(w.cities as unknown[]).every((c) => isObj(c) && ['pop', 'wealth', 'army', 'fleet', 'lordSince'].every((k) => fin(c[k])) && typeof c.lord === 'string' && Array.isArray(c.grew) && (c.grew as unknown[]).every((g) => isObj(g) && typeof g.kind === 'string' && typeof g.why === 'string' && ['year', 'pop', 'wealth', 'army', 'fleet'].every((k) => fin(g[k]))))) return false;
  return (w.cities as unknown[]).every((c, i) => {
    if (!isObj(c) || c.id !== CITY_IDS[i] || !fin(c.harvest) || !fin(c.outlook) || !fin(c.festival) || typeof c.war !== 'string' || !fin(c.feel) || !fin(c.gave)) return false;
    if (!nums(c.ties, CITY_IDS.length) || !['make', 'need', 'stock', 'yours', 'crop', 'strife', 'feast', 'price', 'trail'].every((k) => nums(c[k], g))) return false;
    if (!Array.isArray(c.bonds) || !c.bonds.every((m: unknown) => isObj(m) && typeof m.kind === 'string' && typeof m.why === 'string' && CITY_IDS.includes(m.city as never) && fin(m.amount) && fin(m.tick) && fin(m.fade))) return false;
    if (![c.history, c.dealt].every((x) => Array.isArray(x) && x.length === g && x.every((h: unknown) => nums(h)))) return false;
    if (!Array.isArray(c.memories) || !c.memories.every((m: unknown) => isObj(m) && typeof m.kind === 'string' && typeof m.why === 'string' && fin(m.amount) && fin(m.tick) && fin(m.fade))) return false;
    const r = c.ruler;
    return r === null || (isObj(r) && typeof r.name === 'string' && typeof r.female === 'boolean' && typeof r.title === 'string' && strs(r.traits) && fin(r.face));
  });
}

const GIFT_NUMBERS = ['id', 'good', 'amount', 'got', 'phase', 'at', 'depot', 'start', 'dur', 'a0', 'a1', 'deal', 'loan'];
const DEAL_NUMBERS = ['id', 'good', 'amount', 'at', 'due', 'gift', 'got', 'ended', 'price', 'done', 'until', 'paid'];
const DEAL_STATES = ['open', 'met', 'late', 'refused', 'lapsed', 'broken', 'taken', 'declined', 'kept', 'ended', 'raided'];

const LOAN_NUMBERS = ['id', 'amount', 'rate', 'months', 'owed', 'deal', 'gift', 'at', 'until', 'start', 'due', 'ended', 'step', 'stepAt', 'fell', 'seized', 'extended', 'raid', 'demand', 'sent'];
const LOAN_STATES = ['asking', 'terms', 'proposed', 'coming', 'offering', 'sending', 'returning', 'running', 'overdue', 'repaying', 'grace', 'repaid', 'refused', 'declined', 'lapsed', 'forgiven', 'collected'];
const whysOk = (x: unknown): boolean => Array.isArray(x) && x.every((y: unknown) => isObj(y) && typeof y.why === 'string' && fin(y.n));

/** A loan either way: its city, side, state, numbers and the reasons for its terms. */
function loanOk(l: unknown): boolean {
  if (!isObj(l) || !RULED.includes(l.city as never) || (l.side !== 'in' && l.side !== 'out') || (l.by !== 'you' && l.by !== 'them') || !LOAN_STATES.includes(l.state as string)) return false;
  if (typeof l.why !== 'string' || ![l.late, l.withhold, l.reminded, l.demanded].every((b) => typeof b === 'boolean') || !whysOk(l.rateWhy) || !whysOk(l.monthsWhy)) return false;
  return LOAN_NUMBERS.every((k) => fin(l[k]));
}

const EXPEDITION_NUMBERS = ['id', 'loan', 'edge', 'start', 'dur', 'a0', 'a1', 'at', 'ours', 'theirs', 'odds', 'fallen', 'coin', 'good', 'goods', 'value', 'ended'];
const EXPEDITION_PHASES = ['mustering', 'marching', 'fighting', 'homeward', 'back', 'done'];

/** An expedition of your companies: its city, kind, phase, way, numbers, companies and men, and its report. */
function expeditionOk(x: unknown): boolean {
  if (!isObj(x) || !RULED.includes(x.city as never) || (x.kind !== 'raid' && x.kind !== 'force') || !EXPEDITION_PHASES.includes(x.phase as string) || !['land', 'sea'].includes(x.by as string)) return false;
  if (typeof x.way !== 'string' || typeof x.won !== 'boolean' || !strs(x.report) || ![x.companies, x.men, x.killed, x.wounded, x.ships].every((a) => nums(a))) return false;
  return EXPEDITION_NUMBERS.every((k) => fin(x[k]));
}

const WAR_NUMBERS = ['id', 'start', 'until', 'menA', 'menB', 'ended'];

/** A war between two rivals: its sides, its way, how it ends, and its numbers. */
function warOk(x: unknown): boolean {
  if (!isObj(x) || !RULED.includes(x.a as never) || !RULED.includes(x.b as never) || !['land', 'sea'].includes(x.by as string)) return false;
  if (typeof x.why !== 'string' || typeof x.way !== 'string' || typeof x.told !== 'boolean' || !(x.fate === 'peace' || RULED.includes(x.fate as never))) return false;
  return WAR_NUMBERS.every((k) => fin(x[k]));
}

const RAID_NUMBERS = ['id', 'deal', 'men', 'start', 'dur', 'a0', 'a1', 'coin', 'alt', 'altAmount', 'edge', 'target', 'ware', 'took', 'ended', 'siege', 'breaches', 'shore', 'ships', 'sunk', 'landed', 'drowned', 'loan'];
const RAID_PHASES = ['threat', 'gathering', 'marching', 'raiding', 'homeward', 'turned', 'done'];

/** A threat and its war band: its city, phase, way and numbers. */
function raidOk(r: unknown): boolean {
  if (!isObj(r) || !CITY_IDS.includes(r.city as never) || !RAID_PHASES.includes(r.phase as string) || !['land', 'sea'].includes(r.by as string)) return false;
  if (typeof r.way !== 'string' || typeof r.aim !== 'string' || typeof r.end !== 'string' || typeof r.fired !== 'boolean' || typeof r.brokeAt !== 'string') return false;
  return RAID_NUMBERS.every((k) => fin(r[k]));
}

/** A ruler's request, offer or demand for tribute: its kind, city, state and numbers. */
function dealOk(d: unknown): boolean {
  if (!isObj(d) || !['request', 'offer', 'tribute', 'threat', 'loanoffer', 'loanask'].includes(d.kind as string) || !CITY_IDS.includes(d.city as never) || !DEAL_STATES.includes(d.state as string)) return false;
  if (typeof d.why !== 'string' || !['', 'buy', 'sell'].includes(d.side as string) || ![d.promised, d.yearly, d.angry].every((b) => typeof b === 'boolean')) return false;
  return DEAL_NUMBERS.every((k) => fin(d[k]));
}

/** A gift on its way: who to whom, by which way, its numbers, and a ship sailing out of the bay. */
function giftOk(g: unknown): boolean {
  if (!isObj(g) || !CITY_IDS.includes(g.from as never) || !CITY_IDS.includes(g.to as never) || (g.by !== 'land' && g.by !== 'sea') || typeof g.way !== 'string' || typeof g.note !== 'string') return false;
  if (!GIFT_NUMBERS.every((k) => fin(g[k])) || ![0, 1, 2].includes(g.phase as number)) return false;
  const sh = g.ship;
  return sh === null || (isObj(sh) && fin(sh.phase) && fin(sh.since) && fin(sh.turned) && nums(sh.path) && (sh.path as number[]).length % 2 === 0);
}

const SHIP_NUMBERS = ['phase', 'due', 'since', 'turned', 'post', 'visits', 'lastAt', 'lastPaid'];
const ROUTE_NUMBERS = ['opened', 'next', 'cost', 'visits', 'lastAt', 'lastPaid', 'lastCost', 'missedAt', 'closed', 'robbed'];
const ROUTE_GOODS = ['sold', 'bought', 'upto', 'hold', 'unloaded', 'lastSold', 'lastBought'];
const VISITOR_NUMBERS = ['phase', 'since', 'turned', 'post', 'stop', 'aside'];

/** A trade route: its city and kind, its numbers, its goods by trade good, its ticks, and a sea route's ship. */
function routeOk(r: unknown): boolean {
  const g = TRADE_GOODS.length;
  if (!isObj(r) || !CITY_IDS.includes(r.city as never) || (r.kind !== 'land' && r.kind !== 'sea') || typeof r.missed !== 'string') return false;
  if (!ROUTE_NUMBERS.every((k) => fin(r[k])) || !ROUTE_GOODS.every((k) => nums(r[k], g))) return false;
  if (![r.sell, r.buy].every((x) => Array.isArray(x) && x.length === g && x.every((v: unknown) => typeof v === 'boolean'))) return false;
  if (r.kind === 'land') return r.ship === null;
  const v = r.ship;
  return isObj(v) && VISITOR_NUMBERS.every((k) => fin(v[k])) && nums(v.path) && (v.path as number[]).length % 2 === 0 && [0, 1, 2, 3, 4, 5].includes(v.phase as number);
}

function tradeOk(t: unknown): boolean {
  if (!isObj(t) || !Array.isArray(t.sell) || t.sell.length !== TRADE_GOODS.length || !t.sell.every((v: unknown) => typeof v === 'boolean')) return false;
  if (!nums(t.keep, TRADE_GOODS.length) || !isObj(t.ship) || !nums(t.lost, TRADE_GOODS.length) || !fin(t.lostAt)) return false;
  const sh = t.ship;
  if (!SHIP_NUMBERS.every((k) => fin(sh[k])) || !nums(sh.hold, TRADE_GOODS.length) || !nums(sh.lastBought, TRADE_GOODS.length) || !nums(sh.path)) return false;
  return (sh.path as number[]).length % 2 === 0 && [0, 1, 2, 3].includes(sh.phase as number);
}

function bookOk(b: unknown): boolean {
  if (!isObj(b) || !fin(b.month) || !Array.isArray(b.now) || !Array.isArray(b.last) || !Array.isArray(b.months)) return false;
  const lineOk = (x: unknown): boolean => isObj(x) && fin(x.ware) && typeof x.kind === 'string' && STOCK_KINDS.includes(x.kind as StockKind) && typeof x.what === 'string' && fin(x.n);
  const monthOk = (m: unknown): boolean => isObj(m) && fin(m.month) && STOCK_KINDS.every((k) => nums(m[k]));
  return [...b.now, ...b.last].every(lineOk) && b.months.every(monthOk);
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
      (e.removedEstates === undefined || (Array.isArray(e.removedEstates) && e.removedEstates.every((v: unknown) => typeof v === 'boolean'))) &&
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
