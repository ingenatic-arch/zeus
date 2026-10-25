// Slice 41: crimes of every kind. Which crime a home's trouble turns it to; pickpockets, vandals (and the
// inspector who mends what they smash), arsonists after talk, smugglers and crooked tax collectors; who is caught;
// gangs that gather, form, beat off a lone watchman and are broken by two watch posts; and the switch that keeps
// earlier towns as they were.
import { describe, expect, it } from 'vitest';
import { coastMap } from '../src/map/bake';
import { crimesStreets } from '../src/game/demos';
import { decodeSave, encodeSave } from '../src/game/saves';
import { livedIn } from '../src/sim/buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { crimeFor, isCriminal, moodCtx, setOutAs, startChase, TEMPT_FALL, TEMPT_FULL, temptationOf, THIEF_FINE, type CrimeKind, type Temptation } from '../src/sim/crime';
import { GANG_BREAK, GANG_FORM, GANG_WARN, postsReaching } from '../src/sim/gangs';
import { tell } from '../src/sim/folk';
import { FIRE_NONE } from '../src/sim/hazards';
import { crimeTargetsFrom, REPAIR, TALK_DAYS } from '../src/sim/misdeeds';
import { createState, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type Building, type SimState, type Walker } from '../src/sim/state';
import { HARSH } from '../src/sim/taxes';
import { kindTotal, totals } from '../src/sim/treasury';
import { newWalker } from '../src/sim/walk';
import { demoSim } from './prepared';

const map = coastMap();
const size = map.size;
const ledgerAddsUp = (s: SimState): void => expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);
const until = (sim: Sim, ok: () => boolean, most: number): boolean => {
  for (let i = 0; i < most && !ok(); i++) sim.step();
  return ok();
};
/** No watchman anywhere: the posts' walkers gone, and no road walked by one. */
function noWatch(s: SimState): void {
  s.walkers = s.walkers.filter((w) => w.kind !== 'watchman');
  for (const b of s.buildings) if (b.kind === 'watchpost') b.clock = 1e9;
  s.rounds.fire.walked.fill(0);
}
/** The criminals out now (and none else: a test that sends its own clears the demo's). */
const criminals = (s: SimState): Walker[] => s.walkers.filter((w) => isCriminal(w.kind) && w.people > 0);
const clearCriminals = (s: SimState): void => void (s.walkers = s.walkers.filter((w) => !isCriminal(w.kind)));
/** #crimes' town with no criminal out and no watch. */
function crimesTown(): { sim: Sim; s: SimState } {
  const sim = demoSim('crimes');
  const s = sim.state;
  clearCriminals(s);
  noWatch(s);
  return { sim, s };
}
/** A home of #crimes' streets with somewhere in reach for a kind (upper street first for a pickpocket, lower for the others). */
function homeFor(s: SimState, kind: 'pickpocket' | 'vandal' | 'smuggling' | 'arson'): { home: Building; target: Building; part: number } {
  const homes = crimesStreets(s).filter((b) => livedIn(b) && b.family);
  for (const home of kind === 'pickpocket' ? homes : [...homes].reverse()) {
    const t = crimeTargetsFrom(s, size, home)[kind];
    if (t) return { home, target: t.target, part: t.part };
  }
  throw new Error(`no home with a ${kind} target`);
}
const send = (s: SimState, kind: CrimeKind, c: { home: Building; target: Building; part: number }): Walker => {
  const w = setOutAs(s, size, c.home, { kind, target: c.target, part: c.part }, Math.floor(s.tick / TICKS_PER_DAY), true);
  expect(w).not.toBeNull();
  return w!;
};

