// Build first (npm run build). Drives the built page in headless Chromium:
// drags, zooms, turns and changes speed, and fails on any page error.
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
await page.keyboard.press('3');
const t0 = await page.evaluate(() => window.__zeus.tick());
await page.waitForTimeout(1500);
const t1 = await page.evaluate(() => window.__zeus.tick());
if (t1 - t0 < 20) fail(`clock did not run at fastest (${t0} -> ${t1})`);
await page.keyboard.press('Space');
const t2 = await page.evaluate(() => window.__zeus.tick());
await page.waitForTimeout(800);
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
if (!(c.cottages > 10 && c.farms === 3 && c.granaries === 1 && c.agoras === 1 && c.fed > 10 && c.jobs === 44 && c.filled === 44)) fail(`#food: ${JSON.stringify(c)}`);
if (!(c.rent > 0)) fail(`#food: no rent paid (${c.rent})`);
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
// #closed: the theatre gone and the west street cut; wide signs for three needs, and the panel says what goes.
await open('#closed');
c = await city();
if (!(c.theatres === 0 && c.warned >= 15 && c.signs >= c.warned && c.signsWide >= 3 && c.panel > 0)) fail(`#closed: ${JSON.stringify(c)}`);
pt = await panelText();
if (!/they give up the (townhouse for a cottage|fine house for a townhouse)/.test(pt ?? '')) fail(`#closed panel: ${pt}`);
if (!(await page.evaluate(() => window.__zeus.meshes().some((m) => m.name === 'sign-rim-3' && m.count >= 3)))) fail('#closed: no wide signs drawn');

console.log(process.exitCode ? 'smoke: FAILED' : 'smoke: ok (shrine and theatre tools, townhouses, fine houses, religion and culture overlays, actor follow, wide signs, households, panel, signs, trouble count, what’s missing, decline, pan, orbit, zoom, quarter turn, speed, pause, all views, hash links, roads, plots, settlers, clearing, undo, fountain tool and preview, overlay, carrier hover and follow, huts, route cache, food town and overlay, vendor hover and follow, workers, farm tool, bridge drag and undo, carts on the bridge, clearing a farm)');
await browser.close();
server.close();
