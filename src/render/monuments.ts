import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { hash2 } from '../map/noise';
import { footSide } from '../sim/buildings';
import { COPPER, held, MARBLE, TIMBER } from '../sim/foods';
import { gamesOn, isMonument, siteOf, STAGES, workOf, type Site } from '../sim/monuments';
import type { Building, SimState } from '../sim/state';
import { berthOf } from '../sim/trade';
import { facingOf } from './homes';
import { colossusModel, COLOSSUS_FIRE, flameGeo, lighthouseModel, LIGHTHOUSE_FIRE, LH, masonsModel, piecesFor, stadiumLift, stadiumModel } from './monumentmodels';
import { puffTexture } from './puff';
import type { PicturePart } from './works';
import { skirt } from './materialworks';
import { PAL } from './palette';
import { TILE_ROAD } from '../sim/state';

/**
 * Slice 35: the masons' yards and the monuments, drawn from the sim's state
 * (a pure read). Each is one mesh of its own, rebuilt only when it moves on
 * a step: a stage begun or finished, an eighth more of its work done, a pile
 * of its materials grown or used. There are only a few in a town (three
 * monuments at most), so this costs little.
 *
 * The fires (the Lighthouse's lantern and the Colossus's torch) flicker
 * every frame, with a soft glow round them that shows from across the bay.
 */

/** How many steps of a stage's work are drawn (the mesh is rebuilt at each). */
const WORK_STEPS = 12;

type Frame = { x: number; y: number; z: number; yaw: number; depth: number };

/** How deep a monument's stone pad goes at most: below it, a skirt of rubble and earth runs down to the ground. */
export const PAD_MOST = 0.3;

interface View {
  sig: string;
  mesh: THREE.Mesh;
  /** The skirt down the slope, and the frame it was made for. */
  skirt: THREE.Mesh | null;
  skirtKey: string;
  frame: Frame;
  fire: THREE.Object3D | null;
  seed: number;
}

export class MonumentsView {
  readonly group = new THREE.Group();
  private readonly mat: THREE.MeshStandardMaterial;
  private readonly flameMat: THREE.MeshBasicMaterial;
  private readonly glowMat: THREE.SpriteMaterial;
  private readonly smokeMat: THREE.SpriteMaterial;
  private readonly flames = new Map<number, THREE.BufferGeometry>();
  private readonly masons: THREE.BufferGeometry;
  private views = new Map<number, View>();
  private frames = new Map<number, Frame>();
  private seenTick = -1;
  private seenRev = -1;
  private seenLooks = -1;
  private last: SimState | null = null;
  /** Meshes rebuilt by the last update (for the measuring script). */
  lastRebuilt = 0;

