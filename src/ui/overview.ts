/**
 * Slice 51: the overview, one window for the whole city, opened from the top
 * bar's columns button or with O. A page for each of the original's advisers:
 *
 * - **City**: people by level of home, how the homes feel and why, work and
 *   wages, who came and who left.
 * - **Goods**: every ware, what is in store, made, used, bought and sold last
 *   month, how long it lasts and which way it is going, with the reasons; a
 *   ware's two years of stock and where it is kept.
 * - **Treasury**: what came in and went out this month, last month, this
 *   year and last year, by kind; debts, loans and tribute.
 * - **Distribution**: each service, the share of homes it reaches, the
 *   homes it would lift, and where the gaps are; a click shows its overlay,
 *   or the gap on the map.
 * - **Crime**: crime by kind and by quarter, the caught, gangs; and the
 *   court's figures (slice 45 at the merge).
 * - **Health**: water, food and crowding today; the sick, the physicians and
 *   the plague (slice 49 at the merge).
 * - **Army and fleet**: companies, triremes, and what threatens the city.
 * - **Empire**: vassals and colonies.
 *
 * Every page has small charts of the last two years from the town's annals
 * (sim/annals.ts), every figure says why it stands where it does, and its
 * links go to the place (the camera flies there and the window steps aside),
 * the overlay, or the panel that has more. It only reads the sim.
 */
import './overview.css';
import type { CoastMap } from '../map/bake';
import { districtAt, districtTitle, DISTRICTS } from '../map/districts';
import { PLACES, siteOf, type CityId } from '../map/greece';
import type { OverlayMode } from '../render/overlay';
import { ANNAL_MONTHS, CRIME_ROWS, crimeRows, crimesIn, figures, IN_GROUPS, OUT_GROUPS, rateFor, yearNow, type AnnalMonth, type AnnalYear } from '../sim/annals';
// Merge of slice 51 with slice 49: the city's health, the month's sick and deaths, the plague.
import { HEALTH_ROWS } from '../sim/annals';
import { BEDS, bedsTaken, calledNear, FEVER_DAYS, healthFigures, healthWord, mendingFromPlague, quarantined, traderDue, tradesWith, type HealthFigures } from '../sim/health';
import { companyName, kindWord, menOf, readyOf, strength, woundedOf } from '../sim/army';
import { BUILDING_NAMES, centreOf, GREAT_ESTATE, HOME_NAMES, jobsAt, livedIn, capacity } from '../sim/buildings';
import { formatYear, MONTH_NAMES, START_MONTH, START_YEAR_BC, TICKS_PER_DAY, TICKS_PER_MONTH } from '../sim/clock';
import { colonyLoyalty, colonyYear, peopleOf, siteRecord } from '../sim/colonies';
import { STAGE_NAMES, stageOf } from '../sim/colonyworks';
import { criminalsOut, crimeOfWalker, KIND_NAME, moodCtx, talliesNow, TEMPT_HALF } from '../sim/crime';
import { expeditionLine } from '../sim/expeditions';
import { triremeName } from '../sim/fleet';
import { citySells, LEVEL_NEEDS, moodOf, NEED_WORDS, needsOf, NEEDS, untilOf, warningsOf } from '../sim/folk';
import { GOOD_SERVICE, isGood, WARES, type Ware } from '../sim/foods';
import { canWorkIn, workforce } from '../sim/labour';
import { debts, loanLine, owing } from '../sim/loans';
import { catOf } from '../sim/messages';
import { raidLine } from '../sim/raids';
import type { Building, Service, SimState } from '../sim/state';
import { bookNow, makersOf, monthOf as stockMonth, panelWares, stockOf, totalsOf, usersOf, wareInfo, type WareMonth } from '../sim/stocks';
import { goneForTaxes, TAX_RATES, taxedLately } from '../sim/taxes';
import { owedWages, WAGE, wageBill } from '../sim/treasury';
import { loyaltyOf, tributeYear } from '../sim/vassals';
import { whoseName } from '../sim/world';
import { morph } from './morph';
// Merge of slice 51 with slice 47: stationed companies and triremes, the colonies' trade, free allies and militia.
import { colonyTrade, freeTrade, militiaReady, passageOf, postedTo, shipsOf, stationedWords } from '../sim/colonyempire';
import type { Colony } from '../sim/colonies';
// Merge of slice 51 with slice 45: the court and the prisons.
import { calmWords, CELLS, prisoners, restlessWords, UNREST_WARN } from '../sim/justice';
import { wareIcon } from './wareicons';
// Merge of slice 51 with slice 50: the overview on the kit (carved head, kit cards, bars and buttons, drawn icons, the one tip).
import { actionIcon, type ActionIcon } from './icons';
import { kbar, kitHtml } from './kit';
// Slice 53: the Gods page.
import { godsPage, godsTab } from './olympus';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n: number): string => Math.round(Math.abs(n)).toLocaleString('en-GB');
const num = (n: number): string => (n < 0 ? `−${fmt(n)}` : fmt(n));
const signed = (n: number): string => (Math.round(n) > 0 ? `+${fmt(n)}` : Math.round(n) < 0 ? `−${fmt(n)}` : '0');
const cap = (t: string): string => (t ? t[0].toUpperCase() + t.slice(1) : t);
const lower = (t: string): string => (t ? t[0].toLowerCase() + t.slice(1) : t);
const plural = (n: number, one: string, many: string): string => `${fmt(n)} ${Math.round(n) === 1 ? one : many}`;
const pct = (a: number, b: number): number => (b > 0 ? Math.round((a / b) * 100) : 0);
const cityName = (id: CityId): string => PLACES[id]?.name ?? cap(id);

/** The pages, in the order of their tabs. */
export const PAGES = ['city', 'goods', 'treasury', 'distribution', 'crime', 'health', 'army', 'empire', 'gods'] as const;
export type OverviewPage = (typeof PAGES)[number];
const PAGE_NAMES: Record<OverviewPage, string> = { city: 'City', goods: 'Goods', treasury: 'Treasury', distribution: 'Distribution', crime: 'Crime', health: 'Health', army: 'Army and fleet', empire: 'Empire', gods: 'Gods' };
/** Merge of slice 50: each page's drawing, on its tab and its go-to buttons. */
const PAGE_ICONS: Record<OverviewPage, ActionIcon> = { city: 'home', goods: 'keep', treasury: 'pay', distribution: 'reach', crime: 'crime', health: 'health', army: 'guard', empire: 'station', gods: 'gods' };

/** Each service as the overview shows it: its overlay's colour and its name. */
const SERVICES: ReadonlyArray<{ need: Service; name: string; colour: string; by: string }> = [
  { need: 'water', name: 'Water', colour: '#4f9be0', by: 'fountains' },
  { need: 'food', name: 'Food', colour: '#e0a548', by: 'the agora’s food vendors' },
  { need: 'religion', name: 'Blessings', colour: '#a98ae0', by: 'the shrines’ priestesses' },
  { need: 'oil', name: 'Olive oil', colour: '#8aa83a', by: 'the oil stalls’ vendors' },
  { need: 'culture', name: 'Plays', colour: '#e3778f', by: 'the theatres’ actors' },
  { need: 'fleece', name: 'Fleece', colour: '#c8b68a', by: 'the fleece stalls’ vendors' },
  { need: 'wine', name: 'Wine', colour: '#8e2f4e', by: 'the wine stalls’ vendors' },
];
/** What builds each service (for a service the city has no building for). */
const HOW: Record<Service, string> = {
  water: 'a fountain (B)',
  food: 'an agora (K) with a granary to fill it',
  religion: 'a shrine (V)',
  oil: 'an oil stall at the agora (K twice)',
  culture: 'a theatre (P)',
  fleece: 'a fleece stall at the agora (K three times)',
  wine: 'a wine stall at the agora (K four times)',
};
const SERVICE_BUILDING: Record<Service, Building['kind']> = { water: 'fountain', food: 'agora', religion: 'shrine', oil: 'agora', culture: 'theatre', fleece: 'agora', wine: 'agora' };

/** Callbacks into the game. */
export interface OverviewDeps {
  /** Fly the camera to a spot (the window steps aside), showing an overlay there if one is named. */
  goTo(x: number, z: number, mode?: OverlayMode): void;
  /** Show an overlay on the map (the window steps aside). */
  overlay(mode: OverlayMode): void;
  /** Open a home's panel, or a building's, and fly there. */
  openHome(id: number): void;
  openBuilding(id: number): void;
  /** Open a ware's page on the side panel. */
  openWare(w: Ware): void;
  /** Open the ledger. */
  ledger(): void;
  /** Open a city's page on the map of Greece (on a tab), or a site's. */
  city(id: CityId, tab?: string): void;
  site(id: string): void;
  /** A company: the Army tab, its banner in hand. */
  company(id: number): void;
}

// ---------------------------------------------------------------------------- the months

/** The name of a month (months since the founding): "Mar 749 BC". */
function monthName(m: number, long = false): string {
  const abs = START_MONTH + m;
  let y = START_YEAR_BC - Math.floor(abs / 12);
  if (y <= 0) y -= 1;
  const n = MONTH_NAMES[abs % 12];
  return `${long ? n : n.slice(0, 3)} ${formatYear(y)}`;
}

/** One line of a chart: its values by month (null where none is known), its colour and name. */
interface Series {
  name: string;
  colour: string;
  values: Array<number | null>;
  /** Drawn as bars, not a line. */
  bars?: boolean;
}

/**
 * A small chart of the annals' months and now: a line (or bars) for each
 * series, the top's value, and the first month's and now's names; each point
 * says its month and value when hovered. `months` are the annals' months'
 * numbers (now follows them).
 */
function chart(months: readonly number[], series: readonly Series[], opts: { unit?: string; w?: number; h?: number; floor0?: boolean; percent?: boolean; empty?: string; fit?: number } = {}): string {
  // (Drawn at about the size it shows, so its dots stay round; its words are the page's, under and over it, not the drawing's.
  // Merge of slice 50: each point's words in the kit's one tip, not an SVG title.)
  const W = opts.w ?? 260;
  const H = opts.h ?? 52;
  const n = months.length + 1;
  const all = series.flatMap((x) => x.values.filter((v): v is number => v !== null));
  if (!all.length) return `<div class="ov-chart none">${opts.empty ?? 'Nothing kept yet: the annals start with the first month that ends.'}</div>`;
  let top = Math.max(...all);
  let bot = opts.floor0 === false ? Math.min(...all) : Math.min(0, ...all);
  if (opts.percent) {
    top = 100;
    bot = 0;
    // Slice 52: a sparkline fitted to its own range under 100%, never closer than `fit` points, so a service that wavers
    // between 70% and 90% shows it (on 0 to 100 in 40 px every line read flat), while one always at 100% stays a flat line.
    if (opts.fit) bot = Math.max(0, Math.min(Math.min(...all) - 4, 100 - opts.fit));
  }
  if (top === bot) top = bot + 1;
  const pad = 4;
  const x = (i: number): number => pad + (n === 1 ? (W - 2 * pad) / 2 : (i / (n - 1)) * (W - 2 * pad));
  const y = (v: number): number => H - 2 - ((v - bot) / (top - bot)) * (H - 6);
  const names = [...months.map((m) => monthName(m)), 'now'];
  const parts: string[] = [];
  parts.push(`<line x1="${pad}" x2="${W - pad}" y1="${y(bot).toFixed(1)}" y2="${y(bot).toFixed(1)}" class="axis"/>`);
  if (bot < 0) parts.push(`<line x1="${pad}" x2="${W - pad}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" class="axis zero"/>`);
  const unit = opts.unit ?? '';
  const say = (v: number): string => (opts.percent ? `${Math.round(v)}%` : `${num(v)}${unit}`);
  series.forEach((sr, k) => {
    if (sr.bars) {
      const bw = Math.max(2, ((W - 2 * pad) / n) * 0.62 / series.filter((q) => q.bars).length);
      sr.values.forEach((v, i) => {
        if (v === null) return;
        const cx = x(i) + (k - 0.5) * bw * (series.length > 1 ? 1 : 0);
        const y0 = y(Math.max(bot, 0));
        const y1 = y(v);
        parts.push(`<rect x="${(cx - bw / 2).toFixed(1)}" y="${Math.min(y0, y1).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0.8, Math.abs(y1 - y0)).toFixed(1)}" fill="${sr.colour}" class="${i === n - 1 ? 'now' : ''}" data-tip="${esc(`${names[i]}: ${sr.name} ${say(v)}`)}"></rect>`);
      });
      return;
    }
    let d = '';
    let pen = false;
    sr.values.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
      pen = true;
    });
    if (d) parts.push(`<path d="${d}" stroke="${sr.colour}" class="line"/>`);
    sr.values.forEach((v, i) => {
      if (v === null) return;
      // (On a small chart only now's dot shows; the others are there to hover.)
      const hit = W < 200 && i < n - 1;
      parts.push(`<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${hit ? 3 : i === n - 1 ? 2.6 : 1.6}" fill="${sr.colour}" class="${i === n - 1 ? 'now' : hit ? 'hit' : ''}" data-tip="${esc(`${names[i]}: ${sr.name} ${say(v)}`)}"></circle>`);
    });
  });
  const key = series.length > 1 ? `<p class="ov-key">${series.map((sr) => `<i style="background:${sr.colour}"></i>${esc(sr.name)}`).join(' ')}</p>` : '';
  const svg = `<svg class="ov-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px" role="img" aria-label="${esc(`${series.map((sr) => sr.name).join(', ')} over the last ${months.length + 1} months`)}">${parts.join('')}</svg>`;
  return `${key}<div class="ov-chartbox"><span class="top">${esc(say(top))}</span>${svg}<span class="from">${esc(months.length ? monthName(months[0]) : '')}</span><span class="to">now</span></div>`;
}

/** A headline figure: its name, its value, why, and its chart. */
function tile(name: string, value: string, why: string, chartHtml: string, cls = ''): string {
  return `<section class="ov-tile k-card ${cls}"><h4>${esc(name)}</h4><p class="big">${value}</p><p class="why">${why}</p>${chartHtml}</section>`;
}

