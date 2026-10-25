/**
 * The shared storage model: what each kind of building holds of each ware.
 *
 * A *store* (the granary, the storehouse) has a room for each ware it takes:
 * carts bring wares to the nearest store with room for them, and the agora's
 * porters fetch from it. A maker that works up an input (the olive press) has
 * a room for that input too, so carts bring it there. Every maker keeps what
 * it makes in its own store until its carts take it away.
 *
 * Plain data: later wares (the quay's) only add rows and numbers here.
 */
import { ARMOUR, coming, COPPER, FLEECE, GRAPES, held, HORSES, MARBLE, OIL, OLIVES, TIMBER, WARES, WINE, type Ware } from './foods';
import type { Building, BuildingKind } from './state';

/** What a granary holds of wheat… */
export const GRANARY_CAP = 3200;
/** …and of each food (each has its own room: wheat, meat, cheese). */
export const GRANARY_ROOM = [GRANARY_CAP, 1200, 1200];
/** What a storehouse holds of each good: oil, fleece and wine, each in its own room. */
export const STOREHOUSE_OIL = 1600;
export const STOREHOUSE_FLEECE = 1200;
export const STOREHOUSE_WINE = 1200;
/** …and of copper ore and armour (sets). */
export const STOREHOUSE_COPPER = 800;
export const STOREHOUSE_ARMOUR = 120;
/** …and of blocks of marble and logs of timber (slice 32). */
export const STOREHOUSE_MARBLE = 800;
export const STOREHOUSE_TIMBER = 800;
/** …and horses in its stalls (slice 36). */
export const STOREHOUSE_HORSES = 40;
/** What an armoury holds of copper waiting for its smiths. */
export const ARMOURY_COPPER = 200;
/** What an olive press holds of olives waiting to be pressed, and a winery of grapes. */
export const PRESS_OLIVES = 600;
export const WINERY_GRAPES = 600;

/** What a farm's barn holds; when full, nothing more grows. */
export const BARN = 960;
/** What a hunting lodge's store and a dairy's hold. */
export const LODGE_STORE = 800;
export const DAIRY_STORE = 800;
/** What an olive grove's store holds of picked olives, and an olive press of jars of oil. */
export const GROVE_STORE = 600;
export const PRESS_STORE = 600;
/** What a sheep pasture's shed holds of bales of fleece, a vineyard's of picked grapes, and a winery of amphorae of wine. */
export const PASTURE_STORE = 400;
export const VINEYARD_STORE = 600;
export const WINERY_STORE = 600;
/** What a copper mine's heap holds of ore, an armoury's racks of sets of armour, and a barracks' racks of armour for its men. */
export const MINE_STORE = 400;
export const ARMOURY_STORE = 40;
export const BARRACKS_RACK = 64;
/** What a quarry's stack holds of cut blocks, and a loggers' camp's of logs (slice 32). */
export const QUARRY_STORE = 200;
export const LOGGERS_STORE = 200;
/** What a horse farm's paddock holds of horses (slice 36). */
export const HORSEFARM_STORE = 16;

/** A store's room for each ware, in ware order (wheat, meat, cheese, olives, oil, fleece, grapes, wine, copper, armour, marble, timber). */
const roomsOf = (rooms: Partial<Record<Ware, number>>): number[] => WARES.map((w) => rooms[w] ?? 0);

/** The rooms of every building that takes deliveries: stores, and makers' inputs. */
export const ROOMS: Partial<Record<BuildingKind, readonly number[]>> = {
  granary: roomsOf({ 0: GRANARY_ROOM[0], 1: GRANARY_ROOM[1], 2: GRANARY_ROOM[2] }),
  storehouse: roomsOf({ [OIL]: STOREHOUSE_OIL, [FLEECE]: STOREHOUSE_FLEECE, [WINE]: STOREHOUSE_WINE, [COPPER]: STOREHOUSE_COPPER, [ARMOUR]: STOREHOUSE_ARMOUR, [MARBLE]: STOREHOUSE_MARBLE, [TIMBER]: STOREHOUSE_TIMBER, [HORSES]: STOREHOUSE_HORSES }),
  press: roomsOf({ [OLIVES]: PRESS_OLIVES }),
  winery: roomsOf({ [GRAPES]: WINERY_GRAPES }),
  armoury: roomsOf({ [COPPER]: ARMOURY_COPPER }),
};

/** The kinds the agora's porters fetch from (a press's olives and a winery's grapes are not for sale). */
export const STORES: readonly BuildingKind[] = ['granary', 'storehouse'];
export const isStore = (kind: BuildingKind): boolean => STORES.includes(kind);

