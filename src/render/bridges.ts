import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { hash2 } from '../map/noise';
import { bridgeAt, bridgeRunsEastWest, isBridge } from '../sim/build';
import type { SimState } from '../sim/state';
import { PAL } from './palette';
import { merge, type Part } from './trees';

/** How far the deck sits above the ground where it meets the bank (the paving's own lift). */
const LIFT = 0.04;
/** The least room between the deck and the river's surface. */
const CLEAR = 0.32;
/** Height samples per tile along a bridge, for walkers crossing it. */
const SAMPLES = 8;

interface Span {
  tiles: number[];
  eastWest: boolean;
  /** Where the deck starts (world x or z, along the bridge) and its length. */
  start: number;
  len: number;
  /** The other coordinate: the middle of the bridge's tiles across it. */
  across: number;
  /** Deck heights from start to start + len, SAMPLES a tile. */
  profile: Float32Array;
}

/**
 * Timber road bridges over the river: a plank deck that rises in a low arch
 * between the banks, side beams and a rail on posts, and piles standing in
 * the water. Rebuilt whenever the bridges change. Walkers crossing ask
 * heightAt for the deck under them.
 */
export class Bridges {
  readonly group = new THREE.Group();
  private mesh: THREE.Mesh | null = null;
  private readonly material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0 });
  private spans: Span[] = [];
  private byTile = new Map<number, Span>();
  private key = '';

  constructor(private readonly map: CoastMap) {
    this.group.name = 'bridges';
  }

  /** The deck's height at a world point, or null if no bridge is there. */
  heightAt(x: number, z: number): number | null {
    if (this.byTile.size === 0) return null;
    const n = this.map.size;
    const tx = Math.floor(x);
    const tz = Math.floor(z);
    if (tx < 0 || tz < 0 || tx >= n || tz >= n) return null;
    const sp = this.byTile.get(tz * n + tx);
    if (!sp) return null;
    const d = ((sp.eastWest ? x : z) - sp.start) * SAMPLES;
    const i = Math.max(0, Math.min(sp.profile.length - 2, Math.floor(d)));
    const f = Math.max(0, Math.min(1, d - i));
    return sp.profile[i] + (sp.profile[i + 1] - sp.profile[i]) * f;
  }

  /** Bring the bridges up to date with the state's roads. */
  sync(s: SimState): void {
    const map = this.map;
    const tiles: number[] = [];
    for (let t = 0; t < s.tiles.length; t++) if (isBridge(map, s, t)) tiles.push(t);
    const key = tiles.join(',');
    if (key === this.key) return;
    this.key = key;
    this.spans = [];
    this.byTile.clear();
    const done = new Set<number>();
    for (const t of tiles) {
      if (done.has(t)) continue;
      const run = bridgeAt(map, s, t);
      for (const u of run) done.add(u);
      this.spans.push(this.span(s, run));
    }
    for (const sp of this.spans) for (const t of sp.tiles) this.byTile.set(t, sp);
    if (this.mesh) {
      this.group.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh = null;
    }
    if (this.spans.length === 0) return;
    const parts: Part[] = [];
    for (const sp of this.spans) parts.push(...this.model(sp));
    this.mesh = new THREE.Mesh(merge(parts), this.material);
    this.mesh.name = 'bridges';
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);
  }

  private span(s: SimState, run: number[]): Span {
    const map = this.map;
    const n = map.size;
    const eastWest = run.length > 1 ? run[1] - run[0] === 1 : bridgeRunsEastWest(map, s, run[0]);
    const first = run[0];
    const fx = first % n;
    const fz = Math.floor(first / n);
    const start = eastWest ? fx : fz;
    const len = run.length;
    const across = (eastWest ? fz : fx) + 0.5;
    const at = (d: number): [number, number] => (eastWest ? [start + d, across] : [across, start + d]);
    // The banks where it lands, and a low arch between them, never too near the water.
    const [ax, az] = at(0);
    const [bx, bz] = at(len);
    const h0 = map.heightAt(ax, az) + LIFT;
    const h1 = map.heightAt(bx, bz) + LIFT;
    const arch = 0.1 + 0.035 * len;
    const k = len * SAMPLES;
    const profile = new Float32Array(k + 1);
    let lowest = Infinity;
    for (let i = 0; i <= k; i++) {
      const f = i / k;
      const [x, z] = at(f * len);
      const q = map.riverAt(x, z);
      const water = Math.max(q.surface, map.heightAt(x, z));
      lowest = Math.min(lowest, h0 + (h1 - h0) * f + Math.sin(f * Math.PI) * arch - (water + CLEAR));
    }
    // Lift the middle (not the ends, which meet the road) wherever it would be too near the water.
    const lift = Math.max(0, -lowest);
    for (let i = 0; i <= k; i++) {
      const f = i / k;
      profile[i] = h0 + (h1 - h0) * f + Math.sin(f * Math.PI) * (arch + lift * 1.15);
    }
    return { tiles: run, eastWest, start, len, across, profile };
  }

  private model(sp: Span): Part[] {
    const map = this.map;
    const parts: Part[] = [];
    const deck = (d: number): number => {
      const i = Math.max(0, Math.min(sp.profile.length - 1, Math.round(d * SAMPLES)));
      return sp.profile[i];
    };
    // A box from along a to b, across c to e, height y0 to y1, tilted to follow the deck.
    const put = (geo: THREE.BufferGeometry, d: number, across: number, y: number, slope: number, color: string): void => {
      if (sp.eastWest) geo.rotateZ(slope).translate(sp.start + d, y, sp.across + across);
      else geo.rotateX(-slope).translate(sp.across + across, y, sp.start + d);
      parts.push({ geo, color });
    };
    const slopeAt = (d: number): number => Math.atan2(deck(Math.min(sp.len, d + 0.1)) - deck(Math.max(0, d - 0.1)), 0.2);
    const W = 0.44;
    // Planks across the deck.
    const planks = Math.round(sp.len * 5);
    for (let i = 0; i < planks; i++) {
      const d = (i + 0.5) / 5;
      const w = 0.18;
      const geo = sp.eastWest ? new THREE.BoxGeometry(w, 0.05, W * 2) : new THREE.BoxGeometry(W * 2, 0.05, w);
      const shade = hash2(sp.tiles[0], i, 401);
      put(geo, d, (shade - 0.5) * 0.03, deck(d) - 0.025, slopeAt(d), shade < 0.3 ? PAL.timberDark : PAL.timber);
    }
    // Side beams, rails and their posts, in pieces along the deck.
    const pieces = Math.max(2, Math.round(sp.len * 2));
    for (let i = 0; i < pieces; i++) {
      const d0 = (i / pieces) * sp.len;
      const d1 = ((i + 1) / pieces) * sp.len;
      const dm = (d0 + d1) / 2;
      const l = (d1 - d0) / Math.cos(slopeAt(dm)) + 0.02;
      for (const side of [-1, 1]) {
        const beam = sp.eastWest ? new THREE.BoxGeometry(l, 0.1, 0.07) : new THREE.BoxGeometry(0.07, 0.1, l);
        put(beam, dm, side * (W + 0.02), deck(dm) - 0.06, slopeAt(dm), PAL.timberDark);
        const rail = sp.eastWest ? new THREE.BoxGeometry(l, 0.035, 0.04) : new THREE.BoxGeometry(0.04, 0.035, l);
        put(rail, dm, side * (W - 0.02), deck(dm) + 0.27, slopeAt(dm), PAL.timber);
      }
    }
    for (let i = 0; i <= pieces; i++) {
      const d = (i / pieces) * sp.len;
      for (const side of [-1, 1]) put(new THREE.BoxGeometry(0.05, 0.3, 0.05), d, side * (W - 0.02), deck(d) + 0.13, 0, PAL.timberDark);
    }
    // Piles down into the river at every tile between the banks, with a cross beam.
    for (let i = 1; i < sp.len; i++) {
      const d = i;
      const top = deck(d) - 0.08;
      for (const side of [-1, 1]) {
        const [x, z] = sp.eastWest ? [sp.start + d, sp.across + side * (W - 0.06)] : [sp.across + side * (W - 0.06), sp.start + d];
        const bottom = map.heightAt(x, z) - 0.25;
        const h = Math.max(0.1, top - bottom);
        parts.push({ geo: new THREE.CylinderGeometry(0.055, 0.065, h, 6).translate(x, bottom + h / 2, z), color: PAL.timberDark });
      }
      const cross = sp.eastWest ? new THREE.BoxGeometry(0.08, 0.08, W * 2 + 0.1) : new THREE.BoxGeometry(W * 2 + 0.1, 0.08, 0.08);
      put(cross, d, 0, top - 0.02, 0, PAL.timberDark);
    }
    return parts;
  }
}
