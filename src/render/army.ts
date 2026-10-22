import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { hash2 } from '../map/noise';
import { PLACES, type CityId } from '../map/greece';
import { EMBLEMS, FALLEN_LIE, LIE, ordinal } from '../sim/army';
import type { Arrow, Company, SimState, Soldier } from '../sim/state';
import { ARCADIAN_BOSS, ARCADIAN_SHIELD, ARCADIAN_TUNIC, ARCHER_TUNIC, archerLook, CITY_COLOUR, CITY_TRIM, CRETAN_TUNIC, HOPLITE_TUNIC, hopliteLook } from './arms';
import type { FolkLooks, Look } from './looks';
import { col, PAL } from './palette';

/** A banner's pole: its height, and the cloth hanging from its crossbar. */
const POLE = 1.3;
const CLOTH_W = 0.42;
const CLOTH_H = 0.46;
/** The banners' atlas: cells of CELL px, COLS by ROWS (a company's cell by its number). */
const CELL = 128;
const COLS = 8;
const ROWS = 4;
/** Cloth columns and rows (it ripples). */
const CX = 6;
const CY = 2;
const MAX_BANNERS = COLS * ROWS;
/** Arrows in the air at once, at most (a pool). */
const MAX_ARROWS = 256;
/** How long a blow's lunge lasts (ticks). */
const LUNGE = 3;

/**
 * The army in the city (slice 23): every soldier as an instanced figure in
 * the folk's merged meshes (hoplites, the men walking in, archers), and every
 * company's banner: a pole (one instanced mesh) and its cloth, all the cloths
 * one mesh on one canvas atlas of the companies' emblems and numbers, so the
 * whole army is three draws however many companies there are. Soldiers move
 * a step a tick; they are drawn between their last two places.
 */
export class ArmyView {
  readonly group = new THREE.Group();
  /** Where each soldier and each company's banner cloth was drawn this frame (for hovering and clicking). */
  readonly soldierAt = new Map<number, THREE.Vector3>();
  readonly bannerAt = new Map<number, THREE.Vector3>();
  /** The company picked out (its banner raised, a ring round it), or 0. */
  selected = 0;
  /** The height of the ground a soldier stands on. */
  ground: (x: number, z: number) => number;
  private readonly hoplites: Look;
  private readonly recruits: Look;
  private readonly archers: Look;
  private readonly arcadians: Look;
  private readonly arrows: THREE.InstancedMesh;
  private readonly poles: THREE.InstancedMesh;
  private readonly cloth: THREE.Mesh;
  private readonly clothPos: THREE.BufferAttribute;
  private readonly clothUv: THREE.BufferAttribute;
  private readonly ring: THREE.Mesh;
  private readonly canvas: HTMLCanvasElement;
  private readonly tex: THREE.CanvasTexture;
  private readonly drawn = new Map<number, string>();
  /** Each soldier's place at the last two ticks seen, and each banner's. */
  private readonly was = new Map<number, { px: number; pz: number; x: number; z: number; face: number }>();
  private readonly flags = new Map<number, { px: number; pz: number; x: number; z: number; face: number }>();
  private lastTick = -1;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly c = new THREE.Color();
  private readonly e = new THREE.Euler();

