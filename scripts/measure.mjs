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
  // L cycles every overlay before off (food, variety, oil, fleece, wine): press it until the overlay is as wanted.
  for (let i = 0; i < 8 && (await page.evaluate(() => window.__zeus.city().overlay)) !== overlay; i++) await page.keyboard.press('l');
  const f = await page.evaluate(() => window.__zeus.frames);
  await page.waitForFunction((f0) => window.__zeus.frames > f0 + 3, f, { timeout: 120000 });
  const info = await page.evaluate(() => window.__zeus.info());
  console.log(`#food view ${(cam + (overlay ? '+overlay' : '')).padEnd(16)} triangles ${String(info.triangles).padStart(8)}  draw calls ${String(info.calls).padStart(3)}`);
}
console.log(`  city: ${JSON.stringify(await page.evaluate(() => window.__zeus.city()))}`);
await summarise();
// The people who live there (slice 5): a street cut off and warning, signs, the panel, the what's-missing overlay.
await page.goto('about:blank');
const t4 = Date.now();
await page.goto(url + '#warning-paused-shot');
await page.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
console.log(`load #warning (local, headless): ready in ${Date.now() - t4} ms`);
for (const [cam, overlay] of [['warning', false], ['warning', true], ['decline', false], ['people', false], ['missing', true], ['overview', true]]) {
  await page.evaluate((c) => window.__zeus.setView(c), cam);
  const on = await page.evaluate(() => window.__zeus.city().overlay);
  if (on !== overlay) await page.keyboard.press('i');
  const f = await page.evaluate(() => window.__zeus.frames);
  await page.waitForFunction((f0) => window.__zeus.frames > f0 + 3, f, { timeout: 120000 });
  const info = await page.evaluate(() => window.__zeus.info());
  console.log(`#warning view ${(cam + (overlay ? '+missing' : '')).padEnd(16)} triangles ${String(info.triangles).padStart(8)}  draw calls ${String(info.calls).padStart(3)}`);
}
console.log(`  city: ${JSON.stringify(await page.evaluate(() => window.__zeus.city()))}`);
await summarise();

// Shrine and theatre (slice 6): the fine-house district, the theatre, the closed town's wide signs.
await page.goto('about:blank');
const t5 = Date.now();
await page.goto(url + '#fine-paused-shot');
await page.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
console.log(`load #fine (local, headless): ready in ${Date.now() - t5} ms`);
for (const [cam, overlay] of [['fine', false], ['fine', true], ['compare', false], ['theatre', false], ['shrine', false], ['overview', false]]) {
  await page.evaluate((c) => window.__zeus.setView(c), cam);
  const on = await page.evaluate(() => window.__zeus.city().overlay);
  if (on !== overlay) await page.keyboard.press('i');
  const f = await page.evaluate(() => window.__zeus.frames);
  await page.waitForFunction((f0) => window.__zeus.frames > f0 + 3, f, { timeout: 120000 });
  const info = await page.evaluate(() => window.__zeus.info());
  console.log(`#fine view ${(cam + (overlay ? '+missing' : '')).padEnd(16)} triangles ${String(info.triangles).padStart(8)}  draw calls ${String(info.calls).padStart(3)}`);
}
console.log(`  city: ${JSON.stringify(await page.evaluate(() => window.__zeus.city()))}`);
await summarise();
await page.goto('about:blank');
await page.goto(url + '#closed-paused-shot');
await page.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
for (const cam of ['closed', 'overview']) {
  await page.evaluate((c) => window.__zeus.setView(c), cam);
  const f = await page.evaluate(() => window.__zeus.frames);
  await page.waitForFunction((f0) => window.__zeus.frames > f0 + 3, f, { timeout: 120000 });
  const info = await page.evaluate(() => window.__zeus.info());
  console.log(`#closed view ${cam.padEnd(14)} triangles ${String(info.triangles).padStart(8)}  draw calls ${String(info.calls).padStart(3)}`);
}