/** The annals' months, oldest first, and their numbers. */
function annalsOf(s: SimState): { ms: readonly AnnalMonth[]; ids: number[] } {
  const ms = s.annals.months;
  return { ms, ids: ms.map((x) => x.m) };
}

/** The month a while ago (k months back from the last written), or undefined. */
const back = (ms: readonly AnnalMonth[], k: number): AnnalMonth | undefined => ms[ms.length - k];

/** A note on what the charts cover, when the town was loaded from an older save. */
function sinceNote(s: SimState): string {
  const a = s.annals;
  if (a.since <= 0) return '';
  const m = Math.floor(a.since / TICKS_PER_MONTH);
  return `<p class="ov-since">The town’s annals begin in ${esc(monthName(m, true))}, when this save was loaded: months from before it weren’t kept.</p>`;
}

/** Go-to attributes for a building. */
const goB = (b: Building): string => {
  const [x, z] = centreOf(b);
  return `data-act="go" data-x="${x}" data-z="${z}"`;
};

/** A district's middle, on this land. */
function districtSpot(map: CoastMap, d: number): { x: number; z: number } {
  const at = map.data.districts ?? DISTRICTS;
  return { x: at[d]?.x ?? map.size / 2, z: at[d]?.z ?? map.size / 2 };
}

/** Homes grouped by district: each district's count and the middle of its homes. */
function byDistrict(map: CoastMap, homes: readonly Building[]): Array<{ d: number; n: number; x: number; z: number }> {
  const by = new Map<number, { n: number; x: number; z: number }>();
  for (const b of homes) {
    const [cx, cz] = centreOf(b);
    const d = districtAt(map, cx, cz);
    const e = by.get(d) ?? { n: 0, x: 0, z: 0 };
    e.n++;
    e.x += cx;
    e.z += cz;
    by.set(d, e);
  }
  return [...by.entries()].map(([d, e]) => ({ d, n: e.n, x: e.x / e.n, z: e.z / e.n })).sort((a, b) => b.n - a.n || a.d - b.d);
}

// ---------------------------------------------------------------------------- City

/** How the homes feel: the count at each mood, and the reasons most often weighing on them and lifting them (each with its homes). */
function moods(s: SimState, homes: readonly Building[]): { at: number[]; bad: Array<{ text: string; homes: Building[] }>; good: Array<{ text: string; n: number }> } {
  const ctx = moodCtx(s);
  const at = [0, 0, 0, 0, 0];
  const bad = new Map<string, Building[]>();
  const good = new Map<string, number>();
  // (A reason's own words carry days and names: "No water for 12 days". Counted by their gist.)
  const gist = (t: string): string => t.replace(/\s*\(.*?\)\s*/g, ' ').replace(/ for (a day|\d+ (days|months))/, '').replace(/ \d+ (days|months) ago.*$/, ' lately').replace(/^Mourning .*/, 'Mourning a man fallen in battle').replace(/^Shamed: .*/, 'Shamed by one of theirs caught').replace(/^Robbed .*/, 'Robbed lately').replace(/^A purse cut .*/, 'A purse cut lately').replace(/^\d+ of them are owed wages.*/, 'Owed wages').replace(/^Their wages are owed.*/, 'Owed wages').replace(/^Only .* on the table.*/, 'Only one kind of food on the table').trim();
  for (const b of homes) {
    const m = moodOf(s, b, ctx, canWorkIn(s, b));
    at[m.level]++;
    for (const r of m.reasons) {
      if (r.tone < 0) {
        const k = gist(r.text);
        const l = bad.get(k) ?? [];
        l.push(b);
        bad.set(k, l);
      } else if (r.tone > 0) {
        const k = gist(r.text);
        good.set(k, (good.get(k) ?? 0) + 1);
      }
    }
  }
  return {
    at,
    bad: [...bad.entries()].map(([text, hs]) => ({ text, homes: hs })).sort((a, b) => b.homes.length - a.homes.length || a.text.localeCompare(b.text)),
    good: [...good.entries()].map(([text, n]) => ({ text, n })).sort((a, b) => b.n - a.n || a.text.localeCompare(b.text)),
  };
}

const MOOD_WORDS = ['Fed up', 'Unhappy', 'Worried', 'Getting by', 'Content'];
const MOOD_COLOURS = ['#8c2f26', '#c0603a', '#d8a040', '#9aaa58', '#4c6a26'];

function cityPage(s: SimState, map: CoastMap): string {
  const { ms, ids } = annalsOf(s);
  const homes = s.buildings.filter(livedIn);
  const md = moods(s, homes);
  const glad = md.at[3] + md.at[4];
  const wf = workforce(s);
  const able = homes.reduce((a, b) => a + canWorkIn(s, b), 0);
  const last = back(ms, 1);
  const out: string[] = [];
  // People: this month's change, and who came and went.
  // (The last whole month: the one the annals last wrote, against the one before it.)
  const before = back(ms, 2);
  const came = last ? last.came - (before?.came ?? 0) : 0;
  const went = last ? last.went - (before?.went ?? 0) : 0;
  const taxGone = goneForTaxes(s);
  const peopleWhy = last && before
    ? `${signed(last.people - before.people)} in ${esc(monthName(last.m, true).split(' ')[0])}: ${plural(came, 'person', 'people')} came, ${went ? `${fmt(went)} left` : 'nobody left'}.${taxGone ? ` ${plural(taxGone, 'household has', 'households have')} left over taxes lately.` : ''}`
    : `${plural(s.arrived, 'person has', 'people have')} come since the founding, ${fmt(s.left)} left.`;
  // (The level most homes are at.)
  const byLevel = new Map<number, number>();
  for (const b of homes) byLevel.set(b.level, (byLevel.get(b.level) ?? 0) + 1);
  const [lev, levN] = [...byLevel.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0] ?? [0, 0];
  out.push('<div class="ov-tiles">');
  out.push(tile('People', fmt(s.population), peopleWhy, chart(ids, [{ name: 'People', colour: '#5a4630', values: [...ms.map((x) => x.people), s.population] }])));
  out.push(tile('Homes', fmt(homes.length), `${homes.length ? `${fmt(levN)} of them ${esc(lower(HOME_NAMES[lev] ?? '').replace(/^an? /, ''))}${levN === 1 ? '' : 's'}, the most of any kind` : 'None lived in yet'}; ${plural(s.buildings.filter((b) => b.kind === 'home' && b.level === 0 && b.people === 0).length, 'empty plot', 'empty plots')} marked out.`, chart(ids, [{ name: 'Homes', colour: '#8a6430', values: [...ms.map((x) => x.homes), homes.length] }])));
  const worst = md.bad[0];
  out.push(
    tile(
      'Mood',
      `${pct(glad, homes.length)}%`,
      homes.length ? `${plural(glad, 'home is', 'homes are')} content or getting by.${worst ? ` What weighs most: ${esc(lower(worst.text))} (${plural(worst.homes.length, 'home', 'homes')}).` : ''}` : 'No homes yet.',
      chart(ids, [{ name: 'Content or getting by', colour: '#4c6a26', values: [...ms.map((x) => (x.homes ? pct(x.glad, x.homes) : null)), homes.length ? pct(glad, homes.length) : null] }], { percent: true }),
    ),
  );
  out.push(
    tile(
      'Work',
      `${fmt(wf.filled)}<small> of ${fmt(wf.jobs)} jobs</small>`,
      `${able > wf.filled ? `${plural(able - wf.filled, 'person', 'people')} could work and have none.` : wf.jobs > wf.filled ? `${plural(wf.jobs - wf.filled, 'job stands', 'jobs stand')} empty: too few homes near enough by road.` : 'Every job is filled.'} Wages ${WAGE} dr a worker a month.`,
      chart(ids, [
        { name: 'Jobs', colour: '#b0a080', values: [...ms.map((x) => x.jobs), wf.jobs] },
        { name: 'Filled', colour: '#2c4a86', values: [...ms.map((x) => x.filled), wf.filled] },
      ]),
    ),
  );
  out.push('</div>');
  out.push(sinceNote(s));
  out.push('<div class="ov-cols">');
  // People by level.
  {
    const rows: string[] = [];
    const most = Math.max(1, ...Array.from({ length: GREAT_ESTATE }, (_, i) => homes.filter((b) => b.level === i + 1).reduce((a, b) => a + b.people, 0)));
    for (let lv = GREAT_ESTATE; lv >= 1; lv--) {
      const at = homes.filter((b) => b.level === lv);
      if (!at.length) continue;
      const people = at.reduce((a, b) => a + b.people, 0);
      const room = at.reduce((a, b) => a + capacity(b), 0);
      const name = HOME_NAMES[lv].replace(/^An? /, '');
      const full = at.filter((b) => b.people >= capacity(b)).length;
      rows.push(`<tr title="${esc(`${at.length} ${name}${at.length === 1 ? '' : 's'}: ${people} people of room for ${room}${full ? `; ${full} full` : ''}`)}"><td class="what">${esc(cap(name))}${at.length === 1 ? '' : 's'}</td><td class="n">${fmt(at.length)}</td><td class="bar">${kbar({ value: people, max: most, tone: 'stock' })}</td><td class="n">${fmt(people)}</td></tr>`);
    }
    out.push(`<section><h3>People by their homes</h3>${rows.length ? `<table class="ov-table"><thead><tr><th></th><th>Homes</th><th></th><th>People</th></tr></thead><tbody>${rows.join('')}</tbody></table>` : '<p class="ov-note">Nobody lives here yet: mark out plots (H) by a road.</p>'}`);
    // What holds homes back from the next level.
    const held = new Map<Service, number>();
    for (const b of homes) {
      if (b.estate || b.level < 1 || b.level >= 6) continue;
      const nextNeeds = LEVEL_NEEDS[b.level + 1].filter((n) => !LEVEL_NEEDS[b.level].includes(n));
      for (const n of nextNeeds) if (untilOf(b, n, b.level + 1) <= s.tick) held.set(n, (held.get(n) ?? 0) + 1);
    }
    const holds = [...held.entries()].sort((a, b) => b[1] - a[1]);
    if (holds.length) out.push(`<p class="ov-note">Held back from the next level by: ${holds.slice(0, 4).map(([n, k]) => `<button class="ov-link" data-act="overlay" data-mode="${n}" title="Show it on the map">${esc(NEED_WORDS[n])}</button> (${fmt(k)})`).join(', ')}. The missing overlay (I) shows each home’s.</p>`);
    out.push('</section>');
  }
  // Mood.
  {
    const bar = md.at
      .map((k, i) => (k ? `<i style="width:${pct(k, homes.length)}%;background:${MOOD_COLOURS[i]}" title="${esc(`${MOOD_WORDS[i]}: ${plural(k, 'home', 'homes')}`)}"></i>` : ''))
      .reverse()
      .join('');
    const badRows = md.bad.slice(0, 6).map((r) => {
      const b = r.homes[0];
      return `<li><button class="ov-row" data-act="home" data-id="${b.id}" title="${esc(`Go to one of them: the house of ${b.family?.name ?? '?'}`)}"><span>${esc(r.text)}</span><span class="n">${fmt(r.homes.length)}</span></button></li>`;
    });
    const goodRows = md.good.slice(0, 4).map((r) => `<li class="good"><span>${esc(r.text)}</span><span class="n">${fmt(r.n)}</span></li>`);
    // (Merge of slice 49: the city's health, in a line, with the Health page a click away.)
    const hf = healthFigures(s);
    const healthNote = hf.on && hf.homes ? `<p class="ov-note">Health: ${fmt(hf.average)} on average (${esc(lower(healthWord(hf.average)))})${hf.sick ? `; ${fmt(hf.sick)} sick${hf.plague ? `, ${fmt(hf.plague)} of the plague` : ''}` : '; nobody sick'}${hf.risk === 'high' ? '; the plague’s risk is high' : ''}. <button class="ov-link" data-act="page" data-page="health" title="The Health page">More on the Health page</button>.</p>` : '';
    out.push(`<section><h3>How the homes feel</h3>${healthNote}${homes.length ? `<div class="ov-moodbar">${bar}</div><p class="ov-keyline">${md.at.map((k, i) => (k ? `<span><i style="background:${MOOD_COLOURS[i]}"></i>${MOOD_WORDS[i]} ${fmt(k)}</span>` : '')).reverse().join('')}</p>` : ''}${badRows.length ? `<h5>Weighing on them</h5><ul class="ov-list">${badRows.join('')}</ul>` : ''}${goodRows.length ? `<h5>Lifting them</h5><ul class="ov-list">${goodRows.join('')}</ul>` : ''}</section>`);
  }
  // Work and wages.
  {
    const owed = owedWages(s);
    const short = wf.short.slice(0, 5).map((b) => `<li><button class="ov-row" ${goB(b)} title="Go there"><span>${esc(BUILDING_NAMES[b.kind as Exclude<Building['kind'], 'home'>] ?? b.kind)} ${esc(lower(districtTitle(districtAt(map, ...centreOf(b)))))}</span><span class="n">${b.workers} of ${jobsAt(b)}</span></button></li>`);
    const paused = s.buildings.filter((b) => b.paused).length;
    out.push(`<section><h3>Work and wages</h3><table class="ov-table kv"><tbody><tr><td>Jobs</td><td class="n">${fmt(wf.jobs)}</td></tr><tr><td>Filled</td><td class="n">${fmt(wf.filled)}</td></tr><tr><td>Could work</td><td class="n">${fmt(able)}</td></tr><tr><td>Without work</td><td class="n">${fmt(Math.max(0, able - wf.filled))}</td></tr><tr><td>Wages a month</td><td class="n">${fmt(wageBill(s))} dr</td></tr>${owed.owed ? `<tr class="bad"><td>Wages owed</td><td class="n">${fmt(owed.owed)} dr</td></tr>` : ''}</tbody></table>${short.length ? `<h5>Short of workers</h5><ul class="ov-list">${short.join('')}</ul>${wf.short.length > 5 ? `<p class="ov-note">and ${fmt(wf.short.length - 5)} more.</p>` : ''}<p class="ov-note">A short-handed place works slower: more homes near it by road would help.</p>` : ''}${paused ? `<p class="ov-note">${plural(paused, 'workplace is', 'workplaces are')} paused.</p>` : ''}${owed.owed ? '<p class="ov-note bad">Workplaces owed wages work at half pace until the treasury pays them.</p>' : ''}</section>`);
  }
  out.push('</div>');
  return out.join('');
}

