/**
 * The town's messages on screen (slice 44): the scroll button's count on the
 * top bar (topbar.ts), the Messages panel on the left, and the alarms that
 * pop up at the bottom left. The log itself is the town's (src/sim/messages.ts):
 * this only reads it, and marks messages read or pinned through the
 * `messages` command. Which kinds of alarm may pop up is the player's
 * setting, kept in this browser (it holds for every town and demo).
 */
import './messages.css';
import { dateOfTick, formatYear, MONTH_NAMES, TICKS_PER_YEAR } from '../sim/clock';
import type { Command } from '../sim/commands';
import { ALARM, CAT_NAMES, CATS, KINDS, KEEP_TICKS, MAX_MESSAGES, POPUP_KINDS, catOf, titleOf, type Message, type MessageCat, type MessageKind } from '../sim/messages';
import type { SimState } from '../sim/state';
import { dealLine, dealsWaiting, loansWaiting } from '../sim/status';
import { raidLine } from '../sim/raids';
import type { CoastMap } from '../map/bake';
import type { CityId } from '../map/greece';
import { ICONS } from './townlines';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Health's: Hygieia's bowl with its serpent. */
const BOWL = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.4 8.2h11.2c-.3 3-2.6 5-5.6 5s-5.3-2-5.6-5z" fill="#c8963c" stroke="#5e4214" stroke-width=".9" stroke-linejoin="round"/><path d="M6.2 13.2 5.6 15h4.8l-.6-1.8" fill="#a07a1e" stroke="#5e4214" stroke-width=".8" stroke-linejoin="round"/><path d="M9.4 8.2C11 6.6 9 5.4 7.6 4.8 6.2 4.2 6.6 2.4 8.4 2.2c1.2-.1 1.8.6 1.6 1.3" fill="none" stroke="#3e6a2c" stroke-width="1.3" stroke-linecap="round"/><circle cx="9.9" cy="3.4" r=".9" fill="#3e6a2c"/></svg>';
/** A message with no kind of its own: a small scroll. */
const SCROLL = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3h8v10H4z" fill="#f4e4bf" stroke="#8a6440" stroke-width=".9"/><rect x="2.6" y="1.6" width="10.8" height="2.6" rx="1.3" fill="#d9b98a" stroke="#6e4e30" stroke-width=".8"/><rect x="2.6" y="11.8" width="10.8" height="2.6" rx="1.3" fill="#d9b98a" stroke="#6e4e30" stroke-width=".8"/></svg>';
const PIN = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.8 1.6 14.4 6.2l-1.6.6-2.6 2.6.2 3-1.2 1.2-2.6-2.6L3 14.6l-1.2.2.2-1.2 3.6-3.6L3 7.4l1.2-1.2 3 .2 2.6-2.6z" class="pinhead"/></svg>';

/** Each kind's icon (the lines' own where one fits). Kinds added later without one show the scroll. */
const KIND_ICON: Partial<Record<MessageKind, string>> = {
  greece: ICONS.greece,
  loan: ICONS.loan,
  deal: ICONS.favour,
  raid: ICONS.raid,
  blockade: ICONS.alarm,
  army: ICONS.battle,
  fleet: ICONS.ship,
  vassal: ICONS.empire,
  colony: ICONS.empire,
  rebellion: ICONS.alarm,
  ship: ICONS.ship,
  caravan: ICONS.trader,
  fire: ICONS.fire,
  collapse: ICONS.rubble,
  season: ICONS.season,
  laurel: ICONS.ambition,
  crime: ICONS.crime,
  plague: BOWL,
  sickness: BOWL,
  monument: ICONS.monument,
};
export const iconOfKind = (k: MessageKind): string => KIND_ICON[k] ?? SCROLL;

const SHORT_MONTHS = MONTH_NAMES.map((m) => m.slice(0, 3));
const dayOf = (tick: number): string => {
  const d = dateOfTick(tick);
  return `${d.day} ${SHORT_MONTHS[d.month]}`;
};
const monthOf = (tick: number): string => {
  const d = dateOfTick(tick);
  return `${d.monthName}, ${formatYear(d.yearBC)}`;
};
/** Each urgency's class (u0 news, u1 a warning, u2 an alarm: not 'warning', which the home's panel already styles). */
const URGENCY = ['u0', 'u1', 'u2'] as const;

