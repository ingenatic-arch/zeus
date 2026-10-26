/**
 * Slice 50: the panels' shared kit. Every panel and sub-menu is built as a
 * string of HTML and morphed in place (morph.ts), so the kit is a handful of
 * small functions that return HTML, a stylesheet (kit.css) that dresses
 * them in the skin's marble, parchment and bronze, and one tip for the whole
 * interface.
 *
 * The pieces:
 * - `khead`: a panel's carved plaque: its picture, its name cut in, a kicker
 *   over it and a line under it.
 * - `ksec`: a section under a carved rule, with an icon.
 * - `kbtn`: a bronze plaque with an icon (lapis for the main action,
 *   terracotta for one that undoes something); disabled, it carries its
 *   reason in its tip, and `kwhy` shows it under the button too.
 * - `kstep`: a stepper (two bronze bosses and the value in a sunk well);
 *   held down, a boss repeats.
 * - `ktoggle`: a switch (a sunk groove, a bronze knob, lapis when on).
 * - `kslider`: a range in a sunk groove.
 * - `kbar`: a sunk groove filled in a tone (or a colour of its own), with a tick (a limit, what is kept).
 * - `kpips`: a row of sockets, each filled by its state.
 * - `kchip`: a small plaque for a price or a count.
 * - `kcard`: parchment in a thin bronze frame.
 *
 * Tips and focus behave the same in every kit panel (an element of class
 * `kit`, or inside one): any element with a title (or `data-tip`) shows it in
 * the one tip, on hover after a short pause and at once on keyboard focus;
 * every control has the same gold focus ring. `kitHtml` turns a panel's
 * titles into `data-tip` before it is drawn, so the browser's own tooltip
 * never shows as well.
 *
 * To move a panel onto the kit: give its root the class `kit`, build its
 * header with `khead`, its sections with `ksec`, its buttons with `kbtn`
 * (keeping their `data-act`), its numbers with `kbar`, `kchip`, `kstep`, and
 * pass its HTML through `kitHtml` before morphing it in.
 */
import './kit.css';
import { actionIcon, type ActionIcon } from './icons';

/** Text made safe for HTML, attributes included. */
export const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** `data-` attributes, from a record (undefined values left out). */
export type Data = Record<string, string | number | undefined>;
const dataAttrs = (d: Data | undefined): string =>
  d
    ? Object.entries(d)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => ` data-${k}="${esc(String(v))}"`)
        .join('')
    : '';
const tipAttr = (t: string | undefined): string => (t ? ` data-tip="${esc(t)}"` : '');

/** An icon: an action's name, or a drawing already made (an SVG string). */
const iconOf = (i: ActionIcon | string | undefined): string => (!i ? '' : i.startsWith('<') ? i : actionIcon(i as ActionIcon));

/** A panel's carved plaque. `pic`: its picture (SVG); `title`, `kicker`, `sub` are text. */
export function khead(o: { title: string; kicker?: string; sub?: string; pic?: string; cls?: string }): string {
  return `<header class="k-head${o.cls ? ` ${o.cls}` : ''}">${o.pic ? `<div class="k-pic">${o.pic}</div>` : ''}<div class="k-hd">${o.kicker ? `<div class="k-kicker">${esc(o.kicker)}</div>` : ''}<h2>${esc(o.title)}</h2>${o.sub ? `<div class="k-sub">${esc(o.sub)}</div>` : ''}</div></header>`;
}

/** A section under a carved rule: `title` is text, `body` HTML; `aside`: HTML at the rule's right end. */
export function ksec(title: string, body: string, o: { icon?: ActionIcon | string; cls?: string; aside?: string } = {}): string {
  return `<section class="k-sec${o.cls ? ` ${o.cls}` : ''}"><h3 class="k-h">${o.icon ? `<span class="k-hic">${iconOf(o.icon)}</span>` : ''}<span class="k-ht">${esc(title)}</span>${o.aside ? `<span class="k-aside">${o.aside}</span>` : ''}</h3>${body}</section>`;
}

