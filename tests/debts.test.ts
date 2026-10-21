/**
 * Debts unpaid (slice 28): your default and its steps in order (the reminder,
 * the warning and its memories, routes closed and goods seized, the lender's
 * threat and army, paid off by seizures or loot), asking for more time and
 * holding a payment back; a borrower's plea for time, forgiving, demanding;
 * expeditions (mustering at the edge, the march, the fight, the takings and
 * the report, Troy refused without ships); the ledger; saves mid-expedition
 * and the version 25 save.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { expeditionLine, expeditionOnMap, expeditionPlan, expeditionRefusal } from '../src/sim/expeditions';
import { held, OIL, setHeld } from '../src/sim/foods';
import { COLLECT_LULL, debtRefusal, LOAN_WORTH, loanTerms, REMIND, STEP_GAP, STORE_EVERY, STORE_SHARE, timeAnswer } from '../src/sim/loans';
import { lootValue, raidersOf } from '../src/sim/raids';
import { caravanYard } from '../src/sim/routes';
import { deserialize, serialize, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type Loan, type SimState, type Trait, type WorldCity } from '../src/sim/state';
import { TRADE_GOODS } from '../src/sim/trade';
import { income, kindTotal, totals } from '../src/sim/treasury';
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
const FIGHT_DAYS = 3;
const until = (sim: Sim, ok: () => boolean, most: number): boolean => {
  for (let i = 0; i < most && !ok(); i++) sim.step();
  return ok();
};
const ruler = (s: SimState, id: 'athens' | 'sparta' | 'corinth' | 'troy', traits: Trait[], mood: number): WorldCity => {
  const c = cityOf(s.world, id);
  c.ruler = { ...c.ruler!, traits };
  c.memories = [{ kind: 'staged', why: 'for the test', amount: mood, tick: s.tick, fade: 0 }];
  c.war = '';
  c.harvest = 2;
  return c;
};
/** A loan staged as already agreed, running and due in `days` (the herald's journeys left out). */
const staged = (s: SimState, city: 'athens' | 'sparta' | 'corinth' | 'troy', side: Loan['side'], amount: number, days: number): Loan => {
  const l: Loan = {
    id: s.world.nextLoan++,
    city,
    side,
    by: 'you',
    state: 'running',
    amount,
    rate: 10,
    months: 12,
    owed: Math.round(amount * 1.1),
    rateWhy: [{ why: 'staged', n: 0 }],
    monthsWhy: [],
    why: '',
    deal: 0,
    gift: 0,
    at: s.tick,
    until: 0,
    start: s.tick,
    due: Math.floor(s.tick / TICKS_PER_DAY) * TICKS_PER_DAY + days * TICKS_PER_DAY,
    ended: 0,
    late: false,
    step: 0,
    stepAt: 0,
    fell: 0,
    seized: 0,
    withhold: false,
    extended: 0,
    reminded: false,
    raid: 0,
    demand: 0,
    demanded: false,
    sent: 0,
  };
  s.world.loans.push(l);
  return l;
};
const lines = (s: SimState): string[] => s.world.news.map((n) => n.line);

