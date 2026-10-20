/**
 * What the loans look like (slice 27): a ruled city's Loans tab (what you owe
 * them and they owe you, your herald on the way, their terms waiting on you,
 * asking for a loan and offering one, with the likely answer and why), a
 * ruler's own offer or ask on the Ruler tab, and the Money tab's loans. It
 * only reads the sim; every act goes out as a `loan` command (or, for a
 * ruler's offer or ask, an `answer`).
 */
import { PLACES, type CityId } from '../map/greece';
import { TICKS_PER_MONTH } from '../sim/clock';
import type { Command } from '../sim/commands';
import { dayWords } from '../sim/favours';
import {
  ASK_SUMS,
  askRefusal,
  debts,
  lendRefusal,
  likelyToRepay,
  likelyWords,
  liveLoan,
  LOAN_LEAST,
  loanLine,
  loanAnswerRefusal,
  loanMemory,
  loanOfDeal,
  loanRefusal,
  loanTerms,
  monthsWords,
  OFFER_MONTHS,
  OFFER_RATES,
  OFFER_SUMS,
  offerAnswer,
  offerRefusal,
  overdueOf,
  owedOf,
  spareOf,
  termsWords,
  whose,
  whysWords,
} from '../sim/loans';
import type { Deal, Loan, LoanWhy, SimState } from '../sim/state';
import { spendable } from '../sim/treasury';
import { cityOf } from '../sim/world';
import { foeNote } from './rivals';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const cap = (t: string): string => `${t[0].toUpperCase()}${t.slice(1)}`;
const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const name = (id: CityId): string => PLACES[id].name;
const worthEm = (n: number): string => (n === 0 ? '' : `<em class="${n > 0 ? 'up' : 'down'}">${signed(n)}</em>`);

/** A coin on a scroll: a ruler's offer or ask of a loan, on the label and in the panels. */
export const LOAN_ICON =
  '<svg viewBox="0 0 16 16" width="15" height="15" class="ask loan" aria-hidden="true"><path d="M3 2.8h8.6c.9 0 1.5.6 1.5 1.5V12H4.5C3.7 12 3 11.3 3 10.5z" fill="#f4e4bf" stroke="#8a6440" stroke-width=".9" stroke-linejoin="round"/><path d="M5.2 5.4h5M5.2 7.2h3" stroke="#8a6440" stroke-width=".8" stroke-linecap="round"/><circle cx="10.6" cy="11" r="3.3" fill="#e8c04a" stroke="#8a6414" stroke-width=".9"/><circle cx="10.6" cy="11" r="1.7" fill="none" stroke="#b88a1e" stroke-width=".7"/></svg>';

/** What you would choose to lend a city (the Offer a loan section), per city, kept while the page is open. */
const drafts = new Map<CityId, { amount: number; rate: number; months: number }>();
const draftOf = (id: CityId): { amount: number; rate: number; months: number } => {
  let d = drafts.get(id);
  if (!d) drafts.set(id, (d = { amount: 1000, rate: 10, months: 12 }));
  return d;
};

/** "likely to repay: fair (steadfast (+), at war with Athens (−))". */
function likelyHtml(s: SimState, id: CityId, owed: number, rate: number): string {
  const l = likelyToRepay(s, cityOf(s.world, id), owed, rate);
  return `<p class="likely ${l.word}" title="${esc(`About ${Math.round(l.p * 100)} in 100 that they pay on the day, as things stand; worked out again on the day`)}">How likely they are to repay: <b>${l.word}</b> <span class="why">(${esc(likelyWords(l.why))})</span></p>`;
}

/** What lending a city at war costs you with its enemy ('' at peace). */
const foeHtml = (s: SimState, id: CityId): string => {
  const foe = foeNote(s, id).replace('anything you send', 'a loan to');
  return foe ? `<p class="if foe">${esc(foe)}</p>` : '';
};

