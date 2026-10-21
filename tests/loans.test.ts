/**
 * Loans both ways (slice 27): terms that follow mood, wealth and character,
 * each reason named; refusals; asking, accepting and repaying (on time, early,
 * overdue and paid later); lending, taken or sent back; how likely a borrower
 * is to repay, and the dice that follow it; the rulers' own offers and asks,
 * with the requests' calm; the ledger; saves and the version 22 save.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '../src/sim/clock';
import { answerRefusal, ASK_AFTER, firstRoute, MOST_OPEN, openDeals } from '../src/sim/favours';
import {
  askRefusal,
  BASE_RATE,
  lendRefusal,
  likelyToRepay,
  loanOfDeal,
  loanTerms,
  LOAN_GAP,
  LOAN_WORTH,
  makeLoanAsk,
  makeLoanOffer,
  offerAnswer,
  owedOf,
  paidOnTime,
  spareOf,
} from '../src/sim/loans';
import { deserialize, serialize, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type Loan, type SimState, type Trait, type WorldCity } from '../src/sim/state';
import { income, kindTotal, pay, totals, wageBill } from '../src/sim/treasury';
import { cityOf, moodOf } from '../src/sim/world';
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
const ledgerAddsUp = (s: SimState): void => expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);
const until = (sim: Sim, ok: () => boolean, most: number): boolean => {
  for (let i = 0; i < most && !ok(); i++) sim.step();
  return ok();
};
/** A ruler with these traits and a mood of exactly `mood` (one memory). */
const ruler = (s: SimState, id: 'athens' | 'sparta' | 'corinth' | 'troy', traits: Trait[], mood: number): WorldCity => {
  const c = cityOf(s.world, id);
  c.ruler = { ...c.ruler!, traits };
  c.memories = [{ kind: 'staged', why: 'for the test', amount: mood, tick: s.tick, fade: 0 }];
  c.war = '';
  c.harvest = 2;
  return c;
};
const loanIn = (s: SimState, city: string): Loan | undefined => s.world.loans.find((l) => l.city === city && l.side === 'in' && l.ended === 0);
const loanOut = (s: SimState, city: string): Loan | undefined => s.world.loans.find((l) => l.city === city && l.side === 'out' && l.ended === 0);

