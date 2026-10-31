/**
 * The twelve (phase 7 groundwork, the first stage of slice 53): who the gods
 * of Olympus are, the monsters some of them send and the heroes who slay
 * them, Greece's patron gods, and the gods' moods towards your city.
 *
 * - **The table.** Each god has a name, an epithet, what they are god of, a
 *   colour (to tell the twelve apart in the original look), an emblem that
 *   later slices draw, what they love and hate in words, a rival (six pairs,
 *   each the other's), a sacred good (one of the wares that already exist)
 *   and, for seven of them, a monster. `GOD_IDS` is in a fixed order, kept
 *   forever: new gods (there are none planned) would only be appended.
 * - **Moods.** A god's mood towards you is made the way a ruler's is
 *   (world.ts): a sum of memories, each with its reason, its amount, when it
 *   happened and how long it takes to fade (memory.ts), clamped to -100..100
 *   and said as one of seven words (GOD_MOODS). Gods start watchful (0).
 *   There is nothing standing besides memories: a slice that wants something
 *   to count while it lasts (a shrine, a sanctuary, full granaries) re-asserts
 *   it, monthly or as it changes, with `assert`, which replaces the memory of
 *   that kind and reason instead of stacking it (amount 0 forgets it).
 * - **Keeping the lists small.** `honour` merges a memory into one of the same
 *   kind and reason (what the old one is worth now plus the new amount, kept
 *   within -100..100, from now, with the new fade), so a stream of offerings
 *   is one reason that grows. Memories that have faded to nothing are dropped
 *   once a day (stepGods). Past MEMORY_CAP (24) a god's list drops what is
 *   worth least now (the oldest of equals) to make room.
 * - **Noticed.** A new city is beneath the gods' notice until it has had
 *   NOTICE_PEOPLE (300) people; the tick it first had them is kept, so it
 *   never flips back when people leave. Wrath, neglect and monsters wait for
 *   it (later slices read `noticed`).
 * - **The switch** (`gods.on`): off in a bare state and while a demo's history
 *   is played (so no history changes), on as a game starts or a demo opens,
 *   and in an older save loaded, exactly as the ambitions' is. With it off
 *   nothing here moves; nothing in the city reads the gods yet.
 *
 * Every line reads and writes moods only through this API (honour, assert,
 * moodOfGod, reasonsOf, moodWord, noticed). Olympus (slices 53 and 57) owns
 * the mood maths; the other lines add only functions, in their own blocks
 * headed by their slice at the end of this file.
 *
 * Pure: nothing here draws a random number. It imports only leaf modules
 * (the clock, the wares and the fading maths), so it changes no module's
 * load order (see laurels.ts).
 */
import type { CityId } from '../map/greece';
import { TICKS_PER_DAY } from './clock';
import { ARMOUR, CHEESE, COPPER, FLEECE, HORSES, MEAT, OIL, WHEAT, WINE, type Ware } from './foods';
import { memoryWorth } from './memory';
import type { Memory, SimState } from './state';

// ---------------------------------------------------------------------------
// The twelve.

export type GodId = 'zeus' | 'hera' | 'poseidon' | 'demeter' | 'athena' | 'apollo' | 'artemis' | 'ares' | 'aphrodite' | 'hephaestus' | 'hermes' | 'dionysus';
/** The twelve, in a fixed order (append only). */
export const GOD_IDS: readonly GodId[] = ['zeus', 'hera', 'poseidon', 'demeter', 'athena', 'apollo', 'artemis', 'ares', 'aphrodite', 'hephaestus', 'hermes', 'dionysus'];

/** What later slices draw for a god (on cards, statues, banners). */
export type Emblem = 'thunderbolt' | 'peacock' | 'trident' | 'sheaf' | 'owl' | 'lyre' | 'bow' | 'spear' | 'dove' | 'hammer' | 'caduceus' | 'vine';

export interface God {
  name: string;
  /** "the cloud-gatherer". */
  epithet: string;
  /** What they are god of: "the harvest". */
  of: string;
  /** Their colour (0xrrggbb): their glow, their priestess's robe, their card. */
  colour: number;
  emblem: Emblem;
  /** What they love and hate, in short phrases for the panel. */
  loves: readonly string[];
  hates: readonly string[];
  /** The god who minds when you honour this one (each is the other's rival). */
  rival: GodId;
  /** Their sacred good (a ware): offerings, festivals, a sanctuary's consecration. */
  sacred: Ware;
  /** The monster they send in wrath, if they have one. */
  monster: MonsterId | null;
  /** What they do in wrath, and in blessing, in a line (for panels before slice 57 makes them real). */
  curseWords: string;
  blessWords: string;
}

