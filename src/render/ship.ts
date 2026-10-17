import * as THREE from 'three';
import { hash2 } from '../map/noise';
import type { SimState } from '../sim/state';
import { leaveTicks, shipAt, SHIP_COMING, SHIP_LEAVING, SHIP_MOORED } from '../sim/trade';
import { cyl } from './homes';
import { PAL } from './palette';
import { lumpy, merge, type Part } from './trees';

/**
 * The merchant ship: a round-bellied trader with a curling stern post, eyes
 * at her bow, a steering oar each side and one square sail, striped. One
 * merged mesh, in four versions swapped as she goes (sail set or furled,
 * empty or laden); her way in, her mooring and her way out are the sim's
 * (shipAt), drawn between ticks, her heading eased round the corners of her
 * route, and she rides the swell a little.
 *
 * Local frame: her bow towards +x, the waterline at y = 0.
 */

const L = 3.8;
const HALF = L / 2;
/** Half her beam, the top of her side and her keel at a point along her (u from -1, the stern, to 1, the bow). */
const beam = (u: number): number => 0.66 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), u < 0 ? 1.8 : 2.2)), 0.55);
const sheer = (u: number): number => 0.42 + 0.2 * u * u + (u < 0 ? 0.08 * u * u : 0);
const keel = (u: number): number => -0.3 * Math.sqrt(Math.max(0, 1 - u * u)) - 0.02;

/** The hull in bands, each its own colour: the pale wale under the gunwale, the hull, a blue band at the waterline, the dark bottom. */
function hullParts(): Part[] {
  const N = 16;
  // A section's points from the gunwale down to the keel (half of it: z >= 0), and the band each stretch belongs to.
  const section = (u: number): Array<[number, number]> => {
    const b = beam(u);
    const s = sheer(u);
    const k = keel(u);
    return [
      [b * 0.94, s],
      [b, s - 0.11],
      [b * 0.99, 0.24],
      [b * 0.95, 0.11],
      [b * 0.62, k * 0.72],
      [0, k],
    ];
  };
  const colours = [PAL.wale, PAL.hull, PAL.hullBand, PAL.hullDark, PAL.hullDark];
  const bands: number[][] = colours.map(() => []);
  for (let i = 0; i < N; i++) {
    const u0 = -1 + (2 * i) / N;
    const u1 = -1 + (2 * (i + 1)) / N;
    const x0 = u0 * HALF;
    const x1 = u1 * HALF;
    const a = section(u0);
    const b = section(u1);
    for (let k = 0; k < colours.length; k++) {
      for (const side of [1, -1]) {
        const p = (x: number, pt: [number, number]): number[] => [x, pt[1], pt[0] * side];
        const A = p(x0, a[k]);
        const B = p(x1, b[k]);
        const C = p(x1, b[k + 1]);
        const D = p(x0, a[k + 1]);
        bands[k].push(...A, ...B, ...C, ...A, ...C, ...D);
      }
    }
  }
  const parts: Part[] = bands.map((pos, k) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return { geo: g, color: colours[k] };
  });
  // The deck, a little below the gunwale.
  const deck: number[] = [];
  for (let i = 0; i < N; i++) {
    const u0 = -1 + (2 * i) / N;
    const u1 = -1 + (2 * (i + 1)) / N;
    const y0 = sheer(u0) - 0.1;
    const y1 = sheer(u1) - 0.1;
    const b0 = beam(u0) * 0.92;
    const b1 = beam(u1) * 0.92;
    deck.push(u0 * HALF, y0, -b0, u1 * HALF, y1, -b1, u1 * HALF, y1, b1, u0 * HALF, y0, -b0, u1 * HALF, y1, b1, u0 * HALF, y0, b0);
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.Float32BufferAttribute(deck, 3));
  parts.push({ geo: dg, color: PAL.deck });
  return parts;
}

