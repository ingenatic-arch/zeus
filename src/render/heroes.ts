/**
 * Slice 59: the heroes, drawn. Their halls, the heroes themselves, the
 * places of legend where they slew a monster, and the city's fête.
 *
 * - **A hall** (4 x 4, its gate to the road): a paved courtyard inside a low
 *   wall, the megaron at the back (porch columns, a tiled gable roof), a
 *   bronze statue of its hero on a pedestal, a tripod of trophies, and a
 *   banner in the hero's colour either side of the gate. Each hero's hall is
 *   built from the same shapes with their own statue and colour.
 * - **A hero**: a figure about twice a citizen's height (HERO_TALL), with a
 *   gold ring on the ground under them, each with their own marks (Heracles'
 *   lion skin and club, Perseus' winged cap and the Gorgon shield, Theseus'
 *   sword and red cloak, Odysseus' cap and bow, Bellerophon riding winged
 *   Pegasus, Jason's golden fleece, Atalanta's bow and quiver). They walk
 *   (legs swinging), stand breathing, and fight: a blow every few ticks,
 *   from the `swung` the sim keeps.
 * - **A place of legend**: a marble stele with a gold crown and a bronze
 *   tripod before a slain monster's lair (the lair stays: MonstersView).
 * - **The fête**: while it lasts, a ring of townsfolk dancing round the
 *   hall of the hero who slew the monster, garlands on its gate.
 *
 * It only reads the state.
 */
import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { hash2 } from '../map/noise';
import { centreOf, findBuilding } from '../sim/buildings';
import { heroShown, HERO_TALL, type Champion } from '../sim/heroes';
import type { HeroId } from '../sim/pantheon';
import type { Building, SimState } from '../sim/state';
import { column, gable, slab } from './grand';
import { cyl, facingOf, prism } from './homes';
import { col, PAL } from './palette';
import { merge, type Part } from './trees';

// ---------------------------------------------------------------------------- the heroes' marks

/** Each hero's colour: their banners, their cloak. */
export const HERO_COLOURS: Record<HeroId, string> = {
  heracles: '#c99a3c',
  perseus: '#3f6fae',
  theseus: '#b4382c',
  odysseus: '#2f7068',
  bellerophon: '#e9e2cf',
  jason: '#7b3f99',
  atalanta: '#4f8d3b',
};

const TUNIC = '#efe6d2';
const LION = '#c89a52';
const LION_DARK = '#8f6630';
const FLEECE_GOLD = '#f0c445';
const STEEL = '#c9c6bc';

/** A figure's pieces, standing at the origin facing +x, HERO_TALL tall: what moves (legs, the weapon arm) apart from the rest. */
interface Pieces {
  body: Part[];
  legL: Part[];
  legR: Part[];
  /** The arm that strikes (its weapon in hand), hanging from the shoulder at (0, SHOULDER, -0.1). */
  arm: Part[];
  /** Pegasus' wings (Bellerophon), each hanging from its root on the horse's back. */
  wingL: Part[];
  wingR: Part[];
  /** Mounted: the rider's legs are part of the body, the horse's legs swing instead. */
  mounted: boolean;
}

const HIP = 0.25;
const SHOULDER = 0.41;
const box = (x: number, y: number, z: number): THREE.BufferGeometry => new THREE.BoxGeometry(x, y, z);
const ball = (r: number, d = 1): THREE.BufferGeometry => new THREE.IcosahedronGeometry(r, d);

