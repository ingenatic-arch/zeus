/**
 * The three foods: wheat (eaten as bread), meat and cheese, in measures, in
 * a fixed order (saved by index). A building keeps wheat in `stock` (a farm's
 * barn, a granary, the agora's stall) and meat and cheese in `meat` and
 * `cheese` (a lodge's or a dairy's store too); a granary's room reserved by
 * carts on their way is `incoming`, `meatIn` and `cheeseIn`. A home has each
 * food until a tick: `foodUntil` (bread), `meatUntil`, `cheeseUntil`. A
 * cart carries one food (`food`, in `load`); the porter carries wheat in
 * `load` and meat and cheese in `meat` and `cheese`.
 *
 * A home's food need is met by its level's number of kinds (a cottage one, a
 * townhouse two, a fine house all three): it lasts until the k-th longest
 * lasting of its foods runs out. A person eats a measure a month in all,
 * shared across the kinds on the table.
 */
import type { Building, Service, Walker } from './state';

export const WHEAT = 0;
export const MEAT = 1;
export const CHEESE = 2;
export type Food = 0 | 1 | 2;
export const FOODS: readonly Food[] = [WHEAT, MEAT, CHEESE];

/**
 * Every ware carried and stored, in a fixed order (saved by index): the
 * three foods, then the goods (see goods.ts): olives, oil, fleece, grapes,
 * wine, then copper and armour. A building keeps foods in their own fields and goods in `goods`
 * (one number per good, from FIRST_GOOD); a cart carries one ware.
 */
export const OLIVES = 3;
export const OIL = 4;
export const FLEECE = 5;
export const GRAPES = 6;
export const WINE = 7;
/** Copper ore, dug from the hills (slice 23), and armour (a helmet, a breastplate, a round shield and a spear: one set a man), made from it at the armoury. */
export const COPPER = 8;
export const ARMOUR = 9;
export type Ware = number;
export const FIRST_GOOD = OLIVES;
/** How many goods there are (the length of a building's `goods`, `goodsIn` and `goodsUntil`). */
export const GOOD_COUNT = 7;
export const WARES: readonly Ware[] = [WHEAT, MEAT, CHEESE, OLIVES, OIL, FLEECE, GRAPES, WINE, COPPER, ARMOUR];
/** Each ware by name, as it is stored and carried. */
export const WARE_NAMES = ['wheat', 'meat', 'cheese', 'olives', 'oil', 'fleece', 'grapes', 'wine', 'copper', 'armour'] as const;
/** The goods homes buy from a stall, by the need each is (see goods.ts), and back. */
export const SERVICE_GOOD: Partial<Record<Service, Ware>> = { oil: OIL, fleece: FLEECE, wine: WINE };
export const GOOD_SERVICE: Partial<Record<Ware, Service>> = { [OIL]: 'oil', [FLEECE]: 'fleece', [WINE]: 'wine' };
/** Is a ware a good (rather than a food)? */
export const isGood = (w: Ware): boolean => w >= FIRST_GOOD;
/** A good's place in a building's `goods` arrays. */
export const gi = (w: Ware): number => w - FIRST_GOOD;
/** A fresh, empty set of goods for a building. */
export const noGoods = (): number[] => new Array<number>(GOOD_COUNT).fill(0);

/** Each food by name, as it is stored and carried. */
export const FOOD_NAMES = ['wheat', 'meat', 'cheese'] as const;
/** Each food as it is eaten: bread, meat, cheese. */
export const TABLE_NAMES = ['bread', 'meat', 'cheese'] as const;

/** Kinds of food each level of home needs on its table (plot, tent, hut, cottage, townhouse, fine house, villa). */
export const KINDS_NEEDED = [0, 0, 0, 1, 2, 3, 3];
export const kindsNeeded = (level: number): number => KINDS_NEEDED[Math.max(0, Math.min(level, KINDS_NEEDED.length - 1))];

/** A building's store of a ware. */
export function held(b: Building, f: Ware): number {
  return f === WHEAT ? b.stock : f === MEAT ? b.meat : f === CHEESE ? b.cheese : b.goods[f - FIRST_GOOD];
}

export function setHeld(b: Building, f: Ware, v: number): void {
  if (f === WHEAT) b.stock = v;
  else if (f === MEAT) b.meat = v;
  else if (f === CHEESE) b.cheese = v;
  else b.goods[f - FIRST_GOOD] = v;
}

/** Room in a store that carts on their way have reserved for a ware. */
export function coming(b: Building, f: Ware): number {
  return f === WHEAT ? b.incoming : f === MEAT ? b.meatIn : f === CHEESE ? b.cheeseIn : b.goodsIn[f - FIRST_GOOD];
}

export function addComing(b: Building, f: Ware, n: number): void {
  if (f === WHEAT) b.incoming += n;
  else if (f === MEAT) b.meatIn += n;
  else if (f === CHEESE) b.cheeseIn += n;
  else b.goodsIn[f - FIRST_GOOD] += n;
}

/** What the porter carries of a food (wheat in `load`). */
export function carried(w: Walker, f: Food): number {
  return f === WHEAT ? w.load : f === MEAT ? w.meat : w.cheese;
}

export function setCarried(w: Walker, f: Food, v: number): void {
  if (f === WHEAT) w.load = v;
  else if (f === MEAT) w.meat = v;
  else w.cheese = v;
}

/** The tick a home's supply of a food lasts until (0: it has never had any). */
export function foodUntil(b: Building, f: Food): number {
  return f === WHEAT ? b.foodUntil : f === MEAT ? b.meatUntil : b.cheeseUntil;
}

export function setFoodUntil(b: Building, f: Food, v: number): void {
  if (f === WHEAT) b.foodUntil = v;
  else if (f === MEAT) b.meatUntil = v;
  else b.cheeseUntil = v;
}

/** The tick the k-th longest lasting of three supplies runs out (k from 1; the best for k ≤ 1). */
export function nth(a: number, b: number, c: number, k: number): number {
  const hi = Math.max(a, b, c);
  if (k <= 1) return hi;
  const lo = Math.min(a, b, c);
  if (k >= 3) return lo;
  return a + b + c - hi - lo;
}

/**
 * The tick a home's food lasts until for a level's needs: the k-th longest
 * lasting of its foods, k the kinds that level needs (at least one).
 */
export function tableUntil(b: Building, level: number = b.level): number {
  return nth(b.foodUntil, b.meatUntil, b.cheeseUntil, Math.max(1, kindsNeeded(level)));
}

/** How many kinds of food a home has on its table now. */
export function onTable(b: Building, tick: number): number {
  return (b.foodUntil > tick ? 1 : 0) + (b.meatUntil > tick ? 1 : 0) + (b.cheeseUntil > tick ? 1 : 0);
}

/** The foods on a home's table now, in order. */
export function foodsOnTable(b: Building, tick: number): Food[] {
  return FOODS.filter((f) => foodUntil(b, f) > tick);
}


/** "bread", "bread and cheese", "bread, meat and cheese". */
export function foodList(fs: readonly Food[], join = 'and'): string {
  const w = fs.map((f) => TABLE_NAMES[f]);
  if (w.length <= 1) return w[0] ?? '';
  return `${w.slice(0, -1).join(', ')} ${join} ${w[w.length - 1]}`;
}
