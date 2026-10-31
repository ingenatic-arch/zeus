/**
 * Monsters at the gates (slice 55): the seven monsters an angry god sends,
 * their lairs on your land, their raids, and their fights with your army.
 *
 * - **Sent, never by themselves.** `sendMonster(s, kind, why)` is the one way
 *   in: slice 57's curses will call it, and the demos do. Nothing here ever
 *   sends a monster, so a town nobody sends one to plays exactly as before.
 *   At most one of each kind at once.
 * - **Telegraphed in three steps.** At once a warning that names neither the
 *   monster nor its god ("Shepherds saw something vast on the hills below the
 *   crags"). COMING later it walks in from the edge nearest its lair, and on
 *   reaching it an alarm names it, its god and the reason given. Every few
 *   weeks it raids, each raid announced a day before ("the Boar is stirring").
 * - **Lairs** (`lairFor`): a wild spot chosen by kind (a cave by steep ground,
 *   a marsh on wet ground or a river's banks, a rocky den on the sea shore near
 *   the harbour), on open ground a person can walk, LAIR_ROOM tiles from any
 *   building, reachable on foot from the town; where a land has no such
 *   ground, the next best kind, and at last any open ground far enough off.
 * - **Raids.** It walks across country as raiders do (open ground and roads,
 *   round buildings; a wall in its way smashed through) to a target its kind
 *   prefers (TARGETS), stays AT_TARGET there wrecking what it reaches (through
 *   the fire code for the Chimera, the rubble code for the rest, a wall
 *   through `breakPiece`), kills some of those who didn't flee from the homes
 *   it wrecks (Medusa instead turns walkers in her gaze to stone), and goes
 *   home. Walkers near it run indoors (raids.ts: `bandsAt`).
 * - **The army.** While it is out, or sitting before its lair, with soldiers
 *   or a tower near, it stands in the battle as one more foe (`army.foes`,
 *   `raid` minus its id): companies close with it, archers and towers shoot it,
 *   by battle.ts's own code. Its own blows are `monsterFight`, called from
 *   battle.ts: very hard, each able to kill a man outright. Below BREAK_AT of
 *   its health it breaks off, walks home and heals inside its lair for a
 *   season (HEAL), out of reach and with no raids. It never dies to soldiers:
 *   its health never falls below 1, and only `slayMonster` (a hero's, slice 59)
 *   ends it.
 * - **Called home.** Once a day, if its god's mood is warm or better (the mood
 *   API), it leaves the land, with a message.
 *
 * Everything said goes through `say`. Pure and deterministic: its dice are
 * hashes of the city's seed, the monster's id and what for, never a shared
 * generator, so no older roll moves; its maths is dmath's.
 */
import type { CoastMap } from '../map/bake';
import { WATER_SEA } from '../map/bake';
import { datan2, dhypot } from '../map/dmath';
import { districtAt, districtTitle } from '../map/districts';
import { mapOf } from '../map/lands';
import { hash2 } from '../map/noise';
import { companyOf } from './army';
import { REACH, TAKES } from './battle';
import { Ground, mapIndex } from './build';
import { around, BUILDING_NAMES, centreOf, findBuilding, levelName, recountPopulation } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from './clock';
import { tell } from './folk';
import { burnable, FIRE_BURNING, ignite, type Fall } from './hazards';
import { ALARM, NEWS, say, WARNING, type Place } from './messages';
import { GODS, MONSTERS, moodAtLeast, moodOfGod, type GodId, type Lair, type MonsterId } from './pantheon';
import { SHELTER } from './raids';
import { TILE_EMPTY, TILE_ROAD, TILE_WALL, type Building, type BuildingKind, type SimState, type Soldier, type Walker } from './state';
import { SHIP_MOORED, tradingPost } from './trade';
import { position } from './walk';
import { breakPiece, foeToll, foeWalkable, TOWER_RANGE, towerArchers, wallAt } from './walls';
import { lineClear, offRoadPath, prunePath, walkable } from './wild';

// ---------------------------------------------------------------------------
// The state: the slice's one top-level field.

/** Where a monster is in its life on your land (see the notes at the top). */
export type BeastState = 'coming' | 'settling' | 'lair' | 'raiding' | 'returning' | 'healing' | 'leaving';

/** One monster on your land. */
export interface Beast {
  id: number;
  kind: MonsterId;
  /** Who sent it, and the reason given. */
  god: GodId;
  why: string;
  /** The tick it was sent, and the tick it settled in its lair (-1: not yet). */
  came: number;
  settled: number;
  /** Its lair: the tile before its mouth, the kind it is (a land with no marsh may give the Boar a cave), and which way its mouth faces. */
  lair: number;
  den: Lair;
  mouth: number;
  /** Health, and its full health. */
  hp: number;
  full: number;
  state: BeastState;
  /** Where it stands, which way it faces, how far it has walked (for the drawing's stride). */
  x: number;
  z: number;
  face: number;
  walked: number;
  /** Its way: points (x, z pairs), the segment it is on and how far along it. */
  path: number[];
  seg: number;
  along: number;
  /** What it is making for: a building's id (a wall's tile + 1, negated, for Talos), 0 none; and its words. */
  target: number;
  aim: string;
  /** A stretch of wall or a gate in its way that it is smashing (its tile; -1 none), and ticks left at it. */
  siege: number;
  smash: number;
  /** Ticks left at its target. */
  wait: number;
  /** When it next acts: comes in, raids, or is healed. */
  next: number;
  /** Has the raid due been announced? */
  warned: boolean;
  /** Broke off wounded on this raid. */
  broke: boolean;
  /** Raids made; the last one's tick (-1 none) and what it did, in words. */
  raids: number;
  last: number;
  lastWords: string;
  /** This raid: what it wrecked (words), the people it killed, walkers turned to stone, soldiers struck down. */
  wrecked: string[];
  killed: number;
  stoned: number;
  men: number;
  /** Everyone it has killed in all its raids. */
  dead: number;
  /** Its id among the battle's foes while it stands in one (0: none); when it last fought and struck; ticks to its next blow. */
  foe: number;
  fought: number;
  swung: number;
  cool: number;
  /** Ticks it has gone for soldiers without a blow; and until when it pays soldiers it can't reach no mind. */
  chase: number;
  calm: number;
}

/** A walker Medusa turned to stone: where it stood, which way it faced, when, and what it was. */
export interface Stone {
  x: number;
  z: number;
  face: number;
  tick: number;
  kind: string;
}

/** A monster slain (slice 59 makes its lair a place of legend). */
export interface Slain {
  kind: MonsterId;
  lair: number;
  den: Lair;
  tick: number;
  by: string;
}

export interface Legends {
  monsters: Beast[];
  /** The next monster's id. */
  next: number;
  stones: Stone[];
  slain: Slain[];
}

export const freshLegends = (): Legends => ({ monsters: [], next: 1, stones: [], slain: [] });

// ---------------------------------------------------------------------------
// The numbers (tuned by eye).

/** How long after the warning it walks in. */
export const COMING = 4 * TICKS_PER_DAY;
/** Its first raid after settling in, and between raids after it is home: a span of days, by the dice. */
export const FIRST_RAID: readonly [number, number] = [21 * TICKS_PER_DAY, 35 * TICKS_PER_DAY];
export const RAID_GAP: readonly [number, number] = [21 * TICKS_PER_DAY, 42 * TICKS_PER_DAY];
/** A raid is announced this long before it sets out. */
export const STIR = TICKS_PER_DAY;
/** How long it stays at its target, and how often it wrecks something there. */
export const AT_TARGET = 5 * TICKS_PER_DAY;
export const WRECK_EVERY = 12;
/** How long it takes to smash through a stretch of wall or a gate in its way. */
export const SMASH = TICKS_PER_DAY;
/** Below this share of its health it breaks off; inside its lair it heals for this long. */
export const BREAK_AT = 0.4;
export const HEAL = 3 * TICKS_PER_MONTH;
/** Outside its lair it gets its health back over this long, if hurt. */
export const MEND = TICKS_PER_MONTH;
/** A lair is at least this far (tiles) from any building. */
export const LAIR_ROOM = 10;
/** It stands in the battle while a soldier is this near it (tiles), or a tower in range. */
export const NEAR_ARMY = 12;
/** It goes for a soldier this far beyond its reach; before its lair, none further than LAIR_GUARD from it. */
export const SEE = 2.5;
export const LAIR_GUARD = 6;
/** Medusa's gaze (tiles: walkers beyond SHELTER, who didn't get indoors, and within GAZE), how often, and how many a raid at most. */
export const GAZE = 9;
export const GAZE_EVERY = TICKS_PER_DAY;
export const GAZE_MOST = 5;
/** A stone figure stands this long. */
export const STONE_LAST = 3 * TICKS_PER_MONTH;
/** The odds a monster's blow lands. */
const HIT = 0.8;
/** It gives up going for soldiers it can't strike after this many ticks, and pays them no mind for CALM. */
const STALL = 40;
const CALM = 60;

/**
 * Each kind's make: its health, how hard and how often it strikes, its pace
 * (tiles a tick), its bulk (how far from its middle it strikes and is struck,
 * tiles), how many it wrecks at most in a raid, how many die in each home it
 * wrecks, and whether a blow also catches a second man.
 */
