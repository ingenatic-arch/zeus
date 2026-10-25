// Slice 45: the court and the prison. The caught walked to the court and tried by the law; each punishment and
// what it falls back to; hard labour unpaid; the prison's unrest, warned of before the breakout; the monthly
// crime rate; watchmen helping each other; and saves.
import { describe, expect, it } from 'vitest';
import { coastMap } from '../src/map/bake';
import { crimesStreets } from '../src/game/demos';
import { decodeSave, encodeSave } from '../src/game/saves';
import { findBuilding, livedIn } from '../src/sim/buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { caught, isCriminal, setOutAs, temptationOf, THIEF_FINE } from '../src/sim/crime';
import { ageOf } from '../src/sim/folk';
import { awayAt, canWorkIn, convictsAt } from '../src/sim/labour';
import {
  CELLS,
  courtFor,
  justiceMoods,
  LABOUR_MONTHS,
  perThousand,
  pinnedAt,
  postsInReach,
  prisoners,
  RATE_KINDS,
  STOCKS_DAYS,
  UNREST_WARN,
  type Case,
  type Punishment,
} from '../src/sim/justice';
import { Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type Building, type SimState } from '../src/sim/state';
import { kindTotal, totals, WAGE, wageBill } from '../src/sim/treasury';
import { newWalker } from '../src/sim/walk';
import { demoSim } from './prepared';
import { ALARM, NEWS, POPUP_KINDS, WARNING, type Message } from '../src/sim/messages';

const map = coastMap();
const size = map.size;
const ledgerAddsUp = (s: SimState): void => expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);
const until = (sim: Sim, ok: () => boolean, most: number): boolean => {
  for (let i = 0; i < most && !ok(); i++) sim.step();
  return ok();
};
const fines = (s: SimState): number => kindTotal(s.ledger.now, 'fines');

/** A grown member of one of #court's hut streets with nobody of the house away or out (and the house). */
function someone(s: SimState, not: number[] = []): { home: Building; name: string; female: boolean } {
  for (const home of crimesStreets(s)) {
    if (!livedIn(home) || !home.family || not.includes(home.id) || awayAt(s, home) > 0) continue;
    if (s.walkers.some((w) => w.home === home.id && w.people > 0 && (isCriminal(w.kind) || w.kind === 'convict'))) continue;
    const m = home.family.members.find((p) => ageOf(s, p) >= 16 && ageOf(s, p) <= 60);
    if (m) return { home, name: m.name, female: m.female };
  }
  throw new Error('nobody free in the streets');
}
/** A case of theft for one of them, tried today. */
function caseFor(s: SimState, who: { home: Building; name: string; female: boolean }): Case {
  const court = s.buildings.find((b) => b.kind === 'court')!;
  const x: Case = { home: who.home.id, name: who.name, female: who.female, kind: 'theft', gang: false, court: court.id, since: s.tick, trial: s.tick };
  s.crime.cases.push(x);
  return x;
}
/** Set the law for theft (a command, as the court's panel sends it). */
function law(sim: Sim, p: Punishment): void {
  sim.enqueue({ type: 'law', crime: 'theft', punishment: p });
  sim.flush();
}
/** #court's town, a theft before the court today under a law. */
function trial(p: Punishment): { sim: Sim; s: SimState; who: ReturnType<typeof someone>; x: Case } {
  const sim = demoSim('court');
  const s = sim.state;
  law(sim, p);
  const who = someone(s);
  const x = caseFor(s, who);
  expect(until(sim, () => !s.crime.cases.includes(x), 2 * TICKS_PER_DAY)).toBe(true);
  return { sim, s, who, x };
}
const lastSentence = (b: Building): string[] => [...(b.family?.story ?? [])].reverse().find((e) => e.what === 'sentence')?.names ?? [];

