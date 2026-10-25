/**
 * Crimes of every kind (slice 41): the five crimes beside theft, each from its
 * own kind of trouble (crime.ts, crimeFor, decides which a home turns to) and
 * each with its own walker, who walks to a door, waits and comes home the way
 * a thief does (crime.ts, moveThief). Nothing here moves while the new kinds'
 * switch (`crime.kinds`) is off.
 *
 * - **Pickpockets** (poor homes near a busy agora or theatre) work its crowd,
 *   sidling round its edge (mingle), then cut a few purses from the homes
 *   around it (cottages and better): each household's story says so and its
 *   mood dips for a month. A place worked isn't worked again within the month
 *   (its `robbedAt`).
 * - **Vandals** (angry, idle homes) smash a fountain's spout, a shrine's statue
 *   or a stall of the agora (`crime.broken`). The broken building sends nobody
 *   out (holdBroken holds its walkers' clocks) until the architect's inspector
 *   walks by and mends it, a small repair on the ledger (mendBroken, called
 *   from hazards.ts).
 * - **Arsonists** (the most aggrieved homes) come only after talk of burning in
 *   the quarter (`crime.talk`, TALK_DAYS): a watchman walking by, or the
 *   grievance easing, ends the talk. Then one sets the richest home or a store
 *   in reach alight, and fire's own rules run. One talk at a time, and seldom
 *   (ARSON_GAP, crime.ts).
 * - **Smugglers** (poor homes near the quay or the caravan yard) take a few jars
 *   or measures of what waits there most: the stock book's "Smuggled away".
 * - **Crooked tax collectors**: a collector handing in at an office whose wages
 *   are owed, with no watchman walking by it this month, keeps back a share:
 *   the ledger's "Skimmed" line (skimmed, called from taxes.ts).
 *
 * Caught (crime.ts decides it, in `caught`), a pickpocket's purses and a
 * smuggler's goods go back and the household pays a thief's fine; a vandal or
 * an arsonist caught on the way does no harm. Every chance is a hash of the
 * seed (hazards.ts, unit), never a draw from the state's generators.
 */
import type { CoastMap } from '../map/bake';
import { dhypot } from '../map/dmath';
// Slice 42: the land's size.
import { sizeOf } from '../map/lands';
import { centreOf, COTTAGE, findBuilding, livedIn } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from './clock';
import {
  aggrieved,
  crimeOfWalker,
  isCriminal,
  KIND_NAME,
  KIND_OUT,
  kindOut,
  lootWords,
  placeOf,
  pronouns,
  robbedLately,
  setOutAs,
  STOLEN_DAYS,
  tally,
  tellNews,
  temptationOf,
  TEMPT_FULL,
  TEMPT_HALF,
  thiefName,
  thiefWho,
  THIEF_FINE,
  watchedLately,
  whereOf,
  type Broken,
} from './crime';
import { tell } from './folk';
import { CHEESE, FLEECE, foodUntil, gi, held, MEAT, OIL, setFoodUntil, setHeld, WHEAT, WINE, type Food, type Ware } from './foods';
import { FIRE_BURNING, burnable, ignite, unit } from './hazards';
import { rateOf } from './labour';
import { nearestReached, roadSearch, type Search } from './roads';
import { roadsBeside } from './rounds';
import type { Building, BuildingKind, SimState, Walker } from './state';
import { note } from './stockbook';
import { depotRoom, TRADE_GOODS } from './trade';
import { income, pay } from './treasury';
import { centre, position, setPath } from './walk';

/** How far (steps by road) each criminal walks to his crime. */
export const PICK_REACH = 24;
export const VANDAL_REACH = 24;
export const ARSON_REACH = 32;
export const SMUGGLE_REACH = 24;
/** A pickpocket's victims: homes (cottages and better) within this many tiles of the place he works, at most PICK_VICTIMS of them. */
export const PICK_TILES = 12;
export const PICK_VICTIMS = 3;
/** How many roadside tiles round the place a pickpocket sidles along each way (there and back), and at least how far he goes, before he cuts purses. */
export const MINGLE_TILES = 8;
/** At most this many rounds of it, where the roadside is short. */
export const MINGLE_ROUNDS = 3;
/** The coin in a purse, by the victim's level (plot, tent, hut, cottage, townhouse, fine house, villa, estate, great estate). */
export const PICK_COIN = [0, 1, 1, 2, 3, 4, 6, 8, 10];
/** A household whose purse was cut minds it this long. */
export const PICKED_MOOD = TICKS_PER_MONTH;
/** What a smuggler carries off: this many measures (or jars, sets, horses) of what waits most. */
export const SMUGGLE_LOT = 8;
/** Talk of burning lasts this long before the arsonist goes out (if it doesn't die down first). */
export const TALK_DAYS = 20;
/** What mending costs, by what was smashed. */
export const REPAIR: Partial<Record<BuildingKind, number>> = { fountain: 12, shrine: 20, agora: 15 };
/** A crooked collector keeps back this share of his satchel. */
export const SKIM_SHARE = 0.25;
/** Days before a broken building no inspector has come to is patched up by its own workers. */
export const PATCH_DAYS = 30;

