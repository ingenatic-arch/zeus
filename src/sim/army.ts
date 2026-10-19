/**
 * The army: barracks, companies and the men in them (slice 23).
 *
 * A barracks (4 x 4) holds up to four companies. "Raise a company" makes one
 * with no men; once a day a company short of men calls the next ones, a few a
 * day: a man from the nearest lived-in home of the right level (hoplites from
 * fine houses and villas, archers from townhouses and better) with a man to
 * spare: none of its men serve already, and it has someone of working age
 * left. He leaves his job at once (his home counts one fewer who can work:
 * see shareWork) and walks to the barracks over roads and open ground. An
 * archer is ready as he walks in; a hoplite takes a set of armour from the
 * barracks' rack, or waits for one. The barracks' porter fetches armour from
 * the stores while men wait, and a cart takes back what the rack has no use for.
 *
 * Soldiers are paid monthly (treasury.ts, after the workplaces' wages). A
 * company at its barracks drills; sent to a tile, its banner marches there by
 * the shortest way over roads and open ground, the men two abreast behind,
 * and they stand in ranks round it facing the way they came, and hold.
 * Dismissed, the men walk home to their old jobs and their armour goes back
 * on the rack.
 *
 * Pure and deterministic: nothing here draws a random number. A town with no
 * barracks has an empty army, and this does nothing.
 */
import type { CoastMap } from '../map/bake';
import { datan2, dcos, dhypot, dsin } from '../map/dmath';
import { around, centreOf, findBuilding, FINE, footSide, livedIn, TOWNHOUSE, VILLA } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { errandsOut, nearestBy, PORTER_RETRY, sendCart, stallRoom, wayPoints } from './food';
import { ARMOUR, coming, COPPER, gi, held, setHeld, type Ware } from './foods';
import { rateOf, WORK_SHARE } from './labour';
import { door, roadsBeside } from './rounds';
import { note } from './stockbook';
import { ARMOURY_COPPER, isStore, roomOf } from './stores';
import { TILE_ROAD, type Army, type Building, type Company, type CompanyKind, type Person, type SimState, type Soldier } from './state';
import { settle, SOLDIER_PAY } from './treasury';
import { newWalker, setPath } from './walk';
import { offRoadPath, prunePath, walkable } from './wild';
import { restFor } from './water';

/** Men in a full company, and companies a barracks holds. */
export const COMPANY_SIZE = 16;
export const PER_BARRACKS = 4;
/** Men a company calls a day while it is short. */
export const CALLS_A_DAY = 4;
/** The home levels each kind is drawn from, at least. */
export const LEVEL_FOR: Record<CompanyKind, number> = { hoplite: FINE, archer: TOWNHOUSE };
/** How fast a banner marches, and a man walks (tiles a tick): a man is quicker, so the column keeps up. */
export const MARCH_SPEED = 0.1;
export const STRIDE = 0.14;
/** Ticks between the drill's moves. */
export const DRILL_STEP = 40;
/** How far apart the men stand in ranks (tiles): hoplites shoulder to shoulder, archers looser. */
export const SPACING: Record<CompanyKind, number> = { hoplite: 0.3, archer: 0.4 };
/** How far behind one another the men march, two abreast. */
const FILE_GAP = 0.42;
/** A man is in his place when he is this close to it. */
const THERE = 0.02;
/** The banners' emblems, one per company number in turn. */
export const EMBLEMS = ['owl', 'boar', 'lion', 'bull', 'horse', 'dolphin', 'trident', 'snake'] as const;
/** The age a man must be to serve. */
export const SERVE_AGE = 16;

export const freshArmy = (): Army => ({ companies: [], soldiers: [], nextId: 1 });

