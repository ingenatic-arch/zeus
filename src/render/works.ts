import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { hash2 } from '../map/noise';
import { BARN, DAIRY_STORE, GOOD_STALL_ROOM, GRANARY_CAP, GRANARY_ROOM, GROW, LODGE_STORE, STALL_CAP, STALL_ROOM, stallRoom } from '../sim/food';
import { CHEESE, FLEECE, GRAPES, held, MEAT, OIL, OLIVES, WHEAT, WINE } from '../sim/foods';
import { berthOf, QUAY_ROOM } from '../sim/trade';
import { hasStall } from '../sim/goods';
import { MAKERS, stageOf } from '../sim/production';
import { GROVE_STORE, PASTURE_STORE, PRESS_OLIVES, PRESS_STORE, STOREHOUSE_FLEECE, STOREHOUSE_OIL, STOREHOUSE_WINE, VINEYARD_STORE, WINERY_GRAPES, WINERY_STORE } from '../sim/stores';
import { rateOf } from '../sim/labour';
import type { Building, SimState } from '../sim/state';
import { ChunkedInstances } from './chunks';
import { theatreModel } from './grand';
import { amphora, cyl, facingOf, HOME_CHUNK, MergedChunks, prism, stoneWall, windowX, woodpile, type MergedItem } from './homes';
import { PAL } from './palette';
import { lumpy, merge, type Part } from './trees';

// ---------------------------------------------------------------------------
// Models. Local frame: the footprint's centre at the origin, spanning
// -1.5..1.5, the front (towards the road) facing +x.

/** A box from (x0, z0) to (x1, z1), standing from y0 to y1. */
const slab = (x0: number, z0: number, x1: number, z1: number, y0: number, y1: number): THREE.BufferGeometry =>
  new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);

/** A row of fence stakes from (x0, z0) to (x1, z1), with a rail. */
function fence(x0: number, z0: number, x1: number, z1: number, seed: number): Part[] {
  const parts: Part[] = [];
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(2, Math.round(len / 0.3));
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    parts.push({ geo: cyl(0.016, 0.02, 0.24 + 0.04 * hash2(i, seed, 85), 4).translate(x0 + (x1 - x0) * f, 0.12, z0 + (z1 - z0) * f), color: PAL.woodDark });
  }
  const rail = cyl(0.012, 0.012, len, 4).rotateZ(Math.PI / 2).rotateY(-Math.atan2(z1 - z0, x1 - x0));
  parts.push({ geo: rail.translate((x0 + x1) / 2, 0.17, (z0 + z1) / 2), color: PAL.wood });
  return parts;
}

/**
 * The farm's buildings: a small thatched farmhouse by the road with an open
 * barn on posts beside it, a round threshing floor, a haystack, a plough, and
 * a fence of stakes round the field (the wheat itself is drawn separately, as
 * it grows).
 */
function farmModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  // The farmhouse: mud walls under thatch, door to the road.
  const hx = 0.98;
  const hz = -0.92;
  parts.push({ geo: slab(hx - 0.42, hz - 0.5, hx + 0.42, hz + 0.5, 0, 0.08), color: PAL.plinth });
  parts.push({ geo: slab(hx - 0.36, hz - 0.44, hx + 0.36, hz + 0.44, 0.08, 0.56), color: PAL.mudWall });
  parts.push({ geo: lumpy(prism(1.04, 0.48, 0.42).rotateY(Math.PI / 2), 0.04, 171).translate(hx, 0.56, hz), color: PAL.thatch });
  parts.push({ geo: cyl(0.035, 0.04, 1.04, 5).rotateX(Math.PI / 2).translate(hx, 0.98, hz), color: PAL.thatchDark });
  parts.push({ geo: slab(hx + 0.36, hz - 0.1, hx + 0.38, hz + 0.1, 0.08, 0.42), color: PAL.door });
  parts.push(...windowX(hx + 0.365, 0.4, hz - 0.3), ...windowX(hx + 0.365, 0.4, hz + 0.3));
  // The open barn behind it: four posts, a thatched lean-to roof, sheaves stacked inside.
  const bx = 0.95;
  const bz = 0.12;
  for (const [x, z] of [[bx - 0.36, bz - 0.34], [bx + 0.36, bz - 0.34], [bx - 0.36, bz + 0.34], [bx + 0.36, bz + 0.34]]) {
    parts.push({ geo: cyl(0.025, 0.028, 0.5, 5).translate(x, 0.25, z), color: PAL.wood });
  }
  parts.push({ geo: lumpy(slab(bx - 0.46, bz - 0.44, bx + 0.46, bz + 0.44, 0, 0.06), 0.03, 172).rotateZ(0.12).translate(0, 0.52, 0), color: PAL.thatch });
  parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.2, 0), 0.2, 173).scale(1.4, 0.8, 1.3).translate(bx - 0.12, 0.14, bz), color: PAL.hay });
  // The threshing floor: a round of flat stones with a low kerb.
  parts.push({ geo: cyl(0.4, 0.42, 0.04, 12).translate(0.98, 0.02, 0.98), color: PAL.paving });
  parts.push({ geo: cyl(0.43, 0.43, 0.025, 12).translate(0.98, 0.04, 0.98), color: PAL.pavingDark });
  parts.push({ geo: cyl(0.36, 0.36, 0.045, 12).translate(0.98, 0.03, 0.98), color: PAL.paving });
  // A haystack at the back corner of the yard, a plough leaning by the house.
  parts.push({ geo: lumpy(new THREE.SphereGeometry(0.28, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), 0.08, 174).scale(1, 1.35, 1).translate(0.5, 0, -1.35), color: PAL.hay });
  parts.push({ geo: cyl(0.02, 0.02, 0.55, 4).rotateZ(1.0).translate(0.45, 0.2, -0.45), color: PAL.wood });
  parts.push({ geo: slab(0.2, -0.47, 0.32, -0.43, 0, 0.1), color: PAL.woodDark });
  parts.push(amphora(1.42, -0.36, 0.22));
  // The fence round the field (the field lies behind, -x of the yard).
  parts.push(...fence(-1.44, -1.44, -1.44, 1.44, 175));
  parts.push(...fence(-1.44, -1.44, 0.42, -1.44, 176));
  parts.push(...fence(-1.44, 1.44, 0.42, 1.44, 177));
  return merge(parts);
}

/**
 * A row of wheat along x, a unit long and a unit tall (scaled to the crop):
 * a ridge of stalks with a fringe of thin ears standing above it, so a
 * field of rows reads as a dense crop with a ruffled top.
 */
function wheatRow(): THREE.BufferGeometry {
  const parts: Part[] = [];
  // The mass of stalks: a ridge, flat-topped, a little lumpy.
  const ridge = new THREE.BoxGeometry(1, 0.62, 0.2, 6, 1, 1);
  parts.push({ geo: lumpy(ridge, 0.04, 181).translate(0, 0.3, 0), color: '#e6e6e6' });
  // The ears: thin blades in three staggered lines, leaning a little this way and that.
  const n = 13;
  for (let line = 0; line < 3; line++) {
    for (let i = 0; i < n; i++) {
      const x = -0.5 + (i + 0.3 + line * 0.33) / n;
      const z = (line - 1) * 0.085 + (hash2(i, line, 182) - 0.5) * 0.04;
      const h = 0.36 + 0.14 * hash2(i, line, 183);
      const blade = new THREE.ConeGeometry(0.03, h, 3, 1, true)
        .rotateY(hash2(i, line, 184) * 2)
        .rotateZ((hash2(i, line, 185) - 0.5) * 0.4)
        .rotateX((hash2(i, line, 186) - 0.5) * 0.4)
        .translate(x, 0.55 + h / 2, z);
      parts.push({ geo: blade, color: line === 1 ? '#ffffff' : '#f2f2f2' });
    }
  }
  return merge(parts);
}

/** A stook: sheaves of cut wheat leaning together. */
function stook(): THREE.BufferGeometry {
  return merge([
    { geo: lumpy(new THREE.ConeGeometry(0.11, 0.3, 6, 1), 0.08, 191).translate(0, 0.15, 0), color: PAL.sheaf },
    { geo: cyl(0.06, 0.07, 0.03, 6).translate(0, 0.17, 0), color: PAL.thatchDark },
  ]);
}

/**
 * The granary: a long stone storehouse on a plinth under a tiled roof, with
 * a wide door and high slit vents, and two domed silos beside a yard where
 * the sacks are stacked.
 */
function granaryModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  const x0 = -1.42;
  const x1 = -0.38;
  const z0 = -1.32;
  const z1 = 1.32;
  parts.push({ geo: slab(x0 - 0.04, z0 - 0.04, x1 + 0.04, z1 + 0.04, -0.3, 0.16), color: PAL.plinth });
  parts.push({ geo: slab(x0, z0, x1, z1, 0.16, 0.86), color: PAL.granaryStone });
  // A band of darker stone at the foot of the walls.
  parts.push({ geo: slab(x0 - 0.01, z0 - 0.01, x1 + 0.01, z1 + 0.01, 0.16, 0.26), color: PAL.granaryShade });
  const cx = (x0 + x1) / 2;
  parts.push({ geo: prism(z1 - z0 + 0.2, (x1 - x0) / 2 + 0.12, 0.42).rotateY(Math.PI / 2).translate(cx, 0.86, 0), color: PAL.roofTile });
  parts.push({ geo: cyl(0.035, 0.035, z1 - z0 + 0.22, 5).rotateX(Math.PI / 2).translate(cx, 1.28, 0), color: PAL.roofTileDark });
  for (const side of [-1, 1]) {
    for (const k of [0.33, 0.66]) {
      const y = 0.86 + 0.42 * (1 - k);
      const x = cx + side * ((x1 - x0) / 2 + 0.12) * k;
      parts.push({ geo: new THREE.BoxGeometry(0.03, 0.02, z1 - z0 + 0.2).rotateZ(side * 0.68).translate(x, y + 0.012, 0), color: PAL.roofTileDark });
    }
  }
  // Gable ends.
  const gable = new THREE.BufferGeometry();
  const gx = (x1 - x0) / 2;
  gable.setAttribute('position', new THREE.Float32BufferAttribute([-gx, 0, 0, gx, 0, 0, 0, 0.4, 0, gx, 0, 0, -gx, 0, 0, 0, 0.4, 0], 3));
  parts.push({ geo: gable.clone().translate(cx, 0.86, z1 + 0.001), color: PAL.granaryShade });
  parts.push({ geo: gable.translate(cx, 0.86, z0 - 0.001), color: PAL.granaryShade });
  // The wide door, with a ramp, and the vents.
  parts.push({ geo: slab(x1, -0.24, x1 + 0.02, 0.24, 0.16, 0.64), color: PAL.door });
  parts.push({ geo: slab(x1 - 0.02, -0.3, x1 + 0.04, 0.3, 0.64, 0.7), color: PAL.wood });
  parts.push({ geo: slab(x1, -0.3, x1 + 0.3, 0.3, -0.3, 0.12).rotateZ(0), color: PAL.plinth });
  for (const z of [-0.95, -0.6, 0.6, 0.95]) parts.push({ geo: slab(x1, z - 0.03, x1 + 0.015, z + 0.03, 0.5, 0.74), color: PAL.door });
  // Slit vents and buttresses along the back.
  for (const z of [-0.9, -0.3, 0.3, 0.9]) parts.push({ geo: slab(x0 - 0.015, z - 0.03, x0, z + 0.03, 0.5, 0.74), color: PAL.door });
  for (const z of [-1.2, -0.6, 0, 0.6, 1.2]) parts.push({ geo: slab(x0 - 0.1, z - 0.06, x0, z + 0.06, 0.16, 0.6).translate(0, 0, 0), color: PAL.granaryShade });
  // Two beehive silos at the yard's sides.
  for (const [sx, sz] of [[0.28, -1.0], [0.28, 1.0]]) {
    parts.push({ geo: cyl(0.4, 0.42, 0.12, 10).translate(sx, 0.06, sz), color: PAL.plinth });
    parts.push({ geo: cyl(0.36, 0.38, 0.5, 10).translate(sx, 0.37, sz), color: PAL.silo });
    parts.push({ geo: new THREE.SphereGeometry(0.36, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.9, 1).translate(sx, 0.62, sz), color: PAL.silo });
    parts.push({ geo: cyl(0.06, 0.08, 0.08, 6).translate(sx, 0.97, sz), color: PAL.granaryShade });
    parts.push({ geo: slab(sx + 0.35, sz - 0.08, sx + 0.38, sz + 0.08, 0.4, 0.58), color: PAL.door });
    // Bands of the silo's courses.
    parts.push({ geo: cyl(0.385, 0.385, 0.03, 10).translate(sx, 0.4, sz), color: PAL.granaryShade });
  }
  // The yard: a low wall at the front corners, a jar, a pallet for the sacks.
  parts.push(...stoneWall(0.8, -1.42, 1.42, -1.42, 195));
  parts.push(...stoneWall(0.8, 1.42, 1.42, 1.42, 196));
  parts.push(amphora(1.3, -1.05, 0.24));
  return merge(parts);
}

/** A sack of grain. */
function sack(): THREE.BufferGeometry {
  return merge([
    { geo: lumpy(new THREE.IcosahedronGeometry(0.11, 0), 0.15, 197).scale(1.15, 0.8, 0.85).translate(0, 0.085, 0), color: PAL.sack },
    { geo: cyl(0.03, 0.045, 0.05, 5).translate(0.11, 0.1, 0).rotateZ(0), color: PAL.sackDark },
  ]);
}

/**
 * The agora: a stoa along the back (a stepped floor, a row of columns, a
 * lean-to tile roof against a back wall), the food stall in the square with
 * its striped awning and a counter of bread baskets, a herm at the corner, a
 * bench and jars.
 */
function agoraModel(): { stone: THREE.BufferGeometry; awning: THREE.BufferGeometry } {
  const parts: Part[] = [];
  // The stoa.
  const sx0 = -1.46;
  const sx1 = -0.62;
  parts.push({ geo: slab(sx0, -1.46, sx1, 1.46, -0.3, 0.1), color: PAL.agoraPaveDark });
  parts.push({ geo: slab(sx0 + 0.04, -1.42, sx1 - 0.04, 1.42, 0.1, 0.16), color: PAL.agoraPave });
  parts.push({ geo: slab(sx0, -1.46, sx0 + 0.14, 1.46, 0.16, 1.08), color: PAL.whitewash });
  for (let i = 0; i < 6; i++) {
    const z = -1.3 + (i * 2.6) / 5;
    parts.push({ geo: cyl(0.06, 0.07, 0.68, 8).translate(sx1 - 0.12, 0.16 + 0.34, z), color: PAL.column });
    parts.push({ geo: slab(sx1 - 0.2, z - 0.08, sx1 - 0.04, z + 0.08, 0.83, 0.87), color: PAL.column });
  }
  parts.push({ geo: slab(sx1 - 0.22, -1.46, sx1 - 0.02, 1.46, 0.87, 0.97), color: PAL.agoraPave });
  // The lean-to roof, from the back wall down to the colonnade: tiles with courses running down the slope, a dark eave beneath.
  const pitch = -0.2;
  const roofPart = (geo: THREE.BufferGeometry, color: string): void => {
    parts.push({ geo: geo.rotateZ(pitch).translate((sx0 + sx1) / 2, 1.05, 0), color });
  };
  const rw = sx1 - sx0 + 0.22;
  roofPart(new THREE.BoxGeometry(rw, 0.08, 3.08), PAL.roofTile);
  roofPart(new THREE.BoxGeometry(rw + 0.01, 0.03, 3.1).translate(0, -0.05, 0), PAL.roofTileDark);
  for (let k = 0; k < 12; k++) {
    const z = -1.44 + (k * 2.88) / 11;
    roofPart(new THREE.BoxGeometry(rw, 0.03, 0.04).translate(0, 0.05, z), PAL.roofTileDark);
  }
  // A frieze along the back wall's outside, so it isn't a blank face from the street.
  parts.push({ geo: slab(sx0 - 0.015, -1.46, sx0, 1.46, 0.84, 0.92), color: PAL.roofTileDark });
  parts.push({ geo: slab(sx0 - 0.012, -1.46, sx0, 1.46, 0.16, 0.24), color: PAL.agoraPaveDark });
  // A bench under the colonnade and jars.
  parts.push({ geo: slab(sx0 + 0.2, -0.9, sx0 + 0.34, 0.2, 0.16, 0.26), color: PAL.agoraPaveDark });
  parts.push(amphora(sx0 + 0.3, 0.75, 0.22), amphora(sx0 + 0.32, 0.95, 0.18));
  // The food stall: a timber counter, poles, baskets on the counter (the loaves are drawn with the stock).
  const cx = 0.42;
  parts.push({ geo: slab(cx - 0.18, -0.55, cx + 0.18, 0.55, 0, 0.3), color: PAL.wood });
  parts.push({ geo: slab(cx - 0.2, -0.57, cx + 0.2, 0.57, 0.3, 0.33), color: PAL.woodDark });
  for (const [x, z] of [[cx - 0.32, -0.62], [cx + 0.32, -0.62], [cx - 0.32, 0.62], [cx + 0.32, 0.62]]) parts.push({ geo: cyl(0.018, 0.018, 0.78, 4).translate(x, 0.39, z), color: PAL.pole });
  for (const z of [-0.36, 0, 0.36]) parts.push({ geo: cyl(0.12, 0.09, 0.07, 7).translate(cx, 0.365, z), color: PAL.basket });
  // Baskets and a sack on the ground beside the stall.
  parts.push({ geo: cyl(0.13, 0.1, 0.12, 7).translate(cx + 0.38, 0.06, -0.3), color: PAL.basket });
  parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.11, 0), 0.15, 199).scale(1, 0.85, 0.9).translate(cx - 0.4, 0.09, 0.3), color: PAL.sack });
  // The herm at the front corner: a square pillar with a head.
  parts.push({ geo: slab(1.12, 1.1, 1.3, 1.28, 0, 0.06), color: PAL.agoraPaveDark });
  parts.push({ geo: slab(1.15, 1.13, 1.27, 1.25, 0.06, 0.6), color: PAL.column });
  parts.push({ geo: new THREE.IcosahedronGeometry(0.075, 0).translate(1.21, 0.67, 1.19), color: PAL.column });
  // A low kerb round the square's open sides.
  parts.push({ geo: slab(1.42, -1.46, 1.48, 1.0, 0, 0.05), color: PAL.agoraPaveDark });
  parts.push({ geo: slab(-0.62, -1.48, 1.48, -1.42, 0, 0.05), color: PAL.agoraPaveDark });
  parts.push({ geo: slab(-0.62, 1.42, 1.0, 1.48, 0, 0.05), color: PAL.agoraPaveDark });
  // The awning: a striped cloth on the poles, sloping down to the front.
  const aw: Part[] = [];
  for (let k = 0; k < 6; k++) {
    const z0 = -0.7 + (k * 1.4) / 6;
    aw.push({ geo: slab(cx - 0.4, z0, cx + 0.4, z0 + 1.4 / 6, 0, 0.025).rotateZ(-0.2).translate(0, 0.8, 0), color: k % 2 ? PAL.awningLight : PAL.awning });
  }
  // A scalloped valance along the front edge.
  for (let k = 0; k < 6; k++) {
    const z = -0.7 + ((k + 0.5) * 1.4) / 6;
    aw.push({ geo: new THREE.ConeGeometry(0.11, 0.1, 3).rotateX(Math.PI).translate(cx + 0.39, 0.67, z), color: k % 2 ? PAL.awningLight : PAL.awning });
  }
  return { stone: merge(parts), awning: merge(aw) };
}

