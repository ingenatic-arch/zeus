/**
 * Slice 56: a god's panel, opened by clicking a god walking in the city. On
 * the left where a building's panel opens, one at a time with the others. A
 * small kit panel: the god's emblem drawn in their colour, their name and
 * what they are god of; their mood towards you (its word, a bar and the
 * weightiest reasons); why they came; what they are doing, where they go
 * next, what they have blessed and when they leave; and a button to follow
 * them with the camera.
 *
 * It only reads the state (moods through the groundwork's API).
 */
import type { CoastMap } from '../map/bake';
import { TICKS_PER_DAY } from '../sim/clock';
import { findBuilding } from '../sim/buildings';
import { doingWords, figureOf, nextWords, placeName, untilWords, type GodFigure } from '../sim/epiphany';
import { blessingOn, GODS, goddess, moodOfGod, moodWord, reasonsOf, type Emblem, type GodId } from '../sim/pantheon';
import type { SimState } from '../sim/state';
import { esc, kbar, kbtn, khead, kitHtml, ksec } from './kit';
import { morph } from './morph';
import './godpanel.css';

const cap = (t: string): string => (t ? t[0].toUpperCase() + t.slice(1) : t);
const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

/** Each emblem's shape, drawn in code (24 × 24), filled with the god's colour and inked. */
const EMBLEM_PATHS: Record<Emblem, string> = {
  thunderbolt: '<path d="M13.6 2 6 13.2h5.2L9.4 22 18 9.6h-5.4L15.2 2z" fill="C" stroke="K" stroke-width="1.1" stroke-linejoin="round"/>',
  peacock:
    '<path d="M12 21c-1.8-3-1.8-6 0-9 1.8 3 1.8 6 0 9z" fill="C" stroke="K" stroke-width="1"/><circle cx="12" cy="6.4" r="3.4" fill="C" stroke="K" stroke-width="1"/><circle cx="12" cy="6.4" r="1.4" fill="K"/><circle cx="5.4" cy="9.4" r="2.6" fill="C" stroke="K" stroke-width="1"/><circle cx="18.6" cy="9.4" r="2.6" fill="C" stroke="K" stroke-width="1"/><circle cx="5.4" cy="9.4" r="1" fill="K"/><circle cx="18.6" cy="9.4" r="1" fill="K"/>',
  trident: '<path d="M12 22V7M5.4 3v5.4c0 2.4 3 3.6 6.6 3.6s6.6-1.2 6.6-3.6V3M12 2.4v4.6" fill="none" stroke="K" stroke-width="3.4" stroke-linecap="round"/><path d="M12 22V7M5.4 3v5.4c0 2.4 3 3.6 6.6 3.6s6.6-1.2 6.6-3.6V3M12 2.4v4.6" fill="none" stroke="C" stroke-width="1.8" stroke-linecap="round"/>',
  sheaf: '<path d="M12 22V9M12 22 7 10M12 22l5-12M12 22 4.6 13M12 22l7.4-9" stroke="K" stroke-width="1.2"/><ellipse cx="12" cy="6" rx="2" ry="4" fill="C" stroke="K"/><ellipse cx="7" cy="7.4" rx="1.8" ry="3.6" fill="C" stroke="K" transform="rotate(-20 7 7.4)"/><ellipse cx="17" cy="7.4" rx="1.8" ry="3.6" fill="C" stroke="K" transform="rotate(20 17 7.4)"/><path d="M7.6 16.4h8.8" stroke="K" stroke-width="2.2"/>',
  owl: '<path d="M5 6.4 7.4 3l2.4 2.4h4.4L16.6 3 19 6.4v8.4c0 4-3.2 6.8-7 6.8s-7-2.8-7-6.8z" fill="C" stroke="K" stroke-width="1.1" stroke-linejoin="round"/><circle cx="9" cy="10" r="2.4" fill="#fff" stroke="K"/><circle cx="15" cy="10" r="2.4" fill="#fff" stroke="K"/><circle cx="9" cy="10" r="1" fill="K"/><circle cx="15" cy="10" r="1" fill="K"/><path d="m11 13 1 1.6 1-1.6z" fill="K"/>',
  lyre: '<path d="M6.6 3c-2 4-1.4 9 2 12h6.8c3.4-3 4-8 2-12" fill="none" stroke="K" stroke-width="3.2" stroke-linecap="round"/><path d="M6.6 3c-2 4-1.4 9 2 12h6.8c3.4-3 4-8 2-12" fill="none" stroke="C" stroke-width="1.6" stroke-linecap="round"/><path d="M7.6 6.4h8.8M9.6 6.4V15M12 6.4V15M14.4 6.4V15" stroke="K" stroke-width=".9"/><rect x="7.4" y="15" width="9.2" height="5.6" rx="2" fill="C" stroke="K"/>',
  bow: '<path d="M7 2.6c7.4 4 7.4 14.8 0 18.8" fill="none" stroke="K" stroke-width="3.2" stroke-linecap="round"/><path d="M7 2.6c7.4 4 7.4 14.8 0 18.8" fill="none" stroke="C" stroke-width="1.6" stroke-linecap="round"/><path d="M7 2.6v18.8M4 12h15" stroke="K" stroke-width="1"/><path d="m19 12-3-2v4z" fill="K"/><path d="M17.4 5.4a3 3 0 1 0 2.4 4.4 2.4 2.4 0 1 1-2.4-4.4z" fill="C" stroke="K" stroke-width=".8"/>',
  spear: '<path d="M4 20 18.6 5.4" stroke="K" stroke-width="2.4" stroke-linecap="round"/><path d="m16.6 2.6 5 0-0.2 5-3.4 1.4-2.8-2.8z" fill="C" stroke="K" stroke-linejoin="round"/><circle cx="8.6" cy="15.4" r="5.4" fill="C" stroke="K" stroke-width="1.1"/><circle cx="8.6" cy="15.4" r="1.6" fill="K"/>',
  dove: '<path d="M3 13c3-1 5-.6 7 1 1-4 4-8.4 9.6-9.4-1.6 3-1.4 6.2-3.6 8.6 2 .4 3.6 0 5-1-1 4-4.4 6.8-9 6.8-3.4 0-6.6-2.4-9-6z" fill="C" stroke="K" stroke-width="1.1" stroke-linejoin="round"/><circle cx="6.4" cy="13.2" r=".8" fill="K"/>',
  hammer: '<path d="M10.6 10.4 4 20" stroke="K" stroke-width="3.4" stroke-linecap="round"/><path d="M10.6 10.4 4 20" stroke="C" stroke-width="1.6" stroke-linecap="round"/><path d="m8.6 6.4 5.6-4 4.4 6.2-5.6 4z" fill="C" stroke="K" stroke-width="1.1" stroke-linejoin="round"/>',
  caduceus: '<path d="M12 22V3" stroke="K" stroke-width="2.2" stroke-linecap="round"/><path d="M12 5.4c-4 0-7-1.6-8.4-3 2 .4 5 .6 8.4 1.6 3.4-1 6.4-1.2 8.4-1.6-1.4 1.4-4.4 3-8.4 3z" fill="C" stroke="K" stroke-width=".9"/><path d="M8.6 8.4c4.6 2 4.6 3.6 0 5.6s-4.6 3.6 0 5.6M15.4 8.4c-4.6 2-4.6 3.6 0 5.6s4.6 3.6 0 5.6" fill="none" stroke="C" stroke-width="1.6"/>',
  vine: '<path d="M12 3c-2 3 2 5 0 8s2 5 0 8" fill="none" stroke="K" stroke-width="1.4"/><path d="M12 6c3-2 6-1 7 1-2 1.6-5 1.6-7-1zM12 11c-3-2-6-1-7 1 2 1.6 5 1.6 7-1z" fill="#5aa83a" stroke="K" stroke-width=".8"/><circle cx="14" cy="15" r="1.7" fill="C" stroke="K" stroke-width=".7"/><circle cx="16.6" cy="15.4" r="1.7" fill="C" stroke="K" stroke-width=".7"/><circle cx="15.2" cy="17.6" r="1.7" fill="C" stroke="K" stroke-width=".7"/><circle cx="17.8" cy="17.8" r="1.7" fill="C" stroke="K" stroke-width=".7"/><circle cx="16.4" cy="20" r="1.7" fill="C" stroke="K" stroke-width=".7"/>',
};

