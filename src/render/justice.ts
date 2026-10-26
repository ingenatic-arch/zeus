import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { hash2 } from '../map/noise';
import { findBuilding } from '../sim/buildings';
import { TICKS_PER_DAY } from '../sim/clock';
import { pinnedAt, prisoners } from '../sim/justice';
import type { Building, SimState } from '../sim/state';
import { column, gable, slab } from './grand';
import { cyl, prism } from './homes';
import { PAL } from './palette';
import { lumpy, merge, type Part } from './trees';

/**
 * Slice 45's models: the court and the prison (drawn with the other
 * workplaces by Works), the stocks at an agora's edge with the one pinned in
 * them, and the prisoners in a prison's yard (drawn here, from the sim's
 * state: a pure read, rebuilt only when who is pinned or held changes). Local
 * frame as Works': the footprint's centre at the origin, the front (towards
 * the road) facing +x; a 3×3 runs -1.5..1.5.
 */

/** A convict's plain tunic of undyed wool (slice 49: lighter and warmer than the grey it was, which was lost on grey roads), and his rope. */
export const CONVICT_TUNIC = '#c9ad7f';
export const CONVICT_ROPE = '#c8b48a';

// ---------------------------------------------------------------------------
// The court (3×3).

/**
 * The court: a columned hall on a stepped base, its pediment to the road with
 * a bronze shield in it; under the porch, the magistrate's high-backed chair
 * on a dais; in the paved yard before it, two stone benches facing each other
 * for the jurors, the bronze voting urn between them on its stand, and a
 * marble stele of the laws by the road. Its people (the magistrate, the
 * jurors) are drawn by Jobfolk.
 */