/** A round loaf. */
function loaf(): THREE.BufferGeometry {
  return merge([
    { geo: new THREE.IcosahedronGeometry(0.05, 0).scale(1, 0.6, 1).translate(0, 0.025, 0), color: PAL.loaf },
    { geo: new THREE.BoxGeometry(0.06, 0.012, 0.012).translate(0, 0.05, 0), color: PAL.loafLight },
  ]);
}

/** A ham or a haunch: a fat teardrop, the knuckle of bone at its narrow end, along +y (it hangs). */
function ham(): THREE.BufferGeometry {
  const profile = [
    new THREE.Vector2(0, -0.09),
    new THREE.Vector2(0.045, -0.075),
    new THREE.Vector2(0.06, -0.035),
    new THREE.Vector2(0.052, 0.01),
    new THREE.Vector2(0.03, 0.045),
    new THREE.Vector2(0.014, 0.06),
    new THREE.Vector2(0, 0.062),
  ];
  return merge([
    { geo: new THREE.LatheGeometry(profile, 6).scale(1, 1, 0.8), color: PAL.meat },
    { geo: new THREE.SphereGeometry(0.05, 6, 3, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45).scale(1.05, 0.9, 0.85).translate(0, -0.035, 0), color: PAL.meatDark },
    { geo: cyl(0.012, 0.014, 0.05, 5).translate(0, 0.08, 0), color: PAL.bone },
    { geo: new THREE.IcosahedronGeometry(0.017, 0).translate(0, 0.105, 0), color: PAL.bone },
  ]);
}

/** A wheel of cheese, flat on its side: a pale wheel with a darker rind round its rim. */
function cheeseWheel(): THREE.BufferGeometry {
  return merge([
    { geo: cyl(0.075, 0.075, 0.055, 9).translate(0, 0.0275, 0), color: PAL.cheeseRind },
    { geo: cyl(0.068, 0.068, 0.058, 9).translate(0, 0.029, 0), color: PAL.cheese },
  ]);
}

/** Horizontal logs stacked into a wall from (x0, z0) to (x1, z1), `h` tall, notched past the ends. */
function logWall(x0: number, z0: number, x1: number, z1: number, h: number, seed: number): Part[] {
  const parts: Part[] = [];
  const len = Math.hypot(x1 - x0, z1 - z0) + 0.1;
  const yaw = -Math.atan2(z1 - z0, x1 - x0);
  const r = 0.045;
  const n = Math.round(h / (r * 1.8));
  for (let i = 0; i < n; i++) {
    const g = cyl(r, r, len, 6).rotateZ(Math.PI / 2).rotateY(yaw).translate((x0 + x1) / 2, r + i * r * 1.8, (z0 + z1) / 2);
    parts.push({ geo: g, color: (i + seed) % 3 === 0 ? PAL.logDark : PAL.log });
  }
  return parts;
}

/**
 * The hunting lodge: a log cabin under a steep bark roof at the back, a
 * stag's antlers over its door; before it a drying rack where the meat hangs
 * (drawn with the store), a hide stretched on a frame, spears leaning by
 * the door, a fire pit with a spit, and a woodpile.
 */
function lodgeModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  // The cabin: x -1.35..-0.15, z -1.3..0.35, door to the front (+x).
  const x0 = -1.35;
  const x1 = -0.15;
  const z0 = -1.3;
  const z1 = 0.35;
  const wall = 0.62;
  parts.push({ geo: slab(x0 - 0.05, z0 - 0.05, x1 + 0.05, z1 + 0.05, -0.45, 0.04), color: PAL.plinth });
  parts.push(...logWall(x0, z0, x0, z1, wall, 1), ...logWall(x1, z0, x1, z1, wall, 2));
  parts.push(...logWall(x0, z0, x1, z0, wall, 3), ...logWall(x0, z1, x1, z1, wall, 4));
  parts.push({ geo: slab(x0 + 0.04, z0 + 0.04, x1 - 0.04, z1 - 0.04, 0.04, wall), color: PAL.logDark });
  // A steep roof of bark shingles, its ridge along z, overhanging the front for a porch.
  const cx = (x0 + x1) / 2;
  const span = z1 - z0 + 0.3;
  const rise = 0.5;
  parts.push({ geo: lumpy(prism(span, (x1 - x0) / 2 + 0.16, rise).rotateY(Math.PI / 2), 0.02, 401).translate(cx, wall, (z0 + z1) / 2), color: PAL.bark });
  // Courses of shingles down each slope.
  for (const side of [-1, 1]) {
    for (const k of [0.3, 0.62]) {
      const y = wall + rise * (1 - k);
      const x = cx + side * ((x1 - x0) / 2 + 0.16) * k;
      parts.push({ geo: new THREE.BoxGeometry(0.03, 0.02, span).rotateZ(-side * Math.atan2(rise, (x1 - x0) / 2 + 0.16)).translate(x, y + 0.012, (z0 + z1) / 2), color: PAL.barkDark });
    }
  }
  parts.push({ geo: cyl(0.035, 0.035, span + 0.04, 5).rotateX(Math.PI / 2).translate(cx, wall + rise, (z0 + z1) / 2), color: PAL.logDark });
  // Crossed gable poles at the ridge's ends.
  for (const z of [z0 - 0.15, z1 + 0.15]) {
    parts.push({ geo: cyl(0.015, 0.015, 0.26, 4).rotateZ(0.6).translate(cx + 0.05, wall + rise + 0.08, z), color: PAL.logDark });
    parts.push({ geo: cyl(0.015, 0.015, 0.26, 4).rotateZ(-0.6).translate(cx - 0.05, wall + rise + 0.08, z), color: PAL.logDark });
  }
  // The door and, over it, a stag's skull and antlers.
  const dz = (z0 + z1) / 2;
  parts.push({ geo: slab(x1 + 0.03, dz - 0.14, x1 + 0.05, dz + 0.14, 0.04, 0.48), color: PAL.door });
  parts.push({ geo: new THREE.IcosahedronGeometry(0.045, 0).scale(0.8, 1, 0.9).translate(x1 + 0.07, 0.58, dz), color: PAL.bone });
  for (const side of [-1, 1]) {
    parts.push({ geo: cyl(0.01, 0.014, 0.2, 4).rotateX(side * 0.9).translate(x1 + 0.07, 0.66, dz + side * 0.08), color: PAL.antler });
    parts.push({ geo: cyl(0.008, 0.01, 0.1, 4).rotateX(side * 0.2).translate(x1 + 0.07, 0.72, dz + side * 0.13), color: PAL.antler });
    parts.push({ geo: cyl(0.008, 0.01, 0.09, 4).rotateX(side * 1.4).translate(x1 + 0.07, 0.69, dz + side * 0.17), color: PAL.antler });
  }
  // Spears leaning by the door, and a bow on a peg.
  for (const [z, lean] of [[dz + 0.24, 0.14], [dz + 0.3, 0.2], [dz - 0.26, -0.16]] as Array<[number, number]>) {
    parts.push({ geo: cyl(0.008, 0.008, 0.62, 3).rotateX(lean).rotateZ(-0.12).translate(x1 + 0.1, 0.3, z), color: PAL.wood });
    parts.push({ geo: new THREE.ConeGeometry(0.016, 0.06, 3).rotateX(lean).rotateZ(-0.12).translate(x1 + 0.13, 0.62, z + lean * 0.3), color: PAL.rockGrey });
  }
  // A woodpile against the cabin's side, a chopping block.
  parts.push(...woodpile(-0.75, 0.55));
  parts.push({ geo: cyl(0.08, 0.09, 0.1, 7).translate(-0.02, 0.05, 0.55), color: PAL.log });
  return merge(parts);
}

/** The lodge's drying rack, centred: two A-frames and a pole across, 0.58 up (the meat hangs from it). */
function dryingRack(): THREE.BufferGeometry {
  const parts: Part[] = [];
  for (const z of [-0.72, 0.72]) {
    parts.push({ geo: cyl(0.018, 0.02, 0.8, 4).rotateX(0.22).translate(0, 0.21, z - 0.06), color: PAL.wood });
    parts.push({ geo: cyl(0.018, 0.02, 0.8, 4).rotateX(-0.22).translate(0, 0.21, z + 0.06), color: PAL.wood });
  }
  parts.push({ geo: cyl(0.016, 0.016, 1.6, 4).rotateX(Math.PI / 2).translate(0, 0.58, 0), color: PAL.woodDark });
  return merge(parts);
}

/** A hide stretched on a frame of poles, leaning back, centred (smaller than a door, so it reads as a skin). */
function hideFrame(): THREE.BufferGeometry {
  const parts: Part[] = [];
  const hs = 0.16;
  const lean = (g: THREE.BufferGeometry): THREE.BufferGeometry => g.rotateZ(0.35).translate(0, 0.24, 0);
  parts.push({ geo: lean(slab(-hs, -0.004, hs, 0.004, -hs, hs)), color: PAL.hide });
  for (const side of [-1, 1]) {
    parts.push({ geo: lean(cyl(0.01, 0.01, 2 * hs + 0.1, 4).translate(side * (hs + 0.01), 0, 0)), color: PAL.woodDark });
    parts.push({ geo: lean(cyl(0.01, 0.01, 2 * hs + 0.1, 4).rotateZ(Math.PI / 2).translate(0, side * (hs + 0.01), 0)), color: PAL.woodDark });
  }
  // Its feet run into the ground, so it stands on a slope.
  for (const side of [-1, 1]) parts.push({ geo: cyl(0.01, 0.01, 0.2, 4).translate(0.06, -0.02, side * 0.17), color: PAL.woodDark });
  return merge(parts);
}

/** A fire pit ringed with stones, a spit over it on two forked sticks, centred. */
function firePit(): THREE.BufferGeometry {
  const parts: Part[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    parts.push({ geo: lumpy(new THREE.DodecahedronGeometry(0.05, 0), 0.35, 410 + i).translate(Math.cos(a) * 0.15, 0.025, Math.sin(a) * 0.15), color: PAL.stone });
  }
  parts.push({ geo: cyl(0.12, 0.12, 0.1, 8).translate(0, -0.04, 0), color: PAL.earthWorn });
  parts.push({ geo: new THREE.ConeGeometry(0.07, 0.1, 5).translate(0, 0.05, 0), color: PAL.embers });
  for (const z of [-0.2, 0.2]) parts.push({ geo: cyl(0.012, 0.012, 0.42, 4).translate(0, 0.11, z), color: PAL.woodDark });
  parts.push({ geo: cyl(0.01, 0.01, 0.46, 4).rotateX(Math.PI / 2).translate(0, 0.3, 0), color: PAL.woodDark });
  return merge(parts);
}

/**
 * The dairy: a little whitewashed stone dairy under tiles at the front
 * corner, with a bench beside it where the cheeses stand (drawn with the
 * store); pails and a stool by the door. The pen behind it (wattle fence,
 * goat shed, hay rack, trough) is drawn in pieces that each stand on their
 * own ground; the goats are drawn as they graze.
 */
/** The middle of the dairy's cheese bench, out from the house's side (local z). */
const BENCH_Z = -0.08;

function dairyModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  // The dairy house: x 0.25..1.35, z -1.35..-0.25, door to the front.
  const x0 = 0.25;
  const x1 = 1.35;
  const z0 = -1.35;
  const z1 = -0.3;
  parts.push({ geo: slab(x0 - 0.04, z0 - 0.04, x1 + 0.04, z1 + 0.04, -0.45, 0.06), color: PAL.plinth });
  parts.push({ geo: slab(x0, z0, x1, z1, 0.06, 0.6), color: PAL.whitewash });
  parts.push({ geo: slab(x0 - 0.01, z0 - 0.01, x1 + 0.01, z1 + 0.01, 0.06, 0.14), color: PAL.granaryShade });
  const cz = (z0 + z1) / 2;
  parts.push({ geo: prism(x1 - x0 + 0.18, (z1 - z0) / 2 + 0.12, 0.34).translate((x0 + x1) / 2, 0.6, cz), color: PAL.roofTile });
  parts.push({ geo: cyl(0.03, 0.03, x1 - x0 + 0.2, 5).rotateZ(Math.PI / 2).translate((x0 + x1) / 2, 0.94, cz), color: PAL.roofTileDark });
  parts.push({ geo: slab(x1, cz - 0.12, x1 + 0.02, cz + 0.12, 0.06, 0.46), color: PAL.door });
  parts.push(...windowX(x1 + 0.005, 0.42, cz + 0.32));
  // The bench under the eaves for the cheeses, along the house's side towards the yard.
  parts.push({ geo: slab(x0 + 0.08, BENCH_Z - 0.1, x1 - 0.08, BENCH_Z + 0.1, 0.2, 0.24), color: PAL.wood });
  for (const x of [x0 + 0.12, x1 - 0.12]) parts.push({ geo: slab(x - 0.02, BENCH_Z - 0.08, x + 0.02, BENCH_Z + 0.08, -0.2, 0.2), color: PAL.woodDark });
  // Pails and a milking stool by the door.
  for (const [x, z] of [[1.25, 0.15], [1.08, 0.28]]) {
    parts.push({ geo: cyl(0.05, 0.04, 0.08, 7).translate(x, 0.04, z), color: PAL.wood });
    parts.push({ geo: cyl(0.044, 0.044, 0.01, 7).translate(x, 0.075, z), color: PAL.goat });
  }
  parts.push({ geo: cyl(0.05, 0.05, 0.02, 6).translate(0.95, 0.1, 0.1), color: PAL.woodDark });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    parts.push({ geo: cyl(0.008, 0.008, 0.1, 3).translate(0.95 + Math.cos(a) * 0.03, 0.05, 0.1 + Math.sin(a) * 0.03), color: PAL.woodDark });
  }
  return merge(parts);
}

/** One length of wattle fence along x, PANEL long: a stake at each end, three bands of woven withies. */
const PANEL = 0.36;
function wattlePanel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  for (const x of [-PANEL / 2, PANEL / 2]) parts.push({ geo: cyl(0.014, 0.016, 0.5, 4).translate(x, 0.02, 0), color: PAL.woodDark });
  for (const y of [0.08, 0.15, 0.22]) {
    parts.push({ geo: lumpy(new THREE.BoxGeometry(PANEL + 0.02, 0.06, 0.045, 2, 1, 1), 0.05, 421 + y * 10).translate(0, y, 0), color: PAL.wattle });
  }
  return merge(parts);
}

/** A goat shed, centred: wattle walls on three sides, open to the pen at +x, under a thatched ridge along x, hay inside. */
function goatShed(): THREE.BufferGeometry {
  const parts: Part[] = [];
  const hx = 0.3;
  const hz = 0.32;
  const h = 0.34;
  parts.push({ geo: slab(-hx, -hz, -hx + 0.05, hz, -0.2, h), color: PAL.wattle });
  parts.push({ geo: slab(-hx, hz - 0.05, hx, hz, -0.2, h), color: PAL.wattle });
  parts.push({ geo: slab(-hx, -hz, hx, -hz + 0.05, -0.2, h), color: PAL.wattle });
  // Corner posts at the open front.
  for (const z of [-hz + 0.03, hz - 0.03]) parts.push({ geo: cyl(0.02, 0.024, h + 0.2, 4).translate(hx - 0.02, h / 2 - 0.1, z), color: PAL.woodDark });
  parts.push({ geo: lumpy(prism(2 * hx + 0.14, hz + 0.08, 0.2), 0.02, 426).translate(0, h, 0), color: PAL.thatch });
  parts.push({ geo: cyl(0.025, 0.025, 2 * hx + 0.16, 5).rotateZ(Math.PI / 2).translate(0, h + 0.2, 0), color: PAL.thatchDark });
  parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.14, 0), 0.2, 427).scale(1.3, 0.55, 1.2).translate(-0.05, 0.05, 0.05), color: PAL.hay });
  return merge(parts);
}

