/**
 * Lit relief for the interface: each piece of the frame (the panel's head,
 * a boss, a tab, a well, a tile of marble) is painted as height, colour and
 * shine, then lit once from a lamp at the upper left, with soft cast shadows
 * and darkened hollows, into an image. All of it is made here, in code; the
 * pieces are small and made once (see skin.ts), so the cost doesn't grow with
 * the window.
 *
 * Coordinates are CSS pixels; the layers hold SCALE device pixels to each.
 * A tile (`wrap`) wraps its noise, slopes and shadows at its edges, so it
 * repeats without a seam.
 */

/** Device pixels to a CSS pixel in every piece: two on a high-density screen, so it stays crisp; one on an ordinary one, a quarter of the work. */
export const SCALE = typeof devicePixelRatio === 'number' && devicePixelRatio >= 1.25 ? 2 : 1;

export type RGB = [number, number, number];
/** A material: colour, how metallic (0..1) and how glossy (0..1), at a point. */
export interface Surface {
  c: RGB;
  m: number;
  g: number;
}
export type Material = (x: number, y: number) => Surface;
/** A signed distance into a shape (positive inside), in CSS pixels. */
export type Shape = (x: number, y: number) => number;
type Box = [number, number, number, number];

function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const smooth = (t: number): number => t * t * (3 - 2 * t);
const clamp = (v: number, a = 0, b = 1): number => (v < a ? a : v > b ? b : v);
/** Smoothstep from a to b. */
export const ss = (a: number, b: number, v: number): number => smooth(clamp((v - a) / (b - a)));