/** A man on foot: legs, a tunic, a cloak in his colour, a head; then each hero's marks. */
function heroPieces(h: HeroId): Pieces {
  const c = HERO_COLOURS[h];
  const p: Pieces = { body: [], legL: [], legR: [], arm: [], wingL: [], wingR: [], mounted: h === 'bellerophon' };
  if (p.mounted) return pegasus(p, c);
  const woman = h === 'atalanta';
  // (Heracles wears the lion's skin over all; Atalanta a huntress' green.)
  const tunic = woman ? '#7aa35a' : h === 'heracles' ? LION : TUNIC;
  // Legs (bare, sandalled), hanging from the hips.
  for (const [arr, z] of [[p.legL, 0.045], [p.legR, -0.045]] as const) {
    arr.push({ geo: cyl(0.026, 0.022, HIP - 0.02, 5).translate(0, -(HIP - 0.02) / 2 - 0.02, 0), color: PAL.skin });
    arr.push({ geo: box(0.07, 0.025, 0.045).translate(0.012, -HIP + 0.012, 0), color: PAL.woodDark });
    void z;
  }
  // The tunic (short: a hero's), a belt, the chest; the head and hair.
  p.body.push({ geo: cyl(0.075, 0.095, 0.1, 7).translate(0, HIP + 0.02, 0), color: tunic });
  p.body.push({ geo: box(0.12, 0.13, 0.17).translate(0, HIP + 0.12, 0), color: tunic });
  p.body.push({ geo: cyl(0.088, 0.088, 0.02, 7).translate(0, HIP + 0.07, 0), color: PAL.woodDark });
  p.body.push({ geo: cyl(0.025, 0.03, 0.04, 5).translate(0, SHOULDER + 0.02, 0), color: PAL.skin });
  p.body.push({ geo: ball(0.048).translate(0.005, SHOULDER + 0.08, 0), color: PAL.skin });
  p.body.push({ geo: ball(0.05).scale(1, 0.75, 1).translate(-0.012, SHOULDER + 0.1, 0), color: woman ? '#7a4a22' : PAL.hair });
  if (woman) p.body.push({ geo: cyl(0.018, 0.008, 0.12, 4).rotateZ(-0.5).translate(-0.06, SHOULDER + 0.04, 0), color: '#7a4a22' });
  // The cloak in their colour, down the back from the shoulders.
  p.body.push({ geo: box(0.025, 0.22, 0.2).rotateZ(-0.1).translate(-0.075, SHOULDER - 0.08, 0), color: c });
  // The other arm, at the side.
  p.body.push({ geo: cyl(0.022, 0.02, 0.17, 5).rotateX(0.15).translate(0, SHOULDER - 0.08, 0.11), color: PAL.skin });
  // The striking arm, hanging from its shoulder (local origin at the shoulder), and what it holds.
  p.arm.push({ geo: cyl(0.022, 0.02, 0.17, 5).translate(0, -0.085, 0), color: PAL.skin });
  switch (h) {
    case 'heracles':
      // The Nemean lion's skin over his head and down his back; the club in his hand.
      p.body.push({ geo: ball(0.062).scale(1.1, 0.7, 1).translate(-0.01, SHOULDER + 0.115, 0), color: LION });
      p.body.push({ geo: box(0.03, 0.26, 0.22).rotateZ(-0.08).translate(-0.085, SHOULDER - 0.06, 0), color: LION });
      p.body.push({ geo: box(0.07, 0.04, 0.06).translate(0.06, SHOULDER + 0.13, 0), color: LION_DARK });
      p.arm.push({ geo: cyl(0.024, 0.055, 0.36, 6).rotateZ(-1.0).translate(0.14, -0.12, 0), color: '#6a4528' });
      break;
    case 'perseus':
      // The winged cap, the curved sword, the shield with the Gorgon's head on its face.
      p.body.push({ geo: ball(0.054).scale(1, 0.6, 1).translate(0, SHOULDER + 0.11, 0), color: PAL.bronze });
      for (const z of [0.05, -0.05]) p.body.push({ geo: box(0.06, 0.035, 0.008).rotateX(z > 0 ? -0.5 : 0.5).translate(-0.02, SHOULDER + 0.13, z), color: '#ffffff' });
      p.body.push({ geo: cyl(0.085, 0.085, 0.02, 10).rotateX(Math.PI / 2).translate(0.03, SHOULDER - 0.07, 0.135), color: PAL.bronze });
      p.body.push({ geo: ball(0.035, 0).scale(1, 1, 0.5).translate(0.03, SHOULDER - 0.07, 0.15), color: '#5a7a4a' });
      p.arm.push({ geo: box(0.2, 0.018, 0.012).translate(0.1, -0.17, 0), color: STEEL });
      p.arm.push({ geo: box(0.05, 0.018, 0.012).rotateZ(0.9).translate(0.205, -0.15, 0), color: STEEL });
      break;
    case 'theseus':
      // A crested helmet, the sword of his father.
      p.body.push({ geo: ball(0.055).scale(1, 0.7, 1).translate(0, SHOULDER + 0.105, 0), color: PAL.bronze });
      p.body.push({ geo: box(0.12, 0.04, 0.012).translate(-0.01, SHOULDER + 0.155, 0), color: c });
      p.arm.push({ geo: box(0.22, 0.02, 0.014).translate(0.11, -0.17, 0), color: STEEL });
      p.arm.push({ geo: box(0.02, 0.012, 0.07).translate(0.0, -0.17, 0), color: PAL.bronze });
      break;
    case 'odysseus':
      // The sailor's felt cap, a beard, the great bow.
      p.body.push({ geo: new THREE.ConeGeometry(0.05, 0.07, 6).translate(0, SHOULDER + 0.14, 0), color: '#8b6a44' });
      p.body.push({ geo: ball(0.03, 0).translate(0.04, SHOULDER + 0.05, 0), color: PAL.hair });
      p.body.push({ geo: new THREE.TorusGeometry(0.15, 0.01, 4, 10, Math.PI * 0.9).rotateZ(Math.PI / 2 - 0.45).translate(0.04, SHOULDER - 0.07, 0.13), color: PAL.woodDark });
      p.arm.push({ geo: box(0.2, 0.012, 0.012).translate(0.1, -0.17, 0), color: PAL.wood });
      break;
    case 'jason':
      // The golden fleece over his shoulder, a spear.
      p.body.push({ geo: box(0.14, 0.09, 0.2).rotateX(0.35).translate(-0.01, SHOULDER - 0.01, 0.02), color: FLEECE_GOLD });
      p.arm.push({ geo: cyl(0.009, 0.009, 0.5, 4).rotateZ(Math.PI / 2 - 0.25).translate(0.1, -0.17, 0), color: PAL.wood });
      p.arm.push({ geo: new THREE.ConeGeometry(0.02, 0.06, 4).rotateZ(-Math.PI / 2 + 0.25).translate(0.35, -0.11, 0), color: STEEL });
      break;
    case 'atalanta':
      // A quiver on her back, a hunting spear.
      p.body.push({ geo: cyl(0.025, 0.025, 0.18, 5).rotateZ(0.35).translate(-0.08, SHOULDER - 0.05, -0.03), color: PAL.woodDark });
      p.arm.push({ geo: cyl(0.008, 0.008, 0.44, 4).rotateZ(Math.PI / 2 - 0.2).translate(0.08, -0.17, 0), color: PAL.wood });
      p.arm.push({ geo: new THREE.ConeGeometry(0.018, 0.055, 4).rotateZ(-Math.PI / 2 + 0.2).translate(0.3, -0.12, 0), color: STEEL });
      break;
  }
  return p;
}

