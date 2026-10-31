/**
 * Worship (slice 53): rivalry only from worship and only while the rival is
 * honoured less; shrines' diminishing honour; neglect's slide and its floor;
 * what the gods love and hate read from the city; festivals (their cost,
 * sacred good, month's notice, procession, glad homes, once a year) and
 * offerings carried to a shrine; the switch; determinism; the migration and
 * a save round-trip.
 */
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '../src/sim/clock';
import { held, setHeld, WHEAT } from '../src/sim/foods';
import { migrate } from '../src/sim/migrate';
import { festiveMood, GOD_IDS, GODS, honour, moodOfGod, reasonsOf, setGods } from '../src/sim/pantheon';
import { Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type SimState } from '../src/sim/state';
import { totals } from '../src/sim/treasury';
import {
  FESTIVAL_COST,
  FESTIVAL_HONOUR,
  festivalGoods,
  festivalHeld,
  festivalOf,
  festivalRefusal,
  godDay,
  lookAtCity,
  NEGLECT_FLOOR,
  OFFERING_HONOUR,
  offerRefusal,
  sacredStock,
  shrinesWorth,
  standing,
  stepWorship,
  toldRank,
  worship,
} from '../src/sim/worship';
import { demoSim } from './prepared';

const kinds = (s: SimState, g: (typeof GOD_IDS)[number]): string[] => reasonsOf(s, g).map((r) => r.kind);
const ledgerOk = (s: SimState): void => expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);

function bare(): SimState {
  const s = new Sim().state;
  setGods(s, true);
  return s;
}

/** #town with a shrine dedicated to Demeter (the first shrine), paused as it opens. */
function town(god = 'demeter'): { sim: Sim; shrine: number } {
  const sim = demoSim('town');
  const shrine = sim.state.buildings.find((b) => b.kind === 'shrine')!;
  sim.enqueue({ type: 'dedicate', id: shrine.id, god });
  sim.flush();
  return { sim, shrine: shrine.id };
}

describe('worship and rivalry', () => {
  it('honouring a god stirs the rival a third as much, only while the rival is honoured less', () => {
    const s = bare();
    worship(s, 'poseidon', 12, 'festival', 'your festival to Poseidon', 0);
    expect(moodOfGod(s, 'poseidon')).toBe(12);
    expect(moodOfGod(s, 'athena')).toBe(-4);
    expect(reasonsOf(s, 'athena')[0].why).toBe('you honoured Poseidon, her rival');
    // Athena honoured more than Poseidon: honouring him again doesn't stir her.
    honour(s, 'athena', 40, 'staged', 'staged', 0);
    worship(s, 'poseidon', 6, 'offering', 'your offerings to Poseidon', 0);
    expect(moodOfGod(s, 'athena')).toBe(36);
  });

  it('staged moods, neglect and the city’s loves and hates stir no rival', () => {
    const s = demoSim('town').state;
    honour(s, 'zeus', 30, 'staged', 'staged', 0);
    for (const g of GOD_IDS) godDay(s, g, lookAtCity(s));
    for (const g of GOD_IDS) expect(kinds(s, g).filter((k) => k.startsWith('rival'))).toEqual([]);
  });

  it('a standing honour holds the rival’s standing grudge, and lets it go when the rival is no longer lower', () => {
    const s = bare();
    standing(s, 'hera', 'shrine', 'your shrine to Hera', 5);
    expect(reasonsOf(s, 'dionysus')).toEqual([expect.objectContaining({ worth: -2, why: 'your shrine to Hera, his rival', kind: 'rival:shrine' })]);
    honour(s, 'dionysus', 20, 'staged', 'staged', 0);
    standing(s, 'hera', 'shrine', 'your shrine to Hera', 5);
    expect(kinds(s, 'dionysus')).toEqual(['staged']);
  });

  it('shrines to one god are worth less each: 5, 8, 10, 11, at most 12', () => {
    expect([1, 2, 3, 4, 5, 8].map(shrinesWorth)).toEqual([5, 8, 10, 11, 12, 12]);
  });
});

