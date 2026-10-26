/**
 * Slice 50: the panels' kit. Every ware, kind of message, kind of soldier and
 * kind of land has a drawing of its own; the kit's pieces keep their words as
 * text; a disabled button says why; and a lake's shore is refused as a lake.
 */
import { describe, expect, it } from 'vitest';
import { WARES } from '../src/sim/foods';
import { KINDS, type MessageKind } from '../src/sim/messages';
import type { CompanyKind } from '../src/sim/state';
import { LAND_KINDS } from '../src/map/lands';
import { inlandWater, WATER_SEA } from '../src/map/bake';
import { Sim } from '../src/sim/sim';
import { shoreRefusal } from '../src/sim/trade';
import { goodIcon, LAND_ICONS, messageIcon, SCROLL_ICON, tradeIcon, unitFigure } from '../src/ui/icons';
import { kbar, kbtn, kchip, khead, kitHtml, kpips, kstep, ktoggle } from '../src/ui/kit';
import { TRADE_GOODS } from '../src/sim/trade';

/** The fallback square wareIcon draws for a ware without its own. */
const BLANK_WARE = 'rx="3" fill="#e9cf98"';

describe('the kit’s drawings', () => {
  it('give every ware, every trade good, every kind of message and every kind of land its own icon', () => {
    const seen = new Set<string>();
    for (const w of WARES) {
      const ic = goodIcon(w);
      expect(ic, `ware ${w}`).toMatch(/^<svg /);
      expect(ic.includes(BLANK_WARE), `ware ${w} has the blank square`).toBe(false);
      seen.add(ic);
    }
    expect(seen.size).toBe(WARES.length);
    TRADE_GOODS.forEach((_, k) => expect(tradeIcon(k), `trade good ${k}`).toMatch(/^<svg [^>]*class="ic sw"/));
    expect(tradeIcon(-1)).toBe('');
    for (const k of Object.keys(KINDS) as MessageKind[]) {
      expect(messageIcon(k), `message kind ${k}`).toMatch(/^<svg /);
      expect(messageIcon(k), `message kind ${k} has only the scroll`).not.toBe(SCROLL_ICON);
    }
    expect(messageIcon('land')).not.toBe(SCROLL_ICON);
    for (const k of LAND_KINDS) expect(LAND_ICONS[k], `land ${k}`).toMatch(/^<svg /);
  });

  it('draw every kind of soldier, the hirelings and an ally in their own dress', () => {
    const kinds: CompanyKind[] = ['hoplite', 'archer', 'horseman'];
    for (const k of kinds) {
      const own = unitFigure(k);
      expect(own).toMatch(/^<svg [^>]*class="ki fig/);
      expect(unitFigure(k, 'cretan')).not.toBe(own);
      expect(unitFigure(k, 'arcadian')).not.toBe(own);
      expect(unitFigure(k, '', '#884422')).not.toBe(own);
    }
  });
});

describe('the kit’s pieces', () => {
  it('keep their words as text: quotes and angle brackets never become markup', () => {
    const bad = 'a "quoted" <b>word</b> & more';
    const h = khead({ title: bad, kicker: bad, sub: bad });
    expect(h).not.toContain('<b>word</b>');
    expect(h).toContain('&lt;b&gt;word&lt;/b&gt;');
    const b = kbtn({ html: 'Go', tip: bad, act: 'go', data: { x: '"1"' } });
    expect(b).not.toMatch(/title="a "quoted"/);
    expect(b).toContain('&quot;quoted&quot;');
    expect(b).toContain('data-x="&quot;1&quot;"');
    expect(kchip('3', { tip: bad })).toContain('&lt;b&gt;');
    expect(kbar({ value: 1, max: 2, tip: bad })).toContain('&lt;b&gt;');
  });

  it('disable a button by giving its reason, which is what its tip says', () => {
    const b = kbtn({ html: 'Raise', act: 'raise', tip: 'Raise a company', why: 'The barracks is full' });
    expect(b).toMatch(/ disabled>/);
    expect(b).toContain('The barracks is full');
    expect(b).not.toContain('Raise a company');
    expect(kbtn({ html: 'Raise', act: 'raise', tip: 'Raise a company' })).not.toMatch(/ disabled/);
    const t = ktoggle({ on: true, act: 'pause', why: 'Not now' });
    expect(t).toMatch(/aria-checked="true"/);
    expect(t).toMatch(/ disabled>/);
    const st = kstep({ value: 'All', less: { act: 'limit', dir: 1 }, more: { act: 'limit', dir: -1 }, moreWhy: 'All of its room already' });
    expect(st.match(/ disabled/g)?.length).toBe(1);
    expect(st).toContain('data-dir="1"');
  });

  it('give one socket for each place, filled by its state', () => {
    const p = kpips(['ready', 'ready', 'arming', 'wounded', 'coming', 'empty']);
    expect(p.match(/<i/g)?.length).toBe(6);
    expect(p.match(/class="p-ready"/g)?.length).toBe(2);
  });

  it('turn a panel’s titles into the one tip’s words, so the browser’s own tooltip never shows as well', () => {
    const h = kitHtml('<button title="Go there">Go</button><svg><title>A ship</title></svg>');
    expect(h).toBe('<button data-tip="Go there">Go</button><svg><title>A ship</title></svg>');
  });
});

// Slice 46's finding: a trading post on a lake's shore was refused as "too shallow" without saying it was a lake.
describe('a trading post by a lake', () => {
  it('is refused, and says the water is a lake, not the sea', () => {
    const sim = new Sim(1, 1, { kind: 'delta', size: 192, seed: 2 });
    const map = sim.map;
    const n = map.size;
    const inl = inlandWater(map)!;
    expect(inl).not.toBeNull();
    let tried = 0;
    for (let t = 0; t < n * n && tried < 5; t++) {
      if (!inl[t]) continue;
      const x = (t % n) - 4;
      const z = Math.floor(t / n);
      if (x < 0 || z + 3 > n) continue;
      let sea = false;
      let water = false;
      for (let dz = -2; dz < 5; dz++) for (let dx = -2; dx < 5; dx++) {
        const u = (z + dz) * n + x + dx;
        if (x + dx < 0 || z + dz < 0 || x + dx >= n || z + dz >= n) continue;
        if (map.tileWater[u] === WATER_SEA) water = true;
        if (map.tileWater[u] === WATER_SEA && !inl[u]) sea = true;
      }
      if (sea || !water) continue;
      expect(shoreRefusal(map, x, z)).toMatch(/This is a lake, not the sea/);
      tried++;
    }
    expect(tried).toBeGreaterThan(0);
  }, 120_000);
});

// Merge of slice 50 with slices 49 and 51: the health buildings, their walkers, the quarantine, health's kinds of message
// and the overview's pages have drawings of their own.
describe('the kit’s drawings for health and the overview', () => {
  it('draw the infirmary, the asklepieion, the physician, the bearers, the quarantine and the plague apart', async () => {
    const { ACTION_ICONS, buildingIcon, walkerFigure, PHYSICIAN_FIGURE, BEARERS_FIGURE } = await import('../src/ui/icons');
    const home = buildingIcon('housing');
    for (const k of ['infirmary', 'asklepieion'] as const) {
      expect(buildingIcon(k), k).toMatch(/^<svg [^>]*class="k-bic"/);
      expect(buildingIcon(k), `${k} falls back to the home's tent`).not.toBe(home);
    }
    expect(buildingIcon('infirmary')).not.toBe(buildingIcon('asklepieion'));
    expect(walkerFigure('physician')).toBe(PHYSICIAN_FIGURE);
    expect(walkerFigure('bearer')).toBe(BEARERS_FIGURE);
    expect(PHYSICIAN_FIGURE).toMatch(/^<svg [^>]*class="ki fig"/);
    expect(BEARERS_FIGURE).toMatch(/^<svg [^>]*class="ki fig fwide"/);
    expect(walkerFigure('cart')).toBe('');
    for (const a of ['quarantine', 'lift', 'health', 'bed', 'overview', 'reach', 'crime'] as const) expect(ACTION_ICONS[a], a).toMatch(/^<svg /);
    expect(ACTION_ICONS.quarantine).not.toBe(ACTION_ICONS.lift);
    // Health's two kinds of message: the plague's brazier and the sickness' bowl.
    expect(messageIcon('plague')).not.toBe(messageIcon('sickness'));
  });
});