/** Value noise; with a period (in lattice cells) it wraps. */
function noise(x: number, y: number, s: number, p: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  const w = (v: number): number => (p > 0 ? ((v % p) + p) % p : v);
  const x0 = w(xi), x1 = w(xi + 1), y0 = w(yi), y1 = w(yi + 1);
  const a = hash(x0, y0, s), b = hash(x1, y0, s), c = hash(x0, y1, s), d = hash(x1, y1, s);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
/**
 * Fractal noise at `f` cycles a pixel. With a tile size `t` it wraps at t
 * pixels (f is rounded so a whole number of cycles fits, and each octave
 * doubles exactly).
 */
export function fbm(x: number, y: number, f: number, seed: number, oct: number, t = 0): number {
  let v = 0;
  let amp = 0.5;
  let cells = t ? Math.max(1, Math.round(f * t)) : 0;
  let freq = t ? cells / t : f;
  for (let i = 0; i < oct; i++) {
    v += amp * noise(x * freq, y * freq, seed + i * 17, cells);
    freq *= 2;
    cells *= 2;
    amp *= 0.5;
  }
  return v;
}
export const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ---------------------------------------------------------------------------
// Materials.

/** Veined marble, warm grey-white. `t`: the tile size it wraps at (0: no wrap). `tone` lightens or darkens it. */
export function marble(seed: number, t = 0, tone = 1, veins = 1): Material {
  const base = hex('#e2ddd2');
  const warm = hex('#d3cab7');
  const vein = hex('#8c8576');
  const vein2 = hex('#b3a993');
  return (x, y) => {
    const n = fbm(x, y, 0.012, seed, 4, t);
    let c = mix(base, warm, ss(0.35, 0.75, n));
    const wx = x + 34 * fbm(x, y, 0.01, seed + 3, 3, t);
    const wy = y + 34 * fbm(x + 9, y, 0.01, seed + 4, 3, t);
    // Veins: where a warped noise crosses its middle, thin and wandering.
    const r = Math.abs(fbm(wx, wy, 0.007, seed + 7, 5, t) - 0.5);
    const r2 = Math.abs(fbm(wx, wy, 0.016, seed + 11, 4, t) - 0.5);
    c = mix(c, vein, (1 - ss(0, 0.018, r)) * 0.32 * veins);
    c = mix(c, vein2, (1 - ss(0, 0.01, r2)) * 0.18 * veins);
    const g = (hash(Math.floor(x * SCALE), Math.floor(y * SCALE), seed) - 0.5) * 0.025;
    return { c: [(c[0] + g) * tone, (c[1] + g) * tone, (c[2] + g) * tone], m: 0, g: 0.25 };
  };
}
/** Cast bronze, a little uneven, with streaks of brighter polish. */
export function bronze(seed = 2, t = 0): Material {
  const a = hex('#a0702f');
  const b = hex('#7a4f20');
  const hi = hex('#c99448');
  // Streaks run down the metal (with a tile, the streaks' rows wrap at its height).
  return (x, y) => {
    const c = mix(a, b, ss(0.3, 0.8, fbm(x, y, 0.05, seed, 4, t)));
    return { c: mix(c, hi, ss(0.62, 0.8, fbm(x, y * 0.15, 0.2, seed + 5, 3, t ? t * 0.15 : 0)) * 0.25), m: 1, g: 0.6 };
  };
}
/** Gold leaf. */
export function gold(): Material {
  const a = hex('#d9ae55');
  const b = hex('#b9892f');
  return (x, y) => ({ c: mix(a, b, fbm(x, y, 0.08, 9, 3)), m: 1, g: 0.85 });
}
/** Lapis lazuli: deep blue with flecks of gold. */
export function lapis(seed = 4): Material {
  const a = hex('#26457e');
  const b = hex('#162c57');
  const fleck = hex('#e3c169');
  return (x, y) => {
    const f = hash(Math.floor(x * SCALE), Math.floor(y * SCALE), seed + 1);
    if (f > 0.9965) return { c: fleck, m: 1, g: 0.7 };
    return { c: mix(a, b, ss(0.3, 0.75, fbm(x, y, 0.04, seed, 4))), m: 0, g: 0.7 };
  };
}
/** The dark stone at the bottom of a well. */
export function darkStone(): Material {
  const a = hex('#3a3027');
  const b = hex('#2c241d');
  return (x, y) => ({ c: mix(a, b, fbm(x, y, 0.06, 13, 3)), m: 0, g: 0.2 });
}
/**
 * A costly material worked out once a CSS pixel over `w` × `h` (wrapping, for
 * a tile) and read between those points: a quarter of the work at SCALE 2,
 * for materials whose detail is coarser than a pixel (marble).
 */
export function sampled(mat: Material, w: number, h: number, wrap = false): Material {
  const W = Math.ceil(w) + 1;
  const H = Math.ceil(h) + 1;
  const C = new Float32Array(W * H * 3);
  const MG = new Float32Array(W * H * 2);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const v = mat(wrap ? x % w : x, wrap ? y % h : y);
      const i = y * W + x;
      C.set(v.c, i * 3);
      MG[i * 2] = v.m;
      MG[i * 2 + 1] = v.g;
    }
  return (x, y) => {
    if (wrap) {
      x = ((x % w) + w) % w;
      y = ((y % h) + h) % h;
    }
    const fx = clamp(x, 0, W - 1.001);
    const fy = clamp(y, 0, H - 1.001);
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const i00 = y0 * W + x0;
    const i10 = i00 + 1;
    const i01 = i00 + W;
    const i11 = i01 + 1;
    const lerp = (a: Float32Array, n: number, k: number): number => {
      const top = a[i00 * n + k] + (a[i10 * n + k] - a[i00 * n + k]) * tx;
      const bot = a[i01 * n + k] + (a[i11 * n + k] - a[i01 * n + k]) * tx;
      return top + (bot - top) * ty;
    };
    return { c: [lerp(C, 3, 0), lerp(C, 3, 1), lerp(C, 3, 2)], m: lerp(MG, 2, 0), g: lerp(MG, 2, 1) };
  };
}
/** One colour. */
export function flat(h: string, m = 0, g = 0.3): Material {
  const c = hex(h);
  return () => ({ c, m, g });
}

// ---------------------------------------------------------------------------
// Shapes.

/** A rounded rectangle. */
export function rrect(x: number, y: number, w: number, h: number, r: number): Shape {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (px, py) => {
    const qx = Math.abs(px - cx) - (w / 2 - r);
    const qy = Math.abs(py - cy) - (h / 2 - r);
    return -(Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r);
  };
}
/** A disc. */
export function disc(cx: number, cy: number, r: number): Shape {
  return (px, py) => r - Math.hypot(px - cx, py - cy);
}
/** Inside a shape, softened over a pixel at its edge (for painting). */
export const inside = (s: Shape): ((x: number, y: number) => number) => (x, y) => ss(-0.6, 0.6, s(x, y));

// ---------------------------------------------------------------------------

