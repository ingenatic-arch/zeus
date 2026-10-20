/**
 * Loans both ways (slice 27): borrowing from a ruler, lending to one, the
 * rulers' own offers and asks, and repayment.
 *
 * - **Asking.** From a city's page you ask its ruler for a sum. Your herald
 *   goes (on the map, as coin gifts go), and when he gets there the ruler
 *   answers: terms (the interest and the months, each moved by something
 *   named, as a price is) or a refusal with its reason. You accept or decline
 *   the terms within two months; accepted, the coin comes back with their
 *   herald into the treasury.
 * - **Lending.** You choose a sum, the interest and the months; the coin goes
 *   with your herald at once, and when he arrives they take it (by their need
 *   and their mood) or send it back, and say why. Every borrower shows how
 *   likely they are to repay, and why.
 * - **The rulers' own.** A pleased ruler with coin to spare now and then
 *   offers you a loan (more often when your treasury is low); a ruler in
 *   trouble asks you for one. These are deals (favours.ts: `loanoffer`,
 *   `loanask`), made in the month's turn after every older kind, so they keep
 *   the requests' calm and a month that brought something before brings the
 *   same now.
 * - **Repaying.** One payment of the whole sum, interest and all, on the day
 *   it is due: yours from what the treasury can spend (or early, by hand),
 *   theirs if Greece's dice say so against how likely they were to. A day
 *   passed unpaid leaves the loan `overdue`.
 * - **Debts unpaid** (slice 28). A month before yours falls due, a reminder,
 *   and you may ask for more time (answered at once, by their mood and
 *   character, for a few percent more). You may also hold it back on the day.
 *   Overdue, it climbs three steps, two months apart, each said in advance: a
 *   warning (a broken promise the lender remembers longest, which every ruler
 *   hears of, and dearer terms everywhere for three years); the lender's routes
 *   closed and your goods on them seized, a bite off the debt each time; then a
 *   threat and an army that comes to collect (raids.ts, `raid.loan`). Paying
 *   at any step stops the next. Theirs: on the day a borrower who doesn't pay
 *   may first ask you for more time; overdue, you can forgive it, demand it,
 *   or send your soldiers after it (expeditions.ts).
 *
 * Every drachma goes through the treasury on its own ledger line. What is
 * random is a hash of Greece's seed with salts of its own, so Greece's own
 * generator and every older roll land as before. Pure.
 */
import type { CoastMap } from '../map/bake';
import { EDGE_ALONG, HORIZON_ALONG, PLACES, RULED, type CityId } from '../map/greece';
import { hash2 } from '../map/noise';
import { dateOfTick, TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { fairGift, giftWay, heraldTicks, news, settleMood, wayFor } from './diplomacy';
import { dayWords, firstRoute, makeDeal, OFFER_PLEASED } from './favours';
import { helpedFoe } from './rivals';
import { held, setHeld, WARE_NAMES } from './foods';
import { callOff, liveRaid, lootWords, raidersOf, threatLive, threatenDebt } from './raids';
import { caravanYard } from './routes';
import type { Deal, Gift, Loan, LoanWhy, Memory, Raid, SimState, World, WorldCity } from './state';
import { note } from './stockbook';
import { TRADE_GOODS, tradingPost } from './trade';
import { income, owedWages, pay, spendable, wageBill } from './treasury';
import { cityOf, COLD, fadeFor, lastHarvest, moodLevel, moodOf, MOOD_WORDS, rulerName } from './world';

// ---------------------------------------------------------------------------
// The numbers.

/** Interest starts here (a percent of the sum, for the whole loan), and the months. */
export const BASE_RATE = 12;
export const BASE_MONTHS = 12;
export const RATE_LEAST = 4;
export const RATE_MOST = 30;
export const MONTHS_LEAST = 6;
export const MONTHS_MOST = 36;
/** The smallest loan, and the step sums go up in. */
export const LOAN_LEAST = 500;
export const LOAN_STEP = 500;
/** What you can ask for (those a city can spare), and offer. */
export const ASK_SUMS: readonly number[] = [500, 1000, 2000, 3000, 5000];
export const OFFER_SUMS: readonly number[] = [500, 1000, 2000, 3000, 5000];
export const OFFER_RATES: readonly number[] = [5, 10, 15, 20];
export const OFFER_MONTHS: readonly number[] = [6, 12, 18, 24];
/** How long their terms stand, waiting on your answer; and how long a ruler's own offer or ask waits. */
export const TERMS_STAND = 2 * TICKS_PER_MONTH;
export const LOAN_ANSWER = 2 * TICKS_PER_MONTH;
/** Ended loans are let go after this (your record as a payer reads the last three years). */
export const KEEP_ENDED = 3 * TICKS_PER_YEAR;
export const RECORD_YEARS = 3 * TICKS_PER_YEAR;

/** What each city can spare at most, and what its wealth does to the interest (with its words). */
export const COFFERS: Partial<Record<CityId, { spare: number; rate: number; words: string }>> = {
  athens: { spare: 5000, rate: -2, words: 'Athens is rich' },
  corinth: { spare: 5000, rate: -2, words: 'Corinth is rich' },
  troy: { spare: 4000, rate: -1, words: 'Troy is wealthy' },
  sparta: { spare: 2500, rate: 2, words: 'Sparta keeps little coin' },
};

/** How a ruler's mood (by its level, hostile … devoted) moves the interest and the months, and what they can spare. */
const MOOD_RATE = [0, 0, 3, -2, -4, -6];
const MOOD_MONTHS = [0, 0, -3, 0, 6, 12];
const MOOD_SPARE = [0, 0, 0.5, 1, 1.2, 1.5];

/** A ruler's offers and asks: how often (a month in so many), how much more often when your treasury is low, and their size (fair gifts' worth). */
const OFFER_ODDS = 1 / 18;
const LOW_ODDS = 4;
const ASK_ODDS = 1 / 10;
const LOAN_GIFTS = 3;
/** A ruler in trouble: a poor or failed harvest this long ago at most, a war lost this long ago at most. */
const HUNGRY_FOR = 4 * TICKS_PER_MONTH;
const BEATEN_FOR = 6 * TICKS_PER_MONTH;

/** What each answer is worth to the mood, and how long it is remembered (before personality bends it). */
export const LOAN_WORTH = {
  lent: 15, needed: 12, cheap: 5, refused: -6, lapsed: -4, taken: 3, declined: -2, repaid: 8, late: 2,
  // Slice 28: a debt unpaid. Yours: the broken promise (the slowest to fade) and every other ruler hearing of it. Theirs: time
  // granted or refused, a debt forgiven (and Greece hearing), and an expedition after it (expeditions.ts), or with no debt.
  defaulted: -30, heard: -5, granted: 4, denied: -4, forgave: 30, forgaveheard: 4,
  raided: -15, forced: -25, raidedfree: -40, forcedfree: -60, heardraid: -3, heardfree: -12,
} as const;
const LOAN_FADE = {
  lent: 24, needed: 24, cheap: 12, refused: 12, lapsed: 12, taken: 12, declined: 6, repaid: 24, late: 12,
  defaulted: 48, heard: 24, granted: 12, denied: 12, forgave: 36, forgaveheard: 24,
  raided: 36, forced: 48, raidedfree: 48, forcedfree: 60, heardraid: 24, heardfree: 36,
} as const;
export type LoanAnswer = keyof typeof LOAN_WORTH;
/** The memory's kind for each answer. */
const LOAN_KIND: Record<LoanAnswer, string> = {
  lent: 'lent', needed: 'lent', cheap: 'lent', refused: 'loanrefused', lapsed: 'loanlapsed', taken: 'loantaken', declined: 'loandeclined', repaid: 'loanrepaid', late: 'loanrepaid',
  defaulted: 'defaulted', heard: 'defaultheard', granted: 'loantime', denied: 'loantime', forgave: 'forgiven', forgaveheard: 'forgiven',
  raided: 'attacked', forced: 'attacked', raidedfree: 'attacked', forcedfree: 'attacked', heardraid: 'attackheard', heardfree: 'attackheard',
};

/** A loan's slice 28 fields, as a new one has them. */
export const DEBT_FRESH = { step: 0, stepAt: 0, fell: 0, seized: 0, withhold: false, extended: 0, reminded: false, raid: 0, demand: 0, demanded: false, sent: 0 } as const;
/** The reminder comes this long before your loan's day. */
export const REMIND = 30 * TICKS_PER_DAY;
/** The steps of your default come this far apart. */
export const STEP_GAP = 2 * TICKS_PER_MONTH;
/** After the lender's army has gone, with the debt still standing: the next threat this long after. */
export const COLLECT_LULL = 4 * TICKS_PER_MONTH;
/** More time, asked or granted: so many months for so many percent of the sum. */
export const TIME_MONTHS = 3;
export const TIME_RATE = 3;
/** How long a borrower's ask for more time waits on your answer, and how often one who can't pay asks first. */
export const GRACE_ANSWER = 15 * TICKS_PER_DAY;
const GRACE_ODDS = 0.6;
/** A demand runs this long. */
export const DEMAND_DAYS = 2 * TICKS_PER_MONTH;
/** Each failure to repay makes every loan's terms dearer, for three years. */
const FAILED_RATE = 3;

const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const cityName = (id: CityId): string => PLACES[id].name;
/** "Corinth’s", "Athens’". */
export const whose = (id: CityId): string => (cityName(id).endsWith('s') ? `${cityName(id)}’` : `${cityName(id)}’s`);
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));
const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const he = (c: WorldCity): string => (c.ruler?.female ? 'she' : 'he');
/** "the king", "the archon", "the lord", "the queen". */
const title = (c: WorldCity): string => {
  const t = (c.ruler?.title ?? '').replace(/ of .*/, '').toLowerCase();
  return t ? `the ${t}` : cityName(c.id);
};
/** Down to a whole step of 500 dr. */
const down = (n: number): number => Math.floor(n / LOAN_STEP) * LOAN_STEP;

/** Greece's dice for loans: a month or a loan, a city, a purpose (a hash: Greece's own generator is never touched). */
const dice = (w: World, a: number, i: number, salt: number): number => hash2(a, i * 41 + salt, (w.seed ^ 0x6c6f616e) | 0);

