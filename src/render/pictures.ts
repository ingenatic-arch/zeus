/**
 * The build panel's pictures: each kind of building drawn from its own model
 * (the same one the town uses) on a square of grass, from the corner the
 * camera usually sees, into a small image. Made once, the first time the
 * panel asks, with a little renderer of its own that is then let go.
 */
import * as THREE from 'three';
import { isLarge, isSmall } from '../sim/buildings';
import type { BuildingKind } from '../sim/state';
import { homePicture } from './homes';
import { SCALE } from '../ui/relief';
import { PAL, col } from './palette';
import { workPicture, type PicturePart } from './works';

/** A picture's size in CSS pixels (drawn at twice that on a high-density screen). */
export const PICTURE_W = 76;
export const PICTURE_H = 60;

/** The building kind a tool puts down, for its footprint. */
const KIND: Record<string, BuildingKind> = { housing: 'home', stall: 'agora', fleecestall: 'agora', winestall: 'agora' };

function partsOf(tool: string): PicturePart[] | null {
  const homes = homePicture(tool);
  if (homes) return homes.map((geo) => ({ geo, x: 0, z: 0, yaw: 0, s: [1, 1, 1] }));
  return workPicture(tool);
}

/** Pictures for these tools, by tool (a tool with no model of its own gets none). */
export function drawPictures(tools: readonly string[]): Map<string, string> {
  const out = new Map<string, string>();
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(PICTURE_W * SCALE, PICTURE_H * SCALE);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, side: THREE.DoubleSide });
  const grass = new THREE.MeshStandardMaterial({ color: col(PAL.meadow), flatShading: true, roughness: 1 });
  const tints = new Map<string, THREE.Material>();
  for (const tool of tools) {
    const parts = partsOf(tool);
    if (!parts) continue;
    const kind = KIND[tool] ?? (tool as BuildingKind);
    const stall = tool.endsWith('stall');
    const side = stall ? 1.4 : isSmall(kind) ? 2 : isLarge(kind) ? 4 : 3;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(col(PAL.hemiSky), col(PAL.hemiGround), 1.3));
    const sun = new THREE.DirectionalLight(col(PAL.sun), 2.9);
    sun.position.set(2, 6, 4);
    scene.add(sun);
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(side + 0.1, 0.08, side + 0.1).translate(0, -0.04, 0), grass));
    for (const p of parts) {
      let m = mat as THREE.Material;
      if (p.tint) {
        let t = tints.get(p.tint);
        if (!t) tints.set(p.tint, (t = new THREE.MeshStandardMaterial({ vertexColors: true, color: col(p.tint), flatShading: true, roughness: 0.9 })));
        m = t;
      }
      const mesh = new THREE.Mesh(p.geo, m);
      mesh.position.set(p.x, 0, p.z);
      mesh.rotation.y = p.yaw;
      mesh.scale.set(...p.s);
      scene.add(mesh);
    }
    // Framed to the footprint: a three-tile building fills the picture, a small one is drawn larger, the barracks smaller.
    const half = side * 0.75;
    const cam = new THREE.OrthographicCamera(-half, half, half * (PICTURE_H / PICTURE_W), -half * (PICTURE_H / PICTURE_W), 0.1, 60);
    cam.position.set(5.2, 4.6, 3.4).multiplyScalar(side / 3);
    cam.lookAt(0, side * 0.08, 0);
    renderer.render(scene, cam);
    out.set(tool, renderer.domElement.toDataURL());
    for (const p of parts) p.geo.dispose();
  }
  mat.dispose();
  grass.dispose();
  for (const t of tints.values()) t.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  return out;
}
