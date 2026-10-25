/**
 * The town's messages (slice 44): the log keeps three years and at most 600,
 * pins last to go; every line Greece, the army and crime tell reaches it once
 * and never twice; the same town plays the same way with or without it; read
 * marks and pins move nothing else; and it is saved, and an older save loads
 * with an empty log.
 */
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { TICKS_PER_DAY } from '../src/sim/clock';
import { stepMessages } from '../src/sim/heard';
import { capWords, catOf, freshMessages, KEEP_TICKS, MAX_MESSAGES, messagesAt, NEWS, REPEAT_TICKS, say, titleFrom, titleOf, unread, WARNING, ALARM } from '../src/sim/messages';
import { migrate } from '../src/sim/migrate';
import { Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type SimState } from '../src/sim/state';
import { townLines } from '../src/sim/status';
import { FIRE_BURNING } from '../src/sim/hazards';
import { demoSim } from './prepared';
import { NEWS_KINDS, tellNews } from '../src/sim/crime';

const send = (sim: Sim, c: Parameters<Sim['enqueue']>[0]): void => {
  sim.enqueue(c);
  sim.flush();
};

/** Everything in the state but the log (and the count of commands applied, which a read mark adds to). */
const rest = (s: SimState): string => JSON.stringify({ ...s, messages: null, commandsApplied: 0 });

describe('the log', () => {
  it('caps the words, says the same words once within a few days, and titles a message by its first part', () => {
    const s = new Sim().state;
    const m = say(s, { kind: 'greece', words: `A longer piece of news: ${'and more '.repeat(80)}` })!;
    expect(m.words.length).toBeLessThanOrEqual(360);
    expect(m.words.endsWith('…')).toBe(true);
    expect(say(s, { kind: 'greece', words: m.words })).toBeNull();
    s.tick += REPEAT_TICKS + 1;
    expect(say(s, { kind: 'greece', words: m.words })).not.toBeNull();
    expect(titleOf(m)).toBe('A longer piece of news');
    expect(titleOf(say(s, { kind: 'raid', u: ALARM, words: 'Raiders! 35 of Sparta’s men are in at the west edge of your land, making for the granary.' })!)).toBe('Raiders! 35 of Sparta’s men are in at the west edge of your land');
    expect(capWords('  short  ')).toBe('short');
    // (A ruler's ask a week from due is titled by what waits, not by "Still waiting on you".)
    expect(titleFrom('Corinth asks for 200 wheat: answer within 5 days, on Corinth’s page')).toBe('Corinth asks for 200 wheat');
    // (A first part of only a few words goes on to the next stop. Review of slice 44.)
    expect(titleFrom('The merchant ship: her next call falls in winter, and the storms in the gulf will hold her back 8 days.')).toBe('The merchant ship: her next call falls in winter');
    expect(titleFrom('The ship from Athens: her next call falls in winter, and the storms will hold her back 3 days.')).toBe('The ship from Athens: her next call falls in winter');
    expect(titleFrom('The Lighthouse: the foundations are finished · the tower waits for its materials.')).toBe('The Lighthouse: the foundations are finished');
  });

  it('keeps three years and at most 600, the pinned ones last to go', () => {
    const s = new Sim().state;
    const first = say(s, { kind: 'greece', words: 'The first.' })!;
    first.pin = true;
    for (let i = 0; i < MAX_MESSAGES + 50; i++) {
      s.tick += 10;
      say(s, { kind: 'greece', words: `Line ${i}.` });
    }
    expect(s.messages.log.length).toBe(MAX_MESSAGES);
    expect(s.messages.log[0]).toBe(first);
    expect(s.messages.log[1].words).toBe('Line 51.');
    s.tick += KEEP_TICKS + 1;
    say(s, { kind: 'greece', words: 'Much later.' });
    expect(s.messages.log.map((m) => m.words)).toEqual(['The first.', 'Much later.']);
    // In tick order, always.
    expect(s.messages.next).toBe(MAX_MESSAGES + 53);
  });

  it('finds a place’s messages, newest first, and counts the unread by their most urgent', () => {
    const s = new Sim().state;
    say(s, { kind: 'fire', u: WARNING, words: 'Smoke.', at: { building: 7 } });
    s.tick += 50;
    say(s, { kind: 'fire', u: ALARM, words: 'Fire.', at: { building: 7 } });
    say(s, { kind: 'greece', words: 'Elsewhere.', at: { city: 'sparta' } });
    expect(messagesAt(s, { building: 7 }).map((m) => m.words)).toEqual(['Fire.', 'Smoke.']);
    expect(messagesAt(s, { city: 'sparta' }).length).toBe(1);
    expect(unread(s)).toEqual({ n: 3, u: ALARM });
    s.messages.log[1].read = true;
    expect(unread(s)).toEqual({ n: 2, u: WARNING });
  });
});

