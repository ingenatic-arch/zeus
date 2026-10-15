/**
 * What every walker shares: paths of waypoints, where a walker stands
 * between them, and how fast each kind walks.
 */
import { PLOT_SIZE } from './build';
import { TILE_ROAD, type Building, type SimState, type Walker } from './state';

/** Walking speed of settlers and leavers, tiles per tick (1.2 tiles a second at normal speed). */
export const WALK_SPEED = 0.12;
/** The water carrier walks a little slower, so she is easy to follow (1 tile a second). */
export const CARRIER_SPEED = 0.1;
/** How far beyond the map's edge walkers appear and disappear. */
export const OFF_MAP = 5;

export const speedOf = (w: Walker): number => (w.kind === 'water' ? CARRIER_SPEED : WALK_SPEED);

/** The centre of a tile, world units. */
export const centre = (size: number, t: number): [number, number] => {
  const tx = t % size;
  return [tx + 0.5, (t - tx) / size + 0.5];
};

export const plotCentre = (b: Building): [number, number] => [b.x + PLOT_SIZE / 2, b.z + PLOT_SIZE / 2];

/** A new walker with every field set. */
export function newWalker(s: SimState, kind: Walker['kind'], people: number): Walker {
  return { id: s.nextId++, kind, people, home: 0, path: [], tiles: [], seg: 0, along: 0, walked: 0, route: 0, origin: 0, back: false, steps: 0 };
}

/** Where a walker steps on or off the map beyond an edge road tile. */
export function offMapPoint(size: number, t: number): [number, number] {
  const tx = t % size;
  const tz = (t - tx) / size;
  if (tx === 0) return [-OFF_MAP + 0.5, tz + 0.5];
  if (tx === size - 1) return [size + OFF_MAP - 0.5, tz + 0.5];
  if (tz === 0) return [tx + 0.5, -OFF_MAP + 0.5];
  return [tx + 0.5, size + OFF_MAP - 0.5];
}

/** Give a walker a new path from waypoints: [x, z, tile] triples (tile -1 where off the road). */
export function setPath(w: Walker, pts: Array<[number, number, number]>): void {
  w.path = [];
  w.tiles = [];
  for (const [x, z, t] of pts) {
    w.path.push(x, z);
    w.tiles.push(t);
  }
  w.seg = 0;
  w.along = 0;
  w.route++;
}

/** Waypoints at the centres of road tiles. */
export function roadPoints(s: SimState, size: number, tiles: number[]): Array<[number, number, number]> {
  return tiles.map((t) => {
    const [x, z] = centre(size, t);
    // A tile that is no longer a road (just cleared under a walker) is walked as open ground.
    return [x, z, s.tiles[t] === TILE_ROAD ? t : -1];
  });
}

/** Where a walker is now, between its waypoints. */
export function position(w: Walker): [number, number] {
  const i = w.seg * 2;
  if (i + 3 >= w.path.length) return [w.path[w.path.length - 2], w.path[w.path.length - 1]];
  const x0 = w.path[i];
  const z0 = w.path[i + 1];
  const len = Math.hypot(w.path[i + 2] - x0, w.path[i + 3] - z0) || 1;
  const f = Math.min(1, w.along / len);
  return [x0 + (w.path[i + 2] - x0) * f, z0 + (w.path[i + 3] - z0) * f];
}
