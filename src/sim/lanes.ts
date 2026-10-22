/**
 * The sea lanes' guard and their pirates, as the rest of the city asks after
 * them (slice 26): whether a lane is guarded, and whether pirates prey on it.
 * Kept apart from fleet.ts, which imports half the simulation, so the
 * treasury and the trade routes can ask without importing it. Pure.
 */
import type { Pirates, SimState } from './state';
// Slice 38.
import type { Blockade } from './blockades';

/** A rower's pay a month (drachmas). */
export const ROWER_PAY = 2;

/** Is a lane guarded: a trireme on station there? */
export function guarded(s: SimState, way: string): boolean {
  return s.fleet.triremes.some((t) => t.order === 'lane' && t.lane === way && t.state === 'away' && !t.homeward && s.tick >= t.start + t.dur);
}

/** Pirates preying on a lane, unguarded (what passes their place is seized), if any. */
export function preyingOn(s: SimState, way: string): Pirates | undefined {
  const p = s.fleet.pirates.find((x) => x.way === way && x.state === 'preying');
  return p && !guarded(s, way) ? p : undefined;
}

// ---------------------------------------------------------------------------
// Slice 38: a blockade of your harbour (blockades.ts), as the trade, the
// routes and the tribute ask after it.

/** The blockade holding your harbour's mouth now (its ships on station), if any: no ship comes or goes. */
export function blockaded(s: SimState): Blockade | undefined {
  return s.fleet.blockades.find((b) => b.phase === 'holding');
}
