/**
 * What a monument's site, a masons' yard, a builder, an ox cart of materials
 * and a group of the games' visitors say when hovered or clicked, and the
 * monuments' line under the top bar (slice 35). Pure reads of the state.
 *
 * A site always says where it stands and why: the stage it is on, what it
 * waits for ("The tower: 40 of 400 marble on site, 50 on the way; 6 builders
 * of 8"), and for whatever is short, what would bring it.
 */
import type { CoastMap } from '../map/bake';
import { findBuilding } from './buildings';
import { dateOfTick, TICKS_PER_DAY, TICKS_PER_MONTH } from './clock';
import { COPPER, held, MARBLE, TIMBER, WARE_NAMES, type Ware } from './foods';
import { spanWords } from './materialstatus';
import {
  LIT_EVERY,
  LIT_PACE,
  monumentName,
  monumentOf,
  needOf,
  progressOf,
  siteOf,
  STAGE_COUNT,
  stageNow,
  workOf,
  COLOSSUS_MOOD,
  type MonumentKind,
  type Site,
  // Slice 54: sites that are sanctuaries.
  siteMaterials,
  siteName,
  stagesOf,
} from './monuments';
// Slice 54.
import { isStore, roomOf } from './stores';
import { buildersAt, buildersFor, buildersTo, cartsTo, comingTo, gamesSoon, gathering, isBronze, MAX_BUILDERS, siteBuilding, smithsAt, VISITOR_PAYS } from './monumentworks';
import { roadsBeside } from './rounds';
import type { Building, SimState, Walker } from './state';
import { SAIL_IN, SAIL_OUT, SHIP_EVERY } from './trade';

export interface Status {
  title: string;
  detail: string;
}

const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const lines = (...ls: string[]): string => ls.filter((l) => l).join('\n');
const pct = (f: number): string => `${Math.floor(f * 100)}%`;
/** "3 June". */
const dayOf = (tick: number): string => {
  const d = dateOfTick(tick);
  return `${d.day} ${d.monthName}`;
};

/** What a material is called on a site: the copper the armourers cast into bronze is named as copper, so it plainly is the copper from the mines and stores (review of slice 35). */
export const materialName = (w: Ware): string => (w === COPPER ? 'copper for the bronze' : w === MARBLE ? 'marble' : w === TIMBER ? 'timber' : (WARE_NAMES[w] ?? 'goods'));
/** What would bring a material the stores have none of. */
const BRINGS: Record<number, string> = {
  [MARBLE]: 'a marble quarry on the headland cuts it, or buy it from Greece on the Trade tab',
  [TIMBER]: 'a loggers’ camp at a wood’s edge fells it, or buy it from Greece on the Trade tab',
  [COPPER]: 'a copper mine digs it, or buy it from Greece on the Trade tab',
};

/** "the tower", lower-cased, for the middle of a sentence. */
const low = (name: string): string => name.charAt(0).toLowerCase() + name.slice(1);

/** Slice 54: the store an ox cart fetches a ware from: the storehouse (the monuments' materials, and most goods), or for a food the granary. */
const storeFor = (w: Ware): 'storehouse' | 'granary' => (roomOf('storehouse', w) > 0 || roomOf('granary', w) <= 0 ? 'storehouse' : 'granary');
/** Slice 54: does any store hold some of a ware (the monuments' materials: a storehouse)? */
const anyStored = (s: SimState, w: Ware): boolean => s.buildings.some((g) => isStore(g.kind) && roomOf(g.kind, w) > 0 && held(g, w) > 0);

/** One material's line for the stage a site gathers for: "40 of 400 marble on site, 50 on the way". */
function materialLine(s: SimState, x: Site, b: Building, w: Ware, need: number): string {
  const here = Math.min(need, held(b, w));
  const coming = comingTo(s, x.id, w);
  const name = materialName(w);
  let why = '';
  if (here + coming < need) {
    // (Slice 54: a sanctuary's sacred food is hauled from the granaries.)
    const store = storeFor(w);
    const stored = s.buildings.reduce((a, g) => a + (g.kind === store ? held(g, w) : 0), 0);
    if (stored > 0) why = ` · ${fmt(stored)} in the ${store}s, the next ox cart sets out soon`;
    else if (!s.buildings.some((g) => g.kind === store)) why = ` · build a ${store}: the ox carts haul from the ${store}s`;
    else why = ` · no ${store} has any: ${BRINGS[w] ?? 'your makers make it, or buy it from Greece on the Trade tab'}`;
  }
  return `${fmt(here)} of ${fmt(need)} ${name} on site${coming ? `, ${fmt(coming)} on the way` : ''}${why}`;
}

