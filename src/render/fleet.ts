import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { PLACES, type CityId } from '../map/greece';
import { hash2 } from '../map/noise';
import { centreOf, findBuilding } from '../sim/buildings';
import { BUILD_TICKS, SINK_TICKS } from '../sim/fleet';
import type { EnemyShip, SimState, Trireme } from '../sim/state';
import { berthAt } from '../sim/trade';
import { cyl } from './homes';
import { PAL } from './palette';
import { merge, type Part } from './trees';

/**
 * The fleet on the water (slice 26): your triremes and the enemy ships in
 * the bay. Never more than a handful of each, so each is one merged mesh of
 * its own, its version swapped as it goes.
 *
 * - A trireme: long and low, her hull in your city's colours, a bronze ram at
 *   the waterline, painted eyes, a fan of a stern post, outriggers along her
 *   sides and a row of oars each side (four versions swapped as she rows, and
 *   one with the oars drawn in for when she lies at her mooring), her mast
 *   with the sail furled. On the slip she is a bare frame, then a hull.
 * - An enemy ship: shorter, dark-hulled, her city's colour in her band and in
 *   the stripe of her dark sail, fewer oars; drawn up on the beach she lies
 *   bow-up on the sand, sail furled, oars in.
 *
 * Drawn between ticks. A ship struck rocks and throws up spray; a ship going
 * under lists, settles and is gone over SINK_TICKS. Local frame: bow +x, the
 * waterline at y = 0.
 */

// ---------------------------------------------------------------------------
// The models.

const v = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

/** A spar or line from a to b, radius r. */
function spar(a: THREE.Vector3, b: THREE.Vector3, r: number, color: string, seg = 4): Part {
  const d = new THREE.Vector3().subVectors(b, a);
  const g = cyl(r, r, d.length(), seg);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return { geo: g, color };
}

interface HullShape {
  half: number;
  beam: (u: number) => number;
  sheer: (u: number) => number;
  keel: (u: number) => number;
}

/** A hull in bands from the gunwale down (each its own colour), and its deck. */
function hull(h: HullShape, colours: readonly string[], deck: string): Part[] {
  const N = 18;
  const section = (u: number): Array<[number, number]> => {
    const b = h.beam(u);
    const s = h.sheer(u);
    const k = h.keel(u);
    return [
      [b * 0.95, s],
      [b, s - 0.08],
      [b * 0.98, 0.12],
      [b * 0.9, 0.0],
      [b * 0.55, k * 0.7],
      [0, k],
    ];
  };
  const bands: number[][] = colours.map(() => []);
  for (let i = 0; i < N; i++) {
    const u0 = -1 + (2 * i) / N;
    const u1 = -1 + (2 * (i + 1)) / N;
    const a = section(u0);
    const b = section(u1);
    for (let k = 0; k < colours.length; k++) {
      for (const side of [1, -1]) {
        const p = (u: number, pt: [number, number]): number[] => [u * h.half, pt[1], pt[0] * side];
        const A = p(u0, a[k]);
        const B = p(u1, b[k]);
        const C = p(u1, b[k + 1]);
        const D = p(u0, a[k + 1]);
        bands[k].push(...A, ...B, ...C, ...A, ...C, ...D);
      }
    }
  }
  const parts: Part[] = bands.map((pos, k) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return { geo: g, color: colours[k] };
  });
  const d: number[] = [];
  for (let i = 0; i < N; i++) {
    const u0 = -1 + (2 * i) / N;
    const u1 = -1 + (2 * (i + 1)) / N;
    const y0 = h.sheer(u0) - 0.07;
    const y1 = h.sheer(u1) - 0.07;
    const b0 = h.beam(u0) * 0.9;
    const b1 = h.beam(u1) * 0.9;
    const x0 = u0 * h.half;
    const x1 = u1 * h.half;
    d.push(x0, y0, -b0, x1, y1, -b1, x1, y1, b1, x0, y0, -b0, x1, y1, b1, x0, y0, b0);
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.Float32BufferAttribute(d, 3));
  parts.push({ geo: dg, color: deck });
  return parts;
}