/** A hay rack along z, centred: a slatted trough on legs, heaped with hay. */
function hayRack(): THREE.BufferGeometry {
  const parts: Part[] = [];
  parts.push({ geo: slab(-0.05, -0.35, 0.05, 0.35, 0.18, 0.3), color: PAL.woodDark });
  for (const z of [-0.32, 0.32]) parts.push({ geo: slab(-0.04, z - 0.02, 0.04, z + 0.02, -0.2, 0.18), color: PAL.woodDark });
  parts.push({ geo: lumpy(slab(-0.04, -0.31, 0.04, 0.31, 0.22, 0.38), 0.08, 428), color: PAL.hay });
  return merge(parts);
}

/** A water trough along x, centred. */
function trough(): THREE.BufferGeometry {
  return merge([
    { geo: slab(-0.25, -0.06, 0.25, 0.06, -0.2, 0.08), color: PAL.wood },
    { geo: slab(-0.23, -0.04, 0.23, 0.04, 0.07, 0.081), color: PAL.shallow },
  ]);
}

/** Where a piece of a lodge or dairy stands in the building's frame: at (lx, lz), turned by yaw, sampled for its ground over r. */
type Piece = 'panel' | 'shed' | 'hayrack' | 'trough' | 'rack' | 'hide' | 'firepit' | 'olivetree' | 'oliveladder' | 'terrace' | 'basin' | 'beampress' | 'yardwall' | 'gate' | 'sheeptrough' | 'vinerow' | 'vat';
/** (r: the half-size of the ground sampled under it; rz across, when it differs.) */
type Placed = { piece: Piece; lx: number; lz: number; yaw: number; len: number; r: number; rz?: number };

/** The dairy's pen: wattle round x -1.42..0.12, z -1.42..1.42, with a gap at the front for the goats; the shed, the rack, the trough. */
const DAIRY_PIECES: Placed[] = (() => {
  const out: Placed[] = [];
  const side = (a: [number, number], b: [number, number]): void => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(len / PANEL));
    const yaw = -Math.atan2(b[1] - a[1], b[0] - a[0]);
    for (let i = 0; i < n; i++) {
      const f = (i + 0.5) / n;
      out.push({ piece: 'panel', lx: a[0] + (b[0] - a[0]) * f, lz: a[1] + (b[1] - a[1]) * f, yaw, len: len / n / PANEL, r: PANEL / 2 });
    }
  };
  const px0 = -1.42;
  const px1 = 0.12;
  const pz0 = -1.42;
  const pz1 = 1.42;
  side([px0, pz0], [px0, pz1]);
  side([px0, pz0], [px1, pz0]);
  side([px0, pz1], [px1, pz1]);
  side([px1, pz0], [px1, -0.25]);
  side([px1, 0.45], [px1, pz1]);
  out.push({ piece: 'shed', lx: -1.05, lz: 1.0, yaw: 0, len: 1, r: 0.32 });
  out.push({ piece: 'hayrack', lx: -1.25, lz: -0.15, yaw: 0, len: 1, r: 0.3 });
  out.push({ piece: 'trough', lx: -0.25, lz: -1.24, yaw: 0, len: 1, r: 0.25 });
  return out;
})();

/** The lodge's yard: the drying rack, the hide on its frame, the fire pit. */
const LODGE_PIECES: Placed[] = [
  { piece: 'rack', lx: 0.62, lz: 0, yaw: 0, len: 1, r: 0.7 },
  { piece: 'hide', lx: 0.35, lz: 1.05, yaw: 0, len: 1, r: 0.15 },
  { piece: 'firepit', lx: 1.0, lz: -0.95, yaw: 0, len: 1, r: 0.18 },
];
/**
 * The grove: three rows of olive trees down the field (behind the hut), each
 * on its own ground, one with a ladder in it; a dry-stone terrace wall along
 * the back and the far side. (len: a tree's size.)
 */
const TERRACE = 0.5;
const GROVE_PIECES: Placed[] = (() => {
  const out: Placed[] = [];
  const trees: Array<[number, number]> = [
    [-1.0, -1.0], [-1.0, 0.0], [-1.0, 1.0],
    [-0.05, -0.55], [-0.05, 0.5],
    [0.95, 0.15], [0.95, 1.1],
  ];
  trees.forEach(([lx, lz], i) => {
    const jx = (hash2(i, 1, 771) - 0.5) * 0.14;
    const jz = (hash2(i, 2, 772) - 0.5) * 0.14;
    out.push({ piece: i === 4 ? 'oliveladder' : 'olivetree', lx: lx + jx, lz: lz + jz, yaw: hash2(i, 3, 773) * Math.PI * 2, len: 0.9 + 0.22 * hash2(i, 4, 774), r: 0.1 });
  });
  for (let i = 0; i < 6; i++) out.push({ piece: 'terrace', lx: -1.45, lz: -1.25 + i * TERRACE, yaw: Math.PI / 2, len: 1, r: 0.25 });
  for (let i = 0; i < 4; i++) out.push({ piece: 'terrace', lx: -1.2 + i * TERRACE, lz: 1.48, yaw: 0, len: 1, r: 0.25 });
  return out;
})();
/** The press's yard: the crushing basin before the house, the beam press along its side. */
const PRESS_PIECES: Placed[] = [
  { piece: 'basin', lx: 0.62, lz: -0.62, yaw: 0, len: 1, r: 0.5 },
  { piece: 'beampress', lx: -0.45, lz: 0.95, yaw: 0, len: 1, r: 0.95, rz: 0.22 },
];

const YARD_WALL = 0.5;
/** The storehouse's yard walls (each length on its own ground) round the yard in front of the shed, and the gateway to the road. */
const STORE_PIECES: Placed[] = (() => {
  const out: Placed[] = [];
  const side = (a: [number, number], b: [number, number]): void => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(len / YARD_WALL));
    const yaw = -Math.atan2(b[1] - a[1], b[0] - a[0]);
    for (let i = 0; i < n; i++) {
      const f = (i + 0.5) / n;
      out.push({ piece: 'yardwall', lx: a[0] + (b[0] - a[0]) * f, lz: a[1] + (b[1] - a[1]) * f, yaw, len: len / n / YARD_WALL, r: 0.25 });
    }
  };
  side([-0.7, -1.43], [1.43, -1.43]);
  side([-0.7, 1.43], [1.43, 1.43]);
  side([1.43, -1.43], [1.43, -0.55]);
  side([1.43, 0.55], [1.43, 1.43]);
  out.push({ piece: 'gate', lx: 1.43, lz: 0, yaw: 0, len: 1, r: 0.12, rz: 0.55 });
  return out;
})();

/** The grove's trees (where its olives hang). */
const GROVE_TREES = GROVE_PIECES.filter((p) => p.piece === 'olivetree' || p.piece === 'oliveladder');

/** The lodge's rack (where the meat hangs). */
const RACK_PIECE = LODGE_PIECES[0];

/** The part of a lodge or dairy its main building's floor is levelled to: the cabin, or the dairy with its bench and pails (local x0, z0, x1, z1). */
const MAIN_FOOT: Partial<Record<Building['kind'], [number, number, number, number]>> = {
  lodge: [-1.4, -1.35, 0.0, 0.6],
  dairy: [0.2, -1.4, 1.4, 0.3],
  grove: [0.55, -1.4, 1.45, -0.5],
  press: [-1.45, -1.43, -0.15, 0.3],
  storehouse: [-1.48, -1.48, -0.7, 1.48],
  pasture: [0.55, -1.4, 1.36, -0.74],
  vineyard: [0.68, -1.42, 1.38, -0.82],
  winery: [-1.47, -1.45, -0.25, 0.47],
};
/**
 * Kinds levelled to the highest ground under their main building (or, with
 * no MAIN_FOOT, their whole footprint) rather than the lowest: they go on the
 * hillsides, and their floors and yards stand on terraces whose foundations
 * run down the slope, so nothing is buried on the uphill side.
 */
const HIGH_FOOT: ReadonlySet<Building['kind']> = new Set(['grove', 'press', 'storehouse', 'vineyard', 'winery', 'trading']);


// ---------------------------------------------------------------------------
// Olives and oil (slice 10).

/**
 * An olive tree of the grove, its foot at the origin, about 0.9 tall: a
 * gnarled, leaning trunk forking into two, under a broad silver-green crown.
 * Its trunk runs down into the slope. `ladder`: a ladder leaning into it.
 */
function groveTree(ladder: boolean): THREE.BufferGeometry {
  const parts: Part[] = [];
  parts.push({ geo: cyl(0.05, 0.09, 0.62, 5).rotateZ(0.16).translate(0.02, 0.13, 0), color: PAL.trunk });
  parts.push({ geo: cyl(0.035, 0.05, 0.32, 4).rotateZ(-0.6).translate(0.1, 0.48, 0.02), color: PAL.trunk });
  parts.push({ geo: cyl(0.03, 0.045, 0.3, 4).rotateX(0.55).translate(-0.04, 0.5, -0.08), color: PAL.trunk });
  parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.34, 0), 0.25, 701).scale(1, 0.62, 1).translate(0.02, 0.74, 0), color: PAL.oliveLeaf });
  parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.24, 0), 0.25, 702).scale(1, 0.66, 1).translate(0.22, 0.64, 0.12), color: PAL.oliveLeafDark });
  parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.22, 0), 0.25, 703).scale(1, 0.66, 1).translate(-0.2, 0.66, -0.12), color: PAL.oliveLeaf });
  if (ladder) {
    // Two rails and four rungs, leaning into the crown from the front.
    const lean = (g: THREE.BufferGeometry): THREE.BufferGeometry => g.rotateZ(0.42).translate(0.32, 0.3, 0);
    for (const z of [-0.06, 0.06]) parts.push({ geo: lean(cyl(0.01, 0.01, 0.7, 3).translate(0, 0, z)), color: PAL.wood });
    for (const y of [-0.24, -0.08, 0.08, 0.24]) parts.push({ geo: lean(cyl(0.008, 0.008, 0.12, 3).rotateX(Math.PI / 2).translate(0, y, 0)), color: PAL.woodDark });
  }
  return merge(parts);
}

/** Where a grove tree's olives hang: a scatter of points on the outside of its crown (shared by the fruit model). */
const FRUIT_AT: Array<[number, number, number]> = (() => {
  const out: Array<[number, number, number]> = [];
  const crowns: Array<[number, number, number, number, number]> = [
    [0.02, 0.74, 0, 0.34, 0.62],
    [0.22, 0.64, 0.12, 0.24, 0.66],
    [-0.2, 0.66, -0.12, 0.22, 0.66],
  ];
  for (let i = 0; i < 30; i++) {
    const [cx, cy, cz, r, sy] = crowns[i % 3];
    const a = hash2(i, 1, 711) * Math.PI * 2;
    // The lower and outer half of the crown, where the fruit shows from above and beside.
    const e = (hash2(i, 2, 712) - 0.6) * 1.1;
    out.push([cx + Math.cos(a) * Math.cos(e) * r * 0.98, cy + Math.sin(e) * r * sy * 0.98, cz + Math.sin(a) * Math.cos(e) * r * 0.98]);
  }
  return out;
})();

/** A grove tree's olives, white (each tree's take their colour as they ripen, green to near black). */
function groveFruit(): THREE.BufferGeometry {
  return merge(FRUIT_AT.map(([x, y, z], i) => ({ geo: new THREE.IcosahedronGeometry(0.014 + 0.004 * hash2(i, 3, 713), 0).scale(1, 1.3, 1).translate(x, y, z), color: '#ffffff' })));
}

/** A length of dry-stone terrace wall along x, TERRACE long, its foot run down into the slope. */
function terraceWall(): THREE.BufferGeometry {
  const parts: Part[] = [{ geo: slab(-TERRACE / 2, -0.06, TERRACE / 2, 0.06, -0.4, 0.08), color: PAL.rockDark }];
  for (let i = 0; i < 4; i++) {
    const r = 0.07 + 0.02 * hash2(i, 1, 721);
    parts.push({ geo: lumpy(new THREE.DodecahedronGeometry(r, 0), 0.35, 722 + i).scale(1.3, 0.7, 0.9).translate(-TERRACE / 2 + (i + 0.5) * (TERRACE / 4), 0.08 + r * 0.3, 0), color: i % 2 ? PAL.stone : PAL.rockWarm });
  }
  return merge(parts);
}

/**
 * The grove's picker's hut at its front corner, by the road: a little
 * rubble-stone hut under a thatched lean-to, a bench, a pile of empty
 * baskets (the full ones are drawn with the store).
 */
function groveHut(): THREE.BufferGeometry {
  const parts: Part[] = [];
  const x0 = 0.6;
  const x1 = 1.3;
  const z0 = -1.35;
  const z1 = -0.75;
  parts.push({ geo: slab(x0 - 0.04, z0 - 0.04, x1 + 0.04, z1 + 0.04, -1.2, 0.05), color: PAL.plinth });
  parts.push({ geo: slab(x0, z0, x1, z1, 0.05, 0.44), color: PAL.mudWall });
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) parts.push({ geo: slab(x - 0.04, z - 0.04, x + 0.04, z + 0.04, 0.05, 0.44), color: PAL.stone });
  // A steep thatched roof, its ridge along the slope.
  parts.push({ geo: lumpy(prism(x1 - x0 + 0.16, (z1 - z0) / 2 + 0.1, 0.36), 0.03, 731).translate((x0 + x1) / 2, 0.44, (z0 + z1) / 2), color: PAL.thatch });
  parts.push({ geo: slab(x1, -1.12, x1 + 0.02, -0.96, 0.05, 0.36), color: PAL.door });
  // A bench and a stack of empty baskets by the door.
  parts.push({ geo: slab(0.7, -0.62, 1.2, -0.52, 0.12, 0.16), color: PAL.wood });
  for (const x of [0.74, 1.16]) parts.push({ geo: slab(x - 0.02, -0.6, x + 0.02, -0.54, -0.3, 0.12), color: PAL.woodDark });
  for (let i = 0; i < 3; i++) parts.push({ geo: cyl(0.08, 0.065, 0.07, 7).translate(1.38, 0.035 + i * 0.05, -0.62), color: PAL.basket });
  return merge(parts);
}

/** A round basket heaped with olives (picked: ripe and dark), on the ground. */
function oliveBasket(): THREE.BufferGeometry {
  return merge([
    { geo: cyl(0.075, 0.06, 0.09, 7).translate(0, 0.045, 0), color: PAL.basket },
    { geo: lumpy(new THREE.SphereGeometry(0.07, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), 0.25, 741).scale(1, 0.6, 1).translate(0, 0.085, 0), color: PAL.oliveRipe },
  ]);
}

/** A tall jar of oil standing on the ground: terracotta, two handles, sealed with pale-green wax. */
function oilJarModel(): THREE.BufferGeometry {
  const body = [
    new THREE.Vector2(0.0, 0),
    new THREE.Vector2(0.03, 0.004),
    new THREE.Vector2(0.075, 0.07),
    new THREE.Vector2(0.07, 0.15),
    new THREE.Vector2(0.03, 0.19),
    new THREE.Vector2(0.026, 0.22),
    new THREE.Vector2(0.034, 0.23),
  ];
  const parts: Part[] = [{ geo: new THREE.LatheGeometry(body, 7), color: PAL.oilJar }];
  parts.push({ geo: cyl(0.031, 0.028, 0.02, 6).translate(0, 0.235, 0), color: PAL.oilSeal });
  parts.push({ geo: cyl(0.074, 0.074, 0.02, 7).translate(0, 0.11, 0), color: PAL.oilJarDark });
  for (const z of [-1, 1]) parts.push({ geo: new THREE.TorusGeometry(0.03, 0.008, 3, 6, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).translate(0, 0.19, z * 0.04), color: PAL.oilJarDark });
  return merge(parts);
}

/**
 * The olive press: a stone press house under tiles at the back, its door to
 * the yard. Its yard pieces stand on their own ground (see PRESS_PIECES): the
 * round crushing basin with its upright millstone on a pole, and the beam
 * press along the house's side. Olive baskets and jars of oil are drawn with
 * its store.
 */
function pressModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  const x0 = -1.4;
  const x1 = -0.2;
  const z0 = -1.38;
  const z1 = 0.25;
  // Levelled to the top of its ground (HIGH_FOOT): the plinth runs down the slope.
  parts.push({ geo: slab(x0 - 0.05, z0 - 0.05, x1 + 0.05, z1 + 0.05, -1.2, 0.08), color: PAL.plinth });
  parts.push({ geo: slab(x0, z0, x1, z1, 0.08, 0.72), color: PAL.pressStone });
  parts.push({ geo: slab(x0 - 0.01, z0 - 0.01, x1 + 0.01, z1 + 0.01, 0.08, 0.18), color: PAL.pressStoneDark });
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  parts.push({ geo: prism(z1 - z0 + 0.2, (x1 - x0) / 2 + 0.12, 0.38).rotateY(Math.PI / 2).translate(cx, 0.72, cz), color: PAL.roofTile });
  parts.push({ geo: cyl(0.03, 0.03, z1 - z0 + 0.22, 5).rotateX(Math.PI / 2).translate(cx, 1.1, cz), color: PAL.roofTileDark });
  for (const side of [-1, 1]) {
    const y = 0.72 + 0.38 * 0.5;
    const x = cx + side * ((x1 - x0) / 2 + 0.12) * 0.5;
    parts.push({ geo: new THREE.BoxGeometry(0.03, 0.02, z1 - z0 + 0.2).rotateZ(side * 0.55).translate(x, y + 0.012, cz), color: PAL.roofTileDark });
  }
  // The door to the yard, a step down from it, and a high window.
  parts.push({ geo: slab(x1, -0.82, x1 + 0.02, -0.5, 0.08, 0.56), color: PAL.door });
  parts.push({ geo: slab(x1 + 0.02, -0.86, x1 + 0.16, -0.46, -1.2, 0.04), color: PAL.pressStoneDark });
  parts.push(...windowX(x1 + 0.005, 0.56, -0.05));
  return merge(parts);
}

/** The press's crushing basin, centred: a stone ring with a raised rim full of olive paste, a pillar, the upright millstone and its pole. Its foot runs down into the slope. */
function crushingBasin(): THREE.BufferGeometry {
  const parts: Part[] = [];
  parts.push({ geo: cyl(0.46, 0.5, 0.6, 14).translate(0, -0.2, 0), color: PAL.pressStoneDark });
  parts.push({ geo: cyl(0.48, 0.48, 0.06, 14).translate(0, 0.13, 0), color: PAL.pressStone });
  parts.push({ geo: cyl(0.4, 0.4, 0.062, 14).translate(0, 0.135, 0), color: PAL.olivePaste });
  parts.push({ geo: cyl(0.07, 0.08, 0.36, 7).translate(0, 0.3, 0), color: PAL.pressStone });
  parts.push({ geo: cyl(0.2, 0.2, 0.12, 12).rotateX(Math.PI / 2).translate(0.2, 0.36, 0), color: PAL.millstone });
  parts.push({ geo: cyl(0.03, 0.03, 0.14, 5).rotateX(Math.PI / 2).translate(0.2, 0.36, 0), color: PAL.woodDark });
  parts.push({ geo: cyl(0.018, 0.018, 0.95, 4).rotateZ(Math.PI / 2).translate(0.2, 0.42, 0), color: PAL.wood });
  return merge(parts);
}

/**
 * The beam press, along x, centred: the press bed with its stack of olive
 * mats, the post the beam is anchored in, the long beam, and the weight
 * stone hanging from its far end; a stone trough for the oil.
 */
function beamPress(): THREE.BufferGeometry {
  const parts: Part[] = [];
  parts.push({ geo: cyl(0.2, 0.22, 0.4, 10).translate(-0.5, -0.15, 0), color: PAL.pressStone });
  for (let i = 0; i < 4; i++) parts.push({ geo: cyl(0.15, 0.15, 0.04, 9).translate(-0.5, 0.07 + i * 0.045, 0), color: i % 2 ? PAL.basket : PAL.straw });
  // The post the beam is anchored in, and the beam lying across the mats, out to the weight.
  parts.push({ geo: cyl(0.045, 0.055, 0.9, 5).translate(-0.9, 0.0, 0), color: PAL.woodDark });
  parts.push({ geo: cyl(0.032, 0.042, 1.85, 5).rotateZ(Math.PI / 2 - 0.05).translate(0.0, 0.3, 0), color: PAL.wood });
  parts.push({ geo: cyl(0.008, 0.008, 0.14, 3).translate(0.85, 0.22, 0), color: PAL.woodDark });
  parts.push({ geo: lumpy(new THREE.DodecahedronGeometry(0.12, 0), 0.2, 751).scale(1, 0.9, 1).translate(0.85, 0.1, 0), color: PAL.rockDark });
  parts.push({ geo: slab(-0.32, -0.08, -0.12, 0.08, -0.3, 0.07), color: PAL.pressStoneDark });
  return merge(parts);
}

/**
 * The storehouse's shed along the back of its yard: a stone back wall, posts
 * and a beam, a tiled lean-to roof sloping to the yard, straw for bedding
 * the jars. Its yard walls and gateway stand on their own ground (see
 * STORE_PIECES); the jars of oil stand in rows in the yard (drawn with its
 * store), the corner by the gate left for bales and wine (slice 11).
 */
function storehouseModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  // Levelled to the top of its ground (HIGH_FOOT): the paving's foundation runs down the slope.
  parts.push({ geo: slab(-1.48, -1.48, -0.7, 1.48, -1.2, 0.04), color: PAL.paving });
  parts.push({ geo: slab(-1.47, -1.47, -1.37, 1.47, 0.04, 1.0), color: PAL.stone });
  for (const z of [-1.3, -0.45, 0.45, 1.3]) parts.push({ geo: cyl(0.035, 0.04, 0.72, 5).translate(-0.78, 0.38, z), color: PAL.wood });
  parts.push({ geo: slab(-0.82, -1.42, -0.74, 1.42, 0.72, 0.78), color: PAL.woodDark });
  parts.push({ geo: new THREE.BoxGeometry(0.9, 0.06, 3.0).rotateZ(-0.28).translate(-1.1, 0.92, 0), color: PAL.roofTile });
  for (let k = 0; k < 10; k++) parts.push({ geo: new THREE.BoxGeometry(0.9, 0.025, 0.035).rotateZ(-0.28).translate(-1.1, 0.96, -1.4 + (k * 2.8) / 9), color: PAL.roofTileDark });
  parts.push({ geo: lumpy(slab(-1.32, 0.6, -0.9, 1.3, 0.05, 0.14), 0.15, 763), color: PAL.straw });
  return merge(parts);
}

/** A length of the storehouse's yard wall along x, YARD_WALL long: rubble stone with a coping, its foot run down into the slope. */
function yardWall(): THREE.BufferGeometry {
  const parts: Part[] = [
    { geo: slab(-YARD_WALL / 2 - 0.01, -0.05, YARD_WALL / 2 + 0.01, 0.05, -0.6, 0.4), color: PAL.stone },
    { geo: slab(-YARD_WALL / 2 - 0.02, -0.07, YARD_WALL / 2 + 0.02, 0.07, 0.4, 0.44), color: PAL.pressStone },
  ];
  for (let i = 0; i < 3; i++) {
    const r = 0.05 + 0.02 * hash2(i, 1, 761);
    parts.push({ geo: lumpy(new THREE.DodecahedronGeometry(r, 0), 0.35, 762 + i).scale(1.2, 0.8, 0.6).translate(-YARD_WALL / 2 + (i + 0.5) * (YARD_WALL / 3), 0.1 + 0.2 * hash2(i, 2, 763), 0.045), color: i % 2 ? PAL.rockDark : PAL.rockWarm });
  }
  return merge(parts);
}

/** The storehouse's gateway, across z, centred: two stone piers and a lintel, a pair of gates standing open into the yard. */
function storeGate(): THREE.BufferGeometry {
  const parts: Part[] = [];
  for (const z of [-0.46, 0.46]) parts.push({ geo: slab(-0.09, z - 0.09, 0.09, z + 0.09, -0.6, 0.72), color: PAL.pressStone });
  parts.push({ geo: slab(-0.11, -0.58, 0.11, 0.58, 0.72, 0.82), color: PAL.pressStoneDark });
  for (const side of [-1, 1]) parts.push({ geo: slab(-0.34, side * 0.36 - 0.02, -0.08, side * 0.36 + 0.02, 0.02, 0.6), color: PAL.door });
  return merge(parts);
}

/**
 * The agora's oil stall, at the side of the square (local -z of the food
 * stall): a narrow counter under a striped olive-and-cream awning on four
 * poles. Its jars are drawn with its stock.
 */
const OIL_STALL_X = 0.42;
const OIL_STALL_Z = -1.08;
function oilStallModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  const cx = OIL_STALL_X;
  const cz = OIL_STALL_Z;
  parts.push({ geo: slab(cx - 0.36, cz - 0.12, cx + 0.36, cz + 0.12, 0, 0.26), color: PAL.wood });
  parts.push({ geo: slab(cx - 0.38, cz - 0.14, cx + 0.38, cz + 0.14, 0.26, 0.29), color: PAL.woodDark });
  for (const [x, z] of [[cx - 0.42, cz - 0.24], [cx + 0.42, cz - 0.24], [cx - 0.42, cz + 0.2], [cx + 0.42, cz + 0.2]]) parts.push({ geo: cyl(0.016, 0.016, 0.72, 4).translate(x, 0.36, z), color: PAL.pole });
  // The awning: stripes running front to back, sloping down to the front (+x).
  for (let k = 0; k < 5; k++) {
    const x0 = cx - 0.48 + (k * 0.96) / 5;
    parts.push({ geo: slab(x0, -0.28, x0 + 0.96 / 5, 0.28, 0, 0.02).rotateX(0.18).translate(0, 0.73, cz - 0.02), color: k % 2 ? PAL.oilVendorScarf : PAL.oilVendorDress });
  }
  // A big jar on the ground at the end, a funnel and a ladle on the counter.
  parts.push(amphora(cx + 0.5, cz + 0.02, 0.26));
  parts.push({ geo: new THREE.ConeGeometry(0.03, 0.05, 5).rotateX(Math.PI).translate(cx - 0.28, 0.32, cz), color: PAL.oilJarDark });
  return merge(parts);
}

// ---------------------------------------------------------------------------
// Fleece and wine (slice 11).

/**
 * A stall at the side of the agora's square, centred at the origin, its
 * front (where the vendor stands and the awning slopes down) facing +z: a
 * narrow counter under a striped awning on four poles, a big jar on the
 * ground at its end. Its goods are drawn with its stock.
 */
function stallParts(dark: string, light: string): Part[] {
  const parts: Part[] = [];
  parts.push({ geo: slab(-0.36, -0.12, 0.36, 0.12, 0, 0.26), color: PAL.wood });
  parts.push({ geo: slab(-0.38, -0.14, 0.38, 0.14, 0.26, 0.29), color: PAL.woodDark });
  for (const [x, z] of [[-0.42, -0.2], [0.42, -0.2], [-0.42, 0.24], [0.42, 0.24]]) parts.push({ geo: cyl(0.016, 0.016, 0.72, 4).translate(x, 0.36, z), color: PAL.pole });
  for (let k = 0; k < 5; k++) {
    const x0 = -0.48 + (k * 0.96) / 5;
    parts.push({ geo: slab(x0, -0.28, x0 + 0.96 / 5, 0.28, 0, 0.02).rotateX(0.18).translate(0, 0.73, 0.02), color: k % 2 ? light : dark });
  }
  return parts;
}
const moveParts = (parts: Part[], f: (g: THREE.BufferGeometry) => THREE.BufferGeometry): Part[] => parts.map((p) => ({ ...p, geo: f(p.geo) }));

/** Where the fleece stall stands (across the square from the oil stall, its front to the square) and the wine stall (at the front of the square, its front to the road). */
const FLEECE_STALL_X = 0.42;
const FLEECE_STALL_Z = 1.08;
const WINE_STALL_X = 1.12;
const WINE_STALL_Z = 0;

/** The fleece stall: slate-blue and cream stripes, a bale or two on the ground beside it and a distaff leaning on the counter. */
function fleeceStallModel(): THREE.BufferGeometry {
  const parts = moveParts(stallParts(PAL.fleeceVendorDress, PAL.fleeceVendorScarf), (g) => g.rotateY(Math.PI).translate(FLEECE_STALL_X, 0, FLEECE_STALL_Z));
  parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.1, 0), 0.2, 791).scale(1.2, 0.75, 1).translate(FLEECE_STALL_X + 0.52, 0.07, FLEECE_STALL_Z), color: PAL.wool });
  parts.push({ geo: cyl(0.092, 0.092, 0.018, 6).scale(1.15, 1, 0.98).translate(FLEECE_STALL_X + 0.52, 0.07, FLEECE_STALL_Z), color: PAL.rope });
  parts.push({ geo: cyl(0.008, 0.008, 0.36, 3).rotateX(0.3).translate(FLEECE_STALL_X - 0.3, 0.42, FLEECE_STALL_Z - 0.05), color: PAL.wood });
  parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.035, 0), 0.2, 792).scale(1, 1.4, 1).translate(FLEECE_STALL_X - 0.3, 0.6, FLEECE_STALL_Z - 0.0), color: PAL.wool });
  return merge(parts);
}

/** The wine stall: wine-red and cream stripes, a rack of amphorae lying on their sides behind the counter, a big jar on the ground. */
function wineStallModel(): THREE.BufferGeometry {
  const parts = moveParts(stallParts(PAL.wineVendorTunic, PAL.fleeceVendorScarf), (g) => g.rotateY(Math.PI / 2).translate(WINE_STALL_X, 0, WINE_STALL_Z));
  parts.push(amphora(WINE_STALL_X, WINE_STALL_Z - 0.5, 0.26));
  // The rack behind the counter: two trestles and amphorae lying on them.
  for (const z of [-0.3, 0.3]) parts.push({ geo: slab(WINE_STALL_X - 0.34, WINE_STALL_Z + z - 0.02, WINE_STALL_X - 0.22, WINE_STALL_Z + z + 0.02, 0, 0.16), color: PAL.woodDark });
  for (const z of [-0.18, 0, 0.18]) {
    parts.push({ geo: new THREE.LatheGeometry([new THREE.Vector2(0, -0.1), new THREE.Vector2(0.045, -0.06), new THREE.Vector2(0.05, 0.02), new THREE.Vector2(0.02, 0.08), new THREE.Vector2(0.02, 0.1)], 5).rotateX(Math.PI / 2).rotateY(Math.PI / 2).translate(WINE_STALL_X - 0.28, 0.2, WINE_STALL_Z + z), color: PAL.amphora });
  }
  return merge(parts);
}

/**
 * The sheep pasture's shepherd's hut at the front corner, by the road: a
 * rubble-stone hut under thatch, a crook by the door; and the shearing
 * shelter at the other front corner, a thatched roof on four posts over a
 * bench, where the bales are stacked (drawn with its store). The fold's
 * dry-stone wall and the trough stand on their own ground (PASTURE_PIECES).
 */
function pastureModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  const x0 = 0.6;
  const x1 = 1.32;
  const z0 = -1.36;
  const z1 = -0.78;
  parts.push({ geo: slab(x0 - 0.04, z0 - 0.04, x1 + 0.04, z1 + 0.04, -0.5, 0.05), color: PAL.plinth });
  parts.push({ geo: slab(x0, z0, x1, z1, 0.05, 0.42), color: PAL.stone });
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) parts.push({ geo: slab(x - 0.04, z - 0.04, x + 0.04, z + 0.04, 0.05, 0.42), color: PAL.rockWarm });
  parts.push({ geo: lumpy(prism(x1 - x0 + 0.16, (z1 - z0) / 2 + 0.1, 0.34), 0.03, 801).translate((x0 + x1) / 2, 0.42, (z0 + z1) / 2), color: PAL.thatch });
  parts.push({ geo: slab(x1, -1.14, x1 + 0.02, -0.98, 0.05, 0.34), color: PAL.door });
  // The crook, leaning by the door.
  parts.push({ geo: cyl(0.008, 0.008, 0.5, 3).rotateZ(-0.18).translate(x1 + 0.06, 0.25, -0.86), color: PAL.wood });
  parts.push({ geo: new THREE.TorusGeometry(0.035, 0.008, 3, 6, Math.PI * 1.3).translate(x1 + 0.1, 0.5, -0.86), color: PAL.wood });
  // The shearing shelter.
  const sx0 = 0.62;
  const sx1 = 1.3;
  const sz0 = 0.6;
  const sz1 = 1.32;
  for (const [x, z] of [[sx0, sz0], [sx1, sz0], [sx0, sz1], [sx1, sz1]]) parts.push({ geo: cyl(0.022, 0.026, 0.62, 4).translate(x, 0.21, z), color: PAL.wood });
  parts.push({ geo: lumpy(prism(sx1 - sx0 + 0.18, (sz1 - sz0) / 2 + 0.12, 0.24), 0.03, 802).translate((sx0 + sx1) / 2, 0.52, (sz0 + sz1) / 2), color: PAL.thatch });
  parts.push({ geo: slab(sx0 + 0.06, sz1 - 0.18, sx1 - 0.06, sz1 - 0.06, 0.12, 0.17), color: PAL.wood });
  // A heap of fresh fleece on the floor, shears on the bench.
  parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.12, 0), 0.25, 803).scale(1.3, 0.45, 1.1).translate(sx0 + 0.18, 0.04, sz0 + 0.2), color: PAL.wool });
  parts.push({ geo: slab(sx1 - 0.3, sz1 - 0.14, sx1 - 0.16, sz1 - 0.1, 0.17, 0.18), color: PAL.rockGrey });
  return merge(parts);
}

