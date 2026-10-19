import * as THREE from 'three';
import { currentLook } from './lookLab';
import { PAL } from './palette';
import type { TPart } from './walkers';

/**
 * Exploration only (the city-look mock-ups): people with a figure for look A.
 * Same height and the same swinging legs and arms as today's walkers, but a
 * real shape: a head with a nose and hair, a neck, shoulders and a waist, a
 * belted tunic or a long dress that falls in folds, two-part arms with hands,
 * shins and sandals. Facing +x, about 0.42 tall.
 */

export const lookFolkOn = (): boolean => currentLook() === 'a' || currentLook() === 'b';

const V = (r: number, y: number): THREE.Vector2 => new THREE.Vector2(r, y);

/** A lathe of a garment, flattened front to back, its skirt falling in folds below `foldsBelow`. */
function garment(profile: THREE.Vector2[], depth: number, folds: number, foldsBelow: number, seg = 14): THREE.BufferGeometry {
  const g = new THREE.LatheGeometry(profile, seg);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const k = y < foldsBelow ? (1 - y / foldsBelow) * 0.7 + 0.3 : 0;
    const s = 1 + Math.sin(a * folds) * 0.07 * k;
    p.setXYZ(i, x * s * depth, y, z * s);
  }
  return g;
}

/** A limb hanging from a joint, bent forward at the elbow (or knee) by `bend`. */
function arm(z: number, shoulderY: number, bend: number, side: number): TPart[] {
  const upper = new THREE.CylinderGeometry(0.016, 0.014, 0.1, 6).translate(0, -0.05, 0).rotateX(side * 0.12).translate(0, shoulderY, z);
  const fore = new THREE.CylinderGeometry(0.0135, 0.011, 0.09, 6).translate(0, -0.045, 0).rotateZ(bend).translate(0.0, shoulderY - 0.095, z + side * 0.012);
  const hand = new THREE.SphereGeometry(0.014, 6, 4).scale(1, 1.2, 0.8).translate(Math.sin(bend) * 0.09, shoulderY - 0.095 - Math.cos(bend) * 0.09, z + side * 0.012);
  const swing: [number, number, number] = [-0.55 * side, 0, shoulderY];
  return [
    { geo: upper, color: PAL.skin, leg: swing },
    { geo: fore, color: PAL.skin, leg: swing },
    { geo: hand, color: PAL.skin, leg: swing },
  ];
}

/** A raised arm steadying a load on the head. */
function armUp(z: number, shoulderY: number, side: number): TPart[] {
  const upper = new THREE.CylinderGeometry(0.016, 0.014, 0.09, 6).translate(0, 0.045, 0).rotateX(-side * 0.5).translate(0, shoulderY, z);
  const fore = new THREE.CylinderGeometry(0.0135, 0.011, 0.08, 6).translate(0, 0.04, 0).rotateX(side * 0.35).translate(0, shoulderY + 0.075, z + side * 0.04);
  return [
    { geo: upper, color: PAL.skin },
    { geo: fore, color: PAL.skin },
    { geo: new THREE.SphereGeometry(0.014, 6, 4).translate(0, shoulderY + 0.155, z + side * 0.02), color: PAL.skin },
  ];
}

function legPair(): TPart[] {
  const out: TPart[] = [];
  for (const [z, side] of [[0.026, 1], [-0.026, -1]] as const) {
    const swing: [number, number, number] = [side, 0, 0.14];
    out.push({ geo: new THREE.CylinderGeometry(0.019, 0.014, 0.13, 6).translate(0, 0.075, z), color: PAL.skin, leg: swing });
    // Sandal: a sole and a strap.
    out.push({ geo: new THREE.BoxGeometry(0.05, 0.012, 0.024).translate(0.012, 0.006, z), color: PAL.leather, leg: swing });
    out.push({ geo: new THREE.CylinderGeometry(0.016, 0.016, 0.01, 6).translate(0, 0.03, z), color: PAL.leather, leg: swing });
  }
  return out;
}

