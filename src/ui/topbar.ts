import { DAYS_PER_MONTH, formatYear, type SimDate } from '../sim/clock';
import type { ClockDriver, Speed } from '../game/clockDriver';
import { TICKS_PER_SECOND } from '../sim/clock';
import type { Outlook } from '../sim/settlers';
import { JOBS } from '../sim/buildings';
import type { BuildingKind } from '../sim/state';

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
  private readonly bar: HTMLElement;

  constructor(root: HTMLElement, driver: ClockDriver) {
    const bar = document.createElement('div');
    bar.className = 'topbar';
    bar.innerHTML = `
      <div class="row">
        <div class="stat people" title="People living in your city">
          <svg viewBox="0 0 20 16" aria-hidden="true"><circle cx="7" cy="4" r="2.6"/><path d="M2.4 15c0-3.6 2-6 4.6-6s4.6 2.4 4.6 6z"/><circle cx="14" cy="5.2" r="2.1"/><path d="M12.6 15c.1-2.4-.4-4.2-1.3-5.2.8-.5 1.6-.7 2.7-.7 2.2 0 3.8 2 3.8 5.9z"/></svg>
          <span class="num">0</span><span class="delta"></span>
        </div>
        <div class="stat work" title="Jobs filled">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 14.4 9.6 8" stroke-width="2.2" stroke-linecap="round" class="handle"/><path d="M8.2 2.2c2.6-.8 5.4.6 6 3.2l-2.6-.6-2.4 2.4-2.6-2.6z"/></svg>
          <span class="num">0</span><span class="of"></span>
        </div>
        <div class="divider"></div>
        <div class="date" title="The date in your city">
          <div class="month"></div>
          <div class="days"></div>
        </div>
        <div class="divider"></div>
        <div class="speeds"></div>
        <div class="divider"></div>
        <div class="stat money" title="Drachmas in the treasury">
          <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.6"/><circle cx="8" cy="8" r="4.4" class="inner"/><path d="M8 5.2l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" class="mark"/></svg>
          <span class="num">0</span><span class="delta"></span>
        </div>
      </div>
      <div class="meander"></div>`;
    root.appendChild(bar);
    this.bar = bar;
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

  private stats = new Map<string, { num: HTMLElement; delta: HTMLElement; value: number; timer: number }>();

  /** Show population and drachmas; a change shows briefly as +/- beside the number. */
  showCity(population: number, money: number, now: number): void {
    this.stat('people', population, now);
    this.stat('money', money, now);
  }

  private stat(name: string, value: number, now: number): void {
    let st = this.stats.get(name);
    if (!st) {
      const el = this.bar.querySelector(`.stat.${name}`) as HTMLElement;
      st = { num: el.querySelector('.num') as HTMLElement, delta: el.querySelector('.delta') as HTMLElement, value: NaN, timer: 0 };
      this.stats.set(name, st);
    }
    if (value !== st.value) {
      if (!Number.isNaN(st.value)) {
        const d = value - st.value;
        st.delta.textContent = `${d > 0 ? '+' : '−'}${Math.abs(d).toLocaleString('en-GB')}`;
        st.delta.className = `delta show ${d > 0 ? 'up' : 'down'}`;
        st.timer = now + 1.6;
      }
      st.value = value;
      st.num.textContent = value.toLocaleString('en-GB');
    }
    if (st.timer && now > st.timer) {
      st.delta.classList.remove('show');
      st.timer = 0;
    }
  }

  private workKey = '';

  /** Jobs filled of jobs, and the tooltip saying who's short. */
  showWork(w: { jobs: number; filled: number; able: number; short: Array<{ kind: string; workers: number }> }, names: Record<string, string>): void {
    const el = this.bar.querySelector('.stat.work') as HTMLElement;
    const key = `${w.jobs}:${w.filled}:${w.able}:${w.short.length}`;
    if (key === this.workKey) return;
    this.workKey = key;
    el.hidden = w.jobs === 0;
    (el.querySelector('.num') as HTMLElement).textContent = w.filled.toLocaleString('en-GB');
    (el.querySelector('.of') as HTMLElement).textContent = `/${w.jobs.toLocaleString('en-GB')}`;
    el.classList.toggle('short', w.filled < w.jobs);
    let text = `Jobs filled: ${w.filled} of ${w.jobs} · ${w.able} people can work (half of everyone in a lived-in home).`;
    if (w.short.length) {
      const list = w.short.slice(0, 4).map((b) => `${names[b.kind] ?? b.kind} (${b.workers} of ${JOBS[b.kind as BuildingKind] ?? '?'})`);
      text += ` Short of workers: ${list.join(', ')}${w.short.length > 4 ? ` and ${w.short.length - 4} more` : ''}. A short-handed place works slower; more homes nearby by road would help.`;
    } else if (w.jobs > 0) text += ' Every job is filled.';
    el.title = text;
  }

  /** The treasury's tooltip: rent from last month. */
  setMoneyTip(rent: { paid: number; homes: number }): void {
    const el = this.bar.querySelector('.stat.money') as HTMLElement;
    const text =
      rent.homes > 0
        ? `Drachmas in the treasury. Rent last month: ${rent.paid} dr from ${rent.homes} ${rent.homes === 1 ? 'home' : 'homes'} (a tent pays 1 dr a month, a hut 2, a cottage 4).`
        : 'Drachmas in the treasury. Lived-in homes pay rent on the first of each month: a tent 1 dr, a hut 2, a cottage 4.';
    if (el.title !== text) el.title = text;
  }

  /** The population's tooltip: how often newcomers are arriving, and why. */
  setPeopleTip(o: Outlook): void {
    const el = this.bar.querySelector('.stat.people') as HTMLElement;
    let why: string;
    if (!o.road) why = 'Settlers come in where a road meets the edge of the map.';
    else if (o.room === 0) why = 'No room for newcomers: mark out more plots, or bring water so tents grow into huts.';
    else {
      const secs = o.interval / TICKS_PER_SECOND;
      const every = secs < 1.95 ? `${secs.toFixed(1)} seconds` : `${Math.round(secs)} seconds`;
      why = `Room for ${o.room} more · water reaches ${Math.round(o.water * 100)}% of homes · newcomers about every ${every} at normal speed (more room and more water bring them sooner).`;
    }
    const text = `People living in your city. ${why}`;
    if (el.title !== text) el.title = text;
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
