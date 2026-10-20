// Shots of a demo town with the UI hidden, for judging the city look by eye.
// node scripts/look-shots.mjs <outDir> <name> [hash]   e.g. new "#goods-paused", old "#goods-paused-plain"
// The name prefixes the files and is set as window.__look ("lab" turns on the stage-2 trees and people).
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { launch } from './browser.mjs';
import { serveDist } from './serve-dist.mjs';

const [outDir = 'screenshots/look', look = 'base', hash = '#goods-paused'] = process.argv.slice(2);
const CAMS = {
  wide: null,
  town: { x: 74, z: 40, yaw: -0.3, dist: 24, tilt: 0 },
  street: { x: 70, z: 38, yaw: -0.5, dist: 9, tilt: 0.12 },
  people: { x: 66, z: 43.4, yaw: -0.3, dist: 4, tilt: 0.4 },
  people2: { x: 70, z: 45.6, yaw: -0.3, dist: 4, tilt: 0.4 },
  trees: { x: 88, z: 48, yaw: -0.3, dist: 8, tilt: 0.12 },
  coast: { x: 76, z: 74, yaw: -0.35, dist: 17, tilt: 0.05 },
};
const want = (process.env.CAMS ?? Object.keys(CAMS).join(',')).split(',');
mkdirSync(resolve(outDir), { recursive: true });
const { server, url } = await serveDist(resolve('dist'));
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[err]', m.text()); });
await page.addInitScript((l) => { window.__look = l; }, look);
await page.goto(url + hash);
await page.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
await page.waitForFunction(() => window.__zeus.frames > 8, null, { timeout: 120000 });
await page.addStyleTag({ content: '#ui, #ui * { visibility: hidden !important; } .floater, .floaters { display:none !important; }' });
if (!process.env.KEEPSIDE) await page.evaluate(() => window.__zeus.side?.(false));
if (process.env.LIST) console.log(JSON.stringify(await page.evaluate(() => ['trading','vineyard','agora','theatre'].map((k) => [k, window.__zeus.buildingsOf(k)]))));
for (const name of want) {
  const v = CAMS[name];
  if (v) await page.evaluate((v) => window.__zeus.jump(v), v);
  const f = await page.evaluate(() => window.__zeus.frames);
  await page.waitForFunction((f0) => window.__zeus.frames > f0 + 4, f, { timeout: 120000 });
  const file = resolve(outDir, `${look}-${name}.png`);
  await page.screenshot({ path: file, timeout: 180000 });
  console.log(file);
}
// FOLLOW=water,food,…: a close shot of the first walker of each kind (see the probe's where()).
for (const kind of (process.env.FOLLOW ?? '').split(',').filter(Boolean)) {
  const at = await page.evaluate((k) => window.__zeus.where(k), kind);
  if (!at) {
    console.log(`no ${kind} walking`);
    continue;
  }
  await page.evaluate((v) => window.__zeus.jump(v), { x: at.x, z: at.z, yaw: -0.4, dist: 3, tilt: 0.4 });
  const f = await page.evaluate(() => window.__zeus.frames);
  await page.waitForFunction((f0) => window.__zeus.frames > f0 + 3, f, { timeout: 120000 });
  // Cropped to the walker (its feet a little below the middle).
  const sp = await page.evaluate((a) => window.__zeus.screenOf(a.x, a.z), at);
  const file = resolve(outDir, `${look}-w-${kind}.png`);
  const w = 360;
  const clip = { x: Math.max(0, Math.min(1600 - w, sp.x - w / 2)), y: Math.max(0, Math.min(900 - w, sp.y - w * 0.62)), width: w, height: w };
  await page.screenshot({ path: file, clip, timeout: 180000 });
  console.log(file);
}
await browser.close();
server.close();
