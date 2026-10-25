// Slice 49: physicians and plague. A home's health and its reasons; the switch, the grace and the year without
// plague; sickness, its spreading, mending and dying, and the sick away from work; the physicians' rounds and the
// stretcher-bearers; plague from Greece (always warned of first) and from a fevered quarter; the outbreak always
// ending; the quarantine holding ships off and turning caravans back; the same town twice, and saves.
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { coastMap } from '../src/map/bake';
import { decodeSave, encodeSave } from '../src/game/saves';
import { buildingRefusal } from '../src/sim/build';
import { findBuilding, livedIn } from '../src/sim/buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '../src/sim/clock';
import {
  BEDS,
  feverQuarter,
  FEVER_DAYS,
  FEVER_HOMES,
  GRACE,
  healthFigures,
  healthLine,
  healthOf,
  landed,
  PLAGUE_DAYS,
  PLAGUE_FREE,
  quarantined,
  sickAt,
  startGreekPlague,
  startOutbreak,
  WARN_LEAD,
  type Sick,
} from '../src/sim/health';
import { awayAt, canWorkIn } from '../src/sim/labour';
import { ALARM, WARNING } from '../src/sim/messages';
import { roadsBeside } from '../src/sim/rounds';
import { routeOf } from '../src/sim/routes';
import { seasonAt, SUMMER } from '../src/sim/seasons';
import { Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type Building, type BuildingKind, type SimState } from '../src/sim/state';
import { totals } from '../src/sim/treasury';
import { SHIP_ANCHORED, SHIP_AWAY, SHIP_LEAVING, SHIP_MOORED } from '../src/sim/trade';
import { demoSim } from './prepared';

const map = coastMap();
const size = map.size;
const ledgerAddsUp = (s: SimState): void => expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);
const until = (sim: Sim, ok: () => boolean, most: number): boolean => {
  for (let i = 0; i < most && !ok(); i++) sim.step();
  return ok();
};
const homes = (s: SimState): Building[] => s.buildings.filter((b) => livedIn(b) && b.family !== null);
const centre = (b: Building): [number, number] => [b.x + 1, b.z + 1];

/** Build a kind of building beside a road as near as can be to a home (a command, as the build bar sends it). */
function buildNear(sim: Sim, kind: BuildingKind, near: Building, side = 2): Building {
  const s = sim.state;
  const [cx, cz] = centre(near);
  const spots: Array<[number, number, number]> = [];
  for (let z = Math.max(0, cz - 30); z < Math.min(size, cz + 30); z++) {
    for (let x = Math.max(0, cx - 30); x < Math.min(size, cx + 30); x++) {
      if (buildingRefusal(map, s, kind, x, z) !== '') continue;
      const fake = { x, z, kind, estate: false } as unknown as Building;
      if (!roadsBeside(s, size, fake).length) continue;
      spots.push([Math.hypot(x + side / 2 - cx, z + side / 2 - cz), x, z]);
    }
  }
  spots.sort((a, b) => a[0] - b[0]);
  s.money += 5000;
  for (const [, x, z] of spots) {
    const before = s.buildings.length;
    sim.enqueue({ type: 'build', kind: kind as never, at: [z * size + x] });
    sim.flush();
    if (s.buildings.length > before) return s.buildings.find((b) => b.kind === kind && b.x === x && b.z === z)!;
  }
  throw new Error(`nowhere to build a ${kind}`);
}

/** Someone of a household sick now, for so many days (at home). */
function makeSick(s: SimState, b: Building, days: number, plague = false): Sick {
  const p = b.family!.members.find((m) => !s.health.sick.some((x) => x.home === b.id && x.name === m.name))!;
  const x: Sick = { id: s.health.next++, home: b.id, name: p.name, female: p.female, since: s.tick, until: s.tick + days * TICKS_PER_DAY, plague: plague ? 1 : 0, tended: 0, bed: 0 };
  s.health.sick.push(x);
  return x;
}

