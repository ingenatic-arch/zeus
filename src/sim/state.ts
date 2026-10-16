import type { RngState } from './rng';

/** Bump when the shape of SimState changes, so old saves fail clearly. */
export const SIM_STATE_VERSION = 6;

/** What stands on a map tile: nothing, a road, or a building (by id, > 0). */
export const TILE_EMPTY = 0;
export const TILE_ROAD = -1;

/** What a building is. */
export type BuildingKind = 'home' | 'fountain' | 'farm' | 'granary' | 'agora' | 'shrine' | 'theatre';

/** The services walkers carry along the streets, each with its own record: water, bread, the priestess's blessings and plays. */
export type Service = 'water' | 'food' | 'religion' | 'culture';

/**
 * A building on a square footprint (2 x 2 for homes, fountains and shrines,
 * 3 x 3 for the rest; see sideOf) whose top-left tile is (x, z).
 * A home's level: 0 an empty plot marked out for settlers, 1 a tent, 2 a hut,
 * 3 a cottage, 4 a townhouse, 5 a fine house.
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
  /** A fountain, agora, shrine or theatre: its walker out on the streets (walker id), or 0. */
  walker: number;
  /** A fountain, agora, shrine or theatre: ticks until its next walker sets off. */
  clock: number;
  /** A fountain, agora, shrine or theatre: how many walkers it has sent (which side the next one leaves by). */
  turn: number;
  /** A home: the tick its food lasts until (0: it has never had any). */
  foodUntil: number;
  /** A home: the tick the priestess's blessing lasts until (0: never had one). */
  religionUntil: number;
  /** A home: the tick its plays last until (0: never had any). */
  cultureUntil: number;
  /** A workplace: the people working there. A home: how many of its people have work. */
  workers: number;
  /** Measures of wheat: in a farm's barn, a granary's store, or the agora's food stall. */
  stock: number;
  /** A farm: how far the crop has grown (ticks at full strength; harvest at GROW). */
  growth: number;
  /** A lived-in home: the household living there (null for workplaces and empty plots). */
  family: Family | null;
}

/** Someone living in a home. */
export interface Person {
  name: string;
  female: boolean;
  /** The tick they were born (before the founding: negative), so their age grows with the years. */
  born: number;
  /** How they are related: 'head' for the head of the house, otherwise to `kin` ('son' of 'Lykos'). */
  role: Kin;
  /** The name of the person they are related to ('' for the head). */
  kin: string;
}

export type Kin = 'head' | 'wife' | 'husband' | 'son' | 'daughter' | 'mother' | 'father' | 'brother' | 'sister' | 'cousin';

/** Something that happened to a household, for its story. */
export interface Story {
  tick: number;
  /** came: founded the house; joined: more family moved in; up / down: the home changed level; warn: a need ran out; relief: it came back in time; left: people moved away. */
  what: 'came' | 'joined' | 'up' | 'down' | 'warn' | 'relief' | 'left';
  /** The need it was about (a Service), or ''. */
  need: '' | Service;
  /** The home's level after it. */
  level: number;
  /** Who it was about. */
  names: string[];
}

/** The household in a home: who they are, who lives there, and what has happened to them. */
export interface Family {
  /** The founder's name: "the house of Nikias". */
  name: string;
  /** Where they came from. */
  origin: string;
  /** When they came (the story keeps only the last few things that happened). */
  came: number;
  /** For choosing what they say. */
  seed: number;
  /** Everyone living there, in the order they came (the head first). */
  members: Person[];
  /** The last few things that happened, oldest first. */
  story: Story[];
  /** The needs the home is warning about now, so the story notes each warning (and each relief) once. */
  warned: Service[];
}

/**
 * A group walking along a path: settlers on their way to a home, or leavers
 * on their way out of the city. The path is a list of waypoints (x, z pairs,
 * world units; tile centres on the road) with the road tile under each
 * waypoint, or -1 where it is off the road (beyond the map edge, or the plot).
 */
export interface Walker {
  id: number;
  /** Settlers, leavers, a fountain's water carrier, a farm's ox cart, the agora's porter, its food vendor, a shrine's priestess or a theatre's actor. */
  kind: 'settler' | 'leaver' | 'water' | 'cart' | 'porter' | 'food' | 'priestess' | 'actor';
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
  /** A service walker, cart or porter: the building it belongs to (0 for others). */
  origin: number;
  /** Heading home. */
  back: boolean;
  /** A service walker: road tiles walked out on this round that she hadn't walked yet this round. */
  steps: number;
  /** A service walker: the tick she set off on this round. */
  since: number;
  /** A cart or porter: the building it is heading for (a granary). */
  target: number;
  /** A cart or porter: measures of wheat it carries. */
  load: number;
  /** A cart or porter: ticks left unloading or loading where it stands. */
  wait: number;
  /** A service walker: the road tiles she has walked this round (which no longer count towards it). */
  trail: number[];
}

/** What a service's walkers have done on the streets, one entry per map tile. */
export interface ServiceRecord {
  /** The tick one of its walkers last stood there (0 never), for the overlay. */
  walked: number[];
  /**
   * At a junction, which way (1 north, 2 west, 3 east, 4 south; 0 never) one
   * of its walkers last left it. The next one takes the next way round, so over
   * a few rounds every street in reach gets walked.
   */
  exits: number[];
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
  /** The stock each held (same order), which comes back with it. */
  removedStock: number[];
  /** Tree indices it cleared. */
  trees: number[];
  /** Drachmas it cost. */
  cost: number;
  /** The tick it was done (undo only reaches back UNDO_WINDOW ticks). */
  tick: number;
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
  /**
   * A second generator for the people: names, ages, where they came from.
   * Kept apart so drawing names never shifts the main one (settler groups
   * grow exactly as they did before households had names).
   */
  folk: RngState;
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
  /** Each service's record of the streets its walkers walk. */
  rounds: Record<Service, ServiceRecord>;
  /** Drachmas of rent paid at the start of this month, and by how many households. */
  rent: { paid: number; homes: number };
  buildings: Building[];
  walkers: Walker[];
  nextId: number;
  /** Indices into the baked tree list of plants cleared away, sorted. */
  cleared: number[];
  /** The last few build actions, newest last. */
  undo: UndoEntry[];
  /** Ticks until the next look for a home for settlers. */
  settlerClock: number;
  /** Bumped whenever tiles, buildings (placed, cleared, a new level, people moving in or out) or trees change. */
  rev: number;
  /** Bumped when how a workplace looks changes: a farm's crop grows a stage, or a stock (barn, granary, stall) changes. */
  looks: number;
  /** Bumped only when tiles change (what a road route depends on). */
  tilesRev: number;
  /** Running totals. */
  arrived: number;
  left: number;
}