export interface Make {
  hp: number;
  blow: number;
  swing: number;
  pace: number;
  bulk: number;
  wrecks: number;
  kills: number;
  sweep: boolean;
  /** How tall it stands (tiles; a man is about 0.35), for the drawing and the pointer. */
  tall: number;
}

export const MAKES: Record<MonsterId, Make> = {
  hydra: { hp: 1500, blow: 300, swing: 10, pace: 0.16, bulk: 0.9, wrecks: 3, kills: 2, sweep: true, tall: 2.1 },
  medusa: { hp: 1000, blow: 290, swing: 10, pace: 0.17, bulk: 0.55, wrecks: 0, kills: 0, sweep: false, tall: 1.9 },
  cyclops: { hp: 1700, blow: 360, swing: 13, pace: 0.18, bulk: 0.8, wrecks: 3, kills: 1, sweep: true, tall: 3.0 },
  minotaur: { hp: 1300, blow: 330, swing: 10, pace: 0.2, bulk: 0.6, wrecks: 3, kills: 2, sweep: false, tall: 2.1 },
  chimera: { hp: 1300, blow: 300, swing: 10, pace: 0.2, bulk: 0.8, wrecks: 4, kills: 1, sweep: false, tall: 2.0 },
  talos: { hp: 1900, blow: 380, swing: 14, pace: 0.15, bulk: 0.8, wrecks: 4, kills: 1, sweep: true, tall: 3.4 },
  boar: { hp: 1100, blow: 300, swing: 9, pace: 0.24, bulk: 0.75, wrecks: 2, kills: 1, sweep: false, tall: 1.35 },
};

/** What each kind goes for, in order (TARGETS); "homes by water", "dense" and "busy" are worked out. */
const FIELDS: readonly BuildingKind[] = ['farm', 'grove', 'vineyard', 'pasture', 'horsefarm', 'dairy'];
const SHORE_KINDS: readonly BuildingKind[] = ['trading', 'shipyard', 'lighthouse'];
const WAR_KINDS: readonly BuildingKind[] = ['tower', 'armoury', 'barracks'];

/** The monster's name ("the Calydonian Boar"), short ("the Boar"), and at the start of a sentence. */
export const beastName = (k: MonsterId): string => MONSTERS[k].name;
export const shortName = (k: MonsterId): string => (k === 'boar' ? 'the Boar' : MONSTERS[k].name);
const Cap = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);

/** Its lair in words: "a cave", "the marsh", "a rocky den on the shore"; and the lair as a noun after "its". */
export const denWords = (d: Lair): string => (d === 'cave' ? 'a cave' : d === 'marsh' ? 'the marsh' : 'a rocky den on the shore');
export const denNoun = (d: Lair): string => (d === 'cave' ? 'cave' : d === 'marsh' ? 'marsh' : 'den');

/** How a sentence speaks of it: Medusa is "she", the Cyclops, the Minotaur and Talos "he", the rest "it". */
export const itOf = (k: MonsterId): string => (k === 'medusa' ? 'she' : k === 'cyclops' || k === 'minotaur' || k === 'talos' ? 'he' : 'it');
export const itsOf = (k: MonsterId): string => (k === 'medusa' ? 'her' : k === 'cyclops' || k === 'minotaur' || k === 'talos' ? 'his' : 'its');
export const himOf = (k: MonsterId): string => (k === 'medusa' ? 'her' : k === 'cyclops' || k === 'minotaur' || k === 'talos' ? 'him' : 'it');

/** What it goes for, in words (MONSTERS' own words, but by what this slice does). */
export const targetWords = (k: MonsterId): string =>
  ({ hydra: 'the homes by the water', medusa: 'the busiest street', cyclops: 'the quay and the ships', minotaur: 'the most crowded homes', chimera: 'whatever will burn', talos: 'the walls and the armouries', boar: 'the fields and the herds' })[k];

// ---------------------------------------------------------------------------
// The dice.

const dice = (s: SimState, m: Beast, n: number, salt: number): number => hash2(m.id * 977 + n, salt, (s.seed ^ 0x6d6f6e73) | 0);
const span = (s: SimState, m: Beast, n: number, salt: number, [lo, hi]: readonly [number, number]): number => lo + Math.floor(dice(s, m, n, salt) * (hi - lo + 1));

// ---------------------------------------------------------------------------
// Finding things.

export const monsterOf = (s: SimState, id: number): Beast | undefined => s.legends.monsters.find((m) => m.id === id);

/** Is it on your map (not still coming)? */
export const onMap = (m: Beast): boolean => m.state !== 'coming';

/** Is it out where it can be fought (on the map, outside its lair, not broken off)? */
export const fightable = (m: Beast): boolean => (m.state === 'settling' || m.state === 'lair' || m.state === 'raiding' || m.state === 'returning') && !m.broke;

/** Is it out and about (walking, raiding: walkers near it run indoors)? */
export const roaming = (m: Beast): boolean => m.state === 'settling' || m.state === 'raiding' || m.state === 'returning' || m.state === 'leaving';

/** The monster on your map nearest a point, within `reach` tiles of its edge (for a hero, slice 59, or the pointer); null if none. */
export function monsterAt(s: SimState, x: number, z: number, reach = 1): Beast | null {
  let best: Beast | null = null;
  let bd = Infinity;
  for (const m of s.legends.monsters) {
    if (!onMap(m) || m.state === 'healing') continue;
    const d = dhypot(m.x - x, m.z - z) - MAKES[m.kind].bulk;
    if (d <= reach && d < bd) {
      bd = d;
      best = m;
    }
  }
  return best;
}

/** The lair as a place a walker can go: the tile before its mouth (or the nearest walkable one to it, if something has been built there), and its middle. */
export function lairSpot(s: SimState, m: Pick<Beast, 'lair'>): { tile: number; x: number; z: number } {
  const map = mapOf(s);
  const t = nearestWalkable(map, s, m.lair, 8);
  const at = t >= 0 ? t : m.lair;
  const n = map.size;
  return { tile: at, x: (at % n) + 0.5, z: Math.floor(at / n) + 0.5 };
}

/** The battle's foe that stands for a monster (`raid` is minus its id). */
export const beastOfFoe = (s: SimState, raid: number): Beast | undefined => (raid < 0 ? monsterOf(s, -raid) : undefined);

/** A monster's bulk, by its foe's `raid` (0 for a raider). */
export const bulkOfFoe = (s: SimState, raid: number): number => {
  const m = beastOfFoe(s, raid);
  return m ? MAKES[m.kind].bulk : 0;
};

/** Who a man who fell fighting a monster fought ("the Calydonian Boar"), by his foe's `raid`; '' for raiders. */
export const foeName = (s: SimState, raid: number): string => {
  const m = beastOfFoe(s, raid);
  return m ? beastName(m.kind) : '';
};

// ---------------------------------------------------------------------------
// Sending one (slice 57's curses call this).

/**
 * An angry god sends a monster: its lair chosen now (so the warning can say
 * where it was seen), the warning said, and in COMING it walks in. Returns
 * the monster, or null if one of that kind is already on your land, or there
 * is nowhere on it for a lair. `why` is the god's reason ("you hunted her
 * herds thin").
 */
export function sendMonster(s: SimState, kind: MonsterId, why: string): Beast | null {
  if (s.legends.monsters.some((m) => m.kind === kind)) return null;
  const map = mapOf(s);
  const lair = lairFor(map, s, kind);
  if (!lair) return null;
  const mk = MAKES[kind];
  const n = map.size;
  const m: Beast = {
    id: s.legends.next++,
    kind,
    god: MONSTERS[kind].god,
    why,
    came: s.tick,
    settled: -1,
    lair: lair.tile,
    den: lair.den,
    mouth: lair.mouth,
    hp: mk.hp,
    full: mk.hp,
    state: 'coming',
    x: (lair.tile % n) + 0.5,
    z: Math.floor(lair.tile / n) + 0.5,
    face: lair.mouth,
    walked: 0,
    path: [],
    seg: 0,
    along: 0,
    target: 0,
    aim: '',
    siege: -1,
    smash: 0,
    wait: 0,
    next: s.tick + COMING,
    warned: false,
    broke: false,
    raids: 0,
    last: -1,
    lastWords: '',
    wrecked: [],
    killed: 0,
    stoned: 0,
    men: 0,
    dead: 0,
    foe: 0,
    fought: -1,
    swung: 0,
    cool: 0,
    chase: 0,
    calm: 0,
  };
  s.legends.monsters.push(m);
  const where = whereWords(map, m.x, m.z);
  const seen = lair.den === 'cave' ? `Shepherds saw something vast moving on the hills ${where}, and their flocks won’t go near the place` : lair.den === 'marsh' ? `Reed-cutters saw something huge stir in the wet ground ${where}, and the frogs have gone quiet` : `Fishermen saw something vast wade ashore among the rocks ${where}, and they won’t put out from there`;
  say(s, { kind: 'monster', u: WARNING, title: lair.den === 'cave' ? 'Something vast on the hills' : lair.den === 'marsh' ? 'Something huge in the marsh' : 'Something vast on the shore', words: `${seen}. Whatever it is, it is coming down to make its home there.`, at: { tile: lair.tile }, of: 'seen' });
  s.rev++;
  return m;
}

