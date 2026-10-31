/**
 * Slice 60: gods in war (src/sim/godwar.ts). A rival's patron god marching
 * with its band (said first, rising with it, striking your soldiers, setting
 * buildings alight, going home with it); a god who loves you called against
 * the band (the refusals, the blows, the band breaking sooner, leaving);
 * two gods fighting (the stronger love wins, a tie to the defender); the
 * nerve-breakers; determinism, saves and the migration.
 *
 * Every fight here is #battle's: #companies' town with Sparta's band (Ares is
 * Sparta's patron) on the road to the west edge. Moods are staged through
 * the groundwork's API (slice 53 makes them real). Slice 54's sanctuaries are
 * not on this line yet: `stageSanctuary` stands in a finished site record
 * (for the integrator: build a real finished sanctuary there instead).
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { TICKS_PER_DAY, TICKS_PER_YEAR } from '../src/sim/clock';
import { callRefusal, DUEL_TICKS, invaders, marchOf, sanctuaryStands, STYLES, warStatus, type Champion } from '../src/sim/godwar';
import { migrate } from '../src/sim/migrate';
import { freshWars, GOD_IDS, honour, type GodId } from '../src/sim/pantheon';
import { raidChip, raidersOf } from '../src/sim/raids';
import { deserialize, serialize, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type Raid, type SimState } from '../src/sim/state';
import { demoSim } from './prepared';

const made: Record<string, string> = {};
const fresh = (name: string): Sim => {
  if (!made[name]) made[name] = serialize(demoSim(name).state);
  const sim = new Sim();
  sim.state = deserialize(made[name]);
  return sim;
};
const until = (sim: Sim, ok: () => boolean, most: number): boolean => {
  for (let i = 0; i < most && !ok(); i++) sim.step();
  return ok();
};
const send = (sim: Sim, c: Parameters<Sim['enqueue']>[0]): void => {
  sim.enqueue(c);
  sim.flush();
};

/** A god's mood set for a test (staged, never fading). */
const mood = (s: SimState, g: GodId, n: number, why: string): void => honour(s, g, n, 'staged', why, 0);

/** A finished sanctuary to a god, as slice 54 records one (its site), standing in for the real one until it merges. */
function stageSanctuary(s: SimState, god: GodId): void {
  // (The monuments' daily sync forgets a site whose building isn't a monument: staged again just before each call.)
  if ((s.monuments.sites as unknown as Array<Record<string, unknown>>).some((x) => x.kind === 'sanctuary' && x.god === god)) return;
  const b = s.buildings.find((x) => x.kind === 'shrine') ?? s.buildings[0];
  (s.monuments.sites as unknown as Array<Record<string, unknown>>).push({ id: b.id, kind: 'sanctuary', stage: 3, building: false, work: 0, marked: 1, done: [1, 2, 3], finished: 3, god });
}

/** #battle's town, the gods on, Ares (Sparta's patron) as angry as given; its band, and its hoplites and archers. */
function battle(ares = -75): { sim: Sim; s: SimState; r: Raid } {
  const sim = fresh('battle');
  const s = sim.state;
  expect(s.gods.on).toBe(true);
  if (ares) mood(s, 'ares', ares, 'you paid tribute to Athens');
  const r = s.world.raids.find((x) => x.city === 'sparta' && x.ended === 0)!;
  return { sim, s, r };
}
/** Play on until the band is on your map. */
const inMap = (sim: Sim, r: Raid): void => {
  expect(until(sim, () => r.phase === 'raiding' && !!raidersOf(sim.state, r), 60 * TICKS_PER_DAY)).toBe(true);
};
/** The god marching with the band, risen and acting. */
const enemyRisen = (sim: Sim, r: Raid): boolean => {
  const m = marchOf(sim.state, r.id);
  const f = m ? sim.state.gods.walks.figures.find((o) => o.id === m.figure) : undefined;
  return !!f && f.state !== 'arriving';
};

