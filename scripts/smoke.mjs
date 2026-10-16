// Build first (npm run build). Drives the built page in headless Chromium:
// drags, zooms, turns and changes speed, and fails on any page error.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import { launch } from './browser.mjs';
import { serveDist } from './serve-dist.mjs';

const { server, url } = await serveDist(resolve('dist'));
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
const fail = (msg) => {
  console.error('FAIL:', msg);
  process.exitCode = 1;
};
const frames = async (n) => {
  const f = await page.evaluate(() => window.__zeus.frames);
  await page.waitForFunction((f0) => window.__zeus.frames >= f0, f + n, { timeout: 60000 });
};

await page.goto(url + '?demo=coast');
await page.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
await frames(3);
const v0 = await page.evaluate(() => window.__zeus.view());

// Labels over the map (the first-time hint, even once faded) never catch the pointer.
const under = await page.evaluate(() => {
  const h = document.querySelector('.hint')?.getBoundingClientRect();
  return h ? document.elementFromPoint(h.x + h.width / 2, h.y + h.height / 2)?.tagName : 'CANVAS';
});
if (under !== 'CANVAS') fail(`the hint catches the pointer (${under})`);

// Left-drag pans.
await page.mouse.move(640, 400);
await page.mouse.down();
await page.mouse.move(540, 350, { steps: 5 });
await page.mouse.up();
await frames(3);
const v1 = await page.evaluate(() => window.__zeus.view());
if (Math.hypot(v1.x - v0.x, v1.z - v0.z) < 1) fail('left-drag did not pan');

// Right-drag orbits.
await page.mouse.down({ button: 'right' });
await page.mouse.move(640, 350, { steps: 5 });
await page.mouse.up({ button: 'right' });
await frames(3);
const v2 = await page.evaluate(() => window.__zeus.view());
if (Math.abs(v2.yaw - v1.yaw) < 0.1) fail('right-drag did not turn');

// Wheel zooms in.
for (let i = 0; i < 6; i++) await page.mouse.wheel(0, -200);
await frames(30);
const v3 = await page.evaluate(() => window.__zeus.view());
if (!(v3.dist < v2.dist * 0.7)) fail(`wheel did not zoom in (${v2.dist} -> ${v3.dist})`);

// Q turns a quarter.
await page.keyboard.press('q');
await frames(60);
const v4 = await page.evaluate(() => window.__zeus.view());
const quarter = Math.abs(Math.abs(v4.yaw - v3.yaw) - Math.PI / 2);
if (quarter > 0.5) fail(`Q did not turn a quarter (${v3.yaw} -> ${v4.yaw})`);

// Fastest speed moves the calendar on; Space pauses it.
// (Waits on ticks and frames, not on the wall clock: a slow software renderer draws few frames a second.)
await page.keyboard.press('3');
const t0 = await page.evaluate(() => window.__zeus.tick());
const f0 = await page.evaluate(() => window.__zeus.frames);
await page.waitForFunction((t) => window.__zeus.tick() >= t + 20, t0, { timeout: 60000 }).catch(() => {});
const t1 = await page.evaluate(() => window.__zeus.tick());
const f1 = await page.evaluate(() => window.__zeus.frames);
// At fastest, each frame moves the clock several ticks on (normal speed is about one tick every six frames).
if (t1 - t0 < 20 || (t1 - t0) / Math.max(1, f1 - f0) < 0.5) fail(`clock did not run at fastest (${t0} -> ${t1} in ${f1 - f0} frames)`);
await page.keyboard.press('Space');
await frames(1);
const t2 = await page.evaluate(() => window.__zeus.tick());
await frames(10);
const t3 = await page.evaluate(() => window.__zeus.tick());
if (t3 !== t2) fail('space did not pause');
const speed = await page.evaluate(() => document.querySelector('.speeds .on')?.getAttribute('aria-label'));
if (!speed?.startsWith('Pause')) fail(`pause button not lit (${speed})`);

// Every prepared view loads.
for (const cam of ['coast', 'overview', 'river', 'bay', 'hills', 'street', 'headland', 'mouth']) {
  await page.goto('about:blank');
  await page.goto(url + `?cam=${cam}&speed=paused`);
  await page.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
  await frames(2);
}

// Every demo link loads from a bare hash token (the published page only gets the hash).
for (const token of ['coast', 'streets', 'settlers', 'build', 'river', 'water', 'carrier', 'fountain', 'water-overlay', 'streets-fast']) {
  await page.goto('about:blank');
  await page.goto(url + '#' + token);
  await page.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
  await frames(2);
}
const streets = await page.evaluate(() => window.__zeus.city());
if (!(streets.tents > 0 && streets.roads > 0)) fail(`#streets-fast has no tents or roads (${JSON.stringify(streets)})`);
const fast = await page.evaluate(() => document.querySelector('.speeds .on')?.getAttribute('aria-label'));
if (!fast?.startsWith('Fast')) fail(`#streets-fast did not start fast (${fast})`);

