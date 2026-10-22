/**
 * What a moving price looks like in the panels: its arrow (up, down or
 * steady), its reason line ("Oil cheap in Corinth: you sold them 2,500 in the
 * last year"), a year's chart drawn in code, the ruler's terms and the
 * harvest. Used by the map of Greece's city pages and the trade panel's route
 * tabs. Reads the sim only.
 */
import { PLACES, type CityId } from '../map/greece';
import { dateOfTick, MONTH_NAMES, TICKS_PER_MONTH } from '../sim/clock';
import { WARE_NAMES } from '../sim/foods';
import type { SimState, WorldCity } from '../sim/state';
import { PRICES, TRADE_GOODS } from '../sim/trade';
import { cityOf, HARVEST_MONTH, HARVEST_WORDS, moodOf, moodWord, outlookWords, priceWhy, sellsAndBuys, termsOf, yourPrice, type Arrow } from '../sim/world';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cap = (t: string): string => `${t[0].toUpperCase()}${t.slice(1)}`;
/** The trade goods' colours, as in the trade panel. */
export const SWATCH = ['#a8874f', '#b5524a', '#f3d874', '#8aa83a', '#eee2c0', '#7a2e80'];
/** "Corinth’s", "Athens’". */
export const whose = (name: string): string => (name.endsWith('s') ? `${name}’` : `${name}’s`);
const ARROW_WORDS = { '1': 'rising', '-1': 'falling', '0': 'steady' } as const;

/**
 * A small arrow: up (rising), down (falling) or a dash (steady). Slice 31: coloured for what the move means
 * for you, if you would sell the good there (`sell`: rising is good) or buy it (`buy`: falling is good);
 * a good the city has about enough of keeps a plain arrow.
 */
export function arrowHtml(a: Arrow, side: '' | 'sell' | 'buy' = ''): string {
  const cls = a > 0 ? 'up' : a < 0 ? 'down' : 'flat';
  const path = a > 0 ? 'M5 1.5L9 8.5H1z' : a < 0 ? 'M5 8.5L9 1.5H1z' : 'M1.5 5h7';
  const shape = a === 0 ? `<path d="${path}" stroke-width="1.8" stroke-linecap="round"/>` : `<path d="${path}"/>`;
  const good = a !== 0 && side !== '' && (a > 0) === (side === 'sell');
  const meaning = a === 0 || side === '' ? '' : good ? ' good' : ' bad';
  const words = `${ARROW_WORDS[String(a) as '1' | '-1' | '0']}${meaning ? (good ? ', good for you' : ', bad for you') : ''}`;
  return `<svg class="parrow ${cls}${meaning || (a !== 0 ? ' plain' : '')}" viewBox="0 0 10 10" width="10" height="10" aria-label="${words}" role="img">${shape}</svg>`;
}

/** Whether you would sell a good to a city (it buys it) or buy it there (it sells it), for the arrows' colours. */
export function sideOf(c: WorldCity, k: number): '' | 'sell' | 'buy' {
  const { sells, buys } = sellsAndBuys(c);
  return buys.includes(k) ? 'sell' : sells.includes(k) ? 'buy' : '';
}

/** A good's price in a city and why, in a line: "Oil cheap in Corinth: you sold them 2,500 in the last year". */
export function priceLine(s: SimState, city: CityId, k: number): string {
  const c = cityOf(s.world, city);
  const w = priceWhy(c, k, s.tick, s.world);
  const ware = cap(WARE_NAMES[TRADE_GOODS[k]]);
  const name = PLACES[city].name;
  if (w.word === 'usual') return `${ware} at its usual price in ${name}: ${w.why}`;
  const easing = (w.word === 'dear' && w.arrow < 0) || (w.word === 'cheap' && w.arrow > 0) ? ', and easing' : '';
  return `${ware} ${w.word} in ${name}${easing}: ${w.why}`;
}