// ---------------------------------------------------------------------------- the player's setting: which alarms pop up

/** The kinds of alarm the player has said should not pop up (kept in this browser). */
const POP_KEY = 'zeus-remake.popups-off';
function readOff(): Set<MessageKind> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(POP_KEY) ?? '[]');
    return new Set(Array.isArray(v) ? (v.filter((k) => typeof k === 'string' && k in KINDS) as MessageKind[]) : []);
  } catch {
    return new Set();
  }
}
function writeOff(off: Set<MessageKind>): void {
  try {
    localStorage.setItem(POP_KEY, JSON.stringify([...off]));
  } catch {
    // (No storage, in a private window: the setting holds for this visit only.)
  }
}
const popupsOff = readOff();

/** May this message pop up? An alarm of a kind that pops up, unless the player has turned that kind off. */
export const popsUp = (m: Message): boolean => m.u === ALARM && 'pop' in KINDS[m.kind] && !popupsOff.has(m.kind);

// ---------------------------------------------------------------------------- what is new

/**
 * The messages said since the last look (none the first time, or when another
 * town is opened): what the scroll's sound and the popups answer to.
 */
export class MessageWatch {
  private next = -1;
  private since = -1;

  fresh(s: SimState): Message[] {
    const g = s.messages;
    if (this.next < 0 || g.next < this.next || g.since !== this.since) {
      this.next = g.next;
      this.since = g.since;
      return [];
    }
    if (g.next === this.next) return [];
    const from = this.next;
    this.next = g.next;
    return g.log.filter((m) => m.id >= from);
  }
}

// ---------------------------------------------------------------------------- the panel

export interface MessagesDeps {
  /** Send a messages command (enqueued and applied at once). */
  send: (c: Command) => void;
  /** Go to a message's place (the city's camera, or the map of Greece). */
  go: (m: Message) => void;
  /** Does a message's place still stand to go to? */
  canGo: (s: SimState, m: Message) => boolean;
  /** Open a city's page on the map of Greece (a deal waiting on you). */
  goCity: (city: CityId, tab?: string) => void;
}

/**
 * The Messages panel, on the left where a home's panel opens: what waits on
 * you, the filters with their unread counts, pinned messages, then the log by
 * month, newest first. A message opens on a click (and is read); its place is
 * a link; a pin keeps it at the top. At its foot, which alarms pop up.
 */
export class MessagesPanel {
  readonly el: HTMLElement;
  private chips: HTMLElement;
  private body: HTMLElement;
  private kicker: HTMLElement;
  private filter: MessageCat | 'all' = 'all';
  /** The messages opened to show their words. */
  private opened = new Set<number>();
  private key = '';
  private lastAt = -Infinity;
  private s: SimState | null = null;
  private map: CoastMap | null = null;
  /** Called when the panel opens (the other panels on the left make way). */
  onOpen: (() => void) | null = null;

  constructor(
    root: HTMLElement,
    private deps: MessagesDeps,
  ) {
    const el = document.createElement('div');
    el.className = 'household messages';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Messages');
    el.innerHTML = `<button class="close" title="Close (Esc)" aria-label="Close">×</button>
      <header class="mhead"><h2>Messages</h2><div class="kicker"></div><button class="pill allread" title="Mark every message read">Mark all read</button></header>
      <div class="mchips" role="tablist" aria-label="Show"></div>
      <div class="body"></div>`;
    root.appendChild(el);
    this.el = el;
    this.chips = el.querySelector('.mchips') as HTMLElement;
    this.body = el.querySelector('.body') as HTMLElement;
    this.kicker = el.querySelector('.kicker') as HTMLElement;
    (el.querySelector('.close') as HTMLElement).addEventListener('click', () => this.toggle(false));
    (el.querySelector('.allread') as HTMLElement).addEventListener('click', () => this.deps.send({ type: 'messages', act: 'allread' }));
    el.addEventListener('click', (e) => this.click(e));
    el.addEventListener('change', (e) => {
      const box = (e.target as HTMLElement).closest('input[data-pop]') as HTMLInputElement | null;
      if (!box) return;
      const k = box.dataset.pop as MessageKind;
      if (box.checked) popupsOff.delete(k);
      else popupsOff.add(k);
      writeOff(popupsOff);
      this.key = '';
    });
  }