/** What moved a rate (or the months) from where it starts, in words: "from 12%, cordial (−2%), Corinth is rich (−2%)" (the reasons add up to it). */
const fromWords = (total: number, ws: readonly LoanWhy[], unit: '%' | ' months'): string => {
  const base = total - ws.reduce((a, x) => a + x.n, 0);
  return ws.length ? `from ${base}${unit === '%' ? '%' : ''}, ${whysWords(ws, unit)}` : 'the usual';
};

/** A loan's terms with their reasons. */
function termsHtml(l: Pick<Loan, 'amount' | 'rate' | 'months' | 'owed' | 'rateWhy' | 'monthsWhy'>): string {
  const months = l.monthsWhy.length ? `; ${monthsWords(l.months)}: ${esc(fromWords(l.months, l.monthsWhy, ' months'))}` : '';
  return `<p class="if">${l.rate}%: ${esc(fromWords(l.rate, l.rateWhy, '%'))}${months}. ${fmt(l.owed)} dr to repay in all.</p>`;
}

/** A button that sends a loan command. */
function loanButton(act: string, label: string, attrs: Record<string, string | number>, why: string, tip: string, cls = ''): string {
  const data = Object.entries(attrs)
    .map(([k, v]) => ` data-${k}="${esc(String(v))}"`)
    .join('');
  return `<button data-loan="${act}"${data} class="${cls || act}" title="${esc(why || tip)}"${why ? ' disabled' : ''}>${label}</button>`;
}

/** One loan between you and a city, as it stands, for the Loans tab. */
function loanCard(s: SimState, l: Loan): string {
  const c = cityOf(s.world, l.city);
  const theirs = l.side === 'out';
  const head = theirs ? `${name(l.city)} owes you` : `You owe ${name(l.city)}`;
  const label = l.state === 'asking' || l.state === 'terms' ? 'Your ask' : l.state === 'offering' ? 'Your offer' : head;
  let body = `<p>${esc(loanLine(s, l))}.</p>`;
  if (l.state === 'terms') {
    body += termsHtml(l);
    if (l.why) body += `<p class="if">${esc(cap(l.why))}.</p>`;
    body += `<div class="acts">${loanButton('accept', `Accept · ${fmt(l.amount)} dr`, { id: l.id }, loanRefusal(s, l, 'accept'), `The coin comes with their herald; ${fmt(l.owed)} dr is due ${monthsWords(l.months)} from today`, 'take')}${loanButton('decline', 'Decline', { id: l.id }, '', 'Nothing lost: they think no less of you')}</div>`;
  } else if (l.rate > 0 && l.state !== 'asking') {
    body += `<p class="if">${esc(termsWords(l))}${l.start ? `, agreed ${esc(dayWords(l.start))}` : ''}${l.rateWhy.length ? `: ${esc(fromWords(l.rate, l.rateWhy, '%'))}` : ''}.</p>`;
  }
  if (theirs && (l.state === 'running' || l.state === 'offering' || l.state === 'sending')) body += likelyHtml(s, l.city, l.owed, l.rate);
  if (!theirs && (l.state === 'running' || l.state === 'overdue')) {
    const why = loanRefusal(s, l, 'repay');
    const kept = loanMemory(c, 'repaid', 'you repaid their loan on time', s.tick).amount;
    body += `<div class="acts">${loanButton('repay', `Repay now · ${fmt(l.owed)} dr`, { id: l.id }, why, `The whole sum, interest and all, from the treasury now; your herald takes it.${l.state === 'running' ? ` Repaid on time: ${signed(kept)} with ${name(l.city)}, and every ruler’s terms a percent better` : ''}`, 'take')}</div>`;
  }
  return `<div class="deal loan${theirs ? ' theirs' : ''}${l.state === 'overdue' ? ' overdue' : ''}">${LOAN_ICON}<div><b>${esc(label)}</b>${body}</div></div>`;
}

