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
  handin: '#town',
  // Slice 9.
  hunter: '#hunter',
  'hunter-close': '#hunter',
  'hunter-back': '#hunter',
  dairy: '#dairy-paused-shot',
  'dairy-ui': '#dairy-paused',
  lodge: '#dairy-paused-shot',
  table: '#table-paused',
  'table-panel': '#table-paused',
  overhunt: '#overhunt-paused',
  'lodge-tip': '#overhunt-paused',
  'dairy-tip': '#town-paused',
  'dairy-refused': '#town-paused',
  herd: '#dairy-paused-shot',
  boar: '#overhunt-paused-shot',
  granary: '#town-paused-shot',
  stall: '#town-paused-shot',
  'cart-meat': '#town',
  // Slice 10.
  grove: '#grove-paused',
  'grove-built': '#oil-paused-shot',
  'grove-close': '#oil-paused-shot',
  'grove-tip': '#oil-paused',
  press: '#oil-paused-shot',
  'press-tip': '#oil-paused',
  storehouse: '#storehouse-paused-shot',
  'storehouse-tip': '#storehouse-paused',
  'oil-stall': '#town-paused-shot',
  'stall-tip': '#town-paused',
  oilvendor: '#oilvendor',
  'oilvendor-close': '#oilvendor',
  'oil-overlay': '#oilvendor-paused',
  nooil: '#nooil',
  'cart-olives': '#town',
  'cart-oil': '#town',
  'porter-oil': '#town',
  // Slice 11.
  pasture: '#pasture-paused-shot',
  'pasture-close': '#pasture-paused-shot',
  'pasture-tip': '#pasture-paused',
  vineyard: '#vineyard-paused',
  villas: '#villas-paused',
  'villas-shot': '#villas-paused-shot',
  'villa-close': '#villas-paused-shot',
  'villa-street': '#villas-paused-shot',
  'villas-overview': '#villas-paused-shot',
  'villa-tip': '#villas-paused',
  winery: '#winery-paused-shot',
  'winery-close': '#winery-paused-shot',
  'vineyard-close': '#winery-paused-shot',
  'winery-tip': '#winery-paused',
  'storehouse-goods': '#villas-paused-shot',
  'stalls-three': '#villas-paused-shot',
  winevendor: '#winevendor',
  'winevendor-close': '#winevendor',
  'fleecevendor-close': '#fleecevendor',
  'fleece-overlay': '#pasture-overlay-paused',
  'wine-overlay': '#winevendor-paused',
  'cart-fleece': '#villas',
  'cart-grapes': '#winery',
  'cart-wine': '#winery',
  'porter-fleece': '#villas',
  'porter-wine': '#villas',
  'seven-needs': '#villas-paused',
  // Slice 12.
  fire: '#fire-paused',
  'fire-close': '#fire-paused-shot',
  'fire-overlay': '#fire-paused',
  blaze: '#blaze-paused-shot',
  'blaze-close': '#blaze-paused-shot',
  'blaze-ui': '#blaze-paused',
  rubble: '#rubble-paused',
  'rubble-close': '#rubble-paused-shot',
  'rubble-tip': '#rubble-paused',
  creak: '#creak-paused',
  'creak-close': '#creak-paused-shot',
  'wear-overlay': '#creak-paused',
  watchpost: '#town-paused-shot',
  architect: '#town-paused-shot',
  'watchpost-tip': '#fire-paused',
  'architect-tip': '#creak-paused',
  watchman: '#watchman',
  'watchman-close': '#watchman',
  'watchman-dash': '#blaze',
  'watchman-fight': '#blaze',
  inspector: '#inspector',
  'inspector-close': '#inspector',
  'marks-close': '#fire-paused-shot',
  'fire-panel': '#fire-paused',
  'fire-tip': '#fire-paused',
  'rubble-hover': '#rubble-paused',
  'bar-1280': '#town-paused',
  'bar-1366': '#town-paused',
  'bar-1920': '#town-paused',
  'bar-open-1280': '#town-paused',
  'bar-open-1920': '#town-paused',
  'bar-offices': '#town-paused',
  // Slice 13.
  trade: '#trade-paused',
  quay: '#quay-paused-shot',
  'quay-close': '#quay-paused-shot',
  sail: '#sail-paused-shot',
  'sail-far': '#sail-paused-shot',
  ship: '#ship-paused-shot',
  'ship-close': '#ship-paused-shot',
  'ship-high': '#ship-paused-shot',
  'trade-tip': '#trade-paused',
  'trade-refused': '#trade-paused',
  'trade-tint': '#trade-paused',
  'quay-panel': '#quay-paused',
  'quay-tip': '#quay-paused',
  'quay-1280': '#quay-paused',
  'sail-ui': '#sail-paused',
  'ship-tip': '#ship-paused',
  'ship-ui': '#ship-paused',
  docker: '#quay',
  'docker-wine': '#quay',
  black: '#black-paused',
  'sail-bay': '#sail',
  'ship-leaving': '#ship',
  'black-after': '#black',
  // Slice 20: raiders at the edge.
  threat: '#threat-paused',
  raid: '#raid-paused',
  'raid-band': '#raid-paused',
  'raid-city': '#raid-paused',
  raiders: '#raiders-paused-shot',
  'raiders-close': '#raiders-paused-shot',
  'raiders-tip': '#raiders-paused',
  'raiders-leaving': '#raiders',
  aftermath: '#aftermath-paused',
};

