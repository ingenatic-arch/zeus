/**
 * Heroes answer (slice 59): demands read from the city, a hero's coming once
 * the hall stands and all is met, a hero of that monster who always wins it
 * (the fête, the god satisfied, the place of legend and its visitors' coin),
 * a hero waiting at the lair for a monster out raiding, wishes ignored and
 * kept, a hero riding with an expedition, the same fight from the same seed,
 * and saves with heroes in them and from before them.
 */
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { dhypot } from '../src/map/dmath';
import { buildingRefusal } from '../src/sim/build';
import { beside, centreOf, findBuilding } from '../src/sim/buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { expeditionRefusal } from '../src/sim/expeditions';
import { ARRIVE, courtyard, demandsOf, FETE, FIGHT, heroDoing, heroMoods, heroOf, LEAVE, LEGEND_COIN, RESTLESS, sendRefusal, type Champion } from '../src/sim/heroes';
import { lairSpot, monsterOf, sendMonster, type Beast } from '../src/sim/monsters';
import { honour, reasonsOf, type HeroId } from '../src/sim/pantheon';
import { Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, TILE_ROAD, type SimState } from '../src/sim/state';
import { RULED } from '../src/map/greece';
import { demoSim } from './prepared';

/** Play until `done` (at most `most` ticks); true if it came true. */
function until(sim: Sim, done: () => boolean, most: number): boolean {
  for (let i = 0; i < most; i++) {
    if (done()) return true;
    sim.step();
  }
  return done();
}

const send = (sim: Sim, c: Parameters<Sim['enqueue']>[0]): void => {
  sim.enqueue(c);
  sim.flush();
};

/** Tiles a 4 x 4 hall can stand on beside a road, nearest the first agora first. */
function hallTiles(sim: Sim): number[] {
  const s = sim.state;
  const n = sim.map.size;
  const agora = s.buildings.find((b) => b.kind === 'agora');
  const [ax, az] = agora ? centreOf(agora) : [n / 2, n / 2];
  const out: Array<[number, number]> = [];
  for (let t = 0; t < n * n; t++) {
    const x = t % n;
    const z = Math.floor(t / n);
    if (buildingRefusal(sim.map, s, 'herohall', x, z) === '' && beside(n, x, z, 4).some((u) => s.tiles[u] === TILE_ROAD)) out.push([t, dhypot(x + 2 - ax, z + 2 - az)]);
  }
  return out.sort((a, b) => a[1] - b[1] || a[0] - b[0]).map(([t]) => t);
}

/** A hall raised for a hero (the command, as a player would). */
function raise(sim: Sim, hero: HeroId): Champion {
  send(sim, { type: 'herohall', hero, at: hallTiles(sim).slice(0, 40) });
  const c = heroOf(sim.state, hero);
  expect(c, `${hero}'s hall`).toBeTruthy();
  return c!;
}

/** A hero come and at home (staged, for the tests that start from there). */
function staged(s: SimState, c: Champion): void {
  const hall = findBuilding(s, c.hall)!;
  [c.x, c.z] = courtyard(hall);
  c.state = 'home';
  c.came = s.tick;
  c.word = s.tick;
  c.by = 'road';
  c.wish = s.tick;
  c.next = s.tick + 20 * TICKS_PER_DAY;
}

/** A monster sent and settled in its lair. */
function settled(sim: Sim, kind: Beast['kind']): Beast {
  const m = sendMonster(sim.state, kind, 'a test')!;
  expect(m).toBeTruthy();
  expect(until(sim, () => m.state === 'lair', 3 * TICKS_PER_MONTH)).toBe(true);
  return m;
}

describe('demands', () => {
  it('read from the city: people, the court, fine houses, a god warm, lodges, each with its progress', () => {
    const sim = demoSim('richtown');
    const s = sim.state;
    const theseus = demandsOf(s, 'theseus');
    expect(theseus.map((d) => d.what)).toEqual(['A court', 'Ten fine houses']);
    expect(theseus[0].met).toBe(false);
    const heracles = demandsOf(s, 'heracles');
    expect(heracles[1].have).toBe(`${s.population.toLocaleString('en-GB')} of 2,000`);
    const perseus = demandsOf(s, 'perseus');
    expect(perseus[0].met).toBe(false);
    honour(s, 'athena', 40, 'staged', 'a test', 0);
    expect(demandsOf(s, 'perseus')[0].met).toBe(true);
    expect(demandsOf(s, 'perseus')[1]).toMatchObject({ what: 'A sanctuary to Athena', met: false });
    const lodges = s.buildings.filter((b) => b.kind === 'lodge').length;
    expect(demandsOf(s, 'atalanta')[1].have).toBe(`${lodges} of 3`);
  });
});

