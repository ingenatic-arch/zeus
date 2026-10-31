/**
 * The shared production model: every workplace that turns time and workers
 * (and, for the press, an input) into a ware it keeps in its own store until
 * its ox carts take it away (food.ts: up to three on the road, a load each to
 * the nearest building with room for it; the rooms are in stores.ts).
 *
 * - A *crop* (the wheat farm, the olive grove) grows with its workers to a
 *   harvest, which fills its store by what its ground yields.
 * - A *batch* (the dairy, the olive press) makes a batch every so many ticks
 *   of work, scaled by its ground (the dairy's grass); with an input (the
 *   press's olives) only while it has some in hand, using it up.
 * - *Hunted* (the lodge): its hunters fill its store (hunt.ts).
 *
 * The sheep pasture is a batch by its grass (its flock is sheared), the
 * vineyard a crop like the grove, the winery a batch with an input (grapes)
 * like the press. The copper mine is a batch by its copper (how rich the rock
 * is), the armoury a batch with an input, copper, ten measures to a set.
 *
 * Slice 32: the marble quarry and the loggers' camp are *gathered*, like the
 * lodge: their own walkers fill their store (materials.ts: the quarrymen cut
 * blocks at the face, the loggers fell trees and carry the logs home), and
 * here they only send their carts (the quarry's are sledges).
 */
import type { CoastMap } from '../map/bake';
import { copperOf, grassOf, oliveOf, vineOf } from './build';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from './clock';
import { CHEESE_BATCH, CHEESE_EVERY, GROW, harvestOf, sendCart } from './food';
import { ARMOUR, CHEESE, COPPER, FLEECE, GRAPES, held, MARBLE, MEAT, OIL, OLIVES, setHeld, TIMBER, WHEAT, WINE, type Ware } from './foods';
import { stepLodges } from './hunt';
import { rateOf } from './labour';
import { storeOf } from './stores';
import { note } from './stockbook';
import type { Building, BuildingKind, SimState } from './state';
// Slice 36: horses.
import { HORSES } from './foods';
// Slice 33: crops, fruit and flocks to the season's pace.
import { makerPace } from './seasons';
// Slice 56: a maker blessed by a god works a quarter faster.
import { boonOf } from './pantheon';
// Slice 57.
import { godPace } from './pantheon';

/** An olive grove's harvest on the best olive ground, fully worked, every OLIVE_GROW ticks (two months). */
export const OLIVE_HARVEST = 400;
export const OLIVE_GROW = 2 * TICKS_PER_MONTH;
/** An olive press makes PRESS_BATCH jars of oil from as many measures of olives every PRESS_EVERY ticks fully worked (300 a month). */
export const PRESS_EVERY = 3 * TICKS_PER_DAY;
export const PRESS_BATCH = 30;
/** A sheep pasture shears FLEECE_BATCH bales of fleece every FLEECE_EVERY ticks fully worked on the best grass (200 a month). */
export const FLEECE_EVERY = 3 * TICKS_PER_DAY;
export const FLEECE_BATCH = 20;
/** A vineyard's harvest of grapes on the best vine ground, fully worked, every VINE_GROW ticks (two months). */
export const GRAPE_HARVEST = 400;
export const VINE_GROW = 2 * TICKS_PER_MONTH;
/** A winery makes WINE_BATCH amphorae of wine from as many measures of grapes every WINE_EVERY ticks fully worked (300 a month). */
export const WINE_EVERY = 3 * TICKS_PER_DAY;
export const WINE_BATCH = 30;
/** A copper mine digs MINE_BATCH measures of ore every MINE_EVERY ticks fully worked on the richest rock (200 a month). */
export const MINE_EVERY = 3 * TICKS_PER_DAY;
export const MINE_BATCH = 20;
/** An armoury makes ARMOURY_BATCH sets of armour every ARMOURY_EVERY ticks fully worked, from ARMOUR_COPPER measures of copper a set (20 sets a month from 200 copper). */
export const ARMOURY_EVERY = 3 * TICKS_PER_DAY;
export const ARMOURY_BATCH = 2;
export const ARMOUR_COPPER = 10;
/** Slice 36: a horse farm raises HORSE_BATCH foals to horses every HORSE_EVERY ticks fully worked on the best grass (8 a month), breeding in spring like the flocks. */
export const HORSE_EVERY = 15 * TICKS_PER_DAY;
export const HORSE_BATCH = 4;

