// Slice 30: crime. Temptation, thieves, the watch that catches them, the switch that keeps earlier towns as they
// were, and the slice's other rules that come in with it (taxes day by day, harsh taxes' harder bite, fire's
// gentler first year).
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { coastMap } from '../src/map/bake';
import { decodeSave, encodeSave } from '../src/game/saves';
import { livedIn, VILLA } from '../src/sim/buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '../src/sim/clock';
import { BREAK_IN, HOME_COIN, moodCtx, setOut, startChase, TEMPT_FULL, temptationOf, temptRate, thievesOut, THIEF_FINE, worthAt } from '../src/sim/crime';
import { FIRST_YEAR_PACE, riskRate } from '../src/sim/hazards';
import { moodOf } from '../src/sim/folk';
import { WHEAT } from '../src/sim/foods';
import { canWorkIn } from '../src/sim/labour';
import { createState, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, TILE_ROAD, type Building, type SimState, type Walker } from '../src/sim/state';
import { HARSH, purseTotal } from '../src/sim/taxes';
import { kindTotal, totals } from '../src/sim/treasury';
import { newWalker } from '../src/sim/walk';
import { demoSim } from './prepared';

const size = coastMap().size;
const ledgerAddsUp = (s: SimState): void => expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);
const until = (sim: Sim, ok: () => boolean, most: number): boolean => {
  for (let i = 0; i < most && !ok(); i++) sim.step();
  return ok();
};
/** No watchman anywhere: the posts' walkers gone, and no road walked by one. */
function noWatch(s: SimState): void {
  s.walkers = s.walkers.filter((w) => w.kind !== 'watchman');
  for (const b of s.buildings) if (b.kind === 'watchpost') b.clock = 1e9;
  s.rounds.fire.walked.fill(0);
}
/** Make a home hungry (no food on the table). */
function starve(b: Building): void {
  b.foodUntil = 0;
  b.meatUntil = 0;
  b.cheeseUntil = 0;
  b.grace = 0;
}
const homes = (s: SimState): Building[] => s.buildings.filter((b) => livedIn(b) && b.family);
/** A lived-in home of low level with a home at least three levels richer near it (making one so if need be). */
function poorBesideRich(s: SimState): Building {
  const poor = homes(s).filter((b) => b.level <= 3);
  for (const b of poor) {
    for (const o of homes(s)) {
      if (o.level - b.level >= 3 && Math.abs(o.x - b.x) <= 4 && Math.abs(o.z - b.z) <= 4) return b;
    }
  }
  // None: make a neighbour of the first poor home a villa (for the sums only).
  const b = poor[0];
  const o = homes(s).find((h) => h !== b && Math.abs(h.x - b.x) <= 4 && Math.abs(h.z - b.z) <= 4)!;
  o.level = VILLA;
  b.level = Math.min(b.level, 3);
  return b;
}

describe('temptation', () => {
  it('a hungry home beside villas with no watchman names why, and fills in about a month', () => {
    const sim = demoSim('richtown');
    const s = sim.state;
    noWatch(s);
    const b = poorBesideRich(s);
    starve(b);
    const t = temptationOf(s, size, b);
    const words = t.reasons.map((r) => r.text);
    expect(words).toContain('hungry');
    expect(words.some((w) => w.endsWith('nearby'))).toBe(true);
    expect(words).toContain('no watchman this month');
    expect(t.score).toBeGreaterThanOrEqual(4);
    // At this score, full within about a month.
    expect(TEMPT_FULL / temptRate(t.score)).toBeLessThanOrEqual(32);
    // It rises on its day by its rate.
    b.tempt = 0;
    const before = temptationOf(s, size, b, moodCtx(s)).score;
    sim.run(TICKS_PER_DAY);
    expect(b.tempt).toBe(Math.min(TEMPT_FULL, temptRate(before)));
  });

  it('the same home, fed and with the watchman walking by, isn’t tempted', () => {
    const s = demoSim('richtown').state;
    const b = poorBesideRich(s);
    starve(b);
    b.foodUntil = s.tick + TICKS_PER_MONTH;
    for (let t = 0; t < s.rounds.fire.walked.length; t++) if (s.tiles[t] === TILE_ROAD) s.rounds.fire.walked[t] = s.tick;
    const t = temptationOf(s, size, b);
    expect(t.watched).toBe(true);
    expect(t.reasons.map((r) => r.text)).not.toContain('hungry');
    expect(temptRate(t.score)).toBeLessThan(0);
  });

  it('nothing builds with crime off, and a demo opens with no temptation anywhere', () => {
    const sim = demoSim('richtown');
    const s = sim.state;
    expect(s.crime.on).toBe(true);
    expect(s.buildings.every((b) => b.tempt === 0)).toBe(true);
    sim.enqueue({ type: 'crime', on: false });
    noWatch(s);
    for (const b of homes(s)) starve(b);
    sim.run(TICKS_PER_MONTH);
    expect(s.buildings.every((b) => b.tempt === 0)).toBe(true);
    expect(thievesOut(s)).toEqual([]);
  });
});