// ---------------------------------------------------------------------------- Goods

/** A ware's month as the overview quotes it: last month if the book saw all of it, else this month so far. */
function quoted(s: SimState, w: Ware): { m: WareMonth; full: boolean } {
  const b = bookNow(s);
  return b.full ? { m: totalsOf(b.last, w), full: true } : { m: totalsOf(b.now, w), full: false };
}

/**
 * A ware's monthly rate (what comes in less what goes out), over the months the stock book keeps, up to a year: a
 * harvest comes in lumps (the olives every few months), so one month alone would call a ware running out between
 * them. Last month's alone while the book has fewer than three.
 */
function rateOf(s: SimState, w: Ware, last: WareMonth): number {
  const hist = bookNow(s).months.slice(-12).map((x) => stockMonth(x, w));
  if (hist.length < 3) return last.net;
  // (Nothing made, used or traded for three months: it is standing still, whatever it did before.)
  if (hist.slice(-3).every((x) => x.made + x.used + x.bought + x.sold + x.lost === 0) && last.made + last.used + last.bought + last.sold + last.lost === 0) return 0;
  return hist.reduce((a, x) => a + x.net, 0) / hist.length;
}
/** Whether the rate is the year's (the stock book has three months or more). */
const yearly = (s: SimState): boolean => bookNow(s).months.length >= 3;

/** How long a ware lasts at its rate, and which way it is going, with the reasons. */
function wareOutlook(s: SimState, w: Ware): { total: number; m: WareMonth; full: boolean; months: number; trend: -1 | 0 | 1; why: string[]; bad: boolean } {
  const st = stockOf(s, w);
  const { m, full } = quoted(s, w);
  const net = rateOf(s, w, m);
  const months = net < -0.5 && st.total > 0 ? st.total / -net : Infinity;
  const trend: -1 | 0 | 1 = net > 0.5 ? 1 : net < -0.5 ? -1 : 0;
  // Why: what holds it back first (its makers short, nothing to work up, no stall), else which way it goes; then
  // what came and went abroad, what was lost, and full stores holding back a growing stock.
  const why: string[] = [];
  const name = wareInfo(w).name.toLowerCase();
  const mk = makersOf(s, w);
  if (mk.kind && mk.count === 0 && m.bought === 0 && st.total === 0) why.push(`nothing makes ${name} yet`);
  if (mk.idle + mk.short > 0) why.push(`${mk.idle + mk.short} of ${mk.count} ${mk.count === 1 ? 'maker is' : 'makers are'} short of workers`);
  const input = mk.kind === 'press' ? 3 : mk.kind === 'winery' ? 6 : -1;
  if (input >= 0 && mk.count > 0 && stockOf(s, input).total === 0) why.push(`no ${wareInfo(input).name.toLowerCase()} to work up`);
  const svc = GOOD_SERVICE[w];
  if (svc && isGood(w) && !citySells(s, w) && st.total > 0) why.push('no stall sells it');
  const users = usersOf(s, w);
  if (users.kind && users.count === 0 && st.total > 0) why.push('nothing uses it yet');
  const held = why.some((x) => /short|to work up|nothing makes/.test(x));
  const over = yearly(s) ? ' over the year' : '';
  // (Which way it goes, in words true to what moved it: made and used, or bought and sold abroad, over the same months
  // as its rate.)
  const span = yearly(s) ? bookNow(s).months.slice(-12).map((x) => stockMonth(x, w)) : [m];
  const made = span.reduce((a, x) => a + x.made, 0);
  const used = span.reduce((a, x) => a + x.used, 0);
  const rising = made > used ? `more made than used${over}` : `more came in than went out${over}`;
  const falling = used > made ? `more used than made${over}` : `more went out than came in${over}`;
  if ((m.made || m.used || net || st.total > 0) && !(held && trend < 0)) why.unshift(trend > 0 ? rising : trend < 0 ? falling : m.made || m.used ? 'as much made as used' : 'nothing made or used lately');
  if (m.sold > 0) why.push(`${fmt(m.sold)} sold abroad`);
  if (m.bought > 0) why.push(`${fmt(m.bought)} came from abroad`);
  if (m.lost > 0) why.push(`${fmt(m.lost)} lost`);
  const stores = st.places.filter((p) => (p.b.kind === 'granary' || p.b.kind === 'storehouse') && p.room > 0);
  if (trend >= 0 && stores.length && stores.every((p) => p.n >= p.room * 0.95)) why.push('its stores are full');
  const bad = (months < 3 && (m.used > 0 || m.sold > 0)) || why.some((x) => /short|no stall|nothing makes|to work up/.test(x));
  return { total: st.total, m, full, months, trend, why, bad };
}

const lasts = (o: { months: number; trend: number; total: number }): string => (o.total <= 0 && o.trend <= 0 ? '—' : o.months === Infinity ? (o.trend > 0 ? 'growing' : 'steady') : o.months < 1 ? 'under a month' : o.months > 120 ? 'years' : o.months > 24 ? `${Math.round(o.months / 12)} years` : `${o.months < 10 ? o.months.toFixed(1).replace(/\.0$/, '') : Math.round(o.months)} months`);

function goodsPage(s: SimState, map: CoastMap, picked: number): string {
  const { ms, ids } = annalsOf(s);
  const wares = panelWares().filter((w) => {
    const st = stockOf(s, w);
    const { m } = quoted(s, w);
    return st.total > 0 || m.made + m.used + m.sold + m.bought + m.lost > 0 || makersOf(s, w).count > 0;
  });
  const outlooks = new Map(wares.map((w) => [w, wareOutlook(s, w)]));
  const b = bookNow(s);
  const out: string[] = [];
  if (!wares.length) return '<p class="ov-note">The city has no goods yet: farms (M) and a granary (G) are where it starts.</p>';
  const sel = wares.includes(picked) ? picked : (wares.slice().sort((a, c) => (outlooks.get(a)!.months || 0) - (outlooks.get(c)!.months || 0))[0] ?? wares[0]);
  const rows = wares.map((w) => {
    const o = outlooks.get(w)!;
    const arrow = o.trend > 0 ? '<i class="up" aria-label="rising"></i>' : o.trend < 0 ? '<i class="down" aria-label="falling"></i>' : '<i class="flat"></i>';
    const cell = (n: number): string => `<td class="n${n ? '' : ' nil'}">${n ? fmt(n) : '·'}</td>`;
    return `<tr class="${w === sel ? 'on' : ''}${o.bad ? ' bad' : ''}" data-act="ware" data-ware="${w}" title="${esc(`${wareInfo(w).name}: ${o.why.join('; ')}`)}"><td class="what">${wareIcon(w)}<span>${esc(wareInfo(w).name)}</span></td><td class="n">${fmt(o.total)}</td>${cell(o.m.made)}${cell(o.m.used)}${cell(o.m.bought)}${cell(o.m.sold)}<td class="n lasts">${lasts(o)}</td><td class="trend">${arrow}<span>${esc(o.why[0] ?? '')}</span></td></tr>`;
  });
  out.push(`<p class="ov-lead">${b.full ? 'Last month’s figures' : 'This month’s figures so far'}: what was made, used, bought from abroad and sold; how long each lasts at its rate over the last year, and why it is going the way it is. Click a ware for its two years.</p>`);
  out.push(`<table class="ov-table goods"><thead><tr><th></th><th>In store</th><th>Made</th><th>Used</th><th>Bought</th><th>Sold</th><th>Lasts</th><th>Which way, and why</th></tr></thead><tbody>${rows.join('')}</tbody></table>`);
  // The picked ware.
  const o = outlooks.get(sel)!;
  const info = wareInfo(sel);
  const st = stockOf(s, sel);
  const wi = WARES.indexOf(sel);
  const year = b.months.slice(-12);
  const made = year.reduce((a, x) => a + stockMonth(x, sel).made, 0);
  const used = year.reduce((a, x) => a + stockMonth(x, sel).used, 0);
  const places = st.places.slice(0, 4).map((p) => `<li><button class="ov-row" data-act="building" data-id="${p.b.id}" title="Go there and open its panel"><span>${esc(p.b.kind === 'home' ? 'A home' : (BUILDING_NAMES[p.b.kind as Exclude<Building['kind'], 'home'>] ?? p.b.kind))} ${esc(lower(districtTitle(districtAt(map, ...centreOf(p.b)))))}</span><span class="n">${fmt(p.n)}${p.room ? `<small> / ${fmt(p.room)}</small>` : ''}</span></button></li>`);
  out.push(
    `<section class="ov-ware"><header>${wareIcon(sel)}<h3>${esc(info.name)}</h3><span>${fmt(st.total)} ${esc(info.unit)} in the city${st.moving ? `, ${fmt(st.moving)} on the way between places` : ''}</span><button class="ov-btn" data-act="wareside" data-ware="${sel}" title="Its page on the side panel: where it comes from and goes, month by month">Its page</button></header><div class="ov-cols two"><div>${chart(ids, [{ name: `${info.name} in store`, colour: info.colour, values: [...ms.map((x) => x.stock[wi] ?? 0), st.total] }], { w: 560, h: 90 })}<p class="ov-note">Over the last ${plural(year.length, 'month', 'months')}: ${fmt(made)} made, ${fmt(used)} used.</p></div><div><ul class="ov-why ${o.bad ? 'bad' : ''}">${o.why.map((x) => `<li>${esc(cap(x))}.</li>`).join('')}<li>${o.months === Infinity ? (o.trend > 0 ? 'The stock is growing.' : 'The stock holds steady.') : `At this rate it lasts ${esc(lasts(o))}.`}</li></ul>${places.length ? `<h5>Where it is kept</h5><ul class="ov-list">${places.join('')}</ul>` : ''}</div></div></section>`,
  );
  return out.join('');
}

// ---------------------------------------------------------------------------- Treasury

