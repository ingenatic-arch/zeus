/**
 * Monuments (slice 35): what they are, what each stage needs, and what a
 * finished one does. The plain facts only, read by the rest of the city
 * (the merchant ship, the pirates, a home's mood) without anything heavier:
 * the work of building them (the masons' builders, the ox carts, the games'
 * visitors) is in monumentworks.ts.
 *
 * - **Three monuments**, one of each per town: the Lighthouse (on high ground
 *   by the sea), the Colossus (on the shore by deep water: the harbour mouth)
 *   and the Stadium (6 x 6, on flat ground).
 * - **Built in stages**: marked out, then three stages (the foundations,
 *   the columns, the finish), each needing so much marble, timber and bronze
 *   (copper, ware 8, cast by an armoury's smiths) on site before it starts,
 *   and then so many builder-days of work.
 * - **A site's record** (`s.monuments.sites`): its building, its kind, the
 *   stage it is at (STAGE_COUNT when finished), whether that stage's work has
 *   begun, the work done on it, when it was marked out, when each stage was
 *   finished and when the whole was. The materials on site are the site
 *   building's own goods.
 *
 * Nothing here draws a random number; a town with no monument has an empty
 * list and plays exactly as it did.
 */
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { ARMOUR, CHEESE, COPPER, held, HORSES, MARBLE, MEAT, TIMBER, WARE_NAMES, WHEAT, type Ware } from './foods';
// Slice 54: a sanctuary's site, its god and their sacred good.
import { GODS, type GodId } from './pantheon';
import type { Building, BuildingKind, SimState } from './state';
// (Merge of slice 58: the stores, for the copper kept back in each.)
import { isStore, roomOf } from './stores';

export type MonumentKind = 'lighthouse' | 'colossus' | 'stadium';
export const MONUMENT_KINDS: readonly MonumentKind[] = ['lighthouse', 'colossus', 'stadium'];
/** Is this kind of building a monument? */
export const isMonument = (k: BuildingKind | string): k is MonumentKind => k === 'lighthouse' || k === 'colossus' || k === 'stadium';

/** What the monuments are called. */
export const MONUMENT_NAMES: Record<MonumentKind, string> = { lighthouse: 'the Lighthouse', colossus: 'the Colossus', stadium: 'the Stadium' };
/** "the Lighthouse" with a capital: "The Lighthouse". */
export const monumentName = (k: MonumentKind, cap = false): string => (cap ? MONUMENT_NAMES[k].replace(/^t/, 'T') : MONUMENT_NAMES[k]);

/** What placing each costs: the most expensive things in the game. */
export const LIGHTHOUSE_COST = 1500;
export const COLOSSUS_COST = 2000;
export const STADIUM_COST = 2500;
/** The masons' yard (2 x 2): its builders walk to the sites. */
export const MASONS_COST = 200;

/** The materials a stage can need, in the order the site lists them: marble, timber, bronze (copper). */
export const MATERIALS: readonly Ware[] = [MARBLE, TIMBER, COPPER];

/** One stage of a monument: its name, a few words on what it is, what it needs on site, its builders, and its days of work with every builder there. */
export interface Stage {
  name: string;
  what: string;
  marble: number;
  timber: number;
  bronze: number;
  builders: number;
  days: number;
  /** Slice 54: a sanctuary's last stage: its god's sacred good, and how much of it consecrates it (none for a monument). */
  ware?: Ware;
  sacred?: number;
}

