/**
 * Seeded random numbers for the simulation (sfc32).
 * The whole generator state is four unsigned 32-bit numbers, kept as plain
 * data inside the sim state so it serialises, saves and replays exactly.
 * Never use Math.random in sim or map code.
 */
export type RngState = [number, number, number, number];

/** Expand a 32-bit seed into a well-mixed generator state (splitmix32). */
export function seedRng(seed: number): RngState {
  let s = seed >>> 0;
  const next = (): number => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return (z ^ (z >>> 16)) >>> 0;
  };
  const state: RngState = [next(), next(), next(), next()];
  // Warm up so nearby seeds diverge immediately.
  for (let i = 0; i < 12; i++) nextU32(state);
  return state;
}

/** Next unsigned 32-bit integer; advances the state in place. */
export function nextU32(st: RngState): number {
  let [a, b, c, d] = st;
  const t = (((a + b) >>> 0) + d) >>> 0;
  d = (d + 1) >>> 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) >>> 0;
  c = ((c << 21) | (c >>> 11)) >>> 0;
  c = (c + t) >>> 0;
  st[0] = a >>> 0;
  st[1] = b;
  st[2] = c;
  st[3] = d;
  return t;
}

/** Uniform float in [0, 1). */
export function nextFloat(st: RngState): number {
  return nextU32(st) / 4294967296;
}

/** Uniform float in [lo, hi). */
export function nextRange(st: RngState, lo: number, hi: number): number {
  return lo + (hi - lo) * nextFloat(st);
}

/** Uniform integer in [0, n). */
export function nextInt(st: RngState, n: number): number {
  return Math.floor(nextFloat(st) * n);
}

/** A small convenience wrapper for code that owns its own generator (map baking). */
export class Rng {
  readonly state: RngState;
  constructor(seed: number) {
    this.state = seedRng(seed);
  }
  float(): number {
    return nextFloat(this.state);
  }
  range(lo: number, hi: number): number {
    return nextRange(this.state, lo, hi);
  }
  int(n: number): number {
    return nextInt(this.state, n);
  }
}
