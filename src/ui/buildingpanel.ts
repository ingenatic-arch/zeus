/**
 * Slice 48: a building's panel, opened by clicking any building that has no
 * panel of its own. On the left where a home's panel opens, one at a time
 * with the household, trade, shipyard and Messages panels. Top to bottom:
 *
 * - its picture, its name and where it stands;
 * - its staff (how many of how many, and why short), paused or first;
 * - what it is doing and why not (the hover tip's own lines, which say why);
 * - what it holds, each ware with a bar against its room;
 * - its walkers out (each kind, with Follow) and what is coming to it;
 * - its condition: fire risk and wear as bars, smouldering, burning,
 *   creaking, smashed;
 * - its recent messages (the scroll's, by place), each opening the Messages
 *   panel on it;
 * - its controls: Pause and Workers first; a granary's or storehouse's row
 *   for each ware (accept, don't accept, get, empty; and how full).
 *
 * The registry (PANELS) holds what differs by kind: a building with a panel
 * of its own elsewhere (a home, the barracks, the trading post…), one with no
 * orders, and any sections of its own. A new building adds an entry of a few
 * lines: `court: { more: (s, map, b) => '<section>…</section>' }` (the court's
 * and the prison's are so: src/ui/justice.ts).
 *
 * It only reads the state; its buttons send commands.
 */
import './buildingpanel.css';
import type { CoastMap } from '../map/bake';
import { districtAt, districtTitle } from '../map/districts';
import { BUILDING_NAMES, findBuilding, footSide, HOME_NAMES, jobsAt } from '../sim/buildings';
import { dateOfTick, MONTH_NAMES } from '../sim/clock';
import type { Command } from '../sim/commands';
import { held, WARE_NAMES, WARES, type Ware } from '../sim/foods';
import { burnable, HAZARD_FULL, wears } from '../sim/hazards';
import { rateOf } from '../sim/labour';
import { messagesAt, titleOf } from '../sim/messages';
import { misdeedLines } from '../sim/misdeeds';
import { MAKERS } from '../sim/production';
import { hazardLines, homeStatus, workersLine } from '../sim/status';
import { ACCEPT, cutOf, EMPTY, GET, isStore, LIMIT_NAMES, modeOf, REFUSE, roomFor, roomOf, storeOf } from '../sim/stores';
import type { Building, BuildingKind, SimState, Walker } from '../sim/state';
import { morph } from './morph';
import { wareIcon } from './wareicons';
// Merge of slice 45.
import { courtSections, JUSTICE_QUIET, prisonSections } from './justice';
// Slice 51
import { STALL_ROOM, stallRoom } from '../sim/food';
import { hasStall } from '../sim/goods';
// Slice 49: the infirmary and the asklepieion.
import { asklepieionSections, HEALTH_QUIET, infirmarySections } from './health';
// Slice 50: the kit.
import { actionIcon, buildingIcon, messageIcon } from './icons';
// Merge of slice 50 with slice 49.
import { walkerFigure } from './icons';
import { kbar, kbtn, khead, kitHtml, kpips, kstep, ktoggle } from './kit';
// Slice 56: a god's blessing on the building, under its plaque.
import { blessingWords } from '../sim/epiphany';
// Slice 54: a sanctuary's sections.
import { SANCTUARY_QUIET, sanctuarySections } from './sanctuarypanel';
import { GODS } from '../sim/pantheon';
// Slice 53: the shrine's god.
import { SHRINE_QUIET, shrineAct, shrineSections } from './olympus';
import { sanctuaryAct } from './olympus';
// Slice 59: a hero's hall (its hero, demands, wish, monsters to send them against).
import { hallSections } from './heroes';
import { hallName } from '../sim/heroes';
import type { HeroId } from '../sim/pantheon';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const cap = (t: string): string => (t ? t[0].toUpperCase() + t.slice(1) : t);

// ---------------------------------------------------------------------------- the registry

