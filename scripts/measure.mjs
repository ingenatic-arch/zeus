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
// (Slice 22: of which the demos' prepared towns, each its own file fetched only when its demo is opened, named by a hash of the town.)
{
  const towns = files.filter((f) => /[\\/][0-9a-f]{12}-[^\\/]+\.js$/.test(f));
  const boot = files.filter((f) => !towns.includes(f));
  const size = (fs) => fs.reduce((a, f) => [a[0] + statSync(f).size, a[1] + gzipSync(readFileSync(f)).length], [0, 0]);
  const [br, bg] = size(boot);
  const [tr, tg] = size(towns);
  console.log(`  the game itself: ${boot.length} files, ${(br / 1024).toFixed(0)} KB raw, ${(bg / 1024).toFixed(0)} KB gzipped; the demos' prepared towns: ${towns.length} files, ${(tr / 1024).toFixed(0)} KB raw, ${(tg / 1024).toFixed(0)} KB gzipped (largest ${(Math.max(0, ...towns.map((f) => gzipSync(readFileSync(f)).length)) / 1024).toFixed(0)} KB gzipped)`);
}

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
  // Slice 16: a caravan walking in down the main street, and the Athenian ship coming in to the jetty.
  ['#caravan-paused-shot', [null, 'town']],
  ['#athensship-paused-shot', ['ship', 'town']],
  // Slice 20: raiders at a farm by the west edge, the fire alight.
  ['#raiders-paused-shot', [null, 'town']],
  // Slice 22: the town trading with every city, over the town and down the main street by the yard.
  ['#rivals-paused-shot', [null, 'town']],
  ['#rivalstreet-paused-shot', [null]],
  // Slice 23: the copper mine in the east hills; a company walking in to the barracks; two companies drilling, a banner in hand.
  ['#bronze-paused-shot', [null, 'town']],
  ['#barracks-paused-shot', [null]],
  ['#companies-paused-shot', [null, 'town']],
  // Slice 24: Sparta's band on the march with two companies at their barracks; a band let through, loaded; hirelings' barracks.
  ['#battle-paused-shot', [null, 'town']],
  ['#looted-paused-shot', [null]],
  ['#hirelings-paused-shot', [null]],
  // Slice 25: the town three weeks before the band, the wall tool in hand; the band at the walled west gate under two towers.
  ['#walls-paused-shot', [null, 'town']],
  ['#siege-paused-shot', [null, 'town']],
  // Slice 26: Troy's ships sailing in for the beach; two triremes at their shipyard as Troy's ships come into sight.
  ['#landing-paused-shot', [null, 'town']],
  ['#triremes-paused-shot', [null, 'town']],
  // Slice 28: Corinth's men in the city collecting a debt; the companies' town with its army away.
  ['#creditors-paused-shot', [null, 'town']],
  ['#report-paused-shot', ['companies', 'town']],
  // Slice 29: the walled town with Sparta's band gathering, over the west gate.
  ['#fortress-paused-shot', [null, 'town']],
  // Slice 30: the hut street tempted, with the crime overlay on; four months on with no watch post.
  ['#thieves-paused-shot', [null, 'town']],
  ['#nowatch-paused-shot', [null]],
  // Slice 33: a year to play at speed from the last days of February; the grey bay in winter and a late ship.
  ['#seasons-paused-shot', [null, 'town']],
  ['#winter-paused-shot', [null, 'town']],
]) {
  const t = Date.now();
  await page.goto('about:blank');
  await page.goto(url + hash);
  await page.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
  await page.waitForFunction(() => window.__zeus.frames > 0, null, { timeout: 120000 });
  const tp = await page.evaluate(() => ({ setup: window.__zeus.setupMs, ready: window.__zeus.readyAt, prepared: window.__zeus.prepared, fetch: window.__zeus.fetchMs }));
  console.log(`load ${hash}: ${tp.prepared ? `prepared town fetched in ${(tp.fetch ?? 0).toFixed(0)} ms and opened in` : 'setup'} ${tp.setup.toFixed(0)} ms, ready at ${tp.ready.toFixed(0)} ms by the page's clock (Playwright saw ready after ${Date.now() - t} ms)`);
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

// Slice 23: the meshes in #companies (the soldiers in the walkers' batch, the banners' poles and cloth).
{
  await page.goto('about:blank');
  await page.goto(url + '#companies-paused-shot');
  await page.waitForFunction(() => window.__zeus?.ready === true && window.__zeus.frames > 3, null, { timeout: 120000 });
  console.log('#companies meshes:');
  await summarise();
}

// Slice 24: a battle of about 75 figures (29 raiders, two companies of 16, the arrows) at the bridge: what it draws close to, and
// the main thread's work a frame while it is fought at normal speed (the companies placed, the game played on to the first blows).
{
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('about:blank');
  await page.goto(url + '#battle-paused-shot');
  await page.waitForFunction(() => window.__zeus?.ready === true && window.__zeus.frames > 3, null, { timeout: 120000 });
  const b = await page.evaluate(() => {
    const z = window.__zeus;
    const cs = z.army().companies;
    for (const c of cs) z.order({ type: 'banner', company: c.id, tile: c.kind === 'hoplite' ? 41 * 128 + 40 : 39 * 128 + 44 });
    for (let i = 0; i < 900 && z.battle().fighting < 6; i += 2) z.skip(2);
    const c = z.battle().centre;
    if (c) z.jump({ x: c.x, z: c.z, yaw: 2.65, dist: 14, tilt: 0.12 });
    return z.battle();
  });
  let f = await page.evaluate(() => window.__zeus.frames);
  await page.waitForFunction((f0) => window.__zeus.frames > f0 + 3, f, { timeout: 120000 });
  const info = await page.evaluate(() => window.__zeus.info());
  console.log(`#battle the fight, close: triangles ${String(info.triangles).padStart(8)}  draw calls ${String(info.calls).padStart(3)} · ${b.foes} raiders standing, ${b.fighting} fighting, ${b.arrows} arrows in the air`);
  console.log('#battle meshes in the fight:');
  await summarise();
  await page.setViewportSize({ width: 960, height: 540 });
  await page.evaluate(() => window.__zeus.speed('normal'));
  await page.waitForTimeout(4000);
  const a = await page.evaluate(() => ({ f: window.__zeus.frames, ms: window.__zeus.updateMs ?? 0, b: window.__zeus.battle() }));
  await page.waitForTimeout(8000);
  const z = await page.evaluate(() => ({ f: window.__zeus.frames, ms: window.__zeus.updateMs ?? 0, b: window.__zeus.battle() }));
  console.log(`#battle fought     update ${((z.ms - a.ms) / Math.max(1, z.f - a.f)).toFixed(2)} ms a frame before drawing (${z.f - a.f} frames; ${a.b.fighting} then ${z.b.fighting} raiders fighting)`);
  await page.setViewportSize({ width: 1920, height: 1080 });
  f = 0;
}

// Slice 25: the siege at the west gate (the walls' mesh, two towers shooting, the band hammering): what it draws, and the main
// thread's work a frame while it goes on at normal speed.
{
  await page.goto('about:blank');
  await page.goto(url + '#siege-paused-shot');
  await page.waitForFunction(() => window.__zeus?.ready === true && window.__zeus.frames > 3, null, { timeout: 120000 });
  const w = await page.evaluate(() => window.__zeus.walls());
  const info = await page.evaluate(() => window.__zeus.info());
  console.log(`#siege at the gate: triangles ${String(info.triangles).padStart(8)}  draw calls ${String(info.calls).padStart(3)} · ${w.pieces.length} stretches and gates, ${w.towers.length} towers`);
  console.log('#siege meshes:');
  await summarise();
  await page.setViewportSize({ width: 960, height: 540 });
  await page.evaluate(() => window.__zeus.speed('normal'));
  await page.waitForTimeout(4000);
  const a = await page.evaluate(() => ({ f: window.__zeus.frames, ms: window.__zeus.updateMs ?? 0, w: window.__zeus.walls() }));
  await page.waitForTimeout(8000);
  const z = await page.evaluate(() => ({ f: window.__zeus.frames, ms: window.__zeus.updateMs ?? 0, w: window.__zeus.walls() }));
  console.log(`#siege hammering   update ${((z.ms - a.ms) / Math.max(1, z.f - a.f)).toFixed(2)} ms a frame before drawing (${z.f - a.f} frames; ${a.w.hammering} then ${z.w.hammering} raiders hammering, ${z.w.towerArrows} tower arrows in the air)`);
  await page.setViewportSize({ width: 1920, height: 1080 });
}

// Slice 29: #fortress's fight at the west gate (three companies held inside it, the band at the gate under three towers): what it
// draws, and the main thread's work a frame while it goes on at normal speed.
{
  await page.goto('about:blank');
  await page.goto(url + '#fortress-paused-shot');
  await page.waitForFunction(() => window.__zeus?.ready === true && window.__zeus.frames > 3, null, { timeout: 120000 });
  const b0 = await page.evaluate(() => {
    const z = window.__zeus;
    for (const c of z.army().companies) z.order({ type: 'banner', company: c.id, tile: 41 * 128 + 43 });
    for (let i = 0; i < 1500 && z.battle().fighting < 6; i += 2) z.skip(2);
    const c = z.battle().centre ?? { x: 41, z: 41 };
    z.jump({ x: c.x, z: c.z, yaw: 2.65, dist: 16, tilt: 0.0 });
    return z.battle();
  });
  await page.waitForFunction((f) => window.__zeus.frames > f, (await page.evaluate(() => window.__zeus.frames)) + 3, { timeout: 120000 });
  const info = await page.evaluate(() => window.__zeus.info());
  console.log(`#fortress the fight: triangles ${String(info.triangles).padStart(8)}  draw calls ${String(info.calls).padStart(3)} · ${b0.foes} raiders standing, ${b0.fighting} fighting, ${b0.arrows} arrows in the air`);
  await page.setViewportSize({ width: 960, height: 540 });
  await page.evaluate(() => window.__zeus.speed('normal'));
  await page.waitForTimeout(4000);
  const a = await page.evaluate(() => ({ f: window.__zeus.frames, ms: window.__zeus.updateMs ?? 0, b: window.__zeus.battle() }));
  await page.waitForTimeout(8000);
  const z = await page.evaluate(() => ({ f: window.__zeus.frames, ms: window.__zeus.updateMs ?? 0, b: window.__zeus.battle() }));
  console.log(`#fortress fought   update ${((z.ms - a.ms) / Math.max(1, z.f - a.f)).toFixed(2)} ms a frame before drawing (${z.f - a.f} frames; ${a.b.fighting} then ${z.b.fighting} raiders fighting)`);
  await page.setViewportSize({ width: 1920, height: 1080 });
}

// Slice 26: a sea fight in the bay (two triremes rowing at Troy's ships, rams, spray, a ship going down): what it draws, and the
// main thread's work a frame while it goes on at normal speed.
{
  await page.goto('about:blank');
  await page.goto(url + '#triremes-paused-shot');
  await page.waitForFunction(() => window.__zeus?.ready === true && window.__zeus.frames > 3, null, { timeout: 120000 });
  const f0 = await page.evaluate(() => {
    const z = window.__zeus;
    for (let i = 0; i < 900 && !z.fleet().triremes.some((t) => t.task === 'fight'); i += 2) z.skip(2);
    const t = z.fleet().triremes.find((x) => x.task === 'fight') ?? z.fleet().triremes[0];
    z.jump({ x: t.x, z: t.z - 6, yaw: 3.0, dist: 22, tilt: -0.2 });
    return z.fleet();
  });
  await page.waitForFunction((f) => window.__zeus.frames > f, (await page.evaluate(() => window.__zeus.frames)) + 3, { timeout: 120000 });
  const info = await page.evaluate(() => window.__zeus.info());
  console.log(`#triremes the fight: triangles ${String(info.triangles).padStart(8)}  draw calls ${String(info.calls).padStart(3)} · ${f0.triremes.length} triremes, ${f0.ships.length} enemy ships`);
  console.log('#triremes meshes in the fight:');
  await summarise();
  await page.setViewportSize({ width: 960, height: 540 });
  await page.evaluate(() => window.__zeus.speed('normal'));
  await page.waitForTimeout(4000);
  const a = await page.evaluate(() => ({ f: window.__zeus.frames, ms: window.__zeus.updateMs ?? 0, fl: window.__zeus.fleet() }));
  await page.waitForTimeout(8000);
  const z = await page.evaluate(() => ({ f: window.__zeus.frames, ms: window.__zeus.updateMs ?? 0, fl: window.__zeus.fleet() }));
  const afloat = (fl) => fl.ships.filter((e) => e.state !== 'sinking').length;
  console.log(`#triremes fighting update ${((z.ms - a.ms) / Math.max(1, z.f - a.f)).toFixed(2)} ms a frame before drawing (${z.f - a.f} frames; ${afloat(a.fl)} then ${afloat(z.fl)} enemy ships afloat)`);
  await page.setViewportSize({ width: 1920, height: 1080 });
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
  // (Slice 17: #prices and #famine open on a city's page of prices, after a few years' trading or a year's play set up. Slice 18: #gift and #hostile on a ruler's page. Slice 19: #request and #tribute, a ruler's page with a deal on it. Slice 20: #raid, the band on the road. Slice 21: #war, two armies, the swords and the red way; #festival, banners and smoke.)
  for (const hash of ['#greece-paused-shot', '#greecesail-paused-shot', '#prices-paused-shot', '#famine-paused-shot', '#gift-paused-shot', '#hostile-paused-shot', '#request-paused-shot', '#tribute-paused-shot', '#raid-paused-shot', '#war-paused-shot', '#festival-paused-shot', '#rivalsmap-paused-shot', '#borrow-paused-shot', '#lend-paused-shot', '#repaid-paused-shot', '#pirates-paused-shot', '#overdue-paused-shot', '#collect-paused-shot', '#report-paused-shot', '#forgive-paused-shot']) {
    await page.goto('about:blank');
    await page.goto(url + hash);
    await page.waitForFunction(() => window.__zeus?.ready === true && window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
    const f = await page.evaluate(() => window.__zeus.frames);
    await page.waitForFunction((f0) => window.__zeus.frames > f0 + 3, f, { timeout: 120000 });
    const info = await page.evaluate(() => window.__zeus.info());
    const tp = await page.evaluate(() => ({ setup: window.__zeus.setupMs, ready: window.__zeus.readyAt }));
    console.log(`${hash.padEnd(24)} map triangles ${String(info.triangles).padStart(8)}  draw calls ${String(info.calls).padStart(3)}  · setup ${tp.setup.toFixed(0)} ms, ready at ${tp.ready.toFixed(0)} ms`);
  }
}

// Main-thread time per frame before drawing (sim steps and view updates) in the fed town, paused and
// running at normal speed, at a small window so headless frames come often enough to average.
// (Slice 22's review: measured after 10 s of running, so the browser has compiled the simulation's code
// first. A demo now opens from its prepared town, without playing its history in the page, so without
// the warm-up its first seconds land in the window and read a few ms heavier, before and after alike.)
await page.setViewportSize({ width: 960, height: 540 });
for (const hash of ['#food-paused-shot', '#food-shot', '#fine-paused-shot', '#fine-shot', '#town-paused-shot', '#town-shot', '#villas-shot', '#blaze-paused-shot', '#blaze-shot', '#quay-shot', '#ship-shot', '#richtown-paused-shot', '#richtown-shot', '#richstreet-shot', '#greece-shot', '#greecesail-shot', '#caravan-shot', '#athensship-shot', '#prices-shot', '#famine-shot', '#gift-shot', '#hostile-shot', '#request-shot', '#tribute-shot', '#raid-shot', '#raiders-shot', '#war-shot', '#festival-shot', '#rivals-shot', '#rivalsmap-shot', '#rivalstreet-shot', '#bronze-shot', '#barracks-shot', '#companies-shot', '#battle-shot', '#looted-shot', '#hirelings-shot', '#borrow-shot', '#lend-shot', '#repaid-shot', '#landing-shot', '#triremes-shot', '#pirates-shot', '#overdue-shot', '#seized-shot', '#creditors-shot', '#collect-shot', '#report-shot', '#forgive-shot', '#thieves-shot', '#nowatch-shot', '#seasons-shot', '#winter-shot']) {
  await page.goto('about:blank');
  await page.goto(url + hash);
  await page.waitForFunction(() => window.__zeus?.ready === true && window.__zeus.frames > 3, null, { timeout: 120000 });
  await page.waitForTimeout(10000);
  const a = await page.evaluate(() => ({ f: window.__zeus.frames, ms: window.__zeus.updateMs ?? 0 }));
  await page.waitForTimeout(8000);
  const b = await page.evaluate(() => ({ f: window.__zeus.frames, ms: window.__zeus.updateMs ?? 0 }));
  console.log(`${hash.padEnd(18)} update ${((b.ms - a.ms) / Math.max(1, b.f - a.f)).toFixed(2)} ms a frame before drawing (${b.f - a.f} frames)`);
}
const mem = await page.evaluate(() => window.__zeus.info());
console.log(`gpu objects: ${mem.geometries} geometries, ${mem.textures} textures`);

// Slice 22: every demo's load at 1920 x 1080, by the page's clock (its town prepared when the game was built, fetched and opened).
{
  await page.setViewportSize({ width: 1920, height: 1080 });
  const demos = await page.evaluate(() => window.__zeus.demos);
  const rows = [];
  for (const d of demos) {
    await page.goto('about:blank');
    await page.goto(`${url}#${d}-paused-shot`);
    await page.waitForFunction(() => window.__zeus?.ready === true && window.__zeus.firstFrameAt !== undefined, null, { timeout: 120000 });
    rows.push({ d, ...(await page.evaluate(() => ({ ready: window.__zeus.readyAt, first: window.__zeus.firstFrameAt, prepared: !!window.__zeus.prepared }))) });
  }
  rows.sort((a, b) => b.ready - a.ready);
  const over = rows.filter((r) => r.ready > 3000);
  const median = rows[Math.floor(rows.length / 2)];
  console.log(`demo loads: ${rows.length} demos, ${rows.filter((r) => r.prepared).length} from prepared towns; ready at median ${median.ready.toFixed(0)} ms, slowest ${rows.slice(0, 5).map((r) => `#${r.d} ${r.ready.toFixed(0)}`).join(', ')} ms; over 3 s: ${over.length ? over.map((r) => `#${r.d} ${r.ready.toFixed(0)}`).join(', ') : 'none'}`);
}
await browser.close();
server.close();
