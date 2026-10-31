/**
 * Heroes answer (slice 59): the seven heroes, their halls, what they ask
 * before they come, their life in the city, the monsters they slay, the
 * expeditions they ride with, and their wishes.
 *
 * - **A hall first.** A hero exists here only once their hall (`herohall`,
 *   4 x 4, one to a hero) is raised: a command, so a town that never builds
 *   one plays exactly as before. While the hall stands and the hero hasn't
 *   come, they are `awaited`.
 * - **Demands** (`demandsOf`), each a named check with its progress, read
 *   only from what the city already has: people, granaries, the court, fine
 *   houses, triremes, horsemen, routes, lodges, a god's mood (the mood API),
 *   a sanctuary (`sanctuaryStands`, slice 54's on the trunk).
 * - **Arrival.** All met with the hall standing, word goes out (a message)
 *   and the hero comes ARRIVE days later: by sea at the trading post if there
 *   is one, else by road from the nearest edge they can walk in by, and walks
 *   to the hall. Demands that slip after word has gone don't stop them.
 * - **Life.** At home in the hall's courtyard; every STROLL days a walk out
 *   to a busy place within reach and back. Homes near a hall whose hero lives
 *   there are a little prouder (`heroMoods`, read by folk.ts).
 * - **Slaying** (`sendHero`, a command): the hero walks to the monster's lair
 *   (`lairSpot`), waits there if it is out raiding, and when both are there
 *   fights it for FIGHT ticks, the monster held (monsters.ts: `held`) and its
 *   health falling to nothing; a hero of that monster always wins (Heracles
 *   any): `slayMonster`. The city celebrates for FETE (every home's mood
 *   up, a crowd at the hall), the monster's god is satisfied (`honour`), and
 *   the lair is a place of legend: visitors leave LEGEND_COIN a month.
 * - **Abroad.** Ordered to ride (a command), a hero at home goes with the
 *   next expedition mustering: walks to its edge and is away with it; its
 *   might counts in the fight (`heroMight`, called from expeditions.ts) and
 *   the report says so (`heroesFought`); home with it, the order lapses.
 * - **Wishes** (`wishOf`): one each, once come. Unmet for a year they are
 *   restless (a warning), a month before two years warned again, at two
 *   years they leave (walking off), and may be won back a year later if every
 *   demand holds again.
 *
 * Everything said goes through `say`; money through the treasury. Pure and
 * deterministic: dice are hashes of the seed, the hero and what for; maths
 * through dmath.
 */
import type { CoastMap } from '../map/bake';
import { WATER_SEA } from '../map/bake';
import { datan2, dcos, dhypot, dsin } from '../map/dmath';
import { PLACES } from '../map/greece';
import { hash2 } from '../map/noise';
import { companyOf } from './army';
import { around, centreOf, findBuilding } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { held, HORSES } from './foods';
import { ALARM, NEWS, say, WARNING } from './messages';
import { beastName, denNoun, himOf as monsterHim, itOf, itsOf, lairSpot, MAKES, monsterOf, nearestWalkable, reach, slayMonster, type Beast } from './monsters';
import { GODS, HERO_IDS, HEROES, honour, MONSTERS, moodAtLeast, moodOfGod, moodWord, type GodId, type HeroId, type MonsterId } from './pantheon';
import type { Building, Expedition, SimState } from './state';
import { GRANARY_CAP } from './stores';
import { tradingPost } from './trade';
import { income } from './treasury';
import { offRoadPath, prunePath, walkable } from './wild';

// ---------------------------------------------------------------------------
// The state (in the line's `legends`).

/** Where a hero is in their life with the city (see the notes at the top). */
export type HeroState = 'awaited' | 'sent' | 'arriving' | 'home' | 'strolling' | 'hunting' | 'waiting' | 'fighting' | 'returning' | 'mustering' | 'abroad' | 'sailing' | 'leaving';
export const HERO_STATES: readonly HeroState[] = ['awaited', 'sent', 'arriving', 'home', 'strolling', 'hunting', 'waiting', 'fighting', 'returning', 'mustering', 'abroad', 'sailing', 'leaving'];

/** A hero whose hall stands: awaited, or come. */
export interface Champion {
  hero: HeroId;
  /** Their hall (a building id; 0 once it is gone, while they leave). */
  hall: number;
  state: HeroState;
  /** When word went out to them (-1 not yet), and when they came (-1 not yet, or gone again). */
  word: number;
  came: number;
  /** How they came: by sea at the trading post, or by road ('' not yet). */
  by: '' | 'sea' | 'road';
  /** When they next act: come, set out on a walk, turn back, come home from sea. */
  next: number;
  /** Where they stand, which way they face, how far they have walked (for the drawing's stride). */
  x: number;
  z: number;
  face: number;
  walked: number;
  /** Their way: points (x, z pairs), the segment they are on and how far along it. */
  path: number[];
  seg: number;
  along: number;
  /** The monster they are sent against (its id; 0 none); the fight's first tick (-1 none) and the monster's health then; their last blow. */
  foe: number;
  fight: number;
  from: number;
  swung: number;
  /** Their wish: the tick it was last met (or they came); the warnings said for it (0, 1, 2). */
  wish: number;
  warned: number;
  /** The monsters they have slain here, by kind. */
  slain: MonsterId[];
  /** Ordered to ride with the next expedition; the expedition they are with (0 none). */
  ride: boolean;
  away: number;
  /** Gone again (wish ignored): word may not go out before this tick. */
  again: number;
}

/** The city celebrating a monster slain: until when, by whom, which, and the hall the crowd gathers at. */
export interface Fete {
  until: number;
  hero: HeroId;
  kind: MonsterId;
  hall: number;
}

// ---------------------------------------------------------------------------
// The numbers (tuned by eye).

/** From word sent to the hero's coming: ARRIVE[0] to ARRIVE[1] ticks (within a month). */
export const ARRIVE: readonly [number, number] = [10 * TICKS_PER_DAY, 30 * TICKS_PER_DAY];
/** Days between walks out into the streets, and how long they stay out at the far end. */
export const STROLL: readonly [number, number] = [6 * TICKS_PER_DAY, 12 * TICKS_PER_DAY];
export const LINGER = TICKS_PER_DAY;
/** How far (tiles) a walk goes from the hall at most. */
export const STROLL_REACH = 24;
/** A hero's pace (tiles a tick): a brisk walk about the city, a little quicker than a walker's; striding out to a deed (a lair, an expedition), quicker still. */
export const PACE = 0.15;
export const HASTE = 0.3;
/** A fight with a monster: how long it lasts, and a blow each way every BLOW ticks. */
export const FIGHT = 8 * TICKS_PER_DAY;
export const BLOW = 6;
/** How far from the monster's middle the hero stands to fight it (tiles beyond its bulk). */
export const FIGHT_GAP = 0.45;
/** The city celebrates a monster slain this long. */
export const FETE = 7 * TICKS_PER_DAY;
/** What the monster's god makes of it: a memory this strong, fading over a year. */
export const SATISFIED = 12;
/** A place of legend: visitors' coin each month, for each. */
export const LEGEND_COIN = 20;
/** Homes this near (tiles, centre to centre) a hall whose hero lives there are prouder. */
export const PRIDE_REACH = 12;
/** A hero's might in a fight abroad (a hoplite is 1.2): Heracles, the others. */
export const MIGHT_HERACLES = 60;
export const MIGHT_HERO = 40;
/** A wish unmet this long makes them restless, and this long sends them away (warned a month before). */
export const RESTLESS = TICKS_PER_YEAR;
export const LEAVE = 2 * TICKS_PER_YEAR;
/** Gone again, they may be won back after this. */
export const AGAIN = TICKS_PER_YEAR;
/** Odysseus's season at sea. */
export const SAIL = 3 * TICKS_PER_MONTH;
/** The tallest a hero stands (tiles; a man is about 0.35): half again a man's height. */
export const HERO_TALL = 0.53;