/** What a site waits for to start the stage it gathers for, a line each ('' for what it has). */
function waitsFor(s: SimState, x: Site, b: Building, stage: number): string[] {
  const st = stagesOf(x)[stage];
  if (!st) return [];
  return siteMaterials(x)
    .filter((w) => needOf(st, w) > 0)
    .map((w) => materialLine(s, x, b, w, needOf(st, w)));
}

/** The builders line for a stage under way: "6 builders of 8 at work", and why not more. */
function buildersLine(s: SimState, x: Site): string {
  const st = stageNow(x)!;
  const here = buildersAt(s, x.id);
  const coming = buildersTo(s, x.id).length - here;
  const yards = s.buildings.filter((y) => y.kind === 'masons');
  const out = `${here} ${here === 1 ? 'builder' : 'builders'} of ${st.builders} at work${coming > 0 ? `, ${coming} on the way` : ''}`;
  if (here + coming >= st.builders) return out;
  if (yards.length === 0) return `${out} · no masons’ yard: build one (each sends up to ${MAX_BUILDERS} builders, one for each two of its workers)`;
  const can = yards.reduce((a, y) => a + buildersFor(y), 0);
  if (can === 0) return `${out} · nobody works at the masons’ yards, so no builders come`;
  if (can < st.builders) return `${out} · your masons’ yards send ${can} at most: another yard would send more (it goes as fast as the builders there)`;
  return `${out} · more are coming from the masons’ yards`;
}

/** How long a stage under way has left at the pace it goes now. */
function leftLine(s: SimState, x: Site): string {
  const st = stageNow(x)!;
  const pace = Math.min(buildersAt(s, x.id), st.builders) * (isBronze(x) && !smithsAt(s) ? 0 : 1);
  const left = workOf(st) - x.work;
  if (pace <= 0) return isBronze(x) && !smithsAt(s) ? 'The bronze waits for the armourers: an armoury with workers casts it on site' : 'No work goes on until builders come';
  return `About ${spanWords(left / pace)} of work left at this pace${pace < st.builders ? ` (${spanWords(left / st.builders)} with all ${st.builders} builders)` : ''}`;
}

/** What a finished monument of a kind does, the same whether or not one stands (the tools and the tab say it before one is built). */
export function doesLine(kind: MonumentKind): string {
  if (kind === 'lighthouse') return `the Tyrian ship takes ${Math.round((SAIL_IN * LIT_PACE) / TICKS_PER_DAY)} days to sail in, not ${SAIL_IN / TICKS_PER_DAY}, and ${Math.round((SAIL_OUT * LIT_PACE) / TICKS_PER_DAY)} to sail out, not ${SAIL_OUT / TICKS_PER_DAY}, and calls every ${LIT_EVERY / TICKS_PER_MONTH} months, not ${SHIP_EVERY / TICKS_PER_MONTH} · pirates keep clear of your waters`;
  if (kind === 'colossus') return `every ruler in Greece speaks of it: +${COLOSSUS_MOOD} to each one’s mood, for good`;
  return 'games every four years, a month long: visitors walk in from the edge of the map and pay for their seats, and every home is in a festival mood';
}

/** What a finished monument does, in a line. */
export function effectLine(s: SimState, kind: MonumentKind): string {
  if (kind === 'lighthouse') return `Its fire burns: ${doesLine(kind)}`;
  if (kind === 'colossus') return `Every ruler in Greece speaks of it: +${COLOSSUS_MOOD} to each one’s mood, for good`;
  const g = s.monuments.games;
  if (g.until > s.tick) return `The games are on: ${fmt(g.visitors)} visitors so far, paying ${fmt(g.takings)} dr for their seats (${VISITOR_PAYS} dr a head) · they end in ${spanWords(g.until - s.tick)}`;
  const next = g.next > s.tick ? `The next games open on ${dayOf(g.next)}, in ${spanWords(g.next - s.tick)}${gamesSoon(s) ? ': the first visitors are on the roads in' : ''}` : '';
  const last = g.held > 0 ? `the last brought ${fmt(g.visitors)} visitors and ${fmt(g.takings)} dr` : '';
  return [next || 'Games every four years, a month long', last].filter((t) => t).join(' · ');
}

