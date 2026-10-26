import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { hash2 } from '../map/noise';
import { footSide } from '../sim/buildings';
import { TICKS_PER_DAY } from '../sim/clock';
import { quarantined } from '../sim/health';
import type { Building, SimState } from '../sim/state';
import { column, gable, gableRoof, slab, sloped } from './grand';
import { facingOf } from './homes';
import type { FolkLooks, Look } from './looks';
import { col, PAL } from './palette';
import { puffTexture } from './puff';
import { merge, type Part } from './trees';

/**
 * Slice 49's models: the infirmary and the asklepieion (drawn with the other
 * workplaces by Works), and what health shows in the streets (drawn here from
 * the sim's state, a pure read): the sick coughing at their doors, a brazier
 * of herbs smoking at each home the plague has struck, the patients in the
 * asklepieion's beds, and a yellow pennant at the trading post and the
 * caravan yard while a quarantine lasts. Local frame as Works': the
 * footprint's centre at the origin, the front (towards the road) facing +x;
 * a 2×2 runs -1..1, a 4×4 -2..2.
 */

/** The physician's white robe and her herb-green sash; the bearers' linen; the litter's cloth; a sick one's blanket. */
export const PHYSICIAN_ROBE = '#f2ede2';
export const PHYSICIAN_SASH = '#3f8a62';
export const BEARER_TUNIC = '#9fb8b4';
export const LITTER_CLOTH = '#e8dcc0';
export const BLANKET = '#8e5a3c';
/** The quarantine's yellow. */
export const QUARANTINE_YELLOW = '#f2c824';
/** Herb smoke, a little green. */
const HERB_SMOKE = 0xb9c2a8;

// ---------------------------------------------------------------------------
// The infirmary (2×2).

/** A tuft of herbs: a low clump of green. */
function tuft(x: number, z: number, r: number, color: string): Part {
  return { geo: new THREE.IcosahedronGeometry(r, 0).scale(1, 0.7, 1).translate(x, 0.06 + r * 0.5, z), color };
}

/** The staff of Asklepios: a rough wooden staff with a bronze snake coiled up it. */
function staff(x: number, z: number, y0: number, h: number): Part[] {
  const parts: Part[] = [{ geo: new THREE.CylinderGeometry(0.014, 0.018, h, 5).translate(x, y0 + h / 2, z), color: PAL.woodDark }];
  for (let i = 0; i < 3; i++) parts.push({ geo: new THREE.TorusGeometry(0.03, 0.009, 3, 7).rotateX(Math.PI / 2 + 0.35 * (i % 2 ? 1 : -1)).translate(x, y0 + h * (0.35 + i * 0.2), z), color: PAL.bronzeGreen });
  parts.push({ geo: new THREE.IcosahedronGeometry(0.022, 0).translate(x + 0.02, y0 + h * 0.86, z), color: PAL.bronzeGreen });
  return parts;
}

/**
 * The infirmary: a small whitewashed house under a tiled roof, a green band
 * under its eaves, a porch of two columns over its door with a bench where
 * the sick wait, beds of herbs either side of the path from the road, jars of
 * water by the wall, and the staff of Asklepios standing by the road. Its
 * physicians are drawn by Jobfolk (at home) and Walkers (on their rounds).
 */
