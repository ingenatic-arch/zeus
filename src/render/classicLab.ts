import * as THREE from 'three';
import { PAL } from './palette';

/**
 * Mock-ups only (24 Oct): looks that move the city towards the original
 * Zeus: Master of Olympus, switched on by `window.__look` for screenshots.
 * Nothing here is on unless a look name below is set.
 *
 * - `classic-view`: the original's fixed, high, near-flat (isometric) view, a clean high sun, no haze, no vignette.
 * - `classic-colour`: the view plus the original's brighter, cleaner colours and a crisper image.
 * - `classic-pixel`: the colours drawn at the original's pixel size (half resolution, hard pixels).
 * - `busy` (alone or after a `+`): workers at the farms, presses, stalls and fountains (workfolk.ts busy()).
 */
export interface Classic {
  view: boolean;
  colour: boolean;
  pixel: boolean;
  busy: boolean;
}

export function classic(): Classic {
  const l = String((globalThis as { __look?: string }).__look ?? '');
  const parts = l.split('+');
  const has = (p: string): boolean => parts.includes(p);
  const pixel = has('classic-pixel');
  const colour = pixel || has('classic-colour');
  const view = colour || has('classic-view');
  return { view, colour, pixel, busy: has('busy') };
}

/** The original's view angle: a 2:1 isometric diamond (30° above the ground). */
export const CLASSIC_PITCH = Math.PI / 6;
/** A long lens from far away: nearly flat, as the original's pictures were. */
export const CLASSIC_FOV = 6;
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
  if (!classic().colour) return;
  const pal = PAL as unknown as Record<string, string>;
  for (const [k, v] of Object.entries(CLASSIC_PALETTE)) pal[k] = v as string;
}

/**
 * The sun for the classic view (the camera standing south-west, looking
 * north-east): high, from the left of the picture and a little in front, so
 * the faces turned to you are lit and the shadows fall to the right.
 */
export function classicSun(dir: THREE.Vector3): void {
  if (!classic().view) return;
  const el = THREE.MathUtils.degToRad(55);
  dir.set(-0.99 * Math.cos(el), Math.sin(el), -0.14 * Math.cos(el)).normalize();
}
