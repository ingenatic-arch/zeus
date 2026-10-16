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
  // Cottages and the farmhouse
  whitewash: '#f4ede0',
  whitewashShade: '#e4d8c4',
  roofTile: '#c8663e',
  roofTileDark: '#a9522f',
  shutter: '#4f80b0',
  // The farm
  furrow: '#9a7a52',
  furrowDark: '#866845',
  wheatGreen: '#8fb04a',
  wheatGold: '#e2bc4e',
  wheatStubble: '#cdb27a',
  sheaf: '#e0b850',
  hay: '#dcc066',
  // The granary
  granaryStone: '#dccfb3',
  granaryShade: '#c8b896',
  silo: '#ecdfc3',
  sack: '#cdb07c',
  sackDark: '#b89a68',
  // The agora
  agoraPave: '#e3d8c0',
  agoraPaveDark: '#d2c4a6',
  column: '#f0e8d6',
  awning: '#d8553a',
  awningLight: '#f3ead6',
  basket: '#b98a4e',
  loaf: '#c98d48',
  loafLight: '#dfa860',
  // Bridges
  timber: '#9a7048',
  timberDark: '#7a5636',
  // The townhouses and fine houses, the shrine and the theatre.
  bandBlue: '#4f7fb4',
  bandOchre: '#d9a440',
  marble: '#f5f0e4',
  marbleShade: '#ddd2bc',
  lilac: '#9a7ad0',
  rose: '#d8607c',
  seatStone: '#e4d6b6',
  seatStoneShade: '#cdbd98',
  skene: '#efe3c8',
  courtyard: '#e4d5b4',
  // The ox cart, the porter and the food vendor
  ox: '#a88866',
  oxDark: '#6e5440',
  horn: '#eee4cc',
  cart: '#94683f',
  vendorDress: '#f0a830',
  vendorScarf: '#fbf6ea',
  // The water carrier
  carrierDress: '#5fb0e8',
  carrierShawl: '#f6f1e4',
  priestessRobe: '#f7f3ec',
  priestessMantle: '#9a7ad0',
  offeringBowl: '#c9a24e',
  actorTunic: '#d8607c',
  actorCloak: '#e8b04a',
  actorMouth: '#7a2a2a',
  mask: '#f6ead2',
  ivy: '#5f8a3e',
  scroll: '#efe2bf',
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
