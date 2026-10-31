/**
 * Slice 56: the gods walk your streets (src/sim/epiphany.ts). A visit's
 * arrival, its walk (straight over everything), its blessings and its
 * leaving; the trigger when a god first reaches loving; the blessing's
 * effects; saves and the migration.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { WATER_NONE, WATER_SEA } from '../src/map/bake';
import { mapOf } from '../src/map/lands';
import { decodeSave, encodeSave } from '../src/game/saves';
import { centreOf, findBuilding } from '../src/sim/buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { ARRIVE_TICKS, BLESS_TICKS, GOD_SPEED, godStatus, LEAVE_TICKS, LOVED, MAX_GODS, startVisit, VISIT_TICKS, walking, type GodFigure } from '../src/sim/epiphany';
import { moodOf } from '../src/sim/folk';
import { riskRate, wearRate } from '../src/sim/hazards';
import { migrate } from '../src/sim/migrate';
import { blessingOn, BOON, freshWalks, honour } from '../src/sim/pantheon';
import { Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type SimState } from '../src/sim/state';
import { demoSim } from './prepared';

/** #town (28 months in, farms, a granary, homes up to fine houses), with the gods on as it opens. */
const town = (): Sim => demoSim('town');

/** Play on until the god has gone (or `most` ticks), noting each state it passes through. */
function playVisit(sim: Sim, f: GodFigure, most = VISIT_TICKS + 20 * TICKS_PER_DAY): { states: string[]; ticks: number } {
  const states: string[] = [];
  const t0 = sim.state.tick;
  while (sim.state.tick - t0 < most && sim.state.gods.walks.figures.includes(f)) {
    if (states[states.length - 1] !== f.state) states.push(f.state);
    sim.step();
  }
  return { states, ticks: sim.state.tick - t0 };
}

