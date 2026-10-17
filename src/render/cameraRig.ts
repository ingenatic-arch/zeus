import * as THREE from 'three';
import { MAP_SIZE } from '../map/coast';
import { clamp, lerp, smoothstep } from '../map/noise';

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

  constructor(camera: THREE.PerspectiveCamera, map: Ground, view: CameraView, limits: RigLimits = CITY_LIMITS) {
    this.camera = camera;
    this.map = map;
    this.lim = limits;
    this.cur = { tilt: 0, ...view };
    this.goal = { ...this.cur };
    this.groundY = this.groundAt(view.x, view.z);
    this.apply();
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
    this.goal = { ...this.cur };
    this.groundY = this.groundAt(view.x, view.z);
    this.apply();
  }

  flyTo(view: CameraView): void {
    this.goal = { tilt: 0, ...view };
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
    const worldPerPx = (2 * this.cur.dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))) / viewportH;
    const pitch = this.pitch(this.cur.dist, this.cur.tilt);
    this.pan(-dxPx * worldPerPx, (dyPx * worldPerPx) / Math.max(0.35, Math.sin(pitch)));
    // Dragging the ground should feel direct, so skip the smoothing for position.
    this.cur.x = this.goal.x;
    this.cur.z = this.goal.z;
  }

  orbit(dYaw: number, dTilt: number): void {
    this.goal.yaw += dYaw;
    this.goal.tilt = clamp(this.goal.tilt + dTilt, MIN_TILT, MAX_TILT);
    this.cur.yaw = this.goal.yaw;
    this.cur.tilt = this.goal.tilt;
  }

  tilt(d: number): void {
    this.goal.tilt = clamp(this.goal.tilt + d, MIN_TILT, MAX_TILT);
  }

  /** Turn a quarter in the given direction, landing on a whole quarter. */
  turnQuarter(dir: 1 | -1): void {
    const snapped = Math.round(this.goal.yaw / QUARTER) * QUARTER;
    const already = Math.abs(snapped - this.goal.yaw) < 0.01;
    this.goal.yaw = already ? snapped + dir * QUARTER : dir > 0 ? Math.ceil(this.goal.yaw / QUARTER) * QUARTER : Math.floor(this.goal.yaw / QUARTER) * QUARTER;
  }

  /** Face north again. */
  faceNorth(): void {
    const turns = Math.round(this.goal.yaw / (Math.PI * 2));
    this.goal.yaw = turns * Math.PI * 2;
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
    const { minDist, maxDist, pitchNear, pitchFar } = this.lim;
    const t = (Math.log(dist) - Math.log(minDist)) / (Math.log(maxDist) - Math.log(minDist));
    return clamp(lerp(pitchNear, pitchFar, smoothstep(0, 0.9, t)) + tilt, 0.08, 1.45);
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
  }

  private apply(): void {
    const { x, z, yaw, dist, tilt } = this.cur;
    const pitch = this.pitch(dist, tilt);
    const horiz = Math.cos(pitch) * dist;
    const cam = this.camera;
    cam.position.set(x + Math.sin(yaw) * horiz, this.groundY + Math.sin(pitch) * dist, z + Math.cos(yaw) * horiz);
    // Never dip below the ground (or the sea).
    const floor = this.groundAt(cam.position.x, cam.position.z) + 0.9;
    if (cam.position.y < floor) cam.position.y = floor;
    // Close up, aim a little above the ground so the horizon stays in view.
    const lift = lerp(0.9, 0, smoothstep(this.lim.minDist, 30, dist));
    cam.lookAt(x, this.groundY + lift, z);
    cam.near = clamp(dist * 0.02, 0.1, 2);
    cam.far = 9000;
    cam.updateProjectionMatrix();
  }

  /** The ground point under a screen position (NDC), by marching along the ray. */
  groundUnder(ndcX: number, ndcY: number): THREE.Vector3 | null {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const o = ray.ray.origin;
    const d = ray.ray.direction;
    let prev = 0;
    const maxT = 1200;
    let t = 0.5;
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
      t += Math.max(0.25, t * 0.02);
    }
    return null;
  }
}
