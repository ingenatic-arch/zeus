/**
 * The shortfall lines under the top bar: what the town as a whole is short
 * of (bread, workers, money), in plain words, readable without hovering. A line
 * shows once the shortfall has held for a few days of game time and goes
 * once it has been gone for a few, so a family moving in or out doesn't make
 * it flicker. Clicking a line goes to the place it names.
 */
import { TICKS_PER_DAY } from '../sim/clock';
import type { TownLine } from '../sim/status';

/** Days a shortfall must hold before its line shows, and be gone before it goes. */
const SETTLE_DAYS = 3;

const ICONS: Record<TownLine['need'], string> = {
  food: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 15V5" stroke="#a06f1c" stroke-width="1.3" stroke-linecap="round"/><ellipse cx="8" cy="3.6" rx="1.5" ry="2.4" fill="#d9a441"/><ellipse cx="5.6" cy="6.4" rx="1.3" ry="2.2" fill="#d9a441" transform="rotate(-30 5.6 6.4)"/><ellipse cx="10.4" cy="6.4" rx="1.3" ry="2.2" fill="#d9a441" transform="rotate(30 10.4 6.4)"/><ellipse cx="5.8" cy="9.8" rx="1.2" ry="2" fill="#d9a441" transform="rotate(-30 5.8 9.8)"/><ellipse cx="10.2" cy="9.8" rx="1.2" ry="2" fill="#d9a441" transform="rotate(30 10.2 9.8)"/></svg>',
  oil: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M7 1.8h2l-.2 2.1c2.4.6 3.6 2.6 3.6 4.9 0 2.4-1.5 4.3-3.1 5H6.7C5.1 13.1 3.6 11.2 3.6 8.8c0-2.3 1.2-4.3 3.6-4.9z" fill="#8aa83a" stroke="#3e4f12" stroke-width=".9" stroke-linejoin="round"/></svg>',
  fleece: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.6 9.8c-1.8-.3-2-2.7-.3-3.2-.4-1.9 1.6-2.9 2.9-2 .7-1.6 3-1.6 3.7 0 1.3-.9 3.3.1 2.9 2 1.7.5 1.5 2.9-.3 3.2.1 1.7-1.7 2.8-3.2 2-.8 1.2-2.5 1.2-3.3 0-1.5.8-3.3-.3-3.2-2z" fill="#eee2c0" stroke="#8a744a" stroke-width=".9" stroke-linejoin="round"/><path d="M7.7 3.2l.4 9.8" stroke="#4c5a8c" stroke-width="1.3" stroke-linecap="round"/></svg>',
  wine: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8.4 3.4c1.2-1.6 3.2-1.9 4.6-.9-1.1 1.5-2.7 1.9-4.6.9z" fill="#6a9a34"/><g fill="#7a2e80" stroke="#3e1240" stroke-width=".7"><circle cx="5" cy="6" r="1.6"/><circle cx="8" cy="6" r="1.6"/><circle cx="11" cy="6" r="1.6"/><circle cx="6.5" cy="8.6" r="1.6"/><circle cx="9.5" cy="8.6" r="1.6"/><circle cx="8" cy="11.2" r="1.6"/></g></svg>',
  workers:
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 14.4 9.6 8" stroke="#7a5c3c" stroke-width="2.2" stroke-linecap="round"/><path d="M8.2 2.2c2.6-.8 5.4.6 6 3.2l-2.6-.6-2.4 2.4-2.6-2.6z" fill="#7a5c3c"/></svg>',
  money:
    '<svg viewBox="0 0 16 16" aria-hidden="true"><ellipse cx="8" cy="11.6" rx="5.6" ry="2" fill="#a07a1e"/><ellipse cx="8" cy="10.4" rx="5.6" ry="2" fill="#d9b04a"/><ellipse cx="8" cy="7.6" rx="5.6" ry="2" fill="#a07a1e"/><ellipse cx="8" cy="6.4" rx="5.6" ry="2" fill="#e3c060"/><path d="M5.4 6.4h5.2" stroke="#8a6414" stroke-width=".9" stroke-linecap="round"/></svg>',
};

export class TownLines {
  readonly el: HTMLElement;
  /** The lines standing when the game opens show at once (a demo may open paused). */
  private first = true;
  private seen = new Map<TownLine['need'], { since: number; lastSeen: number; line: TownLine; el: HTMLButtonElement | null }>();

  constructor(
    parent: HTMLElement,
    private go: (line: TownLine) => void,
  ) {
    const el = document.createElement('div');
    el.className = 'townlines';
    parent.appendChild(el);
    this.el = el;
  }

  /** The lines as they stand now, at game tick `tick`. */
  update(lines: TownLine[], tick: number): void {
    const settle = SETTLE_DAYS * TICKS_PER_DAY;
    for (const l of lines) {
      const s = this.seen.get(l.need);
      if (s) {
        s.lastSeen = tick;
        s.line = l;
      } else this.seen.set(l.need, { since: this.first ? tick - settle : tick, lastSeen: tick, line: l, el: null });
    }
    this.first = false;
    for (const [need, s] of this.seen) {
      // A tick that went backwards (a save opened) starts over.
      if (tick < s.since) s.since = s.lastSeen = tick;
      const gone = tick - s.lastSeen > settle;
      const shown = tick - s.since >= settle && !gone;
      if (shown && !s.el) {
        const b = document.createElement('button');
        b.className = `townline ${need}`;
        b.innerHTML = `${ICONS[need]}<span></span>`;
        b.addEventListener('click', () => {
          const cur = this.seen.get(need);
          if (cur) this.go(cur.line);
        });
        this.el.appendChild(b);
        s.el = b;
      }
      if (s.el) {
        const span = s.el.querySelector('span') as HTMLElement;
        if (span.textContent !== s.line.text) span.textContent = s.line.text;
        s.el.title = 'Click to go there';
      }
      if (gone) {
        s.el?.remove();
        this.seen.delete(need);
      }
    }
  }

  /** The lines showing (for the smoke test). */
  get texts(): string[] {
    return [...this.el.querySelectorAll('.townline span')].map((e) => e.textContent ?? '');
  }
}
