import * as THREE from 'three';
import { EYE } from './classic';
import type { CoastMap } from '../map/bake';
import { NEEDS, warningsOf, wantOf, WARNING } from '../sim/folk';
import type { Building, Service, SimState } from '../sim/state';
import { cutOffPlots } from '../sim/settlers';

/** How often (seconds) which homes have signs is worked out again. */
const REFRESH = 0.25;
/** How high over the ground a sign floats (over the tallest roof). */
const HEIGHT = 1.72;
/** The sign's radius at the default viewing distance. */
const SIZE = 0.27;

/** A flat shape (x, y) in the plane facing +z, with one colour, as a geometry with vertex colours. */
export function flat(shape: THREE.Shape, color: string, z: number, segments = 12): THREE.BufferGeometry {
  const g = new THREE.ShapeGeometry(shape, segments).translate(0, 0, z);
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const cols = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) cols.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return g;
}

/** Several flat pieces in one geometry. */
export function mergeFlat(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
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

export const circle = (r: number, cx = 0, cy = 0): THREE.Shape => new THREE.Shape().absarc(cx, cy, r, 0, Math.PI * 2, false);

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

/** Slice 30: "no road": a stretch of road, a dashed line down its middle, barred across in red. */
function noRoadGeometry(): THREE.BufferGeometry {
  const road = new THREE.Shape();
  road.moveTo(-0.26, -0.66);
  road.lineTo(0.26, -0.66);
  road.lineTo(0.18, 0.66);
  road.lineTo(-0.18, 0.66);
  road.closePath();
  const dash = (y: number): THREE.Shape => {
    const d = new THREE.Shape();
    d.moveTo(-0.035, y - 0.11);
    d.lineTo(0.035, y - 0.11);
    d.lineTo(0.03, y + 0.11);
    d.lineTo(-0.03, y + 0.11);
    d.closePath();
    return d;
  };
  const bar = new THREE.Shape();
  const a = Math.PI / 4;
  const [c, s] = [Math.cos(a), Math.sin(a)];
  const pt = (x: number, y: number): [number, number] => [x * c - y * s, x * s + y * c];
  bar.moveTo(...pt(-0.78, -0.11));
  bar.lineTo(...pt(0.78, -0.11));
  bar.lineTo(...pt(0.78, 0.11));
  bar.lineTo(...pt(-0.78, 0.11));
  bar.closePath();
  return mergeFlat([flat(road, '#8a8278', 0.04, 4), flat(dash(-0.36), '#f4ecd8', 0.05, 2), flat(dash(0.02), '#f4ecd8', 0.05, 2), flat(dash(0.38), '#f4ecd8', 0.05, 2), flat(bar, '#c62a1e', 0.06, 2)]);
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

/** A little temple, lilac: a pediment on three columns over a step. */
function templeGeometry(): THREE.BufferGeometry {
  const ped = new THREE.Shape();
  ped.moveTo(-0.62, 0.2);
  ped.lineTo(0.62, 0.2);
  ped.lineTo(0, 0.6);
  ped.closePath();
  const rect = (x0: number, y0: number, x1: number, y1: number): THREE.Shape => new THREE.Shape().moveTo(x0, y0).lineTo(x1, y0).lineTo(x1, y1).lineTo(x0, y1).closePath();
  const parts = [flat(ped, '#7f58c8', 0.04), flat(rect(-0.58, 0.08, 0.58, 0.2), '#6a46b0', 0.04), flat(rect(-0.64, -0.6, 0.64, -0.46), '#7f58c8', 0.04)];
  for (const x of [-0.4, 0, 0.4]) parts.push(flat(rect(x - 0.08, -0.46, x + 0.08, 0.08), '#a585e6', 0.04));
  return mergeFlat(parts);
}

/** A jar of oil, olive green: a round body, a neck and lip, two little handles. */
function jarGeometry(): THREE.BufferGeometry {
  const j = new THREE.Shape();
  j.moveTo(-0.14, 0.62);
  j.lineTo(0.14, 0.62);
  j.lineTo(0.12, 0.38);
  j.bezierCurveTo(0.6, 0.3, 0.6, -0.4, 0.2, -0.62);
  j.lineTo(-0.2, -0.62);
  j.bezierCurveTo(-0.6, -0.4, -0.6, 0.3, -0.12, 0.38);
  j.closePath();
  const lip = new THREE.Shape().moveTo(-0.22, 0.56).lineTo(0.22, 0.56).lineTo(0.22, 0.66).lineTo(-0.22, 0.66).closePath();
  const parts = [flat(j, '#6f8a22', 0.04, 10), flat(lip, '#56701a', 0.05)];
  for (const sx of [-1, 1]) {
    const h = new THREE.Shape();
    h.moveTo(sx * 0.12, 0.5);
    h.lineTo(sx * 0.36, 0.48);
    h.lineTo(sx * 0.36, 0.24);
    h.lineTo(sx * 0.28, 0.26);
    h.lineTo(sx * 0.28, 0.4);
    h.lineTo(sx * 0.12, 0.42);
    h.closePath();
    parts.push(flat(h, '#56701a', 0.035));
  }
  const shine = new THREE.Shape().absellipse(-0.2, 0.0, 0.07, 0.18, 0, Math.PI * 2, false, 0.3);
  parts.push(flat(shine, '#c4d870', 0.05, 8));
  return mergeFlat(parts);
}

/** A bale of fleece: a puffy wool cloud with a darker edge and a slate-blue tie round its middle. */
function fleeceGeometry(): THREE.BufferGeometry {
  const puffs: [number, number, number][] = [
    [-0.36, 0.16, 0.26],
    [-0.08, 0.3, 0.3],
    [0.26, 0.22, 0.28],
    [0.42, -0.08, 0.24],
    [0.14, -0.26, 0.28],
    [-0.22, -0.24, 0.28],
    [-0.46, -0.1, 0.22],
    [0, 0, 0.34],
  ];
  const parts: THREE.BufferGeometry[] = [];
  for (const [x, y, r] of puffs) parts.push(flat(circle(r + 0.06, x, y), '#9c8458', 0.035, 10));
  for (const [x, y, r] of puffs) parts.push(flat(circle(r, x, y), '#e8d8ac', 0.04, 10));
  const tie = new THREE.Shape().moveTo(-0.06, 0.56).lineTo(0.08, 0.56).lineTo(0.1, -0.52).lineTo(-0.04, -0.52).closePath();
  parts.push(flat(tie, '#4c5a8c', 0.05));
  parts.push(flat(circle(0.07, -0.26, 0.24), '#fff8e6', 0.05, 6), flat(circle(0.06, 0.24, -0.16), '#fff8e6', 0.05, 6));
  return mergeFlat(parts);
}

/** A bunch of grapes, deep purple, with a green leaf and a stalk. */
function grapesGeometry(): THREE.BufferGeometry {
  const rows: [number, number][] = [
    [-0.33, 0.24], [-0.11, 0.24], [0.11, 0.24], [0.33, 0.24],
    [-0.22, 0.02], [0, 0.02], [0.22, 0.02],
    [-0.11, -0.2], [0.11, -0.2],
    [0, -0.42],
  ];
  const parts: THREE.BufferGeometry[] = [];
  const leaf = new THREE.Shape();
  leaf.moveTo(0.04, 0.4);
  leaf.bezierCurveTo(0.2, 0.7, 0.5, 0.72, 0.62, 0.56);
  leaf.bezierCurveTo(0.46, 0.4, 0.22, 0.36, 0.04, 0.4);
  parts.push(flat(leaf, '#5a8a2a', 0.035, 6));
  const stalk = new THREE.Shape().moveTo(-0.04, 0.34).lineTo(0.04, 0.34).lineTo(0.0, 0.62).lineTo(-0.08, 0.62).closePath();
  parts.push(flat(stalk, '#6a4a22', 0.035));
  for (const [x, y] of rows) parts.push(flat(circle(0.13, x, y), '#6a2470', 0.04, 8));
  for (const [x, y] of rows) parts.push(flat(circle(0.04, x - 0.04, y + 0.04), '#c890d0', 0.05, 4));
  return mergeFlat(parts);
}

/** A smiling theatre mask, rose, its eyes and mouth cut through to the sign's face. */
function maskGeometry(): THREE.BufferGeometry {
  const m = new THREE.Shape();
  m.moveTo(-0.56, 0.5);
  m.quadraticCurveTo(0, 0.36, 0.56, 0.5);
  m.bezierCurveTo(0.62, -0.08, 0.36, -0.64, 0, -0.64);
  m.bezierCurveTo(-0.36, -0.64, -0.62, -0.08, -0.56, 0.5);
  for (const x of [-0.22, 0.22]) m.holes.push(new THREE.Path().absellipse(x, 0.14, 0.12, 0.08, 0, Math.PI * 2, false, x < 0 ? 0.25 : -0.25));
  const mouth = new THREE.Path();
  mouth.moveTo(-0.3, -0.16);
  mouth.quadraticCurveTo(0, -0.12, 0.3, -0.16);
  mouth.quadraticCurveTo(0, -0.5, -0.3, -0.16);
  m.holes.push(mouth);
  return mergeFlat([flat(m, '#d24a6a', 0.04, 10)]);
}

/** A capsule `l` either side of the middle, of radius `r`. */
function capsule(l: number, r: number): THREE.Shape {
  const c = new THREE.Shape();
  c.moveTo(-l, -r);
  c.lineTo(l, -r);
  c.absarc(l, 0, r, -Math.PI / 2, Math.PI / 2, false);
  c.lineTo(-l, r);
  c.absarc(-l, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false);
  return c;
}

/** The wide sign for three or four needs: a cream capsule with the tail, `l` either side of the middle. */
function wideFace(l: number): THREE.BufferGeometry {
  const tail = new THREE.Shape();
  tail.moveTo(-0.32, -0.86);
  tail.lineTo(0.32, -0.86);
  tail.lineTo(0, -1.42);
  tail.closePath();
  return mergeFlat([flat(capsule(l, 1), '#fff6e2', 0.02, 12), flat(tail, '#fff6e2', 0.02)]);
}

function wideRim(l: number): THREE.BufferGeometry {
  const ring = capsule(l, 1.2);
  const hole = capsule(l, 0.98);
  ring.holes.push(new THREE.Path(hole.getPoints(12)));
  const tail = new THREE.Shape();
  tail.moveTo(-0.5, -0.9);
  tail.lineTo(0.5, -0.9);
  tail.lineTo(0, -1.66);
  tail.closePath();
  return mergeFlat([flat(ring, '#ffffff', 0, 12), flat(tail, '#ffffff', 0)]);
}

/** Half the straight run of the wide signs, for three and for four icons. */
const WIDE3 = 0.95;
const WIDE4 = 1.42;
const WIDE5 = 1.9;
const WIDE6 = 2.38;
const WIDE7 = 2.86;
/** How high over the ground a sign floats, by the home's level (over its roof). */
const HEIGHTS = [HEIGHT, HEIGHT, HEIGHT, HEIGHT, 2.25, 2.4, 2.75, 2.6, 3.0];
/** Slice 30: a "no road" sign floats lower, over an empty plot. */
const PLOT_HEIGHT = 1.1;

interface Sign {
  b: Building;
  /** Slice 30: an empty plot no road from the edge passes (its sign: a road barred in red; needs empty). */
  noRoad?: boolean;
  /** What it lacks, in the fixed order: water, bread, blessings, oil, plays, fleece, wine. */
  needs: Service[];
  /** 0 just warned … 1 about to drop a level; -1 for a need to grow (shown with the "what's missing" overlay). */
  urgency: number;
}

type MeshName = 'rim' | 'face' | 'rim3' | 'face3' | 'rim4' | 'face4' | 'rim5' | 'face5' | 'rim6' | 'face6' | 'rim7' | 'face7' | Service | 'noroad';
const ICON_OF: Record<Service, MeshName> = { water: 'water', food: 'food', religion: 'religion', oil: 'oil', culture: 'culture', fleece: 'fleece', wine: 'wine' };

/**
 * Signs over homes that lack what they need: a round cream sign with a water
 * drop, a loaf, a little temple (blessings), a jar (oil), a mask (plays), a
 * bale of wool (fleece) or a bunch of grapes (wine), or two side by side; three
 * to seven needs take a wider sign with the icons in a row, always in the same
 * order (water, bread, blessings, oil, plays, fleece, wine) so a glance reads the
 * same way every time. The rim is orange-red when the warning starts and
 * deep red as the two months run out, pulsing in the last days. Warned homes
 * always show theirs; with the "what's missing" overlay on, homes that only
 * lack what they need to grow show one too, with a gold rim. Signs face the
 * camera, float over the roof (higher over the taller houses), and grow a
 * little with distance so they stay readable from the usual height.
 */
export class Signs {
  readonly group = new THREE.Group();
  private readonly meshes: Record<MeshName, THREE.InstancedMesh>;
  private signs: Sign[] = [];
  private last = -Infinity;
  private lastTick = -1;
  private lastAll = false;
  private readonly m = new THREE.Matrix4();
  private readonly icon = new THREE.Matrix4();
  /** Where each icon goes, for one, two, three and four of them. */
  private readonly slots: THREE.Matrix4[][];
  private readonly p = new THREE.Vector3();
  private readonly sc = new THREE.Vector3();
  private readonly c = new THREE.Color();
  /** A warning's rim: orange-red when it starts, deep red as time runs out (the overlay's red); a need to grow: gold (its amber). */
  private readonly amber = new THREE.Color('#e0632c');
  private readonly red = new THREE.Color('#b8261a');
  private readonly gold = new THREE.Color('#e8c040');
  /** Signs showing now (for the measuring script), and how many of them are wide. */
  count = 0;
  wide = 0;

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
    this.meshes = {
      rim: make('sign-rim', rimGeometry(), true),
      face: make('sign-face', faceGeometry(), false),
      rim3: make('sign-rim-3', wideRim(WIDE3), true),
      face3: make('sign-face-3', wideFace(WIDE3), false),
      rim4: make('sign-rim-4', wideRim(WIDE4), true),
      face4: make('sign-face-4', wideFace(WIDE4), false),
      rim5: make('sign-rim-5', wideRim(WIDE5), true),
      face5: make('sign-face-5', wideFace(WIDE5), false),
      rim6: make('sign-rim-6', wideRim(WIDE6), true),
      face6: make('sign-face-6', wideFace(WIDE6), false),
      rim7: make('sign-rim-7', wideRim(WIDE7), true),
      face7: make('sign-face-7', wideFace(WIDE7), false),
      water: make('sign-drop', dropGeometry(), false),
      food: make('sign-loaf', loafGeometry(), false),
      religion: make('sign-temple', templeGeometry(), false),
      oil: make('sign-jar', jarGeometry(), false),
      culture: make('sign-mask', maskGeometry(), false),
      fleece: make('sign-fleece', fleeceGeometry(), false),
      wine: make('sign-grapes', grapesGeometry(), false),
      noroad: make('sign-noroad', noRoadGeometry(), false),
    };
    const at = (x: number, k: number): THREE.Matrix4 => new THREE.Matrix4().makeTranslation(x, 0.02, 0).multiply(new THREE.Matrix4().makeScale(k, k, 1));
    const row = (l: number, n: number, k: number): THREE.Matrix4[] => Array.from({ length: n }, (_, i) => at(-l + (2 * l * i) / (n - 1), k));
    this.slots = [[], [new THREE.Matrix4()], [at(-0.4, 0.67), at(0.42, 0.67)], row(WIDE3, 3, 0.7), row(WIDE4, 4, 0.7), row(WIDE5, 5, 0.7), row(WIDE6, 6, 0.7), row(WIDE7, 7, 0.7)];
  }

  /** Which homes have signs, worked out again a few times a second (or when the day changes). */
  private refresh(s: SimState, all: boolean): void {
    const out: Sign[] = [];
    for (const b of s.buildings) {
      if (b.kind !== 'home' || b.people === 0) continue;
      const ws = warningsOf(s, b);
      if (ws.length) out.push({ b, needs: NEEDS.filter((n) => ws.some((w) => w.need === n)), urgency: Math.min(1, Math.max(0, 1 - ws[0].left / WARNING)) });
      else if (all) {
        const want = wantOf(s, b);
        if (want) out.push({ b, needs: [want], urgency: -1 });
      }
    }
    // Slice 30: and every empty plot no road from the edge passes.
    for (const b of cutOffPlots(s, this.map)) out.push({ b, needs: [], urgency: 0.6, noRoad: true });
    this.signs = out;
  }

  /** Grow an instanced mesh to hold n. */
  private fit(key: MeshName, n: number): void {
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
    const names = Object.keys(this.meshes) as MeshName[];
    for (const k of names) this.fit(k, n);
    const counts = Object.fromEntries(names.map((k) => [k, 0])) as Record<MeshName, number>;
    const q = camera.quaternion;
    const cam = camera.position;
    let wide = 0;
    for (let i = 0; i < n; i++) {
      const { b, needs, urgency, noRoad } = this.signs[i];
      // (Slice 36: over the middle of an estate's 4 x 4.)
      const cx = b.x + (b.estate ? 2 : 1);
      const cz = b.z + (b.estate ? 2 : 1);
      const bob = Math.sin(time * 1.7 + b.id * 1.3) * 0.045;
      this.p.set(cx, this.map.heightAt(cx, cz) + (noRoad ? PLOT_HEIGHT : HEIGHTS[Math.min(b.level, HEIGHTS.length - 1)]) + bob, cz);
      // The same size on screen from about 16 units away out to far off (up to three times its size), so a sign
      // reads from the default height and from afar; closer than that it grows, but not to fill the view.
      const far = Math.min(3, Math.max(0.6, (this.p.distanceTo(cam) - EYE.back) / 27));
      const pulse = urgency > 0.83 ? 1 + 0.1 * Math.sin(time * 6 + b.id) : 1;
      const k = SIZE * far * pulse * (urgency < 0 ? 0.85 : 1);
      // Lift the sign by its own tail so the tip stays above the roof as it grows.
      this.p.y += (k - SIZE) * 1.4;
      this.sc.set(k, k, k);
      this.m.compose(this.p, q, this.sc);
      const shape = needs.length >= 3 ? String(Math.min(7, needs.length)) : '';
      if (shape) wide++;
      const rim = this.meshes[`rim${shape}` as MeshName];
      const face = this.meshes[`face${shape}` as MeshName];
      const ri = counts[`rim${shape}` as MeshName]++;
      counts[`face${shape}` as MeshName]++;
      rim.setMatrixAt(ri, this.m);
      face.setMatrixAt(ri, this.m);
      if (noRoad) this.meshes.noroad.setMatrixAt(counts.noroad++, this.m);
      const slots = this.slots[Math.min(7, needs.length)];
      needs.forEach((need, j) => {
        const key = ICON_OF[need];
        this.meshes[key].setMatrixAt(counts[key]++, this.icon.copy(this.m).multiply(slots[j]));
      });
      if (urgency < 0) this.c.copy(this.gold);
      else this.c.copy(this.amber).lerp(this.red, Math.min(1, urgency * 1.15));
      rim.setColorAt(ri, this.c);
    }
    for (const k of names) {
      const mesh = this.meshes[k];
      mesh.count = counts[k];
      mesh.visible = counts[k] > 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    this.count = n;
    this.wide = wide;
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