export function infirmaryModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  parts.push({ geo: slab(-0.97, -0.97, 0.97, 0.97, -0.8, 0.04), color: PAL.plinth });
  parts.push({ geo: slab(0.12, -0.95, 0.96, 0.95, 0.04, 0.05), color: PAL.paving });
  // The house.
  parts.push({ geo: slab(-0.92, -0.88, 0.1, 0.88, 0.04, 0.6), color: PAL.whitewash });
  parts.push({ geo: slab(-0.925, -0.885, 0.105, 0.885, 0.5, 0.56), color: PHYSICIAN_SASH });
  gableRoof(parts, -0.41, 0, 1.02, 1.76, 0.6, 0.32);
  parts.push({ geo: slab(0.1, -0.13, 0.115, 0.13, 0.05, 0.4), color: PAL.door });
  for (const z of [-0.6, 0.6]) parts.push({ geo: slab(0.1, z - 0.09, 0.112, z + 0.09, 0.26, 0.38), color: PAL.shutter });
  // The porch over the door, and the bench under it.
  for (const z of [-0.36, 0.36]) parts.push(...column(0.5, z, 0.05, 0.4));
  parts.push({ geo: slab(0.1, -0.46, 0.58, 0.46, 0.45, 0.5), color: PAL.roofTileDark });
  parts.push({ geo: slab(0.13, 0.17, 0.25, 0.42, 0.11, 0.14), color: PAL.seatStone });
  for (const z of [0.2, 0.39]) parts.push({ geo: slab(0.15, z - 0.02, 0.23, z + 0.02, 0.05, 0.11), color: PAL.seatStoneShade });
  // Beds of herbs either side of the path.
  const greens = [PAL.garden, PAL.gardenDark, PAL.oliveLeaf, PAL.scrub];
  for (const side of [-1, 1]) {
    const z0 = side * 0.52;
    const z1 = side * 0.92;
    parts.push({ geo: slab(0.62, Math.min(z0, z1), 0.94, Math.max(z0, z1), 0.04, 0.07), color: PAL.earth });
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) parts.push(tuft(0.68 + i * 0.11, side * (0.6 + j * 0.2), 0.045, greens[(i + j * 2 + (side > 0 ? 1 : 0)) % greens.length]));
  }
  // Water jars by the wall.
  for (const z of [-0.74, -0.62]) parts.push({ geo: new THREE.CylinderGeometry(0.045, 0.035, 0.13, 7).translate(0.2, 0.115, z), color: PAL.pithos });
  // The staff of Asklepios by the road.
  parts.push({ geo: slab(0.85, -0.42, 0.93, -0.34, 0.05, 0.08), color: PAL.marble });
  parts.push(...staff(0.89, -0.38, 0.08, 0.5));
  return merge(parts);
}

// ---------------------------------------------------------------------------
// The asklepieion (4×4).

/** Where the asklepieion's eight beds stand under its stoa (local frame), the sleeper's head to the back wall. */
export const ASK_BEDS: ReadonlyArray<[number, number]> = Array.from({ length: 8 }, (_, i) => [-0.3 + i * 0.235, -1.52] as [number, number]);
/** The height of a bed's mattress. */
export const ASK_BED_TOP = 0.13;

/**
 * The asklepieion: a walled sanctuary of the healer god. At the back a small
 * columned temple; before it his statue with the staff and snake; down one
 * side a long stoa where the sick lie on eight beds; in the court the sacred
 * spring in its round basin and the altar by the gate; down the other side a
 * garden of herbs, and dark cypresses in the back corners. Its people (the
 * priest at the altar, the attendants at the beds) are drawn by Jobfolk; the
 * patients in the beds by HealthView.
 */
