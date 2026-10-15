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
  await page.goto(url + `?cam=${cam}&speed=paused`);
  await page.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
  await frames(2);
}

if (errors.length) fail('page errors:\n' + errors.join('\n'));
console.log(process.exitCode ? 'smoke: FAILED' : 'smoke: ok (pan, orbit, zoom, quarter turn, speed, pause, all views)');
await browser.close();
server.close();