describe('your default', () => {
  it('the reminder, then on the day the warning, its memories and dearer terms; two months on the road closes and goods are seized; then the threat', () => {
    const sim = fresh('caravan');
    const s = sim.state;
    const c = ruler(s, 'corinth', ['pious', 'warlike'], 10);
    ruler(s, 'athens', ['pious', 'warlike'], 10);
    const l = staged(s, 'corinth', 'in', 2000, 40);
    send(sim, { type: 'loan', act: 'withhold', loan: l.id });
    expect(l.withhold).toBe(true);
    expect(until(sim, () => l.reminded, 20 * TICKS_PER_DAY)).toBe(true);
    expect(l.due - s.tick).toBeLessThanOrEqual(REMIND);
    expect(lines(s).at(-1)).toMatch(/falls due in .* you have chosen to hold it back. You can ask for more time/);
    const before = loanTerms(s, cityOf(s.world, 'athens')).rate;
    income(s, 10000, 'given', 'for the test');
    expect(until(sim, () => l.state !== 'running', l.due - s.tick + 1)).toBe(true);
    // Held back: not paid though the treasury could.
    expect(l.state).toBe('overdue');
    expect(l.step).toBe(1);
    expect(l.fell).toBe(l.due);
    expect(c.memories.some((m) => m.kind === 'defaulted' && m.amount === LOAN_WORTH.defaulted)).toBe(true);
    expect(cityOf(s.world, 'athens').memories.some((m) => m.kind === 'defaultheard')).toBe(true);
    expect(loanTerms(s, cityOf(s.world, 'athens')).rateWhy.some((x) => x.why === 'Greece knows you failed to repay Corinth')).toBe(true);
    expect(loanTerms(s, cityOf(s.world, 'athens')).rate).toBeGreaterThan(before);
    expect(s.world.news.at(-1)?.urgent).toBe(true);
    // Two months on: step 2, the road closed, goods in the caravan yard seized.
    const route = s.world.routes.find((r) => r.city === 'corinth')!;
    expect(route).toBeTruthy();
    const ki = TRADE_GOODS.indexOf(OIL as never);
    route.sell[ki] = true;
    const yard = caravanYard(s)!;
    expect(until(sim, () => l.step === 2, STEP_GAP + TICKS_PER_DAY)).toBe(true);
    expect(route.closed).toBeGreaterThan(0);
    // (Slice 29: on step 2's first day the agents took from your stores too. Oil set in the yard just before the next day's
    // seizing, so the yard's porters can't carry it back to the storehouse the agents emptied.)
    const fromStores = l.seized;
    sim.run(TICKS_PER_DAY - 1);
    setHeld(yard, TRADE_GOODS[ki], 100);
    const owed = l.owed;
    sim.run(1);
    expect(held(yard, TRADE_GOODS[ki])).toBeLessThan(100);
    expect(l.seized).toBeGreaterThan(fromStores);
    expect(l.owed).toBe(owed - (l.seized - fromStores));
    expect(s.ledger.now.some((x) => x.kind === 'seized' && /Corinth · /.test(x.what))).toBe(true);
    expect(lines(s).some((x) => /seized .* in your caravan yard .* against your debt/.test(x))).toBe(true);
    ledgerAddsUp(s);
    // Two months more: the threat, for what is left, which paying settles.
    expect(until(sim, () => l.step === 3, STEP_GAP + TICKS_PER_DAY)).toBe(true);
    const r = s.world.raids.find((x) => x.id === l.raid)!;
    expect(r.loan).toBe(l.id);
    expect(r.coin).toBe(l.owed);
    send(sim, { type: 'answer', deal: r.deal, act: 'send' });
    expect(l.state).toBe('repaying');
    expect(r.ended).toBeGreaterThan(0);
    ledgerAddsUp(s);
    expect(until(sim, () => l.state === 'repaid', 3 * TICKS_PER_MONTH)).toBe(true);
    expect(route.closed).toBe(0);
  }, 120000);

  it('not held back, it is paid on the day if the treasury can, and when overdue as soon as it can', () => {
    const sim = fresh('caravan');
    const s = sim.state;
    ruler(s, 'corinth', ['pious', 'warlike'], 10);
    const l = staged(s, 'corinth', 'in', 1000, 3);
    income(s, 5000, 'given', 'for the test');
    until(sim, () => l.state !== 'running', 4 * TICKS_PER_DAY);
    expect(l.state).toBe('repaying');
    const m = staged(s, 'corinth', 'in', 1000, 2);
    m.owed = s.money + 500;
    until(sim, () => m.state !== 'running', 3 * TICKS_PER_DAY);
    expect(m.state).toBe('overdue');
    income(s, 1000, 'given', 'for the test');
    until(sim, () => m.state !== 'overdue', 2 * TICKS_PER_DAY);
    expect(m.state).toBe('repaying');
    expect(m.late).toBe(true);
    ledgerAddsUp(s);
  }, 60000);

  it('the lender’s army takes no more than is owed, sets nothing alight, and what it carries off comes off the debt', () => {
    const sim = fresh('caravan');
    const s = sim.state;
    ruler(s, 'corinth', ['pious', 'warlike'], 10);
    const l = staged(s, 'corinth', 'in', 500, 1);
    l.withhold = true;
    income(s, 4000, 'given', 'for the test');
    until(sim, () => l.step === 3, 2 * STEP_GAP + 3 * TICKS_PER_DAY);
    expect(l.step).toBe(3);
    const r = s.world.raids.find((x) => x.id === l.raid)!;
    send(sim, { type: 'answer', deal: r.deal, act: 'refuse' });
    expect(until(sim, () => r.phase === 'raiding', 6 * TICKS_PER_MONTH)).toBe(true);
    expect(debtRefusal(s, l, 'withhold')).toBe('');
    // (While the army is in the city it can't be paid off.)
    send(sim, { type: 'loan', act: 'repay', loan: l.id });
    expect(l.state).toBe('overdue');
    const owed = l.owed;
    expect(until(sim, () => r.ended > 0 && !raidersOf(s, r), 4 * TICKS_PER_MONTH)).toBe(true);
    expect(r.fired).toBe(false);
    const v = lootValue(s, r);
    expect(v).toBeLessThanOrEqual(owed + 60);
    if (v > 0) expect(l.seized).toBeGreaterThan(0);
    if (l.state === 'overdue') expect(l.owed).toBe(owed - Math.min(owed, v));
    else expect(l.state).toBe('collected');
    ledgerAddsUp(s);
    if (l.state === 'overdue') {
      // The debt still standing: another threat after the lull.
      expect(until(sim, () => l.raid !== r.id, COLLECT_LULL + 2 * TICKS_PER_DAY)).toBe(true);
    }
  }, 240000);

  it('in step 2, on its first day and a month on, the lender’s agents take up to a quarter of the sum from your stores, what you sell them first; no more after; paid, they stop (slice 29)', () => {
    const sim = fresh('caravan');
    const s = sim.state;
    ruler(s, 'corinth', ['pious', 'warlike'], 10);
    const l = staged(s, 'corinth', 'in', 1500, 2);
    send(sim, { type: 'loan', act: 'withhold', loan: l.id });
    const route = s.world.routes.find((r) => r.city === 'corinth')!;
    const ki = TRADE_GOODS.indexOf(OIL as never);
    route.sell.fill(false);
    route.sell[ki] = true;
    const store = s.buildings.find((b) => b.kind === 'storehouse')!;
    expect(until(sim, () => l.step === 1, 3 * TICKS_PER_DAY)).toBe(true);
    // (The day before step 2: oil in the storehouse, nothing waiting in the yard.)
    expect(until(sim, () => s.tick >= l.stepAt + STEP_GAP - TICKS_PER_DAY, STEP_GAP)).toBe(true);
    const yard = caravanYard(s)!;
    for (const w of TRADE_GOODS) setHeld(yard, w, 0);
    setHeld(store, OIL, 1500);
    const owed = l.owed;
    const share = Math.ceil(l.amount * STORE_SHARE);
    expect(until(sim, () => l.step === 2, 2 * TICKS_PER_DAY)).toBe(true);
    // On its first day: oil (what you sell Corinth) from the storehouse, up to a quarter of the sum.
    expect(l.seized).toBeGreaterThan(share * 0.9);
    expect(l.seized).toBeLessThanOrEqual(share);
    expect(l.owed).toBe(owed - l.seized);
    expect(held(store, OIL)).toBeLessThan(1500);
    expect(lines(s).some((x) => /agents seize [\d,]+ oil from the storehouse .* against your debt/.test(x))).toBe(true);
    expect(s.ledger.now.some((x) => x.kind === 'seized' && x.what === 'Corinth · oil')).toBe(true);
    ledgerAddsUp(s);
    // A month on, again.
    const once = l.seized;
    sim.run(STORE_EVERY + TICKS_PER_DAY);
    expect(l.seized).toBeGreaterThan(once);
    expect(l.seized).toBeLessThanOrEqual(2 * share + 100);
    // Not a third time from the stores, while the debt stands (what waits in the yard is still taken).
    const fromStores = (): number => s.world.news.filter((n) => /agents seize [\d,]+ \w+ from the (storehouse|granary)/.test(n.line)).length;
    const twice = fromStores();
    expect(twice).toBe(2);
    setHeld(store, OIL, 1500);
    sim.run(STORE_EVERY);
    expect(fromStores()).toBe(twice);
    // Paid: nothing more is taken.
    income(s, 5000, 'given', 'for the test');
    send(sim, { type: 'loan', act: 'repay', loan: l.id });
    expect(l.state).toBe('repaying');
    const paid = l.seized;
    setHeld(store, OIL, 1500);
    sim.run(STORE_EVERY + TICKS_PER_DAY);
    expect(l.seized).toBe(paid);
    ledgerAddsUp(s);
  }, 120000);

  it('asking for more time: granted by a cordial lender (dearer, later), once; refused by a cold one', () => {
    const s = fresh('caravan').state;
    const sim = new Sim();
    sim.state = s;
    const c = ruler(s, 'corinth', ['pious', 'warlike'], 20);
    const l = staged(s, 'corinth', 'in', 2000, 20);
    const due = l.due;
    const owed = l.owed;
    expect(timeAnswer(s, l).yes).toBe(true);
    send(sim, { type: 'loan', act: 'time', loan: l.id });
    expect(l.due).toBe(due + 3 * TICKS_PER_MONTH);
    expect(l.owed).toBe(owed + 60);
    expect(l.rateWhy.at(-1)?.why).toBe('more time, asked of them');
    expect(debtRefusal(s, l, 'time')).toMatch(/once already/);
    c.ruler!.traits = ['generous', 'pious'];
    const m = staged(s, 'corinth', 'in', 1000, 20);
    expect(timeAnswer(s, m).months).toBe(6);
    c.memories[0].amount = -40;
    const t = timeAnswer(s, m);
    expect(t.yes).toBe(false);
    send(sim, { type: 'loan', act: 'time', loan: m.id });
    expect(m.due).toBe(Math.floor(s.tick / TICKS_PER_DAY) * TICKS_PER_DAY + 20 * TICKS_PER_DAY);
    expect(lines(s).at(-1)).toMatch(/will give you no more time/);
  });
});