/** "1st", "2nd", "3rd", "4th", "11th". */
export function ordinal(n: number): string {
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

/** "the 2nd company". */
export const companyName = (c: Company): string => `the ${ordinal(c.n)} company`;
/** "hoplites", "archers". */
export const kindWord = (k: CompanyKind, many = true): string => (k === 'hoplite' ? (many ? 'hoplites' : 'hoplite') : many ? 'archers' : 'archer');
/** The homes a kind is drawn from, in words. */
export const fromWords = (k: CompanyKind): string => (k === 'hoplite' ? 'fine houses and villas' : 'townhouses and better');

export const companyOf = (s: SimState, id: number): Company | undefined => s.army.companies.find((c) => c.id === id);
/** A company's men (walking in, waiting for armour or in the ranks). */
export const menOf = (s: SimState, c: Company): Soldier[] => s.army.soldiers.filter((x) => x.company === c.id);
/** The men in its ranks, ready. */
export const readyOf = (s: SimState, c: Company): Soldier[] => s.army.soldiers.filter((x) => x.company === c.id && x.state === 'ready');
/** The companies of a barracks, in the order they were raised. */
export const companiesAt = (s: SimState, b: Building): Company[] => s.army.companies.filter((c) => c.barracks === b.id);
/** The man serving from a home, if any (not one already dismissed and walking home). */
export const servingFrom = (s: SimState, b: Building): Soldier | undefined => s.army.soldiers.find((x) => x.home === b.id && x.state !== 'leaving');

/** The homes with a man serving (not one dismissed, on his way home). */
export function servingHomes(s: SimState): Set<number> {
  const out = new Set<number>();
  for (const x of s.army.soldiers) if (x.home > 0 && x.state !== 'leaving') out.add(x.home);
  return out;
}

// ---------------------------------------------------------------------------
// Where things are.

/** The tile a barracks' men go in and out by: a road beside it if there is one, else open ground beside it (-1: none). */
export function gateOf(s: SimState, map: CoastMap, b: Building): number {
  const ring = around(map.size, b);
  const [cx, cz] = centreOf(b);
  // (The road tile nearest the middle of a side, so the gate is central.)
  let best = -1;
  let bd = Infinity;
  for (const pass of [0, 1]) {
    for (const t of ring) {
      const ok = pass === 0 ? s.tiles[t] === TILE_ROAD : walkable(map, s, t);
      if (!ok) continue;
      const d = dhypot((t % map.size) + 0.5 - cx, Math.floor(t / map.size) + 0.5 - cz);
      if (d < bd - 1e-9) {
        bd = d;
        best = t;
      }
    }
    if (best >= 0) return best;
  }
  return -1;
}

/** The way a barracks faces: towards its gate, in quarter turns (radians). */
export function frontOf(s: SimState, map: CoastMap, b: Building): number {
  const g = gateOf(s, map, b);
  if (g < 0) return Math.PI / 2;
  const [cx, cz] = centreOf(b);
  const dx = (g % map.size) + 0.5 - cx;
  const dz = Math.floor(g / map.size) + 0.5 - cz;
  return Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 0 : Math.PI) : dz > 0 ? Math.PI / 2 : -Math.PI / 2;
}

/** A company's spot on its barracks' drill ground (one quarter of it each, by its place there). */
export function drillSpot(s: SimState, b: Building, c: Company): [number, number] {
  const place = Math.max(0, companiesAt(s, b).indexOf(c));
  const side = footSide(b);
  const q = side / 4;
  return [b.x + q + (place % 2) * 2 * q, b.z + q + Math.floor(place / 2) * 2 * q];
}

/** Where a man stands in a block round a banner at (x, z) facing `face`: four ranks of four, the first rank to the front. */
export function slotAt(kind: CompanyKind, slot: number, x: number, z: number, face: number): [number, number] {
  const sp = SPACING[kind];
  const rank = Math.floor(slot / 4);
  const file = slot % 4;
  const fwd = (1.5 - rank) * sp;
  const side = (file - 1.5) * sp;
  const fx = dcos(face);
  const fz = dsin(face);
  return [x + fx * fwd - fz * side, z + fz * fwd + fx * side];
}

/** The drill at a tick: which way the ranks face (quarter turns from the barracks' front) and how far they have marched forward. */
export function drillAt(tick: number, c: Company): { turn: number; ahead: number } {
  const p = Math.floor((tick + c.n * 13) / DRILL_STEP) % 8;
  return { turn: Math.floor(p / 2), ahead: p % 2 === 1 ? 0.3 : 0 };
}

/** The total length of a path of x, z pairs. */
export function pathLength(path: readonly number[]): number {
  let L = 0;
  for (let i = 2; i < path.length; i += 2) L += dhypot(path[i] - path[i - 2], path[i + 1] - path[i - 1]);
  return L;
}