/** Painted eyes either side of the bow. */
function eyes(h: HullShape, u: number, y: number): Part[] {
  const parts: Part[] = [];
  const x = u * h.half;
  const z = h.beam(u) + 0.012;
  for (const side of [1, -1]) {
    const yaw = side > 0 ? 0 : Math.PI;
    const eye = new THREE.CircleGeometry(0.07, 8).scale(1.5, 1, 1);
    const pupil = new THREE.CircleGeometry(0.032, 6);
    eye.rotateY(yaw - 0.3 * side).translate(x, y, z * side);
    pupil.rotateY(yaw - 0.3 * side).translate(x + 0.02, y, (z + 0.006) * side);
    parts.push({ geo: eye, color: PAL.eye }, { geo: pupil, color: PAL.hullDark });
  }
  return parts;
}

/** A row of oars each side: `n` of them from u0 to u1 along her, swept `a` (radians, + towards the bow), the blades `dip` deep (negative: in the air); `out` how far they reach. */
function oars(h: HullShape, n: number, u0: number, u1: number, a: number, dip: number, out: number, color: string): Part[] {
  const parts: Part[] = [];
  for (let i = 0; i < n; i++) {
    const u = u0 + ((u1 - u0) * i) / Math.max(1, n - 1);
    const x = u * h.half;
    const y = h.sheer(u) - 0.1;
    for (const side of [1, -1]) {
      const z = (h.beam(u) + 0.06) * side;
      const tip = v(x + Math.sin(a) * out, -dip, z + side * Math.cos(a) * out);
      parts.push(spar(v(x, y, z), tip, 0.013, color, 3));
      // The blade.
      const blade = new THREE.BoxGeometry(0.16, 0.012, 0.07).rotateY(-a * side).translate(tip.x, tip.y, tip.z);
      parts.push({ geo: blade, color });
    }
  }
  return parts;
}

/** A mast with the sail furled on its yard, `top` high at `x`, the yard `half` wide; or with the sail set (a flat square, striped). */
function rig(x: number, top: number, half: number, cloth: string, stripe: string, set: boolean): Part[] {
  const parts: Part[] = [spar(v(x, 0.1, 0), v(x, top, 0), 0.035, PAL.mast, 5)];
  const yy = top - 0.18;
  parts.push(spar(v(x + 0.03, yy, -half), v(x + 0.03, yy, half), 0.025, PAL.mast, 4));
  if (!set) {
    parts.push(spar(v(x + 0.05, yy - 0.09, -half + 0.08), v(x + 0.05, yy - 0.09, half - 0.08), 0.06, cloth, 6));
    for (let k = 0; k < 4; k++) parts.push({ geo: cyl(0.065, 0.065, 0.03, 6).rotateX(Math.PI / 2).translate(x + 0.05, yy - 0.09, -half + 0.2 + (k * (2 * half - 0.4)) / 3), color: stripe });
    return parts;
  }
  const foot = yy - 1.15;
  const rows = 4;
  for (let c = 0; c < 6; c++) {
    const pos: number[] = [];
    const z0 = -half + (c * 2 * half) / 6;
    const z1 = -half + ((c + 1) * 2 * half) / 6;
    for (let r = 0; r < rows; r++) {
      const y0 = yy - 0.04 - ((yy - 0.04 - foot) * r) / rows;
      const y1 = yy - 0.04 - ((yy - 0.04 - foot) * (r + 1)) / rows;
      const b0 = 0.06 + 0.22 * Math.sin((Math.PI * r) / rows);
      const b1 = 0.06 + 0.22 * Math.sin((Math.PI * (r + 1)) / rows);
      pos.push(x + b0, y0, z0, x + b0, y0, z1, x + b1, y1, z1, x + b0, y0, z0, x + b1, y1, z1, x + b1, y1, z0);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    parts.push({ geo: g, color: c === 2 || c === 3 ? stripe : cloth });
  }
  return parts;
}

// The trireme.
const TRI: HullShape = {
  half: 2.1,
  beam: (u) => 0.4 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), u < 0 ? 2.2 : 2.8)), 0.5),
  sheer: (u) => 0.3 + 0.1 * u * u + (u < 0 ? 0.12 * u * u * u * u : 0),
  keel: (u) => -0.2 * Math.sqrt(Math.max(0, 1 - u * u)) - 0.02,
};

