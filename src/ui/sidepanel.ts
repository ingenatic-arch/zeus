/**
 * The side panel down the right of the screen, as in the original game: the
 * minimap at the top, then the city's information in tabs.
 *
 * - **Goods**: every ware, what the city holds of it and its net last month;
 *   click one for its page: how much and where it is kept, what made it and
 *   where it went (homes by district, workshops, the ship), this month and
 *   last, the year's chart, and what would help.
 * - **People**: who lives in the city, in what homes, who has work, and the
 *   homes in trouble.
 * - **Services**: how many homes that need each service have it, and the
 *   fire and wear across the town; a click shows the service's overlay.
 * - **Money**: the treasury, last month and this one, the tax rate, and the
 *   ledger.
 *
 * It only reads the sim state (refreshing a few times a second while open);
 * clicks call back into the game (fly the camera, show an overlay, open the
 * ledger or a household).
 */
import { districtTitle, DISTRICTS } from '../map/districts';
import type { CoastMap } from '../map/bake';
import type { OverlayMode } from '../render/overlay';
import { BUILDING_NAMES, centreOf, HOME_NAMES, jobsAt, TOP_LEVEL } from '../sim/buildings';
import { districtAt } from '../map/districts';
import { START_MONTH, TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_SECOND } from '../sim/clock';
import { citySells, lackWords, NEED_WORDS, NEEDS, needsOf, untilOf, warningsOf } from '../sim/folk';
import { GOOD_SERVICE, isGood, type Ware } from '../sim/foods';
import { burnable, HAZARD_MARK, wears } from '../sim/hazards';
import { canWorkIn, workforce } from '../sim/labour';
import { armyHtml } from './armytab';
import type { Command } from '../sim/commands';
import { arrivalOutlook, type Outlook } from '../sim/settlers';
import type { Building, BuildingKind, Service, SimState } from '../sim/state';
import { bookNow, flowRows, makersOf, monthOf, panelWares, stockOf, totalsOf, usersOf, WARE_GROUPS, wareInfo, type FlowRow, type WareMonth } from '../sim/stocks';
import { TAX_RATES, taxedLately } from '../sim/taxes';
import { kindTotal, monthOf as ledgerMonth, owedWages, totals } from '../sim/treasury';
import { Minimap } from './minimap';
import { morph } from './morph';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (n: number): string => Math.round(Math.abs(n)).toLocaleString('en-GB');
const signed = (n: number): string => (Math.round(n) > 0 ? `+${fmt(n)}` : Math.round(n) < 0 ? `−${fmt(n)}` : '0');
const cap = (t: string): string => (t ? `${t[0].toUpperCase()}${t.slice(1)}` : t);
const lower = (t: string): string => (t ? `${t[0].toLowerCase()}${t.slice(1)}` : t);

export type SideTab = 'goods' | 'people' | 'services' | 'money' | 'army';
const TABS: ReadonlyArray<{ tab: SideTab; label: string; tip: string }> = [
  { tab: 'goods', label: 'Goods', tip: 'What the city makes, keeps and uses' },
  { tab: 'people', label: 'People', tip: 'Who lives here, in what homes, and who has work' },
  { tab: 'services', label: 'Services', tip: 'What reaches the homes that need it, and fire and wear' },
  { tab: 'money', label: 'Money', tip: 'The treasury, taxes and wages' },
  { tab: 'army', label: 'Army', tip: 'The barracks, their companies and the city’s strength' },
];

const TAB_ICONS: Record<SideTab, string> = {
  goods: '<svg viewBox="0 0 24 24"><path d="M9.6 2.6h4.8l-.6 2.8c3.2 1.2 5 4.4 5 8 0 4-2.4 7-5.2 8H10.4c-2.8-1-5.2-4-5.2-8 0-3.6 1.8-6.8 5-8z" class="f"/><path d="M6 11.4h12" class="s"/></svg>',
  people: '<svg viewBox="0 0 20 16"><circle cx="7" cy="4" r="2.6" class="f"/><path d="M2.4 15c0-3.6 2-6 4.6-6s4.6 2.4 4.6 6z" class="f"/><circle cx="14" cy="5.2" r="2.1" class="f"/><path d="M12.6 15c.1-2.4-.4-4.2-1.3-5.2.8-.5 1.6-.7 2.7-.7 2.2 0 3.8 2 3.8 5.9z" class="f"/></svg>',
  services: '<svg viewBox="0 0 24 24"><path d="M12 2.8c3.3 4.6 6.2 8.2 6.2 11.6a6.2 6.2 0 0 1-12.4 0c0-3.4 2.9-7 6.2-11.6z" class="f"/><path d="M9.2 14.6a2.8 2.8 0 0 0 2.6 2.6" class="s"/></svg>',
  army: '<svg viewBox="0 0 24 24"><circle cx="11" cy="13" r="7.4" class="f"/><circle cx="11" cy="13" r="2.2" class="s"/><path d="M19.4 2v20" class="s"/></svg>',
  money: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.6" class="f"/><circle cx="8" cy="8" r="4.4" class="s"/><path d="M8 5.2l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" class="m"/></svg>',
};

