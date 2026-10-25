// Draws the baked coast as a top-down picture (screenshots/map.ppm) for checking shapes.
import { createServer } from 'vite';
import { writeFileSync } from 'node:fs';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { bakeCoast, FIELD_MIN, TreeKind } = await vite.ssrLoadModule('/src/map/bake.ts');
const t0 = process.hrtime.bigint();
const map = bakeCoast();
console.log('bake ms', Number(process.hrtime.bigint() - t0) / 1e6, 'trees', map.trees.length);
const counts = {};
for (const t of map.trees) counts[TreeKind[t.kind]] = (counts[TreeKind[t.kind]] ?? 0) + 1;
console.log(counts);
const S = 3; // pixels per unit
const lo = -40, hi = 168;
const W = (hi - lo) * S;
const buf = Buffer.alloc(W * W * 3);
for (let py = 0; py < W; py++) {
  for (let px = 0; px < W; px++) {
    const x = lo + px / S, z = lo + py / S;
    const h = map.heightAt(x, z);
    const f = map.sample(map.fertility, x, z);
    const rk = map.sample(map.rock, x, z);
    const shade = Math.max(0.4, Math.min(1.3, 1 + (map.heightAt(x - 0.5, z - 0.5) - map.heightAt(x + 0.5, z + 0.5)) * 0.8));
    let c;
    const q = map.riverAt(x, z);
    if (q.d < q.width && q.surface > 0.03) c = [60, 150, 200];
    else if (h < 0) c = [30 + 40 * Math.exp(h), 90 + 100 * Math.exp(h), 150 + 60 * Math.exp(h)];
    else if (h < 0.4) c = [230, 210, 160];
    else c = [150 + 60 * rk - 60 * f, 160 + 30 * f - 10 * rk, 90 - 30 * f + 50 * rk].map((v) => v + h * 4);
    if (h >= 0) c = c.map((v) => v * shade);
    const inMap = x >= 0 && x <= 128 && z >= 0 && z <= 128;
    if (!inMap) c = c.map((v) => v * 0.8);
    if (Math.abs(x % 16) < 1 / S || Math.abs(z % 16) < 1 / S) c = c.map((v) => v * 0.85);
    const o = (py * W + px) * 3;
    buf[o] = Math.max(0, Math.min(255, c[0]));
    buf[o + 1] = Math.max(0, Math.min(255, c[1]));
    buf[o + 2] = Math.max(0, Math.min(255, c[2]));
  }
}
const COL = { 0: [90, 110, 40], 1: [20, 70, 20], 2: [10, 40, 10], 3: [120, 130, 60], 4: [230, 200, 30], 5: [140, 130, 120], 6: [160, 170, 90], 7: [220, 120, 170] };
for (const t of map.trees) {
  const px = Math.round((t.x - lo) * S), py = Math.round((t.z - lo) * S);
  if (px < 0 || py < 0 || px >= W || py >= W) continue;
  const o = (py * W + px) * 3;
  buf.set(COL[t.kind], o);
}
writeFileSync('screenshots/map.ppm', Buffer.concat([Buffer.from(`P6 ${W} ${W} 255\n`), buf]));
// River profile.
const r = map.river;
const prof = [];
for (let i = 0; i < r.xs.length; i += 10) prof.push(`${r.dist[i].toFixed(0)}:${r.surface[i].toFixed(2)}`);
console.log('river len', r.length.toFixed(1), prof.join(' '));
await vite.close();