// Building: the road tool, a road in from the west edge, plots beside it, settlers, clearing and undo.
await page.goto('about:blank');
await page.goto(url + '#build-paused');
await page.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
await page.evaluate(() => window.__zeus.jump({ x: 10, z: 79, yaw: 0, dist: 24, tilt: 0 }));
await frames(3);
const at = (x, z) => page.evaluate(([x, z]) => window.__zeus.screenOf(x, z), [x, z]);
const city = () => page.evaluate(() => window.__zeus.city());
if ((await city()).tool !== 'road') fail('#build did not pick the road tool');
const v5 = await page.evaluate(() => window.__zeus.view());
let p = await at(0.5, 80.5);
await page.mouse.move(p.x, p.y);
await page.mouse.down();
p = await at(16.5, 80.5);
await page.mouse.move(p.x, p.y, { steps: 6 });
await page.mouse.up();
await frames(2);
let c = await city();
if (c.roads !== 17) fail(`left-drag with the road tool laid ${c.roads} road tiles, not 17`);
if (c.money !== 5000 - 17 * 4) fail(`roads cost ${5000 - c.money}, not ${17 * 4}`);
const v6 = await page.evaluate(() => window.__zeus.view());
if (Math.hypot(v6.x - v5.x, v6.z - v5.z) > 0.01) fail('left-drag with a tool also panned the view');
// Housing plots by key.
await page.keyboard.press('h');
p = await at(5, 79);
await page.mouse.move(p.x, p.y);
await page.mouse.down();
p = await at(13, 79);
await page.mouse.move(p.x, p.y, { steps: 4 });
await page.mouse.up();
await frames(2);
c = await city();
if (c.homes !== 5) fail(`dragged ${c.homes} plots, not 5`);
// Right-click puts the tool down; with no tool, left-drag pans again.
await page.mouse.click(p.x, p.y, { button: 'right' });
await frames(2);
if ((await city()).tool !== null) fail('right-click did not put the tool down');
// Settlers come (fastest speed).
await page.keyboard.press('3');
await page.waitForFunction(() => window.__zeus.city().tents >= 2, null, { timeout: 120000 });
c = await city();
if (!(c.population > 0)) fail('no settlers moved in');
await page.keyboard.press('Space');
// Clear one tent; its family leaves.
await page.keyboard.press('x');
p = await at(5.5, 78.5);
await page.mouse.move(p.x, p.y);
await page.mouse.down();
await page.mouse.up();
await frames(2);
const c2 = await city();
if (!(c2.homes === 4 && c2.population < c.population)) fail(`clearing a tent: ${JSON.stringify(c)} -> ${JSON.stringify(c2)}`);
// Undo brings the plot back.
await page.keyboard.press('u');
await frames(2);
const c3 = await city();
if (c3.homes !== 5) fail(`undo did not bring the plot back (${c3.homes})`);
await page.keyboard.press('Escape');

// Water: the fountain tool and its preview, placing one, the overlay, the carrier, huts, hover and follow.
await page.goto('about:blank');
await page.goto(url + '#fountain-paused');
await page.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
await frames(3);
c = await city();
if (c.tool !== 'fountain') fail('#fountain did not pick the fountain tool');
if (!c.overlay) fail('the water overlay is not shown while placing a fountain');
if (c.fountains !== 0 || c.huts !== 0) fail(`#fountain should start with no fountain and no huts (${JSON.stringify(c)})`);
const tip = () => page.evaluate(() => window.__zeus.tipText());
p = await at(28, 82);
await page.mouse.move(p.x, p.y);
await frames(2);
const ftip = await tip();
if (!/would reach \d+ homes/.test(ftip ?? '')) fail(`fountain preview tip: ${ftip}`);
// Moving about inside the same tile doesn't rewrite the marks texture.
const w0 = (await city()).markWrites;
for (let i = 1; i <= 4; i++) await page.mouse.move(p.x + i, p.y);
await frames(2);
const w1 = (await city()).markWrites;
if (w1 !== w0) fail(`pointer moves within one tile rewrote the marks ${w1 - w0} times`);
const m0 = (await city()).money;
await page.mouse.click(p.x, p.y);
await frames(2);
c = await city();
if (c.fountains !== 1 || m0 - c.money !== 150) fail(`clicking placed ${c.fountains} fountains for ${m0 - c.money} dr`);
await page.keyboard.press('Escape');
await frames(2);
if ((await city()).overlay) fail('the overlay stayed on after putting the fountain tool down');
await page.keyboard.press('o');
await frames(2);
if (!(await city()).overlay) fail('O did not show the water overlay');
await page.keyboard.press('o');
await frames(2);
if ((await city()).overlay) fail('O did not hide the water overlay');
// The road tool's route isn't worked out again as settlers arrive and tents turn to huts.
await page.keyboard.press('t');
p = await at(30.5, 84.5);
await page.mouse.move(p.x, p.y);
await frames(2);
const r0 = (await city()).routes;
await page.keyboard.press('3');
await page.waitForFunction(() => window.__zeus.city().huts > 0 && window.__zeus.city().carriers > 0, null, { timeout: 180000 });
await page.keyboard.press('Space');
await frames(2);
c = await city();
if (c.routes !== r0) fail(`the road preview was worked out ${c.routes - r0} more times while only settlers and houses changed`);
if (!(c.watered > 0)) fail('no home has water');
await page.keyboard.press('Escape');
// Hovering the carrier names her; clicking her follows her; Esc stops.
await page.goto('about:blank');
await page.goto(url + '#water-paused');
await page.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
await frames(3);
c = await city();
if (!(c.huts > 10 && c.carriers === 1 && c.fountains === 1)) fail(`#water: ${JSON.stringify(c)}`);
const sc = await page.evaluate(() => window.__zeus.carrier());
if (!sc) fail('#water: no carrier on screen');
else {
  await page.mouse.move(sc.x, sc.y);
  await frames(2);
  const ct = await tip();
  if (!/^Water carrier/.test(ct ?? '')) fail(`hovering the carrier: ${ct}`);
  await page.mouse.click(sc.x, sc.y);
  await frames(2);
  if (!(await city()).following) fail('clicking the carrier did not follow her');
  await page.keyboard.press('Escape');
  await frames(2);
  if ((await city()).following) fail('Esc did not stop following');
}
// Hovering a home says what reaches it.
const home = await page.evaluate(() => window.__zeus.screenOf(17, 79));
await page.mouse.move(home.x, home.y);
await frames(2);
const ht = await tip();
if (!/water/i.test(ht ?? '')) fail(`hovering a home: ${ht}`);
// #carrier starts following.
await page.goto('about:blank');
await page.goto(url + '#carrier-paused');
await page.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
await frames(3);
if (!(await city()).following) fail('#carrier is not following the carrier');


