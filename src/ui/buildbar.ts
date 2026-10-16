import type { ToolName, ToolTip } from '../game/tools';
import { AGORA_COST, BRIDGE_COST, DAIRY_COST, FARM_COST, FOUNTAIN_COST, GRANARY_COST, GROVE_COST, LODGE_COST, PLOT_COST, PRESS_COST, ROAD_COST, SHRINE_COST, STALL_COST, STOREHOUSE_COST, TAX_OFFICE_COST, THEATRE_COST } from '../sim/build';
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
  // A stall under a striped awning, with a jar of oil.
  stall:
    '<svg viewBox="0 0 24 24"><path d="M3 9.5 5 4h14l2 5.5z" class="fill-soft"/><path d="M8.6 4 7.8 9.5M12 4v5.5M15.4 4l.8 5.5" class="stroke-ink"/><path d="M5 9.5V20M19 9.5V20" class="stroke-ink"/><path d="M6.5 17.2h11V20h-11z" class="fill-soft"/><path d="M10.6 17.2c-1.6-.6-2-2.2-1.6-3.6.3-1 1-1.6 1.6-1.8v-1h2.8v1c.6.2 1.3.8 1.6 1.8.4 1.4 0 3-1.6 3.6z" class="fill-oil"/></svg>',
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
    hint: 'Click beside a road. Carts bring jars of oil here, and an agora’s oil porter fetches them for its stall.',
  },
  stall: {
    name: 'Oil stall',
    key: 'K K',
    cost: `${STALL_COST} dr`,
    hint: 'Click an agora to add an oil stall. Its porter fetches oil from a storehouse and its oil vendor sells it; a townhouse needs oil.',
  },
  granary: { name: 'Granary', key: 'G', cost: `${GRANARY_COST} dr`, hint: 'Click beside a road. Carts bring wheat, meat and cheese here, each in its own store, and the agora’s porter fetches them.' },
  agora: {
    name: 'Agora',
    key: 'K',
    cost: `${AGORA_COST} dr`,
    hint: 'Click beside a road. Its food vendor walks the streets selling bread, meat and cheese to huts and better; huts with water and food become cottages. A townhouse needs two kinds of food, a fine house all three.',
  },
  shrine: {
    name: 'Shrine',
    key: 'V',
    cost: `${SHRINE_COST} dr`,
    hint: 'Click beside a road. Its priestess walks the streets nearby blessing homes; a cottage with water, bread and her blessing becomes a townhouse.',
  },
  theatre: {
    name: 'Theatre',
    key: 'P',
    cost: `${THEATRE_COST} dr`,
    hint: 'Click beside a road (it takes three by three). Its actor walks the streets bringing the plays; a townhouse with plays becomes a fine house.',
  },
  taxoffice: {
    name: 'Tax office',
    key: 'Z',
    cost: `${TAX_OFFICE_COST} dr`,
    hint: 'Click beside a road, near the houses. Its tax collector walks the streets nearby and brings back what each household owes.',
  },
  clear: { name: 'Clear land', key: 'X', cost: 'free', hint: 'Drag over roads, bridges, buildings or trees to clear them. Families in cleared homes leave.' },
  undo: { name: 'Undo', key: 'U', cost: '', hint: '' },
  water: { name: 'Water overlay: where the water carrier walks, and which homes have water', key: 'O', cost: '', hint: '' },
  food: { name: 'Food overlay: where the food vendor walks, which homes have food, and the farms and granaries', key: 'L', cost: '', hint: '' },
  religion: { name: 'Religion overlay: where the priestess walks, and which homes are blessed', key: 'Y', cost: '', hint: '' },
  culture: { name: 'Culture overlay: where the actor walks, and which homes have plays', key: 'C', cost: '', hint: '' },
  oil: { name: 'Oil overlay: where the oil vendor walks, which homes have oil, and the groves, presses and storehouses', key: 'L L L', cost: '', hint: '' },
  tax: { name: 'Tax overlay: where the tax collector walks, and which homes have paid this month', key: 'J', cost: '', hint: '' },
  missing: { name: 'What’s missing: each home tinted by its biggest need', key: 'I', cost: '', hint: '' },
  variety: { name: 'Food variety overlay: what is on each home’s table (bread, meat, cheese), and the kinds it is short of', key: 'L L', cost: '', hint: '' },
};

/** The build bar along the bottom: road, housing, fountain, farm, hunting lodge, dairy, olive grove, olive press, granary, storehouse, agora, oil stall, shrine, theatre, tax office, clear, undo, and the overlays. */
export class BuildBar {
  private readonly buttons = new Map<ToolName, HTMLButtonElement>();
  private readonly hint: HTMLElement;
  private readonly undoBtn: HTMLButtonElement;
  private readonly overlayBtns = new Map<OverlayMode, HTMLButtonElement>();

  constructor(root: HTMLElement, onTool: (t: ToolName) => void, onUndo: () => void, onOverlay: (o: OverlayMode) => void) {
    const bar = document.createElement('div');
    bar.className = 'buildbar';
    const hint = document.createElement('div');
    hint.className = 'tool-hint';
    hint.hidden = true;
    root.appendChild(hint);
    this.hint = hint;
    for (const t of ['road', 'housing', 'fountain', 'farm', 'lodge', 'dairy', 'grove', 'press', 'granary', 'storehouse', 'agora', 'stall', 'shrine', 'theatre', 'taxoffice', 'clear'] as ToolName[]) {
      if (t === 'farm' || t === 'shrine' || t === 'taxoffice' || t === 'clear') {
        const d = document.createElement('div');
        d.className = 'divider';
        bar.appendChild(d);
      }
      const b = this.button(t);
      b.addEventListener('click', () => onTool(t));
      bar.appendChild(b);
      this.buttons.set(t, b);
    }
    const sep = document.createElement('div');
    sep.className = 'divider';
    bar.appendChild(sep);
    this.undoBtn = this.button('undo');
    this.undoBtn.addEventListener('click', onUndo);
    bar.appendChild(this.undoBtn);
    const sep2 = document.createElement('div');
    sep2.className = 'divider';
    bar.appendChild(sep2);
    for (const o of ['water', 'food', 'variety', 'oil', 'religion', 'culture', 'tax', 'missing'] as OverlayMode[]) {
      const b = this.button(o);
      b.classList.add('overlay', o);
      b.addEventListener('click', () => onOverlay(o));
      bar.appendChild(b);
      this.overlayBtns.set(o, b);
    }
    root.appendChild(bar);
  }

  /** Light the overlay button of the overlay showing, if any. */
  showOverlay(mode: OverlayMode | null): void {
    for (const [o, b] of this.overlayBtns) {
      b.classList.toggle('on', o === mode);
      b.setAttribute('aria-pressed', String(o === mode));
    }
  }

  private button(t: ButtonName): HTMLButtonElement {
    const i = INFO[t];
    const b = document.createElement('button');
    b.className = 'btn tool';
    b.innerHTML = `${ICONS[t]}<span class="key">${i.key}</span>`;
    const label = `${i.name} (${i.key})${i.cost ? ` · ${i.cost}` : ''}`;
    b.title = label;
    b.setAttribute('aria-label', label);
    return b;
  }

  showTool(t: ToolName | null): void {
    for (const [k, b] of this.buttons) {
      b.classList.toggle('on', k === t);
      b.setAttribute('aria-pressed', String(k === t));
    }
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
