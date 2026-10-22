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
import { ARMOUR, coming, COPPER, FLEECE, GRAPES, held, MARBLE, OIL, OLIVES, TIMBER, WARES, WINE, type Ware } from './foods';
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

/** A store's room for each ware, in ware order (wheat, meat, cheese, olives, oil, fleece, grapes, wine, copper, armour, marble, timber). */
const roomsOf = (rooms: Partial<Record<Ware, number>>): number[] => WARES.map((w) => rooms[w] ?? 0);

/** The rooms of every building that takes deliveries: stores, and makers' inputs. */
export const ROOMS: Partial<Record<BuildingKind, readonly number[]>> = {
  granary: roomsOf({ 0: GRANARY_ROOM[0], 1: GRANARY_ROOM[1], 2: GRANARY_ROOM[2] }),
  storehouse: roomsOf({ [OIL]: STOREHOUSE_OIL, [FLEECE]: STOREHOUSE_FLEECE, [WINE]: STOREHOUSE_WINE, [COPPER]: STOREHOUSE_COPPER, [ARMOUR]: STOREHOUSE_ARMOUR, [MARBLE]: STOREHOUSE_MARBLE, [TIMBER]: STOREHOUSE_TIMBER }),
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
};

/** A building's room for a ware (0: it doesn't take it). */
export const roomOf = (kind: BuildingKind, w: Ware): number => ROOMS[kind]?.[w] ?? 0;

/** Room left in a building for a ware: its room, less what it holds and what carts are bringing (0 if it doesn't take it). */
export function roomFor(g: Building, w: Ware): number {
  const room = roomOf(g.kind, w);
  return room > 0 ? room - held(g, w) - coming(g, w) : 0;
}

/** What a maker's own store holds of what it makes (a farm's barn, a lodge's rack, a press's jars…). */
export const storeOf = (kind: BuildingKind): number => OWN_STORE[kind] ?? 0;
