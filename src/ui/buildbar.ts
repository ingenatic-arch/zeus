import type { ToolName, ToolTip } from '../game/tools';
import {
  AGORA_COST,
  BRIDGE_COST,
  DAIRY_COST,
  FARM_COST,
  FOUNTAIN_COST,
  GRANARY_COST,
  GROVE_COST,
  LODGE_COST,
  PASTURE_COST,
  PLOT_COST,
  PRESS_COST,
  ROAD_COST,
  SHRINE_COST,
  STALL_COST,
  STOREHOUSE_COST,
  TAX_OFFICE_COST,
  WATCHPOST_COST,
  ARCHITECT_COST,
  CLEAR_SMALL,
  CLEAR_BIG,
  THEATRE_COST,
  TRADING_COST,
  YARD_COST,
  VINEYARD_COST,
  WINERY_COST,
} from '../sim/build';
import type { OverlayMode } from '../render/overlay';

type ButtonName = ToolName | 'undo' | OverlayMode;

const ICONS: Record<ButtonName, string> = {
  // Paving stones running off into the distance.
  road: '<svg viewBox="0 0 24 24"><path d="M9 3h6l5 18H4z" class="fill-soft"/><path d="M11 6h2v3h-2zM10.6 11h2.8v3.4h-2.8zM10.1 16.6h3.8v3.6h-3.8z" class="fill-ink"/></svg>',
  // A tent.
  housing: '<svg viewBox="0 0 24 24"><path d="M12 4 2.5 20h19z" class="fill-soft"/><path d="M12 9.5 8.4 20h7.2z" class="fill-ink"/><path d="M12 4v-1.6" class="stroke-ink"/><path d="M2 20.6h20" class="stroke-ink"/></svg>',
  // A basin on a column, spilling water.
  fountain:
    '<svg viewBox="0 0 24 24"><path d="M3.5 15.5h17l-1.6 4.5H5.1z" class="fill-soft"/><path d="M11 7.5h2v8h-2z" class="fill-ink"/><path d="M7.6 6.2h8.8c-.4 1.6-2.2 2.4-4.4 2.4S8 7.8 7.6 6.2z" class="fill-soft"/><path d="M8.2 8.2c-1.4 1.6-2 3.6-2.2 6M15.8 8.2c1.4 1.6 2 3.6 2.2 6" class="stroke-water"/></svg>',
  // A sheaf of wheat.
  farm: '<svg viewBox="0 0 24 24"><path d="M12 21V8M12 21l-4.5-9M12 21l4.5-9" class="stroke-ink"/><path d="M12 2.6c1.6 1.4 1.6 4.2 0 5.6-1.6-1.4-1.6-4.2 0-5.6zM7 6.4c2 .5 3 2.9 2.3 4.9-2-.5-3-2.9-2.3-4.9zM17 6.4c.7 2-.3 4.4-2.3 4.9-.7-2 .3-4.4 2.3-4.9z" class="fill-gold"/><path d="M8.6 16.4h6.8" class="stroke-ink"/></svg>',
  // A stag's antlers over a spear.
  lodge:
    '<svg viewBox="0 0 24 24"><path d="M5 21 19 5" class="stroke-ink"/><path d="M19 5l-3.2.6 2.6 2.6z" class="fill-ink"/><path d="M12 13.4c-1-2.6-3.4-4-3.6-7.4M9.6 9.2 6.8 8.4M8.6 6.4 6.4 4.4M12 13.4c1-2.6 3.4-4 3.6-7.4M14.4 9.2l2.8-.8M15.4 6.4l2.2-2" class="stroke-meat"/><ellipse cx="12" cy="15.2" rx="2.4" ry="3" class="fill-meat"/></svg>',
  // A wheel of cheese with a wedge cut out.
  dairy:
    '<svg viewBox="0 0 24 24"><path d="M3 11.5v4.6c0 2 4 3.6 9 3.6s9-1.6 9-3.6v-4.6" class="fill-cheese"/><ellipse cx="12" cy="11.5" rx="9" ry="3.6" class="fill-soft"/><path d="M12 11.5 20.4 10.2 21 15.4 12 16z" class="fill-ink"/><circle cx="7.4" cy="15.6" r=".9" class="fill-ink"/><circle cx="9.8" cy="17.4" r=".7" class="fill-ink"/></svg>',
  // An olive tree: a gnarled trunk under a silvery crown, dark olives in it.
  grove:
    '<svg viewBox="0 0 24 24"><path d="M11.2 21c.4-2.6-.6-4.4-2-6.2l1.6-.6c.8 1 1.2 1.8 1.4 2.6.4-1.4 1.2-2.6 2.4-3.4l1.2 1c-1.6 1.2-2.4 3.2-2.2 6.6z" class="fill-ink"/><path d="M4.4 10.6c-.6-3.4 2.4-6.6 6-6 1.6-1.8 5-1.6 6.4.4 2.6.2 4 2.8 3 5-.2 2.6-2.8 3.8-5 3.2-1.4 1.4-4 1.6-5.6.4-2.4.8-4.6-.6-4.8-3z" class="fill-olive"/><circle cx="9" cy="9.4" r="1.1" class="fill-ink"/><circle cx="14.4" cy="8.2" r="1.1" class="fill-ink"/><circle cx="16.6" cy="11" r="1.1" class="fill-ink"/><path d="M3 21.2h18" class="stroke-ink"/></svg>',
  // An olive press: a round basin with an upright millstone and its pole.
  press:
    '<svg viewBox="0 0 24 24"><path d="M2.6 15.4c0-1.6 4.2-2.8 9.4-2.8s9.4 1.2 9.4 2.8v2.8c0 1.6-4.2 2.8-9.4 2.8s-9.4-1.2-9.4-2.8z" class="fill-soft"/><ellipse cx="12" cy="15.4" rx="6.4" ry="1.7" class="fill-oil"/><path d="M12 6.4v9" class="stroke-ink"/><path d="M3.6 8.4 20.4 6" class="stroke-ink"/><rect x="8.6" y="8.8" width="6.8" height="6.6" rx="3.3" class="fill-soft"/><circle cx="12" cy="12.1" r="1.2" class="fill-ink"/></svg>',
  // A walled yard with jars standing in it.
  storehouse:
    '<svg viewBox="0 0 24 24"><path d="M2.6 21V10.4h18.8V21z" class="fill-soft"/><path d="M2 10.6 5 6.4h14l3 4.2z" class="fill-ink"/><path d="M6.6 20.6c-1.6-.6-2-2.2-1.6-3.6.3-1 1-1.6 1.6-1.8v-1h2v1c.6.2 1.3.8 1.6 1.8.4 1.4 0 3-1.6 3.6zM13.8 20.6c-1.6-.6-2-2.2-1.6-3.6.3-1 1-1.6 1.6-1.8v-1h2v1c.6.2 1.3.8 1.6 1.8.4 1.4 0 3-1.6 3.6z" class="fill-oil"/><path d="M19.4 21v-6" class="stroke-ink"/></svg>',
  // A merchant ship under a square sail, on the water.
  trading:
    '<svg viewBox="0 0 24 24"><path d="M12 2.6v13" class="stroke-ink"/><path d="M6.4 4.6h11.2l-1 8.2H7.4z" class="fill-soft"/><path d="M9.8 4.6l-.4 8.2M14.2 4.6l.4 8.2" class="stroke-gold"/><path d="M2.6 15.2h18.8c-.8 2.8-3.2 4.4-6 4.4H7.8c-2.6 0-4.6-1.6-5.2-4.4z" class="fill-ink"/><path d="M2 21.6c1.6-.9 3.2-.9 4.8 0s3.2.9 4.8 0 3.2-.9 4.8 0 3.2.9 4.8 0" class="stroke-water"/></svg>',
  // A pack donkey with its two panniers.
  yard:
    '<svg viewBox="0 0 24 24"><path d="M5.4 12.2c0-1.6 1.4-2.6 3.2-2.6h7.6c1 0 1.6-.6 2-1.6l.8-2.4 1.6.2.4 1.6 1.4 1.8-.8 1.4-1.8-.4-.8 1.6c-.4 1-.8 1.8-1.8 2.4V21h-1.8v-4.6H9.4V21H7.6v-5.4c-1.4-.6-2.2-1.8-2.2-3.4z" class="fill-ink"/><path d="M4.4 12.4l-1.8 3" class="stroke-ink"/><path d="M8 6.4h6.4l.6 7.4H7.4z" class="fill-soft"/><path d="M8.2 9.6h6.4" class="stroke-gold"/><path d="M1.6 21.2h20.8" class="stroke-ink"/></svg>',
  // A stall under a striped awning, with a jar of oil.
  stall:
    '<svg viewBox="0 0 24 24"><path d="M3 9.5 5 4h14l2 5.5z" class="fill-soft"/><path d="M8.6 4 7.8 9.5M12 4v5.5M15.4 4l.8 5.5" class="stroke-ink"/><path d="M5 9.5V20M19 9.5V20" class="stroke-ink"/><path d="M6.5 17.2h11V20h-11z" class="fill-soft"/><path d="M10.6 17.2c-1.6-.6-2-2.2-1.6-3.6.3-1 1-1.6 1.6-1.8v-1h2.8v1c.6.2 1.3.8 1.6 1.8.4 1.4 0 3-1.6 3.6z" class="fill-oil"/></svg>',
  // A sheep: a woolly cloud on four legs.
  pasture:
    '<svg viewBox="0 0 24 24"><path d="M7.6 16.4v4M10.4 16.6v4M14.6 16.6v4M17.2 16.4v4" class="stroke-ink"/><path d="M5.4 12.6c-.6-2.6 1.6-4.6 3.8-4 1-1.8 4-2 5.4-.4 2.2-.6 4.4 1.2 4 3.6 1.4 1.4.6 4-1.6 4.4-1 1.4-3.2 1.6-4.6.8-1.4 1-3.8.8-4.8-.4-2 .2-3.4-2.2-2.2-4z" class="fill-wool"/><path d="M3 10.4c-.6-1.8.6-3.4 2.4-3.4 1.4 0 2.4 1 2.4 2.4 0 1.8-1.4 3.2-2.8 3.2-1 0-1.6-.8-2-2.2z" class="fill-ink"/><path d="M2.6 21.2h18.8" class="stroke-ink"/></svg>',
  // A bunch of grapes under a vine leaf.
  vineyard:
    '<svg viewBox="0 0 24 24"><path d="M12 3.4v3.4" class="stroke-ink"/><path d="M12 6.6c1.2-2.6 4.8-3.6 7-2-.4 2.8-3.4 4.6-7 2z" class="fill-olive"/><circle cx="9" cy="9.6" r="2.1" class="fill-grape"/><circle cx="13.2" cy="9.6" r="2.1" class="fill-grape"/><circle cx="7" cy="13.2" r="2.1" class="fill-grape"/><circle cx="11.1" cy="13.2" r="2.1" class="fill-grape"/><circle cx="15.2" cy="13.2" r="2.1" class="fill-grape"/><circle cx="9" cy="16.8" r="2.1" class="fill-grape"/><circle cx="13.2" cy="16.8" r="2.1" class="fill-grape"/><circle cx="11.1" cy="20.2" r="2" class="fill-grape"/></svg>',
  // A winery: a treading vat under a roof, an amphora beside it.
  winery:
    '<svg viewBox="0 0 24 24"><path d="M2 9.4 12 4l10 5.4z" class="fill-ink"/><path d="M3.6 9.4v11.2M14.6 9.4v11.2" class="stroke-ink"/><path d="M4.4 14.4h9.4v5.8H4.4z" class="fill-soft"/><path d="M5.4 14.4c1.2-1.4 2.6-1.4 3.8 0 1.2-1.4 2.6-1.4 3.6 0z" class="fill-grape"/><path d="M18.6 21c-1.6-.6-2.2-2.4-1.8-4.2.3-1.2 1-2 1.8-2.4v-1.2h1.8v1.2c.8.4 1.5 1.2 1.8 2.4.4 1.8-.2 3.6-1.8 4.2z" class="fill-wine"/></svg>',
  // A stall under its awning, with a bale of fleece.
  fleecestall:
    '<svg viewBox="0 0 24 24"><path d="M3 9.5 5 4h14l2 5.5z" class="fill-soft"/><path d="M8.6 4 7.8 9.5M12 4v5.5M15.4 4l.8 5.5" class="stroke-ink"/><path d="M5 9.5V20M19 9.5V20" class="stroke-ink"/><path d="M6.5 17.2h11V20h-11z" class="fill-soft"/><path d="M8.2 17.2c-.8-1.8.4-3.6 2-3.4.6-1.2 2.6-1.4 3.6-.2 1.6-.4 3 1.2 2.2 3.6z" class="fill-wool"/></svg>',
  // A stall under its awning, with an amphora of wine.
  winestall:
    '<svg viewBox="0 0 24 24"><path d="M3 9.5 5 4h14l2 5.5z" class="fill-soft"/><path d="M8.6 4 7.8 9.5M12 4v5.5M15.4 4l.8 5.5" class="stroke-ink"/><path d="M5 9.5V20M19 9.5V20" class="stroke-ink"/><path d="M6.5 17.2h11V20h-11z" class="fill-soft"/><path d="M11 17.2c-1.4-.8-1.8-2.4-1.4-3.8.3-.9.8-1.5 1.4-1.8v-1.2h2v1.2c.6.3 1.1.9 1.4 1.8.4 1.4 0 3-1.4 3.8z" class="fill-wine"/></svg>',
  // A bale of fleece, for the fleece overlay.
  fleece:
    '<svg viewBox="0 0 24 24"><path d="M4 16.6c-1.6-2.4-.4-5.6 2.4-5.8.4-2.8 3.6-4.2 6-2.8 2.2-1.6 5.6-.4 6.2 2.4 2.4.6 3.2 3.6 1.6 5.4.2 2.2-2 3.8-4.2 3.2-1.4 1.4-4 1.4-5.4.2-2.2 1-5 0-5.6-2.2z" class="fill-wool"/><path d="M8 13.6q2-1.6 4 0M12.6 12.4q2-1.6 4 0M9.6 16.6q2-1.6 4 0" class="stroke-ink"/></svg>',
  // An amphora, for the wine overlay.
  wine: '<svg viewBox="0 0 24 24"><path d="M10.6 2.8h2.8l-.2 2.6c1 .4 1.8 1.2 2.2 2.4.6 2 .4 5-.6 8-.6 1.8-1.4 3.4-2.8 5.2-1.4-1.8-2.2-3.4-2.8-5.2-1-3-1.2-6-.6-8 .4-1.2 1.2-2 2.2-2.4z" class="fill-wine"/><path d="M10.4 6.4C8.4 6 7.6 7.8 8.8 9M13.6 6.4c2-.4 2.8 1.4 1.6 2.6" class="stroke-ink"/><path d="M11 9.6q-.2 2.4.6 4.4" class="stroke-shine"/></svg>',
  // A jar of oil, for the oil overlay.
  oil: '<svg viewBox="0 0 24 24"><path d="M10.4 3h3.2l-.3 3.2c3.6.9 5.4 3.9 5.4 7.3 0 3.6-2.2 6.4-4.6 7.5H9.9C7.5 19.9 5.3 17.1 5.3 13.5c0-3.4 1.8-6.4 5.4-7.3z" class="fill-oil"/><path d="M7.8 6.8C6 6.6 5.4 8.4 6.6 9.6M16.2 6.8c1.8-.2 2.4 1.6 1.2 2.8" class="stroke-ink"/><path d="M9 12.6q.4-2.4 2.2-3.2" class="stroke-shine"/></svg>',
  // A domed silo beside a storehouse.
  granary: '<svg viewBox="0 0 24 24"><path d="M2.8 21V11.5L8 8l5.2 3.5V21z" class="fill-soft"/><path d="M14 21v-8.2a3.6 3.6 0 0 1 7.2 0V21z" class="fill-gold"/><path d="M6.3 21v-4.6h3.4V21z" class="fill-ink"/><path d="M2 21.2h20" class="stroke-ink"/></svg>',
  // A stall under a striped awning, with loaves.
  agora: '<svg viewBox="0 0 24 24"><path d="M3 9.5 5 4h14l2 5.5z" class="fill-soft"/><path d="M8.6 4 7.8 9.5M12 4v5.5M15.4 4l.8 5.5" class="stroke-ink"/><path d="M5 9.5V20M19 9.5V20" class="stroke-ink"/><path d="M6.5 15h11v5h-11z" class="fill-soft"/><path d="M8 15c0-1.7 1-2.6 2-2.6s2 .9 2 2.6zM12.4 15c0-1.7 1-2.6 2-2.6s2 .9 2 2.6z" class="fill-gold"/></svg>',
  // A little temple: a pediment on four columns, an altar's flame before it.
  shrine:
    '<svg viewBox="0 0 24 24"><path d="M2.6 8.6 12 3.4l9.4 5.2z" class="fill-soft"/><path d="M5.4 10.4v7.4M9.8 10.4v7.4M14.2 10.4v7.4M18.6 10.4v7.4" class="stroke-ink"/><path d="M2.8 18.4h18.4v2.6H2.8z" class="fill-soft"/><path d="M3.6 8.8h16.8v1.6H3.6z" class="fill-ink"/></svg>',
  // A counting house with a coin before it.
  taxoffice:
    '<svg viewBox="0 0 24 24"><path d="M3 9 12 4l9 5z" class="fill-tax"/><path d="M4.4 10.4h15.2V20H4.4z" class="fill-soft"/><path d="M10 20v-5h4v5z" class="fill-ink"/><path d="M2.6 20.6h18.8" class="stroke-ink"/><circle cx="18.2" cy="17.4" r="3.4" class="fill-gold"/><path d="M18.2 15.6v3.6" class="stroke-ink"/></svg>',
  // A smiling theatre mask.
  theatre:
    '<svg viewBox="0 0 24 24"><path d="M4.6 4.2c4.8 1.4 10 1.4 14.8 0 .6 7.2-1.4 15.4-7.4 16.2C6 19.6 4 11.4 4.6 4.2z" class="fill-soft"/><path d="M7.4 9.4q1.6-1.4 3.2 0-1.6 1.2-3.2 0zM13.4 9.4q1.6-1.4 3.2 0-1.6 1.2-3.2 0z" class="fill-ink"/><path d="M8.2 13.6q3.8 4.2 7.6 0" class="stroke-ink"/></svg>',
  // The temple again, in lilac, for the religion overlay.
  religion:
    '<svg viewBox="0 0 24 24"><path d="M2.6 8.6 12 3.4l9.4 5.2z" class="fill-bless"/><path d="M5.4 10.4v7.4M9.8 10.4v7.4M14.2 10.4v7.4M18.6 10.4v7.4" class="stroke-ink"/><path d="M2.8 18.4h18.4v2.6H2.8z" class="fill-bless"/></svg>',
  // The mask in rose, for the culture overlay.
  culture:
    '<svg viewBox="0 0 24 24"><path d="M4.6 4.2c4.8 1.4 10 1.4 14.8 0 .6 7.2-1.4 15.4-7.4 16.2C6 19.6 4 11.4 4.6 4.2z" class="fill-plays"/><path d="M7.4 9.4q1.6-1.4 3.2 0-1.6 1.2-3.2 0zM13.4 9.4q1.6-1.4 3.2 0-1.6 1.2-3.2 0z" class="fill-ink"/><path d="M8.2 13.6q3.8 4.2 7.6 0" class="stroke-ink"/></svg>',
  // A stack of coin, for the tax overlay.
  tax: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="17.4" rx="7.4" ry="2.6" class="fill-tax"/><path d="M4.6 13.4v4c0 1.4 3.3 2.6 7.4 2.6s7.4-1.2 7.4-2.6v-4" class="fill-tax"/><ellipse cx="12" cy="13.4" rx="7.4" ry="2.6" class="fill-gold"/><path d="M6.2 9.6v3.4c0 1.2 2.6 2.2 5.8 2.2s5.8-1 5.8-2.2V9.6" class="fill-gold"/><ellipse cx="12" cy="9.6" rx="5.8" ry="2.2" class="fill-gold"/><path d="M10 9.6h4" class="stroke-ink"/></svg>',
  // A flame, for the fire risk overlay.
  fire: '<svg viewBox="0 0 24 24"><path d="M12 2.6c.6 3.2 3.4 4.8 4.8 7.6 1.8 3.4.4 8.4-4.8 9.4-5.2-1-6.6-5.6-4.8-9 .6 1.4 1.6 2 2.6 2-.8-3.4.4-7 2.2-10z" class="fill-fire"/><path d="M12 12.4c.8 1.6 2.4 2.4 2.4 4.2 0 1.6-1 2.6-2.4 3-1.4-.4-2.4-1.4-2.4-3 0-1.4 1.4-2.4 2.4-4.2z" class="fill-gold"/></svg>',
  // A wall of blocks with a crack down it, for the wear overlay.
  wear: '<svg viewBox="0 0 24 24"><path d="M3 5h18v15H3z" class="fill-soft"/><path d="M3 10h18M3 15h18M9 5v5M15 10v5M9 15v5" class="stroke-ink"/><path d="M13.4 4.4 11.6 8.6l2.2 2.4-2.8 3.6 1.6 2.6-1.8 3.4" class="stroke-warn"/></svg>',
  // A loaf, a ham and a wedge of cheese, for the food variety overlay.
  variety:
    '<svg viewBox="0 0 24 24"><path d="M2.4 13.4c0-3 2.4-5.2 5.6-5.2s5.6 2.2 5.6 5.2c0 .9-.7 1.6-1.6 1.6H4c-.9 0-1.6-.7-1.6-1.6z" class="fill-gold"/><path d="M13.6 9.8c2.6-2.4 6.6-1.6 7.6 1.4.8 2.6-1.2 4.8-4 4.4l-2.2 2.6-1.6-1.4 1.6-2.4c-2-1-2.6-3-1.4-4.6z" class="fill-meat"/><path d="M5 21l7.6-4.8L20 21z" class="fill-cheese"/><circle cx="12.4" cy="19.4" r=".8" class="fill-ink"/></svg>',
  // A round loaf, for the food overlay.
  food: '<svg viewBox="0 0 24 24"><path d="M3 15.5c0-4.6 4-8 9-8s9 3.4 9 8c0 1.4-1 2.5-2.4 2.5H5.4C4 18 3 16.9 3 15.5z" class="fill-gold"/><path d="M8.5 10.5l1.4 3M12 9.8v3.4M15.5 10.5l-1.4 3" class="stroke-ink"/></svg>',
  // A drop of water.
  water: '<svg viewBox="0 0 24 24"><path d="M12 2.8c3.3 4.6 6.2 8.2 6.2 11.6a6.2 6.2 0 0 1-12.4 0c0-3.4 2.9-7 6.2-11.6z" class="fill-water"/><path d="M9.2 14.6a2.9 2.9 0 0 0 2.6 3" class="stroke-shine"/></svg>',
  // A little house with a question over it, for the "what's missing" overlay.
  missing:
    '<svg viewBox="0 0 24 24"><path d="M4 21v-8.5L12 6l8 6.5V21z" class="fill-soft"/><path d="M10 21v-5h4v5z" class="fill-ink"/><path d="M9.6 3.9a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2.9-1.2 1.7" class="stroke-warn"/><circle cx="12" cy="10.4" r="1" class="fill-warn"/></svg>',
  // A watch post: a little tower with a lookout and a red pennant, a bucket at its foot.
  watchpost:
    '<svg viewBox="0 0 24 24"><path d="M7 21V10h8v11z" class="fill-soft"/><path d="M5.6 10.4 11 6.4l5.4 4z" class="fill-ink"/><path d="M11 6.4V2.4" class="stroke-ink"/><path d="M11 2.6l5 1.6-5 1.6z" class="fill-fire"/><path d="M10 21v-4h2v4z" class="fill-ink"/><path d="M16.6 21l.6-4h3.6l.6 4z" class="fill-water"/><path d="M16.8 17c.6-1.6 3.6-1.6 4.2 0" class="stroke-ink"/></svg>',
  // An architect's office: a porch on columns, a set square leaning by it.
  architect:
    '<svg viewBox="0 0 24 24"><path d="M2.6 9 11 4l8.4 5z" class="fill-soft"/><path d="M4.6 10.4v8.6M8.2 10.4v8.6M11.8 10.4v8.6M15.4 10.4v8.6" class="stroke-ink"/><path d="M2.8 19.2h16.4v2H2.8z" class="fill-soft"/><path d="M15.6 21.6 21.4 9.4l1.4.6-4.4 11.6z" class="fill-bless"/><path d="M17.4 18.6h3.4" class="stroke-ink"/></svg>',
  // A spade.
  clear: '<svg viewBox="0 0 24 24"><path d="M13.6 3.2l1.4 1.4-3.4 7.6-1.5-1.5z" class="fill-ink"/><path d="M9.2 10.1l4.7 4.7-3.9 5.2c-1 1.3-2.9 1.4-4 .3l-2.3-2.3c-1.1-1.1-1-3 .3-4z" class="fill-soft"/><path d="M14.3 2.5l3.2 3.2" class="stroke-ink"/></svg>',
  // An arrow curling back.
  undo: '<svg viewBox="0 0 24 24"><path d="M9 6 3.5 10.5 9 15" class="stroke-ink"/><path d="M4 10.5h9.5a5.5 5.5 0 0 1 0 11H9" class="stroke-ink"/></svg>',
};