// Food: the fed town, its counters, hovering the vendor and a farm, the food overlay.
const open = async (hash) => {
  await page.goto('about:blank');
  await page.goto(url + hash);
  await page.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
  await frames(3);
};
await open('#food-paused');
c = await city();
if (!(c.cottages > 10 && c.farms === 3 && c.granaries === 1 && c.agoras === 1 && c.fed > 10 && c.jobs === 47 && c.filled >= 44)) fail(`#food: ${JSON.stringify(c)}`);
// Wages went out last month (the tax office has only just gone in).
if (!(c.wages > 0)) fail(`#food: no wages paid (${c.wages})`);
const sv = await page.evaluate(() => window.__zeus.walker('food'));
if (sv) {
  await page.mouse.move(sv.x, sv.y);
  await frames(2);
  const vt = await tip();
  if (!/^Food vendor/.test(vt ?? '')) fail(`hovering the food vendor: ${vt}`);
}
await page.keyboard.press('l');
await frames(2);
if ((await city()).overlayMode !== 'food') fail('L did not show the food overlay');
await page.keyboard.press('o');
await frames(2);
if ((await city()).overlayMode !== 'water') fail('O did not switch to the water overlay');
await page.keyboard.press('o');
await frames(2);
if ((await city()).overlay) fail('O did not hide the overlay');
// #chain opens on the watered town with the farm tool (and so the food overlay); #vendor and #harvest follow.
await open('#chain-paused');
c = await city();
if (c.tool !== 'farm' || c.overlayMode !== 'food' || c.farms !== 0) fail(`#chain: ${JSON.stringify(c)}`);
await open('#harvest-paused');
if (!(await city()).following) fail('#harvest is not following an ox cart');
await open('#vendor-paused');
if (!(await city()).following) fail('#vendor is not following the food vendor');
// Workers: the chain built in a town of tents is short of hands, and says so.
await open('#workers-paused');
c = await city();
if (!(c.filled < c.jobs)) fail(`#workers is not short of workers (${c.filled} of ${c.jobs})`);
p = await at(48.5, 61.5);
await page.mouse.move(p.x, p.y);
await frames(2);
const wt = await tip();
if (!/A wheat farm[\s\S]*(No workers|Short of workers)/.test(wt ?? '')) fail(`hovering a farm short of workers: ${wt}`);
// The farm tool: its label on fertile land, a refusal on dry land, and placing one.
await page.keyboard.press('m');
p = await at(41.5, 58.5);
await page.mouse.move(p.x, p.y);
await frames(2);
const mt = await tip();
if (!/^Wheat farm · 200 dr[\s\S]*measures of wheat/.test(mt ?? '')) fail(`farm tool label: ${mt}`);
const fm0 = (await city()).money;
await page.mouse.click(p.x, p.y);
await frames(2);
c = await city();
if (c.farms !== 4 || fm0 - c.money !== 200) fail(`placing a farm: ${c.farms} farms for ${fm0 - c.money} dr`);
p = await at(12.5, 62.5);
await page.mouse.move(p.x, p.y);
await frames(2);
const nt = await tip();
if (!/Not fertile enough/.test(nt ?? '')) fail(`farm tool on dry land: ${nt}`);
await page.keyboard.press('Escape');
// A bridge: drag a road straight across the river where it is narrow; undo takes it away.
await open('#water-paused');
await page.evaluate(() => window.__zeus.jump({ x: 34, z: 42, yaw: -0.35, dist: 22, tilt: -0.2 }));
await frames(3);
await page.keyboard.press('t');
const b0 = await at(29.5, 41.5);
const b1 = await at(40.5, 41.5);
await page.mouse.move(b0.x, b0.y);
await frames(1);
await page.mouse.down();
await page.mouse.move(b1.x, b1.y, { steps: 8 });
await frames(2);
const bt = await tip();
if (!/a bridge of 7 tiles/.test(bt ?? '')) fail(`bridge drag label: ${bt}`);
await page.mouse.up();
await frames(2);
c = await city();
if (c.bridges !== 7) fail(`the bridge was not built (${c.bridges} bridge tiles)`);
await page.keyboard.press('u');
await frames(2);
if ((await city()).bridges !== 0) fail('undo did not take the bridge away');
await page.keyboard.press('Escape');
// Carts cross the bridge in #bridge; clearing a farm takes its carts with it.
await open('#bridge-paused');
c = await city();
if (!(c.bridges === 7 && c.farms === 3 && c.carts > 0 && c.tool === 'road')) fail(`#bridge: ${JSON.stringify(c)}`);
await open('#harvest-paused');
const h0 = await city();
await page.keyboard.press('x');
const x0 = await at(47.2, 60.2);
const x1 = await at(49.8, 62.8);
await page.mouse.move(x0.x, x0.y);
await page.mouse.down();
await page.mouse.move(x1.x, x1.y, { steps: 4 });
await page.mouse.up();
await frames(2);
const h1 = await city();
if (h1.farms !== h0.farms - 1) fail(`clearing a farm: ${h0.farms} -> ${h1.farms}`);
await page.keyboard.press('Escape');
await page.keyboard.press('3');
await frames(30);

