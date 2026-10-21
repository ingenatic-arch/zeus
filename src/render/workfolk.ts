import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { hash2 } from '../map/noise';
import { footSide } from '../sim/buildings';
import { held, MARBLE, TIMBER } from '../sim/foods';
import { rateOf } from '../sim/labour';
import { quarryFace, quarryYaw } from '../sim/materials';
import type { Building, SimState, Walker } from '../sim/state';
import { storeOf } from '../sim/stores';
import { facingOf } from './homes';
import type { FolkLooks, Look } from './looks';
import { col, PAL } from './palette';
import { quarryLevels } from './materialworks';
import { lumpy } from './trees';
import { leg, mergeTinted, type TPart } from './walkers';

/**
 * The people of the works (slice 32), drawn into the folk's merged meshes
 * with the other walkers: the quarrymen at the face, swinging their picks and
 * levering the cut blocks; the loggers walking out with their axes on their
 * shoulders, chopping at a tree and trimming it where it fell, carrying the
 * logs home; the ox sledges dragging marble down to the storehouse and the
 * ox carts of logs; and, at each copper mine, its miners (drawn from how
 * well it is staffed, not walkers of the sim): picks at the rock face, one
 * at the windlass, one wheeling the ore out along the planks.
 *
 * Every pose is a look of its own: a swing is two looks taken in turn, timed
 * by the sim's clock (so they stop when the game is paused).
 */

type V3 = [number, number, number];

/** A rod from a to b (radius r at a, r2 at b). */
function rod(a: V3, b: V3, r: number, color: string, r2 = r, tint = false): TPart {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const len = Math.max(1e-4, va.distanceTo(vb));
  const g = new THREE.CylinderGeometry(r2, r, len, 4).translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize()));
  g.translate(a[0], a[1], a[2]);
  return { geo: g, color, tint };
}

const SHOULDER = 0.3;
const ARM_Z = 0.068;

/** A working man facing +x: legs, a short tunic (the tinted part) belted, his head and a cap or bare hair. */
function body(cap: string | null, apron: string | null): TPart[] {
  const parts: TPart[] = [
    leg(0, -0.03, 0.12, 0.02, PAL.skin, -1),
    leg(0, 0.03, 0.12, 0.02, PAL.skin, 1),
    { geo: new THREE.CylinderGeometry(0.056, 0.08, 0.2, 6).translate(0, 0.21, 0), color: '', tint: true },
    { geo: new THREE.CylinderGeometry(0.068, 0.068, 0.022, 6).translate(0, 0.19, 0), color: PAL.hide },
    { geo: new THREE.IcosahedronGeometry(0.056, 0).translate(0.005, 0.36, 0), color: PAL.skin },
  ];
  parts.push(cap ? { geo: new THREE.IcosahedronGeometry(0.06, 0).scale(1, 0.6, 1).translate(-0.008, 0.395, 0), color: cap } : { geo: new THREE.IcosahedronGeometry(0.06, 0).scale(1, 0.7, 1).translate(-0.012, 0.39, 0), color: PAL.hair });
  if (apron) parts.push({ geo: new THREE.BoxGeometry(0.02, 0.13, 0.1).translate(0.07, 0.14, 0), color: apron });
  return parts;
}

/** Both arms from the shoulders to the hands (one hand a little behind the other on a haft). */
const arms = (h1: V3, h2: V3): TPart[] => [rod([0, SHOULDER, ARM_Z], h1, 0.016, PAL.skin, 0.014), rod([0, SHOULDER, -ARM_Z], h2, 0.016, PAL.skin, 0.014)];

/** A pick (or a mattock) held at `hand`, its haft out to `tip`, the iron head across the tip, pointing `point` (unit, in xy). */
function pick(hand: V3, tip: V3, point: [number, number]): TPart[] {
  const [px, py] = point;
  return [
    rod(hand, tip, 0.008, PAL.wood),
    rod(tip, [tip[0] + px * 0.08, tip[1] + py * 0.08, tip[2]], 0.012, PAL.rockGrey, 0.003),
    rod(tip, [tip[0] - px * 0.05, tip[1] - py * 0.05, tip[2]], 0.012, PAL.rockGrey, 0.006),
  ];
}

