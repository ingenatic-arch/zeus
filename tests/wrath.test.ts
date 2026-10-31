/**
 * Wrath (slice 57): no omen before the city is noticed or with wrath's switch
 * off; an angry god's omen a month ahead, naming the god, the curse, the day
 * and the reasons; one omen at a time; turned when the god is lifted past
 * angry (and never landing then); a curse never lands before its omen's
 * month; every curse lands on a prepared town and does what it says;
 * determinism; the migration and a save round-trip.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import { bake } from '../scripts/bake';
import { decodeSave, encodeSave } from '../src/game/saves';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { migrate } from '../src/sim/migrate';
import { curseNow, godCrime, godMood, godPace, honour, moodOfGod, type CurseId } from '../src/sim/pantheon';
import { SIM_STATE_VERSION, type SimState } from '../src/sim/state';
import { worship } from '../src/sim/worship';
import { beginOmen, CURSES, GOD_CURSES, OMEN_LEAD, omenOf, stepWrath } from '../src/sim/wrath';
import { demoSim } from './prepared';

const wrathOf = (s: SimState) => s.gods.wrath;
const said = (s: SimState, from: number) => s.messages.log.filter((m) => m.id >= from && m.kind === 'wrath');

/** #richtown, the gods and their wrath on (it is noticed: about 900 people). */
function rich() {
  const sim = demoSim('richtown');
  sim.enqueue({ type: 'gods', on: true });
  sim.enqueue({ type: 'wrath', on: true });
  sim.flush();
  return sim;
}

describe('omens', () => {
  it('an angry god warns a month ahead, naming the curse, the day and the reasons', () => {
    const sim = rich();
    const s = sim.state;
    const m0 = s.messages.next;
    honour(s, 'athena', -45, 'staged', 'you laughed at her owl', 0);
    sim.run(2 * TICKS_PER_DAY);
    const o = omenOf(s, 'athena')!;
    expect(o).toBeTruthy();
    expect(GOD_CURSES.athena).toContain(o.curse);
    expect(o.day - o.at).toBe(OMEN_LEAD);
    const m = said(s, m0)[0];
    expect(m.u).toBe(2);
    expect(m.words).toContain('Athena is angry');
    expect(m.words).toContain('you laughed at her owl');
    expect(m.words).toMatch(/in a month/);
    expect(wrathOf(s).omens).toHaveLength(1);
  });

  it('nothing with wrath’s switch off, before the city is noticed, or for a god above angry', () => {
    const sim = rich();
    const s = sim.state;
    honour(s, 'zeus', -25, 'staged', 'displeased only', 0);
    sim.run(3 * TICKS_PER_DAY);
    expect(wrathOf(s).omens).toHaveLength(0);
    sim.enqueue({ type: 'wrath', on: false });
    sim.flush();
    honour(s, 'zeus', -30, 'staged', 'furious now', 0);
    sim.run(3 * TICKS_PER_DAY);
    expect(wrathOf(s).omens).toHaveLength(0);
    sim.enqueue({ type: 'wrath', on: true });
    sim.flush();
    s.gods.noticedAt = -1;
    s.population = 100;
    stepWrath(s, sim.map, () => undefined);
    expect(wrathOf(s).omens).toHaveLength(0);
  });

  it('one omen at a time in the city', () => {
    const sim = rich();
    const s = sim.state;
    honour(s, 'athena', -50, 'staged', 'angry', 0);
    honour(s, 'demeter', -50, 'staged', 'angry', 0);
    sim.run(5 * TICKS_PER_DAY);
    expect(wrathOf(s).omens).toHaveLength(1);
  });

  it('lifted past angry, the god is appeased and the curse never lands', () => {
    const sim = rich();
    const s = sim.state;
    honour(s, 'demeter', -35, 'staged', 'angry', 0);
    sim.run(2 * TICKS_PER_DAY);
    expect(omenOf(s, 'demeter')?.curse).toBe('blight');
    const m0 = s.messages.next;
    worship(s, 'demeter', 15, 'festival', 'your festival to Demeter', TICKS_PER_MONTH * 12);
    expect(moodOfGod(s, 'demeter')).toBeGreaterThanOrEqual(-30);
    sim.run(2 * TICKS_PER_DAY);
    expect(omenOf(s, 'demeter')).toBeUndefined();
    expect(said(s, m0).map((m) => m.title)).toContain('Demeter is appeased');
    sim.run(OMEN_LEAD + 5 * TICKS_PER_DAY);
    expect(curseNow(s, 'blight')).toBeUndefined();
  });

  it('a curse never lands before its month is out', () => {
    const sim = rich();
    const s = sim.state;
    honour(s, 'demeter', -50, 'staged', 'angry', 0);
    sim.run(TICKS_PER_DAY);
    const o = omenOf(s, 'demeter')!;
    sim.run(o.day - s.tick - TICKS_PER_DAY);
    expect(curseNow(s, 'blight')).toBeUndefined();
    sim.run(2 * TICKS_PER_DAY);
    expect(curseNow(s, 'blight')).toBeTruthy();
    expect(godPace(s, 'farm')).toBeLessThan(1);
  });
});

