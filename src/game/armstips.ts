/**
 * What the copper mine, armoury and barracks tools say where you would put
 * one (slice 23): what it would make or raise there, and what it needs.
 */
import type { CoastMap } from '../map/bake';
import { canSpare, COMPANY_SIZE, PER_BARRACKS, servingHomes } from '../sim/army';
import { copperOf, outcropPlace } from '../sim/build';
import { ARMOUR, COPPER, held } from '../sim/foods';
import { ARMOUR_COPPER, ARMOUR_MONTH, COPPER_MONTH } from '../sim/production';
import { ARMOURY_COPPER } from '../sim/stores';
import type { SimState } from '../sim/state';
import { SOLDIER_PAY } from '../sim/treasury';

const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const roundTen = (v: number): number => (v >= 100 ? Math.round(v / 10) * 10 : Math.round(v));
const has = (s: SimState, kind: string): boolean => s.buildings.some((b) => b.kind === kind);
const stored = (s: SimState, w: number): number => s.buildings.reduce((a, b) => a + (b.kind === 'storehouse' ? held(b, w) : 0), 0);

export function armsLines(s: SimState, map: CoastMap, kind: 'mine' | 'armoury' | 'barracks', x: number, z: number, side: number, road: boolean): { lines: string[]; warn: string } {
  const lines: string[] = [];
  let warn = '';
  if (kind === 'mine') {
    const rich = copperOf(map, x, z, side);
    lines.push(`About ${fmt(roundTen(COPPER_MONTH * rich))} measures of copper ore a month, fully worked: the richer the rock, the more · the copper ${outcropPlace(map, x + 1, z + 1)}`);
    if (!road) warn = 'No road beside it: its miners couldn’t get there and its carts couldn’t take the ore away. Lay a road along one side first.';
    else if (!has(s, 'storehouse')) lines.push('Its ox carts take the ore to a storehouse: build one too (G twice)');
    else if (!has(s, 'armoury')) lines.push(`An armoury (B ×3) hammers ${ARMOUR_COPPER} measures of copper into a set of armour`);
  } else if (kind === 'armoury') {
    lines.push(`Hammers up to ${fmt(ARMOUR_MONTH)} sets of armour a month, fully worked: a helmet, a breastplate, a round shield and a spear, from ${ARMOUR_COPPER} measures of copper a set (it holds ${fmt(ARMOURY_COPPER)} waiting)`);
    if (!road) warn = 'No road beside it: carts couldn’t bring the copper or take the armour away. Lay a road along one side first.';
    else if (!has(s, 'mine') && stored(s, COPPER) <= 0) lines.push('Its copper comes from the mines’ carts: build a copper mine on the green-streaked rock in the hills (B B), or buy copper from Sparta');
    else if (!has(s, 'storehouse')) lines.push('Its ox carts take the armour to a storehouse: build one too (G twice)');
    else lines.push('Its carts take the armour to a storehouse, where a barracks’ porter fetches it');
  } else {
    const serving = servingHomes(s);
    const homes = s.buildings.filter((b) => b.kind === 'home');
    const hoplites = homes.filter((b) => canSpare(s, b, 'hoplite', serving)).length;
    const archers = homes.filter((b) => canSpare(s, b, 'archer', serving)).length;
    lines.push(`Raises up to ${PER_BARRACKS} companies of ${COMPANY_SIZE}: hoplites from fine houses and villas, archers from townhouses and better, one man from a home, who leaves his work · ${SOLDIER_PAY} dr a man a month`);
    lines.push(`Homes that could send a man now: ${hoplites} for hoplites, ${archers} for archers`);
    const armour = stored(s, ARMOUR);
    if (armour > 0) lines.push(`${fmt(armour)} ${armour === 1 ? 'set' : 'sets'} of armour in the storehouses for the hoplites`);
    else lines.push('Each hoplite needs a set of armour from a storehouse: none yet. Build a copper mine and an armoury (B B, B ×3), or buy armour from Corinth or Athens; archers need none');
    if (!road) warn = 'No road beside it: its men and its porter need a road. Lay a road along one side first.';
  }
  return { lines, warn };
}
