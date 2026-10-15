import * as THREE from 'three';
import { TreeKind, type CoastMap } from '../map/bake';
import { hash2 } from '../map/noise';
import { ChunkedInstances } from './chunks';
import { col, PAL } from './palette';

/**
 * Low-poly plants and rocks, one instanced mesh per kind. Each model is a few
 * simple shapes merged into one geometry with flat colours baked in, so a
 * whole kind draws in a single call.
 */

export type Part = { geo: THREE.BufferGeometry; color: string };

/** Nudge vertices by a seeded amount so shapes look hand-made, not machined. */
export function lumpy(geo: THREE.BufferGeometry, amount: number, seed: number): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position as THREE.BufferAttribute;
  // Same position -> same nudge, so shared corners stay joined.
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const k = Math.round(x * 97) * 7 + Math.round(y * 89) * 13 + Math.round(z * 83) * 17;
    const s = 1 + (hash2(k, 1, seed) - 0.5) * amount;
    p.setXYZ(i, x * s, y * (1 + (hash2(k, 2, seed) - 0.5) * amount), z * s);
  }
  return g;
}

export function merge(parts: Part[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  for (const { geo, color } of parts) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const p = g.attributes.position as THREE.BufferAttribute;
    const c = col(color);
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
      colors.push(c.r, c.g, c.b);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  out.computeVertexNormals();
  out.computeBoundingSphere();
  return out;
}

const blob = (r: number, x: number, y: number, z: number, sy: number, seed: number): THREE.BufferGeometry =>
  lumpy(new THREE.IcosahedronGeometry(r, 0), 0.25, seed).scale(1, sy, 1).translate(x, y, z);

function olive(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.07, 0.12, 0.62, 5).translate(0, 0.31, 0);
  trunk.rotateZ(0.12);
  const branch = new THREE.CylinderGeometry(0.04, 0.06, 0.4, 4).rotateZ(-0.7).translate(0.13, 0.55, 0.02);
  return merge([
    { geo: trunk, color: PAL.trunk },
    { geo: branch, color: PAL.trunk },
    { geo: blob(0.42, 0.02, 0.86, 0, 0.72, 1), color: PAL.oliveLeaf },
    { geo: blob(0.3, 0.3, 0.74, 0.14, 0.75, 2), color: PAL.oliveLeafDark },
    { geo: blob(0.28, -0.24, 0.78, -0.12, 0.75, 3), color: PAL.oliveLeaf },
  ]);
}

function pine(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.06, 0.1, 1.35, 5).translate(0, 0.68, 0);
  trunk.rotateZ(0.06);
  const fork = new THREE.CylinderGeometry(0.035, 0.05, 0.5, 4).rotateZ(0.6).translate(-0.18, 1.3, 0);
  return merge([
    { geo: trunk, color: PAL.trunk },
    { geo: fork, color: PAL.trunk },
    { geo: blob(0.72, 0.08, 1.62, 0, 0.55, 4), color: PAL.pine },
    { geo: blob(0.5, -0.38, 1.52, 0.18, 0.6, 5), color: PAL.pineDark },
    { geo: blob(0.46, 0.42, 1.55, -0.24, 0.6, 6), color: PAL.pine },
    { geo: blob(0.4, 0.0, 1.86, 0.1, 0.6, 14), color: PAL.pine },
  ]);
}

function cypress(): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.2, 0.15),
    new THREE.Vector2(0.27, 0.7),
    new THREE.Vector2(0.22, 1.4),
    new THREE.Vector2(0.1, 2.0),
    new THREE.Vector2(0.0, 2.3),
  ];
  const body = lumpy(new THREE.LatheGeometry(pts, 6), 0.12, 7);
  const trunk = new THREE.CylinderGeometry(0.05, 0.06, 0.25, 4).translate(0, 0.05, 0);
  return merge([
    { geo: trunk, color: PAL.trunk },
    { geo: body, color: PAL.cypress },
  ]);
}

function scrub(): THREE.BufferGeometry {
  return merge([
    { geo: blob(0.3, 0, 0.16, 0, 0.62, 8), color: PAL.scrub },
    { geo: blob(0.22, 0.24, 0.1, 0.1, 0.65, 9), color: PAL.scrubDark },
  ]);
}

