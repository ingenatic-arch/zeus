/**
 * What the marble quarry and loggers' camp tools say where you would put one
 * (slice 32): how rich the marble is and what it would cut; how many trees
 * stand in reach, how long they would last and how fast they grow back.
 * Slice 35: the masons' yard and the monuments, what each takes and does.
 */
import type { CoastMap } from '../map/bake';
import { CAMP_REACH, campOutlook, LOGS_PER_TREE, MAX_LOGGERS, quarryOutlook, REGROW, timberWords } from '../sim/materials';
import { spanWords } from '../sim/materialstatus';
import type { SimState } from '../sim/state';
import { MAX_BUILDERS } from '../sim/monumentworks';
import { doesLine, materialName } from '../sim/monumentstatus';
import { MATERIALS, monumentOf, needOf, STAGES, totalOf, type MonumentKind } from '../sim/monuments';
import { TICKS_PER_DAY } from '../sim/clock';
import { TICKS_PER_MONTH } from '../sim/clock';

const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const roundTen = (v: number): number => (v >= 100 ? Math.round(v / 10) * 10 : Math.round(v));
const has = (s: SimState, kind: string): boolean => s.buildings.some((b) => b.kind === kind);

/** The words after the tool's name and price: the marble in the rock, or the trees in reach. */
export function worksHeadline(s: SimState, map: CoastMap, kind: WorksTool, x: number, z: number): string {
  if (kind === 'masons' || kind === 'lighthouse' || kind === 'colossus' || kind === 'stadium') return '';
  if (kind === 'quarry') return ` · marble in the rock ${Math.round(quarryOutlook(map, x, z).rich * 100)}%`;
  const o = campOutlook(map, s, { x, z }, MAX_LOGGERS);
  return ` · ${o.standing === 1 ? '1 tree' : `${fmt(o.standing)} trees`} in reach`;
}

/** The works line's placing tools: the quarry and the camp (slice 32), the masons' yard and the monuments (slice 35). */
export type WorksTool = 'quarry' | 'loggers' | 'masons' | MonumentKind;

/** A monument's stages and what they take, in a line: "Foundations 200 marble, 80 timber, 6 builders, 30 days; …". */
function stagesLine(kind: MonumentKind): string {
  return STAGES[kind]
    .map((st) => `${st.name.replace(/^The /, '')}: ${MATERIALS.filter((w) => needOf(st, w) > 0).map((w) => `${fmt(needOf(st, w))} ${materialName(w)}`).join(', ')}; ${st.builders} builders, ${Math.round(st.days)} days`)
    .join(' · ');
}

export function worksLines(s: SimState, map: CoastMap, kind: WorksTool, x: number, z: number, road: boolean): { lines: string[]; warn: string } {
  const lines: string[] = [];
  let warn = '';
  if (kind === 'masons') {
    lines.push(`Its builders (up to ${MAX_BUILDERS}, one for each two of its workers) walk to the monument being built nearest it by road, and work there until the stage is done`);
    if (!road) warn = 'No road beside it: its builders couldn’t get out. Lay a road along one side first.';
    else if (!s.monuments.sites.some((m) => !m.finished)) lines.push('No monument is marked out yet: they wait in the yard until one is');
    return { lines, warn };
  }
  if (kind === 'lighthouse' || kind === 'colossus' || kind === 'stadium') {
    const total = MATERIALS.filter((w) => totalOf(kind, w) > 0).map((w) => `${fmt(totalOf(kind, w))} ${materialName(w)}`).join(', ');
    const days = STAGES[kind].reduce((a, st) => a + st.days, 0);
    lines.push(`Built in three stages, each starting once its materials are all on site: ${total} in all, hauled from the storehouses by ox cart, and ${Math.round((days * TICKS_PER_DAY) / TICKS_PER_MONTH)} months of work with every builder there`);
    lines.push(stagesLine(kind));
    lines.push(`Finished: ${doesLine(kind)} · and every ruler in Greece admires it`);
    if (kind === 'colossus') lines.push('Its bronze is copper from the storehouses, cast on site by the armourers: an armoury with workers is needed for the bronze stages');
    if (!road) warn = 'No road beside it: the ox carts and the builders couldn’t reach it. Lay a road along one side first.';
    else if (!has(s, 'masons')) lines.push('Its builders come from a masons’ yard: build one too (or two: a stage goes as fast as the builders there)');
    if (monumentOf(s, kind)) warn = 'Your city already has one.';
    return { lines, warn };
  }
  if (kind === 'quarry') {
    const o = quarryOutlook(map, x, z);
    lines.push(`About ${fmt(roundTen(o.blocks))} blocks of marble a month, fully worked: the richer the rock, the faster its quarrymen cut · the pale stone ${o.place}`);
    lines.push('Its sledges are slow: a storehouse close by keeps the stack from filling');
    if (!road) warn = 'No road beside it: its quarrymen couldn’t get there and its sledges couldn’t take the blocks away. Lay a road along one side first.';
    else if (!has(s, 'storehouse')) lines.push('Its ox sledges take the blocks to a storehouse: build one too (Shift G twice)');
  } else {
    const o = campOutlook(map, s, { x, z }, MAX_LOGGERS);
    const tw = timberWords(map).many; // (Merge of slice 46: the oaks named where the land has them.)
    lines.push(`${tw[0].toUpperCase()}${tw.slice(1)} within ${CAMP_REACH} tiles: ${fmt(o.standing)} standing${o.felled ? `, ${fmt(o.felled)} felled and growing back` : ''} · the olive trees are Athena’s, and left alone`);
    if (o.standing > 0) {
      const lasts = o.lasts < 120 ? `: at that pace the wood in reach is gone in about ${spanWords(o.lasts * TICKS_PER_MONTH)}` : '';
      lines.push(`About ${fmt(roundTen(o.logsMonth))} logs a month fully worked (${LOGS_PER_TREE} a tree)${lasts}, and a felled tree takes ${spanWords(REGROW)} to grow back`);
    }
    if (!road) warn = 'No road beside it: its loggers couldn’t get there and its carts couldn’t take the logs away. Lay a road along one side first.';
    else if (!has(s, 'storehouse')) lines.push('Its ox carts take the logs to a storehouse: build one too (Shift G twice)');
  }
  return { lines, warn };
}