  constructor(private readonly map: CoastMap) {
    this.group.name = 'monuments';
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.82, metalness: 0, side: THREE.DoubleSide });
    this.flameMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, opacity: 0.95 });
    this.glowMat = new THREE.SpriteMaterial({ map: puffTexture(), color: 0xffa040, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    this.smokeMat = new THREE.SpriteMaterial({ map: puffTexture(), color: 0xd8d2c8, transparent: true, opacity: 0.32, depthWrite: false });
    this.masons = masonsModel();
  }

  private flame(size: number): THREE.BufferGeometry {
    let g = this.flames.get(size);
    if (!g) this.flames.set(size, (g = flameGeo(size)));
    return g;
  }

  /** Where a building of these kinds stands: its middle, its floor (the top of the highest ground under it), its turn and how deep its pad goes. */
  private frameOf(s: SimState, b: Building): Frame {
    const key = b.id;
    let f = this.frames.get(key);
    const yaw = this.yawOf(s, b);
    if (f && f.yaw === yaw) return f;
    const half = footSide(b) / 2;
    const cx = b.x + half;
    const cz = b.z + half;
    const side = footSide(b);
    let lo = Infinity;
    let hi = -Infinity;
    let inner = -Infinity;
    const n = Math.max(5, side * 2 + 1);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const u = i / (n - 1);
        const v = j / (n - 1);
        const h = this.map.heightAt(b.x + 0.05 + (side - 0.1) * u, b.z + 0.05 + (side - 0.1) * v);
        lo = Math.min(lo, h);
        hi = Math.max(hi, h);
        // (The ground under its middle, inside a fifth of the way in from each edge.)
        if (u > 0.15 && u < 0.85 && v > 0.15 && v < 0.85) inner = Math.max(inner, h);
      }
    }
    if (inner === -Infinity) inner = hi;
    // The masons' yard stands half-way (it is small, and its floor is earth). A monument on gentle ground stands on the
    // highest of it; on a slope, on the highest ground under its middle, its uphill edge cut a little into the hill, so
    // the pad and its skirt on the downhill side are no taller than they must be.
    // (The Stadium's ground is never steep, its placing sees to that: its track always on the highest, so no ground shows through it.)
    const y = b.kind === 'masons' ? (lo + hi) / 2 : b.kind === 'stadium' || hi - lo <= 0.5 ? hi : Math.max(inner, lo + (hi - lo) * 0.6);
    f = { x: cx, y: y + 0.01, z: cz, yaw, depth: y - lo };
    this.frames.set(key, f);
    return f;
  }

  /** Which way it faces: the Colossus out to sea, the Stadium along the world's x (its track), the rest to their road. */
  private yawOf(s: SimState, b: Building): number {
    if (b.kind === 'stadium') return 0;
    if (b.kind === 'colossus') {
      const berth = berthOf(this.map, b);
      if (berth) return Math.atan2(-berth.oz, berth.ox);
    }
    return facingOf(s, this.map.size, b);
  }

  /** How far through its stage a site is (0 before its work began), in drawn steps. */
  private static stepOf(x: Site): number {
    if (x.finished || !x.building) return 0;
    const st = STAGES[x.kind][x.stage];
    return st ? Math.min(WORK_STEPS, Math.floor((x.work / workOf(st)) * WORK_STEPS)) : 0;
  }

  private static piles(b: Building): [number, number, number] {
    return [piecesFor(held(b, MARBLE), 25, 27), piecesFor(held(b, TIMBER), 20, 18), piecesFor(held(b, COPPER), 25, 18)];
  }

  private sig(s: SimState, b: Building): string {
    const f = this.frameOf(s, b);
    if (b.kind === 'masons') return `masons:${f.yaw.toFixed(2)}`;
    const x = siteOf(s, b.id);
    const stage = x ? (x.finished ? 3 : x.stage) : 0;
    const step = x ? MonumentsView.stepOf(x) : 0;
    const games = b.kind === 'stadium' && gamesOn(s) ? 1 : 0;
    return `${b.kind}:${f.yaw.toFixed(2)}:${stage}:${step}:${MonumentsView.piles(b).join(',')}:${games}`;
  }

  private build(s: SimState, b: Building, seed: number): THREE.BufferGeometry {
    if (b.kind === 'masons') return this.masons;
    const f = this.frameOf(s, b);
    const x = siteOf(s, b.id);
    const stage = x ? (x.finished ? 3 : x.stage) : 0;
    const t = x ? MonumentsView.stepOf(x) / WORK_STEPS : 0;
    const piles = MonumentsView.piles(b);
    const depth = Math.min(f.depth, PAD_MOST);
    if (b.kind === 'lighthouse') return lighthouseModel(stage, t, depth, piles, seed);
    if (b.kind === 'colossus') return colossusModel(stage, t, depth, piles, seed);
    return stadiumModel(stage, t, depth, piles, b.kind === 'stadium' && gamesOn(s), seed);
  }

  /** Bring the drawing up to date (only looks again when the sim moved on), and flicker the fires. */
  update(s: SimState, time: number): void {
    this.lastRebuilt = 0;
    if (s !== this.last || s.tick !== this.seenTick || s.rev !== this.seenRev || s.looks !== this.seenLooks) {
      if (s.rev !== this.seenRev || s !== this.last) this.frames.clear();
      this.last = s;
      this.seenTick = s.tick;
      this.seenRev = s.rev;
      this.seenLooks = s.looks;
      this.sync(s);
    }
    for (const v of this.views.values()) {
      if (!v.fire) continue;
      const k = 1 + Math.sin(time * 9.1 + v.seed) * 0.12 + Math.sin(time * 15.3 + v.seed * 2) * 0.07;
      const flame = v.fire.children[0];
      flame.scale.set(1 + (k - 1) * 0.5, k, 1 + (k - 1) * 0.5);
      flame.rotation.y = time * 0.7;
      const glow = v.fire.children[1] as THREE.Sprite | undefined;
      if (glow) {
        const g = (glow.userData.size as number) * (0.92 + 0.08 * k);
        glow.scale.set(g, g, 1);
      }
      // The smoke: puffs rising from the fire, swelling and drifting off with the breeze, fading as they go.
      const puffs = v.fire.children.length - 2;
      const big = v.fire.userData.big as boolean;
      // (The breeze, turned into the monument's own frame.)
      const wx = Math.cos(s.wind.angle);
      const wz = Math.sin(s.wind.angle);
      const c = Math.cos(v.frame.yaw);
      const sn = Math.sin(v.frame.yaw);
      const lx = wx * c - wz * sn;
      const lz = wx * sn + wz * c;
      for (let i = 0; i < puffs; i++) {
        const p = v.fire.children[2 + i] as THREE.Sprite;
        const f = (time / (big ? 5 : 4) + i / puffs + v.seed) % 1;
        const r = (big ? 0.25 + 1.1 * f : 0.1 + 0.4 * f) * Math.min(1, (1 - f) * 3);
        const drift = f * f * (big ? 1.4 : 0.5);
        p.position.set(lx * drift, (big ? 0.35 : 0.15) + f * (big ? 2.6 : 1), lz * drift);
        p.scale.set(r, r, 1);
      }
    }
  }

  private sync(s: SimState): void {
    const seen = new Set<number>();
    for (const b of s.buildings) {
      if (b.kind !== 'masons' && !isMonument(b.kind)) continue;
      seen.add(b.id);
      const sig = this.sig(s, b);
      const was = this.views.get(b.id);
      if (was && was.sig === sig) continue;
      const seed = 3600 + (b.id % 97) * 7;
      const geo = this.build(s, b, seed);
      const f = this.frameOf(s, b);
      let v = was;
      if (!v) {
        const mesh = new THREE.Mesh(geo, this.mat);
        mesh.name = `monument-${b.kind}`;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.group.add(mesh);
        v = { sig, mesh, skirt: null, skirtKey: '', frame: f, fire: null, seed: hash2(b.id, 4, 3601) * 10 };
        this.views.set(b.id, v);
      } else {
        if (v.mesh.geometry !== this.masons) v.mesh.geometry.dispose();
        v.mesh.geometry = geo;
        v.sig = sig;
      }
      v.frame = f;
      v.mesh.position.set(f.x, f.y, f.z);
      v.mesh.rotation.set(0, f.yaw, 0);
      if (b.kind !== 'masons') this.skirtFor(s, b, v);
      this.lastRebuilt++;
      // The fire, once the Lighthouse or the Colossus is finished.
      const x = siteOf(s, b.id);
      const lit = !!x?.finished && (b.kind === 'lighthouse' || b.kind === 'colossus');
      if (lit && !v.fire) {
        const big = b.kind === 'lighthouse';
        const fire = new THREE.Group();
        const flame = new THREE.Mesh(this.flame(big ? 1.9 : 0.8), this.flameMat);
        flame.name = 'monument-fire';
        fire.add(flame);
        const glow = new THREE.Sprite(this.glowMat);
        glow.userData.size = big ? 2.6 : 0.8;
        glow.position.y = big ? 0.25 : 0.1;
        fire.add(glow);
        fire.userData.big = big;
        for (let i = 0; i < (big ? 6 : 3); i++) fire.add(new THREE.Sprite(this.smokeMat));
        const at = big ? LIGHTHOUSE_FIRE : COLOSSUS_FIRE;
        fire.position.set(at[0], at[1], at[2]);
        v.mesh.add(fire);
        v.fire = fire;
      } else if (!lit && v.fire) {
        v.mesh.remove(v.fire);
        v.fire = null;
      }
    }
    for (const [id, v] of this.views) {
      if (seen.has(id)) continue;
      this.group.remove(v.mesh);
      if (v.mesh.geometry !== this.masons) v.mesh.geometry.dispose();
      v.skirt?.geometry.dispose();
      this.views.delete(id);
      this.frames.delete(id);
    }
  }

  /** Which sides of a building (its own frame: 0 -z, 1 +x, 2 +z, 3 -x) have a road beside them, as bits. */
  private roadSides(s: SimState, b: Building, yaw: number): number {
    const half = footSide(b) / 2;
    const cx = b.x + half;
    const cz = b.z + half;
    const c = Math.round(Math.cos(yaw));
    const sn = Math.round(Math.sin(yaw));
    const n = this.map.size;
    let mask = 0;
    const sides: Array<[number, number]> = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    sides.forEach(([nx, nz], k) => {
      for (let u = -half + 0.5; u < half; u += 1) {
        const lx = nx * (half + 0.5) - nz * u;
        const lz = nz * (half + 0.5) + nx * u;
        const tx = Math.floor(cx + lx * c + lz * sn);
        const tz = Math.floor(cz - lx * sn + lz * c);
        if (tx >= 0 && tz >= 0 && tx < n && tz < n && s.tiles[tz * n + tx] === TILE_ROAD) mask |= 1 << k;
      }
    });
    return mask;
  }

  /**
   * A monument's skirt: from the foot of its stone pad (PAD_MOST down at
   * most) out and down to the ground, rubble and earth fitted to the slope
   * (as the quarry's, slice 32), kept steep along a side with a road. Made
   * again only when it moves or turns, or a road comes or goes beside it.
   */
  private skirtFor(s: SimState, b: Building, v: View): void {
    const f = v.frame;
    const mask = this.roadSides(s, b, f.yaw);
    const key = `${f.x}:${f.z}:${f.y.toFixed(3)}:${f.yaw.toFixed(3)}:${mask}`;
    if (key === v.skirtKey) return;
    v.skirtKey = key;
    if (v.skirt) {
      v.mesh.remove(v.skirt);
      v.skirt.geometry.dispose();
      v.skirt = null;
    }
    if (f.depth <= PAD_MOST) return;
    const c = Math.cos(f.yaw);
    const sn = Math.sin(f.yaw);
    const ground = (lx: number, lz: number): number => this.map.heightAt(f.x + lx * c + lz * sn, f.z - lx * sn + lz * c) - f.y;
    const top = -(PAD_MOST + 0.06);
    // (The pad's lowest course steps out about this far.)
    const half = footSide(b) / 2 - 0.02 + 0.03 + Math.ceil((PAD_MOST + 0.06) / 0.15) * 0.06 - 0.06;
    const geo = skirt(ground, half, (k) => (mask & (1 << k)) !== 0, [PAL.rockWarm, PAL.dryGrass], [PAL.rockGrey, PAL.rockWarm, PAL.rockDark], 3610 + (b.id % 53), () => top);
    const mesh = new THREE.Mesh(geo, this.mat);
    mesh.name = 'monument-skirt';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    v.mesh.add(mesh);
    v.skirt = mesh;
  }

  /**
   * How high someone stands at a world point on a monument or a yard (its
   * builders round the scaffold, the games' visitors in their seats), or
   * null if the point isn't on one this view has drawn.
   */
  standAt(s: SimState, b: Building, wx: number, wz: number): number | null {
    const v = this.views.get(b.id);
    if (!v) return null;
    const f = v.frame;
    const dx = wx - f.x;
    const dz = wz - f.z;
    const c = Math.cos(f.yaw);
    const sn = Math.sin(f.yaw);
    const lx = dx * c - dz * sn;
    const lz = dx * sn + dz * c;
    const half = footSide(b) / 2;
    if (Math.abs(lx) > half || Math.abs(lz) > half) return null;
    if (b.kind === 'masons') return null;
    const x = siteOf(s, b.id);
    const stage = x ? (x.finished ? 3 : x.stage) : 0;
    const m = Math.max(Math.abs(lx), Math.abs(lz));
    if (b.kind === 'stadium') return f.y + (stage >= 2 ? stadiumLift(Math.abs(lz)) : 0);
    if (b.kind === 'lighthouse') {
      // On the steps laid so far.
      const steps = stage >= 1 ? 3 : Math.floor(Math.round(((x ? MonumentsView.stepOf(x) : 0) / WORK_STEPS) * 9) / 3);
      const reach = [1.42, 1.3, 1.18];
      let k = 0;
      while (k < steps && m <= reach[k]) k++;
      return f.y + k * (LH.base / 3);
    }
    // The Colossus: on its steps (the plinth's two).
    const t = x ? MonumentsView.stepOf(x) / WORK_STEPS : 0;
    const steps = stage >= 1 ? 2 : t >= 0.15 ? 2 : t > 0 ? 1 : 0;
    const reach = [1.32, 1.12];
    let k = 0;
    while (k < steps && m <= reach[k]) k++;
    return f.y + k * 0.12;
  }
}

/**
 * The build panel's pictures (pictures.ts): the masons' yard, and each
 * monument as it stands finished (the tall ones drawn smaller, so the whole
 * of each fits its square). Null for any other tool.
 */
export function monumentPicture(tool: string): PicturePart[] | null {
  const at = (geo: THREE.BufferGeometry, k = 1): PicturePart[] => [{ geo, x: 0, z: 0, yaw: 0, s: [k, k, k] }];
  if (tool === 'masons') return at(masonsModel());
  if (tool === 'lighthouse') return at(lighthouseModel(3, 0, 0, [0, 0, 0], 3601), 0.5);
  if (tool === 'colossus') return at(colossusModel(3, 0, 0, [0, 0, 0], 3601), 0.55);
  if (tool === 'stadium') return at(stadiumModel(3, 0, 0, [0, 0, 0], false, 3601));
  return null;
}
