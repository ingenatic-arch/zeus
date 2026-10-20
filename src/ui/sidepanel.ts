/**
 * The control panel down the right of the screen, as in the original game.
 * At its head the minimap in a bronze ring, with four bosses round it: road,
 * clear, undo, and the overlays. Below, a tab for each kind of building
 * (see categories.ts); each tab holds the buttons to build that kind, its
 * pictures drawn from the town's own models, and under them the state of
 * that part of the city:
 *
 * - **Population**: who lives in the city, in what homes, who has work, and
 *   the homes in trouble.
 * - **Husbandry** and **Industry**: what their buildings made last month and
 *   how they are staffed; click a ware for its page (how much and where it
 *   is kept, what made it and where it went, the year's chart, and what
 *   would help).
 * - **Distribution**: every good in the city, and how many homes the agora's
 *   vendors reach.
 * - **Hygiene and safety**: water, and the fire and wear across the town.
 * - **Administration**: the treasury, last month and this one, the tax rate,
 *   and the ledger.
 * - **Culture** and **Mythology**: how many homes have plays and blessings.
 * - **Military**: the barracks and their companies.
 *
 * It only reads the sim state (refreshing a few times a second); clicks
 * call back into the game (pick up a tool, fly the camera, show an overlay,
 * open the ledger or a household).
 */
import { districtTitle, DISTRICTS } from '../map/districts';
import type { CoastMap } from '../map/bake';
import type { ToolName } from '../game/tools';
import type { OverlayMode } from '../render/overlay';
import { drawPictures } from '../render/pictures';
import { BUILDING_NAMES, centreOf, HOME_NAMES, jobsAt, TOP_LEVEL } from '../sim/buildings';
import { districtAt } from '../map/districts';
import { START_MONTH, TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_SECOND } from '../sim/clock';
import { citySells, lackWords, NEED_WORDS, NEEDS, needsOf, untilOf, warningsOf } from '../sim/folk';
import { GOOD_SERVICE, isGood, type Ware } from '../sim/foods';
import { burnable, HAZARD_MARK, wears } from '../sim/hazards';
import { canWorkIn, workforce } from '../sim/labour';
import { armyHtml } from './armytab';
import { ICONS, INFO } from './buildbar';
import { CATEGORIES, categoryOf, HEAD_TOOLS, OLD_TABS, type Category, type CategoryInfo } from './categories';
import type { Command } from '../sim/commands';
import { arrivalOutlook, type Outlook } from '../sim/settlers';
import type { Building, BuildingKind, Service, SimState } from '../sim/state';
import { bookNow, flowRows, makersOf, monthOf, panelWares, stockOf, totalsOf, usersOf, WARE_GROUPS, wareInfo, type FlowRow, type WareMonth } from '../sim/stocks';
import { TAX_RATES, taxedLately } from '../sim/taxes';
import { kindTotal, monthOf as ledgerMonth, owedWages, totals } from '../sim/treasury';
import { Minimap } from './minimap';
import { morph } from './morph';
import { bandURL, BOSS, bossURL, HEAD, headURL, lintelURL, MOULD, tabURL, wellURL } from './skin';
import { moneyLoansHtml } from './loans';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (n: number): string => Math.round(Math.abs(n)).toLocaleString('en-GB');
const signed = (n: number): string => (Math.round(n) > 0 ? `+${fmt(n)}` : Math.round(n) < 0 ? `−${fmt(n)}` : '0');
const cap = (t: string): string => (t ? `${t[0].toUpperCase()}${t.slice(1)}` : t);
const lower = (t: string): string => (t ? `${t[0].toLowerCase()}${t.slice(1)}` : t);

/** The overlays' boss: three sheets, one over another. */
const LAYERS = '<svg viewBox="0 0 24 24"><path d="M12 3.4 21 8l-9 4.6L3 8z" class="fill-soft"/><path d="M4.6 11.6 12 15.4l7.4-3.8M4.6 15.4 12 19.2l7.4-3.8" class="stroke-ink"/></svg>';

/** The icons the panel's pieces are cut with (for prepareSkin). */
export const PANEL_ICONS: Record<string, string> = {
  road: ICONS.road,
  clear: ICONS.clear,
  undo: ICONS.undo,
  layers: LAYERS,
  ...Object.fromEntries(CATEGORIES.map((c) => [c.id, c.icon])),
};

