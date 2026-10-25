/**
 * The trade panel: a tab for the Tyre ship and one for each open route.
 * The Tyre ship's tab is the trading post's panel as it has always been: the
 * ship's schedule (when she is due, sighted, loading or gone, and what she
 * paid last time), and for each of the six goods she buys its price, what the
 * city's stores hold, how much the city keeps (− / +), what waits on the
 * quay, and whether it is for sale. A route's tab has its trader's news, its
 * goods (routes.ts) and its last visit. Opened by clicking the post or the
 * caravan yard (or the traders chip in the top bar); its buttons send
 * commands, so they replay and save like any other action.
 */
import type { CoastMap } from '../map/bake';
import { jobsAt } from '../sim/buildings';
import { dateOfTick, formatYear } from '../sim/clock';
import type { Command } from '../sim/commands';
import { held, WARE_NAMES } from '../sim/foods';
import { rateOf } from '../sim/labour';
import { roadsBeside } from '../sim/rounds';
import { workersLine } from '../sim/status';
import { morph } from './morph';
import { depotOf, routeEvent, routeGoods, routeKey, routeLast, routeName, routeNewsBlock, routeWarnings } from './routes';
import { caravanYard, routeOf, tradesOf, type RouteKind } from '../sim/routes';
import { cityOf, priceWhy, yourPrice } from '../sim/world';
import { harvestLine, priceRows } from './prices';
import type { TradeRoute } from '../sim/state';
import { PLACES } from '../map/greece';
import type { Building, SimState } from '../sim/state';
// Slice 49: the quarantine order, at the head of the panel.
import { quarantineHtml } from './health';
import {
  cityHolds,
  dockerNews,
  FIRST_SHIP,
  goodsList,
  KEEP_MAX,
  keepNext,
  PRICES,
  priceFor,
  QUAY_ROOM,
  quayWorth,
  SHIP_AWAY,
  SHIP_COMING,
  SHIP_EVERY,
  SHIP_LEAVING,
  SHIP_MOORED,
  shipNews,
  storeKind,
  surplusOf,
  TRADE_GOODS,
  tradingPost,
} from '../sim/trade';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const cap = (t: string): string => `${t[0].toUpperCase()}${t.slice(1)}`;

/** A small mark for each good, in the colours of its stack on the quay (wheat its sacks', cheese its wheels'). */
const SWATCH = ['#a8874f', '#b5524a', '#f3d874', '#8aa83a', '#eee2c0', '#7a2e80', '#b87333', '#c8963c', '#e8e2d4', '#8a6238', '#6b4a2e']; // (Slice 36: copper, armour, marble, timber and horses had none)

const when = (tick: number): string => {
  const d = dateOfTick(tick);
  return `${d.monthName} ${formatYear(d.yearBC)}`;
};

/** The ship's block: what she is doing and a bar of the time to her next call. */
function shipBlock(s: SimState): string {
  const ship = s.trade.ship;
  const news = shipNews(s);
  if (!news) return '';
  let share = 0;
  if (ship.phase === SHIP_AWAY && ship.due > 0) {
    // From the last call (or the post's building) to the next.
    const span = ship.visits > 0 ? SHIP_EVERY : FIRST_SHIP;
    share = 1 - Math.max(0, ship.due - s.tick) / span;
  } else if (ship.phase === SHIP_COMING || ship.phase === SHIP_MOORED) share = 1;
  const cls = ship.phase === SHIP_COMING || ship.phase === SHIP_MOORED ? ' here' : '';
  const bar = ship.phase === SHIP_LEAVING ? '' : `<div class="bar"><i style="width:${(Math.max(0, Math.min(1, share)) * 100).toFixed(1)}%"></i></div>`;
  return `<div class="shipnews${cls}"><b>${esc(news.short)}</b><p>${esc(news.line)}</p>${bar}</div>`;
}

/** Last time she called: what she bought and paid. */
function lastBlock(s: SimState): string {
  const ship = s.trade.ship;
  if (ship.visits === 0) return '<p class="none">No ship has called yet.</p>';
  const lines = ship.lastBought
    .map((n, k) => (n > 0 ? `<li><span>${fmt(n)} ${WARE_NAMES[TRADE_GOODS[k]]}</span><span class="dr">${fmt(priceFor(k, n))} dr</span></li>` : ''))
    .join('');
  return `<p class="last">${when(ship.lastAt)}: ${ship.lastPaid > 0 ? `she paid <b>${fmt(ship.lastPaid)} dr</b>` : 'nothing was on the quay for sale'}</p>${lines ? `<ul class="bought">${lines}</ul>` : ''}`;
}