/** Bellerophon on Pegasus: a white winged horse, the rider on its back with his spear. */
function pegasus(p: Pieces, c: string): Pieces {
  const white = '#f4f1ea';
  const shade = '#d9d3c6';
  const back = 0.28;
  p.body.push({ geo: box(0.3, 0.12, 0.11).translate(0, back, 0), color: white });
  p.body.push({ geo: box(0.08, 0.14, 0.08).rotateZ(-0.6).translate(0.17, back + 0.08, 0), color: white });
  p.body.push({ geo: box(0.1, 0.05, 0.06).rotateZ(-0.3).translate(0.24, back + 0.15, 0), color: white });
  p.body.push({ geo: box(0.03, 0.1, 0.02).rotateZ(-0.6).translate(0.15, back + 0.12, 0), color: shade });
  p.body.push({ geo: cyl(0.015, 0.03, 0.14, 4).rotateZ(1.0).translate(-0.19, back - 0.01, 0), color: shade });
  // Its legs swing as a pair each side.
  for (const [arr, x] of [[p.legL, 0.11], [p.legR, -0.11]] as const) {
    for (const z of [0.035, -0.035]) arr.push({ geo: cyl(0.018, 0.014, back - 0.03, 4).translate(x, -(back - 0.03) / 2, z), color: z > 0 ? white : shade });
  }
  // Its wings from its back (each local origin at its root).
  for (const [arr, s] of [[p.wingL, 1], [p.wingR, -1]] as const) {
    arr.push({ geo: box(0.16, 0.012, 0.22).translate(0.0, 0, s * 0.11), color: white });
    arr.push({ geo: box(0.1, 0.012, 0.14).translate(-0.04, 0.005, s * 0.27), color: shade });
  }
  // The rider: tunic, cloak, crested helmet; his legs either side of the horse.
  const seat = back + 0.06;
  for (const z of [0.06, -0.06]) p.body.push({ geo: cyl(0.02, 0.018, 0.13, 5).rotateX(z > 0 ? -0.35 : 0.35).translate(0.01, seat - 0.06, z), color: PAL.skin });
  p.body.push({ geo: box(0.1, 0.13, 0.13).translate(-0.01, seat + 0.07, 0), color: TUNIC });
  p.body.push({ geo: box(0.02, 0.16, 0.16).rotateZ(-0.2).translate(-0.07, seat + 0.05, 0), color: c === '#e9e2cf' ? '#5d7fb5' : c });
  p.body.push({ geo: ball(0.042).translate(0, seat + 0.18, 0), color: PAL.skin });
  p.body.push({ geo: ball(0.046).scale(1, 0.7, 1).translate(-0.005, seat + 0.2, 0), color: PAL.bronze });
  p.body.push({ geo: box(0.1, 0.035, 0.01).translate(-0.01, seat + 0.245, 0), color: '#5d7fb5' });
  p.arm.push({ geo: cyl(0.02, 0.018, 0.13, 5).translate(0, -0.065, 0), color: PAL.skin });
  p.arm.push({ geo: cyl(0.008, 0.008, 0.5, 4).rotateZ(Math.PI / 2 - 0.15).translate(0.1, -0.13, 0), color: PAL.wood });
  p.arm.push({ geo: new THREE.ConeGeometry(0.018, 0.05, 4).rotateZ(-Math.PI / 2 + 0.15).translate(0.35, -0.095, 0), color: STEEL });
  return p;
}

/** Where the striking arm hangs from (the shoulder; the rider's on Pegasus). */
const armRoot = (h: HeroId): [number, number, number] => (h === 'bellerophon' ? [0, 0.34 + 0.12, -0.08] : [0, SHOULDER, -0.105]);
const hipRoot = (h: HeroId): number => (h === 'bellerophon' ? 0.28 : HIP);

/** Parts into one geometry, colours baked (no finish: figures, not buildings). */
function build(parts: Part[], tint?: string): THREE.BufferGeometry {
  const pos: number[] = [];
  const colors: number[] = [];
  for (const { geo, color } of parts) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const p = g.attributes.position as THREE.BufferAttribute;
    const c = col(tint ?? color);
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      colors.push(c.r, c.g, c.b);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  out.computeVertexNormals();
  out.computeBoundingSphere();
  return out;
}

