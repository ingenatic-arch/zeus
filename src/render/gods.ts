import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { centreOf, findBuilding, footSide } from '../sim/buildings';
import { ARRIVE_TICKS, LEAVE_TICKS, type GodFigure } from '../sim/epiphany';
import { GODS, type GodId } from '../sim/pantheon';
import type { SimState } from '../sim/state';

/**
 * Slice 56: the gods in the city, drawn from the sim's `gods.walks` (a pure
 * read). Each god is a figure over three storeys tall (GOD_HEIGHT), built
 * from low-poly parts dressed as that god (figureParts), glowing in their
 * colour (an emissive rim and a soft glow behind them), with a halo of light
 * on the ground under them and a trail of fading footprints of light. They
 * walk with a slow, grand stride: the legs swing under the robe, the body
 * rises and sways a little.
 *
 * Flourishes come from one shared pool of particles (camera-facing additive
 * quads), with a lightning bolt, shafts of light and a few birds: Zeus in a
 * lightning strike, Poseidon in sea spray, Demeter in falling petals, Athena
 * with an owl circling, Apollo in a shaft of sunlight, Artemis in moonlight
 * and silver arrows, Ares in bronze and dust, Aphrodite in rose petals and
 * doves, Hephaestus in sparks, Hermes in a flash of wings, Dionysus in a ring
 * of vines and a wine-dark mist, Hera in a peacock's fan of light. Leaving
 * plays it again, turned about. Blessed places shimmer gold: a ring of light
 * round the footprint and motes rising.
 *
 * Render only: the sim's figures say where each god is and what they are
 * doing; this keeps only what is drawn (and the particles, in real time).
 * `events` lists the gods who arrived or began to leave since the last frame
 * (main.ts plays their sound stings).
 */

/** A god's height, in tiles: three storeys and more, so they stand clear over a street of two-storey townhouses (whose ridges are about 1.45). */
export const GOD_HEIGHT = 2.5;
/** How much bigger than first tuned (at 1.8 tiles): their stride, footprints and ground halo grow with them. */
const GROW = GOD_HEIGHT / 1.8;
/** The length of a full stride (two steps), in tiles: legs swing with the distance walked. */
const STRIDE = 1.1 * GROW;

// ---------------------------------------------------------------------------
// The figures' parts.

interface Part {
  geo: THREE.BufferGeometry;
  color: string;
}

const SKIN = '#e2b48a';
const SKIN_DARK = '#c48d63';
const GOLD = '#e8c45a';
const BRONZE = '#b8823a';
const WOOD = '#7a5432';
const SILVER = '#d8dde6';

const cyl = (rt: number, rb: number, h: number, seg = 8): THREE.BufferGeometry => new THREE.CylinderGeometry(rt, rb, h, seg);
const ball = (r: number): THREE.BufferGeometry => new THREE.IcosahedronGeometry(r, 0);
const box = (w: number, h: number, d: number): THREE.BufferGeometry => new THREE.BoxGeometry(w, h, d);

/** A thin rod from one point to another (a spear's shaft, a sceptre). */
function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, color: string, seg = 5): Part {
  const d = new THREE.Vector3().subVectors(b, a);
  const g = cyl(r, r, d.length(), seg);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return { geo: g, color };
}

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

/** How each god is dressed. */
interface Dress {
  robe: string;
  /** A mantle over one shoulder and across the body, if any. */
  mantle?: string;
  hair: string;
  /** Short tunic to the knee (legs show) or a long robe to the feet. */
  short?: boolean;
  /** A bare chest (the torso in skin, the robe from the waist). */
  bare?: boolean;
  /** A chest of bronze (Ares), or leather (Hephaestus's apron). */
  chest?: string;
  beard?: string;
  skin?: string;
}

const DRESS: Record<GodId, Dress> = {
  zeus: { robe: '#f2ead6', mantle: '#4a3a8c', hair: '#e8e4dc', beard: '#e8e4dc' },
  hera: { robe: '#2a5f9e', mantle: '#1d8a7a', hair: '#3a2416' },
  poseidon: { robe: '#2a8a78', hair: '#3c5a6a', beard: '#3c5a6a', bare: true },
  demeter: { robe: '#efe2bc', mantle: '#c08a2a', hair: '#6a4422' },
  athena: { robe: '#e6e2d4', mantle: '#5e7480', hair: '#4a3020' },
  apollo: { robe: '#fbf3dc', mantle: '#e8b830', hair: '#e8c060', bare: true },
  artemis: { robe: '#c8d6c8', hair: '#8a4a26', short: true },
  ares: { robe: '#a22a2a', hair: '#2a1a12', short: true, chest: BRONZE, beard: '#2a1a12' },
  aphrodite: { robe: '#f0a8c0', mantle: '#f6e0e8', hair: '#f0c860' },
  hephaestus: { robe: '#8a6a4a', hair: '#1e1612', short: true, chest: '#6a4426', beard: '#1e1612', skin: SKIN_DARK },
  hermes: { robe: '#e8eef2', mantle: '#58a6d6', hair: '#6a4a2a', short: true },
  dionysus: { robe: '#6a2a6a', mantle: '#3a6a2a', hair: '#2a1a2a' },
};

