/**
 * Where things can be built. One set of rules for every tool, so the
 * preview and the sim always agree. Pure functions of the baked map and the
 * sim state.
 */
import { WATER_NONE, WATER_RIVER, WATER_SEA, type CoastMap } from '../map/bake';
import { dhypot } from '../map/dmath';
import { beside, findBuilding, sideOf } from './buildings';
import { shoreRefusal } from './trade';
import { towerRefusal } from './walls';
import { materialRefusal } from './materials';
import { COLOSSUS_COST, LIGHTHOUSE_COST, MASONS_COST, STADIUM_COST } from './monuments';
import { monumentRefusal } from './monumentworks';
import { TILE_EMPTY, TILE_ROAD, TILE_WALL, type BuildingKind, type SimState } from './state';

export const ROAD_COST = 4;
export const PLOT_COST = 10;
export const FOUNTAIN_COST = 150;
export const FARM_COST = 200;
export const GRANARY_COST = 300;
export const AGORA_COST = 250;
export const SHRINE_COST = 200;
export const THEATRE_COST = 400;
export const TAX_OFFICE_COST = 150;
export const LODGE_COST = 200;
export const DAIRY_COST = 250;
export const GROVE_COST = 150;
export const PRESS_COST = 200;
export const STOREHOUSE_COST = 200;
export const PASTURE_COST = 150;
export const VINEYARD_COST = 150;
export const WINERY_COST = 200;
export const WATCHPOST_COST = 60;
export const ARCHITECT_COST = 80;
/** The trading post: a stone quay with a crane, a counting house and a jetty out to deep water. */
export const TRADING_COST = 250;
/** The caravan yard: a walled yard with a donkey pen, a well and an awning over trestles, where caravans from Greece trade. */
export const YARD_COST = 300;
/** The copper mine (2 x 2, on copper in the rock), the armoury (3 x 3) and the barracks (4 x 4). */
export const MINE_COST = 150;
export const ARMOURY_COST = 300;
export const BARRACKS_COST = 500;
/** A tower on the wall line (2 x 2, slice 25; see walls.ts). */
export const TOWER_COST = 200;
/** The shipyard (3 x 3 on the shore, like the trading post; slice 26, see fleet.ts): its triremes are paid for as they are ordered. */
export const SHIPYARD_COST = 300;
/** The marble quarry (3 x 3, on marble in the rock) and the loggers' camp (2 x 2, at a wood's edge; slice 32, see materials.ts). */
export const QUARRY_COST = 250;
export const LOGGERS_COST = 150;
/** Slice 36: the horse farm (3 x 3, on grassland), and an estate's plot (4 x 4, on housing ground). */
export const HORSEFARM_COST = 300;
/** Slice 45: the court and the prison (justice.ts). */
export const COURT_COST = 300;
export const PRISON_COST = 400;
export const ESTATE_PLOT_COST = 100;
/** Clearing rubble: a small fee for each heap, by its footprint (2 x 2, 3 x 3). */
export const CLEAR_SMALL = 10;
export const CLEAR_BIG = 20;
/** What adding a stall for a good (oil, fleece or wine) to an agora costs. */
export const STALL_COST = 100;
/** A bridge costs this much a tile. */
export const BRIDGE_COST = 40;
/** The most tiles of river and wet bank a bridge spans. */
export const BRIDGE_MAX = 9;
export const STARTING_MONEY = 5000;

/** What each building costs. */
export const COST: Record<BuildingKind, number> = {
  home: PLOT_COST,
  fountain: FOUNTAIN_COST,
  farm: FARM_COST,
  granary: GRANARY_COST,
  agora: AGORA_COST,
  shrine: SHRINE_COST,
  theatre: THEATRE_COST,
  taxoffice: TAX_OFFICE_COST,
  lodge: LODGE_COST,
  dairy: DAIRY_COST,
  grove: GROVE_COST,
  press: PRESS_COST,
  storehouse: STOREHOUSE_COST,
  pasture: PASTURE_COST,
  vineyard: VINEYARD_COST,
  winery: WINERY_COST,
  watchpost: WATCHPOST_COST,
  architect: ARCHITECT_COST,
  rubble: 0,
  trading: TRADING_COST,
  yard: YARD_COST,
  mine: MINE_COST,
  armoury: ARMOURY_COST,
  barracks: BARRACKS_COST,
  tower: TOWER_COST,
  shipyard: SHIPYARD_COST,
  quarry: QUARRY_COST,
  loggers: LOGGERS_COST,
  // Slice 35: the masons' yard and the monuments (monuments.ts): the most expensive things in the game.
  masons: MASONS_COST,
  lighthouse: LIGHTHOUSE_COST,
  colossus: COLOSSUS_COST,
  stadium: STADIUM_COST,
  // Slice 36.
  horsefarm: HORSEFARM_COST,
  // Slice 45.
  court: COURT_COST,
  prison: PRISON_COST,
};

