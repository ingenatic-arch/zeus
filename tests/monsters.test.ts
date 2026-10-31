/**
 * Monsters at the gates (slice 55): a lair for every monster on every kind of
 * land, the warning before it is named, raids that reach their targets and
 * come home, a company that wounds a monster and drives it back (it never
 * dies to soldiers), a god who calls it home, the same raid from the same
 * seed, and saves with monsters in them and from before them.
 */
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { WATER_SEA } from '../src/map/bake';
import { roadsIn } from '../src/map/landcheck';
import { LAND_KINDS, LAND_SIZES, seedOf } from '../src/map/lands';
import { Ground, mapIndex } from '../src/sim/build';
import { around, findBuilding } from '../src/sim/buildings';
import { TICKS_PER_DAY } from '../src/sim/clock';
import { BREAK_AT, HEAL, LAIR_ROOM, lairFor, lairSpot, monsterAt, MAKES, sendMonster, slayMonster, STIR, type Beast } from '../src/sim/monsters';
import { honour, MONSTER_IDS, MONSTERS } from '../src/sim/pantheon';
import { bandsAt } from '../src/sim/raids';
import { Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type SimState } from '../src/sim/state';
import { walkable } from '../src/sim/wild';
import { demoSim } from './prepared';

/** Play until `done` (at most `most` ticks); true if it came true. */
function until(sim: Sim, done: () => boolean, most: number): boolean {
  for (let i = 0; i < most; i++) {
    if (done()) return true;
    sim.step();
  }
  return done();
}

const words = (s: SimState, since = 0): string[] => s.messages.log.filter((m) => m.kind === 'monster' && m.tick >= since).map((m) => m.words);

describe('lairs', () => {
  it('every monster finds one on every kind of land at every size: open ground, away from buildings, reachable from the road in', () => {
    for (const kind of LAND_KINDS.filter((k) => k !== 'bay')) {
      for (const size of LAND_SIZES) {
        const sim = new Sim();
        sim.found({ kind, size, seed: seedOf('lair') });
        const road = roadsIn(sim.map, sim.state).road;
        if (road.length) {
          sim.enqueue({ type: 'road', tiles: road });
          sim.flush();
        }
        const s = sim.state;
        const map = sim.map;
        const n = map.size;
        for (const k of MONSTER_IDS) {
          const lair = lairFor(map, s, k);
          expect(lair, `${k} on a ${size} ${kind}`).not.toBeNull();
          const t = lair!.tile;
          expect(walkable(map, s, t)).toBe(true);
          for (const b of s.buildings) {
            const d = Math.max(Math.abs(b.x - (t % n)), Math.abs(b.z - Math.floor(t / n)));
            expect(d).toBeGreaterThanOrEqual(LAIR_ROOM - 3);
          }
        }
      }
    }
  }, 300_000);

  it('on the Bay each takes its own kind of ground: a cave by steep ground, a marsh by the river, a den by the sea', () => {
    const sim = demoSim('town');
    const s = sim.state;
    const map = sim.map;
    const n = map.size;
    const g = mapIndex(map).ground;
    const near = (t: number, ok: (u: number) => boolean): boolean => {
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (ok(t + dz * n + dx)) return true;
      return false;
    };
    const cave = lairFor(map, s, 'medusa')!;
    const marsh = lairFor(map, s, 'hydra')!;
    const shore = lairFor(map, s, 'cyclops')!;
    expect([cave.den, marsh.den, shore.den]).toEqual(['cave', 'marsh', 'shore']);
    expect(near(cave.tile, (u) => g[u] === Ground.Steep)).toBe(true);
    expect(near(marsh.tile, (u) => g[u] === Ground.Water && map.tileWater[u] !== WATER_SEA)).toBe(true);
    expect(near(shore.tile, (u) => map.tileWater[u] === WATER_SEA)).toBe(true);
  });
});

