/**
 * What the marble quarry and loggers' camp tools say where you would put one
 * (slice 32): how rich the marble is and what it would cut; how many trees
 * stand in reach, how long they would last and how fast they grow back.
 */
import type { CoastMap } from '../map/bake';
import { CAMP_REACH, campOutlook, LOGS_PER_TREE, MAX_LOGGERS, quarryOutlook, REGROW } from '../sim/materials';
import { spanWords } from '../sim/materialstatus';
import type { SimState } from '../sim/state';
import { TICKS_PER_MONTH } from '../sim/clock';

const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const roundTen = (v: number): number => (v >= 100 ? Math.round(v / 10) * 10 : Math.round(v));
const has = (s: SimState, kind: string): boolean => s.buildings.some((b) => b.kind === kind);

/** The words after the tool's name and price: the marble in the rock, or the trees in reach. */
export function worksHeadline(s: SimState, map: CoastMap, kind: 'quarry' | 'loggers', x: number, z: number): string {
  if (kind === 'quarry') return ` · marble in the rock ${Math.round(quarryOutlook(map, x, z).rich * 100)}%`;
  const o = campOutlook(map, s, { x, z }, MAX_LOGGERS);
  return ` · ${o.standing === 1 ? '1 tree' : `${fmt(o.standing)} trees`} in reach`;
}

export function worksLines(s: SimState, map: CoastMap, kind: 'quarry' | 'loggers', x: number, z: number, road: boolean): { lines: string[]; warn: string } {
  const lines: string[] = [];
  let warn = '';
  if (kind === 'quarry') {
    const o = quarryOutlook(map, x, z);
    lines.push(`About ${fmt(roundTen(o.blocks))} blocks of marble a month, fully worked: the richer the rock, the faster its quarrymen cut · the pale stone ${o.place}`);
    lines.push('Its sledges are slow: a storehouse close by keeps the stack from filling');
    if (!road) warn = 'No road beside it: its quarrymen couldn’t get there and its sledges couldn’t take the blocks away. Lay a road along one side first.';
    else if (!has(s, 'storehouse')) lines.push('Its ox sledges take the blocks to a storehouse: build one too (G twice)');
  } else {
    const o = campOutlook(map, s, { x, z }, MAX_LOGGERS);
    lines.push(`Pines and cypresses within ${CAMP_REACH} tiles: ${fmt(o.standing)} standing${o.felled ? `, ${fmt(o.felled)} felled and growing back` : ''} · the olive trees are Athena’s, and left alone`);
    if (o.standing > 0) {
      const lasts = o.lasts < 120 ? `: at that pace the wood in reach is gone in about ${spanWords(o.lasts * TICKS_PER_MONTH)}` : '';
      lines.push(`About ${fmt(roundTen(o.logsMonth))} logs a month fully worked (${LOGS_PER_TREE} a tree)${lasts}, and a felled tree takes ${spanWords(REGROW)} to grow back`);
    }
    if (!road) warn = 'No road beside it: its loggers couldn’t get there and its carts couldn’t take the logs away. Lay a road along one side first.';
    else if (!has(s, 'storehouse')) lines.push('Its ox carts take the logs to a storehouse: build one too (G twice)');
  }
  return { lines, warn };
}