const INFO: Record<ButtonName, { name: string; key: string; cost: string; hint: string }> = {
  road: {
    name: 'Road',
    key: 'T',
    cost: `${ROAD_COST} dr a tile, ${BRIDGE_COST} dr a tile of bridge`,
    hint: 'Drag to lay a road. Settlers walk in where a road meets the edge of the map (glowing gold). Drag straight across a narrow stretch of river to bridge it.',
  },
  housing: { name: 'Housing', key: 'H', cost: `${PLOT_COST} dr a plot`, hint: 'Click or drag to mark out plots beside a road. Settlers will come and pitch tents.' },
  fountain: {
    name: 'Fountain',
    key: 'B',
    cost: `${FOUNTAIN_COST} dr`,
    hint: 'Click beside a road. Its water carrier walks the streets nearby, and homes she passes get water.',
  },
  farm: {
    name: 'Wheat farm',
    key: 'M',
    cost: `${FARM_COST} dr`,
    hint: 'Click on the green land by the river, beside a road. Its wheat grows for two months; ox carts take the harvest to a granary.',
  },
  lodge: {
    name: 'Hunting lodge',
    key: 'M M',
    cost: `${LODGE_COST} dr`,
    hint: 'Click within reach of the wild herds (deer on the hills, boar in the woods), beside a road. Its hunters bring back meat; ox carts take it to a granary. Hunters leave every herd its last two head.',
  },
  dairy: {
    name: 'Dairy',
    key: 'M M M',
    cost: `${DAIRY_COST} dr`,
    hint: 'Click on green pasture, beside a road. Its goats graze round it and give cheese, more on better grass; ox carts take it to a granary.',
  },
  grove: {
    name: 'Olive grove',
    key: 'M ×4',
    cost: `${GROVE_COST} dr`,
    hint: 'Click on the dry slopes, beside a road (the river land, rock and sand won’t do). Its olives ripen for two months; ox carts take them to an olive press.',
  },
  press: {
    name: 'Olive press',
    key: 'M ×5',
    cost: `${PRESS_COST} dr`,
    hint: 'Click beside a road. Carts bring it the groves’ olives; it presses them into jars of oil, which its carts take to a storehouse.',
  },
  storehouse: {
    name: 'Storehouse',
    key: 'G G',
    cost: `${STOREHOUSE_COST} dr`,
    hint: 'Click beside a road, near the agora if you can. Carts bring oil, fleece and wine here, and the agoras’ stall porters walk here to fetch them.',
  },
  trading: {
    name: 'Trading post',
    key: 'G ×3',
    cost: `${TRADING_COST} dr`,
    hint: 'Click on the bay shore where deep water comes close (the tint shows where), beside a road; only one. Its dockers carry what you choose to sell to the quay, and a ship calls every three months to buy it.',
  },
  yard: {
    name: 'Caravan yard',
    key: 'G ×4',
    cost: `${YARD_COST} dr`,
    hint: 'Click beside a road, between the road in from the map’s edge and the granaries and storehouses; only one. Its porters carry what you choose to sell here, and caravans from the cities you open land routes to come down the road to buy it and bring what you order.',
  },
  pasture: {
    name: 'Sheep pasture',
    key: 'M ×6',
    cost: `${PASTURE_COST} dr`,
    hint: 'Click on green grass, beside a road. Its flock grazes round the stone fold and is sheared for fleece, more on better grass; ox carts take the bales to a storehouse.',
  },
  vineyard: {
    name: 'Vineyard',
    key: 'M ×7',
    cost: `${VINEYARD_COST} dr`,
    hint: 'Click on a dry slope that catches the afternoon sun, beside a road (flat ground gives about half). Its grapes ripen for two months; ox carts take them to a winery.',
  },
  winery: {
    name: 'Winery',
    key: 'M ×8',
    cost: `${WINERY_COST} dr`,
    hint: 'Click beside a road. Carts bring it the vineyards’ grapes; it treads them into amphorae of wine, which its carts take to a storehouse.',
  },
  stall: {
    name: 'Oil stall',
    key: 'K K',
    cost: `${STALL_COST} dr`,
    hint: 'Click an agora to add an oil stall. Its porter fetches oil from a storehouse and its oil vendor sells it; a townhouse needs oil.',
  },
  fleecestall: {
    name: 'Fleece stall',
    key: 'K ×3',
    cost: `${STALL_COST} dr`,
    hint: 'Click an agora to add a fleece stall. Its porter fetches fleece from a storehouse and its fleece vendor sells it; a fine house needs fleece.',
  },
  winestall: {
    name: 'Wine stall',
    key: 'K ×4',
    cost: `${STALL_COST} dr`,
    hint: 'Click an agora to add a wine stall. Its porter fetches wine from a storehouse and its wine vendor sells it; a villa needs wine.',
  },
  granary: { name: 'Granary', key: 'G', cost: `${GRANARY_COST} dr`, hint: 'Click beside a road. Carts bring wheat, meat and cheese here, each in its own store, and the agora’s porter fetches them.' },
  agora: {
    name: 'Agora',
    key: 'K',
    cost: `${AGORA_COST} dr`,
    hint: 'Click beside a road. Its food vendor walks the streets selling bread, meat and cheese to huts and better; huts with water and food become cottages. A townhouse needs two kinds of food, a fine house and a villa all three.',
  },
  shrine: {
    name: 'Shrine',
    key: 'V',
    cost: `${SHRINE_COST} dr`,
    hint: 'Click beside a road. Its priestess walks the streets nearby blessing homes; a cottage with her blessing, two kinds of food and oil becomes a townhouse.',
  },
  theatre: {
    name: 'Theatre',
    key: 'P',
    cost: `${THEATRE_COST} dr`,
    hint: 'Click beside a road (it takes three by three). Its actor walks the streets bringing the plays; a townhouse with plays, all three foods and fleece becomes a fine house.',
  },
  taxoffice: {
    name: 'Tax office',
    key: 'Z',
    cost: `${TAX_OFFICE_COST} dr`,
    hint: 'Click beside a road, near the houses. Its tax collector walks the streets nearby and brings back what each household owes.',
  },
  watchpost: {
    name: 'Watch post',
    key: 'Z ×2',
    cost: `${WATCHPOST_COST} dr`,
    hint: 'Click beside a road, near crowded streets and busy workshops. Its watchman walks the streets nearby: the buildings beside his way are made safe from fire, and he runs to any flames he can see.',
  },
  architect: {
    name: 'Architect’s office',
    key: 'Z ×3',
    cost: `${ARCHITECT_COST} dr`,
    hint: 'Click beside a road. Its inspector walks the streets nearby: the buildings beside her way are made sound before they wear out and fall in (big buildings wear fastest).',
  },
  clear: {
    name: 'Clear land',
    key: 'X',
    cost: `free; rubble ${CLEAR_SMALL}–${CLEAR_BIG} dr a heap`,
    hint: 'Drag over roads, bridges, buildings, rubble or trees to clear them. Families in cleared homes leave. Rubble has to be cleared before anything can be built there again.',
  },
  undo: { name: 'Undo', key: 'U', cost: '', hint: '' },
  water: { name: 'Water overlay: where the water carrier walks, and which homes have water', key: 'O', cost: '', hint: '' },
  food: { name: 'Food overlay: where the food vendor walks, which homes have food, and the farms and granaries', key: 'L', cost: '', hint: '' },
  religion: { name: 'Religion overlay: where the priestess walks, and which homes are blessed', key: 'Y', cost: '', hint: '' },
  culture: { name: 'Culture overlay: where the actor walks, and which homes have plays', key: 'C', cost: '', hint: '' },
  oil: { name: 'Oil overlay: where the oil vendor walks, which homes have oil, and the groves, presses and storehouses', key: 'L ×3', cost: '', hint: '' },
  fleece: { name: 'Fleece overlay: where the fleece vendor walks, which homes have fleece, and the pastures and storehouses', key: 'L ×4', cost: '', hint: '' },
  wine: { name: 'Wine overlay: where the wine vendor walks, which homes have wine, and the vineyards, wineries and storehouses', key: 'L ×5', cost: '', hint: '' },
  tax: { name: 'Tax overlay: where the tax collector walks, and which homes have paid this month', key: 'J', cost: '', hint: '' },
  fire: { name: 'Fire risk overlay: where the watchman walks, and which buildings are close to catching fire', key: 'J J', cost: '', hint: '' },
  wear: { name: 'Wear overlay: where the inspector walks, and which buildings are close to falling in', key: 'J ×3', cost: '', hint: '' },
  missing: { name: 'What’s missing: each home tinted by its biggest need', key: 'I', cost: '', hint: '' },
  variety: { name: 'Food variety overlay: what is on each home’s table (bread, meat, cheese), and the kinds it is short of', key: 'L L', cost: '', hint: '' },
};

