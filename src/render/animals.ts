import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { hash2 } from '../map/noise';
import { Ground, mapIndex } from '../sim/build';
import { rateOf } from '../sim/labour';
import { TILE_EMPTY, type Herd, type SimState } from '../sim/state';
import { AMBLE, BOLT, BOLT_TIME, moving } from '../sim/wild';
import type { FolkLooks, Look } from './looks';
import { facingOf } from './homes';
import { col, PAL } from './palette';
import { lumpy } from './trees';
import { leg, mergeTinted, type TPart } from './walkers';
// Slice 36: horses.
import { HORSE_COATS, horseModel, PADDOCK, STABLE_YARD } from './estates';
import { gi, HORSES } from '../sim/foods';
import { HORSEFARM_STORE } from '../sim/stores';

/**
 * The wild herds, the dairies' goats and the pastures' sheep, redrawn every frame from the sim
 * (a herd is one point in the state; its animals are laid out round it here,
 * each its own way, never off firm open ground). Built on the walkers'
 * instanced, leg-swinging material: the coat is the tinted part.
 */

/** A deer, about 0.36 long, facing +x: a slim body on long legs, a raised neck; `stag` adds antlers. */
function deer(stag: boolean): THREE.BufferGeometry {
  const parts: TPart[] = [
    { geo: lumpy(new THREE.IcosahedronGeometry(0.1, 1), 0.06, 601).scale(1.55, 0.68, 0.55).translate(0, 0.25, 0), color: '', tint: true },
    { geo: new THREE.IcosahedronGeometry(0.08, 1).scale(1.5, 0.45, 0.5).translate(0.0, 0.215, 0), color: PAL.deerBelly },
    // The neck and head, up and forward.
    { geo: new THREE.CylinderGeometry(0.026, 0.04, 0.16, 6).rotateZ(-0.55).translate(0.16, 0.33, 0), color: '', tint: true },
    { geo: lumpy(new THREE.IcosahedronGeometry(0.045, 1), 0.08, 602).scale(1.5, 0.95, 0.85).rotateZ(-0.35).translate(0.24, 0.4, 0), color: '', tint: true },
    { geo: new THREE.IcosahedronGeometry(0.014, 0).translate(0.305, 0.375, 0), color: PAL.goatDark },
    // Ears, a white scut.
    { geo: new THREE.ConeGeometry(0.018, 0.05, 3).rotateX(0.9).translate(0.21, 0.44, 0.03), color: '', tint: true },
    { geo: new THREE.ConeGeometry(0.018, 0.05, 3).rotateX(-0.9).translate(0.21, 0.44, -0.03), color: '', tint: true },
    { geo: new THREE.IcosahedronGeometry(0.025, 0).translate(-0.16, 0.27, 0), color: PAL.deerBelly },
  ];
  // A bounding, diagonal gait.
  for (const [x, z, w] of [[-0.11, -0.035, 0.7], [-0.11, 0.035, -0.7], [0.11, -0.035, -0.7], [0.11, 0.035, 0.7]]) parts.push(leg(x, z, 0.2, 0.012, PAL.deer, w));
  if (stag) {
    for (const s of [-1, 1]) {
      parts.push({ geo: new THREE.CylinderGeometry(0.006, 0.009, 0.14, 3).rotateX(s * 0.5).rotateZ(-0.3).translate(0.21, 0.5, s * 0.04), color: PAL.antler });
      parts.push({ geo: new THREE.CylinderGeometry(0.005, 0.007, 0.07, 3).rotateX(s * 1.1).translate(0.23, 0.52, s * 0.07), color: PAL.antler });
      parts.push({ geo: new THREE.CylinderGeometry(0.005, 0.007, 0.06, 3).rotateZ(0.6).translate(0.19, 0.55, s * 0.06), color: PAL.antler });
    }
  }
  return mergeTinted(parts);
}

