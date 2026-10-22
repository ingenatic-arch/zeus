/**
 * The great houses (slice 36): the estate's plot, the estate and the great
 * estate (drawn with the other homes by Homes), the horse farm (drawn with
 * the workplaces by Works), and the horse: a model for the paddocks and
 * stable yards (animals.ts), the riders of a company of horsemen (army.ts)
 * and a groom leading one (walkers.ts).
 *
 * Local frame as the homes': the footprint's centre at the origin, the front
 * (the gate, towards the road) facing +x. An estate spans -2..2, the horse
 * farm -1.5..1.5.
 *
 * The estate's layout: the house across the back left (two storeys, hipped
 * roof, a porch of columns to the court), a walled garden behind on the
 * right (a pool, cypresses, an olive, clipped hedges), a servants' wing down
 * the left wall, the stable along the right wall with its yard before it, a
 * paved court in the middle, all within a whitewashed wall with a gatehouse
 * to the road. The great estate raises the house a storey with a loggia, a
 * portico with a pediment before it, marble statues in the garden, and a
 * longer stable with a hay loft.
 */
import * as THREE from 'three';
import { hash2 } from '../map/noise';
import { column, cypress, gable, gableRoof, hippedRoof, olive, pithos, redBand, slab, sloped, windowZ } from './grand';
import { cyl, prism, windowBack, windowX } from './homes';
import { PAL } from './palette';
import { lumpy, merge, type Part } from './trees';
import { leg, mergeTinted, type TPart } from './walkers';

// ---------------------------------------------------------------------------
// Pieces.

/** A whitewashed wall with a tiled coping, from (x0, z0) to (x1, z1) (along x or z), `h` tall. */
function wall(parts: Part[], x0: number, z0: number, x1: number, z1: number, h: number): void {
  const t = 0.045;
  const ax = Math.min(x0, x1) - (x0 === x1 ? t : 0);
  const bx = Math.max(x0, x1) + (x0 === x1 ? t : 0);
  const az = Math.min(z0, z1) - (z0 === z1 ? t : 0);
  const bz = Math.max(z0, z1) + (z0 === z1 ? t : 0);
  parts.push({ geo: slab(ax, az, bx, bz, -0.1, h), color: PAL.villaWall });
  parts.push({ geo: slab(ax - 0.012, az - 0.012, bx + 0.012, bz + 0.012, -0.1, 0.07), color: PAL.villaShade });
  parts.push({ geo: slab(ax - 0.02, az - 0.02, bx + 0.02, bz + 0.02, h, h + 0.035), color: PAL.roofTile });
}

/** A statue on a plinth: a figure in marble, `h` tall, its plinth at (x, z). */
function statue(x: number, z: number, h: number, turn: number, seed: number): Part[] {
  const out: Part[] = [{ geo: slab(x - 0.07, z - 0.07, x + 0.07, z + 0.07, 0.05, 0.17), color: PAL.marbleShade }];
  const body = new THREE.CylinderGeometry(0.035, 0.05, h * 0.62, 6).translate(0, 0.17 + h * 0.31, 0);
  const head = new THREE.IcosahedronGeometry(0.032, 0).translate(0, 0.17 + h * 0.7, 0);
  // One arm raised (a god with a spear, an athlete with a wreath), turned its own way.
  const arm = new THREE.CylinderGeometry(0.011, 0.01, h * 0.34, 4).rotateZ(0.5 + hash2(seed, 1, 3601) * 0.6).translate(0.04, 0.17 + h * 0.62, 0.03);
  for (const g of [body, head, arm]) out.push({ geo: g.rotateY(turn).translate(x, 0, z), color: PAL.marble });
  return out;
}

