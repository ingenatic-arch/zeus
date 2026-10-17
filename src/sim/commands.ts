/**
 * Every player action reaches the simulation as a command through one queue.
 * A command is stamped with the tick it applies on and applied at the start of
 * that tick, in the order it was queued. The applied commands form a log;
 * replaying the log on a fresh sim with the same seed gives the same state.
 *
 * Commands carry exactly what to build (tile lists), not how the tool chose
 * it, so a replay never depends on the route-finding of the day.
 */
export type Command =
  /** Lay road on these tiles (tile indices), in order; a run of wet tiles is a bridge, laid whole or not at all. */
  | { type: 'road'; tiles: number[] }
  /** Mark out 2 x 2 housing plots with these top-left tiles, in order. */
  | { type: 'plots'; at: number[] }
  /** Build 2 x 2 fountains with these top-left tiles, in order. */
  | { type: 'fountain'; at: number[] }
  /** Build farms, granaries, the agora, theatres, hunting lodges, dairies, olive groves, olive presses, storehouses, sheep pastures, vineyards or wineries (3 x 3), or shrines, tax offices, watch posts and architects' offices (2 x 2), with these top-left tiles, in order. */
  | { type: 'build'; kind: BuildKind; at: number[] }
  /** Set the tax rate: 0 (none) to 4 (harsh). */
  | { type: 'tax'; rate: number }
  /** Add a stall for a good (by its ware number: oil is 4, fleece 5, wine 7) to the agora covering tile `at`. */
  | { type: 'stall'; at: number; good: number }
  /** Clear a rectangle of tiles (inclusive): roads, homes, and trees on empty ground. */
  | { type: 'clear'; x0: number; z0: number; x1: number; z1: number }
  /** Undo the last build action. */
  | { type: 'undo' }
  /** Let fire risk and wear build up (on in every game: see SimState.hazards), or not. */
  | { type: 'hazards'; on: boolean };

/** What the build command builds. */
export type BuildKind = 'farm' | 'granary' | 'agora' | 'shrine' | 'theatre' | 'taxoffice' | 'lodge' | 'dairy' | 'grove' | 'press' | 'storehouse' | 'pasture' | 'vineyard' | 'winery' | 'watchpost' | 'architect';
export const BUILD_KINDS: readonly BuildKind[] = ['farm', 'granary', 'agora', 'shrine', 'theatre', 'taxoffice', 'lodge', 'dairy', 'grove', 'press', 'storehouse', 'pasture', 'vineyard', 'winery', 'watchpost', 'architect'];

export interface StampedCommand {
  /** The tick on which the command is applied. */
  tick: number;
  /** Order within the tick (queue order). */
  seq: number;
  command: Command;
}
