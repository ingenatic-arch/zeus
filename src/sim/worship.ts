/**
 * Worship (slice 53, the Olympus line): what moves the twelve's moods in play.
 *
 * - **Worship and rivalry.** Every honour from worship goes through
 *   `worship` (something done once: a festival, an offering) or `standing`
 *   (something that counts while it lasts: shrines dedicated to a god; slice
 *   54's sanctuary). Each honours the god and, while the god's rival is
 *   honoured less (their mood is lower), gives the rival a memory a third as
 *   large against you: "you honoured Poseidon, her rival". Nothing else (a
 *   staged mood, neglect, what the gods love and hate in the city) stirs a
 *   rival.
 * - **Shrines dedicated** (the `dedicate` command): a shrine to a god is a
 *   standing honour, diminishing (the third shrine to Demeter adds less than
 *   the first). "To all the gods" (an older shrine, or one left so) honours
 *   none of them, and serves homes as before.
 * - **What they love and hate**, read from what the city already has, once a
 *   month for each god (staggered over the month's odd days), each a named
 *   reason with a modest weight, or forgotten when it no longer holds. Not
 *   before the city is noticed.
 * - **Neglect.** Once the city has been noticed a year, a god with no
 *   worship for a year slides two a month, fading over a year once honoured
 *   again, never below displeased by neglect alone.
 * - **Festivals at home** (the `festival` command, from a dedicated shrine):
 *   coin and a measure of the god's sacred good at once, announced a month
 *   ahead; on the day the god is honoured and a procession in the god's
 *   colour walks from the shrine round the nearest agora and back. Homes
 *   beside its way are glad for a season (pantheon.ts' festiveMood, read by
 *   folk.ts). One per god a year.
 * - **Offerings** (the `offer` command): a porter carries a measure of the
 *   sacred good from the nearest store holding it to the shrine; the honour
 *   lands when he arrives.
 * - **The record**: each god's mood at the start of every month, two years
 *   of it, for the overview; and the news when a god's mood crosses a word.
 *
 * Hooks for the other lines: `worship` and `standing` (a sanctuary's
 * honours, slice 54), `festivalHeld` and `festivalUnderWay` (a god's visit on
 * their festival, slice 56).
 *
 * Nothing here acts while the gods' switch is off (a demo's history), so no
 * history moves. Pure and deterministic: no random numbers at all.
 */