/** A sheep's water trough: a hollowed log on two stones. */
function sheepTrough(): THREE.BufferGeometry {
  return merge([
    { geo: cyl(0.07, 0.07, 0.5, 6).rotateZ(Math.PI / 2).scale(1, 0.7, 1).translate(0, 0.06, 0), color: PAL.log },
    { geo: slab(-0.23, -0.045, 0.23, 0.045, 0.06, 0.1), color: PAL.shallow },
    { geo: slab(-0.2, -0.08, -0.12, 0.08, -0.25, 0.02), color: PAL.stone },
    { geo: slab(0.12, -0.08, 0.2, 0.08, -0.25, 0.02), color: PAL.stone },
  ]);
}

/** The vineyard's rows: four rows of trellised vines down the field (behind the hut), each a run of lengths on its own ground. */
const VINE_LEN = 0.48;
const VINE_ROWS = [-1.05, -0.35, 0.35, 1.05];
const VINE_XS = [-1.18, -0.7, -0.22, 0.26];

/** A length of trellised vine along x, VINE_LEN long: a stake at each end (run into the slope), a cross-bar wire, and the leafy cane along it. */
function vineRow(): THREE.BufferGeometry {
  const parts: Part[] = [];
  for (const x of [-VINE_LEN / 2, VINE_LEN / 2]) {
    parts.push({ geo: cyl(0.012, 0.015, 0.75, 4).translate(x, 0.1, 0), color: PAL.vineWood });
    parts.push({ geo: slab(x - 0.008, -0.08, x + 0.008, 0.08, 0.4, 0.415), color: PAL.vineWood });
  }
  parts.push({ geo: cyl(0.004, 0.004, VINE_LEN, 3).rotateZ(Math.PI / 2).translate(0, 0.41, 0), color: PAL.woodDark });
  // The twisted trunk up the middle and the leaves along the wire.
  parts.push({ geo: cyl(0.016, 0.022, 0.4, 4).rotateZ(0.12).translate(0.02, 0.2, 0), color: PAL.vineWood });
  // Clumps of leaves along the wire with daylight between them, so it reads as a row of vines and not a hedge.
  const clumps: [number, number, number, number][] = [[-0.19, 0.46, 0.085, 811], [-0.06, 0.49, 0.075, 812], [0.07, 0.46, 0.085, 813], [0.2, 0.48, 0.07, 814]];
  clumps.forEach(([x, y, r, seed], i) => {
    parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(r, 1), 0.3, seed).scale(1.2, 0.75, 1.1).translate(x, y, (i % 2) * 0.02 - 0.01), color: i % 2 ? PAL.vineLeafDark : PAL.vineLeaf });
  });
  return merge(parts);
}

/** The grapes hanging under one length of vine, white (they take their colour as they ripen, green to purple). */
function vineGrapes(): THREE.BufferGeometry {
  const parts: Part[] = [];
  for (const [x, z] of [[-0.15, 0.1], [0.02, -0.11], [0.17, 0.1]]) {
    for (const [dx, dy, dz, r] of [[0, 0, 0, 0.032], [0.02, -0.035, 0.008, 0.026], [-0.016, -0.03, -0.006, 0.026], [0.004, -0.065, 0, 0.02]]) {
      parts.push({ geo: new THREE.IcosahedronGeometry(r, 0).translate(x + dx, 0.37 + dy, z + dz), color: '#ffffff' });
    }
  }
  return merge(parts);
}

/** A round basket heaped with purple grapes, a vine leaf on top. */
function grapeBasket(): THREE.BufferGeometry {
  return merge([
    { geo: cyl(0.075, 0.06, 0.09, 7).translate(0, 0.045, 0), color: PAL.basket },
    { geo: lumpy(new THREE.SphereGeometry(0.072, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), 0.35, 821).scale(1, 0.75, 1).translate(0, 0.085, 0), color: PAL.grapeRipe },
    { geo: new THREE.CircleGeometry(0.035, 5).rotateX(-Math.PI / 2 + 0.3).translate(0.02, 0.14, 0.02), color: PAL.vineLeaf },
  ]);
}

/**
 * The vineyard's vinedresser's hut at its front corner, by the road: a
 * little whitewashed hut under tiles with a vine pergola over its door, a
 * bench, and empty baskets (the full ones are drawn with its store).
 */
function vineyardModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  const x0 = 0.72;
  const x1 = 1.34;
  const z0 = -1.38;
  const z1 = -0.86;
  parts.push({ geo: slab(x0 - 0.04, z0 - 0.04, x1 + 0.04, z1 + 0.04, -1.2, 0.05), color: PAL.plinth });
  parts.push({ geo: slab(x0, z0, x1, z1, 0.05, 0.42), color: PAL.whitewash });
  parts.push({ geo: prism(x1 - x0 + 0.14, (z1 - z0) / 2 + 0.1, 0.26).translate((x0 + x1) / 2, 0.42, (z0 + z1) / 2), color: PAL.roofTile });
  parts.push({ geo: slab(x1, -1.2, x1 + 0.02, -1.04, 0.05, 0.34), color: PAL.door });
  // The pergola before the door: two posts and a leafy roof.
  for (const z of [-1.36, -0.88]) parts.push({ geo: cyl(0.014, 0.014, 0.42, 4).translate(x1 + 0.24, 0.21, z), color: PAL.vineWood });
  parts.push({ geo: lumpy(new THREE.BoxGeometry(0.3, 0.05, 0.56, 1, 1, 2), 0.3, 831).translate(x1 + 0.12, 0.43, -1.12), color: PAL.vineLeaf });
  parts.push({ geo: slab(0.78, -0.72, 1.24, -0.64, 0.12, 0.16), color: PAL.wood });
  for (let i = 0; i < 3; i++) parts.push({ geo: cyl(0.08, 0.065, 0.07, 7).translate(1.38, 0.035 + i * 0.05, -0.62), color: PAL.basket });
  return merge(parts);
}

/**
 * The winery: a long stone press house under tiles at the back, its wide
 * door to the yard, and a little lean-to on its side where the amphorae are
 * sealed. The treading vat stands on its own ground in the yard
 * (WINERY_PIECES); baskets of grapes and the amphorae of wine are drawn
 * with its store.
 */
function wineryModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  const x0 = -1.42;
  const x1 = -0.3;
  const z0 = -1.4;
  const z1 = 0.42;
  parts.push({ geo: slab(x0 - 0.05, z0 - 0.05, x1 + 0.05, z1 + 0.05, -1.2, 0.08), color: PAL.plinth });
  parts.push({ geo: slab(x0, z0, x1, z1, 0.08, 0.78), color: PAL.vatStone });
  parts.push({ geo: slab(x0 - 0.01, z0 - 0.01, x1 + 0.01, z1 + 0.01, 0.08, 0.18), color: PAL.pressStoneDark });
  // A band of wine-red under the eaves, the winery's mark.
  parts.push({ geo: slab(x0 - 0.008, z0 - 0.008, x1 + 0.008, z1 + 0.008, 0.7, 0.76), color: PAL.wineSeal });
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  parts.push({ geo: prism(z1 - z0 + 0.2, (x1 - x0) / 2 + 0.12, 0.38).rotateY(Math.PI / 2).translate(cx, 0.78, cz), color: PAL.roofTile });
  parts.push({ geo: cyl(0.03, 0.03, z1 - z0 + 0.22, 5).rotateX(Math.PI / 2).translate(cx, 1.16, cz), color: PAL.roofTileDark });
  for (const side of [-1, 1]) {
    const y = 0.78 + 0.38 * 0.5;
    const x = cx + side * ((x1 - x0) / 2 + 0.12) * 0.5;
    parts.push({ geo: new THREE.BoxGeometry(0.03, 0.02, z1 - z0 + 0.2).rotateZ(side * 0.55).translate(x, y + 0.012, cz), color: PAL.roofTileDark });
  }
  // The wide double door to the yard, a step, two high windows.
  parts.push({ geo: slab(x1, -0.92, x1 + 0.02, -0.5, 0.08, 0.6), color: PAL.door });
  parts.push({ geo: slab(x1 + 0.02, -0.96, x1 + 0.18, -0.46, -1.2, 0.04), color: PAL.pressStoneDark });
  parts.push(...windowX(x1 + 0.005, 0.56, -0.05), ...windowX(x1 + 0.005, 0.56, -1.22));
  // The lean-to on the far side: posts and a tiled slope over a bench of empty amphorae.
  for (const x of [-1.3, -0.42]) parts.push({ geo: cyl(0.025, 0.03, 0.56, 5).translate(x, 0.28, 1.32), color: PAL.wood });
  parts.push({ geo: new THREE.BoxGeometry(1.08, 0.04, 0.96).rotateX(-0.32).translate(-0.86, 0.66, 0.94), color: PAL.roofTile });
  parts.push({ geo: slab(-1.3, 0.62, -0.42, 1.22, -1.2, 0.08), color: PAL.paving });
  return merge(parts);
}

/** The winery's treading vat, centred: a raised stone vat full of purple must, a step up to it, its spout into a sunken collecting basin before it. Its foot runs down into the slope. */
function treadingVat(): THREE.BufferGeometry {
  const parts: Part[] = [];
  parts.push({ geo: slab(-0.42, -0.42, 0.42, 0.42, -0.6, 0.22), color: PAL.vatStone });
  parts.push({ geo: slab(-0.44, -0.44, 0.44, 0.44, 0.22, 0.27), color: PAL.pressStoneDark });
  parts.push({ geo: slab(-0.36, -0.36, 0.36, 0.36, 0.22, 0.275), color: PAL.wineDark });
  // Trodden grapes heaped in the must.
  parts.push({ geo: lumpy(new THREE.BoxGeometry(0.5, 0.05, 0.5, 2, 1, 2), 0.35, 841).translate(-0.04, 0.29, 0.02), color: PAL.grapeRipe });
  // The step at the back and the spout and basin at the front.
  parts.push({ geo: slab(-0.56, -0.2, -0.42, 0.2, -0.6, 0.11), color: PAL.pressStoneDark });
  parts.push({ geo: slab(0.42, -0.04, 0.54, 0.04, 0.13, 0.17), color: PAL.pressStoneDark });
  parts.push({ geo: cyl(0.16, 0.16, 0.3, 9).translate(0.66, -0.12, 0), color: PAL.pressStoneDark });
  parts.push({ geo: cyl(0.13, 0.13, 0.04, 9).translate(0.66, 0.02, 0), color: PAL.wineDark });
  // A pole on the post at the back corner, for the treaders to hold.
  parts.push({ geo: cyl(0.014, 0.014, 0.7, 4).translate(-0.38, 0.6, -0.38), color: PAL.wood });
  parts.push({ geo: cyl(0.01, 0.01, 0.76, 4).rotateX(Math.PI / 2).translate(-0.38, 0.92, 0), color: PAL.wood });
  parts.push({ geo: cyl(0.014, 0.014, 0.7, 4).translate(-0.38, 0.6, 0.38), color: PAL.wood });
  return merge(parts);
}

/** An amphora of wine standing in the yard (pointed foot sunk in the ground), two handles, a dark wine-red seal. */
function wineAmphoraModel(): THREE.BufferGeometry {
  const body = [
    new THREE.Vector2(0.0, -0.02),
    new THREE.Vector2(0.025, 0.02),
    new THREE.Vector2(0.065, 0.1),
    new THREE.Vector2(0.06, 0.17),
    new THREE.Vector2(0.025, 0.21),
    new THREE.Vector2(0.022, 0.25),
    new THREE.Vector2(0.03, 0.26),
  ];
  const parts: Part[] = [{ geo: new THREE.LatheGeometry(body, 7), color: PAL.amphora }];
  parts.push({ geo: cyl(0.028, 0.025, 0.02, 6).translate(0, 0.265, 0), color: PAL.wineSeal });
  for (const z of [-1, 1]) parts.push({ geo: new THREE.TorusGeometry(0.035, 0.008, 3, 6, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2 - 0.3).translate(0, 0.205, z * 0.035), color: PAL.amphoraDark });
  return merge(parts);
}

/** A bale of fleece on the ground: a lumpy cream bundle with a rope band. */
function baleModel(): THREE.BufferGeometry {
  return merge([
    { geo: lumpy(new THREE.IcosahedronGeometry(0.1, 0), 0.2, 851).scale(1.25, 0.72, 1).translate(0, 0.07, 0), color: PAL.wool },
    { geo: lumpy(new THREE.IcosahedronGeometry(0.06, 0), 0.25, 852).scale(1.2, 0.6, 1).translate(0.03, 0.12, 0.02), color: PAL.woolShade },
    { geo: cyl(0.094, 0.094, 0.022, 6).scale(1.2, 1, 0.98).translate(0, 0.07, 0), color: PAL.rope },
  ]);
}

/** The fold: a round dry-stone wall behind the hut and the shelter (centre and radius in the pasture's frame), open at the front for the flock. */
const FOLD_X = -0.5;
const FOLD_Z = 0.0;
const FOLD_R = 0.82;
const PASTURE_PIECES: Placed[] = (() => {
  const out: Placed[] = [];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    // The gap faces the front (+x), towards the road and the open grass.
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.4) continue;
    out.push({ piece: 'terrace', lx: FOLD_X + Math.cos(a) * FOLD_R, lz: FOLD_Z + Math.sin(a) * FOLD_R, yaw: -(a + Math.PI / 2), len: ((2 * Math.PI * FOLD_R) / n / TERRACE) * 1.05, r: 0.25 });
  }
  out.push({ piece: 'sheeptrough', lx: 0.55, lz: 0.05, yaw: Math.PI / 2, len: 1, r: 0.25 });
  return out;
})();
/** The vineyard's lengths of vine, row by row. */
const VINEYARD_PIECES: Placed[] = VINE_ROWS.flatMap((lz) => VINE_XS.map((lx): Placed => ({ piece: 'vinerow', lx, lz, yaw: 0, len: 1, r: VINE_LEN / 2, rz: 0.1 })));
/** The winery's treading vat in the yard. */
const WINERY_PIECES: Placed[] = [{ piece: 'vat', lx: 0.4, lz: -0.55, yaw: 0, len: 1, r: 0.45 }];

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// The ship comes in (slice 13).

/**
 * The trading post, its front (+x) to the sea: a paved stone quay on a
 * foundation that runs down into the slope and the water, a whitewashed
 * counting house with a tiled roof and a pennant at the back corner, a
 * wooden crane by the jetty's mouth, stone bollards along the edge and a
 * coil of rope. The goods waiting for the ship are drawn with its stock.
 */
