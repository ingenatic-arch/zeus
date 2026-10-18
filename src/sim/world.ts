/**
 * Greece beyond the walls: the cities, their rulers and their goods.
 *
 * Each game shuffles Greece from its own seed, apart from the city's (a new
 * game on the bare link gets a fresh one; a demo's comes from its city's
 * seed), and draws on its own random numbers (`world.rng`), so the city's
 * three generators never move and a town that keeps to itself plays exactly
 * as it did before Greece was there.
 *
 * Each of Athens, Sparta, Corinth and Troy has a ruler with a name, a title,
 * two traits and a face. The ruler's mood towards you is the sum of what they
 * remember (`memories`), each with its reason, what it is worth and when it
 * happened; some memories fade. Each city makes and uses the six trade goods
 * in its own measure (its character, with some shuffle): what it makes plenty
 * of it sells cheap, what it is short of it pays well for: that is its usual
 * price. Underneath, each city keeps a stock of each good, normally about half
 * a year of what passes through it, pushed from normal by your trade (what
 * you sell them adds to it, what you buy takes from it) and by its harvest each
 * autumn, both wearing off day by day; the price rises as the stock runs short
 * and falls as it piles up (see the price model below). A year of monthly
 * prices is kept for the chart. Tyre keeps the merchant ship's steady prices.
 *
 * Pure: plain data in, plain data out; only `world.rng` is drawn from.
 */