describe('which crime', () => {
  it('a home’s trouble picks its crime: pickpockets and smugglers from poor homes near the crowds and the quay, theft for envy, vandals angry and idle, arson the most aggrieved', () => {
    const { s } = crimesTown();
    const ctx = moodCtx(s);
    const kinds = new Set<string>();
    for (const b of crimesStreets(s)) {
      if (!livedIn(b) || !b.family) continue;
      const c = crimeFor(s, size, b, temptationOf(s, size, b, ctx));
      if (c) kinds.add(c.kind);
    }
    // The upper street (by the villas and the agora) and the lower (by the quay) between them.
    expect(kinds.has('pickpocket')).toBe(true);
    expect(kinds.has('smuggling')).toBe(true);
    expect(kinds.has('theft')).toBe(true);
    // The same home angry and idle smashes things; with every grievance, talk of burning comes first.
    const { home } = homeFor(s, 'vandal');
    const t = temptationOf(s, size, home, ctx);
    const angry: Temptation = { ...t, mood: 1, idle: true, envy: false };
    expect(crimeFor(s, size, home, angry)?.kind).toBe('vandal');
    expect(crimeFor(s, size, home, angry)?.why).toBe('angry and idle');
    const aggrieved: Temptation = { ...t, mood: 0, hungry: true, harsh: true };
    expect(crimeFor(s, size, home, aggrieved)?.kind).toBe('arson');
    // With the new kinds off, only theft (as slice 30).
    s.crime.kinds = false;
    expect(crimeFor(s, size, home, angry)?.kind ?? 'theft').toBe('theft');
    expect(crimeFor(s, size, home, aggrieved)?.kind ?? 'theft').toBe('theft');
  });

  it('a full home turns to its crime: a smuggler slips out of a poor home by the quay', () => {
    const { sim, s } = crimesTown();
    const { home } = homeFor(s, 'smuggling');
    const t = temptationOf(s, size, home);
    expect(crimeFor(s, size, home, t)?.kind).toBe('smuggling');
    // (Full, and kept so: its score alone would only let it ebb.)
    expect(
      until(
        sim,
        () => {
          if (criminals(s).some((w) => w.home === home.id)) return true;
          home.tempt = TEMPT_FULL + TEMPT_FALL;
          return false;
        },
        2 * TICKS_PER_DAY,
      ),
    ).toBe(true);
    expect(criminals(s).find((w) => w.home === home.id)!.kind).toBe('smuggler');
    expect(home.tempt).toBe(0);
  });
});