const QUAY_CRANE: [number, number] = [1.18, 1.12];
function tradingModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  // The quay: its foundation runs down into the slope and the sea; a darker kerb along its edges.
  parts.push({ geo: slab(-1.49, -1.49, 1.49, 1.49, -1.6, 0.05), color: PAL.quayStone });
  for (const [x0, z0, x1, z1] of [[1.36, -1.49, 1.5, 1.49], [-1.49, -1.5, 1.5, -1.38], [-1.49, 1.38, 1.5, 1.5]]) parts.push({ geo: slab(x0, z0, x1, z1, 0.05, 0.1), color: PAL.quayStoneDark });
  // Courses in the seaward face.
  for (let k = 0; k < 4; k++) parts.push({ geo: slab(1.49, -1.5, 1.52, 1.5, -0.32 - k * 0.32, -0.3 - k * 0.32), color: PAL.quayStoneDark });
  // Paving joints across the quay.
  for (let k = 0; k < 6; k++) parts.push({ geo: slab(-0.35 + k * 0.29, -1.38, -0.34 + k * 0.29, 1.38, 0.05, 0.056), color: PAL.pavingDark });
  // The counting house along the landward side (local -z), its door and windows to the quay: whitewashed, a tiled ridge roof.
  const hx0 = -1.42;
  const hx1 = 0.22;
  const hz0 = -1.42;
  const hz1 = -0.64;
  parts.push({ geo: slab(hx0 - 0.03, hz0 - 0.03, hx1 + 0.03, hz1 + 0.03, 0.05, 0.12), color: PAL.plinth });
  parts.push({ geo: slab(hx0, hz0, hx1, hz1, 0.12, 0.84), color: PAL.whitewash });
  parts.push({ geo: slab(hx0 - 0.01, hz0 - 0.01, hx1 + 0.01, hz1 + 0.01, 0.8, 0.84), color: PAL.whitewashShade });
  parts.push({ geo: prism(hx1 - hx0 + 0.18, (hz1 - hz0) / 2 + 0.1, 0.32).translate((hx0 + hx1) / 2, 0.84, (hz0 + hz1) / 2), color: PAL.roofTile });
  for (let k = 0; k < 8; k++) {
    const x = hx0 - 0.04 + (k * (hx1 - hx0 + 0.08)) / 7;
    for (const side of [-1, 1]) {
      parts.push({ geo: cyl(0.016, 0.016, 0.52, 4).rotateX(Math.PI / 2).rotateX(side * 0.55).translate(x, 1.0, (hz0 + hz1) / 2 + side * 0.24), color: PAL.roofTileDark });
    }
  }
  parts.push({ geo: cyl(0.03, 0.03, hx1 - hx0 + 0.2, 5).rotateZ(Math.PI / 2).translate((hx0 + hx1) / 2, 1.16, (hz0 + hz1) / 2), color: PAL.roofTileDark });
  const toQuay = (ps: Part[], x: number, z: number): Part[] => ps.map((q) => ({ ...q, geo: q.geo.rotateY(-Math.PI / 2).translate(x, 0, z) }));
  parts.push({ geo: slab(-0.72, hz1, -0.46, hz1 + 0.02, 0.12, 0.6), color: PAL.door });
  parts.push(...toQuay(windowX(0, 0.5, 0), -1.1, hz1 + 0.005), ...toQuay(windowX(0, 0.5, 0), -0.1, hz1 + 0.005));
  // Its pennant, on a pole at the seaward gable: the sail's red, so the post reads from afar.
  parts.push({ geo: cyl(0.014, 0.016, 0.95, 4).translate(hx1 + 0.06, 1.0, (hz0 + hz1) / 2), color: PAL.pole });
  parts.push({ geo: new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.18, 0), new THREE.Vector3(0.34, -0.08, 0)]).translate(hx1 + 0.07, 1.46, (hz0 + hz1) / 2), color: PAL.sailStripe });
  // A bench and a pair of scales by the door, under a little awning.
  parts.push({ geo: new THREE.BoxGeometry(0.62, 0.035, 0.34).rotateX(0.3).translate(-0.28, 0.66, hz1 + 0.15), color: PAL.thatch });
  for (const x of [-0.56, 0.0]) parts.push({ geo: cyl(0.016, 0.018, 0.6, 4).translate(x, 0.33, hz1 + 0.3), color: PAL.wood });
  parts.push({ geo: slab(-0.4, hz1 + 0.04, 0.0, hz1 + 0.22, 0.05, 0.25), color: PAL.wood });
  parts.push({ geo: cyl(0.008, 0.008, 0.2, 3).translate(-0.2, 0.35, hz1 + 0.13), color: PAL.woodDark });
  parts.push({ geo: cyl(0.004, 0.004, 0.18, 3).rotateZ(Math.PI / 2).translate(-0.2, 0.45, hz1 + 0.13), color: PAL.woodDark });
  for (const x of [-0.28, -0.12]) parts.push({ geo: cyl(0.035, 0.02, 0.012, 6).translate(x, 0.37, hz1 + 0.13), color: PAL.amphoraDark });
  // The crane by the jetty's mouth: a post on a stone footing, a jib leaning out over the water, its rope and a hook.
  const [cx, cz] = QUAY_CRANE;
  parts.push({ geo: cyl(0.12, 0.14, 0.12, 6).translate(cx, 0.11, cz), color: PAL.quayStoneDark });
  parts.push({ geo: cyl(0.045, 0.055, 1.25, 6).translate(cx, 0.72, cz), color: PAL.mast });
  const jib = 1.15;
  const tilt = 0.75;
  parts.push({ geo: cyl(0.03, 0.04, jib, 5).translate(0, jib / 2, 0).rotateZ(-tilt).translate(cx, 1.05, cz), color: PAL.mast });
  const tipX = cx + Math.sin(tilt) * jib;
  const tipY = 1.05 + Math.cos(tilt) * jib;
  parts.push({ geo: cyl(0.006, 0.006, 0.62, 3).translate(tipX, tipY - 0.31, cz), color: PAL.rope });
  parts.push({ geo: new THREE.TorusGeometry(0.03, 0.008, 3, 6, Math.PI * 1.4).translate(tipX, tipY - 0.64, cz), color: PAL.woodDark });
  // A back-stay from the jib's tip to the post's foot, and a winch drum.
  const stay = Math.hypot(tipX - cx + 0.1, tipY - 0.3);
  parts.push({ geo: cyl(0.005, 0.005, stay, 3).translate(0, stay / 2, 0).rotateZ(-Math.atan2(tipX - cx + 0.1, tipY - 0.3)).translate(cx - 0.1, 0.3, cz), color: PAL.rope });
  parts.push({ geo: cyl(0.06, 0.06, 0.2, 7).rotateX(Math.PI / 2).translate(cx - 0.15, 0.3, cz), color: PAL.wood });
  // Bollards along the seaward edge, either side of the jetty, and a coil of rope by one.
  for (const z of [-0.62, 0.62]) {
    parts.push({ geo: cyl(0.055, 0.065, 0.16, 6).translate(1.3, 0.13, z), color: PAL.stoneBlockShade });
    parts.push({ geo: cyl(0.07, 0.07, 0.03, 6).translate(1.3, 0.22, z), color: PAL.stoneBlockShade });
  }
  parts.push({ geo: new THREE.TorusGeometry(0.075, 0.022, 4, 8).rotateX(Math.PI / 2).translate(1.12, 0.07, -0.85), color: PAL.rope });
  parts.push({ geo: new THREE.TorusGeometry(0.05, 0.02, 4, 7).rotateX(Math.PI / 2).translate(1.12, 0.1, -0.85), color: PAL.rope });
  return merge(parts);
}

/**
 * The trading post's jetty, `len` long, from its quay's seaward edge (local
 * x 1.5) out along +x at the quay's floor: a plank deck on pairs of piles
 * running down into the sea, a bollard at each corner of its end where the
 * ship's lines go.
 */
function jettyModel(len: number): THREE.BufferGeometry {
  const parts: Part[] = [];
  const x0 = 1.42;
  const x1 = 1.5 + len;
  const hw = 0.3;
  // The deck: planks across it, a touch uneven in colour.
  const planks = Math.max(4, Math.round((x1 - x0) / 0.12));
  for (let k = 0; k < planks; k++) {
    const a = x0 + (k * (x1 - x0)) / planks;
    const b = x0 + ((k + 1) * (x1 - x0)) / planks - 0.012;
    parts.push({ geo: slab(a, -hw, b, hw, -0.01, 0.045), color: k % 3 === 1 ? PAL.wood : PAL.jettyPlank });
  }
  // Two beams under the planks, the length of it.
  for (const z of [-hw + 0.05, hw - 0.05]) parts.push({ geo: slab(x0, z - 0.035, x1, z + 0.035, -0.09, -0.01), color: PAL.jettyPile });
  // Piles in pairs, about every 0.8, down into the water and the sea floor; a cross-brace on each pair.
  const pairs = Math.max(2, Math.round((x1 - x0) / 0.8) + 1);
  for (let k = 0; k < pairs; k++) {
    const x = x0 + 0.15 + (k * (x1 - x0 - 0.25)) / (pairs - 1);
    for (const z of [-hw + 0.02, hw - 0.02]) parts.push({ geo: cyl(0.04, 0.045, 3.2, 5).translate(x, -1.6, z), color: PAL.jettyPile });
    parts.push({ geo: slab(x - 0.02, -hw, x + 0.02, hw, -0.24, -0.16), color: PAL.jettyPile });
  }
  // Bollards at the end, and a rail of rope posts along one side.
  for (const z of [-hw + 0.06, hw - 0.06]) parts.push({ geo: cyl(0.035, 0.045, 0.16, 5).translate(x1 - 0.08, 0.12, z), color: PAL.jettyPile });
  return merge(parts);
}

const UP = new THREE.Vector3(0, 1, 0);
/** A ham laid on its side (applied after its placing). */
const LIE = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
const RISE_SECONDS = 0.9;
type WorkKind = 'farm' | 'granary' | 'agora' | 'theatre' | 'lodge' | 'dairy' | 'grove' | 'press' | 'storehouse' | 'pasture' | 'vineyard' | 'winery' | 'trading';
const WORK_KINDS: ReadonlySet<string> = new Set<WorkKind>(['farm', 'granary', 'agora', 'theatre', 'lodge', 'dairy', 'grove', 'press', 'storehouse', 'pasture', 'vineyard', 'winery', 'trading']);
const isWork = (b: Building): b is Building & { kind: WorkKind } => WORK_KINDS.has(b.kind);

/** How many stooks, sacks or loaves show for a building's stock. */
const STOOKS = 6;
const SACKS = 14;
const LOAVES = 6;
/** Hams on a lodge's rack, in a granary's yard, on the stall; cheeses on a dairy's bench, in a granary, on the stall. */
const RACK = 6;
const BENCH = 8;
const STORE_HAMS = 6;
const STORE_CHEESES = 6;
const STALL_HAMS = 3;
const STALL_CHEESES = 3;
const shown = (stock: number, cap: number, most: number): number => (stock <= 0 ? 0 : Math.max(1, Math.min(most, Math.ceil((stock / cap) * most))));
/**
 * The stall's baskets look full from about two-thirds of its stock down (the
 * porter tops it up from half), and thin out below that, so a working stall
 * reads as a well-stocked one.
 */
const STALL_FULL = STALL_CAP * 0.65;
const STALL_FULL_MEAT = STALL_ROOM[1] * 0.65;
const STALL_FULL_CHEESE = STALL_ROOM[2] * 0.65;
const STALL_FULL_OIL = GOOD_STALL_ROOM * 0.65;
const STALL_FULL_FLEECE = stallRoom(FLEECE) * 0.65;
const STALL_FULL_WINE = stallRoom(WINE) * 0.65;
/** Baskets of olives by a grove's hut and at a press; jars by a press's door, in a storehouse's yard, on the oil stall. */
const GROVE_BASKETS = 6;
const PRESS_BASKETS = 5;
const PRESS_JARS = 8;
const STORE_JARS = 16;
const STALL_JARS = 4;
/** Bales by a pasture's shelter, in a storehouse's yard, on the fleece stall; amphorae at a winery, in a storehouse's yard, on the wine stall; baskets of grapes by a vineyard's hut and at a winery. */
const PASTURE_BALES = 6;
const STORE_BALES = 12;
const STALL_BALES = 3;
const WINERY_AMPHORAE = 10;
const STORE_AMPHORAE = 12;
const STALL_AMPHORAE = 3;
const VINEYARD_BASKETS = 6;
const WINERY_BASKETS = 5;
/** What shows of each good waiting on the trading post's quay for the ship: sacks, hams, cheeses, jars, bales, amphorae. */
const QUAY_SACKS = 12;
const QUAY_HAMS = 6;
const QUAY_CHEESES = 6;
const QUAY_JARS = 8;
const QUAY_BALES = 6;
const QUAY_AMPHORAE = 8;
/** The grapes' colour on the vine, from just set (green) to ripe (purple). */
const GRAPE_GREEN = new THREE.Color(PAL.grapeGreen);
const GRAPE_RIPE = new THREE.Color(PAL.grapeRipe);
/** The olives' colour on the tree, from just set (green) to ripe (near black). */
const FRUIT_GREEN = new THREE.Color(PAL.oliveGreen);
const FRUIT_RIPE = new THREE.Color(PAL.oliveRipe);
/** The wheat's look changes in this many steps as it grows. */
const GROWTH_STEPS = 16;

/**
 * The farm, granary and agora, instanced per chunk like the homes, with the
 * parts that show how they're doing: a farm's wheat growing green to gold
 * and its stooks in the yard after harvest, a granary's sacks, the agora's
 * loaves on the stall. A chunk is refilled only when one of its buildings
 * changes how it looks.
 */
export class Works {
  readonly group = new THREE.Group();
  /**
   * The buildings themselves (farm, granary, agora and its awning, theatre,
   * lodge and dairy) and the lodges' and dairies' yard pieces, merged into
   * one mesh per chunk: one draw (and one shadow draw) however many kinds it
   * holds. Rebuilt only when one of them is placed, cleared, turned or rising.
   */
  private readonly merged: MergedChunks;
  private readonly models: Record<WorkKind | 'awning' | 'oilstall' | 'fleecestall' | 'winestall' | Piece, THREE.BufferGeometry>;
  private readonly wheat: ChunkedInstances;
  private readonly stooks: ChunkedInstances;
  private readonly sacks: ChunkedInstances;
  private readonly loaves: ChunkedInstances;
  private readonly hams: ChunkedInstances;
  private readonly cheeses: ChunkedInstances;
  private readonly fruit: ChunkedInstances;
  private readonly baskets: ChunkedInstances;
  private readonly jars: ChunkedInstances;
  private readonly bales: ChunkedInstances;
  private readonly amphorae: ChunkedInstances;
  private readonly grapes: ChunkedInstances;
  private readonly grapeBaskets: ChunkedInstances;
  private readonly all: ChunkedInstances[];
  private byChunk = new Map<number, Building[]>();
  private seen = new Map<number, { sig: string; key: number }>();
  private rising = new Map<number, number>();
  /** The ground under each lodge's and dairy's yard pieces, by building (see fill). */
  private pieceGround = new Map<number, { yaw: number; x: number; z: number; y: Map<Placed, number> }>();
  private state: SimState | null = null;
  private lastState: SimState | null = null;
  private time = 0;
  private first = true;
  private readonly green = new THREE.Color(PAL.wheatGreen);
  private readonly gold = new THREE.Color(PAL.wheatGold);
  private readonly stubble = new THREE.Color(PAL.wheatStubble);
  /** Chunks refilled by the last update (for the measuring script). */
  lastRefilled = 0;

  constructor(private readonly map: CoastMap) {
    this.group.name = 'works';
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
    const opts = { castShadow: true, receiveShadow: true, colors: false };
    this.merged = new MergedChunks(this.group, mat, 'works-merged');
    const a = agoraModel();
    this.models = {
      farm: farmModel(),
      granary: granaryModel(),
      agora: a.stone,
      awning: a.awning,
      theatre: theatreModel(),
      lodge: lodgeModel(),
      dairy: dairyModel(),
      panel: wattlePanel(),
      shed: goatShed(),
      hayrack: hayRack(),
      trough: trough(),
      rack: dryingRack(),
      hide: hideFrame(),
      firepit: firePit(),
      grove: groveHut(),
      press: pressModel(),
      storehouse: storehouseModel(),
      oilstall: oilStallModel(),
      olivetree: groveTree(false),
      oliveladder: groveTree(true),
      terrace: terraceWall(),
      basin: crushingBasin(),
      beampress: beamPress(),
      yardwall: yardWall(),
      gate: storeGate(),
      pasture: pastureModel(),
      vineyard: vineyardModel(),
      winery: wineryModel(),
      fleecestall: fleeceStallModel(),
      winestall: wineStallModel(),
      sheeptrough: sheepTrough(),
      vinerow: vineRow(),
      vat: treadingVat(),
      trading: tradingModel(),
    };
    // The wheat takes its colour per row (green to gold); it casts no shadow of its own (too fine to read, and costly).
    this.wheat = new ChunkedInstances('wheat', wheatRow(), mat, HOME_CHUNK, { castShadow: false, receiveShadow: true, colors: true });
    this.stooks = new ChunkedInstances('stooks', stook(), mat, HOME_CHUNK, opts);
    this.sacks = new ChunkedInstances('sacks', sack(), mat, HOME_CHUNK, opts);
    this.loaves = new ChunkedInstances('loaves', loaf(), mat, HOME_CHUNK, { castShadow: false, receiveShadow: true, colors: false });
    // Hams and cheeses are few and far between (a lodge, a dairy, the granaries and stalls): one batch each for the whole map.
    const ALL = map.size;
    this.hams = new ChunkedInstances('hams', ham(), mat, ALL, { castShadow: false, receiveShadow: true, colors: false });
    this.cheeses = new ChunkedInstances('cheeses', cheeseWheel(), mat, ALL, { castShadow: false, receiveShadow: true, colors: false });
    // Olives on the trees (coloured as they ripen), baskets of olives and jars of oil: few, one batch each for the whole map.
    this.fruit = new ChunkedInstances('olives', groveFruit(), mat, ALL, { castShadow: false, receiveShadow: true, colors: true });
    this.baskets = new ChunkedInstances('olive-baskets', oliveBasket(), mat, ALL, { castShadow: false, receiveShadow: true, colors: false });
    this.jars = new ChunkedInstances('oil-jars', oilJarModel(), mat, ALL, { castShadow: true, receiveShadow: true, colors: false });
    // Bales of fleece, amphorae of wine, grapes on the vines (coloured as they ripen) and baskets of grapes: few, one batch each too.
    this.bales = new ChunkedInstances('fleece-bales', baleModel(), mat, ALL, { castShadow: true, receiveShadow: true, colors: false });
    this.amphorae = new ChunkedInstances('wine-amphorae', wineAmphoraModel(), mat, ALL, { castShadow: true, receiveShadow: true, colors: false });
    this.grapes = new ChunkedInstances('grapes', vineGrapes(), mat, ALL, { castShadow: false, receiveShadow: true, colors: true });
    this.grapeBaskets = new ChunkedInstances('grape-baskets', grapeBasket(), mat, ALL, { castShadow: false, receiveShadow: true, colors: false });
    this.all = [this.wheat, this.stooks, this.sacks, this.loaves, this.hams, this.cheeses, this.fruit, this.baskets, this.jars, this.bales, this.amphorae, this.grapes, this.grapeBaskets];
    for (const c of this.all) this.group.add(c.group);
  }

  private key(b: Building): number {
    return this.wheat.key(b.x + 1.5, b.z + 1.5);
  }

  /** What a building looks like now: its facing and the state of its crop or stock. */
  /** Which way a building faces: its road (local +x towards it), or for the trading post, its jetty and the sea. */
  private yawOf(s: SimState, b: Building): number {
    if (b.kind === 'trading') {
      const berth = berthOf(this.map, b);
      if (berth) return Math.atan2(-berth.oz, berth.ox);
    }
    return facingOf(s, this.map.size, b);
  }

  /** The trading post's jetty for a length (a few posts in a game: kept by length). */
  private jetties = new Map<string, THREE.BufferGeometry>();
  private jetty(len: number): THREE.BufferGeometry {
    const k = len.toFixed(2);
    let g = this.jetties.get(k);
    if (!g) this.jetties.set(k, (g = jettyModel(len)));
    return g;
  }