/** What clearing a heap of rubble with this footprint side costs. */
export const clearFee = (side: number): number => (side <= 2 ? CLEAR_SMALL : side <= 3 ? CLEAR_BIG : CLEAR_BIG * 2);

/** What the refusals say about building on rubble. */
export const RUBBLE_REFUSAL = 'Rubble: clear it first, with the clear tool';

/** Why something can't go on a tile that isn't empty. */
function builtHere(s: SimState, t: number): string {
  if (s.tiles[t] === TILE_WALL) return 'A wall stands here: draw the wall across a road to make a gate, or clear it first';
  const b = s.tiles[t] > 0 ? findBuilding(s, s.tiles[t]) : undefined;
  return b?.kind === 'rubble' ? RUBBLE_REFUSAL : 'Something is built here';
}

/** A farm needs at least this mean fertility over its tiles (the green river land). */
export const FARM_FERTILE_MIN = 0.5;
/** A dairy needs at least this much grass over its footprint (see grassOf). */
export const DAIRY_GRASS_MIN = 0.35;
/** The olive ground an olive grove needs at least (0..1; see tileOlive). */
export const GROVE_OLIVE_MIN = 0.35;
/** A sheep pasture needs at least this much grass, like a dairy (see grassOf). */
export const PASTURE_GRASS_MIN = 0.35;
/** The vine ground a vineyard needs at least (0..1; see tileVine). */
export const VINE_MIN = 0.35;
/** A plot is 2 x 2 tiles. */
export const PLOT_SIZE = 2;
/** Slice 36: an estate's plot is 4 x 4; a horse farm needs grass like a dairy's. */
export const ESTATE_SIZE = 4;
export const HORSE_GRASS_MIN = 0.35;

/** Slice 36: why an estate's plot can't have its top-left tile here, or '' if it can: housing ground, four tiles square. */
export function estateRefusal(map: CoastMap, s: SimState, tx: number, tz: number): string {
  const r = footprintRefusal(map, s, tx, tz, ESTATE_SIZE);
  return r === 'Too uneven for a building this size' ? 'Too uneven for an estate: its house and courtyard need ground about as level as a home’s' : r;
}

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
  if (on !== TILE_EMPTY) return builtHere(s, t);
  if (besideBridge(map, s, t)) return 'Too close to the side of a bridge';
  return '';
}

/** Is this tile part of a bridge (a road over the river or its wet bank)? */
export function isBridge(map: CoastMap, s: SimState, t: number): boolean {
  return s.tiles[t] === TILE_ROAD && mapIndex(map).ground[t] === Ground.Water;
}

/** Does a bridge run east-west through this bridge tile (rather than north-south)? */
export function bridgeRunsEastWest(map: CoastMap, s: SimState, t: number): boolean {
  const n = map.size;
  const tx = t % n;
  return (tx > 0 && s.tiles[t - 1] === TILE_ROAD) || (tx < n - 1 && s.tiles[t + 1] === TILE_ROAD);
}

/** Would a road on this tile touch the side of a bridge (rather than one of its ends)? */
function besideBridge(map: CoastMap, s: SimState, t: number): boolean {
  const n = map.size;
  const tx = t % n;
  const check = (u: number, eastWest: boolean): boolean => isBridge(map, s, u) && bridgeRunsEastWest(map, s, u) !== eastWest;
  if (t >= n && check(t - n, false)) return true;
  if (t < n * (n - 1) && check(t + n, false)) return true;
  if (tx > 0 && check(t - 1, true)) return true;
  if (tx < n - 1 && check(t + 1, true)) return true;
  return false;
}

/** One step in a direction: 1 north, 2 west, 3 east, 4 south. */
export const stepOf = (n: number, dir: number): number => (dir === 1 ? -n : dir === 2 ? -1 : dir === 3 ? 1 : n);