/** An axe held at `hand`, its haft out to `tip`, the blade at the tip facing `edge` (unit, in xy). */
function axe(hand: V3, tip: V3, edge: [number, number]): TPart[] {
  const [ex, ey] = edge;
  const blade = new THREE.BoxGeometry(0.05, 0.045, 0.012);
  blade.rotateZ(Math.atan2(ey, ex)).translate(tip[0] + ex * 0.025, tip[1] + ey * 0.025, tip[2]);
  return [rod(hand, tip, 0.008, PAL.wood), { geo: blade, color: PAL.rockGrey }];
}

/** Unit vector in xy. */
const unit = (x: number, y: number): [number, number] => {
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
};

// ---------------------------------------------------------------------------
// The quarrymen and the miners.

const DUST = '#cfc6b2';

/** A quarryman (or a miner, darker capped) swinging his pick: raised over his head, or down into the rock in front of him. */
function picker(down: boolean, miner: boolean): THREE.BufferGeometry {
  const parts = body(miner ? PAL.hide : DUST, miner ? null : PAL.hide);
  if (!down) {
    const hand: V3 = [0.02, 0.47, 0];
    parts.push(...arms([0.02, 0.47, 0.02], [0.03, 0.43, -0.02]), ...pick(hand, [-0.12, 0.64, 0], unit(0.16, 0.12)));
  } else {
    const hand: V3 = [0.17, 0.24, 0];
    parts.push(...arms([0.17, 0.24, 0.02], [0.12, 0.27, -0.02]), ...pick(hand, [0.36, 0.17, 0], unit(0.06, -0.2)));
  }
  return mergeTinted(parts);
}

/** A quarryman bent to a long iron bar, levering a cut block free. */
function leverer(): THREE.BufferGeometry {
  const parts = body(DUST, PAL.hide);
  parts.push(...arms([0.15, 0.23, 0.03], [0.1, 0.27, -0.03]), rod([0.07, 0.3, 0], [0.34, 0.02, 0], 0.009, PAL.charDark));
  return mergeTinted(parts);
}

/** A miner at the windlass, both hands on the crank: up, or down. */
function cranker(up: boolean): THREE.BufferGeometry {
  const parts = body(PAL.hide, null);
  const h: V3 = up ? [0.13, 0.42, 0] : [0.15, 0.28, 0];
  parts.push(...arms([h[0], h[1], 0.02], [h[0], h[1], -0.02]));
  return mergeTinted(parts);
}

/** A miner wheeling a barrow ahead of him, heaped with green ore (or empty, back for more). */
function barrower(full: boolean): THREE.BufferGeometry {
  const parts = body(PAL.hide, null);
  parts.push(...arms([0.13, 0.2, 0.07], [0.13, 0.2, -0.07]));
  for (const z of [-0.07, 0.07]) parts.push(rod([0.1, 0.2, z], [0.34, 0.1, z * 0.6], 0.008, PAL.woodDark));
  parts.push({ geo: new THREE.BoxGeometry(0.17, 0.06, 0.12).translate(0.27, 0.12, 0), color: PAL.wood });
  parts.push({ geo: new THREE.CylinderGeometry(0.045, 0.045, 0.02, 7).rotateX(Math.PI / 2).translate(0.37, 0.045, 0), color: PAL.woodDark });
  for (const x of [0.22, 0.3]) parts.push(rod([x, 0.09, 0], [x, 0.0, 0], 0.008, PAL.woodDark));
  if (full) {
    parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.07, 0), 0.35, 3401).scale(1.1, 0.5, 0.8).translate(0.27, 0.16, 0), color: PAL.ore });
    parts.push({ geo: lumpy(new THREE.DodecahedronGeometry(0.03, 0), 0.3, 3402).translate(0.3, 0.19, 0.02), color: PAL.oreDark });
  }
  return mergeTinted(parts);
}

