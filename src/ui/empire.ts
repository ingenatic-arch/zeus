/**
 * A ruled city's Empire tab (slice 34): what binds it to you and what could.
 *
 * - Not bound: the three ways to take it (a full force sent to conquer, a
 *   demand to submit, its debt for its loyalty) and an offer of alliance, each
 *   with its odds and their reasons before you send, or why it can't go now.
 * - Your vassal: its tribute (coin or one of its goods; light, fair or heavy,
 *   each with what it comes to a year and what it does to loyalty), what is on
 *   its way, its loyalty with every reason, and when it arms, the warning with
 *   the three answers.
 * - Your ally: the calls to its wars waiting on you (join or refuse), the aid
 *   it has sent, and ending it.
 *
 * It only reads the sim; its buttons go out as `empire` commands.
 */
import { PLACES, type CityId } from '../map/greece';
import type { Command } from '../sim/commands';
import { TICKS_PER_YEAR } from '../sim/clock';
import { WARE_NAMES } from '../sim/foods';
import { dayWords } from '../sim/favours';
import { expeditionLine, stayingHome } from '../sim/expeditions';
import type { SimState } from '../sim/state';
// (Review of slice 37: a tribute ship's day in your bay counts her sail in from the horizon.)
import { SAIL_IN, TRADE_GOODS } from '../sim/trade';
import { allyOf, ARMING, SEASON, conquestPlan, debtPlan, allyPlan, empireRefusal, heraldTo, lastHerald, loyaltyOf, lowWords, openCall, submitPlan, tributeGoods, tributeWords, tributeYear, vassalOf, WEIGHT_WORDS, type Plan, type Vassal } from '../sim/vassals';
import { cityOf, rulerShort } from '../sim/world';
// Integrating slice 34 with 33: a tribute ship held back by the winter storms says so.
import { lateWords } from '../sim/seasons';
// (Slice 40: the prices page's swatches, so tribute in marble, timber or horses has its colour too.)
// Slice 50: the kit's icons for the goods (they had colour swatches).
import { tradeIcon } from './icons';
// Slice 38 (review): tribute by sea held off your gulf by a blockade says so.
import { blockaded } from '../sim/lanes';
// Slice 47: the whole empire on your city's page.
import { colonyYear, goodName, peopleOf, SHARE_WORDS } from '../sim/colonies';
import { cargoWords, STAGE_NAMES, stageOf } from '../sim/colonyworks';
import { colonyTrade, freeTrade, militiaReady, stationedWords } from '../sim/colonyempire';
import { siteRecord } from '../sim/colonies';
// Review of slice 58: the gods' hands in a conquest's odds.
import { abroadWords } from '../sim/greecegods';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const cap = (t: string): string => (t ? `${t[0].toUpperCase()}${t.slice(1)}` : t);
const name = (id: CityId): string => PLACES[id]?.name ?? id;
const whose = (id: CityId): string => (name(id).endsWith('s') ? `${name(id)}’` : `${name(id)}’s`);
const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
/** "about 7 in 10". */
const inTen = (p: number): string => `about ${Math.max(1, Math.min(9, Math.round(p * 10)))} in 10`;
/** What each weight of tribute does to loyalty (vassals.ts' TRIBUTE_LOYALTY, in words for the buttons). */
const WEIGHT_LOYALTY = ['+15', '0', '−20'];

function button(act: string, label: string, attrs: Record<string, string | number>, why: string, tip: string, cls = ''): string {
  const data = Object.entries(attrs)
    .map(([k, v]) => ` data-${k}="${esc(String(v))}"`)
    .join('');
  return `<button data-empire="${act}"${data}${cls ? ` class="${cls}"` : ''} title="${esc(why || tip)}"${why ? ' disabled' : ''}>${label}</button>`;
}

