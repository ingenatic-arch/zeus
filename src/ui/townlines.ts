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
  trader: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.2 9.4c0-1.6 1.2-2.6 2.8-2.6h4.6c1.6 0 2.6.8 3 2l1.4-1.2.6.8-1.6 1.6v2.4h-1.2l-.4-1.6H5.2l-.4 1.6H3.6V10.6c-.8-.2-1.4-.6-1.4-1.2z" fill="#8e8478" stroke="#4a4038" stroke-width=".7" stroke-linejoin="round"/><path d="M14 8.2l.6-2.4.7 2.2" fill="#8e8478" stroke="#4a4038" stroke-width=".6"/><rect x="5" y="4.4" width="4.6" height="3" rx=".8" fill="#d2902c" stroke="#6a4416" stroke-width=".6"/></svg>',
  ship: '<svg viewBox="0 0 20 16" aria-hidden="true"><path d="M9.6 1.2v9.4" stroke="#6e4e30" stroke-width="1.3" fill="none"/><path d="M10.4 2.2c3 1.4 4.6 4 4.8 7.4h-4.8z" fill="#f7edd6" stroke="#c0462e" stroke-width="1.1" stroke-linejoin="round"/><path d="M1.4 10.8h17.2c-.8 2.6-2.8 4-5.4 4H6.4c-2.4 0-4.2-1.4-5-4z" fill="#7a4a2c"/></svg>',
  fire: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 15c-3 0-4.8-2-4.8-4.6 0-2.4 1.6-3.6 2.4-5.4.4 1.2 1 2 1.8 2.4C7.6 4.8 8.6 2.6 10.4 1c-.2 2.2.6 3.4 1.6 4.8.9 1.2 1.2 2.4 1.2 3.8C13.2 12.6 11.2 15 8 15z" fill="#e2531e" stroke="#8a2a10" stroke-width=".8" stroke-linejoin="round"/><path d="M8 14c-1.4 0-2.2-.9-2.2-2.1 0-1.3.9-2 1.4-3 .6.9 1.4 1.2 1.7 2.1.5-.3.8-.8.9-1.4.6.8.6 1.5.6 2.1C10.4 13 9.4 14 8 14z" fill="#f6c13a"/></svg>',
  wear: '<svg viewBox="0 0 16 16" aria-hidden="true"><g fill="#c9b08a" stroke="#7a6446" stroke-width=".7"><rect x="1.5" y="2" width="6" height="3.6"/><rect x="8.5" y="2" width="6" height="3.6"/><rect x="1.5" y="10.4" width="6" height="3.6"/><rect x="8.5" y="10.4" width="6" height="3.6"/><rect x="5" y="6.2" width="6" height="3.6"/><rect x="1.5" y="6.2" width="3" height="3.6"/><rect x="11.5" y="6.2" width="3" height="3.6"/></g><path d="M8.6 1.5 7.4 5.6l1.6 2.2-1.8 2.8.8 3.9" fill="none" stroke="#3a2a22" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  rubble: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 14.5h14" stroke="#7a6446" stroke-width="1.2" stroke-linecap="round"/><path d="M2 14.5l1.5-4 3 1 1.5-3.5 3 2 2.5-1.5 1 6z" fill="#8f8a84" stroke="#4a4440" stroke-width=".8" stroke-linejoin="round"/><path d="M4 9.5l6-5.5" stroke="#2e2622" stroke-width="1.4" stroke-linecap="round"/><path d="M9 12l4-6" stroke="#2e2622" stroke-width="1.2" stroke-linecap="round"/></svg>',
  food: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 15V5" stroke="#a06f1c" stroke-width="1.3" stroke-linecap="round"/><ellipse cx="8" cy="3.6" rx="1.5" ry="2.4" fill="#d9a441"/><ellipse cx="5.6" cy="6.4" rx="1.3" ry="2.2" fill="#d9a441" transform="rotate(-30 5.6 6.4)"/><ellipse cx="10.4" cy="6.4" rx="1.3" ry="2.2" fill="#d9a441" transform="rotate(30 10.4 6.4)"/><ellipse cx="5.8" cy="9.8" rx="1.2" ry="2" fill="#d9a441" transform="rotate(-30 5.8 9.8)"/><ellipse cx="10.2" cy="9.8" rx="1.2" ry="2" fill="#d9a441" transform="rotate(30 10.2 9.8)"/></svg>',
  oil: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M7 1.8h2l-.2 2.1c2.4.6 3.6 2.6 3.6 4.9 0 2.4-1.5 4.3-3.1 5H6.7C5.1 13.1 3.6 11.2 3.6 8.8c0-2.3 1.2-4.3 3.6-4.9z" fill="#8aa83a" stroke="#3e4f12" stroke-width=".9" stroke-linejoin="round"/></svg>',
  fleece: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.6 9.8c-1.8-.3-2-2.7-.3-3.2-.4-1.9 1.6-2.9 2.9-2 .7-1.6 3-1.6 3.7 0 1.3-.9 3.3.1 2.9 2 1.7.5 1.5 2.9-.3 3.2.1 1.7-1.7 2.8-3.2 2-.8 1.2-2.5 1.2-3.3 0-1.5.8-3.3-.3-3.2-2z" fill="#eee2c0" stroke="#8a744a" stroke-width=".9" stroke-linejoin="round"/><path d="M7.7 3.2l.4 9.8" stroke="#4c5a8c" stroke-width="1.3" stroke-linecap="round"/></svg>',
  wine: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8.4 3.4c1.2-1.6 3.2-1.9 4.6-.9-1.1 1.5-2.7 1.9-4.6.9z" fill="#6a9a34"/><g fill="#7a2e80" stroke="#3e1240" stroke-width=".7"><circle cx="5" cy="6" r="1.6"/><circle cx="8" cy="6" r="1.6"/><circle cx="11" cy="6" r="1.6"/><circle cx="6.5" cy="8.6" r="1.6"/><circle cx="9.5" cy="8.6" r="1.6"/><circle cx="8" cy="11.2" r="1.6"/></g></svg>',
  workers:
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 14.4 9.6 8" stroke="#7a5c3c" stroke-width="2.2" stroke-linecap="round"/><path d="M8.2 2.2c2.6-.8 5.4.6 6 3.2l-2.6-.6-2.4 2.4-2.6-2.6z" fill="#7a5c3c"/></svg>',
  tax: '<svg viewBox="0 0 16 16" aria-hidden="true"><ellipse cx="6.4" cy="11.6" rx="4.6" ry="1.8" fill="#a07a1e"/><ellipse cx="6.4" cy="10.4" rx="4.6" ry="1.8" fill="#d9b04a"/><path d="M12.4 2.4v8.2m-2.4-2.4 2.4 2.6 2.4-2.6" fill="none" stroke="#b23a22" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  money:
    '<svg viewBox="0 0 16 16" aria-hidden="true"><ellipse cx="8" cy="11.6" rx="5.6" ry="2" fill="#a07a1e"/><ellipse cx="8" cy="10.4" rx="5.6" ry="2" fill="#d9b04a"/><ellipse cx="8" cy="7.6" rx="5.6" ry="2" fill="#a07a1e"/><ellipse cx="8" cy="6.4" rx="5.6" ry="2" fill="#e3c060"/><path d="M5.4 6.4h5.2" stroke="#8a6414" stroke-width=".9" stroke-linecap="round"/></svg>',
};

