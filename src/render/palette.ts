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
  poppy: '#d9442e',
  daisy: '#fbf6e8',
  // Streets and homes
  road: '#e6d3a6',
  roadEdge: '#bfa072',
  plotLine: '#ddd09c',
  earth: '#c9ad7a',
  earthWorn: '#a98a5c',
  stake: '#8a6a48',
  flag: '#c8643b',
  canvas: '#f1e6c8',
  canvasShade: '#e2d3ae',
  canvasStripe: '#c8643b',
  canvasOchre: '#d9b56a',
  canvasBlue: '#6f8fae',
  door: '#5a4330',
  pole: '#7a5c3c',
  stone: '#a59c8e',
  ember: '#f08a2e',
  flame: '#ffd25a',
  pot: '#b85f35',
  bundleBlue: '#5b7fa6',
  bundleRed: '#b5523a',
  bundleCream: '#eadfc4',
  rug: '#9b4a35',
  rugStripe: '#e7c66a',
  // Huts
  mudWall: '#d8b68a',
  mudWallShade: '#c9a576',
  plinth: '#b3a58d',
  thatch: '#d9b45c',
  thatchDark: '#b8913f',
  wood: '#8a6542',
  woodDark: '#6a4c33',
  pithos: '#c0703f',
  // The fountain and water
  fountainStone: '#e6dcc6',
  fountainStoneShade: '#cbbd9f',
  paving: '#ddd1b6',
  pavingDark: '#c9bb9c',
  basinWater: '#4fb9d6',
  basinWaterLight: '#9fe0ee',
  spout: '#bfeaf3',
  // The water carrier
  carrierDress: '#7fa9cf',
  carrierShawl: '#efe4c8',
  skin: '#d9a273',
  hair: '#4b3526',
  // Tunics (picked per person)
  tunicTerracotta: '#c8643b',
  tunicOchre: '#d6a84a',
  tunicBlue: '#5f86b0',
  tunicCream: '#efe4c8',
  tunicGreen: '#7f9a4f',
  tunicPlum: '#8c5a7a',
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