/** A low clipped hedge from (x0, z0) to (x1, z1). */
function hedge(x0: number, z0: number, x1: number, z1: number, seed: number): Part {
  const dx = Math.abs(x1 - x0) + 0.08;
  const dz = Math.abs(z1 - z0) + 0.08;
  return { geo: lumpy(new THREE.BoxGeometry(dx, 0.11, dz, Math.max(1, Math.round(dx * 4)), 1, Math.max(1, Math.round(dz * 4))), 0.12, seed).translate((x0 + x1) / 2, 0.11, (z0 + z1) / 2), color: PAL.gardenDark };
}

/** A bale of hay. */
const hayBale = (x: number, z: number, y: number, turn: number): Part => ({ geo: new THREE.BoxGeometry(0.2, 0.1, 0.12).rotateY(turn).translate(x, y + 0.05, z), color: PAL.hay });

/** A wooden water trough on legs. */
function horseTrough(x: number, z: number, along: 'x' | 'z'): Part[] {
  const [lx, lz] = along === 'x' ? [0.34, 0.12] : [0.12, 0.34];
  return [
    { geo: slab(x - lx / 2, z - lz / 2, x + lx / 2, z + lz / 2, 0.06, 0.14), color: PAL.woodDark },
    { geo: slab(x - lx / 2 + 0.02, z - lz / 2 + 0.02, x + lx / 2 - 0.02, z + lz / 2 - 0.02, 0.13, 0.142), color: PAL.basinWater },
  ];
}

/** A post-and-rail fence from (x0, z0) to (x1, z1). */
function fence(parts: Part[], x0: number, z0: number, x1: number, z1: number): void {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.round(len / 0.32));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const z = z0 + ((z1 - z0) * i) / n;
    parts.push({ geo: cyl(0.016, 0.02, 0.26, 4).translate(x, 0.1, z), color: PAL.woodDark });
  }
  const ang = Math.atan2(z1 - z0, x1 - x0);
  for (const y of [0.12, 0.2]) parts.push({ geo: new THREE.BoxGeometry(len, 0.018, 0.014).rotateY(-ang).translate((x0 + x1) / 2, y, (z0 + z1) / 2), color: PAL.wood });
}

// ---------------------------------------------------------------------------
// The estate.

/** The estate's plot: corner stakes with their flags, the line of its wall traced in chalk, its gate and its house pegged out. */
export function estatePlotModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  const line = (x0: number, z0: number, x1: number, z1: number): void => {
    parts.push({ geo: slab(Math.min(x0, x1) - 0.025, Math.min(z0, z1) - 0.025, Math.max(x0, x1) + 0.025, Math.max(z0, z1) + 0.025, 0.0, 0.03), color: PAL.plotLine });
  };
  const e = 1.86;
  line(-e, -e, e, -e);
  line(-e, e, e, e);
  line(-e, -e, -e, e);
  line(e, -e, e, -0.34);
  line(e, 0.34, e, e);
  // The house and the stable, pegged out.
  line(-1.75, -1.75, -0.75, -1.75);
  line(-0.75, -1.75, -0.75, 0.25);
  line(-1.75, 0.25, -0.75, 0.25);
  line(0.25, 1.35, 1.75, 1.35);
  const flag = new THREE.BufferGeometry();
  flag.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.34, 0, 0, 0.25, 0, 0.13, 0.3, 0.0, 0, 0.25, 0, 0, 0.34, 0, 0.13, 0.3, 0.0], 3));
  for (const [x, z] of [[-e, -e], [e, -e], [-e, e], [e, e], [e, -0.34], [e, 0.34], [-0.75, -1.75], [-0.75, 0.25]]) {
    parts.push({ geo: new THREE.BoxGeometry(0.03, 0.36, 0.03).translate(x, 0.16, z), color: PAL.stake });
    parts.push({ geo: flag.clone().translate(x, 0, z), color: PAL.flag });
  }
  // A heap of dressed stone by the gate, waiting.
  for (let i = 0; i < 4; i++) parts.push({ geo: new THREE.BoxGeometry(0.16, 0.08, 0.1).translate(1.45 - (i % 2) * 0.18, 0.04 + Math.floor(i / 2) * 0.08, -0.8 + (i % 2) * 0.05), color: PAL.stoneBlock });
  return merge(parts);
}

