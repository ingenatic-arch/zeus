/**
 * Gangs (slice 41): when a quarter's temptation stays high for months, a gang
 * takes one of its houses as its den.
 *
 * Once a month (HEAT_AT ticks into it) every lived-in home's temptation is
 * read (crime.ts, temptationOf). A district is hot this month when somewhere
 * in it GANG_HOMES or more homes within GANG_TILES of one another are rising
 * towards a crime they have within reach, and they are at least half the homes there; its heat (the
 * months running, `crime.heat`) goes up by one, and down by one otherwise. At
 * GANG_WARN months the town hears a gang is gathering, a season before it
 * forms; at GANG_FORM the gang takes the most tempted home at the heart of
 * it (`crime.seats`) as its den.
 *
 * A den sends one of its men out every GANG_EVERY days (two at most out at
 * once): to steal, smuggle or pick pockets, whatever is within reach (the
 * dice are a hash; to smash things only if the den itself is angry and
 * idle). Its men beat off a lone watchman (crime.ts, caught): one with no
 * other watchman within HELP_TILES. Two watch posts, staffed, whose rounds
 * reach the den (by road, within their range) for GANG_BREAK days break it
 * up. A gang whose den is emptied, burnt or cleared scatters.
 *
 * Nothing here moves while the new kinds' switch (`crime.kinds`) is off.
 */
import type { CoastMap } from '../map/bake';
import { DISTRICTS, districtAt } from '../map/districts';
import { dhypot } from '../map/dmath';
import { centreOf, findBuilding, livedIn } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from './clock';
import { crimeFor, GANG_TILES, isCriminal, moodCtx, setOutAs, targetFor, tellNews, temptationOf, temptRate, whereOf, type CrimeKind, type Gang } from './crime';
import { tell } from './folk';
import { unit, WATCH_RANGE } from './hazards';
import { rateOf } from './labour';
import { crimeTargetsFrom } from './misdeeds';
import { distFrom, roadsBeside } from './rounds';
import type { Building, SimState, Walker } from './state';
import { position } from './walk';

/** A quarter runs hot with this many homes rising towards a crime within GANG_TILES of one another (and at least half the homes there). */
export const GANG_HOMES = 3;
/** Months of heat before the town hears a gang gathering, and before it forms (a season later). */
export const GANG_WARN = 2;
export const GANG_FORM = 5;
/** Days between a den's men going out, and how many can be out at once. */
export const GANG_EVERY = 8;
export const GANG_OUT = 2;
/** Days two watch posts must reach a den to break the gang up. */
export const GANG_BREAK = 20;
/** A watchman with another within this many tiles isn't alone, and isn't beaten off. */
export const HELP_TILES = 8;
/** The tick of each month the quarters' heat is read. */
const HEAT_AT = 7;

/** The gang a criminal belongs to (one from a den is its man), if any. */
export const gangOf = (s: SimState, w: Walker): Gang | undefined => (s.crime.gangs.length ? s.crime.gangs.find((g) => g.den === w.home) : undefined);

/** The gang whose den this home is, if any. */
export const denOf = (s: SimState, b: Building): Gang | undefined => (s.crime.gangs.length ? s.crime.gangs.find((g) => g.den === b.id) : undefined);

/** Is a watchman alone (no other watchman within HELP_TILES of him)? */
export function lone(s: SimState, w: Walker): boolean {
  const [x, z] = position(w);
  for (const o of s.walkers) {
    if (o === w || o.kind !== 'watchman' || o.people <= 0) continue;
    const [ox, oz] = position(o);
    if (dhypot(ox - x, oz - z) <= HELP_TILES) return false;
  }
  return true;
}

/** The staffed watch posts whose rounds reach a den (by road, within their range). */
export function postsReaching(s: SimState, size: number, den: Building): Building[] {
  const roads = roadsBeside(s, size, den);
  if (roads.length === 0) return [];
  const out: Building[] = [];
  for (const p of s.buildings) {
    if (p.kind !== 'watchpost' || rateOf(p) <= 0) continue;
    const dist = distFrom(s, size, p);
    if (roads.some((r) => dist[r] >= 0 && dist[r] <= WATCH_RANGE)) out.push(p);
  }
  return out;
}

