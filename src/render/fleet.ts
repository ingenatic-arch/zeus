import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { PLACES, type CityId } from '../map/greece';
import { hash2 } from '../map/noise';
import { centreOf, findBuilding } from '../sim/buildings';
import { BUILD_TICKS, CRIPPLED_OARS, SINK_TICKS } from '../sim/fleet';
// Slice 38: a blockade's ships, and the landing's marker.
import { blockadeOf } from '../sim/blockades';
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

/** A row of oars each side: `n` of them from u0 to u1 along her, swept `a` (radians, + towards the bow), the blades `dip` deep (negative: in the air); `out` how far they reach. Slice 38: `broken` of every hundred snapped off short, gaps in the row. */
function oars(h: HullShape, n: number, u0: number, u1: number, a: number, dip: number, out: number, color: string, broken = 0): Part[] {
  const parts: Part[] = [];
  for (let i = 0; i < n; i++) {
    const u = u0 + ((u1 - u0) * i) / Math.max(1, n - 1);
    const x = u * h.half;
    const y = h.sheer(u) - 0.1;
    for (const side of [1, -1]) {
      const z = (h.beam(u) + 0.06) * side;
      // (Slice 38: a broken oar: a stub at the oar port, its loom snapped off.)
      if (broken > 0 && hash2(i, side + 3, 2603) * 100 < broken) {
        parts.push(spar(v(x, y, z), v(x + Math.sin(a) * out * 0.22, y - 0.03, z + side * Math.cos(a) * out * 0.22), 0.014, color, 3));
        continue;
      }
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

type TriVersion = 'row0' | 'row1' | 'row2' | 'row3' | 'rest' | 'frame' | 'hull' | 'mend';
/** Slice 38: her oars as drawn: whole, a few broken, many, most (by how many of every hundred are whole). */
const OAR_DAMAGE = [0, 22, 45, 68] as const;
const damageOf = (oars: number): number => (oars >= 85 ? 0 : oars >= 60 ? 1 : oars >= CRIPPLED_OARS ? 2 : 3);
type FoeVersion = 'sail0' | 'sail1' | 'beached' | 'hold';

function triremeVersions(colour: string, broken = 0): Record<TriVersion, THREE.BufferGeometry> {
  const body = triremeBody(colour);
  const STROKE: Array<[number, number]> = [[-0.45, 0.06], [-0.1, 0.08], [0.3, -0.06], [0.05, -0.12]];
  const out: Partial<Record<TriVersion, THREE.BufferGeometry>> = {};
  STROKE.forEach(([a, dip], k) => {
    out[`row${k}` as TriVersion] = merge([...body, ...oars(TRI, 11, -0.62, 0.6, a, dip, 1.0, PAL.mast, broken)]);
  });
  // At rest: oars drawn in and stowed fore and aft along the outriggers.
  out.rest = merge([...body, ...oars(TRI, 11, -0.62, 0.6, 1.45, -0.32, 0.4, PAL.mast, broken)]);
  out.frame = merge(triremeFrame());
  out.hull = merge(hull(TRI, [PAL.hull, PAL.hull, PAL.hullDark, PAL.hullDark, PAL.hullDark], PAL.deck));
  // (Review of slice 38: laid up under repair, she reads as such at her mooring: oars drawn in, pale new planks let into her side, the shipwrights' staging alongside and new oars on her deck.)
  out.mend = merge([...body, ...oars(TRI, 11, -0.62, 0.6, 1.45, -0.32, 0.4, PAL.mast, broken), ...repairKit()]);
  return out as Record<TriVersion, THREE.BufferGeometry>;
}

/** Review of slice 38: a trireme under repair: new planks on her side, a staging raft with its posts alongside, new oars on deck. */
function repairKit(): Part[] {
  const parts: Part[] = [];
  const side = -1;
  const FRESH = '#e4c896';
  for (const [u, y, w] of [[-0.35, 0.18, 0.42], [-0.05, 0.08, 0.34], [0.3, 0.16, 0.38], [0.5, 0.05, 0.26]] as const) {
    parts.push({ geo: new THREE.BoxGeometry(w, 0.075, 0.03).translate(u * TRI.half, y, side * (TRI.beam(u) * 0.985 + 0.012)), color: FRESH });
  }
  // The staging: a raft of planks at the waterline beside her, two posts and a rail.
  const z = side * (TRI.beam(0) + 0.42);
  parts.push({ geo: new THREE.BoxGeometry(1.5, 0.07, 0.34).translate(-0.05, 0.11, z), color: FRESH });
  for (const x of [-0.7, 0.6]) parts.push(spar(v(x, -0.1, z + side * 0.1), v(x, 0.62, z + side * 0.1), 0.025, PAL.woodDark));
  parts.push(spar(v(-0.7, 0.55, z + side * 0.1), v(0.6, 0.55, z + side * 0.1), 0.02, PAL.woodDark));
  // New oars laid along her deck.
  for (let i = 0; i < 3; i++) parts.push(spar(v(-0.9, TRI.sheer(0) + 0.03, -0.12 + i * 0.09), v(0.7, TRI.sheer(0) + 0.03, -0.1 + i * 0.09), 0.016, FRESH));
  return parts;
}

function foeVersions(colour: string): Record<FoeVersion, THREE.BufferGeometry> {
  const body = foeBody(colour);
  const dark = '#3a3330';
  return {
    sail0: merge([...body, ...rig(0.1, 2.2, 0.85, dark, colour, true), ...oars(FOE, 7, -0.55, 0.5, -0.35, 0.06, 0.85, PAL.hullDark)]),
    sail1: merge([...body, ...rig(0.1, 2.2, 0.85, dark, colour, true), ...oars(FOE, 7, -0.55, 0.5, 0.25, -0.08, 0.85, PAL.hullDark)]),
    beached: merge([...body, ...rig(0.1, 2.2, 0.85, dark, colour, false)]),
    // (Review of slice 38: on station across your harbour's mouth, her sail in her city's colours set and her oars shipped, so the fleet reads as whose it is from over the town.)
    hold: merge([...body, ...rig(0.1, 2.2, 0.85, dark, colour, true)]),
  };
}

/** Slice 38: the landing's marker: a pole planted in the sand with a red pennant and a white band, about a man and a half tall. */
function markerModel(): THREE.BufferGeometry {
  const parts: Part[] = [spar(v(0, 0, 0), v(0, 1.7, 0), 0.035, PAL.mast, 5)];
  const flag = new THREE.BufferGeometry();
  flag.setAttribute('position', new THREE.Float32BufferAttribute([0, 1.68, 0, 0.75, 1.5, 0, 0, 1.3, 0], 3));
  parts.push({ geo: flag, color: '#b3261e' });
  parts.push({ geo: cyl(0.05, 0.05, 0.08, 6).translate(0, 1.15, 0), color: '#efe6d6' });
  // A little cairn of stones at its foot.
  for (let i = 0; i < 4; i++) parts.push({ geo: new THREE.IcosahedronGeometry(0.1, 0).translate(Math.cos(i * 1.6) * 0.12, 0.05, Math.sin(i * 1.6) * 0.12), color: '#8d8478' });
  return merge(parts);
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
  /** A trireme at her foe: the side of the foe she is drawn on (an angle round her), and which foe. */
  aim: number | null;
  aimFoe: number;
}

/** An angle wrapped into (-pi, pi]. */
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));

export class FleetView {
  readonly group = new THREE.Group();
  private readonly mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8, metalness: 0, side: THREE.DoubleSide });
  private readonly sprayMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0, transparent: true, opacity: 0.85 });
  private readonly spray = sprayModel();
  private tri: Record<TriVersion, THREE.BufferGeometry> | null = null;
  /** Slice 38: her versions with oars broken (by OAR_DAMAGE, the first whole), made as first wanted. */
  private triHurt: Array<Record<TriVersion, THREE.BufferGeometry> | null> = [null, null, null, null];
  /** Slice 38: the pole and red pennant on the beach a band from the sea makes for, while its ships sail in. */
  private readonly marker = new THREE.Mesh(markerModel(), this.mat);
  private readonly foes = new Map<string, Record<FoeVersion, THREE.BufferGeometry>>();
  private readonly drawn = new Map<string, Drawn>();
  /** Where each ship was at the last tick and this one (to draw between them). */
  private prev = new Map<string, [number, number]>();
  private cur = new Map<string, [number, number]>();
  /** Where each was drawn last (a trireme at her foe stands off from where the sim has her). */
  private last = new Map<string, [number, number]>();
  private tick = -1;
  private lastTime = 0;
  /** For the probes and the hovers. */
  shown: FleetShown[] = [];

  constructor(private readonly map: CoastMap) {
    this.group.name = 'fleet';
    this.marker.name = 'fleet-landing';
    this.marker.visible = false;
    this.marker.castShadow = true;
    this.group.add(this.marker);
  }

  /** Slice 38: her versions for her oars now. */
  private triFor(t: Trireme): Record<TriVersion, THREE.BufferGeometry> {
    const k = damageOf(t.oars);
    if (k === 0) return this.tri!;
    return (this.triHurt[k] ??= triremeVersions(PLACES.home.colour, OAR_DAMAGE[k]));
  }

  /** Slice 38: whose an enemy ship is (her band's city, or her blockade's). */
  private cityOf(s: SimState, e: EnemyShip): CityId {
    if (e.blockade) return blockadeOf(s, e.blockade)?.city ?? 'troy';
    return s.world.raids.find((r) => r.id === e.raid)?.city ?? 'troy';
  }

  /** Slice 38: the landing's marker: on the beach the "Sails!" line names, while a band's ships sail in to it. */
  private placeMarker(s: SimState, time: number): void {
    let at: [number, number] | null = null;
    for (const r of s.world.raids) {
      if (r.phase !== 'raiding' || r.shore < 0 || r.landed > 0 || r.end !== '') continue;
      if (!s.fleet.ships.some((e) => e.raid === r.id && e.state === 'sailing' && s.tick >= e.from)) continue;
      const n = this.map.size;
      at = [(r.shore % n) + 0.5, Math.floor(r.shore / n) + 0.5];
      break;
    }
    this.marker.visible = !!at;
    if (!at) return;
    this.marker.position.set(at[0], Math.max(0, this.map.heightAt(at[0], at[1])), at[1]);
    this.marker.rotation.set(0, Math.sin(time * 0.7) * 0.25, 0);
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
    d = { mesh, spray, heading: 0, shown: false, aim: null, aimFoe: 0 };
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
    this.placeMarker(s, time);
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

  /**
   * How much room a trireme standing off her foe at (fx, fz) has on the side
   * at angle a: the least distance from her hull (ram, middle and stern) to
   * any other ship drawn, her foe and herself left out.
   */
  private room(self: string, foe: string, fx: number, fz: number, a: number): number {
    const ux = Math.cos(a);
    const uz = Math.sin(a);
    let least = Infinity;
    for (const [key, [ox, oz]] of this.last) {
      if (key === self || key === foe || !this.drawn.get(key)?.mesh.visible) continue;
      for (const k of [0.55, 1, 1.6]) least = Math.min(least, Math.hypot(fx + ux * STAND_OFF * k - ox, fz + uz * STAND_OFF * k - oz));
    }
    return least;
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
      const m = this.triFor(tri);
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
        // (Review of slice 38: under repair, her staging alongside and a slight list towards it.)
        geo = tri.mend ? m.mend : m.rest;
        if (tri.mend) roll -= 0.06;
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
            // Of the two sides of her foe, the one clear of other hulls (a ship going down beside her, the other trireme), kept unless the other is much clearer; she rows round to it. Review of slice 26: she was drawn across a sinking ship.
            const base = dd > 1e-3 ? Math.atan2(z - fz, x - fx) : Math.atan2(-o.hz, -o.hx);
            const other = base + Math.PI;
            const room = (a: number): number => this.room(key, `e${e.id}`, fx, fz, a);
            if (d.aim === null || d.aimFoe !== e.id) {
              d.aim = base;
              d.aimFoe = e.id;
            }
            const near = Math.abs(wrap(d.aim - base)) <= Math.PI / 2 ? base : other;
            const far = near === base ? other : base;
            const goal = room(far) > room(near) + 1 ? far : near;
            d.aim = wrap(d.aim + wrap(goal - d.aim) * (1 - Math.exp(-dt * 2.5)));
            const ux = Math.cos(d.aim);
            const uz = Math.sin(d.aim);
            x = fx + ux * STAND_OFF;
            z = fz + uz * STAND_OFF;
            want = Math.atan2(uz, -ux);
          } else d.aim = null;
        } else d.aim = null;
        // Rowing: the stroke goes round, quicker at a fight.
        const k = Math.floor(time * (tri.task === 'fight' ? 3.2 : 2.4) + tri.id * 0.37) % 4;
        geo = m[`row${k}` as TriVersion];
        // (Slice 38: limping home, her oars broken or her hull holed, she lists a little.)
        if (tri.task === 'home' && (tri.oars < CRIPPLED_OARS || tri.hp < 35)) roll += 0.09 * (hash2(tri.id, 2, 2604) < 0.5 ? -1 : 1);
      }
    } else {
      const m = this.foeModel(this.cityOf(s, foe!));
      if (foe!.state === 'holding') {
        // (Slice 38: a blockade's ship on station across the harbour's mouth, riding there: review of slice 38, her sail set in her colours, as furled she read as a plain hull from over the town.)
        geo = m.hold;
        calm = 1.3;
      } else if (foe!.state === 'beached') {
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
    this.last.set(key, [x, z]);
    this.shown.push({ kind: tri ? 'trireme' : 'enemy', id: o.id, x, z, visible: true });
  }
}