describe('the player’s marks', () => {
  it('read, pin, unpin and mark all read move nothing else in the town', () => {
    const sim = demoSim('raid');
    const s = sim.state;
    sim.run(30);
    expect(s.messages.log.length).toBeGreaterThan(10);
    const before = rest(s);
    const [a, b] = s.messages.log.slice(-2);
    send(sim, { type: 'messages', act: 'read', ids: [a.id] });
    send(sim, { type: 'messages', act: 'pin', ids: [b.id] });
    expect(a.read).toBe(true);
    expect(b.pin).toBe(true);
    send(sim, { type: 'messages', act: 'unpin', ids: [b.id] });
    expect(b.pin).toBeUndefined();
    send(sim, { type: 'messages', act: 'allread' });
    expect(unread(s).n).toBe(0);
    expect(rest(s)).toBe(before);
  });
});

/** Play a town on, noting every line pushed to Greece's, the army's and crime's news, as it is pushed. */
function playNoting(sim: Sim, ticks: number): { world: string[]; army: string[]; crime: string[]; quiet: string[] } {
  const s = sim.state;
  const seen = new Set<object>([...s.world.news, ...s.army.news, ...s.crime.news]);
  const out = { world: [] as string[], army: [] as string[], crime: [] as string[], quiet: [] as string[] };
  for (let i = 0; i < ticks; i++) {
    sim.step();
    for (const n of s.world.news) if (!seen.has(n)) (seen.add(n), (n.greece && !s.world.contact ? out.quiet : out.world).push(n.line));
    for (const n of s.army.news) if (!seen.has(n)) (seen.add(n), out.army.push(n.line));
    for (const n of s.crime.news) if (!seen.has(n)) (seen.add(n), out.crime.push(n.line));
  }
  return out;
}