function triremeBody(colour: string): Part[] {
  const parts = hull(TRI, [colour, PAL.hull, PAL.hullDark, PAL.hullDark, PAL.hullDark], PAL.deck);
  // The outriggers along her sides, where the top rowers' oars pivot.
  for (const side of [1, -1]) parts.push({ geo: new THREE.BoxGeometry(2.7, 0.06, 0.1).translate(0.05, TRI.sheer(0) - 0.04, side * (TRI.beam(0) + 0.05)), color: PAL.wood });
  // The bronze ram at the waterline, and the stem rising above it.
  parts.push({ geo: new THREE.ConeGeometry(0.075, 0.42, 5).rotateZ(-Math.PI / 2).translate(TRI.half + 0.2, 0.02, 0), color: PAL.bronze });
  parts.push({ geo: new THREE.BoxGeometry(0.14, 0.12, 0.12).translate(TRI.half - 0.02, 0.03, 0), color: PAL.bronze });
  parts.push(spar(v(TRI.half - 0.05, 0.02, 0), v(TRI.half + 0.12, TRI.sheer(1) + 0.18, 0), 0.035, PAL.hullDark));
  // The stern post sweeping up and over in a fan (the aphlaston).
  const s0 = v(-TRI.half + 0.05, TRI.sheer(-1) - 0.05, 0);
  for (const [dx, dy] of [[0.0, 0.55], [0.12, 0.6], [0.24, 0.55]]) parts.push(spar(s0, v(-TRI.half - 0.12 + dx, TRI.sheer(-1) + dy, 0), 0.025, colour));
  parts.push(...eyes(TRI, 0.84, 0.18));
  // A steering oar each side at the stern.
  for (const side of [1, -1]) parts.push(spar(v(-1.55, TRI.sheer(-0.75) + 0.05, side * 0.32), v(-2.05, -0.22, side * 0.45), 0.02, PAL.mast));
  // A shield or two hung along the gunwale aft, in the city's colour.
  for (const side of [1, -1]) for (const x of [-1.2, -0.9]) parts.push({ geo: new THREE.CircleGeometry(0.08, 8).rotateY(side > 0 ? 0 : Math.PI).translate(x, TRI.sheer(x / TRI.half) - 0.02, side * (TRI.beam(x / TRI.half) + 0.11)), color: colour });
  parts.push(...rig(0.15, 1.75, 0.8, PAL.sailCream, colour, false));
  return parts;
}

/** The bare frame on the slip: keel, stem and stern, ribs. */
function triremeFrame(): Part[] {
  const parts: Part[] = [spar(v(-TRI.half, -0.1, 0), v(TRI.half, -0.1, 0), 0.04, PAL.wood)];
  parts.push(spar(v(TRI.half - 0.1, -0.1, 0), v(TRI.half + 0.05, TRI.sheer(1), 0), 0.035, PAL.wood));
  parts.push(spar(v(-TRI.half + 0.1, -0.1, 0), v(-TRI.half - 0.05, TRI.sheer(-1) + 0.2, 0), 0.035, PAL.wood));
  for (let i = 1; i < 12; i++) {
    const u = -1 + (2 * i) / 12;
    const x = u * TRI.half;
    for (const side of [1, -1]) parts.push(spar(v(x, -0.1, 0), v(x, TRI.sheer(u), side * TRI.beam(u)), 0.018, PAL.woodDark ?? PAL.wood));
  }
  // The first strakes along the bottom.
  for (const side of [1, -1]) parts.push(spar(v(-TRI.half + 0.3, 0.0, side * 0.2), v(TRI.half - 0.3, 0.0, side * 0.2), 0.02, PAL.wood));
  return parts;
}

// The enemy ship (a pentekonter).
const FOE: HullShape = {
  half: 1.7,
  beam: (u) => 0.4 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 2.2)), 0.55),
  sheer: (u) => 0.32 + 0.14 * u * u,
  keel: (u) => -0.22 * Math.sqrt(Math.max(0, 1 - u * u)) - 0.02,
};