describe('shrines dedicated', () => {
  it('a shrine dedicated to a god honours them at once; rededicated, the honour moves', () => {
    const { sim, shrine } = town();
    const s = sim.state;
    expect(s.buildings.find((b) => b.id === shrine)!.god).toBe('demeter');
    expect(reasonsOf(s, 'demeter')).toEqual([expect.objectContaining({ worth: 5, why: 'your shrine to Demeter' })]);
    sim.enqueue({ type: 'dedicate', id: shrine, god: 'apollo' });
    sim.flush();
    expect(kinds(s, 'demeter')).not.toContain('shrine');
    expect(moodOfGod(s, 'apollo')).toBe(5);
    sim.enqueue({ type: 'dedicate', id: shrine, god: '' });
    sim.flush();
    expect(s.buildings.find((b) => b.id === shrine)!.god).toBeUndefined();
    expect(moodOfGod(s, 'apollo')).toBe(0);
    sim.enqueue({ type: 'dedicate', id: shrine, god: 'hades' });
    sim.flush();
    expect(s.buildings.find((b) => b.id === shrine)!.god).toBeUndefined();
  });
});

describe('what the gods love and hate', () => {
  it('a reading is asserted with its words while it holds, and forgotten when it doesn’t', () => {
    const s = demoSim('town').state;
    const granaries = s.buildings.filter((b) => b.kind === 'granary');
    for (const g of granaries) setHeld(g, WHEAT, 2400);
    godDay(s, 'demeter', lookAtCity(s));
    expect(reasonsOf(s, 'demeter').map((r) => r.why)).toContain('full granaries');
    for (const g of granaries) setHeld(g, WHEAT, 0);
    godDay(s, 'demeter', lookAtCity(s));
    expect(reasonsOf(s, 'demeter').map((r) => r.why)).not.toContain('full granaries');
  });

  it('nothing is read before the city is noticed', () => {
    const s = demoSim('town').state;
    s.gods.noticedAt = -1;
    s.population = 100;
    for (const g of GOD_IDS) godDay(s, g, lookAtCity(s));
    for (const g of GOD_IDS) expect(moodOfGod(s, g)).toBe(0);
  });

  it('a town played on for a year keeps every god within reach of watchful (between displeased and pleased)', () => {
    const sim = demoSim('town');
    sim.run(TICKS_PER_YEAR);
    for (const g of GOD_IDS) {
      const m = moodOfGod(sim.state, g);
      expect(m, `${g}: ${reasonsOf(sim.state, g).map((r) => `${r.worth} ${r.why}`).join('; ')}`).toBeGreaterThanOrEqual(-29);
      expect(m).toBeLessThan(30);
    }
    // (A year of #town: a few seconds, longer on a busy machine.)
  }, 120_000);
});

describe('neglect', () => {
  it('a god unworshipped a year after the city is noticed slides, never below displeased by neglect alone; worship stops it', () => {
    const s = bare();
    s.population = 400;
    s.gods.noticedAt = 0;
    const look = lookAtCity(s);
    s.tick = TICKS_PER_YEAR - TICKS_PER_MONTH;
    godDay(s, 'ares', look);
    expect(moodOfGod(s, 'ares')).toBe(0);
    for (let m = 0; m < 60; m++) {
      s.tick = TICKS_PER_YEAR + m * TICKS_PER_MONTH;
      godDay(s, 'ares', look);
      expect(moodOfGod(s, 'ares')).toBeGreaterThanOrEqual(NEGLECT_FLOOR);
    }
    expect(moodOfGod(s, 'ares')).toBeLessThan(-10);
    expect(reasonsOf(s, 'ares')[0].why).toBe('no shrine, festival or offering in a year');
    const low = moodOfGod(s, 'ares');
    worship(s, 'ares', 4, 'offering', 'your offerings to Ares', 6 * TICKS_PER_MONTH);
    s.tick += TICKS_PER_MONTH;
    godDay(s, 'ares', look);
    expect(moodOfGod(s, 'ares')).toBeGreaterThan(low);
  });
});

