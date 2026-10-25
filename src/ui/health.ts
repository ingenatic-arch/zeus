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

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const days = (t: number): string => {
  const d = Math.max(1, Math.ceil(t / TICKS_PER_DAY));
  return d === 1 ? 'a day' : `${d} days`;
};
const cityName = (id: string): string => PLACES[id as keyof typeof PLACES]?.name ?? id;

/** A health bar, 0 to 100, its word and number beside it. */
function bar(v: number): string {
  const n = Math.max(0, Math.min(100, Math.round(v)));
  const tone = n >= 75 ? 'good' : n >= 50 ? 'fair' : n >= 30 ? 'poor' : 'bad';
  return `<div class="hmeter ${tone}"><span class="word">${healthWord(n)}</span><span class="bar"><i style="width:${n}%"></i></span><span class="num">${n}</span></div>`;
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
  const btn = on
    ? '<button class="pill" data-act="quarantine" data-on="0" title="Lift the quarantine: ships tie up and caravans come in again">Lift the quarantine</button>'
    : `<button class="pill${warn.length ? ' urge' : ''}" data-act="quarantine" data-on="1" title="Close the quay and the roads in for a season">Order a quarantine</button>`;
  const w = warn.map((l) => `<p class="qwarn">${esc(l)}</p>`).join('');
  return `<section class="quarantine"><h3>Quarantine</h3>${w}${state}<div class="qacts">${btn}</div></section>`;
}

/** The city's health in a few lines, and its plague risk with the reasons. */
function cityHtml(s: SimState): string {
  const f = healthFigures(s);
  if (!f.on) return '<section class="hcity"><h3>The city’s health</h3><p class="none">Nobody falls ill in this town yet.</p></section>';
  const rows: string[] = [];
  rows.push(`<li><span>Sick now</span><b>${f.sick}${f.plague ? ` · ${f.plague} of the plague` : ''}${f.inBeds ? ` · ${f.inBeds} in beds` : ''}</b></li>`);
  rows.push(`<li><span>Homes sickly or ailing</span><b>${f.sickly + f.ailing} of ${f.homes}</b></li>`);
  rows.push(`<li><span>Called on by a physician this season</span><b>${f.called} of ${f.homes}</b></li>`);
  rows.push(`<li><span>This month</span><b>${f.month.ill} fell ill · ${f.month.mended} mended · ${f.month.died} died${f.month.fled ? ` · ${f.month.fled} fled` : ''}</b></li>`);
  const risk = `<p class="risk ${f.risk}"><b>Plague risk: ${f.risk === 'none' ? 'none' : f.risk}</b>${f.reasons.length ? `: ${esc(f.reasons.map((r, i) => (i ? r.charAt(0).toLowerCase() + r.slice(1) : r)).join('; '))}` : ''}</p>`;
  const out = f.outbreak ? `<p class="qwarn">${esc(f.outbreak)}</p>` : '';
  return `<section class="hcity"><h3>The city’s health</h3>${out}<ul class="hrows">${rows.join('')}</ul>${risk}</section>`;
}

/** The infirmary's own sections. */
function infirmaryHtml(s: SimState, b: Building): string {
  const out: string[] = [];
  const c = calledNear(s, b);
  const lead = b.workers === 0 ? '<p class="late">Nobody works here yet: no physician goes out.</p>' : '';
  out.push(`<section class="hwork"><h3>Its physicians</h3><p class="small lead">They walk the streets in a crew of three, calling on every home beside their way and tending the sick there: a home called on is healthier for a month, and the sick a physician tends are half as likely to die.</p>${lead}${c.homes ? bar((c.called / c.homes) * 100).replace(/<span class="word">[^<]*<\/span>/, '<span class="word">Called</span>').replace(/<span class="num">\d+<\/span>/, `<span class="num">${c.called}/${c.homes}</span>`) : ''}${c.homes ? `<p class="small">${esc(`Called on ${c.called} of the ${c.homes} homes round it this month.`)}</p>` : ''}</section>`);
  // The sick in its reach, worst first.
  const sick = s.health.sick.filter((x) => x.bed === 0).slice(0, 6);
  if (sick.length) out.push(`<section><h3>The sick at home</h3><ul class="hsick">${sick.map((x) => `<li>${esc(sickWords(s, x))}${housePart(s, x.home)}</li>`).join('')}</ul></section>`);
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
  const beds = Array.from({ length: BEDS }, (_, i) => `<i class="${i < lying.length ? 'full' : i < taken ? 'coming' : ''}"></i>`).join('');
  const lead = b.workers === 0 ? '<p class="late">Nobody works here yet: no bearers go out, and the beds are left untended.</p>' : '';
  out.push(`<section class="hwork"><h3>Its beds</h3><p class="small lead">Its stretcher-bearers fetch the worst of the sick from their homes by road to its ${BEDS} beds, where they mend sooner and die a third as often. Homes round it are healthier, and the plague spreads half as fast among them.</p>${lead}<div class="beds" title="${lying.length} of ${BEDS} beds taken${coming.length ? `, ${coming.length} on the way` : ''}">${beds}</div><p class="small">${esc(`${lying.length} of its ${BEDS} beds taken${coming.length ? `, ${coming.length} more on the way` : ''}.`)}</p>${lying.length || coming.length ? `<ul class="hsick">${[...lying, ...coming].map((x) => `<li>${esc(sickWords(s, x))}${housePart(s, x.home)}</li>`).join('')}</ul>` : ''}</section>`);
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
  return `<section class="hhome"><h3>Health</h3>${bar(v)}${toward}${struck}${ill}<ul class="reasons">${rs}</ul></section>`;
}