/** Where an estate's horses stand (the stable yard), in its frame: x0, z0, x1, z1. */
export const STABLE_YARD: readonly [number, number, number, number] = [0.3, 0.5, 1.75, 1.12];

/** An estate (great: a great estate). */
export function estateModel(great: boolean): THREE.BufferGeometry {
  const parts: Part[] = [];
  // The terrace it stands on, the court's paving, the garden's earth and the stable yard's.
  parts.push({ geo: slab(-1.99, -1.99, 1.99, 1.99, -0.22, 0.05), color: PAL.plinth });
  parts.push({ geo: slab(-0.66, -1.32, 1.92, 0.4, 0.05, 0.065), color: PAL.courtyard });
  parts.push({ geo: slab(-1.92, 0.4, 0.05, 1.92, 0.05, 0.07), color: PAL.garden });
  parts.push({ geo: slab(0.12, 0.4, 1.92, 1.92, 0.05, 0.062), color: PAL.earthWorn });
  // The wall round it all, the gate in the front.
  const W = 1.95;
  const H = 0.46;
  wall(parts, -W, -W, -W, W, H);
  wall(parts, -W, -W, W, -W, H);
  wall(parts, -W, W, W, W, H);
  wall(parts, W, -W, W, -0.34, H);
  wall(parts, W, 0.34, W, W, H);
  // The gatehouse: two piers, a lintel, a little tiled roof, the doors standing open.
  for (const z of [-0.36, 0.36]) parts.push({ geo: slab(W - 0.08, z - 0.07, W + 0.08, z + 0.07, 0.0, 0.72), color: PAL.marble });
  parts.push({ geo: slab(W - 0.1, -0.44, W + 0.1, 0.44, 0.72, 0.8), color: PAL.marbleShade });
  parts.push({ geo: prism(0.3, 0.5, 0.18).rotateY(Math.PI / 2).translate(W, 0.8, 0), color: PAL.roofTile });
  for (const s of [-1, 1]) parts.push({ geo: slab(-0.012, 0, 0.012, 0.3, 0.06, 0.62).rotateY(s * 0.4).translate(W - 0.1, 0, s * 0.3 - (s > 0 ? 0.3 : 0)), color: PAL.villaBand });
  parts.push({ geo: slab(W, -0.32, W + 0.06, 0.32, -0.04, 0.04), color: PAL.marbleShade });
  // The house across the back left.
  const hx0 = -1.88;
  const hx1 = -0.72;
  const hz0 = -1.88;
  const hz1 = 0.32;
  const top = great ? 1.5 : 1.12;
  const hcx = (hx0 + hx1) / 2;
  const hcz = (hz0 + hz1) / 2;
  parts.push({ geo: slab(hx0, hz0, hx1, hz1, 0.05, top), color: PAL.villaWall });
  parts.push({ geo: slab(hx0 - 0.005, hz0 - 0.005, hx1 + 0.005, hz1 + 0.005, 0.05, 0.17), color: PAL.villaShade });
  redBand(parts, hcx, hcz, hx1 - hx0, hz1 - hz0, top);
  hippedRoof(parts, hcx, hcz, hx1 - hx0, hz1 - hz0, top, great ? 0.5 : 0.42);
  const floors = great ? [0.42, 0.86, 1.26] : [0.42, 0.86];
  for (const y of floors) {
    for (const z of [-1.55, -1.0, -0.45, 0.05]) {
      parts.push(...windowBack(hx0 - 0.004, y, z));
      if (y > 0.5) parts.push(...windowX(hx1 + 0.004, y, z));
    }
    for (const x of [-1.6, -1.0]) parts.push(...windowZ(x, y, hz0 - 0.004, -1), ...windowZ(x, y, hz1 + 0.004, 1));
  }
  // Its door to the court, and a porch of columns before it (a portico with a pediment at a great estate).
  parts.push({ geo: slab(hx1, -0.95, hx1 + 0.012, -0.55, 0.06, 0.48), color: PAL.door });
  if (great) {
    const px = hx1 + 0.38;
    parts.push({ geo: slab(hx1, -1.5, px + 0.06, 0.1, 0.05, 0.1), color: PAL.marbleShade });
    for (let i = 0; i < 5; i++) parts.push(...column(px, -1.4 + i * 0.35, 0.1, 0.62));
    parts.push({ geo: slab(hx1, -1.5, px + 0.07, 0.1, 0.75, 0.83), color: PAL.marble });
    parts.push({ geo: sloped(hx1, -1.52, px + 0.1, 0.12, 0.83, 1.02, '-x', 0, 0.04), color: PAL.roofTile });
    parts.push({ geo: gable(1.62, 0.2).rotateY(Math.PI / 2).translate(px + 0.071, 0.83, -0.7), color: PAL.marble });
    // The loggia along the upper floor's front.
    for (let i = 0; i < 6; i++) parts.push(...column(hx1 + 0.03, -1.75 + i * 0.4, 1.02, 0.32));
  } else {
    const px = hx1 + 0.3;
    for (const z of [-1.2, -0.75, -0.3]) parts.push(...column(px, z, 0.06, 0.5));
    parts.push({ geo: sloped(hx1, -1.35, px + 0.08, -0.15, 0.6, 0.78, '-x', 0, 0.04), color: PAL.roofTile });
  }
  // The servants' wing and store down the left wall, one storey, its roof sloping into the court.
  const wx0 = -0.66;
  const wx1 = great ? 1.2 : 0.95;
  const wz0 = -1.9;
  const wz1 = -1.36;
  parts.push({ geo: sloped(wx0, wz0, wx1, wz1, 0.55, 0.72, '-z', 0.05), color: PAL.villaWall });
  parts.push({ geo: sloped(wx0 - 0.03, wz0 - 0.03, wx1 + 0.03, wz1 + 0.08, 0.57, 0.78, '-z', 0, 0.04), color: PAL.roofTile });
  for (const x of [-0.3, 0.2, 0.7]) if (x < wx1 - 0.15) parts.push(...windowZ(x, 0.36, wz1 + 0.004, 1));
  parts.push({ geo: slab(0.42, wz1, 0.58, wz1 + 0.012, 0.06, 0.42), color: PAL.door });
  // A well in the court, jars by the wing.
  parts.push({ geo: cyl(0.11, 0.12, 0.16, 8).translate(0.75, 0.13, -0.6), color: PAL.fountainStone });
  parts.push({ geo: cyl(0.085, 0.085, 0.02, 8).translate(0.75, 0.215, -0.6), color: PAL.basinWater });
  for (const x of [0.66, 0.84]) parts.push({ geo: cyl(0.008, 0.008, 0.26, 3).translate(x, 0.33, -0.6), color: PAL.wood });
  parts.push({ geo: cyl(0.008, 0.008, 0.24, 3).rotateZ(Math.PI / 2).translate(0.75, 0.46, -0.6), color: PAL.wood });
  parts.push(pithos(1.45, -1.2), pithos(1.62, -1.12));
  // The garden behind: hedged beds round a pool, cypresses, an olive (statues at a great estate).
  parts.push(hedge(-1.8, 0.5, -0.05, 0.5, 3611), hedge(-0.05, 0.5, -0.05, 1.82, 3612));
  parts.push({ geo: slab(-1.35, 0.85, -0.55, 1.45, 0.06, 0.09), color: PAL.marbleShade });
  parts.push({ geo: slab(-1.3, 0.9, -0.6, 1.4, 0.06, 0.095), color: PAL.pool });
  parts.push(...cypress(-1.75, 0.7, 0.85), ...cypress(-1.75, 1.75, 0.85), ...cypress(-0.2, 1.75, 0.8));
  parts.push(...olive(-0.35, 0.85, 1.1, 3613));
  if (great) {
    parts.push(...statue(-1.55, 1.15, 0.42, 0.4, 1), ...statue(-0.4, 1.4, 0.42, -0.8, 2), ...statue(-0.95, 0.68, 0.38, 2.6, 3));
    parts.push(...statue(1.55, -0.3, 0.46, Math.PI, 4), ...statue(1.55, 0.3, 0.46, Math.PI, 5));
  } else {
    parts.push(pithos(-0.95, 0.68));
  }
  // The stable along the right wall, open to its yard; hay, a trough.
  const sx0 = great ? 0.12 : 0.55;
  const sx1 = 1.9;
  const sz0 = 1.3;
  const sz1 = 1.9;
  const eave = 0.5;
  parts.push({ geo: slab(sx0, sz1 - 0.06, sx1, sz1, 0.05, eave), color: PAL.timber });
  for (const x of [sx0, sx1 - 0.05]) parts.push({ geo: slab(x, sz0, x + 0.05, sz1, 0.05, eave), color: PAL.timber });
  const stalls = Math.round((sx1 - sx0) / 0.35);
  for (let i = 0; i <= stalls; i++) parts.push({ geo: cyl(0.02, 0.024, eave - 0.05, 4).translate(sx0 + 0.03 + ((sx1 - sx0 - 0.06) * i) / stalls, 0.05 + (eave - 0.05) / 2, sz0 + 0.02), color: PAL.woodDark });
  for (let i = 1; i < stalls; i++) parts.push({ geo: slab(sx0 + ((sx1 - sx0) * i) / stalls - 0.01, sz0 + 0.12, sx0 + ((sx1 - sx0) * i) / stalls + 0.01, sz1 - 0.06, 0.05, 0.3), color: PAL.timberDark });
  parts.push({ geo: slab(sx0, sz0 + 0.1, sx1, sz1 - 0.06, 0.06, 0.075), color: PAL.straw });
  gableRoofX(parts, (sx0 + sx1) / 2, (sz0 + sz1) / 2, sx1 - sx0, sz1 - sz0, eave, 0.24);
  if (great) for (let i = 0; i < 4; i++) parts.push(hayBale(sx0 + 0.2 + (i % 2) * 0.22, sz0 - 0.18 - Math.floor(i / 2) * 0.02, Math.floor(i / 2) * 0.1 + 0.05, 0.1 * i));
  else parts.push(hayBale(sx0 - 0.2, sz0 + 0.1, 0.05, 1.5), hayBale(sx0 - 0.2, sz0 + 0.3, 0.05, 1.6));
  parts.push(...horseTrough(1.55, 0.62, 'x'));
  // The yard's rail, between the court and the stable yard.
  fence(parts, 0.12, 0.42, 1.15, 0.42);
  return merge(parts);
}

