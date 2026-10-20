/**
 * The debts chip under the top bar (slice 27): while a loan stands either
 * way, the next date due ("You owe Corinth 2,240 dr · 12 June", "Sparta owes
 * you 2,300 dr · 4 March"), "+1" for each more, red while one is overdue.
 * Clicking it opens the Administration tab (the old Money tab), where every loan is listed.
 */
const SCALES =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2v11.4M4.6 13.6h6.8M3 4.4h10" stroke="#5a3a1a" stroke-width="1.2" stroke-linecap="round" fill="none"/><path d="M3 4.6 1.4 8.4h3.2zM13 4.6l-1.6 3.8h3.2z" fill="none" stroke="#5a3a1a" stroke-width=".9" stroke-linejoin="round"/><path d="M1.2 8.4q1.8 1.8 3.6 0M11.2 8.4q1.8 1.8 3.6 0" fill="#e8c04a" stroke="#8a6414" stroke-width=".8"/><circle cx="8" cy="2.4" r="1.1" fill="#e8c04a" stroke="#8a6414" stroke-width=".7"/></svg>';

export class DebtsChip {
  readonly el: HTMLButtonElement;
  private key = '';

  constructor(parent: HTMLElement, open: () => void) {
    const el = document.createElement('button');
    el.className = 'debts-chip';
    el.hidden = true;
    el.innerHTML = `${SCALES}<span></span>`;
    el.title = 'Loans: the next date due either way. Click for the Administration tab';
    el.addEventListener('click', open);
    parent.prepend(el);
    this.el = el;
  }

  /** Show the next date due (null: no loans standing, hidden). */
  show(d: { line: string; more: number; overdue: boolean } | null): void {
    const text = d ? `${d.line}${d.more ? ` · +${d.more}` : ''}` : '';
    const key = `${text}|${d?.overdue ? 1 : 0}`;
    if (key === this.key) return;
    this.key = key;
    this.el.hidden = !text;
    this.el.classList.toggle('overdue', !!d?.overdue);
    (this.el.querySelector('span') as HTMLElement).textContent = text;
  }
}
