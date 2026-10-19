/**
 * The demos' towns for the tests, from the prepared towns' cache
 * (scripts/prepared.ts): each one is set up once, serialised, and shared by
 * every test file (and by the build), instead of every file playing the same
 * history. A town that can't be kept as a save is set up as before.
 */
import { bake } from '../scripts/bake';
import { cached, keep } from '../scripts/prepared';
import { DEMOS } from '../src/game/demos';
import { decodeSave } from '../src/game/saves';
import { Sim } from '../src/sim/sim';

/** A fresh Sim holding a demo's town as its setup leaves it. */
export function demoSim(name: string): Sim {
  const sim = new Sim();
  let text = cached(name);
  if (text === undefined) keep(name, (text = bake(name)));
  const d = text ? decodeSave(text) : null;
  if (d?.ok) sim.state = d.file.state;
  else DEMOS[name].setup!(sim);
  return sim;
}

/** A demo's town played by its setup here, keeping the command log (for a test that replays it). */
export function liveSim(name: string): Sim {
  const sim = new Sim();
  DEMOS[name].setup!(sim);
  return sim;
}
