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
  // Slice 50: the quay's picture.
  SAIL_OUT,
  sailInTicks,
  storeKind,
  surplusOf,
  TRADE_GOODS,
  tradingPost,
} from '../sim/trade';
// Slice 50: the kit.
import { actionIcon, buildingIcon, goodIcon } from './icons';
import { kbar, kchip, khead, kitHtml, ksec, kstep, ktoggle } from './kit';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
  const bar = ship.phase === SHIP_LEAVING ? '' : kbar({ value: Math.max(0, Math.min(1, share)), max: 1, tone: 'sea', tip: ship.phase === SHIP_AWAY ? 'Her voyage, from her last call to the next' : 'She is here' });
  return `<div class="shipnews k-ship${cls}"><b>${esc(news.short)}</b><p>${esc(news.line)}</p>${bar}</div>`;
}

/** Slice 50: the quay drawn from the state: the post, the jetty, what waits on the quay, and the ship where she is. */
function quayPicture(s: SimState, post: Building): string {
  const ship = s.trade.ship;
  const quay = TRADE_GOODS.map((w) => held(post, w));
  // Where she is: x along the water (her bow at the jetty's end at 1), and how near (her size).
  let at = -1;
  if (ship.phase === SHIP_COMING) at = Math.max(0, Math.min(1, (s.tick - ship.since) / Math.max(1, sailInTicks(ship))));
  else if (ship.phase === SHIP_MOORED) at = 1;
  else if (ship.phase === SHIP_LEAVING) at = 1 - Math.max(0, Math.min(1, (s.tick - ship.since) / SAIL_OUT));
  const stacks: string[] = [];
  let x = 96;
  quay.forEach((n, k) => {
    if (n <= 0 || x > 196) return;
    const h = 5 + Math.round(15 * Math.min(1, n / (QUAY_ROOM * 0.5)));
    const c = SWATCH[k];
    // (A stack of sacks or jars: rounded blocks, one over another, in the good's colour.)
    let blocks = '';
    for (let y = 0; y < h; y += 5) blocks += `<rect x="${x}" y="${66 - y - 5}" width="9" height="5" rx="1.6" fill="${c}" stroke="rgba(40,24,8,.55)" stroke-width=".6"/>`;
    stacks.push(`<g><title>${esc(`${fmt(n)} ${WARE_NAMES[TRADE_GOODS[k]]} on the quay`)}</title>${blocks}</g>`);
    x += 11;
  });
  let boat = '';
  if (at >= 0) {
    // From the horizon (small, far right) to the jetty's end.
    const t = at * at * (3 - 2 * at);
    const sc = 0.32 + 0.68 * t;
    const bx = 352 - (352 - 262) * t;
    const by = 40 + 30 * t;
    const sail = ship.phase === SHIP_MOORED ? '<path d="M-2 -40h4v2h-4z" fill="#f2e6c8"/><path d="M-14 -38h28v4h-28z" fill="#e8dcc0" stroke="#8a6a44" stroke-width=".6"/>' : '<path d="M-15 -38h30l-3 24h-24z" fill="#f2e6c8" stroke="#8a6a44" stroke-width=".8"/><path d="M-14.4 -30h28.8M-13.6 -22h27.2" stroke="#6a2a7a" stroke-width="2.4"/>';
    const goods = ship.phase === SHIP_MOORED && ship.hold.some((n) => n > 0) ? '<rect x="-12" y="-9" width="7" height="5" rx="1" fill="#a8874f"/><rect x="-4" y="-9" width="7" height="5" rx="1" fill="#8aa83a"/><rect x="4" y="-9" width="7" height="5" rx="1" fill="#7a2e80"/>' : '';
    boat = `<g transform="translate(${bx.toFixed(1)} ${by.toFixed(1)}) scale(${sc.toFixed(3)})"><path d="M0 -42v38" stroke="#5a3a1e" stroke-width="2"/>${sail}<path d="M-30 -5h58l6-4-2 6c-2 6-8 9-14 9h-40c-5 0-8-4-8-11z" fill="#7a4a2c" stroke="#3a2010" stroke-width="1"/><path d="M-28 -2h54" stroke="#c0462e" stroke-width="1.6"/>${goods}</g>`;
  }
  return `<svg class="k-quay" viewBox="0 0 360 96" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(shipNews(s)?.short ?? 'The quay')}">
<defs><linearGradient id="kq-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe2ea"/><stop offset="1" stop-color="#f4ead6"/></linearGradient><linearGradient id="kq-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6ea4bc"/><stop offset="1" stop-color="#2f6f8e"/></linearGradient></defs>
<rect width="360" height="40" fill="url(#kq-sky)"/><rect y="40" width="360" height="56" fill="url(#kq-sea)"/>
<path d="M210 52q10-2 20 0t20 0M270 62q10-2 20 0t20 0M230 82q10-2 20 0t20 0M300 78q8-2 16 0" stroke="rgba(255,255,255,.45)" stroke-width="1.2" fill="none"/>
<path d="M0 40h70q14 0 24 6 6 4 6 12v38H0z" fill="#b8a27a"/><path d="M0 34c20-8 40-10 64-4l6 10H0z" fill="#8a9a5a"/>
<path d="M0 66h204v30H0z" fill="#c9b48c" stroke="#7a6446" stroke-width="1"/><path d="M0 72h204M0 80h204M0 88h204M30 66v6M70 66v6M110 66v6M150 66v6M190 66v6M50 72v8M90 72v8M130 72v8M170 72v8M20 80v8M60 80v8M100 80v8M140 80v8M180 80v8" stroke="rgba(90,70,40,.45)" stroke-width=".8"/>
<path d="M204 63h66v6h-66z" fill="#a8743e" stroke="#5a3a1e" stroke-width=".8"/><path d="M214 69v14M234 69v14M254 69v14M268 69v14" stroke="#5a3a1e" stroke-width="2.2"/>
<g><path d="M12 64V44h70v20z" fill="#efe6d0" stroke="#7a6446" stroke-width=".9"/><path d="M8 45 47 31l39 14z" fill="#b04a2c" stroke="#6e2a1a" stroke-width=".9" stroke-linejoin="round"/><path d="M20 47v17M32 47v17M44 47v17M56 47v17M68 47v17" stroke="#b8a682" stroke-width="2.6"/><path d="M10 64h76" stroke="#7a6446" stroke-width="1.4"/></g>
${stacks.join('')}${boat}
</svg>`;
}

