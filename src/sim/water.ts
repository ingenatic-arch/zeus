/**
 * Fountains and their water carriers.
 *
 * A fountain beside a road, with workers, sends out a water carrier. She
 * walks her round (src/sim/rounds.ts) never further than CARRIER_RANGE road
 * steps from her fountain, and every home beside a road tile she stands on
 * has water for WATER_LASTS ticks. A short-handed fountain lets her rest
 * longer between rounds; with nobody working it, she doesn't go out at all.
 */
import type { CoastMap } from '../map/bake';
import { findBuilding, HOME_CAPACITY, HUT } from './buildings';
import { TICKS_PER_MONTH } from './clock';
import { rateOf } from './labour';
import { roadSearch, type Search } from './roads';
import { moveRounds, roadsBeside, sendOut, type ServiceSpec } from './rounds';
import type { Building, SimState, Walker } from './state';
import { besideRoad, CARRIER_SPEED } from './walk';

/** How far by road from her fountain a water carrier ever goes: her reach. */
export const CARRIER_RANGE = 32;
/** Road tiles she hadn't walked yet this round that she walks out on (wandering within her reach) before she turns for home. */
export const CARRIER_WALK = 48;
/** How long a home keeps its water after she passes (four months). */
export const WATER_LASTS = 4 * TICKS_PER_MONTH;
/** How long after its water runs out a hut goes back to a tent (two months, warning all the while). */
export { DECLINE_AFTER as HUT_DECLINE_AFTER } from './folk';
/** Ticks before the first carrier sets off from a new fountain. */
export const FIRST_CARRIER = 20;
/** Ticks a carrier rests at home before the next round, with the fountain fully staffed. */
export const CARRIER_REST = 30;

export { HUT, roadsBeside };

const near: Building[] = [];

/** The water carrier's round. */
export const WATER: ServiceSpec = {
  record: (s) => s.rounds.water,
  range: CARRIER_RANGE,
  walk: CARRIER_WALK,
  speed: CARRIER_SPEED,
  score: (b) => (b.kind === 'home' && b.level > 0 ? b.waterUntil : Infinity),
  serve(s: SimState, size: number, t: number) {
    const until = s.tick + WATER_LASTS;
    for (const b of besideRoad(s, size, t, near)) if (b.kind === 'home' && b.waterUntil < until) b.waterUntil = until;
  },
  rest: (b) => restFor(b, CARRIER_REST),
};

/** How long a building rests between walkers: longer when short of workers. */
export function restFor(b: Building, rest: number): number {
  const r = rateOf(b);
  return r > 0 ? Math.ceil(rest / r) : rest;
}

/** How far by road each road tile is from the nearest fountain (dist -1: no fountain reaches it). */
export function waterReach(s: SimState, size: number): Search {
  const sources: number[] = [];
  for (const b of s.buildings) if (b.kind === 'fountain') sources.push(...roadsBeside(s, size, b));
  return roadSearch(s, size, sources);
}

/** The fewest road steps from a building's roadside to the nearest source in a search, or -1. */
export function stepsToFountain(reach: Search, s: SimState, size: number, b: Building): number {
  let best = -1;
  for (const t of roadsBeside(s, size, b)) {
    const d = reach.dist[t];
    if (d >= 0 && (best < 0 || d < best)) best = d;
  }
  return best;
}

/** Fountains: send out a carrier when one is due and someone works there. */
export function stepFountains(s: SimState, map: CoastMap): void {
  const size = map.size;
  for (const f of s.buildings) {
    if (f.kind !== 'fountain' || f.walker !== 0) continue;
    if (--f.clock > 0) continue;
    // No road to walk, or nobody to work it: look again in a little while.
    if (rateOf(f) === 0 || !sendOut(s, size, f, 'water')) f.clock = CARRIER_REST;
  }
}

/** Move a water carrier one tick along. Returns false when she is done for this round. */
export function moveCarrier(s: SimState, map: CoastMap, w: Walker): boolean {
  return moveRounds(s, map, w, WATER, 'fountain');
}

export { findBuilding, HOME_CAPACITY };
