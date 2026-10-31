/**
 * Slice 56: the gods walk your streets. A god comes to the city in person
 * (towering, glowing: src/render/gods.ts draws them), walks to the places
 * they love and blesses each for a season, then leaves as they came.
 *
 * - **Why they come.** When their mood first reaches loving (once a day, with
 *   the gods switched on; at most once a year for love), and when another
 *   system calls `startVisit` (slice 53's festivals, slice 54's finished
 *   sanctuaries, at their merges). A demo can pose all twelve in a row
 *   (`#pantheon`): posed, they never move or leave.
 * - **Where they arrive.** Somewhere fitting them (arrivalOf): Poseidon on
 *   the shore, Demeter among the fields, Hephaestus by the forge, Artemis in
 *   the woods, the others at a shrine dedicated to them, else the agora,
 *   else the middle of the town. Never on water.
 * - **Where they go.** Up to MOST_STOPS of the places they love (LOVED), the
 *   nearest of each kind first, in a tour from where they arrived; a god
 *   with none of theirs walks among the homes in the middle of the town.
 * - **How they move.** Arriving (the flourish) for ARRIVE_TICKS; then in
 *   straight lines over everything, never blocked by buildings or water, at
 *   GOD_SPEED; blessing each place for BLESS_TICKS; leaving where they stand
 *   (the flourish reversed) for LEAVE_TICKS. A visit that would run past
 *   VISIT_TICKS drops the places it hasn't reached (never the first).
 * - **A blessing** lasts until the start of the season after next (three to
 *   six months): no fire risk or wear builds up in the place (hazards.ts), a
 *   maker works a quarter faster (production.ts, `boonOf`), a home's mood
 *   lifts (folk.ts). The lookup is `blessingOn` in pantheon.ts.
 * - **Said** through `say`, kind `epiphany`: who has come and why, each place
 *   blessed, and who has gone.
 *
 * Pure: no random numbers at all; sums through dmath. Moods only through the
 * groundwork's API (moodOfGod, reasonsOf, moodAtLeast).
 */
import type { CoastMap } from '../map/bake';
import { WATER_NONE, WATER_SEA } from '../map/bake';
import { DISTRICTS, districtAt } from '../map/districts';
import { datan2, dhypot } from '../map/dmath';
import { mapOf } from '../map/lands';
import { BUILDING_NAMES, centreOf, findBuilding, footSide } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_YEAR } from './clock';
import { say } from './messages';
import { blessingOn, GOD_IDS, GODS, goddess, moodAtLeast, moodOfGod, reasonsOf, type GodId } from './pantheon';
import { nextSeasonAt, SEASON_NAMES, seasonAt, TICKS_PER_SEASON } from './seasons';
import type { Building, BuildingKind, SimState } from './state';

// ---------------------------------------------------------------------------
// The state (in `gods.walks`: see pantheon.ts).

/** Where a god is in their visit. `posing`: standing for #pantheon, never moving or leaving. */
export type WalkState = 'arriving' | 'walking' | 'blessing' | 'leaving' | 'posing';
/** Why a god came: loving the city, a festival to them, their sanctuary finished; or posed for #pantheon. */
export type VisitWhy = 'loving' | 'festival' | 'sanctuary' | 'pose';
export const VISIT_WHYS: readonly VisitWhy[] = ['loving', 'festival', 'sanctuary', 'pose'];

/** A place a god means to visit: a building (by id), and its middle. */
export interface Stop {
  id: number;
  x: number;
  z: number;
}

/** A god in the city. */
export interface GodFigure {
  id: number;
  god: GodId;
  /** Where they stand (world units), and where they stood a tick ago (the renderer steps between the two). */
  x: number;
  z: number;
  px: number;
  pz: number;
  /** Which way they face (radians, 0 towards +z, as datan2(dx, dz)). */
  heading: number;
  state: WalkState;
  /** The tick the state began. */
  since: number;
  why: VisitWhy;
  /** Why they came, in words: "she is pleased with your full granaries". */
  words: string;
  /** The places they mean to visit, in order, and which is next (stops.length: none left). */
  stops: Stop[];
  at: number;
  /** The tick they came, and the latest they mean to stay until (-1: posed, never). */
  came: number;
  leaves: number;
  /** The places they have blessed on this visit (building ids). */
  blessed: number[];
}