/**
 * An agora's goods stalls and their names, as goods.ts has them. (goods.ts
 * isn't imported here: it works a constant out from food.ts as it loads, and
 * entering the import graph at food.ts reaches it through crime.ts and this
 * module before food.ts is done.)
 */
const STALLS: ReadonlyArray<[Ware, string]> = [
  [OIL, 'oil stall'],
  [FLEECE, 'fleece stall'],
  [WINE, 'wine stall'],
];

/** A place a criminal would go: where, how far by road, and (a vandal's) which part he means to smash. */
export interface Target {
  target: Building;
  steps: number;
  part: number;
}

/** Is a criminal of this kind already on his way there? */
const headedFor = (s: SimState, kind: Walker['kind'], t: Building): boolean => s.walkers.some((w) => w.kind === kind && w.target === t.id && w.people > 0);

/** Is this building smashed and not yet mended (and which part)? */
export const brokenAt = (s: SimState, b: Building): Broken | undefined => s.crime.broken.find((x) => x.at === b.id);

/** The homes around a busy place whose purses a pickpocket could cut (cottages and better, not cut within the month), nearest first. */
export function victimsNear(s: SimState, place: Building): Building[] {
  const [cx, cz] = centreOf(place);
  const out: Array<{ b: Building; d: number }> = [];
  for (const b of s.buildings) {
    if (!livedIn(b) || !b.family || b.level < COTTAGE) continue;
    const [x, z] = centreOf(b);
    if (Math.abs(x - cx) > PICK_TILES || Math.abs(z - cz) > PICK_TILES) continue;
    const d = dhypot(x - cx, z - cz);
    if (d > PICK_TILES || pickedLately(s, b)) continue;
    out.push({ b, d });
  }
  return out.sort((a, c) => a.d - c.d || a.b.id - c.b.id).map((x) => x.b);
}

/** Had this home a purse cut within the month? */
export function pickedLately(s: SimState, b: Building): boolean {
  const st = b.family?.story ?? [];
  for (let i = st.length - 1; i >= 0; i--) if (st[i].what === 'picked') return s.tick - st[i].tick < PICKED_MOOD;
  return false;
}

/** The parts of a building a vandal could smash: a fountain's spout or a shrine's statue (-1), or an agora's food stall (-1) and its goods stalls (the good's index). */
function partsOf(b: Building): number[] {
  if (b.kind !== 'agora') return [-1];
  return [-1, ...STALLS.filter(([g]) => (b.stalls & (1 << gi(g))) !== 0).map(([g]) => gi(g))];
}

/** What a depot (the quay or the caravan yard) has most of that a smuggler would take (-1: nothing). */
function smuggleWare(t: Building): Ware {
  let best: Ware = -1;
  let most = 0;
  for (const w of TRADE_GOODS) {
    const n = held(t, w);
    if (n > most) {
      most = n;
      best = w;
    }
  }
  return best;
}

/**
 * Where each kind of criminal from `home` would go, from its road search: a
 * busy agora or theatre for a pickpocket (with purses to cut around it), the
 * nearest fountain, shrine or agora not yet smashed for a vandal, the richest
 * home or store for an arsonist, the quay or yard with goods waiting for a
 * smuggler. Each within its reach, not worked within the month, and not
 * already another's of the same kind.
 */
