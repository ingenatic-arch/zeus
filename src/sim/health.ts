/**
 * Health, sickness and plague (slice 49).
 *
 * Every lived-in home has a health from 0 to 100 (`Building.health`; 0 means
 * not yet reckoned, and a home takes its fair level on its first day). Once a
 * day, staggered by id as the homes are, it moves toward its fair level (up
 * HEALTH_UP a day, down HEALTH_DOWN): 50 and a sum of named reasons (healthOf)
 * for water, food, a physician's call, an asklepieion near by, crowding,
 * winter and the foul air of a hunting lodge, a dairy, a pasture or the
 * caravans' tannery yard.
 *
 * A home of low health can fall ill: one of its members is sick for a
 * while, doesn't work (labour.ts's awayAt counts them), and mends or dies;
 * each sick home gives its neighbours of low health a chance of it too. A
 * physician from an infirmary (a crew of three on a round, as a shrine sends
 * priestesses) calls on every home beside her way and tends the sick there;
 * an asklepieion's stretcher-bearers carry the sick to its beds, where they
 * mend faster and die less often, and it lifts the health of the homes around.
 *
 * Plague comes on a ship or caravan from a plagued city of Greece (the town is
 * warned as soon as a city it trades with has it, and a trader brings it ashore
 * only WARN_LEAD after that), or rises in a crowded, sickly quarter in summer
 * (a fever, warned of, that turns to plague if it lingers). It spreads fast
 * from home to home, people die, households flee, and every mood drops. It
 * ends when nobody has it any more, which is always soon after its `until`
 * (no new homes are struck after it, and every illness has an end).
 *
 * Quarantine (a command) closes the quay and the roads in for a season: a
 * ship rides at anchor off the quay, caravans turn back at the edge, the
 * dockers and a colony's porters stop (routes.ts, trade.ts, colonyworks.ts
 * read `quarantined`).
 *
 * Nothing moves while the switch (`health.on`) is off: a bare state and a
 * demo's history are played that way. Turned on, every home's health is set
 * to its fair level, nobody falls ill for GRACE, and no plague comes for a year.
 *
 * Every chance is a hash of the seed (`unit`), never a draw from the state's
 * generators. Walker fields: a physician is a service walker (rounds.ts); a
 * bearer pair's `origin` is its asklepieion, `target` the home, `load` the sick
 * one's id, `food` 1 once laden, `wait` ticks lifting at the door.
 */
import type { CoastMap } from '../map/bake';
import { CITY_IDS, PLACES } from '../map/greece';
import { mapOf } from '../map/lands';
import { dhypot } from '../map/dmath';
import { around, capacity, centreOf, findBuilding, footSide, HUT, levelName, livedIn, recountPopulation } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { whereOf } from './crime';
import { ageOf, kinship, tell } from './folk';
import { FOODS, foodUntil } from './foods';
import { unit } from './hazards';
import { rateOf } from './labour';
import { ALARM, NEWS, say, WARNING, type Saying } from './messages';
import { roadSearch, tracePath } from './roads';
import { CREW, crewClock, CREW_GAP, door, moveRounds, roadsBeside, sendOut, type ServiceSpec } from './rounds';
import { seasonAt, seasonOf, SUMMER, TICKS_PER_SEASON, WINTER } from './seasons';
import { sendLeavers } from './settlers';
import { TILE_ROAD, type Building, type SimState, type Walker } from './state';
import { besideRoad, CARRIER_SPEED, centre, newWalker, position, setPath, WALK_SPEED } from './walk';
import { restFor } from './water';

// ---------------------------------------------------------------------------
// State.

/** One of a household ill now. */
export interface Sick {
  /** Its own number (a bearer pair names who it carries by it). */
  id: number;
  home: number;
  name: string;
  female: boolean;
  since: number;
  /** The tick it ends: they mend, or die. */
  until: number;
  /** 1: the plague. */
  plague: 0 | 1;
  /** The tick a physician (or the asklepieion's staff) last tended them (0: never). */
  tended: number;
  /** Where they lie: 0 at home; an asklepieion's id, in its bed; minus its id, its bearers on their way or carrying them. */
  bed: number;
}

/** A city of Greece with plague: from when until when, and when your town was warned (0: not yet; it trades with you). */
export interface GreekPlague {
  city: string;
  from: number;
  until: number;
  warned: number;
}

/** Plague in your city. */
export interface Outbreak {
  /** The city it came from, or '' for a quarter of your own. */
  from: string;
  start: number;
  /** After this, no new home is struck. */
  until: number;
  /** The homes struck, first first. */
  struck: number[];
  ill: number;
  dead: number;
  fled: number;
}

/** A fevered quarter in summer: the home at its heart, since when, and how many sickly homes. */
export interface Fever {
  home: number;
  since: number;
  homes: number;
}

export interface HealthTally {
  ill: number;
  mended: number;
  died: number;
  fled: number;
}

export interface Health {
  on: boolean;
  /** The tick it was turned on (the grace and the year without plague count from it). */
  since: number;
  /** The next Sick's id. */
  next: number;
  sick: Sick[];
  greece: GreekPlague[];
  outbreak: Outbreak | null;
  fever: Fever | null;
  /** The tick the quarantine ends (0: none). */
  quarantine: number;
  /** The tick the last outbreak ended (0: none yet). */
  lastPlague: number;
  /** Months since the founding the `now` tally is for. */
  month: number;
  now: HealthTally;
  last: HealthTally;
}

export const freshTally = (): HealthTally => ({ ill: 0, mended: 0, died: 0, fled: 0 });

export function freshHealth(on = false, since = 0): Health {
  return { on, since, next: 1, sick: [], greece: [], outbreak: null, fever: null, quarantine: 0, lastPlague: 0, month: Math.floor(since / TICKS_PER_MONTH), now: freshTally(), last: freshTally() };
}

// ---------------------------------------------------------------------------
// The numbers.

/** Nobody falls ill for this long after health is turned on. */
export const GRACE = 4 * TICKS_PER_MONTH;
/** No plague for this long after health is turned on (a new game: the town's first year). */
export const PLAGUE_FREE = TICKS_PER_YEAR;
/** A day's move toward the fair level. */
export const HEALTH_UP = 2;
export const HEALTH_DOWN = 1;
export const HEALTH_MIN = 5;
export const HEALTH_MAX = 95;
/** Below this a home can fall ill of itself: (SICK_BELOW - health) / SICK_ODDS a day. */
export const SICK_BELOW = 35;
export const SICK_ODDS = 600;
/** A sick home gives every home within SPREAD_TILES below SPREAD_BELOW this chance a day. */
export const SPREAD_TILES = 3;
export const SPREAD_BELOW = 45;
export const SPREAD_CHANCE = 0.02;
/** How long an illness lasts, in days: a fever and the plague. */
export const SICK_DAYS: readonly [number, number] = [10, 20];
export const PLAGUE_SICK_DAYS: readonly [number, number] = [8, 14];
/** The chance it ends in death: a fever and the plague, before what lowers or raises it. */
export const DEATH = 0.08;
export const PLAGUE_DEATH = 0.35;
/** Once a month, each city of Greece's chance of plague; it lasts two to four months. */
export const GREEK_ODDS = 1 / 150;
/** A trader from a plagued city brings it only this long after your town was warned. */
export const WARN_LEAD = 10 * TICKS_PER_DAY;
/** A fevered quarter: a home below FEVER_BELOW with FEVER_HOMES in all within FEVER_TILES; plague if it lasts FEVER_DAYS. */
export const FEVER_BELOW = 30;
export const FEVER_HOMES = 6;
export const FEVER_TILES = 4;
export const FEVER_DAYS = 20;
/** An outbreak strikes new homes for this long, within PLAGUE_TILES of a home with it, below PLAGUE_BELOW. */
export const PLAGUE_DAYS = 60;
export const PLAGUE_TILES = 5;
export const PLAGUE_BELOW = 75;
/** A struck home with the plague in it: its household's chance a day of fleeing the city. */
export const FLEE_CHANCE = 0.03;
/** The quarantine lasts a season. */
export const QUARANTINE_TICKS = TICKS_PER_SEASON;
/** The physician: how far by road, how much fresh road a round, her rest, and the first. */
export const PHYSICIAN_RANGE = 32;
export const PHYSICIAN_WALK = 64;
export const PHYSICIAN_REST = 30;
export const FIRST_PHYSICIAN = 20;
/** The asklepieion: beds, how far its bearers go by road, how often they set off, and how much faster and safer a bed is. */
export const BEDS = 8;
export const BEARER_RANGE = 40;
export const BEARER_GAP = 20;
export const BEARER_LIFT = 2 * TICKS_PER_DAY;
export const BED_MEND = 0.6;
export const BED_DEATH = 0.3;
/** The asklepieion's reach for lifting health and checking the plague (tiles). */
export const TEMPLE_TILES = 12;
/** Foul air carries this far (tiles between footprints). */
export const FOUL_TILES = 4;

