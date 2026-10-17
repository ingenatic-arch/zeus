/**
 * The grander buildings of slice 6: townhouses and fine houses (two of each),
 * the shrine and the theatre. Built from simple shapes like the rest, and
 * kept lean: a townhouse costs about what a cottage does and a fine house a
 * little more, since a district of them is what Oliver will look at from
 * above. Local frame as in homes.ts (and works.ts for the theatre): the
 * footprint's centre at the origin, the front facing +x.
 */
import * as THREE from 'three';
import { amphora, cyl, prism, windowBack, windowX } from './homes';
import { PAL } from './palette';
import { lumpy, merge, type Part } from './trees';

/** A box from (x0, z0) to (x1, z1), standing from y0 to y1. */
const slab = (x0: number, z0: number, x1: number, z1: number, y0: number, y1: number): THREE.BufferGeometry =>
  new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);

/** A gable end: a flat triangle `w` wide and `h` tall in the xy plane (turn it to face along z). */
function gable(w: number, h: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const a = w / 2;
  g.setAttribute('position', new THREE.Float32BufferAttribute([-a, 0, 0, a, 0, 0, 0, h, 0], 3));
  return g;
}

/** A tiled gable roof over a box of (dx, dz) at height `top`, its ridge along z, with gable ends and a darker ridge. */
function gableRoof(parts: Part[], cx: number, cz: number, dx: number, dz: number, top: number, h: number): void {
  parts.push({ geo: prism(dz + 0.16, dx / 2 + 0.1, h).rotateY(Math.PI / 2).translate(cx, top, cz), color: PAL.roofTile });
  parts.push({ geo: cyl(0.03, 0.03, dz + 0.18, 5).rotateX(Math.PI / 2).translate(cx, top + h, cz), color: PAL.roofTileDark });
  const g = gable(dx, h * 0.94);
  parts.push({ geo: g.clone().translate(cx, top, cz + dz / 2 + 0.001), color: PAL.whitewashShade });
  parts.push({ geo: g.translate(cx, top, cz - dz / 2 - 0.001), color: PAL.whitewashShade });
}

/** A hipped tile roof (a four-sided pyramid) over a box of (dx, dz) at height `top`, with a darker eave. */
function hippedRoof(parts: Part[], cx: number, cz: number, dx: number, dz: number, top: number, h: number): void {
  const r = ((Math.max(dx, dz) + 0.2) / 2) * Math.SQRT2;
  parts.push({ geo: new THREE.ConeGeometry(r, h, 4, 1).rotateY(Math.PI / 4).scale(dx >= dz ? 1 : (dx + 0.2) / (dz + 0.2), 1, dz >= dx ? 1 : (dz + 0.2) / (dx + 0.2)).translate(cx, top + h / 2, cz), color: PAL.roofTile });
  parts.push({ geo: slab(cx - dx / 2 - 0.1, cz - dz / 2 - 0.1, cx + dx / 2 + 0.1, cz + dz / 2 + 0.1, top - 0.02, top + 0.015), color: PAL.roofTileDark });
}

/** The painted band under the eaves, blue with an ochre line beneath, round a box of (dx, dz). */
function band(parts: Part[], cx: number, cz: number, dx: number, dz: number, y: number): void {
  parts.push({ geo: slab(cx - dx / 2 - 0.006, cz - dz / 2 - 0.006, cx + dx / 2 + 0.006, cz + dz / 2 + 0.006, y - 0.07, y), color: PAL.bandBlue });
  parts.push({ geo: slab(cx - dx / 2 - 0.008, cz - dz / 2 - 0.008, cx + dx / 2 + 0.008, cz + dz / 2 + 0.008, y - 0.1, y - 0.07), color: PAL.bandOchre });
}

/** A window on a wall facing +z or -z (side = ±1): a dark pane between blue shutters. */
function windowZ(x: number, y: number, z: number, side: number): Part[] {
  return windowX(0, y, 0).map((p) => ({ geo: p.geo.rotateY(side > 0 ? -Math.PI / 2 : Math.PI / 2).translate(x, 0, z), color: p.color }));
}

/** An olive tree: a trunk and a lumpy grey-green crown. */
function olive(x: number, z: number, s: number, seed: number): Part[] {
  return [
    { geo: cyl(0.03 * s, 0.045 * s, 0.36 * s, 5).translate(x, 0.18 * s, z), color: PAL.trunk },
    { geo: lumpy(new THREE.IcosahedronGeometry(0.22 * s, 0), 0.3, seed).scale(1.2, 0.8, 1.1).translate(x, 0.45 * s, z), color: PAL.oliveLeaf },
  ];
}

/** A cypress: a tall dark cone on a stub of trunk. */
function cypress(x: number, z: number, h: number): Part[] {
  return [
    { geo: cyl(0.02, 0.03, 0.1, 4).translate(x, 0.05, z), color: PAL.trunk },
    { geo: new THREE.ConeGeometry(0.11, h, 6).translate(x, 0.08 + h / 2, z), color: PAL.cypress },
  ];
}

const pithos = (x: number, z: number): Part => ({
  geo: new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.06, 0.01), new THREE.Vector2(0.11, 0.12), new THREE.Vector2(0.09, 0.23), new THREE.Vector2(0.05, 0.27)], 6).translate(x, 0, z),
  color: PAL.pithos,
});

// ---------------------------------------------------------------------------
// Townhouses: two storeys, a painted band under the eaves.

/**
 * A two-storey townhouse, its long side to the road: whitewash over a stone
 * footing, a blue and ochre band under the tiled roof, a timber balcony over
 * the door, blue-shuttered windows on both floors, and a walled yard beside
 * it with an olive tree and jars.
 */
export function townhouseA(): THREE.BufferGeometry {
  const parts: Part[] = [];
  const cx = -0.24;
  const cz = -0.14;
  const dx = 0.92;
  const dz = 1.34;
  const h = 1.0;
  const top = 0.08 + h;
  parts.push({ geo: slab(cx - dx / 2 - 0.04, cz - dz / 2 - 0.04, cx + dx / 2 + 0.04, cz + dz / 2 + 0.04, -0.1, 0.08), color: PAL.plinth });
  parts.push({ geo: slab(cx - dx / 2, cz - dz / 2, cx + dx / 2, cz + dz / 2, 0.08, top), color: PAL.whitewash });
  band(parts, cx, cz, dx, dz, top);
  gableRoof(parts, cx, cz, dx, dz, top, 0.36);
  const fx = cx + dx / 2;
  // Two windows upstairs at the back, so the house has a face towards the next street too.
  parts.push(...windowBack(cx - dx / 2 - 0.004, 0.86, cz - 0.3), ...windowBack(cx - dx / 2 - 0.004, 0.86, cz + 0.3));
  // The door with an ochre lintel, windows either side, three above, the middle one a balcony door.
  parts.push({ geo: slab(fx - 0.01, cz - 0.11, fx + 0.02, cz + 0.11, 0.08, 0.48), color: PAL.door });
  parts.push({ geo: slab(fx - 0.01, cz - 0.15, fx + 0.04, cz + 0.15, 0.48, 0.53), color: PAL.bandOchre });
  parts.push({ geo: slab(fx, cz - 0.16, fx + 0.12, cz + 0.16, 0, 0.05), color: PAL.plinth });
  parts.push(...windowX(fx + 0.004, 0.36, cz - 0.42), ...windowX(fx + 0.004, 0.36, cz + 0.42));
  parts.push(...windowX(fx + 0.004, 0.84, cz - 0.44), ...windowX(fx + 0.004, 0.84, cz + 0.44));
  parts.push({ geo: slab(fx - 0.01, cz - 0.08, fx + 0.02, cz + 0.08, 0.66, 0.94), color: PAL.door });
  // The balcony: a timber floor on two brackets, and a rail.
  parts.push({ geo: slab(fx, cz - 0.22, fx + 0.18, cz + 0.22, 0.62, 0.66), color: PAL.wood });
  parts.push({ geo: slab(fx + 0.16, cz - 0.22, fx + 0.18, cz + 0.22, 0.66, 0.8), color: PAL.woodDark });
  parts.push({ geo: slab(fx + 0.02, cz - 0.22, fx + 0.18, cz - 0.2, 0.66, 0.8), color: PAL.woodDark });
  parts.push({ geo: slab(fx + 0.02, cz + 0.2, fx + 0.18, cz + 0.22, 0.66, 0.8), color: PAL.woodDark });
  // A window on the yard side, upstairs.
  parts.push(...windowZ(cx - 0.1, 0.84, cz + dz / 2 + 0.004, 1));
  // The yard: a low wall with a gap for a gate, an olive tree, a pithos and an amphora.
  parts.push({ geo: slab(-0.92, 0.86, 0.62, 0.92, 0, 0.22), color: PAL.whitewash });
  parts.push({ geo: slab(0.62, 0.62, 0.68, 0.92, 0, 0.22), color: PAL.whitewash });
  parts.push(...olive(-0.48, 0.74, 1, 171));
  parts.push(pithos(0.36, 0.74));
  parts.push(amphora(0.74, -0.76, 0.22));
  return merge(parts);
}

