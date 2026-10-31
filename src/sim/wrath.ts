/**
 * Slice 57 (Blessings and wrath, the Olympus line): the gods' wrath.
 *
 * - **Choosing a curse.** Once a day, with wrath's switch on (off while a
 *   demo's history plays), the gods watching and the city noticed, an angry
 *   or furious god (below displeased) with no omen running and no curse of
 *   theirs in force, who has not cursed or been appeased in the last
 *   WRATH_GAP, chooses one of their curses (GOD_CURSES) by a hash of the
 *   seed, the god and the day, among those the city can feel now. Only one
 *   omen runs at a time in the city, so only one curse lands at a time.
 * - **Always warned** (Oliver's decision). The omens begin OMEN_LEAD (a month)
 *   before the curse lands: an alarm naming the god, the curse, the day and
 *   the reasons; again REMIND before; the god's card, page and the overview
 *   show it with a countdown; and signs over the target in the city (the
 *   renderer's omens.ts reads `gods.wrath.omens`).
 * - **Turned.** Each day, a god risen to displeased or better is appeased:
 *   the omen is gone, said so, and the god waits WRATH_GAP before choosing
 *   again. An offering, a festival, a sanctuary's stage: anything that lifts
 *   them does it.
 * - **Landing.** On the day the curse does real damage through the systems
 *   that already exist (CURSES: fire, rubble, plague, monsters, people
 *   leaving, the stores), and says plainly what it destroyed. A lasting curse
 *   (blight, the olives, thieves, heartbreak) is a spell in force for its
 *   time, read by the systems through pantheon.ts' lookups; its end is said.
 * - **Wrath in person.** For the greater curses (lightning, earthquake,
 *   plague, riot) the god rises a few tiles off COME_AHEAD before the day and
 *   walks to the target, slice 56's figure with the reason 'wrath' (drawn
 *   darker and stormier), stands over it until the curse lands, and leaves.
 *
 * Exported for the other lines: `cursesOf(god)` (a god's curses),
 * `omenOf(s, god)` (their omen running), `curseWords(o)`.
 *
 * Pure and deterministic: hashes of the seed only (hazards' `unit`), so no
 * older roll moves; dmath for the sums. Moods only through the pantheon API.
 */