/** The tab's name: "Empire", "Empire · vassal", "Empire · arming", "Empire · ally", "Empire · ally calls". */
export function empireTabName(s: SimState, id: CityId): string {
  const v = vassalOf(s, id);
  if (v) return v.arming ? 'Empire · arming' : 'Empire · vassal';
  if (allyOf(s, id)) return openCall(s, id) ? 'Empire · ally calls' : 'Empire · ally';
  if (heraldTo(s, id)) return 'Empire · herald';
  return 'Empire';
}

/** One way of taking a city (or an offer), as a card: its button, its odds and reasons, or why it can't go. */
function wayCard(act: string, id: CityId, head: string, label: string, plan: Plan, what: string, after: string, stay: readonly string[] = []): string {
  const odds = plan.refusal ? '' : ` <small>${inTen(plan.p)}</small>`;
  const b = button(act, `${label}${odds}`, { city: id }, plan.refusal, `${cap(plan.word)}, ${inTen(plan.p)}: ${plan.why}`, act === 'conquer' ? 'refuse' : 'send');
  const why = plan.refusal ? `<p class="eta no">${esc(plan.refusal)}.</p>` : `<p class="eta">${esc(cap(plan.word))}, ${inTen(plan.p)}: ${esc(plan.why)}.</p>`;
  // (Who of your army stays home, and why: slice 28's full force, on its Empire card too.)
  const staying = stay.length ? `<ul class="stay">${stay.map((x) => `<li>${esc(cap(x))}</li>`).join('')}</ul>` : '';
  return `<div class="deal way"><div><b>${esc(head)}</b><p>${esc(what)}</p>${staying}${why}<div class="acts">${b}</div><p class="if">${esc(after)}</p></div></div>`;
}

/** Your herald on his way, or his last answer (within the year). */
function heraldHtml(s: SimState, id: CityId): string {
  const away = heraldTo(s, id);
  const kind = (k: string): string => (k === 'submit' ? 'a demand that it submit to you' : k === 'debt' ? 'the offer of its debt for its loyalty' : 'an offer of alliance');
  if (away) return `<div class="giftnews">Your herald is on his way to ${esc(name(id))} with ${kind(away.kind)}: his answer comes about ${esc(dayWords(away.due))}. When he set out it looked ${esc(away.odds >= 0.7 ? 'likely' : away.odds >= 0.45 ? 'fair' : away.odds >= 0.2 ? 'doubtful' : 'unlikely')}, ${inTen(away.odds)}.</div>`;
  const last = lastHerald(s, id);
  if (last && last.answer && s.tick - last.due < TICKS_PER_YEAR) return `<div class="giftnews${last.answer === 'yes' ? ' theirs' : ''}">${esc(cap(last.line || ''))}${last.line.endsWith('.') ? '' : '.'} <small>(${esc(dayWords(last.due))})</small></div>`;
  return '';
}