// ---------------------------------------------------------------------------
// The loggers.

const LOG = PAL.log;
const LOG_END = '#d6b27a';

/** A logger walking out, his axe on his shoulder. */
function loggerWalk(): THREE.BufferGeometry {
  const parts = body(null, null);
  parts.push(rod([0, SHOULDER, ARM_Z], [0.06, 0.33, 0.09], 0.016, PAL.skin, 0.014));
  parts.push(rod([0, SHOULDER, -ARM_Z], [0.02, 0.17, -0.08], 0.016, PAL.skin, 0.014));
  parts.push(...axe([0.06, 0.33, 0.09], [-0.2, 0.37, 0.08], unit(0, 1)));
  return mergeTinted(parts);
}

/** A logger's swing: the axe back over his shoulder, or into the trunk (low: trimming a fallen tree). */
function chopper(stage: 'back' | 'in' | 'lowBack' | 'lowIn'): THREE.BufferGeometry {
  const parts = body(null, null);
  if (stage === 'back') parts.push(...arms([0.0, 0.44, 0.05], [0.02, 0.4, 0.02]), ...axe([0.0, 0.44, 0.05], [-0.14, 0.56, 0.12], unit(-0.4, 1)));
  else if (stage === 'in') parts.push(...arms([0.17, 0.27, 0.02], [0.13, 0.28, -0.01]), ...axe([0.17, 0.27, 0.02], [0.33, 0.22, 0.0], unit(1, -0.2)));
  else if (stage === 'lowBack') parts.push(...arms([0.04, 0.42, 0.03], [0.05, 0.38, 0.0]), ...axe([0.04, 0.42, 0.03], [-0.08, 0.57, 0.04], unit(-0.6, 1)));
  else parts.push(...arms([0.16, 0.2, 0.02], [0.12, 0.23, -0.01]), ...axe([0.16, 0.2, 0.02], [0.3, 0.06, 0.0], unit(0.6, -1)));
  return mergeTinted(parts);
}

/** A logger carrying logs home: two on his shoulder, steadied with one hand, his axe in the other. */
function loggerCarry(): THREE.BufferGeometry {
  const parts = body(null, null);
  parts.push(rod([0, SHOULDER, ARM_Z], [0.06, 0.4, 0.06], 0.016, PAL.skin, 0.014));
  parts.push(rod([0, SHOULDER, -ARM_Z], [0.04, 0.17, -0.08], 0.016, PAL.skin, 0.014));
  for (const [z, y] of [[0.06, 0.37], [0.03, 0.42]]) {
    parts.push({ geo: new THREE.CylinderGeometry(0.03, 0.032, 0.5, 6).rotateZ(Math.PI / 2 - 0.08).translate(-0.04, y, z), color: z > 0.05 ? LOG : PAL.logDark });
    for (const x of [-0.29, 0.21]) parts.push({ geo: new THREE.CylinderGeometry(0.027, 0.027, 0.004, 6).rotateZ(Math.PI / 2 - 0.08).translate(x, y + (x < 0 ? 0.02 : -0.02), z), color: LOG_END });
  }
  parts.push(...axe([0.04, 0.17, -0.08], [0.1, 0.02, -0.09], unit(1, 0)));
  return mergeTinted(parts);
}

// ---------------------------------------------------------------------------
// The ox sledge and the ox cart of logs.

