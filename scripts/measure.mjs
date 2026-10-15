// Build first (npm run build). Records what can be measured headless:
// bundle size, local load time, triangles and draw calls per view.
// Frame time under headless software rendering is NOT representative of a
// real laptop GPU; it is printed only as a note.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { launch } from './browser.mjs';
import { serveDist } from './serve-dist.mjs';

const dist = resolve('dist');
const files = [];
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
};
walk(dist);
let raw = 0;
let gz = 0;
for (const f of files) {
  const b = readFileSync(f);
  raw += b.length;
  gz += gzipSync(b).length;
}
console.log(`bundle: ${files.length} files, ${(raw / 1024).toFixed(0)} KB raw, ${(gz / 1024).toFixed(0)} KB gzipped`);

const { server, url } = await serveDist(dist);
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const t0 = Date.now();
await page.goto(url + '?cam=coast&speed=paused&shot=1');
await page.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
const tReady = Date.now() - t0;
await page.waitForFunction(() => window.__zeus.frames > 1, null, { timeout: 120000 });
const tFirstFrames = Date.now() - t0;
const probe = await page.evaluate(() => ({ bake: window.__zeus.bakeMs, start: window.__zeus.startMs }));
console.log(`load (local, headless): ready in ${tReady} ms, two frames drawn by ${tFirstFrames} ms; coast bake ${probe.bake.toFixed(0)} ms, scene build total ${probe.start.toFixed(0)} ms`);

for (const cam of ['coast', 'overview', 'river', 'street', 'bay']) {
  await page.evaluate((c) => window.__zeus.setView(c), cam);
  const f = await page.evaluate(() => window.__zeus.frames);
  await page.waitForFunction((f0) => window.__zeus.frames > f0 + 3, f, { timeout: 120000 });
  const info = await page.evaluate(() => window.__zeus.info());
  const fps = await page.evaluate(
    () =>
      new Promise((res) => {
        const f0 = window.__zeus.frames;
        const s = performance.now();
        setTimeout(() => res(((window.__zeus.frames - f0) * 1000) / (performance.now() - s)), 2000);
      }),
  );
  console.log(
    `view ${cam.padEnd(9)} triangles ${String(info.triangles).padStart(8)}  draw calls ${String(info.calls).padStart(3)}  (headless software fps ${fps.toFixed(1)}, not representative)`,
  );
}
for (const m of await page.evaluate(() => window.__zeus.meshes()))
  console.log(`  mesh ${m.name.padEnd(22)} instances ${String(m.count).padStart(5)}  triangles ${String(m.triangles).padStart(7)}${m.shadow ? '  casts shadow' : ''}`);
const mem = await page.evaluate(() => window.__zeus.info());
console.log(`gpu objects: ${mem.geometries} geometries, ${mem.textures} textures`);
await browser.close();
server.close();
