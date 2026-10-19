/**
 * Playing a demo's history to its prepared town (slice 22). Loaded by the
 * build (scripts/prepared.ts, through Vite's module runner, in worker
 * processes) and by the tests (tests/prepared.ts).
 */
import { DEMOS } from '../src/game/demos';
import { decodeSave, encodeSave } from '../src/game/saves';
import { Sim } from '../src/sim/sim';

/** The demos that have a history to prepare. */
export const PREPARABLE: string[] = Object.keys(DEMOS).filter((k) => !!DEMOS[k].setup);

/** Play a demo's setup and write it as a save; null if it can't be kept faithfully as one (the page then plays the setup itself). */
export function bake(name: string): string | null {
  const d = DEMOS[name];
  if (!d?.setup) return null;
  const sim = new Sim();
  d.setup(sim);
  // (A command still waiting in the queue isn't in the state: such a town can't be kept as a save.)
  if ((sim as unknown as { queue: unknown[] }).queue.length > 0) return null;
  const text = encodeSave(sim.state, 0);
  // (Checked: decoded, it must be exactly the state the setup made.)
  const back = decodeSave(text);
  if (!back.ok || JSON.stringify(back.file.state) !== JSON.stringify(sim.state)) return null;
  return text;
}