/** A button's options. `html` is its words (already safe HTML). */
export interface BtnOpts {
  html: string;
  act?: string;
  data?: Data;
  icon?: ActionIcon | string;
  tip?: string;
  /** Why it can't be pressed: disabled, with this as its tip. */
  why?: string;
  tone?: 'bronze' | 'lapis' | 'red' | 'stone';
  small?: boolean;
  /** A toggle-like button that is on. */
  pressed?: boolean;
  cls?: string;
  /** An accessible name, for a button that is only an icon. */
  label?: string;
}

/** A bronze plaque with an icon. */
export function kbtn(o: BtnOpts): string {
  const cls = `k-btn ${o.tone ?? 'bronze'}${o.small ? ' small' : ''}${o.pressed ? ' on' : ''}${o.cls ? ` ${o.cls}` : ''}${o.icon ? '' : ' bare'}`;
  return `<button class="${cls}"${o.act ? ` data-act="${esc(o.act)}"` : ''}${dataAttrs(o.data)}${tipAttr(o.why || o.tip)}${o.label ? ` aria-label="${esc(o.label)}"` : ''}${o.pressed !== undefined ? ` aria-pressed="${!!o.pressed}"` : ''}${o.why ? ' disabled' : ''}>${o.icon ? `<span class="k-bi">${iconOf(o.icon)}</span>` : ''}<span class="k-bt">${o.html}</span></button>`;
}

/** Why something can't be done, said under it (text). */
export const kwhy = (t: string, bad = false): string => (t ? `<p class="k-why${bad ? ' bad' : ''}">${esc(t)}</p>` : '');

/** A stepper: − (its data), the value, + (its data). Each boss disabled by giving its `why`. Held down, a boss repeats. */
export function kstep(o: { value: string; less: Data; more: Data; lessWhy?: string; moreWhy?: string; lessTip?: string; moreTip?: string; tip?: string; name?: string; small?: boolean }): string {
  const boss = (d: Data, sign: string, why: string | undefined, tip: string | undefined, aria: string): string =>
    `<button class="k-boss" data-repeat="1"${dataAttrs(d)}${tipAttr(why || tip)} aria-label="${esc(aria)}"${why ? ' disabled' : ''}>${sign}</button>`;
  return `<span class="k-step${o.small ? ' small' : ''}"${tipAttr(o.tip)}>${boss(o.less, '−', o.lessWhy, o.lessTip, `Less${o.name ? ` ${o.name}` : ''}`)}<output class="k-well">${esc(o.value)}</output>${boss(o.more, '+', o.moreWhy, o.moreTip, `More${o.name ? ` ${o.name}` : ''}`)}</span>`;
}

/** A switch: a sunk groove with a bronze knob, lapis when on; `html` its words beside it (may be ''). */
export function ktoggle(o: { on: boolean; html?: string; act?: string; data?: Data; tip?: string; why?: string; label?: string; cls?: string }): string {
  return `<button class="k-tog${o.on ? ' on' : ''}${o.cls ? ` ${o.cls}` : ''}" role="switch" aria-checked="${o.on}"${o.act ? ` data-act="${esc(o.act)}"` : ''}${dataAttrs(o.data)}${tipAttr(o.why || o.tip)}${o.label ? ` aria-label="${esc(o.label)}"` : ''}${o.why ? ' disabled' : ''}><span class="k-track"><i></i></span>${o.html ? `<span class="k-tl">${o.html}</span>` : ''}</button>`;
}

/** A slider: a range in a sunk groove; its value is sent on change. */
export function kslider(o: { value: number; min: number; max: number; step?: number; data?: Data; tip?: string; label: string; shown?: string }): string {
  const pct = o.max > o.min ? ((o.value - o.min) / (o.max - o.min)) * 100 : 0;
  return `<label class="k-slide"${tipAttr(o.tip)}><span class="k-sl">${esc(o.label)}</span><input type="range" min="${o.min}" max="${o.max}" step="${o.step ?? 1}" value="${o.value}" style="--k:${pct.toFixed(1)}%"${dataAttrs(o.data)} aria-label="${esc(o.label)}"><output>${esc(o.shown ?? String(o.value))}</output></label>`;
}