/** A tiled gable roof whose ridge runs along x, over a box of (dx, dz) at height `top`. */
function gableRoofX(parts: Part[], cx: number, cz: number, dx: number, dz: number, top: number, h: number): void {
  parts.push({ geo: prism(dx + 0.12, dz / 2 + 0.08, h).translate(cx, top, cz), color: PAL.roofTile });
  parts.push({ geo: cyl(0.025, 0.025, dx + 0.14, 5).rotateZ(Math.PI / 2).translate(cx, top + h, cz), color: PAL.roofTileDark });
  const g = gable(dz, h * 0.94).rotateY(Math.PI / 2);
  parts.push({ geo: g.clone().translate(cx + dx / 2 + 0.001, top, cz), color: PAL.timber });
  parts.push({ geo: g.translate(cx - dx / 2 - 0.001, top, cz), color: PAL.timber });
}

// ---------------------------------------------------------------------------
// The horse farm.

/** The horse farm's paddock, where its horses graze, in its frame: x0, z0, x1, z1. */
export const PADDOCK: readonly [number, number, number, number] = [-0.5, -1.25, 1.25, 0.45];

/** The horse farm: a long stable at the back, a fenced paddock, the groom's hut by the road, hay and a trough. */
export function horseFarmModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  parts.push({ geo: slab(-1.48, -1.48, 1.48, 1.48, -0.12, 0.03), color: PAL.earth });
  parts.push({ geo: slab(PADDOCK[0] - 0.1, PADDOCK[1] - 0.1, PADDOCK[2] + 0.1, PADDOCK[3] + 0.1, 0.02, 0.04), color: PAL.dryGrass });
  // The stable along the back, open to the paddock.
  const x0 = -1.45;
  const x1 = -0.8;
  const z0 = -1.42;
  const z1 = 1.0;
  const eave = 0.55;
  parts.push({ geo: slab(x0, z0, x0 + 0.06, z1, 0.03, eave), color: PAL.whitewash });
  for (const z of [z0, z1 - 0.06]) parts.push({ geo: slab(x0, z, x1, z + 0.06, 0.03, eave), color: PAL.whitewash });
  const n = 6;
  for (let i = 0; i <= n; i++) parts.push({ geo: cyl(0.022, 0.026, eave - 0.03, 4).translate(x1 - 0.03, 0.03 + (eave - 0.03) / 2, z0 + 0.03 + ((z1 - z0 - 0.06) * i) / n), color: PAL.woodDark });
  for (let i = 1; i < n; i++) parts.push({ geo: slab(x0 + 0.06, z0 + ((z1 - z0) * i) / n - 0.01, x1 - 0.1, z0 + ((z1 - z0) * i) / n + 0.01, 0.03, 0.3), color: PAL.timberDark });
  parts.push({ geo: slab(x0 + 0.06, z0 + 0.06, x1 - 0.03, z1 - 0.06, 0.035, 0.05), color: PAL.straw });
  gableRoof(parts, (x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, eave, 0.3);
  // Hay stacked at the stable's end, and a cart of it.
  for (let i = 0; i < 5; i++) parts.push(hayBale(-1.3 + (i % 3) * 0.2, 1.22 - (i > 2 ? 0.03 : 0), i > 2 ? 0.13 : 0.03, Math.PI / 2 + 0.1 * i));
  parts.push({ geo: lumpy(new THREE.ConeGeometry(0.22, 0.34, 7), 0.1, 3621).translate(-0.62, 0.2, 1.22), color: PAL.hay });
  // The paddock's fence, its gate to the road, a trough.
  const [px0, pz0, px1, pz1] = PADDOCK;
  const fx0 = px0 - 0.12;
  const fz0 = pz0 - 0.12;
  const fx1 = px1 + 0.12;
  const fz1 = pz1 + 0.12;
  fence(parts, fx0, fz0, fx1, fz0);
  fence(parts, fx0, fz1, fx1, fz1);
  fence(parts, fx0, fz0, fx0, fz1);
  fence(parts, fx1, fz0, fx1, -0.55);
  fence(parts, fx1, -0.15, fx1, fz1);
  parts.push({ geo: slab(fx1 - 0.01, -0.55, fx1 + 0.01, -0.34, 0.06, 0.24).rotateY(0), color: PAL.wood });
  parts.push(...horseTrough(-0.35, -0.95, 'z'));
  parts.push(...horseTrough(0.9, 0.25, 'x'));
  // The groom's hut by the road.
  const hx0 = 0.72;
  const hx1 = 1.42;
  const hz0 = 0.78;
  const hz1 = 1.42;
  parts.push({ geo: slab(hx0, hz0, hx1, hz1, 0.03, 0.46), color: PAL.whitewash });
  parts.push({ geo: slab(hx0 - 0.005, hz0 - 0.005, hx1 + 0.005, hz1 + 0.005, 0.03, 0.1), color: PAL.whitewashShade });
  gableRoof(parts, (hx0 + hx1) / 2, (hz0 + hz1) / 2, hx1 - hx0, hz1 - hz0, 0.46, 0.22);
  parts.push({ geo: slab(hx1, 1.0, hx1 + 0.012, 1.2, 0.04, 0.36), color: PAL.door });
  parts.push(...windowZ(1.07, 0.3, hz0 - 0.004, -1));
  // Saddles and bridles on a rail by the hut.
  parts.push({ geo: slab(0.3, 1.2, 0.62, 1.22, 0.24, 0.26), color: PAL.wood });
  for (const x of [0.32, 0.6]) parts.push({ geo: cyl(0.012, 0.012, 0.25, 3).translate(x, 0.13, 1.21), color: PAL.woodDark });
  for (const x of [0.38, 0.54]) parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.05, 0), 0.2, 3622).scale(1.4, 0.6, 1).translate(x, 0.27, 1.21), color: PAL.leather });
  return merge(parts);
}