describe('the walk to the court', () => {
  it('#court opens on a thief walked to the court by a watchman; handed in, a case, and the watchman back on his round', () => {
    const sim = demoSim('court');
    const s = sim.state;
    const convict = s.walkers.find((w) => w.kind === 'convict' && w.people > 0)!;
    expect(convict).toBeDefined();
    const man = s.walkers.find((w) => w.id === convict.meat)!;
    expect(man.kind).toBe('watchman');
    expect(man.meat).toBe(convict.id);
    const home = findBuilding(s, convict.home)!;
    // Caught with a court at work: told so, and no fine on the spot.
    const caughtStory = [...home.family!.story].reverse().find((e) => e.what === 'caught')!;
    expect(caughtStory.names[2]).toBe('court');
    const before = fines(s);
    expect(until(sim, () => convict.people === 0, 30 * TICKS_PER_DAY)).toBe(true);
    const x = s.crime.cases.find((c) => c.home === home.id)!;
    expect(x).toBeDefined();
    expect(x.kind).toBe('theft');
    expect(s.crime.news.some((n) => n.kind === 'court')).toBe(true);
    expect(until(sim, () => man.meat === 0, 5 * TICKS_PER_DAY)).toBe(true);
    // Tried within days, by the law (the stocks for theft): pinned at an agora for five days.
    expect(until(sim, () => !s.crime.cases.includes(x), 5 * TICKS_PER_DAY)).toBe(true);
    expect(lastSentence(home)[1]).toBe('stocks');
    expect(s.buildings.some((a) => a.kind === 'agora' && pinnedAt(s, a).some((p) => p.home === home.id))).toBe(true);
    expect(fines(s)).toBe(before);
    ledgerAddsUp(s);
  });

  it('its history tried an arsonist (to prison) and a crooked collector (to the stocks)', () => {
    const s = demoSim('court').state;
    expect(s.crime.held.some((x) => x.kind === 'arson' && x.as === 'prison')).toBe(true);
    expect(s.crime.stocks.some((p) => p.kind === 'skimming')).toBe(true);
    expect(kindTotal(s.ledger.now, 'skimmed') + kindTotal(s.ledger.last, 'skimmed')).toBeLessThan(0);
  });

  it('with no court the watch can reach, nobody is walked there', () => {
    const s = demoSim('court').state;
    const court = s.buildings.find((b) => b.kind === 'court')!;
    // (A road tile out of reach: none; a staffed court near the streets: it.)
    expect(courtFor(s, size, -1)).toBeNull();
    const street = crimesStreets(s)[0];
    const from = s.tiles.findIndex((v, t) => v === -1 && Math.abs((t % size) - street.x) <= 2 && Math.abs(Math.floor(t / size) - street.z) <= 2);
    expect(courtFor(s, size, from)?.court).toBe(court);
    court.workers = 0;
    expect(courtFor(s, size, from)).toBeNull();
  });
});