/** Each monument's three stages: the foundations, the columns (or the bronze frame, or the seats), the finish. */
export const STAGES: Record<MonumentKind, readonly Stage[]> = {
  lighthouse: [
    { name: 'The foundations', what: 'coursed marble footings on the rock', marble: 200, timber: 80, bronze: 0, builders: 6, days: 30 },
    { name: 'The tower', what: 'the tower, drum by drum, inside its scaffold', marble: 400, timber: 120, bronze: 0, builders: 8, days: 60 },
    { name: 'The lantern', what: 'the colonnaded lantern and its fire', marble: 200, timber: 160, bronze: 0, builders: 8, days: 40 },
  ],
  colossus: [
    { name: 'The plinth', what: 'the marble plinth he will stand on', marble: 300, timber: 60, bronze: 0, builders: 6, days: 30 },
    { name: 'The bronze frame', what: 'his frame of bronze struts, cast on site', marble: 0, timber: 200, bronze: 300, builders: 8, days: 50 },
    { name: 'The bronze skin', what: 'his skin of bronze plates, the torch raised', marble: 0, timber: 60, bronze: 400, builders: 10, days: 60 },
  ],
  stadium: [
    { name: 'The track and banks', what: 'the levelled track and the earth banks either side', marble: 150, timber: 150, bronze: 0, builders: 8, days: 40 },
    { name: 'The stone seats', what: 'row on row of stone seats up the banks', marble: 700, timber: 0, bronze: 0, builders: 12, days: 70 },
    { name: 'The colonnade', what: 'the colonnade, the judges’ stand and the starting line', marble: 300, timber: 200, bronze: 0, builders: 10, days: 50 },
  ],
};
/** Stages before a monument is finished. */
export const STAGE_COUNT = 3;

/** What a stage needs of a material on site (slice 54: and of a sanctuary's sacred good, on top). */
export const needOf = (st: Stage, w: Ware): number => (w === MARBLE ? st.marble : w === TIMBER ? st.timber : w === COPPER ? st.bronze : 0) + (st.ware === w ? (st.sacred ?? 0) : 0);
/** The builder-ticks of work a stage takes. */
export const workOf = (st: Stage): number => st.builders * st.days * TICKS_PER_DAY;
/** A monument's totals of each material, all three stages. */
export const totalOf = (k: MonumentKind, w: Ware): number => STAGES[k].reduce((a, st) => a + needOf(st, w), 0);

/** A monument site: see the notes at the top. */
export interface Site {
  /** Its building's id. */
  id: number;
  /** Slice 54: a monument's kind, or a sanctuary. */
  kind: SiteKind;
  /** The stage it is at: 0, 1 or 2; STAGE_COUNT once finished. */
  stage: number;
  /** Has this stage's work begun (its materials were all on site, and are used)? */
  building: boolean;
  /** Builder-ticks of work done on this stage. */
  work: number;
  /** When it was marked out. */
  marked: number;
  /** When each stage was finished, in order. */
  done: number[];
  /** When it was finished (0: not yet). */
  finished: number;
  /** Slice 54: a sanctuary's god (none for a monument). */
  god?: GodId;
  /** Slice 54: when a finished sanctuary lost the last of its workers (0: staffed, or not finished; always 0 for a monument). */
  idle: number;
}

/** The Stadium's games: when the next open (0: none planned), when those on now end (0: none on), and the tallies of the games on now or last held. */
export interface Games {
  next: number;
  until: number;
  /** How many have been held (counting those on now). */
  held: number;
  /** Groups of visitors sent and people in them, and their takings (dr), at the games on now or last held. */
  groups: number;
  visitors: number;
  takings: number;
  /** When the last ended (0: none yet). */
  ended: number;
}

/** The slice's one top-level field. */
export interface Monuments {
  sites: Site[];
  games: Games;
}

export const freshGames = (): Games => ({ next: 0, until: 0, held: 0, groups: 0, visitors: 0, takings: 0, ended: 0 });
export const freshMonuments = (): Monuments => ({ sites: [], games: freshGames() });

/** The record of the site on this building, if it is one. */
export const siteOf = (s: SimState, id: number): Site | undefined => s.monuments.sites.find((x) => x.id === id);
/** This town's monument of a kind (its record), if it has one. */
export const monumentOf = (s: SimState, kind: MonumentKind): Site | undefined => s.monuments.sites.find((x) => x.kind === kind);
/** Is this monument finished (and standing)? */
export const finished = (s: SimState, kind: MonumentKind): boolean => !!monumentOf(s, kind)?.finished;
/** The stage a site is at now (undefined once finished). */
export const stageNow = (x: Site): Stage | undefined => stagesOf(x)[x.stage];
/** How far along a site is, 0 (marked out) to 1 (finished): the stages done and the share of the work on the one under way. */
export function progressOf(x: Site): number {
  if (x.finished) return 1;
  const st = stageNow(x);
  const part = st && x.building ? Math.min(1, x.work / workOf(st)) : 0;
  return (x.stage + part) / STAGE_COUNT;
}

// ---------------------------------------------------------------------------
// What a finished one does.