import type { CoastMap } from '../map/bake';
import { datan2 } from '../map/dmath';
import { DISTRICTS, districtAt } from '../map/districts';
import { BUILDING_NAMES, capacity, centreOf, findBuilding, HUT, livedIn } from './buildings';
import { dateOfTick, MONTH_NAMES, TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { ARMOUR, COPPER, FLEECE, held, HORSES, OIL, setHeld, tableUntil, WARE_NAMES, WHEAT, WINE, type Ware } from './foods';
import { quarantined } from './health';
import { crimesIn, rateFor } from './annals';
import { moodCtx } from './crime';
import { moodOf } from './folk';
import { canWorkIn } from './labour';
import { NEWS, say, WARNING } from './messages';
import { MONUMENT_KINDS, finished } from './monuments';
import { FESTIVE_LASTS, forget, GOD_IDS, GODS, herOf, honour, MOOD_MONTHS, moodOfGod, moodRank, moodWord, noticed, reasonsOf, setStanding, type Festival, type GodId } from './pantheon';
import { MAKERS } from './production';
import { door, roadsBeside } from './rounds';
import { nearestReached, roadSearch, tracePath } from './roads';
import { note } from './stockbook';
import { isStore, roomOf } from './stores';
import { pay, spendable } from './treasury';
import { besideRoad, newWalker, roadPoints, setPath, speedOf } from './walk';
import { dhypot } from '../map/dmath';
import type { Building, SimState, Walker } from './state';

// ---------------------------------------------------------------------------
// The numbers, in one place (tuned by eye: a city doing nothing special for a
// god sits about watchful; a well-run city with a shrine to a god has them
// pleased within a year; a sanctuary and festivals make them warm).

/** A god's shrines: the first is worth this much, the next these, and each after the last of them. At most SHRINE_MOST in all. */
export const SHRINE_HONOURS = [5, 3, 2, 1];
export const SHRINE_MOST = 12;
/** A rival minds a third as much. */
export const RIVAL_SHARE = 1 / 3;
/** A festival: what it costs, what it honours and how long that lasts, how far ahead it is announced, one a year per god. */
export const FESTIVAL_COST = 250;
export const FESTIVAL_HONOUR = 15;
export const FESTIVAL_FADE = TICKS_PER_YEAR;
export const FESTIVAL_NOTICE = TICKS_PER_MONTH;
export const FESTIVAL_EVERY = TICKS_PER_YEAR;
/** Its procession: how many walk, how far from the shrine it goes to find an agora (road steps), how far round the streets with none, and at most how long it walks. */
export const PROCESSION_PEOPLE = 8;
export const PROCESSION_REACH = 40;
export const PROCESSION_STREETS = 14;
export const PROCESSION_LONGEST = 2 * TICKS_PER_MONTH;
/** An offering: what it honours, how long that lasts. */
export const OFFERING_HONOUR = 4;
export const OFFERING_FADE = 6 * TICKS_PER_MONTH;
/** Neglect: after a year noticed with no worship for a year, this much a month, fading over a year once honoured, never below this by itself. */
export const NEGLECT_STEP = 2;
export const NEGLECT_FADE = TICKS_PER_YEAR;
export const NEGLECT_FLOOR = -29;

/** What the city shows each god (see READINGS): each reading's weight. */
export const W = {
  court: 3,
  noCourt: 3,
  greatCity: 3,
  growingCity: 1,
  littleCrime: 1,
  muchCrime: 2,
  families: 2,
  loyal: 2,
  restless: 2,
  seaTrade: 1,
  seaTradeMost: 3,
  triremes: 2,
  quay: 1,
  noQuay: 3,
  granaries: 3,
  farms: 2,
  bread: 2,
  hunger: 3,
  idleFields: 2,
  olives: 2,
  theatres: 2,
  athenaCourt: 2,
  physicians: 2,
  healthy: 2,
  plague: 4,
  herds: 3,
  thinHerds: 3,
  bigArmy: 3,
  army: 1,
  noArmy: 2,
  tribute: 3,
  happy: 3,
  misery: 3,
  estates: 2,
  festivals: 2,
  executions: 2,
  armouries: 2,
  mines: 1,
  monuments: 2,
  fires: 2,
  routes: 1,
  routesMost: 3,
  trade: 1,
  closedRoads: 2,
  quarantine: 3,
  vines: 2,
  dionysusTheatres: 1,
  sober: 2,
};

/** How much of a god's sacred good an offering and a festival take (horses and armour come fewer to the measure). */
export function offeringOf(w: Ware): number {
  return w === HORSES ? 2 : w === ARMOUR ? 4 : 10;
}
export function festivalGoods(w: Ware): number {
  return w === HORSES ? 4 : w === ARMOUR ? 8 : 20;
}

/** A sacred good counted in its units: "20 amphorae of wine". */
const UNITS: Partial<Record<Ware, [string, string]>> = { [OIL]: ['jar', 'jars'], [FLEECE]: ['bale', 'bales'], [WINE]: ['amphora', 'amphorae'], [COPPER]: ['ingot', 'ingots'], [ARMOUR]: ['set', 'sets'], [HORSES]: ['horse', 'horses'] };
export function goodsWords(w: Ware, n: number): string {
  if (w === HORSES) return `${n} ${n === 1 ? 'horse' : 'horses'}`;
  const u = UNITS[w] ?? ['measure', 'measures'];
  return `${n} ${n === 1 ? u[0] : u[1]} of ${WARE_NAMES[w].toLowerCase()}`;
}

// ---------------------------------------------------------------------------
// Worship and rivalry.

/** A god's rival's grudge, in words: "you honoured Poseidon, her rival". */
const rivalWhy = (god: GodId, holder: GodId): string => `you honoured ${GODS[god].name}, ${herOf(holder)} rival`;

/**
 * Honour a god for something done once (a festival, an offering, a stage of a
 * sanctuary): see honour in pantheon.ts. While the god's rival is honoured
 * less (their mood is lower), the rival remembers a third as much against you,
 * fading as the honour does.
 */
export function worship(s: SimState, god: GodId, amount: number, kind: string, why: string, fade: number): void {
  honour(s, god, amount, kind, why, fade);
  s.gods.worshipped[god] = s.tick;
  if (amount <= 0) return;
  const r = GODS[god].rival;
  const grudge = Math.round(amount * RIVAL_SHARE);
  if (grudge > 0 && moodOfGod(s, r) < moodOfGod(s, god)) honour(s, r, -grudge, 'rival', rivalWhy(god, r), fade);
}

/**
 * Honour a god for something that counts while it lasts (their shrines, a
 * sanctuary standing): one memory of its kind, replaced (0 forgets it). The
 * rival's standing grudge, a third as much, holds while the rival is honoured
 * less, and is forgotten when not.
 */
export function standing(s: SimState, god: GodId, kind: string, why: string, amount: number): void {
  setStanding(s, god, kind, why, amount);
  if (amount > 0) s.gods.worshipped[god] = s.tick;
  const r = GODS[god].rival;
  const k = `rival:${kind}`;
  const grudge = Math.round(amount * RIVAL_SHARE);
  if (grudge > 0 && moodOfGod(s, r) < moodOfGod(s, god)) setStanding(s, r, k, `${why}, ${herOf(r)} rival`, -grudge);
  else forget(s, r, k);
}

// ---------------------------------------------------------------------------
// Shrines.

/** The shrines dedicated to a god. */
export const shrinesTo = (s: SimState, god: GodId): Building[] => s.buildings.filter((b) => b.kind === 'shrine' && b.god === god);

/** What n shrines to one god are worth together (diminishing). */
export function shrinesWorth(n: number): number {
  let v = 0;
  for (let i = 0; i < n; i++) v += SHRINE_HONOURS[Math.min(i, SHRINE_HONOURS.length - 1)];
  return Math.min(SHRINE_MOST, v);
}

/** A god's shrines, as the standing honour they are now. */
function honourShrines(s: SimState, god: GodId): void {
  const n = shrinesTo(s, god).length;
  standing(s, god, 'shrine', n === 1 ? `your shrine to ${GODS[god].name}` : `your ${n} shrines to ${GODS[god].name}`, shrinesWorth(n));
}

/** Why a shrine can't be dedicated so ('' if it can). */
export function dedicateRefusal(s: SimState, id: number, god: string): string {
  const b = findBuilding(s, id);
  if (!b || b.kind !== 'shrine') return 'Only a shrine is dedicated to a god';
  if (god !== '' && !(GOD_IDS as readonly string[]).includes(god)) return 'There is no such god';
  return '';
}

/** Dedicate a shrine to a god, or to all the gods (''): the command. Its god's (and the god it leaves's) shrines are honoured anew at once. */
export function dedicate(s: SimState, id: number, god: string): void {
  if (dedicateRefusal(s, id, god)) return;
  const b = findBuilding(s, id)!;
  const was = b.god;
  if (god === '') delete b.god;
  else b.god = god as GodId;
  if (was === b.god) return;
  s.rev++;
  if (!s.gods.on) return;
  if (was) honourShrines(s, was);
  if (b.god) honourShrines(s, b.god);
}

// ---------------------------------------------------------------------------
// The sacred goods: where they are kept.

/** Where a ware can be taken from for the gods: storehouses and granaries holding it, and the makers that keep it in their own stores. */
const sourceOf = (b: Building, w: Ware): boolean => b.kind !== 'home' && !b.paused && held(b, w) > 0 && (isStore(b.kind) || MAKERS[b.kind]?.ware === w);

/** How much of a ware the city could give the gods now. */
export function sacredStock(s: SimState, w: Ware): number {
  let n = 0;
  for (const b of s.buildings) if (sourceOf(b, w)) n += held(b, w);
  return n;
}

/** Take so much of a ware from where it is kept, the fullest first. */
function takeSacred(s: SimState, w: Ware, n: number): void {
  const from = s.buildings.filter((b) => sourceOf(b, w)).sort((a, b) => held(b, w) - held(a, w) || a.id - b.id);
  for (const b of from) {
    if (n <= 0) break;
    const k = Math.min(n, held(b, w));
    setHeld(b, w, held(b, w) - k);
    n -= k;
  }
  s.looks++;
}

// ---------------------------------------------------------------------------
// Festivals.

/** The day a god's last festival began (its procession set out), or -1: for slice 56's visit on a festival. */
export const festivalHeld = (s: SimState, god: GodId): number => s.gods.lastFestival[god] ?? -1;
/** Is a festival to the god announced or under way? */
export const festivalOf = (s: SimState, god: GodId): Festival | undefined => s.gods.festivals.find((f) => f.god === god);
/** Is the god's procession walking now (their festival under way)? */
export const festivalUnderWay = (s: SimState, god: GodId): boolean => (festivalOf(s, god)?.walker ?? 0) > 0;

/** What a shrine is told apart by: the nearest of these within a few tiles. */
const LANDMARKS = new Set<Building['kind']>(['agora', 'theatre', 'farm', 'granary', 'trading', 'vineyard', 'winery', 'storehouse', 'grove', 'press', 'court', 'infirmary', 'barracks', 'shipyard', 'quarry', 'mine', 'dairy', 'lodge', 'pasture', 'yard']);
const LANDMARK_REACH = 7;

/** "the shrine by the bay", and with the city (`s`) the nearest landmark too: "the shrine by the bay, by the trading post". */
export function shrineWords(map: CoastMap, b: Building, s?: SimState): string {
  const [x, z] = centreOf(b);
  const w = DISTRICTS[districtAt(map, x, z)]?.where;
  let near = '';
  if (s) {
    let best = LANDMARK_REACH;
    for (const o of s.buildings) {
      if (!LANDMARKS.has(o.kind)) continue;
      const [ox, oz] = centreOf(o);
      const d = dhypot(ox - x, oz - z);
      if (d < best) {
        best = d;
        near = (BUILDING_NAMES as Record<string, string>)[o.kind].replace(/^(an?|the) /i, 'the ').toLowerCase();
      }
    }
  }
  return `${w ? `the shrine ${w}` : 'the shrine'}${near ? `${w ? ',' : ''} by ${near}` : ''}`;
}

const dayWords = (tick: number): string => {
  const d = dateOfTick(tick);
  return `${d.day} ${MONTH_NAMES[d.month]}`;
};

/** When a god may next have a festival (a year after the last), or 0 if they may now. */
export function nextFestival(s: SimState, god: GodId): number {
  const last = festivalHeld(s, god);
  return last >= 0 && s.tick - last < FESTIVAL_EVERY ? last + FESTIVAL_EVERY : 0;
}

/** Why a festival can't be held at a shrine now ('' if it can). */
export function festivalRefusal(s: SimState, map: CoastMap, id: number): string {
  const b = findBuilding(s, id);
  if (!b || b.kind !== 'shrine') return 'Only a shrine holds a festival';
  if (!s.gods.on) return 'The gods are not watching yet';
  const god = b.god;
  if (!god) return 'Dedicate the shrine to a god first: a festival is for one of the twelve';
  const G = GODS[god];
  const f = festivalOf(s, god);
  if (f) return f.walker ? `${G.name}’s festival is under way` : `A festival to ${G.name} is announced for ${dayWords(f.day)}`;
  const next = nextFestival(s, god);
  if (next) return `${G.name} had a festival on ${dayWords(festivalHeld(s, god))}: one a year (the next from ${dayWords(next)}${dateOfTick(next).yearBC !== dateOfTick(s.tick).yearBC ? ' next year' : ''})`;
  if (roadsBeside(s, map.size, b).length === 0) return 'No road leads from the shrine for the procession';
  const can = spendable(s);
  if (can < FESTIVAL_COST) return `A festival costs ${FESTIVAL_COST} dr, and the treasury can spare ${Math.max(0, Math.floor(can))}`;
  const need = festivalGoods(G.sacred);
  const have = sacredStock(s, G.sacred);
  if (have < need) return `It needs ${goodsWords(G.sacred, need)} for ${G.name} from the stores, and they hold ${have ? goodsWords(G.sacred, have).replace(/ of .*$/, '') : 'none'}`;
  return '';
}

/** Hold a festival at a shrine (the command): pays, takes the sacred good, and announces it a month ahead. */
export function holdFestival(s: SimState, map: CoastMap, id: number): void {
  if (festivalRefusal(s, map, id)) return;
  const b = findBuilding(s, id)!;
  const god = b.god!;
  const G = GODS[god];
  const n = festivalGoods(G.sacred);
  pay(s, -FESTIVAL_COST, 'worship', `festival to ${G.name}`);
  takeSacred(s, G.sacred, n);
  note(s, G.sacred, 'used', 'given to the gods', n);
  const f: Festival = { god, shrine: b.id, at: s.tick, day: s.tick + FESTIVAL_NOTICE, walker: 0 };
  s.gods.festivals.push(f);
  s.rev++;
  say(s, {
    kind: 'gods',
    u: NEWS,
    title: `A festival to ${G.name} is announced`,
    words: `A festival to ${G.name}, ${G.epithet}, is announced at ${shrineWords(map, b, s)}, for ${dayWords(f.day)}: ${herOf(god)} procession will walk round the agora, and the homes it passes will be glad for a season. It cost ${FESTIVAL_COST} dr and ${goodsWords(G.sacred, n)}.`,
    at: { building: b.id },
  });
}

/**
 * The road tiles a procession walks, in order: from the shrine's roadside to
 * the nearest agora within reach, once round it, and back; with no agora in
 * reach, out along the streets near the shrine and back. Null if no road
 * leads from the shrine.
 */
export function processionWay(s: SimState, size: number, shrine: Building): number[] | null {
  const start = roadsBeside(s, size, shrine);
  if (start.length === 0) return null;
  const search = roadSearch(s, size, start);
  let agora: Building | null = null;
  let at = -1;
  let bd = Infinity;
  for (const a of s.buildings) {
    if (a.kind !== 'agora') continue;
    const t = nearestReached(search, roadsBeside(s, size, a));
    if (t < 0 || search.dist[t] > PROCESSION_REACH || search.dist[t] >= bd) continue;
    bd = search.dist[t];
    agora = a;
    at = t;
  }
  if (!agora) {
    // Out to the furthest road within a few streets (the first in tile order of the furthest), and back.
    let far = start[0];
    for (let t = 0; t < search.dist.length; t++) if (search.dist[t] >= 0 && search.dist[t] <= PROCESSION_STREETS && search.dist[t] > search.dist[far]) far = t;
    const out = tracePath(search, far);
    return out.concat(out.slice(0, -1).reverse());
  }
  const out = tracePath(search, at);
  // Round the agora: its roadside tiles in turn about its middle, from where the way meets it.
  const [cx, cz] = centreOf(agora);
  const angle = (t: number): number => {
    const x = t % size;
    return datan2((t - x) / size + 0.5 - cz, x + 0.5 - cx);
  };
  const ring = roadsBeside(s, size, agora).sort((p, q) => angle(p) - angle(q) || p - q);
  const from = ring.indexOf(at);
  const order = from >= 0 ? ring.slice(from + 1).concat(ring.slice(0, from), [at]) : [];
  const round: number[] = [];
  let cur = at;
  for (const t of order) {
    const leg = tracePath(roadSearch(s, size, [cur]), t);
    // (A gap in the agora's roads: the procession doesn't go the long way round to reach the far side.)
    if (leg.length <= 1 || leg.length > 12 || leg[0] !== cur) continue;
    round.push(...leg.slice(1));
    cur = t;
  }
  if (cur !== at) {
    const leg = tracePath(roadSearch(s, size, [cur]), at);
    if (leg[0] === cur) round.push(...leg.slice(1));
  }
  // On from the agora through its streets, to the road furthest from both within a few streets of it, and home by the
  // shortest way (so the way back passes other doors than the way there).
  const fromAgora = roadSearch(s, size, [at]);
  let far = at;
  let score = -1;
  for (let t = 0; t < fromAgora.dist.length; t++) {
    const d = fromAgora.dist[t];
    if (d < 0 || d > PROCESSION_STREETS || search.dist[t] < 0) continue;
    const v = d + search.dist[t];
    if (v > score) {
      score = v;
      far = t;
    }
  }
  const on = tracePath(fromAgora, far);
  const home = tracePath(search, far).reverse();
  return out.concat(round, on.slice(1), home.slice(1));
}

/** On the festival's day: the god is honoured, and the procession sets out (if a road leads from the shrine). */
function beginFestival(s: SimState, map: CoastMap, f: Festival): void {
  const G = GODS[f.god];
  s.gods.lastFestival[f.god] = s.tick;
  worship(s, f.god, FESTIVAL_HONOUR, 'festival', `your festival to ${G.name}`, FESTIVAL_FADE);
  const b = findBuilding(s, f.shrine);
  const way = b ? processionWay(s, map.size, b) : null;
  if (!b || !way || way.length < 2) {
    s.gods.festivals.splice(s.gods.festivals.indexOf(f), 1);
    say(s, { kind: 'gods', u: NEWS, title: `${G.name}’s festival`, words: `${G.name}’s festival was held${b ? ` at ${shrineWords(map, b, s)}` : ''}, but no road led out for a procession. ${G.name} is ${moodWord(moodOfGod(s, f.god))}.`, at: b ? { building: b.id } : undefined });
    return;
  }
  const w = newWalker(s, 'procession', PROCESSION_PEOPLE);
  w.origin = b.id;
  w.target = b.id;
  w.steps = GOD_IDS.indexOf(f.god);
  w.since = s.tick;
  const n = map.size;
  const [dx, dz] = door(n, b, way[0]);
  const [ex, ez] = door(n, b, way[way.length - 1]);
  setPath(w, [[dx, dz, -1], ...roadPoints(s, n, way), [ex, ez, -1]]);
  s.walkers.push(w);
  f.walker = w.id;
  passBy(s, map, w, way[0]);
  s.rev++;
  say(s, {
    kind: 'gods',
    u: NEWS,
    title: `${G.name}’s festival begins`,
    words: `${G.name}’s festival begins: ${herOf(f.god)} procession sets out from ${shrineWords(map, b, s)}${s.buildings.some((a) => a.kind === 'agora') ? ' for the agora' : ' through the streets'}. Homes it passes will be glad for a season.`,
    at: { building: b.id },
  });
}

const scratch: Building[] = [];
/** The homes beside a road tile a procession passes are glad for a season (counted on the walker's `load`). */
function passBy(s: SimState, map: CoastMap, w: Walker, t: number): void {
  if (t < 0) return;
  const g = w.steps;
  for (const b of besideRoad(s, map.size, t, scratch)) {
    if (!livedIn(b)) continue;
    const key = String(b.id);
    const was = s.gods.festive[key];
    if (!was || was[0] < w.since) w.load++;
    s.gods.festive[key] = [s.tick, g];
  }
}

/** Walk a path on: false once its end is reached. */
function advance(w: Walker): boolean {
  let move = speedOf(w);
  for (let guard = 0; guard < 8 && move > 0; guard++) {
    const last = w.path.length / 2 - 1;
    if (w.seg >= last) return false;
    const i = w.seg * 2;
    const len = dhypot(w.path[i + 2] - w.path[i], w.path[i + 3] - w.path[i + 1]);
    if (w.along + move < len) {
      w.along += move;
      w.walked += move;
      return true;
    }
    move -= len - w.along;
    w.walked += len - w.along;
    w.seg++;
    w.along = 0;
  }
  return w.seg < w.path.length / 2 - 1;
}

/** A procession, a tick on (sim.ts' walkers): the homes beside each road it reaches are glad; at its end (or after two months) the festival is over. */
export function moveProcession(s: SimState, map: CoastMap, w: Walker): boolean {
  const seg = w.seg;
  const on = advance(w) && s.tick - w.since < PROCESSION_LONGEST;
  if (w.seg !== seg) for (let k = seg + 1; k <= w.seg; k++) passBy(s, map, w, w.tiles[k] ?? -1);
  if (on) return true;
  const i = s.gods.festivals.findIndex((f) => f.walker === w.id);
  const god = GOD_IDS[w.steps];
  if (i >= 0) s.gods.festivals.splice(i, 1);
  if (god) {
    const G = GODS[god];
    const b = findBuilding(s, w.origin);
    say(s, {
      kind: 'gods',
      u: NEWS,
      title: `${G.name}’s festival is over`,
      words: `${G.name}’s festival is over: ${herOf(god)} procession passed ${w.load === 1 ? 'one home' : `${w.load} homes`}, glad for a season. ${G.name} is ${moodWord(moodOfGod(s, god))}.`,
      at: b ? { building: b.id } : undefined,
    });
  }
  s.rev++;
  return false;
}

// ---------------------------------------------------------------------------
// Offerings.

/** The offering on its way to a shrine, if any. */
export const offeringTo = (s: SimState, id: number): Walker | undefined => s.walkers.find((w) => w.kind === 'offering' && w.target === id);

/** The nearest place by road from a shrine that holds its god's sacred good, and the way there (from the shrine's side). */
function nearestSacred(s: SimState, size: number, b: Building, w: Ware): { g: Building; way: number[] } | null {
  const roads = roadsBeside(s, size, b);
  if (roads.length === 0) return null;
  const search = roadSearch(s, size, roads);
  let best: { g: Building; way: number[] } | null = null;
  let bd = Infinity;
  for (const g of s.buildings) {
    if (!sourceOf(g, w)) continue;
    const at = nearestReached(search, roadsBeside(s, size, g));
    if (at < 0 || search.dist[at] >= bd) continue;
    bd = search.dist[at];
    best = { g, way: tracePath(search, at) };
  }
  return best;
}

/** Why an offering can't be sent to a shrine now ('' if it can). */
export function offerRefusal(s: SimState, map: CoastMap, id: number): string {
  const b = findBuilding(s, id);
  if (!b || b.kind !== 'shrine') return 'Offerings are taken to a shrine';
  if (!s.gods.on) return 'The gods are not watching yet';
  if (!b.god) return 'Dedicate the shrine to a god first: an offering is for one of the twelve';
  const G = GODS[b.god];
  if (offeringTo(s, b.id)) return 'An offering is already on its way here';
  const n = offeringOf(G.sacred);
  const have = sacredStock(s, G.sacred);
  if (have < n) return `${G.name}’s offering is ${goodsWords(G.sacred, n)}, and the stores hold ${have ? goodsWords(G.sacred, have).replace(/ of .*$/, '') : 'none'}`;
  if (!nearestSacred(s, map.size, b, G.sacred)) return roadsBeside(s, map.size, b).length ? `No store the shrine’s roads reach holds ${WARE_NAMES[G.sacred].toLowerCase()}` : 'No road leads to the shrine';
  return '';
}

/** Send an offering (the command): a porter takes the sacred good from the nearest store holding it and carries it to the shrine. */
export function sendOffering(s: SimState, map: CoastMap, id: number): void {
  if (offerRefusal(s, map, id)) return;
  const b = findBuilding(s, id)!;
  const god = b.god!;
  const ware = GODS[god].sacred;
  const n = map.size;
  const found = nearestSacred(s, n, b, ware)!;
  const take = Math.min(offeringOf(ware), held(found.g, ware));
  setHeld(found.g, ware, held(found.g, ware) - take);
  note(s, ware, 'used', 'given to the gods', take);
  s.looks++;
  const p = newWalker(s, 'offering', 1);
  p.origin = b.id;
  p.target = b.id;
  p.home = found.g.id;
  p.food = ware;
  p.load = take;
  p.steps = GOD_IDS.indexOf(god);
  p.since = s.tick;
  const way = found.way.slice().reverse();
  const [sx, sz] = door(n, found.g, way[0]);
  const [px, pz] = door(n, b, way[way.length - 1]);
  setPath(p, [[sx, sz, -1], ...roadPoints(s, n, way), [px, pz, -1]]);
  s.walkers.push(p);
  s.rev++;
}

/** A porter with an offering, a tick on (sim.ts' walkers): at the shrine the god is honoured. */
export function moveOffering(s: SimState, map: CoastMap, w: Walker): boolean {
  if (advance(w)) return true;
  const god = GOD_IDS[w.steps];
  if (!god) return false;
  const G = GODS[god];
  worship(s, god, OFFERING_HONOUR, 'offering', `your offerings to ${G.name}`, OFFERING_FADE);
  const b = findBuilding(s, w.target);
  say(s, {
    kind: 'gods',
    u: NEWS,
    title: `An offering to ${G.name}`,
    words: `An offering of ${goodsWords(w.food, w.load)} reached ${b ? `${G.name}’s ${shrineWords(map, b, s).replace(/^the /, '')}` : `${G.name}`}. ${G.name} is ${moodWord(moodOfGod(s, god))}.`,
    at: b ? { building: b.id } : undefined,
  });
  w.load = 0;
  s.rev++;
  return false;
}

// ---------------------------------------------------------------------------
// What the gods love and hate in the city.

/** What the city shows, looked at once for a god's day. */
export interface CityLook {
  people: number;
  /** Buildings of each kind, and those with someone at work. */
  count: Map<string, number>;
  staffed: Map<string, number>;
  /** Wheat in the granaries, and their room for it. */
  wheat: number;
  wheatRoom: number;
  /** Lived-in homes; of those of a hut or better, with food on the table, and going hungry; full houses. */
  homes: number;
  eating: number;
  fed: number;
  hungry: number;
  full: number;
  /** Content homes now (a share; -1: none asked for or none lived in), last month's crimes (-1: crime off), the sick (-1: not kept). Read from the city itself, never from the annals, so keeping them changes nothing. */
  glad: number;
  crimes: number;
  sick: number;
  plague: boolean;
  quarantine: boolean;
  soldiers: number;
  triremes: number;
  routes: number;
  seaRoutes: number;
  closedRoads: number;
  sold: number;
  /** The wild herds' head now against whole (-1: none). */
  herds: number;
  estates: number;
  monuments: number;
  burning: number;
  executions: boolean;
  tribute: boolean;
  /** Your vassals' and colonies' loyalty on average (-1: none). */
  loyalty: number;
  wine: number;
  festivals: boolean;
}

export function lookAtCity(s: SimState, gladToo = true): CityLook {
  const count = new Map<string, number>();
  const staffed = new Map<string, number>();
  let wheat = 0;
  let wheatRoom = 0;
  let homes = 0;
  let eating = 0;
  let fed = 0;
  let hungry = 0;
  let full = 0;
  let estates = 0;
  let burning = 0;
  for (const b of s.buildings) {
    count.set(b.kind, (count.get(b.kind) ?? 0) + 1);
    if (b.workers > 0) staffed.set(b.kind, (staffed.get(b.kind) ?? 0) + 1);
    if (b.fire >= 2) burning++;
    if (b.kind === 'granary') {
      wheat += held(b, WHEAT);
      wheatRoom += roomOf('granary', WHEAT);
    }
    if (!livedIn(b)) continue;
    homes++;
    if (b.estate) estates++;
    if (b.people >= capacity(b)) full++;
    if (b.level >= HUT) {
      eating++;
      if (tableUntil(b) > s.tick) fed++;
      else if (s.tick >= b.grace) hungry++;
    }
  }
  let glad = -1;
  if (gladToo && homes > 0) {
    const ctx = moodCtx(s);
    let n = 0;
    for (const b of s.buildings) if (livedIn(b) && moodOf(s, b, ctx, canWorkIn(s, b)).level >= 3) n++;
    glad = n / homes;
  }
  const herds = s.herds.reduce((a, h) => [a[0] + h.head, a[1] + h.full], [0, 0]);
  const routes = s.world.routes;
  const loyal = [...s.empire.vassals.map((v) => v.loyalty), ...s.empire.colonies.map((c) => c.loyalty)];
  const yearAgo = s.tick - TICKS_PER_YEAR;
  return {
    people: s.population,
    count,
    staffed,
    wheat,
    wheatRoom,
    homes,
    eating,
    fed,
    hungry,
    full,
    glad,
    crimes: s.crime.on ? crimesIn(rateFor(s, Math.floor(s.tick / TICKS_PER_MONTH) - 1)) : -1,
    sick: s.health?.on ? s.health.sick.length : -1,
    plague: !!s.health?.outbreak,
    quarantine: quarantined(s),
    soldiers: s.army.soldiers.length,
    triremes: s.fleet.triremes.length,
    routes: routes.length,
    seaRoutes: routes.filter((r) => r.kind === 'sea').length,
    closedRoads: routes.filter((r) => r.closed > 0).length,
    sold: routes.reduce((a, r) => a + r.sold.reduce((x, y) => x + y, 0), 0),
    herds: herds[1] > 0 ? herds[0] / herds[1] : -1,
    estates,
    monuments: MONUMENT_KINDS.filter((k) => finished(s, k)).length,
    burning,
    executions: Object.values(s.crime.law ?? {}).includes('execution'),
    tribute: s.world.deals.some((d) => d.kind === 'tribute' && d.state === 'met' && Math.max(d.at, d.ended) >= yearAgo) || s.world.raids.some((r) => r.end === 'paid' && r.ended >= yearAgo),
    loyalty: loyal.length ? loyal.reduce((a, b) => a + b, 0) / loyal.length : -1,
    wine: sacredStock(s, WINE),
    festivals: GOD_IDS.some((g) => festivalHeld(s, g) >= yearAgo),
  };
}

const n = (l: CityLook, kind: string): number => l.count.get(kind) ?? 0;
const at = (l: CityLook, kind: string): number => l.staffed.get(kind) ?? 0;
const fmt = (x: number): string => Math.round(x).toLocaleString('en-GB');

/** One thing a god loves or hates, read from the city: [its weight, signed, and its words], or null when it doesn't hold now. */
type Reading = { id: string; read: (l: CityLook) => [number, string] | null };

/** What each god loves and hates that the city can show now (deeds in Greece are slice 58's). */
export const READINGS: Record<GodId, readonly Reading[]> = {
  zeus: [
    { id: 'court', read: (l) => (at(l, 'court') ? [W.court, 'a court sits in judgement'] : l.people >= 1000 ? [-W.noCourt, `a city of ${fmt(l.people)} with no court`] : null) },
    { id: 'great', read: (l) => (l.people >= 2500 ? [W.greatCity, `a great city of ${fmt(l.people)}`] : l.people >= 1200 ? [W.growingCity, 'a growing city'] : null) },
    { id: 'crime', read: (l) => (l.crimes < 0 || l.people < 500 ? null : l.crimes * 1000 <= l.people ? [W.littleCrime, 'little crime in the streets'] : l.crimes * 1000 >= 8 * l.people ? [-W.muchCrime, `crime in the streets (${l.crimes} last month)`] : null) },
  ],
  hera: [
    { id: 'families', read: (l) => (l.homes >= 10 && l.full >= 0.6 * l.homes ? [W.families, 'houses full of families'] : null) },
    { id: 'loyal', read: (l) => (l.loyalty < 0 ? null : l.loyalty >= 60 ? [W.loyal, 'loyal colonies and vassals'] : l.loyalty < 35 ? [-W.restless, 'restless colonies and vassals'] : null) },
  ],
  poseidon: [
    { id: 'sea', read: (l) => (l.seaRoutes ? [Math.min(W.seaTradeMost, W.seaTrade * (1 + l.seaRoutes)), l.seaRoutes === 1 ? 'sea trade with one city' : `sea trade with ${l.seaRoutes} cities`] : null) },
    { id: 'triremes', read: (l) => (l.triremes >= 2 ? [W.triremes, `${l.triremes} triremes on the water`] : null) },
    { id: 'quay', read: (l) => (n(l, 'trading') + n(l, 'shipyard') ? [W.quay, 'a quay'] : l.people >= 600 ? [-W.noQuay, 'a city with its back to the sea'] : null) },
  ],
  demeter: [
    { id: 'granaries', read: (l) => (l.wheatRoom > 0 && l.wheat >= 0.5 * l.wheatRoom ? [W.granaries, 'full granaries'] : null) },
    { id: 'farms', read: (l) => (at(l, 'farm') >= 3 ? [W.farms, `${at(l, 'farm')} farms at work`] : null) },
    { id: 'bread', read: (l) => (l.eating >= 10 && l.fed >= 0.9 * l.eating ? [W.bread, 'bread on every table'] : null) },
    { id: 'hunger', read: (l) => (l.eating >= 5 && l.hungry >= 0.15 * l.eating ? [-W.hunger, `hunger in ${l.hungry} homes`] : null) },
    { id: 'idle', read: (l) => (n(l, 'farm') - at(l, 'farm') >= 1 ? [-W.idleFields, n(l, 'farm') - at(l, 'farm') === 1 ? 'a field left idle' : `${n(l, 'farm') - at(l, 'farm')} fields left idle`] : null) },
  ],
  athena: [
    { id: 'olives', read: (l) => (at(l, 'grove') >= 2 ? [W.olives, 'olive groves'] : null) },
    { id: 'theatres', read: (l) => (at(l, 'theatre') ? [W.theatres, at(l, 'theatre') === 1 ? 'a theatre' : 'theatres'] : null) },
    { id: 'court', read: (l) => (at(l, 'court') ? [W.athenaCourt, 'a court'] : null) },
  ],
  apollo: [
    { id: 'theatres', read: (l) => (at(l, 'theatre') ? [W.theatres, at(l, 'theatre') === 1 ? 'music at the theatre' : 'music at the theatres'] : null) },
    { id: 'physicians', read: (l) => (at(l, 'infirmary') + at(l, 'asklepieion') ? [W.physicians, 'physicians at work'] : null) },
    { id: 'health', read: (l) => (l.plague && !l.quarantine ? [-W.plague, 'plague left to spread'] : l.sick >= 0 && l.homes >= 10 && l.sick <= 0.02 * l.homes && !l.plague ? [W.healthy, 'a healthy city'] : null) },
  ],
  artemis: [{ id: 'herds', read: (l) => (l.herds < 0 ? null : l.herds >= 0.8 ? [W.herds, 'wild herds left to breed'] : l.herds < 0.5 ? [-W.thinHerds, 'herds hunted thin'] : null) }],
  ares: [
    { id: 'army', read: (l) => (l.soldiers >= 48 ? [W.bigArmy, `a big army (${l.soldiers} men)`] : l.soldiers >= 16 ? [W.army, `an army of ${l.soldiers}`] : l.people >= 1500 ? [-W.noArmy, 'a city with no army to speak of'] : null) },
    { id: 'tribute', read: (l) => (l.tribute ? [-W.tribute, 'you paid tribute'] : null) },
  ],
  aphrodite: [
    { id: 'happy', read: (l) => (l.glad < 0 || l.homes < 10 ? null : l.glad >= 0.8 ? [W.happy, 'happy homes'] : l.glad < 0.5 ? [-W.misery, 'misery in many homes'] : null) },
    { id: 'estates', read: (l) => (l.estates ? [W.estates, l.estates === 1 ? 'a grand estate' : 'grand estates'] : null) },
    { id: 'festivals', read: (l) => (l.festivals ? [W.festivals, 'festivals'] : null) },
    { id: 'executions', read: (l) => (l.executions ? [-W.executions, 'executions in your law'] : null) },
  ],
  hephaestus: [
    { id: 'armouries', read: (l) => (at(l, 'armoury') ? [W.armouries, at(l, 'armoury') === 1 ? 'an armoury at work' : 'armouries at work'] : null) },
    { id: 'mines', read: (l) => (at(l, 'mine') + at(l, 'quarry') ? [W.mines, at(l, 'mine') && at(l, 'quarry') ? 'mines and quarries' : at(l, 'mine') ? 'a mine' : 'a quarry'] : null) },
    { id: 'monuments', read: (l) => (l.monuments ? [W.monuments, l.monuments === 1 ? 'a monument raised' : 'monuments raised'] : null) },
    { id: 'fires', read: (l) => (l.burning ? [-W.fires, l.burning === 1 ? 'a fire burning' : `${l.burning} fires burning`] : null) },
  ],
  hermes: [
    { id: 'routes', read: (l) => (l.routes ? [Math.min(W.routesMost, W.routes * l.routes), l.routes === 1 ? 'a trade route' : `${l.routes} trade routes`] : null) },
    { id: 'trade', read: (l) => (l.sold >= 500 ? [W.trade, 'brisk trade'] : null) },
    { id: 'closed', read: (l) => (l.closedRoads ? [-W.closedRoads, 'closed roads'] : null) },
    { id: 'quarantine', read: (l) => (l.quarantine ? [-W.quarantine, 'your quarantine'] : null) },
  ],
  dionysus: [
    { id: 'vines', read: (l) => (at(l, 'vineyard') + at(l, 'winery') ? [W.vines, at(l, 'winery') ? 'vineyards and wineries' : 'vineyards'] : null) },
    { id: 'theatres', read: (l) => (at(l, 'theatre') ? [W.dionysusTheatres, 'plays at the theatre'] : null) },
    { id: 'festivals', read: (l) => (l.festivals ? [W.festivals, 'festivals'] : null) },
    { id: 'sober', read: (l) => (l.people >= 800 && l.wine <= 0 ? [-W.sober, 'a sober city'] : null) },
  ],
};

/** A god's day of the month: their shrines, what they love and hate in the city, and neglect. */
export function godDay(s: SimState, god: GodId, look: CityLook): void {
  honourShrines(s, god);
  const seen = noticed(s);
  for (const r of READINGS[god]) {
    const v = seen ? r.read(look) : null;
    setStanding(s, god, `city:${r.id}`, v ? v[1] : '', v ? v[0] : 0);
  }
  neglect(s, god);
}

/** Has a god any worship standing now (a shrine, later a sanctuary) or lately? */
function worshippedLately(s: SimState, god: GodId): boolean {
  const w = s.gods.worshipped[god] ?? -1;
  return w >= 0 && s.tick - w < TICKS_PER_YEAR;
}

/** Neglect: a noticed city's god with no worship for a year slides, never below displeased by neglect alone. */
function neglect(s: SimState, god: GodId): void {
  if (!noticed(s) || s.tick - s.gods.noticedAt < TICKS_PER_YEAR || worshippedLately(s, god)) return;
  const step = Math.min(NEGLECT_STEP, Math.max(0, moodOfGod(s, god) - NEGLECT_FLOOR));
  if (step > 0) honour(s, god, -step, 'neglect', 'no shrine, festival or offering in a year', NEGLECT_FADE);
}

// ---------------------------------------------------------------------------
// The step.

/** A festival whose procession is gone (its shrine pulled down while it walked): over, so the god may have another next year. */
function cutShort(s: SimState, map: CoastMap, f: Festival): void {
  s.gods.festivals.splice(s.gods.festivals.indexOf(f), 1);
  const G = GODS[f.god];
  const b = findBuilding(s, f.shrine);
  s.rev++;
  say(s, {
    kind: 'gods',
    u: NEWS,
    title: `${G.name}’s festival is cut short`,
    words: `${G.name}’s festival is cut short: ${b ? `${herOf(f.god)} procession went home` : `${herOf(f.god)} shrine was pulled down, and the procession went home`}. ${G.name} is ${moodWord(moodOfGod(s, f.god))}.`,
    at: b ? { building: b.id } : undefined,
  });
  void map;
}

/** A god whose shrines' standing honour no longer matches how many there are (a shrine pulled down): honoured anew now, not on their day. */
function shrinesChanged(s: SimState): void {
  const count = new Map<GodId, number>();
  for (const b of s.buildings) if (b.kind === 'shrine' && b.god) count.set(b.god, (count.get(b.god) ?? 0) + 1);
  for (const god of GOD_IDS) {
    const now = s.gods.memories[god].find((m) => m.kind === 'shrine')?.amount ?? 0;
    if (now !== shrinesWorth(count.get(god) ?? 0)) honourShrines(s, god);
  }
}

/** The day of the month each god's day falls on (0 the first): Zeus the 2nd, Hera the 4th… Dionysus the 24th. */
export const godDayOf = (i: number): number => 1 + 2 * i;

/** Once a tick, after the gods notice the city (sim.ts): festivals begin; each god's day; the month's record. Nothing with the switch off. */
export function stepWorship(s: SimState, map: CoastMap): void {
  if (!s.gods.on) return;
  for (const f of s.gods.festivals.slice()) {
    if (!f.walker) {
      if (s.tick >= f.day) beginFestival(s, map, f);
    } else if (!s.walkers.some((w) => w.id === f.walker)) cutShort(s, map, f);
  }
  const t = s.tick % TICKS_PER_MONTH;
  if (t % TICKS_PER_DAY !== 0) return;
  // Each day, a god whose shrines are no longer what their honour says (one pulled down) is honoured anew.
  shrinesChanged(s);
  const day = t / TICKS_PER_DAY;
  if (day === 0) record(s, map);
  const i = (day - 1) / 2;
  if (Number.isInteger(i) && i >= 0 && i < GOD_IDS.length) godDay(s, GOD_IDS[i], lookAtCity(s, GOD_IDS[i] === 'aphrodite'));
}

/** How far into a new word a god's mood must go before the news says so (so a mood on an edge isn't told back and forth). */
export const MOOD_NEWS_MARGIN = 2;

/** The word last told of a god's mood, replayed over the record (each a rank, furious 0 to loving 6; -1 with none kept). */
export function toldRank(list: readonly number[]): number {
  let cur = -1;
  for (const v of list) {
    const r = moodRank(v);
    if (cur < 0) cur = r;
    else if ((r < cur && moodRank(v + MOOD_NEWS_MARGIN) < cur) || (r > cur && moodRank(v - MOOD_NEWS_MARGIN) > cur)) cur = r;
  }
  return cur;
}

/**
 * The first of the month: each god's mood into the record; the news of those
 * whose mood has crossed a word (well past its edge), the gods that moved the
 * same way told together; the gods that began to feel neglected last month,
 * told together; homes glad from a procession long ago let go.
 */
function record(s: SimState, map: CoastMap): void {
  const g = s.gods;
  const month = Math.floor(s.tick / TICKS_PER_MONTH);
  if (g.month === month) return;
  g.month = month;
  const up: GodId[] = [];
  const down: GodId[] = [];
  for (const god of GOD_IDS) {
    const list = g.months[god] ?? (g.months[god] = []);
    list.push(moodOfGod(s, god));
    if (list.length > MOOD_MONTHS) list.splice(0, list.length - MOOD_MONTHS);
    const was = toldRank(list.slice(0, -1));
    const is = toldRank(list);
    if (was >= 0 && is !== was) (is > was ? up : down).push(god);
  }
  neglectNews(s);
  if (down.length) moodNews(s, down, false);
  if (up.length) moodNews(s, up, true);
  for (const k of Object.keys(g.festive)) if (s.tick - g.festive[k][0] >= FESTIVE_LASTS || !findBuilding(s, Number(k))) delete g.festive[k];
  void map;
}

/** "Zeus", "Zeus and Hera", "Zeus, Hera and Ares". */
const andList = (w: string[]): string => (w.length <= 1 ? (w[0] ?? '') : `${w.slice(0, -1).join(', ')} and ${w[w.length - 1]}`);
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

/** The gods whose neglect began last month (its first step, two at most), told once together, before it shows in their moods. */
function neglectNews(s: SimState): void {
  const since = s.tick - TICKS_PER_MONTH;
  const cold = GOD_IDS.filter((god) => s.gods.memories[god].some((m) => m.kind === 'neglect' && m.tick >= since && m.amount >= -NEGLECT_STEP));
  if (!cold.length) return;
  const names = cold.map((god) => GODS[god].name);
  const all = cold.length === GOD_IDS.length;
  say(s, {
    kind: 'gods',
    u: WARNING,
    title: all ? 'The gods feel neglected' : cold.length === 1 ? `${names[0]} feels neglected` : `${cap(NUMBER_WORDS[cold.length])} gods feel neglected`,
    words: `${all ? 'All twelve gods have' : `${andList(names)} ${cold.length === 1 ? 'has' : 'have'}`} had no shrine, festival or offering from your city in a year, and ${cold.length === 1 ? 'grows' : 'grow'} colder a little each month (no further than displeased by neglect alone). A shrine dedicated to a god (click a shrine), a festival or an offering stops it, and it fades over a year.`,
  });
}

const cap = (t: string): string => (t ? t[0].toUpperCase() + t.slice(1) : t);

/** Gods whose moods have crossed a word the same way this month: the news, with the weightiest reasons (those they share said once). */
function moodNews(s: SimState, gods: GodId[], up: boolean): void {
  const whys = gods.map((god) =>
    reasonsOf(s, god)
      .filter((r) => (up ? r.worth > 0 : r.worth < 0))
      .slice(0, 3)
      .map((r) => r.why),
  );
  const warn = !up && gods.some((god) => moodRank(moodOfGod(s, god)) <= 2);
  if (gods.length === 1) {
    const god = gods[0];
    const G = GODS[god];
    const word = moodWord(moodOfGod(s, god));
    say(s, { kind: 'gods', u: warn ? WARNING : NEWS, title: `${G.name} is ${word}`, words: `${G.name} is ${word} with your city${whys[0].length ? `: ${whys[0].join('; ')}` : ''}.` });
    return;
  }
  // By word (most gods cross into the same one), each group's names; the reasons all of them share, then each one's own first.
  const words = [...new Set(gods.map((god) => moodWord(moodOfGod(s, god))))];
  const groups = words.map((w) => `${andList(gods.filter((god) => moodWord(moodOfGod(s, god)) === w).map((god) => GODS[god].name))} ${gods.filter((god) => moodWord(moodOfGod(s, god)) === w).length === 1 ? 'is' : 'are'} ${w}`);
  const shared = whys[0].filter((w) => whys.every((l) => l.includes(w)));
  const own = gods.map((god, i) => [GODS[god].name, whys[i].find((w) => !shared.includes(w))] as const).filter(([, w]) => w);
  const title = words.length === 1 ? `${cap(NUMBER_WORDS[gods.length])} gods are ${words[0]}` : `${cap(NUMBER_WORDS[gods.length])} gods are ${up ? 'warmer' : 'colder'}`;
  say(s, {
    kind: 'gods',
    u: warn ? WARNING : NEWS,
    title,
    words: `${groups.join('; ')} with your city${shared.length ? `: ${shared.join('; ')}` : ''}.${own.length ? ` ${own.map(([n, w]) => `${n}: ${w}`).join('; ')}.` : ''}`,
  });
}

/** What a procession or an offering's porter is doing, for the hover tip (status.ts). */
export function worshipWalkerStatus(_s: SimState, w: Walker): { title: string; detail: string } {
  const god = GOD_IDS[w.steps];
  const G = god ? GODS[god] : null;
  if (w.kind === 'procession') {
    return {
      title: G ? `The procession for ${G.name}` : 'A procession',
      detail: `${G ? `${G.name}’s festival: ` : ''}priestesses and townsfolk in white and ${G ? `${G.name}’s colour` : 'colour'}, walking from the shrine round the agora and back · ${w.load === 1 ? 'one home' : `${w.load} homes`} glad so far, for a season`,
    };
  }
  return {
    title: G ? `An offering to ${G.name}` : 'An offering',
    detail: `Carrying ${goodsWords(w.food, w.load)} from the stores to ${G ? `${G.name}’s` : 'the'} shrine · ${G ? `${G.name} is honoured when it arrives` : 'the god is honoured when it arrives'}`,
  };
}
