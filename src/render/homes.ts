import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { hash2 } from '../map/noise';
import { PLOT_SIZE } from '../sim/build';
import { TILE_ROAD, type Building, type SimState } from '../sim/state';
import { ChunkedInstances } from './chunks';
import { PAL } from './palette';
import { lumpy, merge, type Part } from './trees';

/** Homes are drawn in chunks of this many units. */
export const HOME_CHUNK = 32;

// ---------------------------------------------------------------------------
// Models, built from simple shapes. Local frame: the plot's centre at the
// origin, the footprint spans -1..1, and the doorway faces +x.

/** A ridge tent: a triangular prism along x, open at neither end. */
function prism(len: number, halfW: number, h: number): THREE.BufferGeometry {
  const a = -len / 2;
  const b = len / 2;
  const p = [
    // Ends.
    [a, 0, -halfW], [a, 0, halfW], [a, h, 0],
    [b, 0, halfW], [b, 0, -halfW], [b, h, 0],
    // Sides.
    [a, 0, halfW], [b, 0, halfW], [b, h, 0],
    [a, 0, halfW], [b, h, 0], [a, h, 0],
    [b, 0, -halfW], [a, 0, -halfW], [a, h, 0],
    [b, 0, -halfW], [a, h, 0], [b, h, 0],
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p.flat(), 3));
  return g;
}

/** A flat triangle facing +x (a doorway on a tent's end). */
function doorway(w: number, h: number, x: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([x, 0, w / 2, x, 0, -w / 2, x, h, 0], 3));
  return g;
}

const cyl = (r0: number, r1: number, h: number, seg: number): THREE.CylinderGeometry => new THREE.CylinderGeometry(r0, r1, h, seg);

function campfire(x: number, z: number, seed: number): Part[] {
  const parts: Part[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + seed;
    parts.push({ geo: lumpy(new THREE.DodecahedronGeometry(0.045, 0), 0.4, seed + i).translate(x + Math.cos(a) * 0.13, 0.02, z + Math.sin(a) * 0.13), color: PAL.stone });
  }
  parts.push({ geo: cyl(0.018, 0.018, 0.2, 4).rotateZ(Math.PI / 2).rotateY(0.6).translate(x, 0.03, z), color: PAL.trunk });
  parts.push({ geo: cyl(0.018, 0.018, 0.2, 4).rotateZ(Math.PI / 2).rotateY(-0.7).translate(x, 0.04, z), color: PAL.trunk });
  parts.push({ geo: new THREE.ConeGeometry(0.06, 0.16, 5).translate(x, 0.1, z), color: PAL.ember });
  parts.push({ geo: new THREE.ConeGeometry(0.035, 0.11, 4).translate(x + 0.01, 0.1, z - 0.01), color: PAL.flame });
  return parts;
}

function amphora(x: number, z: number, h: number): Part {
  const pts = [
    new THREE.Vector2(0.0, 0),
    new THREE.Vector2(0.03, 0.01),
    new THREE.Vector2(0.075, h * 0.4),
    new THREE.Vector2(0.06, h * 0.75),
    new THREE.Vector2(0.03, h * 0.88),
    new THREE.Vector2(0.04, h),
  ];
  return { geo: new THREE.LatheGeometry(pts, 6).translate(x, 0, z), color: PAL.pot };
}

const bundle = (x: number, z: number, s: number, color: string, seed: number): Part => ({
  geo: lumpy(new THREE.IcosahedronGeometry(0.1 * s, 0), 0.3, seed).scale(1.2, 0.75, 1).translate(x, 0.07 * s, z),
  color,
});

