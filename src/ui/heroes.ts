/**
 * Slice 59: the heroes in the panels.
 *
 * - A hall's sections in the building panel (its registry entry): its hero,
 *   what they are doing and what they can slay; while awaited, each demand
 *   with how far along it is; once come, their wish and how long it has gone
 *   unmet; the monsters on your land they can slay, each with a Send button
 *   (or why not); the order to ride with your next expedition; Odysseus'
 *   voyage; the places of legend they have made.
 * - A monster's panel's rows: each hero who can slay it, with a Send button
 *   (or why not), or what it would take to have one.
 * - The Hero's hall chooser: the card of the seven, each with their marks,
 *   what they slay, their demands met or not, a hall already raised greyed
 *   out. Choosing one puts the hall in hand for them.
 * - The placing tip's lines for a hall.
 *
 * It only reads the state; its buttons send commands.
 */
import './heroes.css';
import type { CoastMap } from '../map/bake';
import { HEROHALL_COST } from '../sim/build';
import { TICKS_PER_MONTH } from '../sim/clock';
import { demandsOf, hallRefusal, heroDoing, heroOf, isCome, LEAVE, LEGEND_COIN, placeName, RESTLESS, sailRefusal, sendRefusal, slayersOf, slaysWords, unmetFor, wishOf, type Champion } from '../sim/heroes';
import { beastName, type Beast } from '../sim/monsters';
import { HERO_IDS, HEROES, type HeroId } from '../sim/pantheon';
import type { Building, SimState } from '../sim/state';
import { HERO_COLOURS } from '../render/heroes';
import { esc, kbtn, kchip, ksec, ktoggle } from './kit';

const cap = (t: string): string => (t ? t[0].toUpperCase() + t.slice(1) : t);
const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const his = (h: HeroId): string => (h === 'atalanta' ? 'her' : 'his');
const him = (h: HeroId): string => (h === 'atalanta' ? 'her' : 'him');
const months = (t: number): string => {
  const m = Math.floor(t / TICKS_PER_MONTH);
  return m <= 0 ? 'less than a month' : m === 1 ? 'a month' : `${m} months`;
};

/** Each demand: a tick or a cross, what, how far along. */
function demandRows(s: SimState, h: HeroId): string {
  return `<ul class="hero-demands">${demandsOf(s, h)
    .map((d) => `<li class="${d.met ? 'met' : 'unmet'}"><span class="mark" aria-hidden="true">${d.met ? '✓' : '✗'}</span><b>${esc(d.what)}</b><span class="have">${esc(d.have)}</span></li>`)
    .join('')}</ul>`;
}

/** The monsters on the land a hero can slay, each with Send (or why not). */
function slayRows(s: SimState, c: Champion): string {
  const ms = s.legends.monsters.filter((m) => HEROES[c.hero].slays.includes(m.kind));
  if (!ms.length) return `<p class="k-why">No monster ${c.hero === 'atalanta' ? 'she' : 'he'} can slay is on your land now. ${esc(slaysWords(c.hero))}</p>`;
  return ms
    .map((m) => {
      const why = sendRefusal(s, c.hero, m.id);
      const going = c.foe === m.id && (c.state === 'hunting' || c.state === 'waiting' || c.state === 'fighting');
      return `<div class="hero-row"><span class="hero-what">${esc(cap(beastName(m.kind)))}<small>${esc(cap(placeName(m.kind, m.den)))}</small></span>${going ? kchip(c.state === 'fighting' ? 'Fighting it' : 'On the way', { tone: 'gold' }) : kbtn({ html: `Send ${esc(HEROES[c.hero].name)}`, act: 'hero', data: { do: 'slay', monster: m.id }, why, tone: 'red', small: true, tip: `Send ${HEROES[c.hero].name} to slay ${beastName(m.kind)}: ${c.hero === 'atalanta' ? 'she' : 'he'} walks to ${placeName(m.kind, m.den)} and fights it there` })}</div>`;
    })
    .join('');
}