export function asklepieionModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  parts.push({ geo: slab(-1.97, -1.97, 1.97, 1.97, -1.2, 0.04), color: PAL.plinth });
  parts.push({ geo: slab(-1.92, -1.92, 1.92, 1.92, 0.04, 0.06), color: PAL.agoraPave });
  // The sanctuary's low wall, and the gateway to the road.
  const wall = PAL.whitewash;
  parts.push({ geo: slab(-1.96, -1.96, -1.86, 1.96, 0.04, 0.3), color: wall });
  for (const z of [-1.96, 1.86]) parts.push({ geo: slab(-1.96, z, 1.96, z + 0.1, 0.04, 0.3), color: wall });
  for (const [z0, z1] of [[-1.96, -0.42], [0.42, 1.96]]) parts.push({ geo: slab(1.86, z0, 1.96, z1, 0.04, 0.3), color: wall });
  for (const z of [-0.42, 0.42]) parts.push({ geo: slab(1.82, z - 0.07, 1.98, z + 0.07, 0.04, 0.66), color: PAL.marble });
  parts.push({ geo: slab(1.8, -0.5, 2.0, 0.5, 0.66, 0.74), color: PAL.marble });
  parts.push({ geo: slab(1.79, -0.51, 2.01, 0.51, 0.7, 0.72), color: PAL.bandBlue });
  // The temple at the back: two steps, the cella, four columns across its front, the roof's ridge to the gate.
  parts.push({ geo: slab(-1.84, -0.72, -0.5, 0.72, 0.06, 0.1), color: PAL.marbleShade });
  parts.push({ geo: slab(-1.82, -0.66, -0.56, 0.66, 0.1, 0.14), color: PAL.marble });
  parts.push({ geo: slab(-1.76, -0.54, -1.0, 0.54, 0.14, 0.86), color: PAL.whitewash });
  parts.push({ geo: slab(-1.0, -0.14, -0.985, 0.14, 0.14, 0.6), color: PAL.door });
  for (const z of [-0.54, -0.18, 0.18, 0.54]) parts.push(...column(-0.66, z, 0.14, 0.64));
  parts.push({ geo: slab(-1.8, -0.62, -0.6, 0.62, 0.8, 0.88), color: PAL.marble });
  parts.push({ geo: slab(-1.805, -0.625, -0.595, 0.625, 0.84, 0.87), color: PAL.bandBlue });
  const roofLen = 1.3;
  const roofMid = -1.2;
  parts.push({ geo: new THREE.BufferGeometry().copy(prismAlongX(roofLen, 0.72, 0.3)).translate(roofMid, 0.88, 0), color: PAL.roofTile });
  parts.push({ geo: new THREE.CylinderGeometry(0.025, 0.025, roofLen + 0.02, 5).rotateZ(Math.PI / 2).translate(roofMid, 1.18, 0), color: PAL.roofTileDark });
  parts.push({ geo: gable(1.4, 0.29).rotateY(Math.PI / 2).translate(roofMid + roofLen / 2 + 0.006, 0.885, 0), color: PAL.marble });
  parts.push({ geo: gable(1.4, 0.29).rotateY(-Math.PI / 2).translate(roofMid - roofLen / 2 - 0.006, 0.885, 0), color: PAL.whitewashShade });
  // His statue before the temple: a marble figure in a robe, leaning on the staff with the snake.
  parts.push({ geo: slab(-0.42, -0.1, -0.24, 0.1, 0.06, 0.26), color: PAL.marbleShade });
  parts.push({ geo: new THREE.CylinderGeometry(0.045, 0.07, 0.26, 7).translate(-0.33, 0.39, 0), color: PAL.marble });
  parts.push({ geo: new THREE.IcosahedronGeometry(0.045, 0).translate(-0.33, 0.56, 0), color: PAL.marble });
  parts.push(...staff(-0.27, 0.07, 0.26, 0.3).map((p) => (p.color === PAL.woodDark ? { ...p, color: PAL.marbleShade } : p)));
  // The stoa down the left side: its back wall, a row of columns, a lean-to roof; eight beds under it.
  parts.push({ geo: slab(-0.48, -1.86, 1.62, -1.78, 0.06, 0.62), color: PAL.whitewash });
  for (let i = 0; i < 6; i++) parts.push(...column(-0.4 + i * 0.4, -1.18, 0.06, 0.5));
  parts.push({ geo: sloped(-0.5, -1.88, 1.66, -1.1, 0.58, 0.7, '-z', 0, 0.04), color: PAL.roofTile });
  parts.push({ geo: slab(-0.5, -1.13, 1.66, -1.09, 0.54, 0.6), color: PAL.roofTileDark });
  for (const [x, z] of ASK_BEDS) {
    parts.push({ geo: slab(x - 0.085, z - 0.18, x + 0.085, z + 0.18, 0.06, 0.1), color: PAL.wood });
    parts.push({ geo: slab(x - 0.075, z - 0.17, x + 0.075, z + 0.17, 0.1, ASK_BED_TOP), color: LITTER_CLOTH });
    parts.push({ geo: slab(x - 0.06, z - 0.16, x + 0.06, z - 0.1, ASK_BED_TOP, ASK_BED_TOP + 0.02), color: PAL.canvas });
  }
  // The sacred spring in its round basin, and the altar by the gate with its fire.
  parts.push({ geo: new THREE.CylinderGeometry(0.34, 0.36, 0.12, 14).translate(0.55, 0.12, 0.45), color: PAL.fountainStone });
  parts.push({ geo: new THREE.CylinderGeometry(0.29, 0.29, 0.02, 14).translate(0.55, 0.175, 0.45), color: PAL.basinWater });
  parts.push({ geo: new THREE.CylinderGeometry(0.04, 0.05, 0.22, 6).translate(0.55, 0.24, 0.45), color: PAL.fountainStoneShade });
  parts.push({ geo: slab(1.18, -0.16, 1.4, 0.16, 0.06, 0.26), color: PAL.marble });
  parts.push({ geo: slab(1.16, -0.18, 1.42, 0.18, 0.26, 0.29), color: PAL.marbleShade });
  parts.push({ geo: new THREE.ConeGeometry(0.06, 0.12, 5).translate(1.29, 0.35, 0), color: PAL.flame });
  // The herb garden down the right side.
  parts.push({ geo: slab(-0.42, 1.2, 1.55, 1.8, 0.06, 0.09), color: PAL.earth });
  const greens = [PAL.garden, PAL.gardenDark, PAL.oliveLeaf, PAL.scrub, PAL.vineLeaf];
  for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) parts.push(tuft(-0.32 + i * 0.25, 1.3 + j * 0.2, 0.05 + 0.015 * hash2(i, j, 4911), greens[(i * 3 + j) % greens.length]));
  // Cypresses in the back corners.
  for (const z of [-1.62, 1.62]) {
    parts.push({ geo: new THREE.CylinderGeometry(0.03, 0.04, 0.2, 5).translate(-1.62, 0.16, z), color: PAL.trunk });
    parts.push({ geo: new THREE.ConeGeometry(0.17, 1.0, 7).translate(-1.62, 0.72, z), color: PAL.cypress });
  }
  return merge(parts);
}