/** The point at a distance along a path, and which way it runs there. */
export function pointAlong(path: readonly number[], d: number): { x: number; z: number; face: number } {
  if (path.length < 2) return { x: 0, z: 0, face: 0 };
  let left = Math.max(0, d);
  let face = path.length >= 4 ? datan2(path[3] - path[1], path[2] - path[0]) : 0;
  for (let i = 2; i < path.length; i += 2) {
    const ax = path[i - 2];
    const az = path[i - 1];
    const len = dhypot(path[i] - ax, path[i + 1] - az);
    if (len > 1e-9) face = datan2(path[i + 1] - az, path[i] - ax);
    if (left <= len) {
      const f = len > 1e-9 ? left / len : 0;
      return { x: ax + (path[i] - ax) * f, z: az + (path[i + 1] - az) * f, face };
    }
    left -= len;
  }
  return { x: path[path.length - 2], z: path[path.length - 1], face };
}

// ---------------------------------------------------------------------------
// Who serves.

const ageOf = (s: SimState, p: Person): number => Math.max(0, Math.floor((s.tick - p.born) / TICKS_PER_YEAR));

/** The man a home sends: its eldest grown son, or failing one its head, her husband, or another grown man of the house. */
export function eldestMan(s: SimState, b: Building): Person | null {
  const f = b.family;
  if (!f) return null;
  const men = f.members.filter((p) => !p.female && ageOf(s, p) >= SERVE_AGE);
  const order: Person['role'][] = ['son', 'head', 'husband', 'brother', 'cousin'];
  for (const role of order) {
    const of = men.filter((p) => p.role === role).sort((a, c) => a.born - c.born);
    if (of.length) return of[0];
  }
  return null;
}

/** Can a home spare a man for a company of this kind (`serving`: the homes that already send one)? */
export function canSpare(s: SimState, b: Building, kind: CompanyKind, serving: Set<number>): boolean {
  if (!livedIn(b) || b.level < LEVEL_FOR[kind] || b.level > VILLA || serving.has(b.id)) return false;
  // Someone of working age left once he has gone.
  if (Math.floor(b.people * WORK_SHARE) < 1) return false;
  return eldestMan(s, b) !== null;
}

/** How the man is named by his father: "son of Nikias" (or "head of the house"). */
export function fatherWords(x: Soldier): string {
  return x.father ? `son of ${x.father}` : 'head of his house';
}

// ---------------------------------------------------------------------------
// Commands.

/** Why a company of this kind can't be raised at this barracks, or '' if it can. */
export function raiseRefusal(s: SimState, b: Building | undefined): string {
  if (!b || b.kind !== 'barracks') return 'Companies are raised at a barracks';
  if (companiesAt(s, b).length >= PER_BARRACKS) return `A barracks holds ${PER_BARRACKS} companies: build another`;
  return '';
}

/** The lowest company number not in use. */
function freeNumber(s: SimState): number {
  const used = new Set(s.army.companies.map((c) => c.n));
  let n = 1;
  while (used.has(n)) n++;
  return n;
}

/** Raise a company of hoplites or archers at a barracks: it calls its men from the next day on. */
export function raise(s: SimState, barracks: number, kind: CompanyKind): Company | null {
  const b = findBuilding(s, barracks);
  if (raiseRefusal(s, b) !== '' || !b || (kind !== 'hoplite' && kind !== 'archer')) return null;
  const n = freeNumber(s);
  const c: Company = {
    id: s.army.nextId++,
    n,
    kind,
    barracks: b.id,
    emblem: (n - 1) % EMBLEMS.length,
    order: 'drill',
    x: 0,
    z: 0,
    face: 0,
    path: [],
    along: 0,
    target: -1,
    want: COMPANY_SIZE,
    raised: s.tick,
    owed: 0,
    why: '',
  };
  s.army.companies.push(c);
  const [x, z] = drillSpot(s, b, c);
  c.x = x;
  c.z = z;
  s.rev++;
  return c;
}

/** A soldier's armour goes back on his barracks' rack (if it still stands), handed back in the stock book. */
function handBack(s: SimState, x: Soldier, b: Building | undefined): void {
  if (!x.armed) return;
  x.armed = false;
  if (b) {
    setHeld(b, ARMOUR, held(b, ARMOUR) + 1);
    note(s, ARMOUR, 'used', 'barracks', -1);
  } else note(s, ARMOUR, 'lost', 'barracks gone', 1);
}