/** The build bar along the bottom: road, housing, fountain, the makers (farm to winery), granary, storehouse, agora and its stalls, shrine, theatre, tax office, clear, undo, and the overlays. */
/** A button of the bar that opens a row of its members above it (the keys pick them as before). */
interface Group {
  id: string;
  name: string;
  key: string;
  members: ButtonName[];
}
type Slot = ButtonName | Group | '|';

/**
 * The bar's layout: the tools, undo, then the overlays. Kinds of building
 * picked by the same key (M, G, K, Z) share a button, as the overlays on L and
 * J do; it shows the one last picked, and a click opens the row of them.
 */
const SLOTS: Slot[] = [
  'road',
  'housing',
  'fountain',
  '|',
  { id: 'makers', name: 'Farms and workshops', key: 'M', members: ['farm', 'lodge', 'dairy', 'grove', 'press', 'pasture', 'vineyard', 'winery'] },
  { id: 'stores', name: 'Granary, storehouse, trading post and caravan yard', key: 'G', members: ['granary', 'storehouse', 'trading', 'yard'] },
  { id: 'market', name: 'The agora and its stalls', key: 'K', members: ['agora', 'stall', 'fleecestall', 'winestall'] },
  '|',
  'shrine',
  'theatre',
  '|',
  { id: 'offices', name: 'Offices: the tax office, the watch post and the architect’s office', key: 'Z', members: ['taxoffice', 'watchpost', 'architect'] },
  '|',
  'clear',
  '|',
  'undo',
  '|',
  'water',
  { id: 'goods', name: 'Food and goods overlays', key: 'L', members: ['food', 'variety', 'oil', 'fleece', 'wine'] },
  'religion',
  'culture',
  { id: 'safety', name: 'Taxes, fire risk and wear overlays', key: 'J', members: ['tax', 'fire', 'wear'] },
  'missing',
];

