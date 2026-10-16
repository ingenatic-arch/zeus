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
  'Theano', 'Myrrhine', 'Agariste', 'Anthousa', 'Aristomache', 'Chrysis', 'Damaris', 'Nikippe', 'Doris', 'Eirene',
  'Elpis', 'Eukleia', 'Eunike', 'Glykera', 'Hegeso', 'Helike', 'Ione', 'Isidora', 'Kallisto', 'Kleio',
  'Korinna', 'Lampito', 'Melissa', 'Melitta', 'Nikarete', 'Pamphile', 'Phila', 'Philinna', 'Praxilla', 'Rhode',
  'Thaleia', 'Timarete', 'Xanthippe', 'Zoe', 'Hipparete', 'Archippe', 'Kleito', 'Mnesarete', 'Theodote', 'Krateia',
  'Arete', 'Charis', 'Eurydike', 'Hedyle', 'Iris', 'Kalliope', 'Kallippe', 'Malthake', 'Nikasion', 'Olympias',
  'Pythias', 'Sostrate', 'Stratonike', 'Telesilla', 'Euboule', 'Philomela', 'Thais', 'Aspasia', 'Eupraxia', 'Glauke',
];

/** Where families come from. */
export const ORIGINS = [
  'Megara', 'Corinth', 'Argos', 'Thebes', 'Aegina', 'Chalcis', 'Eretria', 'Naxos', 'Samos', 'Miletus',
  'Chios', 'Paros', 'Sicyon', 'Phocis', 'a hill village in Arcadia', 'a fishing village on Euboea', 'Boeotia', 'Delphi', 'Rhodes', 'the hills of Laconia',
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
  // A brother, sister or cousin of the head is of much the head's generation.
  const age = head ? Math.max(17, Math.min(70, ageOf(s, head) - 14 + nextInt(r, 29))) : 18 + nextInt(r, 38);
  let role: Kin = 'head';
  if (head) role = nextInt(r, 3) === 0 ? 'cousin' : female ? 'sister' : 'brother';
  const lead = person(s, female, age, role, head ? head.name : '', all());
  out.push(lead);
  if (out.length < n) out.push(person(s, !female, Math.max(17, age - 4 + nextInt(r, 9)), female ? 'husband' : 'wife', lead.name, all()));
  while (out.length < n) {
    // An elderly parent now and then, if the lead is old enough to have one about (a brother or
    // sister of the head shares the head's parents, who would have come with the head).
    if (role !== 'brother' && role !== 'sister' && age >= 28 && age <= 50 && nextInt(r, 4) === 0 && !out.some((p) => p.role === 'mother' || p.role === 'father')) {
      const mum = nextInt(r, 3) > 0;
      out.push(person(s, mum, Math.min(82, age + 20 + nextInt(r, 10)), mum ? 'mother' : 'father', lead.name, all()));
      continue;
    }
    const girl = nextInt(r, 2) === 0;
    // Children born while the lead was between about 17 and 44 (so an older lead's are grown).
    const youngest = Math.max(0, age - 44);
    const eldest = Math.max(youngest + 1, Math.min(age - 16, youngest + 18));
    out.push(person(s, girl, youngest + nextInt(r, eldest - youngest), girl ? 'daughter' : 'son', lead.name, all()));
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
    b.family = { name: members[0].name, origin: pick(r, ORIGINS), came: s.tick, seed: nextInt(r, 0x7fffffff), members, story: [], warned: [] };
    tell(s, b.family, 'came', Math.max(b.level, TENT), members.map((p) => p.name));
    return;
  }
  const f = b.family;
  const joined = unit(s, n, f.members, f.members[0] ?? null);
  f.members.push(...joined);
  tell(s, f, 'joined', b.level, joined.map((p) => p.name));
}

/** A household's members by family unit: [first, end) index ranges, the head's unit first. */
function unitsOf(f: Family): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  f.members.forEach((p, i) => {
    if (p.role === 'head' || p.role === 'brother' || p.role === 'sister' || p.role === 'cousin') {
      if (out.length) out[out.length - 1][1] = i;
      out.push([i, f.members.length]);
    }
  });
  return out;
}

/** Old enough to go off on their own. */
const GROWN = 16;

/**
 * Who leaves when at least `n` people must: whole families who joined the
 * household (a brother, sister or cousin with their partner and children),
 * and grown children or an elderly parent on their own, never the head of
 * the house, and never a partner or a young child without the rest of their
 * family. Exactly `n` if that can be done; if not, the fewest more (a family
 * goes together rather than leave a child behind). The newest arrivals are
 * the first to go. Returns groups of member indices (each group leaves
 * together), or [] for none. Pure.
 */
export function leavingGroups(s: SimState, f: Family, n: number): number[][] {
  if (n <= 0) return [];
  const units = unitsOf(f);
  const groups: Array<{ idx: number[]; unit: number; single: boolean }> = [];
  units.forEach(([a, b], u) => {
    if (u > 0) groups.push({ idx: Array.from({ length: b - a }, (_, k) => a + k), unit: u, single: false });
    for (let i = a + 1; i < b; i++) {
      const p = f.members[i];
      const alone = ((p.role === 'son' || p.role === 'daughter') && ageOf(s, p) >= GROWN) || p.role === 'mother' || p.role === 'father';
      if (alone) groups.push({ idx: [i], unit: u, single: true });
    }
  });
  // At most a dozen choices (a household holds 13): try every combination, best first.
  const g = groups.slice(-12);
  let best: number[][] | null = null;
  let bestCost = Infinity;
  for (let mask = 1; mask < 1 << g.length; mask++) {
    let count = 0;
    let cost = 0;
    const whole = new Set<number>();
    const singles: number[] = [];
    for (let k = 0; k < g.length; k++) {
      if (!(mask & (1 << k))) continue;
      count += g[k].idx.length;
      if (g[k].single) singles.push(g[k].unit);
      else whole.add(g[k].unit);
      // Newer families and people go first; singles only when a whole family won't do.
      cost += (units.length - g[k].unit) * 2 + (g[k].single ? 15 : 0);
    }
    if (count < n || singles.some((u) => whole.has(u))) continue;
    cost += (count - n) * 1000;
    if (cost < bestCost) {
      bestCost = cost;
      best = [];
      for (let k = 0; k < g.length; k++) if (mask & (1 << k)) best.push(g[k].idx);
    }
  }
  // Nobody can go without breaking up a family (it can't happen: the head's own family always fits in a tent): the newest leave.
  if (!best) return [Array.from({ length: Math.min(n, f.members.length - 1) }, (_, k) => f.members.length - 1 - k)];
  return best.sort((x, y) => y[0] - x[0]);
}

