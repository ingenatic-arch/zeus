import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { hash2 } from '../map/noise';
import { findBuilding, footSide } from '../sim/buildings';
import type { Building, SimState } from '../sim/state';
import { EYE } from './classic';
import { facingOf } from './homes';
import { col, PAL } from './palette';
import { circle, flat, mergeFlat } from './signs';

/**
 * Slice 41: what the new crimes leave in the street, drawn over the city.
 *
 * A smashed fountain, shrine or stall: shards of stone (or of a stall's jars
 * and planks) on the paving round it, the broken piece lying at its foot (a
 * fountain's bowl, a shrine's little statue), and a plaque over it with a
 * broken jar on it, its rim brick red. (homes.ts stops a smashed fountain's
 * water, so it stands dry.) A gang's den: a pole by its door with a
 * rust-red rag tied to it, and a plaque over it with two crossed clubs. A
 * home where there is talk of burning: a plaque with a torch, its rim amber.
 *
 * Render only: read from the state (crime.broken, crime.gangs, crime.talk)
 * every quarter second; nothing draws while nothing is wrong.
 */

/** How often (seconds) what is drawn is worked out again. */
const REFRESH = 0.25;
/** A plaque's radius at the default viewing distance (as fire and wear's). */
const SIZE = 0.17;
/** Most of each kind drawn at once. */
const CAP = 64;
const SHARDS = 9;
/** Broken stone: a little darker than a fountain's, so it shows on its paving. */
const SHARD = '#a39885';

type Icon = 'smashed' | 'den' | 'talk';

/** A place to draw at: its building, centre, the ground there and how high its plaque floats. */
interface At {
  b: Building;
  cx: number;
  cz: number;
  y: number;
  top: number;
  icon: Icon;
}

/** The plaque's cream face and its rim (coloured per plaque). */
function faceGeometry(): THREE.BufferGeometry {
  return flat(circle(1), '#fff6e2', 0.02, 20);
}
function rimGeometry(): THREE.BufferGeometry {
  const ring = circle(1.2);
  ring.holes.push(new THREE.Path().absarc(0, 0, 0.97, 0, Math.PI * 2, true));
  return flat(ring, '#ffffff', 0, 20);
}

/** A jar broken in two down a jagged line, the halves apart (smashed). */
function brokenJarIcon(): THREE.BufferGeometry {
  const half = (dx: number, flip: number): THREE.BufferGeometry => {
    const s = new THREE.Shape();
    // The jar's outline, one half of it, closed along the jagged break.
    s.moveTo(dx, 0.62);
    s.lineTo(dx + flip * 0.16, 0.62);
    s.lineTo(dx + flip * 0.14, 0.42);
    s.bezierCurveTo(dx + flip * 0.5, 0.3, dx + flip * 0.5, -0.3, dx + flip * 0.2, -0.56);
    s.lineTo(dx, -0.56);
    s.lineTo(dx + flip * 0.08, -0.3);
    s.lineTo(dx - flip * 0.06, -0.06);
    s.lineTo(dx + flip * 0.08, 0.16);
    s.lineTo(dx - flip * 0.04, 0.4);
    s.closePath();
    return flat(s, '#b9683e', 0.04, 6);
  };
  return mergeFlat([half(-0.1, -1), half(0.1, 1)]);
}

/** Two clubs crossed (a gang's den). */
function clubsIcon(): THREE.BufferGeometry {
  const club = (a: number): THREE.BufferGeometry => {
    const s = new THREE.Shape();
    s.moveTo(-0.05, -0.62);
    s.lineTo(0.05, -0.62);
    s.lineTo(0.11, 0.36);
    s.bezierCurveTo(0.2, 0.46, 0.18, 0.66, 0, 0.68);
    s.bezierCurveTo(-0.18, 0.66, -0.2, 0.46, -0.11, 0.36);
    s.closePath();
    const g = flat(s, '#5a3a26', 0.04, 6);
    g.rotateZ(a);
    return g;
  };
  return mergeFlat([club(0.6), club(-0.6)]);
}

