/**
 * The land a city is founded on (slice 42): its kind, its size and its seed,
 * and the baked map that comes from them. A state with no land is on the
 * Bay, the hand-made coast of 128 tiles a side (coast.ts), as every town was
 * before; a generated land comes from generateCoast (generate.ts).
 *
 * What the rest of the game asks, mechanically:
 * - in sim code with a map, `map.size`; with only a state, `sizeOf(s)`;
 * - a state's baked map, `mapOf(s)` (never coastMap() in sim code);
 * - the Bay's size, `BAY.size` (MAP_SIZE stays in coast.ts as just that).
 *
 * Pure: the same land always bakes to the same map, so keeping it is only a
 * saving of time.
 */
import { bakeCoast, coastMap, type CoastMap } from './bake';
import { coast, MAP_SIZE, type CoastData } from './coast';
import { generateCoast } from './generate';

/** The kinds of land: the Bay (hand-made), and the generated kinds. */
export const LAND_KINDS = ['bay', 'sheltered'] as const;
export type LandKind = (typeof LAND_KINDS)[number];
/** The sizes a land comes in: small (the Bay's), medium and large. */
export const LAND_SIZES = [128, 192, 256] as const;

export interface Land {
  kind: LandKind;
  /** Tiles a side. */
  size: number;
  /** The generator's seed (0 on the Bay). */
  seed: number;
}

/** The Bay: today's hand-made coast, 128 tiles a side. */
export const BAY: Readonly<Land> = { kind: 'bay', size: MAP_SIZE, seed: 0 };

/** A state's land (the Bay if it has none: every town from before slice 42). */
export const landOf = (s: { land?: Land }): Land => s.land ?? BAY;

/** A state's map's side, in tiles. */
export const sizeOf = (s: { land?: Land }): number => landOf(s).size;

/** Is this the Bay? */
export const isBay = (land: Land): boolean => land.kind === 'bay';

/** What is wrong with a land read from a save, in plain words ('' if it is one this game can make). */
export function landProblem(v: unknown): string {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return 'its land is missing';
  const l = v as Record<string, unknown>;
  if (!(LAND_KINDS as readonly unknown[]).includes(l.kind)) return 'it is on a kind of land this game doesn’t have';
  if (!(LAND_SIZES as readonly unknown[]).includes(l.size)) return 'its land is of a size this game doesn’t make';
  if (typeof l.seed !== 'number' || !Number.isInteger(l.seed) || l.seed < 0 || l.seed > 0xffffffff) return 'its land’s seed is wrong';
  if (l.kind === 'bay' && (l.size !== MAP_SIZE || l.seed !== 0)) return 'its land is wrong';
  return '';
}

/** A land's shapes: the Bay's own, or generated from its kind, size and seed. */
export function landData(land: Land): CoastData {
  return isBay(land) ? coast : generateCoast(land.kind, land.size, land.seed);
}

const keyOf = (land: Land): string => `${land.kind}:${land.size}:${land.seed}`;
/** The generated lands baked lately (a couple: a page uses one; the tests a few in turn). */
const kept = new Map<string, CoastMap>();
const KEEP = 2;
let last: { land: Land; map: CoastMap } | null = null;

/** A land, baked (once; the Bay is always kept, and the last few others). */
export function landMap(land: Land): CoastMap {
  if (last && last.land === land) return last.map;
  let map: CoastMap;
  if (isBay(land)) map = coastMap();
  else {
    const key = keyOf(land);
    const hit = kept.get(key);
    if (hit) map = hit;
    else {
      map = bakeCoast(landData(land));
      kept.set(key, map);
      if (kept.size > KEEP) kept.delete(kept.keys().next().value as string);
    }
  }
  last = { land, map };
  return map;
}

/** A state's baked map. */
export const mapOf = (s: { land?: Land }): CoastMap => landMap(landOf(s));
