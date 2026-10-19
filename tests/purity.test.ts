import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Sim and map code must be deterministic: no hidden randomness or wall clock.
const FORBIDDEN = [/Math\.random/, /\bDate\b/, /\bperformance\b/, /setTimeout|setInterval|requestAnimationFrame/];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('sim purity', () => {
  for (const dir of ['src/sim', 'src/map']) {
    it(`${dir} uses no Math.random, Date, performance or timers`, () => {
      const offenders: string[] = [];
      for (const f of files(dir)) {
        const src = readFileSync(f, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/gm, '');
        for (const re of FORBIDDEN) if (re.test(src)) offenders.push(`${f}: ${re}`);
      }
      expect(offenders).toEqual([]);
    });
    // Engines differ in the last digit of these (Node 22 and Chromium 141 do, for sin, cos and pow), so a town
    // played in one browser would drift from the same town played in another: the sim uses src/map/dmath.ts.
    it(`${dir} leaves no sums to the engine's own maths library`, () => {
      const offenders: string[] = [];
      for (const f of files(dir)) {
        if (f.endsWith('dmath.ts')) continue;
        const src = readFileSync(f, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/gm, '');
        const m = src.match(/Math\.(sin|cos|tan|pow|exp|log|log2|log10|log1p|expm1|atan|atan2|asin|acos|sinh|cosh|tanh|cbrt|hypot)\b|\*\*/g);
        if (m) offenders.push(`${f}: ${[...new Set(m)].join(' ')}`);
      }
      expect(offenders).toEqual([]);
    });
  }
});

describe('the same sums everywhere', () => {
  // Fixed fingerprints of dmath's answers over a spread of arguments: they must never change, in any engine or
  // Node version (when they were taken, under Node 22, dsin, dcos, datan2, dexp and dhypot gave exactly Math's answers).
  it('dmath gives the same answers it always has', async () => {
    const { createHash } = await import('node:crypto');
    const { datan2, dcos, dexp, dhypot, dpow, dsin } = await import('../src/map/dmath');
    let s = 2024;
    const rnd = (): number => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    const n = 5000;
    const out: Record<string, Float64Array> = {};
    for (const k of ['sin', 'cos', 'atan2', 'exp', 'hypot', 'pow']) out[k] = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const a = (rnd() - 0.5) * 60;
      const b = (rnd() - 0.5) * 60;
      out.sin[i] = dsin(a);
      out.cos[i] = dcos(a);
      out.atan2[i] = datan2(a, b);
      out.exp[i] = dexp(a / 4);
      out.hypot[i] = dhypot(a, b);
      out.pow[i] = dpow(rnd() * 3, (rnd() - 0.3) * 30);
    }
    const prints = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, createHash('sha1').update(new Uint8Array(v.buffer)).digest('hex').slice(0, 12)]));
    expect(prints).toEqual(PRINTS);
    // And they are the right answers, near enough.
    expect(Math.abs(dsin(1) - 0.8414709848078965)).toBeLessThan(1e-16);
    expect(Math.abs(dpow(2, 0.5) - Math.SQRT2)).toBeLessThan(1e-16);
    expect(Math.abs(dpow(0.99, 150) / Math.pow(0.99, 150) - 1)).toBeLessThan(1e-15);
  });
});

const PRINTS = {
  sin: '889e29b9f82d',
  cos: '78fd79a2a17e',
  atan2: 'f94c8db9c121',
  exp: '48ca2461c2da',
  hypot: 'cb7344e49bb9',
  pow: '158c02c6fe3a',
};
