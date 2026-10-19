/**
 * The interface's materials (see relief.ts), made once as the game opens:
 * a tile of marble (honed marble is the same, washed lighter in CSS), the bronze moulding down the panel's
 * edge, bronze frames cut in nine for the bars and cards, and the fixed
 * pieces of the side panel (its head round the minimap, the bosses, the
 * tabs, the wells, the lintels). The tiles and frames go to CSS as custom
 * properties on the root; the pieces are image URLs, made the first time
 * they are asked for and kept.
 */
import { bronze, canvasOf, cutOut, darkStone, disc, flat, gold, iconMask, inside, lapis, marble, Relief, rrect, sampled, SCALE, ss, textMask, type Material } from './relief';

/** The side panel's width, and the moulding and groove down its left edge. */
export const PANEL_W = 296;
export const MOULD = 12;
/** The panel's head: the minimap's plate and its ring, and where the four bosses stand (all in the head's own pixels). */
export const HEAD = { w: PANEL_W - MOULD, h: 240, cx: 142, cy: 120, plate: 92, ring: 16 } as const;
export const BOSS = { r: 17, at: [[30, 34], [254, 34], [30, 206], [254, 206]] as ReadonlyArray<[number, number]> };
export const TAB = { w: 28, h: 36, gap: 3 } as const;
export const WELL = { w: 84, h: 76, gap: 6 } as const;
export const LINTEL = { w: 266, h: 30 } as const;
export const BAND = { w: PANEL_W - MOULD, h: 18 } as const;

/** The panel's marble (worked out a CSS pixel apart once the game opens: see prepareSkin). */
let MARBLE: Material = marble(3, 256);
const BRONZE = bronze();
const GOLD = gold();
const LAPIS = lapis();
const POLISH = flat('#f6dc98', 1, 0.9);
const BRIGHT = flat('#f2cf72', 1, 0.95);
const UMBER = flat('#4b3b2a');

const masks = new Map<string, HTMLCanvasElement>();
const made = new Map<string, string>();
const url = (c: HTMLCanvasElement): string => c.toDataURL('image/png');

/** Fonts, the icons' masks, the tiles and frames: once, before the interface is drawn. */
export async function prepareSkin(icons: Record<string, string>, root: HTMLElement = document.documentElement): Promise<number> {
  const t0 = performance.now();
  await Promise.all([
    Promise.all([document.fonts.load('700 17px Cinzel'), document.fonts.load('500 13px Cinzel'), document.fonts.load('15px Alegreya'), document.fonts.load('italic 15px Alegreya'), document.fonts.load('700 15px Alegreya')]).catch(() => undefined),
    ...Object.entries(icons).flatMap(([k, svg]) => [
      iconMask(svg, 22).then((m) => masks.set(`${k}:22`, m)),
      iconMask(svg, 22, true).then((m) => masks.set(`${k}:22s`, m)),
    ]),
  ]);
  MARBLE = sampled(MARBLE, 256, 256, true);
  const set = (name: string, c: HTMLCanvasElement): void => root.style.setProperty(name, `url(${url(c)})`);
  set('--skin-marble', new Relief(256, 256, true, true).paint([0, 0, 256, 256], MARBLE).grain(0.5).render(false));
  set('--skin-mould', moulding());
  set('--skin-frame', frame(48, 7, 4));
  set('--skin-frame-thin', frame(24, 4, 2.6));
  // Where border-image cuts the frames, in their own pixels.
  root.style.setProperty('--skin-frame-cut', String(8 * SCALE));
  root.style.setProperty('--skin-frame-thin-cut', String(5 * SCALE));
  return performance.now() - t0;
}

/** The bronze moulding down the panel's edge, studded, with a groove after it: a tile that repeats down. */
function moulding(): HTMLCanvasElement {
  const r = new Relief(MOULD, 256, false, true);
  r.paint([0, 0, 10, 256], bronze(2, 256)).paint([10, 0, 2, 256], MARBLE);
  r.raise([0, 0, 10, 256], (x) => 6 * Math.sin(Math.PI * Math.min(1, x / 10)));
  for (const y of [42, 128, 214]) r.bevel(disc(5, y, 2.8), [1, y - 4, 8, 8], 2.8, 2.6);
  r.raise([10, 0, 2, 256], () => -2.5);
  return r.render();
}