export class Relief {
  readonly w: number;
  readonly h: number;
  /** Height, colour (rgb), metal and gloss, a device pixel each. */
  readonly H: Float32Array;
  readonly A: Float32Array;
  readonly M: Float32Array;
  readonly G: Float32Array;

  constructor(
    readonly cw: number,
    readonly ch: number,
    /** A tile: its slopes and shadows wrap across these edges. */
    readonly wrapX = false,
    readonly wrapY = false,
  ) {
    this.w = Math.round(cw * SCALE);
    this.h = Math.round(ch * SCALE);
    const n = this.w * this.h;
    this.H = new Float32Array(n);
    this.A = new Float32Array(n * 3);
    this.M = new Float32Array(n);
    this.G = new Float32Array(n);
  }

  private each(b: Box, fn: (x: number, y: number, i: number) => void): void {
    const x0 = Math.max(0, Math.floor(b[0] * SCALE));
    const y0 = Math.max(0, Math.floor(b[1] * SCALE));
    const x1 = Math.min(this.w, Math.ceil((b[0] + b[2]) * SCALE));
    const y1 = Math.min(this.h, Math.ceil((b[1] + b[3]) * SCALE));
    for (let py = y0; py < y1; py++) for (let px = x0; px < x1; px++) fn((px + 0.5) / SCALE, (py + 0.5) / SCALE, py * this.w + px);
  }

  private put(i: number, s: Surface, k: number): void {
    const a = this.A;
    a[i * 3] += (s.c[0] - a[i * 3]) * k;
    a[i * 3 + 1] += (s.c[1] - a[i * 3 + 1]) * k;
    a[i * 3 + 2] += (s.c[2] - a[i * 3 + 2]) * k;
    this.M[i] += (s.m - this.M[i]) * k;
    this.G[i] += (s.g - this.G[i]) * k;
  }

  /** Paint a material over a box, as much as a mask says (default all). */
  paint(b: Box, mat: Material, mask: (x: number, y: number) => number = () => 1): this {
    this.each(b, (x, y, i) => {
      const k = mask(x, y);
      if (k > 0) this.put(i, mat(x, y), k);
    });
    return this;
  }

  /** Add height over a box. */
  raise(b: Box, fn: (x: number, y: number) => number): this {
    this.each(b, (x, y, i) => {
      this.H[i] += fn(x, y);
    });
    return this;
  }

  /** A bevelled plateau: rises `top` (or sinks, if negative) over `b` px inside the shape's edge, with a rounded shoulder. */
  bevel(s: Shape, box: Box, b: number, top: number): this {
    return this.raise(box, (x, y) => {
      const d = s(x, y);
      return d <= 0 ? 0 : top * Math.sin((clamp(d / b) * Math.PI) / 2);
    });
  }

  /** A round moulding `width` across, straddling the line `at` px inside the shape's edge. */
  rim(s: Shape, box: Box, at: number, width: number, top: number): this {
    return this.raise(box, (x, y) => {
      const t = Math.abs(s(x, y) - at) / (width / 2);
      return t >= 1 ? 0 : top * Math.sqrt(1 - t * t);
    });
  }

  /** Stone's fine roughness. */
  grain(amt: number, f = 0.4, seed = 5): this {
    const t = this.wrapX || this.wrapY ? Math.max(this.cw, this.ch) : 0;
    return this.raise([0, 0, this.cw, this.ch], (x, y) => (fbm(x, y, f, seed, 3, t) - 0.5) * amt);
  }

  /**
   * Cut (depth < 0) or raise (depth > 0) a mask: a device-pixel canvas whose
   * white is full depth (grey less), placed at (x, y) in CSS px.
   */
  stamp(mask: HTMLCanvasElement | OffscreenCanvas, x: number, y: number, depth: number, blur = 0.6): this {
    const v = lumaOf(mask);
    const b = boxBlur(v, mask.width, mask.height, Math.max(1, Math.round(blur * SCALE)));
    this.over(mask, x, y, (_i, j) => depth * (0.5 * v[j] + 0.5 * b[j]), (p, d) => {
      this.H[p] += d;
    });
    return this;
  }

  /** Colour where a mask is. */
  tint(mask: HTMLCanvasElement | OffscreenCanvas, x: number, y: number, mat: Material, k = 1): this {
    const a = alphaOf(mask);
    this.over(mask, x, y, (_i, j) => a[j] * k, (p, t, X, Y) => {
      if (t > 0) this.put(p, mat(X / SCALE, Y / SCALE), t);
    });
    return this;
  }