export const GODS: Record<GodId, God> = {
  zeus: {
    name: 'Zeus',
    epithet: 'the cloud-gatherer',
    of: 'the sky, kings and oaths',
    colour: 0xf3e4a6,
    emblem: 'thunderbolt',
    loves: ['promises kept', 'justice', 'guests', 'a great city'],
    hates: ['oaths broken', 'a city without a court'],
    rival: 'demeter',
    sacred: MEAT,
    monster: 'minotaur',
    curseWords: 'Lightning strikes a few buildings, which catch fire.',
    blessWords: 'A great gift of coin from the sky’s treasury, and his lightning strikes any raiders on your map.',
  },
  hera: {
    name: 'Hera',
    epithet: 'the queen of heaven',
    of: 'marriage and the home',
    colour: 0x1f78a8,
    emblem: 'peacock',
    loves: ['big families', 'loyal colonies and vassals'],
    hates: ['broken promises', 'a city that honours Dionysus over her'],
    rival: 'dionysus',
    sacred: FLEECE,
    monster: 'hydra',
    curseWords: 'The Hydra comes, and families quarrel and some leave the city.',
    blessWords: 'Every colony’s and vassal’s loyalty rises, and homes have more children.',
  },
  poseidon: {
    name: 'Poseidon',
    epithet: 'the earth-shaker',
    of: 'the sea and earthquakes',
    colour: 0x2a9d84,
    emblem: 'trident',
    loves: ['ships', 'the quay', 'triremes', 'sea trade'],
    hates: ['a city that turns its back on the sea', 'honours to Athena'],
    rival: 'athena',
    sacred: HORSES,
    monster: 'cyclops',
    curseWords: 'An earthquake by the shore, a ship lost at sea with her cargo, or the Cyclops.',
    blessWords: 'Fair seas for a year, and an earth tremor that clears the rubble.',
  },
  demeter: {
    name: 'Demeter',
    epithet: 'the giver of grain',
    of: 'the harvest',
    colour: 0xc8963c,
    emblem: 'sheaf',
    loves: ['full granaries', 'farms', 'bread on every table'],
    hates: ['hunger', 'fields left idle'],
    rival: 'zeus',
    sacred: WHEAT,
    monster: null,
    curseWords: 'Blight on the fields for a season, and a granary’s grain rots.',
    blessWords: 'Every farm yields double for a season.',
  },
  athena: {
    name: 'Athena',
    epithet: 'the grey-eyed',
    of: 'wisdom, craft and war won well',
    colour: 0x7d8f8a,
    emblem: 'owl',
    loves: ['olives', 'theatres', 'a court', 'wars won'],
    hates: ['foolish wars', 'honours to Poseidon'],
    rival: 'poseidon',
    sacred: OIL,
    monster: 'medusa',
    curseWords: 'Medusa comes, or the olives fail for a year.',
    blessWords: 'Olive groves yield double for a season, and crime falls as people grow wise.',
  },
  apollo: {
    name: 'Apollo',
    epithet: 'the far-shooter',
    of: 'light, music and healing',
    colour: 0xffcf2e,
    emblem: 'lyre',
    loves: ['theatres', 'physicians', 'a healthy city'],
    hates: ['plague left to spread', 'honours to Hermes'],
    rival: 'hermes',
    sacred: WINE,
    monster: null,
    curseWords: 'Plague from his arrows, in the quarter he names.',
    blessWords: 'Every sick home is healed, and a plague ends at once.',
  },
  artemis: {
    name: 'Artemis',
    epithet: 'the huntress',
    of: 'the wild and the hunt',
    colour: 0xc4d0e4,
    emblem: 'bow',
    loves: ['woods', 'wild herds left to breed'],
    hates: ['herds hunted thin', 'honours to Aphrodite'],
    rival: 'aphrodite',
    sacred: MEAT,
    monster: 'boar',
    curseWords: 'The Calydonian Boar comes, and the herds vanish from the hills.',
    blessWords: 'The wild herds swell, and hunters bring home double.',
  },
  ares: {
    name: 'Ares',
    epithet: 'the sacker of cities',
    of: 'war',
    colour: 0xa61e24,
    emblem: 'spear',
    loves: ['battles fought and won', 'a big army'],
    hates: ['a city that pays tribute', 'honours to Hephaestus'],
    rival: 'hephaestus',
    sacred: ARMOUR,
    monster: 'chimera',
    curseWords: 'The Chimera comes, or brawls and fires break out in the barracks and soldiers desert.',
    blessWords: 'Every company is filled and armoured for free.',
  },
  aphrodite: {
    name: 'Aphrodite',
    epithet: 'the foam-born',
    of: 'love and beauty',
    colour: 0xe8799b,
    emblem: 'dove',
    loves: ['happy homes', 'grand estates', 'festivals'],
    hates: ['misery', 'executions', 'honours to Artemis'],
    rival: 'artemis',
    sacred: WINE,
    monster: null,
    curseWords: 'Households break up in quarrels, and moods fall across the city.',
    blessWords: 'Every home’s mood rises for a season, and settlers come twice as often.',
  },
  hephaestus: {
    name: 'Hephaestus',
    epithet: 'the lame smith',
    of: 'the forge',
    colour: 0xe2672a,
    emblem: 'hammer',
    loves: ['armouries', 'mines', 'quarries', 'monuments'],
    hates: ['fires left to burn', 'honours to Ares'],
    rival: 'ares',
    sacred: COPPER,
    monster: 'talos',
    curseWords: 'Talos comes, or fires break out in the workshops.',
    blessWords: 'The armouries and the masons work double for a season, and fires go out.',
  },
  hermes: {
    name: 'Hermes',
    epithet: 'the swift messenger',
    of: 'travellers, trade and thieves',
    colour: 0x58c6e6,
    emblem: 'caduceus',
    loves: ['routes', 'caravans', 'trade'],
    hates: ['closed roads', 'quarantine', 'honours to Apollo'],
    rival: 'apollo',
    sacred: CHEESE,
    monster: null,
    curseWords: 'Thieves everywhere for a season, and a caravan lost on the road.',
    blessWords: 'Your prices are better for a season, and caravans and porters walk quicker.',
  },
  dionysus: {
    name: 'Dionysus',
    epithet: 'the twice-born',
    of: 'wine, theatre and revels',
    colour: 0x7b2d72,
    emblem: 'vine',
    loves: ['vineyards', 'wineries', 'theatres', 'festivals'],
    hates: ['sober cities', 'honours to Hera'],
    rival: 'hera',
    sacred: WINE,
    monster: null,
    curseWords: 'A drunken riot (vandals across a quarter), and the wine sours in the stores.',
    blessWords: 'The wineries yield double, and a free festival for every home.',
  },
};