/** Head, nose and hair (or a veil): `hair` its colour, `bun` for a knot at the back. */
function head(y: number, hair: string, bun: boolean, veil = false): TPart[] {
  const parts: TPart[] = [
    { geo: new THREE.CylinderGeometry(0.016, 0.019, 0.04, 6).translate(0, y - 0.045, 0), color: PAL.skin },
    { geo: new THREE.SphereGeometry(0.041, 10, 8).scale(0.95, 1.1, 0.88).translate(0.004, y, 0), color: PAL.skin },
    { geo: new THREE.ConeGeometry(0.009, 0.022, 4).rotateZ(-Math.PI / 2).translate(0.044, y - 0.004, 0), color: PAL.skin },
  ];
  if (veil) {
    parts.push({ geo: new THREE.SphereGeometry(0.047, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62).scale(1, 1.1, 0.95).rotateZ(0.25).translate(-0.006, y + 0.004, 0), color: hair });
    parts.push({ geo: new THREE.CylinderGeometry(0.035, 0.06, 0.09, 10, 1, true, Math.PI * 0.5, Math.PI).translate(-0.01, y - 0.055, 0), color: hair });
  } else {
    // A cap of hair over the crown and the back of the head.
    parts.push({ geo: new THREE.SphereGeometry(0.045, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(1, 1.1, 0.95).rotateZ(0.35).translate(-0.006, y + 0.003, 0), color: hair });
    if (bun) parts.push({ geo: new THREE.SphereGeometry(0.022, 8, 6).translate(-0.04, y + 0.02, 0), color: hair });
  }
  return parts;
}

/** A man in a knee-length belted tunic (the tinted part), a mantle over one shoulder. */
function man(): TPart[] {
  const tunic = garment([V(0.0, 0.1), V(0.07, 0.1), V(0.064, 0.15), V(0.05, 0.21), V(0.047, 0.235), V(0.055, 0.28), V(0.064, 0.31), V(0.05, 0.325), V(0.02, 0.333), V(0.0, 0.333)], 0.68, 9, 0.22);
  const mantle = new THREE.CylinderGeometry(0.06, 0.07, 0.17, 12, 1, true, Math.PI * 0.15, Math.PI * 0.75).scale(0.75, 1, 1).rotateX(0.5).translate(0, 0.245, 0.01);
  return [
    ...legPair(),
    { geo: tunic, color: '', tint: true },
    { geo: new THREE.TorusGeometry(0.048, 0.006, 4, 14).rotateX(Math.PI / 2).scale(0.68, 1, 1).translate(0, 0.232, 0), color: PAL.rope },
    { geo: mantle, color: PAL.tunicCream },
    ...head(0.378, PAL.hair, false),
  ];
}

/** A woman in a long belted dress to the ground (the tinted part), a shawl on her shoulders. */
function woman(shawl: string, headdress: string, veil: boolean): TPart[] {
  const dress = garment([V(0.0, 0.0), V(0.078, 0.0), V(0.074, 0.06), V(0.06, 0.16), V(0.047, 0.235), V(0.052, 0.27), V(0.058, 0.3), V(0.046, 0.318), V(0.018, 0.326), V(0.0, 0.326)], 0.68, 11, 0.24, 16);
  return [
    { geo: dress, color: '', tint: true },
    // The overfold of the peplos, and the girdle under it.
    { geo: garment([V(0.06, 0.215), V(0.064, 0.21), V(0.058, 0.27), V(0.05, 0.3)], 0.7, 11, 0.3, 16), color: '', tint: true },
    { geo: new THREE.TorusGeometry(0.05, 0.005, 4, 14).rotateX(Math.PI / 2).scale(0.68, 1, 1).translate(0, 0.262, 0), color: PAL.rope },
    { geo: new THREE.CylinderGeometry(0.056, 0.066, 0.05, 14, 1, true).scale(0.72, 1, 1).translate(-0.004, 0.3, 0), color: shawl },
    ...head(0.37, headdress, !veil, veil),
  ];
}

/** Today's settler with a bundle, as a figure. */
export function personFigure(load: 'head' | 'back', lumpyBundle: (r: number, seed: number) => THREE.BufferGeometry): TPart[] {
  const parts: TPart[] = [...man()];
  if (load === 'head') {
    parts.push(...arm(-0.068, 0.305, 0.25, -1), ...armUp(0.068, 0.305, 1));
    parts.push({ geo: lumpyBundle(0.075, 51).scale(1.1, 0.6, 1).translate(0, 0.45, 0), color: PAL.bundleCream });
  } else {
    parts.push(...arm(0.068, 0.305, 0.35, 1), ...arm(-0.068, 0.305, 0.35, -1));
    parts.push({ geo: lumpyBundle(0.08, 52).scale(0.8, 1, 1).translate(-0.085, 0.26, 0), color: PAL.bundleBlue });
    parts.push({ geo: new THREE.TorusGeometry(0.05, 0.005, 4, 12).rotateY(Math.PI / 2).rotateX(0.4).translate(-0.02, 0.28, 0), color: PAL.rope });
  }
  return parts;
}

/** The water carrier, as a figure: her jar is added by the caller. */
export function carrierFigure(): TPart[] {
  return [...woman(PAL.carrierShawl, PAL.hair, false), ...arm(-0.064, 0.298, 0.3, -1), ...armUp(0.064, 0.298, 1)];
}

/** The food vendor, as a figure: her basket is added by the caller. */
export function vendorFigure(): TPart[] {
  return [...woman(PAL.vendorScarf, PAL.vendorScarf, true), ...arm(-0.064, 0.298, 0.3, -1), ...armUp(0.064, 0.298, 1)];
}

/** The porter, as a figure leaning into his handcart (the cart is added by the caller). */
export function porterFigure(): TPart[] {
  const body = man().map((p) => (p.leg ? p : { ...p, geo: p.geo.clone().rotateZ(-0.15) }));
  const reach = (z: number): TPart[] => [
    { geo: new THREE.CylinderGeometry(0.016, 0.013, 0.17, 6).rotateZ(-1.1).translate(0.09, 0.25, z), color: PAL.skin },
    { geo: new THREE.SphereGeometry(0.014, 6, 4).translate(0.165, 0.215, z), color: PAL.skin },
  ];
  return [...body, ...reach(0.066), ...reach(-0.066)];
}