export function crimeTargets(s: SimState, size: number, home: Building, search: Search): { pickpocket?: Target; vandal?: Target; arson?: Target; smuggling?: Target } {
  const out: { pickpocket?: Target; vandal?: Target; arson?: Target; smuggling?: Target } = {};
  let arsonWorth = 0;
  const lately = (t: Building): boolean => t.robbedAt > 0 && s.tick - t.robbedAt < TICKS_PER_MONTH;
  for (const t of s.buildings) {
    const k = t.kind;
    const pick = (k === 'agora' || k === 'theatre') && rateOf(t) > 0;
    const smash = k === 'fountain' || k === 'shrine' || k === 'agora';
    const burn = t !== home && t.fire !== FIRE_BURNING && burnable(t) && ((k === 'home' && livedIn(t) && !!t.family && t.level > home.level) || k === 'granary' || k === 'storehouse');
    const smuggle = k === 'trading' || k === 'yard';
    if (!pick && !smash && !burn && !smuggle) continue;
    const r = nearestReached(search, roadsBeside(s, size, t));
    if (r < 0) continue;
    const d = search.dist[r];
    if (pick && d <= PICK_REACH && (!out.pickpocket || d < out.pickpocket.steps) && !lately(t) && !headedFor(s, 'pickpocket', t) && victimsNear(s, t).length > 0) out.pickpocket = { target: t, steps: d, part: -1 };
    if (smash && d <= VANDAL_REACH && (!out.vandal || d < out.vandal.steps) && !brokenAt(s, t) && !headedFor(s, 'vandal', t)) {
      const parts = partsOf(t);
      out.vandal = { target: t, steps: d, part: parts[Math.floor(unit(s.seed, home.id, t.id, 41) * parts.length)] };
    }
    if (burn && d <= ARSON_REACH && !headedFor(s, 'arsonist', t)) {
      // (The richest home in reach before a store; nearer before further.)
      const v = (k === 'home' ? 10 * t.level : 25) / (8 + d);
      if (v > arsonWorth) {
        arsonWorth = v;
        out.arson = { target: t, steps: d, part: -1 };
      }
    }
    if (smuggle && d <= SMUGGLE_REACH && (!out.smuggling || d < out.smuggling.steps) && !lately(t) && smuggleWare(t) >= 0 && !headedFor(s, 'smuggler', t)) out.smuggling = { target: t, steps: d, part: -1 };
  }
  return out;
}

// ---------------------------------------------------------------------------
// The walk.

/**
 * A pickpocket at the place he means to work: a slow sidle along the roadside
 * tiles that run on from where he stands, there and back, a little in from
 * the road among the crowd (false: nowhere to sidle; he goes straight in).
 */
export function mingle(s: SimState, size: number, w: Walker, t: Building): boolean {
  const roads = new Set(roadsBeside(s, size, t));
  const here = position(w);
  let at = -1;
  let bd = Infinity;
  for (const r of roads) {
    const [x, z] = centre(size, r);
    const d = dhypot(x - here[0], z - here[1]);
    if (d < bd) [at, bd] = [r, d];
  }
  if (at < 0) return false;
  // The roadside tiles that run on from there, each way (straight on along a side; round a corner, a diagonal step).
  const seen = new Set([at]);
  const run = (): number[] => {
    const out: number[] = [];
    let cur = at;
    for (let guard = 0; guard < MINGLE_TILES; guard++) {
      const cx = cur % size;
      const l = cx > 0;
      const r = cx < size - 1;
      const next = [cur - size, cur + size, l ? cur - 1 : -1, r ? cur + 1 : -1, l ? cur - size - 1 : -1, r ? cur - size + 1 : -1, l ? cur + size - 1 : -1, r ? cur + size + 1 : -1].find((u) => u >= 0 && roads.has(u) && !seen.has(u));
      if (next === undefined) break;
      seen.add(next);
      out.push(next);
      cur = next;
    }
    return out;
  };
  const one = run();
  const other = run();
  if (one.length === 0) return false;
  const [fx, fz] = centreOf(t);
  const inward = (r: number): [number, number, number] => {
    const [x, z] = centre(size, r);
    return [x + (fx - x) * 0.3, z + (fz - z) * 0.3, r];
  };
  // There and back one way, then the other; round again (twice at most) if that is short.
  const pts: Array<[number, number, number]> = [[here[0], here[1], -1], inward(at)];
  for (let round = 0; round < MINGLE_ROUNDS && pts.length - 2 < MINGLE_TILES; round++) {
    for (const way of [one, other]) {
      if (way.length === 0) continue;
      for (const r of way) pts.push(inward(r));
      for (let i = way.length - 2; i >= 0; i--) pts.push(inward(way[i]));
      pts.push(inward(at));
    }
  }
  setPath(w, pts);
  return true;
}