function broom(): THREE.BufferGeometry {
  return merge([
    { geo: blob(0.28, 0, 0.16, 0, 0.7, 10), color: PAL.scrub },
    { geo: blob(0.2, 0.06, 0.32, 0.03, 0.6, 11), color: PAL.broom },
    { geo: blob(0.14, -0.17, 0.24, 0.1, 0.7, 12), color: PAL.broom },
  ]);
}

function rock(): THREE.BufferGeometry {
  return merge([{ geo: lumpy(new THREE.DodecahedronGeometry(0.42, 0), 0.4, 13).scale(1, 0.62, 0.85).translate(0, 0.08, 0), color: PAL.rock }]);
}

function reeds(): THREE.BufferGeometry {
  const parts: Part[] = [];
  const spots = [
    [0, 0, 0.75],
    [0.12, 0.06, 0.62],
    [-0.1, 0.08, 0.68],
    [0.04, -0.12, 0.55],
    [-0.08, -0.08, 0.6],
  ];
  spots.forEach(([x, z, h], i) => {
    const leaf = new THREE.ConeGeometry(0.03, h, 3).translate(x, h / 2, z);
    leaf.rotateZ((i - 2) * 0.07);
    parts.push({ geo: leaf, color: PAL.reed });
    if (i % 2 === 0) parts.push({ geo: new THREE.CylinderGeometry(0.016, 0.016, 0.08, 4).translate(x, h - 0.02, z), color: PAL.reedTip });
  });
  return merge(parts);
}

function flowers(): THREE.BufferGeometry {
  const parts: Part[] = [{ geo: blob(0.18, 0, 0.05, 0, 0.45, 15), color: PAL.scrub }];
  const heads: Array<[number, number, number, string]> = [
    [0.0, 0.0, 0.16, PAL.poppy],
    [0.17, 0.08, 0.13, PAL.poppy],
    [-0.14, 0.1, 0.12, PAL.daisy],
    [0.06, -0.16, 0.14, PAL.poppy],
    [-0.12, -0.1, 0.11, PAL.daisy],
    [0.2, -0.12, 0.1, PAL.broom],
  ];
  for (const [x, z, h, c] of heads) {
    // Heads only (no stems): from any distance you see the dots of colour.
    parts.push({ geo: new THREE.OctahedronGeometry(0.04, 0).scale(1, 0.75, 1).translate(x, h * 0.75, z), color: c });
  }
  return merge(parts);
}

const MODELS: Record<TreeKind, () => THREE.BufferGeometry> = {
  [TreeKind.Olive]: olive,
  [TreeKind.Pine]: pine,
  [TreeKind.Cypress]: cypress,
  [TreeKind.Scrub]: scrub,
  [TreeKind.Broom]: broom,
  [TreeKind.Rock]: rock,
  [TreeKind.Reed]: reeds,
  [TreeKind.Flowers]: flowers,
};

/** How much the colour of each kind varies between instances. */
const TINT: Record<TreeKind, number> = {
  [TreeKind.Olive]: 0.08,
  [TreeKind.Pine]: 0.1,
  [TreeKind.Cypress]: 0.08,
  [TreeKind.Scrub]: 0.14,
  [TreeKind.Broom]: 0.08,
  [TreeKind.Rock]: 0.1,
  [TreeKind.Reed]: 0.1,
  [TreeKind.Flowers]: 0.12,
};

/** Plants lean gently in the breeze: the higher up, the more they move. */
function swaying(mat: THREE.MeshStandardMaterial, time: { value: number }, amount: number): THREE.MeshStandardMaterial {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
          float ph = uTime * 1.4 + ip.x * 0.31 + ip.y * 0.23;
          float bend = max(transformed.y - 0.15, 0.0) * ${amount.toFixed(3)};
          transformed.x += (sin(ph) + 0.4 * sin(ph * 2.3)) * bend;
          transformed.z += cos(ph * 0.8) * bend * 0.5;
        #endif`,
      );
  };
  mat.customProgramCacheKey = () => `sway-${amount}`;
  return mat;
}

export interface Plants {
  group: THREE.Group;
  update(time: number): void;
  /** Show only the plants not cleared away (indices into map.trees). */
  sync(cleared: readonly number[]): void;
}