describe('curses', () => {
  const checks: Partial<Record<CurseId, (s: SimState, before: SimState) => void>> = {
    lightning: (s) => expect(s.buildings.filter((b) => b.fire === 2).length).toBeGreaterThan(0),
    earthquake: (s, b) => expect(s.buildings.filter((x) => x.kind === 'rubble').length).toBeGreaterThan(b.buildings.filter((x) => x.kind === 'rubble').length),
    quarrels: (s, b) => expect(s.left).toBeGreaterThan(b.left),
    heartbreak: (s, b) => {
      expect(s.left).toBeGreaterThan(b.left);
      expect(godMood(s)?.w).toBe(-2);
    },
    blight: (s) => expect(godPace(s, 'farm')).toBe(0.25),
    olives: (s) => expect(godPace(s, 'grove')).toBe(0),
    plague: (s) => expect(s.health.outbreak).toBeTruthy(),
    herds: (s, b) => expect(s.herds.reduce((a, h) => a + h.head, 0)).toBeLessThan(b.herds.reduce((a, h) => a + h.head, 0)),
    forge: (s) => expect(s.buildings.filter((b) => b.fire === 2).length).toBeGreaterThan(0),
    thieves: (s) => expect(godCrime(s)).toBe(2),
    riot: (s, b) => expect(s.crime.broken.length).toBeGreaterThan(b.crime.broken.length),
  };
  for (const c of Object.keys(CURSES) as CurseId[]) {
    it(`${c} lands, says what it did, and does it`, () => {
      const sim = rich();
      const s = sim.state;
      const C = CURSES[c];
      honour(s, C.god, -50, 'staged', 'angry', 0);
      const o = beginOmen(s, sim.map, C.god, c, 3 * TICKS_PER_DAY);
      // (Brawls want a barracks, which #richtown hasn't: it can't be aimed there.)
      if (c === 'brawls') {
        expect(o).toBeNull();
        return;
      }
      expect(o).toBeTruthy();
      const before = structuredClone(s);
      const m0 = s.messages.next;
      sim.run(4 * TICKS_PER_DAY);
      expect(omenOf(s, C.god)).toBeUndefined();
      const landed = said(s, m0).find((m) => (m.title ?? '').endsWith('wrath'));
      expect(landed?.words.length ?? 0).toBeGreaterThan(20);
      if (C.monster) expect(s.legends.monsters.some((m) => m.kind === C.monster)).toBe(true);
      checks[c]?.(s, before);
      expect(s.ledger.start + s.ledger.now.reduce((a, l) => a + l.amount, 0)).toBe(s.money);
    });
  }
});

describe('determinism and saves', () => {
  it('the same town and anger choose the same curse, aim and day, and land the same', () => {
    const run = () => {
      const sim = rich();
      honour(sim.state, 'poseidon', -50, 'staged', 'angry', 0);
      sim.run(2 * TICKS_PER_DAY);
      const o = { ...omenOf(sim.state, 'poseidon')! };
      sim.run(OMEN_LEAD + 2 * TICKS_PER_DAY);
      return { o, people: sim.state.population, money: sim.state.money, n: sim.state.buildings.length, tiles: sim.state.tiles.join(',') };
    };
    expect(run()).toEqual(run());
  });

  it('a version 52 state gets its record of wrath, on with the gods', () => {
    const sim = rich();
    const st = JSON.parse(JSON.stringify(sim.state));
    delete st.gods.wrath;
    st.version = SIM_STATE_VERSION - 1;
    expect(migrate(st)).toBe(SIM_STATE_VERSION - 1);
    expect(st.version).toBe(SIM_STATE_VERSION);
    expect(st.gods.wrath).toEqual({ on: true, omens: [], spells: [], asked: {}, given: {}, cursed: {} });
  });

  it('a groundwork save (state 48) and a phase 6 save (state 47) load, wrath on with the gods, and play on', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/groundwork-town.save.json.gz')).toString();
    for (const strip of [false, true]) {
      let t = text;
      if (strip) {
        const file = JSON.parse(t);
        expect(file.state.version).toBe(48);
        delete file.state.gods;
        file.state.version = 47;
        t = JSON.stringify(file);
      }
      const got = decodeSave(t);
      if (!got.ok) throw new Error(got.why);
      const s = got.file.state;
      expect(s.version).toBe(SIM_STATE_VERSION);
      expect(s.gods.wrath).toEqual({ on: s.gods.on, omens: [], spells: [], asked: {}, given: {}, cursed: {} });
      const sim = new Sim();
      sim.state = s;
      sim.run(TICKS_PER_MONTH);
      expect(s.gods.wrath.omens).toHaveLength(0);
    }
  });

  it('the three demos keep as saves (a god come in wrath too), and a broken record of wrath is refused plainly', () => {
    for (const n of ['omen', 'blessing', 'wrath']) expect(bake(n), n).toBeTruthy();
    const file = JSON.parse(bake('wrath')!);
    const st = decodeSave(JSON.stringify(file));
    expect(st.ok && st.file.state.gods.walks.figures.some((f) => f.why === 'wrath')).toBe(true);
    const sim = rich();
    honour(sim.state, 'athena', -50, 'staged', 'angry', 0);
    beginOmen(sim.state, sim.map, 'athena', 'medusa');
    const broken = JSON.parse(JSON.stringify(sim.state));
    broken.gods.wrath.omens[0].curse = 'locusts';
    const d = decodeSave(encodeSave(broken, 0));
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.why).toMatch(/blessings and wrath/);
  }, 1200000);

  it('a save round-trip keeps an omen running and a curse in force', () => {
    const sim = rich();
    const s = sim.state;
    honour(s, 'hermes', -50, 'staged', 'angry', 0);
    beginOmen(s, sim.map, 'hermes', 'thieves', 2 * TICKS_PER_DAY);
    sim.run(3 * TICKS_PER_DAY);
    honour(s, 'athena', -50, 'staged', 'angry', 0);
    beginOmen(s, sim.map, 'athena', 'olives');
    const d = decodeSave(encodeSave(s, 0));
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.file.state.gods.wrath).toEqual(s.gods.wrath);
    expect(curseNow(d.file.state, 'thieves')).toBeTruthy();
  });
});