/**
 * An L-shaped townhouse: a two-storey block at the back under a hipped roof,
 * a one-storey wing to the road with a roof terrace and a vine pergola on
 * it, and a little walled court beside with a cypress and a bench.
 */
export function townhouseB(): THREE.BufferGeometry {
  const parts: Part[] = [];
  // The main block.
  const cx = -0.44;
  const cz = -0.3;
  const dx = 0.92;
  const dz = 1.14;
  const h = 1.02;
  const top = 0.08 + h;
  parts.push({ geo: slab(cx - dx / 2 - 0.04, cz - dz / 2 - 0.04, cx + dx / 2 + 0.04, cz + dz / 2 + 0.04, -0.1, 0.08), color: PAL.plinth });
  parts.push({ geo: slab(cx - dx / 2, cz - dz / 2, cx + dx / 2, cz + dz / 2, 0.08, top), color: PAL.whitewash });
  band(parts, cx, cz, dx, dz, top);
  hippedRoof(parts, cx, cz, dx, dz, top, 0.4);
  const fx = cx + dx / 2;
  // Two windows upstairs at the back, so the house has a face towards the next street too.
  parts.push(...windowBack(cx - dx / 2 - 0.004, 0.86, cz - 0.3), ...windowBack(cx - dx / 2 - 0.004, 0.86, cz + 0.3));
  parts.push(...windowX(fx + 0.004, 0.86, cz + 0.36), ...windowX(fx + 0.004, 0.86, cz - 0.34));
  parts.push(...windowZ(cx, 0.86, cz + dz / 2 + 0.004, 1), ...windowZ(cx, 0.4, cz + dz / 2 + 0.004, 1));
  // The wing to the road: one storey, a flat roof with a parapet, its door facing the road.
  const wx0 = fx;
  const wx1 = 0.66;
  const wz0 = -0.86;
  const wz1 = -0.1;
  const wh = 0.08 + 0.52;
  parts.push({ geo: slab(wx0, wz0 - 0.03, wx1 + 0.03, wz1 + 0.03, -0.1, 0.08), color: PAL.plinth });
  parts.push({ geo: slab(wx0, wz0, wx1, wz1, 0.08, wh), color: PAL.whitewash });
  parts.push({ geo: slab(wx0, wz0 - 0.02, wx1 + 0.02, wz1 + 0.02, wh, wh + 0.07), color: PAL.bandOchre });
  parts.push({ geo: slab(wx1 - 0.02, (wz0 + wz1) / 2 - 0.11, wx1 + 0.012, (wz0 + wz1) / 2 + 0.11, 0.08, 0.46), color: PAL.door });
  parts.push(...windowX(wx1 + 0.004, 0.38, wz0 + 0.14));
  // The pergola on the terrace: four posts and a roof of vine leaves.
  for (const [x, z] of [[wx0 + 0.08, wz0 + 0.08], [wx1 - 0.08, wz0 + 0.08], [wx0 + 0.08, wz1 - 0.08], [wx1 - 0.08, wz1 - 0.08]]) parts.push({ geo: cyl(0.016, 0.016, 0.34, 4).translate(x, wh + 0.17, z), color: PAL.wood });
  parts.push({ geo: lumpy(new THREE.BoxGeometry(wx1 - wx0 - 0.04, 0.06, wz1 - wz0 - 0.04, 2, 1, 2), 0.25, 181).translate((wx0 + wx1) / 2, wh + 0.36, (wz0 + wz1) / 2), color: PAL.scrub });
  // The court: a low wall to the road and the far side, a cypress, a bench, pots of herbs.
  parts.push({ geo: slab(0.62, 0.04, 0.68, 0.92, 0, 0.22), color: PAL.whitewash });
  parts.push({ geo: slab(-0.92, 0.86, 0.62, 0.92, 0, 0.22), color: PAL.whitewash });
  parts.push(...cypress(-0.6, 0.62, 0.78));
  parts.push({ geo: slab(0.05, 0.66, 0.4, 0.76, 0.1, 0.14), color: PAL.wood });
  parts.push({ geo: slab(0.08, 0.68, 0.12, 0.74, 0, 0.1), color: PAL.woodDark }, { geo: slab(0.33, 0.68, 0.37, 0.74, 0, 0.1), color: PAL.woodDark });
  for (const [x, z, k] of [[0.48, 0.2, 0], [0.48, 0.38, 1]]) {
    parts.push({ geo: cyl(0.05, 0.04, 0.08, 6).translate(x, 0.04, z), color: PAL.pot });
    parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.06, 0), 0.3, 190 + k).translate(x, 0.12, z), color: PAL.scrubDark });
  }
  parts.push(pithos(-0.2, 0.62));
  return merge(parts);
}

// ---------------------------------------------------------------------------
// Fine houses: the whole plot, columns and a courtyard.

/**
 * A courtyard house: a two-storey hall across the back with a colonnade
 * before it, two low wings down the sides, and a front wall to the road with
 * a columned gateway, so you look into a paved court with an olive tree.
 */
export function fineA(): THREE.BufferGeometry {
  const parts: Part[] = [];
  // The hall at the back.
  const hx0 = -0.96;
  const hx1 = -0.3;
  const hz = 0.94;
  const h = 1.1;
  const top = 0.08 + h;
  const hcx = (hx0 + hx1) / 2;
  parts.push({ geo: slab(-0.98, -0.97, 0.84, 0.97, -0.12, 0.06), color: PAL.plinth });
  parts.push({ geo: slab(hx0, -hz, hx1, hz, 0.06, top), color: PAL.whitewash });
  band(parts, hcx, 0, hx1 - hx0, 2 * hz, top);
  gableRoof(parts, hcx, 0, hx1 - hx0, 2 * hz, top, 0.34);
  parts.push(...windowX(hx1 + 0.004, 0.9, -0.5), ...windowX(hx1 + 0.004, 0.9, 0), ...windowX(hx1 + 0.004, 0.9, 0.5));
  // The hall's back towards the next street: windows up and down.
  for (const z of [-0.55, 0, 0.55]) parts.push(...windowBack(hx0 - 0.004, 0.9, z));
  for (const z of [-0.55, 0.55]) parts.push(...windowBack(hx0 - 0.004, 0.4, z));
  parts.push({ geo: slab(hx1 - 0.01, -0.12, hx1 + 0.02, 0.12, 0.06, 0.5), color: PAL.door });
  // The colonnade before the hall: four columns under a lean-to roof.
  for (const z of [-0.42, -0.14, 0.14, 0.42]) parts.push({ geo: cyl(0.04, 0.048, 0.56, 7).translate(-0.06, 0.06 + 0.28, z), color: PAL.column });
  parts.push({ geo: slab(-0.12, -0.5, 0.0, 0.5, 0.62, 0.68), color: PAL.marble });
  parts.push({ geo: new THREE.BoxGeometry(0.4, 0.04, 1.1).rotateZ(-0.34).translate(-0.13, 0.76, 0), color: PAL.roofTile });
  // The wings down each side, one storey, their tiled roofs sloping into the court.
  const wx0 = hx1;
  const wx1 = 0.72;
  for (const side of [-1, 1]) {
    const z0 = side < 0 ? -hz : 0.52;
    const z1 = side < 0 ? -0.52 : hz;
    parts.push({ geo: slab(wx0, z0, wx1, z1, 0.06, 0.62), color: PAL.whitewash });
    parts.push({ geo: new THREE.BoxGeometry(wx1 - wx0 + 0.08, 0.05, z1 - z0 + 0.14).rotateX(-side * 0.3).translate((wx0 + wx1) / 2, 0.7, (z0 + z1) / 2), color: PAL.roofTile });
    parts.push(...windowZ((wx0 + wx1) / 2, 0.38, side < 0 ? -hz - 0.004 : hz + 0.004, side));
  }
  // The front wall with its gateway: two columns, a lintel and a little pediment.
  parts.push({ geo: slab(wx1, -hz, wx1 + 0.08, -0.2, 0.06, 0.46), color: PAL.whitewash });
  parts.push({ geo: slab(wx1, 0.2, wx1 + 0.08, hz, 0.06, 0.46), color: PAL.whitewash });
  parts.push({ geo: slab(wx1 - 0.01, -hz, wx1 + 0.09, hz, 0.46, 0.5), color: PAL.bandOchre });
  for (const z of [-0.2, 0.2]) parts.push({ geo: cyl(0.045, 0.05, 0.58, 7).translate(wx1 + 0.04, 0.06 + 0.29, z), color: PAL.column });
  parts.push({ geo: slab(wx1 - 0.02, -0.28, wx1 + 0.1, 0.28, 0.64, 0.71), color: PAL.marble });
  parts.push({ geo: prism(0.16, 0.31, 0.15).translate(wx1 + 0.04, 0.71, 0), color: PAL.roofTile });
  parts.push({ geo: gable(0.56, 0.14).rotateY(Math.PI / 2).translate(wx1 + 0.125, 0.71, 0), color: PAL.marble });
  // The court: paving, an olive tree, jars.
  parts.push({ geo: slab(-0.3, -0.52, wx1, 0.52, 0.06, 0.075), color: PAL.courtyard });
  parts.push(...olive(0.34, -0.26, 0.9, 201));
  parts.push(pithos(0.4, 0.36), amphora(0.26, 0.42, 0.2));
  return merge(parts);
}

