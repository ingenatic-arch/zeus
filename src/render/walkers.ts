import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { hash2 } from '../map/noise';
import { CITY_IDS, PLACES } from '../map/greece';
import { CHEESE, FLEECE, MEAT, OIL, WHEAT, WINE } from '../sim/foods';
import { TRADE_GOODS } from '../sim/trade';
import { FALLEN_LIE } from '../sim/army';
import { purseTotal } from '../sim/taxes';
import { speedOf } from '../sim/walk';
import type { SimState, Walker } from '../sim/state';
import { type FolkLooks, type Look, STRIDE } from './looks';
import { col, PAL } from './palette';
import { finishOn } from './finish';
import { finishParts } from './folkFinish';
import { lumpy } from './trees';
// Slice 36: estates' porters and grooms.
import { ARMOUR, HORSES, MARBLE } from '../sim/foods';
import { groomModel } from './estates';
// Slice 41
import { MINGLE_SPEED, THIEF_SPEED } from '../sim/crime';
// Slice 45.
import { PATROL_SPEED } from '../sim/walk';
import { CONVICT_ROPE, CONVICT_TUNIC } from './justice';
// Slice 49
import { BEARER_SPEED } from '../sim/health';
import { CARRIER_SPEED } from '../sim/walk';
import { BEARER_TUNIC, BLANKET, LITTER_CLOTH, PHYSICIAN_ROBE, PHYSICIAN_SASH, type HealthFigures } from './health';
// Slice 53: the gods' colours (a dedicated shrine's priestess, a procession, an offering's porter).
import { GOD_IDS, GODS } from '../sim/pantheon';
import { findBuilding } from '../sim/buildings';

/** Slice 49: how far behind one of the caught his watchman walks. */
const ESCORT_STEP = 0.34;

/** Space between people walking in a line. */
const SPACING = 0.36;
/** A caravan's string: its drover ahead, his donkeys behind him. */
const DROVER_GAP = 0.32;
const DONKEY_SPACING = 0.34;

/**
 * A part of a walker's model. `leg` makes it a leg that swings as she walks:
 * [how far and which way it swings (+1, -1; less for an ox), the hip's x, the hip's height].
 */
export type TPart = { geo: THREE.BufferGeometry; color: string; tint?: boolean; leg?: [number, number, number] };

export { STRIDE };

/** Merge parts into one geometry with colours, a tint mask (1 where the per-person colour applies: the tunic) and the legs that swing. */
export function mergeTinted(parts: TPart[]): THREE.BufferGeometry {
  // The city's finish: the figure kit in place of the plain shapes (folkFinish.ts).
  if (finishOn()) parts = finishParts(parts);
  const pos: number[] = [];
  const colors: number[] = [];
  const tint: number[] = [];
  const legs: number[] = [];
  for (const { geo, color, tint: t, leg } of parts) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const p = g.attributes.position as THREE.BufferAttribute;
    const c = t ? new THREE.Color(1, 1, 1) : col(color);
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      colors.push(c.r, c.g, c.b);
      tint.push(t ? 1 : 0);
      legs.push(...(leg ?? [0, 0, 0]));
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  out.setAttribute('aTint', new THREE.Float32BufferAttribute(tint, 1));
  out.setAttribute('aLeg', new THREE.Float32BufferAttribute(legs, 3));
  out.computeVertexNormals();
  out.computeBoundingSphere();
  return out;
}

/** A little person, about 0.42 tall, facing +x, carrying a bundle on the head or the back. */
function person(load: 'head' | 'back'): THREE.BufferGeometry {
  const parts: TPart[] = [
    { geo: new THREE.CylinderGeometry(0.02, 0.018, 0.12, 4).translate(0, 0.06, 0.03), color: PAL.skin, leg: [1, 0, 0.12] },
    { geo: new THREE.CylinderGeometry(0.02, 0.018, 0.12, 4).translate(0, 0.06, -0.03), color: PAL.skin, leg: [-1, 0, 0.12] },
    { geo: new THREE.CylinderGeometry(0.055, 0.085, 0.21, 6).translate(0, 0.205, 0), color: '', tint: true },
    // Arms swing against the legs.
    { geo: new THREE.CylinderGeometry(0.016, 0.014, 0.15, 4).rotateX(0.18).translate(0, 0.23, 0.07), color: PAL.skin, leg: [-0.55, 0, 0.3] },
    { geo: new THREE.CylinderGeometry(0.016, 0.014, 0.15, 4).rotateX(-0.18).translate(0, 0.23, -0.07), color: PAL.skin, leg: [0.55, 0, 0.3] },
    { geo: new THREE.IcosahedronGeometry(0.058, 0).translate(0.005, 0.365, 0), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.06, 0).scale(1, 0.7, 1).translate(-0.012, 0.39, 0), color: PAL.hair },
  ];
  if (load === 'head') {
    parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.075, 0), 0.3, 51).scale(1.1, 0.6, 1).translate(0, 0.45, 0), color: PAL.bundleCream });
    // An arm up to steady it.
    parts.push({ geo: new THREE.CylinderGeometry(0.014, 0.014, 0.16, 4).translate(0.0, 0.36, 0.075), color: PAL.skin });
  } else {
    parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.08, 0), 0.3, 52).scale(0.8, 1, 1).translate(-0.085, 0.26, 0), color: PAL.bundleBlue });
  }
  return mergeTinted(parts);
}

/**
 * The water carrier: a woman in a long dress (the tinted part) with a pale
 * shawl, a terracotta water jar on her head and one arm raised to steady it.
 */
function carrier(): THREE.BufferGeometry {
  const jar = [
    new THREE.Vector2(0.0, 0),
    new THREE.Vector2(0.035, 0.005),
    new THREE.Vector2(0.07, 0.05),
    new THREE.Vector2(0.06, 0.1),
    new THREE.Vector2(0.025, 0.125),
    new THREE.Vector2(0.032, 0.15),
  ];
  const parts: TPart[] = [
    // A long dress to the ground, flaring a little.
    { geo: new THREE.CylinderGeometry(0.05, 0.095, 0.3, 7).translate(0, 0.16, 0), color: '', tint: true },
    { geo: new THREE.CylinderGeometry(0.062, 0.056, 0.05, 7).translate(0, 0.3, 0), color: PAL.carrierShawl },
    { geo: new THREE.CylinderGeometry(0.016, 0.014, 0.15, 4).rotateX(-0.2).translate(0.01, 0.23, -0.07), color: PAL.skin },
    // The arm up to the jar.
    { geo: new THREE.CylinderGeometry(0.014, 0.014, 0.17, 4).rotateX(0.25).translate(0.0, 0.37, 0.07), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.056, 0).translate(0.005, 0.36, 0), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.058, 0).scale(1, 0.72, 1).translate(-0.014, 0.385, 0), color: PAL.hair },
    // A little pad and the jar, lying a touch sideways like a hydria.
    { geo: new THREE.CylinderGeometry(0.04, 0.04, 0.015, 6).translate(0, 0.42, 0), color: PAL.carrierShawl },
    { geo: new THREE.LatheGeometry(jar, 7).scale(1.4, 1.35, 1.4).rotateZ(0.12).translate(0, 0.425, 0), color: PAL.pot },
  ];
  return mergeTinted(parts);
}

/**
 * The food vendor: a woman in a saffron dress (the tinted part) with a pale
 * headscarf, carrying a wide flat basket of round loaves on her head
 * (`mixed`: loaves, a ham and a cheese, when her stall has meat or cheese).
 */
function vendor(mixed: boolean): THREE.BufferGeometry {
  const parts: TPart[] = [
    { geo: new THREE.CylinderGeometry(0.05, 0.095, 0.3, 7).translate(0, 0.16, 0), color: '', tint: true },
    { geo: new THREE.CylinderGeometry(0.03, 0.04, 0.1, 7, 1, true).translate(0, 0.3, 0), color: PAL.vendorScarf },
    { geo: new THREE.CylinderGeometry(0.016, 0.014, 0.15, 4).rotateX(-0.2).translate(0.01, 0.23, -0.07), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.014, 0.014, 0.17, 4).rotateX(0.25).translate(0.0, 0.37, 0.07), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.056, 0).translate(0.005, 0.36, 0), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.06, 0).scale(1, 0.72, 1).translate(-0.014, 0.385, 0), color: PAL.vendorScarf },
    // The basket and its loaves.
    { geo: new THREE.CylinderGeometry(0.115, 0.08, 0.04, 8).translate(0, 0.435, 0), color: PAL.basket },
  ];
  if (mixed) {
    // Loaves, a ham and a wheel of cheese.
    for (const [x, z] of [[0.05, 0.04], [-0.05, 0.05], [0.06, -0.04]]) parts.push({ geo: new THREE.IcosahedronGeometry(0.035, 0).scale(1, 0.6, 1).translate(x, 0.47, z), color: PAL.loaf });
    parts.push({ geo: new THREE.IcosahedronGeometry(0.04, 0).scale(1.4, 0.75, 0.9).rotateY(0.6).translate(-0.04, 0.475, -0.04), color: PAL.meat });
    parts.push({ geo: new THREE.CylinderGeometry(0.008, 0.008, 0.05, 4).rotateZ(Math.PI / 2).rotateY(0.6).translate(-0.1, 0.48, 0.0), color: PAL.bone });
    parts.push({ geo: new THREE.CylinderGeometry(0.042, 0.042, 0.035, 8).translate(0.0, 0.47, 0.0), color: PAL.cheese });
  } else {
    for (const [x, z] of [[0.04, 0.03], [-0.04, 0.04], [0.0, -0.05], [-0.06, -0.02], [0.06, -0.03]]) {
      parts.push({ geo: new THREE.IcosahedronGeometry(0.035, 0).scale(1, 0.6, 1).translate(x, 0.47, z), color: PAL.loaf });
    }
  }
  return mergeTinted(parts);
}

/**
 * A jar of oil, standing, `h` tall, its foot at the origin: a round terracotta
 * body, a narrow neck and a pale-green seal. Kept to few corners (about 170
 * vertices): the oil cart carries six and the porter three, and every look in
 * a merged mesh is padded to its biggest one (see looks.ts).
 */
export function oilJar(h: number, seal = true): TPart[] {
  const k = h / 0.15;
  const body = [
    new THREE.Vector2(0.0, 0),
    new THREE.Vector2(0.045, 0.012),
    new THREE.Vector2(0.055, 0.07),
    new THREE.Vector2(0.022, 0.122),
    new THREE.Vector2(0.026, 0.15),
  ];
  const parts: TPart[] = [{ geo: new THREE.LatheGeometry(body, 5).scale(k, k, k), color: PAL.oilJar }];
  if (seal) parts.push({ geo: new THREE.CylinderGeometry(0.024 * k, 0.02 * k, 0.018 * k, 4).translate(0, 0.152 * k, 0), color: PAL.oilSeal });
  return parts;
}

/** Parts moved as one. */
const moved = (parts: TPart[], f: (g: THREE.BufferGeometry) => THREE.BufferGeometry): TPart[] => parts.map((p) => ({ ...p, geo: f(p.geo) }));

/**
 * The oil vendor: a woman in an olive-green dress (the tinted part) and a
 * pale headscarf, a wooden yoke across her shoulders with a jar of oil
 * hanging from each end, her hands up steadying it.
 */
function oilVendor(): THREE.BufferGeometry {
  const parts: TPart[] = [
    { geo: new THREE.CylinderGeometry(0.05, 0.095, 0.3, 7).translate(0, 0.16, 0), color: '', tint: true },
    { geo: new THREE.CylinderGeometry(0.03, 0.04, 0.1, 7, 1, true).translate(0, 0.3, 0), color: PAL.oilVendorScarf },
    { geo: new THREE.IcosahedronGeometry(0.056, 0).translate(0.005, 0.36, 0), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.06, 0).scale(1, 0.72, 1).translate(-0.014, 0.385, 0), color: PAL.oilVendorScarf },
    // The yoke across her shoulders, bowed a little, and both arms up to it.
    { geo: new THREE.CylinderGeometry(0.011, 0.011, 0.5, 4).rotateX(Math.PI / 2).translate(-0.01, 0.315, 0), color: PAL.wood },
    { geo: new THREE.CylinderGeometry(0.015, 0.014, 0.13, 4).rotateX(0.5).translate(0.02, 0.27, 0.085), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.015, 0.014, 0.13, 4).rotateX(-0.5).translate(0.02, 0.27, -0.085), color: PAL.skin },
  ];
  for (const z of [-0.22, 0.22]) {
    // A cord down from the yoke's end to the jar's neck.
    parts.push({ geo: new THREE.CylinderGeometry(0.004, 0.004, 0.09, 3).translate(-0.01, 0.27, z), color: PAL.woodDark });
    parts.push(...moved(oilJar(0.15), (g) => g.translate(-0.01, 0.075, z)));
  }
  return mergeTinted(parts);
}

/**
 * An amphora of wine, standing, `h` tall, its pointed foot at the origin:
 * taller and slimmer than an oil jar, with two handles and a dark wine-red
 * seal. Few corners (about 230 vertices): carts carry four.
 */
export function amphora(h: number): TPart[] {
  const k = h / 0.2;
  const body = [
    new THREE.Vector2(0.0, 0),
    new THREE.Vector2(0.018, 0.02),
    new THREE.Vector2(0.05, 0.09),
    new THREE.Vector2(0.044, 0.145),
    new THREE.Vector2(0.018, 0.175),
    new THREE.Vector2(0.02, 0.2),
  ];
  return [
    { geo: new THREE.LatheGeometry(body, 5).scale(k, k, k), color: PAL.amphora },
    { geo: new THREE.BoxGeometry(0.012 * k, 0.05 * k, 0.07 * k).translate(0, 0.165 * k, 0), color: PAL.amphoraDark },
    { geo: new THREE.CylinderGeometry(0.02 * k, 0.018 * k, 0.014 * k, 4).translate(0, 0.205 * k, 0), color: PAL.wineSeal },
  ];
}

/** A bale of fleece, `r` across, at the origin: a lumpy cream bundle with a rope band round it. */
export function bale(r: number, seed: number): TPart[] {
  return [
    { geo: lumpy(new THREE.IcosahedronGeometry(r, 0), 0.2, seed).scale(1.2, 0.75, 1), color: PAL.wool },
    { geo: new THREE.CylinderGeometry(r * 0.92, r * 0.92, r * 0.18, 6).scale(1.15, 1, 0.98).translate(0, 0, 0), color: PAL.rope },
  ];
}