// ---------------------------------------------------------------------------
// Monsters and heroes (slices 55 and 59 make them real).

export type MonsterId = 'hydra' | 'medusa' | 'cyclops' | 'minotaur' | 'chimera' | 'talos' | 'boar';
export const MONSTER_IDS: readonly MonsterId[] = ['hydra', 'medusa', 'cyclops', 'minotaur', 'chimera', 'talos', 'boar'];
/** Where a monster makes its lair: a cave on a hillside, a marsh, a rocky shore. */
export type Lair = 'cave' | 'marsh' | 'shore';

export interface Monster {
  name: string;
  /** The god who sends it. */
  god: GodId;
  /** The hero who slays it (Heracles slays any). */
  hero: HeroId;
  lair: Lair;
  /** What it goes for when it raids, in words. */
  targets: string;
}

export const MONSTERS: Record<MonsterId, Monster> = {
  hydra: { name: 'the Hydra', god: 'hera', hero: 'heracles', lair: 'marsh', targets: 'homes by the water' },
  medusa: { name: 'Medusa', god: 'athena', hero: 'perseus', lair: 'cave', targets: 'busy streets, where she turns walkers to stone' },
  cyclops: { name: 'the Cyclops', god: 'poseidon', hero: 'odysseus', lair: 'shore', targets: 'the quay and the ships' },
  minotaur: { name: 'the Minotaur', god: 'zeus', hero: 'theseus', lair: 'cave', targets: 'homes and the agora' },
  chimera: { name: 'the Chimera', god: 'ares', hero: 'bellerophon', lair: 'cave', targets: 'the barracks and the fields, burning as it goes' },
  talos: { name: 'Talos', god: 'hephaestus', hero: 'jason', lair: 'shore', targets: 'the walls and the armouries' },
  boar: { name: 'the Calydonian Boar', god: 'artemis', hero: 'atalanta', lair: 'marsh', targets: 'the fields and the herds' },
};