/** A wild boar, about 0.32 long: a heavy dark body, high shoulders, a bristly ridge, a long snout and pale tusks, short legs. */
function boar(): THREE.BufferGeometry {
  const parts: TPart[] = [
    { geo: lumpy(new THREE.IcosahedronGeometry(0.1, 1), 0.08, 611).scale(1.4, 0.75, 0.7).translate(-0.01, 0.165, 0), color: '', tint: true },
    { geo: lumpy(new THREE.IcosahedronGeometry(0.085, 1), 0.1, 612).scale(1, 1, 0.85).translate(0.08, 0.19, 0), color: '', tint: true },
    { geo: new THREE.BoxGeometry(0.22, 0.03, 0.03).translate(0.02, 0.245, 0), color: PAL.boarBristle },
    // The head, low and long, the snout.
    { geo: lumpy(new THREE.BoxGeometry(0.12, 0.08, 0.08), 0.1, 613).rotateZ(-0.35).translate(0.2, 0.15, 0), color: '', tint: true },
    { geo: new THREE.CylinderGeometry(0.022, 0.026, 0.03, 6).rotateZ(Math.PI / 2).translate(0.27, 0.115, 0), color: PAL.goatDark },
    { geo: new THREE.ConeGeometry(0.007, 0.04, 3).rotateZ(-0.5).translate(0.25, 0.13, 0.03), color: PAL.tusk },
    { geo: new THREE.ConeGeometry(0.007, 0.04, 3).rotateZ(-0.5).translate(0.25, 0.13, -0.03), color: PAL.tusk },
    { geo: new THREE.ConeGeometry(0.02, 0.04, 3).translate(0.17, 0.215, 0.035), color: PAL.boarBristle },
    { geo: new THREE.ConeGeometry(0.02, 0.04, 3).translate(0.17, 0.215, -0.035), color: PAL.boarBristle },
  ];
  for (const [x, z, w] of [[-0.09, -0.04, 0.6], [-0.09, 0.04, -0.6], [0.09, -0.04, -0.6], [0.09, 0.04, 0.6]]) parts.push(leg(x, z, 0.1, 0.017, PAL.boarBristle, w));
  return mergeTinted(parts);
}

/** A goat, about 0.24 long: a compact body, swept-back horns and a little beard. */
function goat(): THREE.BufferGeometry {
  const parts: TPart[] = [
    { geo: lumpy(new THREE.IcosahedronGeometry(0.08, 1), 0.08, 621).scale(1.35, 0.72, 0.62).translate(0, 0.16, 0), color: '', tint: true },
    { geo: new THREE.CylinderGeometry(0.022, 0.032, 0.09, 6).rotateZ(-0.5).translate(0.1, 0.22, 0), color: '', tint: true },
    { geo: lumpy(new THREE.IcosahedronGeometry(0.035, 1), 0.08, 622).scale(1.5, 0.9, 0.85).rotateZ(-0.4).translate(0.15, 0.26, 0), color: '', tint: true },
    { geo: new THREE.ConeGeometry(0.01, 0.04, 3).rotateX(Math.PI).translate(0.18, 0.215, 0), color: PAL.goatDark },
    { geo: new THREE.ConeGeometry(0.011, 0.07, 3).rotateZ(1.1).translate(0.11, 0.3, 0.018), color: PAL.antler },
    { geo: new THREE.ConeGeometry(0.011, 0.07, 3).rotateZ(1.1).translate(0.11, 0.3, -0.018), color: PAL.antler },
    { geo: new THREE.ConeGeometry(0.015, 0.05, 3).rotateZ(2.3).translate(-0.12, 0.2, 0), color: '', tint: true },
  ];
  for (const [x, z, w] of [[-0.07, -0.03, 0.6], [-0.07, 0.03, -0.6], [0.07, -0.03, -0.6], [0.07, 0.03, 0.6]]) parts.push(leg(x, z, 0.11, 0.011, PAL.goatDark, w));
  return mergeTinted(parts);
}

