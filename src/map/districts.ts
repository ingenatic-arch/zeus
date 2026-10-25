/**
 * The coast's districts: the land cut into a dozen named parts, so the
 * ledger can say where taxes came from and later notes where something
 * happened ("Smoke over the Kallias house by the olive grove"). Authored as
 * data, like the hills and the groves: each district is the land nearest one
 * named place, and the land along the river, within its flood plain, is the
 * flood plain. Pure; worked out once per map, per tile.
 */
import type { CoastMap } from './bake';
import { sq } from './dmath';

/** A named place: where it is, and how a sentence says where something is ("by the olive grove"). */
export interface District {
  x: number;
  z: number;
  /** "by the olive grove": fits after a noun ("a house by the olive grove"). */
  where: string;
}

/** The named places, in a fixed order (a district is saved as its index here). */
export const DISTRICTS: readonly District[] = [
  { x: 52, z: 47, where: 'on the flood plain' },
  { x: 16, z: 24, where: 'below the crags' },
  { x: 14, z: 46, where: 'on the west bank' },
  { x: 18, z: 68, where: 'on the olive slopes' },
  { x: 12, z: 92, where: 'on the west shore' },
  { x: 50, z: 74, where: 'at the river mouth' },
  { x: 62, z: 14, where: 'in the north hills' },
  { x: 68, z: 30, where: 'below the cypress hill' },
  { x: 86, z: 42, where: 'by the olive grove' },
  { x: 112, z: 20, where: 'in the east hills' },
  { x: 112, z: 46, where: 'on the east road' },
  { x: 72, z: 62, where: 'by the bay' },
  { x: 94, z: 68, where: 'by the pine wood' },
  { x: 112, z: 94, where: 'on the headland' },
];

/** The flood plain is district 0: the land within this share of the river's flood plain. */
const PLAIN = 0;
const PLAIN_SHARE = 0.8;

const cache = new WeakMap<CoastMap, Uint8Array>();

/** Each tile's district (an index into DISTRICTS). */
export function districtGrid(map: CoastMap): Uint8Array {
  let grid = cache.get(map);
  if (grid) return grid;
  const n = map.size;
  // (Slice 42: a generated land puts each named place where its feature is; the Bay's are DISTRICTS' own.)
  const at = map.data.districts ?? DISTRICTS;
  grid = new Uint8Array(n * n);
  for (let z = 0; z < n; z++) {
    for (let x = 0; x < n; x++) {
      const cx = x + 0.5;
      const cz = z + 0.5;
      const q = map.riverAt(cx, cz);
      if (q.d < q.valley * PLAIN_SHARE) {
        grid[z * n + x] = PLAIN;
        continue;
      }
      let best = 1;
      let bd = Infinity;
      for (let i = 1; i < DISTRICTS.length; i++) {
        const d = sq(at[i].x - cx) + sq(at[i].z - cz);
        if (d < bd) [best, bd] = [i, d];
      }
      grid[z * n + x] = best;
    }
  }
  cache.set(map, grid);
  return grid;
}

/** The district a spot (world units) lies in. */
export function districtAt(map: CoastMap, x: number, z: number): number {
  const n = map.size;
  const tx = Math.max(0, Math.min(n - 1, Math.floor(x)));
  const tz = Math.max(0, Math.min(n - 1, Math.floor(z)));
  return districtGrid(map)[tz * n + tx];
}

/** "By the olive grove", for the start of a line. */
export const districtTitle = (i: number): string => {
  const w = DISTRICTS[i]?.where ?? 'elsewhere';
  return w[0].toUpperCase() + w.slice(1);
};