/** The pieces put together as they stand (for the statue): moved to their roots, the arm raised a little. */
function standing(h: HeroId): Part[] {
  const p = heroPieces(h);
  const out: Part[] = [...p.body];
  const hip = hipRoot(h);
  const [ax, ay, az] = armRoot(h);
  const at = (parts: Part[], x: number, y: number, z: number, rz = 0, rx = 0): void => {
    for (const q of parts) out.push({ geo: q.geo.clone().rotateZ(rz).rotateX(rx).translate(x, y, z), color: q.color });
  };
  if (p.mounted) {
    at(p.legL, 0, hip, 0, 0.3);
    at(p.legR, 0, hip, 0, -0.3);
    at(p.wingL, -0.02, hip + 0.06, 0.05, 0, -0.5);
    at(p.wingR, -0.02, hip + 0.06, -0.05, 0, 0.5);
  } else {
    at(p.legL, 0, hip, 0.045, 0.12);
    at(p.legR, 0, hip, -0.045, -0.12);
  }
  at(p.arm, ax, ay, az, 1.2);
  return out;
}

// ---------------------------------------------------------------------------- the hall

/**
 * A hero's hall: its local frame as the other buildings' (centre at the
 * origin, the gate facing +x). Open in the middle, where its hero stands.
 */
export function hallModel(h: HeroId): THREE.BufferGeometry {
  const parts: Part[] = [];
  const colour = HERO_COLOURS[h];
  parts.push({ geo: slab(-1.97, -1.97, 1.97, 1.97, -1.2, 0.04), color: PAL.plinth });
  parts.push({ geo: slab(-1.92, -1.92, 1.92, 1.92, 0.04, 0.06), color: PAL.agoraPave });
  // A path of darker flags from the gate to the porch.
  parts.push({ geo: slab(-0.7, -0.32, 1.92, 0.32, 0.06, 0.068), color: PAL.agoraPaveDark });
  // The low wall round it, and the gateway to the road with its two pillars and lintel.
  const wall = PAL.whitewash;
  parts.push({ geo: slab(-1.96, -1.96, -1.86, 1.96, 0.04, 0.34), color: wall });
  for (const z of [-1.96, 1.86]) parts.push({ geo: slab(-1.96, z, 1.96, z + 0.1, 0.04, 0.34), color: wall });
  for (const [z0, z1] of [[-1.96, -0.5], [0.5, 1.96]]) parts.push({ geo: slab(1.86, z0, 1.96, z1, 0.04, 0.34), color: wall });
  for (const z of [-0.5, 0.5]) parts.push({ geo: slab(1.8, z - 0.09, 1.99, z + 0.09, 0.04, 0.78), color: PAL.marble });
  parts.push({ geo: slab(1.78, -0.6, 2.01, 0.6, 0.78, 0.88), color: PAL.marble });
  parts.push({ geo: slab(1.77, -0.61, 2.02, 0.61, 0.82, 0.85), color: colour });
  // Banners in the hero's colour on tall poles either side of the gate.
  for (const z of [-0.78, 0.78]) {
    parts.push({ geo: cyl(0.018, 0.022, 1.3, 5).translate(1.9, 0.69, z), color: PAL.woodDark });
    parts.push({ geo: new THREE.ConeGeometry(0.035, 0.08, 5).translate(1.9, 1.38, z), color: PAL.bronze });
    parts.push({ geo: slab(1.905, z - 0.012, 2.12, z + 0.012, 0.78, 1.28), color: colour });
    parts.push({ geo: slab(1.905, z - 0.014, 2.12, z + 0.014, 0.78, 0.84), color: PAL.bronze });
  }
  // The megaron at the back: two steps, its walls, the porch's two columns between its antae, the gable roof.
  parts.push({ geo: slab(-1.88, -1.12, -0.52, 1.12, 0.06, 0.1), color: PAL.marbleShade });
  parts.push({ geo: slab(-1.86, -1.06, -0.56, 1.06, 0.1, 0.14), color: PAL.marble });
  parts.push({ geo: slab(-1.8, -0.98, -1.0, 0.98, 0.14, 1.0), color: wall });
  for (const z of [-0.98, 0.86]) parts.push({ geo: slab(-1.0, z, -0.62, z + 0.12, 0.14, 1.0), color: wall });
  parts.push({ geo: slab(-1.0, -0.2, -0.985, 0.2, 0.14, 0.72), color: PAL.door });
  for (const z of [-0.36, 0.36]) parts.push(...column(-0.7, z, 0.14, 0.86));
  parts.push({ geo: slab(-1.84, -1.04, -0.58, 1.04, 1.0, 1.08), color: PAL.marble });
  parts.push({ geo: slab(-1.845, -1.045, -0.575, 1.045, 1.03, 1.07), color: colour });
  const roofLen = 1.36;
  const roofMid = -1.21;
  parts.push({ geo: prism(roofLen, 1.12, 0.42).translate(roofMid, 1.08, 0), color: PAL.roofTile });
  parts.push({ geo: cyl(0.03, 0.03, roofLen + 0.02, 5).rotateZ(Math.PI / 2).translate(roofMid, 1.5, 0), color: PAL.roofTileDark });
  parts.push({ geo: gable(2.16, 0.41).rotateY(Math.PI / 2).translate(roofMid + roofLen / 2 + 0.006, 1.085, 0), color: PAL.marble });
  parts.push({ geo: gable(2.16, 0.41).rotateY(-Math.PI / 2).translate(roofMid - roofLen / 2 - 0.006, 1.085, 0), color: PAL.whitewashShade });
  // A gilded shield on the pediment: the hero's house.
  parts.push({ geo: cyl(0.1, 0.1, 0.02, 10).rotateZ(Math.PI / 2).translate(roofMid + roofLen / 2 + 0.02, 1.22, 0), color: PAL.bronze });
  parts.push({ geo: cyl(0.05, 0.05, 0.022, 8).rotateZ(Math.PI / 2).translate(roofMid + roofLen / 2 + 0.024, 1.22, 0), color: colour });
  // The bronze statue of its hero on a tall pedestal, to the gate's left, turned to the gate.
  const sx = 0.95;
  const sz = -1.2;
  parts.push({ geo: slab(sx - 0.2, sz - 0.2, sx + 0.2, sz + 0.2, 0.06, 0.12), color: PAL.marbleShade });
  parts.push({ geo: slab(sx - 0.15, sz - 0.15, sx + 0.15, sz + 0.15, 0.12, 0.42), color: PAL.marble });
  parts.push({ geo: slab(sx - 0.17, sz - 0.17, sx + 0.17, sz + 0.17, 0.42, 0.46), color: PAL.marbleShade });
  for (const q of standing(h)) parts.push({ geo: q.geo.scale(1.25, 1.25, 1.25).rotateY(-0.5).translate(sx, 0.46, sz), color: PAL.bronze });
  // To its right, a bronze tripod on a step, and an altar with its fire before the porch.
  const tx = 0.95;
  const tz = 1.2;
  parts.push({ geo: slab(tx - 0.2, tz - 0.2, tx + 0.2, tz + 0.2, 0.06, 0.12), color: PAL.marbleShade });
  parts.push(...tripod(tx, 0.12, tz, 1.4));
  parts.push({ geo: slab(-0.42, -0.14, -0.2, 0.14, 0.06, 0.26), color: PAL.marble });
  parts.push({ geo: slab(-0.44, -0.16, -0.18, 0.16, 0.26, 0.29), color: PAL.marbleShade });
  parts.push({ geo: new THREE.ConeGeometry(0.06, 0.12, 5).translate(-0.31, 0.35, 0), color: PAL.flame });
  // Cypresses in the corners by the megaron.
  for (const z of [-1.62, 1.62]) {
    parts.push({ geo: cyl(0.03, 0.04, 0.2, 5).translate(-1.62, 0.16, z), color: PAL.trunk });
    parts.push({ geo: new THREE.ConeGeometry(0.17, 1.0, 7).translate(-1.62, 0.72, z), color: PAL.cypress });
  }
  return merge(parts);
}

