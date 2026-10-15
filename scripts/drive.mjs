// Build first. Drives the build tools in headless Chromium and saves
// screenshots of each step to screenshots/drive-*.png, for looking at.
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { launch } from './browser.mjs';
import { serveDist } from './serve-dist.mjs';

const outDir = resolve('screenshots');
mkdirSync(outDir, { recursive: true });
const { server, url } = await serveDist(resolve('dist'));
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('[error]', m.text()));
const frames = async (n) => {
  const f = await page.evaluate(() => window.__zeus.frames);
  await page.waitForFunction((f0) => window.__zeus.frames >= f0, f + n, { timeout: 120000 });
};
const at = (x, z) => page.evaluate(([x, z]) => window.__zeus.screenOf(x, z), [x, z]);
const shot = async (name) => {
  await frames(2);
  await page.screenshot({ path: `${outDir}/drive-${name}.png` });
  console.log('saved', name, JSON.stringify(await page.evaluate(() => window.__zeus.city())));
};

await page.goto(url + '#build-shot');
await page.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
await page.evaluate(() => window.__zeus.jump({ x: 14, z: 78, yaw: 0.25, dist: 26, tilt: -0.15 }));
await frames(3);
// Hover with the road tool.
let p = await at(0.5, 80.5);
await page.mouse.move(p.x, p.y);
await shot('hover');
// Drag a road in from the west edge.
await page.mouse.down();
for (const x of [6, 12, 18, 22]) {
  p = await at(x + 0.5, 80.5);
  await page.mouse.move(p.x, p.y, { steps: 3 });
}
p = await at(22.5, 74.5);
await page.mouse.move(p.x, p.y, { steps: 3 });
await shot('road-drag');
await page.mouse.up();
await shot('road-built');
// Plots along it.
await page.keyboard.press('h');
p = await at(4, 79);
await page.mouse.move(p.x, p.y);
await page.mouse.down();
p = await at(18, 79);
await page.mouse.move(p.x, p.y, { steps: 6 });
await shot('plots-drag');
await page.mouse.up();
p = await at(17, 83);
await page.mouse.move(p.x, p.y);
await shot('plots-built');
// Run the clock and watch settlers come.
await page.keyboard.press('Escape');
await page.keyboard.press('3');
await page.waitForFunction(() => window.__zeus.city().tents >= 3, null, { timeout: 180000 });
await page.keyboard.press('Space');
await shot('settled');
// Hover a tent (no tool): its tip.
p = await at(5, 79);
await page.mouse.move(p.x, p.y);
await shot('hover-tent');
// Clear preview over a tent and the road.
await page.keyboard.press('x');
p = await at(4.5, 77.5);
await page.mouse.move(p.x, p.y);
await page.mouse.down();
p = await at(7.5, 81.5);
await page.mouse.move(p.x, p.y, { steps: 4 });
await shot('clear-drag');
await page.mouse.up();
await shot('cleared');
await page.keyboard.press('u');
await shot('undone');
await browser.close();
server.close();