/** The four bosses round the minimap, from top left. */
const BOSSES = ['road', 'clear', 'undo', 'layers'] as const;
type Boss = (typeof BOSSES)[number];

/** Every overlay, in the order the overlays' list shows them (the open tab's first). */
const ALL_OVERLAYS: readonly OverlayMode[] = ['missing', 'water', 'food', 'variety', 'oil', 'fleece', 'wine', 'religion', 'culture', 'tax', 'fire', 'wear'];
/** An overlay's colour on its row (as its walkers' paths are drawn). */
const OVERLAY_COLOUR: Record<OverlayMode, string> = { missing: '#7a8f3a', water: '#4f9be0', food: '#e0a548', variety: '#c98f2a', oil: '#8aa83a', fleece: '#c8b68a', wine: '#8e2f4e', religion: '#a98ae0', culture: '#e3778f', tax: '#4f9f88', fire: '#d8542a', wear: '#8a7458' };

/** The drachmas a tool's building costs (0 for a tool with none, or a cost by the tile). */
const costOf = (t: ToolName): number => Number(/^\d[\d,]*/.exec(INFO[t].cost)?.[0].replace(/,/g, '') ?? 0);
/** Buildings the city may have only one of. */
const ONLY_ONE: Partial<Record<ToolName, BuildingKind>> = { trading: 'trading', yard: 'yard' };

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
  /** Face north (north's marker on the minimap's ring). */
  faceNorth(): void;
  /** Pick up a building tool (or put it down, if it is the one in hand), and undo. */
  tool(t: ToolName): void;
  undo(): void;
  /** Show an overlay (or hide it if it shows). */
  overlay(mode: OverlayMode): void;
  overlayMode(): OverlayMode | null;
  /** Open the ledger, the tax rates card, a household's panel. */
  ledger(): void;
  rates(): void;
  openHome(id: number): void;
  /** The panel showed or stepped aside (the view makes room for it). */
  toggled(open: boolean): void;
  /** The Military tab: send a command (raise, hire, dismiss, back to barracks), take a company's banner in hand, and which is in hand. */
  army(c: Command): void;
  selectCompany(id: number): void;
  selected(): number;
  /** Open a city's page on the map of Greece, on its Loans tab (the Administration tab's loans). */
  loans?(city: string): void;
}

/** Remembered between visits (where the browser lets it): the open tab. */
const STORE_KEY = 'zeus-remake.side';

/** A tab by its name, or by one of the old tabs' names (demo links and the probe still use them). */
const tabNamed = (t: string): Category | null => (CATEGORIES.some((c) => c.id === t) ? (t as Category) : (OLD_TABS[t] ?? null));

export class SidePanel {
  readonly el: HTMLElement;
  readonly minimap: Minimap;
  private readonly body: HTMLElement;
  private readonly scroll: HTMLElement;
  private readonly tabsEl: HTMLElement;
  private readonly wellsEl: HTMLElement;
  private readonly lintel: HTMLImageElement;
  private readonly pickEl: HTMLElement;
  private readonly layersEl: HTMLElement;
  private readonly bosses = new Map<Boss, HTMLButtonElement>();
  private readonly hint: HTMLElement;
  private tab: Category = 'population';
  /** The ware whose page is open on the tab (-1: the tab's own page). */
  private ware = -1;
  private shownAt = -Infinity;
  private outlook: Outlook | null = null;
  private outlookAt = -Infinity;
  private isOpen = true;
  private lastHtml = '';
  /** The tool in hand, the overlay showing, the well under the pointer. */
  private tool: ToolName | null = null;
  private overlayNow: OverlayMode | null = null;
  private hover: ToolName | null = null;
  private undoOk = false;
  /** The buildings' pictures, drawn the first time they are wanted. */
  private pictures: Map<string, string> | null = null;
  /** When the panel was first brought up to date (the pictures are drawn a second later, once the game is running; the wells show the buildings' icons until then). */
  private firstAt = -1;
  private wellsKey = '';