/** Last time she called: what she bought and paid. */
function lastBlock(s: SimState): string {
  const ship = s.trade.ship;
  if (ship.visits === 0) return '<p class="none">No ship has called yet.</p>';
  const lines = ship.lastBought
    .map((n, k) => (n > 0 ? `<li>${goodIcon(TRADE_GOODS[k])}<span>${fmt(n)} ${WARE_NAMES[TRADE_GOODS[k]]}</span><span class="dr">${fmt(priceFor(k, n))} dr</span></li>` : ''))
    .join('');
  return `<p class="last">${when(ship.lastAt)}: ${ship.lastPaid > 0 ? `she paid <b>${fmt(ship.lastPaid)} dr</b>` : 'nothing was on the quay for sale'}</p>${lines ? `<ul class="bought k-bought">${lines}</ul>` : ''}`;
}

/** The goods: a row for each, with its sell switch, its icon, its price, what the stores hold against what is kept, and the keep's stepper. */
function goodsTable(s: SimState, post: Building): string {
  const rows = TRADE_GOODS.map((w, k) => {
    const sell = s.trade.sell[k];
    const keep = s.trade.keep[k];
    const holds = cityHolds(s, w);
    const quay = held(post, w);
    const spare = surplusOf(s, post, k);
    const name = WARE_NAMES[w];
    const stores = storeKind(w) === 'granary' ? 'granaries' : 'storehouses';
    const keepTitle = `The city keeps ${fmt(keep)} ${name} in its ${stores}; the dockers take only what is beyond that to the quay. Hold a button down to step faster.`;
    const holdsTitle = `The city’s ${stores} hold ${fmt(holds)} ${name}${sell ? ` · ${spare > 0 ? `${fmt(spare)} to spare beyond what is kept` : 'nothing to spare beyond what is kept'}` : ''}. The mark is what is kept.`;
    const top = Math.max(holds, keep, 1) * 1.15;
    const tog = ktoggle({ on: sell, data: { sell: k }, label: `Sell ${name}`, tip: sell ? `For sale: the dockers carry spare ${name} to the quay` : `Not for sale: switch on to sell spare ${name} to the ship` });
    const price = kchip(`${PRICES[k]}<small> dr</small>`, { tone: sell ? 'gold' : 'plain', tip: `The ship pays ${PRICES[k]} dr for every 100 ${name}, always${routesPay(s, k)}`, cls: 'price' });
    const bar = kbar({ value: holds, max: top, tone: sell && spare > 0 ? 'stock' : 'stone', tick: keep > 0 ? keep / top : undefined, tip: holdsTitle });
    const q = quay > 0 ? kchip(fmt(quay), { tone: 'sea', tip: `${fmt(quay)} ${name} on the quay (room for ${fmt(QUAY_ROOM)})`, cls: 'quay' }) : `<span class="quay none" data-tip="Nothing on the quay">·</span>`;
    const step = kstep({ value: fmt(keep), less: { keep: k, by: -1 }, more: { keep: k, by: 1 }, lessWhy: keep <= 0 ? 'The city keeps none' : undefined, moreWhy: keep >= KEEP_MAX ? `It keeps ${fmt(KEEP_MAX)} at the most` : undefined, tip: keepTitle, name: `${name} kept`, small: true });
    return `<div class="k-good${sell ? ' on' : ' off'}" data-good="${k}"><span class="g-tog">${tog}</span><span class="g-ic">${goodIcon(w)}</span><span class="g-nm">${cap(name)}</span>${price}<span class="g-bar">${bar}<small>${fmt(holds)}</small></span>${q}<span class="g-keep">${step}</span></div>`;
  }).join('');
  return `<div class="k-goods"><div class="k-ghead"><span>Sell</span><span></span><span data-tip="Each good, and under it a bar of what the city’s stores hold: the mark is what it keeps">Good</span><span data-tip="Drachmas for every 100">Price</span><span data-tip="Waiting on the quay for the ship">Quay</span><span data-tip="What the city keeps, not for sale">Keep</span></div>${rows}</div>`;
}