/** A bronze tripod with its bowl, standing at (x, y, z), `k` times a small one. */
function tripod(x: number, y: number, z: number, k: number): Part[] {
  const out: Part[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    out.push({ geo: cyl(0.012 * k, 0.012 * k, 0.26 * k, 4).rotateZ(0.22).rotateY(a).translate(x + Math.cos(a) * 0.05 * k, y + 0.13 * k, z - Math.sin(a) * 0.05 * k), color: PAL.bronze });
  }
  out.push({ geo: cyl(0.11 * k, 0.05 * k, 0.07 * k, 8).translate(x, y + 0.28 * k, z), color: PAL.bronze });
  for (const s of [1, -1]) out.push({ geo: new THREE.TorusGeometry(0.035 * k, 0.008 * k, 3, 8).translate(x, y + 0.34 * k, z + s * 0.09 * k), color: PAL.bronze });
  return out;
}

/** A place of legend: a marble stele with a gilded crown on its step, a bronze tripod beside it. */
function legendModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  parts.push({ geo: slab(-0.3, -0.34, 0.3, 0.34, -0.3, 0.06), color: PAL.marbleShade });
  parts.push({ geo: slab(-0.07, -0.16, 0.07, 0.16, 0.06, 0.78), color: PAL.marble });
  parts.push({ geo: prism(0.16, 0.18, 0.1).rotateY(Math.PI / 2).translate(0, 0.78, 0), color: PAL.marble });
  parts.push({ geo: new THREE.TorusGeometry(0.08, 0.018, 4, 10).rotateY(Math.PI / 2).translate(0.075, 0.6, 0), color: '#e8c04a' });
  parts.push({ geo: slab(0.071, -0.1, 0.075, 0.1, 0.25, 0.45), color: PAL.marbleShade });
  parts.push(...tripod(0.05, 0.06, 0.26, 1.2));
  return build(parts);
}

// ---------------------------------------------------------------------------- the view

const FLESH = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8, metalness: 0 });
const HALL = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
const RING = new THREE.MeshBasicMaterial({ color: col('#f2c54a'), transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });

/** A hero's figure: its root (placed, turned), body (bobbed), the joints that move, the ring on the ground. */
interface Rig {
  hero: HeroId;
  root: THREE.Group;
  body: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  arm: THREE.Group;
  wings: THREE.Group[];
  ring: THREE.Mesh;
  mounted: boolean;
}

function joint(parent: THREE.Object3D, x: number, y: number, z: number, parts: Part[]): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (parts.length) g.add(new THREE.Mesh(build(parts), FLESH));
  parent.add(g);
  return g;
}