export function courtModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  // Levelled to the top of its ground: the footing runs down the slope; the yard paved.
  parts.push({ geo: slab(-1.47, -1.47, 1.47, 1.47, -1.2, 0.04), color: PAL.plinth });
  parts.push({ geo: slab(0.6, -1.4, 1.42, 1.4, 0.04, 0.05), color: PAL.agoraPave });
  // The stepped base: three steps up to the hall's floor.
  const steps: Array<[number, number, string]> = [
    [0.06, 0.66, PAL.marbleShade],
    [0.12, 0.58, PAL.marble],
    [0.18, 0.5, PAL.marbleShade],
  ];
  steps.forEach(([y, x1, color], i) => parts.push({ geo: slab(-1.42 + i * 0.04, -1.38 + i * 0.06, x1, 1.38 - i * 0.06, y - 0.06, y), color }));
  // The hall: whitewashed walls, a tall door to the porch.
  const top = 1.0;
  parts.push({ geo: slab(-1.3, -1.1, -0.16, 1.1, 0.18, top), color: PAL.whitewash });
  parts.push({ geo: slab(-0.17, -0.2, -0.15, 0.2, 0.18, 0.78), color: PAL.door });
  parts.push({ geo: slab(-0.16, -0.24, -0.14, 0.24, 0.78, 0.83), color: PAL.marble });
  // Columns all along the front, and down each side.
  for (let i = 0; i < 6; i++) parts.push(...column(0.4, -1.12 + i * 0.448, 0.18, top - 0.2));
  for (const z of [-1.22, 1.22]) for (const x of [-1.15, -0.62, -0.1]) parts.push(...column(x, z, 0.18, top - 0.2));
  // The architrave, a blue band with an ochre line, and the roof: ridge to the road, the pediment over the porch.
  parts.push({ geo: slab(-1.3, -1.28, 0.5, 1.28, top - 0.03, top + 0.08), color: PAL.marble });
  parts.push({ geo: slab(-1.31, -1.29, 0.51, 1.29, top + 0.02, top + 0.06), color: PAL.bandBlue });
  const roofLen = 1.92;
  const roofMid = -0.4;
  parts.push({ geo: prism(roofLen, 1.38, 0.44).translate(roofMid, top + 0.08, 0), color: PAL.roofTile });
  parts.push({ geo: cyl(0.03, 0.03, roofLen + 0.02, 5).rotateZ(Math.PI / 2).translate(roofMid, top + 0.52, 0), color: PAL.roofTileDark });
  parts.push({ geo: gable(2.66, 0.42).rotateY(Math.PI / 2).translate(roofMid + roofLen / 2 + 0.006, top + 0.085, 0), color: PAL.marble });
  parts.push({ geo: gable(2.66, 0.42).rotateY(-Math.PI / 2).translate(roofMid - roofLen / 2 - 0.006, top + 0.085, 0), color: PAL.whitewashShade });
  parts.push({ geo: cyl(0.1, 0.1, 0.02, 10).rotateZ(Math.PI / 2).translate(roofMid + roofLen / 2 + 0.02, top + 0.22, 0), color: PAL.bronze });
  // Under the porch: the magistrate's chair on its dais, a footstool, and a stand of scrolls.
  parts.push({ geo: slab(0.0, -0.3, 0.32, 0.3, 0.18, 0.24), color: PAL.marble });
  parts.push({ geo: slab(0.06, -0.12, 0.2, 0.12, 0.24, 0.36), color: PAL.woodDark });
  parts.push({ geo: slab(0.03, -0.13, 0.07, 0.13, 0.24, 0.62), color: PAL.woodDark });
  parts.push({ geo: slab(0.025, -0.14, 0.075, 0.14, 0.6, 0.64), color: PAL.bronze });
  for (const z of [-0.13, 0.13]) parts.push({ geo: slab(0.07, z - 0.015, 0.2, z + 0.015, 0.36, 0.42), color: PAL.woodDark });
  parts.push({ geo: slab(0.24, -0.08, 0.3, 0.08, 0.24, 0.28), color: PAL.wood });
  parts.push({ geo: cyl(0.06, 0.07, 0.24, 6).translate(-0.02, 0.3, -0.62), color: PAL.basket });
  for (let i = 0; i < 3; i++) parts.push({ geo: cyl(0.016, 0.016, 0.1, 5).rotateX(Math.PI / 2).translate(-0.02 + (i - 1) * 0.03, 0.43, -0.62), color: PAL.scroll });
  // In the yard: the jurors' two benches, facing each other across the yard.
  for (const z of [-0.78, 0.78]) {
    parts.push({ geo: slab(0.72, z - 0.11, 1.32, z + 0.11, 0.13, 0.17), color: PAL.seatStone });
    for (const x of [0.78, 1.26]) parts.push({ geo: slab(x - 0.04, z - 0.09, x + 0.04, z + 0.09, 0.05, 0.13), color: PAL.seatStoneShade });
  }
  // The voting urn on its stand, between them; and the stele of the laws by the road.
  parts.push({ geo: cyl(0.05, 0.06, 0.18, 6).translate(1.0, 0.14, 0), color: PAL.marbleShade });
  parts.push({ geo: cyl(0.07, 0.045, 0.14, 8).translate(1.0, 0.3, 0), color: PAL.bronze });
  parts.push({ geo: cyl(0.045, 0.07, 0.05, 8).translate(1.0, 0.395, 0), color: PAL.bronze });
  parts.push({ geo: slab(1.26, 1.12, 1.34, 1.36, 0.05, 0.66), color: PAL.marble });
  parts.push({ geo: slab(1.265, 1.11, 1.345, 1.37, 0.66, 0.7), color: PAL.marbleShade });
  for (let i = 0; i < 6; i++) parts.push({ geo: slab(1.341, 1.15, 1.343, 1.33, 0.2 + i * 0.07, 0.22 + i * 0.07), color: PAL.officeStoneShade });
  return merge(parts);
}

// ---------------------------------------------------------------------------
// The prison (3×3).

/** Where the prisoners stand or sit in the yard (local frame), and which way each faces. */
export const PRISON_YARD: ReadonlyArray<[number, number, number]> = [
  [0.25, -1.1, Math.PI / 2],
  [0.6, -1.12, Math.PI / 2],
  [0.95, -1.1, Math.PI / 2],
  [0.25, 1.1, -Math.PI / 2],
  [0.6, 1.12, -Math.PI / 2],
  [0.95, 1.1, -Math.PI / 2],
  [0.15, -0.55, 0],
  [0.15, 0.4, 0],
  [0.55, -0.25, 2.4],
  [0.7, 0.55, -2.2],
  [0.4, 0.05, 1.2],
  [0.85, -0.6, 2.9],
];