describe('the law', () => {
  it('a fine: the household pays, as without a court', () => {
    const { s, who } = trial('fine');
    expect(lastSentence(who.home)[1]).toBe('fine');
    expect(s.crime.news.at(-1)!.line).toContain(`${THIEF_FINE[Math.min(who.home.level, THIEF_FINE.length - 1)]} dr`);
    ledgerAddsUp(s);
  });

  it('the stocks: five days pinned at the agora, the household shamed, the quarter round it held back', () => {
    const { sim, s, who } = trial('stocks');
    const agora = s.buildings.find((a) => a.kind === 'agora' && pinnedAt(s, a).some((p) => p.home === who.home.id))!;
    expect(agora).toBeDefined();
    expect(justiceMoods(s, who.home).some((m) => m.text.startsWith('Shamed'))).toBe(true);
    const near = s.buildings.find((b) => livedIn(b) && b !== who.home && Math.abs(b.x - agora.x) <= 6 && Math.abs(b.z - agora.z) <= 6)!;
    expect(temptationOf(s, size, near).reasons.some((r) => r.text.includes('stood in the stocks'))).toBe(true);
    sim.run((STOCKS_DAYS - 1) * TICKS_PER_DAY);
    expect(pinnedAt(s, agora).some((p) => p.home === who.home.id)).toBe(true);
    sim.run(TICKS_PER_DAY + 1);
    expect(pinnedAt(s, agora).some((p) => p.home === who.home.id)).toBe(false);
  });

  it('prison: a worker short at home, and home again when it is served', () => {
    const { sim, s, who } = trial('prison');
    const x = s.crime.held.find((h) => h.home === who.home.id)!;
    expect(x.as).toBe('prison');
    expect(awayAt(s, who.home)).toBe(1);
    expect(canWorkIn(s, who.home)).toBe(Math.max(0, Math.floor(who.home.people * 0.5) - 1));
    x.until = s.tick + 1;
    sim.run(TICKS_PER_DAY + 1);
    expect(s.crime.held.includes(x)).toBe(false);
    expect(who.home.family!.story.at(-1)!.what).toBe('freed');
  });

  it('hard labour with no quarry or mine: prison instead, said so', () => {
    const { s, who } = trial('labour');
    expect(s.crime.held.find((h) => h.home === who.home.id)?.as).toBe('prison');
    expect(s.crime.news.some((n) => n.line.includes('no quarry or copper mine'))).toBe(true);
  });

  it('exile: the whole household walks out, its home left empty', () => {
    const { s, who } = trial('exile');
    expect(who.home.people).toBe(0);
    expect(who.home.family).toBeNull();
    expect(s.crime.cut.what).toBe('exile');
    const poor = s.buildings.find((b) => livedIn(b) && b.level <= 3 && b.family)!;
    expect(justiceMoods(s, poor).some((m) => m.text.startsWith('The poor grumble'))).toBe(true);
    ledgerAddsUp(s);
  });

  it('execution: one fewer in the house, which mourns; the city sombre; kind rulers hear', () => {
    const sim = demoSim('court');
    const s = sim.state;
    const kind = s.world.cities.filter((c) => c.ruler?.traits.some((t) => t === 'generous' || t === 'pious'));
    const before = kind.map((c) => c.memories.length);
    law(sim, 'execution');
    const who = someone(s);
    const people = who.home.people;
    const x = caseFor(s, who);
    expect(until(sim, () => !s.crime.cases.includes(x), 2 * TICKS_PER_DAY)).toBe(true);
    expect(who.home.people).toBe(people - 1);
    expect(who.home.family!.members.some((m) => m.name === who.name && m.female === who.female)).toBe(false);
    expect(justiceMoods(s, who.home).some((m) => m.text.startsWith('Mourning'))).toBe(true);
    const other = s.buildings.find((b) => livedIn(b) && b.family && b !== who.home)!;
    expect(justiceMoods(s, other).some((m) => m.text.startsWith('The city is sombre'))).toBe(true);
    kind.forEach((c, i) => {
      expect(c.memories.length).toBe(before[i] + 1);
      expect(c.memories.at(-1)!.kind).toBe('harsh');
    });
  });

  it('the law is a command, refused for what it doesn’t know', () => {
    const sim = demoSim('court');
    const s = sim.state;
    sim.enqueue({ type: 'law', crime: 'arson', punishment: 'labour' });
    sim.enqueue({ type: 'law', crime: 'treason', punishment: 'exile' });
    sim.enqueue({ type: 'law', crime: 'theft', punishment: 'flogging' });
    sim.flush();
    expect(s.crime.law.arson).toBe('labour');
    expect(s.crime.law.theft).toBe('stocks');
    expect(Object.keys(s.crime.law)).not.toContain('treason');
  });
});

