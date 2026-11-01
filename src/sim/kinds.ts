/**
 * Phase 7 review: a list naming every member of a union of names, checked when the game is compiled. A kind added to its
 * type and missed in the list a save is checked against made every save holding it unopenable (slice 59's 'legends' coin,
 * found in slice 61); a list written through this is refused by the compiler, which names the kind it misses. The list
 * itself is kept as written, in its order.
 */
export const allOf =
  <T extends string>() =>
  <const L extends readonly T[]>(list: L & ([Exclude<T, L[number]>] extends [never] ? unknown : { missing: Exclude<T, L[number]> })): readonly T[] =>
    list;