describe('the new crimes', () => {
  it('a pickpocket works the agora’s crowd: purses cut in the homes around, minded for a month, his household’s story', () => {
    const { sim, s } = crimesTown();
    const c = homeFor(s, 'pickpocket');
    const w = send(s, 'pickpocket', c);
    expect(until(sim, () => w.steps === 1, TICKS_PER_MONTH)).toBe(true);
    expect(until(sim, () => w.back, TICKS_PER_MONTH)).toBe(true);
    expect(w.load).toBeGreaterThan(0);
    const news = s.crime.news.at(-1)!;
    expect(news.kind).toBe('picked');
    const victims = s.buildings.filter((b) => b.family?.story.at(-1)?.what === 'picked');
    expect(victims.length).toBeGreaterThan(0);
    const v = victims[0];
    expect(temptationOf(s, size, v).mood).toBeDefined();
    expect(until(sim, () => !s.walkers.includes(w), TICKS_PER_MONTH)).toBe(true);
    const told = c.home.family!.story.at(-1)!;
    expect(told.what).toBe('misdeed');
    expect(told.names[1]).toBe('pickpocket');
    // The coin is the households', not the treasury's: nothing on the ledger.
    expect(s.ledger.now.some((l) => l.what?.includes('pickpocket'))).toBe(false);
    ledgerAddsUp(s);
  });

  it('a vandal smashes a fountain: no water carrier goes out from it until the inspector mends it, for a repair on the ledger', () => {
    const { sim, s } = crimesTown();
    const c = homeFor(s, 'vandal');
    const w = send(s, 'vandal', c);
    expect(until(sim, () => s.crime.broken.length > 0, TICKS_PER_MONTH)).toBe(true);
    const broken = s.crime.broken[0];
    expect(broken.at).toBe(c.target.id);
    expect(s.crime.news.some((n) => n.kind === 'smashed')).toBe(true);
    const target = c.target;
    // Broken, it sends nobody out (its clock held), for as long as it is broken.
    for (let i = 0; i < 3 * TICKS_PER_DAY && s.crime.broken.length; i++) {
      sim.step();
      if (s.crime.broken.length) expect(target.clock > 0 || target.walker !== 0).toBe(true);
    }
    expect(until(sim, () => !s.walkers.includes(w), TICKS_PER_MONTH)).toBe(true);
    // The inspector goes to it first, and mends it.
    expect(until(sim, () => s.crime.broken.length === 0, 3 * TICKS_PER_MONTH)).toBe(true);
    expect(s.crime.news.some((n) => n.kind === 'mended')).toBe(true);
    expect(-kindTotal(s.ledger.now, 'repairs') - kindTotal(s.ledger.last, 'repairs')).toBe(REPAIR[target.kind]);
    ledgerAddsUp(s);
  });

  it('a smuggler takes goods waiting on the quay: the stock book’s Smuggled away line, and his household eats it', () => {
    const { sim, s } = crimesTown();
    const c = homeFor(s, 'smuggling');
    const w = send(s, 'smuggling', c);
    expect(until(sim, () => w.back, TICKS_PER_MONTH)).toBe(true);
    expect(w.load).toBeGreaterThan(0);
    const line = s.stocks.now.find((l) => l.kind === 'lost' && l.what === 'Smuggled away');
    expect(line?.n).toBe(w.load);
    expect(s.crime.news.at(-1)!.kind).toBe('smuggled');
    expect(until(sim, () => !s.walkers.includes(w), TICKS_PER_MONTH)).toBe(true);
    expect(c.home.family!.story.at(-1)!.names[1]).toBe('smuggling');
    ledgerAddsUp(s);
  });

  it('talk of burning comes first; with no watchman by, the arsonist sets a fire about TALK_DAYS later, and only one at a time', () => {
    const { sim, s } = crimesTown();
    const { home } = homeFor(s, 'arson');
    // Hungry, harshly taxed and robbed lately.
    s.taxRate = HARSH;
    tell(s, home.family!, 'robbed', home.level);
    const grieve = (): void => {
      home.foodUntil = 0;
      home.meatUntil = 0;
      home.cheeseUntil = 0;
      home.grace = 0;
      home.taxedAt = s.tick;
    };
    grieve();
    const t = temptationOf(s, size, home);
    expect(t.hungry && t.harsh).toBe(true);
    home.tempt = TEMPT_FULL;
    expect(until(sim, () => s.crime.talk.length > 0, 2 * TICKS_PER_DAY)).toBe(true);
    expect(s.crime.talk[0].home).toBe(home.id);
    expect(s.crime.news.at(-1)!.kind).toBe('talk');
    expect(criminals(s).some((w) => w.kind === 'arsonist')).toBe(false);
    let out: Walker | undefined;
    for (let i = 0; i < (TALK_DAYS + 3) * TICKS_PER_DAY && !out; i++) {
      if (s.tick % TICKS_PER_DAY === 0) grieve();
      sim.step();
      out = criminals(s).find((w) => w.kind === 'arsonist');
    }
    expect(out).toBeDefined();
    expect(s.tick - s.crime.arsonAt).toBeGreaterThanOrEqual((TALK_DAYS - 1) * TICKS_PER_DAY);
    const target = s.buildings.find((b) => b.id === out!.target)!;
    expect(until(sim, () => target.fire !== FIRE_NONE || !s.walkers.includes(out!), TICKS_PER_MONTH)).toBe(true);
    expect(s.crime.news.some((n) => n.kind === 'arson')).toBe(true);
    // No more talk for a long while.
    home.tempt = TEMPT_FULL;
    sim.run(2 * TICKS_PER_DAY);
    expect(s.crime.talk.length).toBe(0);
  });

  it('talk of burning dies down when a watchman walks by', () => {
    const { sim, s } = crimesTown();
    const { home } = homeFor(s, 'arson');
    s.crime.talk.push({ home: home.id, since: s.tick, at: s.tick + TALK_DAYS * TICKS_PER_DAY });
    // A watchman's round over every road.
    s.rounds.fire.walked.fill(s.tick);
    sim.run(TICKS_PER_DAY + 1);
    expect(s.crime.talk.length).toBe(0);
    expect(s.crime.news.at(-1)!.kind).toBe('calmed');
  });

  it('a tax collector whose office’s wages are owed, and no watchman by, skims: the ledger’s Skimmed line, and the ledger adds up', () => {
    const sim = demoSim('crimes');
    const s = sim.state;
    noWatch(s);
    const office = s.buildings.find((b) => b.kind === 'taxoffice')!;
    let skimmed = 0;
    for (let i = 0; i < TICKS_PER_MONTH && skimmed === 0; i++) {
      office.owed = Math.max(office.owed, 1);
      sim.step();
      skimmed = -kindTotal(s.ledger.now, 'skimmed');
    }
    expect(skimmed).toBeGreaterThan(0);
    expect(s.ledger.now.find((l) => l.kind === 'skimmed')!.what).toBe('by the tax collector');
    expect(s.crime.news.some((n) => n.kind === 'skimmed')).toBe(true);
    ledgerAddsUp(s);
  });

  it('a watchman catches a smuggler: the goods go back, the fine is on the ledger, his house is told what he was caught at', () => {
    const { sim, s } = crimesTown();
    const c = homeFor(s, 'smuggling');
    const w = send(s, 'smuggling', c);
    expect(until(sim, () => w.back && w.load > 0, TICKS_PER_MONTH)).toBe(true);
    const lost = s.stocks.now.find((l) => l.kind === 'lost' && l.what === 'Smuggled away')!.n;
    const post = s.buildings.find((b) => b.kind === 'watchpost')!;
    const man = newWalker(s, 'watchman', 1);
    man.origin = post.id;
    man.path = [...w.path];
    man.tiles = [...w.tiles];
    man.seg = Math.max(0, w.seg - 1);
    man.along = 0;
    s.walkers.push(man);
    expect(startChase(s, map, man, w)).toBe(true);
    expect(until(sim, () => w.people === 0, TICKS_PER_MONTH)).toBe(true);
    expect(s.stocks.now.find((l) => l.kind === 'lost' && l.what === 'Smuggled away')?.n ?? 0).toBeLessThan(lost);
    expect(kindTotal(s.ledger.now, 'fines')).toBe(THIEF_FINE[c.home.level]);
    const caught = c.home.family!.story.at(-1)!;
    expect(caught.what).toBe('caught');
    expect(caught.names[1]).toBe('smuggling');
    expect(s.crime.news.at(-1)!.line).toMatch(/^A smuggler caught .*paid a \d+ dr fine$/);
    ledgerAddsUp(s);
  });
});

