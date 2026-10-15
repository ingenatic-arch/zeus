import { coastMap, type CoastMap } from '../map/bake';
import { MAP_SIZE } from '../map/coast';
import { mapIndex, PLOT_COST, PLOT_SIZE, plotNeighbours, plotRefusal, ROAD_COST, roadRefusal, STARTING_MONEY } from './build';
import { dateOfTick, TICKS_PER_DAY, type SimDate } from './clock';
import type { Command, StampedCommand } from './commands';
import { nextFloat, seedRng } from './rng';
import { findBuilding, recountPopulation, sendLeavers, SETTLER_INTERVAL, spawnSettlers, stepWalkers } from './settlers';
import { SIM_STATE_VERSION, TILE_EMPTY, TILE_ROAD, type Building, type SimState, type UndoEntry } from './state';

export const DEFAULT_SEED = 0x2e05; // "Zeus"
/** How many build actions undo remembers. */
export const UNDO_DEPTH = 10;

export function createState(seed: number = DEFAULT_SEED, mapId = 'coast'): SimState {
  const rng = seedRng(seed);
  return {
    version: SIM_STATE_VERSION,
    mapId,
    seed,
    tick: 0,
    rng,
    commandsApplied: 0,
    wind: { angle: 3.6 + nextFloat(rng) * 0.4, strength: 0.5 + nextFloat(rng) * 0.2 },
    money: STARTING_MONEY,
    population: 0,
    tiles: new Array<number>(MAP_SIZE * MAP_SIZE).fill(TILE_EMPTY),
    buildings: [],
    walkers: [],
    nextId: 1,
    cleared: [],
    undo: [],
    settlerClock: SETTLER_INTERVAL,
    rev: 0,
    arrived: 0,
    left: 0,
  };
}

/** The baked map a state's city sits on. */
export function mapFor(mapId: string): CoastMap {
  if (mapId !== 'coast') throw new Error(`Unknown map "${mapId}"`);
  return coastMap();
}

/**
 * The deterministic simulation. It advances only when step() is called, and
 * reads nothing from outside except queued commands. The host decides how
 * many steps to run per frame (that is where pause and speed live).
 */
export class Sim {
  state: SimState;
  private queue: StampedCommand[] = [];
  private seq = 0;
  /** Every command applied so far, in order, for replay. */
  readonly log: StampedCommand[] = [];

  constructor(seed: number = DEFAULT_SEED) {
    this.state = createState(seed);
  }

  /** The baked map (not part of the state: it is the same for every game on this map). */
  get map(): CoastMap {
    return mapFor(this.state.mapId);
  }

  /** Queue a command to apply on the next tick. */
  enqueue(command: Command): StampedCommand {
    return this.enqueueAt(this.state.tick + 1, command);
  }

  /** Queue a command for a given future tick (used by replay). */
  enqueueAt(tick: number, command: Command): StampedCommand {
    if (tick <= this.state.tick) throw new Error(`Command for tick ${tick} is in the past (now ${this.state.tick})`);
    const stamped: StampedCommand = { tick, seq: this.seq++, command };
    this.queue.push(stamped);
    return stamped;
  }

  /** Advance one fixed tick. */
  step(): void {
    const s = this.state;
    const t = s.tick + 1;
    s.tick = t;
    if (this.queue.length > 0) {
      const due = this.queue.filter((c) => c.tick === t).sort((a, b) => a.seq - b.seq);
      if (due.length > 0) {
        this.queue = this.queue.filter((c) => c.tick !== t);
        for (const c of due) {
          applyCommand(s, this.map, c.command);
          this.log.push(c);
        }
      }
    }
    stepWalkers(s, this.map);
    if (--s.settlerClock <= 0) {
      s.settlerClock = SETTLER_INTERVAL;
      spawnSettlers(s, this.map);
    }
    // Daily systems.
    if (t % TICKS_PER_DAY === 0) driftWind(s);
  }

  run(ticks: number): void {
    for (let i = 0; i < ticks; i++) this.step();
  }

