// Build first (npm run build), then: node scripts/screenshots.mjs [name ...]
// Saves PNGs to screenshots/ for looking at.
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { launch } from './browser.mjs';
import { serveDist } from './serve-dist.mjs';

const SHOTS = {
  overview: '?cam=overview&speed=paused&shot=1',
  opening: '?demo=coast&shot=1',
  bay: '?cam=bay&speed=paused&shot=1',
  river: '?cam=river&speed=paused&shot=1',
  hills: '?cam=hills&speed=paused&shot=1',
  street: '?cam=street&speed=paused&shot=1',
  headland: '?cam=headland&speed=paused&shot=1',
  mouth: '?cam=mouth&speed=paused&shot=1',
  ui: '?demo=coast',
  help: '?demo=coast&speed=paused',
  streets: '#streets-paused-shot',
  settlers: '#settlers-paused-shot',
  build: '#build-paused-shot',
  'streets-ui': '#streets-paused',
  water: '#water-paused-shot',
  'water-ui': '#water-paused',
  'water-overlay': '#water-overlay-paused',
  carrier: '#carrier-shot',
  fountain: '#fountain-paused',
  food: '#food-paused-shot',
  'food-ui': '#food-paused',
  'food-overlay': '#food-overlay-paused',
  vendor: '#vendor-shot',
  harvest: '#harvest-paused-shot',
  chain: '#chain-paused',
  workers: '#workers-paused',
  bridge: '#bridge-paused-shot',
  people: '#people-paused',
  'people-overlay': '#people-overlay-paused',
  warning: '#warning-paused',
  decline: '#decline-paused',
  missing: '#missing-paused',
  grow: '#grow-overlay-paused',
  shrine: '#shrine-paused-shot',
  'shrine-overlay': '#shrine-overlay-paused',
  priestess: '#priestess-shot',
  theatre: '#theatre-paused-shot',
  'theatre-overlay': '#theatre-overlay-paused',
  actor: '#actor-shot',
  fine: '#fine-paused-shot',
  'fine-overlay': '#fine-overlay-paused',
  compare: '#compare-paused-shot',
  closed: '#closed-paused',
  // Slice 7.
  welcome: '#',
  town: '#town-paused-shot',
  'town-ui': '#town-paused',
  townstreet: '#townstreet-paused-shot',
  'town-overview': '#town-overview-paused-shot',
  saves: '#town-paused',
  'farm-warn': '#food-paused',
  'four-needs': '#fine-paused',
  // Slice 8.
  ledger: '#ledger-paused',
  rates: '#town-paused',
  taxoffice: '#town-paused-shot',
  collector: '#collector-shot',
  'collector-ui': '#collector',
  'collector-close': '#collector',
  'tax-overlay': '#collector-paused',
  taxes: '#taxes-paused',
  harsh: '#harsh-paused',
  dry: '#dry',
};

