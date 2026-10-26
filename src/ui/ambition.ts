/**
 * The Ambition panel (slice 39): the three ambitions side by side, opened from
 * the laurel chip in the top bar (or a laurel's town line). Each column names
 * its ambition and what it is about, says "Achieved in year 9" once all five
 * of its milestones are reached, and lists them from easy to grand: a laurel
 * and the year for each one reached (and what its reward came to), and for
 * the rest what it wants, how far you are, and its reward. The last is the
 * ambition's great monument. It only reads the sim state.
 *
 * It also listens for new laurels (not those recorded quietly as a town is
 * opened) and calls `onLaurel` with the fanfare to play.
 */
import { formatYear, dateOfTick, TICKS_PER_DAY } from '../sim/clock';
import { ambitionView, AMBITIONS, laurelCount, MILESTONE_COUNT, yearOf, type AmbitionKind, type AmbitionView, type MilestoneView } from '../sim/ambitions';
import type { SimState } from '../sim/state';
// Slice 50: the kit.
import { kbar, kitHtml } from './kit';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The laurel wreath: two sprays of leaves meeting at the top, tied below. */
export const LAUREL =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><g fill="#7f9a3a" stroke="#3f5216" stroke-width=".5"><ellipse cx="3.4" cy="11" rx="1.1" ry="2" transform="rotate(-40 3.4 11)"/><ellipse cx="2.4" cy="7.8" rx="1" ry="1.9" transform="rotate(-12 2.4 7.8)"/><ellipse cx="3" cy="4.6" rx=".9" ry="1.7" transform="rotate(18 3 4.6)"/><ellipse cx="5" cy="2.4" rx=".8" ry="1.5" transform="rotate(50 5 2.4)"/><ellipse cx="12.6" cy="11" rx="1.1" ry="2" transform="rotate(40 12.6 11)"/><ellipse cx="13.6" cy="7.8" rx="1" ry="1.9" transform="rotate(12 13.6 7.8)"/><ellipse cx="13" cy="4.6" rx=".9" ry="1.7" transform="rotate(-18 13 4.6)"/><ellipse cx="11" cy="2.4" rx=".8" ry="1.5" transform="rotate(-50 11 2.4)"/></g><path d="M5.6 13.6c.8.6 1.6.9 2.4.9s1.6-.3 2.4-.9" fill="none" stroke="#b8322a" stroke-width="1.2" stroke-linecap="round"/><circle cx="8" cy="14.2" r=".9" fill="#b8322a"/></svg>';

/** A laurel not yet won: the wreath's outline, faint. */
const LAUREL_OPEN = LAUREL.replace('fill="#7f9a3a" stroke="#3f5216"', 'fill="none" stroke="#b39b78"').replace(/fill="#b8322a"/g, 'fill="#d8c8a8"').replace('stroke="#b8322a"', 'stroke="#d8c8a8"');

/** Each ambition's emblem: a crested helmet, a merchant ship, a column. */
const EMBLEMS: Record<AmbitionKind, string> = {
  greece:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 4.2c3.8-2.6 11.2-2.6 15 0" fill="none" stroke="#b8322a" stroke-width="3" stroke-linecap="round"/><path d="M12 5c-4.6 0-7.6 3.2-7.6 7.8v8.2h5v-5l-1.4-1.8v-3.4h8v3.4l-1.4 1.8v5h5v-8.2C19.6 8.2 16.6 5 12 5z" fill="#c8963c" stroke="#5e4214" stroke-width="1.1" stroke-linejoin="round"/><path d="M10.8 11v6M13.2 11v6" stroke="#5e4214" stroke-width="1.1"/></svg>',
  trade:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11.4 2v13" stroke="#6e4e30" stroke-width="1.6"/><path d="M12.4 3.2c4.2 2 6.4 5.6 6.8 10.4h-6.8z" fill="#f7edd6" stroke="#c0462e" stroke-width="1.3" stroke-linejoin="round"/><path d="M10.4 4.6C7.4 6.4 5.6 9.4 5.2 13.6h5.2z" fill="#f7edd6" stroke="#c0462e" stroke-width="1.1" stroke-linejoin="round"/><path d="M1.6 15.4h20.8c-1 3.4-3.6 5.4-7 5.4H8.4c-3 0-5.4-1.8-6.8-5.4z" fill="#7a4a2c"/><path d="M3 22.2c2-1 3.6 1 5.6 0s3.6 1 5.6 0 3.6 1 5.6 0" fill="none" stroke="#2f7f9e" stroke-width="1.1" stroke-linecap="round"/></svg>',
  wonders:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.4 3.4h17.2l-1.8 2.4H5.2z" fill="#f1e8d2" stroke="#7a6446" stroke-width="1" stroke-linejoin="round"/><path d="M6.4 5.8h11.2v12.6H6.4z" fill="#efe6cf" stroke="#7a6446" stroke-width="1"/><path d="M9 6.4v11.4M12 6.4v11.4M15 6.4v11.4" stroke="#b8a682" stroke-width=".9"/><path d="M4.4 18.4h15.2l1.2 2.4H3.2z" fill="#f1e8d2" stroke="#7a6446" stroke-width="1" stroke-linejoin="round"/></svg>',
};

const dateWords = (tick: number): string => {
  const d = dateOfTick(tick);
  return `${d.monthName} ${formatYear(d.yearBC)}`;
};