  get open(): boolean {
    return !this.el.hidden;
  }

  toggle(show = this.el.hidden): void {
    if (show === !this.el.hidden) return;
    this.el.hidden = !show;
    this.key = '';
    this.lastAt = -Infinity;
    if (show) {
      this.onOpen?.();
      this.body.scrollTop = 0;
    }
  }

  /** Show one filter ('all', or a category). */
  showFilter(f: MessageCat | 'all'): void {
    this.filter = f;
    this.key = '';
    this.body.scrollTop = 0;
  }

  /** The panel's text, for the smoke test. */
  get text(): string {
    return this.el.innerText;
  }

  private click(e: Event): void {
    const t = e.target as HTMLElement;
    const s = this.s;
    if (!s) return;
    const chip = t.closest('button[data-cat]') as HTMLElement | null;
    if (chip) return this.showFilter(chip.dataset.cat as MessageCat | 'all');
    const deal = t.closest('button[data-city]') as HTMLElement | null;
    if (deal) return this.deps.goCity(deal.dataset.city as CityId, deal.dataset.tab);
    const row = t.closest('.msg') as HTMLElement | null;
    if (!row) return;
    const id = Number(row.dataset.id);
    const m = s.messages.log.find((x) => x.id === id);
    if (!m) return;
    if (t.closest('.pin')) {
      this.deps.send({ type: 'messages', act: m.pin ? 'unpin' : 'pin', ids: [id] });
      return;
    }
    if (t.closest('.go')) {
      if (!m.read) this.deps.send({ type: 'messages', act: 'read', ids: [id] });
      this.deps.go(m);
      return;
    }
    if (t.closest('.markunread')) {
      this.deps.send({ type: 'messages', act: 'unread', ids: [id] });
      this.opened.delete(id);
      this.key = '';
      return;
    }
    if (t.closest('.row')) {
      if (this.opened.has(id)) this.opened.delete(id);
      else this.opened.add(id);
      if (!m.read) this.deps.send({ type: 'messages', act: 'read', ids: [id] });
      this.key = '';
      this.draw();
    }
  }

  /** Redraw now, if open and something changed (for the smoke test). */
  refresh(s: SimState, map: CoastMap): void {
    this.s = s;
    this.map = map;
    if (!this.el.hidden) this.draw();
  }

  /** Each frame: redraw (at most twice a second) while open, when something changed. */
  update(s: SimState, map: CoastMap, time: number): void {
    this.s = s;
    this.map = map;
    if (this.el.hidden || time - this.lastAt < 0.5) return;
    this.lastAt = time;
    this.draw();
  }

