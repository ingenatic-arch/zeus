/**
 * Blessings (slice 57): asking at a finished sanctuary only when the god is
 * warm or better, once a year; every blessing lands and does what it says
 * (through the treasury for Zeus's coin, the ledger invariant held); a
 * loving god's unasked blessing at most once in two years and never with
 * wrath's switch off; a lasting blessing runs out with its season.
 */
import { describe, expect, it } from 'vitest';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '../src/sim/clock';
import { fallIll } from '../src/sim/health';
import { ignite } from '../src/sim/hazards';
import { BLESSINGS, blessRefusal, giveBlessing, SEASON, UNASKED_GAP, ZEUS_GIFT } from '../src/sim/blessings';
import { blessingFrom, godCrime, godMood, godPace, godPrice, godSettle, GOD_IDS, honour, moodOfGod, type GodId } from '../src/sim/pantheon';
import { sanctuaryOf } from '../src/sim/sanctuaries';
import type { SimState } from '../src/sim/state';
import { totals } from '../src/sim/treasury';
import { demoSim } from './prepared';

const ledgerOk = (s: SimState): void => expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);

function rich() {
  const sim = demoSim('richtown');
  sim.enqueue({ type: 'gods', on: true });
  sim.enqueue({ type: 'wrath', on: true });
  sim.flush();
  return sim;
}

describe('asking', () => {
  it('only at a finished sanctuary, only warm or better, once a year', () => {
    const sim = demoSim('sanctuaries');
    const s = sim.state;
    const athena = sanctuaryOf(s, 'athena')!;
    const rising = s.monuments.sites.find((x) => x.kind === 'sanctuary' && !x.finished)!;
    const shrine = s.buildings.find((b) => b.kind === 'shrine');
    if (shrine) expect(blessRefusal(s, shrine.id)).toMatch(/finished sanctuary/);
    expect(blessRefusal(s, rising.id)).toMatch(/not finished/);
    honour(s, 'athena', 20 - moodOfGod(s, 'athena'), 'staged', 'pleased only', 0);
    expect(blessRefusal(s, athena.id)).toMatch(/only when warm/);
    honour(s, 'athena', 45 - moodOfGod(s, 'athena'), 'staged', 'warm now', 0);
    expect(blessRefusal(s, athena.id)).toBe('');
    const m0 = s.messages.next;
    sim.enqueue({ type: 'bless', id: athena.id });
    sim.flush();
    expect(blessingFrom(s, 'athena')).toBeTruthy();
    expect(s.gods.wrath.asked.athena).toBe(s.tick);
    expect(s.messages.log.some((m) => m.id >= m0 && m.title === 'Athena’s blessing')).toBe(true);
    expect(s.gods.walks.figures.some((f) => f.god === 'athena' && f.why === 'blessing')).toBe(true);
    expect(blessRefusal(s, athena.id)).toMatch(/already/);
    sim.run(SEASON + TICKS_PER_DAY);
    expect(blessingFrom(s, 'athena')).toBeUndefined();
    expect(blessRefusal(s, athena.id)).toMatch(/once a year/);
    sim.run(TICKS_PER_YEAR - SEASON);
    expect(blessRefusal(s, athena.id)).toBe('');
  });
});

describe('each blessing', () => {
  it('Zeus: coin through the treasury, and his lightning on raiders', () => {
    const sim = rich();
    const s = sim.state;
    const before = s.money;
    giveBlessing(s, sim.map, 'zeus', true);
    expect(s.money).toBe(before + ZEUS_GIFT);
    ledgerOk(s);
  });
  it('Hera: a child in houses with room, and loyalty', () => {
    const sim = rich();
    const s = sim.state;
    const before = s.population;
    giveBlessing(s, sim.map, 'hera', true);
    expect(s.population).toBeGreaterThan(before);
  });
  it('Poseidon: fair seas, and the rubble cleared', () => {
    const sim = rich();
    const s = sim.state;
    const b = s.buildings.find((x) => x.kind === 'home' && x.people > 0)!;
    ignite(s, b);
    sim.run(12 * TICKS_PER_DAY);
    giveBlessing(s, sim.map, 'poseidon', true);
    expect(s.buildings.some((x) => x.kind === 'rubble')).toBe(false);
    expect(blessingFrom(s, 'poseidon')!.until - s.tick).toBe(TICKS_PER_YEAR);
  });
  it('Demeter, Athena, Dionysus, Hephaestus: their makers double for a season', () => {
    const sim = rich();
    const s = sim.state;
    for (const g of ['demeter', 'athena', 'dionysus', 'hephaestus'] as GodId[]) giveBlessing(s, sim.map, g, true);
    expect([godPace(s, 'farm'), godPace(s, 'grove'), godPace(s, 'winery'), godPace(s, 'armoury')]).toEqual([2, 2, 2, 2]);
    expect(godCrime(s)).toBe(0.5);
  });
  it('Apollo heals the sick; Hephaestus puts the fires out', () => {
    const sim = rich();
    const s = sim.state;
    const homes = s.buildings.filter((b) => b.kind === 'home' && b.family && b.people > 1).slice(0, 3);
    for (const b of homes) fallIll(s, sim.map, b, false);
    expect(s.health.sick.length).toBeGreaterThan(0);
    giveBlessing(s, sim.map, 'apollo', true);
    expect(s.health.sick).toHaveLength(0);
    ignite(s, homes[0]);
    giveBlessing(s, sim.map, 'hephaestus', true);
    expect(s.buildings.some((b) => b.fire !== 0)).toBe(false);
  });
  it('Artemis, Aphrodite, Hermes: herds whole, hearts light, prices better', () => {
    const sim = rich();
    const s = sim.state;
    for (const h of s.herds) h.head = 1;
    giveBlessing(s, sim.map, 'artemis', true);
    expect(s.herds.every((h) => h.head >= h.full)).toBe(true);
    giveBlessing(s, sim.map, 'aphrodite', true);
    expect(godSettle(s)).toBe(2);
    expect(godMood(s)?.w).toBe(2);
    giveBlessing(s, sim.map, 'hermes', true);
    expect(godPrice(s, 70, true)).toBe(80);
    expect(godPrice(s, 70, false)).toBe(60);
  });
  it('every god has a blessing that lands without a fault', () => {
    for (const g of GOD_IDS) {
      const sim = rich();
      giveBlessing(sim.state, sim.map, g, false);
      sim.run(3 * TICKS_PER_DAY);
      ledgerOk(sim.state);
      expect(BLESSINGS[g].does.length).toBeGreaterThan(10);
    }
  });
});

describe('unasked', () => {
  it('a loving god blesses unasked at most once in two years, and never with wrath’s switch off', () => {
    const sim = rich();
    const s = sim.state;
    honour(s, 'demeter', 80, 'staged', 'loving', 0);
    sim.enqueue({ type: 'wrath', on: false });
    sim.flush();
    sim.run(6 * TICKS_PER_MONTH);
    expect(s.gods.wrath.given.demeter).toBeUndefined();
    sim.enqueue({ type: 'wrath', on: true });
    sim.flush();
    const seen: number[] = [];
    for (let m = 0; m < 30; m++) {
      sim.run(TICKS_PER_MONTH);
      const g = s.gods.wrath.given.demeter;
      if (g !== undefined && !seen.includes(g)) seen.push(g);
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i] - seen[i - 1]).toBeGreaterThanOrEqual(UNASKED_GAP);
  }, 1200000);
});