describe('terms', () => {
  it('follow mood, wealth and character, and every reason adds up to the rate', () => {
    const s = fresh('caravan').state;
    const plain = loanTerms(s, ruler(s, 'corinth', ['pious', 'warlike'], 10));
    expect(plain.rate).toBe(BASE_RATE + plain.rateWhy.reduce((a, x) => a + x.n, 0));
    expect(plain.rateWhy.map((x) => x.why)).toEqual(['cordial', 'Corinth is rich', 'your city owes no one']);
    const greedy = loanTerms(s, ruler(s, 'corinth', ['greedy', 'pious'], 10));
    expect(greedy.rate).toBe(plain.rate + 5);
    const warm = loanTerms(s, ruler(s, 'corinth', ['pious', 'warlike'], 40));
    expect(warm.rate).toBeLessThan(plain.rate);
    expect(warm.months).toBeGreaterThan(plain.months);
    const shrewd = loanTerms(s, ruler(s, 'corinth', ['shrewd', 'pious'], 10));
    expect(shrewd.months).toBeLessThan(plain.months);
    // Sparta keeps little coin: dearer than Corinth on the same mood and character.
    const sparta = loanTerms(s, ruler(s, 'sparta', ['pious', 'warlike'], 10));
    expect(sparta.rate).toBe(plain.rate + 4);
    expect(spareOf(s, cityOf(s.world, 'sparta')).spare).toBeLessThan(spareOf(s, cityOf(s.world, 'corinth')).spare);
    // At war: dearer, and they can spare half.
    const war = ruler(s, 'corinth', ['pious', 'warlike'], 10);
    const before = spareOf(s, war).spare;
    war.war = 'athens';
    expect(loanTerms(s, war).rate).toBe(plain.rate + 3);
    expect(spareOf(s, war).spare).toBe(Math.floor(before / 2 / 500) * 500);
  });

  it('the reasons add up to the terms even where a bound holds them (wary and shrewd: no loan runs shorter than six months)', () => {
    const s = fresh('caravan').state;
    const t = loanTerms(s, ruler(s, 'troy', ['shrewd', 'fickle'], -10));
    expect(t.months).toBe(6);
    expect(t.months).toBe(12 + t.monthsWhy.reduce((a, x) => a + x.n, 0));
    expect(t.monthsWhy.at(-1)?.why).toMatch(/no loan runs shorter/);
    expect(t.rate).toBe(BASE_RATE + t.rateWhy.reduce((a, x) => a + x.n, 0));
  });

  it('a ruler who asks to borrow from you, or was beaten lately, has no coin to lend you, and offers none', () => {
    const s = fresh('caravan').state;
    const c = ruler(s, 'corinth', ['pious', 'warlike'], 40);
    const spare = spareOf(s, c).spare;
    s.world.wars.push({ ...(s.world.wars[0] ?? {}), id: 98, a: 'athens', b: 'corinth', fate: 'athens', start: s.tick - 100, until: s.tick - 30, ended: s.tick - 30 } as (typeof s.world.wars)[number]);
    expect(spareOf(s, c).spare).toBeLessThan(spare);
    expect(loanTerms(s, c).rateWhy.some((x) => /beaten by Athens/.test(x.why))).toBe(true);
    makeLoanAsk(s, c, 1000);
    expect(lendRefusal(s, c)).toMatch(/is borrowing from you, not lending/);
    expect(askRefusal(s, 'corinth', 500)).toMatch(/is borrowing from you/);
  });

  it('a cold ruler refuses; a wary one with no route refuses; being in debt elsewhere makes it dearer', () => {
    const s = fresh('caravan').state;
    expect(lendRefusal(s, ruler(s, 'corinth', ['pious', 'warlike'], -40))).toMatch(/does not lend to a city he is cold towards|she is cold/);
    // (#caravan's town has a road to Corinth, none to Sparta.)
    expect(lendRefusal(s, ruler(s, 'sparta', ['pious', 'warlike'], -5))).toMatch(/barely knows/);
    expect(lendRefusal(s, ruler(s, 'corinth', ['pious', 'warlike'], -5))).toBe('');
    expect(askRefusal(s, 'corinth', 5000)).toBe('Corinth can spare 2,500 dr at most now');
    const c = ruler(s, 'corinth', ['pious', 'warlike'], 10);
    const t0 = loanTerms(s, c).rate;
    s.world.loans.push({ id: 99, city: 'athens', side: 'in', by: 'you', state: 'running', amount: 1000, rate: 10, months: 12, owed: 1100, rateWhy: [], monthsWhy: [], why: '', deal: 0, gift: 0, at: s.tick, until: 0, start: s.tick, due: s.tick + TICKS_PER_YEAR, ended: 0, late: false, step: 0, stepAt: 0, fell: 0, seized: 0, withhold: false, extended: 0, reminded: false, raid: 0, demand: 0, demanded: false, sent: 0 });
    expect(loanTerms(s, c).rate).toBe(t0 + 4);
    expect(loanTerms(s, c).rateWhy.some((x) => x.why === 'you owe Athens already')).toBe(true);
  });
});

