/**
 * What the trade routes look like in the panels: a route's news (where its
 * trader is), its goods (what the city buys from you, with a sell tick and
 * the one keep figure the stores share; what it sells you, with a buy tick and
 * how much to stock up to; each with its price and what is left of the year's
 * limit), its last visit, and the ways still to open. Used by the trade panel
 * (the trading post and the caravan yard open it) and by the map of Greece's
 * city pages, so a route can be run from either. Every button sends a command.
 */
import { PLACES, type CityId } from '../map/greece';
import { dateOfTick, formatYear } from '../sim/clock';
import type { Command } from '../sim/commands';
import { held, WARE_NAMES } from '../sim/foods';
import { boughtFrom, caravanYard, heldFor, keptIn, LAND_EVERY, routeNews, routeOf, routeRefusal, ROUTE_WAYS, SEA_EVERY, soldTo, tradesOf, yearlyLimit, type RouteKind } from '../sim/routes';
import { offerLeft, offerOn, offerPrice } from '../sim/favours';
import { termsLine, termsMeaning, yourPriceCell } from './prices';
// Slice 50: the kit's icons for the goods (they had colour swatches).
import { tradeIcon } from './icons';
// Slice 52: the route tables' switches and steppers from the kit.
import { kstep, ktoggle } from './kit';
import type { Building, SimState, TradeRoute } from '../sim/state';
import { cityHolds, KEEP_MAX, keepNext, TRADE_GOODS, tradingPost } from '../sim/trade';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const cap = (t: string): string => `${t[0].toUpperCase()}${t.slice(1)}`;
/** The trade goods' colours, as in the trade panel. */
const when = (tick: number): string => {
  const d = dateOfTick(tick);
  return `${d.monthName} ${formatYear(d.yearBC)}`;
};

/** A route's name: "Corinth by road", "Athens by sea". */
export const routeName = (city: CityId, kind: RouteKind): string => `${PLACES[city].name} by ${kind === 'land' ? 'road' : 'sea'}`;
/** A route's id in the panels' tabs and buttons: "corinth-land". */
export const routeKey = (r: { city: CityId; kind: RouteKind }): string => `${r.city}-${r.kind}`;

/** Where a route's goods wait for its trader: the caravan yard, or the trading post's quay. */
export const depotOf = (s: SimState, r: TradeRoute): Building | undefined => (r.kind === 'land' ? caravanYard(s) : tradingPost(s));

/** The route's news, with a bar of the time to its next trader. */
export function routeNewsBlock(s: SimState, r: TradeRoute): string {
  const news = routeNews(s, r);
  const every = r.kind === 'land' ? LAND_EVERY : SEA_EVERY;
  const share = news.phase === 0 ? 1 - Math.max(0, r.next - s.tick) / every : 1;
  const bar = news.phase === 3 ? '' : `<div class="bar"><i style="width:${(Math.max(0, Math.min(1, share)) * 100).toFixed(1)}%"></i></div>`;
  return `<div class="shipnews${news.phase === 1 || news.phase === 2 ? ' here' : ''}"><b>${esc(news.short)}</b><p>${esc(news.line)}</p>${bar}</div>`;
}

/** What is left of a city's yearly limit in a good, sold or bought this year (and taken so far this visit). */
function leftOf(s: SimState, r: TradeRoute, k: number, selling: boolean): number {
  const o = offerOn(s.world, r.city, k, selling ? 'buy' : 'sell');
  // (Slice 31: shared by every route to the city.)
  if (o) return Math.max(0, offerLeft(o) - (selling ? heldFor(s, r.city, k) : 0));
  return Math.max(0, yearlyLimit(s, r.city, k) - (selling ? soldTo(s, r.city, k) + heldFor(s, r.city, k) : boughtFrom(s, r.city, k)));
}

/** The year's limit in a good: the offer's amount while one is taken, else the city's own. */
function limitOf(s: SimState, r: TradeRoute, k: number, selling: boolean): number {
  const o = offerOn(s.world, r.city, k, selling ? 'buy' : 'sell');
  return o ? o.amount : yearlyLimit(s, r.city, k);
}