/** The ox under its yoke at x = ox, facing +x (as the ox carts' ox), and its driver at its head with a goad (tinted tunic). */
function oxAndDriver(ox: number): TPart[] {
  const parts: TPart[] = [];
  parts.push({ geo: lumpy(new THREE.BoxGeometry(0.4, 0.18, 0.17, 2, 1, 1), 0.1, 501).translate(ox, 0.27, 0), color: PAL.ox });
  parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.09, 0), 0.1, 504).scale(1, 0.8, 0.9).translate(ox + 0.1, 0.35, 0), color: PAL.ox });
  parts.push({ geo: lumpy(new THREE.BoxGeometry(0.13, 0.11, 0.1), 0.08, 502).translate(ox + 0.26, 0.29, 0), color: PAL.ox });
  parts.push({ geo: new THREE.BoxGeometry(0.06, 0.06, 0.08).translate(ox + 0.33, 0.26, 0), color: PAL.oxDark });
  parts.push({ geo: new THREE.CylinderGeometry(0.009, 0.016, 0.2, 4).rotateX(Math.PI / 2).translate(ox + 0.25, 0.37, 0), color: PAL.horn });
  for (const [x, z, w] of [[ox - 0.14, -0.055, 0.5], [ox - 0.14, 0.055, -0.5], [ox + 0.14, -0.055, -0.5], [ox + 0.14, 0.055, 0.5]]) parts.push(leg(x, z, 0.19, 0.026, PAL.oxDark, w));
  parts.push({ geo: new THREE.BoxGeometry(0.03, 0.03, 0.24).translate(ox + 0.18, 0.38, 0), color: PAL.woodDark });
  // The driver, walking at the ox's near shoulder.
  const dx = ox + 0.2;
  const dz = 0.17;
  parts.push(leg(dx, dz - 0.03, 0.12, 0.02, PAL.skin, -1), leg(dx, dz + 0.03, 0.12, 0.02, PAL.skin, 1));
  parts.push({ geo: new THREE.CylinderGeometry(0.055, 0.08, 0.2, 6).translate(dx, 0.21, dz), color: '', tint: true });
  parts.push({ geo: new THREE.IcosahedronGeometry(0.055, 0).translate(dx + 0.005, 0.36, dz), color: PAL.skin });
  parts.push({ geo: new THREE.IcosahedronGeometry(0.058, 0).scale(1, 0.7, 1).translate(dx - 0.01, 0.385, dz), color: PAL.hair });
  parts.push(rod([dx, SHOULDER, dz - 0.06], [dx + 0.1, 0.24, dz - 0.08], 0.015, PAL.skin, 0.013));
  parts.push(rod([dx + 0.1, 0.24, dz - 0.08], [dx + 0.36, 0.44, dz - 0.1], 0.006, PAL.wood));
  return parts;
}

const MARBLE_FRESH = '#efebe2';
const MARBLE_SHADE = '#d8d1c2';

/** The ox sledge: two runners turned up at the front, a deck of planks, a pole to the yoke; loaded with three blocks of marble roped down. */
function sledge(loaded: boolean): THREE.BufferGeometry {
  const parts = oxAndDriver(0.24);
  parts.push({ geo: new THREE.BoxGeometry(0.42, 0.022, 0.022).translate(-0.02, 0.24, 0), color: PAL.cart });
  for (const z of [-0.11, 0.11]) {
    parts.push({ geo: new THREE.BoxGeometry(0.5, 0.03, 0.035).translate(-0.3, 0.018, z), color: PAL.woodDark });
    parts.push({ geo: new THREE.BoxGeometry(0.08, 0.03, 0.035).rotateZ(0.6).translate(-0.03, 0.04, z), color: PAL.woodDark });
  }
  parts.push({ geo: new THREE.BoxGeometry(0.46, 0.025, 0.28).translate(-0.31, 0.05, 0), color: PAL.cart });
  for (const x of [-0.5, -0.31, -0.12]) parts.push({ geo: new THREE.BoxGeometry(0.03, 0.03, 0.3).translate(x, 0.035, 0), color: PAL.timberDark });
  if (loaded) {
    parts.push({ geo: lumpy(new THREE.BoxGeometry(0.2, 0.11, 0.13, 1, 1, 1), 0.04, 3410).translate(-0.42, 0.118, -0.06), color: MARBLE_FRESH });
    parts.push({ geo: lumpy(new THREE.BoxGeometry(0.2, 0.11, 0.13, 1, 1, 1), 0.04, 3411).translate(-0.2, 0.118, 0.05), color: MARBLE_SHADE });
    parts.push({ geo: lumpy(new THREE.BoxGeometry(0.18, 0.1, 0.12, 1, 1, 1), 0.04, 3412).translate(-0.32, 0.22, 0.0), color: MARBLE_FRESH });
    for (const x of [-0.4, -0.22]) parts.push({ geo: new THREE.BoxGeometry(0.012, 0.012, 0.3).translate(x, 0.27, 0), color: PAL.rope });
  }
  return mergeTinted(parts);
}