// ---------------------------------------------------------------------------
// The horse.

/** Horses' coats: bay, chestnut, grey, black, dun. */
export const HORSE_COATS = ['#6e4228', '#9a5a2e', '#b9b3a8', '#2f2823', '#a8865a', '#5e3a24'];
/** Its mane, tail and hooves. */
const MANE = '#2a211b';

/** A horse, about 0.5 long and 0.48 tall at the ears, facing +x: the coat is the tinted part; its legs swing. `still`: no swing (as led, at a walk, they still swing). */
export function horseParts(): TPart[] {
  const parts: TPart[] = [
    { geo: lumpy(new THREE.IcosahedronGeometry(0.1, 1), 0.04, 3631).scale(1.75, 0.72, 0.66).translate(0, 0.26, 0), color: '', tint: true },
    // The neck up and forward, the head down from it.
    { geo: new THREE.CylinderGeometry(0.035, 0.055, 0.2, 6).rotateZ(-0.65).translate(0.18, 0.35, 0), color: '', tint: true },
    { geo: lumpy(new THREE.BoxGeometry(0.15, 0.06, 0.055), 0.08, 3632).rotateZ(-0.9).translate(0.27, 0.4, 0), color: '', tint: true },
    // Ears, mane, the tail.
    { geo: new THREE.ConeGeometry(0.012, 0.04, 3).translate(0.25, 0.47, 0.018), color: '', tint: true },
    { geo: new THREE.ConeGeometry(0.012, 0.04, 3).translate(0.25, 0.47, -0.018), color: '', tint: true },
    { geo: new THREE.BoxGeometry(0.17, 0.035, 0.02).rotateZ(-0.65).translate(0.15, 0.4, 0), color: MANE },
    { geo: new THREE.CylinderGeometry(0.012, 0.028, 0.18, 4).rotateZ(-0.35).translate(-0.2, 0.22, 0), color: MANE },
  ];
  // Long legs, a walking gait (diagonal pairs together); dark hooves.
  for (const [x, z, w] of [[-0.12, -0.04, 0.8], [-0.12, 0.04, -0.8], [0.12, -0.04, -0.8], [0.12, 0.04, 0.8]] as const) {
    parts.push({ ...leg(x, z, 0.2, 0.017, '', w), tint: true });
    parts.push({ geo: new THREE.CylinderGeometry(0.02, 0.022, 0.03, 4).translate(x, 0.015, z), color: MANE, leg: [w, x, 0.2] });
  }
  return parts;
}

