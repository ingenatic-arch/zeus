/**
 * Reading the city's wares for the side panel: what each is called, how much
 * the city holds and where, and what the stock book says it made, used, sold,
 * bought and lost, this month, last month and over the year. Pure reads of
 * the state; nothing here changes it. A ware added later (phase 3's) needs
 * only a row in WARE_INFO, and shows up everywhere else by itself.
 */
import { districtTitle } from '../map/districts';
import { centreOf } from './buildings';
import { TICKS_PER_MONTH } from './clock';
import { ARMOUR, CHEESE, COPPER, FLEECE, GRAPES, held, MARBLE, MEAT, OIL, OLIVES, TIMBER, WARES, WHEAT, WINE, type Ware } from './foods';
import { rateOf } from './labour';
import { MAKERS } from './production';
import { districtOfLine, STOCK_KINDS } from './stockbook';
import { OWN_STORE, ROOMS } from './stores';
import type { Building, BuildingKind, SimState, StockKind, StockLine, StockMonth } from './state';

/** How the panel names and groups a ware. */
export interface WareInfo {
  name: string;
  /** How its measures are counted ("measures", "jars", "bales", "amphorae"). */
  unit: string;
  /** Food (eaten as a meal), a good (sold at a stall) or from the land (worked up into a good). */
  group: 'food' | 'goods' | 'land' | 'arms' | 'building';
  /** Its colour (its swatch, its bar in the year's chart). */
  colour: string;
}

export const WARE_INFO: Record<Ware, WareInfo> = {
  [WHEAT]: { name: 'Wheat', unit: 'measures', group: 'food', colour: '#c9a155' },
  [MEAT]: { name: 'Meat', unit: 'measures', group: 'food', colour: '#b5524a' },
  [CHEESE]: { name: 'Cheese', unit: 'measures', group: 'food', colour: '#e6c450' },
  [OLIVES]: { name: 'Olives', unit: 'measures', group: 'land', colour: '#6f7d3c' },
  [OIL]: { name: 'Olive oil', unit: 'jars', group: 'goods', colour: '#8aa83a' },
  [FLEECE]: { name: 'Fleece', unit: 'bales', group: 'goods', colour: '#c8b68a' },
  [GRAPES]: { name: 'Grapes', unit: 'measures', group: 'land', colour: '#7a3a78' },
  [WINE]: { name: 'Wine', unit: 'amphorae', group: 'goods', colour: '#8e2f4e' },
  [COPPER]: { name: 'Copper', unit: 'measures', group: 'land', colour: '#4f9a86' },
  [ARMOUR]: { name: 'Armour', unit: 'sets', group: 'arms', colour: '#b0803a' },
  // Slice 32: marble and timber, for building.
  [MARBLE]: { name: 'Marble', unit: 'blocks', group: 'building', colour: '#d8d2c2' },
  [TIMBER]: { name: 'Timber', unit: 'logs', group: 'building', colour: '#8a5a32' },
};

/** A ware's panel info (a plain fallback for one with no row yet). */
export const wareInfo = (w: Ware): WareInfo => WARE_INFO[w] ?? { name: `Ware ${w}`, unit: 'measures', group: 'goods', colour: '#b88a50' };

/** The groups in the order the panel lists them, with their headings. */
export const WARE_GROUPS: ReadonlyArray<{ group: WareInfo['group']; title: string }> = [
  { group: 'food', title: 'Food' },
  { group: 'goods', title: 'Goods' },
  { group: 'land', title: 'From the land' },
  { group: 'arms', title: 'Arms' },
  // Slice 32.
  { group: 'building', title: 'For building' },
];

/** Every ware the panel lists, in its order: by group, then by ware. */
export const panelWares = (): Ware[] => WARE_GROUPS.flatMap((g) => WARES.filter((w) => wareInfo(w).group === g.group));

/** A place in the city holding a ware. */
export interface Holding {
  b: Building;
  n: number;
  /** What it can hold of the ware (0: no fixed room, like a stall). */
  room: number;
}

/** What the city holds of a ware: in all, by kind of place, and each place. */
export interface WareStock {
  total: number;
  /** In stores (granaries, storehouses), in makers' own stores, at stalls, on the quay, and on carts and porters' backs on the way. */
  stores: number;
  makers: number;
  stalls: number;
  quay: number;
  moving: number;
  /** Every building holding some, most first. */
  places: Holding[];
}

/** What a building can hold of a ware (0: no set room). */
export function roomIn(b: Building, w: Ware): number {
  const room = ROOMS[b.kind]?.[w] ?? 0;
  if (room > 0) return room;
  return MAKERS[b.kind]?.ware === w ? (OWN_STORE[b.kind] ?? 0) : 0;
}

