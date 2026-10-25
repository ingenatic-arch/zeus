/**
 * Slice 48: every ware's little icon, in one place (the building panel's
 * stores and holdings; the household panel's oil, fleece and wine; an
 * estate's marble, armour and horses), for slice 50 to restyle together.
 * Drawn in code, in ware order (foods.ts' WARES).
 */
import type { Ware } from '../sim/foods';

const ic = (body: string, box = 24): string => `<svg viewBox="0 0 ${box} ${box}" class="ic" aria-hidden="true">${body}</svg>`;

/** Wheat: a sheaf, tied. */
const WHEAT_ICON = ic(
  '<path d="M12 21V9M12 21 8.4 11.4M12 21l3.6-9.6" stroke="#8a5a14" stroke-width="1.3" stroke-linecap="round" fill="none"/><path d="M12 2.6c1.5 1.4 1.5 4.4 0 6-1.5-1.6-1.5-4.6 0-6zM7.2 5.6c1.9.6 2.8 3.2 2 5.2-1.9-.6-2.8-3.2-2-5.2zM16.8 5.6c.8 2-.1 4.6-2 5.2-.8-2 .1-4.6 2-5.2z" fill="#e3b34a" stroke="#8a5a14" stroke-width="1"/><path d="M9.2 16.4h5.6" stroke="#6a4214" stroke-width="1.6" stroke-linecap="round"/>',
);
/** Meat: a haunch with its bone. */
const MEAT_ICON = ic(
  '<path d="M14.6 4.4c3.6-.4 6 2.4 5 5.8-.8 2.8-3.6 4.6-6.6 4.8l-3.4 3.4-2.2-2.2 3.4-3.4c.2-3 2-7.8 3.8-8.4z" fill="#c4553a" stroke="#6e2a1a" stroke-width="1.1" stroke-linejoin="round"/><path d="M15.4 7.4c1.4 0 2.2 1 1.8 2.4" fill="none" stroke="#f0b49a" stroke-width="1.1" stroke-linecap="round"/><path d="M8.4 16.6 5 20" stroke="#eee2c8" stroke-width="2.4" stroke-linecap="round"/><circle cx="4.4" cy="19" r="1.5" fill="#eee2c8" stroke="#8a7a5a" stroke-width=".8"/><circle cx="6" cy="20.6" r="1.5" fill="#eee2c8" stroke="#8a7a5a" stroke-width=".8"/>',
);
/** Cheese: a wheel with a wedge cut. */
const CHEESE_ICON = ic(
  '<path d="M3 11.5v4.6c0 2 4 3.6 9 3.6s9-1.6 9-3.6v-4.6" fill="#e8c25a" stroke="#8a6414" stroke-width="1.1"/><ellipse cx="12" cy="11.5" rx="9" ry="3.6" fill="#f6dc8a" stroke="#8a6414" stroke-width="1.1"/><path d="M12 11.5 20.4 10.2 21 15.4 12 16z" fill="#c89a2e" stroke="#8a6414" stroke-width=".9" stroke-linejoin="round"/><circle cx="7.4" cy="15.6" r=".9" fill="#a8801e"/><circle cx="9.8" cy="17.4" r=".7" fill="#a8801e"/>',
);
/** Olives: three on a sprig. */
const OLIVES_ICON = ic(
  '<path d="M4 6.4c3.6-1.6 9.6-1.6 16 2.4" fill="none" stroke="#5a4a22" stroke-width="1.2" stroke-linecap="round"/><path d="M7.4 5.6c-.4-2 1.2-3 2.8-2.4-.2 1.6-1.4 2.6-2.8 2.4zM15 6.6c1-1.8 2.8-2 3.8-.8-1 1.2-2.4 1.6-3.8.8z" fill="#7c9a3a" stroke="#3e4f12" stroke-width=".8"/><ellipse cx="8" cy="11.4" rx="2.6" ry="3.4" fill="#4a5a1e" stroke="#26300a" stroke-width="1"/><ellipse cx="13" cy="14" rx="2.6" ry="3.4" fill="#5e6e26" stroke="#26300a" stroke-width="1"/><ellipse cx="17.6" cy="11.8" rx="2.4" ry="3.2" fill="#4a5a1e" stroke="#26300a" stroke-width="1"/><path d="M7.2 10q.4-1 1.2-1.2M12.2 12.6q.4-1 1.2-1.2" stroke="#b8c878" stroke-width=".9" stroke-linecap="round"/>',
);
/** Oil: a jar with handles (as the household panel's). */
const OIL_ICON = ic(
  '<path d="M10.4 3h3.2l-.3 3.2c3.6.9 5.4 3.9 5.4 7.3 0 3.6-2.2 6.4-4.6 7.5H9.9C7.5 19.9 5.3 17.1 5.3 13.5c0-3.4 1.8-6.4 5.4-7.3z" fill="#8aa83a" stroke="#3e4f12" stroke-width="1.2" stroke-linejoin="round"/><path d="M7.8 6.8C6 6.6 5.4 8.4 6.6 9.6M16.2 6.8c1.8-.2 2.4 1.6 1.2 2.8" fill="none" stroke="#3e4f12" stroke-width="1.2" stroke-linecap="round"/><path d="M9 12.6q.4-2.4 2.2-3.2" fill="none" stroke="#d6e690" stroke-width="1.3" stroke-linecap="round"/>',
);
/** Fleece: a bale tied with blue cord (as the household panel's). */
const FLEECE_ICON = ic(
  '<path d="M5.2 14.6c-2.6-.4-3-4 -.4-4.8-.6-2.8 2.4-4.4 4.4-3 1-2.4 4.6-2.4 5.6 0 2-1.4 5 .2 4.4 3 2.6.8 2.2 4.4-.4 4.8.2 2.6-2.6 4.2-4.8 3-1.2 1.8-3.8 1.8-5 0-2.2 1.2-5-.4-4.8-3z" fill="#eee2c0" stroke="#8a744a" stroke-width="1.2" stroke-linejoin="round"/><path d="M11.4 4.6l.6 15" stroke="#4c5a8c" stroke-width="1.8" stroke-linecap="round"/>',
);
/** Grapes: a bunch (the household panel's wine). */
const GRAPES_ICON = ic(
  '<path d="M12.6 5.2c1.8-2.4 4.8-2.8 6.8-1.4-1.6 2.2-4 2.8-6.8 1.4z" fill="#6a9a34" stroke="#3a5a1a" stroke-width="1"/><path d="M11.6 6.6V3.4" stroke="#6a4a22" stroke-width="1.4" stroke-linecap="round"/><g fill="#7a2e80" stroke="#3e1240" stroke-width="1"><circle cx="7.6" cy="9" r="2.3"/><circle cx="12" cy="9" r="2.3"/><circle cx="16.4" cy="9" r="2.3"/><circle cx="9.8" cy="12.8" r="2.3"/><circle cx="14.2" cy="12.8" r="2.3"/><circle cx="12" cy="16.6" r="2.3"/></g>',
);
/** Wine: a tall amphora, dark red. */
const WINE_ICON = ic(
  '<path d="M10.6 2.8h2.8l-.2 2.6c1 .4 1.8 1.2 2.2 2.4.6 2 .4 5-.6 8-.6 1.8-1.4 3.4-2.8 5.2-1.4-1.8-2.2-3.4-2.8-5.2-1-3-1.2-6-.6-8 .4-1.2 1.2-2 2.2-2.4z" fill="#8a2a3a" stroke="#40101a" stroke-width="1.1" stroke-linejoin="round"/><path d="M10.4 6.4C8.4 6 7.6 7.8 8.8 9M13.6 6.4c2-.4 2.8 1.4 1.6 2.6" fill="none" stroke="#40101a" stroke-width="1.1" stroke-linecap="round"/><path d="M11 9.6q-.2 2.4.6 4.4" fill="none" stroke="#e08a9a" stroke-width="1.1" stroke-linecap="round"/>',
);
/** Copper: an ingot, the ox-hide shape. */
const COPPER_ICON = ic(
  '<path d="M3.6 7.4c2.4.8 4 .8 8.4.8s6-.1 8.4-.8c-.8 1.8-.8 3.4-.4 4.6.4 1.2.4 2.8.4 4.6-2.4-.8-4-.8-8.4-.8s-6 .1-8.4.8c0-1.8 0-3.4.4-4.6.4-1.2.4-2.8-.4-4.6z" fill="#c8743a" stroke="#6a3414" stroke-width="1.2" stroke-linejoin="round"/><path d="M7 10.4q5-1.2 10 0" fill="none" stroke="#f2b07a" stroke-width="1.2" stroke-linecap="round"/>',
);
/** Armour: a bronze breastplate (as an estate's). */
const ARMOUR_ICON = ic(
  '<path d="M6 4.4h12l-1 6.2c-.4 2.8 1 5 1 8.4H6c0-3.4 1.4-5.6 1-8.4z" fill="#c8963c" stroke="#5e4214" stroke-width="1.2" stroke-linejoin="round"/><path d="M9 4.4q3 3 6 0M12 9v8" fill="none" stroke="#5e4214" stroke-width="1.1"/>',
);
/** Marble: a white block (as an estate's). */
const MARBLE_ICON = ic(
  '<path d="M4 9.6 12 6l8 3.6v8L12 21l-8-3.4z" fill="#f2ede0" stroke="#7a7260" stroke-width="1.2" stroke-linejoin="round"/><path d="M4 9.6l8 3.4 8-3.4M12 13v8" fill="none" stroke="#7a7260" stroke-width="1.1"/>',
);
/** Timber: three logs stacked, their ends showing. */
const TIMBER_ICON = ic(
  '<g stroke="#5a3a1e" stroke-width="1.1"><path d="M4 15.2h14.4v4.4H4z" fill="#a8743e"/><path d="M6.4 10.6h14.4V15H6.4z" fill="#b8844a"/><circle cx="4.4" cy="17.4" r="2.3" fill="#e8c890"/><circle cx="6.8" cy="12.8" r="2.3" fill="#e8c890"/><path d="M8 6h10.4v4.4H8z" fill="#a8743e"/><circle cx="8.4" cy="8.2" r="2.3" fill="#e8c890"/></g><g fill="none" stroke="#a8743e" stroke-width=".8"><circle cx="4.4" cy="17.4" r="1"/><circle cx="6.8" cy="12.8" r="1"/><circle cx="8.4" cy="8.2" r="1"/></g>',
);
/** Horses: a horse's head (as an estate's). */
const HORSES_ICON = ic(
  '<path d="M7 21c.4-3.4 1.6-6 1-8.4-.4-1.6-2.4-2.4-3.4-3.8L7.6 5c1-.8 2.4-1.4 3.6-1.4l.6-1.8 1.4 1.6c3.6.8 6.2 4 6.6 8.2.2 3.2-.4 6.6-1.6 9.4z" fill="#8a5a34" stroke="#3a2412" stroke-width="1.1" stroke-linejoin="round"/><circle cx="9.6" cy="7.2" r=".9" fill="#1a120c"/>',
);

/** Each ware's icon, in ware order. */
export const WARE_ICONS: readonly string[] = [WHEAT_ICON, MEAT_ICON, CHEESE_ICON, OLIVES_ICON, OIL_ICON, FLEECE_ICON, GRAPES_ICON, WINE_ICON, COPPER_ICON, ARMOUR_ICON, MARBLE_ICON, TIMBER_ICON, HORSES_ICON];

/** A ware's icon (a scroll's blank for one without). */
export const wareIcon = (w: Ware): string => WARE_ICONS[w] ?? ic('<rect x="5" y="5" width="14" height="14" rx="3" fill="#e9cf98" stroke="#4a3420"/>');
