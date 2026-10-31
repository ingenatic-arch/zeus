/**
 * The twelve and the gods' moods (phase 7 groundwork): the table holds
 * together, moods are made of memories that fade, merge and are capped, the
 * words and reasons read right, a city once noticed stays noticed, an older
 * save loads with the gods on, and the gods on change nothing in a city
 * that honours none of them.
 */
import { describe, expect, it } from 'vitest';
import { RULED } from '../src/map/greece';
import { decodeSave, encodeSave } from '../src/game/saves';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { WARES } from '../src/sim/foods';
import {
  assert,
  GOD_IDS,
  GOD_MOODS,
  GODS,
  HERO_IDS,
  HEROES,
  honour,
  MEMORY_CAP,
  MONSTER_IDS,
  MONSTERS,
  moodAtLeast,
  moodOfGod,
  moodRank,
  moodWord,
  NOTICE_PEOPLE,
  noticed,
  PATRONS,
  patronOf,
  reasonsOf,
  setGods,
  stepGods,
} from '../src/sim/pantheon';
import { Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type SimState } from '../src/sim/state';
import { totals } from '../src/sim/treasury';
import { demoSim } from './prepared';

/** A bare state with the gods on, at a tick of its own. */
function heaven(tick = 1000): SimState {
  const s = new Sim().state;
  s.gods.on = true;
  s.tick = tick;
  return s;
}

describe('the twelve', () => {
  it('are twelve, in their fixed order, each in the table', () => {
    expect(GOD_IDS).toEqual(['zeus', 'hera', 'poseidon', 'demeter', 'athena', 'apollo', 'artemis', 'ares', 'aphrodite', 'hephaestus', 'hermes', 'dionysus']);
    expect(Object.keys(GODS).sort()).toEqual([...GOD_IDS].sort());
    for (const g of GOD_IDS) {
      const d = GODS[g];
      for (const t of [d.name, d.epithet, d.of, d.curseWords, d.blessWords]) expect(t.length).toBeGreaterThan(0);
      expect(d.loves.length).toBeGreaterThan(0);
      expect(d.hates.length).toBeGreaterThan(0);
    }
  });

  it('have rivals in six pairs, each the other’s, never their own', () => {
    for (const g of GOD_IDS) {
      expect(GODS[g].rival).not.toBe(g);
      expect(GODS[GODS[g].rival].rival).toBe(g);
    }
    const pairs = new Set(GOD_IDS.map((g) => [g, GODS[g].rival].sort().join('-')));
    expect(pairs.size).toBe(6);
    expect([...pairs].sort()).toEqual(['aphrodite-artemis', 'apollo-hermes', 'ares-hephaestus', 'athena-poseidon', 'demeter-zeus', 'dionysus-hera']);
  });

  it('hold sacred goods that exist, and colours and emblems of their own', () => {
    for (const g of GOD_IDS) expect(WARES).toContain(GODS[g].sacred);
    expect(new Set(GOD_IDS.map((g) => GODS[g].colour)).size).toBe(12);
    expect(new Set(GOD_IDS.map((g) => GODS[g].emblem)).size).toBe(12);
    for (const g of GOD_IDS) expect(GODS[g].colour).toBeLessThanOrEqual(0xffffff);
  });

  it('send seven monsters, each named by its god, each slain by a hero who exists', () => {
    expect(MONSTER_IDS.length).toBe(7);
    expect(Object.keys(MONSTERS).sort()).toEqual([...MONSTER_IDS].sort());
    for (const m of MONSTER_IDS) {
      expect(GODS[MONSTERS[m].god].monster).toBe(m);
      expect(HERO_IDS).toContain(MONSTERS[m].hero);
      expect(HEROES[MONSTERS[m].hero].slays).toContain(m);
    }
    const sending = GOD_IDS.filter((g) => GODS[g].monster !== null);
    expect(sending.length).toBe(7);
    for (const g of sending) expect(MONSTERS[GODS[g].monster!].god).toBe(g);
  });

  it('have seven heroes, whose monsters exist (Heracles any)', () => {
    expect(Object.keys(HEROES).sort()).toEqual([...HERO_IDS].sort());
    for (const h of HERO_IDS) {
      expect(HEROES[h].slays.length).toBeGreaterThan(0);
      for (const m of HEROES[h].slays) expect(MONSTER_IDS).toContain(m);
      expect(HEROES[h].demands.length).toBeGreaterThan(0);
    }
    expect([...HEROES.heracles.slays].sort()).toEqual([...MONSTER_IDS].sort());
  });

  it('are patrons of ruled cities only: Memphis and your city have none', () => {
    for (const c of Object.keys(PATRONS)) expect(RULED).toContain(c);
    expect(Object.keys(PATRONS).length).toBe(8);
    expect(patronOf('athens')).toBe('athena');
    expect(patronOf('sparta')).toBe('ares');
    expect(patronOf('memphis')).toBeNull();
    expect(patronOf('home')).toBeNull();
  });
});