/**
 * A bridge from the land tile `from` straight out in direction `dir` over the
 * river: the wet tiles it would span and the land tile it would reach, or why
 * there can be none. Spans at most BRIDGE_MAX tiles of river and wet bank,
 * never the sea, onto ground a road can take, with no road against its sides.
 */
export function bridgeSpan(map: CoastMap, s: SimState, from: number, dir: number): { tiles: number[]; end: number; reason: string } {
  const n = map.size;
  const ix = mapIndex(map);
  const step = stepOf(n, dir);
  const tiles: number[] = [];
  let t = from;
  let river = false;
  let sea = false;
  const none = (reason: string): { tiles: number[]; end: number; reason: string } => ({ tiles, end: -1, reason });
  while (true) {
    const tx = t % n;
    // Off the map, or wrapping round a row.
    if ((dir === 2 && tx === 0) || (dir === 3 && tx === n - 1) || t + step < 0 || t + step >= n * n) return none('');
    t += step;
    if (ix.ground[t] !== Ground.Water) break;
    if (map.tileWater[t] === WATER_SEA) sea = true;
    if (map.tileWater[t] === WATER_RIVER) river = true;
    tiles.push(t);
    if (tiles.length > BRIDGE_MAX + 4) break;
  }
  if (tiles.length === 0) return none('');
  if (sea) return none('A bridge can’t cross the sea');
  if (!river) return none('Too wet: water or the river bank');
  if (tiles.length > BRIDGE_MAX) return none(`Too wide to bridge here: ${tiles.length > BRIDGE_MAX + 4 ? 'more than ' + (BRIDGE_MAX + 4) : tiles.length} tiles of river and bank (a bridge spans ${BRIDGE_MAX} at most)`);
  const g = ix.ground[t];
  if (g !== Ground.Ok && g !== Ground.SteepForHome) return none(`The far bank is ${GROUND_REASON[g as Ground].toLowerCase()}`);
  if (s.tiles[t] > 0) return none('Something is built on the far bank');
  for (const u of tiles) {
    if (s.tiles[u] !== TILE_EMPTY) return none('Something is in the way');
    // No road against a bridge's sides.
    const ux = u % n;
    const sides = dir === 1 || dir === 4 ? [ux > 0 ? u - 1 : -1, ux < n - 1 ? u + 1 : -1] : [u - n, u + n];
    if (sides.some((v) => v >= 0 && v < n * n && s.tiles[v] === TILE_ROAD)) return none('Too close to another bridge');
  }
  return { tiles, end: t, reason: '' };
}

/** Every tile of the bridge through bridge tile `t`, in order along it. */
export function bridgeAt(map: CoastMap, s: SimState, t: number): number[] {
  const n = map.size;
  const step = bridgeRunsEastWest(map, s, t) ? 1 : n;
  let a = t;
  while (a - step >= 0 && (step === n || (a % n) > 0) && isBridge(map, s, a - step)) a -= step;
  const out: number[] = [];
  for (let u = a; u < n * n && isBridge(map, s, u); u += step) {
    out.push(u);
    if (step === 1 && u % n === n - 1) break;
  }
  return out;
}

/** Why a 2 x 2 plot can't have its top-left tile here, or '' if it can. */
export function plotRefusal(map: CoastMap, s: SimState, tx: number, tz: number): string {
  return footprintRefusal(map, s, tx, tz, PLOT_SIZE);
}

/** The mean fertility of a footprint's tiles (0..1). */
export function fertilityOf(map: CoastMap, x: number, z: number, side: number): number {
  const n = map.size;
  let f = 0;
  for (let dz = 0; dz < side; dz++) for (let dx = 0; dx < side; dx++) f += map.tileFertility[Math.min(n - 1, z + dz) * n + Math.min(n - 1, x + dx)];
  return f / (side * side);
}

/**
 * How good a tile's grass is for goats (0..1): fertile ground grows it, rock
 * doesn't. Most of the land between the hills and the sea is grassy enough;
 * the hilltops, the crags and the sandy shore are not.
 */
export function tileGrass(map: CoastMap, t: number): number {
  const n = map.size;
  const tx = t % n;
  const tz = (t - tx) / n;
  const rock = map.sample(map.rock, tx + 0.5, tz + 0.5);
  return Math.max(0, Math.min(1, map.tileFertility[t] / 0.4)) * Math.max(0, 1 - rock * 1.5);
}

