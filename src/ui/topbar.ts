import { DAYS_PER_MONTH, formatYear, type SimDate } from '../sim/clock';
import type { ClockDriver, Speed } from '../game/clockDriver';

const ICONS: Record<Speed, string> = {
  paused: '<svg viewBox="0 0 16 16"><rect x="3" y="2.5" width="3.6" height="11" rx="1"/><rect x="9.4" y="2.5" width="3.6" height="11" rx="1"/></svg>',
  normal: '<svg viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z"/></svg>',
  fast: '<svg viewBox="0 0 16 16"><path d="M1.5 3v10l6.5-5zM8 3v10l6.5-5z"/></svg>',
  fastest:
    '<svg viewBox="0 0 16 16"><path d="M0.5 4v8l4.6-4zM5.3 4v8l4.6-4zM10.1 4v8l4.6-4z"/><rect x="14.6" y="4" width="1.2" height="8"/></svg>',
};
const LABELS: Record<Speed, string> = {
  paused: 'Pause (Space)',
  normal: 'Normal speed (1)',
  fast: 'Fast (2)',
  fastest: 'Fastest (3)',
};

/** The warm parchment bar at the top: the date and the speed controls. */
export class TopBar {
  private monthEl: HTMLElement;
  private dayDots: HTMLElement[] = [];
  private buttons = new Map<Speed, HTMLButtonElement>();
  private lastKey = '';

  constructor(root: HTMLElement, driver: ClockDriver) {
    const bar = document.createElement('div');
    bar.className = 'topbar';
    bar.innerHTML = `
      <div class="row">
        <div class="date" title="The date in your city">
          <div class="month"></div>
          <div class="days"></div>
        </div>
        <div class="divider"></div>
        <div class="speeds"></div>
      </div>
      <div class="meander"></div>`;
    root.appendChild(bar);
    this.monthEl = bar.querySelector('.month') as HTMLElement;
    const days = bar.querySelector('.days') as HTMLElement;
    for (let i = 0; i < DAYS_PER_MONTH; i++) {
      const d = document.createElement('i');
      days.appendChild(d);
      this.dayDots.push(d);
    }
    const speeds = bar.querySelector('.speeds') as HTMLElement;
    for (const s of ['paused', 'normal', 'fast', 'fastest'] as Speed[]) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.innerHTML = ICONS[s];
      b.title = LABELS[s];
      b.setAttribute('aria-label', LABELS[s]);
      b.addEventListener('click', () => driver.setSpeed(s));
      speeds.appendChild(b);
      this.buttons.set(s, b);
    }
    driver.onSpeedChange((s) => this.showSpeed(s));
    this.showSpeed(driver.speed);
  }

  showSpeed(s: Speed): void {
    for (const [k, b] of this.buttons) {
      b.classList.toggle('on', k === s);
      b.setAttribute('aria-pressed', String(k === s));
    }
  }

  showDate(d: SimDate): void {
    const key = `${d.monthsElapsed}:${d.day}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    this.monthEl.textContent = `${d.monthName}, ${formatYear(d.yearBC)}`;
    for (let i = 0; i < this.dayDots.length; i++) this.dayDots[i].classList.toggle('on', i < d.day);
  }
}