/** The body (without the legs) and one leg (pivoted at the hip, y 0 at the hip), of a god: model frame, feet at y 0 when the leg hangs, facing +z. */
function figureParts(g: GodId): { body: Part[]; leg: Part[]; hip: number } {
  const d = DRESS[g];
  const skin = d.skin ?? SKIN;
  const body: Part[] = [];
  const leg: Part[] = [];
  const hip = d.short ? 0.62 : 0.5;
  // A leg: the shin and a sandal, from the hip down (a robe hides the thigh).
  if (d.short) {
    leg.push({ geo: cyl(0.065, 0.05, hip - 0.06, 6).translate(0, -(hip - 0.06) / 2, 0), color: skin });
    if (g === 'ares') leg.push({ geo: cyl(0.06, 0.055, 0.24, 6).translate(0, -hip + 0.2, 0.01), color: BRONZE });
  } else leg.push({ geo: cyl(0.05, 0.045, 0.2, 6).translate(0, -hip + 0.12, 0), color: skin });
  leg.push({ geo: box(0.1, 0.05, 0.19).translate(0, -hip + 0.025, 0.03), color: g === 'hermes' ? GOLD : WOOD });
  if (g === 'hermes') {
    // Winged sandals.
    for (const s of [-1, 1]) leg.push({ geo: new THREE.ConeGeometry(0.035, 0.16, 3).rotateZ(s * 1.1).translate(s * 0.08, -hip + 0.1, -0.04), color: '#ffffff' });
  }
  // The robe or tunic: a long skirt flaring to the ground, or a short one to the knee.
  if (d.short) body.push({ geo: cyl(0.2, 0.27, 0.34, 8).translate(0, 0.6, 0), color: d.robe });
  else body.push({ geo: cyl(0.2, 0.33, 0.78, 9).translate(0, 0.43, 0), color: d.robe });
  // The torso, broad at the shoulders, and the belt.
  body.push({ geo: cyl(0.22, 0.17, 0.46, 8).scale(1, 1, 0.78).translate(0, 1.0, 0), color: d.chest ?? (d.bare ? skin : d.robe) });
  body.push({ geo: cyl(0.18, 0.18, 0.05, 8).scale(1, 1, 0.8).translate(0, 0.79, 0), color: d.chest === BRONZE ? BRONZE : d.mantle ?? GOLD });
  // A mantle: over the left shoulder and round the body.
  if (d.mantle) {
    body.push({ geo: cyl(0.235, 0.27, 0.5, 8, ).scale(1, 1, 0.82).rotateZ(0.32).translate(-0.02, 0.86, 0), color: d.mantle });
    if (g === 'hera' || g === 'zeus') body.push({ geo: box(0.36, 0.7, 0.04).translate(0, 0.82, -0.17).rotateX(0.06), color: d.mantle });
  }
  // Hephaestus's leather apron.
  if (g === 'hephaestus') body.push({ geo: box(0.3, 0.55, 0.04).translate(0, 0.66, 0.2), color: '#5a3a1e' });
  // Shoulders and neck.
  body.push({ geo: ball(0.09).scale(1, 0.8, 1).translate(-0.24, 1.2, 0), color: d.chest ?? (d.bare ? skin : d.robe) });
  body.push({ geo: ball(0.09).scale(1, 0.8, 1).translate(0.24, 1.2, 0), color: d.chest ?? (d.bare ? skin : d.robe) });
  body.push({ geo: cyl(0.05, 0.06, 0.08, 6).translate(0, 1.27, 0), color: skin });
  // The head, the face a little forward.
  body.push({ geo: ball(0.115).scale(0.95, 1.08, 1).translate(0, 1.38, 0.01), color: skin });
  body.push({ geo: box(0.03, 0.04, 0.03).translate(0, 1.37, 0.12), color: skin });
  // Hair: a cap over the back of the head; long hair for the goddesses and Dionysus.
  body.push({ geo: ball(0.122).scale(1, 0.9, 1).translate(0, 1.41, -0.025), color: d.hair });
  if (g === 'aphrodite' || g === 'dionysus' || g === 'demeter' || g === 'hera') body.push({ geo: cyl(0.1, 0.13, 0.42, 6).scale(1, 1, 0.55).translate(0, 1.2, -0.1), color: d.hair });
  if (g === 'artemis' || g === 'athena') body.push({ geo: ball(0.06).translate(0, 1.34, -0.13), color: d.hair });
  if (d.beard) body.push({ geo: new THREE.ConeGeometry(0.085, 0.2, 6).rotateX(Math.PI).translate(0, 1.27, 0.07), color: d.beard });
  // Arms: upper arms down at the sides, forearms forward (the right, +x... the god's left is +x facing +z: the right hand is at -x).
  const R = -1;
  const L = 1;
  const arm = (side: number, hand: THREE.Vector3, sleeve: string): void => {
    const sh = V(side * 0.26, 1.18, 0);
    const el = V(side * 0.3, 0.92, 0.02);
    body.push(rod(sh, el, 0.055, sleeve, 6));
    body.push(rod(el, hand, 0.048, skin, 6));
    body.push({ geo: ball(0.05).translate(hand.x, hand.y, hand.z), color: skin });
  };
  const sleeve = d.bare || d.short ? skin : d.robe;
  // Where each hand is: raised (a thunderbolt, a dove), forward (a lyre, a sheaf), or down at the side holding a staff upright.
  const RIGHT_STAFF = V(R * 0.32, 0.95, 0.2);
  const LEFT_FORE = V(L * 0.28, 0.98, 0.22);
  const RIGHT_FORE = V(R * 0.28, 0.98, 0.22);
  const RIGHT_RAISED = V(R * 0.34, 1.5, 0.08);
  const LEFT_RAISED = V(L * 0.34, 1.46, 0.12);
  const LEFT_DOWN = V(L * 0.33, 0.72, 0.06);
  const RIGHT_DOWN = V(R * 0.33, 0.72, 0.06);
  const staff = (hand: THREE.Vector3, top: number, bottom: number, color: string, r = 0.022): Part => rod(V(hand.x, bottom, hand.z), V(hand.x, top, hand.z), r, color);
  switch (g) {
    case 'zeus': {
      // His thunderbolt raised, a sceptre in the left.
      arm(R, RIGHT_RAISED, sleeve);
      arm(L, LEFT_FORE, sleeve);
      body.push(staff(LEFT_FORE, 1.7, 0.02, GOLD));
      body.push({ geo: ball(0.045).translate(LEFT_FORE.x, 1.72, LEFT_FORE.z), color: GOLD });
      const h = RIGHT_RAISED;
      body.push(rod(V(h.x - 0.02, h.y - 0.05, h.z), V(h.x + 0.07, h.y + 0.12, h.z), 0.028, '#fff2a0', 4));
      body.push(rod(V(h.x + 0.07, h.y + 0.12, h.z), V(h.x - 0.05, h.y + 0.2, h.z), 0.028, '#fff2a0', 4));
      body.push(rod(V(h.x - 0.05, h.y + 0.2, h.z), V(h.x + 0.04, h.y + 0.36, h.z), 0.03, '#fff2a0', 4));
      body.push(rod(V(h.x - 0.02, h.y - 0.05, h.z), V(h.x - 0.1, h.y - 0.18, h.z), 0.024, '#fff2a0', 4));
      break;
    }
    case 'hera': {
      arm(R, RIGHT_STAFF, sleeve);
      arm(L, LEFT_FORE, sleeve);
      body.push(staff(RIGHT_STAFF, 1.72, 0.02, GOLD));
      body.push({ geo: new THREE.ConeGeometry(0.05, 0.1, 4).translate(RIGHT_STAFF.x, 1.77, RIGHT_STAFF.z), color: GOLD });
      // Her diadem and veil.
      body.push({ geo: cyl(0.12, 0.125, 0.07, 8).translate(0, 1.5, 0), color: GOLD });
      body.push({ geo: cyl(0.12, 0.22, 0.6, 7).scale(1, 1, 0.6).translate(0, 1.22, -0.1), color: '#e8f0f4' });
      // A peacock's feather fan in her hand.
      for (let i = -2; i <= 2; i++) body.push(rod(LEFT_FORE, V(LEFT_FORE.x + i * 0.05, LEFT_FORE.y + 0.24, LEFT_FORE.z + 0.06), 0.012, i % 2 ? '#2f9a8a' : '#2a5fb0', 3));
      break;
    }
    case 'poseidon': {
      // The trident upright in his right hand.
      arm(R, RIGHT_STAFF, sleeve);
      arm(L, LEFT_DOWN, sleeve);
      body.push(staff(RIGHT_STAFF, 1.75, 0.02, '#9ab8b0', 0.024));
      const t = RIGHT_STAFF;
      body.push({ geo: box(0.26, 0.03, 0.03).translate(t.x, 1.75, t.z), color: '#9ab8b0' });
      for (const dx of [-0.12, 0, 0.12]) body.push({ geo: new THREE.ConeGeometry(0.025, 0.2, 4).translate(t.x + dx, 1.86, t.z), color: '#c8e0d8' });
      // His sea-green mantle slung over one shoulder.
      body.push({ geo: cyl(0.2, 0.24, 0.12, 8).scale(1, 1, 0.8).rotateZ(-0.5).translate(0.05, 1.12, 0), color: d.robe });
      break;
    }
    case 'demeter': {
      // A sheaf of wheat in her left arm, a torch in her right.
      arm(R, RIGHT_FORE, sleeve);
      arm(L, LEFT_FORE, sleeve);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        body.push(rod(V(LEFT_FORE.x + Math.cos(a) * 0.03, LEFT_FORE.y - 0.2, LEFT_FORE.z + Math.sin(a) * 0.03), V(LEFT_FORE.x + Math.cos(a) * 0.08, LEFT_FORE.y + 0.32, LEFT_FORE.z + Math.sin(a) * 0.08), 0.012, '#f2d060', 3));
      }
      body.push({ geo: ball(0.07).scale(1, 1.6, 1).translate(LEFT_FORE.x, LEFT_FORE.y + 0.33, LEFT_FORE.z), color: '#f2d060' });
      body.push(rod(V(RIGHT_FORE.x, RIGHT_FORE.y - 0.12, RIGHT_FORE.z), V(RIGHT_FORE.x, RIGHT_FORE.y + 0.38, RIGHT_FORE.z + 0.04), 0.025, WOOD, 5));
      body.push({ geo: new THREE.ConeGeometry(0.07, 0.2, 5).translate(RIGHT_FORE.x, RIGHT_FORE.y + 0.48, RIGHT_FORE.z + 0.04), color: '#ff9a2a' });
      break;
    }
    case 'athena': {
      // Her spear in her right hand, the aegis's round shield on her left arm, a crested helmet.
      arm(R, RIGHT_STAFF, sleeve);
      arm(L, LEFT_FORE, sleeve);
      body.push(staff(RIGHT_STAFF, 1.85, 0.02, WOOD, 0.02));
      body.push({ geo: new THREE.ConeGeometry(0.04, 0.16, 4).translate(RIGHT_STAFF.x, 1.93, RIGHT_STAFF.z), color: BRONZE });
      body.push({ geo: cyl(0.2, 0.2, 0.04, 10).rotateX(Math.PI / 2).rotateY(0.5).translate(LEFT_FORE.x + 0.06, LEFT_FORE.y + 0.02, LEFT_FORE.z + 0.04), color: '#c0c6c0' });
      body.push({ geo: ball(0.06).translate(LEFT_FORE.x + 0.08, LEFT_FORE.y + 0.02, LEFT_FORE.z + 0.08), color: GOLD });
      body.push({ geo: ball(0.135).scale(1, 0.95, 1.05).translate(0, 1.43, 0), color: '#9aa4a0' });
      body.push({ geo: box(0.04, 0.12, 0.3).translate(0, 1.6, -0.02), color: '#3a6aa0' });
      // The aegis on her breast.
      body.push({ geo: cyl(0.2, 0.24, 0.16, 8).scale(1, 1, 0.82).translate(0, 1.12, 0), color: '#b8a870' });
      break;
    }
    case 'apollo': {
      // A lyre in his left hand, a laurel crown.
      arm(R, RIGHT_FORE, sleeve);
      arm(L, LEFT_FORE, sleeve);
      const ly = LEFT_FORE;
      body.push(rod(V(ly.x - 0.08, ly.y, ly.z + 0.04), V(ly.x - 0.11, ly.y + 0.3, ly.z + 0.04), 0.018, GOLD, 4));
      body.push(rod(V(ly.x + 0.08, ly.y, ly.z + 0.04), V(ly.x + 0.11, ly.y + 0.3, ly.z + 0.04), 0.018, GOLD, 4));
      body.push(rod(V(ly.x - 0.11, ly.y + 0.26, ly.z + 0.04), V(ly.x + 0.11, ly.y + 0.26, ly.z + 0.04), 0.014, GOLD, 4));
      body.push({ geo: ball(0.09).scale(1, 0.6, 0.5).translate(ly.x, ly.y - 0.02, ly.z + 0.04), color: '#a8743a' });
      body.push({ geo: new THREE.TorusGeometry(0.12, 0.022, 4, 10).rotateX(Math.PI / 2).translate(0, 1.45, 0), color: '#4a8a3a' });
      // A himation across the waist, gold.
      body.push({ geo: cyl(0.2, 0.24, 0.2, 8).scale(1, 1, 0.82).rotateZ(0.4).translate(0, 0.86, 0), color: d.mantle! });
      break;
    }
    case 'artemis': {
      // Her bow in her left hand, a quiver on her back, a silver crescent on her brow.
      arm(R, RIGHT_DOWN, sleeve);
      arm(L, LEFT_FORE, sleeve);
      body.push({ geo: new THREE.TorusGeometry(0.34, 0.016, 3, 12, Math.PI).rotateZ(Math.PI / 2).translate(LEFT_FORE.x + 0.05, LEFT_FORE.y, LEFT_FORE.z + 0.04), color: '#8a6a3a' });
      body.push(rod(V(LEFT_FORE.x + 0.05, LEFT_FORE.y - 0.34, LEFT_FORE.z + 0.04), V(LEFT_FORE.x + 0.05, LEFT_FORE.y + 0.34, LEFT_FORE.z + 0.04), 0.005, '#f0f0f0', 3));
      body.push(rod(V(0.1, 0.85, -0.18), V(-0.12, 1.32, -0.2), 0.05, '#7a4a2a', 6));
      for (const dx of [-0.02, 0.02, 0.05]) body.push(rod(V(-0.12 + dx, 1.3, -0.2), V(-0.17 + dx, 1.44, -0.21), 0.008, SILVER, 3));
      body.push({ geo: new THREE.TorusGeometry(0.06, 0.018, 3, 8, Math.PI).translate(0, 1.53, 0.04), color: SILVER });
      break;
    }
    case 'ares': {
      // His spear, his round shield, his crested helmet with its red plume.
      arm(R, RIGHT_STAFF, sleeve);
      arm(L, LEFT_FORE, sleeve);
      body.push(staff(RIGHT_STAFF, 1.9, 0.02, WOOD, 0.022));
      body.push({ geo: new THREE.ConeGeometry(0.045, 0.2, 4).translate(RIGHT_STAFF.x, 2.0, RIGHT_STAFF.z), color: BRONZE });
      body.push({ geo: cyl(0.26, 0.26, 0.05, 12).rotateX(Math.PI / 2).rotateY(0.4).translate(LEFT_FORE.x + 0.08, LEFT_FORE.y, LEFT_FORE.z + 0.04), color: BRONZE });
      body.push({ geo: ball(0.07).translate(LEFT_FORE.x + 0.11, LEFT_FORE.y, LEFT_FORE.z + 0.08), color: '#a22a2a' });
      body.push({ geo: ball(0.138).scale(1, 1.05, 1.08).translate(0, 1.42, 0), color: BRONZE });
      body.push({ geo: box(0.05, 0.16, 0.38).translate(0, 1.62, -0.02), color: '#c22a22' });
      body.push({ geo: box(0.05, 0.1, 0.12).translate(0, 1.58, -0.24), color: '#c22a22' });
      break;
    }
    case 'aphrodite': {
      // A dove on her raised hand; her hair flowing down her back.
      arm(R, RIGHT_DOWN, sleeve);
      arm(L, LEFT_RAISED, sleeve);
      const h = LEFT_RAISED;
      body.push({ geo: ball(0.06).scale(1, 0.8, 1.4).translate(h.x, h.y + 0.07, h.z), color: '#ffffff' });
      body.push({ geo: box(0.26, 0.02, 0.08).rotateZ(0.3).translate(h.x, h.y + 0.12, h.z - 0.02), color: '#ffffff' });
      body.push({ geo: ball(0.035).translate(h.x, h.y + 0.12, h.z + 0.08), color: '#ffffff' });
      body.push({ geo: new THREE.TorusGeometry(0.11, 0.02, 4, 10).rotateX(Math.PI / 2).translate(0, 1.47, 0), color: '#e85a7a' });
      break;
    }
    case 'hephaestus': {
      // His hammer in his right hand, tongs in his left.
      arm(R, RIGHT_FORE, sleeve);
      arm(L, LEFT_DOWN, sleeve);
      body.push(rod(V(RIGHT_FORE.x, RIGHT_FORE.y - 0.1, RIGHT_FORE.z), V(RIGHT_FORE.x, RIGHT_FORE.y + 0.3, RIGHT_FORE.z + 0.06), 0.024, WOOD, 5));
      body.push({ geo: box(0.22, 0.1, 0.1).translate(RIGHT_FORE.x, RIGHT_FORE.y + 0.33, RIGHT_FORE.z + 0.06), color: '#4a4a52' });
      body.push(rod(LEFT_DOWN, V(LEFT_DOWN.x + 0.02, LEFT_DOWN.y - 0.3, LEFT_DOWN.z + 0.06), 0.014, '#4a4a52', 3));
      body.push({ geo: box(0.12, 0.08, 0.05).translate(0, 1.5, 0), color: '#6a4426' });
      break;
    }
    case 'hermes': {
      // The caduceus in his left hand, his broad winged hat, a cloak.
      arm(R, RIGHT_DOWN, sleeve);
      arm(L, LEFT_FORE, sleeve);
      body.push(staff(LEFT_FORE, 1.48, 0.62, GOLD, 0.018));
      for (let i = 0; i < 4; i++) body.push({ geo: new THREE.TorusGeometry(0.045, 0.012, 3, 6).rotateX(Math.PI / 2 + (i % 2 ? 0.4 : -0.4)).translate(LEFT_FORE.x, 0.9 + i * 0.12, LEFT_FORE.z), color: '#3a8a4a' });
      for (const s of [-1, 1]) body.push({ geo: new THREE.ConeGeometry(0.03, 0.14, 3).rotateZ(s * 1.2).translate(LEFT_FORE.x + s * 0.07, 1.5, LEFT_FORE.z), color: '#ffffff' });
      body.push({ geo: cyl(0.25, 0.25, 0.025, 10).translate(0, 1.48, 0), color: '#b8a070' });
      body.push({ geo: cyl(0.1, 0.13, 0.1, 8).translate(0, 1.53, 0), color: '#b8a070' });
      for (const s of [-1, 1]) body.push({ geo: new THREE.ConeGeometry(0.04, 0.2, 3).rotateZ(s * 1.0).translate(s * 0.16, 1.58, 0), color: '#ffffff' });
      body.push({ geo: box(0.38, 0.5, 0.04).translate(0, 1.0, -0.18).rotateX(0.08), color: d.mantle! });
      break;
    }
    case 'dionysus': {
      // The thyrsus (a fennel staff tipped with a pine cone) and a wine cup; a crown of vines and grapes.
      arm(R, RIGHT_STAFF, sleeve);
      arm(L, LEFT_FORE, sleeve);
      body.push(staff(RIGHT_STAFF, 1.7, 0.02, '#9aa84a', 0.02));
      body.push({ geo: new THREE.ConeGeometry(0.06, 0.16, 6).rotateX(Math.PI).translate(RIGHT_STAFF.x, 1.78, RIGHT_STAFF.z), color: '#4a7a2a' });
      body.push({ geo: cyl(0.06, 0.03, 0.06, 6).translate(LEFT_FORE.x, LEFT_FORE.y + 0.06, LEFT_FORE.z), color: GOLD });
      body.push({ geo: new THREE.TorusGeometry(0.12, 0.028, 4, 10).rotateX(Math.PI / 2).translate(0, 1.46, 0), color: '#4a8a2a' });
      for (const a of [0.8, 2.3, -0.8, -2.3]) body.push({ geo: ball(0.04).translate(Math.sin(a) * 0.12, 1.43, Math.cos(a) * 0.12), color: '#4a1a5a' });
      break;
    }
  }
  return { body, leg, hip };
}