/** A bar's tones: stock (gold), strength (lapis), good (green), danger (red), wear (umber), stone (grey). */
export type BarTone = 'stock' | 'strength' | 'good' | 'danger' | 'wear' | 'stone' | 'sea';

/** A bar: `value` of `max` filled in its tone; `tick` (0 to 1): a mark (a limit, what is kept); `html`: words inside it. */
export function kbar(o: { value: number; max: number; tone?: BarTone; tick?: number; tip?: string; html?: string; cls?: string; fill?: string }): string {
  const pct = o.max > 0 ? Math.max(0, Math.min(100, (o.value / o.max) * 100)) : 0;
  const tick = o.tick !== undefined && o.tick > 0 && o.tick < 1 ? `<em style="left:${(o.tick * 100).toFixed(1)}%"></em>` : '';
  // (Merge of slice 50 with slice 51: `fill`, a colour of its own, as each of the overview's services has its overlay's.)
  const fill = o.fill ? `background:${esc(o.fill)};` : '';
  return `<span class="k-bar ${o.tone ?? 'stock'}${o.cls ? ` ${o.cls}` : ''}"${tipAttr(o.tip)}><i style="${fill}width:${pct.toFixed(1)}%"></i>${tick}${o.html ? `<b>${o.html}</b>` : ''}</span>`;
}

/** A pip's state: a place filled by a man ready, waiting for armour, wounded, walking in, away; or empty. */
export type PipState = 'ready' | 'arming' | 'wounded' | 'coming' | 'away' | 'empty' | 'on' | 'off';

/** A row of pips, one for each place. */
export function kpips(states: readonly PipState[], tip?: string, cls = ''): string {
  return `<span class="k-pips${cls ? ` ${cls}` : ''}"${tipAttr(tip)} role="img" aria-label="${esc(tip ?? `${states.length} places`)}">${states.map((p) => `<i class="p-${p}"></i>`).join('')}</span>`;
}

/** A small plaque for a price or a count. `html`: its words; tones: plain, gold, up, down, warn, sea. */
export function kchip(html: string, o: { tone?: 'plain' | 'gold' | 'up' | 'down' | 'warn' | 'sea' | 'stone'; icon?: ActionIcon | string; tip?: string; cls?: string } = {}): string {
  return `<span class="k-chip ${o.tone ?? 'plain'}${o.cls ? ` ${o.cls}` : ''}"${tipAttr(o.tip)}>${o.icon ? iconOf(o.icon) : ''}${html}</span>`;
}

/** Parchment in a thin bronze frame. */
export const kcard = (inner: string, cls = '', attrs = ''): string => `<div class="k-card${cls ? ` ${cls}` : ''}"${attrs}>${inner}</div>`;