describe('a hero comes', () => {
  it('once the hall stands and all is met: word goes out, and within the month they come by sea and walk to the hall', () => {
    const sim = demoSim('order');
    const s = sim.state;
    expect(demandsOf(s, 'theseus').every((d) => d.met)).toBe(true);
    const money = s.money;
    const c = raise(sim, 'theseus');
    expect(s.money).toBe(money - 1500);
    expect(c.state).toBe('awaited');
    expect(until(sim, () => c.state === 'sent', 2 * TICKS_PER_DAY)).toBe(true);
    const word = s.tick;
    expect(c.next - word).toBeGreaterThanOrEqual(ARRIVE[0]);
    expect(c.next - word).toBeLessThanOrEqual(ARRIVE[1]);
    expect(until(sim, () => c.state === 'arriving', TICKS_PER_MONTH + 1)).toBe(true);
    expect(c.by).toBe('sea');
    expect(s.messages.log.some((m) => m.kind === 'hero' && /Theseus, the king of Athens, has come to your city by sea/.test(m.words))).toBe(true);
    expect(until(sim, () => c.state === 'home', 2 * TICKS_PER_MONTH)).toBe(true);
    const hall = findBuilding(s, c.hall)!;
    expect(dhypot(c.x - centreOf(hall)[0], c.z - centreOf(hall)[1])).toBeLessThan(1.5);
    // Homes near the hall are proud of him.
    const near = s.buildings.find((b) => b.kind === 'home' && b.level > 0 && dhypot(centreOf(b)[0] - centreOf(hall)[0], centreOf(b)[1] - centreOf(hall)[1]) < 10);
    if (near) expect(heroMoods(s, near).some((m) => /Proud to live near Theseus’s hall/.test(m.text))).toBe(true);
  }, 240000);

  it('with a demand unmet, nobody comes', () => {
    const sim = demoSim('order');
    const c = raise(sim, 'perseus');
    sim.run(2 * TICKS_PER_MONTH);
    expect(c.state).toBe('awaited');
    expect(heroDoing(sim.state, c)).toMatch(/two of his demands still to meet/);
  }, 240000);

  // (The review: a hall pulled down while its hero walked in left them standing in its place for good.)
  it('the hall pulled down while they walk in: they turn and leave, and are forgotten', () => {
    const sim = demoSim('order');
    const s = sim.state;
    const c = raise(sim, 'theseus');
    expect(until(sim, () => c.state === 'arriving', TICKS_PER_MONTH + 2 * TICKS_PER_DAY)).toBe(true);
    const hall = findBuilding(s, c.hall)!;
    send(sim, { type: 'clear', x0: hall.x, z0: hall.z, x1: hall.x + 3, z1: hall.z + 3 });
    expect(s.buildings.some((b) => b.kind === 'herohall')).toBe(false);
    expect(until(sim, () => c.state === 'leaving', 2 * TICKS_PER_MONTH)).toBe(true);
    expect(until(sim, () => !heroOf(s, 'theseus'), 2 * TICKS_PER_MONTH)).toBe(true);
  }, 240000);

  it('one hall to a hero', () => {
    const sim = demoSim('order');
    raise(sim, 'theseus');
    const halls = sim.state.buildings.filter((b) => b.kind === 'herohall').length;
    send(sim, { type: 'herohall', hero: 'theseus', at: hallTiles(sim).slice(0, 40) });
    expect(sim.state.buildings.filter((b) => b.kind === 'herohall').length).toBe(halls);
  }, 240000);
});

