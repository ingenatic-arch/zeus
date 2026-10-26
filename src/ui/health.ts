/**
 * Slice 49: health in the panels. The infirmary's and the asklepieion's
 * sections in the building panel (through PANELS in buildingpanel.ts): the
 * physicians out and the homes called on, or the beds, who lies in them and
 * the bearers out; the city's health and its plague risk; and the quarantine
 * order. The same quarantine row heads the trade panel, and a home's panel has
 * its health: a word, a bar, the reasons and who is sick. They only read the
 * sim; the quarantine is a command (the `quarantine` buttons).
 */
import './health.css';
import type { CoastMap } from '../map/bake';
import { PLACES } from '../map/greece';
import { findBuilding } from '../sim/buildings';
import { TICKS_PER_DAY } from '../sim/clock';
import {
  BEDS,
  bedsTaken,
  calledNear,
  healthFigures,
  healthOf,
  healthWord,
  QUARANTINE_TICKS,
  quarantined,
  sickWords,
  tradesWith,
  traderDue,
  WARN_LEAD,
} from '../sim/health';
import type { Building, SimState } from '../sim/state';
// Merge of slice 50 with slice 49: the health panels on the kit (bars, pips, chips, plaques, carved sections, the one tip).
import { actionIcon, messageIcon, PHYSICIAN_FIGURE, BEARERS_FIGURE } from './icons';
import { kbar, kbtn, kchip, kpips, ksec, type BarTone } from './kit';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const days = (t: number): string => {
  const d = Math.max(1, Math.ceil(t / TICKS_PER_DAY));
  return d === 1 ? 'a day' : `${d} days`;
};
const cityName = (id: string): string => PLACES[id as keyof typeof PLACES]?.name ?? id;

/** A health bar, 0 to 100 (the kit's), its word and number beside it; `word` and `num` say something else (the physicians' calls). */
function bar(v: number, word?: string, num?: string, tip?: string): string {
  const n = Math.max(0, Math.min(100, Math.round(v)));
  const cls = n >= 75 ? 'good' : n >= 50 ? 'fair' : n >= 30 ? 'poor' : 'bad';
  const tone: BarTone = n >= 75 ? 'good' : n >= 50 ? 'stock' : n >= 30 ? 'wear' : 'danger';
  return `<div class="hmeter ${cls}"><span class="word">${esc(word ?? healthWord(n))}</span>${kbar({ value: n, max: 100, tone, tip: tip ?? `Health ${n} of 100: ${healthWord(n).toLowerCase()}` })}<span class="num">${esc(num ?? String(n))}</span></div>`;
}

/** The plague in Greece that threatens the town (cities it trades with), in words. */
function threats(s: SimState): string[] {
  const out: string[] = [];
  for (const p of s.health.greece) {
    if (s.tick >= p.until || !tradesWith(s, p.city)) continue;
    const due = traderDue(s, p.city);
    const from = p.warned + WARN_LEAD;
    const when = s.tick < from ? `their traders can bring it ashore in ${days(from - s.tick)}` : 'their traders can bring it ashore now';
    out.push(`Plague in ${cityName(p.city)}${due ? `: ${due}` : ''}; ${when}. It passes in about ${days(p.until - s.tick)}.`);
  }
  return out;
}