describe('a home’s health', () => {
  it('every earlier demo opens with health on and each lived-in home at its fair level', () => {
    const s = demoSim('town').state;
    expect(s.health.on).toBe(true);
    expect(s.health.since).toBe(s.tick);
    for (const b of homes(s)) expect(b.health).toBe(healthOf(s, b).value);
    for (const b of s.buildings) if (!livedIn(b)) expect(b.health).toBe(0);
  });

  it('rises with water, a varied table and a physician’s call; falls with hunger, crowding and foul air', () => {
    const s = demoSim('town').state;
    const b = homes(s).find((h) => h.level >= 3)!;
    const base = healthOf(s, b);
    const words = (r: { reasons: Array<{ text: string }> }): string => r.reasons.map((x) => x.text).join(' | ');
    b.physician = s.tick - 5 * TICKS_PER_DAY;
    const called = healthOf(s, b);
    expect(called.value).toBeGreaterThan(base.value);
    expect(words(called)).toMatch(/The physician called 5 days ago/);
    b.physician = 0;
    b.waterUntil = 0;
    b.foodUntil = 0;
    b.meatUntil = 0;
    b.cheeseUntil = 0;
    const poor = healthOf(s, b);
    expect(poor.value).toBeLessThan(base.value);
    expect(words(poor)).toMatch(/No clean water/);
    expect(words(poor)).toMatch(/Hungry/);
    // Foul air from a dairy next door.
    const dairy = { ...b, id: 999999, kind: 'dairy', x: b.x + 2, z: b.z, family: null } as Building;
    s.buildings.push(dairy);
    s.rev++;
    expect(words(healthOf(s, b))).toMatch(/Foul air from the dairy/);
    expect(healthOf(s, b).value).toBe(Math.max(5, poor.value - 10));
    s.buildings.pop();
    s.rev++;
    // The panel's line: the word and what counts most.
    b.health = 25;
    expect(healthLine(s, b)).toMatch(/^Ailing: /);
  });

  it('moves toward its fair level a little a day (up two, down one)', () => {
    const sim = demoSim('town');
    const s = sim.state;
    const b = homes(s)[0];
    const fair = healthOf(s, b).value;
    b.health = Math.max(5, fair - 20);
    sim.run(TICKS_PER_DAY);
    expect(b.health).toBe(Math.max(5, fair - 20) + 2);
    b.health = Math.min(95, fair + 10);
    sim.run(TICKS_PER_DAY);
    expect(b.health).toBe(Math.min(95, fair + 10) - 1);
  });

  it('with the switch off, nothing moves', () => {
    const sim = demoSim('town');
    const s = sim.state;
    sim.enqueue({ type: 'health', on: false });
    sim.flush();
    const b = homes(s)[0];
    b.health = 10;
    makeSick(s, b, 1);
    sim.run(5 * TICKS_PER_DAY);
    expect(b.health).toBe(10);
    expect(s.health.sick.length).toBe(1);
  });
});