/** A canvas ridge tent with a stripe, a small bell tent, a fire, a pot and bundles. */
function tentA(): THREE.BufferGeometry {
  const parts: Part[] = [];
  parts.push({ geo: prism(1.05, 0.46, 0.74).translate(-0.12, 0, -0.18), color: PAL.canvas });
  // A stripe round the canvas, a hair proud of it.
  parts.push({ geo: prism(0.13, 0.47, 0.75).translate(0.16, 0, -0.18), color: PAL.canvasStripe });
  parts.push({ geo: prism(0.13, 0.47, 0.75).translate(-0.4, 0, -0.18), color: PAL.canvasStripe });
  parts.push({ geo: doorway(0.42, 0.5, 0.41).translate(0, 0, -0.18), color: PAL.door });
  parts.push({ geo: cyl(0.02, 0.02, 0.88, 4).translate(0.42, 0.44, -0.18), color: PAL.pole });
  parts.push({ geo: cyl(0.02, 0.02, 0.88, 4).translate(-0.66, 0.44, -0.18), color: PAL.pole });
  // The small bell tent behind.
  parts.push({ geo: lumpy(new THREE.ConeGeometry(0.34, 0.58, 7), 0.06, 21).translate(-0.48, 0.29, 0.52), color: PAL.canvasOchre });
  parts.push({ geo: cyl(0.015, 0.015, 0.16, 4).translate(-0.48, 0.64, 0.52), color: PAL.pole });
  parts.push(...campfire(0.55, 0.42, 1));
  parts.push(amphora(0.72, -0.62, 0.24));
  parts.push(amphora(0.6, -0.72, 0.18));
  parts.push(bundle(0.15, 0.62, 1, PAL.bundleBlue, 22));
  parts.push(bundle(0.3, 0.72, 0.8, PAL.bundleCream, 23));
  // A rug by the fire.
  parts.push({ geo: new THREE.BoxGeometry(0.34, 0.015, 0.24).translate(0.62, 0.008, 0.02), color: PAL.rug });
  parts.push({ geo: new THREE.BoxGeometry(0.06, 0.017, 0.24).translate(0.62, 0.009, 0.02), color: PAL.rugStripe });
  return merge(parts);
}

/** A round bell tent with a blue band, a lean-to awning over the bundles, a fire and a pot. */
function tentB(): THREE.BufferGeometry {
  const parts: Part[] = [];
  parts.push({ geo: lumpy(new THREE.ConeGeometry(0.56, 0.86, 8), 0.05, 31).translate(-0.18, 0.43, -0.12), color: PAL.canvas });
  parts.push({ geo: cyl(0.42, 0.47, 0.1, 8).translate(-0.18, 0.2, -0.12), color: PAL.canvasBlue });
  parts.push({ geo: cyl(0.02, 0.02, 0.2, 4).translate(-0.18, 0.92, -0.12), color: PAL.pole });
  // The doorway lies on the cone's slope, facing +x.
  const door = new THREE.BufferGeometry();
  door.setAttribute('position', new THREE.Float32BufferAttribute([0.395, 0.0, 0.13, 0.395, 0.0, -0.13, 0.16, 0.4, 0], 3));
  parts.push({ geo: door.translate(0, 0, -0.12), color: PAL.door });
  // A small ochre lean-to tent beside it.
  parts.push({ geo: prism(0.56, 0.27, 0.4).rotateY(Math.PI / 2).translate(0.32, 0, 0.62), color: PAL.canvasOchre });
  parts.push({ geo: doorway(0.3, 0.27, 0.0).rotateY(-Math.PI / 2).translate(0.32, 0, 0.903), color: PAL.door });
  parts.push(bundle(-0.1, 0.62, 1, PAL.bundleRed, 32));
  parts.push(bundle(0.72, 0.42, 0.85, PAL.bundleBlue, 33));
  parts.push(...campfire(0.62, -0.5, 2));
  parts.push(amphora(-0.72, 0.7, 0.22));
  parts.push({ geo: new THREE.BoxGeometry(0.22, 0.12, 0.16).translate(0.75, 0.06, 0.15), color: PAL.trunk });
  return merge(parts);
}

/** A stake with a little pennant, marking a plot's corner. */
function stake(): THREE.BufferGeometry {
  const flag = new THREE.BufferGeometry();
  flag.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.34, 0, 0, 0.25, 0, 0.13, 0.3, 0.0], 3));
  const back = new THREE.BufferGeometry();
  back.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.25, 0, 0, 0.34, 0, 0.13, 0.3, 0.0], 3));
  return merge([
    { geo: new THREE.BoxGeometry(0.03, 0.36, 0.03).translate(0, 0.16, 0), color: PAL.stake },
    { geo: flag, color: PAL.flag },
    { geo: back, color: PAL.flag },
  ]);
}

// ---------------------------------------------------------------------------