if (errors.length) fail('page errors:\n' + errors.join('\n'));
// The people who live there: the household panel, signs, the trouble count, the what's-missing overlay, undo's reach.
const panelText = () => page.evaluate(() => window.__zeus.panelText());
await open('#people-paused');
c = await city();
if (!(c.panel > 0 && c.warned === 0)) fail(`#people: ${JSON.stringify(c)}`);
let pt = await panelText();
if (!/The house of [\s\S]*Who lives here[\s\S]*head of the house[\s\S]*Their story/.test(pt ?? '')) fail(`#people panel: ${pt}`);
const firstPanel = c.panel;
// Hovering another home invites a click; clicking it opens its own panel.
const others = (await page.evaluate(() => window.__zeus.homes())).filter((h) => h.id !== firstPanel && h.level === 3);
const other = others.find((h) => Math.abs(h.x - 30) + Math.abs(h.z - 67) < 8) ?? others[0];
p = await at(other.x + 1, other.z + 1);
await page.mouse.move(p.x, p.y - 4);
await frames(2);
const hh = await tip();
if (!/The house of [\s\S]*Click to see who lives here/.test(hh ?? '')) fail(`hovering a home: ${hh}`);
await page.mouse.click(p.x, p.y - 4);
await frames(2);
c = await city();
if (c.panel === firstPanel || c.panel === 0) fail(`clicking another home did not open its panel (${c.panel})`);
await page.keyboard.press('Escape');
await frames(2);
if ((await city()).panel !== 0) fail('Esc did not close the household panel');
// The undo button says why it can't (the demo's building was over a month ago).
const undoTitle = await page.evaluate(() => document.querySelector('.btn[aria-label^="Undo"]')?.getAttribute('title'));
if (!/about a month|Nothing to undo|clear it instead/.test(undoTitle ?? '')) fail(`undo button title: ${undoTitle}`);
// I: the what's-missing overlay.
await page.keyboard.press('i');
await frames(2);
if ((await city()).overlayMode !== 'missing') fail('I did not show the what’s-missing overlay');
const legend = await page.evaluate(() => !document.querySelector('.legend')?.hidden);
if (!legend) fail('the what’s-missing legend is not showing');
await page.keyboard.press('i');
await frames(2);
if ((await city()).overlay) fail('I did not hide the overlay');
// #warning: opens paused; the cut-off street's homes warn, with signs, a trouble count, a panel and the cut ringed; mending the road clears the warnings.
await open('#warning');
c = await city();
const c0warn = { tick: await page.evaluate(() => window.__zeus.tick()), cottages: c.cottages };
await frames(3);
if ((await page.evaluate(() => window.__zeus.tick())) !== c0warn.tick) fail('#warning did not open paused');
if (!(await page.evaluate(() => window.__zeus.meshes().some((m) => m.name === 'mark')))) fail('#warning: the cut road is not ringed');
if (!(c.warned >= 5 && c.signs >= c.warned && c.tool === 'road' && c.panel > 0)) fail(`#warning: ${JSON.stringify(c)}`);
pt = await panelText();
if (!/No water for [\s\S]*they give up the cottage for a hut[\s\S]*no road joins it to a fountain/.test(pt ?? '')) fail(`#warning panel: ${pt}`);
const trouble = await page.evaluate(() => {
  const el = document.querySelector('.stat.trouble');
  return el && !el.hidden ? el.textContent.trim() : '';
});
if (trouble !== String(c.warned)) fail(`trouble count "${trouble}" for ${c.warned} warned homes`);
const cut0 = c.roads;
p = await at(25.5, 74.5);
await page.mouse.click(p.x, p.y);
await frames(2);
c = await city();
if (c.roads !== cut0 + 1 || c.undo !== '') fail(`mending the cut road: ${cut0} -> ${c.roads} roads, undo "${c.undo}"`);
if (await page.evaluate(() => window.__zeus.meshes().some((m) => m.name === 'mark'))) fail('the ring on the cut road is still showing after mending it');
await page.keyboard.press('Escape');
await page.evaluate(() => window.__zeus.speed('fastest'));
await page.waitForFunction(() => window.__zeus.city().warned === 0, null, { timeout: 120000 });
c = await city();
pt = await panelText();
if (c.cottages !== c0warn.cottages || !/The water carrier came back/.test(pt ?? '')) fail(`after mending, ${c0warn.cottages} -> ${c.cottages} cottages; panel: ${pt}`);
// #decline: running, the nearest home drops a level and people walk out.
await open('#decline');
c = await city();
await page.evaluate(() => window.__zeus.speed('fastest'));
// The panel's home (the nearest to dropping, perhaps tied with another) goes back to a hut.
await page.waitForFunction(() => window.__zeus.homes().find((h) => h.id === window.__zeus.city().panel)?.level === 2, null, { timeout: 60000 });
await frames(2);
pt = await panelText();
if (!/^A hut/.test(pt ?? '') || !/Gave up the cottage for a hut/.test(pt) || !/moved away|went back to/.test(pt)) fail(`#decline panel after the drop: ${pt}`);
// #missing: the overlay is on; the trouble count flies to the most urgent home and opens its panel.
await open('#missing-paused');
c = await city();
if (!(c.overlayMode === 'missing' && c.warned > 0 && c.panel === 0)) fail(`#missing: ${JSON.stringify(c)}`);
await page.click('.stat.trouble');
await frames(3);
const urgent = (await page.evaluate(() => window.__zeus.homes())).filter((h) => h.warned).sort((a, b) => a.left - b.left)[0];
if ((await city()).panel !== urgent?.id) fail(`the trouble count did not open the most urgent home (${(await city()).panel} vs ${urgent?.id})`);

