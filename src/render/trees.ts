import * as THREE from 'three';
import { TreeKind, type CoastMap, type TreeInstance } from '../map/bake';
import { hash2 } from '../map/noise';
import { col, PAL } from './palette';

/**
 * Low-poly plants and rocks, one instanced mesh per kind. Each model is a few
 * simple shapes merged into one geometry with flat colours baked in, so a
 * whole kind draws in a single call.
 */

type Part = { geo: THREE.BufferGeometry; color: string };

/** Nudge vertices by a seeded amount so shapes look hand-made, not machined. */
function lumpy(geo: THREE.BufferGeometry, amount: number, seed: number): THREE.BufferGeometry {
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

function merge(parts: Part[]): THREE.BufferGeometry {
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

const MODELS: Record<TreeKind, () => THREE.BufferGeometry> = {
  [TreeKind.Olive]: olive,
  [TreeKind.Pine]: pine,
  [TreeKind.Cypress]: cypress,
  [TreeKind.Scrub]: scrub,
  [TreeKind.Broom]: broom,
  [TreeKind.Rock]: rock,
  [TreeKind.Reed]: reeds,
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
};

export function buildTrees(map: CoastMap): THREE.Group {
  const group = new THREE.Group();
  group.name = 'trees';
  const byKind = new Map<TreeKind, TreeInstance[]>();
  for (const t of map.trees) {
    const list = byKind.get(t.kind) ?? [];
    list.push(t);
    byKind.set(t.kind, list);
  }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0 });
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const c = new THREE.Color();
  for (const [kind, list] of byKind) {
    const mesh = new THREE.InstancedMesh(MODELS[kind](), mat, list.length);
    mesh.name = `trees-${TreeKind[kind]}`;
    mesh.castShadow = kind !== TreeKind.Reed;
    mesh.receiveShadow = true;
    list.forEach((t, i) => {
      // Sit the base slightly into the ground so slopes never show a gap.
      const y = Math.min(map.heightAt(t.x, t.z), map.heightAt(t.x + 0.25, t.z + 0.25), map.heightAt(t.x - 0.25, t.z - 0.25)) - 0.04;
      p.set(t.x, y, t.z);
      q.setFromAxisAngle(up, t.rot);
      const squash = kind === TreeKind.Rock ? 0.8 + 0.4 * ((t.tint + 1) / 2) : 1;
      s.set(t.scale, t.scale * squash, t.scale);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      const k = 1 + t.tint * TINT[kind];
      c.setRGB(k, k * (1 + t.tint * 0.02), k * (1 - t.tint * 0.03));
      mesh.setColorAt(i, c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group;
}