/** A spar or line from a to b, radius r. */
function spar(a: THREE.Vector3, b: THREE.Vector3, r: number, color: string, seg = 5): Part {
  const d = new THREE.Vector3().subVectors(b, a);
  const g = cyl(r, r, d.length(), seg);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return { geo: g, color };
}
const v = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

const MAST_X = 0.25;
const MAST_TOP = 2.95;
const YARD_Y = 2.72;
const YARD_HALF = 1.2;
const SAIL_FOOT = 0.95;

/** The square sail, set: hanging from the yard and bellied forward by the wind, in stripes. */
function sailParts(): Part[] {
  const cols = 7;
  const rows = 5;
  const parts: Part[] = [];
  const at = (c: number, r: number): number[] => {
    const w = -1 + (2 * c) / cols;
    const h = r / rows;
    const z = w * (YARD_HALF - 0.08) * (1 - 0.06 * h);
    const y = YARD_Y - 0.06 - h * (YARD_Y - 0.06 - SAIL_FOOT);
    const x = MAST_X + 0.08 + 0.36 * Math.sin(Math.PI * Math.min(1, h * 1.05)) * Math.cos((w * Math.PI) / 2.4) * (0.4 + 0.6 * h);
    return [x, y, z];
  };
  for (let c = 0; c < cols; c++) {
    const pos: number[] = [];
    for (let r = 0; r < rows; r++) {
      const A = at(c, r);
      const B = at(c + 1, r);
      const C = at(c + 1, r + 1);
      const D = at(c, r + 1);
      pos.push(...A, ...B, ...C, ...A, ...C, ...D);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    parts.push({ geo: g, color: c % 2 === 1 ? PAL.sailStripe : PAL.sailCream });
  }
  // The sheets from the sail's lower corners back to the gunwale.
  for (const side of [-1, 1]) parts.push(spar(v(...(at(side < 0 ? 0 : cols, rows) as [number, number, number])), v(-0.9, sheer(-0.47) - 0.02, side * beam(-0.47) * 0.9), 0.008, PAL.rope, 3));
  return parts;
}

/** The sail furled: bundled up under the yard, lashed. */
function furledParts(): Part[] {
  const parts: Part[] = [];
  parts.push(spar(v(MAST_X + 0.05, YARD_Y - 0.12, -YARD_HALF + 0.12), v(MAST_X + 0.05, YARD_Y - 0.12, YARD_HALF - 0.12), 0.085, PAL.sailCream, 7));
  for (let k = 0; k < 5; k++) {
    const z = -YARD_HALF + 0.3 + (k * (2 * YARD_HALF - 0.6)) / 4;
    parts.push({ geo: cyl(0.092, 0.092, 0.04, 7).rotateX(Math.PI / 2).translate(MAST_X + 0.05, YARD_Y - 0.12, z), color: k % 2 ? PAL.sailStripe : PAL.rope });
  }
  return parts;
}

/** Cargo stowed on her deck: sacks, bales and amphorae, roped down. */
function cargoParts(): Part[] {
  const parts: Part[] = [];
  const deckY = (x: number): number => sheer(x / HALF) - 0.1;
  for (let i = 0; i < 14; i++) {
    const x = -0.9 + (i % 7) * 0.28 + (i >= 7 ? 0.12 : 0);
    if (Math.abs(x - MAST_X) < 0.12) continue;
    const z = (i >= 7 ? 1 : -1) * (0.2 + 0.08 * hash2(i, 1, 1371));
    const kind = i % 3;
    if (kind === 0) parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.13, 0), 0.18, 1372 + i).scale(1.2, 0.8, 0.9).translate(x, deckY(x) + 0.09, z), color: PAL.sack });
    else if (kind === 1) parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.12, 0), 0.22, 1390 + i).scale(1.25, 0.72, 1).translate(x, deckY(x) + 0.08, z), color: PAL.wool });
    else {
      const pts = [v(0, 0, 0), v(0.03, 0.01, 0), v(0.075, 0.1, 0), v(0.065, 0.2, 0), v(0.03, 0.25, 0), v(0.035, 0.29, 0)].map((p) => new THREE.Vector2(p.x, p.y));
      parts.push({ geo: new THREE.LatheGeometry(pts, 6).translate(x, deckY(x), z), color: PAL.amphora });
    }
  }
  return parts;
}