describe('a monster sent', () => {
  it('is seen first (neither it nor its god named), settles in days later named with its god and why, and each raid is announced a day before', () => {
    const sim = demoSim('town');
    const s = sim.state;
    const t0 = s.tick;
    const m = sendMonster(s, 'boar', 'you hunted her herds thin')!;
    expect(m).not.toBeNull();
    expect(sendMonster(s, 'boar', 'again')).toBeNull();
    const first = words(s, t0);
    expect(first).toHaveLength(1);
    expect(first[0]).not.toMatch(/Boar|Artemis/);
    expect(first[0]).toMatch(/something (vast|huge)/i);
    expect(until(sim, () => m.state === 'lair', 60 * TICKS_PER_DAY)).toBe(true);
    expect(s.tick - t0).toBeGreaterThanOrEqual(4 * TICKS_PER_DAY);
    const settled = s.messages.log.find((x) => x.kind === 'monster' && x.of === 'settled')!;
    expect(settled.words).toMatch(/Calydonian Boar/);
    expect(settled.words).toMatch(/Artemis sent it: you hunted her herds thin/);
    expect(settled.words).toMatch(/only a hero can slay it/);
    expect(until(sim, () => m.state === 'raiding', 60 * TICKS_PER_DAY)).toBe(true);
    const stir = s.messages.log.find((x) => x.of === 'stirring')!;
    const out = s.messages.log.find((x) => x.of === 'raid')!;
    expect(out.tick - stir.tick).toBeGreaterThanOrEqual(STIR);
    expect(stir.words).toMatch(/the Boar is stirring/i);
  });

  it('raids: walkers near it run indoors, it reaches its target, wrecks it, and goes home to its lair', () => {
    const sim = demoSim('town');
    const s = sim.state;
    const m = sendMonster(s, 'minotaur', 'a test')!;
    until(sim, () => m.state === 'lair', 60 * TICKS_PER_DAY);
    m.next = s.tick + 1;
    sim.step();
    sim.step();
    expect(m.state).toBe('raiding');
    const target = findBuilding(s, m.target)!;
    expect(target.kind).toBe('home');
    expect(bandsAt(s)).toEqual(expect.arrayContaining([m.x, m.z]));
    const people = s.population;
    expect(until(sim, () => m.wait > 0, 90 * TICKS_PER_DAY)).toBe(true);
    // At its target: beside it.
    expect(around(sim.map.size, target).some((t) => Math.abs((t % sim.map.size) + 0.5 - m.x) < 1.5 && Math.abs(Math.floor(t / sim.map.size) + 0.5 - m.z) < 1.5)).toBe(true);
    expect(until(sim, () => m.state === 'lair', 90 * TICKS_PER_DAY)).toBe(true);
    expect(findBuilding(s, target.id)).toBeUndefined();
    expect(m.raids).toBe(1);
    expect(m.lastWords).toMatch(/wrecked the house of/);
    expect(m.killed).toBeGreaterThan(0);
    expect(s.population).toBeLessThan(people);
    const spot = lairSpot(s, m);
    expect([m.x, m.z]).toEqual([spot.x, spot.z]);
    expect(words(s).some((w) => /turns back for his cave/.test(w))).toBe(true);
  });

  it('Medusa turns walkers in her gaze to stone, and a stone figure stands where they were', () => {
    const sim = demoSim('town');
    const s = sim.state;
    const m = sendMonster(s, 'medusa', 'a test')!;
    until(sim, () => m.state === 'lair', 60 * TICKS_PER_DAY);
    m.next = s.tick + 1;
    until(sim, () => s.legends.stones.length > 0 || m.state === 'lair' && m.raids > 0, 120 * TICKS_PER_DAY);
    expect(s.legends.stones.length).toBeGreaterThan(0);
    expect(words(s).some((w) => /turned them to stone/.test(w))).toBe(true);
  });
});