/** What differs by kind of building. */
export interface PanelEntry {
  /** It has a panel of its own elsewhere: a button in this one opens it, with these words. */
  own?: string;
  /** No Pause or Workers first (a monument's site, a tower). */
  noOrders?: boolean;
  /** Sections of its own, after what it holds (a court's cases, a prison's cells): HTML, `<section>`s. */
  more?: (s: SimState, map: CoastMap, b: Building) => string;
  /** Lines of its tip that its own sections say, left out of "What it is doing" (merge of slice 45: the court's law, the prison's cells). */
  quiet?: RegExp;
  /** Slice 53: its own sections' buttons: a command to send, 'redraw' (its own state changed), or null (not one of its own). */
  act?: (act: string, el: HTMLElement, b: Building) => Command | 'redraw' | null;
}

/** Each kind's entry (a kind with none gets the panel as it is). */
export const PANELS: Partial<Record<BuildingKind, PanelEntry>> = {
  home: { own: 'Who lives here' },
  barracks: { own: 'Its companies, on the Army tab' },
  shipyard: { own: 'The shipyard’s panel' },
  trading: { own: 'The trade panel: what to sell and keep' },
  yard: { own: 'The trade panel: the caravans' },
  masons: { own: 'The Monuments tab' },
  lighthouse: { own: 'The Monuments tab', noOrders: true },
  colossus: { own: 'The Monuments tab', noOrders: true },
  stadium: { own: 'The Monuments tab', noOrders: true },
  // Merge of slice 45: the court (the law, its cases, the crime rate) and the prison (its cells, unrest, prisoners), src/ui/justice.ts.
  court: { more: courtSections, quiet: JUSTICE_QUIET },
  prison: { more: prisonSections, quiet: JUSTICE_QUIET },
  // Slice 49: the infirmary (its physicians, the city's health, the quarantine) and the asklepieion (its beds, the city's health, the quarantine), src/ui/health.ts.
  infirmary: { more: infirmarySections, quiet: HEALTH_QUIET },
  asklepieion: { more: asklepieionSections, quiet: HEALTH_QUIET },
  // Slice 54: a sanctuary (its god, its stages, the god's mood, its priests), src/ui/sanctuarypanel.ts.
  // (Merge of slice 53: its festival and offering buttons, in the sections' slot, act through slice 53's.)
  sanctuary: { more: sanctuarySections, quiet: SANCTUARY_QUIET, act: sanctuaryAct },
  // Slice 53: the shrine (its god, or the twelve to choose from; the god's mood; a festival and an offering), src/ui/olympus.ts.
  shrine: { more: shrineSections, quiet: SHRINE_QUIET, act: shrineAct },
};

// Slice 59: a hero's hall: no Pause or Workers (nobody works there), its hero's sections (which say all its tip does).
PANELS.herohall = { noOrders: true, more: hallSections, quiet: /./ };

/** Does a kind have a panel of its own elsewhere (which a click opens instead)? */
export const ownPanel = (kind: BuildingKind): boolean => !!PANELS[kind]?.own;

// ---------------------------------------------------------------------------- words

/** Each walker's kind, one and many. */
const WALKER_WORDS: Partial<Record<Walker['kind'], [string, string]>> = {
  water: ['water carrier', 'water carriers'],
  food: ['food vendor', 'food vendors'],
  oil: ['oil vendor', 'oil vendors'],
  fleece: ['fleece vendor', 'fleece vendors'],
  wine: ['wine vendor', 'wine vendors'],
  cart: ['ox cart', 'ox carts'],
  oxcart: ['ox cart', 'ox carts'],
  sledge: ['sledge', 'sledges'],
  porter: ['porter', 'porters'],
  shipper: ['porter for the quay', 'porters for the quay'],
  priestess: ['priestess', 'priestesses'],
  actor: ['actor', 'actors'],
  tax: ['tax collector', 'tax collectors'],
  hunter: ['hunter', 'hunters'],
  watchman: ['watchman', 'watchmen'],
  inspector: ['inspector', 'inspectors'],
  docker: ['docker', 'dockers'],
  quarryman: ['quarryman', 'quarrymen'],
  logger: ['logger', 'loggers'],
  builder: ['builder', 'builders'],
  caravan: ['caravan', 'caravans'],
  // (Merge of slice 45: one of the caught, walked to the court.)
  convict: ['one of the caught, walked here by a watchman', 'of the caught, walked here by watchmen'],
  // Slice 49.
  physician: ['physician', 'physicians'],
  bearer: ['pair of stretcher-bearers', 'pairs of stretcher-bearers'],
  // Slice 54.
  priest: ['priest', 'priests'],
};
const walkerWords = (k: Walker['kind'], n: number): string => {
  const w = WALKER_WORDS[k] ?? [k, `${k}s`];
  return n === 1 ? `${w[0]}` : `${n} ${w[1]}`;
};