/** The keep figure's − and + (the one the trading post has always had, shared by every route). Slice 52: the kit's stepper. */
function keepCell(s: SimState, k: number): string {
  const keep = s.trade.keep[k];
  const name = WARE_NAMES[TRADE_GOODS[k]];
  const tip = `The city keeps ${fmt(keep)} ${name} in its ${keptIn(k)}; only what is beyond that goes to the yard or the quay (one figure, for every trader). Hold a button down to step faster.`;
  return `<td class="keep">${kstep({ value: fmt(keep), less: { keep: k, by: -1 }, more: { keep: k, by: 1 }, lessWhy: keep <= 0 ? 'The city keeps none' : undefined, moreWhy: keep >= KEEP_MAX ? `It keeps ${fmt(KEEP_MAX)} at the most` : undefined, tip, name: `${name} kept`, small: true })}</td>`;
}

/** The up-to figure's − and +. */
function uptoCell(r: TradeRoute, k: number): string {
  const n = r.upto[k];
  const name = WARE_NAMES[TRADE_GOODS[k]];
  const route = routeKey(r);
  return `<td class="keep">${kstep({ value: fmt(n), less: { upto: k, by: -1, route }, more: { upto: k, by: 1, route }, lessWhy: n <= 0 ? 'Up to none' : undefined, moreWhy: n >= KEEP_MAX ? `Up to ${fmt(KEEP_MAX)} at the most` : undefined, tip: `Buy enough ${name} to stock the ${keptIn(k)} up to ${fmt(n)}. Hold a button down to step faster.`, name: `${name} to stock up to`, small: true })}</td>`;
}

/** A price cell: your price with the city (the market's and its ruler's terms) and its arrow, with a tip saying what moved it. */
function priceTd(s: SimState, city: CityId, k: number, selling: boolean): string {
  const o = offerOn(s.world, city, k, selling ? 'buy' : 'sell');
  if (o) {
    const n = offerPrice(s, o);
    return `<td class="price offer" title="${esc(`${PLACES[city].name}'s offer: ${fmt(n)} for every 100 ${WARE_NAMES[TRADE_GOODS[k]]}, ${fmt(offerLeft(o))} more this year`)}">${fmt(n)} <small>offer</small></td>`;
  }
  const p = yourPriceCell(s, city, k);
  return `<td class="price" title="${esc(p.title)}">${p.html}</td>`;
}