describe('against the army', () => {
  it('a company of hoplites wounds it and drives it back at a cost in men; it heals a season with no raid, and never dies to soldiers', () => {
    const sim = demoSim('companies');
    const s = sim.state;
    const n = sim.map.size;
    const m = sendMonster(s, 'cyclops', 'a test')!;
    until(sim, () => m.state === 'lair', 60 * TICKS_PER_DAY);
    m.next = s.tick + 1;
    sim.step();
    sim.step();
    const target = findBuilding(s, m.target)!;
    const hop = s.army.companies.find((c) => c.kind === 'hoplite')!;
    const tile = around(n, target).find((t) => walkable(sim.map, s, t))!;
    sim.enqueue({ type: 'banner', company: hop.id, tile });
    let least = m.hp;
    let fought = false;
    const broke = until(
      sim,
      () => {
        least = Math.min(least, m.hp);
        fought ||= m.foe > 0 && s.army.foes.some((f) => f.raid === -m.id && f.state === 'fight');
        return m.broke;
      },
      120 * TICKS_PER_DAY,
    );
    expect(fought).toBe(true);
    expect(broke).toBe(true);
    expect(m.hp).toBeLessThan(m.full * BREAK_AT);
    expect(least).toBeGreaterThanOrEqual(1);
    expect(m.men).toBeGreaterThan(0);
    expect(words(s).some((w) => /badly wounded and breaks off/.test(w))).toBe(true);
    expect(s.army.foes.some((f) => f.raid === -m.id)).toBe(false);
    expect(until(sim, () => m.state === 'healing', 90 * TICKS_PER_DAY)).toBe(true);
    const healing = s.tick;
    const raids = m.raids;
    expect(until(sim, () => m.state !== 'healing', HEAL + TICKS_PER_DAY)).toBe(true);
    expect(s.tick - healing).toBeGreaterThanOrEqual(HEAL - 1);
    expect(m.raids).toBe(raids);
    expect(m.state).toBe('lair');
    expect(m.hp).toBe(m.full);
    expect(s.legends.monsters).toContain(m);
  });
});

describe('against archers (the review)', () => {
  it('archers shooting it from out of its reach are charged and struck down: no free shots', () => {
    const sim = demoSim('companies');
    const s = sim.state;
    const n = sim.map.size;
    const m = sendMonster(s, 'boar', 'a test')!;
    until(sim, () => m.state === 'lair', 60 * TICKS_PER_DAY);
    m.next = s.tick + 400 * TICKS_PER_DAY;
    const spot = lairSpot(s, m);
    // (Their banner seven tiles from its lair: beyond where it guards, within a bow's shot.)
    let tile = -1;
    for (let a = 0; a < 64 && tile < 0; a++) {
      const t = Math.floor(spot.z + 7 * Math.sin(a / 10)) * n + Math.floor(spot.x + 7 * Math.cos(a / 10));
      if (walkable(sim.map, s, t)) tile = t;
    }
    const arc = s.army.companies.find((c) => c.kind === 'archer')!;
    sim.enqueue({ type: 'banner', company: arc.id, tile });
    let least = m.hp;
    until(
      sim,
      () => {
        least = Math.min(least, m.hp);
        return m.men >= 3;
      },
      20 * TICKS_PER_DAY,
    );
    expect(least).toBeLessThan(m.full);
    expect(m.men).toBeGreaterThanOrEqual(3);
  });
});