/**
 * The fleece vendor: a woman in a slate-blue dress (the tinted part) and a
 * pale headscarf, a bale of fleece on her head and an arm up to steady it,
 * a hank of spun wool over her other arm.
 */
function fleeceVendor(): THREE.BufferGeometry {
  const parts: TPart[] = [
    { geo: new THREE.CylinderGeometry(0.05, 0.095, 0.3, 7).translate(0, 0.16, 0), color: '', tint: true },
    { geo: new THREE.CylinderGeometry(0.03, 0.04, 0.1, 7, 1, true).translate(0, 0.3, 0), color: PAL.fleeceVendorScarf },
    { geo: new THREE.CylinderGeometry(0.016, 0.014, 0.15, 4).rotateX(-0.2).translate(0.01, 0.23, -0.07), color: PAL.skin },
    { geo: new THREE.TorusGeometry(0.03, 0.012, 3, 6).rotateY(Math.PI / 2).translate(0.02, 0.17, -0.085), color: PAL.wool },
    { geo: new THREE.CylinderGeometry(0.014, 0.014, 0.17, 4).rotateX(0.25).translate(0.0, 0.37, 0.07), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.056, 0).translate(0.005, 0.36, 0), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.06, 0).scale(1, 0.72, 1).translate(-0.014, 0.385, 0), color: PAL.fleeceVendorScarf },
    ...moved(bale(0.085, 541), (g) => g.translate(0, 0.475, 0)),
  ];
  return mergeTinted(parts);
}

/**
 * The wine vendor: a man in a wine-red tunic (the tinted part), an amphora
 * on his shoulder held by its handle, and a jug in his other hand to pour.
 */
function wineVendor(): THREE.BufferGeometry {
  const parts: TPart[] = [
    leg(0, -0.03, 0.12, 0.02, PAL.skin, -1),
    leg(0, 0.03, 0.12, 0.02, PAL.skin, 1),
    { geo: new THREE.CylinderGeometry(0.055, 0.088, 0.22, 6).translate(0, 0.21, 0), color: '', tint: true },
    { geo: new THREE.CylinderGeometry(0.066, 0.07, 0.03, 6).translate(0, 0.2, 0), color: PAL.rope },
    { geo: new THREE.IcosahedronGeometry(0.056, 0).translate(0.005, 0.36, 0), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.06, 0).scale(1, 0.62, 1).translate(-0.012, 0.39, 0), color: PAL.hair },
    // The arm up to the amphora on his left shoulder, lying back along it.
    { geo: new THREE.CylinderGeometry(0.015, 0.014, 0.15, 4).rotateX(0.5).translate(0.02, 0.31, 0.08), color: PAL.skin },
    ...moved(amphora(0.26), (g) => g.translate(0, -0.13, 0).rotateZ(1.25).translate(-0.02, 0.37, 0.07)),
    // The other arm down with the jug.
    { geo: new THREE.CylinderGeometry(0.015, 0.014, 0.15, 4).rotateZ(-0.4).translate(0.03, 0.23, -0.075), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.022, 0.03, 0.06, 6).translate(0.07, 0.15, -0.08), color: PAL.amphoraDark },
  ];
  return mergeTinted(parts);
}

/** Legs of a beast or a person: four (or two) thin posts. */
export const leg = (x: number, z: number, h: number, r: number, color: string, swing = 0): TPart => ({ geo: new THREE.CylinderGeometry(r, r * 0.85, h, 4).translate(x, h / 2, z), color, leg: [swing, x, h] });

/**
 * The priestess: a woman in a long white robe (the tinted part) with a lilac
 * mantle over her shoulders and a lilac veil, carrying a shallow offering
 * bowl before her with a little flame in it.
 */
function priestess(): THREE.BufferGeometry {
  const parts: TPart[] = [
    { geo: new THREE.CylinderGeometry(0.05, 0.1, 0.32, 7).translate(0, 0.16, 0), color: '', tint: true },
    // The mantle, a lilac cape falling from the shoulders down the back.
    { geo: new THREE.CylinderGeometry(0.066, 0.09, 0.2, 7, 1, true, Math.PI * 0.55, Math.PI * 0.9).translate(0, 0.22, 0), color: PAL.priestessMantle },
    { geo: new THREE.CylinderGeometry(0.064, 0.058, 0.05, 7).translate(0, 0.31, 0), color: PAL.priestessMantle },
    // Both arms forward, holding the bowl.
    { geo: new THREE.CylinderGeometry(0.014, 0.014, 0.14, 4).rotateZ(-1.2).translate(0.06, 0.27, 0.05), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.014, 0.014, 0.14, 4).rotateZ(-1.2).translate(0.06, 0.27, -0.05), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.065, 0.03, 0.03, 7).translate(0.13, 0.3, 0), color: PAL.offeringBowl },
    { geo: new THREE.ConeGeometry(0.026, 0.07, 4).translate(0.13, 0.35, 0), color: PAL.flame },
    { geo: new THREE.IcosahedronGeometry(0.056, 0).translate(0.005, 0.36, 0), color: PAL.skin },
    // The veil over her hair, falling to the shoulders.
    { geo: new THREE.IcosahedronGeometry(0.064, 0).scale(1, 0.85, 1).translate(-0.016, 0.38, 0), color: PAL.priestessMantle },
    { geo: new THREE.CylinderGeometry(0.05, 0.068, 0.08, 6).translate(-0.022, 0.32, 0), color: PAL.priestessMantle },
  ];
  return mergeTinted(parts);
}

/**
 * Slice 53: one of a festival's procession: the priestess's figure robed,
 * mantled and veiled all in one colour (the tinted part), the god's or white
 * by turns, her bowl and its flame before her.
 */
function marcher(): THREE.BufferGeometry {
  const parts: TPart[] = [
    { geo: new THREE.CylinderGeometry(0.05, 0.1, 0.32, 7).translate(0, 0.16, 0), color: '', tint: true },
    { geo: new THREE.CylinderGeometry(0.066, 0.09, 0.2, 7, 1, true, Math.PI * 0.55, Math.PI * 0.9).translate(0, 0.22, 0), color: '', tint: true },
    { geo: new THREE.CylinderGeometry(0.064, 0.058, 0.05, 7).translate(0, 0.31, 0), color: '', tint: true },
    { geo: new THREE.CylinderGeometry(0.014, 0.014, 0.14, 4).rotateZ(-1.2).translate(0.06, 0.27, 0.05), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.014, 0.014, 0.14, 4).rotateZ(-1.2).translate(0.06, 0.27, -0.05), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.065, 0.03, 0.03, 7).translate(0.13, 0.3, 0), color: PAL.offeringBowl },
    { geo: new THREE.ConeGeometry(0.026, 0.07, 4).translate(0.13, 0.35, 0), color: PAL.flame },
    { geo: new THREE.IcosahedronGeometry(0.056, 0).translate(0.005, 0.36, 0), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.064, 0).scale(1, 0.85, 1).translate(-0.016, 0.38, 0), color: '', tint: true },
    { geo: new THREE.CylinderGeometry(0.05, 0.068, 0.08, 6).translate(-0.022, 0.32, 0), color: '', tint: true },
  ];
  return mergeTinted(parts);
}

/**
 * The actor: a man in a rose tunic (the tinted part) and a short saffron
 * cloak, wearing a big pale comic mask with a wide grin, one arm flung up as
 * if mid-speech and a scroll of the plays in the other hand.
 */
function actor(): THREE.BufferGeometry {
  const parts: TPart[] = [
    leg(0, -0.03, 0.12, 0.02, PAL.skin, -1),
    leg(0, 0.03, 0.12, 0.02, PAL.skin, 1),
    { geo: new THREE.CylinderGeometry(0.055, 0.088, 0.22, 6).translate(0, 0.21, 0), color: '', tint: true },
    { geo: new THREE.CylinderGeometry(0.07, 0.1, 0.16, 6, 1, true, Math.PI * 0.6, Math.PI * 0.8).translate(0, 0.24, 0), color: PAL.actorCloak },
    // An arm flung up, and one holding the scroll out.
    { geo: new THREE.CylinderGeometry(0.015, 0.014, 0.17, 4).rotateX(0.7).translate(0.0, 0.36, 0.1), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.015, 0.014, 0.15, 4).rotateZ(-0.9).translate(0.05, 0.25, -0.07), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.018, 0.018, 0.09, 5).rotateX(Math.PI / 2).translate(0.11, 0.21, -0.08), color: PAL.scroll },
    // The mask: a big pale face, dark eyes and a grinning mouth, and a wreath of ivy.
    { geo: new THREE.IcosahedronGeometry(0.075, 0).scale(0.8, 1.05, 1).translate(0.01, 0.38, 0), color: PAL.mask },
    { geo: new THREE.BoxGeometry(0.02, 0.018, 0.022).translate(0.066, 0.4, 0.028), color: PAL.door },
    { geo: new THREE.BoxGeometry(0.02, 0.018, 0.022).translate(0.066, 0.4, -0.028), color: PAL.door },
    { geo: new THREE.BoxGeometry(0.02, 0.022, 0.07).translate(0.066, 0.345, 0), color: PAL.actorMouth },
    { geo: new THREE.CylinderGeometry(0.07, 0.07, 0.025, 7).translate(-0.004, 0.44, 0), color: PAL.ivy },
  ];
  return mergeTinted(parts);
}

/**
 * The tax collector: a man in a dark bronze-green tunic (the tinted part)
 * under a wide straw hat, a leather satchel of coin at his hip on a strap
 * across his chest, and a wax tablet held out before him to mark who has paid.
 * `full`: the satchel swells, a second bag of coin beside it.
 */
function collector(full: boolean): THREE.BufferGeometry {
  const parts: TPart[] = [
    leg(0, -0.03, 0.12, 0.02, PAL.skin, -1),
    leg(0, 0.03, 0.12, 0.02, PAL.skin, 1),
    { geo: new THREE.CylinderGeometry(0.055, 0.085, 0.22, 6).translate(0, 0.21, 0), color: '', tint: true },
    // The strap across the chest and the satchel on the left hip.
    { geo: new THREE.BoxGeometry(0.012, 0.2, 0.02).rotateX(0.75).translate(0.05, 0.25, 0), color: PAL.satchel },
    full
      ? { geo: new THREE.IcosahedronGeometry(0.055, 0).scale(1, 0.95, 0.8).translate(0.0, 0.15, -0.1), color: PAL.satchel }
      : { geo: new THREE.BoxGeometry(0.07, 0.07, 0.035).translate(0.0, 0.16, -0.09), color: PAL.satchel },
    { geo: new THREE.BoxGeometry(0.072, 0.02, full ? 0.06 : 0.037).translate(0.0, 0.19, full ? -0.1 : -0.09), color: PAL.strongboxBand },
    // An arm holding the tablet out, the other at his side.
    { geo: new THREE.CylinderGeometry(0.015, 0.014, 0.14, 4).rotateZ(-1.1).translate(0.06, 0.26, 0.06), color: PAL.skin },
    { geo: new THREE.BoxGeometry(0.012, 0.08, 0.06).rotateZ(-0.5).translate(0.13, 0.3, 0.06), color: PAL.tablet },
    { geo: new THREE.CylinderGeometry(0.014, 0.013, 0.14, 4).translate(0.0, 0.22, 0.075), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.055, 0).translate(0.005, 0.37, 0), color: PAL.skin },
    // The hat: a wide flat brim and a low crown, so he reads from above.
    { geo: new THREE.CylinderGeometry(0.115, 0.12, 0.014, 9).translate(0, 0.415, 0), color: PAL.collectorHat },
    { geo: new THREE.CylinderGeometry(0.04, 0.055, 0.05, 7).translate(0, 0.445, 0), color: PAL.collectorHat },
  ];
  // A full round: a second purse of coin tied on behind.
  if (full) parts.push({ geo: new THREE.IcosahedronGeometry(0.04, 0).translate(-0.06, 0.15, -0.075), color: PAL.satchel }, { geo: new THREE.CylinderGeometry(0.012, 0.012, 0.03, 5).translate(-0.06, 0.2, -0.075), color: PAL.coin });
  return mergeTinted(parts);
}

/**
 * The watchman: a man in a red-brown tunic (the tinted part) under a round
 * leather cap, a wooden bucket in one hand and a long fire hook on his
 * shoulder. `run`: running to a fire, the bucket full and held out before
 * him in both hands, the hook slung across his back.
 */
function watchman(run: boolean): THREE.BufferGeometry {
  const parts: TPart[] = [
    leg(0, -0.03, 0.12, 0.02, PAL.skin, run ? -1.3 : -1),
    leg(0, 0.03, 0.12, 0.02, PAL.skin, run ? 1.3 : 1),
    { geo: new THREE.CylinderGeometry(0.055, 0.085, 0.21, 6).rotateZ(run ? -0.18 : 0).translate(0, 0.205, 0), color: '', tint: true },
    // A leather belt, and the cap: a low dome with a short brim.
    { geo: new THREE.CylinderGeometry(0.07, 0.07, 0.022, 6).translate(0, 0.17, 0), color: PAL.leather },
    { geo: new THREE.IcosahedronGeometry(0.056, 0).translate(run ? 0.03 : 0.005, 0.36, 0), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.064, 0).scale(1, 0.62, 1).translate(run ? 0.02 : -0.005, 0.395, 0), color: PAL.leather },
    { geo: new THREE.CylinderGeometry(0.075, 0.075, 0.01, 8).translate(run ? 0.02 : -0.005, 0.38, 0), color: PAL.leather },
  ];
  // The hook: a long pole over the shoulder (slung across his back as he runs), the iron crook at its top end.
  const a = run ? 1.25 : 0.85;
  const [hx, hy, hz] = run ? [-0.07, 0.27, 0] : [-0.01, 0.33, -0.07];
  parts.push({ geo: new THREE.CylinderGeometry(0.007, 0.007, 0.56, 3).rotateZ(a).translate(hx, hy, hz), color: PAL.wood });
  parts.push({ geo: new THREE.TorusGeometry(0.03, 0.006, 3, 6, Math.PI * 1.2).rotateZ(a).translate(hx - Math.sin(a) * 0.29, hy + Math.cos(a) * 0.29, hz), color: PAL.rockGrey });
  if (run) {
    // Both arms forward, the bucket held out before him, brimming.
    for (const z of [-0.05, 0.05]) parts.push({ geo: new THREE.CylinderGeometry(0.015, 0.014, 0.15, 4).rotateZ(-1.25).translate(0.08, 0.26, z), color: PAL.skin });
    parts.push({ geo: new THREE.CylinderGeometry(0.05, 0.04, 0.07, 7).translate(0.16, 0.24, 0), color: PAL.bucket });
    parts.push({ geo: new THREE.CylinderGeometry(0.046, 0.046, 0.01, 7).translate(0.16, 0.272, 0), color: PAL.bucketWater });
  } else {
    // One arm up to the hook on his shoulder, the other carrying the bucket at his side.
    parts.push({ geo: new THREE.CylinderGeometry(0.015, 0.014, 0.14, 4).rotateX(0.9).translate(0.0, 0.3, -0.06), color: PAL.skin });
    parts.push({ geo: new THREE.CylinderGeometry(0.014, 0.013, 0.14, 4).translate(0.0, 0.22, 0.075), color: PAL.skin });
    parts.push({ geo: new THREE.CylinderGeometry(0.045, 0.036, 0.065, 7).translate(0.0, 0.12, 0.09), color: PAL.bucket });
    parts.push({ geo: new THREE.TorusGeometry(0.035, 0.004, 3, 6, Math.PI).translate(0.0, 0.155, 0.09), color: PAL.woodDark });
  }
  return mergeTinted(parts);
}

