/**
 * Slice 54: a sanctuary's sections in the building panel (its entry in the
 * registry, buildingpanel.ts `PANELS.sanctuary`), on the kit: the god (their
 * emblem, name and what they are god of), the three stages with their bars
 * and what each still wants, the god's mood and its top reasons (read
 * through the pantheon's API), the priests and how far they go, and the
 * named places later slices fill: slice 53's festival and offering buttons
 * and slice 57's blessing (SANCTUARY_SLOTS). Pure reads of the state.
 */
import './sanctuary.css';
import type { CoastMap } from '../map/bake';
import { jobsAt } from '../sim/buildings';
import { TICKS_PER_DAY } from '../sim/clock';
import { PRIESTESS_RANGE } from '../sim/culture';
import { held } from '../sim/foods';
import { needOf, siteMaterials, siteOf, stagesOf, workOf, type Site } from '../sim/monuments';
import { comingTo, isBronze, smithsAt } from '../sim/monumentworks';
import { materialName } from '../sim/monumentstatus';
import { GODS, moodOfGod, moodWord, reasonsOf, type GodId } from '../sim/pantheon';
import { DIM_AFTER, dimmed, PRIEST_RANGE, STANDING_HONOUR } from '../sim/sanctuaries';
import type { Building, SimState } from '../sim/state';
import { sacredWords } from './godchooser';
import { godColourCss, godEmblem } from './godemblems';
import { kbar, ksec } from './kit';
// Slice 60.
import { sanctuaryCall } from './godwarcard';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const signed = (n: number): string => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(n))}`;
const low = (t: string): string => t.charAt(0).toLowerCase() + t.slice(1);

/**
 * The named places on a sanctuary's panel that later slices fill, each a
 * function giving its HTML (absent, or '': nothing shows). Slice 53 puts its
 * festival and offering buttons in `offerings`; slice 57 its blessing in
 * `blessing`.
 */
export const SANCTUARY_SLOTS: { offerings?: (s: SimState, b: Building, god: GodId) => string; blessing?: (s: SimState, b: Building, god: GodId) => string } = {};

/** What a stage under way or waiting still wants, in a line ('' for nothing). */
function missing(s: SimState, x: Site, b: Building, stage: number): string {
  const st = stagesOf(x)[stage];
  if (!st) return '';
  const short = siteMaterials(x)
    .filter((w) => needOf(st, w) > held(b, w) + comingTo(s, x.id, w))
    .map((w) => `${fmt(needOf(st, w) - held(b, w) - comingTo(s, x.id, w))} ${materialName(w)}`);
  return short.length ? `Wants ${short.join(', ')}` : '';
}

/** How far the materials for a stage are gathered (on site), 0 to 1. */
function gathered(x: Site, b: Building, stage: number): number {
  const st = stagesOf(x)[stage];
  if (!st) return 0;
  let need = 0;
  let have = 0;
  for (const w of siteMaterials(x)) {
    const n = needOf(st, w);
    need += n;
    have += Math.min(n, held(b, w));
  }
  return need ? have / need : 1;
}

/** The three stages: done, under way (its work), or gathering (its materials). */
function stagesHtml(s: SimState, x: Site, b: Building): string {
  const rows = stagesOf(x).map((st, i) => {
    let bar: string;
    let line: string;
    let cls = '';
    if (x.finished || i < x.stage) {
      bar = kbar({ value: 1, max: 1, tone: 'good' });
      line = 'Done';
      cls = 'done';
    } else if (i === x.stage && x.building) {
      const f = Math.min(1, x.work / workOf(st));
      bar = kbar({ value: f, max: 1, tone: 'stone' });
      line = isBronze(x) && !smithsAt(s) ? 'The bronze waits for the armourers: an armoury with workers casts it' : `Building: ${Math.floor(f * 100)}% done`;
      cls = 'now';
    } else if (i === x.stage || (i === x.stage + 1 && x.building)) {
      const g = gathered(x, b, i);
      bar = kbar({ value: g, max: 1, tone: 'stock' });
      const want = missing(s, x, b, i);
      line = want ? `Gathering its materials: ${low(want)}` : isBronze(x) && i === x.stage && !smithsAt(s) ? 'All on site: the bronze waits for the armourers' : 'All on site';
      cls = i === x.stage ? 'now' : 'next';
    } else {
      bar = kbar({ value: 0, max: 1, tone: 'stock' });
      line = `Then: ${st.builders} builders, about ${st.days} days`;
      cls = 'later';
    }
    return `<li class="${cls}"><div class="sn-row"><b>${i + 1}. ${esc(st.name)}</b>${bar}</div><p>${esc(line)}</p></li>`;
  });
  return ksec('Its stages', `<ol class="sn-stages">${rows.join('')}</ol>`, { cls: 'sn' });
}

/** The god's mood, its word and its reasons, largest first. */
function moodHtml(s: SimState, god: GodId): string {
  const g = GODS[god];
  const mood = moodOfGod(s, god);
  const reasons = reasonsOf(s, god).slice(0, 4);
  const list = reasons.length
    ? `<ul class="sn-why">${reasons.map((r) => `<li class="${r.worth >= 0 ? 'up' : 'down'}"><b>${signed(r.worth)}</b> ${esc(r.why)}${r.fading ? ' <small>(fading)</small>' : ''}</li>`).join('')}</ul>`
    : `<p class="sn-none">${esc(g.name)} remembers nothing of your city yet.</p>`;
  return ksec(`${g.name} is ${moodWord(mood)}`, `<div class="sn-mood">${kbar({ value: mood + 100, max: 200, tone: mood > 0 ? 'good' : mood < 0 ? 'danger' : 'stock', tick: 0.5 })}<span class="num">${signed(mood)}</span></div>${list}`, { cls: 'sn' });
}

/** The sanctuary's sections (see the notes at the top). */
export function sanctuarySections(s: SimState, _map: CoastMap, b: Building): string {
  const x = siteOf(s, b.id);
  const god = (x?.god ?? b.god) as GodId | undefined;
  if (!x || !god) return '';
  const g = GODS[god];
  const out: string[] = [];
  out.push(
    `<section class="sn-god" style="--god:${godColourCss(god)}"><span class="sn-em">${godEmblem(god)}</span><div><h3>${esc(g.name)}, ${esc(g.epithet)}</h3><p>God of ${esc(g.of)}. Consecrated with ${esc(sacredWords(god))}.</p></div></section>`,
  );
  if (!x.finished) out.push(stagesHtml(s, x, b));
  out.push(moodHtml(s, god));
  if (x.finished) {
    const priests = s.walkers.filter((w) => w.kind === 'priest' && w.origin === b.id).length;
    const staffed = b.workers > 0;
    let state: string;
    if (dimmed(s, x)) state = `<p class="sn-dim">Dimmed: its lamps are out, and ${esc(g.name)} no longer counts it an honour. Workers bring it back.</p>`;
    else if (!staffed && x.idle > 0) state = `<p class="sn-dim">Nobody works it: it dims in about ${Math.max(1, Math.ceil((DIM_AFTER - (s.tick - x.idle)) / TICKS_PER_DAY))} days unless workers come.</p>`;
    else state = `<p>Finished and staffed: +${STANDING_HONOUR} to ${esc(g.name)}’s mood while it stands so.</p>`;
    const reach = `Its priests walk up to ${PRIEST_RANGE} tiles of road from it, blessing every home they pass for four months (a shrine’s priestess goes ${PRIESTESS_RANGE}).`;
    out.push(ksec('Its priests', `${state}<p>${priests ? `${priests} out now. ` : staffed ? 'They set out soon. ' : ''}${esc(reach)}</p><p class="sn-staff">${Math.min(b.workers, jobsAt(b))} of ${jobsAt(b)} priests and temple servants.</p>`, { cls: 'sn' }));
  }
  // Slice 60: while invaders are on your land, the god's call to war (or why they can't come).
  if (x.finished) out.push(sanctuaryCall(s, god));
  // (The places later slices fill: empty, and not shown, until they do.)
  out.push(`<div class="sn-slot" data-slot="offerings">${SANCTUARY_SLOTS.offerings?.(s, b, god) ?? ''}</div>`);
  out.push(`<div class="sn-slot" data-slot="blessing">${SANCTUARY_SLOTS.blessing?.(s, b, god) ?? ''}</div>`);
  return `<div class="sanctp">${out.join('')}</div>`;
}

/** Lines of the hover tip the sections say, left out of "What it is doing". */
export const SANCTUARY_QUIET = /is (furious|angry|displeased|watchful|pleased|warm|loving) \(|bless(ing)? homes|^Finished on/;