describe('a god’s mood', () => {
  it('starts watchful, with no reasons', () => {
    const s = new Sim().state;
    expect(s.gods.on).toBe(false);
    for (const g of GOD_IDS) {
      expect(moodOfGod(s, g)).toBe(0);
      expect(moodWord(moodOfGod(s, g))).toBe('watchful');
      expect(reasonsOf(s, g)).toEqual([]);
    }
  });

  it('rises with an honour and fades evenly to nothing; faded memories are forgotten once a day', () => {
    const s = heaven(1000);
    honour(s, 'demeter', 20, 'festival', 'your festival to Demeter', 10 * TICKS_PER_DAY);
    expect(moodOfGod(s, 'demeter')).toBe(20);
    // (Only Demeter: nobody else minds yet, rivalry is slice 53's.)
    expect(moodOfGod(s, 'zeus')).toBe(0);
    s.tick += 5 * TICKS_PER_DAY;
    expect(moodOfGod(s, 'demeter')).toBe(10);
    s.tick += 5 * TICKS_PER_DAY;
    expect(moodOfGod(s, 'demeter')).toBe(0);
    expect(s.gods.memories.demeter.length).toBe(1);
    s.tick = Math.ceil(s.tick / TICKS_PER_DAY) * TICKS_PER_DAY;
    stepGods(s);
    expect(s.gods.memories.demeter).toEqual([]);
  });

  it('merges an honour of the same kind and reason (what the old one is worth now, plus the new), from now', () => {
    const s = heaven(1000);
    const fade = 10 * TICKS_PER_DAY;
    honour(s, 'athena', 8, 'offering', 'your offerings of oil', fade);
    s.tick += 5 * TICKS_PER_DAY;
    honour(s, 'athena', 8, 'offering', 'your offerings of oil', fade);
    expect(s.gods.memories.athena).toEqual([{ kind: 'offering', why: 'your offerings of oil', amount: 12, tick: s.tick, fade }]);
    honour(s, 'athena', 5, 'offering', 'your offerings of olives', fade);
    honour(s, 'athena', -3, 'staged', 'your offerings of oil', fade);
    expect(s.gods.memories.athena.length).toBe(3);
    expect(moodOfGod(s, 'athena')).toBe(14);
  });

  it('is asserted: the memory of that kind and reason replaced, never stacked; 0 forgets it; a fade lets it lapse', () => {
    const s = heaven(1000);
    assert(s, 'poseidon', 'shrine', 'your shrines to Poseidon', 4);
    assert(s, 'poseidon', 'shrine', 'your shrines to Poseidon', 4);
    expect(moodOfGod(s, 'poseidon')).toBe(4);
    s.tick += TICKS_PER_MONTH;
    assert(s, 'poseidon', 'shrine', 'your shrines to Poseidon', 6);
    expect(s.gods.memories.poseidon).toEqual([{ kind: 'shrine', why: 'your shrines to Poseidon', amount: 6, tick: s.tick, fade: 0 }]);
    // (It never fades by itself.)
    s.tick += 10 * TICKS_PER_MONTH;
    expect(moodOfGod(s, 'poseidon')).toBe(6);
    assert(s, 'poseidon', 'shrine', 'your shrines to Poseidon', 0);
    expect(s.gods.memories.poseidon).toEqual([]);
    // Asserted monthly with two months' fade, it lapses once it stops.
    assert(s, 'poseidon', 'love', 'your quay is busy', 10, 2 * TICKS_PER_MONTH);
    s.tick += TICKS_PER_MONTH;
    assert(s, 'poseidon', 'love', 'your quay is busy', 10, 2 * TICKS_PER_MONTH);
    expect(moodOfGod(s, 'poseidon')).toBe(10);
    s.tick += 2 * TICKS_PER_MONTH;
    expect(moodOfGod(s, 'poseidon')).toBe(0);
  });

  it('is kept within -100 and 100, and so is any one memory', () => {
    const s = heaven();
    honour(s, 'hermes', 80, 'staged', 'one', 0);
    honour(s, 'hermes', 80, 'staged', 'two', 0);
    expect(moodOfGod(s, 'hermes')).toBe(100);
    honour(s, 'ares', -150, 'staged', 'tribute paid', 0);
    expect(s.gods.memories.ares[0].amount).toBe(-100);
    honour(s, 'ares', -50, 'staged', 'tribute paid', 0);
    expect(s.gods.memories.ares[0].amount).toBe(-100);
    expect(moodOfGod(s, 'ares')).toBe(-100);
    assert(s, 'zeus', 'staged', 'a great city', 300);
    expect(moodOfGod(s, 'zeus')).toBe(100);
  });

  it('keeps at most MEMORY_CAP memories, dropping what is worth least now', () => {
    const s = heaven();
    for (let i = 1; i <= MEMORY_CAP + 6; i++) honour(s, 'hera', i % 2 ? i : -i, 'staged', `reason ${i}`, 0);
    const list = s.gods.memories.hera;
    expect(list.length).toBe(MEMORY_CAP);
    expect(Math.min(...list.map((m) => Math.abs(m.amount)))).toBe(7);
  });

  it('names its reasons, the weightiest first either way, none worth nothing', () => {
    const s = heaven(1000);
    honour(s, 'demeter', 6, 'love', 'full granaries', 0);
    honour(s, 'demeter', 18, 'sanctuary', 'your sanctuary to Demeter', 0);
    honour(s, 'demeter', -9, 'rival', 'you honoured Zeus, her rival', 0);
    honour(s, 'demeter', 5, 'festival', 'long ago', 10);
    s.tick += 10;
    expect(reasonsOf(s, 'demeter').map((r) => [r.worth, r.why])).toEqual([
      [18, 'your sanctuary to Demeter'],
      [-9, 'you honoured Zeus, her rival'],
      [6, 'full granaries'],
    ]);
    expect(moodOfGod(s, 'demeter')).toBe(15);
    expect(reasonsOf(s, 'demeter')[0]).toMatchObject({ kind: 'sanctuary', fading: false });
  });
});

