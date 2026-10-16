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
 * Later makers (the sheep farm, the vineyard and winery) only add rows.
 */
import type { CoastMap } from '../map/bake';
import { grassOf, oliveOf } from './build';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from './clock';
import { CHEESE_BATCH, CHEESE_EVERY, GROW, harvestOf, sendCart } from './food';
import { CHEESE, held, MEAT, OIL, OLIVES, setHeld, WHEAT, type Ware } from './foods';
import { stepLodges } from './hunt';
import { rateOf } from './labour';
import { storeOf } from './stores';
import type { Building, BuildingKind, SimState } from './state';

/** An olive grove's harvest on the best olive ground, fully worked, every OLIVE_GROW ticks (two months). */
export const OLIVE_HARVEST = 400;
export const OLIVE_GROW = 2 * TICKS_PER_MONTH;
/** An olive press makes PRESS_BATCH jars of oil from as many measures of olives every PRESS_EVERY ticks fully worked (300 a month). */
export const PRESS_EVERY = 3 * TICKS_PER_DAY;
export const PRESS_BATCH = 30;

export interface Maker {
  /** What it makes. */
  ware: Ware;
  how: 'crop' | 'batch' | 'hunted';
  /** A crop: ticks of full work to a harvest, and the harvest on its ground. */
  grow?: number;
  yieldOf?(map: CoastMap, b: Building): number;
  /** A batch: ticks of full work to a batch, its size, and how its ground speeds it (1: not at all). */
  every?: number;
  batch?: number;
  ground?(map: CoastMap, b: Building): number;
  /** A batch with an input: what it uses up, measure for measure. */
  input?: Ware;
}

/** The harvest an olive grove brings in on its ground. */
export const olivesOf = (map: CoastMap, g: Building): number => Math.round(OLIVE_HARVEST * oliveOf(map, g.x, g.z, 3));

export const MAKERS: Partial<Record<BuildingKind, Maker>> = {
  farm: { ware: WHEAT, how: 'crop', grow: GROW, yieldOf: harvestOf },
  lodge: { ware: MEAT, how: 'hunted' },
  dairy: { ware: CHEESE, how: 'batch', every: CHEESE_EVERY, batch: CHEESE_BATCH, ground: (map, d) => grassOf(map, d.x, d.z, 3) },
  grove: { ware: OLIVES, how: 'crop', grow: OLIVE_GROW, yieldOf: olivesOf },
  press: { ware: OIL, how: 'batch', every: PRESS_EVERY, batch: PRESS_BATCH, input: OLIVES },
};

/** How far a crop has grown, in eighths (what the renderer shows). */
export const stageOf = (b: Building, m: Maker): number => Math.floor((b.growth / (m.grow ?? 1)) * 8);

/** One maker's tick: its cart clock, its work, and a cart if it is time. */
function stepMaker(s: SimState, map: CoastMap, b: Building, m: Maker): void {
  if (b.clock > 0) b.clock--;
  const store = storeOf(b.kind);
  if (m.how === 'crop') {
    const rate = rateOf(b);
    const grow = m.grow ?? 1;
    if (held(b, m.ware) < store && rate > 0) {
      const before = Math.floor((b.growth / grow) * 8);
      b.growth += rate;
      if (b.growth >= grow) {
        b.growth = 0;
        setHeld(b, m.ware, Math.min(store, held(b, m.ware) + (m.yieldOf ? m.yieldOf(map, b) : 0)));
      }
      if (Math.floor((b.growth / grow) * 8) !== before) s.looks++;
    }
  } else if (m.how === 'batch') {
    const rate = rateOf(b);
    const every = m.every ?? 1;
    const batch = m.batch ?? 0;
    const input = m.input;
    if (held(b, m.ware) < store && rate > 0 && (input === undefined || held(b, input) > 0)) {
      b.growth += m.ground ? rate * m.ground(map, b) : rate;
      if (b.growth >= every) {
        b.growth -= every;
        let made = batch;
        if (input !== undefined) {
          made = Math.min(batch, held(b, input));
          setHeld(b, input, held(b, input) - made);
        }
        setHeld(b, m.ware, Math.min(store, held(b, m.ware) + made));
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
  for (const b of s.buildings) if (b.kind === kind) stepMaker(s, map, b, m);
}

/**
 * Every maker's tick, in a fixed order: farms, lodges (their hunters, then
 * their carts), dairies, then groves and presses (after everything that was
 * there before them, so towns without them run exactly as they did).
 */
export function stepMakers(s: SimState, map: CoastMap): void {
  stepKind(s, map, 'farm');
  stepLodges(s, map);
  stepKind(s, map, 'lodge');
  stepKind(s, map, 'dairy');
  stepKind(s, map, 'grove');
  stepKind(s, map, 'press');
}

/** The oil a press makes a month, fully worked (with olives always in hand). */
export const OIL_MONTH = Math.round((PRESS_BATCH * TICKS_PER_MONTH) / PRESS_EVERY);