/**
 * A monster's end (a hero's, slice 59): it is gone from your land, out of any
 * fight, and its lair kept in `legends.slain` (a place of legend to be). `by`
 * names who slew it ("Heracles"). False if there is no such monster.
 */
export function slayMonster(s: SimState, id: number, by: string): boolean {
  const m = monsterOf(s, id);
  if (!m) return false;
  dropFoe(s, m);
  s.legends.monsters = s.legends.monsters.filter((o) => o !== m);
  s.legends.slain.push({ kind: m.kind, lair: m.lair, den: m.den, tick: s.tick, by });
  say(s, { kind: 'monster', u: ALARM, title: `${Cap(beastName(m.kind))} is slain`, words: `${Cap(beastName(m.kind))} has been slain by ${by}. Its ${denNoun(m.den)} is quiet, and ${GODS[m.god].name} has nothing more to send against you for it.`, at: { tile: m.lair }, of: 'slain' });
  s.rev++;
  return true;
}

// ---------------------------------------------------------------------------
// Lairs.

/** The ground a lair can be on: firm open ground, nothing built, off the map's edge. */
function openGround(map: CoastMap, s: SimState, t: number): boolean {
  const n = map.size;
  const tx = t % n;
  const tz = (t - tx) / n;
  if (tx < 2 || tz < 2 || tx >= n - 2 || tz >= n - 2) return false;
  const g = mapIndex(map).ground[t];
  return (g === Ground.Ok || g === Ground.SteepForHome) && s.tiles[t] === TILE_EMPTY;
}

/** Can a monster cross this tile (to work out where it can get to): open ground, a road, a wall or gate it can smash. */
const passable = (map: CoastMap, s: SimState, t: number): boolean => walkable(map, s, t) || s.tiles[t] === TILE_WALL;

/** The middle of the town (the buildings' middle; the land's with none), as a tile it can reach. */
function townMiddle(map: CoastMap, s: SimState): number {
  const n = map.size;
  let sx = 0;
  let sz = 0;
  let k = 0;
  for (const b of s.buildings) {
    if (b.kind === 'rubble') continue;
    const [cx, cz] = centreOf(b);
    sx += cx;
    sz += cz;
    k++;
  }
  const x = k ? sx / k : n / 2;
  const z = k ? sz / k : n / 2;
  // The passable tile nearest it, spiralling out.
  const cx = Math.floor(x);
  const cz = Math.floor(z);
  for (let r = 0; r < n; r++) {
    let best = -1;
    let bd = Infinity;
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const tx = cx + dx;
        const tz = cz + dz;
        if (tx < 0 || tz < 0 || tx >= n || tz >= n) continue;
        const t = tz * n + tx;
        if (!passable(map, s, t)) continue;
        const d = (tx + 0.5 - x) * (tx + 0.5 - x) + (tz + 0.5 - z) * (tz + 0.5 - z);
        if (d < bd) [best, bd] = [t, d];
      }
    }
    if (best >= 0) return best;
  }
  return -1;
}

/** Every tile reachable on foot from `from` (four ways), as a mark per tile. */
function reach(map: CoastMap, s: SimState, from: number): Uint8Array {
  const n = map.size;
  const seen = new Uint8Array(n * n);
  if (from < 0) return seen;
  const q = new Int32Array(n * n);
  let head = 0;
  let tail = 0;
  q[tail++] = from;
  seen[from] = 1;
  while (head < tail) {
    const t = q[head++];
    const tx = t % n;
    const near = [tx > 0 ? t - 1 : -1, tx < n - 1 ? t + 1 : -1, t - n, t + n];
    for (const u of near) {
      if (u < 0 || u >= n * n || seen[u] || !passable(map, s, u)) continue;
      seen[u] = 1;
      q[tail++] = u;
    }
  }
  return seen;
}

/** How far (tiles, eight ways) each tile is from the nearest building, up to `cap`. */
function roomFrom(map: CoastMap, s: SimState, cap: number): Uint8Array {
  const n = map.size;
  const d = new Uint8Array(n * n).fill(cap);
  const q: number[] = [];
  for (let t = 0; t < n * n; t++) if (s.tiles[t] > 0 && findBuilding(s, s.tiles[t])?.kind !== 'rubble') {
    d[t] = 0;
    q.push(t);
  }
  for (let head = 0; head < q.length; head++) {
    const t = q[head];
    if (d[t] + 1 >= cap) continue;
    const tx = t % n;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const x = tx + dx;
        const u = t + dz * n + dx;
        if (x < 0 || x >= n || u < 0 || u >= n * n || d[u] <= d[t] + 1) continue;
        d[u] = d[t] + 1;
        q.push(u);
      }
    }
  }
  return d;
}

/** How well a tile suits a lair of each kind, 0 (not at all) to about 1. */
function suits(map: CoastMap, t: number, den: Lair, harbour: number): number {
  const n = map.size;
  const g = mapIndex(map).ground;
  const tx = t % n;
  const tz = (t - tx) / n;
  let steep = 0;
  let sea = 0;
  let river = 0;
  for (let dz = -2; dz <= 2; dz++) {
    for (let dx = -2; dx <= 2; dx++) {
      const x = tx + dx;
      const z = tz + dz;
      if (x < 0 || z < 0 || x >= n || z >= n) continue;
      const u = z * n + x;
      if (g[u] === Ground.Steep) steep++;
      if (map.tileWater[u] === WATER_SEA) sea++;
      else if (g[u] === Ground.Water) river++;
    }
  }
  const rock = map.sample(map.rock, tx + 0.5, tz + 0.5);
  if (den === 'cave') return steep >= 3 ? Math.min(1, steep / 10) * 0.8 + rock * 0.2 : 0;
  if (den === 'marsh') {
    const wet = map.marsh ? map.sample(map.marsh, tx + 0.5, tz + 0.5) : 0;
    return wet > 0.35 ? 0.6 + wet * 0.4 : river >= 2 ? Math.min(1, river / 8) * 0.8 : 0;
  }
  if (sea < 2) return 0;
  // (A rocky den by the harbour: the nearer the trading post or the shipyard, the better.)
  const by = harbour >= 0 ? Math.max(0, 1 - dhypot((harbour % n) - tx, Math.floor(harbour / n) - tz) / 40) : 0;
  return 0.4 + rock * 0.3 + by * 0.3;
}

/** The kinds of lair to try, in order, for a monster whose own kind of ground a land may not have. */
const FALLBACK: Record<Lair, readonly Lair[]> = { cave: ['cave', 'shore', 'marsh'], marsh: ['marsh', 'shore', 'cave'], shore: ['shore', 'marsh', 'cave'] };

/**
 * Where a monster of this kind makes its lair: the best spot of its own kind
 * of ground (or the next best kind, or any open ground) LAIR_ROOM tiles from
 * every building, reachable on foot from the town, preferring one near the
 * town (so its raids are raids) but not on top of it; and which way its mouth
 * faces (towards the town). Null if there is nowhere at all. A pure function
 * of the map and what is built; another monster's lair is avoided.
 */
export function lairFor(map: CoastMap, s: SimState, kind: MonsterId): { tile: number; den: Lair; mouth: number } | null {
  const n = map.size;
  const mid = townMiddle(map, s);
  if (mid < 0) return null;
  const can = reach(map, s, mid);
  const room = roomFrom(map, s, LAIR_ROOM + 1);
  const mx = (mid % n) + 0.5;
  const mz = Math.floor(mid / n) + 0.5;
  const post = s.buildings.find((b) => SHORE_KINDS.includes(b.kind));
  const harbour = post ? Math.floor(centreOf(post)[1]) * n + Math.floor(centreOf(post)[0]) : -1;
  const taken = s.legends.monsters.map((m) => m.lair);
  const far = (t: number): boolean => taken.every((u) => dhypot((u % n) - (t % n), Math.floor(u / n) - Math.floor(t / n)) >= 12);
  for (const den of [...FALLBACK[MONSTERS[kind].lair], null]) {
    let best = -1;
    let bs = -Infinity;
    for (let t = 0; t < n * n; t++) {
      if (!can[t] || room[t] < LAIR_ROOM || !openGround(map, s, t) || !far(t)) continue;
      const f = den ? suits(map, t, den, harbour) : 1;
      if (f <= 0) continue;
      const d = dhypot((t % n) + 0.5 - mx, Math.floor(t / n) + 0.5 - mz);
      // (Near the town, but not crowding it: best 18 to 45 tiles off, and a little for the ground's own fit.)
      const score = f * 20 - Math.max(0, d - 45) * 0.8 - Math.max(0, 18 - d) * 1.5 - d * 0.05;
      if (score > bs) [best, bs] = [t, score];
    }
    if (best >= 0) {
      const mouth = datan2(mz - (Math.floor(best / n) + 0.5), mx - ((best % n) + 0.5));
      return { tile: best, den: den ?? MONSTERS[kind].lair, mouth };
    }
  }
  return null;
}

