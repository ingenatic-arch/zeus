/**
 * The people who live in the homes: their names, ages and families, who
 * moves in and who moves away, and how they feel about it.
 *
 * Names, ages and where people came from are drawn from the state's own
 * `folk` generator (not the main one), so giving people names never changes
 * anything else that happens. A household's members always number exactly
 * its home's `people`.
 */
import { capacity, COTTAGE, HUT, TENT } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { nextInt, seedRng, type RngState } from './rng';
import type { Building, Family, Kin, Person, Service, SimState, Story } from './state';

/** Ordinary men's names of the Greek world. */
export const MEN = [
  'Nikias', 'Lykon', 'Kleon', 'Lysias', 'Demetrios', 'Philon', 'Theron', 'Glaukos', 'Ariston', 'Kallias',
  'Menon', 'Timon', 'Dion', 'Xanthos', 'Agathon', 'Alkimos', 'Amyntas', 'Antiphon', 'Archias', 'Chairephon',
  'Damon', 'Diokles', 'Dorotheos', 'Epikrates', 'Euthymos', 'Glaukon', 'Hermippos', 'Hieron', 'Kallikrates', 'Karpos',
  'Kimon', 'Kleitos', 'Kriton', 'Ktesias', 'Lysandros', 'Megakles', 'Melanthios', 'Mikon', 'Myron', 'Nikandros',
  'Pamphilos', 'Pasion', 'Phanias', 'Philippos', 'Philokles', 'Polemon', 'Praxias', 'Simon', 'Sosias', 'Stephanos',
  'Straton', 'Telekles', 'Theodoros', 'Thrasyllos', 'Timokles', 'Xenon', 'Zopyros', 'Doros', 'Eudemos', 'Aischron',
];

/** Ordinary women's names of the Greek world. */
export const WOMEN = [
  'Theano', 'Myrrhine', 'Agariste', 'Anthousa', 'Aristomache', 'Chrysis', 'Damaris', 'Demo', 'Doris', 'Eirene',
  'Elpis', 'Eukleia', 'Eunike', 'Glykera', 'Hegeso', 'Helike', 'Ione', 'Isidora', 'Kallisto', 'Kleio',
  'Korinna', 'Lampito', 'Melissa', 'Melitta', 'Nikarete', 'Pamphile', 'Phila', 'Philinna', 'Praxilla', 'Rhode',
  'Thaleia', 'Timarete', 'Xanthippe', 'Zoe', 'Hipparete', 'Archippe', 'Kleito', 'Mnesarete', 'Theodote', 'Krateia',
  'Arete', 'Charis', 'Eurydike', 'Hedyle', 'Iris', 'Kalliope', 'Lyra', 'Malthake', 'Nikasion', 'Olympias',
  'Pythias', 'Sostrate', 'Stratonike', 'Telesilla', 'Euboule', 'Philomela', 'Thais', 'Aspasia', 'Eupraxia', 'Glauke',
];

/** Where families come from. */
export const ORIGINS = [
  'Megara', 'Corinth', 'Argos', 'Thebes', 'Aegina', 'Chalcis', 'Eretria', 'Naxos', 'Samos', 'Miletus',
  'Chios', 'Paros', 'Sicyon', 'Phocis', 'a hill village in Arcadia', 'a fishing village on Euboea', 'Boeotia', 'Delphi', 'Rhodes', 'a farm near Sparta',
];

/** Story entries a household keeps. */
export const STORY_LENGTH = 8;

/** The generator for the people of a city with this seed (apart from the main one). */
export const folkRng = (seed: number): RngState => seedRng((seed ^ 0x5eed_f01c) >>> 0);

/** Someone's age in years. */
export const ageOf = (s: SimState, p: Person): number => Math.max(0, Math.floor((s.tick - p.born) / TICKS_PER_YEAR));

const pick = <T>(r: RngState, list: readonly T[]): T => list[nextInt(r, list.length)];

/** A name not already used in the household. */
function freshName(r: RngState, female: boolean, taken: readonly Person[]): string {
  const list = female ? WOMEN : MEN;
  let name = pick(r, list);
  for (let k = 0; k < 6 && taken.some((p) => p.name === name); k++) name = pick(r, list);
  return name;
}

function person(s: SimState, female: boolean, age: number, role: Kin, kin: string, taken: readonly Person[]): Person {
  const r = s.folk;
  const name = freshName(r, female, taken);
  const born = s.tick - age * TICKS_PER_YEAR - nextInt(r, TICKS_PER_YEAR);
  return { name, female, born, role, kin };
}

/**
 * A little family unit of `n` people, led by an adult who is the head of the
 * house (founding it) or the head's brother, sister or cousin (joining it):
 * then a partner of a similar age, then children, or now and then an elderly parent.
 */