/** The ox cart of logs: two wheels under a bed, five logs lying along it, three and two, running out past its tail. */
function timberCart(): THREE.BufferGeometry {
  const parts = oxAndDriver(0.2);
  parts.push({ geo: new THREE.BoxGeometry(0.4, 0.025, 0.025).translate(0.08 - 0.2, 0.26, 0), color: PAL.cart });
  const cx = -0.2;
  parts.push({ geo: new THREE.BoxGeometry(0.32, 0.04, 0.26).translate(cx, 0.2, 0), color: PAL.cart });
  for (const z of [-0.15, 0.15]) {
    parts.push({ geo: new THREE.CylinderGeometry(0.12, 0.12, 0.03, 8).rotateX(Math.PI / 2).translate(cx, 0.12, z), color: PAL.woodDark });
    parts.push({ geo: new THREE.CylinderGeometry(0.03, 0.03, 0.04, 6).rotateX(Math.PI / 2).translate(cx, 0.12, z), color: PAL.cart });
  }
  for (const z of [-0.12, 0.12]) parts.push(rod([cx - 0.1, 0.2, z], [cx - 0.1, 0.36, z], 0.01, PAL.woodDark), rod([cx + 0.12, 0.2, z], [cx + 0.12, 0.36, z], 0.01, PAL.woodDark));
  const r = 0.038;
  for (const [z, y, k] of [[-0.08, 0, 0], [0, 0, 1], [0.08, 0, 2], [-0.04, 1, 3], [0.04, 1, 4]]) {
    const yy = 0.22 + r + y * r * 1.75;
    const x = cx - 0.08;
    parts.push({ geo: new THREE.CylinderGeometry(r, r * 1.05, 0.6, 6).rotateZ(Math.PI / 2).translate(x, yy, z), color: k % 2 ? PAL.logDark : LOG });
    for (const e of [x - 0.302, x + 0.302]) parts.push({ geo: new THREE.CylinderGeometry(r * 0.9, r * 0.9, 0.004, 6).rotateZ(Math.PI / 2).translate(e, yy, z), color: LOG_END });
  }
  parts.push({ geo: new THREE.BoxGeometry(0.012, 0.012, 0.24).translate(cx - 0.02, 0.22 + r * 3.9, 0), color: PAL.rope });
  return mergeTinted(parts);
}

// ---------------------------------------------------------------------------

const QUARRY_TUNIC = col('#bdb4a1');
const MINER_TUNIC = col('#7a604a');
const LOGGER_TUNICS = ['#6d6b3c', '#7b5b3a', '#5f6a4a'].map((c) => col(c));

/** How far from the trunk a logger stands to chop (the trunk's own thickness and his reach), and how long a felled tree takes to go over (as the plants draw it, trees.ts). */
const AT_TRUNK = 0.42;
const FALL_SEEN = 4.5;

/** The swing of a pick or an axe: how long a stroke takes (ticks), and how much of it the tool is raised. */
const STROKE = 7;
const RAISED = 0.6;

export class Workfolk {
  private readonly pickUp: Look;
  private readonly pickDown: Look;
  private readonly lever: Look;
  private readonly minerUp: Look;
  private readonly minerDown: Look;
  private readonly crank: [Look, Look];
  private readonly barrow: [Look, Look];
  private readonly walk: Look;
  private readonly chop: Look[];
  private readonly carry: Look;
  private readonly sledges: [Look, Look];
  private readonly logCart: Look;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3(1, 1, 1);
  private readonly c = new THREE.Color();
  /** The ground walkers stand on (the bridges', where they cross one): set by the city view. */
  ground: (x: number, z: number) => number;
  /** Each quarry's floor (height) and turn, by id, for the buildings' revision it was worked out at. */
  private floors = new Map<number, { y: number; yaw: number; bench: number }>();
  private floorsRev = -1;