function treasuryPage(s: SimState): string {
  const { ms, ids } = annalsOf(s);
  const l = s.ledger;
  const m = Math.floor(s.tick / TICKS_PER_MONTH);
  const now = l.month === m ? l.now : [];
  const lastLines = l.month === m ? l.last : l.month === m - 1 ? l.now : [];
  const { now: yr, last: lastYr } = yearNow(s);
  const month = (lines: typeof now): { in: number[]; out: number[] } => {
    const y: AnnalYear = { y: 0, in: IN_GROUPS.map(() => 0), out: OUT_GROUPS.map(() => 0), crime: [] };
    for (const x of lines) {
      if (!x.amount) continue;
      const out = x.amount < 0;
      const groups = out ? OUT_GROUPS : IN_GROUPS;
      let i = groups.findIndex((g) => g.kinds.includes(x.kind));
      if (i < 0) i = groups.length - 1;
      if (out) y.out[i] -= x.amount;
      else y.in[i] += x.amount;
    }
    return y;
  };
  const tm = month(now);
  const lm = month(lastLines);
  const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);
  const out: string[] = [];
  const lastNet = sum(lm.in) - sum(lm.out);
  const yearNet = sum(yr.in) - sum(yr.out);
  // (What the city owes: its loans in. A loan's owed is already less anything seized. Its loans out are owed to it.)
  const dl = debts(s.world).filter((x) => x.side === 'in');
  const owe = dl.reduce((a, x) => a + x.owed, 0);
  const lentOut = debts(s.world).filter((x) => x.side === 'out').reduce((a, x) => a + x.owed, 0);
  const taxesWhy = (() => {
    const homes = s.buildings.filter(livedIn);
    const taxed = homes.filter((b) => taxedLately(s, b)).length;
    return `taxes ${TAX_RATES[s.taxRate]}, collectors reached ${fmt(taxed)} of ${plural(homes.length, 'home', 'homes')}`;
  })();
  out.push('<div class="ov-tiles">');
  out.push(tile('Treasury', `${fmt(s.money)}<small> dr</small>`, back(ms, 1) ? `${signed(s.money - back(ms, 1)!.money)} since the month began.` : 'What the treasury holds now.', chart(ids, [{ name: 'Treasury', colour: '#c8963e', values: [...ms.map((x) => x.money), s.money] }], { unit: ' dr' })));
  out.push(
    tile(
      'Last month',
      `<span class="${lastNet >= 0 ? 'up' : 'down'}">${signed(lastNet)}</span><small> dr</small>`,
      lastLines.length ? `${fmt(sum(lm.in))} in, ${fmt(sum(lm.out))} out. Most in: ${esc(lower(IN_GROUPS[lm.in.indexOf(Math.max(...lm.in))].name))}; most out: ${esc(lower(OUT_GROUPS[lm.out.indexOf(Math.max(...lm.out))].name))}.` : 'Nothing on the books for last month.',
      chart(ids, [
        { name: 'In', colour: '#5f7f2c', values: [...ms.map((x) => x.in), sum(tm.in)], bars: true },
        { name: 'Out', colour: '#8c2f26', values: [...ms.map((x) => x.out), sum(tm.out)], bars: true },
      ], { unit: ' dr' }),
    ),
  );
  out.push(tile('This year', `<span class="${yearNet >= 0 ? 'up' : 'down'}">${signed(yearNet)}</span><small> dr</small>`, `${fmt(sum(yr.in))} in, ${fmt(sum(yr.out))} out since January${lastYr ? `; last year ${signed(sum(lastYr.in) - sum(lastYr.out))} dr` : ''}.`, ''));
  out.push(tile('Debts', owe > 0 ? `${fmt(owe)}<small> dr</small>` : 'None', `${owe > 0 ? `${plural(dl.length, 'loan', 'loans')} to repay; ${dl.some((x) => x.state === 'overdue') ? `${dl.length > 1 ? 'one is' : 'it is'} overdue` : `the next due ${esc(dueWords(s, Math.min(...dl.map((x) => x.due || Infinity))))}`}.` : 'The city owes nobody.'}${lentOut > 0 ? ` ${fmt(lentOut)} dr is owed to it.` : ''}`, '', owe > 0 ? 'bad' : ''));
  out.push('</div>');
  out.push(sinceNote(s));
  // The ledger by kind.
  const row = (name: string, a: number, b: number, c: number, d: number | null, why = '', cls = ''): string => {
    const cell = (n: number | null): string => (n === null ? '<td class="n nil">·</td>' : `<td class="n${n ? '' : ' nil'}">${n ? fmt(n) : '·'}</td>`);
    return `<tr class="${cls}" ${why ? `title="${esc(why)}"` : ''}><td class="what">${esc(name)}</td>${cell(a)}${cell(b)}${cell(c)}${cell(d)}</tr>`;
  };
  const body: string[] = [];
  body.push('<tr class="head"><th colspan="5">Coming in</th></tr>');
  IN_GROUPS.forEach((g, i) => {
    if (!tm.in[i] && !lm.in[i] && !yr.in[i] && !(lastYr?.in[i] ?? 0)) return;
    body.push(row(g.name, tm.in[i], lm.in[i], yr.in[i], lastYr ? (lastYr.in[i] ?? 0) : null, g.id === 'taxes' ? cap(taxesWhy) : ''));
  });
  body.push('<tr class="head"><th colspan="5">Going out</th></tr>');
  OUT_GROUPS.forEach((g, i) => {
    if (!tm.out[i] && !lm.out[i] && !yr.out[i] && !(lastYr?.out[i] ?? 0)) return;
    body.push(row(g.name, tm.out[i], lm.out[i], yr.out[i], lastYr ? (lastYr.out[i] ?? 0) : null, g.id === 'wages' ? `${WAGE} dr a worker a month; about ${fmt(wageBill(s))} dr as the workplaces are staffed now` : ''));
  });
  const net = (a: { in: number[]; out: number[] } | null): number | null => (a ? sum(a.in) - sum(a.out) : null);
  const nn = [net(tm), net(lm), net(yr), net(lastYr)];
  body.push(`<tr class="total"><td class="what">Net</td>${nn.map((n) => (n === null ? '<td class="n nil">·</td>' : `<td class="n ${n > 0 ? 'up' : n < 0 ? 'down' : ''}">${signed(n)}</td>`)).join('')}</tr>`);
  out.push('<div class="ov-cols two">');
  out.push(`<section><h3>The ledger</h3><table class="ov-table book"><thead><tr><th></th><th>This month<small>so far</small></th><th>Last month</th><th>This year<small>so far</small></th><th>Last year</th></tr></thead><tbody>${body.join('')}</tbody></table><p class="ov-note">${esc(cap(taxesWhy))}. <button class="ov-link" data-act="ledger" title="Every line, by what it was for">The full ledger ($)</button></p></section>`);
  // Debts, loans and tribute.
  const side: string[] = [];
  const loans = s.world.loans.filter((x) => x.ended === 0 && x.state !== 'proposed');
  if (loans.length) {
    side.push(`<h3>Loans</h3><ul class="ov-list">${loans
      // (Owed only once agreed: before that, a loan being asked or offered.)
      .map((x) => {
        const owed = owing(x) || x.state === 'repaying';
        const what = owed ? (x.side === 'in' ? 'Owed to' : 'Owed by') : x.side === 'in' ? 'Borrowing from' : 'Lending to';
        return `<li class="${x.state === 'overdue' ? 'bad' : ''}"><button class="ov-row" data-act="city" data-city="${x.city}" data-tab="loans" title="${esc(`${loanLine(s, x)}: open ${whoseName(cityName(x.city))} page`)}"><span>${what} ${esc(cityName(x.city))}</span><span class="n">${fmt(owed ? x.owed : x.amount)} dr</span></button><small>${esc(loanLine(s, x))}</small></li>`;
      })
      .join('')}</ul>`);
  } else side.push('<h3>Loans</h3><p class="ov-note">No loans either way. A city of Greece may lend to you, or borrow, from its page on the map (Tab).</p>');
  const vassals = s.empire.vassals;
  const colonies = s.empire.colonies;
  const tribute: string[] = [];
  for (const v of vassals) {
    const t = tributeYear(s, v);
    tribute.push(`<li><button class="ov-row" data-act="city" data-city="${v.city}" data-tab="empire"><span>From ${esc(cityName(v.city))}, your vassal</span><span class="n">about ${fmt(t.dr)} dr a year</span></button></li>`);
  }
  for (const c of colonies) {
    const t = colonyYear(s, c);
    // (Merge of slice 47: and its share of its trade, in coin.)
    const tr = colonyTrade(s, c).share;
    tribute.push(`<li><button class="ov-row" data-act="site" data-site="${c.site}"><span>From ${esc(c.name)}, your colony</span><span class="n">about ${fmt(t.dr + tr)} dr a year</span></button>${tr ? `<small>Its share in goods about ${fmt(t.dr)} dr; ${fmt(tr)} dr of its trade, in coin.</small>` : ''}</li>`);
  }
  for (const f of s.empire.freed ?? []) tribute.push(`<li><button class="ov-row" data-act="site" data-site="${esc(f.site)}"><span>From ${esc(f.name)}, your free ally</span><span class="n">about ${fmt(freeTrade(s, f).share)} dr a year</span></button><small>Its share of its trade, in coin.</small></li>`);
  const asked = s.world.deals.filter((d) => d.kind === 'tribute' && d.state === 'open');
  for (const d of asked) tribute.push(`<li class="bad"><button class="ov-row" data-act="city" data-city="${d.city}"><span>Asked of you by ${esc(cityName(d.city))}${d.yearly ? ', yearly' : ''}</span><span class="n">${d.good < 0 ? `${fmt(d.amount)} dr` : `${fmt(d.amount)} goods`}</span></button><small>Due ${esc(dueWords(s, d.due))}</small></li>`);
  side.push(`<h3>Tribute and shares</h3>${tribute.length ? `<ul class="ov-list">${tribute.join('')}</ul><p class="ov-note">Tribute and shares come in goods or coin by caravan or ship; their worth is at your stores’ prices.</p>` : '<p class="ov-note">No vassal or colony sends you anything yet, and nobody asks tribute of you.</p>'}`);
  const owed = owedWages(s);
  if (owed.owed) side.push(`<p class="ov-note bad">The treasury owes ${fmt(owed.owed)} dr of this month’s wages at ${plural(owed.places, 'workplace', 'workplaces')}: they work at half pace until it is paid.</p>`);
  out.push(`<section>${side.join('')}</section></div>`);
  return out.join('');
}

/** "in 3 months", "in 12 days", "overdue". */
function dueWords(s: SimState, due: number): string {
  if (!Number.isFinite(due) || due <= 0) return 'when agreed';
  const d = due - s.tick;
  if (d < 0) return 'already: it is overdue';
  const days = Math.ceil(d / TICKS_PER_DAY);
  return days > 60 ? `in ${Math.round(days / 30)} months` : `in ${plural(days, 'day', 'days')}`;
}

// ---------------------------------------------------------------------------- Distribution