/**
 * The prison: a squat block of dark dressed stone at the back, under a flat
 * roof with a parapet, small barred windows high in its walls and an iron-bound
 * door to the yard; the yard before it walled round, its heavy gate to the
 * road, and a guard's brazier burning by the gate. The prisoners in the yard
 * are drawn by JusticeView, its guards by Jobfolk.
 */
export function prisonModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  parts.push({ geo: slab(-1.47, -1.47, 1.47, 1.47, -1.2, 0.04), color: PAL.plinth });
  // The yard's floor, trodden earth.
  parts.push({ geo: slab(-0.2, -1.36, 1.38, 1.36, 0.04, 0.05), color: PAL.earthWorn });
  // The block.
  const x0 = -1.42;
  const x1 = -0.18;
  const z0 = -1.38;
  const z1 = 1.38;
  const top = 0.92;
  parts.push({ geo: slab(x0, z0, x1, z1, 0.04, top), color: PAL.stoneBlock });
  parts.push({ geo: slab(x0 - 0.02, z0 - 0.02, x1 + 0.02, z1 + 0.02, 0.04, 0.16), color: PAL.stoneBlockShade });
  for (const y of [0.4, 0.66]) parts.push({ geo: slab(x0 - 0.006, z0 - 0.006, x1 + 0.006, z1 + 0.006, y, y + 0.02), color: PAL.stoneBlockShade });
  // The flat roof and its parapet.
  parts.push({ geo: slab(x0 - 0.03, z0 - 0.03, x1 + 0.03, z1 + 0.03, top, top + 0.04), color: PAL.stoneBlockShade });
  for (const [a, b, c, d] of [[x0 - 0.03, z0 - 0.03, x1 + 0.03, z0 + 0.05], [x0 - 0.03, z1 - 0.05, x1 + 0.03, z1 + 0.03], [x0 - 0.03, z0 - 0.03, x0 + 0.05, z1 + 0.03], [x1 - 0.05, z0 - 0.03, x1 + 0.03, z1 + 0.03]]) {
    parts.push({ geo: slab(a, b, c, d, top + 0.04, top + 0.13), color: PAL.stoneBlock });
  }
  // Small barred windows, high: on the yard side, and down both ends.
  const bars = (fx: number, fz: number, alongX: boolean, y: number): void => {
    const w = 0.13;
    const h = 0.1;
    parts.push({ geo: alongX ? slab(fx - w / 2, fz - 0.012, fx + w / 2, fz + 0.012, y, y + h) : slab(fx - 0.012, fz - w / 2, fx + 0.012, fz + w / 2, y, y + h), color: PAL.charDark });
    for (const k of [-1, 0, 1]) {
      const geo = cyl(0.006, 0.006, h + 0.02, 3).translate(alongX ? fx + k * 0.035 : fx, y + h / 2, alongX ? fz : fz + k * 0.035);
      parts.push({ geo, color: PAL.rockGrey });
    }
  };
  for (const z of [-1.0, -0.45, 0.55, 1.0]) bars(x1 + 0.01, z, false, 0.62);
  for (const x of [-1.1, -0.55]) {
    bars(x, z0 - 0.01, true, 0.62);
    bars(x, z1 + 0.01, true, 0.62);
  }
  // The iron-bound door to the yard.
  parts.push({ geo: slab(x1, 0.0, x1 + 0.025, 0.3, 0.04, 0.52), color: PAL.woodDark });
  for (const y of [0.14, 0.38]) parts.push({ geo: slab(x1 + 0.02, -0.01, x1 + 0.03, 0.31, y, y + 0.03), color: PAL.charDark });
  parts.push({ geo: slab(x1 + 0.005, -0.04, x1 + 0.03, 0.34, 0.52, 0.57), color: PAL.stoneBlockShade });
  // The yard's walls, its gate to the road.
  const wall = 0.62;
  for (const z of [-1.4, 1.32]) parts.push({ geo: slab(x1, z, 1.42, z + 0.08, 0.04, wall), color: PAL.stoneBlock });
  parts.push({ geo: slab(1.34, -1.4, 1.42, -0.26, 0.04, wall), color: PAL.stoneBlock });
  parts.push({ geo: slab(1.34, 0.26, 1.42, 1.4, 0.04, wall), color: PAL.stoneBlock });
  for (const [a, b] of [[-1.42, -1.38], [1.32, 1.42]]) parts.push({ geo: slab(x1, a, 1.44, b, wall, wall + 0.04), color: PAL.stoneBlockShade });
  parts.push({ geo: slab(1.32, -1.42, 1.44, 1.42, wall, wall + 0.04), color: PAL.stoneBlockShade });
  // The gate: two heavy leaves, shut, iron bands across; a stone lintel over.
  for (const [a, b] of [[-0.26, -0.005], [0.005, 0.26]]) {
    parts.push({ geo: slab(1.36, a, 1.4, b, 0.04, 0.54), color: PAL.woodDark });
    for (const y of [0.14, 0.4]) parts.push({ geo: slab(1.395, a, 1.41, b, y, y + 0.03), color: PAL.charDark });
  }
  parts.push({ geo: slab(1.32, -0.34, 1.44, 0.34, 0.54, 0.66), color: PAL.stoneBlock });
  // The guard's brazier by the gate, inside: three legs, the bowl, coals and a flame.
  const bx = 1.12;
  const bz = 0.48;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    parts.push({ geo: cyl(0.008, 0.008, 0.2, 3).rotateX(0.18 * Math.cos(a)).rotateZ(0.18 * Math.sin(a)).translate(bx + Math.sin(a) * 0.04, 0.14, bz + Math.cos(a) * 0.04), color: PAL.charDark });
  }
  parts.push({ geo: cyl(0.075, 0.045, 0.05, 8).translate(bx, 0.26, bz), color: PAL.bronze });
  parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.055, 0), 0.3, 4501).scale(1, 0.4, 1).translate(bx, 0.29, bz), color: PAL.ember });
  parts.push({ geo: new THREE.ConeGeometry(0.04, 0.12, 5).translate(bx, 0.36, bz), color: PAL.flame });
  // A bench by the block's wall for the guards; a water jar.
  parts.push({ geo: slab(-0.12, -0.7, 0.0, -0.2, 0.05, 0.15), color: PAL.wood });
  parts.push({ geo: cyl(0.05, 0.06, 0.14, 7).translate(-0.06, 0.12, 0.62), color: PAL.pithos });
  return merge(parts);
}