/** A monument's site or a finished monument, hovered or clicked. */
export function siteStatus(s: SimState, map: CoastMap, b: Building): Status {
  const kind = b.kind as MonumentKind;
  const x = siteOf(s, b.id);
  // (Slice 54: a sanctuary's site says whose it is; finished, it says what it does.)
  const Name = x ? siteName(x, true) : b.kind === 'sanctuary' ? 'A sanctuary' : monumentName(kind, true);
  if (!x) return { title: Name, detail: 'Marked out' };
  if (x.finished) {
    return { title: `${Name} · finished`, detail: lines(effectLine(s, kind), `Finished on ${dayOf(x.finished)}, ${spanWords(x.finished - x.marked)} after it was marked out`) };
  }
  const st = stageNow(x)!;
  const title = `${Name} · ${pct(progressOf(x))} built`;
  const stageWord = `${st.name} (stage ${x.stage + 1} of ${STAGE_COUNT}: ${st.what})`;
  if (roadsBeside(s, map.size, b).length === 0) return { title, detail: lines(`${stageWord} waits for a road beside the site, for the ox carts and the builders`, ...waitsFor(s, x, b, x.stage)) };
  if (x.building) {
    const next = stagesOf(x)[gathering(x)];
    return {
      title,
      detail: lines(
        `${stageWord} · ${pct(x.work / workOf(st))} done`,
        buildersLine(s, x),
        leftLine(s, x),
        next ? `For ${low(next.name)} next: ${waitsFor(s, x, b, gathering(x)).join('; ')}` : 'The last stage: when it is done, the whole is finished',
      ),
    };
  }
  const bronze = isBronze(x) && !smithsAt(s) ? 'And for the armourers: an armoury with workers casts the bronze on site' : '';
  const begun = x.done.length ? `${low(stagesOf(x)[x.stage - 1].name)} finished on ${dayOf(x.done[x.done.length - 1])}` : `marked out on ${dayOf(x.marked)}`;
  return { title, detail: lines(`${stageWord} waits for its materials, all on site before it starts:`, ...waitsFor(s, x, b, x.stage), bronze, `Then it needs ${st.builders} builders for about ${spanWords(st.days * TICKS_PER_DAY)} · ${begun}`) };
}

/** Slice 54: what the site on a building is called ("the Lighthouse", "the sanctuary to Demeter"). */
const nameAt = (s: SimState, g: Building): string => {
  const x = siteOf(s, g.id);
  return x ? siteName(x) : monumentName(g.kind as MonumentKind);
};

/** A masons' yard: its builders, and where they are. */
export function masonsStatus(s: SimState, b: Building, workers: string): Status {
  const mine = s.walkers.filter((w) => w.kind === 'builder' && w.origin === b.id && !w.back);
  const most = buildersFor(b);
  const title = `A masons’ yard · ${mine.length} of ${most} builders out`;
  const sites = s.monuments.sites.filter((x) => !x.finished);
  let doing: string;
  if (most === 0) doing = b.paused ? 'No builders go out while it is paused' : 'No builders go out with nobody working here'; // (Slice 51: the pause named.)
  else if (mine.length) {
    const at = [...new Set(mine.map((w) => w.target))].map((id) => findBuilding(s, id)).filter((g): g is Building => !!g);
    doing = `Its builders are at ${at.map((g) => nameAt(s, g)).join(' and ')}`;
  } else if (sites.length === 0) doing = 'No monument is being built: mark one out on the Monuments tab, and its builders will go to it';
  else if (!sites.some((x) => x.building)) doing = 'The builders wait in the yard: no stage is under way yet (each waits for its materials on site)';
  else doing = 'Its builders set out for the site soon';
  return { title, detail: lines(workers, doing, `Up to ${MAX_BUILDERS} builders, one for each two of its workers · they walk to the nearest monument being built and work there until its stage is done`) };
}

/** A builder, an ox cart of materials or a group of visitors, hovered. Null for anyone else. */
export function monumentWalkerStatus(s: SimState, w: Walker): Status | null {
  if (w.kind === 'builder') {
    const site = findBuilding(s, w.target);
    const name = site ? nameAt(s, site) : 'the site';
    const x = site ? siteOf(s, site.id) : undefined;
    const stage = x ? stageNow(x) : undefined;
    if (w.back) return { title: 'Builder', detail: 'Walking home to the masons’ yard' };
    if (w.steps === 1) return { title: 'Builder', detail: `At work on ${stage ? low(stage.name) : name} of ${name}, with mallet and chisel` };
    return { title: 'Builder', detail: `On his way to ${name} from the masons’ yard` };
  }
  if (w.kind === 'oxcart') {
    const name = materialName(w.food as Ware);
    const site = findBuilding(s, w.target);
    const to = site ? nameAt(s, site) : 'the site';
    if (w.back) return { title: 'Ox cart', detail: w.load > 0 ? `Taking its ${name} back to the storehouse: the site is gone` : 'Heading back to the storehouse empty' };
    if (w.wait > 0) return { title: 'Ox cart', detail: `Unloading ${fmt(w.load)} ${name} at ${to}` };
    return { title: 'Ox cart', detail: `Hauling ${fmt(w.load)} ${name} from the storehouse to ${to} (slow: about a tile of road a day)` };
  }
  if (w.kind === 'visitor') {
    const n = w.people;
    const who = `${n} visitors`;
    if (w.back) return { title: 'Visitors to the games', detail: `${who} on their way home from the games` };
    if (w.steps === 1) return { title: 'Visitors to the games', detail: gamesSoon(s) ? `${who} in their seats, early for the opening` : `${who} watching the games · they paid ${fmt(n * VISITOR_PAYS)} dr for their seats` };
    return { title: 'Visitors to the games', detail: `${who} hurrying in from the edge of the map for the games at your Stadium · ${VISITOR_PAYS} dr a head for their seats` };
  }
  return null;
}