/** A building's name without its article: "Olive press". */
export function nameOf(b: Building): string {
  if (b.kind === 'home') return HOME_NAMES[Math.min(b.level, HOME_NAMES.length - 1)].replace(/^(A|An) /, '').replace(/^./, (c) => c.toUpperCase());
  // Slice 54: whose sanctuary it is.
  if (b.kind === 'sanctuary' && b.god) return `Sanctuary to ${GODS[b.god].name}`;
  // Slice 59: whose hall it is (the review).
  if (b.kind === 'herohall' && b.hero) return hallName(b.hero);
  return cap((BUILDING_NAMES[b.kind] ?? b.kind).replace(/^(A|An|The) /, ''));
}

/** Where it stands: its district, "On the west bank", "By the olive grove". */
export function whereWords(map: CoastMap, b: Building): string {
  const h = footSide(b) / 2;
  return districtTitle(districtAt(map, b.x + h, b.z + h));
}

const SHORT_MONTHS = MONTH_NAMES.map((m) => m.slice(0, 3));
const dayOf = (tick: number): string => {
  const d = dateOfTick(tick);
  return `${d.day} ${SHORT_MONTHS[d.month]}`;
};

/** A ware's amount in its units: "1,300 jars", "40 horses", "300 measures". */
const UNITS: Partial<Record<Ware, [string, string]>> = { 4: ['jar', 'jars'], 5: ['bale', 'bales'], 7: ['amphora', 'amphorae'], 8: ['ingot', 'ingots'], 9: ['set', 'sets'], 10: ['block', 'blocks'], 11: ['log', 'logs'], 12: ['horse', 'horses'] };
const unitWords = (w: Ware, n: number): string => {
  const u = UNITS[w] ?? ['measure', 'measures'];
  return n === 1 ? u[0] : u[1];
};

// ---------------------------------------------------------------------------- the sections

/** One line of a bar: a ware, what it holds against its room (no room: just the number). */
function holdRow(w: Ware, n: number, room: number, extra = ''): string {
  const bar = room > 0 ? kbar({ value: n, max: room, tone: 'stock', tip: `${fmt(n)} of ${fmt(room)} ${unitWords(w, room)}` }) : '<span class="hbar none"></span>';
  return `<li>${wareIcon(w)}<span class="hname">${cap(WARE_NAMES[w])}</span>${bar}<span class="hnum">${fmt(n)}${room > 0 ? `<small> / ${fmt(room)}</small>` : ''}</span>${extra}</li>`;
}

/** What a workplace holds (a store's own rows are under its controls instead). */
function holdsBlock(b: Building): string {
  if (isStore(b.kind)) return '';
  const rows: string[] = [];
  const made = MAKERS[b.kind]?.ware;
  for (const w of WARES) {
    const n = held(b, w);
    // (Slice 51: the agora's stalls' room too, so its foods and goods have their bars.)
    const room = roomOf(b.kind, w) || (w === made ? storeOf(b.kind) : 0) || (b.kind === 'agora' ? (w < STALL_ROOM.length ? STALL_ROOM[w] : hasStall(b, w) ? stallRoom(w) : 0) : 0);
    if (room <= 0 && n <= 0) continue;
    rows.push(holdRow(w, n, room));
  }
  return rows.length ? `<section class="holds"><h3>What it holds</h3><ul class="hold">${rows.join('')}</ul></section>` : '';
}

