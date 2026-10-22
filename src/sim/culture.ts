/**
 * The shrine and its priestess, the theatre and its actor.
 *
 * A shrine or theatre beside a road, with workers, sends out its walkers, a
 * crew of them a few weeks apart (src/sim/rounds.ts, CREW). Each (she, or
 * he) walks the shared round, never further than her
 * reach by road, and every home beside a road tile she stands on has her
 * service for four months: the priestess's blessing, or plays. She heads for
 * the homes that want her most: the priestess for cottages and better (a
 * cottage needs her blessing to become a townhouse), the actor for townhouses
 * and better (a townhouse needs plays to become a fine house). A short-handed
 * building sends them further apart; with nobody working it, nobody goes out.
 */
import type { CoastMap } from '../map/bake';
import { COTTAGE, TOWNHOUSE } from './buildings';
import { TICKS_PER_MONTH } from './clock';
import { serviceDue, serviceScore } from './folk';
import { rateOf } from './labour';
import { CREW_GAP, crewClock, moveRounds, sendOut, type ServiceSpec } from './rounds';
import type { Building, BuildingKind, Service, SimState, Walker } from './state';
import { besideRoad, CARRIER_SPEED } from './walk';
import { restFor } from './water';

/** How far by road from her building the priestess (or the actor) ever goes, and how much fresh road a round is. */
export const PRIESTESS_RANGE = 32;
export const PRIESTESS_WALK = 64;
export const ACTOR_RANGE = 32;
export const ACTOR_WALK = 64;
/** How long a home keeps a blessing, or its plays, after she passes (four months). */
export const RELIGION_LASTS = 4 * TICKS_PER_MONTH;
export const CULTURE_LASTS = 4 * TICKS_PER_MONTH;
/** Ticks she rests between rounds at a fully staffed building, and before the first. */
export const PRIESTESS_REST = 30;
export const ACTOR_REST = 30;
export const FIRST_PRIESTESS = 20;
export const FIRST_ACTOR = 20;

/** Does a home want the priestess? Cottages and better with people in them. */
export const wantsBlessing = (b: Building): boolean => b.kind === 'home' && b.level >= COTTAGE && b.people > 0;
/** Does a home want the actor? Townhouses and better. */
export const wantsPlays = (b: Building): boolean => b.kind === 'home' && b.level >= TOWNHOUSE && b.people > 0;

const near: Building[] = [];

/** The priestess's round. */
export const RELIGION: ServiceSpec = {
  record: (s) => s.rounds.religion,
  range: PRIESTESS_RANGE,
  walk: PRIESTESS_WALK,
  speed: CARRIER_SPEED,
  score: (b) => serviceScore(b, 'religion', wantsBlessing(b)),
  due: (b) => serviceDue(b, 'religion'),
  serve(s: SimState, size: number, t: number) {
    const until = s.tick + RELIGION_LASTS;
    for (const b of besideRoad(s, size, t, near)) if (b.kind === 'home' && b.level > 0 && b.religionUntil < until) b.religionUntil = until;
  },
  rest: (b) => restFor(b, PRIESTESS_REST),
  crew: true,
};

/** The actor's round. */
export const CULTURE: ServiceSpec = {
  record: (s) => s.rounds.culture,
  range: ACTOR_RANGE,
  walk: ACTOR_WALK,
  speed: CARRIER_SPEED,
  score: (b) => serviceScore(b, 'culture', wantsPlays(b)),
  due: (b) => serviceDue(b, 'culture'),
  serve(s: SimState, size: number, t: number) {
    const until = s.tick + CULTURE_LASTS;
    for (const b of besideRoad(s, size, t, near)) if (b.kind === 'home' && b.level > 0 && b.cultureUntil < until) b.cultureUntil = until;
  },
  rest: (b) => restFor(b, ACTOR_REST),
  crew: true,
};

/** Each of the new services: the building it walks from, its walker, her round, and her rest. */
export const CULTURE_SERVICES: ReadonlyArray<{ service: Service; building: BuildingKind; walker: Walker['kind']; spec: ServiceSpec; rest: number }> = [
  { service: 'religion', building: 'shrine', walker: 'priestess', spec: RELIGION, rest: PRIESTESS_REST },
  { service: 'culture', building: 'theatre', walker: 'actor', spec: CULTURE, rest: ACTOR_REST },
];

/** Shrines and theatres: send out a walker when one is due and someone works there (up to a crew: see CREW). */
export function stepCulture(s: SimState, map: CoastMap): void {
  const size = map.size;
  for (const b of s.buildings) {
    if (b.kind !== 'shrine' && b.kind !== 'theatre') continue;
    const kind = b.kind === 'shrine' ? 'priestess' : 'actor';
    // No road to walk, or nobody to work it: look again in a little while.
    b.clock = crewClock(s, b, kind, b.clock, rateOf(b) > 0, () => sendOut(s, size, b, kind), restFor(b, CREW_GAP), b.kind === 'shrine' ? PRIESTESS_REST : ACTOR_REST);
  }
}

/** Move the priestess or the actor one tick along. Returns false when done for this round. */
export function moveCulture(s: SimState, map: CoastMap, w: Walker): boolean {
  return w.kind === 'priestess' ? moveRounds(s, map, w, RELIGION, 'shrine') : moveRounds(s, map, w, CULTURE, 'theatre');
}