/** Is the Lighthouse's fire burning (finished, standing)? */
export const lit = (s: SimState): boolean => finished(s, 'lighthouse');
/**
 * The Tyrian ship's pace on a voyage begun now (trade.ts): her days sailing
 * in and out are this share of the usual while the Lighthouse burns (12 days
 * in, not 20; 10 out, not 16), and she calls every two months, not three.
 */
export const LIT_PACE = 0.6;
export const LIT_EVERY = 2 * TICKS_PER_MONTH;
/** Pirates keep clear of your waters while it burns (fleet.ts). */
export const piratesKeepClear = (s: SimState): boolean => lit(s);

/** The Colossus: every ruler remembers it, for good (diplomacy's moods). */
export const COLOSSUS_MOOD = 12;
export const COLOSSUS_WHY = 'They speak of your Colossus';

/** Any monument finished: every ruler admires it (fading over a year). */
export const NOTICE_MOOD = 6;
export const NOTICE_FADE = TICKS_PER_YEAR;

/**
 * The Stadium's games: every four years, a month long, the first four months
 * after it is finished, announced three months ahead (when the first visitors
 * set out: the walk in from the edge of the map can take two months).
 */
export const GAMES_EVERY = 4 * TICKS_PER_YEAR;
export const GAMES_LAST = TICKS_PER_MONTH;
export const FIRST_GAMES = 4 * TICKS_PER_MONTH;
export const GAMES_NOTICE = 3 * TICKS_PER_MONTH;
/** The mood the games bring every home, while they are on and for a while after. */
export const GAMES_MOOD = 2;
export const AFTER_MOOD = 1;
export const AFTER_GAMES = 2 * TICKS_PER_MONTH;
/** Are the games on now? */
export const gamesOn = (s: SimState): boolean => s.monuments.games.until > s.tick && s.monuments.games.held > 0;

/** What the games add to a home's mood now, and why (null: nothing). */
export function gamesMood(s: SimState): { w: number; text: string } | null {
  const g = s.monuments.games;
  if (g.held === 0) return null;
  if (g.until > s.tick) return { w: GAMES_MOOD, text: 'The games are on at the Stadium' };
  if (g.ended > 0 && s.tick - g.ended < AFTER_GAMES) return { w: AFTER_MOOD, text: 'Still talking of the games' };
  return null;
}

// ---------------------------------------------------------------------------
// Slice 54: sites that are sanctuaries.
//
// A sanctuary to one of the twelve (sanctuaries.ts) is raised as a smaller
// monument is, on a site in the same list, by the same ox carts and masons'
// builders: its record has the god, its stages are `sanctuaryStages`, and its
// materials are the monuments' and its god's sacred good. Every reader of a
// site's stages or materials asks `stagesOf` and `siteMaterials`, which give
// a monument's exactly as before.

/** What stands on a site: a monument, or a sanctuary. */
export type SiteKind = MonumentKind | 'sanctuary';
/** Is this kind of building raised on a site (a monument or a sanctuary)? */
export const isSiteKind = (k: BuildingKind | string): k is SiteKind => isMonument(k) || k === 'sanctuary';

/** How much of a god's sacred good consecrates their sanctuary: a granary's measures of a food, a few cartloads of a good, sixteen sets of armour, eight horses. */
export function sacredMeasure(w: Ware): number {
  if (w === WHEAT || w === MEAT || w === CHEESE) return 200;
  if (w === ARMOUR) return 16;
  if (w === HORSES) return 8;
  return 100;
}

const sanctuaryStageCache = new Map<GodId, readonly Stage[]>();
/**
 * A god's sanctuary's three stages, the same for every god but the last's
 * sacred good. With one fully staffed masons' yard (four builders) the work
 * takes about 285 days, and the materials must be hauled besides: a year or
 * more (about fifteen months in #sanctuary, its storehouse across town and
 * marble only as the quarry cuts it). Two sanctuaries sharing that yard take
 * about two.
 * (Worked out inside a function, so the order modules load in can't spoil it.)
 */
