/**
 * Is a land playable (slice 42)? Asked of its baked map with the game's own
 * build rules, on a town with nothing built yet:
 * - somewhere a farm, an olive grove, a pasture, a horse farm, a vineyard,
 *   a copper mine, a marble quarry, a loggers' camp, the Lighthouse and a
 *   trading post (a berth the ship can reach) can go, each on the land the
 *   roads in can reach;
 * - the ground a road can take (bridging the river where a bridge can go)
 *   joins the north, east and west edges, where the roads in come from, to
 *   that land, and there is room on it for a city.
 * Pure; slow enough (a few hundred milliseconds on a large land) to be for
 * the tests and the generator's tuning, not the game's ticks.
 */
import { WATER_SEA, type CoastMap } from './bake';
import { buildingRefusal, bridgeSpan, Ground, mapIndex } from '../sim/build';
import { quayTiles } from '../sim/trade';
import type { BuildingKind, SimState } from '../sim/state';

/** The kinds a land must have room for, each somewhere the roads in reach. */
export const NEEDED: readonly BuildingKind[] = ['farm', 'grove', 'pasture', 'horsefarm', 'vineyard', 'mine', 'quarry', 'loggers', 'lighthouse', 'trading'];

/** Each needed kind, in words. */
const WORDS: Record<string, string> = {
  farm: 'a farm',
  grove: 'an olive grove',
  pasture: 'a pasture',
  horsefarm: 'a horse farm',
  vineyard: 'a vineyard',
  mine: 'a copper mine',
  quarry: 'a marble quarry',
  loggers: 'a loggers’ camp',
  lighthouse: 'the Lighthouse',
  trading: 'a trading post',
};

/** How many tiles a home can stand on the reachable land must have, at least: room for a city. */
export const CITY_ROOM = 2500;

export interface LandReport {
  ok: boolean;
  /** What is wrong, in words (empty when ok). */
  problems: string[];
  /** Where each needed kind can first go (its top-left tile), -1 if nowhere reachable. */
  spots: Record<string, number>;
  /** Tiles a home can stand on, on the land the roads in reach. */
  room: number;
  /** Whether each edge's road-going ground reaches that land. */
  edges: { north: boolean; east: boolean; west: boolean };
}

/** Check a land on a town with nothing built (`s`, founded on that land). */
export function landCheck(map: CoastMap, s: SimState): LandReport {
  const n = map.size;
  const ground = mapIndex(map).ground;
  const roadable = (t: number): boolean => ground[t] === Ground.Ok || ground[t] === Ground.SteepForHome;
  // The land the roads can join, in pieces: road-going ground four ways, and over the river where a bridge can go.
  const piece = new Int32Array(n * n).fill(-1);
  const sizes: number[] = [];
  const homes: number[] = [];
  for (let start = 0; start < n * n; start++) {
    if (piece[start] >= 0 || !roadable(start)) continue;
    const id = sizes.length;
    let count = 0;
    let room = 0;
    const queue = [start];
    piece[start] = id;
    for (let i = 0; i < queue.length; i++) {
      const t = queue[i];
      count++;
      if (ground[t] === Ground.Ok) room++;
      const x = t % n;
      const next: number[] = [];
      if (t >= n) next.push(t - n);
      if (t < n * n - n) next.push(t + n);
      if (x > 0) next.push(t - 1);
      if (x < n - 1) next.push(t + 1);
      for (const u of next) {
        if (piece[u] < 0 && roadable(u)) {
          piece[u] = id;
          queue.push(u);
        } else if (ground[u] === Ground.Water && map.tileWater[u] !== WATER_SEA) {
          // A bridge from here, straight over the river.
          const dir = u === t - n ? 1 : u === t - 1 ? 2 : u === t + 1 ? 3 : 4;
          const b = bridgeSpan(map, s, t, dir);
          if (b.end >= 0 && piece[b.end] < 0 && roadable(b.end)) {
            piece[b.end] = id;
            queue.push(b.end);
          }
        }
      }
    }
    sizes.push(count);
    homes.push(room);
  }
  // The main land: the piece with the most room for homes.
  let main = -1;
  for (let i = 0; i < homes.length; i++) if (main < 0 || homes[i] > homes[main]) main = i;
  const onMain = (t: number): boolean => main >= 0 && piece[t] === main;
  const edgeOn = (ts: number[]): boolean => ts.some(onMain);
  const range = (k: number): number[] => Array.from({ length: n }, (_, i) => i * k);
  const edges = {
    north: edgeOn(range(1)),
    west: edgeOn(range(n)),
    east: edgeOn(range(n).map((t) => t + n - 1)),
  };
  const problems: string[] = [];
  for (const [side, ok] of Object.entries(edges)) if (!ok) problems.push(`no road in from the ${side} edge reaches the land`);
  const room = main >= 0 ? homes[main] : 0;
  if (room < CITY_ROOM) problems.push(`room for ${room} tiles of homes, fewer than ${CITY_ROOM}`);
  // Each kind somewhere on the main land (its top-left tile on it).
  const quays = quayTiles(map);
  const spots: Record<string, number> = {};
  for (const kind of NEEDED) {
    spots[kind] = -1;
    for (let t = 0; t < n * n && spots[kind] < 0; t++) {
      if (!onMain(t)) continue;
      if (kind === 'trading' && !quays[t]) continue;
      if (buildingRefusal(map, s, kind, t % n, Math.floor(t / n)) === '') spots[kind] = t;
    }
    if (spots[kind] < 0) problems.push(`nowhere for ${WORDS[kind]} the roads in reach`);
  }
  return { ok: problems.length === 0, problems, spots, room, edges };
}