describe('sickness', () => {
  it('nobody falls ill in the grace after health is turned on, even in a sickly home', () => {
    const sim = demoSim('town');
    const s = sim.state;
    const b = homes(s)[0];
    b.waterUntil = 0;
    b.foodUntil = b.meatUntil = b.cheeseUntil = 0;
    b.health = 5;
    sim.run(GRACE - 2 * TICKS_PER_DAY);
    expect(s.health.sick.length).toBe(0);
  });

  it('a home of low health falls ill; the sick don’t work; they mend or die, and the household’s story says so', () => {
    const sim = demoSim('town');
    const s = sim.state;
    s.health.since -= GRACE;
    const poor = homes(s).filter((b) => b.people >= 3).slice(0, 12);
    for (const b of poor) b.health = 6;
    // (Kept poor: no water, no food, so their fair level stays low.)
    const starve = (): void => {
      for (const b of poor) {
        b.waterUntil = 0;
        b.foodUntil = b.meatUntil = b.cheeseUntil = 0;
      }
    };
    starve();
    expect(until(sim, () => (starve(), s.health.sick.length > 0), 60 * TICKS_PER_DAY)).toBe(true);
    const x = s.health.sick[0];
    const home = findBuilding(s, x.home)!;
    expect(sickAt(s, home)).toBeGreaterThan(0);
    expect(awayAt(s, home)).toBeGreaterThanOrEqual(sickAt(s, home));
    expect(canWorkIn(s, home)).toBe(Math.max(0, Math.floor(home.people * 0.5) - awayAt(s, home)));
    expect(home.family!.story.at(-1)!.what).toBe('ill');
    const name = x.name;
    expect(until(sim, () => !s.health.sick.includes(x), 25 * TICKS_PER_DAY)).toBe(true);
    const f = findBuilding(s, x.home)?.family;
    const last = f ? [...f.story].reverse().find((e) => e.names[0] === name && (e.what === 'mended' || e.what === 'died')) : undefined;
    if (f) expect(last).toBeDefined();
    ledgerAddsUp(s);
  });

  it('some mend and some die; the dead leave their household, and the people count follows', () => {
    const sim = demoSim('town');
    const s = sim.state;
    const pick = homes(s).filter((b) => b.people >= 2).slice(0, 30);
    for (const b of pick) makeSick(s, b, 0, true);
    const before = s.population;
    sim.step();
    expect(s.health.sick.length).toBe(0);
    const died = s.health.now.died;
    expect(died).toBeGreaterThan(0);
    expect(s.health.now.mended).toBeGreaterThan(0);
    expect(died + s.health.now.mended).toBe(30);
    expect(s.population).toBe(before - died);
    expect(s.population).toBe(s.buildings.reduce((n, b) => n + b.people, 0));
    for (const b of pick) if (b.family) expect(b.family.members.length).toBe(b.people);
  });

  it('spreads to a neighbour of low health, never to a healthy one', () => {
    const sim = demoSim('town');
    const s = sim.state;
    s.health.since -= GRACE;
    // A sick home, with neighbours: those of low health catch it.
    const all = homes(s);
    const sick = all.find((b) => all.filter((o) => o !== b && Math.max(Math.abs(o.x - b.x), Math.abs(o.z - b.z)) <= 4).length >= 3)!;
    const near = all.filter((o) => o !== sick && Math.max(Math.abs(o.x - sick.x), Math.abs(o.z - sick.z)) <= 4);
    const low = near.slice(0, Math.ceil(near.length / 2));
    const high = near.slice(low.length);
    const hold = (): void => {
      for (const b of low) b.health = 38;
      for (const b of high) b.health = 90;
      if (!s.health.sick.some((x) => x.home === sick.id)) makeSick(s, sick, 30);
    };
    hold();
    for (let d = 0; d < 120; d++) {
      hold();
      sim.run(TICKS_PER_DAY);
    }
    const caught = (b: Building): boolean => b.family?.story.some((e) => e.what === 'ill') ?? false;
    expect(low.some(caught)).toBe(true);
    expect(high.some(caught)).toBe(false);
  });
});