/** A bronze frame `n` px square, `t` thick, for border-image (its middle left clear). */
function frame(n: number, t: number, top: number): HTMLCanvasElement {
  const r = new Relief(n, n);
  const out = rrect(0, 0, n, n, t * 0.85);
  const inn = rrect(t, t, n - 2 * t, n - 2 * t, 2);
  r.paint([0, 0, n, n], BRONZE);
  r.raise([0, 0, n, n], (x, y) => {
    const a = out(x, y);
    const b = -inn(x, y);
    if (a <= 0 || b <= 0) return 0;
    return top * Math.sin((Math.min(1, a / (t * 0.45)) * Math.PI) / 2) * Math.sin((Math.min(1, b / (t * 0.35)) * Math.PI) / 2);
  });
  return cutOut(r.render(), (x, y) => Math.min(out(x, y), -inn(x, y)));
}

// ---------------------------------------------------------------------------
// The panel's pieces.

/** The head: a raised slab with the minimap's bronze ring, its compass marks, and the sunk sockets of the four bosses. */
export function headURL(): string {
  return once('head', () => {
    const { w, h, cx, cy, plate, ring } = HEAD;
    const r = new Relief(w, h);
    const slab = rrect(4, 6, w - 8, h - 12, 5);
    r.paint([0, 0, w, h], MARBLE).grain(0.5);
    r.bevel(slab, [0, 0, w, h], 4, 5);
    const outer = plate + ring;
    const rs = disc(cx, cy, outer);
    const box: [number, number, number, number] = [cx - outer - 1, cy - outer - 1, 2 * outer + 2, 2 * outer + 2];
    r.paint(box, BRONZE, (x, y) => ss(-0.7, 0.7, rs(x, y)) * (1 - ss(ring - 0.7, ring + 0.3, rs(x, y))));
    r.rim(rs, box, ring / 2 + 0.5, ring - 1, 8.5);
    r.rim(rs, box, 1.3, 2.6, 3);
    r.rim(rs, box, ring - 0.5, 2.2, 2);
    const ticks = canvasOf(w, h, (g) => {
      g.lineCap = 'butt';
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        const r0 = plate + (i % 4 === 0 ? 4 : 6.5);
        const r1 = plate + 12.5;
        g.lineWidth = i % 4 === 0 ? 1.6 : 1;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        g.stroke();
      }
    });
    r.stamp(ticks, 0, 0, -2.2, 0.5);
    r.raise([cx - plate, cy - plate, 2 * plate, 2 * plate], (x, y) => (Math.hypot(x - cx, y - cy) < plate ? -6 : 0));
    for (const [bx, by] of BOSS.at) r.bevel(disc(bx, by, BOSS.r + 3.5), [bx - BOSS.r - 5, by - BOSS.r - 5, 2 * BOSS.r + 10, 2 * BOSS.r + 10], 2, -2.5);
    return url(cutOut(r.render(), slab));
  });
}

/** The lapis band with its gold key pattern, between the head and the tabs. */
export function bandURL(): string {
  return once('band', () => {
    const { w, h } = BAND;
    const r = new Relief(w, h);
    r.paint([0, 0, w, h], LAPIS);
    const key = canvasOf(w, h, (g) => {
      g.lineWidth = 1.7;
      g.lineCap = 'square';
      g.lineJoin = 'miter';
      for (let x = 4; x < w - 4; x += 15) {
        const t = 4;
        const b = h - 4;
        g.beginPath();
        g.moveTo(x, b);
        g.lineTo(x + 11.5, b);
        g.lineTo(x + 11.5, t);
        g.lineTo(x + 3.5, t);
        g.lineTo(x + 3.5, t + 6);
        g.lineTo(x + 8, t + 6);
        g.lineTo(x + 8, t + 3.2);
        g.stroke();
        g.beginPath();
        g.moveTo(x + 11.5, b);
        g.lineTo(x + 15, b);
        g.stroke();
      }
      g.fillRect(0, 0, w, 1.6);
      g.fillRect(0, h - 1.6, w, 1.6);
    });
    r.stamp(key, 0, 0, 2.2, 0.35).tint(key, 0, 0, GOLD);
    return url(r.render());
  });
}

/** A round bronze boss, `r` px, with a raised polished icon; `on`, a lapis heart with a gold one. */
export function bossURL(icon: string, r: number, on = false): string {
  return once(`boss:${icon}:${r}:${on}`, () => {
    const n = 2 * r + 2;
    const c = r + 1;
    const rel = new Relief(n, n);
    const sd = disc(c, c, r);
    rel.paint([0, 0, n, n], on ? LAPIS : BRONZE, inside(sd));
    rel.bevel(sd, [0, 0, n, n], r * 0.75, on ? 5 : 8);
    rel.rim(sd, [0, 0, n, n], 1.6, 3, 2.2);
    if (on) rel.paint([0, 0, n, n], BRONZE, (x, y) => inside(sd)(x, y) * (1 - ss(2.6, 3.4, sd(x, y))));
    const m = scaled(icon, r * 1.25);
    if (m) {
      const at = c - (r * 1.25) / 2;
      rel.stamp(m, at, at, on ? 2.4 : 3.2, 0.5).tint(m, at, at, on ? GOLD : POLISH);
    }
    return url(cutOut(rel.render(), sd));
  });
}

