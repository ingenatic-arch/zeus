/**
 * What the marble quarry, the loggers' camp, a quarryman and a logger say
 * when hovered or clicked (slice 32). Pure reads of the state.
 */
import type { CoastMap } from '../map/bake';
import { coastMap, TreeKind } from '../map/bake';
import { BUILDING_NAMES, findBuilding } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from './clock';
import { errandsOut } from './food';
import { held, MARBLE, TIMBER, type Ware } from './foods';
import { rateOf } from './labour';
import {
  blocksPerMonth,
  CAMP_REACH,
  campOutlook,
  CUT,
  LOGS_PER_TREE,
  loggerDoing,
  loggersFor,
  loggersOut,
  marbleOf,
  marblePlace,
  MAX_QUARRYMEN,
  quarrymenAt,
  quarrymenFor,
  REGROW,
} from './materials';
import { roadsBeside } from './rounds';
import { roomFor, storeOf } from './stores';
import type { Building, SimState, Walker } from './state';

export interface Status {
  title: string;
  detail: string;
}

const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const lines = (...ls: string[]): string => ls.filter((l) => l).join('\n');
const roundTen = (v: number): number => (v >= 100 ? Math.round(v / 10) * 10 : Math.round(v));

/** "about 3 months", "about 2 years", "a few days". */
export function spanWords(ticks: number): string {
  if (!Number.isFinite(ticks)) return 'never';
  const months = ticks / TICKS_PER_MONTH;
  if (months < 1) {
    const d = Math.max(1, Math.round(ticks / TICKS_PER_DAY));
    return d === 1 ? 'a day' : `${d} days`;
  }
  if (months < 18) {
    const m = Math.round(months);
    return m === 1 ? 'a month' : `${m} months`;
  }
  const y = Math.round(months / 6) / 2;
  return `${y} years`;
}

/** Where a maker's carts (or sledges) take what it makes, or why they can't ('' when there is nothing to say). */
function cartLine(s: SimState, b: Building, w: Ware, what: string, carts: string): string {
  const n = errandsOut(s, b);
  if (n) return `${n === 1 ? `A ${carts.replace(/s$/, '')} is` : `${n} ${carts} are`} taking its ${what} to a storehouse`;
  if (held(b, w) <= 0) return '';
  if (!s.buildings.some((g) => g.kind === 'storehouse')) return `Build a storehouse for its ${carts} to take the ${what} to`;
  if (!s.buildings.some((g) => g.kind === 'storehouse' && roomFor(g, w) > 0)) return `Every storehouse is full of ${what}: its ${carts} wait for room`;
  return '';
}

/** What the stores' marble or timber is for, for now. */
const FOR_NOW = 'Kept in a storehouse and sold to Greece if you tick it on the Trade tab · the great works to come will want it';

/** A marble quarry: the marble in its rock, its quarrymen, what it cuts, where the blocks go. */
export function quarryStatus(s: SimState, map: CoastMap, b: Building, workers: string): Status {
  const blocks = held(b, MARBLE);
  const store = storeOf('quarry');
  const rich = marbleOf(map, b.x, b.z, 3);
  const title = `${BUILDING_NAMES.quarry} · ${fmt(blocks)} of ${fmt(store)} blocks of marble`;
  if (roadsBeside(s, map.size, b).length === 0) return { title, detail: 'Needs a road beside it, for its quarrymen and its sledges' };
  const men = quarrymenAt(s, b).length;
  const rate = rateOf(b);
  let cutting: string;
  if (blocks >= store) cutting = 'The stack is full: the quarrymen wait for the sledges to take blocks away';
  else if (rate === 0) cutting = 'No marble is cut with nobody working here';
  else {
    const m = blocksPerMonth(rich, quarrymenFor(b));
    const full = blocksPerMonth(rich, MAX_QUARRYMEN);
    cutting = `${men === 1 ? 'One quarryman is' : `${men} quarrymen are`} cutting at the face (one for each quarter of its workers) · about ${fmt(roundTen(m))} blocks a month${men < MAX_QUARRYMEN ? ` (${fmt(roundTen(full))} fully worked)` : ''}`;
  }
  const rock = `Marble in the rock ${Math.round(rich * 100)}% · the pale stone ${marblePlace(b.x + 1.5, b.z + 1.5)} · a block takes a quarryman about ${spanWords((CUT / Math.max(0.01, rich)) * 1)} of work${rich < 1 ? ', longer on poorer rock' : ''}`;
  return { title, detail: lines(workers, cutting, rock, cartLine(s, b, MARBLE, 'marble', 'sledges'), FOR_NOW) };
}