// ---------------------------------------------------------------------------
// The stocks, and the people in them and in the prison yard.

/** The stocks: a low wooden platform, two posts and the board across them, three holes in it. Front +x. */
function stocksFrame(): Part[] {
  const parts: Part[] = [];
  parts.push({ geo: slab(-0.24, -0.26, 0.16, 0.26, 0, 0.04), color: PAL.woodDark });
  for (const z of [-0.22, 0.22]) parts.push({ geo: slab(-0.025, z - 0.025, 0.025, z + 0.025, 0.04, 0.42), color: PAL.timberDark });
  parts.push({ geo: slab(-0.02, -0.25, 0.02, 0.25, 0.22, 0.31), color: PAL.timber });
  parts.push({ geo: slab(-0.03, -0.26, 0.03, 0.26, 0.42, 0.45), color: PAL.timberDark });
  return parts;
}

/** One pinned in the stocks: kneeling behind the board, head and hands through it, head hung. */
function pinnedFigure(female: boolean, seed: number): Part[] {
  const tunic = female ? '#8d8274' : CONVICT_TUNIC;
  return [
    // Kneeling: shins along the platform, thighs up, the body leaning forward to the board.
    { geo: slab(-0.2, -0.06, -0.08, 0.06, 0.04, 0.08), color: tunic },
    { geo: new THREE.CylinderGeometry(0.05, 0.07, 0.17, 6).rotateZ(-0.9).translate(-0.08, 0.2, 0), color: tunic },
    // The head through the middle hole, hanging; the hands through the two others.
    { geo: new THREE.IcosahedronGeometry(0.045, 0).translate(0.05, 0.25, 0), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.047, 0).scale(1, 0.6, 1).translate(0.035, 0.28, 0), color: female ? PAL.hair : hash2(seed, 1, 4502) < 0.5 ? PAL.hair : '#5a4a3c' },
    { geo: new THREE.IcosahedronGeometry(0.02, 0).translate(0.04, 0.27, -0.12), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.02, 0).translate(0.04, 0.27, 0.12), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.014, 0.014, 0.12, 4).rotateZ(-1.2).translate(-0.03, 0.25, -0.1), color: tunic },
    { geo: new THREE.CylinderGeometry(0.014, 0.014, 0.12, 4).rotateZ(-1.2).translate(-0.03, 0.25, 0.1), color: tunic },
  ];
}