describe('gods in war (slice 60)', () => {
  it('no god is at war in any demo’s town as it opens', () => {
    for (const name of ['town', 'battle', 'siege', 'empire']) expect(demoSim(name).state.gods.war).toEqual(freshWars());
  }, 600_000);

  it('a rival’s patron who is furious with you marches with the band, said first; on your map strikes your soldiers and burns; goes home with the beaten band', () => {
    const { sim, s, r } = battle();
    until(sim, () => !!marchOf(s, r.id), 2 * TICKS_PER_DAY);
    const m = marchOf(s, r.id)!;
    expect(m.god).toBe('ares');
    expect(m.figure).toBe(0);
    // Said as an alarm, naming the god and why, and on the band's chip.
    const said = s.messages.log.filter((x) => x.kind === 'godwar');
    expect(said[0].u).toBe(2);
    expect(said[0].words).toMatch(/^Ares marches with Sparta’s raiders: he is furious with you \(you paid tribute to Athens\)/);
    expect(raidChip(s, r)!.chip).toMatch(/· Ares with them$/);
    expect(raidChip(s, r)!.line).toMatch(/Ares marches with them: he is furious with you: you paid tribute to Athens$/);
    // Your hoplites in the band's way, and the band on your map: Ares rises among them.
    const hop = s.army.companies.find((c) => c.kind === 'hoplite')!;
    send(sim, { type: 'banner', company: hop.id, tile: 41 * 128 + 40 });
    inMap(sim, r);
    expect(until(sim, () => enemyRisen(sim, r), 3 * TICKS_PER_DAY)).toBe(true);
    const f = s.gods.walks.figures.find((o) => o.id === m.figure)!;
    expect(f.why).toBe('foe');
    expect(warStatus(s, f)!.detail).toMatch(/Ares marches with Sparta: he is furious with you \(you paid tribute to Athens\)/);
    expect(warStatus(s, f)!.detail).toMatch(/Your soldiers can’t hurt him/);
    // He fights until the band breaks or leaves, striking soldiers (some fall to him) and setting buildings alight; nobody hurts him.
    const men0 = s.army.soldiers.filter((x) => x.state === 'ready').length;
    expect(until(sim, () => !s.gods.walks.figures.includes(f), 120 * TICKS_PER_DAY)).toBe(true);
    expect(m.felled).toBeGreaterThan(0);
    expect(s.army.soldiers.filter((x) => x.state === 'ready').length).toBeLessThan(men0);
    expect(s.army.news.some((n) => / fell fighting Ares\b/.test(n.line))).toBe(true);
    expect(m.fires).toBeGreaterThan(0);
    const gone = s.messages.log.filter((x) => x.kind === 'godwar').pop()!;
    expect(gone.words).toMatch(/^Ares goes home/);
    expect(s.gods.war.marches).toEqual([]);
  }, 300_000);

  it('no god marches with the gods switched off, nor one only displeased; one calmed before the band comes stays home, and says so', () => {
    const off = battle();
    send(off.sim, { type: 'gods', on: false });
    off.sim.run(3 * TICKS_PER_DAY);
    expect(off.s.gods.war.marches).toEqual([]);
    const mild = battle(-25);
    mild.sim.run(3 * TICKS_PER_DAY);
    expect(mild.s.gods.war.marches).toEqual([]);
    const { sim, s, r } = battle();
    until(sim, () => !!marchOf(s, r.id), 2 * TICKS_PER_DAY);
    expect(marchOf(s, r.id)).toBeDefined();
    mood(s, 'ares', 50, 'your offerings of armour');
    sim.run(2 * TICKS_PER_DAY);
    expect(marchOf(s, r.id)).toBeUndefined();
    expect(s.messages.log.filter((x) => x.kind === 'godwar').pop()!.words).toMatch(/^Ares no longer marches with Sparta’s raiders: he is only displeased with you now\.$/);
  }, 300_000);

  it('a god can be called only if loving, with a finished sanctuary, against invaders on your map, once a year', () => {
    const { sim, s, r } = battle(0);
    expect(callRefusal(s, 'athena')).toMatch(/^Athena is only watchful towards you/);
    mood(s, 'athena', 80, 'your olive groves and your court');
    expect(callRefusal(s, 'athena')).toMatch(/no finished sanctuary/);
    stageSanctuary(s, 'athena');
    expect(sanctuaryStands(s, 'athena')).toBe(true);
    expect(callRefusal(s, 'athena')).toBe('No invaders are on your land to fight');
    inMap(sim, r);
    stageSanctuary(s, 'athena');
    expect(callRefusal(s, 'athena')).toBe('');
    stageSanctuary(s, 'athena');
    send(sim, { type: 'callgod', god: 'athena' });
    const f = s.gods.walks.figures.find((o) => o.god === 'athena')!;
    expect(f.why).toBe('champion');
    expect(callRefusal(s, 'athena')).toBe('Athena is fighting for you already');
    // Risen beside the danger, not on top of it, and said.
    const w = raidersOf(s, r)!;
    expect(s.messages.log.filter((x) => x.kind === 'godwar').pop()!.words).toMatch(/^Athena answers your call and rises beside Sparta’s raiders/);
    expect(Math.hypot(f.x - w.path[w.seg * 2], f.z - w.path[w.seg * 2 + 1])).toBeLessThan(8);
    // She fights until the band breaks; then she leaves; and won't come again within the year.
    const c = s.gods.war.champions[0] as Champion;
    expect(until(sim, () => !s.gods.walks.figures.includes(f), 40 * TICKS_PER_DAY)).toBe(true);
    expect(c.felled).toBeGreaterThan(0);
    expect(r.broke).toBe(true);
    // (A band with a god upon it breaks at a third of its men fallen, not half.)
    expect(r.fallen).toBeLessThan(r.men / 2 + 1);
    expect(s.world.news.some((n) => /raiders break and run for the west edge: Athena /.test(n.line))).toBe(true);
    expect(callRefusal(s, 'athena')).toMatch(/^Athena fought for you on .*: she will answer again from /);
    sim.run(TICKS_PER_YEAR);
    expect(callRefusal(s, 'athena')).not.toMatch(/fought for you/);
  }, 300_000);

  it('the same town, the same call and the same duel play out the same', () => {
    const play = (): string => {
      const { sim, s, r } = battle(-70);
      mood(s, 'athena', 80, 'your olive groves');
      stageSanctuary(s, 'athena');
      inMap(sim, r);
      until(sim, () => enemyRisen(sim, r), 3 * TICKS_PER_DAY);
      stageSanctuary(s, 'athena');
    send(sim, { type: 'callgod', god: 'athena' });
      sim.run(8 * TICKS_PER_DAY);
      return serialize(s);
    };
    expect(play()).toBe(play());
  }, 300_000);

  it('two gods fight until the weaker withdraws: the stronger love wins, a tie goes to yours; a beaten enemy god’s band breaks', () => {
    for (const [love, anger, wins] of [
      [80, -70, 'athena'],
      [62, -90, 'ares'],
      [75, -75, 'athena'],
    ] as Array<[number, number, GodId]>) {
      const { sim, s, r } = battle(anger);
      mood(s, 'athena', love, 'your olive groves');
      stageSanctuary(s, 'athena');
      inMap(sim, r);
      expect(until(sim, () => enemyRisen(sim, r), 3 * TICKS_PER_DAY)).toBe(true);
      stageSanctuary(s, 'athena');
    send(sim, { type: 'callgod', god: 'athena' });
      expect(until(sim, () => !!s.gods.war.duel, 10 * TICKS_PER_DAY)).toBe(true);
      const d = s.gods.war.duel!;
      const a = s.gods.walks.figures.find((o) => o.id === d.a)!;
      const b = s.gods.walks.figures.find((o) => o.id === d.b)!;
      expect([a.god, b.god]).toEqual(['athena', 'ares']);
      expect(a.state).toBe('fighting');
      expect(warStatus(s, a)!.detail).toMatch(new RegExp(`Athena’s love \\(${love}\\) against Ares’ anger \\(${-anger}\\): ${wins === 'athena' ? 'Athena' : 'Ares'} will win`));
      expect(until(sim, () => !s.gods.war.duel, DUEL_TICKS + 2)).toBe(true);
      const loser = wins === 'athena' ? b : a;
      const winner = wins === 'athena' ? a : b;
      expect(loser.state).toBe('leaving');
      expect(winner.state).not.toBe('leaving');
      expect(r.broke).toBe(wins === 'athena');
      expect(s.gods.war.strikes.some((k) => k.kind === 'clash')).toBe(true);
    }
  }, 600_000);

  it('Aphrodite doesn’t fight: she breaks the band’s nerve, and it runs without a man struck by her', () => {
    const { sim, s, r } = battle(0);
    mood(s, 'aphrodite', 80, 'your happy homes');
    stageSanctuary(s, 'aphrodite');
    inMap(sim, r);
    stageSanctuary(s, 'aphrodite');
    send(sim, { type: 'callgod', god: 'aphrodite' });
    expect(STYLES.aphrodite.hurt).toBe(0);
    expect(until(sim, () => r.broke, 30 * TICKS_PER_DAY)).toBe(true);
    const c = s.gods.war.champions.find((x) => x.god === 'aphrodite') ?? ({ nerve: 5, felled: 0 } as Champion);
    expect(c.felled).toBe(0);
    expect(s.world.news.some((n) => /Aphrodite has broken their nerve/.test(n.line))).toBe(true);
  }, 300_000);

  it('a save mid-duel opens again the same town; the migration step fills only the war, only where it is missing', () => {
    const { sim, s, r } = battle(-70);
    mood(s, 'athena', 80, 'your olive groves');
    stageSanctuary(s, 'athena');
    inMap(sim, r);
    until(sim, () => enemyRisen(sim, r), 3 * TICKS_PER_DAY);
    stageSanctuary(s, 'athena');
    send(sim, { type: 'callgod', god: 'athena' });
    until(sim, () => !!s.gods.war.duel, 10 * TICKS_PER_DAY);
    sim.run(3);
    const back = decodeSave(encodeSave(s, 1));
    if (!back.ok) throw new Error(back.why);
    expect(JSON.stringify(back.file.state)).toBe(JSON.stringify(s));
    expect(invaders(back.file.state).length).toBe(1);
    // The step itself, on a state from before it.
    const old = JSON.parse(JSON.stringify(demoSim('town').state));
    delete old.gods.war;
    old.version = SIM_STATE_VERSION - 1;
    expect(migrate(old)).toBe(SIM_STATE_VERSION - 1);
    expect(old.version).toBe(SIM_STATE_VERSION);
    expect(old.gods.war).toEqual(freshWars());
    const kept = JSON.parse(JSON.stringify(demoSim('town').state));
    kept.gods.war.next = 9;
    kept.version = SIM_STATE_VERSION - 1;
    migrate(kept);
    expect(kept.gods.war.next).toBe(9);
    // A groundwork save (state 48) loads with no god at war.
    const got = decodeSave(gunzipSync(readFileSync('tests/fixtures/groundwork-town.save.json.gz')).toString());
    if (!got.ok) throw new Error(got.why);
    expect(got.file.state.gods.war).toEqual(freshWars());
  }, 300_000);

  it('every god has a way to fight', () => {
    for (const g of GOD_IDS) {
      const st = STYLES[g];
      expect(st.range).toBeGreaterThan(0);
      expect(st.every).toBeGreaterThan(0);
      expect(st.hurt > 0 || st.nerve).toBe(true);
    }
  });
});
