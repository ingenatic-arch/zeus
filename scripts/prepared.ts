/**
 * Prepared towns (slice 22): every demo with a history is played once, in
 * Node, when the game is built, and kept as a save in the browser's own save
 * format. The page opens a demo by decoding its prepared town instead of
 * playing the history (seconds of ticks) while the player waits.
 *
 * - `virtual:prepared` is a small map from each demo's name to a loader of
 *   its prepared town; each town is its own chunk, fetched only when that
 *   demo is opened, so the bare link's bundle doesn't grow. Identical towns
 *   (twelve demos share #town's) are one chunk.
 * - Every prepared town is checked (scripts/bake.ts): decoded, it must be
 *   exactly the state its setup made, or the demo is left to play its setup
 *   in the page, as before.
 * - Towns are cached under node_modules/.cache/zeus-prepared by a hash of the
 *   sources they come from, so a rebuild that changes none of them is quick;
 *   the tests read and fill the same cache (tests/prepared.ts). Missing towns
 *   are played by a few worker processes at once (scripts/bake-worker.mjs).
 * - In `vite` (dev) each demo is prepared when it is first opened.
 *
 * This file is loaded with the Vite config, so it imports nothing of the
 * game itself: the workers load that through Vite's module runner.
 */
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { join, relative, resolve } from 'node:path';
import type { Plugin } from 'vite';

// (Every script, the build and the tests run from the project's root.)
const ROOT = resolve('.');
/** What a prepared town is made from: if none of these change, neither does the town. */
const SOURCES = ['src/sim', 'src/map', 'src/game', 'scripts/bake.ts', 'scripts/bake-worker.mjs'];
const CACHE = join(ROOT, 'node_modules', '.cache', 'zeus-prepared');
const WORKER = join(ROOT, 'scripts', 'bake-worker.mjs');

const MANIFEST = 'virtual:prepared';
const TOWN = 'virtual:prepared/';

let sourceHash = '';
/** A hash of every source a prepared town comes from (worked out once a run). */
export function sourcesHash(): string {
  if (sourceHash) return sourceHash;
  const h = createHash('sha1');
  const files: string[] = [];
  const walk = (p: string): void => {
    if (statSync(p).isDirectory()) for (const f of readdirSync(p).sort()) walk(join(p, f));
    else files.push(p);
  };
  for (const s of SOURCES) if (existsSync(join(ROOT, s))) walk(join(ROOT, s));
  for (const f of files) {
    h.update(relative(ROOT, f));
    h.update('\0');
    h.update(readFileSync(f));
    h.update('\0');
  }
  sourceHash = h.digest('hex').slice(0, 16);
  return sourceHash;
}

/** Where this version of the sources' towns are kept. */
export const cacheDir = (): string => join(CACHE, sourcesHash());

/** A demo's prepared town from the cache: its save text, null if it can't be prepared, undefined if not prepared yet. */
export function cached(name: string): string | null | undefined {
  const dir = cacheDir();
  if (existsSync(join(dir, `${name}.save`))) return readFileSync(join(dir, `${name}.save`), 'utf8');
  if (existsSync(join(dir, `${name}.none`))) return null;
  return undefined;
}

/** Keep a demo's prepared town (or that it can't be prepared) in the cache. */
export function keep(name: string, text: string | null): void {
  const dir = cacheDir();
  mkdirSync(dir, { recursive: true });
  // (Written to a temporary name and renamed, so a test worker never reads half a file.)
  const tmp = join(dir, `${name}.${process.pid}.${createHash('sha1').update(`${name}${process.hrtime.bigint()}`).digest('hex').slice(0, 8)}.tmp`);
  writeFileSync(tmp, text ?? '');
  renameSync(tmp, join(dir, `${name}.${text === null ? 'none' : 'save'}`));
}

const work = (args: string[]): Promise<void> =>
  new Promise((done, fail) => {
    execFile(process.execPath, [WORKER, cacheDir(), ...args], { cwd: ROOT, maxBuffer: 1 << 24 }, (e, _out, err) => (e ? fail(new Error(`${e.message}\n${err}`)) : done()));
  });

/** The demos with a history to prepare. */
async function preparable(): Promise<string[]> {
  const file = join(cacheDir(), 'names.json');
  if (!existsSync(file)) await work(['--list']);
  return JSON.parse(readFileSync(file, 'utf8')) as string[];
}

/** Every demo's prepared town, playing any not in the cache (a few at once); how many were played. */
async function prepareAll(names: string[]): Promise<number> {
  const missing = names.filter((n) => cached(n) === undefined);
  if (!missing.length) return 0;
  const n = Math.max(1, Math.min(4, availableParallelism() - 1, missing.length));
  const shares: string[][] = Array.from({ length: n }, () => []);
  missing.forEach((m, i) => shares[i % n].push(m));
  await Promise.all(shares.map((s) => work(s)));
  return missing.length;
}

/** Drop cached towns made from older sources. */
function prune(): void {
  if (!existsSync(CACHE)) return;
  for (const d of readdirSync(CACHE)) if (d !== sourcesHash()) rmSync(join(CACHE, d), { recursive: true, force: true });
}

const keyOf = (text: string): string => createHash('sha1').update(text).digest('hex').slice(0, 12);

export function prepared(): Plugin {
  let build = false;
  /** In a build: each key's town. */
  const towns = new Map<string, string>();
  return {
    name: 'zeus-prepared',
    configResolved(c) {
      build = c.command === 'build';
    },
    resolveId(id) {
      if (id === MANIFEST || id.startsWith(TOWN)) return '\0' + id;
      return null;
    },
    async load(id) {
      if (id === '\0' + MANIFEST) {
        const names = await preparable();
        if (!build) {
          // Dev: every demo listed, each prepared when it is opened.
          const rows = names.map((n) => `  ${JSON.stringify(n)}: () => import(${JSON.stringify(TOWN + n)}),`);
          return `export const PREPARED = {\n${rows.join('\n')}\n};\n`;
        }
        prune();
        const t0 = Date.now();
        const made = await prepareAll(names);
        const rows: string[] = [];
        for (const n of names) {
          const text = cached(n);
          if (!text) {
            this.warn(`#${n} couldn't be prepared faithfully: the page will play its setup`);
            continue;
          }
          const k = keyOf(text);
          towns.set(k, text);
          rows.push(`  ${JSON.stringify(n)}: () => import(${JSON.stringify(TOWN + k)}),`);
        }
        if (made) console.log(`prepared ${made} demo towns in ${((Date.now() - t0) / 1000).toFixed(1)} s (${towns.size} distinct; cached in ${relative(ROOT, cacheDir())})`);
        return `export const PREPARED = {\n${rows.join('\n')}\n};\n`;
      }
      if (id.startsWith('\0' + TOWN)) {
        const k = id.slice(1 + TOWN.length);
        let text: string | null | undefined = build ? towns.get(k) : cached(k);
        if (!build && text === undefined) {
          await work([k]);
          text = cached(k);
        }
        return `export default ${JSON.stringify(text ?? null)};\n`;
      }
      return null;
    },
  };
}