/** A ridge roof along x: a triangular prism `len` long, `halfW` either side, `h` high. */
function prismAlongX(len: number, halfW: number, h: number): THREE.BufferGeometry {
  const a = -len / 2;
  const b = len / 2;
  const p = [
    [a, 0, halfW], [b, 0, halfW], [b, h, 0],
    [a, 0, halfW], [b, h, 0], [a, h, 0],
    [b, 0, -halfW], [a, 0, -halfW], [a, h, 0],
    [b, 0, -halfW], [a, h, 0], [b, h, 0],
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p.flat(), 3));
  return g;
}

// ---------------------------------------------------------------------------
// In the streets.

/** A brazier of herbs on its tripod, smouldering. */
function brazierModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    parts.push({ geo: new THREE.CylinderGeometry(0.008, 0.008, 0.17, 3).rotateZ(0.25).rotateY(a).translate(Math.cos(a) * 0.04, 0.085, -Math.sin(a) * 0.04), color: PAL.woodDark });
  }
  parts.push({ geo: new THREE.CylinderGeometry(0.075, 0.04, 0.05, 8).translate(0, 0.18, 0), color: PAL.bronze });
  parts.push({ geo: new THREE.CylinderGeometry(0.066, 0.066, 0.012, 8).translate(0, 0.2, 0), color: PAL.ember });
  parts.push({ geo: new THREE.IcosahedronGeometry(0.03, 0).scale(1, 0.6, 1).translate(0.015, 0.21, 0.01), color: PAL.gardenDark });
  return merge(parts);
}