/**
 * At least `n` people move away (see `leavingGroups`), the story naming each
 * group. Returns who left.
 */
export function moveOut(s: SimState, b: Building, n: number): Person[] {
  const f = b.family;
  if (!f || n <= 0) return [];
  const groups = leavingGroups(s, f, n);
  const going = new Set(groups.flat());
  for (const grp of groups) tell(s, f, 'left', b.level, grp.map((i) => f.members[i].name));
  const gone = f.members.filter((_, i) => going.has(i));
  f.members = f.members.filter((_, i) => !going.has(i));
  if (f.members.length === 0) b.family = null;
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
  /** What lifts or weighs on them, what matters most first: good (+1), bad (-1) or just so (0). */
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
      // How long it has really been gone (a home that moved down without it has gone without for longer than its level).
      const dry = s.tick - b.waterUntil;
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
      const hungry = s.tick - b.foodUntil;
      if (hungry < WARN_AFTER) add(-1, `The food vendor is late (${span(hungry)})`);
      else add(hungry > TICKS_PER_MONTH ? -3 : -2, `No bread for ${span(hungry)}`);
    }
  } else if (b.level === HUT) {
    if (fed) add(1, 'Bread from the market');
    else if (ctx.agora) add(-1, 'No bread from the market');
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
    if (s.tick - f.came < TICKS_PER_MONTH) add(1, 'Glad of a place of their own');
    if (b.people >= capacity(b) && b.level >= HUT) add(0, 'A full house');
  }
  // A few days from giving up: as low as it goes.
  const warn = warningOf(s, b);
  if (warn && warn.left <= URGENT) add(-2, 'Packing up, unless something changes soon');
  let score = 0;
  for (const r of reasons) score += r.w;
  const level = score >= 2 ? 4 : score >= 0 ? 3 : score >= -2 ? 2 : score >= -4 ? 1 : 0;
  // What matters most to how they feel comes first (the worst for a glum house, the best for a glad one); what is just so, last.
  const glum = score < 0;
  reasons.sort((a, b) => (a.w === 0 ? 1 : 0) - (b.w === 0 ? 1 : 0) || (glum ? a.w - b.w : b.w - a.w));
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

/** The needs a home's level has (a hut water; a cottage water and bread). */
export function needsOf(b: Building): Service[] {
  if (b.kind !== 'home') return [];
  if (b.level >= COTTAGE) return ['water', 'food'];
  if (b.level >= HUT) return ['water'];
  return [];
}

/**
 * Since when a need of a home's level has been missing: the tick it ran out
 * (in the future while it still has it), or the home's last change of level,
 * if later.
 */
export function missingSince(b: Building, need: Service): number {
  const until = need === 'water' ? b.waterUntil : b.foodUntil;
  return Math.max(until, b.since);
}

/**
 * The need a home's level is missing longest and since when, or null if it
 * has all it needs: 'water' or 'food' and the tick it ran out (or the home's
 * last change of level, if later).
 */
export function missingNeed(b: Building): { need: Service; since: number } | null {
  let worst: { need: Service; since: number } | null = null;
  for (const need of needsOf(b)) {
    const since = missingSince(b, need);
    if (!worst || since < worst.since) worst = { need, since };
  }
  return worst;
}

export interface Warning {
  need: Service;
  since: number;
  /** Ticks left before the home drops a level for want of it. */
  left: number;
}

/**
 * Every need a home is warning about now (missing for longer than the
 * grace), the most urgent first; empty if none. A home drops a level when
 * the first of them runs out of time.
 */
export function warningsOf(s: SimState, b: Building): Warning[] {
  if (b.kind !== 'home' || b.level < HUT || b.people === 0) return [];
  const out: Warning[] = [];
  for (const need of needsOf(b)) {
    const since = missingSince(b, need);
    if (since > s.tick || s.tick - since < WARN_AFTER) continue;
    out.push({ need, since, left: Math.max(0, DECLINE_AFTER - (s.tick - since)) });
  }
  return out.sort((a, c) => a.left - c.left);
}

/** A home's most urgent warning now: what it lacks, since when, and ticks left before it drops a level; null if it isn't warned (yet). */
export function warningOf(s: SimState, b: Building): Warning | null {
  return warningsOf(s, b)[0] ?? null;
}

/** What a home needs to go up a level that it doesn't have now ('' if nothing, or it can't go higher yet). */
export function wantOf(s: SimState, b: Building): '' | Service {
  if (b.kind !== 'home' || b.people === 0) return '';
  if (b.level === TENT) return b.waterUntil > s.tick ? '' : 'water';
  if (b.level === HUT) return b.foodUntil - s.tick >= COTTAGE_FOOD_MIN ? '' : 'food';
  return '';
}