describe('festivals', () => {
  it('cost coin and the sacred good, are announced a month ahead, then a procession walks and homes are glad; one a year', () => {
    const { sim, shrine } = town();
    const s = sim.state;
    s.money = Math.max(s.money, 3000);
    s.ledger.start = s.money - totals(s.ledger.now).net;
    const need = festivalGoods(GODS.demeter.sacred);
    if (sacredStock(s, WHEAT) < need) {
      const g = s.buildings.find((b) => b.kind === 'granary')!;
      setHeld(g, WHEAT, held(g, WHEAT) + need);
    }
    const wheat = sacredStock(s, WHEAT);
    const money = s.money;
    expect(festivalRefusal(s, sim.map, shrine)).toBe('');
    sim.enqueue({ type: 'festival', id: shrine });
    sim.flush();
    expect(s.money).toBe(money - FESTIVAL_COST);
    expect(sacredStock(s, WHEAT)).toBe(wheat - need);
    ledgerOk(s);
    expect(s.ledger.now.some((l) => l.kind === 'worship' && l.amount === -FESTIVAL_COST)).toBe(true);
    expect(s.gods.festivals).toHaveLength(1);
    expect(festivalRefusal(s, sim.map, shrine)).toMatch(/announced/);
    expect(s.messages.log.some((m) => m.kind === 'gods' && /announced/.test(m.words))).toBe(true);
    sim.run(TICKS_PER_MONTH);
    const p = s.walkers.find((w) => w.kind === 'procession');
    expect(p).toBeDefined();
    expect(kinds(s, 'demeter')).toContain('festival');
    expect(reasonsOf(s, 'demeter').find((r) => r.kind === 'festival')!.worth).toBe(FESTIVAL_HONOUR);
    for (let i = 0; i < 2 * TICKS_PER_MONTH && s.walkers.some((w) => w.kind === 'procession'); i++) sim.step();
    expect(s.walkers.some((w) => w.kind === 'procession')).toBe(false);
    expect(s.gods.festivals).toHaveLength(0);
    const glad = Object.keys(s.gods.festive).map(Number);
    expect(glad.length).toBeGreaterThan(3);
    expect(festiveMood(s, glad[0])?.text).toBe('The procession for Demeter passed their door');
    expect(s.messages.log.some((m) => m.kind === 'gods' && /festival is over/.test(m.words))).toBe(true);
    expect(festivalRefusal(s, sim.map, shrine)).toMatch(/one a year/);
    ledgerOk(s);
  });

  it('are refused at a shrine to all the gods, or without the sacred good, saying what is missing', () => {
    const sim = demoSim('town');
    const s = sim.state;
    const shrine = s.buildings.find((b) => b.kind === 'shrine')!;
    expect(festivalRefusal(s, sim.map, shrine.id)).toMatch(/Dedicate the shrine/);
    shrine.god = 'ares';
    expect(festivalRefusal(s, sim.map, shrine.id)).toMatch(/armour/);
    const money = s.money;
    sim.enqueue({ type: 'festival', id: shrine.id });
    sim.flush();
    expect(s.money).toBe(money);
    expect(s.gods.festivals).toHaveLength(0);
  });
});

describe('a festival cut short (review of slice 53)', () => {
  it('a shrine pulled down while its procession walks: the festival is over, its honour and the shrine’s go, and the next can be held in a year', () => {
    const { sim, shrine } = town();
    const s = sim.state;
    s.money = Math.max(s.money, 3000);
    const g = s.buildings.find((b) => b.kind === 'granary')!;
    setHeld(g, WHEAT, held(g, WHEAT) + festivalGoods(WHEAT));
    sim.enqueue({ type: 'festival', id: shrine });
    sim.run(TICKS_PER_MONTH + 3 * TICKS_PER_DAY);
    expect(s.walkers.some((w) => w.kind === 'procession')).toBe(true);
    const b = s.buildings.find((x) => x.id === shrine)!;
    sim.enqueue({ type: 'clear', x0: b.x, z0: b.z, x1: b.x, z1: b.z });
    sim.run(TICKS_PER_DAY + 1);
    expect(s.buildings.some((x) => x.id === shrine)).toBe(false);
    expect(s.walkers.some((w) => w.kind === 'procession')).toBe(false);
    expect(festivalOf(s, 'demeter')).toBeUndefined();
    expect(s.messages.log.some((m) => m.kind === 'gods' && /cut short/.test(m.words))).toBe(true);
    // (Its shrine's honour goes the next day, not on Demeter's day of the month.)
    expect(kinds(s, 'demeter')).not.toContain('shrine');
    expect(kinds(s, 'demeter')).toContain('festival');
  });
});

describe('the news of the gods (review of slice 53)', () => {
  it('neglect is told once, the gods together; a crossing is told once, well past its edge, the gods that cross together in one message', () => {
    const sim = new Sim();
    const s = sim.state;
    setGods(s, true);
    s.population = 400;
    s.gods.noticedAt = 0;
    for (s.tick = 0; s.tick < 3 * TICKS_PER_YEAR; s.tick += TICKS_PER_DAY) stepWorship(s, sim.map);
    const told = s.messages.log.filter((m) => m.kind === 'gods');
    const cold = told.filter((m) => /neglected/.test(m.title ?? ''));
    expect(cold).toHaveLength(1);
    expect(cold[0].words).toMatch(/^All twelve gods have had no shrine/);
    const crossed = told.filter((m) => m !== cold[0]);
    // (The gods' days are spread over the month, so they cross in a few months, not twelve messages: each god named once.)
    expect(crossed.length).toBeLessThanOrEqual(4);
    for (const g of GOD_IDS) expect(crossed.filter((m) => m.words.includes(GODS[g].name)).length, g).toBe(1);
    expect(crossed.every((m) => /displeased/.test(m.title ?? ''))).toBe(true);
    // A god lingering on an edge isn't told back and forth.
    expect(toldRank([0, -11, -9, -11, -9])).toBe(3);
    expect(toldRank([0, -11, -13, -11, -9])).toBe(2);
    expect(toldRank([0, -13, -8])).toBe(3);
  });
});