const SALT_ILL = 4901;
const SALT_WHO = 4902;
const SALT_DAYS = 4903;
const SALT_DEATH = 4904;
const SALT_GREEK = 4905;
const SALT_LONG = 4906;
const SALT_STRIKE = 4907;
const SALT_MANY = 4908;
const SALT_FLEE = 4909;

/** Is the city under quarantine now? */
export const quarantined = (s: SimState): boolean => (s.health?.quarantine ?? 0) > s.tick;

// ---------------------------------------------------------------------------
// A home's health.

export interface HealthReason {
  text: string;
  w: number;
}

const FOUL_WORDS: Partial<Record<Building['kind'], string>> = {
  lodge: 'Foul air from the hunting lodge',
  dairy: 'Foul air from the dairy',
  pasture: 'Foul air from the pasture’s pens',
  yard: 'Foul air from the caravans’ tannery yard',
};

/** The gap in tiles between two footprints (0: touching or overlapping). */
function gap(a: Building, b: Building): number {
  const sa = footSide(a);
  const sb = footSide(b);
  const dx = Math.max(0, a.x - (b.x + sb), b.x - (a.x + sa));
  const dz = Math.max(0, a.z - (b.z + sb), b.z - (a.z + sa));
  return Math.max(dx, dz);
}

interface Around {
  tick: number;
  rev: number;
  foul: Building[];
  temples: Building[];
  infirmaries: number;
  sickHomes: Set<number>;
  plagueHomes: Building[];
  feverHomes: Building[];
}
const aroundCache = new WeakMap<SimState, Around>();

/** What a home's health depends on beyond itself, gathered once a tick (a pure reading of the state). */
function aroundOf(s: SimState): Around {
  const hit = aroundCache.get(s);
  if (hit && hit.tick === s.tick && hit.rev === s.rev) return hit;
  const a: Around = { tick: s.tick, rev: s.rev, foul: [], temples: [], infirmaries: 0, sickHomes: new Set(), plagueHomes: [], feverHomes: [] };
  for (const b of s.buildings) {
    if (FOUL_WORDS[b.kind]) a.foul.push(b);
    else if (b.kind === 'asklepieion' && b.workers > 0) a.temples.push(b);
    else if (b.kind === 'infirmary') a.infirmaries++;
  }
  const plague = new Set<number>();
  for (const x of s.health?.sick ?? []) {
    if (x.bed !== 0) continue;
    if (x.plague) plague.add(x.home);
    else a.sickHomes.add(x.home);
  }
  for (const id of plague) {
    const h = findBuilding(s, id);
    if (h) a.plagueHomes.push(h);
  }
  for (const id of a.sickHomes) {
    const h = findBuilding(s, id);
    if (h) a.feverHomes.push(h);
  }
  aroundCache.set(s, a);
  return a;
}