// Slice 6: the shrine and the theatre, townhouses and fine houses.
// #grow: the shrine tool picked over the grown town, its overlay forced; placing one costs 200 and sends out the priestess.
await open('#grow-paused');
c = await city();
if (!(c.tool === 'shrine' && c.overlayMode === 'religion' && c.cottages > 20 && c.shrines === 0)) fail(`#grow: ${JSON.stringify(c)}`);
const gm0 = c.money;
p = await at(36, 79);
await page.mouse.move(p.x, p.y);
await frames(2);
const st = await tip();
if (!/^Shrine · 200 dr/.test(st ?? '') || !/priestess would reach \d+ homes?/.test(st ?? '')) fail(`shrine tool tip: ${st}`);
await page.mouse.click(p.x, p.y);
await frames(2);
c = await city();
if (!(c.shrines === 1 && c.money === gm0 - 200)) fail(`placing a shrine: ${JSON.stringify({ shrines: c.shrines, money: c.money, gm0 })}`);
await page.keyboard.press('p');
await frames(1);
if ((await city()).tool !== 'theatre') fail('P did not pick the theatre tool');
await page.keyboard.press('v');
await frames(1);
if ((await city()).tool !== 'shrine') fail('V did not pick the shrine tool');
await page.keyboard.press('Escape');
// #shrine: townhouses round the shrine; Y toggles the religion overlay; hovering a townhouse says it is blessed.
await open('#shrine-paused');
c = await city();
if (!(c.shrines === 1 && c.townhouses >= 15 && c.blessed >= 15 && c.fine === 0)) fail(`#shrine: ${JSON.stringify(c)}`);
await page.keyboard.press('y');
await frames(2);
if ((await city()).overlayMode !== 'religion') fail('Y did not show the religion overlay');
await page.keyboard.press('y');
const th = (await page.evaluate(() => window.__zeus.homes())).find((h) => h.level === 4);
p = await at(th.x + 1, th.z + 1);
await page.mouse.move(p.x, p.y);
await frames(2);
const tht = await tip();
if (!/townhouse[\s\S]*Blessings · last/.test(tht ?? '')) fail(`hovering a townhouse: ${tht}`);
// #theatre: fine houses; C toggles the culture overlay; a fine house's panel shows its plays.
await open('#theatre-paused');
c = await city();
if (!(c.theatres === 1 && c.fine >= 5 && c.entertained >= 5)) fail(`#theatre: ${JSON.stringify(c)}`);
await page.keyboard.press('c');
await frames(2);
if ((await city()).overlayMode !== 'culture') fail('C did not show the culture overlay');
await page.keyboard.press('c');
// The fine house nearest the middle of the screen.
let best = null;
for (const h of (await page.evaluate(() => window.__zeus.homes())).filter((h) => h.level === 5)) {
  const q = await at(h.x + 1, h.z + 1);
  const d = Math.hypot(q.x - 640, q.y - 360);
  if (!best || d < best.d) best = { d, q };
}
p = best.q;
await page.mouse.click(p.x, p.y);
await frames(3);
pt = await panelText();
if (!/^A fine house[\s\S]*Plays · last[\s\S]*A fine house is as fine as homes get/.test(pt ?? '')) fail(`fine house panel: ${pt}`);
// #actor: following the actor.
await open('#actor');
if (!(await city()).following) fail('#actor is not following the actor');
// #closed: the theatre gone and the west street cut; wide signs for three or more needs (since slice 10 the cut street goes without oil too), and the panel says what goes.
await open('#closed');
c = await city();
if (!(c.theatres === 0 && c.warned >= 15 && c.signs >= c.warned && c.signsWide >= 3 && c.panel > 0)) fail(`#closed: ${JSON.stringify(c)}`);
pt = await panelText();
if (!/they give up the (townhouse for a cottage|fine house for a townhouse)/.test(pt ?? '')) fail(`#closed panel: ${pt}`);
if (!(await page.evaluate(() => window.__zeus.meshes().filter((m) => /^sign-rim-[345]$/.test(m.name)).reduce((n, m) => n + m.count, 0) >= 3))) fail('#closed: no wide signs drawn');