describe('every news source, once each and never twice', () => {
  for (const [name, ticks] of [
    ['raid', 2400],
    ['empire', 1200],
  ] as const) {
    it(`#${name}, ${ticks} ticks on: each line of Greece’s, the army’s and crime’s news is one message`, () => {
      const sim = demoSim(name);
      const s = sim.state;
      const from = s.messages.next;
      const told = playNoting(sim, ticks);
      const said = s.messages.log.filter((m) => m.id >= from);
      const count = (line: string): number => said.filter((m) => m.words === capWords(`${line}.`)).length;
      expect(told.world.length + told.crime.length).toBeGreaterThan(10);
      // (A line told again in the same words within a few days, the army's copy of a blockade's, is the one message.)
      for (const line of told.world) expect(count(line), line).toBe(told.world.filter((x) => x === line).length);
      for (const line of told.crime) expect(count(line), line).toBeGreaterThanOrEqual(1);
      const lead = (t: string): string => t.replace(/ your (gate|wall)/, ' the $1').split(/[:,]/)[0];
      for (const line of told.army) expect(said.filter((m) => lead(m.words.replace(/\.$/, '')) === lead(line)).length, line).toBeGreaterThanOrEqual(1);
      // Never the same words twice within a few days.
      for (let i = 0; i < said.length; i++) for (let j = i + 1; j < said.length && said[j].tick - said[i].tick <= REPEAT_TICKS; j++) expect(said[j].words).not.toBe(said[i].words);
      // The watchers' too: a season begun, a ship or a caravan in.
      expect(said.some((m) => m.kind === 'season')).toBe(true);
      expect(said.some((m) => m.kind === 'ship' || m.kind === 'caravan')).toBe(true);
    }, 120000);
  }

  it('the band at your edge, a fire and a blockade taking station are alarms; the band gathering a warning', () => {
    const sim = demoSim('raid');
    const s = sim.state;
    playNoting(sim, 900);
    const log = s.messages.log;
    expect(log.find((m) => /^Raiders! /.test(m.words))?.u).toBe(ALARM);
    expect(log.find((m) => /^Raiders! /.test(m.words))?.at).toHaveProperty('tile');
    expect(log.find((m) => /raiders gather to march on your city/.test(m.words))?.u).toBe(WARNING);
    expect(log.find((m) => m.kind === 'fire' && /is burning/.test(m.words))?.u).toBe(ALARM);
    expect(log.find((m) => /raiders have gone/.test(m.words))?.u).toBe(NEWS);
    const e = demoSim('empire');
    playNoting(e, 600);
    expect(e.state.messages.log.find((m) => /hold the mouth of your harbour/.test(m.words))?.u).toBe(ALARM);
  }, 120000);
});

// Merge of slice 44 with slices 41 and 43.
describe('the other lines’ news', () => {
  it('crime’s news of every kind is one Crime message at its building: an arson an alarm; talk of burning, a gang gathering, taking its den or beating off a watchman warnings', () => {
    const sim = demoSim('crimes');
    const s = sim.state;
    const b = s.buildings.find((x) => x.kind === 'home')!;
    // (A tick each: crime keeps only its last few lines.)
    for (const k of NEWS_KINDS) {
      tellNews(s, k, `News of the kind ${k}`, b.id);
      sim.step();
    }
    stepMessages(s, sim.map);
    // (Merge of slice 45: a prison's unrest a warning, a breakout an alarm of its own kind, which may pop up.)
    const urgent: Record<string, number> = { arson: ALARM, talk: WARNING, gathering: WARNING, gang: WARNING, beaten: WARNING, unrest: WARNING, breakout: ALARM };
    for (const k of NEWS_KINDS) {
      const ms = s.messages.log.filter((m) => m.words === `News of the kind ${k}.`);
      expect(ms.length, k).toBe(1);
      expect(ms[0].kind).toBe(k === 'breakout' ? 'breakout' : 'crime');
      expect(catOf(ms[0].kind)).toBe('crime');
      expect(ms[0].u, k).toBe(urgent[k] ?? NEWS);
      expect(ms[0].at).toEqual({ building: b.id });
    }
  }, 60000);

  it('a colony’s news is an Empire message on its site, its ask a warning', () => {
    const sim = demoSim('colonywants');
    const s = sim.state;
    const ask = s.messages.log.find((m) => /^Nea Thasos asks you for \d+ wheat/.test(m.words));
    expect(ask?.kind).toBe('colony');
    expect(catOf(ask!.kind)).toBe('empire');
    expect(ask?.u).toBe(WARNING);
    expect(ask?.at).toEqual({ site: 'thasos' });
    send(sim, { type: 'colonyworks', act: 'want', site: 'thasos' });
    const sent = s.messages.log.find((m) => /^You send Nea Thasos the \d+ wheat it asked for/.test(m.words));
    expect(sent?.kind).toBe('colony');
    expect(sent?.u).toBe(NEWS);
    expect(sent?.at).toEqual({ site: 'thasos' });
  }, 60000);
});

