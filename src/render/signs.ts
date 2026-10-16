import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { warningsOf, wantOf, WARNING } from '../sim/folk';
import type { Building, Service, SimState } from '../sim/state';

/** How often (seconds) which homes have signs is worked out again. */
const REFRESH = 0.25;
/** How high over the ground a sign floats (over the tallest roof). */
const HEIGHT = 1.72;
/** The sign's radius at the default viewing distance. */
const SIZE = 0.27;

/** A flat shape (x, y) in the plane facing +z, with one colour, as a geometry with vertex colours. */
function flat(shape: THREE.Shape, color: string, z: number, segments = 12): THREE.BufferGeometry {
  const g = new THREE.ShapeGeometry(shape, segments).translate(0, 0, z);
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const cols = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) cols.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return g;
}

/** Several flat pieces in one geometry. */
function mergeFlat(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  for (const p of parts) {
    const g = p.index ? p.toNonIndexed() : p;
    pos.push(...(g.attributes.position.array as Float32Array));
    col.push(...(g.attributes.color.array as Float32Array));
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return out;
}

const circle = (r: number, cx = 0, cy = 0): THREE.Shape => new THREE.Shape().absarc(cx, cy, r, 0, Math.PI * 2, false);

/** The sign's cream face, with a little tail pointing down at the house. */
function faceGeometry(): THREE.BufferGeometry {
  const face = circle(1);
  const tail = new THREE.Shape();
  tail.moveTo(-0.32, -0.86);
  tail.lineTo(0.32, -0.86);
  tail.lineTo(0, -1.42);
  tail.closePath();
  return mergeFlat([flat(face, '#fff6e2', 0.02, 24), flat(tail, '#fff6e2', 0.02)]);
}

/** The rim round the face and tail (its colour set per sign: amber to red as the warning runs out). */
function rimGeometry(): THREE.BufferGeometry {
  const ring = circle(1.2);
  ring.holes.push(new THREE.Path().absarc(0, 0, 0.98, 0, Math.PI * 2, true));
  const tail = new THREE.Shape();
  tail.moveTo(-0.5, -0.9);
  tail.lineTo(0.5, -0.9);
  tail.lineTo(0, -1.66);
  tail.closePath();
  return mergeFlat([flat(ring, '#ffffff', 0, 24), flat(tail, '#ffffff', 0)]);
}

/** A water drop, blue with a highlight. */
function dropGeometry(): THREE.BufferGeometry {
  const d = new THREE.Shape();
  d.moveTo(0, 0.68);
  d.bezierCurveTo(0.12, 0.42, 0.5, 0.06, 0.5, -0.2);
  d.bezierCurveTo(0.5, -0.5, 0.26, -0.68, 0, -0.68);
  d.bezierCurveTo(-0.26, -0.68, -0.5, -0.5, -0.5, -0.2);
  d.bezierCurveTo(-0.5, 0.06, -0.12, 0.42, 0, 0.68);
  const shine = new THREE.Shape();
  shine.moveTo(-0.3, -0.18);
  shine.bezierCurveTo(-0.3, -0.36, -0.18, -0.48, -0.04, -0.5);
  shine.lineTo(-0.06, -0.4);
  shine.bezierCurveTo(-0.16, -0.36, -0.2, -0.28, -0.2, -0.18);
  shine.closePath();
  return mergeFlat([flat(d, '#3f8fe0', 0.04, 10), flat(shine, '#d6f0ff', 0.05, 4)]);
}

/** A round loaf, golden brown with three scores across it. */
function loafGeometry(): THREE.BufferGeometry {
  const l = new THREE.Shape();
  l.moveTo(-0.66, -0.32);
  l.bezierCurveTo(-0.7, 0.2, -0.36, 0.5, 0, 0.5);
  l.bezierCurveTo(0.36, 0.5, 0.7, 0.2, 0.66, -0.32);
  l.bezierCurveTo(0.6, -0.44, -0.6, -0.44, -0.66, -0.32);
  const parts = [flat(l, '#d48a2c', 0.04, 10)];
  for (const x of [-0.3, 0, 0.3]) {
    const s = new THREE.Shape();
    s.moveTo(x - 0.1, 0.26);
    s.lineTo(x - 0.02, 0.3);
    s.lineTo(x + 0.1, -0.12);
    s.lineTo(x + 0.02, -0.16);
    s.closePath();
    parts.push(flat(s, '#f2c46a', 0.05));
  }
  return mergeFlat(parts);
}

interface Sign {
  b: Building;
  /** What it lacks: one need, or both side by side. */
  needs: Service[];
  /** 0 just warned … 1 about to drop a level; -1 for a need to grow (shown with the "what's missing" overlay). */
  urgency: number;
}

/**
 * Signs over homes that lack what they need: a round cream sign with a water
 * drop or a loaf (or both, side by side), its rim orange-red when the warning
 * starts and deep red as the two months run out, pulsing in the last days. Warned homes always show theirs;
 * with the "what's missing" overlay on, homes that only lack what they need
 * to grow show one too, with a gold rim. Signs face the camera and grow a
 * little with distance so they stay readable from the usual height.
 */
export class Signs {
  readonly group = new THREE.Group();
  private readonly meshes: { rim: THREE.InstancedMesh; face: THREE.InstancedMesh; drop: THREE.InstancedMesh; loaf: THREE.InstancedMesh };
  private signs: Sign[] = [];
  private last = -Infinity;
  private lastTick = -1;
  private lastAll = false;
  private readonly m = new THREE.Matrix4();
  private readonly icon = new THREE.Matrix4();
  /** Where the drop and the loaf go on a sign that shows both. */
  private readonly left = new THREE.Matrix4().makeTranslation(-0.42, 0.02, 0).multiply(new THREE.Matrix4().makeScale(0.62, 0.62, 1));
  private readonly right = new THREE.Matrix4().makeTranslation(0.42, 0.02, 0).multiply(new THREE.Matrix4().makeScale(0.62, 0.62, 1));
  private readonly p = new THREE.Vector3();
  private readonly sc = new THREE.Vector3();
  private readonly c = new THREE.Color();
  /** A warning's rim: orange-red when it starts, deep red as time runs out (the overlay's red); a need to grow: gold (its amber). */
  private readonly amber = new THREE.Color('#e0632c');
  private readonly red = new THREE.Color('#b8261a');
  private readonly gold = new THREE.Color('#e8c040');
  /** Signs showing now (for the measuring script). */
  count = 0;

  constructor(private readonly map: CoastMap) {
    this.group.name = 'signs';
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    const make = (name: string, geo: THREE.BufferGeometry, colours: boolean): THREE.InstancedMesh => {
      const mesh = new THREE.InstancedMesh(geo, mat, 64);
      mesh.name = name;
      if (colours) mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(64 * 3).fill(1), 3);
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.renderOrder = 2;
      this.group.add(mesh);
      return mesh;
    };
    this.meshes = { rim: make('sign-rim', rimGeometry(), true), face: make('sign-face', faceGeometry(), false), drop: make('sign-drop', dropGeometry(), false), loaf: make('sign-loaf', loafGeometry(), false) };
  }

  /** Which homes have signs, worked out again a few times a second (or when the day changes). */
  private refresh(s: SimState, all: boolean): void {
    const out: Sign[] = [];
    for (const b of s.buildings) {
      if (b.kind !== 'home' || b.people === 0) continue;
      const ws = warningsOf(s, b);
      if (ws.length) out.push({ b, needs: ws.map((w) => w.need), urgency: Math.min(1, Math.max(0, 1 - ws[0].left / WARNING)) });
      else if (all) {
        const want = wantOf(s, b);
        if (want) out.push({ b, needs: [want], urgency: -1 });
      }
    }
    this.signs = out;
  }

  /** Grow an instanced mesh to hold n. */
  private fit(key: keyof Signs['meshes'], n: number): void {
    const old = this.meshes[key];
    if (n <= old.instanceMatrix.count) return;
    const cap = Math.max(n, old.instanceMatrix.count * 2);
    const mesh = new THREE.InstancedMesh(old.geometry, old.material, cap);
    mesh.name = old.name;
    if (old.instanceColor) mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3);
    mesh.frustumCulled = false;
    mesh.renderOrder = old.renderOrder;
    this.group.remove(old);
    old.dispose();
    this.group.add(mesh);
    this.meshes[key] = mesh;
  }

  update(s: SimState, camera: THREE.Camera, time: number, all: boolean): void {
    if (time - this.last > REFRESH || all !== this.lastAll || Math.floor(s.tick / 10) !== this.lastTick) {
      this.last = time;
      this.lastAll = all;
      this.lastTick = Math.floor(s.tick / 10);
      this.refresh(s, all);
    }
    const n = this.signs.length;
    for (const k of ['rim', 'face', 'drop', 'loaf'] as const) this.fit(k, n);
    const { rim, face, drop, loaf } = this.meshes;
    let nd = 0;
    let nl = 0;
    const q = camera.quaternion;
    const cam = camera.position;
    for (let i = 0; i < n; i++) {
      const { b, needs, urgency } = this.signs[i];
      const cx = b.x + 1;
      const cz = b.z + 1;
      const bob = Math.sin(time * 1.7 + b.id * 1.3) * 0.045;
      this.p.set(cx, this.map.heightAt(cx, cz) + HEIGHT + bob, cz);
      // Bigger with distance (up to three times), so a sign reads from the default height and from afar.
      const far = Math.min(3, Math.max(0.7, this.p.distanceTo(cam) / 27));
      const pulse = urgency > 0.83 ? 1 + 0.1 * Math.sin(time * 6 + b.id) : 1;
      const k = SIZE * far * pulse * (urgency < 0 ? 0.85 : 1);
      // Lift the sign by its own tail so the tip stays above the roof as it grows.
      this.p.y += (k - SIZE) * 1.4;
      this.sc.set(k, k, k);
      this.m.compose(this.p, q, this.sc);
      rim.setMatrixAt(i, this.m);
      face.setMatrixAt(i, this.m);
      if (needs.length === 1) {
        if (needs[0] === 'water') drop.setMatrixAt(nd++, this.m);
        else loaf.setMatrixAt(nl++, this.m);
      } else {
        // Both: the drop and the loaf side by side, a little smaller.
        drop.setMatrixAt(nd++, this.icon.copy(this.m).multiply(this.left));
        loaf.setMatrixAt(nl++, this.icon.copy(this.m).multiply(this.right));
      }
      if (urgency < 0) this.c.copy(this.gold);
      else this.c.copy(this.amber).lerp(this.red, Math.min(1, urgency * 1.15));
      rim.setColorAt(i, this.c);
    }
    rim.count = n;
    face.count = n;
    drop.count = nd;
    loaf.count = nl;
    for (const mesh of [rim, face, drop, loaf]) mesh.instanceMatrix.needsUpdate = true;
    if (rim.instanceColor) rim.instanceColor.needsUpdate = true;
    this.count = n;
  }
}

