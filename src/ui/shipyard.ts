/**
 * The shipyard's panel (slice 38): a floating panel like the trading post's,
 * opened by clicking a shipyard or a trireme (or from the Army tab). For each
 * yard: its shipwrights, how fast they mend, Build a trireme (its price, and
 * why not), the moorings used and the rowers' caution. For each trireme: what
 * she is doing, her hull and her oars (bars), her rowers and why short, her
 * pay, how long until she is whole, and her orders (guard a lane, bring her
 * home, call her in for repair). Below: the harbour (a blockade coming or
 * holding, what it stops, how to break it), the lanes (pirates and
 * warships), and the last fights at sea. It only reads the sim; every button
 * is a command.
 */
import type { CoastMap } from '../map/bake';
import { districtAt, districtTitle } from '../map/districts';
import { PLACES, type CityId } from '../map/greece';
import { blockadeLeft, blockadeOn, blockadeWords, toBreak } from '../sim/blockades';
import { centreOf, findBuilding, jobsAt } from '../sim/buildings';
import { TICKS_PER_DAY } from '../sim/clock';
import type { Command } from '../sim/commands';
import {
  afloat,
  bandWords,
  warWords,
  CREW,
  crewWhy,
  daysToMend,
  FIT,
  guardRefusal,
  LANES,
  MEND_A_DAY,
  OARS_A_DAY,
  orderRefusal,
  PER_YARD,
  piratesOn,
  repairRefusal,
  ROWER_PAY,
  rowersWarning,
  triremeDoing,
  triremeName,
  triremesAt,
  TRIREME_COST,
} from '../sim/fleet';
import { rateOf } from '../sim/labour';
import type { Building, SimState, Trireme } from '../sim/state';
import { morph } from './morph';
// Slice 50: the kit.
import { buildingIcon, TRIREME_FIGURE } from './icons';
import { kbar, kbtn, khead, kitHtml, kpips, kwhy } from './kit';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const cityName = (id: CityId): string => PLACES[id]?.name ?? id;
const dayWords = (n: number): string => (n === 1 ? 'a day' : `${n} days`);
const lower = (t: string): string => (t ? t[0].toLowerCase() + t.slice(1) : t);
/** How often the panel is redrawn while open (seconds). */
const REFRESH = 0.25;

/** A bar from 0 to 100, its words beside it. */
function bar(label: string, n: number, warnBelow: number): string {
  const v = Math.max(0, Math.min(100, Math.round(n)));
  return `<div class="meter k-meter${v < warnBelow ? ' low' : ''}"><span class="lab">${esc(label)}</span>${kbar({ value: v, max: 100, tone: v < warnBelow ? 'danger' : 'sea', tick: warnBelow / 100, tip: `${label}: ${v}%; she goes out at ${warnBelow} or better` })}<span class="num">${v}%</span></div>`;
}