/** A place blessed: the building, the god, and the tick it lasts until. */
export interface Blessing {
  id: number;
  god: GodId;
  until: number;
}

/** The gods in the city (`gods.walks`). */
export interface Walks {
  figures: GodFigure[];
  blessed: Blessing[];
  /** The gods who were loving at the last daily look: a visit comes as a god first reaches loving. */
  loving: GodId[];
  /** When each god last came, by god (none: never). */
  last: Partial<Record<GodId, number>>;
  /** The next figure's id. */
  next: number;
}

// ---------------------------------------------------------------------------
// The numbers (to tune by eye).

/** The most gods walking in the city at once (a pose for #pantheon doesn't count). */
export const MAX_GODS = 3;
/** A god's pace, tiles a tick: about a body's height a second at normal speed for a figure five times a man's height (a walker's is 0.12). */
export const GOD_SPEED = 0.15;
/** The arrival's flourish, and the leaving's. */
export const ARRIVE_TICKS = 3 * TICKS_PER_DAY;
export const LEAVE_TICKS = 3 * TICKS_PER_DAY;
/** How long a god pauses at each place, blessing it. */
export const BLESS_TICKS = 15;
/** The longest a visit lasts: places not reached by then are dropped (the first never is). A day passes in a second at normal speed, so a few days would be over before you could follow it. */
export const VISIT_TICKS = 30 * TICKS_PER_DAY;
/** The most places a god visits. */
export const MOST_STOPS = 4;
/** A god comes for love at most once in this long. */
export const LOVE_GAP = TICKS_PER_YEAR;
/** Which way a posed god faces: towards the original look's camera over the town (from the north-east, yaw 3π/4). */
export const POSE_HEADING = Math.PI * 0.75;
/** How far short of a place's middle a god stops: half its side and this. */
const STAND_OFF = 0.5;

/** What each god loves to visit, kinds of building in the order they look for them. `home`: the finest (Aphrodite) or the biggest households (Hera). */
export const LOVED: Record<GodId, readonly BuildingKind[]> = {
  zeus: ['taxoffice', 'court', 'agora'],
  hera: ['home'],
  poseidon: ['trading', 'shipyard', 'lighthouse'],
  demeter: ['farm', 'granary'],
  athena: ['grove', 'press', 'court'],
  apollo: ['theatre', 'infirmary', 'asklepieion'],
  artemis: ['lodge'],
  ares: ['barracks', 'tower'],
  aphrodite: ['home'],
  hephaestus: ['armoury', 'mine', 'quarry', 'masons'],
  hermes: ['trading', 'yard'],
  dionysus: ['vineyard', 'winery', 'theatre'],
};

/** How each god comes into the city, in words: "Demeter walks among your fields". */
export const ARRIVES: Record<GodId, string> = {
  zeus: 'comes down into your city in a bolt of lightning',
  hera: 'appears in your city in a peacock’s fan of light',
  poseidon: 'rises from the sea onto your shore',
  demeter: 'walks among your fields',
  athena: 'comes to your city, her owl circling over her',
  apollo: 'steps down a shaft of sunlight into your city',
  artemis: 'comes out of your woods by moonlight',
  ares: 'crashes into your city in bronze and dust',
  aphrodite: 'appears in your city in a swirl of roses',
  hephaestus: 'comes to your forges in a burst of sparks',
  hermes: 'flashes into your city on winged sandals',
  dionysus: 'comes to your city in a ring of vines',
};

// ---------------------------------------------------------------------------
// Words.

export const she = (g: GodId): string => (goddess(g) ? 'she' : 'he');
export const her = (g: GodId): string => (goddess(g) ? 'her' : 'his');
const cap = (t: string): string => (t ? t[0].toUpperCase() + t.slice(1) : t);

