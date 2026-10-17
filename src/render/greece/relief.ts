/**
 * The Aegean as a toy relief: a height field over the table from the coast
 * outlines, island blobs and mountain ridges (map/aegean.ts), with the land
 * rising from the shore and a painted sea floor sinking from it. Built once,
 * the first time the map opens.
 *
 * The coast is where the signed distance to the outlines crosses zero:
 * worked out exactly within a few units of the shore and by a quick chamfer
 * pass further off, so the shore is smooth and the build stays fast.
 */
import * as THREE from 'three';
import { ISLES, OUTLINES, RIDGES, type Outline } from '../../map/aegean';
import { DEG, project, TABLE_D, TABLE_W } from '../../map/greece';
import { clamp, fbm, hash2, ridged, smoothstep } from '../../map/noise';

/** Grid spacing (table units). */
export const CELL = 0.5;
const NX = Math.ceil(TABLE_W / CELL) + 1;
const NZ = Math.ceil(TABLE_D / CELL) + 1;
/** Within this far of the shore the distance is exact. */
const NEAR = 3;

export interface Relief {
  nx: number;
  nz: number;
  /** Height at each grid point (sea floor below 0, land above). */
  height: Float32Array;
  /** Signed distance to the shore (land positive). */
  dist: Float32Array;
  /** Height anywhere on the table (bilinear), and never below the water. */
  heightAt(x: number, z: number): number;
  /** Is a table point on land? */
  land(x: number, z: number): boolean;
}

/** Each small island as an outline: a blob, a little irregular. */
function isleOutline(i: (typeof ISLES)[number], n: number): Outline {
  const pts: Array<[number, number]> = [];
  const turn = i.turn ?? 0;
  const k = 12;
  for (let j = 0; j < k; j++) {
    const a = (j / k) * Math.PI * 2;
    const r = 0.82 + hash2(n, j, 0x15e) * 0.3;
    const u = Math.cos(a) * i.rx * r;
    const v = Math.sin(a) * i.ry * r;
    pts.push([i.lon + u * Math.cos(turn) - v * Math.sin(turn), i.lat + u * Math.sin(turn) + v * Math.cos(turn)]);
  }
  return pts;
}

