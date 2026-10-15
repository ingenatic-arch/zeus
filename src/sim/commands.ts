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
  /** Lay road on these tiles (tile indices), in order. */
  | { type: 'road'; tiles: number[] }
  /** Mark out 2 x 2 housing plots with these top-left tiles, in order. */
  | { type: 'plots'; at: number[] }
  /** Build 2 x 2 fountains with these top-left tiles, in order. */
  | { type: 'fountain'; at: number[] }
  /** Clear a rectangle of tiles (inclusive): roads, homes, and trees on empty ground. */
  | { type: 'clear'; x0: number; z0: number; x1: number; z1: number }
  /** Undo the last build action. */
  | { type: 'undo' };

export interface StampedCommand {
  /** The tick on which the command is applied. */
  tick: number;
  /** Order within the tick (queue order). */
  seq: number;
  command: Command;
}