/** The walkable tile nearest `t` within `most` tiles (t itself if it is), or -1. */
function nearestWalkable(map: CoastMap, s: SimState, t: number, most: number): number {
  const n = map.size;
  if (t >= 0 && t < n * n && walkable(map, s, t)) return t;
  const tx = t % n;
  const tz = Math.floor(t / n);
  for (let r = 1; r <= most; r++) {
    let best = -1;
    let bd = Infinity;
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const x = tx + dx;
        const z = tz + dz;
        if (x < 0 || z < 0 || x >= n || z >= n) continue;
        const u = z * n + x;
        if (!walkable(map, s, u)) continue;
        const d = dx * dx + dz * dz;
        if (d < bd) [best, bd] = [u, d];
      }
    }
    if (best >= 0) return best;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Ways across the land.

const tileOf = (n: number, x: number, z: number): number => Math.max(0, Math.min(n - 1, Math.floor(z))) * n + Math.max(0, Math.min(n - 1, Math.floor(x)));

/** The tiles it can set off from where it stands. */
function startsAt(map: CoastMap, s: SimState, x: number, z: number): number[] {
  const n = map.size;
  const t = tileOf(n, x, z);
  if (walkable(map, s, t)) return [t];
  const u = nearestWalkable(map, s, t, 3);
  return u >= 0 ? [u] : [];
}

/** The longest search for a way (tiles looked at): a monster's walks are longer than a band's. */
const LOOK = 60000;

/**
 * Set a monster off for `goal` (a tile) from where it stands: across
 * country, round buildings; a wall or gate standing in the way is walked up
 * to (`siege`) and smashed. `then` is a point to walk on to past the last tile
 * (off the map, when leaving). False if there is no way.
 */
function setOff(map: CoastMap, s: SimState, m: Beast, goal: number, then?: [number, number]): boolean {
  const starts = startsAt(map, s, m.x, m.z);
  if (!starts.length || goal < 0) return false;
  const walled = s.walls.length > 0;
  const tiles = starts[0] === goal ? [goal] : offRoadPath(map, s, starts, goal, LOOK, walled ? foeToll(map, s) : undefined);
  if (!tiles) return false;
  const i = walled ? tiles.findIndex((t) => (wallAt(s, t)?.hp ?? 0) > 0) : -1;
  const walk = i >= 0 ? tiles.slice(0, i) : tiles;
  const pts: number[] = [m.x, m.z];
  for (const [px, pz] of prunePath(map, s, walk, walled ? foeWalkable : walkable)) pts.push(px, pz);
  m.siege = i >= 0 ? tiles[i] : -1;
  if (i < 0 && then) pts.push(then[0], then[1]);
  m.path = pts.length >= 4 ? pts : [m.x, m.z, m.x, m.z];
  m.seg = 0;
  m.along = 0;
  return true;
}

/** The point on its way where it is now (the segment and how far along it), and which way the way runs there. */
function wayPoint(m: Beast): [number, number, number] {
  const i = m.seg * 2;
  const p = m.path;
  if (i + 3 >= p.length) return [p[p.length - 2] ?? m.x, p[p.length - 1] ?? m.z, m.face];
  const len = dhypot(p[i + 2] - p[i], p[i + 3] - p[i + 1]);
  const u = len > 1e-9 ? m.along / len : 0;
  return [p[i] + (p[i + 2] - p[i]) * u, p[i + 1] + (p[i + 3] - p[i + 1]) * u, len > 1e-9 ? datan2(p[i + 3] - p[i + 1], p[i + 2] - p[i]) : m.face];
}

/** A step along its way. True once it is at the end. (False too while it walks back to its way after a fight.) */
function walkOn(map: CoastMap, s: SimState, m: Beast): boolean {
  let move = MAKES[m.kind].pace;
  // Back to its way first, if a fight drew it off.
  const [wx, wz] = wayPoint(m);
  const off = dhypot(wx - m.x, wz - m.z);
  if (off > 0.05) {
    const step = Math.min(off, move);
    m.face = datan2(wz - m.z, wx - m.x);
    m.x += ((wx - m.x) / off) * step;
    m.z += ((wz - m.z) / off) * step;
    m.walked += step;
    return false;
  }
  const n = map.size;
  for (let guard = 0; guard < 8 && move > 0; guard++) {
    const last = m.path.length / 2 - 1;
    if (m.seg >= last) return true;
    const i = m.seg * 2;
    const p = m.path;
    const len = dhypot(p[i + 2] - p[i], p[i + 3] - p[i + 1]);
    if (len > 1e-9) m.face = datan2(p[i + 3] - p[i + 1], p[i + 2] - p[i]);
    if (m.along + move < len) {
      m.along += move;
      m.walked += move;
      move = 0;
    } else {
      move -= len - m.along;
      m.walked += len - m.along;
      m.seg++;
      m.along = 0;
      // Something built across the way ahead: a fresh way there.
      const j = m.seg * 2;
      if (j + 3 < p.length) {
        const inMap = (x: number, z: number): boolean => x >= 0 && z >= 0 && x < n && z < n;
        if (inMap(p[j], p[j + 1]) && inMap(p[j + 2], p[j + 3]) && !lineClear(map, s, p[j], p[j + 1], p[j + 2], p[j + 3], s.walls.length ? foeWalkable : walkable)) {
          [m.x, m.z] = [p[j], p[j + 1]];
          if (!setOff(map, s, m, goalOf(map, s, m))) return true;
          continue;
        }
      }
    }
  }
  [m.x, m.z] = wayPoint(m);
  return m.seg >= m.path.length / 2 - 1;
}

/** Where it is walking to now, as a tile: its target, its lair, or the edge. */
function goalOf(map: CoastMap, s: SimState, m: Beast): number {
  if (m.state === 'raiding') return targetTile(map, s, m);
  if (m.state === 'leaving') return tileOf(map.size, m.path[m.path.length - 2] ?? m.x, m.path[m.path.length - 1] ?? m.z);
  return lairSpot(s, m).tile;
}

/** The tile its target is reached from: one beside the building (the nearest it can stand on), or a wall's own tile. */
function targetTile(map: CoastMap, s: SimState, m: Beast): number {
  if (m.target < 0) return -m.target - 1;
  const b = findBuilding(s, m.target);
  if (!b) return -1;
  const n = map.size;
  let best = -1;
  let bd = Infinity;
  for (const t of around(n, b)) {
    if (!walkable(map, s, t)) continue;
    const d = dhypot((t % n) + 0.5 - m.x, Math.floor(t / n) + 0.5 - m.z);
    if (d < bd) [best, bd] = [t, d];
  }
  return best;
}

// ---------------------------------------------------------------------------
// Each tick.

/**
 * Once a tick: each monster on its way, at its lair, out raiding, coming home
 * or healing; stone figures crumble away. `fall` turns a building to rubble
 * (sim.ts's, as for the hazards). Nothing at all with no monster and no stone.
 */
export function stepMonsters(s: SimState, map: CoastMap, fall: (b: Building, how: Fall) => void): void {
  const L = s.legends;
  if (!L.monsters.length && !L.stones.length) return;
  if (L.stones.length && s.tick % TICKS_PER_DAY === 0) {
    const keep = L.stones.filter((st) => s.tick - st.tick < STONE_LAST);
    if (keep.length !== L.stones.length) {
      L.stones = keep;
      s.rev++;
    }
  }
  for (const m of L.monsters.slice()) stepOne(s, map, m, fall);
}

function stepOne(s: SimState, map: CoastMap, m: Beast, fall: (b: Building, how: Fall) => void): void {
  // The battle's blows since last tick.
  const f = m.foe ? s.army.foes.find((o) => o.id === m.foe) : undefined;
  if (f) {
    m.hp = Math.max(1, Math.min(m.hp, f.hp));
    f.hp = m.hp;
  }
  if (m.state === 'coming') {
    if (s.tick >= m.next) enter(s, map, m);
    return;
  }
  // Called home by its god, warm to the city again.
  if (s.tick % TICKS_PER_DAY === 0 && m.state !== 'leaving' && moodAtLeast(moodOfGod(s, m.god), 'warm')) {
    calledHome(s, map, m);
    return;
  }
  // Wounded past bearing: it breaks off.
  if (fightable(m) && m.hp < m.full * BREAK_AT) breakOff(s, map, m);
  const fighting = m.fought >= s.tick - 1 && fightable(m);
  if (!fighting) {
    switch (m.state) {
      case 'settling':
        if (walkOn(map, s, m) && !atWall(s, m)) settle(s, map, m);
        break;
      case 'lair':
        atLair(s, map, m);
        break;
      case 'raiding':
        raiding(s, map, m, fall);
        break;
      case 'returning':
        if (walkOn(map, s, m) && !atWall(s, m)) home(s, map, m);
        break;
      case 'healing':
        m.hp = Math.min(m.full, m.hp + m.full / HEAL);
        if (s.tick >= m.next) healed(s, m);
        break;
      case 'leaving':
        if (walkOn(map, s, m)) gone(s, m);
        break;
    }
  }
  if (m.kind === 'medusa' && (m.state === 'raiding' || m.state === 'returning') && !m.broke && s.tick % GAZE_EVERY === 0) gaze(s, map, m);
  syncFoe(s, map, m);
}

