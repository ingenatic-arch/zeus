/**
 * The gods of Greece (slice 58): deeds abroad remembered by the gods they
 * touch (and none with the gods off), pious rulers minding their patron's
 * mood, a loving god's blessing and an angry patron on an expedition's odds,
 * Poseidon at sea, the festivals' gods, copper kept for the sites from the
 * armoury's smiths, and the same commands giving the same city.
 */
import { describe, expect, it } from 'vitest';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { giftTo } from '../src/sim/diplomacy';
import { expeditionPlan, oddsOf } from '../src/sim/expeditions';
import { FESTIVALS, festivalOf, festivalOn, nextFestival } from '../src/sim/festivals';
import { COPPER, held, setHeld } from '../src/sim/foods';
import { abroadWords, bandBeaten, BLESSING, dealDeeds, FEAST_ENOUGH, expeditionDeeds, feastGift, godsAbroad, PATRON_ANGRY, PIETY, seaTilt, SEA_TILT, stepGreeceGods, tributePaid } from '../src/sim/greecegods';
import { sitesKeep, stagesOf } from '../src/sim/monuments';
import { honour, moodOfGod, reasonsOf, setGods, type GodId } from '../src/sim/pantheon';
import { sanctuaryOf } from '../src/sim/sanctuaries';
import { deserialize, serialize, Sim } from '../src/sim/sim';
import type { Deal, Expedition, Memory, SimState } from '../src/sim/state';
import { cityOf } from '../src/sim/world';
import { demoSim } from './prepared';

const made: Record<string, string> = {};
const fresh = (name: string): Sim => {
  if (!made[name]) made[name] = serialize(demoSim(name).state);
  const sim = new Sim();
  sim.state = deserialize(made[name]);
  return sim;
};
const send = (sim: Sim, c: Parameters<Sim['enqueue']>[0]): void => {
  sim.enqueue(c);
  sim.flush();
};
/** A bare town with the gods on (or off). */
const bare = (on = true): SimState => {
  const s = new Sim().state;
  setGods(s, on);
  return s;
};
/** Set a god's mood for a test, through the API. */
const moodTo = (s: SimState, god: GodId, n: number): void => honour(s, god, n - moodOfGod(s, god), 'staged', 'set for the test', 0);
const reason = (s: SimState, god: GodId, re: RegExp): number | undefined => reasonsOf(s, god).find((r) => re.test(r.why))?.worth;
const exp = (city: Expedition['city'], won: boolean, coin = 0): Expedition => ({ city, won, coin, goods: 0 }) as Expedition;

