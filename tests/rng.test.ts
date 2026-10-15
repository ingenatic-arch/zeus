import { describe, expect, it } from 'vitest';
import { nextFloat, nextU32, seedRng } from '../src/sim/rng';

describe('seeded random numbers', () => {
  it('gives the same sequence for the same seed', () => {
    const a = seedRng(42);
    const b = seedRng(42);
    const sa = Array.from({ length: 100 }, () => nextU32(a));
    const sb = Array.from({ length: 100 }, () => nextU32(b));
    expect(sa).toEqual(sb);
  });

  it('gives different sequences for nearby seeds', () => {
    const a = seedRng(1);
    const b = seedRng(2);
    const sa = Array.from({ length: 8 }, () => nextU32(a));
    const sb = Array.from({ length: 8 }, () => nextU32(b));
    expect(sa).not.toEqual(sb);
  });

  it('continues identically after a JSON round-trip of its state', () => {
    const a = seedRng(7);
    for (let i = 0; i < 50; i++) nextU32(a);
    const b = JSON.parse(JSON.stringify(a));
    expect(Array.from({ length: 20 }, () => nextU32(a))).toEqual(Array.from({ length: 20 }, () => nextU32(b)));
  });

  it('produces floats in [0, 1) with a sane spread', () => {
    const r = seedRng(99);
    let lo = 1;
    let hi = 0;
    let sum = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) {
      const f = nextFloat(r);
      lo = Math.min(lo, f);
      hi = Math.max(hi, f);
      sum += f;
    }
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(hi).toBeLessThan(1);
    expect(sum / n).toBeGreaterThan(0.48);
    expect(sum / n).toBeLessThan(0.52);
  });
});