  private sig(s: SimState, b: Building): string {
    const face = this.yawOf(s, b).toFixed(2);
    if (b.kind === 'trading') {
      return `trading:${face}:${shown(held(b, WHEAT), QUAY_ROOM, QUAY_SACKS)}:${shown(held(b, MEAT), QUAY_ROOM, QUAY_HAMS)}:${shown(held(b, CHEESE), QUAY_ROOM, QUAY_CHEESES)}:${shown(held(b, OIL), QUAY_ROOM, QUAY_JARS)}:${shown(held(b, FLEECE), QUAY_ROOM, QUAY_BALES)}:${shown(held(b, WINE), QUAY_ROOM, QUAY_AMPHORAE)}`;
    }
    if (b.kind === 'farm') {
      const g = Math.floor((b.growth / GROW) * GROWTH_STEPS);
      return `farm:${face}:${g}:${rateOf(b) > 0 ? 1 : 0}:${shown(b.stock, BARN, STOOKS)}`;
    }
    if (b.kind === 'granary') return `granary:${face}:${shown(b.stock, GRANARY_CAP, SACKS)}:${shown(b.meat, GRANARY_ROOM[1], STORE_HAMS)}:${shown(b.cheese, GRANARY_ROOM[2], STORE_CHEESES)}`;
    if (b.kind === 'theatre') return `theatre:${face}`;
    if (b.kind === 'lodge') return `lodge:${face}:${shown(b.meat, LODGE_STORE, RACK)}`;
    if (b.kind === 'dairy') return `dairy:${face}:${shown(b.cheese, DAIRY_STORE, BENCH)}`;
    if (b.kind === 'grove') return `grove:${face}:${stageOf(b, MAKERS.grove!)}:${shown(held(b, OLIVES), GROVE_STORE, GROVE_BASKETS)}`;
    if (b.kind === 'press') return `press:${face}:${shown(held(b, OLIVES), PRESS_OLIVES, PRESS_BASKETS)}:${shown(held(b, OIL), PRESS_STORE, PRESS_JARS)}`;
    if (b.kind === 'storehouse') return `storehouse:${face}:${shown(held(b, OIL), STOREHOUSE_OIL, STORE_JARS)}:${shown(held(b, FLEECE), STOREHOUSE_FLEECE, STORE_BALES)}:${shown(held(b, WINE), STOREHOUSE_WINE, STORE_AMPHORAE)}`;
    if (b.kind === 'pasture') return `pasture:${face}:${shown(held(b, FLEECE), PASTURE_STORE, PASTURE_BALES)}`;
    if (b.kind === 'vineyard') return `vineyard:${face}:${stageOf(b, MAKERS.vineyard!)}:${shown(held(b, GRAPES), VINEYARD_STORE, VINEYARD_BASKETS)}`;
    if (b.kind === 'winery') return `winery:${face}:${shown(held(b, GRAPES), WINERY_GRAPES, WINERY_BASKETS)}:${shown(held(b, WINE), WINERY_STORE, WINERY_AMPHORAE)}`;
    const oil = hasStall(b, OIL) ? `:oil${shown(held(b, OIL), STALL_FULL_OIL, STALL_JARS)}` : '';
    const fleece = hasStall(b, FLEECE) ? `:fleece${shown(held(b, FLEECE), STALL_FULL_FLEECE, STALL_BALES)}` : '';
    const wine = hasStall(b, WINE) ? `:wine${shown(held(b, WINE), STALL_FULL_WINE, STALL_AMPHORAE)}` : '';
    return `agora:${face}:${shown(b.stock, STALL_FULL, LOAVES)}:${shown(b.meat, STALL_FULL_MEAT, STALL_HAMS)}:${shown(b.cheese, STALL_FULL_CHEESE, STALL_CHEESES)}${oil}${fleece}${wine}`;
  }

  private seenRev = -1;
  private seenLooks = -1;

  /**
   * Bring the drawing up to date. Only looks again when buildings or roads
   * changed (rev) or a crop or a stock did (looks), or while something is rising into place.
   */
  update(s: SimState, time: number): void {
    this.state = s;
    this.time = time;
    if (s.rev === this.seenRev && s.looks === this.seenLooks && this.rising.size === 0 && s === this.lastState) {
      this.lastRefilled = 0;
      return;
    }
    this.seenRev = s.rev;
    this.seenLooks = s.looks;
    this.lastState = s;
    const animate = !this.first;
    this.first = false;
    const next = new Map<number, Building[]>();
    const dirty = new Set<number>();
    const now = new Map<number, { sig: string; key: number }>();
    for (const b of s.buildings) {
      if (!isWork(b)) continue;
      const k = this.key(b);
      const list = next.get(k);
      if (list) list.push(b);
      else next.set(k, [b]);
      const sig = this.sig(s, b);
      now.set(b.id, { sig, key: k });
      const was = this.seen.get(b.id);
      if (!was || was.sig !== sig) {
        dirty.add(k);
        if (animate && !was) this.rising.set(b.id, time);
      }
    }
    for (const [id, was] of this.seen) {
      if (now.has(id)) continue;
      dirty.add(was.key);
      this.pieceGround.delete(id);
    }
    for (const [id, t0] of this.rising) {
      if (time - t0 > RISE_SECONDS) this.rising.delete(id);
      const at = now.get(id);
      if (at) dirty.add(at.key);
    }
    this.seen = now;
    this.byChunk = next;
    for (const k of dirty) this.fill(k);
    if (dirty.size) {
      this.flush(this.hams, this.hamsBy);
      this.flush(this.cheeses, this.cheesesBy);
      this.flush(this.baskets, this.basketsBy);
      this.flush(this.jars, this.jarsBy);
      this.flush(this.bales, this.balesBy);
      this.flush(this.amphorae, this.amphoraeBy);
      this.flush(this.grapeBaskets, this.grapeBasketsBy);
      this.flushColoured(this.fruit, this.fruitBy);
      this.flushColoured(this.grapes, this.grapesBy);
    }
    this.lastRefilled = dirty.size;
  }

  /** Hams and cheeses placed by each chunk's last fill, drawn in one batch each for the whole map. */
  private hamsBy = new Map<number, THREE.Matrix4[]>();
  private cheesesBy = new Map<number, THREE.Matrix4[]>();
  private basketsBy = new Map<number, THREE.Matrix4[]>();
  private jarsBy = new Map<number, THREE.Matrix4[]>();
  private balesBy = new Map<number, THREE.Matrix4[]>();
  private amphoraeBy = new Map<number, THREE.Matrix4[]>();
  private grapeBasketsBy = new Map<number, THREE.Matrix4[]>();
  /** Each grove tree's olives and each length of vine's grapes, and their colour, by chunk. */
  private fruitBy = new Map<number, Array<{ m: THREE.Matrix4; c: THREE.Color }>>();
  private grapesBy = new Map<number, Array<{ m: THREE.Matrix4; c: THREE.Color }>>();