function rig(h: HeroId): Rig {
  const p = heroPieces(h);
  const root = new THREE.Group();
  root.name = `hero-${h}`;
  const body = new THREE.Group();
  root.add(body);
  body.add(new THREE.Mesh(build(p.body), FLESH));
  const hip = hipRoot(h);
  const legL = joint(body, 0, hip, p.mounted ? 0 : 0.045, p.legL);
  const legR = joint(body, 0, hip, p.mounted ? 0 : -0.045, p.legR);
  const [ax, ay, az] = armRoot(h);
  const arm = joint(body, ax, ay, az, p.arm);
  const wings = p.mounted ? [joint(body, -0.02, hip + 0.06, 0.05, p.wingL), joint(body, -0.02, hip + 0.06, -0.05, p.wingR)] : [];
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.25, 20).rotateX(-Math.PI / 2), RING);
  ring.renderOrder = 2;
  root.add(ring);
  for (const o of [root]) o.traverse((x) => (x.castShadow = x instanceof THREE.Mesh && x !== ring));
  return { hero: h, root, body, legL, legR, arm, wings, ring, mounted: p.mounted };
}

/** Where each hero was drawn this frame (for hovering and clicking): their feet and height. */
export interface HeroDrawn {
  hero: HeroId;
  x: number;
  y: number;
  z: number;
  tall: number;
}

/** How many dance at a hall at the fête (YARD_DANCERS of them in its courtyard), and their tunics. */
const DANCERS = 22;
const YARD_DANCERS = 6;
const DANCER_COLOURS = ['#d8452e', '#f0e4c8', '#3f6fae', '#e0b040', '#5f9a4a', '#a24d8f', '#f4f1ea'];
const STRIDE = 0.4;

export class HeroesView {
  readonly group = new THREE.Group();
  private readonly figures = new Map<HeroId, Rig>();
  private readonly halls = new Map<number, { mesh: THREE.Mesh; key: string }>();
  private readonly hallModels = new Map<HeroId, THREE.BufferGeometry>();
  private readonly legends: THREE.InstancedMesh;
  private readonly dancers: THREE.InstancedMesh;
  private readonly was = new Map<HeroId, { px: number; pz: number; x: number; z: number; pw: number; w: number }>();
  private tick = -1;
  /** Drawn this frame. */
  readonly shown: HeroDrawn[] = [];
  /** The places of legend drawn: their index in `legends.slain` and middle. */
  readonly legendsShown: Array<{ i: number; x: number; y: number; z: number }> = [];
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly c = new THREE.Color();