describe('slaying', () => {
  it('a hero of that monster walks to its lair, fights it for days and always wins: the fête, its god satisfied, a place of legend that pays', () => {
    const sim = demoSim('order');
    const s = sim.state;
    const c = raise(sim, 'theseus');
    staged(s, c);
    const m = settled(sim, 'minotaur');
    const medusa = settled(sim, 'medusa');
    expect(sendRefusal(s, 'theseus', medusa.id)).toMatch(/Theseus can slay only the Minotaur; Perseus or Heracles can slay Medusa|Heracles or Perseus/);
    expect(sendRefusal(s, 'perseus', m.id)).toMatch(/Perseus has not come/);
    // (Back to his courtyard if a raid sent him nowhere.)
    expect(until(sim, () => c.state === 'home' && m.state === 'lair', 2 * TICKS_PER_MONTH)).toBe(true);
    send(sim, { type: 'hero', hero: 'theseus', act: 'slay', monster: m.id });
    expect(c.state).toBe('hunting');
    // (If it set out on a raid meanwhile, he waits for it at its cave.)
    expect(until(sim, () => c.state === 'fighting', 3 * TICKS_PER_MONTH)).toBe(true);
    const start = s.tick;
    expect(m.held).toBeGreaterThan(0);
    const spot = lairSpot(s, m);
    expect(dhypot(m.x - spot.x, m.z - spot.z)).toBeLessThan(0.01);
    expect(until(sim, () => !monsterOf(s, m.id), FIGHT + 2)).toBe(true);
    expect(s.tick - start).toBeGreaterThanOrEqual(FIGHT);
    expect(s.legends.slain.at(-1)).toMatchObject({ kind: 'minotaur', by: 'Theseus' });
    expect(c.slain).toEqual(['minotaur']);
    expect(s.legends.fete).toMatchObject({ hero: 'theseus', kind: 'minotaur' });
    expect(s.legends.fete!.until - s.tick).toBe(FETE);
    const home = s.buildings.find((b) => b.kind === 'home' && b.level > 0)!;
    expect(heroMoods(s, home).some((x) => x.w === 2 && /The city celebrates: Theseus has slain the Minotaur/.test(x.text))).toBe(true);
    expect(reasonsOf(s, 'zeus').some((r) => r.kind === 'slain' && r.worth > 0)).toBe(true);
    expect(c.state).toBe('returning');
    // The place of legend's visitors, on the first of the month (the ledger holds).
    const month = Math.ceil((s.tick + 1) / TICKS_PER_MONTH) * TICKS_PER_MONTH;
    sim.run(month - s.tick + 1);
    const line = s.ledger.now.find((l) => l.kind === 'legends');
    expect(line?.amount).toBe(LEGEND_COIN);
    expect(s.legends.fete).toBeNull();
  }, 240000);

  it('sent while it is out raiding, the hero waits at the lair, and fights it when it comes home', () => {
    const sim = demoSim('order');
    const s = sim.state;
    const c = raise(sim, 'heracles');
    staged(s, c);
    const m = settled(sim, 'minotaur');
    m.next = s.tick + 1;
    expect(until(sim, () => m.state === 'raiding', TICKS_PER_DAY)).toBe(true);
    send(sim, { type: 'hero', hero: 'heracles', act: 'slay', monster: m.id });
    expect(until(sim, () => c.state === 'waiting', TICKS_PER_MONTH)).toBe(true);
    expect(m.state === 'raiding' || m.state === 'returning').toBe(true);
    expect(heroDoing(s, c)).toMatch(/Waiting at the Minotaur’s cave/);
    expect(until(sim, () => c.state === 'fighting', 2 * TICKS_PER_MONTH)).toBe(true);
    expect(until(sim, () => !monsterOf(s, m.id), FIGHT + 2)).toBe(true);
    expect(s.legends.slain.at(-1)!.by).toBe('Heracles');
  }, 240000);

  it('the same seed and orders give the same fight', () => {
    const run = (): string => {
      const sim = demoSim('order');
      const s = sim.state;
      const c = raise(sim, 'theseus');
      staged(s, c);
      const m = settled(sim, 'minotaur');
      send(sim, { type: 'hero', hero: 'theseus', act: 'slay', monster: m.id });
      until(sim, () => !monsterOf(s, m.id), 2 * TICKS_PER_MONTH);
      return JSON.stringify({ tick: s.tick, c, slain: s.legends.slain, money: s.money, people: s.population });
    };
    expect(run()).toBe(run());
  }, 240000);
});

