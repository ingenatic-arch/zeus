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
import { atWar, doingWords, figureOf, nextWords, placeName, untilWords, type GodFigure } from '../sim/epiphany';
import { duelLine, warDoing, warHelp, warWhy } from '../sim/godwar';
import { blessingOn, GODS, goddess, moodOfGod, moodWord, reasonsOf, type GodId } from '../sim/pantheon';
import type { SimState } from '../sim/state';
import { esc, kbar, kbtn, khead, kitHtml, ksec } from './kit';
import { morph } from './morph';
import './godpanel.css';
import { emblemSvg } from './emblems';
// Merge of slice 60 with slice 59: heroes sent against an enemy god, from the god's panel.
import { faceRefusal, heroDoing, isCome } from '../sim/heroes';
import { HEROES, type HeroId } from '../sim/pantheon';
import { marchByFigure } from '../sim/godwar';
import type { Command } from '../sim/commands';

const cap = (t: string): string => (t ? t[0].toUpperCase() + t.slice(1) : t);

/** A god's emblem, drawn in their colour (an SVG). (Merge of slice 53: the one drawing of the twelve's emblems, emblems.ts.) */
export const emblemIcon = (g: GodId): string => emblemSvg(g, 'gem');

/** The whole panel's HTML. */
export function godHtml(s: SimState, map: CoastMap, f: GodFigure): string {
  const g = GODS[f.god];
  const head = khead({ title: g.name, kicker: `${f.why === 'foe' ? 'Against your city' : f.why === 'champion' ? 'Fighting for your city' : 'In your city'} · ${g.epithet}`, sub: `${goddess(f.god) ? 'Goddess' : 'God'} of ${g.of}`, pic: emblemIcon(f.god), cls: 'bhead' });
  const mood = moodOfGod(s, f.god);
  const reasons = reasonsOf(s, f.god).slice(0, 4);
  const moodBody = [
    `<p><b>${esc(cap(moodWord(mood)))}</b> towards your city (${mood > 0 ? '+' : ''}${Math.round(mood)})</p>`,
    kbar({ value: mood + 100, max: 200, tone: mood >= 0 ? 'good' : 'danger', tick: 100, tip: 'From furious to loving' }),
    reasons.length ? `<ul class="k-list">${reasons.map((r) => `<li>${r.worth > 0 ? '+' : ''}${Math.round(r.worth)} ${esc(r.why)}</li>`).join('')}</ul>` : '<p>Nothing remembered yet.</p>',
  ].join('');
  // Slice 60: a god at war: whom they fight and why, the duel if any, and what can be done.
  if (atWar(f)) {
    const d = s.gods.war.duel;
    const now = [`<p>${esc(cap(warDoing(s, f)))}.</p>`];
    if (d && (d.a === f.id || d.b === f.id)) now.push(`<p>${esc(duelLine(s, d))}.</p>`);
    const help = warHelp(s, f);
    if (help) now.push(`<p>${esc(help)}.</p>`);
    return [
      head,
      ksec('Mood', moodBody, { icon: 'go' }),
      ksec(f.why === 'champion' ? `Why ${goddess(f.god) ? 'she' : 'he'} fights for you` : `Why ${goddess(f.god) ? 'she' : 'he'} fights against you`, `<p>${esc(cap(warWhy(s, f)))}.</p>`),
      ksec('Now', now.join('')),
      heroRows(s, f),
      `<p class="own">${kbtn({ act: 'follow', icon: 'go', html: `Follow ${goddess(f.god) ? 'her' : 'him'}` })}</p>`,
    ].join('');
  }
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

/** Merge of slice 60 with slice 59: an enemy god's panel: each hero come to your city, with a button to send them to hold the god off (or why not); '' with none come. */
function heroRows(s: SimState, f: GodFigure): string {
  const m = f.why === 'foe' && f.state !== 'leaving' ? marchByFigure(s, f.id) : undefined;
  if (!m) return '';
  const come = s.legends.heroes.filter((c) => isCome(c));
  if (!come.length) return '';
  const him = goddess(f.god) ? 'her' : 'him';
  const rows = come.map((c) => {
    const h = HEROES[c.hero];
    const going = m.hero === c.hero;
    const why = going ? '' : faceRefusal(s, c.hero, f.id);
    return `<div class="hero-row"><span class="hero-what">${esc(h.name)}<small>${esc(heroDoing(s, c))}</small></span>${going ? '' : kbtn({ act: 'hero', data: { hero: c.hero }, html: `Send ${esc(h.name)}`, why, small: true, tone: 'red', tip: `Send ${h.name} to hold ${GODS[f.god].name} off: while they fight, ${goddess(f.god) ? 'she' : 'he'} strikes none of your soldiers and sets nothing alight. No hero can beat a god: ${c.hero === 'atalanta' ? 'she' : 'he'} withdraws wounded after a few days, unless the band breaks first` })}</div>`;
  });
  return ksec(`A hero to hold ${him}`, rows.join(''));
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
  /** Merge of slice 60: send a command (a hero sent against the god). */
  onSend: ((c: Command) => void) | null = null;

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
      // (Merge of slice 60: a hero sent against this god.)
      if (t?.dataset.act === 'hero' && t.dataset.hero && this.shownId && !t.disabled) {
        this.onSend?.({ type: 'hero', hero: t.dataset.hero as HeroId, act: 'face', figure: this.shownId });
        this.last = -Infinity;
      }
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