const OVERLAYS: ReadonlySet<ButtonName> = new Set(['water', 'food', 'variety', 'oil', 'fleece', 'wine', 'religion', 'culture', 'tax', 'fire', 'wear', 'missing']);

export class BuildBar {
  private readonly buttons = new Map<ToolName, HTMLButtonElement>();
  private readonly hint: HTMLElement;
  private readonly undoBtn: HTMLButtonElement;
  private readonly overlayBtns = new Map<OverlayMode, HTMLButtonElement>();
  /** Each group's button, its row of members, and the member it shows. */
  private readonly groups: Array<{ g: Group; btn: HTMLButtonElement; row: HTMLElement; shown: ButtonName }> = [];
  private tool: ToolName | null = null;
  private overlay: OverlayMode | null = null;

  constructor(root: HTMLElement, onTool: (t: ToolName) => void, onUndo: () => void, onOverlay: (o: OverlayMode) => void) {
    const wrap = document.createElement('div');
    wrap.className = 'buildbar-wrap';
    const bar = document.createElement('div');
    bar.className = 'buildbar';
    const hint = document.createElement('div');
    hint.className = 'tool-hint';
    hint.hidden = true;
    root.appendChild(hint);
    this.hint = hint;
    const pick = (t: ButtonName): void => {
      if (t === 'undo') onUndo();
      else if (OVERLAYS.has(t)) onOverlay(t as OverlayMode);
      else onTool(t as ToolName);
    };
    const member = (t: ButtonName, into: HTMLElement): HTMLButtonElement => {
      const b = this.button(t);
      if (OVERLAYS.has(t)) {
        b.classList.add('overlay', t);
        this.overlayBtns.set(t as OverlayMode, b);
      } else if (t !== 'undo') this.buttons.set(t as ToolName, b);
      b.addEventListener('click', () => {
        pick(t);
        this.closeGroups();
      });
      into.appendChild(b);
      return b;
    };
    let undo: HTMLButtonElement | null = null;
    for (const slot of SLOTS) {
      if (slot === '|') {
        const d = document.createElement('div');
        d.className = 'divider';
        bar.appendChild(d);
      } else if (typeof slot === 'string') {
        const b = member(slot, bar);
        if (slot === 'undo') undo = b;
      } else {
        const btn = document.createElement('button');
        btn.className = 'btn tool group';
        btn.dataset.group = slot.id;
        if (OVERLAYS.has(slot.members[0])) btn.classList.add('overlay');
        const label = `${slot.name} (${slot.key}, again for the next)`;
        btn.title = label;
        btn.setAttribute('aria-label', label);
        btn.setAttribute('aria-haspopup', 'true');
        btn.setAttribute('aria-expanded', 'false');
        const row = document.createElement('div');
        row.className = 'group-row';
        row.dataset.group = slot.id;
        row.hidden = true;
        const head = document.createElement('div');
        head.className = 'group-name';
        head.textContent = slot.name;
        row.appendChild(head);
        const items = document.createElement('div');
        items.className = 'group-items';
        row.appendChild(items);
        for (const t of slot.members) member(t, items);
        const entry = { g: slot, btn, row, shown: slot.members[0] };
        this.groups.push(entry);
        this.face(entry);
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const open = row.hidden;
          this.closeGroups();
          if (open) this.openGroup(entry);
        });
        bar.appendChild(btn);
        wrap.appendChild(row);
      }
    }
    this.undoBtn = undo as HTMLButtonElement;
    wrap.appendChild(bar);
    root.appendChild(wrap);
    // A click anywhere else, or Esc, closes an open row.
    document.addEventListener('pointerdown', (e) => {
      if (!(e.target instanceof Node) || !wrap.contains(e.target)) this.closeGroups();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeGroups();
    });
    addEventListener('resize', () => {
      for (const g of this.groups) if (!g.row.hidden) this.place(g);
    });
  }

  /** Whether a group's row is open (for the smoke test). */
  get openGroup_(): string {
    return this.groups.find((g) => !g.row.hidden)?.g.id ?? '';
  }

  private openGroup(entry: (typeof this.groups)[number]): void {
    entry.row.hidden = false;
    entry.btn.setAttribute('aria-expanded', 'true');
    entry.btn.classList.add('open');
    this.hint.classList.add('lifted');
    this.place(entry);
  }

  /** Put an open row above its button, kept inside the window. */
  private place(entry: (typeof this.groups)[number]): void {
    const wrap = entry.row.parentElement as HTMLElement;
    const wr = wrap.getBoundingClientRect();
    const br = entry.btn.getBoundingClientRect();
    const w = entry.row.offsetWidth;
    const centre = br.left + br.width / 2 - wr.left;
    const min = 8 - wr.left;
    const max = innerWidth - 8 - wr.left - w;
    entry.row.style.left = `${Math.round(Math.max(min, Math.min(max, centre - w / 2)))}px`;
    entry.row.style.setProperty('--arrow', `${Math.round(centre - Math.max(min, Math.min(max, centre - w / 2)))}px`);
  }

  closeGroups(): void {
    this.hint.classList.remove('lifted');
    for (const g of this.groups) {
      g.row.hidden = true;
      g.btn.setAttribute('aria-expanded', 'false');
      g.btn.classList.remove('open');
    }
  }

  /** A group's button shows the member last picked (its icon and key), lit while it is in hand or showing. */
  private face(entry: (typeof this.groups)[number]): void {
    const t = entry.shown;
    const on = t === this.tool || t === this.overlay;
    entry.btn.innerHTML = `${ICONS[t]}<span class="key">${entry.g.key}</span><span class="more" aria-hidden="true"></span>`;
    entry.btn.classList.toggle('on', on);
    entry.btn.setAttribute('aria-pressed', String(on));
    for (const m of entry.g.members) entry.btn.classList.toggle(m, OVERLAYS.has(m) && m === t);
  }

  private refreshGroups(): void {
    for (const e of this.groups) {
      const held = e.g.members.find((m) => m === this.tool || m === this.overlay);
      if (held) e.shown = held;
      this.face(e);
    }
  }

  /** Light the overlay button of the overlay showing, if any. */
  showOverlay(mode: OverlayMode | null): void {
    if (mode === this.overlay) return;
    this.overlay = mode;
    for (const [o, b] of this.overlayBtns) {
      b.classList.toggle('on', o === mode);
      b.setAttribute('aria-pressed', String(o === mode));
    }
    this.refreshGroups();
  }

  private button(t: ButtonName): HTMLButtonElement {
    const i = INFO[t];
    const b = document.createElement('button');
    b.className = 'btn tool';
    b.dataset.tool = t;
    b.innerHTML = `${ICONS[t]}<span class="key">${i.key}</span>`;
    const label = `${i.name} (${i.key})${i.cost ? ` · ${i.cost}` : ''}`;
    b.title = label;
    b.setAttribute('aria-label', label);
    return b;
  }

  showTool(t: ToolName | null): void {
    this.tool = t;
    for (const [k, b] of this.buttons) {
      b.classList.toggle('on', k === t);
      b.setAttribute('aria-pressed', String(k === t));
    }
    this.refreshGroups();
    this.hint.hidden = !t;
    if (t) this.hint.textContent = `${INFO[t].hint}  Right-click or Esc to put it down.`;
  }

  private undoWhy: string | null = null;

  /** Undo is greyed out when the last action can't be undone, and its tooltip says why. */
  setUndo(available: boolean, why = ''): void {
    this.undoBtn.disabled = !available;
    if (why === this.undoWhy) return;
    this.undoWhy = why;
    const label = available || !why ? 'Undo (U) · the last thing you built or cleared, within about a month' : `Undo (U) · ${why}`;
    this.undoBtn.title = label;
    this.undoBtn.setAttribute('aria-label', label);
  }
}