/** A prisoner in the yard: grey tunic, sitting against the wall or standing slumped. */
function prisonerFigure(sitting: boolean, seed: number): Part[] {
  const tunic = CONVICT_TUNIC;
  const hair = hash2(seed, 2, 4503) < 0.5 ? PAL.hair : '#5a4a3c';
  if (sitting) {
    return [
      { geo: slab(-0.04, -0.05, 0.12, 0.05, 0.0, 0.05), color: tunic },
      { geo: new THREE.CylinderGeometry(0.05, 0.065, 0.16, 6).translate(-0.04, 0.12, 0), color: tunic },
      { geo: new THREE.IcosahedronGeometry(0.045, 0).translate(-0.02, 0.24, 0), color: PAL.skin },
      { geo: new THREE.IcosahedronGeometry(0.047, 0).scale(1, 0.6, 1).translate(-0.035, 0.265, 0), color: hair },
      { geo: new THREE.CylinderGeometry(0.013, 0.013, 0.1, 4).rotateZ(-1.0).translate(0.04, 0.1, 0.04), color: PAL.skin },
    ];
  }
  return [
    { geo: new THREE.CylinderGeometry(0.018, 0.018, 0.12, 4).translate(0, 0.06, -0.025), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.018, 0.018, 0.12, 4).translate(0, 0.06, 0.025), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.05, 0.07, 0.19, 6).rotateZ(-0.12).translate(0.005, 0.2, 0), color: tunic },
    { geo: new THREE.IcosahedronGeometry(0.046, 0).translate(0.035, 0.33, 0), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.048, 0).scale(1, 0.6, 1).translate(0.02, 0.355, 0), color: hair },
    { geo: new THREE.CylinderGeometry(0.013, 0.013, 0.13, 4).translate(0.0, 0.2, 0.065), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.013, 0.013, 0.13, 4).translate(0.0, 0.2, -0.065), color: PAL.skin },
  ];
}

/** A part of a figure turned and moved into place in a building's frame. */
function placed(parts: Part[], lx: number, lz: number, yaw: number, y = 0): Part[] {
  return parts.map((p) => ({ geo: p.geo.clone().rotateY(yaw).translate(lx, y, lz), color: p.color }));
}

/** Where on an agora (its local frame) the stocks stand: just outside its square, at the corner the camera usually looks from (slice 49: they stood at the corner by the road, often behind the awnings). */
const STOCKS_AT: [number, number] = [1.68, 1.2];
/** The camera's usual view: from the -x, +z side of what it looks at (cameraRig.ts's diagonal). */
const VIEW_FROM: [number, number] = [-Math.SQRT1_2, Math.SQRT1_2];
/** Which corner of a building turned by `yaw` faces the camera's usual view (signs of its local x and z). */
function stocksCorner(yaw: number): [number, number] {
  const c = Math.cos(yaw);
  const sn = Math.sin(yaw);
  const lx = VIEW_FROM[0] * c - VIEW_FROM[1] * sn;
  const lz = VIEW_FROM[0] * sn + VIEW_FROM[1] * c;
  return [lx >= 0 ? 1 : -1, lz >= 0 ? 1 : -1];
}

/** How Works places a building of its kinds (the agora and the prison): its middle, floor and turn. */
export type WorksFrame = (s: SimState, b: Building) => { x: number; y: number; z: number; yaw: number };