/** Parts merged into one geometry with vertex colours (no finish: these are not buildings). */
function merge(parts: Part[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const colors: number[] = [];
  const c = new THREE.Color();
  for (const { geo, color } of parts) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const p = g.attributes.position as THREE.BufferAttribute;
    c.set(color);
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

interface Model {
  body: THREE.BufferGeometry;
  leg: THREE.BufferGeometry;
  hip: number;
  mat: THREE.MeshStandardMaterial;
  /** The glow's strength (raised as they arrive and leave). */
  glow: { value: number };
  triangles: number;
}

const models = new Map<GodId, Model>();

/** A god's model, made once: their parts, and a material that glows in their colour at the rim. */
function modelOf(g: GodId): Model {
  let m = models.get(g);
  if (m) return m;
  const { body, leg, hip } = figureParts(g);
  const scale = GOD_HEIGHT / 1.5;
  const bodyGeo = merge(body).scale(scale, scale, scale);
  const legGeo = merge(leg).scale(scale, scale, scale);
  const colour = new THREE.Color(GODS[g].colour);
  const glow = { value: 1 };
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.55, metalness: 0.05, emissive: colour.clone().lerp(new THREE.Color('#ffffff'), 0.5).multiplyScalar(0.16) });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRim = { value: colour };
    shader.uniforms.uGlow = glow;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRim;\nuniform float uGlow;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float rimF = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
        totalEmissiveRadiance = totalEmissiveRadiance * uGlow + uRim * (0.04 + 0.96 * rimF * rimF * rimF) * 0.75 * uGlow;`,
      );
  };
  mat.customProgramCacheKey = () => `god-${g}`;
  const tris = (bodyGeo.attributes.position.count + 2 * legGeo.attributes.position.count) / 3;
  m = { body: bodyGeo, leg: legGeo, hip: hip * scale, mat, glow, triangles: tris };
  models.set(g, m);
  return m;
}

// Slice 57: wrath in person: the god's figure darkened as a storm, their rim light a storm red.

/** The storm's colours: the robes darken towards a thundercloud; the rim and glow lean to a dark red. */
const STORM = new THREE.Color('#2a2834');
const STORM_LIGHT = '#c8281e';
const wrathModels = new Map<GodId, Model>();

/** The light a figure glows with: their colour, or in wrath a storm red with a little of theirs. */
function lightOf(f: GodFigure): THREE.ColorRepresentation {
  return f.why === 'wrath' ? new THREE.Color(STORM_LIGHT).lerp(new THREE.Color(GODS[f.god].colour), 0.2) : GODS[f.god].colour;
}

/** A god's figure in wrath, made once: their own parts darkened, glowing a storm red at the rim. */
function wrathModelOf(g: GodId): Model {
  let m = wrathModels.get(g);
  if (m) return m;
  const base = modelOf(g);
  const dark = (geo: THREE.BufferGeometry): THREE.BufferGeometry => {
    const out = geo.clone();
    const col = out.attributes.color as THREE.BufferAttribute | undefined;
    if (col) {
      const c = new THREE.Color();
      for (let i = 0; i < col.count; i++) {
        c.setRGB(col.getX(i), col.getY(i), col.getZ(i)).lerp(STORM, 0.8);
        col.setXYZ(i, c.r, c.g, c.b);
      }
    }
    return out;
  };
  const rim = new THREE.Color(STORM_LIGHT).lerp(new THREE.Color(GODS[g].colour), 0.2);
  const glow = { value: 1 };
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.7, metalness: 0.05, emissive: new THREE.Color('#0c0406') });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRim = { value: rim };
    shader.uniforms.uGlow = glow;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRim;\nuniform float uGlow;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float rimF = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
        totalEmissiveRadiance = totalEmissiveRadiance * uGlow + uRim * (0.01 + 0.99 * rimF * rimF * rimF * rimF) * 0.45 * uGlow;`,
      );
  };
  mat.customProgramCacheKey = () => `god-wrath-${g}`;
  m = { body: dark(base.body), leg: dark(base.leg), hip: base.hip, mat, glow, triangles: base.triangles };
  wrathModels.set(g, m);
  return m;
}