  private draw(): void {
    const s = this.s;
    const map = this.map;
    if (!s || !map) return;
    const g = s.messages;
    let pins = 0;
    let unreadN = 0;
    for (const m of g.log) {
      if (m.pin) pins++;
      if (!m.read) unreadN++;
    }
    // What waits on you: a ruler's threat or band you can still pay off, then the asks, offers and demands (these left the
    // lines under the top bar).
    const waiting: Array<{ city: string; text: string; raid: boolean; loan?: boolean }> = [];
    for (const r of s.world.raids) {
      const text = raidLine(s, map, r);
      if (text) waiting.push({ city: r.city, text, raid: true });
    }
    for (const d of dealsWaiting(s)) if (d.kind !== 'threat') waiting.push({ city: d.city, text: dealLine(s, map, d), raid: false });
    for (const l of loansWaiting(s)) waiting.push({ city: l.city, text: l.text, raid: false, loan: true });
    const wkey = waiting.map((w) => w.text).join('|');
    const key = `${this.filter}|${g.next}|${g.log.length}|${g.log[0]?.id ?? 0}|${unreadN}|${pins}|${[...this.opened].join(',')}|${wkey}|${g.since}|${[...popupsOff].join(',')}`;
    if (key === this.key) return;
    this.key = key;
    const scroll = this.body.scrollTop;
    this.kicker.textContent = unreadN ? `${unreadN} unread of ${g.log.length}` : g.log.length ? `${g.log.length} ${g.log.length === 1 ? 'message' : 'messages'}, all read` : 'Nothing yet';
    (this.el.querySelector('.allread') as HTMLButtonElement).disabled = unreadN === 0;
    // The filters, each with its count unread.
    const counts = new Map<MessageCat, number>();
    for (const m of g.log) if (!m.read) counts.set(catOf(m.kind), (counts.get(catOf(m.kind)) ?? 0) + 1);
    const chip = (cat: MessageCat | 'all', name: string, n: number): string =>
      `<button class="mchip${this.filter === cat ? ' on' : ''}" data-cat="${cat}" role="tab" aria-selected="${this.filter === cat}">${name}${n ? `<b>${n > 99 ? '99+' : n}</b>` : ''}</button>`;
    this.chips.innerHTML = chip('all', 'All', unreadN) + CATS.map((c) => chip(c, CAT_NAMES[c], counts.get(c) ?? 0)).join('');
    const parts: string[] = [];
    const waits = this.filter === 'all' || this.filter === 'greece' ? waiting : this.filter === 'war' ? waiting.filter((w) => w.raid) : [];
    if (waits.length) {
      parts.push(`<h3>Waiting on you</h3><ul class="waiting">${waits
        .slice(0, 6)
        .map((w) => `<li><button class="${w.raid ? 'raid' : ''}" data-city="${esc(w.city)}"${w.loan ? ' data-tab="loans"' : ''} title="Open the city’s page on the map of Greece">${w.raid ? ICONS.raid : w.loan ? ICONS.loan : ICONS.favour}<span>${esc(w.text)}.</span></button></li>`)
        .join('')}</ul>`);
    }
    const shown = g.log.filter((m) => this.filter === 'all' || catOf(m.kind) === this.filter);
    const pinned = shown.filter((m) => m.pin).reverse();
    if (pinned.length) parts.push(`<h3>Pinned</h3>${pinned.map((m) => this.row(s, m)).join('')}`);
    let month = '';
    let rows = 0;
    for (let i = shown.length - 1; i >= 0; i--) {
      const m = shown[i];
      if (m.pin) continue;
      const mo = monthOf(m.tick);
      if (mo !== month) {
        month = mo;
        parts.push(`<h3>${esc(mo)}</h3>`);
      }
      parts.push(this.row(s, m));
      rows++;
    }
    if (!rows && !pinned.length) {
      const what = this.filter === 'all' ? 'The town has heard nothing yet' : this.filter === 'health' ? 'Nothing about the town’s health yet' : `Nothing under ${CAT_NAMES[this.filter]} yet`;
      parts.push(`<p class="empty">${what}.</p>`);
    }
    if (g.since > 0) parts.push(`<p class="since">Messages from before this save weren’t kept: the town began keeping them on ${esc(dayOf(g.since))}, ${esc(formatYear(dateOfTick(g.since).yearBC))}.</p>`);
    // At the foot: which alarms pop up, and what the scroll keeps.
    parts.push(
      `<h3>Pop up for</h3><div class="pops">${POPUP_KINDS.map(
        (k) => `<label><input type="checkbox" data-pop="${k}"${popupsOff.has(k) ? '' : ' checked'}>${iconOfKind(k)}<span>${esc(KINDS[k].name)}</span></label>`,
      ).join('')}</div><p class="foot">Only alarms pop up, one at a time at the bottom left; everything else comes quietly into this scroll. It keeps the last ${['', 'one', 'two', 'three', 'four', 'five'][Math.round(KEEP_TICKS / TICKS_PER_YEAR)] ?? Math.round(KEEP_TICKS / TICKS_PER_YEAR)} years, at most ${MAX_MESSAGES} messages; pinned ones stay.</p>`,
    );
    this.body.innerHTML = parts.join('');
    this.body.scrollTop = scroll;
  }

