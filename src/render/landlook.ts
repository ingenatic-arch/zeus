/**
 * Each kind of land's own colours (slice 46): a few of the ground's, the
 * plants' and the water's colours mixed towards the kind's own, over
 * whichever look is on (the original, -modern or -plain), so every look keeps
 * working. The Bay and the sheltered bay keep the look's colours as they are.
 * Render only; applied to the shared palette once the town's land is known,
 * before anything is built.
 */
import { PAL } from './palette';

type Key = keyof typeof PAL;

/** For each kind, the colours it moves, each towards a colour by a share. */
const MIX: Record<string, Partial<Record<Key, [string, number]>>> = {
  islands: {
    shallow: ['#5ee0d2', 0.35],
    mid: ['#1f8fb8', 0.25],
    sand: ['#f6e9c6', 0.45],
    wetSand: ['#dcc590', 0.3],
    meadow: ['#9bb655', 0.25],
  },
  // (Slice 46's review: the delta, the mountains and the woods pushed further, so that near the city in the original
  // look they read as other places than the Bay, not only by their shapes: the delta wet and deep green, with silt
  // where the Bay has golden grass; the mountains sage and stony; the woods dark, with leaf litter for dry grass.)
  delta: {
    lush: ['#4d8a3c', 0.5],
    lushDeep: ['#3c7834', 0.55],
    meadow: ['#5f9846', 0.6],
    dryGrass: ['#8aa05a', 0.65],
    sand: ['#c8bc96', 0.6],
    wetSand: ['#a49a74', 0.55],
    riverBed: ['#9a9068', 0.45],
    riverBank: ['#a99d74', 0.4],
    river: ['#5aa696', 0.4],
    shallow: ['#73c2ae', 0.35],
    seabed: ['#c3b78e', 0.4],
    reed: ['#8fa64e', 0.3],
    scrub: ['#4f8436', 0.35],
    scrubDark: ['#3f6f2e', 0.35],
  },
  mountains: {
    rockWarm: ['#b4ab9c', 0.55],
    rockGrey: ['#99968e', 0.45],
    rockDark: ['#7f7a72', 0.4],
    cliff: ['#cbbfa8', 0.55],
    dryGrass: ['#aea486', 0.75],
    meadow: ['#8f9a6c', 0.72],
    lush: ['#6f8d4a', 0.4],
    lushDeep: ['#5f7d44', 0.35],
    scrub: ['#7b8752', 0.4],
    scrubDark: ['#66714a', 0.4],
    pine: ['#3a6634', 0.3],
  },
  dryplain: {
    dryGrass: ['#d09a4c', 0.78],
    meadow: ['#c8a052', 0.78],
    lush: ['#8f9e48', 0.45],
    lushDeep: ['#7a8c40', 0.4],
    sand: ['#ecc99a', 0.45],
    wetSand: ['#c9a777', 0.35],
    rockWarm: ['#d1a679', 0.45],
    cliff: ['#d8a96e', 0.4],
    scrub: ['#93904c', 0.45],
    scrubDark: ['#7c7a40', 0.45],
    riverBank: ['#cbb184', 0.35],
  },
  woods: {
    meadow: ['#58823a', 0.7],
    dryGrass: ['#857e44', 0.6],
    lush: ['#4c7f32', 0.45],
    lushDeep: ['#3d6c2a', 0.45],
    pine: ['#2d5c2f', 0.35],
    pineDark: ['#244b27', 0.35],
    scrub: ['#4a7430', 0.45],
    scrubDark: ['#3c612a', 0.45],
  },
};

const hexRgb = (h: string): [number, number, number] => {
  const v = parseInt(h.replace('#', ''), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};
const rgbHex = (r: number, g: number, b: number): string => '#' + [r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('');

/** A colour mixed towards another by a share (in sRGB, as the palette is picked by eye). */
export function mixHex(a: string, b: string, k: number): string {
  const x = hexRgb(a);
  const y = hexRgb(b);
  return rgbHex(x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k);
}

/** The look's own colours, as they were before any land's were applied. */
let base: Record<string, string> | null = null;

/** A kind of land's colours over the look that is on: every palette entry, the kind's mixed in. */
export function landColours(kind: string): Record<Key, string> {
  const from = (base ?? { ...PAL }) as Record<Key, string>;
  const out = { ...from };
  for (const [k, [to, share]] of Object.entries(MIX[kind] ?? {}) as Array<[Key, [string, number]]>) out[k] = mixHex(from[k], to, share);
  return out;
}

/** Marsh ground: the deep green gone dark and wet, a little muddy. */
export const marshColour = (c: Record<Key, string>): string => mixHex(mixHex(c.lushDeep, '#4f5a38', 0.45), c.wetSand, 0.15);

/** Use a kind of land's colours from now on (once the look is set, before the world is built). */
export function applyLandPalette(kind: string): void {
  if (!base) base = { ...(PAL as unknown as Record<string, string>) };
  if (!MIX[kind]) return;
  Object.assign(PAL as unknown as Record<string, string>, landColours(kind));
}