/**
 * The inspector from the architect's office: a woman in a long deep-blue
 * dress (the tinted part) with a pale scarf over her hair, a measuring rod
 * as tall as she is in one hand and a wax tablet held to her chest.
 */
function inspector(): THREE.BufferGeometry {
  const parts: TPart[] = [
    leg(0, -0.025, 0.08, 0.018, PAL.skin, -1),
    leg(0, 0.025, 0.08, 0.018, PAL.skin, 1),
    { geo: new THREE.CylinderGeometry(0.05, 0.095, 0.28, 7).translate(0, 0.19, 0), color: '', tint: true },
    // A sash at the waist.
    { geo: new THREE.CylinderGeometry(0.062, 0.064, 0.02, 7).translate(0, 0.26, 0), color: PAL.inspectorScarf },
    { geo: new THREE.IcosahedronGeometry(0.054, 0).translate(0.005, 0.36, 0), color: PAL.skin },
    // The scarf over her hair, falling to the shoulders.
    { geo: new THREE.IcosahedronGeometry(0.062, 0).scale(1, 0.85, 1).translate(-0.016, 0.38, 0), color: PAL.inspectorScarf },
    { geo: new THREE.CylinderGeometry(0.045, 0.062, 0.07, 6).translate(-0.02, 0.32, 0), color: PAL.inspectorScarf },
    // The rod, upright in her right hand, banded for measuring.
    { geo: new THREE.CylinderGeometry(0.014, 0.013, 0.14, 4).rotateX(-0.5).translate(0.02, 0.25, 0.08), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.007, 0.007, 0.5, 4).translate(0.04, 0.27, 0.12), color: PAL.wood },
  ];
  for (const y of [0.12, 0.27, 0.42]) parts.push({ geo: new THREE.CylinderGeometry(0.009, 0.009, 0.025, 4).translate(0.04, y, 0.12), color: PAL.watchRed });
  // The other arm bent, the tablet held flat against her chest.
  parts.push({ geo: new THREE.CylinderGeometry(0.014, 0.013, 0.12, 4).rotateZ(-1.2).translate(0.05, 0.25, -0.05), color: PAL.skin });
  parts.push({ geo: new THREE.BoxGeometry(0.014, 0.09, 0.07).rotateZ(-0.25).translate(0.075, 0.28, -0.03), color: PAL.tablet });
  return mergeTinted(parts);
}

/**
 * The ox cart: a pale ox under a yoke drawing a two-wheeled cart, its driver
 * (tinted tunic) walking at the ox's head. Its load: golden sheaves of
 * wheat, carcasses under a hide for meat, wheels of cheese stacked on the bed,
 * baskets heaped with dark olives, jars of oil bedded in straw, bales of
 * fleece roped on the bed, baskets of purple grapes, or amphorae of wine.
 */
function oxCart(load: 'none' | 'wheat' | 'meat' | 'cheese' | 'olives' | 'oil' | 'fleece' | 'grapes' | 'wine'): THREE.BufferGeometry {
  const loaded = load === 'wheat';
  const parts: TPart[] = [];
  // The ox, facing +x.
  const ox = 0.2;
  parts.push({ geo: lumpy(new THREE.BoxGeometry(0.4, 0.18, 0.17, 2, 1, 1), 0.1, 501).translate(ox, 0.27, 0), color: PAL.ox });
  // A humped shoulder and a pale belly.
  parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.09, 0), 0.1, 504).scale(1, 0.8, 0.9).translate(ox + 0.1, 0.35, 0), color: PAL.ox });
  parts.push({ geo: lumpy(new THREE.BoxGeometry(0.13, 0.11, 0.1), 0.08, 502).translate(ox + 0.26, 0.29, 0), color: PAL.ox });
  parts.push({ geo: new THREE.BoxGeometry(0.06, 0.06, 0.08).translate(ox + 0.33, 0.26, 0), color: PAL.oxDark });
  parts.push({ geo: new THREE.CylinderGeometry(0.009, 0.016, 0.2, 4).rotateX(Math.PI / 2).translate(ox + 0.25, 0.37, 0), color: PAL.horn });
  // A slow, diagonal gait: the near fore and the far hind leg together.
  for (const [x, z, w] of [[ox - 0.14, -0.055, 0.5], [ox - 0.14, 0.055, -0.5], [ox + 0.14, -0.055, -0.5], [ox + 0.14, 0.055, 0.5]]) parts.push(leg(x, z, 0.19, 0.026, PAL.oxDark, w));
  parts.push({ geo: new THREE.BoxGeometry(0.03, 0.03, 0.24).translate(ox + 0.18, 0.38, 0), color: PAL.woodDark });
  // The cart behind: a pole to the yoke, the bed, the wheels.
  parts.push({ geo: new THREE.BoxGeometry(0.4, 0.025, 0.025).translate(ox - 0.12, 0.26, 0), color: PAL.cart });
  const cx = -0.2;
  parts.push({ geo: new THREE.BoxGeometry(0.32, 0.04, 0.26).translate(cx, 0.2, 0), color: PAL.cart });
  parts.push({ geo: new THREE.BoxGeometry(0.32, 0.07, 0.02).translate(cx, 0.25, 0.125), color: PAL.woodDark });
  parts.push({ geo: new THREE.BoxGeometry(0.32, 0.07, 0.02).translate(cx, 0.25, -0.125), color: PAL.woodDark });
  for (const z of [-0.15, 0.15]) {
    parts.push({ geo: new THREE.CylinderGeometry(0.12, 0.12, 0.03, 8).rotateX(Math.PI / 2).translate(cx, 0.12, z), color: PAL.woodDark });
    parts.push({ geo: new THREE.CylinderGeometry(0.03, 0.03, 0.04, 6).rotateX(Math.PI / 2).translate(cx, 0.12, z), color: PAL.cart });
  }
  if (loaded) {
    // Golden sheaves piled on the bed, lying across it, ears outward, bound with a darker band.
    for (const [x, y, k] of [[-0.11, 0, 0], [-0.2, 0, 1], [-0.29, 0, 2], [-0.155, 0.06, 3], [-0.245, 0.06, 4], [-0.2, 0.115, 5]]) {
      const tilt = (hash2(k, 1, 505) - 0.5) * 0.3;
      parts.push({ geo: new THREE.CylinderGeometry(0.035, 0.05, 0.3, 5).rotateX(Math.PI / 2 + tilt).translate(x, 0.26 + y, 0), color: k % 2 ? PAL.sheaf : PAL.wheatGold });
      parts.push({ geo: new THREE.CylinderGeometry(0.04, 0.04, 0.025, 5).rotateX(Math.PI / 2).translate(x, 0.26 + y, 0), color: PAL.thatchDark });
    }
  }
  if (load === 'meat') {
    // Two carcasses lying across the bed, a hide thrown over them, a pair of antlers sticking up.
    for (const [x, k] of [[-0.14, 0], [-0.26, 1]] as Array<[number, number]>) {
      parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.07, 0), 0.2, 506 + k).scale(0.9, 0.8, 1.6).translate(x, 0.29, 0), color: k ? PAL.deer : PAL.boar });
    }
    parts.push({ geo: lumpy(new THREE.BoxGeometry(0.2, 0.02, 0.22, 2, 1, 2), 0.2, 508).rotateZ(0.15).translate(-0.2, 0.35, 0.01), color: PAL.hide });
    parts.push({ geo: new THREE.CylinderGeometry(0.006, 0.009, 0.14, 3).rotateX(0.5).translate(-0.1, 0.38, 0.06), color: PAL.antler });
    parts.push({ geo: new THREE.CylinderGeometry(0.006, 0.009, 0.14, 3).rotateX(-0.5).translate(-0.1, 0.38, -0.06), color: PAL.antler });
  } else if (load === 'cheese') {
    // Wheels of cheese, two layers of them.
    for (const [x, z, y] of [[-0.12, -0.06, 0], [-0.12, 0.06, 0], [-0.27, -0.06, 0], [-0.27, 0.06, 0], [-0.19, 0, 0.05], [-0.2, 0.0, 0.1]]) {
      parts.push({ geo: new THREE.CylinderGeometry(0.06, 0.06, 0.045, 8).translate(x, 0.245 + y, z), color: y > 0.07 ? PAL.cheeseRind : PAL.cheese });
    }
  } else if (load === 'olives') {
    // Four round baskets heaped with ripe olives (dark, a few still green).
    for (const [x, z, k] of [[-0.12, -0.065, 0], [-0.12, 0.065, 1], [-0.27, -0.065, 2], [-0.27, 0.065, 3]]) {
      parts.push({ geo: new THREE.CylinderGeometry(0.068, 0.055, 0.08, 7).translate(x, 0.26, z), color: PAL.basket });
      parts.push({ geo: lumpy(new THREE.SphereGeometry(0.062, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), 0.25, 530 + k).scale(1, 0.7, 1).translate(x, 0.295, z), color: k === 2 ? PAL.oliveGreen : PAL.oliveRipe });
    }
  } else if (load === 'oil') {
    // Jars of oil standing in a bed of straw, two rows of three.
    parts.push({ geo: lumpy(new THREE.BoxGeometry(0.3, 0.05, 0.22, 3, 1, 2), 0.2, 535).translate(cx, 0.245, 0), color: PAL.straw });
    for (const x of [-0.1, -0.2, -0.3]) for (const z of [-0.055, 0.055]) parts.push(...moved(oilJar(0.15), (g) => g.translate(x, 0.22, z)));
  } else if (load === 'fleece') {
    // Bales of fleece, three on the bed and two on top, and a rope over them all.
    for (const [x, z, y, k] of [[-0.11, -0.06, 0, 0], [-0.11, 0.06, 0, 1], [-0.27, 0, 0, 2], [-0.16, 0, 0.08, 3], [-0.27, 0.0, 0.085, 4]]) {
      parts.push(...moved(bale(0.075, 545 + k), (g) => g.rotateY(k * 0.7).translate(x, 0.27 + y, z)));
    }
    parts.push({ geo: new THREE.BoxGeometry(0.012, 0.015, 0.28).translate(-0.2, 0.39, 0), color: PAL.rope });
  } else if (load === 'grapes') {
    // Four round baskets heaped with purple grapes, a vine leaf or two on top.
    for (const [x, z, k] of [[-0.12, -0.065, 0], [-0.12, 0.065, 1], [-0.27, -0.065, 2], [-0.27, 0.065, 3]]) {
      parts.push({ geo: new THREE.CylinderGeometry(0.068, 0.055, 0.08, 7).translate(x, 0.26, z), color: PAL.basket });
      parts.push({ geo: lumpy(new THREE.SphereGeometry(0.064, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), 0.35, 550 + k).scale(1, 0.85, 1).translate(x, 0.295, z), color: k === 1 ? PAL.grapeBloom : PAL.grapeRipe });
    }
    parts.push({ geo: new THREE.CircleGeometry(0.04, 5).rotateX(-Math.PI / 2 + 0.3).translate(-0.12, 0.35, -0.05), color: PAL.vineLeaf });
    parts.push({ geo: new THREE.CircleGeometry(0.04, 5).rotateX(-Math.PI / 2 - 0.3).translate(-0.27, 0.35, 0.07), color: PAL.vineLeaf });
  } else if (load === 'wine') {
    // Amphorae of wine bedded in straw, two rows of two (four keep the cart under the oil cart's corners: every cart is drawn as if it were the biggest).
    parts.push({ geo: lumpy(new THREE.BoxGeometry(0.3, 0.06, 0.22, 3, 1, 2), 0.2, 555).translate(cx, 0.25, 0), color: PAL.straw });
    for (const x of [-0.13, -0.27]) for (const z of [-0.055, 0.055]) parts.push(...moved(amphora(0.22), (g) => g.translate(x, 0.2, z)));
  }
  // The driver, walking beside the ox with a goad.
  const dz = 0.17;
  const dx = 0.3;
  parts.push(leg(dx, dz - 0.025, 0.11, 0.018, PAL.skin, -1), leg(dx, dz + 0.025, 0.11, 0.018, PAL.skin, 1));
  parts.push({ geo: new THREE.CylinderGeometry(0.05, 0.075, 0.19, 6).translate(dx, 0.19, dz), color: '', tint: true });
  parts.push({ geo: new THREE.IcosahedronGeometry(0.052, 0).translate(dx, 0.33, dz), color: PAL.skin });
  parts.push({ geo: new THREE.IcosahedronGeometry(0.054, 0).scale(1, 0.7, 1).translate(dx - 0.01, 0.355, dz), color: PAL.hair });
  parts.push({ geo: new THREE.CylinderGeometry(0.006, 0.006, 0.36, 3).rotateZ(-0.9).translate(dx + 0.1, 0.3, dz - 0.04), color: PAL.wood });
  return mergeTinted(parts);
}

/**
 * The porter: a man (tinted tunic) pushing a little two-wheeled handcart,
 * with sacks of grain on it (and a ham and a cheese with them, `mixed`), or
 * jars of oil, bales of fleece or amphorae of wine for those stalls.
 */