describe('offerings', () => {
  it('a porter carries the sacred good from a store to the shrine, and the honour lands when he arrives', () => {
    const { sim, shrine } = town();
    const s = sim.state;
    const g = s.buildings.find((b) => b.kind === 'granary')!;
    setHeld(g, WHEAT, Math.max(held(g, WHEAT), 100));
    expect(offerRefusal(s, sim.map, shrine)).toBe('');
    const before = moodOfGod(s, 'demeter');
    sim.enqueue({ type: 'offer', id: shrine });
    sim.flush();
    expect(s.walkers.filter((w) => w.kind === 'offering')).toHaveLength(1);
    expect(offerRefusal(s, sim.map, shrine)).toMatch(/already/);
    expect(moodOfGod(s, 'demeter')).toBe(before);
    for (let i = 0; i < TICKS_PER_MONTH && s.walkers.some((w) => w.kind === 'offering'); i++) sim.step();
    expect(s.walkers.some((w) => w.kind === 'offering')).toBe(false);
    expect(reasonsOf(s, 'demeter').find((r) => r.kind === 'offering')!.worth).toBe(OFFERING_HONOUR);
  });
});

describe('the gods in play', () => {
  it('do nothing with the switch off', () => {
    const { sim } = town();
    const s = sim.state;
    s.gods.on = false;
    const before = JSON.stringify(s.gods);
    sim.run(TICKS_PER_MONTH);
    expect(JSON.stringify(s.gods)).toBe(before);
  });

  it('keep a month’s mood for each god, two years at most', () => {
    const { sim } = town();
    sim.run(3 * TICKS_PER_MONTH);
    for (const g of GOD_IDS) expect(sim.state.gods.months[g]?.length).toBeGreaterThanOrEqual(2);
  });

  it('are deterministic: the same commands give the same moods', () => {
    const run = (): string => {
      const { sim, shrine } = town('poseidon');
      sim.state.money = 5000;
      sim.enqueue({ type: 'offer', id: shrine });
      sim.run(2 * TICKS_PER_MONTH);
      return JSON.stringify(sim.state.gods);
    };
    expect(run()).toBe(run());
  });

  it('save and load round with a festival announced, a procession out and an offering on the road', () => {
    const { sim, shrine } = town();
    const s = sim.state;
    s.money = 5000;
    setHeld(s.buildings.find((b) => b.kind === 'granary')!, WHEAT, 1000);
    sim.enqueue({ type: 'festival', id: shrine });
    sim.enqueue({ type: 'offer', id: shrine });
    sim.run(TICKS_PER_MONTH + 3 * TICKS_PER_DAY);
    expect(s.walkers.some((w) => w.kind === 'procession')).toBe(true);
    const text = encodeSave(s, 1);
    const back = decodeSave(text);
    if (!back.ok) throw new Error(back.why);
    expect(encodeSave(back.file.state, 1)).toBe(text);
    const again = new Sim();
    again.state = back.file.state;
    again.run(TICKS_PER_MONTH);
    sim.run(TICKS_PER_MONTH);
    expect(JSON.stringify(again.state.gods)).toBe(JSON.stringify(s.gods));
  });

  it('a state from before worship (the version before) gains its empty record, nothing else', () => {
    const s = demoSim('town').state;
    const old = JSON.parse(JSON.stringify(s)) as Record<string, unknown> & { gods: Record<string, unknown> };
    old.version = SIM_STATE_VERSION - 1;
    for (const k of ['festivals', 'worshipped', 'lastFestival', 'months', 'month', 'festive']) delete old.gods[k];
    migrate(old);
    expect(old.version).toBe(SIM_STATE_VERSION);
    expect(old.gods.festivals).toEqual([]);
    expect(old.gods.month).toBe(-1);
    for (const g of GOD_IDS) expect(festivalHeld(old as unknown as SimState, g)).toBe(-1);
    expect(JSON.stringify({ ...old, gods: null })).toBe(JSON.stringify({ ...s, gods: null }));
  });
});