export type HeroId = 'heracles' | 'perseus' | 'theseus' | 'odysseus' | 'bellerophon' | 'jason' | 'atalanta';
export const HERO_IDS: readonly HeroId[] = ['heracles', 'perseus', 'theseus', 'odysseus', 'bellerophon', 'jason', 'atalanta'];

export interface Hero {
  name: string;
  epithet: string;
  /** The monsters they slay (Heracles: all of them). */
  slays: readonly MonsterId[];
  /** What they want before they come, in words (slice 59 makes them real). */
  demands: readonly string[];
}

export const HEROES: Record<HeroId, Hero> = {
  heracles: { name: 'Heracles', epithet: 'the son of Zeus', slays: MONSTER_IDS, demands: ['a sanctuary to Zeus', '2,000 people', 'a full granary'] },
  perseus: { name: 'Perseus', epithet: 'the Gorgon-slayer', slays: ['medusa'], demands: ['Athena warm', 'a sanctuary to Athena'] },
  theseus: { name: 'Theseus', epithet: 'the king of Athens', slays: ['minotaur'], demands: ['a court', 'a city of fine houses'] },
  odysseus: { name: 'Odysseus', epithet: 'the man of many turns', slays: ['cyclops'], demands: ['six triremes', 'a sanctuary to Athena'] },
  bellerophon: { name: 'Bellerophon', epithet: 'the rider of Pegasus', slays: ['chimera'], demands: ['a horse farm', 'twenty horsemen'] },
  jason: { name: 'Jason', epithet: 'of the Argo', slays: ['talos'], demands: ['a shipyard', 'three trade routes'] },
  atalanta: { name: 'Atalanta', epithet: 'the swift huntress', slays: ['boar'], demands: ['Artemis warm', 'three hunting lodges'] },
};

// ---------------------------------------------------------------------------
// Greece's patron gods (slice 58 shows them; slice 60 marches them).

/** Each ruled city's patron god. Memphis keeps its own gods; your city has none (it chooses whom to honour). */
export const PATRONS: Partial<Record<CityId, GodId>> = {
  athens: 'athena',
  sparta: 'ares',
  corinth: 'poseidon',
  troy: 'apollo',
  thebes: 'dionysus',
  argos: 'hera',
  knossos: 'zeus',
  rhodes: 'hermes',
};

/** A city's patron god, or null. */
export const patronOf = (city: CityId): GodId | null => PATRONS[city] ?? null;

// ---------------------------------------------------------------------------
// The state: the slice's one top-level field.

export interface Gods {
  /** The switch (see the notes at the top). */
  on: boolean;
  /** The tick the city first had NOTICE_PEOPLE people (-1: not yet). */
  noticedAt: number;
  /** Each god's memories of your city, by god. */
  memories: Record<GodId, Memory[]>;
  // Slice 53: worship (worship.ts).
  /** Festivals announced or under way (one per god at most). */
  festivals: Festival[];
  /** When each god was last honoured by worship (a shrine, a festival, an offering; later a sanctuary), absent never: for neglect. */
  worshipped: Partial<Record<GodId, number>>;
  /** The day each god's last festival began (its procession set out), absent never. */
  lastFestival: Partial<Record<GodId, number>>;
  /** Each god's mood at the start of each month, oldest first, at most MOOD_MONTHS (absent until the first month the gods watch: small saves). */
  months: Partial<Record<GodId, number[]>>;
  /** The month (since the founding) the last figures were kept for (-1: none yet). */
  month: number;
  /** Homes a procession passed (by building id): [the tick, the god's index in GOD_IDS], glad for a season. */
  festive: Record<string, [number, number]>;
}

/** Slice 53: a festival at home (worship.ts): announced a month ahead, then its procession walks. */
export interface Festival {
  god: GodId;
  /** The shrine it is held at (a building id). */
  shrine: number;
  /** When it was announced, and the day its procession sets out. */
  at: number;
  day: number;
  /** Its procession (a walker id; 0 before it sets out). */
  walker: number;
}