describe('the physicians and the asklepieion', () => {
  it('an infirmary sends physicians on their rounds, who call on the homes beside their way and tend the sick', () => {
    const sim = demoSim('town');
    const s = sim.state;
    const target = homes(s)[Math.floor(homes(s).length / 2)];
    const inf = buildNear(sim, 'infirmary', target);
    const x = makeSick(s, target, 200);
    expect(until(sim, () => s.walkers.some((w) => w.kind === 'physician' && w.origin === inf.id), 30 * TICKS_PER_DAY)).toBe(true);
    expect(until(sim, () => homes(s).filter((b) => b.physician > 0).length >= 5, 60 * TICKS_PER_DAY)).toBe(true);
    expect(until(sim, () => x.tended > 0, 60 * TICKS_PER_DAY)).toBe(true);
    // A home a physician called on lately is healthier for it.
    const called = homes(s).find((b) => b.physician > 0)!;
    expect(healthOf(s, called).reasons.some((r) => r.text.startsWith('The physician called'))).toBe(true);
    expect(healthFigures(s).called).toBeGreaterThan(0);
  });

  it('an asklepieion’s stretcher-bearers walk by road to the sick and carry them back to a bed, where they mend faster', () => {
    const sim = demoSim('town');
    const s = sim.state;
    const target = homes(s)[Math.floor(homes(s).length / 3)];
    const temple = buildNear(sim, 'asklepieion', target, 4);
    const x = makeSick(s, target, 200);
    const left = x.until - s.tick;
    expect(until(sim, () => s.walkers.some((w) => w.kind === 'bearer'), 40 * TICKS_PER_DAY)).toBe(true);
    expect(x.bed).toBe(-temple.id);
    expect(until(sim, () => x.bed === temple.id, 60 * TICKS_PER_DAY)).toBe(true);
    expect(x.until - s.tick).toBeLessThan(left * 0.7);
    // While she lies there, she is still away from work, and the staff tend her.
    expect(sickAt(s, target)).toBe(1);
    sim.run(TICKS_PER_DAY);
    expect(x.tended).toBeGreaterThan(s.tick - TICKS_PER_DAY - 1);
    expect(BEDS).toBe(8);
  });
});