/** A carved marble tab, its icon cut and filled with umber; `on`, inlaid with lapis and a gold icon. */
export function tabURL(icon: string, on: boolean, seed: number): string {
  return once(`tab:${icon}:${on}`, () => {
    const { w, h } = TAB;
    const r = new Relief(w, h);
    const sd = rrect(0, 0, w, h, 3);
    r.paint([0, 0, w, h], marble(20 + seed)).grain(0.4);
    r.bevel(sd, [0, 0, w, h], 3, 4.5);
    const s = 21;
    const x = w / 2 - s / 2;
    const y = h / 2 - s / 2;
    if (on) {
      const inner = rrect(3.4, 3.4, w - 6.8, h - 6.8, 1.5);
      r.paint([0, 0, w, h], LAPIS, inside(inner));
      r.raise([0, 0, w, h], (px, py) => (inner(px, py) > 0 ? -2.5 * Math.min(1, inner(px, py) / 1.2) : 0));
      const m = masks.get(`${icon}:22s`);
      if (m) r.stamp(m, x, y, 2.4).tint(m, x, y, GOLD);
    } else {
      const m = masks.get(`${icon}:22`);
      const ms = masks.get(`${icon}:22s`);
      if (m) r.stamp(m, x, y, -2.6);
      if (ms) r.tint(ms, x, y, UMBER, 0.85);
    }
    return url(cutOut(r.render(), sd));
  });
}

/** A well for a building's picture: a bronze bezel round dark stone; `sel` (the one in hand), a gold bezel. */
export function wellURL(sel: boolean): string {
  return once(`well:${sel}`, () => {
    const { w, h } = WELL;
    const r = new Relief(w, h);
    const sd = rrect(0, 0, w, h, 4);
    r.paint([0, 0, w, h], sel ? BRIGHT : BRONZE, inside(sd));
    r.rim(sd, [0, 0, w, h], 2.6, 5, sel ? 4.2 : 3.4);
    const inner = rrect(5, 5, w - 10, h - 10, 2);
    r.paint([4, 4, w - 8, h - 8], darkStone(), inside(inner));
    r.raise([4, 4, w - 8, h - 8], (x, y) => (inner(x, y) > 0 ? -7 * Math.min(1, inner(x, y) / 2.5) : 0));
    return url(cutOut(r.render(), sd));
  });
}

/** A raised marble lintel with a name cut into it and gilded. */
export function lintelURL(text: string): string {
  return once(`lintel:${text}`, () => {
    const { w, h } = LINTEL;
    const r = new Relief(w, h);
    const sd = rrect(0, 0, w, h, 3);
    r.paint([0, 0, w, h], marble(31)).grain(0.4);
    r.bevel(sd, [0, 0, w, h], 3, 4);
    const size = text.length > 16 ? 15 : 17;
    const word = textMask(text, `700 ${size}px Cinzel`, w, h, text.length > 16 ? 2 : 3);
    r.stamp(word, 0, 0, -2.6, 0.7).tint(word, 0, 0, GOLD, 0.9);
    return url(cutOut(r.render(), sd));
  });
}

/** A gold drachma with a star struck in it. */
export function coinURL(): string {
  return once('coin', () => {
    const n = 24;
    const r = new Relief(n, n);
    const sd = disc(12, 12, 11);
    r.paint([0, 0, n, n], GOLD, inside(sd));
    r.bevel(sd, [0, 0, n, n], 4, 4.5).rim(sd, [0, 0, n, n], 1.2, 2, 1.2);
    const star = canvasOf(n, n, (g) => {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const d = i % 2 ? 2.6 : 6;
        g.lineTo(12 + Math.cos(a) * d, 12 + Math.sin(a) * d);
      }
      g.closePath();
      g.fill();
    });
    r.stamp(star, 0, 0, -1.6, 0.4);
    return url(cutOut(r.render(), sd));
  });
}

function once(key: string, make: () => string): string {
  let u = made.get(key);
  if (!u) made.set(key, (u = make()));
  return u;
}

/** An icon's solid mask at a size (drawn from the 22 px one). */
function scaled(icon: string, size: number): HTMLCanvasElement | null {
  const m = masks.get(`${icon}:22s`);
  if (!m) return null;
  return canvasOf(size, size, (g) => g.drawImage(m, 0, 0, size, size));
}