describe('wishes', () => {
  it('ignored a year, the hero is restless; at two years they leave, warned first; kept, the clock resets', () => {
    const sim = demoSim('order');
    const s = sim.state;
    const c = raise(sim, 'theseus');
    staged(s, c);
    // The court at work: the wish is kept, and the clock keeps up.
    sim.run(2 * TICKS_PER_DAY);
    expect(c.wish).toBeGreaterThan(s.tick - TICKS_PER_DAY - 1);
    // The court paused (no one at work there), the clock a year gone.
    const court = s.buildings.find((b) => b.kind === 'court')!;
    send(sim, { type: 'work', id: court.id, paused: true });
    sim.run(2 * TICKS_PER_DAY);
    c.state = 'home';
    c.wish = s.tick - RESTLESS;
    c.next = s.tick + 99 * TICKS_PER_DAY;
    sim.run(TICKS_PER_DAY + 1);
    expect(c.warned).toBe(1);
    expect(s.messages.log.some((m) => m.kind === 'hero' && /Theseus grows restless/.test(m.words))).toBe(true);
    c.wish = s.tick - LEAVE + TICKS_PER_MONTH - TICKS_PER_DAY;
    sim.run(TICKS_PER_DAY + 1);
    expect(c.warned).toBe(2);
    c.wish = s.tick - LEAVE;
    sim.run(TICKS_PER_DAY + 1);
    expect(c.state).toBe('leaving');
    expect(until(sim, () => c.state === 'awaited', 2 * TICKS_PER_MONTH)).toBe(true);
    expect(c.came).toBe(-1);
    expect(c.again).toBeGreaterThan(s.tick);
  }, 240000);
});

describe('abroad', () => {
  it('ordered to ride, the hero goes with the next expedition, tips its odds, is in its report, and comes home with it', () => {
    const sim = demoSim('collect');
    const s = sim.state;
    const c = raise(sim, 'heracles');
    staged(s, c);
    send(sim, { type: 'hero', hero: 'heracles', act: 'ride', on: true });
    expect(c.ride).toBe(true);
    const foe = RULED.find((id) => expeditionRefusal(s, id, 'force') === '');
    expect(foe).toBeTruthy();
    send(sim, { type: 'expedition', city: foe!, kind: 'force' });
    sim.step();
    expect(c.state).toBe('mustering');
    const e = s.world.expeditions.at(-1)!;
    expect(until(sim, () => e.report.length > 0, 8 * TICKS_PER_MONTH)).toBe(true);
    expect(e.report.some((l) => /Heracles fought beside them, worth fifty men/.test(l))).toBe(true);
    expect(until(sim, () => c.state === 'returning' || c.state === 'home', 8 * TICKS_PER_MONTH)).toBe(true);
    expect(c.ride).toBe(false);
  }, 600000);
});

describe('saves', () => {
  it('round trip with a hero at a fight, a fête and a place of legend; a save from the version before loads with no hero', () => {
    const sim = demoSim('order');
    const s = sim.state;
    const c = raise(sim, 'theseus');
    staged(s, c);
    const m = settled(sim, 'minotaur');
    send(sim, { type: 'hero', hero: 'theseus', act: 'slay', monster: m.id });
    until(sim, () => c.state === 'fighting', TICKS_PER_MONTH);
    const a = decodeSave(encodeSave(s, 1000, { x: 1, z: 2, yaw: 0.5, dist: 30, tilt: 0 }));
    expect(a.ok).toBe(true);
    if (a.ok) expect(JSON.stringify(a.file.state.legends)).toBe(JSON.stringify(s.legends));
    // An older state: no heroes, no fête, no monster's `held` or `tower`.
    const old = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
    old.version = SIM_STATE_VERSION - 1;
    const l = old.legends as Record<string, unknown>;
    delete l.heroes;
    delete l.fete;
    for (const x of l.monsters as Array<Record<string, unknown>>) {
      delete x.held;
      delete x.tower;
    }
    for (const b of old.buildings as Array<Record<string, unknown>>) if (b.kind === 'herohall') b.kind = 'court';
    for (const b of old.buildings as Array<Record<string, unknown>>) delete b.hero;
    const back = decodeSave(encodeSave(old as unknown as SimState, 1000, { x: 1, z: 2, yaw: 0.5, dist: 30, tilt: 0 }));
    expect(back.ok, back.ok ? '' : back.why).toBe(true);
    if (back.ok) {
      expect(back.file.state.version).toBe(SIM_STATE_VERSION);
      expect(back.file.state.legends.heroes).toEqual([]);
      expect(back.file.state.legends.fete).toBeNull();
      expect(back.file.state.legends.monsters.every((x) => x.held === 0 && x.tower === 0)).toBe(true);
    }
  }, 240000);
});
