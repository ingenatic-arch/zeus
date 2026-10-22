import * as THREE from 'three';
import { TreeKind, type CoastMap } from '../map/bake';
import { hash2 } from '../map/noise';
import { finishBuilding } from './buildFinish';
import { finishOn } from './finish';
import { lookTreeModel } from './lookTrees';
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
  // The city's finish: stone surrounds, cornices and string courses on the walls (buildFinish.ts).
  if (finishOn()) parts = finishBuilding(parts);
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

/**
 * Plants lean gently in the breeze: the higher up, the more they move. Each
 * vertex carries where its plant stands and how far it bends (aSway), since
 * a chunk's plants are merged into one mesh.
 */
function swaying(mat: THREE.MeshStandardMaterial, time: { value: number }, key: string): THREE.MeshStandardMaterial {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nattribute vec3 aSway;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
          float ph = uTime * 1.4 + aSway.x * 0.31 + aSway.y * 0.23;
          transformed.x += (sin(ph) + 0.4 * sin(ph * 2.3)) * aSway.z;
          transformed.z += cos(ph * 0.8) * aSway.z * 0.5;`,
      );
  };
  mat.customProgramCacheKey = () => `sway-${key}`;
  return mat;
}

export interface Plants {
  group: THREE.Group;
  update(time: number): void;
  /** Show only the plants not cleared away (indices into map.trees). */
  sync(cleared: readonly number[]): void;
  /** Slice 33: how high the crowns of the trees (and the rocks) standing near a point reach, or -Infinity: the camera keeps above them. */
  canopyAt(x: number, z: number): number;
}

/** Slice 33: how far round a crown the camera keeps off it (world units). */
const CANOPY_MARGIN = 1.2;

/**
 * Plants are drawn in square chunks of this many units, so what's off screen
 * (and outside the shadow box) is skipped. Measured trade-off: 32-unit chunks
 * saved another ~13% of triangles up close but more than doubled the draw
 * calls (273 against 125 in the opening view), which costs more on the CPU.
 */
export const PLANT_CHUNK = 64;

/** How each kind of plant is drawn: rocks stand still; trees and shrubs sway a little, grasses and flowers more, and cast no shadow. */
type Group = 'rock' | 'tree' | 'grass';
const groupOf = (k: TreeKind): Group => (k === TreeKind.Rock ? 'rock' : k === TreeKind.Reed || k === TreeKind.Flowers ? 'grass' : 'tree');
const BEND: Record<Group, number> = { rock: 0, tree: 0.035, grass: 0.12 };

export function buildTrees(map: CoastMap): Plants {
  const group = new THREE.Group();
  group.name = 'trees';
  const time = { value: 0 };
  const plain = (): THREE.MeshStandardMaterial =>
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0 });
  const materials: Record<Group, THREE.Material> = { rock: plain(), tree: swaying(plain(), time, 'tree'), grass: swaying(plain(), time, 'grass') };
  const models = new Map<TreeKind, THREE.BufferGeometry>();
  const model = (k: TreeKind): THREE.BufferGeometry => {
    let g = models.get(k);
    if (!g) {
      g = lookTreeModel(k) ?? MODELS[k]();
      models.set(k, g);
    }
    return g;
  };

  // Every plant in a chunk of the map, of one group, is merged into one mesh: a few draws for the whole landscape.
  const chunkKey = (x: number, z: number): number => (Math.floor(z / PLANT_CHUNK) + 512) * 1024 + (Math.floor(x / PLANT_CHUNK) + 512);
  const byChunk = new Map<string, number[]>();
  map.trees.forEach((t, i) => {
    const k = `${groupOf(t.kind)}:${chunkKey(t.x, t.z)}`;
    const list = byChunk.get(k);
    if (list) list.push(i);
    else byChunk.set(k, [i]);
  });
  const meshes = new Map<string, THREE.Mesh>();

  // Where each plant stands, worked out once.
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
  const nm = new THREE.Matrix3();
  const fill = (key: string, gone: ReadonlySet<number>): void => {
    const ids = (byChunk.get(key) ?? []).filter((i) => !gone.has(i));
    const grp = key.split(':')[0] as Group;
    let n = 0;
    for (const i of ids) n += model(map.trees[i].kind).attributes.position.count;
    const pos = new Float32Array(n * 3);
    const nor = new Float32Array(n * 3);
    const colr = new Float32Array(n * 3);
    const sway = new Float32Array(n * 3);
    let o = 0;
    for (const i of ids) {
      const t = map.trees[i];
      const g = model(t.kind);
      const sp = g.attributes.position.array as Float32Array;
      const sn = g.attributes.normal.array as Float32Array;
      const sc = g.attributes.color.array as Float32Array;
      const e = mats[i].elements;
      const ne = nm.getNormalMatrix(mats[i]).elements;
      const v = 1 + t.tint * TINT[t.kind];
      const tr = v;
      const tg = v * (1 + t.tint * 0.02);
      const tb = v * (1 - t.tint * 0.03);
      const bend = BEND[grp] * t.scale;
      for (let j = 0; j < sp.length; j += 3) {
        const x = sp[j];
        const y = sp[j + 1];
        const z = sp[j + 2];
        pos[o] = e[0] * x + e[4] * y + e[8] * z + e[12];
        pos[o + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
        pos[o + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
        let nx = ne[0] * sn[j] + ne[3] * sn[j + 1] + ne[6] * sn[j + 2];
        let ny = ne[1] * sn[j] + ne[4] * sn[j + 1] + ne[7] * sn[j + 2];
        let nz = ne[2] * sn[j] + ne[5] * sn[j + 1] + ne[8] * sn[j + 2];
        const l = Math.hypot(nx, ny, nz) || 1;
        nx /= l;
        ny /= l;
        nz /= l;
        nor[o] = nx;
        nor[o + 1] = ny;
        nor[o + 2] = nz;
        colr[o] = sc[j] * tr;
        colr[o + 1] = sc[j + 1] * tg;
        colr[o + 2] = sc[j + 2] * tb;
        sway[o] = t.x;
        sway[o + 1] = t.z;
        // The higher up the plant, the more it bends (as when each plant was instanced: from its own height, scaled with it).
        sway[o + 2] = Math.max(y - 0.15, 0) * bend;
        o += 3;
      }
    }
    let mesh = meshes.get(key);
    if (mesh) mesh.geometry.dispose();
    if (n === 0) {
      if (mesh) {
        group.remove(mesh);
        meshes.delete(key);
      }
      return;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
    geo.setAttribute('aSway', new THREE.BufferAttribute(sway, 3));
    geo.computeBoundingSphere();
    // Room for the sway.
    if (geo.boundingSphere) geo.boundingSphere.radius += 0.5;
    if (mesh) mesh.geometry = geo;
    else {
      mesh = new THREE.Mesh(geo, materials[grp]);
      mesh.name = `trees-${grp}-${key.split(':')[1]}`;
      mesh.castShadow = grp !== 'grass';
      mesh.receiveShadow = true;
      meshes.set(key, mesh);
      group.add(mesh);
    }
  };
  let gone = new Set<number>();
  for (const key of byChunk.keys()) fill(key, gone);

  // Slice 33: the crowns' tops on a grid of whole tiles (each crown widened by a margin), redone as plants are cleared.
  const n = map.size + 1;
  const canopy = new Float32Array(n * n);
  const tops = new Map<TreeKind, { top: number; r: number }>();
  const crownOf = (k: TreeKind): { top: number; r: number } => {
    let c = tops.get(k);
    if (!c) {
      const g = model(k);
      if (!g.boundingBox) g.computeBoundingBox();
      const b = g.boundingBox as THREE.Box3;
      c = { top: b.max.y, r: Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) };
      tops.set(k, c);
    }
    return c;
  };
  const bakeCanopy = (): void => {
    canopy.fill(-Infinity);
    map.trees.forEach((t, i) => {
      if (gone.has(i) || groupOf(t.kind) === 'grass') return;
      const c = crownOf(t.kind);
      const top = mats[i].elements[13] + c.top * t.scale * (t.kind === TreeKind.Rock ? 1.2 : 1);
      const r = c.r * t.scale + CANOPY_MARGIN;
      for (let z = Math.max(0, Math.floor(t.z - r)); z <= Math.min(n - 1, Math.ceil(t.z + r)); z++) {
        for (let x = Math.max(0, Math.floor(t.x - r)); x <= Math.min(n - 1, Math.ceil(t.x + r)); x++) {
          if (Math.hypot(x - t.x, z - t.z) > r + 0.71) continue;
          const j = z * n + x;
          if (top > canopy[j]) canopy[j] = top;
        }
      }
    });
  };
  bakeCanopy();

  return {
    group,
    update(t: number) {
      time.value = t;
    },
    sync(cleared: readonly number[]) {
      const next = new Set(cleared);
      const dirty = new Set<string>();
      const mark = (i: number): void => {
        const t = map.trees[i];
        dirty.add(`${groupOf(t.kind)}:${chunkKey(t.x, t.z)}`);
      };
      for (const i of next) if (!gone.has(i)) mark(i);
      for (const i of gone) if (!next.has(i)) mark(i);
      gone = next;
      for (const key of dirty) fill(key, next);
      if (dirty.size) bakeCanopy();
    },
    canopyAt(x: number, z: number) {
      const ix = Math.round(x);
      const iz = Math.round(z);
      if (ix < 0 || iz < 0 || ix >= n || iz >= n) return -Infinity;
      return canopy[iz * n + ix];
    },
  };
}
