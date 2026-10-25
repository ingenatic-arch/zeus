/**
 * Slice 45: the court's and the prison's sections, in the building's panel
 * (merge of slice 45: through slice 48's registry, PANELS in
 * buildingpanel.ts, so they have its staff, condition, messages, Pause and
 * Workers first like every other building). The court's: the law (a
 * punishment for each kind of crime, each with what it does, deters, costs
 * and suits, and what it falls back to here), the cases waiting and being
 * walked in, the sentences lately, and the crime rate month by month. The
 * prison's: its cells, its unrest (and what would calm it), who it holds and
 * till when, and who labours at the quarry and the mine. They only read the
 * sim; setting the law is a command (the panel's `law` buttons).
 */
import './justice.css';
import type { CoastMap } from '../map/bake';
import { findBuilding } from '../sim/buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../sim/clock';
import { whereOf } from '../sim/crime';
import {
  calmWords,
  CELLS,
  crimeWords,
  daysToBreak,
  DETER,
  labourers,
  LAW_ROWS,
  lawCtx,
  memberWho,
  perThousand,
  PRISON_MONTHS,
  prisoners,
  PUNISHMENT_NAMES,
  PUNISHMENT_WORDS,
  punishmentFor,
  PUNISHMENTS,
  RATE_KINDS,
  restlessWords,
  ROW_NAMES,
  TRIAL_DAYS,
  UNREST_BREAK,
  UNREST_WARN,
  type Punishment,
  type RateMonth,
} from '../sim/justice';
import type { Building, SimState } from '../sim/state';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cap = (t: string): string => (t ? t[0].toUpperCase() + t.slice(1) : t);
const dayWords = (t: number): string => {
  const d = Math.max(1, Math.ceil(t / TICKS_PER_DAY));
  return d === 1 ? 'a day' : `${d} days`;
};
const monthWords = (t: number): string => {
  const m = Math.max(1, Math.round(t / TICKS_PER_MONTH));
  return m === 1 ? 'a month' : `${m} months`;
};
const ago = (t: number): string => {
  const d = Math.floor(t / TICKS_PER_DAY);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 60 ? `${d} days ago` : `${Math.floor(d / 30)} months ago`;
};
/** The rate table's kinds, in words. */
const RATE_WORDS: Readonly<Record<(typeof RATE_KINDS)[number], string>> = { theft: 'Theft', pickpocket: 'Pockets picked', vandal: 'Smashing', arson: 'Arson', smuggling: 'Smuggling', skimming: 'Skimming' };
/** Short names for the law's buttons. */
const SHORT: Readonly<Record<Punishment, string>> = { fine: 'Fine', stocks: 'Stocks', prison: 'Prison', labour: 'Labour', exile: 'Exile', execution: 'Death' };

/** A bar from 0 to 100, its words beside it. */
function bar(label: string, n: number, warnFrom: number): string {
  const v = Math.max(0, Math.min(100, Math.round(n)));
  return `<div class="meter${v >= warnFrom ? ' low' : ''}"><span class="lab">${esc(label)}</span><span class="bar"><i style="width:${v}%"></i></span><span class="num">${v}%</span></div>`;
}

/** What a punishment deters, in a word for the law's rows (as temptationOf weighs it: a fine holds back only tents and huts; the stocks more round the agora for a month after). */
const deterWord = (p: Punishment): string => (p === 'fine' ? 'only tents and huts' : p === 'stocks' ? 'a little, more round the agora after' : (['', 'a little', 'well', 'strongly', 'most of all'][DETER[p]] ?? ''));