/** The district a building stands in. */
const districtOf = (map: CoastMap, b: Building): number => {
  const [x, z] = centreOf(b);
  return districtAt(map, x, z);
};

/** Once a month the quarters' heat; once a day each gang: its den, the watch posts reaching it, and its men. */
export function stepGangs(s: SimState, map: CoastMap): void {
  if (s.tick % TICKS_PER_MONTH === HEAT_AT) monthHeat(s, map);
  const gangs = s.crime.gangs;
  if (gangs.length === 0) return;
  const size = map.size;
  for (const g of [...gangs]) {
    if ((s.tick + g.den) % TICKS_PER_DAY !== 1) continue;
    const den = findBuilding(s, g.den);
    if (!den || !livedIn(den) || !den.family) {
      gangs.splice(gangs.indexOf(g), 1);
      tellNews(s, 'scattered', `${cap(g.name)} has scattered: its den ${DISTRICTS[g.district]?.where ?? 'in the city'} is gone`, 0);
      s.rev++;
      continue;
    }
    // Two watch posts reaching the den, for long enough, break it up.
    if (postsReaching(s, size, den).length >= 2) {
      if (g.covered === 0) g.covered = s.tick;
      else if (s.tick - g.covered >= GANG_BREAK * TICKS_PER_DAY) {
        breakUp(s, map, g, den);
        continue;
      }
    } else g.covered = 0;
    if (s.tick < g.next) continue;
    g.next = s.tick + GANG_EVERY * TICKS_PER_DAY;
    const out = s.walkers.filter((w) => w.home === den.id && isCriminal(w.kind) && w.people > 0).length;
    if (out >= GANG_OUT) continue;
    sendMan(s, size, den);
  }
}

/** One of the den's men goes out, to whatever is within reach (a hash picks among them). */
function sendMan(s: SimState, size: number, den: Building): void {
  const tg = crimeTargetsFrom(s, size, den);
  const theft = targetFor(s, size, den);
  const options: Array<{ kind: CrimeKind; target: Building; part: number }> = [];
  if (theft) options.push({ kind: 'theft', target: theft.target, part: -1 });
  if (tg.smuggling) options.push({ kind: 'smuggling', target: tg.smuggling.target, part: -1 });
  // (Smashing things is an angry home's own crime, not a gang's trade: only if the den itself is angry and idle.)
  if (tg.vandal && crimeFor(s, size, den, temptationOf(s, size, den))?.kind === 'vandal') options.push({ kind: 'vandal', target: tg.vandal.target, part: tg.vandal.part });
  if (tg.pickpocket) options.push({ kind: 'pickpocket', target: tg.pickpocket.target, part: -1 });
  if (options.length === 0) return;
  const day = Math.floor(s.tick / TICKS_PER_DAY);
  const c = options[Math.floor(unit(s.seed, den.id, day, 43) * options.length)];
  setOutAs(s, size, den, c, day, false);
}

/** The watch breaks a gang up: the den is a home again. */
function breakUp(s: SimState, map: CoastMap, g: Gang, den: Building): void {
  const gangs = s.crime.gangs;
  gangs.splice(gangs.indexOf(g), 1);
  den.tempt = 0;
  if (s.crime.heat.length > g.district) s.crime.heat[g.district] = 0;
  if (den.family) tell(s, den.family, 'den', den.level, [g.name]);
  if (den.family) den.family.story[den.family.story.length - 1].n = 0;
  tellNews(s, 'brokenup', `The watch broke up ${g.name} ${whereOf(map, den)}: two watch posts reach its den, and the house of ${den.family?.name ?? 'its den'} is a home again`, den.id);
  s.rev++;
}

const cap = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);

