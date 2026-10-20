import * as THREE from 'three';
import { hash2 } from '../map/noise';
import { PLACES } from '../map/greece';
import { cyl, prism } from './homes';
import { PAL } from './palette';
import { lumpy, merge, type Part } from './trees';
import { leg, mergeTinted, type TPart } from './walkers';

/**
 * Slice 23's models: the copper mine, the armoury and the barracks (drawn
 * with the other workplaces by Works), their stock pieces (baskets of copper
 * ore and stands of armour), and the soldiers' looks (drawn in the folk's
 * merged meshes by ArmyView). Local frame as Works': the footprint's centre
 * at the origin, the front (towards the road) facing +x.
 */

/** A box from (x0, z0) to (x1, z1), standing from y0 to y1. */
const slab = (x0: number, z0: number, x1: number, z1: number, y0: number, y1: number): THREE.BufferGeometry =>
  new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);

/** The city's colour and its trim (Nea Argos: terracotta and cream). */
export const CITY_COLOUR = PLACES.home.colour;
export const CITY_TRIM = PLACES.home.trim;

// ---------------------------------------------------------------------------
// The copper mine (2×2: -1..1).

/**
 * The copper mine: a face of green-streaked rock at the back with a timbered
 * adit going into it, a spoil heap of greenish waste, a windlass over a shaft,
 * and plank rails out of the adit to the front, where the baskets of ore wait
 * for the carts (drawn with its store).
 */
export function mineModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  // The rock face and its mass behind, running down into the slope.
  parts.push({ geo: lumpy(slab(-1.0, -0.98, -0.25, 0.98, -0.8, 0.5), 0.08, 2301), color: PAL.rockDark });
  for (let i = 0; i < 7; i++) {
    const z = -0.85 + i * 0.28;
    const h = 0.55 + 0.25 * hash2(i, 1, 2302);
    parts.push({ geo: lumpy(new THREE.DodecahedronGeometry(0.26, 0), 0.3, 2303 + i).scale(1.2, h / 0.26 / 2, 1).translate(-0.62 + 0.12 * hash2(i, 2, 2302), 0.35, z), color: i % 2 ? PAL.rockGrey : PAL.rockDark });
  }
  // Streaks of green ore in the face.
  for (let i = 0; i < 6; i++) {
    const z = -0.8 + i * 0.32 + 0.1 * hash2(i, 3, 2302);
    parts.push({ geo: lumpy(new THREE.BoxGeometry(0.05, 0.08, 0.2).rotateX((hash2(i, 4, 2302) - 0.5) * 1.2), 0.3, 2310 + i).translate(-0.24, 0.18 + 0.25 * hash2(i, 5, 2302), z), color: i % 2 ? PAL.ore : PAL.oreDark });
  }
  // The adit: a dark mouth in the face, framed in timber.
  parts.push({ geo: slab(-0.3, -0.18, -0.2, 0.18, 0.0, 0.38), color: PAL.charDark });
  for (const z of [-0.2, 0.2]) parts.push({ geo: slab(-0.2, z - 0.035, -0.13, z + 0.035, 0.0, 0.42), color: PAL.timberDark });
  parts.push({ geo: slab(-0.21, -0.27, -0.12, 0.27, 0.42, 0.49), color: PAL.timber });
  // Plank rails out of the adit, to the front.
  for (const z of [-0.08, 0.08]) parts.push({ geo: slab(-0.2, z - 0.015, 0.95, z + 0.015, 0.0, 0.03), color: PAL.woodDark });
  for (let i = 0; i < 6; i++) parts.push({ geo: slab(-0.12 + i * 0.2, -0.13, -0.06 + i * 0.2, 0.13, 0.0, 0.02), color: PAL.wood });
  // The spoil heap, greenish grey, in the front corner.
  parts.push({ geo: lumpy(new THREE.ConeGeometry(0.4, 0.34, 8, 1), 0.18, 2320).translate(0.48, 0.13, -0.58), color: PAL.spoil });
  parts.push({ geo: lumpy(new THREE.ConeGeometry(0.2, 0.18, 6, 1), 0.2, 2321).translate(0.18, 0.06, -0.72), color: PAL.oreDark });
  // The shaft and its windlass, in the other corner.
  const [sx, sz] = [0.18, 0.62];
  parts.push({ geo: cyl(0.2, 0.22, 0.14, 8).translate(sx, 0.02, sz), color: PAL.rockGrey });
  parts.push({ geo: cyl(0.14, 0.14, 0.01, 8).translate(sx, 0.095, sz), color: PAL.charDark });
  for (const dz of [-0.2, 0.2]) parts.push({ geo: cyl(0.02, 0.025, 0.42, 4).translate(sx, 0.21, sz + dz), color: PAL.timberDark });
  parts.push({ geo: cyl(0.03, 0.03, 0.46, 6).rotateX(Math.PI / 2).translate(sx, 0.4, sz), color: PAL.timber });
  parts.push({ geo: cyl(0.004, 0.004, 0.26, 3).translate(sx, 0.27, sz), color: PAL.rope });
  parts.push({ geo: cyl(0.045, 0.035, 0.06, 6).translate(sx, 0.16, sz), color: PAL.bucket });
  // A crank handle, and a pick leaning on the rock.
  parts.push({ geo: slab(sx - 0.01, sz + 0.23, sx + 0.01, sz + 0.25, 0.32, 0.48), color: PAL.woodDark });
  parts.push({ geo: cyl(0.012, 0.012, 0.36, 4).rotateZ(0.5).translate(-0.12, 0.17, 0.5), color: PAL.wood });
  parts.push({ geo: slab(-0.24, 0.47, -0.04, 0.53, 0.31, 0.34), color: PAL.charDark });
  return merge(parts);
}

