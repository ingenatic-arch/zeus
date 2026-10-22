/**
 * What the camera can hear: how much of the view is sea, how wooded the
 * ground is, and how many walkers and carts are close by when it is down in
 * the streets.
 */
import type { CoastMap } from '../map/bake';
import type { CameraView } from '../render/cameraRig';
import type { SimState } from '../sim/state';
import { position } from '../sim/walk';
import type { Listener } from './sound';

const GRID = 8;
let woods: { map: CoastMap; cells: Float32Array; n: number } | null = null;

/** Trees per cell of a coarse grid, 0..1, worked out once. */
function woodsOf(map: CoastMap): { cells: Float32Array; n: number } {
  if (woods && woods.map === map) return woods;
  const n = Math.ceil(map.size / GRID) + 2;
  const cells = new Float32Array(n * n);
  for (const t of map.trees) {
    const cx = Math.floor(t.x / GRID) + 1;
    const cz = Math.floor(t.z / GRID) + 1;
    if (cx >= 0 && cz >= 0 && cx < n && cz < n) cells[cz * n + cx] += 1;
  }
  for (let i = 0; i < cells.length; i++) cells[i] = Math.min(1, cells[i] / 10);
  woods = { map, cells, n };
  return woods;
}

export function earshot(map: CoastMap, v: Required<CameraView>, s: SimState): Listener {
  const r = 6 + v.dist * 0.3;
  let sea = 0;
  let all = 0;
  for (let k = 0; k <= 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const rr = k === 12 ? 0 : r;
    const x = v.x + Math.cos(a) * rr;
    const z = v.z + Math.sin(a) * rr;
    all++;
    if (map.heightAt(x, z) < 0) sea++;
  }
  const w = woodsOf(map);
  const cx = Math.floor(v.x / GRID) + 1;
  const cz = Math.floor(v.z / GRID) + 1;
  let trees = 0;
  for (let dz = -1; dz <= 1; dz++)
    for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx;
      const z = cz + dz;
      if (x >= 0 && z >= 0 && x < w.n && z < w.n) trees += w.cells[z * w.n + x] / 9;
    }
  let walkers = 0;
  let carts = 0;
  if (v.dist < 40) {
    const near = 4 + v.dist * 0.35;
    for (const wk of s.walkers) {
      if (wk.path.length < 2) continue;
      const [x, z] = position(wk);
      if ((x - v.x) ** 2 + (z - v.z) ** 2 > near * near) continue;
      if (wk.kind === 'cart' || wk.kind === 'sledge' || wk.kind === 'oxcart') carts++;
      else walkers++;
    }
  }
  // Buildings burning within earshot.
  let fires = 0;
  const near = 6 + v.dist * 0.4;
  for (const b of s.buildings) {
    if (b.fire !== 2) continue;
    if ((b.x + 1 - v.x) ** 2 + (b.z + 1 - v.z) ** 2 <= near * near) fires++;
  }
  return { x: v.x, z: v.z, dist: v.dist, sea: sea / all, trees: Math.min(1, trees * 1.6), walkers, carts, fires };
}