/**
 * A villa with a columned porch: a tall block under a hipped roof with the
 * painted band, a porch of four columns and a pediment at the door, steps
 * up to it, and a garden beside with a clipped hedge and two cypresses.
 */
export function fineB(): THREE.BufferGeometry {
  const parts: Part[] = [];
  const cx = -0.36;
  const cz = -0.12;
  const dx = 1.06;
  const dz = 1.56;
  const h = 1.12;
  const top = 0.08 + h;
  parts.push({ geo: slab(cx - dx / 2 - 0.05, cz - dz / 2 - 0.05, cx + dx / 2 + 0.05, cz + dz / 2 + 0.05, -0.12, 0.08), color: PAL.plinth });
  parts.push({ geo: slab(cx - dx / 2, cz - dz / 2, cx + dx / 2, cz + dz / 2, 0.08, top), color: PAL.whitewash });
  band(parts, cx, cz, dx, dz, top);
  hippedRoof(parts, cx, cz, dx, dz, top, 0.42);
  const fx = cx + dx / 2;
  // Two windows upstairs at the back, so the house has a face towards the next street too.
  parts.push(...windowBack(cx - dx / 2 - 0.004, 0.86, cz - 0.3), ...windowBack(cx - dx / 2 - 0.004, 0.86, cz + 0.3));
  parts.push({ geo: slab(fx - 0.01, cz - 0.12, fx + 0.02, cz + 0.12, 0.14, 0.58), color: PAL.door });
  parts.push(...windowX(fx + 0.004, 0.92, cz - 0.56), ...windowX(fx + 0.004, 0.92, cz + 0.56), ...windowX(fx + 0.004, 0.42, cz - 0.56), ...windowX(fx + 0.004, 0.42, cz + 0.56));
  parts.push(...windowZ(cx - 0.2, 0.92, cz + dz / 2 + 0.004, 1), ...windowZ(cx + 0.2, 0.92, cz + dz / 2 + 0.004, 1));
  // The porch: two steps, four columns, an entablature and a pediment facing the road.
  const px1 = fx + 0.4;
  parts.push({ geo: slab(fx, cz - 0.42, px1 + 0.06, cz + 0.42, 0, 0.07), color: PAL.marbleShade });
  parts.push({ geo: slab(fx, cz - 0.38, px1, cz + 0.38, 0.07, 0.14), color: PAL.marble });
  for (const z of [-0.32, -0.11, 0.11, 0.32]) parts.push({ geo: cyl(0.04, 0.048, 0.6, 7).translate(px1 - 0.06, 0.14 + 0.3, cz + z), color: PAL.column });
  parts.push({ geo: slab(fx, cz - 0.38, px1, cz + 0.38, 0.74, 0.82), color: PAL.marble });
  parts.push({ geo: slab(fx, cz - 0.39, px1 + 0.005, cz + 0.39, 0.82, 0.85), color: PAL.bandBlue });
  parts.push({ geo: prism(px1 - fx + 0.04, 0.42, 0.2).translate((fx + px1) / 2, 0.85, cz), color: PAL.roofTile });
  parts.push({ geo: gable(0.8, 0.18).rotateY(Math.PI / 2).translate(px1 + 0.025, 0.85, cz), color: PAL.marble });
  // The garden beside: a clipped hedge along its edge, two cypresses, a stone bench.
  parts.push({ geo: lumpy(new THREE.BoxGeometry(0.12, 0.2, 1.0, 1, 1, 3), 0.15, 211).translate(0.84, 0.1, 0.36), color: PAL.scrubDark });
  parts.push(...cypress(0.66, -0.86, 0.86), ...cypress(0.66, 0.84, 0.86));
  parts.push({ geo: slab(0.3, 0.86, 0.6, 0.94, 0.06, 0.11), color: PAL.marbleShade });
  parts.push({ geo: slab(0.32, 0.87, 0.36, 0.93, 0, 0.06), color: PAL.marbleShade }, { geo: slab(0.54, 0.87, 0.58, 0.93, 0, 0.06), color: PAL.marbleShade });
  parts.push(pithos(0.74, -0.5), amphora(0.6, -0.6, 0.2));
  return merge(parts);
}

// ---------------------------------------------------------------------------
// Villas (slice 11): the grandest homes, a colonnade round a garden.

/** The villa's band under the eaves: Pompeian red with a cream line beneath, round a box of (dx, dz). */
function redBand(parts: Part[], cx: number, cz: number, dx: number, dz: number, y: number): void {
  parts.push({ geo: slab(cx - dx / 2 - 0.006, cz - dz / 2 - 0.006, cx + dx / 2 + 0.006, cz + dz / 2 + 0.006, y - 0.08, y), color: PAL.villaBand });
  parts.push({ geo: slab(cx - dx / 2 - 0.008, cz - dz / 2 - 0.008, cx + dx / 2 + 0.008, cz + dz / 2 + 0.008, y - 0.105, y - 0.08), color: PAL.marble });
}

/** A column with a square capital, standing on y0, `h` tall. */
function column(x: number, z: number, y0: number, h: number): Part[] {
  return [
    { geo: cyl(0.036, 0.044, h, 6).translate(x, y0 + h / 2, z), color: PAL.column },
    { geo: slab(x - 0.055, z - 0.055, x + 0.055, z + 0.055, y0 + h, y0 + h + 0.035), color: PAL.marble },
  ];
}

/**
 * A box over (x0, z0)-(x1, z1) whose top slopes from yLo on one side to yHi on
 * the side `high` names. With `thick` it is a plank of tiles following the
 * slope; without, it is solid down to y0 (a wall whose top follows a roof).
 */
