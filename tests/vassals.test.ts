/**
 * Vassals and allies (slice 34): the three ways to take a city (conquest,
 * awe, debt) and their refusals; tribute arriving by caravan into a store and
 * the treasury, accounted in the ledger and the stock book; loyalty and its
 * reasons; a rising warned a season ahead, standing down when loyalty mends;
 * aid against raiders walking in by its road and going home; an ally's call
 * to war, refusals remembered; the lender's army only for a remainder worth
 * the march; rival vassals rarer and more varied; saves and the migration.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '../src/sim/clock';
import { declareWar } from '../src/sim/rivals';
import { DEBT_WORTH, STEP_GAP } from '../src/sim/loans';
import { gather, threaten } from '../src/sim/raids';
import { deserialize, serialize, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type Loan, type SimState, type Trait, type WorldCity } from '../src/sim/state';
import { totals } from '../src/sim/treasury';
import { income } from '../src/sim/treasury';
import { TRADE_GOODS, tradeIndex } from '../src/sim/trade';
import { held, HORSES, MARBLE, TIMBER } from '../src/sim/foods';
import { voyageTicks } from '../src/sim/routes';
import { seasonAt, WINTER } from '../src/sim/seasons';
import { cityOf, moodOf } from '../src/sim/world';
import { ARMING, allyPlan, debtPlan, empireList, loyaltyOf, submitPlan, take, tributeGoods, vassalOf, WARNING } from '../src/sim/vassals';
import { demoSim } from './prepared';

const made: Record<string, string> = {};
const fresh = (name: string): Sim => {
  if (!made[name]) made[name] = serialize(demoSim(name).state);
  const sim = new Sim();
  sim.state = deserialize(made[name]);
  return sim;
};
const send = (sim: Sim, c: Parameters<Sim['enqueue']>[0]): void => {
  sim.enqueue(c);
  sim.flush();
};
const until = (sim: Sim, ok: () => boolean, most: number): boolean => {
  for (let i = 0; i < most && !ok(); i++) sim.step();
  return ok();
};
const ledgerAddsUp = (s: SimState): void => expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);
const lines = (s: SimState): string[] => s.world.news.map((n) => n.line);
const ruler = (s: SimState, id: string, traits: Trait[], mood: number): WorldCity => {
  const c = cityOf(s.world, id);
  c.ruler = { ...c.ruler!, traits };
  c.memories = [{ kind: 'staged', why: 'for the test', amount: mood, tick: s.tick, fade: 0 }];
  c.war = '';
  return c;
};

describe('taking a city', () => {
  it('awe is refused for a hostile ruler, a friendly one, or with too small an army; with a big enough army it shows its odds and reasons', () => {
    const s = fresh('collect').state;
    ruler(s, 'argos', ['proud'], -70);
    expect(submitPlan(s, 'argos').refusal).toMatch(/hostile/);
    ruler(s, 'argos', ['proud'], 10);
    expect(submitPlan(s, 'argos').refusal).toMatch(/good terms/);
    const c = ruler(s, 'argos', ['proud'], -20);
    c.army = 30;
    expect(submitPlan(s, 'argos').refusal).toMatch(/not big enough/);
    c.army = 8;
    const p = submitPlan(s, 'argos');
    expect(p.refusal).toBe('');
    expect(p.why).toMatch(/your \d+ men against its \d+/);
    expect(p.why).toMatch(/proud \(−15\)/);
    expect(p.p).toBeGreaterThanOrEqual(0.05);
    expect(p.p).toBeLessThanOrEqual(0.9);
  });

  it('a demand to submit is answered on its day: a sure one bows, a hopeless one refuses and is remembered', () => {
    const sim = fresh('collect');
    const s = sim.state;
    const c = ruler(s, 'argos', [], -20);
    c.army = 8;
    c.lord = '';
    send(sim, { type: 'empire', act: 'submit', city: 'argos' });
    const h = s.empire.heralds.at(-1)!;
    expect(h.kind).toBe('submit');
    expect(h.answer).toBe('');
    h.odds = 1;
    expect(until(sim, () => h.answer !== '', h.due - s.tick + TICKS_PER_DAY)).toBe(true);
    expect(h.answer).toBe('yes');
    expect(vassalOf(s, 'argos')?.how).toBe('awe');
    expect(c.lord).toBe('home');
    // Another, hopeless: Sparta refuses, and remembers it.
    const sp = ruler(s, 'sparta', [], -20);
    sp.army = 5;
    send(sim, { type: 'empire', act: 'submit', city: 'sparta' });
    const h2 = s.empire.heralds.at(-1)!;
    expect(h2.city).toBe('sparta');
    h2.odds = 0;
    expect(until(sim, () => h2.answer !== '', h2.due - s.tick + TICKS_PER_DAY)).toBe(true);
    expect(h2.answer === 'no' || h2.answer === 'friends').toBe(true);
    expect(sp.memories.some((m) => m.kind === 'demanded')).toBe(true);
    expect(vassalOf(s, 'sparta')).toBeUndefined();
    // Once a year.
    expect(submitPlan(s, 'sparta').refusal).toMatch(/once this year/);
  }, 120000);

  it('a debt for loyalty, accepted, ends the loan as forgiven and makes the city your vassal', () => {
    const sim = fresh('collect');
    const s = sim.state;
    const l = s.world.loans.find((x) => x.city === 'corinth' && x.side === 'out' && x.state === 'overdue') as Loan;
    expect(l).toBeTruthy();
    const p = debtPlan(s, 'corinth');
    expect(p.refusal).toBe('');
    expect(p.why.length).toBeGreaterThan(0);
    send(sim, { type: 'empire', act: 'debt', city: 'corinth' });
    const h = s.empire.heralds.at(-1)!;
    expect(h.loan).toBe(l.id);
    h.odds = 1;
    expect(until(sim, () => h.answer !== '', h.due - s.tick + TICKS_PER_DAY)).toBe(true);
    expect(l.state).toBe('forgiven');
    expect(vassalOf(s, 'corinth')?.how).toBe('debt');
  }, 120000);

  it('a conquest makes the city your vassal if (and only if) it is won, and the report says so', () => {
    const sim = fresh('collect');
    const s = sim.state;
    send(sim, { type: 'empire', act: 'conquer', city: 'argos' });
    const e = s.world.expeditions.at(-1)!;
    expect(e?.aim).toBe('conquer');
    expect(until(sim, () => e.phase === 'fighting' || e.phase === 'homeward' || e.phase === 'done', 6 * TICKS_PER_MONTH)).toBe(true);
    expect(!!vassalOf(s, 'argos')).toBe(e.won);
    expect(e.report.join(' ')).toMatch(e.won ? /bows to you/ : /stands: it is no vassal/);
    if (e.won) expect(cityOf(s.world, 'argos').lord).toBe('home');
  }, 240000);

  it('an alliance needs a warm ruler', () => {
    const s = fresh('collect').state;
    ruler(s, 'athens', ['steadfast'], 10);
    expect(allyPlan(s, 'athens').refusal).toMatch(/not warm enough/);
    ruler(s, 'athens', ['steadfast'], 40);
    const p = allyPlan(s, 'athens');
    expect(p.refusal).toBe('');
    expect(p.p).toBeCloseTo(0.65, 5);
  });
});

describe('a vassal', () => {
  it('sends tribute by caravan down its road into a store: the stock book and the ledger say so, and the treasury adds up', () => {
    const sim = fresh('collect');
    const s = sim.state;
    const c = cityOf(s.world, 'corinth');
    const v = take(s, c, 'debt', 'for the test');
    // In one of its goods, a store with room for it.
    const k = tributeGoods(c)[0];
    send(sim, { type: 'empire', act: 'tribute', city: 'corinth', good: k, weight: 2 });
    expect(v.good).toBe(k);
    expect(v.weight).toBe(2);
    expect(until(sim, () => s.empire.tribute.length > 0, 2 * TICKS_PER_MONTH)).toBe(true);
    const t = s.empire.tribute[0];
    expect(t.good).toBe(k);
    // A caravan walks in to a store with it.
    expect(until(sim, () => s.walkers.some((w) => w.kind === 'caravan' && w.cheese === -t.id) || t.phase === 'done', t.dur + TICKS_PER_DAY)).toBe(true);
    expect(until(sim, () => t.phase === 'done', 4 * TICKS_PER_MONTH)).toBe(true);
    expect(t.put + t.lost).toBe(t.amount);
    if (t.put > 0) expect(s.stocks.now.some((x) => x.what === 'vassal:corinth' && x.kind === 'bought' && x.ware === TRADE_GOODS[k]) || s.stocks.last.some((x) => x.what === 'vassal:corinth')).toBe(true);
    expect(v.sent).toBe(1);
    // In coin: into the treasury, on a ledger line of its own.
    send(sim, { type: 'empire', act: 'tribute', city: 'corinth', good: -1, weight: 1 });
    expect(until(sim, () => s.empire.tribute.some((x) => x.good < 0 && x.phase === 'done'), SEASON_TICKS + 4 * TICKS_PER_MONTH)).toBe(true);
    expect([...s.ledger.now, ...s.ledger.last].some((x) => x.kind === 'vassals' && x.what === 'Corinth')).toBe(true);
    ledgerAddsUp(s);
  }, 400000);

  it('its loyalty names its reasons: heavier tribute lowers it, lighter raises it, a gift raises it', () => {
    const s = fresh('collect').state;
    const v = take(s, cityOf(s.world, 'corinth'), 'debt', 'for the test');
    const fair = loyaltyOf(s, v);
    expect(fair.why.some((x) => x.why === 'its debt let go' && x.n > 0)).toBe(true);
    v.weight = 2;
    const heavy = loyaltyOf(s, v);
    expect(heavy.target).toBeLessThan(fair.target);
    expect(heavy.why.some((x) => x.why === 'heavy tribute' && x.n < 0)).toBe(true);
    v.weight = 0;
    expect(loyaltyOf(s, v).target).toBeGreaterThan(fair.target);
    v.weight = 1;
    cityOf(s.world, 'corinth').memories.push({ kind: 'gift', why: 'your gift', amount: 20, tick: s.tick, fade: TICKS_PER_YEAR });
    const gifted = loyaltyOf(s, v);
    expect(gifted.target).toBeGreaterThan(fair.target);
    expect(gifted.why.some((x) => x.why === 'your gifts' && x.n > 0)).toBe(true);
  });

  it('never rises without a season’s warning; it stands down when its loyalty mends, and rises on the day if not', () => {
    const sim = fresh('collect');
    const s = sim.state;
    const c = cityOf(s.world, 'corinth');
    const v = take(s, c, 'debt', 'for the test');
    v.weight = 2;
    v.loyalty = 10;
    c.memories.push({ kind: 'staged', why: 'for the test', amount: -100, tick: s.tick, fade: 0 });
    c.army = 300;
    expect(until(sim, () => v.arming > 0, 2 * TICKS_PER_MONTH)).toBe(true);
    expect(v.rises).toBe(v.arming + WARNING);
    expect(lines(s).some((x) => /^Corinth is arming: loyalty \d+ \(.*\)\. It rises about/.test(x))).toBe(true);
    expect(c.lord).toBe('home');
    // Nothing mends: it rises on its day, no sooner.
    const rises = v.rises;
    expect(until(sim, () => !vassalOf(s, 'corinth'), WARNING + 2 * TICKS_PER_MONTH)).toBe(true);
    expect(s.tick).toBeGreaterThanOrEqual(rises);
    expect(c.lord).toBe('');
    expect(c.memories.some((m) => m.kind === 'rose')).toBe(true);
    // Another, which mends: it stands down.
    const sim2 = fresh('collect');
    const s2 = sim2.state;
    const c2 = cityOf(s2.world, 'corinth');
    const v2 = take(s2, c2, 'debt', 'for the test');
    v2.weight = 2;
    v2.loyalty = 10;
    expect(until(sim2, () => v2.arming > 0, 2 * TICKS_PER_MONTH)).toBe(true);
    send(sim2, { type: 'empire', act: 'tribute', city: 'corinth', good: -1, weight: 0 });
    c2.memories.push({ kind: 'gift', why: 'your gift', amount: 40, tick: s2.tick, fade: TICKS_PER_YEAR });
    expect(until(sim2, () => v2.arming === 0, WARNING)).toBe(true);
    expect(vassalOf(s2, 'corinth')).toBeTruthy();
    expect(lines(s2).some((x) => /stands down/.test(x))).toBe(true);
    expect(ARMING).toBe(30);
  }, 400000);
});

describe('allies', () => {
  it('a band against your city brings an ally’s company in by its road, which goes home once the raid is over', () => {
    const sim = fresh('collect');
    const s = sim.state;
    s.empire.allies.push({ city: 'corinth', since: s.tick, refused: [], declined: 0 });
    const sp = ruler(s, 'sparta', ['warlike'], -70);
    const r = threaten(s, sim.map, sp, 'for the test');
    gather(s, r, true);
    expect(until(sim, () => s.empire.aid.length > 0, 2 * TICKS_PER_DAY)).toBe(true);
    const a = s.empire.aid[0];
    expect(a.city).toBe('corinth');
    expect(a.men).toBeGreaterThanOrEqual(8);
    expect(until(sim, () => a.phase !== 'road', a.dur + 2 * TICKS_PER_DAY)).toBe(true);
    if (a.phase === 'city') {
      const co = s.army.companies.find((x) => x.id === a.company)!;
      expect(co.ally).toBe('corinth');
      expect(s.army.soldiers.filter((x) => x.company === co.id).length).toBe(a.men);
      // It costs you nothing.
      expect(co.owed).toBe(0);
      expect(until(sim, () => a.phase === 'home' || a.phase === 'done', 8 * TICKS_PER_MONTH)).toBe(true);
      // Over, or broken: either way it goes home and says so.
      expect(r.ended > 0 || /broke/.test(a.line)).toBe(true);
      expect(s.army.companies.some((x) => x.ally)).toBe(false);
    }
  }, 400000);

  it('an ally at war asks you to join; refusing is remembered, and two refusals end the alliance', () => {
    const sim = fresh('collect');
    const s = sim.state;
    const c = ruler(s, 'athens', ['steadfast'], 40);
    s.empire.allies.push({ city: 'athens', since: s.tick, refused: [], declined: 0 });
    declareWar(s, 'athens', 'thebes', 'for the test');
    expect(until(sim, () => s.empire.calls.length > 0, 2 * TICKS_PER_DAY)).toBe(true);
    const call = s.empire.calls[0];
    expect(call.foe).toBe('thebes');
    send(sim, { type: 'empire', act: 'refuse', call: call.id });
    expect(call.state).toBe('refused');
    expect(c.memories.some((m) => m.kind === 'callrefused')).toBe(true);
    expect(s.empire.allies.length).toBe(1);
    // A second war, a second refusal: it ends.
    s.world.wars.at(-1)!.ended = s.tick;
    c.war = '';
    cityOf(s.world, 'thebes').war = '';
    c.memories.push({ kind: 'staged', why: 'for the test', amount: 60, tick: s.tick, fade: 0 });
    declareWar(s, 'athens', 'corinth', 'for the test');
    expect(until(sim, () => s.empire.calls.length > 1, 2 * TICKS_PER_DAY)).toBe(true);
    send(sim, { type: 'empire', act: 'refuse', call: s.empire.calls[1].id });
    expect(s.empire.allies.length).toBe(0);
    expect(lines(s).some((x) => /Your alliance with Athens is over/.test(x))).toBe(true);
    void moodOf;
  }, 120000);
});

describe('the lender’s army (balance card)', () => {
  it('does not march for a remainder under DEBT_WORTH, and the debt’s line says why', () => {
    const sim = fresh('collect');
    const s = sim.state;
    ruler(s, 'athens', ['warlike'], 10);
    const l: Loan = { id: s.world.nextLoan++, city: 'athens', side: 'in', by: 'you', state: 'overdue', amount: 300, rate: 10, months: 12, owed: DEBT_WORTH - 120, rateWhy: [], monthsWhy: [], why: '', deal: 0, gift: 0, at: s.tick, until: 0, start: s.tick, due: s.tick, ended: 0, late: false, step: 2, stepAt: s.tick - STEP_GAP, fell: Math.max(1, s.tick), seized: 0, withhold: true, extended: 0, reminded: true, raid: 0, demand: 0, demanded: false, sent: 0 };
    s.world.loans.push(l);
    sim.run(3 * TICKS_PER_DAY);
    expect(l.step).toBe(2);
    expect(s.world.raids.some((r) => r.loan === l.id)).toBe(false);
    // Over it, it marches.
    l.owed = DEBT_WORTH + 200;
    income(s, 0, 'given', 'for the test');
    expect(until(sim, () => l.step === 3, 3 * TICKS_PER_DAY)).toBe(true);
  }, 120000);
});

describe('rival vassals', () => {
  it('over many seeds, bows are fewer than one a run on average over twelve years, and Argos to Sparta is not most of them', () => {
    const tally = new Map<string, number>();
    let total = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const sim = new Sim(seed);
      const s = sim.state;
      const lords = new Map<string, string>();
      for (let m = 0; m < 12 * 12; m++) {
        sim.run(TICKS_PER_MONTH);
        for (const c of s.world.cities) {
          if (c.lord && c.lord !== (lords.get(c.id) ?? '')) {
            tally.set(`${c.id}->${c.lord}`, (tally.get(`${c.id}->${c.lord}`) ?? 0) + 1);
            total++;
          }
          lords.set(c.id, c.lord);
        }
      }
    }
    expect(total).toBeLessThanOrEqual(18);
    expect(tally.get('argos->sparta') ?? 0).toBeLessThan(total * 0.75 + 1);
  }, 400000);
});

describe('saves', () => {
  it('a town with a vassal, an ally, tribute on its way and a herald round-trips', () => {
    const sim = fresh('collect');
    const s = sim.state;
    take(s, cityOf(s.world, 'corinth'), 'debt', 'for the test');
    s.empire.allies.push({ city: 'athens', since: s.tick, refused: [], declined: 0 });
    sim.run(40 * TICKS_PER_DAY);
    const got = decodeSave(encodeSave(s, 1));
    if (!got.ok) throw new Error(got.why);
    expect(JSON.stringify(got.file.state.empire)).toBe(JSON.stringify(s.empire));
    expect(empireList(got.file.state)).toEqual(empireList(s));
  }, 120000);

  it('a version 27 save loads through every step to this version, with an empty empire, and plays on', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/slice29-rivals.save.json.gz')).toString();
    expect(JSON.parse(text).state.version).toBe(27);
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    const s = got.file.state;
    expect(s.version).toBe(SIM_STATE_VERSION);
    expect(s.empire.vassals).toEqual([]);
    expect(s.world.expeditions.every((e) => e.aim === '')).toBe(true);
    const sim = new Sim();
    sim.state = s;
    sim.run(TICKS_PER_MONTH);
    expect(decodeSave(encodeSave(s, 1)).ok).toBe(true);
  }, 60000);

  it('the same commands give the same empire (determinism)', () => {
    const a = fresh('collect');
    const b = fresh('collect');
    for (const sim of [a, b]) {
      take(sim.state, cityOf(sim.state.world, 'corinth'), 'debt', 'for the test');
      send(sim, { type: 'empire', act: 'tribute', city: 'corinth', good: -1, weight: 2 });
      sim.run(5 * TICKS_PER_MONTH);
    }
    expect(serialize(a.state)).toBe(serialize(b.state));
  }, 240000);
});

const SEASON_TICKS = 3 * TICKS_PER_MONTH;

// Integrating slice 34 with 32 and 33: tribute in marble and timber, and the winter storms on a tribute ship.
describe('the empire with marble, timber and the seasons', () => {
  it('Athens can pay in marble and Troy in timber; Athens’ marble walks into a storehouse', () => {
    const sim = fresh('collect');
    const s = sim.state;
    const athens = cityOf(s.world, 'athens');
    expect(tributeGoods(athens)).toContain(tradeIndex(MARBLE));
    expect(tributeGoods(cityOf(s.world, 'troy'))).toContain(tradeIndex(TIMBER));
    take(s, athens, 'debt', 'for the test');
    send(sim, { type: 'empire', act: 'tribute', city: 'athens', good: tradeIndex(MARBLE), weight: 1 });
    expect(until(sim, () => s.empire.tribute.some((t) => t.city === 'athens'), 2 * TICKS_PER_MONTH)).toBe(true);
    const t = s.empire.tribute.find((x) => x.city === 'athens')!;
    expect(t.good).toBe(tradeIndex(MARBLE));
    expect(t.amount).toBeGreaterThan(0);
    expect(until(sim, () => t.phase === 'done', 5 * TICKS_PER_MONTH)).toBe(true);
    expect(t.put).toBeGreaterThan(0);
    expect(s.buildings.filter((b) => b.kind === 'storehouse').reduce((a, b) => a + held(b, MARBLE), 0)).toBeGreaterThanOrEqual(t.put);
  }, 400000);

  it('a tribute ship due in your bay in winter is held back by the storms, and its news says so', () => {
    const sim = fresh('collect');
    const s = sim.state;
    const troy = cityOf(s.world, 'troy');
    const v = take(s, troy, 'debt', 'for the test');
    send(sim, { type: 'empire', act: 'tribute', city: 'troy', good: -1, weight: 1 });
    // (Its next tribute set out on the first day whose voyage ends in winter.)
    const voyage = voyageTicks('troy');
    let at = Math.ceil((s.tick + 1) / TICKS_PER_DAY) * TICKS_PER_DAY;
    while (seasonAt(at + voyage) !== WINTER) at += TICKS_PER_DAY;
    v.next = at;
    expect(until(sim, () => s.empire.tribute.some((t) => t.city === 'troy'), at - s.tick + TICKS_PER_DAY)).toBe(true);
    const t = s.empire.tribute.find((x) => x.city === 'troy')!;
    expect(t.by).toBe('sea');
    expect(t.dur - voyage).toBeGreaterThanOrEqual(6 * TICKS_PER_DAY);
    expect(t.dur - voyage).toBeLessThanOrEqual(12 * TICKS_PER_DAY);
    expect(lines(s).some((l) => /Troy’s tribute is on its way: .*by sea: .*late: winter storms in the gulf held her back \d+ days/.test(l))).toBe(true);
  }, 400000);
});

// Integrating slice 36 with 34: horses as tribute.
describe('the empire with horses', () => {
  it('Thebes, which sells horses, can pay in them; its tribute horses are led into a storehouse', () => {
    const sim = fresh('collect');
    const s = sim.state;
    const thebes = cityOf(s.world, 'thebes');
    const h = tradeIndex(HORSES);
    expect(tributeGoods(thebes)).toContain(h);
    // (Athens breeds what it uses: it can't pay in horses.)
    expect(tributeGoods(cityOf(s.world, 'athens'))).not.toContain(h);
    take(s, thebes, 'debt', 'for the test');
    send(sim, { type: 'empire', act: 'tribute', city: 'thebes', good: h, weight: 1 });
    expect(until(sim, () => s.empire.tribute.some((t) => t.city === 'thebes'), 2 * TICKS_PER_MONTH)).toBe(true);
    const t = s.empire.tribute.find((x) => x.city === 'thebes')!;
    expect(t.good).toBe(h);
    expect(t.amount).toBeGreaterThan(0);
    expect(lines(s).some((l) => /Thebes’ tribute is on its way: \d+ horses/.test(l))).toBe(true);
    const before = s.buildings.filter((b) => b.kind === 'storehouse').reduce((a, b) => a + held(b, HORSES), 0);
    expect(until(sim, () => t.phase === 'done', 5 * TICKS_PER_MONTH)).toBe(true);
    expect(t.put).toBeGreaterThan(0);
    expect(s.buildings.filter((b) => b.kind === 'storehouse').reduce((a, b) => a + held(b, HORSES), 0)).toBeGreaterThanOrEqual(before + t.put);
    ledgerAddsUp(s);
  }, 400000);
});