/** The whole panel's inner HTML. */
export function tradeHtml(s: SimState, map: CoastMap, post: Building): string {
  const worth = quayWorth(s, post);
  const quay = TRADE_GOODS.map((w) => held(post, w));
  const staff = workersLine(s, map, post);
  const warn: string[] = [];
  if (roadsBeside(s, map.size, post).length === 0) warn.push('No road beside the post: its dockers can’t reach the stores. Lay a road along one side.');
  else if (rateOf(post) === 0) warn.push(`${staff.split('\n')[0]}: no dockers go out until it has workers.`);
  if (!s.trade.sell.some((x) => x)) warn.push('Nothing is switched on for sale: switch on the goods below, or the ship sails away with nothing.');
  const dockers = dockerNews(s, map, post);
  const onQuay = quay.some((n) => n > 0) ? `On the quay: ${goodsList(quay)}${worth > 0 ? ` · worth <b>${fmt(worth)} dr</b> at her prices` : ''}` : 'The quay is empty.';
  return `${khead({ title: 'The trading post', kicker: post.workers === 0 ? `No workers · it needs ${jobsAt(post)}` : staff.split('\n')[0] || 'The trading post', sub: 'A merchant ship calls every three months and buys what waits on the quay', pic: buildingIcon('trading') })}
<div class="k-quaybox">${quayPicture(s, post)}${shipBlock(s)}</div>
${warn.map((w) => `<div class="late">${esc(w)}</div>`).join('')}
${ksec('Goods', `${goodsTable(s, post)}<p class="quayline">${onQuay}</p>${dockers ? `<p class="dockers">${esc(dockers)}</p>` : ''}`, { icon: 'sell' })}
${ksec('The last ship', lastBlock(s), { icon: 'ship' })}
<p class="foot">Prices are per 100. The dockers carry what the stores hold beyond what the city keeps (the mark on each bar) to the quay, the most valuable first, and carry back anything taken off sale.</p>`;
}

