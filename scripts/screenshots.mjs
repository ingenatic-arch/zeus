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
for (const name of names) {
  const q = SHOTS[name] ?? (name.startsWith('?') || name.startsWith('#') ? name : `?cam=${name}&speed=paused&shot=1`);
  const t0 = Date.now();
  await page.goto('about:blank');
  await page.goto(url + q);
  await page.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
  await page.waitForFunction(() => window.__zeus.frames > 8, null, { timeout: 120000 });
  if (name === 'help') await page.keyboard.press('?');
  const file = `${outDir}/${name.replace(/[^a-z0-9-]+/gi, '_')}.png`;
  await page.screenshot({ path: file });
  console.log(`${name}: ${file} (${Date.now() - t0} ms)`);
}
await browser.close();
server.close();