function porter(load: 'none' | 'wheat' | 'mixed' | 'oil' | 'fleece' | 'wine' | 'marble' | 'armour'): THREE.BufferGeometry {
  const loaded = load !== 'none';
  const parts: TPart[] = [
    leg(-0.02, -0.03, 0.12, 0.02, PAL.skin, -0.8),
    leg(-0.02, 0.03, 0.12, 0.02, PAL.skin, 0.8),
    { geo: new THREE.CylinderGeometry(0.055, 0.085, 0.21, 6).rotateZ(-0.15).translate(0, 0.205, 0), color: '', tint: true },
    { geo: new THREE.IcosahedronGeometry(0.058, 0).translate(0.03, 0.36, 0), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.06, 0).scale(1, 0.7, 1).translate(0.018, 0.385, 0), color: PAL.hair },
    // Arms reaching to the handles.
    { geo: new THREE.CylinderGeometry(0.015, 0.014, 0.16, 4).rotateZ(-1.1).translate(0.08, 0.25, 0.07), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.015, 0.014, 0.16, 4).rotateZ(-1.1).translate(0.08, 0.25, -0.07), color: PAL.skin },
  ];
  // The handcart ahead of him.
  const cx = 0.32;
  parts.push({ geo: new THREE.BoxGeometry(0.24, 0.03, 0.2).translate(cx, 0.15, 0), color: PAL.cart });
  parts.push({ geo: new THREE.BoxGeometry(0.24, 0.05, 0.015).translate(cx, 0.18, 0.1), color: PAL.woodDark });
  parts.push({ geo: new THREE.BoxGeometry(0.24, 0.05, 0.015).translate(cx, 0.18, -0.1), color: PAL.woodDark });
  for (const z of [-0.08, 0.08]) parts.push({ geo: new THREE.BoxGeometry(0.2, 0.015, 0.015).rotateZ(-0.35).translate(0.15, 0.21, z), color: PAL.cart });
  for (const z of [-0.12, 0.12]) parts.push({ geo: new THREE.CylinderGeometry(0.08, 0.08, 0.025, 8).rotateX(Math.PI / 2).translate(cx + 0.02, 0.08, z), color: PAL.woodDark });
  if (load === 'marble') {
    // Slice 36: two blocks of marble for an estate's statues.
    for (const [x, y] of [[cx - 0.04, 0], [cx + 0.03, 0.08]]) parts.push({ geo: lumpy(new THREE.BoxGeometry(0.15, 0.08, 0.13), 0.04, 3661).translate(x, 0.205 + y, 0), color: PAL.marble });
  } else if (load === 'armour') {
    // Slice 36: a breastplate, a helmet with its crest and a shield, for an estate's sons (or a barracks' rack).
    parts.push({ geo: new THREE.CylinderGeometry(0.05, 0.06, 0.1, 7).rotateZ(Math.PI / 2).translate(cx - 0.04, 0.21, 0), color: PAL.bronze });
    parts.push({ geo: new THREE.IcosahedronGeometry(0.045, 0).translate(cx + 0.06, 0.21, 0.04), color: PAL.bronze });
    parts.push({ geo: new THREE.BoxGeometry(0.1, 0.03, 0.012).translate(cx + 0.06, 0.255, 0.04), color: PAL.crest });
    parts.push({ geo: new THREE.CylinderGeometry(0.08, 0.08, 0.014, 10).translate(cx + 0.01, 0.175, -0.04), color: PAL.bronze });
  } else if (load === 'oil') {
    for (const [x, z] of [[cx - 0.06, -0.05], [cx - 0.06, 0.05], [cx + 0.06, 0]]) parts.push(...moved(oilJar(0.14), (g) => g.translate(x, 0.165, z)));
  } else if (load === 'fleece') {
    for (const [x, z, y, k] of [[cx - 0.05, -0.04, 0, 0], [cx + 0.06, 0.04, 0, 1], [cx, 0, 0.07, 2]]) parts.push(...moved(bale(0.065, 560 + k), (g) => g.rotateY(k).translate(x, 0.21 + y, z)));
  } else if (load === 'wine') {
    // Two amphorae lying side by side, necks forward (two keep the porter under the stag's corners).
    for (const z of [-0.045, 0.045]) parts.push(...moved(amphora(0.22), (g) => g.translate(0, -0.11, 0).rotateZ(-Math.PI / 2).translate(cx, 0.21, z)));
  } else if (loaded) {
    const sacks: Array<[number, number, number]> = load === 'mixed' ? [[cx - 0.05, -0.05, 0]] : [[cx - 0.05, -0.05, 0], [cx + 0.06, 0.04, 0], [cx, 0, 0.07]];
    for (const [x, z, y] of sacks) {
      parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.065, 0), 0.15, 511).scale(1.15, 0.8, 0.85).translate(x, 0.21 + y, z), color: PAL.sack });
    }
    if (load === 'mixed') {
      parts.push({ geo: new THREE.CylinderGeometry(0.055, 0.055, 0.04, 8).translate(cx + 0.06, 0.19, 0.05), color: PAL.cheese });
      parts.push({ geo: new THREE.CylinderGeometry(0.05, 0.05, 0.04, 8).translate(cx + 0.06, 0.23, 0.05), color: PAL.cheeseRind });
      parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.05, 0), 0.15, 512).scale(1.5, 0.8, 0.9).translate(cx + 0.02, 0.26, -0.02), color: PAL.meat });
    }
  }
  return mergeTinted(parts);
}

/**
 * The hunter: a man in a short olive tunic (the tinted part) and a fur cap,
 * a spear held forward and a bow and quiver on his back. Coming home with a
 * kill (`carry`), a deer or a boar is slung across his shoulders.
 */
function hunter(carry: 'none' | 'deer' | 'boar'): THREE.BufferGeometry {
  const parts: TPart[] = [
    leg(0, -0.03, 0.12, 0.02, PAL.skin, -1),
    leg(0, 0.03, 0.12, 0.02, PAL.skin, 1),
    { geo: new THREE.CylinderGeometry(0.055, 0.082, 0.2, 6).translate(0, 0.21, 0), color: '', tint: true },
    // A belt and boots of hide.
    { geo: new THREE.CylinderGeometry(0.07, 0.07, 0.025, 6).translate(0, 0.18, 0), color: PAL.hide },
    { geo: new THREE.IcosahedronGeometry(0.056, 0).translate(0.005, 0.36, 0), color: PAL.skin },
    // A fur cap.
    { geo: new THREE.IcosahedronGeometry(0.062, 0).scale(1, 0.62, 1).translate(-0.01, 0.4, 0), color: PAL.hide },
    // The bow across the back and the quiver.
    { geo: new THREE.TorusGeometry(0.13, 0.008, 3, 10, Math.PI * 0.9).rotateY(Math.PI / 2).rotateX(0.35).translate(-0.07, 0.24, 0), color: PAL.woodDark },
    { geo: new THREE.CylinderGeometry(0.022, 0.018, 0.17, 5).rotateX(-0.4).translate(-0.07, 0.26, -0.03), color: PAL.hide },
  ];
  if (carry === 'none') {
    // The spear held forward, ready; the other arm swinging.
    parts.push({ geo: new THREE.CylinderGeometry(0.015, 0.014, 0.15, 4).rotateZ(-0.8).translate(0.05, 0.25, 0.07), color: PAL.skin });
    parts.push({ geo: new THREE.CylinderGeometry(0.007, 0.007, 0.62, 3).rotateZ(-1.25).translate(0.1, 0.29, 0.08), color: PAL.wood });
    parts.push({ geo: new THREE.ConeGeometry(0.016, 0.07, 3).rotateZ(-1.25 - Math.PI / 2 + Math.PI).translate(0.4, 0.38, 0.08), color: PAL.rockGrey });
    parts.push({ geo: new THREE.CylinderGeometry(0.015, 0.014, 0.15, 4).rotateX(0.18).translate(0, 0.23, -0.07), color: PAL.skin, leg: [-0.55, 0, 0.3] });
  } else {
    // The kill across his shoulders, legs hanging either side; both hands up holding them, the spear as a staff.
    const coat = carry === 'deer' ? PAL.deer : PAL.boar;
    // The body draped over both shoulders, sagging in the middle.
    parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.075, 1), 0.12, 521).scale(0.85, 0.75, 2.1).translate(-0.02, 0.37, 0), color: coat });
    for (const side of [-1, 1]) {
      // Its legs, bound in pairs, splayed down at either end; his hand holding each pair.
      parts.push({ geo: new THREE.CylinderGeometry(0.011, 0.008, 0.11, 4).rotateX(side * 0.5).translate(0.02, 0.31, side * 0.17), color: coat });
      parts.push({ geo: new THREE.CylinderGeometry(0.011, 0.008, 0.11, 4).rotateX(side * 0.65).translate(-0.04, 0.32, side * 0.17), color: coat });
      parts.push({ geo: new THREE.CylinderGeometry(0.014, 0.013, 0.13, 4).rotateX(side * 0.9).translate(0.03, 0.32, side * 0.08), color: PAL.skin });
    }
    // The head hanging at one side.
    parts.push({ geo: new THREE.IcosahedronGeometry(0.035, 0).scale(1.4, 0.9, 0.9).rotateZ(-0.8).translate(0.04, 0.3, 0.13), color: coat });
    if (carry === 'deer') {
      parts.push({ geo: new THREE.CylinderGeometry(0.005, 0.008, 0.1, 3).rotateZ(0.5).rotateX(0.4).translate(0.08, 0.31, 0.17), color: PAL.antler });
      parts.push({ geo: new THREE.CylinderGeometry(0.005, 0.008, 0.1, 3).rotateZ(-0.3).rotateX(0.4).translate(0.04, 0.29, 0.19), color: PAL.antler });
    } else {
      parts.push({ geo: new THREE.ConeGeometry(0.008, 0.04, 3).rotateX(-Math.PI / 2).translate(0.07, 0.27, 0.16), color: PAL.tusk });
    }
    parts.push({ geo: new THREE.CylinderGeometry(0.007, 0.007, 0.56, 3).rotateZ(-0.12).translate(0.09, 0.27, -0.09), color: PAL.wood });
  }
  return mergeTinted(parts);
}

/** Which porter look carries each stall good. */
const PORTER_LOOK: Record<number, number> = { [OIL]: 3, [FLEECE]: 4, [WINE]: 5, [MARBLE]: 6, [ARMOUR]: 7 };
/**
 * A caravan's donkey, facing +x, about 0.26 tall at the ears: grey-brown,
 * pale-muzzled, long-eared, a short brush of a tail, a saddle blanket (the
 * tinted part: its city's colour) under a pair of panniers, one a basket and
 * one a sack, and a bundle roped on top.
 */
function donkey(jars = false): THREE.BufferGeometry {
  const parts: TPart[] = [];
  parts.push({ geo: lumpy(new THREE.BoxGeometry(0.24, 0.1, 0.1, 2, 1, 1), 0.1, 1701).translate(0, 0.17, 0), color: PAL.donkey });
  // Neck and head, held low and forward; a pale muzzle; the long ears.
  parts.push({ geo: new THREE.BoxGeometry(0.08, 0.06, 0.055).rotateZ(0.7).translate(0.13, 0.22, 0), color: PAL.donkey });
  parts.push({ geo: lumpy(new THREE.BoxGeometry(0.09, 0.05, 0.05), 0.08, 1702).rotateZ(-0.35).translate(0.19, 0.24, 0), color: PAL.donkey });
  parts.push({ geo: new THREE.BoxGeometry(0.035, 0.04, 0.045).translate(0.235, 0.22, 0), color: PAL.donkeyMuzzle });
  for (const z of [-0.018, 0.018]) parts.push({ geo: new THREE.CylinderGeometry(0.004, 0.012, 0.075, 3).rotateZ(-0.35).rotateX(z > 0 ? 0.3 : -0.3).translate(0.165, 0.3, z), color: PAL.donkeyDark });
  // A dark stripe along the mane, the tail.
  parts.push({ geo: new THREE.BoxGeometry(0.07, 0.015, 0.02).rotateZ(0.7).translate(0.115, 0.255, 0), color: PAL.donkeyDark });
  parts.push({ geo: new THREE.CylinderGeometry(0.006, 0.012, 0.09, 3).rotateZ(-0.35).translate(-0.135, 0.15, 0), color: PAL.donkeyDark });
  for (const [x, z, w] of [[-0.085, -0.035, 0.7], [-0.085, 0.035, -0.7], [0.085, -0.035, -0.7], [0.085, 0.035, 0.7]]) parts.push(leg(x, z, 0.13, 0.013, PAL.donkeyDark, w));
  // The blanket, and the panniers either side over it.
  parts.push({ geo: new THREE.BoxGeometry(0.12, 0.012, 0.13).translate(-0.01, 0.225, 0), color: '', tint: true });
  parts.push({ geo: new THREE.BoxGeometry(0.12, 0.05, 0.012).translate(-0.01, 0.2, 0.062), color: '', tint: true });
  parts.push({ geo: new THREE.BoxGeometry(0.12, 0.05, 0.012).translate(-0.01, 0.2, -0.062), color: '', tint: true });
  if (jars) {
    // Slice 34: a vassal's tribute of oil or wine: two tall jars a side, slung in rope cradles, their necks above the blanket.
    for (const z of [-0.085, 0.085])
      for (const x of [-0.05, 0.035]) {
        const jar = new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.012, 0.004), new THREE.Vector2(0.032, 0.05), new THREE.Vector2(0.026, 0.095), new THREE.Vector2(0.012, 0.11), new THREE.Vector2(0.016, 0.125)], 6);
        parts.push({ geo: jar.translate(x, 0.13, z), color: PAL.pot });
      }
    parts.push({ geo: new THREE.BoxGeometry(0.15, 0.01, 0.2).translate(-0.01, 0.2, 0), color: PAL.rope });
    return mergeTinted(parts);
  }
  parts.push({ geo: new THREE.CylinderGeometry(0.045, 0.04, 0.09, 6).translate(-0.01, 0.18, 0.1), color: PAL.basket });
  parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.05, 0), 0.25, 1703).scale(1.1, 1, 0.8).translate(-0.01, 0.18, -0.1), color: PAL.sack });
  parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.045, 0), 0.3, 1704).scale(1.3, 0.7, 1).translate(-0.02, 0.26, 0), color: PAL.bundleCream });
  parts.push({ geo: new THREE.BoxGeometry(0.012, 0.012, 0.15).translate(-0.02, 0.27, 0), color: PAL.rope });
  return mergeTinted(parts);
}