// ---------------------------------------------------------------------------
// Words.

const Cap = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);
const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const nameOf = (h: HeroId): string => HEROES[h].name;
/** Atalanta is "she"; the rest "he". */
export const heOf = (h: HeroId): string => (h === 'atalanta' ? 'she' : 'he');
export const hisOf = (h: HeroId): string => (h === 'atalanta' ? 'her' : 'his');
export const himOf = (h: HeroId): string => (h === 'atalanta' ? 'her' : 'him');
/** "Theseus's hall". */
export const hallName = (h: HeroId): string => `${nameOf(h)}’s hall`;
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const num = (n: number): string => NUMBER_WORDS[n] ?? fmt(n);

// ---------------------------------------------------------------------------
// The dice.

const dice = (s: SimState, h: HeroId, n: number, salt: number): number => hash2(HERO_IDS.indexOf(h) * 7919 + n, salt, (s.seed ^ 0x6865726f) | 0);
const span = (s: SimState, h: HeroId, n: number, salt: number, [lo, hi]: readonly [number, number]): number => lo + Math.floor(dice(s, h, n, salt) * (hi - lo + 1));

// ---------------------------------------------------------------------------
// Finding them.

/** A hero's record, if their hall stands (or they are leaving it). */
export const heroOf = (s: SimState, h: HeroId): Champion | undefined => s.legends.heroes.find((c) => c.hero === h);
/** Is the hero come and living in the city (home, out in the streets, on a deed, or away for a while)? */
export const isCome = (c: Champion): boolean => c.came >= 0 && c.state !== 'awaited' && c.state !== 'sent';
/** Come and in the city now (not away with an expedition or at sea, nor leaving). */
export const inCity = (c: Champion): boolean => isCome(c) && c.state !== 'abroad' && c.state !== 'sailing' && c.state !== 'leaving';
/** Come and here: the hero by name. */
export const heroHere = (s: SimState, h: HeroId): boolean => {
  const c = heroOf(s, h);
  return !!c && inCity(c);
};
/** Is the hero drawn on the map (walking, at home, fighting)? */
export const heroShown = (c: Champion): boolean => inCity(c) || c.state === 'leaving' || (c.state === 'mustering' && c.path.length > 0);
/** Can this hero slay this monster (Heracles any)? */
export const canSlay = (h: HeroId, k: MonsterId): boolean => HEROES[h].slays.includes(k);
/** The heroes who can slay a monster: its own, and Heracles. */
export const slayersOf = (k: MonsterId): HeroId[] => HERO_IDS.filter((h) => canSlay(h, k));
/** The hall of a hero, if it stands. */
export const hallOf = (s: SimState, c: Champion): Building | undefined => {
  const b = c.hall ? findBuilding(s, c.hall) : undefined;
  return b && b.kind === 'herohall' ? b : undefined;
};

// ---------------------------------------------------------------------------
// Demands.

/** One of a hero's demands: what, met or not, and how far along in words. */
export interface Demand {
  what: string;
  met: boolean;
  have: string;
}

/**
 * Slice 54's sanctuaries, read loosely so this works before and after its
 * merge: a monument site of kind 'sanctuary' to this god, finished, its
 * building standing. INTEGRATOR: replace with `sanctuaryDone(s, god)` from
 * './sanctuaries' once slice 54 is on the trunk.
 */
export function sanctuaryStands(s: SimState, god: GodId): boolean {
  for (const x of s.monuments.sites as ReadonlyArray<{ id: number; kind: string; finished: number; god?: string }>) {
    if (x.kind !== 'sanctuary' || x.god !== god || !x.finished) continue;
    const b = findBuilding(s, x.id);
    if (b && (b.kind as string) === 'sanctuary') return true;
  }
  return false;
}

/**
 * Slice 53's festivals at home, read loosely: the tick of the last festival
 * held to a god (-1 none). INTEGRATOR: replace with `festivalHeld(s, god)`
 * from './worship' once slice 53 is on the trunk.
 */
export function lastFestival(s: SimState, god: GodId): number {
  const last = (s.gods as { lastFestival?: Partial<Record<GodId, number>> }).lastFestival;
  return last?.[god] ?? -1;
}

const standing = (s: SimState, kind: Building['kind']): Building[] => s.buildings.filter((b) => b.kind === kind);
const hasOne = (s: SimState, kind: Building['kind'], what: string): Demand => {
  const n = standing(s, kind).length;
  return { what, met: n > 0, have: n > 0 ? 'built' : 'none yet' };
};
const counted = (what: string, have: number, want: number, unit = ''): Demand => ({ what, met: have >= want, have: `${fmt(Math.min(have, want))} of ${fmt(want)}${unit}` });
const godWarm = (s: SimState, god: GodId): Demand => {
  const m = moodOfGod(s, god);
  const name = GODS[god].name;
  return { what: `${name} warm`, met: moodAtLeast(m, 'warm'), have: moodAtLeast(m, 'warm') ? `${name} is ${moodWord(m)}` : `${name} is ${moodWord(m)} (${m > 0 ? '+' : ''}${Math.round(m)}); warm at +30` };
};
const sanctuary = (s: SimState, god: GodId): Demand => {
  const ok = sanctuaryStands(s, god);
  return { what: `A sanctuary to ${GODS[god].name}`, met: ok, have: ok ? 'finished' : 'none finished yet' };
};
/** The fullest granary: its food against FULL of its wheat room. */
const FULL = 0.9;
const granary = (s: SimState): Demand => {
  let best = 0;
  for (const b of standing(s, 'granary')) best = Math.max(best, b.stock + b.meat + b.cheese);
  const want = Math.round(GRANARY_CAP * FULL);
  const n = standing(s, 'granary').length;
  return { what: 'A full granary', met: best >= want, have: n ? `the fullest holds ${fmt(Math.min(best, want))} of ${fmt(want)}` : 'no granary yet' };
};