describe('deeds in Greece', () => {
  it('an expedition against a patron’s city angers its patron, more without cause, and plunder a great deal more; Ares likes a win, Athena a war won well', () => {
    const s = bare();
    const words = expeditionDeeds(s, exp('athens', true, 400), false);
    expect(reason(s, 'athena', /^you made war on Athens, her city, without cause$/)).toBe(-20);
    expect(reason(s, 'athena', /^you plundered Athens$/)).toBe(-20);
    expect(reason(s, 'ares', /^your soldiers won at Athens$/)).toBe(6);
    expect(moodOfGod(s, 'athena')).toBe(-40);
    expect(words).toMatch(/Athena, Athens’ patron, will not forget the war \(−20\), nor the plunder \(−20\)\. Ares is pleased with the victory \(\+6\)\./);
    // With cause, against Sparta, won but nothing taken: Ares is Sparta's patron and its winner both.
    const t = bare();
    expeditionDeeds(t, exp('sparta', true, 0), true);
    expect(reason(t, 'ares', /^you made war on Sparta, his city$/)).toBe(-8);
    expect(reason(t, 'ares', /plundered/)).toBeUndefined();
    expect(reason(t, 'ares', /^your soldiers won at Sparta$/)).toBe(6);
    expect(reason(t, 'athena', /^a war won well, at Sparta$/)).toBe(4);
    // Lost: a foolish war to Athena.
    const u = bare();
    expeditionDeeds(u, exp('corinth', false), true);
    expect(reason(u, 'athena', /^a foolish war, lost at Corinth$/)).toBe(-4);
    expect(reasonsOf(u, 'ares').length).toBe(0);
  });

  it('a gift that arrives while a city’s festival is on pleases the festival’s god; outside it, nobody', () => {
    const s = bare();
    const n = nextFestival('corinth', 0)!;
    s.tick = n.start + 5 * TICKS_PER_DAY;
    expect(feastGift(s, 'corinth', 12)).toBe('Poseidon, whose feast it is, is pleased (+6)');
    expect(reason(s, 'poseidon', /^your gift reached Corinth during the Isthmian Games$/)).toBe(6);
    // A second, merged into the first.
    feastGift(s, 'corinth', 30);
    expect(reason(s, 'poseidon', /during the Isthmian Games/)).toBe(16);
    // (Review of slice 58) One feast's gifts please its god FEAST_ENOUGH at most: a stream of small gifts can't buy a god's love.
    expect(feastGift(s, 'corinth', 30)).toBe('Poseidon, whose feast it is, is pleased (+4)');
    expect(feastGift(s, 'corinth', 30)).toBe('Poseidon has had gifts enough this feast');
    expect(reason(s, 'poseidon', /during the Isthmian Games/)).toBe(FEAST_ENOUGH);
    // The Karneia is Apollo's, though Sparta's patron is Ares.
    s.tick = nextFestival('sparta', 0)!.start + TICKS_PER_DAY;
    feastGift(s, 'sparta', 4);
    expect(reason(s, 'apollo', /during the Karneia/)).toBe(3);
    expect(reasonsOf(s, 'ares').length).toBe(0);
    s.tick = n.end + TICKS_PER_MONTH;
    expect(feastGift(s, 'corinth', 12)).toBe('');
  });

  it('tribute paid angers Ares; a promise broken angers Zeus and Hera; a promise kept pleases Zeus; a band broken pleases Ares', () => {
    const s = bare();
    const d = { city: 'sparta', kind: 'tribute', promised: false, state: 'met' } as Deal;
    expect(dealDeeds(s, d, { kind: 'paid' } as Memory)).toBe('Ares despises it (−6)');
    expect(reason(s, 'ares', /^you paid tribute to Sparta$/)).toBe(-6);
    tributePaid(s, 'corinth', true);
    expect(reason(s, 'ares', /^you paid Corinth’s raiders to go$/)).toBe(-6);
    const r = { city: 'corinth', kind: 'request', promised: true, state: 'broken' } as Deal;
    expect(dealDeeds(s, r, { kind: 'broken' } as Memory)).toBe('Zeus and Hera saw it (−8, −5)');
    expect(reason(s, 'zeus', /^you broke your promise to Corinth$/)).toBe(-8);
    expect(reason(s, 'hera', /^you broke your promise to Corinth$/)).toBe(-5);
    const k = { city: 'athens', kind: 'request', promised: true, state: 'met' } as Deal;
    expect(dealDeeds(s, k, { kind: 'met' } as Memory)).toMatch(/Zeus, who loves a promise kept, is pleased \(\+3\)/);
    // A request met that was never promised: nothing.
    expect(dealDeeds(s, { ...k, promised: false }, { kind: 'met' } as Memory)).toBe('');
    expect(bandBeaten(s, 'sparta', false)).toBe('Ares is pleased (+6)');
    expect(reason(s, 'ares', /^your soldiers broke Sparta’s raiders$/)).toBe(6);
  });

  it('with the gods off, no deed moves a god', () => {
    const s = bare(false);
    expect(expeditionDeeds(s, exp('athens', true, 400), false)).toBe('');
    s.tick = nextFestival('corinth', 0)!.start + TICKS_PER_DAY;
    expect(feastGift(s, 'corinth', 20)).toBe('');
    expect(dealDeeds(s, { city: 'sparta', kind: 'tribute' } as Deal, { kind: 'paid' } as Memory)).toBe('');
    expect(bandBeaten(s, 'sparta', true)).toBe('');
    for (const g of ['athena', 'ares', 'poseidon', 'zeus', 'hera'] as const) expect(reasonsOf(s, g).length).toBe(0);
  });
});