/**
 * Plants are drawn in square chunks of this many units, so what's off screen
 * (and outside the shadow box) is skipped. Measured trade-off: 32-unit chunks
 * saved another ~13% of triangles up close but more than doubled the draw
 * calls (273 against 125 in the opening view), which costs more on the CPU.
 */
export const PLANT_CHUNK = 64;

export function buildTrees(map: CoastMap): Plants {
  const group = new THREE.Group();
  group.name = 'trees';
  const time = { value: 0 };
  const plain = (): THREE.MeshStandardMaterial =>
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0 });
  const rockMat = plain();
  const treeMat = swaying(plain(), time, 0.035);
  const grassMat = swaying(plain(), time, 0.12);
  const materialFor = (k: TreeKind): THREE.Material =>
    k === TreeKind.Rock ? rockMat : k === TreeKind.Reed || k === TreeKind.Flowers ? grassMat : treeMat;

  // One chunked set of meshes per kind; each chunk knows its trees.
  const kinds = new Map<TreeKind, { inst: ChunkedInstances; byChunk: Map<number, number[]> }>();
  map.trees.forEach((t, i) => {
    let k = kinds.get(t.kind);
    if (!k) {
      const shadow = t.kind !== TreeKind.Reed && t.kind !== TreeKind.Flowers;
      const inst = new ChunkedInstances(`trees-${TreeKind[t.kind]}`, MODELS[t.kind](), materialFor(t.kind), PLANT_CHUNK, {
        castShadow: shadow,
        receiveShadow: true,
        colors: true,
      });
      k = { inst, byChunk: new Map() };
      kinds.set(t.kind, k);
      group.add(inst.group);
    }
    const key = k.inst.key(t.x, t.z);
    const list = k.byChunk.get(key);
    if (list) list.push(i);
    else k.byChunk.set(key, [i]);
  });

  // Where each tree stands, worked out once.
  const mats = map.trees.map((t) => {
    const m = new THREE.Matrix4();
    // Sit the base slightly into the ground so slopes never show a gap.
    const y = Math.min(map.heightAt(t.x, t.z), map.heightAt(t.x + 0.25, t.z + 0.25), map.heightAt(t.x - 0.25, t.z - 0.25)) - 0.04;
    const squash = t.kind === TreeKind.Rock ? 0.8 + 0.4 * ((t.tint + 1) / 2) : 1;
    m.compose(
      new THREE.Vector3(t.x, y, t.z),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.rot),
      new THREE.Vector3(t.scale, t.scale * squash, t.scale),
    );
    return m;
  });
  const fill = (kind: TreeKind, key: number, gone: ReadonlySet<number>): void => {
    const k = kinds.get(kind);
    if (!k) return;
    const ids = (k.byChunk.get(key) ?? []).filter((i) => !gone.has(i));
    if (ids.length === 0 && !(k.byChunk.get(key) ?? []).length) return;
    const first = map.trees[(k.byChunk.get(key) as number[])[0]];
    k.inst.set(first.x, first.z, ids.length, (n, m, c) => {
      const t = map.trees[ids[n]];
      m.copy(mats[ids[n]]);
      const v = 1 + t.tint * TINT[kind];
      c.setRGB(v, v * (1 + t.tint * 0.02), v * (1 - t.tint * 0.03));
    });
  };
  let gone = new Set<number>();
  for (const [kind, k] of kinds) for (const key of k.byChunk.keys()) fill(kind, key, gone);

  return {
    group,
    update(t: number) {
      time.value = t;
    },
    sync(cleared: readonly number[]) {
      const next = new Set(cleared);
      const dirty = new Map<TreeKind, Set<number>>();
      const mark = (i: number): void => {
        const t = map.trees[i];
        const k = kinds.get(t.kind);
        if (!k) return;
        const set = dirty.get(t.kind) ?? new Set<number>();
        set.add(k.inst.key(t.x, t.z));
        dirty.set(t.kind, set);
      };
      for (const i of next) if (!gone.has(i)) mark(i);
      for (const i of gone) if (!next.has(i)) mark(i);
      gone = next;
      for (const [kind, keys] of dirty) for (const key of keys) fill(kind, key, next);
    },
  };
}
