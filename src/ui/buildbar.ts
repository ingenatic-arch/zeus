import type { ToolName, ToolTip } from '../game/tools';
import { PLOT_COST, ROAD_COST } from '../sim/build';

const ICONS: Record<ToolName | 'undo', string> = {
  // Paving stones running off into the distance.
  road: '<svg viewBox="0 0 24 24"><path d="M9 3h6l5 18H4z" class="fill-soft"/><path d="M11 6h2v3h-2zM10.6 11h2.8v3.4h-2.8zM10.1 16.6h3.8v3.6h-3.8z" class="fill-ink"/></svg>',
  // A tent.
  housing: '<svg viewBox="0 0 24 24"><path d="M12 4 2.5 20h19z" class="fill-soft"/><path d="M12 9.5 8.4 20h7.2z" class="fill-ink"/><path d="M12 4v-1.6" class="stroke-ink"/><path d="M2 20.6h20" class="stroke-ink"/></svg>',
  // A spade.
  clear: '<svg viewBox="0 0 24 24"><path d="M13.6 3.2l1.4 1.4-3.4 7.6-1.5-1.5z" class="fill-ink"/><path d="M9.2 10.1l4.7 4.7-3.9 5.2c-1 1.3-2.9 1.4-4 .3l-2.3-2.3c-1.1-1.1-1-3 .3-4z" class="fill-soft"/><path d="M14.3 2.5l3.2 3.2" class="stroke-ink"/></svg>',
  // An arrow curling back.
  undo: '<svg viewBox="0 0 24 24"><path d="M9 6 3.5 10.5 9 15" class="stroke-ink"/><path d="M4 10.5h9.5a5.5 5.5 0 0 1 0 11H9" class="stroke-ink"/></svg>',
};

const INFO: Record<ToolName | 'undo', { name: string; key: string; cost: string; hint: string }> = {
  road: { name: 'Road', key: 'T', cost: `${ROAD_COST} dr a tile`, hint: 'Drag to lay a road. Settlers walk in where a road meets the edge of the map (glowing gold).' },
  housing: { name: 'Housing', key: 'H', cost: `${PLOT_COST} dr a plot`, hint: 'Click or drag to mark out plots beside a road. Settlers will come and pitch tents.' },
  clear: { name: 'Clear land', key: 'X', cost: 'free', hint: 'Drag over roads, homes or trees to clear them. Families in cleared homes leave.' },
  undo: { name: 'Undo', key: 'U', cost: '', hint: '' },
};

/** The build bar along the bottom: road, housing, clear, undo. */
export class BuildBar {
  private readonly buttons = new Map<ToolName, HTMLButtonElement>();
  private readonly hint: HTMLElement;
  private readonly undoBtn: HTMLButtonElement;

  constructor(root: HTMLElement, onTool: (t: ToolName) => void, onUndo: () => void) {
    const bar = document.createElement('div');
    bar.className = 'buildbar';
    const hint = document.createElement('div');
    hint.className = 'tool-hint';
    hint.hidden = true;
    root.appendChild(hint);
    this.hint = hint;
    for (const t of ['road', 'housing', 'clear'] as ToolName[]) {
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
    root.appendChild(bar);
  }

  private button(t: ToolName | 'undo'): HTMLButtonElement {
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
      if (el.textContent !== text) el.textContent = text;
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
