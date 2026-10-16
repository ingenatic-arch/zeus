/**
 * The scroll button in the corner and its card: save the town now, see the
 * two saves (the one made by hand and the autosave) and open either, or
 * start again on an empty coast. A small note by the corner says when the
 * town was saved. Where the browser keeps no storage for the page, the card
 * says so and the game plays on.
 */
import { ago, type Saves, type Slot, type SlotInfo } from '../game/saves';

export interface SaveHost {
  saves: Saves;
  /** Save now to a slot: '' when saved, or why not. */
  save(slot: Slot): string;
  /** Open a slot's save (reloads the page). */
  load(slot: Slot): void;
  /** Start again on an empty coast (reloads the page). */
  fresh(): void;
  /** Built anything since the last save? */
  unsaved(): boolean;
  /** Whether the game is saving itself yet (and whether this is a prepared town, which waits for a save by hand). */
  autosave(): { on: boolean; problem: string; demo: boolean };
}

const SCROLL_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4.5h10.2a2.3 2.3 0 0 1 2.3 2.3v10.4a2.3 2.3 0 0 1-2.3 2.3H7.3" fill="#f6e6c0" stroke="#7a5c3c" stroke-width="1.5" stroke-linejoin="round"/><path d="M6.5 4.5a2 2 0 0 0-2 2v1.4h4V6.5a2 2 0 0 0-2-2zM7.3 19.5a2 2 0 0 0 2-2v-1.3H5.2v1.3a2 2 0 0 0 2.1 2z" fill="#e3c88e" stroke="#7a5c3c" stroke-width="1.5" stroke-linejoin="round"/><path d="M11 9h5M11 12h5M11 15h3.4" stroke="#a9773f" stroke-width="1.4" stroke-linecap="round"/></svg>';

const NAMES: Record<Slot, string> = { manual: 'Saved by you', auto: 'Saved by itself' };

export class SaveMenu {
  private card: HTMLElement;
  private note: HTMLElement;
  private noteTimer = 0;
  private confirm: Slot | null = null;

  constructor(
    root: HTMLElement,
    corner: HTMLElement,
    private host: SaveHost,
  ) {
    const btn = document.createElement('button');
    btn.className = 'btn saves-btn';
    btn.title = 'Your town: save it, or open a save (Ctrl+S saves)';
    btn.setAttribute('aria-label', 'Saves');
    btn.innerHTML = SCROLL_ICON;
    corner.insertBefore(btn, corner.firstChild);
    btn.addEventListener('click', () => this.toggle());

    const card = document.createElement('div');
    card.className = 'saves';
    card.hidden = true;
    root.appendChild(card);
    this.card = card;
    card.addEventListener('click', (e) => this.clicked(e));

    const note = document.createElement('div');
    note.className = 'save-note';
    note.hidden = true;
    root.appendChild(note);
    this.note = note;
  }

  get open(): boolean {
    return !this.card.hidden;
  }

  /** Called when the card opens. */
  onOpen: () => void = () => {};

  toggle(show = this.card.hidden): void {
    this.card.hidden = !show;
    this.confirm = null;
    if (show) this.onOpen();
    if (show) this.render(this.problem ? `Not saved last time: ${this.problem}` : '');
  }

  /** A note by the corner for a few seconds: "Saved · June, 748 BC". */
  flash(text: string, bad = false): void {
    this.note.textContent = text;
    this.note.classList.toggle('bad', bad);
    this.note.hidden = false;
    this.note.classList.remove('gone');
    clearTimeout(this.noteTimer);
    this.noteTimer = window.setTimeout(() => {
      this.note.classList.add('gone');
      this.noteTimer = window.setTimeout(() => (this.note.hidden = true), 900);
      // (Long enough to read: a welcome back that says what changed since the town was saved runs to a few sentences.)
    }, Math.max(bad ? 6000 : 2600, text.length * 55));
  }

  /** Save by hand (the button or Ctrl+S). */
  saveNow(): void {
    const why = this.host.save('manual');
    this.problem = why;
    if (why) this.flash(why, true);
    if (this.open) this.render(why ? `Not saved: ${why}` : 'Saved.');
  }

  /** Why the last save by hand failed ('' if it didn't), shown again when the card opens. */
  private problem = '';

  private clicked(e: MouseEvent): void {
    const t = (e.target as HTMLElement).closest('button');
    if (!t) return;
    const act = t.dataset.act;
    if (act === 'close') return this.toggle(false);
    if (act === 'save') return this.saveNow();
    if (act === 'fresh') {
      if (this.host.unsaved() && t.dataset.sure !== '1') {
        t.dataset.sure = '1';
        t.textContent = 'Click again to start afresh (this town is kept in the autosave)';
        return;
      }
      return this.host.fresh();
    }
    if (act === 'load') {
      const slot = t.dataset.slot as Slot;
      // Opening a save replaces the town on screen: say so once, if it has changes not saved.
      if (this.host.unsaved() && this.confirm !== slot) {
        this.confirm = slot;
        return this.render('');
      }
      this.host.load(slot);
    }
  }

  private render(said: string): void {
    const { saves } = this.host;
    if (!saves.available) {
      this.card.innerHTML = `
        <button class="close" data-act="close" aria-label="Close">×</button>
        <h2>Your town</h2>
        <p class="none">Saving isn’t available in this window: the browser keeps nothing for this page here (site data may be turned off for it). The town plays on as usual; it just can’t be kept when you leave.</p>`;
      return;
    }
    const auto = this.host.autosave();
    const now = Date.now();
    const row = (slot: Slot, info: SlotInfo): string => {
      const name = NAMES[slot];
      if (!info) return `<li><div><b>${name}</b><span class="what">Nothing yet</span></div></li>`;
      if (!info.label) return `<li><div><b>${name}</b><span class="what bad">${esc(info.why)}: it can’t be opened</span></div></li>`;
      const l = info.label;
      const sure = this.confirm === slot;
      return `<li><div><b>${name}</b><span class="what">${esc(l.date)} · ${l.people.toLocaleString('en-GB')} people · ${l.homes} homes · ${l.money.toLocaleString('en-GB')} dr</span><span class="when">${info.savedAt ? ago(info.savedAt, now) : ''}</span></div>
        <button class="pill${sure ? ' sure' : ''}" data-act="load" data-slot="${slot}">${sure ? 'Open it: this town is replaced' : 'Open'}</button></li>`;
    };
    const autoText = auto.on
      ? 'The game saves itself every three months of game time, and when you leave the page.'
      : auto.demo
        ? 'This is a prepared town, so it doesn’t save itself and your autosave stays as it was. Save it now to keep it; after that it saves itself every three months too.'
        : 'The game will save itself every three months once you’ve built something.';
    this.card.innerHTML = `
      <button class="close" data-act="close" aria-label="Close">×</button>
      <h2>Your town</h2>
      <button class="wide" data-act="save">Save now <kbd>Ctrl+S</kbd></button>
      <p class="said">${esc(said)}</p>
      <ul class="slots">${row('manual', saves.info('manual'))}${row('auto', saves.info('auto'))}</ul>
      <p class="auto">${autoText} Saves stay in this browser on this computer.</p>
      ${auto.problem ? `<p class="said bad">The last time it tried, it couldn’t save by itself: ${esc(auto.problem)}</p>` : ''}
      <button class="link" data-act="fresh">Start again on an empty coast</button>`;
  }
}

const esc = (t: string): string => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