/** The staff: pips for its jobs, filled for its workers; the line saying why short; paused or first. */
function staffBlock(s: SimState, map: CoastMap, b: Building, entry: PanelEntry | undefined): string {
  const jobs = jobsAt(b);
  if (jobs === 0 || b.kind === 'home') return '';
  const n = Math.min(b.workers, jobs);
  const pips = jobs <= 16 ? kpips(Array.from({ length: jobs }, (_, i) => (i < n ? 'on' : 'off')), `${n} of ${jobs} workers`) : '';
  const lines = workersLine(s, map, b).split('\n').filter((l) => l);
  const head = b.paused ? 'Paused' : `${n} of ${jobs} workers`;
  const rate = rateOf(b);
  const pace = !b.paused && n > 0 && rate < 1 ? ` · working at ${Math.round(rate * 100)}%` : '';
  // (Review of slice 48: a paused maker's carts still take out what it has made.)
  const note = b.paused
    ? `<p class="note paused">Paused: its workers have gone to other work, and it does nothing until it is set going again.${MAKERS[b.kind] ? ' What it has already made still goes out by cart.' : ''}</p>`
    : b.first
      ? '<p class="note first">Workers first: it is staffed before any other workplace, from the homes nearest it.</p>'
      : '';
  // (The staff line's own words after the count, without repeating it.)
  const why = lines.map((l) => l.replace(/^Workers: \d+ of \d+( · workers first)?$/, '').replace(/^Short of workers: \d+ of \d+ · working at \d+% · /, '')).filter((l) => l && !/^Paused/.test(l));
  // (Slice 50: its orders right under its staff, so they are above the fold whatever follows.)
  return `<section class="staff"><h3>Staff</h3><div class="count">${pips}<b>${head}</b>${pace}</div>${why.map((l) => `<p class="why">${esc(cap(l))}</p>`).join('')}${note}${ordersBlock(b, entry)}</section>`;
}

/** What it is doing, and why not: the hover tip's lines, less the staff and the condition (which have their own sections). */
function doingBlock(detail: string[], skip: Set<string>): string {
  const ls = detail.filter((l) => l && !skip.has(l));
  if (!ls.length) return '';
  return `<section class="doing"><h3>What it is doing</h3><ul class="lines">${ls.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></section>`;
}

/** Its walkers out (each kind once, with Follow), and what is on its way to it. */
function walkersBlock(s: SimState, b: Building): string {
  const out = new Map<Walker['kind'], Walker[]>();
  const coming = new Map<Walker['kind'], number>();
  for (const w of s.walkers) {
    if (w.kind === 'settler' || w.kind === 'leaver' || w.kind === 'colonist') continue;
    if (w.origin === b.id) {
      const l = out.get(w.kind);
      if (l) l.push(w);
      else out.set(w.kind, [w]);
    } else if (w.target === b.id && !w.back && (w.kind === 'cart' || w.kind === 'sledge' || w.kind === 'porter' || w.kind === 'oxcart')) coming.set(w.kind, (coming.get(w.kind) ?? 0) + 1);
  }
  const rows: string[] = [];
  for (const [k, ws] of out) {
    const loaded = ws.filter((w) => w.load > 0 && w.food >= 0 && !w.back);
    const what = loaded.length && (k === 'cart' || k === 'sledge' || k === 'porter' || k === 'shipper') ? ` · ${[...new Set(loaded.map((w) => WARE_NAMES[w.food as Ware]).filter((x) => x))].join(', ')}` : '';
    const home = ws.filter((w) => w.back).length;
    const state = k === 'convict' ? '' : home === ws.length ? ' · on the way back' : home ? ` · ${home} on the way back` : ' · out';
    // (Merge of slice 50 with slice 49: the physician and the stretcher-bearers drawn beside their row.)
    const fig = walkerFigure(k);
    rows.push(`<li>${fig ? `<span class="wfig">${fig}</span>` : ''}<span>${esc(cap(walkerWords(k, ws.length)))}${esc(state)}${esc(what)}</span>${kbtn({ act: 'follow', data: { kind: k, walker: ws[0].id }, icon: 'follow', html: 'Follow', small: true, tip: `Follow ${walkerWords(k, 1).replace(/^\d+ /, '')} through the streets` })}</li>`);
  }
  const towards = [...coming].map(([k, n]) => (n === 1 ? `${/^[aeiou]/.test(walkerWords(k, 1)) ? 'an' : 'a'} ${walkerWords(k, 1)}` : walkerWords(k, n))).join(', ');
  if (!rows.length && !towards) return '';
  return `<section class="walkers"><h3>Its walkers</h3>${rows.length ? `<ul class="out">${rows.join('')}</ul>` : '<p class="none">None out just now.</p>'}${towards ? `<p class="coming">On the way here: ${esc(towards)}</p>` : ''}</section>`;
}