/** A small picture of each ware. */
const WARE_ICONS: Record<number, string> = {
  0: '<svg viewBox="0 0 24 24" class="ware"><path d="M12 21V8M12 21 8 10M12 21l4-11" stroke="#8a6418" stroke-width="1.3" fill="none" stroke-linecap="round"/><g fill="#e0b84a" stroke="#8a6418" stroke-width="0.9"><ellipse cx="12" cy="5.4" rx="1.7" ry="3"/><ellipse cx="7.6" cy="7.4" rx="1.6" ry="2.8" transform="rotate(-22 7.6 7.4)"/><ellipse cx="16.4" cy="7.4" rx="1.6" ry="2.8" transform="rotate(22 16.4 7.4)"/></g><path d="M8.6 15.4h6.8" stroke="#a24e2c" stroke-width="1.6" stroke-linecap="round"/></svg>',
  1: '<svg viewBox="0 0 24 24" class="ware"><path d="M14.6 3.6c3.6 0 6 2.6 6 5.8 0 4-3.8 6.6-7.6 6.6l-3.2 3.2a1.9 1.9 0 1 1-2.6-2.6l3.2-3.2c0-3.8 1.6-9.8 4.2-9.8z" fill="#c4614a" stroke="#6e2a1e" stroke-width="1.1" stroke-linejoin="round"/><path d="M15.6 6.4c1.6.4 2.6 1.6 2.6 3" stroke="#f0c2a8" stroke-width="1.2" fill="none" stroke-linecap="round"/><circle cx="6.2" cy="19.4" r="1.6" fill="#f3ead2" stroke="#6e2a1e" stroke-width="0.9"/></svg>',
  2: '<svg viewBox="0 0 24 24" class="ware"><path d="M2.8 15.6 19.6 7.2l1.6 2.6v7.4H2.8z" fill="#f1d36a" stroke="#8a6a18" stroke-width="1.1" stroke-linejoin="round"/><path d="M2.8 15.6h18.4" stroke="#8a6a18" stroke-width="1.1"/><g fill="#c9a43a"><circle cx="8" cy="13.2" r="1.1"/><circle cx="14.6" cy="10.8" r="0.9"/><circle cx="12" cy="16.4" r="1"/><circle cx="17.6" cy="15.2" r="1.2"/></g></svg>',
  3: '<svg viewBox="0 0 24 24" class="ware"><path d="M3.6 6.4C9 5 14.6 7 20.4 4.6" stroke="#6e5641" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M9 6.2c-.8 2.6-3 3.6-5 3.2.6-2.4 2.6-3.6 5-3.2zM15.4 6c1.6 1.8 4 2 5.4.8-1.4-1.8-3.6-2-5.4-.8z" fill="#9cab72" stroke="#5f6f3a" stroke-width="0.9"/><ellipse cx="10.4" cy="13.4" rx="3" ry="3.8" fill="#5f6f2c" stroke="#33401a" stroke-width="1"/><ellipse cx="15.6" cy="15.6" rx="2.8" ry="3.6" fill="#3e3a4a" stroke="#22202a" stroke-width="1"/><path d="M9.2 11.8q.6-1 1.6-1.2" stroke="#d6e690" stroke-width="1" fill="none" stroke-linecap="round"/></svg>',
  4: '<svg viewBox="0 0 24 24" class="ware"><path d="M10.4 3h3.2l-.3 3.2c3.6.9 5.4 3.9 5.4 7.3 0 3.6-2.2 6.4-4.6 7.5H9.9C7.5 19.9 5.3 17.1 5.3 13.5c0-3.4 1.8-6.4 5.4-7.3z" fill="#8aa83a" stroke="#3e4f12" stroke-width="1.2" stroke-linejoin="round"/><path d="M7.8 6.8C6 6.6 5.4 8.4 6.6 9.6M16.2 6.8c1.8-.2 2.4 1.6 1.2 2.8" fill="none" stroke="#3e4f12" stroke-width="1.2" stroke-linecap="round"/><path d="M9 12.6q.4-2.4 2.2-3.2" fill="none" stroke="#d6e690" stroke-width="1.3" stroke-linecap="round"/></svg>',
  5: '<svg viewBox="0 0 24 24" class="ware"><path d="M5.2 14.6c-2.6-.4-3-4 -.4-4.8-.6-2.8 2.4-4.4 4.4-3 1-2.4 4.6-2.4 5.6 0 2-1.4 5 .2 4.4 3 2.6.8 2.2 4.4-.4 4.8.2 2.6-2.6 4.2-4.8 3-1.2 1.8-3.8 1.8-5 0-2.2 1.2-5-.4-4.8-3z" fill="#eee2c0" stroke="#8a744a" stroke-width="1.2" stroke-linejoin="round"/><path d="M11.4 4.6l.6 15" stroke="#4c5a8c" stroke-width="1.8" stroke-linecap="round"/></svg>',
  6: '<svg viewBox="0 0 24 24" class="ware"><path d="M12.6 5.2c1.8-2.4 4.8-2.8 6.8-1.4-1.6 2.2-4 2.8-6.8 1.4z" fill="#6a9a34" stroke="#3a5a1a" stroke-width="1"/><path d="M11.6 6.6V3.4" stroke="#6a4a22" stroke-width="1.4" stroke-linecap="round"/><g fill="#7a2e80" stroke="#3e1240" stroke-width="1"><circle cx="7.6" cy="9" r="2.3"/><circle cx="12" cy="9" r="2.3"/><circle cx="16.4" cy="9" r="2.3"/><circle cx="9.8" cy="12.8" r="2.3"/><circle cx="14.2" cy="12.8" r="2.3"/><circle cx="12" cy="16.6" r="2.3"/></g></svg>',
  7: '<svg viewBox="0 0 24 24" class="ware"><path d="M3.4 7.6h17.2c-.4 3.8-3.6 6.4-8.6 6.4S3.8 11.4 3.4 7.6z" fill="#8e2f4e" stroke="#4a1428" stroke-width="1.1" stroke-linejoin="round"/><path d="M3.4 7.6h17.2" stroke="#4a1428" stroke-width="1.1"/><path d="M12 14v4.6M8 20.4h8" stroke="#4a1428" stroke-width="1.6" stroke-linecap="round"/><path d="M1.8 8.6c-1 1.6.2 3 1.8 2.6M22.2 8.6c1 1.6-.2 3-1.8 2.6" stroke="#4a1428" stroke-width="1.1" fill="none" stroke-linecap="round"/><path d="M6 9.4q2 1.4 4.6 1.6" stroke="#e0a0b8" stroke-width="1" fill="none" stroke-linecap="round"/></svg>',
};
const wareIcon = (w: Ware): string => WARE_ICONS[w] ?? `<svg viewBox="0 0 24 24" class="ware"><circle cx="12" cy="12" r="7" fill="${wareInfo(w).colour}" stroke="#4a3420" stroke-width="1.1"/></svg>`;