// #town: the prepared town of a few hundred people, every house level and building.
{
  const t = Date.now();
  await page.goto('about:blank');
  await page.goto(url + '#town-paused-shot');
  await page.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
  await page.waitForFunction(() => window.__zeus.frames > 0, null, { timeout: 120000 });
  const tp = await page.evaluate(() => ({ setup: window.__zeus.setupMs, start: window.__zeus.startMs, ready: window.__zeus.readyAt, first: window.__zeus.firstFrameAt }));
  // The page's own clock; Playwright's figure includes its polling and the first slow software-rendered frames.
  console.log(
    `#town by the page's clock: two years of setup ticks ${tp.setup.toFixed(0)} ms, scene start ${tp.start.toFixed(0)} ms in all, ready at ${tp.ready.toFixed(0)} ms, first frame at ${tp.first.toFixed(0)} ms (Playwright saw ready after ${Date.now() - t} ms)`,
  );
  for (const cam of ['town', 'townstreet', 'overview']) {
    await page.evaluate((c) => window.__zeus.setView(c), cam);
    const f = await page.evaluate(() => window.__zeus.frames);
    await page.waitForFunction((f0) => window.__zeus.frames > f0 + 3, f, { timeout: 120000 });
    const info = await page.evaluate(() => window.__zeus.info());
    console.log(`#town view ${cam.padEnd(16)} triangles ${String(info.triangles).padStart(8)}  draw calls ${String(info.calls).padStart(3)}`);
  }
  const c = await page.evaluate(() => window.__zeus.city());
  console.log(`  town: ${c.population} people, ${c.homes} homes, ${c.walkers} walkers, buildings ${c.homes + c.fountains + c.farms + c.granaries + c.agoras + c.shrines + c.theatres}`);
  await summarise();
  // How big a save of it is.
  const size = await page.evaluate(() => {
    window.__zeus.saveNow();
    let n = 0;
    try {
      n = (localStorage.getItem('zeus-remake.save.manual') ?? '').length;
      localStorage.clear();
    } catch {
      /* no storage */
    }
    return n;
  });
  console.log(`  a save of #town: ${(size / 1024).toFixed(0)} KB`);
}

// #richtown (slice 14): the prepared richer town for judging the budgets: load, triangles and draws from its views, people, walkers, a save.
{
  const t = Date.now();
  await page.goto('about:blank');
  await page.goto(url + '#richtown-paused-shot');
  await page.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
  await page.waitForFunction(() => window.__zeus.frames > 0, null, { timeout: 120000 });
  const tp = await page.evaluate(() => ({ setup: window.__zeus.setupMs, start: window.__zeus.startMs, ready: window.__zeus.readyAt, first: window.__zeus.firstFrameAt }));
  console.log(
    `#richtown by the page's clock: setup ticks ${tp.setup.toFixed(0)} ms, scene start ${tp.start.toFixed(0)} ms in all, ready at ${tp.ready.toFixed(0)} ms, first frame at ${tp.first.toFixed(0)} ms (Playwright saw ready after ${Date.now() - t} ms)`,
  );
  for (const cam of ['richtown', 'richstreet', 'town', 'overview']) {
    await page.evaluate((c) => window.__zeus.setView(c), cam);
    const f = await page.evaluate(() => window.__zeus.frames);
    await page.waitForFunction((f0) => window.__zeus.frames > f0 + 3, f, { timeout: 120000 });
    const info = await page.evaluate(() => window.__zeus.info());
    console.log(`#richtown view ${cam.padEnd(13)} triangles ${String(info.triangles).padStart(8)}  draw calls ${String(info.calls).padStart(3)}`);
  }
  const c = await page.evaluate(() => window.__zeus.city());
  console.log(`  richtown: ${c.population} people, ${c.homes} homes (${c.villas} villas, ${c.fine} fine houses), ${c.walkers} walkers, ${c.buildings} buildings`);
  const size = await page.evaluate(() => {
    window.__zeus.saveNow();
    let n = 0;
    try {
      n = (localStorage.getItem('zeus-remake.save.manual') ?? '').length;
      localStorage.clear();
    } catch {
      /* no storage */
    }
    return n;
  });
  console.log(`  a save of #richtown: ${(size / 1024).toFixed(0)} KB`);
}

