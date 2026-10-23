/**
 * Ambitions (slice 39): the three side by side from the founding, their
 * milestones read from what the town has, won for good with their rewards
 * (a ruler's gift, settlers drawn by fame, renown), an ambition achieved by
 * its fifth, what is already met recorded quietly when a town is opened or
 * an old save loaded, and the switch kept off while a demo's history plays.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import {
  achieved,
  AMBITIONS,
  ambitionTownLine,
  ambitionView,
  laurelOf,
  milestoneOf,
  MILESTONES,
  milestonesOf,
  nearest,
  prideMood,
  type Ambition,
} from '../src/sim/ambitions';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { moodOf as homeMood } from '../src/sim/folk';
import { migrate } from '../src/sim/migrate';
import { deserialize, serialize, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type SimState } from '../src/sim/state';
import { totals } from '../src/sim/treasury';
import { monumentOf, STAGE_COUNT, stageNow, workOf } from '../src/sim/monuments';
import { take } from '../src/sim/vassals';
import { cityOf, moodReasons } from '../src/sim/world';
import { demoSim } from './prepared';

const send = (sim: Sim, c: Parameters<Sim['enqueue']>[0]): void => {
  sim.enqueue(c);
  sim.flush();
};
const ledgerHolds = (s: SimState): void => expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);
const won = (s: SimState): string[] => s.ambition.reached.map((l) => l.id);

describe('ambitions', () => {
  it('a new game starts at nothing: no milestone met at the founding, every one with its words', () => {
    const sim = new Sim();
    send(sim, { type: 'ambition', on: true });
    sim.run(3 * TICKS_PER_DAY);
    expect(sim.state.ambition.on).toBe(true);
    expect(sim.state.ambition.reached).toEqual([]);
    const cols = ambitionView(sim.state);
    expect(cols.map((c) => c.name)).toEqual(['Master of Greece', 'The great trading city', 'A city of wonders']);
    for (const c of cols) {
      expect(c.milestones.length).toBe(5);
      expect(c.achieved).toBe(0);
      for (const m of c.milestones) expect(m.words.length).toBeGreaterThan(5);
    }
    expect(nearest(sim.state)).not.toBeNull();
  });

  it('off (a bare state, a demo’s history), nothing is looked at or given', () => {
    const sim = new Sim();
    sim.run(5 * TICKS_PER_DAY);
    expect(sim.state.ambition).toEqual({ on: false, looked: false, reached: [], fameUntil: 0, grand: 0, grandQuiet: false } satisfies Ambition);
  });

  it('a town opened records what it already meets quietly, with no reward', () => {
    const sim = demoSim('vassal');
    const s = sim.state;
    expect(s.ambition.on).toBe(true);
    // #vassal: two companies, Corinth its vassal, a busy quay, a town of villas.
    for (const id of ['army', 'vassal', 'market', 'town', 'villas']) expect(laurelOf(s, id)?.quiet, id).toBe(true);
    expect(s.ambition.reached.every((l) => l.note === '')).toBe(true);
    expect(s.ambition.fameUntil).toBe(0);
    expect(ambitionTownLine(s)).toBe('');
    expect(prideMood(s)).toBeNull();
    const gifts = s.world.gifts.length;
    sim.run(2 * TICKS_PER_DAY);
    expect(s.world.gifts.length).toBe(gifts);
  });

  it('a city bowing is a laurel with its reward: settlers drawn by fame, named in the town line', () => {
    const sim = demoSim('town');
    const s = sim.state;
    expect(laurelOf(s, 'vassal')).toBeUndefined();
    take(s, cityOf(s.world, 'argos'), 'awe', 'for a test');
    sim.run(TICKS_PER_DAY);
    const l = laurelOf(s, 'vassal');
    expect(l?.quiet).toBe(false);
    expect(l?.note).toMatch(/settlers drawn by its fame come twice as often for 3 months/);
    expect(s.ambition.fameUntil).toBe(l!.tick + 3 * TICKS_PER_MONTH);
    expect(ambitionTownLine(s)).toMatch(/^A laurel for Master of Greece \(1 of 5\): a city bows to you\. Settlers drawn/);
    // The settlers' clock runs twice as fast while fame lasts.
    s.settlerClock = 40;
    sim.run(10);
    expect(s.settlerClock).toBe(20);
    // The laurel stays won when the vassal is gone.
    s.empire.vassals = [];
    sim.run(TICKS_PER_DAY);
    expect(laurelOf(s, 'vassal')).toBe(l);
  });

  it('lord of three cities: the warmest ruler’s gift comes, into the treasury, the ledger holding', () => {
    const sim = demoSim('town');
    const s = sim.state;
    for (const id of ['argos', 'thebes', 'corinth'] as const) take(s, cityOf(s.world, id), 'awe', 'for a test');
    sim.run(TICKS_PER_DAY);
    const l = laurelOf(s, 'lord');
    expect(l?.quiet).toBe(false);
    const gift = s.world.gifts.find((g) => g.to === 'home' && g.note === 'in honour of your rule over three cities');
    expect(gift?.amount).toBe(1000);
    expect(l?.note).toContain(`sends 1,000 dr in honour of it`);
    const before = s.money;
    let given = 0;
    const end = s.tick + 6 * TICKS_PER_MONTH;
    while (s.tick < end && s.world.gifts.includes(gift!)) sim.run(TICKS_PER_DAY);
    given = s.ledger.now.concat(s.ledger.last).filter((x) => x.kind === 'given').reduce((a, x) => a + x.amount, 0);
    expect(s.world.gifts.includes(gift!)).toBe(false);
    expect(given).toBeGreaterThanOrEqual(1000);
    expect(s.money).not.toBe(before);
    ledgerHolds(s);
  });

  it('a great monument standing: renown in every ruler’s mood, with its reason', () => {
    // #lit: the Lighthouse finished (recorded quietly as the town opened); its laurel taken back, the next look wins it in play.
    const sim = demoSim('lit');
    const s = sim.state;
    expect(laurelOf(s, 'lighthouse')?.quiet).toBe(true);
    s.ambition.reached = s.ambition.reached.filter((l) => l.id !== 'lighthouse');
    const athens = cityOf(s.world, 'athens');
    sim.run(TICKS_PER_DAY);
    expect(laurelOf(s, 'lighthouse')?.quiet).toBe(false);
    expect(laurelOf(s, 'lighthouse')?.note).toBe('every ruler in Greece is 10 warmer for it');
    expect(moodReasons(athens, s.tick).some((r) => r.why === 'Your city’s renown: the Lighthouse' && r.worth === 10)).toBe(true);
  });

  it('a great monument’s laurel waits until it stands, however near it is', () => {
    // (Review of slice 39: its progress was rounded, so the laurel came while the last stage was 99.5% done.)
    const s = demoSim('monument').state;
    const x = monumentOf(s, 'lighthouse')!;
    x.stage = STAGE_COUNT - 1;
    x.building = true;
    x.work = workOf(stageNow(x)!) * 0.998;
    const p = milestoneOf('lighthouse')!.progress(s);
    expect(p.have).toBeLessThan(p.need);
    expect(p.words).toMatch(/99% built, stage 3 of 3/);
  });

  it('an ambition is achieved with its fifth: the column, the town line, a ruler’s word and a year’s pride', () => {
    const sim = demoSim('lit');
    const s = sim.state;
    // The great trading city's first four, as if won in play; then the Lighthouse's laurel is won.
    s.ambition.reached = s.ambition.reached.filter((l) => milestoneOf(l.id)?.ambition !== 'trade');
    for (const m of milestonesOf('trade').slice(0, 4)) s.ambition.reached.push({ id: m.id, tick: s.tick - 100, quiet: false, note: '' });
    expect(achieved(s, 'trade').tick).toBe(0);
    sim.run(TICKS_PER_DAY);
    const a = achieved(s, 'trade');
    expect(a.tick).toBeGreaterThan(0);
    expect(a.quiet).toBe(false);
    expect(ambitionView(s)[1].achieved).toBe(a.tick);
    expect(ambitionTownLine(s)).toMatch(/^The great trading city: achieved in year \d+, with the Lighthouse; every ruler in Greece is 10 warmer for it\. The other ambitions carry on\.$/);
    expect(s.world.news.some((n) => n.tick === a.tick && / calls .* the great trading city now$/.test(n.line))).toBe(true);
    expect(prideMood(s)).toEqual({ w: 1, text: 'Proud of their city: the great trading city' });
    const home = s.buildings.find((b) => b.kind === 'home' && b.family)!;
    expect(homeMood(s, home, { agora: true, jobs: true }, 0).reasons.some((r) => r.text === 'Proud of their city: the great trading city')).toBe(true);
    // The others carry on.
    expect(achieved(s, 'greece').tick).toBe(0);
  });

  it('all three achieved: the grand finish, a word from every ruler, the town line and a year’s pride; play goes on', () => {
    const sim = demoSim('lit');
    const s = sim.state;
    // Every milestone but the last won in play, as if; then the last (the Lighthouse, standing) is won on the next look.
    s.ambition.reached = MILESTONES.filter((m) => m.id !== 'lighthouse').map((m) => ({ id: m.id, tick: s.tick - 100, quiet: false, note: '' }));
    s.ambition.grand = 0;
    sim.run(TICKS_PER_DAY);
    expect(s.ambition.grand).toBeGreaterThan(0);
    expect(s.ambition.grandQuiet).toBe(false);
    const words = s.world.news.filter((n) => n.tick === s.ambition.grand);
    expect(words.length).toBeGreaterThanOrEqual(Math.min(8, s.world.cities.filter((c) => c.ruler && c.pop > 0).length - 1));
    expect(ambitionTownLine(s)).toMatch(/^All three ambitions achieved: .* Play on as long as you like\.$/);
    expect(prideMood(s)).toEqual({ w: 2, text: 'All Greece speaks of our city' });
    const before = s.tick;
    sim.run(TICKS_PER_MONTH);
    expect(s.tick).toBe(before + TICKS_PER_MONTH);
    ledgerHolds(s);
  });

  it('every milestone reads what the town has, and none is met by a bare town', () => {
    const s = new Sim().state;
    for (const m of MILESTONES) {
      const p = m.progress(s);
      expect(p.have, m.id).toBeLessThan(p.need);
      expect(p.need, m.id).toBeGreaterThan(0);
    }
    expect(MILESTONES.length).toBe(15);
    // laurels.ts lists them by id (so the homes' pride needs nothing of the milestones' imports): the same, in the same order.
    for (const k of AMBITIONS) expect(milestonesOf(k).map((m) => m.id)).toEqual(MILESTONES.filter((m) => m.ambition === k).map((m) => m.id));
  });

  it('the same commands give the same town, laurels and rewards; a save round-trips and plays on the same', () => {
    const play = (): Sim => {
      const sim = demoSim('town');
      take(sim.state, cityOf(sim.state.world, 'argos'), 'awe', 'for a test');
      sim.run(20 * TICKS_PER_DAY);
      return sim;
    };
    const a = play();
    const b = play();
    expect(serialize(a.state)).toBe(serialize(b.state));
    expect(won(a.state)).toContain('vassal');
    const c = new Sim();
    c.state = deserialize(serialize(a.state));
    a.run(TICKS_PER_MONTH);
    c.run(TICKS_PER_MONTH);
    expect(serialize(c.state)).toBe(serialize(a.state));
    const d = decodeSave(encodeSave(a.state, 0));
    expect(d.ok).toBe(true);
    if (d.ok) expect(d.file.state.ambition).toEqual(a.state.ambition);
  });

  it('a save from before (version 34) comes up on, and records what it meets quietly on its first tick', () => {
    const sim = demoSim('vassal');
    const old = JSON.parse(serialize(sim.state)) as Record<string, unknown>;
    delete old.ambition;
    // (Slice 39 is version 35 on the trunk: its step runs from 34, then any later steps.)
    old.version = 34;
    expect(migrate(old)).toBe(34);
    expect(old.version).toBe(SIM_STATE_VERSION);
    expect(old.ambition).toEqual({ on: true, looked: false, reached: [], fameUntil: 0, grand: 0, grandQuiet: false });
    const back = new Sim();
    back.state = old as unknown as SimState;
    back.step();
    const s = back.state;
    expect(s.ambition.looked).toBe(true);
    expect(won(s)).toEqual(expect.arrayContaining(['army', 'vassal', 'town', 'villas']));
    expect(s.ambition.reached.every((l) => l.quiet && l.note === '')).toBe(true);
    expect(s.ambition.fameUntil).toBe(0);
  });

  it('a phase 4 save (version 27) comes up through every step, and plays on with the ambitions on', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/phase4-bronze.save.json.gz')).toString();
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    expect(got.file.state.version).toBe(SIM_STATE_VERSION);
    const sim = new Sim();
    sim.state = got.file.state;
    sim.run(TICKS_PER_MONTH);
    expect(sim.state.ambition.on).toBe(true);
    expect(sim.state.ambition.reached.every((l) => l.quiet)).toBe(true);
    ledgerHolds(sim.state);
  });
});