/** A torch, lit (talk of burning). */
function torchIcon(): THREE.BufferGeometry {
  const stick = new THREE.Shape();
  stick.moveTo(-0.06, -0.64);
  stick.lineTo(0.06, -0.64);
  stick.lineTo(0.09, 0.08);
  stick.lineTo(-0.09, 0.08);
  stick.closePath();
  const fire = new THREE.Shape();
  fire.moveTo(0, 0.06);
  fire.bezierCurveTo(0.36, 0.06, 0.34, 0.4, 0.16, 0.5);
  fire.bezierCurveTo(0.12, 0.58, 0.06, 0.62, 0.02, 0.74);
  fire.bezierCurveTo(-0.08, 0.6, -0.2, 0.52, -0.26, 0.36);
  fire.bezierCurveTo(-0.34, 0.16, -0.22, 0.06, 0, 0.06);
  const heart = new THREE.Shape();
  heart.moveTo(0, 0.1);
  heart.bezierCurveTo(0.16, 0.1, 0.16, 0.3, 0.06, 0.4);
  heart.bezierCurveTo(-0.04, 0.32, -0.14, 0.24, -0.12, 0.16);
  heart.bezierCurveTo(-0.1, 0.1, -0.06, 0.1, 0, 0.1);
  return mergeFlat([flat(stick, '#6a4c33', 0.03, 1), flat(fire, '#e2531e', 0.04, 8), flat(heart, '#f6c13a', 0.05, 8)]);
}

/** Coloured parts merged into one geometry (vertex colours; no finish: these are props, not buildings). */
function paint(parts: Array<{ geo: THREE.BufferGeometry; color: string }>): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  for (const { geo, color } of parts) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const p = g.getAttribute('position');
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
  return out;
}

/** A pole by a den's door with a rust-red rag knotted to it, facing +x (the rag hangs off the pole's side). */
function denFlag(): THREE.BufferGeometry {
  const rag = new THREE.BufferGeometry();
  // A ragged cloth: two strips hanging from the top, one longer.
  rag.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.88, 0, 0, 0.52, 0.03, 0, 0.88, 0.26, 0, 0.88, 0.26, 0, 0.52, 0.03, 0, 0.42, 0.28], 3));
  return paint([
    { geo: new THREE.CylinderGeometry(0.018, 0.022, 0.9, 5).translate(0, 0.45, 0), color: PAL.woodDark },
    { geo: new THREE.SphereGeometry(0.03, 5, 3).translate(0, 0.86, 0.01), color: '#6e2a1e' },
    { geo: rag, color: '#b03a26' },
  ]);
}

/** How high each kind's plaque floats (above the ground at its middle). */
const TOP: Partial<Record<Building['kind'], number>> = { fountain: 1.15, shrine: 1.0, agora: 0.9 };
const HOME_TOP = [0.4, 0.75, 0.85, 0.95, 1.35, 1.5, 1.7, 1.6, 2.0];

const fract = (x: number): number => x - Math.floor(x);

export class CrimeMarks {
  readonly group = new THREE.Group();
  private readonly faces: THREE.InstancedMesh;
  private readonly rims: THREE.InstancedMesh;
  private readonly icons: Record<Icon, THREE.InstancedMesh>;
  private readonly shards: THREE.InstancedMesh;
  private readonly pieces: THREE.InstancedMesh;
  private readonly flags: THREE.InstancedMesh;
  private at: At[] = [];
  private last = -Infinity;
  private lastRev = -1;
  private readonly m = new THREE.Matrix4();
  private readonly p = new THREE.Vector3();
  private readonly q = new THREE.Quaternion();
  private readonly sc = new THREE.Vector3();
  private readonly c = new THREE.Color();
  private readonly e = new THREE.Euler();
  private readonly rim: Record<Icon, THREE.Color> = { smashed: new THREE.Color('#a8321e'), den: new THREE.Color('#7a2a20'), talk: new THREE.Color('#e0a030') };
  /** Shown now (for the measuring script and the smoke checks). */
  count = { marks: 0, shards: 0, flags: 0 };