/** The quarantine's yellow pennant on a tall pole. */
function pennantModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  parts.push({ geo: new THREE.CylinderGeometry(0.012, 0.016, 0.95, 5).translate(0, 0.475, 0), color: PAL.woodDark });
  parts.push({ geo: slab(-0.05, -0.05, 0.05, 0.05, 0, 0.05), color: PAL.stone });
  const g = new THREE.BufferGeometry();
  // A long swallow-tailed pennant, flying from the pole's top.
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.94, 0, 0, 0.7, 0, 0.56, 0.86, 0.02, 0, 0.7, 0, 0.56, 0.76, 0.02, 0.56, 0.86, 0.02, 0.56, 0.86, 0.02, 0.56, 0.76, 0.02, 0.43, 0.81, 0.015], 3));
  const back = g.clone();
  const p = back.attributes.position as THREE.BufferAttribute;
  // (Both faces: the same triangles wound the other way.)
  const flipped: number[] = [];
  for (let i = 0; i < p.count; i += 3) for (const k of [0, 2, 1]) flipped.push(p.getX(i + k), p.getY(i + k), p.getZ(i + k));
  back.setAttribute('position', new THREE.Float32BufferAttribute(flipped, 3));
  parts.push({ geo: g, color: QUARANTINE_YELLOW }, { geo: back, color: QUARANTINE_YELLOW });
  return merge(parts);
}

/** Where on a trading post or caravan yard (its local frame) the quarantine's pennant stands. */
const PENNANT_AT: Record<'trading' | 'yard', [number, number]> = { trading: [1.25, -1.25], yard: [1.3, -1.25] };

/** How Works places a building of its kinds: its middle, floor and turn. */
export type WorksFrame = (s: SimState, b: Building) => { x: number; y: number; z: number; yaw: number };

/** The figures it draws, made by Walkers (they share the walkers' merged meshes). */
export interface HealthFigures {
  /** A sick one at the door: bent, a blanket (the tinted part) over head and shoulders, a hand to the mouth. */
  sick: THREE.BufferGeometry;
  /** A patient lying on a bed, under a blanket (the tinted part). */
  patient: THREE.BufferGeometry;
}

type Spot = { x: number; y: number; z: number; yaw: number; seed: number };

/**
 * The sick at their doors, the braziers at the homes the plague has struck
 * and their smoke, the patients in the asklepieion's beds, and the quarantine's
 * pennants. Where each stands is worked out again only when the state's
 * buildings or the day change; each frame it only pushes them (the sick
 * cough, the smoke rises).
 */
export class HealthView {
  readonly group = new THREE.Group();
  private readonly sick: Look;
  private readonly patients: Look;
  private readonly braziers: Look;
  private readonly pennants: Look;
  private puffs: THREE.InstancedMesh;
  private cap = 0;
  private atDoors: Spot[] = [];
  private fires: Spot[] = [];
  private beds: Spot[] = [];
  private flags: Spot[] = [];
  private seenRev = -1;
  private seenDay = -1;
  private seenCount = -1;
  private last: SimState | null = null;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly camE = new THREE.Euler();
  private readonly p = new THREE.Vector3();
  private readonly sc = new THREE.Vector3(1, 1, 1);
  private readonly c = new THREE.Color();
  private readonly blanket = col(BLANKET);
  private readonly sheet = col(LITTER_CLOTH);
  private readonly plain = new THREE.Color(1, 1, 1);

  constructor(
    private readonly map: CoastMap,
    folk: FolkLooks,
    private readonly frameOf: WorksFrame,
    figures: HealthFigures,
  ) {
    this.group.name = 'health';
    this.sick = folk.people.look(figures.sick);
    this.patients = folk.people.look(figures.patient);
    this.braziers = folk.big.look(brazierModel());
    this.pennants = folk.big.look(pennantModel());
    const mat = new THREE.MeshBasicMaterial({ color: HERB_SMOKE, map: puffTexture(), transparent: true, opacity: 0.6, depthWrite: false });
    this.puffs = this.makePuffs(mat, 32);
  }