/** A sheep, about 0.26 long: a round woolly body (the tinted part), a dark face and dark legs. */
function sheep(): THREE.BufferGeometry {
  const parts: TPart[] = [
    { geo: lumpy(new THREE.IcosahedronGeometry(0.09, 1), 0.14, 631).scale(1.35, 0.85, 0.85).translate(0, 0.17, 0), color: '', tint: true },
    { geo: lumpy(new THREE.IcosahedronGeometry(0.05, 0), 0.15, 632).scale(1, 0.8, 1).translate(0.08, 0.22, 0), color: '', tint: true },
    // The face and ears.
    { geo: new THREE.IcosahedronGeometry(0.036, 1).scale(1.45, 0.9, 0.8).rotateZ(-0.45).translate(0.15, 0.21, 0), color: PAL.sheepFace },
    { geo: new THREE.ConeGeometry(0.012, 0.045, 3).rotateX(1.3).translate(0.13, 0.235, 0.035), color: PAL.sheepFace },
    { geo: new THREE.ConeGeometry(0.012, 0.045, 3).rotateX(-1.3).translate(0.13, 0.235, -0.035), color: PAL.sheepFace },
  ];
  for (const [x, z, w] of [[-0.07, -0.035, 0.6], [-0.07, 0.035, -0.6], [0.07, -0.035, -0.6], [0.07, 0.035, 0.6]]) parts.push(leg(x, z, 0.1, 0.011, PAL.sheepFace, w));
  return mergeTinted(parts);
}

const DEER_COATS = [PAL.deer, '#a06a3e', '#bb8652'];
const BOAR_COATS = [PAL.boar, '#5a4638', '#46362e'];
const GOAT_COATS = [PAL.goat, PAL.goat, '#d8c8b0', '#8a6a4e', '#f4f0e6', '#5a4a40'];
/** Goats at each dairy. */
const GOATS = 6;
const SHEEP_COATS = [PAL.wool, PAL.wool, PAL.wool, '#f6f0e0', '#ddd0b0', '#4a4038'];
/** Sheep at each pasture, and how far round it they graze (tiles from its middle). */
const SHEEP = 9;
const GRAZE = 2.8;

/** Slice 36: a horse farm's mares (always in its paddock) and the most there at once; the most in an estate's stable yard. */
const HORSE_MARES = 3;
const PADDOCK_MOST = 7;
const STABLE_MOST = 4;

const firm = (g: number): boolean => g === Ground.Ok || g === Ground.SteepForHome;

export class Animals {
  readonly group = new THREE.Group();
  private readonly stags: Look;
  private readonly hinds: Look;
  private readonly boars: Look;
  private readonly goats: Look;
  private readonly sheep: Look;
  private readonly horses: Look;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly c = new THREE.Color();
  private readonly e = new THREE.Euler();
  private readonly ground: Uint8Array;
  /** Animals drawn last frame (for the measuring script). */
  count = 0;

  constructor(
    private readonly map: CoastMap,
    folk: FolkLooks,
  ) {
    this.group.name = 'animals';
    // A few dozen animals in all, spread over the hills: drawn with the people on foot in the folk's merged mesh (see looks.ts): their looks are no bigger than a vendor's, so they cost no padding there.
    this.stags = folk.people.look(deer(true));
    this.hinds = folk.people.look(deer(false));
    this.boars = folk.people.look(boar());
    this.goats = folk.people.look(goat());
    this.sheep = folk.people.look(sheep());
    this.horses = folk.people.look(horseModel());
    this.ground = mapIndex(map).ground;
  }

  /** Can an animal stand at (x, z): firm, open ground with nothing built on it. */
  private open(s: SimState, x: number, z: number): boolean {
    const n = this.map.size;
    const tx = Math.floor(x);
    const tz = Math.floor(z);
    if (tx < 0 || tz < 0 || tx >= n || tz >= n) return false;
    const t = tz * n + tx;
    return firm(this.ground[t]) && s.tiles[t] === TILE_EMPTY;
  }