/** Hover the pointer over a world point (after a few frames, so the camera has settled). */
const hover = async (page, x, z) => {
  const f = await page.evaluate(() => window.__zeus.frames);
  await page.waitForFunction((f0) => window.__zeus.frames > f0 + 2, f, { timeout: 120000 });
  const p = await page.evaluate(([x, z]) => window.__zeus.screenOf(x, z), [x, z]);
  await page.mouse.move(p.x, p.y);
  await page.mouse.move(p.x + 1, p.y + 1);
};
/** Jump close to the first building of a kind: (dx, dz) from its corner, and the camera's yaw, distance and tilt. */
const closeTo = async (page, kind, yaw, dist, tilt, dx = 1.5, dz = 1.5) => {
  const b = await page.evaluate((k) => window.__zeus.buildingsOf(k)[0], kind);
  await page.evaluate((v) => window.__zeus.jump(v), { x: b.x + dx, z: b.z + dz, yaw, dist, tilt });
  return b;
};
/** Follow a walker until it is under way, then pause and jump close to it. */
const closeToWalker = async (page, find, ticks = 40, view = { yaw: 0.5, dist: 2.6, tilt: 0.12 }) => {
  await page.waitForFunction(find, null, { timeout: 400000, polling: 200 });
  const t = await page.evaluate(() => window.__zeus.tick());
  await page.waitForFunction((t0) => window.__zeus.tick() > t0 + 5, t, { timeout: 240000 });
  await page.evaluate(([src, v]) => {
    window.__zeus.speed('paused');
    const w = new Function(`return (${src})()`)();
    if (w) window.__zeus.jump({ ...v, x: w.x, z: w.z });
  }, [find.toString(), view]);
};