/** Each hero's demands, read from the city now. */
export function demandsOf(s: SimState, h: HeroId): Demand[] {
  switch (h) {
    case 'heracles':
      return [sanctuary(s, 'zeus'), counted('2,000 people', s.population, 2000), granary(s)];
    case 'perseus':
      return [godWarm(s, 'athena'), sanctuary(s, 'athena')];
    case 'theseus':
      return [hasOne(s, 'court', 'A court'), counted('Ten fine houses', s.buildings.filter((b) => b.kind === 'home' && b.level >= 5).length, 10)];
    case 'odysseus':
      return [counted('Six triremes', s.fleet.triremes.filter((t) => t.state !== 'building' && t.state !== 'sinking').length, 6), sanctuary(s, 'athena')];
    case 'bellerophon':
      return [hasOne(s, 'horsefarm', 'A horse farm'), counted('Twenty horsemen', s.army.soldiers.filter((x) => companyOf(s, x.company)?.kind === 'horseman').length, 20)];
    case 'jason':
      return [hasOne(s, 'shipyard', 'A shipyard'), counted('Three trade routes', s.world.routes.length, 3)];
    case 'atalanta':
      return [godWarm(s, 'artemis'), counted('Three hunting lodges', standing(s, 'lodge').length, 3)];
  }
}

/** Are all of a hero's demands met now? */
export const demandsMet = (s: SimState, h: HeroId): boolean => demandsOf(s, h).every((d) => d.met);

// ---------------------------------------------------------------------------
// Wishes.

/** A hero's wish: what they want, in words; is it kept (a lasting wish) or when was it last done (a yearly one, -1 never). */
export interface Wish {
  words: string;
  /** A yearly deed (a festival, a voyage) rather than something kept. */
  yearly: boolean;
  /** Kept now (a lasting wish); for a yearly one, done within the year. */
  met: boolean;
  /** A yearly one: the tick it was last done (-1 never). */
  done: number;
}

/** Each hero's one wish, read from the city now. */
export function wishOf(s: SimState, c: Champion): Wish {
  switch (c.hero) {
    case 'heracles': {
      const t = lastFestival(s, 'zeus');
      return { words: 'A festival to Zeus, his father, each year', yearly: true, met: t >= 0 && s.tick - t < TICKS_PER_YEAR, done: t };
    }
    case 'perseus':
      return { words: 'Athena kept pleased or better', yearly: false, met: moodAtLeast(moodOfGod(s, 'athena'), 'pleased'), done: -1 };
    case 'theseus':
      return { words: 'The court kept at work: the law he brought to Athens', yearly: false, met: standing(s, 'court').some((b) => b.workers > 0), done: -1 };
    case 'odysseus':
      return { words: 'To sail away for a season each year: let him go from his hall’s panel', yearly: true, met: c.wish >= 0 && s.tick - c.wish < TICKS_PER_YEAR, done: c.wish };
    case 'bellerophon':
      return { words: 'Pegasus stabled: a horse farm with horses in it', yearly: false, met: standing(s, 'horsefarm').some((b) => held(b, HORSES) > 0), done: -1 };
    case 'jason':
      return { words: 'The Argo’s yard: a shipyard kept at work', yearly: false, met: standing(s, 'shipyard').some((b) => b.workers > 0), done: -1 };
    case 'atalanta':
      return { words: 'Artemis kept pleased or better', yearly: false, met: moodAtLeast(moodOfGod(s, 'artemis'), 'pleased'), done: -1 };
  }
}

/** How long a come hero's wish has gone unmet (ticks; 0 while it holds). */
export const unmetFor = (s: SimState, c: Champion): number => Math.max(0, s.tick - c.wish);

// ---------------------------------------------------------------------------
// Raising a hall (sim.ts places the building; this keeps the record).

/** Why a hall to this hero can't be raised ('' if it can): one to a hero. */
export function hallRefusal(s: SimState, h: string): string {
  if (!HERO_IDS.includes(h as HeroId)) return 'Choose a hero first: the Hero’s hall button on the Mythology tab';
  const c = heroOf(s, h as HeroId);
  if (c && hallOf(s, c)) return `Your city has ${hallName(h as HeroId)} already. One to a hero`;
  if (s.buildings.some((b) => b.kind === 'herohall' && b.hero === h)) return `Your city has ${hallName(h as HeroId)} already. One to a hero`;
  return '';
}

/** A hall raised: its hero awaited (or, a hall for one who left in a huff, awaited again). */
export function hallRaised(s: SimState, b: Building, h: HeroId): void {
  b.hero = h;
  const old = heroOf(s, h);
  if (old) {
    old.hall = b.id;
    return;
  }
  const [x, z] = centreOf(b);
  s.legends.heroes.push({ hero: h, hall: b.id, state: 'awaited', word: -1, came: -1, by: '', next: 0, x, z, face: 0, walked: 0, path: [], seg: 0, along: 0, foe: 0, fight: -1, from: 0, swung: -1, wish: -1, warned: 0, slain: [], ride: false, away: 0, again: 0 });
  const unmet = demandsOf(s, h).filter((d) => !d.met);
  const g = HEROES[h];
  say(s, {
    kind: 'hero',
    u: NEWS,
    title: `${hallName(h)} is raised`,
    words: `${hallName(h)} stands ready for ${g.name}, ${g.epithet}. ${unmet.length ? `${Cap(heOf(h))} will come when your city has ${unmet.map((d) => d.what.charAt(0).toLowerCase() + d.what.slice(1)).join(' and ')}: ${unmet.map((d) => d.have).join('; ')}.` : `${Cap(heOf(h))} has all ${heOf(h)} asks for: word will go out to ${himOf(h)}.`}`,
    at: { building: b.id },
    of: 'hall',
  });
  s.rev++;
}

// ---------------------------------------------------------------------------
// Ways across the land.

/** The walkable tile under or nearest a point, or -1. */
function startAt(map: CoastMap, s: SimState, x: number, z: number): number {
  const n = map.size;
  const t = Math.max(0, Math.min(n - 1, Math.floor(z))) * n + Math.max(0, Math.min(n - 1, Math.floor(x)));
  return nearestWalkable(map, s, t, 4);
}

/** A way from where the hero stands to a tile (and on to a last point, if given): its points. A straight line where no way is found (a hero steps over what's in the way). */
function wayTo(map: CoastMap, s: SimState, c: Champion, goal: number, last?: [number, number]): void {
  const n = map.size;
  const from = startAt(map, s, c.x, c.z);
  const pts: number[] = [c.x, c.z];
  const tiles = from >= 0 && goal >= 0 ? (from === goal ? [goal] : offRoadPath(map, s, [from], goal, 40000)) : null;
  if (tiles) for (const [px, pz] of prunePath(map, s, tiles)) pts.push(px, pz);
  else if (goal >= 0) pts.push((goal % n) + 0.5, Math.floor(goal / n) + 0.5);
  if (last) pts.push(last[0], last[1]);
  c.path = pts.length >= 4 ? pts : [c.x, c.z, c.x, c.z];
  c.seg = 0;
  c.along = 0;
}