/** A kind of place, one and many: "farm", "farms". */
const NOUNS: Partial<Record<BuildingKind, [string, string]>> = {
  home: ['house', 'houses'],
  farm: ['farm', 'farms'],
  granary: ['granary', 'granaries'],
  agora: ['agora', 'agoras'],
  theatre: ['theatre', 'theatres'],
  taxoffice: ['tax office', 'tax offices'],
  lodge: ['hunting lodge', 'hunting lodges'],
  grove: ['olive grove', 'olive groves'],
  press: ['olive press', 'olive presses'],
  vineyard: ['vineyard', 'vineyards'],
  winery: ['winery', 'wineries'],
  trading: ['trading post', 'trading posts'],
  yard: ['caravan yard', 'caravan yards'],
  mine: ['copper mine', 'copper mines'],
  armoury: ['armoury', 'armouries'],
  barracks: ['barracks', 'barracks'],
  tower: ['tower', 'towers'],
  shipyard: ['shipyard', 'shipyards'],
  quarry: ['marble quarry', 'marble quarries'],
  masons: ['masons’ yard', 'masons’ yards'],
  lighthouse: ['Lighthouse', 'Lighthouses'],
  court: ['court', 'courts'],
  infirmary: ['infirmary', 'infirmaries'],
  asklepieion: ['asklepieion', 'asklepieia'],
};
const nounOf = (k: BuildingKind, many = false): string => NOUNS[k]?.[many ? 1 : 0] ?? (BUILDING_NAMES[k as Exclude<BuildingKind, 'home'>] ?? k).replace(/^(A|An|The) /, '').toLowerCase();

const NUMBERS = ['no', 'a', 'two', 'three', 'four', 'five', 'six'];

/** A place by name and where it stands: "the farm on the flood plain", "the house of Kleon". */
export function placeName(map: CoastMap, b: Building): string {
  if (b.kind === 'home' && b.family) return `the house of ${b.family.name}`;
  const [cx, cz] = centreOf(b);
  const where = DISTRICTS[districtAt(map, cx, cz)]?.where;
  return `the ${nounOf(b.kind)}${where ? ` ${where}` : ''}`;
}

/** The season a blessing lasts until: "autumn". */
export const untilWords = (until: number): string => SEASON_NAMES[seasonAt(until)];

/** What a blessing does for a place, in words: "its crop grows a quarter faster". */
export function boonWords(kind: BuildingKind): string {
  if (kind === 'home') return 'the household’s spirits lift';
  if (kind === 'farm' || kind === 'grove' || kind === 'vineyard') return 'its crop grows a quarter faster';
  if (kind === 'armoury') return 'its smiths work a quarter faster';
  if (kind === 'dairy' || kind === 'press' || kind === 'pasture' || kind === 'winery' || kind === 'mine' || kind === 'horsefarm') return 'it works a quarter faster';
  return 'no fire risk or wear builds up in it';
}

/** A blessed building's line for its panel and tip: "Blessed by Demeter until autumn: its crop grows a quarter faster, and no fire risk or wear builds up in it". (Only builds up: a fire next door can still spread to it, as the review of slice 56 found.) */
export function blessingWords(s: SimState, b: Building): string | null {
  const x = blessingOn(s, b.id);
  if (!x) return null;
  const boon = boonWords(b.kind);
  const also = boon.startsWith('no fire') ? '' : ', and no fire risk or wear builds up in it';
  return `Blessed by ${GODS[x.god].name} until ${untilWords(x.until)}: ${boon}${also}`;
}

/** Why a god came, in words, as they come ("she is pleased with your full granaries"). */
function whyWords(s: SimState, g: GodId, why: VisitWhy): string {
  if (why === 'festival') return `${she(g)} has come for your festival`;
  if (why === 'sanctuary') return `${she(g)} has come to see ${her(g)} new sanctuary`;
  if (why === 'pose') return `${she(g)} stands for you to see`;
  const best = reasonsOf(s, g).find((r) => r.worth > 0);
  return best ? `${she(g)} is pleased with ${best.why}` : `${she(g)} loves your city`;
}