  constructor(
    private readonly map: CoastMap,
    folk: FolkLooks,
  ) {
    this.ground = (x, z) => map.heightAt(x, z);
    const small = (g: THREE.BufferGeometry): Look => folk.people.look(g);
    const big = (g: THREE.BufferGeometry): Look => folk.big.look(g);
    this.pickUp = small(picker(false, false));
    this.pickDown = small(picker(true, false));
    this.lever = small(leverer());
    this.minerUp = small(picker(false, true));
    this.minerDown = small(picker(true, true));
    this.crank = [small(cranker(true)), small(cranker(false))];
    this.barrow = [small(barrower(false)), small(barrower(true))];
    this.walk = small(loggerWalk());
    this.chop = (['back', 'in', 'lowBack', 'lowIn'] as const).map((k) => small(chopper(k)));
    this.carry = small(loggerCarry());
    this.sledges = [big(sledge(false)), big(sledge(true))];
    this.logCart = big(timberCart());
  }

  /** Whether this walker is drawn here (the walkers' view leaves them to it). */
  static draws(w: Walker): boolean {
    return w.kind === 'quarryman' || w.kind === 'logger' || w.kind === 'sledge' || (w.kind === 'cart' && w.food === TIMBER && w.load > 0);
  }

  /** The floor and turn of a building drawn by Works, levelled as Works levels it: the highest ground under it (`high`), or half-way between its lowest and highest. */
  private levelOf(s: SimState, b: Building, high: boolean): { y: number; yaw: number; bench: number } {
    if (s.rev !== this.floorsRev) {
      this.floorsRev = s.rev;
      this.floors.clear();
    }
    let f = this.floors.get(b.id);
    if (f) return f;
    const half = footSide(b) / 2;
    const cx = b.x + half;
    const cz = b.z + half;
    const H = half - 0.05;
    let lo = Infinity;
    let hi = -Infinity;
    for (const ax of [-1, 0, 1]) {
      for (const az of [-1, 0, 1]) {
        const h = this.map.heightAt(cx + ax * H, cz + az * H);
        lo = Math.min(lo, h);
        hi = Math.max(hi, h);
      }
    }
    const yaw = b.kind === 'quarry' ? quarryYaw(quarryFace(this.map, b.x, b.z)) : facingOf(s, this.map.size, b);
    if (b.kind === 'quarry') {
      // Its floor and the bench at its face (see quarryLevels).
      const l = quarryLevels((x, z) => this.map.heightAt(x, z), b, yaw);
      f = { y: l.front, yaw, bench: l.back };
    } else f = { y: (high ? hi : (lo + hi) / 2) + 0.01, yaw, bench: 0 };
    this.floors.set(b.id, f);
    return f;
  }

  /** Place a figure at (x, y, z) facing `yaw` (the walkers' turn: atan2(-dz, dx)), rocking `rock`. */
  private place(x: number, y: number, z: number, yaw: number, sc: number, rock = 0): void {
    this.e.set(rock, yaw, 0, 'YXZ');
    this.q.setFromEuler(this.e);
    this.p.set(x, y, z);
    this.s.set(sc, sc, sc);
    this.m.compose(this.p, this.q, this.s);
  }

  /** Which half of a stroke `now` falls in, for figure `seed`: raised (true) or struck. */
  private raised(now: number, seed: number, stroke = STROKE): boolean {
    const f = (now / stroke + hash2(seed, 1, 3420)) % 1;
    return f < RAISED;
  }