/**
 * The stocks at each agora where someone is pinned now (the empty frame isn't
 * drawn: the stocks are put up for the day), and the prisoners in each prison's
 * yard. One small mesh each; rebuilt only when who is pinned or held changes.
 */
export class JusticeView {
  readonly group = new THREE.Group();
  private readonly mat: THREE.MeshStandardMaterial;
  private views = new Map<string, { sig: string; mesh: THREE.Mesh }>();
  private seenRev = -1;
  private seenTick = -1;
  private last: SimState | null = null;

  constructor(
    private readonly map: CoastMap,
    private readonly frameOf: WorksFrame,
  ) {
    this.group.name = 'justice';
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, metalness: 0 });
  }

  update(s: SimState): void {
    // (Who is pinned changes on the day's turn and with a sentence; who is held with a sentence or a breakout: both raise rev.)
    const day = Math.floor(s.tick / TICKS_PER_DAY);
    if (s === this.last && s.rev === this.seenRev && day === this.seenTick) return;
    this.last = s;
    this.seenRev = s.rev;
    this.seenTick = day;
    const seen = new Set<string>();
    if (s.crime.stocks.length) {
      for (const b of s.buildings) {
        if (b.kind !== 'agora') continue;
        const who = pinnedAt(s, b);
        if (!who.length) continue;
        const key = `stocks:${b.id}`;
        seen.add(key);
        const f = this.frameOf(s, b);
        const sig = `${who.map((p) => `${p.home}:${p.name}`).join(',')}:${f.x}:${f.z}:${f.yaw.toFixed(3)}`;
        this.put(key, sig, () => {
          const c = Math.cos(f.yaw);
          const sn = Math.sin(f.yaw);
          const parts: Part[] = [];
          // (Slice 49, slice 45's finding: just outside the square, at its corner towards the camera's usual view, so the awnings don't hide them; facing out, towards the camera.)
          const [sx, sz] = stocksCorner(f.yaw);
          who.slice(0, 2).forEach((p, i) => {
            const lx = sx * STOCKS_AT[0];
            const lz = sz * (STOCKS_AT[1] - i * 0.55);
            const wx = f.x + lx * c + lz * sn;
            const wz = f.z - lx * sn + lz * c;
            const y = this.map.heightAt(wx, wz) - f.y;
            parts.push(...placed([...stocksFrame(), ...pinnedFigure(p.female, findBuilding(s, p.home)?.id ?? 0)], lx, lz, sx > 0 ? 0 : Math.PI, y));
          });
          return { geo: merge(parts), f };
        });
      }
    }
    for (const b of s.buildings) {
      if (b.kind !== 'prison') continue;
      const n = Math.min(PRISON_YARD.length, prisoners(s, b).length);
      if (!n) continue;
      const key = `prison:${b.id}`;
      seen.add(key);
      const f = this.frameOf(s, b);
      const sig = `${n}:${f.x}:${f.z}:${f.yaw.toFixed(3)}`;
      this.put(key, sig, () => {
        const parts: Part[] = [];
        for (let i = 0; i < n; i++) {
          const [lx, lz, yaw] = PRISON_YARD[i];
          parts.push(...placed(prisonerFigure(i < 6, b.id * 13 + i), lx, lz, yaw, 0.05));
        }
        return { geo: merge(parts), f };
      });
    }
    for (const [key, v] of this.views) {
      if (seen.has(key)) continue;
      this.group.remove(v.mesh);
      v.mesh.geometry.dispose();
      this.views.delete(key);
    }
  }

  private put(key: string, sig: string, make: () => { geo: THREE.BufferGeometry; f: { x: number; y: number; z: number; yaw: number } }): void {
    const was = this.views.get(key);
    if (was && was.sig === sig) return;
    const { geo, f } = make();
    let mesh = was?.mesh;
    if (mesh) {
      mesh.geometry.dispose();
      mesh.geometry = geo;
    } else {
      mesh = new THREE.Mesh(geo, this.mat);
      mesh.name = key.startsWith('stocks') ? 'justice-stocks' : 'justice-prisoners';
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
    mesh.position.set(f.x, f.y, f.z);
    mesh.rotation.set(0, f.yaw, 0);
    this.views.set(key, { sig, mesh });
  }
}