function sloped(x0: number, z0: number, x1: number, z1: number, yLo: number, yHi: number, high: '+x' | '-x' | '+z' | '-z', y0: number, thick?: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(x1 - x0, 1, z1 - z0).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const t = high === '+x' ? (x - x0) / (x1 - x0) : high === '-x' ? (x1 - x) / (x1 - x0) : high === '+z' ? (z - z0) / (z1 - z0) : (z1 - z) / (z1 - z0);
    const top = yLo + (yHi - yLo) * t;
    pos.setY(i, pos.getY(i) > 0 ? top : thick !== undefined ? top - thick : y0);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * The peristyle villa: a tall hall across the back under a hipped roof, a
 * little tower at one corner, wings down both sides, and a grand gateway to
 * the road; inside, a colonnade on all four sides round a garden with a pool
 * and an olive tree. Warm stucco with a Pompeian red band.
 */
export function villaA(): THREE.BufferGeometry {
  const parts: Part[] = [];
  parts.push({ geo: slab(-0.99, -0.99, 0.86, 0.99, -0.14, 0.06), color: PAL.plinth });
  // The hall at the back, two storeys.
  const hx0 = -0.97;
  const hx1 = -0.4;
  const hz = 0.97;
  const top = 0.06 + 1.18;
  const hcx = (hx0 + hx1) / 2;
  parts.push({ geo: slab(hx0, -hz, hx1, hz, 0.06, top), color: PAL.villaWall });
  parts.push({ geo: slab(hx0 - 0.005, -hz - 0.005, hx1 + 0.005, hz + 0.005, 0.06, 0.16), color: PAL.villaShade });
  redBand(parts, hcx, 0, hx1 - hx0, 2 * hz, top);
  hippedRoof(parts, hcx, 0, hx1 - hx0, 2 * hz, top, 0.38);
  for (const z of [-0.55, 0, 0.55]) parts.push(...windowBack(hx0 - 0.004, 0.92, z), ...windowBack(hx0 - 0.004, 0.42, z));
  for (const z of [-0.45, 0.45]) parts.push(...windowX(hx1 + 0.004, 0.94, z));
  // The tower at the back corner, a storey above the hall, with a little loggia of columns.
  const tx0 = hx0;
  const tx1 = hx0 + 0.42;
  const tz0 = -hz;
  const tz1 = -hz + 0.42;
  const ttop = top + 0.46;
  parts.push({ geo: slab(tx0, tz0, tx1, tz1, top, ttop - 0.2), color: PAL.villaWall });
  for (const [x, z] of [[tx0 + 0.05, tz0 + 0.05], [tx1 - 0.05, tz0 + 0.05], [tx0 + 0.05, tz1 - 0.05], [tx1 - 0.05, tz1 - 0.05]]) parts.push({ geo: cyl(0.025, 0.03, 0.2, 5).translate(x, ttop - 0.1, z), color: PAL.column });
  redBand(parts, (tx0 + tx1) / 2, (tz0 + tz1) / 2, tx1 - tx0, tz1 - tz0, ttop + 0.04);
  hippedRoof(parts, (tx0 + tx1) / 2, (tz0 + tz1) / 2, tx1 - tx0, tz1 - tz0, ttop + 0.04, 0.26);
  // The wings down each side, one storey, their roofs sloping into the court.
  // A roof plank's underside is at ROOF_LO - 0.045 over the colonnade beam (|z| = 0.47) and rises outwards.
  const ROOF_LO = 0.695;
  const ROOF_RISE = 0.5;
  const roofAt = (z: number): number => ROOF_LO - 0.045 + ROOF_RISE * (z - 0.47);
  const wx0 = hx1;
  const wx1 = 0.8;
  const wz = 0.66;
  for (const side of [-1, 1]) {
    const z0 = side < 0 ? -hz : wz;
    const z1 = side < 0 ? -wz : hz;
    // The wing's walls rise to meet its roof, which runs on over the colonnade and slopes down into the court.
    const out = side < 0 ? '-z' : '+z';
    parts.push({ geo: sloped(wx0, z0, wx1, z1, side < 0 ? roofAt(-z1) : roofAt(z0), side < 0 ? roofAt(-z0) : roofAt(z1), out, 0.06), color: PAL.villaWall });
    parts.push({ geo: slab(wx0, z0 - 0.004, wx1 + 0.004, z1 + 0.004, 0.58, 0.64), color: PAL.villaBand });
    const r0 = side < 0 ? -0.99 : 0.47;
    const r1 = side < 0 ? -0.47 : 0.99;
    parts.push({ geo: sloped(wx0, r0, wx1 + 0.06, r1, ROOF_LO, ROOF_LO + ROOF_RISE * (0.99 - 0.47), out, 0, 0.045), color: PAL.roofTile });
    for (const x of [-0.1, 0.4]) parts.push(...windowZ(x, 0.38, side < 0 ? -hz - 0.004 : hz + 0.004, side));
  }
  // The front: a wall to the road either side of the gateway, and the gateway itself: steps, two columns, a pediment, red doors.
  const fx = wx1;
  parts.push({ geo: slab(fx - 0.08, -wz, fx, -0.22, 0.06, 0.72), color: PAL.villaWall });
  parts.push({ geo: slab(fx - 0.08, 0.22, fx, wz, 0.06, 0.72), color: PAL.villaWall });
  parts.push({ geo: slab(fx - 0.085, -wz, fx + 0.005, wz, 0.62, 0.68), color: PAL.villaBand });
  parts.push({ geo: slab(fx, -0.3, fx + 0.16, 0.3, 0, 0.06), color: PAL.marbleShade });
  for (const z of [-0.2, 0.2]) parts.push(...column(fx + 0.08, z, 0.06, 0.62));
  parts.push({ geo: slab(fx - 0.04, -0.28, fx + 0.14, 0.28, 0.71, 0.78), color: PAL.marble });
  parts.push({ geo: prism(0.2, 0.31, 0.16).translate(fx + 0.05, 0.78, 0), color: PAL.roofTile });
  parts.push({ geo: gable(0.56, 0.15).rotateY(Math.PI / 2).translate(fx + 0.152, 0.78, 0), color: PAL.marble });
  parts.push({ geo: slab(fx - 0.09, -0.13, fx - 0.07, 0.13, 0.06, 0.5), color: PAL.villaBand });
  // The garden court inside, its colonnade on four sides under a lean-to of tiles.
  const gx0 = hx1 + 0.06;
  const gx1 = fx - 0.12;
  const gz = wz - 0.04;
  parts.push({ geo: slab(gx0, -gz, gx1, gz, 0.06, 0.075), color: PAL.courtyard });
  parts.push({ geo: slab(gx0 + 0.14, -gz + 0.14, gx1 - 0.14, gz - 0.14, 0.075, 0.09), color: PAL.garden });
  parts.push({ geo: slab(gx0 + 0.32, -0.16, gx1 - 0.32, 0.16, 0.08, 0.095), color: PAL.marbleShade });
  parts.push({ geo: slab(gx0 + 0.35, -0.13, gx1 - 0.35, 0.13, 0.08, 0.098), color: PAL.pool });
  const cx0 = gx0 + 0.07;
  const cx1 = gx1 - 0.07;
  const cz = gz - 0.07;
  for (let i = 0; i < 4; i++) {
    const x = cx0 + ((cx1 - cx0) * i) / 3;
    parts.push(...column(x, -cz, 0.075, 0.5), ...column(x, cz, 0.075, 0.5));
  }
  for (const z of [-cz / 3, cz / 3]) parts.push(...column(cx0, z, 0.075, 0.5), ...column(cx1, z, 0.075, 0.5));
  // A beam along the top of every row of columns, and the roofs over the two ends of the walk.
  const beam = 0.075 + 0.5 + 0.035;
  for (const z of [-cz, cz]) parts.push({ geo: slab(cx0 - 0.05, z - 0.04, cx1 + 0.05, z + 0.04, beam, beam + 0.04), color: PAL.marble });
  for (const x of [cx0, cx1]) parts.push({ geo: slab(x - 0.04, -cz, x + 0.04, cz, beam, beam + 0.04), color: PAL.marble });
  parts.push({ geo: sloped(hx1, -0.5, cx0 + 0.07, 0.5, ROOF_LO, ROOF_LO + ROOF_RISE * (cx0 + 0.07 - hx1), '-x', 0, 0.045), color: PAL.roofTile });
  parts.push({ geo: sloped(cx1 - 0.07, -0.5, fx + 0.04, 0.5, ROOF_LO, ROOF_LO + ROOF_RISE * (fx + 0.04 - cx1 + 0.07) * 0.5, '+x', 0, 0.045), color: PAL.roofTile });
  // The garden: an olive tree, low clipped hedges, pots.
  parts.push(...olive(gx0 + 0.3, gz - 0.3, 1.0, 221));
  parts.push({ geo: lumpy(new THREE.BoxGeometry(0.08, 0.1, 0.36, 1, 1, 2), 0.15, 222).translate(gx1 - 0.2, 0.13, -0.24), color: PAL.gardenDark });
  parts.push({ geo: lumpy(new THREE.BoxGeometry(0.3, 0.1, 0.08, 2, 1, 1), 0.15, 223).translate(gx0 + 0.32, 0.13, -gz + 0.22), color: PAL.gardenDark });
  parts.push(pithos(gx1 - 0.2, gz - 0.22));
  // Two cypresses in pots before the gateway.
  for (const z of [-0.5, 0.5]) {
    parts.push({ geo: cyl(0.06, 0.05, 0.08, 6).translate(fx + 0.1, 0.04, z), color: PAL.pot });
    parts.push({ geo: new THREE.ConeGeometry(0.075, 0.5, 6).translate(fx + 0.1, 0.33, z), color: PAL.cypress });
  }
  return merge(parts);
}

/**
 * The garden villa: an L of a tall house under a hipped roof with an open
 * loggia of columns along its upper floor, and a columned portico along the
 * front; the rest of the plot a walled garden with an olive tree, two
 * cypresses, a round basin and a vine pergola along its wall.
 */
export function villaB(): THREE.BufferGeometry {
  const parts: Part[] = [];
  parts.push({ geo: slab(-0.99, -0.99, 0.92, 0.99, -0.14, 0.06), color: PAL.plinth });
  // The house along the back and down one side.
  const bx0 = -0.97;
  const bx1 = -0.3;
  const bz0 = -0.97;
  const bz1 = 0.5;
  const top = 0.06 + 1.2;
  parts.push({ geo: slab(bx0, bz0, bx1, bz1, 0.06, top), color: PAL.villaWall });
  parts.push({ geo: slab(bx0 - 0.005, bz0 - 0.005, bx1 + 0.005, bz1 + 0.005, 0.06, 0.16), color: PAL.villaShade });
  redBand(parts, (bx0 + bx1) / 2, (bz0 + bz1) / 2, bx1 - bx0, bz1 - bz0, top);
  hippedRoof(parts, (bx0 + bx1) / 2, (bz0 + bz1) / 2, bx1 - bx0, bz1 - bz0, top, 0.42);
  for (const z of [-0.6, -0.15, 0.3]) parts.push(...windowBack(bx0 - 0.004, 0.92, z));
  parts.push(...windowZ((bx0 + bx1) / 2, 0.92, bz1 + 0.004, 1), ...windowZ((bx0 + bx1) / 2, 0.42, bz1 + 0.004, 1));
  // The upper loggia along its front: a balcony floor, five columns, the dark of the room behind.
  const lx = bx1;
  parts.push({ geo: slab(lx - 0.02, bz0 + 0.08, lx + 0.003, bz1 - 0.08, 0.7, top - 0.12), color: PAL.door });
  parts.push({ geo: slab(lx, bz0 + 0.04, lx + 0.16, bz1 - 0.04, 0.66, 0.71), color: PAL.marble });
  for (let i = 0; i < 5; i++) parts.push(...column(lx + 0.12, bz0 + 0.1 + ((bz1 - bz0 - 0.2) * i) / 4, 0.71, 0.34));
  parts.push({ geo: slab(lx, bz0 + 0.04, lx + 0.17, bz1 - 0.04, 1.08, top - 0.04), color: PAL.villaBand });
  // The portico below it along the front of the house to the road: a floor, six columns, a lean-to roof.
  const px0 = bx1;
  const px1 = 0.86;
  const pz0 = -0.97;
  const pz1 = -0.55;
  parts.push({ geo: slab(px0, pz0, px1, pz1, 0.06, 0.1), color: PAL.marbleShade });
  parts.push({ geo: sloped(px0, pz0, px1, pz0 + 0.08, 0.79, 0.81, '-z', 0.06), color: PAL.villaWall });
  for (let i = 0; i < 6; i++) parts.push(...column(px0 + 0.1 + ((px1 - px0 - 0.16) * i) / 5, pz1 - 0.04, 0.1, 0.5));
  const pb = 0.1 + 0.5 + 0.035;
  parts.push({ geo: slab(px0, pz1 - 0.08, px1 + 0.02, pz1, pb, pb + 0.04), color: PAL.marble });
  parts.push({ geo: sloped(px0, pz0 - 0.03, px1 + 0.05, pz1 + 0.04, pb + 0.04 + 0.045, pb + 0.04 + 0.045 + 0.18, '-z', 0, 0.045), color: PAL.roofTile });
  parts.push({ geo: sloped(px1 - 0.02, pz0, px1 + 0.02, pz1, pb + 0.04, pb + 0.2, '-z', 0.06), color: PAL.villaWall });
  parts.push({ geo: slab(px1 - 0.025, pz0 + 0.12, px1 + 0.025, pz1 - 0.1, 0.06, 0.5), color: PAL.villaBand });
  // The garden: grass, a gravel walk to the house, the round basin, an olive tree and two cypresses.
  const gx0 = bx1;
  const gx1 = 0.9;
  const gz0 = pz1;
  const gz1 = 0.97;
  parts.push({ geo: slab(gx0 + 0.02, gz0 + 0.02, gx1 - 0.04, gz1 - 0.04, 0.06, 0.075), color: PAL.garden });
  parts.push({ geo: slab(gx0 + 0.02, -0.1, gx1 - 0.04, 0.06, 0.06, 0.08), color: PAL.courtyard });
  parts.push({ geo: cyl(0.17, 0.18, 0.08, 10).translate(0.34, 0.1, 0.42), color: PAL.marbleShade });
  parts.push({ geo: cyl(0.14, 0.14, 0.02, 10).translate(0.34, 0.14, 0.42), color: PAL.pool });
  parts.push({ geo: cyl(0.025, 0.03, 0.14, 5).translate(0.34, 0.2, 0.42), color: PAL.marble });
  parts.push(...olive(-0.02, 0.62, 1.1, 231));
  parts.push(...cypress(0.74, 0.22, 0.86), ...cypress(0.74, 0.76, 0.86));
  // The garden wall to the road and the far side, a gate, and a vine pergola along the far wall.
  parts.push({ geo: slab(gx1 - 0.06, gz0, gx1, -0.16, 0.06, 0.32), color: PAL.villaWall });
  parts.push({ geo: slab(gx1 - 0.06, 0.12, gx1, gz1, 0.06, 0.32), color: PAL.villaWall });
  parts.push({ geo: slab(gx0, gz1 - 0.06, gx1, gz1, 0.06, 0.32), color: PAL.villaWall });
  parts.push({ geo: slab(gx0, gz1 - 0.065, gx1 + 0.005, gz1 + 0.005, 0.28, 0.32), color: PAL.villaBand });
  for (const x of [-0.18, 0.18, 0.54]) parts.push({ geo: cyl(0.016, 0.016, 0.5, 4).translate(x, 0.31, gz1 - 0.24), color: PAL.wood });
  parts.push({ geo: lumpy(new THREE.BoxGeometry(0.86, 0.06, 0.24, 3, 1, 1), 0.25, 232).translate(0.18, 0.58, gz1 - 0.15), color: PAL.vineLeaf });
  parts.push(pithos(gx0 + 0.12, -0.36), amphora(gx0 + 0.3, -0.38, 0.2));
  return merge(parts);
}

// ---------------------------------------------------------------------------

/** Where the shrine's altar fire is, in its frame (for the smoke). */
export const SHRINE_FIRE = new THREE.Vector3(0.77, 0.3, 0);

/**
 * The shrine: a little marble temple on a stepped platform, its pediment and
 * four columns to the road, a lilac band round the frieze, an altar before
 * it with the offering fire, jars of offerings, and two cypresses behind.
 */
export function shrineModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  // The platform runs down into the ground, so on a slope it shows as a low stone base rather than floating.
  parts.push({ geo: slab(-0.9, -0.9, 0.9, 0.9, -0.5, 0.06), color: PAL.paving });
  parts.push({ geo: slab(-0.72, -0.56, 0.56, 0.56, 0.06, 0.14), color: PAL.marbleShade });
  parts.push({ geo: slab(-0.66, -0.5, 0.5, 0.5, 0.14, 0.2), color: PAL.marble });
  // The cella and its door.
  parts.push({ geo: slab(-0.6, -0.36, 0.06, 0.36, 0.2, 0.78), color: PAL.marble });
  parts.push({ geo: slab(0.06, -0.1, 0.075, 0.1, 0.2, 0.56), color: PAL.door });
  // Columns: four across the front, one more each side.
  for (const z of [-0.39, -0.13, 0.13, 0.39]) parts.push({ geo: cyl(0.045, 0.052, 0.56, 7).translate(0.4, 0.2 + 0.28, z), color: PAL.column });
  for (const z of [-0.39, 0.39]) parts.push({ geo: cyl(0.045, 0.052, 0.56, 7).translate(0.16, 0.2 + 0.28, z), color: PAL.column });
  // Architrave, the lilac frieze, the roof and its pediment.
  parts.push({ geo: slab(-0.64, -0.47, 0.48, 0.47, 0.76, 0.83), color: PAL.marble });
  parts.push({ geo: slab(-0.645, -0.475, 0.485, 0.475, 0.83, 0.88), color: PAL.lilac });
  parts.push({ geo: prism(1.2, 0.53, 0.26).translate(-0.08, 0.88, 0), color: PAL.roofTile });
  parts.push({ geo: gable(0.94, 0.23).rotateY(Math.PI / 2).translate(0.525, 0.885, 0), color: PAL.marble });
  parts.push({ geo: cyl(0.025, 0.025, 1.22, 5).rotateZ(Math.PI / 2).translate(-0.08, 1.14, 0), color: PAL.roofTileDark });
  // A finial on the gable.
  parts.push({ geo: new THREE.ConeGeometry(0.05, 0.1, 4).translate(0.52, 1.18, 0), color: PAL.marble });
  // The altar: a block with a lilac cloth over it, and the offering fire.
  parts.push({ geo: slab(0.66, -0.14, 0.88, 0.14, 0.06, 0.28), color: PAL.marble });
  parts.push({ geo: slab(0.655, -0.06, 0.885, 0.06, 0.1, 0.285), color: PAL.lilac });
  parts.push({ geo: new THREE.ConeGeometry(0.07, 0.16, 5).translate(0.77, 0.36, 0), color: PAL.ember });
  parts.push({ geo: new THREE.ConeGeometry(0.04, 0.11, 4).translate(0.775, 0.36, 0.01), color: PAL.flame });
  // Offerings: jars, a basket of fruit.
  parts.push(amphora(0.72, 0.56, 0.22), amphora(0.6, 0.66, 0.17), amphora(0.74, -0.6, 0.2));
  parts.push({ geo: cyl(0.08, 0.06, 0.06, 7).translate(0.56, 0.09, -0.66), color: PAL.basket });
  parts.push({ geo: new THREE.IcosahedronGeometry(0.04, 0).translate(0.55, 0.14, -0.66), color: PAL.poppy }, { geo: new THREE.IcosahedronGeometry(0.035, 0).translate(0.59, 0.14, -0.64), color: PAL.broom });
  parts.push(...cypress(-0.76, -0.72, 0.9), ...cypress(-0.76, 0.72, 0.9));
  return merge(parts);
}