describe('the gods walk your streets (slice 56)', () => {
  it('no god walks in any demo’s town as it opens, and nothing is blessed', () => {
    for (const name of ['town', 'richtown', 'order', 'empire', 'physicians']) {
      const s = demoSim(name).state;
      expect(s.gods.walks.figures).toEqual([]);
      expect(s.gods.walks.blessed).toEqual([]);
    }
  }, 600_000);

  it('Demeter arrives among the fields, walks to her farms and the granary, blesses each, and leaves within the visit', () => {
    const sim = town();
    const s = sim.state;
    const map = mapOf(s);
    const f = startVisit(s, 'demeter', 'loving');
    if (!f) throw new Error('refused');
    // Among the fields: on land, on or beside a farm.
    expect(map.tileWater[Math.floor(f.z) * map.size + Math.floor(f.x)]).toBe(WATER_NONE);
    const farm = s.buildings.filter((b) => b.kind === 'farm').some((b) => Math.hypot(centreOf(b)[0] - f.x, centreOf(b)[1] - f.z) < 3);
    expect(farm).toBe(true);
    expect(f.stops.length).toBeGreaterThan(1);
    expect(f.stops.every((p) => LOVED.demeter.includes(findBuilding(s, p.id)!.kind))).toBe(true);
    // Said: who has come, why and where she means to go.
    const hello = s.messages.log[s.messages.log.length - 1];
    expect(hello.kind).toBe('epiphany');
    expect(hello.words).toMatch(/^Demeter walks among your fields: she /);
    const stops = f.stops.map((p) => p.id);
    const { states, ticks } = playVisit(sim, f);
    expect(states[0]).toBe('arriving');
    expect(states[states.length - 1]).toBe('leaving');
    expect(states).toContain('blessing');
    expect(sim.state.gods.walks.figures).toEqual([]);
    expect(ticks).toBeLessThanOrEqual(VISIT_TICKS + LEAVE_TICKS);
    // Each place she reached is blessed, in the order she set out with, at least the first.
    expect(f.blessed.length).toBeGreaterThan(0);
    expect(f.blessed).toEqual(stops.slice(0, f.blessed.length));
    for (const id of f.blessed) expect(blessingOn(sim.state, id)?.god).toBe('demeter');
    // Lasting three to six months.
    const until = blessingOn(sim.state, f.blessed[0])!.until;
    expect(until - f.came).toBeGreaterThanOrEqual(3 * TICKS_PER_MONTH);
    expect(until - f.came).toBeLessThanOrEqual(6 * TICKS_PER_MONTH + TICKS_PER_MONTH);
    const words = sim.state.messages.log.filter((m) => m.kind === 'epiphany').map((m) => m.words);
    expect(words.some((w) => /^Demeter blesses the (wheat farm|farm|granary)/.test(w))).toBe(true);
    expect(words[words.length - 1]).toMatch(/^Demeter has gone: she blessed .* until (spring|summer|autumn|winter)\.$/);
  });

  it('the same town and the same visit play out the same', () => {
    const a = town();
    const b = town();
    startVisit(a.state, 'hephaestus', 'festival');
    startVisit(b.state, 'hephaestus', 'festival');
    a.run(200);
    b.run(200);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
  });

  it('a god walks in a straight line over everything, water too, at a stately pace', () => {
    const sim = town();
    const s = sim.state;
    const map = mapOf(s);
    const f = startVisit(s, 'zeus', 'loving')!;
    // Put him out in the bay, already walking to his first place.
    const n = map.size;
    let sea = -1;
    for (let t = 0; t < n * n && sea < 0; t++) if (map.tileWater[t] === WATER_SEA && Math.abs((t % n) - f.stops[0].x) < 30 && Math.abs(Math.floor(t / n) - f.stops[0].z) < 30) sea = t;
    expect(sea).toBeGreaterThanOrEqual(0);
    f.x = f.px = (sea % n) + 0.5;
    f.z = f.pz = Math.floor(sea / n) + 0.5;
    f.state = 'walking';
    const [x0, z0] = [f.x, f.z];
    const [tx, tz] = [f.stops[0].x, f.stops[0].z];
    let last = Infinity;
    while (f.state === 'walking') {
      sim.step();
      // On the line from where he stood to the place, never further than before, never faster than his pace.
      const cross = (tx - x0) * (f.z - z0) - (tz - z0) * (f.x - x0);
      expect(Math.abs(cross) / Math.hypot(tx - x0, tz - z0)).toBeLessThan(1e-6);
      const d = Math.hypot(tx - f.x, tz - f.z);
      expect(d).toBeLessThan(last);
      expect(Math.hypot(f.x - f.px, f.z - f.pz)).toBeLessThanOrEqual(GOD_SPEED + 1e-9);
      last = d;
    }
    expect(f.state).toBe('blessing');
    expect(f.blessed).toEqual([f.stops[0].id]);
  });

  it('Poseidon rises on the shore; a god with nothing of theirs walks among the homes', () => {
    const sim = town();
    const s = sim.state;
    const map = mapOf(s);
    const p = startVisit(s, 'poseidon', 'loving')!;
    const t = Math.floor(p.z) * map.size + Math.floor(p.x);
    expect(map.tileWater[t]).toBe(WATER_NONE);
    expect([t - 1, t + 1, t - map.size, t + map.size].some((u) => map.tileWater[u] === WATER_SEA)).toBe(true);
    // #town has no barracks or tower: Ares finds none, and says so.
    expect(s.buildings.some((b) => LOVED.ares.includes(b.kind))).toBe(false);
    const a = startVisit(s, 'ares', 'loving')!;
    expect(a.stops.length).toBeGreaterThan(0);
    expect(a.stops.every((x) => findBuilding(s, x.id)?.kind === 'home')).toBe(true);
    expect(s.messages.log[s.messages.log.length - 1].words).toMatch(/finds no barracks in your city, and walks among your homes instead/);
    // Hera goes to the biggest households.
    const h = startVisit(s, 'hera', 'loving')!;
    const most = Math.max(...s.buildings.filter((b) => b.kind === 'home').map((b) => b.people));
    expect(h.stops.some((x) => findBuilding(s, x.id)?.people === most)).toBe(true);
    expect(h.stops.every((x) => findBuilding(s, x.id)?.kind === 'home')).toBe(true);
  });

  it('is refused for a god already in the city, and past three walking at once; a pose ignores the cap and never moves or leaves', () => {
    const sim = town();
    const s = sim.state;
    expect(startVisit(s, 'demeter', 'loving')).not.toBeNull();
    expect(startVisit(s, 'demeter', 'festival')).toBeNull();
    expect(startVisit(s, 'athena', 'loving')).not.toBeNull();
    expect(startVisit(s, 'apollo', 'sanctuary')).not.toBeNull();
    expect(walking(s).length).toBe(MAX_GODS);
    expect(startVisit(s, 'hermes', 'loving')).toBeNull();
    const posed = startVisit(s, 'hermes', 'pose', { x: 40, z: 60 })!;
    expect(posed.state).toBe('posing');
    sim.run(VISIT_TICKS + 30 * TICKS_PER_DAY);
    expect(sim.state.gods.walks.figures.map((f) => f.god)).toEqual(['hermes']);
    expect([posed.x, posed.z, posed.state]).toEqual([40, 60, 'posing']);
    expect(godStatus(sim.state, posed).detail).toMatch(/^Standing for you to see/);
  });

  it('a god first reaching loving comes once, and not again while loving; never with the gods switched off', () => {
    const sim = town();
    const s = sim.state;
    expect(s.gods.on).toBe(true);
    honour(s, 'demeter', 80, 'staged', 'your full granaries', 0);
    const day = (): void => sim.run(TICKS_PER_DAY);
    day();
    expect(s.gods.walks.figures.map((f) => f.god)).toEqual(['demeter']);
    expect(s.gods.walks.figures[0].words).toBe('she is pleased with your full granaries');
    expect(s.gods.walks.loving).toEqual(['demeter']);
    sim.run(VISIT_TICKS + 10 * TICKS_PER_DAY);
    expect(sim.state.gods.walks.figures).toEqual([]);
    expect(sim.state.messages.log.filter((m) => m.words.startsWith('Demeter walks among your fields')).length).toBe(1);
    // Off: Athena loving brings nobody.
    const off = town();
    off.state.gods.on = false;
    honour(off.state, 'athena', 90, 'staged', 'your olives', 0);
    off.run(5 * TICKS_PER_DAY);
    expect(off.state.gods.walks.figures).toEqual([]);
  });

  it('a blessed maker works a quarter faster; a blessed building gains no fire risk or wear; a blessed home is the gladder for it', () => {
    const a = town();
    const b = town();
    const farm = a.state.buildings.find((x) => x.kind === 'farm' && x.workers > 0 && x.growth < 200)!;
    expect(farm).toBeDefined();
    const far = a.state.tick + 12 * TICKS_PER_MONTH;
    b.state.gods.walks.blessed.push({ id: farm.id, god: 'demeter', until: far });
    const g0 = findBuilding(a.state, farm.id)!.growth;
    a.run(10);
    b.run(10);
    const ga = findBuilding(a.state, farm.id)!.growth - g0;
    const gb = findBuilding(b.state, farm.id)!.growth - g0;
    expect(ga).toBeGreaterThan(0);
    expect(gb / ga).toBeCloseTo(BOON, 6);
    // Fire and wear.
    const s = b.state;
    const home = s.buildings.find((x) => x.kind === 'home' && x.people > 0 && x.level >= 3)!;
    expect(riskRate(s, home)).toBeGreaterThan(0);
    expect(wearRate(s, home)).toBeGreaterThan(0);
    s.gods.walks.blessed.push({ id: home.id, god: 'aphrodite', until: far });
    expect(riskRate(s, home)).toBe(0);
    expect(wearRate(s, home)).toBe(0);
    const risk = home.risk;
    const wear = home.wear;
    b.run(20 * TICKS_PER_DAY);
    expect([home.risk, home.wear]).toEqual([risk, wear]);
    const mood = moodOf(b.state, home, { agora: true, jobs: true, shrine: true, theatre: true }, 0);
    expect(mood.reasons.some((r) => r.text === 'Blessed by Aphrodite: her visit lifts the house' && r.tone === 1)).toBe(true);
  });

  it('a save round-trips with a god in the streets and places blessed', () => {
    const sim = town();
    startVisit(sim.state, 'dionysus', 'festival');
    startVisit(sim.state, 'zeus', 'pose', { x: 30.5, z: 20.25 });
    sim.run(ARRIVE_TICKS + 200 + BLESS_TICKS);
    expect(sim.state.gods.walks.blessed.length).toBeGreaterThan(0);
    const back = decodeSave(encodeSave(sim.state, 0));
    if (!back.ok) throw new Error(back.why);
    expect(JSON.stringify(back.file.state)).toBe(JSON.stringify(sim.state));
  });

  it('a groundwork save (#town, state 48) and a phase 6 save (state 47) load through the migrations and play on', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/groundwork-town.save.json.gz')).toString();
    for (const strip of [false, true]) {
      let t = text;
      if (strip) {
        // (A phase 6 save is the same town without the gods, at state 47.)
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
      expect(s.gods.walks).toEqual(freshWalks());
      const sim = new Sim();
      sim.state = s;
      sim.run(TICKS_PER_MONTH);
      expect(startVisit(sim.state, 'demeter', 'loving')).not.toBeNull();
    }
  });

  it('the migration step fills only the walks, only where they are missing', () => {
    const s = demoSim('town').state as unknown as Record<string, unknown> & SimState;
    const old = JSON.parse(JSON.stringify(s));
    delete old.gods.walks;
    old.version = 49; // (the version before this step: 49, slice 55)
    expect(migrate(old)).toBe(49);
    expect(old.version).toBe(SIM_STATE_VERSION);
    expect(old.gods.walks).toEqual(freshWalks());
    expect(old.gods.walks.last).toEqual({});
    // (Already there: kept as it is.)
    const kept = JSON.parse(JSON.stringify(s));
    kept.gods.walks.next = 7;
    kept.version = 49;
    migrate(kept);
    expect(kept.gods.walks.next).toBe(7);
  });
});