/**
 * A soft gold ring on the ground round the home whose panel is open, draped
 * over the ground and gently pulsing.
 */
export class Selection {
  readonly mesh: THREE.Mesh;
  private id = 0;
  private readonly mat: THREE.MeshBasicMaterial;

  constructor(
    private readonly map: CoastMap,
    color = '#ffe27a',
    name = 'selection',
  ) {
    this.mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.mat);
    this.mesh.name = name;
    this.mesh.visible = false;
    this.mesh.renderOrder = 1;
  }

  /** Ring the footprint of this building, or of a tile (side 1), or none. */
  set(b: Pick<Building, 'id' | 'x' | 'z'> | null, side = 2): void {
    if (!b) {
      this.mesh.visible = false;
      this.id = 0;
      return;
    }
    this.mesh.visible = true;
    if (b.id === this.id) return;
    this.id = b.id;
    const pos: number[] = [];
    // Just outside the footprint, so the walls never hide it.
    const x0 = b.x - 0.24;
    const z0 = b.z - 0.24;
    const x1 = b.x + side + 0.24;
    const z1 = b.z + side + 0.24;
    const w = 0.2;
    const y = (x: number, z: number): number => this.map.heightAt(x, z) + 0.09;
    // Each edge in short steps, so the ring follows the ground.
    const edge = (ax: number, az: number, bx: number, bz: number, nx: number, nz: number): void => {
      const steps = 8;
      for (let i = 0; i < steps; i++) {
        const f0 = i / steps;
        const f1 = (i + 1) / steps;
        const p0x = ax + (bx - ax) * f0;
        const p0z = az + (bz - az) * f0;
        const p1x = ax + (bx - ax) * f1;
        const p1z = az + (bz - az) * f1;
        const q0x = p0x + nx * w;
        const q0z = p0z + nz * w;
        const q1x = p1x + nx * w;
        const q1z = p1z + nz * w;
        pos.push(p0x, y(p0x, p0z), p0z, p1x, y(p1x, p1z), p1z, q1x, y(q1x, q1z), q1z);
        pos.push(p0x, y(p0x, p0z), p0z, q1x, y(q1x, q1z), q1z, q0x, y(q0x, q0z), q0z);
      }
    };
    edge(x0, z0, x1, z0, 0, 1);
    edge(x1, z0, x1, z1, -1, 0);
    edge(x1, z1, x0, z1, 0, -1);
    edge(x0, z1, x0, z0, 1, 0);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.mesh.geometry.dispose();
    this.mesh.geometry = g;
  }

  update(time: number): void {
    if (this.mesh.visible) this.mat.opacity = 0.7 + 0.25 * Math.sin(time * 3);
  }
}