/** Things to do on the page before a shot. */
const BEFORE = {
  rates: async (page) => {
    await page.click('.rate-chip');
  },
  taxoffice: async (page) => {
    // Close over the tax office on #town's main street, and the north street's.
    await page.evaluate(() => window.__zeus.jump({ x: 62, z: 43, yaw: 0.9, dist: 7, tilt: 0.12 }));
  },
  'tax-overlay': async (page) => {
    await page.evaluate(() => window.__zeus.setView('town'));
  },
  collector: async (page) => {
    // Let him get going.
    const t = await page.evaluate(() => window.__zeus.tick());
    await page.waitForFunction((t0) => window.__zeus.tick() > t0 + 40, t, { timeout: 120000 });
  },
  'collector-ui': async (page) => {
    const t = await page.evaluate(() => window.__zeus.tick());
    await page.waitForFunction((t0) => window.__zeus.tick() > t0 + 40, t, { timeout: 120000 });
  },
  'collector-close': async (page) => {
    // Close by him at street level, paused mid-round.
    const t = await page.evaluate(() => window.__zeus.tick());
    await page.waitForFunction((t0) => window.__zeus.tick() > t0 + 60, t, { timeout: 120000 });
    await page.evaluate(() => {
      window.__zeus.speed('paused');
      const w = window.__zeus.where('tax');
      if (w) window.__zeus.jump({ x: w.x, z: w.z, yaw: 0.5, dist: 2.6, tilt: 0.12 });
    });
  },
  taxes: async (page) => {
    // The tax office tool over the east street, beside its road.
    const p = await page.evaluate(() => window.__zeus.screenOf(101, 43));
    await page.mouse.move(p.x, p.y);
    await page.mouse.move(p.x + 1, p.y + 1);
  },
  saves: async (page) => {
    await page.click('.saves-btn');
  },
  'farm-warn': async (page) => {
    // The farm tool over green land with no road beside it.
    await page.evaluate(() => window.__zeus.tool('farm'));
    // Look along the river bank for a spot where a farm may go but no road is beside it.
    for (const [x, z] of [[38.5, 59.5], [37.5, 58.5], [36.5, 57.5], [39.5, 60.5]]) {
      const p = await page.evaluate(([x, z]) => window.__zeus.screenOf(x, z), [x, z]);
      await page.mouse.move(p.x, p.y);
      await page.mouse.move(p.x + 1, p.y + 1);
      const f = await page.evaluate(() => window.__zeus.frames);
      await page.waitForFunction((f0) => window.__zeus.frames > f0 + 1, f, { timeout: 120000 });
      const tip = await page.evaluate(() => window.__zeus.tipText());
      if (tip && tip.includes('No road')) break;
    }
  },
  'four-needs': async (page) => {
    // Debug: one fine house warned about all four of its needs at once, to see the sign's layout.
    const id = await page.evaluate(() => {
      const hs = window.__zeus.homes().filter((h) => h.level === 5);
      const v = window.__zeus.view();
      hs.sort((a, b) => Math.hypot(a.x - v.x, a.z - v.z) - Math.hypot(b.x - v.x, b.z - v.z));
      return hs[0].id;
    });
    await page.evaluate((i) => window.__zeus.warnAll(i), id);
    await page.evaluate((i) => {
      const h = window.__zeus.homes().find((o) => o.id === i);
      const v = window.__zeus.view();
      window.__zeus.jump({ ...v, x: h.x + 1, z: h.z + 1, dist: 13, tilt: 0.1 });
    }, id);
  },
};

const want = process.argv.slice(2);
const names = want.length ? want : Object.keys(SHOTS);
const outDir = resolve('screenshots');
mkdirSync(outDir, { recursive: true });
const { server, url } = await serveDist(resolve('dist'));
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') console.log(`[${m.type()}]`, m.text());
});
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
for (const arg of names) {
  // "name@x,z,yaw,dist,tilt" jumps the camera there after loading.
  const [name, cam] = arg.split('@');
  const q = SHOTS[name] ?? (name.startsWith('?') || name.startsWith('#') ? name : `?cam=${name}&speed=paused&shot=1`);
  const t0 = Date.now();
  await page.goto('about:blank');
  await page.goto(url + q);
  await page.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
  await page.waitForFunction(() => window.__zeus.frames > 8, null, { timeout: 120000 });
  if (name === 'help') await page.keyboard.press('?');
  if (BEFORE[name]) {
    await BEFORE[name](page);
    const f = await page.evaluate(() => window.__zeus.frames);
    await page.waitForFunction((f0) => window.__zeus.frames > f0 + 3, f, { timeout: 120000 });
  }
  if (cam) {
    const [x, z, yaw, dist, tilt] = cam.split(',').map(Number);
    await page.evaluate((v) => window.__zeus.jump(v), { x, z, yaw, dist, tilt });
    const f = await page.evaluate(() => window.__zeus.frames);
    await page.waitForFunction((f0) => window.__zeus.frames > f0 + 3, f, { timeout: 120000 });
  }
  const file = `${outDir}/${arg.replace(/[^a-z0-9-]+/gi, '_')}.png`;
  await page.screenshot({ path: file });
  console.log(`${name}: ${file} (${Date.now() - t0} ms)`);
}
await browser.close();
server.close();