  constructor(map: CoastMap, folk: FolkLooks) {
    this.group.name = 'army';
    this.ground = (x, z) => map.heightAt(x, z);
    this.hoplites = folk.people.look(hopliteLook(true));
    this.recruits = folk.people.look(hopliteLook(false));
    this.archers = folk.people.look(archerLook());
    this.arcadians = folk.people.look(hopliteLook(true, ARCADIAN_SHIELD, ARCADIAN_BOSS));
    // Arrows: a shaft and a head along +y, one pool.
    const shaft = new THREE.CylinderGeometry(0.004, 0.004, 0.2, 3).translate(0, -0.02, 0);
    const head = new THREE.ConeGeometry(0.01, 0.04, 3).translate(0, 0.1, 0);
    const fletch = new THREE.BoxGeometry(0.018, 0.04, 0.002).translate(0, -0.1, 0);
    this.arrows = new THREE.InstancedMesh(mergeAll([shaft, head, fletch]), new THREE.MeshStandardMaterial({ color: col(PAL.wood), flatShading: true, roughness: 0.8 }), MAX_ARROWS);
    this.arrows.name = 'army-arrows';
    this.arrows.count = 0;
    this.arrows.visible = false;
    this.arrows.frustumCulled = false;
    const wood = new THREE.MeshStandardMaterial({ color: col(PAL.pole), flatShading: true, roughness: 0.85 });
    const pole = new THREE.CylinderGeometry(0.018, 0.024, POLE, 5).translate(0, POLE / 2, 0);
    const bar = new THREE.CylinderGeometry(0.01, 0.01, CLOTH_W + 0.06, 4).rotateX(Math.PI / 2).translate(0, POLE - 0.04, 0);
    const tip = new THREE.ConeGeometry(0.03, 0.08, 4).translate(0, POLE + 0.04, 0);
    const geo = mergeAll([pole, bar, tip]);
    this.poles = new THREE.InstancedMesh(geo, wood, MAX_BANNERS);
    this.poles.name = 'army-poles';
    this.poles.castShadow = true;
    this.poles.count = 0;
    this.poles.frustumCulled = false;
    // The cloths: a grid each, written every frame (they ripple and follow their poles).
    this.canvas = document.createElement('canvas');
    this.canvas.width = CELL * COLS;
    this.canvas.height = CELL * ROWS;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    const per = (CX + 1) * (CY + 1);
    const g = new THREE.BufferGeometry();
    this.clothPos = new THREE.BufferAttribute(new Float32Array(MAX_BANNERS * per * 3), 3);
    this.clothPos.setUsage(THREE.DynamicDrawUsage);
    this.clothUv = new THREE.BufferAttribute(new Float32Array(MAX_BANNERS * per * 2), 2);
    this.clothUv.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.clothPos);
    g.setAttribute('uv', this.clothUv);
    const idx: number[] = [];
    for (let k = 0; k < MAX_BANNERS; k++) {
      for (let j = 0; j < CY; j++) {
        for (let i = 0; i < CX; i++) {
          const a = k * per + j * (CX + 1) + i;
          const b = a + 1;
          const c = a + CX + 1;
          const d = c + 1;
          idx.push(a, c, b, b, c, d);
        }
      }
    }
    g.setIndex(idx);
    g.setDrawRange(0, 0);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);
    this.cloth = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: this.tex, side: THREE.DoubleSide, roughness: 0.9, flatShading: true }));
    this.cloth.name = 'army-banners';
    this.cloth.castShadow = true;
    this.cloth.frustumCulled = false;
    // The ring round the picked company, on the ground.
    this.ring = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.2, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col('#ffd968'), transparent: true, opacity: 0.75, depthWrite: false }));
    this.ring.name = 'army-ring';
    this.ring.renderOrder = 3;
    this.ring.visible = false;
    this.group.add(this.poles, this.cloth, this.ring, this.arrows);
  }

  /** Soldiers drawn this frame. */
  get count(): number {
    return this.hoplites.count + this.recruits.count + this.archers.count + this.arcadians.count;
  }

  /** Draw the army (between the folk's begin and end). */
  update(s: SimState, alpha: number, time: number): void {
    const army = s.army;
    if (s.tick !== this.lastTick) {
      // A new tick: each one's place moves on (a first sighting, or a jump of more than a few ticks, starts where he stands).
      const jump = this.lastTick < 0 || s.tick - this.lastTick > 4 || s.tick < this.lastTick;
      this.lastTick = s.tick;
      const seen = new Set<number>();
      for (const x of army.soldiers) {
        seen.add(x.id);
        const w = this.was.get(x.id);
        if (!w || jump) this.was.set(x.id, { px: x.x, pz: x.z, x: x.x, z: x.z, face: x.face });
        else {
          w.px = w.x;
          w.pz = w.z;
          w.x = x.x;
          w.z = x.z;
          w.face = x.face;
        }
      }
      for (const id of this.was.keys()) if (!seen.has(id)) this.was.delete(id);
      const flagsSeen = new Set<number>();
      for (const c of army.companies) {
        flagsSeen.add(c.id);
        const f = this.flags.get(c.id);
        if (!f || jump) this.flags.set(c.id, { px: c.x, pz: c.z, x: c.x, z: c.z, face: c.face });
        else {
          f.px = f.x;
          f.pz = f.z;
          f.x = c.x;
          f.z = c.z;
          f.face = c.face;
        }
      }
      for (const id of this.flags.keys()) if (!flagsSeen.has(id)) this.flags.delete(id);
    }
    const a = Math.max(0, Math.min(1, alpha));
    const byId = new Map<number, Company>();
    for (const c of army.companies) byId.set(c.id, c);
    // The men.
    const live = new Set<number>();
    const now = s.tick + a;
    for (const x of army.soldiers) {
      const w = this.was.get(x.id);
      // (The healing are indoors at the barracks; the away are off in Greece: slice 28.)
      if (!w || x.state === 'healing' || x.state === 'away') continue;
      let px = w.px + (w.x - w.px) * a;
      let pz = w.pz + (w.z - w.pz) * a;
      const down = x.state === 'fallen' || (x.state === 'wounded' && x.path.length === 0);
      const moving = !down && Math.abs(w.x - w.px) + Math.abs(w.z - w.pz) > 1e-4;
      let roll = 0;
      let tilt = 0;
      let lift = 0.03;
      let shrink = 1;
      if (down) {
        // Down: toppling onto his side over a few ticks and lying there; the killed sink from sight before they are gone, the wounded lie until they get up.
        const since = now - x.fell;
        roll = (Math.PI / 2) * Math.min(1, Math.max(0, since) / 4);
        lift = 0.05;
        if (x.state === 'fallen') {
          const fade = Math.max(0, since - (FALLEN_LIE - 12)) / 12;
          lift -= fade * 0.12;
          shrink = 1 - fade * 0.3;
        } else if (since > LIE - 4) roll *= Math.max(0, (LIE - since) / 4);
      } else if (x.state === 'wounded') tilt = -0.25;
      else if (x.swung > 0 && now - x.swung >= 0 && now - x.swung < LUNGE) {
        // A blow: a hoplite thrusts (a lunge along the way he faces, and back); an archer leans into his bow as he looses.
        const k = Math.sin(((now - x.swung) / LUNGE) * Math.PI);
        if (x.foe > 0) {
          px += Math.cos(w.face) * 0.08 * k;
          pz += Math.sin(w.face) * 0.08 * k;
          tilt = -0.28 * k;
        } else tilt = 0.18 * k;
      }
      if (!down || x.state === 'wounded') live.add(x.id);
      this.place(x, px, pz, w.face, moving, roll, tilt, lift, shrink);
      const c = byId.get(x.company);
      const kind = c?.kind ?? 'hoplite';
      const tone = this.tunic(kind, x.company, c?.hired ?? '', c?.ally);
      if (!moving) tone.multiplyScalar(-1);
      if (kind === 'archer' && x.state !== 'leaving') this.archers.push(this.m, tone);
      else if (c?.hired === 'arcadian' || (!c?.ally && x.home === 0 && x.armed && kind === 'hoplite')) this.arcadians.push(this.m, tone);
      else if (x.armed && x.state !== 'leaving') this.hoplites.push(this.m, tone);
      else this.recruits.push(this.m, tone);
      if (!live.has(x.id)) continue;
      const at = this.soldierAt.get(x.id);
      if (at) at.copy(this.p);
      else this.soldierAt.set(x.id, this.p.clone());
    }
    for (const id of this.soldierAt.keys()) if (!live.has(id)) this.soldierAt.delete(id);
    this.flights(army.arrows, now);
    this.banners(army.companies.some((c) => c.order === 'away') ? army.companies.filter((c) => c.order !== 'away') : army.companies, a, time);
  }

  /** The tunic's colour: the kind's (or the hirelings' own), a shade of its own for each company. */
  private tunic(kind: Company['kind'], company: number, hired: Company['hired'], ally?: string): THREE.Color {
    // (Slice 34: an ally's or vassal's men in their own city's colour.)
    this.c.copy(col(ally && PLACES[ally as CityId] ? PLACES[ally as CityId].colour : hired === 'cretan' ? CRETAN_TUNIC : hired === 'arcadian' ? ARCADIAN_TUNIC : kind === 'archer' ? ARCHER_TUNIC : HOPLITE_TUNIC));
    return this.c.multiplyScalar(0.88 + 0.24 * hash2(company, 7, 2301));
  }

  /** A soldier's matrix: where he stands, the way he faces (the sim's angle in x, z), a bob as he steps; rolled onto his side when down, tilted as he strikes. */
  private place(x: Soldier, px: number, pz: number, face: number, moving: boolean, roll = 0, tilt = 0, lift = 0.03, shrink = 1): void {
    const phase = ((px + pz) * Math.PI * 2) / 0.44;
    const bob = moving ? Math.abs(Math.cos(phase)) * 0.012 : 0;
    this.e.set(roll + (moving ? Math.sin(phase) * 0.03 : 0), -face, tilt, 'YXZ');
    this.q.setFromEuler(this.e);
    this.p.set(px, this.ground(px, pz) + lift + bob, pz);
    const sc = (0.92 + 0.08 * hash2(x.id, 3, 2302)) * shrink;
    this.s.set(sc, sc, sc);
    this.m.compose(this.p, this.q, this.s);
  }

  /** The arrows in the air: each on a low arc from the bow to where it was aimed, pointing the way it flies. */
  private flights(arrows: readonly Arrow[], now: number): void {
    let n = 0;
    for (const ar of arrows) {
      if (n >= MAX_ARROWS) break;
      const span = Math.max(1, ar.t1 - ar.t0);
      const u = (now - ar.t0) / span;
      if (u < 0 || u > 1) continue;
      const dx = ar.x1 - ar.x0;
      const dz = ar.z1 - ar.z0;
      const d = Math.hypot(dx, dz);
      const peak = 0.12 + d * 0.06;
      const x = ar.x0 + dx * u;
      const z = ar.z0 + dz * u;
      // (From a tower's roof walk, slice 25: high above the ground.)
      const y0 = this.ground(ar.x0, ar.z0) + (ar.h0 ?? 0.3);
      const y1 = this.ground(ar.x1, ar.z1) + 0.22;
      const y = y0 + (y1 - y0) * u + 4 * peak * u * (1 - u);
      // Its heading: along the way, and up or down the arc's slope.
      const dy = (y1 - y0 + 4 * peak * (1 - 2 * u)) / Math.max(1e-3, d);
      this.p.set(x, y, z);
      DIR.set(dx / Math.max(1e-3, d), dy, dz / Math.max(1e-3, d)).normalize();
      this.q.setFromUnitVectors(UP, DIR);
      this.s.set(1, 1, 1);
      this.m.compose(this.p, this.q, this.s);
      this.arrows.setMatrixAt(n++, this.m);
    }
    this.arrows.count = n;
    this.arrows.visible = n > 0;
    if (n > 0) this.arrows.instanceMatrix.needsUpdate = true;
  }

  /** The banners: poles, cloths (rippling), the ring under the picked one. */
  private banners(companies: readonly Company[], a: number, time: number): void {
    const n = Math.min(MAX_BANNERS, companies.length);
    const pos = this.clothPos.array as Float32Array;
    const uv = this.clothUv.array as Float32Array;
    const per = (CX + 1) * (CY + 1);
    let dirty = false;
    const live = new Set<number>();
    this.ring.visible = false;
    for (let k = 0; k < n; k++) {
      const c = companies[k];
      live.add(c.id);
      const f = this.flags.get(c.id);
      const x = f ? f.px + (f.x - f.px) * a : c.x;
      const z = f ? f.pz + (f.z - f.pz) * a : c.z;
      const face = f?.face ?? c.face;
      const picked = c.id === this.selected;
      const lift = picked ? 0.18 + 0.04 * Math.sin(time * 4) : 0;
      const y = this.ground(x, z) + lift;
      this.p.set(x, y, z);
      this.q.setFromAxisAngle(UP, -face);
      this.s.set(1, 1, 1);
      this.m.compose(this.p, this.q, this.s);
      this.poles.setMatrixAt(k, this.m);
      if (picked) {
        this.ring.visible = true;
        this.ring.position.set(x, this.ground(x, z) + 0.06, z);
        (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.25 * Math.sin(time * 4);
      }
      // Its cell of the atlas (drawn again only when what it shows changes).
      const cell = (c.n - 1) % MAX_BANNERS;
      const sig = `${c.n}:${c.emblem}:${c.kind}:${c.ally ?? ''}`;
      if (this.drawn.get(cell) !== sig) {
        this.drawn.set(cell, sig);
        drawCell(this.canvas, cell, c);
        dirty = true;
      }
      // The cloth hangs across the way the company faces (so it reads from the front), rippling in the wind.
      const fx = Math.cos(face);
      const fz = Math.sin(face);
      const sx = -fz;
      const sz = fx;
      const u0 = (cell % COLS) / COLS;
      const v0 = 1 - Math.floor(cell / COLS) / ROWS;
      for (let j = 0; j <= CY; j++) {
        for (let i = 0; i <= CX; i++) {
          const o = k * per + j * (CX + 1) + i;
          const u = i / CX;
          const v = j / CY;
          const along = (u - 0.5) * CLOTH_W;
          const ripple = 0.035 * Math.sin(time * 3.1 + u * 5 + c.id) * (0.4 + v) + (picked ? 0 : 0);
          pos[o * 3] = x + sx * along + fx * ripple;
          pos[o * 3 + 1] = y + POLE - 0.05 - v * CLOTH_H;
          pos[o * 3 + 2] = z + sz * along + fz * ripple;
          uv[o * 2] = u0 + (u * (CELL - 4) + 2) / (CELL * COLS);
          uv[o * 2 + 1] = v0 - (v * (CELL - 4) + 2) / (CELL * ROWS);
        }
      }
      const at = this.bannerAt.get(c.id);
      const cy = y + POLE - CLOTH_H / 2;
      if (at) at.set(x, cy, z);
      else this.bannerAt.set(c.id, new THREE.Vector3(x, cy, z));
    }
    for (const id of this.bannerAt.keys()) if (!live.has(id)) this.bannerAt.delete(id);
    this.poles.count = n;
    this.poles.visible = n > 0;
    this.poles.instanceMatrix.needsUpdate = true;
    this.cloth.visible = n > 0;
    this.cloth.geometry.setDrawRange(0, n * CX * CY * 6);
    this.clothPos.needsUpdate = true;
    this.clothUv.needsUpdate = true;
    this.cloth.geometry.computeVertexNormals();
    if (dirty) this.tex.needsUpdate = true;
  }
}