/** A route's goods: the ruler's terms (unless the page shows them already), what they buy from you, and what they sell you. */
export function routeGoods(s: SimState, r: TradeRoute, withTerms = true): string {
  const { theyBuy, theySell } = tradesOf(s, r.city);
  const name = PLACES[r.city].name;
  const depot = depotOf(s, r);
  const at = r.kind === 'land' ? 'Yard' : 'Quay';
  const sellRows = theyBuy
    .map((k) => {
      const w = TRADE_GOODS[k];
      const on = r.sell[k];
      const ware = WARE_NAMES[w];
      const left = leftOf(s, r, k, true);
      const lim = limitOf(s, r, k, true);
      return `<tr class="${on ? 'on' : 'off'}"><td class="good">${ktoggle({ on, data: { rsell: k, route: routeKey(r) }, label: `Sell ${ware} to ${name}`, html: `${tradeIcon(k)}${cap(ware)}`, tip: on ? `Selling ${ware} to ${name}: the ${r.kind === 'land' ? 'porters carry' : 'dockers carry'} spare ${ware} to the ${r.kind === 'land' ? 'yard' : 'quay'}` : `Switch on to sell spare ${ware} to ${name}` })}</td>
${priceTd(s, r.city, k, true)}
<td class="left" title="${esc(`${name} buys up to ${fmt(lim)} ${ware} a year: ${fmt(left)} left this year`)}">${fmt(left)}</td>
<td class="holds" title="${esc(`Your ${keptIn(k)} hold ${fmt(cityHolds(s, w))} ${ware}`)}">${fmt(cityHolds(s, w))}</td>
${keepCell(s, k)}
<td class="quay" title="${esc(`${fmt(depot ? held(depot, w) : 0)} ${ware} at the ${r.kind === 'land' ? 'caravan yard' : 'quay'}`)}">${depot && held(depot, w) > 0 ? fmt(held(depot, w)) : '·'}</td></tr>`;
    })
    .join('');
  const buyRows = theySell
    .map((k) => {
      const w = TRADE_GOODS[k];
      const on = r.buy[k];
      const ware = WARE_NAMES[w];
      const left = leftOf(s, r, k, false);
      const lim = limitOf(s, r, k, false);
      return `<tr class="${on ? 'on' : 'off'}"><td class="good">${ktoggle({ on, data: { rbuy: k, route: routeKey(r) }, label: `Buy ${ware} from ${name}`, html: `${tradeIcon(k)}${cap(ware)}`, tip: on ? `Buying ${ware} from ${name}: its trader brings enough to stock the ${keptIn(k)} up to the figure` : `Switch on to buy ${ware} from ${name}` })}</td>
${priceTd(s, r.city, k, false)}
<td class="left" title="${esc(`${name} sells up to ${fmt(lim)} ${ware} a year: ${fmt(left)} left this year`)}">${fmt(left)}</td>
<td class="holds" title="${esc(`Your ${keptIn(k)} hold ${fmt(cityHolds(s, w))} ${ware}`)}">${fmt(cityHolds(s, w))}</td>
${uptoCell(r, k)}<td class="quay" title="${esc(`${fmt(depot ? held(depot, w) : 0)} ${ware} at the ${r.kind === 'land' ? 'caravan yard' : 'quay'}${depot && held(depot, w) > 0 ? `, for the ${r.kind === 'land' ? 'porters' : 'dockers'} to carry to the ${keptIn(k)}` : ''}`)}">${depot && held(depot, w) > 0 ? fmt(held(depot, w)) : '·'}</td></tr>`;
    })
    .join('');
  const head = (what: string, fig: string, figTitle: string): string =>
    `<thead><tr><th>${what}</th><th title="Your price for every 100: the market’s, with the ruler’s terms">Price</th><th title="What is left of this year’s limit">Left</th><th title="What your stores hold">Stores</th><th title="${figTitle}">${fig}</th><th title="Waiting at the ${r.kind === 'land' ? 'caravan yard' : 'quay'}">${at}</th></tr></thead>`;
  const sell = sellRows ? `<table class="goods">${head('Sell', 'Keep', 'What the city keeps, not for sale')}<tbody>${sellRows}</tbody></table>` : `<p class="none">${esc(name)} is short of nothing you could sell it.</p>`;
  const buy = buyRows ? `<table class="goods">${head('Buy', 'Up to', 'Buy enough to stock your stores up to this')}<tbody>${buyRows}</tbody></table>` : `<p class="none">${esc(name)} has nothing to spare.</p>`;
  return `${withTerms ? `<p class="terms" title="${esc(termsMeaning(s, r.city))}">${esc(termsLine(s, r.city))}</p>` : ''}<h4>${esc(name)} buys</h4>${sell}<h4>${esc(name)} sells</h4>${buy}`;
}

/** A route's last visit: what its trader took and paid, and what it brought. */
export function routeLast(r: TradeRoute): string {
  if (r.visits === 0) return `<p class="none">No ${r.kind === 'land' ? 'caravan' : 'ship'} has come yet.</p>`;
  const sold = r.lastSold.map((n, k) => (n > 0 ? `${fmt(n)} ${WARE_NAMES[TRADE_GOODS[k]]}` : '')).filter((x) => x);
  const bought = r.lastBought.map((n, k) => (n > 0 ? `${fmt(n)} ${WARE_NAMES[TRADE_GOODS[k]]}` : '')).filter((x) => x);
  const parts: string[] = [];
  parts.push(sold.length ? `took ${sold.join(', ')} and paid <b>${fmt(r.lastPaid)} dr</b>` : 'took nothing of yours');
  parts.push(bought.length ? `brought ${bought.join(', ')} for <b>${fmt(r.lastCost)} dr</b>` : 'brought nothing you ordered');
  return `<p class="last">${when(r.lastAt)}: the ${r.kind === 'land' ? 'caravan' : 'ship'} ${parts.join('; ')}.</p>`;
}

/** Why a route can't trade now, if anything stops it (for the warnings). */
export function routeWarnings(s: SimState, r: TradeRoute): string[] {
  const out: string[] = [];
  if (r.kind === 'land' && !caravanYard(s)) out.push('No caravan yard: the caravans turn back at the edge of the map. Build one (G).');
  if (r.kind === 'sea' && !tradingPost(s)) out.push('No trading post: the ships turn back. Build one on the bay shore (G).');
  if (!r.sell.some((x) => x) && !r.buy.some((x) => x)) out.push('Nothing switched on: switch on what to sell and what to buy below, or the trader comes and goes with nothing.');
  return out;
}