/** Not bound to you: conquer, cow, buy, or ally. */
function takeHtml(s: SimState, id: CityId): string {
  const c = cityOf(s.world, id);
  const out: string[] = [];
  const lord = c.lord && c.lord !== 'home' ? c.lord : '';
  if (lord) out.push(`<p class="line">${esc(name(id))} is ${esc(whose(lord))} vassal. Taking it takes it from ${esc(name(lord))}, which will not forgive you (−20); ${esc(name(lord))} stands by it with a quarter of its army. (It can only be taken over, not set free.)</p>`);
  const cq = conquestPlan(s, id);
  const theirs = cq.parts.map((p) => `${p.who} ${p.n}`).join(', ');
  const allies = cq.allies.length ? ` Your allies who might march with you: ${cq.allies.join(', ')}.` : '';
  // (Review of slice 58: the gods' hands in the odds, said: a loving god's blessing, the city's angry patron.)
  const gods = abroadWords(s, id);
  out.push(wayCard('conquer', id, 'Conquer it', 'Send a full force to conquer', cq, `${cq.men ? `A full force of ${cq.men} men` : 'A full force'} marches on ${name(id)} and meets ${theirs} (${fmt(cq.theirs)} in all).${allies}${gods ? ` ${gods}` : ''}`, `Won, it bows to you as your vassal, beaten and cowed for a while, with what your men carry off; lost, they come home fewer. As any war without cause: ${name(id)} hates it (−60 or worse), and every other ruler thinks the worse of you (−12 or more each).`, stayingHome(s, 'force', id)));
  const sp = submitPlan(s, id);
  out.push(wayCard('submit', id, 'Demand it submit', 'Send a herald: submit to us', sp, `For a city cold or wary towards you whose side is no more than half your army (your ${sp.ours} men against its ${sp.theirs}).`, `It may bow; refuse and remember it (−20); or call on its friends, who think the worse of you too. One demand a year.`));
  const dp = debtPlan(s, id);
  if (dp.loan) out.push(wayCard('debt', id, 'Its debt for its loyalty', `Offer: the ${fmt(dp.loan.owed)} dr for its loyalty`, dp, `${name(id)} owes you ${fmt(dp.loan.owed)} dr, overdue. Your herald offers to forget it if it becomes your vassal.`, `Yes, the debt is gone and it bows to you, glad of it; no, the debt stands and it is a little put out (−5).`));
  else out.push(`<p class="if">Were ${esc(name(id))} to owe you a loan that is overdue, you could offer it its debt for its loyalty (the Loans tab lends).</p>`);
  const ap = allyPlan(s, id);
  out.push(wayCard('ally', id, 'An alliance', 'Offer an alliance', ap, `A warm ruler may accept: it sends men when you are raided, asks you to join its wars, and may march with you when you go to conquer.`, `Refusing an ally’s call is remembered (−15); two refusals in three years end the alliance.`));
  return `${heraldHtml(s, id)}<section class="deals empire"><h3>Take ${esc(name(id))}, or win it over</h3>${out.join('')}</section>`;
}