  private collect(into: Map<number, THREE.Matrix4[]>, key: number, n: number, write: (i: number, m: THREE.Matrix4) => void): void {
    if (n === 0) {
      into.delete(key);
      return;
    }
    const out: THREE.Matrix4[] = [];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Matrix4();
      write(i, m);
      out.push(m);
    }
    into.set(key, out);
  }

  private flush(inst: ChunkedInstances, from: Map<number, THREE.Matrix4[]>): void {
    const all: THREE.Matrix4[] = [];
    for (const ms of from.values()) for (const m of ms) all.push(m);
    inst.set(0, 0, all.length, (i, m) => void m.copy(all[i]));
  }

  private flushColoured(inst: ChunkedInstances, from: Map<number, Array<{ m: THREE.Matrix4; c: THREE.Color }>>): void {
    const all: Array<{ m: THREE.Matrix4; c: THREE.Color }> = [];
    for (const xs of from.values()) for (const x of xs) all.push(x);
    inst.set(0, 0, all.length, (i, m, c) => {
      m.copy(all[i].m);
      c.copy(all[i].c);
    });
  }

  private fill(key: number): void {
    const s = this.state;
    if (!s) return;
    const map = this.map;
    const list = this.byChunk.get(key) ?? [];
    const kx = ((key % 1024) - 512 + 0.5) * HOME_CHUNK;
    const kz = (Math.floor(key / 1024) - 512 + 0.5) * HOME_CHUNK;
    const farms = list.filter((b) => b.kind === 'farm');
    const granaries = list.filter((b) => b.kind === 'granary');
    const agoras = list.filter((b) => b.kind === 'agora');
    const lodges = list.filter((b) => b.kind === 'lodge');
    const dairies = list.filter((b) => b.kind === 'dairy');
    const groves = list.filter((b) => b.kind === 'grove');
    const presses = list.filter((b) => b.kind === 'press');
    const storehouses = list.filter((b) => b.kind === 'storehouse');
    const pastures = list.filter((b) => b.kind === 'pasture');
    const vineyards = list.filter((b) => b.kind === 'vineyard');
    const wineries = list.filter((b) => b.kind === 'winery');
    const posts = list.filter((b) => b.kind === 'trading');
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3();
    /** The lowest ground under a box at (lx, lz) of half-sizes (hx, hz) in a frame centred at (cx, cz) turned by yaw: its middle, corners and edge middles. */
    const lowest = (cx: number, cz: number, yaw: number, lx: number, lz: number, hx: number, hz: number, high = false): number => {
      const c = Math.cos(yaw);
      const sn = Math.sin(yaw);
      let y = high ? -Infinity : Infinity;
      for (const ax of [-1, 0, 1]) {
        for (const az of [-1, 0, 1]) {
          const x = lx + ax * hx;
          const z = lz + az * hz;
          const h = map.heightAt(cx + x * c + z * sn, cz - x * sn + z * c);
          y = high ? Math.max(y, h) : Math.min(y, h);
        }
      }
      return y;
    };
    // Each building's frame: its middle at the lowest of its footprint's middle (so nothing floats), turned to face its road.
    const frames = new Map<number, { x: number; y: number; z: number; yaw: number; k: number }>();
    const frame = (b: Building): { x: number; y: number; z: number; yaw: number; k: number } => {
      let f = frames.get(b.id);
      if (f) return f;
      const cx = b.x + 1.5;
      const cz = b.z + 1.5;
      const yaw = this.yawOf(s, b);
      let y: number;
      const foot = MAIN_FOOT[b.kind];
      const high = HIGH_FOOT.has(b.kind);
      if (foot) {
        // Levelled to the lowest (or highest) ground under its main building only (its yard pieces stand on their own).
        y = lowest(cx, cz, yaw, (foot[0] + foot[2]) / 2, (foot[1] + foot[3]) / 2, (foot[2] - foot[0]) / 2, (foot[3] - foot[1]) / 2, high);
      } else if (high) {
        y = lowest(cx, cz, yaw, 0, 0, 1.45, 1.45, true);
      } else {
        y = map.heightAt(cx, cz);
        for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) y = Math.min(y, map.heightAt(cx + dx, cz + dz));
      }
      const t0 = this.rising.get(b.id);
      let k = 1;
      if (t0 !== undefined) {
        const t = Math.min(1, (this.time - t0) / RISE_SECONDS);
        k = t < 1 ? Math.max(0.02, 1 - Math.pow(1 - t, 3) + Math.sin(t * Math.PI) * 0.1) : 1;
      }
      f = { x: cx, y: y + 0.01, z: cz, yaw, k };
      frames.set(b.id, f);
      return f;
    };
    const whole = (b: Building, m: THREE.Matrix4): void => {
      const f = frame(b);
      p.set(f.x, f.y, f.z);
      q.setFromAxisAngle(UP, f.yaw);
      sc.set(1, f.k, 1);
      m.compose(p, q, sc);
    };
    /** A part at (lx, lz) in a building's frame, standing on the ground there (true), at the building's floor (false) or at a given height. */
    const part = (b: Building, m: THREE.Matrix4, lx: number, lz: number, yaw: number, s3: [number, number, number], ownGround: boolean | number, lift = 0): void => {
      const f = frame(b);
      const c = Math.cos(f.yaw);
      const sn = Math.sin(f.yaw);
      const wx = f.x + lx * c + lz * sn;
      const wz = f.z - lx * sn + lz * c;
      const base = typeof ownGround === 'number' ? ownGround : ownGround ? map.heightAt(wx, wz) : f.y;
      p.set(wx, base + lift * f.k, wz);
      q.setFromAxisAngle(UP, f.yaw + yaw);
      sc.set(s3[0], s3[1] * f.k, s3[2]);
      m.compose(p, q, sc);
    };
    // The buildings and their yard pieces, merged (keyed by where each stands and how far it has risen).
    const items: MergedItem[] = [];
    const add = (b: Building, model: keyof Works['models'], m: THREE.Matrix4, tag: string): void => {
      const f = frame(b);
      items.push({ key: `${b.id}:${tag}:${f.yaw.toFixed(3)}:${f.k.toFixed(3)}`, geo: this.models[model], m });
    };
    for (const b of list) {
      const m = new THREE.Matrix4();
      whole(b, m);
      add(b, b.kind as WorkKind, m, b.kind);
      if (b.kind === 'agora') add(b, 'awning', m, 'awning');
      if (hasStall(b, OIL)) add(b, 'oilstall', m, 'oilstall');
      if (hasStall(b, FLEECE)) add(b, 'fleecestall', m, 'fleecestall');
      if (hasStall(b, WINE)) add(b, 'winestall', m, 'winestall');
      if (b.kind === 'trading') {
        // Its jetty, out from the quay's seaward edge to where the ship lies.
        const berth = berthOf(map, b);
        const f = frame(b);
        if (berth) items.push({ key: `${b.id}:jetty:${berth.len.toFixed(2)}:${f.yaw.toFixed(3)}:${f.k.toFixed(3)}`, geo: this.jetty(berth.len), m });
      }
    }
    // The yard pieces, each at the lowest ground under it (their posts and walls run down into the slope).
    // (Kept from fill to fill while the building stands and faces the same way: the ground doesn't change.)
    const pieceBase = (b: Building, pl: Placed): number => {
      const f = frame(b);
      let got = this.pieceGround.get(b.id);
      if (!got || got.yaw !== f.yaw || got.x !== f.x || got.z !== f.z) {
        got = { yaw: f.yaw, x: f.x, z: f.z, y: new Map() };
        this.pieceGround.set(b.id, got);
      }
      let y = got.y.get(pl);
      if (y === undefined) {
        y = lowest(f.x, f.z, f.yaw, pl.lx, pl.lz, pl.r, pl.rz ?? pl.r) + 0.01;
        got.y.set(pl, y);
      }
      return y;
    };
    const placed = new Map<Piece, Array<{ b: Building; pl: Placed }>>();
    for (const [list, layout] of [[lodges, LODGE_PIECES], [dairies, DAIRY_PIECES], [groves, GROVE_PIECES], [presses, PRESS_PIECES], [storehouses, STORE_PIECES], [pastures, PASTURE_PIECES], [vineyards, VINEYARD_PIECES], [wineries, WINERY_PIECES]] as Array<[Building[], Placed[]]>) {
      for (const b of list) {
        for (const pl of layout) {
          const at = placed.get(pl.piece);
          if (at) at.push({ b, pl });
          else placed.set(pl.piece, [{ b, pl }]);
        }
      }
    }
    for (const [name, at] of placed) {
      at.forEach(({ b, pl }, n) => {
        const m = new THREE.Matrix4();
        // A tree is scaled whole (len: its size); a length of fence or wall only along its run.
        const tree = pl.piece === 'olivetree' || pl.piece === 'oliveladder';
        part(b, m, pl.lx, pl.lz, pl.yaw, tree ? [pl.len, pl.len, pl.len] : [pl.len, 1, 1], pieceBase(b, pl));
        add(b, name, m, `${name}${n}`);
      });
    }
    this.merged.set(key, items);

    // The wheat: six rows across the field behind the yard, as tall and as golden as the crop is grown.
    const ROWS = 6;
    const rows: Array<{ b: Building; i: number }> = [];
    for (const b of farms) for (let i = 0; i < ROWS; i++) rows.push({ b, i });
    this.wheat.set(kx, kz, rows.length, (n, m, colour) => {
      const { b, i } = rows[n];
      const g = b.growth / GROW;
      const z = -1.18 + (i * 2.36) / (ROWS - 1);
      let h: number;
      if (g < 0.06) {
        // Just harvested (or never sown): a stubble of cut stalks.
        h = 0.06;
        colour.copy(this.stubble);
      } else {
        h = 0.08 + 0.3 * Math.min(1, g / 0.75);
        colour.copy(this.green).lerp(this.gold, Math.max(0, Math.min(1, (g - 0.5) / 0.4)));
      }
      // A touch of variety from row to row.
      colour.multiplyScalar(0.94 + 0.1 * hash2(b.id, i, 185));
      part(b, m, -0.5, z, 0, [1.82, h, 1.9], true, -0.02);
    });

    // Stooks on the threshing floor and round it, as many as the barn holds.
    const stookAt: Array<[number, number]> = [[0.98, 0.98], [0.72, 0.84], [1.22, 0.78], [0.8, 1.22], [1.2, 1.2], [0.98, 0.66]];
    const stooks: Array<{ b: Building; i: number }> = [];
    for (const b of farms) for (let i = 0; i < shown(b.stock, BARN, STOOKS); i++) stooks.push({ b, i });
    this.stooks.set(kx, kz, stooks.length, (n, m) => {
      const { b, i } = stooks[n];
      const [lx, lz] = stookAt[i];
      part(b, m, lx, lz, i * 0.7, [1, 1, 1], true, 0.02);
    });

    // Sacks stacked in the granary's yard: a layer of ten, then four on top.
    const sackAt: Array<[number, number, number]> = [];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) sackAt.push([0.55 + r * 0.25, -0.4 + c * 0.2, 0]);
    for (let c = 0; c < 4; c++) sackAt.push([0.67, -0.3 + c * 0.2, 0.13]);
    const sacks: Array<{ b: Building; i: number }> = [];
    for (const b of granaries) for (let i = 0; i < shown(b.stock, GRANARY_CAP, SACKS); i++) sacks.push({ b, i });
    for (const b of posts) for (let i = 0; i < shown(held(b, WHEAT), QUAY_ROOM, QUAY_SACKS); i++) sacks.push({ b, i });
    this.sacks.set(kx, kz, sacks.length, (n, m) => {
      const { b, i } = sacks[n];
      if (b.kind === 'trading') {
        // On the quay's landward corner: a layer of nine, then three on top.
        const top = i >= 9;
        const k = top ? i - 9 : i;
        part(b, m, -1.28 + (k % 3) * 0.23 + (top ? 0.12 : 0), 0.62 + Math.floor(k / 3) * 0.24 + (top ? 0.12 : 0), 1.57 + (hash2(b.id, i, 1301) - 0.5) * 0.5, [1, 1, 1], false, 0.05 + (top ? 0.12 : 0));
        return;
      }
      const [lx, lz, y] = sackAt[i];
      part(b, m, lx, lz, 1.57 + (hash2(b.id, i, 198) - 0.5) * 0.5, [1, 1, 1], true, y + 0.01);
    });

    // Loaves in two of the stall's baskets (the third holds the cheeses).
    const loaves: Array<{ b: Building; i: number }> = [];
    for (const b of agoras) for (let i = 0; i < shown(b.stock, STALL_FULL, LOAVES); i++) loaves.push({ b, i });
    this.loaves.set(kx, kz, loaves.length, (n, m) => {
      const { b, i } = loaves[n];
      const basket = i % 2;
      const k = Math.floor(i / 2);
      const lz = -0.36 + basket * 0.36 + (k - 1) * 0.05;
      const lx = 0.42 + (k === 1 ? 0.05 : -0.03);
      part(b, m, lx, lz, i * 1.1, [1, 1, 1], false, 0.38 + (k === 2 ? 0.03 : 0));
    });

    // Meat: hams hanging on the lodge's rack, laid in a granary's yard, hung at the front of the stall.
    const hams: Array<{ b: Building; i: number }> = [];
    for (const b of lodges) for (let i = 0; i < shown(b.meat, LODGE_STORE, RACK); i++) hams.push({ b, i });
    for (const b of granaries) for (let i = 0; i < shown(b.meat, GRANARY_ROOM[1], STORE_HAMS); i++) hams.push({ b, i });
    for (const b of agoras) for (let i = 0; i < shown(b.meat, STALL_FULL_MEAT, STALL_HAMS); i++) hams.push({ b, i });
    for (const b of posts) for (let i = 0; i < shown(held(b, MEAT), QUAY_ROOM, QUAY_HAMS); i++) hams.push({ b, i });
    this.collect(this.hamsBy, key, hams.length, (n, m) => {
      const { b, i } = hams[n];
      if (b.kind === 'trading') {
        part(b, m, -0.52 + Math.floor(i / 2) * 0.16, -0.24 + (i % 2) * 0.24, Math.PI / 2 + (hash2(b.id, i, 1302) - 0.5) * 0.5, [1, 1, 1], false, 0.1);
        m.multiply(LIE);
      } else if (b.kind === 'lodge') {
        // Two to a side of each frame's middle, hanging from the pole (0.58 up), swaying a little each.
        const lz = -0.55 + i * 0.22;
        part(b, m, RACK_PIECE.lx, lz, hash2(b.id, i, 431) * 2, [1.3, 1.3, 1.3], pieceBase(b, RACK_PIECE), 0.58 - 0.15);
      } else if (b.kind === 'granary') {
        // Laid on their sides, side by side in pairs, by the silo.
        const lx = 1.0 + Math.floor(i / 2) * 0.16;
        const lz = -0.72 + (i % 2) * 0.24;
        part(b, m, lx, lz, Math.PI / 2 + (hash2(b.id, i, 432) - 0.5) * 0.5, [1, 1, 1], true, 0.05);
        m.multiply(LIE);
      } else {
        // Hung under the awning's front edge.
        part(b, m, 0.78, -0.3 + i * 0.3, i * 0.9, [0.9, 0.9, 0.9], false, 0.5);
      }
    });

    // Cheese: wheels on the dairy's bench (then a second layer), in the granary's yard, in the stall's third basket.
    const cheeses: Array<{ b: Building; i: number }> = [];
    for (const b of dairies) for (let i = 0; i < shown(b.cheese, DAIRY_STORE, BENCH); i++) cheeses.push({ b, i });
    for (const b of granaries) for (let i = 0; i < shown(b.cheese, GRANARY_ROOM[2], STORE_CHEESES); i++) cheeses.push({ b, i });
    for (const b of agoras) for (let i = 0; i < shown(b.cheese, STALL_FULL_CHEESE, STALL_CHEESES); i++) cheeses.push({ b, i });
    for (const b of posts) for (let i = 0; i < shown(held(b, CHEESE), QUAY_ROOM, QUAY_CHEESES); i++) cheeses.push({ b, i });
    this.collect(this.cheesesBy, key, cheeses.length, (n, m) => {
      const { b, i } = cheeses[n];
      if (b.kind === 'trading') {
        const k = i % 3;
        const layer = Math.floor(i / 3);
        part(b, m, -0.48 + (k % 2) * 0.16, 0.66 + k * 0.15, hash2(b.id, i, 1303), [1, 1, 1], false, 0.05 + layer * 0.055);
      } else if (b.kind === 'dairy') {
        const top = i >= 6;
        const k = top ? i - 6 : i;
        part(b, m, 0.42 + k * 0.155 + (top ? 0.3 : 0), BENCH_Z, hash2(b.id, i, 433), [1, 1, 1], false, 0.24 + (top ? 0.055 : 0));
      } else if (b.kind === 'granary') {
        const k = i % 3;
        const layer = Math.floor(i / 3);
        part(b, m, 1.1 + (k % 2) * 0.16, 0.36 + k * 0.15, hash2(b.id, i, 434), [1, 1, 1], true, 0.01 + layer * 0.055);
      } else {
        part(b, m, 0.42 + (i === 1 ? 0.05 : -0.03), 0.36 + (i - 1) * 0.05, i, [0.7, 0.7, 0.7], false, 0.38 + (i === 2 ? 0.04 : 0));
      }
    });

    // Olives on a grove's trees: none just after the picking, then more and darker as the crop grows (eighths), ripe near the harvest.
    const fruit: Array<{ m: THREE.Matrix4; c: THREE.Color }> = [];
    for (const b of groves) {
      const stage = stageOf(b, MAKERS.grove!);
      if (stage < 2) continue;
      const ripe = Math.max(0, Math.min(1, (stage - 3) / 4));
      for (const pl of GROVE_TREES) {
        const m = new THREE.Matrix4();
        part(b, m, pl.lx, pl.lz, pl.yaw, [pl.len, pl.len, pl.len], pieceBase(b, pl));
        fruit.push({ m, c: FRUIT_GREEN.clone().lerp(FRUIT_RIPE, ripe) });
      }
    }
    if (fruit.length) this.fruitBy.set(key, fruit);
    else this.fruitBy.delete(key);

    // Baskets of olives: picked ones by the grove's hut, and waiting at the press.
    const baskets: Array<{ b: Building; i: number }> = [];
    for (const b of groves) for (let i = 0; i < shown(held(b, OLIVES), GROVE_STORE, GROVE_BASKETS); i++) baskets.push({ b, i });
    for (const b of presses) for (let i = 0; i < shown(held(b, OLIVES), PRESS_OLIVES, PRESS_BASKETS); i++) baskets.push({ b, i });
    this.collect(this.basketsBy, key, baskets.length, (n, m) => {
      const { b, i } = baskets[n];
      if (b.kind === 'grove') {
        // Under the hut's eaves and along its side, a second layer from the fourth.
        const top = i >= 4;
        const k = top ? i - 4 : i;
        part(b, m, 0.62 + (k % 2) * 0.17 + (top ? 0.08 : 0), -0.4 + Math.floor(k / 2) * 0.17, hash2(b.id, i, 781), [1, 1, 1], true, top ? 0.09 : 0.01);
      } else {
        // In a row between the house and the crushing basin.
        part(b, m, 0.2 + i * 0.17, 0.05, hash2(b.id, i, 782), [1, 1, 1], true, 0.01);
      }
    });

    // Jars of oil: by the press's door, in rows in the storehouse's yard (front to back), on the oil stall's counter.
    const jars: Array<{ b: Building; i: number }> = [];
    for (const b of presses) for (let i = 0; i < shown(held(b, OIL), PRESS_STORE, PRESS_JARS); i++) jars.push({ b, i });
    for (const b of storehouses) for (let i = 0; i < shown(held(b, OIL), STOREHOUSE_OIL, STORE_JARS); i++) jars.push({ b, i });
    for (const b of agoras) if (hasStall(b, OIL)) for (let i = 0; i < shown(held(b, OIL), STALL_FULL_OIL, STALL_JARS); i++) jars.push({ b, i });
    for (const b of posts) for (let i = 0; i < shown(held(b, OIL), QUAY_ROOM, QUAY_JARS); i++) jars.push({ b, i });
    this.collect(this.jarsBy, key, jars.length, (n, m) => {
      const { b, i } = jars[n];
      if (b.kind === 'trading') {
        part(b, m, 0.22 + Math.floor(i / 4) * 0.18, -0.32 + (i % 4) * 0.16 + Math.floor(i / 4) * 0.05, hash2(b.id, i, 1304), [1, 1, 1], false, 0.05);
      } else if (b.kind === 'press') {
        // By the door, two rows of four.
        part(b, m, 0.0 + Math.floor(i / 4) * 0.17, -1.3 + (i % 4) * 0.15, hash2(b.id, i, 783), [0.9, 0.9, 0.9], true, 0.0);
      } else if (b.kind === 'storehouse') {
        // Four rows of four in the yard's oil side (local -z of the gate), filling from the shed forward.
        const row = Math.floor(i / 4);
        const k = i % 4;
        part(b, m, -0.5 + row * 0.27, -1.22 + k * 0.29 + (row % 2) * 0.06, hash2(b.id, i, 784), [1.05, 1.05, 1.05], true, 0.0);
      } else {
        part(b, m, OIL_STALL_X - 0.15 + i * 0.12, OIL_STALL_Z + (i % 2) * 0.04, i, [0.6, 0.6, 0.6], false, 0.29);
      }
    });

    // Grapes on a vineyard's vines: none just after the vintage, then more and darker as they grow (eighths), purple near the harvest.
    const grapes: Array<{ m: THREE.Matrix4; c: THREE.Color }> = [];
    for (const b of vineyards) {
      const stage = stageOf(b, MAKERS.vineyard!);
      if (stage < 2) continue;
      const ripe = Math.max(0, Math.min(1, (stage - 3) / 4));
      for (const pl of VINEYARD_PIECES) {
        const m = new THREE.Matrix4();
        part(b, m, pl.lx, pl.lz, pl.yaw, [1, 0.6 + 0.4 * Math.min(1, stage / 6), 1], pieceBase(b, pl));
        grapes.push({ m, c: GRAPE_GREEN.clone().lerp(GRAPE_RIPE, ripe) });
      }
    }
    if (grapes.length) this.grapesBy.set(key, grapes);
    else this.grapesBy.delete(key);

    // Baskets of grapes: picked ones by the vineyard's hut, and waiting by the winery's vat.
    const gbaskets: Array<{ b: Building; i: number }> = [];
    for (const b of vineyards) for (let i = 0; i < shown(held(b, GRAPES), VINEYARD_STORE, VINEYARD_BASKETS); i++) gbaskets.push({ b, i });
    for (const b of wineries) for (let i = 0; i < shown(held(b, GRAPES), WINERY_GRAPES, WINERY_BASKETS); i++) gbaskets.push({ b, i });
    this.collect(this.grapeBasketsBy, key, gbaskets.length, (n, m) => {
      const { b, i } = gbaskets[n];
      if (b.kind === 'vineyard') {
        const top = i >= 4;
        const k = top ? i - 4 : i;
        part(b, m, 0.8 + (k % 2) * 0.17 + (top ? 0.08 : 0), -0.5 + Math.floor(k / 2) * 0.17, hash2(b.id, i, 861), [1, 1, 1], true, top ? 0.09 : 0.01);
      } else {
        // In a row beside the treading vat, by its step.
        part(b, m, -0.08 + (i % 3) * 0.17, -1.2 + Math.floor(i / 3) * 0.17, hash2(b.id, i, 862), [1, 1, 1], true, 0.01);
      }
    });

    // Bales of fleece: under the pasture's shelter, in the storehouse's yard (the far side from the oil), on the fleece stall's counter.
    const bales: Array<{ b: Building; i: number }> = [];
    for (const b of pastures) for (let i = 0; i < shown(held(b, FLEECE), PASTURE_STORE, PASTURE_BALES); i++) bales.push({ b, i });
    for (const b of storehouses) for (let i = 0; i < shown(held(b, FLEECE), STOREHOUSE_FLEECE, STORE_BALES); i++) bales.push({ b, i });
    for (const b of agoras) if (hasStall(b, FLEECE)) for (let i = 0; i < shown(held(b, FLEECE), STALL_FULL_FLEECE, STALL_BALES); i++) bales.push({ b, i });
    for (const b of posts) for (let i = 0; i < shown(held(b, FLEECE), QUAY_ROOM, QUAY_BALES); i++) bales.push({ b, i });
    this.collect(this.balesBy, key, bales.length, (n, m) => {
      const { b, i } = bales[n];
      if (b.kind === 'trading') {
        // Four on the quay, two on top.
        const top = i >= 4;
        const k = top ? i - 4 : i;
        part(b, m, -1.24 + (k % 2) * 0.27 + (top ? 0.13 : 0), -0.26 + Math.floor(k / 2) * 0.3, hash2(b.id, i, 1305) * 0.6, [1.05, 1.05, 1.05], false, 0.05 + (top ? 0.13 : 0));
      } else if (b.kind === 'pasture') {
        // Under the shelter, a layer of four, then two on top.
        const top = i >= 4;
        const k = top ? i - 4 : i;
        part(b, m, 0.8 + (k % 2) * 0.26 + (top ? 0.13 : 0), 0.78 + Math.floor(k / 2) * 0.24, hash2(b.id, i, 863) * 0.6, [1, 1, 1], false, top ? 0.13 : 0.0);
      } else if (b.kind === 'storehouse') {
        // Two layers of six against the shed, on the yard's far side.
        const top = i >= 6;
        const k = top ? i - 6 : i;
        part(b, m, -0.5 + (k % 3) * 0.26 + (top ? 0.13 : 0), 0.5 + Math.floor(k / 3) * 0.3 + (top ? 0.15 : 0), hash2(b.id, i, 864) * 0.6, [1.05, 1.05, 1.05], true, top ? 0.13 : 0.0);
      } else {
        part(b, m, FLEECE_STALL_X - 0.2 + i * 0.2, FLEECE_STALL_Z, i * 0.7, [0.55, 0.55, 0.55], false, 0.29);
      }
    });

    // Amphorae of wine: in rows in the winery's yard, in the storehouse's yard by the gate, on the wine stall's counter.
    const amph: Array<{ b: Building; i: number }> = [];
    for (const b of wineries) for (let i = 0; i < shown(held(b, WINE), WINERY_STORE, WINERY_AMPHORAE); i++) amph.push({ b, i });
    for (const b of storehouses) for (let i = 0; i < shown(held(b, WINE), STOREHOUSE_WINE, STORE_AMPHORAE); i++) amph.push({ b, i });
    for (const b of agoras) if (hasStall(b, WINE)) for (let i = 0; i < shown(held(b, WINE), STALL_FULL_WINE, STALL_AMPHORAE); i++) amph.push({ b, i });
    for (const b of posts) for (let i = 0; i < shown(held(b, WINE), QUAY_ROOM, QUAY_AMPHORAE); i++) amph.push({ b, i });
    this.collect(this.amphoraeBy, key, amph.length, (n, m) => {
      const { b, i } = amph[n];
      if (b.kind === 'trading') {
        part(b, m, 0.16 + (i % 4) * 0.15, 0.74 + Math.floor(i / 4) * 0.2 + (i % 2) * 0.03, hash2(b.id, i, 1306), [1, 1, 1], false, 0.05);
      } else if (b.kind === 'winery') {
        // Two rows of five under and before the lean-to.
        part(b, m, -1.2 + (i % 5) * 0.19, 0.8 + Math.floor(i / 5) * 0.24, hash2(b.id, i, 865), [1, 1, 1], true, 0.0);
      } else if (b.kind === 'storehouse') {
        // Three rows of four on the gate side of the yard.
        part(b, m, 0.45 + (i % 4) * 0.21, 0.5 + Math.floor(i / 4) * 0.3 + (i % 2) * 0.05, hash2(b.id, i, 866), [1, 1, 1], true, 0.0);
      } else {
        part(b, m, WINE_STALL_X, WINE_STALL_Z - 0.2 + i * 0.2, i, [0.6, 0.6, 0.6], false, 0.29);
      }
    });
  }
}