/** A basket of copper ore: wicker, heaped with green-streaked lumps. */
export function oreBasket(): THREE.BufferGeometry {
  return merge([
    { geo: cyl(0.075, 0.06, 0.08, 7).translate(0, 0.04, 0), color: PAL.basket },
    { geo: lumpy(new THREE.IcosahedronGeometry(0.07, 0), 0.35, 2330).scale(1, 0.55, 1).translate(0, 0.085, 0), color: PAL.ore },
    { geo: lumpy(new THREE.DodecahedronGeometry(0.03, 0), 0.3, 2331).translate(0.025, 0.11, -0.02), color: PAL.oreDark },
  ]);
}

// ---------------------------------------------------------------------------
// The armoury (3×3: -1.5..1.5).

/**
 * The armoury: a stone smithy under tiles at the back, its door to the yard;
 * an open forge beside it under a lean-to, with its chimney, the coals
 * glowing, the bellows and the anvil, and a quenching trough. The rack of
 * armour in the yard and the copper by the door are drawn with its store.
 */
export function armouryModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  const x0 = -1.42;
  const x1 = -0.35;
  const z0 = -1.4;
  const z1 = 0.35;
  // Levelled to the top of its ground (HIGH_FOOT): the plinth runs down the slope.
  parts.push({ geo: slab(x0 - 0.05, z0 - 0.05, x1 + 0.05, z1 + 0.05, -1.2, 0.08), color: PAL.plinth });
  parts.push({ geo: slab(x0, z0, x1, z1, 0.08, 0.74), color: PAL.pressStone });
  parts.push({ geo: slab(x0 - 0.01, z0 - 0.01, x1 + 0.01, z1 + 0.01, 0.08, 0.18), color: PAL.pressStoneDark });
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  parts.push({ geo: prism(z1 - z0 + 0.2, (x1 - x0) / 2 + 0.12, 0.36).rotateY(Math.PI / 2).translate(cx, 0.74, cz), color: PAL.roofTile });
  parts.push({ geo: cyl(0.03, 0.03, z1 - z0 + 0.22, 5).rotateX(Math.PI / 2).translate(cx, 1.1, cz), color: PAL.roofTileDark });
  // Its door to the yard and a step, a shield hung over it.
  parts.push({ geo: slab(x1, -0.9, x1 + 0.02, -0.56, 0.08, 0.58), color: PAL.door });
  parts.push({ geo: slab(x1 + 0.02, -0.94, x1 + 0.16, -0.52, -1.2, 0.04), color: PAL.pressStoneDark });
  parts.push({ geo: cyl(0.1, 0.1, 0.02, 10).rotateZ(Math.PI / 2).translate(x1 + 0.03, 0.62, -0.1), color: CITY_COLOUR });
  parts.push({ geo: cyl(0.03, 0.03, 0.025, 6).rotateZ(Math.PI / 2).translate(x1 + 0.035, 0.62, -0.1), color: PAL.bronze });
  // The forge: a lean-to off the smithy's end (z 0.35..1.35), open to the yard.
  const fz0 = 0.4;
  const fz1 = 1.38;
  for (const [x, z] of [[x0 + 0.05, fz1], [x1 + 0.2, fz1], [x1 + 0.2, fz0 + 0.05]]) parts.push({ geo: cyl(0.03, 0.035, 0.66, 5).translate(x, 0.33, z), color: PAL.timber });
  parts.push({ geo: new THREE.BoxGeometry(x1 - x0 + 0.5, 0.05, fz1 - fz0 + 0.18).rotateX(0.22).translate((x0 + x1 + 0.2) / 2, 0.72, (fz0 + fz1) / 2), color: PAL.roofTileDark });
  parts.push({ geo: slab(x0, fz0, x0 + 0.08, fz1, 0.0, 0.62), color: PAL.pressStone });
  // The hearth: a stone block, the coals glowing on it, and the chimney up through the roof.
  const hx = -1.05;
  const hz = 0.95;
  parts.push({ geo: slab(hx - 0.28, hz - 0.24, hx + 0.22, hz + 0.24, 0.0, 0.3), color: PAL.stoneBlockShade });
  parts.push({ geo: slab(hx - 0.2, hz - 0.17, hx + 0.14, hz + 0.17, 0.3, 0.33), color: PAL.char });
  parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.11, 0), 0.3, 2340).scale(1, 0.35, 1).translate(hx - 0.03, 0.34, hz), color: PAL.ember });
  parts.push({ geo: new THREE.ConeGeometry(0.05, 0.1, 5).translate(hx - 0.03, 0.39, hz), color: PAL.flame });
  parts.push({ geo: slab(hx - 0.3, hz - 0.18, hx - 0.12, hz + 0.18, 0.3, 1.25), color: PAL.pressStone });
  parts.push({ geo: slab(hx - 0.32, hz - 0.2, hx - 0.1, hz + 0.2, 1.25, 1.31), color: PAL.pressStoneDark });
  // The bellows beside it, and their lever.
  parts.push({ geo: new THREE.CylinderGeometry(0.03, 0.12, 0.28, 6).rotateZ(Math.PI / 2).scale(1, 0.55, 1).translate(hx + 0.36, 0.22, hz + 0.08), color: PAL.leather });
  parts.push({ geo: cyl(0.012, 0.012, 0.4, 4).rotateZ(-0.6).translate(hx + 0.5, 0.36, hz + 0.08), color: PAL.wood });
  // The anvil on its stump, a hammer on it; the quenching trough.
  const ax = -0.15;
  const az = 0.95;
  parts.push({ geo: cyl(0.1, 0.11, 0.2, 7).translate(ax, 0.1, az), color: PAL.logDark });
  parts.push({ geo: slab(ax - 0.12, az - 0.05, ax + 0.1, az + 0.05, 0.2, 0.27), color: PAL.charDark });
  parts.push({ geo: new THREE.ConeGeometry(0.05, 0.1, 4).rotateZ(Math.PI / 2).translate(ax + 0.14, 0.25, az), color: PAL.charDark });
  parts.push({ geo: cyl(0.008, 0.008, 0.14, 3).rotateX(Math.PI / 2).translate(ax - 0.02, 0.29, az + 0.04), color: PAL.wood });
  parts.push({ geo: slab(0.1, 1.08, 0.5, 1.32, 0.0, 0.16), color: PAL.vatStone });
  parts.push({ geo: slab(0.12, 1.1, 0.48, 1.3, 0.16, 0.161), color: PAL.shallow });
  return merge(parts);
}