/** At the end of its way with a wall or gate standing in it: it smashes it (SMASH), then walks on through the breach. True while it is at one (or has just set off again past it). */
function atWall(s: SimState, m: Beast): boolean {
  if (m.siege < 0) return false;
  const map = mapOf(s);
  const p = wallAt(s, m.siege);
  if (p && p.hp > 0) {
    if (m.smash === 0) m.smash = SMASH;
    if (s.tick % 6 === 0) m.swung = s.tick;
    if (--m.smash > 0) return true;
    breakPiece(s, p);
    m.wrecked.push(p.gate ? 'a gate' : 'a stretch of wall');
  }
  m.siege = -1;
  m.smash = 0;
  setOff(map, s, m, goalOf(map, s, m));
  return true;
}

/** It walks in from the edge nearest its lair (or, on a land whose town no edge can reach, rises where it was seen). */
function enter(s: SimState, map: CoastMap, m: Beast): void {
  const n = map.size;
  const spot = lairSpot(s, m);
  const can = reach(map, s, spot.tile);
  let edge = -1;
  let bd = Infinity;
  for (let i = 0; i < n; i++) {
    for (const t of [i, (n - 1) * n + i, i * n, i * n + n - 1]) {
      if (!can[t]) continue;
      const d = dhypot((t % n) - (spot.tile % n), Math.floor(t / n) - Math.floor(spot.tile / n));
      if (d < bd || (d === bd && t < edge)) [edge, bd] = [t, d];
    }
  }
  m.state = 'settling';
  if (edge >= 0) {
    const tx = edge % n;
    const tz = Math.floor(edge / n);
    const ox = tx === 0 ? -3 : tx === n - 1 ? n + 3 : tx + 0.5;
    const oz = tz === 0 ? -3 : tz === n - 1 ? n + 3 : tz + 0.5;
    m.x = tx + 0.5;
    m.z = tz + 0.5;
    if (setOff(map, s, m, spot.tile)) {
      m.path = [ox, oz, ...m.path];
      m.seg = 0;
      m.along = 0;
      m.x = ox;
      m.z = oz;
      m.face = datan2(m.path[3] - oz, m.path[2] - ox);
      s.rev++;
      return;
    }
  }
  // (No way in from any edge: it is simply there.)
  m.x = spot.x;
  m.z = spot.z;
  m.path = [m.x, m.z, m.x, m.z];
  m.seg = 0;
  m.along = 0;
  s.rev++;
}

/** It reaches its lair for the first time: the alarm that names it, its god and why; its first raid weeks off. */
function settle(s: SimState, map: CoastMap, m: Beast): void {
  m.state = 'lair';
  m.settled = s.tick;
  m.face = m.mouth;
  m.next = s.tick + span(s, m, 0, 1, FIRST_RAID);
  m.warned = false;
  const god = GODS[m.god];
  say(s, {
    kind: 'monster',
    u: ALARM,
    title: `${Cap(beastName(m.kind))} has come`,
    words: `${Cap(beastName(m.kind))} has made ${itsOf(m.kind)} lair in ${denWords(m.den)} ${whereWords(map, m.x, m.z)}. ${god.name} sent ${himOf(m.kind)}: ${m.why}. ${Cap(itOf(m.kind))} will come out every few weeks for ${targetWords(m.kind)}. Your soldiers can wound ${himOf(m.kind)} and drive ${himOf(m.kind)} back; only a hero can slay ${himOf(m.kind)}.`,
    at: { tile: m.lair },
    of: 'settled',
  });
  s.rev++;
}

/** Before its lair: mending, the raid announced a day ahead, and out when it is due. */
function atLair(s: SimState, map: CoastMap, m: Beast): void {
  // (Back to the mouth of its lair after a fight drew it off.)
  const spot = lairSpot(s, m);
  const d = dhypot(spot.x - m.x, spot.z - m.z);
  if (d > 0.05) {
    const step = Math.min(d, MAKES[m.kind].pace);
    m.face = datan2(spot.z - m.z, spot.x - m.x);
    m.x += ((spot.x - m.x) / d) * step;
    m.z += ((spot.z - m.z) / d) * step;
    m.walked += step;
  } else m.face = m.mouth;
  if (m.hp < m.full) m.hp = Math.min(m.full, m.hp + m.full / MEND);
  if (!m.warned && s.tick >= m.next - STIR) {
    m.warned = true;
    say(s, { kind: 'monster', u: WARNING, title: `${Cap(shortName(m.kind))} is stirring`, words: `${Cap(shortName(m.kind))} is stirring in ${itsOf(m.kind)} ${denNoun(m.den)} ${whereWords(map, m.x, m.z)}: tomorrow ${itOf(m.kind)} comes out for ${targetWords(m.kind)}. People will run indoors from ${himOf(m.kind)}; soldiers holding ground where ${itOf(m.kind)} passes will fight ${himOf(m.kind)}.`, at: { tile: m.lair }, of: 'stirring' });
  }
  if (s.tick >= m.next) setOut(s, map, m);
}

/** Out of its lair for a raid: the target its kind prefers that it can reach. With none, it stays in, and looks again in ten days. */
function setOut(s: SimState, map: CoastMap, m: Beast): void {
  m.wrecked = [];
  m.killed = 0;
  m.stoned = 0;
  m.men = 0;
  m.broke = false;
  for (const t of targetsFor(map, s, m).slice(0, 4)) {
    m.target = t.id;
    m.aim = t.words;
    m.state = 'raiding';
    if (!setOff(map, s, m, targetTile(map, s, m))) continue;
    m.raids++;
    m.last = s.tick;
    m.warned = false;
    const at: Place = t.id > 0 ? { building: t.id } : { tile: -t.id - 1 };
    say(s, { kind: 'monster', u: ALARM, title: `${Cap(shortName(m.kind))} is out`, words: `${Cap(beastName(m.kind))} is out of ${itsOf(m.kind)} ${denNoun(m.den)}, making for ${t.words}! People near ${himOf(m.kind)} run indoors. Soldiers holding ground in ${itsOf(m.kind)} way will fight ${himOf(m.kind)}; take a company’s banner in hand and click by ${himOf(m.kind)} to send them.`, at, of: 'raid' });
    s.rev++;
    return;
  }
  m.state = 'lair';
  m.target = 0;
  m.aim = '';
  m.warned = false;
  m.next = s.tick + 10 * TICKS_PER_DAY;
}

/** What it might go for, best first, as ids (a wall's tile + 1, negated) with their words. */
function targetsFor(map: CoastMap, s: SimState, m: Beast): Array<{ id: number; words: string }> {
  const n = map.size;
  const lx = (m.lair % n) + 0.5;
  const lz = Math.floor(m.lair / n) + 0.5;
  const dist = (b: Building): number => {
    const [cx, cz] = centreOf(b);
    return dhypot(cx - lx, cz - lz);
  };
  const near = (bs: Building[]): Building[] => bs.sort((a, b) => dist(a) - dist(b) || a.id - b.id);
  const live = s.buildings.filter((b) => b.kind !== 'rubble' && (b.kind !== 'home' || b.level > 0));
  const homes = live.filter((b) => b.kind === 'home');
  const out: Array<{ id: number; words: string }> = [];
  const add = (bs: Building[]): void => {
    for (const b of bs) if (!out.some((o) => o.id === b.id)) out.push({ id: b.id, words: nameOf(b) });
  };
  switch (m.kind) {
    case 'boar':
      add(near(live.filter((b) => FIELDS.includes(b.kind))));
      break;
    case 'cyclops': {
      // (The trading post first while a ship is moored there.)
      const post = tradingPost(s);
      if (post && s.trade.ship.phase === SHIP_MOORED) add([post]);
      add(near(live.filter((b) => SHORE_KINDS.includes(b.kind))));
      add(near(homes.filter((b) => byWater(map, b, true))));
      break;
    }
    case 'medusa': {
      // The busiest place: the most walkers within four tiles (an agora first, of equals).
      const busy = (b: Building): number => {
        const [cx, cz] = centreOf(b);
        let k = 0;
        for (const w of s.walkers) {
          const [x, z] = position(w);
          if (dhypot(x - cx, z - cz) <= 4) k++;
        }
        return k * 2 + (b.kind === 'agora' ? 1 : 0);
      };
      add(live.filter((b) => b.kind === 'agora' || b.kind === 'home' || b.kind === 'fountain').map((b) => ({ b, k: busy(b) })).sort((a, b) => b.k - a.k || dist(a.b) - dist(b.b) || a.b.id - b.b.id).slice(0, 6).map((x) => x.b));
      break;
    }
    case 'talos': {
      // A stretch of wall or a gate standing (the nearest its lair), then towers, armouries and barracks.
      let wall = -1;
      let wd = Infinity;
      for (const p of s.walls) {
        if (p.hp <= 0) continue;
        const d = dhypot((p.t % n) + 0.5 - lx, Math.floor(p.t / n) + 0.5 - lz);
        if (d < wd) [wall, wd] = [p.t, d];
      }
      if (wall >= 0) out.push({ id: -(wall + 1), words: `your walls ${whereWords(map, (wall % n) + 0.5, Math.floor(wall / n) + 0.5)}` });
      add(near(live.filter((b) => WAR_KINDS.includes(b.kind))));
      break;
    }
    case 'hydra':
      add(near(homes.filter((b) => byWater(map, b, false))));
      break;
    case 'minotaur':
      add(densest(homes).slice(0, 6));
      break;
    case 'chimera':
      add(near(live.filter((b) => b.kind === 'barracks' || FIELDS.includes(b.kind))));
      add(densest(homes).slice(0, 4));
      break;
  }
  // (Then, or with none of its own, what it wrecks nearest its lair: Medusa, the homes.)
  add(near(live.filter((b) => (m.kind === 'medusa' ? b.kind === 'home' : wrecks(m.kind, b)))).slice(0, 4));
  return out;
}