/** The triangles in each god's figure (for the probes and the budget). */
export function godTriangles(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const g of Object.keys(GODS) as GodId[]) out[g] = modelOf(g).triangles;
  return out;
}

// ---------------------------------------------------------------------------
// Textures, drawn once.

let dotTex: THREE.Texture | null = null;
/** A soft round dot of light: white at the heart, nothing at the edge. */
function dot(): THREE.Texture {
  if (dotTex) return dotTex;
  const n = 64;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.18)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, n, n);
  dotTex = new THREE.CanvasTexture(c);
  dotTex.colorSpace = THREE.SRGBColorSpace;
  return dotTex;
}

let ringTex: THREE.Texture | null = null;
/** A soft ring of light (a halo on the ground, a blessed place's rim). */
function ring(): THREE.Texture {
  if (ringTex) return ringTex;
  const n = 128;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  grad.addColorStop(0, 'rgba(255,255,255,0.35)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.45)');
  grad.addColorStop(0.8, 'rgba(255,255,255,1)');
  grad.addColorStop(0.9, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, n, n);
  ringTex = new THREE.CanvasTexture(c);
  ringTex.colorSpace = THREE.SRGBColorSpace;
  return ringTex;
}

let nimbusTex: THREE.Texture | null = null;
/** A halo about a head: a thin bright ring round a faint disc. */
function nimbus(): THREE.Texture {
  if (nimbusTex) return nimbusTex;
  const n = 128;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  grad.addColorStop(0, 'rgba(255,255,255,0.04)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.08)');
  grad.addColorStop(0.84, 'rgba(255,255,255,1)');
  grad.addColorStop(0.92, 'rgba(255,255,255,0.3)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, n, n);
  nimbusTex = new THREE.CanvasTexture(c);
  nimbusTex.colorSpace = THREE.SRGBColorSpace;
  return nimbusTex;
}

let shaftTex: THREE.Texture | null = null;
/** A shaft of light's sides: bright at the foot, fading up, softer at the edges. */
function shaftTexture(): THREE.Texture {
  if (shaftTex) return shaftTex;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 64, 0, 0);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 64);
  shaftTex = new THREE.CanvasTexture(c);
  shaftTex.colorSpace = THREE.SRGBColorSpace;
  return shaftTex;
}

const additive = (map: THREE.Texture, flat = false): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: flat ? THREE.DoubleSide : THREE.FrontSide, fog: false, toneMapped: false });

// ---------------------------------------------------------------------------
// The particle pool.

/** How a particle moves and looks. */
interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Pulled down (+) or up (-) a second, and slowed by drag each second (0..1). */
  grav: number;
  drag: number;
  size: number;
  /** Its size at the end of its life, as a share of its size at the start. */
  grow: number;
  r: number;
  g: number;
  b: number;
  born: number;
  life: number;
  /** A sideways sway (petals falling), its strength. */
  sway: number;
  /** Swirls round a centre at this speed (radians a second), if not 0. */
  swirl: number;
  cx: number;
  cz: number;
}

const POOL = 1600;

/** A bird circling or flying off (Athena's owl, Aphrodite's doves). */
interface Bird {
  x: number;
  y: number;
  z: number;
  r: number;
  a: number;
  speed: number;
  climb: number;
  born: number;
  life: number;
  size: number;
  color: THREE.Color;
  /** Spiralling outwards a second (doves fly off; the owl keeps its circle). */
  spread: number;
}

/** A shaft of light down from the sky (Apollo's sun, Artemis's moon). */
interface Shaft {
  mesh: THREE.Mesh;
  born: number;
  life: number;
  color: THREE.Color;
}

/** Zeus's lightning bolt, a jagged ribbon from the sky. */
interface Bolt {
  mesh: THREE.Mesh;
  born: number;
  life: number;
}

/** A figure as drawn. */
interface Shown {
  id: number;
  god: GodId;
  root: THREE.Group;
  body: THREE.Mesh;
  legs: [THREE.Group, THREE.Group];
  model: Model;
  /** Where it stood last frame (for the stride and the trail), and how far it has walked. */
  lx: number;
  lz: number;
  walked: number;
  nextStep: number;
  foot: number;
  state: string;
  /** Real time it was first seen, and when it began to leave (for the flourishes' light). */
  seen: number;
  /** Smoothed heading, so turns are slow and grand. */
  yaw: number;
  /** Real time of its last mote of light (blessing). */
  mote: number;
  /** Slice 57: the last tenth of a second a god in wrath struck lightning at the place. */
  struck?: number;
}

/** A footprint of light. */
interface Step {
  x: number;
  y: number;
  z: number;
  yaw: number;
  born: number;
  color: THREE.Color;
}
const TRAIL_LIFE = 5;
const TRAIL_MOST = 240;

export class GodsView {
  readonly group = new THREE.Group();
  /** Gods who arrived ('arrive') or began to leave ('leave') since the last frame: main.ts plays their stings. */
  readonly events: Array<{ god: GodId; kind: 'arrive' | 'leave' }> = [];
  /** Each figure's screen-pickable spot (its middle) and height, by figure id, as drawn this frame. */
  readonly at = new Map<number, { x: number; y: number; z: number; h: number }>();
  /** Where the ground is (bridges included): set by CityView. */
  ground: (x: number, z: number) => number;
  private readonly shown = new Map<number, Shown>();
  private readonly particles: Particle[] = [];
  private readonly sparks: THREE.InstancedMesh;
  private readonly halos: THREE.InstancedMesh;
  private readonly crowns: THREE.InstancedMesh;
  private readonly glows: THREE.InstancedMesh;
  private readonly trail: THREE.InstancedMesh;
  private readonly shimmer: THREE.InstancedMesh;
  private readonly birds: THREE.InstancedMesh;
  private readonly birdList: Bird[] = [];
  private readonly steps: Step[] = [];
  private readonly shafts: Shaft[] = [];
  private readonly bolts: Bolt[] = [];
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly p = new THREE.Vector3();
  private readonly sc = new THREE.Vector3();
  private readonly back = new THREE.Vector3();
  private readonly c = new THREE.Color();
  private readonly white = new THREE.Color('#ffffff');
  private readonly flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  private last = -1;
  private readonly blessedMotes = new Map<number, number>();
  /** Particles drawn last frame (for the probes). */
  drawnParticles = 0;