function milestoneHtml(m: MilestoneView): string {
  const cls = `ms${m.reached ? ' won' : ''}${m.monument ? ' great' : ''}`;
  const head = `<span class="lau">${m.reached ? LAUREL : LAUREL_OPEN}</span><div class="body"><div class="nm">${esc(m.name)}</div>`;
  if (m.reached) {
    const when = m.quiet ? `Already yours when this town was opened (year ${yearOf(m.reached)})` : `Year ${yearOf(m.reached)} · ${dateWords(m.reached)}`;
    const note = m.note ? `<div class="note">${esc(m.note[0].toUpperCase() + m.note.slice(1))}.</div>` : '';
    return `<li class="${cls}" title="${esc(`${m.want}. ${m.words}.`)}">${head}<div class="when">${esc(when)}</div>${note}</div></li>`;
  }
  const pct = Math.round(m.share * 100);
  return `<li class="${cls}">${head}<div class="want">${esc(m.want)}</div>${kbar({ value: pct, max: 100, tone: 'good', tip: `${pct}% of the way` })}<div class="words">${esc(m.words)}</div><div class="reward">Reward: ${esc(m.reward)}</div></div></li>`;
}

function columnHtml(a: AmbitionView): string {
  const status = a.achieved
    ? `<div class="status done">${LAUREL}<span>${a.quiet ? `Achieved: already so when this town was opened (year ${yearOf(a.achieved)})` : `Achieved in year ${yearOf(a.achieved)}`}</span></div>`
    : `<div class="status">${a.count} of 5 milestones</div>`;
  return kitHtml(`<section class="amb k-card ${a.kind}${a.achieved ? ' achieved' : ''}"><header><span class="emblem">${EMBLEMS[a.kind]}</span><div><h3>${esc(a.name)}</h3><p>${esc(a.what)}</p></div></header>${status}<ol>${a.milestones.map(milestoneHtml).join('')}</ol></section>`);
}

export class AmbitionPanel {
  readonly el: HTMLElement;
  private body: HTMLElement;
  private key = '';
  private lastAt = -Infinity;
  /** What the heading's line and each column last said, so only a column that changed is rebuilt. */
  private sub = '';
  private cols: string[] = [];
  /** The laurels as last seen (ids), so a new one sounds its fanfare; and whether all three were. */
  private seen: Set<string> | null = null;
  private grandSeen = 0;
  /** Called when the panel opens (the corner's cards make way for it). */
  onOpen: (() => void) | null = null;
  /** Called with the fanfare to play when a laurel is won ('laurel'), or an ambition achieved or all three ('triumph'). */
  onLaurel: ((cue: 'laurel' | 'triumph') => void) | null = null;

  constructor(root: HTMLElement) {
    const el = document.createElement('div');
    el.className = 'ambition-panel kit';
    el.hidden = true;
    el.innerHTML = '<button class="close" title="Close (Esc)" aria-label="Close">×</button><h2>Ambitions</h2><div class="sub"></div><div class="cols"></div>';
    root.appendChild(el);
    this.el = el;
    this.body = el.querySelector('.cols') as HTMLElement;
    (el.querySelector('.close') as HTMLElement).addEventListener('click', () => this.toggle(false));
  }

  get open(): boolean {
    return !this.el.hidden;
  }

  toggle(show = this.el.hidden): void {
    if (show === !this.el.hidden) return;
    this.el.hidden = !show;
    this.key = '';
    this.lastAt = -Infinity;
    if (show) this.onOpen?.();
  }

  /** The panel's text, for the smoke test. */
  get text(): string {
    return this.el.innerText;
  }

  /** Each frame: listen for new laurels, and redraw the panel (at most twice a second) while it is open. */
  update(s: SimState, time: number): void {
    const a = s.ambition;
    if (!this.seen) {
      this.seen = new Set(a.reached.map((l) => l.id));
      this.grandSeen = a.grand;
    } else if (a.reached.length !== this.seen.size || a.grand !== this.grandSeen) {
      let cue: 'laurel' | 'triumph' | null = null;
      const views = ambitionView(s);
      for (const l of a.reached) {
        if (this.seen.has(l.id)) continue;
        this.seen.add(l.id);
        if (l.quiet) continue;
        cue ??= 'laurel';
        if (views.some((v) => v.achieved === l.tick && v.milestones.some((m) => m.id === l.id))) cue = 'triumph';
      }
      if (a.grand !== this.grandSeen && !a.grandQuiet) cue = 'triumph';
      this.grandSeen = a.grand;
      // (A town opened anew: start again from what it holds.)
      if (a.reached.length < this.seen.size) this.seen = new Set(a.reached.map((l) => l.id));
      if (cue) this.onLaurel?.(cue);
    }
    if (this.el.hidden || time - this.lastAt < 0.5) return;
    this.lastAt = time;
    // (Slice 40: on a new day or a new laurel only, and only what changed. It was rebuilt twice a second whenever money or
    // people moved, about 6 ms each time.)
    const key = `${Math.floor(s.tick / TICKS_PER_DAY)}:${a.reached.length}:${a.grand}`;
    if (key === this.key) return;
    this.key = key;
    const views = ambitionView(s);
    const sub = `${laurelCount(s)} of ${MILESTONE_COUNT} laurels. All three count from the founding, and whatever you build or do counts toward one of them. ${a.grand ? 'All three achieved: play on as long as you like.' : 'An ambition achieved, play goes on.'}`;
    if (sub !== this.sub) {
      this.sub = sub;
      (this.el.querySelector('.sub') as HTMLElement).textContent = sub;
    }
    AMBITIONS.forEach((_, i) => {
      const html = columnHtml(views[i]);
      if (html === this.cols[i]) return;
      this.cols[i] = html;
      const old = this.body.children[i] as HTMLElement | undefined;
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      const fresh = tmp.firstElementChild as HTMLElement;
      if (old) this.body.replaceChild(fresh, old);
      else this.body.appendChild(fresh);
    });
  }
}