describe('hard labour', () => {
  it('a convict fills a quarry’s job unpaid: no wage for him on the ledger, and he goes home after', () => {
    const sim = demoSim('quarry');
    const s = sim.state;
    const quarry = s.buildings.find((b) => b.kind === 'quarry')!;
    // A court beside the quarry road (the first spot that takes one).
    const roads = s.tiles.map((v, t) => (v === -1 ? t : -1)).filter((t) => t >= 0 && Math.abs((t % size) - quarry.x) + Math.abs(Math.floor(t / size) - quarry.z) < 30);
    for (const t of roads) {
      if (s.buildings.some((b) => b.kind === 'court')) break;
      for (const [dx, dz] of [[1, 0], [-3, 0], [0, 1], [0, -3]]) {
        sim.enqueue({ type: 'build', kind: 'court', at: [t + dz * size + dx] });
        sim.flush();
        if (s.buildings.some((b) => b.kind === 'court')) break;
      }
    }
    const court = s.buildings.find((b) => b.kind === 'court')!;
    expect(court).toBeDefined();
    expect(until(sim, () => court.workers > 0, 3 * TICKS_PER_DAY)).toBe(true);
    law(sim, 'labour');
    const home = s.buildings.find((b) => livedIn(b) && b.family && b.family.members.some((m) => ageOf(s, m) >= 16 && ageOf(s, m) <= 60))!;
    const m = home.family!.members.find((p) => ageOf(s, p) >= 16 && ageOf(s, p) <= 60)!;
    const x: Case = { home: home.id, name: m.name, female: m.female, kind: 'theft', gang: false, court: court.id, since: s.tick, trial: s.tick };
    s.crime.cases.push(x);
    expect(until(sim, () => !s.crime.cases.includes(x), 2 * TICKS_PER_DAY)).toBe(true);
    const held = s.crime.held.find((h) => h.home === home.id)!;
    expect(held.as).toBe('labour');
    expect(held.at).toBe(quarry.id);
    expect(held.until - s.tick).toBeLessThanOrEqual(LABOUR_MONTHS * TICKS_PER_MONTH);
    // The next sharing of work: he fills a job, and the wage bill leaves him out.
    expect(until(sim, () => s.tick % TICKS_PER_DAY === 1, TICKS_PER_DAY)).toBe(true);
    expect(convictsAt(s, quarry)).toBe(1);
    expect(quarry.workers).toBeGreaterThanOrEqual(1);
    let bill = 0;
    for (const b of s.buildings) bill += (b.workers - convictsAt(s, b)) * WAGE * (b.kind === 'home' || b.kind === 'rubble' ? 0 : 1);
    expect(wageBill(s)).toBeLessThanOrEqual(bill);
    // Paid on the first of the month: the quarry owes for its free workers only.
    expect(until(sim, () => s.tick % TICKS_PER_MONTH === 1, TICKS_PER_MONTH + 1)).toBe(true);
    ledgerAddsUp(s);
    held.until = s.tick + 1;
    sim.run(TICKS_PER_DAY + 1);
    expect(s.crime.held.includes(held)).toBe(false);
    expect(convictsAt(s, quarry)).toBe(0);
  });
});

