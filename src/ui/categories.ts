/**
 * The side panel's tabs, as in the original game's control panel: a tab for
 * each kind of building, holding the buttons to build that kind and, below
 * them, the state of that part of the city. A building a later slice adds is
 * one entry in a tab's `tools` (the categories test checks none is left
 * out).
 */
import type { ToolName } from '../game/tools';
import type { OverlayMode } from '../render/overlay';
import { ICONS } from './buildbar';

export type Category = 'population' | 'husbandry' | 'industry' | 'distribution' | 'safety' | 'administration' | 'culture' | 'mythology' | 'military' | 'monuments';

export interface CategoryInfo {
  id: Category;
  /** Its name, cut into the lintel over its buildings. */
  title: string;
  /** What the tab's tip says it holds. */
  tip: string;
  /** Its picture on the tab. */
  icon: string;
  /** Its buildings, in the order of their keys. */
  tools: ToolName[];
  /** The overlays that show its part of the city. */
  overlays: OverlayMode[];
}

const PEOPLE = '<svg viewBox="0 0 20 16"><circle cx="7" cy="4" r="2.6" class="f"/><path d="M2.4 15c0-3.6 2-6 4.6-6s4.6 2.4 4.6 6z" class="f"/><circle cx="14" cy="5.2" r="2.1" class="f"/><path d="M12.6 15c.1-2.4-.4-4.2-1.3-5.2.8-.5 1.6-.7 2.7-.7 2.2 0 3.8 2 3.8 5.9z" class="f"/></svg>';

// A crested Corinthian helmet; the barracks' shield reads as a ring at tab size.
const HELMET = '<svg viewBox="0 0 24 24"><path d="M12 4.6c-4.4 0-7.4 3-7.4 7.4V19.4c0 .9.7 1.6 1.6 1.6h3.3v-5.2L7.2 14.6v-2.2h4.1V21h1.4v-8.6h4.1v2.2l-2.3 1.2V21h3.3c.9 0 1.6-.7 1.6-1.6V12c0-4.4-3-7.4-7.4-7.4z" class="f"/><path d="M5.2 6.6C6.6 3.4 9 1.8 12 1.8s5.4 1.6 6.8 4.8" class="s"/></svg>';

// Slice 35: a fluted column with its capital, for the Monuments tab.
const COLUMN = '<svg viewBox="0 0 24 24"><path d="M4.4 3h15.2l-1.8 2.6H6.2z" class="f"/><path d="M7.4 6.2h9.2v12.4H7.4z" class="f"/><path d="M10.2 7v10.8M13.8 7v10.8" class="s"/><path d="M5 19.2h14l1.4 2.2H3.6z" class="f"/></svg>';

export const CATEGORIES: readonly CategoryInfo[] = [
  { id: 'population', title: 'Population', tip: 'Population: housing, who lives here and who has work', icon: PEOPLE, tools: ['housing'], overlays: ['missing'] },
  { id: 'husbandry', title: 'Husbandry', tip: 'Husbandry: farms, herds, groves and vineyards, and what the land gives', icon: ICONS.farm, tools: ['farm', 'lodge', 'dairy', 'grove', 'pasture', 'vineyard'], overlays: ['food', 'variety'] },
  { id: 'industry', title: 'Industry', tip: 'Industry: the presses, wineries, mines and armouries, the quarries and the loggers’ camps, and what they make', icon: ICONS.press, tools: ['press', 'winery', 'mine', 'armoury', 'quarry', 'loggers'], overlays: ['oil', 'wine'] },
  { id: 'distribution', title: 'Distribution', tip: 'Distribution: granaries, storehouses, the agora and its stalls, and trade; every good in the city', icon: ICONS.granary, tools: ['granary', 'storehouse', 'agora', 'stall', 'fleecestall', 'winestall', 'trading', 'yard'], overlays: ['food', 'oil', 'fleece', 'wine'] },
  { id: 'safety', title: 'Hygiene and safety', tip: 'Hygiene and safety: fountains, the watch and the architects; water, fire, wear and crime', icon: ICONS.fountain, tools: ['fountain', 'watchpost', 'architect'], overlays: ['water', 'fire', 'wear', 'crime'] },
  { id: 'administration', title: 'Administration', tip: 'Administration: the tax office; the treasury, taxes and the ledger', icon: ICONS.taxoffice, tools: ['taxoffice'], overlays: ['tax'] },
  { id: 'culture', title: 'Culture', tip: 'Culture: the theatre, and the homes that have plays', icon: ICONS.theatre, tools: ['theatre'], overlays: ['culture'] },
  { id: 'mythology', title: 'Mythology', tip: 'Mythology: the shrines, and the homes they bless', icon: ICONS.shrine, tools: ['shrine'], overlays: ['religion'] },
  { id: 'military', title: 'Military', tip: 'Military: the barracks, the walls and towers, the shipyard, the companies, the triremes and the city’s strength', icon: HELMET, tools: ['barracks', 'wall', 'tower', 'shipyard'], overlays: [] },
  // Slice 35.
  { id: 'monuments', title: 'Monuments', tip: 'Monuments: the masons’ yard, the Lighthouse, the Colossus and the Stadium, how far along each is and what it waits for', icon: COLUMN, tools: ['masons', 'lighthouse', 'colossus', 'stadium'], overlays: [] },
];

/** The tools on the panel's head rather than in a tab. */
export const HEAD_TOOLS: readonly ToolName[] = ['road', 'clear'];

/** The tab a tool is in. */
export function categoryOf(t: ToolName): CategoryInfo | undefined {
  return CATEGORIES.find((c) => c.tools.includes(t));
}

/** The side panel's old tab names, still used by demo links and the probe. */
export const OLD_TABS: Record<string, Category> = { goods: 'distribution', people: 'population', services: 'safety', money: 'administration', army: 'military' };