/** What a god is doing now, in words: "walking to the granary on the flood plain". */
export function doingWords(s: SimState, f: GodFigure): string {
  const map = mapOf(s);
  const stop = f.stops[f.at];
  const b = stop ? findBuilding(s, stop.id) : undefined;
  switch (f.state) {
    case 'arriving':
      return 'arriving';
    case 'walking':
      return b ? `walking to ${placeName(map, b)}` : 'walking';
    case 'blessing':
      return b ? `blessing ${placeName(map, b)}` : 'blessing';
    case 'leaving':
      return 'leaving your city';
    case 'posing':
      return 'standing for you to see';
  }
}

/** Where a god goes next, in words ("the granary on the flood plain, then two farms"), or null. */
export function nextWords(s: SimState, f: GodFigure): string | null {
  if (f.state === 'posing' || f.state === 'leaving') return null;
  const map = mapOf(s);
  const ahead = f.stops.slice(f.state === 'blessing' ? f.at + 1 : f.at).map((p) => findBuilding(s, p.id)).filter((b): b is Building => !!b);
  if (ahead.length === 0) return 'leaving your city';
  const [first, ...rest] = ahead;
  return `${placeName(map, first)}${rest.length ? `, then ${tally(rest.map((b) => b.kind))}` : ''}`;
}

/** "three farms and a granary". */
function tally(kinds: BuildingKind[]): string {
  const counts = new Map<BuildingKind, number>();
  for (const k of kinds) counts.set(k, (counts.get(k) ?? 0) + 1);
  const parts = [...counts].map(([k, n]) => (n === 1 ? `${/^[aeiou]/i.test(nounOf(k)) ? 'an' : 'a'} ${nounOf(k)}` : `${NUMBERS[n] ?? n} ${nounOf(k, true)}`));
  return parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

// ---------------------------------------------------------------------------
// Where they arrive and where they go.

/** The middle of the town: its lived-in homes', else every building's, else the land's. */
function middleOf(s: SimState, map: CoastMap): [number, number] {
  let x = 0;
  let z = 0;
  let n = 0;
  for (const b of s.buildings) {
    if (b.kind !== 'home' || b.people <= 0) continue;
    const [cx, cz] = centreOf(b);
    x += cx;
    z += cz;
    n++;
  }
  if (n === 0) {
    for (const b of s.buildings) {
      if (b.kind === 'rubble') continue;
      const [cx, cz] = centreOf(b);
      x += cx;
      z += cz;
      n++;
    }
  }
  return n ? [x / n, z / n] : [map.size / 2, map.size / 2];
}

const dist = (ax: number, az: number, bx: number, bz: number): number => dhypot(ax - bx, az - bz);

/** The nearest of these buildings to a spot. */
function nearest(list: Building[], x: number, z: number): Building | undefined {
  let best: Building | undefined;
  let bd = Infinity;
  for (const b of list) {
    const [cx, cz] = centreOf(b);
    const d = dist(cx, cz, x, z);
    if (d < bd) [best, bd] = [b, d];
  }
  return best;
}

/** Beside a building, on the side towards a spot. */
function beside(b: Building, x: number, z: number): [number, number] {
  const [cx, cz] = centreOf(b);
  const d = dist(cx, cz, x, z);
  const off = footSide(b) / 2 + 1.2;
  return d < 0.01 ? [cx + off, cz] : [cx + ((x - cx) / d) * off, cz + ((z - cz) / d) * off];
}

const isWater = (map: CoastMap, x: number, z: number): boolean => {
  const n = map.size;
  const tx = Math.floor(x);
  const tz = Math.floor(z);
  if (tx < 0 || tz < 0 || tx >= n || tz >= n) return true;
  return map.tileWater[tz * n + tx] !== WATER_NONE;
};

/** The spot itself, or the nearest land to it (rings outwards), kept on the map. */
function onLand(map: CoastMap, x: number, z: number): [number, number] {
  const n = map.size;
  x = Math.max(1, Math.min(n - 1, x));
  z = Math.max(1, Math.min(n - 1, z));
  if (!isWater(map, x, z)) return [x, z];
  const tx = Math.floor(x);
  const tz = Math.floor(z);
  for (let r = 1; r < 24; r++) {
    let best: [number, number] | null = null;
    let bd = Infinity;
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const px = tx + dx + 0.5;
        const pz = tz + dz + 0.5;
        if (isWater(map, px, pz)) continue;
        const d = dist(px, pz, x, z);
        if (d < bd) [best, bd] = [[px, pz], d];
      }
    }
    if (best) return best;
  }
  return [x, z];
}