describe('the prison', () => {
  it('#jailbreak: crowded, the town is warned first; then the prisoners break out and run home as criminals', () => {
    const sim = demoSim('jailbreak');
    const s = sim.state;
    const prison = s.buildings.find((b) => b.kind === 'prison')!;
    const j = s.crime.jails.find((x) => x.at === prison.id)!;
    expect(prisoners(s, prison).length).toBeGreaterThan(CELLS);
    expect(j.unrest).toBeGreaterThanOrEqual(UNREST_WARN);
    expect(j.warned).toBeGreaterThan(0);
    expect(s.crime.news.some((n) => n.kind === 'unrest' && n.tick === j.warned)).toBe(true);
    const homes = new Set(prisoners(s, prison).map((x) => x.home));
    expect(until(sim, () => s.crime.news.some((n) => n.kind === 'breakout'), 15 * TICKS_PER_DAY)).toBe(true);
    expect(prisoners(s, prison).length).toBe(0);
    const runners = s.walkers.filter((w) => isCriminal(w.kind) && w.people > 0 && homes.has(w.home));
    expect(runners.length).toBeGreaterThan(0);
    expect(runners.every((w) => w.back)).toBe(true);
    ledgerAddsUp(s);
  });

  it('#jailbreak with a second prison built: the guards walk the overflow there, the unrest falls, and nobody breaks out', () => {
    const sim = demoSim('jailbreak');
    const s = sim.state;
    const first = s.buildings.find((b) => b.kind === 'prison')!;
    const j = s.crime.jails.find((x) => x.at === first.id)!;
    // Another prison beside a road near the first (the first spot that takes one).
    const roads = s.tiles.map((v, t) => (v === -1 ? t : -1)).filter((t) => t >= 0 && Math.abs((t % size) - first.x) + Math.abs(Math.floor(t / size) - first.z) < 20);
    for (const t of roads) {
      if (s.buildings.filter((b) => b.kind === 'prison').length > 1) break;
      for (const [dx, dz] of [[1, 0], [-3, 0], [0, 1], [0, -3]]) {
        sim.enqueue({ type: 'build', kind: 'prison', at: [t + dz * size + dx] });
        sim.flush();
        if (s.buildings.filter((b) => b.kind === 'prison').length > 1) break;
      }
    }
    const second = s.buildings.find((b) => b.kind === 'prison' && b !== first)!;
    expect(second).toBeDefined();
    expect(until(sim, () => prisoners(s, second).length > 0, 2 * TICKS_PER_DAY)).toBe(true);
    expect(prisoners(s, first).length).toBeLessThanOrEqual(CELLS);
    expect(s.crime.news.some((n) => n.kind === 'eased' && /walked .+ to the prison/.test(n.line))).toBe(true);
    const was = j.unrest;
    sim.run(15 * TICKS_PER_DAY);
    expect(s.crime.news.some((n) => n.kind === 'breakout')).toBe(false);
    expect(j.unrest).toBeLessThan(was);
    ledgerAddsUp(s);
  });
});

describe('the crime rate', () => {
  it('a month’s crimes close into the record by kind, with the city’s people for the rate per thousand', () => {
    const sim = demoSim('court');
    const s = sim.state;
    const month = Math.floor(s.tick / TICKS_PER_MONTH);
    const before = [...s.crime.rate.n];
    expect(until(sim, () => Math.floor(s.tick / TICKS_PER_MONTH) > month && s.tick % TICKS_PER_DAY > 9 - 1, TICKS_PER_MONTH + TICKS_PER_DAY)).toBe(true);
    sim.run(TICKS_PER_DAY);
    const r = s.crime.rates.find((x) => x.month === month)!;
    expect(r).toBeDefined();
    expect(r.n.length).toBe(RATE_KINDS.length);
    r.n.forEach((n, i) => expect(n).toBeGreaterThanOrEqual(before[i]));
    expect(r.people).toBeGreaterThan(0);
    const total = r.n.reduce((a, b) => a + b, 0);
    expect(perThousand(r, r.people)).toBeCloseTo((1000 * total) / r.people);
  });
});

describe('the watch together', () => {
  it('#court’s two posts are in reach of each other', () => {
    const s = demoSim('court').state;
    const posts = s.buildings.filter((b) => b.kind === 'watchpost' && b.x === 91);
    expect(posts.length).toBe(2);
    expect(postsInReach(s, size, posts[0], posts[1])).toBe(true);
  });

  it('a gang’s man beats off a lone watchman, never two', () => {
    const sim = demoSim('gang');
    const s = sim.state;
    const g = s.crime.gangs[0];
    const den = findBuilding(s, g.den)!;
    const target = s.buildings.find((b) => livedIn(b) && b.level >= 4)!;
    const man = setOutAs(s, size, den, { kind: 'theft', target, part: -1 }, Math.floor(s.tick / TICKS_PER_DAY), false) ?? s.walkers.find((w) => w.home === den.id && isCriminal(w.kind) && w.people > 0)!;
    expect(man).toBeDefined();
    const post = s.buildings.find((b) => b.kind === 'watchpost')!;
    const one = newWalker(s, 'watchman', 1);
    one.origin = post.id;
    one.path = [...man.path];
    one.tiles = [...man.tiles];
    s.walkers.push(one);
    // Alone: beaten off.
    expect(caught(s, sim.map, man, one)).toBe(false);
    // With another watchman after him too: caught.
    const two = newWalker(s, 'watchman', 1);
    two.origin = post.id;
    two.meat = man.id;
    two.path = [...man.path];
    two.tiles = [...man.tiles];
    s.walkers.push(two);
    one.meat = man.id;
    expect(caught(s, sim.map, man, one)).toBe(true);
  });
});

