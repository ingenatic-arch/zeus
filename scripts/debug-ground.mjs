// Prints the map's buildable ground as text: . ok, : ok for roads only, ^ steep, ~ water, T trees.
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { coastMap } = await vite.ssrLoadModule('/src/map/bake.ts');
const { mapIndex } = await vite.ssrLoadModule('/src/sim/build.ts');
const map = coastMap();
const t0 = process.hrtime.bigint();
const ix = mapIndex(map);
console.log('index ms', Number(process.hrtime.bigint() - t0) / 1e6);
const ch = ['.', ':', '^', '~', ' '];
const counts = [0, 0, 0, 0, 0];
let out = '    ' + Array.from({ length: 128 }, (_, i) => (i % 10 === 0 ? String(i / 10 % 10) : ' ')).join('') + '\n';
for (let z = 0; z < 128; z++) {
  let line = String(z).padStart(3) + ' ';
  for (let x = 0; x < 128; x++) {
    const t = z * 128 + x;
    const g = ix.ground[t];
    counts[g]++;
    const tr = (ix.treesOn.get(t) ?? []).some((i) => map.trees[i].kind <= 2);
    line += g === 0 && tr ? 'T' : ch[g];
  }
  out += line + '\n';
}
console.log(out);
console.log('ok', counts[0], 'road only', counts[1], 'steep', counts[2], 'water', counts[3]);
await vite.close();