/** Poseidon's shore: the land tile beside the sea nearest a spot, or null on a land with no sea shore. */
function shoreNear(map: CoastMap, x: number, z: number): [number, number] | null {
  const n = map.size;
  let best: [number, number] | null = null;
  let bd = Infinity;
  for (let tz = 1; tz < n - 1; tz++) {
    for (let tx = 1; tx < n - 1; tx++) {
      const t = tz * n + tx;
      if (map.tileWater[t] !== WATER_NONE) continue;
      if (map.tileWater[t - 1] !== WATER_SEA && map.tileWater[t + 1] !== WATER_SEA && map.tileWater[t - n] !== WATER_SEA && map.tileWater[t + n] !== WATER_SEA) continue;
      const d = dist(tx + 0.5, tz + 0.5, x, z);
      if (d < bd) [best, bd] = [[tx + 0.5, tz + 0.5], d];
    }
  }
  return best;
}

/** Artemis's woods: the middle of the thickest stand of standing trees (in 4 × 4 tiles) nearest a spot, or null with none. */
function woodsNear(s: SimState, map: CoastMap, x: number, z: number): [number, number] | null {
  const CELL = 4;
  const n = map.size;
  const side = Math.ceil(n / CELL);
  const count = new Int32Array(side * side);
  const sx = new Float64Array(side * side);
  const sz = new Float64Array(side * side);
  const gone = new Set(s.cleared);
  for (let i = 0; i < map.trees.length; i++) {
    const t = map.trees[i];
    if (gone.has(i) || t.x < 0 || t.z < 0 || t.x >= n || t.z >= n) continue;
    if (s.tiles[Math.floor(t.z) * n + Math.floor(t.x)] !== 0) continue;
    const c = Math.floor(t.z / CELL) * side + Math.floor(t.x / CELL);
    count[c]++;
    sx[c] += t.x;
    sz[c] += t.z;
  }
  let best: [number, number] | null = null;
  let bd = Infinity;
  for (let c = 0; c < count.length; c++) {
    if (count[c] < 6) continue;
    const cx = sx[c] / count[c];
    const cz = sz[c] / count[c];
    // (A thicker stand is worth walking a little further for.)
    const d = dist(cx, cz, x, z) - count[c] * 0.5;
    if (d < bd) [best, bd] = [[cx, cz], d];
  }
  return best;
}

const standing = (s: SimState, kinds: readonly BuildingKind[]): Building[] => s.buildings.filter((b) => kinds.includes(b.kind));

