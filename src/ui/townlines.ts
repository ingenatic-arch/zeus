/**
 * The shortfall lines under the top bar: what the town as a whole is short
 * of (bread, workers, money), in plain words, readable without hovering. A line
 * shows once the shortfall has held for a few days of game time and goes
 * once it has been gone for a few, so a family moving in or out doesn't make
 * it flicker. Clicking a line goes to the place it names.
 */
import { TICKS_PER_DAY } from '../sim/clock';
import type { TownLine } from '../sim/status';

/** Lines that are news, not shortfalls: they come and go at once. */
const NEWS: readonly TownLine['need'][] = ['ship', 'trader', 'greece', 'favour', 'loan', 'raid', 'alarm', 'battle'];

/** Days a shortfall must hold before its line shows, and be gone before it goes. */
const SETTLE_DAYS = 3;

/** Slice 29: at most this many lines show at once (the most pressing, by WEIGHT); the rest fold under "+N more", which opens them. Seven lines covered the middle of the screen. */
const SHOWN = 4;
/** On the map of Greece, two: four lines and the chips covered Corinth, Athens, Sparta and your own city at 1600 × 900 (phase 4's review). */
const SHOWN_ON_MAP = 2;
const shown = (): number => (document.body.classList.contains('greece-open') ? SHOWN_ON_MAP : SHOWN);

const SPEARS = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.4 13.6 12.6 3.4M13.6 13.6 3.4 3.4" stroke="#5a3a22" stroke-width="1.3" stroke-linecap="round"/><path d="M12.2 1.4l2.4 2.4-2.8.6zM3.8 1.4 1.4 3.8l2.8.6z" fill="#cfd2d4" stroke="#4a4a4a" stroke-width=".5"/><circle cx="8" cy="10.2" r="3.6" fill="#b8322a" stroke="#5e1410" stroke-width=".9"/><circle cx="8" cy="10.2" r="1.1" fill="#e8c46a"/></svg>';
/** The army's news: a bronze helmet with its crest. */
const HELMET = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2.4c2.4-1.6 7.6-1.6 10 0" fill="none" stroke="#b8322a" stroke-width="2.2" stroke-linecap="round"/><path d="M8 3.2c-3.2 0-5.2 2.2-5.2 5.4v5.6h3.4v-3.4l-1-1.2V7.4h5.6v2.2l-1 1.2v3.4h3.4V8.6c0-3.2-2-5.4-5.2-5.4z" fill="#c8963c" stroke="#5e4214" stroke-width=".9" stroke-linejoin="round"/><path d="M7.2 7.4v4.2M8.8 7.4v4.2" stroke="#5e4214" stroke-width=".9"/></svg>';
const ICONS: Record<TownLine['need'], string> = {
  // (A loan's: a coin on a scroll, as on the city's label and page.)
  loan: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2.8h8.6c.9 0 1.5.6 1.5 1.5V12H4.5C3.7 12 3 11.3 3 10.5z" fill="#f4e4bf" stroke="#8a6440" stroke-width=".9" stroke-linejoin="round"/><path d="M5.2 5.4h5M5.2 7.2h3" stroke="#8a6440" stroke-width=".8" stroke-linecap="round"/><circle cx="10.6" cy="11" r="3.3" fill="#e8c04a" stroke="#8a6414" stroke-width=".9"/><circle cx="10.6" cy="11" r="1.7" fill="none" stroke="#b88a1e" stroke-width=".7"/></svg>',
  raid: SPEARS,
  battle: HELMET,
  alarm: '<svg viewBox="0 0 18 16" aria-hidden="true"><path d="M2 6.2c3.4-.2 7.6-1.8 11.6-4.6.9 3.6.9 8.2 0 11.8-4-2.8-8.2-4.4-11.6-4.6z" fill="#d9b04a" stroke="#6a4416" stroke-width=".9" stroke-linejoin="round"/><ellipse cx="13.6" cy="7.6" rx="1.4" ry="5.8" fill="#a07a1e" stroke="#6a4416" stroke-width=".8"/><path d="M15.6 4.4l1.6-1M16 7.6h1.8M15.6 10.8l1.6 1" stroke="#b8322a" stroke-width="1.1" stroke-linecap="round"/></svg>',
  favour:
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.6h8.4c.9 0 1.4.6 1.4 1.4s-.5 1.4-1.4 1.4H12v7.2c0 1-.7 1.7-1.7 1.7H3.6c.9 0 1.4-.6 1.4-1.4V4c0-.8-.5-1.4-1-1.4z" fill="#f4e4bf" stroke="#8a6440" stroke-width=".9" stroke-linejoin="round"/><path d="M6.6 7h3.6M6.6 9h3.6" stroke="#8a6440" stroke-width=".8" stroke-linecap="round"/><circle cx="10.6" cy="11.6" r="2.3" fill="#b8322a" stroke="#6e1a14" stroke-width=".7"/></svg>',
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
  greece:
    '<svg viewBox="0 0 18 16" aria-hidden="true"><path d="M1.5 3.2 6 1.6l6 1.8 4.5-1.6v11.2L12 14.6l-6-1.8-4.5 1.6z" fill="#f4e4bf" stroke="#8a6440" stroke-width=".9" stroke-linejoin="round"/><path d="M6 1.6v11.2M12 3.4v11.2" stroke="rgba(138,100,64,.55)" stroke-width=".8"/><path d="M3 6.4c1.6-.6 2.4.6 3.8.2s2.2-1.4 3.6-.6 2 .8 3.8.2" fill="none" stroke="#2f7f9e" stroke-width="1.1" stroke-linecap="round"/><circle cx="9.6" cy="10" r="1.3" fill="#c8643b"/></svg>',
  money:
    '<svg viewBox="0 0 16 16" aria-hidden="true"><ellipse cx="8" cy="11.6" rx="5.6" ry="2" fill="#a07a1e"/><ellipse cx="8" cy="10.4" rx="5.6" ry="2" fill="#d9b04a"/><ellipse cx="8" cy="7.6" rx="5.6" ry="2" fill="#a07a1e"/><ellipse cx="8" cy="6.4" rx="5.6" ry="2" fill="#e3c060"/><path d="M5.4 6.4h5.2" stroke="#8a6414" stroke-width=".9" stroke-linecap="round"/></svg>',
};