function unit(s: SimState, n: number, taken: Person[], head: Person | null): Person[] {
  const r = s.folk;
  const out: Person[] = [];
  const all = (): Person[] => [...taken, ...out];
  const female = nextInt(r, 2) === 0;
  const age = 18 + nextInt(r, 38);
  let role: Kin = 'head';
  if (head) role = nextInt(r, 3) === 0 ? 'cousin' : female ? 'sister' : 'brother';
  const lead = person(s, female, age, role, head ? head.name : '', all());
  out.push(lead);
  if (out.length < n) out.push(person(s, !female, Math.max(17, age - 4 + nextInt(r, 9)), female ? 'husband' : 'wife', lead.name, all()));
  while (out.length < n) {
    // An elderly parent now and then, if the lead is old enough to have one about.
    if (age >= 28 && age <= 50 && nextInt(r, 4) === 0 && !out.some((p) => p.role === 'mother' || p.role === 'father')) {
      const mum = nextInt(r, 3) > 0;
      out.push(person(s, mum, Math.min(82, age + 20 + nextInt(r, 10)), mum ? 'mother' : 'father', lead.name, all()));
      continue;
    }
    const girl = nextInt(r, 2) === 0;
    out.push(person(s, girl, nextInt(r, Math.max(1, Math.min(16, age - 16))), girl ? 'daughter' : 'son', lead.name, all()));
  }
  return out;
}

/** Note something in a household's story, keeping the last few. */
export function tell(s: SimState, f: Family, what: Story['what'], level: number, names: string[] = [], need: '' | Service = ''): void {
  f.story.push({ tick: s.tick, what, need, level, names });
  if (f.story.length > STORY_LENGTH) f.story.splice(0, f.story.length - STORY_LENGTH);
}

/** People move in: the first to a plot found its household; later ones join it as kin. */
export function moveIn(s: SimState, b: Building, n: number): void {
  if (n <= 0) return;
  if (!b.family) {
    const r = s.folk;
    const members = unit(s, n, [], null);
    b.family = { name: members[0].name, origin: pick(r, ORIGINS), seed: nextInt(r, 0x7fffffff), members, story: [], warned: '' };
    tell(s, b.family, 'came', Math.max(b.level, TENT), members.map((p) => p.name));
    return;
  }
  const f = b.family;
  const joined = unit(s, n, f.members, f.members[0] ?? null);
  f.members.push(...joined);
  tell(s, f, 'joined', b.level, joined.map((p) => p.name));
}

/**
 * People move away: the most recent to come go first (children before their
 * parents, a partner before the one they came with), so the head of the
 * house is the last to leave. Returns who left.
 */
export function moveOut(s: SimState, b: Building, n: number): Person[] {
  const f = b.family;
  if (!f || n <= 0) return [];
  const gone = f.members.splice(Math.max(0, f.members.length - n), n).reverse();
  if (f.members.length === 0) b.family = null;
  else tell(s, f, 'left', b.level, gone.map((p) => p.name));
  return gone;
}

/** How someone is related, in a few words: "head of the house", "son of Lykos". */
export function kinship(p: Person): string {
  return p.role === 'head' ? 'head of the house' : `${p.role} of ${p.kin}`;
}

// ---------------------------------------------------------------------------
// Mood.

/** Moods, from worst to best. */
export const MOODS = ['Fed up', 'Unhappy', 'Worried', 'Getting by', 'Content'] as const;

export interface Mood {
  /** 0 fed up … 4 content. */
  level: number;
  word: (typeof MOODS)[number];
  /** What lifts or weighs on them, best first: good (+1), bad (-1) or just so (0). */
  reasons: Array<{ text: string; tone: -1 | 0 | 1 }>;
}

const span = (ticks: number): string => {
  const d = Math.max(1, Math.round(ticks / TICKS_PER_DAY));
  if (d > 60) return `${Math.round(d / 30)} months`;
  return d === 1 ? 'a day' : `${d} days`;
};

/** The last story entry of a kind, if any. */
const lastOf = (f: Family, what: Story['what']): Story | undefined => {
  for (let i = f.story.length - 1; i >= 0; i--) if (f.story[i].what === what) return f.story[i];
  return undefined;
};

/**
 * How a household feels, and why: what they have and lack, work, a recent
 * move up or down, and settling in. A pure reading of the home's state.
 * `ctx` says what the city offers (any agora at all, any jobs at all).
 */