/** A man walks home from where he stands (or, with no way home, is simply gone). */
function sendHome(s: SimState, map: CoastMap, x: Soldier): void {
  x.company = 0;
  x.state = 'leaving';
  const home = findBuilding(s, x.home);
  const way = home ? wayFrom(s, map, x.x, x.z, doorstep(s, map, home)) : null;
  if (!home || !way) {
    x.hp = 0;
    return;
  }
  const [hx, hz] = centreOf(home);
  x.path = [...way, hx, hz];
  x.seg = 0;
}

/** Dismiss a company: the men go home, their armour back on the rack. */
export function dismiss(s: SimState, map: CoastMap, id: number): void {
  const c = companyOf(s, id);
  if (!c) return;
  const b = findBuilding(s, c.barracks);
  for (const x of menOf(s, c)) {
    handBack(s, x, b);
    sendHome(s, map, x);
  }
  s.army.companies = s.army.companies.filter((o) => o !== c);
  dropGone(s);
  s.rev++;
}

/** A barracks is gone (cleared, burnt, fallen in): its companies are disbanded, the men walking home with their armour. */
export function barracksGone(s: SimState, map: CoastMap, b: Building): void {
  for (const c of companiesAt(s, b)) {
    for (const x of menOf(s, c)) {
      handBack(s, x, undefined);
      sendHome(s, map, x);
    }
  }
  s.army.companies = s.army.companies.filter((c) => c.barracks !== b.id);
  dropGone(s);
}

function dropGone(s: SimState): void {
  if (s.army.soldiers.some((x) => x.hp <= 0 && x.state === 'leaving')) s.army.soldiers = s.army.soldiers.filter((x) => !(x.hp <= 0 && x.state === 'leaving'));
}

/** The walkable tiles a man at (x, z) can set off from: the tile he stands on, or those around it. */
function startTiles(s: SimState, map: CoastMap, x: number, z: number): number[] {
  const n = map.size;
  const tx = Math.max(0, Math.min(n - 1, Math.floor(x)));
  const tz = Math.max(0, Math.min(n - 1, Math.floor(z)));
  const t = tz * n + tx;
  if (walkable(map, s, t)) return [t];
  // Inside a building (the barracks): out by its gate.
  const on = s.tiles[t];
  if (on > 0) {
    const b = findBuilding(s, on);
    if (b) {
      const g = b.kind === 'barracks' ? gateOf(s, map, b) : -1;
      if (g >= 0) return [g];
      return around(n, b).filter((u) => walkable(map, s, u));
    }
  }
  const out: number[] = [];
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const ux = tx + dx;
    const uz = tz + dz;
    if (ux >= 0 && uz >= 0 && ux < n && uz < n && walkable(map, s, uz * n + ux)) out.push(uz * n + ux);
  }
  return out;
}

/** The walkable tile beside a home a man steps in by (a road beside it if any). */
function doorstep(s: SimState, map: CoastMap, b: Building): number {
  const ring = around(map.size, b);
  return ring.find((t) => s.tiles[t] === TILE_ROAD) ?? ring.find((t) => walkable(map, s, t)) ?? -1;
}

/** The way from (x, z) to tile `goal` over roads and open ground, as x, z pairs starting where he stands (null: no way). */
export function wayFrom(s: SimState, map: CoastMap, x: number, z: number, goal: number): number[] | null {
  if (goal < 0) return null;
  const starts = startTiles(s, map, x, z);
  if (!starts.length) return null;
  const tiles = offRoadPath(map, s, starts, goal);
  if (!tiles) return null;
  const out = [x, z];
  for (const [px, pz] of prunePath(map, s, tiles)) out.push(px, pz);
  return out;
}

/** Why a company can't march to a tile, or '' if it can (`way`: its way there, worked out). */
export function marchRefusal(s: SimState, map: CoastMap, c: Company | undefined, tile: number): string {
  if (!c) return 'No such company';
  const n = map.size;
  if (!Number.isInteger(tile) || tile < 0 || tile >= n * n) return 'Beyond the edge of the map';
  if (!walkable(map, s, tile)) return s.tiles[tile] > 0 ? 'A building stands there: send it to a street or open ground' : 'No footing there: water, the river bank or a cliff';
  if (!wayFrom(s, map, c.x, c.z, tile)) return 'No way there over roads and open ground';
  return '';
}