/** What a vandal smashed, in words: "the fountain's spout", "the shrine's statue", "the agora's oil stall". */
export function smashWords(b: Building | undefined, part: number): string {
  if (!b) return 'something';
  if (b.kind === 'fountain') return 'the fountain’s spout';
  if (b.kind === 'shrine') return 'the shrine’s statue';
  if (b.kind === 'agora') {
    const stall = STALLS.find(([g]) => gi(g) === part);
    return stall ? `the agora’s ${stall[1]}` : 'the agora’s food stall';
  }
  return `the ${b.kind}`;
}

/** At the door: each kind does its deed (a thief's theft is crime.ts's steal). */
export function act(s: SimState, map: CoastMap, w: Walker): void {
  const t = findBuilding(s, w.target);
  w.load = 0;
  if (!t) return;
  const home = findBuilding(s, w.home);
  const tl = tally(s);
  const where = whereOf(map, t);
  if (w.kind === 'pickpocket') {
    const victims = victimsNear(s, t).slice(0, PICK_VICTIMS);
    let coin = 0;
    for (const v of victims) {
      const n = PICK_COIN[Math.min(v.level, PICK_COIN.length - 1)];
      coin += n;
      if (!v.family) continue;
      tell(s, v.family, 'picked', v.level, [t.kind === 'theatre' ? 'the theatre' : 'the agora']);
      v.family.story[v.family.story.length - 1].n = n;
    }
    t.robbedAt = s.tick;
    if (victims.length === 0) return;
    w.load = coin;
    tl.picked += victims.length;
    tl.coin += coin;
    tellNews(s, 'picked', `A pickpocket worked the crowd at ${t.kind === 'theatre' ? 'the theatre' : 'the agora'} ${where}: ${victims.length === 1 ? 'a purse' : `${victims.length} purses`} cut, ${coin} dr`, t.id);
  } else if (w.kind === 'vandal') {
    if (brokenAt(s, t)) return;
    const part = t.kind === 'agora' && partsOf(t).includes(w.food) ? w.food : -1;
    s.crime.broken.push({ at: t.id, part, tick: s.tick, by: thiefWho(home, w) });
    w.load = 1;
    tl.smashed++;
    const what = smashWords(t, part);
    const stops = t.kind === 'fountain' ? 'no water carrier goes out from it' : t.kind === 'shrine' ? 'no priestess goes out from it' : 'its vendors stay at home';
    tellNews(s, 'smashed', `A vandal smashed ${what} ${where}: ${t.paused ? 'it is paused; set going again, ' : ''}${stops} ${mendWords(s, t)}`, t.id);
  } else if (w.kind === 'arsonist') {
    if (t.fire === FIRE_BURNING || !burnable(t)) return;
    ignite(s, t);
    s.crime.arsonAt = s.tick;
    w.load = 1;
    tl.arson++;
    tellNews(s, 'arson', `Arson ${where}: ${thiefWho(home, w, 'someone')} set fire to ${placeOf(t)}. A watchman who sees the flames runs to fight them`, t.id);
  } else if (w.kind === 'smuggler') {
    const ware = smuggleWare(t);
    if (ware < 0) return;
    const n = Math.min(held(t, ware), SMUGGLE_LOT);
    setHeld(t, ware, held(t, ware) - n);
    note(s, ware, 'lost', 'Smuggled away', n);
    t.robbedAt = s.tick;
    w.food = ware;
    w.load = n;
    tl.smuggled++;
    tl.goods += n;
    tellNews(s, 'smuggled', `Smugglers ${t.kind === 'yard' ? 'at the caravan yard' : 'on the quay'} ${where}: ${lootWords(w)} slipped away`, t.id);
  }
  s.rev++;
}

/** Home again: the household's story, and smuggled food or goods on their table. */
export function criminalHome(s: SimState, w: Walker, home: Building): void {
  const f = home.family;
  if (!f || w.load <= 0) return;
  const t = findBuilding(s, w.target);
  const name = thiefName(home, w);
  const kind = crimeOfWalker(w.kind);
  const what = kind === 'pickpocket' ? `${w.load} dr` : kind === 'vandal' ? smashWords(t, w.food) : kind === 'arson' ? (t ? placeOf(t) : 'a house') : lootWords(w);
  tell(s, f, 'misdeed', home.level, [name, kind, what]);
  f.story[f.story.length - 1].n = w.load;
  if (kind === 'smuggling') {
    const until = (now: number): number => Math.max(now, s.tick) + STOLEN_DAYS * TICKS_PER_DAY;
    if (w.food === WHEAT || w.food === MEAT || w.food === CHEESE) setFoodUntil(home, w.food as Food, until(foodUntil(home, w.food as Food)));
    else if (w.food === OIL || w.food === FLEECE || w.food === WINE) home.goodsUntil[gi(w.food)] = until(home.goodsUntil[gi(w.food)]);
  }
  s.rev++;
}

