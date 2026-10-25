import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { clamp, smoothstep } from '../map/noise';
import type { CameraRig } from './cameraRig';
import { col, PAL } from './palette';
import { buildSky } from './sky';
import { buildTerrain } from './terrain';
import { buildTrees, type Plants } from './trees';
import { buildWater, type Water } from './water';
import type { SeasonLook } from './seasons';
import { classicOn } from './classic';

/** Direction towards the sun: a warm afternoon sun from the south-west. */
export const SUN_DIR = new THREE.Vector3(-0.62, 0.62, 0.48).normalize();

/** The coast as a three.js scene: terrain, water, plants, sky and light. */
export class World {
  readonly scene = new THREE.Scene();
  readonly water: Water;
  readonly plants: Plants;
  private readonly sun: THREE.DirectionalLight;
  private readonly hemi: THREE.HemisphereLight;
  private readonly fog: THREE.Fog;
  private readonly sunBase = col(PAL.sun).clone();
  private readonly sunSummer = new THREE.Color('#ffe6c2');
  private readonly sunWinter = new THREE.Color('#eef0f0');
  private lastSeason = NaN;
  // Slice 33: the season's sky and the weather's light.
  private readonly sky: THREE.Mesh;
  private readonly zenithBase: THREE.Color;
  private readonly horizonBase: THREE.Color;
  private readonly zenithGrey = new THREE.Color('#8d9aa4');
  private readonly horizonGrey = new THREE.Color('#cfd0c8');
  private readonly zenithStorm = new THREE.Color('#56626d');
  private readonly horizonStorm = new THREE.Color('#9a9f9d');
  private sunI = 2.7;
  private hemiI = 1.25;
  private dim = 1;
  private lookKey = '';

  constructor(map: CoastMap) {
    const scene = this.scene;
    // The original look (classic.ts): the long lens stands far back, and the original had no haze.
    this.fog = classicOn() ? new THREE.Fog(col(PAL.skyHorizon).clone(), 4000, 9000) : new THREE.Fog(col(PAL.skyHorizon).clone(), 200, 900);
    scene.fog = this.fog;
    scene.background = col(PAL.skyHorizon).clone();

    this.sky = buildSky(SUN_DIR);
    scene.add(this.sky);
    const su = (this.sky.material as THREE.ShaderMaterial).uniforms;
    this.zenithBase = (su.uZenith.value as THREE.Color).clone();
    this.horizonBase = (su.uHorizon.value as THREE.Color).clone();
    scene.add(buildTerrain(map));
    this.plants = buildTrees(map);
    scene.add(this.plants.group);
    this.water = buildWater(map);
    this.water.setSun(SUN_DIR);
    scene.add(this.water.group);

    const hemi = new THREE.HemisphereLight(col(PAL.hemiSky), col(PAL.hemiGround), 1.25);
    scene.add(hemi);
    this.hemi = hemi;
    const sun = new THREE.DirectionalLight(col(PAL.sun), 2.7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
    sun.shadow.radius = 3;
    scene.add(sun, sun.target);
    this.sun = sun;
  }

  /**
   * Gentle seasons in the light (the land and the farms don't change): a
   * warmer, stronger sun in high summer, a paler, softer one in midwinter.
   * `year` is how far through the calendar year it is, 0 at the start of
   * January.
   */
  setSeason(year: number): void {
    // 1 in mid-July, -1 in mid-January.
    const w = Math.cos(((year - 6.5 / 12) * Math.PI * 2));
    const k = Math.round(w * 200) / 200;
    if (k === this.lastSeason) return;
    this.lastSeason = k;
    // Winter is the gentler side, so the early spring the game starts in stays close to the light it was tuned in.
    this.sun.color.copy(this.sunBase).lerp(k > 0 ? this.sunSummer : this.sunWinter, k > 0 ? k * 0.5 : -k * 0.35);
    this.sunI = 2.7 + (k > 0 ? 0.2 : 0.12) * k;
    this.hemiI = 1.25 - 0.05 * k;
    this.lights();
  }

  private lights(): void {
    // The original look (classic.ts): a brighter sky fill, as the original's evenly lit pictures.
    const lab = classicOn();
    this.sun.intensity = this.sunI * this.dim * (lab ? 1.05 : 1);
    this.hemi.intensity = this.hemiI * (1 - (1 - this.dim) * 0.35) * (lab ? 1.2 : 1);
  }

  /**
   * Slice 33: the season's sky and haze (greyer in winter and under rain,
   * dark in a storm) and the light dimmed by the weather; `flash` is a
   * lightning flash (0 to 1).
   */
  setLook(l: SeasonLook, flash = 0): void {
    const key = `${l.skyGrey.toFixed(3)} ${l.rain.toFixed(3)} ${l.storm.toFixed(3)} ${flash.toFixed(2)}`;
    if (key === this.lookKey) return;
    this.lookKey = key;
    const u = (this.sky.material as THREE.ShaderMaterial).uniforms;
    const z = u.uZenith.value as THREE.Color;
    const h = u.uHorizon.value as THREE.Color;
    z.copy(this.zenithBase).lerp(this.zenithGrey, l.skyGrey).lerp(this.zenithStorm, l.storm * 0.85);
    h.copy(this.horizonBase).lerp(this.horizonGrey, l.skyGrey).lerp(this.horizonStorm, l.storm * 0.85);
    this.fog.color.copy(h);
    (this.scene.background as THREE.Color).copy(h);
    this.water.setLook(l.seaGrey, l.seaBlue);
    this.dim = Math.min(1.6, (1 - Math.min(0.55, l.rain * 0.4 + l.storm * 0.25 + l.skyGrey * 0.12)) + flash * 0.8);
    this.lights();
  }

  /** Keep the shadow box around what the camera is looking at, sized to the view. */
  update(time: number, rig: CameraRig, windAngle: number, windStrength: number): void {
    this.water.update(time, windAngle, windStrength);
    this.plants.update(time);
    const t = rig.target;
    const size = clamp(rig.distance * 0.9, 24, 120);
    const sh = this.sun.shadow.camera;
    // Looking along the ground from close up, most of what's in view lies
    // beyond the aim point, so the box slides forward to keep shadows under
    // the trees ahead. From higher up the box is big enough as it is.
    const v = rig.view;
    const ahead = size * 0.6 * (1 - smoothstep(0.35, 1.0, rig.pitch(v.dist, v.tilt))) * (1 - smoothstep(10, 40, v.dist));
    // Snap the box to whole shadow-map texels so shadows don't shimmer while panning.
    const texel = (size * 2) / this.sun.shadow.mapSize.x;
    const snap = (val: number): number => Math.round(val / texel) * texel;
    const cx = snap(t.x - Math.sin(v.yaw) * ahead);
    const cz = snap(t.z - Math.cos(v.yaw) * ahead);
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
    // The original look (classic.ts): no haze over the city, only at the end of the world.
    if (classicOn()) {
      this.fog.near = 4000;
      this.fog.far = 9000;
    }
  }
}
