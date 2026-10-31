/**
 * Slice 50: the panels' drawn icons, in one place, all SVG written here (no
 * art from outside). Four families:
 *
 * - **Goods:** every ware (slice 48's drawings in wareicons.ts, reached
 *   through `goodIcon`).
 * - **Units:** a figure for each kind of company (hoplite, archer, horseman;
 *   the Cretan and Arcadian hirelings and an ally's or a militia's company in
 *   their own colours) and the trireme, for the Army tab's cards.
 * - **Buildings:** the build bar's drawings (buildbar.ts), coloured for a
 *   pale ground by the kit's sheet (`.k-bic`).
 * - **Actions:** a small drawing for every kind of button (raise, dismiss,
 *   back to barracks, go there, follow, pause, accept, get, sell, keep…) and
 *   for every kind of message (`messageIcon`).
 *
 * They are strings, so the panels (built as strings and morphed in place)
 * can use them anywhere.
 */
import type { MessageKind } from '../sim/messages';
import type { BuildingKind, CompanyKind } from '../sim/state';
import type { Ware } from '../sim/foods';
import { TRADE_GOODS } from '../sim/trade';
import { ICONS as TOOL_ICONS, type ButtonName } from './buildbar';
import { ICONS as LINE_ICONS } from './townlines';
import { wareIcon } from './wareicons';

const svg = (box: string, body: string, cls = 'ki'): string => `<svg viewBox="${box}" class="${cls}" aria-hidden="true">${body}</svg>`;

// ---------------------------------------------------------------------------- goods

/** A ware's icon (slice 48's drawings). */
export const goodIcon = (w: Ware): string => wareIcon(w);
/** A trade good's icon by its index in the trade goods (where the Greece pages had a colour swatch); '' for none. */
export const tradeIcon = (k: number): string => (k >= 0 && TRADE_GOODS[k] !== undefined ? wareIcon(TRADE_GOODS[k]).replace('class="ic"', 'class="ic sw"') : '');

// ---------------------------------------------------------------------------- units

/** How a company is dressed: its tunic, its crest or cap, its shield's field and emblem. */
export interface Dress {
  tunic: string;
  crest: string;
  shield: string;
  emblem: string;
}
/** Your own men: red tunics, red crests, bronze shields with a lapis emblem. */
export const OWN_DRESS: Dress = { tunic: '#a8402c', crest: '#b8322a', shield: '#c8963c', emblem: '#2c4a86' };
/** The Cretan archers' green and the Arcadian hoplites' blue (as their figures in the city). */
export const CRETAN_DRESS: Dress = { tunic: '#4f7a3a', crest: '#3a5a2a', shield: '#8a7a4a', emblem: '#e8dcb0' };
export const ARCADIAN_DRESS: Dress = { tunic: '#38558a', crest: '#22386a', shield: '#c8a04a', emblem: '#f0e2b8' };

const SKIN = '#c98f5e';
const SKIN_EDGE = '#6a4024';
const BRONZE = '#c8963c';
const BRONZE_EDGE = '#5e4214';
const SHADOW = '<ellipse cx="20" cy="45.4" rx="12.5" ry="2.2" fill="rgba(40,24,8,0.22)"/>';

/** A hoplite: crested Corinthian helmet, bronze cuirass, round shield, spear. */
function hopliteFigure(d: Dress): string {
  return svg(
    '0 0 40 48',
    `${SHADOW}<path d="M31.4 4.6V45" stroke="#6a4a24" stroke-width="1.7" stroke-linecap="round"/><path d="M31.4.8l-1.9 4.6h3.8z" fill="#d8d6cc" stroke="#55524a" stroke-width=".7" stroke-linejoin="round"/>` +
      `<path d="M15.6 33.6l-1.2 11h3.2l1.4-11zM21.2 33.6l1.2 11h3.2l-1.2-11z" fill="${SKIN}" stroke="${SKIN_EDGE}" stroke-width=".7"/><path d="M14.5 38.6h3.6l-.5 5.2h-3.5zM22.4 38.6H26l.5 5.2H23z" fill="${BRONZE}" stroke="${BRONZE_EDGE}" stroke-width=".6"/>` +
      `<path d="M13.4 24h13.4l1.8 11.2H11.6z" fill="${d.tunic}" stroke="#4a1a10" stroke-width=".8" stroke-linejoin="round"/><path d="M12.4 31.4h15.4" stroke="rgba(0,0,0,.25)" stroke-width=".8"/>` +
      `<path d="M14 16.6h12.2l1 8.6H13z" fill="${BRONZE}" stroke="${BRONZE_EDGE}" stroke-width=".9" stroke-linejoin="round"/><path d="M16 19.4q4 1.4 8.2 0M20.1 18.6v6" stroke="${BRONZE_EDGE}" stroke-width=".7" fill="none"/>` +
      `<path d="M26 18.4l5.4 4.2" stroke="${SKIN}" stroke-width="2.6" stroke-linecap="round"/><circle cx="31.4" cy="22.8" r="1.5" fill="${SKIN}" stroke="${SKIN_EDGE}" stroke-width=".5"/>` +
      `<path d="M14.6 12.6c0-4.4 2.4-6.8 5.6-6.8s5.6 2.4 5.6 6.8v4.6h-2.8l-.6-3.1h-4.4l-.6 3.1h-2.8z" fill="${BRONZE}" stroke="${BRONZE_EDGE}" stroke-width=".9" stroke-linejoin="round"/><path d="M17.2 11.2h6" stroke="#2a1a0a" stroke-width="1.3" stroke-linecap="round"/><path d="M20.2 11.4v3" stroke="#2a1a0a" stroke-width="1"/>` +
      `<path d="M13.4 8.6C14.2 2 26.2 2 27 8.6l-2 .3c-.9-3.6-8.7-3.6-9.6 0z" fill="${d.crest}" stroke="#4a1410" stroke-width=".7" stroke-linejoin="round"/><path d="M15.4 5.4l-.8-1.2M18 3.6l-.4-1.4M20.4 3.2V1.8M22.8 3.6l.4-1.4M25 5.2l.8-1.2" stroke="${d.crest}" stroke-width="1" stroke-linecap="round"/>` +
      `<circle cx="15.6" cy="27.2" r="9.6" fill="${d.shield}" stroke="${BRONZE_EDGE}" stroke-width="1.2"/><circle cx="15.6" cy="27.2" r="7.6" fill="none" stroke="rgba(255,240,200,.45)" stroke-width=".8"/><path d="M11.4 24.2q1-2.4 3.4-3.2" stroke="rgba(255,248,220,.75)" stroke-width="1" fill="none" stroke-linecap="round"/>` +
      `<path d="M15.6 22.4l1.4 3.4 3.6.2-2.8 2.2 1 3.6-3.2-2-3.2 2 1-3.6-2.8-2.2 3.6-.2z" fill="${d.emblem}" stroke="rgba(20,10,0,.4)" stroke-width=".4" stroke-linejoin="round"/>`,
    'ki fig',
  );
}

