/**
 * Sines, cosines and powers that give the same last digit in every browser
 * and in Node, for the simulation and the map.
 *
 * Math.sin, Math.cos and Math.pow are left to each JavaScript engine, and
 * engines differ in the last bit for a few inputs in a hundred (Node 22 and
 * Chromium 141 do), so a town played in one drifts from the same town played
 * in another. These use only + − × ÷ and Math.sqrt / Math.floor, which every
 * engine does exactly the same, following fdlibm (the C library most engines
 * started from) for sin and cos.
 */

const F = new Float64Array(1);
const W = new Uint32Array(F.buffer);
// The high word of a double is W[1] on a little-endian machine (every browser and Node that this game runs on).
const HI = 1;
const LO = 0;
const high = (x: number): number => {
  F[0] = x;
  return W[HI] | 0;
};
const withHigh = (hw: number): number => {
  W[HI] = hw >>> 0;
  W[LO] = 0;
  return F[0];
};

const S1 = -1.66666666666666324348e-1;
const S2 = 8.33333333332248946124e-3;
const S3 = -1.98412698298579493134e-4;
const S4 = 2.75573137070700676789e-6;
const S5 = -2.50507602534068634195e-8;
const S6 = 1.58969099521155010221e-10;

/** sin on [−π/4, π/4], x + y the argument split in two (fdlibm's __kernel_sin). */
function kSin(x: number, y: number, iy: number): number {
  const ix = high(x) & 0x7fffffff;
  if (ix < 0x3e400000) return x;
  const z = x * x;
  const v = z * x;
  const r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
  if (iy === 0) return x + v * (S1 + z * r);
  return x - (z * (0.5 * y - v * r) - y - v * S1);
}

const C1 = 4.16666666666666019037e-2;
const C2 = -1.38888888888741095749e-3;
const C3 = 2.48015872894767294178e-5;
const C4 = -2.75573143513906633035e-7;
const C5 = 2.08757232129817482790e-9;
const C6 = -1.13596475577881948265e-11;

/** cos on [−π/4, π/4] (fdlibm's __kernel_cos). */
function kCos(x: number, y: number): number {
  const ix = high(x) & 0x7fffffff;
  if (ix < 0x3e400000) return 1;
  const z = x * x;
  const r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
  if (ix < 0x3fd33333) return 1 - (0.5 * z - (z * r - x * y));
  const qx = ix > 0x3fe90000 ? 0.28125 : withHigh(ix - 0x00200000);
  const hz = 0.5 * z - qx;
  const a = 1 - qx;
  return a - (hz - (z * r - x * y));
}

const INVPIO2 = 6.36619772367581382433e-1;
const PIO2_1 = 1.57079632673412561417;
const PIO2_1T = 6.07710050650619224932e-11;
const PIO2_2 = 6.07710050630396597660e-11;
const PIO2_2T = 2.02226624879595063154e-21;
const PIO2_3 = 2.02226624871116645580e-21;
const PIO2_3T = 8.47842766036889956997e-32;

/** The argument reduced by a multiple n of π/2: returns n, with the remainder in R[0] + R[1] (fdlibm's __ieee754_rem_pio2, for arguments up to about 2^19·π/2; the game's are far smaller). */
const R = [0, 0];
function remPio2(x: number): number {
  const hx = high(x);
  const ix = hx & 0x7fffffff;
  if (ix < 0x4002d97c) {
    // |x| < 3π/4: n is ±1.
    if (hx > 0) {
      let z = x - PIO2_1;
      if (ix !== 0x3ff921fb) {
        R[0] = z - PIO2_1T;
        R[1] = z - R[0] - PIO2_1T;
      } else {
        z -= PIO2_2;
        R[0] = z - PIO2_2T;
        R[1] = z - R[0] - PIO2_2T;
      }
      return 1;
    }
    let z = x + PIO2_1;
    if (ix !== 0x3ff921fb) {
      R[0] = z + PIO2_1T;
      R[1] = z - R[0] + PIO2_1T;
    } else {
      z += PIO2_2;
      R[0] = z + PIO2_2T;
      R[1] = z - R[0] + PIO2_2T;
    }
    return -1;
  }
  let t = Math.abs(x);
  const n = Math.floor(t * INVPIO2 + 0.5);
  const fn = n;
  let r = t - fn * PIO2_1;
  let w = fn * PIO2_1T;
  const j = ix >> 20;
  R[0] = r - w;
  let i = j - ((high(R[0]) >> 20) & 0x7ff);
  if (i > 16) {
    t = r;
    w = fn * PIO2_2;
    r = t - w;
    w = fn * PIO2_2T - (t - r - w);
    R[0] = r - w;
    i = j - ((high(R[0]) >> 20) & 0x7ff);
    if (i > 49) {
      t = r;
      w = fn * PIO2_3;
      r = t - w;
      w = fn * PIO2_3T - (t - r - w);
      R[0] = r - w;
    }
  }
  R[1] = r - R[0] - w;
  if (hx < 0) {
    R[0] = -R[0];
    R[1] = -R[1];
    return -n;
  }
  return n;
}