/** The mean grass of a footprint's tiles (0..1). */
export function grassOf(map: CoastMap, x: number, z: number, side: number): number {
  const n = map.size;
  let g = 0;
  for (let dz = 0; dz < side; dz++) for (let dx = 0; dx < side; dx++) g += tileGrass(map, Math.min(n - 1, z + dz) * n + Math.min(n - 1, x + dx));
  return g / (side * side);
}

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * How good a tile is for olives (0..1): dry ground (not the green flood plain
 * by the river), not rock, above the shore, and best on a slope, where the
 * wild olives grow. Most of the hillsides and the scrub suit; the river land,
 * the crags and the sand do not.
 */
export function tileOlive(map: CoastMap, t: number): number {
  const n = map.size;
  const tx = t % n;
  const tz = (t - tx) / n;
  const dry = 1 - smooth(0.25, 0.6, map.tileFertility[t]);
  const rock = map.sample(map.rock, tx + 0.5, tz + 0.5);
  const up = smooth(0.3, 1.2, map.heightAt(tx + 0.5, tz + 0.5));
  const slope = smooth(0.05, 0.4, mapIndex(map).rise[t]);
  return dry * Math.max(0, 1 - rock * 1.5) * up * (0.45 + 0.55 * slope);
}

/** The mean olive ground of a footprint's tiles (0..1). */
export function oliveOf(map: CoastMap, x: number, z: number, side: number): number {
  const n = map.size;
  let g = 0;
  for (let dz = 0; dz < side; dz++) for (let dx = 0; dx < side; dx++) g += tileOlive(map, Math.min(n - 1, z + dz) * n + Math.min(n - 1, x + dx));
  return g / (side * side);
}

/**
 * How much of the afternoon sun a tile's slope catches (0..1): 1 where the
 * ground falls away towards the south-west (where the light comes from), a
 * half on the flat, little on a slope turned away from it.
 */
export function tileSun(map: CoastMap, t: number): number {
  const n = map.size;
  const tx = t % n;
  const tz = (t - tx) / n;
  // The rise across the tile, east (+x) and south (+z).
  const dx = (map.corner(tx + 1, tz) + map.corner(tx + 1, tz + 1) - map.corner(tx, tz) - map.corner(tx, tz + 1)) / 2;
  const dz = (map.corner(tx, tz + 1) + map.corner(tx + 1, tz + 1) - map.corner(tx, tz) - map.corner(tx + 1, tz)) / 2;
  // Facing the sun (from the south-west: -x, +z) is ground that rises to the east and falls to the south.
  const facing = 0.79 * dx - 0.61 * dz;
  return 0.5 + 0.5 * Math.max(-1, Math.min(1, facing / 0.35));
}

/**
 * How good a tile is for vines (0..1): dry ground like the olives' (not the
 * flood plain, not rock, above the shore), best on a slope that catches the
 * afternoon sun. The sunny hillsides suit; the river land, the crags, the sand
 * and the slopes turned away from the sun do not.
 */
export function tileVine(map: CoastMap, t: number): number {
  const n = map.size;
  const tx = t % n;
  const tz = (t - tx) / n;
  const dry = 1 - smooth(0.25, 0.6, map.tileFertility[t]);
  const rock = map.sample(map.rock, tx + 0.5, tz + 0.5);
  const up = smooth(0.3, 1.0, map.heightAt(tx + 0.5, tz + 0.5));
  const slope = smooth(0.05, 0.4, mapIndex(map).rise[t]);
  const sun = tileSun(map, t);
  // Flat ground does for vines at about half the yield; a slope in the sun does best, a slope turned away from it hardly at all.
  return dry * Math.max(0, 1 - rock * 1.5) * up * (0.25 + 0.75 * (slope * sun + (1 - slope) * 0.35));
}

/** The mean vine ground of a footprint's tiles (0..1). */
export function vineOf(map: CoastMap, x: number, z: number, side: number): number {
  const n = map.size;
  let g = 0;
  for (let dz = 0; dz < side; dz++) for (let dx = 0; dx < side; dx++) g += tileVine(map, Math.min(n - 1, z + dz) * n + Math.min(n - 1, x + dx));
  return g / (side * side);
}

/** A copper mine needs at least this much copper in the rock over its footprint (0..1; see tileCopper). */
export const MINE_COPPER_MIN = 0.3;

const coppers = new WeakMap<CoastMap, Float32Array>();