/** Where a god arrives (see the notes at the top). */
export function arrivalOf(s: SimState, map: CoastMap, g: GodId): [number, number] {
  const [mx, mz] = middleOf(s, map);
  if (g === 'poseidon') {
    const quay = nearest(standing(s, ['trading', 'shipyard']), mx, mz);
    const [qx, qz] = quay ? centreOf(quay) : [mx, mz];
    const shore = shoreNear(map, qx, qz);
    if (shore) return shore;
  }
  if (g === 'demeter') {
    const farms = standing(s, ['farm']);
    if (farms.length) {
      let fx = 0;
      let fz = 0;
      for (const f of farms) {
        const [cx, cz] = centreOf(f);
        fx += cx;
        fz += cz;
      }
      const f = nearest(farms, fx / farms.length, fz / farms.length) as Building;
      return onLand(map, ...centreOf(f));
    }
  }
  if (g === 'hephaestus') {
    for (const k of ['armoury', 'mine', 'quarry', 'masons'] as const) {
      const b = nearest(standing(s, [k]), mx, mz);
      if (b) return onLand(map, ...beside(b, mx, mz));
    }
  }
  if (g === 'artemis') {
    const woods = woodsNear(s, map, mx, mz);
    if (woods) return onLand(map, ...woods);
  }
  const shrine = nearest(
    s.buildings.filter((b) => b.kind === 'shrine' && b.god === g),
    mx,
    mz,
  );
  if (shrine) return onLand(map, ...beside(shrine, mx, mz));
  const agora = nearest(standing(s, ['agora']), mx, mz);
  if (agora) return onLand(map, ...beside(agora, mx, mz));
  return onLand(map, mx, mz);
}

/** The places a god means to visit from a spot, in the order they'll go (see the notes at the top); and whether they are the god's own (false: homes instead). */
export function placesFor(s: SimState, map: CoastMap, g: GodId, x: number, z: number): { stops: Stop[]; own: boolean } {
  const kinds = LOVED[g];
  let picks: Building[] = [];
  let own = true;
  if (kinds.includes('home')) {
    const homes = s.buildings.filter((b) => b.kind === 'home' && b.people > 0);
    // Aphrodite the finest homes, Hera the biggest households; the nearer of equals.
    const worth = (b: Building): number => (g === 'aphrodite' ? b.level : b.people);
    const d = (b: Building): number => dist(...centreOf(b), x, z);
    picks = homes.sort((a, b) => worth(b) - worth(a) || d(a) - d(b) || a.id - b.id).slice(0, MOST_STOPS);
  } else {
    const all = standing(s, kinds);
    for (const k of kinds) {
      const b = nearest(
        all.filter((o) => o.kind === k && !picks.includes(o)),
        x,
        z,
      );
      if (b && picks.length < MOST_STOPS) picks.push(b);
    }
    while (picks.length < MOST_STOPS) {
      const b = nearest(
        all.filter((o) => !picks.includes(o)),
        x,
        z,
      );
      if (!b) break;
      picks.push(b);
    }
  }
  if (picks.length === 0) {
    own = false;
    const [mx, mz] = middleOf(s, map);
    const homes = s.buildings.filter((b) => b.kind === 'home' && b.people > 0);
    for (let i = 0; i < 3; i++) {
      const b = nearest(
        homes.filter((o) => !picks.includes(o)),
        mx,
        mz,
      );
      if (!b) break;
      picks.push(b);
    }
  }
  // A tour: the nearest next, from where they are.
  const stops: Stop[] = [];
  let [ax, az] = [x, z];
  const left = [...picks];
  while (left.length) {
    const b = nearest(left, ax, az) as Building;
    left.splice(left.indexOf(b), 1);
    const [cx, cz] = centreOf(b);
    stops.push({ id: b.id, x: cx, z: cz });
    [ax, az] = [cx, cz];
  }
  return { stops, own };
}

// ---------------------------------------------------------------------------
// Visits.

/** The gods walking in the city now (not those posed). */
export const walking = (s: SimState): GodFigure[] => s.gods.walks.figures.filter((f) => f.state !== 'posing');

/** A god in the city by their figure's id. */
export const figureOf = (s: SimState, id: number): GodFigure | undefined => s.gods.walks.figures.find((f) => f.id === id);

/** Why a visit can't start now, or '' if it can. */
export function visitRefusal(s: SimState, g: GodId, why: VisitWhy): string {
  if (!GOD_IDS.includes(g)) return 'There is no such god';
  if (s.gods.walks.figures.some((f) => f.god === g)) return `${GODS[g].name} is already in your city`;
  if (why !== 'pose' && walking(s).length >= MAX_GODS) return `${MAX_GODS} gods walk your city already`;
  return '';
}