// Slice 7: a town worth keeping.
const zeus = (f, arg) => page.evaluate(f, arg);
// The bare link: a welcome card pointing at the build bar and #town; picking a tool puts it away.
await open('#');
if (!(await zeus(() => window.__zeus.welcome()))) fail('no welcome card on the bare link');
const wel = await zeus(() => ({ text: document.querySelector('.welcome')?.textContent ?? '', town: !!document.querySelector('.welcome a[href="#town"]') }));
if (!/bar along the bottom/.test(wel.text) || !wel.town) fail(`welcome card: ${JSON.stringify(wel)}`);
await page.mouse.move(640, 300);
await page.keyboard.press('t');
await frames(2);
if (await zeus(() => window.__zeus.welcome())) fail('picking a tool did not put the welcome card away');
// Sound starts on the first key; the mute switch works and is remembered.
let snd = await zeus(() => window.__zeus.sound());
if (!snd.started) fail('sound did not start after a key press');
await page.click('.mute-btn');
await frames(1);
if (!(await zeus(() => window.__zeus.sound())).muted) fail('the mute switch did not mute');
// Muted, the audio is held (suspended), not just turned down.
await page.waitForTimeout(700);
await frames(1);
if ((await zeus(() => window.__zeus.sound())).state !== 'suspended') fail(`muted sound is still running: ${JSON.stringify(await zeus(() => window.__zeus.sound()))}`);
// Esc puts the welcome card away too.
await open('#');
await page.keyboard.press('Escape');
await frames(2);
if (await zeus(() => window.__zeus.welcome())) fail('Esc did not put the welcome card away');
// Opened muted, a key press makes no sound at all.
if ((await zeus(() => window.__zeus.sound())).started) fail('sound started while muted');
// #town: every house level and kind of building, the bridge, a few hundred people, at normal speed.
await open('#town');
c = await city();
if (!(c.tents > 0 && c.huts > 0 && c.cottages > 0 && c.townhouses > 0 && c.fine > 0 && c.fountains > 0 && c.farms > 0 && c.granaries > 0 && c.agoras > 0 && c.shrines > 0 && c.theatres > 0 && c.bridges > 0 && c.population > 300 && c.population < 900 && c.warned === 0)) fail(`#town: ${JSON.stringify(c)}`);
const townSpeed = await zeus(() => document.querySelector('.speeds .on')?.getAttribute('aria-label'));
if (!townSpeed?.startsWith('Normal')) fail(`#town is not at normal speed (${townSpeed})`);
if (!(await zeus(() => window.__zeus.sound())).muted) fail('the mute switch was not remembered');
await page.click('.mute-btn');
await frames(1);
if ((await zeus(() => window.__zeus.sound())).state !== 'running') fail(`unmuting did not start the sound: ${JSON.stringify(await zeus(() => window.__zeus.sound()))}`);
if ((await zeus(() => window.__zeus.townLines())).length) fail('#town opens with a shortfall line');
// Saving by hand (Ctrl+S); #saved opens it where it was, and clears the link.
await page.keyboard.press('Space');
await frames(1);
await page.keyboard.press('Control+s');
await frames(2);
let sav = await zeus(() => window.__zeus.saves());
if (!sav.manual?.label) fail(`Ctrl+S did not save: ${JSON.stringify(sav)}`);
const savedTick = sav.manual.label.tick;
const note = await zeus(() => document.querySelector('.save-note')?.textContent ?? '');
if (!/^Saved/.test(note)) fail(`no note after saving: ${note}`);
await open('#saved-paused');
sav = await zeus(() => window.__zeus.saves());
if (!sav.loaded || (await zeus(() => window.__zeus.tick())) !== savedTick || !sav.autosaving) fail(`#saved did not open the save: ${JSON.stringify(sav)}`);
if ((await zeus(() => location.hash)) !== '') fail('#saved left the link in place');
if ((await city()).fine !== c.fine) fail('the saved town came back different');
// The saves card lists it and offers to open it.
await page.click('.saves-btn');
await frames(1);
const card = await zeus(() => document.querySelector('.saves')?.textContent ?? '');
if (!/Saved by you[\s\S]*people[\s\S]*Open/.test(card)) fail(`saves card: ${card}`);
await page.click('.saves .close');
// A save from an older version, or damaged, fails in plain words and the coast opens with the welcome card.
await zeus(() => localStorage.setItem('zeus-remake.save.manual', JSON.stringify({ format: 'zeus-remake-save', save: 1, label: { date: 'x', people: 1, money: 1, homes: 1, tick: 1 }, state: { version: 2 } })));
await open('#saved');
sav = await zeus(() => window.__zeus.saves());
if (!/older version of the game/.test(sav.problem)) fail(`old save: ${JSON.stringify(sav)}`);
const prob = await zeus(() => document.querySelector('.welcome .problem')?.textContent ?? '');
if (!/couldn’t be opened/.test(prob)) fail(`old save message: ${prob}`);
await zeus(() => localStorage.setItem('zeus-remake.save.manual', '{"format":"zeus-remake-save","save":1,"state":'));
await open('#saved');
if (!/damaged/.test((await zeus(() => window.__zeus.saves())).problem)) fail('a damaged save did not say so');
// Building in a demo leaves the autosave alone; on the bare link it turns it on, and leaving the page then saves it.
await zeus(() => localStorage.clear());
await open('#town-paused');
if ((await zeus(() => window.__zeus.saves())).autosaving) fail('#town autosaves before anything is built');
await zeus(() => window.__zeus.tool('road'));
p = await at(70.5, 47.5);
await page.mouse.move(p.x, p.y);
await page.mouse.down();
p = await at(74.5, 47.5);
await page.mouse.move(p.x, p.y, { steps: 4 });
await page.mouse.up();
await frames(2);
if ((await zeus(() => window.__zeus.saves())).autosaving) fail('building a road in #town turned the autosave on');
await zeus(() => dispatchEvent(new Event('pagehide')));
if ((await zeus(() => window.__zeus.saves())).auto) fail('leaving #town after building in it autosaved');
await page.click('.saves-btn');
await frames(1);
if (!/prepared town/.test(await zeus(() => document.querySelector('.saves')?.textContent ?? ''))) fail('the saves card in #town does not say a prepared town waits for a save by hand');
await page.click('.saves .close');
await open('#');
await page.keyboard.press('Escape');
await zeus(() => window.__zeus.jump({ x: 10, z: 79, yaw: 0, dist: 24, tilt: 0 }));
await frames(3);
await zeus(() => window.__zeus.tool('road'));
p = await at(0.5, 80.5);
await page.mouse.move(p.x, p.y);
await page.mouse.down();
p = await at(8.5, 80.5);
await page.mouse.move(p.x, p.y, { steps: 4 });
await page.mouse.up();
await frames(2);
if (!(await zeus(() => window.__zeus.saves())).autosaving) fail('building a road on the bare link did not turn the autosave on');
await zeus(() => dispatchEvent(new Event('pagehide')));
if (!(await zeus(() => window.__zeus.saves())).auto?.label) fail('leaving the page did not autosave');
// #continue opens the newest save.
await open('#continue-paused');
if (!(await zeus(() => window.__zeus.saves())).loaded) fail('#continue did not open the autosave');
// #missing: the bread line shows without hovering.
await open('#missing-paused');
const bread = await zeus(() => window.__zeus.townLines());
if (!bread.some((l) => /^Bread: the farms grow about [\d,]+ measures/.test(l))) fail(`#missing has no bread line: ${JSON.stringify(bread)}`);
// #workers: the workers line.
await open('#workers-paused');
if (!(await zeus(() => window.__zeus.townLines())).some((l) => /^Workers: \d+ jobs? unfilled/.test(l))) fail('#workers has no workers line');
// Slice 8: coin and the ledger.
// #ledger: the ledger open on #town, adding up by kind; Esc closes it, $ and the drachmas open it.
await open('#ledger-paused');
c = await city();
if (!(c.ledgerOpen && c.offices === 3 && c.taxRate === 2 && c.owed === 0)) fail(`#ledger: ${JSON.stringify(c)}`);
let lt = await zeus(() => window.__zeus.ledgerText());
if (!/The treasury[\s\S]*Coming in[\s\S]*Taxes (on|by|below|in|at) [\s\S]*Going out[\s\S]*Wages · farms[\s\S]*Net[\s\S]*Taxes are fair/.test(lt)) fail(`ledger text: ${lt}`);
await page.keyboard.press('Escape');
await frames(2);
if ((await city()).ledgerOpen) fail('Esc did not close the ledger');
await page.keyboard.press('$');
await frames(2);
if (!(await city()).ledgerOpen) fail('$ did not open the ledger');
await page.click('.stat.money');
await frames(2);
if ((await city()).ledgerOpen) fail('clicking the drachmas did not close the ledger');
// The tax rate: the chip opens the five rates, and picking one goes through the sim.
await page.click('.rate-chip');
await frames(1);
if (!(await city()).ratesOpen) fail('the rate chip did not open the rates');
await page.click('.rates .rate[data-rate="3"]');
await frames(2);
c = await city();
const chipText = await zeus(() => document.querySelector('.rate-chip')?.textContent ?? '');
if (!(c.taxRate === 3 && !c.ratesOpen && /heavy/.test(chipText))) fail(`picking heavy taxes: ${chipText} ${JSON.stringify(c)}`);
// J: the tax overlay.
await page.keyboard.press('j');
await frames(2);
if ((await city()).overlayMode !== 'tax') fail('J did not show the tax overlay');
// #collector: following the tax collector with the tax overlay on; hovering him says what he carries.
await open('#collector');
c = await city();
if (!(c.following && c.overlayMode === 'tax' && c.collectors > 0)) fail(`#collector: ${JSON.stringify(c)}`);
if (!/tax collector/.test(await zeus(() => document.querySelector('.follow-chip')?.textContent ?? ''))) fail('#collector follow chip does not name the tax collector');
await page.waitForFunction(() => window.__zeus.walker('tax') !== null, null, { timeout: 120000 });
await zeus(() => window.__zeus.speed('paused'));
await frames(2);
const tc = await zeus(() => window.__zeus.walker('tax'));
if (tc) {
  await page.mouse.move(tc.x, tc.y);
  await frames(2);
  const tt = await tip();
  if (!/^Tax collector/.test(tt ?? '')) fail(`hovering the tax collector: ${tt}`);
}
// #taxes: the tax office tool and its preview over the street no collector reaches; placing one.
await open('#taxes-paused');
c = await city();
if (!(c.tool === 'taxoffice' && c.overlayMode === 'tax' && c.offices === 2)) fail(`#taxes: ${JSON.stringify(c)}`);
p = await at(101, 43);
await page.mouse.move(p.x, p.y);
await page.mouse.move(p.x + 1, p.y + 1);
await frames(2);
const ot = await tip();
if (!/^Tax office · 150 dr[\s\S]*would reach \d+ homes · \d+ no collector has called on this month/.test(ot ?? '')) fail(`tax office tip: ${ot}`);
await page.mouse.down();
await page.mouse.up();
await frames(2);
if ((await city()).offices !== 3) fail('clicking with the tax office tool did not build one');
// #harsh: the taxes harsh, a household that sent someone away open, saying why.
await open('#harsh-paused');
c = await city();
pt = await panelText();
if (!(c.taxRate === 4 && c.panel > 0 && /Taxes are harsh/.test(pt ?? ''))) fail(`#harsh: ${pt} ${JSON.stringify(c)}`);
// #dry: wages owed, the money line says so, and the ledger notes it.
await open('#dry-paused');
c = await city();
const dryLines = await zeus(() => window.__zeus.townLines());
if (!(c.owed > 0 && c.taxRate === 0 && dryLines.some((l) => /^Money: the treasury can’t pay this month’s wages/.test(l)))) fail(`#dry: ${JSON.stringify(dryLines)} ${JSON.stringify(c)}`);
await zeus(() => window.__zeus.ledger(true));
await frames(2);
if (!/owes [\d,]+ dr of this month’s wages/.test(await zeus(() => window.__zeus.ledgerText()))) fail('#dry ledger does not note the owed wages');
// Slice 9. #hunter: following a hunter from the lodge, herds on the hills, goats at the dairy.
await open('#hunter');
c = await city();
if (!(c.following && c.lodges > 0 && c.dairies > 0 && c.hunters > 0 && c.herdHead > 0 && c.animals > 0)) fail(`#hunter: ${JSON.stringify(c)}`);
if (!/hunter/.test(await zeus(() => document.querySelector('.follow-chip')?.textContent ?? ''))) fail('#hunter follow chip does not name the hunter');
// #dairy: hovering the dairy says how much cheese it holds; its goats are drawn.
await open('#dairy-paused');
c = await city();
if (!(c.dairies > 0 && c.animals > c.herdHead)) fail(`#dairy: ${JSON.stringify(c)}`);
p = await at(51.5, 39.5);
await page.mouse.move(p.x, p.y);
await page.mouse.move(p.x + 1, p.y + 1);
await frames(2);
const dt = await tip();
if (!/^A dairy · [\d,]+ of [\d,]+ measures of cheese/.test(dt ?? '')) fail(`hovering the dairy: ${dt}`);
// #table: the food variety overlay and its legend; the panel open on a blessed cottage with only bread, saying it wants cheese.
await open('#table-paused');
c = await city();
const legendText = await zeus(() => (document.querySelector('.legend')?.hidden ? '' : document.querySelector('.legend')?.textContent ?? ''));
pt = await panelText();
if (!(c.overlayMode === 'variety' && c.dairies === 1 && c.panel > 0 && /On the table/.test(legendText) && /two kinds of food[\s\S]*cheese/.test(pt ?? ''))) fail(`#table: ${legendText} ${pt} ${JSON.stringify(c)}`);
// L cycles the food overlay, then the variety overlay, then oil, then off.
const ls = [];
for (let i = 0; i < 4; i++) {
  await page.keyboard.press('l');
  await frames(1);
  ls.push((await city()).overlay ? (await city()).overlayMode : 'off');
}
if (ls.join() !== 'oil,off,food,variety') fail(`L did not cycle oil, off, food, variety (${ls})`);
// #overhunt: three lodges after one valley's deer; the lodge tool beside the lane says the game is shared and thin.
await open('#overhunt-paused');
c = await city();
const herds = await zeus(() => window.__zeus.herds());
if (!(c.tool === 'lodge' && c.lodges === 3 && herds.some((h) => h.kind === 'deer' && h.head <= 3))) fail(`#overhunt: ${JSON.stringify(herds)} ${JSON.stringify(c)}`);
await zeus(() => window.__zeus.jump({ x: 26, z: 52, yaw: 0.9, dist: 20, tilt: -0.1 }));
await frames(3);
p = await at(28.5, 52.5);
await page.mouse.move(p.x, p.y);
await page.mouse.move(p.x + 1, p.y + 1);
await frames(2);
const lodgeTip = await tip();
if (!/^Hunting lodge · 200 dr[\s\S]*Game in reach: the deer[\s\S]*shared with the 3 lodges/.test(lodgeTip ?? '')) fail(`lodge tip: ${lodgeTip}`);
// Slice 10. #grove: the grove tool over the dry slope says how good the ground is; a click builds one; K twice on the agora adds the oil stall.
await open('#grove-paused');
c = await city();
if (!(c.tool === 'grove' && c.groves === 0 && c.oilStalls === 0 && c.overlayMode === 'oil')) fail(`#grove: ${JSON.stringify(c)}`);
const groveTipAt = async (x, z) => {
  p = await at(x, z);
  await page.mouse.move(p.x, p.y);
  await page.mouse.move(p.x + 1, p.y + 1);
  await frames(2);
  return tip();
};
let gt = await groveTipAt(28.5, 61.5);
if (!/^Olive grove · [\d,]+ dr[\s\S]*olive/.test(gt ?? '')) fail(`grove tool tip: ${gt}`);
const money0 = c.money;
await page.mouse.click(p.x, p.y);
await frames(2);
c = await city();
if (!(c.groves === 1 && c.money < money0)) fail(`clicking the grove tool built nothing: ${gt} ${JSON.stringify(c)}`);
// K twice: the oil stall tool; clicking the lane's agora adds its stall.
await page.keyboard.press('k');
await page.keyboard.press('k');
await frames(1);
if ((await city()).tool !== 'stall') fail(`K twice did not pick the oil stall (${(await city()).tool})`);
await zeus(() => window.__zeus.jump({ x: 28.5, z: 49.5, yaw: 0.9, dist: 14, tilt: 0 }));
await frames(4);
gt = await groveTipAt(28.5, 49.5);
const money1 = (await city()).money;
await page.mouse.click(p.x, p.y);
await frames(2);
c = await city();
if (!(c.oilStalls === 1 && c.money < money1)) fail(`the oil stall tool on the agora: ${gt} ${JSON.stringify(c)}`);
// #oil: the grove, the press and the storehouse say what they hold; carts carry olives and oil.
await open('#oil-paused');
c = await city();
if (!(c.groves >= 1 && c.presses === 1 && c.storehouses === 1 && c.oilStalls === 2 && c.oiled > 20)) fail(`#oil: ${JSON.stringify(c)}`);
for (const [kind, re] of [
  ['grove', /^An olive grove · olive ground \d+%/],
  ['press', /^An olive press · [\d,]+ of [\d,]+ jars of oil/],
  ['storehouse', /^A storehouse · [\d,]+ of [\d,]+ jars of oil/],
]) {
  const b = await zeus((k) => window.__zeus.buildingsOf(k)[0], kind);
  await zeus((v) => window.__zeus.jump(v), { x: b.x + 1.5, z: b.z + 1.5, yaw: 2.4, dist: 9, tilt: 0.1 });
  await frames(4);
  const t = await groveTipAt(b.x + 1.5, b.z + 1.5);
  if (!re.test(t ?? '')) fail(`hovering the ${kind}: ${t}`);
}
// #oilvendor: following the oil vendor, the oil overlay on.
await open('#oilvendor');
c = await city();
if (!(c.following && c.overlay && c.overlayMode === 'oil' && c.oilVendors > 0)) fail(`#oilvendor: ${JSON.stringify(c)}`);
if (!/oil vendor/.test(await zeus(() => document.querySelector('.follow-chip')?.textContent ?? ''))) fail('#oilvendor follow chip does not name the oil vendor');
// #nooil: fine houses warn for want of oil; the panel says why; a shortfall line names oil.
await open('#nooil');
c = await city();
pt = await panelText();
const oilLines = await zeus(() => window.__zeus.townLines());
if (!(c.noOil > 0 && c.presses === 0 && c.panel > 0 && /Oil/.test(pt ?? '') && oilLines.some((l) => /^Oil: /.test(l)))) fail(`#nooil: ${JSON.stringify(oilLines)} ${pt} ${JSON.stringify(c)}`);
if (errors.length) fail('page errors (slice 10):\n' + errors.join('\n'));
// A phase 1 save opens: rent turned into taxes, and the welcome back says to build a tax office.
await zeus((text) => localStorage.setItem('zeus-remake.save.manual', text), gunzipSync(readFileSync('tests/fixtures/phase1-food.save.json.gz')).toString());
await open('#saved-paused');
c = await city();
const back = await zeus(() => document.querySelector('.save-note')?.textContent ?? '');
if (!(c.offices === 0 && c.taxRate === 2 && c.population > 400 && /Rent is gone[\s\S]*Build a tax office/.test(back))) fail(`phase 1 save: ${back} ${JSON.stringify(c)}`);
if (!(await zeus(() => window.__zeus.townLines())).some((l) => /^Money: no taxes come in without a tax office/.test(l))) fail('the phase 1 town has no money line');
await zeus(() => localStorage.clear());
if (errors.length) fail('page errors:\n' + errors.join('\n'));
// Storage that throws on every touch: saving says it isn't available, and the game plays on.
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('SecurityError: storage is blocked');
      },
    });
  });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto(url + '#town');
  await pg.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
  const t0 = await pg.evaluate(() => window.__zeus.tick());
  await pg.keyboard.press('Control+s');
  await pg.click('.mute-btn');
  await pg.waitForFunction((t) => window.__zeus.tick() > t + 5, t0, { timeout: 120000 });
  const blocked = await pg.evaluate(() => ({ s: window.__zeus.saves(), note: document.querySelector('.save-note')?.textContent ?? '' }));
  if (blocked.s.available || !/Saving isn’t available in this window/.test(blocked.note)) fail(`blocked storage: ${JSON.stringify(blocked)}`);
  await pg.click('.saves-btn');
  const bcard = await pg.evaluate(() => document.querySelector('.saves')?.textContent ?? '');
  if (!/Saving isn’t available in this window/.test(bcard)) fail(`blocked storage card: ${bcard}`);
  await pg.goto(url + '#continue');
  await pg.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
  if (!/isn’t available/.test((await pg.evaluate(() => window.__zeus.saves())).problem)) fail('#continue with blocked storage did not say why');
  if (errs.length) fail('page errors with blocked storage:\n' + errs.join('\n'));
  await ctx.close();
}

console.log(process.exitCode ? 'smoke: FAILED' : 'smoke: ok (grove tool and tip, oil stall tool, grove, press and storehouse hovers, oil vendor follow and overlay, oil shortfall line and panel, hunter follow, dairy hover and goats, variety overlay and legend, L cycling, over-hunting and the lodge tip, ledger, tax rate, tax overlay, collector follow and hover, tax office tool, harsh taxes, unpaid wages, phase 1 save, welcome card, sound and mute, #town, saving by hand and by itself, opening saves, old and damaged saves, blocked storage, shortfall lines, shrine and theatre tools, townhouses, fine houses, religion and culture overlays, actor follow, wide signs, households, panel, signs, trouble count, what’s missing, decline, pan, orbit, zoom, quarter turn, speed, pause, all views, hash links, roads, plots, settlers, clearing, undo, fountain tool and preview, overlay, carrier hover and follow, huts, route cache, food town and overlay, vendor hover and follow, workers, farm tool, bridge drag and undo, carts on the bridge, clearing a farm)');
await browser.close();
server.close();