  get date(): SimDate {
    return dateOfTick(this.state.tick);
  }
}

// ---------------------------------------------------------------------------
// Commands.

function applyCommand(s: SimState, map: CoastMap, c: Command): void {
  s.commandsApplied++;
  switch (c.type) {
    case 'road':
      record(s, layRoads(s, map, c.tiles));
      break;
    case 'plots':
      record(s, placePlots(s, map, c.at));
      break;
    case 'clear':
      record(s, clearArea(s, map, c.x0, c.z0, c.x1, c.z1));
      break;
    case 'undo':
      undoLast(s, map);
      break;
  }
}

const emptyEntry = (): UndoEntry => ({ roads: [], plots: [], removedRoads: [], removedPlots: [], trees: [], cost: 0 });

function record(s: SimState, e: UndoEntry): void {
  if (e.roads.length + e.plots.length + e.removedRoads.length + e.removedPlots.length + e.trees.length === 0) return;
  s.undo.push(e);
  if (s.undo.length > UNDO_DEPTH) s.undo.shift();
  s.rev++;
}

/** Clear the plants standing on a tile; returns the tree indices newly cleared. */
function clearTrees(s: SimState, map: CoastMap, tiles: number[]): number[] {
  const on = mapIndex(map).treesOn;
  const done = new Set(s.cleared);
  const fresh: number[] = [];
  for (const t of tiles) {
    for (const i of on.get(t) ?? []) {
      if (done.has(i)) continue;
      done.add(i);
      fresh.push(i);
    }
  }
  if (fresh.length) s.cleared = [...done].sort((a, b) => a - b);
  return fresh.sort((a, b) => a - b);
}

function layRoads(s: SimState, map: CoastMap, tiles: number[]): UndoEntry {
  const e = emptyEntry();
  const n = map.size;
  for (const t of tiles) {
    if (!Number.isInteger(t) || t < 0 || t >= n * n) continue;
    if (s.money < ROAD_COST) break;
    if (roadRefusal(map, s, t % n, Math.floor(t / n)) !== '') continue;
    s.tiles[t] = TILE_ROAD;
    s.money -= ROAD_COST;
    e.cost += ROAD_COST;
    e.roads.push(t);
  }
  e.trees = clearTrees(s, map, e.roads);
  return e;
}

function plotTiles(n: number, x: number, z: number): number[] {
  const out: number[] = [];
  for (let dz = 0; dz < PLOT_SIZE; dz++) for (let dx = 0; dx < PLOT_SIZE; dx++) out.push((z + dz) * n + x + dx);
  return out;
}

function addPlot(s: SimState, n: number, x: number, z: number): Building {
  const b: Building = { id: s.nextId++, x, z, level: 0, people: 0, incoming: 0, placed: s.tick, since: s.tick };
  s.buildings.push(b);
  for (const t of plotTiles(n, x, z)) s.tiles[t] = b.id;
  return b;
}

function placePlots(s: SimState, map: CoastMap, at: number[]): UndoEntry {
  const e = emptyEntry();
  const n = map.size;
  const covered: number[] = [];
  for (const t of at) {
    if (!Number.isInteger(t) || t < 0 || t >= n * n) continue;
    if (s.money < PLOT_COST) break;
    const x = t % n;
    const z = Math.floor(t / n);
    if (plotRefusal(map, s, x, z) !== '') continue;
    const b = addPlot(s, n, x, z);
    s.money -= PLOT_COST;
    e.cost += PLOT_COST;
    e.plots.push(b.id);
    covered.push(...plotTiles(n, x, z));
  }
  e.trees = clearTrees(s, map, covered);
  return e;
}