/**
 * A stand of armour: a post with a crossbar, the bronze helmet with its crest
 * on top, the breastplate hung on it, the round shield (the city's colour,
 * a bronze rim) leaning against it and the spear beside.
 */
export function armourStand(): THREE.BufferGeometry {
  return merge([
    { geo: cyl(0.03, 0.04, 0.02, 6).translate(0, 0.01, 0), color: PAL.woodDark },
    { geo: cyl(0.01, 0.01, 0.3, 4).translate(0, 0.15, 0), color: PAL.wood },
    { geo: cyl(0.045, 0.05, 0.1, 7).translate(0, 0.22, 0), color: PAL.bronze },
    { geo: new THREE.IcosahedronGeometry(0.045, 0).scale(1, 0.85, 1).translate(0, 0.31, 0), color: PAL.bronze },
    { geo: slab(-0.06, -0.008, 0.06, 0.008, 0.33, 0.37), color: PAL.crest },
    // The shield leaning on the post, face to the front.
    { geo: cyl(0.085, 0.085, 0.015, 10).rotateZ(Math.PI / 2).rotateZ(0.2).translate(0.06, 0.1, 0), color: PAL.bronze },
    { geo: cyl(0.072, 0.072, 0.016, 10).rotateZ(Math.PI / 2).rotateZ(0.2).translate(0.062, 0.1, 0), color: CITY_COLOUR },
    { geo: cyl(0.02, 0.02, 0.018, 6).rotateZ(Math.PI / 2).rotateZ(0.2).translate(0.064, 0.1, 0), color: CITY_TRIM },
    // The spear leaning beside.
    { geo: cyl(0.005, 0.005, 0.55, 3).rotateX(0.18).translate(0, 0.27, 0.06), color: PAL.wood },
    { geo: new THREE.ConeGeometry(0.011, 0.05, 4).rotateX(0.18).translate(0, 0.56, 0.11), color: PAL.rockGrey },
  ]);
}

