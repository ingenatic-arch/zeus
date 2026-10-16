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
import type { Building, Walker } from './state';

export const WHEAT = 0;
export const MEAT = 1;
export const CHEESE = 2;
export type Food = 0 | 1 | 2;
export const FOODS: readonly Food[] = [WHEAT, MEAT, CHEESE];

/** Each food by name, as it is stored and carried. */
export const FOOD_NAMES = ['wheat', 'meat', 'cheese'] as const;
/** Each food as it is eaten: bread, meat, cheese. */
export const TABLE_NAMES = ['bread', 'meat', 'cheese'] as const;

/** Kinds of food each level of home needs on its table (plot, tent, hut, cottage, townhouse, fine house). */
export const KINDS_NEEDED = [0, 0, 0, 1, 2, 3];
export const kindsNeeded = (level: number): number => KINDS_NEEDED[Math.max(0, Math.min(level, KINDS_NEEDED.length - 1))];

/** A building's store of a food. */
export function held(b: Building, f: Food): number {
  return f === WHEAT ? b.stock : f === MEAT ? b.meat : b.cheese;
}

export function setHeld(b: Building, f: Food, v: number): void {
  if (f === WHEAT) b.stock = v;
  else if (f === MEAT) b.meat = v;
  else b.cheese = v;
}

/** Room in a granary that carts on their way have reserved for a food. */
export function coming(b: Building, f: Food): number {
  return f === WHEAT ? b.incoming : f === MEAT ? b.meatIn : b.cheeseIn;
}

export function addComing(b: Building, f: Food, n: number): void {
  if (f === WHEAT) b.incoming += n;
  else if (f === MEAT) b.meatIn += n;
  else b.cheeseIn += n;
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

/** Which food each kind of building makes: a farm wheat, a lodge meat, a dairy cheese (-1: none). */
export function foodMadeBy(kind: Building['kind']): Food | -1 {
  return kind === 'farm' ? WHEAT : kind === 'lodge' ? MEAT : kind === 'dairy' ? CHEESE : -1;
}

/** "bread", "bread and cheese", "bread, meat and cheese". */
export function foodList(fs: readonly Food[], join = 'and'): string {
  const w = fs.map((f) => TABLE_NAMES[f]);
  if (w.length <= 1) return w[0] ?? '';
  return `${w.slice(0, -1).join(', ')} ${join} ${w[w.length - 1]}`;
}