/** A loggers' camp: its loggers, the wood in its reach (standing, felled, growing back), its store. */
export function campStatus(s: SimState, map: CoastMap, b: Building, workers: string): Status {
  const logs = held(b, TIMBER);
  const store = storeOf('loggers');
  const title = `${BUILDING_NAMES.loggers} · ${fmt(logs)} of ${fmt(store)} logs`;
  if (roadsBeside(s, map.size, b).length === 0) return { title, detail: 'Needs a road beside it, for its carts' };
  const men = loggersFor(b);
  const o = campOutlook(map, s, b, men);
  const out = loggersOut(s, b);
  let felling: string;
  if (men === 0) felling = 'Nobody fells a tree with nobody working the camp';
  else if (out.length) {
    const doing = out.map((w) => LOGGER_WORDS[loggerDoing(w)]);
    felling = `${out.length === 1 ? 'A logger is' : `${out.length} loggers are`} out: ${[...new Set(doing)].join(', ')}`;
  } else if (logs + LOGS_PER_TREE > store) felling = 'The log pile is full: nobody goes out until carts take logs away';
  else felling = o.standing ? 'The loggers are resting · one sets out again soon' : 'Nobody goes out: every tree in reach is felled';
  const wood = `Trees in reach (${CAMP_REACH} tiles): ${o.standing === 1 ? '1 pine or cypress standing' : `${fmt(o.standing)} pines and cypresses standing`}${o.felled ? ` · ${fmt(o.felled)} felled and growing back, the first standing again in ${spanWords(o.firstBack)}` : ''}`;
  let pace = '';
  if (men > 0 && o.standing > 0) {
    pace = `About ${fmt(roundTen(o.logsMonth))} logs a month (${LOGS_PER_TREE} a tree)`;
    pace += o.lasts < 120 ? ` · at this pace the wood in reach is gone in about ${spanWords(o.lasts * TICKS_PER_MONTH)}` : '';
    pace += o.backMonth > 0 ? `, and it grows back by about ${o.backMonth < 1 ? `${fmt(o.backMonth * 12)} trees a year` : `${fmt(o.backMonth)} trees a month`}` : `; a felled tree takes ${spanWords(REGROW)} to grow back`;
  } else if (men > 0) pace = o.felled ? `It waits for the wood to grow back: a felled tree takes ${spanWords(REGROW)}` : 'No wood in reach at all';
  return { title, detail: lines(workers, felling, wood, pace, 'The olive trees are Athena’s: the loggers leave them be', cartLine(s, b, TIMBER, 'timber', 'carts'), FOR_NOW) };
}

const LOGGER_WORDS: Record<ReturnType<typeof loggerDoing>, string> = {
  out: 'walking out to a tree',
  chopping: 'chopping at a tree',
  trimming: 'trimming a fallen tree',
  home: 'carrying logs home',
};

const treeWord = (i: number): string => (coastMap().trees[i]?.kind === TreeKind.Cypress ? 'cypress' : 'pine');

/** A quarryman or a logger, hovered: what he is doing. Null for anyone else. */
export function materialWalkerStatus(s: SimState, w: Walker): Status | null {
  if (w.kind === 'quarryman') {
    const q = findBuilding(s, w.origin);
    if (q && held(q, MARBLE) >= storeOf('quarry')) return { title: 'Quarryman', detail: 'Waiting by the face: the stack is full until the sledges take blocks away' };
    if (w.wait > 0) return { title: 'Quarryman', detail: 'Levering a cut block of marble onto the stack' };
    return { title: 'Quarryman', detail: `Cutting a block of marble at the face with pick and wedges: ${Math.min(99, Math.floor(w.meat / CUT))}% done · ${w.steps === 1 ? '1 block' : `${fmt(w.steps)} blocks`} cut since he came` };
  }
  if (w.kind === 'logger') {
    const doing = loggerDoing(w);
    const tree = w.food >= 0 ? treeWord(w.food) : 'tree';
    if (doing === 'home') return { title: 'Logger', detail: w.load > 0 ? `Carrying ${w.load} logs home to the camp` : 'Walking home to the camp' };
    if (doing === 'chopping') return { title: 'Logger', detail: `Chopping at a ${tree}: it falls in ${spanWords(w.wait)}` };
    if (doing === 'trimming') return { title: 'Logger', detail: `Trimming the ${tree} he felled into logs: done in ${spanWords(w.wait)}` };
    return { title: 'Logger', detail: `Walking out to a ${tree} at the edge of the wood, his axe on his shoulder` };
  }
  return null;
}