/** The quarantine: how it stands, the plague that threatens, and the order (or lifting). For the trade panel and the health buildings. */
export function quarantineHtml(s: SimState): string {
  if (!s.health) return '';
  const on = quarantined(s);
  const warn = threats(s);
  const season = Math.round(QUARANTINE_TICKS / TICKS_PER_DAY);
  const state = on
    ? `<p class="qstate on"><b>Under quarantine</b> for ${esc(days(s.health.quarantine - s.tick))} more: ships ride at anchor off the quay, caravans are turned back at the edge, and the dockers stay in. No trade comes in or goes out.</p>`
    : `<p class="qstate">No quarantine. Ordered, it holds every ship and caravan off for a season (${season} days), or until you lift it: no plague can come ashore, and no trade either.</p>`;
  // (Merge of slice 50: the order a plaque with the pennant, lapis when a plague threatens; the lifting terracotta, as it undoes the order.)
  const btn = (tip: string): string =>
    on
      ? kbtn({ act: 'quarantine', data: { on: 0 }, icon: 'lift', html: 'Lift the quarantine', tone: 'red', small: true, tip: 'Lift the quarantine: ships tie up and caravans come in again' })
      : kbtn({ act: 'quarantine', data: { on: 1 }, icon: 'quarantine', html: 'Order a quarantine', tone: warn.length ? 'lapis' : 'bronze', small: true, cls: warn.length ? 'urge' : '', tip });
  // (Review of slice 49: with nothing threatening and no quarantine, one quiet line, so every trade panel isn't headed by a block about plague.)
  if (!on && !warn.length && !s.health.outbreak) {
    return `<section class="quarantine quiet"><span class="qic">${actionIcon('quarantine')}</span><p class="qstate"><b>Quarantine:</b> none. No plague threatens your traders.</p>${btn(`Close the quay and the roads in for a season (${season} days), or until you lift it: no plague can come ashore, and no trade either`)}</section>`;
  }
  const w = warn.map((l) => `<p class="qwarn">${esc(l)}</p>`).join('');
  return ksec('Quarantine', `${w}${state}<div class="qacts">${btn('Close the quay and the roads in for a season')}</div>`, { icon: 'quarantine', cls: `quarantine${on ? ' on' : ''}` });
}

/** The city's health in a few lines, and its plague risk with the reasons. */
function cityHtml(s: SimState): string {
  const f = healthFigures(s);
  if (!f.on) return ksec('The city’s health', '<p class="none">Nobody falls ill in this town yet.</p>', { icon: 'home', cls: 'hcity' });
  const rows: string[] = [];
  rows.push(`<li><span>Sick now</span><b>${f.sick}${f.plague ? ` · ${f.plague} of the plague` : ''}${f.inBeds ? ` · ${f.inBeds} in beds` : ''}</b></li>`);
  rows.push(`<li><span>Homes sickly or ailing</span><b>${f.sickly + f.ailing} of ${f.homes}</b></li>`);
  rows.push(`<li><span>Called on by a physician this season</span><b>${f.called} of ${f.homes}</b></li>`);
  rows.push(`<li><span>This month</span><b>${f.month.ill} fell ill · ${f.month.mended} mended · ${f.month.died} died${f.month.fled ? ` · ${f.month.fled} fled` : ''}</b></li>`);
  // (Merge of slice 50: the risk a chip in its tone, its reasons beside it.)
  const tone = f.risk === 'high' ? 'warn' : f.risk === 'rising' ? 'gold' : 'plain';
  const risk = `<p class="risk ${f.risk}">${kchip(`Plague risk: ${f.risk === 'none' ? 'none' : f.risk}`, { tone, cls: 'riskchip' })}${f.reasons.length ? ` ${esc(f.reasons.map((r) => r.charAt(0).toLowerCase() + r.slice(1)).join('; '))}` : ''}</p>`;
  const out = f.outbreak ? `<p class="qwarn">${esc(f.outbreak)}</p>` : '';
  return ksec('The city’s health', `${out}<ul class="hrows">${rows.join('')}</ul>${risk}`, { icon: 'home', cls: 'hcity' });
}

/** The infirmary's own sections. */
function infirmaryHtml(s: SimState, b: Building): string {
  const out: string[] = [];
  const c = calledNear(s, b);
  const lead = b.workers === 0 ? '<p class="late">Nobody works here yet: no physician goes out.</p>' : '';
  const called = c.homes ? bar((c.called / c.homes) * 100, 'Called', `${c.called}/${c.homes}`, `Called on ${c.called} of the ${c.homes} homes round it this month`) : '';
  out.push(ksec('Its physicians', `<div class="hlead"><span class="hfig">${PHYSICIAN_FIGURE}</span><p class="small lead">They walk the streets in a crew of three, calling on every home beside their way and tending the sick there: a home called on is healthier for a month, and the sick a physician tends are half as likely to die.</p></div>${lead}${called}${c.homes ? `<p class="small">${esc(`Called on ${c.called} of the ${c.homes} homes round it this month.`)}</p>` : ''}`, { icon: 'health', cls: 'hwork' }));
  // The sick in its reach, worst first.
  // (Review of slice 49: and those whose stretcher-bearers are on their way: they are still at home.)
  const sick = s.health.sick.filter((x) => x.bed <= 0).slice(0, 6);
  if (sick.length) out.push(ksec('The sick at home', `<ul class="hsick">${sick.map((x) => `<li class="${x.plague ? 'plague' : ''}">${esc(sickWords(s, x))}${housePart(s, x.home)}</li>`).join('')}</ul>`, { icon: messageIcon('sickness') }));
  out.push(cityHtml(s));
  out.push(quarantineHtml(s));
  return out.join('');
}