/** A trireme's card. */
function triremeCard(s: SimState, map: CoastMap, t: Trireme): string {
  const why = crewWhy(s, map, t);
  const doing = triremeDoing(s, t);
  if (t.state === 'building') return `<li class="ship building k-card"><div class="k-cotop"><div class="k-niche">${TRIREME_FIGURE}</div><div class="name"><b>The ${esc(triremeName(t))}</b></div></div><p>${esc(doing)}</p></li>`;
  const days = daysToMend(s, t);
  const mend = t.hp >= 100 && t.oars >= 100 ? '' : t.state !== 'moored' ? 'She is mended at her mooring when she is in' : days < 0 ? 'Not being mended: her yard has no shipwrights' : t.mend ? `Under repair: whole in about ${dayWords(days)}, then ready to go out` : `Being mended at her mooring: whole in about ${dayWords(days)}`;
  const pay = t.crew.length ? `${fmt(t.crew.length * ROWER_PAY)} dr a month` : 'no rowers to pay';
  const owed = t.owed > 0 ? ` · <span class="warn">${fmt(t.owed)} dr pay owed</span>` : '';
  // Her orders: the lanes (where she may go now), home, and repair.
  const acts: string[] = [];
  const out = t.order === 'lane' || t.state === 'away' || (t.state === 'rowing' && t.task === 'out');
  if (t.order === 'away') acts.push('<span class="note">Away with your soldiers: she comes home with them</span>');
  else if (out && !(t.state === 'away' && t.order === 'bay')) acts.push(kbtn({ act: 'trihome', data: { id: t.id }, icon: 'home', html: 'Bring her home', small: true, tip: 'Back along the lane, into the bay and to her mooring' }));
  else if (!(t.state === 'away' && t.order === 'bay')) {
    const lanes = LANES.filter((l) => s.world.routes.some((r) => r.kind === 'sea' && r.city === l.city) || piratesOn(s, l.way));
    for (const l of lanes) {
      const no = guardRefusal(t, l.way);
      const p = piratesOn(s, l.way);
      const tip = no || `She rows out of the bay and along the lane to ${cityName(l.city)}, and keeps watch ${l.name}: what of yours passes there is safe${p ? `; she fights the ${p.of ? 'warships' : 'pirates'} there` : ''}`;
      acts.push(kbtn({ act: 'guard', data: { id: t.id, lane: l.way }, icon: 'guard', html: `Guard: ${esc(cityName(l.city))}${p ? ` <small>(${p.of ? 'warships' : 'pirates'})</small>` : ''}`, small: true, tip, why: no || undefined, tone: p ? 'lapis' : 'bronze' }));
    }
  }
  const noFix = repairRefusal(t);
  if (t.order !== 'away' && !t.mend) acts.push(kbtn({ act: 'repair', data: { id: t.id }, icon: 'build', html: 'Call in for repair', small: true, tip: 'Home to her mooring (if she is out) and laid up there until hull and oars are whole: she does not go out meanwhile', why: noFix || undefined }));
  return (
    `<li class="ship k-card${t.mend ? ' mending' : ''}"><div class="k-cotop"><div class="k-niche">${TRIREME_FIGURE}</div><div class="k-shipname"><div class="name"><b>The ${esc(triremeName(t))}</b><span class="n">${t.crew.length}<small> / ${CREW} rowers</small></span></div>` +
    `${kpips(Array.from({ length: CREW }, (_, k) => (k < t.crew.length ? 'ready' : 'empty')), `${t.crew.length} of ${CREW} rowers`)}</div></div><p>${esc(doing)}</p>` +
    bar('Hull', t.hp, FIT) +
    bar('Oars', t.oars, FIT) +
    (mend ? `<p class="mend">${esc(mend)}</p>` : '') +
    `<p class="small">${pay}${owed}</p>` +
    (why ? `<p class="why">${esc(why)}</p>` : '') +
    (acts.length ? `<div class="k-acts">${acts.join('')}</div>` : '') +
    '</li>'
  );
}

/** The harbour: a blockade coming or holding, or lately over. */
function harbourHtml(s: SimState): string {
  const b = blockadeOn(s);
  const words = blockadeWords(s);
  if (!words) return '';
  if (!b) return `<section class="harbour"><h3>The harbour</h3><p>${esc(words)}.</p></section>`;
  const left = blockadeLeft(s, b);
  const need = Math.max(0, toBreak(b) - b.sunk);
  const stops = b.phase === 'holding' ? '<p class="small">While it holds: the Tyrian ship waits out at sea (or at the quay once loaded), your sea routes’ traders wait off your gulf, and a vassal’s tribute by sea waits too. No gift can go by sea until it ends.</p>' : '<p class="small">Once it takes station no ship will come or go until it is broken or lifted.</p>';
  const how = `<p class="small">${b.phase === 'sailing' ? 'Your triremes at home, crewed and sound, will row out to its ships as they come into your waters' : 'Your triremes at home, crewed and sound, row out to its ships'}: sink ${need > 0 ? need : 'the rest'} ${need === 1 ? 'more' : 'more of them'} and the rest flee${left ? ` (${left} afloat)` : ''}.</p>`;
  return `<section class="harbour blockade"><h3>The harbour</h3><div class="late warnbox">${esc(words)}.</div>${stops}${how}</section>`;
}