/** Which way a home's doorway faces: towards a road beside it if there is one. */
function facing(s: SimState, size: number, b: Building): number {
  const road = (tx: number, tz: number): boolean => tx >= 0 && tz >= 0 && tx < size && tz < size && s.tiles[tz * size + tx] === TILE_ROAD;
  // +x is the model's front; yaw turns +x to (cos, -sin).
  if (road(b.x + PLOT_SIZE, b.z) || road(b.x + PLOT_SIZE, b.z + 1)) return 0;
  if (road(b.x, b.z + PLOT_SIZE) || road(b.x + 1, b.z + PLOT_SIZE)) return -Math.PI / 2;
  if (road(b.x, b.z - 1) || road(b.x + 1, b.z - 1)) return Math.PI / 2;
  if (road(b.x - 1, b.z) || road(b.x - 1, b.z + 1)) return Math.PI;
  return Math.floor(hash2(b.id, 3, 41) * 4) * (Math.PI / 2);
}

const RISE_SECONDS = 0.9;
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Stakes on empty plots and tents on lived-in ones, instanced per chunk and
 * rebuilt when homes change. A tent rises into place when it is pitched.
 */
export class Homes {
  readonly group = new THREE.Group();
  private readonly tents: ChunkedInstances[];
  private readonly stakes: ChunkedInstances;
  /** Buildings by chunk, as last seen. */
  private byChunk = new Map<number, Building[]>();
  private known = new Map<number, number>();
  private rising = new Map<number, number>();
  private time = 0;
  private state: SimState | null = null;
  /** Where each tent's fire is (world), by chunk, for the smoke. */
  private fires = new Map<number, Array<[number, number, number, number]>>();
  private readonly smoke: ChunkedInstances;
  private readonly sm = new THREE.Matrix4();
  private readonly sq = new THREE.Quaternion();
  private readonly sp = new THREE.Vector3();
  private readonly ss = new THREE.Vector3();

  constructor(private readonly map: CoastMap) {
    this.group.name = 'homes';
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
    const opts = { castShadow: true, receiveShadow: true, colors: false };
    this.tents = [new ChunkedInstances('tent-a', tentA(), mat, HOME_CHUNK, opts), new ChunkedInstances('tent-b', tentB(), mat, HOME_CHUNK, opts)];
    this.stakes = new ChunkedInstances('stakes', stake(), mat, HOME_CHUNK, opts);
    for (const t of this.tents) this.group.add(t.group);
    this.group.add(this.stakes.group);
    const puff = new THREE.IcosahedronGeometry(1, 0);
    const smokeMat = new THREE.MeshBasicMaterial({ color: 0xeee8de, transparent: true, opacity: 0.3, depthWrite: false });
    this.smoke = new ChunkedInstances('smoke', puff, smokeMat, HOME_CHUNK, { castShadow: false, receiveShadow: false, colors: false });
    this.group.add(this.smoke.group);
  }

  /** A wisp of smoke from every fire, drifting with the breeze. */
  private updateSmoke(time: number, windAngle: number): void {
    const wx = Math.cos(windAngle);
    const wz = Math.sin(windAngle);
    this.smoke.begin();
    for (const list of this.fires.values()) {
      for (const [x, y, z, seed] of list) {
        for (let k = 0; k < 4; k++) {
          const f = (time / 3.6 + k / 4 + seed) % 1;
          // Small near the fire, swelling as it rises, then gone.
          const r = (0.025 + 0.075 * f) * Math.min(1, (1 - f) * 4);
          const drift = f * f * 0.3;
          this.sp.set(x + wx * drift, y + 0.14 + f * 0.6, z + wz * drift);
          this.sq.setFromAxisAngle(UP, seed * 10 + f * 2);
          this.ss.set(r, r * 0.85, r);
          this.sm.compose(this.sp, this.sq, this.ss);
          this.smoke.push(this.sm);
        }
      }
    }
    this.smoke.end();
  }

  private key(b: Building): number {
    return this.stakes.key(b.x + 1, b.z + 1);
  }