/** A step along the way. True once at its end. */
function walkOn(c: Champion): boolean {
  let move = c.state === 'hunting' || c.state === 'mustering' ? HASTE : PACE;
  for (let guard = 0; guard < 8 && move > 0; guard++) {
    const last = c.path.length / 2 - 1;
    if (c.seg >= last) break;
    const i = c.seg * 2;
    const p = c.path;
    const len = dhypot(p[i + 2] - p[i], p[i + 3] - p[i + 1]);
    if (len > 1e-9) c.face = datan2(p[i + 3] - p[i + 1], p[i + 2] - p[i]);
    if (c.along + move < len) {
      c.along += move;
      c.walked += move;
      move = 0;
    } else {
      move -= len - c.along;
      c.walked += len - c.along;
      c.seg++;
      c.along = 0;
    }
  }
  const i = c.seg * 2;
  const p = c.path;
  if (i + 3 < p.length) {
    const len = dhypot(p[i + 2] - p[i], p[i + 3] - p[i + 1]);
    const u = len > 1e-9 ? c.along / len : 0;
    c.x = p[i] + (p[i + 2] - p[i]) * u;
    c.z = p[i + 1] + (p[i + 3] - p[i + 1]) * u;
    return false;
  }
  if (p.length >= 2) [c.x, c.z] = [p[p.length - 2], p[p.length - 1]];
  return true;
}

/** The tile beside a building nearest a point (where a walker reaches it), or -1. */
function besideOf(map: CoastMap, s: SimState, b: Building, x: number, z: number): number {
  const n = map.size;
  let best = -1;
  let bd = Infinity;
  for (const t of around(n, b)) {
    if (!walkable(map, s, t)) continue;
    const d = dhypot((t % n) + 0.5 - x, Math.floor(t / n) + 0.5 - z);
    if (d < bd) [best, bd] = [t, d];
  }
  return best;
}

/** Where a hero stands at home: in the middle of the hall's courtyard (open whichever way the hall faces). */
export function courtyard(b: Building): [number, number] {
  const [cx, cz] = centreOf(b);
  return [cx + 0.15, cz + 0.1];
}

/** Off to the hall: the way to its gate and into its courtyard. */
function wayHome(map: CoastMap, s: SimState, c: Champion, b: Building): void {
  const [hx, hz] = courtyard(b);
  wayTo(map, s, c, besideOf(map, s, b, c.x, c.z), [hx, hz]);
}

/** Where a hero comes in or goes out: by sea, the trading post's quay side (if there is one); by road, the edge nearest the hall they can walk by. Its tile and the point off the map (or on the jetty). */
function gateway(map: CoastMap, s: SimState, c: Champion): { by: 'sea' | 'road'; tile: number; out: [number, number] } | null {
  const n = map.size;
  const post = tradingPost(s);
  if (post) {
    // The tile beside the post nearest the open sea.
    let best = -1;
    let bd = Infinity;
    for (const t of around(n, post)) {
      if (!walkable(map, s, t)) continue;
      const tx = t % n;
      const tz = Math.floor(t / n);
      let d = 9;
      for (let dz = -4; dz <= 4; dz++)
        for (let dx = -4; dx <= 4; dx++) {
          const x = tx + dx;
          const z = tz + dz;
          if (x >= 0 && z >= 0 && x < n && z < n && map.tileWater[z * n + x] === WATER_SEA) d = Math.min(d, dhypot(dx, dz));
        }
      if (d < bd || (d === bd && t < best)) [best, bd] = [t, d];
    }
    if (best >= 0) return { by: 'sea', tile: best, out: [(best % n) + 0.5, Math.floor(best / n) + 0.5] };
  }
  const b = hallOf(s, c);
  const from = b ? besideOf(map, s, b, ...centreOf(b)) : startAt(map, s, c.x, c.z);
  if (from < 0) return null;
  const can = reach(map, s, from);
  const [hx, hz] = [(from % n) + 0.5, Math.floor(from / n) + 0.5];
  let edge = -1;
  let ed = Infinity;
  for (let i = 0; i < n; i++) {
    for (const t of [i, (n - 1) * n + i, i * n, i * n + n - 1]) {
      if (!can[t]) continue;
      const d = dhypot((t % n) + 0.5 - hx, Math.floor(t / n) + 0.5 - hz);
      if (d < ed || (d === ed && t < edge)) [edge, ed] = [t, d];
    }
  }
  if (edge < 0) return null;
  const tx = edge % n;
  const tz = Math.floor(edge / n);
  return { by: 'road', tile: edge, out: [tx === 0 ? -2 : tx === n - 1 ? n + 2 : tx + 0.5, tz === 0 ? -2 : tz === n - 1 ? n + 2 : tz + 0.5] };
}

// ---------------------------------------------------------------------------
// Each tick.

/**
 * Once a tick: each hero awaited, coming, at home, out and about, at a
 * fight, away or leaving; the fête's end; the places of legend's visitors on
 * the first of the month. Nothing at all with no hall raised, no fête and no
 * place of legend.
 */
export function stepHeroes(s: SimState, map: CoastMap): void {
  const L = s.legends;
  if (L.slain.length && s.tick > 0 && s.tick % TICKS_PER_MONTH === 0) {
    const n = L.slain.length;
    income(s, LEGEND_COIN * n, 'legends', n === 1 ? `visitors to ${placeName(L.slain[0].kind, L.slain[0].den)}` : 'visitors to the places of legend', n);
  }
  if (L.fete && s.tick >= L.fete.until) {
    L.fete = null;
    s.rev++;
  }
  if (!L.heroes.length) return;
  for (const c of L.heroes.slice()) stepOne(s, map, c);
}

function stepOne(s: SimState, map: CoastMap, c: Champion): void {
  const hall = hallOf(s, c);
  if (!hall && c.hall) {
    c.hall = 0;
    hallLost(s, map, c);
    if (!s.legends.heroes.includes(c)) return;
  }
  switch (c.state) {
    case 'awaited':
      if (s.tick % TICKS_PER_DAY === 0 && hall && s.tick >= c.again && demandsMet(s, c.hero)) sendWord(s, c, hall);
      return;
    case 'sent':
      if (s.tick >= c.next) arrive(s, map, c);
      return;
    case 'arriving':
      if (walkOn(c)) atHome(s, c, true);
      return;
    case 'home':
      if (hall && rideOut(s, map, c)) return;
      if (wishes(s, map, c)) return;
      if (s.tick >= c.next && hall) stroll(s, map, c, hall);
      return;
    case 'strolling':
      if (rideOut(s, map, c)) return;
      if (walkOn(c)) {
        if (c.next < 0) c.next = s.tick + LINGER;
        else if (s.tick >= c.next) goHome(s, map, c);
      }
      return;
    case 'returning':
      if (walkOn(c)) {
        if (hall) atHome(s, c, false);
        else leave(s, map, c, '');
      }
      return;
    case 'hunting':
      hunt(s, map, c);
      return;
    case 'waiting':
      waitAt(s, map, c);
      return;
    case 'fighting':
      fight(s, map, c);
      return;
    case 'mustering':
      muster(s, map, c);
      return;
    case 'abroad':
      abroad(s, map, c);
      return;
    case 'sailing':
      if (c.path.length) {
        if (walkOn(c)) {
          c.path = [];
          s.rev++;
        }
      } else if (s.tick >= c.next) backFromSea(s, map, c);
      return;
    case 'leaving':
      if (walkOn(c)) gone(s, c);
      return;
  }
}