/** The caravan's drover, at its head: a traveller in a tunic of his city's colour (tinted), a wide hat and a cloak over one shoulder, a staff, a lead rope back to the first donkey. */
function drover(): THREE.BufferGeometry {
  const parts: TPart[] = [
    leg(0, -0.03, 0.12, 0.02, PAL.skin, -1),
    leg(0, 0.03, 0.12, 0.02, PAL.skin, 1),
    { geo: new THREE.CylinderGeometry(0.055, 0.085, 0.21, 6).translate(0, 0.205, 0), color: '', tint: true },
    { geo: new THREE.CylinderGeometry(0.068, 0.092, 0.15, 6, 1, true, Math.PI * 0.9, Math.PI * 0.9).translate(0, 0.25, 0), color: PAL.canvasShade },
    { geo: new THREE.CylinderGeometry(0.016, 0.014, 0.15, 4).rotateX(0.18).translate(0, 0.23, 0.07), color: PAL.skin, leg: [-0.55, 0, 0.3] },
    { geo: new THREE.CylinderGeometry(0.016, 0.014, 0.15, 4).rotateX(-0.18).translate(-0.02, 0.23, -0.07), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.058, 0).translate(0.005, 0.365, 0), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.1, 0.1, 0.012, 8).translate(0, 0.405, 0), color: PAL.straw },
    { geo: new THREE.CylinderGeometry(0.035, 0.05, 0.05, 7).translate(0, 0.43, 0), color: PAL.straw },
    // The staff, planted ahead; the lead rope back from his hand.
    { geo: new THREE.CylinderGeometry(0.007, 0.007, 0.5, 3).rotateX(0.12).translate(0.04, 0.25, 0.1), color: PAL.wood },
    { geo: new THREE.BoxGeometry(0.2, 0.006, 0.006).rotateZ(0.35).translate(-0.12, 0.13, -0.07), color: PAL.rope },
  ];
  return mergeTinted(parts);
}

/**
 * A raider, facing +x: a dark leather tunic, an iron helmet with a black
 * crest, a round iron-rimmed shield on his left arm in his city's colour, darkened (the tinted
 * parts), and in his right hand a torch alight (`torch`), a spear, or, on the
 * way out, a sack of loot over his shoulder.
 */
/** A raider's jerkin and helmet. */
const RAIDER_LEATHER = '#3e3128';
const RAIDER_IRON = '#55524d';
/** Black horsehair on their helmets, and how dark their city's colour is on their shields. */
const RAIDER_CREST = '#1d1a17';
const RAIDER_SHADE = 0.55;
function raider(hold: 'torch' | 'spear' | 'sack'): THREE.BufferGeometry {
  const parts: TPart[] = [
    leg(0, -0.03, 0.12, 0.02, PAL.skin, -1.3),
    leg(0, 0.03, 0.12, 0.02, PAL.skin, 1.3),
    // (Slice 24: dark leather and iron, so a band reads apart from your own red-and-bronze hoplites in a fight; their city's colour on crest and shield.)
    { geo: new THREE.CylinderGeometry(0.058, 0.088, 0.21, 6).rotateZ(-0.16).translate(0.01, 0.205, 0), color: RAIDER_LEATHER },
    { geo: new THREE.CylinderGeometry(0.072, 0.072, 0.024, 6).translate(0, 0.17, 0), color: PAL.woodDark },
    { geo: new THREE.IcosahedronGeometry(0.056, 0).translate(0.025, 0.36, 0), color: PAL.skin },
    // The helmet, and its crest from front to back.
    { geo: new THREE.IcosahedronGeometry(0.066, 0).scale(1, 0.8, 1).translate(0.02, 0.385, 0), color: RAIDER_IRON },
    // (Slice 25: a crest of black horsehair, tall, and the shield in their city's colour darkened with an iron rim, so a band reads as dark against your terracotta-and-bronze hoplites.)
    { geo: new THREE.BoxGeometry(0.15, 0.065, 0.02).translate(-0.005, 0.452, 0), color: RAIDER_CREST },
    // The round shield on his left, an iron rim and a bronze boss.
    { geo: new THREE.CylinderGeometry(0.096, 0.096, 0.012, 10).rotateX(Math.PI / 2).translate(0.02, 0.24, -0.08), color: RAIDER_IRON },
    { geo: new THREE.CylinderGeometry(0.08, 0.08, 0.016, 10).rotateX(Math.PI / 2).translate(0.02, 0.24, -0.087), color: '', tint: true },
    { geo: new THREE.CylinderGeometry(0.022, 0.022, 0.02, 6).rotateX(Math.PI / 2).translate(0.02, 0.24, -0.095), color: PAL.bronze },
  ];
  if (hold === 'torch') {
    parts.push({ geo: new THREE.CylinderGeometry(0.015, 0.014, 0.15, 4).rotateZ(-0.9).translate(0.06, 0.3, 0.07), color: PAL.skin });
    parts.push({ geo: new THREE.CylinderGeometry(0.009, 0.011, 0.2, 4).rotateZ(-0.35).translate(0.13, 0.38, 0.07), color: PAL.wood });
    parts.push({ geo: new THREE.ConeGeometry(0.035, 0.09, 5).translate(0.17, 0.5, 0.07), color: PAL.ember });
    parts.push({ geo: new THREE.ConeGeometry(0.02, 0.06, 4).translate(0.17, 0.52, 0.07), color: PAL.flame });
  } else if (hold === 'spear') {
    parts.push({ geo: new THREE.CylinderGeometry(0.015, 0.014, 0.14, 4).rotateX(-0.4).translate(0.03, 0.25, 0.075), color: PAL.skin });
    parts.push({ geo: new THREE.CylinderGeometry(0.006, 0.006, 0.62, 3).rotateZ(-0.25).translate(0.06, 0.33, 0.085), color: PAL.wood });
    parts.push({ geo: new THREE.ConeGeometry(0.014, 0.06, 4).rotateZ(-0.25).translate(0.135, 0.65, 0.085), color: PAL.rockGrey });
  } else {
    // A bulging sack over his right shoulder, held by its neck.
    parts.push({ geo: new THREE.CylinderGeometry(0.015, 0.014, 0.14, 4).rotateX(0.9).translate(-0.01, 0.33, 0.06), color: PAL.skin });
    parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.085, 1), 0.2, 2001).scale(1.1, 0.9, 0.9).translate(-0.08, 0.36, 0.06), color: PAL.sack });
    parts.push({ geo: new THREE.CylinderGeometry(0.012, 0.012, 0.03, 4).translate(-0.02, 0.42, 0.06), color: PAL.rope });
  }
  return mergeTinted(parts);
}

/**
 * Slice 30: a thief, facing +x: a hooded figure in a dark cloak (the tinted
 * part) to the shins, stooped and quick, the hood pulled forward over a face
 * in shadow. Empty-handed on the way out; on the way home a fat purse at his
 * belt (`purse`) or a sack on his back (`sack`).
 */
const THIEF_HOOD = '#2a2730';
const THIEF_FACE = '#8a6a55';
function thief(loot: 'none' | 'purse' | 'sack'): THREE.BufferGeometry {
  const lean = -0.32;
  const parts: TPart[] = [
    leg(0, -0.03, 0.11, 0.019, PAL.woodDark, -1.4),
    leg(0, 0.03, 0.11, 0.019, PAL.woodDark, 1.4),
    // The cloak, long and flaring, leaning forward as he hurries.
    { geo: new THREE.CylinderGeometry(0.05, 0.1, 0.27, 7).rotateZ(lean).translate(0.03, 0.22, 0), color: '', tint: true },
    // Arms drawn in under the cloak.
    { geo: new THREE.CylinderGeometry(0.018, 0.016, 0.13, 4).rotateZ(-0.9).translate(0.07, 0.25, 0.06), color: '', tint: true },
    { geo: new THREE.CylinderGeometry(0.018, 0.016, 0.13, 4).rotateZ(-0.9).translate(0.07, 0.25, -0.06), color: '', tint: true },
    // The head thrust forward, the face in the hood's shadow, and the hood itself: a peak falling down the back.
    { geo: new THREE.IcosahedronGeometry(0.05, 0).translate(0.1, 0.34, 0), color: THIEF_FACE },
    { geo: new THREE.IcosahedronGeometry(0.068, 0).scale(1.05, 0.95, 1).translate(0.08, 0.36, 0), color: THIEF_HOOD },
    { geo: new THREE.ConeGeometry(0.045, 0.12, 5).rotateZ(1.9).translate(0.005, 0.38, 0), color: THIEF_HOOD },
  ];
  if (loot === 'purse') {
    parts.push({ geo: new THREE.IcosahedronGeometry(0.045, 0).scale(1, 1.2, 1).translate(0.06, 0.17, 0.09), color: PAL.leather });
    parts.push({ geo: new THREE.CylinderGeometry(0.012, 0.012, 0.03, 4).translate(0.06, 0.23, 0.09), color: PAL.bronze });
  } else if (loot === 'sack') {
    parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.09, 1), 0.2, 3001).scale(0.9, 1.05, 1).translate(-0.07, 0.33, 0), color: PAL.sack });
    parts.push({ geo: new THREE.CylinderGeometry(0.012, 0.012, 0.03, 4).translate(-0.03, 0.42, 0), color: PAL.rope });
  }
  return mergeTinted(parts);
}

// Slice 41
/**
 * Slice 41: the new kinds of criminal, each facing +x, its clothes the tinted
 * part (a gang's men are tinted a rust red, whatever their kind).
 *
 * A pickpocket: a slight, bare-headed figure in a short drab tunic, hands
 * low and close, quick on his feet; home with a purse at his belt.
 */
function pickpocket(purse: boolean): THREE.BufferGeometry {
  const parts: TPart[] = [
    leg(0, -0.025, 0.12, 0.016, PAL.skin, -1.2),
    leg(0, 0.025, 0.12, 0.016, PAL.skin, 1.2),
    { geo: new THREE.CylinderGeometry(0.045, 0.068, 0.17, 6).rotateZ(-0.12).translate(0.01, 0.2, 0), color: '', tint: true },
    { geo: new THREE.IcosahedronGeometry(0.048, 0).translate(0.025, 0.33, 0), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.05, 0).scale(1, 0.6, 1).translate(0.01, 0.355, 0), color: PAL.hair },
    // Hands low and forward, close at the waist.
    { geo: new THREE.CylinderGeometry(0.013, 0.012, 0.13, 4).rotateZ(-0.7).translate(0.05, 0.22, 0.05), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.013, 0.012, 0.13, 4).rotateZ(-0.7).translate(0.05, 0.22, -0.05), color: PAL.skin },
  ];
  if (purse) {
    parts.push({ geo: new THREE.IcosahedronGeometry(0.038, 0).scale(1, 1.2, 1).translate(0.0, 0.15, 0.07), color: PAL.leather });
    parts.push({ geo: new THREE.CylinderGeometry(0.01, 0.01, 0.025, 4).translate(0.0, 0.2, 0.07), color: PAL.bronze });
  }
  return mergeTinted(parts);
}

/** A vandal: a big man in a dark tunic, a heavy club on his shoulder; `swing`: raised over his head, smashing. */
function vandal(swing: boolean): THREE.BufferGeometry {
  const parts: TPart[] = [
    leg(0, -0.035, 0.13, 0.024, PAL.skin, -1),
    leg(0, 0.035, 0.13, 0.024, PAL.skin, 1),
    { geo: new THREE.CylinderGeometry(0.075, 0.095, 0.22, 6).translate(0, 0.23, 0), color: '', tint: true },
    { geo: new THREE.CylinderGeometry(0.08, 0.08, 0.02, 6).translate(0, 0.19, 0), color: PAL.leather },
    { geo: new THREE.IcosahedronGeometry(0.058, 0).translate(0.01, 0.39, 0), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.06, 0).scale(1, 0.55, 1).translate(-0.005, 0.415, 0), color: PAL.hair },
  ];
  if (swing) {
    // Both arms up, the club over his head.
    for (const z of [-0.05, 0.05]) parts.push({ geo: new THREE.CylinderGeometry(0.02, 0.018, 0.16, 4).rotateZ(0.25).translate(-0.01, 0.42, z), color: PAL.skin });
    // (Its heavy end forward and up, about to come down.)
    parts.push({ geo: new THREE.CylinderGeometry(0.032, 0.016, 0.32, 5).rotateZ(-1.2).translate(0.03, 0.55, 0), color: PAL.woodDark });
    parts.push({ geo: new THREE.IcosahedronGeometry(0.042, 0).translate(0.175, 0.61, 0), color: PAL.woodDark });
  } else {
    parts.push({ geo: new THREE.CylinderGeometry(0.02, 0.018, 0.15, 4).rotateX(0.9).translate(0.0, 0.33, -0.07), color: PAL.skin });
    parts.push({ geo: new THREE.CylinderGeometry(0.018, 0.016, 0.15, 4).translate(0.0, 0.24, 0.085), color: PAL.skin });
    // The club on his shoulder, its heavy end up behind him.
    parts.push({ geo: new THREE.CylinderGeometry(0.032, 0.016, 0.32, 5).rotateZ(0.9).translate(-0.03, 0.42, -0.07), color: PAL.woodDark });
    parts.push({ geo: new THREE.IcosahedronGeometry(0.042, 0).translate(-0.155, 0.52, -0.07), color: PAL.woodDark });
  }
  return mergeTinted(parts);
}

/** An arsonist: hooded, in a dark cloak, a lit torch held low before him (out: the torch spent, black). */
function arsonist(lit: boolean): THREE.BufferGeometry {
  const parts: TPart[] = [
    leg(0, -0.03, 0.11, 0.019, PAL.woodDark, -1.3),
    leg(0, 0.03, 0.11, 0.019, PAL.woodDark, 1.3),
    { geo: new THREE.CylinderGeometry(0.05, 0.1, 0.27, 7).rotateZ(-0.25).translate(0.02, 0.22, 0), color: '', tint: true },
    { geo: new THREE.IcosahedronGeometry(0.05, 0).translate(0.08, 0.34, 0), color: THIEF_FACE },
    { geo: new THREE.IcosahedronGeometry(0.068, 0).scale(1.05, 0.95, 1).translate(0.06, 0.36, 0), color: THIEF_HOOD },
    { geo: new THREE.CylinderGeometry(0.015, 0.014, 0.14, 4).rotateZ(-1.0).translate(0.07, 0.26, 0.07), color: THIEF_FACE },
    { geo: new THREE.CylinderGeometry(0.009, 0.011, 0.2, 4).rotateZ(-0.5).translate(0.15, 0.3, 0.07), color: PAL.wood },
  ];
  if (lit) {
    // (Slice 45, from slice 41's review: the flame about three times larger, over an ember glow, so it reads at the usual zoom.)
    parts.push({ geo: new THREE.IcosahedronGeometry(0.045, 0).scale(1, 0.7, 1).translate(0.2, 0.41, 0.07), color: PAL.ember });
    parts.push({ geo: new THREE.ConeGeometry(0.075, 0.24, 6).translate(0.2, 0.52, 0.07), color: PAL.ember });
    parts.push({ geo: new THREE.ConeGeometry(0.045, 0.17, 5).translate(0.205, 0.52, 0.07), color: PAL.flame });
  } else parts.push({ geo: new THREE.IcosahedronGeometry(0.02, 0).translate(0.2, 0.4, 0.07), color: THIEF_HOOD });
  return mergeTinted(parts);
}

