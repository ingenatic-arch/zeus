/**
 * Prepared scenes for demo links. Each one builds through the sim's command
 * queue (so it is an ordinary, replayable game) and runs the clock on a
 * little so there is something to see.
 */
import { MAP_SIZE } from '../map/coast';
import type { Sim } from '../sim/sim';
import type { Service } from '../sim/state';
import type { Speed } from './clockDriver';
import type { ToolName } from './tools';

/**
 * How far the food demos have got: a town of cottages; one field ripe for
 * harvest while carts take the others' to the granary; the chain built early
 * in a town of tents, short of hands; carts crossing the bridge. (#chain is
 * the watered town of #water, before any food buildings.)
 */
const FOOD_TICKS = 3600;
const HARVEST_TICKS = 3790;
const WORKERS_TICKS = 420;
const BRIDGE_TICKS = 2200;

export interface Demo {
  /** Camera view (a VIEWS name). */
  view: string;
  speed?: Speed;
  /** A tool picked from the start. */
  tool?: ToolName;
  /** The camera follows the first walker of this kind (or waits at her workplace). */
  follow?: 'water' | 'food' | 'cart' | 'porter';
  /** Which overlay `-overlay` shows for this demo (water if not given). */
  overlay?: Service;
  setup?: (sim: Sim) => void;
}

const T = (x: number, z: number): number => z * MAP_SIZE + x;
const row = (x0: number, x1: number, z: number): number[] => Array.from({ length: x1 - x0 + 1 }, (_, i) => T(x0 + i, z));
const col = (x: number, z0: number, z1: number): number[] => Array.from({ length: z1 - z0 + 1 }, (_, i) => T(x, z0 + i));

/**
 * A first little neighbourhood on the plain between the olive grove and the
 * river mouth: a road in from the west edge, two streets off it, plots on
 * both sides. `ticks` sets how far the settling has got.
 */
function neighbourhood(ticks: number): (sim: Sim) => void {
  return (sim) => {
    const at = (t: number, c: Parameters<Sim['enqueue']>[0]): void => {
      if (sim.state.tick < t) sim.run(t - sim.state.tick);
      sim.enqueue(c);
      sim.flush();
    };
    at(0, { type: 'road', tiles: row(0, 36, 80) });
    at(0, { type: 'road', tiles: col(26, 66, 79) });
    at(0, { type: 'road', tiles: row(27, 34, 70) });
    at(0, {
      type: 'plots',
      at: [T(24, 78), T(27, 78), T(22, 78), T(29, 78), T(24, 81), T(27, 81), T(24, 76), T(27, 76), T(31, 78), T(22, 81), T(29, 81)],
    });
    at(Math.round(ticks * 0.45), { type: 'plots', at: [T(24, 74), T(27, 74), T(24, 72), T(27, 72), T(27, 68), T(29, 68), T(31, 81), T(20, 78)] });
    at(Math.round(ticks * 0.75), { type: 'plots', at: [T(31, 71), T(33, 71), T(29, 71), T(24, 70), T(24, 68)] });
    if (sim.state.tick < ticks) sim.run(ticks - sim.state.tick);
  };
}

/**
 * A bigger neighbourhood for the water demos, on the same plain: the road in
 * from the west, a lane running a long way north from the main junction with
 * streets off it, and homes along them, some at the lane's far end, beyond
 * the reach of a fountain by the junction. With `fountain`, one goes in by
 * the junction once the first tents are up. `ticks` sets how far it has got.
 */