describe('the same town twice, and saves', () => {
  it('#court plays the same twice, and keeps through a save (cases, prisoners and the stocks)', () => {
    const run = (): string => {
      const sim = demoSim('court');
      sim.run(20 * TICKS_PER_DAY);
      return encodeSave(sim.state, 1);
    };
    const a = run();
    expect(run()).toBe(a);
    const got = decodeSave(a);
    if (!got.ok) throw new Error(got.why);
    expect(encodeSave(got.file.state, 1)).toBe(a);
    const j = decodeSave(encodeSave(demoSim('jailbreak').state, 1));
    if (!j.ok) throw new Error(j.why);
    expect(j.file.state.crime.held.length).toBeGreaterThan(CELLS);
    expect(j.file.state.crime.jails.length).toBe(1);
  });

  it('a save from before the court (version 42) loads with the default law and nobody held, and plays on', () => {
    const s = demoSim('crimes').state;
    const old = JSON.parse(encodeSave(s, 1));
    // (A migration step's own test: a save as the trunk wrote it just before slice 45 merged, version 42 (slice 48's).)
    old.state.version = 42;
    for (const k of ['law', 'cases', 'held', 'stocks', 'jails', 'rate', 'rates', 'cut']) delete old.state.crime[k];
    const got = decodeSave(JSON.stringify(old));
    if (!got.ok) throw new Error(got.why);
    const c = got.file.state.crime;
    expect(got.file.state.version).toBe(SIM_STATE_VERSION);
    expect(c.law).toEqual({ theft: 'stocks', pickpocket: 'stocks', vandal: 'stocks', arson: 'prison', smuggling: 'fine', gang: 'prison' });
    expect([c.cases, c.held, c.stocks, c.jails, c.rates]).toEqual([[], [], [], [], []]);
    expect(c.rate.month).toBe(Math.floor(s.tick / TICKS_PER_MONTH));
    const sim = new Sim();
    sim.state = got.file.state;
    sim.run(TICKS_PER_MONTH);
    ledgerAddsUp(sim.state);
  });

  it('a save whose law names an unknown punishment is refused in plain words', () => {
    const old = JSON.parse(encodeSave(demoSim('court').state, 1));
    old.state.crime.law.theft = 'flogging';
    const got = decodeSave(JSON.stringify(old));
    expect(got.ok).toBe(false);
  });
});