  private place(x: number, z: number, yaw: number, pitch: number, sc: number, walking: boolean, coat: string, into: Look): void {
    this.e.set(0, yaw, pitch, 'YXZ');
    this.q.setFromEuler(this.e);
    this.p.set(x, this.map.heightAt(x, z) + 0.01, z);
    this.s.set(sc, sc, sc);
    this.m.compose(this.p, this.q, this.s);
    this.c.copy(col(coat));
    if (!walking) this.c.multiplyScalar(-1);
    into.push(this.m, this.c);
    this.count++;
  }

  update(s: SimState, alpha: number, time: number): void {
    this.count = 0;
    for (let i = 0; i < s.herds.length; i++) this.herd(s, s.herds[i], i, alpha, time);
    for (const d of s.buildings) if (d.kind === 'dairy') this.dairy(s, d, time);
    for (const p of s.buildings) if (p.kind === 'pasture') this.flock(s, p, time);
    // Slice 36: the horse farms' horses in their paddocks, the estates' in their stable yards.
    for (const b of s.buildings) {
      if (b.kind === 'horsefarm') this.paddock(s, b, time);
      else if (b.kind === 'home' && b.estate && b.level >= 7) this.stableYard(s, b, time);
    }
  }

  /** Slice 36: a horse farm's horses grazing its paddock, each on its own slow loop (more as its stable fills: its mares are always there); still if nobody works it. */
  private paddock(s: SimState, b: SimState['buildings'][number], time: number): void {
    const yaw = facingOf(s, this.map.size, b);
    const c = Math.cos(yaw);
    const sn = Math.sin(yaw);
    const fx = b.x + 1.5;
    const fz = b.z + 1.5;
    const tended = rateOf(b) > 0;
    const n = HORSE_MARES + Math.ceil((Math.min(HORSEFARM_STORE, b.goods[gi(HORSES)] ?? 0) / HORSEFARM_STORE) * (PADDOCK_MOST - HORSE_MARES));
    const [x0, z0, x1, z1] = PADDOCK;
    for (let k = 0; k < n; k++) {
      const seed = b.id * 19 + k;
      const t = time * (tended ? 0.04 : 0.012) + hash2(seed, 1, 3641) * 40;
      const u = 0.5 + 0.42 * Math.sin(t * 0.7 + k * 2.3);
      const v = 0.5 + 0.42 * Math.sin(t * 0.5 + k * 1.1 + 1);
      const lx = x0 + 0.1 + (x1 - x0 - 0.2) * u;
      const lz = z0 + 0.1 + (z1 - z0 - 0.2) * v;
      const vx = Math.cos(t * 0.7 + k * 2.3) * 0.7 * (x1 - x0);
      const vz = Math.cos(t * 0.5 + k * 1.1 + 1) * 0.5 * (z1 - z0);
      const heading = yaw + Math.atan2(-vz, vx);
      const grazing = Math.sin(time * 0.6 + seed * 1.3) > -0.2;
      this.place(fx + lx * c + lz * sn, fz - lx * sn + lz * c, heading, grazing ? -0.12 : 0, 0.95 + 0.1 * hash2(seed, 2, 3642), !grazing && tended, HORSE_COATS[Math.floor(hash2(seed, 3, 3643) * HORSE_COATS.length)], this.horses);
    }
  }