// Slices 11 and 12: the villas and the winery; fire, smoke and rubble on #town's east street (marks, puffs and flames are capped instanced meshes).
for (const [hash, views] of [
  ['#villas-paused-shot', ['villas', 'overview']],
  ['#winery-paused-shot', [null]],
  ['#fire-paused-shot', ['east', 'town']],
  ['#blaze-paused-shot', ['east', 'town']],
  ['#rubble-paused-shot', ['east']],
  ['#creak-paused-shot', ['east']],
  ['#watchman-paused-shot', [null]],
  // Slice 13: the trading post and its quay, the ship far out and tied up.
  ['#quay-paused-shot', ['quay', 'overview']],
  ['#sail-paused-shot', ['sail']],
  ['#ship-paused-shot', ['ship', 'town']],
]) {
  const t = Date.now();
  await page.goto('about:blank');
  await page.goto(url + hash);
  await page.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
  await page.waitForFunction(() => window.__zeus.frames > 0, null, { timeout: 120000 });
  const tp = await page.evaluate(() => ({ setup: window.__zeus.setupMs, ready: window.__zeus.readyAt }));
  console.log(`load ${hash}: setup ${tp.setup.toFixed(0)} ms, ready at ${tp.ready.toFixed(0)} ms by the page's clock (Playwright saw ready after ${Date.now() - t} ms)`);
  for (const cam of views) {
    if (cam) await page.evaluate((c) => window.__zeus.setView(c), cam);
    const f = await page.evaluate(() => window.__zeus.frames);
    await page.waitForFunction((f0) => window.__zeus.frames > f0 + 3, f, { timeout: 120000 });
    const info = await page.evaluate(() => window.__zeus.info());
    const c = await page.evaluate(() => window.__zeus.city());
    const trade = c.tradingPosts ? ` · on the quay ${c.onQuay}, dockers ${c.dockers}, ship ${(await page.evaluate(() => window.__zeus.ship())).version}` : '';
    console.log(
      `${hash.replace(/-.*$/, '')} view ${(cam ?? 'demo').padEnd(10)} triangles ${String(info.triangles).padStart(8)}  draw calls ${String(info.calls).padStart(3)}  · marks ${c.hazardMarks}, smoke puffs ${c.smokePuffs}, flames ${c.flames} · smoulders ${c.smoulders}, fires ${c.fires}, creaks ${c.creaks}, rubble ${c.rubble}${trade}`,
    );
  }
}

// Slice 15: the map of Greece, built the first time it is opened (its code is a separate file, fetched then).
{
  await page.goto('about:blank');
  await page.goto(url + '#town-paused-shot');
  await page.waitForFunction(() => window.__zeus?.ready === true && window.__zeus.frames > 2, null, { timeout: 120000 });
  const t = Date.now();
  await page.keyboard.press('Tab');
  await page.waitForFunction(() => window.__zeus.greeceOpenMs !== undefined, null, { timeout: 120000 });
  const g = await page.evaluate(() => ({ build: window.__zeus.greeceBuildMs, open: window.__zeus.greeceOpenMs }));
  console.log(`map of Greece, first opened from #town: built in ${g.build.toFixed(0)} ms (code fetch and scene), first map frame ${g.open.toFixed(0)} ms after the key by the page's clock (Playwright saw it after ${Date.now() - t} ms)`);
  for (const hash of ['#greece-paused-shot', '#greecesail-paused-shot']) {
    await page.goto('about:blank');
    await page.goto(url + hash);
    await page.waitForFunction(() => window.__zeus?.ready === true && window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
    const f = await page.evaluate(() => window.__zeus.frames);
    await page.waitForFunction((f0) => window.__zeus.frames > f0 + 3, f, { timeout: 120000 });
    const info = await page.evaluate(() => window.__zeus.info());
    console.log(`${hash.padEnd(24)} map triangles ${String(info.triangles).padStart(8)}  draw calls ${String(info.calls).padStart(3)}`);
  }
}

// Main-thread time per frame before drawing (sim steps and view updates) in the fed town, paused and
// running at normal speed, at a small window so headless frames come often enough to average.
await page.setViewportSize({ width: 960, height: 540 });
for (const hash of ['#food-paused-shot', '#food-shot', '#fine-paused-shot', '#fine-shot', '#town-paused-shot', '#town-shot', '#villas-shot', '#blaze-paused-shot', '#blaze-shot', '#quay-shot', '#ship-shot', '#richtown-paused-shot', '#richtown-shot', '#richstreet-shot', '#greece-shot', '#greecesail-shot']) {
  await page.goto('about:blank');
  await page.goto(url + hash);
  await page.waitForFunction(() => window.__zeus?.ready === true && window.__zeus.frames > 3, null, { timeout: 120000 });
  const a = await page.evaluate(() => ({ f: window.__zeus.frames, ms: window.__zeus.updateMs ?? 0 }));
  await page.waitForTimeout(8000);
  const b = await page.evaluate(() => ({ f: window.__zeus.frames, ms: window.__zeus.updateMs ?? 0 }));
  console.log(`${hash.padEnd(18)} update ${((b.ms - a.ms) / Math.max(1, b.f - a.f)).toFixed(2)} ms a frame before drawing (${b.f - a.f} frames)`);
}
const mem = await page.evaluate(() => window.__zeus.info());
console.log(`gpu objects: ${mem.geometries} geometries, ${mem.textures} textures`);
await browser.close();
server.close();
