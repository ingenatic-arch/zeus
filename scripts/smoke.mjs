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
if (!/^A fine house[\s\S]*Plays · last[\s\S]*To become a villa: wine/.test(pt ?? '')) fail(`fine house panel: ${pt}`);
// #actor: following the actor.
await open('#actor');
if (!(await city()).following) fail('#actor is not following the actor');
// #closed: the theatre gone and the west street cut; a sign over every warned home, and the panel says what goes.
// (Since slice 11 the culture town's homes are fine and fleeced, so the cut street goes without water and plays but not three needs at once:
// the wide signs are checked on a villa in the slice 11 part below.)
await open('#closed');
c = await city();
if (!(c.theatres === 0 && c.warned >= 10 && c.signs >= c.warned && c.panel > 0)) fail(`#closed: ${JSON.stringify(c)}`);
pt = await panelText();
if (!/they give up the (townhouse for a cottage|fine house for a townhouse)/.test(pt ?? '')) fail(`#closed panel: ${pt}`);

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
// L cycles the food overlay, then the variety overlay, then oil, fleece, wine, then off.
const ls = [];
for (let i = 0; i < 6; i++) {
  await page.keyboard.press('l');
  await frames(1);
  ls.push((await city()).overlay ? (await city()).overlayMode : 'off');
}
if (ls.join() !== 'oil,fleece,wine,off,food,variety') fail(`L did not cycle oil, fleece, wine, off, food, variety (${ls})`);
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
// Hovering: with a pattern, tried up to three times (a slow software renderer can draw the tip a frame or two late).
const groveTipAt = async (x, z, re = null) => {
  let t = null;
  for (let i = 0; i < 3; i++) {
    p = await at(x, z);
    await page.mouse.move(p.x + (i % 2 ? -1 : 0), p.y);
    await page.mouse.move(p.x + 1, p.y + 1);
    await frames(2 + i * 2);
    t = await tip();
    if (!re || re.test(t ?? '')) return t;
  }
  return t;
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
  const t = await groveTipAt(b.x + 1.5, b.z + 1.5, re);
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
// Slice 11: fleece, wine and the villa.
// #pasture: a sheep pasture, a fleece stall, fine houses with fleece; the pasture and the storehouse say what they hold.
await open('#pasture-paused');
c = await city();
if (!(c.pastures >= 1 && c.fleeceStalls >= 1 && c.fleeced > 5 && c.fine > 5)) fail(`#pasture: ${JSON.stringify(c)}`);
for (const [kind, re] of [
  ['pasture', /^A sheep pasture · [\d,]+ of [\d,]+ bales of fleece/],
  ['storehouse', /^A storehouse · [\s\S]*bales of fleece/],
]) {
  const b = await zeus((k) => window.__zeus.buildingsOf(k)[0], kind);
  await zeus((v) => window.__zeus.jump(v), { x: b.x + 1.5, z: b.z + 1.5, yaw: 2.4, dist: 9, tilt: 0.1 });
  await frames(4);
  const t = await groveTipAt(b.x + 1.5, b.z + 1.5, re);
  if (!re.test(t ?? '')) fail(`hovering the ${kind} in #pasture: ${t}`);
}
// #fleecevendor and #winevendor: following the vendor, the overlay on. (Opened paused: #winevendor's vendor is home from his round four days after it opens, and a slow first frame could miss him.)
for (const [hash, mode, count, name] of [['#fleecevendor', 'fleece', 'fleeceVendors', 'fleece vendor'], ['#winevendor', 'wine', 'wineVendors', 'wine vendor']]) {
  await open(`${hash}-paused`);
  c = await city();
  if (!(c.following && c.overlay && c.overlayMode === mode && c[count] > 0)) fail(`${hash}: ${JSON.stringify(c)}`);
  const chip = await zeus(() => document.querySelector('.follow-chip')?.textContent ?? '');
  if (!chip.includes(name)) fail(`${hash} follow chip: ${chip}`);
}
// #vineyard: the vineyard tool in hand; its tip names the vine ground.
await open('#vineyard-paused');
c = await city();
if (c.tool !== 'vineyard') fail(`#vineyard tool: ${c.tool}`);
gt = await groveTipAt(7.5, 78.5);
if (!/vine/i.test(gt ?? '')) fail(`#vineyard tip: ${gt}`);
// #winery: following an ox cart from the winery; the winery and the vineyard say what they hold.
await open('#winery-paused');
c = await city();
if (!(c.following && c.vineyards >= 1 && c.wineries >= 1)) fail(`#winery: ${JSON.stringify(c)}`);
for (const [kind, re] of [
  ['vineyard', /^A vineyard · vine ground \d+%/],
  ['winery', /^A winery · [\d,]+ of [\d,]+ amphorae of wine/],
]) {
  const b = await zeus((k) => window.__zeus.buildingsOf(k)[0], kind);
  await zeus((v) => window.__zeus.jump(v), { x: b.x + 1.5, z: b.z + 1.5, yaw: 2.4, dist: 9, tilt: 0.1 });
  await frames(4);
  const t = await groveTipAt(b.x + 1.5, b.z + 1.5, re);
  if (!re.test(t ?? '')) fail(`hovering the ${kind} in #winery: ${t}`);
}
// #villas: ten or more villas, all three stalls, a villa's panel; seven needs at once draw the widest sign.
await open('#villas-paused');
c = await city();
if (!(c.villas >= 10 && c.fleeceStalls >= 1 && c.wineStalls >= 1 && c.oilStalls >= 1 && c.wined >= 10 && c.panel > 0)) fail(`#villas: ${JSON.stringify(c)}`);
pt = await panelText();
if (!/^A villa[\s\S]*Fleece · lasts[\s\S]*Wine · lasts[\s\S]*A villa is as grand as homes get/.test(pt ?? '')) fail(`villa panel: ${pt}`);
const villa = await zeus(() => window.__zeus.homes().find((h) => h.level === 6));
await zeus((id) => window.__zeus.warnAll(id), villa.id);
await frames(4);
if (!(await zeus(() => window.__zeus.meshes().filter((m) => m.name === 'sign-rim-7').reduce((n, m) => n + m.count, 0) >= 1))) fail('#villas: no seven-wide sign drawn');
if (errors.length) fail('page errors (slice 11):\n' + errors.join('\n'));
// Slice 12: fire and collapse.
// #fire: a home smouldering on the east street, marks over the buildings past half, the watch post tool and the fire overlay; a town line names the place.
await open('#fire-paused');
c = await city();
let lines12 = await zeus(() => window.__zeus.townLines());
if (!(c.hazards && c.smoulders >= 1 && c.fires === 0 && c.watchposts >= 2 && c.tool === 'watchpost' && c.overlayMode === 'fire' && c.hazardMarks > 0 && c.smokePuffs > 0)) fail(`#fire: ${JSON.stringify(c)}`);
if (!lines12.some((l) => /^Smoke (by|on|in|at|below) [^:]+: the .+ is smouldering and bursts into flame in \d+ days? unless a watchman walks by/.test(l))) fail(`#fire town line: ${JSON.stringify(lines12)}`);
gt = await groveTipAt(87, 43, /^Watch post · \d+ dr[\s\S]*watchman would reach \d+ buildings?/);
if (!/^Watch post · \d+ dr[\s\S]*watchman would reach \d+ buildings?/.test(gt ?? '')) fail(`watch post tool tip: ${gt}`);
await page.keyboard.press('Escape');
const smoulder = await zeus(() => window.__zeus.hazardsOf().find((o) => o.fire === 1));
await zeus((v) => window.__zeus.jump(v), { x: smoulder.x + 1, z: smoulder.z + 1, yaw: 2.4, dist: 9, tilt: 0.1 });
await frames(4);
gt = await groveTipAt(smoulder.x + 1, smoulder.z + 1, /Smouldering · it bursts into flame in \d+ days?/);
if (!/Smouldering · it bursts into flame in \d+ days?/.test(gt ?? '')) fail(`hovering the smouldering home: ${gt}`);
// #blaze: two fires, flames and smoke drawn, the fire line.
await open('#blaze-paused');
c = await city();
lines12 = await zeus(() => window.__zeus.townLines());
if (!(c.fires >= 2 && c.flames > 0 && c.smokePuffs > 0)) fail(`#blaze: ${JSON.stringify(c)}`);
if (!lines12.some((l) => /^Fire [^:]+: the .+ is burning and falls in \d+ days?/.test(l))) fail(`#blaze town line: ${JSON.stringify(lines12)}`);
// #rubble: heaps where buildings burnt down; hovering one says what stood there; clearing one costs its fee.
await open('#rubble-paused');
c = await city();
if (!(c.rubble >= 3 && c.tool === 'clear')) fail(`#rubble: ${JSON.stringify(c)}`);
lines12 = await zeus(() => window.__zeus.townLines());
if (!lines12.some((l) => /^Rubble [^:]+: .*Clear (it|them) with the clear tool \(X\)/.test(l))) fail(`#rubble town line: ${JSON.stringify(lines12)}`);
const heap = await zeus(() => window.__zeus.buildingsOf('rubble')[0]);
await zeus((v) => window.__zeus.jump(v), { x: heap.x + 1, z: heap.z + 1, yaw: 0.7, dist: 9, tilt: 0.1 });
await frames(4);
gt = await groveTipAt(heap.x + 1, heap.z + 1, /\d+ dr/);
if (!/rubble[\s\S]*\d+ dr/i.test(gt ?? '')) fail(`the clear tool over rubble: ${gt}`);
const before12 = c;
await page.mouse.down();
await page.mouse.up();
await frames(3);
c = await city();
if (!(c.rubble === before12.rubble - 1 && before12.money - c.money >= 10 && before12.money - c.money <= 20)) fail(`clearing rubble: ${before12.rubble} -> ${c.rubble}, ${before12.money} -> ${c.money} dr`);
await page.keyboard.press('Escape');
const heap2 = await zeus(() => window.__zeus.buildingsOf('rubble')[0]);
await zeus((v) => window.__zeus.jump(v), { x: heap2.x + 1, z: heap2.z + 1, yaw: 0.7, dist: 9, tilt: 0.1 });
await frames(4);
gt = await groveTipAt(heap2.x + 1, heap2.z + 1, /^Rubble · (burnt|fallen) down/);
if (!/^Rubble · (burnt|fallen) down[\s\S]*stood here[\s\S]*Clear it with the clear tool \(X\) for \d+ dr/.test(gt ?? '')) fail(`hovering rubble: ${gt}`);
// #creak: the agora creaking, the wear overlay and the architect's office tool; a creaking line.
await open('#creak-paused');
c = await city();
lines12 = await zeus(() => window.__zeus.townLines());
if (!(c.creaks >= 1 && c.tool === 'architect' && c.overlayMode === 'wear' && c.architects >= 1)) fail(`#creak: ${JSON.stringify(c)}`);
if (!lines12.some((l) => /^Creaking [^:]+: the .+ falls down in \d+ days? unless an inspector walks by/.test(l))) fail(`#creak town line: ${JSON.stringify(lines12)}`);
// #watchman and #inspector: following them, the overlay on.
for (const [hash, mode, count, name] of [['#watchman', 'fire', 'watchmen', 'watchman'], ['#inspector', 'wear', 'inspectors', 'inspector']]) {
  await open(hash);
  c = await city();
  if (!(c.following && c.overlay && c.overlayMode === mode && c[count] > 0)) fail(`${hash}: ${JSON.stringify(c)}`);
  const chip = await zeus(() => document.querySelector('.follow-chip')?.textContent ?? '');
  if (!chip.includes(name)) fail(`${hash} follow chip: ${chip}`);
  const w = await zeus((k) => window.__zeus.walker(k), name);
  if (w) {
    await page.mouse.move(w.x, w.y);
    await frames(2);
    const t = await tip();
    if (t && !new RegExp(`^${name[0].toUpperCase()}${name.slice(1)}`).test(t)) fail(`hovering the ${name}: ${t}`);
  }
}
// Z cycles the offices and J the overlays: tax, fire risk, wear, off. The build bar groups them: a click opens a row, a click in it picks.
await open('#town-paused');
for (const want of ['taxoffice', 'watchpost', 'architect', 'taxoffice']) {
  await page.keyboard.press('z');
  await frames(1);
  c = await city();
  if (c.tool !== want) fail(`Z cycling: wanted ${want}, got ${c.tool}`);
}
await page.keyboard.press('Escape');
for (const want of ['tax', 'fire', 'wear', null]) {
  await page.keyboard.press('j');
  await frames(2);
  c = await city();
  if ((c.overlay ? c.overlayMode : null) !== want) fail(`J cycling: wanted ${want}, got ${c.overlayMode} (${c.overlay})`);
}
const barButtons = await zeus(() => document.querySelectorAll('.buildbar > button').length);
if (barButtons > 24) fail(`the build bar has ${barButtons} buttons`);
await page.click('.btn.tool.group[data-group="makers"]');
await frames(1);
const rowOpen = await zeus(() => ({ open: !document.querySelector('.group-row[data-group="makers"]').hidden, n: document.querySelectorAll('.group-row[data-group="makers"] button').length }));
if (!(rowOpen.open && rowOpen.n === 8)) fail(`the farms row: ${JSON.stringify(rowOpen)}`);
await page.click('.group-row[data-group="makers"] button[data-tool="lodge"]');
await frames(1);
c = await city();
const rowAfter = await zeus(() => !document.querySelector('.group-row[data-group="makers"]').hidden);
if (c.tool !== 'lodge' || rowAfter) fail(`picking the lodge from its row: ${c.tool}, row open ${rowAfter}`);
const fits = await zeus(() => {
  const r = document.querySelector('.buildbar').getBoundingClientRect();
  return r.left >= 0 && r.right <= innerWidth && document.querySelector('.buildbar').scrollWidth <= document.querySelector('.buildbar').clientWidth + 1;
});
if (!fits) fail('the build bar does not fit at 1280 wide');
await page.keyboard.press('Escape');
// A slice 11 (version 10) save opens safe and sound, says what changed, and its risk builds from here.
await zeus((text) => localStorage.setItem('zeus-remake.save.manual', text), gunzipSync(readFileSync('tests/fixtures/slice11-town.save.json.gz')).toString());
await open('#saved-paused');
c = await city();
const back12 = await zeus(() => document.querySelector('.save-note')?.textContent ?? '');
if (!(c.hazards && c.smoulders === 0 && c.creaks === 0 && c.rubble === 0 && c.hazardMarks === 0 && /Buildings can now catch fire and wear out/.test(back12))) fail(`slice 11 save: ${back12} ${JSON.stringify(c)}`);
await zeus(() => localStorage.clear());
if (errors.length) fail('page errors (slice 12):\n' + errors.join('\n'));
// Slice 13: the ship comes in.
// #trade: the trading post tool in hand on the bay shore; its tip over a good spot (jetty, prices), the refusal inland, the tint.
await open('#trade-paused');
c = await city();
if (!(c.tool === 'trading' && c.tradingPosts === 0 && c.shipChip === '')) fail(`#trade: ${JSON.stringify(c)}`);
await zeus((v) => window.__zeus.jump(v), { x: 74, z: 70, yaw: 2.65, dist: 18, tilt: 0.1 });
await frames(3);
gt = await groveTipAt(74.5, 70.5, /^Trading post · \d+ dr/);
if (!/^Trading post · \d+ dr · 6 workers[\s\S]*A jetty runs \d+ tiles? out to deep water[\s\S]*She pays for every 100: wheat 15[\s\S]*wine 80 dr[\s\S]*the nearest granary is a \d+-day round trip, the nearest storehouse is a \d+-day round trip/.test(gt ?? '')) fail(`trading post tool tip: ${gt}`);
gt = await groveTipAt(70.5, 62.5, /^A trading post goes on the bay shore/);
if (!/^A trading post goes on the bay shore: no sea beside it here/.test(gt ?? '')) fail(`trading post refused inland: ${gt}`);
// Building it: the countdown appears in the top bar and the post's panel.
const money13 = (await city()).money;
p = await at(74.5, 70.5);
await page.mouse.move(p.x, p.y);
await frames(2);
await page.mouse.down();
await page.mouse.up();
await frames(3);
c = await city();
if (!(c.tradingPosts === 1 && money13 - c.money === 250 && c.shipChip === '90 d')) fail(`building the trading post: ${JSON.stringify(c)} (was ${money13} dr)`);
// G cycles the granary, the storehouse and the trading post.
await page.keyboard.press('Escape');
for (const want of ['granary', 'storehouse', 'trading', 'granary']) {
  await page.keyboard.press('g');
  await frames(1);
  c = await city();
  if (c.tool !== want) fail(`G cycling: wanted ${want}, got ${c.tool}`);
}
await page.keyboard.press('Escape');
// #quay: goods ticked, dockers on the road, goods stacked on the quay; the panel open with its rows, ticks and keeps.
await open('#quay-paused');
c = await city();
if (!(c.tradingPosts === 1 && c.dockers >= 1 && c.onQuay >= 1800 && c.tradeOpen && /^\d+ d$/.test(c.shipChip))) fail(`#quay: ${JSON.stringify(c)}`);
let tt = await zeus(() => window.__zeus.tradeText());
if (!/The trading post[\s\S]*Ship in \d+ d[\s\S]*Wheat\s*15[\s\S]*Meat\s*30[\s\S]*Cheese\s*30[\s\S]*Oil\s*60[\s\S]*Fleece\s*45[\s\S]*Wine\s*80[\s\S]*On the quay: [\d,]+ wheat[\s\S]*No ship has called yet/.test(tt ?? '')) fail(`#quay panel: ${tt}`);
// Unticking a good and raising a keep go through the command queue.
const keep0 = await zeus(() => document.querySelector('.trade td.keep span')?.textContent ?? '');
await page.click('.trade button[data-keep="0"][data-by="1"]');
await frames(3);
const keep1 = await zeus(() => document.querySelector('.trade td.keep span')?.textContent ?? '');
if (!(keep0 === '1,600' && keep1 === '1,800')) fail(`keep + for wheat: ${keep0} -> ${keep1}`);
await page.click('.trade input[data-sell="1"]');
await frames(3);
const meatTick = await zeus(() => document.querySelector('.trade input[data-sell="1"]').checked);
if (meatTick) fail('unticking meat did not take');
// Esc closes the panel; hovering the post says what is on the quay and when she is due; clicking it opens the panel again.
await page.keyboard.press('Escape');
await frames(1);
if ((await city()).tradeOpen) fail('Esc did not close the trade panel');
const post13 = await zeus(() => window.__zeus.buildingsOf('trading')[0]);
await zeus((v) => window.__zeus.jump(v), { x: post13.x + 1.5, z: post13.z + 1.5, yaw: 2.65, dist: 14, tilt: 0.1 });
await frames(4);
gt = await groveTipAt(post13.x + 1.5, post13.z + 1.5, /^The trading post · /);
if (!/^The trading post · on the quay: [\d,]+ wheat[\s\S]*Workers: 6 of 6[\s\S]*The next ship is due in \d+ days[\s\S]*Click for the trade panel/.test(gt ?? '')) fail(`hovering the trading post: ${gt}`);
await page.mouse.down();
await page.mouse.up();
await frames(2);
if (!(await city()).tradeOpen) fail('clicking the trading post did not open its panel');
// A docker: following him, and his tip.
const dk = await zeus(() => window.__zeus.walker('docker'));
if (dk) {
  await page.mouse.move(dk.x, dk.y);
  await frames(2);
  const t = await tip();
  if (t && !/^Docker\n(Going to the (granary|storehouse) for|Loading|Bringing [\d,]+ .+ to the quay|Going back to the quay|Taking)/.test(t)) fail(`hovering a docker: ${t}`);
}
// #sail: her sail on the horizon, the ship drawn far out, the town line and the chip saying so.
await open('#sail-paused');
let sh = await zeus(() => window.__zeus.ship());
lines12 = await zeus(() => window.__zeus.townLines());
if (!(sh.phase === 1 && sh.visible && sh.version === 'set' && Math.hypot(sh.x - 74.5, sh.z - 77.5) > 40)) fail(`#sail ship: ${JSON.stringify(sh)}`);
if (!lines12.some((l) => /^A sail on the horizon: the merchant ship ties up at the trading post in \d+ days?\. On the quay: /.test(l))) fail(`#sail town line: ${JSON.stringify(lines12)}`);
if (!(await zeus(() => window.__zeus.meshes().some((m) => m.name === 'ship-mesh')))) fail('#sail: the ship mesh is not drawn');
// #ship: tied up at the jetty, sail furled, loading; hovering her says so.
await open('#ship-paused');
sh = await zeus(() => window.__zeus.ship());
c = await city();
if (!(sh.phase === 2 && sh.visible && sh.version.startsWith('furled') && Math.hypot(sh.x - 74.5, sh.z - 77.5) < 0.5 && c.shipChip === 'In port')) fail(`#ship: ${JSON.stringify(sh)} chip ${c.shipChip}`);
await zeus((v) => window.__zeus.jump(v), { x: sh.x, z: sh.z, yaw: 2.3, dist: 16, tilt: -0.02 });
await frames(4);
p = await at(sh.x, sh.z);
await page.mouse.move(p.x, p.y - 20);
await page.mouse.move(p.x + 1, p.y - 19);
await frames(3);
gt = await tip();
if (!/^The merchant ship from Tyre\nThe ship is tied up at the jetty, loading/.test(gt ?? '')) fail(`hovering the ship: ${gt}`);
// #black: wages unpaid, the sail on the horizon; running on, she pays and the wages are paid.
await open('#black-paused');
c = await city();
if (!(c.owed > 0 && c.ledgerOpen && c.onQuay > 0)) fail(`#black: ${JSON.stringify(c)}`);
await page.keyboard.press('3');
await page.waitForFunction(() => window.__zeus.ship().visits > 0, null, { timeout: 600000, polling: 500 });
await page.keyboard.press('Space');
await frames(2);
c = await city();
if (!(c.owed === 0 && c.sales > 0 && c.money > 300)) fail(`#black after the visit: ${JSON.stringify(c)}`);
const led13 = await zeus(() => window.__zeus.ledgerText());
if (!/Sales · wheat/.test(led13 ?? '')) fail(`#black ledger: ${led13}`);
// A slice 12 (version 11) save opens without a post, says ships can call now.
await zeus((text) => localStorage.setItem('zeus-remake.save.manual', text), gunzipSync(readFileSync('tests/fixtures/slice12-town.save.json.gz')).toString());
await open('#saved-paused');
c = await city();
const back13 = await zeus(() => document.querySelector('.save-note')?.textContent ?? '');
if (!(c.tradingPosts === 0 && c.shipChip === '' && /Merchant ships now call: build a trading post/.test(back13))) fail(`slice 12 save: ${back13} ${JSON.stringify(c)}`);
await zeus(() => localStorage.clear());
if (errors.length) fail('page errors (slice 13):\n' + errors.join('\n'));
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

console.log(process.exitCode ? 'smoke: FAILED' : 'smoke: ok (trading post tool, tip and refusal, building it and the countdown, G cycling, #quay and the trade panel, keep and sell commands, post and docker hovers, #sail and the town line, #ship tied up and its tip, #black paid back, slice 12 save, fire, blaze, rubble and clearing it, creak, watchman and inspector follows and hovers, hazard town lines and tips, Z and J cycling, the grouped build bar, slice 11 save, pasture, fleece and wine vendor follows and overlays, vineyard tool and tip, winery follow and hovers, villas and their panel, the seven-wide sign, grove tool and tip, oil stall tool, grove, press and storehouse hovers, oil vendor follow and overlay, oil shortfall line and panel, hunter follow, dairy hover and goats, variety overlay and legend, L cycling, over-hunting and the lodge tip, ledger, tax rate, tax overlay, collector follow and hover, tax office tool, harsh taxes, unpaid wages, phase 1 save, welcome card, sound and mute, #town, saving by hand and by itself, opening saves, old and damaged saves, blocked storage, shortfall lines, shrine and theatre tools, townhouses, fine houses, religion and culture overlays, actor follow, wide signs, households, panel, signs, trouble count, what’s missing, decline, pan, orbit, zoom, quarter turn, speed, pause, all views, hash links, roads, plots, settlers, clearing, undo, fountain tool and preview, overlay, carrier hover and follow, huts, route cache, food town and overlay, vendor hover and follow, workers, farm tool, bridge drag and undo, carts on the bridge, clearing a farm)');
await browser.close();
server.close();