/** "a month", "18 months". */
export const monthsWords = (n: number): string => (n === 1 ? 'a month' : `${n} months`);
/** "2,000 dr at 9%, repaid in 18 months". */
export const termsWords = (l: Pick<Loan, 'amount' | 'rate' | 'months'>): string => `${fmt(l.amount)} dr at ${l.rate}%, repaid in ${monthsWords(l.months)}`;
/** What a sum at a rate comes to, interest and all. */
export const owedOf = (amount: number, rate: number): number => amount + Math.round((amount * rate) / 100);
/** A list of reasons in words: "cordial (−2%), Corinth is rich (−2%)". */
export const whysWords = (ws: readonly LoanWhy[], unit: '%' | ' months'): string => ws.map((x) => `${x.why} (${signed(x.n)}${unit === '%' ? '%' : x.n === 1 || x.n === -1 ? ' month' : ' months'})`).join(', ');

// ---------------------------------------------------------------------------
// Looking loans up.

/** A loan by its id. */
export const loanOf = (w: World, id: number): Loan | undefined => w.loans.find((l) => l.id === id);
/** The loan tied to a ruler's offer or ask (a deal), if any. */
export const loanOfDeal = (w: World, deal: number): Loan | undefined => w.loans.find((l) => l.deal === deal);
/** Is a loan still going (not refused, declined, lapsed or repaid)? */
export const live = (l: Loan): boolean => l.ended === 0;
/** A loan that stands as a debt now (the coin has been agreed and not yet paid back). */
export const owing = (l: Loan): boolean => l.state === 'coming' || l.state === 'running' || l.state === 'overdue' || l.state === 'grace';
/** A city's loan one way that is still going (one each way per city at a time), if any. */
export const liveLoan = (w: World, city: CityId, side: Loan['side']): Loan | undefined => w.loans.find((l) => l.city === city && l.side === side && live(l));
/** Your debts overdue anywhere. */
export const overdueOf = (w: World): Loan[] => w.loans.filter((l) => l.side === 'in' && l.state === 'overdue');
/** Your loans that fell overdue in the last three years (Greece remembers), the cities you failed. */
export const failedOf = (w: World, tick: number): Loan[] => w.loans.filter((l) => l.side === 'in' && l.fell > 0 && tick - l.fell < RECORD_YEARS);
/** Is a city's route closed over a debt of yours (seizing, or its army out)? */
export const seizing = (w: World, city: CityId): boolean => w.loans.some((l) => l.city === city && l.side === 'in' && l.state === 'overdue' && l.step >= 2);
/** Loans you repaid on time in the last three years. */
export const paidOnTime = (w: World, tick: number): number => w.loans.filter((l) => l.side === 'in' && l.state === 'repaid' && !l.late && tick - l.ended < RECORD_YEARS).length;

// ---------------------------------------------------------------------------
// A ruler's circumstances.

/** What troubles a city now: a war, a poor or failed harvest in the last four months, a war lost in the last six; in words, worst first. */
export function troubles(s: SimState, c: WorldCity): { war: CityId | ''; harvest: number; beaten: CityId | ''; words: string[] } {
  const w = s.world;
  const war = c.war;
  const harvest = c.harvest <= 1 && s.tick - lastHarvest(s.tick) < HUNGRY_FOR ? c.harvest : 2;
  const lost = w.wars.find((x) => x.ended > 0 && s.tick - x.ended < BEATEN_FOR && (x.a === c.id || x.b === c.id) && x.fate !== 'peace' && x.fate !== c.id);
  const beaten: CityId | '' = lost ? (lost.a === c.id ? lost.b : lost.a) : '';
  const words: string[] = [];
  if (war) words.push(`at war with ${cityName(war)}`);
  if (harvest === 0) words.push('their harvest failed');
  else if (harvest === 1) words.push('their harvest was poor');
  if (beaten) words.push(`beaten by ${cityName(beaten)} lately`);
  return { war, harvest, beaten, words };
}

/** What a city can spare to lend you now (dr, in 500s), and why it is less than its coffers hold. */
export function spareOf(s: SimState, c: WorldCity): { spare: number; why: string[] } {
  const coffers = COFFERS[c.id];
  if (!coffers || !c.ruler) return { spare: 0, why: [] };
  const lvl = moodLevel(moodOf(c, s.tick));
  let n = coffers.spare * MOOD_SPARE[lvl];
  const why: string[] = [];
  if (MOOD_SPARE[lvl] !== 1) why.push(`${MOOD_WORDS[lvl]}${MOOD_SPARE[lvl] < 1 ? ': less' : ': more'}`);
  const t = troubles(s, c);
  if (t.war) {
    n *= 0.5;
    why.push(`at war with ${cityName(t.war)}: half`);
  }
  if (t.harvest === 0) {
    n *= 0.6;
    why.push('their harvest failed');
  } else if (t.harvest === 1) {
    n *= 0.8;
    why.push('their harvest was poor');
  }
  if (t.beaten) {
    n *= 0.5;
    why.push(`beaten by ${cityName(t.beaten)} lately: half`);
  }
  return { spare: down(n), why };
}

/** The loans you owe now (to whom), but `but`. */
const debtsBut = (w: World, but: CityId): Loan[] => w.loans.filter((l) => l.side === 'in' && owing(l) && l.city !== but);

/**
 * The terms a ruler would lend you on now, each thing that moved them named:
 * the interest (from 12%) and the months (from 12), by their mood, their
 * city's wealth, their character, their troubles and your name as a payer.
 * `own`: their own offer (a percent cheaper).
 */
export function loanTerms(s: SimState, c: WorldCity, own = false): { rate: number; months: number; rateWhy: LoanWhy[]; monthsWhy: LoanWhy[] } {
  const rateWhy: LoanWhy[] = [];
  const monthsWhy: LoanWhy[] = [];
  const r = (why: string, n: number): void => {
    if (n) rateWhy.push({ why, n });
  };
  const m = (why: string, n: number): void => {
    if (n) monthsWhy.push({ why, n });
  };
  const lvl = moodLevel(moodOf(c, s.tick));
  const mood = MOOD_WORDS[lvl];
  r(mood, MOOD_RATE[lvl]);
  m(mood, MOOD_MONTHS[lvl]);
  const coffers = COFFERS[c.id];
  if (coffers) r(coffers.words, coffers.rate);
  const traits = c.ruler?.traits ?? [];
  const who = c.ruler?.title.replace(/ of .*/, '').toLowerCase() ?? 'ruler';
  if (traits.includes('greedy')) r(`greedy ${who}`, 5);
  if (traits.includes('generous')) {
    r(`generous ${who}`, -3);
    m(`generous ${who}`, 6);
  }
  if (traits.includes('shrewd')) {
    r(`shrewd ${who}: drives a hard bargain`, 2);
    m(`shrewd ${who}: wants it back sooner`, -6);
  }
  if (traits.includes('steadfast')) m(`steadfast ${who}: patient`, 3);
  if (traits.includes('fickle')) m(`fickle ${who}`, -3);
  const t = troubles(s, c);
  if (t.war) r(`at war with ${cityName(t.war)}: they need their coin`, 3);
  if (t.harvest === 0) r('their harvest failed', 2);
  else if (t.harvest === 1) r('their harvest was poor', 1);
  if (t.beaten) r(`beaten by ${cityName(t.beaten)} lately: their coffers are low`, 2);
  const debts = debtsBut(s.world, c.id);
  if (debts.length === 0) r('your city owes no one', -2);
  else r(`you owe ${debts.map((l) => cityName(l.city)).join(' and ')} already`, 2 * debts.length);
  // (Slice 28: each loan you failed to repay in the last three years.)
  for (const l of failedOf(s.world, s.tick)) r(`Greece knows you failed to repay ${cityName(l.city)}`, FAILED_RATE);
  const kept = Math.min(3, paidOnTime(s.world, s.tick));
  if (kept) r('Greece knows you pay your debts', -kept);
  if (own) r('it is their own offer', -1);
  return bounded(BASE_RATE, BASE_MONTHS, rateWhy, monthsWhy);
}

/** Terms from a starting rate and months and what moved them, kept within bounds; a bound that holds them is a reason of its own, so the reasons always add up to the terms. */
function bounded(rate0: number, months0: number, rateWhy: LoanWhy[], monthsWhy: LoanWhy[]): { rate: number; months: number; rateWhy: LoanWhy[]; monthsWhy: LoanWhy[] } {
  const rawRate = rate0 + rateWhy.reduce((a, x) => a + x.n, 0);
  const rate = clamp(rawRate, RATE_LEAST, RATE_MOST);
  if (rate !== rawRate) rateWhy.push({ why: rate > rawRate ? `no one lends for less than ${RATE_LEAST}%` : `no one asks more than ${RATE_MOST}%`, n: rate - rawRate });
  const rawMonths = months0 + monthsWhy.reduce((a, x) => a + x.n, 0);
  const months = clamp(rawMonths, MONTHS_LEAST, MONTHS_MOST);
  if (months !== rawMonths) monthsWhy.push({ why: months > rawMonths ? `no loan runs shorter than ${MONTHS_LEAST} months` : `no loan runs longer than ${MONTHS_MOST / 12} years`, n: months - rawMonths });
  return { rate, months, rateWhy, monthsWhy };
}

/** Why a ruler would not lend to you now, or '' if they would. */
export function lendRefusal(s: SimState, c: WorldCity): string {
  if (!c.ruler) return 'There is no ruler there to ask';
  const mood = moodOf(c, s.tick);
  const name = `${cap(title(c))} of ${cityName(c.id)}`;
  if (mood <= COLD) return `${name} does not lend to a city ${he(c)} is ${mood <= -60 ? 'hostile' : 'cold'} towards`;
  if (mood < 0 && !s.world.routes.some((r) => r.city === c.id)) return `${name} does not lend to a city ${he(c)} barely knows (wary, and no route between you)`;
  const late = overdueOf(s.world);
  if (late.length) return `${name} will not lend to a city that has not repaid ${cityName(late[0].city)}`;
  // (A ruler who asks to borrow from you, or owes you, has no coin to lend you.)
  const theirs = liveLoan(s.world, c.id, 'out');
  if (theirs && theirs.state !== 'returning' && theirs.state !== 'repaying') return `${name} is borrowing from you, not lending (${theirs.state === 'proposed' ? `${he(c)} asks you for ${fmt(theirs.amount)} dr` : theirs.state === 'offering' || theirs.state === 'sending' ? `your loan of ${fmt(theirs.amount)} dr is on its way to ${he(c) === 'she' ? 'her' : 'him'}` : `${he(c)} owes you ${fmt(theirs.owed)} dr`})`;
  const { spare, why } = spareOf(s, c);
  if (spare < LOAN_LEAST) return `${cityName(c.id)} has no coin to spare${why.length ? `: ${why.join(', ')}` : ''}`;
  return '';
}
const cap = (t: string): string => `${t[0].toUpperCase()}${t.slice(1)}`;

