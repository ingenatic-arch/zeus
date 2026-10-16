import type { ToolName, ToolTip } from '../game/tools';
import { AGORA_COST, BRIDGE_COST, FARM_COST, FOUNTAIN_COST, GRANARY_COST, PLOT_COST, ROAD_COST } from '../sim/build';
import type { Service } from '../sim/state';

type ButtonName = ToolName | 'undo' | Service;

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
  // A domed silo beside a storehouse.
  granary: '<svg viewBox="0 0 24 24"><path d="M2.8 21V11.5L8 8l5.2 3.5V21z" class="fill-soft"/><path d="M14 21v-8.2a3.6 3.6 0 0 1 7.2 0V21z" class="fill-gold"/><path d="M6.3 21v-4.6h3.4V21z" class="fill-ink"/><path d="M2 21.2h20" class="stroke-ink"/></svg>',
  // A stall under a striped awning, with loaves.
  agora: '<svg viewBox="0 0 24 24"><path d="M3 9.5 5 4h14l2 5.5z" class="fill-soft"/><path d="M8.6 4 7.8 9.5M12 4v5.5M15.4 4l.8 5.5" class="stroke-ink"/><path d="M5 9.5V20M19 9.5V20" class="stroke-ink"/><path d="M6.5 15h11v5h-11z" class="fill-soft"/><path d="M8 15c0-1.7 1-2.6 2-2.6s2 .9 2 2.6zM12.4 15c0-1.7 1-2.6 2-2.6s2 .9 2 2.6z" class="fill-gold"/></svg>',
  // A round loaf, for the food overlay.
  food: '<svg viewBox="0 0 24 24"><path d="M3 15.5c0-4.6 4-8 9-8s9 3.4 9 8c0 1.4-1 2.5-2.4 2.5H5.4C4 18 3 16.9 3 15.5z" class="fill-gold"/><path d="M8.5 10.5l1.4 3M12 9.8v3.4M15.5 10.5l-1.4 3" class="stroke-ink"/></svg>',
  // A drop of water.
  water: '<svg viewBox="0 0 24 24"><path d="M12 2.8c3.3 4.6 6.2 8.2 6.2 11.6a6.2 6.2 0 0 1-12.4 0c0-3.4 2.9-7 6.2-11.6z" class="fill-water"/><path d="M9.2 14.6a2.9 2.9 0 0 0 2.6 3" class="stroke-shine"/></svg>',
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
  granary: { name: 'Granary', key: 'G', cost: `${GRANARY_COST} dr`, hint: 'Click beside a road. Farms’ carts bring their wheat here, and the agora’s porter fetches it.' },
  agora: {
    name: 'Agora',
    key: 'K',
    cost: `${AGORA_COST} dr`,
    hint: 'Click beside a road. Its food vendor walks the streets selling bread to huts; huts with water and food become cottages.',
  },
  clear: { name: 'Clear land', key: 'X', cost: 'free', hint: 'Drag over roads, bridges, buildings or trees to clear them. Families in cleared homes leave.' },
  undo: { name: 'Undo', key: 'U', cost: '', hint: '' },
  water: { name: 'Water overlay', key: 'O', cost: '', hint: '' },
  food: { name: 'Food overlay', key: 'L', cost: '', hint: '' },
};

/** The build bar along the bottom: road, housing, fountain, farm, granary, agora, clear, undo, and the water and food overlays. */
export class BuildBar {
  private readonly buttons = new Map<ToolName, HTMLButtonElement>();
  private readonly hint: HTMLElement;
  private readonly undoBtn: HTMLButtonElement;
  private readonly overlayBtns = new Map<Service, HTMLButtonElement>();

  constructor(root: HTMLElement, onTool: (t: ToolName) => void, onUndo: () => void, onOverlay: (o: Service) => void) {
    const bar = document.createElement('div');
    bar.className = 'buildbar';
    const hint = document.createElement('div');
    hint.className = 'tool-hint';
    hint.hidden = true;
    root.appendChild(hint);
    this.hint = hint;
    for (const t of ['road', 'housing', 'fountain', 'farm', 'granary', 'agora', 'clear'] as ToolName[]) {
      if (t === 'farm' || t === 'clear') {
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
    for (const o of ['water', 'food'] as Service[]) {
      const b = this.button(o);
      b.classList.add('overlay', o);
      b.addEventListener('click', () => onOverlay(o));
      bar.appendChild(b);
      this.overlayBtns.set(o, b);
    }
    root.appendChild(bar);
  }

  /** Light the overlay button of the overlay showing, if any. */
  showOverlay(mode: Service | null): void {
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

  setUndo(available: boolean): void {
    this.undoBtn.disabled = !available;
  }
}

/** A small label that follows the pointer. */
export function pointerTip(root: HTMLElement): ToolTip {
  const el = document.createElement('div');
  el.className = 'pointer-tip';
  el.hidden = true;
  root.appendChild(el);
  return {
    show(text, x = 0, y = 0, bad = false) {
      if (!text) {
        el.hidden = true;
        return;
      }
      el.hidden = false;
      if (el.dataset.text !== text) {
        el.dataset.text = text;
        const [head, ...rest] = text.split('\n');
        el.textContent = head;
        if (rest.length) {
          const sub = document.createElement('span');
          sub.className = 'sub';
          sub.textContent = rest.join('\n');
          el.appendChild(sub);
        }
      }
      el.classList.toggle('bad', bad);
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