  private over(mask: { width: number; height: number }, x: number, y: number, val: (i: number, j: number) => number, fn: (p: number, v: number, X: number, Y: number) => void): void {
    const ox = Math.round(x * SCALE);
    const oy = Math.round(y * SCALE);
    for (let j = 0; j < mask.height; j++)
      for (let i = 0; i < mask.width; i++) {
        const X = ox + i;
        const Y = oy + j;
        if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) continue;
        fn(Y * this.w + X, val(i, j * mask.width + i), X, Y);
      }
  }

  /** Light it, into a canvas (`shadows` off for a piece too flat to cast any, like a tile of stone). */
  render(shadows = true): HTMLCanvasElement {
    const { w, h, H, A, M, G, wrapX, wrapY } = this;
    const img = new ImageData(w, h);
    const out = img.data;
    // The lamp: upper left, in front; and the half-way vector for the shine (the eye looks straight in).
    let lx = -0.55, ly = -0.7, lz = 0.62;
    const ll = Math.hypot(lx, ly, lz);
    lx /= ll;
    ly /= ll;
    lz /= ll;
    let hx = lx, hy = ly, hz = lz + 1;
    const hl = Math.hypot(hx, hy, hz);
    hx /= hl;
    hy /= hl;
    hz /= hl;
    const near = boxBlur(H, w, h, 2 * SCALE, wrapX, wrapY);
    const far = boxBlur(H, w, h, 7 * SCALE, wrapX, wrapY);
    const at = (x: number, y: number): number => {
      const X = wrapX ? ((x % w) + w) % w : Math.min(w - 1, Math.max(0, x));
      const Y = wrapY ? ((y % h) + h) % h : Math.min(h - 1, Math.max(0, y));
      return H[Y * w + X];
    };
    const steps = shadows ? 8 * SCALE : 0;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        let nx = -(at(x + 1, y) - at(x - 1, y)) * 0.5;
        let ny = -(at(x, y + 1) - at(x, y - 1)) * 0.5;
        let nz = 1;
        const nl = Math.hypot(nx, ny, nz);
        nx /= nl;
        ny /= nl;
        nz /= nl;
        const ndl = Math.max(0, nx * lx + ny * ly + nz * lz);
        // A soft cast shadow: march toward the lamp, looking for higher ground.
        let sh = 1;
        const h0 = H[i];
        for (let t = 2; t <= steps * 2; t += 2) {
          const sx = Math.round(x - lx * t * 1.25);
          const sy = Math.round(y - ly * t * 1.25);
          if ((!wrapX && (sx < 0 || sx >= w)) || (!wrapY && (sy < 0 || sy >= h))) break;
          const rise = at(sx, sy) - h0 - t * 0.32;
          if (rise > 0) sh = Math.min(sh, 1 - clamp(rise / 2.2) * 0.6);
        }
        const cav = clamp(1 - (far[i] - h0) * 0.07, 0.45, 1.08) * clamp(1 - (near[i] - h0) * 0.1, 0.6, 1.1);
        const m = M[i];
        const dif = (0.42 + 0.7 * (ndl / lz) * sh) / 1.12;
        const spec = Math.pow(Math.max(0, nx * hx + ny * hy + nz * hz), 8 + 70 * G[i]) * (0.08 + 0.9 * m) * sh;
        // Metal sees the room: brighter where it faces up toward the window.
        const env = 0.55 - 0.45 * ny - 0.25 * nx;
        for (let c = 0; c < 3; c++) {
          const a = A[i * 3 + c];
          const metal = a * (0.18 + 0.55 * env * cav) * (0.55 + 0.45 * sh) + spec * (0.55 * a + 0.45) * 1.2;
          const v = a * dif * cav * (1 - m) + metal * m + spec * (1 - m) * 0.6;
          out[i * 4 + c] = clamp(v) * 255;
        }
        out[i * 4 + 3] = 255;
      }
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    (cv.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D).putImageData(img, 0, 0);
    return cv;
  }
}

