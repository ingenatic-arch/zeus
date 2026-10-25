import * as THREE from 'three';
import { PAL } from './palette';

/**
 * The original Zeus look (Oliver's pick, 25 Oct, from the mock-ups in the
 * shared folder, zeus-original-look): the original's fixed, high, nearly flat
 * view, its colours, and hard pixels (the city drawn at half resolution).
 * Render only. A link ending in `-modern` opens with the sunlit terracotta
 * look and free camera of 24 Oct, `-plain` with the first low-poly look.
 */
let on = false;

/** Turn the look on or off (before the world is built). */
export function setClassic(want: boolean): void {
  on = want;
}

export function classicOn(): boolean {
  return on;
}

/**
 * How much further back than the game's ordinary lens the camera stands (0
 * with the free camera): marks and labels that size or thin out with distance
 * take it off, so they look the same as from the ordinary camera.
 */
export const EYE = { back: 0 };

/** The original's view angle: a 2:1 isometric diamond (30° above the ground). */
export const CLASSIC_PITCH = Math.PI / 6;
/** A long lens from far away: nearly flat, as the original's pictures were. */
export const CLASSIC_FOV = 6;
/** The game draws the city at this share of the screen's pixels, shown hard-edged. */
export const CLASSIC_PIXELS = 0.5;
/** How much further back the long lens stands to show what the game's 42° lens shows. */
export const CLASSIC_REACH = Math.tan(THREE.MathUtils.degToRad(21)) / Math.tan(THREE.MathUtils.degToRad(CLASSIC_FOV / 2));

/** The original's colours, by eye: greener, cleaner grass, whiter walls, orange tiles, grey-gold paving, a bluer sea. */
const CLASSIC_PALETTE: Partial<Record<keyof typeof PAL, string>> = {
  lush: '#6d9a3a',
  lushDeep: '#5a8b32',
  meadow: '#8fae4c',
  dryGrass: '#b9b05f',
  sand: '#ecdcac',
  wetSand: '#cdb27c',
  rockWarm: '#bca88a',
  rockGrey: '#a8a194',
  roofTile: '#c9643a',
  roofTileDark: '#a24d2d',
  whitewash: '#f6f1e6',
  whitewashShade: '#e0d8c6',
  villaWall: '#f4ead6',
  road: '#d4ccb6',
  roadEdge: '#9f957f',
  earth: '#bfa073',
  earthWorn: '#a3875e',
  plotLine: '#d2c69e',
  shallow: '#36a5ad',
  mid: '#1c6ea2',
  deep: '#124a80',
  oliveLeaf: '#6f8f47',
  oliveLeafDark: '#5c7a3c',
  scrub: '#6b8c38',
  scrubDark: '#58772f',
  pine: '#2f6230',
  pineDark: '#264f28',
  cypress: '#21472a',
  shutter: '#2c62ad',
  bandBlue: '#2c62ad',
  awning: '#c4472f',
  sun: '#fff5e4',
  hemiSky: '#dbe6ef',
  hemiGround: '#a8936c',
};

export function applyClassicPalette(): void {
  if (!on) return;
  const pal = PAL as unknown as Record<string, string>;
  for (const [k, v] of Object.entries(CLASSIC_PALETTE)) pal[k] = v as string;
}

/**
 * The sun for the classic view (the camera standing south-west, looking
 * north-east): high, from the left of the picture and a little in front, so
 * the faces turned to you are lit and the shadows fall to the right.
 */
export function classicSun(dir: THREE.Vector3): void {
  if (!on) return;
  const el = THREE.MathUtils.degToRad(55);
  dir.set(-0.99 * Math.cos(el), Math.sin(el), -0.14 * Math.cos(el)).normalize();
}