/** Caught, any kind but a thief: what he took goes back, the household pays its fine and hears of it, and the town too. */
export function catchOther(s: SimState, map: CoastMap, w: Walker): void {
  const home = findBuilding(s, w.home);
  const name = thiefName(home, w);
  const kind = crimeOfWalker(w.kind);
  const tl = tally(s);
  const t = findBuilding(s, w.target);
  if (w.load > 0 && w.back) {
    if (kind === 'pickpocket') tl.coin -= w.load;
    else if (kind === 'smuggling' && t && w.food >= 0) {
      const back = Math.min(w.load, Math.max(0, depotRoom(t, w.food)));
      setHeld(t, w.food, held(t, w.food) + back);
      note(s, w.food, 'lost', 'Smuggled away', -back);
      tl.goods -= back;
    }
  }
  const level = home?.level ?? 0;
  const fine = THIEF_FINE[Math.min(level, THIEF_FINE.length - 1)];
  if (fine > 0) income(s, fine, 'fines', `${KIND_NAME[kind]}s caught`);
  tl.caught++;
  tl.fines += fine;
  if (home?.family) {
    tell(s, home.family, 'caught', home.level, [name, kind]);
    home.family.story[home.family.story.length - 1].n = fine;
  }
  const whose = home?.family ? thiefWho(home, w) : name;
  const pr = pronouns(home, w);
  const doing = !t ? 'in the street' : w.back ? `on ${pr.his} way home from ${placeOf(t)}` : kind === 'vandal' ? `on ${pr.his} way to smash ${smashWords(t, w.food)}` : kind === 'arson' ? `with a torch, on ${pr.his} way to ${placeOf(t)}` : `on ${pr.his} way to ${placeOf(t)}`;
  const at = home ?? t;
  const fined = fine > 0 ? `${pr.his === 'her' ? 'Her' : 'His'} family paid a ${fine} dr fine` : `${pr.he === 'she' ? 'She' : 'He'} was sent home`;
  tellNews(s, 'caught', `${KIND_NAME[kind] === 'arsonist' ? 'An' : 'A'} ${KIND_NAME[kind]} caught ${at ? whereOf(map, at) : 'in the city'}: ${whose}, ${doing}. ${fined}`, home?.id ?? 0);
  w.people = 0;
  w.load = 0;
  w.meat = 0;
  s.rev++;
}

// ---------------------------------------------------------------------------
// Broken buildings.

/**
 * Each tick, after the services have stepped: a broken building sends nobody
 * out (its walkers' clocks held), and one gone is dropped. One no inspector
 * has come to in PATCH_DAYS is patched up by its own workers (so a town with
 * no architect's office isn't left without it for good).
 */
export function holdBroken(s: SimState, map: CoastMap): void {
  const list = s.crime.broken;
  if (list.length === 0) return;
  for (let i = list.length - 1; i >= 0; i--) {
    const x = list[i];
    const b = findBuilding(s, x.at);
    if (!b || (b.kind !== 'fountain' && b.kind !== 'shrine' && b.kind !== 'agora')) {
      list.splice(i, 1);
      s.rev++;
      continue;
    }
    // (Merge of slice 48: a paused building has no workers at it to patch it up; they do it once it is set going again.)
    if (s.tick - x.tick >= PATCH_DAYS * TICKS_PER_DAY && !b.paused) {
      mendBroken(s, map, b, false);
      continue;
    }
    if (x.part < 0) b.clock = Math.max(b.clock, 2);
    else b.vclock[x.part] = Math.max(b.vclock[x.part] ?? 0, 2);
  }
}

/** (Review of slice 41.) Who mends what a vandal smashed, for the news and the town line: the architect's inspector, or with no architect's office at work, its own workers after PATCH_DAYS (merge of slice 48: once it is set going again, if it is paused). */
export function mendWords(s: SimState, b?: Building): string {
  if (s.buildings.some((o) => o.kind === 'architect' && rateOf(o) > 0)) return 'until the architect’s inspector mends it';
  if (b?.paused) return 'until its own workers patch it up, back at work, a month after it was smashed (an architect’s office would mend it within days)';
  return 'until its own workers patch it up, in about a month (an architect’s office would mend it within days)';
}