describe('borrowing', () => {
  it('ask, the answer, accept, the coin, repaid on the day: ledger lines, the memory and your name', () => {
    const sim = fresh('caravan');
    const s = sim.state;
    const c = ruler(s, 'corinth', ['pious', 'warlike'], 10);
    income(s, 3000, 'given', 'for the test');
    send(sim, { type: 'loan', act: 'ask', city: 'corinth', amount: 2000 });
    const l = loanIn(s, 'corinth')!;
    expect(l.state).toBe('asking');
    expect(s.world.gifts.some((g) => g.loan === l.id && g.amount === 0)).toBe(true);
    expect(askRefusal(s, 'corinth', 1000)).toMatch(/herald is on his way/);
    expect(until(sim, () => l.state !== 'asking', 2 * TICKS_PER_MONTH)).toBe(true);
    expect(l.state).toBe('terms');
    expect(l.rate).toBe(loanTerms(s, c).rate);
    expect(l.owed).toBe(owedOf(2000, l.rate));
    sim.run(3);
    send(sim, { type: 'loan', act: 'accept', loan: l.id });
    expect(l.state).toBe('coming');
    // (Due at the start of the day it names, however late in the day it was agreed, so it is settled on that day.)
    expect(l.due % TICKS_PER_DAY).toBe(0);
    expect(l.due).toBe(Math.floor(l.start / TICKS_PER_DAY) * TICKS_PER_DAY + l.months * TICKS_PER_MONTH);
    const money = s.money;
    expect(until(sim, () => l.state === 'running', 2 * TICKS_PER_MONTH)).toBe(true);
    expect(kindTotal(s.ledger.now, 'borrowed')).toBe(2000);
    expect(s.money).toBeGreaterThanOrEqual(money + 2000 - 400);
    ledgerAddsUp(s);
    // On the day it is paid from the treasury, and the herald takes it.
    income(s, 3000, 'given', 'for the test');
    const mood = moodOf(c, s.tick);
    expect(until(sim, () => l.state === 'repaying', l.due - s.tick + TICKS_PER_DAY)).toBe(true);
    expect(s.tick).toBe(l.due);
    expect(kindTotal(s.ledger.now, 'repaid')).toBe(-l.owed);
    expect(until(sim, () => l.state === 'repaid', 2 * TICKS_PER_MONTH)).toBe(true);
    expect(l.late).toBe(false);
    expect(c.memories.some((m) => m.kind === 'loanrepaid' && m.amount === LOAN_WORTH.repaid)).toBe(true);
    expect(moodOf(c, s.tick)).toBeGreaterThan(mood - 2);
    expect(paidOnTime(s.world, s.tick)).toBe(1);
    expect(loanTerms(s, c).rateWhy.some((x) => x.why === 'Greece knows you pay your debts')).toBe(true);
    ledgerAddsUp(s);
  }, 60000);

  it('repaid early, the whole sum; and overdue when the treasury can’t, then paid as soon as it can', () => {
    const sim = fresh('caravan');
    const s = sim.state;
    ruler(s, 'corinth', ['pious', 'warlike'], 10);
    send(sim, { type: 'loan', act: 'ask', city: 'corinth', amount: 1000 });
    const l = loanIn(s, 'corinth')!;
    until(sim, () => l.state === 'terms', 2 * TICKS_PER_MONTH);
    send(sim, { type: 'loan', act: 'accept', loan: l.id });
    until(sim, () => l.state === 'running', 2 * TICKS_PER_MONTH);
    // Early: refused while the treasury can't spare it, paid in full when it can.
    const early = deserialize(serialize(s));
    const e = new Sim();
    e.state = early;
    const el = early.world.loans.find((x) => x.id === l.id)!;
    income(early, 5000, 'given', 'for the test');
    send(e, { type: 'loan', act: 'repay', loan: el.id });
    expect(el.state).toBe('repaying');
    expect(kindTotal(early.ledger.now, 'repaid')).toBe(-el.owed);
    ledgerAddsUp(early);
    // Overdue: an empty treasury on the day.
    sim.run(Math.max(0, l.due - s.tick - TICKS_PER_DAY));
    s.money = 0;
    s.ledger.start = 0;
    s.ledger.now = [];
    until(sim, () => l.state !== 'running', 2 * TICKS_PER_DAY);
    expect(l.state).toBe('overdue');
    expect(askRefusal(s, 'athens', 500)).not.toBe('');
    income(s, l.owed + 2000, 'given', 'for the test');
    until(sim, () => l.state === 'repaying', 2 * TICKS_PER_DAY);
    expect(l.state).toBe('repaying');
    expect(l.late).toBe(true);
    until(sim, () => l.state === 'repaid', 2 * TICKS_PER_MONTH);
    expect(paidOnTime(s.world, s.tick)).toBe(0);
    ledgerAddsUp(s);
  }, 60000);
});