/** A line's icon: a trader's is a donkey for a caravan, a ship for a ship. */
const iconOf = (l: TownLine): string => (l.need === 'trader' && l.route?.endsWith('-sea') ? ICONS.ship : ICONS[l.need]);

/** The order the lines always stand in, whichever showed first (so two lines never swap places). */
const ORDER: readonly TownLine['need'][] = ['raid', 'battle', 'alarm', 'ship', 'trader', 'favour', 'loan', 'greece', 'fire', 'wear', 'rubble', 'food', 'oil', 'fleece', 'wine', 'workers', 'money', 'tax'];
const rank = (need: TownLine['need']): number => {
  const i = ORDER.indexOf(need);
  return i < 0 ? ORDER.length : i;
};

/**
 * Which lines stay in sight when they fold, most pressing first (they still
 * stand in ORDER): a threat, a fight, a fire, a debt or wages owed, a ruler's
 * ask and what the town is short of before the comings and goings of ships
 * and caravans. (Review of slice 29: folded in ORDER, a ship and a caravan
 * hid #fortress's meat shortfall, and could have hidden a fire.)
 */
const WEIGHT: readonly TownLine['need'][] = ['raid', 'battle', 'alarm', 'fire', 'loan', 'money', 'favour', 'food', 'oil', 'fleece', 'wine', 'wear', 'rubble', 'workers', 'tax', 'greece', 'ship', 'trader'];
const weight = (need: string): number => {
  const i = WEIGHT.indexOf(need as TownLine['need']);
  return i < 0 ? WEIGHT.length : i;
};

export class TownLines {
  readonly el: HTMLElement;
  /** The lines standing when the game opens show at once (a demo may open paused). */
  private first = true;
  private seen = new Map<TownLine['need'], { since: number; lastSeen: number; line: TownLine; el: HTMLButtonElement | null }>();

  /** The "+N more" button under the lines, and whether it has opened them all. */
  private more: HTMLButtonElement;
  private open = false;

  constructor(
    parent: HTMLElement,
    private go: (line: TownLine) => void,
  ) {
    const el = document.createElement('div');
    el.className = 'townlines';
    parent.appendChild(el);
    this.el = el;
    const more = document.createElement('button');
    more.className = 'townlines-more';
    more.hidden = true;
    more.addEventListener('click', () => {
      this.open = !this.open;
      this.fold();
    });
    el.appendChild(more);
    this.more = more;
  }

  /** Fold all but the SHOWN most pressing lines under the "+N more" button (or show them all, opened). */
  private fold(): void {
    const lines = [...this.el.querySelectorAll<HTMLElement>('.townline')];
    const most = shown();
    const over = lines.length - most;
    if (over <= 0) this.open = false;
    const kept = new Set(lines.slice().sort((a, b) => weight(a.dataset.need ?? '') - weight(b.dataset.need ?? '') || Number(a.dataset.rank) - Number(b.dataset.rank)).slice(0, most));
    lines.forEach((l) => l.classList.toggle('folded', !this.open && !kept.has(l)));
    this.more.hidden = over <= 0;
    const text = this.open ? 'Fewer' : `+${over} more`;
    if (this.more.textContent !== text) this.more.textContent = text;
    this.more.title = this.open ? `Fold all but the ${most} most pressing lines` : `${over} more line${over === 1 ? '' : 's'}: click to show ${over === 1 ? 'it' : 'them'}`;
    if (this.el.lastElementChild !== this.more) this.el.appendChild(this.more);
  }

  /** The lines as they stand now, at game tick `tick`. */
  update(lines: TownLine[], tick: number): void {
    const settle = SETTLE_DAYS * TICKS_PER_DAY;
    const present = new Set(lines.map((l) => l.need));
    for (const l of lines) {
      const s = this.seen.get(l.need);
      if (s) {
        s.lastSeen = tick;
        s.line = l;
      } else this.seen.set(l.need, { since: this.first || NEWS.includes(l.need) ? tick - settle : tick, lastSeen: tick, line: l, el: null });
    }
    this.first = false;
    for (const [need, s] of this.seen) {
      // A tick that went backwards (a save opened) starts over.
      if (tick < s.since) s.since = s.lastSeen = tick;
      // (News, a ship's or a raid's, comes and goes at once: it is news, not a shortfall. Slice 29: gone as soon as it no longer stands, paused or not, instead of waiting for the next tick.)
      const gone = NEWS.includes(need) ? !present.has(need) : tick - s.lastSeen > settle;
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
        b.dataset.need = need;
        const after = [...this.el.children].find((c) => c === this.more || Number((c as HTMLElement).dataset.rank) > rank(need)) ?? null;
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
    this.fold();
  }

  /** The lines showing (for the smoke test). */
  get texts(): string[] {
    return [...this.el.querySelectorAll('.townline span')].map((e) => e.textContent ?? '');
  }
}