/** The architect's inspector walks by a broken building (hazards.ts's round calls this), or its own workers patch it up: it is mended, for a small repair on the ledger. */
export function mendBroken(s: SimState, map: CoastMap | null, b: Building, inspector = true): void {
  const list = s.crime.broken;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].at !== b.id) continue;
    const x = list.splice(i, 1)[0];
    const cost = REPAIR[b.kind] ?? 10;
    pay(s, -cost, 'repairs', b.kind);
    const where = map ? ` ${whereOf(map, b)}` : '';
    const line = inspector ? `The architect’s inspector mended ${smashWords(b, x.part)}${where} (${cost} dr)` : `With no inspector come by in a month, its own workers patched up ${smashWords(b, x.part)}${where} (${cost} dr). An architect’s office nearby would mend it within days`;
    tellNews(s, 'mended', line, b.id);
    s.rev++;
  }
}

// ---------------------------------------------------------------------------
// Talk of burning.

/** Talk of burning begins in a home that has had enough: the town hears of it before anyone acts. */
export function startTalk(s: SimState, map: CoastMap, b: Building, t: ReturnType<typeof temptationOf>): void {
  if (s.crime.talk.some((x) => x.home === b.id)) return;
  s.crime.talk.push({ home: b.id, since: s.tick, at: s.tick + TALK_DAYS * TICKS_PER_DAY });
  s.crime.arsonAt = s.tick;
  tellNews(s, 'talk', `Talk of burning ${whereOf(map, b)}: the house of ${b.family?.name ?? 'a poor family'} has had enough (${grievances(s, b, t)}). If no watchman walks by, someone will set a fire within about ${TALK_DAYS} days`, b.id);
  s.rev++;
}

/** "hungry, harsh taxes and robbed lately": an aggrieved home's grievances. */
export function grievances(s: SimState, b: Building, t: ReturnType<typeof temptationOf>): string {
  const g: string[] = [];
  if (t.hungry) g.push('hungry');
  if (t.harsh) g.push('harsh taxes');
  if (robbedLately(s, b)) g.push('robbed lately');
  if (t.mood === 0) g.push('fed up');
  return g.length <= 1 ? (g[0] ?? '') : `${g.slice(0, -1).join(', ')} and ${g[g.length - 1]}`;
}

/** Once a day each talk of burning: dies down with a watchman walking by or the grievance easing, or, when its time comes, the arsonist goes out. */
export function stepTalk(s: SimState, map: CoastMap): void {
  const list = s.crime.talk;
  if (list.length === 0) return;
  const size = map.size;
  for (let i = list.length - 1; i >= 0; i--) {
    const x = list[i];
    if ((s.tick + x.home + 5) % TICKS_PER_DAY !== 0) continue;
    const b = findBuilding(s, x.home);
    if (!b || !livedIn(b) || !b.family) {
      list.splice(i, 1);
      continue;
    }
    const t = temptationOf(s, size, b);
    const watched = watchedLately(s, size, b);
    if (watched || !aggrieved(s, b, t)) {
      list.splice(i, 1);
      b.tempt = Math.min(b.tempt, TEMPT_HALF);
      tellNews(s, 'calmed', `The talk of burning ${whereOf(map, b)} has died down: ${watched ? 'the watchman walks by the house of ' : 'things are better for the house of '}${b.family.name}`, b.id);
      s.rev++;
      continue;
    }
    if (s.tick < x.at || kindOut(s, 'arson') >= KIND_OUT.arson) continue;
    const from = roadsBeside(s, size, b);
    if (from.length === 0) continue;
    const got = crimeTargetsFrom(s, size, b).arson;
    if (!got) continue;
    list.splice(i, 1);
    b.tempt = Math.min(b.tempt, TEMPT_FULL);
    setOutAs(s, size, b, { kind: 'arson', target: got.target, part: -1 }, Math.floor(s.tick / TICKS_PER_DAY), true);
  }
}

/** crimeTargets from a home's own roads. */
export function crimeTargetsFrom(s: SimState, size: number, b: Building): ReturnType<typeof crimeTargets> {
  const from = roadsBeside(s, size, b);
  return from.length ? crimeTargets(s, size, b, roadSearch(s, size, from)) : {};
}