/** A god's emblem, drawn in their colour (an SVG). */
export function emblemIcon(g: GodId): string {
  const god = GODS[g];
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${EMBLEM_PATHS[god.emblem].replace(/"C"/g, `"${hex(god.colour)}"`).replace(/"K"/g, '"#3a2a18"')}</svg>`;
}

/** The whole panel's HTML. */
export function godHtml(s: SimState, map: CoastMap, f: GodFigure): string {
  const g = GODS[f.god];
  const head = khead({ title: g.name, kicker: `In your city · ${g.epithet}`, sub: `${goddess(f.god) ? 'Goddess' : 'God'} of ${g.of}`, pic: emblemIcon(f.god), cls: 'bhead' });
  const mood = moodOfGod(s, f.god);
  const reasons = reasonsOf(s, f.god).slice(0, 4);
  const moodBody = [
    `<p><b>${esc(cap(moodWord(mood)))}</b> towards your city (${mood > 0 ? '+' : ''}${Math.round(mood)})</p>`,
    kbar({ value: mood + 100, max: 200, tone: mood >= 0 ? 'good' : 'danger', tick: 100, tip: 'From furious to loving' }),
    reasons.length ? `<ul class="k-list">${reasons.map((r) => `<li>${r.worth > 0 ? '+' : ''}${Math.round(r.worth)} ${esc(r.why)}</li>`).join('')}</ul>` : '<p>Nothing remembered yet.</p>',
  ].join('');
  const lines: string[] = [];
  lines.push(`<p>${esc(cap(doingWords(s, f)))}.</p>`);
  const next = nextWords(s, f);
  if (next) lines.push(`<p>Next: ${esc(next)}.</p>`);
  const blessed = f.blessed.map((id) => findBuilding(s, id)).filter((b) => !!b);
  if (blessed.length) {
    lines.push(`<p>Blessed so far:</p><ul class="k-list">${blessed.map((b) => `<li>${esc(cap(placeName(map, b!)))}, until ${untilWords(blessingOn(s, b!.id)?.until ?? s.tick)}</li>`).join('')}</ul>`);
  }
  if (f.leaves >= 0 && f.state !== 'leaving') lines.push(`<p>Gone within ${Math.max(1, Math.ceil((f.leaves - s.tick) / TICKS_PER_DAY))} days.</p>`);
  return [
    head,
    ksec('Mood', moodBody, { icon: 'go' }),
    f.why === 'pose' ? '' : ksec(`Why ${goddess(f.god) ? 'she' : 'he'} came`, `<p>${esc(cap(f.words))}.</p>`),
    ksec('Now', lines.join('')),
    `<p class="own">${kbtn({ act: 'follow', icon: 'go', html: `Follow ${goddess(f.god) ? 'her' : 'him'}` })}</p>`,
  ].join('');
}

const REFRESH = 0.3;

export class GodPanel {
  private readonly el: HTMLElement;
  private readonly body: HTMLElement;
  private shownId = 0;
  private html = '';
  private last = -Infinity;
  /** Called when the panel opens (the other panels on the left make way). */
  onOpen: (() => void) | null = null;
  /** Follow the god with the camera (by figure id). */
  onFollow: ((id: number) => void) | null = null;

  constructor(root: HTMLElement) {
    const el = document.createElement('div');
    el.className = 'household building godpanel kit';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.innerHTML = '<button class="close" data-tip="Close (Esc)" aria-label="Close">×</button><div class="body"></div>';
    root.appendChild(el);
    this.el = el;
    this.body = el.querySelector('.body') as HTMLElement;
    (el.querySelector('.close') as HTMLElement).addEventListener('click', () => this.show(0));
    el.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest('button[data-act]') as HTMLButtonElement | null;
      if (t?.dataset.act === 'follow' && this.shownId) this.onFollow?.(this.shownId);
    });
  }

  /** The figure showing, or 0. */
  get id(): number {
    return this.shownId;
  }

  get open(): boolean {
    return this.shownId !== 0;
  }

  show(id: number): void {
    if (id !== this.shownId) this.html = '';
    const opening = id !== 0 && this.shownId === 0;
    this.shownId = id;
    this.last = -Infinity;
    this.el.hidden = id === 0;
    if (opening) this.onOpen?.();
  }

  /** Refresh while open; closes itself once the god has gone. */
  update(s: SimState, map: CoastMap, time: number): void {
    if (!this.shownId) return;
    const f = figureOf(s, this.shownId);
    if (!f) return this.show(0);
    if (time - this.last < REFRESH) return;
    this.last = time;
    const html = kitHtml(godHtml(s, map, f));
    if (html !== this.html) {
      this.html = html;
      morph(this.body, html);
    }
  }

  /** The panel's text (for the smoke test). */
  get text(): string {
    return this.el.hidden ? '' : (this.body.innerText ?? '');
  }
}