/** The lanes: pirates and warships on them, and the last fights at sea. */
function lanesHtml(s: SimState): string {
  const lines: string[] = [];
  for (const l of LANES) {
    const p = piratesOn(s, l.way);
    if (!p) continue;
    const g = s.fleet.triremes.filter((t) => t.order === 'lane' && t.lane === l.way && afloat(t));
    const when = p.state === 'seen' ? `they start seizing what of yours passes there in ${dayWords(Math.max(1, Math.ceil((p.from - s.tick) / TICKS_PER_DAY)))}` : `seizing what of yours passes there${p.took.length ? ` (${p.took.length} taken so far)` : ''}`;
    lines.push(`<li class="warn-line">${esc(`${bandWords(p)} ${p.place}, on the lane to ${cityName(p.city)}${p.of ? ` (${warWords(s, p)})` : ''}: ${p.ships} ${p.ships === 1 ? 'ship' : 'ships'}; ${when}${g.length ? `. The ${triremeName(g[0])} ${g[0].state === 'away' && !g[0].homeward && s.tick >= g[0].start + g[0].dur ? 'guards it' : 'is on her way to guard it'}` : ''}`)}.</li>`);
  }
  const reps = s.fleet.reports.filter((r) => r.tick <= s.tick).slice(-4).reverse();
  const fights = reps.map((r) => `<li><small>${esc(agoWords(s.tick - r.tick))}</small> ${esc(r.line)}.</li>`);
  if (!lines.length && !fights.length) return '<section><h3>The lanes</h3><p class="none">No pirates or warships on your lanes.</p></section>';
  return `<section><h3>The lanes</h3>${lines.length ? `<ul class="lanes">${lines.join('')}</ul>` : '<p class="none">No pirates or warships on your lanes now.</p>'}${fights.length ? `<h4>Fights at sea</h4><ul class="fights">${fights.join('')}</ul>` : ''}</section>`;
}

function agoWords(ticks: number): string {
  const d = Math.floor(ticks / TICKS_PER_DAY);
  // (Phase 5 review: a fight of last year read "477 days ago".)
  const m = Math.floor(d / 30);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 60 ? `${d} days ago` : m < 24 ? `${m} months ago` : `${Math.floor(m / 12)} years ago`;
}

/** The panel's page: the yard picked first (or the first), then the others, the harbour and the lanes. */
export function shipyardHtml(s: SimState, map: CoastMap, focus: number): string {
  const yards = s.buildings.filter((b) => b.kind === 'shipyard');
  const pick = yards.find((b) => b.id === focus) ?? yards[0];
  const order = pick ? [pick, ...yards.filter((b) => b !== pick)] : [];
  const out: string[] = [];
  const head = pick ? `${pick.workers} of ${jobsAt(pick)} shipwrights` : 'No shipyard';
  out.push(khead({ kicker: head, title: yards.length > 1 ? 'The shipyards' : 'The shipyard', sub: 'Triremes to fight ships in your bay and guard your sea lanes', pic: buildingIcon('shipyard') }));
  out.push(harbourHtml(s));
  order.forEach((b: Building, i) => {
    const [cx, cz] = centreOf(b);
    const where = lower(districtTitle(districtAt(map, cx, cz)));
    const at = triremesAt(s, b.id).filter(afloat);
    const rate = rateOf(b);
    out.push(`<section class="yard"><h3>${order.length > 1 ? `The ${['first', 'second', 'third', 'fourth'][i] ?? `${i + 1}th`} yard` : 'The yard'}${where ? ` <small>${esc(where)}</small>` : ''}</h3>`);
    if (b.workers === 0) out.push('<div class="late">It has no shipwrights yet: nothing is built or mended, and no rowers are taken on.</div>');
    out.push(`<p class="small">${b.workers} of ${jobsAt(b)} shipwrights: they mend ${fmt(MEND_A_DAY * rate)} of a hull and ${fmt(OARS_A_DAY * rate)} of every hundred oars a day${rate < 1 && b.workers > 0 ? ` (${fmt(MEND_A_DAY)} and ${fmt(OARS_A_DAY)} fully staffed)` : ''}. ${at.length} of ${PER_YARD} moorings used.</p>`);
    out.push(at.length ? `<ul class="ships">${at.map((t) => triremeCard(s, map, t)).join('')}</ul>` : '<p class="none">No triremes yet.</p>');
    const no = orderRefusal(s, b);
    const short = no ? '' : rowersWarning(s);
    out.push(`<div class="k-acts build">${no ? kwhy(no) : ''}${kbtn({ act: 'trireme', data: { id: b.id }, icon: TRIREME_FIGURE, tone: 'lapis', html: `Build a trireme <small>${TRIREME_COST} dr</small>`, tip: `Built on the slip in about a month while the yard is staffed, then ${CREW} rowers come from the huts and cottages, one a home, at ${ROWER_PAY} dr a man a month${short ? `. ${short}` : ''}`, why: no || undefined })}</div>`);
    if (short) out.push(`<div class="late">${esc(short)}.</div>`);
    out.push('</section>');
  });
  const lost = s.fleet.triremes.filter((t) => afloat(t) && !findBuilding(s, t.yard));
  if (lost.length) out.push(`<section class="yard"><h3>Without a yard</h3><ul class="ships">${lost.map((t) => triremeCard(s, map, t)).join('')}</ul></section>`);
  out.push(lanesHtml(s));
  out.push('<p class="foot">A trireme goes out only with half her rowers, her hull and her oars at 60 or better, and not under repair. Home badly hurt, she is laid up until whole. Her oars broken, she rows slower, down to a third of her pace.</p>');
  return out.join('');
}