  /** Rebuild after the state's homes changed. `animate` is false on the first sync (no tents rising at load). */
  sync(s: SimState, animate: boolean): void {
    this.state = s;
    const next = new Map<number, Building[]>();
    const dirty = new Set<number>(this.byChunk.keys());
    const seen = new Map<number, number>();
    for (const b of s.buildings) {
      const k = this.key(b);
      const list = next.get(k);
      if (list) list.push(b);
      else next.set(k, [b]);
      dirty.add(k);
      seen.set(b.id, b.level);
      if (animate && b.level > 0 && (this.known.get(b.id) ?? 0) === 0) this.rising.set(b.id, this.time);
    }
    this.known = seen;
    this.byChunk = next;
    for (const k of dirty) this.fill(k);
  }

  update(time: number, windAngle = 0): void {
    this.time = time;
    this.updateSmoke(time, windAngle);
    if (this.rising.size === 0 || !this.state) return;
    const dirty = new Set<number>();
    for (const [id, t0] of this.rising) {
      if (time - t0 > RISE_SECONDS) this.rising.delete(id);
      const b = this.state.buildings.find((o) => o.id === id);
      if (b) dirty.add(this.key(b));
    }
    for (const k of dirty) this.fill(k);
  }

  private fill(key: number): void {
    const s = this.state;
    if (!s) return;
    const list = this.byChunk.get(key) ?? [];
    const map = this.map;
    const size = map.size;
    // Any point in the chunk tells ChunkedInstances which chunk it is.
    const kx = ((key % 1024) - 512 + 0.5) * HOME_CHUNK;
    const kz = (Math.floor(key / 1024) - 512 + 0.5) * HOME_CHUNK;
    const tentsBy: Building[][] = [[], []];
    const plots: Building[] = [];
    for (const b of list) {
      if (b.level > 0) tentsBy[Math.floor(hash2(b.id, 1, 40) * 2)].push(b);
      else plots.push(b);
    }
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const fires: Array<[number, number, number, number]> = [];
    const fireAt = [new THREE.Vector3(0.55, 0, 0.42), new THREE.Vector3(0.62, 0, -0.5)];
    const fp = new THREE.Vector3();
    tentsBy.forEach((bs, v) => {
      this.tents[v].set(kx, kz, bs.length, (i, m) => {
        const b = bs[i];
        const cx = b.x + PLOT_SIZE / 2;
        const cz = b.z + PLOT_SIZE / 2;
        // Stand on the lowest of the footprint's middle so nothing floats.
        const y = Math.min(map.heightAt(cx, cz), map.heightAt(cx - 0.5, cz - 0.5), map.heightAt(cx + 0.5, cz - 0.5), map.heightAt(cx - 0.5, cz + 0.5), map.heightAt(cx + 0.5, cz + 0.5));
        const t0 = this.rising.get(b.id);
        let k = 1;
        if (t0 !== undefined) {
          const f = Math.min(1, (this.time - t0) / RISE_SECONDS);
          // Up with a little overshoot, like a tent pulled taut.
          k = f < 1 ? Math.max(0.02, 1 - Math.pow(1 - f, 3) + Math.sin(f * Math.PI) * 0.12) : 1;
        }
        const mirror = hash2(b.id, 2, 40) < 0.5 ? -1 : 1;
        p.set(cx, y + 0.01, cz);
        q.setFromAxisAngle(up, facing(s, size, b));
        sc.set(1, k, mirror);
        m.compose(p, q, sc);
        if (k === 1) {
          fp.copy(fireAt[v]).applyMatrix4(m);
          fires.push([fp.x, map.heightAt(fp.x, fp.z), fp.z, hash2(b.id, 5, 42)]);
        }
      });
    });
    this.fires.set(key, fires);
    const corners: Array<[number, number]> = [];
    for (const b of plots) {
      const a = 0.14;
      const e = PLOT_SIZE - 0.14;
      corners.push([b.x + a, b.z + a], [b.x + e, b.z + a], [b.x + a, b.z + e], [b.x + e, b.z + e]);
    }
    this.stakes.set(kx, kz, corners.length, (i, m) => {
      const [x, z] = corners[i];
      p.set(x, map.heightAt(x, z) - 0.02, z);
      q.setFromAxisAngle(up, (i % 4) * 0.9 + 0.4);
      sc.set(0.72, 0.72, 0.72);
      m.compose(p, q, sc);
    });
  }
}