function foeBody(colour: string): Part[] {
  const parts = hull(FOE, [PAL.hullDark, PAL.hullDark, colour, PAL.hullDark, PAL.hullDark], PAL.hull);
  parts.push(spar(v(FOE.half - 0.05, -0.05, 0), v(FOE.half + 0.22, TRI.sheer(1) + 0.2, 0), 0.04, PAL.hullDark));
  parts.push(spar(v(-FOE.half + 0.05, FOE.sheer(-1) - 0.05, 0), v(-FOE.half - 0.15, FOE.sheer(-1) + 0.5, 0), 0.04, PAL.hullDark));
  parts.push(...eyes(FOE, 0.82, 0.22));
  // Shields along the gunwale: the raiders' own.
  for (const side of [1, -1]) for (let k = 0; k < 5; k++) {
    const x = -0.9 + k * 0.42;
    parts.push({ geo: new THREE.CircleGeometry(0.09, 8).rotateY(side > 0 ? 0 : Math.PI).translate(x, FOE.sheer(x / FOE.half) + 0.02, side * (FOE.beam(x / FOE.half) + 0.01)), color: k % 2 ? colour : PAL.bronze });
  }
  for (const side of [1, -1]) parts.push(spar(v(-1.25, FOE.sheer(-0.75) + 0.05, side * 0.3), v(-1.7, -0.22, side * 0.42), 0.02, PAL.mast));
  return parts;
}

/** How far a trireme at her foe is drawn from the foe's middle: her half-length and the ram, and the foe's half-beam. */
const STAND_OFF = 2.45;

type TriVersion = 'row0' | 'row1' | 'row2' | 'row3' | 'rest' | 'frame' | 'hull';
type FoeVersion = 'sail0' | 'sail1' | 'beached';

function triremeVersions(colour: string): Record<TriVersion, THREE.BufferGeometry> {
  const body = triremeBody(colour);
  const STROKE: Array<[number, number]> = [[-0.45, 0.06], [-0.1, 0.08], [0.3, -0.06], [0.05, -0.12]];
  const out: Partial<Record<TriVersion, THREE.BufferGeometry>> = {};
  STROKE.forEach(([a, dip], k) => {
    out[`row${k}` as TriVersion] = merge([...body, ...oars(TRI, 11, -0.62, 0.6, a, dip, 1.0, PAL.mast)]);
  });
  // At rest: oars drawn in and stowed fore and aft along the outriggers.
  out.rest = merge([...body, ...oars(TRI, 11, -0.62, 0.6, 1.45, -0.32, 0.4, PAL.mast)]);
  out.frame = merge(triremeFrame());
  out.hull = merge(hull(TRI, [PAL.hull, PAL.hull, PAL.hullDark, PAL.hullDark, PAL.hullDark], PAL.deck));
  return out as Record<TriVersion, THREE.BufferGeometry>;
}

function foeVersions(colour: string): Record<FoeVersion, THREE.BufferGeometry> {
  const body = foeBody(colour);
  const dark = '#3a3330';
  return {
    sail0: merge([...body, ...rig(0.1, 2.2, 0.85, dark, colour, true), ...oars(FOE, 7, -0.55, 0.5, -0.35, 0.06, 0.85, PAL.hullDark)]),
    sail1: merge([...body, ...rig(0.1, 2.2, 0.85, dark, colour, true), ...oars(FOE, 7, -0.55, 0.5, 0.25, -0.08, 0.85, PAL.hullDark)]),
    beached: merge([...body, ...rig(0.1, 2.2, 0.85, dark, colour, false)]),
  };
}

/** A burst of spray: a few white lumps, scaled up and faded as it goes. */
function sprayModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = 0.15 + 0.2 * hash2(i, 3, 2601);
    const h = 0.15 + 0.35 * hash2(i, 4, 2601);
    parts.push({ geo: new THREE.IcosahedronGeometry(0.07 + 0.05 * hash2(i, 5, 2601), 0).translate(Math.cos(a) * r, h, Math.sin(a) * r), color: PAL.foam });
  }
  return merge(parts);
}

// ---------------------------------------------------------------------------
// Drawing them.

/** What the probes and hovers read: each ship drawn now. */
export interface FleetShown {
  kind: 'trireme' | 'enemy';
  id: number;
  x: number;
  z: number;
  visible: boolean;
}

interface Drawn {
  mesh: THREE.Mesh;
  spray: THREE.Mesh;
  heading: number;
  shown: boolean;
}

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));