describe('lending', () => {
  it('a ruler in need takes a fair loan; one not in need sends a dear one back; and the coin comes home', () => {
    const s = fresh('caravan').state;
    const c = ruler(s, 'corinth', ['pious', 'warlike'], 10);
    expect(offerAnswer(s, c, 1000, 10).take).toBe(false);
    expect(offerAnswer(s, c, 1000, 5).take).toBe(true);
    c.war = 'athens';
    expect(offerAnswer(s, c, 1000, 15).take).toBe(true);
    expect(offerAnswer(s, c, 1000, 20).take).toBe(false);
    expect(offerAnswer(s, c, 9000, 10).take).toBe(false);
    c.ruler!.traits = ['proud', 'pious'];
    c.war = '';
    // (Beaten by Athens a few days ago: in need, but not at war.)
    s.world.wars.push({ ...(s.world.wars[0] ?? {}), id: 99, a: 'athens', b: 'corinth', fate: 'athens', start: s.tick - 100, until: s.tick - 30, ended: s.tick - 30 } as (typeof s.world.wars)[number]);
    expect(offerAnswer(s, c, 1000, 10).need).toBe(true);
    expect(offerAnswer(s, c, 1000, 10).why).toMatch(/proud/);
  });

  it('offered, sent back with its reason, the coin home again; offered in need, taken, and repaid or overdue on the day', () => {
    const sim = fresh('caravan');
    const s = sim.state;
    income(s, 5000, 'given', 'for the test');
    const c = ruler(s, 'corinth', ['pious', 'steadfast'], 10);
    send(sim, { type: 'loan', act: 'offer', city: 'corinth', amount: 1000, rate: 15, months: 6 });
    const back = loanOut(s, 'corinth')!;
    expect(kindTotal(s.ledger.now, 'lent')).toBe(-1000);
    until(sim, () => back.ended > 0, 3 * TICKS_PER_MONTH);
    expect(back.state).toBe('declined');
    expect(back.why).toMatch(/needs no coin/);
    ledgerAddsUp(s);
    c.harvest = 0;
    // (Their harvest failed in the last four months: set the time just after one.)
    send(sim, { type: 'loan', act: 'offer', city: 'corinth', amount: 1000, rate: 10, months: 6 });
    const l = loanOut(s, 'corinth')!;
    until(sim, () => l.state !== 'offering', 3 * TICKS_PER_MONTH);
    if (l.state === 'returning') {
      // (The harvest's four months may have passed: then they no longer need it.)
      expect(l.why).toMatch(/needs no coin/);
      return;
    }
    expect(l.state).toBe('running');
    expect(c.memories.some((m) => m.kind === 'lent')).toBe(true);
    until(sim, () => l.state !== 'running', l.due - s.tick + 2 * TICKS_PER_DAY);
    expect(['repaying', 'overdue']).toContain(l.state);
    if (l.state === 'repaying') {
      until(sim, () => l.state === 'repaid', 3 * TICKS_PER_MONTH);
      expect(kindTotal(s.ledger.now, 'repayment') + kindTotal(s.ledger.last, 'repayment')).toBeGreaterThan(0);
    }
    ledgerAddsUp(s);
  }, 60000);

  it('how likely to repay moves with character, war and harvest; the dice follow it', () => {
    const s = fresh('caravan').state;
    const c = ruler(s, 'corinth', ['steadfast', 'pious'], 40);
    const good = likelyToRepay(s, c, 1000, 10);
    expect(good.word).toBe('likely');
    c.ruler!.traits = ['fickle', 'greedy'];
    c.war = 'athens';
    c.memories[0].amount = -10;
    const bad = likelyToRepay(s, c, 6000, 20);
    expect(bad.word).toBe('doubtful');
    expect(bad.why.filter((x) => !x.up).map((x) => x.why)).toEqual(expect.arrayContaining(['fickle', 'at war with Athens', 'more than they can easily repay', 'a heavy rate']));
  });
});

