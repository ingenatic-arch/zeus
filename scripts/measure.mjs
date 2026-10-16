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
const probe = await page.evaluate(() => ({ bake: window.__zeus.bakeMs, start: window.__zeus.startMs, readyAt: window.__zeus.readyAt, firstFrameAt: window.__zeus.firstFrameAt }));
// The page's own clock: when the game was ready and drew its first frame. Playwright only sees "ready"
// at its next poll, after the first frames under software rendering (about a second each), so its
// figure runs 1-2 s later than the game's own.
console.log(
  `load (local, headless): ready at ${probe.readyAt.toFixed(0)} ms and first frame drawn at ${probe.firstFrameAt.toFixed(0)} ms by the page's clock (Playwright saw ready at ${tReady} ms, two frames by ${tFirstFrames} ms); coast bake ${probe.bake.toFixed(0)} ms, scene build total ${probe.start.toFixed(0)} ms`,
);

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
// Meshes by kind (chunked meshes summed: "trees-Olive-12345" -> "trees-Olive").
const summarise = async () => {
  const kinds = new Map();
  for (const m of await page.evaluate(() => window.__zeus.meshes())) {
    const k = m.name.replace(/-\d+$/, '');
    const e = kinds.get(k) ?? { chunks: 0, count: 0, triangles: 0, shadow: m.shadow };
    e.chunks++;
    e.count += m.count;
    e.triangles += m.triangles;
    kinds.set(k, e);
  }
  for (const [k, m] of kinds)
    console.log(`  mesh ${k.padEnd(22)} chunks ${String(m.chunks).padStart(3)}  instances ${String(m.count).padStart(5)}  triangles ${String(m.triangles).padStart(7)}${m.shadow ? '  casts shadow' : ''}`);
};
await summarise();

// The prepared neighbourhood (slice 2): roads, plots, tents and settlers.
await page.goto('about:blank');
const t1 = Date.now();
await page.goto(url + '#streets-paused-shot');
await page.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
console.log(`load #streets (local, headless): ready in ${Date.now() - t1} ms`);
for (const cam of ['streets', 'settlers', 'overview']) {
  await page.evaluate((c) => window.__zeus.setView(c), cam);
  const f = await page.evaluate(() => window.__zeus.frames);
  await page.waitForFunction((f0) => window.__zeus.frames > f0 + 3, f, { timeout: 120000 });
  const info = await page.evaluate(() => window.__zeus.info());
  console.log(`#streets view ${cam.padEnd(9)} triangles ${String(info.triangles).padStart(8)}  draw calls ${String(info.calls).padStart(3)}`);
}
console.log(`  city: ${JSON.stringify(await page.evaluate(() => window.__zeus.city()))}`);
await summarise();

// The watered neighbourhood (slice 3): fountain, carrier, huts, and the water overlay.
await page.goto('about:blank');
const t2 = Date.now();
await page.goto(url + '#water-paused-shot');
await page.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
console.log(`load #water (local, headless): ready in ${Date.now() - t2} ms`);
for (const [cam, overlay] of [['water', false], ['water', true], ['carrier', false], ['overview', false]]) {
  await page.evaluate((c) => window.__zeus.setView(c), cam);
  const on = await page.evaluate(() => window.__zeus.city().overlay);
  if (on !== overlay) await page.keyboard.press('o');
  const f = await page.evaluate(() => window.__zeus.frames);
  await page.waitForFunction((f0) => window.__zeus.frames > f0 + 3, f, { timeout: 120000 });
  const info = await page.evaluate(() => window.__zeus.info());
  console.log(`#water view ${(cam + (overlay ? '+overlay' : '')).padEnd(16)} triangles ${String(info.triangles).padStart(8)}  draw calls ${String(info.calls).padStart(3)}`);
}
console.log(`  city: ${JSON.stringify(await page.evaluate(() => window.__zeus.city()))}`);
await summarise();

// The fed town (slice 4): farms, granary, agora, cottages, carts, porter and vendor, and the food overlay.
await page.goto('about:blank');
const t3 = Date.now();
await page.goto(url + '#food-paused-shot');
await page.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
console.log(`load #food (local, headless): ready in ${Date.now() - t3} ms`);
for (const [cam, overlay] of [['food', false], ['food', true], ['vendor', false], ['harvest', false], ['chain', false], ['overview', false]]) {
  await page.evaluate((c) => window.__zeus.setView(c), cam);
  const on = await page.evaluate(() => window.__zeus.city().overlay);
  if (on !== overlay) await page.keyboard.press('l');
  const f = await page.evaluate(() => window.__zeus.frames);
  await page.waitForFunction((f0) => window.__zeus.frames > f0 + 3, f, { timeout: 120000 });
  const info = await page.evaluate(() => window.__zeus.info());
  console.log(`#food view ${(cam + (overlay ? '+overlay' : '')).padEnd(16)} triangles ${String(info.triangles).padStart(8)}  draw calls ${String(info.calls).padStart(3)}`);
}
console.log(`  city: ${JSON.stringify(await page.evaluate(() => window.__zeus.city()))}`);
await summarise();
const mem = await page.evaluate(() => window.__zeus.info());
console.log(`gpu objects: ${mem.geometries} geometries, ${mem.textures} textures`);
await browser.close();
server.close();
