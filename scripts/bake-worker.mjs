// A worker for the prepared towns (scripts/prepared.ts): plays the named
// demos' histories (scripts/bake.ts, loaded through Vite's module runner)
// and writes each town into the cache directory; with --list, writes the
// list of demos that have a history to prepare.
//   node scripts/bake-worker.mjs <cache dir> --list
//   node scripts/bake-worker.mjs <cache dir> <demo> <demo> ...
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runnerImport } from 'vite';

const [dir, ...names] = process.argv.slice(2);
const { module: m } = await runnerImport('/scripts/bake.ts', { root: resolve('.'), configFile: false, logLevel: 'error' });
mkdirSync(dir, { recursive: true });
const put = (file, text) => {
  // (Written to a temporary name and renamed, so nothing ever reads half a file.)
  const tmp = join(dir, `${file}.${process.pid}.tmp`);
  writeFileSync(tmp, text);
  renameSync(tmp, join(dir, file));
};
if (names[0] === '--list') put('names.json', JSON.stringify(m.PREPARABLE));
else
  for (const n of names) {
    const text = m.bake(n);
    if (text === null) put(`${n}.none`, '');
    else put(`${n}.save`, text);
  }
