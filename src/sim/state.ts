import type { RngState } from './rng';

/** Bump when the shape of SimState changes, so old saves fail clearly. */
export const SIM_STATE_VERSION = 3;

/** What stands on a map tile: nothing, a road, or a building (by id, > 0). */
export const TILE_EMPTY = 0;
export const TILE_ROAD = -1;

/** What a building is. */
export type BuildingKind = 'home' | 'fountain';

/**
 * A building on a 2 x 2 footprint whose top-left tile is (x, z).
 * A home's level: 0 an empty plot marked out for settlers, 1 a tent, 2 a hut.
 * Every building carries every field (zero where it doesn't apply), so the
 * state stays uniform plain data.
 */
export interface Building {
  id: number;
  kind: BuildingKind;
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
  /** A home: the tick its water lasts until (0: it has never had any). */
  waterUntil: number;
  /** A fountain: its water carrier out on the streets (walker id), or 0. */
  walker: number;
  /** A fountain: ticks until the next carrier sets off. */
  clock: number;
  /** A fountain: how many carriers it has sent (which side the next one leaves by). */
  turn: number;
}

/**
 * A group walking along a path: settlers on their way to a home, or leavers
 * on their way out of the city. The path is a list of waypoints (x, z pairs,
 * world units; tile centres on the road) with the road tile under each
 * waypoint, or -1 where it is off the road (beyond the map edge, or the plot).
 */
export interface Walker {
  id: number;
  /** Settlers, leavers, or a fountain's water carrier. */
  kind: 'settler' | 'leaver' | 'water';
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
  /** A water carrier: the fountain she belongs to (0 for others). */
  origin: number;
  /** A water carrier: heading home. */
  back: boolean;
  /** A water carrier: road tiles walked out on this round that nobody had walked yet this round. */
  steps: number;
  /** A water carrier: the tick she set off on this round. */
  since: number;
}

/** What one build action changed, so it can be undone. */
export interface UndoEntry {
  /** Road tiles it laid. */
  roads: number[];
  /** Building ids it placed (plots and fountains). */
  plots: number[];
  /** Road tiles it removed. */
  removedRoads: number[];
  /** Buildings it removed (top-left tiles). */
  removedPlots: number[];
  /** The ids those plots had (same order), so an undo that brings them back can keep older entries pointing at them. */
  removedIds: number[];
  /** What each of them was (same order). */
  removedKinds: BuildingKind[];
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
  /** One entry per map tile: the tick a water carrier last stood there (0 never), for the overlay. */
  carried: number[];
  /**
   * One entry per map tile: at a junction, which way (1 north, 2 west, 3 east,
   * 4 south; 0 never) a water carrier last left it. The next one takes the next
   * way round, so over a few rounds every street in reach gets walked.
   */
  exits: number[];
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
  /** Bumped only when tiles change (what a road route depends on). */
  tilesRev: number;
  /** Running totals. */
  arrived: number;
  left: number;
}