describe('thieves', () => {
  /** A town with no watch, the poorest home's thief sent to `target`. */
  function sendTo(kind: Building['kind'] | 'rich'): { sim: Sim; s: SimState; home: Building; target: Building; w: Walker } {
    const sim = demoSim('richtown');
    const s = sim.state;
    noWatch(s);
    const home = poorBesideRich(s);
    const far = (o: Building): number => Math.abs(o.x - home.x) + Math.abs(o.z - home.z);
    const target = (kind === 'rich' ? homes(s).filter((o) => o.level > home.level) : s.buildings.filter((o) => o.kind === kind)).sort((a, b) => far(a) - far(b))[0];
    const w = setOut(s, size, home, target)!;
    expect(w).not.toBeNull();
    return { sim, s, home, target, w };
  }

  it('a full home sends a thief who robs a richer home and gets home; the robbed home minds it', () => {
    const sim = demoSim('richtown');
    const s = sim.state;
    noWatch(s);
    const home = poorBesideRich(s);
    starve(home);
    home.tempt = TEMPT_FULL;
    expect(until(sim, () => thievesOut(s).some((w) => w.home === home.id), 2 * TICKS_PER_DAY)).toBe(true);
    const w = thievesOut(s).find((x) => x.home === home.id)!;
    expect(home.tempt).toBe(0);
    const target = s.buildings.find((b) => b.id === w.target)!;
    expect(until(sim, () => !s.walkers.includes(w), 2 * TICKS_PER_MONTH)).toBe(true);
    const stole = home.family!.story.at(-1)!;
    expect(stole.what).toBe('stole');
    expect(stole.n).toBeGreaterThan(0);
    if (target.kind === 'home') {
      const robbed = target.family!.story.filter((e) => e.what === 'robbed').at(-1)!;
      expect(robbed.n).toBe(HOME_COIN[target.level]);
      expect(moodOf(s, target, moodCtx(s), canWorkIn(s, target)).reasons.some((r) => r.text.startsWith('Robbed'))).toBe(true);
    }
    expect(s.crime.news.at(-1)!.kind).toBe('theft');
    ledgerAddsUp(s);
  });

  it('a theft from the tax office is a Stolen line on the ledger, and the ledger adds up', () => {
    const { sim, s, w } = sendTo('taxoffice');
    expect(until(sim, () => w.back, TICKS_PER_MONTH)).toBe(true);
    expect(w.food).toBe(-1);
    expect(w.load).toBeGreaterThan(0);
    expect(kindTotal(s.ledger.now, 'stolen')).toBe(-w.load);
    expect(s.ledger.now.find((l) => l.kind === 'stolen')!.what).toBe('from the tax office');
    ledgerAddsUp(s);
    // Robbed, the office isn't worth a thief's walk again for a month.
    const office = s.buildings.find((b) => b.id === w.target)!;
    expect(office.robbedAt).toBeGreaterThan(0);
    const home = s.buildings.find((b) => b.id === w.home)!;
    expect(until(sim, () => !s.walkers.includes(w), TICKS_PER_MONTH)).toBe(true);
    expect(worthAt(s, home, office)).toBe(0);
    office.robbedAt = 0;
    expect(worthAt(s, home, office)).toBeGreaterThan(0);
  });

  it('a theft from a granary is in the stock book, and feeds the household', () => {
    const { sim, s, home, w } = sendTo('granary');
    starve(home);
    // (The town's one granary is far from its poorest homes: a long walk there and back.)
    expect(until(sim, () => !s.walkers.includes(w), 3 * TICKS_PER_MONTH)).toBe(true);
    const line = [...s.stocks.now, ...s.stocks.last].find((l) => l.kind === 'lost' && l.what === 'Stolen by thieves');
    expect(line).toBeDefined();
    expect(line!.n).toBeGreaterThan(0);
    expect(home.family!.story.at(-1)!.what).toBe('stole');
    if (line!.ware === WHEAT) expect(home.foodUntil).toBeGreaterThan(s.tick - TICKS_PER_DAY);
  });

  it('a watchman after a thief catches him: the loot goes back, the fine is on the ledger, the house is told', () => {
    const { sim, s, home, w } = sendTo('taxoffice');
    expect(until(sim, () => w.back && w.load > 0, TICKS_PER_MONTH)).toBe(true);
    const taken = w.load;
    // A watchman from the nearest post, standing where the thief is.
    const post = s.buildings.find((b) => b.kind === 'watchpost')!;
    const man = newWalker(s, 'watchman', 1);
    man.origin = post.id;
    man.path = [...w.path];
    man.tiles = [...w.tiles];
    man.seg = Math.max(0, w.seg - 1);
    man.along = 0;
    s.walkers.push(man);
    expect(startChase(s, coastMap(), man, w)).toBe(true);
    expect(until(sim, () => w.people === 0, TICKS_PER_MONTH)).toBe(true);
    expect(kindTotal(s.ledger.now, 'recovered')).toBe(taken);
    expect(kindTotal(s.ledger.now, 'fines')).toBe(THIEF_FINE[home.level]);
    const caught = home.family!.story.at(-1)!;
    expect(caught.what).toBe('caught');
    expect(caught.n).toBe(THIEF_FINE[home.level]);
    expect(s.crime.news.at(-1)!.kind).toBe('caught');
    expect(s.crime.news.at(-1)!.line).toMatch(/^A thief caught .*paid a \d+ dr fine$/);
    sim.run(2);
    expect(s.walkers.includes(w)).toBe(false);
    ledgerAddsUp(s);
  });

  it('a watchman on his round who sees a thief runs after him by himself', () => {
    const { sim, s, w } = sendTo('rich');
    sim.run(BREAK_IN);
    const post = s.buildings.find((b) => b.kind === 'watchpost')!;
    const man = newWalker(s, 'watchman', 1);
    man.origin = post.id;
    man.path = [...w.path];
    man.tiles = [...w.tiles];
    man.seg = w.seg;
    man.along = w.along;
    s.walkers.push(man);
    expect(until(sim, () => man.meat === w.id || w.people === 0, 10)).toBe(true);
    expect(until(sim, () => w.people === 0, TICKS_PER_MONTH)).toBe(true);
  });

  it('a town with thefts and catches in it plays the same twice, and keeps through a save', () => {
    const play = (): SimState => {
      const sim = demoSim('richtown');
      const s = sim.state;
      for (const b of homes(s)) if (b.level <= 3) starve(b);
      for (const b of homes(s).filter((x) => x.level <= 3).slice(0, 6)) b.tempt = TEMPT_FULL;
      sim.run(TICKS_PER_MONTH);
      return s;
    };
    const a = play();
    const b = play();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.crime.news.length).toBeGreaterThan(0);
    const again = decodeSave(encodeSave(a, 1));
    if (!again.ok) throw new Error(again.why);
    expect(JSON.stringify(again.file.state)).toBe(JSON.stringify(a));
  });
});

