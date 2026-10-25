/**
 * The welcome card on the bare link: a few warm lines on how to begin,
 * pointing at the control panel, a way to see a grown town (#town), and, when
 * this browser holds a saved town, a way back to it. It goes away when a
 * tool is picked or the player says so. (Slice 46: and a way to found a new
 * city on another kind of land, and its words for a city founded on one.)
 */
import { ago, type SlotInfo } from '../game/saves';

export interface WelcomeOptions {
  /** The newest readable save, to offer to carry on with it. */
  saved: SlotInfo;
  onContinue: () => void;
  /** Why a save asked for couldn't be opened ('' if none was). */
  problem: string;
  /** Saving isn't possible in this window. */
  noStorage: boolean;
  // Slice 46
  /** Open the new-game screen ("Found a new city"). */
  onNewGame?: () => void;
  /** A city founded on a land of its own: its name, a line on it, and the road in laid ('' if none). */
  land?: { name: string; line: string; road: string };
}

export class Welcome {
  private el: HTMLElement;
  private gone = false;
  private onGoneFns: Array<() => void> = [];

  constructor(root: HTMLElement, o: WelcomeOptions) {
    const el = document.createElement('div');
    el.className = 'welcome';
    const s = o.saved && o.saved.label ? o.saved : null;
    const carry = s?.label
      ? `<div class="carry"><div><b>Your town</b><span>${esc(s.label.date)} · ${s.label.people.toLocaleString('en-GB')} people${s.savedAt ? ` · saved ${ago(s.savedAt, Date.now())}` : ''}</span></div><button class="pill primary" data-act="continue">Carry on</button></div>`
      : '';
    const problem = o.problem ? `<p class="problem">${esc(o.problem)}</p>` : '';
    el.innerHTML = `
      ${problem}
      <h2>${o.land ? esc(o.land.name) : 'A coast to build on'}</h2>
      <p>${o.land ? `${esc(o.land.line)} Families will come and settle wherever a road reaches the edge of the map.` : 'A sheltered bay, a river coming down from the hills, and green land along its banks. Families will come and settle wherever a road reaches the edge of the map.'}</p>
      <ol>
        <li>${o.land?.road ? `<b>The road in</b> is laid, ${esc(o.land.road)}; lay more road from it <kbd>T</kbd>` : '<b>Lay a road</b> in from the edge of the map <kbd>T</kbd>'}</li>
        <li><b>Mark out housing</b> beside it <kbd>H</kbd>, and settlers walk in and pitch their tents</li>
        <li><b>Bring water</b> with a fountain by the road <kbd>B</kbd>, and the tents become huts</li>
      </ol>
      <p class="more">Then keep it going: workers are paid each month, so a <b>tax office</b> <kbd>Z</kbd> by the houses brings the taxes in; and buildings slowly gather fire risk and wear, so a <b>watch post</b> and an <b>architect’s office</b> (<kbd>Z</kbd> again) keep them safe.</p>
      <p class="more">Everything you can build is in the panel on the right, a tab for each kind of building; hover a picture to see what it does, and <kbd>?</kbd> lists the controls.</p>
      ${carry}
      <div class="actions">
        <button class="pill primary" data-act="start">Start building</button>
        <a class="pill" href="#town" title="A town of a few hundred people, a few years in">See a grown town</a>
        ${o.onNewGame ? '<button class="pill" data-act="newgame" title="Choose a kind of land, a size and a seed, and see it before you found the city">Found a new city</button>' : ''}
      </div>
      ${o.noStorage ? '<p class="small">Saving isn’t available in this window, so this town can’t be kept when you leave.</p>' : ''}`;
    root.appendChild(el);
    this.el = el;
    el.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
      if (!t) return;
      if (t.dataset.act === 'continue') o.onContinue();
      else if (t.dataset.act === 'newgame') o.onNewGame?.();
      else this.dismiss();
    });
  }

  get open(): boolean {
    return !this.gone;
  }

  onGone(f: () => void): void {
    this.onGoneFns.push(f);
  }

  dismiss(): void {
    if (this.gone) return;
    this.gone = true;
    this.el.classList.add('gone');
    setTimeout(() => this.el.remove(), 700);
    for (const f of this.onGoneFns) f();
  }
}

const esc = (t: string): string => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