/** The court's page. */
export function courtHtml(s: SimState, _map: CoastMap, court: Building | undefined): string {
  const out: string[] = [];
  const ctx = lawCtx(s);
  ctx.court = true;
  // (Merge of slice 45: the building's panel has its name, picture and staff; this says what the court is for.)
  const idle = court && court.workers === 0 ? '<div class="late">Nobody works here yet: it tries nobody, and the watch fines the caught on the spot as before.</div>' : '';
  out.push(`<p class="small lead">The watch walks the caught here, to be tried by the law within days.</p>${idle}`);
  // The law: a row for each kind of crime, its punishment picked, the others a click away.
  const rows = LAW_ROWS.map((r) => {
    const chosen = s.crime.law[r];
    const { p, why } = punishmentFor(s, r, ctx);
    const btns = PUNISHMENTS.map((q) => {
      const w = PUNISHMENT_WORDS[q];
      // (Death suits only arsonists and a gang's men, as its words say: marked too harsh for every other row. Review of slice 45: thieves too.)
      const harsh = q === 'execution' && r !== 'arson' && r !== 'gang';
      const tip = `${PUNISHMENT_NAMES[q]} for ${ROW_NAMES[r]}: ${w.does}. Deters: ${w.deters}. Costs: ${w.costs}. Suits: ${w.suits}${harsh ? '. Far too harsh for this' : ''}`;
      return `<button data-act="law" data-row="${r}" data-p="${q}" class="${q === chosen ? 'on' : ''}${harsh ? ' harsh' : ''}" title="${esc(tip)}">${SHORT[q]}</button>`;
    }).join('');
    const now = why ? `<span class="instead">${esc(`${PUNISHMENT_NAMES[p]} instead: there is ${why}`)}</span>` : `<span class="deters">${esc(`deters ${deterWord(p)}`)}</span>`;
    return `<li><div class="row"><b>${esc(cap(ROW_NAMES[r]))}</b>${now}</div><div class="acts law">${btns}</div></li>`;
  });
  out.push(`<section class="law"><h3>The law</h3><ul class="laws">${rows.join('')}</ul></section>`);
  // The cases.
  const lines: string[] = [];
  for (const w of s.walkers) {
    if (w.kind !== 'convict' || w.people <= 0) continue;
    const home = findBuilding(s, w.home);
    const m = home?.family?.members[w.cheese];
    lines.push(`<li><span class="who">${esc(m ? memberWho(m.name, home!.family!.name) : 'One caught')}</span> <span class="what">being walked here by a watchman</span></li>`);
  }
  for (const x of s.crime.cases) {
    const home = findBuilding(s, x.home);
    lines.push(`<li><span class="who">${esc(memberWho(x.name, home?.family?.name))}</span> <span class="what">${esc(`${crimeWords(x.kind, x.gang)}: tried ${s.tick >= x.trial ? 'any day now' : `in about ${dayWords(x.trial - s.tick)}`}`)}</span></li>`);
  }
  // (Slice 49, slice 45's finding: from the town's message log, which keeps them, not crime's news, which keeps only its last few lines of any kind.)
  const sentences = sentencesLately(s, 5);
  out.push(
    `<section class="cases"><h3>Cases</h3>${lines.length ? `<ul class="cases">${lines.join('')}</ul>` : `<p class="none">Nobody waits for trial. The caught are tried about ${TRIAL_DAYS} days after they are brought in.</p>`}` +
      (sentences.length ? `<h4>Lately</h4><ul class="lately">${sentences.map((n) => `<li><small>${esc(ago(s.tick - n.tick))}</small> ${esc(n.words)}</li>`).join('')}</ul>` : '') +
      '</section>',
  );
  out.push(rateHtml(s));
  // What each punishment does, deters, costs and suits (last: the cases and the rate are what change).
  const words = PUNISHMENTS.map((q) => {
    const w = PUNISHMENT_WORDS[q];
    return `<li><b>${esc(cap(PUNISHMENT_NAMES[q]))}</b>: ${esc(w.does)}.<div class="small">Deters: ${esc(w.deters)} · Costs: ${esc(w.costs)} · Suits: ${esc(w.suits)}</div></li>`;
  });
  out.push(`<section class="words"><h3>The punishments</h3><ul class="punish">${words.join('')}</ul><p class="small">The law holds a home back from the crime its trouble points to, by how hard it punishes it; only while a court is at work.</p></section>`);
  return out.join('');
}

// Slice 49
/** The court's sentences lately, newest first, from the town's message log (its crime messages that tell a sentence). */
const SENTENCE = /^The court [^’]*? (sentenced|fined|sent|let) /;
function sentencesLately(s: SimState, n: number): Array<{ tick: number; words: string }> {
  const out: Array<{ tick: number; words: string }> = [];
  for (let i = s.messages.log.length - 1; i >= 0 && out.length < n; i--) {
    const m = s.messages.log[i];
    if (m.kind === 'crime' && SENTENCE.test(m.words)) out.push({ tick: m.tick, words: m.words });
  }
  return out;
}