/** A hall's sections (the building panel's registry entry). */
export function hallSections(s: SimState, map: CoastMap, b: Building): string {
  void map;
  const h = b.hero;
  if (!h) return '';
  const g = HEROES[h];
  const c = heroOf(s, h);
  const out: string[] = [];
  const doing = c ? heroDoing(s, c) : 'Awaited';
  out.push(ksec(`${g.name}, ${g.epithet}`, `<div class="hero-who" style="--hero:${HERO_COLOURS[h]}"><p class="k-why">${esc(doing)}</p><p>${esc(slaysWords(h))}</p></div>`, { icon: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="' + HERO_COLOURS[h] + '" stroke="#4a3216"/></svg>' }));
  if (!c || !isCome(c)) {
    const left = demandsOf(s, h).filter((d) => !d.met).length;
    out.push(ksec(`${cap(his(h))} demands`, `${demandRows(s, h)}<p class="k-why">${esc(left ? `Meet them all and word goes out to ${him(h)}: ${h === 'atalanta' ? 'she' : 'he'} comes within a month.` : c?.state === 'sent' ? 'All met: word has gone out.' : 'All met: word goes out tomorrow.')}</p>`));
    return out.join('');
  }
  // The wish.
  const w = wishOf(s, c);
  const unmet = unmetFor(s, c);
  const wishWhy = w.met ? 'Kept' : unmet >= RESTLESS ? `Not kept for ${months(unmet)}: restless. ${cap(h === 'atalanta' ? 'she' : 'he')} leaves your city if it goes unkept ${months(LEAVE - unmet)} more` : `Not kept for ${months(unmet)}: restless after a year, gone after two`;
  out.push(ksec(`${cap(his(h))} wish`, `<p><b>${esc(w.words)}</b></p><p class="k-why${w.met ? '' : ' bad'}">${esc(wishWhy)}</p>`));
  // Monsters.
  out.push(ksec('Slay a monster', slayRows(s, c)));
  // Abroad.
  const away = c.state === 'abroad' || c.state === 'mustering';
  out.push(
    ksec(
      'Ride with your armies',
      `${ktoggle({ on: c.ride || away, act: 'hero', data: { do: 'ride', on: c.ride ? 0 : 1 }, html: esc(away ? `Away with your expedition` : c.ride ? `Rides with the next expedition` : `Stays home`), why: away ? `${g.name} is away with your expedition` : c.state === 'leaving' ? `${g.name} is leaving` : '', tip: `${g.name} rides with your next expedition and fights beside your men, worth ${h === 'heracles' ? 60 : 40} of them` })}`,
    ),
  );
  if (h === 'odysseus') {
    const why = sailRefusal(s, h);
    out.push(ksec('A season at sea', `<div class="k-row">${kbtn({ html: 'Let him sail', act: 'hero', data: { do: 'sail' }, why: c.state === 'sailing' ? 'Away at sea' : why, tip: 'He sails away for a season (three months), and is the gladder for it: his wish' })}</div>`));
  }
  if (c.slain.length) out.push(ksec('Places of legend', c.slain.map((k) => `<p>${esc(`Slew ${beastName(k)}: its lair is a place of legend, and its visitors leave ${LEGEND_COIN} dr a month`)}</p>`).join('')));
  return out.join('');
}

/** A monster's panel's rows: who can slay it, and Send (or why not). */
export function monsterHeroes(s: SimState, m: Beast): string {
  const rows = slayersOf(m.kind).map((h) => {
    const c = heroOf(s, h);
    const g = HEROES[h];
    if (!c) return `<div class="hero-row"><span class="hero-what">${esc(g.name)}<small>${esc(`Raise ${his(h)} hall, and meet ${his(h)} demands`)}</small></span></div>`;
    if (!isCome(c)) return `<div class="hero-row"><span class="hero-what">${esc(g.name)}<small>${esc(heroDoing(s, c))}</small></span></div>`;
    const going = c.foe === m.id && (c.state === 'hunting' || c.state === 'waiting' || c.state === 'fighting');
    return `<div class="hero-row"><span class="hero-what">${esc(g.name)}<small>${esc(heroDoing(s, c))}</small></span>${going ? '' : kbtn({ html: `Send ${esc(g.name)}`, act: 'hero', data: { do: 'slay', monster: m.id, hero: h }, why: sendRefusal(s, h, m.id), tone: 'red', small: true })}</div>`;
  });
  return ksec('Its slayers', rows.join(''));
}

/** The placing tip's lines for a hall. */
export function hallPlaceLines(s: SimState, h: HeroId, road: boolean): { lines: string[]; warn: string } {
  const g = HEROES[h];
  const lines = [`${g.name}’s hall: ${slaysWords(h)}`];
  const ds = demandsOf(s, h);
  lines.push(`${cap(his(h))} demands: ${ds.map((d) => `${d.what} ${d.met ? '✓' : `(${d.have})`}`).join(' · ')}`);
  lines.push(ds.every((d) => d.met) ? `All met: word goes out once it stands, and ${h === 'atalanta' ? 'she' : 'he'} comes within a month` : `Once it stands and they are all met, word goes out to ${him(h)}`);
  return { lines, warn: road ? '' : `No road beside it: ${g.name} needs a way in. Lay a road along one side first.` };
}

// ---------------------------------------------------------------------------- the chooser

export interface HeroChooserHooks {
  state: () => SimState;
  choose: (h: HeroId) => void;
  /** Closed with its ×: put the tool down. */
  dismiss: () => void;
}

/** The Hero's hall chooser: the seven, a hall already raised greyed out. */
export class HeroChooser {
  private readonly el: HTMLElement;
  private shown = false;

  constructor(
    root: HTMLElement,
    private readonly hooks: HeroChooserHooks,
  ) {
    const el = document.createElement('div');
    el.className = 'herochooser kit';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Choose the hero for a hall');
    el.hidden = true;
    el.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('.hc-close')) {
        this.close();
        this.hooks.dismiss();
        return;
      }
      const card = t.closest<HTMLButtonElement>('button.hc-card');
      if (!card || card.disabled) return;
      this.close();
      this.hooks.choose(card.dataset.hero as HeroId);
    });
    root.appendChild(el);
    this.el = el;
  }

  get open(): boolean {
    return this.shown;
  }

  show(): void {
    const s = this.hooks.state();
    const cards = HERO_IDS.map((h) => {
      const g = HEROES[h];
      const why = hallRefusal(s, h);
      const ds = demandsOf(s, h);
      const met = ds.filter((d) => d.met).length;
      const tip = why ? `${why}.` : `${g.name}’s hall: ${fmt(HEROHALL_COST)} dr. ${slaysWords(h)} ${cap(his(h))} demands: ${ds.map((d) => `${d.what} (${d.met ? 'met' : d.have})`).join('; ')}`;
      return `<button class="hc-card" data-hero="${h}" style="--hero:${HERO_COLOURS[h]}" ${why ? 'disabled aria-disabled="true"' : ''} title="${esc(tip)}">
        <span class="hc-name">${esc(g.name)}</span>
        <span class="hc-of">${esc(g.epithet)}</span>
        <span class="hc-slays">${esc(h === 'heracles' ? 'Slays any monster' : `Slays ${beastName(g.slays[0])}`)}</span>
        <span class="hc-demands">${ds.map((d) => `<i class="${d.met ? 'met' : ''}">${d.met ? '✓' : '✗'} ${esc(d.what)}</i>`).join('')}</span>
        <span class="hc-count">${why ? 'Hall raised' : `${met} of ${ds.length} met`}</span>
      </button>`;
    }).join('');
    this.el.innerHTML = `<div class="hc-head"><h2>A hall for which hero?</h2><button class="hc-close" aria-label="Close" title="Close (Esc)">×</button>
      <p>${fmt(HEROHALL_COST)} dr for a 4 × 4 hall beside a road. Raise it, meet the hero’s demands, and word goes out: they come within a month, live in it, and slay the monster you send them against. One to a hero.</p></div>
      <div class="hc-grid">${cards}</div>`;
    this.el.hidden = false;
    this.shown = true;
  }

  close(): void {
    this.el.hidden = true;
    this.shown = false;
  }
}