/** All met: word goes out, and they come within the month. */
function sendWord(s: SimState, c: Champion, hall: Building): void {
  c.state = 'sent';
  c.word = s.tick;
  c.next = s.tick + span(s, c.hero, c.word, 1, ARRIVE);
  const g = HEROES[c.hero];
  const days = Math.round((c.next - s.tick) / TICKS_PER_DAY);
  say(s, { kind: 'hero', u: NEWS, title: `Word goes out to ${g.name}`, words: `${g.name}, ${g.epithet}, has heard of your city and the hall it has raised for ${himOf(c.hero)}, and that all ${heOf(c.hero)} asked for is here. ${Cap(heOf(c.hero))} will come within the month (in about ${days} days).`, at: { building: hall.id }, of: 'word' });
  s.rev++;
}

/** They come: by sea at the quay, or by road from the edge, and walk to the hall. */
function arrive(s: SimState, map: CoastMap, c: Champion): void {
  const hall = hallOf(s, c);
  const g = gateway(map, s, c);
  if (!hall || !g) {
    // (No way in at all: they are simply there, in the courtyard.)
    if (hall) {
      [c.x, c.z] = courtyard(hall);
      c.came = s.tick;
      c.by = 'road';
      atHome(s, c, true);
    }
    return;
  }
  [c.x, c.z] = g.out;
  c.by = g.by;
  c.came = s.tick;
  c.wish = s.tick;
  c.warned = 0;
  c.state = 'arriving';
  wayHome(map, s, c, hall);
  const n = map.size;
  if (g.by === 'road') {
    // (From off the map: in through the edge tile first.)
    const [ex, ez] = [(g.tile % n) + 0.5, Math.floor(g.tile / n) + 0.5];
    if (c.path[2] !== ex || c.path[3] !== ez) c.path.splice(2, 0, ex, ez);
  }
  const h = HEROES[c.hero];
  say(s, {
    kind: 'hero',
    u: ALARM,
    title: `${h.name} has come`,
    words: `${h.name}, ${h.epithet}, has come to your city ${g.by === 'sea' ? 'by sea: ' + hisOf(c.hero) + ' ship ties up at the trading post' : 'by road'}, and walks to ${hisOf(c.hero)} hall. ${slaysWords(c.hero)} ${Cap(heOf(c.hero))} has one wish of ${hisOf(c.hero)} own: ${wishOf(s, c).words.charAt(0).toLowerCase()}${wishOf(s, c).words.slice(1)}.`,
    at: { building: hall.id },
    of: 'came',
  });
  s.rev++;
}

/** "Theseus can slay the Minotaur." */
export function slaysWords(h: HeroId): string {
  if (h === 'heracles') return 'He can slay any monster that comes to your land.';
  return `${Cap(heOf(h))} can slay ${beastName(HEROES[h].slays[0])}.`;
}

/** At home in the courtyard; the next walk out some days off. */
function atHome(s: SimState, c: Champion, first: boolean): void {
  const hall = hallOf(s, c);
  c.state = 'home';
  if (hall) [c.x, c.z] = courtyard(hall);
  c.path = [];
  c.seg = 0;
  c.along = 0;
  c.face = Math.PI / 2;
  c.next = s.tick + span(s, c.hero, s.tick, first ? 2 : 3, STROLL);
  s.rev++;
}

/** A walk out to a busy place within reach of the hall (by the dice): an agora, the theatre, the court, a fountain or a home. */
function stroll(s: SimState, map: CoastMap, c: Champion, hall: Building): void {
  const [hx, hz] = centreOf(hall);
  const places = s.buildings.filter((b) => {
    if (b.id === hall.id) return false;
    if (!(b.kind === 'agora' || b.kind === 'theatre' || b.kind === 'court' || b.kind === 'fountain' || (b.kind === 'home' && b.level >= 3))) return false;
    const [x, z] = centreOf(b);
    const d = dhypot(x - hx, z - hz);
    return d >= 4 && d <= STROLL_REACH;
  });
  c.next = s.tick + span(s, c.hero, s.tick, 4, STROLL);
  if (!places.length) return;
  const b = places[Math.floor(dice(s, c.hero, s.tick, 5) * places.length)];
  const t = besideOf(map, s, b, hx, hz);
  if (t < 0) return;
  wayTo(map, s, c, t);
  c.state = 'strolling';
  c.next = -1;
  s.rev++;
}

/** Off home to the hall (or, with none, away). */
function goHome(s: SimState, map: CoastMap, c: Champion): void {
  const hall = hallOf(s, c);
  if (!hall) return leave(s, map, c, '');
  c.state = 'returning';
  wayHome(map, s, c, hall);
  s.rev++;
}

// ---------------------------------------------------------------------------
// Slaying.

/** Why a hero can't be sent against a monster now ('' if they can). */
export function sendRefusal(s: SimState, h: HeroId, id: number): string {
  const c = heroOf(s, h);
  const name = nameOf(h);
  if (!c || !isCome(c)) return `${name} has not come to your city`;
  const m = monsterOf(s, id);
  if (!m) return 'There is no such monster on your land';
  if (!canSlay(h, m.kind)) {
    const who = slayersOf(m.kind).map(nameOf);
    return `${name} can slay only ${beastName(HEROES[h].slays[0])}; ${who.join(' or ')} can slay ${beastName(m.kind)}`;
  }
  if (c.state === 'abroad' || c.state === 'mustering') return `${name} is away with your expedition`;
  if (c.state === 'sailing') return `${name} is away at sea`;
  if (c.state === 'leaving') return `${name} is leaving your city`;
  if (c.state === 'hunting' || c.state === 'waiting' || c.state === 'fighting') return c.foe === id ? `${name} is on ${hisOf(h)} way to it already` : `${name} is out against another monster`;
  if (m.state === 'coming' || m.state === 'settling') return `${Cap(beastName(m.kind))} has not settled in ${itsLair(m)} yet`;
  if (m.state === 'leaving') return `${Cap(beastName(m.kind))} is leaving your land`;
  const other = s.legends.heroes.find((o) => o !== c && o.foe === id && (o.state === 'hunting' || o.state === 'waiting' || o.state === 'fighting'));
  if (other) return `${nameOf(other.hero)} is on ${hisOf(other.hero)} way to it already`;
  return '';
}

const itsLair = (m: Beast): string => `${itsOf(m.kind)} ${denNoun(m.den)}`;

/** Send a hero against a monster (a command; nothing if sendRefusal says no). */
export function sendHero(s: SimState, map: CoastMap, h: HeroId, id: number): void {
  if (sendRefusal(s, h, id) !== '') return;
  const c = heroOf(s, h) as Champion;
  const m = monsterOf(s, id) as Beast;
  c.foe = id;
  c.state = 'hunting';
  c.ride = false;
  wayTo(map, s, c, lairSpot(s, m).tile);
  const it = itOf(m.kind);
  say(s, { kind: 'hero', u: NEWS, title: `${nameOf(h)} sets out`, words: `${nameOf(h)} sets out from ${hisOf(h)} hall for ${beastName(m.kind)}’s ${denNoun(m.den)}. ${m.state === 'raiding' || m.state === 'returning' ? `${Cap(it)} is out raiding: ${heOf(h)} will wait for ${monsterHim(m.kind)} there.` : `${Cap(heOf(h))} will fight ${monsterHim(m.kind)} there.`}`, at: { tile: m.lair }, of: 'hunt' });
  s.rev++;
}

