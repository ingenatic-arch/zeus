/**
 * The hand-shaped coast, authored as data. Map units: one unit is one tile.
 * x runs west to east, z runs north to south; the playable map is 0..128 in
 * both. The sea lies to the south, the hills to the north.
 *
 * Everything here is a shape to be tuned by eye; bake.ts turns it into grids.
 */

export const MAP_SIZE = 128;
/** How far the scenery continues beyond the playable map on each side. */
export const MAP_MARGIN = 128;
export const COAST_SEED = 0xc0a57;

export interface Hill {
  x: number;
  z: number;
  /** Radius (units) of the gaussian bump. */
  r: number;
  /** Height at its centre. */
  h: number;
  /** rocky: craggy ridged crest and rock colours. cliffy: may rise right at the shore. */
  rocky?: boolean;
  cliffy?: boolean;
}

export interface Area {
  x: number;
  z: number;
  r: number;
}

/** A copper outcrop, and how people name where it is ("in the east hills"). */
export interface Outcrop extends Area {
  place: string;
}

export interface Grove extends Area {
  /** Direction of the planted rows, radians. */
  rows: number;
  /** Spacing between trees. */
  spacing: number;
}

export const coast = {
  /**
   * The shoreline as (x, z) points: land lies north of it (smaller z).
   * Interpolated smoothly; a curved bay in the middle and a headland to the east.
   */
  shore: [
    [-140, 103],
    [-70, 101],
    [-20, 100],
    [0, 101],
    [10, 103],
    [20, 101],
    [29, 95],
    [38, 86],
    [47, 78],
    [56, 73],
    [65, 71.5],
    [74, 73],
    [83, 79],
    [91, 88],
    [97, 98],
    [102, 108],
    [107, 116],
    [113, 121],
    [119, 121],
    [124, 115],
    [129, 107],
    [138, 101],
    [160, 98],
    [210, 99],
    [270, 101],
  ] as [number, number][],

  /** Small islands, as ellipses (they also need a hill to rise from the sea). */
  islets: [{ x: 70, z: 97, rx: 3.6, rz: 2.7 }],

  hills: [
    // The rocky massif in the north-west, where the river rises.
    { x: 12, z: 12, r: 20, h: 13, rocky: true },
    { x: 32, z: 4, r: 15, h: 10, rocky: true },
    { x: -8, z: 32, r: 18, h: 10, rocky: true },
    { x: 0, z: -16, r: 28, h: 16, rocky: true },
    // Rolling hills along the north.
    { x: 64, z: 8, r: 22, h: 6 },
    { x: 92, z: 2, r: 20, h: 8 },
    { x: 122, z: 18, r: 17, h: 9, rocky: true },
    // Mountains beyond the map, framing the view.
    { x: 40, z: -62, r: 50, h: 30, rocky: true },
    { x: 110, z: -52, r: 45, h: 26, rocky: true },
    { x: -62, z: -20, r: 42, h: 24, rocky: true },
    { x: 182, z: -8, r: 42, h: 22, rocky: true },
    { x: 190, z: 58, r: 30, h: 10 },
    { x: -70, z: 60, r: 30, h: 9 },
    // The headland east of the bay, with cliffs to the sea.
    { x: 112, z: 98, r: 11, h: 6, rocky: true, cliffy: true },
    { x: 104, z: 72, r: 16, h: 5 },
    { x: 117, z: 112, r: 7, h: 4, cliffy: true },
    // A low rise west of the bay, for olive groves.
    { x: 18, z: 70, r: 14, h: 3.5 },
    // The islet.
    { x: 70, z: 97, r: 3, h: 1.5, rocky: true, cliffy: true },
  ] as Hill[],

  /** The river's course from its spring in the hills to its mouth in the bay. */
  river: [
    [29, 21],
    [33, 29],
    [33, 37],
    [37, 45],
    [45, 51],
    [53, 57],
    [59, 63],
    [63, 70],
    [64, 77],
  ] as [number, number][],
  /** Half-width of the stream at the spring and at the mouth. */
  riverWidth: [0.8, 2.6] as [number, number],
  /** Half-width of the flat green flood plain either side, at the spring and the mouth. */
  valleyWidth: [4, 13] as [number, number],

  groves: [
    { x: 19, z: 66, r: 10, rows: 0.25, spacing: 2.6 },
    { x: 84, z: 40, r: 11, rows: -0.15, spacing: 2.6 },
    { x: 104, z: 76, r: 7, rows: 0.5, spacing: 2.5 },
    { x: 54, z: 32, r: 7, rows: 0.1, spacing: 2.7 },
  ] as Grove[],

  /** Where umbrella pines gather (near the shore). */
  pineWoods: [
    { x: 112, z: 104, r: 12 },
    { x: 8, z: 92, r: 12 },
    { x: 92, z: 66, r: 8 },
    { x: 70, z: 97, r: 2.2 },
  ] as Area[],

  /**
   * Copper in the rock (slice 23): outcrops on the rocky hills where a copper
   * mine can go, richest at the centre. Read only by the mine's rules
   * (tileCopper in build.ts), never by the bake, so the ground is as it was.
   */
  copper: [
    { x: 12, z: 10, r: 5.5, place: 'in the crags above the spring' },
    { x: 110, z: 10, r: 5.5, place: 'in the east hills' },
    { x: 114, z: 96, r: 4.5, place: 'on the headland' },
  ] as Outcrop[],

  /** Spots with a few tall cypresses. */
  cypressStands: [
    { x: 70, z: 30, r: 4 },
    { x: 26, z: 48, r: 3 },
    { x: 96, z: 24, r: 4 },
  ] as Area[],
};

/**
 * The wild herds: deer on the hills, boar in the woods. Each roams within `r`
 * tiles of its centre; `head` is its size when whole; `place` is how people
 * name where it lives ("the deer below the crags").
 */
export interface HerdHome {
  kind: 'deer' | 'boar';
  x: number;
  z: number;
  r: number;
  head: number;
  place: string;
}

export const HERDS: readonly HerdHome[] = [
  { kind: 'deer', x: 13, z: 42, r: 8, head: 7, place: 'below the crags' },
  { kind: 'deer', x: 58, z: 17, r: 10, head: 8, place: 'in the north hills' },
  { kind: 'deer', x: 98, z: 25, r: 9, head: 7, place: 'on the east hills' },
  { kind: 'deer', x: 118, z: 46, r: 7, head: 6, place: 'on the far east slopes' },
  { kind: 'boar', x: 92, z: 63, r: 7, head: 6, place: 'in the pine wood by the bay' },
  { kind: 'boar', x: 10, z: 86, r: 9, head: 6, place: 'in the west woods' },
  { kind: 'boar', x: 106, z: 82, r: 6, head: 5, place: 'on the headland' },
];

export type CoastData = typeof coast;
