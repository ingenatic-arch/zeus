/**
 * Slice 43 on a colony's page: its picture and stage, what it asks of you,
 * the goods going out to it from your quay, its governor (or the candidates
 * to choose from), and its works (fund one, see it going up).
 *
 * It only reads the sim; its buttons go out as `colonyworks` commands.
 */
import './colonies.css';
import type { CoastMap } from '../map/bake';
import type { Command } from '../sim/commands';
import { dayWords } from '../sim/favours';
import type { SimState } from '../sim/state';
import { TICKS_PER_DAY } from '../sim/clock';
import { WARE_NAMES } from '../sim/foods';
import { TRADE_GOODS } from '../sim/trade';
import { colonyGrowth, GOV_WORDS, peopleOf, type Colony } from '../sim/colonies';
import {
  cargoDoing,
  cargoesFor,
  cargoWords,
  governorRefusal,
  secondGood,
  spareOf,
  STAGE_FROM,
  STAGE_NAMES,
  stageOf,
  TRAIT_DOES,
  TRAIT_WORDS,
  WANT_WHY,
  wantRefusal,
  WORK_KINDS,
  workGoodsWords,
  workOf,
  workPrice,
  workRefusal,
  WORKS,
  wouldLand,
  type WorkKind,
} from '../sim/colonyworks';
import { colonyPicture } from './colonypicture';
// Slice 47: sail now with what is aboard, or call it off.
import { cargoActsHtml } from './colonyempire';
// Slice 50: the kit's icons for the goods (they had colour swatches).
import { tradeIcon } from './icons';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const cap = (t: string): string => (t ? `${t[0].toUpperCase()}${t.slice(1)}` : t);
const a = (stage: number): string => (stage === 0 ? 'an' : 'a');
const swatch = (k: number): string => tradeIcon(k);
const days = (s: SimState, t: number): number => Math.max(1, Math.ceil((t - s.tick) / TICKS_PER_DAY));

function button(act: string, label: string, attrs: Record<string, string | number>, why: string, tip: string, cls = ''): string {
  const data = Object.entries(attrs)
    .map(([k, v]) => ` data-${k}="${esc(String(v))}"`)
    .join('');
  return `<button data-works="${act}"${data}${cls ? ` class="${cls}"` : ''} title="${esc(why || tip)}"${why ? ' disabled' : ''}>${label}</button>`;
}

/** Its picture, its stage and how far it is from the next. */
export function pictureHtml(s: SimState, c: Colony): string {
  const pop = peopleOf(s, c);
  const st = stageOf(c);
  const growing = colonyGrowth(s, c).reduce((x, g) => x + g.n, 0);
  let next: string;
  if (st >= 3) next = 'A city is as large as a colony grows.';
  else {
    const more = Math.max(0, STAGE_FROM[st + 1] - pop);
    const yrs = growing > 0 ? more / growing : Infinity;
    next = `${cap(a(st + 1))} ${STAGE_NAMES[st + 1]} from ${fmt(STAGE_FROM[st + 1])} people: ${fmt(more)} more${yrs < 30 ? `, about ${yrs < 1.5 ? 'a year' : `${Math.round(yrs)} years`} at this pace` : ''}.`;
  }
  const pct = st >= 3 ? 100 : Math.max(0, Math.min(100, ((pop - STAGE_FROM[st]) / (STAGE_FROM[st + 1] - STAGE_FROM[st])) * 100));
  return `<section class="colpicture">${colonyPicture(c, pop)}<p class="line stage"><b>${esc(cap(a(st)))} ${STAGE_NAMES[st]}</b> of ${fmt(pop)} people. ${esc(next)}</p><div class="stagebar" title="${esc(next)}"><i style="width:${pct.toFixed(0)}%"></i></div></section>`;
}

