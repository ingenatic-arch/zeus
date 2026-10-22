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
const frames = async (n, timeout = 60000) => {
  const f = await page.evaluate(() => window.__zeus.frames);
  await page.waitForFunction((f0) => window.__zeus.frames >= f0, f + n, { timeout });
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
// One in plain view: not under the household panel or the side panel (which narrows the view on a 1280-wide window).
const onCanvas = async (h) => {
  const q = await at(h.x + 1, h.z + 1);
  return page.evaluate(([x, y]) => document.elementFromPoint(x, y - 4)?.tagName === 'CANVAS', [q.x, q.y]);
};
let other = others.find((h) => Math.abs(h.x - 30) + Math.abs(h.z - 67) < 8) ?? others[0];
if (!(await onCanvas(other))) for (const h of others) if (await onCanvas(h)) { other = h; break; }
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
const undoTitle = await page.evaluate(() => document.querySelector('.boss[data-boss="undo"]')?.getAttribute('title'));
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
// (The panel catches up within a few frames: slow headless frames can leave it a beat behind.)
await page.waitForFunction(() => /^A hut/.test(window.__zeus.panelText() ?? ''), null, { timeout: 20000 }).catch(() => {});
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
// The bare link: a welcome card pointing at the control panel and #town; picking a tool puts it away.
await open('#');
if (!(await zeus(() => window.__zeus.welcome()))) fail('no welcome card on the bare link');
const wel = await zeus(() => ({ text: document.querySelector('.welcome')?.textContent ?? '', town: !!document.querySelector('.welcome a[href="#town"]') }));
if (!/panel on the right/.test(wel.text) || !wel.town) fail(`welcome card: ${JSON.stringify(wel)}`);
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
if (!(c.tents > 0 && c.huts > 0 && c.cottages > 0 && c.townhouses > 0 && c.fine > 0 && c.fountains > 0 && c.farms > 0 && c.granaries > 0 && c.agoras > 0 && c.shrines > 0 && c.theatres > 0 && c.bridges > 0 && c.population > 300 && c.population < 900)) fail(`#town: ${JSON.stringify(c)}`);
// No house is about to fall back (since slice 14's retuning #town opens just before the priestess comes by, so a few fine houses are warned about religion for a fortnight, with months to spare).
const townWarned = (await zeus(() => window.__zeus.homes())).filter((h) => h.warned && h.left < 300);
if (townWarned.length) fail(`#town opens with houses about to fall back: ${JSON.stringify(townWarned)}`);
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
// (Wait until a collector is out in plain view: the one followed may be resting at his office while another walks off the screen.)
await page.waitForFunction(() => {
  const p = window.__zeus.walker('tax');
  return p !== null && document.elementFromPoint(p.x, p.y)?.tagName === 'CANVAS';
}, null, { timeout: 120000 });
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
// Z cycles the offices and J the overlays: tax, fire risk, wear, off.
await open('#town-paused');
for (const want of ['taxoffice', 'watchpost', 'architect', 'taxoffice']) {
  await page.keyboard.press('z');
  await frames(1);
  c = await city();
  if (c.tool !== want) fail(`Z cycling: wanted ${want}, got ${c.tool}`);
}
await page.keyboard.press('Escape');
for (const want of ['tax', 'fire', 'wear', 'crime', null]) {
  await page.keyboard.press('j');
  await frames(2);
  c = await city();
  if ((c.overlay ? c.overlayMode : null) !== want) fail(`J cycling: wanted ${want}, got ${c.overlayMode} (${c.overlay})`);
}
// The control panel (a side slice): a tab for each kind of building; a well picks its building and opens nothing else; a key opens its tool's tab;
// the bosses round the minimap pick road and clear and list the overlays; it all fits at 1280 × 720.
const panelNow = () => zeus(() => ({ tab: window.__zeus.sideState().tab, tabs: document.querySelectorAll('.side-tab').length, wells: [...document.querySelectorAll('.side-wells .well')].map((w) => w.dataset.tool), lit: document.querySelector('.side-wells .well.on')?.dataset.tool ?? '', hint: document.querySelector('.tool-hint')?.hidden ? '' : (document.querySelector('.tool-hint')?.textContent ?? '') }));
let pn = await panelNow();
// (Slice 35: the Monuments tab makes ten.)
if (!(pn.tab === 'administration' && pn.tabs === 10)) fail(`the control panel after Z cycling: ${JSON.stringify(pn)}`);
await page.click('.side-tab[data-tab="husbandry"]');
await frames(1);
pn = await panelNow();
if (pn.wells.join() !== 'farm,lodge,dairy,grove,pasture,vineyard') fail(`the Husbandry tab's wells: ${JSON.stringify(pn)}`);
await page.click('.side-wells .well[data-tool="lodge"]');
await frames(1);
c = await city();
pn = await panelNow();
if (c.tool !== 'lodge' || pn.lit !== 'lodge' || !/herds/.test(pn.hint)) fail(`picking the lodge from its well: ${c.tool}, ${JSON.stringify(pn)}`);
await page.keyboard.press('k');
await frames(1);
pn = await panelNow();
c = await city();
if (!(c.tool === 'agora' && pn.tab === 'distribution' && pn.lit === 'agora')) fail(`K opens the Distribution tab: ${c.tool}, ${JSON.stringify(pn)}`);
await page.click('.boss[data-boss="road"]');
await frames(1);
c = await city();
if (c.tool !== 'road' || (await panelNow()).tab !== 'distribution') fail(`the road boss: ${c.tool}`);
await page.keyboard.press('Escape');
await page.click('.boss[data-boss="layers"]');
await frames(1);
if (await zeus(() => document.querySelector('.side-layers').hidden)) fail('the overlays boss did not list them');
await page.click('.side-layers [data-mode="water"]');
await frames(2);
c = await city();
if (c.overlayMode !== 'water' || !(await zeus(() => document.querySelector('.side-layers').hidden))) fail(`picking the water overlay from the list: ${c.overlayMode}`);
await page.keyboard.press('o');
const fits = await zeus(() => {
  const r = document.querySelector('.side').getBoundingClientRect();
  const w = document.querySelector('.side-wells').getBoundingClientRect();
  const top = document.querySelector('.topbar').getBoundingClientRect();
  return r.right <= innerWidth && r.bottom <= innerHeight && w.top < innerHeight && w.right <= innerWidth && top.right <= r.left;
});
if (!fits) fail('the control panel does not fit at 1280 × 720');
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
if (!/^Trading post · \d+ dr · 6 workers[\s\S]*A jetty runs \d+ tiles? out to deep water[\s\S]*She pays for every 100: wheat 20[\s\S]*wine 100 dr ·[\s\S]*the nearest granary is a \d+-day round trip, the nearest storehouse is a \d+-day round trip/.test(gt ?? '')) fail(`trading post tool tip: ${gt}`);
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
// G cycles the granary, the storehouse, the trading post and the caravan yard.
await page.keyboard.press('Escape');
for (const want of ['granary', 'storehouse', 'trading', 'yard', 'granary']) {
  await page.keyboard.press('g');
  await frames(1);
  c = await city();
  if (c.tool !== want) fail(`G cycling: wanted ${want}, got ${c.tool}`);
}
await page.keyboard.press('Escape');
// #quay: goods ticked, dockers on the road, goods stacked on the quay; the panel open with its rows, ticks and keeps.
await open('#quay-paused');
c = await city();
// (Slice 33: her first call falls in winter, so she may be late, and the chip and panel say so.)
if (!(c.tradingPosts === 1 && c.dockers >= 1 && c.onQuay >= 1800 && c.tradeOpen && /^\d+ d( · late)?$/.test(c.shipChip))) fail(`#quay: ${JSON.stringify(c)}`);
let tt = await zeus(() => window.__zeus.tradeText());
if (!/The trading post[\s\S]*Ship (in|late ·) \d+ d[\s\S]*Wheat\s*20[\s\S]*Meat\s*35[\s\S]*Cheese\s*35[\s\S]*Oil\s*70[\s\S]*Fleece\s*55[\s\S]*Wine\s*100[\s\S]*On the quay: [\d,]+ wheat[\s\S]*No ship has called yet/.test(tt ?? '')) fail(`#quay panel: ${tt}`);
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
// (At the merge of slices 33 and 35: the line names the winter storms when they held her back, as #sail's ship is in February.)
if (!lines12.some((l) => /^A sail on the horizon: the merchant ship ties up at the trading post in \d+ days?(, \d+ days late for the winter storms in the gulf)?\. On the quay: /.test(l))) fail(`#sail town line: ${JSON.stringify(lines12)}`);
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
// The ledger card redraws every 0.4 s of game-clock time, and a slow headless frame counts as only a tenth of a second
// of it, so it can take several frames after the visit to show the sale (this check once failed on that race).
const led13 = await page
  .waitForFunction(() => /Sales · wheat/.test(window.__zeus.ledgerText() ?? '') && window.__zeus.ledgerText(), null, { timeout: 60000, polling: 250 })
  .then((h) => h.jsonValue())
  .catch(() => zeus(() => window.__zeus.ledgerText()));
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

// Slice 14: a richer town.
// #richtown: several hundred people, villas, every chain, the ship sailing in to the post, its line; the street view among the villas.
await open('#richtown-paused');
c = await city();
sh = await zeus(() => window.__zeus.ship());
if (!(c.population > 700 && c.population < 1000 && c.villas >= 15 && c.tradingPosts === 1 && c.watchmen > 0 && sh.phase === 1 && sh.visible)) fail(`#richtown: ${JSON.stringify(c)} ship ${JSON.stringify(sh)}`);
if (!(await zeus(() => window.__zeus.townLines())).some((l) => /^The merchant ship is sailing into the bay/.test(l))) fail('#richtown has no ship line');
await open('#richstreet-paused');
if ((await city()).villas < 15) fail('#richstreet has too few villas');
// #harsh: the harsh-taxes line, and the rate card's harsh row says whole households leave.
await open('#harsh-paused');
if (!(await zeus(() => window.__zeus.townLines())).some((l) => /^Taxes are harsh: .*newcomers stay away/.test(l))) fail(`#harsh has no harsh line: ${JSON.stringify(await zeus(() => window.__zeus.townLines()))}`);
if (!/whole households leave/.test(await zeus(() => document.querySelector('.rates')?.textContent ?? ''))) fail('the rate card does not say harsh drives households out');
// #quay: the trade panel is brought up to date in place (the same table, not a new one), so hover tips don't flicker.
await open('#quay');
await frames(2);
await zeus(() => {
  const t = document.querySelector('.trade table.goods');
  if (t) t.kept14 = 'kept';
});
await page.waitForFunction(() => window.__zeus.tick() > 0 && window.__zeus.frames > 0, null, { timeout: 60000 });
const t0q = await zeus(() => window.__zeus.tick());
await page.waitForFunction((t) => window.__zeus.tick() > t + 30, t0q, { timeout: 300000, polling: 200 });
if ((await zeus(() => document.querySelector('.trade table.goods')?.kept14)) !== 'kept') fail('the trade panel table was rebuilt rather than updated in place');
// A slice 13 (version 12) save at harsh opens with a note that taxes were retuned.
await zeus((text) => localStorage.setItem('zeus-remake.save.manual', text), gunzipSync(readFileSync('tests/fixtures/slice13-harsh.save.json.gz')).toString());
await open('#saved-paused');
const back14 = await zeus(() => document.querySelector('.save-note')?.textContent ?? '');
if (!/Taxes are retuned/.test(back14)) fail(`slice 13 save: ${back14}`);
// A new town begun while the autosave holds another keeps that autosave until it is saved by hand, and says so.
const autoText = gunzipSync(readFileSync('tests/fixtures/slice13-harsh.save.json.gz')).toString();
await zeus(() => localStorage.clear());
await zeus((text) => localStorage.setItem('zeus-remake.save.auto', text), autoText);
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
let sv14 = await zeus(() => window.__zeus.saves());
if (sv14.autosaving || !sv14.kept) fail(`a new town over another's autosave turned the autosave on: ${JSON.stringify(sv14)}`);
await zeus(() => dispatchEvent(new Event('pagehide')));
if ((await zeus(() => localStorage.getItem('zeus-remake.save.auto'))) !== autoText) fail('leaving a new town replaced the autosave of the town before it');
if (!/is kept/.test(await zeus(() => document.querySelector('.save-note')?.textContent ?? ''))) fail('no note that the autosaved town is kept');
await zeus(() => localStorage.clear());
// Slice 15: the map of Greece.
// #greece opens on the map: four ruled cities with moods, a hover card, a ruler's panel, Esc back to the city, Tab to open again.
const gi = () => zeus(() => window.__zeus.greeceInfo());
await open('#greece-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
let g = await gi();
// (Slice 31: nine cities with rulers.)
if (!(g.built && Object.keys(g.moods).length === 9 && g.name === 'Nea Argos')) fail(`#greece: ${JSON.stringify(g).slice(0, 400)}`);
if (!(await zeus(() => document.body.classList.contains('greece-open')))) fail('#greece did not hide the city panels');
await page.mouse.move(g.cities.athens.x, g.cities.athens.y);
await frames(3);
g = await gi();
if (!(g.hovered === 'athens' && /Athens/.test(g.card) && /towards you/.test(g.card))) fail(`hovering Athens: ${g.hovered} ${g.card}`);
await page.mouse.click(g.cities.athens.x, g.cities.athens.y);
await frames(3);
g = await gi();
if (!(g.shown === 'athens' && /How (he|she) feels about you/.test(g.panel) && /Athens sells/.test(g.panel))) fail(`Athens panel: ${g.panel.slice(0, 300)}`);
// Clicking a city's label (not only the toy city under it) opens its page.
// (Another city's label in plain view, not under the page just opened.)
const lab = await zeus(() => {
  for (const el of document.querySelectorAll('.glabel')) {
    const r = el.getBoundingClientRect();
    const x = r.x + r.width / 2;
    const y = r.y + r.height / 2;
    if (r.width > 0 && !el.classList.contains('athens') && !el.classList.contains('site') && !el.classList.contains('armytag') && document.elementFromPoint(x, y)?.tagName === 'CANVAS') return { id: el.classList[1], x, y };
  }
  return null;
});
if (lab) {
  await page.mouse.click(lab.x, lab.y);
  await frames(3);
  if ((await gi()).shown !== lab.id) fail(`clicking ${lab.id}'s label: ${(await gi()).shown}`);
} else fail('no city label in view');
// Dragging and zooming move the map's camera, not the city's.
const cv0 = await zeus(() => window.__zeus.view());
const gv0 = g.view;
await page.mouse.move(900, 500);
await page.mouse.down();
await page.mouse.move(800, 450, { steps: 4 });
await page.mouse.up();
for (let i = 0; i < 3; i++) await page.mouse.wheel(0, -200);
await frames(10);
const gv1 = (await gi()).view;
const cv1 = await zeus(() => window.__zeus.view());
if (Math.abs(gv1.x - gv0.x) + Math.abs(gv1.z - gv0.z) < 0.5 || gv1.dist >= gv0.dist) fail(`the map camera did not move: ${JSON.stringify([gv0, gv1])}`);
if (JSON.stringify(cv0) !== JSON.stringify(cv1)) fail('dragging on the map moved the city camera');
await page.keyboard.press('Escape');
await frames(2);
if ((await gi()).shown !== '') fail('Esc did not close the ruler panel');
await page.keyboard.press('Escape');
await frames(2);
if ((await gi()).open) fail('Esc did not close the map');
if (await zeus(() => document.body.classList.contains('greece-open'))) fail('the city panels stayed hidden');
await page.keyboard.press('Tab');
await frames(3);
if (!(await gi()).open) fail('Tab did not open the map');
await page.click('.greece-btn');
await frames(2);
if ((await gi()).open) fail('the Greece button did not close the map');
// After a click on one of the side panel's tabs, Tab still opens the map (rather than moving to the next tab).
if (await page.isVisible('.side-tabs button:nth-child(2)')) {
  await page.click('.side-tabs button:nth-child(2)');
  await frames(1);
  await page.keyboard.press('Tab');
  await frames(3);
  if (!(await gi()).open) fail('Tab after clicking a side panel tab did not open the map');
} else fail('no side panel tabs to click at 1280 pixels');
// Naming the city: the panel's form, a refusal, then a good name that the label shows.
await zeus(() => window.__zeus.greece(true, 'home'));
await frames(3);
await page.click('.greece-panel .renamebtn');
await page.keyboard.press('Control+A');
await page.keyboard.type('X');
if (!/at least/.test(await zeus(() => document.querySelector('.greece-panel')?.textContent ?? ''))) fail('a one-letter name was not refused');
await page.keyboard.press('Control+A');
await page.keyboard.type('Nea Tiryns');
await page.keyboard.press('Enter');
await page.waitForFunction(() => window.__zeus.greeceInfo().name === 'Nea Tiryns', null, { timeout: 60000 });
// (The labels are redrawn every half second of the map's own clock, which runs slow at a frame a second: wait for it.)
await page.waitForFunction(() => /Nea Tiryns/.test(document.querySelector('.greece-labels')?.textContent ?? ''), null, { timeout: 60000 }).catch(() => {});
if (!/Nea Tiryns/.test(await zeus(() => document.querySelector('.greece-labels')?.textContent ?? ''))) fail('the map label did not take the new name');
// #ruler opens on Sparta's ruler, with the reasons for the mood.
await open('#ruler-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
g = await gi();
if (!(g.shown === 'sparta' && /old Argos/.test(g.panel) && /svg/.test(await zeus(() => document.querySelector('.greece-panel')?.innerHTML ?? '')))) fail(`#ruler: ${g.panel.slice(0, 300)}`);
// #greecesail: the merchant ship is on the map in the gulf by the city, and clicking it opens Tyre.
await open('#greecesail-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
g = await gi();
if (!g.ship.visible) fail('#greecesail: no ship on the map');
await page.mouse.click(g.cities.ship.x, g.cities.ship.y);
await frames(3);
g = await gi();
if (!(g.shown === 'tyre' && /The ship/.test(g.panel))) fail(`clicking the ship: ${g.shown} ${g.panel.slice(0, 200)}`);
const err16 = errors.length;
// Slice 16. #routes: the map open on Corinth's page with its road ready to open; opening it, and its caravan on the map's road.
const tr16 = () => zeus(() => window.__zeus.traders());
await open('#routes-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
g = await gi();
if (!(g.shown === 'corinth' && /Open a road to Corinth · 500 dr/.test(g.panel) && /Open a sea route to Corinth[\s\S]*needs the trading post/.test(g.panel))) fail(`#routes: ${g.panel.slice(-500)}`);
if (await zeus(() => document.querySelector('.greece-panel button[data-open="corinth-land"]')?.disabled !== false)) fail('#routes: the road to Corinth cannot be opened');
await page.click('.greece-panel button[data-open="corinth-land"]');
await frames(3);
let t16 = await tr16();
g = await gi();
if (!(t16.routes.length === 1 && t16.routes[0].key === 'corinth-land' && /By road · open since[\s\S]*Corinth buys[\s\S]*Corinth sells/.test(g.panel))) fail(`opening the road: ${JSON.stringify(t16)} ${g.panel.slice(-600)}`);
// Slice 18: the terms are on the page once, in its header, with a route open too.
if ((g.panel.match(/Corinth’s terms:/g) ?? []).length !== 1) fail(`#routes: the terms line shows ${(g.panel.match(/Corinth’s terms:/g) ?? []).length} times`);
await zeus(() => window.__zeus.speed('fast'));
await page.waitForFunction(() => window.__zeus.traders().routes[0].onMap.length > 0, null, { timeout: 300000, polling: 16 });
await zeus(() => window.__zeus.speed('paused'));
await frames(2);
g = await gi();
if (!g.travellers['corinth-land-0']) fail(`no caravan on the map's road: ${JSON.stringify(g.travellers)}`);
else {
  // Slice 17: the caravan on the map is hoverable, with a card saying where it is going.
  await page.mouse.move(g.travellers['corinth-land-0'].x, g.travellers['corinth-land-0'].y);
  await page.waitForFunction(() => window.__zeus.greeceInfo().hovered === 'trav:corinth-land-0', null, { timeout: 60000 }).catch(() => {});
  await frames(2);
  g = await gi();
  if (!(g.hovered === 'trav:corinth-land-0' && /^A caravan from Corinth[\s\S]*your city/.test(g.card))) fail(`hovering the caravan on the map: ${g.hovered} ${g.card}`);
}
// #caravan: the caravan walking in from the north edge, followed, with its town line, its tip and the donkey on the chip.
await open('#caravan-paused');
c = await city();
t16 = await tr16();
const cv16 = t16.routes[0]?.caravan;
if (!(cv16 && !cv16.back && !cv16.trading && cv16.donkeys === 5 && c.following)) fail(`#caravan: ${JSON.stringify(t16)} following ${c.following}`);
if (!(await zeus(() => window.__zeus.townLines())).some((l) => /caravan from Corinth/.test(l))) fail('#caravan: no town line for the caravan');
if (!(await zeus(() => !!document.querySelector('.ship-chip.land:not([hidden])')))) fail('#caravan: the chip does not show the caravan');
await page.keyboard.press('Escape');
await frames(2);
const cw16 = await zeus(() => window.__zeus.walker('caravan'));
if (cw16) {
  await page.mouse.move(cw16.x, cw16.y);
  await frames(2);
  const ct16 = await tip();
  if (!/^A caravan from Corinth\n5 donkeys and their drover/.test(ct16 ?? '')) fail(`hovering the caravan: ${ct16}`);
} else fail('#caravan: the caravan is not drawn');
// The traders chip, while the caravan walks in: its tab, and the camera follows it down the street.
await page.click('.ship-chip');
await frames(2);
t16 = await tr16();
c = await city();
if (!(t16.tab === 'corinth-land' && c.following)) fail(`#caravan: the chip goes to ${t16.tab}, following ${c.following}`);
// #buywine: the caravan comes in to the yard, unloads the wine and trades; the chip opens its tab.
await open('#buywine-paused');
await zeus(() => window.__zeus.speed('normal'));
await page.waitForFunction(() => window.__zeus.traders().routes[0].caravan?.trading === true, null, { timeout: 300000, polling: 16 });
await zeus(() => window.__zeus.speed('paused'));
await page.click('.ship-chip');
await frames(3);
t16 = await tr16();
const bt16 = await zeus(() => window.__zeus.tradeText());
if (!(t16.tab === 'corinth-land' && /Corinth’s caravan trading[\s\S]*it brought 1,200 wine[\s\S]*Corinth sells[\s\S]*Wine/.test(bt16))) fail(`#buywine: ${t16.tab} ${bt16.slice(0, 600)}`);
await zeus(() => window.__zeus.ledger(true));
await frames(3);
if (!/Bought · wine from Corinth\s*−840/.test(await zeus(() => window.__zeus.ledgerText()))) fail('#buywine: no ledger line for the wine');
// #athensship: her route's tab, both tabs, and the chip names her once she is in port.
await open('#athensship-paused');
t16 = await tr16();
if (!(t16.tab === 'athens-sea' && t16.routes[0].ship?.visible && (await zeus(() => document.querySelectorAll('.tradetabs button').length)) === 2)) fail(`#athensship: ${JSON.stringify(t16)}`);
// Her town line has a ship's icon, not the caravans' donkey.
if (!(await zeus(() => document.querySelector('.townline.trader')?.dataset.icon === 'athens-sea' && !!document.querySelector('.townline.trader svg path[d^="M9.6"]')))) fail('#athensship: her town line has no ship');
await zeus(() => window.__zeus.speed('normal'));
await page.waitForFunction(() => window.__zeus.traders().routes[0].ship?.phase === 2, null, { timeout: 300000, polling: 16 });
await zeus(() => window.__zeus.speed('paused'));
await frames(3);
c = await city();
if (c.shipChip !== 'In port') fail(`#athensship: the chip says ${c.shipChip}`);
await page.click('.tradetabs button[data-tab="tyre"]');
await frames(2);
if (!/^Tyre[\s\S]*The trading post/.test(await zeus(() => window.__zeus.tradeText()))) fail('#athensship: the Tyre tab');
// #anchor: she rides at anchor clear of the Tyre ship at the jetty.
await open('#anchor-paused');
t16 = await tr16();
const sh16 = await zeus(() => window.__zeus.ship());
const v16 = t16.routes[0].ship;
if (!(v16?.visible && v16.phase === 4 && sh16.phase === 2 && Math.hypot(v16.x - sh16.x, v16.z - sh16.z) > 3)) fail(`#anchor: ${JSON.stringify(v16)} ${JSON.stringify(sh16)}`);
// Slice 17. #prices: Corinth's page with its terms, harvest and prices, oil cheap because you sold it, with arrows and a year's chart.
await open('#prices-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
g = await gi();
if (!(g.shown === 'corinth' && g.tab === 'prices' && /Corinth’s terms: [a-z]+, prices[\s\S]*Prices in Corinth[\s\S]*Harvest: [a-z]+ (last|this) autumn/.test(g.panel))) fail(`#prices: ${g.tab} ${g.panel.slice(0, 600)}`);
if (!/Cheap[^(]*\(usually 90\): you sold them/.test(g.panel)) fail(`#prices: no reason for cheap oil: ${g.panel.slice(0, 900)}`);
const pr17 = await zeus(() => ({ sparks: document.querySelectorAll('.greece-panel svg.spark').length, arrows: document.querySelectorAll('.greece-panel svg.parrow').length }));
// (Slice 23: copper and armour too, eight goods. Slice 32: marble and timber, ten.)
if (!(pr17.sparks === 10 && pr17.arrows >= 8)) fail(`#prices: charts and arrows ${JSON.stringify(pr17)}`);
// Its route tab: your price with its arrow, the terms, and the prices list.
await zeus(() => window.__zeus.greece(false));
await zeus(() => window.__zeus.trade(true, 'corinth-land'));
await frames(3);
const rt17 = await zeus(() => window.__zeus.tradeText());
if (!/Corinth’s terms: [\s\S]*Prices in Corinth[\s\S]*you sold them/.test(rt17)) fail(`#prices: the route tab ${rt17.slice(0, 900)}`);
if ((await zeus(() => document.querySelectorAll('.household.trade td.price svg.parrow, .household.trade .pricelist svg.parrow').length)) === 0) fail('#prices: no arrows in the route tab');
await zeus(() => window.__zeus.trade(false));
// #famine: Athens' fields look parched; the harvest fails, a line comes under the top bar, and wheat there is dear for it.
await open('#famine-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
g = await gi();
if (!(g.shown === 'athens' && /the fields look parched/.test(g.panel))) fail(`#famine: ${g.panel.slice(0, 600)}`);
await zeus(() => window.__zeus.greece(false));
const fam17 = await zeus(() => window.__zeus.tick());
await zeus(() => window.__zeus.speed('fast'));
await page.waitForFunction((t) => window.__zeus.tick() > t + 60, fam17, { timeout: 300000, polling: 16 });
await zeus(() => window.__zeus.speed('paused'));
// (The lines under the top bar are brought up to date every half second, not every frame: give them a moment.)
await page.waitForFunction(() => window.__zeus.townLines().some((l) => /^From Greece: Athens’ harvest/.test(l)), null, { timeout: 5000 }).catch(() => {});
await frames(3);
if (!(await zeus(() => window.__zeus.townLines())).some((l) => /From Greece: Athens’ harvest has failed, and wheat there is \d+ a hundred/.test(l))) fail(`#famine: no town line for the harvest: ${JSON.stringify(await zeus(() => window.__zeus.townLines()))}`);
if (!(await zeus(() => !!document.querySelector('.townline.greece')))) fail('#famine: the harvest line is not drawn');
await page.click('.townline.greece');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
g = await gi();
if (!(g.shown === 'athens' && /Dear[^(]*\(usually \d+\): their harvest failed this autumn/.test(g.panel))) fail(`#famine after the harvest: ${g.shown} ${g.panel.slice(0, 900)}`);
if (errors.length > err16) fail('page errors (slices 16 and 17):\n' + errors.slice(err16).join('\n'));
// Slice 18. #gift: Corinth's ruler tab with its gift rows; tabs; a gift of 250 dr goes on the map, arrives and lifts the mood with its reason.
const err18 = errors.length;
const lines18 = () => zeus(() => window.__zeus.townLines());
await open('#gift-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
g = await gi();
if (!(g.shown === 'corinth' && g.tab === 'ruler' && /Cordial \+\d+[\s\S]*Corinth’s terms:[\s\S]*What it means for you[\s\S]*Send a gift[\s\S]*Drachmas[\s\S]*250 dr\s*\+\d+/.test(g.panel))) fail(`#gift: ${g.tab} ${g.panel.slice(0, 900)}`);
await page.click('.greece-panel button[data-tab="prices"]');
await frames(2);
g = await gi();
if (!(g.tab === 'prices' && (await zeus(() => document.querySelector('.greece-panel .pane[data-pane="prices"]')?.hidden === false && document.querySelector('.greece-panel .pane[data-pane="ruler"]')?.hidden === true)))) fail(`#gift: the prices tab did not show (${g.tab})`);
await page.click('.greece-panel button[data-tab="ruler"]');
await frames(2);
const money18 = (await city()).money;
await page.click('.greece-panel button[data-gift="-1"][data-amount="250"]');
await frames(3);
g = await gi();
if ((await city()).money !== money18 - 250) fail(`#gift: the treasury went from ${money18} to ${(await city()).money}`);
if (!/Your gift of 250 dr is on its way to Corinth: it arrives in \d+ days/.test(g.panel)) fail(`#gift: no gift on its way in the panel: ${g.panel.slice(0, 900)}`);
const giftKey18 = Object.keys(g.travellers).find((k) => k.startsWith('gift-'));
if (!giftKey18) fail(`#gift: no gift on the map: ${JSON.stringify(g.travellers)}`);
else {
  await zeus(() => window.__zeus.speed('normal'));
  // (A couple of days along the road, out from under your city's label.)
  const tick18 = await zeus(() => window.__zeus.tick());
  await page.waitForFunction((t) => window.__zeus.tick() > t + 20, tick18, { timeout: 60000, polling: 16 });
  await zeus(() => window.__zeus.speed('paused'));
  await frames(2);
  g = await gi();
  const at18 = g.travellers[giftKey18];
  if (at18) {
    await page.mouse.move(at18.x, at18.y);
    await page.waitForFunction(() => window.__zeus.greeceInfo().hovered.startsWith('trav:gift-'), null, { timeout: 60000 }).catch(() => {});
    await frames(2);
    g = await gi();
    if (!/^Your gift to Corinth · 250 dr[\s\S]*arrives in/.test(g.card)) fail(`#gift: hovering the gift on the map: ${g.hovered} ${g.card}`);
    await page.mouse.move(5, 5);
  }
}
await zeus(() => window.__zeus.speed('fast'));
await page.waitForFunction(() => window.__zeus.townLines().some((l) => /Your gift of 250 dr reached Corinth/.test(l)), null, { timeout: 300000, polling: 50 });
await zeus(() => window.__zeus.speed('paused'));
await frames(3);
g = await gi();
if (!/\+\d+Your gift of 250 dr \(shrewd: hard to impress[;)]/.test(g.panel)) fail(`#gift: no reason for the gift on the page: ${g.panel.slice(0, 900)}`);
// #hostile: the road closed, the line under the top bar, the Trade tab says so; a gift of 250 dr opens it again.
await open('#hostile-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
g = await gi();
if (!(g.shown === 'corinth' && /Hostile −\d+[\s\S]*Trade · closed[\s\S]*Furious with your city \(set up for this demo\)[\s\S]*The road is closed/.test(g.panel))) fail(`#hostile: ${g.panel.slice(0, 900)}`);
if (!(await lines18()).some((l) => /Corinth is hostile now, and has closed the road to your city/.test(l))) fail(`#hostile: no town line: ${JSON.stringify(await lines18())}`);
await page.click('.greece-panel button[data-gift="-1"][data-amount="250"]');
// (Slice 33: the button sits near the foot of the page, and under load the page could be redrawn between scrolling to it
// and the click, so the gift was not sent: if it isn't on its way, the button is pressed again in the page itself.)
if (!(await page.waitForFunction(() => /Your gift of 250 dr is on its way to Corinth/.test(window.__zeus.greeceInfo().panel), null, { timeout: 20000 }).then(() => true).catch(() => false))) {
  await zeus(() => document.querySelector('.greece-panel button[data-gift="-1"][data-amount="250"]')?.click());
  await frames(3);
}
await zeus(() => window.__zeus.speed('fast'));
await page.waitForFunction(() => window.__zeus.townLines().some((l) => /has opened the road again/.test(l)), null, { timeout: 300000, polling: 50 });
await zeus(() => window.__zeus.speed('paused'));
await frames(3);
// (Slice 29: the page is redrawn on its own beat; under load three frames were not always enough.)
await page.waitForFunction(() => !/The road is closed|Trade · closed/.test(window.__zeus.greeceInfo().panel), null, { timeout: 10000 }).catch(() => {});
g = await gi();
if (/The road is closed|Trade · closed/.test(g.panel)) fail(`#hostile: still closed after the gift: ${g.panel.slice(0, 900)}`);
// #thanks: Corinth warm, its gift on the road to you, on the page and the map; it arrives, with a line under the top bar.
await open('#thanks-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
g = await gi();
if (!(/Warm \+\d+/.test(g.panel) && /Corinth’s gift of 400 \w+ is on its way to you/.test(g.panel) && Object.keys(g.travellers).some((k) => k.startsWith('gift-')))) fail(`#thanks: ${JSON.stringify(g.travellers)} ${g.panel.slice(0, 1200)}`);
await zeus(() => window.__zeus.speed('fast'));
await page.waitForFunction(() => window.__zeus.townLines().some((l) => /A gift from Corinth: Lord \w+ sends you 400 \w+, in return for your gifts/.test(l)), null, { timeout: 300000, polling: 50 });
await zeus(() => window.__zeus.speed('paused'));
if (errors.length > err18) fail('page errors (slice 18):\n' + errors.slice(err18).join('\n'));
// Slice 19. #request: Sparta's request on its ruler tab, with its answers and when a sending would arrive; send it, and the porters fetch it, a caravan carries it out, and it arrives in time with the king's thanks.
const err19 = errors.length;
await open('#request-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
g = await gi();
if (!(g.shown === 'sparta' && /What he asks of you[\s\S]*The king asks for 1,000 wheat, by \d+ \w+ 747 BC[\s\S]*Send it\s*\+31[\s\S]*Promise\s*\+4[\s\S]*Refuse\s*−15[\s\S]*If sent now[\s\S]*arrives about \d+ \w+ 747 BC, \d+ days before it is due/.test(g.panel))) fail(`#request: ${g.panel.slice(0, 1200)}`);
if (!(await lines18()).some((l) => /^Sparta asks for 1,000 wheat by \d+ \w+ 747 BC \(\d+ days\)/.test(l))) fail(`#request: no town line: ${JSON.stringify(await lines18())}`);
if (!(await zeus(() => !!document.querySelector('.glabel svg.ask')))) fail('#request: no scroll on Sparta’s label');
await page.click('.greece-panel button[data-act="send"]');
await frames(3);
g = await gi();
if (!/The 1,000 wheat for Sparta: the porters are fetching it[\s\S]*arrives about \d+ \w+ 747 BC, \d+ days before it is due/.test(g.panel)) fail(`#request: nothing on its way in the panel: ${g.panel.slice(0, 1200)}`);
await zeus(() => window.__zeus.greece(false));
await zeus(() => window.__zeus.speed('fast'));
await page.waitForFunction(() => window.__zeus.gifts().some((x) => x.deal > 0 && x.porters.length > 0), null, { timeout: 300000, polling: 50 });
await page.waitForFunction(() => window.__zeus.gifts().some((x) => x.deal > 0 && x.caravan), null, { timeout: 600000, polling: 30 });
await zeus(() => window.__zeus.speed('paused'));
await frames(2);
const sent19 = (await zeus(() => window.__zeus.gifts())).find((x) => x.deal > 0 && x.caravan);
if (sent19) {
  const at19 = await zeus((p) => window.__zeus.screenOf(p.x, p.z), sent19.caravan);
  await page.mouse.move(at19.x, at19.y - 6);
  await page.waitForFunction(() => /^1,000 wheat for Sparta/.test(window.__zeus.tipText() ?? ''), null, { timeout: 10000 }).catch(() => {});
  const tip19 = await zeus(() => window.__zeus.tipText());
  if (!/^1,000 wheat for Sparta[\s\S]*the 1,000 wheat Sparta asked for/.test(tip19 ?? '')) fail(`#request: the caravan's tip: ${tip19}`);
  await page.mouse.move(5, 5);
}
await zeus(() => window.__zeus.speed('fast'));
await page.waitForFunction(() => window.__zeus.deals()[0].state !== 'open', null, { timeout: 600000, polling: 50 });
await zeus(() => window.__zeus.speed('paused'));
if ((await zeus(() => window.__zeus.deals()[0].state)) !== 'met') fail(`#request: ${JSON.stringify(await zeus(() => window.__zeus.deals()))}`);
await zeus(() => window.__zeus.greece(true, 'sparta'));
await frames(3);
g = await gi();
if (!/\+31You sent the 1,000 wheat they asked for \(generous: remembers kindness\)/.test(g.panel)) fail(`#request: no thanks on the page: ${g.panel.slice(0, 1200)}`);
// #promise: Athens promised wheat, five days left and nothing sent; let it run out, and the promise is broken, on the page and in the news.
await open('#promise-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
g = await gi();
if (!(g.shown === 'athens' && /you promised it[\s\S]*Send it, late\s*\+\d+[\s\S]*Refuse\s*−35[\s\S]*\+4You promised them [\d,]+ wheat/.test(g.panel))) fail(`#promise: ${g.panel.slice(0, 1200)}`);
if (!(await lines18()).some((l) => /^You promised Athens [\d,]+ wheat and nothing has gone: send it by \d+ \w+ 747 BC \(5 days\)/.test(l))) fail(`#promise: no town line: ${JSON.stringify(await lines18())}`);
await zeus(() => window.__zeus.speed('normal'));
await page.waitForFunction(() => window.__zeus.deals()[0].state !== 'open', null, { timeout: 120000, polling: 50 });
await zeus(() => window.__zeus.speed('paused'));
await page.waitForFunction(() => window.__zeus.townLines().some((l) => /You promised Athens [\d,]+ wheat and none came by the day/.test(l)), null, { timeout: 5000 }).catch(() => {});
await frames(3);
g = await gi();
if (!/−35You promised them [\d,]+ wheat and it never came/.test(g.panel)) fail(`#promise: no broken promise on the page: ${g.panel.slice(0, 1200)}`);
if (!(await lines18()).some((l) => /You promised Athens [\d,]+ wheat and none came by the day[^(]*\(−35\)/.test(l))) fail(`#promise: no news of it: ${JSON.stringify(await lines18())}`);
// #offer: Corinth's offer for oil; take it, and the route's oil row shows the offer's price and what is left of it.
await open('#offer-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
g = await gi();
if (!(g.shown === 'corinth' && /What he offers[\s\S]*The lord offers to buy all the oil you can send for a year at today’s price, \d+ a hundred[\s\S]*Take it\s*\+5[\s\S]*Decline/.test(g.panel))) fail(`#offer: ${g.panel.slice(0, 1200)}`);
await page.click('.greece-panel button[data-act="take"]');
await frames(3);
g = await gi();
if (!/Your year’s deal: Corinth buys your oil at \d+ a hundred[\s\S]*0 sold so far/.test(g.panel)) fail(`#offer: not taken: ${g.panel.slice(0, 1200)}`);
await page.click('.greece-panel button[data-tab="trade"]');
await frames(2);
g = await gi();
if (!/Oil\s*\d+\s*offer/.test(g.panel)) fail(`#offer: the trade tab: ${g.panel.slice(0, 1500)}`);
// #tribute: Sparta's demand; refuse it while he is wary, and he turns cold.
await open('#tribute-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
g = await gi();
if (!(g.shown === 'sparta' && /What he demands[\s\S]*The king demands \d+ dr in tribute[\s\S]*far stronger than your city[\s\S]*Pay it\s*\+8[\s\S]*Refuse\s*−30/.test(g.panel))) fail(`#tribute: ${g.panel.slice(0, 1200)}`);
const money19 = (await city()).money;
await page.click('.greece-panel button[data-act="refuse"]');
await frames(3);
g = await gi();
if ((await city()).money !== money19) fail('#tribute: refusing it cost money');
if (!/Cold −\d+[\s\S]*−30You refused them tribute/.test(g.panel)) fail(`#tribute: after refusing: ${g.panel.slice(0, 1200)}`);
if (errors.length > err19) fail('page errors (slice 19):\n' + errors.slice(err19).join('\n'));
// Slice 20. #threat: Sparta's threat on his ruler tab (the price, by when, what follows), its line under the top bar and the seal on his label; refuse it, and the band gathers on the map, the chip counting the days.
const err20 = errors.length;
await open('#threat-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
g = await gi();
if (!(g.shown === 'sparta' && /What he threatens[\s\S]*The king threatens your city[\s\S]*Pay [\d,]+ dr, by \d+ \w+ 746 BC \(\d+ days\)\. If nothing comes by then, \d+ of his men gather at Sparta[\s\S]*Pay [\d,]+ dr\s*\+\d+[\s\S]*Refuse/.test(g.panel))) fail(`#threat: ${g.panel.slice(0, 1400)}`);
if (!(await lines18()).some((l) => /^King Eurykrates of Sparta threatens your city: pay [\d,]+ dr by \d+ \w+ 746 BC/.test(l))) fail(`#threat: no town line: ${JSON.stringify(await lines18())}`);
if (!(await zeus(() => !!document.querySelector('.glabel svg.ask.threat')))) fail('#threat: no seal on Sparta’s label');
await page.click('.greece-panel button[data-act="refuse"]');
await frames(3);
let r20 = await zeus(() => window.__zeus.raids());
if (!(r20.raids[0]?.phase === 'gathering' && /^Sparta’s raiders · \d+ men · \d+ days$/.test(r20.chip))) fail(`#threat: refused: ${JSON.stringify(r20)}`);
g = await gi();
// (Slice 31: defied within the town's first year, the band bides its time at home, out of sight, and gathers only for its last ten days.)
const bide20 = (await lines18()).some((l) => /Sparta’s raiders bide their time at home, \d+ men: at the west edge of your land in about \d+ days/.test(l));
if (!bide20 && !Object.keys(g.travellers).some((k) => k.startsWith('raid-'))) fail(`#threat: no band on the map: ${JSON.stringify(g.travellers)}`);
if (bide20 && Object.keys(g.travellers).some((k) => k.startsWith('raid-'))) fail(`#threat: a band biding its time at home is on the map: ${JSON.stringify(g.travellers)}`);
if (!bide20 && !(await lines18()).some((l) => /Sparta’s raiders are gathering, \d+ men: at the west edge of your land in about \d+ days/.test(l))) fail(`#threat: no line for the band: ${JSON.stringify(await lines18())}`);
// #raid: the band on the march, days from the edge; pay, and it turns round on the map at once, the chip gone, the coin on the ledger's peace line.
await open('#raid-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
g = await gi();
r20 = await zeus(() => window.__zeus.raids());
if (!(r20.raids[0]?.phase === 'marching' && /^Sparta’s raiders · \d+ men · \d days?$/.test(r20.chip) && Object.keys(g.travellers).includes('raid-1'))) fail(`#raid: ${JSON.stringify(r20)} ${JSON.stringify(g.travellers)}`);
if (!/Sparta’s raiders are on the march[\s\S]*Pay [\d,]+ dr now and they turn back at once, wherever they are[\s\S]*Pay [\d,]+ dr\s*\+\d+/.test(g.panel)) fail(`#raid: the page: ${g.panel.slice(0, 1400)}`);
const money20 = (await city()).money;
await page.click('.greece-panel button[data-act="send"]');
await frames(3);
r20 = await zeus(() => window.__zeus.raids());
if (!(r20.raids[0]?.phase === 'turned' && r20.raids[0].end === 'paid' && r20.chip === '')) fail(`#raid: paid: ${JSON.stringify(r20)}`);
if ((await city()).money !== money20 - r20.raids[0].coin) fail(`#raid: paying took ${money20 - (await city()).money}, not ${r20.raids[0].coin}`);
if (!(await lines18()).some((l) => /King Eurykrates has the price of peace: his raiders turn round on the road home/.test(l))) fail(`#raid: no news of it: ${JSON.stringify(await lines18())}`);
g = await gi();
if (!/\+\d+You paid them to call off their raiders/.test(g.panel)) fail(`#raid: no memory of it: ${g.panel.slice(0, 1400)}`);
// #raiders: in the city at the granary (slice 24: bands come for the stores, and burn on their way), the chip, the band's tip; they leave with what they took.
await open('#raiders-paused');
await frames(3);
r20 = await zeus(() => window.__zeus.raids());
if (!(r20.raids[0]?.phase === 'raiding' && r20.band?.drawn && r20.chip === 'Raiders in the city')) fail(`#raiders: ${JSON.stringify(r20)}`);
if (!(await lines18()).some((l) => /^\d+ of Sparta’s raiders are in your city, plundering the granary(, then making for the tax office)?\. Pay [\d,]+ dr on Sparta’s page to turn them back/.test(l))) fail(`#raiders: no line: ${JSON.stringify(await lines18())}`);
const at20 = await zeus((p) => window.__zeus.screenOf(p.x, p.z), r20.band);
await page.mouse.move(at20.x, at20.y - 8);
await page.waitForFunction(() => /^Raiders of Sparta|^A raider of Sparta/.test(window.__zeus.tipText() ?? ''), null, { timeout: 10000 }).catch(() => {});
const tip20 = await zeus(() => window.__zeus.tipText());
// (Slice 33: with the seasons' history the band stands otherwise, and the pointer can fall on one of its men: his tip is the band's too.)
if (!/^Raiders of Sparta[\s\S]*men in Sparta’s colours, with shields and torches|^A raider of Sparta[\s\S]*with the band/.test(tip20 ?? '')) fail(`#raiders: the band's tip: ${tip20}`);
await page.mouse.move(5, 5);
// The chip opens Sparta's page, with the band at the granary and the coin to turn them back (not paid here: they go on to take the wheat).
await page.click('.raid-chip');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
g = await gi();
if (!(g.shown === 'sparta' && /Sparta’s raiders are in your city[\s\S]*\d+ men in at the west edge, at the granary\. Pay [\d,]+ dr now and they turn back at once/.test(g.panel))) fail(`#raiders: the chip's page: ${g.shown} ${g.panel.slice(0, 1200)}`);
await zeus(() => window.__zeus.greece(false));
await frames(2);
await zeus(() => window.__zeus.speed('fast'));
await page.waitForFunction(() => window.__zeus.raids().band === null, null, { timeout: 600000, polling: 50 });
await zeus(() => window.__zeus.speed('paused'));
r20 = await zeus(() => window.__zeus.raids());
if (!(r20.raids[0].end === 'raided' && r20.raids[0].took > 0)) fail(`#raiders: after: ${JSON.stringify(r20)}`);
// #aftermath: the ledger's raid lines (drachmas and wheat) and what burnt (slice 24's review: houses on their way, never the granary or the tax office they plundered); on Sparta's page, the king's anger spent.
await open('#aftermath-paused');
await frames(3);
const led20 = await zeus(() => window.__zeus.ledgerText());
// (Slice 33: with the seasons' history its fires took a farm and the dairy, not houses; nothing it plundered burnt. Review of
// slice 33: the wheat line is back, as #aftermath's demand now comes early in a month, so the wheat and the coin fall in one month.)
if (!/Lost to raiders\s*Raided by Sparta · drachmas[\s\S]*Raided by Sparta · wheat[\s\S]*Burnt down · /.test(led20) || /Burnt down · (granaries|tax offices)/.test(led20)) fail(`#aftermath: the ledger: ${led20.slice(0, 1500)}`);
await zeus(() => window.__zeus.greece(true, 'sparta'));
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
g = await gi();
if (!/\+\d+Their raid has eased the king’s temper/.test(g.panel)) fail(`#aftermath: Sparta's page: ${g.panel.slice(0, 1400)}`);
if (errors.length > err20) fail('page errors (slice 20):\n' + errors.slice(err20).join('\n'));
// Slice 21. #war: Sparta and Athens at war: their armies and the swords on the map, the way red, the swords on Sparta's label, his page's war line and his request for his army, Athens' too; the price reasons; the army's card along its body and the swords' card; the Rivals tab; the News of Greece, a line opening its city's page.
const err21 = errors.length;
await open('#war-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(4);
g = await gi();
const keys21 = Object.keys(g.travellers);
const army21 = keys21.find((k) => /^war-\d+-sparta$/.test(k));
const swords21 = keys21.find((k) => /^war-\d+$/.test(k));
if (!(army21 && keys21.some((k) => /^war-\d+-athens$/.test(k)) && swords21)) fail(`#war: the armies and swords on the map: ${JSON.stringify(keys21)}`);
if (!g.closed.includes('athens-sparta')) fail(`#war: the way not drawn closed: ${JSON.stringify(g.closed)}`);
if (!(await zeus(() => !!document.querySelector('.glabel.sparta svg.ask.war') && !!document.querySelector('.glabel.athens svg.ask.war')))) fail('#war: no swords on the labels');
if (!(g.shown === 'sparta' && /At war with Athens since \d+ May 747 BC: their armies stand at Megara\. The way between them is closed/.test(g.panel) && /asks for 1,000 wheat[\s\S]*For their army: they are at war with Athens/.test(g.panel))) fail(`#war: Sparta's page: ${g.panel.slice(0, 1400)}`);
if (!/has declared war on Athens[\s\S]*Their armies march to meet at Megara/.test(g.news)) fail(`#war: the News of Greece: ${g.news.slice(0, 800)}`);
await page.click('.greece-panel button[data-tab="prices"]');
await frames(2);
g = await gi();
if (!/Wheat[\s\S]*Dear \(usually \d+\): their war with Athens/.test(g.panel)) fail(`#war: Sparta's prices: ${g.panel.slice(0, 1400)}`);
await page.click('.greece-panel button[data-tab="rivals"]');
await frames(2);
g = await gi();
if (!/How he feels about the others[\s\S]*Athens\s*At war −\d+[\s\S]*At war with Athens/.test(g.panel)) fail(`#war: the Rivals tab: ${g.panel.slice(0, 1400)}`);
// The army's card, at its head and towards its rear (its whole body answers).
const at21 = g.travellers[army21];
await page.mouse.move(at21.x, at21.y);
await frames(2);
g = await gi();
if (!/^Sparta’s army · [\d,]+ men\s*Facing Athens’ army at Megara/.test(g.card)) fail(`#war: the army's card: ${g.card}`);
const body21 = await zeus((k) => window.__zeus.greeceBody?.(k), army21);
if (body21) {
  await page.mouse.move(body21.x, body21.y);
  await frames(2);
  g = await gi();
  if (!/^Sparta’s army/.test(g.card)) fail(`#war: the army's rear doesn't answer: ${g.card} at ${JSON.stringify(body21)}`);
} else fail('#war: no body point for the army');
const sw21 = g.travellers[swords21];
await page.mouse.move(sw21.x, sw21.y);
await frames(2);
g = await gi();
if (!/^Sparta and Athens at war\s*Since \d+ May 747 BC[\s\S]*The road between them is closed\. Food and fleece are dear in both/.test(g.card)) fail(`#war: the swords' card: ${g.card}`);
await page.mouse.move(5, 500);
await page.click('.greece-news li[data-city="athens"]');
await frames(2);
g = await gi();
if (!(g.shown === 'athens' && /For their army: they are at war with Sparta/.test(g.panel))) fail(`#war: the news line to Athens' page: ${g.shown} ${g.panel.slice(0, 1000)}`);
// #festival: the Panathenaia on: banners and smoke, the wreath on Athens' label, the page's line, the wine price's reason, a gift's tip.
await open('#festival-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(4);
g = await gi();
if (!(g.shown === 'athens' && g.feasts.includes('athens'))) fail(`#festival: ${g.shown} ${JSON.stringify(g.feasts)}`);
if (!(await zeus(() => !!document.querySelector('.glabel.athens svg.ask.feast')))) fail('#festival: no wreath on the label');
if (!/The Panathenaia is on, until 1 August: wine and meat dear; a gift that arrives now counts for more/.test(g.panel)) fail(`#festival: the page: ${g.panel.slice(0, 1200)}`);
if (!(await zeus(() => [...document.querySelectorAll('.greece-panel button[data-gift]')].some((b) => /for the Panathenaia/.test(b.title))))) fail('#festival: no gift tip names the festival');
await page.click('.greece-panel button[data-tab="prices"]');
await frames(2);
g = await gi();
// (Slice 33: with the seasons' history the wine bought from Athens weighs more in its price than the festival, so the
// festival's reason can come second.)
if (!/Wine[\s\S]*Dear \(usually \d+\): ([^.]*, and )?the Panathenaia is on/.test(g.panel)) fail(`#festival: the wine price: ${g.panel.slice(0, 1400)}`);
// (Slice 31: every ruled city with dry ground beside it; Rhodes on its small island and Memphis at the table's edge have none.)
if (!Object.values(g.fields).every((f) => /^#[0-9a-f]{6} at /.test(f)) || Object.keys(g.fields).length !== 7) fail(`#festival: the fields: ${JSON.stringify(g.fields)}`);
// #peace: Athens has won: Sparta's army going home, no swords, the way open; Sparta's prices dear for losing.
await open('#peace-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(4);
g = await gi();
if (!(Object.keys(g.travellers).some((k) => /^war-\d+-sparta$/.test(k)) && !Object.keys(g.travellers).some((k) => /^war-\d+$/.test(k)) && g.closed.length === 0)) fail(`#peace: the map: ${JSON.stringify(Object.keys(g.travellers))} ${JSON.stringify(g.closed)}`);
if (!(g.shown === 'sparta' && /Lost its war with Athens on \d+ September 747 BC, and poorer for it/.test(g.panel) && /Wheat[\s\S]*Dear \(usually \d+\): they lost their war with Athens/.test(g.panel))) fail(`#peace: Sparta's page: ${g.panel.slice(0, 1400)}`);
if (errors.length > err21) fail('page errors (slice 21):\n' + errors.slice(err21).join('\n'));
// Slice 22: #rivals, the town trading with every city: every route open, caravans in the city, a ship at the quay or coming,
// opened from the town prepared when the game was built; #rivalstreet by the yard; #rivalsmap, the war at sea, the threat and the request.
const err22 = errors.length;
await open('#rivals-paused');
let t22 = await zeus(() => ({ prepared: window.__zeus.prepared, routes: window.__zeus.traders().routes }));
const in22 = t22.routes.filter((r) => r.caravan).length;
if (!(t22.prepared && t22.routes.length === 6 && in22 >= 2 && t22.routes.some((r) => r.ship?.visible))) fail(`#rivals: ${JSON.stringify(t22)}`);
await open('#rivalstreet-paused');
t22 = await zeus(() => ({ prepared: window.__zeus.prepared, routes: window.__zeus.traders().routes }));
if (!(t22.prepared && t22.routes.filter((r) => r.caravan).length >= 2)) fail(`#rivalstreet: ${JSON.stringify(t22)}`);
await open('#rivalsmap-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(4);
g = await gi();
const keys22 = Object.keys(g.travellers);
if (!(keys22.some((k) => /^war-\d+-troy$/.test(k)) && keys22.some((k) => /^war-\d+-athens$/.test(k)) && keys22.some((k) => /^war-\d+$/.test(k)))) fail(`#rivalsmap: the fleets and swords: ${JSON.stringify(keys22)}`);
if (!(await zeus(() => !!document.querySelector('.glabel.troy svg.ask.war') && !!document.querySelector('.glabel.athens svg.ask.war')))) fail('#rivalsmap: no swords on the labels');
if (!(/King Priam of Troy has declared war on Athens[\s\S]*fleets sail to meet/.test(g.news) && /Sparta is out of patience: pay [\d,]+ dr/.test(g.news) && /Athens asks for [\d,]+ dr[\s\S]*to pay their soldiers: they are at war with Troy/.test(g.news))) fail(`#rivalsmap: the News of Greece: ${g.news.slice(0, 1200)}`);
// No city's label under the top bar or the City button (Troy's was).
const under22 = await zeus(() => {
  const bar = [document.querySelector('.topbar'), document.querySelector('.greece-btn')].map((e) => e.getBoundingClientRect());
  return [...document.querySelectorAll('.glabel')].filter((l) => l.style.display !== 'none').map((l) => [l.className, l.getBoundingClientRect()]).filter(([, r]) => bar.some((b) => r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top)).map(([c]) => c);
});
if (under22.length) fail(`#rivalsmap: labels under the top bar: ${under22.join(', ')}`);
await page.mouse.move(5, 500);
await page.click('.greece-news li[data-city="athens"]');
await frames(2);
g = await gi();
if (!(g.shown === 'athens' && /At war with Troy since[\s\S]*their fleets/.test(g.panel) && /asks for [\d,]+ dr[\s\S]*To pay their soldiers: they are at war with Troy/.test(g.panel))) fail(`#rivalsmap: Athens' page: ${g.shown} ${g.panel.slice(0, 1400)}`);
// The Rivals tab is built when it is shown (slice 22), not before.
if (/How (he|she) feels about the others/.test(g.panel)) fail('#rivalsmap: the Rivals tab built while hidden');
await page.click('.greece-panel button[data-tab="rivals"]');
await frames(2);
g = await gi();
if (!/How (he|she) feels about the others[\s\S]*Troy\s*At war −\d+/.test(g.panel)) fail(`#rivalsmap: Athens' Rivals tab: ${g.panel.slice(0, 1400)}`);
if (errors.length > err22) fail('page errors (slice 22):\n' + errors.slice(err22).join('\n'));
// Slice 23: bronze and the barracks. #bronze: the mine tool in hand, the copper's tip, the mine and the armoury, copper and armour on the
// Goods tab; #barracks: a company raised, men walking in, the Army tab and the chip; #companies: a banner in hand, marched while paused
// by a click on a street, let go with Esc, taken again by its banner and by its row on the Army tab.
const err23 = errors.length;
await open('#bronze-paused');
let a23 = await zeus(() => ({ prepared: window.__zeus.prepared, tool: window.__zeus.city().tool, mines: window.__zeus.buildingsOf('mine').length, armouries: window.__zeus.buildingsOf('armoury').length, side: window.__zeus.sideText() }));
if (!(a23.prepared && a23.tool === 'mine' && a23.mines === 1 && a23.armouries === 1)) fail(`#bronze: ${JSON.stringify({ ...a23, side: '' })}`);
if (!/Copper[\s\S]*Armour/.test(a23.side)) fail(`#bronze: no copper and armour on the Goods tab: ${a23.side.slice(0, 600)}`);
{
  const p = await zeus(() => window.__zeus.screenOf(110.5, 6.5));
  await page.mouse.move(p.x, p.y);
  await page.mouse.move(p.x + 1, p.y + 1);
  await frames(3);
  const tip = await zeus(() => window.__zeus.tipText());
  if (!/copper/i.test(tip ?? '')) fail(`#bronze: the mine tool's tip on the copper: ${tip}`);
}
await open('#barracks-paused');
a23 = await zeus(() => ({ army: window.__zeus.army(), side: window.__zeus.sideText(), chip: document.querySelector('.army-chip')?.textContent ?? '', chipShown: !document.querySelector('.army-chip')?.hidden }));
if (!(a23.army.companies.length === 1 && a23.army.companies[0].men === 16 && a23.army.companies[0].ready < 16)) fail(`#barracks: ${JSON.stringify(a23.army)}`);
if (!(a23.chipShown && /16 soldiers · 1 company/.test(a23.chip))) fail(`#barracks: the army chip: ${a23.chip}`);
if (!/1st company of hoplites[\s\S]*walking in/.test(a23.side)) fail(`#barracks: the Army tab: ${a23.side.slice(0, 900)}`);
await open('#companies-paused');
a23 = await zeus(() => window.__zeus.army());
const hop23 = a23.companies.find((c) => c.kind === 'hoplite');
const arc23 = a23.companies.find((c) => c.kind === 'archer');
if (!(hop23 && arc23 && a23.selected === hop23.id && hop23.ready === 16 && arc23.ready === 16 && /march/.test(a23.hint))) fail(`#companies: ${JSON.stringify(a23)}`);
{
  // A click on a street in sight (the north street, or the oil road) marches the hoplites there, while paused.
  const p = await zeus(() => {
    for (const [x, z] of [[82.5, 33.5], [78.5, 33.5], [86.5, 39.5], [86.5, 29.5]]) {
      const q = window.__zeus.screenOf(x, z);
      if (document.elementFromPoint(q.x, q.y)?.tagName === 'CANVAS') return q;
    }
    return window.__zeus.screenOf(82.5, 33.5);
  });
  await page.mouse.move(p.x, p.y);
  await page.mouse.move(p.x + 1, p.y + 1);
  await frames(3);
  const tip = await zeus(() => window.__zeus.tipText());
  if (!/March the 1st company of hoplites here · about \d+ days? away/.test(tip ?? '')) fail(`#companies: the tip on the street: ${tip}`);
  await page.mouse.down();
  await page.mouse.up();
  await frames(3);
  a23 = await zeus(() => window.__zeus.army());
  const h = a23.companies.find((c) => c.id === hop23.id);
  if (!(h.order === 'march' && a23.selected === hop23.id)) fail(`#companies: the march order: ${JSON.stringify(a23)}`);
  await page.keyboard.press('Escape');
  await frames(2);
  if ((await zeus(() => window.__zeus.army().selected)) !== 0) fail('#companies: Esc did not let go of the banner');
  // Its row on the Army tab takes the archers' banner; a click on the hoplites' banner takes theirs again.
  await page.click(`.side button[data-act="company"][data-id="${arc23.id}"]`);
  await frames(2);
  if ((await zeus(() => window.__zeus.army().selected)) !== arc23.id) fail('#companies: the Army tab row did not take the archers\' banner');
  await page.keyboard.press('Escape');
  await frames(2);
  const b = (await zeus(() => window.__zeus.army())).companies.find((c) => c.id === arc23.id).screen;
  if (!b) fail('#companies: no banner drawn for the archers');
  else {
    await page.mouse.move(b.x, b.y);
    await page.mouse.down();
    await page.mouse.up();
    await frames(2);
    if ((await zeus(() => window.__zeus.army().selected)) !== arc23.id) fail('#companies: a click on the banner did not take it');
  }
}
// The soldiers' pay on the Money tab and in the ledger.
await zeus(() => window.__zeus.sideTab('money'));
await frames(2);
await zeus(() => window.__zeus.ledger(true));
await frames(2);
const pay23 = await zeus(() => ({ side: window.__zeus.sideText(), ledger: window.__zeus.ledgerText() }));
await zeus(() => window.__zeus.ledger(false));
if (!(/Soldiers’ pay\s*−\d+/.test(pay23.side) && /Going out[\s\S]*Soldiers’ pay 32 men/.test(pay23.ledger))) fail(`#companies: the soldiers' pay: ${pay23.side.slice(0, 300)} / ${pay23.ledger.slice(0, 900)}`);
if (errors.length > err23) fail('page errors (slice 23):\n' + errors.slice(err23).join('\n'));
// Slice 24: raiders fought in the streets. #battle: the band's numbers in the chip, both banners placed by clicks while paused, the
// fight (raiders fighting, arrows in the air, a raider's hover), the band broken, the army's news and its town line; #looted: what the
// band took in the ledger and the chip; #hirelings: the hire button, the fee in the ledger, the company marching in.
const err24 = errors.length;
await open('#battle-paused');
let a24 = await zeus(() => ({ prepared: window.__zeus.prepared, army: window.__zeus.army(), chip: document.querySelector('.raid-chip')?.textContent ?? '', side: window.__zeus.sideText() }));
const hop24 = a24.army.companies.find((c) => c.kind === 'hoplite');
const arc24 = a24.army.companies.find((c) => c.kind === 'archer');
if (!(a24.prepared && hop24 && arc24 && a24.army.selected === hop24.id)) fail(`#battle: ${JSON.stringify({ ...a24, side: '' })}`);
if (!/Sparta’s raiders · \d+ men · \d+ days?/.test(a24.chip)) fail(`#battle: the raid chip: ${a24.chip}`);
if (!/Hire Cretan archers[\s\S]*Hire Arcadian hoplites/.test(a24.side)) fail(`#battle: no hire buttons on the Army tab: ${a24.side.slice(0, 900)}`);
{
  // The hoplites' banner in hand: a click at the bridge's east end; the archers' row, then a click on the rise behind.
  const click = async (x, z) => {
    const p = await zeus(([x, z]) => window.__zeus.screenOf(x, z), [x, z]);
    await page.mouse.move(p.x, p.y);
    await page.mouse.move(p.x + 1, p.y + 1);
    await frames(2);
    await page.mouse.down();
    await page.mouse.up();
    await frames(3);
  };
  await click(40.5, 41.5);
  // (The row takes the archers' banner and flies the camera to them: once it is there, back to the bridge.)
  await page.click(`.side button[data-act="company"][data-id="${arc24.id}"]`);
  // (Forty frames for the flight: at headless software rendering's frame or two a second on a busy machine, that can take minutes.)
  await frames(40, 300000);
  if ((await zeus(() => window.__zeus.army().selected)) !== arc24.id) fail('#battle: the archers\' row did not take their banner');
  await zeus(() => window.__zeus.jump({ x: 50, z: 41, yaw: 2.65, dist: 34, tilt: -0.1 }));
  await frames(3);
  await click(44.5, 39.5);
  a24 = await zeus(() => window.__zeus.army());
  const h = a24.companies.find((c) => c.id === hop24.id);
  const a = a24.companies.find((c) => c.id === arc24.id);
  if (!(h.order === 'march' && a.order === 'march')) fail(`#battle: the banners placed by clicks: ${JSON.stringify(a24)}`);
  await page.keyboard.press('Escape');
  // The fight: played on until raiders fight, then a raider hovered.
  let b24 = await zeus(() => {
    const z = window.__zeus;
    for (let i = 0; i < 900 && z.battle().fighting < 4; i += 2) z.skip(2);
    return z.battle();
  });
  if (!(b24.fighting >= 4 && b24.foes > 10)) fail(`#battle: no fight: ${JSON.stringify(b24)}`);
  await zeus(() => {
    const c = window.__zeus.battle().centre;
    if (c) window.__zeus.jump({ x: c.x, z: c.z, yaw: 2.65, dist: 9, tilt: 0.15 });
  });
  await frames(4);
  const fp = await zeus(() => window.__zeus.foeScreen());
  if (!fp) fail('#battle: no raider drawn');
  else {
    await page.mouse.move(fp.x, fp.y);
    await page.mouse.move(fp.x + 1, fp.y);
    await frames(3);
    const tip = await zeus(() => window.__zeus.tipText());
    if (!/raider of Sparta|son of|Fighting|fighting/.test(tip ?? '')) fail(`#battle: a raider's hover: ${tip}`);
  }
  b24 = await zeus(() => {
    const z = window.__zeus;
    let arrows = 0;
    for (let i = 0; i < 1200 && !z.battle().broke; i += 2) {
      z.skip(2);
      arrows = Math.max(arrows, z.battle().arrows);
    }
    return { ...z.battle(), arrowsSeen: arrows };
  });
  if (!(b24.broke && b24.fallen >= 14)) fail(`#battle: the band not broken: ${JSON.stringify(b24)}`);
  // (Slice 26, from slice 25's review: the news of the break is told once the band has left, counting every man who fell.)
  b24 = await zeus(() => {
    const z = window.__zeus;
    for (let i = 0; i < 1500 && !z.battle().news.some((l) => /^Your soldiers broke/.test(l)); i += 5) z.skip(5);
    return z.battle();
  });
  if (!b24.news.some((l) => /^Your soldiers broke Sparta’s raiders[\s\S]*\d+ of their \d+ men fell/.test(l))) fail(`#battle: the army's news: ${JSON.stringify(b24.news)}`);
  await frames(3);
  const lines24 = await zeus(() => window.__zeus.townLines());
  if (!JSON.stringify(lines24).includes('Your soldiers broke')) fail(`#battle: the battle's town line: ${JSON.stringify(lines24).slice(0, 600)}`);
}
await open('#looted-paused');
a24 = await zeus(() => ({ ledger: window.__zeus.ledgerText(), chip: document.querySelector('.raid-chip')?.textContent ?? '', lines: window.__zeus.townLines() }));
if (!(/Raided by Sparta · drachmas\s*−[\d,]+/.test(a24.ledger) && /Raided by Sparta · wheat/.test(a24.ledger))) fail(`#looted: the ledger: ${a24.ledger.slice(0, 900)}`);
if (!/making off with [\d,]+ wheat and [\d,]+ dr/.test(JSON.stringify(a24.lines))) fail(`#looted: the raid's line: ${JSON.stringify(a24.lines).slice(0, 600)}`);
await open('#hirelings-paused');
{
  await page.click('.side button[data-act="hire"][data-kind="arcadian"]');
  await frames(3);
  a24 = await zeus(() => ({ army: window.__zeus.army(), side: window.__zeus.sideText() }));
  if (!(a24.army.companies.length === 1 && a24.army.companies[0].men === 16 && a24.army.companies[0].ready === 0)) fail(`#hirelings: ${JSON.stringify(a24.army)}`);
  if (!/Arcadian hoplites[\s\S]*Walking in from the edge/i.test(a24.side)) fail(`#hirelings: the Army tab: ${a24.side.slice(0, 900)}`);
  await zeus(() => window.__zeus.ledger(true));
  await frames(2);
  const led = await zeus(() => window.__zeus.ledgerText());
  await zeus(() => window.__zeus.ledger(false));
  if (!/Hired · Arcadian hoplites\s*−450/.test(led)) fail(`#hirelings: the fee in the ledger: ${led.slice(0, 900)}`);
  const ready = await zeus(() => {
    const z = window.__zeus;
    for (let i = 0; i < 200 && z.army().companies[0].ready < 16; i += 5) z.skip(5);
    return z.army().companies[0].ready;
  });
  if (ready !== 16) fail(`#hirelings: the Arcadians not all in after 20 days: ${ready}`);
}
if (errors.length > err24) fail('page errors (slice 24):\n' + errors.slice(err24).join('\n'));
// Slice 25: walls, gates and towers. #walls: the wall tool in hand, a wall dragged up the east bank across the west road (its tip,
// a gate where it crosses), a tower set beside the gate by a click, a stretch's and the tower's hovers, undo; #siege: the band
// hammering at the gate, the threat's line, the towers shooting, the gate's hover.
const err25 = errors.length;
await open('#walls-paused');
{
  const click = async (x, z, hold = false) => {
    const p = await zeus(([x, z]) => window.__zeus.screenOf(x, z), [x, z]);
    await page.mouse.move(p.x, p.y);
    await page.mouse.move(p.x + 1, p.y + 1);
    await frames(2);
    await page.mouse.down();
    if (!hold) await page.mouse.up();
    await frames(3);
  };
  await zeus(() => window.__zeus.jump({ x: 46, z: 38, yaw: 2.65, dist: 30, tilt: -0.05 }));
  await frames(3);
  const before = await zeus(() => ({ walls: window.__zeus.walls(), money: window.__zeus.city().money }));
  if (before.walls.pieces.length !== 0) fail(`#walls: walls already: ${JSON.stringify(before.walls)}`);
  // Press on the bank north of the bridge, drag down across the west road, look at the tip, let go.
  await click(40.5, 26.5, true);
  for (const z of [30.5, 35.5, 40.5, 44.5]) {
    const p = await zeus((z) => window.__zeus.screenOf(40.5, z), z);
    await page.mouse.move(p.x, p.y);
    await frames(2);
  }
  const dragTip = await zeus(() => window.__zeus.tipText());
  await page.mouse.up();
  await frames(3);
  if (!/Wall · \d+ stretches[^\n]*a gate where it crosses the road[^\n]*· [\d,]+ dr/.test(dragTip ?? '')) fail(`#walls: the wall tool's tip: ${dragTip}`);
  let w25 = await zeus(() => window.__zeus.walls());
  const gate = w25.pieces.find((p) => p.gate);
  if (!(w25.pieces.length >= 12 && gate && gate.t === 41 * 128 + 40)) fail(`#walls: the wall drawn: ${JSON.stringify(w25.pieces.map((p) => [p.t % 128, Math.floor(p.t / 128), p.gate]))}`);
  // The tower beside the gate, by a click with the tower tool.
  await zeus(() => window.__zeus.tool('tower'));
  await click(42, 40);
  w25 = await zeus(() => window.__zeus.walls());
  if (w25.towers.length !== 1) fail(`#walls: no tower set beside the gate: ${JSON.stringify(w25.towers)}`);
  await zeus(() => window.__zeus.tool(null));
  await frames(2);
  // A stretch's hover, and the tower's.
  const hoverAt = async (x, z) => {
    const p = await zeus(([x, z]) => window.__zeus.screenOf(x, z), [x, z]);
    await page.mouse.move(p.x, p.y);
    await page.mouse.move(p.x + 1, p.y);
    await frames(3);
    return zeus(() => window.__zeus.tipText());
  };
  const st = await hoverAt(40.5, 33.5);
  if (!/A stretch of wall · whole[\s\S]*Strength 600 of 600/.test(st ?? '')) fail(`#walls: a stretch's hover: ${st}`);
  const tt = await hoverAt(42, 40);
  if (!/A tower/.test(tt ?? '')) fail(`#walls: the tower's hover: ${tt}`);
  // Undo takes the tower, then the wall.
  await page.keyboard.press('u');
  await frames(2);
  await page.keyboard.press('u');
  await frames(2);
  w25 = await zeus(() => window.__zeus.walls());
  const after = await zeus(() => window.__zeus.city().money);
  if (!(w25.pieces.length === 0 && w25.towers.length === 0 && after === before.money)) fail(`#walls: undo: ${JSON.stringify({ w25, after, before: before.money })}`);
}
await open('#siege-paused');
{
  const s25 = await zeus(() => ({ w: window.__zeus.walls(), lines: window.__zeus.townLines(), prepared: window.__zeus.prepared }));
  if (!(s25.prepared && s25.w.siege === 41 * 128 + 40 && s25.w.towers.length === 2 && s25.w.towers.every((t) => t.workers === 4))) fail(`#siege: ${JSON.stringify(s25.w)}`);
  if (!/hammering at your gate/.test(JSON.stringify(s25.lines))) fail(`#siege: the band's line: ${JSON.stringify(s25.lines).slice(0, 600)}`);
  const shot = await zeus(() => {
    const z = window.__zeus;
    let arrows = 0;
    let hammering = 0;
    for (let i = 0; i < 60; i++) {
      z.skip(1);
      arrows = Math.max(arrows, z.walls().towerArrows);
      hammering = Math.max(hammering, z.walls().hammering);
    }
    return { arrows, hammering, w: z.walls() };
  });
  if (!(shot.arrows > 0 && shot.hammering > 0)) fail(`#siege: the towers not shooting or nobody hammering: ${JSON.stringify(shot)}`);
  await zeus(() => window.__zeus.jump({ x: 40.5, z: 41.5, yaw: -0.7, dist: 11, tilt: 0.1 }));
  await frames(3);
  // The gate's hover (raiders stand in front of it: under the lintel, just above them).
  const p = await zeus(() => window.__zeus.screenOf(40.5, 41.5));
  let gt = '';
  for (const dy of [0, -6, -12, -18, -24]) {
    await page.mouse.move(p.x, p.y + dy);
    await page.mouse.move(p.x + 1, p.y + dy);
    await frames(3);
    gt = (await zeus(() => window.__zeus.tipText())) ?? '';
    if (/A gate/.test(gt)) break;
  }
  if (!/A gate[\s\S]*hammering at it/.test(gt) && !/raider of Sparta/.test(gt)) fail(`#siege: the gate's hover: ${gt}`);
}
if (errors.length > err25) fail('page errors (slice 25):\n' + errors.slice(err25).join('\n'));
// Slice 26: from the sea. #landing: Troy's ships in the bay (the chip, a ship's hover), drawn up on the beach, the band landed and
// the shipyard in the build bar (Military, after the tower); #triremes: the fleet on the Army tab, the triremes rowing out, a ship
// sunk and a trireme's hover; #pirates: the sea lane on Athens' page, a trireme sent to guard it, on the map, and the fight's report.
const err26 = errors.length;
await open('#landing-paused');
{
  const a26 = await zeus(() => ({ prepared: window.__zeus.prepared, f: window.__zeus.fleet(), chip: document.querySelector('.raid-chip')?.textContent ?? '', side: window.__zeus.sideText() }));
  if (!(a26.prepared && a26.f.ships.length >= 2 && a26.f.ships.some((e) => e.state === 'sailing') && a26.f.triremes.length === 0)) fail(`#landing: ${JSON.stringify(a26.f)}`);
  if (!/Troy’s ships · \d+ in the bay/i.test(a26.chip)) fail(`#landing: the raid chip: ${a26.chip}`);
  // The shipyard's picture on the Military tab, after the tower's.
  if (!/shipyard/i.test(await zeus(() => [...document.querySelectorAll('.side-wells [data-tool]')].map((b) => b.getAttribute('data-tool')).join(',')))) fail('#landing: no shipyard in the Military tab');
  // A ship's hover (the hoplites' banner let go first: in hand, the pointer places it).
  await page.keyboard.press('Escape');
  const ship = a26.f.ships.filter((e) => e.state === 'sailing').sort((p, q) => p.z - q.z)[0];
  await zeus((v) => window.__zeus.jump(v), { x: ship.x, z: ship.z, yaw: 3.0, dist: 14, tilt: 0.2 });
  await frames(4);
  const shown = (await zeus(() => window.__zeus.fleet())).shown.find((o) => o.id === ship.id);
  let tip = '';
  if (shown) {
    const p = await zeus(([x, z]) => window.__zeus.screenOf(x, z), [shown.x, shown.z]);
    for (const dy of [-8, -16, 0, -24]) {
      await page.mouse.move(p.x, p.y + dy);
      await page.mouse.move(p.x + 1, p.y + dy);
      await frames(3);
      tip = (await zeus(() => window.__zeus.tipText())) ?? '';
      if (/A ship of Troy/.test(tip)) break;
    }
  }
  if (!/A ship of Troy (sailing in|on the horizon)/.test(tip)) fail(`#landing: an enemy ship's hover: ${tip} ${JSON.stringify(shown)}`);
  // On: drawn up on the beach, and the band ashore.
  const b26 = await zeus(() => {
    const z = window.__zeus;
    for (let i = 0; i < 1200 && !(z.fleet().ships.every((e) => e.state === 'beached') && z.battle().foes > 0); i += 5) z.skip(5);
    return { f: z.fleet(), b: z.battle() };
  });
  await frames(6);
  b26.lines = await zeus(() => window.__zeus.townLines());
  if (!(b26.f.ships.length >= 2 && b26.f.ships.every((e) => e.state === 'beached') && b26.b.foes >= 10)) fail(`#landing: not landed: ${JSON.stringify({ f: b26.f, foes: b26.b.foes })}`);
  if (!/ashore|landed|in your city/.test(JSON.stringify(b26.lines))) fail(`#landing: the landing's line: ${JSON.stringify(b26.lines).slice(0, 600)}`);
}
await open('#triremes-paused');
{
  const a26 = await zeus(() => ({ prepared: window.__zeus.prepared, f: window.__zeus.fleet(), side: window.__zeus.sideText() }));
  if (!(a26.prepared && a26.f.triremes.length === 2 && a26.f.triremes.every((t) => t.crew >= 6) && a26.f.ships.length >= 3)) fail(`#triremes: ${JSON.stringify(a26.f)}`);
  if (!/The fleet[\s\S]*The shipyard[\s\S]*The Nike[\s\S]*The Glaukos[\s\S]*Build a trireme/.test(a26.side)) fail(`#triremes: the Army tab's fleet: ${a26.side.slice(0, 1500)}`);
  const b26 = await zeus(() => {
    const z = window.__zeus;
    let out = false;
    for (let i = 0; i < 900 && !z.fleet().ships.some((e) => e.state === 'sinking'); i += 2) {
      z.skip(2);
      out ||= z.fleet().triremes.some((t) => t.task === 'fight');
    }
    return { out, f: z.fleet(), news: z.army().news ?? [] };
  });
  if (!(b26.out && b26.f.ships.some((e) => e.state === 'sinking'))) fail(`#triremes: no ship sunk: ${JSON.stringify(b26.f)}`);
  // A trireme's hover.
  const t = b26.f.triremes.find((x) => x.state === 'rowing') ?? b26.f.triremes[0];
  await zeus((v) => window.__zeus.jump(v), { x: t.x, z: t.z, yaw: 3.0, dist: 12, tilt: -0.1 });
  await frames(4);
  const shown = (await zeus(() => window.__zeus.fleet())).shown.find((o) => o.kind === 'trireme' && o.id === t.id);
  let tip = '';
  if (shown) {
    const p = await zeus(([x, z]) => window.__zeus.screenOf(x, z), [shown.x, shown.z]);
    for (const dy of [-8, -16, 0]) {
      await page.mouse.move(p.x, p.y + dy);
      await page.mouse.move(p.x + 1, p.y + dy);
      await frames(3);
      tip = (await zeus(() => window.__zeus.tipText())) ?? '';
      if (/The trireme/.test(tip)) break;
    }
  }
  if (!/The trireme (Nike|Glaukos) · \d+ of 12 rowers · hull \d+%/.test(tip)) fail(`#triremes: a trireme's hover: ${tip}`);
}
await open('#pirates-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
{
  let g26 = await gi();
  if (!(g26.shown === 'athens' && /The sea lane[\s\S]*Pirates off Cape Skyllaion[\s\S]*Send the Nike to guard it/.test(g26.panel))) fail(`#pirates: Athens' page: ${g26.panel.slice(0, 1500)}`);
  if (!Object.keys(g26.travellers).some((k) => k.startsWith('pirates-'))) fail(`#pirates: no pirates on the map: ${JSON.stringify(Object.keys(g26.travellers))}`);
  await page.click('.greece-panel button[data-guard]');
  await frames(3);
  let f26 = await zeus(() => window.__zeus.fleet());
  if (!(f26.triremes[0].order === 'lane' && f26.triremes[0].lane === 'athens-sea' && f26.triremes[0].state === 'rowing')) fail(`#pirates: not sent: ${JSON.stringify(f26.triremes)}`);
  await zeus(() => {
    const z = window.__zeus;
    for (let i = 0; i < 600 && z.fleet().triremes[0].state !== 'away'; i += 2) z.skip(2);
  });
  await frames(4);
  g26 = await gi();
  if (!Object.keys(g26.travellers).some((k) => k.startsWith('trireme-'))) fail(`#pirates: the trireme not on the map: ${JSON.stringify(Object.keys(g26.travellers))} ${JSON.stringify((await zeus(() => window.__zeus.fleet())).triremes)}`);
  f26 = await zeus(() => {
    const z = window.__zeus;
    for (let i = 0; i < 900 && z.fleet().reports.length === 0; i += 5) z.skip(5);
    return z.fleet();
  });
  if (!(f26.reports.length === 1 && /^The Nike (met|fought) a pirate ship off Cape Skyllaion/.test(f26.reports[0]))) fail(`#pirates: the fight's report: ${JSON.stringify(f26)}`);
}
if (errors.length > err26) fail('page errors (slice 26):\n' + errors.slice(err26).join('\n'));
// Slice 27: loans both ways. #borrow: Corinth's and Athens' terms come back, Corinth's Loans tab open with its reasons; accepted, the
// coin on its way, the debts chip and the Administration tab's loans; Sparta's page says why it won't lend. #lend: Athens asks to borrow, lent,
// the coin out of the treasury on its own ledger line and the herald on the map. #repaid: Athens' repayment arrives in the treasury.
const err27 = errors.length;
await open('#borrow-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
let g27 = await gi();
let l27 = await zeus(() => window.__zeus.loans());
const corinth27 = l27.loans.find((l) => l.city === 'corinth' && l.side === 'in');
if (!(g27.shown === 'corinth' && g27.tab === 'loans' && corinth27?.state === 'terms' && l27.loans.some((l) => l.city === 'athens' && l.state === 'terms'))) fail(`#borrow: ${JSON.stringify(l27)} ${g27.shown} ${g27.tab}`);
if (!/Your ask[\s\S]*Corinth will lend 2,000 dr at \d+%, repaid in \d+ months[\s\S]*Corinth is rich \(−2%\)[\s\S]*Accept · 2,000 dr[\s\S]*Offer a loan[\s\S]*How likely they are to repay/.test(g27.panel)) fail(`#borrow: Corinth's Loans tab: ${g27.panel.slice(0, 1500)}`);
if (!(await zeus(() => window.__zeus.townLines())).some((l) => /Corinth will lend you 2,000 dr at \d+%[\s\S]*accept or decline on Corinth’s page/.test(l))) fail(`#borrow: no town line for the terms: ${JSON.stringify(await zeus(() => window.__zeus.townLines()))}`);
const money27 = (await city()).money;
await page.click('.greece-panel button[data-loan="accept"]');
await frames(3);
l27 = await zeus(() => window.__zeus.loans());
if (!(l27.loans.find((l) => l.id === corinth27.id)?.state === 'coming' && l27.chipShown && /You owe Corinth 2,\d{3} dr · \d+ \w+/.test(l27.chip))) fail(`#borrow: accepted: ${JSON.stringify(l27)}`);
await zeus(() => window.__zeus.greece(true, 'sparta', 'loans'));
await frames(3);
g27 = await gi();
if (!/As things stand, the king of Sparta does not lend to a city he barely knows/.test(g27.panel)) fail(`#borrow: Sparta's Loans tab: ${g27.panel.slice(0, 1200)}`);
await zeus(() => window.__zeus.greece(false));
await zeus(() => window.__zeus.speed('fast'));
await page.waitForFunction((id) => window.__zeus.loans().loans.find((l) => l.id === id)?.state === 'running', corinth27.id, { timeout: 300000, polling: 50 });
await zeus(() => window.__zeus.speed('paused'));
await zeus(() => window.__zeus.sideTab('administration'));
await frames(3);
const side27 = await zeus(() => window.__zeus.sideText());
if (!((await city()).money >= money27 + 2000 - 600 && /Loans\s*\+2,000/.test(side27) && /Loans[\s\S]*From Corinth[\s\S]*2,\d{3} dr due to Corinth[\s\S]*Repay now/.test(side27))) fail(`#borrow: the coin and the Administration tab: ${(await city()).money} ${side27.slice(0, 1500)}`);
// Repaid early from the Administration tab (the old Money tab): the whole sum, interest and all, and the herald takes it.
{
  const owed27 = (await zeus(() => window.__zeus.loans())).loans.find((l) => l.id === corinth27.id).owed;
  const m27 = (await city()).money;
  await page.click('.side button[data-act="repay"]');
  await frames(3);
  const after27 = (await zeus(() => window.__zeus.loans())).loans.find((l) => l.id === corinth27.id);
  if (!(after27.state === 'repaying' && after27.gift > 0 && (await city()).money === m27 - owed27)) fail(`#borrow: repaid early: ${JSON.stringify(after27)} ${m27} ${(await city()).money}`);
}
await open('#lend-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
g27 = await gi();
const ask27 = (await zeus(() => window.__zeus.deals())).find((d) => d.kind === 'loanask' && d.state === 'open');
if (!(ask27 && g27.shown === 'athens' && /asks to borrow[\s\S]*2,000 dr at \d+%[\s\S]*How likely they are to repay[\s\S]*Lend it · 2,000 dr[\s\S]*Refuse/.test(g27.panel))) fail(`#lend: ${JSON.stringify(ask27)} ${g27.panel.slice(0, 1500)}`);
const before27 = (await city()).money;
await page.click(`.greece-panel button[data-deal="${ask27?.id}"][data-act="send"]`);
await frames(3);
l27 = await zeus(() => window.__zeus.loans());
if (!(l27.loans.some((l) => l.city === 'athens' && l.side === 'out' && l.state === 'sending' && l.gift > 0) && (await city()).money === before27 - 2000)) fail(`#lend: lent: ${JSON.stringify(l27)} ${before27} ${(await city()).money}`);
await zeus(() => window.__zeus.greece(false));
await frames(2);
await zeus(() => window.__zeus.ledger(true));
await frames(2);
const led27 = await zeus(() => window.__zeus.ledgerText());
await zeus(() => window.__zeus.ledger(false));
if (!/Going out[\s\S]*Lent · to Athens\s*−2,000/.test(led27)) fail(`#lend: the ledger: ${led27.slice(0, 1200)}`);
await open('#repaid-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
g27 = await gi();
l27 = await zeus(() => window.__zeus.loans());
const rep27 = l27.loans.find((l) => l.city === 'athens' && l.side === 'out');
if (!(rep27?.state === 'repaying' && g27.tab === 'loans' && /Athens’ herald brings 2,\d{3} dr, repaid/.test(g27.panel) && Object.keys(g27.travellers).some((k) => k.startsWith('gift-')))) fail(`#repaid: ${JSON.stringify(l27)} ${g27.panel.slice(0, 1200)}`);
await zeus(() => window.__zeus.speed('fast'));
await page.waitForFunction((id) => window.__zeus.loans().loans.find((l) => l.id === id)?.state === 'repaid', rep27?.id, { timeout: 300000, polling: 50 });
await zeus(() => window.__zeus.speed('paused'));
await zeus(() => window.__zeus.greece(false));
await frames(2);
await zeus(() => window.__zeus.ledger(true));
await frames(2);
const led27b = await zeus(() => window.__zeus.ledgerText());
await zeus(() => window.__zeus.ledger(false));
if (!/Coming in[\s\S]*Loan repaid · by Athens\s*\+2,\d{3}/.test(led27b)) fail(`#repaid: the ledger: ${led27b.slice(0, 1200)}`);
if (errors.length > err27) fail('page errors (slice 27):\n' + errors.slice(err27).join('\n'));
// Slice 28: debts unpaid. #overdue: Corinth's loan held back past its day, the steps dated on its Loans tab, the chip and the line; paid when the
// treasury can. #seized: the gift seized on the road and goods from the stores (slice 29), the ledger and the line. #creditors: Corinth's men in the city, the chip. #collect: the four
// answers, a full force sent by a click, the companies away and the army on the map. #report: the report and the army's card. #forgive: forgiven.
const err28 = errors.length;
await open('#overdue-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
let g28 = await gi();
let l28 = await zeus(() => window.__zeus.loans());
const c28 = l28.loans.find((l) => l.city === 'corinth' && l.side === 'in');
if (!(c28?.state === 'overdue' && c28.step === 1 && c28.withhold && g28.tab === 'loans')) fail(`#overdue: ${JSON.stringify(l28)} ${g28.tab}`);
if (!/Overdue since[\s\S]*held back[\s\S]*On the day: unpaid\.[\s\S]*Seizing\.[\s\S]*His army\.[\s\S]*Pay when the treasury can/.test(g28.panel)) fail(`#overdue: Corinth's Loans tab: ${g28.panel.slice(0, 1600)}`);
if (!(l28.overdue && /Overdue: 2,220 dr to Corinth · warned/.test(l28.chip))) fail(`#overdue: the chip: ${l28.chip}`);
if (!(await zeus(() => window.__zeus.townLines())).some((l) => /Your loan from Corinth is overdue: 2,220 dr, you are holding it back\. Unpaid on \d+ \w+ \d+ BC, Corinth closes its routes/.test(l))) fail(`#overdue: the town line: ${JSON.stringify(await zeus(() => window.__zeus.townLines()))}`);
await page.click('.greece-panel button[data-loan="withhold"]');
await frames(2);
await zeus(() => window.__zeus.speed('fast'));
await page.waitForFunction((id) => ['repaying', 'repaid'].includes(window.__zeus.loans().loans.find((l) => l.id === id)?.state), c28?.id, { timeout: 120000, polling: 50 });
await zeus(() => window.__zeus.speed('paused'));
await open('#seized-paused');
await frames(2);
const led28 = await zeus(() => window.__zeus.ledgerText());
if (!/Seized against your debts[\s\S]*Seized by Corinth · drachmas\s*250/.test(led28) || !/Seized by Corinth · (oil|meat|wheat|cheese|wine|fleece)/.test(led28)) fail(`#seized: the ledger: ${led28.slice(0, 1400)}`);
if (!(await zeus(() => window.__zeus.townLines())).some((l) => /Corinth is seizing your goods against your debt \(1,470 dr left, 750 dr seized so far\)/.test(l))) fail(`#seized: the town line: ${JSON.stringify(await zeus(() => window.__zeus.townLines()))}`);
l28 = await zeus(() => window.__zeus.loans());
if (!/Overdue: 1,470 dr to Corinth · seizing/.test(l28.chip)) fail(`#seized: the chip: ${l28.chip}`);
await open('#creditors-paused');
const r28 = await zeus(() => window.__zeus.raids());
if (!(r28.raids.some((r) => r.city === 'corinth' && r.phase === 'raiding') && r28.band && /Collectors in the city|Fighting in the city/.test(r28.chip) && !r28.raids.some((r) => r.fired))) fail(`#creditors: ${JSON.stringify(r28)}`);
await open('#collect-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
g28 = await gi();
if (!/Corinth owes you[\s\S]*Overdue since[\s\S]*Forgive it[\s\S]*Demand it[\s\S]*Send your soldiers to collect it[\s\S]*Send a raiding party[\s\S]*about \d in 10[\s\S]*Send a full force/.test(g28.panel)) fail(`#collect: Corinth's Loans tab: ${g28.panel.slice(0, 2000)}`);
await page.click('.greece-panel button[data-loan="expedition"][data-kind="force"]');
await frames(2);
let e28 = await zeus(() => window.__zeus.expeditions());
if (!(e28.length === 1 && e28[0].kind === 'force' && e28[0].phase === 'mustering' && e28[0].companies.length === 2)) fail(`#collect: sent: ${JSON.stringify(e28)}`);
await zeus(() => window.__zeus.greece(false));
await zeus(() => window.__zeus.speed('fast'));
await page.waitForFunction(() => window.__zeus.expeditions()[0]?.phase === 'marching', null, { timeout: 300000, polling: 50 });
await zeus(() => window.__zeus.speed('paused'));
const a28 = await zeus(() => window.__zeus.army());
if (!a28.companies.every((c) => c.order === 'away')) fail(`#collect: the companies are not away: ${JSON.stringify(a28)}`);
await zeus(() => window.__zeus.sideTab('army'));
await frames(2);
const side28 = await zeus(() => window.__zeus.sideText());
if (!/Away · on the road to Corinth[\s\S]*Away on an expedition/.test(side28)) fail(`#collect: the Army tab: ${side28.slice(0, 1500)}`);
await zeus(() => window.__zeus.greece(true));
await frames(3);
g28 = await gi();
if (!Object.keys(g28.travellers).some((k) => k.startsWith('exp-'))) fail(`#collect: no army on the map: ${JSON.stringify(Object.keys(g28.travellers))}`);
await open('#report-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
g28 = await gi();
e28 = await zeus(() => window.__zeus.expeditions());
if (!(e28[0]?.phase === 'fighting' && /Your soldiers[\s\S]*Your army is at Corinth, the garrison beaten[\s\S]*A full force: the 1st company of hoplites[\s\S]*They met Corinth’s garrison/.test(g28.panel))) fail(`#report: ${JSON.stringify(e28)} ${g28.panel.slice(0, 1600)}`);
const ek28 = Object.keys(g28.travellers).find((k) => k.startsWith('exp-'));
if (ek28) {
  // (At this window size the lines under the top bar lie over the army: set them aside for the hover.)
  const hide28 = await page.addStyleTag({ content: '.townlines { visibility: hidden !important; }' });
  const at28 = g28.travellers[ek28];
  await page.mouse.move(at28.x, at28.y);
  await frames(2);
  g28 = await gi();
  if (!/^Your army · \d+ men\s*Your army is at Corinth, the garrison beaten/.test(g28.card)) fail(`#report: the army's card: ${g28.card}`);
  await page.mouse.move(5, 500);
  await hide28.evaluate((e) => e.remove());
} else fail(`#report: no army on the map: ${JSON.stringify(Object.keys(g28.travellers))}`);
await open('#forgive-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
await page.click('.greece-panel button[data-loan="forgive"]');
await frames(2);
l28 = await zeus(() => window.__zeus.loans());
if (!l28.loans.some((l) => l.city === 'athens' && l.side === 'out' && l.state === 'forgiven')) fail(`#forgive: ${JSON.stringify(l28)}`);
await zeus(() => window.__zeus.greece(true, 'athens', 'ruler'));
await frames(2);
g28 = await gi();
if (!/\+\d+\s*You forgave their debt of 2,220 dr/.test(g28.panel)) fail(`#forgive: the reason on Athens' page: ${g28.panel.slice(0, 1200)}`);
if (errors.length > err28) fail('page errors (slice 28):\n' + errors.slice(err28).join('\n'));

// Slice 29: #fortress, the phase's prepared town: walls, gates and towers, two barracks and three companies, two triremes, a loan
// each way, Sparta's band gathering; the Army tab open; played on, the companies sent to the west gate by the order and the band met.
const err29 = errors.length;
await open('#fortress-paused');
{
  const a29 = await zeus(() => ({ prepared: window.__zeus.prepared, w: window.__zeus.walls(), a: window.__zeus.army(), f: window.__zeus.fleet(), l: window.__zeus.loans(), r: window.__zeus.raids(), side: window.__zeus.sideText(), lines: window.__zeus.townLines() }));
  const gates = a29.w.pieces.filter((p) => p.gate).map((p) => p.t);
  if (!(a29.prepared && gates.includes(41 * 128 + 40) && gates.some((t) => Math.floor(t / 128) === 22) && a29.w.towers.length === 3 && a29.w.towers.every((t) => t.workers > 0))) fail(`#fortress: the walls: ${JSON.stringify({ gates, towers: a29.w.towers })}`);
  if (!(a29.a.companies.length === 3 && a29.a.companies.every((c) => c.men >= 10) && a29.f.triremes.length === 2 && a29.f.triremes.every((t) => t.crew === 12))) fail(`#fortress: the army and fleet: ${JSON.stringify({ c: a29.a.companies, t: a29.f.triremes })}`);
  if (!(a29.l.loans.some((l) => l.side === 'in' && l.state === 'running') && a29.l.loans.some((l) => l.side === 'out' && l.state === 'running'))) fail(`#fortress: the loans: ${JSON.stringify(a29.l.loans)}`);
  if (!a29.r.raids.some((r) => r.city === 'sparta' && (r.phase === 'gathering' || r.phase === 'marching'))) fail(`#fortress: Sparta's band: ${JSON.stringify(a29.r.raids)}`);
  if (!/The second barracks[\s\S]*The fleet/.test(a29.side)) fail(`#fortress: the Army tab: ${a29.side.slice(0, 1500)}`);
  if (!/Sparta/.test(JSON.stringify(a29.lines))) fail(`#fortress: the band's line: ${JSON.stringify(a29.lines).slice(0, 600)}`);
  const b29 = await zeus(() => {
    const z = window.__zeus;
    for (const c of z.army().companies) z.order({ type: 'banner', company: c.id, tile: 41 * 128 + 43 });
    for (let i = 0; i < 1500 && !z.raids().raids.some((r) => r.city === 'sparta' && r.end !== ''); i += 5) z.skip(5);
    return { r: z.raids().raids.find((r) => r.city === 'sparta'), b: z.battle() };
  });
  if (!(b29.r && b29.r.end !== '' && b29.b.fallen > 0)) fail(`#fortress: the band not met: ${JSON.stringify(b29)}`);
}
if (errors.length > err29) fail('page errors (slice 29):\n' + errors.slice(err29).join('\n'));

// Slice 30: thieves in the night. #thieves: the hut street tempted (the crime overlay, the town line, a hut's panel), played on until a
// thief goes out (drawn, his tip and line) and robs a villa (the town line); a watch post built by the street and the next thief caught
// (the line, the fine on the ledger). #nowatch: four months on with no watch post, the most tempted hut's panel, its story and the Safety tab's row.
const err30 = errors.length;
await open('#thieves-paused');
{
  let k30 = await zeus(() => window.__zeus.crime(500));
  const lines30 = () => zeus(() => window.__zeus.townLines());
  // (The lines are read every half second of the page's clock: wait for one like this, a few seconds at most.)
  const line30 = (re) => page.waitForFunction((src) => window.__zeus.townLines().some((l) => new RegExp(src).test(l)), re.source, { timeout: 15000, polling: 100 }).then(() => true, () => false);
  if (!(k30.on && k30.tempted.length >= 3 && k30.thieves.length === 0)) fail(`#thieves: ${JSON.stringify(k30)}`);
  if ((await city()).overlayMode !== 'crime') fail(`#thieves: the crime overlay is not on (${(await city()).overlayMode})`);
  if (!(await line30(/^Crime [^:]+: (\d+ homes are|.+ is) tempted to steal/))) fail(`#thieves: the town line: ${JSON.stringify(await lines30())}`);
  const top30 = [...k30.tempted].sort((a, b) => b.tempt - a.tempt)[0];
  await zeus((id) => window.__zeus.showPanel(id), top30.id);
  await frames(2);
  const p30 = await zeus(() => window.__zeus.panelText());
  // (Slice 33: with the seasons' history the most tempted home can be a newcomer's tent, tempted for want of work with villas near, not hunger.)
  if (!/Tempted to steal: [^·]*(hungry|villas nearby|no work)[\s\S]*\d+% · a thief in about[\s\S]*(Holding them back|A watchman walking by would hold them back)/.test(p30)) fail(`#thieves: the hut's panel: ${p30.slice(0, 1200)}`);
  await zeus(() => window.__zeus.showPanel(0));
  // Played on until a thief is out: he is drawn, his tip names him, and the line follows him.
  await zeus(() => {
    const z = window.__zeus;
    for (let i = 0; i < 900 && z.crime().thieves.length === 0; i += 5) z.skip(5);
  });
  await frames(3);
  k30 = await zeus(() => window.__zeus.crime());
  const t30 = k30.thieves[0];
  if (!(t30 && t30.drawn)) fail(`#thieves: no thief out, or not drawn: ${JSON.stringify(k30)}`);
  if (!(await line30(/^A thief out [^:]+: .+, (on (his|her) way to rob|slipping home|out in the streets)/))) fail(`#thieves: the thief's line: ${JSON.stringify(await lines30())}`);
  if (t30?.drawn) {
    await zeus((t) => window.__zeus.jump({ x: t.x, z: t.z, yaw: -0.2, dist: 12, tilt: 0.1 }), t30.drawn);
    await frames(3);
    const at30 = await zeus(() => window.__zeus.walker('thief'));
    if (at30) {
      await page.mouse.move(at30.x, at30.y);
      await frames(2);
      const tt30 = await tip();
      if (!/^Thief\s*A hooded figure, keeping to the side of the road/.test(tt30 ?? '')) fail(`#thieves: hovering the thief: ${tt30}`);
      await page.mouse.move(5, 500);
    } else fail('#thieves: the thief is not on the screen');
  }
  // On until a theft: the town hears of it.
  await zeus(() => {
    const z = window.__zeus;
    for (let i = 0; i < 1200 && z.crime().now.thefts + z.crime().last.thefts === 0; i += 5) z.skip(5);
  });
  await frames(2);
  k30 = await zeus(() => window.__zeus.crime());
  if (!(k30.now.thefts + k30.last.thefts > 0 && k30.news.some((n) => /^A thief robbed /.test(n)))) fail(`#thieves: no theft: ${JSON.stringify(k30)}`);
  if (!(await line30(/^A thief (robbed|stole|broke)|^A thief out/))) fail(`#thieves: the theft's line: ${JSON.stringify(await lines30())}`);
  // A watch post by the street (north of its road), and the next thief caught.
  const b30 = await zeus(() => {
    const z = window.__zeus;
    const n = z.buildingsOf('watchpost').length;
    z.order({ type: 'build', kind: 'watchpost', at: [24 * 128 + 70] });
    z.skip(1);
    const built = z.buildingsOf('watchpost').length > n;
    for (let i = 0; i < 1800 && z.crime().now.caught + z.crime().last.caught === 0; i += 5) z.skip(5);
    return { built, k: z.crime() };
  });
  await frames(2);
  if (!(b30.built && b30.k.now.caught + b30.k.last.caught > 0 && b30.k.news.some((n) => /^A thief caught [^:]+: .+(fine|sent home)/.test(n)))) fail(`#thieves: the watch post's catch: ${JSON.stringify(b30)}`);
  if (!(await line30(/^A thief caught /))) fail(`#thieves: the catch's line: ${JSON.stringify(await lines30())}`);
  await zeus(() => window.__zeus.ledger(true));
  await frames(2);
  const led30 = await zeus(() => window.__zeus.ledgerText());
  if (b30.k.now.fines > 0 && !/Fines · thieves caught\s*\d+/.test(led30)) fail(`#thieves: the fine on the ledger: ${led30.slice(0, 1400)}`);
  await zeus(() => window.__zeus.ledger(false));
}
await open('#nowatch');
{
  const k30 = await zeus(() => window.__zeus.crime());
  if (!(k30.on && k30.news.some((n) => /^A thief robbed /.test(n)) && (await city()).tool === null)) fail(`#nowatch: ${JSON.stringify(k30)}`);
  const p30 = await zeus(() => window.__zeus.panelText());
  if (!/The house of [\s\S]*(Tempted to steal|is out stealing)/.test(p30)) fail(`#nowatch: the panel: ${p30.slice(0, 1400)}`);
  if (!/came home before dawn with .+ that wasn’t (his|hers)/.test(p30)) fail(`#nowatch: the panel's story: ${p30.slice(0, 2000)}`);
  const side30 = await zeus(() => window.__zeus.sideText());
  if (!/Fire, wear and crime[\s\S]*Crime\s*(\d+ (thief|thieves) out|\d+ homes? tempted|\d+ thefts? this month|quiet)/.test(side30)) fail(`#nowatch: the Safety tab: ${side30.slice(0, 1500)}`);
  const t0 = await zeus(() => window.__zeus.tick());
  await frames(10);
  if ((await zeus(() => window.__zeus.tick())) !== t0) fail('#nowatch did not open paused');
}
if (errors.length > err30) fail('page errors (slice 30):\n' + errors.slice(err30).join('\n'));

// Slice 31: Greece grows. #greecegrows: the town ten years on, paused on the map: eleven cities and the six sites (Naxos a Rhodian
// colony), the labels with their people, the News of Greece with a colony and a vassal; Rhodes' size line and its Rivals tab's
// "How it stands"; a site's hover card. #knossos and #memphis: the newcomers' pages. At 1600 × 900 no label under the lines.
const err31 = errors.length;
await open('#greecegrows-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(4);
{
  let g31 = await gi();
  const p31 = await zeus(() => window.__zeus.prepared);
  if (!p31) fail('#greecegrows: not from its prepared town');
  if (!['thebes', 'argos', 'knossos', 'rhodes', 'memphis'].every((id) => g31.cities[id])) fail(`#greecegrows: the cities: ${JSON.stringify(Object.keys(g31.cities))}`);
  const rh31 = Object.keys(g31.sites).find((k) => /^rhodes:/.test(g31.sites[k]));
  if (!(Object.keys(g31.sites).length === 6 && rh31)) fail(`#greecegrows: the sites: ${JSON.stringify(g31.sites)}`);
  // (The colonies came years before by the dice, their news long scrolled away: the sites above say who holds them.)
  if (!/has bowed to/.test(g31.news)) fail(`#greecegrows: the News of Greece: ${g31.news.slice(0, 1500)}`);
  const sz31 = await zeus(() => ['athens', 'rhodes', 'memphis'].map((id) => document.querySelector(`.glabel.${id} .sz`)?.textContent ?? ''));
  if (!sz31.every((t) => /^[\d,]+/.test(t))) fail(`#greecegrows: the labels' sizes: ${JSON.stringify(sz31)}`);
  const n31 = g31.siteLabels[rh31 ?? 'naxos'];
  await page.mouse.move(n31.x, n31.y);
  await frames(2);
  g31 = await gi();
  if (!/ · [a-z]+[\s\S]*Rhodian colony since/.test(g31.card)) fail(`#greecegrows: the Rhodian colony's card: ${g31.card}`);
  await page.mouse.move(5, 500);
  await page.click('.greece-news li[data-city="rhodes"]');
  await frames(2);
  g31 = await gi();
  if (!(g31.shown === 'rhodes' && /[\d,]+ people[\s\S]*men[\s\S]*ships[\s\S]*The Rivals tab says why/.test(g31.panel))) fail(`#greecegrows: Rhodes' page: ${g31.panel.slice(0, 1200)}`);
  await page.click('.greece-panel button[data-tab="rivals"]');
  await frames(2);
  g31 = await gi();
  if (!/How it stands[\s\S]*People[\s\S]*Treasury[\s\S]*Army[\s\S]*Fleet[\s\S]*: a Rhodian colony since/.test(g31.panel)) fail(`#greecegrows: Rhodes' Rivals tab: ${g31.panel.slice(0, 1500)}`);
}
for (const [hash, id, name] of [['#knossos-paused', 'knossos', 'Knossos'], ['#memphis-paused', 'memphis', 'Memphis']]) {
  await open(hash);
  await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
  await frames(3);
  const g31 = await gi();
  if (!(g31.shown === id && new RegExp(`${name}[\\s\\S]*[\\d,]+ people`).test(g31.panel))) fail(`${hash}: the page: ${g31.shown} ${g31.panel.slice(0, 800)}`);
}
{
  // (The finding from phase 4: at 1600 × 900, Troy's label sat under the lines under the top bar.)
  await page.setViewportSize({ width: 1600, height: 900 });
  await open('#rivalsmap-paused');
  await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
  // (Review of slice 31: the labels follow the lines under the top bar a frame after they change, and on a slow machine the second line
  // comes in some frames after the map opens; at four frames Troy's was caught on its way down.)
  await frames(12);
  const under31 = await zeus(() => {
    const bars = [document.querySelector('.topbar'), document.querySelector('.greece-btn'), ...document.querySelectorAll('.townlines > .townline:not(.folded)')].filter(Boolean).map((e) => e.getBoundingClientRect());
    return [...document.querySelectorAll('.glabel')].filter((l) => l.style.display !== 'none').map((l) => [l.className, l.getBoundingClientRect()]).filter(([, r]) => bars.some((b) => b.height > 0 && r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top)).map(([c]) => c);
  });
  if (under31.length) fail(`#rivalsmap at 1600 × 900: labels under the lines: ${under31.join(', ')}`);
  await page.setViewportSize({ width: 1280, height: 720 });
}
if (errors.length > err31) fail('page errors (slice 31):\n' + errors.slice(err31).join('\n'));

// Slice 32: marble and timber. #quarry: the quarry tool in hand, its tip on the free outcrop above the bay and its refusal off the
// marble, marble's page on the Goods tab, the quarry and its storehouse, quarrymen at the face, sledges on the road, the quarry's
// and a quarryman's hovers. #loggers: the camp at the west wood, felled trees, loggers out, timber's page, the camp's and a logger's hovers.
const err32 = errors.length;
{
  const hoverAt32 = async (x, z) => {
    const p = await zeus(([x, z]) => window.__zeus.screenOf(x, z), [x, z]);
    await page.mouse.move(p.x, p.y);
    await page.mouse.move(p.x + 1, p.y);
    await frames(3);
    return zeus(() => window.__zeus.tipText());
  };
  const hoverWalker32 = async (kind) => {
    const sv = await zeus((k) => window.__zeus.walker(k), kind);
    if (!sv) return null;
    await page.mouse.move(sv.x, sv.y);
    await page.mouse.move(sv.x + 1, sv.y);
    await frames(3);
    return zeus(() => window.__zeus.tipText());
  };
  /** The first of a few points round a building whose hover matches. */
  const hoverBuilding32 = async (b, side, re) => {
    let last = null;
    for (const [dx, dz] of [[0.5, 0.5], [side - 0.5, side - 0.5], [0.5, side - 0.5], [side - 0.5, 0.5], [side / 2, side / 2]]) {
      last = await hoverAt32(b.x + dx, b.z + dz);
      if (re.test(last ?? '')) return last;
    }
    return last;
  };
  await open('#quarry-paused');
  const a32 = await zeus(() => ({ prepared: window.__zeus.prepared, tool: window.__zeus.city().tool, quarries: window.__zeus.buildingsOf('quarry'), side: window.__zeus.sideText(), w: window.__zeus.works() }));
  if (!(a32.prepared && a32.tool === 'quarry' && a32.quarries.length === 1 && a32.w.quarrymen === 4 && a32.w.sledges > 0)) fail(`#quarry: ${JSON.stringify({ ...a32, side: '' })}`);
  if (!/Marble[\s\S]*blocks? in the city/.test(a32.side)) fail(`#quarry: marble's page on the Goods tab: ${a32.side.slice(0, 600)}`);
  const on32 = await hoverAt32(106.5, 93.5);
  if (!/marble in the rock \d+%[\s\S]*blocks of marble a month/.test(on32 ?? '')) fail(`#quarry: the quarry tool's tip on the outcrop above the bay: ${on32}`);
  const off32 = await hoverAt32(101.5, 82.5);
  if (!/No marble in the rock here/.test(off32 ?? '')) fail(`#quarry: the quarry tool off the marble: ${off32}`);
  await zeus(() => window.__zeus.tool(null));
  await frames(2);
  const qt32 = await hoverBuilding32(a32.quarries[0], 3, /A marble quarry/);
  if (!/A marble quarry · [\d,]+ of 200 blocks of marble[\s\S]*Marble in the rock \d+%/.test(qt32 ?? '')) fail(`#quarry: the quarry's hover: ${qt32}`);
  const qm32 = await hoverWalker32('quarryman');
  if (!/^Quarryman/.test(qm32 ?? '')) fail(`#quarry: a quarryman's hover: ${qm32}`);

  await open('#loggers-paused');
  const b32 = await zeus(() => ({ prepared: window.__zeus.prepared, camps: window.__zeus.buildingsOf('loggers'), side: window.__zeus.sideText(), w: window.__zeus.works() }));
  if (!(b32.prepared && b32.camps.length === 1 && b32.w.felled >= 10 && b32.w.loggers.length > 0)) fail(`#loggers: ${JSON.stringify({ ...b32, side: '' })}`);
  if (!/Timber[\s\S]*logs? in the city/.test(b32.side)) fail(`#loggers: timber's page on the Goods tab: ${b32.side.slice(0, 600)}`);
  const ct32 = await hoverBuilding32(b32.camps[0], 2, /A loggers’ camp/);
  if (!/A loggers’ camp · [\d,]+ of 200 logs[\s\S]*Trees in reach/.test(ct32 ?? '')) fail(`#loggers: the camp's hover: ${ct32}`);
  // Played on until a logger is out at the wood, and hovered there.
  for (let i = 0; i < 200 && !(await zeus(() => window.__zeus.works().loggers.some((l) => l && l.doing !== 'home'))); i++) await zeus(() => window.__zeus.skip(2));
  await frames(3);
  const lg32 = await hoverWalker32('logger');
  if (!/^Logger/.test(lg32 ?? '')) fail(`#loggers: a logger's hover: ${lg32}`);
}
if (errors.length > err32) fail('page errors (slice 32):\n' + errors.slice(err32).join('\n'));


// Slice 33: the turning year. #seasons: the last days of February at the fastest speed, the dial counting down to
// spring, the land's look turning as the clock runs, the dial's words a season on. #winter: the Tyrian ship late for
// the storms (the chip and its tip say so), the dial in winter.
const err33 = errors.length;
const dial33 = () => zeus(() => ({ text: document.querySelector('.date .season')?.textContent ?? '', hidden: (document.querySelector('.date .season'))?.hidden ?? true, tip: document.querySelector('.date .season')?.getAttribute('title') ?? '' }));
// (Read paused: at the fastest speed a slow page can be well into spring before the first check. The speed is checked after.)
await open('#seasons-paused');
{
  const d0 = await dial33();
  if (d0.hidden || !/^Winter.*spring in \d+ d/.test(d0.text)) fail(`#seasons: the dial: ${JSON.stringify(d0)}`);
  const l0 = await zeus(() => window.__zeus.look());
  if (!(l0.phase !== null && l0.phase > 3.8 && l0.phase < 4)) fail(`#seasons: the look: ${JSON.stringify(l0)}`);
  const c33 = await city();
  if (c33.granaries < 1) fail(`#seasons: ${JSON.stringify(c33)}`);
  // A season on: spring, its look, and the dial's words.
  await zeus(() => window.__zeus.skip(900));
  await frames(4);
  const d1 = await dial33();
  const l1 = await zeus(() => window.__zeus.look());
  if (!/^Spring.*summer in \d+ d/.test(d1.text) || !(l1.phase !== null && l1.phase >= 0.85 && l1.phase < 1.1)) fail(`#seasons a season on: ${JSON.stringify({ d1, l1 })}`);
  if (!/^Spring/.test(d1.tip)) fail(`#seasons: the dial's tip: ${d1.tip}`);
}
// The bare link opens at the fastest speed.
await open('#seasons');
{
  const t0 = await zeus(() => window.__zeus.tick());
  await frames(30);
  const t1 = await zeus(() => window.__zeus.tick());
  if (t1 - t0 < 20) fail(`#seasons did not open at the fastest speed (${t0} -> ${t1})`);
}
await open('#winter');
{
  const d0 = await dial33();
  if (d0.hidden || !/^Winter/.test(d0.text)) fail(`#winter: the dial: ${JSON.stringify(d0)}`);
  const chip = await zeus(() => ({ text: document.querySelector('.ship-chip .txt')?.textContent ?? '', tip: document.querySelector('.ship-chip')?.getAttribute('title') ?? '' }));
  if (!/late/.test(chip.text) || !/late: winter storms in the gulf held her back \d+ days/.test(chip.tip)) fail(`#winter: the ship's chip: ${JSON.stringify(chip)}`);
  const l0 = await zeus(() => window.__zeus.look());
  if (!(l0.phase !== null && l0.phase >= 3 && l0.phase < 4)) fail(`#winter: the look: ${JSON.stringify(l0)}`);
}
if (errors.length > err33) fail('page errors (slice 33):\n' + errors.slice(err33).join('\n'));

// Slice 34: vassals and allies. #vassal: following Corinth's tribute caravan in, its town line; Corinth's Empire tab, its tribute
// and loyalty. #submit: Argos' Empire tab, the ways to take it with their odds; the demand sent, the herald on his way. #conquer:
// Argos your vassal, the report first, cowed; its tribute made heavy. #rebellion: Corinth arming, its label, line and warning; its
// tribute lightened.
const err34 = errors.length;
await open('#vassal-paused');
await frames(4);
{
  if (!(await city()).following) fail('#vassal: not following the tribute caravan');
  const chip34 = await zeus(() => document.querySelector('.follow-chip')?.textContent ?? '');
  if (!/caravan/i.test(chip34)) fail(`#vassal: the follow chip: ${chip34}`);
  const line34 = await zeus(() => document.querySelector('.townline.empire')?.textContent ?? '');
  if (!/Corinth’s tribute is coming in to your stores: [\d,]+ (wine|oil)/.test(line34)) fail(`#vassal: the town line: ${line34}`);
  await zeus(() => window.__zeus.greece(true));
  await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
  await page.click('.glabel.corinth', { force: true });
  await frames(2);
  await page.click('.greece-panel button[data-tab="empire"]');
  await frames(2);
  const g34 = await gi();
  if (!/Your vassal since[\s\S]*for its debt[\s\S]*Its loyalty[\s\S]*\d+ of 100[\s\S]*Its debt let go[\s\S]*Its tribute[\s\S]*(Light|Fair), in (wine|oil)[\s\S]*coming in to your stores[\s\S]*Paid in[\s\S]*How heavy/.test(g34.panel)) fail(`#vassal: Corinth's Empire tab: ${g34.panel.slice(0, 2000)}`);
}
await open('#submit-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
{
  let g34 = await gi();
  if (!(g34.shown === 'argos' && /Take Argos, or win it over[\s\S]*Conquer it[\s\S]*about \d in 10[\s\S]*Demand it submit[\s\S]*your \d+ men against its \d+[\s\S]*about \d in 10[\s\S]*An alliance/.test(g34.panel))) fail(`#submit: Argos' Empire tab: ${g34.shown} ${g34.panel.slice(0, 2000)}`);
  await page.click('.greece-panel button[data-empire="submit"]');
  await frames(2);
  g34 = await gi();
  if (!/Your herald is on his way to Argos with a demand that it submit to you: his answer comes about/.test(g34.panel)) fail(`#submit: the herald sent: ${g34.panel.slice(0, 1500)}`);
}
await open('#conquer-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
{
  let g34 = await gi();
  if (!(g34.shown === 'argos' && /Your vassal since[\s\S]*by conquest[\s\S]*Your (last march on it|army, marching on it)[\s\S]*Argos bows to you[\s\S]*Its loyalty[\s\S]*Still cowed by its defeat[\s\S]*Its tribute/.test(g34.panel))) fail(`#conquer: Argos' Empire tab: ${g34.shown} ${g34.panel.slice(0, 2000)}`);
  if (!(await zeus(() => !!document.querySelector('.glabel.argos .lord')))) fail('#conquer: no mark of yours on Argos\' label');
  await page.click('.greece-panel button[data-empire="tribute"][data-weight="2"]');
  await frames(2);
  g34 = await gi();
  if (!/Heavy, in coin/.test(g34.panel)) fail(`#conquer: the tribute made heavy: ${g34.panel.slice(0, 1500)}`);
}
await open('#rebellion-paused');
await page.waitForFunction(() => window.__zeus.greeceInfo?.().open === true, null, { timeout: 120000 });
await frames(3);
{
  let g34 = await gi();
  if (!(g34.shown === 'corinth' && /Corinth is arming[\s\S]*Loyalty \d+[\s\S]*heavy tribute[\s\S]*It rises about[\s\S]*Lighten its tribute to fair[\s\S]*March on it[\s\S]*about \d in 10/.test(g34.panel))) fail(`#rebellion: Corinth's Empire tab: ${g34.shown} ${g34.panel.slice(0, 2000)}`);
  if (!(await zeus(() => !!document.querySelector('.glabel.corinth svg.arming')))) fail('#rebellion: no shield on Corinth\'s label');
  const line34 = await zeus(() => document.querySelector('.townline.empire')?.textContent ?? '');
  if (!/Corinth is arming: loyalty \d+/.test(line34)) fail(`#rebellion: the town line: ${line34}`);
  await page.click('.greece-panel .arming button[data-empire="tribute"]');
  await frames(2);
  g34 = await gi();
  if (!/Fair, in coin/.test(g34.panel)) fail(`#rebellion: the tribute lightened: ${g34.panel.slice(0, 1500)}`);
}
if (errors.length > err34) fail('page errors (slice 34):\n' + errors.slice(err34).join('\n'));

// Slice 35: monuments. #monument: the Lighthouse half built on the headland, its builders, ox carts and the Monuments tab, the site's,
// the masons' yard's and a builder's hovers. #lit: the Lighthouse finished and its fire. #games: the Stadium's games on, a visitors' hover.
const err35 = errors.length;
{
  const hoverAt35 = async (x, z) => {
    const p = await zeus(([x, z]) => window.__zeus.screenOf(x, z), [x, z]);
    await page.mouse.move(p.x, p.y);
    await page.mouse.move(p.x + 1, p.y);
    await frames(3);
    return zeus(() => window.__zeus.tipText());
  };
  const hoverWalker35 = async (kind) => {
    const sv = await zeus((k) => window.__zeus.walker(k), kind);
    if (!sv) return null;
    await page.mouse.move(sv.x, sv.y);
    await page.mouse.move(sv.x + 1, sv.y);
    await frames(3);
    return zeus(() => window.__zeus.tipText());
  };
  const hoverBuilding35 = async (b, side, re) => {
    let last = null;
    for (const [dx, dz] of [[side / 2, side / 2], [0.5, 0.5], [side - 0.5, side - 0.5], [0.5, side - 0.5], [side - 0.5, 0.5]]) {
      last = await hoverAt35(b.x + dx, b.z + dz);
      if (re.test(last ?? '')) return last;
    }
    return last;
  };
  await open('#monument-paused');
  const a35 = await zeus(() => ({ prepared: window.__zeus.prepared, lh: window.__zeus.buildingsOf('lighthouse'), yards: window.__zeus.buildingsOf('masons'), side: window.__zeus.sideText() }));
  if (!(a35.prepared && a35.lh.length === 1 && a35.yards.length === 2)) fail(`#monument: ${JSON.stringify({ ...a35, side: '' })}`);
  if (!/The Lighthouse[\s\S]*ox carts? on the road to it[\s\S]*builders? of \d+ at work/.test(a35.side)) fail(`#monument: the Monuments tab: ${a35.side.slice(0, 600)}`);
  const lt35 = await hoverBuilding35(a35.lh[0], 3, /The Lighthouse ·/);
  if (!/The Lighthouse · \d+% built[\s\S]*stage \d of 3/.test(lt35 ?? '')) fail(`#monument: the site's hover: ${lt35}`);
  const bd35 = await hoverWalker35('builder');
  if (!/^Builder/.test(bd35 ?? '')) fail(`#monument: a builder's hover: ${bd35}`);
  // (At the merge of slices 33 and 35: with the seasons' autumn lines under the top bar, the carts on the road above the tower can sit under them
  // at 1280 × 720, so the camera goes to a cart first.)
  const oxAt35 = await zeus(() => window.__zeus.where('oxcart'));
  if (oxAt35) await zeus((o) => window.__zeus.jump({ x: o.x, z: o.z, yaw: 0.4, dist: 8, tilt: 0.1 }), oxAt35);
  await frames(3);
  const ox35 = await hoverWalker35('oxcart');
  if (!/[Oo]x cart/.test(ox35 ?? '')) fail(`#monument: an ox cart's hover: ${ox35}`);
  await zeus((y) => window.__zeus.jump({ x: y.x + 1, z: y.z + 1, yaw: 0.4, dist: 8, tilt: 0.1 }), a35.yards[0]);
  const my35 = await hoverBuilding35(a35.yards[0], 2, /A masons’ yard/);
  if (!/A masons’ yard · \d of \d builders out/.test(my35 ?? '')) fail(`#monument: the masons' yard's hover: ${my35}`);

  await open('#lit-paused');
  const b35 = await zeus(() => ({ prepared: window.__zeus.prepared, lh: window.__zeus.buildingsOf('lighthouse'), side: window.__zeus.sideText() }));
  if (!(b35.prepared && b35.lh.length === 1 && /The Lighthouse[\s\S]*finished/.test(b35.side))) fail(`#lit: ${JSON.stringify(b35).slice(0, 600)}`);
  await zeus((y) => window.__zeus.jump({ x: y.x + 1.5, z: y.z + 1.5, yaw: 2.5, dist: 10, tilt: 0.1 }), b35.lh[0]);
  const lf35 = await hoverBuilding35(b35.lh[0], 3, /The Lighthouse ·/);
  if (!/The Lighthouse · finished[\s\S]*Its fire burns/.test(lf35 ?? '')) fail(`#lit: the finished Lighthouse's hover: ${lf35}`);

  await open('#games-paused');
  const c35 = await zeus(() => ({ prepared: window.__zeus.prepared, st: window.__zeus.buildingsOf('stadium'), side: window.__zeus.sideText() }));
  if (!(c35.prepared && c35.st.length === 1 && /The games are on/.test(c35.side))) fail(`#games: ${JSON.stringify(c35).slice(0, 600)}`);
  const vs35 = await hoverWalker35('visitor');
  if (!/^Visitors to the games/.test(vs35 ?? '')) fail(`#games: a visitors' hover: ${vs35}`);
}
if (errors.length > err35) fail('page errors (slice 35):\n' + errors.slice(err35).join('\n'));

// Slice 38: contested seas. #blockade: Troy's ships holding the harbour's mouth, a ship's hover, the Army tab's line, the triremes rowing out,
// the blockade broken, the shipyard opened from the Army tab; #shipyard: the panel, a trireme under repair, Esc.
const err38 = errors.length;
{
  await open('#blockade-paused');
  const a38 = await zeus(() => ({ prepared: window.__zeus.prepared, seas: window.__zeus.seas(), side: window.__zeus.sideText() }));
  const held38 = a38.seas.ships.filter((e) => e.blockade && e.state === 'holding');
  if (!(a38.prepared && a38.seas.blockades.length === 1 && a38.seas.blockades[0].phase === 'holding' && held38.length === 3)) fail(`#blockade: ${JSON.stringify(a38.seas)}`);
  if (!(a38.seas.triremes.length === 2 && a38.seas.triremes.every((t) => t.state === 'rowing' && t.task === 'fight'))) fail(`#blockade: the triremes: ${JSON.stringify(a38.seas.triremes)}`);
  if (!/Troy’s fleet holds your harbour’s mouth/.test(a38.seas.words) || !/Troy’s fleet holds your harbour’s mouth[\s\S]*Open the shipyard/.test(a38.side)) fail(`#blockade: the line: ${a38.seas.words} / ${a38.side.slice(0, 800)}`);
  await page.keyboard.press('Escape');
  const e38 = held38[1];
  await zeus((v) => window.__zeus.jump(v), { x: e38.x, z: e38.z, yaw: 0.4, dist: 14, tilt: 0.2 });
  await frames(4);
  let tip38 = '';
  const p38 = await zeus(([x, z]) => window.__zeus.screenOf(x, z), [e38.x, e38.z]);
  for (const dy of [-8, -16, 0, -24]) {
    await page.mouse.move(p38.x, p38.y + dy);
    await page.mouse.move(p38.x + 1, p38.y + dy);
    await frames(3);
    tip38 = (await zeus(() => window.__zeus.tipText())) ?? '';
    if (/A ship of Troy/.test(tip38)) break;
  }
  if (!/A ship of Troy holding the mouth of your harbour/.test(tip38)) fail(`#blockade: a blockading ship's hover: ${tip38}`);
  const b38 = await zeus(() => {
    const z = window.__zeus;
    for (let i = 0; i < 2400 && z.seas().blockades[0].phase !== 'over'; i += 5) z.skip(5);
    return z.seas();
  });
  if (!(b38.blockades[0].phase === 'over' && b38.blockades[0].end === 'broken' && b38.blockades[0].sunk >= 1)) fail(`#blockade: not broken: ${JSON.stringify(b38)}`);
  await frames(3);
  await zeus(() => window.__zeus.sideTab?.('army'));
  await frames(2);
  if (await zeus(() => !!document.querySelector('button[data-act="shipyard"]'))) {
    await page.click('button[data-act="shipyard"]');
    await frames(3);
  }
  const yd38 = await zeus(() => window.__zeus.shipyardText());
  if (!/The shipyard[\s\S]*broke Troy’s blockade[\s\S]*The Nike[\s\S]*Hull[\s\S]*Oars/.test(yd38)) fail(`#blockade: the shipyard from the Army tab: ${yd38.slice(0, 800)}`);

  await open('#shipyard-paused');
  const c38 = await zeus(() => ({ prepared: window.__zeus.prepared, seas: window.__zeus.seas(), text: window.__zeus.shipyardText() }));
  if (!(c38.prepared && c38.seas.blockades[0]?.end === 'broken' && c38.seas.triremes.some((t) => t.mend))) fail(`#shipyard: ${JSON.stringify(c38.seas)}`);
  if (!/The shipyard[\s\S]*The harbour[\s\S]*broke Troy’s blockade[\s\S]*Under repair: whole in about \d+ days?/.test(c38.text)) fail(`#shipyard: the panel: ${c38.text.slice(0, 1200)}`);
  await page.keyboard.press('Escape');
  await frames(2);
  if (await zeus(() => window.__zeus.shipyardText())) fail('#shipyard: Esc left the panel open');
}
if (errors.length > err38) fail('page errors (slice 38):\n' + errors.slice(err38).join('\n'));

console.log(process.exitCode ? 'smoke: FAILED' : 'smoke: ok (#blockade, Troy’s ships holding the mouth, a ship’s hover, the Army tab’s line, the triremes rowing out, the blockade broken, the shipyard from the Army tab, #shipyard, the panel, a trireme under repair, Esc, #monument, the Lighthouse half built, the Monuments tab, the site’s, a builder’s, an ox cart’s and the masons’ yard’s hovers, #lit and its fire, #games and a visitors’ hover, #vassal, the tribute caravan followed in, its line, Corinth’s Empire tab, #submit, Argos’ ways and odds, the demand sent, #conquer, the report, the label, the tribute made heavy, #rebellion, the warning, the shield, the line, the tribute lightened, #seasons, the dial, the look turning and a season on, #winter, the late ship\'s chip and tip, #quarry, the quarry tool, its tip and refusal, marble on the Goods tab, the quarry, quarrymen and sledges and their hovers, #loggers, the camp, felled trees, timber on the Goods tab, the camp\'s and a logger\'s hovers, #greecegrows, its eleven cities, sites, colony, vassal, labels, a colony’s card, Rhodes’ size line and How it stands, #knossos, #memphis, no label under the lines at 1600 × 900, #thieves, the hut street tempted, the crime overlay, line and panel, a thief out, drawn, his tip and line, a villa robbed, a watch post built and the next thief caught, the fine on the ledger, #nowatch, the panel, its story and the Safety tab\'s row, #fortress, its walls, towers, companies, fleet, loans and Sparta’s band, the Army tab, the band met at the west gate, #overdue, its steps, chip and line, paid when the treasury could, #seized, the ledger, #creditors, #collect, a full force sent and away, the Army tab and the map, #report and the army\'s card, #forgive, #landing, Troy’s ships in the bay, the chip, a ship’s hover, the shipyard on the Military tab, drawn up and landed, #triremes, the Army tab’s fleet, rowing out and a ship sunk, a trireme’s hover, #pirates, the sea lane on Athens’ page, a trireme sent to guard it and on the map, the fight’s report, #borrow, Corinth’s terms and reasons, the town line, accepted, the debts chip, Sparta’s refusal, the coin in and the Administration tab’s loans, repaid early, #lend, Athens’ ask lent, the ledger, #repaid and the repayment arriving, #walls, a wall dragged across the road with its tip and gate, a tower by a click, the stretch\'s and tower\'s hovers, undo, #siege, the band hammering, its line, the towers shooting, the gate\'s hover, #battle, the band\'s numbers, both banners placed by clicks, the fight, a raider\'s hover, the band broken, the army\'s news and town line, #looted\'s ledger and line, #hirelings hired, the fee and the march in, #bronze, the mine tool, its tip and copper and armour on the Goods tab, #barracks, its company walking in, the chip and the Army tab, #companies, a banner in hand marched while paused, Esc, the Army tab row and the banner taking it, the soldiers’ pay, #rivals, #rivalstreet and #rivalsmap from their prepared town: every route, the caravans and the ship, the fleets, swords and labels, the News of Greece, Athens’ page and its Rivals tab built when shown, #war, the armies, swords and red way on the map, the labels, Sparta’s page, prices and Rivals tab, the army’s card along its body, the swords’ card, the News of Greece and a line to Athens’ page, #festival, banners, the wreath, the page, the gift tips, the wine price, the fields, #peace, the armies home and Sparta’s prices after, #threat, its page, line and seal, refused and the band gathering, #raid paid off and the band turning on the map, #raiders at the granary, the chip, the band\'s tip and their leaving, #aftermath, the ledger and the king\'s anger spent, #request, its answers, town line and label, the sending fetched, carried out and its tip, its arrival and thanks, #promise and the promise broken, #offer taken and its trade row, #tribute refused, #gift, its ruler tab, the city page tabs, a gift of coin on the map, its hover card, its arrival and reason, #hostile, the road closed, its line and the gift that opens it, #thanks and Corinth’s gift arriving, the terms once, #prices, Corinth’s prices, terms, harvest, reasons, arrows and charts, its route tab, #famine, the parched fields, the harvest line and its link, wheat dear after it, the caravan’s hover card on the map, #routes and opening a road on the map, its caravan on the map, #caravan, its follow, town line, chip and tip, the chip following it, #buywine and the yard tab, #athensship, its tabs, town line and chip, #anchor, #greece, its hover card and ruler panel, the map camera, Esc, Tab and the Greece button, Tab after a side panel click, a city’s label, naming the city, #ruler, #greecesail and the ship on the map, #richtown and #richstreet, the harsh line and rate card, the trade panel updated in place, slice 13 save, a new town keeping the old autosave, trading post tool, tip and refusal, building it and the countdown, G cycling, #quay and the trade panel, keep and sell commands, post and docker hovers, #sail and the town line, #ship tied up and its tip, #black paid back, slice 12 save, fire, blaze, rubble and clearing it, creak, watchman and inspector follows and hovers, hazard town lines and tips, Z and J cycling, the grouped build bar, slice 11 save, pasture, fleece and wine vendor follows and overlays, vineyard tool and tip, winery follow and hovers, villas and their panel, the seven-wide sign, grove tool and tip, oil stall tool, grove, press and storehouse hovers, oil vendor follow and overlay, oil shortfall line and panel, hunter follow, dairy hover and goats, variety overlay and legend, L cycling, over-hunting and the lodge tip, ledger, tax rate, tax overlay, collector follow and hover, tax office tool, harsh taxes, unpaid wages, phase 1 save, welcome card, sound and mute, #town, saving by hand and by itself, opening saves, old and damaged saves, blocked storage, shortfall lines, shrine and theatre tools, townhouses, fine houses, religion and culture overlays, actor follow, wide signs, households, panel, signs, trouble count, what’s missing, decline, pan, orbit, zoom, quarter turn, speed, pause, all views, hash links, roads, plots, settlers, clearing, undo, fountain tool and preview, overlay, carrier hover and follow, huts, route cache, food town and overlay, vendor hover and follow, workers, farm tool, bridge drag and undo, carts on the bridge, clearing a farm)');
await browser.close();
server.close();
