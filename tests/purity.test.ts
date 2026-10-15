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
  }
});