const UP = new THREE.Vector3(0, 1, 0);
const DIR = new THREE.Vector3();

/** Merge plain geometries (positions and normals) into one. */
function mergeAll(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [];
  for (const g0 of geos) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) pos.push(p.getX(i), p.getY(i), p.getZ(i));
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.computeVertexNormals();
  return out;
}

/** Draw a company's banner into its cell: the city's colour, a trim border, its emblem and its number (archers' with a fringe). */
function drawCell(canvas: HTMLCanvasElement, cell: number, c: Company): void {
  const g = canvas.getContext('2d');
  if (!g) return;
  const x0 = (cell % COLS) * CELL;
  const y0 = Math.floor(cell / COLS) * CELL;
  // Slice 34: an ally's or vassal's company carries its own city's banner: its colours, its letter, its name.
  if (c.ally && PLACES[c.ally]) {
    const p = PLACES[c.ally];
    g.save();
    g.translate(x0, y0);
    g.clearRect(0, 0, CELL, CELL);
    g.fillStyle = p.colour;
    g.fillRect(0, 0, CELL, CELL);
    g.strokeStyle = p.trim;
    g.lineWidth = 7;
    g.strokeRect(7, 7, CELL - 14, CELL - 14);
    g.fillStyle = p.trim;
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.font = 'bold 64px Georgia, serif';
    g.fillText(ALLY_LETTER[c.ally] ?? p.name[0], CELL / 2, CELL * 0.62);
    g.font = 'bold 22px Georgia, serif';
    g.fillText(p.name.toUpperCase(), CELL / 2, CELL - 20);
    g.restore();
    return;
  }
  g.save();
  g.translate(x0, y0);
  g.clearRect(0, 0, CELL, CELL);
  g.fillStyle = CITY_COLOUR;
  g.fillRect(0, 0, CELL, CELL);
  g.strokeStyle = CITY_TRIM;
  g.lineWidth = 7;
  g.strokeRect(7, 7, CELL - 14, CELL - 14);
  if (c.kind === 'archer') {
    // A fringe of trim along the bottom.
    g.fillStyle = CITY_TRIM;
    for (let i = 0; i < 8; i++) g.fillRect(6 + i * 15, CELL - 14, 7, 14);
  }
  g.fillStyle = CITY_TRIM;
  g.strokeStyle = CITY_TRIM;
  g.translate(CELL / 2, CELL * 0.43);
  emblem(g, c.emblem);
  g.restore();
  g.save();
  g.translate(x0, y0);
  g.fillStyle = CITY_TRIM;
  g.font = 'bold 26px Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.fillText(ordinal(c.n).toUpperCase(), CELL / 2, CELL - 20);
  g.restore();
}