/** The fixed parts: hull, stern post and stem, eyes, steering oars, the little deckhouse, mast, yard and rigging, and her pennant. */
function shipBody(): Part[] {
  const parts = hullParts();
  // The stern post, curling up and forward like a swan's neck.
  const neck = [v(-HALF + 0.02, sheer(-1) - 0.05, 0), v(-HALF - 0.12, sheer(-1) + 0.2, 0), v(-HALF - 0.16, sheer(-1) + 0.48, 0), v(-HALF - 0.06, sheer(-1) + 0.7, 0), v(-HALF + 0.1, sheer(-1) + 0.76, 0), v(-HALF + 0.2, sheer(-1) + 0.68, 0)];
  for (let i = 0; i + 1 < neck.length; i++) parts.push(spar(neck[i], neck[i + 1], 0.055 - i * 0.006, PAL.hullDark, 5));
  // The stem: a cutwater at the bow, rising a little above the gunwale.
  parts.push(spar(v(HALF - 0.12, -0.12, 0), v(HALF + 0.1, sheer(1) + 0.08, 0), 0.04, PAL.hullDark, 5));
  // Eyes either side of the bow.
  const eu = 0.8;
  const ex = eu * HALF;
  const ez = beam(eu) * 0.99 + 0.012;
  for (const side of [1, -1]) {
    const eye = new THREE.CircleGeometry(0.075, 8).scale(1.4, 1, 1);
    const pupil = new THREE.CircleGeometry(0.035, 6);
    const yaw = side > 0 ? 0 : Math.PI;
    eye.rotateY(yaw - 0.35 * side).translate(ex, 0.3, ez * side);
    pupil.rotateY(yaw - 0.35 * side).translate(ex + 0.02, 0.3, (ez + 0.006) * side);
    parts.push({ geo: eye, color: PAL.eye }, { geo: pupil, color: PAL.hullDark });
  }
  // The steering oars, one each side of the stern, their blades in the water.
  for (const side of [1, -1]) {
    parts.push(spar(v(-1.35, sheer(-0.7) + 0.12, side * 0.5), v(-2.0, -0.3, side * 0.62), 0.026, PAL.mast, 5));
    parts.push({ geo: new THREE.BoxGeometry(0.34, 0.03, 0.14).rotateZ(0.95).translate(-1.93, -0.2, side * 0.61), color: PAL.mast });
  }
  // A small deckhouse at the stern, and a ladder of thwarts amidships.
  const dy = sheer(-0.65) - 0.1;
  parts.push({ geo: new THREE.BoxGeometry(0.46, 0.26, 0.56).translate(-1.2, dy + 0.13, 0), color: PAL.wale });
  parts.push({ geo: new THREE.BoxGeometry(0.54, 0.05, 0.66).translate(-1.2, dy + 0.29, 0), color: PAL.hull });
  for (const x of [-0.45, 0.85, 1.25]) parts.push({ geo: new THREE.BoxGeometry(0.06, 0.04, beam(x / HALF) * 1.8).translate(x, sheer(x / HALF) - 0.06, 0), color: PAL.mast });
  // Mast, yard, stays.
  parts.push(spar(v(MAST_X, 0.2, 0), v(MAST_X, MAST_TOP, 0), 0.05, PAL.mast, 6));
  parts.push(spar(v(MAST_X + 0.05, YARD_Y, -YARD_HALF), v(MAST_X + 0.05, YARD_Y, YARD_HALF), 0.035, PAL.mast, 5));
  parts.push(spar(v(MAST_X, MAST_TOP - 0.1, 0), v(HALF + 0.08, sheer(1) + 0.12, 0), 0.01, PAL.rope, 3));
  parts.push(spar(v(MAST_X, MAST_TOP - 0.1, 0), v(-HALF + 0.15, sheer(-1) + 0.05, 0), 0.01, PAL.rope, 3));
  for (const side of [1, -1]) parts.push(spar(v(MAST_X, MAST_TOP - 0.25, 0), v(MAST_X - 0.15, sheer(0.07) - 0.02, side * beam(0.07) * 0.95), 0.008, PAL.rope, 3));
  // Her pennant at the masthead.
  const flag = new THREE.BufferGeometry().setFromPoints([v(0, 0, 0), v(-0.55, -0.06, 0), v(0, -0.16, 0)]);
  parts.push({ geo: flag.translate(MAST_X, MAST_TOP + 0.02, 0), color: PAL.sailStripe });
  return parts;
}