/** A piece's alpha: transparent wherever a shape (CSS px) says so, after lighting (for round or rounded pieces). */
export function cutOut(cv: HTMLCanvasElement, s: Shape): HTMLCanvasElement {
  const g = cv.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  const d = g.getImageData(0, 0, cv.width, cv.height);
  for (let y = 0; y < cv.height; y++)
    for (let x = 0; x < cv.width; x++) {
      const k = ss(-0.7, 0.7, s((x + 0.5) / SCALE, (y + 0.5) / SCALE));
      d.data[(y * cv.width + x) * 4 + 3] = k * 255;
    }
  g.putImageData(d, 0, 0);
  return cv;
}

export function boxBlur(src: Float32Array, w: number, h: number, r: number, wrapX = false, wrapY = false): Float32Array {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const at = (wrap: boolean) => (v: number, n: number): number => (wrap ? ((v % n) + n) % n : v < 0 ? 0 : v >= n ? n - 1 : v);
  const ixX = at(wrapX);
  const ixY = at(wrapY);
  const k = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += src[row + ixX(x, w)];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc * k;
      acc += src[row + ixX(x + r + 1, w)] - src[row + ixX(x - r, w)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[ixY(y, h) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc * k;
      acc += tmp[ixY(y + r + 1, h) * w + x] - tmp[ixY(y - r, h) * w + x];
    }
  }
  return out;
}

function pixels(c: HTMLCanvasElement | OffscreenCanvas): Uint8ClampedArray {
  return ((c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D).getImageData(0, 0, c.width, c.height)).data;
}
function lumaOf(c: HTMLCanvasElement | OffscreenCanvas): Float32Array {
  const d = pixels(c);
  const v = new Float32Array(c.width * c.height);
  for (let i = 0; i < v.length; i++) v[i] = (d[i * 4 + 3] / 255) * (d[i * 4] / 255);
  return v;
}
function alphaOf(c: HTMLCanvasElement | OffscreenCanvas): Float32Array {
  const d = pixels(c);
  const v = new Float32Array(c.width * c.height);
  for (let i = 0; i < v.length; i++) v[i] = d[i * 4 + 3] / 255;
  return v;
}

// ---------------------------------------------------------------------------
// Masks.

/** A device-pixel canvas `w` × `h` CSS px, drawn on with CSS px. */
export function canvasOf(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.round(w * SCALE);
  c.height = Math.round(h * SCALE);
  const g = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  g.scale(SCALE, SCALE);
  g.fillStyle = '#fff';
  g.strokeStyle = '#fff';
  draw(g);
  return c;
}

/** Text as a mask (white on nothing), `w` × `h` CSS px. */
export function textMask(text: string, font: string, w: number, h: number, spacing = 0): HTMLCanvasElement {
  return canvasOf(w, h, (g) => {
    g.font = font;
    g.textBaseline = 'middle';
    g.textAlign = 'center';
    if (spacing) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`;
    g.fillText(text, w / 2, h / 2 + 1);
  });
}

/**
 * An icon of the interface's SVG kind (paths with classes like fill-soft and
 * stroke-ink) as a relief mask: outlines and ink highest, fills lower. With
 * `solid`, every part is full white (for gilding or a raised icon).
 */
export function iconMask(svg: string, size: number, solid = false): Promise<HTMLCanvasElement> {
  const style = solid
    ? '<style>*{fill:#fff}[class*=stroke-],.s{fill:none!important;stroke:#fff;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}[class*=fill-],.f{stroke:#fff;stroke-width:1.1}</style>'
    : '<style>*{fill:#c4c4c4}[class*=fill-]{fill:#9a9a9a;stroke:#fff;stroke-width:1.15;stroke-linejoin:round}.fill-ink,.fill-warn{fill:#fff;stroke:none}[class*=stroke-]{fill:none!important;stroke:#fff;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.f{fill:#9a9a9a;stroke:#fff;stroke-width:1.15}.s{fill:none;stroke:#fff;stroke-width:1.7;stroke-linecap:round}.m{fill:#fff}</style>';
  const src = svg.replace(/<svg([^>]*)>/, (_m, a: string) => `<svg xmlns="http://www.w3.org/2000/svg"${a.replace(/\sclass="[^"]*"/, '').replace(/\saria-hidden="[^"]*"/, '')}>${style}`);
  return new Promise((done) => {
    const img = new Image();
    const finish = (): void => {
      done(canvasOf(size, size, (g) => {
        if (img.naturalWidth) g.drawImage(img, 0, 0, size, size);
      }));
    };
    img.onload = finish;
    img.onerror = finish;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(src)}`;
  });
}