/**
 * How rich a tile's rock is in copper (0..1): within one of the coast's
 * outcrops (coast.copper), richest at its centre and nothing at its edge, and
 * only where the ground is rock. Worked out once per map, apart from the bake.
 */
export function tileCopper(map: CoastMap, t: number): number {
  let grid = coppers.get(map);
  if (!grid) {
    const n = map.size;
    grid = new Float32Array(n * n);
    for (const o of map.data.copper) {
      for (let z = Math.max(0, Math.floor(o.z - o.r)); z <= Math.min(n - 1, Math.ceil(o.z + o.r)); z++) {
        for (let x = Math.max(0, Math.floor(o.x - o.r)); x <= Math.min(n - 1, Math.ceil(o.x + o.r)); x++) {
          const d = dhypot(x + 0.5 - o.x, z + 0.5 - o.z) / o.r;
          if (d >= 1) continue;
          const rock = smooth(0.15, 0.45, map.sample(map.rock, x + 0.5, z + 0.5));
          const v = Math.min(1, (1 - d * d) * 1.25) * rock;
          const i = z * n + x;
          grid[i] = Math.max(grid[i], Math.round(v * 100) / 100);
        }
      }
    }
    coppers.set(map, grid);
  }
  return grid[t] ?? 0;
}

/** The mean copper of a footprint's tiles (0..1). */
export function copperOf(map: CoastMap, x: number, z: number, side: number): number {
  const n = map.size;
  let g = 0;
  for (let dz = 0; dz < side; dz++) for (let dx = 0; dx < side; dx++) g += tileCopper(map, Math.min(n - 1, z + dz) * n + Math.min(n - 1, x + dx));
  return g / (side * side);
}

/** Where the copper outcrop nearest a tile is said to be ("in the east hills"; slice 42: on the map's own land). */
export function outcropPlace(map: CoastMap, x: number, z: number): string {
  let best = map.data.copper[0];
  let bd = Infinity;
  for (const o of map.data.copper) {
    const d = dhypot(x - o.x, z - o.z);
    if (d < bd) {
      bd = d;
      best = o;
    }
  }
  return best.place;
}

/** Slice 46: is there water under the ground anywhere on a footprint (always, but on a dry land)? */
export function wellWater(map: CoastMap, x: number, z: number, side: number): boolean {
  const gw = map.groundwater;
  if (!gw) return true;
  const n = map.size;
  for (let dz = 0; dz < side; dz++) for (let dx = 0; dx < side; dx++) if (gw[Math.min(n - 1, z + dz) * n + Math.min(n - 1, x + dx)]) return true;
  return false;
}

/** Kinds planted on the slopes, each tree or vine on its own ground (and the copper mine and the marble quarry, cut into the hillside): they take ground too steep and uneven for a house. */
export const onSlopes = (kind: BuildingKind): boolean => kind === 'grove' || kind === 'vineyard' || kind === 'mine' || kind === 'quarry' || kind === 'lighthouse';