/** What the city holds of a ware now. */
export function stockOf(s: SimState, w: Ware): WareStock {
  const out: WareStock = { total: 0, stores: 0, makers: 0, stalls: 0, quay: 0, moving: 0, places: [] };
  for (const b of s.buildings) {
    if (b.kind === 'home') continue;
    const n = held(b, w);
    if (n <= 0) continue;
    out.total += n;
    if (b.kind === 'granary' || b.kind === 'storehouse') out.stores += n;
    else if (b.kind === 'agora') out.stalls += n;
    else if (b.kind === 'trading' || b.kind === 'yard') out.quay += n;
    else out.makers += n;
    out.places.push({ b, n, room: roomIn(b, w) });
  }
  for (const k of s.walkers) {
    // Carts and dockers carry one ware in `load`; the food porter wheat in `load` and meat and cheese in `meat` and `cheese`.
    let n = 0;
    if (k.kind === 'cart' || k.kind === 'sledge' || k.kind === 'oxcart' || k.kind === 'docker' || (k.kind === 'porter' && k.food > CHEESE)) n = k.food === w ? k.load : 0;
    else if (k.kind === 'porter') n = w === WHEAT ? k.load : w === MEAT ? k.meat : w === CHEESE ? k.cheese : 0;
    // (A hunter's kill is the city's once he is home with it: that is when the book counts it made.)
    if (n > 0) {
      out.moving += n;
      out.total += n;
    }
  }
  out.places.sort((a, b) => b.n - a.n || a.b.id - b.b.id);
  return out;
}

/** A month's totals of a ware, by kind, and its net (made and bought, less used, sold and lost). */
export interface WareMonth {
  made: number;
  used: number;
  sold: number;
  bought: number;
  lost: number;
  net: number;
}

const netOf = (m: Omit<WareMonth, 'net'>): WareMonth => ({ ...m, net: m.made + m.bought - m.used - m.sold - m.lost });

/** A ware's totals from a month's lines. */
export function totalsOf(lines: readonly StockLine[], w: Ware): WareMonth {
  const t = { made: 0, used: 0, sold: 0, bought: 0, lost: 0 };
  for (const l of lines) if (l.ware === w) t[l.kind] += l.n;
  return netOf(t);
}

/** A ware's totals from a month in short. */
export const monthOf = (m: StockMonth, w: Ware): WareMonth => netOf({ made: m.made[w] ?? 0, used: m.used[w] ?? 0, sold: m.sold[w] ?? 0, bought: m.bought[w] ?? 0, lost: m.lost[w] ?? 0 });

/** This month's lines and last month's as of `tick` (the book turns its month on the first tick, so they are up to date), and how far into this month we are (0 to 1). */
export function bookNow(s: SimState): { now: readonly StockLine[]; last: readonly StockLine[]; months: readonly StockMonth[]; into: number; full: boolean } {
  const b = s.stocks;
  const m = Math.floor(s.tick / TICKS_PER_MONTH);
  const current = b.month === m;
  const into = (s.tick % TICKS_PER_MONTH) / TICKS_PER_MONTH;
  // A last month the book saw from its start (a town loaded mid-month only has part of one).
  const full = current && b.months.length > 0 && b.months[b.months.length - 1].month === m - 1;
  return { now: current ? b.now : [], last: current ? b.last : b.month === m - 1 ? b.now : [], months: b.months, into, full };
}

/** One line of a ware's breakdown: what it is about, and this month's and last month's amounts. */
export interface FlowRow {
  kind: StockKind;
  what: string;
  label: string;
  now: number;
  last: number;
  /** Where it is about on the map (a district's middle), if anywhere. */
  at?: { x: number; z: number };
}

/** What each maker kind is called, many of them (for the breakdown). */
const MAKER_NAMES: Partial<Record<BuildingKind, string>> = {
  farm: 'Wheat farms',
  lodge: 'Hunting lodges',
  dairy: 'Dairies',
  grove: 'Olive groves',
  press: 'Olive presses',
  pasture: 'Sheep pastures',
  vineyard: 'Vineyards',
  winery: 'Wineries',
  mine: 'Copper mines',
  armoury: 'Armouries',
  // Slice 32 (its review: they read "Quarry" and "Loggers").
  quarry: 'Marble quarries',
  loggers: 'Loggers’ camps',
};

/** Who a ware was sold to or bought from (the stock book's lines by city: see routes.ts; slice 31's newcomers too, or the price of peace sent to Argos read "argos"). */
const TRADER_NAMES: Record<string, string> = { athens: 'Athens', sparta: 'Sparta', corinth: 'Corinth', troy: 'Troy', thebes: 'Thebes', argos: 'Argos', knossos: 'Knossos', rhodes: 'Rhodes', memphis: 'Memphis' };