// ---------------------------------------------------------------------------
// The barracks (4×4: -2..2).

/**
 * The barracks: a low wall round the drill ground (sanded, drawn with the
 * streets), a gateway on the road side, a colonnade along the back where the
 * men shelter and their armour hangs, racks of spears along the side walls, a
 * water trough, and a tall banner pole by the gate flying the city's colour.
 * The companies themselves drill on the open ground.
 */
export function barracksModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  const H = 2;
  // The wall: rubble stone with a coping, its foot run down into the slope; the gateway on the front (+x) side.
  const wall = (x0: number, z0: number, x1: number, z1: number): void => {
    parts.push({ geo: slab(x0, z0, x1, z1, -0.6, 0.3), color: PAL.stone });
    parts.push({ geo: slab(x0 - 0.015, z0 - 0.015, x1 + 0.015, z1 + 0.015, 0.3, 0.34), color: PAL.pressStone });
  };
  wall(-H + 0.02, -H + 0.02, H - 0.02, -H + 0.12);
  wall(-H + 0.02, H - 0.12, H - 0.02, H - 0.02);
  wall(H - 0.12, -H + 0.12, H - 0.02, -0.55);
  wall(H - 0.12, 0.55, H - 0.02, H - 0.12);
  for (const z of [-0.55, 0.55]) {
    parts.push({ geo: slab(H - 0.16, z - 0.09, H + 0.02, z + 0.09, -0.6, 0.62), color: PAL.pressStone });
    parts.push({ geo: slab(H - 0.18, z - 0.11, H + 0.04, z + 0.11, 0.62, 0.68), color: PAL.pressStoneDark });
  }
  // The colonnade along the back: a back wall, a stylobate, columns, a tiled roof sloping to the ground.
  const cx0 = -H + 0.02;
  const cx1 = -1.6;
  parts.push({ geo: slab(cx0, -H + 0.02, cx0 + 0.1, H - 0.02, -0.6, 0.92), color: PAL.whitewashShade });
  parts.push({ geo: slab(cx0, -H + 0.12, cx1 + 0.04, H - 0.12, -0.6, 0.06), color: PAL.paving });
  for (let i = 0; i < 9; i++) {
    const z = -H + 0.3 + (i * (2 * H - 0.6)) / 8;
    parts.push({ geo: cyl(0.035, 0.042, 0.72, 7).translate(cx1, 0.42, z), color: PAL.column });
    parts.push({ geo: slab(cx1 - 0.05, z - 0.05, cx1 + 0.05, z + 0.05, 0.78, 0.81), color: PAL.marbleShade });
  }
  parts.push({ geo: slab(cx1 - 0.06, -H + 0.12, cx1 + 0.06, H - 0.12, 0.81, 0.88), color: PAL.whitewash });
  parts.push({ geo: new THREE.BoxGeometry(0.62, 0.05, 2 * H - 0.12).rotateZ(-0.24).translate((cx0 + cx1) / 2 + 0.04, 0.97, 0), color: PAL.roofTile });
  for (let k = 0; k < 12; k++) parts.push({ geo: new THREE.BoxGeometry(0.62, 0.02, 0.035).rotateZ(-0.24).translate((cx0 + cx1) / 2 + 0.04, 1.0, -H + 0.2 + (k * (2 * H - 0.4)) / 11), color: PAL.roofTileDark });
  // Racks of spears along the side walls, inside.
  for (const side of [-1, 1]) {
    const z = side * (H - 0.2);
    for (const x0 of [-1.1, 0.35]) {
      const x1 = x0 + 0.85;
      for (const x of [x0, x1]) parts.push({ geo: cyl(0.014, 0.016, 0.4, 4).translate(x, 0.2, z), color: PAL.woodDark });
      parts.push({ geo: slab(x0, z - 0.012, x1, z + 0.012, 0.3, 0.33), color: PAL.wood });
      for (let i = 0; i < 9; i++) {
        const x = x0 + 0.06 + i * ((x1 - x0 - 0.12) / 8);
        parts.push({ geo: cyl(0.005, 0.005, 0.66, 3).rotateX(side * 0.12).translate(x, 0.34, z + side * 0.03), color: PAL.wood });
        parts.push({ geo: new THREE.ConeGeometry(0.01, 0.045, 4).rotateX(side * 0.12).translate(x, 0.69, z - side * 0.012), color: PAL.rockGrey });
      }
    }
  }
  // A stone water trough by the colonnade's end.
  parts.push({ geo: slab(-1.5, H - 0.5, -1.15, H - 0.24, 0.0, 0.16), color: PAL.vatStone });
  parts.push({ geo: slab(-1.48, H - 0.48, -1.17, H - 0.26, 0.16, 0.161), color: PAL.shallow });
  // The banner pole by the gate, flying the city's colour (the companies carry their own).
  const px = H - 0.3;
  const pz = -0.85;
  parts.push({ geo: cyl(0.06, 0.08, 0.1, 6).translate(px, 0.05, pz), color: PAL.pressStone });
  parts.push({ geo: cyl(0.02, 0.028, 2.1, 5).translate(px, 1.05, pz), color: PAL.pole });
  parts.push({ geo: cyl(0.008, 0.008, 0.62, 3).rotateX(Math.PI / 2).translate(px, 2.02, pz - 0.31), color: PAL.woodDark });
  parts.push({ geo: slab(px - 0.006, pz - 0.6, px + 0.006, pz - 0.04, 1.6, 2.0), color: CITY_COLOUR });
  parts.push({ geo: slab(px - 0.007, pz - 0.6, px + 0.007, pz - 0.04, 1.55, 1.6), color: CITY_TRIM });
  return merge(parts);
}