describe('pious rulers', () => {
  it('remember their patron’s mood towards you on the first of each month, replaced not stacked, and forget it when the patron is watchful', () => {
    const s = bare();
    const c = cityOf(s.world, 'athens');
    c.ruler = { ...c.ruler!, traits: ['pious', 'proud'] };
    const o = cityOf(s.world, 'sparta');
    o.ruler = { ...o.ruler!, traits: ['warlike', 'proud'] };
    moodTo(s, 'athena', -40);
    moodTo(s, 'ares', -40);
    s.tick = 3 * TICKS_PER_MONTH;
    stepGreeceGods(s);
    const piety = (): Memory[] => c.memories.filter((m) => m.kind === 'piety');
    expect(piety()).toHaveLength(1);
    expect(piety()[0].amount).toBe(PIETY[1]);
    expect(piety()[0].why).toBe('pious: Athena, Athens’ patron, is angry with your city');
    // Not pious: nothing.
    expect(o.memories.some((m) => m.kind === 'piety')).toBe(false);
    moodTo(s, 'athena', 70);
    s.tick += TICKS_PER_MONTH;
    stepGreeceGods(s);
    expect(piety()).toHaveLength(1);
    expect(piety()[0].amount).toBe(8);
    expect(piety()[0].why).toBe('pious: Athena, Athens’ patron, is loving towards your city');
    // Only on the first of a month.
    moodTo(s, 'athena', 0);
    s.tick += TICKS_PER_DAY;
    stepGreeceGods(s);
    expect(piety()[0].amount).toBe(8);
    s.tick += TICKS_PER_MONTH - TICKS_PER_DAY;
    stepGreeceGods(s);
    expect(piety()).toHaveLength(0);
    // With the gods off, nothing.
    const t = bare(false);
    const a = cityOf(t.world, 'athens');
    a.ruler = { ...a.ruler!, traits: ['pious'] };
    moodTo(t, 'athena', -70);
    t.tick = TICKS_PER_MONTH;
    stepGreeceGods(t);
    expect(a.memories.some((m) => m.kind === 'piety')).toBe(false);
  });
});

describe('gods abroad', () => {
  it('the most loving god (never the target’s patron) blesses an expedition; an angry patron stands with its city; with the gods off, nothing', () => {
    const s = bare();
    expect(godsAbroad(s, 'athens')).toMatchObject({ ours: 1, theirs: 1, blessed: null, against: null });
    moodTo(s, 'athena', 70);
    moodTo(s, 'ares', 65);
    expect(godsAbroad(s, 'sparta')).toMatchObject({ ours: BLESSING, blessed: 'athena' });
    // Against Athens Athena won't bless; Ares will.
    expect(godsAbroad(s, 'athens').blessed).toBe('ares');
    moodTo(s, 'apollo', -40);
    const troy = godsAbroad(s, 'troy');
    expect(troy).toMatchObject({ theirs: PATRON_ANGRY, against: 'apollo', blessed: 'athena' });
    expect(troy.words.join(' ')).toMatch(/Athena, who loves your city, blessed them.*Apollo, Troy’s patron, is angry with you, and stood with Troy’s men/);
    expect(abroadWords(s, 'troy')).toMatch(/^Athena loves your city and would bless them.*Apollo, Troy’s patron, is angry with you/);
    moodTo(s, 'apollo', -80);
    expect(godsAbroad(s, 'troy').theirs).toBeGreaterThan(PATRON_ANGRY);
    const off = bare(false);
    moodTo(off, 'athena', 90);
    expect(godsAbroad(off, 'sparta')).toMatchObject({ ours: 1, theirs: 1, blessed: null });
  });

  it('an expedition’s odds shown before it goes: better with a loving god, worse with an angry patron, the same as ever with neither', () => {
    const sim = fresh('companies');
    const s = sim.state;
    expect(s.gods.on).toBe(true);
    const plain = expeditionPlan(s, 'sparta', 'force');
    expect(plain.odds).toBe(oddsOf(plain.ours, plain.theirs));
    expect(plain.gods).toBe('');
    moodTo(s, 'demeter', 80);
    const blessed = expeditionPlan(s, 'sparta', 'force');
    expect(blessed.odds).toBe(oddsOf(blessed.ours * BLESSING, blessed.theirs));
    expect(blessed.gods).toMatch(/^Demeter loves your city/);
    moodTo(s, 'demeter', 0);
    moodTo(s, 'ares', -45);
    const against = expeditionPlan(s, 'sparta', 'force');
    expect(against.odds).toBe(oddsOf(against.ours, against.theirs * PATRON_ANGRY));
    expect(against.odds).toBeLessThanOrEqual(plain.odds);
  }, 120000);

  it('Poseidon’s mood tips the fights at sea: 1 while watchful or with the gods off, more loving, less angry', () => {
    const s = bare();
    expect(seaTilt(s)).toBe(1);
    moodTo(s, 'poseidon', 70);
    expect(seaTilt(s)).toBe(SEA_TILT[6]);
    moodTo(s, 'poseidon', -40);
    expect(seaTilt(s)).toBeLessThan(1);
    const off = bare(false);
    moodTo(off, 'poseidon', 90);
    expect(seaTilt(off)).toBe(1);
  });
});