/** A panel's titles become the kit tip's (so the browser's own tooltip never shows as well). */
export const kitHtml = (html: string): string => html.replace(/ title="/g, ' data-tip="');

// ---------------------------------------------------------------------------- the one tip

let installed = false;

/**
 * The tip for every kit panel: on hover after a short pause, at once on
 * keyboard focus; below the element (above it near the foot of the screen);
 * gone on leaving, scrolling, a press or Esc. A held stepper's boss repeats.
 */
export function installKit(root: HTMLElement = document.body): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const tip = document.createElement('div');
  tip.className = 'k-tip';
  tip.id = 'k-tip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  root.appendChild(tip);
  let target: HTMLElement | null = null;
  // (The element waited on before its tip shows; review of slice 50: moving over a button's own icon no longer starts the wait again.)
  let pending: HTMLElement | null = null;
  let timer = 0;
  // (While a tip shows, it is checked a few times a second: gone with its element, its words kept up to date, moved with it.)
  let watch = 0;
  const textOf = (el: HTMLElement): string => {
    // (A title left in a kit panel's markup is taken over, so the browser's tooltip doesn't show too.)
    const t = el.getAttribute('title');
    if (t !== null) {
      el.removeAttribute('title');
      if (t) el.dataset.tip = t;
    }
    return el.dataset.tip ?? '';
  };
  const find = (n: EventTarget | null): HTMLElement | null => {
    const el = n instanceof Element ? (n.closest('[data-tip], [title]') as HTMLElement | null) : null;
    return el && el.closest('.kit') ? el : null;
  };
  const place = (): void => {
    if (!target) return;
    const r = target.getBoundingClientRect();
    if (!r.width && !r.height) return hide();
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const x = Math.max(6, Math.min(window.innerWidth - w - 6, r.left + r.width / 2 - w / 2));
    const below = r.bottom + 7;
    const y = below + h > window.innerHeight - 6 ? r.top - h - 7 : below;
    tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(Math.max(4, y))}px)`;
  };
  const show = (el: HTMLElement): void => {
    pending = null;
    const t = textOf(el);
    if (!t) return;
    target = el;
    tip.textContent = t;
    tip.hidden = false;
    el.setAttribute('aria-describedby', 'k-tip');
    place();
    window.clearInterval(watch);
    watch = window.setInterval(() => {
      // (Review of slice 50: a button that goes as the panel is brought up to date, say a trireme's once she is home,
      // took its tip with it only when the mouse next moved; and a switch flipped kept its old words.)
      if (!target || !target.isConnected || !target.closest('.kit')) return hide();
      const now = textOf(target);
      if (!now) return hide();
      if (now !== tip.textContent) tip.textContent = now;
      place();
    }, 250);
  };
  function hide(): void {
    window.clearTimeout(timer);
    window.clearInterval(watch);
    if (target) target.removeAttribute('aria-describedby');
    target = null;
    pending = null;
    tip.hidden = true;
  }
  document.addEventListener('pointerover', (e) => {
    const el = find(e.target);
    if (el && (el === target || el === pending)) return;
    hide();
    if (!el) return;
    textOf(el);
    pending = el;
    timer = window.setTimeout(() => show(el), 380);
  });
  document.addEventListener('pointerout', (e) => {
    const at = target ?? pending;
    if (!at) return;
    const to = find((e as PointerEvent).relatedTarget);
    if (to !== at) hide();
  });
  document.addEventListener('focusin', (e) => {
    const el = find(e.target);
    if (el && (e.target as HTMLElement).matches(':focus-visible')) show(el);
    else hide();
  });
  document.addEventListener('focusout', () => hide());
  // (Gone when the player scrolls; a panel's own scrolling as it is redrawn only moves the tip with its element.)
  document.addEventListener('wheel', () => hide(), { capture: true, passive: true });
  document.addEventListener(
    'scroll',
    () => {
      if (!target) return;
      const r = target.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) hide();
      else place();
    },
    true,
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && target) hide();
  });
  // A held boss (a stepper's − or +) repeats its click while it is held, and stops when it is let go, when the pointer
  // slides off it (review of slice 50: it went on stepping) or when the window loses the focus.
  let rep = 0;
  let repWait = 0;
  let held: Element | null = null;
  const stop = (): void => {
    window.clearTimeout(repWait);
    window.clearInterval(rep);
    rep = 0;
    held = null;
  };
  document.addEventListener('pointerout', (e) => {
    if (!held) return;
    const to = (e as PointerEvent).relatedTarget;
    if (!(to instanceof Node) || !held.contains(to)) stop();
  });
  document.addEventListener('pointerdown', (e) => {
    hide();
    const b = e.target instanceof Element ? (e.target.closest('.kit [data-repeat]') as HTMLButtonElement | null) : null;
    if (!b || (e as PointerEvent).button !== 0) return;
    stop();
    held = b;
    repWait = window.setTimeout(() => {
      rep = window.setInterval(() => {
        if (b.disabled || !b.isConnected) stop();
        else b.click();
      }, 110);
    }, 450);
  });
  window.addEventListener('pointerup', stop);
  window.addEventListener('pointercancel', stop);
  window.addEventListener('blur', stop);
}

/** The tip showing ('' when none), for the smoke test. */
export const tipShowing = (): string => {
  const t = document.getElementById('k-tip');
  return t && !t.hidden ? (t.textContent ?? '') : '';
};