describe('the seven words', () => {
  it('go from furious to loving at the table’s thresholds', () => {
    const at: Array<[number, string]> = [
      [-100, 'furious'], [-61, 'furious'], [-60, 'angry'], [-31, 'angry'], [-30, 'displeased'], [-11, 'displeased'],
      [-10, 'watchful'], [0, 'watchful'], [9, 'watchful'], [10, 'pleased'], [29, 'pleased'], [30, 'warm'], [59, 'warm'], [60, 'loving'], [100, 'loving'],
    ];
    for (const [n, w] of at) expect([n, moodWord(n)]).toEqual([n, w]);
    expect(GOD_MOODS.map((m) => m.word)).toEqual(['furious', 'angry', 'displeased', 'watchful', 'pleased', 'warm', 'loving']);
    for (const m of GOD_MOODS) expect(moodWord(m.from)).toBe(m.word);
    expect([moodRank(-100), moodRank(0), moodRank(100)]).toEqual([0, 3, 6]);
    expect([moodAtLeast(30, 'warm'), moodAtLeast(29, 'warm'), moodAtLeast(100, 'warm'), moodAtLeast(-31, 'angry'), moodAtLeast(-61, 'angry')]).toEqual([true, false, true, true, false]);
  });
});

describe('noticed', () => {
  it('once the city has had 300 people, and never again unnoticed', () => {
    const s = heaven(500);
    s.population = NOTICE_PEOPLE - 1;
    stepGods(s);
    expect(noticed(s)).toBe(false);
    s.tick = 510;
    s.population = NOTICE_PEOPLE;
    stepGods(s);
    expect([noticed(s), s.gods.noticedAt]).toEqual([true, 510]);
    s.tick = 900;
    s.population = 12;
    stepGods(s);
    expect([noticed(s), s.gods.noticedAt]).toEqual([true, 510]);
  });

  it('not while the gods are off; switched on, a city big enough is noticed at once', () => {
    const s = new Sim().state;
    s.tick = 40;
    s.population = 900;
    stepGods(s);
    expect(noticed(s)).toBe(false);
    setGods(s, true);
    expect(s.gods.noticedAt).toBe(40);
  });
});