describe('the festivals’ gods', () => {
  it('each of Greece’s festivals is held for a god', () => {
    expect(FESTIVALS.map((f) => [f.city, f.god])).toEqual([
      ['corinth', 'poseidon'],
      ['athens', 'athena'],
      ['sparta', 'apollo'],
    ]);
  });
});

describe('copper kept for the sites (from slice 54’s review)', () => {
  it('a store keeps back what a statue still needs from the armoury’s smiths, who take only what is above it', () => {
    const sim = fresh('sanctuary');
    const s = sim.state;
    const x = sanctuaryOf(s, 'demeter')!;
    const st = stagesOf(x);
    const need = st.reduce((a, y) => a + y.bronze, 0);
    expect(need).toBeGreaterThan(0);
    expect(sitesKeep(s, COPPER)).toBe(need);
    const armoury = s.buildings.find((b) => b.kind === 'armoury')!;
    expect(armoury).toBeTruthy();
    // (No porter of the smiths' already out with copper.)
    s.walkers = s.walkers.filter((w) => !(w.origin === armoury.id && w.kind === 'porter'));
    const stores = s.buildings.filter((b) => b.kind === 'storehouse');
    for (const b of stores) setHeld(b, COPPER, 0);
    setHeld(armoury, COPPER, 0);
    const store = stores[0];
    // Only what the statue needs: the smiths' porter doesn't go for it.
    setHeld(store, COPPER, need);
    for (let i = 0; i < 20 * TICKS_PER_DAY; i++) sim.step();
    expect(s.walkers.some((w) => w.origin === armoury.id && w.kind === 'porter')).toBe(false);
    expect(held(armoury, COPPER)).toBe(0);
    expect(held(store, COPPER)).toBe(need);
    // More than it needs: the porter goes (the store is across the town: a long walk), and takes only what is above it.
    setHeld(store, COPPER, need + 60);
    let gone = false;
    let most = 0;
    for (let i = 0; i < 300 * TICKS_PER_DAY; i++) {
      sim.step();
      const out = s.walkers.some((w) => w.origin === armoury.id && w.kind === 'porter');
      gone ||= out;
      most = Math.max(most, held(armoury, COPPER));
      if (gone && !out) break;
    }
    expect(gone).toBe(true);
    expect(most).toBeGreaterThan(0);
    expect(most).toBeLessThanOrEqual(60);
    expect(held(store, COPPER)).toBeGreaterThanOrEqual(need);
  }, 600000);
});

describe('the same commands give the same city', () => {
  it('a gift reaching Corinth during the Isthmian Games, played twice', () => {
    const run = (): { state: string; poseidon: number } => {
      const sim = fresh('routes');
      const s = sim.state;
      expect(s.gods.on).toBe(true);
      // Up to a few days before the games, then a gift of coin (its herald a few days on the road).
      const n = nextFestival('corinth', s.tick)!;
      while (s.tick < n.start + TICKS_PER_DAY) sim.step();
      send(sim, { type: 'gift', city: 'corinth', good: -1, amount: 250 });
      const g = giftTo(s.world, 'corinth')!;
      expect(g).toBeTruthy();
      while (s.world.gifts.includes(g)) sim.step();
      expect(festivalOn('corinth', s.tick)).toBe(true);
      expect(s.world.news.some((x) => /Poseidon, whose feast it is, is pleased/.test(x.line))).toBe(true);
      expect(festivalOf('corinth')?.god).toBe('poseidon');
      return { state: serialize(s), poseidon: moodOfGod(s, 'poseidon') };
    };
    const a = run();
    const b = run();
    expect(a.poseidon).toBeGreaterThan(0);
    expect(b.state).toBe(a.state);
  }, 600000);
});