export function sanctuaryStages(god: GodId): readonly Stage[] {
  const had = sanctuaryStageCache.get(god);
  if (had) return had;
  const g = GODS[god];
  const st: readonly Stage[] = [
    { name: 'The foundations', what: 'the temple’s stepped platform and the footings of the court’s walls', marble: 160, timber: 80, bronze: 0, builders: 4, days: 60 },
    { name: 'The temple', what: 'its ring of columns, its walls and its roof, raised inside the scaffold', marble: 320, timber: 160, bronze: 0, builders: 6, days: 80 },
    {
      name: 'The statue and finish',
      what: `${g.name}’s statue cast in bronze, the altar and the court, consecrated with ${WARE_NAMES[g.sacred]}`,
      marble: 120,
      timber: 0,
      bronze: 120,
      builders: 6,
      days: 70,
      ware: g.sacred,
      sacred: sacredMeasure(g.sacred),
    },
  ];
  sanctuaryStageCache.set(god, st);
  return st;
}

/** A site's stages: a monument's (STAGES), or a sanctuary's to its god. */
export const stagesOf = (x: Site): readonly Stage[] => (x.kind === 'sanctuary' ? sanctuaryStages(x.god ?? 'zeus') : STAGES[x.kind]);

const materialCache = new Map<Ware, readonly Ware[]>();
/** The materials a site can need, in the order it lists them: a monument's (MATERIALS), and for a sanctuary its god's sacred good too (unless it is one of them already: Hephaestus's copper). */
export function siteMaterials(x: Site): readonly Ware[] {
  if (x.kind !== 'sanctuary') return MATERIALS;
  const w = GODS[x.god ?? 'zeus'].sacred;
  if (MATERIALS.includes(w)) return MATERIALS;
  let m = materialCache.get(w);
  if (!m) materialCache.set(w, (m = [...MATERIALS, w]));
  return m;
}

/** What a site is called: "the Lighthouse", "the sanctuary to Demeter". */
export function siteName(x: { kind: SiteKind; god?: GodId }, cap = false): string {
  if (x.kind !== 'sanctuary') return monumentName(x.kind, cap);
  return `${cap ? 'The' : 'the'} sanctuary to ${GODS[x.god ?? 'zeus'].name}`;
}

// ---------------------------------------------------------------------------
// Slice 58 (from slice 54's review): copper kept for the sites.

/**
 * How much of a ware the unfinished sites still want brought to them: the
 * stage gathering now and every stage after it, less what is on site and on
 * its way. The stores keep this much back from an armoury's smiths (army.ts,
 * food.ts), so a statue's or the Colossus's copper isn't hammered into armour
 * before the ox carts can take it; 0 with no site wanting any.
 *
 * (Merge of slice 58: shared between the stores.) Given a `store`, how much
 * of that is kept back in it: each site's want is met first from the store
 * nearest it (as the crow flies, then by id), then the next, so copper spread
 * over two stores keeps back only what is wanted in all, and the rest is the
 * smiths'. Sites are served in their own order, each from what the ones
 * before it left.
 */
export function sitesKeep(s: SimState, w: Ware, store?: Building): number {
  let n = 0;
  let mine = 0;
  let stores: Building[] | null = null;
  const left = new Map<number, number>();
  for (const x of s.monuments.sites) {
    if (x.finished) continue;
    const st = stagesOf(x);
    let need = 0;
    for (let i = x.building ? x.stage + 1 : x.stage; i < st.length; i++) need += needOf(st[i], w);
    if (need <= 0) continue;
    const b = s.buildings.find((y) => y.id === x.id);
    let have = b ? held(b, w) : 0;
    for (const k of s.walkers) if (k.kind === 'oxcart' && k.target === x.id && !k.back && k.food === w) have += k.load;
    const want = Math.max(0, need - have);
    n += want;
    if (!store || want <= 0 || !b) continue;
    stores ??= s.buildings.filter((g) => isStore(g.kind) && roomOf(g.kind, w) > 0 && held(g, w) > 0);
    const d2 = (g: Building): number => (g.x - b.x) * (g.x - b.x) + (g.z - b.z) * (g.z - b.z);
    let rest = want;
    for (const g of stores.slice().sort((p, q) => d2(p) - d2(q) || p.id - q.id)) {
      if (rest <= 0) break;
      const there = left.get(g.id) ?? held(g, w);
      const k = Math.min(there, rest);
      left.set(g.id, there - k);
      rest -= k;
      if (g.id === store.id) mine += k;
    }
  }
  return store ? mine : n;
}