/**
 * A god comes to the city (the hook for other systems: slice 53's festivals,
 * slice 54's finished sanctuaries; and the `visit` command). Returns the
 * figure, or null if refused (see visitRefusal). A pose (`why` 'pose') stands
 * at `at`, facing the camera's way, and never moves or leaves.
 */
export function startVisit(s: SimState, god: GodId, why: VisitWhy, at?: { x: number; z: number }): GodFigure | null {
  if (visitRefusal(s, god, why)) return null;
  const map = mapOf(s);
  const w = s.gods.walks;
  const posed = why === 'pose';
  const [x, z] = posed && at ? [at.x, at.z] : arrivalOf(s, map, god);
  const plan = posed ? { stops: [], own: true } : placesFor(s, map, god, x, z);
  const first = plan.stops[0];
  const f: GodFigure = {
    id: w.next++,
    god,
    x,
    z,
    px: x,
    pz: z,
    // (Facing the first place they mean to visit; posed, towards the camera's usual side.)
    heading: first ? datan2(first.x - x, first.z - z) : POSE_HEADING,
    state: posed ? 'posing' : 'arriving',
    since: s.tick,
    why,
    words: whyWords(s, god, why),
    stops: plan.stops,
    at: 0,
    came: s.tick,
    leaves: posed ? -1 : s.tick + VISIT_TICKS,
    blessed: [],
  };
  w.figures.push(f);
  if (posed) return f;
  w.last[god] = s.tick;
  const name = GODS[god].name;
  const where = plan.stops.map((p) => findBuilding(s, p.id)).filter((b): b is Building => !!b);
  const going = where.length ? (plan.own ? ` ${cap(she(god))} means to visit ${tally(where.map((b) => b.kind))}.` : ` ${cap(she(god))} finds no ${nounOf(LOVED[god][0], true)} in your city, and walks among your homes instead.`) : '';
  say(s, { kind: 'epiphany', words: `${name} ${ARRIVES[god]}: ${f.words}.${going}`, title: `${name} has come to your city`, at: { tile: Math.floor(z) * map.size + Math.floor(x) } });
  return f;
}

/** Bless a place for the season after next (another god's blessing gives way; the same god's is made longer). */
function bless(s: SimState, f: GodFigure, b: Building): void {
  const w = s.gods.walks;
  const until = nextSeasonAt(s.tick + TICKS_PER_SEASON);
  const had = w.blessed.findIndex((x) => x.id === b.id);
  if (had >= 0) w.blessed.splice(had, 1);
  w.blessed.push({ id: b.id, god: f.god, until });
  f.blessed.push(b.id);
  s.looks++;
  const map = mapOf(s);
  say(s, { kind: 'epiphany', words: `${GODS[f.god].name} blesses ${placeName(map, b)}: ${boonWords(b.kind)} until ${untilWords(until)}.`, at: { building: b.id } });
}

/** The next leg of a visit: walk on to the next place still standing, if there's time; else leave. */
function onward(s: SimState, f: GodFigure): void {
  while (f.at < f.stops.length) {
    const p = f.stops[f.at];
    const b = findBuilding(s, p.id);
    if (!b) {
      f.at++;
      continue;
    }
    // (The first place always; the rest only if the god can reach it, bless it and leave within the visit.)
    const ticks = Math.max(0, dist(f.x, f.z, p.x, p.z) - reachOf(b)) / GOD_SPEED + BLESS_TICKS + LEAVE_TICKS;
    if (f.blessed.length > 0 && s.tick + ticks > f.leaves) break;
    f.state = 'walking';
    f.since = s.tick;
    return;
  }
  f.at = f.stops.length;
  f.state = 'leaving';
  f.since = s.tick;
}

/** How close to a place's middle a god comes. */
const reachOf = (b: Building): number => footSide(b) / 2 + STAND_OFF;