  constructor(private readonly map: CoastMap) {
    this.group.name = 'crime-marks';
    const basic = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    const mark = (name: string, geo: THREE.BufferGeometry, colours: boolean): THREE.InstancedMesh => {
      const mesh = new THREE.InstancedMesh(geo, basic, CAP);
      mesh.name = name;
      if (colours) mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 3).fill(1), 3);
      mesh.renderOrder = 2;
      return this.add(mesh);
    };
    this.rims = mark('crime-rim', rimGeometry(), true);
    this.faces = mark('crime-face', faceGeometry(), false);
    this.icons = { smashed: mark('crime-smashed', brokenJarIcon(), false), den: mark('crime-den', clubsIcon(), false), talk: mark('crime-talk', torchIcon(), false) };
    const lit = new THREE.MeshStandardMaterial({ vertexColors: false, flatShading: true, roughness: 0.9 });
    this.shards = this.add(new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.06, 0), lit, CAP * SHARDS));
    this.shards.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAP * SHARDS * 3).fill(1), 3);
    // The broken piece: a fountain's bowl, a shrine's statue, a stall's jar, lying on its side.
    this.pieces = this.add(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.09, 0.1, 9), lit, CAP));
    this.pieces.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 3).fill(1), 3);
    this.flags = this.add(new THREE.InstancedMesh(denFlag(), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, side: THREE.DoubleSide }), CAP));
    this.shards.castShadow = this.pieces.castShadow = this.flags.castShadow = true;
  }

  private add(mesh: THREE.InstancedMesh): THREE.InstancedMesh {
    mesh.count = 0;
    mesh.visible = false;
    mesh.frustumCulled = false;
    this.group.add(mesh);
    return mesh;
  }

  private refresh(s: SimState): void {
    const out: At[] = [];
    const c = s.crime;
    const place = (b: Building | undefined, icon: Icon): void => {
      if (!b || out.length >= CAP) return;
      const side = footSide(b);
      const cx = b.x + side / 2;
      const cz = b.z + side / 2;
      const top = b.kind === 'home' ? HOME_TOP[Math.min(b.level, HOME_TOP.length - 1)] : (TOP[b.kind] ?? 1);
      out.push({ b, cx, cz, y: this.map.heightAt(cx, cz), top, icon });
    };
    for (const x of c.broken ?? []) place(findBuilding(s, x.at), 'smashed');
    for (const g of c.gangs ?? []) place(findBuilding(s, g.den), 'den');
    for (const t of c.talk ?? []) place(findBuilding(s, t.home), 'talk');
    this.at = out;
  }

  update(s: SimState, camera: THREE.Camera, time: number): void {
    if (time - this.last > REFRESH || s.rev !== this.lastRev) {
      this.last = time;
      this.lastRev = s.rev;
      this.refresh(s);
    }
    const size = this.map.size;
    const q = camera.quaternion;
    let plates = 0;
    const per: Record<Icon, number> = { smashed: 0, den: 0, talk: 0 };
    let shards = 0;
    let pieces = 0;
    let flags = 0;
    for (const k of this.at) {
      // The plaque, floating over it, growing a little with distance so it reads from far off (as fire and wear's).
      this.p.set(k.cx, k.y + k.top + 0.55, k.cz);
      const dist = this.p.distanceTo(camera.position) - EYE.back;
      const far = Math.min(3, Math.max(0.6, dist / 27));
      const pulse = k.icon === 'talk' ? 1 + 0.12 * Math.sin(time * 5 + k.b.id) : 1;
      const r = SIZE * far * pulse;
      this.p.y += Math.sin(time * 1.5 + k.b.id * 0.7) * 0.03 + (far - 1) * 0.25;
      this.sc.set(r, r, r);
      this.m.compose(this.p, q, this.sc);
      this.faces.setMatrixAt(plates, this.m);
      this.rims.setMatrixAt(plates, this.m);
      this.rims.setColorAt(plates++, this.rim[k.icon]);
      this.icons[k.icon].setMatrixAt(per[k.icon]++, this.m);
      const id = k.b.id;
      if (k.icon === 'smashed') {
        // Shards scattered on the paving round it, and the broken piece lying at its foot.
        const side = footSide(k.b);
        const stone = k.b.kind === 'agora' ? col(PAL.amphora) : col(SHARD);
        // (Out past a fountain's basin, on its paving: a third to a half of its side from the middle.)
        for (let i = 0; i < SHARDS; i++) {
          const a = hash2(id, i, 51) * Math.PI * 2;
          const d = side * (0.36 + 0.16 * hash2(id, i, 52));
          const x = k.cx + Math.cos(a) * d;
          const z = k.cz + Math.sin(a) * d;
          this.e.set(hash2(id, i, 53) * 3, hash2(id, i, 54) * 3, 0);
          this.q.setFromEuler(this.e);
          const s2 = 0.8 + 0.9 * hash2(id, i, 55);
          this.sc.set(s2, s2 * 0.6, s2);
          this.p.set(x, this.map.heightAt(x, z) + 0.08, z);
          this.m.compose(this.p, this.q, this.sc);
          this.shards.setMatrixAt(shards, this.m);
          this.c.copy(stone).multiplyScalar(0.8 + 0.25 * hash2(id, i, 56));
          this.shards.setColorAt(shards++, this.c);
        }
        // The broken piece at one of its front corners.
        const a = (Math.floor(hash2(id, 1, 57) * 4) + 0.5) * (Math.PI / 2);
        const d = side * 0.5;
        const x = k.cx + Math.cos(a) * d;
        const z = k.cz + Math.sin(a) * d;
        this.e.set(1.25, a, 0.3);
        this.q.setFromEuler(this.e);
        const big = k.b.kind === 'shrine' ? 0.8 : k.b.kind === 'agora' ? 0.7 : 1;
        this.sc.set(big, big, big);
        this.p.set(x, this.map.heightAt(x, z) + 0.16, z);
        this.m.compose(this.p, this.q, this.sc);
        this.pieces.setMatrixAt(pieces, this.m);
        this.pieces.setColorAt(pieces++, k.b.kind === 'agora' ? col(PAL.amphora) : col(PAL.fountainStoneShade));
      } else if (k.icon === 'den') {
        // The pole by its door, the rag stirring.
        const yaw = facingOf(s, size, k.b);
        const side = footSide(k.b);
        const fx = Math.cos(yaw);
        const fz = -Math.sin(yaw);
        // At the front corner, to the door's side.
        const x = k.cx + fx * side * 0.5 + fz * side * 0.32;
        const z = k.cz + fz * side * 0.5 - fx * side * 0.32;
        this.e.set(0, yaw + Math.sin(time * 1.3 + id) * 0.15 * fract(id * 0.37), 0);
        this.q.setFromEuler(this.e);
        this.sc.set(1, 1, 1);
        this.p.set(x, this.map.heightAt(x, z), z);
        this.m.compose(this.p, this.q, this.sc);
        this.flags.setMatrixAt(flags++, this.m);
      }
    }
    const done = (mesh: THREE.InstancedMesh, n: number): void => {
      mesh.count = n;
      mesh.visible = n > 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };
    done(this.faces, plates);
    done(this.rims, plates);
    for (const icon of ['smashed', 'den', 'talk'] as const) done(this.icons[icon], per[icon]);
    done(this.shards, shards);
    done(this.pieces, pieces);
    done(this.flags, flags);
    this.count = { marks: plates, shards, flags };
  }
}
