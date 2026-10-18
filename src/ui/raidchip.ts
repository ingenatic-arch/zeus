/**
 * The raid chip under the top bar: a war band on its way, counting the days
 * to the edge of your land ("Sparta’s raiders · 12 days"), then "Raiders in
 * the city". Clicking it opens the ruler’s page on the map of Greece.
 */
const SPEARS =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.4 13.6 12.6 3.4M13.6 13.6 3.4 3.4" stroke="#5a3a22" stroke-width="1.3" stroke-linecap="round"/><path d="M12.2 1.4l2.4 2.4-2.8.6zM3.8 1.4 1.4 3.8l2.8.6z" fill="#cfd2d4" stroke="#4a4a4a" stroke-width=".5"/><circle cx="8" cy="10.2" r="3.6" fill="#b8322a" stroke="#5e1410" stroke-width=".9"/><circle cx="8" cy="10.2" r="1.1" fill="#e8c46a"/></svg>';

export class RaidChip {
  readonly el: HTMLButtonElement;
  private key = '';
  private city = '';

  constructor(parent: HTMLElement, go: (city: string) => void) {
    const el = document.createElement('button');
    el.className = 'raid-chip';
    el.hidden = true;
    el.innerHTML = `${SPEARS}<span></span>`;
    el.addEventListener('click', () => {
      if (this.city) go(this.city);
    });
    parent.prepend(el);
    this.el = el;
  }

  /** The chip as it stands now (null: no band out). */
  show(now: { chip: string; city: string } | null): void {
    const key = now ? `${now.city}:${now.chip}` : '';
    if (key === this.key) return;
    this.key = key;
    this.el.hidden = !now;
    if (!now) return;
    this.city = now.city;
    (this.el.querySelector('span') as HTMLElement).textContent = now.chip;
    this.el.classList.toggle('in', now.chip.startsWith('Raiders in'));
    this.el.title = 'Click for the ruler’s page on the map of Greece';
  }
}