export function buildRelief(): Relief {
  const polys = [...OUTLINES, ...ISLES.map(isleOutline)].map((o) => o.flatMap(([lon, lat]) => project(lon, lat)));
  const n = NX * NZ;
  // Land or sea at each grid point: crossings of each row with every outline (even-odd per outline).
  const mask = new Uint8Array(n);
  for (let iz = 0; iz < NZ; iz++) {
    const z = iz * CELL;
    for (const p of polys) {
      const xs: number[] = [];
      const m = p.length / 2;
      for (let i = 0, j = m - 1; i < m; j = i++) {
        const zi = p[i * 2 + 1];
        const zj = p[j * 2 + 1];
        if (zi > z !== zj > z) xs.push(p[i * 2] + ((p[j * 2] - p[i * 2]) * (z - zi)) / (zj - zi));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const a = Math.max(0, Math.ceil(xs[k] / CELL));
        const b = Math.min(NX - 1, Math.floor(xs[k + 1] / CELL));
        for (let ix = a; ix <= b; ix++) mask[iz * NX + ix] = 1;
      }
    }
  }
  // Rough distance to the shore everywhere (chamfer, in units), then exact near it.
  const far = new Float32Array(n).fill(1e9);
  for (let iz = 0; iz < NZ; iz++) {
    for (let ix = 0; ix < NX; ix++) {
      const i = iz * NX + ix;
      const m = mask[i];
      if ((ix > 0 && mask[i - 1] !== m) || (ix < NX - 1 && mask[i + 1] !== m) || (iz > 0 && mask[i - NX] !== m) || (iz < NZ - 1 && mask[i + NX] !== m)) far[i] = CELL * 0.5;
    }
  }
  const D1 = CELL;
  const D2 = CELL * Math.SQRT2;
  for (let iz = 0; iz < NZ; iz++) {
    for (let ix = 0; ix < NX; ix++) {
      const i = iz * NX + ix;
      let d = far[i];
      if (ix > 0) d = Math.min(d, far[i - 1] + D1);
      if (iz > 0) {
        d = Math.min(d, far[i - NX] + D1);
        if (ix > 0) d = Math.min(d, far[i - NX - 1] + D2);
        if (ix < NX - 1) d = Math.min(d, far[i - NX + 1] + D2);
      }
      far[i] = d;
    }
  }
  for (let iz = NZ - 1; iz >= 0; iz--) {
    for (let ix = NX - 1; ix >= 0; ix--) {
      const i = iz * NX + ix;
      let d = far[i];
      if (ix < NX - 1) d = Math.min(d, far[i + 1] + D1);
      if (iz < NZ - 1) {
        d = Math.min(d, far[i + NX] + D1);
        if (ix < NX - 1) d = Math.min(d, far[i + NX + 1] + D2);
        if (ix > 0) d = Math.min(d, far[i + NX - 1] + D2);
      }
      far[i] = d;
    }
  }
  // Every shore segment, bucketed by where it is, for the exact distance near the shore.
  const B = 4;
  const bw = Math.ceil(TABLE_W / B) + 1;
  const bh = Math.ceil(TABLE_D / B) + 1;
  const buckets: number[][] = Array.from({ length: bw * bh }, () => []);
  const segs: number[] = [];
  for (const p of polys) {
    const m = p.length / 2;
    for (let i = 0, j = m - 1; i < m; j = i++) {
      const s = segs.length / 4;
      segs.push(p[j * 2], p[j * 2 + 1], p[i * 2], p[i * 2 + 1]);
      const x0 = Math.floor((Math.min(p[j * 2], p[i * 2]) - NEAR) / B);
      const x1 = Math.floor((Math.max(p[j * 2], p[i * 2]) + NEAR) / B);
      const z0 = Math.floor((Math.min(p[j * 2 + 1], p[i * 2 + 1]) - NEAR) / B);
      const z1 = Math.floor((Math.max(p[j * 2 + 1], p[i * 2 + 1]) + NEAR) / B);
      for (let bz = Math.max(0, z0); bz <= Math.min(bh - 1, z1); bz++) for (let bx = Math.max(0, x0); bx <= Math.min(bw - 1, x1); bx++) buckets[bz * bw + bx].push(s);
    }
  }
  const dist = new Float32Array(n);
  for (let iz = 0; iz < NZ; iz++) {
    for (let ix = 0; ix < NX; ix++) {
      const i = iz * NX + ix;
      let d = far[i];
      if (d < NEAR + 1) {
        const x = ix * CELL;
        const z = iz * CELL;
        let best = 1e9;
        for (const s of buckets[Math.floor(z / B) * bw + Math.floor(x / B)]) {
          const ax = segs[s * 4];
          const az = segs[s * 4 + 1];
          const dx = segs[s * 4 + 2] - ax;
          const dz = segs[s * 4 + 3] - az;
          const l2 = dx * dx + dz * dz;
          const t = l2 > 0 ? clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1) : 0;
          const ex = ax + dx * t - x;
          const ez = az + dz * t - z;
          best = Math.min(best, ex * ex + ez * ez);
        }
        if (best < 1e9) d = Math.min(Math.sqrt(best), Math.max(d, NEAR));
      }
      dist[i] = mask[i] ? d : -d;
    }
  }
  // Heights.
  const ridges = RIDGES.map((r) => {
    const [ax, az] = project(r.a[0], r.a[1]);
    const [bx, bz] = r.b ? project(r.b[0], r.b[1]) : [ax, az];
    return { ax, az, bx, bz, w: r.w * DEG, h: r.h };
  });
  const height = new Float32Array(n);
  for (let iz = 0; iz < NZ; iz++) {
    for (let ix = 0; ix < NX; ix++) {
      const i = iz * NX + ix;
      const x = ix * CELL;
      const z = iz * CELL;
      const d = dist[i];
      if (d <= 0) {
        // The sea floor: shelving off from the shore, deep in the open sea.
        const s = -d;
        height[i] = Math.max(d * 0.3, -0.12) - 0.95 * smoothstep(1, 10, s) - 0.15 * fbm(x * 0.05, z * 0.05, 31, 2) * smoothstep(4, 12, s);
        continue;
      }
      const inland = smoothstep(0.3, 5, d);
      let h = Math.min(d * 0.3, 0.16) + 0.32 * inland + (fbm(x * 0.09, z * 0.09, 7, 3) * 0.5 + 0.2) * 0.45 * inland;
      let top = 0;
      let sum = 0;
      for (const r of ridges) {
        const dx = r.bx - r.ax;
        const dz = r.bz - r.az;
        const l2 = dx * dx + dz * dz;
        const t = l2 > 0 ? clamp(((x - r.ax) * dx + (z - r.az) * dz) / l2, 0, 1) : 0;
        const ex = r.ax + dx * t - x;
        const ez = r.az + dz * t - z;
        const q = (ex * ex + ez * ez) / (r.w * r.w);
        if (q > 9) continue;
        // A craggy crest, not a smooth dome.
        const e = r.h * Math.exp(-q);
        top = Math.max(top, e);
        sum += e;
      }
      // Where ridges meet they join rather than pile up into towers: the highest
      // counts in full, the rest a little.
      h += (top + 0.3 * (sum - top)) * (0.72 + 0.5 * ridged(x * 0.16, z * 0.16, 13, 3));
      height[i] = h * smoothstep(0, 0.6, d) + Math.min(d * 0.3, 0.16) * (1 - smoothstep(0, 0.6, d));
    }
  }
  const sample = (a: Float32Array, x: number, z: number): number => {
    const fx = clamp(x / CELL, 0, NX - 1.001);
    const fz = clamp(z / CELL, 0, NZ - 1.001);
    const ix = Math.floor(fx);
    const iz = Math.floor(fz);
    const u = fx - ix;
    const v = fz - iz;
    const i = iz * NX + ix;
    return a[i] * (1 - u) * (1 - v) + a[i + 1] * u * (1 - v) + a[i + NX] * (1 - u) * v + a[i + NX + 1] * u * v;
  };
  return {
    nx: NX,
    nz: NZ,
    height,
    dist,
    heightAt: (x, z) => Math.max(0, sample(height, x, z)),
    land: (x, z) => sample(dist, x, z) > 0,
  };
}