/** "today", "yesterday", "3 days ago", "last week", "5 weeks ago". */
function agoWords(ticks: number): string {
  const d = Math.floor(ticks / TICKS_PER_DAY);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d} days ago`;
  if (d < 14) return 'last week';
  return `${Math.round(d / 7)} weeks ago`;
}

/** A staffed asklepieion within TEMPLE_TILES of a home. */
export const nearTemple = (s: SimState, b: Building): boolean => aroundOf(s).temples.some((t) => gap(t, b) <= TEMPLE_TILES);

/**
 * A home's fair level of health and why: 50, and its reasons, kept between
 * HEALTH_MIN and HEALTH_MAX. A pure reading of the state.
 */
export function healthOf(s: SimState, b: Building): { value: number; reasons: HealthReason[] } {
  const reasons: HealthReason[] = [];
  const add = (w: number, text: string): void => void reasons.push({ text, w });
  const t = s.tick;
  const wet = b.waterUntil > t;
  if (wet) add(10, 'Clean water from the fountain');
  else if (b.level >= HUT) add(-15, 'No clean water');
  else add(-5, 'River water');
  if (b.level >= HUT) {
    const kinds = FOODS.filter((f) => foodUntil(b, f) > t).length;
    if (kinds === 0) add(-20, 'Hungry');
    else if (kinds === 1) add(5, 'Enough to eat');
    else if (kinds === 2) add(10, 'A varied table');
    else add(15, 'A rich and varied table');
  }
  const a = aroundOf(s);
  const since = b.physician > 0 ? t - b.physician : Infinity;
  if (since <= TICKS_PER_MONTH) add(25, `The physician called ${agoWords(since)}`);
  else if (since <= TICKS_PER_SEASON) add(10, `The physician called ${agoWords(since)}`);
  else add(0, a.infirmaries ? 'No physician this season' : 'No physician in the city');
  if (a.temples.some((x) => gap(x, b) <= TEMPLE_TILES)) add(10, 'The asklepieion nearby');
  if (b.level >= HUT && b.people >= capacity(b)) add(-8, 'Crowded');
  if (seasonOf(s) === WINTER) add(-8, 'Winter’s chill');
  let foul: Building | null = null;
  let fg = Infinity;
  for (const f of a.foul) {
    const g = gap(f, b);
    if (g <= FOUL_TILES && g < fg) {
      fg = g;
      foul = f;
    }
  }
  if (foul) add(-10, FOUL_WORDS[foul.kind] as string);
  let v = 50;
  for (const r of reasons) v += r.w;
  return { value: Math.max(HEALTH_MIN, Math.min(HEALTH_MAX, v)), reasons };
}

/** Health in a word. */
export const healthWord = (v: number): string => (v >= 75 ? 'Healthy' : v >= 50 ? 'Well' : v >= 30 ? 'Sickly' : 'Ailing');

/** "Healthy: the physician called last week", "Sickly: crowded, no physician this season" (the two reasons that count most for how it stands). */
export function healthLine(s: SimState, b: Building): string {
  const v = b.health > 0 ? b.health : healthOf(s, b).value;
  const { reasons } = healthOf(s, b);
  const good = v >= 50;
  const pick = reasons
    .filter((r) => (good ? r.w > 0 : r.w <= 0))
    .sort((x, y) => (good ? y.w - x.w : x.w - y.w))
    .slice(0, 2)
    .map((r) => r.text.charAt(0).toLowerCase() + r.text.slice(1));
  return pick.length ? `${healthWord(v)}: ${pick.join(', ')}` : healthWord(v);
}

// ---------------------------------------------------------------------------
// The switch and the quarantine (commands).

/** Turn health on or off. Turned on, every lived-in home takes its fair level at once. */
export function setHealth(s: SimState, on: boolean): void {
  const h = s.health;
  if (h.on === on) return;
  h.on = on;
  if (!on) return;
  h.since = s.tick;
  h.month = Math.floor(s.tick / TICKS_PER_MONTH);
  for (const b of s.buildings) if (livedIn(b) && b.family) b.health = healthOf(s, b).value;
}

/** Order a quarantine for a season, or lift it. */
export function quarantineCommand(s: SimState, on: boolean): void {
  const h = s.health;
  if (on) {
    if (quarantined(s)) return;
    h.quarantine = s.tick + QUARANTINE_TICKS;
    tellHealth(s, { kind: 'plague', u: NEWS, title: 'Quarantine', words: 'The city is under quarantine for a season: ships from Greece ride at anchor off the quay, caravans are turned back at the edge of your land, and the dockers stay in. No trade comes in or goes out until it is lifted or ends.' });
  } else if (h.quarantine > 0) {
    h.quarantine = 0;
    tellHealth(s, { kind: 'plague', u: NEWS, title: 'Quarantine lifted', words: 'The quarantine is lifted: ships may tie up at the quay again, and caravans come in.' });
  }
  s.rev++;
}

/** Say something about health (one place, so its urgencies are set here: see HEALTH_URGENCY). */
function tellHealth(s: SimState, m: Saying): void {
  say(s, m);
}

/**
 * How urgent health's news is: plague breaking out in your city is an alarm
 * (it pops up); plague in a city you trade with and a fevered quarter are
 * warnings; deaths, recoveries, the quarantine and the plague's end are news.
 */
export const HEALTH_URGENCY = { outbreak: ALARM, greece: WARNING, fever: WARNING, died: NEWS, ended: NEWS, quarantine: NEWS } as const;

// ---------------------------------------------------------------------------
// Each tick.

/** Health, sickness and plague, once a tick (nothing with the switch off but the quarantine running out). */
export function stepHealth(s: SimState, map: CoastMap): void {
  const h = s.health;
  if (h.quarantine > 0 && s.tick >= h.quarantine) {
    h.quarantine = 0;
    tellHealth(s, { kind: 'plague', u: HEALTH_URGENCY.quarantine, title: 'Quarantine over', words: 'The quarantine has run its season: ships tie up at the quay again, and caravans come in.' });
    s.rev++;
  }
  if (!h.on) return;
  if (s.tick % TICKS_PER_MONTH === 0) {
    const m = Math.floor(s.tick / TICKS_PER_MONTH);
    if (m !== h.month) {
      h.month = m;
      h.last = h.now;
      h.now = freshTally();
    }
    stepGreece(s);
  }
  if (s.tick % TICKS_PER_DAY === 0) {
    warnGreece(s);
    mendBeds(s);
    stepFever(s, map);
    stepOutbreak(s, map);
  }
  stepHomes(s, map);
  stepSick(s, map);
}

const day = (s: SimState): number => Math.floor(s.tick / TICKS_PER_DAY);

/** Each home on its day: its health moves toward its fair level, and it may fall ill. */
function stepHomes(s: SimState, map: CoastMap): void {
  const h = s.health;
  const ill = s.tick >= h.since + GRACE;
  for (const b of s.buildings) {
    if (b.kind !== 'home') continue;
    if (!livedIn(b) || !b.family) {
      if (b.health !== 0) b.health = 0;
      continue;
    }
    if ((s.tick + b.id) % TICKS_PER_DAY !== 0 && b.health > 0) continue;
    const fair = healthOf(s, b).value;
    if (b.health <= 0) b.health = fair;
    else if (b.health < fair) b.health = Math.min(fair, b.health + HEALTH_UP);
    else if (b.health > fair) b.health = Math.max(fair, b.health - HEALTH_DOWN);
    if (ill) mayFallIll(s, map, b);
  }
}

/** A home's daily chance of falling ill: of itself, and from sick neighbours. */
function mayFallIll(s: SimState, map: CoastMap, b: Building): void {
  let p = b.health < SICK_BELOW ? (SICK_BELOW - b.health) / SICK_ODDS : 0;
  if (b.health < SPREAD_BELOW) for (const o of aroundOf(s).feverHomes) if (o !== b && gap(o, b) <= SPREAD_TILES) p += SPREAD_CHANCE;
  if (p <= 0) return;
  if (unit(s.seed, b.id, day(s), SALT_ILL) >= p) return;
  const f = b.family!;
  // (Half a household sick at once at most.)
  const sick = s.health.sick.filter((x) => x.home === b.id).length;
  if (sick * 2 >= f.members.length) return;
  fallIll(s, map, b, false);
}

/** One of a household falls ill (a fever, or the plague): who isn't already. Returns them, or null. */
export function fallIll(s: SimState, map: CoastMap, b: Building, plague: boolean, salt = 0): Sick | null {
  const f = b.family;
  if (!f) return null;
  const h = s.health;
  const well = f.members.filter((p) => !h.sick.some((x) => x.home === b.id && x.name === p.name && x.female === p.female));
  if (!well.length) return null;
  const p = well[Math.floor(unit(s.seed, b.id, day(s) + salt * 7919, SALT_WHO) * well.length)];
  const [lo, hi] = plague ? PLAGUE_SICK_DAYS : SICK_DAYS;
  const days = lo + Math.floor(unit(s.seed, b.id, day(s) + salt * 7919, SALT_DAYS) * (hi - lo + 1));
  const x: Sick = { id: h.next++, home: b.id, name: p.name, female: p.female, since: s.tick, until: s.tick + days * TICKS_PER_DAY, plague: plague ? 1 : 0, tended: 0, bed: 0 };
  h.sick.push(x);
  h.now.ill++;
  if (plague && h.outbreak) h.outbreak.ill++;
  tell(s, f, 'ill', b.level, [p.name]);
  f.story[f.story.length - 1].n = plague ? 1 : 0;
  s.rev++;
  aroundCache.delete(s);
  void map;
  return x;
}

/** The sick: each, when its time is up, mends or dies; anyone whose home or household is gone is let go. */
function stepSick(s: SimState, map: CoastMap): void {
  const h = s.health;
  if (!h.sick.length) return;
  let changed = false;
  const keep: Sick[] = [];
  for (const x of h.sick) {
    const home = findBuilding(s, x.home);
    const f = home && home.kind === 'home' ? home.family : null;
    const p = f?.members.find((m) => m.name === x.name && m.female === x.female);
    if (!home || !f || !p) {
      changed = true;
      continue;
    }
    if (s.tick < x.until) {
      keep.push(x);
      continue;
    }
    changed = true;
    let chance = x.plague ? PLAGUE_DEATH : DEATH;
    if (x.tended >= x.since && x.tended > 0) chance *= 0.5;
    if (x.bed > 0) chance *= BED_DEATH;
    const age = ageOf(s, p);
    if (age >= 55 || age < 5) chance *= 2;
    if (home.health > 0 && home.health < 20) chance *= 1.5;
    if (unit(s.seed, x.id, 0, SALT_DEATH) < Math.min(0.9, chance)) die(s, map, home, x, kinship(p));
    else {
      h.now.mended++;
      tell(s, f, 'mended', home.level, [x.name]);
      f.story[f.story.length - 1].n = x.plague;
    }
  }
  if (changed) {
    h.sick = keep;
    aroundCache.delete(s);
    s.rev++;
  }
}

/** One of a household dies of it: the household loses them and mourns; the town hears of a fever's death (the plague's are counted). */
function die(s: SimState, map: CoastMap, home: Building, x: Sick, kin: string): void {
  const f = home.family!;
  const name = f.name;
  const i = f.members.findIndex((p) => p.name === x.name && p.female === x.female);
  tell(s, f, 'died', home.level, [x.name]);
  f.story[f.story.length - 1].n = x.plague;
  if (i >= 0) {
    f.members.splice(i, 1);
    home.people = Math.max(0, home.people - 1);
    if (f.members.length === 0) home.family = null;
    recountPopulation(s);
  }
  s.health.now.died++;
  if (x.plague && s.health.outbreak) s.health.outbreak.dead++;
  if (!x.plague) {
    const where = x.bed > 0 ? 'in the asklepieion' : `in ${levelName(home.level, 'the')} ${whereOf(map, home)}`;
    tellHealth(s, { kind: 'sickness', u: HEALTH_URGENCY.died, words: `${x.name} (${kin === 'head of the house' ? 'head of the house' : kin}) of the house of ${name} died of a fever ${where}.${x.tended >= x.since && x.tended > 0 ? '' : ' No physician had called.'}`, at: { building: home.id } });
  }
}

// ---------------------------------------------------------------------------
// Plague in Greece.

/** Does your city trade with this city (a route, or Tyre's ship with a trading post)? */
export function tradesWith(s: SimState, city: string): boolean {
  if (s.world.routes.some((r) => r.city === city)) return true;
  return city === 'tyre' && s.buildings.some((b) => b.kind === 'trading');
}

const cityName = (id: string): string => PLACES[id]?.name ?? id;

/** Plague now in a city of Greece (or Tyre). */
export const plagueIn = (s: SimState, city: string): GreekPlague | undefined => s.health?.greece.find((p) => p.city === city && s.tick >= p.from && s.tick < p.until);

/** Once a month: a city of Greece may fall to plague; one whose plague has run its course is free of it. */
function stepGreece(s: SimState): void {
  const h = s.health;
  const ended = h.greece.filter((p) => s.tick >= p.until);
  for (const p of ended) if (p.warned > 0) tellHealth(s, { kind: 'plague', u: HEALTH_URGENCY.ended, title: `Plague in ${cityName(p.city)} over`, words: `The plague in ${cityName(p.city)} has passed. Her traders are safe to take in again.`, at: { city: p.city } });
  if (ended.length) h.greece = h.greece.filter((p) => s.tick < p.until);
  if (s.tick < h.since + PLAGUE_FREE) return;
  const m = Math.floor(s.tick / TICKS_PER_MONTH);
  CITY_IDS.forEach((city, i) => {
    if (city === 'home' || h.greece.some((p) => p.city === city)) return;
    if (unit(s.seed, i, m, SALT_GREEK) >= GREEK_ODDS) return;
    const months = 2 + Math.floor(unit(s.seed, i, m, SALT_LONG) * 3);
    startGreekPlague(s, city, months * TICKS_PER_MONTH);
  });
}

/** Plague breaks out in a city of Greece for so long (exported for the demos and tests). */
export function startGreekPlague(s: SimState, city: string, ticks: number): GreekPlague {
  const p: GreekPlague = { city, from: s.tick, until: s.tick + ticks, warned: 0 };
  s.health.greece.push(p);
  if (!tradesWith(s, city)) tellHealth(s, { kind: 'plague', u: NEWS, title: `Plague in ${cityName(city)}`, words: `Plague in ${cityName(city)}. None of their traders comes to your city, so it can’t reach you from there.`, at: { city } });
  else warnOf(s, p);
  return p;
}

/** When the next trader from a city is due, in words ("her ship is due in 24 days"), or ''. */
export function traderDue(s: SimState, city: string): string {
  const days = (t: number): number => Math.max(1, Math.ceil((t - s.tick) / TICKS_PER_DAY));
  const parts: string[] = [];
  for (const r of s.world.routes) {
    if (r.city !== city) continue;
    const what = r.kind === 'sea' ? 'her ship' : 'her caravan';
    const due = r.next <= s.tick ? 'any day' : `in ${days(r.next) === 1 ? 'a day' : `${days(r.next)} days`}`;
    // (Where her ship is, not a day that has passed: SHIP_AWAY 0, COMING 1, MOORED 2, LEAVING 3, ANCHORED 4, BERTHING 5, in trade.ts.)
    const phase = r.kind === 'sea' && r.ship ? r.ship.phase : 0;
    if (phase === 1) parts.push(`her ship is sailing in, due at the jetty ${due}`);
    else if (phase === 4) parts.push('her ship rides at anchor off the quay');
    else if (phase === 2 || phase === 5) parts.push('her ship is at the jetty');
    else if (phase === 3) parts.push('her ship is sailing home');
    else parts.push(`${what} is due ${due}`);
  }
  if (city === 'tyre' && s.trade.ship.due > s.tick) parts.push(`the Tyrian ship is due in ${days(s.trade.ship.due) === 1 ? 'a day' : `${days(s.trade.ship.due)} days`}`);
  return parts.join(', and ');
}

/** Warn the town of plague in a city it trades with. */
function warnOf(s: SimState, p: GreekPlague): void {
  p.warned = s.tick;
  const name = cityName(p.city);
  const due = traderDue(s, p.city);
  tellHealth(s, {
    kind: 'plague',
    u: HEALTH_URGENCY.greece,
    title: `Plague in ${name}`,
    words: `Plague in ${name}${due ? `: ${due}` : ''}, and a trader of theirs may bring it ashore from ${Math.round(WARN_LEAD / TICKS_PER_DAY)} days from now. A quarantine (on the infirmary’s or trading post’s panel) would hold them off for a season; physicians, water and food keep homes strong against it.`,
    at: { city: p.city },
  });
}

/** Once a day: warn of plague in a city you have only now begun trading with. */
function warnGreece(s: SimState): void {
  for (const p of s.health.greece) if (p.warned === 0 && s.tick < p.until && tradesWith(s, p.city)) warnOf(s, p);
}

/**
 * A trader from `city` has reached your city (`at`: the trading post or the
 * caravan yard): if the city has plague and your town was warned at least
 * WARN_LEAD ago, it comes ashore at the homes nearest it.
 */
export function landed(s: SimState, city: string, at: Building): void {
  const h = s.health;
  if (!h?.on || h.outbreak || quarantined(s)) return;
  const p = plagueIn(s, city);
  if (!p || p.warned === 0 || s.tick < p.warned + WARN_LEAD) return;
  const [cx, cz] = centreOf(at);
  let best: Building | null = null;
  let bd = Infinity;
  for (const b of s.buildings) {
    if (!livedIn(b) || !b.family) continue;
    const [x, z] = centreOf(b);
    const d = dhypot(x - cx, z - cz);
    if (d < bd) {
      bd = d;
      best = b;
    }
  }
  if (best) startOutbreak(s, mapOf(s), city, best, at.kind === 'yard' ? 'the caravan' : 'the ship');
}

// ---------------------------------------------------------------------------
// Plague in your city.

/** Plague breaks out at a home (from a city of Greece, or '' from a fevered quarter). */
export function startOutbreak(s: SimState, map: CoastMap, from: string, home: Building, by = 'the ship'): void {
  const h = s.health;
  h.fever = null;
  h.outbreak = { from, start: s.tick, until: s.tick + PLAGUE_DAYS * TICKS_PER_DAY, struck: [], ill: 0, dead: 0, fled: 0 };
  strike(s, map, home);
  const name = home.family?.name ?? '';
  const how = from ? `It came in with ${by} from ${cityName(from)}` : 'It rose in the fevered quarter';
  tellHealth(s, {
    kind: 'plague',
    u: HEALTH_URGENCY.outbreak,
    title: 'Plague in the city',
    words: `Plague in the city! ${how}: ${levelName(home.level, 'the')} of ${name} ${whereOf(map, home)} has it. It spreads to homes nearby, worst where health is poor, and families will flee. Physicians and an asklepieion save lives; it passes in a season or so.`,
    at: { building: home.id },
  });
  s.rev++;
}

/** A home struck by the plague: one to a third of its household fall ill of it. */
function strike(s: SimState, map: CoastMap, b: Building): void {
  const o = s.health.outbreak;
  if (!o || !b.family || o.struck.includes(b.id)) return;
  o.struck.push(b.id);
  const n = 1 + Math.floor(unit(s.seed, b.id, day(s), SALT_MANY) * Math.max(1, Math.floor(b.people / 3)));
  for (let k = 0; k < n; k++) fallIll(s, map, b, true, k + 1);
}

/** Once a day: the plague spreads to homes near those with it, struck households may flee, and it ends when nobody has it. */
function stepOutbreak(s: SimState, map: CoastMap): void {
  const h = s.health;
  const o = h.outbreak;
  if (!o) return;
  const a = aroundOf(s);
  const sources = a.plagueHomes;
  if (s.tick < o.until && sources.length) {
    const hit: Building[] = [];
    for (const b of s.buildings) {
      if (!livedIn(b) || !b.family || o.struck.includes(b.id) || b.health >= PLAGUE_BELOW) continue;
      if (!sources.some((src) => gap(src, b) <= PLAGUE_TILES)) continue;
      let p = 0.03 + (0.12 * (PLAGUE_BELOW - Math.max(0, b.health))) / PLAGUE_BELOW;
      if (a.temples.some((t) => gap(t, b) <= TEMPLE_TILES)) p *= 0.5;
      if (unit(s.seed, b.id, day(s), SALT_STRIKE) < p) hit.push(b);
    }
    for (const b of hit) strike(s, map, b);
  }
  // Households with the plague in the house may flee the city whole.
  for (const id of o.struck) {
    const b = findBuilding(s, id);
    if (!b || !livedIn(b) || !b.family) continue;
    if (!h.sick.some((x) => x.home === id && x.plague && x.bed === 0)) continue;
    if (unit(s.seed, id, day(s), SALT_FLEE) < FLEE_CHANCE) flee(s, map, b);
  }
  if (!h.sick.some((x) => x.plague) && s.tick > o.start) {
    h.outbreak = null;
    h.lastPlague = s.tick;
    const fromWords = o.from ? ` that came from ${cityName(o.from)}` : '';
    tellHealth(s, { kind: 'plague', u: HEALTH_URGENCY.ended, title: 'The plague has passed', words: `The plague${fromWords} has passed. ${o.ill} fell ill of it in ${o.struck.length} ${o.struck.length === 1 ? 'home' : 'homes'}; ${o.dead} died, and ${o.fled} ${o.fled === 1 ? 'household' : 'households'} fled the city. The city mourns, and goes on.` });
    s.rev++;
  }
}

/** A household flees the plague: all of them walk out of the city, and their home stands empty. */
function flee(s: SimState, map: CoastMap, home: Building): void {
  const people = home.people;
  s.left += people;
  home.people = 0;
  home.family = null;
  home.workers = 0;
  home.unpaid = 0;
  home.tempt = 0;
  home.health = 0;
  s.health.sick = s.health.sick.filter((x) => x.home !== home.id);
  s.crime.cases = s.crime.cases.filter((x) => x.home !== home.id);
  s.crime.held = s.crime.held.filter((x) => x.home !== home.id);
  recountPopulation(s);
  sendLeavers(s, map, people, centreOf(home), around(map.size, home));
  s.health.now.fled++;
  if (s.health.outbreak) s.health.outbreak.fled++;
  aroundCache.delete(s);
  s.rev++;
}

/** Once a day in summer: a crowded, sickly quarter is a fever, warned of; if it lingers FEVER_DAYS it turns to plague; if it mends, or summer ends, it passes. */
function stepFever(s: SimState, map: CoastMap): void {
  const h = s.health;
  const can = !h.outbreak && s.tick >= h.since + PLAGUE_FREE && (h.lastPlague === 0 || s.tick >= h.lastPlague + TICKS_PER_YEAR) && seasonAt(s.tick) === SUMMER;
  const q = can ? feverQuarter(s) : null;
  if (!h.fever) {
    if (!q) return;
    h.fever = { home: q.home.id, since: s.tick, homes: q.homes };
    tellHealth(s, {
      kind: 'plague',
      u: HEALTH_URGENCY.fever,
      title: 'Fever in a quarter',
      words: `Fever in the crowded homes ${whereOf(map, q.home)}: ${q.homes} homes there are sickly or ailing. If it lingers ${FEVER_DAYS} days into the summer it may turn to plague. Water, food and a physician’s calls would lift them.`,
      at: { building: q.home.id },
    });
    return;
  }
  if (!q) {
    const at = findBuilding(s, h.fever.home);
    h.fever = null;
    if (!h.outbreak) tellHealth(s, { kind: 'sickness', u: NEWS, title: 'The fever has passed', words: `The fever ${at ? whereOf(map, at) : 'in the city'} has passed without turning to plague.` });
    return;
  }
  h.fever.home = q.home.id;
  h.fever.homes = q.homes;
  if (s.tick >= h.fever.since + FEVER_DAYS * TICKS_PER_DAY) startOutbreak(s, map, '', q.home);
}

/** The worst crowded, sickly quarter: the home below FEVER_BELOW with the most such homes within FEVER_TILES, if they are FEVER_HOMES or more. */
export function feverQuarter(s: SimState): { home: Building; homes: number } | null {
  const low = s.buildings.filter((b) => livedIn(b) && b.family && b.health > 0 && b.health < FEVER_BELOW);
  if (low.length < FEVER_HOMES) return null;
  let best: Building | null = null;
  let most = 0;
  for (const b of low) {
    let n = 0;
    for (const o of low) if (gap(o, b) <= FEVER_TILES) n++;
    if (n > most) {
      most = n;
      best = b;
    }
  }
  return best && most >= FEVER_HOMES ? { home: best, homes: most } : null;
}

// ---------------------------------------------------------------------------
// The infirmary's physicians.

/** A home with someone sick at home (the physician goes there first). */
const sickAtHome = (s: SimState, b: Building): boolean => aroundOf(s).sickHomes.has(b.id) || aroundOf(s).plagueHomes.includes(b);

/** The physician's round: sick homes first, then those she called on longest ago. */
export const PHYSICIAN: ServiceSpec = {
  record: (s) => s.rounds.health,
  range: PHYSICIAN_RANGE,
  walk: PHYSICIAN_WALK,
  speed: CARRIER_SPEED,
  score: (b, s) => {
    if (!livedIn(b)) return Infinity;
    if (sickAtHome(s, b)) return s.tick - TICKS_PER_MONTH;
    return b.physician + TICKS_PER_MONTH;
  },
  due: () => Infinity,
  serve(s: SimState, size: number, t: number) {
    for (const b of besideRoad(s, size, t, near)) {
      if (!livedIn(b)) continue;
      b.physician = s.tick;
      for (const x of s.health.sick) if (x.home === b.id && x.bed === 0) x.tended = s.tick;
    }
  },
  rest: (b) => restFor(b, PHYSICIAN_REST),
  crew: true,
};
const near: Building[] = [];

/** Infirmaries send out physicians (a crew, as a shrine sends priestesses); asklepieia send bearers. */
export function stepInfirmaries(s: SimState, map: CoastMap): void {
  const size = map.size;
  for (const b of s.buildings) {
    if (b.kind === 'infirmary') b.clock = crewClock(s, b, 'physician', b.clock, rateOf(b) > 0, () => sendOut(s, size, b, 'physician'), restFor(b, CREW_GAP), PHYSICIAN_REST);
    else if (b.kind === 'asklepieion') stepTemple(s, size, b);
  }
}

/** Move a physician one tick along. */
export function movePhysician(s: SimState, map: CoastMap, w: Walker): boolean {
  return moveRounds(s, map, w, PHYSICIAN, 'infirmary');
}

// ---------------------------------------------------------------------------
// The asklepieion and its stretcher-bearers.

/** Beds taken (and promised to bearers out) at an asklepieion. */
export const bedsTaken = (s: SimState, b: Building): number => s.health.sick.filter((x) => x.bed === b.id || x.bed === -b.id).length;

/** In a bed, the staff tend them each day; a bed whose asklepieion is gone sends them home. */
function mendBeds(s: SimState): void {
  for (const x of s.health.sick) {
    if (x.bed === 0) continue;
    const t = findBuilding(s, Math.abs(x.bed));
    if (!t || t.kind !== 'asklepieion') {
      x.bed = 0;
      continue;
    }
    if (x.bed > 0 && t.workers > 0) x.tended = s.tick;
  }
}

/** An asklepieion with workers and a free bed sends a pair of bearers for the worst of the sick at home within reach by road. */
function stepTemple(s: SimState, size: number, b: Building): void {
  if (b.clock > 0 && --b.clock > 0) return;
  b.clock = restFor(b, BEARER_GAP);
  if (rateOf(b) <= 0 || !s.health.on) return;
  if (bedsTaken(s, b) >= BEDS) return;
  if (s.walkers.filter((w) => w.kind === 'bearer' && w.origin === b.id).length >= 2) return;
  const roads = roadsBeside(s, size, b);
  if (!roads.length) return;
  const search = roadSearch(s, size, roads);
  let pick: Sick | null = null;
  let road = -1;
  let worst = Infinity;
  for (const x of s.health.sick) {
    if (x.bed !== 0) continue;
    const home = findBuilding(s, x.home);
    if (!home) continue;
    let best = -1;
    for (const t of roadsBeside(s, size, home)) if (search.dist[t] >= 0 && search.dist[t] <= BEARER_RANGE && (best < 0 || search.dist[t] < search.dist[best])) best = t;
    if (best < 0) continue;
    // The plague first, then the sickliest home, then who fell ill first.
    const score = (x.plague ? 0 : 1e6) + home.health * 1e4 + (x.since % 1e4);
    if (score < worst) {
      worst = score;
      pick = x;
      road = best;
    }
  }
  if (!pick) return;
  const home = findBuilding(s, pick.home)!;
  const way = tracePath(search, road);
  const w = newWalker(s, 'bearer', 2);
  w.origin = b.id;
  w.target = home.id;
  w.load = pick.id;
  w.since = s.tick;
  const pts: Array<[number, number, number]> = [];
  const [dx, dz] = door(size, b, way[0]);
  pts.push([dx, dz, -1]);
  for (const t of way) {
    const [x, z] = centre(size, t);
    pts.push([x, z, t]);
  }
  const [hx, hz] = door(size, home, road);
  pts.push([hx, hz, -1]);
  setPath(w, pts);
  pick.bed = -b.id;
  s.walkers.push(w);
}

/** Along the path; 'end' at its end, 'cut' where the road ahead is gone. */
function advance(s: SimState, w: Walker, speed: number): 'moved' | 'end' | 'cut' {
  let move = speed;
  for (let guard = 0; guard < 8 && move > 0; guard++) {
    const last = w.path.length / 2 - 1;
    if (w.seg >= last) return 'end';
    const next = w.tiles[w.seg + 1];
    if (next >= 0 && s.tiles[next] !== TILE_ROAD) return 'cut';
    const i = w.seg * 2;
    const len = dhypot(w.path[i + 2] - w.path[i], w.path[i + 3] - w.path[i + 1]);
    if (w.along + move < len) {
      w.along += move;
      w.walked += move;
      return 'moved';
    }
    move -= len - w.along;
    w.walked += len - w.along;
    w.seg++;
    w.along = 0;
  }
  return w.seg >= w.path.length / 2 - 1 ? 'end' : 'moved';
}

/** Bearers walk a little slower than a physician. */
export const BEARER_SPEED = WALK_SPEED * 0.8;

/** A pair of stretcher-bearers' tick: to the sick one's door, a moment lifting them, and back to a bed. False once home (or let go). */
export function moveBearer(s: SimState, _map: CoastMap, w: Walker): boolean {
  const temple = findBuilding(s, w.origin);
  const x = s.health.sick.find((o) => o.id === w.load);
  if (!temple || temple.kind !== 'asklepieion') {
    if (x && x.bed < 0) x.bed = 0;
    return false;
  }
  if (w.wait > 0) {
    if (--w.wait > 0) return true;
    // Lifted: back to the asklepieion the way they came.
    turnBack(w);
    w.food = x ? 1 : 0;
    s.rev++;
    return true;
  }
  const r = advance(s, w, BEARER_SPEED);
  if (r === 'cut') {
    // (The road is gone: whoever they carry is set down at home again.)
    if (x && x.bed < 0) x.bed = 0;
    return false;
  }
  if (r !== 'end') return true;
  if (!w.back) {
    if (!x || x.home !== w.target) {
      turnBack(w);
      return true;
    }
    w.wait = BEARER_LIFT;
    return true;
  }
  if (x && w.food === 1) {
    x.bed = temple.id;
    // In a bed they mend faster.
    const left = Math.max(0, x.until - s.tick);
    x.until = s.tick + Math.ceil(left * BED_MEND);
    x.tended = s.tick;
    aroundCache.delete(s);
    s.rev++;
  } else if (x && x.bed < 0) x.bed = 0;
  return false;
}

/** Walk the same way back. */
function turnBack(w: Walker): void {
  const here = position(w);
  const pts: Array<[number, number, number]> = [];
  for (let i = w.path.length / 2 - 1; i >= 0; i--) pts.push([w.path[i * 2], w.path[i * 2 + 1], w.tiles[i]]);
  pts[0] = [here[0], here[1], pts[0][2]];
  setPath(w, pts);
  w.back = true;
}

// ---------------------------------------------------------------------------
// Readings for the panels, moods and the overview.

/** How many of a household are sick in bed (at home or at the asklepieion): they don't work. */
export function sickAt(s: SimState, b: Building): number {
  const sick = s.health?.sick;
  if (!sick || !sick.length) return 0;
  let n = 0;
  for (const x of sick) if (x.home === b.id) n++;
  return n;
}

/** What weighs on a household's mood: someone sick, the plague in the house or the city, a death lately. */
export function healthMoods(s: SimState, b: Building): HealthReason[] {
  const h = s.health;
  if (!h?.on) return [];
  const out: HealthReason[] = [];
  const mine = h.sick.filter((x) => x.home === b.id);
  const plague = mine.filter((x) => x.plague);
  if (plague.length) out.push({ w: -2, text: `Plague in the house: ${plague.map((x) => x.name).join(', ')}` });
  else if (mine.length) out.push({ w: -1, text: `${mine[0].name} is sick${mine.length > 1 ? `, and ${mine.length - 1} more` : ''}` });
  if (h.outbreak) out.push({ w: -2, text: 'Plague in the city' });
  const f = b.family;
  if (f) {
    for (let i = f.story.length - 1; i >= 0; i--) {
      const e = f.story[i];
      if (e.what !== 'died') continue;
      if (s.tick - e.tick < 2 * TICKS_PER_MONTH) out.push({ w: -2, text: `Mourning ${e.names[0]}, who died of ${e.n ? 'the plague' : 'a fever'}` });
      break;
    }
  }
  return out;
}

/** The city's health, for the overview's Health page (slice 51) and the panels. */
export interface HealthFigures {
  on: boolean;
  homes: number;
  /** The sick, of the plague, and in an asklepieion's beds. */
  sick: number;
  plague: number;
  inBeds: number;
  /** Average health of lived-in homes (0 with none). */
  average: number;
  sickly: number;
  ailing: number;
  /** Homes a physician called on this season, and their share of all. */
  called: number;
  coverage: number;
  infirmaries: number;
  temples: number;
  /** The plague risk and its reasons. */
  risk: 'none' | 'low' | 'rising' | 'high';
  reasons: string[];
  /** The outbreak and quarantine in words ('' for none). */
  outbreak: string;
  quarantine: string;
  month: HealthTally;
  lastMonth: HealthTally;
}

export function healthFigures(s: SimState): HealthFigures {
  const h = s.health;
  let homes = 0;
  let total = 0;
  let sickly = 0;
  let ailing = 0;
  let called = 0;
  let infirmaries = 0;
  let temples = 0;
  for (const b of s.buildings) {
    if (b.kind === 'infirmary') infirmaries++;
    if (b.kind === 'asklepieion') temples++;
    if (!livedIn(b)) continue;
    homes++;
    const v = b.health > 0 ? b.health : 50;
    total += v;
    if (v < 30) ailing++;
    else if (v < 50) sickly++;
    if (b.physician > 0 && s.tick - b.physician <= TICKS_PER_SEASON) called++;
  }
  const reasons: string[] = [];
  let risk: HealthFigures['risk'] = h.on ? 'low' : 'none';
  const rise = (r: HealthFigures['risk']): void => {
    const order = ['none', 'low', 'rising', 'high'];
    if (order.indexOf(r) > order.indexOf(risk)) risk = r;
  };
  if (h.on) {
    if (h.outbreak) {
      rise('high');
      reasons.push('Plague is in the city now');
    }
    for (const p of h.greece) {
      if (s.tick >= p.until || !tradesWith(s, p.city)) continue;
      rise(quarantined(s) ? 'rising' : 'high');
      reasons.push(`Plague in ${cityName(p.city)}, a city you trade with${quarantined(s) ? ' (the quarantine holds its traders off)' : ''}`);
    }
    if (h.fever) {
      rise('high');
      reasons.push(`A fevered quarter of ${h.fever.homes} sickly homes`);
    }
    if (homes && (sickly + ailing) / homes > 0.25) {
      rise('rising');
      reasons.push(`${sickly + ailing} of ${homes} homes are sickly or ailing`);
    }
    if (homes && infirmaries === 0) {
      rise('rising');
      reasons.push('No infirmary: no physician calls on anyone');
    } else if (homes && called / homes < 0.5) reasons.push(`A physician called on only ${called} of ${homes} homes this season`);
    if (s.tick < h.since + PLAGUE_FREE) reasons.push('No plague can come in the town’s first year');
  }
  const o = h.outbreak;
  const outbreak = o ? `Plague${o.from ? ` from ${cityName(o.from)}` : ''}: ${o.struck.length} ${o.struck.length === 1 ? 'home' : 'homes'} struck, ${h.sick.filter((x) => x.plague).length} sick of it now, ${o.dead} dead, ${o.fled} ${o.fled === 1 ? 'household' : 'households'} fled` : '';
  const quarantine = quarantined(s) ? `Under quarantine for ${Math.max(1, Math.ceil((h.quarantine - s.tick) / TICKS_PER_DAY))} more days: no ships tie up, no caravans come in` : '';
  return {
    on: h.on,
    homes,
    sick: h.sick.length,
    plague: h.sick.filter((x) => x.plague).length,
    inBeds: h.sick.filter((x) => x.bed > 0).length,
    average: homes ? Math.round(total / homes) : 0,
    sickly,
    ailing,
    called,
    coverage: homes ? called / homes : 0,
    infirmaries,
    temples,
    risk,
    reasons,
    outbreak,
    quarantine,
    month: { ...h.now },
    lastMonth: { ...h.last },
  };
}

/** What placing an infirmary or the asklepieion would do, for the placing tip. */
export function placeLines(s: SimState, kind: 'infirmary' | 'asklepieion', roads: boolean): { lines: string[]; warn: string } {
  const f = healthFigures(s);
  const lines: string[] = [];
  if (kind === 'infirmary') {
    lines.push(`Its physicians walk the streets in a crew of three, up to ${PHYSICIAN_RANGE} steps by road: every home beside their way is called on (healthier for a month, less so for the season), and the sick there tended (half as likely to die)`);
    lines.push('Not a need for any house: a home’s health keeps it from falling ill, and the city from plague');
  } else {
    lines.push(`Its stretcher-bearers fetch the sick from homes up to ${BEARER_RANGE} steps by road to its ${BEDS} beds, where they mend in ${Math.round(BED_MEND * 10) * 10}% of the time and die a third as often`);
    lines.push(`Homes within ${TEMPLE_TILES} tiles of it are healthier (+10), and the plague spreads half as fast among them`);
  }
  if (f.on && f.homes) lines.push(`In the city: ${f.sick ? `${f.sick} sick${f.plague ? `, ${f.plague} of the plague` : ''}` : 'nobody sick'}; ${f.sickly + f.ailing} of ${f.homes} homes sickly or ailing; a physician called on ${f.called} this season`);
  const warn = roads ? '' : `No road beside it: its ${kind === 'infirmary' ? 'physicians' : 'bearers'} couldn’t go out. Lay a road along one side first.`;
  return { lines, warn };
}

// ---------------------------------------------------------------------------
// In words: the tips, the panels and the town's line.

const dayCount = (t: number): string => {
  const d = Math.max(1, Math.ceil(t / TICKS_PER_DAY));
  return d === 1 ? 'a day' : `${d} days`;
};

/** Where a sick one lies, and how they are cared for, in words. */
export function sickWords(s: SimState, x: Sick): string {
  const her = x.female ? 'her' : 'him';
  const what = x.plague ? 'sick with the plague' : 'sick with a fever';
  const left = `about ${dayCount(x.until - s.tick)} more`;
  if (x.bed > 0) return `${x.name}: ${what}, in a bed at the asklepieion, the attendants tending ${her}, ${left}`;
  if (x.bed < 0) {
    const carried = s.walkers.some((w) => w.kind === 'bearer' && w.load === x.id && w.back && w.food === 1);
    return `${x.name}: ${what}, ${carried ? `being carried to the asklepieion on a litter` : `stretcher-bearers are on their way for ${her}`}, ${left}`;
  }
  const tended = x.tended > 0 && s.tick - x.tended < 3 * TICKS_PER_DAY;
  return `${x.name}: ${what}, at home, ${tended ? `a physician tended ${her} lately (half as likely to die)` : x.tended > 0 ? `a physician tended ${her} ${dayCount(s.tick - x.tended)} ago` : `no physician has seen ${her} yet`}, ${left}`;
}

/** A home's health and who is sick there, for its tip (nothing with health off). */
export function homeHealthLines(s: SimState, b: Building): string[] {
  if (!s.health?.on || !livedIn(b) || !b.family) return [];
  const v = b.health > 0 ? b.health : healthOf(s, b).value;
  const out = [`Health ${v}: ${healthLine(s, b)}`];
  for (const x of s.health.sick) if (x.home === b.id) out.push(sickWords(s, x));
  return out;
}

/** How many of a building's walkers of a kind are out. */
const outOf = (s: SimState, b: Building, kind: Walker['kind']): number => s.walkers.filter((w) => w.kind === kind && w.origin === b.id).length;

/** Homes within an infirmary's reach (as the crow flies, PHYSICIAN_RANGE) a physician called on this month, of all within it. */
export function calledNear(s: SimState, b: Building): { called: number; homes: number } {
  const [cx, cz] = centreOf(b);
  let called = 0;
  let homes = 0;
  for (const o of s.buildings) {
    if (!livedIn(o)) continue;
    const [x, z] = centreOf(o);
    if (dhypot(x - cx, z - cz) > PHYSICIAN_RANGE) continue;
    homes++;
    if (o.physician > 0 && s.tick - o.physician <= TICKS_PER_MONTH) called++;
  }
  return { called, homes };
}

/** An infirmary's lines: its physicians out, the homes called on this month. */
export function infirmaryLines(s: SimState, b: Building): string[] {
  if (!s.health?.on) return ['Nobody falls ill in this town yet: its physicians have nobody to tend'];
  const n = outOf(s, b, 'physician');
  const out = [n ? `${n} of ${CREW} physicians out on their rounds${n < CREW && b.workers > 0 && b.clock > 0 ? ` · another sets off in ${dayCount(b.clock)}` : ''}` : b.workers > 0 ? `Its physicians are in · the next sets off in ${dayCount(Math.max(1, b.clock))}` : 'Nobody works here: no physician goes out'];
  const c = calledNear(s, b);
  if (c.homes) out.push(`Called on ${c.called} of the ${c.homes} homes round it this month`);
  return out;
}

/** The asklepieion's lines: its beds, who lies there, its bearers out. */
export function templeLines(s: SimState, b: Building): string[] {
  const lying = s.health.sick.filter((x) => x.bed === b.id).length;
  const coming = s.health.sick.filter((x) => x.bed === -b.id).length;
  const pairs = outOf(s, b, 'bearer');
  const out = [`${lying} of its ${BEDS} beds taken${coming ? `, ${coming} more on the way` : ''}`];
  out.push(pairs ? `${pairs === 1 ? 'A pair' : `${pairs} pairs`} of stretcher-bearers out` : b.workers > 0 ? (s.health.on ? 'Its stretcher-bearers are in: they go for the worst of the sick at home within reach by road' : 'Nobody falls ill in this town yet') : 'Nobody works here: no bearers go out, and its beds are left untended');
  out.push(`Homes within ${TEMPLE_TILES} tiles are healthier, and the plague spreads half as fast among them`);
  return out;
}

/** A physician or a pair of stretcher-bearers: what they are doing (null for any other walker). */
export function healthWalkerStatus(s: SimState, w: Walker): { title: string; detail: string } | null {
  if (w.kind === 'physician') {
    if (w.back) return { title: 'Physician', detail: 'Heading back to the infirmary, calling on homes on the way' };
    return { title: 'Physician', detail: `Out on her round, ${w.steps} of ${PHYSICIAN_WALK} new road tiles walked · she heads first for homes with someone sick, then those she called on longest ago · every home beside her way is called on, and the sick there tended` };
  }
  if (w.kind === 'bearer') {
    const x = s.health.sick.find((o) => o.id === w.load);
    const who = x ? x.name : 'one of the sick';
    const home = findBuilding(s, w.target);
    const fam = home?.family ? ` of the house of ${home.family.name}` : '';
    if (w.wait > 0) return { title: 'Stretcher-bearers', detail: `Lifting ${who}${fam} onto the litter` };
    if (w.back) return { title: 'Stretcher-bearers', detail: w.food === 1 ? `Carrying ${who}${fam} to a bed at the asklepieion` : 'Heading back to the asklepieion' };
    return { title: 'Stretcher-bearers', detail: `Going for ${who}${fam}, sick at home, to carry ${x?.female ? 'her' : 'him'} to a bed at the asklepieion` };
  }
  return null;
}

/** The town's line under the top bar: the plague in the city, a fevered quarter or the quarantine (the most pressing), or null. */
export function healthTownLine(s: SimState): { text: string; at: number } | null {
  const h = s.health;
  if (!h?.on && !quarantined(s)) return null;
  const q = quarantined(s) ? ` The city is under quarantine for ${dayCount(h.quarantine - s.tick)} more.` : '';
  if (h.outbreak) {
    const o = h.outbreak;
    const ill = h.sick.filter((x) => x.plague).length;
    const first = o.struck.map((id) => findBuilding(s, id)).find((b) => !!b);
    return { text: `Plague in the city: ${o.struck.length} ${o.struck.length === 1 ? 'home' : 'homes'} struck, ${ill} sick of it, ${o.dead} dead. Physicians and the asklepieion save lives; healthy homes (water, food, a physician’s call) resist it.${q}`, at: first?.id ?? 0 };
  }
  if (h.fever) {
    const home = findBuilding(s, h.fever.home);
    return { text: `Fever in a crowded, sickly quarter (${h.fever.homes} homes): it turns to plague if it lingers. Physicians, water and food would mend it.${q}`, at: home?.id ?? 0 };
  }
  // Plague in a city of Greece the town trades with, while its traders still come: the warning, with what to do, before it lands.
  if (!q && h.on) {
    const p = h.greece.find((g) => g.warned > 0 && s.tick < g.until && tradesWith(s, g.city));
    if (p) {
      const due = traderDue(s, p.city);
      const where = s.buildings.find((b) => b.kind === 'trading') ?? s.buildings.find((b) => b.kind === 'yard');
      return { text: `Plague in ${cityName(p.city)}${due ? `: ${due}` : ''}. A quarantine (the trade panel) holds her traders off; physicians and an asklepieion by the quay keep it from spreading.`, at: where?.id ?? 0 };
    }
  }
  if (q) {
    const post = s.buildings.find((b) => b.kind === 'trading') ?? s.buildings.find((b) => b.kind === 'yard');
    return { text: `Quarantine: no ship ties up and no caravan comes in for ${dayCount(h.quarantine - s.tick)} more. Lift it on the infirmary’s or the trade panel.`, at: post?.id ?? 0 };
  }
  return null;
}