/** Fire risk and wear as bars, and what is wrong with it now. */
function conditionBlock(s: SimState, map: CoastMap, b: Building, hz: string[], misdeeds: string[]): string {
  const bars: string[] = [];
  const bar = (name: string, v: number, cls: string): string => `<li class="${cls}"><span class="hname">${name}</span>${kbar({ value: v, max: HAZARD_FULL, tone: cls === 'risk' ? 'danger' : 'wear' })}<span class="hnum">${Math.round((v / HAZARD_FULL) * 100)}%</span></li>`;
  if (burnable(b)) bars.push(bar('Fire risk', b.risk, 'risk'));
  if (wears(b)) bars.push(bar('Wear', b.wear, 'wear'));
  const lines = [...hz, ...misdeeds];
  if (!bars.length && !lines.length) return '';
  void s;
  void map;
  const urgent = b.fire > 0 || b.creakAt > 0;
  return `<section class="condition"><h3>Its condition</h3>${bars.length ? `<ul class="hold cond">${bars.join('')}</ul>` : ''}${lines.map((l) => `<p class="why${urgent ? ' urgent' : ''}">${esc(l)}</p>`).join('')}${!lines.length ? '<p class="why ok">Sound, and nothing wrong.</p>' : ''}</section>`;
}

/** Its recent messages, newest first: a click opens the Messages panel on it. */
function messagesBlock(s: SimState, b: Building): string {
  const ms = messagesAt(s, { building: b.id }).slice(0, 5);
  if (!ms.length) return '';
  return `<section class="bmsgs"><h3>Its messages</h3><ul>${ms
    .map((m) => `<li><button class="u${m.u}${m.read ? '' : ' unread'}" data-act="msg" data-id="${m.id}" title="${esc(m.words)}"><span class="mic">${messageIcon(m.kind)}</span><span class="day">${dayOf(m.tick)}</span><span class="t">${esc(titleOf(m))}</span></button></li>`)
    .join('')}</ul></section>`;
}

/** Pause and Workers first: two switches. */
function ordersBlock(b: Building, entry: PanelEntry | undefined): string {
  if (b.kind === 'home' || jobsAt(b) === 0 || entry?.noOrders) return '';
  const pauseTip = b.paused ? 'Set it going again: workers come back at once' : isStore(b.kind) ? 'Stop it: its workers go to other work, and it takes in and gives out nothing' : `Stop it: its workers go to other work, and it works at nothing${MAKERS[b.kind] ? ' and takes nothing in (what it has made still goes out by cart)' : ''}`;
  const firstTip = b.first ? 'Share its workers out as for any other workplace' : 'Fill it with workers before any other workplace';
  return `<div class="orders k-orders"><h4>Orders</h4>${ktoggle({ on: !!b.paused, act: 'pause', html: `<span class="k-oi">${actionIcon('pause')}</span>${b.paused ? 'Paused' : 'Pause'}`, tip: pauseTip, cls: 'tog' })}${ktoggle({ on: !!b.first, act: 'first', html: `<span class="k-oi">${actionIcon('first')}</span>Workers first`, tip: firstTip, cls: 'tog' })}</div>`;
}

const MODE_SHORT = ['Accept', 'Don’t', 'Get', 'Empty'];
/** Slice 50: each mode's drawing. */
const MODE_ICONS = ['accept', 'refuse', 'get', 'empty'] as const;
/** The key to them, over the rows. */
const MODE_KEY = `<div class="k-modekey">${MODE_SHORT.map((w, m) => `<span>${actionIcon(MODE_ICONS[m])}${w}</span>`).join('')}</div>`;
const MODE_TIPS = [
  'Accept it: carts bring it here, up to the limit',
  'Don’t accept it: carts take theirs to other stores (what it has stays, for porters to fetch)',
  'Get it: its carts fetch it from other stores, up to the limit',
  'Empty it: its carts take it out to other stores, and porters fetch it from here first',
];