export interface Maker {
  /** What it makes. */
  ware: Ware;
  how: 'crop' | 'batch' | 'hunted' | 'gathered';
  /** A crop: ticks of full work to a harvest, and the harvest on its ground. */
  grow?: number;
  yieldOf?(map: CoastMap, b: Building): number;
  /** A batch: ticks of full work to a batch, its size, and how its ground speeds it (1: not at all). */
  every?: number;
  batch?: number;
  ground?(map: CoastMap, b: Building): number;
  /** A batch with an input: what it uses up, measure for measure (or `per` measures of it for each one made). */
  input?: Ware;
  per?: number;
}

/** The harvest an olive grove brings in on its ground. */
export const olivesOf = (map: CoastMap, g: Building): number => Math.round(OLIVE_HARVEST * oliveOf(map, g.x, g.z, 3));
/** The harvest a vineyard brings in on its ground. */
export const grapesOf = (map: CoastMap, v: Building): number => Math.round(GRAPE_HARVEST * vineOf(map, v.x, v.z, 3));

export const MAKERS: Partial<Record<BuildingKind, Maker>> = {
  farm: { ware: WHEAT, how: 'crop', grow: GROW, yieldOf: harvestOf },
  lodge: { ware: MEAT, how: 'hunted' },
  dairy: { ware: CHEESE, how: 'batch', every: CHEESE_EVERY, batch: CHEESE_BATCH, ground: (map, d) => grassOf(map, d.x, d.z, 3) },
  grove: { ware: OLIVES, how: 'crop', grow: OLIVE_GROW, yieldOf: olivesOf },
  press: { ware: OIL, how: 'batch', every: PRESS_EVERY, batch: PRESS_BATCH, input: OLIVES },
  pasture: { ware: FLEECE, how: 'batch', every: FLEECE_EVERY, batch: FLEECE_BATCH, ground: (map, p) => grassOf(map, p.x, p.z, 3) },
  vineyard: { ware: GRAPES, how: 'crop', grow: VINE_GROW, yieldOf: grapesOf },
  winery: { ware: WINE, how: 'batch', every: WINE_EVERY, batch: WINE_BATCH, input: GRAPES },
  mine: { ware: COPPER, how: 'batch', every: MINE_EVERY, batch: MINE_BATCH, ground: (map, m) => copperOf(map, m.x, m.z, 2) },
  armoury: { ware: ARMOUR, how: 'batch', every: ARMOURY_EVERY, batch: ARMOURY_BATCH, input: COPPER, per: ARMOUR_COPPER },
  // Slice 32.
  quarry: { ware: MARBLE, how: 'gathered' },
  loggers: { ware: TIMBER, how: 'gathered' },
  // Slice 36.
  horsefarm: { ware: HORSES, how: 'batch', every: HORSE_EVERY, batch: HORSE_BATCH, ground: (map, h) => grassOf(map, h.x, h.z, 3) },
};

/** How far a crop has grown, in eighths (what the renderer shows). */
export const stageOf = (b: Building, m: Maker): number => Math.floor((b.growth / (m.grow ?? 1)) * 8);