/** Why a building of this kind can't have its top-left tile here, or '' if it can. */
export function buildingRefusal(map: CoastMap, s: SimState, kind: BuildingKind, tx: number, tz: number): string {
  if (kind === 'rubble') return 'Rubble isn’t built';
  if (kind === 'tower') return towerRefusal(map, s, tx, tz);
  const side = sideOf(kind);
  const r = footprintRefusal(map, s, tx, tz, side, onSlopes(kind));
  // (The ground's own word is a home's: for anything else, it is too steep for that.)
  if (r === GROUND_REASON[Ground.SteepForHome] && kind !== 'home') return 'Too steep to build on: roads, olive groves, vineyards, mines and quarries can take a slope like this';
  if (r) return r;
  if (kind === 'farm' && fertilityOf(map, tx, tz, side) < FARM_FERTILE_MIN) return 'Not fertile enough for wheat: farms need the green land by the river';
  // Slice 46: on a dry land, a fountain needs water under the ground.
  if (kind === 'fountain' && !wellWater(map, tx, tz, side)) return 'Too dry for a fountain here: on the dry plain, water lies under the ground only near the river, the springs and the shore';
  if (kind === 'dairy' && grassOf(map, tx, tz, side) < DAIRY_GRASS_MIN) return 'Too little grass for goats: a dairy needs green pasture, not rock or sand';
  if (kind === 'pasture' && grassOf(map, tx, tz, side) < PASTURE_GRASS_MIN) return 'Too little grass for sheep: a pasture needs green grass, not rock or sand';
  // Slice 36.
  if (kind === 'horsefarm' && grassOf(map, tx, tz, side) < HORSE_GRASS_MIN) return 'Too little grass for horses: a horse farm needs green grassland, not rock or sand';
  if (kind === 'grove' && oliveOf(map, tx, tz, side) < GROVE_OLIVE_MIN) return 'Poor ground for olives: groves need the dry slopes, not the river land, rock or sand';
  if (kind === 'trading') {
    if (s.buildings.some((b) => b.kind === 'trading')) return 'Only one trading post: the ship calls at one quay';
    const shore = shoreRefusal(map, tx, tz);
    if (shore) return shore;
  }
  if (kind === 'shipyard') {
    // (On the shore like the trading post, its jetty out over deep water; as many as you like.)
    const shore = shoreRefusal(map, tx, tz);
    if (shore) return shore.replace('trading post', 'shipyard');
  }
  if (kind === 'yard' && s.buildings.some((b) => b.kind === 'yard')) return 'Only one caravan yard: every caravan comes to it';
  if (kind === 'mine' && copperOf(map, tx, tz, side) < MINE_COPPER_MIN) return 'No copper in the rock here: a mine needs the green-streaked rock in the hills';
  // Slice 32: the quarry on marble, the loggers' camp at a wood's edge.
  if (kind === 'quarry' || kind === 'loggers') {
    const m = materialRefusal(map, s, kind, tx, tz);
    if (m) return m;
  }
  // Slice 35: one of each monument, the Lighthouse high over the sea, the Colossus by deep water.
  if (kind === 'lighthouse' || kind === 'colossus' || kind === 'stadium') {
    const m = monumentRefusal(map, s, kind, tx, tz);
    if (m) return m;
  }
  if (kind === 'vineyard' && vineOf(map, tx, tz, side) < VINE_MIN) return 'Poor ground for vines: vineyards need dry slopes in the sun, not the river land, rock, sand or a slope turned away from the sun';
  return '';
}

/**
 * How uneven an olive grove's ground may be (the rise across its corners):
 * its trees stand each on its own ground, terraced into the slope, so a grove
 * takes hillsides too steep for a house or a press.
 */
export const GROVE_MAX_RISE = 2.2;

/** Why a square footprint of this side can't have its top-left tile here, or '' if it can. `slope`: a grove's, which takes ground too steep for a home and more uneven ground. */
export function footprintRefusal(map: CoastMap, s: SimState, tx: number, tz: number, side: number, slope = false): string {
  const n = map.size;
  const ix = mapIndex(map);
  for (let dz = 0; dz < side; dz++) {
    for (let dx = 0; dx < side; dx++) {
      const x = tx + dx;
      const z = tz + dz;
      if (x < 0 || z < 0 || x >= n || z >= n) return GROUND_REASON[Ground.OffMap];
      const t = z * n + x;
      const g = ix.ground[t] as Ground;
      if (g !== Ground.Ok && !(slope && g === Ground.SteepForHome)) return GROUND_REASON[g];
      if (s.tiles[t] !== TILE_EMPTY) return s.tiles[t] === TILE_ROAD ? 'Something is built here' : builtHere(s, t);
    }
  }
  // Uneven ground across the whole footprint (each tile may be fine on its own).
  const hs: number[] = [];
  for (let dz = 0; dz <= side; dz++) for (let dx = 0; dx <= side; dx++) hs.push(map.corner(tx + dx, tz + dz));
  if (Math.max(...hs) - Math.min(...hs) > (slope ? GROVE_MAX_RISE : HOME_MAX_RISE * (side <= 2 ? 1.6 : 2))) return side <= 2 ? GROUND_REASON[Ground.SteepForHome] : 'Too uneven for a building this size';
  return '';
}

/** The tiles orthogonally beside a 2 x 2 plot's footprint, in tile order. */
export function plotNeighbours(size: number, x: number, z: number): number[] {
  return beside(size, x, z, PLOT_SIZE);
}

/** Is this tile on the map's outer edge? Roads there are where settlers come in. */
export function isEdgeTile(size: number, t: number): boolean {
  const tx = t % size;
  const tz = (t - tx) / size;
  return tx === 0 || tz === 0 || tx === size - 1 || tz === size - 1;
}