export class FleetView {
  readonly group = new THREE.Group();
  private readonly mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8, metalness: 0, side: THREE.DoubleSide });
  private readonly sprayMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0, transparent: true, opacity: 0.85 });
  private readonly spray = sprayModel();
  private tri: Record<TriVersion, THREE.BufferGeometry> | null = null;
  private readonly foes = new Map<string, Record<FoeVersion, THREE.BufferGeometry>>();
  private readonly drawn = new Map<string, Drawn>();
  /** Where each ship was at the last tick and this one (to draw between them). */
  private prev = new Map<string, [number, number]>();
  private cur = new Map<string, [number, number]>();
  private tick = -1;
  private lastTime = 0;
  /** For the probes and the hovers. */
  shown: FleetShown[] = [];

  constructor(private readonly map: CoastMap) {
    this.group.name = 'fleet';
  }

  private draw(key: string): Drawn {
    let d = this.drawn.get(key);
    if (d) return d;
    const mesh = new THREE.Mesh(undefined, this.mat);
    mesh.name = `fleet-${key}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const spray = new THREE.Mesh(this.spray, this.sprayMat);
    spray.visible = false;
    this.group.add(mesh, spray);
    d = { mesh, spray, heading: 0, shown: false };
    this.drawn.set(key, d);
    return d;
  }

  private foeModel(city: CityId): Record<FoeVersion, THREE.BufferGeometry> {
    let m = this.foes.get(city);
    if (!m) this.foes.set(city, (m = foeVersions(PLACES[city].colour)));
    return m;
  }

  update(s: SimState, alpha: number, time: number): void {
    const f = s.fleet;
    const dt = clamp(time - this.lastTime, 0, 0.25);
    this.lastTime = time;
    if (s.tick !== this.tick) {
      this.prev = this.cur;
      this.cur = new Map();
      for (const t of f.triremes) this.cur.set(`t${t.id}`, [t.x, t.z]);
      for (const e of f.ships) this.cur.set(`e${e.id}`, [e.x, e.z]);
      // (A jump of more than a tick, a load or a skip: no gliding across the bay from where she was.)
      if (s.tick !== this.tick + 1) this.prev = this.cur;
      this.tick = s.tick;
    }
    const seen = new Set<string>();
    this.shown = [];
    if (f.triremes.length && !this.tri) this.tri = triremeVersions(PLACES.home.colour);
    for (const t of f.triremes) {
      const key = `t${t.id}`;
      if (t.state === 'away') continue;
      seen.add(key);
      this.place(s, key, t, alpha, time, dt);
    }
    for (const e of f.ships) {
      if (s.tick < e.from) continue;
      const key = `e${e.id}`;
      seen.add(key);
      this.place(s, key, e, alpha, time, dt);
    }
    for (const [key, d] of this.drawn) {
      if (seen.has(key)) continue;
      d.mesh.visible = false;
      d.spray.visible = false;
      d.shown = false;
    }
  }

  private place(s: SimState, key: string, o: Trireme | EnemyShip, alpha: number, time: number, dt: number): void {
    const d = this.draw(key);
    const t = s.tick + alpha;
    const isTri = key[0] === 't';
    const tri = isTri ? (o as Trireme) : null;
    const foe = isTri ? null : (o as EnemyShip);
    const [cx, cz] = this.cur.get(key) ?? [o.x, o.z];
    const [px, pz] = this.prev.get(key) ?? [cx, cz];
    let x = px + (cx - px) * alpha;
    let z = pz + (cz - pz) * alpha;
    let want = Math.atan2(-o.hz, o.hx);
    let y = 0;
    let pitch = 0;
    let roll = 0;
    let geo: THREE.BufferGeometry;
    let calm = 1;
    if (tri) {
      const m = this.tri!;
      if (tri.state === 'building') {
        // On the slip under the shed: a frame, then a hull, bow to the sea.
        const yard = findBuilding(s, tri.yard);
        if (!yard) {
          d.mesh.visible = false;
          return;
        }
        const berth = berthAt(this.map, yard.x, yard.z);
        const [yx, yz] = centreOf(yard);
        const ox = berth?.ox ?? 1;
        const oz = berth?.oz ?? 0;
        x = yx + ox * 0.55 + oz * 0.8;
        z = yz + oz * 0.55 - ox * 0.8;
        want = Math.atan2(-oz, ox);
        y = this.map.heightAt(yx, yz) + 0.25;
        pitch = -0.05;
        calm = 0;
        geo = tri.work < BUILD_TICKS * 0.5 ? m.frame : m.hull;
      } else if (tri.state === 'moored') {
        geo = m.rest;
        calm = 0.4;
      } else if (tri.state === 'sinking') {
        geo = m.rest;
      } else {
        // At her foe: drawn standing off so her ram, not her whole hull, is at the ship's side (the sim has her within a ship's length).
        const e = tri.task === 'fight' ? s.fleet.ships.find((x) => x.id === tri.foe) : undefined;
        if (e) {
          const fx = e.state === 'beached' ? e.bx : e.x;
          const fz = e.state === 'beached' ? e.bz : e.z;
          const dd = Math.hypot(x - fx, z - fz);
          if (dd < STAND_OFF) {
            const ux = dd > 1e-3 ? (x - fx) / dd : -o.hx;
            const uz = dd > 1e-3 ? (z - fz) / dd : -o.hz;
            x = fx + ux * STAND_OFF;
            z = fz + uz * STAND_OFF;
            want = Math.atan2(uz, -ux);
          }
        }
        // Rowing: the stroke goes round, quicker at a fight.
        const k = Math.floor(time * (tri.task === 'fight' ? 3.2 : 2.4) + tri.id * 0.37) % 4;
        geo = m[`row${k}` as TriVersion];
      }
    } else {
      const m = this.foeModel(s.world.raids.find((r) => r.id === foe!.raid)?.city ?? 'troy');
      if (foe!.state === 'beached') {
        geo = m.beached;
        x = foe!.bx;
        z = foe!.bz;
        // Drawn up: her keel on the sand under her bow, her stern in the shallows, nose up the slope.
        const gb = this.map.heightAt(x + o.hx * 1.2, z + o.hz * 1.2);
        const gs = this.map.heightAt(x - o.hx * 1.2, z - o.hz * 1.2);
        y = Math.max(0, (Math.max(gb, -0.2) + Math.max(gs, -0.2)) / 2 + 0.2);
        pitch = clamp(Math.atan2(gb - Math.max(gs, -0.2), 2.4), 0.02, 0.16);
        calm = 0;
      } else {
        geo = Math.floor(time * 2.2 + foe!.id * 0.5) % 2 ? m.sail1 : m.sail0;
      }
    }
    // Her heading eases round (straight away the first time she shows).
    if (!d.shown) d.heading = want;
    else {
      let a = want - d.heading;
      a = Math.atan2(Math.sin(a), Math.cos(a));
      d.heading += a * (1 - Math.exp(-dt * 3));
    }
    d.shown = true;
    // Struck: she reels; a ship rammed throws up spray where the blow fell.
    const struck = tri ? tri.struck : foe!.hit;
    const since = t - struck;
    if (struck > 0 && since >= 0 && since < 8) {
      const k = 1 - since / 8;
      roll += Math.sin(since * 2.4) * 0.16 * k;
      d.spray.visible = true;
      d.spray.position.set(x, 0, z);
      d.spray.scale.setScalar(0.6 + since * 0.15);
    } else d.spray.visible = false;
    // Going under: she lists, settles and is gone.
    const sank = tri ? tri.sank : foe!.sank;
    if (o.state === 'sinking') {
      const k = clamp((t - sank) / SINK_TICKS, 0, 1);
      const side = hash2(o.id, 1, 2602) < 0.5 ? -1 : 1;
      roll += side * k * 0.85;
      pitch += (side > 0 ? 0.25 : -0.2) * k;
      y -= k * k * 1.6;
      calm = 0;
    }
    // Riding the swell.
    const p = (o.id % 7) * 0.9;
    y += Math.sin(time * 1.4 + p) * 0.03 * calm;
    roll += Math.sin(time * 1.0 + 0.6 + p) * 0.04 * calm;
    pitch += Math.sin(time * 1.2 + 1.7 + p) * 0.02 * calm;
    d.mesh.geometry = geo;
    d.mesh.position.set(x, y - 0.02, z);
    d.mesh.rotation.set(roll, d.heading, pitch, 'YXZ');
    d.mesh.visible = true;
    this.shown.push({ kind: tri ? 'trireme' : 'enemy', id: o.id, x, z, visible: true });
  }
}