/** One maker's tick: its cart clock, its work (at the season's `pace`: slice 33), and a cart if it is time. */
function stepMaker(s: SimState, map: CoastMap, b: Building, m: Maker, pace: number): void {
  if (b.clock > 0) b.clock--;
  const store = storeOf(b.kind);
  if (m.how === 'crop') {
    const rate = rateOf(b);
    const grow = m.grow ?? 1;
    if (held(b, m.ware) < store && rate > 0) {
      const before = Math.floor((b.growth / grow) * 8);
      b.growth += rate * pace;
      if (b.growth >= grow) {
        b.growth = 0;
        const had = held(b, m.ware);
        setHeld(b, m.ware, Math.min(store, had + (m.yieldOf ? m.yieldOf(map, b) : 0)));
        note(s, m.ware, 'made', b.kind, held(b, m.ware) - had);
      }
      if (Math.floor((b.growth / grow) * 8) !== before) s.looks++;
    }
  } else if (m.how === 'batch') {
    const rate = rateOf(b);
    const every = m.every ?? 1;
    const batch = m.batch ?? 0;
    const input = m.input;
    const per = m.per ?? 1;
    if (held(b, m.ware) < store && rate > 0 && (input === undefined || held(b, input) >= per)) {
      b.growth += (m.ground ? rate * m.ground(map, b) : rate) * pace;
      if (b.growth >= every) {
        b.growth -= every;
        let made = batch;
        if (input !== undefined) {
          made = Math.min(batch, Math.floor(held(b, input) / per));
          setHeld(b, input, held(b, input) - made * per);
          note(s, input, 'used', b.kind, made * per);
        }
        const had = held(b, m.ware);
        setHeld(b, m.ware, Math.min(store, had + made));
        note(s, m.ware, 'made', b.kind, held(b, m.ware) - had);
        s.looks++;
      }
    }
  }
  sendCart(s, map.size, b, m.ware);
}

/** Every maker of a kind takes its tick. */
function stepKind(s: SimState, map: CoastMap, kind: BuildingKind): void {
  const m = MAKERS[kind];
  if (!m) return;
  const pace = makerPace(s, kind);
  // (Slice 56: and a quarter faster while a god's blessing is on it.)
  // (Slice 57: and a god's blessing or curse on the whole kind: Demeter's farms doubled, blight, the olives failed.)
  const god = godPace(s, kind);
  for (const b of s.buildings) if (b.kind === kind) stepMaker(s, map, b, m, pace * boonOf(s, b) * god);
}

/**
 * Every maker's tick, in a fixed order: farms, lodges (their hunters, then
 * their carts), dairies, groves and presses, then pastures, vineyards and
 * wineries, then copper mines and armouries (each after everything that was
 * there before it, so towns without them run exactly as they did).
 */
export function stepMakers(s: SimState, map: CoastMap): void {
  stepKind(s, map, 'farm');
  stepLodges(s, map);
  stepKind(s, map, 'lodge');
  stepKind(s, map, 'dairy');
  stepKind(s, map, 'grove');
  stepKind(s, map, 'press');
  stepKind(s, map, 'pasture');
  stepKind(s, map, 'vineyard');
  stepKind(s, map, 'winery');
  stepKind(s, map, 'mine');
  stepKind(s, map, 'armoury');
  // Slice 32: the quarries' sledges and the loggers' carts (after everything older, so towns without them run as they did).
  stepKind(s, map, 'quarry');
  stepKind(s, map, 'loggers');
  // Slice 36: the horse farms (after everything older).
  stepKind(s, map, 'horsefarm');
}

/** The oil a press makes a month, fully worked (with olives always in hand). */
export const OIL_MONTH = Math.round((PRESS_BATCH * TICKS_PER_MONTH) / PRESS_EVERY);
/** The fleece a pasture shears a month on the best grass, fully worked. */
export const FLEECE_MONTH = Math.round((FLEECE_BATCH * TICKS_PER_MONTH) / FLEECE_EVERY);
/** The wine a winery makes a month, fully worked (with grapes always in hand). */
export const WINE_MONTH = Math.round((WINE_BATCH * TICKS_PER_MONTH) / WINE_EVERY);
/** The copper a mine digs a month on the richest rock, and the armour an armoury makes a month, fully worked. */
export const COPPER_MONTH = Math.round((MINE_BATCH * TICKS_PER_MONTH) / MINE_EVERY);
export const ARMOUR_MONTH = Math.round((ARMOURY_BATCH * TICKS_PER_MONTH) / ARMOURY_EVERY);