// ---------------------------------------------------------------------------
// Crooked tax collectors.

/** What a collector handing in now keeps back for himself (0: he is honest today): his office's wages owed, and no watchman walking by it this month. */
export function skimmed(s: SimState, w: Walker): number {
  if (!s.crime.on || !s.crime.kinds || w.purse.length === 0) return 0;
  const office = findBuilding(s, w.origin);
  if (!office || office.kind !== 'taxoffice' || office.owed <= 0) return 0;
  // (The land's size from the state: handing in has no map to hand.)
  const size = sizeOf(s);
  if (watchedLately(s, size, office)) return 0;
  let bag = 0;
  for (let i = 0; i < w.purse.length; i += 3) bag += w.purse[i + 1];
  return Math.floor(bag * SKIM_SHARE);
}

/** He keeps it back: the ledger's "Skimmed" line, the tally and the news. */
export function skim(s: SimState, w: Walker, dr: number): void {
  if (dr <= 0) return;
  pay(s, -dr, 'skimmed', 'by the tax collector');
  tally(s).skimmed += dr;
  tellNews(s, 'skimmed', `The tax collector kept back ${dr} dr of the takings: his office’s wages are owed and no watchman walks by it`, w.origin);
  s.rev++;
}

// ---------------------------------------------------------------------------
// In words.

/** What a criminal is about, in words: "working the crowd at the agora", "on his way to smash the fountain’s spout". */
export function criminalDoing(s: SimState, w: Walker): string {
  const home = findBuilding(s, w.home);
  const t = findBuilding(s, w.target);
  const kind = crimeOfWalker(w.kind);
  const pr = pronouns(home, w);
  const place = t ? placeOf(t) : 'somewhere';
  const depot = t?.kind === 'yard' ? 'the caravan yard' : 'the quay';
  if (kind === 'pickpocket') {
    if (w.back) return w.load > 0 ? `slipping home with ${w.load} dr in cut purses` : 'slipping home empty-handed';
    return w.steps === 1 ? `working the crowd at ${place}` : `on ${pr.his} way to ${place}’s crowd`;
  }
  if (kind === 'vandal') return w.back ? `slipping home, having smashed ${smashWords(t, w.food)}` : w.wait > 0 ? `smashing ${smashWords(t, w.food)}` : `on ${pr.his} way to smash ${smashWords(t, w.food)}`;
  if (kind === 'arson') return w.back ? `slipping home from the fire at ${place}` : w.wait > 0 ? `setting fire to ${place}` : `on ${pr.his} way to set fire to ${place}`;
  if (kind === 'smuggling') return w.back ? (w.load > 0 ? `slipping home with ${lootWords(w)} from ${depot}` : 'slipping home empty-handed') : `on ${pr.his} way to ${depot}`;
  return w.back ? (w.load > 0 ? `slipping home with ${lootWords(w)}` : 'slipping home empty-handed') : `on ${pr.his} way to ${place}`;
}

/** A criminal's tip: who, what about, and what the watchman would do. */
export function criminalStatus(s: SimState, w: Walker): { title: string; detail: string } {
  const home = findBuilding(s, w.home);
  const kind = crimeOfWalker(w.kind);
  const who = thiefWho(home, w, 'nobody knows who');
  const pr = pronouns(home, w);
  const gang = s.crime.gangs.find((g) => g.den === w.home);
  const LOOK: Record<string, string> = {
    thief: 'A hooded figure',
    pickpocket: 'A slight figure, quick hands, eyes on the purses',
    vandal: 'A big figure with a club, in a black mood',
    arsonist: 'A dark figure with a torch, keeping out of sight',
    smuggler: 'A figure in a sea-blue tunic and a knitted cap, eyes on the quay',
  };
  const ganged = gang ? ` · one of ${gang.name}’s men: a lone watchman can’t take ${pr.him}` : '';
  const chased = w.meat > 0 ? ` · a watchman is after ${pr.him}` : ` · a watchman who sees ${pr.him} runs after ${pr.him}`;
  const title = KIND_NAME[kind][0].toUpperCase() + KIND_NAME[kind].slice(1);
  return { title: gang ? `${title} (${gang.name})` : title, detail: `${LOOK[w.kind] ?? 'A hooded figure'}: ${who}, ${criminalDoing(s, w)}${ganged}${chased}` };
}