describe('the gods in a town', () => {
  it('are on in every demo as it opens (#town is noticed), off in a bare state', () => {
    const s = demoSim('town').state;
    expect(s.gods.on).toBe(true);
    expect(s.population).toBeGreaterThanOrEqual(NOTICE_PEOPLE);
    expect(noticed(s)).toBe(true);
    for (const g of GOD_IDS) expect(s.gods.memories[g]).toEqual([]);
    expect(new Sim().state.gods.on).toBe(false);
  });

  it('change nothing in a city that honours none of them: the same people, money and levels as with them off', () => {
    const on = demoSim('town');
    const off = new Sim();
    off.state = JSON.parse(JSON.stringify(on.state)) as SimState;
    off.state.gods.on = false;
    on.run(2 * TICKS_PER_MONTH);
    off.run(2 * TICKS_PER_MONTH);
    const a = on.state;
    const b = off.state;
    expect([a.population, a.money, a.buildings.map((x) => x.level)]).toEqual([b.population, b.money, b.buildings.map((x) => x.level)]);
    // (Slice 53: the gods' own news, of a mood crossing a word, is all the messages differ by.)
    const city = (s: SimState): string => JSON.stringify({ ...s, gods: null, messages: s.messages.log.filter((m) => m.kind !== 'gods').map((m) => [m.tick, m.kind, m.words]) });
    expect(city(a)).toBe(city(b));
  });

  it('a shrine’s god is saved; a god nobody knows is refused', () => {
    const s = demoSim('town').state;
    const shrine = s.buildings.find((b) => b.kind === 'shrine')!;
    shrine.god = 'demeter';
    honour(s, 'demeter', 12, 'shrine', 'your shrine to Demeter', 0);
    const text = encodeSave(s, 1);
    const back = decodeSave(text);
    if (!back.ok) throw new Error(back.why);
    expect(back.file.state.buildings.find((b) => b.id === shrine.id)!.god).toBe('demeter');
    expect(moodOfGod(back.file.state, 'demeter')).toBe(12);
    expect(encodeSave(back.file.state, 1)).toBe(text);
    const bad = JSON.parse(text);
    const raw = decodeSave(text);
    if (!raw.ok) throw new Error(raw.why);
    (raw.file.state.buildings.find((b) => b.id === shrine.id) as unknown as Record<string, unknown>).god = 'hades';
    expect(decodeSave(encodeSave(raw.file.state, 1)).ok).toBe(false);
    bad.state.gods = { on: true, noticedAt: -1, memories: {} };
    expect(decodeSave(JSON.stringify(bad)).ok).toBe(false);
  });

  it('a save from before the gods (version 47) loads with them on and watchful, noticed if it has 300 people, and plays on', () => {
    const s = demoSim('town').state;
    const old = JSON.parse(encodeSave(s, 1));
    old.state.version = 47; // (the version before this step: 47)
    delete old.state.gods;
    const got = decodeSave(JSON.stringify(old));
    if (!got.ok) throw new Error(got.why);
    const st = got.file.state;
    expect(st.version).toBe(SIM_STATE_VERSION);
    expect(st.gods.on).toBe(true);
    expect(st.gods.noticedAt).toBe(s.tick);
    for (const g of GOD_IDS) expect(st.gods.memories[g]).toEqual([]);
    expect(st.buildings.filter((b) => b.kind === 'shrine').every((b) => b.god === undefined)).toBe(true);
    const sim = new Sim();
    sim.state = st;
    sim.run(TICKS_PER_DAY);
    expect(st.tick).toBe(s.tick + TICKS_PER_DAY);
    expect(st.ledger.start + totals(st.ledger.now).net).toBe(st.money);
    // A smaller town isn't noticed yet.
    old.state.population = NOTICE_PEOPLE - 1;
    const small = decodeSave(JSON.stringify(old));
    if (!small.ok) throw new Error(small.why);
    expect(small.file.state.gods.noticedAt).toBe(-1);
  });
});