/** A horse alone (the paddocks and stable yards). */
export const horseModel = (): THREE.BufferGeometry => mergeTinted(horseParts());

/** A rider of the horsemen, sat as on a horse's back (the horse drawn under him, its own look): his tunic the tinted part, a bronze helmet with a crest, a cloak, a spear held forward. */
export function riderModel(): THREE.BufferGeometry {
  const y = 0.31;
  const parts: TPart[] = [
    // His thighs along the horse's sides, his shins down.
    { geo: new THREE.CylinderGeometry(0.018, 0.02, 0.12, 4).rotateZ(Math.PI / 2 - 0.3).translate(0.03, y + 0.02, 0.07), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.018, 0.02, 0.12, 4).rotateZ(Math.PI / 2 - 0.3).translate(0.03, y + 0.02, -0.07), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.016, 0.015, 0.12, 4).translate(0.08, y - 0.05, 0.08), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.016, 0.015, 0.12, 4).translate(0.08, y - 0.05, -0.08), color: PAL.skin },
    // A saddle cloth, the body, the head and helmet.
    { geo: new THREE.BoxGeometry(0.16, 0.02, 0.17).translate(-0.01, y - 0.005, 0), color: PAL.villaBand },
    { geo: new THREE.CylinderGeometry(0.05, 0.07, 0.17, 6).translate(0, y + 0.1, 0), color: '', tint: true },
    { geo: new THREE.CylinderGeometry(0.052, 0.062, 0.08, 7).translate(0, y + 0.14, 0), color: PAL.bronze },
    { geo: new THREE.IcosahedronGeometry(0.046, 0).translate(0.005, y + 0.24, 0), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.056, 0).scale(1, 0.9, 1).translate(0, y + 0.26, 0), color: PAL.bronze },
    { geo: new THREE.BoxGeometry(0.13, 0.05, 0.016).translate(-0.01, y + 0.32, 0), color: PAL.crest },
    // A short cloak behind.
    { geo: new THREE.BoxGeometry(0.02, 0.15, 0.11).rotateZ(-0.25).translate(-0.06, y + 0.12, 0), color: PAL.villaBand },
    // The spear held forward and up, his arm to it.
    { geo: new THREE.CylinderGeometry(0.013, 0.012, 0.13, 4).rotateZ(-1.0).translate(0.05, y + 0.13, 0.07), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.006, 0.006, 0.7, 3).rotateZ(-1.2).translate(0.13, y + 0.2, 0.08), color: PAL.wood },
    { geo: new THREE.ConeGeometry(0.013, 0.06, 4).rotateZ(-1.2).translate(0.45, y + 0.33, 0.08), color: PAL.rockGrey },
    // A small round shield on his left arm.
    { geo: new THREE.CylinderGeometry(0.07, 0.07, 0.014, 10).rotateX(Math.PI / 2).translate(0.0, y + 0.1, -0.08), color: PAL.bronze },
  ];
  return mergeTinted(parts);
}