// ---------------------------------------------------------------------------
// The mesh.

const C = (h: string): THREE.Color => new THREE.Color(h);
const SAND = C('#e9d49c');
const MEADOW = C('#a3a95a');
const OLIVE = C('#8c9a4c');
const OCHRE = C('#d0a463');
const OCHRE_DEEP = C('#be8c52');
const ROCK = C('#a68a6c');
const STONE = C('#9a9188');
const SNOW = C('#f3efe6');
const SHALLOW = C('#86d8c6');
const MID = C('#43b3c6');
const DEEP = C('#2a7aa8');
const ABYSS = C('#1f5f8e');

/** The relief as a mesh: flat-shaded facets, coloured by height, slope and a little noise. */
export function reliefMesh(r: Relief): THREE.Mesh {
  const { nx, nz, height, dist } = r;
  const pos = new Float32Array(nx * nz * 3);
  const colour = new Float32Array(nx * nz * 3);
  const c = new THREE.Color();
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const i = iz * nx + ix;
      const x = ix * CELL;
      const z = iz * CELL;
      const h = height[i];
      pos[i * 3] = x;
      pos[i * 3 + 1] = h;
      pos[i * 3 + 2] = z;
      const d = dist[i];
      const n = fbm(x * 0.12, z * 0.12, 99, 2);
      if (d <= 0) {
        const s = -d;
        // The first row under water is wet sand, so shore triangles don't wash teal up the hills.
        c.copy(SAND).lerp(SHALLOW, smoothstep(0.3, 1.2, s)).lerp(MID, smoothstep(0.8, 3, s)).lerp(DEEP, smoothstep(3, 10, s)).lerp(ABYSS, smoothstep(12, 26, s));
      } else {
        // Slope: how much higher the neighbours are.
        const hx = height[Math.min(i + 1, nx * nz - 1)] - h;
        const hz = height[Math.min(i + nx, nx * nz - 1)] - h;
        const slope = Math.hypot(hx, hz) / CELL;
        if (h < 0.1 + n * 0.04) c.copy(SAND);
        else {
          c.copy(MEADOW).lerp(OLIVE, clamp(0.5 + n * 1.4, 0, 1));
          c.lerp(OCHRE, smoothstep(0.55, 1.3, h + n * 0.3));
          c.lerp(OCHRE_DEEP, smoothstep(1.2, 2.0, h + n * 0.3) * 0.7);
          c.lerp(ROCK, smoothstep(1.9, 2.9, h + n * 0.4));
          c.lerp(STONE, smoothstep(3.0, 3.9, h + n * 0.5));
          c.lerp(SNOW, smoothstep(4.5, 5.0, h + n * 0.6));
          // Steep slopes are bare rock.
          c.lerp(ROCK, smoothstep(0.9, 1.8, slope) * 0.5 * smoothstep(0.4, 1, h));
        }
      }
      colour[i * 3] = c.r;
      colour[i * 3 + 1] = c.g;
      colour[i * 3 + 2] = c.b;
    }
  }
  const index = new Uint32Array((nx - 1) * (nz - 1) * 6);
  let k = 0;
  for (let iz = 0; iz < nz - 1; iz++) {
    for (let ix = 0; ix < nx - 1; ix++) {
      const a = iz * nx + ix;
      const b = a + 1;
      const cc = a + nx;
      const d = cc + 1;
      // Alternate the diagonal, so the facets don't all lean one way.
      if ((ix + iz) % 2 === 0) index.set([a, cc, b, b, cc, d], k);
      else index.set([a, cc, d, a, d, b], k);
      k += 6;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(colour, 3));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0 }));
  m.name = 'greece-relief';
  m.receiveShadow = true;
  m.castShadow = true;
  return m;
}
