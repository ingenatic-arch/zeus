import * as THREE from 'three';
import { MAP_SIZE } from '../map/coast';
import { clamp, lerp, smoothstep } from '../map/noise';
import { CLASSIC_FOV, CLASSIC_PITCH, CLASSIC_REACH, EYE } from './classic';

export interface CameraView {
  /** Ground point the camera looks at. */
  x: number;
  z: number;
  /** Heading, radians. 0 looks north (the camera stands south of the point). */
  yaw: number;
  /** Distance from the point. */
  dist: number;
  /** Extra tilt on top of the automatic angle (negative looks flatter). */
  tilt?: number;
}

export const MIN_DIST = 4.5;
export const MAX_DIST = 175;
const MIN_TILT = -0.7;
const MAX_TILT = 0.5;
const QUARTER = Math.PI / 2;
/** The original look's headings: the diagonals, the first with the camera standing south-west. */
const DIAGONAL = -Math.PI / 4;
/** How far a right-drag must turn (radians) before the original look's view turns a quarter. */
const TURN_DRAG = 0.35;

/** What the camera looks at: the ground's height anywhere (the city's coast, or the table of Greece). */
export interface Ground {
  heightAt(x: number, z: number): number;
}

/** How far the camera may go: its distances, how far it may wander, and its view angle from closest to farthest. */
export interface RigLimits {
  minDist: number;
  maxDist: number;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  pitchNear: number;
  pitchFar: number;
}

/** The city's: within a few tiles of the map, down to street level. */
export const CITY_LIMITS: RigLimits = { minDist: MIN_DIST, maxDist: MAX_DIST, x0: -6, z0: -6, x1: MAP_SIZE + 6, z1: MAP_SIZE + 6, pitchNear: 0.2, pitchFar: 1.0 };

