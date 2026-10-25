import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { footSide } from '../sim/buildings';
import type { Building, SimState } from '../sim/state';
import { EYE } from './classic';
import { circle, flat, mergeFlat } from './signs';

/**
 * Slice 48: a paused workplace, drawn over the city. Its workers have gone
 * (jobfolk.ts draws none while it has none), and a small plaque floats over
 * it with the two bars of a pause on it, its rim slate grey: like the smashed
 * jar's plaque (misdeeds.ts), so it reads from far off.
 *
 * Render only: read from the state every quarter second; nothing draws while
 * nothing is paused.
 */

const REFRESH = 0.25;
/** A plaque's radius at the default viewing distance (as the crimes'). */
const SIZE = 0.17;
const CAP = 64;
/** How high each kind's plaque floats (above the ground at its middle), as the crimes' plaques. */
const TOP: Partial<Record<Building['kind'], number>> = { fountain: 1.15, shrine: 1.0, agora: 0.9 };

function faceGeometry(): THREE.BufferGeometry {
  return flat(circle(1), '#fff6e2', 0.02, 20);
}
function rimGeometry(): THREE.BufferGeometry {
  const ring = circle(1.2);
  ring.holes.push(new THREE.Path().absarc(0, 0, 0.97, 0, Math.PI * 2, true));
  return flat(ring, '#5a5468', 0, 20);
}
/** Two upright bars. */
function barsIcon(): THREE.BufferGeometry {
  const bar = (x: number): THREE.BufferGeometry => {
    const s = new THREE.Shape();
    s.moveTo(x - 0.13, -0.5);
    s.lineTo(x + 0.13, -0.5);
    s.lineTo(x + 0.13, 0.5);
    s.lineTo(x - 0.13, 0.5);
    s.closePath();
    return flat(s, '#3a3448', 0.04, 1);
  };
  return mergeFlat([bar(-0.24), bar(0.24)]);
}

export class PauseMarks {
  readonly group = new THREE.Group();
  private readonly meshes: THREE.InstancedMesh[];
  private at: Array<{ id: number; cx: number; cz: number; y: number; top: number }> = [];
  private last = -Infinity;
  private lastRev = -1;
  private readonly m = new THREE.Matrix4();
  private readonly p = new THREE.Vector3();
  private readonly sc = new THREE.Vector3();
  /** Shown now (for the measuring script and the smoke checks). */
  count = 0;

  constructor(private readonly map: CoastMap) {
    this.group.name = 'pause-marks';
    const basic = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    this.meshes = [rimGeometry(), faceGeometry(), barsIcon()].map((g, i) => {
      const mesh = new THREE.InstancedMesh(g, basic, CAP);
      mesh.name = ['pause-rim', 'pause-face', 'pause-bars'][i];
      mesh.renderOrder = 2;
      mesh.count = 0;
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      return mesh;
    });
  }

  update(s: SimState, camera: THREE.Camera, time: number): void {
    if (time - this.last > REFRESH || s.rev !== this.lastRev) {
      this.last = time;
      this.lastRev = s.rev;
      const out: typeof this.at = [];
      for (const b of s.buildings) {
        if (!b.paused || out.length >= CAP) continue;
        const side = footSide(b);
        const cx = b.x + side / 2;
        const cz = b.z + side / 2;
        out.push({ id: b.id, cx, cz, y: this.map.heightAt(cx, cz), top: TOP[b.kind] ?? 1 });
      }
      this.at = out;
    }
    const q = camera.quaternion;
    let n = 0;
    for (const k of this.at) {
      this.p.set(k.cx, k.y + k.top + 0.55, k.cz);
      const dist = this.p.distanceTo(camera.position) - EYE.back;
      const far = Math.min(3, Math.max(0.6, dist / 27));
      const r = SIZE * far;
      this.p.y += Math.sin(time * 1.2 + k.id * 0.7) * 0.02 + (far - 1) * 0.25;
      this.sc.set(r, r, r);
      this.m.compose(this.p, q, this.sc);
      for (const mesh of this.meshes) mesh.setMatrixAt(n, this.m);
      n++;
    }
    for (const mesh of this.meshes) {
      mesh.count = n;
      mesh.visible = n > 0;
      mesh.instanceMatrix.needsUpdate = true;
    }
    this.count = n;
  }
}