  /** Slice 36: an estate's horses in its stable yard (those in its stable, and the one in use), standing or idling. */
  private stableYard(s: SimState, b: SimState['buildings'][number], time: number): void {
    const n = Math.min(STABLE_MOST, (b.goods[gi(HORSES)] ?? 0) + ((b.goodsUntil[gi(HORSES)] ?? 0) > s.tick ? 1 : 0));
    if (n <= 0) return;
    const yaw = facingOf(s, this.map.size, b);
    const c = Math.cos(yaw);
    const sn = Math.sin(yaw);
    // (The model is mirrored for some estates, as the homes are: its stable yard with it.)
    const flip = hash2(b.id, 2, 40) < 0.5 ? -1 : 1;
    const fx = b.x + 2;
    const fz = b.z + 2;
    const [x0, z0, x1, z1] = STABLE_YARD;
    for (let k = 0; k < n; k++) {
      const seed = b.id * 23 + k;
      const t = time * 0.03 + hash2(seed, 1, 3651) * 30;
      const lx = x0 + 0.15 + ((x1 - x0 - 0.3) * (k + 0.5)) / STABLE_MOST + Math.sin(t) * 0.06;
      const lz = (z0 + (z1 - z0) * (0.35 + 0.3 * hash2(seed, 2, 3652)) + Math.cos(t * 0.8) * 0.05) * flip;
      const heading = yaw + (hash2(seed, 3, 3653) < 0.5 ? Math.PI / 2 : -Math.PI / 2) + Math.sin(t * 0.5) * 0.4;
      const grazing = Math.sin(time * 0.5 + seed) > 0.3;
      this.place(fx + lx * c + lz * sn, fz - lx * sn + lz * c, heading, grazing ? -0.1 : 0, 0.95, false, HORSE_COATS[Math.floor(hash2(seed, 4, 3654) * HORSE_COATS.length)], this.horses);
    }
  }

  /**
   * A pasture's flock: grazing the open grass round the fold, each sheep on
   * its own slow loop, heads down now and then; a few always in or by the
   * fold. Never on a road or a building (in to the fold if the grass round
   * it is all built over); still if nobody works the pasture.
   */
  private flock(s: SimState, p: SimState['buildings'][number], time: number): void {
    const yaw = facingOf(s, this.map.size, p);
    const c = Math.cos(yaw);
    const sn = Math.sin(yaw);
    const fx = p.x + 1.5;
    const fz = p.z + 1.5;
    const tended = rateOf(p) > 0;
    const world = (lx: number, lz: number): [number, number] => [fx + lx * c + lz * sn, fz - lx * sn + lz * c];
    for (let k = 0; k < SHEEP; k++) {
      const seed = p.id * 17 + k;
      const t = time * (tended ? 0.03 : 0.01) + hash2(seed, 1, 661) * 40;
      // Where it grazes: the first three in and by the fold, the rest out round the pasture on the open grass.
      const home = k < 3;
      const a = hash2(seed, 2, 662) * Math.PI * 2 + Math.sin(t * 0.6) * 0.5;
      const r = home ? 0.25 + 0.3 * hash2(seed, 4, 664) : 1.9 + (GRAZE - 1.9) * hash2(seed, 3, 663);
      let lx = (home ? -0.5 : 0) + Math.cos(a) * r + Math.sin(t * 1.3) * 0.12;
      let lz = Math.sin(a) * r + Math.cos(t) * 0.12;
      let [x, z] = world(lx, lz);
      if (!home && !this.open(s, x, z)) {
        // Built over: back in the fold.
        lx = -0.5 + Math.cos(a) * 0.5;
        lz = Math.sin(a) * 0.5;
        [x, z] = world(lx, lz);
      }
      const heading = yaw + a + Math.PI / 2 + Math.sin(t * 2) * 0.8;
      const grazing = Math.sin(time * 0.8 + seed * 1.7) > -0.3;
      this.place(x, z, heading, grazing ? -0.16 : 0, 0.9 + 0.12 * hash2(seed, 5, 665), !grazing && tended, SHEEP_COATS[Math.floor(hash2(seed, 6, 666) * SHEEP_COATS.length)], this.sheep);
    }
  }