function waterTown(ticks: number, fountain: boolean, food?: (at: At) => void): (sim: Sim) => void {
  return (sim) => {
    const at: At = (t, c) => {
      if (sim.state.tick < t) sim.run(t - sim.state.tick);
      sim.enqueue(c);
      sim.flush();
    };
    at(0, { type: 'road', tiles: [...row(0, 36, 80), ...col(26, 42, 79), ...row(27, 34, 70), ...row(16, 25, 74)] });
    at(0, {
      type: 'plots',
      at: [
        ...[16, 18, 20, 22, 24, 27, 29, 31, 33].map((x) => T(x, 78)),
        ...[16, 18, 20, 22, 24, 29, 31, 33].map((x) => T(x, 81)),
        ...[16, 18, 20, 22, 24].map((x) => T(x, 72)),
        ...[16, 18, 20].map((x) => T(x, 75)),
        T(24, 76),
        T(27, 76),
        T(27, 74),
        ...[27, 29, 31, 33].map((x) => T(x, 68)),
        // (With food, the agora takes the first two of these.)
        ...(food ? [31, 33] : [27, 29, 31, 33]).map((x) => T(x, 71)),
        // Up the lane: two pairs near the junction, three pairs at its far end.
        ...[66, 64, 46, 44, 42].flatMap((z) => [T(24, z), T(27, z)]),
      ],
    });
    if (fountain) at(300, { type: 'fountain', at: [T(27, 81)] });
    food?.(at);
    if (sim.state.tick < ticks) sim.run(ticks - sim.state.tick);
  };
}

type At = (t: number, c: Parameters<Sim['enqueue']>[0]) => void;

/**
 * The water town given bread: once its huts are going up, a farm road runs
 * east from the lane to the fertile land by the river, with three wheat
 * farms on it and a granary half way, and an agora goes in by the junction
 * of the town's streets. `ticks` sets how far it has got.
 */
function foodTown(ticks: number, start = 400, stagger = 200): (sim: Sim) => void {
  return waterTown(ticks, true, (at) => {
    at(start, { type: 'road', tiles: row(27, 50, 63) });
    at(start, { type: 'build', kind: 'farm', at: [T(47, 60)] });
    at(start, { type: 'build', kind: 'granary', at: [T(35, 64)] });
    at(start, { type: 'build', kind: 'agora', at: [T(27, 71)] });
    // The other two farms a little later, so their crops ripen in turn.
    at(start + stagger, { type: 'build', kind: 'farm', at: [T(44, 60)] });
    at(start + 2 * stagger, { type: 'build', kind: 'farm', at: [T(48, 64)] });
  });
}

/**
 * The food town's farms across the river instead: the lane carries on north
 * to a road that bridges the river (seven tiles of water and wet bank) to
 * the fertile east bank, with farms either side of it there and the granary
 * on the town's side. The ox carts cross the bridge. A second road runs up
 * past the granary and stops at the bank, for Oliver to bridge.
 */
function bridgeTown(ticks: number): (sim: Sim) => void {
  return waterTown(ticks, true, (at) => {
    at(400, { type: 'road', tiles: [...col(26, 41, 41), ...row(27, 48, 41)] });
    // A second road up past the granary to the bank, ready to be bridged.
    at(400, { type: 'road', tiles: [...col(26, 36, 40), ...row(27, 29, 36)] });
    at(400, { type: 'build', kind: 'farm', at: [T(38, 38), T(41, 42), T(44, 42)] });
    at(400, { type: 'build', kind: 'granary', at: [T(27, 38)] });
    at(400, { type: 'build', kind: 'agora', at: [T(27, 71)] });
  });
}

export const DEMOS: Record<string, Demo> = {
  coast: { view: 'coast' },
  streets: { view: 'streets', setup: neighbourhood(560) },
  settlers: { view: 'settlers', setup: neighbourhood(230) },
  build: { view: 'build', tool: 'road' },
  water: { view: 'water', setup: waterTown(1500, true) },
  carrier: { view: 'carrier', setup: waterTown(1500, true), follow: 'water' },
  fountain: { view: 'fountain', tool: 'fountain', setup: waterTown(700, false) },
  food: { view: 'food', setup: foodTown(FOOD_TICKS), overlay: 'food' },
  vendor: { view: 'vendor', setup: foodTown(FOOD_TICKS), follow: 'food', overlay: 'food' },
  harvest: { view: 'harvest', setup: foodTown(HARVEST_TICKS), follow: 'cart', overlay: 'food' },
  chain: { view: 'chain', tool: 'farm', setup: waterTown(1500, true), overlay: 'food' },
  workers: { view: 'workers', setup: foodTown(WORKERS_TICKS, 120, 0), overlay: 'food' },
  bridge: { view: 'bridge', tool: 'road', setup: bridgeTown(BRIDGE_TICKS), overlay: 'food' },
};
