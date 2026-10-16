import * as THREE from 'three';
import { splitsMainDiagonal, type CoastMap } from '../map/bake';
import { hash2 } from '../map/noise';
import { Ground, mapIndex, PLOT_SIZE } from '../sim/build';
import { sideOf } from '../sim/buildings';
import { TILE_ROAD, type Building, type SimState } from '../sim/state';
import { facingOf } from './homes';
import { col, PAL } from './palette';

/** Roads and the marked-out ground of plots are drawn in chunks of this many tiles. */
export const STREET_CHUNK = 32;
/** How far the paving sits above the ground (plus a polygon offset). */
const LIFT = 0.035;
/** How far a road stops short of a tile's edge where it doesn't join a neighbour. */
const INSET = 0.1;
/** Sub-grid across a tile: the rim strips, and a centre line so the middle of the road can be lighter than its edges. */
const U = [0, INSET, 0.5, 1 - INSET, 1];
const SUB = U.length - 1;

/**
 * The paving of the roads and the trodden ground of plots: meshes that lie
 * on the terrain's own triangles, rebuilt chunk by chunk when tiles change.
 */
export class Streets {
  readonly group = new THREE.Group();
  private readonly meshes = new Map<number, THREE.Mesh>();
  private readonly material: THREE.MeshStandardMaterial;

