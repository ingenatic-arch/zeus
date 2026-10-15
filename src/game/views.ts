import type { CameraView } from '../render/cameraRig';

/** Prepared camera framings, reachable as ?cam=<name>. */
export const VIEWS: Record<string, CameraView> = {
  // The opening view: the bay in front, the river valley and hills behind.
  coast: { x: 61, z: 54, yaw: 0.12, dist: 92, tilt: -0.66 },
  overview: { x: 64, z: 62, yaw: 0, dist: 170, tilt: 0.2 },
  // Street level on the fertile river bank, looking upstream to the hills.
  river: { x: 52, z: 59, yaw: 0.95, dist: 8, tilt: 0.02 },
  // From above the river mouth out over the bay to the headland.
  bay: { x: 74, z: 86, yaw: 2.6, dist: 42, tilt: -0.02 },
  // The rocky hills where the river rises.
  hills: { x: 26, z: 24, yaw: 0.7, dist: 34, tilt: 0 },
  // Down among the olive trees west of the bay.
  street: { x: 21, z: 70, yaw: 0.3, dist: 6, tilt: 0.05 },
  // Where the river meets the sea.
  mouth: { x: 64, z: 72, yaw: 0.5, dist: 16, tilt: 0 },
  // The headland and its pines.
  headland: { x: 110, z: 100, yaw: -0.9, dist: 30, tilt: 0 },
};

export const DEMOS: Record<string, { view: string }> = {
  coast: { view: 'coast' },
};