import { CITY_IDS, HORIZON_ALONG, lineLength, PLACES, RULED, wayOf, wayPoints, type CityId } from '../map/greece';
import { dateOfTick, START_MONTH, TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { nextFloat, nextInt, seedRng, type RngState } from './rng';
import type { Memory, Ruler, SimState, Trait, World, WorldCity } from './state';
import { FEAST_RAMP_DAYS, FEAST_SHARE, FEAST_WEAR_DAYS, feasting, feastWords } from './festivals';
import { PRICES, SAIL_IN, SHIP_AWAY, SHIP_COMING, SHIP_LEAVING, SHIP_MOORED, shipAt, TRADE_GOODS } from './trade';

/** What your city is called to begin with. */
export const DEFAULT_NAME = 'Nea Argos';
/** A name's length, at least and at most. */
export const NAME_MIN = 2;
export const NAME_MAX = 20;

export const TRAITS: readonly Trait[] = ['proud', 'greedy', 'generous', 'warlike', 'pious', 'shrewd', 'fickle', 'steadfast'];
/** What each trait means, in a few words (the panel says them). */
export const TRAIT_WORDS: Record<Trait, string> = {
  proud: 'takes slights hard',
  greedy: 'loves coin and gifts of it',
  generous: 'gives freely and remembers kindness',
  warlike: 'quick to threaten and to fight',
  pious: 'honours the gods and their festivals',
  shrewd: 'drives a hard bargain',
  fickle: 'forgets quickly, good and bad',
  steadfast: 'slow to change their mind',
};
/** Traits that can't go together. */
const CLASH: ReadonlyArray<readonly [Trait, Trait]> = [
  ['greedy', 'generous'],
  ['fickle', 'steadfast'],
];

/** Each ruled city's character: its rulers' names, how likely each trait is, and how big it is. */
interface Character {
  men: readonly string[];
  women: readonly string[];
  /** "King", "Queen". */
  title: readonly [string, string];
  /** Extra weight for traits its rulers tend to have (every trait has weight 1). */
  leans: Partial<Record<Trait, number>>;
  /** How much it makes and uses, against a middling city. */
  size: number;
  /** By trade good: +1 makes plenty (sells), -1 short (buys), 0 about enough. */
  goods: readonly number[];
}

const CHARACTERS: Record<'athens' | 'sparta' | 'corinth' | 'troy', Character> = {
  athens: {
    men: ['Megakles', 'Kodros', 'Alkmaion', 'Medon', 'Akastos', 'Erechtheus', 'Kekrops', 'Aigeus'],
    women: ['Praxithea', 'Kreousa', 'Prokne', 'Herse', 'Metaneira'],
    title: ['Archon', 'Archon'],
    leans: { shrewd: 2, pious: 1, proud: 1, generous: 1 },
    size: 1.4,
    // Rich and hungry for wheat: buys food, sells oil and wine.
    goods: [-1, -1, 0, 1, 0, 1],
  },
  sparta: {
    men: ['Archidamos', 'Polydoros', 'Teleklos', 'Charilaos', 'Eurykrates', 'Menelaos', 'Tyndareos', 'Leotychidas'],
    women: ['Gorgo', 'Kyniska', 'Leda', 'Helen', 'Lampito'],
    title: ['King', 'Queen'],
    leans: { warlike: 3, steadfast: 1, proud: 1, pious: 1 },
    size: 1.0,
    // A city of soldiers, short of fine goods: sells food, buys oil, fleece and wine.
    goods: [1, 1, 0, -1, -1, -1],
  },
  corinth: {
    men: ['Periandros', 'Kypselos', 'Bakchis', 'Telestes', 'Aletes', 'Glaukos', 'Sisyphos'],
    women: ['Melissa', 'Labda', 'Merope', 'Peirene', 'Medea'],
    title: ['Lord', 'Lady'],
    leans: { shrewd: 2, greedy: 2 },
    size: 1.1,
    // The trading city: sells wine and fleece, buys oil and meat.
    goods: [0, -1, 0, -1, 1, 1],
  },
  troy: {
    men: ['Priam', 'Laomedon', 'Ilos', 'Tros', 'Assarakos', 'Anchises', 'Kapys'],
    women: ['Hekabe', 'Kassandra', 'Andromache', 'Hesione', 'Arisbe'],
    title: ['King', 'Queen'],
    leans: { proud: 2, generous: 1, pious: 1 },
    size: 1.2,
    // Far off and wealthy in fleece and wine: buys wheat, cheese and oil.
    goods: [-1, 0, -1, -1, 1, 1],
  },
};

/** What a middling city makes and uses of each trade good in a year (measures). */
const BASE_USE: readonly number[] = [4000, 1200, 1200, 1500, 1000, 1000];

/** History between your city (where old Argos stood) and each, remembered for good. */
const HISTORY: Partial<Record<CityId, { amount: number; why: string }>> = {
  sparta: { amount: -10, why: 'your city stands where old Argos did, Sparta’s old rival for the Peloponnese' },
  corinth: { amount: 5, why: 'neighbours on the road through Nemea' },
  troy: { amount: -10, why: 'the Argives sailed against Troy once, under Agamemnon' },
};
/** What a trait makes of a new city, remembered for good. */
const TRAIT_FIRST: Partial<Record<Trait, { amount: number; why: string }>> = {
  proud: { amount: -5, why: 'proud: thinks little of a new city' },
  generous: { amount: 5, why: 'generous: well-disposed to newcomers' },
  warlike: { amount: -5, why: 'warlike: sizes up every new neighbour' },
  steadfast: { amount: 5, why: 'steadfast: slow to change' },
};
/** First word of your city fades over this long. */
const FIRST_FADE = 3 * TICKS_PER_YEAR;

/** How rulers feel about each other at the start, before the shuffle (CITY_IDS order: home, athens, sparta, corinth, troy, tyre). */
export const OLD_TIES: Partial<Record<CityId, readonly number[]>> = {
  athens: [0, 0, -20, -5, -10, 0],
  sparta: [0, -20, 0, 10, -10, 0],
  corinth: [0, -5, 10, 0, -10, 0],
  troy: [0, -10, -10, -10, 0, 0],
};

/** Greece's own generator, from its seed (well apart from the city's, made from a seed of the same number). */
export const worldRng = (seed: number): RngState => seedRng((seed ^ 0x47524545) >>> 0);

/** Pick from a list by weight. */
function weighted<T>(rng: RngState, items: readonly T[], weight: (t: T) => number): T {
  const total = items.reduce((a, t) => a + weight(t), 0);
  let r = nextFloat(rng) * total;
  for (const t of items) {
    r -= weight(t);
    if (r < 0) return t;
  }
  return items[items.length - 1];
}

function shuffleRuler(rng: RngState, id: keyof typeof CHARACTERS): Ruler {
  const ch = CHARACTERS[id];
  const female = nextFloat(rng) < 0.3;
  const names = female ? ch.women : ch.men;
  const name = names[nextInt(rng, names.length)];
  const first = weighted(rng, TRAITS, (t) => 1 + (ch.leans[t] ?? 0));
  const second = weighted(
    rng,
    TRAITS.filter((t) => t !== first && !CLASH.some(([a, b]) => (a === first && b === t) || (b === first && a === t))),
    (t) => 1 + (ch.leans[t] ?? 0),
  );
  return { name, female, title: `${ch.title[female ? 1 : 0]} of ${PLACES[id].name}`, traits: [first, second], face: nextInt(rng, 0x7fffffff) };
}

/** A city of Greece with nothing going on yet: its goods from its character with some shuffle, at steady prices. */
function shuffleGoods(rng: RngState, c: WorldCity, ch: Character | null): void {
  const leans = ch ? ch.goods.slice() : TRADE_GOODS.map(() => 0);
  // Some shuffle: now and then a good it has about enough of is one it has plenty of, or is short of.
  if (ch && nextFloat(rng) < 0.5) {
    const even = leans.map((l, k) => (l === 0 ? k : -1)).filter((k) => k >= 0);
    if (even.length) leans[even[nextInt(rng, even.length)]] = nextFloat(rng) < 0.5 ? 1 : -1;
  }
  const size = ch?.size ?? 1;
  c.make = BASE_USE.map((u, k) => Math.round((u * size * (1 + leans[k] * 0.6) * (0.85 + nextFloat(rng) * 0.3)) / 50) * 50);
  c.need = BASE_USE.map((u, k) => Math.round((u * size * (1 - leans[k] * 0.6) * (0.85 + nextFloat(rng) * 0.3)) / 50) * 50);
  c.yours = zeros();
  c.crop = zeros();
  c.strife = zeros();
  c.feast = zeros();
  c.stock = TRADE_GOODS.map((_, k) => Math.round(normalStock(c, k)));
  c.price = ch ? c.make.map((m, k) => marketPrice(k, m, c.need[k])) : PRICES.slice();
  c.history = c.price.map((p) => new Array<number>(12).fill(p));
  c.trail = c.price.slice();
  c.dealt = TRADE_GOODS.map(() => new Array<number>(12).fill(0));
}

const zeros = (): number[] => TRADE_GOODS.map(() => 0);

/** What a city pays or asks for a hundred measures of a trade good, from what it makes and uses: dearer the shorter it is. */
export function marketPrice(k: number, make: number, need: number): number {
  return Math.max(1, Math.round(usualRaw(k, make, need)));
}
const usualRaw = (k: number, make: number, need: number): number => PRICES[k] * (1 + 0.45 * (make + need > 0 ? (need - make) / (need + make) : 0));

/**
 * A fresh Greece from a seed, made at a tick. Each ruler's starting mood is
 * what they remember: the history between your cities, what their traits make
 * of a newcomer, and first word of your city (which fades), chosen so the
 * mood comes out between cold and warm in a new game, or (`mild`, for a
 * town from before Greece was there) between wary and cordial.
 */
export function freshWorld(seed: number, tick = 0, mild = false): World {
  const rng = worldRng(seed);
  const cities: WorldCity[] = CITY_IDS.map((id) => ({
    id,
    ruler: null,
    memories: [],
    ties: CITY_IDS.map(() => 0),
    bonds: [],
    make: [],
    need: [],
    stock: [],
    yours: [],
    crop: [],
    strife: [],
    feast: [],
    price: [],
    history: [],
    trail: [],
    dealt: [],
    harvest: 2,
    outlook: 2,
    festival: 0,
    war: '',
    feel: 3,
    gave: 0,
  }));
  for (const c of cities) {
    const ruled = RULED.includes(c.id) ? (c.id as keyof typeof CHARACTERS) : null;
    if (ruled) c.ruler = shuffleRuler(rng, ruled);
    shuffleGoods(rng, c, ruled ? CHARACTERS[ruled] : null);
    if (!c.ruler) continue;
    const mem: Memory[] = [];
    const h = HISTORY[c.id];
    if (h) mem.push({ kind: 'history', why: h.why, amount: h.amount, tick, fade: 0 });
    for (const t of c.ruler.traits) {
      const f = TRAIT_FIRST[t];
      if (f) mem.push({ kind: 'trait', why: f.why, amount: f.amount, tick, fade: 0 });
    }
    const fixed = mem.reduce((a, m) => a + m.amount, 0);
    const span = mild ? 20 : 40;
    const target = Math.round(-span + nextFloat(rng) * span * 2);
    const first = Math.max(-25, Math.min(25, target - fixed));
    const fickle = c.ruler.traits.includes('fickle');
    if (first !== 0) {
      mem.push({
        kind: 'first',
        why: first > 0 ? (fickle ? 'taken with the first word of your city, for now' : 'first word of your city pleased them') : fickle ? 'put out by the first word of your city, for now' : 'first word of your city didn’t impress them',
        amount: first,
        tick,
        // A fickle ruler forgets in half the time.
        fade: fickle ? FIRST_FADE / 2 : FIRST_FADE,
      });
    }
    c.memories = mem;
    const old = OLD_TIES[c.id] ?? [];
    c.ties = CITY_IDS.map((o, j) => (o === c.id || !RULED.includes(o) ? 0 : (old[j] ?? 0) + Math.round((nextFloat(rng) - 0.5) * 20)));
  }
  // Last autumn's harvest, worn off as much as it would have by now, and the next one foreseen. (Drawn after
  // everything else, so the rulers a seed gives are the same as before prices moved.)
  const last = lastHarvest(tick);
  for (const c of cities) {
    if (!c.ruler) continue;
    c.harvest = drawHarvest(rng);
    c.outlook = drawHarvest(rng);
    const wear = Math.pow(1 - 1 / WEAR_DAYS, Math.floor((tick - last) / TICKS_PER_DAY));
    TRADE_GOODS.forEach((_, k) => {
      c.crop[k] = tidy(HARVEST_SHIFT[c.harvest] * CROP_WEIGHT[k] * normalStock(c, k) * wear);
    });
    reprice(c);
    c.trail = trailOf(c);
    c.history = c.price.map((p) => new Array<number>(12).fill(p));
    c.feel = moodLevel(moodOf(c, tick));
  }
  return { seed, rng, name: DEFAULT_NAME, cities, routes: [], deals: [], travellers: [], news: [], gifts: [], nextGift: 1, contact: 0, nextDeal: 1, raids: [], nextRaid: 1, wars: [], nextWar: 1, feuds: [] };
}

/** A city's record. */
export const cityOf = (w: World, id: CityId): WorldCity => w.cities[CITY_IDS.indexOf(id)];

/** What a memory is worth at a tick: its amount, fading evenly to nothing (whole numbers, so the reasons add up to the mood). */
export function memoryWorth(m: Memory, tick: number): number {
  if (m.fade <= 0) return m.amount;
  const left = 1 - (tick - m.tick) / m.fade;
  return left <= 0 ? 0 : Math.round(m.amount * Math.min(1, left));
}

/** A ruler's mood towards you at a tick: what their memories add up to now. */
export const moodOf = (c: WorldCity, tick: number): number => c.memories.reduce((a, m) => a + memoryWorth(m, tick), 0);

export type MoodWord = 'hostile' | 'cold' | 'wary' | 'cordial' | 'warm' | 'devoted';
export const MOOD_WORDS: readonly MoodWord[] = ['hostile', 'cold', 'wary', 'cordial', 'warm', 'devoted'];
/** A mood in a word. */
export function moodWord(n: number): MoodWord {
  if (n <= -60) return 'hostile';
  if (n <= -30) return 'cold';
  if (n < 0) return 'wary';
  if (n < 30) return 'cordial';
  if (n < 60) return 'warm';
  return 'devoted';
}

/** Where a mood stands from hostile (0) to devoted (5). */
export const moodLevel = (n: number): number => MOOD_WORDS.indexOf(moodWord(n));
/** The mood at or below which a ruler is cold (sends traders less often, won't open a route), and hostile (closes their routes). */
export const COLD = -30;
export const HOSTILE = -60;
/** The mood at or above which a ruler is warm (and may send gifts). */
export const WARM = 30;

/**
 * How long a ruler remembers something (ticks): a fickle one half as long,
 * a steadfast one half as long again, and a generous one a kindness (`good`)
 * half as long again.
 */
export function fadeFor(c: WorldCity, base: number, good: boolean): number {
  const t = c.ruler?.traits ?? [];
  let f = base;
  if (t.includes('fickle')) f *= 0.5;
  if (t.includes('steadfast')) f *= 1.5;
  if (good && t.includes('generous')) f *= 1.5;
  return Math.round(f);
}

/** A snub is remembered this long. */
export const SNUB_FADE = 6 * TICKS_PER_MONTH;

/** Their trader turned back at your city without trading (no yard, road or post): a ruler takes it as a snub, a proud one more, a steadfast one less. */
export function snubbed(s: SimState, city: CityId, why: string): void {
  const c = cityOf(s.world, city);
  if (!c.ruler) return;
  const t = c.ruler.traits;
  const amount = t.includes('proud') ? -6 : t.includes('steadfast') ? -3 : -4;
  c.memories.push({ kind: 'snub', why, amount, tick: s.tick, fade: fadeFor(c, SNUB_FADE, false) });
}

/** A ruler's name with their title and city: "Lord Periandros of Corinth". */
export function rulerName(c: WorldCity): string {
  if (!c.ruler) return PLACES[c.id].name;
  return `${c.ruler.title.replace(/ of .*/, '')} ${c.ruler.name} of ${PLACES[c.id].name}`;
}

/** A ruler's name with their title: "Lord Periandros". */
export const rulerShort = (c: WorldCity): string => (c.ruler ? `${c.ruler.title.replace(/ of .*/, '')} ${c.ruler.name}` : PLACES[c.id].name);

/** The reasons for a ruler's mood, biggest first: what each is worth now and whether it is fading. */
export function moodReasons(c: WorldCity, tick: number): Array<{ worth: number; why: string; fading: boolean; tick: number }> {
  return c.memories
    .map((m) => ({ worth: memoryWorth(m, tick), why: m.why, fading: m.fade > 0, tick: m.tick }))
    .filter((r) => r.worth !== 0)
    .sort((a, b) => Math.abs(b.worth) - Math.abs(a.worth));
}

/** The goods a city sells (makes plenty of) and buys (is short of), by trade good index. */
export function sellsAndBuys(c: WorldCity): { sells: number[]; buys: number[] } {
  const sells: number[] = [];
  const buys: number[] = [];
  TRADE_GOODS.forEach((_, k) => {
    if (c.make[k] > c.need[k] * 1.15) sells.push(k);
    else if (c.need[k] > c.make[k] * 1.15) buys.push(k);
  });
  return { sells, buys };
}

/** Why a name can't be your city's, or '' if it can. */
export function nameRefusal(name: string): string {
  const n = name.trim();
  if (n.length < NAME_MIN) return 'A name needs at least two letters';
  if (n.length > NAME_MAX) return `A name can be at most ${NAME_MAX} letters long`;
  if (!/^\p{L}[\p{L} '’-]*$/u.test(n)) return 'Only letters, spaces, hyphens and apostrophes';
  return '';
}

// ---------------------------------------------------------------------------
// The price model.

/** How many days for a push on a city's stock (your trade, its harvest) to wear off by about two thirds: the pull back to normal. */
export const WEAR_DAYS = 150;
/** The arrow compares the price now with a trail this many days behind it, smoothed. */
export const TRAIL_DAYS = 15;
/** How far the stock can run from normal, as a share of it, for pricing: a price goes to at most twice its usual, and down to half. */
export const RATIO_MIN = 0.25;
export const RATIO_MAX = 4;
/** The harvests come in on the first of September (0-based month). */
export const HARVEST_MONTH = 8;
/** From the first of June, a city's page says how next harvest's fields look. */
export const OUTLOOK_MONTH = 5;
export const HARVEST_WORDS = ['failed', 'poor', 'fair', 'good', 'rich'] as const;
/** How likely each harvest is, failed to rich (in a hundred). */
const HARVEST_ODDS = [7, 18, 45, 20, 10];
/** What a harvest adds to (or takes from) a normal stock, failed to rich, for a good that feels it fully. */
export const HARVEST_SHIFT = [-0.75, -0.35, 0, 0.32, 0.6];
/** How much each trade good feels the harvest: wheat fully, oil and wine (crops too) six tenths, meat and cheese (fodder) three, fleece not at all. */
export const CROP_WEIGHT = [1, 0.3, 0.3, 0.6, 0, 0.6];
/**
 * A push smaller than this (measures) is let go. (At least 0.75: pushes are
 * kept to the hundredth, and below that a day's wearing off, 1/150 of it, is
 * less than half a hundredth, so it would round back to where it was and
 * never reach nothing.)
 */
const TIDY = 1;

const tidy = (x: number): number => (Math.abs(x) < TIDY ? 0 : Math.round(x * 100) / 100);

function drawHarvest(rng: RngState): number {
  return weighted(rng, [0, 1, 2, 3, 4], (h) => HARVEST_ODDS[h]);
}

/** The tick of the latest harvest at or before a tick (the first of September; before the founding for the first months). */
export function lastHarvest(tick: number): number {
  const since = (((tick + (START_MONTH - HARVEST_MONTH) * TICKS_PER_MONTH) % TICKS_PER_YEAR) + TICKS_PER_YEAR) % TICKS_PER_YEAR;
  return tick - since;
}

/** A city's normal stock of a trade good: about half a year of what passes through it. */
export const normalStock = (c: WorldCity, k: number): number => Math.max(50, (c.make[k] + c.need[k]) / 4);

/** A city's usual price for a trade good, with nothing pushing its stock (what slice 15 set, steady). */
export const usualPrice = (c: WorldCity, k: number): number => marketPrice(k, c.make[k], c.need[k]);

/** The price (unrounded) a city's stock of a good gives, with or without each push. */
function rawPrice(c: WorldCity, k: number, yours = c.yours[k], crop = c.crop[k], strife = c.strife[k], feast = c.feast[k]): number {
  const n = normalStock(c, k);
  const ratio = Math.max(RATIO_MIN, Math.min(RATIO_MAX, (n + yours + crop + strife + feast) / n));
  return usualRaw(k, c.make[k], c.need[k]) / Math.sqrt(ratio);
}

/** A ruled city's prices as they stand now, unrounded (to the hundredth), for the arrow's trail to start from: steady. */
export const trailOf = (c: WorldCity): number[] => TRADE_GOODS.map((_, k) => Math.round(rawPrice(c, k) * 100) / 100);

/** A city's usual price for a good unrounded (to the hundredth), from what it makes and uses: where a price with nothing pushing it sits, for a trail. */
export const usualTrail = (k: number, make: number, need: number): number => Math.round(usualRaw(k, make, need) * 100) / 100;

/** Set a ruled city's stock and prices from its pushes (Tyre and your city keep theirs). */
export function reprice(c: WorldCity): void {
  if (!c.ruler) return;
  TRADE_GOODS.forEach((_, k) => {
    c.stock[k] = Math.max(0, Math.round(normalStock(c, k) + c.yours[k] + c.crop[k] + c.strife[k] + c.feast[k]));
    c.price[k] = Math.max(1, Math.round(rawPrice(c, k)));
  });
}

/** Your trade with a city moves its stock: `n` measures of a trade good sold to them (+) or bought from them (−). Its prices follow at once. */
export function traded(w: World, city: CityId, k: number, n: number): void {
  const c = cityOf(w, city);
  if (!c.ruler || n === 0) return;
  c.yours[k] = tidy(c.yours[k] + n);
  c.dealt[k][c.dealt[k].length - 1] += n;
  reprice(c);
}

/** A ruled city's harvest comes in: its crops' stocks rise or fall, and next year's is foreseen. */
export function harvestIn(w: World, city: CityId, h: number): void {
  const c = cityOf(w, city);
  if (!c.ruler) return;
  c.harvest = h;
  c.outlook = drawHarvest(w.rng);
  TRADE_GOODS.forEach((_, k) => {
    c.crop[k] = tidy(c.crop[k] + HARVEST_SHIFT[h] * CROP_WEIGHT[k] * normalStock(c, k));
  });
  reprice(c);
}

/** Is this tick the harvest (the first of September)? */
export const isHarvest = (tick: number): boolean => lastHarvest(tick) === tick;

/**
 * Greece's day: on the first of September the harvests come in (each city's
 * the one foreseen, with a line of news for a failed or rich one); every day
 * each ruled city's pushes wear off a little and its prices follow, the
 * arrow's trail behind them; on the first of each month the prices go into
 * the year of history, the month's trade record moves on, and memories faded
 * to nothing are let go. Touches nothing but `world`.
 */
export function stepWorld(s: SimState): void {
  if (s.tick % TICKS_PER_DAY !== 0) return;
  const w = s.world;
  const harvest = isHarvest(s.tick);
  const was = w.cities.map((c) => c.price[0]);
  if (harvest) for (const c of w.cities) if (c.ruler) harvestIn(w, c.id, c.outlook);
  const keep = 1 - 1 / WEAR_DAYS;
  const feastKeep = 1 - 1 / FEAST_WEAR_DAYS;
  for (const c of w.cities) {
    if (!c.ruler) continue;
    const feasts = feasting(c.id, s.tick);
    TRADE_GOODS.forEach((_, k) => {
      c.yours[k] = tidy(c.yours[k] * keep);
      c.crop[k] = tidy(c.crop[k] * keep);
      const n = normalStock(c, k);
      // At war: drawn down towards its war's mark (no further: deeper, after a defeat, it eases to it); at peace, wearing off.
      c.strife[k] = tidy(c.war && STRIFE_SHARE[k] > 0 ? toward(c.strife[k], -STRIFE_SHARE[k] * n, STRIFE_RAMP_DAYS, keep) : c.strife[k] * keep);
      // Laying in for its festival and keeping it: drawn down towards the festival's mark; after, easing within a season.
      c.feast[k] = tidy(feasts && FEAST_SHARE[k] > 0 ? toward(c.feast[k], -FEAST_SHARE[k] * n, FEAST_RAMP_DAYS, feastKeep) : c.feast[k] * feastKeep);
    });
    reprice(c);
    TRADE_GOODS.forEach((_, k) => {
      c.trail[k] = Math.round((c.trail[k] + (rawPrice(c, k) - c.trail[k]) / TRAIL_DAYS) * 100) / 100;
    });
  }
  // The news of a failed or rich harvest, with wheat's price as the pages show it from today.
  if (harvest) {
    w.cities.forEach((c, i) => {
      if (c.ruler && (c.harvest === 0 || c.harvest === 4)) w.news.push({ tick: s.tick, city: c.id, line: harvestLine(c, was[i]) });
    });
    if (w.news.length > NEWS_KEEP) w.news.splice(0, w.news.length - NEWS_KEEP);
  }
  if (s.tick % TICKS_PER_MONTH !== 0) return;
  for (const c of w.cities) {
    c.history.forEach((h, k) => {
      h.shift();
      h.push(c.price[k]);
    });
    for (const d of c.dealt) {
      d.shift();
      d.push(0);
    }
    if (c.memories.some((m) => m.fade > 0 && s.tick - m.tick >= m.fade)) c.memories = c.memories.filter((m) => m.fade <= 0 || s.tick - m.tick < m.fade);
  }
}

/** How many lines of news from Greece are kept. */
const NEWS_KEEP = 12;

/** How far a war draws each trade good's stock down in both cities at most (a share of normal): food and fleece. */
export const STRIFE_SHARE: readonly number[] = [0.4, 0.4, 0.4, 0, 0.45, 0];
/** Days for a war's push to come on, by about two thirds. */
export const STRIFE_RAMP_DAYS = 8;

/**
 * A push moving a day towards a mark below nothing: closing on it by 1/`ramp`
 * of the gap while short of it; past it (deeper), easing back as a push wears
 * off (`keep` a day), but not past the mark.
 */
function toward(x: number, mark: number, ramp: number, keep: number): number {
  if (x > mark) return x + (mark - x) / ramp;
  return Math.min(mark, x * keep);
}

/** The news of a failed or rich harvest: "Athens’ harvest has failed, and wheat there is 46 a hundred (it was 25)". */
function harvestLine(c: WorldCity, was: number): string {
  const name = PLACES[c.id].name;
  const whose = name.endsWith('s') ? `${name}’` : `${name}’s`;
  return c.harvest === 0 ? `${whose} harvest has failed, and wheat there is ${c.price[0]} a hundred (it was ${was})` : `A rich harvest in ${name}: wheat there is down to ${c.price[0]} a hundred (it was ${was})`;
}


// ---------------------------------------------------------------------------
// Reading a price: its arrow, its reason, the ruler's terms.

export type Arrow = -1 | 0 | 1;
/** Up, down or steady: the price now against its trail, by more than 1% (a price easing back after a push shows its way). */
export function arrowOf(c: WorldCity, k: number): Arrow {
  if (!c.ruler) return 0;
  const now = rawPrice(c, k);
  const d = (now - c.trail[k]) / Math.max(1, c.trail[k]);
  return d > 0.01 ? 1 : d < -0.01 ? -1 : 0;
}

/** What you sold a city (+) or bought from it (−) of a good in the last twelve months. */
export const dealtYear = (c: WorldCity, k: number): number => c.dealt[k].reduce((a, n) => a + n, 0);

export interface PriceWhy {
  arrow: Arrow;
  /** Dear or cheap against its usual price, or at it. */
  word: 'dear' | 'cheap' | 'usual';
  /** What moves it most now: you, the harvest, a war, a festival, or nothing (its usual price). */
  push: 'you' | 'harvest' | 'war' | 'festival' | 'usual';
  /** The reason, in words: "you sold them 1,400 in the last year", "their harvest failed this autumn". */
  why: string;
  /** Its usual price. */
  usual: number;
}

const fmtN = (n: number): string => Math.round(n).toLocaleString('en-GB');

/** Why a city's price for a good is what it is now: the biggest push on it, if any moves it by 3% or more. (`w`: Greece, to name the war.) */
export function priceWhy(c: WorldCity, k: number, tick: number, w?: World): PriceWhy {
  const usual = usualPrice(c, k);
  const arrow = arrowOf(c, k);
  const now = c.ruler ? rawPrice(c, k) : c.price[k];
  const word: PriceWhy['word'] = now > usual * 1.03 ? 'dear' : now < usual * 0.97 ? 'cheap' : 'usual';
  const byYou = c.ruler ? now - rawPrice(c, k, 0) : 0;
  const byCrop = c.ruler ? now - rawPrice(c, k, c.yours[k], 0) : 0;
  const byWar = c.ruler ? now - rawPrice(c, k, c.yours[k], c.crop[k], 0) : 0;
  const byFeast = c.ruler ? now - rawPrice(c, k, c.yours[k], c.crop[k], c.strife[k], 0) : 0;
  const big = Math.max(Math.abs(byYou), Math.abs(byCrop), Math.abs(byWar), Math.abs(byFeast));
  // (Within 3% of its usual price, nothing moves it much: say what it usually is, not a push the price doesn't show.)
  if (!c.ruler || word === 'usual' || big < usual * 0.03) {
    const why = c.make[k] > c.need[k] * 1.15 ? 'they make plenty of it' : c.need[k] > c.make[k] * 1.15 ? 'they are short of it' : 'they make about what they use';
    return { arrow, word: 'usual', push: 'usual', why, usual };
  }
  // (The biggest push the way the price has gone: a dear price is named by what made it dear, even where a push the other way, as a good harvest after a lost war, is bigger.)
  const sign = word === 'dear' ? 1 : -1;
  const pushes: Array<{ push: PriceWhy['push']; by: number }> = [
    { push: 'war', by: byWar },
    { push: 'festival', by: byFeast },
    { push: 'you', by: byYou },
    { push: 'harvest', by: byCrop },
  ];
  const best = pushes.some((x) => x.by * sign > 0) ? Math.max(...pushes.map((x) => x.by * sign)) : -1;
  const named = (x: number): boolean => (best > 0 ? x * sign === best : Math.abs(x) === big) && x !== 0;
  const first: PriceWhy['push'] = named(byWar) ? 'war' : named(byFeast) ? 'festival' : named(byYou) || (!named(byCrop) && Math.abs(byYou) >= Math.abs(byCrop)) ? 'you' : 'harvest';
  // (Two pushes the same way, the second at least half the first, as a festival in a city that has lost a war: both are named, the bigger first.)
  const second = best > 0 ? pushes.filter((x) => x.push !== first && x.by * sign >= Math.max(best * 0.5, usual * 0.03)).sort((a, b) => b.by * sign - a.by * sign)[0] : undefined;
  const why = `${pushWords(c, k, tick, first, byYou, w)}${second ? `, and ${pushWords(c, k, tick, second.push, byYou, w)}` : ''}`;
  return { arrow, word, push: first, why, usual };
}

/** One push on a price, in words: a war's, a festival's, yours, a harvest's. */
function pushWords(c: WorldCity, k: number, tick: number, push: PriceWhy['push'], byYou: number, w?: World): string {
  if (push === 'war') return warWords(c, k, w);
  if (push === 'festival') return feastWords(c.id, tick);
  if (push === 'you') {
    const n = dealtYear(c, k);
    // (When what is left of the push is more than all of the year's dealings, older trade must be in it too: say so.)
    const before = Math.abs(c.yours[k]) > Math.abs(n) && Math.sign(c.yours[k]) === Math.sign(n) ? ', and more before' : '';
    return n > 0 ? `you sold them ${fmtN(n)} in the last year${before}` : n < 0 ? `you bought ${fmtN(-n)} from them in the last year${before}` : byYou < 0 ? 'you sold them a good deal of it lately' : 'you bought a good deal of it from them lately';
  }
  const autumn = dateOfTick(tick).month >= HARVEST_MONTH ? 'this autumn' : 'last autumn';
  const h = c.harvest;
  return h === 0 ? `their harvest failed ${autumn}` : h === 1 ? `a poor harvest ${autumn}` : h === 3 ? `a good harvest ${autumn}` : h === 4 ? `a rich harvest ${autumn}` : `the harvest before last, still felt`;
}

/** A war's push on a city's prices, in words: "their war with Athens", "they lost their war with Athens", "the war with Athens, lately ended". (A good the war on now doesn't draw down, as oil or wine, is dear from the last war, if any.) */
function warWords(c: WorldCity, k: number, w?: World): string {
  const name = (id: string): string => PLACES[id as keyof typeof PLACES]?.name ?? id;
  if (c.war && STRIFE_SHARE[k] > 0) return `their war with ${name(c.war)}`;
  const last = w?.wars.filter((x) => x.ended > 0 && (x.a === c.id || x.b === c.id)).sort((x, y) => y.ended - x.ended)[0];
  if (!last) return c.war ? `their war with ${name(c.war)}` : 'a war, lately ended';
  const foe = last.a === c.id ? last.b : last.a;
  if (last.fate === c.id) return `their war with ${name(foe)}, which they won, is still felt`;
  if (last.fate === foe) return `they lost their war with ${name(foe)}`;
  return `the war with ${name(foe)}, lately ended`;
}

/** How the next harvest's fields look, from June until it comes in ('' before then). */
export function outlookWords(c: WorldCity, tick: number): string {
  const m = dateOfTick(tick).month;
  if (!c.ruler || m < OUTLOOK_MONTH || m >= HARVEST_MONTH) return '';
  return ['the fields look parched: the harvest may fail', 'the fields look poor', 'the fields look fair', 'the fields look good', 'the fields look rich'][c.outlook];
}

/**
 * The ruler's terms: how far their mood moves what they pay you and ask of
 * you, in whole percents (+ in your favour), a third of a percent per point
 * of mood, at most a fifth either way. None where there is no ruler.
 */
export function termsOf(c: WorldCity, tick: number): number {
  if (!c.ruler) return 0;
  return Math.max(-20, Math.min(20, Math.round(moodOf(c, tick) / 3)));
}

/**
 * Your price with a city for a hundred of a good: what they pay you for one
 * they buy (the market price, plus their terms), or ask of you for one they
 * sell (less their terms). The market price for one they neither buy nor sell.
 */
export function yourPrice(w: World, city: CityId, k: number, tick: number): number {
  return withTerms(cityOf(w, city), k, cityOf(w, city).price[k], tick);
}

/** A market price for a hundred of a good with a city's terms on it (yourPrice's). */
function withTerms(c: WorldCity, k: number, price: number, tick: number): number {
  const t = termsOf(c, tick);
  if (t === 0) return price;
  const { sells, buys } = sellsAndBuys(c);
  if (buys.includes(k)) return Math.max(1, Math.round((price * (100 + t)) / 100));
  if (sells.includes(k)) return Math.max(1, Math.round((price * (100 - t)) / 100));
  return price;
}

/** Your price with a city for a good if you sold it `n` more now (bought, if negative), before any of it wore off: where selling pushes it (for an offer's page). */
export function priceAfter(w: World, city: CityId, k: number, n: number, tick: number): number {
  const c = cityOf(w, city);
  if (!c.ruler) return yourPrice(w, city, k, tick);
  return withTerms(c, k, Math.max(1, Math.round(rawPrice(c, k, c.yours[k] + n))), tick);
}

// ---------------------------------------------------------------------------
// The Tyre ship on the map.

/** How long the ship takes between Tyre and the mouth of your gulf, each way. */
export const VOYAGE = 20 * TICKS_PER_DAY;

/**
 * Where the merchant ship from Tyre is on the map at a tick (fractions too),
 * as a distance along the Tyre lane from your city (0 at your quay, the lane's
 * length at Tyre), and which way she is heading. In the city she is between
 * your horizon (HORIZON_ALONG, the gulf's mouth) and the quay, exactly where
 * shipAt has her; beyond it she sails between the gulf and Tyre over VOYAGE,
 * arriving at the horizon just as the city first sees her sail, and leaving it
 * as her sail drops below it. With no post and no voyage, she is in Tyre.
 */
export function tyreShip(s: SimState, tick: number): { along: number; homeward: boolean; where: 'quay' | 'bay' | 'sea' | 'tyre' } {
  const ship = s.trade.ship;
  const L = lineLength(wayPoints(wayOf('tyre-sea')));
  const H = HORIZON_ALONG;
  if (ship.phase === SHIP_COMING || ship.phase === SHIP_LEAVING) {
    const at = shipAt(ship, tick);
    const inward = at ? at.inward : ship.phase === SHIP_COMING ? 0 : 1;
    return { along: H * (1 - inward), homeward: ship.phase === SHIP_LEAVING, where: 'bay' };
  }
  if (ship.phase === SHIP_MOORED) return { along: 0, homeward: false, where: 'quay' };
  // Away: sailing home after a visit, waiting in Tyre, or sailing out to you.
  const out = ship.since > 0 && ship.phase === SHIP_AWAY ? (tick - ship.since) / VOYAGE : Infinity;
  const inb = ship.due > 0 ? (tick - (ship.due - SAIL_IN - VOYAGE)) / VOYAGE : -Infinity;
  const outbound = out >= 0 && out < 1;
  // (Between ticks, just before she sets sail into the bay, she waits at the horizon.)
  const inbound = inb >= 0 && inb < 1 + 1 / VOYAGE;
  if (outbound && (!inbound || out < 1 - inb)) return { along: H + (L - H) * out, homeward: true, where: 'sea' };
  if (inbound) return { along: L - (L - H) * Math.min(1, inb), homeward: false, where: 'sea' };
  return { along: L, homeward: false, where: 'tyre' };
}
