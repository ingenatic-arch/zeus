import type { RngState } from './rng';

/** Bump when the shape of SimState changes, so old saves fail clearly. */
export const SIM_STATE_VERSION = 2;

/** What stands on a map tile: nothing, a road, or a building (by id, > 0). */
export const TILE_EMPTY = 0;
export const TILE_ROAD = -1;

/**
 * A home: a 2 x 2 housing plot whose top-left tile is (x, z). Level 0 is an
 * empty plot marked out for settlers; level 1 is a tent.
 */
export interface Building {
  id: number;
  x: number;
  z: number;
  level: number;
  /** People living here. */
  people: number;
  /** People on their way here (room reserved for them). */
  incoming: number;
  /** Tick the building was placed. */
  placed: number;
  /** Tick it last changed level (the tent going up), for the renderer's little rise. */
  since: number;
}

/**
 * A group walking along a path: settlers on their way to a home, or leavers
 * on their way out of the city. The path is a list of waypoints (x, z pairs,
 * world units; tile centres on the road) with the road tile under each
 * waypoint, or -1 where it is off the road (beyond the map edge, or the plot).
 */
export interface Walker {
  id: number;
  kind: 'settler' | 'leaver';
  people: number;
  /** The building settlers are heading for (0 for leavers). */
  home: number;
  path: number[];
  tiles: number[];
  /** Which segment of the path it is on (between waypoint seg and seg + 1). */
  seg: number;
  /** Distance travelled along the current segment. */
  along: number;
  /** Total distance walked since the path began, for the renderer to line up the group. */
  walked: number;
  /** Bumped when the walker takes a new path, so the renderer can re-read it. */
  route: number;
}

/** What one build action changed, so it can be undone. */
export interface UndoEntry {
  /** Road tiles it laid. */
  roads: number[];
  /** Building ids it placed. */
  plots: number[];
  /** Road tiles it removed. */
  removedRoads: number[];
  /** Plots it removed (top-left tiles). */
  removedPlots: number[];
  /** Tree indices it cleared. */
  trees: number[];
  /** Drachmas it cost. */
  cost: number;
}

/**
 * The whole simulation state: plain data only (numbers, strings, arrays,
 * plain objects), so it can be serialised with JSON and compared in tests.
 */
export interface SimState {
  version: number;
  /** Which authored map the city sits on. */
  mapId: string;
  seed: number;
  /** Ticks completed since the founding. */
  tick: number;
  rng: RngState;
  /** Commands applied so far. */
  commandsApplied: number;
  /**
   * The breeze over the bay. Drifts a little each day (seeded), and the
   * renderer reads it to set which way the waves roll. Later it can steer
   * ships and smoke.
   */
  wind: { angle: number; strength: number };
  /** Drachmas in the treasury. */
  money: number;
  /** People living in the city. */
  population: number;
  /** One entry per map tile (tz * size + tx): TILE_EMPTY, TILE_ROAD or a building id. */
  tiles: number[];
  buildings: Building[];
  walkers: Walker[];
  nextId: number;
  /** Indices into the baked tree list of plants cleared away, sorted. */
  cleared: number[];
  /** The last few build actions, newest last. */
  undo: UndoEntry[];
  /** Ticks until the next look for a home for settlers. */
  settlerClock: number;
  /** Bumped whenever tiles, buildings or trees change. */
  rev: number;
  /** Running totals. */
  arrived: number;
  left: number;
}