/** On the way to the lair. */
function hunt(s: SimState, map: CoastMap, c: Champion): void {
  const m = monsterOf(s, c.foe);
  if (!m || m.state === 'leaving') return giveUp(s, map, c, m);
  if (!walkOn(c)) return;
  c.state = 'waiting';
  waitAt(s, map, c);
}

/** At the lair: when the monster is there too, the fight begins. */
function waitAt(s: SimState, map: CoastMap, c: Champion): void {
  const m = monsterOf(s, c.foe);
  if (!m || m.state === 'leaving') return giveUp(s, map, c, m);
  const spot = lairSpot(s, m);
  // Face the lair while waiting.
  c.face = datan2(spot.z - c.z, spot.x - c.x);
  const home = m.state === 'healing' || (m.state === 'lair' && dhypot(m.x - spot.x, m.z - spot.z) < 1.5);
  if (home) startFight(s, c, m);
}

/** The monster gone before the hero got to it (slain by another, called home): back to the hall. */
function giveUp(s: SimState, map: CoastMap, c: Champion, m: Beast | undefined): void {
  c.foe = 0;
  c.fight = -1;
  if (m) m.held = 0;
  goHome(s, map, c);
}

/** Hero and monster at the lair: the fight begins. The monster is held (it fights only the hero) and out of any battle. */
function startFight(s: SimState, c: Champion, m: Beast): void {
  const spot = lairSpot(s, m);
  m.held = HERO_IDS.indexOf(c.hero) + 1;
  m.state = 'lair';
  m.x = spot.x;
  m.z = spot.z;
  m.path = [];
  m.seg = 0;
  m.along = 0;
  m.target = 0;
  m.aim = '';
  m.wait = 0;
  m.broke = false;
  // (Out of any battle: no foe for soldiers or towers while the hero fights it.)
  if (m.foe) {
    const id = m.foe;
    s.army.foes = s.army.foes.filter((f) => f.id !== id);
    for (const x of s.army.soldiers) if (x.foe === id) x.foe = 0;
    m.foe = 0;
  }
  c.state = 'fighting';
  c.fight = s.tick;
  c.from = m.hp;
  c.path = [];
  // The hero squares up to it before its den's mouth, out in the open, where the fight can be watched.
  placeInFight(c, m, m.mouth);
  say(s, { kind: 'hero', u: ALARM, title: `${nameOf(c.hero)} fights ${beastName(m.kind)}`, words: `${nameOf(c.hero)} has met ${beastName(m.kind)} before ${itsLair(m)}, and they fight. It will be a long fight: watch it from here.`, at: { tile: m.lair }, of: 'fight' });
  s.rev++;
}

/** The hero's place in the fight: at their distance from the monster, at angle `a` round it, the two facing. */
function placeInFight(c: Champion, m: Beast, a: number): void {
  const r = MAKES[m.kind].bulk + FIGHT_GAP;
  c.x = m.x + dcos(a) * r;
  c.z = m.z + dsin(a) * r;
  c.face = datan2(m.z - c.z, m.x - c.x);
  m.face = datan2(c.z - m.z, c.x - m.x);
}

/** The fight: blow for blow, the hero circling, the monster's health falling; at its end, slain. */
function fight(s: SimState, map: CoastMap, c: Champion): void {
  const m = monsterOf(s, c.foe);
  if (!m) return giveUp(s, map, c, m);
  const t = s.tick - c.fight;
  const p = Math.min(1, t / FIGHT);
  m.hp = Math.max(1, Math.round(c.from * (1 - p)));
  // Circling: the hero steps round it a little, this way and that.
  const a0 = datan2(c.z - m.z, c.x - m.x);
  const drift = 0.02 * dsin((t / FIGHT) * Math.PI * 6 + HERO_IDS.indexOf(c.hero));
  placeInFight(c, m, a0 + drift);
  c.walked += Math.abs(drift) * (MAKES[m.kind].bulk + FIGHT_GAP);
  if (t % BLOW === 0) c.swung = s.tick;
  if (t % BLOW === BLOW / 2) m.swung = s.tick;
  if (t >= FIGHT) slay(s, map, c, m);
}

/** The end of the fight: the monster slain, the fête, its god satisfied, the lair a place of legend; the hero walks home. */
function slay(s: SimState, map: CoastMap, c: Champion, m: Beast): void {
  const h = HEROES[c.hero];
  const kind = m.kind;
  const god = m.god;
  const den = m.den;
  const lair = m.lair;
  m.held = 0;
  slayMonster(s, m.id, h.name, true);
  c.slain.push(kind);
  c.foe = 0;
  c.fight = -1;
  const hall = hallOf(s, c);
  s.legends.fete = { until: s.tick + FETE, hero: c.hero, kind, hall: hall?.id ?? 0 };
  honour(s, god, SATISFIED, 'slain', `${beastName(kind)} slain by ${h.name}: the score is settled`, TICKS_PER_YEAR);
  // (Bellerophon's wish is Pegasus's: a deed doesn't touch it. Odysseus's voyage neither.)
  say(s, {
    kind: 'hero',
    u: ALARM,
    title: `${h.name} has slain ${beastName(kind)}`,
    words: `After ${num(Math.round(FIGHT / TICKS_PER_DAY))} days of fighting, ${h.name} has slain ${beastName(kind)} before ${itsOf(kind)} ${denNoun(den)}. The city celebrates for a week${hall ? `, and crowds gather at ${hallName(c.hero)}` : ''}. ${GODS[god].name}, who sent it, is satisfied. ${Cap(placeName(kind, den))} is a place of legend now: visitors will come to see it and leave a little coin.`,
    at: { tile: lair },
    of: 'slew',
  });
  goHome(s, map, c);
}

/** "the Minotaur's cave", "the Hydra's marsh". */
export function placeName(kind: MonsterId, den: Beast['den']): string {
  return `${beastName(kind)}’s ${denNoun(den)}`;
}

// ---------------------------------------------------------------------------
// Abroad, at sea, and gone.

/** Ordered to ride, at home or about the streets: an expedition mustering takes them. True if they set off. */
function rideOut(s: SimState, map: CoastMap, c: Champion): boolean {
  if (!c.ride) return false;
  const e = s.world.expeditions.find((x) => x.phase === 'mustering' && !x.from);
  if (!e) return false;
  c.away = e.id;
  c.state = 'mustering';
  wayTo(map, s, c, e.edge);
  say(s, { kind: 'hero', u: NEWS, title: `${nameOf(c.hero)} rides out`, words: `${nameOf(c.hero)} goes with your expedition against ${placeOfCity(e)}: ${heOf(c.hero)} is worth ${c.hero === 'heracles' ? 'fifty' : 'thirty'} men or more in the fight.`, at: { tile: e.edge }, of: 'ride' });
  s.rev++;
  return true;
}