describe('gangs', () => {
  it('#thieves’ hut street left unwatched: the town hears a gang gathering a season before it takes a den', () => {
    const sim = demoSim('thieves');
    const s = sim.state;
    let warned = 0;
    for (let i = 0; i < 10 && s.crime.gangs.length === 0; i++) {
      sim.run(TICKS_PER_MONTH);
      if (!warned && s.crime.news.some((n) => n.kind === 'gathering')) warned = s.tick;
    }
    expect(warned).toBeGreaterThan(0);
    expect(s.crime.gangs.length).toBe(1);
    const g = s.crime.gangs[0];
    expect(g.formed - warned).toBeGreaterThanOrEqual((GANG_FORM - GANG_WARN - 1) * TICKS_PER_MONTH);
    const den = s.buildings.find((b) => b.id === g.den)!;
    expect(den.family!.story.at(-1)!.what).toBe('den');
    expect(s.crime.news.at(-1)!.kind === 'gang' || s.crime.news.some((n) => n.kind === 'gang')).toBe(true);
  }, 120000);

  it('#gang: its men beat off a lone watchman; a second watch post reaching the den breaks it up in GANG_BREAK days', () => {
    const sim = demoSim('gang');
    const s = sim.state;
    expect(s.crime.gangs.length).toBe(1);
    expect(s.crime.news.some((n) => n.kind === 'beaten')).toBe(true);
    const den = s.buildings.find((b) => b.id === s.crime.gangs[0].den)!;
    expect(postsReaching(s, size, den).length).toBe(1);
    sim.enqueue({ type: 'build', kind: 'watchpost', at: [24 * size + 80] });
    sim.flush();
    expect(until(sim, () => postsReaching(s, size, den).length >= 2, 10 * TICKS_PER_DAY)).toBe(true);
    const from = s.tick;
    expect(until(sim, () => s.crime.gangs.length === 0, (GANG_BREAK + 3) * TICKS_PER_DAY)).toBe(true);
    expect(s.tick - from).toBeGreaterThanOrEqual((GANG_BREAK - 1) * TICKS_PER_DAY);
    expect(s.crime.news.at(-1)!.kind === 'brokenup' || s.crime.news.some((n) => n.kind === 'brokenup')).toBe(true);
    expect(den.family!.story.at(-1)!.what).toBe('den');
    expect(den.family!.story.at(-1)!.n).toBe(0);
    ledgerAddsUp(s);
  });

  it('a gang whose den is emptied scatters', () => {
    const sim = demoSim('gang');
    const s = sim.state;
    const den = s.buildings.find((b) => b.id === s.crime.gangs[0].den)!;
    sim.enqueue({ type: 'clear', x0: den.x, z0: den.z, x1: den.x, z1: den.z });
    sim.flush();
    expect(s.buildings.includes(den)).toBe(false);
    sim.run(TICKS_PER_DAY + 1);
    expect(s.crime.gangs.length).toBe(0);
    expect(s.crime.news.some((n) => n.kind === 'scattered')).toBe(true);
  });
});