/** A line's icon: a trader's is a donkey for a caravan, a ship for a ship. */
const iconOf = (l: TownLine): string => (l.need === 'trader' && l.route?.endsWith('-sea') ? ICONS.ship : ICONS[l.need]);

/** The order the lines always stand in, whichever showed first (so two lines never swap places). */
const ORDER: readonly TownLine['need'][] = ['ship', 'trader', 'fire', 'wear', 'rubble', 'food', 'oil', 'fleece', 'wine', 'workers', 'money', 'tax'];
const rank = (need: TownLine['need']): number => {
  const i = ORDER.indexOf(need);
  return i < 0 ? ORDER.length : i;
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
      } else this.seen.set(l.need, { since: this.first || l.need === 'ship' || l.need === 'trader' ? tick - settle : tick, lastSeen: tick, line: l, el: null });
    }
    this.first = false;
    for (const [need, s] of this.seen) {
      // A tick that went backwards (a save opened) starts over.
      if (tick < s.since) s.since = s.lastSeen = tick;
      // (The ships' and caravans' news comes and goes at once: it is news, not a shortfall.)
      const gone = tick - s.lastSeen > (need === 'ship' || need === 'trader' ? 0 : settle);
      const shown = tick - s.since >= settle && !gone;
      if (shown && !s.el) {
        const b = document.createElement('button');
        b.className = `townline ${need}`;
        b.innerHTML = `${iconOf(s.line)}<span></span>`;
        b.dataset.icon = s.line.route ?? need;
        b.addEventListener('click', () => {
          const cur = this.seen.get(need);
          if (cur) this.go(cur.line);
        });
        b.dataset.rank = String(rank(need));
        const after = [...this.el.children].find((c) => Number((c as HTMLElement).dataset.rank) > rank(need)) ?? null;
        this.el.insertBefore(b, after);
        s.el = b;
      }
      if (s.el) {
        // (A trader's line can pass from a caravan to a ship: its icon follows.)
        if (s.el.dataset.icon !== (s.line.route ?? need)) {
          s.el.dataset.icon = s.line.route ?? need;
          s.el.querySelector('svg')?.remove();
          s.el.insertAdjacentHTML('afterbegin', iconOf(s.line));
        }
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