/** The Loans tab of a ruled city's page. */
export function loansTabHtml(s: SimState, id: CityId): string {
  const w = s.world;
  const c = cityOf(w, id);
  const they = c.ruler?.female ? 'she' : 'he';
  const out: string[] = [];
  // Their own offer or ask waits on you (answered here or on the Ruler tab).
  const proposed = w.deals.filter((d) => d.city === id && d.state === 'open' && (d.kind === 'loanoffer' || d.kind === 'loanask'));
  for (const d of proposed) out.push(loanDealHtml(s, d));
  const mine = w.loans.filter((l) => l.city === id && l.ended === 0 && l.state !== 'proposed');
  if (mine.length) out.push(`<section class="deals loans"><h3>Between you</h3>${mine.map((l) => loanCard(s, l)).join('')}</section>`);
  // Asking.
  const inLoan = liveLoan(w, id, 'in');
  if (!inLoan) {
    const no = lendRefusal(s, c);
    const { spare, why: spareWhy } = spareOf(s, c);
    const t = loanTerms(s, c);
    const terms = `<b>${t.rate}%</b> (${esc(fromWords(t.rate, t.rateWhy, '%'))}), repaid in ${monthsWords(t.months)}${t.monthsWhy.length ? ` (${esc(fromWords(t.months, t.monthsWhy, ' months'))})` : ''}`;
    // (Refused for the mood or for want of a route, not for want of coin or for a debt overdue: what the terms would be, so you can see why they are dearer here.)
    const would = no && c.ruler && spare >= LOAN_LEAST && !overdueOf(w).length ? ` Were ${they} to lend, it would be at about ${terms}.` : '';
    const likely = no
      ? `<p class="if no">As things stand, ${esc(no.replace(/^The /, 'the '))}.${would}</p>`
      : `<p class="if">As things stand, ${they} would lend at about ${terms}. ${esc(name(id))} can spare up to ${fmt(spare)} dr${spareWhy.length ? ` (${esc(spareWhy.join(', '))})` : ''}.</p>`;
    const buttons = ASK_SUMS.map((n) => {
      const why = askRefusal(s, id, n);
      return loanButton('ask', `${fmt(n)} dr`, { city: id, amount: n }, why, `Your herald asks ${name(id)} for ${fmt(n)} dr; at about ${t.rate}%, ${fmt(owedOf(n, t.rate))} dr to repay in ${monthsWords(t.months)}. Being refused costs you nothing`, 'sum');
    }).join('');
    out.push(`<section class="loanask"><h3>Ask for a loan</h3>${likely}<div class="sums">${buttons}</div><p class="foot">Your herald takes the ask; the answer, terms or a refusal, comes when he gets there. You then accept or decline. One loan from a city at a time.</p></section>`);
  }
  // Offering.
  const outLoan = liveLoan(w, id, 'out');
  if (!outLoan) {
    const d = draftOf(id);
    const pick = (field: string, values: readonly number[], fmtV: (n: number) => string, on: number): string =>
      values.map((v) => `<button data-loan="pick" data-city="${id}" data-field="${field}" data-value="${v}" class="pick${v === on ? ' on' : ''}">${fmtV(v)}</button>`).join('');
    const a = offerAnswer(s, c, d.amount, d.rate);
    const owed = owedOf(d.amount, d.rate);
    const why = offerRefusal(s, id, d.amount, d.rate, d.months);
    const worth = a.take ? loanMemory(c, a.need ? 'needed' : 'cheap', '', s.tick).amount : 0;
    out.push(`<section class="loanoffer"><h3>Offer a loan</h3>
<div class="pickrow"><span>Sum</span>${pick('amount', OFFER_SUMS, (n) => `${fmt(n)}`, d.amount)}</div>
<div class="pickrow"><span>Interest</span>${pick('rate', OFFER_RATES, (n) => `${n}%`, d.rate)}</div>
<div class="pickrow"><span>Repaid in</span>${pick('months', OFFER_MONTHS, (n) => `${n} mo`, d.months)}</div>
<p class="if ${a.take ? 'yes' : 'no'}">${a.take ? `${cap(they)} would likely take it` : `${cap(they)} would likely send it back`}: ${esc(a.why)}.${a.take ? ` ${fmt(owed)} dr back by about ${esc(dayWords(s.tick + d.months * TICKS_PER_MONTH))}.` : ''}</p>
${likelyHtml(s, id, owed, d.rate)}${foeHtml(s, id)}
<div class="acts">${loanButton('offer', `Send ${fmt(d.amount)} dr with your herald${worth ? ` ${worthEm(worth)}` : ''}`, { city: id, amount: d.amount, rate: d.rate, months: d.months }, why, `The coin goes now (${fmt(spendable(s))} dr can be spent); if they don’t take it, it comes back`, 'take')}</div>
<p class="foot">The coin leaves the treasury as your herald sets off. They take it or send it back when he arrives, by their need and their mood; lent to a ruler in need, it warms them.</p></section>`);
  }
  return out.join('') || '<p class="none">Nothing between you.</p>';
}

