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
import { hash2 } from '../map/noise';
import { around, centreOf, findBuilding, FINE, footSide, livedIn, TOWNHOUSE, VILLA } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { errandsOut, nearestBy, PORTER_RETRY, sendCart, stallRoom, wayPoints } from './food';
import { ARMOUR, coming, COPPER, gi, held, setHeld, type Ware } from './foods';
import { MEN } from './folk';
import { rateOf, WORK_SHARE } from './labour';
import { overland } from './roads';
import { door, roadsBeside } from './rounds';
import { note } from './stockbook';
import { ARMOURY_COPPER, isStore, roomOf } from './stores';
import { TILE_ROAD, type Army, type Building, type Company, type CompanyKind, type Person, type ServesAs, type SimState, type Soldier } from './state';
import { HIRED_PAY, pay, settle, SOLDIER_PAY, spendable } from './treasury';
import { newWalker, offMapPoint, setPath } from './walk';
import { offRoadPath, prunePath, walkable } from './wild';
import { restFor } from './water';

/** Men in a full company, and companies a barracks holds. */
export const COMPANY_SIZE = 16;
export const PER_BARRACKS = 4;
/** Men a company calls a day while it is short. */
export const CALLS_A_DAY = 4;
/** The home levels each kind is drawn from, at least. */
export const LEVEL_FOR: Record<CompanyKind, number> = { hoplite: FINE, archer: TOWNHOUSE };
/**
 * How fast a banner marches (tiles a tick): a soldier's quick march, two
 * thirds quicker than the townsfolk walk (0.12) and about as fast as raiders
 * run (0.192), so a company sent when the band is first seen meets it at the
 * stores (slice 24's review: at 0.16 a company from #battle's barracks reached
 * the west bridge less than a day before the band); how fast a man keeps his
 * place in the column or the ranks (quicker, so the column keeps up); and how
 * fast he walks his own way, in from his home or home again.
 */
export const MARCH_SPEED = 0.2;
export const STRIDE = 0.22;
/** A man's pace keeping his place in the column on the march (the ranks and the drill keep STRIDE's, as before the march quickened). */
export const MARCH_STRIDE = 0.27;
export const WALK_IN = 0.14;
/** Hirelings march in from the map's edge at the double (slice 24): men who march for a living, hired because a band is coming. */
export const HIRED_IN = 0.34;
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
/** The age a man must be to serve, and the age past which he no longer does. */
export const SERVE_AGE = 16;
export const SERVE_AGE_MAX = 60;

export const freshArmy = (): Army => ({ companies: [], soldiers: [], nextId: 1, foes: [], arrows: [], news: [], owed: 0 });

/** Hirelings (slice 24): who they are, what they cost to hire, and their pay (three times a citizen's). */
export const HIRELINGS = {
  cretan: { kind: 'archer' as CompanyKind, name: 'Cretan archers', one: 'Cretan archer', from: ['Gortyn', 'Knossos', 'Lyttos', 'Kydonia'], fee: 300 },
  arcadian: { kind: 'hoplite' as CompanyKind, name: 'Arcadian hoplites', one: 'Arcadian hoplite', from: ['Mantinea', 'Tegea', 'Orchomenos', 'Megalopolis'], fee: 450 },
} as const;
export type HiredKind = keyof typeof HIRELINGS;
/** A man's pay a month: a citizen's, or a hireling's. */
export const payOf = (c: Company): number => (c.hired ? HIRED_PAY : SOLDIER_PAY);
export { HIRED_PAY };
/** How long a man wounded lies where he fell before he gets up, and how many days he heals at the barracks. */
export const LIE = 30;
export const HEAL_DAYS = 30;
/** How long a man who can find no way to his company waits before he looks again. */
const LOOK_AGAIN = TICKS_PER_DAY;

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
/** A company's men (walking in, waiting for armour, in the ranks, wounded or healing; not the fallen). */
export const menOf = (s: SimState, c: Company): Soldier[] => s.army.soldiers.filter((x) => x.company === c.id && x.state !== 'fallen');
/** Its wounded: lying where they fell, walking back, or healing at the barracks. */
export const woundedOf = (s: SimState, c: Company): Soldier[] => s.army.soldiers.filter((x) => x.company === c.id && (x.state === 'wounded' || x.state === 'healing'));
/** The men in its ranks, ready. */
export const readyOf = (s: SimState, c: Company): Soldier[] => s.army.soldiers.filter((x) => x.company === c.id && x.state === 'ready');
/** The companies of a barracks, in the order they were raised. */
export const companiesAt = (s: SimState, b: Building): Company[] => s.army.companies.filter((c) => c.barracks === b.id);
/** The man serving from a home, if any (not one already dismissed and walking home). */
export const servingFrom = (s: SimState, b: Building): Soldier | undefined => s.army.soldiers.find((x) => x.home === b.id && x.state !== 'leaving' && x.state !== 'fallen');