/** What it asks of you: what, why, by when, and the button to send it; or how it ended. */
export function wantHtml(s: SimState, c: Colony, map: CoastMap | undefined): string {
  const w = c.want;
  if (!w) return '';
  const what = cargoWords(w.good, w.amount);
  if (w.end === 'met') return `<div class="giftnews theirs">The ${esc(what)} it asked for came in time, ${esc(dayWords(w.ended))}: it is grateful (+10) and grows faster for a year.</div>`;
  if (w.end === 'late') return `<div class="giftnews">The ${esc(cargoWords(w.good, w.amount))} it asked for came after its day, ${esc(dayWords(w.ended))} (+3).</div>`;
  if (w.end === 'ignored') return `<div class="giftnews wantlost">It asked for ${esc(what)} and nothing came by its day, ${esc(dayWords(w.ended))}: it remembers (−10)${w.kind === 'wheat' ? ', and grows slower for a year' : ''}.</div>`;
  const left = days(s, w.due);
  if (w.cargo) {
    return `<section class="deals"><h3>It asks you for ${esc(what)}</h3><div class="deal offer sent"><div><p>${swatch(w.good)}<b>${esc(cap(what))}</b> ${esc(WANT_WHY[w.kind])}. You have sent it: its day is ${esc(dayWords(w.due))}.</p><p class="if">Landed by then, it is grateful (+10) and grows faster for a year; after, it is glad all the same (+3).</p></div></div></section>`;
  }
  const why = map ? wantRefusal(s, map, c) : 'Not now';
  const lands = wouldLand(s, c.site, w.good, w.amount);
  const inTime = lands <= w.due;
  const spare = spareOf(s, w.good);
  const send = button('want', `Send ${esc(what)} <small>you have ${fmt(spare)}</small>`, { site: c.site }, why, `Porters carry it from your stores down to your quay, and your ship takes it: it lands about ${dayWords(lands)}${inTime ? ', in time' : ', after its day'}`, 'send');
  const hungry = w.kind === 'wheat' ? ', and with no wheat it grows slower for a year' : '';
  return `<section class="deals"><h3>It asks you for ${esc(what)}</h3><div class="deal want${left <= 45 ? ' late' : ''}"><div><p>${swatch(w.good)}<b>${esc(cap(what))}</b> ${esc(WANT_WHY[w.kind])}. It needs it by <b>${esc(dayWords(w.due))}</b>, in ${left} ${left === 1 ? 'day' : 'days'}.</p><div class="acts">${send}</div>${why ? `<p class="eta no">${esc(why)}.</p>` : `<p class="eta ${inTime ? 'sent' : 'no'}">Sent now, it lands about ${esc(dayWords(lands))}${inTime ? ', in time' : ', after its day'}.</p>`}<p class="if">In time, it is grateful (+10, remembered for years) and grows faster for a year. Ignored, it remembers that instead (−10)${esc(hungry)}.</p></div></div></section>`;
}

/** The goods going out to it: on your quay, in your bay, at sea. */
export function cargoHtml(s: SimState, c: Colony): string {
  const xs = cargoesFor(s, c.site);
  if (!xs.length) return '';
  const rows = xs
    .map((x) => {
      const got = x.items.reduce((n, it) => n + Math.min(it.got, it.amount), 0);
      const all = x.items.reduce((n, it) => n + it.amount, 0);
      const pct = x.phase === 'loading' ? Math.round((got / Math.max(1, all)) * 100) : 100;
      return `<div class="deal sent cargo"><div><p class="eta sent">${esc(cargoDoing(s, x))}</p>${x.phase === 'loading' ? `<div class="bar" title="${fmt(got)} of ${fmt(all)} on the quay or aboard"><i style="width:${pct}%"></i></div>` : ''}</div></div>`;
    })
    .join('');
  return `<section class="deals"><h3>Goods going out to it</h3>${rows}${cargoActsHtml(s, c)}</section>`;
}

/** Its governor: who and what he does, or the candidates to choose from. */
export function governorHtml(s: SimState, c: Colony): string {
  if (c.candidates.length) {
    const rows = c.candidates
      .map((g, n) => {
        const pick = button('governor', `Choose ${esc(g.name)}`, { site: c.site, n }, governorRefusal(c, 'governor', n), `${g.name} governs ${c.name}: ${TRAIT_WORDS[g.trait]}`, 'send');
        return `<li><div><b>${esc(g.name)}</b>, ${esc(TRAIT_WORDS[g.trait])}${n === 0 && !c.governor ? ' <span class="why">(the council’s choice)</span>' : ''}<div class="does">${esc(cap(TRAIT_DOES[g.trait]))}.</div></div>${pick}</li>`;
      })
      .join('');
    const holds = c.governor ? `${esc(c.governor)} governs it until you choose` : 'Its council holds it';
    return `<section class="deals"><h3>Choose its governor</h3><div class="deal want"><div><p>${holds}. If you have not chosen by <b>${esc(dayWords(c.chooseBy))}</b> (in ${days(s, c.chooseBy)} days), its council chooses ${esc(c.candidates[0].name)}.</p><ul class="candidates">${rows}</ul></div></div></section>`;
  }
  if (!c.governor) return '';
  const fav = c.trait === 'favourite';
  const dismiss = button('dismiss', `Dismiss him <em class="down">${fav ? '−15' : '−5'}</em>`, { site: c.site }, governorRefusal(c, 'dismiss'), `Its council holds it while you choose another from two or three; ${fav ? 'its people loved him, and remember it (−15)' : 'it remembers (−5)'}`);
  return `<section class="governor"><h3>Its governor</h3><p class="line">${esc(c.governor)} governs it: ${esc(GOV_WORDS[c.trait])}. ${esc(cap(TRAIT_DOES[c.trait]))}.</p><div class="acts endally">${dismiss}</div></section>`;
}