/** The tribute's choices: in coin or a good it sells; light, fair, heavy. */
function tributeHtml(s: SimState, v: Vassal): string {
  const c = cityOf(s.world, v.city);
  const y = tributeYear(s, v);
  const now = v.good < 0 ? `${fmt(y.dr)} dr a year` : `${fmt(y.amount)} ${WARE_NAMES[TRADE_GOODS[v.good]]} a year (${fmt(y.dr)} dr at its prices)`;
  const goods = [-1, ...tributeGoods(c)];
  const goodButtons = goods
    .map((g) => {
      const t = tributeYear(s, v, v.weight, g);
      const label = g < 0 ? '<i class="coin"></i>Coin' : `${tradeIcon(g)}${cap(WARE_NAMES[TRADE_GOODS[g]])}`;
      const why = empireRefusal(s, 'tribute', v.city, g, v.weight);
      return button('tribute', label, { city: v.city, good: g, weight: v.weight }, why, g < 0 ? `In coin: about ${fmt(t.dr)} dr a year, to your treasury` : `In ${WARE_NAMES[TRADE_GOODS[g]]}: about ${fmt(t.amount)} a year, to your stores. ${name(v.city)} holds about ${fmt(c.stock[g])} now, and sends at most half of what it holds`, g === v.good ? 'on' : '');
    })
    .join('');
  const weightButtons = WEIGHT_WORDS.map((wd, k) => {
    const t = tributeYear(s, v, k);
    const amount = v.good < 0 ? `${fmt(t.dr)} dr` : `${fmt(t.amount)}`;
    return button('tribute', `${cap(wd)} <small>${amount}</small> <em class="${k === 2 ? 'down' : k === 0 ? 'up' : ''}">${WEIGHT_LOYALTY[k]}</em>`, { city: v.city, good: v.good, weight: k }, '', `${cap(wd)}: about ${amount} a year; loyalty ${WEIGHT_LOYALTY[k]}`, k === v.weight ? 'on' : '');
  }).join('');
  const sent = v.sent ? `${v.sent === 1 ? 'One tribute has' : `${v.sent} tributes have`} come in, worth ${fmt(v.worth)} dr in all.` : 'None has come in yet.';
  const next = `The next sets out about ${dayWords(v.next)}${v.arming ? ', unless it rises first' : ''}.`;
  const way = s.empire.tribute
    .filter((t) => t.city === v.city && t.phase !== 'done')
    .map((t) => `<p class="eta sent">${esc(cap(tributeWords(t)))} ${t.phase === 'road' && t.by === 'sea' && s.tick >= t.start + t.dur && blockaded(s) ? `waiting off your gulf: ${esc(whose(blockaded(s)!.city))} fleet holds the mouth of your harbour, and it sails in once the blockade is broken or lifted` : t.phase === 'road' ? `on its way by ${t.by === 'sea' ? 'sea' : 'road'}: ${t.by === 'sea' ? 'in your bay' : 'at the edge of your land'} about ${esc(dayWords(t.start + t.dur + (t.by === 'sea' ? SAIL_IN : 0)))}${t.by === 'sea' ? esc(lateWords(s, `${t.city}-tribute`)) : ''}` : t.phase === 'bay' ? 'on its ship in your bay, coming ashore' : 'coming in to your stores on its donkeys'}.</p>`)
    .join('');
  const last = s.empire.tribute.filter((t) => t.city === v.city && t.phase === 'done').at(-1);
  const lastLine = last ? `<p class="if">Last: ${esc(tributeWords(last))} ${esc(last.how)}${last.lost ? ` (${fmt(last.lost)} there was no room for)` : ''}, ${esc(dayWords(last.ended))}.</p>` : '';
  return `<section class="tribute"><h3>Its tribute</h3><p class="line"><b>${esc(cap(WEIGHT_WORDS[v.weight]))}, in ${esc(v.good < 0 ? 'coin' : WARE_NAMES[TRADE_GOODS[v.good]])}</b>: about ${esc(now)}, a quarter of it each season. ${esc(sent)} ${esc(next)}</p>${way}${lastLine}<h4>Paid in</h4><div class="choice">${goodButtons}</div><h4>How heavy</h4><div class="choice weights">${weightButtons}</div><p class="foot">A share of its income: light a tenth, fair a fifth, heavy three tenths. Heavier fills your stores and treasury faster and wears its loyalty down; a change counts from its next tribute.</p></section>`;
}

/** A vassal's loyalty: the number, where it is heading, every reason. */
function loyaltyHtml(s: SimState, v: Vassal): string {
  const l = loyaltyOf(s, v);
  const heading = Math.round(l.target);
  const trend = heading > v.loyalty ? `rising towards ${heading}` : heading < v.loyalty ? `falling towards ${heading}` : 'steady';
  const rows = l.why.map((x) => `<li class="${x.n > 0 ? 'good' : 'bad'}"><span class="v">${signed(x.n)}</span><span class="t">${esc(cap(x.why))}</span></li>`).join('');
  const pct = Math.max(0, Math.min(100, v.loyalty));
  return `<section class="loyalty"><h3>Its loyalty</h3><div class="deal${v.arming ? ' tribute' : ''}"><div><p class="line"><b>${v.loyalty}</b> of 100, ${esc(trend)} (it moves half the way each month).</p><div class="bar"><i style="width:${pct}%"></i><s style="left:${ARMING}%" title="Under ${ARMING} it arms"></s></div><ul class="whys"><li><span class="v">50</span><span class="t">To start with</span></li>${rows}</ul></div></div></section>`;
}