/** Things to do on the page before a shot. */
const BEFORE = {
  // The band on the map of Greece, close: the map's camera on the road between Sparta and your city, the band's card under the pointer.
  'raid-band': async (page) => {
    const g = await page.evaluate(() => window.__zeus.greeceInfo());
    const at = g.travellers['raid-1'];
    if (at) {
      await page.mouse.move(at.x, at.y);
      await page.mouse.move(at.x + 1, at.y + 1);
    }
  },
  // With the map put away: the city, the chip under the top bar counting the days.
  'raid-city': async (page) => {
    await page.evaluate(() => window.__zeus.greece(false));
  },
  'raiders-close': async (page) => {
    const r = await page.evaluate(() => window.__zeus.raids());
    if (r.band) await page.evaluate((v) => window.__zeus.jump(v), { x: r.band.x, z: r.band.z, yaw: 2.2, dist: 4.5, tilt: 0.15 });
  },
  'raiders-tip': async (page) => {
    const r = await page.evaluate(() => window.__zeus.raids());
    if (r.band) await hover(page, r.band.x, r.band.z);
  },
  // On the way out with their sacks.
  'raiders-leaving': async (page) => {
    await page.waitForFunction(() => window.__zeus.raids().band?.back === true, null, { timeout: 400000, polling: 100 });
    await page.evaluate(() => window.__zeus.speed('paused'));
    const r = await page.evaluate(() => window.__zeus.raids());
    if (r.band) await page.evaluate((v) => window.__zeus.jump(v), { x: r.band.x, z: r.band.z, yaw: 2.4, dist: 6, tilt: 0.12 });
  },
  'quay-close': async (page) => {
    await closeTo(page, 'trading', 2.2, 7, 0.15);
  },
  'ship-close': async (page) => {
    const sh = await page.evaluate(() => window.__zeus.ship());
    await page.evaluate((v) => window.__zeus.jump(v), { x: sh.x, z: sh.z, yaw: 0.9, dist: 8, tilt: 0.05 });
  },
  'ship-high': async (page) => {
    await page.evaluate(() => window.__zeus.jump({ x: 74, z: 74, yaw: 2.65, dist: 30, tilt: 0.3 }));
  },
  'sail-bay': async (page) => {
    // Coming into the bay: within thirty-five tiles of the berth (headless frames are slow: each moves her a fair way).
    await page.waitForFunction(() => {
      const sh = window.__zeus.ship();
      return sh.visible && sh.phase === 1 && Math.hypot(sh.x - 74.5, sh.z - 77.5) < 35;
    }, null, { timeout: 600000, polling: 50 });
    await page.evaluate(() => window.__zeus.speed('paused'));
    const sh = await page.evaluate(() => window.__zeus.ship());
    await page.evaluate((v) => window.__zeus.jump(v), { x: sh.x, z: sh.z - 4, yaw: 2.9, dist: 20, tilt: -0.1 });
  },
  'ship-leaving': async (page) => {
    // Sailing off laden, a little way out.
    await page.waitForFunction(() => {
      const sh = window.__zeus.ship();
      return sh.phase === 3 && sh.visible && Math.hypot(sh.x - 74.5, sh.z - 77.5) > 4;
    }, null, { timeout: 600000, polling: 100 });
    await page.evaluate(() => window.__zeus.speed('paused'));
    const sh = await page.evaluate(() => window.__zeus.ship());
    await page.evaluate((v) => window.__zeus.jump(v), { x: sh.x, z: sh.z, yaw: 2.3, dist: 16, tilt: -0.02 });
  },
  'trade-tip': async (page) => {
    await page.evaluate(() => window.__zeus.jump({ x: 74, z: 70, yaw: 2.65, dist: 18, tilt: 0.1 }));
    await hover(page, 74.5, 70.5);
  },
  'trade-refused': async (page) => {
    await page.evaluate(() => window.__zeus.jump({ x: 74, z: 66, yaw: 2.65, dist: 22, tilt: 0.1 }));
    await hover(page, 70.5, 62.5);
  },
  'trade-tint': async (page) => {
    await page.evaluate(() => window.__zeus.jump({ x: 72, z: 70, yaw: 2.65, dist: 26, tilt: 0.25 }));
    await hover(page, 71.5, 69.5);
  },
  'quay-tip': async (page) => {
    await page.evaluate(() => window.__zeus.trade(false));
    const b = await closeTo(page, 'trading', 2.65, 14, 0.1);
    await hover(page, b.x + 1.5, b.z + 1.5);
  },
  'ship-tip': async (page) => {
    const sh = await page.evaluate(() => window.__zeus.ship());
    await page.evaluate((v) => window.__zeus.jump(v), { x: sh.x, z: sh.z, yaw: 2.3, dist: 16, tilt: -0.02 });
    await hover(page, sh.x, sh.z);
  },
  docker: async (page) => {
    await closeToWalker(page, () => window.__zeus.dockerOf?.(-1, true) ?? null, 40, { yaw: 0.5, dist: 3, tilt: 0.12 });
  },
  'docker-wine': async (page) => {
    await closeToWalker(page, () => window.__zeus.dockerOf?.(0, false) ?? window.__zeus.dockerOf?.(-1, false) ?? null, 40, { yaw: 2.2, dist: 3, tilt: 0.12 });
  },
  'black-after': async (page) => {
    // Let her load and pay: the ledger shows the sale. (#black opens paused: press play.)
    await page.evaluate(() => window.__zeus.speed('normal'));
    await page.waitForFunction(() => window.__zeus.ship().visits > 0, null, { timeout: 600000, polling: 500 });
    await page.evaluate(() => window.__zeus.speed('paused'));
  },
  hunter: async (page) => {
    // Follow a hunter out until he is across country, then pause.
    await page.waitForFunction(() => window.__zeus.where('hunter') !== null, null, { timeout: 240000 });
    const t = await page.evaluate(() => window.__zeus.tick());
    await page.waitForFunction((t0) => window.__zeus.tick() > t0 + 40, t, { timeout: 240000 });
    await page.evaluate(() => window.__zeus.speed('paused'));
  },
  'hunter-close': async (page) => {
    await page.waitForFunction(() => window.__zeus.where('hunter') !== null, null, { timeout: 240000 });
    const t = await page.evaluate(() => window.__zeus.tick());
    await page.waitForFunction((t0) => window.__zeus.tick() > t0 + 60, t, { timeout: 240000 });
    await page.evaluate(() => {
      window.__zeus.speed('paused');
      const w = window.__zeus.where('hunter');
      if (w) window.__zeus.jump({ x: w.x, z: w.z, yaw: 0.5, dist: 2.6, tilt: 0.12 });
    });
  },
  'hunter-back': async (page) => {
    // A hunter coming home with his kill, close by.
    await page.waitForFunction(() => window.__zeus.homeward?.() !== null, null, { timeout: 400000, polling: 200 });
    await page.evaluate(() => {
      window.__zeus.speed('paused');
      const w = window.__zeus.homeward();
      if (w) window.__zeus.jump({ x: w.x, z: w.z, yaw: 0.5, dist: 2.6, tilt: 0.12 });
    });
  },
  lodge: async (page) => {
    await page.evaluate(() => window.__zeus.jump({ x: 60.5, z: 33.5, yaw: 0.5, dist: 5, tilt: 0.3 }));
  },
  'dairy-ui': async (page) => {
    const p = await page.evaluate(() => window.__zeus.screenOf(51.5, 39.5));
    await page.mouse.move(p.x, p.y);
    await page.mouse.move(p.x + 1, p.y + 1);
  },
  'table-panel': async (page) => {
    // The panel of a townhouse with two foods on its table.
    await page.waitForFunction(() => window.__zeus.panelText().length > 0, null, { timeout: 120000 });
  },
  'lodge-tip': async (page) => {
    // The lodge tool (the demo opens with it in hand) beside the lane south of the three lodges, the thinned deer in reach.
    await page.evaluate(() => window.__zeus.jump({ x: 26, z: 52, yaw: 0.9, dist: 20, tilt: -0.1 }));
    const f = await page.evaluate(() => window.__zeus.frames);
    await page.waitForFunction((f0) => window.__zeus.frames > f0 + 2, f, { timeout: 120000 });
    const p = await page.evaluate(() => window.__zeus.screenOf(28.5, 52.5));
    await page.mouse.move(p.x, p.y);
    await page.mouse.move(p.x + 1, p.y + 1);
  },
  'dairy-tip': async (page) => {
    await page.evaluate(() => {
      window.__zeus.tool('dairy');
      window.__zeus.jump({ x: 52, z: 44, yaw: 2.2, dist: 22, tilt: -0.1 });
    });
    const f = await page.evaluate(() => window.__zeus.frames);
    await page.waitForFunction((f0) => window.__zeus.frames > f0 + 2, f, { timeout: 120000 });
    const p = await page.evaluate(() => window.__zeus.screenOf(55.5, 39.5));
    await page.mouse.move(p.x, p.y);
    await page.mouse.move(p.x + 1, p.y + 1);
  },
  'dairy-refused': async (page) => {
    await page.evaluate(() => {
      window.__zeus.tool('dairy');
      window.__zeus.jump({ x: 86, z: 34, yaw: 2.2, dist: 22, tilt: -0.1 });
    });
    const f = await page.evaluate(() => window.__zeus.frames);
    await page.waitForFunction((f0) => window.__zeus.frames > f0 + 2, f, { timeout: 120000 });
    const p = await page.evaluate(() => window.__zeus.screenOf(87.5, 34.5));
    await page.mouse.move(p.x, p.y);
    await page.mouse.move(p.x + 1, p.y + 1);
  },
  herd: async (page) => {
    // The deer in the north hills, close by, and the pointer over them.
    const h = await page.evaluate(() => window.__zeus.herds().find((o) => o.kind === 'deer' && o.z < 25));
    await page.evaluate((h) => window.__zeus.jump({ x: h.x, z: h.z, yaw: 0.6, dist: 4, tilt: 0.15 }), h);
  },
  boar: async (page) => {
    const h = await page.evaluate(() => window.__zeus.herds().find((o) => o.kind === 'boar' && o.x < 30));
    await page.evaluate((h) => window.__zeus.jump({ x: h.x, z: h.z, yaw: 0.6, dist: 4, tilt: 0.15 }), h);
  },
  granary: async (page) => {
    await page.evaluate(() => {
      const g = window.__zeus.buildingsOf('granary')[0];
      window.__zeus.jump({ x: g.x + 1.5, z: g.z + 1.5, yaw: 3.7, dist: 5, tilt: 0.3 });
    });
  },
  stall: async (page) => {
    await page.evaluate(() => {
      const g = window.__zeus.buildingsOf('agora')[0];
      window.__zeus.jump({ x: g.x + 1.5, z: g.z + 1.5, yaw: 3.7, dist: 4, tilt: 0.3 });
    });
  },
  'cart-meat': async (page) => {
    await page.waitForFunction(() => window.__zeus.cartOf?.(1) !== null, null, { timeout: 400000, polling: 200 });
    await page.evaluate(() => {
      window.__zeus.speed('paused');
      const w = window.__zeus.cartOf(1);
      if (w) window.__zeus.jump({ x: w.x, z: w.z, yaw: 0.5, dist: 2.6, tilt: 0.12 });
    });
  },
  rates: async (page) => {
    await page.click('.rate-chip');
  },
  grove: async (page) => {
    // The grove tool over the dry slope by the lane.
    await hover(page, 28.5, 61.5);
  },
  'grove-close': async (page) => {
    await closeTo(page, 'grove', 2.4, 5, 0.25);
  },
  'grove-tip': async (page) => {
    const b = await closeTo(page, 'grove', 2.4, 9, 0.1);
    await hover(page, b.x + 1.5, b.z + 1.5);
  },
  press: async (page) => {
    await closeTo(page, 'press', 2.4, 5, 0.25);
  },
  'press-tip': async (page) => {
    const b = await closeTo(page, 'press', 2.4, 9, 0.1);
    await hover(page, b.x + 1.5, b.z + 1.5);
  },
  storehouse: async (page) => {
    await closeTo(page, 'storehouse', 5.5, 5, 0.35);
  },
  'storehouse-tip': async (page) => {
    const b = await closeTo(page, 'storehouse', 2.3, 9, 0.1);
    await hover(page, b.x + 1.5, b.z + 1.5);
  },
  'oil-stall': async (page) => {
    await closeTo(page, 'agora', 3.7, 4, 0.3);
  },
  'stall-tip': async (page) => {
    const b = await closeTo(page, 'agora', 3.7, 9, 0.1);
    await hover(page, b.x + 1.5, b.z + 1.5);
  },
  oilvendor: async (page) => {
    const t = await page.evaluate(() => window.__zeus.tick());
    await page.waitForFunction((t0) => window.__zeus.tick() > t0 + 40, t, { timeout: 240000 });
  },
  'oilvendor-close': async (page) => {
    await closeToWalker(page, () => window.__zeus.where('oil'));
  },
  'cart-olives': async (page) => {
    await closeToWalker(page, () => window.__zeus.cartOf(3));
  },
  'cart-oil': async (page) => {
    await closeToWalker(page, () => window.__zeus.cartOf(4));
  },
  'porter-oil': async (page) => {
    await closeToWalker(page, () => window.__zeus.porterOf?.(4) ?? null);
  },
  'pasture-close': async (page) => {
    await closeTo(page, 'pasture', 2.4, 6, 0.3);
  },
  'pasture-tip': async (page) => {
    const b = await closeTo(page, 'pasture', 2.4, 9, 0.1);
    await hover(page, b.x + 1.5, b.z + 1.5);
  },
  vineyard: async (page) => {
    // The vineyard tool over the sunny slope west of the town.
    await hover(page, 7.5, 78.5);
  },
  'villa-close': async (page) => {
    const v = await page.evaluate(() => window.__zeus.homes().find((h) => h.level === 6));
    await page.evaluate((h) => window.__zeus.jump({ x: h.x + 1, z: h.z + 1, yaw: 0.7, dist: 4, tilt: 0.35 }), v);
  },
  'villa-street': async (page) => {
    const v = await page.evaluate(() => window.__zeus.homes().find((h) => h.level === 6));
    await page.evaluate((h) => window.__zeus.jump({ x: h.x + 1, z: h.z + 1, yaw: 1.2, dist: 7, tilt: 0.02 }), v);
  },
  'villas-overview': async (page) => {
    await page.evaluate(() => window.__zeus.jump({ x: 27, z: 72, yaw: 0.6, dist: 32, tilt: -0.2 }));
  },
  'villa-tip': async (page) => {
    const v = await page.evaluate(() => window.__zeus.homes().find((h) => h.level === 6));
    await hover(page, v.x + 1, v.z + 1);
  },
  'winery-close': async (page) => {
    await closeTo(page, 'winery', 2.4, 5, 0.3);
  },
  'vineyard-close': async (page) => {
    await closeTo(page, 'vineyard', 2.0, 6, 0.25);
  },
  'winery-tip': async (page) => {
    const b = await closeTo(page, 'winery', 2.4, 9, 0.1);
    await hover(page, b.x + 1.5, b.z + 1.5);
  },
  'storehouse-goods': async (page) => {
    await closeTo(page, 'storehouse', 5.5, 5, 0.35);
  },
  'stalls-three': async (page) => {
    await closeTo(page, 'agora', 3.7, 7, 0.6);
  },
  winevendor: async (page) => {
    const t = await page.evaluate(() => window.__zeus.tick());
    await page.waitForFunction((t0) => window.__zeus.tick() > t0 + 40, t, { timeout: 240000 });
  },
  'winevendor-close': async (page) => {
    await closeToWalker(page, () => window.__zeus.where('wine'), 40, { yaw: 0.5, dist: 3.4, tilt: 0.45 });
  },
  'fleecevendor-close': async (page) => {
    await closeToWalker(page, () => window.__zeus.where('fleece'), 40, { yaw: 0.5, dist: 3.4, tilt: 0.45 });
  },
  'cart-fleece': async (page) => {
    await closeToWalker(page, () => window.__zeus.cartOf(5), 40, { yaw: 0.5, dist: 3.4, tilt: 0.45 });
  },
  'cart-grapes': async (page) => {
    await closeToWalker(page, () => window.__zeus.cartOf(6), 40, { yaw: 0.5, dist: 3.4, tilt: 0.45 });
  },
  'cart-wine': async (page) => {
    await closeToWalker(page, () => window.__zeus.cartOf(7), 40, { yaw: 0.5, dist: 3.4, tilt: 0.45 });
  },
  'porter-fleece': async (page) => {
    await closeToWalker(page, () => window.__zeus.porterOf?.(5) ?? null, 40, { yaw: 0.5, dist: 2.6, tilt: 0.75 });
  },
  'porter-wine': async (page) => {
    await closeToWalker(page, () => window.__zeus.porterOf?.(7) ?? null, 40, { yaw: 0.5, dist: 2.6, tilt: 0.75 });
  },
  // Slice 12: the first hazard building of a kind of trouble, close by.
  'fire-close': async (page) => {
    const b = await page.evaluate(() => window.__zeus.hazardsOf().find((o) => o.fire === 1));
    await page.evaluate((b) => window.__zeus.jump({ x: b.x + b.side / 2, z: b.z + b.side / 2, yaw: 0.7, dist: 7, tilt: 0.2 }), b);
  },
  'marks-close': async (page) => {
    const b = await page.evaluate(() => window.__zeus.hazardsOf(500).find((o) => o.fire === 0 && !o.creak));
    await page.evaluate((b) => window.__zeus.jump({ x: b.x + b.side / 2, z: b.z + b.side / 2, yaw: 0.7, dist: 12, tilt: 0.1 }), b);
  },
  'fire-overlay': async (page) => {
    await page.keyboard.press('Escape');
  },
  blaze: async (page) => {
    const b = await page.evaluate(() => window.__zeus.hazardsOf().find((o) => o.fire === 2));
    await page.evaluate((b) => window.__zeus.jump({ x: b.x + b.side / 2, z: b.z + b.side / 2, yaw: 0.7, dist: 16, tilt: 0.05 }), b);
  },
  'blaze-close': async (page) => {
    const b = await page.evaluate(() => window.__zeus.hazardsOf().find((o) => o.fire === 2));
    await page.evaluate((b) => window.__zeus.jump({ x: b.x + b.side / 2, z: b.z + b.side / 2, yaw: 0.7, dist: 6, tilt: 0.2 }), b);
  },
  'rubble-close': async (page) => {
    await closeTo(page, 'rubble', 0.7, 6, 0.25, 1, 1);
  },
  'rubble-tip': async (page) => {
    const b = await closeTo(page, 'rubble', 0.7, 10, 0.1, 1, 1);
    await hover(page, b.x + 1, b.z + 1);
  },
  'creak-close': async (page) => {
    const b = await page.evaluate(() => window.__zeus.hazardsOf().find((o) => o.creak));
    await page.evaluate((b) => window.__zeus.jump({ x: b.x + b.side / 2, z: b.z + b.side / 2, yaw: 0.7, dist: 7, tilt: 0.2 }), b);
  },
  'fire-panel': async (page) => {
    // The panel of the smouldering home, opened by a click.
    await page.keyboard.press('Escape');
    const b = await page.evaluate(() => window.__zeus.hazardsOf().find((o) => o.fire === 1 && o.kind === 'home'));
    await page.evaluate((b) => window.__zeus.jump({ x: b.x + 1, z: b.z + 1, yaw: 0.7, dist: 12, tilt: 0.1 }), b);
    await hover(page, b.x + 1, b.z + 1);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForFunction(() => window.__zeus.panelText().length > 0, null, { timeout: 120000 });
  },
  'fire-tip': async (page) => {
    await page.keyboard.press('Escape');
    const b = await page.evaluate(() => window.__zeus.hazardsOf().find((o) => o.fire === 1));
    await page.evaluate((b) => window.__zeus.jump({ x: b.x + 1, z: b.z + 1, yaw: 0.7, dist: 12, tilt: 0.1 }), b);
    await hover(page, b.x + 1, b.z + 1);
  },
  'rubble-hover': async (page) => {
    await page.keyboard.press('Escape');
    const b = await closeTo(page, 'rubble', 0.7, 10, 0.1, 1, 1);
    await hover(page, b.x + 1, b.z + 1);
  },
  'wear-overlay': async (page) => {
    await page.keyboard.press('Escape');
  },
  watchpost: async (page) => {
    await closeTo(page, 'watchpost', 0.7, 4, 0.3, 1, 1);
  },
  architect: async (page) => {
    await closeTo(page, 'architect', 0.7, 4, 0.3, 1, 1);
  },
  'watchpost-tip': async (page) => {
    await hover(page, 87, 43);
  },
  'architect-tip': async (page) => {
    await hover(page, 87, 43);
  },
  watchman: async (page) => {
    const t = await page.evaluate(() => window.__zeus.tick());
    await page.waitForFunction((t0) => window.__zeus.tick() > t0 + 40, t, { timeout: 240000 });
  },
  'watchman-close': async (page) => {
    await closeToWalker(page, () => window.__zeus.where('watchman'), 40, { yaw: 0.5, dist: 2.6, tilt: 0.3 });
  },
  'watchman-dash': async (page) => {
    // A watchman running to the fire, close by.
    await page.waitForFunction(() => window.__zeus.dasher() !== null, null, { timeout: 400000, polling: 100 });
    await page.evaluate(() => {
      window.__zeus.speed('paused');
      const w = window.__zeus.dasher();
      if (w) window.__zeus.jump({ x: w.x, z: w.z, yaw: 0.5, dist: 4, tilt: 0.3 });
    });
  },
  'watchman-fight': async (page) => {
    // A watchman at the fire, throwing water on it.
    await page.waitForFunction(() => window.__zeus.fighter() !== null, null, { timeout: 400000, polling: 100 });
    await page.evaluate(() => {
      window.__zeus.speed('paused');
      const w = window.__zeus.fighter();
      if (w) window.__zeus.jump({ x: w.x, z: w.z, yaw: 0.5, dist: 6, tilt: 0.25 });
    });
  },
  inspector: async (page) => {
    const t = await page.evaluate(() => window.__zeus.tick());
    await page.waitForFunction((t0) => window.__zeus.tick() > t0 + 40, t, { timeout: 240000 });
  },
  'inspector-close': async (page) => {
    await closeToWalker(page, () => window.__zeus.where('inspector'), 40, { yaw: 0.5, dist: 2.6, tilt: 0.3 });
  },
  'seven-needs': async (page) => {
    // Debug: one villa warned about all seven of its needs at once, to see the sign's layout.
    const id = await page.evaluate(() => {
      const hs = window.__zeus.homes().filter((h) => h.level === 6);
      return hs[0].id;
    });
    await page.evaluate((i) => window.__zeus.warnAll(i), id);
    await page.evaluate((i) => {
      const h = window.__zeus.homes().find((o) => o.id === i);
      const v = window.__zeus.view();
      window.__zeus.jump({ ...v, x: h.x + 1, z: h.z + 1, dist: 13, tilt: 0.1 });
    }, id);
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
  handin: async (page) => {
    // When a collector gets back, his takings float up from the office.
    await page.waitForFunction(() => document.querySelector('.floater.tax') !== null, null, { timeout: 120000, polling: 50 });
    await page.evaluate(() => window.__zeus.speed('paused'));
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

// Slice 21: Greece goes on. The map's camera close on a war, a festival, the fields; the pointer on a piece for its card.
const greeceAt = async (page, v) => {
  await page.evaluate((v) => window.__zeus.greeceJump(v), v);
  const f = await page.evaluate(() => window.__zeus.frames);
  await page.waitForFunction((f0) => window.__zeus.frames > f0 + 4, f, { timeout: 120000 });
};
const pointAt = async (page, key) => {
  const g = await page.evaluate(() => window.__zeus.greeceInfo());
  const at = g.travellers[key];
  if (!at) return console.log(`(no ${key} on the map: ${Object.keys(g.travellers).join(', ')})`);
  await page.mouse.move(at.x, at.y);
  await page.mouse.move(at.x + 1, at.y + 1);
};
Object.assign(SHOTS, {
  war: '#war-paused',
  'war-close': '#war-paused',
  'war-army': '#war-paused',
  'war-swords': '#war-paused',
  'war-rivals': '#war-paused',
  peace: '#peace-paused',
  'peace-close': '#peace-paused',
  festival: '#festival-paused',
  'festival-close': '#festival-paused',
  'fields-close': '#festival-paused',
});
Object.assign(BEFORE, {
  'war-close': async (page) => greeceAt(page, { x: 50, z: 68, yaw: 0, dist: 30, tilt: 0.05 }),
  'war-army': async (page) => {
    await greeceAt(page, { x: 50, z: 68, yaw: 0, dist: 30, tilt: 0.05 });
    const g = await page.evaluate(() => window.__zeus.greeceInfo());
    const key = Object.keys(g.travellers).find((k) => /^war-\d+-sparta$/.test(k));
    if (key) await pointAt(page, key);
  },
  'war-swords': async (page) => {
    await greeceAt(page, { x: 50, z: 68, yaw: 0, dist: 30, tilt: 0.05 });
    const g = await page.evaluate(() => window.__zeus.greeceInfo());
    const key = Object.keys(g.travellers).find((k) => /^war-\d+$/.test(k));
    if (key) await pointAt(page, key);
  },
  'war-rivals': async (page) => {
    await page.click('.greece-panel button[data-tab="rivals"]');
  },
  'peace-close': async (page) => greeceAt(page, { x: 50, z: 68, yaw: 0, dist: 30, tilt: 0.05 }),
  'festival-close': async (page) => {
    await greeceAt(page, { x: 58, z: 67, yaw: 0, dist: 22, tilt: 0.05 });
  },
  'fields-close': async (page) => greeceAt(page, { x: 48, z: 70, yaw: 0, dist: 44, tilt: 0.05 }),
});

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
  // The build bar at a laptop's width, and with a group's row open (bar-open-<width>).
  const bar = /^bar-(open-)?(\d+)$/.exec(name);
  const narrow = /-(1280|1366)$/.exec(name);
  const width = bar ? Number(bar[2]) : narrow ? Number(narrow[1]) : 0;
  await page.setViewportSize(width ? { width, height: Math.round((width * 9) / 16) } : { width: 1600, height: 900 });
  await page.goto('about:blank');
  await page.goto(url + q);
  await page.waitForFunction(() => window.__zeus?.ready === true, null, { timeout: 120000 });
  await page.waitForFunction(() => window.__zeus.frames > 8, null, { timeout: 120000 });
  if (name === 'help') await page.keyboard.press('?');
  if (bar?.[1]) await page.click('.btn.tool.group[data-group="makers"]');
  if (name === 'bar-offices') {
    await page.keyboard.press('z');
    await page.keyboard.press('z');
    await page.click('.btn.tool.group[data-group="offices"]');
  }
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