describe('the rulers’ own offers and asks', () => {
  it('an offer taken brings the coin; an ask lent lifts the mood, refused costs a little', () => {
    const sim = fresh('caravan');
    const s = sim.state;
    const c = ruler(s, 'corinth', ['pious', 'warlike'], 20);
    const d = makeLoanOffer(s, c, 1500);
    const l = loanOfDeal(s.world, d.id)!;
    expect(l.state).toBe('proposed');
    expect(openDeals(s.world)).toContain(d);
    send(sim, { type: 'answer', deal: d.id, act: 'take' });
    expect(d.state).toBe('met');
    expect(l.state).toBe('coming');
    until(sim, () => l.state === 'running', 2 * TICKS_PER_MONTH);
    expect(kindTotal(s.ledger.now, 'borrowed') + kindTotal(s.ledger.last, 'borrowed')).toBe(1500);
    const sparta = ruler(s, 'sparta', ['pious', 'warlike'], 5);
    sparta.war = 'athens';
    const ask = makeLoanAsk(s, sparta, 1000);
    expect(answerRefusal(s, sim.map, ask, 'send')).toMatch(/can’t spare|^$/);
    income(s, 3000, 'given', 'for the test');
    expect(answerRefusal(s, sim.map, ask, 'send')).toBe('');
    const refused = deserialize(serialize(s));
    const r = new Sim();
    r.state = refused;
    send(r, { type: 'answer', deal: ask.id, act: 'refuse' });
    expect(cityOf(refused.world, 'sparta').memories.some((m) => m.kind === 'loanrefused' && m.amount < 0)).toBe(true);
    send(sim, { type: 'answer', deal: ask.id, act: 'send' });
    const lent = loanOfDeal(s.world, ask.id)!;
    expect(lent.state).toBe('sending');
    until(sim, () => lent.state === 'running', 2 * TICKS_PER_MONTH);
    expect(sparta.memories.some((m) => m.kind === 'lent' && m.amount >= LOAN_WORTH.lent * 0.75)).toBe(true);
    ledgerAddsUp(s);
  }, 60000);

  it('come only six months after the first route, never more than two deals open, one a ruler; and a save mid-loan plays on the same', () => {
    const sim = fresh('caravan');
    const s = sim.state;
    const first = firstRoute(s.world);
    income(s, 20000, 'given', 'for the test');
    let loans = 0;
    for (let day = 0; day < 4 * 360; day++) {
      sim.run(TICKS_PER_DAY);
      const open = openDeals(s.world);
      expect(open.length).toBeLessThanOrEqual(MOST_OPEN);
      expect(new Set(open.map((d) => d.city)).size).toBe(open.length);
      for (const d of open) {
        if (d.kind !== 'loanoffer' && d.kind !== 'loanask') continue;
        expect(d.at).toBeGreaterThanOrEqual(first + ASK_AFTER);
        loans++;
      }
    }
    ledgerAddsUp(s);
    // (On this town's seed, one ruler offers or asks in the four years.)
    expect(loans).toBeGreaterThan(0);
  }, 180000);

  it('have a turn of their own (slice 29): a lean town meets an offer from a cordial ruler within a year, and loan deals come at least four months apart', () => {
    const sim = fresh('caravan');
    const s = sim.state;
    for (const id of ['athens', 'sparta', 'corinth', 'troy'] as const) ruler(s, id, ['pious', 'warlike'], 5);
    const first = firstRoute(s.world);
    const at: number[] = [];
    const offers: string[] = [];
    while (s.tick < first + ASK_AFTER + TICKS_PER_YEAR) {
      // (Lean: the treasury kept under two months' wages.)
      const most = Math.max(100, wageBill(s));
      if (s.money > most) pay(s, most - s.money, 'given', 'for the test');
      sim.run(TICKS_PER_DAY);
      for (const d of s.world.deals) {
        if ((d.kind === 'loanoffer' || d.kind === 'loanask') && !at.includes(d.at)) {
          at.push(d.at);
          if (d.kind === 'loanoffer') offers.push(d.why);
        }
      }
    }
    expect(offers.length).toBeGreaterThan(0);
    expect(offers[0]).toMatch(/treasury is low/);
    for (let i = 1; i < at.length; i++) expect(at[i] - at[i - 1]).toBeGreaterThanOrEqual(LOAN_GAP);
    ledgerAddsUp(s);
  }, 180000);

  it('a save with a loan on the road round-trips and plays on identically', () => {
    const sim = fresh('caravan');
    const s = sim.state;
    ruler(s, 'corinth', ['pious', 'warlike'], 10);
    send(sim, { type: 'loan', act: 'ask', city: 'corinth', amount: 1000 });
    sim.run(5 * TICKS_PER_DAY);
    const text = encodeSave(s, 0);
    const back = decodeSave(text);
    if (!back.ok) throw new Error(back.why);
    const b = new Sim();
    b.state = back.file.state;
    sim.run(3 * TICKS_PER_MONTH);
    b.run(3 * TICKS_PER_MONTH);
    expect(serialize(b.state)).toBe(serialize(s));
  }, 60000);
});

describe('old saves', () => {
  it('a slice 23 save (version 22, two companies) loads with no loans and plays on', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/slice23-companies.save.json.gz')).toString();
    expect(JSON.parse(text).state.version).toBe(22);
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    const s = got.file.state;
    expect(s.version).toBe(SIM_STATE_VERSION);
    expect(s.world.loans).toEqual([]);
    expect(s.world.nextLoan).toBe(1);
    const sim = new Sim();
    sim.state = s;
    sim.run(TICKS_PER_MONTH);
    expect(decodeSave(encodeSave(s, 1)).ok).toBe(true);
  }, 60000);

  it('a slice 24 save (version 23, Sparta’s band on its way) loads with no loans and plays on', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/slice24-battle.save.json.gz')).toString();
    expect(JSON.parse(text).state.version).toBe(23);
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    const s = got.file.state;
    expect(s.version).toBe(SIM_STATE_VERSION);
    expect(s.world.loans).toEqual([]);
    expect(s.world.nextLoan).toBe(1);
    expect(s.world.raids.length).toBe(1);
    const sim = new Sim();
    sim.state = s;
    sim.run(TICKS_PER_MONTH);
    expect(decodeSave(encodeSave(s, 1)).ok).toBe(true);
  }, 60000);
});