describe('plague', () => {
  it('plague in a city you trade with is warned of at once; its ship brings it ashore only once the warning is old enough', () => {
    const sim = demoSim('athensship');
    const s = sim.state;
    const r = routeOf(s, 'athens', 'sea')!;
    const p = startGreekPlague(s, 'athens', 4 * TICKS_PER_MONTH);
    expect(p.warned).toBe(s.tick);
    const warn = s.messages.log.at(-1)!;
    expect(warn.kind).toBe('plague');
    expect(warn.u).toBe(WARNING);
    expect(warn.words).toMatch(/^Plague in Athens/);
    // She is days from the jetty: too soon after the warning, so she brings nothing.
    expect(until(sim, () => r.ship!.phase === SHIP_MOORED, 20 * TICKS_PER_DAY)).toBe(true);
    expect(s.health.outbreak).toBeNull();
    // The next: the warning long given, she brings it ashore by the quay.
    expect(until(sim, () => r.ship!.phase === SHIP_AWAY, 30 * TICKS_PER_DAY)).toBe(true);
    expect(until(sim, () => r.ship!.phase === SHIP_MOORED, 6 * TICKS_PER_MONTH)).toBe(true);
    expect(s.tick).toBeGreaterThanOrEqual(p.warned + WARN_LEAD);
    expect(s.health.outbreak).not.toBeNull();
    expect(s.health.outbreak!.from).toBe('athens');
    const alarm = s.messages.log.find((m) => m.kind === 'plague' && m.u === ALARM)!;
    expect(alarm.words).toMatch(/^Plague in the city!/);
    // Warned first: the warning came before the alarm.
    expect(s.messages.log.indexOf(warn)).toBeLessThan(s.messages.log.indexOf(alarm));
  });

  it('a quarantine turns back the ship sailing for the jetty, then holds the next at anchor until it is lifted; nothing is lost from the ledger', () => {
    const sim = demoSim('athensship');
    const s = sim.state;
    const r = routeOf(s, 'athens', 'sea')!;
    const p = startGreekPlague(s, 'athens', 8 * TICKS_PER_MONTH);
    p.warned -= WARN_LEAD;
    sim.enqueue({ type: 'quarantine', on: true });
    sim.flush();
    expect(quarantined(s)).toBe(true);
    sim.step();
    expect(r.ship!.phase).toBe(SHIP_LEAVING);
    expect(r.missed).toBe('quarantine');
    expect(until(sim, () => r.ship!.phase === SHIP_ANCHORED, 4 * TICKS_PER_MONTH)).toBe(true);
    sim.run(10 * TICKS_PER_DAY);
    expect(r.ship!.phase).toBe(SHIP_ANCHORED);
    expect(s.health.outbreak).toBeNull();
    ledgerAddsUp(s);
    // Lifted while Athens still has it: she ties up, and brings it.
    sim.enqueue({ type: 'quarantine', on: false });
    sim.flush();
    expect(until(sim, () => r.ship!.phase === SHIP_MOORED, 20 * TICKS_PER_DAY)).toBe(true);
    expect(s.health.outbreak).not.toBeNull();
    ledgerAddsUp(s);
  });

  it('a quarantine turns a caravan back at the edge (no snub), and ends by itself after a season', () => {
    const sim = demoSim('caravan');
    const s = sim.state;
    const r = s.world.routes.find((x) => x.kind === 'land')!;
    sim.enqueue({ type: 'quarantine', on: true });
    sim.flush();
    const mood = s.world.cities.find((c) => c.id === r.city)!.memories.length;
    expect(until(sim, () => r.missed === 'quarantine', 3 * TICKS_PER_MONTH)).toBe(true);
    expect(s.walkers.some((w) => w.kind === 'caravan' && w.origin > 0 && !w.back && w.wait === 0 && w.since === s.tick)).toBe(false);
    expect(s.world.cities.find((c) => c.id === r.city)!.memories.length).toBe(mood);
    expect(until(sim, () => !quarantined(s), 4 * TICKS_PER_MONTH)).toBe(true);
    expect(s.messages.log.at(-1)!.title ?? '').toMatch(/Quarantine over/);
    ledgerAddsUp(s);
  });

  it('an outbreak spreads to homes of poor health nearby, households flee, and it always ends, with its toll told', () => {
    const sim = demoSim('town');
    const s = sim.state;
    const all = homes(s);
    for (const b of all) b.health = 30;
    const first = all[Math.floor(all.length / 2)];
    startOutbreak(s, map, '', first);
    const o = s.health.outbreak!;
    expect(o.struck).toEqual([first.id]);
    expect(s.messages.log.at(-1)!.u).toBe(ALARM);
    expect(until(sim, () => s.health.outbreak === null, (PLAGUE_DAYS + 30) * TICKS_PER_DAY)).toBe(true);
    expect(o.struck.length).toBeGreaterThan(3);
    expect(o.ill).toBeGreaterThan(o.struck.length - 1);
    expect(s.health.sick.some((x) => x.plague)).toBe(false);
    const end = s.messages.log.at(-1)!;
    expect(end.title).toBe('The plague has passed');
    expect(end.words).toContain(`${o.dead} died`);
    expect(s.population).toBe(s.buildings.reduce((n, b) => n + b.people, 0));
    ledgerAddsUp(s);
  });

  it('a crowded, sickly quarter in summer is warned of as a fever before it turns to plague; never in the first year', () => {
    const sim = demoSim('town');
    const s = sim.state;
    const all = homes(s);
    // A quarter: a home and the homes round it, kept sickly.
    const heart = all.find((b) => all.filter((o) => Math.max(Math.abs(o.x - b.x), Math.abs(o.z - b.z)) <= 5).length >= FEVER_HOMES + 1)!;
    const quarter = all.filter((o) => Math.max(Math.abs(o.x - heart.x), Math.abs(o.z - heart.z)) <= 5);
    const hold = (): void => {
      for (const b of quarter) {
        b.health = 20;
        b.waterUntil = 0;
        b.foodUntil = b.meatUntil = b.cheeseUntil = 0;
      }
    };
    hold();
    expect(feverQuarter(s)).not.toBeNull();
    // In the first year after health is on: no fever, however sickly.
    const toSummer = (): void => {
      while (seasonAt(s.tick) !== SUMMER) {
        hold();
        sim.run(TICKS_PER_DAY);
      }
    };
    toSummer();
    if (s.tick < s.health.since + PLAGUE_FREE) {
      sim.run(5 * TICKS_PER_DAY);
      expect(s.health.fever).toBeNull();
    }
    // A year on (as if), in summer: warned, then plague if it lingers.
    s.health.since -= TICKS_PER_YEAR;
    // (Nobody falls ill of themselves in this test: only the quarter's fever is watched.)
    toSummer();
    hold();
    sim.run(TICKS_PER_DAY);
    expect(s.health.fever).not.toBeNull();
    const warn = s.messages.log.find((m) => m.title === 'Fever in a quarter')!;
    expect(warn.u).toBe(WARNING);
    expect(s.health.outbreak).toBeNull();
    for (let d = 0; d < FEVER_DAYS + 2 && !s.health.outbreak; d++) {
      hold();
      sim.run(TICKS_PER_DAY);
    }
    expect(s.health.outbreak).not.toBeNull();
    expect(s.health.outbreak!.from).toBe('');
  });

  it('a trader from a city with no plague, or one under quarantine, brings nothing', () => {
    const sim = demoSim('athensship');
    const s = sim.state;
    const post = s.buildings.find((b) => b.kind === 'trading')!;
    landed(s, 'athens', post);
    expect(s.health.outbreak).toBeNull();
    const p = startGreekPlague(s, 'athens', 3 * TICKS_PER_MONTH);
    p.warned -= WARN_LEAD;
    s.health.quarantine = s.tick + 100;
    landed(s, 'athens', post);
    expect(s.health.outbreak).toBeNull();
    s.health.quarantine = 0;
    landed(s, 'athens', post);
    expect(s.health.outbreak).not.toBeNull();
  });
});

