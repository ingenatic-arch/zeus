import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { clamp } from '../map/noise';
import type { CameraRig } from './cameraRig';
import { col, PAL } from './palette';
import { buildSky } from './sky';
import { buildTerrain } from './terrain';
import { buildTrees } from './trees';
import { buildWater, type Water } from './water';

/** Direction towards the sun: a warm afternoon sun from the south-west. */
export const SUN_DIR = new THREE.Vector3(-0.62, 0.62, 0.48).normalize();

/** The coast as a three.js scene: terrain, water, plants, sky and light. */
export class World {
  readonly scene = new THREE.Scene();
  readonly water: Water;
  private readonly sun: THREE.DirectionalLight;
  private readonly fog: THREE.Fog;

  constructor(map: CoastMap) {
    const scene = this.scene;
    this.fog = new THREE.Fog(col(PAL.skyHorizon).clone(), 200, 900);
    scene.fog = this.fog;
    scene.background = col(PAL.skyHorizon).clone();

    scene.add(buildSky(SUN_DIR));
    scene.add(buildTerrain(map));
    scene.add(buildTrees(map));
    this.water = buildWater(map);
    this.water.setSun(SUN_DIR);
    scene.add(this.water.group);

    const hemi = new THREE.HemisphereLight(col(PAL.hemiSky), col(PAL.hemiGround), 1.25);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(col(PAL.sun), 2.7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
    sun.shadow.radius = 3;
    scene.add(sun, sun.target);
    this.sun = sun;
  }

  /** Keep the shadow box around what the camera is looking at, sized to the view. */
  update(time: number, rig: CameraRig, windAngle: number, windStrength: number): void {
    this.water.update(time, windAngle, windStrength);
    const t = rig.target;
    const size = clamp(rig.distance * 0.9, 14, 120);
    const sh = this.sun.shadow.camera;
    // Snap the box to whole shadow-map texels so shadows don't shimmer while panning.
    const texel = (size * 2) / this.sun.shadow.mapSize.x;
    const snap = (v: number): number => Math.round(v / texel) * texel;
    const cx = snap(t.x);
    const cz = snap(t.z);
    this.sun.target.position.set(cx, t.y, cz);
    this.sun.position.set(cx, t.y, cz).addScaledVector(SUN_DIR, 200);
    if (sh.right !== size) {
      sh.left = -size;
      sh.right = size;
      sh.top = size;
      sh.bottom = -size;
      sh.near = 1;
      sh.far = 420;
      sh.updateProjectionMatrix();
    }
    // Haze: thin up close, thicker far out, always hiding the end of the world.
    const d = rig.distance;
    this.fog.near = 60 + d * 1.6;
    this.fog.far = 420 + d * 4.5;
  }
}