/** A ruler's offer of a loan or ask for one, with your answers and what each does to the mood (the Ruler tab and the Loans tab). */
export function loanDealHtml(s: SimState, d: Deal): string {
  const l = loanOfDeal(s.world, d.id);
  if (!l) return '';
  const c = cityOf(s.world, d.city);
  const ruler = (c.ruler?.title ?? '').replace(/ of .*/, '').toLowerCase();
  const left = Math.max(0, Math.ceil((d.due - s.tick) / 10));
  const by = `Answer by ${esc(dayWords(d.due))} (${left === 1 ? '1 day' : `${left} days`})`;
  const button = (act: string, label: string, worth: number, tip: string, cls: string): string => {
    const why = loanAnswerRefusal(s, d, act);
    return `<button data-deal="${d.id}" data-act="${act}" class="${cls}" title="${esc(why || tip)}"${why ? ' disabled' : ''}>${esc(label)}${worthEm(worth)}</button>`;
  };
  if (d.kind === 'loanoffer') {
    const taken = loanMemory(c, 'taken', '', s.tick).amount;
    const declined = loanMemory(c, 'declined', '', s.tick).amount;
    return `<div class="deal offer loan">${LOAN_ICON}<div><b>The ${esc(ruler)} offers to lend you</b> ${esc(termsWords(l))}. <span class="why">${esc(cap(l.why))}.</span>
${termsHtml(l)}<div class="acts">${button('take', `Take it · ${fmt(l.amount)} dr`, taken, `The coin comes with their herald; ${fmt(l.owed)} dr is due back ${monthsWords(l.months)} from today`, 'take')}${button('decline', 'Decline', declined, declined ? 'Proud: takes it amiss' : 'Nothing lost but the loan', 'decline')}</div><p class="if">${by}.</p></div></div>`;
  }
  const lent = loanMemory(c, 'lent', '', s.tick).amount;
  const refused = loanMemory(c, 'refused', '', s.tick).amount;
  const lapsed = loanMemory(c, 'lapsed', '', s.tick).amount;
  return `<div class="deal request loan">${LOAN_ICON}<div><b>The ${esc(ruler)} asks to borrow</b> ${esc(termsWords(l))}. <span class="why">${esc(cap(l.why))}.</span>
${termsHtml(l)}${likelyHtml(s, d.city, l.owed, l.rate)}${foeHtml(s, d.city)}<div class="acts">${button('send', `Lend it · ${fmt(l.amount)} dr`, lent, `The coin goes with your herald now; ${fmt(l.owed)} dr back ${monthsWords(l.months)} after it arrives`, 'send')}${button('refuse', 'Refuse', refused, `You refused to lend them: ${signed(refused)}`, 'refuse')}</div><p class="if">${by}; let run out: ${signed(lapsed)}.</p></div></div>`;
}