/** A smuggler: a sea-blue tunic and a knitted cap, eyes on the quay; home with a sack on his shoulder. */
const SMUGGLER_CAP = '#5e3328';
function smuggler(load: boolean): THREE.BufferGeometry {
  const parts: TPart[] = [
    leg(0, -0.03, 0.12, 0.02, PAL.skin, -1),
    leg(0, 0.03, 0.12, 0.02, PAL.skin, 1),
    { geo: new THREE.CylinderGeometry(0.055, 0.08, 0.2, 6).translate(0, 0.21, 0), color: '', tint: true },
    { geo: new THREE.IcosahedronGeometry(0.054, 0).translate(0.005, 0.36, 0), color: PAL.skin },
    // The cap: a knitted one, pulled down snug, its rolled brim.
    { geo: new THREE.IcosahedronGeometry(0.06, 0).scale(1, 0.7, 1).translate(-0.008, 0.39, 0), color: SMUGGLER_CAP },
    { geo: new THREE.CylinderGeometry(0.06, 0.062, 0.022, 7).translate(-0.004, 0.37, 0), color: SMUGGLER_CAP },
  ];
  if (load) {
    parts.push({ geo: new THREE.CylinderGeometry(0.015, 0.014, 0.14, 4).rotateX(0.9).translate(-0.01, 0.33, 0.06), color: PAL.skin });
    parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.085, 1), 0.2, 4101).scale(1.1, 0.9, 0.9).translate(-0.08, 0.37, 0.06), color: PAL.sack });
  } else {
    parts.push({ geo: new THREE.CylinderGeometry(0.014, 0.013, 0.14, 4).translate(0.0, 0.22, 0.07), color: PAL.skin });
    parts.push({ geo: new THREE.CylinderGeometry(0.014, 0.013, 0.14, 4).translate(0.0, 0.22, -0.07), color: PAL.skin });
  }
  return mergeTinted(parts);
}
// Slice 45
/**
 * One of the caught, walked to the court: a plain grey tunic (the tinted
 * part), head bowed, his hands bound behind him with a rope, the rope's end
 * trailing to the watchman a step behind.
 */
function convict(): THREE.BufferGeometry {
  const parts: TPart[] = [
    leg(0, -0.028, 0.12, 0.019, PAL.skin, -0.7),
    leg(0, 0.028, 0.12, 0.019, PAL.skin, 0.7),
    { geo: new THREE.CylinderGeometry(0.05, 0.075, 0.2, 6).rotateZ(-0.1).translate(0.005, 0.21, 0), color: '', tint: true },
    // The head hung forward.
    { geo: new THREE.IcosahedronGeometry(0.05, 0).translate(0.05, 0.315, 0), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.052, 0).scale(1, 0.6, 1).translate(0.03, 0.345, 0), color: PAL.hair },
    // (Slice 49, slice 45's finding: the watchman walks a step behind him now.) Both arms behind his back, the wrists bound, the rope's end trailing back to the watchman's hand.
    { geo: new THREE.CylinderGeometry(0.014, 0.013, 0.12, 4).rotateZ(-0.66).rotateX(0.3).translate(-0.04, 0.235, 0.035), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.014, 0.013, 0.12, 4).rotateZ(-0.66).rotateX(-0.3).translate(-0.04, 0.235, -0.035), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.022, 0.022, 0.035, 6).rotateX(Math.PI / 2).translate(-0.08, 0.19, 0), color: CONVICT_ROPE },
    { geo: new THREE.CylinderGeometry(0.005, 0.005, 0.24, 3).rotateZ(1.25).translate(-0.19, 0.22, 0), color: CONVICT_ROPE },
  ];
  return mergeTinted(parts);
}

// Slice 49
/**
 * The physician: a woman in a long white robe (the tinted part) with a
 * herb-green sash, a leather bag of herbs and salves at her hip, and a tall
 * staff in her hand with the healer's snake coiled up it.
 */
function physician(): THREE.BufferGeometry {
  const parts: TPart[] = [
    leg(0, -0.025, 0.08, 0.018, PAL.skin, -1),
    leg(0, 0.025, 0.08, 0.018, PAL.skin, 1),
    { geo: new THREE.CylinderGeometry(0.05, 0.095, 0.29, 7).translate(0, 0.19, 0), color: '', tint: true },
    // The sash across the chest, the bag on its strap at the left hip.
    { geo: new THREE.BoxGeometry(0.014, 0.2, 0.024).rotateX(0.7).translate(0.048, 0.26, 0), color: PHYSICIAN_SASH },
    { geo: new THREE.BoxGeometry(0.07, 0.065, 0.04).translate(-0.005, 0.17, -0.092), color: PAL.satchel },
    { geo: new THREE.BoxGeometry(0.072, 0.02, 0.042).translate(-0.005, 0.2, -0.092), color: PHYSICIAN_SASH },
    { geo: new THREE.IcosahedronGeometry(0.054, 0).translate(0.005, 0.36, 0), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.058, 0).scale(1, 0.8, 1).translate(-0.014, 0.385, 0), color: PAL.hair },
    { geo: new THREE.IcosahedronGeometry(0.03, 0).translate(-0.06, 0.37, 0), color: PAL.hair },
    // The staff, upright in her right hand, the bronze-green snake coiled up it.
    { geo: new THREE.CylinderGeometry(0.014, 0.013, 0.14, 4).rotateX(-0.5).translate(0.02, 0.25, 0.08), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.008, 0.009, 0.52, 4).translate(0.05, 0.27, 0.12), color: PAL.woodDark },
    // The other arm at her side, on the bag.
    { geo: new THREE.CylinderGeometry(0.014, 0.013, 0.14, 4).translate(0.0, 0.22, -0.075), color: PAL.skin },
  ];
  for (let i = 0; i < 3; i++) parts.push({ geo: new THREE.TorusGeometry(0.02, 0.006, 3, 6).rotateX(Math.PI / 2 + (i % 2 ? 0.4 : -0.4)).translate(0.05, 0.24 + i * 0.08, 0.12), color: PAL.bronzeGreen });
  return mergeTinted(parts);
}

/**
 * The asklepieion's stretcher-bearers: two men in linen (the tinted part),
 * one before and one behind, a litter of two poles and a cloth slung between
 * them at their hands. `laden`: someone lies on it under a blanket.
 */
function bearers(laden: boolean): THREE.BufferGeometry {
  const parts: TPart[] = [];
  for (const [x, sw] of [[0.24, 1], [-0.24, -1]] as const) {
    parts.push(leg(x, -0.028, 0.12, 0.019, PAL.skin, -sw), leg(x, 0.028, 0.12, 0.019, PAL.skin, sw));
    parts.push({ geo: new THREE.CylinderGeometry(0.05, 0.078, 0.2, 6).translate(x, 0.2, 0), color: '', tint: true });
    parts.push({ geo: new THREE.IcosahedronGeometry(0.052, 0).translate(x + 0.005, 0.35, 0), color: PAL.skin });
    parts.push({ geo: new THREE.IcosahedronGeometry(0.055, 0).scale(1, 0.62, 1).translate(x - 0.008, 0.375, 0), color: PAL.hair });
    // Both arms down to the poles at his sides (the one in front reaching back, the one behind forward).
    for (const z of [-0.075, 0.075]) parts.push({ geo: new THREE.CylinderGeometry(0.014, 0.013, 0.12, 4).rotateZ(x > 0 ? 0.35 : -0.35).translate(x + (x > 0 ? -0.02 : 0.02), 0.22, z), color: PAL.skin });
  }
  // The litter: two poles from man to man at their hands, the cloth slung between them.
  for (const z of [-0.08, 0.08]) parts.push({ geo: new THREE.CylinderGeometry(0.008, 0.008, 0.56, 4).rotateZ(Math.PI / 2).translate(0, 0.165, z), color: PAL.wood });
  parts.push({ geo: new THREE.BoxGeometry(0.32, 0.012, 0.15).translate(0, 0.158, 0), color: LITTER_CLOTH });
  if (laden) {
    // Lying on it, head forward, under a blanket.
    parts.push({ geo: new THREE.BoxGeometry(0.24, 0.045, 0.11).translate(-0.02, 0.188, 0), color: BLANKET });
    parts.push({ geo: new THREE.IcosahedronGeometry(0.04, 0).scale(1, 0.8, 1).translate(0.13, 0.19, 0), color: PAL.skin });
    parts.push({ geo: new THREE.IcosahedronGeometry(0.042, 0).scale(1, 0.55, 1).translate(0.14, 0.205, 0), color: PAL.hair });
  }
  return mergeTinted(parts);
}

/** A sick one at the door: bent, a blanket (the tinted part) over head and shoulders, a hand to the mouth (drawn by HealthView). */
function sickFigure(): THREE.BufferGeometry {
  const parts: TPart[] = [
    leg(0, -0.026, 0.11, 0.018, PAL.skin),
    leg(0, 0.026, 0.11, 0.018, PAL.skin),
    { geo: new THREE.CylinderGeometry(0.045, 0.07, 0.18, 6).rotateZ(-0.3).translate(0.02, 0.19, 0), color: '#d9cfb8' },
    { geo: new THREE.IcosahedronGeometry(0.05, 0).translate(0.075, 0.3, 0), color: PAL.skin },
    // The blanket: over the head and round the shoulders, falling down the back.
    { geo: new THREE.IcosahedronGeometry(0.058, 0).scale(1, 0.85, 1.05).translate(0.055, 0.32, 0), color: '', tint: true },
    { geo: new THREE.CylinderGeometry(0.06, 0.1, 0.2, 7, 1, true, Math.PI * 0.45, Math.PI * 1.1).rotateZ(-0.3).translate(0.0, 0.22, 0), color: '', tint: true },
    // A hand to the mouth; the other arm wrapped in the blanket.
    { geo: new THREE.CylinderGeometry(0.014, 0.013, 0.12, 4).rotateZ(-1.0).rotateX(0.3).translate(0.08, 0.25, 0.03), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.018, 0).translate(0.12, 0.29, 0.012), color: PAL.skin },
  ];
  return mergeTinted(parts);
}

/** A patient lying on a bed, along z, head to -z, under a blanket (the tinted part) (drawn by HealthView). */
function patientFigure(): THREE.BufferGeometry {
  const parts: TPart[] = [
    { geo: new THREE.BoxGeometry(0.11, 0.05, 0.25).translate(0, 0.025, 0.03), color: '', tint: true },
    { geo: new THREE.IcosahedronGeometry(0.042, 0).scale(1, 0.75, 1).translate(0, 0.03, -0.12), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.045, 0).scale(1, 0.5, 1).translate(0, 0.045, -0.135), color: PAL.hair },
  ];
  return mergeTinted(parts);
}

/** The figures HealthView draws (made here, with the walkers' kit). */
export function healthFigures(): HealthFigures {
  return { sick: sickFigure(), patient: patientFigure() };
}

/** The criminals' clothes, and a gang man's (rust red). */
const CROOK_TUNIC: Record<'pickpocket' | 'vandal' | 'arsonist' | 'smuggler', string> = { pickpocket: '#7d705e', vandal: '#4a3c35', arsonist: '#3a3036', smuggler: '#3f6f86' };
const GANG_RED = '#8e3a2a';

/** How the raiders hold themselves: in to the target with torches and spears, out with sacks if they took anything. */
const RAIDER_HOLDS = ['torch', 'spear', 'sack'] as const;

/** Which porter look a docker's handcart takes for each trade good (wheat; meat and cheese as the mixed load). */
const DOCKER_LOOK: Record<number, number> = { [WHEAT]: 1, [MEAT]: 2, [CHEESE]: 2, [OIL]: 3, [FLEECE]: 4, [WINE]: 5 };

const TUNICS = [PAL.tunicTerracotta, PAL.tunicOchre, PAL.tunicBlue, PAL.tunicCream, PAL.tunicGreen, PAL.tunicPlum];

/** The kinds of walker with a job (all but settlers and leavers). */
/** Drachmas in a tax collector's satchel from which it shows full. */
const SATCHEL_FULL = 20;

export type ServiceKind = 'water' | 'food' | 'cart' | 'porter' | 'priestess' | 'actor' | 'tax' | 'hunter' | 'oil' | 'fleece' | 'wine' | 'watchman' | 'inspector' | 'docker' | 'caravan' | 'raider' | 'thief' | 'quarryman' | 'logger' | 'sledge' | 'builder' | 'oxcart' | 'visitor'
  // Slice 37: a household walking down to the quay for a colony (drawn as settlers are).
  | 'colonist'
  // Slice 43: a porter carrying goods down to the quay for a colony.
  | 'shipper'
  // Slice 41: the new kinds of criminal.
  | 'pickpocket'
  | 'vandal'
  | 'arsonist'
  | 'smuggler'
  // Slice 45: someone caught, walked to the court by a watchman.
  | 'convict'
  // Slice 49: an infirmary's physician, and an asklepieion's stretcher-bearers.
  | 'physician'
  | 'bearer'
  // Slice 53: a festival's procession (by its first), and a porter with an offering.
  | 'procession'
  | 'offering';