/** One work's row: what it does, and its state or the button to fund it. */
function workRow(s: SimState, c: Colony, map: CoastMap | undefined, kind: WorkKind): string {
  const W = WORKS[kind];
  const k = secondGood(c.site);
  const good = k >= 0 ? WARE_NAMES[TRADE_GOODS[k]] : '';
  const name = kind === 'trade' && k >= 0 ? `A second trade: ${good}` : cap(W.name.replace(/^its /, ''));
  const does = kind === 'trade' && k >= 0 ? `it makes ${good} too, at half the pace of its own good, and sends you its share of it on the same ships` : W.does;
  const w = workOf(c, kind);
  const p = workPrice(c, kind);
  let state: string;
  let cls = '';
  if (w?.phase === 'built') {
    state = `<span class="state done">Built ${esc(dayWords(w.done))}</span>`;
    cls = 'built';
  } else if (w?.phase === 'building') {
    state = `<span class="state going">Going up: done about ${esc(dayWords(w.done))}</span>`;
    cls = 'going';
  } else if (w) {
    state = `<span class="state going">Its goods are on their way from your quay</span>`;
    cls = 'going';
  } else if (stageOf(c) < W.stage) {
    state = `<span class="state locked">Opens at ${a(W.stage)} ${STAGE_NAMES[W.stage]} (${fmt(STAGE_FROM[W.stage])} people)</span>`;
    cls = 'locked';
  } else {
    const why = map ? workRefusal(s, map, c, kind) : 'Not now';
    state = `${button('work', `Fund it <small>${fmt(p.dr)} dr and ${esc(cargoWords(p.good, p.amount))}</small>`, { site: c.site, work: kind }, why, `${fmt(p.dr)} dr now, and porters carry ${workGoodsWords(kind)} down to your quay for your ship; once landed it takes about ${p.days} days to build`, 'send')}${why ? `<span class="why">${esc(why)}</span>` : ''}`;
  }
  return `<li class="${cls}"><div class="wk"><b>${esc(name)}</b><span class="does">${esc(cap(does))}.</span></div><div class="st">${state}</div></li>`;
}

/** Its works: the six, by the stage they open at. */
export function worksHtml(s: SimState, c: Colony, map: CoastMap | undefined): string {
  const rows = WORK_KINDS.filter((k) => k !== 'trade' || secondGood(c.site) >= 0)
    .map((k) => workRow(s, c, map, k))
    .join('');
  return `<section class="works"><h3>Its works</h3><ul class="works">${rows}</ul><p class="foot">You pay the drachmas now; the goods go from your stores by porter to your quay, and your ship takes them out. Built works show in its picture and on the map.</p></section>`;
}

/** A click on a works button: send its command. True if it was one. */
export function worksEvent(e: Event, send: (c: Command) => void): boolean {
  const t = e.target as HTMLElement;
  const b = t.closest('button[data-works]') as HTMLButtonElement | null;
  if (!b || b.disabled) return false;
  const act = b.dataset.works;
  const site = b.dataset.site ?? '';
  if (act === 'work') send({ type: 'colonyworks', act, site, work: b.dataset.work ?? '' });
  else if (act === 'want' || act === 'dismiss') send({ type: 'colonyworks', act, site });
  else if (act === 'governor') send({ type: 'colonyworks', act, site, n: Number(b.dataset.n) });
  else return false;
  return true;
}