// ---------------------------------------------------------------------------
// The soldiers' looks, for the folk's merged meshes (about 0.45 tall, facing +x; the tunic takes the instance's colour).

/** A hoplite: bronze helmet and crest, breastplate, a round shield in the city's colour held before him, a spear upright. `armed` false: a man walking in, with his bedroll and no armour yet. */
export function hopliteLook(armed: boolean, shield: string = CITY_COLOUR, boss: string = CITY_TRIM): THREE.BufferGeometry {
  const parts: TPart[] = [
    leg(0, -0.03, 0.12, 0.02, PAL.skin, -1),
    leg(0, 0.03, 0.12, 0.02, PAL.skin, 1),
    { geo: new THREE.CylinderGeometry(0.056, 0.086, 0.2, 6).translate(0, 0.2, 0), color: '', tint: true },
    { geo: new THREE.IcosahedronGeometry(0.052, 0).translate(0.005, 0.36, 0), color: PAL.skin },
  ];
  if (!armed) {
    parts.push({ geo: new THREE.IcosahedronGeometry(0.054, 0).scale(1, 0.6, 1).translate(-0.006, 0.385, 0), color: PAL.hair });
    parts.push({ geo: new THREE.CylinderGeometry(0.035, 0.035, 0.14, 6).rotateX(Math.PI / 2).translate(-0.07, 0.29, 0), color: PAL.bundleCream });
    parts.push({ geo: new THREE.CylinderGeometry(0.014, 0.013, 0.14, 4).translate(0.0, 0.22, 0.075), color: PAL.skin });
    parts.push({ geo: new THREE.CylinderGeometry(0.014, 0.013, 0.14, 4).translate(0.0, 0.22, -0.075), color: PAL.skin });
    return mergeTinted(parts);
  }
  // The breastplate over the tunic, the helmet and its crest from front to back.
  parts.push({ geo: new THREE.CylinderGeometry(0.06, 0.072, 0.12, 7).translate(0, 0.255, 0), color: PAL.bronze });
  parts.push({ geo: new THREE.IcosahedronGeometry(0.064, 0).scale(1, 0.9, 1).translate(0.0, 0.38, 0), color: PAL.bronze });
  parts.push({ geo: new THREE.BoxGeometry(0.15, 0.06, 0.018).translate(-0.01, 0.45, 0), color: PAL.crest });
  // The shield before his left side, face to the front; its boss in the city's trim.
  parts.push({ geo: new THREE.CylinderGeometry(0.105, 0.105, 0.016, 12).rotateZ(Math.PI / 2).translate(0.075, 0.24, -0.035), color: PAL.bronze });
  parts.push({ geo: new THREE.CylinderGeometry(0.09, 0.09, 0.018, 12).rotateZ(Math.PI / 2).translate(0.078, 0.24, -0.035), color: shield });
  parts.push({ geo: new THREE.CylinderGeometry(0.03, 0.03, 0.02, 6).rotateZ(Math.PI / 2).translate(0.08, 0.24, -0.035), color: boss });
  // The spear upright in his right hand.
  parts.push({ geo: new THREE.CylinderGeometry(0.014, 0.013, 0.13, 4).rotateX(-0.3).translate(0.03, 0.24, 0.07), color: PAL.skin });
  parts.push({ geo: new THREE.CylinderGeometry(0.006, 0.006, 0.74, 3).translate(0.05, 0.36, 0.085), color: PAL.wood });
  parts.push({ geo: new THREE.ConeGeometry(0.014, 0.06, 4).translate(0.05, 0.76, 0.085), color: PAL.rockGrey });
  return mergeTinted(parts);
}