/** A year's chart of a good's price in a city: its last twelve months and today, against its usual price (a dashed rule). */
export function sparkHtml(s: SimState, c: WorldCity, k: number, width = 84, height = 24): string {
  const hist = c.history[k];
  const values = [...hist, c.price[k]];
  const usual = priceWhy(c, k, s.tick, s.world).usual;
  const lo = Math.min(usual, ...values) * 0.94;
  const hi = Math.max(usual, ...values) * 1.06;
  const span = Math.max(1, hi - lo);
  const x = (i: number): number => 1.5 + (i / (values.length - 1)) * (width - 5);
  const y = (v: number): number => height - 2 - ((v - lo) / span) * (height - 4);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const a = priceWhy(c, k, s.tick, s.world).arrow;
  // (Slice 31: the dot coloured as the arrow is, for what the move means for you.)
  const side = sideOf(c, k);
  const dot = a === 0 ? 'flat' : side === '' ? 'plain' : (a > 0) === (side === 'sell') ? 'good' : 'bad';
  const last = values.length - 1;
  // The months the history covers, for the tip: the oldest is eleven months before this one's first.
  const m0 = dateOfTick(Math.max(0, s.tick - 12 * TICKS_PER_MONTH)).month;
  const first = MONTH_NAMES[(m0 + 1) % 12];
  const title = `${cap(WARE_NAMES[TRADE_GOODS[k]])} in ${PLACES[c.id].name} over the last year: ${hist[0]} in ${first}, ${Math.min(...values)} at the lowest, ${Math.max(...values)} at the highest, ${c.price[k]} now (usually ${usual})`;
  return `<svg class="spark" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><line class="usual" x1="0" x2="${width}" y1="${y(usual).toFixed(1)}" y2="${y(usual).toFixed(1)}"/><polyline points="${pts}"/><circle class="${dot}" cx="${x(last).toFixed(1)}" cy="${y(values[last]).toFixed(1)}" r="2.2"/></svg>`;
}

/** The ruler's terms in words: "Corinth’s terms: cordial, prices 5% in your favour". '' where there is no ruler. */
export function termsLine(s: SimState, city: CityId): string {
  const c = cityOf(s.world, city);
  if (!c.ruler) return '';
  const t = termsOf(c, s.tick);
  const mood = moodWord(moodOf(c, s.tick));
  const how = t > 0 ? `prices ${t}% in your favour` : t < 0 ? `prices ${-t}% against you` : 'prices as the market';
  return `${whose(PLACES[city].name)} terms: ${mood}, ${how}`;
}

/** What the terms mean, for a tip. */
export function termsMeaning(s: SimState, city: CityId): string {
  const c = cityOf(s.world, city);
  const t = termsOf(c, s.tick);
  const who = c.ruler ? `${c.ruler.title.replace(/ of .*/, '')} ${c.ruler.name}` : PLACES[city].name;
  if (t === 0) return `${who} trades with you at the market price`;
  return t > 0 ? `${who} pays you ${t}% over the market for what you sell, and asks ${t}% under it for what you buy` : `${who} pays you ${-t}% under the market for what you sell, and asks ${-t}% over it for what you buy`;
}

/** The harvest in words: "Harvest: poor last autumn · the fields look good". */
export function harvestLine(s: SimState, city: CityId): string {
  const c = cityOf(s.world, city);
  if (!c.ruler) return '';
  const autumn = dateOfTick(s.tick).month >= HARVEST_MONTH ? 'this autumn' : 'last autumn';
  const look = outlookWords(c, s.tick);
  return `Harvest: ${HARVEST_WORDS[c.harvest]} ${autumn}${look ? ` · ${look}` : ''}`;
}