/** Why you can't ask a city for a loan of so much now (a command; '' if you can). */
export function askRefusal(s: SimState, city: CityId | string, amount: number): string {
  if (!RULED.includes(city as CityId)) return 'There is no ruler there to ask';
  const id = city as CityId;
  const w = s.world;
  if (!ASK_SUMS.includes(amount)) return 'Not a sum you can ask for';
  const l = liveLoan(w, id, 'in');
  if (l) return l.state === 'asking' ? `Your herald is on his way to ${cityName(id)}` : l.state === 'terms' ? `${whose(id)} terms wait on your answer` : l.state === 'proposed' ? `${cityName(id)} offers you a loan already` : `You owe ${cityName(id)} already: one loan from a city at a time`;
  const why = lendRefusal(s, cityOf(w, id));
  if (why && !why.includes('no coin to spare')) return why;
  const { spare } = spareOf(s, cityOf(w, id));
  if (amount > spare) return spare < LOAN_LEAST ? why : `${cityName(id)} can spare ${fmt(spare)} dr at most now`;
  return '';
}

// ---------------------------------------------------------------------------
// How likely a borrower is to repay.

export type Likely = 'likely' | 'fair' | 'doubtful';
/**
 * How likely a ruler is to repay a loan of yours (owed: the whole sum, and the
 * rate): a chance from 0.05 to 0.95 and its word, with each reason marked up
 * or down. Worked out again on the day it is due, as things stand then.
 */
export function likelyToRepay(s: SimState, c: WorldCity, owed = 0, rate = 10): { p: number; word: Likely; why: Array<{ why: string; up: boolean }> } {
  let p = 0.7;
  const why: Array<{ why: string; up: boolean }> = [];
  const add = (d: number, words: string): void => {
    p += d;
    why.push({ why: words, up: d > 0 });
  };
  const traits = c.ruler?.traits ?? [];
  if (traits.includes('steadfast')) add(0.1, 'steadfast');
  if (traits.includes('pious')) add(0.05, 'pious: swears by the gods');
  if (traits.includes('generous')) add(0.05, 'generous');
  if (traits.includes('fickle')) add(-0.1, 'fickle');
  if (traits.includes('greedy')) add(-0.05, 'greedy');
  const lvl = moodLevel(moodOf(c, s.tick));
  const moodD = [-0.4, -0.25, -0.1, 0.05, 0.1, 0.15][lvl];
  add(moodD, lvl >= 3 ? `${MOOD_WORDS[lvl]} to you` : `${MOOD_WORDS[lvl]} towards you`);
  const t = troubles(s, c);
  if (t.war) add(-0.15, `at war with ${cityName(t.war)}`);
  if (t.harvest === 0) add(-0.1, 'their harvest failed');
  else if (t.harvest === 1) add(-0.05, 'their harvest was poor');
  if (t.beaten) add(-0.1, `beaten by ${cityName(t.beaten)} lately`);
  const coffers = COFFERS[c.id];
  if (coffers) add(coffers.rate < 0 ? 0.05 : -0.05, coffers.words);
  if (coffers && owed > coffers.spare) add(-0.1, 'more than they can easily repay');
  if (rate >= 20) add(-0.05, 'a heavy rate');
  p = clamp(Math.round(p * 100) / 100, 0.05, 0.95);
  return { p, word: p >= 0.75 ? 'likely' : p >= 0.5 ? 'fair' : 'doubtful', why };
}
/** "steadfast (+), at war with Athens (−)". */
export const likelyWords = (why: ReadonlyArray<{ why: string; up: boolean }>): string => why.map((x) => `${x.why} (${x.up ? '+' : '−'})`).join(', ');

/** The most interest a ruler in need will bear, and its reasons. */
function bearsOf(s: SimState, c: WorldCity): number {
  const t = troubles(s, c);
  let most = 14;
  if (t.war) most += 4;
  if (t.harvest === 0) most += 2;
  if (c.ruler?.traits.includes('shrewd')) most -= 4;
  return most;
}

/**
 * Whether a ruler takes a loan you offer (as things stand now), and why: never
 * while cold; one in need (at war, a poor or failed harvest, a lost war) if the
 * interest is no dearer than they bear (a proud one only at war); one not in
 * need only cheap coin (5%), and only cordial or better; never more than half
 * again what they could spare.
 */
export function offerAnswer(s: SimState, c: WorldCity, amount: number, rate: number): { take: boolean; need: boolean; why: string } {
  const mood = moodOf(c, s.tick);
  const name = cityName(c.id);
  if (!c.ruler) return { take: false, need: false, why: 'there is no ruler there' };
  if (mood <= COLD) return { take: false, need: false, why: `${title(c)} is ${mood <= -60 ? 'hostile' : 'cold'} towards you, and will take nothing from you` };
  const coffers = COFFERS[c.id];
  if (coffers && amount > coffers.spare * 1.5) return { take: false, need: false, why: `${fmt(amount)} dr is more than ${name} would want to owe (${fmt(down(coffers.spare * 1.5))} at most)` };
  const t = troubles(s, c);
  const need = t.words.length > 0;
  if (need) {
    if (c.ruler.traits.includes('proud') && !t.war) return { take: false, need, why: `${title(c)} is proud, and will not be in your debt` };
    const most = bearsOf(s, c);
    if (rate > most) return { take: false, need, why: `they need coin (${t.words.join(', ')}), but ${rate}% is too dear for them (${most}% at most)` };
    return { take: true, need, why: `they need coin (${t.words.join(', ')}), and ${rate}% is fair to them` };
  }
  if (rate > 5) return { take: false, need, why: `${name} needs no coin now: only cheap coin (5%) would tempt them` };
  if (mood < 0) return { take: false, need, why: `${name} needs no coin now, and ${title(c)} is wary of you` };
  return { take: true, need, why: `${name} needs no coin now, but cheap coin is always welcome` };
}

/** Why you can't offer a city a loan on these terms now (a command; '' if you can). */
export function offerRefusal(s: SimState, city: CityId | string, amount: number, rate: number, months: number): string {
  if (!RULED.includes(city as CityId)) return 'There is no ruler there to lend to';
  if (!OFFER_SUMS.includes(amount) || !OFFER_RATES.includes(rate) || !OFFER_MONTHS.includes(months)) return 'Not a loan you can offer';
  const id = city as CityId;
  const l = liveLoan(s.world, id, 'out');
  if (l) return l.state === 'offering' || l.state === 'sending' ? `Your herald is on his way to ${cityName(id)}` : l.state === 'proposed' ? `${cityName(id)} asks you for a loan already: answer it on the Ruler tab` : `${cityName(id)} owes you already: one loan to a city at a time`;
  if (spendable(s) < amount) return `The treasury can’t spare ${fmt(amount)} dr now`;
  return '';
}

// ---------------------------------------------------------------------------
// The memories loans make.

/** The memory an answer about a loan makes, bent by personality (each bend named), as answers to requests are. */
export function loanMemory(c: WorldCity, a: LoanAnswer, why: string, tick: number): Memory {
  const traits = c.ruler?.traits ?? [];
  let worth: number = LOAN_WORTH[a];
  const good = worth > 0;
  const bends: string[] = [];
  if (a === 'declined' && !traits.includes('proud')) worth = 0;
  if (good && traits.includes('generous') && a !== 'taken') {
    worth *= 1.25;
    bends.push('generous: remembers kindness');
  }
  if (a === 'repaid' && traits.includes('greedy')) {
    worth *= 1.25;
    bends.push('greedy: loves coin');
  }
  if (!good && worth !== 0 && traits.includes('proud')) {
    worth *= 1.5;
    bends.push('proud: takes it hard');
  }
  if (traits.includes('steadfast')) {
    worth *= 0.75;
    bends.push('steadfast: slow to change');
  }
  const amount = Math.round(worth) === 0 && worth !== 0 ? Math.sign(worth) : Math.round(worth);
  return { kind: LOAN_KIND[a], why: `${why}${bends.length ? ` (${bends.join('; ')})` : ''}`, amount, tick, fade: fadeFor(c, LOAN_FADE[a] * TICKS_PER_MONTH, good) };
}

/** Remember an answer about a loan, and say so: the line of news, with the mood's turn if it turned. */
function remember(s: SimState, c: WorldCity, m: Memory, line: string): void {
  if (m.amount !== 0) c.memories.push(m);
  const turn = settleMood(s, c, '§', true).replace(/: §$/, '');
  if (line) news(s.world, s.tick, c.id, `${line}${m.amount !== 0 ? ` (${signed(m.amount)})` : ''}${turn ? `. ${turn}` : ''}`);
  s.rev++;
}

// ---------------------------------------------------------------------------
// The herald and the coin.

/**
 * A herald sets off: yours to a city (`toThem`), with coin (or, asking, with
 * none), or theirs to you with coin; a gift on the map that names its loan,
 * as long on the way as a coin gift takes. Yours with coin is paid as he sets
 * off, on the loan's ledger line.
 */
function herald(s: SimState, l: Loan, toThem: boolean, amount: number): Gift {
  const w = s.world;
  const way = giftWay(s, undefined as never, l.city, true) as { by: 'land' | 'sea' };
  const { id: wayId, L } = wayFor(l.city, way.by);
  const dur = Math.max(1, heraldTicks(l.city, way.by));
  const g: Gift = {
    id: w.nextGift++,
    from: toThem ? 'home' : l.city,
    to: toThem ? l.city : 'home',
    good: -1,
    amount,
    got: amount,
    by: way.by,
    way: wayId,
    phase: 2,
    at: s.tick,
    depot: 0,
    start: s.tick,
    dur,
    a0: toThem ? 0 : L,
    a1: toThem ? L : way.by === 'land' ? EDGE_ALONG : HORIZON_ALONG,
    ship: null,
    note: '',
    deal: 0,
    loan: l.id,
  };
  w.gifts.push(g);
  l.gift = g.id;
  if (!w.contact) w.contact = Math.max(1, s.tick);
  s.rev++;
  return g;
}

/** A new loan. */
function newLoan(s: SimState, city: CityId, side: Loan['side'], by: Loan['by'], amount: number): Loan {
  const w = s.world;
  const l: Loan = { id: w.nextLoan++, city, side, by, state: 'asking', amount, rate: 0, months: 0, owed: 0, rateWhy: [], monthsWhy: [], why: '', deal: 0, gift: 0, at: s.tick, until: 0, start: 0, due: 0, ended: 0, late: false, ...DEBT_FRESH };
  w.loans.push(l);
  s.rev++;
  return l;
}