/** Each service's picture (as in the household panel) and how the panel says it. */
const SERVICE_ROWS: ReadonlyArray<{ need: Service; label: string; colour: string }> = [
  { need: 'water', label: 'Water', colour: '#4f9be0' },
  { need: 'food', label: 'Food', colour: '#e0a548' },
  { need: 'religion', label: 'Blessings', colour: '#a98ae0' },
  { need: 'oil', label: 'Olive oil', colour: '#8aa83a' },
  { need: 'culture', label: 'Plays', colour: '#e3778f' },
  { need: 'fleece', label: 'Fleece', colour: '#c8b68a' },
  { need: 'wine', label: 'Wine', colour: '#8e2f4e' },
];

/** How to start making a ware, for its page when nothing makes it yet. */
const HOW_TO_MAKE: Partial<Record<BuildingKind, string>> = {
  farm: 'a wheat farm (M) on the green land by the river',
  lodge: 'a hunting lodge (M twice) near the deer or the boar',
  dairy: 'a dairy (M three times) on green grass',
  grove: 'an olive grove (M four times) on the dry slopes',
  press: 'an olive press (M five times), with olive groves to fill it',
  pasture: 'a sheep pasture (M six times) on green grass',
  vineyard: 'a vineyard (M seven times) on the sunny slopes',
  winery: 'a winery (M eight times), with vineyards to fill it',
};

/** What a kind of workplace is called, many of them, for "2 of 6 farms". */
const MANY: Partial<Record<BuildingKind, string>> = {
  farm: 'farms',
  lodge: 'lodges',
  dairy: 'dairies',
  grove: 'groves',
  press: 'presses',
  pasture: 'pastures',
  vineyard: 'vineyards',
  winery: 'wineries',
  granary: 'granaries',
  storehouse: 'storehouses',
};

/** "A granary by the bay". */
function placeName(b: Building, map: CoastMap): string {
  const [cx, cz] = centreOf(b);
  const name = b.kind === 'home' ? 'A home' : BUILDING_NAMES[b.kind];
  const n = b.kind === 'agora' ? 'The agora’s stalls' : b.kind === 'trading' ? 'The quay' : name;
  return `${n} ${lower(districtTitle(districtAt(map, cx, cz)))}`;
}

/** Callbacks into the game. */
export interface SideHooks {
  /** Fly the camera to a world point (`jump`: at once, for dragging on the minimap). */
  goTo(x: number, z: number, jump?: boolean): void;
  /** Show a service's overlay (or hide it if it shows). */
  overlay(mode: OverlayMode): void;
  overlayMode(): OverlayMode | null;
  /** Open the ledger, the tax rates card, a household's panel. */
  ledger(): void;
  rates(): void;
  openHome(id: number): void;
  /** The panel opened or closed (the view makes room for it). */
  toggled(open: boolean): void;
  /** The Army tab: send a command (raise, dismiss, back to barracks), take a company's banner in hand, and which is in hand. */
  army(c: Command): void;
  selectCompany(id: number): void;
  selected(): number;
}

/** Remembered between visits (where the browser lets it): whether the panel is open, and the tab. */
const STORE_KEY = 'zeus-remake.side';

export class SidePanel {
  readonly el: HTMLElement;
  readonly minimap: Minimap;
  private readonly body: HTMLElement;
  private readonly tabsEl: HTMLElement;
  private tab: SideTab = 'goods';
  /** The ware whose page is open on the goods tab (-1: the list). */
  private ware = -1;
  private shownAt = -Infinity;
  private outlook: Outlook | null = null;
  private outlookAt = -Infinity;
  private isOpen = true;
  private lastHtml = '';