/** Slice 53: how many months of moods the record keeps (the overview's two years). */
export const MOOD_MONTHS = 24;

export function freshGods(on = false, noticedAt = -1): Gods {
  const memories = {} as Record<GodId, Memory[]>;
  for (const g of GOD_IDS) memories[g] = [];
  // (Slice 53: worship's record, empty.)
  return { on, noticedAt, memories, festivals: [], worshipped: {}, lastFestival: {}, months: {}, month: -1, festive: {} };
}

/** How many people a city needs before the gods notice it. */
export const NOTICE_PEOPLE = 300;
/** The most memories a god keeps (see the notes at the top). */
export const MEMORY_CAP = 24;
/** A god's mood is kept within this, either way. */
export const MOOD_LIMIT = 100;

const clampMood = (n: number): number => Math.max(-MOOD_LIMIT, Math.min(MOOD_LIMIT, n));

// ---------------------------------------------------------------------------
// The mood API: the only way any line reads or writes a god's mood.

/**
 * A god remembers something: `amount` (+ honours, - offends) for `why` ("your
 * shrine to Demeter"), of a `kind` ('shrine', 'festival', 'offering',
 * 'neglect', 'staged'...), fading to nothing over `fade` ticks (0: never).
 * One of the same kind and reason is merged into (see the notes at the top).
 * Rivalry is NOT here: slice 53 adds it (honouring a god gives their rival a
 * memory against you), in its own function that calls this one.
 */
export function honour(s: SimState, god: GodId, amount: number, kind: string, why: string, fade: number): void {
  const list = s.gods.memories[god];
  const at = list.findIndex((m) => m.kind === kind && m.why === why);
  if (at >= 0) {
    const old = list[at];
    list.splice(at, 1);
    amount += memoryWorth(old, s.tick);
  }
  list.push({ kind, why, amount: clampMood(amount), tick: s.tick, fade });
  trim(list, s.tick);
}

/**
 * Something that counts while it lasts (a shrine standing, full granaries):
 * replaces the memory of that kind and reason, never stacking, from now.
 * `fade` 0 (the default) keeps it until it is asserted again; a fade a
 * little longer than how often it is asserted lets it lapse by itself once
 * it stops. An amount of 0 forgets it.
 */
export function assert(s: SimState, god: GodId, kind: string, why: string, amount: number, fade = 0): void {
  const list = s.gods.memories[god];
  const at = list.findIndex((m) => m.kind === kind && m.why === why);
  if (at >= 0) list.splice(at, 1);
  if (amount === 0) return;
  list.push({ kind, why, amount: clampMood(amount), tick: s.tick, fade });
  trim(list, s.tick);
}

/** Past MEMORY_CAP, drop what is worth least now (the oldest of equals). */
function trim(list: Memory[], tick: number): void {
  while (list.length > MEMORY_CAP) {
    let worst = 0;
    for (let i = 1; i < list.length; i++) {
      const a = Math.abs(memoryWorth(list[i], tick));
      const w = Math.abs(memoryWorth(list[worst], tick));
      if (a < w || (a === w && list[i].tick < list[worst].tick)) worst = i;
    }
    list.splice(worst, 1);
  }
}

/** A god's mood towards your city now, -100 to 100: what their memories are worth now. */
export function moodOfGod(s: SimState, god: GodId): number {
  let n = 0;
  for (const m of s.gods.memories[god]) n += memoryWorth(m, s.tick);
  return clampMood(n);
}

/** One reason for a god's mood as the panel shows it: "+18 your sanctuary to Demeter". */
export interface GodReason {
  worth: number;
  why: string;
  kind: string;
  /** Does it fade? */
  fading: boolean;
  /** When it was remembered (or last asserted). */
  tick: number;
}

/** The reasons for a god's mood, largest first (by how much they weigh either way; the newest of equals first); none worth nothing now. */
export function reasonsOf(s: SimState, god: GodId): GodReason[] {
  return s.gods.memories[god]
    .map((m) => ({ worth: memoryWorth(m, s.tick), why: m.why, kind: m.kind, fading: m.fade > 0, tick: m.tick }))
    .filter((r) => r.worth !== 0)
    .sort((a, b) => Math.abs(b.worth) - Math.abs(a.worth) || b.tick - a.tick);
}

