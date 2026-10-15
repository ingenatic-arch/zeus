/**
 * Where things can be built. One set of rules for every tool, so the
 * preview and the sim always agree. Pure functions of the baked map and the
 * sim state.
 */
import { WATER_NONE, type CoastMap } from '../map/bake';
import { TILE_EMPTY, TILE_ROAD, type SimState } from './state';

export const ROAD_COST = 4;
export const PLOT_COST = 10;
export const FOUNTAIN_COST = 150;
export const STARTING_MONEY = 5000;
/** A plot is 2 x 2 tiles. */
export const PLOT_SIZE = 2;

/** Ground must stand at least this far above the sea, or the river beside it. */
export const DRY_MARGIN = 0.06;
/** Largest rise across a tile's corners for a road, and for each tile of a home. */
export const ROAD_MAX_RISE = 0.9;
export const HOME_MAX_RISE = 0.65;

export enum Ground {
  Ok = 0,
  /** Fine for a road, too steep for a home. */
  SteepForHome = 1,
  Steep = 2,
  /** On or under the water, or the river's wet margin. */
  Water = 3,
  OffMap = 4,
}

export const GROUND_REASON: Record<Ground, string> = {
  [Ground.Ok]: '',
  [Ground.SteepForHome]: 'Too steep for a home',
  [Ground.Steep]: 'Too steep',
  [Ground.Water]: 'Too wet: water or the river bank',
  [Ground.OffMap]: 'Beyond the edge of the map',
};

export interface MapIndex {
  size: number;
  /** Ground class per tile (Ground). */
  ground: Uint8Array;
  /** Largest corner height difference per tile. */
  rise: Float32Array;
  /** Tree indices standing on (or just over the edge of) each tile. */
  treesOn: Map<number, number[]>;
  /** The tiles each tree blocks. */
  treeTiles: number[][];
}

const indexes = new WeakMap<CoastMap, MapIndex>();

/** Margin around a tile within which a plant counts as standing on it. */
const TREE_MARGIN = 0.15;

/** Per-tile facts about the ground, worked out once per map. */
export function mapIndex(map: CoastMap): MapIndex {
  let ix = indexes.get(map);
  if (ix) return ix;
  const n = map.size;
  const ground = new Uint8Array(n * n);
  const rise = new Float32Array(n * n);
  // Only tiles near the river need the (slower) river query.
  const r = map.river;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let pad = 0;
  for (let i = 0; i < r.xs.length; i++) {
    minX = Math.min(minX, r.xs[i]);
    maxX = Math.max(maxX, r.xs[i]);
    minZ = Math.min(minZ, r.zs[i]);
    maxZ = Math.max(maxZ, r.zs[i]);
    pad = Math.max(pad, r.width[i]);
  }
  pad += 4;
  for (let tz = 0; tz < n; tz++) {
    for (let tx = 0; tx < n; tx++) {
      const t = tz * n + tx;
      const hs = [map.corner(tx, tz), map.corner(tx + 1, tz), map.corner(tx, tz + 1), map.corner(tx + 1, tz + 1)];
      const lo = Math.min(...hs);
      const hi = Math.max(...hs);
      rise[t] = hi - lo;
      let g = Ground.Ok;
      if (map.tileWater[t] !== WATER_NONE || lo < DRY_MARGIN) g = Ground.Water;
      else if (tx + 0.5 > minX - pad && tx + 0.5 < maxX + pad && tz + 0.5 > minZ - pad && tz + 0.5 < maxZ + pad) {
        // The river's shelf lies just under the water past its visible edge,
        // on tiles the water mask calls land: refuse corners under the surface.
        const cs: Array<[number, number]> = [
          [tx, tz],
          [tx + 1, tz],
          [tx, tz + 1],
          [tx + 1, tz + 1],
        ];
        for (let k = 0; k < 4; k++) {
          const q = map.riverAt(cs[k][0], cs[k][1]);
          if (q.surface > 0.02 && q.d < q.width + 3 && hs[k] < q.surface + DRY_MARGIN) g = Ground.Water;
        }
      }
      if (g === Ground.Ok) {
        if (rise[t] > ROAD_MAX_RISE) g = Ground.Steep;
        else if (rise[t] > HOME_MAX_RISE) g = Ground.SteepForHome;
      }
      ground[t] = g;
    }
  }
  const treesOn = new Map<number, number[]>();
  const treeTiles: number[][] = [];
  map.trees.forEach((tr, i) => {
    const tiles: number[] = [];
    const x0 = Math.floor(tr.x - TREE_MARGIN);
    const x1 = Math.floor(tr.x + TREE_MARGIN);
    const z0 = Math.floor(tr.z - TREE_MARGIN);
    const z1 = Math.floor(tr.z + TREE_MARGIN);
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        if (x < 0 || z < 0 || x >= n || z >= n) continue;
        const t = z * n + x;
        tiles.push(t);
        const list = treesOn.get(t);
        if (list) list.push(i);
        else treesOn.set(t, [i]);
      }
    }
    treeTiles.push(tiles);
  });
  ix = { size: n, ground, rise, treesOn, treeTiles };
  indexes.set(map, ix);
  return ix;
}