describe('the same town twice, saves and the switch', () => {
  it('#gang’s town plays the same twice, and keeps through a save', () => {
    const run = (): string => {
      const sim = demoSim('gang');
      sim.run(2 * TICKS_PER_MONTH);
      return encodeSave(sim.state, 1);
    };
    const a = run();
    expect(run()).toBe(a);
    const got = decodeSave(a);
    if (!got.ok) throw new Error(got.why);
    expect(encodeSave(got.file.state, 1)).toBe(a);
  });

  it('a slice 40 save (version 37) loads with the new kinds on and nothing broken, gathering or formed', () => {
    const s = demoSim('nowatch').state;
    const old = JSON.parse(encodeSave(s, 1));
    // (A migration step's own test: a save as slice 40 wrote it, whatever number this slice takes at merge.)
    old.state.version = 37;
    for (const k of ['kinds', 'broken', 'talk', 'arsonAt', 'heat', 'seats', 'gangs']) delete old.state.crime[k];
    for (const t of [old.state.crime.now, old.state.crime.last]) for (const k of ['picked', 'smashed', 'arson', 'smuggled', 'skimmed', 'beaten']) delete t[k];
    const got = decodeSave(JSON.stringify(old));
    if (!got.ok) throw new Error(got.why);
    const c = got.file.state.crime;
    expect(got.file.state.version).toBe(SIM_STATE_VERSION);
    expect(c.kinds).toBe(true);
    expect([c.broken, c.talk, c.heat, c.seats, c.gangs]).toEqual([[], [], [], [], []]);
    expect(c.now.beaten).toBe(0);
    const sim = new Sim();
    sim.state = got.file.state;
    sim.run(TICKS_PER_MONTH);
    ledgerAddsUp(sim.state);
  });

  it('with the switch off, a new game’s homes turn only to theft and no new kind walks', () => {
    expect(createState().crime.kinds).toBe(false);
    const s = demoSim('crimes').state;
    s.crime.kinds = false;
    clearCriminals(s);
    noWatch(s);
    for (const b of crimesStreets(s)) b.tempt = TEMPT_FULL;
    const sim2 = new Sim();
    sim2.state = s;
    sim2.run(2 * TICKS_PER_MONTH);
    expect(s.walkers.some((w) => isCriminal(w.kind) && w.kind !== 'thief')).toBe(false);
    expect(s.crime.broken.length + s.crime.talk.length + s.crime.gangs.length).toBe(0);
  });
});