/** Set a loan's terms. */
function setTerms(l: Loan, rate: number, months: number, rateWhy: LoanWhy[] = [], monthsWhy: LoanWhy[] = []): void {
  l.rate = rate;
  l.months = months;
  l.owed = owedOf(l.amount, rate);
  l.rateWhy = rateWhy;
  l.monthsWhy = monthsWhy;
}

/** The loan is agreed now: it falls due its months on, at the start of that day (loans are settled once a day, so it is settled on the day it names). */
function agreed(s: SimState, l: Loan): void {
  l.start = s.tick;
  l.due = Math.floor(s.tick / TICKS_PER_DAY) * TICKS_PER_DAY + l.months * TICKS_PER_MONTH;
}

/** A loan is over. */
export function end(s: SimState, l: Loan, state: Loan["state"]): void {
  l.state = state;
  l.ended = Math.max(1, s.tick);
  l.gift = 0;
  s.rev++;
}

// ---------------------------------------------------------------------------
// Your acts (the `loan` command).

export type LoanAct = 'ask' | 'offer' | 'accept' | 'decline' | 'repay' | 'time' | 'withhold' | 'grant' | 'deny' | 'forgive' | 'demand';

/** Why a loan's answer or repayment can't be given now, or '' if it can. */
export function loanRefusal(s: SimState, l: Loan | undefined, act: 'accept' | 'decline' | 'repay'): string {
  if (!l || !live(l)) return 'It is settled';
  if (act === 'accept' || act === 'decline') return l.state === 'terms' ? '' : 'No terms wait on your answer';
  if (l.side !== 'in' || (l.state !== 'running' && l.state !== 'overdue')) return 'Nothing to repay';
  if (collecting(s, l)) return `${whose(l.city)} army is in your city, taking what is owed`;
  if (spendable(s) < l.owed) return `The treasury can’t spare ${fmt(l.owed)} dr now`;
  return '';
}

/** Is the lender's army in your city now, collecting this debt? */
export function collecting(s: SimState, l: Loan): boolean {
  const r = l.raid ? s.world.raids.find((x) => x.id === l.raid) : undefined;
  return !!r && r.phase === 'raiding' && !!raidersOf(s, r);
}

/** Ask for a loan, offer one, accept or decline terms, repay (a command; nothing if its refusal says no). */
export function loanCommand(s: SimState, act: string, city: string, amount: number, rate: number, months: number, id: number): void {
  const w = s.world;
  if (act === 'ask') {
    if (askRefusal(s, city, amount)) return;
    const l = newLoan(s, city as CityId, 'in', 'you', amount);
    l.state = 'asking';
    herald(s, l, true, 0);
    return;
  }
  if (act === 'offer') {
    if (offerRefusal(s, city, amount, rate, months)) return;
    const l = newLoan(s, city as CityId, 'out', 'you', amount);
    setTerms(l, rate, months);
    l.state = 'offering';
    pay(s, -amount, 'lent', `to ${cityName(l.city)}`);
    herald(s, l, true, amount);
    helpedFoe(s, l.city, `a loan of ${fmt(amount)} dr`);
    return;
  }
  const l = loanOf(w, id);
  if (act === 'time' || act === 'withhold' || act === 'grant' || act === 'deny' || act === 'forgive' || act === 'demand') {
    if (l && debtRefusal(s, l, act) === '') debtAct(s, l, act);
    return;
  }
  if (act === 'accept' || act === 'decline' || act === 'repay') {
    if (!l || loanRefusal(s, l, act)) return;
    const c = cityOf(w, l.city);
    if (act === 'accept') {
      l.state = 'coming';
      agreed(s, l);
      herald(s, l, false, l.amount);
      news(w, s.tick, l.city, `You accepted ${whose(l.city)} terms: ${termsWords(l)}. ${cap(title(c))}’s herald brings the coin`);
    } else if (act === 'decline') {
      end(s, l, 'declined');
      news(w, s.tick, l.city, `You declined ${whose(l.city)} terms (${termsWords(l)})`);
    } else repay(s, l);
  }
}

/** Your loan is repaid now: the whole sum from the treasury (what is left of it, after seizures), and your herald takes it. Paying stops a debt's escalation: the lender's routes open again, a threat to collect it is lifted. */
function repay(s: SimState, l: Loan): void {
  l.late = s.tick > l.due;
  pay(s, -l.owed, 'repaid', `to ${cityName(l.city)}`);
  const was = l.state;
  l.state = 'repaying';
  herald(s, l, true, l.owed);
  if (was === 'overdue') debtSettled(s, l);
}

/** A debt of yours no longer overdue (paid, or paid off by what was taken): the lender's routes open again, and a threat to collect it is lifted. */
function debtSettled(s: SimState, l: Loan): void {
  const c = cityOf(s.world, l.city);
  const r = l.raid ? s.world.raids.find((x) => x.id === l.raid && x.ended === 0) : undefined;
  if (r) callOff(s, r, 'paid');
  settleMood(s, c);
  s.rev++;
}

// ---------------------------------------------------------------------------
// The rulers' offers and asks (favours.ts calls this in the month's turn, after every older kind).

/** Is your treasury low: wages owed, or less than two months' wages in hand? */
export const treasuryLow = (s: SimState): boolean => owedWages(s).owed > 0 || s.money < 2 * Math.max(100, wageBill(s));

/** The size of a ruler's offer or ask for a city your size: about three fair gifts' worth, in 500s. */
export const loanSize = (s: SimState, most: number): number => clamp(down(LOAN_GIFTS * fairGift(s)), 1000, most);

/** A ruler, in the month's turn (free, with no other deal this month): perhaps asks to borrow (in trouble), else perhaps offers to lend. */
export function loanDeal(s: SimState, c: WorldCity, month: number, i: number): boolean {
  return rulerAsks(s, c, month, i) || rulerOffers(s, c, month, i);
}

/** The terms a ruler in trouble offers when asking you for a loan: 10%, more when desperate, less when shrewd or greedy; 12 months (18 at war). */
export function askTerms(s: SimState, c: WorldCity): { rate: number; months: number; rateWhy: LoanWhy[]; monthsWhy: LoanWhy[] } {
  const t = troubles(s, c);
  const rateWhy: LoanWhy[] = [];
  const monthsWhy: LoanWhy[] = [];
  const traits = c.ruler?.traits ?? [];
  if (t.war) {
    rateWhy.push({ why: `at war with ${cityName(t.war)}: they pay for haste`, n: 3 });
    monthsWhy.push({ why: 'until the war is over', n: 6 });
  }
  if (t.harvest === 0) rateWhy.push({ why: 'their harvest failed', n: 2 });
  if (traits.includes('shrewd')) rateWhy.push({ why: 'shrewd: drives a hard bargain', n: -2 });
  if (traits.includes('greedy')) rateWhy.push({ why: 'greedy: grudges the interest', n: -2 });
  if (traits.includes('generous')) rateWhy.push({ why: 'generous: offers fair interest', n: 1 });
  return bounded(10, 12, rateWhy, monthsWhy);
}

/** Why they ask, in words: "to pay their soldiers: they are at war with Athens". */
function askWhy(s: SimState, c: WorldCity): string {
  const t = troubles(s, c);
  if (t.war) return `to pay their soldiers: they are at war with ${cityName(t.war)}`;
  if (t.harvest === 0) return 'to buy grain: their harvest failed';
  if (t.harvest === 1) return 'to buy grain: their harvest was poor';
  if (t.beaten) return `to rebuild after their defeat by ${cityName(t.beaten as CityId)}`;
  // (Only a demo asks for a ruler in no trouble: slice 28's #collect.)
  return 'for new walls and a temple';
}

/** A ruler in trouble, wary or better, with no loan of yours out to them, now and then asks you to lend them coin (if your treasury could). */
function rulerAsks(s: SimState, c: WorldCity, month: number, i: number): boolean {
  const w = s.world;
  if (liveLoan(w, c.id, 'out') || moodOf(c, s.tick) <= COLD) return false;
  if (troubles(s, c).words.length === 0) return false;
  if (dice(w, month, i, 1) >= ASK_ODDS) return false;
  const amount = loanSize(s, 4000);
  if (spendable(s) < amount) return false;
  makeLoanAsk(s, c, amount);
  return true;
}

/** A ruler asks to borrow (a deal, and its loan): their terms and why. */
export function makeLoanAsk(s: SimState, c: WorldCity, amount: number): Deal {
  const t = askTerms(s, c);
  const why = askWhy(s, c);
  const d = makeDeal(s, 'loanask', c.id, -1, amount, s.tick + LOAN_ANSWER, why);
  const l = newLoan(s, c.id, 'out', 'them', amount);
  l.state = 'proposed';
  l.deal = d.id;
  l.why = why;
  setTerms(l, t.rate, t.months, t.rateWhy, t.monthsWhy);
  news(s.world, s.tick, c.id, `${rulerName(c)} asks to borrow ${termsWords(l)}, ${why}`);
  return d;
}

/** A pleased ruler with coin to spare, in no trouble, with no loan either way between you, now and then offers you one (four times as often when your treasury is low). */
function rulerOffers(s: SimState, c: WorldCity, month: number, i: number): boolean {
  const w = s.world;
  if (liveLoan(w, c.id, 'in') || liveLoan(w, c.id, 'out') || overdueOf(w).length || troubles(s, c).words.length || moodOf(c, s.tick) < OFFER_PLEASED) return false;
  const { spare } = spareOf(s, c);
  if (spare < 1000) return false;
  const traits = c.ruler?.traits ?? [];
  const low = treasuryLow(s);
  const odds = OFFER_ODDS * (low ? LOW_ODDS : 1) * (traits.includes('generous') || traits.includes('greedy') ? 1.5 : 1);
  if (dice(w, month, i, 2) >= odds) return false;
  makeLoanOffer(s, c, Math.min(spare, loanSize(s, 5000)));
  return true;
}

/** A ruler offers to lend (a deal, and its loan): on their own terms, a percent cheaper. */
export function makeLoanOffer(s: SimState, c: WorldCity, amount: number, why?: string): Deal {
  const t = loanTerms(s, c, true);
  const reason = why ?? `pleased with your city${treasuryLow(s) ? ', and has heard your treasury is low' : ''}`;
  const d = makeDeal(s, 'loanoffer', c.id, -1, amount, s.tick + LOAN_ANSWER, reason);
  const l = newLoan(s, c.id, 'in', 'them', amount);
  l.state = 'proposed';
  l.deal = d.id;
  l.why = reason;
  setTerms(l, t.rate, t.months, t.rateWhy, t.monthsWhy);
  news(s.world, s.tick, c.id, `${rulerName(c)}, ${reason}, offers to lend you ${termsWords(l)}`);
  return d;
}