/** sin(x), the same in every engine. */
export function dsin(x: number): number {
  const ix = high(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kSin(x, 0, 0);
  if (ix >= 0x7ff00000) return NaN;
  const n = remPio2(x) & 3;
  if (n === 0) return kSin(R[0], R[1], 1);
  if (n === 1) return kCos(R[0], R[1]);
  if (n === 2) return -kSin(R[0], R[1], 1);
  return -kCos(R[0], R[1]);
}

/** cos(x), the same in every engine. */
export function dcos(x: number): number {
  const ix = high(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kCos(x, 0);
  if (ix >= 0x7ff00000) return NaN;
  const n = remPio2(x) & 3;
  if (n === 0) return kCos(R[0], R[1]);
  if (n === 1) return -kSin(R[0], R[1], 1);
  if (n === 2) return -kCos(R[0], R[1]);
  return kSin(R[0], R[1], 1);
}

const BP = [1, 1.5];
const DP_H = [0, 5.84962487220764160156e-1];
const DP_L = [0, 1.35003920212974897128e-8];
const L1 = 5.99999999999994648725e-1;
const L2 = 4.28571428578550184252e-1;
const L3 = 3.33333329818377432918e-1;
const L4 = 2.72728123808534006489e-1;
const L5 = 2.30660745775561754067e-1;
const L6 = 2.06975017800338417784e-1;
const P1 = 1.66666666666666019037e-1;
const P2 = -2.77777777770155933842e-3;
const P3 = 6.61375632143793436117e-5;
const P4 = -1.65339022054652515390e-6;
const P5 = 4.13813679705723846039e-8;
const LG2 = 6.93147180559945286227e-1;
const LG2_H = 6.93147182464599609375e-1;
const LG2_L = -1.90465429995776804525e-9;
const OVT = 8.0085662595372944372e-17;
const CP = 9.61796693925975554329e-1;
const CP_H = 9.61796700954437255859e-1;
const CP_L = -7.02846165095275826516e-9;
const IVLN2 = 1.44269504088896338700;
const IVLN2_H = 1.44269502162933349609;
const IVLN2_L = 1.92596299112661746887e-8;
const TWO53 = 9007199254740992;
const HUGE = 1e300;
const TINY = 1e-300;

/** x with its low word cleared. */
const noLow = (x: number): number => {
  F[0] = x;
  W[LO] = 0;
  return F[0];
};
const setHigh = (x: number, hw: number): number => {
  F[0] = x;
  W[HI] = hw >>> 0;
  return F[0];
};
const low = (x: number): number => {
  F[0] = x;
  return W[LO] >>> 0;
};

/** x times 2^n, by halving or doubling (exact, as scalbn is, short of the subnormal range's rounding). */
function scale(x: number, n: number): number {
  let r = x;
  let k = n;
  while (k > 0) {
    r *= 2;
    k--;
  }
  while (k < 0) {
    r *= 0.5;
    k++;
  }
  return r;
}

/**
 * x to the power y, the same in every engine (fdlibm's __ieee754_pow, as Node 22's Math.pow is).
 * For the game's own use: finite x and y; x below zero only with a whole y.
 */
export function dpow(x: number, y: number): number {
  const hx = high(x);
  const lx = low(x);
  const hy = high(y);
  const ly = low(y);
  let ix = hx & 0x7fffffff;
  const iy = hy & 0x7fffffff;
  if ((iy | ly) === 0) return 1;
  if (Number.isNaN(x) || Number.isNaN(y)) return NaN;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return Math.pow(x, y);
  // Is y an odd (1) or even (2) whole number, for x below zero?
  let yisint = 0;
  if (hx < 0) {
    if (iy >= 0x43400000) yisint = 2;
    else if (iy >= 0x3ff00000) {
      const k = (iy >> 20) - 0x3ff;
      if (k > 20) {
        const j = ly >>> (52 - k);
        if (((j << (52 - k)) >>> 0) === ly) yisint = 2 - (j & 1);
      } else if (ly === 0) {
        const j = iy >> (20 - k);
        if (j << (20 - k) === iy) yisint = 2 - (j & 1);
      }
    }
  }
  if (ly === 0) {
    if (iy === 0x3ff00000) return hy < 0 ? 1 / x : x;
    if (hy === 0x40000000) return x * x;
    if (hy === 0x3fe00000 && hx >= 0) return Math.sqrt(x);
  }
  let ax = Math.abs(x);
  if (lx === 0 && (ix === 0 || ix === 0x3ff00000)) {
    let z = ax;
    if (hy < 0) z = 1 / z;
    if (hx < 0) {
      if (((ix - 0x3ff00000) | yisint) === 0) z = NaN;
      else if (yisint === 1) z = -z;
    }
    return z;
  }
  let n = (hx >>> 31) - 1;
  if ((n | yisint) === 0) return NaN;
  let s = 1;
  if ((n | (yisint - 1)) === 0) s = -1;
  let t1: number;
  let t2: number;
  if (iy > 0x41e00000) {
    if (iy > 0x43f00000) {
      if (ix <= 0x3fefffff) return hy < 0 ? HUGE * HUGE : TINY * TINY;
      if (ix >= 0x3ff00000) return hy > 0 ? HUGE * HUGE : TINY * TINY;
    }
    if (ix < 0x3fefffff) return hy < 0 ? s * HUGE * HUGE : s * TINY * TINY;
    if (ix > 0x3ff00000) return hy > 0 ? s * HUGE * HUGE : s * TINY * TINY;
    const t = ax - 1;
    const w = t * t * (0.5 - t * (3.3333333333333331e-1 - t * 0.25));
    const u = IVLN2_H * t;
    const v = t * IVLN2_L - w * IVLN2;
    t1 = noLow(u + v);
    t2 = v - (t1 - u);
  } else {
    n = 0;
    if (ix < 0x00100000) {
      ax *= TWO53;
      n -= 53;
      ix = high(ax);
    }
    n += (ix >> 20) - 0x3ff;
    const j = ix & 0x000fffff;
    ix = j | 0x3ff00000;
    let k: number;
    if (j <= 0x3988e) k = 0;
    else if (j < 0xbb67a) k = 1;
    else {
      k = 0;
      n += 1;
      ix -= 0x00100000;
    }
    ax = setHigh(ax, ix);
    let u = ax - BP[k];
    let v = 1 / (ax + BP[k]);
    const ss = u * v;
    const sH = noLow(ss);
    let tH = withHigh(((ix >> 1) | 0x20000000) + 0x00080000 + (k << 18));
    let tL = ax - (tH - BP[k]);
    const sL = v * (u - sH * tH - sH * tL);
    let s2 = ss * ss;
    let r = s2 * s2 * (L1 + s2 * (L2 + s2 * (L3 + s2 * (L4 + s2 * (L5 + s2 * L6)))));
    r += sL * (sH + ss);
    s2 = sH * sH;
    tH = noLow(3 + s2 + r);
    tL = r - (tH - 3 - s2);
    u = sH * tH;
    v = sL * tH + tL * ss;
    const pH = noLow(u + v);
    const pL = v - (pH - u);
    const zH = CP_H * pH;
    const zL = CP_L * pH + pL * CP + DP_L[k];
    const t = n;
    t1 = noLow(zH + zL + DP_H[k] + t);
    t2 = zL - (t1 - t - DP_H[k] - zH);
  }
  // (y1 + y2) × (t1 + t2), with y split in two.
  const y1 = noLow(y);
  const pL = (y - y1) * t1 + y * t2;
  let pH = y1 * t1;
  let z = pL + pH;
  let j = high(z);
  const i0 = low(z);
  if (j >= 0x40900000) {
    if (((j - 0x40900000) | i0) !== 0) return s * HUGE * HUGE;
    if (pL + OVT > z - pH) return s * HUGE * HUGE;
  } else if ((j & 0x7fffffff) >= 0x4090cc00) {
    if (((j - 0xc090cc00) | i0) !== 0) return s * TINY * TINY;
    if (pL <= z - pH) return s * TINY * TINY;
  }
  // 2 to the power pH + pL.
  const i = j & 0x7fffffff;
  let k = (i >> 20) - 0x3ff;
  n = 0;
  if (i > 0x3fe00000) {
    n = j + (0x00100000 >> (k + 1));
    k = ((n & 0x7fffffff) >> 20) - 0x3ff;
    const t = withHigh(n & ~(0x000fffff >> k));
    n = ((n & 0x000fffff) | 0x00100000) >> (20 - k);
    if (j < 0) n = -n;
    pH -= t;
  }
  const t = noLow(pL + pH);
  const u = t * LG2_H;
  const v = (pL - (t - pH)) * LG2 + t * LG2_L;
  z = u + v;
  const w = v - (z - u);
  const tt = z * z;
  const tt1 = z - tt * (P1 + tt * (P2 + tt * (P3 + tt * (P4 + tt * P5))));
  const r = (z * tt1) / (tt1 - 2) - (w + z * w);
  z = 1 - (r - z);
  j = high(z);
  j += n << 20;
  if (j >> 20 <= 0) z = scale(z, n);
  else z = setHigh(z, j);
  return s * z;
}

/** √(a² + b²), the same in every engine (V8's Math.hypot for two numbers: scaled by the larger, Kahan-summed). */
export function dhypot(a: number, b: number): number {
  const x = Math.abs(a);
  const y = Math.abs(b);
  if (x === Infinity || y === Infinity) return Infinity;
  if (Number.isNaN(x) || Number.isNaN(y)) return NaN;
  const max = x > y ? x : y;
  if (max === 0) return 0;
  const n0 = x / max;
  const s0 = n0 * n0;
  const c0 = s0 - s0;
  const n1 = y / max;
  const s1 = n1 * n1 - c0;
  return Math.sqrt(s0 + s1) * max;
}

const ATANHI = [4.63647609000806093515e-1, 7.85398163397448278999e-1, 9.82793723247329054082e-1, 1.57079632679489655800];
const ATANLO = [2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17, 6.12323399573676603587e-17];
const AT = [
  3.33333333333329318027e-1, -1.99999999998764832476e-1, 1.42857142725034663711e-1, -1.11111104054623557880e-1, 9.09088713343650656196e-2,
  -7.69187620504482999495e-2, 6.66107313738753120669e-2, -5.83357013379057348645e-2, 4.97687799461593236017e-2, -3.65315727442169155270e-2,
  1.62858201153657823623e-2,
];

/** atan(x) (fdlibm's). */
function datan(x0: number): number {
  const hx = high(x0);
  const ix = hx & 0x7fffffff;
  let x = x0;
  if (ix >= 0x44100000) return hx > 0 ? ATANHI[3] + ATANLO[3] : -ATANHI[3] - ATANLO[3];
  let id: number;
  if (ix < 0x3fdc0000) {
    if (ix < 0x3e400000) return x;
    id = -1;
  } else {
    x = Math.abs(x);
    if (ix < 0x3ff30000) {
      if (ix < 0x3fe60000) {
        id = 0;
        x = (2 * x - 1) / (2 + x);
      } else {
        id = 1;
        x = (x - 1) / (x + 1);
      }
    } else if (ix < 0x40038000) {
      id = 2;
      x = (x - 1.5) / (1 + 1.5 * x);
    } else {
      id = 3;
      x = -1 / x;
    }
  }
  const z = x * x;
  const w = z * z;
  const s1 = z * (AT[0] + w * (AT[2] + w * (AT[4] + w * (AT[6] + w * (AT[8] + w * AT[10])))));
  const s2 = w * (AT[1] + w * (AT[3] + w * (AT[5] + w * (AT[7] + w * AT[9]))));
  if (id < 0) return x - x * (s1 + s2);
  const r = ATANHI[id] - (x * (s1 + s2) - ATANLO[id] - x);
  return hx < 0 ? -r : r;
}

const PI_O_2 = 1.570796326794896558;
const PI = 3.141592653589793116;
const PI_LO = 1.2246467991473531772e-16;

/** atan2(y, x), the same in every engine (fdlibm's, as V8's is). */
export function datan2(y: number, x: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return Math.atan2(y, x);
  const hx = high(x);
  const lx = low(x);
  const ix = hx & 0x7fffffff;
  const hy = high(y);
  const ly = low(y);
  const iy = hy & 0x7fffffff;
  if (hx === 0x3ff00000 && lx === 0) return datan(y);
  let m = ((hy >> 31) & 1) | ((hx >> 30) & 2);
  if ((iy | ly) === 0) {
    if (m === 0 || m === 1) return y;
    return m === 2 ? PI + 1e-300 : -PI - 1e-300;
  }
  if ((ix | lx) === 0) return hy < 0 ? -PI_O_2 - 1e-300 : PI_O_2 + 1e-300;
  const k = (iy - ix) >> 20;
  let z: number;
  if (k > 60) {
    z = PI_O_2 + 0.5 * PI_LO;
    m &= 1;
  } else if (hx < 0 && k < -60) z = 0;
  else z = datan(Math.abs(y / x));
  if (m === 0) return z;
  if (m === 1) return -z;
  if (m === 2) return PI - (z - PI_LO);
  return z - PI_LO - PI;
}

const LN2_HI = 6.93147180369123816490e-1;
const LN2_LO = 1.90821492927058770002e-10;
const INVLN2 = 1.44269504088896338700;

/** e to the x, the same in every engine (fdlibm's, as V8's is). */
export function dexp(x0: number): number {
  let x = x0;
  let hx = high(x);
  const xsb = (hx >>> 31) & 1;
  hx &= 0x7fffffff;
  if (hx >= 0x40862e42) {
    if (!Number.isFinite(x)) return Math.exp(x);
    if (x > 7.09782712893383973096e2) return Infinity;
    if (x < -7.45133219101941108420e2) return 0;
  }
  let hi = 0;
  let lo = 0;
  let k = 0;
  if (hx > 0x3fd62e42) {
    if (hx < 0x3ff0a2b2) {
      if (x === 1) return Math.E;
      hi = x - (xsb ? -LN2_HI : LN2_HI);
      lo = xsb ? -LN2_LO : LN2_LO;
      k = 1 - xsb - xsb;
    } else {
      k = Math.trunc(INVLN2 * x + (xsb ? -0.5 : 0.5));
      hi = x - k * LN2_HI;
      lo = k * LN2_LO;
    }
    x = hi - lo;
  } else if (hx < 0x3e300000) return 1 + x;
  const t = x * x;
  const twopk = k >= -1021 ? withHigh(0x3ff00000 + (k << 20)) : withHigh(0x3ff00000 + ((k + 1000) << 20));
  const c = x - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
  if (k === 0) return 1 - ((x * c) / (c - 2) - x);
  const y = 1 - (lo - (x * c) / (2 - c) - hi);
  if (k >= -1021) return k === 1024 ? y * 2 * 8.98846567431158e307 : y * twopk;
  return y * twopk * 9.33263618503218878990e-302;
}

/** x², as x × x (which `x ** 2` leaves to the engine). */
export const sq = (x: number): number => x * x;