/**
 * The tax office: a stone counting house under a tiled roof with its gable
 * to the road, a bronze-green band under the eaves and in the pediment, and
 * a porch of three columns where the collectors hand in. Under the porch,
 * the clerk's table with a balance on it, an iron-bound strongbox and a
 * stack of coin; by the road, a bronze-green banner on a pole so the office
 * reads from above among the houses. Frame as for the shrine (-0.9..0.9, front +x).
 */
export function taxOfficeModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  // The paved yard runs down into the ground, like the shrine's.
  parts.push({ geo: slab(-0.9, -0.9, 0.9, 0.9, -0.5, 0.05), color: PAL.paving });
  parts.push({ geo: slab(-0.74, -0.62, 0.66, 0.62, 0.05, 0.12), color: PAL.officeStoneShade });
  // The hall: dressed stone, a door to the porch, small high windows down the sides.
  const x0 = -0.68;
  const x1 = 0.2;
  const z0 = -0.56;
  const z1 = 0.56;
  const top = 0.86;
  parts.push({ geo: slab(x0, z0, x1, z1, 0.12, top), color: PAL.officeStone });
  parts.push({ geo: slab(x1 - 0.01, -0.12, x1 + 0.012, 0.12, 0.12, 0.56), color: PAL.door });
  for (const x of [-0.46, -0.12]) parts.push(...windowZ(x, 0.62, z1 + 0.004, 1), ...windowZ(x, 0.62, z0 - 0.004, -1));
  // The bronze-green band under the eaves, with a gilt line beneath.
  parts.push({ geo: slab(x0 - 0.006, z0 - 0.006, x1 + 0.006, z1 + 0.006, top - 0.08, top), color: PAL.bronzeGreen });
  parts.push({ geo: slab(x0 - 0.008, z0 - 0.008, x1 + 0.008, z1 + 0.008, top - 0.11, top - 0.08), color: PAL.strongboxBand });
  // The roof: ridge to the road, and a bronze-green pediment over the porch.
  const roofLen = 1.4;
  const roofMid = -0.1;
  parts.push({ geo: prism(roofLen, z1 + 0.1, 0.32).translate(roofMid, top, 0), color: PAL.roofTile });
  parts.push({ geo: cyl(0.028, 0.028, roofLen + 0.02, 5).rotateZ(Math.PI / 2).translate(roofMid, top + 0.32, 0), color: PAL.roofTileDark });
  parts.push({ geo: gable((z1 + 0.06) * 2, 0.29).rotateY(Math.PI / 2).translate(roofMid + roofLen / 2 + 0.006, top + 0.005, 0), color: PAL.bronzeGreen });
  parts.push({ geo: gable((z1 + 0.06) * 2, 0.29).rotateY(-Math.PI / 2).translate(roofMid - roofLen / 2 - 0.006, top + 0.005, 0), color: PAL.officeStoneShade });
  parts.push(...windowBack(x0 - 0.004, 0.6, -0.26), ...windowBack(x0 - 0.004, 0.6, 0.26));
  // The porch: three columns and the architrave they carry.
  const px = 0.54;
  for (const z of [-0.44, 0, 0.44]) parts.push({ geo: cyl(0.045, 0.052, top - 0.12, 7).translate(px, 0.12 + (top - 0.12) / 2, z), color: PAL.column });
  parts.push({ geo: slab(px - 0.06, z0, px + 0.06, z1, top - 0.11, top), color: PAL.officeStone });
  // Under the porch: the clerk's table with a balance, a strongbox, a stack of coin.
  parts.push({ geo: slab(0.28, 0.12, 0.44, 0.42, 0.24, 0.27), color: PAL.wood });
  for (const [x, z] of [[0.3, 0.14], [0.42, 0.14], [0.3, 0.4], [0.42, 0.4]]) parts.push({ geo: slab(x - 0.012, z - 0.012, x + 0.012, z + 0.012, 0.12, 0.24), color: PAL.woodDark });
  parts.push({ geo: cyl(0.008, 0.008, 0.14, 4).translate(0.36, 0.34, 0.27), color: PAL.bronzeGreenDark });
  parts.push({ geo: cyl(0.006, 0.006, 0.16, 4).rotateX(Math.PI / 2).translate(0.36, 0.41, 0.27), color: PAL.bronzeGreenDark });
  for (const z of [0.2, 0.34]) parts.push({ geo: cyl(0.03, 0.02, 0.012, 7).translate(0.36, 0.33, z), color: PAL.strongboxBand });
  parts.push({ geo: cyl(0.025, 0.025, 0.04, 7).translate(0.31, 0.29, 0.38), color: PAL.coin });
  parts.push({ geo: slab(0.26, -0.42, 0.44, -0.18, 0.12, 0.3), color: PAL.strongbox });
  parts.push({ geo: slab(0.255, -0.425, 0.445, -0.175, 0.3, 0.335), color: PAL.woodDark });
  for (const z of [-0.36, -0.24]) parts.push({ geo: slab(0.25, z - 0.012, 0.45, z + 0.012, 0.12, 0.34), color: PAL.strongboxBand });
  parts.push({ geo: slab(0.444, -0.315, 0.452, -0.285, 0.2, 0.26), color: PAL.strongboxBand });
  // By the road: the banner pole, and a stone bench where people wait their turn.
  parts.push({ geo: cyl(0.018, 0.022, 1.2, 5).translate(0.8, 0.6, -0.72), color: PAL.pole });
  parts.push({ geo: slab(0.796, -0.7, 0.804, -0.4, 0.78, 1.14), color: PAL.bronzeGreen });
  parts.push({ geo: slab(0.794, -0.7, 0.806, -0.4, 0.76, 0.79), color: PAL.strongboxBand });
  parts.push({ geo: slab(0.7, 0.5, 0.86, 0.84, 0.1, 0.16), color: PAL.officeStoneShade });
  parts.push({ geo: slab(0.72, 0.52, 0.84, 0.82, 0, 0.1), color: PAL.officeStoneShade });
  // Behind: sealed jars of the town's coin, and a cypress.
  parts.push(amphora(-0.8, 0.5, 0.2), amphora(-0.8, 0.3, 0.18));
  parts.push(...cypress(-0.78, -0.7, 0.86));
  return merge(parts);
}