/** A ruler's offer or ask in a few words, for the hover card and the label's tip. */
export function loanDealShort(s: SimState, d: Deal): string {
  const l = loanOfDeal(s.world, d.id);
  const days = Math.max(0, Math.ceil((d.due - s.tick) / 10));
  const left = `answer within ${days === 1 ? '1 day' : `${days} days`}`;
  if (!l) return d.kind === 'loanoffer' ? 'Offers a loan' : 'Asks for a loan';
  return d.kind === 'loanoffer' ? `Offers to lend you ${fmt(l.amount)} dr at ${l.rate}% · ${left}` : `Asks to borrow ${fmt(l.amount)} dr at ${l.rate}% · ${left}`;
}

/** The Money tab's loans: every loan standing either way, with its terms, dates and how it stands. */
export function moneyLoansHtml(s: SimState): string {
  const live = s.world.loans.filter((l) => l.ended === 0 && l.state !== 'proposed');
  if (!live.length) return '';
  const order = debts(s.world);
  live.sort((a, b) => Number(order.includes(b)) - Number(order.includes(a)) || (a.due || Infinity) - (b.due || Infinity));
  const rows = live.map((l) => {
    const way = l.side === 'in' ? `From ${name(l.city)}` : `To ${name(l.city)}`;
    const terms = l.rate ? `${fmt(l.amount)} dr at ${l.rate}% · ${fmt(l.owed)} dr in all` : `${fmt(l.amount)} dr`;
    const repay = l.side === 'in' && (l.state === 'running' || l.state === 'overdue') ? `<button class="chip" data-act="repay" data-id="${l.id}" title="${esc(loanRefusal(s, l, 'repay') || 'Repay the whole sum now, interest and all')}"${loanRefusal(s, l, 'repay') ? ' disabled' : ''}>Repay now</button>` : '';
    return `<li class="${l.side}${l.state === 'overdue' ? ' overdue' : ''}"><p class="side-row"><button class="link" data-act="loancity" data-city="${l.city}" title="Open ${esc(whose(l.city))} page">${esc(way)}</button><span>${esc(terms)}</span></p><p class="side-note">${esc(loanLine(s, l))}.</p>${repay}</li>`;
  });
  return `<h3>Loans</h3><ul class="loans">${rows.join('')}</ul>`;
}

/** A click on a loan's button in a panel: send its command (or, choosing an offer's terms, just redraw). True if it was one. */
export function loanEvent(e: Event, send: (c: Command) => void): boolean {
  const b = (e.target as HTMLElement).closest('button[data-loan]') as HTMLButtonElement | null;
  if (!b || b.disabled || e.type !== 'click') return false;
  const act = b.dataset.loan ?? '';
  const city = (b.dataset.city ?? '') as CityId;
  if (act === 'pick') {
    const d = draftOf(city);
    const v = Number(b.dataset.value);
    if (b.dataset.field === 'amount') d.amount = v;
    else if (b.dataset.field === 'rate') d.rate = v;
    else if (b.dataset.field === 'months') d.months = v;
    return true;
  }
  if (act === 'ask') send({ type: 'loan', act: 'ask', city, amount: Number(b.dataset.amount) });
  else if (act === 'offer') send({ type: 'loan', act: 'offer', city, amount: Number(b.dataset.amount), rate: Number(b.dataset.rate), months: Number(b.dataset.months) });
  else if (act === 'accept' || act === 'decline' || act === 'repay') send({ type: 'loan', act, loan: Number(b.dataset.id) });
  else return false;
  return true;
}

/** The loans a city has with you, for its tab's name: "Loans · you owe". */
export function loansTabName(s: SimState, id: CityId): string {
  const w = s.world;
  const late = w.loans.some((l) => l.city === id && l.state === 'overdue');
  if (late) return 'Loans · overdue';
  const inL = liveLoan(w, id, 'in');
  const outL = liveLoan(w, id, 'out');
  if (inL?.state === 'terms') return 'Loans · terms';
  if (inL && outL) return 'Loans · 2';
  if (inL && inL.state !== 'proposed') return 'Loans · you owe';
  if (outL && outL.state !== 'proposed') return 'Loans · they owe';
  return 'Loans';
}