  /** A herd's animals round its point: loosely bunched while grazing, strung out behind the leader on the move, scattered while bolting. */
  private herd(s: SimState, h: Herd, i: number, alpha: number, time: number): void {
    const going = moving(h);
    const bolting = s.tick - h.fled < BOLT_TIME && going;
    const dx = h.tx - h.x;
    const dz = h.tz - h.z;
    const d = Math.hypot(dx, dz);
    // Between ticks: on along the way (no further than the target).
    const step = going ? Math.min(d, (bolting ? BOLT : AMBLE) * alpha) : 0;
    const ux = d > 0 ? dx / d : 1;
    const uz = d > 0 ? dz / d : 0;
    const cx = h.x + ux * step;
    const cz = h.z + uz * step;
    const heading = Math.atan2(-uz, ux);
    for (let k = 0; k < h.head; k++) {
      const seed = i * 31 + k;
      // A loose bunch: golden-angle spiral, a little jittered, a little wider when bolting.
      // (Boar are stocky: a little more room each, or their bunch runs together into one dark heap.)
      const r = (0.26 + 0.3 * Math.sqrt(k)) * (bolting ? 1.3 : 1) * (h.kind === 'boar' ? 1.3 : 1);
      const a = k * 2.39996 + hash2(seed, 1, 641) * 0.8;
      let ox = Math.cos(a) * r;
      let oz = Math.sin(a) * r;
      let yaw: number;
      let pitch = 0;
      if (going) {
        // On the move: trailing behind along the way, all facing it.
        const back = r;
        const side = Math.sin(a) * r * 0.9;
        ox = -ux * back - uz * side;
        oz = -uz * back + ux * side;
        yaw = heading + (hash2(seed, 2, 642) - 0.5) * 0.3;
      } else {
        // Grazing: each its own way, drifting round slowly, heads down now and then.
        const t = time * 0.12 + hash2(seed, 3, 643) * 20;
        ox += Math.sin(t) * 0.06;
        oz += Math.cos(t * 0.8) * 0.06;
        yaw = hash2(seed, 4, 644) * Math.PI * 2 + Math.sin(t * 0.5) * 0.6;
        pitch = Math.sin(time * 0.7 + seed) > 0.2 ? -0.12 : 0;
      }
      let x = cx + ox;
      let z = cz + oz;
      // Never off firm open ground: in towards the herd's point until it is.
      for (let f = 0.6; f >= 0 && !this.open(s, x, z); f -= 0.3) {
        x = cx + ox * f;
        z = cz + oz * f;
      }
      if (h.kind === 'deer') {
        const stag = k % 4 === 0;
        this.place(x, z, yaw, pitch, 0.95 + 0.1 * hash2(seed, 5, 645), going, DEER_COATS[Math.floor(hash2(seed, 6, 646) * DEER_COATS.length)], stag ? this.stags : this.hinds);
      } else {
        this.place(x, z, yaw, pitch * 0.6, 0.95 + 0.12 * hash2(seed, 5, 645), going, BOAR_COATS[Math.floor(hash2(seed, 6, 646) * BOAR_COATS.length)], this.boars);
      }
    }
  }

  /** A dairy's goats wandering their pen (the back of the yard, -x in its frame), grazing; still if nobody works the dairy. */
  private dairy(s: SimState, d: SimState['buildings'][number], time: number): void {
    const yaw = facingOf(s, this.map.size, d);
    const c = Math.cos(yaw);
    const sn = Math.sin(yaw);
    const fx = d.x + 1.5;
    const fz = d.z + 1.5;
    const tended = rateOf(d) > 0;
    for (let k = 0; k < GOATS; k++) {
      const seed = d.id * 13 + k;
      // A slow loop round the pen, each goat on its own.
      const t = time * (tended ? 0.05 : 0.015) + hash2(seed, 1, 651) * 30;
      const lx = -0.65 + Math.sin(t * 1.1 + k) * 0.55;
      const lz = Math.sin(t * 0.7 + k * 2.1) * 1.05;
      const vx = Math.cos(t * 1.1 + k) * 0.6;
      const vz = Math.cos(t * 0.7 + k * 2.1) * 0.74;
      const x = fx + lx * c + lz * sn;
      const z = fz - lx * sn + lz * c;
      const heading = yaw + Math.atan2(-vz, vx);
      const grazing = Math.sin(time * 0.9 + seed) > 0;
      this.place(x, z, heading, grazing ? -0.14 : 0, 0.8 + 0.1 * hash2(seed, 2, 652), !grazing && tended, GOAT_COATS[Math.floor(hash2(seed, 3, 653) * GOAT_COATS.length)], this.goats);
    }
  }
}