  constructor(private readonly map: CoastMap) {
    this.group.name = 'heroes';
    this.legends = new THREE.InstancedMesh(legendModel(), FLESH, 8);
    this.legends.count = 0;
    this.legends.frustumCulled = false;
    this.legends.castShadow = true;
    // A dancer: a short robed figure with a head, tinted by instance.
    const d = new THREE.CylinderGeometry(0.035, 0.06, 0.2, 6).translate(0, 0.1, 0);
    const head = new THREE.IcosahedronGeometry(0.035, 0).translate(0, 0.235, 0);
    const parts = [d, head].map((g) => g.toNonIndexed());
    const geo = new THREE.BufferGeometry();
    const pos: number[] = [];
    for (const g of parts) pos.push(...(g.attributes.position.array as Float32Array));
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    this.dancers = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.85 }), DANCERS);
    this.dancers.count = 0;
    this.dancers.frustumCulled = false;
    this.group.add(this.legends, this.dancers);
  }

  private ground(x: number, z: number): number {
    return this.map.heightAt(x, z);
  }

  /** A hall's floor: its centre, the lowest ground under its corners, its yaw to the road. */
  private floorOf(s: SimState, b: Building): { x: number; y: number; z: number; yaw: number } {
    const [cx, cz] = centreOf(b);
    let y = this.ground(cx, cz);
    for (const [dx, dz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) y = Math.min(y, this.ground(cx + dx, cz + dz));
    return { x: cx, y: y + 0.01, z: cz, yaw: facingOf(s, this.map.size, b) };
  }

  update(s: SimState, alpha: number, time: number): void {
    const L = s.legends;
    this.shown.length = 0;
    this.legendsShown.length = 0;
    const anyHall = s.buildings.some((b) => b.kind === 'herohall');
    if (!anyHall && !L.heroes.length && !L.slain.length && !this.halls.size && !this.figures.size) {
      this.legends.count = 0;
      this.dancers.count = 0;
      return;
    }
    // The halls.
    const live = new Set<number>();
    for (const b of s.buildings) {
      if (b.kind !== 'herohall' || !b.hero) continue;
      live.add(b.id);
      const f = this.floorOf(s, b);
      const key = `${b.hero}:${f.x}:${f.z}:${f.yaw.toFixed(2)}`;
      let h = this.halls.get(b.id);
      if (!h || h.key !== key) {
        if (h) this.group.remove(h.mesh);
        let geo = this.hallModels.get(b.hero);
        if (!geo) this.hallModels.set(b.hero, (geo = hallModel(b.hero)));
        const mesh = new THREE.Mesh(geo, HALL);
        mesh.name = `herohall-${b.hero}`;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.set(f.x, f.y, f.z);
        mesh.rotation.y = f.yaw;
        this.halls.set(b.id, (h = { mesh, key }));
        this.group.add(mesh);
      }
    }
    for (const [id, h] of this.halls) {
      if (live.has(id)) continue;
      this.group.remove(h.mesh);
      this.halls.delete(id);
    }

    // The places of legend.
    const n = this.map.size;
    let k = 0;
    for (let i = 0; i < L.slain.length && k < 8; i++) {
      const d = L.slain[i];
      const lx = (d.lair % n) + 0.5;
      const lz = Math.floor(d.lair / n) + 0.5;
      // (Before its mouth, on the city's side: as MonstersView turns a slain one's lair.)
      const mouth = Math.atan2(n / 2 - lz, n / 2 - lx);
      const x = lx + Math.cos(mouth) * 2.1 + Math.sin(mouth) * 0.6;
      const z = lz + Math.sin(mouth) * 2.1 - Math.cos(mouth) * 0.6;
      const y = this.ground(x, z);
      this.q.setFromAxisAngle(this.up, -mouth);
      this.p.set(x, y, z);
      this.s.set(1, 1, 1);
      this.m.compose(this.p, this.q, this.s);
      this.legends.setMatrixAt(k++, this.m);
      this.legendsShown.push({ i, x, y: y + 0.4, z });
    }
    this.legends.count = k;
    this.legends.instanceMatrix.needsUpdate = true;

    // The fête: a crowd dancing in a ring before the gate of the hall of the hero who slew it, and a few in its courtyard.
    const fete = L.fete && s.tick < L.fete.until ? L.fete : null;
    const fh = fete ? findBuilding(s, fete.hall) : undefined;
    if (fh) {
      const f = this.floorOf(s, fh);
      const gx = Math.cos(f.yaw);
      const gz = -Math.sin(f.yaw);
      for (let i = 0; i < DANCERS; i++) {
        const inner = i >= DANCERS - YARD_DANCERS;
        const k = inner ? i - (DANCERS - YARD_DANCERS) : i;
        const of = inner ? YARD_DANCERS : DANCERS - YARD_DANCERS;
        const r = inner ? 0.62 : 1.25 + 0.08 * Math.sin(time * 2 + i);
        const cx = f.x + gx * (inner ? 0.7 : 3.1);
        const cz = f.z + gz * (inner ? 0.7 : 3.1);
        const a = (k / of) * Math.PI * 2 + time * (inner ? -0.6 : 0.45);
        const x = cx + Math.cos(a) * r;
        const z = cz + Math.sin(a) * r;
        const hop = Math.max(0, Math.sin(time * 6 + i * 1.7)) * 0.05;
        this.q.setFromAxisAngle(this.up, -a);
        this.p.set(x, (inner ? f.y + 0.06 : this.ground(x, z)) + hop, z);
        this.s.set(1.15, 1.15, 1.15);
        this.m.compose(this.p, this.q, this.s);
        this.dancers.setMatrixAt(i, this.m);
        this.c.set(DANCER_COLOURS[Math.floor(hash2(i, 5, 59) * DANCER_COLOURS.length)]);
        this.dancers.setColorAt(i, this.c);
      }
      this.dancers.count = DANCERS;
      this.dancers.instanceMatrix.needsUpdate = true;
      if (this.dancers.instanceColor) this.dancers.instanceColor.needsUpdate = true;
    } else this.dancers.count = 0;

    // The heroes: their places at the last two ticks.
    if (s.tick !== this.tick) {
      const jump = this.tick < 0 || s.tick - this.tick > 4 || s.tick < this.tick;
      this.tick = s.tick;
      for (const c of L.heroes) {
        const w = this.was.get(c.hero);
        if (!w || jump) this.was.set(c.hero, { px: c.x, pz: c.z, x: c.x, z: c.z, pw: c.walked, w: c.walked });
        else Object.assign(w, { px: w.x, pz: w.z, pw: w.w, x: c.x, z: c.z, w: c.walked });
      }
    }
    const a = Math.max(0, Math.min(1, alpha));
    const now = s.tick + a;
    const here = new Set<HeroId>();
    for (const c of L.heroes) {
      if (!heroShown(c)) continue;
      const was = this.was.get(c.hero);
      if (!was) continue;
      here.add(c.hero);
      let r = this.figures.get(c.hero);
      if (!r) {
        r = rig(c.hero);
        this.figures.set(c.hero, r);
        this.group.add(r.root);
      }
      this.pose(r, c, was, a, now, time);
      this.shown.push({ hero: c.hero, x: r.root.position.x, y: r.root.position.y, z: r.root.position.z, tall: HERO_TALL });
    }
    for (const [h, r] of this.figures) {
      if (here.has(h)) continue;
      this.group.remove(r.root);
      r.root.traverse((o) => {
        if (o instanceof THREE.Mesh && o.material !== RING) o.geometry.dispose();
      });
      r.ring.geometry.dispose();
      this.figures.delete(h);
      this.was.delete(h);
    }
  }

  private pose(r: Rig, c: Champion, was: { px: number; pz: number; x: number; z: number; pw: number; w: number }, a: number, now: number, time: number): void {
    const x = was.px + (was.x - was.px) * a;
    const z = was.pz + (was.z - was.pz) * a;
    const walked = was.pw + (was.w - was.pw) * a;
    const moving = Math.abs(was.x - was.px) + Math.abs(was.z - was.pz) > 1e-4;
    const phase = (walked / STRIDE) * Math.PI * 2;
    const swing = moving ? Math.sin(phase) * (r.mounted ? 0.5 : 0.45) : 0;
    r.legL.rotation.z = swing;
    r.legR.rotation.z = -swing;
    // The blow: the arm raised high, then brought down hard and forward.
    const dt = now - c.swung;
    const striking = c.state === 'fighting' && c.swung > 0 && dt >= 0 && dt < 6;
    const raise = striking ? (dt < 3 ? dt / 3 : Math.max(0, 1 - (dt - 3) / 1.5)) : 0;
    const slam = striking && dt >= 3 && dt < 5 ? Math.sin(((dt - 3) / 2) * Math.PI) : 0;
    const idle = moving ? -swing * 0.4 : 0.15 + Math.sin(time * 1.3 + r.hero.length) * 0.04;
    r.arm.rotation.z = c.state === 'fighting' ? 0.5 + raise * 1.9 - slam * 1.2 : idle;
    // Pegasus' wings beat as he walks or fights, folded at rest; he rises off the ground in the fight.
    const flying = r.mounted && c.state === 'fighting';
    if (r.mounted) {
      const beat = moving || flying ? Math.sin(time * (flying ? 9 : 5)) * 0.6 : 0;
      r.wings[0].rotation.x = -0.35 - beat;
      r.wings[1].rotation.x = 0.35 + beat;
    }
    // A brisk bob as they walk, a lunge with the blow, breathing at rest.
    const bob = moving ? Math.abs(Math.cos(phase)) * 0.012 : Math.sin(time * 1.6) * 0.004;
    const lift = flying ? 0.22 + Math.sin(time * 3) * 0.04 : 0;
    r.body.position.set(slam * 0.06, bob + lift, 0);
    r.body.rotation.set(0, 0, slam * -0.15 + raise * 0.05);
    r.root.position.set(x, this.ground(x, z) + 0.005, z);
    r.root.rotation.set(0, -c.face, 0);
    r.ring.position.set(0, 0.02, 0);
    // (The review: a little wider always, and wide and beating in a fight, so the hero reads beside a monster many times their height.)
    const wide = c.state === 'fighting' ? 1.8 + Math.sin(time * 4) * 0.15 : 1.2;
    r.ring.scale.setScalar((r.mounted ? 1.4 : 1) * wide);
  }

  /** The hero nearest a screen point (their figure, foot to head), or null. */
  pick(camera: THREE.Camera, rect: { left: number; top: number; width: number; height: number }, sx: number, sy: number): HeroId | null {
    let best: HeroId | null = null;
    let bd = Infinity;
    const v = new THREE.Vector3();
    const toScreen = (x: number, y: number, z: number): [number, number] | null => {
      v.set(x, y, z).project(camera);
      if (v.z > 1) return null;
      return [rect.left + (v.x * 0.5 + 0.5) * rect.width, rect.top + (-v.y * 0.5 + 0.5) * rect.height];
    };
    for (const o of this.shown) {
      const foot = toScreen(o.x, o.y, o.z);
      const head = toScreen(o.x, o.y + o.tall, o.z);
      if (!foot || !head) continue;
      const hx = head[0] - foot[0];
      const hy = head[1] - foot[1];
      const len2 = hx * hx + hy * hy || 1;
      const t = Math.max(0, Math.min(1, ((sx - foot[0]) * hx + (sy - foot[1]) * hy) / len2));
      const dx = sx - (foot[0] + hx * t);
      const dy = sy - (foot[1] + hy * t);
      const d = dx * dx + dy * dy;
      const room = Math.max(12, Math.sqrt(len2) * 0.45);
      if (d < room * room && d < bd) [bd, best] = [d, o.hero];
    }
    return best;
  }

  /** The place of legend nearest a screen point (its index in `legends.slain`), or -1. */
  pickLegend(camera: THREE.Camera, rect: { left: number; top: number; width: number; height: number }, sx: number, sy: number): number {
    let best = -1;
    let bd = 26 * 26;
    const v = new THREE.Vector3();
    for (const o of this.legendsShown) {
      v.set(o.x, o.y, o.z).project(camera);
      if (v.z > 1) continue;
      const dx = rect.left + (v.x * 0.5 + 0.5) * rect.width - sx;
      const dy = rect.top + (-v.y * 0.5 + 0.5) * rect.height - sy;
      const d = dx * dx + dy * dy;
      if (d < bd) [bd, best] = [d, o.i];
    }
    return best;
  }

  /** What is drawn (for the smoke test). */
  get counts(): { halls: number; heroes: number; legends: number; dancers: number } {
    return { halls: this.halls.size, heroes: this.figures.size, legends: this.legends.count, dancers: this.dancers.count };
  }
}

// ---------------------------------------------------------------------------- the build panel's picture

/** Slice 59 (the review): the Hero's hall tool's picture, Heracles' hall (pictures.ts draws it). */
export function heroHallPicture(tool: string): Array<{ geo: THREE.BufferGeometry; x: number; z: number; yaw: number; s: [number, number, number] }> | null {
  if (tool !== 'herohall') return null;
  return [{ geo: hallModel('heracles'), x: 0, z: 0, yaw: 0, s: [1, 1, 1] }];
}