/** A god has gone: the figure taken away, and said. */
function gone(s: SimState, f: GodFigure): void {
  const w = s.gods.walks;
  w.figures.splice(w.figures.indexOf(f), 1);
  const kinds = f.blessed.map((id) => findBuilding(s, id)?.kind).filter((k): k is BuildingKind => !!k);
  const until = w.blessed.find((x) => f.blessed.includes(x.id) && x.god === f.god)?.until;
  const what = kinds.length && until !== undefined ? `: ${she(f.god)} blessed ${tally(kinds)} until ${untilWords(until)}` : '';
  say(s, { kind: 'epiphany', words: `${GODS[f.god].name} has gone${what}.` });
}

/** One god's tick. */
function stepFigure(s: SimState, f: GodFigure): void {
  f.px = f.x;
  f.pz = f.z;
  const age = s.tick - f.since;
  switch (f.state) {
    case 'posing':
      return;
    case 'arriving':
      if (age >= ARRIVE_TICKS) onward(s, f);
      return;
    case 'blessing':
      if (age >= BLESS_TICKS) {
        f.at++;
        onward(s, f);
      }
      return;
    case 'leaving':
      if (age >= LEAVE_TICKS) gone(s, f);
      return;
    case 'walking': {
      const p = f.stops[f.at];
      const b = p ? findBuilding(s, p.id) : undefined;
      if (!p || !b) {
        // (What they were walking to has gone: on to the next.)
        f.at++;
        onward(s, f);
        return;
      }
      const d = dist(f.x, f.z, p.x, p.z);
      const reach = reachOf(b);
      if (d > reach) {
        const step = Math.min(GOD_SPEED, d - reach);
        f.x += ((p.x - f.x) / d) * step;
        f.z += ((p.z - f.z) / d) * step;
        f.heading = datan2(p.x - f.x, p.z - f.z);
      }
      if (d - GOD_SPEED <= reach) {
        f.state = 'blessing';
        f.since = s.tick;
        bless(s, f, b);
      }
      return;
    }
  }
}

/**
 * Once a tick (after the gods' own step): every god in the city moves on;
 * once a day, the blessings that have run out (or whose place is gone) are
 * forgotten, and, with the gods switched on, a god who has just come to love
 * the city comes to see it.
 */
export function stepEpiphany(s: SimState): void {
  const w = s.gods.walks;
  if (w.figures.length) for (const f of [...w.figures]) stepFigure(s, f);
  if (s.tick % TICKS_PER_DAY !== 0) return;
  if (w.blessed.length) w.blessed = w.blessed.filter((x) => x.until > s.tick && !!findBuilding(s, x.id));
  if (!s.gods.on) return;
  for (const g of GOD_IDS) {
    const was = w.loving.includes(g);
    if (!moodAtLeast(moodOfGod(s, g), 'loving')) {
      if (was) w.loving.splice(w.loving.indexOf(g), 1);
      continue;
    }
    if (was) continue;
    // (Come lately, for love or a festival: this time the love is only noted.)
    const came = w.last[g];
    if (came !== undefined && s.tick - came < LOVE_GAP) {
      w.loving.push(g);
      continue;
    }
    // (Refused, with three gods in the city already: tomorrow, perhaps.)
    if (startVisit(s, g, 'loving')) w.loving.push(g);
  }
}

/** A god's hover tip: who, what they are doing, why they came, and when they leave. */
export function godStatus(s: SimState, f: GodFigure): { title: string; detail: string } {
  const g = GODS[f.god];
  const lines = [cap(doingWords(s, f))];
  if (f.why !== 'pose') lines.push(`${cap(f.words)}`);
  const next = nextWords(s, f);
  if (next && f.state !== 'arriving') lines.push(`Next: ${next}`);
  if (f.leaves >= 0 && f.state !== 'leaving') lines.push(`Gone within ${Math.max(1, Math.ceil((f.leaves - s.tick) / TICKS_PER_DAY))} days`);
  return { title: `${g.name}, ${g.epithet}`, detail: lines.join('\n') };
}