export const tileOf = (size: number, tx: number, tz: number): number => tz * size + tx;

/** Why a road can't go on this tile, or '' if it can. */
export function roadRefusal(map: CoastMap, s: SimState, tx: number, tz: number): string {
  const n = map.size;
  if (tx < 0 || tz < 0 || tx >= n || tz >= n) return GROUND_REASON[Ground.OffMap];
  const t = tz * n + tx;
  const g = mapIndex(map).ground[t] as Ground;
  if (g !== Ground.Ok && g !== Ground.SteepForHome) return GROUND_REASON[g];
  const on = s.tiles[t];
  if (on === TILE_ROAD) return 'Already a road';
  if (on !== TILE_EMPTY) return 'Something is built here';
  return '';
}

/** Why a 2 x 2 plot can't have its top-left tile here, or '' if it can. */
export function plotRefusal(map: CoastMap, s: SimState, tx: number, tz: number): string {
  const n = map.size;
  const ix = mapIndex(map);
  for (let dz = 0; dz < PLOT_SIZE; dz++) {
    for (let dx = 0; dx < PLOT_SIZE; dx++) {
      const x = tx + dx;
      const z = tz + dz;
      if (x < 0 || z < 0 || x >= n || z >= n) return GROUND_REASON[Ground.OffMap];
      const t = z * n + x;
      const g = ix.ground[t] as Ground;
      if (g !== Ground.Ok) return GROUND_REASON[g];
      if (s.tiles[t] !== TILE_EMPTY) return 'Something is built here';
    }
  }
  // Uneven ground across the whole plot (each tile may be fine on its own).
  const hs: number[] = [];
  for (let dz = 0; dz <= PLOT_SIZE; dz++) for (let dx = 0; dx <= PLOT_SIZE; dx++) hs.push(map.corner(tx + dx, tz + dz));
  if (Math.max(...hs) - Math.min(...hs) > HOME_MAX_RISE * 1.6) return GROUND_REASON[Ground.SteepForHome];
  return '';
}

/** The road tiles orthogonally beside a plot's footprint, in tile order. */
export function plotNeighbours(size: number, x: number, z: number): number[] {
  const out: number[] = [];
  const add = (tx: number, tz: number): void => {
    if (tx >= 0 && tz >= 0 && tx < size && tz < size) out.push(tz * size + tx);
  };
  for (let d = 0; d < PLOT_SIZE; d++) add(x + d, z - 1);
  for (let d = 0; d < PLOT_SIZE; d++) add(x - 1, z + d);
  for (let d = 0; d < PLOT_SIZE; d++) add(x + PLOT_SIZE, z + d);
  for (let d = 0; d < PLOT_SIZE; d++) add(x + d, z + PLOT_SIZE);
  return out.sort((a, b) => a - b);
}

/** Is this tile on the map's outer edge? Roads there are where settlers come in. */
export function isEdgeTile(size: number, t: number): boolean {
  const tx = t % size;
  const tz = (t - tx) / size;
  return tx === 0 || tz === 0 || tx === size - 1 || tz === size - 1;
}