/** (Slice 34) The letter on a city's banner, as its own coins and shields bore it. */
const ALLY_LETTER: Partial<Record<string, string>> = { corinth: 'Ϙ', sparta: 'Λ', argos: 'Α', athens: 'ΑΘΕ', thebes: 'Θ', troy: 'Τ', knossos: 'Κ', rhodes: 'Ρ', memphis: 'Μ' };

/** An emblem in the trim colour, centred on the origin, about 70 px across. */
function emblem(g: CanvasRenderingContext2D, which: number): void {
  const e = EMBLEMS[which % EMBLEMS.length];
  g.lineWidth = 6;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const blob = (x: number, y: number, rx: number, ry: number): void => {
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
  };
  const hole = (x: number, y: number, r: number): void => {
    g.save();
    g.fillStyle = CITY_COLOUR;
    blob(x, y, r, r);
    g.restore();
  };
  const path = (pts: Array<[number, number]>, fill = true): void => {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (const [x, y] of pts.slice(1)) g.lineTo(x, y);
    if (fill) {
      g.closePath();
      g.fill();
    } else g.stroke();
  };
  if (e === 'owl') {
    blob(0, 6, 22, 28);
    path([[-20, -14], [-14, -32], [-6, -18]]);
    path([[20, -14], [14, -32], [6, -18]]);
    hole(-9, -6, 7);
    hole(9, -6, 7);
    path([[-4, 2], [4, 2], [0, 10]], true);
  } else if (e === 'boar') {
    blob(-4, 4, 30, 17);
    path([[24, -4], [38, 0], [24, 12]]);
    for (const x of [-22, -10, 6, 16]) g.fillRect(x, 16, 6, 16);
    path([[-30, -8], [-14, -20], [6, -16], [18, -14]], false);
    hole(22, 0, 3);
  } else if (e === 'lion') {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      path([[Math.cos(a) * 18, Math.sin(a) * 18], [Math.cos(a + 0.26) * 34, Math.sin(a + 0.26) * 34], [Math.cos(a + 0.52) * 18, Math.sin(a + 0.52) * 18]]);
    }
    blob(0, 0, 22, 22);
    hole(-8, -4, 4);
    hole(8, -4, 4);
    hole(0, 9, 5);
  } else if (e === 'bull') {
    path([[-18, -10], [18, -10], [10, 22], [-10, 22]]);
    g.beginPath();
    g.arc(-22, -14, 14, Math.PI * 0.1, Math.PI * 1.0, true);
    g.stroke();
    g.beginPath();
    g.arc(22, -14, 14, Math.PI * 0.9, 0, false);
    g.stroke();
    hole(-7, 2, 4);
    hole(7, 2, 4);
  } else if (e === 'horse') {
    path([[-14, 30], [-18, 4], [-6, -22], [10, -32], [28, -18], [26, -10], [8, -12], [4, 6], [14, 30]]);
    hole(10, -22, 3);
  } else if (e === 'dolphin') {
    g.lineWidth = 12;
    g.beginPath();
    g.arc(0, 16, 30, Math.PI * 1.15, Math.PI * 1.9, false);
    g.stroke();
    path([[24, -2], [38, -12], [34, 8]]);
    path([[-28, 4], [-40, 0], [-30, 12]]);
    path([[-2, -14], [6, -26], [10, -12]]);
  } else if (e === 'trident') {
    g.fillRect(-3, -14, 6, 46);
    g.fillRect(-22, -12, 44, 6);
    for (const x of [-22, 0, 22]) path([[x - 5, -10], [x, -32], [x + 5, -10]]);
  } else {
    // The snake: a sinuous body, its head up.
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(-30, 28);
    g.bezierCurveTo(-40, 6, 0, 16, -2, -2);
    g.bezierCurveTo(-4, -20, 26, -12, 20, -28);
    g.stroke();
    blob(20, -30, 9, 7);
  }
}