/** A groom leading a horse (his tunic the tinted part; the horse a bay): the horse at his side and a little behind, the lead rope between them. `two`: a second horse behind the first. */
export function groomModel(two: boolean): THREE.BufferGeometry {
  const parts: TPart[] = [
    leg(0.12, -0.03, 0.12, 0.02, PAL.skin, -1),
    leg(0.12, 0.03, 0.12, 0.02, PAL.skin, 1),
    { geo: new THREE.CylinderGeometry(0.055, 0.082, 0.2, 6).translate(0.12, 0.2, 0), color: '', tint: true },
    { geo: new THREE.IcosahedronGeometry(0.056, 0).translate(0.125, 0.355, 0), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.058, 0).scale(1, 0.7, 1).translate(0.11, 0.38, 0), color: PAL.hair },
    // His arm back to the lead, the rope to the horse's head.
    { geo: new THREE.CylinderGeometry(0.014, 0.013, 0.15, 4).rotateZ(0.9).rotateX(-0.4).translate(0.07, 0.24, 0.07), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.004, 0.004, 0.2, 3).rotateZ(1.2).translate(0.0, 0.25, 0.12), color: PAL.rope },
  ];
  const horse = (dx: number, dz: number, coat: string): void => {
    for (const p of horseParts()) parts.push({ ...p, geo: p.geo.clone().translate(dx, 0, dz), color: p.tint ? coat : p.color, tint: false });
  };
  horse(-0.22, 0.17, HORSE_COATS[0]);
  if (two) horse(-0.62, 0.17, HORSE_COATS[1]);
  return mergeTinted(parts);
}