/** What a kind wrecks: the Boar fields and herds (and homes), the Hydra and the Minotaur homes, the Chimera whatever burns, Medusa nothing, the rest anything that stands. */
function wrecks(k: MonsterId, b: Building): boolean {
  if (b.kind === 'rubble' || (b.kind === 'home' && b.level === 0) || b.kind === 'fountain' || k === 'medusa') return false;
  if (k === 'boar') return FIELDS.includes(b.kind) || b.kind === 'home';
  if (k === 'hydra' || k === 'minotaur') return b.kind === 'home';
  if (k === 'chimera') return burnable(b) && b.fire !== FIRE_BURNING;
  return true;
}

/** Homes with the most people within three tiles of them first. */
function densest(homes: Building[]): Building[] {
  const crowd = (b: Building): number => {
    const [cx, cz] = centreOf(b);
    let k = 0;
    for (const o of homes) {
      const [ox, oz] = centreOf(o);
      if (dhypot(ox - cx, oz - cz) <= 3) k += o.people;
    }
    return k;
  };
  return homes.map((b) => ({ b, k: crowd(b) })).sort((a, b) => b.k - a.k || a.b.id - b.b.id).map((x) => x.b);
}

/** Is a building within a few tiles of water (the sea only, or any)? */
function byWater(map: CoastMap, b: Building, seaOnly: boolean): boolean {
  const n = map.size;
  const g = mapIndex(map).ground;
  for (let dz = -3; dz <= 4; dz++) {
    for (let dx = -3; dx <= 4; dx++) {
      const x = b.x + dx;
      const z = b.z + dz;
      if (x < 0 || z < 0 || x >= n || z >= n) continue;
      const t = z * n + x;
      if (seaOnly ? map.tileWater[t] === WATER_SEA : g[t] === Ground.Water) return true;
    }
  }
  return false;
}

/** A building in words: "the wheat farm", "the house of Lykos". */
function nameOf(b: Building): string {
  if (b.kind === 'home') return b.family ? `the house of ${b.family.name}` : levelName(b.level, 'the');
  const w = BUILDING_NAMES[b.kind as Exclude<BuildingKind, 'home'>] ?? b.kind;
  return w.replace(/^(A|An|The) /, 'the ');
}

/** Out on a raid: on its way, smashing a wall in it, or at its target wrecking; then home. */
function raiding(s: SimState, map: CoastMap, m: Beast, fall: (b: Building, how: Fall) => void): void {
  if (m.wait > 0) {
    m.wait--;
    if (m.wait % WRECK_EVERY === 0 && m.wrecked.length < MAKES[m.kind].wrecks) wreck(s, map, m, fall);
    if (m.wait === 0) turnHome(s, map, m);
    return;
  }
  // The Chimera's breath on its way: now and then a building beside it catches.
  if (m.kind === 'chimera' && s.tick % (2 * TICKS_PER_DAY) === 0) breathe(s, m, fall);
  if (!walkOn(map, s, m) || atWall(s, m)) return;
  // At its target (or the target is gone: whatever is there).
  if (m.target > 0 && !findBuilding(s, m.target)) m.target = 0;
  m.wait = AT_TARGET;
  m.swung = s.tick;
  s.rev++;
}

/** The Chimera breathes fire on a building within two tiles of it (not the one it is making for). */
function breathe(s: SimState, m: Beast, fall: (b: Building, how: Fall) => void): void {
  let best: Building | null = null;
  let bd = Infinity;
  for (const b of s.buildings) {
    if (!burnable(b) || b.fire === FIRE_BURNING || b.id === m.target) continue;
    const [cx, cz] = centreOf(b);
    const d = dhypot(cx - m.x, cz - m.z) - (b.kind === 'home' ? 0.5 : 1.5);
    if (d <= 2 && (d < bd || (d === bd && best && b.id < best.id))) [best, bd] = [b, d];
  }
  if (!best) return;
  m.swung = s.tick;
  burn(s, best, m, fall);
}

/** Set alight (through the fire code, so the watch can put it out), or with fire switched off, wrecked. */
function burn(s: SimState, b: Building, m: Beast, fall: (b: Building, how: Fall) => void): void {
  m.wrecked.push(`${nameOf(b)} (set alight)`);
  if (b.kind === 'home') kill(s, b, m, MAKES[m.kind].kills);
  if (s.hazards) ignite(s, b);
  else fall(b, 'fire');
  s.rev++;
}

/** At its target: the next thing it reaches, wrecked. */
function wreck(s: SimState, map: CoastMap, m: Beast, fall: (b: Building, how: Fall) => void): void {
  const n = map.size;
  m.swung = s.tick;
  // Talos at the walls: the stretches and gates near him, and a tower.
  if (m.target < 0) {
    const t0 = -m.target - 1;
    let best = -1;
    let bd = Infinity;
    for (const p of s.walls) {
      if (p.hp <= 0) continue;
      const d = dhypot((p.t % n) - (t0 % n), Math.floor(p.t / n) - Math.floor(t0 / n));
      if (d <= 3 && d < bd) [best, bd] = [p.t, d];
    }
    const p = best >= 0 ? wallAt(s, best) : undefined;
    if (p) {
      breakPiece(s, p);
      m.wrecked.push(p.gate ? 'a gate' : 'a stretch of wall');
      return;
    }
  }
  const [tx, tz] = m.target > 0 && findBuilding(s, m.target) ? centreOf(findBuilding(s, m.target)!) : [m.x, m.z];
  // Of what it wrecks, the nearest standing within its reach of the target.
  const wants = (b: Building): boolean => wrecks(m.kind, b);
  let best: Building | null = null;
  let bd = Infinity;
  for (const b of s.buildings) {
    if (!wants(b)) continue;
    const [cx, cz] = centreOf(b);
    const d = dhypot(cx - tx, cz - tz);
    if (d <= 4.5 && (d < bd || (d === bd && best && b.id < best.id))) [best, bd] = [b, d];
  }
  if (!best || m.kind === 'medusa') return;
  if (m.kind === 'chimera') {
    burn(s, best, m, fall);
    return;
  }
  m.wrecked.push(nameOf(best));
  if (best.kind === 'home') kill(s, best, m, MAKES[m.kind].kills);
  fall(best, 'collapse');
  s.rev++;
}

/** Some of a home's people who didn't flee are killed (never more than all but one: the rest flee as the house falls). */
function kill(s: SimState, b: Building, m: Beast, most: number): void {
  const f = b.family;
  if (!f || b.people <= 1 || most <= 0) return;
  const k = Math.min(most, f.members.length - 1, Math.max(1, Math.round(most * (0.5 + dice(s, m, m.raids * 31 + b.id, 7)))));
  for (let i = 0; i < k; i++) {
    const j = Math.floor(dice(s, m, b.id * 7 + i, 8) * f.members.length);
    const p = f.members[j];
    if (!p) break;
    tell(s, f, 'slain', b.level, [p.name, beastName(m.kind)]);
    f.members.splice(j, 1);
    b.people = Math.max(0, b.people - 1);
    m.killed++;
    m.dead++;
  }
  if (f.members.length === 0) b.family = null;
  recountPopulation(s);
}

/** Walkers Medusa can turn to stone: those carrying nothing a store or the treasury counts. */
const STONE_KINDS: readonly Walker['kind'][] = ['water', 'priestess', 'actor', 'watchman', 'inspector', 'physician'];