describe('what a ruler owes you', () => {
  it('a plea for time: granted runs on three months more and pleases; refused, or let lapse, it is overdue', () => {
    const sim = fresh('caravan');
    const s = sim.state;
    const c = ruler(s, 'corinth', ['pious', 'warlike'], 10);
    const l = staged(s, 'corinth', 'out', 1000, 0);
    l.state = 'grace';
    l.until = s.tick + 15 * TICKS_PER_DAY;
    const owed = l.owed;
    send(sim, { type: 'loan', act: 'grant', loan: l.id });
    expect(l.state).toBe('running');
    expect(l.owed).toBe(owed + 30);
    expect(c.memories.at(-1)?.kind).toBe('loantime');
    expect(c.memories.at(-1)?.amount).toBeGreaterThan(0);
    const m = staged(s, 'corinth', 'out', 1000, 0);
    m.state = 'grace';
    m.until = s.tick + 15 * TICKS_PER_DAY;
    send(sim, { type: 'loan', act: 'deny', loan: m.id });
    expect(m.state).toBe('overdue');
    expect(c.memories.at(-1)?.amount).toBeLessThan(0);
    const n = staged(s, 'corinth', 'out', 1000, 0);
    n.state = 'grace';
    n.until = Math.floor(s.tick / TICKS_PER_DAY) * TICKS_PER_DAY + 2 * TICKS_PER_DAY;
    until(sim, () => n.state !== 'grace', 3 * TICKS_PER_DAY);
    expect(n.state).toBe('overdue');
  }, 60000);

  it('forgiven: ended, much warmer with them, a little with everyone who hears', () => {
    const sim = fresh('caravan');
    const s = sim.state;
    const c = ruler(s, 'corinth', ['pious', 'warlike'], -10);
    const a = ruler(s, 'athens', ['pious', 'warlike'], 0);
    const l = staged(s, 'corinth', 'out', 1000, 0);
    l.state = 'overdue';
    const mood = moodOf(c, s.tick);
    send(sim, { type: 'loan', act: 'forgive', loan: l.id });
    expect(l.state).toBe('forgiven');
    expect(l.ended).toBe(s.tick);
    expect(moodOf(c, s.tick)).toBe(mood + LOAN_WORTH.forgave);
    expect(moodOf(a, s.tick)).toBe(LOAN_WORTH.forgaveheard);
    expect(debtRefusal(s, l, 'demand')).toBe('It is settled');
  });

  it('a demand: once, its day two months on, met (the herald brings it) or standing, as the dice and their fear say', () => {
    const sim = fresh('caravan');
    const s = sim.state;
    ruler(s, 'corinth', ['steadfast', 'pious'], 30);
    const l = staged(s, 'corinth', 'out', 1000, 0);
    l.state = 'overdue';
    send(sim, { type: 'loan', act: 'demand', loan: l.id });
    expect(l.demanded).toBe(true);
    expect(l.demand).toBeGreaterThan(s.tick);
    expect(debtRefusal(s, l, 'demand')).toMatch(/demand stands/);
    expect(lines(s).at(-1)).toMatch(/You demanded the 1,100 dr/);
    until(sim, () => l.demand === 0, 2 * TICKS_PER_MONTH + TICKS_PER_DAY);
    expect(['repaying', 'overdue']).toContain(l.state);
    if (l.state === 'overdue') expect(lines(s).at(-1)).toMatch(/has not met your demand/);
    else expect(lines(s).at(-1)).toMatch(/meets your demand/);
    expect(debtRefusal(s, { ...l, state: 'overdue' }, 'demand')).toMatch(/once already/);
  }, 60000);
});