/** ", the house of …" for a sick one's home. */
function housePart(s: SimState, home: number): string {
  const h = findBuilding(s, home);
  return h?.family ? ` <small>(the house of ${esc(h.family.name)})</small>` : '';
}

/** The asklepieion's own sections. */
function templeHtml(s: SimState, b: Building): string {
  const out: string[] = [];
  const lying = s.health.sick.filter((x) => x.bed === b.id);
  const coming = s.health.sick.filter((x) => x.bed === -b.id);
  const taken = bedsTaken(s, b);
  // (Merge of slice 50: the beds as the kit's pips: full, the sick on their way, empty.)
  const beds = kpips(Array.from({ length: BEDS }, (_, i) => (i < lying.length ? 'on' : i < taken ? 'coming' : 'off')), `${lying.length} of ${BEDS} beds taken${coming.length ? `, ${coming.length} on the way` : ''}`, 'beds big');
  const lead = b.workers === 0 ? '<p class="late">Nobody works here yet: no bearers go out, and the beds are left untended.</p>' : '';
  out.push(ksec('Its beds', `<div class="hlead"><span class="hfig wide">${BEARERS_FIGURE}</span><p class="small lead">Its stretcher-bearers fetch the worst of the sick from their homes by road to its ${BEDS} beds, where they mend sooner and die a third as often. Homes round it are healthier, and the plague spreads half as fast among them.</p></div>${lead}<div class="bedrow">${beds}<span class="small">${esc(`${lying.length} of its ${BEDS} beds taken${coming.length ? `, ${coming.length} more on the way` : ''}.`)}</span></div>${lying.length || coming.length ? `<ul class="hsick">${[...lying, ...coming].map((x) => `<li class="${x.plague ? 'plague' : ''}">${esc(sickWords(s, x))}${housePart(s, x.home)}</li>`).join('')}</ul>` : ''}`, { icon: 'bed', cls: 'hwork' }));
  out.push(cityHtml(s));
  out.push(quarantineHtml(s));
  return out.join('');
}

/** The infirmary's sections, for its entry in the building panel's registry (buildingpanel.ts). */
export const infirmarySections = (s: SimState, _map: CoastMap, b: Building): string => `<div class="healthp">${infirmaryHtml(s, b)}</div>`;

/** The asklepieion's sections, for its entry in the registry. */
export const asklepieionSections = (s: SimState, _map: CoastMap, b: Building): string => `<div class="healthp">${templeHtml(s, b)}</div>`;

/** Their own lines, said in their sections (left out of "What it is doing"). */
export const HEALTH_QUIET = /^(\d+ of its \d+ beds taken|Called on \d+ of the \d+ homes)/;

/** A home's health, for its household panel: the word and bar, the reasons, and who is sick (nothing with health off). */
export function homeHealthHtml(s: SimState, b: Building): string {
  if (!s.health?.on || !b.family) return '';
  const { value, reasons } = healthOf(s, b);
  const v = b.health > 0 ? b.health : value;
  const toward = b.health > 0 && Math.abs(value - b.health) >= 2 ? `<p class="small">${esc(value > b.health ? `Rising toward ${value}` : `Falling toward ${value}`)}</p>` : '';
  const rs = reasons.map((r) => `<li class="${r.w > 0 ? 'good' : r.w < 0 ? 'bad' : 'so'}">${esc(r.text)}</li>`).join('');
  const sick = s.health.sick.filter((x) => x.home === b.id);
  const ill = sick.length ? `<ul class="hsick">${sick.map((x) => `<li class="${x.plague ? 'plague' : ''}">${esc(sickWords(s, x))}</li>`).join('')}</ul>` : '';
  const struck = s.health.outbreak?.struck.includes(b.id) ? '<p class="qwarn">The plague has struck this house: a brazier of herbs smokes at its door.</p>' : '';
  // (Merge of slice 50: the home's panel isn't on the kit yet, but its health line is: the kit's bar, and the one tip inside it.)
  return `<section class="hhome kit"><h3>Health</h3>${bar(v)}${toward}${struck}${ill}<ul class="reasons">${rs}</ul></section>`;
}