/** A store's row for each ware it has room for, with its rule. */
function storeBlock(s: SimState, g: Building): string {
  if (!isStore(g.kind)) return '';
  const rows: string[] = [];
  let refusing = 0;
  let all = 0;
  for (const w of WARES) {
    const room = roomOf(g.kind, w);
    if (room <= 0) continue;
    all++;
    const mode = modeOf(g, w);
    const cut = cutOf(g, w);
    // (Slice 51: a ware set to Empty counts as already refusing: Accept nothing leaves it emptying, so it changes nothing.)
    if (mode === REFUSE || mode === EMPTY) refusing++;
    const n = held(g, w);
    const limit = Math.floor((room * (4 - cut)) / 4);
    let out = 0;
    let bring = 0;
    for (const c of s.walkers) {
      if ((c.kind !== 'cart' && c.kind !== 'sledge') || c.back || c.food !== w) continue;
      const from = c.origin === g.id;
      const to = c.target === g.id;
      if (!from && !to) continue;
      const other = findBuilding(s, from ? c.target : c.origin);
      if (!other || !isStore(other.kind)) continue;
      if (from) out++;
      else bring++;
    }
    const carts = (k: number): string => (k === 1 ? 'a cart' : `${k} carts`);
    let note = '';
    // (Review of slice 48: its carts go only while somebody works here; a limit reached says so.)
    const staffed = rateOf(g) > 0;
    if (g.paused) note = '';
    else if (mode === EMPTY) {
      const somewhere = s.buildings.some((o) => o !== g && isStore(o.kind) && roomFor(o, w) > 0);
      note = n <= 0 ? 'Empty: none left here; it takes no more' : out ? `Emptying: ${carts(out)} taking it out to other stores` : !staffed ? 'Emptying, but nobody works here to load a cart' : somewhere ? 'Emptying: its next cart goes out soon' : 'Emptying, but no other store will take it';
    } else if (mode === GET) {
      const some = s.buildings.some((o) => o !== g && isStore(o.kind) && held(o, w) > 0 && modeOf(o, w) !== GET && !o.paused && rateOf(o) > 0);
      note = bring ? `Getting it: ${carts(bring)} bringing it from other stores` : n >= limit ? `Getting it: full to its limit` : !staffed ? 'Getting it, but nobody works here to send for it' : some ? 'Getting it: the next cart comes soon' : 'Getting it, but no other store has any to send';
    } else if (mode === REFUSE) note = n > 0 ? `Doesn’t accept more: it keeps the ${fmt(n)} it has, for porters to fetch` : '';
    else if (cut) note = n >= limit ? `Full to its limit, ${['', 'three quarters', 'half', 'a quarter'][cut]} of its room (${fmt(limit)}): carts take more elsewhere` : `Accepts it up to ${['', 'three quarters', 'half', 'a quarter'][cut]} of its room (${fmt(limit)})`;
    const modes = [ACCEPT, REFUSE, GET, EMPTY]
      .map((m) => `<button class="mode m${m}${mode === m ? ' on' : ''}" data-act="mode" data-ware="${w}" data-mode="${m}" aria-pressed="${mode === m}" aria-label="${MODE_SHORT[m]}" title="${esc(MODE_TIPS[m])}">${actionIcon(MODE_ICONS[m])}</button>`)
      .join('');
    const off = mode === REFUSE || mode === EMPTY;
    const lim = kstep({
      value: LIMIT_NAMES[cut],
      less: { act: 'limit', ware: w, dir: 1 },
      more: { act: 'limit', ware: w, dir: -1 },
      lessWhy: cut >= 3 ? 'A quarter of its room at the least' : off ? 'It takes none in' : undefined,
      moreWhy: cut <= 0 ? 'All of its room already' : off ? 'It takes none in' : undefined,
      tip: 'How full it fills: all of its room, three quarters, half or a quarter',
      name: 'room',
      small: true,
    });
    const top = `${fmt(n)}<small>/${fmt(room)}</small>`;
    rows.push(
      `<div class="ware m${mode}" data-ware="${w}"><div class="wtop">${wareIcon(w)}<b>${cap(WARE_NAMES[w])}</b>${kbar({ value: n, max: room, tone: mode === EMPTY ? 'danger' : mode === GET ? 'good' : mode === REFUSE ? 'stone' : 'stock', tick: cut && !off ? (4 - cut) / 4 : undefined, html: top, cls: 'tall', tip: `${fmt(n)} of ${fmt(room)} ${unitWords(w, room)}${cut && !off ? `; it fills to ${['', 'three quarters', 'half', 'a quarter'][cut]} of its room (${fmt(limit)}), the mark` : ''}` })}<span class="modes" role="group" aria-label="${cap(WARE_NAMES[w])}">${modes}</span>${lim}</div>${note ? `<p class="wnote">${esc(note)}</p>` : ''}</div>`,
    );
  }
  const head = g.paused ? '<p class="note paused">Paused: it takes nothing in and gives nothing out until it is set going again.</p>' : '';
  return `<section class="stores k-stores"><h3>Its stores</h3><div class="storeacts">${kbtn({ act: 'all', data: { all: 'none' }, icon: 'refuse', html: 'Accept nothing', small: true, tip: 'Every ware: don’t accept (but what it is emptying)', why: refusing === all ? 'It accepts nothing already' : undefined })}${kbtn({ act: 'all', data: { all: 'all' }, icon: 'accept', html: 'Accept all', small: true, tip: 'Every ware: accept, all of its room' })}</div>${MODE_KEY}${head}${rows.join('')}</section>`;
}