export function moodOf(s: SimState, b: Building, ctx: { agora: boolean; jobs: boolean }, workable: number): Mood {
  const reasons: Array<{ text: string; w: number }> = [];
  const add = (w: number, text: string): void => void reasons.push({ text, w });
  const f = b.family;
  const wet = b.waterUntil > s.tick;
  const fed = b.foodUntil > s.tick;
  if (b.level >= HUT) {
    if (wet) add(1, 'Water close at hand');
    else {
      const dry = s.tick - Math.max(b.waterUntil, b.since);
      if (dry < WARN_AFTER) add(-1, `The water carrier is late (${span(dry)})`);
      else add(dry > TICKS_PER_MONTH ? -3 : -2, `No water for ${span(dry)}`);
    }
  } else if (b.level === TENT) {
    if (wet) add(1, 'Water at last: building a proper hut');
    else add(-1, 'No water nearby: fetching it from the river');
  }
  if (b.level >= COTTAGE) {
    if (fed) add(1, 'Bread on the table');
    else {
      const hungry = s.tick - Math.max(b.foodUntil, b.since);
      if (hungry < WARN_AFTER) add(-1, `The food vendor is late (${span(hungry)})`);
      else add(hungry > TICKS_PER_MONTH ? -3 : -2, `No bread for ${span(hungry)}`);
    }
  } else if (b.level === HUT) {
    if (fed) add(1, 'Bread from the market');
    else if (ctx.agora) add(-1, 'No bread: the food vendor hasn’t been by');
    else add(-1, 'No bread to be had: there’s no market yet');
  }
  if (workable > 0 && ctx.jobs) {
    if (b.workers >= workable) add(1, workable === 1 ? 'Has work' : 'Everyone who can work has work');
    else if (b.workers === 0) add(0, workable === 1 ? 'No work to be had nearby' : `No work nearby for the ${workable} who could work`);
    else add(0, `${b.workers} of the ${workable} who could work have work`);
  }
  if (f) {
    const up = lastOf(f, 'up');
    const down = lastOf(f, 'down');
    const recent = 3 * TICKS_PER_MONTH;
    if (down && s.tick - down.tick < recent && (!up || up.tick < down.tick)) add(-1, `Lost their ${down.level === HUT ? 'cottage' : 'hut'} lately`);
    else if (up && s.tick - up.tick < recent) add(1, `Moved up to a ${up.level >= COTTAGE ? 'cottage' : 'hut'} lately`);
    const came = f.story.find((e) => e.what === 'came');
    if (came && s.tick - came.tick < TICKS_PER_MONTH) add(1, 'Glad of a place of their own');
    if (b.people >= capacity(b) && b.level >= HUT) add(0, 'A full house');
  }
  let score = 0;
  for (const r of reasons) score += r.w;
  // A few days from giving up: as low as it goes.
  const warn = warningOf(s, b);
  if (warn && warn.left <= URGENT) {
    score -= 2;
    add(0, 'Packing up, unless something changes soon');
  }
  const level = score >= 2 ? 4 : score >= 0 ? 3 : score >= -2 ? 2 : score >= -4 ? 1 : 0;
  reasons.sort((a, b) => b.w - a.w);
  return { level, word: MOODS[level], reasons: reasons.map(({ text, w }) => ({ text, tone: w > 0 ? 1 : w < 0 ? -1 : 0 })) };
}

// ---------------------------------------------------------------------------
// Needs, warnings and decline (the rules live here so the panel, the tips and the sim agree).

/**
 * A need can be missing this long before the home warns (ten days: a water
 * carrier or a vendor a few days late is ordinary), and the warning lasts two
 * months before the home drops a level.
 */
export const WARN_AFTER = 10 * TICKS_PER_DAY;
export const WARNING = 2 * TICKS_PER_MONTH;
/** How long a level's need can be missing before the home drops a level. */
export const DECLINE_AFTER = WARN_AFTER + WARNING;
/** A hut needs at least this much bread in hand to become a cottage (a month). */
export const COTTAGE_FOOD_MIN = TICKS_PER_MONTH;
/** The last stretch of a warning, when the sign turns red and pulses. */
export const URGENT = 10 * TICKS_PER_DAY;

/**
 * The need a home's level is missing longest and since when, or null if it
 * has all it needs: 'water' or 'food' and the tick it ran out (or the home's
 * last change of level, if later).
 */
export function missingNeed(b: Building): { need: Service; since: number } | null {
  const now = (until: number): number => Math.max(until, b.since);
  let worst: { need: Service; since: number } | null = null;
  if (b.kind !== 'home') return null;
  if (b.level >= HUT) worst = { need: 'water', since: now(b.waterUntil) };
  if (b.level >= COTTAGE && (!worst || now(b.foodUntil) < worst.since)) worst = { need: 'food', since: now(b.foodUntil) };
  return worst;
}

/** A home's warning now: what it lacks, since when, and ticks left before it drops a level; null if it isn't warned (yet). */
export function warningOf(s: SimState, b: Building): { need: Service; since: number; left: number } | null {
  if (b.kind !== 'home' || b.level < HUT || b.people === 0) return null;
  const lack = missingNeed(b);
  if (!lack || s.tick - lack.since < WARN_AFTER) return null;
  return { need: lack.need, since: lack.since, left: Math.max(0, DECLINE_AFTER - (s.tick - lack.since)) };
}

/** What a home needs to go up a level that it doesn't have now ('' if nothing, or it can't go higher yet). */
export function wantOf(s: SimState, b: Building): '' | Service {
  if (b.kind !== 'home' || b.people === 0) return '';
  if (b.level === TENT) return b.waterUntil > s.tick ? '' : 'water';
  if (b.level === HUT) return b.foodUntil - s.tick >= COTTAGE_FOOD_MIN ? '' : 'food';
  return '';
}