describe('expeditions', () => {
  it('Troy can only be reached by sea; one at a time; not with no soldiers', () => {
    const s = fresh('companies').state;
    expect(expeditionRefusal(s, 'troy', 'raid')).toBe('Troy can only be reached by sea: you need triremes (build a shipyard on the shore and order one)');
    expect(expeditionRefusal(s, 'corinth', 'raid')).toBe('');
    expect(expeditionRefusal(fresh('caravan').state, 'corinth', 'raid')).toMatch(/no soldiers/);
  });

  it('a raiding party after a debt: mustering at the edge, the march, the fight, home with what it took; the report, the memories, the ledger', () => {
    const sim = fresh('companies');
    const s = sim.state;
    const c = ruler(s, 'corinth', ['pious', 'warlike'], 0);
    const l = staged(s, 'corinth', 'out', 2000, 0);
    l.state = 'overdue';
    const plan = expeditionPlan(s, 'corinth', 'raid');
    expect(plan.companies.length).toBeGreaterThan(0);
    expect(plan.odds).toBeGreaterThan(0.5);
    const soldiers = s.army.soldiers.length;
    send(sim, { type: 'expedition', city: 'corinth', kind: 'raid' });
    const e = s.world.expeditions[0];
    expect(e.phase).toBe('mustering');
    expect(l.sent).toBe(e.id);
    expect(debtRefusal(s, l, 'forgive')).toMatch(/soldiers are out/);
    expect(expeditionRefusal(s, 'corinth', 'force')).toMatch(/one expedition at a time/);
    expect(expeditionLine(s, e)).toMatch(/marching to the north edge/);
    expect(until(sim, () => e.phase === 'marching', 2 * TICKS_PER_MONTH + 10)).toBe(true);
    expect(e.men.length).toBeGreaterThan(0);
    expect(s.army.soldiers.filter((x) => x.state === 'away').length).toBe(e.men.length);
    expect(s.army.companies.filter((x) => x.order === 'away').length).toBe(e.companies.length);
    // Its place on the map is a function of the tick.
    const p0 = expeditionOnMap(e, s.tick)!;
    const p1 = expeditionOnMap(e, s.tick + 50)!;
    expect(p1.along).toBeGreaterThan(p0.along);
    expect(until(sim, () => e.phase === 'fighting', e.dur + 2)).toBe(true);
    expect(e.report.length).toBeGreaterThanOrEqual(5);
    expect(e.report[0]).toMatch(/A raiding party: the .* company/);
    expect(c.memories.some((m) => m.kind === 'attacked')).toBe(true);
    expect(cityOf(s.world, 'athens').memories.some((m) => m.kind === 'attackheard')).toBe(true);
    expect(s.army.soldiers.length).toBe(soldiers - e.killed.length);
    if (e.won) {
      expect(e.value).toBeGreaterThan(0);
      expect(l.seized).toBe(e.value);
    }
    expect(l.sent).toBe(0);
    expect(until(sim, () => e.phase === 'back', 2 * TICKS_PER_MONTH)).toBe(true);
    expect(expeditionLine(s, e)).toMatch(/home from Corinth/);
    expect(kindTotal(s.ledger.now, 'collected') + kindTotal(s.ledger.last, 'collected')).toBe(e.coin);
    expect(s.army.soldiers.filter((x) => x.state === 'away').length).toBe(0);
    expect(s.army.soldiers.filter((x) => x.state === 'wounded').length).toBe(e.wounded.length);
    expect(until(sim, () => e.phase === 'done', 2 * TICKS_PER_MONTH)).toBe(true);
    ledgerAddsUp(s);
  }, 240000);

  it('by sea to Troy in the triremes, a company to each: aboard at the shipyard, the ships out with them and home again', () => {
    const sim = fresh('triremes');
    const s = sim.state;
    // (No band or pirates in the way: only the expedition.)
    s.world.raids = [];
    s.fleet.pirates = [];
    s.fleet.ships = [];
    for (const t of s.fleet.triremes) {
      t.order = 'bay';
      t.lane = '';
    }
    ruler(s, 'troy', ['pious'], 0);
    const l = staged(s, 'troy', 'out', 2000, 0);
    l.state = 'overdue';
    const fit = s.fleet.triremes.filter((t) => t.state === 'moored' && t.crew.length * 2 >= 12 && t.hp >= 60);
    expect(fit.length).toBeGreaterThan(0);
    expect(s.army.companies.length).toBeGreaterThan(fit.length - 1);
    expect(expeditionRefusal(s, 'troy', 'force')).toBe('');
    const plan = expeditionPlan(s, 'troy', 'force');
    // (No more companies than triremes to carry them.)
    expect(plan.companies.length).toBe(Math.min(fit.length, s.army.companies.filter((c) => c.order !== 'away').length));
    send(sim, { type: 'expedition', city: 'troy', kind: 'force' });
    const e = s.world.expeditions[0];
    expect(e.by).toBe('sea');
    expect(expeditionLine(s, e)).toMatch(/marching to the shipyard/);
    expect(until(sim, () => e.phase === 'marching', 2 * TICKS_PER_MONTH + 10)).toBe(true);
    expect(e.ships.length).toBe(e.companies.length);
    for (const id of e.ships) expect(s.fleet.triremes.find((t) => t.id === id)?.order).toBe('away');
    expect(expeditionLine(s, e)).toMatch(/at sea, bound for Troy/);
    expect(until(sim, () => e.phase === 'homeward', e.dur + FIGHT_DAYS * TICKS_PER_DAY + 2)).toBe(true);
    expect(e.report.at(-1)).toMatch(/They sail home: in your bay/);
    expect(until(sim, () => e.phase === 'back', 2 * TICKS_PER_MONTH)).toBe(true);
    for (const id of e.ships) expect(s.fleet.triremes.find((t) => t.id === id)?.order ?? 'bay').toBe('bay');
    expect(s.army.soldiers.filter((x) => x.state === 'away').length).toBe(0);
    expect(until(sim, () => e.phase === 'done', 2 * TICKS_PER_MONTH)).toBe(true);
    ledgerAddsUp(s);
  }, 240000);

  it('a save mid-expedition round-trips and plays on identically', () => {
    const sim = fresh('companies');
    const s = sim.state;
    ruler(s, 'corinth', ['pious', 'warlike'], 0);
    send(sim, { type: 'expedition', city: 'corinth', kind: 'raid' });
    const e = s.world.expeditions[0];
    until(sim, () => e.phase === 'marching', 2 * TICKS_PER_MONTH + 10);
    const back = decodeSave(encodeSave(s, 0));
    if (!back.ok) throw new Error(back.why);
    const b = new Sim();
    b.state = back.file.state;
    sim.run(2 * TICKS_PER_MONTH);
    b.run(2 * TICKS_PER_MONTH);
    expect(serialize(b.state)).toBe(serialize(s));
    expect(s.world.expeditions[0].phase).not.toBe('marching');
  }, 240000);
});