/** Why an answer to a ruler's offer or ask can't be given now, or '' if it can (favours.ts: answerRefusal). */
export function loanAnswerRefusal(s: SimState, d: Deal, act: string): string {
  const l = loanOfDeal(s.world, d.id);
  if (!l || l.state !== 'proposed') return 'It is settled';
  if (d.kind === 'loanoffer') return act === 'take' ? (overdueOf(s.world).length ? 'Not while a debt of yours is overdue' : '') : act === 'decline' ? '' : 'Not an answer';
  if (act === 'send') return spendable(s) < l.amount ? `The treasury can’t spare ${fmt(l.amount)} dr now` : '';
  return act === 'refuse' ? '' : 'Not an answer';
}

/** Answer a ruler's offer (take it, decline it) or ask (lend it: `send`; refuse it); favours.ts calls this after its own check. */
export function answerLoan(s: SimState, d: Deal, act: string, close: (state: Deal['state']) => void): void {
  const l = loanOfDeal(s.world, d.id);
  if (!l) return;
  const c = cityOf(s.world, d.city);
  const words = `${fmt(l.amount)} dr`;
  if (d.kind === 'loanoffer') {
    if (act === 'take') {
      close('met');
      l.state = 'coming';
      agreed(s, l);
      herald(s, l, false, l.amount);
      remember(s, c, loanMemory(c, 'taken', `you took up their offer of a loan of ${words}`, s.tick), `You took up ${whose(l.city)} offer: ${termsWords(l)}. The coin comes with ${title(c)}’s herald`);
    } else {
      close('declined');
      end(s, l, 'declined');
      remember(s, c, loanMemory(c, 'declined', `you turned down their offer of a loan`, s.tick), '');
    }
    return;
  }
  if (act === 'send') {
    close('met');
    l.state = 'sending';
    pay(s, -l.amount, 'lent', `to ${cityName(l.city)}`);
    herald(s, l, true, l.amount);
    helpedFoe(s, l.city, `a loan of ${words}`);
    return;
  }
  close('refused');
  end(s, l, 'refused');
  remember(s, c, loanMemory(c, 'refused', `you refused to lend them ${words}`, s.tick), `You refused ${whose(l.city)} ask for a loan of ${words}`);
}

/** A ruler's offer or ask ran out unanswered (favours.ts, on the day). */
export function loanDealLapsed(s: SimState, d: Deal, close: (state: Deal['state']) => void): void {
  const l = loanOfDeal(s.world, d.id);
  close('lapsed');
  if (!l) return;
  const c = cityOf(s.world, d.city);
  end(s, l, 'lapsed');
  if (d.kind === 'loanoffer') news(s.world, s.tick, d.city, `${whose(d.city)} offer of a loan has lapsed unanswered`);
  else remember(s, c, loanMemory(c, 'lapsed', `you ignored their ask for a loan of ${fmt(l.amount)} dr`, s.tick), `${whose(d.city)} ask for a loan ran out unanswered`);
}

// ---------------------------------------------------------------------------
// A herald arrives (diplomacy.ts calls this for a gift that names its loan).

export function heraldArrived(s: SimState, g: Gift): void {
  const w = s.world;
  const l = loanOf(w, g.loan);
  if (!l || l.gift !== g.id) return;
  l.gift = 0;
  const c = cityOf(w, l.city);
  const name = cityName(l.city);
  s.rev++;
  if (l.state === 'asking') {
    // Your ask reaches them: their answer, as things stand now.
    const no = lendRefusal(s, c);
    if (no) {
      l.why = no;
      end(s, l, 'refused');
      news(w, s.tick, l.city, `Your herald reached ${name}: ${no}`);
      return;
    }
    const { spare } = spareOf(s, c);
    const t = loanTerms(s, c);
    if (l.amount > spare) {
      l.why = `${name} can spare only ${fmt(spare)} dr now, not the ${fmt(l.amount)} you asked for`;
      l.amount = spare;
    }
    setTerms(l, t.rate, t.months, t.rateWhy, t.monthsWhy);
    l.state = 'terms';
    l.until = s.tick + TERMS_STAND;
    news(w, s.tick, l.city, `Your herald reached ${name}: ${title(c)} will lend ${termsWords(l)} (${fmt(l.owed)} dr in all): ${whysWords(l.rateWhy, '%')}. Accept or decline on ${whose(l.city)} page`);
    return;
  }
  if (l.state === 'offering' || l.state === 'sending') {
    if (l.state === 'offering') {
      const a = offerAnswer(s, c, l.amount, l.rate);
      if (!a.take) {
        l.why = a.why;
        l.state = 'returning';
        herald(s, l, false, l.amount);
        news(w, s.tick, l.city, `${cap(title(c))} of ${name} sends back the ${fmt(l.amount)} dr you offered to lend: ${a.why}`);
        return;
      }
      l.why = a.why;
      l.state = 'running';
      agreed(s, l);
      const m = loanMemory(c, a.need ? 'needed' : 'cheap', a.need ? `you lent them ${fmt(l.amount)} dr in their need` : `you lent them ${fmt(l.amount)} dr cheaply`, s.tick);
      remember(s, c, m, `${cap(title(c))} of ${name} takes your loan of ${termsWords(l)}: ${a.why}. It is due back ${dayWords(l.due)}`);
      return;
    }
    l.state = 'running';
    agreed(s, l);
    remember(s, c, loanMemory(c, 'lent', `you lent them ${fmt(l.amount)} dr in their need`, s.tick), `Your loan of ${fmt(l.amount)} dr reached ${name}: ${title(c)} is grateful. It is due back ${dayWords(l.due)}, ${fmt(l.owed)} dr in all`);
    return;
  }
  if (l.state === 'coming') {
    income(s, l.amount, 'borrowed', `from ${name}`);
    l.state = 'running';
    news(w, s.tick, l.city, `${whose(l.city)} loan of ${fmt(l.amount)} dr has come into your treasury: ${fmt(l.owed)} dr is due back ${dayWords(l.due)}`);
    return;
  }
  if (l.state === 'returning') {
    income(s, l.amount, 'returned', `by ${name}`);
    end(s, l, 'declined');
    return;
  }
  if (l.state === 'repaying') {
    if (l.side === 'out') {
      income(s, l.owed, 'repayment', `by ${name}`);
      end(s, l, 'repaid');
      news(w, s.tick, l.city, `${whose(l.city)} herald brings the ${fmt(l.owed)} dr it owed you, loan and interest: repaid in full`);
      return;
    }
    end(s, l, 'repaid');
    const m = loanMemory(c, l.late ? 'late' : 'repaid', l.late ? `you repaid their loan, late` : `you repaid their loan on time`, s.tick);
    remember(s, c, m, `Your ${fmt(l.owed)} dr reached ${name}: ${l.late ? 'repaid, late' : `repaid on time, and ${title(c)} is pleased. Greece knows you pay your debts`}`);
  }
}

// ---------------------------------------------------------------------------
// Each day: terms running out, days due, debts overdue.

/** Loans, once a day: terms let run out, reminders, loans falling due (yours paid from the treasury if it can be and you don't hold it back, theirs paid, asked off or not by the dice), a borrower's ask for time running out, debts overdue (yours climbing their steps, theirs a demand's day); once a month, old ones let go. Nothing with no loans. */
export function stepLoans(s: SimState, map: CoastMap): void {
  if (s.tick % TICKS_PER_DAY !== 0) return;
  const w = s.world;
  if (w.loans.length === 0) return;
  for (const l of w.loans.slice()) {
    if (!live(l)) continue;
    if (l.state === 'terms' && s.tick >= l.until) {
      end(s, l, 'lapsed');
      news(w, s.tick, l.city, `${whose(l.city)} terms have lapsed unanswered (${termsWords(l)})`);
    } else if (l.state === 'running' && s.tick >= l.due) fallsDue(s, l);
    else if (l.state === 'running' && l.side === 'in' && !l.reminded && l.due - s.tick <= REMIND) remind(s, l);
    else if (l.state === 'grace' && s.tick >= l.until) {
      overdue(s, l);
      news(w, s.tick, l.city, `You let ${whose(l.city)} ask for more time run out: the loan is overdue (${fmt(l.owed)} dr)`, true);
    } else if (l.state === 'overdue') stepOverdue(s, map, l);
  }
  if (s.tick % TICKS_PER_MONTH === 0 && w.loans.some((l) => !live(l) && s.tick - l.ended > KEEP_ENDED)) w.loans = w.loans.filter((l) => live(l) || s.tick - l.ended <= KEEP_ENDED);
}

/** A month before your loan's day: a reminder, with what the treasury can spend and that you may ask for more time. */
function remind(s: SimState, l: Loan): void {
  l.reminded = true;
  const n = Math.max(1, Math.ceil((l.due - s.tick) / TICKS_PER_DAY));
  const can = spendable(s);
  const pays = l.withhold ? 'you have chosen to hold it back' : can >= l.owed ? 'the treasury can pay it' : `the treasury can spend ${fmt(can)} dr now`;
  news(s.world, s.tick, l.city, `Your loan from ${cityName(l.city)} falls due in ${n === 1 ? '1 day' : `${n} days`}, on ${dayWords(l.due)}: ${fmt(l.owed)} dr, and ${pays}. You can ask for more time on ${whose(l.city)} page`);
  s.rev++;
}

/** A loan's day has come. */
function fallsDue(s: SimState, l: Loan): void {
  const w = s.world;
  const c = cityOf(w, l.city);
  const name = cityName(l.city);
  if (l.side === 'in') {
    if (!l.withhold && spendable(s) >= l.owed) {
      repay(s, l);
      news(w, s.tick, l.city, `Your loan from ${name} fell due: ${fmt(l.owed)} dr paid from the treasury, and your herald takes it to ${name}`);
      return;
    }
    overdue(s, l);
    warn(s, l);
    return;
  }
  // Theirs: as likely as they are now.
  const { p } = likelyToRepay(s, c, l.owed, l.rate);
  if (dice(w, l.id, 0, 7) < p) {
    l.state = 'repaying';
    herald(s, l, false, l.owed);
    news(w, s.tick, l.city, `${name} repays your loan on the day: ${title(c)}’s herald brings ${fmt(l.owed)} dr`);
    return;
  }
  // (Slice 28: one who can't pay, and is not cold towards you, may first ask for more time: once a loan.)
  if (l.extended === 0 && moodOf(c, s.tick) > COLD && dice(w, l.id, 1, 8) < GRACE_ODDS) {
    l.state = 'grace';
    l.until = s.tick + GRACE_ANSWER;
    s.rev++;
    news(w, s.tick, l.city, `${cap(title(c))} of ${name} cannot repay the ${fmt(l.owed)} dr due today, and asks for ${TIME_MONTHS} months more, for ${TIME_RATE}% more (${fmt(timeOwed(l, TIME_RATE))} dr in all). Grant or refuse it on ${whose(l.city)} page by ${dayWords(l.until)}`, true);
    return;
  }
  overdue(s, l);
  news(w, s.tick, l.city, `${name} has not repaid the ${fmt(l.owed)} dr it owes you, due today: the loan is overdue. On ${whose(l.city)} page you can forgive it, demand it, or send your soldiers to collect it`, true);
}