export class ShipyardPanel {
  private readonly el: HTMLElement;
  private readonly body: HTMLElement;
  private shown = false;
  private html = '';
  private last = -Infinity;
  private pressed = false;
  /** The yard picked (a building id; 0: the first). */
  yard = 0;
  onOpen: () => void = () => {};

  constructor(root: HTMLElement, send: (c: Command) => void) {
    const el = document.createElement('div');
    el.className = 'household trade shipyard kit';
    el.hidden = true;
    el.innerHTML = '<button class="close" data-tip="Close (Esc)" aria-label="Close">×</button><div class="body"></div>';
    root.appendChild(el);
    this.el = el;
    this.body = el.querySelector('.body') as HTMLElement;
    (el.querySelector('.close') as HTMLElement).addEventListener('click', () => this.toggle(false));
    this.body.addEventListener('pointerdown', () => {
      this.pressed = true;
    });
    const release = (): void => {
      this.pressed = false;
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    this.body.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button[data-act]') as HTMLButtonElement | null;
      if (!b || b.disabled) return;
      const id = Number(b.dataset.id);
      const act = b.dataset.act;
      if (act === 'trireme') send({ type: 'trireme', yard: id });
      else if (act === 'guard') send({ type: 'fleet', trireme: id, act: 'guard', lane: b.dataset.lane ?? '' });
      else if (act === 'trihome') send({ type: 'fleet', trireme: id, act: 'home' });
      else if (act === 'repair') send({ type: 'fleet', trireme: id, act: 'repair' });
      else return;
      this.last = -Infinity;
    });
  }

  get open(): boolean {
    return this.shown;
  }

  /** Open on a yard (its id; 0 the first). */
  show(yard = 0): void {
    this.yard = yard;
    if (this.shown) {
      this.body.scrollTop = 0;
      this.last = -Infinity;
    }
    this.toggle(true);
  }

  toggle(show = !this.shown): void {
    if (show && !this.shown) this.body.scrollTop = 0;
    this.shown = show;
    this.last = -Infinity;
    if (!show) this.html = '';
    this.el.hidden = !show;
    if (show) this.onOpen();
  }

  /** Refresh while open; closes itself with no shipyard and no trireme left. */
  update(s: SimState, map: CoastMap, time: number): void {
    if (!this.shown) return;
    if (!s.buildings.some((b) => b.kind === 'shipyard') && !s.fleet.triremes.some(afloat)) {
      this.toggle(false);
      return;
    }
    if (this.pressed || time - this.last < REFRESH) return;
    this.last = time;
    const html = kitHtml(shipyardHtml(s, map, this.yard));
    if (html !== this.html) {
      if (this.html) morph(this.body, html);
      else this.body.innerHTML = html;
      this.html = html;
    }
  }

  /** The panel's text (for the smoke test). */
  get text(): string {
    return this.el.hidden ? '' : (this.body.textContent ?? '');
  }
}