/** An archer: a felt cap, a quiver, the bow drawn. */
function archerFigure(d: Dress): string {
  return svg(
    '0 0 40 48',
    `${SHADOW}<path d="M11.6 13.4l3.4-1.6 4.4 11.6-3.4 1.6z" fill="#8a5a2c" stroke="#3a2410" stroke-width=".7" stroke-linejoin="round"/><path d="M12.2 12.4l-1-2.4M13.4 11.8l-.6-2.6M14.6 11.4l-.2-2.6" stroke="#e8dcb0" stroke-width=".8" stroke-linecap="round"/>` +
      `<path d="M15.8 33.4l-1.6 11.2h3.2l1.8-11.2zM21.2 33.4l1.8 11.2h3.2l-1.6-11.2z" fill="${SKIN}" stroke="${SKIN_EDGE}" stroke-width=".7"/><path d="M14.2 42.8h3.4M22.6 42.8H26" stroke="#5a3a1e" stroke-width="2.2"/>` +
      `<path d="M14 18.4h11.6l2.2 16H11.8z" fill="${d.tunic}" stroke="#20300e" stroke-width=".8" stroke-linejoin="round"/><path d="M13.2 25.6h13.4" stroke="#5a3a1e" stroke-width="1.4"/><path d="M13 30.6l13.8-.2" stroke="rgba(0,0,0,.2)" stroke-width=".8"/>` +
      `<path d="M30.2 4.2Q39.6 21 30.2 38" stroke="#6a4424" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M30.2 4.2 23.4 21l6.8 17" stroke="#efe6cc" stroke-width=".7" fill="none"/>` +
      `<path d="M24 19.6l9.8 1.6M22.6 19.4l13.4 1.8" stroke="${SKIN}" stroke-width="2.4" stroke-linecap="round"/><path d="M23.4 21h14.2" stroke="#3a2410" stroke-width=".9"/><path d="M37.6 21l-2-1.2v2.4z" fill="#8a8a80"/><path d="M23.6 21l-1.4-1.2M23.6 21l-1.4 1.2" stroke="#b8322a" stroke-width=".8"/>` +
      `<circle cx="19.8" cy="12.6" r="4" fill="${SKIN}" stroke="${SKIN_EDGE}" stroke-width=".8"/><circle cx="21.4" cy="12.2" r=".6" fill="#2a1a0a"/><path d="M15.4 11.4C15.6 5.6 24 5.6 24.2 11.4z" fill="${d.crest}" stroke="#2a1a0a" stroke-width=".7" stroke-linejoin="round"/><path d="M19.8 6.2V4.6" stroke="${d.crest}" stroke-width="1.6" stroke-linecap="round"/>`,
    'ki fig',
  );
}

/** A horseman: a bay horse in its stride, its rider with a crested helmet and a spear. */
function horsemanFigure(d: Dress): string {
  return svg(
    '0 0 48 48',
    `<ellipse cx="24" cy="45.4" rx="17" ry="2.2" fill="rgba(40,24,8,0.22)"/>` +
      `<path d="M11.6 30.6c-4 1.2-5.4 5-4.6 10.4" stroke="#2e1c0e" stroke-width="2.2" fill="none" stroke-linecap="round"/>` +
      `<path d="M15.4 33.4l-2.6 11.2M19.6 34.6l.8 10.4M30 34.6l-1.4 10.6M34 33.2l3.4 10.4" stroke="#6a4224" stroke-width="2.4" stroke-linecap="round"/><path d="M12.2 44.6h2M19.8 45h2M28 45h2M36.8 43.8l1.8.6" stroke="#2a1a0a" stroke-width="1.6" stroke-linecap="round"/>` +
      `<path d="M10.8 29.6c0-4 4-6.6 9.6-6.6h9.4c3 0 5.2-1.8 6.8-4.6l2-3.6c1.4-.4 3 .2 3.6 1l3 5c.4.8 0 1.6-.8 1.8l-2.8-.4c-1.4 2.4-2.4 4.4-3.2 7.8-.8 3-2.8 5.4-7 5.4H18.6c-4.6 0-7.8-2-7.8-5.8z" fill="#8a5a34" stroke="#3a2412" stroke-width=".9" stroke-linejoin="round"/>` +
      `<path d="M37.2 15.4l-3.4 8.6M38.6 14.2l1.6-2.6" stroke="#2e1c0e" stroke-width="2" stroke-linecap="round"/><circle cx="41.4" cy="17.6" r=".7" fill="#1a120c"/><path d="M14.4 27q6-2.4 12.4-.4" stroke="rgba(255,220,180,.35)" stroke-width="1" fill="none" stroke-linecap="round"/>` +
      `<path d="M19.2 22.6h9.2l1.4 3.2h-12z" fill="${d.shield}" stroke="${BRONZE_EDGE}" stroke-width=".6"/>` +
      `<path d="M22.6 24.2l-1.4 7.6 2.4.4" stroke="${SKIN}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M20.6 13.6h7.4l1 9.6h-9.4z" fill="${d.tunic}" stroke="#4a1a10" stroke-width=".8" stroke-linejoin="round"/><path d="M21 14h6.6l.4 4.6H20.6z" fill="${BRONZE}" stroke="${BRONZE_EDGE}" stroke-width=".6"/>` +
      `<path d="M38 2.6 14 34" stroke="#6a4a24" stroke-width="1.5" stroke-linecap="round"/><path d="M38.8 1.4l-.4 3.6-2.6-1.8z" fill="#d8d6cc" stroke="#55524a" stroke-width=".5"/><path d="M27.4 15.6l3.4 1.4" stroke="${SKIN}" stroke-width="2.2" stroke-linecap="round"/>` +
      `<circle cx="24.2" cy="10" r="3.4" fill="${SKIN}" stroke="${SKIN_EDGE}" stroke-width=".7"/><path d="M20.6 10.4c0-3.6 1.6-5.2 3.6-5.2s3.6 1.6 3.6 5.2l-1.2.2-.6-1.6h-3.6l-.6 1.6z" fill="${BRONZE}" stroke="${BRONZE_EDGE}" stroke-width=".7"/><path d="M20 6.4c1-3.4 7.4-3.4 8.4 0l-1.4.2c-.8-1.8-4.8-1.8-5.6 0z" fill="${d.crest}" stroke="#4a1410" stroke-width=".5"/>`,
    'ki fig fwide',
  );
}

/** A trireme under sail: her ram, her eye, her oars, her striped sail. */
export const TRIREME_FIGURE = svg(
  '0 0 48 36',
  `<path d="M2 31.4q4-2 8 0t8 0 8 0 8 0 8 0 6 0" stroke="#5a8ab0" stroke-width="1.2" fill="none" stroke-linecap="round"/>` +
    `<path d="M10 23.6l-3.6 6M14 23.8l-3.6 6M18 24l-3.6 6M22 24l-3.6 6M26 24l-3.6 6M30 24l-3.6 6M34 23.8l-3.6 6M38 23.6l-3.6 6" stroke="#6a4424" stroke-width="1" stroke-linecap="round"/>` +
    `<path d="M4.2 19.4h37.6l4.6 2.2-4 .6-2.4 3H8.2c-2.2 0-3.6-1.4-4-3.6z" fill="#7a4a2c" stroke="#3a2010" stroke-width=".9" stroke-linejoin="round"/><path d="M6 21.6h34" stroke="#b8322a" stroke-width="1.1"/><circle cx="40.4" cy="21" r=".9" fill="#f0e6c8" stroke="#2a1a0a" stroke-width=".4"/>` +
    `<path d="M4.2 19.4C1.6 16 2.4 12.4 5.6 11.2" stroke="#7a4a2c" stroke-width="1.6" fill="none" stroke-linecap="round"/>` +
    `<path d="M23 2.4v17" stroke="#5a3a1e" stroke-width="1.3"/><path d="M13.6 4.4h18.8l-1 11.6H14.6z" fill="#f2e6c8" stroke="#8a6a44" stroke-width=".8" stroke-linejoin="round"/><path d="M13.9 8.2h18.2M14.2 12.2h17.6" stroke="#c0462e" stroke-width="1.6"/><path d="M12.6 4.4h20.8" stroke="#5a3a1e" stroke-width="1.1" stroke-linecap="round"/>`,
  'ki fig ship',
);