/** What a line is called in the breakdown. */
export function flowLabel(kind: StockKind, what: string, w: Ware): string {
  const d = districtOfLine(what);
  if (d >= 0) return `Homes ${districtTitle(d).replace(/^./, (c) => c.toLowerCase())}`;
  if (kind === 'used') {
    if (what === 'press') return 'Pressed into oil';
    if (what === 'winery') return 'Trodden into wine';
    if (what === 'armoury') return 'Hammered into armour';
    if (what === 'barracks') return 'Issued to soldiers (less what came back)';
  }
  if (kind === 'sold' && what.startsWith('peace:')) return `Sent to ${TRADER_NAMES[what.slice(6)] ?? what.slice(6)}, the price of peace`;
  if (kind === 'sold' && (what.startsWith('sent:') || what.startsWith('tribute:'))) {
    const at = what.indexOf(':');
    const city = TRADER_NAMES[what.slice(at + 1)] ?? what.slice(at + 1).replace(/^./, (c) => c.toUpperCase());
    return what.startsWith('sent:') ? `Sent to ${city}, as they asked` : `Tribute to ${city}`;
  }
  // (Slice 28: seized by a lender against your debt; taken from a debtor by your soldiers.)
  if (kind === 'lost' && what.startsWith('seized:')) return `Seized by ${TRADER_NAMES[what.slice(7)] ?? what.slice(7)} against your debt`;
  if (kind === 'bought' && what.startsWith('taken:')) return `Taken from ${TRADER_NAMES[what.slice(6)] ?? what.slice(6)} by your soldiers`;
  // Slice 34: a vassal's tribute.
  if (kind === 'bought' && what.startsWith('vassal:')) return `Tribute from ${TRADER_NAMES[what.slice(7)] ?? what.slice(7)}, your vassal`;
  if ((kind === 'sold' || kind === 'bought') && what.startsWith('gift:')) {
    const city = TRADER_NAMES[what.slice(5)] ?? what.slice(5).replace(/^./, (c) => c.toUpperCase());
    return kind === 'sold' ? `A gift to ${city}` : `A gift from ${city}`;
  }
  if (kind === 'sold' || kind === 'bought') return what === 'tyre' ? 'The ship from Tyre' : (TRADER_NAMES[what] ?? what.replace(/^./, (c) => c.toUpperCase()));
  if (kind === 'lost' && what.startsWith('raid:')) {
    const city = TRADER_NAMES[what.slice(5)] ?? what.slice(5).replace(/^./, (c) => c.toUpperCase());
    return `Carried off by ${city.endsWith('s') ? `${city}’` : `${city}’s`} raiders`;
  }
  if (kind === 'lost') return what === 'fire' ? 'Burnt' : what === 'collapse' ? 'Fell in' : what === 'cleared' ? 'Cleared away' : what;
  const kindName = MAKER_NAMES[what as BuildingKind];
  if (kindName) return kindName;
  return `${what.replace(/^./, (c) => c.toUpperCase())}${w < 0 ? '' : ''}`;
}

/** A ware's breakdown, this month and last, by kind then size. */
export function flowRows(s: SimState, w: Ware, districts: ReadonlyArray<{ x: number; z: number }>): FlowRow[] {
  const { now, last } = bookNow(s);
  const rows = new Map<string, FlowRow>();
  for (const [lines, key] of [[now, 'now'], [last, 'last']] as const) {
    for (const l of lines) {
      if (l.ware !== w) continue;
      const id = `${l.kind}:${l.what}`;
      let r = rows.get(id);
      if (!r) {
        const d = districtOfLine(l.what);
        r = { kind: l.kind, what: l.what, label: flowLabel(l.kind, l.what, w), now: 0, last: 0, at: d >= 0 && districts[d] ? { x: districts[d].x, z: districts[d].z } : undefined };
        rows.set(id, r);
      }
      r[key] += l.n;
    }
  }
  const size = (r: FlowRow): number => Math.abs(r.now) + Math.abs(r.last);
  return [...rows.values()].filter((r) => r.now !== 0 || r.last !== 0).sort((a, b) => STOCK_KINDS.indexOf(a.kind) - STOCK_KINDS.indexOf(b.kind) || size(b) - size(a) || a.label.localeCompare(b.label));
}

/** The makers of a ware: how many, and how many are short-handed (or idle). */
export function makersOf(s: SimState, w: Ware): { kind: BuildingKind | ''; count: number; short: number; idle: number } {
  let kind: BuildingKind | '' = '';
  let count = 0;
  let short = 0;
  let idle = 0;
  for (const [k, m] of Object.entries(MAKERS) as Array<[BuildingKind, NonNullable<(typeof MAKERS)[BuildingKind]>]>) {
    if (m.ware !== w) continue;
    kind = k;
    for (const b of s.buildings) {
      if (b.kind !== k) continue;
      count++;
      const r = rateOf(b);
      if (r <= 0) idle++;
      else if (r < 1) short++;
    }
  }
  return { kind, count, short, idle };
}

/** The users of a ware as an input (the olive press, the winery). */
export function usersOf(s: SimState, w: Ware): { kind: BuildingKind | ''; count: number } {
  for (const [k, m] of Object.entries(MAKERS) as Array<[BuildingKind, NonNullable<(typeof MAKERS)[BuildingKind]>]>) {
    if (m.input === w) return { kind: k, count: s.buildings.filter((b) => b.kind === k).length };
  }
  return { kind: '', count: 0 };
}

/** The middle of a building (for flying the camera to it). */
export const middleOf = (b: Building): { x: number; z: number } => {
  const [x, z] = centreOf(b);
  return { x, z };
};