describe('a lender across the sea', () => {
  it('its army comes by ship and lands through the landings, takes no more than is owed, sets nothing alight, and what it carries off comes off the debt', () => {
    const sim = fresh('companies');
    const s = sim.state;
    ruler(s, 'troy', ['pious', 'warlike'], 10);
    const l = staged(s, 'troy', 'in', 1000, 0);
    // (Overdue, held back, and two months into the seizing: the threat comes the next day.)
    l.state = 'overdue';
    l.withhold = true;
    l.fell = Math.max(1, s.tick);
    l.step = 2;
    l.stepAt = s.tick - STEP_GAP;
    income(s, 4000, 'given', 'for the test');
    expect(until(sim, () => l.step === 3, 2 * TICKS_PER_DAY)).toBe(true);
    const r = s.world.raids.find((x) => x.id === l.raid)!;
    expect(r.loan).toBe(l.id);
    expect(r.by).toBe('sea');
    send(sim, { type: 'answer', deal: r.deal, act: 'refuse' });
    expect(until(sim, () => r.phase === 'raiding', 6 * TICKS_PER_MONTH)).toBe(true);
    // Ships in the bay: come to collect, and (in your waters) not to be paid off.
    expect(r.shore).toBeGreaterThanOrEqual(0);
    expect(lines(s).some((x) => /^Sails! .* come to collect the [\d,]+ dr you owe/.test(x))).toBe(true);
    expect(lines(s).some((x) => /^Sails! .*to turn them back/.test(x))).toBe(false);
    expect(until(sim, () => r.landed > 0 || r.ended > 0, 2 * TICKS_PER_MONTH)).toBe(true);
    expect(r.landed).toBeGreaterThan(0);
    expect(lines(s).some((x) => /^Troy’s army is ashore.* come to collect/.test(x))).toBe(true);
    const owed = l.owed;
    expect(until(sim, () => r.ended > 0 && !raidersOf(s, r), 4 * TICKS_PER_MONTH)).toBe(true);
    expect(r.fired).toBe(false);
    const v = lootValue(s, r);
    expect(v).toBeLessThanOrEqual(owed + 60);
    if (v > 0) expect(l.seized).toBeGreaterThan(0);
    if (l.state === 'overdue') expect(l.owed).toBe(owed - Math.min(owed, v));
    else expect(l.state).toBe('collected');
    ledgerAddsUp(s);
  }, 240000);
});

describe('old saves', () => {
  it('a slice 27 save (version 25, a loan from Corinth nearly due) loads, and the loan falls due as a slice 28 debt', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/slice27-borrow.save.json.gz')).toString();
    expect(JSON.parse(text).state.version).toBe(25);
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    const s = got.file.state;
    expect(s.version).toBe(SIM_STATE_VERSION);
    expect(s.world.expeditions).toEqual([]);
    const l = s.world.loans.find((x) => x.city === 'corinth' && x.state === 'running')!;
    expect(l.step).toBe(0);
    expect(l.withhold).toBe(false);
    const sim = new Sim();
    sim.state = s;
    sim.run(TICKS_PER_MONTH);
    expect(['repaying', 'repaid', 'overdue']).toContain(l.state);
    if (l.state === 'overdue') expect(l.step).toBe(1);
    expect(decodeSave(encodeSave(s, 1)).ok).toBe(true);
  }, 60000);
});