/** The whole panel's HTML. */
export function buildingHtml(s: SimState, map: CoastMap, b: Building): string {
  const entry = PANELS[b.kind];
  const st = homeStatus(s, map, b);
  const [, ...sub] = st.title.split(' · ');
  const hz = hazardLines(s, map, b);
  const md = b.kind === 'home' ? [] : misdeedLines(s, map, b);
  const staff = workersLine(s, map, b).split('\n');
  const skip = new Set<string>([...hz, ...md, ...staff]);
  const kicker = whereWords(map, b);
  const own = entry?.own ? `<p class="own">${kbtn({ act: 'own', icon: 'go', html: `${esc(entry.own)} ›` })}</p>` : '';
  const head = khead({ title: nameOf(b), kicker, sub: sub.length ? cap(sub.join(' · ')) : undefined, pic: buildingIcon(b.kind), cls: 'bhead' });
  // (A store's rows say what it holds and has room for: its rooms' line goes.)
  const store = isStore(b.kind);
  const detail = st.detail.split('\n').filter((l) => !(store && /^Holds .* each in its own (room|store)$/.test(l)) && !entry?.quiet?.test(l));
  // (Slice 56.)
  const blessed = blessingWords(s, b);
  return [
    head,
    blessed ? `<p class="k-blessed">${esc(blessed)}</p>` : '',
    own,
    staffBlock(s, map, b, entry),
    // (A store's rows first: what it holds, and what it does with each ware.)
    store ? storeBlock(s, b) : '',
    doingBlock(detail, skip),
    holdsBlock(b),
    entry?.more?.(s, map, b) ?? '',
    walkersBlock(s, b),
    conditionBlock(s, map, b, hz, md),
    messagesBlock(s, b),
  ].join('');
}

// ---------------------------------------------------------------------------- the panel

export interface BuildingPanelDeps {
  /** Send a command (enqueued and applied at once). */
  send: (c: Command) => void;
  /** Follow a walker from a building. */
  follow: (origin: number, kind: Walker['kind'], walker: number) => void;
  /** Open the Messages panel on a message. */
  openMessage: (id: number) => void;
  /** Open a building's own panel elsewhere. */
  openOwn: (b: Building) => void;
}

/** How often (seconds) the open panel is brought up to date. */
const REFRESH = 0.3;

export class BuildingPanel {
  private readonly el: HTMLElement;
  private readonly body: HTMLElement;
  private shownId = 0;
  private html = '';
  private last = -Infinity;
  private s: SimState | null = null;
  /** Called when the panel opens (the other panels on the left make way). */
  onOpen: (() => void) | null = null;