describe('the end of a monster', () => {
  it('its god warm to the city again calls it home: it walks off the land', () => {
    const sim = demoSim('town');
    const s = sim.state;
    const m = sendMonster(s, 'hydra', 'a test')!;
    until(sim, () => m.state === 'lair', 60 * TICKS_PER_DAY);
    honour(s, MONSTERS.hydra.god, 40, 'staged', 'set up for the test', 0);
    expect(until(sim, () => m.state === 'leaving', TICKS_PER_DAY + 1)).toBe(true);
    expect(words(s).some((w) => /Hera is warm to your city again, and calls the Hydra home/.test(w))).toBe(true);
    expect(until(sim, () => !s.legends.monsters.includes(m), 120 * TICKS_PER_DAY)).toBe(true);
  });

  it('a hero’s end (slice 59): slain, out of any fight, its lair kept; and found by monsterAt till then', () => {
    const sim = demoSim('town');
    const s = sim.state;
    const m = sendMonster(s, 'talos', 'a test')!;
    until(sim, () => m.state === 'lair', 60 * TICKS_PER_DAY);
    expect(monsterAt(s, m.x + 0.5, m.z, 1)).toBe(m);
    expect(slayMonster(s, m.id, 'Jason')).toBe(true);
    expect(s.legends.monsters).toHaveLength(0);
    expect(s.legends.slain[0]).toMatchObject({ kind: 'talos', lair: m.lair, by: 'Jason' });
    expect(monsterAt(s, m.x, m.z, 1)).toBeNull();
  });
});

describe('the same seed, the same raid', () => {
  it('two runs of the Hydra from the same town wreck the same and kill the same', () => {
    const run = (): string => {
      const sim = demoSim('town');
      const m = sendMonster(sim.state, 'hydra', 'a test')!;
      until(sim, () => m.raids >= 1 && m.state === 'lair', 150 * TICKS_PER_DAY);
      return JSON.stringify(sim.state);
    };
    expect(run()).toBe(run());
  });
});

describe('saves', () => {
  it('a monster raiding, one healing and a stone figure save and load round', () => {
    const sim = demoSim('town');
    const s = sim.state;
    const a = sendMonster(s, 'boar', 'a test')!;
    const b = sendMonster(s, 'medusa', 'a test')!;
    until(sim, () => a.state === 'lair' && b.state === 'lair', 60 * TICKS_PER_DAY);
    a.next = s.tick + 1;
    b.state = 'healing';
    b.broke = true;
    b.next = s.tick + HEAL;
    s.legends.stones.push({ x: 40, z: 40, face: 0, tick: s.tick, kind: 'water' });
    sim.run(3 * TICKS_PER_DAY);
    expect(a.state).toBe('raiding');
    const text = encodeSave(s, 1);
    const back = decodeSave(text);
    if (!back.ok) throw new Error(back.why);
    expect(encodeSave(back.file.state, 1)).toBe(text);
    back.file.state.legends.monsters[0].kind = 'kraken' as Beast['kind'];
    expect(decodeSave(encodeSave(back.file.state, 1)).ok).toBe(false);
  });

  it('a save from before the monsters loads with none, and plays on', () => {
    const s = demoSim('town').state;
    const old = JSON.parse(encodeSave(s, 1));
    old.state.version = SIM_STATE_VERSION - 1;
    delete old.state.legends;
    const got = decodeSave(JSON.stringify(old));
    if (!got.ok) throw new Error(got.why);
    expect(got.file.state.version).toBe(SIM_STATE_VERSION);
    expect(got.file.state.legends).toEqual({ monsters: [], next: 1, stones: [], slain: [] });
    const sim = new Sim();
    sim.state = got.file.state;
    sim.run(TICKS_PER_DAY);
    // And one from before the gods too (version 47, phase 6).
    old.state.version = SIM_STATE_VERSION - 2;
    delete old.state.gods;
    const older = decodeSave(JSON.stringify(old));
    if (!older.ok) throw new Error(older.why);
    expect(older.file.state.legends.monsters).toHaveLength(0);
    expect(older.file.state.gods.on).toBe(true);
  });

  it('the make of every monster is whole', () => {
    for (const k of MONSTER_IDS) {
      const mk = MAKES[k];
      expect(mk.hp).toBeGreaterThan(0);
      expect(mk.tall).toBeGreaterThan(1);
    }
  });
});