/**
 * The watch post: a small stone guard house under tiles with a red band, and
 * beside it a lookout on four posts, its platform roofed, a red pennant over
 * it and a ladder up; a rack of leather buckets and a trough of water by the
 * road, a fire hook leaning on the wall. Its front faces +x.
 */
export function watchPostModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  parts.push({ geo: slab(-0.9, -0.9, 0.9, 0.9, -0.5, 0.05), color: PAL.pavingDark });
  // The guard house, at the back.
  const x0 = -0.72;
  const x1 = -0.02;
  const z0 = -0.7;
  const z1 = 0.1;
  const top = 0.66;
  parts.push({ geo: slab(x0, z0, x1, z1, 0.05, top), color: PAL.officeStone });
  parts.push({ geo: slab(x0 - 0.006, z0 - 0.006, x1 + 0.006, z1 + 0.006, top - 0.08, top), color: PAL.watchRed });
  parts.push({ geo: slab(x1 - 0.01, -0.42, x1 + 0.012, -0.2, 0.05, 0.42), color: PAL.door });
  parts.push(...windowZ(-0.36, 0.48, z1 + 0.004, 1));
  parts.push({ geo: prism(x1 - x0 + 0.16, (z1 - z0) / 2 + 0.08, 0.26).translate((x0 + x1) / 2, top, (z0 + z1) / 2), color: PAL.roofTile });
  parts.push({ geo: cyl(0.025, 0.025, x1 - x0 + 0.18, 5).rotateZ(Math.PI / 2).translate((x0 + x1) / 2, top + 0.26, (z0 + z1) / 2), color: PAL.roofTileDark });
  // The lookout: four posts, a planked platform with a rail, a little tiled roof, the pennant.
  const lx = -0.3;
  const lz = 0.5;
  const h = 1.15;
  for (const [dx, dz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) parts.push({ geo: cyl(0.03, 0.035, h + 0.42, 5).translate(lx + dx, (h + 0.42) / 2, lz + dz), color: PAL.woodDark });
  parts.push({ geo: slab(lx - 0.26, lz - 0.26, lx + 0.26, lz + 0.26, h - 0.05, h), color: PAL.wood });
  for (const [ax, az, bx, bz] of [[-0.24, -0.24, 0.24, -0.22], [-0.24, 0.22, 0.24, 0.24], [-0.24, -0.24, -0.22, 0.24], [0.22, -0.24, 0.24, 0.24]]) parts.push({ geo: slab(lx + ax, lz + az, lx + bx, lz + bz, h + 0.16, h + 0.2), color: PAL.woodDark });
  parts.push({ geo: new THREE.ConeGeometry(0.4, 0.22, 4).rotateY(Math.PI / 4).translate(lx, h + 0.53, lz), color: PAL.roofTile });
  parts.push({ geo: cyl(0.012, 0.012, 0.36, 4).translate(lx, h + 0.8, lz), color: PAL.pole });
  parts.push({ geo: slab(lx + 0.006, lz - 0.004, lx + 0.26, lz + 0.004, h + 0.82, h + 0.96), color: PAL.pennant });
  // A ladder up its side.
  for (const dz of [-0.08, 0.08]) parts.push({ geo: cyl(0.012, 0.012, h + 0.1, 4).rotateZ(-0.22).translate(lx + 0.38, (h + 0.1) / 2, lz + dz), color: PAL.wood });
  for (let i = 1; i < 6; i++) parts.push({ geo: cyl(0.008, 0.008, 0.16, 4).rotateX(Math.PI / 2).translate(lx + 0.38 + 0.12 - (i / 6) * 0.25, (i / 6) * (h + 0.05), lz), color: PAL.wood });
  // By the road: the rack of buckets, a trough of water, the hook against the wall.
  parts.push({ geo: slab(0.42, -0.62, 0.48, 0.02, 0.05, 0.44), color: PAL.woodDark });
  parts.push({ geo: slab(0.36, -0.62, 0.54, 0.02, 0.36, 0.39), color: PAL.wood });
  for (const z of [-0.5, -0.32, -0.14]) {
    parts.push({ geo: cyl(0.055, 0.045, 0.12, 6).translate(0.45, 0.25, z), color: PAL.bucket });
    parts.push({ geo: cyl(0.054, 0.054, 0.01, 6).translate(0.45, 0.305, z), color: PAL.leather });
  }
  parts.push({ geo: slab(0.5, 0.28, 0.82, 0.62, 0.05, 0.22), color: PAL.officeStoneShade });
  parts.push({ geo: slab(0.53, 0.31, 0.79, 0.59, 0.05, 0.205), color: PAL.bucketWater });
  parts.push({ geo: cyl(0.014, 0.014, 1.1, 4).rotateX(0.32).translate(0.0, 0.55, -0.82), color: PAL.wood });
  parts.push({ geo: cyl(0.01, 0.01, 0.16, 4).rotateZ(Math.PI / 2).translate(0.06, 1.06, -0.66), color: PAL.woodDark });
  return merge(parts);
}