  constructor(
    root: HTMLElement,
    private readonly map: CoastMap,
    private readonly hooks: SideHooks,
    startOpen: boolean,
  ) {
    const el = document.createElement('aside');
    el.className = 'side';
    el.setAttribute('aria-label', 'City information');
    el.innerHTML = `<div class="side-head"></div><div class="side-map"></div><nav class="side-tabs" role="tablist"></nav><div class="side-body"></div>`;
    // First in the UI layer, so the corner's buttons and the cards they open lie over it.
    root.prepend(el);
    this.el = el;
    this.minimap = new Minimap(map, (x, z, fly) => hooks.goTo(x, z, !fly));
    (el.querySelector('.side-map') as HTMLElement).appendChild(this.minimap.el);
    this.tabsEl = el.querySelector('.side-tabs') as HTMLElement;
    this.tabsEl.innerHTML = TABS.map((t) => `<button role="tab" class="side-tab" data-tab="${t.tab}" title="${esc(t.tip)}">${TAB_ICONS[t.tab]}<span>${t.label}</span></button>`).join('');
    this.body = el.querySelector('.side-body') as HTMLElement;
    let saved: { open?: boolean; tab?: SideTab } = {};
    try {
      saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') as typeof saved;
    } catch {
      /* No storage here: start as the window suggests. */
    }
    if (saved.tab && TABS.some((t) => t.tab === saved.tab)) this.tab = saved.tab;
    this.isOpen = saved.open ?? startOpen;
    this.tabsEl.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('.side-tab') as HTMLElement | null;
      if (!b) return;
      const t = b.dataset.tab as SideTab;
      if (t === this.tab && this.ware >= 0) this.ware = -1;
      this.tab = t;
      this.remember();
      this.refresh();
    });
    this.body.addEventListener('click', (e) => this.clicked(e));
    this.body.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && (e.target as HTMLElement).matches('[data-act]')) {
        e.preventDefault();
        this.clicked(e);
      }
    });
    this.showTabs();
    this.apply();
  }

  get open(): boolean {
    return this.isOpen;
  }

  /** Show or hide the panel (toggles without an argument). */
  toggle(show = !this.isOpen): void {
    if (show === this.isOpen) return;
    this.isOpen = show;
    this.remember();
    this.apply();
  }

  /** Open the goods tab on a ware's page. */
  showWare(w: Ware): void {
    this.tab = 'goods';
    this.ware = w;
    this.toggle(true);
    this.refresh();
  }

  /** Open a tab. */
  showTab(t: SideTab): void {
    this.tab = t;
    this.ware = -1;
    this.toggle(true);
    this.refresh();
  }

  private remember(): void {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ open: this.isOpen, tab: this.tab }));
    } catch {
      /* Not kept: fine. */
    }
  }

  private apply(): void {
    this.el.hidden = !this.isOpen;
    const ui = this.el.parentElement;
    ui?.classList.toggle('side-open', this.isOpen);
    document.getElementById('app')?.classList.toggle('side-open', this.isOpen);
    this.shownAt = -Infinity;
    this.hooks.toggled(this.isOpen);
  }

  private showTabs(): void {
    for (const b of this.tabsEl.querySelectorAll('.side-tab')) {
      const on = (b as HTMLElement).dataset.tab === this.tab;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
    }
  }

  private s: SimState | null = null;

  private refresh(): void {
    this.showTabs();
    this.shownAt = -Infinity;
    if (this.s) this.render(this.s);
  }

  /** What the panel says now (for the probe). */
  get text(): string {
    return this.isOpen ? (this.body.textContent ?? '') : '';
  }

  get tabNow(): SideTab {
    return this.tab;
  }

  get wareNow(): number {
    return this.ware;
  }

  private clicked(e: Event): void {
    const a = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
    if (!a) return;
    const act = a.dataset.act;
    if (act === 'ware') {
      this.ware = Number(a.dataset.ware);
      this.body.scrollTop = 0;
      this.refresh();
    } else if (act === 'back') {
      this.ware = -1;
      this.refresh();
    } else if (act === 'go') {
      this.hooks.goTo(Number(a.dataset.x), Number(a.dataset.z));
    } else if (act === 'home') {
      this.hooks.openHome(Number(a.dataset.id));
      this.hooks.goTo(Number(a.dataset.x), Number(a.dataset.z));
    } else if (act === 'overlay') {
      this.hooks.overlay(a.dataset.mode as OverlayMode);
      this.refresh();
    } else if (act === 'ledger') this.hooks.ledger();
    else if (act === 'rates') this.hooks.rates();
    else if (act === 'company') this.hooks.selectCompany(Number(a.dataset.id));
    else if (act === 'recall') this.hooks.army({ type: 'banner', company: Number(a.dataset.id), tile: -1 });
    else if (act === 'dismiss') this.hooks.army({ type: 'dismiss', company: Number(a.dataset.id) });
    else if (act === 'raise') this.hooks.army({ type: 'raise', barracks: Number(a.dataset.id), kind: a.dataset.kind === 'archer' ? 'archer' : 'hoplite' });
    if (act === 'company' || act === 'recall' || act === 'dismiss' || act === 'raise') {
      this.shownAt = -Infinity;
      if (this.s) this.render(this.s);
    }
  }

  /** The barracks picked out on the Army tab (clicked in the city), or 0. */
  private armyFocus = 0;

  /** Open the Army tab, a barracks picked out. */
  showBarracks(id: number): void {
    this.armyFocus = id;
    this.showTab('army');
    const el = this.body.querySelector(`[data-barracks="${id}"]`);
    if (el && 'scrollIntoView' in el) (el as HTMLElement).scrollIntoView({ block: 'nearest' });
  }

  /** Bring the panel up to date (a few times a second while it shows). */
  update(s: SimState, time: number): void {
    this.s = s;
    if (!this.isOpen) return;
    if (time - this.shownAt < 0.3) return;
    this.shownAt = time;
    if (time - this.outlookAt > 2) {
      this.outlookAt = time;
      this.outlook = this.tab === 'people' ? arrivalOutlook(s, this.map) : null;
    }
    this.render(s);
  }

  /** The current tab's HTML. */
  html(s: SimState): string {
    if (this.tab === 'people' && !this.outlook) this.outlook = arrivalOutlook(s, this.map);
    return this.tab === 'goods' ? (this.ware >= 0 ? this.warePage(s, this.ware) : this.goodsList(s)) : this.tab === 'people' ? this.people(s) : this.tab === 'services' ? this.services(s) : this.tab === 'army' ? armyHtml(s, this.map, this.armyFocus, this.hooks.selected()) : this.money(s);
  }

  private render(s: SimState): void {
    const html = this.html(s);
    if (html === this.lastHtml) return;
    this.lastHtml = html;
    morph(this.body, html);
  }

  // -------------------------------------------------------------------------
  // Goods.

  /** The month the panel quotes for a ware: last month if the book saw all of it, else this month so far. */
  private quoted(s: SimState, w: Ware): { m: WareMonth; full: boolean } {
    const b = bookNow(s);
    if (b.full) return { m: totalsOf(b.last, w), full: true };
    return { m: totalsOf(b.now, w), full: false };
  }

  private goodsList(s: SimState): string {
    const b = bookNow(s);
    const out: string[] = [];
    out.push(`<p class="side-note">${b.full ? 'In store now, and the net of last month: made and bought, less used, sold and lost.' : 'In store now, and the net so far this month: made and bought, less used, sold and lost.'} Click a good for more.</p>`);
    for (const g of WARE_GROUPS) {
      const ws = panelWares().filter((w) => wareInfo(w).group === g.group);
      if (!ws.length) continue;
      out.push(`<h3>${g.title}</h3><ul class="wares">`);
      for (const w of ws) {
        const st = stockOf(s, w);
        const { m } = this.quoted(s, w);
        const any = st.total > 0 || m.made + m.used + m.sold + m.bought + m.lost > 0 || makersOf(s, w).count > 0;
        const net = m.net;
        const arrow = net > 0 ? '<i class="up"></i>' : net < 0 ? '<i class="down"></i>' : '';
        const info = wareInfo(w);
        const tip = `${info.name}: ${fmt(st.total)} ${info.unit} in the city · ${b.full ? 'last month' : 'this month so far'} made ${fmt(m.made)}, used ${fmt(m.used)}${m.sold ? `, sold ${fmt(m.sold)}` : ''}${m.bought ? `, bought ${fmt(m.bought)}` : ''}${m.lost ? `, lost ${fmt(m.lost)}` : ''}`;
        out.push(
          `<li class="${any ? '' : 'none'}"><button class="ware-row" data-act="ware" data-ware="${w}" title="${esc(tip)}">${wareIcon(w)}<span class="nm">${esc(info.name)}</span><span class="amt">${any ? fmt(st.total) : '—'}</span><span class="net ${net > 0 ? 'up' : net < 0 ? 'down' : ''}">${any ? `${arrow}${signed(net)}` : ''}</span></button></li>`,
        );
      }
      out.push('</ul>');
    }
    return out.join('');
  }

  /** The year's chart: a pair of bars a month, what came in above the line and what went out below, this month's lighter at the end. */
  private chart(s: SimState, w: Ware): string {
    const b = bookNow(s);
    const months = b.months.slice(-11).map((m) => ({ m: monthOf(m, w), month: m.month, now: false }));
    months.push({ m: totalsOf(b.now, w), month: Math.floor(s.tick / TICKS_PER_MONTH), now: true });
    const top = Math.max(1, ...months.map((x) => Math.max(x.m.made + x.m.bought, x.m.used + x.m.sold + x.m.lost)));
    const W = 252;
    const H = 96;
    const mid = 46;
    const slot = W / 12;
    const bw = slot * 0.62;
    const colour = wareInfo(w).colour;
    const parts: string[] = [];
    parts.push(`<line x1="0" x2="${W}" y1="${mid}" y2="${mid}" class="axis"/>`);
    const NAMES = 'JFMAMJJASOND';
    months.forEach((x, i) => {
      const left = (12 - months.length + i) * slot + (slot - bw) / 2;
      const up = ((x.m.made + x.m.bought) / top) * (mid - 6);
      const down = ((x.m.used + x.m.sold + x.m.lost) / top) * (mid - 6);
      const op = x.now ? ' opacity="0.5"' : '';
      if (up > 0) parts.push(`<rect x="${left.toFixed(1)}" y="${(mid - up).toFixed(1)}" width="${bw.toFixed(1)}" height="${up.toFixed(1)}" rx="1.5" fill="${colour}"${op}/>`);
      if (down > 0) parts.push(`<rect x="${left.toFixed(1)}" y="${mid}" width="${bw.toFixed(1)}" height="${down.toFixed(1)}" rx="1.5" class="out"${op}/>`);
      // The month's letter (month 0 since the founding is the founding month).
      const letter = NAMES[(x.month + START_MONTH) % 12];
      parts.push(`<text x="${(left + bw / 2).toFixed(1)}" y="${H - 2}" class="${x.now ? 'now' : ''}">${letter}</text>`);
    });
    const key = `<p class="chart-key"><i style="background:${colour}"></i>made and bought <i class="out"></i>used, sold and lost <span>tallest ${fmt(top)}</span></p>`;
    return key + `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="The last twelve months of ${esc(wareInfo(w).name.toLowerCase())}: made and bought above the line, used, sold and lost below">${parts.join('')}</svg>`;
  }

  private warePage(s: SimState, w: Ware): string {
    const info = wareInfo(w);
    const st = stockOf(s, w);
    const b = bookNow(s);
    const { m, full } = this.quoted(s, w);
    const out: string[] = [];
    out.push(`<button class="back" data-act="back">‹ All goods</button>`);
    out.push(`<header class="ware-head">${wareIcon(w)}<div><h2>${esc(info.name)}</h2><p>${fmt(st.total)} ${info.unit} in the city</p></div></header>`);
    // The net, in words.
    const when = full ? 'Last month' : 'This month so far';
    const net = m.net;
    const words = net > 0 ? 'more came in than went out' : net < 0 ? 'more went out than came in' : m.made + m.used ? 'as much went out as came in' : 'nothing came in or went out';
    out.push(`<div class="netline ${net > 0 ? 'up' : net < 0 ? 'down' : ''}"><span class="big">${signed(net)}</span><span>${when}: ${words}.</span></div>`);
    out.push(
      `<dl class="sums"><div><dt>Made</dt><dd>${fmt(m.made)}</dd></div><div><dt>Used</dt><dd>${fmt(m.used)}</dd></div>${m.sold ? `<div><dt>Sold</dt><dd>${fmt(m.sold)}</dd></div>` : ''}${m.bought ? `<div><dt>Bought</dt><dd>${fmt(m.bought)}</dd></div>` : ''}${m.lost ? `<div><dt>Lost</dt><dd>${fmt(m.lost)}</dd></div>` : ''}</dl>`,
    );
    out.push(this.chart(s, w));
    // What would help.
    const hints = this.hints(s, w, st.total, m, full);
    if (hints.length) out.push(`<ul class="hints">${hints.map((h) => `<li class="${h.bad ? 'bad' : ''}">${h.text}</li>`).join('')}</ul>`);
    // The breakdown, this month and last.
    const rows = flowRows(s, w, DISTRICTS);
    const HEAD: Record<string, string> = { made: 'Made by', used: 'Used by', sold: 'Sold to', bought: 'Bought from', lost: 'Lost' };
    if (rows.length) {
      const body: string[] = [];
      let kind = '';
      for (const r of rows) {
        if (r.kind !== kind) {
          kind = r.kind;
          body.push(`<tr class="head"><th colspan="3">${HEAD[kind] ?? kind}</th></tr>`);
        }
        body.push(this.flowRow(s, r));
      }
      out.push(`<h3>Where it comes from and goes</h3><table class="flows"><thead><tr><th></th><th>This month<small>so far</small></th><th>Last month</th></tr></thead><tbody>${body.join('')}</tbody></table>`);
    } else if (b.months.length === 0 && b.now.length === 0) {
      out.push('<p class="side-note">Nothing noted yet: what is made, used and sold shows here from this month on.</p>');
    }
    // Where it is kept.
    if (st.places.length || st.moving) {
      out.push('<h3>Where it is kept</h3><ul class="places">');
      for (const p of st.places.slice(0, 6)) {
        const [cx, cz] = centreOf(p.b);
        const share = p.room > 0 ? Math.min(1, p.n / p.room) : 0;
        out.push(
          `<li><button data-act="go" data-x="${cx}" data-z="${cz}" title="Go there">${esc(placeName(p.b, this.map))}</button><span class="n">${fmt(p.n)}${p.room ? `<small> / ${fmt(p.room)}</small>` : ''}</span>${p.room ? `<i class="fill"><b style="width:${(share * 100).toFixed(0)}%"></b></i>` : ''}</li>`,
        );
      }
      const more = st.places.length - 6;
      if (more > 0) out.push(`<li class="more">and ${more} more ${more === 1 ? 'place' : 'places'} (${fmt(st.places.slice(6).reduce((a, p) => a + p.n, 0))})</li>`);
      if (st.moving) out.push(`<li class="more">On its way between them: ${fmt(st.moving)}</li>`);
      out.push('</ul>');
    }
    return out.join('');
  }

  private flowRow(s: SimState, r: FlowRow): string {
    const cell = (n: number): string => (n ? `<td class="amt">${fmt(n)}</td>` : '<td class="amt nil">·</td>');
    let label = esc(r.label);
    // A maker's line says how many there are now.
    if (r.kind === 'made' || (r.kind === 'used' && !r.at)) {
      const n = s.buildings.filter((b) => b.kind === r.what).length;
      if (n) label += ` <small>${n}</small>`;
    }
    const name = r.at ? `<button data-act="go" data-x="${r.at.x}" data-z="${r.at.z}" title="Go there">${label}</button>` : label;
    return `<tr><td class="what">${name}</td>${cell(r.now)}${cell(r.last)}</tr>`;
  }

  /** A few lines on what is going on with a ware, and what would help. */
  private hints(s: SimState, w: Ware, total: number, m: WareMonth, full: boolean): Array<{ text: string; bad?: boolean }> {
    const out: Array<{ text: string; bad?: boolean }> = [];
    const info = wareInfo(w);
    const name = info.name.toLowerCase();
    const mk = makersOf(s, w);
    if (mk.kind && mk.count === 0 && m.bought === 0) {
      out.push({ text: `Nothing makes ${esc(name)} yet: build ${esc(HOW_TO_MAKE[mk.kind] ?? 'a workshop for it')}.` });
      return out;
    }
    if (mk.idle + mk.short > 0) {
      const many = MANY[mk.kind as BuildingKind] ?? 'workplaces';
      const n = mk.idle + mk.short;
      out.push({ text: `${n} of ${mk.count} ${many} ${n === 1 ? 'is' : 'are'} short of workers (or wages), so ${n === 1 ? 'it makes' : 'they make'} less. More homes near them by road would help.`, bad: true });
    }
    // A workshop with nothing to work up.
    const input = mk.kind ? (mk.kind === 'press' ? 3 : mk.kind === 'winery' ? 6 : -1) : -1;
    if (input >= 0 && mk.count > 0 && stockOf(s, input).total === 0) {
      const one = mk.count === 1;
      const feeder = input === 3 ? 'olive groves' : 'vineyards';
      out.push({ text: `${one ? `The ${mk.kind === 'press' ? 'press' : 'winery'} has` : `The ${MANY[mk.kind as BuildingKind]} have`} used up ${esc(wareInfo(input).name.toLowerCase())}: more ${feeder} would keep ${one ? 'it' : 'them'} busy.`, bad: true });
    }
    // A good homes buy at a stall: is it on sale?
    const svc = GOOD_SERVICE[w];
    if (svc && isGood(w) && !citySells(s, w) && total > 0) out.push({ text: `No agora has a ${esc(name.replace('olive ', ''))} stall, so it stays in store: add one (K).`, bad: true });
    // Workshops that use it.
    const users = usersOf(s, w);
    if (users.kind && users.count === 0 && total > 0) out.push({ text: `Nothing uses ${esc(name)} yet: ${esc(HOW_TO_MAKE[users.kind] ?? 'build a workshop')}.` });
    // How long it lasts, or how full the stores are.
    if (full && m.net < 0 && total > 0) {
      const months = total / -m.net;
      out.push({ text: months < 2 ? `At last month’s rate the ${esc(name)} runs out within ${months < 1 ? 'the month' : 'two months'}.` : `At last month’s rate the city’s ${esc(name)} lasts about ${Math.round(months)} months.`, bad: months < 3 });
    }
    const st = stockOf(s, w);
    const stores = st.places.filter((p) => (p.b.kind === 'granary' || p.b.kind === 'storehouse') && p.room > 0);
    if (stores.length && stores.every((p) => p.n >= p.room * 0.95)) {
      const kind = stores[0].b.kind;
      out.push({ text: `The ${MANY[kind]} are full of ${esc(name)}: another ${kind} (G${kind === 'storehouse' ? ' twice' : ''}) or selling it at the trading post would make room.`, bad: true });
    }
    return out;
  }

  // -------------------------------------------------------------------------
  // People.

  private people(s: SimState): string {
    const homes = s.buildings.filter((b) => b.kind === 'home' && b.level > 0 && b.people > 0);
    const out: string[] = [];
    out.push(`<div class="bigline"><span class="big">${fmt(s.population)}</span><span>people live in ${fmt(homes.length)} ${homes.length === 1 ? 'home' : 'homes'}</span></div>`);
    const o = this.outlook;
    if (o) {
      let why: string;
      if (!o.road) why = 'Settlers come in where a road meets the edge of the map: lay one to the edge.';
      else if (o.room === 0 && o.cutOff > 0)
      why = `No room for newcomers: ${o.cutOff === 1 ? 'the empty plot you marked out has' : `the ${fmt(o.cutOff)} empty plots you marked out have`} no road beside ${o.cutOff === 1 ? 'it' : 'them'} that leads to the edge of the map. Lay a road past ${o.cutOff === 1 ? 'it' : 'them'}.`;
    else if (o.room === 0) why = 'No room for newcomers: mark out more plots, or bring water so tents grow into huts.';
      else {
        const secs = o.interval / TICKS_PER_SECOND;
        why = `Room for ${fmt(o.room)} more; newcomers about every ${secs < 1.95 ? secs.toFixed(1) : Math.round(secs)} seconds at normal speed${o.harsh ? ' (a third as often: taxes are harsh)' : ''}.`;
      }
      out.push(`<p class="side-note">${esc(why)}</p>`);
    }
    // Homes by level.
    out.push('<h3>Homes</h3><table class="levels"><tbody>');
    const most = Math.max(1, ...Array.from({ length: TOP_LEVEL }, (_, i) => homes.filter((b) => b.level === i + 1).reduce((a, b) => a + b.people, 0)));
    for (let lv = TOP_LEVEL; lv >= 1; lv--) {
      const at = homes.filter((b) => b.level === lv);
      if (!at.length) continue;
      const people = at.reduce((a, b) => a + b.people, 0);
      const name = HOME_NAMES[lv].replace(/^An? /, '');
      out.push(`<tr><td class="what">${at.length} ${esc(at.length === 1 ? lower(name) : plural(lower(name)))}</td><td class="bar"><i style="width:${((people / most) * 100).toFixed(0)}%"></i></td><td class="amt">${fmt(people)}</td></tr>`);
    }
    const plots = s.buildings.filter((b) => b.kind === 'home' && b.level === 0).length;
    out.push('</tbody></table>');
    if (plots) out.push(`<p class="side-note">${plots} empty ${plots === 1 ? 'plot' : 'plots'} marked out for settlers.</p>`);
    // Work.
    const wf = workforce(s);
    const able = homes.reduce((a, b) => a + canWorkIn(s, b), 0);
    out.push('<h3>Work</h3>');
    out.push(`<dl class="sums"><div><dt>Jobs filled</dt><dd>${fmt(wf.filled)}<small> / ${fmt(wf.jobs)}</small></dd></div><div><dt>Can work</dt><dd>${fmt(able)}</dd></div><div><dt>Without work</dt><dd>${fmt(Math.max(0, able - wf.filled))}</dd></div></dl>`);
    if (wf.short.length) {
      const list = wf.short.slice(0, 4).map((b) => {
        const [cx, cz] = centreOf(b);
        return `<li><button data-act="go" data-x="${cx}" data-z="${cz}">${esc(placeName(b, this.map))}</button><span class="n">${b.workers}<small> / ${jobsAt(b)}</small></span></li>`;
      });
      out.push(`<p class="side-note">Short of workers (a short-handed place works slower):</p><ul class="places">${list.join('')}${wf.short.length > 4 ? `<li class="more">and ${wf.short.length - 4} more</li>` : ''}</ul>`);
    }
    // Homes in trouble.
    const trouble: Array<{ b: Building; left: number; need: string }> = [];
    for (const b of homes) {
      const ws = warningsOf(s, b);
      if (ws.length) trouble.push({ b, left: ws[0].left, need: ws.map((x) => lackWords(s, b, x.need)).join(', ') });
    }
    trouble.sort((a, b) => a.left - b.left || a.b.id - b.b.id);
    out.push(`<h3>Homes in trouble</h3>`);
    if (!trouble.length) out.push('<p class="side-note">None: every home has what its level needs.</p>');
    else {
      out.push('<ul class="places trouble">');
      for (const t of trouble.slice(0, 6)) {
        const [cx, cz] = centreOf(t.b);
        const days = Math.max(1, Math.ceil(t.left / TICKS_PER_DAY));
        out.push(`<li><button data-act="home" data-id="${t.b.id}" data-x="${cx}" data-z="${cz}" title="Go there and see who lives there">The house of ${esc(t.b.family?.name ?? '?')}</button><span class="n">${days} ${days === 1 ? 'day' : 'days'}</span><small class="why">No ${esc(t.need)}</small></li>`);
      }
      if (trouble.length > 6) out.push(`<li class="more">and ${trouble.length - 6} more</li>`);
      out.push('</ul>');
    }
    out.push(`<p class="side-note">Since the founding ${fmt(s.arrived)} people have come and ${fmt(s.left)} have left.</p>`);
    return out.join('');
  }

  // -------------------------------------------------------------------------
  // Services.

  private services(s: SimState): string {
    const homes = s.buildings.filter((b) => b.kind === 'home' && b.level > 0 && b.people > 0);
    const mode = this.hooks.overlayMode();
    const out: string[] = [];
    out.push('<p class="side-note">Of the homes whose level needs each, how many have it now. Click one to see it on the map.</p><ul class="svc">');
    for (const r of SERVICE_ROWS) {
      const need = homes.filter((b) => needsOf(b).includes(r.need));
      const have = need.filter((b) => untilOf(b, r.need) > s.tick).length;
      const share = need.length ? have / need.length : 0;
      const off = need.length === 0;
      const word = off ? 'no home needs it yet' : `${fmt(have)} of ${fmt(need.length)}`;
      const lacking = need.length - have;
      out.push(
        `<li><button class="svc-row ${mode === r.need ? 'on' : ''} ${off ? 'off' : ''}" data-act="overlay" data-mode="${r.need}" title="${esc(`${r.label}: ${off ? 'no home needs it yet' : `${have} of the ${need.length} homes that need it have it${lacking ? `; ${lacking} without` : ''}`} · click to ${mode === r.need ? 'hide' : 'show'} it on the map`)}"><i class="dot" style="background:${r.colour}"></i><span class="nm">${r.label}</span><span class="cnt">${word}</span><i class="fill ${share < 0.75 && !off ? 'low' : ''}"><b style="width:${(share * 100).toFixed(0)}%;background:${r.colour}"></b></i></button></li>`,
      );
    }
    out.push('</ul>');
    // Fire and wear.
    const burn = s.buildings.filter((b) => burnable(b));
    const risky = burn.filter((b) => b.fire === 0 && b.risk >= HAZARD_MARK).length;
    const smoulder = s.buildings.filter((b) => b.fire === 1).length;
    const fires = s.buildings.filter((b) => b.fire === 2).length;
    const worn = s.buildings.filter((b) => wears(b) && b.creakAt === 0 && b.wear >= HAZARD_MARK).length;
    const creak = s.buildings.filter((b) => b.creakAt > 0).length;
    const posts = s.buildings.filter((b) => b.kind === 'watchpost').length;
    const offices = s.buildings.filter((b) => b.kind === 'architect').length;
    const rubble = s.buildings.filter((b) => b.kind === 'rubble').length;
    out.push('<h3>Fire and wear</h3><ul class="svc">');
    const fireWord = fires ? `${fires} burning` : smoulder ? `${smoulder} smouldering` : risky ? `${risky} past half way` : s.hazards ? 'all safe' : 'no risk yet';
    out.push(
      `<li><button class="svc-row ${mode === 'fire' ? 'on' : ''} ${fires ? 'alarm' : ''}" data-act="overlay" data-mode="fire" title="${esc(`Fire: ${fires} burning, ${smoulder} smouldering, ${risky} more past half way to catching · ${posts} watch ${posts === 1 ? 'post' : 'posts'} · click to ${mode === 'fire' ? 'hide' : 'show'} fire risk on the map`)}"><i class="dot" style="background:#d8542a"></i><span class="nm">Fire</span><span class="cnt">${fireWord}</span></button></li>`,
    );
    const wearWord = creak ? `${creak} creaking` : worn ? `${worn} past half way` : s.hazards ? 'all sound' : 'no wear yet';
    out.push(
      `<li><button class="svc-row ${mode === 'wear' ? 'on' : ''}" data-act="overlay" data-mode="wear" title="${esc(`Wear: ${creak} creaking, ${worn} more past half way to falling · ${offices} architect’s ${offices === 1 ? 'office' : 'offices'} · click to ${mode === 'wear' ? 'hide' : 'show'} wear on the map`)}"><i class="dot" style="background:#8a7458"></i><span class="nm">Wear</span><span class="cnt">${wearWord}</span></button></li>`,
    );
    out.push('</ul>');
    out.push(`<p class="side-note">${posts} watch ${posts === 1 ? 'post' : 'posts'} and ${offices} architect’s ${offices === 1 ? 'office' : 'offices'}${rubble ? `; ${rubble} ${rubble === 1 ? 'heap' : 'heaps'} of rubble to clear (X)` : ''}.</p>`);
    // What the homes that lack something lack most.
    const lack = new Map<Service, number>();
    for (const b of homes) for (const n of needsOf(b)) if (untilOf(b, n) <= s.tick) lack.set(n, (lack.get(n) ?? 0) + 1);
    const worst = [...lack.entries()].sort((a, b) => b[1] - a[1])[0];
    if (worst) out.push(`<p class="side-note">Most missed: ${esc(NEED_WORDS[worst[0]])}, in ${worst[1]} ${worst[1] === 1 ? 'home' : 'homes'}.</p>`);
    void NEEDS;
    return out.join('');
  }

  // -------------------------------------------------------------------------
  // Money.

  private money(s: SimState): string {
    const l = s.ledger;
    const m = ledgerMonth(s.tick);
    const current = l.month === m;
    const now = current ? l.now : [];
    const last = current ? l.last : l.month === m - 1 ? l.now : [];
    const tn = totals(now);
    const tl = totals(last);
    const owed = owedWages(s);
    const out: string[] = [];
    out.push(`<div class="bigline"><span class="big">${fmt(s.money)}</span><span>drachmas in the treasury</span></div>`);
    if (owed.owed > 0) out.push(`<p class="side-note bad">Wages owed: ${fmt(owed.owed)} dr at ${owed.places} ${owed.places === 1 ? 'workplace' : 'workplaces'}, which work at half speed until paid.</p>`);
    const row = (label: string, a: number, b: number): string => `<tr><td class="what">${label}</td><td class="amt ${a > 0 ? 'in' : a < 0 ? 'out' : 'nil'}">${a ? signed(a) : '·'}</td><td class="amt ${b > 0 ? 'in' : b < 0 ? 'out' : 'nil'}">${b ? signed(b) : '·'}</td></tr>`;
    const k = (lines: typeof now, kind: Parameters<typeof kindTotal>[1]): number => kindTotal(lines, kind);
    const building = (lines: typeof now): number => k(lines, 'building') + k(lines, 'clearing') + k(lines, 'refund');
    out.push(
      `<table class="flows"><thead><tr><th></th><th>This month<small>so far</small></th><th>Last month</th></tr></thead><tbody>${row('Taxes', k(now, 'taxes'), k(last, 'taxes'))}${row('Sales', k(now, 'sales'), k(last, 'sales'))}${row('Wages', k(now, 'wages'), k(last, 'wages'))}${row('Building', building(now), building(last))}<tr class="total"><td class="what">Net</td><td class="amt ${tn.net > 0 ? 'in' : tn.net < 0 ? 'out' : ''}">${signed(tn.net)}</td><td class="amt ${tl.net > 0 ? 'in' : tl.net < 0 ? 'out' : ''}">${last.length ? signed(tl.net) : '·'}</td></tr></tbody></table>`,
    );
    const homes = s.buildings.filter((b) => b.kind === 'home' && b.level > 0 && b.people > 0);
    const taxed = homes.filter((b) => taxedLately(s, b)).length;
    const offices = s.buildings.filter((b) => b.kind === 'taxoffice').length;
    out.push('<h3>Taxes</h3>');
    out.push(`<p class="side-row"><span>The rate</span><button class="chip" data-act="rates" title="Change the tax rate">${cap(TAX_RATES[s.taxRate] ?? '?')}</button></p>`);
    out.push(`<p class="side-note">${offices ? `Collectors from ${offices} tax ${offices === 1 ? 'office' : 'offices'} called on ${fmt(taxed)} of ${fmt(homes.length)} homes in the last month.` : 'No tax office yet: build one (Z) by the houses, so a collector brings the taxes in.'}</p>`);
    out.push(`<button class="wide" data-act="ledger">Open the ledger <kbd>$</kbd></button>`);
    return out.join('');
  }
}

/** "cottage" → "cottages", "fine house" → "fine houses", "villa" → "villas". */
function plural(n: string): string {
  return /s$/.test(n) ? n : `${n}s`;
}