/** Take a home down: its family packs up and walks out (or just leaves, if no road leads out). */
function removeBuilding(s: SimState, map: CoastMap, b: Building): void {
  const n = map.size;
  for (const t of plotTiles(n, b.x, b.z)) s.tiles[t] = TILE_EMPTY;
  s.buildings = s.buildings.filter((o) => o !== b);
  if (b.people > 0) {
    s.left += b.people;
    sendLeavers(s, map, b.people, [b.x + PLOT_SIZE / 2, b.z + PLOT_SIZE / 2], plotNeighbours(n, b.x, b.z));
  }
  recountPopulation(s);
}

function clearArea(s: SimState, map: CoastMap, x0: number, z0: number, x1: number, z1: number): UndoEntry {
  const e = emptyEntry();
  const n = map.size;
  const xa = Math.max(0, Math.min(x0, x1));
  const xb = Math.min(n - 1, Math.max(x0, x1));
  const za = Math.max(0, Math.min(z0, z1));
  const zb = Math.min(n - 1, Math.max(z0, z1));
  const empty: number[] = [];
  const homes: Building[] = [];
  for (let z = za; z <= zb; z++) {
    for (let x = xa; x <= xb; x++) {
      const t = z * n + x;
      const on = s.tiles[t];
      if (on === TILE_ROAD) {
        s.tiles[t] = TILE_EMPTY;
        e.removedRoads.push(t);
      } else if (on > 0) {
        const b = findBuilding(s, on);
        if (b && !homes.includes(b)) homes.push(b);
      } else empty.push(t);
    }
  }
  for (const b of homes) {
    e.removedPlots.push(b.z * n + b.x);
    removeBuilding(s, map, b);
  }
  e.trees = clearTrees(s, map, empty);
  return e;
}

function undoLast(s: SimState, map: CoastMap): void {
  const e = s.undo.pop();
  if (!e) return;
  const n = map.size;
  for (const id of e.plots) {
    const b = findBuilding(s, id);
    if (b) removeBuilding(s, map, b);
  }
  for (const t of e.roads) if (s.tiles[t] === TILE_ROAD) s.tiles[t] = TILE_EMPTY;
  s.money += e.cost;
  // What it removed comes back where the ground is still free. A home comes
  // back as an empty plot: its family has already gone.
  for (const t of e.removedRoads) if (roadRefusal(map, s, t % n, Math.floor(t / n)) === '') s.tiles[t] = TILE_ROAD;
  const plots = e.removedPlots.slice().sort((a, b) => a - b);
  for (const t of plots) {
    const x = t % n;
    const z = Math.floor(t / n);
    if (plotRefusal(map, s, x, z) === '') addPlot(s, n, x, z);
  }
  // Plants grow back where nothing stands.
  if (e.trees.length) {
    const tiles = mapIndex(map).treeTiles;
    const back = new Set(e.trees.filter((i) => tiles[i].every((t) => s.tiles[t] === TILE_EMPTY)));
    s.cleared = s.cleared.filter((i) => !back.has(i));
  }
  s.rev++;
}

function driftWind(s: SimState): void {
  const w = s.wind;
  w.angle += (nextFloat(s.rng) - 0.5) * 0.08;
  // Pulled gently back towards a south-westerly sea breeze.
  w.angle += (3.8 - w.angle) * 0.02;
  w.strength += (nextFloat(s.rng) - 0.5) * 0.06;
  w.strength = Math.min(1, Math.max(0.25, w.strength + (0.55 - w.strength) * 0.03));
}

/** Plain serialised form of the state (what a save will hold). */
export function serialize(s: SimState): string {
  return JSON.stringify(s);
}

export function deserialize(json: string): SimState {
  const data = JSON.parse(json) as Partial<SimState>;
  if (data.version !== SIM_STATE_VERSION) {
    throw new Error(`This save is from version ${String(data.version)} and this game reads version ${SIM_STATE_VERSION}.`);
  }
  return data as SimState;
}

/** Rebuild a sim from a seed and a command log, running to the given tick. */
export function replay(seed: number, log: readonly StampedCommand[], toTick: number): Sim {
  const sim = new Sim(seed);
  for (const c of log) sim.enqueueAt(c.tick, c.command);
  sim.run(toTick);
  return sim;
}