/** Settler and leaver groups, water carriers, food and oil vendors, priestesses, actors, tax collectors, ox carts and porters walking the roads, redrawn every frame (into the folk's merged meshes: the city view begins and ends the frame). */
export class Walkers {
  readonly group = new THREE.Group();
  private readonly kinds: [Look, Look];
  private readonly carriers: Look;
  private readonly vendors: Look;
  private readonly priestesses: Look;
  // Slice 53: a festival's procession.
  private readonly marchers: Look;
  private readonly actors: Look;
  /** Tax collectors: [a light satchel, a full one]. */
  private readonly collectors: [Look, Look];
  /** Food vendors: [bread only, a mix]. */
  private readonly vendorsMixed: Look;
  /** Ox carts: [empty, then by ware: wheat, meat, cheese, olives, oil, fleece, grapes, wine]; porters: [empty, wheat, a mix, oil, fleece, wine]. */
  private readonly carts: Look[];
  private readonly porters: Look[];
  /** Slice 36: a groom leading a horse, or two. */
  private readonly grooms: [Look, Look];
  private readonly oilVendors: Look;
  private readonly fleeceVendors: Look;
  private readonly wineVendors: Look;
  /** Hunters: [setting out, with a deer, with a boar]. */
  private readonly hunters: [Look, Look, Look];
  /** Watchmen: [walking the round, running to a fire or fighting it]. */
  private readonly watchmen: [Look, Look];
  private readonly inspectors: Look;
  /** Caravans: their drover and their donkeys. */
  private readonly drovers: Look;
  /** Raiders: [a torch, a spear, a sack of loot]. */
  private readonly raiders: Look[];
  private readonly donkeys: Look;
  /** (Slice 34) Donkeys carrying a vassal's tribute of oil or wine, in jars. */
  private readonly jarDonkeys: Look;
  /** Thieves (slice 30): [on the way out, home with a purse, home with a sack]. */
  private readonly thieves: [Look, Look, Look];
  /** Slice 41: pickpockets [out, home with a purse], vandals [club on the shoulder, swinging], arsonists [torch lit, spent], smugglers [out, home with a sack]. */
  private readonly crooks: Record<'pickpocket' | 'vandal' | 'arsonist' | 'smuggler', [Look, Look]>;
  /** Slice 45: one of the caught, walked to the court. */
  private readonly convicts: Look;
  /** Slice 49: physicians on their rounds; stretcher-bearers [going out, carrying someone back]. */
  private readonly physicians: Look;
  private readonly bearers: [Look, Look];
  private readonly all: Look[];
  /** Where each walker with a job was drawn this frame (for hovering, clicking and following). */
  readonly serviceAt = new Map<number, { pos: THREE.Vector3; kind: ServiceKind }>();
  /** The height of the ground (or a bridge's deck) a walker stands on. */
  ground: (x: number, z: number) => number;
  private readonly paths = new Map<number, { route: number; cum: Float32Array }>();
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly c = new THREE.Color();
  private readonly e = new THREE.Euler();

  constructor(map: CoastMap, folk: FolkLooks) {
    this.group.name = 'walkers';
    this.ground = (x, z) => map.heightAt(x, z);
    // Every look goes into the folk's merged meshes (see looks.ts): one draw for all the people, one for the carts and hunters.
    const small = (g: THREE.BufferGeometry): Look => folk.people.look(g);
    const big = (g: THREE.BufferGeometry): Look => folk.big.look(g);
    this.kinds = [small(person('head')), small(person('back'))];
    this.carriers = small(carrier());
    this.vendors = small(vendor(false));
    this.vendorsMixed = small(vendor(true));
    this.priestesses = small(priestess());
    this.actors = small(actor());
    this.collectors = [small(collector(false)), small(collector(true))];
    this.oilVendors = small(oilVendor());
    this.fleeceVendors = small(fleeceVendor());
    this.wineVendors = small(wineVendor());
    this.carts = (['none', 'wheat', 'meat', 'cheese', 'olives', 'oil', 'fleece', 'grapes', 'wine'] as const).map((l) => big(oxCart(l)));
    this.porters = (['none', 'wheat', 'mixed', 'oil', 'fleece', 'wine', 'marble', 'armour'] as const).map((l) => small(porter(l)));
    this.grooms = [small(groomModel(false)), small(groomModel(true))];
    this.hunters = [small(hunter('none')), big(hunter('deer')), big(hunter('boar'))];
    this.watchmen = [small(watchman(false)), small(watchman(true))];
    this.inspectors = small(inspector());
    this.drovers = small(drover());
    this.donkeys = big(donkey());
    this.jarDonkeys = big(donkey(true));
    this.raiders = RAIDER_HOLDS.map((h) => small(raider(h)));
    this.thieves = [small(thief('none')), small(thief('purse')), small(thief('sack'))];
    this.crooks = {
      pickpocket: [small(pickpocket(false)), small(pickpocket(true))],
      vandal: [small(vandal(false)), small(vandal(true))],
      arsonist: [small(arsonist(true)), small(arsonist(false))],
      smuggler: [small(smuggler(false)), small(smuggler(true))],
    };
    this.convicts = small(convict());
    // Slice 49.
    this.physicians = small(physician());
    // (In the big batch with the carts: two men and a litter run as many vertices as a cart, and among the people they would raise
    // every walker's cost to theirs; see MergedLooks' tiers in looks.ts.)
    this.bearers = [big(bearers(false)), big(bearers(true))];
    this.all = [this.physicians, ...this.bearers, this.convicts, ...Object.values(this.crooks).flat(), ...this.thieves, ...this.raiders, ...this.kinds, this.carriers, this.vendors, this.vendorsMixed, this.oilVendors, this.fleeceVendors, this.wineVendors, this.priestesses, this.actors, ...this.collectors, ...this.carts, ...this.porters, ...this.grooms, ...this.hunters, ...this.watchmen, this.inspectors, this.drovers, this.donkeys, this.jarDonkeys];
    // Slice 53
    this.marchers = small(marcher());
    this.all.push(this.marchers);
  }

  get count(): number {
    let n = 0;
    for (const k of this.all) n += k.count;
    return n;
  }

  private cum(w: Walker): Float32Array {
    let e = this.paths.get(w.id);
    if (!e || e.route !== w.route) {
      const n = w.path.length / 2;
      const cum = new Float32Array(n);
      for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(w.path[i * 2] - w.path[i * 2 - 2], w.path[i * 2 + 1] - w.path[i * 2 - 1]);
      e = { route: w.route, cum };
      this.paths.set(w.id, e);
    }
    return e.cum;
  }

  /** Where along the path a distance falls: position and heading. */
  private at(w: Walker, cum: Float32Array, d: number): [number, number, number, number] {
    const n = cum.length;
    let i = 0;
    while (i < n - 2 && cum[i + 1] < d) i++;
    const len = cum[i + 1] - cum[i] || 1;
    const f = Math.min(1, Math.max(0, (d - cum[i]) / len));
    const x0 = w.path[i * 2];
    const z0 = w.path[i * 2 + 1];
    const x1 = w.path[i * 2 + 2];
    const z1 = w.path[i * 2 + 3];
    return [x0 + (x1 - x0) * f, z0 + (z1 - z0) * f, (x1 - x0) / len, (z1 - z0) / len];
  }

  // Slice 49
  /** Where a watchman walking one of the caught is drawn: a step behind him on his way (null: he walks nobody, or the convict is handed in). */
  private behind(state: SimState, w: Walker, alpha: number): [number, number, number, number, number] | null {
    const c = state.walkers.find((o) => o.id === w.meat && o.kind === 'convict' && o.people > 0);
    if (!c) return null;
    const cum = this.cum(c);
    const total = cum[cum.length - 1];
    const lead = Math.min(total, cum[c.seg] + c.along + (c.wait > 0 ? 0 : alpha * PATROL_SPEED));
    const d = Math.max(0, lead - ESCORT_STEP);
    const [x, z, dx, dz] = this.at(c, cum, d);
    return [x, z, dx, dz, lead < total && c.wait <= 0 ? 1 : 0];
  }

  update(state: SimState, alpha: number, _time: number): void {
    const live = new Set<number>();
    const dress = col(PAL.carrierDress);
    const saffron = col(PAL.vendorDress);
    const robe = col(PAL.priestessRobe);
    const rose = col(PAL.actorTunic);
    const green = col(PAL.collectorTunic);
    const olive = col(PAL.hunterTunic);
    const oilDress = col(PAL.oilVendorDress);
    const fleeceDress = col(PAL.fleeceVendorDress);
    const wineTunic = col(PAL.wineVendorTunic);
    const watchTunic = col(PAL.watchmanTunic);
    const blue = col(PAL.inspectorDress);
    const dockerTunic = col(PAL.dockerTunic);
    const cloak = col('#3a3540');
    // Slice 41: the gangs' dens (their men are drawn in rust red).
    const gangs = new Set(state.crime.gangs.map((g) => g.den));
    const gangRed = col(GANG_RED);
    const convictTunic = col(CONVICT_TUNIC);
    // Slice 49.
    const physicianRobe = col(PHYSICIAN_ROBE);
    const bearerTunic = col(BEARER_TUNIC);
    // Caravans waiting at the same gate stand one behind the other along the road, not in one another (slice 22): each one's place in the line, by who came first.
    const queue = new Map<number, number>();
    const gates = new Map<string, number>();
    for (const w of state.walkers) {
      if (w.kind !== 'caravan' || w.wait <= 0 || w.path.length < 2) continue;
      const key = `${w.path[w.path.length - 2]},${w.path[w.path.length - 1]}`;
      const n = gates.get(key) ?? 0;
      if (n > 0) queue.set(w.id, n);
      gates.set(key, n + 1);
    }
    for (const w of state.walkers) {
      live.add(w.id);
      const cum = this.cum(w);
      const total = cum[cum.length - 1];
      // (Waiting, as a hunter stalking: no creeping on between ticks.)
      // (Slice 41: the new criminals go at a thief's pace in the sim, a pickpocket at half that among a crowd.)
      // (Slice 45: one of the caught walks at the watchman's pace.)
      const pace = w.kind === 'pickpocket' && w.steps === 1 && !w.back ? MINGLE_SPEED : w.kind === 'vandal' || w.kind === 'arsonist' || w.kind === 'smuggler' || w.kind === 'pickpocket' ? THIEF_SPEED : w.kind === 'convict' ? PATROL_SPEED : w.kind === 'physician' ? CARRIER_SPEED : w.kind === 'bearer' ? BEARER_SPEED : speedOf(w);
      const lead = Math.min(total, cum[w.seg] + w.along + (w.wait > 0 ? 0 : alpha * pace));
      if (w.kind === 'caravan') {
        const back = (queue.get(w.id) ?? 0) * (DROVER_GAP + w.people * DONKEY_SPACING + 0.35);
        // (Slice 34: a vassal's tribute of oil or wine comes in jars, until it is unloaded.)
        const levy = w.cheese < 0 && !w.back ? state.empire.tribute.find((x) => x.id === -w.cheese) : undefined;
        this.caravan(w, cum, Math.max(0, lead - back), total, !!levy && levy.phase === 'city' && (TRADE_GOODS[levy.good] === OIL || TRADE_GOODS[levy.good] === WINE));
        continue;
      }
      if (w.kind === 'raider') {
        this.band(w, cum, lead);
        continue;
      }
      // (Run indoors from raiders near them: not drawn until they come out.)
      if (this.hidden.has(w.id)) continue;
      // Slice 32: the quarrymen, loggers, ox sledges and carts of logs are drawn by the workfolk (workfolk.ts).
      if (this.workfolk) {
        const at = this.workfolk.walker(state, w, lead, total, (d) => this.at(w, cum, d), state.tick + alpha);
        if (at) {
          const v = this.serviceAt.get(w.id);
          if (v) v.pos.copy(at);
          else this.serviceAt.set(w.id, { pos: at.clone(), kind: w.kind as ServiceKind });
          continue;
        }
      }
      if (w.kind !== 'settler' && w.kind !== 'leaver' && w.kind !== 'colonist' && w.kind !== 'procession') {
        // (Slice 49, slice 45's finding: a watchman walking one of the caught is drawn a step behind him, on his way.)
        const behind = w.kind === 'watchman' && w.meat > 0 ? this.behind(state, w, alpha) : null;
        const [x, z, dx, dz] = behind ?? this.at(w, cum, lead);
        const moving = behind ? behind[4] : lead < total && w.wait <= 0 ? 1 : 0;
        const cart = w.kind === 'cart';
        // In step with the legs (see STRIDE): highest as the legs pass, lowest at each footfall.
        const phase = ((x + z) * Math.PI * 2) / STRIDE;
        // A steadier walk than the settlers': she carries a full jar or basket; the cart rocks gently.
        const bob = Math.abs(Math.cos(phase)) * (cart ? 0.006 : 0.012) * moving;
        this.e.set(Math.sin(phase) * (cart ? 0.015 : 0.03) * moving, Math.atan2(-dz, dx), 0, 'YXZ');
        this.q.setFromEuler(this.e);
        this.p.set(x, this.ground(x, z) + 0.03 + bob, z);
        const sc = w.kind === 'water' || w.kind === 'food' || w.kind === 'oil' || w.kind === 'fleece' || w.kind === 'priestess' || w.kind === 'inspector' ? 0.9 : 0.95;
        this.s.set(sc, sc, sc);
        this.m.compose(this.p, this.q, this.s);
        // The colour's sign tells the shader whether the legs swing (negated: standing still).
        const still = (c: THREE.Color): THREE.Color => (moving ? c : c.multiplyScalar(-1));
        if (w.kind === 'water') this.carriers.push(this.m, still(this.c.copy(dress)));
        else if (w.kind === 'food') {
          const stall = state.buildings.find((b) => b.id === w.origin);
          (stall && (stall.meat > 0 || stall.cheese > 0) ? this.vendorsMixed : this.vendors).push(this.m, still(this.c.copy(saffron)));
        } else if (w.kind === 'oil') this.oilVendors.push(this.m, still(this.c.copy(oilDress)));
        else if (w.kind === 'fleece') this.fleeceVendors.push(this.m, still(this.c.copy(fleeceDress)));
        else if (w.kind === 'wine') this.wineVendors.push(this.m, still(this.c.copy(wineTunic)));
        else if (w.kind === 'hunter') {
          const kill = w.back && w.load > 0 ? (state.herds[w.food]?.kind === 'boar' ? 2 : 1) : 0;
          this.hunters[kill].push(this.m, still(this.c.copy(olive)));
        }
        // (Slice 53: a dedicated shrine's priestess wears her god's colour.)
        else if (w.kind === 'priestess') {
          const god = findBuilding(state, w.origin)?.god;
          this.priestesses.push(this.m, still(god ? this.c.setHex(GODS[god].colour) : this.c.copy(robe)));
        }
        // Slice 53: a porter carrying an offering to a shrine, in the god's colour, the sacred good on his shoulder.
        else if (w.kind === 'offering') {
          const god = GOD_IDS[w.steps];
          this.porters[w.load > 0 ? (PORTER_LOOK[w.food] ?? DOCKER_LOOK[w.food] ?? 1) : 0].push(this.m, still(god ? this.c.setHex(GODS[god].colour) : this.c.copy(dockerTunic)));
        }
        else if (w.kind === 'actor') this.actors.push(this.m, still(this.c.copy(rose)));
        // (Slice 45: walking one of the caught to the court, he walks, not runs.)
        else if (w.kind === 'watchman') this.watchmen[w.target > 0 || (w.meat > 0 && !state.walkers.some((o) => o.id === w.meat && o.kind === 'convict')) ? 1 : 0].push(this.m, still(this.c.copy(watchTunic)));
        // Slice 45: one of the caught (handed in: gone at once).
        else if (w.kind === 'convict') {
          if (w.people <= 0) continue;
          this.convicts.push(this.m, still(this.c.copy(convictTunic)));
        }
        // Slice 49: a physician on her round; a pair of stretcher-bearers, carrying someone back once they have lifted her.
        else if (w.kind === 'physician') this.physicians.push(this.m, still(this.c.copy(physicianRobe)));
        else if (w.kind === 'bearer') this.bearers[w.back && w.food === 1 ? 1 : 0].push(this.m, still(this.c.copy(bearerTunic)));
        else if (w.kind === 'thief') {
          // (Caught: gone from the street at once.)
          if (w.people <= 0) continue;
          // (Slice 41: a gang's man in its rust red.)
          this.thieves[w.back && w.load > 0 ? (w.food < 0 ? 1 : 2) : 0].push(this.m, still(this.c.copy(gangs.has(w.home) ? gangRed : cloak).multiplyScalar(0.85 + 0.3 * hash2(w.home, 7, 30))));
        }
        // Slice 41: the new kinds of criminal (caught: gone at once).
        else if (w.kind === 'pickpocket' || w.kind === 'vandal' || w.kind === 'arsonist' || w.kind === 'smuggler') {
          if (w.people <= 0) continue;
          const pose = w.kind === 'vandal' ? (w.wait > 0 ? 1 : 0) : w.kind === 'arsonist' ? (w.back ? 1 : 0) : w.back && w.load > 0 ? 1 : 0;
          this.crooks[w.kind][pose].push(this.m, still(this.c.copy(gangs.has(w.home) ? gangRed : col(CROOK_TUNIC[w.kind])).multiplyScalar(0.9 + 0.2 * hash2(w.home, 7, 31))));
        }
        else if (w.kind === 'inspector') this.inspectors.push(this.m, still(this.c.copy(blue)));
        else if (w.kind === 'tax') this.collectors[purseTotal(w) >= SATCHEL_FULL ? 1 : 0].push(this.m, still(this.c.copy(green)));
        // Slice 43: a porter carrying goods down to the quay for a colony, in the dockers' sea-green, his load on his shoulder.
        else if (w.kind === 'shipper') this.porters[w.load > 0 ? (PORTER_LOOK[w.food] ?? DOCKER_LOOK[w.food] ?? 1) : 0].push(this.m, still(this.c.copy(dockerTunic)));
        else if (w.kind === 'docker') {
          // The trading post's docker: a sea-green tunic, his handcart showing what he carries (to the quay, or back to a store).
          this.porters[w.load > 0 ? (DOCKER_LOOK[w.food] ?? 1) : 0].push(this.m, still(this.c.copy(dockerTunic)));
        } else {
          this.c.copy(col(TUNICS[Math.floor(hash2(w.origin, 3, 62) * TUNICS.length)]));
          // Slice 36: horses are led, by a horse farm's grooms and an estate's (on his way out, he walks with nothing).
          if (w.food === HORSES && (cart || w.kind === 'porter')) (w.load > 0 ? this.grooms[w.load >= 2 ? 1 : 0] : this.kinds[1]).push(this.m, still(this.c));
          // A cart shows its ware (wares past those with a look yet show as an empty cart).
          else if (cart) (this.carts[w.load > 0 ? 1 + w.food : 0] ?? this.carts[0]).push(this.m, still(this.c));
          else {
            const ware = PORTER_LOOK[w.food];
            this.porters[ware !== undefined ? (w.load > 0 ? ware : 0) : w.meat > 0 || w.cheese > 0 ? 2 : w.load > 0 ? 1 : 0].push(this.m, still(this.c));
          }
        }
        const v = this.serviceAt.get(w.id);
        if (v) v.pos.copy(this.p);
        else this.serviceAt.set(w.id, { pos: this.p.clone(), kind: w.kind });
        continue;
      }
      for (let k = 0; k < w.people; k++) {
        const d = Math.max(0, lead - k * SPACING);
        const [x0, z0, dx, dz] = this.at(w, cum, d);
        // Walk a little side by side rather than in a ruled line.
        const side = k === 0 ? 0 : (k % 2 ? 1 : -1) * 0.1;
        const x = x0 - dz * side;
        const z = z0 + dx * side;
        const seed = w.id * 7 + k;
        const phase = ((x + z) * Math.PI * 2) / STRIDE;
        const moving = d > 0 && d < total ? 1 : 0;
        const bob = Math.abs(Math.cos(phase)) * 0.018 * moving;
        const child = w.people >= 3 && k === w.people - 1;
        const sc = child ? 0.66 : 0.84 + 0.1 * hash2(seed, 1, 61);
        this.e.set(Math.sin(phase) * 0.06 * moving, Math.atan2(-dz, dx), 0, 'YXZ');
        this.q.setFromEuler(this.e);
        this.p.set(x, this.ground(x, z) + 0.03 + bob, z);
        this.s.set(sc, sc, sc);
        this.m.compose(this.p, this.q, this.s);
        // Slice 53: a procession walks in long robes, in the god's colour and white by turns.
        if (w.kind === 'procession') {
          const god = GOD_IDS[w.steps];
          if (god && k % 2 === 0) this.c.setHex(GODS[god].colour);
          else this.c.copy(robe);
          if (!moving) this.c.multiplyScalar(-1);
          this.marchers.push(this.m, this.c);
          if (k === 0) {
            const v = this.serviceAt.get(w.id);
            if (v) v.pos.copy(this.p);
            else this.serviceAt.set(w.id, { pos: this.p.clone(), kind: 'procession' });
          }
          continue;
        }
        this.c.copy(col(TUNICS[Math.floor(hash2(seed, 2, 62) * TUNICS.length)]));
        if (!moving) this.c.multiplyScalar(-1);
        this.kinds[k === 0 ? 0 : 1].push(this.m, this.c);
        // Slice 37: a colonist household can be hovered and followed, by its first.
        if (w.kind === 'colonist' && k === 0) {
          const v = this.serviceAt.get(w.id);
          if (v) v.pos.copy(this.p);
          else this.serviceAt.set(w.id, { pos: this.p.clone(), kind: 'colonist' });
        }
      }
    }
    for (const id of this.paths.keys()) if (!live.has(id)) this.paths.delete(id);
    for (const id of this.serviceAt.keys()) if (!live.has(id)) this.serviceAt.delete(id);
    this.raidersOf(state, alpha);
  }