/** The figure for a company: by its kind, dressed as its hirelings or its ally if it is one. */
export function unitFigure(kind: CompanyKind, hired: '' | 'cretan' | 'arcadian' = '', ally = ''): string {
  const d = hired === 'cretan' ? CRETAN_DRESS : hired === 'arcadian' ? ARCADIAN_DRESS : ally ? { ...OWN_DRESS, tunic: ally, crest: ally, emblem: '#f0e2b8' } : OWN_DRESS;
  if (kind === 'horseman') return horsemanFigure(d);
  if (kind === 'archer') return archerFigure(d);
  return hopliteFigure(d);
}

// ---------------------------------------------------------------------------- the city's walkers (merge of slice 50 with slice 49)

/** A physician on her round: a pale himation with a blue hem, a satchel, the rod of Asklepios in her hand. */
export const PHYSICIAN_FIGURE = svg(
  '0 0 40 48',
  `${SHADOW}<path d="M31 6v39" stroke="#6a4a24" stroke-width="1.6" stroke-linecap="round"/><path d="M29.4 38.6c3.2-1 3.2-3 0-4s-3.2-3 0-4 3.2-3 0-4-3.2-3 0-4 2.6-2.4 1.6-3.8" fill="none" stroke="#3f8a62" stroke-width="1.5" stroke-linecap="round"/><circle cx="30.8" cy="14.4" r="1.1" fill="#3f8a62"/>` +
    `<path d="M16 36.4l-1 8.4h3l1.2-8.4zM21.4 36.4l1 8.4h3l-1-8.4z" fill="${SKIN}" stroke="${SKIN_EDGE}" stroke-width=".7"/><path d="M14.4 44.4h3.6M22.2 44.4h3.6" stroke="#5a3a1e" stroke-width="1.6"/>` +
    `<path d="M13.6 17.6h12.6l2.6 20.4H11.2z" fill="#efe6d0" stroke="#7a6446" stroke-width=".8" stroke-linejoin="round"/><path d="M11.6 36.4h17" stroke="#2c6a8a" stroke-width="1.5"/><path d="M14 18.4l11.6 9.6M14.4 24.6l9.8 8" stroke="rgba(120,96,60,.45)" stroke-width=".8" fill="none"/>` +
    `<path d="M9.4 26.2h6.2v5.8c0 1-.8 1.6-1.6 1.6H11c-.8 0-1.6-.6-1.6-1.6z" fill="#8a5a2c" stroke="#3a2410" stroke-width=".7" stroke-linejoin="round"/><path d="M12.4 26.2l2.6-8" stroke="#5a3a1e" stroke-width=".9"/>` +
    `<path d="M25.6 20.6l5 3.8" stroke="${SKIN}" stroke-width="2.4" stroke-linecap="round"/><circle cx="31" cy="24.6" r="1.4" fill="${SKIN}" stroke="${SKIN_EDGE}" stroke-width=".5"/>` +
    `<circle cx="19.8" cy="12.2" r="4.4" fill="${SKIN}" stroke="${SKIN_EDGE}" stroke-width=".8"/><circle cx="21.3" cy="11.9" r=".6" fill="#2a1a0a"/><path d="M15.2 12.4c-.4-4.4 1.8-6.6 4.6-6.6s5 2.2 4.6 6.4c-.8-2.2-2.4-3.4-4.6-3.4s-3.8 1.2-4.6 3.6z" fill="#4a2e1a" stroke="#2a1a0a" stroke-width=".6" stroke-linejoin="round"/><path d="M15.4 12.2c-.6 2.2-.2 4 .8 5" stroke="#4a2e1a" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  'ki fig',
);

/** One stretcher-bearer, facing the way he walks (dir 1 right, -1 left), at x. */
const bearer = (x: number, dir: number): string =>
  `<path d="M${x - 3} 33.6l-1.2 10.6h2.8l1.4-10.6zM${x + 1.2} 33.6l1.2 10.6h2.8l-1.2-10.6z" fill="${SKIN}" stroke="${SKIN_EDGE}" stroke-width=".7"/><path d="M${x - 4.8} 43.8h3.6M${x + 1.6} 43.8h3.6" stroke="#5a3a1e" stroke-width="1.5"/>` +
  `<path d="M${x - 4.6} 18.8h9.2l1.8 15.6H${x - 6.4}z" fill="#6f8aa0" stroke="#2c3e4e" stroke-width=".8" stroke-linejoin="round"/><path d="M${x - 5.6} 26.4h11.4" stroke="#3a4a58" stroke-width="1.2"/>` +
  `<path d="M${x + dir * 2.6} 20.8l${dir * 3.4} 6.2" stroke="${SKIN}" stroke-width="2.3" stroke-linecap="round"/>` +
  `<circle cx="${x}" cy="13.6" r="3.8" fill="${SKIN}" stroke="${SKIN_EDGE}" stroke-width=".8"/><circle cx="${x + dir * 1.5}" cy="13.3" r=".55" fill="#2a1a0a"/><path d="M${x - 3.8} 13c0-3.4 1.6-5 3.8-5s3.8 1.6 3.8 5c-1-1.4-2.2-2-3.8-2s-2.8.6-3.8 2z" fill="#3a2414"/>`;

/** The asklepieion's stretcher-bearers: two men carrying the sick one between them on a litter. */
export const BEARERS_FIGURE = svg(
  '0 0 48 48',
  `<ellipse cx="24" cy="45.4" rx="21" ry="2.2" fill="rgba(40,24,8,0.22)"/>${bearer(40, -1)}` +
    `<path d="M5 27.4h38" stroke="#6a4a24" stroke-width="1.7" stroke-linecap="round"/><path d="M11.6 23.4h24.6v4H11.6z" fill="#e8dcc0" stroke="#8a6a44" stroke-width=".8" stroke-linejoin="round"/>` +
    `<path d="M16.4 23.6c1.4-2.6 4.6-3.6 9.6-3.4 4.4.2 7.6 1.2 9.6 3.4z" fill="#b8564a" stroke="#6e2a1a" stroke-width=".8" stroke-linejoin="round"/><circle cx="14.2" cy="21.4" r="2.6" fill="${SKIN}" stroke="${SKIN_EDGE}" stroke-width=".7"/>` +
    bearer(8, 1),
  'ki fig fwide',
);

/** A walker's figure for a building panel's row (the health buildings' for now; '' for one without). */
export function walkerFigure(kind: string): string {
  if (kind === 'physician') return PHYSICIAN_FIGURE;
  if (kind === 'bearer') return BEARERS_FIGURE;
  return '';
}

// ---------------------------------------------------------------------------- buildings

/** A building's picture: its build button's drawing (coloured by `.k-bic`), the tent for a home. */
export function buildingIcon(kind: BuildingKind | ButtonName): string {
  const name = (kind === 'home' ? 'housing' : kind) as ButtonName;
  const body = TOOL_ICONS[name] ?? TOOL_ICONS.housing;
  return body.replace('<svg ', '<svg class="k-bic" aria-hidden="true" ');
}

// ---------------------------------------------------------------------------- actions

const I = (body: string): string => svg('0 0 24 24', body);
const INK = '#3a2814';

/** Every action's drawing, by name. */
export const ACTION_ICONS = {
  /** A banner on its pole: take it in hand, to march. */
  banner: I(`<path d="M6.4 2.6v19" stroke="${INK}" stroke-width="1.7" stroke-linecap="round"/><path d="M7 3.6h11.4l-3 4 3 4H7z" fill="#2c4a86" stroke="#14254a" stroke-width="1" stroke-linejoin="round"/><circle cx="11.6" cy="7.6" r="1.7" fill="#e2b24e"/>`),
  /** Raise a company: a banner and a plus. */
  raise: I(`<path d="M5.4 2.6v19" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/><path d="M6 3.6h9.4l-2.6 3.4 2.6 3.4H6z" fill="#b8322a" stroke="#5e1410" stroke-width=".9" stroke-linejoin="round"/><circle cx="17.4" cy="17" r="5" fill="#e2b24e" stroke="#6a4a1c" stroke-width="1"/><path d="M17.4 14.2v5.6M14.6 17h5.6" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`),
  /** Hire: a little heap of drachmas. */
  hire: I(`<ellipse cx="9.4" cy="17.6" rx="6.4" ry="2.4" fill="#a07a1e" stroke="#5e4214" stroke-width=".8"/><ellipse cx="9.4" cy="15.6" rx="6.4" ry="2.4" fill="#d9b04a" stroke="#5e4214" stroke-width=".8"/><ellipse cx="9.4" cy="13.6" rx="6.4" ry="2.4" fill="#e8c460" stroke="#5e4214" stroke-width=".8"/><circle cx="16.6" cy="8.4" r="5" fill="#e8c460" stroke="#5e4214" stroke-width=".9"/><path d="M15 8.4h3.2M16.6 6.6v3.6" stroke="#8a5a14" stroke-width="1.1" stroke-linecap="round"/>`),
  /** Dismiss: out through the gate. */
  dismiss: I(`<path d="M4 21V5.4l7-2v19" fill="#d8c8a0" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/><circle cx="9" cy="12.6" r=".9" fill="${INK}"/><path d="M13 12h8.4m-3.2-3.4L21.6 12l-3.4 3.4" stroke="#8c2f26" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  /** Back to barracks: an arrow coming round home. */
  recall: I(`<path d="M13 4.6h6.4v6.4H13z" fill="#d8c8a0" stroke="${INK}" stroke-width="1.1"/><path d="M12.2 5.2 16.2 2l4 3.2" fill="none" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/><path d="M15.4 14.4c0 4-3 6.6-6.6 6.6S2.6 18.4 2.6 14.6 5.4 8 9.2 8h1.6" stroke="#2c4a86" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M9 5l3.2 3-3.2 3" stroke="#2c4a86" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  /** Go there: an eye on the place. */
  go: I(`<path d="M2.4 12C5 7.4 8.4 5.4 12 5.4s7 2 9.6 6.6C19 16.6 15.6 18.6 12 18.6S5 16.6 2.4 12z" fill="#f4ead2" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.6" fill="#2c4a86"/><circle cx="12" cy="12" r="1.5" fill="#14182a"/><circle cx="10.8" cy="10.8" r=".9" fill="#fff"/>`),
  /** Follow: footprints. */
  follow: I(`<path d="M6.2 13.6c-1.6-.2-2.4-2.2-2.2-4.4.2-2.4 1.4-4 2.8-3.8s2 2.2 1.8 4.4c-.2 2.4-1 4-2.4 3.8zM5 15.4l3.2.4-.4 2.6c-.2 1.2-3.4.8-3.2-.4z" fill="#6a4a2a"/><path d="M16.6 17.6c-1.4.2-2.2-1.4-2.4-3.8-.2-2.2.6-4.2 2.2-4.4s2.6 1.4 2.8 3.8c.2 2.2-.6 4.2-2.6 4.4zM15.6 19.6l3.2-.4.2 2.6c.2 1.2-3 1.6-3.2.4z" fill="#6a4a2a"/>`),
  /** Pause: two bars in a ring. */
  pause: I(`<circle cx="12" cy="12" r="9.4" fill="#e6e0ea" stroke="#4a4458" stroke-width="1.3"/><path d="M9.2 7.6v8.8M14.8 7.6v8.8" stroke="#4a4458" stroke-width="2.8" stroke-linecap="round"/>`),
  /** Workers first: an arrow up over the others. */
  first: I(`<path d="M12 2.6l6.6 7.2h-4v6h-5.2v-6h-4z" fill="#6f7d3c" stroke="#3a4414" stroke-width="1" stroke-linejoin="round"/><path d="M4.4 19.4h15.2M7 22h10" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`),
  /** Accept: a tick into the store. */
  accept: I(`<path d="M3.6 10.4h16.8v10H3.6z" fill="#e4d2a6" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/><path d="M6.4 6.6l4 4 8.2-8.4" stroke="#4c6a26" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  /** Don't accept: the store barred. */
  refuse: I(`<path d="M3.6 10.4h16.8v10H3.6z" fill="#d4ccd8" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/><path d="M7.4 2.8l9.2 6.4M16.6 2.8 7.4 9.2" stroke="#8c2f26" stroke-width="2.4" stroke-linecap="round"/>`),
  /** Get: an arrow down into the store. */
  get: I(`<path d="M3.6 12.4h16.8v8H3.6z" fill="#dfe2c6" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/><path d="M12 2.4v10.8m-4.4-4.4L12 13.2l4.4-4.4" stroke="#4c6a26" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  /** Empty: an arrow up out of it. */
  empty: I(`<path d="M3.6 12.4h16.8v8H3.6z" fill="#efd6c6" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/><path d="M12 15V3.4M7.6 7.8 12 3.4l4.4 4.4" stroke="#b04a2c" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  /** Sell: a drachma. */
  sell: I(`<circle cx="12" cy="12" r="8.6" fill="#e8c460" stroke="#6a4a14" stroke-width="1.2"/><circle cx="12" cy="12" r="6.2" fill="none" stroke="#b8862a" stroke-width=".9"/><path d="M9.6 8.6h4.8M12 8.6v7M10 15.6h4" stroke="#6a4a14" stroke-width="1.4" stroke-linecap="round"/>`),
  /** Keep: a sealed jar. */
  keep: I(`<path d="M9.6 3.4h4.8l-.4 2.6c3 1 4.6 3.6 4.6 6.8 0 3.6-2.2 6.6-4.6 7.8H10c-2.4-1.2-4.6-4.2-4.6-7.8 0-3.2 1.6-5.8 4.6-6.8z" fill="#c8864a" stroke="#5a3214" stroke-width="1.1" stroke-linejoin="round"/><path d="M8.6 3.4h6.8" stroke="#5a3214" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="12.6" r="2.4" fill="#b8322a" stroke="#5e1410" stroke-width=".8"/>`),
  /** The ship, coming in. */
  ship: I(`<path d="M11.4 2.4v13" stroke="#5a3a1e" stroke-width="1.3"/><path d="M12.4 3.4c3.6 1.6 5.6 4.8 5.8 9h-5.8z" fill="#f7edd6" stroke="#c0462e" stroke-width="1.1" stroke-linejoin="round"/><path d="M5.6 12.4c2-1 4-1.6 5-1.6v1.6z" fill="#f7edd6" stroke="#c0462e" stroke-width=".9"/><path d="M2 15.6h20c-1 3.2-3.4 5-6.6 5H8.6c-3 0-5.6-1.8-6.6-5z" fill="#7a4a2c" stroke="#3a2010" stroke-width=".8"/>`),
  /** A caravan: a donkey with its packs. */
  caravan: I(`<path d="M3.4 13.4c0-2.4 1.6-3.6 3.8-3.6h6.6c2.2 0 3.6 1 4.2 2.8l2-1.8.8 1.2-2.2 2.4v3.6h-1.8l-.6-2.2H7.4l-.6 2.2H5v-3c-1-.4-1.6-.8-1.6-1.6z" fill="#8e8478" stroke="#4a4038" stroke-width=".9" stroke-linejoin="round"/><path d="M6 19.6v-2.4M16.4 19.6v-2.4" stroke="#4a4038" stroke-width="1.4"/><rect x="6.6" y="5.4" width="6.4" height="4.4" rx="1" fill="#d2902c" stroke="#6a4416" stroke-width=".9"/>`),
  /** A gift: a bundle with its ribbon. */
  gift: I(`<path d="M4 10h16v10.4H4z" fill="#d84a3a" stroke="#6e1a14" stroke-width="1"/><path d="M3 7h18v3H3z" fill="#e8604c" stroke="#6e1a14" stroke-width="1"/><path d="M12 7v13.4" stroke="#e2b24e" stroke-width="2.2"/><path d="M12 7C9 2.4 5.4 4 7.4 7M12 7c3-4.6 6.6-3 4.6 0" stroke="#e2b24e" stroke-width="1.6" fill="none"/>`),
  /** War: crossed spears. */
  war: I(`<path d="M4.4 19.6 19.6 4.4M19.6 19.6 4.4 4.4" stroke="#5a3a22" stroke-width="1.8" stroke-linecap="round"/><path d="M18.6 2.4l3 3-4.2.8zM5.4 2.4l-3 3 4.2.8z" fill="#cfd2d4" stroke="#4a4a4a" stroke-width=".7" stroke-linejoin="round"/>`),
  /** A treaty: a scroll with its seal. */
  treaty: I(`<path d="M5.4 4h11.6c1.2 0 2 .8 2 2v13.6H7.4c-1.2 0-2-.8-2-2z" fill="#f4e4bf" stroke="#8a6440" stroke-width="1.1" stroke-linejoin="round"/><path d="M8.4 8h7.2M8.4 10.6h7.2M8.4 13.2h4" stroke="#8a6440" stroke-width=".9" stroke-linecap="round"/><circle cx="15.6" cy="17" r="3.4" fill="#b8322a" stroke="#6e1a14" stroke-width=".9"/>`),
  /** Station: a flag planted on a hill. */
  station: I(`<path d="M2 20.6c4-4.6 16-4.6 20 0z" fill="#8aa05a" stroke="#3e4f12" stroke-width="1"/><path d="M12 17V3" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/><path d="M12.6 3.6h7l-2 3 2 3h-7z" fill="#2c4a86" stroke="#14254a" stroke-width=".9" stroke-linejoin="round"/>`),
  /** Found: a stake with its line, on new ground. */
  found: I(`<path d="M2 20h20" stroke="#6a4a24" stroke-width="1.4" stroke-linecap="round"/><path d="M12 4l-6 12.6h12z" fill="#e4d2a6" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/><path d="M12 4v16" stroke="${INK}" stroke-width="1.2"/><path d="M12 4V1.6" stroke="#b8322a" stroke-width="1.6" stroke-linecap="round"/>`),
  /** Another: two dice. */
  another: I(`<rect x="2.6" y="8.6" width="10" height="10" rx="2" fill="#f4ead2" stroke="${INK}" stroke-width="1.2" transform="rotate(-12 7.6 13.6)"/><rect x="11.6" y="4.6" width="10" height="10" rx="2" fill="#f4ead2" stroke="${INK}" stroke-width="1.2" transform="rotate(10 16.6 9.6)"/><g fill="${INK}"><circle cx="5.6" cy="12" r="1"/><circle cx="9.6" cy="15.4" r="1"/><circle cx="14.4" cy="7" r="1"/><circle cx="16.6" cy="9.6" r="1"/><circle cx="18.8" cy="12.2" r="1"/></g>`),
  /** A loan: a note and a coin. */
  loan: I(`<path d="M4 3.4h11.6c1.2 0 2 .8 2 2V16H6c-1.2 0-2-.8-2-2z" fill="#f4e4bf" stroke="#8a6440" stroke-width="1.1" stroke-linejoin="round"/><path d="M7 7h7M7 9.6h4.6" stroke="#8a6440" stroke-width="1" stroke-linecap="round"/><circle cx="15.6" cy="16" r="4.6" fill="#e8c04a" stroke="#8a6414" stroke-width="1.1"/>`),
  /** Guard: a shield. */
  guard: I(`<path d="M12 2.4l8 3v6.2c0 4.6-3.4 7.8-8 10-4.6-2.2-8-5.4-8-10V5.4z" fill="#2c4a86" stroke="#14254a" stroke-width="1.1" stroke-linejoin="round"/><path d="M12 5.4v13.4M7 9.6h10" stroke="#e2b24e" stroke-width="1.6" stroke-linecap="round"/>`),
  /** Home: a house. */
  home: I(`<path d="M4.6 11.4 12 4.4l7.4 7v9.2H4.6z" fill="#e4d2a6" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/><path d="M2.6 12.6 12 3.6l9.4 9" stroke="#b04a2c" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 20.6v-5.4h4v5.4" fill="#6a4a2a"/>`),
  /** Build or mend: a hammer. */
  build: I(`<path d="M10.6 9.4l9.8 9.8-2 2-9.8-9.8z" fill="#8a5a2c" stroke="#3a2410" stroke-width=".9" stroke-linejoin="round"/><path d="M3.4 8.6l5.8-5.8 2.4 1-1 2.6 2.6 2.6-2.6 2.6-2.6-2.6-2.6 1z" fill="#9aa0a4" stroke="#3a3e42" stroke-width="1" stroke-linejoin="round"/>`),
  /** Pin: a pin's head. */
  pin: I(`<path d="M14.6 2.4l7 7-2.4.9-3.9 3.9.3 4.5-1.8 1.8-3.9-3.9-5.4 5.4-1.8.3.3-1.8 5.4-5.4-3.9-3.9 1.8-1.8 4.5.3 3.9-3.9z" fill="#c63d24" stroke="#5e1410" stroke-width=".9" stroke-linejoin="round"/>`),
  /** Read: a broken seal. */
  read: I(`<path d="M3.4 6.4h17.2v12.4H3.4z" fill="#f4e4bf" stroke="#8a6440" stroke-width="1.1"/><path d="M3.4 6.4 12 13l8.6-6.6" stroke="#8a6440" stroke-width="1.1" fill="none"/><path d="M7.6 13.4l3 3 6-6.4" stroke="#4c6a26" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  /** Close. */
  close: I(`<path d="M6 6l12 12M18 6 6 18" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`),
  /** Time: an hourglass. */
  time: I(`<path d="M6 2.6h12M6 21.4h12" stroke="#6a4a24" stroke-width="1.8" stroke-linecap="round"/><path d="M7.4 2.6h9.2c0 4.6-3.2 6.4-4.6 9.4 1.4 3 4.6 4.8 4.6 9.4H7.4c0-4.6 3.2-6.4 4.6-9.4C10.6 9 7.4 7.2 7.4 2.6z" fill="#f4ead2" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/><path d="M9.4 19.6c.4-2 1.6-3.2 2.6-4 1 .8 2.2 2 2.6 4z" fill="#d9a441"/>`),
  /** A warning: a red triangle. */
  warn: I(`<path d="M12 2.8 22 20.4H2z" fill="#e8b04a" stroke="#8c2f26" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 9v5.4" stroke="#5e1410" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17.4" r="1.3" fill="#5e1410"/>`),
  /** Men: three heads. */
  men: I(`<circle cx="7" cy="8.4" r="2.8" fill="${SKIN}" stroke="${SKIN_EDGE}" stroke-width=".8"/><circle cx="17" cy="8.4" r="2.8" fill="${SKIN}" stroke="${SKIN_EDGE}" stroke-width=".8"/><path d="M2.4 19c0-3.4 2-5.6 4.6-5.6s4.6 2.2 4.6 5.6zM12.4 19c0-3.4 2-5.6 4.6-5.6s4.6 2.2 4.6 5.6z" fill="#a8402c" stroke="#4a1a10" stroke-width=".8"/><circle cx="12" cy="10" r="3.2" fill="${SKIN}" stroke="${SKIN_EDGE}" stroke-width=".8"/><path d="M6.6 21.4c0-3.8 2.4-6.4 5.4-6.4s5.4 2.6 5.4 6.4z" fill="#c8963c" stroke="#5e4214" stroke-width=".8"/>`),
  /** Armour: a breastplate. */
  armour: I(`<path d="M5.6 4h12.8l-1 6.6c-.4 3 1 5.4 1 9H5.6c0-3.6 1.4-6 1-9z" fill="#c8963c" stroke="#5e4214" stroke-width="1.2" stroke-linejoin="round"/><path d="M8.8 4q3.2 3.2 6.4 0M12 9v8.6" fill="none" stroke="#5e4214" stroke-width="1.1"/>`),
  /** Wounded: a bandage's cross. */
  wounded: I(`<circle cx="12" cy="12" r="9.4" fill="#f4ead2" stroke="#8c2f26" stroke-width="1.3"/><path d="M12 6.6v10.8M6.6 12h10.8" stroke="#b8322a" stroke-width="3.2" stroke-linecap="round"/>`),
  /** Pay: drachmas a month. */
  pay: I(`<ellipse cx="12" cy="17.4" rx="8" ry="3" fill="#a07a1e" stroke="#5e4214" stroke-width=".9"/><ellipse cx="12" cy="14.6" rx="8" ry="3" fill="#d9b04a" stroke="#5e4214" stroke-width=".9"/><ellipse cx="12" cy="11.8" rx="8" ry="3" fill="#e8c460" stroke="#5e4214" stroke-width=".9"/><path d="M9.4 11.8h5.2" stroke="#8a5a14" stroke-width="1.1" stroke-linecap="round"/>`),
  // Merge of slice 50 with slices 49 and 51: health's and the overview's actions.
  /** The quarantine: the yellow pennant over the sea. */
  quarantine: I(`<path d="M5.6 2.4v19.2" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/><path d="M6.2 3.4h14.4l-3.6 3.2 3.6 3.2H6.2z" fill="#e8c23a" stroke="#7a5a10" stroke-width="1" stroke-linejoin="round"/><path d="M9 17.2q2.4-1.6 4.8 0t4.8 0M9 20.6q2.4-1.6 4.8 0t4.8 0" stroke="#3f86b4" stroke-width="1.5" fill="none" stroke-linecap="round"/>`),
  /** Lift the quarantine: the pennant hauled down. */
  lift: I(`<path d="M5.6 2.4v19.2" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/><path d="M6.2 12.4h11.4l-3 2.8 3 2.8H6.2z" fill="#e8c23a" stroke="#7a5a10" stroke-width="1" stroke-linejoin="round"/><path d="M15.6 2.8v6.4m-2.8-2.8 2.8 2.8 2.8-2.8" stroke="#4c6a26" stroke-width="1.9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  /** Health: the rod of Asklepios, its serpent coiled up it. */
  health: I(`<path d="M12 2.4v19.2" stroke="#6b4a2e" stroke-width="1.8" stroke-linecap="round"/><path d="M9.4 5.6c3.8-1.2 6.2.8 3.6 2.6s-5.2 2.4-2.6 4.6 5.6 1.4 3.6 4-5 .8-3.2 2.8" fill="none" stroke="#3f8a62" stroke-width="1.8" stroke-linecap="round"/><circle cx="9.2" cy="5.6" r="1.5" fill="#3f8a62"/>`),
  /** A bed in the asklepieion: its frame, pillow and blanket. */
  bed: I(`<path d="M2.6 20V8.6M21.4 20v-6.4" stroke="${INK}" stroke-width="1.7" stroke-linecap="round"/><path d="M2.6 14.4h18.8v3H2.6z" fill="#e4d2a6" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/><rect x="3.6" y="11.2" width="4.8" height="3.2" rx="1.2" fill="#f4ead2" stroke="${INK}" stroke-width=".9"/><path d="M8.8 14.4c1.4-2.6 4.2-3.4 12.6-2.2v2.2z" fill="#3f8a62" stroke="#1f4a32" stroke-width=".9" stroke-linejoin="round"/>`),
  /** The overview: a diptych of wax tablets, a chart on one leaf and lines on the other. */
  overview: I(`<path d="M2.2 5.4l9.4-1.8v16.6l-9.4 1.8z" fill="#f4e4bf" stroke="#8a6440" stroke-width="1" stroke-linejoin="round"/><path d="M21.8 5.4l-9.4-1.8v16.6l9.4 1.8z" fill="#f4e4bf" stroke="#8a6440" stroke-width="1" stroke-linejoin="round"/><path d="M12 3.4v17" stroke="#6e4e30" stroke-width="1.3"/><path d="M4.6 17.6v-4" stroke="#c8963c" stroke-width="2" stroke-linecap="round"/><path d="M7.1 17.1V9.4" stroke="#2c4a86" stroke-width="2" stroke-linecap="round"/><path d="M9.6 16.6v-5.4" stroke="#b04a2c" stroke-width="2" stroke-linecap="round"/><path d="M14.2 7.2h5.4M14.2 9.2h3.8" stroke="#8a6440" stroke-width=".9" stroke-linecap="round"/><path d="M14.2 16.4l2.2-3 2 1.4 2-4" stroke="#4c6a26" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  /** Distribution: a service's reach, a drop of water over three homes. */
  reach: I(`<path d="M12 2.2c2.4 3.2 4 5.2 4 7.2a4 4 0 0 1-8 0c0-2 1.6-4 4-7.2z" fill="#4f9be0" stroke="#2c5f8f" stroke-width="1.1" stroke-linejoin="round"/><path d="M2.6 21.4v-3.6l2.7-2.3 2.7 2.3v3.6zM9.3 21.4v-3.6l2.7-2.3 2.7 2.3v3.6zM16 21.4v-3.6l2.7-2.3 2.7 2.3v3.6z" fill="#e4d2a6" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/><path d="M1.8 18.2l3.5-3 3.5 3M8.5 18.2l3.5-3 3.5 3M15.2 18.2l3.5-3 3.5 3" stroke="#b04a2c" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  /** Crime: a cut purse. */
  crime: I(`<path d="M8.4 6.4h7.2l-1.4 2.4c3.2 1.6 5 4.4 5 7.4 0 3.2-2.6 5.2-7.2 5.2s-7.2-2-7.2-5.2c0-3 1.8-5.8 5-7.4z" fill="#a8743e" stroke="#4a2a10" stroke-width="1.1" stroke-linejoin="round"/><path d="M9 6.4 7.8 3.2h8.4L15 6.4" fill="#c8964c" stroke="#4a2a10" stroke-width="1" stroke-linejoin="round"/><path d="M5.6 12.6l13 4.4" stroke="#8c2f26" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="2.4 1.6"/><circle cx="17.6" cy="20.2" r="1.6" fill="#e8c460" stroke="#6a4a14" stroke-width=".8"/>`),
} as const;
export type ActionIcon = keyof typeof ACTION_ICONS;

/** An action's drawing. */
export const actionIcon = (a: ActionIcon): string => ACTION_ICONS[a];

// ---------------------------------------------------------------------------- the messages' kinds

/** The land: hills and a river to the sea (a city founded on a land of its own). */
const LAND_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 11.4 5 5.6l2.6 3 2.4-4.4 5 7.2z" fill="#8a9a5a" stroke="#3e4f12" stroke-width=".8" stroke-linejoin="round"/><path d="M8.6 4.8l1.4 1.6" stroke="#f0ead8" stroke-width=".9" stroke-linecap="round"/><path d="M1 11.4h14v3.4H1z" fill="#4f8ab8" stroke="#2c5f8f" stroke-width=".8"/><path d="M6 8.6c1 1.6.2 2.6 1.4 2.8" stroke="#4f8ab8" stroke-width="1.1" fill="none" stroke-linecap="round"/></svg>';
/** Health's: Hygieia's bowl with its serpent (as the Messages panel's). */
const BOWL_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.4 8.2h11.2c-.3 3-2.6 5-5.6 5s-5.3-2-5.6-5z" fill="#c8963c" stroke="#5e4214" stroke-width=".9" stroke-linejoin="round"/><path d="M6.2 13.2 5.6 15h4.8l-.6-1.8" fill="#a07a1e" stroke="#5e4214" stroke-width=".8" stroke-linejoin="round"/><path d="M9.4 8.2C11 6.6 9 5.4 7.6 4.8 6.2 4.2 6.6 2.4 8.4 2.2c1.2-.1 1.8.6 1.6 1.3" fill="none" stroke="#3e6a2c" stroke-width="1.3" stroke-linecap="round"/><circle cx="9.9" cy="3.4" r=".9" fill="#3e6a2c"/></svg>';
/** The plague: a brazier of herbs smoking, as at a struck house's door (merge of slice 50 with slice 49). */
const BRAZIER_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.6 15.2l1.8-5.2M11.4 15.2l-1.8-5.2M8 15.2V10.6" stroke="#5e4214" stroke-width="1.1" stroke-linecap="round"/><path d="M2.4 8.4h11.2c-.4 2-2.4 3-5.6 3s-5.2-1-5.6-3z" fill="#c8963c" stroke="#5e4214" stroke-width=".8" stroke-linejoin="round"/><path d="M5.2 8.4c-.4-1.6.6-2.4 1.2-3.4.2 1 .8 1.4 1.2 1.6-.2-1.4.4-2.6 1.4-3.4 0 1.4 1 2 1.6 3 .4.8.2 1.6 0 2.2z" fill="#e2531e" stroke="#8c2f26" stroke-width=".5" stroke-linejoin="round"/><path d="M10.4 3.6c-1-.8-.2-1.8.4-2.4M7.4 2.8c-.6-.6 0-1.4.4-1.8" stroke="#6a5a6a" stroke-width=".9" fill="none" stroke-linecap="round"/></svg>';
/** A prison's breakout: a barred window, one bar bent. */
const BREAKOUT_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2h12v12H2z" fill="#9a948a" stroke="#4a4440" stroke-width=".9"/><path d="M4 4h8v8H4z" fill="#2e2a26"/><path d="M6 4v8M8 4v3.4c0 1.2 1.6 1.6 2 3M10 4v2" stroke="#c8c4bc" stroke-width="1.1" stroke-linecap="round" fill="none"/><path d="M11.4 9.6l2.4-1" stroke="#c8963c" stroke-width="1" stroke-linecap="round"/></svg>';
/** A rebellion: a broken chain. */
const REBELLION_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.4" y="5.6" width="6" height="4" rx="2" fill="none" stroke="#6a6460" stroke-width="1.5" transform="rotate(-20 4.4 7.6)"/><rect x="8.6" y="6.4" width="6" height="4" rx="2" fill="none" stroke="#6a6460" stroke-width="1.5" transform="rotate(25 11.6 8.4)"/><path d="M8 2.4v2.4M6 3.2l.8 1.6M10 3.2l-.8 1.6" stroke="#c63d24" stroke-width="1.1" stroke-linecap="round"/></svg>';
/** A collapse: the build bar's rubble. */
const COLLAPSE_ICON = LINE_ICONS.rubble;
// Slice 55: a monster's: three claw marks torn across a dark ground.
const MONSTER_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.8" fill="#3a2e28" stroke="#1e1612" stroke-width=".8"/><path d="M4.4 3.6c1.4 3 1.6 6 .6 9M7.6 2.8c1.4 3.4 1.6 6.8.4 10.2M10.8 3.6c1.2 3 1.2 6-.2 9" stroke="#d8432a" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>';

/** Each kind of message's drawing. Kinds added later fall back to the scroll; the kit's test asks for every kind. */
export const MESSAGE_ICONS: Partial<Record<MessageKind, string>> = {
  greece: LINE_ICONS.greece,
  loan: LINE_ICONS.loan,
  deal: LINE_ICONS.favour,
  raid: LINE_ICONS.raid,
  blockade: LINE_ICONS.alarm,
  army: LINE_ICONS.battle,
  fleet: LINE_ICONS.ship,
  vassal: LINE_ICONS.empire,
  colony: ACTION_ICONS.station.replace('class="ki"', 'class="ki msgk"'),
  rebellion: REBELLION_ICON,
  ship: LINE_ICONS.ship,
  caravan: LINE_ICONS.trader,
  fire: LINE_ICONS.fire,
  collapse: COLLAPSE_ICON,
  season: LINE_ICONS.season,
  laurel: LINE_ICONS.ambition,
  crime: LINE_ICONS.crime,
  plague: BRAZIER_ICON,
  sickness: BOWL_ICON,
  monument: LINE_ICONS.monument,
  breakout: BREAKOUT_ICON,
  land: LAND_ICON,
  // Slice 55
  monster: MONSTER_ICON,
  // Slice 56: a god in the city: a tall figure in white under a gold halo.
  epiphany: '<svg viewBox="0 0 16 16" aria-hidden="true"><ellipse cx="8" cy="3.2" rx="3.6" ry="1.3" fill="none" stroke="#e8b830" stroke-width="1.1"/><circle cx="8" cy="4.6" r="1.5" fill="#f2e6cc" stroke="#8a6c3c" stroke-width=".7"/><path d="M5.6 15l1-8.4h2.8l1 8.4z" fill="#f6f0e2" stroke="#8a6c3c" stroke-width=".7" stroke-linejoin="round"/><path d="M3 15h10" stroke="#c8963c" stroke-width="1" stroke-linecap="round"/></svg>',
};

// Slice 54: a sanctuary's news: a small temple, its pediment and columns in marble.
MESSAGE_ICONS.sanctuary =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.6 5.6 8 1.8l6.4 3.8z" fill="#f6eedb" stroke="#6e4e30" stroke-width=".9" stroke-linejoin="round"/><circle cx="8" cy="4.3" r=".8" fill="#c8963c"/><rect x="2.2" y="5.6" width="11.6" height="1.3" fill="#e8dcc0" stroke="#6e4e30" stroke-width=".7"/><path d="M3.4 7.3v4.8M6.1 7.3v4.8M9.9 7.3v4.8M12.6 7.3v4.8" stroke="#8a6440" stroke-width="1.4"/><rect x="1.8" y="12.2" width="12.4" height="1.4" fill="#e8dcc0" stroke="#6e4e30" stroke-width=".7"/><rect x="1" y="13.6" width="14" height="1.3" fill="#d9c9a4" stroke="#6e4e30" stroke-width=".7"/></svg>';

/** A message with no kind of its own: a small scroll. */
export const SCROLL_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3h8v10H4z" fill="#f4e4bf" stroke="#8a6440" stroke-width=".9"/><rect x="2.6" y="1.6" width="10.8" height="2.6" rx="1.3" fill="#d9b98a" stroke="#6e4e30" stroke-width=".8"/><rect x="2.6" y="11.8" width="10.8" height="2.6" rx="1.3" fill="#d9b98a" stroke="#6e4e30" stroke-width=".8"/></svg>';

/** A kind of message's drawing (the scroll for one without). */
export const messageIcon = (k: MessageKind): string => MESSAGE_ICONS[k] ?? SCROLL_ICON;

// ---------------------------------------------------------------------------- the kinds of land (the new-game screen)

const SEA = '#3f86b4';
const SEA_DEEP = '#2c6690';
const GRASS = '#9cba5a';
const GRASS_DEEP = '#6f9640';
const SAND = '#ecd9a0';
const ROCK = '#a8988a';
const OCHRE = '#d4b46a';
const TREE = '#3f6a2c';
const LAND_EDGE = 'stroke="#3a2814" stroke-width=".8" stroke-linejoin="round"';
const land = (body: string): string => svg('0 0 44 30', `<rect x=".5" y=".5" width="43" height="29" rx="2" fill="${GRASS}"/>${body}<rect x=".5" y=".5" width="43" height="29" rx="2" fill="none" stroke="#6a4a1c" stroke-width="1"/>`, 'ki land');
const trees = (pts: Array<[number, number]>): string => pts.map(([x, y]) => `<path d="M${x} ${y - 3.4}l2.2 3.8h-4.4z" fill="${TREE}"/>`).join('');

/** Each kind of land's little map, from above: the sea, the shore, its hills, river and woods. Keyed by the land's kind. */
export const LAND_ICONS: Record<string, string> = {
  bay: land(`<path d="M.5 21c6-1 9-5 13-5s5 5 8.5 5 5-6 9-6 8 4 12.5 3.5V29.5H.5z" fill="${SAND}"/><path d="M.5 23c6-1 9-5 13-5s5 5 8.5 5 5-6 9-6 8 4 12.5 3.5V29.5H.5z" fill="${SEA}" ${LAND_EDGE}/><path d="M6 2c4 2 9 4 13 9s3 7 3 12" fill="none" stroke="${SEA_DEEP}" stroke-width="1.6"/><path d="M28 2l5 5 4-3 5 6V.5H28z" fill="${ROCK}"/>${trees([[33, 14], [37, 13]])}`),
  sheltered: land(`<path d="M.5 22c5 0 9-3 12-8 3-4 8-5 12-1s3 9 8 9 8-2 11-1v8.5H.5z" fill="${SEA}" ${LAND_EDGE}/><path d="M16 1c2 5 5 8 8 12" fill="none" stroke="${SEA_DEEP}" stroke-width="1.5"/><ellipse cx="34" cy="7" rx="4" ry="2.4" fill="${SEA}" ${LAND_EDGE}/><path d="M2 2l4 4 3-2 3 4V.5H2z" fill="${ROCK}"/>${trees([[6, 13], [9, 12]])}`),
  islands: land(`<path d="M.5 14c6 2 12 3 18 2s10-5 16-4 7 2 9 2V29.5H.5z" fill="${SEA}" ${LAND_EDGE}/><ellipse cx="10" cy="23" rx="4" ry="2.2" fill="${GRASS_DEEP}" ${LAND_EDGE}/><ellipse cx="25" cy="25" rx="3" ry="1.8" fill="${SAND}" ${LAND_EDGE}/><ellipse cx="35" cy="20.5" rx="4.4" ry="2.4" fill="${GRASS_DEEP}" ${LAND_EDGE}/>${trees([[30, 9], [34, 8]])}`),
  delta: land(`<rect x=".5" y=".5" width="43" height="29" rx="2" fill="#86b25a"/><path d="M.5 25c10-1 30-1 43 0v4.5H.5z" fill="${SEA}" ${LAND_EDGE}/><path d="M22 1v10M22 11c-3 5-10 9-14 14M22 11c0 6 0 10-1 14M22 11c3 5 9 9 14 14" fill="none" stroke="${SEA_DEEP}" stroke-width="1.5" stroke-linecap="round"/><g fill="#5f8a3a">${[6, 12, 30, 37].map((x) => `<path d="M${x} 18v-3M${x + 1.4} 18v-2.4" stroke="#4f7a2e" stroke-width=".8"/>`).join('')}</g>`),
  mountains: land(`<path d="M.5 23c8 0 14-2 19-1s8 3 12 2 9-1 12.5 0V29.5H.5z" fill="${SEA}" ${LAND_EDGE}/><path d="M2 18l7-12 6 8 6-10 7 11 5-6 8 9z" fill="${ROCK}" ${LAND_EDGE}/><path d="M9 6l2 3.2h-4zM21 4l2.2 3.4h-4.4z" fill="#f4f0e8"/>`),
  dryplain: land(`<rect x=".5" y=".5" width="43" height="29" rx="2" fill="${OCHRE}"/><path d="M.5 26c12-1 30-1 43 0v3.5H.5z" fill="${SEA}" ${LAND_EDGE}/><path d="M30 1c-2 6-6 12-4 17s1 6 0 8" fill="none" stroke="${SEA_DEEP}" stroke-width="1.4"/><path d="M26 2c-2 6-5 12-3 17l-1 7M33 2c-1 6-4 12-3 17l1 7" fill="none" stroke="${GRASS_DEEP}" stroke-width="1.6" opacity=".6"/><g fill="#7a8a3a">${[[6, 9], [10, 13], [14, 8], [8, 18]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4"/>`).join('')}</g>`),
  woods: land(`<path d="M.5 23c9 1 15-3 22-2s13 2 21 1v7.5H.5z" fill="${SEA}" ${LAND_EDGE}/>${trees([[4, 6], [8, 9], [12, 5], [17, 8], [6, 14], [11, 15], [26, 6], [31, 9], [36, 5], [40, 10], [33, 15], [38, 16]])}<path d="M22 1c-1 6 1 12 0 20" fill="none" stroke="${SEA_DEEP}" stroke-width="1.4"/>`),
};