/** The ways to a city: each open one's goods, or a button to open it (and why it can't be, if it can't). */
export function waysHtml(s: SimState, city: CityId, withTerms = true): string {
  const ways = ROUTE_WAYS.filter((w) => w.city === city);
  if (ways.length === 0) return '';
  const name = PLACES[city].name;
  const blocks = ways.map((w) => {
    const r = routeOf(s, city, w.kind);
    const how = w.kind === 'land' ? 'By road' : 'By sea';
    if (r) {
      return `<div class="route open"><h4>${how} · open since ${when(r.opened)}</h4>${routeNewsBlock(s, r)}${routeWarnings(s, r).map((x) => `<div class="late">${esc(x)}</div>`).join('')}${routeGoods(s, r, withTerms)}${routeLast(r)}</div>`;
    }
    const why = routeRefusal(s, city, w.kind);
    const every = w.kind === 'land' ? 'a caravan every two months to your caravan yard' : 'a ship every three months to your trading post';
    return `<div class="route"><button class="openroute" data-open="${w.city}-${w.kind}"${why ? ' disabled' : ''}>${w.kind === 'land' ? `Open a road to ${name}` : `Open a sea route to ${name}`} · ${fmt(w.fee)} dr</button><p class="line">${esc(cap(every))}.${why ? ` <span class="why">${esc(why)}.</span>` : ''}</p></div>`;
  });
  return `<section class="routes"><h3>Trade with ${esc(name)}</h3>${blocks.join('')}<p class="foot">Your prices per 100 (the market’s, with the ruler’s terms), limits a year’s. What you sell goes from the stores to the yard or the quay beyond what the city keeps; what you buy comes into the stores.</p></section>`;
}

/**
 * The routes' buttons, wherever they are drawn: open a route, tick a good to
 * sell or buy, stock up to more or less, keep more or less. True if it was one.
 */
export function routeEvent(e: Event, s: SimState, send: (c: Command) => void): boolean {
  const t = e.target as HTMLElement;
  const routeOfKey = (key: string | undefined): { city: string; kind: RouteKind } | null => {
    if (!key) return null;
    const [city, kind] = key.split('-');
    return kind === 'land' || kind === 'sea' ? { city, kind } : null;
  };
  if (e.type !== 'click') return false;
  // Slice 52: a good's switch (the kit's), selling or buying it on the route.
  const sw = t.closest('button[data-rsell], button[data-rbuy]') as HTMLButtonElement | null;
  if (sw) {
    const rk = routeOfKey(sw.dataset.route);
    const r = rk ? routeOf(s, rk.city, rk.kind) : undefined;
    if (!rk || !r || sw.disabled) return false;
    if (sw.dataset.rsell !== undefined) send({ type: 'deal', city: rk.city, kind: rk.kind, good: TRADE_GOODS[Number(sw.dataset.rsell)], sell: !r.sell[Number(sw.dataset.rsell)] });
    else send({ type: 'deal', city: rk.city, kind: rk.kind, good: TRADE_GOODS[Number(sw.dataset.rbuy)], buy: !r.buy[Number(sw.dataset.rbuy)] });
    return true;
  }
  const open = t.closest('button[data-open]') as HTMLButtonElement | null;
  if (open) {
    const rk = routeOfKey(open.dataset.open);
    if (rk && !open.disabled) send({ type: 'route', city: rk.city, kind: rk.kind });
    return true;
  }
  const b = t.closest('button[data-upto], button[data-keep]') as HTMLButtonElement | null;
  if (!b || b.disabled) return false;
  const by = Number(b.dataset.by);
  if (b.dataset.keep !== undefined) {
    const k = Number(b.dataset.keep);
    const now = s.trade.keep[k];
    send({ type: 'trade', good: TRADE_GOODS[k], keep: keepNext(k, now, by) });
    return true;
  }
  const rk = routeOfKey(b.dataset.route);
  const r = rk ? routeOf(s, rk.city, rk.kind) : undefined;
  if (!rk || !r) return false;
  const k = Number(b.dataset.upto);
  const now = r.upto[k];
  send({ type: 'deal', city: rk.city, kind: rk.kind, good: TRADE_GOODS[k], upto: keepNext(k, now, by) });
  return true;
}