/** A loan stands overdue from now. */
function overdue(s: SimState, l: Loan): void {
  l.state = 'overdue';
  l.fell = Math.max(1, s.tick);
  l.stepAt = s.tick;
  s.rev++;
}

/** What a loan comes to with `pct` more of its sum on it. */
const timeOwed = (l: Loan, pct: number): number => l.owed + Math.round((l.amount * pct) / 100);

/**
 * Step 1 of your default, on the day: the lender's warning and their memory
 * of a broken promise (the slowest to fade), and every other ruler hearing of
 * it (a smaller memory each, and dearer terms everywhere for three years).
 */
function warn(s: SimState, l: Loan): void {
  const w = s.world;
  const c = cityOf(w, l.city);
  const name = cityName(l.city);
  l.step = 1;
  l.stepAt = s.tick;
  const why = l.withhold ? 'you held back the payment' : 'the treasury could not pay it';
  remember(s, c, loanMemory(c, 'defaulted', `you broke your word: their loan of ${fmt(l.amount)} dr went unpaid on its day`, s.tick), '');
  for (const o of w.cities) {
    if (!o.ruler || o.id === l.city) continue;
    o.memories.push(loanMemory(o, 'heard', `heard you failed to repay ${name}`, s.tick));
    settleMood(s, o);
  }
  news(w, s.tick, l.city, `Your loan from ${name} fell due and went unpaid (${why}): ${fmt(l.owed)} dr is overdue. ${cap(title(c))} warns that in two months, on ${dayWords(s.tick + STEP_GAP)}, ${he(c)} will close ${cityName(l.city) === 'Troy' ? 'the sea' : 'the road'} to you and seize your goods on it; and Greece has heard (every loan’s terms are dearer now)`, true);
}

/**
 * An overdue loan, once a day. Yours: paid as soon as the treasury can, unless
 * you hold it back; meanwhile it climbs its steps, two months apart: seizing
 * (step 2, and every day after), then the threat and the army (step 3; again
 * a while after an army that left the debt standing). Theirs: a demand's day.
 */
export function stepOverdue(s: SimState, map: CoastMap, l: Loan): void {
  const w = s.world;
  if (l.side !== 'in') {
    if (l.demand > 0 && s.tick >= l.demand) demandDay(s, l);
    return;
  }
  if (!l.withhold && spendable(s) >= l.owed && !collecting(s, l)) {
    const days = Math.round((s.tick - l.due) / TICKS_PER_DAY);
    repay(s, l);
    news(w, s.tick, l.city, `Your overdue loan from ${cityName(l.city)} is paid at last: ${fmt(l.owed)} dr, ${days} days late`);
    return;
  }
  // (A loan overdue from before slice 28: its warning now.)
  if (l.step === 0) warn(s, l);
  if (l.step === 1 && s.tick >= l.stepAt + STEP_GAP) seizeStep(s, l);
  if (l.step >= 2) {
    seize(s, l);
    if (!live(l)) return;
  }
  if (l.step === 2 && s.tick >= l.stepAt + STEP_GAP && !threatLive(w)) {
    l.step = 3;
    l.stepAt = s.tick;
    l.raid = threatenDebt(s, map, cityOf(w, l.city), l).id;
    return;
  }
  if (l.step === 3) {
    const r = w.raids.find((x) => x.id === l.raid);
    // (The army gone, the debt still standing: another threat after a lull.)
    if ((!r || (r.ended > 0 && s.tick - r.ended >= COLLECT_LULL)) && !threatLive(w) && !liveRaid(w)) {
      l.stepAt = s.tick;
      l.raid = threatenDebt(s, map, cityOf(w, l.city), l).id;
    } else if (r && r.ended === 0 && r.coin !== l.owed && r.phase !== 'raiding') r.coin = l.owed;
  }
}

/** Step 2: two months on, still unpaid, the lender closes their routes and seizes your goods on them. */
function seizeStep(s: SimState, l: Loan): void {
  const c = cityOf(s.world, l.city);
  l.step = 2;
  l.stepAt = s.tick;
  settleMood(s, c);
  news(s.world, s.tick, l.city, `${cap(title(c))} of ${cityName(l.city)} has closed ${his(c)} routes to you over your unpaid debt (${fmt(l.owed)} dr), and seizes your goods on them: what waits for ${his(c)} traders in your caravan yard and on your quay, and anything of yours on its way to ${cityName(l.city)}. In two months, on ${dayWords(s.tick + STEP_GAP)}, ${he(c)} sends men to collect what is left`, true);
}
const his = (c: WorldCity): string => (c.ruler?.female ? 'her' : 'his');

/** The depots whose goods wait for a city's traders: the caravan yard for a road, the trading post for a sea route. */
function depotsFor(s: SimState, city: CityId): Array<{ depot: NonNullable<ReturnType<typeof caravanYard>>; sells: boolean[]; where: string }> {
  const out: Array<{ depot: NonNullable<ReturnType<typeof caravanYard>>; sells: boolean[]; where: string }> = [];
  for (const r of s.world.routes) {
    if (r.city !== city) continue;
    const depot = r.kind === 'land' ? caravanYard(s) : tradingPost(s);
    if (depot) out.push({ depot, sells: r.sell, where: r.kind === 'land' ? 'in your caravan yard' : 'on your quay' });
  }
  return out;
}

/** What a measure of a trade good is worth to a city (dr, at its price). */
const unitOf = (c: WorldCity, k: number): number => Math.max(0.01, c.price[k] / 100);

/**
 * Step 2 and after, once a day: the lender seizes your goods on their routes,
 * up to what is left owed: what waits for their traders in the caravan yard or
 * on the quay (of what you sell them), and anything of yours on its way to
 * them on the map (a gift, goods sent for a request, coin of a loan to them).
 * Each seizure a line of news, a ledger line and the stock book, and taken off
 * the debt; paid off, the loan is collected.
 */
export function seize(s: SimState, l: Loan): void {
  const w = s.world;
  const c = cityOf(w, l.city);
  const name = cityName(l.city);
  const took: string[] = [];
  let value = 0;
  for (const { depot, sells, where } of depotsFor(s, l.city)) {
    TRADE_GOODS.forEach((ware, k) => {
      const left = l.owed - value;
      const q = held(depot, ware);
      if (!sells[k] || q <= 0 || left <= 0) return;
      const unit = unitOf(c, k);
      const n = Math.min(q, Math.ceil(left / unit));
      const worth = Math.min(left, Math.round(n * unit));
      setHeld(depot, ware, q - n);
      note(s, ware, 'lost', `seized:${l.city}`, n);
      pay(s, 0, 'seized', `${name} · ${WARE_NAMES[ware]}`, n);
      value += worth;
      took.push(`${fmt(n)} ${WARE_NAMES[ware]} ${where} (worth ${fmt(worth)} dr to ${name})`);
      s.looks++;
    });
  }
  for (const g of w.gifts.slice()) {
    const left = l.owed - value;
    if (left <= 0) break;
    if (g.from !== 'home' || g.to !== l.city || g.phase !== 2) continue;
    const loan = g.loan ? loanOf(w, g.loan) : undefined;
    // (Not your repayment of this debt, nor of any other.)
    if (loan && loan.state === 'repaying') continue;
    const coin = g.good < 0;
    const unit = coin ? 1 : unitOf(c, g.good);
    const n = Math.min(g.got, Math.ceil(left / unit));
    // (A loan's coin goes whole or not at all.)
    if (n <= 0 || (loan && n < g.got)) continue;
    const worth = Math.min(left, Math.round(n * unit));
    g.got -= n;
    g.amount = Math.max(0, g.amount - n);
    pay(s, 0, 'seized', `${name} · ${coin ? 'drachmas' : WARE_NAMES[TRADE_GOODS[g.good]]}`, n);
    value += worth;
    const what = loan ? `your loan of ${fmt(n)} dr to ${name}` : g.deal ? `the ${coin ? `${fmt(n)} dr` : `${fmt(n)} ${WARE_NAMES[TRADE_GOODS[g.good]]}`} you sent them` : `your gift of ${coin ? `${fmt(n)} dr` : `${fmt(n)} ${WARE_NAMES[TRADE_GOODS[g.good]]}`}`;
    took.push(coin ? `${what} on its way` : `${what} on its way (worth ${fmt(worth)} dr to ${name})`);
    if (g.got <= 0) {
      w.gifts = w.gifts.filter((x) => x !== g);
      if (g.deal) {
        const d = w.deals.find((x) => x.id === g.deal);
        if (d) d.gift = 0;
      }
      if (loan) {
        loan.why = `seized by ${name} against your debt`;
        end(s, loan, 'refused');
      }
    }
    s.rev++;
  }
  if (value <= 0) return;
  takeOff(s, l, value, `${cap(title(c))} of ${name} seized ${took.join(', and ')} against your debt`);
}

/**
 * Take `value` (dr) off a debt of yours: what was seized, or what the lender's
 * army carried off. A line of news (`what`, then what is left); paid off, the
 * loan is collected, and the lender's routes open again.
 */
export function takeOff(s: SimState, l: Loan, value: number, what: string): void {
  const v = Math.min(l.owed, Math.max(0, Math.round(value)));
  l.seized += v;
  l.owed -= v;
  s.rev++;
  if (l.owed <= 0) {
    end(s, l, 'collected');
    debtSettled(s, l);
    news(s.world, s.tick, l.city, `${what}: the debt is paid off`, true);
    return;
  }
  news(s.world, s.tick, l.city, `${what}: ${fmt(l.owed)} dr is still owed`, true);
}