/**
 * The architect's office: a whitewashed office with a porch on two columns
 * under a pediment, a slate-blue band; in the yard, dressed building stone
 * stacked ready and a wooden hoist (an A-frame with its rope and block), and
 * a drawing board under the porch. Its front faces +x.
 */
export function architectModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  parts.push({ geo: slab(-0.9, -0.9, 0.9, 0.9, -0.5, 0.05), color: PAL.paving });
  const x0 = -0.74;
  const x1 = 0.1;
  const z0 = -0.2;
  const z1 = 0.74;
  const top = 0.8;
  parts.push({ geo: slab(x0, z0, x1, z1, 0.05, top), color: PAL.whitewash });
  parts.push({ geo: slab(x0 - 0.006, z0 - 0.006, x1 + 0.006, z1 + 0.006, top - 0.08, top), color: PAL.inspectorDress });
  parts.push({ geo: slab(x1 - 0.01, 0.16, x1 + 0.012, 0.38, 0.05, 0.5), color: PAL.door });
  parts.push(...windowZ(-0.5, 0.56, z0 - 0.004, -1), ...windowZ(-0.2, 0.56, z0 - 0.004, -1));
  parts.push(...windowBack(x0 - 0.004, 0.56, 0.27));
  // The roof, ridge to the road, with a pediment over a porch on two columns.
  const len = x1 - x0 + 0.46;
  const mid = (x0 + x1 + 0.36) / 2;
  parts.push({ geo: prism(len, (z1 - z0) / 2 + 0.08, 0.3).translate(mid, top, (z0 + z1) / 2), color: PAL.roofTile });
  parts.push({ geo: cyl(0.026, 0.026, len + 0.02, 5).rotateZ(Math.PI / 2).translate(mid, top + 0.3, (z0 + z1) / 2), color: PAL.roofTileDark });
  parts.push({ geo: gable(z1 - z0 + 0.1, 0.27).rotateY(Math.PI / 2).translate(mid + len / 2 + 0.006, top + 0.005, (z0 + z1) / 2), color: PAL.whitewashShade });
  for (const z of [-0.08, 0.62]) parts.push({ geo: cyl(0.04, 0.046, top - 0.05, 7).translate(0.42, 0.05 + (top - 0.05) / 2, z), color: PAL.column });
  parts.push({ geo: slab(0.36, z0, 0.48, z1, top - 0.1, top), color: PAL.whitewashShade });
  // The drawing board on its trestle, a plan pinned to it.
  parts.push({ geo: slab(0.2, 0.42, 0.36, 0.64, 0.3, 0.32).rotateZ(-0.35), color: PAL.wood });
  parts.push({ geo: slab(0.22, 0.45, 0.34, 0.61, 0.32, 0.326).rotateZ(-0.35), color: PAL.bone });
  for (const z of [0.44, 0.62]) parts.push({ geo: cyl(0.01, 0.01, 0.3, 4).translate(0.28, 0.2, z), color: PAL.woodDark });
  // Dressed stone stacked in the yard, and the hoist over it.
  const blocks: Array<[number, number, number, number]> = [
    [0.28, -0.72, 0.05, 0],
    [0.5, -0.72, 0.05, 0],
    [0.72, -0.72, 0.05, 0],
    [0.39, -0.72, 0.17, 1],
    [0.61, -0.72, 0.17, 1],
    [0.28, -0.5, 0.05, 1],
    [0.5, -0.5, 0.05, 0],
  ];
  for (const [x, z, y, k] of blocks) parts.push({ geo: slab(x - 0.1, z - 0.08, x + 0.1, z + 0.08, y, y + 0.12), color: k ? PAL.stoneBlockShade : PAL.stoneBlock });
  for (const dz of [-0.26, 0.26]) {
    parts.push({ geo: cyl(0.016, 0.02, 1.0, 4).rotateZ(0.26).translate(-0.34, 0.5, -0.5 + dz * 0.6), color: PAL.wood });
    parts.push({ geo: cyl(0.016, 0.02, 1.0, 4).rotateZ(-0.26).translate(0.12, 0.5, -0.5 + dz * 0.6), color: PAL.wood });
  }
  parts.push({ geo: cyl(0.016, 0.016, 0.4, 4).rotateX(Math.PI / 2).translate(-0.11, 0.98, -0.5), color: PAL.woodDark });
  parts.push({ geo: cyl(0.006, 0.006, 0.5, 3).translate(-0.11, 0.72, -0.5), color: PAL.rope });
  parts.push({ geo: slab(-0.2, -0.58, -0.02, -0.42, 0.36, 0.47), color: PAL.stoneBlock });
  // A column being made in the front yard: two drums standing, the next one lying ready (the architect's trade at a glance).
  parts.push({ geo: cyl(0.1, 0.11, 0.05, 8).translate(0.7, 0.075, 0.42), color: PAL.stoneBlockShade });
  for (const [y, k] of [[0.1, 0], [0.26, 1]] as const) parts.push({ geo: cyl(0.075, 0.08, 0.16, 8).translate(0.7, y + 0.08, 0.42), color: k ? PAL.column : PAL.stoneBlock });
  parts.push({ geo: cyl(0.075, 0.075, 0.16, 8).rotateX(Math.PI / 2).rotateY(0.5).translate(0.68, 0.125, 0.1), color: PAL.column });
  parts.push(...cypress(-0.8, -0.78, 0.8));
  return merge(parts);
}

/**
 * Rubble on a footprint of `side` tiles (frame -side/2..side/2): a burnt
 * building's black timbers lying across a bed of ash, a scorched stub of wall
 * and a few cracked tiles; or a fallen one's heap of stone and broken roof
 * tiles round a standing corner of wall. Lumpy, so no two heaps look laid out.
 */