const placeOfCity = (e: Expedition): string => PLACES[e.city]?.name ?? e.city;

/** Walking to the expedition's edge; there, away with it. */
function muster(s: SimState, map: CoastMap, c: Champion): void {
  const e = s.world.expeditions.find((x) => x.id === c.away);
  if (!e || e.phase === 'back' || e.phase === 'done') {
    c.away = 0;
    c.ride = false;
    return goHome(s, map, c);
  }
  if (!walkOn(c)) return;
  c.state = 'abroad';
  c.path = [];
  s.rev++;
}

/** Away with the expedition: home with it when it is back on your land. */
function abroad(s: SimState, map: CoastMap, c: Champion): void {
  const e = s.world.expeditions.find((x) => x.id === c.away);
  if (e && e.phase !== 'back' && e.phase !== 'done') return;
  const n = map.size;
  const at = e ? e.edge : startAt(map, s, c.x, c.z);
  if (at >= 0) [c.x, c.z] = [(at % n) + 0.5, Math.floor(at / n) + 0.5];
  c.away = 0;
  c.ride = false;
  goHome(s, map, c);
}

/** A hero's might in an expedition's fight (expeditions.ts adds it to yours). */
export function heroMight(s: SimState, e: Expedition): number {
  let k = 0;
  for (const c of s.legends.heroes) if (c.away === e.id && (c.state === 'abroad' || c.state === 'mustering')) k += c.hero === 'heracles' ? MIGHT_HERACLES : MIGHT_HERO;
  return k;
}