/** Send a company's banner to a tile (or back to its barracks, `tile` -1). False if it can't go. */
export function sendBanner(s: SimState, map: CoastMap, id: number, tile: number): boolean {
  const c = companyOf(s, id);
  if (!c) return false;
  if (tile < 0) return recall(s, map, c);
  if (marchRefusal(s, map, c, tile) !== '') return false;
  const way = wayFrom(s, map, c.x, c.z, tile);
  if (!way) return false;
  c.path = way;
  c.along = 0;
  c.order = 'march';
  c.target = tile;
  s.rev++;
  return true;
}

/** Back to barracks: by its gate to its spot on the drill ground. */
function recall(s: SimState, map: CoastMap, c: Company): boolean {
  const b = findBuilding(s, c.barracks);
  if (!b) return false;
  const [hx, hz] = drillSpot(s, b, c);
  if (c.order === 'drill') return true;
  const gate = gateOf(s, map, b);
  const way = wayFrom(s, map, c.x, c.z, gate);
  if (!way) return false;
  c.path = [...way, hx, hz];
  c.along = 0;
  c.order = 'return';
  c.target = -1;
  s.rev++;
  return true;
}

// ---------------------------------------------------------------------------
// Each tick.

/** The army's tick: daily its calls and reasons, monthly its pay, every tick the barracks' porters and every man's steps. */
export function stepArmy(s: SimState, map: CoastMap): void {
  const a = s.army;
  if (a.companies.length === 0 && a.soldiers.length === 0 && !s.buildings.some((b) => b.kind === 'barracks' || b.kind === 'armoury')) return;
  for (const b of s.buildings) if (b.kind === 'armoury') smithy(s, map, b);
  if (s.tick % TICKS_PER_DAY === 0) daily(s, map);
  if (s.tick % TICKS_PER_MONTH === 0 && a.companies.length) {
    for (const c of a.companies) c.owed += menOf(s, c).length * SOLDIER_PAY;
    settle(s);
  }
  for (const b of s.buildings) if (b.kind === 'barracks') racks(s, map, b);
  for (const c of a.companies) moveBanner(s, map, c);
  for (const x of a.soldiers) moveMan(s, map, x);
  // The dismissed home, and men whose home is gone, leave the city.
  if (a.soldiers.some((x) => x.state === 'leaving' && x.hp <= 0)) dropGone(s);
}

function daily(s: SimState, map: CoastMap): void {
  const a = s.army;
  // A man whose home is gone (cleared, burnt, fallen in, or its family gone) leaves the company, and the city.
  for (const x of a.soldiers) {
    if (x.state === 'leaving' || x.home === 0) continue;
    const h = findBuilding(s, x.home);
    if (h && livedIn(h)) continue;
    const c = companyOf(s, x.company);
    handBack(s, x, c ? findBuilding(s, c.barracks) : undefined);
    x.company = 0;
    x.state = 'leaving';
    x.hp = 0;
  }
  dropGone(s);
  let serving: Set<number> | null = null;
  for (const c of a.companies) {
    const b = findBuilding(s, c.barracks);
    if (!b) continue;
    const men = menOf(s, c);
    const waiting = men.filter((x) => x.state === 'arming').length;
    c.why = '';
    if (men.length < c.want) {
      if (rateOf(b) <= 0) {
        c.why = 'The barracks has no workers to take the men in';
        continue;
      }
      serving ??= servingHomes(s);
      const called = call(s, map, c, b, Math.min(CALLS_A_DAY, c.want - men.length), serving);
      const have = men.length + called;
      if (have < c.want && called === 0) c.why = have === 0 ? `No ${fromWords(c.kind).replace('and better', 'or better').replace(' and ', ' or ')} can spare a man` : `Only ${have} ${fromWords(c.kind)} can spare a man`;
    }
    if (!c.why && waiting > 0 && held(b, ARMOUR) === 0 && !armourAbout(s, b)) c.why = `No armour in the stores: ${waiting === 1 ? '1 man is' : `${waiting} men are`} waiting for theirs`;
  }
}

