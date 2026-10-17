/**
 * Fleece, wine and the villa (slice 11): sheep pastures on the grass,
 * vineyards on the sunny slopes and the winery, the storehouse's rooms for
 * bales and amphorae, a stall and a porter for each good, fine houses that
 * need fleece, and the villa, a sixth level that needs wine and pays the most.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { DEMOS } from '../src/game/demos';
import { decodeSave, encodeSave } from '../src/game/saves';
import { coastMap } from '../src/map/bake';
import { buildingRefusal, grassOf, PASTURE_GRASS_MIN, VINE_MIN, vineOf } from '../src/sim/build';
import { FINE, HOME_CAPACITY, HOME_NAMES, TOP_LEVEL, TOWNHOUSE, VILLA } from '../src/sim/buildings';
import { chatterOf } from '../src/sim/chatter';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { citySells, LEVEL_NEEDS, moodOf, needsOf, WARN_AFTER, wantOf, warningsOf } from '../src/sim/folk';
import { FLEECE, gi, GRAPES, OIL, WINE } from '../src/sim/foods';
import { GOOD_USE, hasStall, STALL_GOODS, stallLow } from '../src/sim/goods';
import { GRACE_GOODS } from '../src/sim/migrate';
import { FLEECE_MONTH, WINE_MONTH } from '../src/sim/production';
import { deserialize, serialize, Sim } from '../src/sim/sim';
import { goodLine, homeStatus } from '../src/sim/status';
import { SIM_STATE_VERSION, type Building, type SimState } from '../src/sim/state';
import { FAIR, HARSH, TAX } from '../src/sim/taxes';

const map = coastMap();

const demo = (name: string): Sim => {
  const sim = new Sim();
  DEMOS[name].setup!(sim);
  return sim;
};
const homes = (s: SimState): Building[] => s.buildings.filter((b) => b.kind === 'home' && b.people > 0);
const kinds = (s: SimState, k: Building['kind']): Building[] => s.buildings.filter((b) => b.kind === k);
const byId = (s: SimState, id: number): Building | undefined => s.buildings.find((b) => b.id === id);

describe('goods as data', () => {
  it('every stall good has a row: its need, its stall, its vendor; and the levels that need each', () => {
    expect(STALL_GOODS).toEqual([OIL, FLEECE, WINE]);
    for (const g of STALL_GOODS) expect(GOOD_USE[g]).toBeDefined();
    expect(GOOD_USE[FLEECE]!.service).toBe('fleece');
    expect(GOOD_USE[WINE]!.service).toBe('wine');
    expect(LEVEL_NEEDS[FINE]).toContain('fleece');
    expect(LEVEL_NEEDS[FINE]).not.toContain('wine');
    expect(LEVEL_NEEDS[VILLA]).toContain('wine');
    expect(TOP_LEVEL).toBe(VILLA);
    expect(HOME_NAMES[VILLA]).toBe('A villa');
    expect(HOME_CAPACITY[VILLA]).toBeGreaterThan(HOME_CAPACITY[FINE]);
    // Villas pay the most at every rate but none.
    for (const row of TAX.slice(1)) expect(row[VILLA]).toBeGreaterThan(row[FINE]);
    // A porter goes for his good at half the stall's room, for each good.
    for (const g of STALL_GOODS) expect(stallLow(g)).toBeGreaterThan(0);
  });
});

describe('the pasture and the vineyard', () => {
  it('a pasture needs grass; a vineyard dry sunny slopes, not the river land; sunny slopes beat flat ground', () => {
    const s = new Sim().state;
    // The lane's meadow where the culture towns' pasture goes.
    expect(grassOf(map, 27, 56, 3)).toBeGreaterThanOrEqual(PASTURE_GRASS_MIN);
    expect(buildingRefusal(map, s, 'pasture', 27, 56)).toBe('');
    // The fertile river bank where the farms go: too green and flat for vines.
    expect(buildingRefusal(map, s, 'vineyard', 47, 60)).toMatch(/^Poor ground for vines/);
    // The slope by the main road west of the town, where the villa town plants its vines.
    for (const [x, z] of [
      [6, 77],
      [9, 77],
    ]) {
      expect(vineOf(map, x, z, 3)).toBeGreaterThanOrEqual(VINE_MIN);
      expect(buildingRefusal(map, s, 'vineyard', x, z)).toBe('');
    }
  });
});

describe('fleece', () => {
  it('in the fine-house town every fine house has fleece; a townhouse likes it; a fleece vendor walks', () => {
    const s = demo('fine').state;
    const fine = homes(s).filter((b) => b.level === FINE);
    expect(fine.length).toBeGreaterThan(20);
    expect(citySells(s, FLEECE)).toBe(true);
    for (const b of fine) {
      expect(needsOf(b)).toContain('fleece');
      expect(b.goodsUntil[gi(FLEECE)]).toBeGreaterThan(s.tick);
    }
    expect(kinds(s, 'pasture').length).toBe(1);
    expect(s.walkers.some((w) => w.kind === 'fleece') || kinds(s, 'agora').some((a) => a.vclock[gi(FLEECE)] >= 0)).toBe(true);
    // A pasture makes about 200 bales a month fully worked.
    expect(FLEECE_MONTH).toBe(200);
  });

  it('a fine house that loses its fleece warns, says so, and goes back to a townhouse', () => {
    const sim = demo('fine');
    const s = sim.state;
    for (const p of kinds(s, 'pasture')) sim.enqueue({ type: 'clear', x0: p.x, z0: p.z, x1: p.x, z1: p.z });
    for (const st of kinds(s, 'storehouse')) sim.enqueue({ type: 'clear', x0: st.x, z0: st.z, x1: st.x, z1: st.z });
    sim.flush();
    let first: Building | undefined;
    for (let d = 0; d < 400 && !first; d++) {
      sim.run(TICKS_PER_DAY);
      first = homes(s).find((b) => warningsOf(s, b).some((w) => w.need === 'fleece'));
    }
    expect(first).toBeDefined();
    expect(homeStatus(s, map, first!).detail).toMatch(/No fleece for \d+ days? · goes back to a townhouse in/);
    expect(goodLine(s, map, first!, FLEECE)).toMatch(/no sheep pasture yet|storehouse/);
    const left = warningsOf(s, first!).find((w) => w.need === 'fleece')!.left;
    sim.run(left + 2 * TICKS_PER_DAY);
    expect(first!.level).toBeLessThan(FINE);
    expect(first!.family!.story.some((e) => e.what === 'down' && e.need === 'fleece')).toBe(true);
  });
});

describe('wine and the villa', () => {
  const sim = demo('villas');
  const s = sim.state;

  it('#villas: a street of villas with wine, beside fine houses that want it', () => {
    const villas = homes(s).filter((b) => b.level === VILLA);
    expect(villas.length).toBeGreaterThanOrEqual(10);
    for (const b of villas) {
      expect(needsOf(b)).toContain('wine');
      expect(b.goodsUntil[gi(WINE)]).toBeGreaterThan(s.tick);
      expect(b.people).toBeLessThanOrEqual(HOME_CAPACITY[VILLA]);
    }
    expect(homes(s).some((b) => b.level === FINE && wantOf(s, b) === 'wine')).toBe(true);
    // The panel opens on a villa.
    expect(byId(s, DEMOS.villas.open!(s))?.level).toBe(VILLA);
    // A villa's mood has its wine; its chatter is a villa's.
    const v = villas[0];
    expect(moodOf(s, v, { agora: true, jobs: true, shrine: true, theatre: true }, 0).reasons.some((r) => /Wine/.test(r.text))).toBe(true);
    expect(chatterOf(s, v, false).length).toBeGreaterThan(0);
    expect(homeStatus(s, map, v).title).toMatch(/^A villa/);
  });

  it('grape carts go to a winery and wine carts to a storehouse, never the other way round; fleece carts to a storehouse', () => {
    const w = demo('winery');
    const st = w.state;
    const seen = { grapes: 0, wine: 0, fleece: 0 };
    for (let t = 0; t < 2 * TICKS_PER_MONTH; t++) {
      w.step();
      if (t % 5) continue;
      for (const c of st.walkers) {
        if (c.kind !== 'cart' || c.back || c.load === 0) continue;
        const to = byId(st, c.target);
        if (!to) continue;
        if (c.food === GRAPES) {
          seen.grapes++;
          expect(to.kind).toBe('winery');
        } else if (c.food === WINE) {
          seen.wine++;
          expect(to.kind).toBe('storehouse');
        } else if (c.food === FLEECE) {
          seen.fleece++;
          expect(to.kind).toBe('storehouse');
        }
      }
    }
    expect(seen.grapes).toBeGreaterThan(0);
    expect(seen.wine).toBeGreaterThan(0);
    expect(seen.fleece).toBeGreaterThan(0);
    // A winery makes about 300 amphorae a month fully worked.
    expect(WINE_MONTH).toBe(300);
  });

  it('each stall has its own porter: with all three stalls low, every porter goes, none waiting behind another', () => {
    const w = demo('villas');
    const st = w.state;
    const a = kinds(st, 'agora').find((o) => hasStall(o, WINE))!;
    expect(STALL_GOODS.every((g) => hasStall(a, g))).toBe(true);
    for (const g of STALL_GOODS) a.goods[gi(g)] = 0;
    const out = new Set<number>();
    for (let t = 0; t < 3 * TICKS_PER_DAY; t++) {
      w.step();
      for (const p of st.walkers) if (p.kind === 'porter' && p.origin === a.id && STALL_GOODS.includes(p.food as never)) out.add(p.food);
    }
    expect([...out].sort()).toEqual([...STALL_GOODS].sort());
  });

  it('a villa pays more tax than a fine house at the same rate', () => {
    for (const rate of [FAIR, HARSH]) expect(TAX[rate][VILLA]).toBeGreaterThan(TAX[rate][FINE]);
    expect(TAX[FAIR][TOWNHOUSE]).toBeLessThan(TAX[FAIR][VILLA]);
  });

  it('a town mid-chain (carts with fleece, grapes and wine on the road, porters and vendors out) saves and carries on identically, and runs the same every time', () => {
    const w = demo('villas');
    const st = w.state;
    const busy = (): boolean =>
      [FLEECE, GRAPES, WINE].every((g) => st.walkers.some((c) => c.kind === 'cart' && c.food === g && c.load > 0)) && st.walkers.some((c) => c.kind === 'wine') && st.walkers.some((c) => c.kind === 'fleece');
    let t = 0;
    while (!busy() && t++ < 3 * TICKS_PER_MONTH) w.step();
    expect(busy()).toBe(true);
    const copy = new Sim();
    copy.state = deserialize(serialize(st));
    w.run(900);
    copy.run(900);
    expect(serialize(copy.state)).toEqual(serialize(st));
    expect(serialize(demo('villas').state)).toEqual(serialize(demo('villas').state));
  });
});

describe('saves', () => {
  const text = gunzipSync(readFileSync('tests/fixtures/slice10-fine.save.json.gz')).toString();

  it('a #fine save from slice 10 (state version 9) loads with fleece missing, warns only after the grace, and saves again identically', () => {
    expect(JSON.parse(text).state.version).toBe(9);
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    expect(got.file.from).toBe(9);
    const st = got.file.state;
    expect(st.version).toBe(SIM_STATE_VERSION);
    expect(st.rounds.fleece).toBeDefined();
    expect(st.rounds.wine).toBeDefined();
    for (const b of st.buildings) {
      expect(Array.isArray(b.fetch)).toBe(true);
      if (b.kind === 'home' && b.level >= FINE) expect(b.grace).toBeGreaterThanOrEqual(st.tick + GRACE_GOODS);
    }
    // The oil stall's porter keeps his clock.
    for (const a of kinds(st, 'agora')) expect(a.fetch[gi(FLEECE)]).toBe(0);
    const fine = homes(st).filter((b) => b.level === FINE);
    expect(fine.length).toBeGreaterThan(20);
    expect(goodLine(st, map, fine[0], FLEECE)).toMatch(/^No fleece yet · they’ll put up with it for 8 months more: the city has no sheep pasture yet/);
    const sim = new Sim();
    sim.state = st;
    // Nothing warns of fleece, and nothing goes down for it, until WARN_AFTER past the grace.
    sim.run(GRACE_GOODS + WARN_AFTER - TICKS_PER_DAY);
    expect(homes(st).some((b) => warningsOf(st, b).some((w) => w.need === 'fleece'))).toBe(false);
    expect(homes(st).some((b) => b.family?.story.some((e) => e.what === 'down' && e.need === 'fleece'))).toBe(false);
    sim.run(2 * TICKS_PER_DAY);
    expect(homes(st).filter((b) => warningsOf(st, b).some((w) => w.need === 'fleece')).length).toBeGreaterThan(10);
    // Saved again, it is a save of this version, and carries on the same.
    const r = decodeSave(encodeSave(st, 2));
    if (!r.ok) throw new Error(r.why);
    expect(r.file.from).toBeUndefined();
    const again = new Sim();
    again.state = r.file.state;
    sim.run(600);
    again.run(600);
    expect(serialize(again.state)).toEqual(serialize(sim.state));
  });
});
