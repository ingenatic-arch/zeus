/**
 * Every player action reaches the simulation as a command through one queue.
 * A command is stamped with the tick it applies on and applied at the start of
 * that tick, in the order it was queued. The applied commands form a log;
 * replaying the log on a fresh sim with the same seed gives the same state.
 *
 * Slice 1 has no gameplay yet, so the only command is a placeholder 'mark'
 * (a note in the log that changes nothing but the command counter). Slice 2
 * adds the real ones: place road, place plot, demolish, undo.
 */
export type Command = { type: 'mark'; label: string };

export interface StampedCommand {
  /** The tick on which the command is applied. */
  tick: number;
  /** Order within the tick (queue order). */
  seq: number;
  command: Command;
}