  constructor(
    root: HTMLElement,
    private readonly map: CoastMap,
    private readonly hooks: SideHooks,
  ) {
    const el = document.createElement('aside');
    el.className = 'side';
    el.setAttribute('aria-label', 'Control panel');
    const boss = (b: Boss, i: number): string => {
      const [x, y] = BOSS.at[i];
      return `<button class="boss" data-boss="${b}" style="left:${x - BOSS.r - 1}px;top:${y - BOSS.r - 1}px"></button>`;
    };
    el.innerHTML = `<div class="side-cornice"></div><div class="side-head"><div class="side-head-art" style="background-image:url(${headURL()})"></div><div class="side-map" style="left:${HEAD.cx - HEAD.plate - HEAD.ring}px;top:${HEAD.cy - HEAD.plate - HEAD.ring}px"></div>${BOSSES.map(boss).join('')}</div><div class="side-band" style="background-image:url(${bandURL()})"></div><nav class="side-tabs" role="tablist" aria-label="Kinds of building"></nav><div class="side-scroll"><div class="side-lintel" role="heading" aria-level="2"><img alt=""></div><div class="side-wells"></div><div class="side-pick"></div><div class="side-body"></div></div><div class="side-layers" role="menu" hidden></div>`;
    el.style.setProperty('--mould', `${MOULD}px`);
    // First in the UI layer, so the corner's buttons and the cards they open lie over it.
    root.prepend(el);
    this.el = el;
    this.minimap = new Minimap(map, (x, z, fly) => hooks.goTo(x, z, !fly), () => hooks.faceNorth());
    (el.querySelector('.side-map') as HTMLElement).appendChild(this.minimap.el);
    for (const b of el.querySelectorAll<HTMLButtonElement>('.boss')) this.bosses.set(b.dataset.boss as Boss, b);
    this.tabsEl = el.querySelector('.side-tabs') as HTMLElement;
    this.tabsEl.innerHTML = CATEGORIES.map((c) => `<button role="tab" class="side-tab" data-tab="${c.id}" title="${esc(c.tip)}" aria-label="${esc(c.title)}"></button>`).join('');
    this.scroll = el.querySelector('.side-scroll') as HTMLElement;
    this.wellsEl = el.querySelector('.side-wells') as HTMLElement;
    this.lintel = el.querySelector('.side-lintel img') as HTMLImageElement;
    this.pickEl = el.querySelector('.side-pick') as HTMLElement;
    this.layersEl = el.querySelector('.side-layers') as HTMLElement;
    this.body = el.querySelector('.side-body') as HTMLElement;
    // The line for the tool in hand, at the foot of the view.
    this.hint = document.createElement('div');
    this.hint.className = 'tool-hint';
    this.hint.hidden = true;
    root.appendChild(this.hint);
    let saved: { tab?: string } = {};
    try {
      saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') as typeof saved;
    } catch {
      /* No storage here: start on the first tab. */
    }
    this.tab = tabNamed(saved.tab ?? '') ?? 'population';
    this.tabsEl.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('.side-tab') as HTMLElement | null;
      if (!b) return;
      this.openTab(b.dataset.tab as Category);
    });
    el.querySelector('.side-head')?.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('.boss') as HTMLButtonElement | null;
      if (!b || b.disabled) return;
      const which = b.dataset.boss as Boss;
      if (which === 'road' || which === 'clear') hooks.tool(which);
      else if (which === 'undo') hooks.undo();
      else this.toggleLayers();
    });
    this.layersEl.addEventListener('click', (e) => {
      const r = (e.target as HTMLElement).closest('[data-mode]') as HTMLElement | null;
      if (!r) return;
      hooks.overlay(r.dataset.mode as OverlayMode);
      this.toggleLayers(false);
    });
    document.addEventListener('pointerdown', (e) => {
      if (!this.layersEl.hidden && e.target instanceof Node && !this.layersEl.contains(e.target) && !this.bosses.get('layers')?.contains(e.target)) this.toggleLayers(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.toggleLayers(false);
    });
    this.wellsEl.addEventListener('click', (e) => {
      const w = (e.target as HTMLElement).closest('.well') as HTMLElement | null;
      if (w) hooks.tool(w.dataset.tool as ToolName);
    });
    this.wellsEl.addEventListener('pointerover', (e) => {
      const w = (e.target as HTMLElement).closest('.well') as HTMLElement | null;
      this.hover = (w?.dataset.tool as ToolName | undefined) ?? null;
      this.showPick();
    });
    this.wellsEl.addEventListener('pointerleave', () => {
      this.hover = null;
      this.showPick();
    });
    this.body.addEventListener('click', (e) => this.clicked(e));
    this.body.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && (e.target as HTMLElement).matches('[data-act]')) {
        e.preventDefault();
        this.clicked(e);
      }
    });
    this.showBosses();
    this.showTabs();
    this.apply();
  }

  get open(): boolean {
    return this.isOpen;
  }

  /** Show the panel or put it aside (for the probe; it shows all the time in play). */
  toggle(show = !this.isOpen): void {
    if (show === this.isOpen) return;
    this.isOpen = show;
    this.apply();
  }

  /** Open a tab (a second click on the open one goes back from a ware's page to the tab's own). */
  private openTab(t: Category): void {
    if (t === this.tab && this.ware < 0) return;
    this.tab = t;
    this.ware = -1;
    this.scroll.scrollTop = 0;
    this.remember();
    this.refresh();
  }

  /** Open a ware's page, on the tab of what makes it (the goods of the agora's stalls on Distribution). */
  showWare(w: Ware): void {
    // (What kind of building makes it, asked of a city with none.)
    const maker = makersOf({ buildings: [] } as unknown as SimState, w).kind;
    this.tab = (maker && categoryOf(maker as ToolName)?.id) || 'distribution';
    this.ware = w;
    this.toggle(true);
    this.refresh();
  }

  /** Open a tab, by its name or an old tab's. */
  showTab(t: string): void {
    const c = tabNamed(t);
    if (!c) return;
    this.tab = c;
    this.ware = -1;
    this.toggle(true);
    this.refresh();
  }

  private remember(): void {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ tab: this.tab }));
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

  private get info(): CategoryInfo {
    return CATEGORIES.find((c) => c.id === this.tab) ?? CATEGORIES[0];
  }

  private showTabs(): void {
    CATEGORIES.forEach((c, i) => {
      const b = this.tabsEl.querySelector(`[data-tab="${c.id}"]`) as HTMLElement;
      const on = c.id === this.tab;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
      b.style.backgroundImage = `url(${tabURL(c.id, on, i)})`;
    });
    this.lintel.src = lintelURL(this.info.title);
    this.lintel.alt = this.info.title;
    this.showWells();
  }

  /** The bosses round the minimap: road and clear lit while in hand, undo greyed when there is nothing to undo, the overlays' lit while one shows. */
  private showBosses(): void {
    const on: Record<Boss, boolean> = { road: this.tool === 'road', clear: this.tool === 'clear', undo: false, layers: this.overlayNow !== null || !this.layersEl.hidden };
    for (const [k, b] of this.bosses) {
      b.style.backgroundImage = `url(${bossURL(k, BOSS.r, on[k])})`;
      b.classList.toggle('on', on[k]);
      b.setAttribute('aria-pressed', String(on[k]));
    }
    const road = this.bosses.get('road') as HTMLButtonElement;
    const clear = this.bosses.get('clear') as HTMLButtonElement;
    const layers = this.bosses.get('layers') as HTMLButtonElement;
    const label = (b: HTMLElement, text: string): void => {
      b.title = text;
      b.setAttribute('aria-label', text);
    };
    label(road, `${INFO.road.name} (${INFO.road.key}) · ${INFO.road.cost}`);
    label(clear, `${INFO.clear.name} (${INFO.clear.key}) · ${INFO.clear.cost}`);
    label(layers, this.overlayNow ? `Overlays: ${INFO[this.overlayNow].name.split(':')[0]} shows · click to choose another or hide it` : 'Overlays: show on the map where each service reaches, and more');
    layers.setAttribute('aria-haspopup', 'menu');
    layers.setAttribute('aria-expanded', String(!this.layersEl.hidden));
  }

  /** Open or close the list of overlays (the open tab's first). */
  private toggleLayers(show = this.layersEl.hidden): void {
    if (show === !this.layersEl.hidden) return;
    this.layersEl.hidden = !show;
    if (show) {
      const mine = this.info.overlays;
      const order = [...mine, ...ALL_OVERLAYS.filter((o) => !mine.includes(o))];
      this.layersEl.innerHTML = order
        .map((o, i) => {
          const [name] = INFO[o].name.split(':');
          const gap = i === mine.length && mine.length ? ' gap' : '';
          return `<button role="menuitemcheckbox" aria-checked="${o === this.overlayNow}" class="layer${o === this.overlayNow ? ' on' : ''}${gap}" data-mode="${o}" title="${esc(INFO[o].name)}"><i style="background:${OVERLAY_COLOUR[o]}"></i><span>${esc(name.replace(/ overlay$/, ''))}</span><kbd>${INFO[o].key}</kbd></button>`;
        })
        .join('');
    }
    this.showBosses();
  }

  /** The wells of the open tab's buildings: lit gold for the one in hand, dimmed where the treasury can't pay or the city has its one. */
  private showWells(): void {
    const s = this.s;
    const tools = this.info.tools;
    const money = s?.money ?? Infinity;
    const has = (k: BuildingKind): boolean => !!s?.buildings.some((b) => b.kind === k);
    const key = `${this.tab}|${this.tool}|${tools.map((t) => (money < costOf(t) ? 0 : 1)).join('')}|${tools.map((t) => (ONLY_ONE[t] && has(ONLY_ONE[t] as BuildingKind) ? 1 : 0)).join('')}`;
    if (key === this.wellsKey) return;
    this.wellsKey = key;
    this.wellsEl.innerHTML = tools
      .map((t) => {
        const i = INFO[t];
        const n = costOf(t);
        const dear = money < n;
        const one = ONLY_ONE[t] && has(ONLY_ONE[t] as BuildingKind);
        const why = one ? ' · the city has its one' : dear ? ' · more than the treasury holds' : '';
        const pic = this.pictures?.get(t);
        const label = `${i.name} (${i.key}) · ${i.cost}${why}`;
        return `<button class="well${t === this.tool ? ' on' : ''}${dear || one ? ' dear' : ''}" data-tool="${t}" title="${esc(label)}" aria-label="${esc(label)}" aria-pressed="${t === this.tool}" style="background-image:url(${wellURL(t === this.tool)})">${pic ? `<img src="${pic}" alt="">` : ICONS[t]}<span class="cost">${n ? fmt(n) : ''}</span></button>`;
      })
      .join('');
    this.showPick();
  }

  /** Under the wells: the building in hand (or under the pointer), by name and cost. */
  private showPick(): void {
    const t = this.hover ?? (this.tool && this.info.tools.includes(this.tool) ? this.tool : null);
    const html = t ? `<span class="nm">${esc(INFO[t].name)}</span><span class="cost">${esc(INFO[t].cost.replace(/ dr\b/, ' drachmas'))}</span>` : `<span class="none">${esc(this.info.tools.length > 1 ? 'Pick a building to place it' : 'Click to place it')}</span>`;
    if (this.pickEl.innerHTML !== html) this.pickEl.innerHTML = html;
  }

  /** A tool was picked up or put down: light it, open its tab, say how to use it at the foot of the view. */
  showTool(t: ToolName | null): void {
    this.tool = t;
    const c = t && !HEAD_TOOLS.includes(t) ? categoryOf(t) : undefined;
    if (c && c.id !== this.tab) {
      this.tab = c.id;
      this.ware = -1;
      this.remember();
      this.refresh();
    } else this.showWells();
    this.showPick();
    this.showBosses();
    this.hint.hidden = !t;
    if (t) this.hint.textContent = `${INFO[t].hint}  Right-click or Esc to put it down.`;
  }

  /** The overlay showing, if any. */
  showOverlay(mode: OverlayMode | null): void {
    if (mode === this.overlayNow) return;
    this.overlayNow = mode;
    this.showBosses();
    this.shownAt = -Infinity;
  }

  private undoWhy: string | null = null;

  /** Undo is greyed out when the last action can't be undone, and its tip says why. */
  setUndo(available: boolean, why = ''): void {
    const b = this.bosses.get('undo') as HTMLButtonElement;
    if (available !== this.undoOk || b.disabled === available) {
      this.undoOk = available;
      b.disabled = !available;
    }
    if (why === this.undoWhy) return;
    this.undoWhy = why;
    const label = available || !why ? 'Undo (U) · the last thing you built or cleared, within about a month' : `Undo (U) · ${why}`;
    b.title = label;
    b.setAttribute('aria-label', label);
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

  get tabNow(): Category {
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
      this.scroll.scrollTop = 0;
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
    else if (act === 'hire') this.hooks.army({ type: 'hire', barracks: Number(a.dataset.id), kind: a.dataset.kind ?? '' });
    else if (act === 'repay') this.hooks.army({ type: 'loan', act: 'repay', loan: Number(a.dataset.id) });
    else if (act === 'loancity') this.hooks.loans?.(a.dataset.city ?? '');
    else if (act === 'trireme') this.hooks.army({ type: 'trireme', yard: Number(a.dataset.id) });
    else if (act === 'guard') this.hooks.army({ type: 'fleet', trireme: Number(a.dataset.id), act: 'guard', lane: a.dataset.lane ?? '' });
    else if (act === 'trihome') this.hooks.army({ type: 'fleet', trireme: Number(a.dataset.id), act: 'home' });
    if (act === 'company' || act === 'recall' || act === 'dismiss' || act === 'raise' || act === 'hire' || act === 'repay' || act === 'trireme' || act === 'guard' || act === 'trihome') {
      this.shownAt = -Infinity;
      if (this.s) this.render(this.s);
    }
  }

  /** The barracks picked out on the Military tab (clicked in the city), or 0. */
  private armyFocus = 0;

  /** Open the Military tab, a barracks picked out. */
  showBarracks(id: number): void {
    this.armyFocus = id;
    this.showTab('military');
    const el = this.body.querySelector(`[data-barracks="${id}"]`);
    if (el && 'scrollIntoView' in el) (el as HTMLElement).scrollIntoView({ block: 'nearest' });
    else this.scrollTo = id;
  }

  /** Bring the panel up to date (a few times a second while it shows). */
  update(s: SimState, time: number): void {
    this.s = s;
    // A second of real time, not of the game's clock, which slow frames hold back.
    const now = performance.now() / 1000;
    if (this.firstAt < 0) this.firstAt = now;
    if (!this.pictures && now - this.firstAt > 1) {
      this.pictures = drawPictures(CATEGORIES.flatMap((c) => c.tools));
      this.wellsKey = '';
    }
    if (!this.isOpen) return;
    if (time - this.shownAt < 0.3) return;
    this.shownAt = time;
    if (time - this.outlookAt > 2) {
      this.outlookAt = time;
      this.outlook = this.tab === 'population' ? arrivalOutlook(s, this.map) : null;
    }
    this.showWells();
    this.render(s);
  }

  /** The open tab's HTML (below its buildings). */
  html(s: SimState): string {
    if (this.tab === 'population' && !this.outlook) this.outlook = arrivalOutlook(s, this.map);
    if (this.ware >= 0) return this.warePage(s, this.ware);
    switch (this.tab) {
      case 'population':
        return this.people(s);
      case 'husbandry':
      case 'industry':
        return this.makers(s, this.info);
      case 'distribution':
        return this.goodsList(s) + this.services(s, ['food', 'oil', 'fleece', 'wine'], 'Sold in the agora', 'Of the homes whose level needs each, how many its vendors reached lately.');
      case 'safety':
        return this.services(s, ['water'], '', 'Of the homes that need water, how many have it now.') + this.hazards(s);
      case 'administration':
        return this.money(s);
      case 'culture':
        return this.services(s, ['culture'], '', 'Of the homes whose level needs plays, how many the actors reached lately.') + this.counted(s, 'theatre', 'theatre', 'theatres');
      case 'mythology':
        return this.services(s, ['religion'], '', 'Of the homes whose level needs a blessing, how many the priestesses reached lately.') + this.counted(s, 'shrine', 'shrine', 'shrines');
      case 'military':
        return armyHtml(s, this.map, this.armyFocus, this.hooks.selected());
    }
  }

  private render(s: SimState): void {
    const html = this.html(s);
    if (html === this.lastHtml) return;
    this.lastHtml = html;
    morph(this.body, html);
    // A barracks or shipyard asked for before its section was drawn: scroll to it now.
    if (this.scrollTo) {
      const el = this.body.querySelector(`[data-barracks="${this.scrollTo}"]`);
      if (el) {
        (el as HTMLElement).scrollIntoView({ block: 'nearest' });
        this.scrollTo = 0;
      }
    }
  }
  private scrollTo = 0;

  // -------------------------------------------------------------------------
  // Husbandry and industry.

  /** What a tab's buildings made, ware by ware, and how they are staffed. */
  private makers(s: SimState, c: CategoryInfo): string {
    const wares = panelWares().filter((w) => {
      const k = makersOf(s, w).kind;
      return k !== '' && c.tools.includes(k as ToolName);
    });
    const b = bookNow(s);
    const out: string[] = [];
    out.push(`<h3>${b.full ? 'Made last month' : 'Made this month so far'}</h3><ul class="wares">${wares.map((w) => this.wareRow(s, w)).join('')}</ul>`);
    const lines: string[] = [];
    for (const t of c.tools) {
      const kind = t as BuildingKind;
      const all = s.buildings.filter((x) => x.kind === kind);
      if (!all.length) continue;
      const short = all.filter((x) => jobsAt(x) > 0 && x.workers < jobsAt(x)).length;
      const one = lower(INFO[t].name);
      const name = all.length === 1 ? one : (MANY[kind] ?? (/[^aeiou]y$/.test(one) ? `${one.slice(0, -1)}ies` : `${one}s`));
      lines.push(`<li class="${short ? 'bad' : ''}"><span>${all.length} ${esc(name)}</span><span class="n">${short ? `${short} short of workers` : 'all staffed'}</span></li>`);
    }
    out.push('<h3>Their workers</h3>');
    out.push(lines.length ? `<ul class="places staff">${lines.join('')}</ul>` : `<p class="side-note">None built yet: pick one above to place it.</p>`);
    out.push('<p class="side-note">Click a ware for where it comes from and goes.</p>');
    return out.join('');
  }

  /** A theatre's or a shrine's line: how many the city has. */
  private counted(s: SimState, kind: BuildingKind, one: string, many: string): string {
    const n = s.buildings.filter((b) => b.kind === kind).length;
    return `<p class="side-note">${n ? `The city has ${n} ${n === 1 ? one : many}.` : `No ${one} yet: pick it above to place it beside a road.`}</p>`;
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
      out.push(`<h3>${g.title}</h3><ul class="wares">${ws.map((w) => this.wareRow(s, w)).join('')}</ul>`);
    }
    return out.join('');
  }

  /** A ware's row: what the city holds and its net; a click opens its page. */
  private wareRow(s: SimState, w: Ware): string {
    const b = bookNow(s);
    const st = stockOf(s, w);
    const { m } = this.quoted(s, w);
    const any = st.total > 0 || m.made + m.used + m.sold + m.bought + m.lost > 0 || makersOf(s, w).count > 0;
    const net = m.net;
    const arrow = net > 0 ? '<i class="up"></i>' : net < 0 ? '<i class="down"></i>' : '';
    const info = wareInfo(w);
    const tip = `${info.name}: ${fmt(st.total)} ${info.unit} in the city · ${b.full ? 'last month' : 'this month so far'} made ${fmt(m.made)}, used ${fmt(m.used)}${m.sold ? `, sold ${fmt(m.sold)}` : ''}${m.bought ? `, bought ${fmt(m.bought)}` : ''}${m.lost ? `, lost ${fmt(m.lost)}` : ''}`;
    return `<li class="${any ? '' : 'none'}"><button class="ware-row" data-act="ware" data-ware="${w}" title="${esc(tip)}">${wareIcon(w)}<span class="nm">${esc(info.name)}</span><span class="amt">${any ? fmt(st.total) : '—'}</span><span class="net ${net > 0 ? 'up' : net < 0 ? 'down' : ''}">${any ? `${arrow}${signed(net)}` : ''}</span></button></li>`;
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
    out.push(`<button class="back" data-act="back">‹ ${this.tab === 'distribution' ? 'All goods' : esc(this.info.title)}</button>`);
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

  /** Of the homes whose level needs each of these services, how many have it now; a click shows its overlay. */
  private services(s: SimState, needs: readonly Service[], title: string, note: string): string {
    const homes = s.buildings.filter((b) => b.kind === 'home' && b.level > 0 && b.people > 0);
    const mode = this.hooks.overlayMode();
    const out: string[] = [];
    if (title) out.push(`<h3>${esc(title)}</h3>`);
    out.push(`<p class="side-note">${esc(note)} Click one to see it on the map.</p><ul class="svc">`);
    for (const r of SERVICE_ROWS) {
      if (!needs.includes(r.need)) continue;
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
    // What the homes that lack something lack most, of these.
    const lack = new Map<Service, number>();
    for (const b of homes) for (const n of needsOf(b)) if (needs.includes(n) && untilOf(b, n) <= s.tick) lack.set(n, (lack.get(n) ?? 0) + 1);
    const worst = [...lack.entries()].sort((a, b) => b[1] - a[1])[0];
    if (worst && needs.length > 1) out.push(`<p class="side-note">Most missed: ${esc(NEED_WORDS[worst[0]])}, in ${worst[1]} ${worst[1] === 1 ? 'home' : 'homes'}.</p>`);
    void NEEDS;
    return out.join('');
  }

  /** Fire and wear across the town; a click shows its overlay. */
  private hazards(s: SimState): string {
    const mode = this.hooks.overlayMode();
    const out: string[] = [];
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
    const loans = (lines: typeof now): number => k(lines, 'borrowed') + k(lines, 'repaid') + k(lines, 'lent') + k(lines, 'repayment') + k(lines, 'returned');
    out.push(
      `<table class="flows"><thead><tr><th></th><th>This month<small>so far</small></th><th>Last month</th></tr></thead><tbody>${row('Taxes', k(now, 'taxes'), k(last, 'taxes'))}${row('Sales', k(now, 'sales'), k(last, 'sales'))}${row('Wages', k(now, 'wages'), k(last, 'wages'))}${k(now, 'soldiers') || k(last, 'soldiers') ? row('Soldiers’ pay', k(now, 'soldiers'), k(last, 'soldiers')) : ''}${k(now, 'hirelings') || k(last, 'hirelings') ? row('Hirelings', k(now, 'hirelings'), k(last, 'hirelings')) : ''}${row('Building', building(now), building(last))}${loans(now) || loans(last) ? row('Loans', loans(now), loans(last)) : ''}<tr class="total"><td class="what">Net</td><td class="amt ${tn.net > 0 ? 'in' : tn.net < 0 ? 'out' : ''}">${signed(tn.net)}</td><td class="amt ${tl.net > 0 ? 'in' : tl.net < 0 ? 'out' : ''}">${last.length ? signed(tl.net) : '·'}</td></tr></tbody></table>`,
    );
    const homes = s.buildings.filter((b) => b.kind === 'home' && b.level > 0 && b.people > 0);
    const taxed = homes.filter((b) => taxedLately(s, b)).length;
    const offices = s.buildings.filter((b) => b.kind === 'taxoffice').length;
    out.push('<h3>Taxes</h3>');
    out.push(`<p class="side-row"><span>The rate</span><button class="chip" data-act="rates" title="Change the tax rate">${cap(TAX_RATES[s.taxRate] ?? '?')}</button></p>`);
    out.push(`<p class="side-note">${offices ? `Collectors from ${offices} tax ${offices === 1 ? 'office' : 'offices'} called on ${fmt(taxed)} of ${fmt(homes.length)} homes in the last month.` : 'No tax office yet: build one (Z) by the houses, so a collector brings the taxes in.'}</p>`);
    out.push(`<button class="wide" data-act="ledger">Open the ledger <kbd>$</kbd></button>`);
    out.push(moneyLoansHtml(s));
    return out.join('');
  }
}

/** "cottage" → "cottages", "fine house" → "fine houses", "villa" → "villas". */
function plural(n: string): string {
  return /s$/.test(n) ? n : `${n}s`;
}
