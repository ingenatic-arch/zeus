/**
 * The army chip under the top bar (slice 23): a helmet and the number of men
 * ("32 soldiers · 2 companies"), shown while the city has soldiers. Clicking
 * it opens the side panel's Army tab.
 */
const HELMET =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.4 13.4V8c0-2.8 2-4.8 4.6-4.8s4.6 2 4.6 4.8v5.4h-2.2v-3h-1.2V8.2H6.8v2.2H5.6v3z" fill="#c8963e" stroke="#5a3a1a" stroke-width=".9" stroke-linejoin="round"/><path d="M4 4.2C5 2.2 6.6 1.4 8 1.4s3 .8 4 2.8" stroke="#9c2a20" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>';

export class ArmyChip {
  readonly el: HTMLButtonElement;
  private key = '';

  constructor(parent: HTMLElement, open: () => void) {
    const el = document.createElement('button');
    el.className = 'army-chip';
    el.hidden = true;
    el.innerHTML = `${HELMET}<span></span>`;
    el.title = 'The army: click for the Military tab';
    el.addEventListener('click', open);
    parent.prepend(el);
    this.el = el;
  }

  /** Show the city's strength (no men: hidden). */
  show(men: number, companies: number, marching: number): void {
    const text = men > 0 ? `${men} ${men === 1 ? 'soldier' : 'soldiers'} · ${companies} ${companies === 1 ? 'company' : 'companies'}${marching ? ` · ${marching} out` : ''}` : '';
    if (text === this.key) return;
    this.key = text;
    this.el.hidden = !text;
    (this.el.querySelector('span') as HTMLElement).textContent = text;
  }
}