  constructor(
    root: HTMLElement,
    private readonly deps: BuildingPanelDeps,
  ) {
    const el = document.createElement('div');
    el.className = 'household building kit';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.innerHTML = '<button class="close" data-tip="Close (Esc)" aria-label="Close">×</button><div class="body"></div>';
    root.appendChild(el);
    this.el = el;
    this.body = el.querySelector('.body') as HTMLElement;
    (el.querySelector('.close') as HTMLElement).addEventListener('click', () => this.show(0));
    el.addEventListener('click', (e) => this.click(e));
  }

  /** The building showing, or 0. */
  get id(): number {
    return this.shownId;
  }

  get open(): boolean {
    return this.shownId !== 0;
  }

  show(id: number): void {
    if (id !== this.shownId) {
      this.body.scrollTop = 0;
      this.html = '';
    }
    const opening = id !== 0 && this.shownId === 0;
    this.shownId = id;
    this.last = -Infinity;
    this.el.hidden = id === 0;
    if (opening) this.onOpen?.();
  }

  private click(e: Event): void {
    const t = (e.target as HTMLElement).closest('button[data-act]') as HTMLButtonElement | null;
    const s = this.s;
    if (!t || !s || t.disabled) return;
    const b = findBuilding(s, this.shownId);
    if (!b) return;
    const act = t.dataset.act;
    const ware = Number(t.dataset.ware);
    if (act === 'follow') this.deps.follow(b.id, t.dataset.kind as Walker['kind'], Number(t.dataset.walker) || 0);
    else if (act === 'msg') this.deps.openMessage(Number(t.dataset.id));
    else if (act === 'own') this.deps.openOwn(b);
    else if (act === 'pause') this.deps.send({ type: 'work', id: b.id, paused: !b.paused });
    else if (act === 'first') this.deps.send({ type: 'work', id: b.id, first: !b.first });
    else if (act === 'mode') this.deps.send({ type: 'store', id: b.id, ware, mode: Number(t.dataset.mode) });
    else if (act === 'limit') this.deps.send({ type: 'store', id: b.id, ware, limit: Math.max(0, Math.min(3, cutOf(b, ware) + Number(t.dataset.dir))) });
    else if (act === 'all') this.deps.send({ type: 'store', id: b.id, all: t.dataset.all === 'none' ? 'none' : 'all' });
    // (Merge of slice 45: the court's law, a punishment for a kind of crime.)
    else if (act === 'law') this.deps.send({ type: 'law', crime: t.dataset.row ?? '', punishment: t.dataset.p ?? '' });
    // (Slice 49: the quarantine, ordered or lifted from the infirmary's or the asklepieion's panel.)
    else if (act === 'quarantine') this.deps.send({ type: 'quarantine', on: t.dataset.on === '1' });
    // (Slice 53: a building's own sections' buttons, the shrine's.)
    else if (act && PANELS[b.kind]?.act) {
      const c = PANELS[b.kind]!.act!(act, t, b);
      if (c === null) return;
      if (c !== 'redraw') this.deps.send(c);
    }
    // Slice 59: a hero's order from their hall's panel (send against a monster, ride, sail).
    else if (act === 'hero' && b.hero) this.deps.send({ type: 'hero', hero: (t.dataset.hero as HeroId) || b.hero, act: t.dataset.do as 'slay' | 'ride' | 'sail', monster: Number(t.dataset.monster) || undefined, on: t.dataset.on === '1' });
    else return;
    // (Drawn again at once, the order showing.)
    this.last = -Infinity;
  }

  /** Refresh while open; closes itself if the building has gone. Returns the building showing, if any. */
  update(s: SimState, map: CoastMap, time: number): Building | null {
    this.s = s;
    if (!this.shownId) return null;
    const b = findBuilding(s, this.shownId);
    if (!b) {
      this.show(0);
      return null;
    }
    if (time - this.last < REFRESH) return b;
    this.last = time;
    const html = kitHtml(buildingHtml(s, map, b));
    if (html !== this.html) {
      this.html = html;
      morph(this.body, html);
    }
    return b;
  }

  /** The panel's text (for the smoke test). */
  get text(): string {
    return this.el.hidden ? '' : (this.body.innerText ?? '');
  }
}