/** Your price with a city for a good, with its arrow, and a tip saying what makes it (the market, the terms, the reason). */
export function yourPriceCell(s: SimState, city: CityId, k: number): { html: string; title: string } {
  const c = cityOf(s.world, city);
  const yours = yourPrice(s.world, city, k, s.tick);
  const market = c.price[k];
  const { buys } = sellsAndBuys(c);
  const name = PLACES[city].name;
  const ware = WARE_NAMES[TRADE_GOODS[k]];
  const t = termsOf(c, s.tick);
  const pays = buys.includes(k) ? `${name} pays you ${yours} dr for every 100 ${ware}` : `${name} asks ${yours} dr for every 100 ${ware}`;
  const terms = t === 0 ? ` (the market price)` : ` (the market price ${market}, ${t > 0 ? `${t}% in your favour` : `${-t}% against you`} on ${whose(name)} terms)`;
  const title = `${pays}${terms}. ${priceLine(s, city, k)}. The Tyre ship pays ${PRICES[k]}.`;
  return { html: `${yours}${arrowHtml(priceWhy(c, k, s.tick, s.world).arrow, sideOf(c, k))}`, title };
}

/** A list of goods' prices in a city, each with its arrow, a year's chart and its reason. */
export function priceRows(s: SimState, city: CityId, goods: readonly number[]): string {
  const c = cityOf(s.world, city);
  return goods
    .map((k) => {
      const w = priceWhy(c, k, s.tick, s.world);
      const ware = cap(WARE_NAMES[TRADE_GOODS[k]]);
      const line = priceLine(s, city, k);
      // Only a price something is moving gets a reason line (the tip has the rest).
      const easing = (w.word === 'dear' && w.arrow < 0) || (w.word === 'cheap' && w.arrow > 0) ? ', easing' : '';
      const why = w.word === 'usual' ? '' : `<span class="why"><b class="${w.word}">${cap(w.word)}${easing}</b> (usually ${w.usual}): ${esc(w.why)}</span>`;
      return `<li class="${w.word}" title="${esc(`${line}. Usually ${w.usual} here; the Tyre ship pays ${PRICES[k]}.`)}"><i style="background:${SWATCH[k]}"></i><span class="g">${ware}</span><span class="p"><b>${c.price[k]}</b>${arrowHtml(w.arrow, sideOf(c, k))}</span>${sparkHtml(s, c, k)}${why}</li>`;
    })
    .join('');
}

/** A ruled city's prices block: the terms (unless the page shows them already), the harvest, and every good, grouped as it sells, buys or has about enough of. */
export function pricesBlock(s: SimState, city: CityId, withTerms = true): string {
  const c = cityOf(s.world, city);
  const name = PLACES[city].name;
  const { sells, buys } = sellsAndBuys(c);
  const rest = TRADE_GOODS.map((_, k) => k).filter((k) => !sells.includes(k) && !buys.includes(k));
  const group = (title: string, goods: number[]): string => (goods.length ? `<h4>${esc(title)}</h4><ul class="pricelist">${priceRows(s, city, goods)}</ul>` : '');
  const moved = TRADE_GOODS.some((_, k) => priceWhy(c, k, s.tick, s.world).word !== 'usual');
  const terms = termsLine(s, city);
  return `<section class="prices"><h3>Prices in ${esc(name)}</h3>
${withTerms ? `<p class="terms" title="${esc(termsMeaning(s, city))}">${esc(terms)}</p>` : ''}
<p class="harvest">${esc(harvestLine(s, city))}</p>
${group(`${name} sells: it makes plenty`, sells)}${group(`${name} buys: it is short`, buys)}${group('It has about enough of', rest)}${moved ? '' : '<p class="none">Every price is at its usual level: nothing is moving them now.</p>'}
<p class="foot">Market prices per 100, with the last year’s on the chart (the dashed line is the usual price). What you sell a city makes it cheaper there for a while, what you buy dearer; harvests come in each September. ${withTerms ? 'The terms are on top' : 'The terms at the top of the page are'} for what you trade with ${esc(name)}.</p></section>`;
}