/** The homes with a man serving (not one dismissed, on his way home). */
export function servingHomes(s: SimState): Set<number> {
  const out = new Set<number>();
  for (const x of s.army.soldiers) if (x.home > 0 && x.state !== 'leaving' && x.state !== 'fallen') out.add(x.home);
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

/**
 * A company's barracks, which way it faces, its gate and the company's spot on
 * its drill ground: what every man's step reads. Worked out once a tick and
 * kept (each costs a walk round the barracks' ring), not once a man (slice 23's
 * review: the army cost a millisecond a tick with sixteen men walking in).
 */
export interface Base {
  b: Building | undefined;
  front: number;
  gate: number;
  spot: [number, number];
}
let bases: { s: SimState | null; tick: number; rev: number; tilesRev: number; n: number; by: Map<number, Base> } = { s: null, tick: -1, rev: -1, tilesRev: -1, n: -1, by: new Map() };
export function baseOf(s: SimState, map: CoastMap, c: Company): Base {
  if (bases.s !== s || bases.tick !== s.tick || bases.rev !== s.rev || bases.tilesRev !== s.tilesRev || bases.n !== s.army.companies.length) bases = { s, tick: s.tick, rev: s.rev, tilesRev: s.tilesRev, n: s.army.companies.length, by: new Map() };
  let o = bases.by.get(c.id);
  if (!o) {
    const b = findBuilding(s, c.barracks);
    o = b ? { b, front: frontOf(s, map, b), gate: gateOf(s, map, b), spot: drillSpot(s, b, c) } : { b, front: Math.PI / 2, gate: -1, spot: [c.x, c.z] };
    bases.by.set(c.id, o);
  }
  return o;
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
  const men = f.members.filter((p) => !p.female && ageOf(s, p) >= SERVE_AGE && ageOf(s, p) <= SERVE_AGE_MAX);
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

/** How a man stands in his house (a save from before it was kept: a son if he is named by someone, else the head). */
export const kinOf = (x: Soldier): ServesAs => x.kin ?? (x.father ? 'son' : 'head');

/** How the man is named in his house: "son of Nikias", "husband of Theano", "head of his house". */
export function fatherWords(x: Soldier): string {
  const k = kinOf(x);
  return k === 'head' || !x.father ? 'head of his house' : `${k} of ${x.father}`;
}

/**
 * Who a man serving is known by in his house: a son by his father (or, if
 * the house's records name only his mother, by her husband, else by her); a
 * husband by his wife; a brother or cousin by the head; the head by nobody.
 */
function knownBy(b: Building, p: Person): string {
  if (p.role === 'head') return '';
  if (p.role !== 'son') return p.kin;
  const parent = b.family?.members.find((m) => m.name === p.kin);
  if (parent?.female) return b.family?.members.find((m) => m.role === 'husband' && m.kin === parent.name)?.name ?? p.kin;
  return p.kin;
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
    hired: '',
    strong: 0,
    routed: false,
    away: 0,
  };
  s.army.companies.push(c);
  const [x, z] = drillSpot(s, b, c);
  c.x = x;
  c.z = z;
  s.rev++;
  return c;
}

/** Why hirelings can't be hired at this barracks now, or '' if they can. */
export function hireRefusal(s: SimState, b: Building | undefined, kind: string): string {
  const r = raiseRefusal(s, b);
  if (r) return r;
  const h = HIRELINGS[kind as HiredKind];
  if (!h) return 'No such hirelings';
  if (spendable(s) < h.fee) return `The treasury can’t spare the ${h.fee} dr they ask to come`;
  return '';
}

/**
 * Hire a company of mercenaries at a barracks: Cretan archers or Arcadian
 * hoplites, for their fee now and three times a citizen's pay a month. They
 * walk in from the nearest edge of the map, armed with their own, in their
 * own colours, and take nobody from your homes. Null if they can't come.
 */
export function hire(s: SimState, map: CoastMap, barracks: number, kind: string): Company | null {
  const b = findBuilding(s, barracks);
  if (hireRefusal(s, b, kind) !== '' || !b) return null;
  const h = HIRELINGS[kind as HiredKind];
  const gate = gateOf(s, map, b);
  const n = map.size;
  const edges: number[] = [];
  for (let i = 0; i < n; i++) for (const t of [i, (n - 1) * n + i, i * n, i * n + n - 1]) if (walkable(map, s, t)) edges.push(t);
  const tiles = gate >= 0 && edges.length ? offRoadPath(map, s, edges, gate) : null;
  if (!tiles) return null;
  const c = raise(s, barracks, h.kind);
  if (!c) return null;
  c.hired = kind as HiredKind;
  pay(s, -h.fee, 'hirelings', h.name);
  const way: number[] = [];
  for (const [px, pz] of prunePath(map, s, tiles)) way.push(px, pz);
  const [ox, oz] = offMapPoint(n, tiles[0]);
  // (Off the map, beyond the edge they come in by: the column files in, two abreast.)
  const dx = ox - way[0];
  const dz = oz - way[1];
  const d = dhypot(dx, dz) || 1;
  const front = frontOf(s, map, b);
  for (let slot = 0; slot < COMPANY_SIZE; slot++) {
    const back = 0.45 * Math.floor(slot / 2);
    const side = (slot % 2 === 0 ? -1 : 1) * 0.17;
    const sx0 = ox + (dx / d) * back - (dz / d) * side;
    const sz0 = oz + (dz / d) * back + (dx / d) * side;
    const id = s.army.nextId++;
    const name = MEN[Math.floor(hash2(id, 1, 2401) * MEN.length)];
    const father = MEN[Math.floor(hash2(id, 2, 2401) * MEN.length)];
    const [px, pz] = slotAt(h.kind, slot, ...drillSpot(s, b, c), front);
    s.army.soldiers.push({
      id,
      company: c.id,
      slot,
      home: 0,
      name,
      father: father === name ? MEN[(MEN.indexOf(name) + 7) % MEN.length] : father,
      kin: 'son',
      house: h.from[Math.floor(hash2(id, 3, 2401) * h.from.length)],
      state: 'coming',
      x: sx0,
      z: sz0,
      face: datan2(-dz, -dx),
      path: [sx0, sz0, ox, oz, ...way, px, pz],
      seg: 1,
      walked: 0,
      armed: h.kind === 'hoplite',
      hp: 100,
      foe: 0,
      cool: 0,
      swung: 0,
      fell: 0,
    });
  }
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

/** Dismiss a company: the men go home, their armour back on the rack (hirelings walk off the way they came, with their own); what it was owed is still paid. */
export function dismiss(s: SimState, map: CoastMap, id: number): void {
  const c = companyOf(s, id);
  if (!c || c.away) return;
  const b = findBuilding(s, c.barracks);
  for (const x of s.army.soldiers.filter((o) => o.company === c.id)) {
    if (x.state === 'fallen') continue;
    if (c.hired) walkOff(s, map, x);
    else {
      handBack(s, x, b);
      sendHome(s, map, x);
    }
  }
  // (Slice 23's review: dismissing forgot the pay it was owed.)
  s.army.owed += c.owed;
  s.army.companies = s.army.companies.filter((o) => o !== c);
  dropGone(s);
  s.rev++;
}

/** A hireling walks off to the nearest open edge of the map (or, with no way there, is simply gone). */
function walkOff(s: SimState, map: CoastMap, x: Soldier): void {
  x.company = 0;
  x.state = 'leaving';
  x.foe = 0;
  const way = edgeWay(s, map, x.x, x.z);
  if (!way) {
    x.hp = 0;
    return;
  }
  x.path = way;
  x.seg = 1;
}

/** The way from (x, z) to the nearest open tile on the map's edge and a few paces beyond it (null: none). */
function edgeWay(s: SimState, map: CoastMap, x: number, z: number): number[] | null {
  const starts = startTiles(s, map, x, z);
  if (!starts.length) return null;
  const out = overland(map, s, starts[0]);
  if (!out) return null;
  const way = [x, z, ...out.points];
  const [ox, oz] = offMapPoint(map.size, out.edge);
  way.push(ox, oz);
  return way;
}

/** A barracks is gone (cleared, burnt, fallen in): its companies are disbanded, the men walking home with their armour. */
export function barracksGone(s: SimState, map: CoastMap, b: Building): void {
  for (const c of companiesAt(s, b)) {
    for (const x of menOf(s, c)) {
      if (c.hired) walkOff(s, map, x);
      else {
        handBack(s, x, undefined);
        sendHome(s, map, x);
      }
    }
    s.army.owed += c.owed;
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
  if (c.away) return 'Away on an expedition';
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
  if (c.away && tile < 0) return false;
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
  if (s.tick % TICKS_PER_MONTH === 0 && (a.companies.length || a.owed > 0)) {
    // Hirelings whose last month's pay is still owed walk off, grumbling.
    for (const c of a.companies.filter((o) => o.hired && o.owed > 0)) unpaid(s, map, c);
    for (const c of a.companies) c.owed += menOf(s, c).length * payOf(c);
    settle(s);
  }
  for (const b of s.buildings) if (b.kind === 'barracks') racks(s, map, b);
  for (const c of a.companies) moveBanner(s, map, c);
  for (const x of a.soldiers) moveMan(s, map, x);
  // The dismissed home, and men whose home is gone, leave the city; the fallen are gone once they have lain a while.
  if (a.soldiers.some((x) => (x.state === 'leaving' && x.hp <= 0) || (x.state === 'fallen' && s.tick - x.fell >= FALLEN_LIE))) {
    dropGone(s);
    a.soldiers = a.soldiers.filter((x) => !(x.state === 'fallen' && s.tick - x.fell >= FALLEN_LIE));
    s.rev++;
  }
}

/** How long a man killed lies where he fell (then he is gone, fading: render/army.ts). */
export const FALLEN_LIE = 40;

/** Hirelings unpaid a month walk off, grumbling, with a line in the town's news. */
function unpaid(s: SimState, map: CoastMap, c: Company): void {
  const h = HIRELINGS[c.hired as HiredKind];
  armyNews(s, `The ${h.name} of ${companyName(c)} have had no pay for a month (${c.owed} dr owed): they walk off, grumbling that a city that can’t pay shouldn’t hire`, c.barracks);
  // (What they were owed goes with them, unpaid: they won't be back for it.)
  c.owed = 0;
  dismiss(s, map, c.id);
}

/** A line of the army's news, for the town lines (the last few kept). */
export function armyNews(s: SimState, line: string, at: number): void {
  s.army.news.push({ tick: s.tick, line, at });
  if (s.army.news.length > 12) s.army.news.splice(0, s.army.news.length - 12);
  s.rev++;
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
  // The wounded heal at their barracks, a little each day; whole again, they take their place in the ranks.
  for (const x of a.soldiers) {
    if (x.state !== 'healing') continue;
    x.hp = Math.min(100, x.hp + Math.ceil(100 / HEAL_DAYS));
    if (x.hp < 100) continue;
    const c = companyOf(s, x.company);
    if (!c) continue;
    x.state = 'ready';
    ready(s, map, x, c);
  }
  let serving: Set<number> | null = null;
  for (const c of a.companies) {
    const b = findBuilding(s, c.barracks);
    if (!b) continue;
    const men = menOf(s, c);
    const waiting = men.filter((x) => x.state === 'arming').length;
    c.why = '';
    // (Away on an expedition (slice 28): its places are filled once it is home.)
    if (c.away) {
      c.why = 'Away on an expedition: its places are filled once it is home';
      continue;
    }
    // (Hirelings come all at once, and nobody fills a hireling's place.)
    if (c.hired) continue;
    // (Nor while it fights or runs: the men called would come into the fight one by one.)
    if (men.length < c.want && (c.strong > 0 || c.routed)) {
      c.why = c.routed ? 'Broken: it fills again once it is back at the barracks' : 'In a fight: it fills again once the fight is over';
      continue;
    }
    if (men.length < c.want) {
      if (roadsBeside(s, map.size, b).length === 0) {
        // (Slice 23's review: it said "Only N can spare a man" when the trouble was the road.)
        c.why = 'The barracks needs a road beside it: its men come in by the road';
        continue;
      }
      if (rateOf(b) <= 0) {
        c.why = 'The barracks has no workers to take the men in';
        continue;
      }
      serving ??= servingHomes(s);
      const { called, blocked } = call(s, map, c, b, Math.min(CALLS_A_DAY, c.want - men.length), serving);
      const have = men.length + called;
      if (have < c.want && called === 0) c.why = blocked > 0 ? `${blocked === 1 ? 'A home that could send a man has' : `${blocked} homes that could send a man have`} no way to the barracks over roads and open ground` : have === 0 ? `No ${fromWords(c.kind).replace('and better', 'or better').replace(' and ', ' or ')} can spare a man` : `Only ${have} ${fromWords(c.kind)} can spare a man`;
    }
    if (!c.why && waiting > 0 && held(b, ARMOUR) === 0 && !armourAbout(s, b)) c.why = `No armour in the stores: ${waiting === 1 ? '1 man is' : `${waiting} men are`} waiting for theirs`;
  }
}

/** Is armour on its way to a barracks, or in any store its porter could fetch from? */
function armourAbout(s: SimState, b: Building): boolean {
  if (s.walkers.some((w) => w.origin === b.id && w.kind === 'porter')) return true;
  return s.buildings.some((g) => isStore(g.kind) && roomOf(g.kind, ARMOUR) > 0 && held(g, ARMOUR) > 0);
}

/** Call up to `most` men for a company from the nearest homes that can spare one; how many came, and how many homes that could have sent one have no way there. */
function call(s: SimState, map: CoastMap, c: Company, b: Building, most: number, serving: Set<number>): { called: number; blocked: number } {
  const [bx, bz] = centreOf(b);
  const homes = s.buildings
    .filter((h) => h.kind === 'home' && canSpare(s, h, c.kind, serving))
    .map((h) => ({ h, d: dhypot(centreOf(h)[0] - bx, centreOf(h)[1] - bz) }))
    .sort((p, q) => p.d - q.d || p.h.id - q.h.id);
  const gate = gateOf(s, map, b);
  if (gate < 0) return { called: 0, blocked: homes.length };
  const taken = new Set(menOf(s, c).map((x) => x.slot));
  let called = 0;
  let blocked = 0;
  for (const { h } of homes) {
    if (called >= most) break;
    const p = eldestMan(s, h);
    if (!p) continue;
    const [hx, hz] = centreOf(h);
    const way = wayFrom(s, map, hx, hz, gate);
    if (!way) {
      blocked++;
      continue;
    }
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
      father: knownBy(h, p),
      kin: p.role as ServesAs,
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
      foe: 0,
      cool: 0,
      swung: 0,
      fell: 0,
    };
    s.army.soldiers.push(x);
    serving.add(h.id);
    called++;
  }
  if (called) s.rev++;
  return { called, blocked };
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
  const base = baseOf(s, map, c);
  const b = base.b;
  if (c.order === 'drill') {
    if (!b) return;
    const [hx, hz] = base.spot;
    const front = base.front;
    const d = drillAt(s.tick, c);
    c.face = front + (d.turn * Math.PI) / 2;
    c.x = hx + dcos(c.face) * d.ahead;
    c.z = hz + dsin(c.face) * d.ahead;
    return;
  }
  if (c.order !== 'march' && c.order !== 'return') return;
  // (On the march, its men fighting raiders who came at it: the banner stands until the fight is done.)
  if (c.order === 'march' && !c.routed && s.army.foes.length && fighting(s, c)) return;
  // (The column waits for its slowest man at the start: nobody is left more than a few paces behind.)
  const L = pathLength(c.path);
  c.along = Math.min(L, c.along + MARCH_SPEED);
  const p = pointAlong(c.path, c.along);
  c.x = p.x;
  c.z = p.z;
  c.face = p.face;
  if (c.along >= L - 1e-9) {
    c.order = c.order === 'return' ? 'drill' : 'hold';
    if (c.order === 'drill' && b) c.face = base.front;
    // Home again: a broken company gathers itself.
    if (c.order === 'drill') {
      c.routed = false;
      c.strong = 0;
    }
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
  const base = baseOf(s, map, c);
  // Waiting for armour, he stands on the drill ground whatever the company is doing (and so does a man left behind while it is away).
  if ((x.state === 'arming' || c.order === 'away') && base.b && c.order !== 'drill') {
    const [hx, hz] = base.spot;
    const front = base.front;
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
    let pace = x.home === 0 && x.state === 'coming' ? HIRED_IN : WALK_IN;
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
  // (Fighting, his steps are the battle's; fallen or lying wounded, he lies still; healing, he is in the colonnade.)
  // (Away on an expedition, he is off your map: expeditions.ts moves him.)
  if (x.state === 'leaving' || x.state === 'fallen' || x.state === 'healing' || x.state === 'away' || x.foe > 0) return;
  if (x.state === 'wounded') {
    if (s.tick - x.fell >= LIE) limpBack(s, map, x);
    return;
  }
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
  // Far from his place (his company marched off while he was arming, or he is coming back from his wounds): he finds
  // his own way round buildings to where it is going, rather than cutting straight across to it (slice 23's review);
  // with no way there he waits, and looks again a day later rather than every tick.
  if (dhypot(p.x - x.x, p.z - x.z) > 3) {
    if (x.cool > 0) {
      x.cool--;
      return;
    }
    const goal = c.order === 'hold' || c.order === 'march' ? (c.target >= 0 ? c.target : Math.floor(c.z) * map.size + Math.floor(c.x)) : baseOf(s, map, c).gate;
    const way = wayFrom(s, map, x.x, x.z, goal);
    if (way) {
      x.path = c.order === 'drill' || c.order === 'return' || c.order === 'away' ? [...way, ...baseOf(s, map, c).spot] : way;
      x.seg = 1;
    } else x.cool = LOOK_AGAIN;
    return;
  }
  if (stepTo(x, p.x, p.z, c.order === 'march' || c.order === 'return' ? MARCH_STRIDE : STRIDE * 0.8)) x.face = p.face;
}

/** A wounded man gets up and walks back to his barracks to heal (with his barracks gone, home; a hireling, off). */
function limpBack(s: SimState, map: CoastMap, x: Soldier): void {
  const c = companyOf(s, x.company);
  const base = c ? baseOf(s, map, c) : null;
  const way = base && base.b ? wayFrom(s, map, x.x, x.z, base.gate) : null;
  if (!c || !base || !way) {
    if (c?.hired || x.home === 0) walkOff(s, map, x);
    else sendHome(s, map, x);
    return;
  }
  x.path = [...way, ...base.spot];
  x.seg = 1;
  // (Still 'wounded' on his way: in at the barracks he heals: arrived.)
}

/** The end of a man's own way: in at the barracks (ready, or waiting for armour), or home. */
function arrived(s: SimState, map: CoastMap, x: Soldier): void {
  if (x.state === 'leaving') {
    x.hp = 0;
    return;
  }
  if (x.state === 'wounded') {
    x.state = 'healing';
    x.hp = Math.max(x.hp, 10);
    s.rev++;
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

/** A man takes his place in the ranks; if his company is away, he goes to find it (moveMan). */
function ready(s: SimState, map: CoastMap, x: Soldier, c: Company): void {
  x.state = 'ready';
  x.cool = 0;
  s.rev++;
  void map;
  void c;
}

// ---------------------------------------------------------------------------
// Reading the army.

/** The city's whole strength: its own men by kind, its hirelings (counted once, not again under their kind: slice 24's review), the wounded among them all, and their pay a month. */
export function strength(s: SimState): { hoplites: number; archers: number; men: number; pay: number; companies: number; wounded: number; hirelings: number } {
  let hoplites = 0;
  let archers = 0;
  let pay = 0;
  let wounded = 0;
  let hirelings = 0;
  for (const c of s.army.companies) {
    const n = menOf(s, c).length;
    if (c.hired) hirelings += n;
    else if (c.kind === 'hoplite') hoplites += n;
    else archers += n;
    pay += n * payOf(c);
    wounded += woundedOf(s, c).length;
  }
  const men = hoplites + archers + hirelings;
  return { hoplites, archers, men, pay, companies: s.army.companies.length, wounded, hirelings };
}

/** Is any of a company's men fighting now? */
export const fighting = (s: SimState, c: Company): boolean => s.army.soldiers.some((x) => x.company === c.id && x.foe > 0);

/** What a company is doing, in a few words: "drilling", "marching", "holding", "raising: 9 of 16, waiting for armour". */
export function doingWords(s: SimState, c: Company): string {
  const men = menOf(s, c);
  const ready = men.filter((x) => x.state === 'ready').length;
  const coming = men.filter((x) => x.state === 'coming').length;
  const arming = men.filter((x) => x.state === 'arming').length;
  const what = c.order === 'away' ? 'away on an expedition' : c.routed ? 'broken, running back to barracks' : fighting(s, c) ? 'fighting' : c.order === 'drill' ? 'drilling' : c.order === 'march' ? 'marching' : c.order === 'return' ? 'marching back to barracks' : 'holding its ground';
  const hurt = men.filter((x) => x.state === 'wounded' || x.state === 'healing').length;
  if (c.hired && coming === men.length && men.length > 0) return `walking in from the edge of your land (${men.length} men)`;
  if (c.hired || ready + hurt >= c.want) return `${what}${hurt ? ` (${hurt} wounded)` : ''}`;
  const bits: string[] = [];
  if (coming) bits.push(`${coming} walking in`);
  if (arming) bits.push(`${arming} waiting for armour`);
  // (Nobody ready yet: nobody is drilling or marching.)
  return `${ready ? '' : 'raising: '}${ready} of ${c.want} ready${bits.length ? ` (${bits.join(', ')})` : ''}${ready ? `; ${what}` : ''}`;
}