  constructor(private readonly map: CoastMap) {
    this.group.name = 'gods';
    this.ground = (x, z) => map.heightAt(x, z);
    const quad = new THREE.PlaneGeometry(1, 1);
    this.sparks = this.instanced(quad, additive(dot()), POOL, 'god-sparks');
    this.glows = this.instanced(quad, additive(dot()), 16, 'god-glows');
    this.halos = this.instanced(quad, additive(ring(), true), 16, 'god-halos');
    this.crowns = this.instanced(quad, additive(nimbus()), 16, 'god-crowns');
    this.trail = this.instanced(quad, additive(dot(), true), TRAIL_MOST, 'god-trail');
    this.shimmer = this.instanced(quad, additive(ring(), true), 64, 'god-shimmer');
    // A bird: a small body and two wings (a dozen triangles), lit, its colour by instance.
    const birdGeo = merge([
      { geo: ball(0.06).scale(0.8, 0.7, 1.6), color: '#ffffff' },
      { geo: new THREE.BufferGeometry().setFromPoints([V(0, 0, 0.05), V(0.28, 0.02, -0.02), V(0, 0, -0.08), V(0, 0, 0.05), V(0, 0, -0.08), V(-0.28, 0.02, -0.02)]), color: '#ffffff' },
    ]);
    const birdMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false });
    this.birds = this.instanced(birdGeo, birdMat, 24, 'god-birds');
  }

  private instanced(geo: THREE.BufferGeometry, mat: THREE.Material, n: number, name: string): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.name = name;
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this.group.add(mesh);
    return mesh;
  }

  /** The height a god stands at (on water, its surface). */
  private floor(x: number, z: number): number {
    const g = this.ground(x, z);
    const n = this.map.size;
    const tx = Math.floor(x);
    const tz = Math.floor(z);
    if (tx >= 0 && tz >= 0 && tx < n && tz < n && this.map.tileWater[tz * n + tx] !== 0) {
      const q = this.map.riverAt(x, z);
      const surface = q.d < q.width + 0.5 ? q.surface : 0;
      return Math.max(g, surface, 0);
    }
    return g;
  }

  /** What is drawn now (for the probes). */
  get drawn(): { gods: number; particles: number; steps: number; shimmer: number; birds: number } {
    return { gods: this.shown.size, particles: this.drawnParticles, steps: this.steps.length, shimmer: this.shimmer.count, birds: this.birds.count };
  }

  /** The figure nearest a screen point, by its body (from the feet to the head), within `most` pixels: its id, or 0. */
  pick(camera: THREE.Camera, rect: DOMRect, sx: number, sy: number, most = 26): number {
    let best = 0;
    let bd = most * most;
    const v = new THREE.Vector3();
    for (const [id, a] of this.at) {
      for (let k = 0; k <= 4; k++) {
        v.set(a.x, a.y + (a.h * k) / 4, a.z).project(camera);
        if (v.z > 1) continue;
        const dx = rect.left + (v.x * 0.5 + 0.5) * rect.width - sx;
        const dy = rect.top + (-v.y * 0.5 + 0.5) * rect.height - sy;
        const d = dx * dx + dy * dy;
        if (d < bd) [best, bd] = [id, d];
      }
    }
    return best;
  }

  /** Each frame: the figures where the sim has them (stepping between ticks by `alpha`), their light, the flourishes and the shimmer. */
  update(s: SimState, alpha: number, time: number, face: THREE.Quaternion): void {
    const dt = this.last < 0 ? 0 : Math.min(0.1, Math.max(0, time - this.last));
    this.last = time;
    const figures = s.gods.walks.figures;
    const live = new Set<number>();
    this.at.clear();
    for (const f of figures) {
      live.add(f.id);
      let v = this.shown.get(f.id);
      if (!v) {
        v = this.make(f, time);
        // (A god seen first as they arrive, or in a demo just opened: the flourish; one already walking, loaded from a save: none.)
        if (f.state === 'arriving' && s.tick - f.since < ARRIVE_TICKS) {
          this.flourish(f.god, f.x, this.floor(f.x, f.z), f.z, time, false);
          this.events.push({ god: f.god, kind: 'arrive' });
        }
      }
      if (f.state !== v.state) {
        if (f.state === 'leaving') {
          this.flourish(f.god, f.x, this.floor(f.x, f.z), f.z, time, true);
          this.events.push({ god: f.god, kind: 'leave' });
        }
        if (f.state === 'blessing') {
          const p = f.stops[f.at];
          // (Slice 57: a god come in wrath stands over the place in a storm, not a gold burst.)
          if (p) {
            if (f.why === 'wrath') this.stormBurst(p.x, p.z, time);
            else this.blessBurst(p.x, p.z, time);
          }
        }
        v.state = f.state;
      }
      this.place(s, f, v, alpha, time, dt);
    }
    for (const [id, v] of this.shown) {
      if (live.has(id)) continue;
      this.group.remove(v.root);
      this.shown.delete(id);
    }
    this.drawGlows(s, time, face);
    this.drawShimmer(s, time);
    this.drawTrail(time);
    this.stepParticles(time, dt, face);
    this.drawBirds(time, dt);
    this.drawShafts(time, face);
    this.drawBolts(time);
  }

  private make(f: GodFigure, time: number): Shown {
    const model = f.why === 'wrath' ? wrathModelOf(f.god) : modelOf(f.god); // (Slice 57: in wrath, the darker figure.)
    const root = new THREE.Group();
    root.name = `god-${f.god}`;
    const body = new THREE.Mesh(model.body, model.mat);
    body.castShadow = true;
    root.add(body);
    const legs: [THREE.Group, THREE.Group] = [new THREE.Group(), new THREE.Group()];
    for (const [i, side] of [-1, 1].entries()) {
      const leg = new THREE.Mesh(model.leg, model.mat);
      leg.castShadow = true;
      legs[i].add(leg);
      legs[i].position.set(side * 0.1 * (GOD_HEIGHT / 1.5), model.hip, 0);
      root.add(legs[i]);
    }
    this.group.add(root);
    const v: Shown = { id: f.id, god: f.god, root, body, legs, model, lx: f.x, lz: f.z, walked: 0, nextStep: 0.3, foot: 1, state: f.state, seen: time, yaw: f.heading, mote: 0 };
    this.shown.set(f.id, v);
    return v;
  }

  /** How risen a god is (0 under the ground, 1 standing): rising as they arrive, sinking as they leave. */
  private risen(s: SimState, f: GodFigure, alpha: number): number {
    const age = s.tick - f.since + alpha;
    const ease = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
    // (Zeus, Ares and Hermes come quick as lightning; the rest rise slowly with their flourish.)
    const quick = f.god === 'zeus' || f.god === 'ares' || f.god === 'hermes';
    if (f.state === 'arriving') return ease((age - ARRIVE_TICKS * (quick ? 0.12 : 0.1)) / (ARRIVE_TICKS * (quick ? 0.12 : 0.7)));
    if (f.state === 'leaving') return 1 - ease((age - LEAVE_TICKS * 0.25) / (LEAVE_TICKS * (quick ? 0.15 : 0.65)));
    return 1;
  }

  private place(s: SimState, f: GodFigure, v: Shown, alpha: number, time: number, dt: number): void {
    const x = f.px + (f.x - f.px) * alpha;
    const z = f.pz + (f.z - f.pz) * alpha;
    const y0 = this.floor(x, z);
    const moved = Math.hypot(x - v.lx, z - v.lz);
    v.lx = x;
    v.lz = z;
    if (moved < 1) v.walked += moved;
    // Turns are slow: the heading eases round.
    let dy = f.heading - v.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    v.yaw += dy * Math.min(1, dt * 2.5);
    const risen = this.risen(s, f, alpha);
    const walking = f.state === 'walking';
    // The stride: legs swing about the hip; the body rises at each step and sways a little.
    const phase = (v.walked / STRIDE) * Math.PI * 2;
    const swing = walking ? Math.sin(phase) * 0.38 : 0;
    v.legs[0].rotation.x = swing;
    v.legs[1].rotation.x = -swing;
    const bob = walking ? Math.abs(Math.cos(phase)) * 0.035 : Math.sin(time * 1.3 + f.id) * 0.01;
    v.body.rotation.z = walking ? Math.sin(phase) * 0.03 : 0;
    // Blessing: a slight bow towards the place.
    v.body.rotation.x = f.state === 'blessing' ? 0.12 : walking ? 0.03 : 0;
    const sink = (1 - risen) * GOD_HEIGHT * 1.05;
    v.root.position.set(x, y0 - sink + bob, z);
    v.root.rotation.y = v.yaw;
    v.root.visible = risen > 0.01;
    // Brighter as they arrive and leave, a slow pulse while they walk.
    v.model.glow.value = 1 + (1 - risen) * 2 + Math.sin(time * 1.7 + f.id) * 0.08;
    this.at.set(f.id, { x, y: y0 - sink, z, h: GOD_HEIGHT * risen });
    // Footprints of light, left and right.
    if (walking && v.walked >= v.nextStep) {
      v.nextStep = v.walked + STRIDE / 2;
      v.foot = -v.foot;
      const ox = Math.cos(v.yaw) * 0.12 * GROW * v.foot;
      const oz = -Math.sin(v.yaw) * 0.12 * GROW * v.foot;
      this.steps.push({ x: x + ox, y: this.floor(x + ox, z + oz) + 0.04, z: z + oz, yaw: v.yaw, born: time, color: new THREE.Color(GODS[f.god].colour) });
      if (this.steps.length > TRAIL_MOST) this.steps.shift();
    }
    // (Slice 57: a god in wrath: embers and storm-light about them, lightning at the place.)
    if (f.why === 'wrath') this.wrathAbout(f, v, x, y0, z, risen, time);
    // A blessing: motes of gold rising from the place.
    else if (f.state === 'blessing' && time - v.mote > 0.08) {
      v.mote = time;
      const p = f.stops[f.at];
      if (p) {
        const a = time * 7.3 + f.id;
        this.spawn({ x: p.x + Math.cos(a) * 1.2, y: this.floor(p.x, p.z) + 0.2, z: p.z + Math.sin(a) * 1.2, vx: 0, vy: 0.9, vz: 0, grav: -0.2, drag: 0.3, size: 0.22, grow: 0.3, color: 0xffd860, born: time, life: 1.8 });
      }
    }
  }

  /** A gold burst as a place is blessed. */
  private blessBurst(x: number, z: number, time: number): void {
    const y = this.floor(x, z);
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const sp = 1.2 + (i % 5) * 0.25;
      this.spawn({ x, y: y + 0.3, z, vx: Math.cos(a) * sp, vy: 1.4 + (i % 3) * 0.5, vz: Math.sin(a) * sp, grav: 1.4, drag: 1.2, size: 0.3, grow: 0.2, color: 0xffe080, born: time, life: 1.4 });
    }
  }

  // Slice 57: wrath in person.

  /** A god come in wrath: embers rising about them and a flicker of storm-light; standing over the place, lightning now and then. */
  private wrathAbout(f: GodFigure, v: Shown, x: number, y: number, z: number, risen: number, time: number): void {
    if (risen < 0.2 || time - v.mote < 0.07) return;
    v.mote = time;
    const a = time * 5.1 + f.id;
    const r = 0.7 * GROW;
    this.spawn({ x: x + Math.cos(a) * r, y: y + 0.2 + (time * 3.7) % (GOD_HEIGHT * 0.6), z: z + Math.sin(a) * r, vx: 0, vy: 0.8, vz: 0, grav: -0.1, drag: 0.4, size: 0.2, grow: 0.2, color: 0xff5a1e, born: time, life: 1.3 });
    if (f.state !== 'blessing') return;
    const p = f.stops[f.at];
    if (!p) return;
    // (A small fixed sequence: render only.)
    const k = Math.floor(time * 10);
    if (k % 23 === 0 && v.struck !== k) {
      v.struck = k;
      let h = (k * 2654435761 + f.id) >>> 0;
      const rnd = (): number => {
        h = (h * 1664525 + 1013904223) >>> 0;
        return h / 4294967296;
      };
      this.bolt(p.x + (rnd() - 0.5) * 2, this.floor(p.x, p.z), p.z + (rnd() - 0.5) * 2, time, rnd);
    }
    const b = time * 2.3 + f.id;
    this.spawn({ x: p.x + Math.cos(b) * 1.6, y: this.floor(p.x, p.z) + 0.3, z: p.z + Math.sin(b) * 1.6, vx: -Math.sin(b) * 0.6, vy: 0.4, vz: Math.cos(b) * 0.6, grav: 0, drag: 0.3, size: 0.35, grow: 0.6, color: 0x9a3cff, born: time, life: 1.1, swirl: 1.2, cx: p.x, cz: p.z });
  }

  /** A storm breaking over a place as a curse is about to land: dark red and violet sparks flung out, and a bolt. */
  private stormBurst(x: number, z: number, time: number): void {
    const y = this.floor(x, z);
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const sp = 1.4 + (i % 4) * 0.3;
      this.spawn({ x, y: y + 0.3, z, vx: Math.cos(a) * sp, vy: 0.8 + (i % 3) * 0.4, vz: Math.sin(a) * sp, grav: 1.2, drag: 1.4, size: 0.3, grow: 0.3, color: i % 3 ? 0xd8361a : 0x8a3cff, born: time, life: 1.2 });
    }
    let h = (Math.floor(x * 131 + z * 71) >>> 0) || 1;
    this.bolt(x, y, z, time, () => {
      h = (h * 1664525 + 1013904223) >>> 0;
      return h / 4294967296;
    });
  }

  // -------------------------------------------------------------------------
  // The flourishes.

  private spawn(o: { x: number; y: number; z: number; vx: number; vy: number; vz: number; grav: number; drag: number; size: number; grow: number; color: number | THREE.Color; born: number; life: number; sway?: number; swirl?: number; cx?: number; cz?: number }): void {
    const c = o.color instanceof THREE.Color ? o.color : this.c.set(o.color);
    const p: Particle = { x: o.x, y: o.y, z: o.z, vx: o.vx, vy: o.vy, vz: o.vz, grav: o.grav, drag: o.drag, size: o.size, grow: o.grow, r: c.r, g: c.g, b: c.b, born: o.born, life: o.life, sway: o.sway ?? 0, swirl: o.swirl ?? 0, cx: o.cx ?? o.x, cz: o.cz ?? o.z };
    if (this.particles.length >= POOL) this.particles.shift();
    this.particles.push(p);
  }

  /** A god's flourish at a spot: arriving, or (`out`) leaving, turned about. */
  flourish(g: GodId, x: number, y: number, z: number, time: number, out: boolean): void {
    const colour = new THREE.Color(GODS[g].colour);
    // Every god: a flash of their light where they stand.
    for (let i = 0; i < 3; i++) this.spawn({ x, y: y + 0.6 + i * 0.4, z, vx: 0, vy: 0, vz: 0, grav: 0, drag: 0, size: 3.2 - i * 0.6, grow: 1.6, color: colour, born: time + i * 0.05, life: 1.1 });
    // (A small fixed sequence for the spread: render only, any will do.)
    let h = (g.length * 7919 + (out ? 104729 : 0) + Math.floor(x * 31 + z * 17)) >>> 0;
    const rnd = (): number => {
      h = (h * 1664525 + 1013904223) >>> 0;
      return h / 4294967296;
    };
    const ringOut = (n: number, r: number, color: number, speed: number, up: number, size: number, life: number, grav = 0.6): void => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rnd() * 0.3;
        this.spawn({ x: x + Math.cos(a) * r, y: y + 0.15, z: z + Math.sin(a) * r, vx: Math.cos(a) * speed, vy: up * (0.6 + rnd() * 0.6), vz: Math.sin(a) * speed, grav, drag: 1.4, size, grow: 1.4, color, born: time + rnd() * 0.25, life: life * (0.7 + rnd() * 0.5) });
      }
    };
    const fall = (n: number, area: number, colors: number[], size: number, speed: number, life: number, sway: number): void => {
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2;
        const r = Math.sqrt(rnd()) * area;
        const top = y + 3 + rnd() * 3;
        this.spawn({ x: x + Math.cos(a) * r, y: out ? y + rnd() * 1.5 : top, z: z + Math.sin(a) * r, vx: 0, vy: out ? speed : -speed, vz: 0, grav: 0, drag: 0, size, grow: 0.8, color: colors[i % colors.length], born: time + rnd() * 1.4, life, sway });
      }
    };
    switch (g) {
      case 'zeus':
        this.bolt(x, y, z, time, rnd);
        this.bolt(x + 0.3, y, z - 0.2, time + 0.18, rnd);
        for (let i = 0; i < 4; i++) this.spawn({ x, y: y + 4, z, vx: 0, vy: 0, vz: 0, grav: 0, drag: 0, size: 14, grow: 1.2, color: 0xfff6c8, born: time + i * 0.11, life: 0.18 });
        ringOut(36, 0.3, 0xfff2a0, 4, 2.5, 0.22, 0.8, 3);
        break;
      case 'poseidon':
        // A column of spray, falling back about them.
        for (let i = 0; i < 140; i++) {
          const a = rnd() * Math.PI * 2;
          const sp = 0.4 + rnd() * 1.6;
          this.spawn({ x: x + Math.cos(a) * 0.4, y: y + 0.1, z: z + Math.sin(a) * 0.4, vx: Math.cos(a) * sp, vy: 3 + rnd() * 4.5, vz: Math.sin(a) * sp, grav: 4.5, drag: 0.4, size: 0.25 + rnd() * 0.35, grow: 1.8, color: i % 3 ? 0xd8f4ff : 0x6ad0d8, born: time + rnd() * 1.4, life: 1.6 + rnd() * 0.6 });
        }
        break;
      case 'demeter':
        fall(130, 4.5, [0xffd870, 0xf2a0b8, 0xfff0c0, 0xe8b040], 0.16, 0.7, 4.5, 0.6);
        ringOut(30, 0.5, 0xffe08a, 1.2, 0.4, 0.4, 1.8, 0);
        break;
      case 'athena':
        this.bird(x, y + GOD_HEIGHT + 0.6, z, 1.6, 2.2, 0, time, out ? 2.5 : 5, 0.9, 0x9a8a72, 0);
        ringOut(40, 0.4, 0xd8e2e8, 1.6, 1.2, 0.3, 1.6, 0.4);
        break;
      case 'apollo':
        this.shaft(x, y, z, 1.2, time, 3.2, 0xffe070);
        ringOut(40, 0.4, 0xffe070, 1.8, 2, 0.28, 1.4, 1);
        break;
      case 'artemis':
        this.shaft(x, y, z, 1.0, time, 3.4, 0xc8d8ff);
        // Silver arrows falling round her.
        for (let i = 0; i < 18; i++) {
          const a = rnd() * Math.PI * 2;
          const r = 1 + rnd() * 2.5;
          this.spawn({ x: x + Math.cos(a) * r, y: y + 6 + rnd() * 3, z: z + Math.sin(a) * r, vx: 0, vy: -9, vz: 0, grav: 0, drag: 0, size: 0.18, grow: 1, color: 0xf0f4ff, born: time + rnd() * 1.2, life: 0.75 });
        }
        fall(40, 3, [0xd8e4ff], 0.12, 0.4, 3, 0.2);
        break;
      case 'ares':
        // A crash of bronze: sparks out, and a ring of dust rolling away.
        ringOut(60, 0.3, 0xffb050, 5, 2.4, 0.18, 0.7, 4);
        for (let i = 0; i < 46; i++) {
          const a = (i / 46) * Math.PI * 2;
          this.spawn({ x: x + Math.cos(a) * 0.6, y: y + 0.15, z: z + Math.sin(a) * 0.6, vx: Math.cos(a) * 2.6, vy: 0.3, vz: Math.sin(a) * 2.6, grav: 0, drag: 1.6, size: 0.7, grow: 2.4, color: 0x6a4a2a, born: time + 0.05, life: 1.8 });
        }
        for (let i = 0; i < 3; i++) this.spawn({ x, y: y + 1, z, vx: 0, vy: 0, vz: 0, grav: 0, drag: 0, size: 6, grow: 1.4, color: 0xff7040, born: time + i * 0.08, life: 0.25 });
        break;
      case 'aphrodite':
        for (let i = 0; i < 90; i++) {
          const a = rnd() * Math.PI * 2;
          const r = 0.6 + rnd() * 1.8;
          this.spawn({ x: x + Math.cos(a) * r, y: y + 0.2 + rnd() * 2.2, z: z + Math.sin(a) * r, vx: 0, vy: out ? 0.6 : 0.25, vz: 0, grav: 0, drag: 0, size: 0.17, grow: 0.8, color: i % 3 ? 0xff7aa0 : 0xffd0e0, born: time + rnd() * 1.6, life: 2.6, swirl: 1.6, cx: x, cz: z });
        }
        for (let i = 0; i < 6; i++) this.bird(x, y + 1.2 + i * 0.25, z, 0.6 + i * 0.15, 2.2 + i * 0.2, (i / 6) * Math.PI * 2, time + i * 0.1, 3.5, 0.55, 0xffffff, 1.1);
        break;
      case 'hephaestus':
        for (let i = 0; i < 150; i++) {
          const a = rnd() * Math.PI * 2;
          const sp = 1 + rnd() * 3.5;
          this.spawn({ x, y: y + 0.4, z, vx: Math.cos(a) * sp, vy: 2 + rnd() * 5, vz: Math.sin(a) * sp, grav: 7, drag: 0.3, size: 0.12 + rnd() * 0.12, grow: 0.4, color: i % 4 ? 0xffa030 : 0xfff0a0, born: time + rnd() * 0.9, life: 0.9 + rnd() * 0.7 });
        }
        for (let i = 0; i < 2; i++) this.spawn({ x, y: y + 0.6, z, vx: 0, vy: 0, vz: 0, grav: 0, drag: 0, size: 5, grow: 1.5, color: 0xff6a20, born: time + i * 0.1, life: 0.35 });
        break;
      case 'hermes':
        // A flash, and white wings beating out: a fan of feathers either side.
        for (let i = 0; i < 2; i++) this.spawn({ x, y: y + 1, z, vx: 0, vy: 0, vz: 0, grav: 0, drag: 0, size: 7, grow: 0.5, color: 0xffffff, born: time + i * 0.07, life: 0.3 });
        for (const side of [-1, 1]) {
          for (let i = 0; i < 26; i++) {
            const a = (i / 26) * 1.6 - 0.3;
            this.spawn({ x, y: y + 0.9, z, vx: side * Math.cos(a) * 3, vy: Math.sin(a) * 3 + 0.6, vz: (rnd() - 0.5) * 0.6, grav: 0.8, drag: 2.2, size: 0.24, grow: 0.6, color: 0xf4fbff, born: time + 0.05, life: 1.2 });
          }
        }
        ringOut(24, 0.2, 0x8ad8ff, 3, 0.4, 0.2, 0.6, 0);
        break;
      case 'dionysus':
        // A ring of vines springing up, and a wine-dark mist.
        for (let i = 0; i < 48; i++) {
          const a = (i / 48) * Math.PI * 2;
          this.spawn({ x: x + Math.cos(a) * 2.2, y: y + 0.05, z: z + Math.sin(a) * 2.2, vx: 0, vy: 0.8 + (i % 3) * 0.2, vz: 0, grav: 0.6, drag: 0.8, size: 0.28, grow: 1.2, color: i % 4 ? 0x5aa83a : 0x8a2a8a, born: time + (i / 48) * 0.8, life: 2.6 });
        }
        for (let i = 0; i < 26; i++) {
          const a = rnd() * Math.PI * 2;
          const r = rnd() * 2;
          this.spawn({ x: x + Math.cos(a) * r, y: y + 0.3, z: z + Math.sin(a) * r, vx: Math.cos(a) * 0.3, vy: 0.2, vz: Math.sin(a) * 0.3, grav: 0, drag: 0.2, size: 1.3, grow: 2, color: 0x4a1a4a, born: time + rnd() * 0.8, life: 3.2 });
        }
        break;
      case 'hera':
        // A peacock's fan of light behind her: rays of blue, green and gold, each tipped with an eye.
        for (let i = 0; i < 15; i++) {
          const a = Math.PI * (0.12 + (0.76 * i) / 14);
          for (let k = 1; k <= 6; k++) {
            const r = k * 0.42;
            this.spawn({ x: x + Math.cos(a) * r * 0.3, y: y + 0.8 + Math.sin(a) * r, z: z + Math.cos(a) * r * 0.85, vx: 0, vy: 0, vz: 0, grav: 0, drag: 0, size: k === 6 ? 0.55 : 0.22, grow: 1.1, color: k === 6 ? 0x2a6aff : k % 2 ? 0x2abf9a : 0xf0c040, born: time + k * 0.08 + i * 0.02, life: 2.4 });
          }
        }
        break;
    }
  }

  private bolt(x: number, y: number, z: number, time: number, rnd: () => number): void {
    // A jagged ribbon from high above down to the spot (a few segments, turned to face across the view).
    const pts: THREE.Vector3[] = [];
    const top = y + 22;
    let px = x + (rnd() - 0.5) * 3;
    let pz = z + (rnd() - 0.5) * 3;
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const jx = i === 10 ? 0 : (rnd() - 0.5) * 1.6 * (1 - t * 0.6);
      const jz = i === 10 ? 0 : (rnd() - 0.5) * 1.6 * (1 - t * 0.6);
      px = x + (px - x) * (1 - t) + jx;
      pz = z + (pz - z) * (1 - t) + jz;
      pts.push(new THREE.Vector3(i === 10 ? x : px, top + (y - top) * t, i === 10 ? z : pz));
    }
    const pos: number[] = [];
    const w = 0.16;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      // Two crossed quads per segment, so it reads from any side.
      for (const [ox, oz] of [
        [w, 0],
        [0, w],
      ]) {
        pos.push(a.x - ox, a.y, a.z - oz, a.x + ox, a.y, a.z + oz, b.x + ox, b.y, b.z + oz);
        pos.push(a.x - ox, a.y, a.z - oz, b.x + ox, b.y, b.z + oz, b.x - ox, b.y, b.z - oz);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const mat = new THREE.MeshBasicMaterial({ color: 0xfffbe0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, toneMapped: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.visible = false;
    this.group.add(mesh);
    this.bolts.push({ mesh, born: time, life: 0.55 });
  }

  private shaft(x: number, y: number, z: number, r: number, time: number, life: number, color: number): void {
    const geo = new THREE.CylinderGeometry(r * 0.7, r, 24, 16, 1, true).translate(0, 12, 0);
    const mat = additive(shaftTexture(), true);
    mat.color.set(color);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.frustumCulled = false;
    this.group.add(mesh);
    this.shafts.push({ mesh, born: time, life, color: new THREE.Color(color) });
  }

  private bird(x: number, y: number, z: number, r: number, speed: number, a: number, time: number, life: number, size: number, color: number, spread: number): void {
    if (this.birdList.length >= 24) this.birdList.shift();
    this.birdList.push({ x, y, z, r, a, speed, climb: spread ? 0.6 : 0, born: time, life, size, color: new THREE.Color(color), spread });
  }

  private stepParticles(time: number, dt: number, face: THREE.Quaternion): void {
    let n = 0;
    const keep: Particle[] = [];
    for (const p of this.particles) {
      const age = time - p.born;
      if (age > p.life) continue;
      keep.push(p);
      if (age < 0) continue;
      if (dt > 0) {
        const k = Math.max(0, 1 - p.drag * dt);
        p.vx *= k;
        p.vz *= k;
        p.vy = p.vy * k - p.grav * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        if (p.swirl) {
          const dx = p.x - p.cx;
          const dz = p.z - p.cz;
          const a = p.swirl * dt;
          p.x = p.cx + dx * Math.cos(a) - dz * Math.sin(a);
          p.z = p.cz + dx * Math.sin(a) + dz * Math.cos(a);
        }
      }
      if (n >= POOL) continue;
      const t = age / p.life;
      const sway = p.sway ? Math.sin(time * 2.3 + p.born * 13) * p.sway : 0;
      // Fades in quickly and out over its last part.
      const fade = Math.min(1, t * 8) * (1 - t * t);
      const size = p.size * (1 + (p.grow - 1) * t);
      this.p.set(p.x + sway, p.y, p.z + sway * 0.6);
      this.sc.set(size, size, size);
      this.m.compose(this.p, face, this.sc);
      this.sparks.setMatrixAt(n, this.m);
      this.c.setRGB(p.r * fade, p.g * fade, p.b * fade);
      this.sparks.setColorAt(n, this.c);
      n++;
    }
    this.particles.length = 0;
    this.particles.push(...keep);
    this.sparks.count = n;
    this.drawnParticles = n;
    if (n) {
      this.sparks.instanceMatrix.needsUpdate = true;
      if (this.sparks.instanceColor) this.sparks.instanceColor.needsUpdate = true;
    }
  }

  private drawGlows(s: SimState, time: number, face: THREE.Quaternion): void {
    let n = 0;
    for (const f of s.gods.walks.figures) {
      const at = this.at.get(f.id);
      if (!at || n >= 16) continue;
      const risen = at.h / GOD_HEIGHT;
      const colour = this.c.set(lightOf(f)); // (Slice 57: in wrath, a storm red.)
      const pulse = 0.85 + Math.sin(time * 1.7 + f.id) * 0.1;
      // The halo on the ground.
      const hy = this.floor(at.x, at.z) + 0.06;
      this.sc.setScalar(2.6 * GROW);
      this.p.set(at.x, hy, at.z);
      this.m.compose(this.p, this.flat, this.sc);
      this.halos.setMatrixAt(n, this.m);
      this.halos.setColorAt(n, this.c.copy(colour).multiplyScalar((f.why === 'wrath' ? 0.3 : 0.55) * pulse * Math.max(0.3, risen)));
      // The glow behind them, at their middle.
      this.c.set(lightOf(f));
      this.sc.set(2.5, 3.2, 1).multiplyScalar(GOD_HEIGHT / 1.5);
      // (Set back from the eye, so it glows behind the figure rather than washing over it.)
      this.back.set(0, 0, -0.9).applyQuaternion(face);
      this.p.set(at.x + this.back.x, at.y + GOD_HEIGHT * 0.55 + this.back.y, at.z + this.back.z);
      this.m.compose(this.p, face, this.sc);
      this.glows.setMatrixAt(n, this.m);
      this.glows.setColorAt(n, this.c.multiplyScalar((f.why === 'wrath' ? 0.05 : 0.2) * pulse * Math.max(0.15, risen)));
      // The halo about the head, facing the eye.
      this.sc.setScalar(0.46 * (GOD_HEIGHT / 1.5));
      this.back.set(0, 0, -0.25).applyQuaternion(face);
      this.p.set(at.x + this.back.x, at.y + at.h * 0.93 + this.back.y, at.z + this.back.z);
      this.m.compose(this.p, face, this.sc);
      this.crowns.setMatrixAt(n, this.m);
      this.crowns.setColorAt(n, this.c.set(lightOf(f)).lerp(this.white, f.why === 'wrath' ? 0.15 : 0.55).multiplyScalar((f.why === 'wrath' ? 0.6 : 0.95) * pulse * risen));
      n++;
    }
    for (const mesh of [this.halos, this.glows, this.crowns]) {
      mesh.count = n;
      if (n) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    }
  }

  private drawShimmer(s: SimState, time: number): void {
    let n = 0;
    for (const x of s.gods.walks.blessed) {
      if (x.until <= s.tick || n >= 64) continue;
      const b = findBuilding(s, x.id);
      if (!b) continue;
      const [cx, cz] = centreOf(b);
      const side = footSide(b);
      const y = this.floor(cx, cz) + 0.05;
      const pulse = 0.75 + Math.sin(time * 1.4 + x.id * 0.7) * 0.25;
      this.sc.set(side + 0.9, side + 0.9, 1);
      this.p.set(cx, y, cz);
      this.m.compose(this.p, this.flat, this.sc);
      this.shimmer.setMatrixAt(n, this.m);
      this.shimmer.setColorAt(n, this.c.setRGB(1, 0.78, 0.32).multiplyScalar(0.55 * pulse));
      n++;
      // A mote of gold rising now and then.
      const last = this.blessedMotes.get(x.id) ?? 0;
      if (time - last > 0.35) {
        this.blessedMotes.set(x.id, time);
        const a = time * 3.1 + x.id * 1.7;
        const r = side * 0.45;
        this.spawn({ x: cx + Math.cos(a) * r, y: y + 0.1, z: cz + Math.sin(a) * r, vx: 0, vy: 0.55, vz: 0, grav: 0, drag: 0.2, size: 0.16, grow: 0.4, color: 0xffd860, born: time, life: 2.2 });
      }
    }
    this.shimmer.count = n;
    if (n) {
      this.shimmer.instanceMatrix.needsUpdate = true;
      if (this.shimmer.instanceColor) this.shimmer.instanceColor.needsUpdate = true;
    }
  }

  private drawTrail(time: number): void {
    while (this.steps.length && time - this.steps[0].born > TRAIL_LIFE) this.steps.shift();
    let n = 0;
    for (const st of this.steps) {
      const t = (time - st.born) / TRAIL_LIFE;
      this.e.set(-Math.PI / 2, 0, st.yaw);
      this.q.setFromEuler(this.e);
      this.sc.set(0.32 * GROW, 0.5 * GROW, 1);
      this.p.set(st.x, st.y, st.z);
      this.m.compose(this.p, this.q, this.sc);
      this.trail.setMatrixAt(n, this.m);
      this.trail.setColorAt(n, this.c.copy(st.color).multiplyScalar(0.9 * (1 - t)));
      n++;
    }
    this.trail.count = n;
    if (n) {
      this.trail.instanceMatrix.needsUpdate = true;
      if (this.trail.instanceColor) this.trail.instanceColor.needsUpdate = true;
    }
  }

  private drawBirds(time: number, dt: number): void {
    let n = 0;
    for (let i = this.birdList.length - 1; i >= 0; i--) if (time - this.birdList[i].born > this.birdList[i].life) this.birdList.splice(i, 1);
    for (const b of this.birdList) {
      const age = time - b.born;
      if (age < 0) continue;
      b.a += b.speed * dt;
      b.r += b.spread * dt;
      b.y += b.climb * dt;
      const flap = Math.sin(time * (b.spread ? 16 : 7)) * 0.5;
      this.p.set(b.x + Math.cos(b.a) * b.r, b.y, b.z + Math.sin(b.a) * b.r);
      // Facing along its circle, wings beating.
      this.e.set(0, -b.a, flap, 'YXZ');
      this.q.setFromEuler(this.e);
      const fade = Math.min(1, age * 3, (b.life - age) * 2);
      const sz = b.size * Math.max(0.01, fade) * (GOD_HEIGHT / 1.5) * 1.6;
      this.sc.set(sz, sz, sz);
      this.m.compose(this.p, this.q, this.sc);
      this.birds.setMatrixAt(n, this.m);
      this.birds.setColorAt(n, b.color);
      n++;
    }
    this.birds.count = n;
    if (n) {
      this.birds.instanceMatrix.needsUpdate = true;
      if (this.birds.instanceColor) this.birds.instanceColor.needsUpdate = true;
    }
  }

  private drawShafts(time: number, face: THREE.Quaternion): void {
    void face;
    for (let i = this.shafts.length - 1; i >= 0; i--) {
      const sh = this.shafts[i];
      const t = (time - sh.born) / sh.life;
      if (t >= 1) {
        this.group.remove(sh.mesh);
        sh.mesh.geometry.dispose();
        (sh.mesh.material as THREE.Material).dispose();
        this.shafts.splice(i, 1);
        continue;
      }
      const a = Math.min(1, t * 5) * (1 - t) * (1 - t);
      ((sh.mesh.material as THREE.MeshBasicMaterial).color as THREE.Color).copy(sh.color).multiplyScalar(0.9 * a);
    }
  }

  private drawBolts(time: number): void {
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      const age = time - b.born;
      if (age > b.life) {
        this.group.remove(b.mesh);
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.Material).dispose();
        this.bolts.splice(i, 1);
        continue;
      }
      // Flickering: on, off, on again, fading.
      b.mesh.visible = age >= 0 && (age < 0.09 || (age > 0.15 && age < 0.3) || (age > 0.36 && age < 0.55));
      ((b.mesh.material as THREE.MeshBasicMaterial).color as THREE.Color).setRGB(1, 0.98, 0.85).multiplyScalar(1 - Math.max(0, age) / b.life + 0.3);
    }
  }
}