/**
 * A city-builder camera that always looks at a point on the ground. Zooming
 * in lowers the view angle towards street level; turning snaps in 90° steps
 * from the keyboard, or orbits freely with the mouse. Motion is smoothed.
 */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  private cur: Required<CameraView>;
  private goal: Required<CameraView>;
  private groundY = 0;
  private readonly map: Ground;
  private readonly lim: RigLimits;
  // Slice 33: the tops of the trees, so the camera keeps out of them on hillsides (eased, not jumped).
  private canopy: ((x: number, z: number) => number) | null = null;
  private over = 0;
  /**
   * The original Zeus look (classic.ts): a fixed view 30° above the ground on
   * a diagonal, through a long lens from far back so it is nearly flat. It
   * turns only a quarter at a time and doesn't tilt; `dist` keeps meaning how
   * much of the ground is in view.
   */
  private classic = false;
  private turnDrag = 0;

  constructor(camera: THREE.PerspectiveCamera, map: Ground, view: CameraView, limits: RigLimits = CITY_LIMITS) {
    this.camera = camera;
    this.map = map;
    this.lim = limits;
    this.cur = { tilt: 0, ...view };
    this.goal = { ...this.cur };
    this.groundY = this.groundAt(view.x, view.z);
    this.apply();
  }

  /** Switch to the original look's fixed view (the city's camera, before it is first drawn). */
  setClassic(on: boolean): void {
    this.classic = on;
    this.camera.fov = on ? CLASSIC_FOV : 42;
    if (on) {
      this.cur.yaw = this.diagonal(this.cur.yaw);
      this.cur.tilt = 0;
      this.goal = { ...this.cur };
    }
    this.apply();
  }

  /** The nearest of the original look's headings. */
  private diagonal(yaw: number): number {
    return Math.round((yaw - DIAGONAL) / QUARTER) * QUARTER + DIAGONAL;
  }

  /** How far the camera stands from the point it looks at, for the lens: the long lens of the original look stands further back. */
  private reach(): number {
    return this.classic ? CLASSIC_REACH : 1;
  }

  get view(): Required<CameraView> {
    return { ...this.cur };
  }

  /** Where the camera is aiming, on the ground. */
  get target(): THREE.Vector3 {
    return new THREE.Vector3(this.cur.x, this.groundY, this.cur.z);
  }

  /** How far the view still has to turn to reach where it is heading (radians). */
  get turnRemaining(): number {
    return Math.abs(this.goal.yaw - this.cur.yaw);
  }

  get distance(): number {
    return this.cur.dist;
  }

  jumpTo(view: CameraView): void {
    this.cur = { tilt: 0, ...view };
    if (this.classic) {
      this.cur.yaw = this.diagonal(this.cur.yaw);
      this.cur.tilt = 0;
    }
    this.goal = { ...this.cur };
    this.groundY = this.groundAt(view.x, view.z);
    this.apply();
  }

  flyTo(view: CameraView): void {
    this.goal = { tilt: 0, ...view };
    if (this.classic) {
      this.goal.yaw = this.diagonal(this.goal.yaw);
      this.goal.tilt = 0;
    }
    // Turn the short way round.
    while (this.goal.yaw - this.cur.yaw > Math.PI) this.goal.yaw -= Math.PI * 2;
    while (this.goal.yaw - this.cur.yaw < -Math.PI) this.goal.yaw += Math.PI * 2;
  }

  /** How many times the player has panned (keys or drag); following stops when this changes. */
  pans = 0;

  /** Keep the aim point on something moving (smoothed like any other move). */
  follow(x: number, z: number): void {
    this.goal.x = x;
    this.goal.z = z;
    this.clampGoal();
  }

  /** Pan by a screen-relative amount in world units (right, forward). */
  pan(right: number, forward: number): void {
    this.pans++;
    const c = Math.cos(this.goal.yaw);
    const s = Math.sin(this.goal.yaw);
    this.goal.x += right * c - forward * s;
    this.goal.z += -right * s - forward * c;
    this.clampGoal();
  }

  /** Pan so the ground under the pointer follows the drag (pixels). */
  dragPan(dxPx: number, dyPx: number, viewportH: number): void {
    const worldPerPx = (2 * this.cur.dist * this.reach() * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))) / viewportH;
    const pitch = this.pitch(this.cur.dist, this.cur.tilt);
    this.pan(-dxPx * worldPerPx, (dyPx * worldPerPx) / Math.max(0.35, Math.sin(pitch)));
    // Dragging the ground should feel direct, so skip the smoothing for position.
    this.cur.x = this.goal.x;
    this.cur.z = this.goal.z;
  }

  orbit(dYaw: number, dTilt: number): void {
    if (this.classic) {
      // The original look turns a quarter at a time: a drag far enough sideways turns it.
      this.turnDrag += dYaw;
      if (Math.abs(this.turnDrag) > TURN_DRAG) {
        this.turnQuarter(this.turnDrag > 0 ? 1 : -1);
        this.turnDrag = 0;
      }
      return;
    }
    this.goal.yaw += dYaw;
    this.goal.tilt = clamp(this.goal.tilt + dTilt, MIN_TILT, MAX_TILT);
    this.cur.yaw = this.goal.yaw;
    this.cur.tilt = this.goal.tilt;
  }

  /** A right-drag has ended: the original look's next drag starts its turn afresh. */
  endOrbit(): void {
    this.turnDrag = 0;
  }

  tilt(d: number): void {
    if (this.classic) return;
    this.goal.tilt = clamp(this.goal.tilt + d, MIN_TILT, MAX_TILT);
  }

  /** Turn a quarter in the given direction, landing on a whole quarter. */
  turnQuarter(dir: 1 | -1): void {
    // (The original look's quarters are the diagonals.)
    const off = this.classic ? DIAGONAL : 0;
    const y = this.goal.yaw - off;
    const snapped = Math.round(y / QUARTER) * QUARTER;
    const already = Math.abs(snapped - y) < 0.01;
    this.goal.yaw = (already ? snapped + dir * QUARTER : dir > 0 ? Math.ceil(y / QUARTER) * QUARTER : Math.floor(y / QUARTER) * QUARTER) + off;
  }

  /** Face north again. */
  faceNorth(): void {
    const off = this.classic ? DIAGONAL : 0;
    const turns = Math.round((this.goal.yaw - off) / (Math.PI * 2));
    this.goal.yaw = turns * Math.PI * 2 + off;
  }

  /** Zoom by a factor (<1 is closer), keeping the given ground point under the pointer. */
  zoom(factor: number, anchor?: THREE.Vector3): void {
    const before = this.goal.dist;
    this.goal.dist = clamp(before * factor, this.lim.minDist, this.lim.maxDist);
    const k = 1 - this.goal.dist / before;
    if (anchor) {
      // Near the ground the point under the pointer can be far off towards
      // the horizon; heading for it in full would lurch the view, so a
      // distant point only draws the view a little way its way.
      let ax = anchor.x - this.goal.x;
      let az = anchor.z - this.goal.z;
      const len = Math.hypot(ax, az);
      const cap = before * 3;
      if (len > cap) {
        ax *= cap / len;
        az *= cap / len;
      }
      this.goal.x += ax * k;
      this.goal.z += az * k;
      this.clampGoal();
    }
  }

  private clampGoal(): void {
    this.goal.x = clamp(this.goal.x, this.lim.x0, this.lim.x1);
    this.goal.z = clamp(this.goal.z, this.lim.z0, this.lim.z1);
  }

  /** The automatic view angle: steep from high up, low and level near the ground. */
  pitch(dist: number, tilt: number): number {
    if (this.classic) return CLASSIC_PITCH;
    const { minDist, maxDist, pitchNear, pitchFar } = this.lim;
    const t = (Math.log(dist) - Math.log(minDist)) / (Math.log(maxDist) - Math.log(minDist));
    return clamp(lerp(pitchNear, pitchFar, smoothstep(0, 0.9, t)) + tilt, 0.08, 1.45);
  }

  /** Slice 33: keep the camera above the plants' crowns (trees.ts canopyAt). */
  setCanopy(fn: (x: number, z: number) => number): void {
    this.canopy = fn;
  }

  /** How far the crowns under the camera rise above where the ground would put it. */
  private crownLift(x: number, y: number, z: number): number {
    if (!this.canopy) return 0;
    const top = this.canopy(x, z);
    return top === -Infinity ? 0 : Math.max(0, top + 0.6 - y);
  }

  private groundAt(x: number, z: number): number {
    return Math.max(this.map.heightAt(x, z), 0);
  }

  update(dt: number): void {
    const k = 1 - Math.exp(-dt * 9);
    const kz = 1 - Math.exp(-dt * 7);
    this.cur.x += (this.goal.x - this.cur.x) * k;
    this.cur.z += (this.goal.z - this.cur.z) * k;
    this.cur.yaw += (this.goal.yaw - this.cur.yaw) * k;
    this.cur.tilt += (this.goal.tilt - this.cur.tilt) * k;
    this.cur.dist = Math.exp(Math.log(this.cur.dist) + (Math.log(this.goal.dist) - Math.log(this.cur.dist)) * kz);
    // Follow the ground under the aim point, smoothed so hills don't jolt the view.
    const gy = this.groundAt(this.cur.x, this.cur.z);
    this.groundY += (gy - this.groundY) * (1 - Math.exp(-dt * 5));
    this.apply();
    // Slice 33: ease up over the crowns (quickly) and back down (gently). (The original look's camera stands far above them.)
    if (this.classic) return;
    const want = this.crownLift(this.camera.position.x, this.camera.position.y - this.over, this.camera.position.z);
    this.over += (want - this.over) * (1 - Math.exp(-dt * (want > this.over ? 10 : 3)));
    if (this.over > 0.001) this.apply();
  }

  private apply(): void {
    const { x, z, yaw, tilt } = this.cur;
    const pitch = this.pitch(this.cur.dist, tilt);
    // The original look: a long lens from far back, so the view is nearly flat.
    const classic = this.classic;
    const dist = this.cur.dist * this.reach();
    if (classic) EYE.back = dist - this.cur.dist;
    const horiz = Math.cos(pitch) * dist;
    const cam = this.camera;
    cam.position.set(x + Math.sin(yaw) * horiz, this.groundY + Math.sin(pitch) * dist, z + Math.cos(yaw) * horiz);
    // Never dip below the ground (or the sea).
    const floor = this.groundAt(cam.position.x, cam.position.z) + 0.9;
    if (cam.position.y < floor) cam.position.y = floor;
    cam.position.y += this.over;
    // Close up, aim a little above the ground so the horizon stays in view.
    const lift = classic ? 0 : lerp(0.9, 0, smoothstep(this.lim.minDist, 30, dist));
    cam.lookAt(x, this.groundY + lift, z);
    cam.near = classic ? dist * 0.4 : clamp(dist * 0.02, 0.1, 2);
    cam.far = classic ? dist * 3 + 400 : 9000;
    cam.updateProjectionMatrix();
  }

  /** The ground point under a screen position (NDC), by marching along the ray. */
  groundUnder(ndcX: number, ndcY: number): THREE.Vector3 | null {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const o = ray.ray.origin;
    const d = ray.ray.direction;
    // (The original look's camera stands far back: start the march where the view begins.)
    const t0 = this.classic ? this.camera.near : 0;
    let prev = t0;
    const maxT = t0 * 4 + 1200;
    let t = t0 + 0.5;
    while (t < maxT) {
      const p = o.clone().addScaledVector(d, t);
      if (p.y <= this.groundAt(p.x, p.z)) {
        let lo = prev;
        let hi = t;
        for (let i = 0; i < 20; i++) {
          const mid = (lo + hi) / 2;
          const q = o.clone().addScaledVector(d, mid);
          if (q.y <= this.groundAt(q.x, q.z)) hi = mid;
          else lo = mid;
        }
        return o.clone().addScaledVector(d, hi);
      }
      prev = t;
      t += Math.max(0.25, (t - t0) * 0.02);
    }
    return null;
  }
}