/** Medusa's gaze: one walker beyond the reach of the warning (they didn't get indoors), within her gaze, turned to stone; a person of the nearest home dies. */
function gaze(s: SimState, map: CoastMap, m: Beast): void {
  if (m.stoned >= GAZE_MOST) return;
  let best: Walker | null = null;
  let bd = Infinity;
  for (const w of s.walkers) {
    if (!STONE_KINDS.includes(w.kind) || w.path.length < 2) continue;
    const [x, z] = position(w);
    const d = dhypot(x - m.x, z - m.z);
    if (d >= SHELTER && d <= GAZE && (d < bd || (d === bd && best && w.id < best.id))) [best, bd] = [w, d];
  }
  if (!best) return;
  const [x, z] = position(best);
  s.legends.stones.push({ x, z, face: datan2(m.z - z, m.x - x), tick: s.tick, kind: best.kind });
  s.walkers = s.walkers.filter((o) => o !== best);
  const from = findBuilding(s, best.origin);
  if (from && from.walker === best.id) {
    from.walker = 0;
    from.clock = Math.max(from.clock, 2 * TICKS_PER_DAY);
  }
  m.stoned++;
  m.swung = s.tick;
  m.face = datan2(z - m.z, x - m.x);
  // A person of the nearest lived-in home was the one in the street.
  let home: Building | null = null;
  let hd = Infinity;
  for (const b of s.buildings) {
    if (b.kind !== 'home' || !b.family || b.people < 1) continue;
    const [cx, cz] = centreOf(b);
    const d = dhypot(cx - x, cz - z);
    if (d < hd) [home, hd] = [b, d];
  }
  let who = '';
  if (home?.family) {
    const f = home.family;
    const j = Math.floor(dice(s, m, s.tick, 9) * f.members.length);
    const p = f.members[j];
    if (p) {
      who = `${p.name} of the house of ${f.name}`;
      tell(s, f, 'slain', home.level, [p.name, `${beastName(m.kind)}’s gaze`]);
      f.members.splice(j, 1);
      home.people = Math.max(0, home.people - 1);
      if (f.members.length === 0) home.family = null;
      recountPopulation(s);
      m.killed++;
      m.dead++;
    }
  }
  const what = WALKER_WORDS[best.kind] ?? 'a walker';
  say(s, { kind: 'monster', u: WARNING, title: `Turned to stone ${whereWords(map, x, z)}`, words: `Medusa’s gaze caught ${what}${who ? `, ${who},` : ''} in the street ${whereWords(map, x, z)}, and turned them to stone where they stood.`, at: { tile: tileOf(map.size, x, z) }, of: 'stone' });
  s.rev++;
}

const WALKER_WORDS: Partial<Record<Walker['kind'], string>> = { water: 'a water carrier', priestess: 'a priestess', actor: 'an actor', watchman: 'a watchman', inspector: 'an inspector', physician: 'a physician' };

/** Its time at the target over: what it did, said, and home it goes. */
function turnHome(s: SimState, map: CoastMap, m: Beast): void {
  m.lastWords = raidWords(m);
  say(s, { kind: 'monster', u: m.wrecked.length || m.killed ? WARNING : NEWS, title: `${Cap(shortName(m.kind))} goes home`, words: `${Cap(beastName(m.kind))} turns back for ${itsOf(m.kind)} ${denNoun(m.den)}. ${Cap(m.lastWords)}.`, at: { tile: m.lair }, of: 'raided' });
  m.state = 'returning';
  m.target = 0;
  m.aim = '';
  if (!setOff(map, s, m, lairSpot(s, m).tile)) home(s, map, m);
  s.rev++;
}

/** This raid in words: "it wrecked the wheat farm and the house of Lykos; 2 people were killed". */
function raidWords(m: Beast): string {
  const w = m.wrecked;
  const list = w.length === 0 ? '' : w.length === 1 ? w[0] : `${w.slice(0, -1).join(', ')} and ${w[w.length - 1]}`;
  const it = itOf(m.kind);
  const parts = [list ? `${it} wrecked ${list}` : `${it} wrecked nothing`, m.stoned ? `${it} turned ${m.stoned} ${m.stoned === 1 ? 'walker' : 'walkers'} to stone` : '', m.killed ? `${m.killed} ${m.killed === 1 ? 'person was' : 'people were'} killed` : '', m.men ? `${m.men} of your soldiers ${m.men === 1 ? 'was' : 'were'} struck down` : ''].filter(Boolean);
  return parts.join('; ');
}

/** Home in its lair: healing for a season if it broke off, else out before it until the next raid. */
function home(s: SimState, map: CoastMap, m: Beast): void {
  const spot = lairSpot(s, m);
  m.x = spot.x;
  m.z = spot.z;
  m.face = m.mouth;
  m.path = [m.x, m.z, m.x, m.z];
  m.seg = 0;
  m.along = 0;
  m.target = 0;
  m.aim = '';
  if (m.broke) {
    m.state = 'healing';
    m.next = s.tick + HEAL;
  } else {
    m.state = 'lair';
    m.next = s.tick + span(s, m, m.raids, 2, RAID_GAP);
    m.warned = false;
  }
  void map;
  s.rev++;
}

/** Badly wounded: it breaks off, out of the fight, and goes home to heal. */
function breakOff(s: SimState, map: CoastMap, m: Beast): void {
  m.broke = true;
  m.wait = 0;
  m.siege = -1;
  dropFoe(s, m);
  if (m.state === 'raiding' || m.state === 'returning' || m.state === 'settling') {
    if (m.state === 'raiding') m.lastWords = raidWords(m);
    // (Settling in, it was never in its lair: it still takes it, wounded.)
    if (m.state === 'settling') {
      settle(s, map, m);
      m.broke = true;
    }
    m.state = 'returning';
    if (!setOff(map, s, m, lairSpot(s, m).tile)) home(s, map, m);
  } else home(s, map, m);
  say(s, { kind: 'monster', u: WARNING, title: `${Cap(shortName(m.kind))} breaks off`, words: `${Cap(beastName(m.kind))} is badly wounded and breaks off the fight: ${itOf(m.kind)} goes back to ${itsOf(m.kind)} ${denNoun(m.den)} to heal, and won’t come out for a season.${m.men ? ` The fight cost you ${m.men} ${m.men === 1 ? 'man' : 'men'} struck down.` : ''} Only a hero can slay ${himOf(m.kind)}.`, at: { tile: m.lair }, of: 'broke' });
  s.rev++;
}

/** Healed: out before its lair again, the next raid weeks off. */
function healed(s: SimState, m: Beast): void {
  m.hp = m.full;
  m.broke = false;
  m.state = 'lair';
  m.next = s.tick + span(s, m, m.raids, 3, RAID_GAP);
  m.warned = false;
  say(s, { kind: 'monster', u: WARNING, title: `${Cap(shortName(m.kind))} has healed`, words: `${Cap(beastName(m.kind))} has healed ${itsOf(m.kind)} wounds and is out before ${itsOf(m.kind)} ${denNoun(m.den)} again. ${Cap(itOf(m.kind))} will raid again in a few weeks.`, at: { tile: m.lair }, of: 'healed' });
  s.rev++;
}

/** Its god is warm to the city again and calls it home: it walks off the land by the nearest edge. */
function calledHome(s: SimState, map: CoastMap, m: Beast): void {
  const n = map.size;
  dropFoe(s, m);
  m.state = 'leaving';
  m.broke = false;
  m.target = 0;
  m.aim = '';
  m.wait = 0;
  if (m.x < 0 || m.z < 0 || m.x >= n || m.z >= n) {
    gone(s, m);
    return;
  }
  say(s, { kind: 'monster', u: NEWS, title: `${GODS[m.god].name} calls ${shortName(m.kind)} home`, words: `${GODS[m.god].name} is warm to your city again, and calls ${beastName(m.kind)} home: ${itOf(m.kind)} leaves ${itsOf(m.kind)} ${denNoun(m.den)} and goes off your land.`, at: { tile: m.lair }, of: 'home' });
  // The nearest edge tile it can reach.
  const can = reach(map, s, startsAt(map, s, m.x, m.z)[0] ?? -1);
  let edge = -1;
  let bd = Infinity;
  for (let i = 0; i < n; i++) {
    for (const t of [i, (n - 1) * n + i, i * n, i * n + n - 1]) {
      if (!can[t]) continue;
      const d = dhypot((t % n) + 0.5 - m.x, Math.floor(t / n) + 0.5 - m.z);
      if (d < bd) [edge, bd] = [t, d];
    }
  }
  const tx = edge % n;
  const tz = Math.floor(edge / n);
  const out: [number, number] = [tx === 0 ? -3 : tx === n - 1 ? n + 3 : tx + 0.5, tz === 0 ? -3 : tz === n - 1 ? n + 3 : tz + 0.5];
  if (edge < 0 || !setOff(map, s, m, edge, out)) gone(s, m);
  s.rev++;
}

/** Off your land. */
function gone(s: SimState, m: Beast): void {
  dropFoe(s, m);
  s.legends.monsters = s.legends.monsters.filter((o) => o !== m);
  s.rev++;
}

// ---------------------------------------------------------------------------
// In the battle (battle.ts).

/** Is a soldier or a manned tower near enough that it stands in the battle? */
function armyNear(s: SimState, m: Beast): boolean {
  for (const x of s.army.soldiers) if (x.state === 'ready' && x.company > 0 && dhypot(x.x - m.x, x.z - m.z) <= NEAR_ARMY) return true;
  for (const b of s.buildings) {
    if (b.kind !== 'tower' || towerArchers(b) <= 0) continue;
    const [cx, cz] = centreOf(b);
    if (dhypot(cx - m.x, cz - m.z) <= TOWER_RANGE + 1) return true;
  }
  return false;
}