function distributionPage(s: SimState, map: CoastMap, mode: OverlayMode | null): string {
  const { ms, ids } = annalsOf(s);
  const homes = s.buildings.filter(livedIn);
  const out: string[] = [];
  out.push('<p class="ov-lead">For each service, how many of the homes whose level needs it have it now, the homes it would lift a level, and where the gaps are. Click a service to see it on the map, or a gap to go there.</p>');
  const rows: string[] = [];
  for (const sv of SERVICES) {
    const need = homes.filter((b) => needsOf(b).includes(sv.need));
    const lacking = need.filter((b) => untilOf(b, sv.need) <= s.tick);
    // (A home it would lift: its next level needs it, and it lacks only that of what its next level adds.)
    const lift = homes.filter((b) => {
      if (b.estate || b.level < 1 || b.level >= 6 || LEVEL_NEEDS[b.level].includes(sv.need) || !LEVEL_NEEDS[b.level + 1].includes(sv.need)) return false;
      if (untilOf(b, sv.need, b.level + 1) > s.tick) return false;
      const others = LEVEL_NEEDS[b.level + 1].filter((n) => n !== sv.need && !LEVEL_NEEDS[b.level].includes(n));
      return others.every((n) => untilOf(b, n, b.level + 1) > s.tick) && warningsOf(s, b).length === 0;
    });
    const share = need.length ? pct(need.length - lacking.length, need.length) : -1;
    // (The market's goods are sold by their stall at an agora: oil, fleece and wine need theirs, not just the agora.)
    const ware = WARES.find((w) => GOOD_SERVICE[w] === sv.need && isGood(w));
    const builds = ware !== undefined ? (citySells(s, ware) ? 1 : 0) : s.buildings.filter((b) => b.kind === SERVICE_BUILDING[sv.need]).length;
    const gaps = byDistrict(map, lacking).slice(0, 3);
    const liftGaps = byDistrict(map, lift).slice(0, 2);
    const i = NEEDS.indexOf(sv.need);
    const why =
      need.length === 0
        ? lift.length
          ? `No home needs it yet; ${plural(lift.length, 'home', 'homes')} would go up a level with it.`
          : 'No home needs it yet.'
        : lacking.length === 0
          ? `Every home that needs it has it, from ${sv.by}.`
          : `${plural(lacking.length, 'home goes', 'homes go')} without${builds === 0 ? `: there is no ${esc(HOW[sv.need].replace(/^an? /, '').replace(/ \(.*$/, ''))} yet` : ''}.`;
    const gapHtml = [...gaps.map((g) => `<button class="ov-gap" data-act="go" data-x="${g.x.toFixed(1)}" data-z="${g.z.toFixed(1)}" data-mode="${sv.need}" title="${esc(`Go there, with the ${sv.name.toLowerCase()} overlay on`)}">${fmt(g.n)} ${esc(DISTRICTS[g.d]?.where ?? 'elsewhere')}</button>`), ...(lift.length ? liftGaps.map((g) => `<button class="ov-gap lift" data-act="go" data-x="${g.x.toFixed(1)}" data-z="${g.z.toFixed(1)}" data-mode="missing" title="Go there, with the missing overlay on">${fmt(g.n)} to lift ${esc(DISTRICTS[g.d]?.where ?? 'elsewhere')}</button>`) : [])].join('');
    const noBuild = builds === 0 && (lacking.length > 0 || lift.length > 0) ? `<small class="how">Build ${esc(HOW[sv.need])}.</small>` : '';
    // (Merge of slice 51: a click on the service flies to its biggest gap, or, with none, to the middle of the homes it reaches.)
    const spot = gaps[0] ?? byDistrict(map, need)[0];
    const flyTo = spot ? ` data-x="${spot.x.toFixed(1)}" data-z="${spot.z.toFixed(1)}"` : '';
    rows.push(
      `<tr class="${mode === sv.need ? 'on' : ''}${share >= 0 && share < 75 ? ' low' : ''}"><td class="what"><button class="ov-svc" data-act="overlay" data-mode="${sv.need}"${flyTo} title="${esc(`Show ${sv.name.toLowerCase()} on the map${gaps.length ? ', where it fails most' : need.length ? ', where it reaches' : ''}`)}"><i style="background:${sv.colour}"></i>${esc(sv.name)}</button></td><td class="n">${need.length ? `${fmt(need.length - lacking.length)}<small> of ${fmt(need.length)}</small>` : '—'}</td><td class="bar">${share >= 0 ? kbar({ value: share, max: 100, fill: sv.colour }) : ''}</td><td class="n">${lift.length ? fmt(lift.length) : '·'}</td><td class="gaps"><span class="why">${why}</span>${gapHtml}${noBuild}</td><td class="spark">${chart(ids, [{ name: `${sv.name} reaches`, colour: sv.colour, values: [...ms.map((x) => ((x.reach[i] ?? -1) < 0 ? null : x.reach[i])), share < 0 ? null : share] }], { percent: true, fit: 30, w: 150, h: 40, empty: '·' })}</td></tr>`,
    );
  }
  // Taxes: the collectors' reach.
  {
    const taxed = homes.filter((b) => taxedLately(s, b));
    const missed = homes.filter((b) => !taxedLately(s, b));
    const gaps = byDistrict(map, missed).slice(0, 3);
    const offices = s.buildings.filter((b) => b.kind === 'taxoffice').length;
    const spot = gaps[0] ?? byDistrict(map, taxed)[0];
    const flyTo = spot ? ` data-x="${spot.x.toFixed(1)}" data-z="${spot.z.toFixed(1)}"` : '';
    rows.push(
      `<tr class="${mode === 'tax' ? 'on' : ''}"><td class="what"><button class="ov-svc" data-act="overlay" data-mode="tax"${flyTo} title="Show the tax collectors’ reach on the map"><i style="background:#4f9f88"></i>Tax collectors</button></td><td class="n">${homes.length ? `${fmt(taxed.length)}<small> of ${fmt(homes.length)}</small>` : '—'}</td><td class="bar">${homes.length ? kbar({ value: pct(taxed.length, homes.length), max: 100, fill: '#4f9f88' }) : ''}</td><td class="n">·</td><td class="gaps"><span class="why">${offices ? (missed.length ? `${plural(missed.length, 'home', 'homes')} not called on in the last month.` : 'Every home was called on in the last month.') : 'No tax office yet: build one (Z).'}</span>${gaps.map((g) => `<button class="ov-gap" data-act="go" data-x="${g.x.toFixed(1)}" data-z="${g.z.toFixed(1)}" data-mode="tax">${fmt(g.n)} ${esc(DISTRICTS[g.d]?.where ?? 'elsewhere')}</button>`).join('')}</td><td class="spark"></td></tr>`,
    );
  }
  out.push(`<table class="ov-table dist"><thead><tr><th></th><th>Have it</th><th></th><th title="Homes that would go up a level with it">Would lift</th><th>Where the gaps are</th><th>Two years</th></tr></thead><tbody>${rows.join('')}</tbody></table>`);
  out.push(sinceNote(s));
  // The agora's goods, in store against what homes use.
  const goods = [4, 5, 7].map((w) => ({ w, st: stockOf(s, w).total, sells: citySells(s, w) }));
  // (Phase 6 review: "in store" read as the storehouses' while the count is everything in the city, the makers' own stores and the stalls too, as the Goods page counts it.)
  out.push(`<p class="ov-note">At the agora: ${goods.map((g) => `${esc(wareInfo(g.w).name.toLowerCase())} ${g.sells ? `on sale (${fmt(g.st)} in the city)` : g.st > 0 ? `in the city (${fmt(g.st)}) but no stall sells it` : 'none'}`).join('; ')}.</p>`);
  return out.join('');
}

// ---------------------------------------------------------------------------- Crime

/**
 * The court and the prisons now (merge of slice 45), or null with neither: those waiting for trial, in prison (and
 * the cells), at hard labour and in the stocks, and each prison's unrest.
 */
export function courtFigures(s: SimState): { courts: Building[]; prisons: Building[]; waiting: number; jailed: number; cells: number; labour: number; stocks: number; jails: Array<{ b: Building; n: number; unrest: number; why: string }> } | null {
  const courts = s.buildings.filter((b) => b.kind === 'court');
  const prisons = s.buildings.filter((b) => b.kind === 'prison');
  const c = s.crime;
  if (!courts.length && !prisons.length && !c.held.length && !c.cases.length) return null;
  return {
    courts,
    prisons,
    waiting: c.cases.length,
    jailed: c.held.filter((x) => x.as === 'prison').length,
    cells: prisons.length * CELLS,
    labour: c.held.filter((x) => x.as === 'labour').length,
    stocks: c.stocks.filter((x) => x.until > s.tick).length,
    jails: prisons.map((b) => ({ b, n: prisoners(s, b).length, unrest: c.jails.find((j) => j.at === b.id)?.unrest ?? 0, why: restlessWords(s, b) })),
  };
}

/** The crimes in the scroll that the overview counts as one act each (the court's rate's kinds), by the news' kind. */
const CRIME_NEWS = new Set(['theft', 'picked', 'smashed', 'arson', 'smuggled', 'skimmed']);

/**
 * The crimes in the scroll over the last twelve months, by the quarter they were done in (the place's district),
 * and the caught fined on the spot, by the quarter of their home. (The caught a watchman walks to a court are told of at
 * the court, so they are counted apart: `court`.)
 */
function crimesByQuarter(s: SimState, map: CoastMap): { by: Map<number, { n: number; caught: number }>; court: number } {
  const by = new Map<number, { n: number; caught: number }>();
  let court = 0;
  const from = s.tick - 12 * TICKS_PER_MONTH;
  for (const m of s.messages.log) {
    if (m.tick < from || catOf(m.kind) !== 'crime' || !m.of) continue;
    if (m.of === 'court' && /brought before the court|is summoned before the court/.test(m.words)) {
      court++;
      continue;
    }
    if (!m.at || !('building' in m.at)) continue;
    if (!CRIME_NEWS.has(m.of) && m.of !== 'caught') continue;
    const id = m.at.building;
    const b = s.buildings.find((x) => x.id === id);
    if (!b) continue;
    const d = districtAt(map, ...centreOf(b));
    const e = by.get(d) ?? { n: 0, caught: 0 };
    if (CRIME_NEWS.has(m.of)) e.n++;
    else e.caught++;
    by.set(d, e);
  }
  return { by, court };
}

/** Per thousand people, to a tenth. */
const perK = (n: number, people: number): string => (people > 0 ? ((n * 1000) / people).toFixed(1).replace(/\.0$/, '') : '0');

function crimePage(s: SimState, map: CoastMap): string {
  const { ms, ids } = annalsOf(s);
  const m = Math.floor(s.tick / TICKS_PER_MONTH);
  const tallies = talliesNow(s);
  const rNow = rateFor(s, m);
  const rLast = rateFor(s, m - 1);
  const lastWritten = back(ms, 1)?.m === m - 1 ? back(ms, 1) : undefined;
  // (Each row this month so far and last month; the year's from the annals and this month.)
  const rowsNow = crimeRows(tallies.now, rNow, s.annals.court);
  const rowsLast = crimeRows(tallies.last, rLast, lastWritten?.court ?? []);
  const { now: yr, last: lastYr } = yearNow(s);
  const out: string[] = [];
  const nowN = crimesIn(rNow);
  const lastN = crimesIn(rLast);
  const lastPeople = rLast?.people || s.population;
  const tempted = s.buildings.filter((b) => b.kind === 'home' && b.people > 0 && b.tempt >= TEMPT_HALF);
  const outNow = criminalsOut(s);
  const gangs = s.crime.gangs;
  const posts = s.buildings.filter((b) => b.kind === 'watchpost').length;
  const court = courtFigures(s);
  out.push('<div class="ov-tiles">');
  out.push(
    tile(
      'Crimes last month',
      `${fmt(lastN)}<small> · ${perK(lastN, lastPeople)} a thousand</small>`,
      s.crime.on
        ? `${perK(lastN, lastPeople)} for every thousand people; ${fmt(nowN)} so far this month. ${outNow.length ? `Out now: ${countKinds(outNow.map((w) => KIND_NAME[crimeOfWalker(w.kind)]))}. ` : ''}${tempted.length ? `${plural(tempted.length, 'home is', 'homes are')} more than half way to sending one out.` : 'No home is close to it.'}`
        : 'No crime in the city yet.',
      chart(ids, [{ name: 'Crimes', colour: '#5a4e68', values: [...ms.map((x) => x.crimes), nowN], bars: true }]),
    ),
  );
  out.push(tile('Caught', fmt(rLast?.caught ?? 0), `${lastN ? ((rLast?.caught ?? 0) <= lastN ? `${pct(rLast?.caught ?? 0, lastN)}% of last month’s crimes. ` : `More than last month’s ${fmt(lastN)}: some were done before it. `) : ''}${plural(posts, 'watch post', 'watch posts')}; ${court?.courts.length ? `${fmt(rLast?.tried ?? 0)} tried at the court last month` : `${fmt(tallies.last.fines)} dr in fines last month`}.`, chart(ids, [{ name: 'Caught', colour: '#2c4a86', values: [...ms.map((x) => x.caught), rNow?.caught ?? 0], bars: true }])));
  if (court)
    out.push(
      tile(
        'In prison',
        `${fmt(court.jailed)}<small>${court.cells ? ` of ${fmt(court.cells)} cells` : ''}</small>`,
        `${court.prisons.length ? `${plural(court.prisons.length, 'prison', 'prisons')}` : 'No prison: the court can’t send anyone there'}${court.labour ? `; ${fmt(court.labour)} at hard labour` : ''}${court.waiting ? `; ${fmt(court.waiting)} waiting for trial` : ''}${court.stocks ? `; ${fmt(court.stocks)} in the stocks` : ''}.${court.jails.some((j) => j.unrest >= UNREST_WARN) ? ' A prison is restless.' : ''}`,
        chart(ids, [{ name: 'In prison', colour: '#5a4e68', values: [...ms.map((x) => x.jailed), court.jailed] }]),
        court.jails.some((j) => j.unrest >= UNREST_WARN) || (court.cells > 0 && court.jailed > court.cells) ? 'bad' : '',
      ),
    );
  else out.push(tile('Out now', fmt(outNow.length), outNow.length ? cap(countKinds(outNow.map((w) => KIND_NAME[crimeOfWalker(w.kind)]))) + '.' : 'Nobody is out to do harm.', ''));
  out.push(tile('Gangs', gangs.length ? fmt(gangs.length) : 'None', gangs.length ? gangs.map((g) => `${esc(cap(g.name))} ${esc(DISTRICTS[g.district]?.where ?? '')}`).join('; ') + '. Two watch posts reaching a den break it up.' : 'No gang has a den in the city.', '', gangs.length ? 'bad' : ''));
  out.push('</div>');
  out.push(sinceNote(s));
  out.push('<div class="ov-cols two">');
  // By kind, and the court's month by month.
  const cell = (n: number | undefined, dr = false): string => `<td class="n${n ? '' : ' nil'}">${n ? `${fmt(n)}${dr ? '<small> dr</small>' : ''}` : '·'}</td>`;
  const line = (i: number): string => {
    const r = CRIME_ROWS[i];
    return `<tr class="${r.crime ? '' : 'sub'}"><td class="what">${esc(r.name)}</td>${cell(rowsNow[i], r.dr)}${cell(rowsLast[i], r.dr)}${cell(yr.crime[i], r.dr)}${lastYr ? cell(lastYr.crime[i], r.dr) : '<td class="n nil">·</td>'}</tr>`;
  };
  const head = '<thead><tr><th></th><th>This month<small>so far</small></th><th>Last month</th><th>This year<small>so far</small></th><th>Last year</th></tr></thead>';
  const kinds = CRIME_ROWS.map((r, i) => (r.court ? '' : line(i))).join('');
  const total = (xs: readonly number[]): number => CRIME_ROWS.reduce((a, r, i) => a + (r.crime ? (xs[i] ?? 0) : 0), 0);
  const totalRow = `<tr class="total"><td class="what">Every crime</td>${cell(total(rowsNow))}${cell(total(rowsLast))}${cell(total(yr.crime))}${lastYr ? cell(total(lastYr.crime)) : '<td class="n nil">·</td>'}</tr>`;
  out.push(`<section><h3>By kind</h3><table class="ov-table book">${head}<tbody>${kinds}${totalRow}</tbody></table><p class="ov-note">A crime is one act: a theft, a crowd’s pockets picked, a building smashed, a fire set, a lot smuggled or the takings skimmed, as the court’s rate counts them.</p>`);
  const fines = yr.crime[CRIME_ROWS.findIndex((r) => r.key === 'fines')] ?? 0;
  if (!court) out.push(`<p class="ov-note">No court: the caught are fined on the spot (${fmt(fines)} dr this year). A court (Z four times) tries them by the law you set, and a prison (Z five times) holds those it sends there.</p></section>`);
  else {
    const crows = CRIME_ROWS.map((r, i) => (r.court ? line(i) : '')).join('');
    const links = [...court.courts.map((b) => `<button class="ov-link" data-act="building" data-id="${b.id}" title="Go there and open its panel: the law, the cases, the rate">The court ${esc(lower(districtTitle(districtAt(map, ...centreOf(b)))))}</button>`), ...court.prisons.map((b) => `<button class="ov-link" data-act="building" data-id="${b.id}" title="Go there and open its panel: its prisoners and its unrest">the prison ${esc(lower(districtTitle(districtAt(map, ...centreOf(b)))))}</button>`)];
    const jails = court.jails.map(({ b, n, unrest, why }) => `<li class="${unrest >= UNREST_WARN ? 'bad' : ''}"><button class="ov-row" data-act="building" data-id="${b.id}" title="Go there and open its panel"><span>The prison ${esc(lower(districtTitle(districtAt(map, ...centreOf(b)))))}</span><span class="n">${fmt(n)}<small> of ${CELLS}</small></span></button><small>${esc(cap(why ? `${why}: unrest ${unrest}%` : unrest > 0 ? `calming: unrest ${unrest}%` : 'quiet'))}${why ? `. ${esc(cap(calmWords(s, b)))} would calm it` : ''}.</small></li>`);
    out.push(`<h3>The court</h3><table class="ov-table book">${head}<tbody>${crows}</tbody></table>${jails.length ? `<ul class="ov-list">${jails.join('')}</ul>` : ''}<p class="ov-note">${links.length ? `${cap(links.join(', '))}.` : ''}${court.courts.length ? '' : ' No court stands: the caught are fined on the spot.'}</p></section>`);
  }
  // By quarter.
  const { by: byQ, court: toCourt } = crimesByQuarter(s, map);
  const temptBy = new Map(byDistrict(map, tempted).map((g) => [g.d, g]));
  const ds = new Set<number>([...byQ.keys(), ...temptBy.keys(), ...gangs.map((g) => g.district)]);
  const qrows = [...ds]
    .map((d) => ({ d, c: byQ.get(d) ?? { n: 0, caught: 0 }, t: temptBy.get(d)?.n ?? 0, g: gangs.find((x) => x.district === d) }))
    .sort((a, b) => b.c.n - a.c.n || b.t - a.t || a.d - b.d)
    .map((q) => {
      const at = temptBy.get(q.d) ?? districtSpot(map, q.d);
      return `<tr class="${q.g ? 'bad' : ''}"><td class="what"><button class="ov-link" data-act="go" data-x="${at.x.toFixed(1)}" data-z="${at.z.toFixed(1)}" data-mode="crime" title="Go there, with the crime overlay on">${esc(districtTitle(q.d))}</button></td><td class="n">${q.c.n || '·'}</td><td class="n">${q.c.caught || '·'}</td><td class="n">${q.t || '·'}</td><td>${q.g ? esc(cap(q.g.name)) : ''}</td></tr>`;
    });
  out.push(`<section><h3>By quarter</h3>${qrows.length ? `<table class="ov-table"><thead><tr><th></th><th title="Crimes in the last twelve months, as the scroll tells them">Crimes<small>a year</small></th><th title="The caught fined on the spot, by the quarter of their home">Caught</th><th title="Homes more than half way to sending someone out">Tempted<small>now</small></th><th>Gang</th></tr></thead><tbody>${qrows.join('')}</tbody></table><p class="ov-note">Crimes over the last twelve months, as the scroll tells them, where each was done; the caught fined on the spot, by their home’s quarter${toCourt ? `; besides them, ${toCourt === 1 ? 'one was' : `${fmt(toCourt)} were`} brought before the court` : ''}; homes tempted now. The crime overlay (J four times) shows each home’s temptation.</p>` : '<p class="ov-note">No quarter has had a crime this year, and no home is tempted.</p>'}</section>`);
  out.push('</div>');
  return out.join('');
}

/** "2 thieves and a vandal". */
function countKinds(names: readonly string[]): string {
  const by = new Map<string, number>();
  for (const n of names) by.set(n, (by.get(n) ?? 0) + 1);
  const parts = [...by.entries()].map(([n, k]) => (k === 1 ? `a${/^[aeiou]/.test(n) ? 'n' : ''} ${n}` : `${k} ${n === 'thief' ? 'thieves' : `${n}s`}`));
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : (parts[0] ?? '');
}

// ---------------------------------------------------------------------------- Health

/** Merge of slice 49: the plague's risk in a word. */
const RISK_WORDS: Record<HealthFigures['risk'], string> = { none: 'None', low: 'Low', rising: 'Rising', high: 'High' };

function healthPage(s: SimState, map: CoastMap): string {
  const { ms, ids } = annalsOf(s);
  const homes = s.buildings.filter(livedIn);
  const f = figures(s);
  const dry = homes.filter((b) => needsOf(b).includes('water') && b.waterUntil <= s.tick);
  const hungry = homes.filter((b) => needsOf(b).includes('food') && untilOf(b, 'food') <= s.tick);
  // (Homes whose level doesn't need a fountain yet, fetching their water from the river.)
  const river = homes.filter((b) => b.waterUntil <= s.tick && !needsOf(b).includes('water'));
  const full = homes.filter((b) => b.people >= capacity(b) && b.level >= 2);
  const wounded = s.army.soldiers.filter((x) => x.state === 'wounded' || x.state === 'healing');
  const wi = NEEDS.indexOf('water');
  const out: string[] = [];
  // Merge of slice 49: the sick, the physicians and the plague (health.ts' figures), with the annals' months.
  const h = healthFigures(s);
  const hs = s.health;
  const m = Math.floor(s.tick / TICKS_PER_MONTH);
  const lastWritten = back(ms, 1)?.m === m - 1 ? back(ms, 1) : undefined;
  const rowNow = h.on ? HEALTH_ROWS.map((r) => h.month[r.key]) : HEALTH_ROWS.map(() => 0);
  const rowLast = lastWritten ? HEALTH_ROWS.map((_, i) => lastWritten.health?.[i] ?? 0) : h.on ? HEALTH_ROWS.map((r) => h.lastMonth[r.key]) : HEALTH_ROWS.map(() => 0);
  const year = HEALTH_ROWS.map((_, i) => ms.filter((x) => x.m > m - 12).reduce((a, x) => a + (x.health?.[i] ?? 0), 0) + rowNow[i]);
  const ill = (x: AnnalMonth): number => x.health?.[0] ?? 0;
  const died = (x: AnnalMonth): number => x.health?.[1] ?? 0;
  const healers = s.buildings.filter((b) => b.kind === 'infirmary' || b.kind === 'asklepieion');
  out.push('<div class="ov-tiles">');
  if (h.on) {
    out.push(tile('The sick', `${fmt(h.sick)}${h.plague ? `<small> · ${fmt(h.plague)} of the plague</small>` : ''}`, `${h.sick ? `${h.inBeds ? `${fmt(h.inBeds)} in the asklepieion’s beds, the rest at home. ` : 'All of them at home. '}` : 'Nobody is ill now. '}${plural(rowNow[0], 'person', 'people')} fell ill this month so far, ${fmt(rowLast[0])} last month.`, chart(ids, [{ name: 'The sick', colour: '#8c2f26', values: [...ms.map((x) => x.sick), h.sick], bars: true }]), h.plague ? 'bad' : ''));
    out.push(tile('Deaths', `${fmt(rowLast[1])}<small> last month</small>`, `${fmt(rowNow[1])} so far this month, ${fmt(year[1])} in the last twelve months${year[2] ? `; ${plural(year[2], 'household', 'households')} fled the plague` : ''}. A physician’s visit halves the chance of dying, an asklepieion’s bed cuts it to a third.`, chart(ids, [
      { name: 'Fell ill', colour: '#c08a2e', values: [...ms.map(ill), rowNow[0]], bars: true },
      { name: 'Died', colour: '#5a2a24', values: [...ms.map(died), rowNow[1]], bars: true },
    ])));
    out.push(tile('Physicians', h.homes ? `${pct(h.called, h.homes)}%<small> of homes</small>` : '—', `${h.homes ? `A physician called on ${fmt(h.called)} of ${plural(h.homes, 'home', 'homes')} this season. ` : ''}${h.infirmaries ? plural(h.infirmaries, 'infirmary', 'infirmaries') : 'No infirmary (Z six times)'}, ${h.temples ? plural(h.temples, 'asklepieion', 'asklepieia') : 'no asklepieion (Z seven times)'}. Average health ${fmt(h.average)}${h.sickly + h.ailing ? `; ${fmt(h.sickly + h.ailing)} homes sickly or ailing` : ''}.`, ''));
    out.push(tile('Plague risk', RISK_WORDS[h.risk], h.outbreak ? `${esc(h.outbreak)}.` : h.reasons.length ? `${esc(h.reasons.slice(0, 2).join('; '))}.` : 'Nothing threatens the city’s health.', '', h.risk === 'high' ? 'bad' : ''));
  }
  out.push(tile('Well kept', f.well < 0 ? '—' : `${f.well}%`, homes.length ? `Homes with a fountain’s water and, where their level eats from the market, food on the table. ${[river.length ? `${plural(river.length, 'home fetches', 'homes fetch')} water from the river` : '', dry.length ? `${plural(dry.length, 'home goes', 'homes go')} dry` : '', hungry.length ? `${plural(hungry.length, 'home goes', 'homes go')} hungry` : ''].filter((x) => x).join(', ') || 'None goes dry or hungry'}.` : 'No homes yet.', chart(ids, [{ name: 'Well kept', colour: '#4c6a26', values: [...ms.map((x) => (x.well < 0 ? null : x.well)), f.well < 0 ? null : f.well] }], { percent: true })));
  out.push(tile('Clean water', f.reach[wi] < 0 ? '—' : `${f.reach[wi]}%`, `Of the homes that need water, those a fountain’s carrier reached lately. ${plural(s.buildings.filter((b) => b.kind === 'fountain').length, 'fountain', 'fountains')}.`, chart(ids, [{ name: 'Water', colour: '#4f9be0', values: [...ms.map((x) => ((x.reach[wi] ?? -1) < 0 ? null : x.reach[wi])), f.reach[wi] < 0 ? null : f.reach[wi]] }], { percent: true })));
  out.push(tile('Crowded', fmt(full.length), `${plural(full.length, 'home is', 'homes are')} full to the rafters${h.on ? ', which tells on their health' : ''}. More plots, and homes growing a level, give room.`, ''));
  out.push(tile('Wounded', fmt(wounded.length), wounded.length ? `Soldiers wounded in battle, mending at home over about a month.` : 'No soldier lies wounded.', ''));
  out.push('</div>');
  out.push(sinceNote(s));
  out.push('<div class="ov-cols two">');
  if (!h.on) out.push('<section><h3>Sickness and physicians</h3><p class="ov-note">Nobody in this town falls ill: health was never turned on in it. A new game has the sick, the physicians and the plague.</p></section>');
  else {
    // The month by month, the sickest quarters, and the infirmaries and asklepieia.
    const cell = (n: number): string => `<td class="n${n ? '' : ' nil'}">${n ? fmt(n) : '·'}</td>`;
    const rows = HEALTH_ROWS.map((r, i) => `<tr><td class="what">${esc(r.name)}</td>${cell(rowNow[i])}${cell(rowLast[i])}${cell(year[i])}</tr>`).join('');
    const table = `<table class="ov-table book"><thead><tr><th></th><th>This month<small>so far</small></th><th>Last month</th><th>Twelve months</th></tr></thead><tbody>${rows}</tbody></table>`;
    const sickHomes = homes.filter((b) => hs.sick.some((x) => x.home === b.id));
    const weak = homes.filter((b) => b.health > 0 && b.health < 50);
    const qs = byDistrict(map, sickHomes.length ? sickHomes : weak).slice(0, 4);
    const quarters = qs.length
      ? `<h5>${sickHomes.length ? 'Where the sick are' : 'The sickliest quarters'}</h5><ul class="ov-list">${qs.map((x) => `<li><button class="ov-row" data-act="go" data-x="${x.x.toFixed(1)}" data-z="${x.z.toFixed(1)}" data-mode="health" title="Go there, with the health overlay on"><span>${esc(districtTitle(x.d))}</span><span class="n">${plural(x.n, 'home', 'homes')}</span></button></li>`).join('')}</ul>`
      : '';
    const hrows = healers.map((b) => {
      const where = lower(districtTitle(districtAt(map, ...centreOf(b))));
      if (b.kind === 'infirmary') {
        const c = calledNear(s, b);
        return `<li><button class="ov-row" data-act="building" data-id="${b.id}" title="Go there and open its panel"><span>The infirmary ${esc(where)}</span><span class="n">${c.homes ? `${fmt(c.called)} of ${fmt(c.homes)} called on` : 'no homes near'}</span></button><small>${b.workers ? `${plural(b.workers, 'physician', 'physicians')} at work; the homes round it a physician called on this month.` : 'Nobody works here: no physician goes out.'}</small></li>`;
      }
      return `<li><button class="ov-row" data-act="building" data-id="${b.id}" title="Go there and open its panel"><span>The asklepieion ${esc(where)}</span><span class="n">${fmt(bedsTaken(s, b))} of ${BEDS} beds</span></button><small>${b.workers ? 'Its stretcher-bearers bring the worst of the sick to its beds; homes round it are healthier.' : 'Nobody works here: no bearers go out.'}</small></li>`;
    });
    out.push(`<section><h3>Sickness and physicians</h3>${table}${quarters}<h5>Infirmaries and asklepieia</h5>${hrows.length ? `<ul class="ov-list">${hrows.join('')}</ul>` : '<p class="ov-note">None. An infirmary (Z six times) sends physicians on rounds; an asklepieion (Z seven times) takes the sick into its beds.</p>'}<p class="ov-note">A home’s health rises with water, a varied table and a physician’s calls, and falls with hunger, crowding, winter and foul air. The health overlay (J after crime) shows each home’s.</p></section>`);
  }
  // The plague, and where homes go without.
  const gap = (title: string, list: readonly Building[], mode: OverlayMode): string => {
    const g = byDistrict(map, list).slice(0, 4);
    return `<h5>${esc(title)}</h5>${g.length ? `<ul class="ov-list">${g.map((x) => `<li><button class="ov-row" data-act="go" data-x="${x.x.toFixed(1)}" data-z="${x.z.toFixed(1)}" data-mode="${mode}" title="Go there, with its overlay on"><span>${esc(districtTitle(x.d))}</span><span class="n">${fmt(x.n)}</span></button></li>`).join('')}</ul>` : '<p class="ov-note">None.</p>'}`;
  };
  const plague: string[] = [];
  if (h.on) {
    const o = hs.outbreak;
    const first = o ? o.struck.map((id) => s.buildings.find((b) => b.id === id)).find((b) => !!b && livedIn(b)) : undefined;
    const lines: string[] = [];
    if (o) lines.push(`<li class="bad">${first ? `<button class="ov-row" ${goB(first)} data-mode="health" title="Go to the first home struck, with the health overlay on"><span>${esc(h.outbreak)}</span></button>` : `<span class="ov-row static"><span>${esc(h.outbreak)}</span></span>`}</li>`);
    if (hs.fever && !o) {
      const at = s.buildings.find((b) => b.id === hs.fever?.home);
      lines.push(`<li class="warn">${at ? `<button class="ov-row" ${goB(at)} data-mode="health" title="Go there, with the health overlay on">` : '<span class="ov-row static">'}<span>Fever in a crowded, sickly quarter (${plural(hs.fever.homes, 'home', 'homes')}): it turns to plague if it lingers ${FEVER_DAYS} days</span>${at ? '</button>' : '</span>'}</li>`);
    }
    for (const p of hs.greece) {
      if (s.tick >= p.until) continue;
      const trades = tradesWith(s, p.city);
      const due = trades ? traderDue(s, p.city) : '';
      // (Phase 6 review: the reasons above no longer repeat this line, so it carries their words on the quarantine and the year after a plague.)
      const held = !trades ? '' : quarantined(s) ? ' (the quarantine holds its traders off)' : mendingFromPlague(s) ? ' (it can’t take hold here so soon after the last)' : '';
      lines.push(`<li class="${trades && !quarantined(s) ? 'warn' : ''}"><button class="ov-row" data-act="city" data-city="${esc(p.city)}" title="Open its page on the map of Greece"><span>Plague in ${esc(cityName(p.city as CityId))}${trades ? `, a city you trade with${held}${due ? `: ${esc(due)}` : ''}` : ': none of its traders comes here'}</span></button></li>`);
    }
    const post = s.buildings.find((b) => b.kind === 'trading') ?? s.buildings.find((b) => b.kind === 'yard');
    const qWords = h.quarantine ? `${esc(h.quarantine)}.` : 'No quarantine.';
    const qLink = post ? ` <button class="ov-link" data-act="building" data-id="${post.id}" title="Go there and open its panel">The ${post.kind === 'trading' ? 'trading post' : 'caravan yard'}</button> ${h.quarantine ? 'can lift it' : 'can order one for a season'}${healers.some((b) => b.kind === 'infirmary') ? ', as can an infirmary' : ''}.` : '';
    // (Phase 6 review: the plague in the city, in a city of Greece and a fevered quarter each have their own line below, with a link, so the reasons leave them out instead of saying them twice.)
    const own = h.reasons.filter((r) => !/^Plague in |^Plague is in the city now/.test(r) && !(/^A fevered quarter/.test(r) && !o));
    const reasons = own.length ? `<ul class="ov-reasons">${own.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>` : '';
    plague.push(`<h3>The plague</h3><p class="ov-risk"><b>${RISK_WORDS[h.risk]}</b> risk${own.length ? ':' : lines.length ? ':' : '.'}</p>${reasons}${lines.length ? `<ul class="ov-list">${lines.join('')}</ul>` : '<p class="ov-note">No plague in the city or among the cities of Greece.</p>'}<p class="ov-note">${qWords}${qLink}</p>`);
  }
  out.push(`<section>${plague.join('')}<h3>Where homes go without</h3>${gap('Without water', dry, 'water')}${gap('Without food', hungry, 'food')}${river.length ? gap('Fetching water from the river', river, 'water') : ''}</section>`);
  out.push('</div>');
  return out.join('');
}

// ---------------------------------------------------------------------------- Army and fleet

function armyPage(s: SimState, map: CoastMap): string {
  const { ms, ids } = annalsOf(s);
  const out: string[] = [];
  // (Merge of slice 47: your own companies, apart from allies' and colonies' militia; a company stationed in a colony is
  // yours and abroad, not missing.)
  const st = strength(s);
  const own = s.army.companies.filter((c) => !c.ally);
  const allied = s.army.companies.filter((c) => c.ally);
  const mine = (x: { company: number }): boolean => own.some((c) => c.id === x.company);
  const men = s.army.soldiers.filter((x) => mine(x) && x.state !== 'fallen' && x.state !== 'leaving');
  const ready = men.filter((x) => x.state === 'ready');
  const arming = men.filter((x) => x.state === 'arming');
  const abroad = own.filter((c) => postedTo(c));
  const triremes = s.fleet.triremes.filter((t) => t.state !== 'sinking');
  const offColony = new Map<number, Colony>();
  for (const c of s.empire.colonies) for (const id of shipsOf(c)) offColony.set(id, c);
  const raids = s.world.raids.filter((r) => r.ended === 0 && r.phase !== 'done');
  const blockades = s.fleet.blockades.filter((b) => b.ended === 0);
  const pirates = s.fleet.pirates.filter((p) => p.state === 'seen' || p.state === 'preying');
  const expeditions = s.world.expeditions.filter((e) => e.phase !== 'done');
  const armour = stockOf(s, 9).total;
  out.push('<div class="ov-tiles">');
  out.push(tile('Soldiers', `${fmt(ready.length)}<small> of ${fmt(men.length)} ready</small>`, st.companies ? `${plural(st.companies, 'company', 'companies')} of yours${abroad.length ? `, ${fmt(abroad.length)} stationed abroad` : ''}${arming.length ? `; ${plural(arming.length, 'man waits', 'men wait')} for armour (${fmt(armour)} sets in store)` : ''}.${st.allies ? ` And ${plural(st.allies, 'allied company', 'allied companies')} in the city.` : ''}` : `No companies of yours: a barracks (B four times) raises them from the better homes.${st.allies ? ` ${cap(plural(st.allies, 'allied company stands', 'allied companies stand'))} with you.` : ''}`, chart(ids, [{ name: 'Soldiers of yours', colour: '#8a3a24', values: [...ms.map((x) => x.soldiers), men.length] }])));
  out.push(tile('Triremes', fmt(triremes.length), triremes.length ? `${triremes.filter((t) => t.state === 'moored').length} moored, ${triremes.filter((t) => t.state === 'away' && !offColony.has(t.id)).length} away${offColony.size ? `, ${offColony.size} stationed off your colonies` : ''}, ${triremes.filter((t) => t.state === 'building').length} building.` : 'No fleet: a shipyard (B seven times) on the shore builds them.', chart(ids, [{ name: 'Triremes', colour: '#2c4a86', values: [...ms.map((x) => x.ships), triremes.length] }])));
  const threats = raids.length + blockades.length + pirates.length;
  out.push(tile('Threats', threats ? fmt(threats) : 'None', threats ? [raids.length ? plural(raids.length, 'war band', 'war bands') : '', blockades.length ? plural(blockades.length, 'blockade', 'blockades') : '', pirates.length ? `pirates on ${plural(pirates.length, 'lane', 'lanes')}` : ''].filter((x) => x).join(', ') + '.' : 'Nothing threatens the city now.', '', threats ? 'bad' : ''));
  out.push(tile('Away', fmt(expeditions.length + abroad.length), expeditions.length || abroad.length ? [expeditions.length ? `${plural(expeditions.length, 'expedition is', 'expeditions are')} out` : '', abroad.length ? `${plural(abroad.length, 'company is', 'companies are')} stationed in a colony or sailing to or from one` : ''].filter((x) => x).join('; ') + '.' : 'No expedition is out, and no company is stationed abroad.', ''));
  out.push('</div>');
  out.push(sinceNote(s));
  out.push('<div class="ov-cols two">');
  const crows = own.map((c) => {
    const m = menOf(s, c);
    const r = readyOf(s, c).length;
    const site = postedTo(c);
    if (site) {
      // Stationed in a colony (or sailing to or from it): a link to the colony's page.
      const col = s.empire.colonies.find((x) => x.site === site);
      const p = passageOf(s, c.id);
      const where = col?.name ?? siteOf(site)?.name ?? site;
      const doing = p ? (p.dir === 'out' ? `on its way to ${where}` : `sailing home from ${where}`) : c.away > 0 ? `out striking from ${where}` : `stationed in ${where}`;
      return `<li><button class="ov-row" data-act="site" data-site="${esc(site)}" title="Open the colony’s page on the map of Greece"><span>${esc(cap(companyName(c)))} · ${esc(kindWord(c.kind))}</span><span class="n">${esc(doing)}</span></button><small>${fmt(m.length)} men abroad.</small></li>`;
    }
    const w = woundedOf(s, c).length;
    const a = m.filter((x) => x.state === 'arming').length;
    const why = [a ? `${a} waiting for armour` : '', w ? `${w} wounded` : '', m.filter((x) => x.state === 'coming').length ? `${m.filter((x) => x.state === 'coming').length} walking in` : ''].filter((x) => x).join(', ');
    return `<li><button class="ov-row" data-act="company" data-id="${c.id}" title="Its banner in hand, on the Army tab"><span>${esc(cap(companyName(c)))} · ${esc(kindWord(c.kind))}</span><span class="n">${r} of ${m.length} ready</span></button>${why ? `<small>${esc(cap(why))}.</small>` : ''}</li>`;
  });
  out.push(`<section><h3>Your companies</h3>${crows.length ? `<ul class="ov-list">${crows.join('')}</ul>` : '<p class="ov-note">None raised.</p>'}`);
  if (allied.length) {
    // Allies' companies and colonies' militia in the city: links to their city's or colony's page.
    const arows = allied.map((c) => {
      const n = menOf(s, c).length;
      const name = c.militia ? `The militia of ${c.militia}` : `${whoseName(cityName(c.ally as CityId))} ${kindWord(c.kind)}`;
      const link = c.militia ? `data-act="site" data-site="${esc(String(c.ally))}"` : `data-act="city" data-city="${esc(String(c.ally))}" data-tab="empire"`;
      return `<li><button class="ov-row" ${link} title="Open its page on the map of Greece"><span>${esc(name)}</span><span class="n">${plural(n, 'man', 'men')}</span></button></li>`;
    });
    out.push(`<h3>Allies and militia</h3><ul class="ov-list">${arows.join('')}</ul><p class="ov-note">They fight beside your soldiers while the threat lasts, then go home.</p>`);
  }
  const trows = triremes.map((t) => {
    const col = offColony.get(t.id);
    if (col) return `<li><button class="ov-row" data-act="site" data-site="${esc(col.site)}" title="Open the colony’s page on the map of Greece"><span>${esc(triremeName(t))}</span><span class="n">stationed off ${esc(col.name)}, hull ${Math.round(t.hp)}%</span></button></li>`;
    return `<li><span class="ov-row static"><span>${esc(triremeName(t))}</span><span class="n">${t.state === 'building' ? `building, ${Math.min(100, Math.round(t.hp))}%` : `${t.state === 'away' ? 'away' : t.state}, hull ${Math.round(t.hp)}%`}</span></span></li>`;
  });
  out.push(`<h3>The fleet</h3>${trows.length ? `<ul class="ov-list">${trows.join('')}</ul>` : '<p class="ov-note">No triremes.</p>'}</section>`);
  const lines: string[] = [];
  for (const r of raids) lines.push(`<li class="bad"><button class="ov-row" data-act="city" data-city="${r.city}"><span>${esc(raidLine(s, map, r))}</span></button></li>`);
  for (const b of blockades) lines.push(`<li class="bad"><button class="ov-row" data-act="city" data-city="${b.city}"><span>${esc(`${whoseName(cityName(b.city))} ${plural(b.ships, 'ship', 'ships')} ${b.phase === 'holding' ? 'hold your harbour’s mouth' : 'are coming to blockade your harbour'}: ${b.why}`)}</span></button></li>`);
  for (const p of pirates) lines.push(`<li class="bad"><span class="ov-row static"><span>${esc(`Pirates ${p.place ? `at ${p.place}` : ''} on the lane to ${cityName(p.city)}: ${plural(p.ships, 'ship', 'ships')}, ${p.state === 'preying' ? 'preying on your goods' : 'seen'}`)}</span></span></li>`);
  for (const e of expeditions) lines.push(`<li><button class="ov-row" data-act="city" data-city="${e.city}"><span>${esc(expeditionLine(s, e))}</span></button></li>`);
  out.push(`<section><h3>Threats and expeditions</h3>${lines.length ? `<ul class="ov-list">${lines.join('')}</ul>` : '<p class="ov-note">Nothing threatens the city, and no expedition is out.</p>'}</section>`);
  out.push('</div>');
  return out.join('');
}

// ---------------------------------------------------------------------------- Empire

function empirePage(s: SimState): string {
  const { ms, ids } = annalsOf(s);
  const out: string[] = [];
  const vassals = s.empire.vassals;
  const allies = s.empire.allies;
  const colonies = s.empire.colonies;
  const freed = s.empire.freed ?? [];
  const people = colonies.reduce((a, c) => a + peopleOf(s, c), 0);
  // (Merge of slice 47: the colonies' and free allies' share of their trade comes in coin besides their goods.)
  const trade = colonies.reduce((a, c) => a + colonyTrade(s, c).share, 0) + freed.reduce((a, f) => a + freeTrade(s, f).share, 0);
  const yearDr = vassals.reduce((a, v) => a + tributeYear(s, v).dr, 0) + colonies.reduce((a, c) => a + colonyYear(s, c).dr, 0) + trade;
  const militia = militiaReady(s);
  const militiaMen = militia.reduce((a, m) => a + m.men, 0);
  const stationed = colonies.filter((c) => stationedWords(s, c));
  out.push('<div class="ov-tiles">');
  out.push(tile('Vassals', fmt(vassals.length), vassals.length ? `${vassals.map((v) => `${esc(cityName(v.city))}, loyalty ${Math.round(v.loyalty)}${v.arming ? ', arming against you' : ''}`).join('; ')}.${allies.length + freed.length ? ` And ${plural(allies.length + freed.length, 'ally', 'allies')}.` : ''}` : allies.length + freed.length ? `None, but ${plural(allies.length + freed.length, 'ally', 'allies')}.` : 'No city of Greece is bound to you.', chart(ids, [{ name: 'Vassals', colour: '#8a3a24', values: [...ms.map((x) => x.vassals), vassals.length] }])));
  out.push(tile('Colonies', fmt(colonies.length), colonies.length ? `${plural(people, 'person lives', 'people live')} in them.${stationed.length ? ` Something of yours is stationed in ${plural(stationed.length, 'of them', 'of them')}.` : ''}` : 'None founded. The quay sends settlers to a free site of Greece from its page on the map (Tab).', chart(ids, [{ name: 'Colonists', colour: '#2c4a86', values: [...ms.map((x) => x.colonists), people] }])));
  out.push(tile('Tribute and shares', yearDr ? `${fmt(yearDr)}<small> dr a year</small>` : 'None', yearDr ? `What your vassals and colonies send you in a year, at their prices${trade ? `, ${fmt(trade)} dr of it your share of the colonies’ trade, in coin` : ''}.` : 'Nothing comes in from an empire yet.', ''));
  out.push(tile('Militia', militiaMen ? fmt(militiaMen) : 'None', militiaMen ? `${plural(militiaMen, 'man', 'men')} of ${plural(militia.length, 'colony or free ally', 'colonies and free allies')} would sail to your aid when you are raided, and with your army to its wars.` : 'No colony sends militia yet: a town-stage colony, loyal and not talking of freedom, does.', ''));
  out.push('</div>');
  out.push(sinceNote(s));
  out.push('<div class="ov-cols two">');
  const vrows = vassals.map((v) => {
    const l = loyaltyOf(s, v);
    const low = l.why.filter((x) => x.n < 0).slice(0, 2).map((x) => x.why).join('; ');
    const high = l.why.filter((x) => x.n > 0).slice(0, 1).map((x) => x.why).join('');
    return `<li class="${v.arming ? 'bad' : ''}"><button class="ov-row" data-act="city" data-city="${v.city}" data-tab="empire" title="Open its page"><span>${esc(cityName(v.city))}</span><span class="n">loyalty ${Math.round(v.loyalty)}</span></button><small>${esc(cap([v.arming ? 'Arming against you' : '', low ? `held back: ${low}` : '', high ? `glad of ${lower(high)}` : ''].filter((x) => x).join('; ')))}. Tribute about ${fmt(tributeYear(s, v).dr)} dr a year.</small></li>`;
  });
  const arows = allies.map((a) => `<li><button class="ov-row" data-act="city" data-city="${a.city}" data-tab="empire"><span>${esc(cityName(a.city))}, your ally</span></button></li>`);
  const frows = freed.map((f) => {
    const m = militia.find((x) => x.site === f.site);
    return `<li><button class="ov-row" data-act="site" data-site="${esc(f.site)}" title="Open its page"><span>${esc(f.name)}, your free ally</span><span class="n">${fmt(Math.round(siteRecord(s, f.site)?.pop ?? 0))} people</span></button><small>${fmt(freeTrade(s, f).share)} dr a year of its trade${m ? `; ${m.men} militia when you need them` : ''}.</small></li>`;
  });
  out.push(`<section><h3>Vassals and allies</h3>${vrows.length + arows.length + frows.length ? `<ul class="ov-list">${vrows.join('')}${arows.join('')}${frows.join('')}</ul>` : '<p class="ov-note">None. A city can be made your vassal by conquest, by a herald, or for its debt, from its page on the map (Tab).</p>'}</section>`);
  const crows = colonies.map((c) => {
    const l = colonyLoyalty(s, c);
    const low = l.why.filter((x) => x.n < 0).slice(0, 2).map((x) => x.why.replace(/[:(].*$/, '').trim()).join('; ');
    const want = c.want && c.want.end === '' ? `wants ${fmt(c.want.amount)} ${wareInfo(WANT_WARE[c.want.kind] ?? 0).name.toLowerCase()} ${dueWords(s, c.want.due)}` : '';
    const threat = c.threat && c.threat.end === '' ? `threatened by ${cityName(c.threat.city)}` : '';
    const where = siteOf(c.site)?.name ?? c.site;
    const st = stationedWords(s, c);
    const m = militia.find((x) => x.site === c.site);
    const held = [st ? `${st} stationed there` : '', m ? `${m.men} militia when you need them` : ''].filter((x) => x).join('; ');
    return `<li class="${threat || c.talk ? 'bad' : ''}"><button class="ov-row" data-act="site" data-site="${c.site}" title="Open its page"><span>${esc(c.name)} <small>on ${esc(where)}</small></span><span class="n">${fmt(peopleOf(s, c))} · ${esc(STAGE_NAMES[stageOf(c)])}</span></button><small>${esc(cap([`loyalty ${Math.round(c.loyalty)}`, low ? `held back: ${low}` : '', want, threat, c.talk ? 'talking of freedom' : ''].filter((x) => x).join('; ')))}. Its share about ${fmt(colonyYear(s, c).dr)} dr a year, and ${fmt(colonyTrade(s, c).share)} dr of its trade.${held ? ` ${esc(cap(held))}.` : ''}</small></li>`;
  });
  out.push(`<section><h3>Colonies</h3>${crows.length ? `<ul class="ov-list">${crows.join('')}</ul>` : '<p class="ov-note">None yet.</p>'}</section>`);
  out.push('</div>');
  return out.join('');
}

/** A colony's want's ware. */
const WANT_WARE: Record<string, Ware> = { wheat: 0, wine: 7, oil: 4, fleece: 5, timber: 11, armour: 9 };

// ---------------------------------------------------------------------------- the tabs

/** Each page's word on its tab, and whether it wants looking at (1) or is urgent (2). */
function tabState(s: SimState): Record<OverviewPage, { word: string; warn: 0 | 1 | 2 }> {
  const homes = s.buildings.filter(livedIn);
  const trouble = homes.filter((b) => warningsOf(s, b).length > 0).length;
  const short = panelWares().filter((w) => {
    const { m } = quoted(s, w);
    const st = stockOf(s, w).total;
    const net = rateOf(s, w, m);
    return net < -0.5 && st > 0 && st / -net < 3 && m.used + m.sold > 0;
  }).length;
  const lacking = SERVICES.reduce((a, sv) => {
    const need = homes.filter((b) => needsOf(b).includes(sv.need));
    return a + need.filter((b) => untilOf(b, sv.need) <= s.tick).length;
  }, 0);
  const crimeNow = crimesIn(rateFor(s, Math.floor(s.tick / TICKS_PER_MONTH)));
  const threats = s.world.raids.filter((r) => r.ended === 0 && r.phase !== 'done').length + s.fleet.blockades.filter((b) => b.ended === 0).length;
  const owed = owedWages(s).owed;
  const debt = debts(s.world).filter((l) => l.side === 'in');
  const dry = homes.filter((b) => needsOf(b).includes('water') && b.waterUntil <= s.tick).length;
  const restless = s.empire.vassals.some((v) => v.arming) || s.empire.colonies.some((c) => c.talk || (c.threat && c.threat.end === ''));
  return {
    city: { word: fmt(s.population), warn: trouble ? 1 : 0 },
    goods: { word: short ? `${short} short` : 'in hand', warn: short ? 1 : 0 },
    treasury: { word: `${fmt(s.money)} dr`, warn: owed > 0 || debt.some((l) => l.state === 'overdue') ? 2 : debt.length ? 1 : 0 },
    distribution: { word: lacking ? plural(lacking, 'gap', 'gaps') : 'all reached', warn: lacking ? 1 : 0 },
    crime: { word: !s.crime.on ? 'none' : s.crime.gangs.length ? `${plural(s.crime.gangs.length, 'gang', 'gangs')}` : `${fmt(crimeNow)} this month`, warn: s.crime.gangs.length || s.crime.jails.some((j) => j.unrest >= UNREST_WARN) ? 2 : crimeNow ? 1 : 0 },
    // (Merge of slice 49: red for plague in the city, amber for a fevered quarter or plague in a city whose traders may bring it.)
    health: healthTab(s, dry),
    army: { word: threats ? `${plural(threats, 'threat', 'threats')}` : `${fmt(s.army.soldiers.filter((x) => x.state === 'ready').length)} ready`, warn: threats ? 2 : 0 },
    // Slice 53: the gods (amber with one displeased, red with one angry).
    gods: godsTab(s),
    empire: { word: s.empire.vassals.length + s.empire.colonies.length ? [s.empire.vassals.length ? plural(s.empire.vassals.length, 'vassal', 'vassals') : '', s.empire.colonies.length ? plural(s.empire.colonies.length, 'colony', 'colonies') : ''].filter((x) => x).join(', ') : 'none yet', warn: restless ? 1 : 0 },
  };
}

/** Merge of slice 49: the Health tab's word and mark. */
function healthTab(s: SimState, dry: number): { word: string; warn: 0 | 1 | 2 } {
  const h = s.health;
  if (!h?.on) return { word: dry ? `${fmt(dry)} dry` : 'well', warn: dry ? 1 : 0 };
  const threat = !quarantined(s) && !mendingFromPlague(s) && h.greece.some((p) => p.warned > 0 && s.tick < p.until && tradesWith(s, p.city));
  const sick = h.sick.length;
  if (h.outbreak) return { word: 'plague', warn: 2 };
  if (h.fever) return { word: 'fever', warn: 1 };
  if (threat) return { word: 'plague near', warn: 1 };
  return { word: sick ? `${fmt(sick)} sick` : dry ? `${fmt(dry)} dry` : 'well', warn: dry ? 1 : 0 };
}

/** The page's HTML. */
export function overviewHtml(s: SimState, map: CoastMap, page: OverviewPage, ware: number, mode: OverlayMode | null): string {
  switch (page) {
    case 'city':
      return cityPage(s, map);
    case 'goods':
      return goodsPage(s, map, ware);
    case 'treasury':
      return treasuryPage(s);
    case 'distribution':
      return distributionPage(s, map, mode);
    case 'crime':
      return crimePage(s, map);
    case 'health':
      return healthPage(s, map);
    case 'army':
      return armyPage(s, map);
    case 'empire':
      return empirePage(s);
    // Slice 53.
    case 'gods':
      return godsPage(s, map);
  }
}

// ---------------------------------------------------------------------------- on the kit (merge of slice 50)

/** The drawing for a go-to button or row, by what it does: a place, a home, a page, a ware, the ledger, a city, a colony, a company. */
function linkIcon(attrs: string): string {
  const act = /data-act="([^"]*)"/.exec(attrs)?.[1] ?? '';
  if (act === 'page') return actionIcon(PAGE_ICONS[(/data-page="([^"]*)"/.exec(attrs)?.[1] ?? 'city') as OverviewPage] ?? 'go');
  const by: Record<string, ActionIcon> = { home: 'home', ware: 'keep', wareside: 'keep', ledger: 'pay', city: 'treaty', site: 'station', company: 'banner' };
  return actionIcon(by[act] ?? 'go');
}

/**
 * A page's HTML on the kit: its links become stone plaques with a drawing of where they go, its rows that go somewhere
 * end in that drawing, its one plain button a bronze plaque, and its titles the one tip's words.
 */
function onKit(html: string): string {
  return kitHtml(
    html
      .replace(/<button class="ov-link"([^>]*)>([\s\S]*?)<\/button>/g, (_, a: string, w: string) => `<button class="ov-link k-btn stone small"${a}><span class="k-bi">${linkIcon(a)}</span><span class="k-bt">${w}</span></button>`)
      .replace(/<button class="ov-btn"([^>]*)>([\s\S]*?)<\/button>/g, (_, a: string, w: string) => `<button class="ov-btn k-btn small"${a}><span class="k-bi">${linkIcon(a)}</span><span class="k-bt">${w}</span></button>`)
      .replace(/<button class="ov-row"([^>]*)>([\s\S]*?)<\/button>/g, (_, a: string, w: string) => `<button class="ov-row"${a}>${w}<span class="ov-go">${linkIcon(a)}</span></button>`),
  );
}

/** How often (seconds) the open window is brought up to date. */
const REFRESH = 0.6;
/** Remembered between visits (where the browser lets it): the page last open. */
const STORE_KEY = 'zeus-remake.overview';

export class Overview {
  private readonly el: HTMLElement;
  private readonly tabs: HTMLElement;
  private readonly body: HTMLElement;
  private readonly head: HTMLElement;
  private page: OverviewPage = 'city';
  private ware = -1;
  private html = '';
  private tabsHtml = '';
  private headHtml = '';
  private last = -Infinity;
  /** The loop's clock at its last call (a forced refresh, called with Infinity, counts as made then). */
  private clock = 0;
  private s: SimState | null = null;
  private map: CoastMap | null = null;
  /** The overlay showing (for the Distribution page's rows). */
  mode: OverlayMode | null = null;
  /** Called when the window opens (the cards and panels it would cover make way). */
  onOpen: (() => void) | null = null;

  constructor(
    root: HTMLElement,
    private readonly deps: OverviewDeps,
  ) {
    const el = document.createElement('div');
    el.className = 'overview kit';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Overview of the city');
    el.innerHTML = '<button class="close" data-tip="Close (O or Esc)" aria-label="Close">×</button><header class="ov-head k-head"></header><nav class="ov-tabs" role="tablist"></nav><div class="ov-body"></div>';
    root.appendChild(el);
    this.el = el;
    this.head = el.querySelector('.ov-head') as HTMLElement;
    this.tabs = el.querySelector('.ov-tabs') as HTMLElement;
    this.body = el.querySelector('.ov-body') as HTMLElement;
    (el.querySelector('.close') as HTMLElement).addEventListener('click', () => this.toggle(false));
    el.addEventListener('click', (e) => this.click(e));
    try {
      const p = localStorage.getItem(STORE_KEY);
      if (p && (PAGES as readonly string[]).includes(p)) this.page = p as OverviewPage;
    } catch {
      /* No storage here: the City page. */
    }
  }

  get open(): boolean {
    return !this.el.hidden;
  }

  get pageNow(): OverviewPage {
    return this.page;
  }

  /** What the window says now (for the probe). */
  get text(): string {
    return this.open ? (this.el.textContent ?? '') : '';
  }

  /** Open or close it; open on a page if one is named. */
  toggle(show = this.el.hidden, page?: OverviewPage): void {
    if (page) this.show(page);
    const opening = show && this.el.hidden;
    this.el.hidden = !show;
    this.last = -Infinity;
    if (opening) this.onOpen?.();
  }

  /** Turn to a page. */
  show(page: OverviewPage, ware?: number): void {
    if (page !== this.page) this.body.scrollTop = 0;
    this.page = page;
    if (ware !== undefined) this.ware = ware;
    this.last = -Infinity;
    try {
      localStorage.setItem(STORE_KEY, page);
    } catch {
      /* Not kept: fine. */
    }
  }

  private click(e: Event): void {
    const t = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
    if (!t) return;
    const act = t.dataset.act;
    const n = Number(t.dataset.id);
    if (act === 'page') this.show(t.dataset.page as OverviewPage);
    else if (act === 'ware') this.show('goods', Number(t.dataset.ware));
    else if (act === 'wareside') this.deps.openWare(Number(t.dataset.ware));
    else if (act === 'go') {
      this.deps.goTo(Number(t.dataset.x), Number(t.dataset.z), (t.dataset.mode as OverlayMode | undefined) || undefined);
      this.toggle(false);
    } else if (act === 'overlay') {
      // (Merge of slice 51: with a place, the camera flies there too.)
      if (t.dataset.x !== undefined) this.deps.goTo(Number(t.dataset.x), Number(t.dataset.z), t.dataset.mode as OverlayMode);
      else this.deps.overlay(t.dataset.mode as OverlayMode);
      this.toggle(false);
    } else if (act === 'home') {
      this.deps.openHome(n);
      this.toggle(false);
    } else if (act === 'building') {
      this.deps.openBuilding(n);
      this.toggle(false);
    } else if (act === 'ledger') {
      this.deps.ledger();
      this.toggle(false);
    }
    else if (act === 'city') {
      this.deps.city(t.dataset.city as CityId, t.dataset.tab);
      this.toggle(false);
    } else if (act === 'site') {
      this.deps.site(t.dataset.site ?? '');
      this.toggle(false);
    } else if (act === 'company') {
      this.deps.company(n);
      this.toggle(false);
    } else return;
    this.last = -Infinity;
    if (this.s && this.map && this.open) this.update(this.s, this.map, Infinity);
  }

  /** Bring it up to date (a couple of times a second while open). */
  update(s: SimState, map: CoastMap, time: number): void {
    this.s = s;
    this.map = map;
    if (Number.isFinite(time)) this.clock = time;
    if (this.el.hidden || time - this.last < REFRESH) return;
    this.last = this.clock;
    const st = tabState(s);
    // (Merge of slice 50: each tab a plaque with its page's drawing; its dot says the page wants looking at, or is urgent.)
    const tabs = PAGES.map((p) => `<button role="tab" class="ov-tab${p === this.page ? ' on' : ''}${st[p].warn ? ` warn${st[p].warn}` : ''}" data-act="page" data-page="${p}" aria-selected="${p === this.page}" data-tip="${esc(`${PAGE_NAMES[p]}: ${st[p].word}${st[p].warn === 2 ? ' · urgent' : st[p].warn ? ' · worth a look' : ''}`)}"><span class="ov-ti">${actionIcon(PAGE_ICONS[p])}</span><b>${esc(PAGE_NAMES[p])}</b><span>${esc(st[p].word)}</span></button>`).join('');
    if (tabs !== this.tabsHtml) {
      this.tabsHtml = tabs;
      morph(this.tabs, tabs);
    }
    const d = monthName(Math.floor(s.tick / TICKS_PER_MONTH), true);
    // (Merge of slice 50: the kit's carved plaque, with the overview's tablets.)
    const head = `<div class="k-pic">${actionIcon('overview')}</div><div class="k-hd"><div class="k-kicker">The overview · ${esc(d)} · ${plural(Math.min(ANNAL_MONTHS, s.annals.months.length), 'month', 'months')} in the annals</div><h2>${esc(s.world.name || 'Your city')}</h2></div>`;
    if (head !== this.headHtml) {
      this.headHtml = head;
      morph(this.head, head);
    }
    const html = overviewHtml(s, map, this.page, this.ware, this.mode);
    if (html !== this.html) {
      this.html = html;
      morph(this.body, `<div class="ov-page ov-${this.page}">${onKit(html)}</div>`);
    }
  }
}