/** Pay a debt of yours in full now, as the lender's threat asks (raids.ts: answering it): repaid from the treasury, and the threat lifted. */
export function payDebt(s: SimState, id: number): void {
  const l = loanOf(s.world, id);
  if (!l || loanRefusal(s, l, 'repay')) return;
  const owed = l.owed;
  repay(s, l);
  news(s.world, s.tick, l.city, `You paid ${cityName(l.city)} the ${fmt(owed)} dr you owed: your herald takes it`);
}

/** A lender's army has left your land (raids.ts): what it carried off (dr, at their prices) comes off the debt; beaten or empty-handed, the debt stands, and another comes after a lull. */
export function collectorsGone(s: SimState, r: Raid, value: number): void {
  const l = loanOf(s.world, r.loan);
  if (!l || !live(l) || l.state !== 'overdue') return;
  const fell = r.fallen ? `; ${r.fallen} of its ${r.men} men fell${r.broke ? ' and the rest ran' : ''}` : '';
  if (value > 0) {
    takeOff(s, l, value, `${whose(r.city)} army has left your land with ${lootWords(r)} (worth ${fmt(Math.min(value, l.owed))} dr to them)${fell}`);
    return;
  }
  s.rev++;
  news(s.world, s.tick, l.city, `${whose(r.city)} army has left your land with nothing${fell}: the ${fmt(l.owed)} dr still stands, and ${title(cityOf(s.world, l.city))} will send again in about four months unless it is paid`, true);
}

// ---------------------------------------------------------------------------
// Your answers about a debt (the `loan` command's acts).

type DebtAct = 'time' | 'withhold' | 'grant' | 'deny' | 'forgive' | 'demand';

/** Would the lender give you more time now, and why (asked of a loan running): granted when cordial or better, or wary and steadfast or generous; refused when cold, or wary and greedy or shrewd. */
export function timeAnswer(s: SimState, l: Loan): { yes: boolean; why: string; months: number; pct: number } {
  const c = cityOf(s.world, l.city);
  const traits = c.ruler?.traits ?? [];
  const mood = moodOf(c, s.tick);
  const lvl = moodLevel(mood);
  const word = MOOD_WORDS[lvl];
  const generous = traits.includes('generous');
  const greedy = traits.includes('greedy');
  const months = TIME_MONTHS * (generous ? 2 : 1);
  const pct = generous ? 2 : greedy ? 5 : TIME_RATE;
  const terms = `${monthsWords(months)} more for ${pct}% more of the sum${generous ? ' (generous)' : greedy ? ' (greedy)' : ''}`;
  if (mood <= COLD) return { yes: false, why: `${title(c)} is ${word} towards you, and will give you no more time`, months, pct };
  if (lvl >= 3) return { yes: true, why: `${word}: ${terms}`, months, pct };
  if (traits.includes('steadfast') || generous) return { yes: true, why: `wary, but ${traits.includes('steadfast') ? 'steadfast' : 'generous'}: ${terms}`, months, pct };
  return { yes: false, why: `${title(c)} is wary of you${greedy ? ', and greedy' : traits.includes('shrewd') ? ', and shrewd' : ''}: no more time`, months, pct };
}

/** Why an act about a debt can't be done now, or '' if it can. */
export function debtRefusal(s: SimState, l: Loan | undefined, act: string): string {
  if (!l || !live(l)) return 'It is settled';
  const c = cityOf(s.world, l.city);
  if (act === 'time') {
    if (l.side !== 'in' || l.state !== 'running') return 'Only a loan you owe that is still running';
    if (l.extended > 0) return `${cap(title(c))} gave you more time once already`;
    return '';
  }
  if (act === 'withhold') return l.side === 'in' && (l.state === 'running' || l.state === 'overdue') ? '' : 'Only a loan you owe';
  if (act === 'grant' || act === 'deny') return l.side === 'out' && l.state === 'grace' ? '' : 'They ask for no time';
  if (l.side !== 'out' || l.state !== 'overdue') return 'Only a loan overdue to you';
  if (l.sent) return 'Your soldiers are out after it';
  if (act === 'forgive') return '';
  if (act === 'demand') return l.demanded ? (l.demand > 0 ? 'Your demand stands: wait for its day' : 'You demanded it once already') : '';
  return 'Not an answer';
}

/** Do an act about a debt (debtRefusal said yes). */
function debtAct(s: SimState, l: Loan, act: DebtAct): void {
  const w = s.world;
  const c = cityOf(w, l.city);
  const name = cityName(l.city);
  if (act === 'withhold') {
    l.withhold = !l.withhold;
    s.rev++;
    return;
  }
  if (act === 'time') {
    const a = timeAnswer(s, l);
    l.extended++;
    if (!a.yes) {
      s.rev++;
      news(w, s.tick, l.city, `You asked ${name} for more time: ${a.why}. ${fmt(l.owed)} dr is still due ${dayWords(l.due)}`);
      return;
    }
    l.due += a.months * TICKS_PER_MONTH;
    l.owed = timeOwed(l, a.pct);
    l.months += a.months;
    l.rate += a.pct;
    l.rateWhy = [...l.rateWhy, { why: 'more time, asked of them', n: a.pct }];
    l.monthsWhy = [...l.monthsWhy, { why: 'more time, asked of them', n: a.months }];
    l.reminded = false;
    s.rev++;
    news(w, s.tick, l.city, `${cap(title(c))} of ${name} gives you more time (${a.why}): ${fmt(l.owed)} dr, due ${dayWords(l.due)}`);
    return;
  }
  if (act === 'grant' || act === 'deny') {
    if (act === 'grant') {
      l.extended++;
      l.owed = timeOwed(l, TIME_RATE);
      l.rate += TIME_RATE;
      l.months += TIME_MONTHS;
      l.rateWhy = [...l.rateWhy, { why: 'more time, which you gave', n: TIME_RATE }];
      l.monthsWhy = [...l.monthsWhy, { why: 'more time, which you gave', n: TIME_MONTHS }];
      l.due = Math.floor(s.tick / TICKS_PER_DAY) * TICKS_PER_DAY + TIME_MONTHS * TICKS_PER_MONTH;
      l.state = 'running';
      l.until = 0;
      remember(s, c, loanMemory(c, 'granted', `you gave them more time to repay`, s.tick), `You gave ${name} more time: ${fmt(l.owed)} dr, due ${dayWords(l.due)}`);
      return;
    }
    overdue(s, l);
    remember(s, c, loanMemory(c, 'denied', `you would not give them more time to repay`, s.tick), `You refused ${name} more time: the loan is overdue (${fmt(l.owed)} dr)`);
    return;
  }
  if (act === 'forgive') {
    const owed = l.owed;
    end(s, l, 'forgiven');
    l.demand = 0;
    for (const o of w.cities) {
      if (!o.ruler || o.id === l.city) continue;
      o.memories.push(loanMemory(o, 'forgaveheard', `heard you forgave ${whose(l.city)} debt`, s.tick));
      settleMood(s, o);
    }
    remember(s, c, loanMemory(c, 'forgave', `you forgave their debt of ${fmt(owed)} dr`, s.tick), `You forgave ${whose(l.city)} debt of ${fmt(owed)} dr: ${title(c)} is moved, and Greece hears of it`);
    return;
  }
  // Demand it: a deadline.
  l.demanded = true;
  l.demand = Math.floor(s.tick / TICKS_PER_DAY) * TICKS_PER_DAY + DEMAND_DAYS;
  s.rev++;
  const f = demandOdds(s, l);
  news(w, s.tick, l.city, `You demanded the ${fmt(l.owed)} dr ${name} owes you by ${dayWords(l.demand)}: ${f.word} to pay (${f.why})`);
}

/** How likely a debtor is to meet your demand, and why: how likely they are to repay, and how much they fear your army against theirs (up to 30 in 100 more). */
export function demandOdds(s: SimState, l: Loan): { p: number; word: Likely; why: string } {
  const c = cityOf(s.world, l.city);
  const base = likelyToRepay(s, c, l.owed, l.rate);
  const f = fearOf(s, c);
  const p = clamp(Math.round((base.p + f.p) * 100) / 100, 0.05, 0.95);
  const why = `${likelyWords(base.why)}${f.words ? `, ${f.words} (+)` : ''}`;
  return { p, word: p >= 0.75 ? 'likely' : p >= 0.5 ? 'fair' : 'doubtful', why };
}

/** How much a ruler fears your army (0 to 0.3), in words: your men against their garrison. */
export function fearOf(s: SimState, c: WorldCity): { p: number; words: string } {
  const ours = s.army.soldiers.filter((x) => x.company > 0 && (x.state === 'ready' || x.state === 'away')).length;
  if (!ours) return { p: 0, words: '' };
  const theirs = garrisonOf(s, c);
  const p = clamp(Math.round(0.3 * Math.min(1, ours / Math.max(1, theirs)) * 100) / 100, 0, 0.3);
  return { p, words: `afraid of your army: your ${ours} men against their ${theirs}` };
}

/** A city's garrison (men), by its character and its troubles (expeditions.ts uses it too). */
export const GARRISON: Partial<Record<CityId, number>> = { sparta: 60, athens: 40, troy: 45, corinth: 30 };
export function garrisonOf(s: SimState, c: WorldCity): number {
  let n = GARRISON[c.id] ?? 30;
  const t = troubles(s, c);
  if (t.war) n *= 0.6;
  if (t.beaten) n *= 0.7;
  if (c.ruler?.traits.includes('warlike')) n *= 1.2;
  return Math.round(n);
}

/** A demand's day: the debtor pays (their herald brings it) or doesn't, as the dice and their fear say. */
function demandDay(s: SimState, l: Loan): void {
  const w = s.world;
  const c = cityOf(w, l.city);
  const name = cityName(l.city);
  l.demand = 0;
  const { p } = demandOdds(s, l);
  if (dice(w, l.id, 2, 9) < p) {
    l.state = 'repaying';
    herald(s, l, false, l.owed);
    news(w, s.tick, l.city, `${name} meets your demand: ${title(c)}’s herald brings the ${fmt(l.owed)} dr`, true);
    return;
  }
  s.rev++;
  news(w, s.tick, l.city, `${name} has not met your demand for the ${fmt(l.owed)} dr it owes you. You can still forgive it, or send your soldiers to collect it`, true);
}

/**
 * For demos and tests: a loan to a ruler falls overdue on its day whatever the
 * dice say (as if they had said no, and they asked no time). Says so.
 */
export function stageDefault(s: SimState, l: Loan, why: string): void {
  if (l.side !== 'out' || l.state !== 'running') return;
  l.extended = 1;
  overdue(s, l);
  news(s.world, s.tick, l.city, `${cityName(l.city)} has not repaid the ${fmt(l.owed)} dr it owes you, due ${dayWords(l.due)}: the loan is overdue (${why})`, true);
}

