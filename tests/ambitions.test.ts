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
  greatEstates,
  ambitionTownLine,
  ambitionView,
  colonyNames,
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
import { ESTATE, GREAT_ESTATE } from '../src/sim/buildings';
import { cityOf, moodReasons } from '../src/sim/world';
import { plantColony } from '../src/sim/colonies';
import { demoSim } from './prepared';
// Slice 61.
import { honour } from '../src/sim/pantheon';

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
    expect(cols.map((c) => c.name)).toEqual(['Master of Greece', 'The great trading city', 'A city of wonders', 'Beloved of the gods']);
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
    expect(sim.state.ambition).toEqual({ on: false, looked: false, reached: [], fameUntil: 0, grand: 0, grandQuiet: false, known: ['greece', 'trade', 'wonders', 'gods'] } satisfies Ambition);
  });

  it('a town opened records what it already meets quietly, with no reward', () => {
    const sim = demoSim('vassal');
    const s = sim.state;
    expect(s.ambition.on).toBe(true);
    // #vassal: two companies, Corinth its vassal, a town of villas. (At the merge of slice 36: with the ships back on
    // their schedule after a winter, the Tyrian ship's call falls in January, so nothing was sold in its last two months
    // and the busy market isn't met as it opens.)
    for (const id of ['army', 'vassal', 'town', 'villas']) expect(laurelOf(s, id)?.quiet, id).toBe(true);
    expect(laurelOf(s, 'market')).toBeUndefined();
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

  it('all four achieved: the grand finish, a word from every ruler, the town line and a year’s pride; play goes on', () => {
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
    expect(ambitionTownLine(s)).toMatch(/^All four ambitions achieved: .* Play on as long as you like\.$/);
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
    expect(MILESTONES.length).toBe(20);
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
    expect(old.ambition).toEqual({ on: true, looked: false, reached: [], fameUntil: 0, grand: 0, grandQuiet: false, known: ['greece', 'trade', 'wonders', 'gods'] });
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

  // Wired at the merge of slice 36 (the great houses).
  it('grand estates: two great estates with their houses in; an estate not yet great doesn’t count; won in play, renown', () => {
    // #estates: its two great estates, full (recorded quietly as the town opened).
    const sim = demoSim('estates');
    const s = sim.state;
    const m = milestoneOf('estates')!;
    expect(greatEstates(s)).toBe(2);
    expect(m.progress(s)).toEqual({ have: 2, need: 2, words: '2 of 2 great estates' });
    expect(laurelOf(s, 'estates')?.quiet).toBe(true);
    // One back at the estate's level, or a great estate's house gone, and it is one of two; a villa never counts.
    const [a, b] = s.buildings.filter((x) => x.estate && x.level === GREAT_ESTATE);
    a.level = ESTATE;
    expect(m.progress(s).words).toBe('1 of 2 great estates');
    a.level = GREAT_ESTATE;
    const people = b.people;
    b.people = 0;
    expect(greatEstates(s)).toBe(1);
    b.people = people;
    expect(greatEstates(demoSim('richtown').state)).toBe(0);
    // Its laurel taken back, the next look wins it in play: every ruler 5 warmer.
    s.ambition.reached = s.ambition.reached.filter((l) => l.id !== 'estates');
    sim.run(TICKS_PER_DAY);
    expect(laurelOf(s, 'estates')?.quiet).toBe(false);
    expect(laurelOf(s, 'estates')?.note).toBe('every ruler in Greece is 5 warmer for it');
    expect(moodReasons(cityOf(s.world, 'athens'), s.tick).some((r) => r.why === 'Your city’s renown: your grand estates' && r.worth === 5)).toBe(true);
  });
  // (Wired at the merge of slice 37.)
  it('colonies count, by name: a colony is a city bowing, colonies and vassals together make a lord of three; one gone free no longer counts', () => {
    const sim = demoSim('town');
    const s = sim.state;
    expect(colonyNames(s)).toEqual([]);
    expect(laurelOf(s, 'vassal')).toBeUndefined();
    const free = s.world.sites.filter((x) => !x.owner && !x.bound && !x.free).map((x) => x.id);
    expect(free.length).toBeGreaterThanOrEqual(2);
    const a = plantColony(s, free[0], 120);
    expect(colonyNames(s)).toEqual([a.name]);
    expect(milestoneOf('vassal')!.progress(s)).toEqual({ have: 1, need: 1, words: `${a.name} is yours` });
    sim.run(TICKS_PER_DAY);
    expect(laurelOf(s, 'vassal')?.quiet).toBe(false);
    expect(laurelOf(s, 'vassal')?.note).toMatch(/settlers drawn by its fame/);
    // A second colony and a vassal: lord of three cities, the colonies named with the vassal.
    const b = plantColony(s, free[1], 90);
    take(s, cityOf(s.world, 'argos'), 'awe', 'for a test');
    const lord = milestoneOf('lord')!.progress(s);
    expect(lord.have).toBe(3);
    expect(lord.words).toContain(a.name);
    expect(lord.words).toContain(b.name);
    sim.run(TICKS_PER_DAY);
    expect(laurelOf(s, 'lord')?.quiet).toBe(false);
    // A colony gone free (its site no longer yours) no longer counts.
    const x = s.world.sites.find((y) => y.id === free[0])!;
    x.owner = '';
    x.free = a.name;
    expect(colonyNames(s)).toEqual([b.name]);
    expect(milestoneOf('lord')!.progress(s).have).toBe(2);
  });

  it('#colonies opens with its two colonies counted, met quietly as the town opened', () => {
    const s = demoSim('colonies').state;
    const names = s.empire.colonies.map((c) => c.name);
    expect(names.length).toBe(2);
    expect(colonyNames(s)).toEqual(names);
    expect(milestoneOf('vassal')!.progress(s).have).toBeGreaterThanOrEqual(2);
    expect(laurelOf(s, 'vassal')?.quiet).toBe(true);
  });
});

// Slice 61: Beloved of the gods, the fourth ambition.
describe('Beloved of the gods (slice 61)', () => {
  const gods = (s: SimState): string[] => s.ambition.reached.filter((l) => milestoneOf(l.id)?.ambition === 'gods').map((l) => l.id);

  it('runs beside the other three, its five milestones easy to grand, the last its crown', () => {
    expect(AMBITIONS).toEqual(['greece', 'trade', 'wonders', 'gods']);
    expect(milestonesOf('gods').map((m) => m.id)).toEqual(['shrines', 'sanctuary', 'loving', 'slain', 'sanctuaries']);
    expect(milestonesOf('gods').map((m) => m.reward.kind)).toEqual(['gift', 'fame', 'renown', 'gift', 'renown']);
    const col = ambitionView(new Sim().state)[3];
    expect(col.name).toBe('Beloved of the gods');
    expect(col.milestones[4].monument).toBe(true);
  });

  it('a bare town meets none of the five, and each says what is missing', () => {
    const s = new Sim().state;
    const words = (id: string): string => milestoneOf(id)!.progress(s).words;
    expect(words('shrines')).toBe('No shrine given to a god yet: a shrine’s panel asks whom it serves');
    expect(words('sanctuary')).toBe('No sanctuary yet: mark one out from the Mythology tab');
    expect(words('loving')).toMatch(/^No god loves your city yet; Zeus nearest, watchful \(0 of \+60\)$/);
    expect(words('slain')).toBe('No monster slain yet: none has come to your land (an angry god sends one)');
    expect(words('sanctuaries')).toBe('No sanctuary standing yet');
  });

  it('a shrine to every god: given shrines counted, and the gods still without one named', () => {
    const s = demoSim('town').state;
    const shrine = s.buildings.find((b) => b.kind === 'shrine')!;
    const p = milestoneOf('shrines')!.progress;
    expect(p(s).have).toBe(0);
    // (Copies of a shrine, given to nine gods, read only: the sim is not stepped with them.)
    const nine = ['zeus', 'hera', 'poseidon', 'demeter', 'athena', 'apollo', 'artemis', 'aphrodite', 'dionysus'] as const;
    let id = 1e6;
    const copies = nine.map((god) => ({ ...shrine, id: id++, god }));
    s.buildings.push(...copies);
    expect(p(s)).toEqual({ have: 9, need: 12, words: 'Shrines to 9 of the twelve: none yet to Ares, Hephaestus or Hermes' });
    s.buildings.push({ ...shrine, id: id++, god: 'ares' }, { ...shrine, id: id++, god: 'hephaestus' }, { ...shrine, id: id++, god: 'hermes' });
    expect(p(s)).toEqual({ have: 12, need: 12, words: 'A shrine to each of the twelve' });
  });

  it('sanctuaries: a first finished, the rising ones named with how far, and six standing its crown', () => {
    const s = demoSim('sanctuaries').state;
    // #sanctuaries: Athena's finished, Poseidon's, Apollo's and Demeter's rising.
    expect(milestoneOf('sanctuary')!.progress(s)).toEqual({ have: 1, need: 1, words: 'The sanctuary to Athena stands' });
    expect(laurelOf(s, 'sanctuary')?.quiet).toBe(true);
    const six = milestoneOf('sanctuaries')!.progress(s);
    expect(six.have).toBeGreaterThan(1);
    expect(six.have).toBeLessThan(4);
    expect(six.words).toMatch(/^1 of 6 sanctuaries standing: Athena; Poseidon’s rising, \d+% built, stage 3 of 3; /);
    expect(six.words).toContain('Demeter’s rising, 0% built, stage 1 of 3');
    expect(laurelOf(s, 'sanctuaries')).toBeUndefined();
    // #twelve: all twelve standing, both met quietly as it opened.
    const t = demoSim('twelve').state;
    expect(milestoneOf('sanctuaries')!.progress(t).words).toMatch(/^12 sanctuaries standing: Zeus, Hera, /);
    expect(gods(t)).toEqual(expect.arrayContaining(['sanctuary', 'sanctuaries']));
    expect(t.ambition.reached.filter((l) => milestoneOf(l.id)?.ambition === 'gods').every((l) => l.quiet)).toBe(true);
  });

  it('a first sanctuary won in play: settlers drawn by fame, its town line', () => {
    const sim = demoSim('sanctuaries');
    const s = sim.state;
    s.ambition.reached = s.ambition.reached.filter((l) => l.id !== 'sanctuary');
    sim.run(TICKS_PER_DAY);
    const l = laurelOf(s, 'sanctuary');
    expect(l?.quiet).toBe(false);
    expect(l?.note).toBe('settlers drawn by its fame come twice as often for 3 months');
    expect(s.ambition.fameUntil).toBeGreaterThan(s.tick);
    expect(ambitionTownLine(s)).toMatch(/^A laurel for beloved of the gods \(\d of 5\): a first sanctuary\. Settlers drawn by its fame/);
  });

  it('three gods loving at once: the loving named and the nearest of the rest; met, renown in every ruler', () => {
    const sim = demoSim('godwar');
    const s = sim.state;
    const p = milestoneOf('loving')!.progress;
    expect(p(s).have).toBe(1);
    expect(p(s).words).toMatch(/^1 of 3 gods loving: Athena; \w+ nearest, \w+ \([+−]?\d+ of \+60\)$/);
    s.ambition.reached = s.ambition.reached.filter((l) => l.id !== 'loving');
    honour(s, 'demeter', 90, 'staged', 'for a test', 0);
    expect(p(s).words).toMatch(/^2 of 3 gods loving: Demeter and Athena; /);
    sim.run(TICKS_PER_DAY);
    expect(laurelOf(s, 'loving')).toBeUndefined();
    honour(s, 'zeus', 90, 'staged', 'for a test', 0);
    sim.run(TICKS_PER_DAY);
    expect(laurelOf(s, 'loving')?.note).toBe('every ruler in Greece is 5 warmer for it');
    expect(moodReasons(cityOf(s.world, 'athens'), s.tick).some((r) => r.why === 'Your city’s renown: the gods’ love for your city' && r.worth === 5)).toBe(true);
    ledgerHolds(s);
  });

  it('a monster slain: unmet while it holds its lair (and who could slay it), met in play when the hero slays it', () => {
    const sim = demoSim('slay');
    const s = sim.state;
    const p = milestoneOf('slain')!.progress;
    expect(p(s)).toEqual({ have: 0, need: 1, words: 'No monster slain yet: The Minotaur holds his cave, and Theseus lives in your city and could slay him' });
    const end = s.tick + 3 * TICKS_PER_MONTH;
    while (s.tick < end && !laurelOf(s, 'slain')) sim.run(TICKS_PER_DAY);
    const l = laurelOf(s, 'slain');
    expect(l?.quiet).toBe(false);
    expect(l?.note).toMatch(/^.+ sends 1,000 dr in honour of it$/);
    expect(p(s).words).toMatch(/^The Minotaur slain by Theseus in year \d+$/);
    ledgerHolds(s);
  });

  it('all five: achieved, its town line, a ruler’s word', () => {
    const sim = demoSim('twelve');
    const s = sim.state;
    s.ambition.reached = s.ambition.reached.filter((l) => milestoneOf(l.id)?.ambition !== 'gods');
    for (const id of ['shrines', 'sanctuary', 'loving', 'slain']) s.ambition.reached.push({ id, tick: s.tick - 100, quiet: false, note: '' });
    sim.run(TICKS_PER_DAY);
    const a = achieved(s, 'gods');
    expect(a.tick).toBeGreaterThan(0);
    expect(ambitionTownLine(s)).toMatch(/^Beloved of the gods: achieved in year \d+, with your six sanctuaries; every ruler in Greece is 10 warmer for it\. The other ambitions carry on\.$/);
    expect(s.world.news.some((n) => n.tick === a.tick && / calls .* beloved of the gods now$/.test(n.line))).toBe(true);
  });

  it('a save from before (version 55) gains it: what it meets recorded quietly, said once, no reward', () => {
    const sim = demoSim('twelve');
    const old = JSON.parse(serialize(sim.state)) as Record<string, unknown>;
    const a = old.ambition as Record<string, unknown>;
    delete a.known;
    a.reached = (a.reached as Ambition['reached']).filter((l) => milestoneOf(l.id)?.ambition !== 'gods');
    old.version = SIM_STATE_VERSION - 1;
    expect(migrate(old)).toBe(SIM_STATE_VERSION - 1);
    expect(old.version).toBe(SIM_STATE_VERSION);
    expect((old.ambition as Ambition).known).toEqual(['greece', 'trade', 'wonders']);
    const back = new Sim();
    back.state = old as unknown as SimState;
    const s = back.state;
    const money = s.money;
    const fame = s.ambition.fameUntil;
    const msgs = s.messages.log.length;
    back.step();
    expect(s.ambition.known).toEqual(['greece', 'trade', 'wonders', 'gods']);
    expect(gods(s)).toEqual(['sanctuary', 'sanctuaries']);
    expect(s.ambition.reached.filter((l) => milestoneOf(l.id)?.ambition === 'gods').every((l) => l.quiet && l.note === '')).toBe(true);
    const said = s.messages.log.slice(msgs).filter((m) => m.kind === 'laurel');
    expect(said.length).toBe(1);
    expect(said[0].title).toBe('A fourth ambition: Beloved of the gods');
    expect(said[0].words).toBe('A new ambition beside the other three: Beloved of the gods. Your city already has 2 of its 5 milestones (a first sanctuary and six sanctuaries). The laurel in the top bar shows the rest.');
    expect(s.ambition.fameUntil).toBe(fame);
    expect(s.money).toBe(money);
    back.run(5 * TICKS_PER_DAY);
    expect(s.messages.log.slice(msgs).filter((m) => m.kind === 'laurel').length).toBe(1);
  });

  it('a phase 7 save from the groundwork (version 48) comes up with the fourth ambition, said once, nothing met', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/groundwork-town.save.json.gz')).toString();
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    const sim = new Sim();
    sim.state = got.file.state;
    const s = sim.state;
    expect(s.ambition.known).toEqual(['greece', 'trade', 'wonders']);
    const msgs = s.messages.log.length;
    sim.run(TICKS_PER_MONTH);
    expect(s.ambition.known).toEqual(['greece', 'trade', 'wonders', 'gods']);
    expect(gods(s)).toEqual([]);
    const said = s.messages.log.slice(msgs).filter((m) => m.kind === 'laurel' && m.title === 'A fourth ambition: Beloved of the gods');
    expect(said.length).toBe(1);
    expect(said[0].words).toMatch(/^A new ambition beside the other three: Beloved of the gods, shrines to all twelve, great sanctuaries, and gods who love you\./);
    ledgerHolds(s);
  });
});
