import { DAYS_PER_MONTH, formatYear, type SimDate } from '../sim/clock';
import type { ClockDriver, Speed } from '../game/clockDriver';
import { TICKS_PER_SECOND } from '../sim/clock';
import type { Outlook } from '../sim/settlers';
import { jobsAt } from '../sim/buildings';
import type { Building } from '../sim/state';
import { TAX_RATES, taxOf } from '../sim/taxes';

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
        <button class="stat trouble" hidden>
          <svg viewBox="0 0 18 16" aria-hidden="true"><path d="M9 1.2 17.2 15H.8z" class="tri"/><path d="M9 5.6v4.6" class="mark"/><circle cx="9" cy="12.4" r="1" class="dot"/></svg>
          <span class="num">0</span>
        </button>
        <div class="divider"></div>
        <div class="date" title="The date in your city">
          <div class="month"></div>
          <div class="days"></div>
        </div>
        <div class="divider"></div>
        <div class="speeds"></div>
        <div class="divider"></div>
        <button class="stat money" title="Drachmas in the treasury · click for the ledger">
          <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.6"/><circle cx="8" cy="8" r="4.4" class="inner"/><path d="M8 5.2l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" class="mark"/></svg>
          <span class="num">0</span><span class="trend" hidden></span><span class="delta"></span>
        </button>
        <button class="ship-chip" hidden><svg viewBox="0 0 20 16" aria-hidden="true"><path d="M9.6 1.2v9.4" class="mast"/><path d="M10.4 2.2c3 1.4 4.6 4 4.8 7.4h-4.8z" class="sail"/><path d="M1.4 10.8h17.2c-.8 2.6-2.8 4-5.4 4H6.4c-2.4 0-4.2-1.4-5-4z" class="hull"/></svg><svg viewBox="0 0 20 16" aria-hidden="true" class="donkey"><path d="M3.4 7.6c0-1.2 1-2 2.4-2h7.2c.8 0 1.2-.4 1.6-1.2l.6-1.8 1.2.2.4 1.2 1 1.4-.6 1-1.4-.3-.6 1.2c-.3.8-.6 1.4-1.4 1.8V15h-1.4v-3.6H6.6V15H5.2v-4.2c-1.1-.5-1.8-1.6-1.8-3.2z" class="hide"/><path d="M5.8 2.2h5.4l.5 5.8H5.3z" class="pack"/></svg><span class="txt"></span></button>
        <button class="rate-chip" title="The tax rate: click to change it">Taxes · fair</button>
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
  showWork(w: { jobs: number; filled: number; able: number; short: Building[] }, names: Record<string, string>): void {
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
      const list = w.short.slice(0, 4).map((b) => `${names[b.kind] ?? b.kind} (${b.workers} of ${jobsAt(b)})`);
      text += ` Short of workers: ${list.join(', ')}${w.short.length > 4 ? ` and ${w.short.length - 4} more` : ''}. A short-handed place works slower; more homes nearby by road would help.`;
    } else if (w.jobs > 0) text += ' Every job is filled.';
    el.title = text;
  }

  private troubleKey = '';

  /**
   * Homes in trouble (warned: they will drop a level unless what they lack
   * comes): how many, and a tooltip naming the most urgent. Hidden when none.
   */
  showTrouble(list: Array<{ name: string; need: string; days: number }>): void {
    const el = this.bar.querySelector('.stat.trouble') as HTMLButtonElement;
    const key = list.map((h) => `${h.name}:${h.need}:${h.days}`).join('|');
    if (key === this.troubleKey) return;
    this.troubleKey = key;
    el.hidden = list.length === 0;
    if (!list.length) return;
    (el.querySelector('.num') as HTMLElement).textContent = String(list.length);
    const lines = list.slice(0, 5).map((h) => `· The house of ${h.name}: no ${h.need}, ${h.days} ${h.days === 1 ? 'day' : 'days'} left`);
    const more = list.length > 5 ? `\n· and ${list.length - 5} more` : '';
    el.title = `${list.length === 1 ? 'A home is' : `${list.length} homes are`} in trouble: without what they need, and going down a level unless it comes.\n${lines.join('\n')}${more}\nClick to go to the most urgent.`;
    el.setAttribute('aria-label', `${list.length} homes in trouble`);
  }

  /** Clicking the trouble count. */
  onTrouble(f: () => void): void {
    (this.bar.querySelector('.stat.trouble') as HTMLElement).addEventListener('click', f);
  }

  private shipKey = '';

  /** The traders chip: when the next ship (or, with routes open, the nearest trader) is due, sighted, here, gone (hidden in a city with no post and no route). */
  showShip(news: { phase: number; chip: string; short: string; line: string; kind?: 'land' | 'sea' } | null): void {
    const key = news ? `${news.phase}:${news.chip}:${news.line}:${news.kind ?? ''}` : '';
    if (key === this.shipKey) return;
    this.shipKey = key;
    const el = this.bar.querySelector('.ship-chip') as HTMLButtonElement;
    el.hidden = !news;
    // (A little tighter with the chip, so the bar still fits beside the corner buttons at 1280 wide.)
    this.bar.classList.toggle('with-ship', !!news);
    if (!news) return;
    (el.querySelector('.txt') as HTMLElement).textContent = news.chip;
    el.className = `ship-chip p${news.phase}${news.kind === 'land' ? ' land' : ''}`;
    el.title = `${news.short} · ${news.line}.\nClick for the trade panel.`;
    el.setAttribute('aria-label', news.short);
  }

  /** Clicking the ship chip. */
  onShip(f: () => void): void {
    (this.bar.querySelector('.ship-chip') as HTMLElement).addEventListener('click', f);
  }

  /** Clicking the drachmas. */
  onMoney(f: () => void): void {
    (this.bar.querySelector('.stat.money') as HTMLElement).addEventListener('click', f);
  }

  private trendKey = '';

  /**
   * Which way money went last month (null: no full month yet), shown as a
   * small arrow by the drachmas; and whether wages are owed (the drachmas turn rust).
   */
  showTrend(net: number | null, owed: boolean): void {
    const key = `${net}:${owed}`;
    if (key === this.trendKey) return;
    this.trendKey = key;
    const el = this.bar.querySelector('.stat.money') as HTMLElement;
    el.classList.toggle('owed', owed);
    const t = el.querySelector('.trend') as HTMLElement;
    t.hidden = net === null || net === 0;
    if (net === null || net === 0) return;
    t.className = `trend ${net > 0 ? 'up' : 'down'}`;
    t.innerHTML = net > 0 ? '<svg viewBox="0 0 10 10"><path d="M5 1.2 9 7.4H1z"/></svg>' : '<svg viewBox="0 0 10 10"><path d="M5 8.8 9 2.6H1z"/></svg>';
  }

  private rates: HTMLElement | null = null;
  private rate = -1;

  /** The tax rate chip, and the card of the five rates it opens (`set` changes the rate). */
  setupRates(root: HTMLElement, set: (rate: number) => void): void {
    const chip = this.bar.querySelector('.rate-chip') as HTMLButtonElement;
    const card = document.createElement('div');
    card.className = 'rates';
    card.hidden = true;
    const WHAT = [
      'Households are glad of it',
      'About half of fair. Nobody minds',
      'What households expect to pay',
      'Half as much again. Households grumble',
      'About twice fair. Households are unhappy: whole households leave, and newcomers stay away',
    ];
    card.innerHTML = `<h3>Taxes</h3>${TAX_RATES.map(
      (r, i) => `<button class="rate" data-rate="${i}"><b>${r[0].toUpperCase()}${r.slice(1)}</b><span class="per">${i ? `cottage ${taxOf(i, 3)} · fine house ${taxOf(i, 5)} · villa ${taxOf(i, 6)} dr a month` : 'Nobody pays'}</span><span class="what">${WHAT[i]}</span></button>`,
    ).join('')}<p class="foot">Only the homes a tax collector calls on pay, once a month.</p>`;
    root.appendChild(card);
    this.rates = card;
    chip.addEventListener('click', () => this.toggleRates());
    card.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('.rate') as HTMLElement | null;
      if (!b) return;
      set(Number(b.dataset.rate));
      this.toggleRates(false);
    });
  }

  get ratesOpen(): boolean {
    return !!this.rates && !this.rates.hidden;
  }

  /** Called when the rates card opens (the cards in the top right corner make way for it). */
  onRatesOpen: (() => void) | null = null;

  toggleRates(show = this.rates?.hidden ?? false): void {
    if (!this.rates) return;
    this.rates.hidden = !show;
    if (show) {
      this.onRatesOpen?.();
      // Under the chip.
      const chip = (this.bar.querySelector('.rate-chip') as HTMLElement).getBoundingClientRect();
      const root = (this.rates.parentElement as HTMLElement).getBoundingClientRect();
      this.rates.style.left = `${Math.round(Math.max(12, Math.min(chip.left - root.left - 60, root.width - this.rates.offsetWidth - 12)))}px`;
      this.rates.style.top = `${Math.round(chip.bottom - root.top + 12)}px`;
    }
  }

  /** Show the tax rate on the chip, and mark it in the card. */
  showRate(rate: number): void {
    if (rate === this.rate) return;
    this.rate = rate;
    const chip = this.bar.querySelector('.rate-chip') as HTMLElement;
    chip.textContent = `Taxes · ${TAX_RATES[rate] ?? '?'}`;
    chip.className = `rate-chip r${rate}`;
    this.rates?.querySelectorAll('.rate').forEach((b) => b.classList.toggle('on', Number((b as HTMLElement).dataset.rate) === rate));
  }

  /** The treasury's tooltip (see moneyTip). */
  setMoneyTip(text: string): void {
    const el = this.bar.querySelector('.stat.money') as HTMLElement;
    if (el.title !== text) el.title = text;
  }

  /** The population's tooltip: how often newcomers are arriving, and why. */
  setPeopleTip(o: Outlook): void {
    const el = this.bar.querySelector('.stat.people') as HTMLElement;
    let why: string;
    if (!o.road) why = 'Settlers come in where a road meets the edge of the map.';
    else if (o.room === 0 && o.cutOff > 0)
      why = `No room for newcomers: ${o.cutOff === 1 ? 'the empty plot you marked out has' : `the ${o.cutOff} empty plots you marked out have`} no road beside ${o.cutOff === 1 ? 'it' : 'them'} that leads to the edge of the map. Lay a road past ${o.cutOff === 1 ? 'it' : 'them'}.`;
    else if (o.room === 0) why = 'No room for newcomers: mark out more plots, or bring water so tents grow into huts.';
    else {
      const secs = o.interval / TICKS_PER_SECOND;
      const every = secs < 1.95 ? `${secs.toFixed(1)} seconds` : `${Math.round(secs)} seconds`;
      why = `Room for ${o.room} more · water reaches ${Math.round(o.water * 100)}% of homes · newcomers about every ${every} at normal speed (more room and more water bring them sooner).`;
      if (o.harsh) why += ' Taxes are harsh: word has got about, and newcomers come a third as often.';
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