// ---------------------------------------------------------------------------
// In words, for the panels, chips and lines.

/** The loans that stand as debts either way, the next due first. */
export function debts(w: World): Loan[] {
  return w.loans.filter((l) => owing(l) || l.state === 'repaying').filter((l) => l.state !== 'repaying').sort((a, b) => a.due - b.due);
}

/** How a loan stands, in words, for the panels: "Running: 2,240 dr due 12 June 746 BC (in 140 days)". */
export function loanLine(s: SimState, l: Loan): string {
  const name = cityName(l.city);
  const days = (t: number): string => {
    const n = Math.max(1, Math.ceil((t - s.tick) / TICKS_PER_DAY));
    return n === 1 ? '1 day' : `${n} days`;
  };
  const g = l.gift ? s.world.gifts.find((x) => x.id === l.gift) : undefined;
  const at = g ? g.start + g.dur : s.tick;
  switch (l.state) {
    case 'asking':
      return `Your herald is on his way to ${name} to ask for ${fmt(l.amount)} dr: the answer when he arrives, about ${dayWords(at)} (${days(at)})`;
    case 'terms':
      return `${name} will lend ${termsWords(l)}: ${fmt(l.owed)} dr in all, due ${dayWords(s.tick + l.months * TICKS_PER_MONTH)} if you accept today. The terms stand until ${dayWords(l.until)}`;
    case 'proposed':
      return l.side === 'in' ? `${name} offers to lend you ${termsWords(l)}` : `${name} asks to borrow ${termsWords(l)}`;
    case 'coming':
      return `${whose(l.city)} herald brings the ${fmt(l.amount)} dr: at ${g?.by === 'sea' ? 'your gulf' : 'the edge of your land'} in ${days(at)}. ${fmt(l.owed)} dr is due back ${dayWords(l.due)}`;
    case 'offering':
      return `Your herald takes the ${fmt(l.amount)} dr you offer to ${name}: their answer when he arrives, about ${dayWords(at)} (${days(at)})`;
    case 'sending':
      return `Your herald takes the ${fmt(l.amount)} dr to ${name}: there in ${days(at)}`;
    case 'returning':
      return `${name} sent back your ${fmt(l.amount)} dr: their herald is on his way, in ${days(at)}`;
    case 'running':
      return `${fmt(l.owed)} dr due ${l.side === 'in' ? 'to' : 'from'} ${name} ${dayWords(l.due)} (in ${days(l.due)})`;
    case 'overdue':
      if (l.side === 'in') return `Overdue since ${dayWords(l.due)}: ${fmt(l.owed)} dr${l.seized ? ` (${fmt(l.seized)} dr of it seized already)` : ''}, ${l.withhold ? 'held back' : 'paid as soon as the treasury can spend it'}`;
      return `Overdue since ${dayWords(l.due)}: ${name} has not repaid the ${fmt(l.owed)} dr it owes you${l.seized ? ` (${fmt(l.seized)} dr recovered by your soldiers)` : ''}`;
    case 'grace':
      return `${name} cannot repay the ${fmt(l.owed)} dr due ${dayWords(l.due)}, and asks for ${TIME_MONTHS} months more, for ${TIME_RATE}% more (${fmt(timeOwed(l, TIME_RATE))} dr in all): answer by ${dayWords(l.until)} (${days(l.until)})`;
    case 'forgiven':
      return `Forgiven, ${dayWords(l.ended)}: ${fmt(l.owed)} dr`;
    case 'collected':
      return l.side === 'in' ? `Collected by ${name}, ${dayWords(l.ended)}: ${fmt(l.seized)} dr seized and carried off` : `Collected by your soldiers, ${dayWords(l.ended)}: ${fmt(l.seized)} dr recovered`;
    case 'repaying':
      return l.side === 'in' ? `Repaid: your herald takes ${fmt(l.owed)} dr to ${name}, there in ${days(at)}` : `${whose(l.city)} herald brings ${fmt(l.owed)} dr, repaid: at ${g?.by === 'sea' ? 'your gulf' : 'the edge of your land'} in ${days(at)}`;
    case 'repaid':
      return `Repaid${l.late ? ', late' : ''}, ${dayWords(l.ended)}: ${fmt(l.owed)} dr`;
    case 'refused':
      return `Refused, ${dayWords(l.ended)}: ${l.why}`;
    case 'declined':
      return l.side === 'in' ? `You declined, ${dayWords(l.ended)}` : `Sent back, ${dayWords(l.ended)}: ${l.why}`;
    case 'lapsed':
      return `Lapsed unanswered, ${dayWords(l.ended)}`;
  }
  return '';
}

/** A loan's coin (or its herald) on the map, in words, for the hover card and the gift lines. */
export function heraldWords(s: SimState, g: Gift): { head: string; line: string } {
  const l = loanOf(s.world, g.loan);
  const name = cityName(g.from === 'home' ? g.to : g.from);
  if (!l) return { head: 'A herald', line: '' };
  const n = Math.max(1, Math.ceil((g.start + g.dur - s.tick) / TICKS_PER_DAY));
  const days = n === 1 ? '1 day' : `${n} days`;
  if (g.from === 'home') {
    const head = l.state === 'asking' ? `Your herald to ${name}` : l.state === 'repaying' ? `Your repayment to ${name} · ${fmt(g.amount)} dr` : `Your loan to ${name} · ${fmt(g.amount)} dr`;
    const line = l.state === 'asking' ? `Asking for a loan of ${fmt(l.amount)} dr: at ${name} in ${days}` : `On the way to ${name}: there in ${days}`;
    return { head, line };
  }
  const head = l.state === 'repaying' ? `${whose(g.from)} repayment · ${fmt(g.amount)} dr` : l.state === 'returning' ? `Your coin, sent back by ${name} · ${fmt(g.amount)} dr` : `${whose(g.from)} loan to you · ${fmt(g.amount)} dr`;
  return { head, line: `On the way to your city: at ${g.by === 'land' ? 'the edge of your land' : 'your gulf'} in ${days}` };
}

/** The next date due either way, for the debts chip: who, how much, when, and whether anything is overdue; null with no debts. */
export function debtsChip(s: SimState): { line: string; more: number; overdue: boolean; city: CityId } | null {
  const ds = debts(s.world);
  if (!ds.length) return null;
  const late = ds.filter((l) => l.state === 'overdue');
  const l = late[0] ?? ds[0];
  const name = cityName(l.city);
  const d = dateOfTick(l.due);
  const when = `${d.day} ${d.monthName}`;
  // (Slice 28: your overdue loan's step, in a word.)
  const step = l.side === 'in' && l.state === 'overdue' ? [' · warned', ' · warned', ' · seizing', ' · their army'][l.step] ?? '' : '';
  const line = l.state === 'overdue' ? (l.side === 'in' ? `Overdue: ${fmt(l.owed)} dr to ${name}${step}` : `Overdue: ${name} owes you ${fmt(l.owed)} dr`) : l.state === 'grace' ? `${name} asks for time · ${fmt(l.owed)} dr` : l.side === 'in' ? `You owe ${name} ${fmt(l.owed)} dr · ${when}` : `${name} owes you ${fmt(l.owed)} dr · ${when}`;
  return { line, more: ds.length - 1, overdue: late.length > 0, city: l.city };
}

/** A standing line under the top bar, if a loan needs you: terms waiting, your loan due within a month that the treasury can't cover, or overdue. */
export function loanTownLine(s: SimState): { text: string; city: CityId } | null {
  const w = s.world;
  const late = w.loans.find((l) => l.side === 'in' && l.state === 'overdue');
  if (late) {
    // (Slice 28: what comes next, and when; the lender's threat and army have lines of their own: raids.ts.)
    const name = cityName(late.city);
    const c = cityOf(w, late.city);
    const he = c.ruler?.female ? 'she' : 'he';
    const pays = late.withhold ? 'you are holding it back' : `paid as soon as the treasury can spend it (it can spend ${fmt(spendable(s))} dr now)`;
    if (late.step <= 1) return { text: `Your loan from ${name} is overdue: ${fmt(late.owed)} dr, ${pays}. Unpaid on ${dayWords(late.stepAt + STEP_GAP)}, ${name} closes its routes to you and seizes your goods on them.`, city: late.city };
    if (late.step === 2) return { text: `${name} is seizing your goods against your debt (${fmt(late.owed)} dr left${late.seized ? `, ${fmt(late.seized)} dr seized so far` : ''}): unpaid on ${dayWords(late.stepAt + STEP_GAP)}, ${he} sends men to collect the rest. ${cap(pays)}.`, city: late.city };
    const r = w.raids.find((x) => x.id === late.raid);
    if (!r || r.ended > 0) return { text: `Your loan from ${name} still stands: ${fmt(late.owed)} dr${late.seized ? ` (${fmt(late.seized)} dr seized or carried off)` : ''}. ${cap(he)} sends men again ${r ? `about ${dayWords(r.ended + COLLECT_LULL)}` : 'soon'} unless it is paid; ${pays}.`, city: late.city };
  }
  const grace = w.loans.find((l) => l.side === 'out' && l.state === 'grace');
  if (grace) return { text: `${cityName(grace.city)} cannot repay the ${fmt(grace.owed)} dr it owes you, and asks for ${TIME_MONTHS} months more: grant or refuse it on ${whose(grace.city)} page, by ${dayWords(grace.until)}.`, city: grace.city };
  const terms = w.loans.find((l) => l.state === 'terms');
  if (terms) return { text: `${cityName(terms.city)} will lend you ${termsWords(terms)} (${fmt(terms.owed)} dr in all): accept or decline on ${whose(terms.city)} page, by ${dayWords(terms.until)}.`, city: terms.city };
  const soon = w.loans.find((l) => l.side === 'in' && l.state === 'running' && l.due - s.tick <= TICKS_PER_MONTH && spendable(s) < l.owed);
  if (soon) {
    const n = Math.max(1, Math.ceil((soon.due - s.tick) / TICKS_PER_DAY));
    return { text: `Your loan from ${cityName(soon.city)} is due in ${n === 1 ? '1 day' : `${n} days`}: ${fmt(soon.owed)} dr, and the treasury can spend ${fmt(spendable(s))} dr now.`, city: soon.city };
  }
  return null;
}

/** Has your city opened a route six months ago (rulers' offers and asks come only then)? For the panels. */
export const rulersMayAsk = (s: SimState): boolean => firstRoute(s.world) > 0;