/** The month's heat in every district, and a gang gathering, dispersing or forming. */
function monthHeat(s: SimState, map: CoastMap): void {
  const c = s.crime;
  const size = map.size;
  const ctx = moodCtx(s);
  const homes = s.buildings.filter((b) => livedIn(b) && !!b.family);
  const hot = new Set<number>();
  // (Rising towards a crime it has within reach: a quarter tempted with nothing to turn to breeds no gang.)
  for (const b of homes) {
    const t = temptationOf(s, size, b, ctx);
    if (temptRate(t.score) > 0 && crimeFor(s, size, b, t)) hot.add(b.id);
  }
  // The heart of each hot quarter, by district: the most homes rising around it, then the most tempted.
  const best = new Map<number, { b: Building; k: number }>();
  for (const b of homes) {
    if (!hot.has(b.id) || c.gangs.some((g) => g.den === b.id)) continue;
    const [x, z] = centreOf(b);
    let n = 0;
    let k = 0;
    for (const o of homes) {
      const [ox, oz] = centreOf(o);
      if (Math.abs(ox - x) > GANG_TILES || Math.abs(oz - z) > GANG_TILES || dhypot(ox - x, oz - z) > GANG_TILES) continue;
      n++;
      if (hot.has(o.id)) k++;
    }
    if (k < GANG_HOMES || 2 * k < n) continue;
    const d = districtOf(map, b);
    const was = best.get(d);
    if (!was || k > was.k || (k === was.k && b.tempt > was.b.tempt)) best.set(d, { b, k });
  }
  while (c.heat.length < DISTRICTS.length) c.heat.push(0);
  while (c.seats.length < DISTRICTS.length) c.seats.push(0);
  for (let d = 0; d < DISTRICTS.length; d++) {
    if (c.gangs.some((g) => g.district === d)) {
      c.heat[d] = 0;
      c.seats[d] = 0;
      continue;
    }
    const was = c.heat[d];
    const seat = best.get(d);
    c.heat[d] = seat ? was + 1 : Math.max(0, was - 1);
    if (seat) c.seats[d] = seat.b.id;
    else if (c.heat[d] === 0) c.seats[d] = 0;
    const where = DISTRICTS[d]?.where ?? 'in the city';
    if (seat && c.heat[d] >= GANG_FORM) {
      form(s, map, d, seat.b);
      continue;
    }
    if (seat && c.heat[d] === GANG_WARN && was < GANG_WARN) {
      const left = GANG_FORM - GANG_WARN;
      tellNews(s, 'gathering', `Talk of a gang gathering ${where}: ${seat.k} homes around the house of ${seat.b.family?.name ?? 'a poor family'} have been tempted for ${GANG_WARN} months. In about ${left} months a gang will take a house there as its den, unless the watch comes that way`, seat.b.id);
      s.rev++;
    } else if (!seat && was >= GANG_WARN && c.heat[d] < GANG_WARN) {
      tellNews(s, 'dispersed', `The gang that was gathering ${where} never came together`, 0);
      s.rev++;
    }
  }
}

/** A gang takes a house as its den. */
function form(s: SimState, map: CoastMap, d: number, den: Building): void {
  const c = s.crime;
  const name = `the ${den.family?.name ?? 'harbour'} gang`;
  c.gangs.push({ den: den.id, name, district: d, formed: s.tick, next: s.tick + GANG_EVERY * TICKS_PER_DAY, covered: 0 });
  c.heat[d] = 0;
  c.seats[d] = 0;
  if (den.family) {
    tell(s, den.family, 'den', den.level, [name]);
    den.family.story[den.family.story.length - 1].n = 1;
  }
  tellNews(s, 'gang', `${cap(name)} has taken the house of ${den.family?.name ?? 'a poor family'} ${whereOf(map, den)} as its den. Its men go out every week or so, and beat off a lone watchman: two watch posts within reach of the den would break it up`, den.id);
  s.rev++;
}

/** How a gathering stands, for the lines: the district, its heat and the home at its heart (null: none gathering). */
export function gathering(s: SimState): Array<{ district: number; heat: number; seat: number }> {
  const out: Array<{ district: number; heat: number; seat: number }> = [];
  const c = s.crime;
  for (let d = 0; d < c.heat.length; d++) if (c.heat[d] >= GANG_WARN && c.seats[d] > 0) out.push({ district: d, heat: c.heat[d], seat: c.seats[d] });
  return out;
}

/** The months before a gathering gang forms, at its heat. */
export const monthsToGang = (heat: number): number => Math.max(0, GANG_FORM - heat);