/** What a maker's own store holds of what it makes. */
export const OWN_STORE: Partial<Record<BuildingKind, number>> = {
  farm: BARN,
  lodge: LODGE_STORE,
  dairy: DAIRY_STORE,
  grove: GROVE_STORE,
  press: PRESS_STORE,
  pasture: PASTURE_STORE,
  vineyard: VINEYARD_STORE,
  winery: WINERY_STORE,
  mine: MINE_STORE,
  armoury: ARMOURY_STORE,
  barracks: BARRACKS_RACK,
  quarry: QUARRY_STORE,
  loggers: LOGGERS_STORE,
  // Slice 36.
  horsefarm: HORSEFARM_STORE,
};

/** A building's room for a ware (0: it doesn't take it). */
export const roomOf = (kind: BuildingKind, w: Ware): number => ROOMS[kind]?.[w] ?? 0;

/**
 * Room left in a building for a ware: its room, less what it holds and what
 * carts are bringing (0 if it doesn't take it). Slice 48: a store's rule for
 * the ware has its say: none while it doesn't accept it, is emptying it or is
 * paused, and only up to its limit.
 */
export function roomFor(g: Building, w: Ware): number {
  const room = roomOf(g.kind, w);
  if (room <= 0) return 0;
  const r = g.rules?.[w] ?? 0;
  if (r === 0 && !g.paused) return room - held(g, w) - coming(g, w);
  if (!takes(g, w)) return 0;
  return limitOf(g, w) - held(g, w) - coming(g, w);
}

/** What a maker's own store holds of what it makes (a farm's barn, a lodge's rack, a press's jars…). */
export const storeOf = (kind: BuildingKind): number => OWN_STORE[kind] ?? 0;

// ---------------------------------------------------------------------------
// Slice 48: a store's rules.

/**
 * What a granary or storehouse does with each ware it has room for, as in the
 * original: accept it (as stores always have), not accept it, get it (its
 * carts fetch it from other stores) or empty it (its carts take it out to
 * other stores). And how full it fills: all of its room, three quarters, half
 * or a quarter. One number a ware (`rules`, in ware order): the mode in its
 * low two bits, the limit's quarters cut in the next two. 0 is accept, all of
 * it: what a store did before rules.
 */
export const ACCEPT = 0;
export const REFUSE = 1;
export const GET = 2;
export const EMPTY = 3;
export type StoreMode = 0 | 1 | 2 | 3;
export const MODES: readonly StoreMode[] = [ACCEPT, REFUSE, GET, EMPTY];
/** The limits, by how many quarters of the room are cut: 0 all, 1 three quarters, 2 half, 3 a quarter. */
export const LIMITS = [0, 1, 2, 3] as const;
export const MODE_NAMES = ['Accept', 'Don’t accept', 'Get', 'Empty'] as const;
export const LIMIT_NAMES = ['All', '¾', '½', '¼'] as const;
/** The rule's number for a mode and a limit. */
export const ruleOf = (mode: number, limit: number): number => (mode & 3) | ((limit & 3) << 2);
/** A store's mode for a ware (accept for any other building). */
export const modeOf = (g: Building, w: Ware): StoreMode => ((g.rules?.[w] ?? 0) & 3) as StoreMode;
/** How many quarters of its room a store's limit for a ware cuts (0: none). */
export const cutOf = (g: Building, w: Ware): number => ((g.rules?.[w] ?? 0) >> 2) & 3;
/** How much of a ware a store fills up to: its room, less its limit's cut. */
export const limitOf = (g: Building, w: Ware): number => Math.floor((roomOf(g.kind, w) * (4 - cutOf(g, w))) / 4);
/** Does a building take deliveries of a ware: it has room for it, and (a store) is open and accepts it or gets it? */
export const takes = (g: Building, w: Ware): boolean => roomOf(g.kind, w) > 0 && !g.paused && (modeOf(g, w) === ACCEPT || modeOf(g, w) === GET);
/** A new building's rules: none (a store accepts everything, all of its room, until it is given one). */
export const freshRules = (kind: BuildingKind): number[] => (void kind, []);
/** Has a store any rule but the first (so its carts may have work)? */
export const hasRules = (g: Building): boolean => !!g.rules?.some((r) => r !== 0);

/**
 * How a carrier fetching a ware from the stores ranks a store (for nearestBy
 * in food.ts): 0 never (it is paused: nobody there to load him), 2 first (it
 * is emptying the ware), 1 otherwise. Any other building ranks 1.
 */
export const fromStores =
  (w: Ware | readonly Ware[]) =>
  (g: Building): number => {
    if (!isStore(g.kind)) return 1;
    if (g.paused) return 0;
    return (typeof w === 'number' ? modeOf(g, w) === EMPTY : w.some((x) => modeOf(g, x) === EMPTY && held(g, x) > 0)) ? 2 : 1;
  };