  /**
   * Draw one of the works' walkers (see draws()); `along` gives a point and
   * heading `d` along its path, `lead` how far along it is drawn. Returns
   * where it stands (for hovering), or null when it isn't one of these.
   */
  walker(s: SimState, w: Walker, lead: number, total: number, along: (d: number) => [number, number, number, number], now: number): THREE.Vector3 | null {
    if (!Workfolk.draws(w)) return null;
    if (w.kind === 'quarryman') return this.quarryman(s, w, now);
    if (w.kind === 'logger') return this.logger(s, w, lead, total, along, now);
    const [x, z, dx, dz] = along(lead);
    const moving = lead < total && w.wait <= 0;
    const phase = ((x + z) * Math.PI * 2) / 0.44;
    const bob = Math.abs(Math.cos(phase)) * 0.004 * (moving ? 1 : 0);
    this.place(x, this.ground(x, z) + 0.03 + bob, z, Math.atan2(-dz, dx), 0.95, Math.sin(phase) * 0.01 * (moving ? 1 : 0));
    this.c.copy(LOGGER_TUNICS[Math.floor(hash2(w.origin, 3, 62) * LOGGER_TUNICS.length)]);
    if (!moving) this.c.multiplyScalar(-1);
    if (w.kind === 'sledge') this.sledges[w.load > 0 ? 1 : 0].push(this.m, this.c);
    else this.logCart.push(this.m, this.c);
    return this.p;
  }

  /** A quarryman at his place in the pit: at the face (or the stack) with his pick, or levering a block he has cut. */
  private quarryman(s: SimState, w: Walker, now: number): THREE.Vector3 | null {
    const q = s.buildings.find((b) => b.id === w.origin);
    if (!q || w.path.length < 2) return null;
    const { y, yaw, bench } = this.levelOf(s, q, true);
    const x = w.path[0];
    const z = w.path[1];
    // Facing the face (the model's -x) on the bench, or for the man at the stack, the stack (its -z) on the floor.
    const atStack = w.food === 3;
    const face = atStack ? yaw + Math.PI / 2 : yaw + Math.PI;
    this.place(x, (atStack ? y : bench) + 0.03, z, face, 0.95);
    this.c.copy(QUARRY_TUNIC).multiplyScalar(-1);
    // (The stack full: he waits, leaning on his pick.)
    if (w.wait > 0) this.lever.push(this.m, this.c);
    else if (held(q, MARBLE) >= storeOf('quarry')) this.pickDown.push(this.m, this.c);
    else (this.raised(now, w.id) ? this.pickUp : this.pickDown).push(this.m, this.c);
    return this.p;
  }

  /** A logger: walking out with his axe, chopping at the tree, trimming it where it fell, carrying the logs home. */
  private logger(s: SimState, w: Walker, lead: number, total: number, along: (d: number) => [number, number, number, number], now: number): THREE.Vector3 | null {
    const steps = w.back ? 3 : w.steps;
    this.c.copy(LOGGER_TUNICS[Math.floor(hash2(w.id, 3, 3430) * LOGGER_TUNICS.length)]);
    if (steps === 1 || steps === 2) {
      const t = this.map.trees[w.food];
      if (!t) return null;
      // At the trunk (chopping), or beside where it lies along its fall (trimming): the fall's way as the plants' (trees.ts).
      const d = hash2(w.food, 7, 32) * Math.PI * 2;
      const fx = Math.cos(d);
      const fz = Math.sin(d);
      let x: number;
      let z: number;
      let yaw: number;
      // (While the tree goes over he stands back from it, his axe down.)
      const fell = steps === 2 ? s.materials.felled.find((f) => f.tree === w.food) : undefined;
      const falling = !!fell && now - fell.at < FALL_SEEN;
      if (steps === 1 || falling) {
        const [ex, ez] = along(total);
        const ux = t.x - ex;
        const uz = t.z - ez;
        const l = Math.hypot(ux, uz) || 1;
        const back = falling ? 0.6 : AT_TRUNK;
        x = t.x - (ux / l) * back;
        z = t.z - (uz / l) * back;
        yaw = Math.atan2(-uz, ux);
        if (falling) {
          this.place(x, this.ground(x, z) + 0.03, z, yaw, 0.95);
          this.c.multiplyScalar(-1);
          this.chop[3].push(this.m, this.c);
          return this.p;
        }
      } else {
        // Beside the fallen trunk, about a third of the way along it, facing it.
        x = t.x + fx * 0.8 - fz * 0.28;
        z = t.z + fz * 0.8 + fx * 0.28;
        yaw = Math.atan2(fx, fz);
      }
      this.place(x, this.ground(x, z) + 0.03, z, yaw, 0.95);
      this.c.multiplyScalar(-1);
      const up = this.raised(now, w.id, steps === 1 ? 6 : 5);
      this.chop[(steps === 1 ? 0 : 2) + (up ? 0 : 1)].push(this.m, this.c);
      return this.p;
    }
    const [x, z, dx, dz] = along(lead);
    const moving = lead < total && w.wait <= 0;
    const phase = ((x + z) * Math.PI * 2) / 0.44;
    const bob = Math.abs(Math.cos(phase)) * 0.012 * (moving ? 1 : 0);
    this.place(x, this.ground(x, z) + 0.03 + bob, z, Math.atan2(-dz, dx), 0.95, Math.sin(phase) * 0.03 * (moving ? 1 : 0));
    if (!moving) this.c.multiplyScalar(-1);
    (steps === 3 && w.load > 0 ? this.carry : this.walk).push(this.m, this.c);
    return this.p;
  }

