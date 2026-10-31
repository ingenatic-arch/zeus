/**
 * Slice 55: a monster's panel, opened by clicking the monster (or its lair).
 * Small, in the panels' kit: its name and who sent it and why, its health,
 * what it is doing, its lair, its last raid and what it has cost the city,
 * and what can be done about it (your soldiers wound it and drive it back;
 * only a hero can slay it). On the left, one at a time with the other panels.
 *
 * It only reads the state.
 */
import { GODS } from '../sim/pantheon';
import { beastDoing, beastName, denWords, himOf, itOf, itsOf, monsterOf, outFor, targetWords, type Beast } from '../sim/monsters';
import { TICKS_PER_DAY } from '../sim/clock';
import type { SimState } from '../sim/state';
import { morph } from './morph';
import { esc, kbar, khead, kitHtml, ksec } from './kit';

const cap = (t: string): string => (t ? t[0].toUpperCase() + t.slice(1) : t);

const ago = (s: SimState, tick: number): string => {
  const d = Math.floor((s.tick - tick) / TICKS_PER_DAY);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
};

/** The panel's HTML. */
export function monsterHtml(s: SimState, m: Beast): string {
  const god = GODS[m.god];
  const hp = Math.round((100 * m.hp) / m.full);
  const it = itOf(m.kind);
  const him = himOf(m.kind);
  const its = itsOf(m.kind);
  const head = khead({ title: cap(beastName(m.kind)), kicker: `Sent by ${god.name}`, sub: cap(m.why), cls: 'bhead' });
  const health = ksec(
    'Health',
    `${kbar({ value: m.hp, max: m.full, tone: hp < 40 ? 'danger' : 'strength', tick: 0.4, html: `${hp}%`, tip: 'Below the mark it breaks off and goes back to its lair to heal for a season' })}<p class="k-why">${esc(beastDoing(s, m))}</p>`,
  );
  const lines = [
    `${cap(its)} lair: ${denWords(m.den)}.`,
    `${cap(it)} comes out for ${targetWords(m.kind)}.`,
    m.state === 'raiding' ? `${outFor(s, m.last)}${m.wrecked.length ? `; ${it} has wrecked ${m.wrecked.join(', ')}` : ''}.` : m.last >= 0 ? `Last raid ${ago(s, m.last)}${m.lastWords ? `: ${m.lastWords}` : ''}.` : 'No raid yet.',
    m.raids ? `${m.raids} ${m.raids === 1 ? 'raid' : 'raids'}; ${m.dead ? `${m.dead} of your people dead` : 'nobody killed yet'}.` : '',
  ].filter((l) => l);
  const raids = ksec('Its raids', lines.map((l) => `<p class="k-why">${esc(l)}</p>`).join(''));
  const what = ksec(
    'What can be done',
    `<p>${esc(`Send a company: take its banner (on the Army tab, or click it), then click beside ${him}. A big company can wound ${him} badly, at the cost of men, and drive ${him} back to ${its} lair to heal for a season.`)}</p><p>${esc(`Win back ${god.name}’s favour and ${it} will be called home. Only a hero can slay ${him}.`)}</p>`,
  );
  return [head, health, raids, what].join('');
}

/** How often (seconds) the open panel is brought up to date. */
const REFRESH = 0.3;

export class MonsterPanel {
  private readonly el: HTMLElement;
  private readonly body: HTMLElement;
  private shownId = 0;
  private html = '';
  private last = -Infinity;
  /** Called when the panel opens (the other panels on the left make way). */
  onOpen: (() => void) | null = null;

  constructor(root: HTMLElement) {
    const el = document.createElement('div');
    el.className = 'household building kit monster';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.innerHTML = '<button class="close" data-tip="Close (Esc)" aria-label="Close">×</button><div class="body"></div>';
    root.appendChild(el);
    this.el = el;
    this.body = el.querySelector('.body') as HTMLElement;
    (el.querySelector('.close') as HTMLElement).addEventListener('click', () => this.show(0));
  }

  get id(): number {
    return this.shownId;
  }

  get open(): boolean {
    return this.shownId !== 0;
  }

  show(id: number): void {
    if (id !== this.shownId) {
      this.body.scrollTop = 0;
      this.html = '';
    }
    const opening = id !== 0 && this.shownId === 0;
    this.shownId = id;
    this.last = -Infinity;
    this.el.hidden = id === 0;
    if (opening) this.onOpen?.();
  }

  /** Refresh while open; closes itself when the monster has gone. */
  update(s: SimState, time: number): void {
    if (!this.shownId) return;
    const m = monsterOf(s, this.shownId);
    if (!m) {
      this.show(0);
      return;
    }
    if (time - this.last < REFRESH) return;
    this.last = time;
    const html = kitHtml(monsterHtml(s, m));
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
