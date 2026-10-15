import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { hash2 } from '../map/noise';
import { speedOf } from '../sim/walk';
import type { SimState, Walker } from '../sim/state';
import { ChunkedInstances } from './chunks';
import { col, PAL } from './palette';
import { lumpy } from './trees';

export const WALKER_CHUNK = 32;
/** Space between people walking in a line. */
const SPACING = 0.36;

type TPart = { geo: THREE.BufferGeometry; color: string; tint?: boolean };

/** Merge parts into one geometry with colours, and a tint mask: 1 where the per-person colour applies (the tunic). */
function mergeTinted(parts: TPart[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const colors: number[] = [];
  const tint: number[] = [];
  for (const { geo, color, tint: t } of parts) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const p = g.attributes.position as THREE.BufferAttribute;
    const c = t ? new THREE.Color(1, 1, 1) : col(color);
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      colors.push(c.r, c.g, c.b);
      tint.push(t ? 1 : 0);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  out.setAttribute('aTint', new THREE.Float32BufferAttribute(tint, 1));
  out.computeVertexNormals();
  out.computeBoundingSphere();
  return out;
}

/** A little person, about 0.42 tall, facing +x, carrying a bundle on the head or the back. */
function person(load: 'head' | 'back'): THREE.BufferGeometry {
  const parts: TPart[] = [
    { geo: new THREE.CylinderGeometry(0.02, 0.018, 0.12, 4).translate(0, 0.06, 0.03), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.02, 0.018, 0.12, 4).translate(0, 0.06, -0.03), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.055, 0.085, 0.21, 6).translate(0, 0.205, 0), color: '', tint: true },
    { geo: new THREE.CylinderGeometry(0.016, 0.014, 0.15, 4).rotateX(0.18).translate(0, 0.23, 0.07), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.016, 0.014, 0.15, 4).rotateX(-0.18).translate(0, 0.23, -0.07), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.058, 0).translate(0.005, 0.365, 0), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.06, 0).scale(1, 0.7, 1).translate(-0.012, 0.39, 0), color: PAL.hair },
  ];
  if (load === 'head') {
    parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.075, 0), 0.3, 51).scale(1.1, 0.6, 1).translate(0, 0.45, 0), color: PAL.bundleCream });
    // An arm up to steady it.
    parts.push({ geo: new THREE.CylinderGeometry(0.014, 0.014, 0.16, 4).translate(0.0, 0.36, 0.075), color: PAL.skin });
  } else {
    parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.08, 0), 0.3, 52).scale(0.8, 1, 1).translate(-0.085, 0.26, 0), color: PAL.bundleBlue });
  }
  return mergeTinted(parts);
}

/**
 * The water carrier: a woman in a long dress (the tinted part) with a pale
 * shawl, a terracotta water jar on her head and one arm raised to steady it.
 */
function carrier(): THREE.BufferGeometry {
  const jar = [
    new THREE.Vector2(0.0, 0),
    new THREE.Vector2(0.035, 0.005),
    new THREE.Vector2(0.07, 0.05),
    new THREE.Vector2(0.06, 0.1),
    new THREE.Vector2(0.025, 0.125),
    new THREE.Vector2(0.032, 0.15),
  ];
  const parts: TPart[] = [
    // A long dress to the ground, flaring a little.
    { geo: new THREE.CylinderGeometry(0.05, 0.095, 0.3, 7).translate(0, 0.16, 0), color: '', tint: true },
    { geo: new THREE.CylinderGeometry(0.062, 0.056, 0.05, 7).translate(0, 0.3, 0), color: PAL.carrierShawl },
    { geo: new THREE.CylinderGeometry(0.016, 0.014, 0.15, 4).rotateX(-0.2).translate(0.01, 0.23, -0.07), color: PAL.skin },
    // The arm up to the jar.
    { geo: new THREE.CylinderGeometry(0.014, 0.014, 0.17, 4).rotateX(0.25).translate(0.0, 0.37, 0.07), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.056, 0).translate(0.005, 0.36, 0), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.058, 0).scale(1, 0.72, 1).translate(-0.014, 0.385, 0), color: PAL.hair },
    // A little pad and the jar, lying a touch sideways like a hydria.
    { geo: new THREE.CylinderGeometry(0.04, 0.04, 0.015, 6).translate(0, 0.42, 0), color: PAL.carrierShawl },
    { geo: new THREE.LatheGeometry(jar, 7).scale(1.4, 1.35, 1.4).rotateZ(0.12).translate(0, 0.425, 0), color: PAL.pot },
  ];
  return mergeTinted(parts);
}

const TUNICS = [PAL.tunicTerracotta, PAL.tunicOchre, PAL.tunicBlue, PAL.tunicCream, PAL.tunicGreen, PAL.tunicPlum];

function tintedMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aTint;')
      .replace('vColor.rgb *= instanceColor.rgb;', 'vColor.rgb *= mix(vec3(1.0), instanceColor.rgb, aTint);');
  };
  mat.customProgramCacheKey = () => 'tinted-person';
  return mat;
}