  /**
   * The copper mines' miners (not walkers of the sim): as many as its staff
   * would keep at work (up to three), a pick at the rock face either side of
   * the adit, one wheeling ore out along the planks to the baskets and back,
   * one at the windlass.
   */
  miners(s: SimState, alpha: number): void {
    const now = s.tick + alpha;
    for (const b of s.buildings) {
      if (b.kind !== 'mine') continue;
      const rate = rateOf(b);
      if (rate <= 0) continue;
      const n = Math.max(1, Math.min(4, Math.round(rate * 4)));
      const { y, yaw } = this.levelOf(s, b, false);
      const cx = b.x + 1;
      const cz = b.z + 1;
      const c = Math.cos(yaw);
      const sn = Math.sin(yaw);
      const at = (lx: number, lz: number): [number, number] => [cx + lx * c + lz * sn, cz - lx * sn + lz * c];
      // In the model's frame: the face at x -0.25, the adit at its middle, the planks out along z = 0, the windlass at (0.18, 0.62), its crank on the far side.
      for (let k = 0; k < n; k++) {
        const seed = b.id * 5 + k;
        if (k === 0 || k === 2) {
          const [x, z] = at(0.08, k === 0 ? -0.52 : 0.36);
          this.place(x, y, z, yaw + Math.PI, 0.92);
          this.c.copy(MINER_TUNIC).multiplyScalar(-1);
          (this.raised(now, seed) ? this.minerUp : this.minerDown).push(this.m, this.c);
        } else if (k === 1) {
          // Out along the planks and back, about a tile in twenty ticks each way, a moment at each end.
          const T = 48;
          const f = ((now + hash2(b.id, 2, 3440) * T) % T) / T;
          const out = f < 0.5;
          const g = out ? f * 2 : (f - 0.5) * 2;
          const p = Math.min(1, Math.max(0, (g - 0.08) / 0.84));
          const lx = out ? -0.05 + 0.5 * p : 0.45 - 0.5 * p;
          const [x, z] = at(lx, -0.02);
          const moving = p > 0 && p < 1;
          this.place(x, y, z, out ? yaw : yaw + Math.PI, 0.92);
          this.c.copy(MINER_TUNIC);
          if (!moving) this.c.multiplyScalar(-1);
          this.barrow[out ? 1 : 0].push(this.m, this.c);
        } else {
          const [x, z] = at(0.18, 0.98);
          this.place(x, y, z, yaw + Math.PI / 2, 0.92);
          this.c.copy(MINER_TUNIC).multiplyScalar(-1);
          this.crank[this.raised(now, seed, 8) ? 0 : 1].push(this.m, this.c);
        }
      }
    }
  }
}