/** The crime rate: this month so far, and the last months closed, per thousand people. */
function rateHtml(s: SimState): string {
  const now = s.crime.rate;
  const months: Array<{ r: RateMonth; people: number; label: string }> = [{ r: now, people: s.population, label: 'This month' }];
  for (const r of [...s.crime.rates].reverse().slice(0, 3)) months.push({ r, people: r.people, label: monthWords((Math.floor(s.tick / TICKS_PER_MONTH) - r.month) * TICKS_PER_MONTH) + ' ago' });
  const head = `<tr><th></th>${months.map((m) => `<th>${esc(m.label)}</th>`).join('')}</tr>`;
  const body = RATE_KINDS.map((k, i) => `<tr><td>${RATE_WORDS[k]}</td>${months.map((m) => `<td>${m.r.n[i] || '·'}</td>`).join('')}</tr>`).join('');
  const per = `<tr class="per"><td>Per thousand</td>${months.map((m) => `<td>${perThousand(m.r, m.people).toFixed(1)}</td>`).join('')}</tr>`;
  const caught = `<tr><td>Caught · tried</td>${months.map((m) => `<td>${m.r.caught} · ${m.r.tried}</td>`).join('')}</tr>`;
  return `<section class="rate"><h3>Crime, month by month</h3><table class="rate">${head}${body}${per}${caught}</table></section>`;
}

/** The prison's page. */
export function prisonHtml(s: SimState, map: CoastMap, prison: Building | undefined): string {
  const out: string[] = [];
  if (!prison) return '';
  const held = prisoners(s, prison);
  const j = s.crime.jails.find((x) => x.at === prison.id);
  const why = restlessWords(s, prison);
  const unrest = j?.unrest ?? 0;
  // (Merge of slice 45: the building's panel has its name, picture and guards; this says its cells.)
  out.push(`<section class="unrest"><h3>Cells and unrest</h3><p class="small lead">${esc(`${held.length} of its ${CELLS} cells full${held.length > CELLS ? `: ${held.length - CELLS} over` : ''}. The court sends its prisoners here for ${PRISON_MONTHS} months.`)}</p>${bar('Unrest', unrest, UNREST_WARN)}`);
  if (unrest >= UNREST_WARN) {
    const d = j ? daysToBreak(s, prison, j) : Infinity;
    out.push(`<div class="late warnbox">${esc(`${cap(why || 'restless still')}: the guards are restless.${d < Infinity ? ` The prisoners break out in about ${d === 1 ? 'a day' : `${d} days`} (at ${UNREST_BREAK}%) and run home as criminals.` : ' It is calming down.'}${why ? ` ${cap(calmWords(s, prison))} would calm it.` : ''}`)}</div>`);
  } else if (why) out.push(`<p class="small warn">${esc(`${cap(why)}: unrest is rising. ${cap(calmWords(s, prison))} would calm it; at ${UNREST_WARN}% the town is warned, at ${UNREST_BREAK}% they break out.`)}</p>`);
  else out.push(`<p class="small">${esc(held.length ? 'Quiet: room in its cells, and guards enough.' : 'Empty and quiet.')} More than ${CELLS} prisoners, or fewer than half its guards, and it grows restless.</p>`);
  out.push('</section>');
  const list = held.map((x) => {
    const home = findBuilding(s, x.home);
    return `<li><span class="who">${esc(memberWho(x.name, home?.family?.name))}</span> <span class="what">${esc(`${crimeWords(x.kind, x.gang)}: home in about ${monthWords(x.until - s.tick)}`)}</span></li>`;
  });
  out.push(`<section><h3>Prisoners</h3>${list.length ? `<ul class="cases">${list.join('')}</ul>` : '<p class="none">Nobody is held here.</p>'}</section>`);
  // Hard labour, wherever it is served.
  const works = s.buildings.filter((b) => (b.kind === 'quarry' || b.kind === 'mine') && labourers(s, b).length > 0);
  if (works.length) {
    const lab = works.flatMap((b) => labourers(s, b).map((x) => `<li><span class="who">${esc(x.name)}</span> <span class="what">${esc(`at ${b.kind === 'mine' ? 'the copper mine' : 'the quarry'} ${whereOf(map, b)}, unpaid, for ${crimeWords(x.kind, x.gang)}: home in about ${monthWords(x.until - s.tick)}`)}</span></li>`));
    out.push(`<section><h3>At hard labour</h3><ul class="cases">${lab.join('')}</ul></section>`);
  }
  return out.join('');
}

/** The court's sections, for its entry in the building panel's registry (buildingpanel.ts). */
export const courtSections = (s: SimState, map: CoastMap, b: Building): string => `<div class="justice">${courtHtml(s, map, b)}</div>`;

/** The prison's sections, for its entry in the registry. */
export const prisonSections = (s: SimState, map: CoastMap, b: Building): string => `<div class="justice prison">${prisonHtml(s, map, b)}</div>`;

/** The court's and the prison's own lines, said in their sections (left out of "What it is doing"): the law, the cells, the unrest. */
export const JUSTICE_QUIET = /^(The law: |Holds \d+ of its \d+ cells|Restless \(\d+%\): |Unrest \d+%: )/;