/** The goods table: a row for each, with its sell tick and keep − / +. */
function goodsTable(s: SimState, post: Building): string {
  const rows = TRADE_GOODS.map((w, k) => {
    const sell = s.trade.sell[k];
    const keep = s.trade.keep[k];
    const holds = cityHolds(s, w);
    const quay = held(post, w);
    const spare = surplusOf(s, post, k);
    const name = WARE_NAMES[w];
    const keepTitle = `The city keeps ${fmt(keep)} ${name} in its ${storeKind(w) === 'granary' ? 'granaries' : 'storehouses'}; the dockers take only what is beyond that to the quay.`;
    const holdsTitle = `The city’s ${storeKind(w) === 'granary' ? 'granaries' : 'storehouses'} hold ${fmt(holds)} ${name}${sell ? ` · ${spare > 0 ? `${fmt(spare)} to spare beyond what is kept` : 'nothing to spare beyond what is kept'}` : ''}`;
    return `<tr class="${sell ? 'on' : 'off'}">
<td class="good"><label title="${sell ? `For sale: the dockers carry spare ${name} to the quay` : `Not for sale: tick to sell spare ${name} to the ship`}"><input type="checkbox" data-sell="${k}"${sell ? ' checked' : ''}><i style="background:${SWATCH[k]}"></i>${cap(name)}</label></td>
<td class="price" title="${esc(`The ship pays ${PRICES[k]} dr for every 100 ${name}, always${routesPay(s, k)}`)}">${PRICES[k]}</td>
<td class="holds" title="${esc(holdsTitle)}">${fmt(holds)}</td>
<td class="keep" title="${esc(keepTitle)}"><button data-keep="${k}" data-by="-1" aria-label="Keep less ${name}"${keep <= 0 ? ' disabled' : ''}>−</button><span>${fmt(keep)}</span><button data-keep="${k}" data-by="1" aria-label="Keep more ${name}"${keep >= KEEP_MAX ? ' disabled' : ''}>+</button></td>
<td class="quay" title="${fmt(quay)} ${name} on the quay (room for ${fmt(QUAY_ROOM)})">${quay > 0 ? fmt(quay) : '·'}</td>
</tr>`;
  }).join('');
  return `<table class="goods"><thead><tr><th>Sell</th><th title="Drachmas for every 100">Price</th><th title="What the city’s stores hold">Stores</th><th title="What the city keeps, not for sale">Keep</th><th title="Waiting on the quay for the ship">Quay</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/** The whole panel's inner HTML. */
export function tradeHtml(s: SimState, map: CoastMap, post: Building): string {
  const worth = quayWorth(s, post);
  const quay = TRADE_GOODS.map((w) => held(post, w));
  const staff = workersLine(s, map, post);
  const warn: string[] = [];
  if (roadsBeside(s, map.size, post).length === 0) warn.push('No road beside the post: its dockers can’t reach the stores. Lay a road along one side.');
  else if (rateOf(post) === 0) warn.push(`${staff.split('\n')[0]}: no dockers go out until it has workers.`);
  if (!s.trade.sell.some((x) => x)) warn.push('Nothing is ticked for sale: tick the goods below, or the ship sails away with nothing.');
  const dockers = dockerNews(s, map, post);
  const onQuay = quay.some((n) => n > 0) ? `On the quay: ${goodsList(quay)}${worth > 0 ? ` · worth <b>${fmt(worth)} dr</b> at her prices` : ''}` : 'The quay is empty.';
  return `<header><div class="kicker">${esc(post.workers === 0 ? `No workers · it needs ${jobsAt(post)}` : staff.split('\n')[0] || 'The trading post')}</div><h2>The trading post</h2><div class="from">A merchant ship calls every three months and buys what waits on the quay</div></header>
${shipBlock(s)}
${warn.map((w) => `<div class="late">${esc(w)}</div>`).join('')}
<section><h3>Goods</h3>${goodsTable(s, post)}<p class="quayline">${onQuay}</p>${dockers ? `<p class="dockers">${esc(dockers)}</p>` : ''}</section>
<section><h3>The last ship</h3>${lastBlock(s)}</section>
<p class="foot">Prices are per 100. The dockers carry what the stores hold beyond what the city keeps to the quay, the most valuable first, and carry back anything taken off sale.</p>`;
}

/** A route's goods' market prices in its city, with their arrows, a year's chart and why. */
function routePrices(s: SimState, r: TradeRoute): string {
  const { theyBuy, theySell } = tradesOf(s, r.city);
  const goods = [...theyBuy, ...theySell];
  if (!goods.length) return '';
  return `<section class="prices"><h3>Prices in ${esc(PLACES[r.city].name)}</h3><p class="harvest">${esc(harvestLine(s, r.city))}</p><ul class="pricelist">${priceRows(s, r.city, goods)}</ul></section>`;
}

/** What the open routes pay for a good now, for the Tyre tab's price tip: " · Corinth pays 74, falling". */
function routesPay(s: SimState, k: number): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const r of s.world.routes) {
    if (seen.has(r.city) || !tradesOf(s, r.city).theyBuy.includes(k)) continue;
    seen.add(r.city);
    const a = priceWhy(cityOf(s.world, r.city), k, s.tick, s.world).arrow;
    parts.push(`${PLACES[r.city].name} pays ${yourPrice(s.world, r.city, k, s.tick)}${a > 0 ? ', rising' : a < 0 ? ', falling' : ''}`);
  }
  return parts.length ? ` · ${parts.join('; ')}` : '';
}

/** A route's tab. */
export function routeHtml(s: SimState, map: CoastMap, r: TradeRoute): string {
  const name = PLACES[r.city].name;
  const depot = depotOf(s, r);
  const people = depot ? dockerNews(s, map, depot) : '';
  return `<header><div class="kicker">Trade route · ${r.kind === 'land' ? 'by road' : 'by sea'} · open since ${when(r.opened)}</div><h2>${esc(name)}</h2><div class="from">${r.kind === 'land' ? `A caravan comes every two months to the caravan yard` : `A ship of ${esc(name)} calls every three months at the trading post`}</div></header>
${routeNewsBlock(s, r)}
${routeWarnings(s, r).map((w) => `<div class="late">${esc(w)}</div>`).join('')}
<section class="routegoods">${routeGoods(s, r)}${people ? `<p class="dockers">${esc(people)}</p>` : ''}</section>
${routePrices(s, r)}
<section><h3>The last ${r.kind === 'land' ? 'caravan' : 'ship'}</h3>${routeLast(r)}</section>
<p class="foot">Prices are per 100; each city buys and sells only so much a year. What you sell goes beyond what the city keeps; what you buy is unloaded and paid for as the trader arrives, as much as the treasury can spare then (it keeps back a month’s wages).</p>`;
}

/** The caravan yard's tab, while no road is open. */
export function yardHtml(s: SimState, map: CoastMap, yard: Building): string {
  const staff = workersLine(s, map, yard);
  const goods = TRADE_GOODS.map((w) => held(yard, w));
  const warn: string[] = [];
  if (roadsBeside(s, map.size, yard).length === 0) warn.push('No road beside the yard: caravans can’t reach it, nor its porters the stores. Lay a road along one side.');
  return `<header><div class="kicker">${esc(staff.split('\n')[0] || 'The caravan yard')}</div><h2>The caravan yard</h2><div class="from">Where the caravans of Greece trade</div></header>
${warn.map((w) => `<div class="late">${esc(w)}</div>`).join('')}
<section><p class="line">No road is open to Greece yet. Open one on the map of Greece (Tab): Corinth, Sparta and Athens trade by road, a caravan every two months.</p>${goods.some((n) => n > 0) ? `<p class="quayline">In the yard: ${goodsList(goods)}</p>` : ''}</section>`;
}

/** The tabs: the Tyre ship's (with a trading post) and each open route's; the yard's own while no road is open. */
export function tradeTabs(s: SimState): string[] {
  const out: string[] = [];
  if (tradingPost(s)) out.push('tyre');
  for (const r of s.world.routes) out.push(routeKey(r));
  if (caravanYard(s) && !s.world.routes.some((r) => r.kind === 'land')) out.push('yard');
  return out;
}

const tabName = (tab: string): string => {
  if (tab === 'tyre') return 'Tyre';
  if (tab === 'yard') return 'Yard';
  const [city, kind] = tab.split('-');
  return `${PLACES[city as keyof typeof PLACES]?.name ?? city} <em>by ${kind === 'land' ? 'road' : 'sea'}</em>`;
};

/** How often (seconds) the open panel is brought up to date. */
const REFRESH = 0.3;

export class TradePanel {
  private readonly el: HTMLElement;
  private readonly body: HTMLElement;
  private shown = false;
  private html = '';
  private last = -Infinity;
  private state: SimState | null = null;
  /** Which tab is open: 'tyre', a route ('corinth-land'), or 'yard'. */
  tab = 'tyre';
  /** A pointer is pressed in the panel: hold the redraw, so the press and release land on the same button (a click is lost if it is redrawn in between). */
  private pressed = false;
  onOpen: () => void = () => {};

  constructor(root: HTMLElement, send: (c: Command) => void) {
    const el = document.createElement('div');
    el.className = 'household trade';
    el.hidden = true;
    el.innerHTML = '<button class="close" title="Close (Esc)" aria-label="Close">×</button><div class="body"></div>';
    root.appendChild(el);
    this.el = el;
    this.body = el.querySelector('.body') as HTMLElement;
    (el.querySelector('.close') as HTMLElement).addEventListener('click', () => this.toggle(false));
    this.body.addEventListener('pointerdown', () => {
      this.pressed = true;
    });
    const release = (): void => {
      this.pressed = false;
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    this.body.addEventListener('change', (e) => {
      if (this.state && routeEvent(e, this.state, send)) {
        this.last = -Infinity;
        return;
      }
      const t = e.target as HTMLInputElement;
      if (t.dataset.sell === undefined) return;
      send({ type: 'trade', good: TRADE_GOODS[Number(t.dataset.sell)], sell: t.checked });
      this.last = -Infinity;
    });
    this.body.addEventListener('click', (e) => {
      // Slice 49: the quarantine, ordered or lifted.
      const q = (e.target as HTMLElement).closest('button[data-act="quarantine"]') as HTMLButtonElement | null;
      if (q) {
        send({ type: 'quarantine', on: q.dataset.on === '1' });
        this.last = -Infinity;
        return;
      }
      const tab = (e.target as HTMLElement).closest('button[data-tab]') as HTMLButtonElement | null;
      if (tab) {
        this.tab = tab.dataset.tab ?? 'tyre';
        this.body.scrollTop = 0;
        this.last = -Infinity;
        return;
      }
      if (this.state && routeEvent(e, this.state, send)) {
        this.last = -Infinity;
        return;
      }
      const b = (e.target as HTMLElement).closest('button[data-keep]') as HTMLButtonElement | null;
      if (!b || !this.state) return;
      const k = Number(b.dataset.keep);
      const by = Number(b.dataset.by);
      send({ type: 'trade', good: TRADE_GOODS[k], keep: keepNext(k, this.state.trade.keep[k], by) });
      this.last = -Infinity;
    });
  }

  get open(): boolean {
    return this.shown;
  }

  /** Open on a tab: the Tyre ship's, a route's ('corinth-land'), or the first for the caravan yard ('yard': its first road, or its own). */
  showTab(tab: string): void {
    this.tab = tab;
    if (tab === 'yard' && this.state) {
      const land = this.state.world.routes.find((r) => r.kind === 'land');
      if (land) this.tab = routeKey(land);
    }
    if (this.shown) {
      this.body.scrollTop = 0;
      this.last = -Infinity;
    }
    this.toggle(true);
  }

  toggle(show = !this.shown): void {
    if (show && !this.shown) this.body.scrollTop = 0;
    this.shown = show;
    this.last = -Infinity;
    if (!show) this.html = '';
    this.el.hidden = !show;
    if (show) this.onOpen();
  }

  /** Refresh while open; closes itself if the post has gone. */
  update(s: SimState, map: CoastMap, time: number): void {
    this.state = s;
    if (!this.shown) return;
    const tabs = tradeTabs(s);
    if (tabs.length === 0) {
      this.toggle(false);
      return;
    }
    if (!tabs.includes(this.tab)) this.tab = tabs[0];
    if (this.pressed || time - this.last < REFRESH) return;
    this.last = time;
    const post = tradingPost(s);
    const yard = caravanYard(s);
    const [city, kind] = this.tab.split('-');
    const route = this.tab === 'tyre' || this.tab === 'yard' ? undefined : routeOf(s, city, kind as RouteKind);
    const page = route ? routeHtml(s, map, route) : this.tab === 'yard' && yard ? yardHtml(s, map, yard) : post ? tradeHtml(s, map, post) : '';
    const nav = tabs.length > 1 ? `<nav class="tradetabs">${tabs.map((t) => `<button data-tab="${t}" class="${t === this.tab ? 'on' : ''}" title="${t === 'tyre' ? 'The merchant ship from Tyre' : t === 'yard' ? 'The caravan yard' : esc(routeName(t.split('-')[0] as never, t.split('-')[1] as RouteKind))}">${tabName(t)}</button>`).join('')}</nav>` : '';
    // (Slice 49: the quarantine order heads every tab, with health on or a quarantine running.)
    const quarantine = s.health?.on || s.health?.quarantine > s.tick ? quarantineHtml(s) : '';
    const html = nav + quarantine + page;
    if (html !== this.html) {
      // In place: only what changed, so a hover tip stays up and a click lands.
      if (this.html) morph(this.body, html);
      else this.body.innerHTML = html;
      this.html = html;
    }
  }

  /** The panel's text (for the smoke test). */
  get text(): string {
    return this.el.hidden ? '' : (this.body.textContent ?? '');
  }
}