  /** Slice 32: who draws the works' walkers (set by the city view). */
  workfolk: { walker(s: SimState, w: Walker, lead: number, total: number, along: (d: number) => [number, number, number, number], now: number): THREE.Vector3 | null } | null = null;

  /** Walkers who have run indoors from the raiders (set by the city view each frame: the sim's own rule). */
  hidden: ReadonlySet<number> = new Set();

  /**
   * A raiding band (slice 24): its men are drawn one by one from the sim's
   * raiders (`foes`), so here only the band's head is noted, for hovering,
   * clicking and following.
   */
  private band(w: Walker, cum: Float32Array, lead: number): void {
    const [hx, hz] = this.at(w, cum, lead);
    this.p.set(hx, this.ground(hx, hz) + 0.03, hz);
    const v = this.serviceAt.get(w.id);
    if (v) v.pos.copy(this.p);
    else this.serviceAt.set(w.id, { pos: this.p.clone(), kind: 'raider' });
  }

  /** Where each raider was drawn this frame (for hovering). */
  readonly foeAt = new Map<number, THREE.Vector3>();
  /** Each raider's place at the last two ticks seen. */
  private readonly foeWas = new Map<number, { px: number; pz: number; x: number; z: number }>();
  private foeTick = -1;

  /**
   * The raiders on the map, man by man, in their city's colours: running in a
   * loose pack with torches and spears, round their target with torches up,
   * out with sacks if they took anything; in a fight, spears levelled, lunging
   * as they strike; fallen, lying on their side, sinking from sight before
   * they are gone.
   */
  private raidersOf(state: SimState, alpha: number): void {
    const foes = state.army.foes;
    if (!foes.length) {
      if (this.foeAt.size) this.foeAt.clear();
      this.foeWas.clear();
      return;
    }
    if (state.tick !== this.foeTick) {
      const jump = this.foeTick < 0 || state.tick - this.foeTick > 4 || state.tick < this.foeTick;
      this.foeTick = state.tick;
      const seen = new Set<number>();
      for (const f of foes) {
        seen.add(f.id);
        const w = this.foeWas.get(f.id);
        if (!w || jump) this.foeWas.set(f.id, { px: f.x, pz: f.z, x: f.x, z: f.z });
        else {
          w.px = w.x;
          w.pz = w.z;
          w.x = f.x;
          w.z = f.z;
        }
      }
      for (const id of this.foeWas.keys()) if (!seen.has(id)) this.foeWas.delete(id);
    }
    const a = Math.max(0, Math.min(1, alpha));
    const now = state.tick + a;
    const raids = new Map(state.world.raids.map((r) => [r.id, r]));
    const bands = new Map<number, Walker>();
    for (const w of state.walkers) if (w.kind === 'raider') bands.set(w.home, w);
    const live = new Set<number>();
    for (const f of foes) {
      const was = this.foeWas.get(f.id);
      if (!was) continue;
      live.add(f.id);
      const r = raids.get(f.raid);
      const band = bands.get(f.raid);
      const city = r ? r.city : 'sparta';
      let x = was.px + (was.x - was.px) * a;
      let z = was.pz + (was.z - was.pz) * a;
      const moving = f.state !== 'fallen' && Math.abs(was.x - was.px) + Math.abs(was.z - was.pz) > 1e-4;
      let tilt = 0;
      let roll = 0;
      let lift = 0.03;
      let sc = 1.05 + 0.08 * hash2(f.id, 5, 2105);
      if (f.state === 'fallen') {
        // Down: toppling onto his side over a few ticks, then lying still; sinking from sight before he is gone.
        const since = now - f.fell;
        roll = (Math.PI / 2) * Math.min(1, since / 4);
        lift = 0.05;
        const fade = Math.max(0, since - (FALLEN_LIE - 12)) / 12;
        lift -= fade * 0.12;
        sc *= 1 - fade * 0.3;
      } else {
        // Striking: a lunge forward along the way he faces, and back.
        const dt = now - f.swung;
        if (f.swung > 0 && dt >= 0 && dt < 3) {
          const k = Math.sin((dt / 3) * Math.PI);
          x += Math.cos(f.face) * 0.09 * k;
          z += Math.sin(f.face) * 0.09 * k;
          tilt = -0.3 * k;
        }
      }
      const phase = ((x + z) * Math.PI * 2) / STRIDE + f.slot;
      const bob = moving ? Math.abs(Math.cos(phase)) * 0.02 : 0;
      this.e.set(roll + (moving ? Math.sin(phase) * 0.05 : 0), -f.face, tilt, 'YXZ');
      this.q.setFromEuler(this.e);
      this.p.set(x, this.ground(x, z) + lift + bob, z);
      this.s.set(sc, sc, sc);
      this.m.compose(this.p, this.q, this.s);
      // (Their city's colour darkened, on the shield: slice 24's review found Sparta's red against your hoplites' read as one crowd.)
      this.c.copy(col(PLACES[city]?.colour ?? PAL.tunicTerracotta)).multiplyScalar(RAIDER_SHADE);
      if (!moving) this.c.multiplyScalar(-1);
      // Going out with loot: most carry a sack; fighting, spears; going in (or at their target), torches and spears.
      const loaded = !!band && band.back && band.load > 0;
      const hold = f.state === 'fight' ? 1 : loaded && f.slot % 4 !== 0 ? 2 : f.slot % 2 === 0 || (band && band.wait > 0) ? 0 : 1;
      this.raiders[hold].push(this.m, this.c);
      if (f.state !== 'fallen') {
        const at = this.foeAt.get(f.id);
        if (at) at.copy(this.p);
        else this.foeAt.set(f.id, this.p.clone());
      }
    }
    for (const id of this.foeAt.keys()) if (!live.has(id) || foes.find((f) => f.id === id)?.state === 'fallen') this.foeAt.delete(id);
  }

  /** A caravan: its drover ahead in his city's colour, his donkeys strung out behind him along the road, each in a blanket of the same colour. */
  private caravan(w: Walker, cum: Float32Array, lead: number, total: number, jars = false): void {
    const city = CITY_IDS[w.food];
    const colour = col(city ? PLACES[city].colour : PAL.tunicOchre);
    const resting = w.wait > 0;
    for (let k = 0; k <= w.people; k++) {
      const d = Math.max(0, lead - (k === 0 ? 0 : DROVER_GAP + (k - 1) * DONKEY_SPACING));
      const [x0, z0, dx, dz] = this.at(w, cum, d);
      // The donkeys a little out of line, as they follow.
      const side = k === 0 ? 0 : (hash2(w.id, k, 1710) - 0.5) * 0.08;
      const x = x0 - dz * side;
      const z = z0 + dx * side;
      const moving = !resting && d > 0 && d < total ? 1 : 0;
      const phase = ((x + z) * Math.PI * 2) / STRIDE + k;
      const bob = Math.abs(Math.cos(phase)) * (k === 0 ? 0.012 : 0.008) * moving;
      // Waiting at the yard, they stand about, heads every which way.
      const turn = resting && k > 0 ? (hash2(w.id, k, 1711) - 0.5) * 1.6 : 0;
      this.e.set(Math.sin(phase) * 0.02 * moving, Math.atan2(-dz, dx) + turn, 0, 'YXZ');
      this.q.setFromEuler(this.e);
      this.p.set(x, this.ground(x, z) + 0.03 + bob, z);
      const sc = k === 0 ? 0.95 : 1.15 + 0.1 * hash2(w.id, k, 1712);
      this.s.set(sc, sc, sc);
      this.m.compose(this.p, this.q, this.s);
      this.c.copy(colour);
      if (!moving) this.c.multiplyScalar(-1);
      (k === 0 ? this.drovers : jars ? this.jarDonkeys : this.donkeys).push(this.m, this.c);
      // Hovered, clicked and followed by the middle of the string, so pointing at any of it finds it.
      if (k === Math.ceil(w.people / 2)) {
        const v = this.serviceAt.get(w.id);
        if (v) v.pos.copy(this.p);
        else this.serviceAt.set(w.id, { pos: this.p.clone(), kind: 'caravan' });
      }
    }
  }
}