/** A vassal arming: the warning, and its three answers. */
function armingHtml(s: SimState, v: Vassal): string {
  if (!v.arming) return '';
  const l = loyaltyOf(s, v);
  const cq = conquestPlan(s, v.city);
  const lighter = v.weight > 0 ? button('tribute', `Lighten its tribute to ${WEIGHT_WORDS[v.weight - 1]} <em class="up">+${v.weight === 2 ? 20 : 15}</em>`, { city: v.city, good: v.good, weight: v.weight - 1 }, '', 'Its loyalty mends over the next months') : '';
  const march = button('conquer', `March on it <small>${inTen(cq.p)}</small>`, { city: v.city }, cq.refusal, `${cap(cq.word)}, ${inTen(cq.p)}: ${cq.why}`, 'refuse');
  return `<section class="deals arming"><h3>${esc(name(v.city))} is arming</h3><div class="deal tribute"><div><p><b>Loyalty ${v.loyalty}</b>: ${esc(lowWords(l, 3))}. It rises about <b>${esc(dayWords(v.rises))}</b> unless its loyalty is back to 40 by then.</p><div class="acts">${lighter}${march}</div><p class="if">Or send ${esc(rulerShort(cityOf(s.world, v.city)))} a gift (the Ruler tab): gifts count for loyalty too. Marching, your army meets ${esc(cq.parts.map((p) => `${p.who} ${p.n}`).join(', '))}; won, the rising is crushed (loyalty back to 50, and a hard memory); lost, it throws off your rule.</p></div></div></section>`;
}

/** Your vassal's page. */
function vassalHtml(s: SimState, v: Vassal): string {
  const how = v.how === 'conquest' ? 'by conquest' : v.how === 'awe' ? 'by awe: it bowed to your herald' : 'for its debt';
  const aid = aidHtml(s, v.city);
  // (Your army's report first while it is fresh: marching home, or home within a season.)
  const e = s.world.expeditions.filter((x) => x.city === v.city && x.aim === 'conquer').at(-1);
  const fresh = !!e && (e.phase !== 'done' || s.tick - e.ended < SEASON);
  const conquest = conquestHtml(s, v.city);
  return `<p class="line bound">Your vassal since ${esc(dayWords(v.since))}, ${esc(how)}. It never trades against you or threatens you, and sends men when you are raided.</p>${fresh ? conquest : ''}${armingHtml(s, v)}${loyaltyHtml(s, v)}${tributeHtml(s, v)}${aid}${fresh ? '' : conquest}`;
}

/** The aid a city has sent you lately. */
function aidHtml(s: SimState, id: CityId): string {
  const rows = s.empire.aid.filter((a) => a.city === id).map((a) => {
    const line = a.phase === 'road' ? `${a.men} men on the road to help you: at the edge of your land about ${dayWords(a.start + a.dur)}` : a.line || `${a.men} men`;
    return `<li>${esc(cap(line))}${a.phase === 'home' ? ' (going home)' : ''}.</li>`;
  });
  return rows.length ? `<section><h3>Its men in your defence</h3><ul class="means">${rows.join('')}</ul></section>` : '';
}