/** Is armour on its way to a barracks, or in any store its porter could fetch from? */
function armourAbout(s: SimState, b: Building): boolean {
  if (s.walkers.some((w) => w.origin === b.id && w.kind === 'porter')) return true;
  return s.buildings.some((g) => isStore(g.kind) && roomOf(g.kind, ARMOUR) > 0 && held(g, ARMOUR) > 0);
}

/** Call up to `most` men for a company from the nearest homes that can spare one; how many came. */
function call(s: SimState, map: CoastMap, c: Company, b: Building, most: number, serving: Set<number>): number {
  const [bx, bz] = centreOf(b);
  const homes = s.buildings
    .filter((h) => h.kind === 'home' && canSpare(s, h, c.kind, serving))
    .map((h) => ({ h, d: dhypot(centreOf(h)[0] - bx, centreOf(h)[1] - bz) }))
    .sort((p, q) => p.d - q.d || p.h.id - q.h.id);
  const gate = gateOf(s, map, b);
  if (gate < 0) return 0;
  const taken = new Set(menOf(s, c).map((x) => x.slot));
  let called = 0;
  for (const { h } of homes) {
    if (called >= most) break;
    const p = eldestMan(s, h);
    if (!p) continue;
    const [hx, hz] = centreOf(h);
    const way = wayFrom(s, map, hx, hz, gate);
    if (!way) continue;
    let slot = 0;
    while (taken.has(slot)) slot++;
    taken.add(slot);
    const [sx, sz] = slotAt(c.kind, slot, ...drillSpot(s, b, c), frontOf(s, map, b));
    const x: Soldier = {
      id: s.army.nextId++,
      company: c.id,
      slot,
      home: h.id,
      name: p.name,
      father: p.role === 'son' ? p.kin : '',
      house: h.family?.name ?? '',
      state: 'coming',
      x: hx,
      z: hz,
      face: 0,
      path: [...way, sx, sz],
      seg: 1,
      walked: 0,
      armed: false,
      hp: 100,
    };
    s.army.soldiers.push(x);
    serving.add(h.id);
    called++;
  }
  if (called) s.rev++;
  return called;
}

/** The men of a barracks still to arm: hoplites waiting, or walking in. */
function unarmed(s: SimState, b: Building): number {
  let n = 0;
  for (const c of companiesAt(s, b)) {
    if (c.kind !== 'hoplite') continue;
    for (const x of menOf(s, c)) if (!x.armed && (x.state === 'arming' || x.state === 'coming')) n++;
  }
  return n;
}

/** A barracks' rack: its porter fetches armour while men need it, and a cart takes back what nobody needs (once it has no hoplites). */
function racks(s: SimState, map: CoastMap, b: Building): void {
  const size = map.size;
  const k = gi(ARMOUR);
  if (b.fetch[k] > 0) b.fetch[k]--;
  if (b.clock > 0) b.clock--;
  const need = unarmed(s, b);
  const have = held(b, ARMOUR);
  const out = s.walkers.some((w) => w.origin === b.id && w.kind === 'porter');
  // (An arming man takes his set from the rack in moveMan.)
  if (need > have && !out && b.fetch[k] <= 0 && rateOf(b) > 0 && have < stallRoom(ARMOUR)) {
    fetchWare(s, size, b, ARMOUR);
    return;
  }
  // Armour nobody here needs goes back to the stores: all of it once the barracks has no hoplites (handed back on
  // dismissal); while it has some, the rack keeps what is left over for the men who come to fill their places.
  const spare = companiesAt(s, b).some((c) => c.kind === 'hoplite') ? 0 : have - need;
  if (spare > 0 && !out && errandsOut(s, b) === 0 && rateOf(b) > 0) sendCart(s, size, b, ARMOUR, spare);
}

/** Send a building's porter to the nearest store holding a ware, for a handcart of it (or wait a while if none holds any). */
function fetchWare(s: SimState, size: number, b: Building, ware: Ware): void {
  const k = gi(ware);
  const found = nearestBy(s, size, roadsBeside(s, size, b), (g) => isStore(g.kind) && roomOf(g.kind, ware) > 0 && held(g, ware) > 0);
  if (!found) {
    b.fetch[k] = PORTER_RETRY;
    return;
  }
  const w = newWalker(s, 'porter', 1);
  w.origin = b.id;
  w.target = found.g.id;
  w.food = ware;
  w.since = s.tick;
  setPath(w, wayPoints(size, door(size, b, found.way[0]), found.way, found.g));
  s.walkers.push(w);
  b.fetch[k] = restFor(b, 30);
}