/** A small label that follows the pointer. */
export function pointerTip(root: HTMLElement): ToolTip {
  const el = document.createElement('div');
  el.className = 'pointer-tip';
  el.hidden = true;
  root.appendChild(el);
  return {
    show(text, x = 0, y = 0, bad = false, warn = '') {
      if (!text) {
        el.hidden = true;
        return;
      }
      el.hidden = false;
      const all = warn ? `${text}\n${warn}` : text;
      if (el.dataset.text !== all) {
        el.dataset.text = all;
        const [head, ...rest] = text.split('\n');
        el.textContent = head;
        if (rest.length) {
          const sub = document.createElement('span');
          sub.className = 'sub';
          sub.textContent = rest.join('\n');
          el.appendChild(sub);
        }
        if (warn) {
          const w = document.createElement('span');
          w.className = 'sub caution';
          w.textContent = warn;
          el.appendChild(w);
        }
      }
      el.classList.toggle('bad', bad);
      el.classList.toggle('warn', !bad && !!warn);
      // Beside the pointer, flipped to its other side near the window's edge so it stays readable.
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      let left = x + 16;
      let top = y + 18;
      if (left + w > root.clientWidth - 8) left = Math.max(8, x - 16 - w);
      if (top + h > root.clientHeight - 8) top = Math.max(8, y - 18 - h);
      el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
    },
  };
}