describe('what comes in with the switch', () => {
  it('fire risk builds at 70% of its pace in a new town’s first year, and as ever with the switch off', () => {
    const s = createState();
    const b = { kind: 'granary', level: 0, people: 0, id: 5 } as Building;
    const off = riskRate(s, b);
    s.crime.on = true;
    expect(riskRate(s, b)).toBeCloseTo(off * FIRST_YEAR_PACE, 12);
    s.tick = TICKS_PER_YEAR;
    expect(riskRate(s, b)).toBe(off);
  });

  it('collectors hand in their satchels every day, and the ledger adds up', () => {
    const sim = demoSim('richtown');
    const s = sim.state;
    // (Each at his own hour: a satchel never holds more than a day's takings.)
    const since = new Map<number, number>(s.walkers.filter((w) => w.kind === 'tax').map((w) => [w.id, s.tick]));
    for (let t = 0; t < 20 * TICKS_PER_DAY; t++) {
      sim.step();
      for (const w of s.walkers) {
        if (w.kind !== 'tax') continue;
        if (w.purse.length === 0) since.set(w.id, s.tick);
        else expect(s.tick - (since.get(w.id) ?? w.since)).toBeLessThanOrEqual(TICKS_PER_DAY);
      }
      if (t % TICKS_PER_DAY === 0) ledgerAddsUp(s);
    }
    // About the same taxes as with the switch off, over a month (counting what is still in the satchels).
    const taxes = (on: boolean): number => {
      const x = demoSim('richtown');
      if (!on) x.enqueue({ type: 'crime', on: false });
      x.run(TICKS_PER_MONTH + 1);
      const out = x.state.walkers.reduce((a, w) => a + purseTotal(w), 0);
      return kindTotal(x.state.ledger.last, 'taxes') + kindTotal(x.state.ledger.now, 'taxes') + out;
    };
    const on = taxes(true);
    const off = taxes(false);
    expect(Math.abs(on - off)).toBeLessThanOrEqual(Math.max(40, off * 0.15));
  });

  it('harsh taxes drive more households out with the switch on than off', () => {
    const left = (on: boolean): number => {
      const sim = demoSim('town');
      if (!on) sim.enqueue({ type: 'crime', on: false });
      sim.enqueue({ type: 'tax', rate: HARSH });
      sim.run(4 * TICKS_PER_MONTH);
      return sim.state.taxGone.length;
    };
    expect(left(true)).toBeGreaterThan(left(false));
  });
});

describe('old saves', () => {
  it('a slice 29 save (version 27) loads with no temptation and crime on, and plays on', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/slice29-fortress.save.json.gz')).toString();
    // (A migration step's own test: the fixture is a version 27 save whatever number this slice takes at merge.)
    expect(JSON.parse(text).state.version).toBe(27);
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    const s = got.file.state;
    expect(s.version).toBe(SIM_STATE_VERSION);
    expect(s.crime.on).toBe(true);
    expect(s.crime.news).toEqual([]);
    expect(s.buildings.every((b) => b.tempt === 0)).toBe(true);
    const sim = new Sim();
    sim.state = s;
    sim.run(TICKS_PER_MONTH);
    ledgerAddsUp(s);
    expect(decodeSave(encodeSave(s, 1)).ok).toBe(true);
  }, 60000);
});