describe('the same town twice, and saves', () => {
  it('a town with the sick, physicians, an asklepieion, plague and a quarantine plays the same twice, and keeps through a save', () => {
    const run = (): string => {
      const sim = demoSim('town');
      const s = sim.state;
      const all = homes(s);
      buildNear(sim, 'infirmary', all[3]);
      buildNear(sim, 'asklepieion', all[10], 4);
      for (const b of all) b.health = 35;
      startOutbreak(s, map, '', all[Math.floor(all.length / 2)]);
      sim.enqueue({ type: 'quarantine', on: true });
      sim.flush();
      sim.run(10 * TICKS_PER_DAY);
      return encodeSave(s, 1);
    };
    const a = run();
    expect(run()).toBe(a);
    const got = decodeSave(a);
    if (!got.ok) throw new Error(got.why);
    expect(encodeSave(got.file.state, 1)).toBe(a);
    expect(got.file.state.health.sick.length).toBeGreaterThan(0);
  });

  it('a save from before health (version 43) loads with health on (crime was), nobody sick, and plays on', () => {
    const s = demoSim('town').state;
    const old = JSON.parse(encodeSave(s, 1));
    old.state.version = SIM_STATE_VERSION - 1;
    delete old.state.health;
    const rounds = old.state.rounds;
    delete rounds.health;
    const got = decodeSave(JSON.stringify(old));
    if (!got.ok) throw new Error(got.why);
    const st = got.file.state;
    expect(st.version).toBe(SIM_STATE_VERSION);
    expect(st.health.on).toBe(true);
    expect(st.health.since).toBe(s.tick);
    expect(st.health.sick).toEqual([]);
    expect(st.rounds.health.walked.length).toBe(size * size);
    const sim = new Sim();
    sim.state = st;
    sim.run(TICKS_PER_DAY);
    for (const b of homes(st)) expect(b.health).toBeGreaterThan(0);
    ledgerAddsUp(st);
  });

  it('a version 37 save (slice 40’s) loads through every step, health on, and plays on', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/slice40-ship.save.json.gz')).toString();
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    const st = got.file.state;
    expect(st.version).toBe(SIM_STATE_VERSION);
    expect(st.health.on).toBe(st.crime.on);
    for (const b of st.buildings) expect([b.health, b.physician]).toEqual([0, 0]);
    const sim = new Sim();
    sim.state = st;
    sim.run(2 * TICKS_PER_DAY);
    ledgerAddsUp(st);
  });
});