  constructor(private readonly map: CoastMap) {
    this.group.name = 'streets';
    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.95,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
    });
  }

  chunkKey(tx: number, tz: number): number {
    const n = Math.ceil(this.map.size / STREET_CHUNK);
    return Math.floor(tz / STREET_CHUNK) * n + Math.floor(tx / STREET_CHUNK);
  }

  /** Rebuild the given chunks from the state. */
  rebuild(s: SimState, keys: Iterable<number>): void {
    const n = Math.ceil(this.map.size / STREET_CHUNK);
    for (const key of keys) {
      const cx = (key % n) * STREET_CHUNK;
      const cz = Math.floor(key / n) * STREET_CHUNK;
      const geo = this.buildChunk(s, cx, cz);
      const old = this.meshes.get(key);
      if (old) {
        this.group.remove(old);
        old.geometry.dispose();
        this.meshes.delete(key);
      }
      if (!geo) continue;
      const mesh = new THREE.Mesh(geo, this.material);
      mesh.name = `streets-${key}`;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      this.meshes.set(key, mesh);
    }
  }

  private buildChunk(s: SimState, cx: number, cz: number): THREE.BufferGeometry | null {
    const map = this.map;
    const size = map.size;
    const pos: number[] = [];
    const colors: number[] = [];
    const road = (tx: number, tz: number): boolean => tx >= 0 && tz >= 0 && tx < size && tz < size && s.tiles[tz * size + tx] === TILE_ROAD;
    // Is the global sub-cell (gx, gz) paved? Each tile is split SUB x SUB;
    // the outer strips are paved only where the road joins a neighbour.
    const paved = (gx: number, gz: number): boolean => {
      const tx = Math.floor(gx / SUB);
      const tz = Math.floor(gz / SUB);
      if (!road(tx, tz)) return false;
      const i = gx - tx * SUB;
      const j = gz - tz * SUB;
      const dx = i === 0 ? -1 : i === SUB - 1 ? 1 : 0;
      const dz = j === 0 ? -1 : j === SUB - 1 ? 1 : 0;
      if (dx !== 0 && !road(tx + dx, tz)) return false;
      if (dz !== 0 && !road(tx, tz + dz)) return false;
      if (dx !== 0 && dz !== 0 && !road(tx + dx, tz + dz)) return false;
      return true;
    };
    const pave = col(PAL.road);
    const edge = col(PAL.roadEdge);
    const c = new THREE.Color();
    const vert = (x: number, z: number, cr: THREE.Color): void => {
      pos.push(x, map.heightAt(x, z) + LIFT, z);
      colors.push(cr.r, cr.g, cr.b);
    };
    const quad = (
      x0: number,
      z0: number,
      x1: number,
      z1: number,
      main: boolean,
      c00: THREE.Color,
      c10: THREE.Color,
      c01: THREE.Color,
      c11: THREE.Color,
    ): void => {
      // Split the same way as the terrain triangle underneath, so the paving lies flush.
      if (main) {
        vert(x0, z0, c00); vert(x1, z1, c11); vert(x1, z0, c10);
        vert(x0, z0, c00); vert(x0, z1, c01); vert(x1, z1, c11);
      } else {
        vert(x0, z0, c00); vert(x0, z1, c01); vert(x1, z0, c10);
        vert(x1, z0, c10); vert(x0, z1, c01); vert(x1, z1, c11);
      }
    };
    // A quad split along its own better diagonal (for ground beyond the map's tiles).
    const quadFlat = (xa: number, za: number, xb: number, zb: number, c00: THREE.Color, c10: THREE.Color, c01: THREE.Color, c11: THREE.Color): void => {
      const h00 = map.heightAt(xa, za);
      const h10 = map.heightAt(xb, za);
      const h01 = map.heightAt(xa, zb);
      const h11 = map.heightAt(xb, zb);
      quad(xa, za, xb, zb, splitsMainDiagonal(h00, h10, h01, h11), c00, c10, c01, c11);
    };
    const x1 = Math.min(size, cx + STREET_CHUNK);
    const z1 = Math.min(size, cz + STREET_CHUNK);
    const vc = [new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color()];
    const wet = mapIndex(map).ground;
    for (let tz = cz; tz < z1; tz++) {
      for (let tx = cx; tx < x1; tx++) {
        // A bridge carries its own deck.
        if (!road(tx, tz) || wet[tz * size + tx] === Ground.Water) continue;
        const main = splitsMainDiagonal(map.corner(tx, tz), map.corner(tx + 1, tz), map.corner(tx, tz + 1), map.corner(tx + 1, tz + 1));
        // Paving stones vary a little from tile to tile.
        const jit = 0.95 + 0.08 * hash2(tx, tz, 311);
        const colourAt = (gvx: number, gvz: number, out: THREE.Color): THREE.Color => {
          // A vertex inside the paved area is paving; on its rim, the worn edge.
          const inside = paved(gvx - 1, gvz - 1) && paved(gvx, gvz - 1) && paved(gvx - 1, gvz) && paved(gvx, gvz);
          return out.copy(inside ? pave : edge).multiplyScalar(jit);
        };
        for (let j = 0; j < SUB; j++) {
          for (let i = 0; i < SUB; i++) {
            const gx = tx * SUB + i;
            const gz = tz * SUB + j;
            if (!paved(gx, gz)) continue;
            colourAt(gx, gz, vc[0]);
            colourAt(gx + 1, gz, vc[1]);
            colourAt(gx, gz + 1, vc[2]);
            colourAt(gx + 1, gz + 1, vc[3]);
            quad(tx + U[i], tz + U[j], tx + U[i + 1], tz + U[j + 1], main, vc[0], vc[1], vc[2], vc[3]);
          }
        }
      }
    }
    // Where a road meets the map's edge, a worn track carries on into the
    // countryside: the way settlers come in.
    for (let tz = cz; tz < z1; tz++) {
      for (let tx = cx; tx < x1; tx++) {
        if (!road(tx, tz)) continue;
        const out: Array<[number, number]> = [];
        if (tx === 0) out.push([-1, 0]);
        if (tx === size - 1) out.push([1, 0]);
        if (tz === 0) out.push([0, -1]);
        if (tz === size - 1) out.push([0, 1]);
        for (const [dx, dz] of out) this.track(tx + 0.5 + dx * 0.5, tz + 0.5 + dz * 0.5, dx, dz, quadFlat);
      }
    }
    // Plots: an outline marked on the grass, then trodden earth once a tent is up.
    for (const b of s.buildings) {
      if (b.x < cx || b.x >= x1 || b.z < cz || b.z >= z1) continue;
      if (sideOf(b.kind) === 3) this.worksGround(s, b, quad);
      else this.plotGround(b, quad, c);
    }
    if (pos.length === 0) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }

  /** A dirt track from (x, z) running off the map in direction (dx, dz), narrowing as it goes. */
  private track(
    x: number,
    z: number,
    dx: number,
    dz: number,
    quad: (xa: number, za: number, xb: number, zb: number, a: THREE.Color, b: THREE.Color, c: THREE.Color, d: THREE.Color) => void,
  ): void {
    const len = 7;
    const steps = 14;
    const earth = col(PAL.roadEdge);
    const grass = col(PAL.earth);
    const ca = new THREE.Color();
    const cb = new THREE.Color();
    for (let k = 0; k < steps; k++) {
      const a = (k / steps) * len;
      const b = ((k + 1) / steps) * len;
      const wa = 0.36 * (1 - (0.45 * k) / steps);
      const wb = 0.36 * (1 - (0.45 * (k + 1)) / steps);
      ca.copy(earth).lerp(grass, k / steps);
      cb.copy(earth).lerp(grass, (k + 1) / steps);
      const w = Math.max(wa, wb);
      // Along x or along z; the quad spans the track's width across.
      if (dx !== 0) {
        const xa = x + dx * a;
        const xb = x + dx * b;
        quad(Math.min(xa, xb), z - w, Math.max(xa, xb), z + w, dx > 0 ? ca : cb, dx > 0 ? cb : ca, dx > 0 ? ca : cb, dx > 0 ? cb : ca);
      } else {
        const za = z + dz * a;
        const zb = z + dz * b;
        quad(x - w, Math.min(za, zb), x + w, Math.max(za, zb), dz > 0 ? ca : cb, dz > 0 ? ca : cb, dz > 0 ? cb : ca, dz > 0 ? cb : ca);
      }
    }
  }

  /**
   * The ground of a farm, granary, agora, lodge or dairy: a farm's field
   * ploughed in furrows behind a trodden yard, a granary's beaten earth yard,
   * the agora's paving stones, a lodge's trodden yard, a dairy's cropped pen.
   */
  private worksGround(
    s: SimState,
    b: Building,
    quad: (x0: number, z0: number, x1: number, z1: number, main: boolean, a: THREE.Color, b: THREE.Color, c: THREE.Color, d: THREE.Color) => void,
  ): void {
    const map = this.map;
    const S = 3;
    const steps = 24;
    const inset = 0.04;
    const cx = b.x + S / 2;
    const cz = b.z + S / 2;
    const yaw = facingOf(s, map.size, b);
    const co = Math.cos(yaw);
    const sn = Math.sin(yaw);
    const main = (x: number, z: number): boolean => {
      const tx = Math.floor(x);
      const tz = Math.floor(z);
      return splitsMainDiagonal(map.corner(tx, tz), map.corner(tx + 1, tz), map.corner(tx, tz + 1), map.corner(tx + 1, tz + 1));
    };
    const furrow = col(PAL.furrow);
    const furrowDark = col(PAL.furrowDark);
    const earth = col(PAL.earth);
    const worn = col(PAL.earthWorn);
    const pave = col(PAL.agoraPave);
    const paveDark = col(PAL.agoraPaveDark);
    const grass = col(PAL.meadow);
    const c = new THREE.Color();
    const at = (k: number): number => inset + ((S - 2 * inset) * k) / steps;
    for (let j = 0; j < steps; j++) {
      for (let i = 0; i < steps; i++) {
        const xa = b.x + at(i);
        const xb = b.x + at(i + 1);
        const za = b.z + at(j);
        const zb = b.z + at(j + 1);
        // The middle of this little quad in the building's own frame (front +x).
        const dx = (xa + xb) / 2 - cx;
        const dz = (za + zb) / 2 - cz;
        const lx = dx * co - dz * sn;
        const lz = dx * sn + dz * co;
        const j2 = 0.95 + 0.08 * hash2(Math.round(xa * 8), Math.round(za * 8), 317);
        if (b.kind === 'farm') {
          if (lx < 0.45) {
            // Ridges where the wheat rows stand, darker furrows between.
            const row = (lz + 1.18) / (2.36 / 5);
            const off = Math.abs(row - Math.round(row));
            c.copy(off < 0.28 ? furrow : furrowDark).multiplyScalar(j2);
          } else c.copy(worn).lerp(earth, 0.5).multiplyScalar(j2);
        } else if (b.kind === 'granary') {
          c.copy(worn).lerp(earth, Math.min(1, Math.abs(lz) / 1.6)).multiplyScalar(j2);
        } else if (b.kind === 'lodge') {
          // A trodden yard, worn most round the fire pit and the rack.
          c.copy(earth).lerp(worn, Math.max(0, 1 - Math.hypot(lx - 0.7, lz + 0.3) / 1.4)).lerp(grass, Math.max(0, Math.min(0.5, (Math.abs(lz) - 1.0) * 1.2))).multiplyScalar(j2);
        } else if (b.kind === 'dairy') {
          // The pen behind: cropped pasture, trampled in patches; the yard in front, beaten earth.
          if (lx < 0.14) c.copy(grass).lerp(worn, 0.3 * hash2(Math.round(xa * 3), Math.round(za * 3), 318)).multiplyScalar(j2);
          else c.copy(worn).lerp(earth, 0.5).multiplyScalar(j2);
        } else {
          // Paving stones, half a unit square, in courses.
          const course = Math.floor((lx + 1.5) * 2);
          const stone = Math.floor((lz + 1.5) * 2 + (course % 2) * 0.5);
          const k = hash2(course, stone, b.id + 319);
          c.copy(pave).lerp(paveDark, k * 0.8);
          const fx = ((lx + 1.5) * 2) % 1;
          const fz = (((lz + 1.5) * 2 + (course % 2) * 0.5) % 1 + 1) % 1;
          if (fx < 0.12 || fz < 0.12) c.copy(paveDark).multiplyScalar(0.94);
        }
        quad(xa, za, xb, zb, main(xa, za), c, c, c, c);
      }
    }
  }

  private plotGround(
    b: Building,
    quad: (x0: number, z0: number, x1: number, z1: number, main: boolean, a: THREE.Color, b: THREE.Color, c: THREE.Color, d: THREE.Color) => void,
    c: THREE.Color,
  ): void {
    // A fountain, a shrine or a tax office stands on its own paving.
    if (b.kind === 'fountain' || b.kind === 'shrine' || b.kind === 'taxoffice') return;
    const map = this.map;
    const S = PLOT_SIZE;
    const inset = 0.12;
    const steps = 8;
    const at = (k: number): number => inset + ((S - 2 * inset) * k) / steps;
    const main = (x: number, z: number): boolean => {
      const tx = Math.floor(x);
      const tz = Math.floor(z);
      return splitsMainDiagonal(map.corner(tx, tz), map.corner(tx + 1, tz), map.corner(tx, tz + 1), map.corner(tx + 1, tz + 1));
    };
    if (b.level === 0) {
      // A pale line of trodden grass round the plot.
      c.copy(col(PAL.plotLine));
      const w = 0.09;
      for (let k = 0; k < steps; k++) {
        const a0 = at(k);
        const a1 = at(k + 1);
        const x = b.x;
        const z = b.z;
        quad(x + a0, z + inset, x + a1, z + inset + w, main(x + a0, z + inset), c, c, c, c);
        quad(x + a0, z + S - inset - w, x + a1, z + S - inset, main(x + a0, z + S - inset - w), c, c, c, c);
        quad(x + inset, z + a0, x + inset + w, z + a1, main(x + inset, z + a0), c, c, c, c);
        quad(x + S - inset - w, z + a0, x + S - inset, z + a1, main(x + S - inset - w, z + a0), c, c, c, c);
      }
      return;
    }
    // Trodden earth, darker in the middle where the family sits round the fire.
    const earth = col(PAL.earth);
    const worn = col(PAL.earthWorn);
    const cs = [new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color()];
    const shade = (x: number, z: number, out: THREE.Color): THREE.Color => {
      const d = Math.hypot(x - b.x - S / 2, z - b.z - S / 2) / (S / 2);
      const j = 0.94 + 0.1 * hash2(Math.round(x * 4), Math.round(z * 4), 313);
      return out.copy(worn).lerp(earth, Math.min(1, d * 1.1)).multiplyScalar(j);
    };
    for (let j = 0; j < steps; j++) {
      for (let i = 0; i < steps; i++) {
        const xa = b.x + at(i);
        const xb = b.x + at(i + 1);
        const za = b.z + at(j);
        const zb = b.z + at(j + 1);
        // Round off the corners of the patch.
        const ci = Math.min(i, steps - 1 - i);
        const cj = Math.min(j, steps - 1 - j);
        if (ci + cj === 0) continue;
        shade(xa, za, cs[0]);
        shade(xb, za, cs[1]);
        shade(xa, zb, cs[2]);
        shade(xb, zb, cs[3]);
        quad(xa, za, xb, zb, main(xa, za), cs[0], cs[1], cs[2], cs[3]);
      }
    }
  }
}