export type GodMood = 'furious' | 'angry' | 'displeased' | 'watchful' | 'pleased' | 'warm' | 'loving';
/** The seven words, from the worst, each with the lowest mood it is said of. */
export const GOD_MOODS: ReadonlyArray<{ word: GodMood; from: number }> = [
  { word: 'furious', from: -MOOD_LIMIT },
  { word: 'angry', from: -60 },
  { word: 'displeased', from: -30 },
  { word: 'watchful', from: -10 },
  { word: 'pleased', from: 10 },
  { word: 'warm', from: 30 },
  { word: 'loving', from: 60 },
];

/** Where a mood stands from furious (0) to loving (6). */
export function moodRank(n: number): number {
  let r = 0;
  for (let i = 1; i < GOD_MOODS.length; i++) if (n >= GOD_MOODS[i].from) r = i;
  return r;
}

/** A god's mood in a word. */
export const moodWord = (n: number): GodMood => GOD_MOODS[moodRank(n)].word;

/** Is a mood at least this word ("warm or better")? */
export const moodAtLeast = (n: number, word: GodMood): boolean => moodRank(n) >= GOD_MOODS.findIndex((m) => m.word === word);

/** Has the city ever had enough people for the gods to notice it? (It never stops being noticed.) */
export const noticed = (s: SimState): boolean => s.gods.noticedAt >= 0;

// ---------------------------------------------------------------------------
// The switch and the step.

/** Switch the gods on or off (a command). Switched on, a city of NOTICE_PEOPLE or more is noticed at once. */
export function setGods(s: SimState, on: boolean): void {
  if (s.gods.on === on) return;
  s.gods.on = on;
  if (on) notice(s);
}

function notice(s: SimState): void {
  if (s.gods.noticedAt < 0 && s.population >= NOTICE_PEOPLE) s.gods.noticedAt = s.tick;
}

/** Once a tick: the city noticed when it has the people; once a day, faded memories forgotten (nothing with the switch off). */
export function stepGods(s: SimState): void {
  if (!s.gods.on) return;
  notice(s);
  if (s.tick % TICKS_PER_DAY !== 0) return;
  for (const g of GOD_IDS) {
    const list = s.gods.memories[g];
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i];
      if (m.fade > 0 && s.tick - m.tick >= m.fade) list.splice(i, 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Slice 53: the mood maths that worship.ts needs (the Olympus line's).

/** Forget every memory of a kind a god has (a reading of the city that no longer holds). */
export function forget(s: SimState, god: GodId, kind: string): void {
  const list = s.gods.memories[god];
  for (let i = list.length - 1; i >= 0; i--) if (list[i].kind === kind) list.splice(i, 1);
}

/**
 * Something standing whose words may change ("your 2 shrines to Demeter",
 * "bread on 9 tables in 10"): the one memory of its kind, replaced whatever
 * its old words were; 0 forgets it.
 */
export function setStanding(s: SimState, god: GodId, kind: string, why: string, amount: number): void {
  const list = s.gods.memories[god];
  const at = list.findIndex((m) => m.kind === kind);
  if (at >= 0 && list[at].why === why && list[at].amount === amount && list[at].fade === 0) return;
  forget(s, god, kind);
  assert(s, god, kind, why, amount);
}

/** A god's words: she or he. */
export const FEMALE: ReadonlySet<GodId> = new Set<GodId>(['hera', 'demeter', 'athena', 'artemis', 'aphrodite']);
export const herOf = (g: GodId): string => (FEMALE.has(g) ? 'her' : 'his');

/** How long a home a procession passed stays glad (a season), and how glad. */
export const FESTIVE_LASTS = 90 * TICKS_PER_DAY;
export const FESTIVE_MOOD = 2;

/** A home's mood from a festival's procession passing its door this season (folk.ts reads it), or null. */
export function festiveMood(s: SimState, homeId: number): { w: number; text: string } | null {
  const f = s.gods?.festive?.[homeId];
  if (!f || s.tick - f[0] >= FESTIVE_LASTS) return null;
  const g = GOD_IDS[f[1]];
  return g ? { w: FESTIVE_MOOD, text: `The procession for ${GODS[g].name} passed their door` } : null;
}
