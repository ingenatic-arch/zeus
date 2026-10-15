import { Color } from 'three';

/**
 * The shared warm palette. Hex values are sRGB as you'd pick them by eye;
 * three.js converts them to linear for lighting.
 */
export const PAL = {
  // Ground
  sand: '#ecd7a2',
  wetSand: '#d2b880',
  seabed: '#dcc78f',
  seabedDeep: '#6f8f86',
  riverBed: '#b9a77c',
  riverBank: '#bfae84',
  lush: '#80ad48',
  lushDeep: '#6b9a3e',
  meadow: '#a9b25a',
  dryGrass: '#d2b96e',
  rockWarm: '#c9ad85',
  rockGrey: '#aaa196',
  rockDark: '#8f8579',
  cliff: '#cfa36c',
  // Water
  shallow: '#5fd3cf',
  mid: '#2fa6c0',
  deep: '#1b6f9e',
  river: '#3fb2b8',
  foam: '#fffaf0',
  // Plants
  oliveLeaf: '#9cab72',
  oliveLeafDark: '#84935f',
  trunk: '#6e5641',
  pine: '#4f7c3c',
  pineDark: '#416b33',
  cypress: '#3e6136',
  scrub: '#94a456',
  scrubDark: '#7c8d46',
  broom: '#e8c53c',
  rock: '#c2b49b',
  reed: '#a3b25c',
  reedTip: '#c9a865',
  // Sky and light
  skyZenith: '#4f9fe0',
  skyReflect: '#a9d6ec',
  skyHorizon: '#f3e7cf',
  sun: '#fff1d8',
  hemiSky: '#d4ecff',
  hemiGround: '#d2b07c',
} as const;

const cache = new Map<string, Color>();
export function col(hex: string): Color {
  let c = cache.get(hex);
  if (!c) {
    c = new Color(hex);
    cache.set(hex, c);
  }
  return c;
}