/**
 * An armoury's copper: the mines' carts bring it straight to the nearest
 * building with room for it, which may be a storehouse, and Greece's traders
 * leave theirs in the storehouses; so while its heap is low its porter fetches
 * copper from the nearest store holding some.
 */
function smithy(s: SimState, map: CoastMap, b: Building): void {
  const k = gi(COPPER);
  if (b.fetch[k] > 0) b.fetch[k]--;
  if (b.fetch[k] > 0 || rateOf(b) === 0) return;
  if (held(b, COPPER) + coming(b, COPPER) > ARMOURY_COPPER / 2) return;
  if (s.walkers.some((w) => w.origin === b.id && w.kind === 'porter')) return;
  fetchWare(s, map.size, b, COPPER);
}

/** Move a company's banner along its march. */
function moveBanner(s: SimState, map: CoastMap, c: Company): void {
  const b = findBuilding(s, c.barracks);
  if (c.order === 'drill') {
    if (!b) return;
    const [hx, hz] = drillSpot(s, b, c);
    const front = frontOf(s, map, b);
    const d = drillAt(s.tick, c);
    c.face = front + (d.turn * Math.PI) / 2;
    c.x = hx + dcos(c.face) * d.ahead;
    c.z = hz + dsin(c.face) * d.ahead;
    return;
  }
  if (c.order !== 'march' && c.order !== 'return') return;
  // (The column waits for its slowest man at the start: nobody is left more than a few paces behind.)
  const L = pathLength(c.path);
  c.along = Math.min(L, c.along + MARCH_SPEED);
  const p = pointAlong(c.path, c.along);
  c.x = p.x;
  c.z = p.z;
  c.face = p.face;
  if (c.along >= L - 1e-9) {
    c.order = c.order === 'return' ? 'drill' : 'hold';
    if (c.order === 'drill' && b) c.face = frontOf(s, map, b);
    c.path = [];
    c.along = 0;
    s.rev++;
  }
}

/** Step a man towards (tx, tz) at his pace; true once he is there. */
function stepTo(x: Soldier, tx: number, tz: number, pace: number): boolean {
  const dx = tx - x.x;
  const dz = tz - x.z;
  const d = dhypot(dx, dz);
  if (d <= Math.max(THERE, 1e-9)) {
    x.x = tx;
    x.z = tz;
    return true;
  }
  const step = Math.min(d, pace);
  x.x += (dx / d) * step;
  x.z += (dz / d) * step;
  x.walked += step;
  x.face = datan2(dz, dx);
  return step >= d - 1e-9;
}

/** Where a man of a company stands now: his place in its ranks, or in its column on the march. */
export function placeOf(s: SimState, map: CoastMap, c: Company, x: Soldier): { x: number; z: number; face: number } {
  const b = findBuilding(s, c.barracks);
  // Waiting for armour, he stands on the drill ground whatever the company is doing.
  if (x.state === 'arming' && b && c.order !== 'drill') {
    const [hx, hz] = drillSpot(s, b, c);
    const front = frontOf(s, map, b);
    const [px, pz] = slotAt(c.kind, x.slot, hx, hz, front);
    return { x: px, z: pz, face: front };
  }
  if (c.order === 'march' || c.order === 'return') {
    const rank = Math.floor(x.slot / 2);
    const file = x.slot % 2 === 0 ? -1 : 1;
    const p = pointAlong(c.path, c.along - FILE_GAP * (rank + 1));
    const off = 0.17 * file;
    return { x: p.x - dsin(p.face) * off, z: p.z + dcos(p.face) * off, face: p.face };
  }
  const [px, pz] = slotAt(c.kind, x.slot, c.x, c.z, c.face);
  return { x: px, z: pz, face: c.face };
}