  private row(s: SimState, m: Message): string {
    const open = this.opened.has(m.id);
    const go = m.at && this.deps.canGo(s, m) ? `<button class="go pill">Go there ›</button>` : '';
    const more = open ? `<div class="more"><p>${esc(m.words)}</p><div class="acts">${go}${m.read ? '<button class="markunread link">Mark unread</button>' : ''}</div></div>` : '';
    const title = titleOf(m);
    return `<div class="msg ${URGENCY[m.u]}${m.read ? '' : ' unread'}${open ? ' open' : ''}${m.pin ? ' pinned' : ''}" data-id="${m.id}"><button class="row" aria-expanded="${open}" title="${esc(open ? 'Click to fold' : m.words)}"><span class="ic">${iconOfKind(m.kind)}</span><span class="day">${dayOf(m.tick)}</span><span class="t">${esc(title)}</span></button><button class="pin" title="${m.pin ? 'Unpin' : 'Pin it to the top'}" aria-label="${m.pin ? 'Unpin' : 'Pin'}" aria-pressed="${!!m.pin}">${PIN}</button>${more}</div>`;
  }
}

// ---------------------------------------------------------------------------- the popups

/** How long a popup stays (seconds of real time), and how many may wait their turn. */
const POP_SECONDS = 6;
const POP_QUEUE = 3;

/**
 * Alarms popping up at the bottom left, one at a time: its icon, title and
 * words, and a link to its place. It fades after a few seconds (not while the
 * pointer is over it); a click goes there. At most three wait their turn; the
 * rest are in the scroll.
 */
export class MessagePopups {
  readonly el: HTMLElement;
  private queue: Message[] = [];
  private shown: Message | null = null;
  private until = 0;
  private gone = 0;
  private hover = false;
  private now = 0;

  constructor(
    root: HTMLElement,
    private go: (m: Message) => void,
    private read: (m: Message) => void,
  ) {
    const el = document.createElement('div');
    el.className = 'msg-pop';
    el.hidden = true;
    el.setAttribute('role', 'alert');
    root.appendChild(el);
    this.el = el;
    el.addEventListener('pointerenter', () => (this.hover = true));
    el.addEventListener('pointerleave', () => {
      this.hover = false;
      this.until = Math.max(this.until, this.now + 2);
    });
    el.addEventListener('click', (e) => {
      const m = this.shown;
      if (!m) return;
      if (!(e.target as HTMLElement).closest('.close')) {
        this.read(m);
        this.go(m);
      }
      this.next();
    });
  }

  /** Queue an alarm to pop up (false: the queue is full, and it waits in the scroll). */
  push(m: Message): boolean {
    if (this.queue.length >= POP_QUEUE) return false;
    this.queue.push(m);
    return true;
  }

  /** What is showing (for the smoke test). */
  get text(): string {
    return this.el.hidden ? '' : this.el.innerText;
  }

  /** Put every popup away (another town opened). */
  clear(): void {
    this.queue = [];
    this.shown = null;
    this.el.hidden = true;
  }

  private next(): void {
    this.shown = null;
    this.el.classList.add('out');
    this.gone = this.now + 0.4;
  }

  /** Each frame, with the screen's clock (seconds). */
  update(time: number): void {
    this.now = time;
    if (this.shown) {
      if (!this.hover && time > this.until) this.next();
      return;
    }
    if (time < this.gone) return;
    this.el.hidden = true;
    this.el.classList.remove('out');
    const m = this.queue.shift();
    if (!m) return;
    this.shown = m;
    this.until = time + POP_SECONDS;
    this.el.className = `msg-pop ${URGENCY[m.u]}`;
    // (The title in bold, then the rest of the words, not the title's again.)
    const title = titleOf(m);
    const after = m.words.startsWith(title) ? m.words.slice(title.length).replace(/^[\s,:;.·]+/, '') : m.words;
    const rest = after ? `${after[0].toUpperCase()}${after.slice(1)}` : '';
    this.el.innerHTML = `<span class="ic">${iconOfKind(m.kind)}</span><div class="txt"><b>${esc(title)}</b>${rest ? `<p>${esc(rest)}</p>` : ''}${m.at ? '<span class="go">Click to go there</span>' : ''}</div><button class="close" title="Put away" aria-label="Put away">×</button>`;
    this.el.hidden = false;
  }
}