// Merge of slice 45 with the trunk: slice 48's paused workplaces, the stocks as away from work, and slice 44's messages.
describe('the court and the prison on the trunk', () => {
  it('one in the stocks is away from work for his days there, and back after', () => {
    const { sim, s, who } = trial('stocks');
    expect(awayAt(s, who.home)).toBe(1);
    expect(canWorkIn(s, who.home)).toBe(Math.max(0, Math.floor(who.home.people * 0.5) - 1));
    sim.run(STOCKS_DAYS * TICKS_PER_DAY + 1);
    // (Still remembered round the agora, but home and at work.)
    expect(s.crime.stocks.some((p) => p.home === who.home.id)).toBe(true);
    expect(awayAt(s, who.home)).toBe(0);
  });

  it('a paused quarry takes no convicts, and one already there when it is paused stays held, unpaid', () => {
    const sim = demoSim('quarry');
    const s = sim.state;
    const quarry = s.buildings.find((b) => b.kind === 'quarry')!;
    const roads = s.tiles.map((v, t) => (v === -1 ? t : -1)).filter((t) => t >= 0 && Math.abs((t % size) - quarry.x) + Math.abs(Math.floor(t / size) - quarry.z) < 30);
    for (const t of roads) {
      if (s.buildings.some((b) => b.kind === 'court')) break;
      for (const [dx, dz] of [[1, 0], [-3, 0], [0, 1], [0, -3]]) {
        sim.enqueue({ type: 'build', kind: 'court', at: [t + dz * size + dx] });
        sim.flush();
        if (s.buildings.some((b) => b.kind === 'court')) break;
      }
    }
    const court = s.buildings.find((b) => b.kind === 'court')!;
    expect(until(sim, () => court.workers > 0, 3 * TICKS_PER_DAY)).toBe(true);
    law(sim, 'labour');
    const grown = (b: Building): boolean => !!b.family && b.family.members.some((m) => ageOf(s, m) >= 16 && ageOf(s, m) <= 60);
    const tryOne = (not: number[]): { home: Building; x: Case } => {
      const home = s.buildings.find((b) => livedIn(b) && grown(b) && !not.includes(b.id) && awayAt(s, b) === 0)!;
      const m = home.family!.members.find((p) => ageOf(s, p) >= 16 && ageOf(s, p) <= 60)!;
      const x: Case = { home: home.id, name: m.name, female: m.female, kind: 'theft', gang: false, court: court.id, since: s.tick, trial: s.tick };
      s.crime.cases.push(x);
      expect(until(sim, () => !s.crime.cases.includes(x), 2 * TICKS_PER_DAY)).toBe(true);
      return { home, x };
    };
    const first = tryOne([]);
    const held = s.crime.held.find((h) => h.home === first.home.id)!;
    expect(held.as).toBe('labour');
    expect(held.at).toBe(quarry.id);
    // Paused: its workers go, the convict with them stays held there, and nothing is paid for him.
    sim.enqueue({ type: 'work', id: quarry.id, paused: true });
    sim.flush();
    sim.run(2 * TICKS_PER_DAY);
    expect(quarry.workers).toBe(0);
    expect(s.crime.held.includes(held)).toBe(true);
    expect(awayAt(s, first.home)).toBe(1);
    expect(wageBill(s)).toBeGreaterThanOrEqual(0);
    // The next sentenced to hard labour goes elsewhere (a mine, or prison with no other), never to the paused quarry.
    const next = tryOne([first.home.id]);
    const h2 = s.crime.held.find((h) => h.home === next.home.id);
    if (h2) expect(h2.at).not.toBe(quarry.id);
    expect(until(sim, () => s.tick % TICKS_PER_MONTH === 1, TICKS_PER_MONTH + 1)).toBe(true);
    ledgerAddsUp(s);
  });

  it('#jailbreak in the town’s messages: the unrest a warning, told once; the breakout an alarm that may pop up', () => {
    const sim = demoSim('jailbreak');
    const s = sim.state;
    const warned = (): Message[] => s.messages.log.filter((m) => m.kind === 'crime' && /guards are restless/.test(m.words));
    expect(warned().length).toBe(1);
    expect(warned()[0].u).toBe(WARNING);
    expect(until(sim, () => s.messages.log.some((m) => m.kind === 'breakout'), 15 * TICKS_PER_DAY)).toBe(true);
    const broke = s.messages.log.filter((m) => m.kind === 'breakout');
    expect(broke.length).toBe(1);
    expect(broke[0].u).toBe(ALARM);
    expect(POPUP_KINDS).toContain('breakout');
    expect(warned().length).toBe(1);
    // A sentence and the court's news are plain news.
    expect(s.messages.log.filter((m) => m.kind === 'crime' && /^The court /.test(m.words)).every((m) => m.u === NEWS)).toBe(true);
  });
});