/** Is a criminal of any kind from this home out now? */
export const outFrom = (s: SimState, b: Building): Walker | undefined => s.walkers.find((w) => isCriminal(w.kind) && w.home === b.id && w.people > 0);

/** "the fountain by the bay" for a broken building. */
export function brokenPlace(map: CoastMap, b: Building): string {
  return `${b.kind === 'agora' ? 'the agora' : b.kind === 'shrine' ? 'the shrine' : 'the fountain'} ${whereOf(map, b)}`;
}

// ---------------------------------------------------------------------------
// Tips.

/** "3 days", "a month". */
const daysWords = (ticks: number): string => {
  const d = Math.max(1, Math.round(ticks / TICKS_PER_DAY));
  return d >= 28 && d <= 32 ? 'a month' : d === 1 ? 'a day' : `${d} days`;
};

/**
 * What the new crimes have done to a building, for its tip (status.ts): a
 * smashed fountain, shrine or stall and who mends it; pickpockets about an
 * agora or theatre; smugglers at the quay or the yard; a tax office whose
 * collector skims; a gang's den.
 */
export function misdeedLines(s: SimState, map: CoastMap, b: Building): string[] {
  if (!s.crime.on || !s.crime.kinds) return [];
  const out: string[] = [];
  const x = brokenAt(s, b);
  if (x) {
    const stops = b.kind === 'fountain' ? 'no water carrier goes out from it' : b.kind === 'shrine' ? 'no priestess goes out from it' : x.part < 0 ? 'its food vendors stay at home' : 'that stall’s vendors stay at home';
    const left = PATCH_DAYS * TICKS_PER_DAY - (s.tick - x.tick);
    const architect = s.buildings.some((o) => o.kind === 'architect' && rateOf(o) > 0);
    // (Merge of slice 48: paused, it has no workers at it to patch it up until it is set going again.)
    const workers = !b.paused ? `its own workers patch it up in about ${daysWords(left)}` : left > 0 ? `paused, it has nobody at work to patch it up: set going again, its own workers do it in about ${daysWords(left)}` : 'paused, it has nobody at work to patch it up: its own workers do it as soon as it is set going again';
    const mend = architect ? `The architect’s inspector comes to it first, if her round reaches it; if not, ${workers}` : `No architect’s office: ${workers} (an architect’s office nearby would mend it within days)`;
    out.push(`Smashed ${daysWords(s.tick - x.tick)} ago by ${x.by}: ${smashWords(b, x.part)} is broken, and ${stops} · ${mend}`);
  }
  if (b.kind === 'agora' || b.kind === 'theatre') {
    const w = s.walkers.find((o) => o.kind === 'pickpocket' && o.target === b.id && o.people > 0 && !o.back);
    if (w) out.push(`Pickpockets about: one is ${w.steps === 1 ? 'working the crowd now' : 'on his way to the crowd'} · a watchman walking by would catch him`);
    else if (b.robbedAt > 0 && s.tick - b.robbedAt < TICKS_PER_MONTH) out.push(`Pickpockets about: purses were cut in the crowd here ${daysWords(s.tick - b.robbedAt)} ago · the homes around mind it for a month`);
  }
  if (b.kind === 'trading' || b.kind === 'yard') {
    const w = s.walkers.find((o) => o.kind === 'smuggler' && o.target === b.id && o.people > 0 && !o.back);
    if (w) out.push(`A smuggler is on his way, after the goods waiting ${b.kind === 'yard' ? 'in the yard' : 'on the quay'}`);
    else if (b.robbedAt > 0 && s.tick - b.robbedAt < TICKS_PER_MONTH) out.push(`Smugglers took goods from here ${daysWords(s.tick - b.robbedAt)} ago (the stock book’s “Smuggled away”) · a watchman walking by keeps them off`);
  }
  if (b.kind === 'taxoffice' && b.owed > 0) {
    const size = map.size;
    out.push(watchedLately(s, size, b) ? 'Its wages are owed, but the watchman walks by: the collector hands in every drachma' : `Its wages are owed and no watchman walks by: the collector keeps back ${Math.round(SKIM_SHARE * 100)}% of what he collects (the ledger’s “Skimmed” line) until they are paid`);
  }
  const g = b.kind === 'home' ? s.crime.gangs.find((o) => o.den === b.id) : undefined;
  if (g) out.push(`The den of ${g.name}: its men go out every week or so, and beat off a lone watchman · two watch posts whose rounds reach it break the gang up`);
  return out;
}