describe('the log changes nothing else', () => {
  it('a town played with its log emptied every tick ends exactly as one played with it', () => {
    const a = demoSim('raid');
    const b = demoSim('raid');
    for (let i = 0; i < 600; i++) {
      a.step();
      b.step();
      b.state.messages = freshMessages(b.state.tick);
    }
    expect(rest(b.state)).toBe(rest(a.state));
  }, 60000);

  it('the same town and commands give the same log', () => {
    const a = demoSim('empire');
    const b = demoSim('empire');
    a.run(400);
    b.run(400);
    expect(JSON.stringify(b.state.messages)).toBe(JSON.stringify(a.state.messages));
  }, 60000);
});

describe('the lines under the top bar', () => {
  it('keep what the town is short of, and no news', () => {
    const sim = demoSim('raid');
    const news = ['ship', 'trader', 'greece', 'favour', 'raid', 'alarm', 'battle', 'empire', 'monument', 'ambition'];
    for (let i = 0; i < 30; i++) {
      sim.run(30);
      for (const l of townLines(sim.state, sim.map)) expect(news).not.toContain(l.need);
    }
  }, 60000);
});

describe('saves', () => {
  it('a town’s messages, read marks and pins come back from a save', () => {
    const sim = demoSim('raid');
    sim.run(60);
    const s = sim.state;
    s.messages.log[0].read = true;
    s.messages.log[1].pin = true;
    const d = decodeSave(encodeSave(s, 0));
    expect(d.ok).toBe(true);
    if (d.ok) expect(d.file.state.messages).toEqual(s.messages);
  });

  it('an older save loads with an empty log from its day, its old news counted as heard', () => {
    const sim = demoSim('empire');
    const s = sim.state;
    const old = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
    delete old.messages;
    // (A migration step's own test: a save from just before this slice, version 39 since its merge, whatever comes after.)
    old.version = 39;
    expect(migrate(old)).toBe(39);
    const st = old as unknown as SimState;
    expect(st.version).toBe(SIM_STATE_VERSION);
    expect(st.messages.log).toEqual([]);
    expect(st.messages.since).toBe(s.tick);
    // Played on a tick: nothing Greece, the army or crime told before is said again.
    const re = new Sim();
    re.state = st;
    re.step();
    const lines = new Set([...s.world.news, ...s.army.news, ...s.crime.news].map((n) => `${n.line}.`));
    expect(re.state.messages.log.some((m) => lines.has(m.words))).toBe(false);
  });

  it('a damaged log costs only the history', () => {
    const sim = demoSim('raid');
    const s = sim.state;
    const file = JSON.parse(encodeSave(s, 0));
    file.state.messages.log = 7;
    const d = decodeSave(JSON.stringify(file));
    expect(d.ok).toBe(true);
    if (d.ok) {
      expect(d.file.state.messages.log).toEqual([]);
      expect(d.file.state.messages.since).toBe(s.tick);
    }
  });
});

describe('the watchers', () => {
  it('a fact is said once while it stands, across a save too, and again once it stands anew', () => {
    const sim = demoSim('raid');
    const s = sim.state;
    const b = s.buildings.find((x) => x.kind === 'farm')!;
    const fires = (): number => s.messages.log.filter((m) => m.kind === 'fire' && m.at && 'building' in m.at && m.at.building === b.id && m.u === ALARM).length;
    const look = (n: number): void => {
      for (let i = 0; i < n; i++) {
        s.tick++;
        stepMessages(s, sim.map);
      }
    };
    expect(fires()).toBe(0);
    b.fire = FIRE_BURNING;
    b.fireAt = s.tick + 5 * TICKS_PER_DAY;
    look(20);
    expect(fires()).toBe(1);
    // Saved and loaded while it burns: not said again.
    const d = decodeSave(encodeSave(s, 0));
    expect(d.ok && d.file.state.messages.seen).toContain(`F${b.id}`);
    b.fire = 0;
    look(5);
    b.fire = FIRE_BURNING;
    look(5);
    expect(fires()).toBe(2);
  });
});
