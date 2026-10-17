/**
 * The people who live in the homes: their names, ages and families, who
 * moves in and who moves away, and how they feel about it.
 *
 * Names, ages and where people came from are drawn from the state's own
 * `folk` generator (not the main one), so giving people names never changes
 * anything else that happens. A household's members always number exactly
 * its home's `people`.
 */
import { capacity, COTTAGE, FINE, HUT, levelName, TENT, TOWNHOUSE, VILLA } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { FLEECE, FOODS, foodList, foodUntil, GOOD_SERVICE, gi, kindsNeeded, OIL, onTable, SERVICE_GOOD, tableUntil, WINE, type Food, type Ware } from './foods';
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
export function tell(s: SimState, f: Family, what: Story['what'], level: number, names: string[] = [], need: Story['need'] = ''): void {
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
  // More than a dozen choices (a townhouse or fine house): a knapsack over the family units.
  if (groups.length > EXACT_CHOICES) return knapsack(f, units, groups, n);
  // A dozen choices or fewer (every cottage and smaller): try every combination, best first.
  const g = groups;
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

/** Up to this many choices of who leaves, every combination is tried. */
const EXACT_CHOICES = 12;

/**
 * Who leaves from a big household, with the same costs as the full search
 * (newer families first, singles only when a whole family won't do, as few
 * extra as can be): for each family unit, either nobody, or some of its grown
 * children and elderly parents (the newest first), or the whole unit; the
 * cheapest mix that sends at least `n` is found by a knapsack over how many go.
 */
function knapsack(f: Family, units: Array<[number, number]>, groups: Array<{ idx: number[]; unit: number; single: boolean }>, n: number): number[][] {
  const total = f.members.length;
  // Each unit's options: [people, cost, groups].
  const options = units.map((_, u) => {
    const mine = groups.filter((g) => g.unit === u);
    const singles = mine.filter((g) => g.single).sort((a, b) => b.idx[0] - a.idx[0]);
    const whole = mine.find((g) => !g.single);
    const each = (units.length - u) * 2;
    const out: Array<{ people: number; cost: number; take: number[][] }> = [{ people: 0, cost: 0, take: [] }];
    for (let k = 1; k <= singles.length; k++) out.push({ people: k, cost: k * (each + 15), take: singles.slice(0, k).map((g) => g.idx) });
    if (whole) out.push({ people: whole.idx.length, cost: each, take: [whole.idx] });
    return out;
  });
  // best[c]: the cheapest way for the units so far to send exactly c people (null: none).
  let best: Array<{ cost: number; take: number[][] } | null> = Array.from({ length: total + 1 }, (_, c) => (c === 0 ? { cost: 0, take: [] } : null));
  for (const opts of options) {
    const next: typeof best = Array.from({ length: total + 1 }, () => null);
    for (let c = 0; c <= total; c++) {
      const b = best[c];
      if (!b) continue;
      for (const o of opts) {
        const k = c + o.people;
        if (k > total) continue;
        const cost = b.cost + o.cost;
        const was = next[k];
        if (!was || cost < was.cost) next[k] = { cost, take: [...b.take, ...o.take] };
      }
    }
    best = next;
  }
  let pick: number[][] | null = null;
  let low = Infinity;
  for (let c = n; c <= total; c++) {
    const b = best[c];
    if (!b) continue;
    const cost = b.cost + (c - n) * 1000;
    if (cost < low) {
      low = cost;
      pick = b.take;
    }
  }
  if (!pick) return [Array.from({ length: Math.min(n, total - 1) }, (_, k) => total - 1 - k)];
  return pick.map((g) => [...g]).sort((x, y) => y[0] - x[0]);
}

/**
 * At least `n` people move away (see `leavingGroups`), the story naming each
 * group (and why, if it was the taxes). Returns who left.
 */
export function moveOut(s: SimState, b: Building, n: number, need: Story['need'] = ''): Person[] {
  const f = b.family;
  if (!f || n <= 0) return [];
  const groups = leavingGroups(s, f, n);
  const going = new Set(groups.flat());
  for (const grp of groups) tell(s, f, 'left', b.level, grp.map((i) => f.members[i].name), need);
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
  const d = Math.max(1, Math.ceil(ticks / TICKS_PER_DAY));
  if (d > 60) return `${Math.round(d / 30)} months`;
  return d === 1 ? 'a day' : `${d} days`;
};

/** The last story entry of a kind, if any. */
const lastOf = (f: Family, what: Story['what']): Story | undefined => {
  for (let i = f.story.length - 1; i >= 0; i--) if (f.story[i].what === what) return f.story[i];
  return undefined;
};

/**
 * Has a shrine (or theatre) opened in the last two months, since this home's
 * blessings (or plays) last ran out? Then not having them yet is no grievance:
 * the priestess or the actor just hasn't got round to it.
 */
export function justOpened(s: SimState, kind: 'shrine' | 'theatre', until: number): boolean {
  let newest = -Infinity;
  for (const o of s.buildings) if (o.kind === kind && o.since > newest) newest = o.since;
  return s.tick - newest < 2 * TICKS_PER_MONTH && until <= newest;
}

/**
 * How a household feels, and why: what they have and lack, work, a recent
 * move up or down, and settling in. A pure reading of the home's state.
 * `ctx` says what the city offers (any agora at all, any jobs at all).
 */
export function moodOf(s: SimState, b: Building, ctx: { agora: boolean; jobs: boolean; shrine?: boolean; theatre?: boolean }, workable: number): Mood {
  const reasons: Array<{ text: string; w: number }> = [];
  const add = (w: number, text: string): void => void reasons.push({ text, w });
  const f = b.family;
  const wet = b.waterUntil > s.tick;
  const fed = tableUntil(b) > s.tick;
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
    const table = FOODS.filter((f) => foodUntil(b, f) > s.tick);
    const dish = table.length ? foodList(table) : '';
    const Dish = dish.charAt(0).toUpperCase() + dish.slice(1);
    if (fed) {
      // A varied table lifts a mood a little more.
      add(table.length >= 2 ? 2 : 1, `${Dish} on the table`);
      // A cottage (or townhouse) that would like another kind the city makes.
      if (wantsMoreFood(s, b) && table.length > 0 && table.length < kindsNeeded(b.level + 1)) add(-1, `Only ${dish} on the table: they’d like ${foodList(FOODS.filter((f) => !table.includes(f) && cityHas(s).makes[f]), 'or')} too`);
    } else {
      const hungry = Math.max(0, s.tick - Math.max(tableUntil(b), b.grace));
      const lacking = foodList(foodsLacking(s, b), 'or');
      // (A home from an older save, still in its grace: they'd like it, and aren't counting yet.)
      if (s.tick < b.grace && table.length > 0) add(-1, `Only ${dish} on the table: they’d like ${lacking} too`);
      else if (table.length === 0 || kindsNeeded(b.level) <= 1) {
        if (hungry < WARN_AFTER) add(-1, `The food vendor is late (${span(hungry)})`);
        else add(hungry > TICKS_PER_MONTH ? -3 : -2, table.length === 0 ? `No ${kindsNeeded(b.level) <= 1 ? 'bread' : 'food'} for ${span(hungry)}` : `No ${lacking} for ${span(hungry)}`);
      } else if (hungry < WARN_AFTER) add(-1, `Only ${dish} on the table (${span(hungry)})`);
      else add(hungry > TICKS_PER_MONTH ? -3 : -2, `No ${lacking} for ${span(hungry)}`);
    }
  } else if (b.level === HUT) {
    if (fed) add(1, 'Bread from the market');
    else if (ctx.agora) add(-1, 'No bread from the market');
    else add(-1, 'No bread to be had: there’s no market yet');
  }
  // The priestess's blessing: a townhouse's need; a cottage would like it, if there is a shrine to be had.
  const blessed = b.religionUntil > s.tick;
  if (b.level >= TOWNHOUSE) {
    if (blessed) add(1, 'Blessed by the priestess');
    else {
      const gone = s.tick - b.religionUntil;
      if (gone < WARN_AFTER) add(-1, `The priestess is late (${span(gone)})`);
      else add(gone > TICKS_PER_MONTH ? -3 : -2, `No blessings for ${span(gone)}`);
    }
  } else if (b.level === COTTAGE) {
    if (blessed) add(1, 'The priestess comes by with blessings');
    else if (ctx.shrine) {
      if (justOpened(s, 'shrine', b.religionUntil)) add(0, 'A shrine has opened; the priestess hasn’t come this way yet');
      else add(-1, 'The priestess doesn’t come this way');
    }
  }
  // Oil: a townhouse's need; a cottage likes it too, once there is an oil stall.
  goodMood(s, b, OIL, add);
  // Plays: a fine house's need; a townhouse would like them, if there is a theatre.
  const plays = b.cultureUntil > s.tick;
  if (b.level >= FINE) {
    if (plays) add(1, 'Evenings at the theatre');
    else {
      const gone = s.tick - b.cultureUntil;
      if (gone < WARN_AFTER) add(-1, `The actor is late (${span(gone)})`);
      else add(gone > TICKS_PER_MONTH ? -3 : -2, `No plays for ${span(gone)}`);
    }
  } else if (b.level === TOWNHOUSE) {
    if (plays) add(1, 'The actor comes by with news of the plays');
    else if (ctx.theatre) {
      if (justOpened(s, 'theatre', b.cultureUntil)) add(0, 'A theatre has opened; the actor hasn’t come this way yet');
      else add(-1, 'No actor comes this way');
    }
  }
  // Fleece: a fine house's need, a townhouse's like; wine: a villa's need, a fine house's like.
  goodMood(s, b, FLEECE, add);
  goodMood(s, b, WINE, add);
  // Taxes, if a collector comes this way (heavy sours a mood a little, harsh a lot); and wages the treasury couldn't pay.
  if (b.taxedAt > 0 && s.tick - b.taxedAt < 2 * TICKS_PER_MONTH) {
    const r = s.taxRate;
    if (r <= 0) add(1, 'No taxes to pay');
    else if (r === 1) add(0, 'Taxes are light');
    else if (r === 3) add(-1, 'Taxes are heavy');
    else if (r >= 4) add(-6, 'Taxes are harsh: hardly worth staying');
  }
  if (b.unpaid > 0) add(-1, b.unpaid >= b.workers ? 'Their wages are owed: the treasury is empty' : `${b.unpaid} of them are owed wages: the treasury is empty`);
  if (workable > 0 && ctx.jobs) {
    if (b.workers >= workable) add(1, workable === 1 ? 'Has work' : 'Everyone who can work has work');
    else if (b.workers === 0) add(0, workable === 1 ? 'No work to be had nearby' : `No work nearby for the ${workable} who could work`);
    else add(0, `${b.workers} of the ${workable} who could work have work`);
  }
  if (f) {
    const up = lastOf(f, 'up');
    const down = lastOf(f, 'down');
    const recent = 3 * TICKS_PER_MONTH;
    if (down && s.tick - down.tick < recent && (!up || up.tick < down.tick)) add(-1, `Lost their ${levelName(down.level + 1, '')} lately`);
    else if (up && s.tick - up.tick < recent) add(1, `Moved up to ${levelName(up.level)} lately`);
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

/** How each stall good is spoken of in a mood: had where it is needed, had where it is liked, and wanted. */
export const GOOD_MOODS: Partial<Record<Ware, { need: string; like: string; want: string }>> = {
  [OIL]: { need: 'Oil for the lamps and the bread', like: 'Oil for the lamps', want: 'They’d like oil for the lamps' },
  [FLEECE]: { need: 'Warm cloaks of their own wool', like: 'Fleece for the loom', want: 'They’d like fleece for the loom' },
  [WINE]: { need: 'Wine with every meal', like: 'Wine for the table', want: 'They’d like wine for the table' },
};

/** The first level that needs a service (Infinity if none does). */
export const levelNeeding = (need: Service): number => {
  const l = LEVEL_NEEDS.findIndex((ns) => ns.includes(need));
  return l < 0 ? Infinity : l;
};

/** "The oil vendor", from "the oil vendor". */
const cap = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * A stall good in a home's mood: where its level needs it, had (+1), in its
 * grace (0), late (-1) or missing (-2, -3 after a month); a level below,
 * had (+1), or liked once the city has a stall for it (0).
 */
function goodMood(s: SimState, b: Building, good: Ware, add: (w: number, text: string) => void): void {
  const need = GOOD_SERVICE[good];
  const words = GOOD_MOODS[good];
  if (!need || !words) return;
  const at = levelNeeding(need);
  const has = b.goodsUntil[gi(good)] > s.tick;
  if (b.level >= at) {
    if (has) add(1, words.need);
    else {
      const since = missingSince(b, need);
      // (A home from an older save, in its grace, isn't counting yet.)
      if (since > s.tick) add(0, words.want);
      else if (s.tick - since < WARN_AFTER) add(-1, `${cap(BRINGER[need])} is late (${span(s.tick - since)})`);
      else add(s.tick - since > TICKS_PER_MONTH ? -3 : -2, `No ${NEED_WORDS[need]} for ${span(s.tick - since)}`);
    }
  } else if (b.level === at - 1) {
    if (has) add(1, words.like);
    else if (citySells(s, good)) add(0, words.want);
  }
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
/** A cottage or townhouse needs at least this much of every need in hand to go up a level (a month)… */
export const RISE_MIN = TICKS_PER_MONTH;
/** …and to have been what it is for at least this long (a month), so it never climbs straight back after a drop. */
export const SETTLE = TICKS_PER_MONTH;
/** The last stretch of a warning, when the sign turns red and pulses. */
export const URGENT = 10 * TICKS_PER_DAY;

/** Every need, in the order they are always shown. */
export const NEEDS: readonly Service[] = ['water', 'food', 'religion', 'oil', 'culture', 'fleece', 'wine'];

/**
 * The needs of each level of home (plot, tent, hut, cottage, townhouse, fine
 * house, villa): a hut water; a cottage water and bread; a townhouse
 * blessings and oil too (and two kinds of food); a fine house plays and
 * fleece as well (and all three foods); a villa wine besides.
 */
export const LEVEL_NEEDS: ReadonlyArray<readonly Service[]> = [
  [],
  [],
  ['water'],
  ['water', 'food'],
  ['water', 'food', 'religion', 'oil'],
  ['water', 'food', 'religion', 'oil', 'culture', 'fleece'],
  ['water', 'food', 'religion', 'oil', 'culture', 'fleece', 'wine'],
];

/** Each need in a word, as people say it: water, bread, blessings, oil, plays, fleece, wine. */
export const NEED_WORDS: Record<Service, string> = { water: 'water', food: 'bread', religion: 'blessings', oil: 'oil', culture: 'plays', fleece: 'fleece', wine: 'wine' };
/**
 * What a home lacks of a need, in words: water, blessings, plays; for food,
 * bread when its table is bare, else the kinds its level needs and lacks
 * ("meat or cheese": a townhouse with only bread has bread).
 */
export function lackWords(s: SimState, b: Building, need: Service): string {
  if (need !== 'food' || onTable(b, s.tick) === 0) return NEED_WORDS[need];
  return foodList(foodsLacking(s, b), 'or') || NEED_WORDS.food;
}
/** Who brings each need. */
export const BRINGER: Record<Service, string> = {
  water: 'the water carrier',
  food: 'the food vendor',
  religion: 'the priestess',
  oil: 'the oil vendor',
  culture: 'the actor',
  fleece: 'the fleece vendor',
  wine: 'the wine vendor',
};

/** The needs a home's level has (see LEVEL_NEEDS). */
export function needsOf(b: Building): readonly Service[] {
  if (b.kind !== 'home' || b.level < HUT) return [];
  return LEVEL_NEEDS[Math.min(b.level, LEVEL_NEEDS.length - 1)];
}

/** The needs a home of this level must add to go up a level (a tent water, a hut bread, a cottage blessings and oil, a townhouse plays and fleece, a fine house wine); none at the top. */
export const newNeeds = (level: number): readonly Service[] =>
  level >= TENT && level < VILLA ? LEVEL_NEEDS[level + 1].filter((n) => !LEVEL_NEEDS[level].includes(n)) : [];

/** The first need a home of this level must add to go up a level (a cottage's is blessings), or '' at the top. */
export const nextNeed = (level: number): '' | Service => newNeeds(level)[0] ?? '';

/**
 * The tick a home's supply of a need lasts until, for a level's needs (its
 * own by default): for food, the k-th longest lasting of its foods, k the
 * kinds that level needs (see foods.ts).
 */
export function untilOf(b: Building, need: Service, level: number = b.level): number {
  if (need === 'water') return b.waterUntil;
  if (need === 'food') return tableUntil(b, level);
  if (need === 'religion') return b.religionUntil;
  if (need === 'culture') return b.cultureUntil;
  const good = SERVICE_GOOD[need];
  return good === undefined ? 0 : b.goodsUntil[gi(good)];
}

/** Does a service have a grace (a need added since older saves: food's kinds, and every stall good)? */
const hasGrace = (need: Service): boolean => need === 'food' || SERVICE_GOOD[need] !== undefined;

/**
 * Since when a need of a home's level has been missing: the tick it ran out
 * (in the future while it still has it), or the home's last change of level,
 * if later. Food and the stall goods are never missing before the home's
 * `grace` (a town saved before townhouses needed two kinds of food, or oil,
 * or fine houses fleece, counts from when it was loaded).
 */
export function missingSince(b: Building, need: Service): number {
  const since = Math.max(untilOf(b, need), b.since);
  return hasGrace(need) ? Math.max(since, b.grace) : since;
}

/**
 * Is a home ready to go up a level now? A tent with water; a hut with water
 * and a month's bread in hand; a cottage, townhouse or fine house with a
 * month in hand of everything the next level needs, after a month as what it is.
 */
export function readyToRise(s: SimState, b: Building): boolean {
  if (b.kind !== 'home' || b.people === 0) return false;
  if (b.level === TENT) return b.waterUntil > s.tick;
  if (b.level === HUT) return b.waterUntil > s.tick && tableUntil(b, COTTAGE) - s.tick >= COTTAGE_FOOD_MIN;
  if (b.level >= COTTAGE && b.level < VILLA) {
    if (s.tick - b.since < SETTLE) return false;
    return LEVEL_NEEDS[b.level + 1].every((need) => untilOf(b, need, b.level + 1) - s.tick >= RISE_MIN);
  }
  return false;
}

/**
 * The need a home's level is missing longest and since when, or null if it
 * has all it needs: the need and the tick it ran out (or the home's last
 * change of level, if later).
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

/**
 * What a home needs to go up a level that it doesn't have now ('' if nothing,
 * or it can't go higher yet), in the order of NEEDS, then more kinds of food.
 * A home counts as wanting a need only once the city has what brings it: the
 * priestess once there is a shrine, plays once there is a theatre, a stall
 * good once an agora has its stall. Until then they have all there is to be had.
 */
export function wantOf(s: SimState, b: Building): '' | Service {
  if (b.kind !== 'home' || b.people === 0) return '';
  if (b.level === TENT) return b.waterUntil > s.tick ? '' : 'water';
  if (b.level === HUT) return tableUntil(b, COTTAGE) - s.tick >= COTTAGE_FOOD_MIN ? '' : 'food';
  if (b.level < COTTAGE || b.level >= VILLA) return '';
  for (const need of newNeeds(b.level)) if (untilOf(b, need, b.level + 1) - s.tick < RISE_MIN && cityOffers(s, need)) return need;
  return wantsMoreFood(s, b) ? 'food' : '';
}

/** Does the city have what brings a need: a shrine for blessings, a theatre for plays, an agora's stall for a good (water and food: always)? */
export function cityOffers(s: SimState, need: Service): boolean {
  if (need === 'religion') return cityHas(s).shrine;
  if (need === 'culture') return cityHas(s).theatre;
  const good = SERVICE_GOOD[need];
  return good === undefined || citySells(s, good);
}

/** Does any agora have a stall for this good? */
export const citySells = (s: SimState, good: Ware): boolean => (cityHas(s).stalls & (1 << gi(good))) !== 0;

/**
 * Does a home want a stall good to go up a level? Only a home a level below
 * the one that needs it (a cottage oil, a townhouse fleece, a fine house
 * wine), and only once the city has a stall for it (as it wants the
 * priestess only once there is a shrine).
 */
export function wantsGood(s: SimState, b: Building, good: Ware): boolean {
  const need = GOOD_SERVICE[good];
  if (!need || b.kind !== 'home' || b.level !== levelNeeding(need) - 1) return false;
  return b.goodsUntil[gi(good)] - s.tick < RISE_MIN && citySells(s, good);
}
/** Does a cottage want oil to go up a level? */
export const wantsOil = (s: SimState, b: Building): boolean => wantsGood(s, b, OIL);

/**
 * Does a cottage or townhouse want another kind of food to go up a level?
 * Only once the city makes more kinds than it has on its table (as a cottage
 * wants the priestess only once there is a shrine): until then it has all
 * there is to be had.
 */
export function wantsMoreFood(s: SimState, b: Building): boolean {
  if (b.level !== COTTAGE && b.level !== TOWNHOUSE) return false;
  if (tableUntil(b, b.level + 1) - s.tick >= RISE_MIN) return false;
  let had = 0;
  for (const f of FOODS) if (foodUntil(b, f) - s.tick >= RISE_MIN) had++;
  return cityHas(s).kinds > had;
}

/**
 * The foods a home's table lacks for a level (its own by default), in order:
 * those missing from its table that the city makes, or if it makes none of
 * them, all those missing (a townhouse with only bread in a city with no
 * lodge or dairy lacks meat and cheese; a cottage with nothing, in a city of
 * wheat farms, lacks bread).
 */
export function foodsLacking(s: SimState, b: Building, level: number = b.level): Food[] {
  const k = Math.max(1, kindsNeeded(level));
  if (onTable(b, s.tick) >= k) return [];
  const missing = FOODS.filter((f) => foodUntil(b, f) <= s.tick);
  const made = missing.filter((f) => cityHas(s).makes[f]);
  return made.length ? made : missing;
}

/**
 * Whether the city has a shrine and a theatre, worked out once per change of
 * its buildings (`rev`, bumped whenever one is placed or cleared) and kept
 * outside the state, like the road-distance cache: a pure function of it.
 */
interface CityHas {
  shrine: boolean;
  theatre: boolean;
  /** Every stall any agora has, a bit each (as an agora's `stalls`). */
  stalls: number;
  kinds: number;
  makes: boolean[];
}
const hasCache = new WeakMap<SimState, CityHas & { rev: number; n: number }>();
export function cityHas(s: SimState): CityHas {
  const hit = hasCache.get(s);
  if (hit && hit.rev === s.rev && hit.n === s.buildings.length) return hit;
  // The kinds of food the city makes: wheat on a farm, meat at a lodge, cheese at a dairy.
  const makes = [s.buildings.some((o) => o.kind === 'farm'), s.buildings.some((o) => o.kind === 'lodge'), s.buildings.some((o) => o.kind === 'dairy')];
  const fresh = {
    rev: s.rev,
    n: s.buildings.length,
    shrine: s.buildings.some((o) => o.kind === 'shrine'),
    theatre: s.buildings.some((o) => o.kind === 'theatre'),
    stalls: s.buildings.reduce((m, o) => (o.kind === 'agora' ? m | o.stalls : m), 0),
    kinds: makes.filter(Boolean).length,
    makes,
  };
  hasCache.set(s, fresh);
  return fresh;
}

/**
 * A service walker's score for a home (see NeedScore in walk.ts): Infinity if
 * it doesn't want her (`wants` false); for a home whose level needs the
 * service, the tick it would go down a level without it (counting from its
 * last change of level, so a home that has just gone down is not the most
 * urgent); for one that only wants it to grow, when its supply runs out, on
 * the same scale. Where nobody is warned this orders homes exactly as their
 * supplies run out. With `now` (the stall vendors), a home that only wants
 * it and has run out counts as running out now, not when it last had some:
 * a cottage that never had oil doesn't come before a townhouse that will go
 * down without it.
 */
export function serviceScore(b: Building, need: Service, wants: boolean, now = -Infinity): number {
  if (!wants) return Infinity;
  return (needsOf(b).includes(need) ? missingSince(b, need) : Math.max(untilOf(b, need), now)) + DECLINE_AFTER;
}

/** When a home would go down a level for want of a service (Infinity if its level doesn't need it). */
export function serviceDue(b: Building, need: Service): number {
  return needsOf(b).includes(need) ? missingSince(b, need) + DECLINE_AFTER : Infinity;
}