/** The report's line for the heroes who fought with it ('' none). */
export function heroesFought(s: SimState, e: Expedition): string {
  const with_ = s.legends.heroes.filter((c) => c.away === e.id && (c.state === 'abroad' || c.state === 'mustering'));
  if (!with_.length) return '';
  const names = with_.map((c) => nameOf(c.hero));
  const worth = (c: Champion): string => (c.hero === 'heracles' ? 'fifty men' : 'forty men');
  return with_.length === 1 ? `${names[0]} fought beside them, worth ${worth(with_[0])} on ${hisOf(with_[0].hero)} own: the odds were the better for it.` : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} fought beside them, each worth forty men or more: the odds were the better for it.`;
}

/** Odysseus let go for a season at sea (a command): to the quay or the edge, and gone SAIL. */
export function sailRefusal(s: SimState, h: HeroId): string {
  const c = heroOf(s, h);
  if (h !== 'odysseus') return `${nameOf(h)} has no wish to sail`;
  if (!c || !isCome(c)) return 'Odysseus has not come to your city';
  if (!(c.state === 'home' || c.state === 'strolling' || c.state === 'returning')) return 'Odysseus is not at home';
  return '';
}

export function letSail(s: SimState, map: CoastMap, h: HeroId): void {
  if (sailRefusal(s, h) !== '') return;
  const c = heroOf(s, h) as Champion;
  const g = gateway(map, s, c);
  c.state = 'sailing';
  c.wish = s.tick;
  c.warned = 0;
  c.next = s.tick + SAIL;
  if (g) {
    wayTo(map, s, c, g.tile, g.by === 'road' ? g.out : undefined);
  } else c.path = [];
  say(s, { kind: 'hero', u: NEWS, title: 'Odysseus sails', words: `Odysseus ${g?.by === 'sea' ? 'takes ship at the trading post' : 'goes down to the sea'} and sails away for a season, glad to be let go. He will be back in about three months.`, at: g ? { tile: g.tile } : undefined, of: 'sail' });
  s.rev++;
}

/** Back from sea: in at the quay or the edge, home to the hall. */
function backFromSea(s: SimState, map: CoastMap, c: Champion): void {
  const g = gateway(map, s, c);
  if (g) [c.x, c.z] = g.out;
  say(s, { kind: 'hero', u: NEWS, title: 'Odysseus is home', words: 'Odysseus is home from the sea, full of stories, and walks up to his hall.', at: g ? { tile: g.tile } : undefined, of: 'home' });
  goHome(s, map, c);
}

/** The wish's clock, once a day while they are at home: met, it resets; unmet a year, restless; two, they leave (warned a month before). True if they leave. */
function wishes(s: SimState, map: CoastMap, c: Champion): boolean {
  if (s.tick % TICKS_PER_DAY !== 0) return false;
  const w = wishOf(s, c);
  if (w.yearly) {
    if (w.done > c.wish) c.wish = w.done;
  } else if (w.met) c.wish = s.tick;
  const gone = unmetFor(s, c);
  if (gone < RESTLESS) {
    c.warned = 0;
    return false;
  }
  const h = HEROES[c.hero];
  const wish = `${w.words.charAt(0).toLowerCase()}${w.words.slice(1)}`;
  const at = c.hall ? { building: c.hall } : undefined;
  if (gone >= LEAVE) {
    leave(s, map, c, wish);
    return true;
  }
  if (gone >= LEAVE - TICKS_PER_MONTH && c.warned < 2) {
    c.warned = 2;
    say(s, { kind: 'hero', u: WARNING, title: `${h.name} will leave`, words: `${h.name} will leave your city within the month: ${heOf(c.hero)} asked for ${wish}, and has waited two years.`, at, of: 'wish' });
  } else if (c.warned < 1) {
    c.warned = 1;
    say(s, { kind: 'hero', u: WARNING, title: `${h.name} is restless`, words: `${h.name} grows restless: a year has gone by without what ${heOf(c.hero)} asks of your city, ${wish}. Give it within the year, or ${heOf(c.hero)} will leave.`, at, of: 'wish' });
  }
  return false;
}

/** Gone: walking off by the quay or the edge (`why`: the wish ignored, '' for a hall gone). */
function leave(s: SimState, map: CoastMap, c: Champion, why: string): void {
  const g = gateway(map, s, c);
  const h = HEROES[c.hero];
  c.state = 'leaving';
  c.foe = 0;
  c.ride = false;
  if (g) wayTo(map, s, c, g.tile, g.by === 'road' ? g.out : undefined);
  else c.path = [c.x, c.z, c.x, c.z];
  say(s, {
    kind: 'hero',
    u: WARNING,
    title: `${h.name} leaves`,
    words: why ? `${h.name} is leaving your city: ${heOf(c.hero)} asked for ${why}, and it never came. ${Cap(hisOf(c.hero))} hall stands empty; ${heOf(c.hero)} may come back in a year, if all ${heOf(c.hero)} asks for is here.` : `With ${hisOf(c.hero)} hall gone, ${h.name} is leaving your city.`,
    at: g ? { tile: g.tile } : undefined,
    of: 'left',
  });
  s.rev++;
}

/** Off the land: awaited again (not before AGAIN) if the hall stands, else forgotten. */
function gone(s: SimState, c: Champion): void {
  if (!hallOf(s, c)) {
    s.legends.heroes = s.legends.heroes.filter((o) => o !== c);
    s.rev++;
    return;
  }
  c.state = 'awaited';
  c.came = -1;
  c.word = -1;
  c.by = '';
  c.path = [];
  c.again = s.tick + AGAIN;
  c.wish = -1;
  c.warned = 0;
  s.rev++;
}

/** The hall is gone (pulled down, burnt, wrecked): an awaited hero is forgotten; one come leaves when next home (now, if at home). */
function hallLost(s: SimState, map: CoastMap, c: Champion): void {
  if (c.state === 'awaited' || c.state === 'sent') {
    s.legends.heroes = s.legends.heroes.filter((o) => o !== c);
    s.rev++;
    return;
  }
  if (c.state === 'home' || c.state === 'strolling') leave(s, map, c, '');
}

// ---------------------------------------------------------------------------
// The commands.

/** A hero's order (a command; anything refused does nothing). */
export function heroCommand(s: SimState, map: CoastMap, c: { hero: HeroId; act: string; monster?: number; on?: boolean }): void {
  if (!HERO_IDS.includes(c.hero)) return;
  if (c.act === 'slay' && Number.isInteger(c.monster)) sendHero(s, map, c.hero, c.monster as number);
  else if (c.act === 'sail') letSail(s, map, c.hero);
  else if (c.act === 'ride') {
    const h = heroOf(s, c.hero);
    if (!h || !isCome(h) || h.state === 'leaving') return;
    const on = c.on === true;
    if (h.ride === on) return;
    h.ride = on;
    s.rev++;
  }
}

// ---------------------------------------------------------------------------
// The city's pride (folk.ts reads these).

/** A home's moods from its heroes: the fête while it lasts, and pride in a hall near it whose hero lives there. */
export function heroMoods(s: SimState, b: Building): Array<{ w: number; text: string }> {
  const L = s.legends;
  if (!L.heroes.length && !L.fete) return [];
  const out: Array<{ w: number; text: string }> = [];
  if (L.fete && s.tick < L.fete.until) out.push({ w: 2, text: `The city celebrates: ${nameOf(L.fete.hero)} has slain ${beastName(L.fete.kind)}` });
  let near: Champion | null = null;
  let nd = Infinity;
  const [bx, bz] = centreOf(b);
  for (const c of L.heroes) {
    if (!isCome(c) || c.state === 'leaving') continue;
    const hall = hallOf(s, c);
    if (!hall) continue;
    const [hx, hz] = centreOf(hall);
    const d = dhypot(hx - bx, hz - bz);
    if (d <= PRIDE_REACH && d < nd) [near, nd] = [c, d];
  }
  if (near) out.push({ w: 1, text: `Proud to live near ${hallName(near.hero)}` });
  return out;
}

// ---------------------------------------------------------------------------
// In words.

/** What a hero is doing, for the tip and panel. */
export function heroDoing(s: SimState, c: Champion): string {
  const he = heOf(c.hero);
  const m = c.foe ? monsterOf(s, c.foe) : undefined;
  switch (c.state) {
    case 'awaited': {
      if (c.again > s.tick) return `Gone from your city; ${he} may be won back in ${Math.ceil((c.again - s.tick) / TICKS_PER_MONTH)} months`;
      const left = demandsOf(s, c.hero).filter((d) => !d.met).length;
      return left ? `Awaited: ${num(left)} of ${hisOf(c.hero)} demands still to meet` : 'Awaited: word will go out to them tomorrow';
    }
    case 'sent': {
      const d = Math.max(1, Math.ceil((c.next - s.tick) / TICKS_PER_DAY));
      return `Word has gone out: ${he} comes in about ${d} ${d === 1 ? 'day' : 'days'}`;
    }
    case 'arriving':
      return `Just come ${c.by === 'sea' ? 'by sea' : 'by road'}, walking to ${hisOf(c.hero)} hall`;
    case 'home':
      return `At home in ${hisOf(c.hero)} hall`;
    case 'strolling':
      return 'Out walking the streets, greeted wherever ' + he + ' goes';
    case 'returning':
      return `Walking home to ${hisOf(c.hero)} hall`;
    case 'hunting':
      return m ? `On ${hisOf(c.hero)} way to ${placeName(m.kind, m.den)}, to slay it` : 'On a deed';
    case 'waiting':
      return m ? `Waiting at ${placeName(m.kind, m.den)} for it to come home from its raid` : 'Waiting';
    case 'fighting': {
      const d = Math.max(0, Math.ceil((c.fight + FIGHT - s.tick) / TICKS_PER_DAY));
      return m ? `Fighting ${beastName(m.kind)}, blow for blow: about ${d} ${d === 1 ? 'day' : 'days'} more` : 'Fighting';
    }
    case 'mustering':
      return 'Walking out to join your expedition';
    case 'abroad': {
      const e = s.world.expeditions.find((x) => x.id === c.away);
      return e ? `Away with your expedition against ${placeOfCity(e)}` : 'Away with your expedition';
    }
    case 'sailing':
      return `Away at sea for the season, back in about ${Math.max(1, Math.ceil((c.next - s.tick) / TICKS_PER_DAY))} days`;
    case 'leaving':
      return 'Leaving your city';
  }
}

/** A hero's tip: who, what they are doing, what they can slay, their wish. */
export function heroTip(s: SimState, c: Champion): { title: string; detail: string } {
  const g = HEROES[c.hero];
  const w = wishOf(s, c);
  const lines = [heroDoing(s, c), slaysWords(c.hero), c.slain.length ? `Has slain ${c.slain.map((k) => beastName(k)).join(' and ')} here` : '', `Wish: ${w.words}${w.met ? ' (kept)' : unmetFor(s, c) >= RESTLESS ? ' (restless: not kept for a year)' : ''}`];
  return { title: `${g.name}, ${g.epithet}`, detail: lines.filter(Boolean).join('\n') };
}

/** A hall's tip: whose, what they are doing, and the demands still to meet (or what they slay). */
export function hallStatus(s: SimState, b: Building): { title: string; detail: string } {
  const h = b.hero;
  if (!h) return { title: 'A hero’s hall', detail: '' };
  const c = heroOf(s, h);
  const lines = [c ? heroDoing(s, c) : 'Awaited'];
  if (!c || !isCome(c)) {
    const left = demandsOf(s, h).filter((d) => !d.met);
    if (left.length) lines.push(`Still to meet: ${left.map((d) => `${d.what[0].toLowerCase()}${d.what.slice(1)} (${d.have})`).join(', ')}`);
  } else lines.push(slaysWords(h));
  return { title: hallName(h), detail: lines.join('\n') };
}

/** A place of legend's tip. */
export function legendTip(s: SimState, i: number): { title: string; detail: string } | null {
  const d = s.legends.slain[i];
  if (!d) return null;
  const god = MONSTERS[d.kind].god;
  return { title: `${Cap(placeName(d.kind, d.den))} · a place of legend`, detail: [`Where ${d.by} slew ${beastName(d.kind)}, sent by ${GODS[god].name}`, `Visitors come to see it, and leave ${LEGEND_COIN} dr a month`].join('\n') };
}