/** Your last conquest (or crushing) of a city, with its report. */
function conquestHtml(s: SimState, id: CityId): string {
  const e = s.world.expeditions.filter((x) => x.city === id && x.aim === 'conquer').at(-1);
  if (!e) return '';
  const report = e.report.length ? `<ul class="report">${e.report.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
  return `<section class="expedition"><h3>${e.phase === 'done' ? 'Your last march on it' : 'Your army, marching on it'}</h3><p class="line">${esc(expeditionLine(s, e))}.</p>${report}</section>`;
}

/** Your ally's page. */
function allyHtml(s: SimState, id: CityId): string {
  const a = allyOf(s, id);
  if (!a) return '';
  const call = openCall(s, id);
  const out: string[] = [`<p class="line bound">Your ally since ${esc(dayWords(a.since))}. It sends men when you are raided, asks you to join its wars, and may march with you when you go to conquer.</p>`];
  if (call) {
    const why = empireRefusal(s, 'join', id, undefined, undefined, call.id);
    out.push(`<section class="deals"><h3>Its call to war</h3><div class="deal tribute"><div><p><b>${esc(name(id))} asks you to join its war with ${esc(name(call.foe))}</b>: send a full force against ${esc(name(call.foe))} by ${esc(dayWords(call.due))}.</p><div class="acts">${button('join', 'Join: send a full force', { call: call.id }, why, `Your ready army marches on ${name(call.foe)}; won, the war goes ${whose(id)} way`, 'send')}${button('refuse', 'Refuse <em class="down">−15</em>', { call: call.id }, '', `${rulerShort(cityOf(s.world, id))} remembers it; two refusals in three years end the alliance`)}</div><p class="if">Letting the day pass counts as refusing.</p></div></div></section>`);
  }
  const past = s.empire.calls.filter((k) => k.ally === id && k.state !== 'open');
  if (past.length) out.push(`<section><h3>Its calls to war</h3><ul class="means">${past.map((k) => `<li class="${k.state === 'joined' ? 'good' : k.state === 'over' ? '' : 'bad'}">Against ${esc(name(k.foe))}, ${esc(dayWords(k.at))}: ${k.state === 'joined' ? 'you marched' : k.state === 'refused' ? 'you refused' : k.state === 'lapsed' ? 'you let it pass' : 'the war ended first'}.</li>`).join('')}</ul></section>`);
  const recent = a.refused.filter((t) => s.tick - t < 3 * TICKS_PER_YEAR).length;
  if (recent) out.push(`<p class="if">You have refused ${recent === 1 ? 'one call' : `${recent} calls`} in three years: one more ends the alliance.</p>`);
  out.push(aidHtml(s, id));
  out.push(`<div class="acts endally">${button('unally', 'End the alliance <em class="down">−20</em>', { city: id }, '', `${rulerShort(cityOf(s.world, id))} takes it ill`)}</div>`);
  return out.join('');
}

/** The Empire tab of a ruled city's page. */
export function empireTabHtml(s: SimState, id: CityId): string {
  const v = vassalOf(s, id);
  if (v) return vassalHtml(s, v);
  if (allyOf(s, id)) return allyHtml(s, id);
  const conquest = conquestHtml(s, id);
  return `${takeHtml(s, id)}${conquest}`;
}

/**
 * Slice 47: your empire on your city's page: every vassal, ally, colony and
 * free ally, each with its loyalty, what it sends, what it asks, what is
 * stationed there, and a button to its page.
 */
export function empireOverviewHtml(s: SimState): string {
  const rows: string[] = [];
  const go = (page: string, label: string, tab = ''): string => `<button data-cityopen="${esc(page)}"${tab ? ` data-citytab="${tab}"` : ''} title="Open its page">${esc(label)} ›</button>`;
  const bar = (n: number, low: number): string => `<span class="loy${n < low ? ' low' : ''}" title="Loyalty ${n} of 100"><i style="width:${Math.max(0, Math.min(100, n))}%"></i></span><b class="n">${n}</b>`;
  let tribute = 0;
  let shares = 0;
  let trade = 0;
  for (const v of s.empire.vassals) {
    const y = tributeYear(s, v);
    tribute += y.dr;
    const what = v.good < 0 ? `${fmt(y.dr)} dr a year` : `${fmt(y.amount)} ${WARE_NAMES[TRADE_GOODS[v.good]]} a year`;
    const notes = [v.arming ? `<span class="warn">arming: rises ${esc(dayWords(v.rises))}</span>` : ''].filter(Boolean).join('');
    rows.push(`<li class="vassal"><div class="who"><b>${esc(name(v.city))}</b><span class="kind">vassal</span></div><div class="loyrow">${bar(v.loyalty, ARMING)}</div><div class="what">${esc(cap(WEIGHT_WORDS[v.weight]))} tribute: ${esc(what)}${notes}</div>${go(v.city, 'Its page', 'empire')}</li>`);
  }
  for (const a of s.empire.allies) rows.push(`<li class="ally"><div class="who"><b>${esc(name(a.city))}</b><span class="kind">ally</span></div><div class="what">Sends men when you are raided${openCall(s, a.city) ? '; <span class="warn">calls you to its war</span>' : ''}</div>${go(a.city, 'Its page', 'empire')}</li>`);
  for (const c of s.empire.colonies) {
    const y = colonyYear(s, c);
    const tr = colonyTrade(s, c);
    shares += y.dr;
    trade += tr.share;
    const pop = peopleOf(s, c);
    const asks = c.want && c.want.end === '' ? (c.want.cargo ? `You have sent the ${cargoWords(c.want.good, c.want.amount)} it asked for` : `<span class="warn">Asks you for ${esc(cargoWords(c.want.good, c.want.amount))} by ${esc(dayWords(c.want.due))}</span>`) : '';
    const threat = c.threat && c.threat.end === '' ? `<span class="warn">${c.threat.ships} ships of ${esc(name(c.threat.city))} coming ${esc(dayWords(c.threat.due))}</span>` : '';
    const talk = c.talk ? `<span class="warn">Talks of freedom: free ${esc(dayWords(c.frees))}</span>` : '';
    const st = stationedWords(s, c);
    const mil = militiaReady(s).find((x) => x.site === c.site);
    const bits = [
      `${esc(cap(SHARE_WORDS[c.share]))} share: ${fmt(y.amount)} ${esc(goodName(y.good))} a year, and ${fmt(tr.share)} dr of its trade`,
      `${st ? `${esc(cap(st))} stationed there` : 'Nothing of yours stationed there'}${mil ? `; ${mil.men} militia when you need them` : ''}`,
      asks,
      threat,
      talk,
    ].filter(Boolean);
    rows.push(`<li class="colony${c.talk || threat ? ' alarm' : ''}"><div class="who"><b>${esc(c.name)}</b><span class="kind">${STAGE_NAMES[stageOf(c)]} of ${fmt(pop)}</span></div><div class="loyrow">${bar(c.loyalty, 30)}</div><div class="what">${bits.join('<br>')}</div>${go(`site:${c.site}`, 'Its page')}</li>`);
  }
  for (const f of s.empire.freed ?? []) {
    const t = freeTrade(s, f);
    trade += t.share;
    const pop = Math.round(siteRecord(s, f.site)?.pop ?? 0);
    const m = militiaReady(s).find((x) => x.site === f.site);
    rows.push(`<li class="free"><div class="who"><b>${esc(f.name)}</b><span class="kind">free ally of ${fmt(pop)}</span></div><div class="what">${fmt(t.share)} dr a year of its trade${m ? `; ${m.men} militia when you need them` : ''}</div>${go(`site:${f.site}`, 'Its page')}</li>`);
  }
  if (!rows.length) return '';
  const militia = militiaReady(s).reduce((a, m) => a + m.men, 0);
  const sum = [tribute ? `tribute about ${fmt(tribute)} dr` : '', shares ? `colonies’ shares worth about ${fmt(shares)} dr` : '', trade ? `${fmt(trade)} dr of their trade` : ''].filter(Boolean);
  return `<section class="empirelist"><h3>Your empire</h3><p class="line">${sum.length ? `A year: ${esc(sum.join(', '))}.` : ''}${militia ? ` Militia: ${militia} men would come to your aid.` : ''}</p><ul class="empirelist">${rows.join('')}</ul></section>`;
}

/** A click on an Empire button: send its command. True if it was one. */
export function empireEvent(e: Event, send: (c: Command) => void): boolean {
  const b = (e.target as HTMLElement).closest('button[data-empire]') as HTMLButtonElement | null;
  if (!b || b.disabled || e.type !== 'click') return false;
  const act = b.dataset.empire as Extract<Command, { type: 'empire' }>['act'];
  const city = b.dataset.city;
  if (act === 'tribute') send({ type: 'empire', act, city, good: Number(b.dataset.good), weight: Number(b.dataset.weight) });
  else if (act === 'join' || act === 'refuse') send({ type: 'empire', act, call: Number(b.dataset.call) });
  else if (act === 'submit' || act === 'debt' || act === 'ally' || act === 'unally' || act === 'conquer') send({ type: 'empire', act, city });
  else return false;
  return true;
}
