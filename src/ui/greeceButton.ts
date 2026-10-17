/**
 * The "Greece" button at the end of the top bar's row, with its key: it opens
 * and closes the map of Greece. Kept apart from the top bar so the bar's own
 * layout is untouched.
 */
export class GreeceButton {
  readonly el: HTMLButtonElement;

  constructor(onClick: () => void) {
    const b = document.createElement('button');
    b.className = 'greece-btn';
    b.title = 'The map of Greece: Athens, Sparta, Corinth, Troy and their rulers (Tab)';
    b.setAttribute('aria-label', 'Open the map of Greece (Tab)');
    b.innerHTML =
      '<svg viewBox="0 0 20 16" aria-hidden="true"><path d="M1.5 3.2 7 1.4l6 2 5.5-1.8v11.2L13 14.6l-6-2-5.5 1.8z" class="sheet"/><path d="M7 1.4v11.2M13 3.4v11.2" class="fold"/><path d="M3.4 8.6c1.2-1.6 2.4-1 3.2-.2.9.9 2 .5 2.6-.6.7-1.2 2.2-1.4 3.2-.3" class="coast"/></svg><span class="txt">Greece</span><kbd>Tab</kbd>';
    b.addEventListener('click', () => {
      onClick();
      // Let go of the focus, so Tab and the game's keys work at once.
      b.blur();
    });
    const row = document.querySelector('.topbar .row');
    (row ?? document.body).appendChild(b);
    this.el = b;
  }

  /** Show whether the map is open. */
  set(open: boolean): void {
    this.el.classList.toggle('on', open);
    this.el.setAttribute('aria-label', open ? 'Back to your city (Tab)' : 'Open the map of Greece (Tab)');
    (this.el.querySelector('.txt') as HTMLElement).textContent = open ? 'City' : 'Greece';
  }
}