/** How long a just-finished stage or monument stays in the line under the top bar. */
const NEWS_DAYS = 10;

/**
 * The monuments' line under the top bar: the games on or coming, a monument
 * or a stage just finished, or a site stuck (waiting a month for a material no
 * storehouse has, or a stage ready with no builder to come). Null when there
 * is nothing to say. `at` is the building it is about.
 */
export function monumentTownLine(s: SimState): { text: string; at: number } | null {
  const sites = s.monuments.sites;
  if (sites.length === 0) return null;
  const stadium = monumentOf(s, 'stadium');
  const g = s.monuments.games;
  if (stadium?.finished && g.until > s.tick) return { text: `The games are on at the Stadium: ${fmt(g.visitors)} visitors so far have paid ${fmt(g.takings)} dr for their seats, and every home is in a festival mood.`, at: stadium.id };
  if (stadium?.finished && gamesSoon(s)) return { text: `The games at the Stadium open in ${spanWords(g.next - s.tick)}: visitors are on the roads in, and athletes from cities friendly to you${s.empire.vassals.length || s.empire.allies.length ? ` and from your ${s.empire.vassals.length && s.empire.allies.length ? 'vassals and allies' : s.empire.vassals.length ? 'vassals' : 'allies'}` : ''} will come.`, at: stadium.id };
  for (const x of sites) {
    // (Slice 54: a sanctuary's stages and its finish are its own news: sanctuaries.ts.)
    if (x.kind === 'sanctuary') continue;
    if (x.finished && s.tick - x.finished < NEWS_DAYS * TICKS_PER_DAY) return { text: `${monumentName(x.kind, true)} is finished. ${effectLine(s, x.kind)}.`, at: x.id };
    const last = x.done[x.done.length - 1];
    if (!x.finished && last !== undefined && s.tick - last < NEWS_DAYS * TICKS_PER_DAY) {
      const next = stageNow(x)!;
      return { text: `${monumentName(x.kind, true)}: ${low(stagesOf(x)[x.stage - 1].name)} ${/s$/.test(stagesOf(x)[x.stage - 1].name) ? 'are' : 'is'} finished · ${x.building ? `${low(next.name)} is under way` : `${low(next.name)} waits for its materials`}.`, at: x.id };
    }
  }
  for (const x of sites) {
    if (x.finished) continue;
    const b = siteBuilding(s, x);
    if (!b) continue;
    const since = x.done.length ? x.done[x.done.length - 1] : x.marked;
    if (s.tick - since < 30 * TICKS_PER_DAY) continue;
    if (!x.building) {
      const st = stageNow(x)!;
      const mats = siteMaterials(x);
      const short = mats.filter((w) => needOf(st, w) > held(b, w) + comingTo(s, x.id, w) && !anyStored(s, w));
      // (Slice 54: "no granary has any" when a sanctuary's sacred food is what is short.)
      const none = short.some((w) => storeFor(w) === 'storehouse') ? 'no storehouse' : 'no granary';
      if (short.length) return { text: `${siteName(x, true)} waits for ${short.map((w) => `${fmt(needOf(st, w) - held(b, w) - comingTo(s, x.id, w))} ${materialName(w)}`).join(' and ')} before ${low(st.name)} can start, and ${none} has any.`, at: x.id };
      if (isBronze(x) && !smithsAt(s) && mats.every((w) => held(b, w) >= needOf(st, w))) return { text: `${siteName(x, true)}: the bronze is on site, and waits for the armourers. An armoury with workers casts it.`, at: x.id };
    } else if (buildersTo(s, x.id).length === 0 && !s.buildings.some((y) => y.kind === 'masons' && buildersFor(y) > 0)) {
      return { text: `${siteName(x, true)}: ${low(stageNow(x)!.name)} is ready to build, but no masons’ yard sends builders.`, at: x.id };
    }
  }
  return null;
}

/** The days a stage under way still needs at its full complement of builders (for the panel's timeline). */
export const daysLeft = (x: Site): number => {
  const st = stageNow(x);
  return st && x.building ? Math.ceil((workOf(st) - x.work) / st.builders / TICKS_PER_DAY) : 0;
};

/** The carts on the road to a site, for the panel. */
export const cartsOn = (s: SimState, x: Site): number => cartsTo(s, x.id).length;