/** A man's tick: along his own way (walking in, or home), or to his place in the company. */
function moveMan(s: SimState, map: CoastMap, x: Soldier): void {
  if (x.path.length >= 2) {
    // His own way: waypoint by waypoint.
    let pace = STRIDE;
    for (let guard = 0; guard < 4 && pace > 0 && x.path.length >= 2; guard++) {
      const i = x.seg * 2;
      if (i >= x.path.length) {
        x.path = [];
        x.seg = 0;
        break;
      }
      const before = dhypot(x.path[i] - x.x, x.path[i + 1] - x.z);
      const there = stepTo(x, x.path[i], x.path[i + 1], pace);
      pace -= Math.min(pace, before);
      if (!there) break;
      x.seg++;
      if (x.seg * 2 >= x.path.length) {
        x.path = [];
        x.seg = 0;
      }
    }
    if (x.path.length === 0) arrived(s, map, x);
    return;
  }
  if (x.state === 'leaving') return;
  const c = companyOf(s, x.company);
  if (!c) return;
  if (x.state === 'arming') {
    const b = findBuilding(s, c.barracks);
    if (b && held(b, ARMOUR) > 0) {
      setHeld(b, ARMOUR, held(b, ARMOUR) - 1);
      note(s, ARMOUR, 'used', 'barracks', 1);
      x.armed = true;
      ready(s, map, x, c);
      s.looks++;
      return;
    }
  }
  const p = placeOf(s, map, c, x);
  // Far from his company (it marched off while he was arming): he finds his way to its banner.
  if (dhypot(p.x - x.x, p.z - x.z) > 3 && c.order === 'hold') {
    const way = wayFrom(s, map, x.x, x.z, Math.floor(c.z) * map.size + Math.floor(c.x));
    if (way) {
      x.path = way;
      x.seg = 1;
      return;
    }
  }
  if (stepTo(x, p.x, p.z, c.order === 'march' || c.order === 'return' ? STRIDE : STRIDE * 0.8)) x.face = p.face;
}

/** The end of a man's own way: in at the barracks (ready, or waiting for armour), or home. */
function arrived(s: SimState, map: CoastMap, x: Soldier): void {
  if (x.state === 'leaving') {
    x.hp = 0;
    return;
  }
  if (x.state !== 'coming') return;
  const c = companyOf(s, x.company);
  if (!c) return;
  if (c.kind === 'hoplite' && !x.armed) {
    x.state = 'arming';
    s.rev++;
    return;
  }
  ready(s, map, x, c);
}

/** A man takes his place in the ranks; if his company is away, he goes to find it. */
function ready(s: SimState, map: CoastMap, x: Soldier, c: Company): void {
  x.state = 'ready';
  s.rev++;
  if (c.order === 'hold') {
    const way = wayFrom(s, map, x.x, x.z, Math.floor(c.z) * map.size + Math.floor(c.x));
    if (way) {
      x.path = way;
      x.seg = 1;
    }
  }
}

// ---------------------------------------------------------------------------
// Reading the army.

/** The city's whole strength: men by kind, and their pay a month. */
export function strength(s: SimState): { hoplites: number; archers: number; men: number; pay: number; companies: number } {
  let hoplites = 0;
  let archers = 0;
  for (const c of s.army.companies) {
    const n = menOf(s, c).length;
    if (c.kind === 'hoplite') hoplites += n;
    else archers += n;
  }
  const men = hoplites + archers;
  return { hoplites, archers, men, pay: men * SOLDIER_PAY, companies: s.army.companies.length };
}

/** What a company is doing, in a few words: "drilling", "marching", "holding", "raising: 9 of 16, waiting for armour". */
export function doingWords(s: SimState, c: Company): string {
  const men = menOf(s, c);
  const ready = men.filter((x) => x.state === 'ready').length;
  const coming = men.filter((x) => x.state === 'coming').length;
  const arming = men.filter((x) => x.state === 'arming').length;
  const what = c.order === 'drill' ? 'drilling' : c.order === 'march' ? 'marching' : c.order === 'return' ? 'marching back to barracks' : 'holding its ground';
  if (ready >= c.want) return what;
  const bits: string[] = [];
  if (coming) bits.push(`${coming} walking in`);
  if (arming) bits.push(`${arming} waiting for armour`);
  // (Nobody ready yet: nobody is drilling or marching.)
  return `${ready ? '' : 'raising: '}${ready} of ${c.want} ready${bits.length ? ` (${bits.join(', ')})` : ''}${ready ? `; ${what}` : ''}`;
}