/** A route's goods' market prices in its city, with their arrows, a year's chart and why. */
function routePrices(s: SimState, r: TradeRoute): string {
  const { theyBuy, theySell } = tradesOf(s, r.city);
  const goods = [...theyBuy, ...theySell];
  if (!goods.length) return '';
  return `<section class="prices k-sec"><h3 class="k-h"><span class="k-ht">Prices in ${esc(PLACES[r.city].name)}</span></h3><p class="harvest">${esc(harvestLine(s, r.city))}</p><ul class="pricelist">${priceRows(s, r.city, goods)}</ul></section>`;
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
  return `${khead({ title: name, kicker: `Trade route · ${r.kind === 'land' ? 'by road' : 'by sea'} · open since ${when(r.opened)}`, sub: r.kind === 'land' ? 'A caravan comes every two months to the caravan yard' : `A ship of ${name} calls every three months at the trading post`, pic: actionIcon(r.kind === 'land' ? 'caravan' : 'ship') })}
${routeNewsBlock(s, r)}
${routeWarnings(s, r).map((w) => `<div class="late">${esc(w)}</div>`).join('')}
<section class="routegoods">${routeGoods(s, r)}${people ? `<p class="dockers">${esc(people)}</p>` : ''}</section>
${routePrices(s, r)}
${ksec(`The last ${r.kind === 'land' ? 'caravan' : 'ship'}`, routeLast(r), { icon: r.kind === 'land' ? 'caravan' : 'ship' })}
<p class="foot">Prices are per 100; each city buys and sells only so much a year. What you sell goes beyond what the city keeps; what you buy is unloaded and paid for as the trader arrives, as much as the treasury can spare then (it keeps back a month’s wages).</p>`;
}

/** The caravan yard's tab, while no road is open. */
export function yardHtml(s: SimState, map: CoastMap, yard: Building): string {
  const staff = workersLine(s, map, yard);
  const goods = TRADE_GOODS.map((w) => held(yard, w));
  const warn: string[] = [];
  if (roadsBeside(s, map.size, yard).length === 0) warn.push('No road beside the yard: caravans can’t reach it, nor its porters the stores. Lay a road along one side.');
  return `${khead({ title: 'The caravan yard', kicker: staff.split('\n')[0] || 'The caravan yard', sub: 'Where the caravans of Greece trade', pic: buildingIcon('yard') })}
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
    el.className = 'household trade kit';
    el.hidden = true;
    el.innerHTML = '<button class="close" title="Close (Esc)" aria-label="Close">×</button><div class="body"></div>';
    root.appendChild(el);
    this.el = el;
    this.body = el.querySelector('.body') as HTMLElement;
    (el.querySelector('.close') as HTMLElement).addEventListener('click', () => this.toggle(false));
    this.body.addEventListener('pointerdown', (e) => {
      // (Slice 50: a stepper's boss held down repeats, and the panel shows each step: it is updated in place, so the press still lands.)
      this.pressed = !(e.target instanceof Element && e.target.closest('.k-boss'));
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
      // Slice 50: the sell switch.
      const sw = (e.target as HTMLElement).closest('button[data-sell]') as HTMLButtonElement | null;
      if (sw && this.state) {
        const k = Number(sw.dataset.sell);
        send({ type: 'trade', good: TRADE_GOODS[k], sell: !this.state.trade.sell[k] });
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
    const html = kitHtml(nav + page);
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