/** An archer: a leather cap, a quiver on his back and his bow in his left hand. */
export function archerLook(): THREE.BufferGeometry {
  const parts: TPart[] = [
    leg(0, -0.03, 0.12, 0.02, PAL.skin, -1),
    leg(0, 0.03, 0.12, 0.02, PAL.skin, 1),
    { geo: new THREE.CylinderGeometry(0.054, 0.084, 0.2, 6).translate(0, 0.2, 0), color: '', tint: true },
    { geo: new THREE.CylinderGeometry(0.06, 0.06, 0.02, 6).translate(0, 0.17, 0), color: PAL.leather },
    { geo: new THREE.IcosahedronGeometry(0.052, 0).translate(0.005, 0.36, 0), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.03, 0.058, 0.06, 7).translate(-0.004, 0.405, 0), color: PAL.leather },
    // The quiver across his back, arrows showing.
    { geo: new THREE.CylinderGeometry(0.022, 0.02, 0.18, 5).rotateX(0.45).translate(-0.07, 0.28, 0.0), color: PAL.leather },
    { geo: new THREE.ConeGeometry(0.024, 0.05, 5).rotateX(0.45).translate(-0.07, 0.39, -0.05), color: PAL.sailCream },
    // The bow upright in his left hand, the arm out to it.
    { geo: new THREE.CylinderGeometry(0.014, 0.013, 0.12, 4).rotateX(0.6).translate(0.03, 0.25, -0.06), color: PAL.skin },
    { geo: new THREE.TorusGeometry(0.17, 0.007, 3, 10, Math.PI * 0.8).rotateZ(-Math.PI * 0.4).translate(-0.05, 0.27, -0.1), color: PAL.woodDark },
    { geo: new THREE.CylinderGeometry(0.002, 0.002, 0.32, 3).translate(0.0, 0.27, -0.1), color: PAL.sailCream },
  ];
  return mergeTinted(parts);
}

/** The tunics: hoplites in the city's deep red, archers in ochre, each company a shade of its own. */
export const HOPLITE_TUNIC = '#9a3a2c';
export const ARCHER_TUNIC = '#b58a3e';
/** Hirelings in their own colours (slice 24): Cretan archers in green, Arcadian hoplites in blue with a blue shield and a white boss. */
export const CRETAN_TUNIC = '#4f7a3a';
export const ARCADIAN_TUNIC = '#38558a';
export const ARCADIAN_SHIELD = '#2e4a7e';
export const ARCADIAN_BOSS = '#e8e2d0';