export function rubbleModel(side: number, burnt: boolean, seed: number): THREE.BufferGeometry {
  const parts: Part[] = [];
  const h = side / 2;
  const r = h - 0.16;
  const rnd = (k: number): number => {
    const v = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  parts.push({ geo: slab(-h + 0.08, -h + 0.08, h - 0.08, h - 0.08, -0.5, 0.03), color: burnt ? PAL.ash : PAL.pavingDark });
  parts.push({ geo: lumpy(new THREE.CylinderGeometry(r * 0.8, r * 0.95, 0.08, 7), 0.25, seed).scale(1, 1, 0.9).translate(0, 0.05, 0), color: burnt ? PAL.char : PAL.stoneBlockShade });
  // A stub of wall standing in one corner, and another fallen along a side.
  parts.push({ geo: slab(-r, -r, -r + 0.12, -r + side * 0.32, 0.03, burnt ? 0.42 : 0.6), color: burnt ? PAL.scorched : PAL.whitewashShade });
  parts.push({ geo: slab(-r, -r, -r + side * 0.26, -r + 0.12, 0.03, burnt ? 0.3 : 0.48), color: burnt ? PAL.scorched : PAL.whitewash });
  const n = side * side * 2 + 2;
  for (let i = 0; i < n; i++) {
    const x = (rnd(i) * 2 - 1) * r * 0.85;
    const z = (rnd(i + 50) * 2 - 1) * r * 0.85;
    if (burnt) {
      // Charred beams lying every which way.
      const len = 0.35 + rnd(i + 100) * 0.5;
      parts.push({ geo: new THREE.BoxGeometry(len, 0.07, 0.07).rotateZ((rnd(i + 150) - 0.5) * 0.5).rotateY(rnd(i + 200) * Math.PI).translate(x, 0.1 + rnd(i + 250) * 0.12, z), color: i % 3 ? PAL.char : PAL.charDark });
    } else {
      parts.push({ geo: lumpy(new THREE.DodecahedronGeometry(0.1 + rnd(i + 100) * 0.08, 0), 0.3, seed + i).translate(x, 0.1 + rnd(i + 250) * 0.1, z), color: i % 3 ? PAL.stoneBlock : PAL.stoneBlockShade });
    }
  }
  // Broken roof tiles, and on the fallen heap a beam sticking up out of it.
  for (let i = 0; i < side * 3; i++) {
    const x = (rnd(i + 300) * 2 - 1) * r * 0.8;
    const z = (rnd(i + 350) * 2 - 1) * r * 0.8;
    parts.push({ geo: new THREE.BoxGeometry(0.14, 0.025, 0.1).rotateY(rnd(i + 400) * Math.PI).rotateX((rnd(i + 450) - 0.5) * 0.6).translate(x, 0.12 + rnd(i + 500) * 0.08, z), color: burnt ? PAL.scorched : PAL.rubbleTile });
  }
  if (!burnt) parts.push({ geo: new THREE.BoxGeometry(0.07, 0.07, 0.8).rotateX(0.7).translate(r * 0.2, 0.32, r * 0.1), color: PAL.wood });
  else parts.push({ geo: new THREE.BoxGeometry(0.08, 0.08, 0.7).rotateX(0.9).rotateY(0.6).translate(r * 0.3, 0.28, -r * 0.1), color: PAL.charDark });
  return merge(parts);
}

/**
 * The theatre: a stepped bowl of stone seats rising round a round paved
 * orchestra, and the stage building (skene) along the road, with three doors
 * and painted panels to the audience, masks over the doors, a low stage
 * before it, and rose banners at its ends. Its frame spans -1.5..1.5.
 */
export function theatreModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  const ox = 0.08;
  // The seats: a stepped profile turned round the orchestra, a little more than half way.
  const prof: THREE.Vector2[] = [];
  const r0 = 0.64;
  const tiers = 6;
  const R = 1.3;
  const dr = (R - r0) / tiers;
  prof.push(new THREE.Vector2(r0, 0));
  for (let i = 0; i < tiers; i++) {
    const y = 0.08 + 0.095 * i;
    prof.push(new THREE.Vector2(r0 + dr * i, y), new THREE.Vector2(r0 + dr * (i + 1), y));
  }
  const phi0 = Math.PI - 0.32;
  const phiLen = Math.PI + 0.64;
  // Each tier's riser in shade and its seat in the light, so the steps read from above; the
  // seats alternate a little in tone, so the rows still read as rings from behind the bowl,
  // where the risers face away.
  let tread = 0;
  for (let i = 0; i < prof.length - 1; i++) {
    const a = prof[i];
    const c = prof[i + 1];
    const riser = Math.abs(a.x - c.x) < 1e-6;
    const color = riser ? PAL.seatStoneShade : tread++ % 2 ? PAL.seatStoneAlt : PAL.seatStone;
    parts.push({ geo: new THREE.LatheGeometry([a, c], 18, phi0, phiLen).translate(ox, 0, 0), color });
  }
  // Stairways up through the seats, dark wedges from the orchestra to the top row.
  for (let k = 1; k <= 4; k++) {
    const phi = phi0 + (phiLen * k) / 5;
    for (let i = 0; i < tiers; i++) {
      const r = r0 + dr * (i + 0.5);
      const y = 0.08 + 0.095 * i;
      parts.push({ geo: slab(-0.035, -dr / 2, 0.035, dr / 2, y - 0.04, y + 0.006).rotateY(phi).translate(ox + r * Math.sin(phi), 0, r * Math.cos(phi)), color: PAL.seatStair });
    }
  }
  // Behind the top row, a grassy bank slopes down to the ground, as if the seats were cut into a hillside.
  // A band of dressed stone round the top, so from behind (and from above) the bowl reads as built seats, not a mound.
  const topY = prof[prof.length - 1].y;
  const wallY = topY * 0.55;
  const wall = [new THREE.Vector2(R, topY), new THREE.Vector2(R + 0.04, topY), new THREE.Vector2(R + 0.04, wallY)];
  parts.push({ geo: new THREE.LatheGeometry(wall, 18, phi0, phiLen).translate(ox, 0, 0), color: PAL.seatStoneShade });
  const bank = [new THREE.Vector2(R + 0.04, wallY), new THREE.Vector2(1.48, 0)];
  parts.push({ geo: new THREE.LatheGeometry(bank, 18, phi0, phiLen).translate(ox, 0, 0), color: PAL.meadow });
  // The cut ends of the bowl, closed with the same profile (seats and bank).
  const shape = new THREE.Shape([...prof, ...wall.slice(1), ...bank.slice(1)].map((p) => new THREE.Vector2(p.x, p.y)));
  for (const phi of [phi0, phi0 + phiLen]) parts.push({ geo: new THREE.ShapeGeometry(shape).rotateY(phi - Math.PI / 2).translate(ox, 0, 0), color: PAL.seatStoneShade });
  // A scatter of people on the seats, watching.
  const tunics = [PAL.tunicTerracotta, PAL.tunicBlue, PAL.tunicOchre, PAL.tunicCream, PAL.tunicGreen, PAL.tunicPlum];
  for (let k = 0; k < 11; k++) {
    const tier = 1 + (k * 7) % (tiers - 1);
    const phi = phi0 + 0.35 + ((k * 0.618) % 1) * (phiLen - 0.7);
    const r = r0 + dr * (tier + 0.45);
    const y = 0.08 + 0.095 * tier;
    const x = ox + r * Math.sin(phi);
    const z = r * Math.cos(phi);
    parts.push({ geo: new THREE.CylinderGeometry(0.035, 0.05, 0.1, 5).translate(x, y + 0.05, z), color: tunics[k % tunics.length] });
    parts.push({ geo: new THREE.IcosahedronGeometry(0.035, 0).translate(x, y + 0.13, z), color: PAL.skin });
  }
  // The orchestra: a paved round with the little altar in the middle.
  parts.push({ geo: cyl(r0 - 0.02, r0 - 0.02, 0.03, 18).translate(ox, 0.015, 0), color: PAL.courtyard });
  parts.push({ geo: cyl(0.06, 0.07, 0.1, 6).translate(ox, 0.08, 0), color: PAL.marble });
  // The stage before the skene.
  const sx0 = 0.82;
  const sx1 = 1.04;
  parts.push({ geo: slab(sx0 - 0.08, -0.96, sx1, 0.96, 0, 0.2), color: PAL.timber });
  parts.push({ geo: slab(sx0 - 0.085, -0.97, sx0 - 0.07, 0.97, 0.2, 0.23), color: PAL.timberDark });
  for (const z of [-0.6, 0, 0.6]) parts.push({ geo: slab(sx0 - 0.09, z - 0.2, sx0 - 0.08, z + 0.2, 0.04, 0.17), color: PAL.rose });
  // The skene: a long two-storey stage building along the road, a tile roof.
  const kx0 = sx1;
  const kx1 = 1.4;
  const kz = 1.08;
  const kh = 0.84;
  parts.push({ geo: slab(kx0, -kz, kx1, kz, 0, kh), color: PAL.skene });
  parts.push({ geo: prism(2 * kz + 0.12, (kx1 - kx0) / 2 + 0.07, 0.18).rotateY(Math.PI / 2).translate((kx0 + kx1) / 2, kh, 0), color: PAL.roofTile });
  for (const s of [-1, 1]) parts.push({ geo: gable(kx1 - kx0, 0.17).translate((kx0 + kx1) / 2, kh, s * (kz + 0.001)), color: PAL.skene });
  parts.push({ geo: slab(kx0 - 0.006, -kz - 0.006, kx1 + 0.006, kz + 0.006, kh - 0.08, kh - 0.02), color: PAL.bandBlue });
  // Three doors to the audience, painted panels between, a mask over each side door.
  for (const z of [-0.55, 0, 0.55]) parts.push({ geo: slab(kx0 - 0.012, z - 0.1, kx0, z + 0.1, 0.2, 0.52), color: PAL.door });
  for (const z of [-0.82, -0.27, 0.27, 0.82]) parts.push({ geo: slab(kx0 - 0.01, z - 0.1, kx0, z + 0.1, 0.24, 0.5), color: z < 0 ? PAL.bandBlue : PAL.rose });
  for (const z of [-0.55, 0.55]) {
    parts.push({ geo: new THREE.IcosahedronGeometry(0.09, 0).scale(0.3, 1.1, 0.9).translate(kx0 - 0.01, 0.64, z), color: PAL.mask });
    parts.push({ geo: slab(kx0 - 0.045, z - 0.05, kx0 - 0.03, z + 0.05, 0.58, 0.6), color: PAL.door });
  }
  // The street side: a door and two windows.
  parts.push({ geo: slab(kx1, -0.11, kx1 + 0.015, 0.11, 0, 0.42), color: PAL.door });
  parts.push(...windowX(kx1 + 0.004, 0.6, -0.6), ...windowX(kx1 + 0.004, 0.6, 0.6));
  // Rose banners on poles at each end of the skene.
  for (const s of [-1, 1]) {
    const z = s * (kz + 0.12);
    parts.push({ geo: cyl(0.016, 0.016, 1.3, 4).translate(1.22, 0.65, z), color: PAL.pole });
    parts.push({ geo: slab(1.235, z - 0.006, 1.42, z + 0.006, 0.86, 1.24), color: PAL.rose });
    parts.push({ geo: slab(1.235, z - 0.007, 1.42, z + 0.007, 0.92, 0.96), color: PAL.bandOchre });
  }
  return merge(parts);
}
