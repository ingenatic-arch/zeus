/**
 * Slice 43: the rowing boats in your bay. While your ship rides at anchor off
 * the jetty with something waiting on the quay (goods for a colony, or
 * settlers going out to found one), a little boat rows back and forth between
 * the jetty's foot and her side: out laden, back empty.
 *
 * It only reads the sim (rowingOut); where the boat is on its trip is from
 * the sim's tick, so it is the same at any speed and paused.
 */
import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { findBuilding } from '../sim/buildings';
import { ROW_TRIP, rowingOut } from '../sim/colonyworks';
import { visitorAt } from '../sim/routes';
import type { SimState } from '../sim/state';
import { berthOf } from '../sim/trade';
import { merge, type Part } from './trees';

/** Boats at most (a trip out and back takes the sim's ROW_TRIP, two porters' loads). */
const MOST = 3;

const box = (w: number, h: number, d: number, x: number, y: number, z: number): THREE.BufferGeometry => new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);

/** A boat along +x: a dark hull, a rower in a pale tunic, and (laden) sacks and jars. */
function boatGeometry(laden: boolean): THREE.BufferGeometry {
  const p: Part[] = [];
  const hull = new THREE.CylinderGeometry(0.17, 0.09, 0.9, 6, 1).rotateZ(Math.PI / 2).scale(1, 0.5, 1);
  p.push({ geo: hull.translate(0, 0.04, 0), color: '#6e4426' });
  p.push({ geo: box(0.7, 0.03, 0.2, 0, 0.08, 0), color: '#a5764a' });
  // The rower, facing aft, and his oars.
  p.push({ geo: new THREE.CylinderGeometry(0.05, 0.07, 0.2, 5).translate(-0.18, 0.2, 0), color: '#efe2c4' });
  p.push({ geo: new THREE.SphereGeometry(0.05, 5, 4).translate(-0.18, 0.34, 0), color: '#b07a52' });
  p.push({ geo: box(0.03, 0.02, 0.62, -0.18, 0.15, 0), color: '#8a5a34' });
  if (laden) {
    p.push({ geo: box(0.16, 0.11, 0.14, 0.08, 0.1, -0.03), color: '#d9c48e' });
    p.push({ geo: box(0.13, 0.1, 0.12, 0.24, 0.1, 0.04), color: '#c9a35a' });
    p.push({ geo: new THREE.CylinderGeometry(0.04, 0.05, 0.13, 6).translate(0.12, 0.17, 0.07), color: '#b5643a' });
  }
  return merge(p);
}

export class RowBoats {
  readonly group = new THREE.Group();
  private readonly meshes: THREE.Mesh[] = [];
  private readonly laden: THREE.BufferGeometry;
  private readonly empty: THREE.BufferGeometry;

  constructor(private readonly map: CoastMap) {
    this.group.name = 'rowboats';
    this.laden = boatGeometry(true);
    this.empty = boatGeometry(false);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, metalness: 0 });
    for (let i = 0; i < MOST; i++) {
      const m = new THREE.Mesh(this.empty, mat);
      m.name = `rowboat-${i}`;
      m.castShadow = true;
      m.visible = false;
      this.meshes.push(m);
      this.group.add(m);
    }
  }

  update(s: SimState, alpha: number, time: number): void {
    const xs = (s.empire.colonies.length || s.empire.foundings.length || (s.empire.cargoes ?? []).length) ? rowingOut(s) : [];
    const t = s.tick + alpha;
    for (let i = 0; i < MOST; i++) {
      const m = this.meshes[i];
      const x = xs[i];
      const post = x ? findBuilding(s, x.post) : undefined;
      const berth = post ? berthOf(this.map, post) : null;
      const at = x ? visitorAt(x.ship, t, this.map.size) : null;
      if (!x || !berth || !at) {
        m.visible = false;
        continue;
      }
      // (From beside the jetty's foot, a little out in the water, to her side; out and back in one trip.)
      const side = i % 2 ? -0.55 : 0.55;
      const ax = berth.jx + berth.ox * 0.9 - berth.oz * side;
      const az = berth.jz + berth.oz * 0.9 + berth.ox * side;
      const bx = at.x - at.dz * 0.75;
      const bz = at.z + at.dx * 0.75;
      // (Her first trip starts as she anchors.)
      const k = ((Math.max(0, t - x.ship.since) / ROW_TRIP) % 1 + 1) % 1;
      const out = k < 0.5;
      // (Easing in and out at each end: a pause to load and unload.)
      const u0 = out ? k * 2 : 2 - k * 2;
      const u = Math.max(0, Math.min(1, (u0 - 0.08) / 0.84));
      const e = u * u * (3 - 2 * u);
      const px = ax + (bx - ax) * e;
      const pz = az + (bz - az) * e;
      const dirx = out ? bx - ax : ax - bx;
      const dirz = out ? bz - az : az - bz;
      m.geometry = out ? this.laden : this.empty;
      m.position.set(px, Math.sin(time * 2.1 + i) * 0.015 - 0.02, pz);
      m.rotation.set(Math.sin(time * 1.7 + i) * 0.04, Math.atan2(-dirz, dirx), 0, 'YXZ');
      m.visible = true;
    }
  }
}