type Version = 'set' | 'setLaden' | 'furled' | 'furledLaden';

export class ShipView {
  readonly group = new THREE.Group();
  private readonly mesh: THREE.Mesh;
  private readonly versions: Record<Version, THREE.BufferGeometry>;
  private heading = 0;
  private shown = false;
  private lastTime = 0;
  /** For the probes: what is drawn now. */
  info: { visible: boolean; x: number; z: number; heading: number; version: Version } = { visible: false, x: 0, z: 0, heading: 0, version: 'set' };

  constructor() {
    this.group.name = 'ship';
    const body = shipBody();
    const sail = sailParts();
    const furled = furledParts();
    const cargo = cargoParts();
    this.versions = {
      set: merge([...body, ...sail]),
      setLaden: merge([...body, ...sail, ...cargo]),
      furled: merge([...body, ...furled]),
      furledLaden: merge([...body, ...furled, ...cargo]),
    };
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8, metalness: 0, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(this.versions.set, mat);
    this.mesh.name = 'ship-mesh';
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.visible = false;
    this.group.add(this.mesh);
  }

  update(s: SimState, alpha: number, time: number): void {
    const ship = s.trade.ship;
    const t = s.tick + alpha;
    const at = shipAt(ship, t);
    const dt = Math.max(0, Math.min(0.25, time - this.lastTime));
    this.lastTime = time;
    if (!at) {
      this.mesh.visible = false;
      this.shown = false;
      this.info.visible = false;
      return;
    }
    // Her heading eases round the corners of her route (and swings her round at the quay to leave).
    const want = Math.atan2(-at.dz, at.dx);
    if (!this.shown) this.heading = want;
    else {
      let d = want - this.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.heading += d * (1 - Math.exp(-dt * 2.2));
    }
    this.shown = true;
    // Sail set at sea, furled for the last of her way in, tied up and the first of her way out.
    let furled = false;
    let laden = false;
    if (ship.phase === SHIP_COMING) furled = at.inward > 0.985;
    else if (ship.phase === SHIP_MOORED) {
      furled = true;
      laden = ship.hold.some((n) => n > 0);
    } else if (ship.phase === SHIP_LEAVING) {
      furled = t - ship.since < leaveTicks(ship) * 0.05;
      laden = ship.lastAt === ship.since && ship.lastBought.some((n) => n > 0);
    }
    const version: Version = furled ? (laden ? 'furledLaden' : 'furled') : laden ? 'setLaden' : 'set';
    this.mesh.geometry = this.versions[version];
    // Riding the swell: a slow bob, roll and pitch (less tied up).
    const calm = ship.phase === SHIP_MOORED ? 0.5 : 1;
    const bob = Math.sin(time * 1.3) * 0.035 * calm;
    const roll = Math.sin(time * 0.9 + 0.7) * 0.035 * calm;
    const pitch = Math.sin(time * 1.1 + 1.9) * 0.02 * calm;
    this.mesh.position.set(at.x, bob - 0.02, at.z);
    this.mesh.rotation.set(roll, this.heading, pitch, 'YXZ');
    this.mesh.visible = true;
    this.info = { visible: true, x: at.x, z: at.z, heading: this.heading, version };
  }
}
