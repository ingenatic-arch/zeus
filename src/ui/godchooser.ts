/**
 * Slice 54: the Sanctuary button's chooser. The Mythology tab has one
 * Sanctuary button; it opens this card of the twelve, each with their
 * emblem in their colour, their name, what they are god of and what their
 * sanctuary is consecrated with. A god whose sanctuary the city has already
 * is greyed out, with the reason. Choosing one puts the sanctuary tool in
 * hand for that god (the tool's tip says whose it places). Read-only: the
 * placing is the tool's command.
 */
import './sanctuary.css';
import { SANCTUARY_COST } from '../sim/build';
import { WARE_NAMES } from '../sim/foods';
import { sacredMeasure } from '../sim/monuments';
import { GOD_IDS, GODS, type GodId } from '../sim/pantheon';
import { sanctuaryRefusal } from '../sim/sanctuaries';
import type { SimState } from '../sim/state';
// (Merge of slice 53: the twelve's emblems drawn once, in emblems.ts, the same on Olympus, here and on a god's panel.)
import { emblemSvg as godEmblem, godColour as godColourCss } from './emblems';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');

/** "200 measures of wheat", "8 horses". */
export function sacredWords(god: GodId): string {
  const w = GODS[god].sacred;
  const n = sacredMeasure(w);
  const name = WARE_NAMES[w];
  return name === 'horses' || name === 'armour' ? `${fmt(n)} ${name === 'armour' ? 'sets of armour' : 'horses'}` : `${fmt(n)} ${name === 'oil' ? 'jars of oil' : name === 'wine' ? 'amphorae of wine' : name === 'fleece' ? 'bales of fleece' : `measures of ${name}`}`;
}

export interface GodChooserHooks {
  /** The town now. */
  state: () => SimState;
  /** Put the sanctuary tool in hand for this god. */
  choose: (god: GodId) => void;
}

export class GodChooser {
  private readonly el: HTMLElement;
  private shown = false;

  constructor(
    root: HTMLElement,
    private readonly hooks: GodChooserHooks,
  ) {
    const el = document.createElement('div');
    el.className = 'godchooser kit';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Choose the god for a sanctuary');
    el.hidden = true;
    el.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('.gc-close')) return this.close();
      const card = t.closest<HTMLButtonElement>('button.gc-card');
      if (!card || card.disabled) return;
      const god = card.dataset.god as GodId;
      this.close();
      this.hooks.choose(god);
    });
    root.appendChild(el);
    this.el = el;
  }

  get open(): boolean {
    return this.shown;
  }

  /** Open it (again: it closes), the gods already honoured with a sanctuary greyed out. */
  toggle(): void {
    if (this.shown) this.close();
    else this.show();
  }

  show(): void {
    const s = this.hooks.state();
    const cards = GOD_IDS.map((god) => {
      const g = GODS[god];
      const why = sanctuaryRefusal(s, god);
      const tip = why ? `${why}.` : `A sanctuary to ${g.name}, ${g.epithet}: ${fmt(SANCTUARY_COST)} dr to mark out; its last stage is consecrated with ${sacredWords(god)}`;
      return `<button class="gc-card" data-god="${god}" style="--god:${godColourCss(god)}" ${why ? 'disabled aria-disabled="true"' : ''} title="${esc(tip)}">
        <span class="gc-em">${godEmblem(god)}</span>
        <span class="gc-name">${esc(g.name)}</span>
        <span class="gc-of">${esc(g.of)}</span>
        <span class="gc-sacred">${why ? esc(why.replace(/^Your city has its sanctuary to \w+ already: /, '').replace(/\. One to a god$/, '').replace(/^./, (c) => c.toUpperCase())) : `with ${esc(sacredWords(god))}`}</span>
      </button>`;
    }).join('');
    this.el.innerHTML = `<div class="gc-head"><h2>A sanctuary to which god?</h2><button class="gc-close" aria-label="Close" title="Close (Esc)">×</button>
      <p>${fmt(SANCTUARY_COST)} dr to mark out a 5 × 5 precinct beside a road. Ox carts bring its marble and timber from the storehouses, and the masons’ builders raise it in three stages; the last needs copper, cast into bronze by an armoury’s smiths, and the god’s sacred good. One to a god.</p></div>
      <div class="gc-grid">${cards}</div>`;
    this.el.hidden = false;
    this.shown = true;
  }

  close(): void {
    this.el.hidden = true;
    this.shown = false;
  }
}