import type { CoastMap } from '../map/bake';
import { WATER_NONE, WATER_SEA } from '../map/bake';
import { DISTRICTS, districtAt } from '../map/districts';
import { mapOf } from '../map/lands';
import { datan2, dhypot } from '../map/dmath';
import { burnable, ignite, unit } from './hazards';
import { around, centreOf, livedIn, recountPopulation } from './buildings';
import { dateOfTick, MONTH_NAMES, TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { held, setHeld, WHEAT, WINE } from './foods';
import { moveOut } from './folk';
import { startOutbreak } from './health';
import { ALARM, NEWS, say, WARNING } from './messages';
import { himOf, lairFor, sendMonster } from './monsters';
import { goodsWords, offeringOf } from './worship';
import { GODS, GOD_IDS, herOf, MONSTERS, moodOfGod, moodRank, moodWord, noticed, reasonsOf, type CurseId, type GodId, type MonsterId, type Omen, type Spell } from './pantheon';
import { sendLeavers } from './settlers';
import { note } from './stockbook';
import { isStore } from './stores';
import { breakPiece } from './walls';
import { placeName, type GodFigure } from './epiphany';
import { TILE_EMPTY, TILE_ROAD, type Building, type SimState } from './state';
import type { Fall } from './hazards';
import { desert } from './army';

// ---------------------------------------------------------------------------
// The numbers, in one place (tuned by eye: a mid-sized city should lose a season's progress to a curse, not its future).

/** How long before a curse lands its omens begin, and when they are told again. */
export const OMEN_LEAD = TICKS_PER_MONTH;
export const REMIND = 5 * TICKS_PER_DAY;
/** After a curse lands or the god is appeased, how long before they choose another. */
export const WRATH_GAP = 6 * TICKS_PER_MONTH;
/** A god in person comes this long before the day (to rise, walk a few tiles and stand over the target). */
export const COME_AHEAD = 8 * TICKS_PER_DAY;
/** How far from the target the god rises (tiles). */
export const COME_FROM = 5;
/** A season, and a year: how long the lasting curses last. */
export const SEASON = 3 * TICKS_PER_MONTH;
/** Zeus: buildings struck. Hera and Aphrodite: homes that quarrel (a share of all, at least and at most), and what share of each leaves. */
export const LIGHTNING_STRIKES = 4;
export const QUARREL_SHARE = 0.1;
export const QUARREL_LEAST = 3;
export const QUARREL_MOST = 12;
export const QUARREL_LEAVE = 1 / 3;
/** Poseidon's earthquake: how far it shakes from the spot, how many buildings fall, how many road tiles break. */
export const QUAKE_REACH = 7;
export const QUAKE_FALLS = 6;
export const QUAKE_ROADS = 8;
/** Artemis: the herds thinned to this share of whole. Ares: this share of the soldiers desert. Hephaestus: workshops that catch fire. */
export const HERDS_LEFT = 0.25;
export const DESERT_SHARE = 0.25;
export const FORGE_FIRES = 3;
/** Dionysus's riot: how far it runs, how many homes the revellers set alight, and how much wine sours. */
export const RIOT_REACH = 8;
export const RIOT_FIRES = 2;
export const WINE_SOURS = 0.5;

/** Below displeased (angry or furious): a god who may curse. */
export const wrathful = (n: number): boolean => moodRank(n) <= 1;

// ---------------------------------------------------------------------------
// Words.

const dayWords = (tick: number): string => {
  const d = dateOfTick(tick);
  return `${d.day} ${MONTH_NAMES[d.month]}`;
};
const cap = (t: string): string => (t ? t[0].toUpperCase() + t.slice(1) : t);
const she = (g: GodId): string => (herOf(g) === 'her' ? 'she' : 'he');
const andList = (w: string[]): string => (w.length <= 1 ? (w[0] ?? '') : `${w.slice(0, -1).join(', ')} and ${w[w.length - 1]}`);
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
/** "in a month", "in 12 days", "tomorrow". */
const inWords = (ticks: number): string => {
  const d = Math.max(1, Math.ceil(ticks / TICKS_PER_DAY));
  return d >= 30 ? 'in a month' : d === 1 ? 'tomorrow' : `in ${d} days`;
};
const count = (n: number, one: string, many: string): string => `${NUMBER_WORDS[n] ?? n} ${n === 1 ? one : many}`;

/** Where a spot is, in words: "on the flood plain". */
function whereAt(map: CoastMap, x: number, z: number): string {
  return DISTRICTS[districtAt(map, x, z)]?.where ?? 'in the city';
}

/** A building in words for a curse's news: "the house of Kleon", "the agora on the flood plain". */
const named = (map: CoastMap, b: Building): string => placeName(map, b);

/** A god's reasons against you now, in words: "you honoured Poseidon, her rival; a theatre left empty". */
export function grudgeWords(s: SimState, god: GodId, most = 3): string {
  const rs = reasonsOf(s, god)
    .filter((r) => r.worth < 0)
    .slice(0, most)
    .map((r) => r.why);
  return rs.length ? rs.join('; ') : 'reasons of their own';
}

// ---------------------------------------------------------------------------
// The curses.

interface Target {
  x: number;
  z: number;
  target: number;
}

interface Curse {
  god: GodId;
  /** What it is, for the card and the news: "an earthquake by the shore". */
  name: string;
  /** What the omens look like (the alarm's first line). */
  signs: string;
  /** What it will do, in a line, for the card and page. */
  does: string;
  /** What the god will do, after their name ("send Medusa", "strike with lightning"), and whether a place is named after it. */
  verb: string;
  local: boolean;
  /** Does the god come in person to deliver it? */
  person: boolean;
  /** How long it lasts once landed (0: at once). */
  lasts: number;
  /** The monster it sends, if any. */
  monster?: MonsterId;
  /** Where it will strike, or null if the city can't feel it now. */
  aim: (s: SimState, map: CoastMap) => Target | null;
  /** It lands: what it did, in words (the news), or '' if it found nothing to do. */
  land: (s: SimState, map: CoastMap, o: Omen, fall: (b: Building, how: Fall) => void) => string;
}

// ------------------------------------------------------------------- places

/** The middle of the town: its lived-in homes', else every building's, else the land's. */
function middleOf(s: SimState, map: CoastMap): [number, number] {
  let x = 0;
  let z = 0;
  let k = 0;
  for (const b of s.buildings) {
    if (!livedIn(b)) continue;
    const [cx, cz] = centreOf(b);
    x += cx;
    z += cz;
    k++;
  }
  if (k === 0) for (const b of s.buildings) {
    if (b.kind === 'rubble') continue;
    const [cx, cz] = centreOf(b);
    x += cx;
    z += cz;
    k++;
  }
  return k ? [x / k, z / k] : [map.size / 2, map.size / 2];
}

const distTo = (b: Building, x: number, z: number): number => {
  const [cx, cz] = centreOf(b);
  return dhypot(cx - x, cz - z);
};

/** The nearest of these buildings to a spot (the lower id of equals). */
function nearest(list: readonly Building[], x: number, z: number): Building | undefined {
  let best: Building | undefined;
  let bd = Infinity;
  for (const b of list) {
    const d = distTo(b, x, z);
    if (d < bd || (d === bd && best && b.id < best.id)) [best, bd] = [b, d];
  }
  return best;
}

/** Buildings by distance from a spot (nearest first, then by id), within a reach. */
function byDistance(list: readonly Building[], x: number, z: number, reach = Infinity): Building[] {
  return list
    .map((b) => [b, distTo(b, x, z)] as const)
    .filter(([, d]) => d <= reach)
    .sort((a, b) => a[1] - b[1] || a[0].id - b[0].id)
    .map(([b]) => b);
}

const at = (b: Building | undefined): Target | null => {
  if (!b) return null;
  const [x, z] = centreOf(b);
  return { x, z, target: b.id };
};

const kinds = (s: SimState, ks: readonly string[]): Building[] => s.buildings.filter((b) => ks.includes(b.kind));

/** The quarter at the heart of the town: the agora nearest its middle, else the home nearest it. */
function heart(s: SimState, map: CoastMap): Building | undefined {
  const [mx, mz] = middleOf(s, map);
  return nearest(kinds(s, ['agora']), mx, mz) ?? nearest(s.buildings.filter(livedIn), mx, mz);
}

/** The land beside the sea nearest a spot (Poseidon's shore), or null on a land with no sea. */
function shoreNear(map: CoastMap, x: number, z: number): [number, number] | null {
  const n = map.size;
  let best: [number, number] | null = null;
  let bd = Infinity;
  for (let tz = 1; tz < n - 1; tz++) {
    for (let tx = 1; tx < n - 1; tx++) {
      const t = tz * n + tx;
      if (map.tileWater[t] !== WATER_NONE) continue;
      if (map.tileWater[t - 1] !== WATER_SEA && map.tileWater[t + 1] !== WATER_SEA && map.tileWater[t - n] !== WATER_SEA && map.tileWater[t + n] !== WATER_SEA) continue;
      const d = dhypot(tx + 0.5 - x, tz + 0.5 - z);
      if (d < bd) [best, bd] = [[tx + 0.5, tz + 0.5], d];
    }
  }
  return best;
}

/** Workshops: Hephaestus's fires. */
const WORKSHOPS = ['armoury', 'mine', 'press', 'winery', 'dairy', 'masons', 'loggers', 'quarry', 'horsefarm', 'shipyard'];

/** A monster curse: aimed at where its lair would be (if there is room for one and none of its kind is on your land). */
function monsterAim(kind: MonsterId): (s: SimState, map: CoastMap) => Target | null {
  return (s, map) => {
    if (s.legends.monsters.some((m) => m.kind === kind)) return null;
    const lair = lairFor(map, s, kind);
    if (!lair) return null;
    const n = map.size;
    return { x: (lair.tile % n) + 0.5, z: Math.floor(lair.tile / n) + 0.5, target: 0 };
  };
}

function monsterLand(kind: MonsterId): Curse['land'] {
  return (s, _map, o) => {
    const m = sendMonster(s, kind, `${GODS[o.god].name} is ${moodWord(moodOfGod(s, o.god))}: ${o.why}`);
    return m ? `${cap(MONSTERS[kind].name)} has come, sent by ${GODS[o.god].name}, as ${she(o.god)} warned. Your companies can wound ${himOf(kind)} and drive ${himOf(kind)} back to the lair; only a hero can slay ${himOf(kind)}.` : '';
  };
}

/** Homes quarrel: some of each household leave the city (Hera's and Aphrodite's). The homes, and how many left. */
function quarrels(s: SimState, map: CoastMap, o: Omen): { homes: number; left: number } {
  const homes = s.buildings.filter((b) => livedIn(b) && b.family && b.people >= 2);
  const k = Math.max(QUARREL_LEAST, Math.min(QUARREL_MOST, Math.round(homes.length * QUARREL_SHARE)));
  const hit = byDistance(homes, o.x, o.z).slice(0, k);
  let left = 0;
  for (const b of hit) {
    const want = Math.max(1, Math.floor(b.people * QUARREL_LEAVE));
    const going = moveOut(s, b, want).length;
    if (going <= 0) continue;
    b.people -= going;
    s.left += going;
    left += going;
    sendLeavers(s, map, going, centreOf(b), around(map.size, b));
  }
  if (left) {
    recountPopulation(s);
    s.rev++;
  }
  return { homes: hit.length, left };
}

/** Set these alight: what caught, in words. */
function burn(s: SimState, map: CoastMap, list: Building[]): string[] {
  const out: string[] = [];
  for (const b of list) {
    ignite(s, b);
    out.push(named(map, b));
  }
  if (list.length) s.rev++;
  return out;
}

const canBurn = (b: Building): boolean => burnable(b) && b.fire === 0 && b.kind !== 'sanctuary';

export const CURSES: Record<CurseId, Curse> = {
  lightning: {
    god: 'zeus',
    name: 'lightning',
    signs: 'Thunder rolls out of a clear sky, and the birds fall silent',
    does: 'his lightning strikes a few buildings, which catch fire',
    verb: 'strike with lightning',
    local: true,
    person: true,
    lasts: 0,
    aim: (s, map) => (s.buildings.some(canBurn) ? at(heart(s, map)) : null),
    land: (s, map, o) => {
      const hit = byDistance(s.buildings.filter(canBurn), o.x, o.z).slice(0, LIGHTNING_STRIKES);
      const names = burn(s, map, hit);
      return names.length ? `Zeus’s lightning struck ${whereAt(map, o.x, o.z)}: ${andList(names)} caught fire. Your watchmen can still save what burns.` : '';
    },
  },
  hydra: {
    god: 'hera',
    name: 'the Hydra',
    signs: 'The peacocks scream at night, and the marsh water turns black',
    does: 'she sends the Hydra to a lair on your land',
    verb: 'send the Hydra',
    local: false,
    person: false,
    lasts: 0,
    monster: 'hydra',
    aim: monsterAim('hydra'),
    land: monsterLand('hydra'),
  },
  quarrels: {
    god: 'hera',
    name: 'quarrels in the homes',
    signs: 'Wedding garlands wither on the doors, and husbands and wives speak sharply',
    does: 'households quarrel, and some of each leave the city',
    verb: 'set the homes quarrelling',
    local: true,
    person: false,
    lasts: 0,
    aim: (s, map) => (s.buildings.filter((b) => livedIn(b) && b.people >= 2).length >= QUARREL_LEAST ? at(heart(s, map)) : null),
    land: (s, map, o) => {
      const q = quarrels(s, map, o);
      return q.left ? `Hera’s anger fell on the homes ${whereAt(map, o.x, o.z)}: ${count(q.homes, 'household', 'households')} quarrelled, and ${q.left === 1 ? 'one of them has' : `${q.left} people have`} left the city.` : '';
    },
  },
  earthquake: {
    god: 'poseidon',
    name: 'an earthquake by the shore',
    signs: 'The sea draws back from the shore and the wells taste of salt; the sky over the water glows red at dusk',
    does: 'an earthquake by the shore: buildings fall, walls crack and roads break',
    verb: 'shake the earth',
    local: true,
    person: true,
    lasts: 0,
    aim: (s, map) => {
      const quay = kinds(s, ['trading', 'shipyard', 'lighthouse']);
      const [mx, mz] = middleOf(s, map);
      const q = nearest(quay, mx, mz);
      const [qx, qz] = q ? centreOf(q) : [mx, mz];
      const shore = shoreNear(map, qx, qz);
      if (!shore) return null;
      // (Aimed at the buildings nearest the shore there: something must stand within its reach.)
      const near = byDistance(s.buildings.filter((b) => b.kind !== 'rubble' && b.kind !== 'sanctuary'), shore[0], shore[1], QUAKE_REACH);
      if (!near.length) return null;
      return { x: shore[0], z: shore[1], target: q && distTo(q, shore[0], shore[1]) <= QUAKE_REACH ? q.id : near[0].id };
    },
    land: (s, map, o, fall) => {
      const n = map.size;
      const fell = byDistance(
        s.buildings.filter((b) => b.kind !== 'rubble' && b.kind !== 'sanctuary' && b.kind !== 'colossus' && b.kind !== 'lighthouse' && b.kind !== 'stadium'),
        o.x,
        o.z,
        QUAKE_REACH,
      ).slice(0, QUAKE_FALLS);
      const names = fell.map((b) => named(map, b));
      for (const b of fell) fall(b, 'collapse');
      let walls = 0;
      for (const p of s.walls) {
        if (p.hp <= 0) continue;
        if (dhypot((p.t % n) + 0.5 - o.x, Math.floor(p.t / n) + 0.5 - o.z) > QUAKE_REACH) continue;
        breakPiece(s, p);
        walls++;
      }
      // Roads broken: the nearest road tiles on dry land (never a bridge), up to QUAKE_ROADS.
      const roads: Array<[number, number]> = [];
      const r = Math.ceil(QUAKE_REACH);
      for (let tz = Math.floor(o.z) - r; tz <= Math.floor(o.z) + r; tz++) {
        for (let tx = Math.floor(o.x) - r; tx <= Math.floor(o.x) + r; tx++) {
          if (tx < 0 || tz < 0 || tx >= n || tz >= n) continue;
          const t = tz * n + tx;
          if (s.tiles[t] !== TILE_ROAD || map.tileWater[t] !== WATER_NONE) continue;
          if (s.walls.some((p) => p.t === t)) continue;
          const d = dhypot(tx + 0.5 - o.x, tz + 0.5 - o.z);
          if (d <= QUAKE_REACH) roads.push([t, d]);
        }
      }
      roads.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
      const broke = roads.slice(0, QUAKE_ROADS);
      for (const [t] of broke) s.tiles[t] = TILE_EMPTY;
      if (broke.length || walls) {
        s.tilesRev++;
        s.rev++;
      }
      const parts = [names.length ? `${andList(names)} ${names.length === 1 ? 'fell' : 'fell'} to rubble` : '', walls ? `${count(walls, 'stretch', 'stretches')} of wall cracked and fell` : '', broke.length ? `${count(broke.length, 'stretch', 'stretches')} of road broke apart` : ''].filter(Boolean);
      return parts.length ? `The earth shook ${whereAt(map, o.x, o.z)}, as Poseidon warned: ${andList(parts)}. Clear the rubble and build again.` : '';
    },
  },
  cyclops: {
    god: 'poseidon',
    name: 'the Cyclops',
    signs: 'Fishing boats come home empty, and something huge has been seen wading off the rocks',
    does: 'he sends the Cyclops to a den on your shore',
    verb: 'send the Cyclops',
    local: false,
    person: false,
    lasts: 0,
    monster: 'cyclops',
    aim: monsterAim('cyclops'),
    land: monsterLand('cyclops'),
  },
  blight: {
    god: 'demeter',
    name: 'blight on the fields',
    signs: 'The wheat yellows in the furrows before its time, and mice swarm in the granaries',
    does: 'blight on the fields for a season (they yield a quarter), and a granary’s grain rots',
    verb: 'blight your fields',
    local: false,
    person: false,
    lasts: SEASON,
    aim: (s, map) => {
      const farms = kinds(s, ['farm']);
      if (!farms.length) return null;
      let x = 0;
      let z = 0;
      for (const f of farms) {
        const [cx, cz] = centreOf(f);
        x += cx;
        z += cz;
      }
      return at(nearest(farms, x / farms.length, z / farms.length)) ?? (void map, null);
    },
    land: (s, map) => {
      const granary = s.buildings.filter((b) => b.kind === 'granary' && held(b, WHEAT) > 0).sort((a, b) => held(b, WHEAT) - held(a, WHEAT) || a.id - b.id)[0];
      let rot = '';
      if (granary) {
        const lost = held(granary, WHEAT);
        setHeld(granary, WHEAT, 0);
        note(s, WHEAT, 'lost', 'blight', lost);
        s.looks++;
        rot = ` In ${named(map, granary)}, ${lost} measures of wheat rotted.`;
      }
      return `Blight is on your fields, as Demeter warned: until the season turns they yield a quarter of their crop.${rot}`;
    },
  },
  medusa: {
    god: 'athena',
    name: 'Medusa',
    signs: 'Owls flee the city, and the olives drop unripe',
    does: 'she sends Medusa to a cave on your land',
    verb: 'send Medusa',
    local: false,
    person: false,
    lasts: 0,
    monster: 'medusa',
    aim: monsterAim('medusa'),
    land: monsterLand('medusa'),
  },
  olives: {
    god: 'athena',
    name: 'the olives failing',
    signs: 'Owls flee the city, and the olives drop unripe',
    does: 'the olive groves bear nothing for a year',
    verb: 'make your olives fail',
    local: false,
    person: false,
    lasts: TICKS_PER_YEAR,
    aim: (s) => at(kinds(s, ['grove'])[0]),
    land: () => 'The olives have failed, as Athena warned: your groves will bear nothing for a year.',
  },
  plague: {
    god: 'apollo',
    name: 'plague from his arrows',
    signs: 'The sun rises red and the dogs howl at noon; a sickly heat hangs over one quarter',
    does: 'plague from his arrows, in the quarter he names',
    verb: 'loose plague from his arrows',
    local: true,
    person: true,
    lasts: 0,
    aim: (s, map) => {
      if (!s.health?.on || s.health.outbreak) return null;
      const homes = s.buildings.filter((b) => livedIn(b) && b.family);
      if (homes.length < 10) return null;
      // The most crowded quarter: the home with the most homes about it (the lower id of equals).
      let best: Building | undefined;
      let most = -1;
      for (const b of homes) {
        const k = homes.filter((o) => distTo(o, ...centreOf(b)) <= 5).length;
        if (k > most) [best, most] = [b, k];
      }
      return at(best) ?? (void map, null);
    },
    land: (s, map, o) => {
      const home = s.buildings.find((b) => b.id === o.target && livedIn(b) && b.family) ?? nearest(s.buildings.filter((b) => livedIn(b) && !!b.family), o.x, o.z);
      if (!home || s.health.outbreak || !s.health.on) return '';
      startOutbreak(s, map, '', home, 'Apollo’s arrows');
      return `Apollo’s arrows fell ${whereAt(map, o.x, o.z)}, as he warned: plague has broken out in ${named(map, home)}. Physicians and an asklepieion save lives; a quarantine keeps it from Greece.`;
    },
  },
  boar: {
    god: 'artemis',
    name: 'the Calydonian Boar',
    signs: 'The deer vanish from the hills, and the dogs won’t go into the woods',
    does: 'she sends the Calydonian Boar',
    verb: 'send the Calydonian Boar',
    local: false,
    person: false,
    lasts: 0,
    monster: 'boar',
    aim: monsterAim('boar'),
    land: monsterLand('boar'),
  },
  herds: {
    god: 'artemis',
    name: 'the herds vanishing',
    signs: 'The deer vanish from the hills, and the dogs won’t go into the woods',
    does: 'the wild herds vanish from the hills (a quarter of them left)',
    verb: 'drive the wild herds from the hills',
    local: false,
    person: false,
    lasts: 0,
    aim: (s) => {
      const h = s.herds.find((x) => x.head > Math.ceil(x.full * HERDS_LEFT));
      return h ? { x: h.hx, z: h.hz, target: 0 } : null;
    },
    land: (s) => {
      let gone = 0;
      for (const h of s.herds) {
        const keep = Math.min(h.head, Math.max(1, Math.ceil(h.full * HERDS_LEFT)));
        gone += h.head - keep;
        h.head = keep;
      }
      if (gone) s.rev++;
      return gone ? `The wild herds have vanished from the hills, as Artemis warned: ${gone} head of game gone, and the hunters come home empty until they breed again.` : '';
    },
  },
  chimera: {
    god: 'ares',
    name: 'the Chimera',
    signs: 'Spears rust overnight in the racks, and smoke rises from the hills where nothing burns',
    does: 'he sends the Chimera',
    verb: 'send the Chimera',
    local: false,
    person: false,
    lasts: 0,
    monster: 'chimera',
    aim: monsterAim('chimera'),
    land: monsterLand('chimera'),
  },
  brawls: {
    god: 'ares',
    name: 'brawls in the barracks',
    signs: 'Spears rust overnight in the racks, and the soldiers come to blows over nothing',
    does: 'brawls and fires in the barracks, and soldiers desert',
    verb: 'set your soldiers brawling',
    local: true,
    person: false,
    lasts: 0,
    aim: (s) => at(kinds(s, ['barracks'])[0]),
    land: (s, map, o) => {
      const fires = burn(s, map, kinds(s, ['barracks']).filter(canBurn).slice(0, 2));
      const men = s.army.soldiers.filter((x) => x.company > 0 && (x.state === 'ready' || x.state === 'arming') && x.home > 0);
      const k = Math.floor(men.length * DESERT_SHARE);
      const gone = men.slice(0, k);
      for (const x of gone) desert(s, map, x);
      void o;
      const parts = [fires.length ? `${andList(fires)} caught fire in the brawling` : '', k ? `${count(k, 'soldier', 'soldiers')} deserted and went home, with ${k === 1 ? 'his' : 'their'} armour` : ''].filter(Boolean);
      return parts.length ? `Ares set your soldiers at each other’s throats, as he warned: ${andList(parts)}.` : '';
    },
  },
  heartbreak: {
    god: 'aphrodite',
    name: 'heartbreak',
    signs: 'Doves leave the rooftops, and the songs in the streets turn bitter',
    does: 'households break up in quarrels, and moods fall across the city for a season',
    verb: 'break hearts across the city',
    local: false,
    person: false,
    lasts: SEASON,
    aim: (s, map) => (s.buildings.filter((b) => livedIn(b) && b.people >= 2).length >= QUARREL_LEAST ? at(heart(s, map)) : null),
    land: (s, map, o) => {
      const q = quarrels(s, map, o);
      return `Aphrodite has turned her face from your city, as she warned: ${q.left ? `${count(q.homes, 'household', 'households')} broke up in quarrels and ${q.left === 1 ? 'one of them has' : `${q.left} people have`} left, and ` : ''}every home is gloomier until the season turns.`;
    },
  },
  talos: {
    god: 'hephaestus',
    name: 'Talos',
    signs: 'Bronze rings in the night and the forges go cold of themselves',
    does: 'he sends Talos, the bronze giant',
    verb: 'send Talos',
    local: false,
    person: false,
    lasts: 0,
    monster: 'talos',
    aim: monsterAim('talos'),
    land: monsterLand('talos'),
  },
  forge: {
    god: 'hephaestus',
    name: 'fires in the workshops',
    signs: 'Bronze rings in the night and sparks leap from cold hearths',
    does: 'fires break out in the workshops',
    verb: 'set your workshops afire',
    local: false,
    person: false,
    lasts: 0,
    aim: (s, map) => {
      const [mx, mz] = middleOf(s, map);
      return at(nearest(kinds(s, WORKSHOPS).filter(canBurn), mx, mz));
    },
    land: (s, map, o) => {
      const names = burn(s, map, byDistance(kinds(s, WORKSHOPS).filter(canBurn), o.x, o.z).slice(0, FORGE_FIRES));
      return names.length ? `Fires broke out in your workshops, as Hephaestus warned: ${andList(names)} caught fire.` : '';
    },
  },
  thieves: {
    god: 'hermes',
    name: 'a season of thieves',
    signs: 'Purses go missing in the agora, and travellers say the roads are full of strangers',
    does: 'thieves everywhere for a season (homes twice as tempted to crime)',
    verb: 'loose thieves on the city for a season',
    local: false,
    person: false,
    lasts: SEASON,
    aim: (s, map) => (s.crime?.on ? at(heart(s, map)) : null),
    land: () => 'Hermes has turned the thieves loose on your city, as he warned: until the season turns, homes are twice as tempted to crime. Watch posts and a court keep it down.',
  },
  riot: {
    god: 'dionysus',
    name: 'a drunken riot',
    signs: 'Wine turns to vinegar in the cups, and drums are heard in the hills at night',
    does: 'a drunken riot across a quarter (fountains, shrines and stalls smashed, homes alight), and the wine sours in the stores',
    verb: 'send a drunken riot through the streets',
    local: true,
    person: true,
    lasts: 0,
    aim: (s, map) => (s.buildings.filter(livedIn).length >= 10 ? at(heart(s, map)) : null),
    land: (s, map, o) => {
      const smash = byDistance(kinds(s, ['fountain', 'shrine', 'agora']), o.x, o.z, RIOT_REACH).filter((b) => !s.crime.broken.some((x) => x.at === b.id));
      for (const b of smash) s.crime.broken.push({ at: b.id, part: -1, tick: s.tick, by: 'Dionysus’s revellers' });
      const fires = burn(s, map, byDistance(s.buildings.filter((b) => livedIn(b) && canBurn(b)), o.x, o.z, RIOT_REACH).slice(0, RIOT_FIRES));
      let soured = 0;
      for (const b of s.buildings) {
        if (!isStore(b.kind) && b.kind !== 'winery') continue;
        const w = held(b, WINE);
        if (w <= 0) continue;
        const lost = Math.floor(w * WINE_SOURS);
        setHeld(b, WINE, w - lost);
        soured += lost;
      }
      if (soured) {
        note(s, WINE, 'lost', 'soured', soured);
        s.looks++;
      }
      if (smash.length) s.rev++;
      const parts = [smash.length ? `smashed ${andList(smash.map((b) => named(map, b)))}` : '', fires.length ? `set ${andList(fires)} alight` : ''].filter(Boolean);
      const sour = soured ? ` ${soured} amphorae of wine soured in the stores.` : '';
      return parts.length || soured ? `A drunken riot ran through the streets ${whereAt(map, o.x, o.z)}, as Dionysus warned: his revellers ${parts.length ? andList(parts) : 'broke nothing'}.${sour} Smashed places send nobody until they are mended.` : '';
    },
  },
};

/** Each god's curses, in the order they are offered to the hash. */
export const GOD_CURSES: Record<GodId, readonly CurseId[]> = {
  zeus: ['lightning'],
  hera: ['hydra', 'quarrels'],
  poseidon: ['earthquake', 'cyclops'],
  demeter: ['blight'],
  athena: ['medusa', 'olives'],
  apollo: ['plague'],
  artemis: ['boar', 'herds'],
  ares: ['chimera', 'brawls'],
  aphrodite: ['heartbreak'],
  hephaestus: ['talos', 'forge'],
  hermes: ['thieves'],
  dionysus: ['riot'],
};

export const cursesOf = (god: GodId): readonly CurseId[] => GOD_CURSES[god];
export const curseOf = (c: CurseId): Curse => CURSES[c];

// ---------------------------------------------------------------------------
// Reading the state.

/** A god's omen running, if any. */
export const omenOf = (s: SimState, god: GodId): Omen | undefined => s.gods.wrath.omens.find((o) => o.god === god);
/** A god's lasting curse in force, if any. */
export const curseInForce = (s: SimState, god: GodId): Spell | undefined => s.gods.wrath.spells.find((x) => x.god === god && x.curse !== '' && x.until > s.tick);
/** Days until an omen's curse lands (at least 1 while it hasn't). */
export const daysLeft = (s: SimState, o: Omen): number => Math.max(1, Math.ceil((o.day - s.tick) / TICKS_PER_DAY));

/** What an omen's curse is and when, in words: "Medusa, on 14 March (in 12 days)". */
export function curseWords(s: SimState, o: Omen): string {
  const d = daysLeft(s, o);
  return `${CURSES[o.curse].name}, on ${dayWords(o.day)} (in ${d === 1 ? 'a day' : `${d} days`})`;
}

/** What would turn a god's curse, in words: how far to lift them, and the ways to. */
export function turnWords(s: SimState, god: GodId): string {
  const G = GODS[god];
  const m = moodOfGod(s, god);
  const him = herOf(god) === 'her' ? 'her' : 'him';
  const need = -30 - m;
  return `Lift ${him} ${need > 0 ? `${need} or more, ` : ''}back to displeased (−30) and it is turned: an offering of ${goodsWords(G.sacred, offeringOf(G.sacred))} (+4), a festival to ${him} (+15), a shrine dedicated to ${him}, a stage of ${herOf(god)} sanctuary.`;
}

// ---------------------------------------------------------------------------
// The step.

/** A curse chosen for a god now (by a hash of the seed, the god and the day, among those the city can feel), with its aim, or null. */
function choose(s: SimState, map: CoastMap, god: GodId): { curse: CurseId; t: Target } | null {
  const list = GOD_CURSES[god];
  const day = Math.floor(s.tick / TICKS_PER_DAY);
  const first = Math.floor(unit(s.seed, GOD_IDS.indexOf(god) + 1, day, 0x57a7) * list.length);
  for (let k = 0; k < list.length; k++) {
    const c = list[(first + k) % list.length];
    const t = CURSES[c].aim(s, map);
    if (t) return { curse: c, t };
  }
  return null;
}

/** Start a god's omen: a curse chosen and aimed, landing a month from now (the hook for demos: `staged` lands on a day of their own). Null if the city can't feel any of theirs. */
export function beginOmen(s: SimState, map: CoastMap, god: GodId, curse?: CurseId, lead = OMEN_LEAD): Omen | null {
  if (omenOf(s, god)) return null;
  const pick = curse ? { curse, t: CURSES[curse].aim(s, map) } : choose(s, map, god);
  if (!pick || !pick.t) return null;
  const c = CURSES[pick.curse];
  const o: Omen = { god, curse: pick.curse, at: s.tick, day: s.tick + lead, x: pick.t.x, z: pick.t.z, target: pick.t.target, why: grudgeWords(s, god), told: 0, figure: 0 };
  s.gods.wrath.omens.push(o);
  s.rev++;
  const G = GODS[god];
  const m = moodOfGod(s, god);
  const tb = o.target ? s.buildings.find((b) => b.id === o.target) : undefined;
  const where = tb ? ` at ${named(map, tb)}` : ` ${whereAt(map, o.x, o.z)}`;
  say(s, {
    kind: 'wrath',
    u: ALARM,
    title: `Ominous signs: ${G.name} is ${moodWord(m)}`,
    words: `Ominous signs: ${c.signs.toLowerCase()}. ${G.name} is ${moodWord(m)}: ${o.why}. On ${dayWords(o.day)}, ${inWords(o.day - s.tick)}, ${she(god)} will ${c.verb}${c.local ? where : ''}. An offering, a festival or anything that lifts ${herOf(god) === 'her' ? 'her' : 'him'} back to displeased will turn it.`,
    at: o.target ? { building: o.target } : { tile: Math.floor(o.z) * map.size + Math.floor(o.x) },
  });
  return o;
}

/** The god in person, rising a few tiles off and walking to the target (a figure of slice 56's, its reason 'wrath'): refused with three gods walking or the god here already. */
function comeInPerson(s: SimState, map: CoastMap, o: Omen): void {
  const w = s.gods.walks;
  if (w.figures.some((f) => f.god === o.god) || w.figures.filter((f) => f.state !== 'posing').length >= 3) return;
  const b = s.buildings.find((x) => x.id === o.target) ?? nearest(s.buildings.filter((x) => x.kind !== 'rubble'), o.x, o.z);
  if (!b) return;
  const [cx, cz] = centreOf(b);
  // From outside the town: off the target, away from the town's middle (on dry land).
  const [mx, mz] = middleOf(s, map);
  let dx = cx - mx;
  let dz = cz - mz;
  const d = dhypot(dx, dz);
  [dx, dz] = d > 0.01 ? [dx / d, dz / d] : [1, 0];
  let [x, z] = [cx + dx * COME_FROM, cz + dz * COME_FROM];
  for (let k = COME_FROM; k > 0; k--) {
    const tx = Math.floor(cx + dx * k);
    const tz = Math.floor(cz + dz * k);
    if (tx >= 1 && tz >= 1 && tx < map.size - 1 && tz < map.size - 1 && map.tileWater[tz * map.size + tx] === WATER_NONE) {
      [x, z] = [tx + 0.5, tz + 0.5];
      break;
    }
    [x, z] = [cx, cz];
  }
  const f: GodFigure = {
    id: w.next++,
    god: o.god,
    x,
    z,
    px: x,
    pz: z,
    heading: datan2(cx - x, cz - z),
    state: 'arriving',
    since: s.tick,
    why: 'wrath',
    words: `${she(o.god)} has come in wrath, to deliver ${CURSES[o.curse].name}`,
    stops: [{ id: b.id, x: cx, z: cz }],
    at: 0,
    came: s.tick,
    leaves: o.day + 6 * TICKS_PER_DAY,
    blessed: [],
  };
  w.figures.push(f);
  o.figure = f.id;
  s.rev++;
  say(s, { kind: 'wrath', u: WARNING, title: `${GODS[o.god].name} comes in wrath`, words: `${GODS[o.god].name} has come in wrath, dark as a storm, and walks towards ${named(map, b)}: on ${dayWords(o.day)} ${she(o.god)} will ${CURSES[o.curse].verb}. It can still be turned.`, at: { building: b.id } });
}

/** The wrath figure of an omen, if it is in the city. */
const figureOfOmen = (s: SimState, o: Omen): GodFigure | undefined => (o.figure ? s.gods.walks.figures.find((f) => f.id === o.figure) : undefined);

/** Let the god in person go (where they stand). */
function release(s: SimState, o: Omen): void {
  const f = figureOfOmen(s, o);
  if (f && f.state !== 'leaving') {
    f.stops = f.stops.slice(0, f.at);
    f.state = 'leaving';
    f.since = s.tick;
  }
}

/** The god appeased: the omen gone, said. */
function appease(s: SimState, map: CoastMap, o: Omen): void {
  const w = s.gods.wrath;
  w.omens.splice(w.omens.indexOf(o), 1);
  w.cursed[o.god] = s.tick;
  release(s, o);
  s.rev++;
  const G = GODS[o.god];
  const c = CURSES[o.curse];
  say(s, { kind: 'wrath', u: NEWS, title: `${G.name} is appeased`, words: `${G.name} is appeased (${moodWord(moodOfGod(s, o.god))} now): the signs fade, and ${c.monster ? `${MONSTERS[c.monster].name} will not come` : `${c.name} will not fall`}.`, at: { tile: Math.floor(o.z) * map.size + Math.floor(o.x) } });
}

/** The day: the curse lands, said with what it destroyed. */
function land(s: SimState, map: CoastMap, o: Omen, fall: (b: Building, how: Fall) => void): void {
  const w = s.gods.wrath;
  w.omens.splice(w.omens.indexOf(o), 1);
  w.cursed[o.god] = s.tick;
  const c = CURSES[o.curse];
  const words = c.land(s, map, o, fall);
  if (c.lasts > 0) w.spells.push({ god: o.god, curse: o.curse, from: s.tick, until: s.tick + c.lasts });
  release(s, o);
  s.rev++;
  const G = GODS[o.god];
  say(s, {
    kind: 'wrath',
    u: ALARM,
    title: `${G.name}’s wrath`,
    words: words || `${G.name}’s ${c.name} fell, but found little to strike.`,
    at: o.target && s.buildings.some((b) => b.id === o.target) ? { building: o.target } : { tile: Math.floor(o.z) * map.size + Math.floor(o.x) },
  });
}

/** Lasting curses whose time is up: said. */
function lapse(s: SimState): void {
  const w = s.gods.wrath;
  for (let i = w.spells.length - 1; i >= 0; i--) {
    const x = w.spells[i];
    if (x.until > s.tick || x.curse === '') continue;
    w.spells.splice(i, 1);
    s.rev++;
    const G = GODS[x.god];
    const END: Partial<Record<CurseId, string>> = { blight: 'The blight lifts from your fields: they yield as they should again.', olives: 'The olives flower again: Athena’s curse on your groves is over.', thieves: 'The season of thieves is over: Hermes has called them off.', heartbreak: 'Aphrodite’s curse lifts: the streets are friendlier again.' };
    say(s, { kind: 'wrath', u: NEWS, title: `${G.name}’s curse lifts`, words: END[x.curse] ?? `${G.name}’s curse is over.` });
  }
}

/**
 * Once a day (sim.ts, after the gods and worship): lasting curses run out;
 * each omen is turned (its god lifted past angry), told again, met by its god
 * in person, or lands; and, with wrath's switch on and no omen running, an
 * angry god may choose a curse. `fall` is the city's: a building to rubble.
 */
export function stepWrath(s: SimState, map: CoastMap, fall: (b: Building, how: Fall) => void): void {
  const w = s.gods.wrath;
  if (!s.gods.on || s.tick % TICKS_PER_DAY !== 0) return;
  if (w.spells.length) lapse(s);
  for (const o of w.omens.slice()) {
    if (!wrathful(moodOfGod(s, o.god))) {
      appease(s, map, o);
      continue;
    }
    if (s.tick >= o.day) {
      land(s, map, o, fall);
      continue;
    }
    const f = figureOfOmen(s, o);
    // (A god in person who has reached the target stands over it, the storm gathering, until the day.)
    if (f && f.state === 'blessing') f.since = s.tick;
    if (!o.figure && CURSES[o.curse].person && o.day - s.tick <= COME_AHEAD) comeInPerson(s, map, o);
    if (!o.told && o.day - s.tick <= REMIND) {
      o.told = s.tick;
      const G = GODS[o.god];
      say(s, { kind: 'wrath', u: WARNING, title: `${G.name}’s curse is near`, words: `In ${daysLeft(s, o)} days, on ${dayWords(o.day)}, ${G.name} will ${CURSES[o.curse].verb}. ${G.name} is ${moodWord(moodOfGod(s, o.god))}: it can still be turned by lifting ${herOf(o.god) === 'her' ? 'her' : 'him'} back to displeased.`, at: o.target ? { building: o.target } : { tile: Math.floor(o.z) * map.size + Math.floor(o.x) } });
    }
  }
  if (!w.on || w.omens.length || !noticed(s)) return;
  for (const god of GOD_IDS) {
    if (!wrathful(moodOfGod(s, god))) continue;
    const last = w.cursed[god];
    if (last !== undefined && s.tick - last < WRATH_GAP) continue;
    if (curseInForce(s, god)) continue;
    if (beginOmen(s, map, god)) return;
  }
}

/** Words for a wrath figure's hover tip and panel (epiphany.ts' doingWords for the reason 'wrath'). */
export function wrathDoing(s: SimState, f: GodFigure): string | null {
  if (f.why !== 'wrath') return null;
  const o = s.gods.wrath.omens.find((x) => x.figure === f.id);
  const b = f.stops[0] ? s.buildings.find((x) => x.id === f.stops[0].id) : undefined;
  const what = o ? CURSES[o.curse].name : 'their curse';
  if (f.state === 'leaving') return 'leaving your city, wrath spent';
  if (f.state === 'blessing') return `standing over ${b ? named(mapOf(s), b) : 'the place'}, the storm gathering: ${what}${o ? ` on ${dayWords(o.day)}` : ''}`;
  return `come in wrath${o ? `: ${what} on ${dayWords(o.day)}` : ''}`;
}

