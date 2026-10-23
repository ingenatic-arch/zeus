/**
 * The order the sim's modules load in (review of slice 39). The sim's modules
 * import each other in cycles, so which one is evaluated first depends on
 * where the import graph is entered. A module-level constant worked out from
 * another module's exports (routes.ts's jetty margin, from trade.ts's) then
 * comes out NaN or undefined whenever its source has not been evaluated yet,
 * and quietly changes how the town plays. This enters the graph at every
 * sim and map module in turn and checks that no exported number, and no
 * number or entry in an exported list or table, is NaN or missing.
 *
 * A constant private to its module is out of its sight: one worked out from
 * another module's exports belongs inside a function, as routes.ts's is now,
 * or exported, so this sees it. (When this was written, every such private
 * constant was checked once by exporting it: only routes.ts's went wrong,
 * loaded after trade.ts or world.ts. At the merge with slice 38, its new
 * module blockades.ts is entered like every other, and every private
 * constant slice 38 added (in blockades.ts, fleet.ts, raids.ts, rounds.ts
 * and trade.ts) is a plain number or worked out from clock.ts, which
 * imports nothing, so none can come out wrong. At the merge with slice 36,
 * its new module estates.ts is entered too, and every private constant
 * slice 36 added (in army.ts, battle.ts, estates.ts, status.ts, stores.ts
 * and world.ts) is a plain number or table, worked out from clock.ts, or
 * keyed by foods.ts's wares (foods.ts imports nothing but types), so none
 * can come out wrong either.)
 */
import { readdirSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const DIRS = ['src/sim', 'src/map'];
const MODULES = DIRS.flatMap((d) => readdirSync(d).filter((f) => f.endsWith('.ts')).map((f) => `../${d}/${f.replace(/\.ts$/, '')}`));

/** What is wrong with an export, if anything: a NaN number, or a list or table with a NaN or undefined in it (one level deep). */
function problem(v: unknown): string {
  if (typeof v === 'number') return Number.isNaN(v) ? 'NaN' : '';
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) {
      if (v[i] === undefined) return `[${i}] undefined`;
      if (typeof v[i] === 'number' && Number.isNaN(v[i])) return `[${i}] NaN`;
    }
    return '';
  }
  if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
    for (const [k, x] of Object.entries(v)) {
      if (x === undefined) return `.${k} undefined`;
      if (typeof x === 'number' && Number.isNaN(x)) return `.${k} NaN`;
      if (x && typeof x === 'object' && Object.getPrototypeOf(x) === Object.prototype) {
        for (const [k2, y] of Object.entries(x)) if (typeof y === 'number' && Number.isNaN(y)) return `.${k}.${k2} NaN`;
      }
    }
  }
  return '';
}

describe('the order the sim’s modules load in', () => {
  it('whichever module is loaded first, every exported constant is worked out', async () => {
    // (Every module in the two folders, slice 38's blockades.ts, slice 39's ambitions.ts and laurels.ts and slice 36's estates.ts among them.)
    for (const m of ['sim/blockades', 'sim/ambitions', 'sim/laurels', 'sim/estates']) expect(MODULES).toContain(`../src/${m}`);
    const bad: string[] = [];
    for (const first of MODULES) {
      vi.resetModules();
      await import(/* @vite-ignore */ first);
      for (const m of MODULES) {
        const mod = (await import(/* @vite-ignore */ m)) as Record<string, unknown>;
        for (const [name, v] of Object.entries(mod)) {
          const p = problem(v);
          if (p) bad.push(`${m.slice(3)}.${name}${p === 'NaN' ? ' is NaN' : `${p}`} (loaded ${first.slice(3)} first)`);
        }
      }
    }
    expect(bad).toEqual([]);
  }, 600000);
});