/** Settler and leaver groups and water carriers walking the roads, redrawn every frame. */
export class Walkers {
  readonly group = new THREE.Group();
  private readonly kinds: [ChunkedInstances, ChunkedInstances];
  private readonly carriers: ChunkedInstances;
  /** Where each water carrier was drawn this frame (for hovering, clicking and following). */
  readonly carrierAt = new Map<number, THREE.Vector3>();
  private readonly paths = new Map<number, { route: number; cum: Float32Array }>();
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly c = new THREE.Color();
  private readonly e = new THREE.Euler();

  constructor(private readonly map: CoastMap) {
    this.group.name = 'walkers';
    const mat = tintedMaterial();
    const opts = { castShadow: true, receiveShadow: true, colors: true };
    this.kinds = [new ChunkedInstances('walkers-head', person('head'), mat, WALKER_CHUNK, opts), new ChunkedInstances('walkers-back', person('back'), mat, WALKER_CHUNK, opts)];
    for (const k of this.kinds) this.group.add(k.group);
    this.carriers = new ChunkedInstances('walkers-water', carrier(), mat, WALKER_CHUNK, opts);
    this.group.add(this.carriers.group);
  }

  get count(): number {
    return this.kinds[0].count + this.kinds[1].count + this.carriers.count;
  }

  private cum(w: Walker): Float32Array {
    let e = this.paths.get(w.id);
    if (!e || e.route !== w.route) {
      const n = w.path.length / 2;
      const cum = new Float32Array(n);
      for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(w.path[i * 2] - w.path[i * 2 - 2], w.path[i * 2 + 1] - w.path[i * 2 - 1]);
      e = { route: w.route, cum };
      this.paths.set(w.id, e);
    }
    return e.cum;
  }

  /** Where along the path a distance falls: position and heading. */
  private at(w: Walker, cum: Float32Array, d: number): [number, number, number, number] {
    const n = cum.length;
    let i = 0;
    while (i < n - 2 && cum[i + 1] < d) i++;
    const len = cum[i + 1] - cum[i] || 1;
    const f = Math.min(1, Math.max(0, (d - cum[i]) / len));
    const x0 = w.path[i * 2];
    const z0 = w.path[i * 2 + 1];
    const x1 = w.path[i * 2 + 2];
    const z1 = w.path[i * 2 + 3];
    return [x0 + (x1 - x0) * f, z0 + (z1 - z0) * f, (x1 - x0) / len, (z1 - z0) / len];
  }

  update(state: SimState, alpha: number, time: number): void {
    for (const k of this.kinds) k.begin();
    this.carriers.begin();
    const live = new Set<number>();
    const dress = col(PAL.carrierDress);
    for (const w of state.walkers) {
      live.add(w.id);
      const cum = this.cum(w);
      const total = cum[cum.length - 1];
      const lead = Math.min(total, cum[w.seg] + w.along + alpha * speedOf(w));
      if (w.kind === 'water') {
        const [x, z, dx, dz] = this.at(w, cum, lead);
        const phase = time * 8 + w.id * 1.3;
        const moving = lead < total ? 1 : 0;
        // A steadier walk than the settlers': she is carrying a full jar.
        const bob = Math.abs(Math.sin(phase)) * 0.012 * moving;
        this.e.set(Math.sin(phase) * 0.03 * moving, Math.atan2(-dz, dx), 0, 'YXZ');
        this.q.setFromEuler(this.e);
        this.p.set(x, this.map.heightAt(x, z) + 0.03 + bob, z);
        this.s.set(0.9, 0.9, 0.9);
        this.m.compose(this.p, this.q, this.s);
        this.carriers.push(this.m, dress);
        const v = this.carrierAt.get(w.id);
        if (v) v.copy(this.p);
        else this.carrierAt.set(w.id, this.p.clone());
        continue;
      }
      for (let k = 0; k < w.people; k++) {
        const d = Math.max(0, lead - k * SPACING);
        const [x0, z0, dx, dz] = this.at(w, cum, d);
        // Walk a little side by side rather than in a ruled line.
        const side = k === 0 ? 0 : (k % 2 ? 1 : -1) * 0.1;
        const x = x0 - dz * side;
        const z = z0 + dx * side;
        const seed = w.id * 7 + k;
        const phase = time * 9 + seed * 1.7;
        const moving = d > 0 && d < total ? 1 : 0;
        const bob = Math.abs(Math.sin(phase)) * 0.022 * moving;
        const child = w.people >= 3 && k === w.people - 1;
        const sc = child ? 0.66 : 0.84 + 0.1 * hash2(seed, 1, 61);
        this.e.set(Math.sin(phase) * 0.06 * moving, Math.atan2(-dz, dx), 0, 'YXZ');
        this.q.setFromEuler(this.e);
        this.p.set(x, this.map.heightAt(x, z) + 0.03 + bob, z);
        this.s.set(sc, sc, sc);
        this.m.compose(this.p, this.q, this.s);
        this.c.copy(col(TUNICS[Math.floor(hash2(seed, 2, 62) * TUNICS.length)]));
        this.kinds[k === 0 ? 0 : 1].push(this.m, this.c);
      }
    }
    for (const k of this.kinds) k.end();
    this.carriers.end();
    for (const id of this.paths.keys()) if (!live.has(id)) this.paths.delete(id);
    for (const id of this.carrierAt.keys()) if (!live.has(id)) this.carrierAt.delete(id);
  }
}
