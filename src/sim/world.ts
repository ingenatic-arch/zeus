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
 * of it sells cheap, what it is short of it pays well for. Prices are steady
 * for now (slice 17 moves them); a year of monthly prices is kept for the
 * chart. Tyre keeps the merchant ship's steady prices.
 *
 * Pure: plain data in, plain data out; only `world.rng` is drawn from.
 */
import { CITY_IDS, HORIZON_ALONG, lineLength, PLACES, RULED, wayOf, wayPoints, type CityId } from '../map/greece';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { nextFloat, nextInt, seedRng, type RngState } from './rng';
import type { Memory, Ruler, SimState, Trait, World, WorldCity } from './state';
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
const OLD_TIES: Partial<Record<CityId, readonly number[]>> = {
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
  c.stock = c.need.map((n) => Math.round(n / 2));
  c.price = ch ? c.make.map((m, k) => marketPrice(k, m, c.need[k])) : PRICES.slice();
  c.history = c.price.map((p) => new Array<number>(12).fill(p));
}

/** What a city pays or asks for a hundred measures of a trade good, from what it makes and uses: dearer the shorter it is. */
export function marketPrice(k: number, make: number, need: number): number {
  const short = make + need > 0 ? (need - make) / (need + make) : 0;
  return Math.max(1, Math.round(PRICES[k] * (1 + 0.45 * short)));
}

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
    make: [],
    need: [],
    stock: [],
    price: [],
    history: [],
    harvest: 2,
    festival: 0,
    war: '',
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
  return { seed, rng, name: DEFAULT_NAME, cities, routes: [], deals: [], travellers: [], news: [] };
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

/** Once a month: each city's prices go into its year of history, and memories faded to nothing are let go. */
export function stepWorld(s: SimState): void {
  if (s.tick % TICKS_PER_MONTH !== 0) return;
  for (const c of s.world.cities) {
    c.history.forEach((h, k) => {
      h.shift();
      h.push(c.price[k]);
    });
    if (c.memories.some((m) => m.fade > 0 && s.tick - m.tick >= m.fade)) c.memories = c.memories.filter((m) => m.fade <= 0 || s.tick - m.tick < m.fade);
  }
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