  /** What it draws now (for the probes): the sick at doors, patients in beds, braziers, pennants. */
  get drawn(): { doors: number; beds: number; fires: number; flags: number } {
    return { doors: this.atDoors.length, beds: this.beds.length, fires: this.fires.length, flags: this.flags.length };
  }

  private makePuffs(mat: THREE.Material, cap: number): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2), mat, cap);
    mesh.name = 'health-smoke';
    mesh.frustumCulled = false;
    mesh.count = 0;
    this.cap = cap;
    this.group.add(mesh);
    return mesh;
  }

  /** Where a spot in a home's frame falls: in front of its door, at the road's edge. */
  private homeSpot(s: SimState, b: Building, lx: number, lzOf: (half: number) => number, seed: number): Spot {
    const half = footSide(b) / 2;
    const yaw = facingOf(s, this.map.size, b);
    const c = Math.cos(yaw);
    const sn = Math.sin(yaw);
    const lz = lzOf(half);
    const x = b.x + half + (half + lx) * c + lz * sn;
    const z = b.z + half - (half + lx) * sn + lz * c;
    return { x, y: this.map.heightAt(x, z), z, yaw, seed };
  }

  private plan(s: SimState): void {
    const h = s.health;
    // The sick at home (not yet lifted onto a litter): one at the door of each home with any.
    const carried = new Set<number>();
    for (const w of s.walkers) if (w.kind === 'bearer' && w.back && w.food === 1) carried.add(w.load);
    const homes = new Map<number, number>();
    for (const x of h.sick) {
      if (x.bed > 0 || carried.has(x.id)) continue;
      homes.set(x.home, (homes.get(x.home) ?? 0) + 1);
    }
    this.atDoors = [];
    for (const [id] of homes) {
      const b = s.buildings.find((o) => o.id === id);
      if (!b) continue;
      this.atDoors.push(this.homeSpot(s, b, -0.04, (half) => half * 0.42, hash2(b.id, 3, 4921)));
    }
    // A brazier of herbs at the door of each home the plague has struck, while it lasts.
    this.fires = [];
    if (h.outbreak) {
      for (const id of h.outbreak.struck) {
        const b = s.buildings.find((o) => o.id === id);
        if (!b || b.kind !== 'home') continue;
        this.fires.push(this.homeSpot(s, b, 0.12, (half) => -half * 0.45, hash2(b.id, 5, 4922)));
      }
    }
    // The patients in the asklepieion's beds.
    this.beds = [];
    for (const b of s.buildings) {
      if (b.kind !== 'asklepieion') continue;
      const lying = h.sick.filter((x) => x.bed === b.id).length;
      if (!lying) continue;
      const f = this.frameOf(s, b);
      const c = Math.cos(f.yaw);
      const sn = Math.sin(f.yaw);
      for (let i = 0; i < Math.min(lying, ASK_BEDS.length); i++) {
        const [lx, lz] = ASK_BEDS[i];
        this.beds.push({ x: f.x + lx * c + lz * sn, y: f.y + ASK_BED_TOP, z: f.z - lx * sn + lz * c, yaw: f.yaw, seed: hash2(b.id, i, 4923) });
      }
    }
    // The quarantine's pennants.
    this.flags = [];
    if (quarantined(s)) {
      for (const b of s.buildings) {
        if (b.kind !== 'trading' && b.kind !== 'yard') continue;
        const f = this.frameOf(s, b);
        const [lx, lz] = PENNANT_AT[b.kind];
        const c = Math.cos(f.yaw);
        const sn = Math.sin(f.yaw);
        const x = f.x + lx * c + lz * sn;
        const z = f.z - lx * sn + lz * c;
        this.flags.push({ x, y: Math.max(f.y + 0.05, this.map.heightAt(x, z)), z, yaw: f.yaw, seed: b.id });
      }
    }
  }

  /** Each frame, between the folk's begin and end: push the figures, braziers and pennants, and move the smoke. */
  update(s: SimState, time: number, face: THREE.Quaternion): void {
    const day = Math.floor(s.tick / TICKS_PER_DAY);
    const count = s.health.sick.length + (s.health.outbreak?.struck.length ?? 0) + (s.health.quarantine > s.tick ? 1 : 0) + s.walkers.length;
    if (s !== this.last || s.rev !== this.seenRev || day !== this.seenDay || count !== this.seenCount) {
      this.last = s;
      this.seenRev = s.rev;
      this.seenDay = day;
      this.seenCount = count;
      this.plan(s);
    }
    for (const sp of this.atDoors) {
      // A cough every few seconds: a quick bow forward and back.
      const ph = (time / 2.6 + sp.seed) % 1;
      const bow = ph < 0.12 ? Math.sin((ph / 0.12) * Math.PI) * 0.35 : 0;
      this.place(sp.x, sp.y, sp.z, sp.yaw + Math.PI * 0.15, bow, 1.08);
      this.sick.push(this.m, this.c.copy(this.blanket).multiplyScalar(-(0.9 + 0.2 * sp.seed)));
    }
    for (const sp of this.beds) {
      this.place(sp.x, sp.y, sp.z, sp.yaw, 0, 0.92);
      this.patients.push(this.m, this.c.copy(this.sheet).multiplyScalar(-(0.85 + 0.15 * sp.seed)));
    }
    for (const sp of this.fires) {
      this.place(sp.x, sp.y, sp.z, sp.yaw, 0, 1.35);
      this.braziers.push(this.m, this.c.copy(this.plain).multiplyScalar(-1));
    }
    // (The pennants turn broadside to the camera, whichever way it looks, so the yellow always shows.)
    const camYaw = this.flags.length ? this.camE.setFromQuaternion(face, 'YXZ').y : 0;
    for (const sp of this.flags) {
      // (The pennant streams with a little flutter.)
      this.place(sp.x, sp.y, sp.z, camYaw + 0.35 + Math.sin(time * 2.2 + sp.seed) * 0.12, 0, 1);
      this.pennants.push(this.m, this.c.copy(this.plain).multiplyScalar(-1));
    }
    // The braziers' smoke: four puffs each, rising and swelling into a column that marks the house from afar.
    const need = this.fires.length * 4;
    if (need > this.cap) {
      const mat = this.puffs.material as THREE.Material;
      this.group.remove(this.puffs);
      this.puffs.dispose();
      this.puffs = this.makePuffs(mat, Math.max(need, this.cap * 2));
    }
    let n = 0;
    for (const sp of this.fires) {
      for (let k = 0; k < 4; k++) {
        const f = (time / 3.6 + k / 4 + sp.seed) % 1;
        const r = (0.04 + 0.14 * f) * Math.min(1, (1 - f) * 4);
        this.p.set(sp.x + f * f * 0.16, sp.y + 0.3 + f * 0.9, sp.z + f * 0.06);
        this.sc.set(r * 1.3, r * 1.2, 1);
        this.m.compose(this.p, face, this.sc);
        this.puffs.setMatrixAt(n++, this.m);
      }
    }
    this.puffs.count = n;
    this.puffs.visible = n > 0;
    if (n) this.puffs.instanceMatrix.needsUpdate = true;
  }

  private place(x: number, y: number, z: number, yaw: number, bow: number, s: number): void {
    this.e.set(0, yaw, -bow, 'YXZ');
    this.q.setFromEuler(this.e);
    this.p.set(x, y, z);
    this.sc.set(s, s, s);
    this.m.compose(this.p, this.q, this.sc);
  }
}
