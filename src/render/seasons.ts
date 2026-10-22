import * as THREE from 'three';
import { smoothstep } from '../map/noise';

/**
 * Slice 33: how the land looks through the year. The renderer reads the
 * season from the sim's tick (seasons.ts: tick 0 is 1 March, a season is a
 * quarter of the year) and the weather of the day, and turns them into a
 * handful of numbers the shaders and lights take: the grass's tint and
 * colourfulness, the leaves', the sea's and the sky's, the light, and how
 * hard it rains.
 *
 * A season's look holds through most of it and turns into the next over its
 * last few weeks, so 1 March (the founding) looks exactly like spring, and
 * spring is the look the city was tuned in. Nothing here touches the sim.
 */

export interface SeasonLook {
  /** Multiplies the grass (and in the plain look nothing), after it is drawn; `grassSat` its colourfulness (1 as it is). */
  grassTint: THREE.Vector3;
  grassSat: number;
  /** The same for the leaves of trees, shrubs and reeds. */
  leafTint: THREE.Vector3;
  leafSat: number;
  /** How far the sea goes towards a cold grey (0 none), and towards a deeper summer blue. */
  seaGrey: number;
  seaBlue: number;
  /** How far the sky and haze go towards a winter grey. */
  skyGrey: number;
  /** How wet it is (0 dry to 1 a downpour) and how stormy (0 to 1). */
  rain: number;
  storm: number;
}

interface Key {
  grassTint: [number, number, number];
  grassSat: number;
  leafTint: [number, number, number];
  leafSat: number;
  seaGrey: number;
  seaBlue: number;
  skyGrey: number;
}

/**
 * Spring (close to the look the city was tuned in, a little fresher), summer
 * (the grass gone gold, the leaves dusty), autumn (amber and russet, the
 * leaves warmer) and winter (grey-green, darker, the sea and sky greyer).
 * Picked by eye from screenshots.
 */
const KEYS: readonly Key[] = [
  { grassTint: [0.9, 1.08, 0.82], grassSat: 1.1, leafTint: [0.96, 1.04, 0.94], leafSat: 1.06, seaGrey: 0, seaBlue: 0, skyGrey: 0 },
  { grassTint: [1.2, 1.08, 0.62], grassSat: 0.95, leafTint: [1.05, 1.0, 0.86], leafSat: 0.94, seaGrey: 0, seaBlue: 0.6, skyGrey: 0 },
  { grassTint: [1.13, 0.92, 0.66], grassSat: 0.86, leafTint: [1.2, 0.9, 0.66], leafSat: 1.0, seaGrey: 0.25, seaBlue: 0, skyGrey: 0.15 },
  { grassTint: [0.84, 0.93, 0.84], grassSat: 0.56, leafTint: [0.84, 0.9, 0.9], leafSat: 0.68, seaGrey: 0.7, seaBlue: 0, skyGrey: 0.62 },
];

/** The look as it was before the seasons (the switch off). */
const NONE: Key = { grassTint: [1, 1, 1], grassSat: 1, leafTint: [1, 1, 1], leafSat: 1, seaGrey: 0, seaBlue: 0, skyGrey: 0 };

/** How much of the end of each season it takes to turn into the next (a quarter: about three weeks). */
const TURN = 0.25;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** The look at a point in the year (0 at 1 March, a season a unit; null: the seasons are off, the look as before them), with the day's rain and storm (0 to 1). */
export function seasonLook(phase: number | null, rain = 0, storm = 0, out?: SeasonLook): SeasonLook {
  const o = out ?? { grassTint: new THREE.Vector3(), grassSat: 1, leafTint: new THREE.Vector3(), leafSat: 1, seaGrey: 0, seaBlue: 0, skyGrey: 0, rain: 0, storm: 0 };
  let a: Key;
  let b: Key;
  let t: number;
  if (phase === null) {
    a = b = NONE;
    t = 0;
  } else {
    const p = ((phase % 4) + 4) % 4;
    const i = Math.floor(p);
    a = KEYS[i];
    b = KEYS[(i + 1) % 4];
    t = smoothstep(1 - TURN, 1, p - i);
  }
  o.grassTint.set(lerp(a.grassTint[0], b.grassTint[0], t), lerp(a.grassTint[1], b.grassTint[1], t), lerp(a.grassTint[2], b.grassTint[2], t));
  o.grassSat = lerp(a.grassSat, b.grassSat, t);
  o.leafTint.set(lerp(a.leafTint[0], b.leafTint[0], t), lerp(a.leafTint[1], b.leafTint[1], t), lerp(a.leafTint[2], b.leafTint[2], t));
  o.leafSat = lerp(a.leafSat, b.leafSat, t);
  o.seaGrey = lerp(a.seaGrey, b.seaGrey, t);
  o.seaBlue = lerp(a.seaBlue, b.seaBlue, t);
  o.skyGrey = lerp(a.skyGrey, b.skyGrey, t);
  // Wet ground and a grey sky with the rain, more in a storm.
  o.rain = rain;
  o.storm = storm;
  const wet = Math.max(rain * 0.55, storm);
  o.skyGrey = Math.min(1, o.skyGrey + wet * 0.6);
  o.seaGrey = Math.min(1, o.seaGrey + wet * 0.45);
  o.seaBlue *= 1 - wet;
  return o;
}

/**
 * The shaders' shared season uniforms (finish.ts adds them to every patched
 * material, so one write a frame changes the whole land). Spring's look to
 * begin with.
 */
export const SEASON_UNIFORMS = {
  lkGrassTint: { value: new THREE.Vector3(1, 1, 1) },
  lkGrassSat: { value: 1 },
  lkLeafTint: { value: new THREE.Vector3(1, 1, 1) },
  lkLeafSat: { value: 1 },
  lkWet: { value: 0 },
};

/** Put a look into the shared uniforms. */
export function applySeasonUniforms(l: SeasonLook): void {
  const u = SEASON_UNIFORMS;
  u.lkGrassTint.value.copy(l.grassTint);
  u.lkGrassSat.value = l.grassSat;
  u.lkLeafTint.value.copy(l.leafTint);
  u.lkLeafSat.value = l.leafSat;
  u.lkWet.value = Math.max(l.rain * 0.7, l.storm);
}