/** Its place in the battle's foes: there while it can be fought and the army is near, gone otherwise. */
function syncFoe(s: SimState, map: CoastMap, m: Beast): void {
  const want = fightable(m) && armyNear(s, m);
  if (!want) {
    if (m.foe) dropFoe(s, m);
    return;
  }
  let f = m.foe ? s.army.foes.find((o) => o.id === m.foe) : undefined;
  if (!f) {
    f = { id: s.army.nextId++, raid: -m.id, slot: 0, x: m.x, z: m.z, face: m.face, hp: m.hp, state: 'with', foe: 0, cool: 0, swung: 0, fell: 0, walked: 0, since: 0, calm: 0 };
    s.army.foes.push(f);
    m.foe = f.id;
    s.rev++;
  }
  f.x = m.x;
  f.z = m.z;
  f.face = m.face;
  f.hp = m.hp;
  f.walked = m.walked;
  void map;
}

/** Out of the battle: its foe gone, and any soldier fighting it let go. */
function dropFoe(s: SimState, m: Beast): void {
  if (!m.foe) return;
  const id = m.foe;
  s.army.foes = s.army.foes.filter((f) => f.id !== id);
  for (const x of s.army.soldiers) if (x.foe === id) x.foe = 0;
  m.foe = 0;
  s.rev++;
}

const roll = (s: SimState, m: Beast, salt: number): number => hash2(s.tick, m.id * 64 + salt, (s.seed ^ 0x6265_6173) | 0);

/**
 * A monster's part in a battle's tick (battle.ts calls it after the raiders
 * have chosen whom they go for): each monster standing in the battle goes for
 * the nearest soldier within its sight (before its lair, none further than
 * LAIR_GUARD from it), closes with him and strikes, a blow that can kill a man
 * outright (and, for some kinds, catches a second beside him). `men` are the
 * soldiers who can be fought (not those of a broken company).
 */
export function monsterFight(s: SimState, men: readonly Soldier[]): void {
  for (const f of s.army.foes) {
    if (f.raid >= 0) continue;
    const m = beastOfFoe(s, f.raid);
    if (!m || !fightable(m)) continue;
    const mk = MAKES[m.kind];
    const reachTo = mk.bulk + REACH;
    const n = mapOf(s).size;
    const lx = (m.lair % n) + 0.5;
    const lz = Math.floor(m.lair / n) + 0.5;
    const ok = (x: Soldier): boolean => m.state !== 'lair' || dhypot(x.x - lx, x.z - lz) <= LAIR_GUARD;
    // The nearest soldier in its sight.
    let t: Soldier | undefined;
    let d = reachTo + SEE;
    for (const x of men) {
      const dx = dhypot(x.x - m.x, x.z - m.z);
      if (dx > d || !ok(x)) continue;
      if (!t || dx < d || x.id < t.id) [t, d] = [x, dx];
    }
    const calm = s.tick < m.calm;
    let blocked = false;
    if (t && d > reachTo * 0.9) {
      // Closing with him (not while it pays soldiers no mind, nor into a building).
      const step = calm ? 0 : Math.min(d - reachTo * 0.85, mk.pace * 0.8);
      const nx = m.x + ((t.x - m.x) / d) * step;
      const nz = m.z + ((t.z - m.z) / d) * step;
      const tt = tileOf(n, nx, nz);
      if (step > 0 && (nx < 0 || nz < 0 || nx >= n || nz >= n || s.tiles[tt] === TILE_EMPTY || s.tiles[tt] === TILE_ROAD)) {
        m.x = nx;
        m.z = nz;
        m.walked += step;
        d = dhypot(t.x - m.x, t.z - m.z);
      } else if (d > reachTo) blocked = true;
    }
    if (!t || blocked) {
      f.state = 'with';
      f.foe = 0;
      // (Nobody in sight: the chase is over. One in sight it can't get at, or pays no mind: it goes on its way, and
      // after a while of that gives soldiers no mind for a spell; it doesn't hover by them.)
      if (!t) m.chase = 0;
      else if (!calm && ++m.chase > STALL) {
        m.calm = s.tick + CALM;
        m.chase = 0;
      }
      continue;
    }
    m.fought = s.tick;
    f.state = 'fight';
    f.foe = t.id;
    m.face = datan2(t.z - m.z, t.x - m.x);
    f.x = m.x;
    f.z = m.z;
    f.face = m.face;
    if (m.cool > 0) m.cool--;
    if (d > reachTo) {
      // (Going for one it can't get at for a while: it gives up on soldiers for a spell, and goes on.)
      if (++m.chase > STALL) {
        m.calm = s.tick + CALM;
        m.chase = 0;
      }
      continue;
    }
    if (m.cool > 0) continue;
    m.chase = 0;
    m.cool = mk.swing + Math.floor(roll(s, m, 1) * 4);
    m.swung = s.tick;
    f.swung = s.tick;
    const hurt = (x: Soldier, share: number, salt: number): void => {
      if (roll(s, m, salt) >= HIT) return;
      const kind = companyOf(s, x.company)?.kind ?? 'archer';
      const was = x.hp;
      x.hp -= mk.blow * share * (0.8 + 0.4 * roll(s, m, salt + 1)) * TAKES[kind];
      if (was > 0 && x.hp <= 0) m.men++;
    };
    hurt(t, 1, 2);
    if (mk.sweep) {
      const other = men.find((x) => x !== t && x.hp > 0 && dhypot(x.x - m.x, x.z - m.z) <= reachTo);
      if (other) hurt(other, 0.6, 4);
    }
  }
}

// ---------------------------------------------------------------------------
// People running indoors (raids.ts's `bandsAt`).

/** Where each monster out and about stands (x, z pairs, appended to `out`). */
export function monstersAbout(s: SimState, out: number[]): void {
  for (const m of s.legends.monsters) if (roaming(m)) out.push(m.x, m.z);
}

// ---------------------------------------------------------------------------
// In words.

/** "on the hills below the crags", "in the streets". */
function whereWords(map: CoastMap, x: number, z: number): string {
  const t = districtTitle(districtAt(map, x, z));
  return t ? `${t[0].toLowerCase()}${t.slice(1)}` : 'nearby';
}

/** What a monster is doing, for its tip and panel. */
export function beastDoing(s: SimState, m: Beast): string {
  const den = denNoun(m.den);
  const it = itOf(m.kind);
  const its = itsOf(m.kind);
  switch (m.state) {
    case 'coming':
      return 'Not yet come: something vast was seen where its lair will be';
    case 'settling':
      return `Making for ${its} ${den}, to settle in`;
    case 'lair': {
      const days = Math.max(0, Math.ceil((m.next - s.tick) / TICKS_PER_DAY));
      if (m.fought >= s.tick - 1) return `Fighting your soldiers before ${its} ${den}`;
      return m.warned ? `Stirring: ${it} comes out tomorrow for ${targetWords(m.kind)}` : `Before ${its} ${den}; ${it} will raid in about ${days} ${days === 1 ? 'day' : 'days'}`;
    }
    case 'raiding':
      if (m.fought >= s.tick - 1) return 'Fighting your soldiers';
      if (m.siege >= 0 && m.smash > 0) return 'Smashing through your wall';
      return m.wait > 0 ? `Wrecking what ${it} reaches by ${m.aim || `${its} target`}` : `Out on a raid, making for ${m.aim || 'the town'}`;
    case 'returning':
      return m.broke ? `Badly wounded, limping back to ${its} ${den}` : `Going back to ${its} ${den}`;
    case 'healing': {
      const days = Math.max(0, Math.ceil((m.next - s.tick) / TICKS_PER_DAY));
      return `Healing inside ${its} ${den}, out of reach, for ${days} more ${days === 1 ? 'day' : 'days'}: no raids till then`;
    }
    case 'leaving':
      return `Called home by ${GODS[m.god].name}: leaving your land`;
  }
}

/** A monster's tip: its name, its god and why, its health, its lair, its last raid, and who can slay it. */
export function beastTip(s: SimState, m: Beast): { title: string; detail: string } {
  const map = mapOf(s);
  const n = map.size;
  const hp = Math.round((100 * m.hp) / m.full);
  const lx = (m.lair % n) + 0.5;
  const lz = Math.floor(m.lair / n) + 0.5;
  return {
    title: `${Cap(beastName(m.kind))} · sent by ${GODS[m.god].name}`,
    detail: [
      `Why: ${m.why}`,
      `${beastDoing(s, m)} · health ${hp}%`,
      `${Cap(itsOf(m.kind))} lair: ${denWords(m.den)} ${whereWords(map, lx, lz)}`,
      m.state === 'raiding' ? `${outFor(s, m.last)}${m.wrecked.length ? `; it has wrecked ${m.wrecked.join(', ')}` : ''}` : m.last >= 0 ? `Last raid: ${daysAgo(s, m.last)}${m.lastWords ? `; ${m.lastWords}` : ''}` : 'No raid yet',
      `Your soldiers can wound ${himOf(m.kind)} and drive ${himOf(m.kind)} back. Only a hero can slay ${himOf(m.kind)}.`,
    ].join('\n'),
  };
}

/** "Out on this raid since today", "Out on this raid 4 days". */
export const outFor = (s: SimState, tick: number): string => {
  const d = Math.floor((s.tick - tick) / TICKS_PER_DAY);
  return d <= 0 ? 'Out on this raid since today' : `Out on this raid ${d} ${d === 1 ? 'day' : 'days'}`;
};

const daysAgo = (s: SimState, tick: number): string => {
  const d = Math.floor((s.tick - tick) / TICKS_PER_DAY);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
};
