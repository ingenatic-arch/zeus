/**
 * The town's messages (slice 44): one log of everything the town hears,
 * kept with the save, read on the Messages panel (src/ui/messages.ts).
 *
 * - **`say(s, msg)` is the only way in.** A message is a kind (which says
 *   its filter: City, Trade, Greece, War, Crime, Health, Empire or Works),
 *   how urgent it is (news, a warning, an alarm), its words, an optional
 *   short title (otherwise the words up to their first stop), and where it
 *   happened (a building, a tile, a company, a city of Greece or a site).
 *   `say` stamps it with the tick and an id, caps its words, drops the same
 *   words said again within a few days, and keeps three game years, at most
 *   MAX_MESSAGES (pinned ones last to go).
 * - **Routing a new source** (for the other lines' integrators): call
 *   `say(s, { kind, u, words, at })` where the event happens, in the sim.
 *   Add a kind to KINDS (append) if none fits; give it `pop: true` there only
 *   if it is an alarm that may pop up. That is all: the panel, the filters,
 *   the badge and the popups follow the table. A system that already keeps
 *   its own news log (Greece's, the army's, crime's) is heard from it by
 *   heard.ts, so a line pushed there needs nothing more.
 * - **Read marks and pins** are the player's, through the `messages`
 *   command. Which kinds may pop up is a setting of the player's screen, kept
 *   in the browser (src/ui/messages.ts), not here.
 *
 * Nothing in the sim reads the log: writing it never changes how the town
 * plays. Pure: no random numbers, no clock but the tick.
 */
import type { CityId } from '../map/greece';
import { TICKS_PER_DAY, TICKS_PER_YEAR } from './clock';
import type { Command } from './commands';
import type { SimState } from './state';

/** How urgent a message is: news arrives quietly; a warning is pressure coming; an alarm may pop up. */
export const NEWS = 0;
export const WARNING = 1;
export const ALARM = 2;
export type Urgency = 0 | 1 | 2;

/** The Messages panel's filters. */
export const CATS = ['city', 'trade', 'greece', 'war', 'crime', 'health', 'empire', 'works'] as const;
export type MessageCat = (typeof CATS)[number];
export const CAT_NAMES: Record<MessageCat, string> = { city: 'City', trade: 'Trade', greece: 'Greece', war: 'War', crime: 'Crime', health: 'Health', empire: 'Empire', works: 'Works' };

/**
 * Each kind of message: its filter, its name (for the popup setting and a
 * message with no place), and whether an alarm of it may pop up.
 * Append new kinds at the end.
 */
export const KINDS = {
  greece: { cat: 'greece', name: 'News of Greece' },
  loan: { cat: 'greece', name: 'Loans' },
  deal: { cat: 'greece', name: 'Rulers waiting on you' },
  raid: { cat: 'war', name: 'Raids', pop: true },
  blockade: { cat: 'war', name: 'Blockades', pop: true },
  army: { cat: 'war', name: 'The army' },
  fleet: { cat: 'war', name: 'Fleets' },
  vassal: { cat: 'empire', name: 'Vassals and allies' },
  colony: { cat: 'empire', name: 'Colonies' },
  rebellion: { cat: 'empire', name: 'Rebellions', pop: true },
  ship: { cat: 'trade', name: 'Ships' },
  caravan: { cat: 'trade', name: 'Caravans' },
  fire: { cat: 'city', name: 'Fires', pop: true },
  collapse: { cat: 'city', name: 'Collapse' },
  season: { cat: 'city', name: 'Seasons' },
  laurel: { cat: 'city', name: 'Laurels' },
  crime: { cat: 'crime', name: 'Crime' },
  plague: { cat: 'health', name: 'Plague', pop: true },
  sickness: { cat: 'health', name: 'Sickness' },
  monument: { cat: 'works', name: 'Monuments' },
  // Merge of slice 45: a prison's breakout, an alarm that may pop up.
  breakout: { cat: 'crime', name: 'Prison breakouts', pop: true },
  // Merge of slice 46: a city founded on a land of the player's choosing, its road in laid.
  land: { cat: 'city', name: 'The land' },
  // Slice 55: a monster seen, settled, stirring, out on a raid, broken off, healed or called home (an alarm may pop up).
  monster: { cat: 'war', name: 'Monsters', pop: true },
  // Slice 59: a hero's word sent, their coming, their deeds, their wishes and their leaving.
  hero: { cat: 'city', name: 'Heroes', pop: true },
} as const satisfies Record<string, { cat: MessageCat; name: string; pop?: boolean }>;
export type MessageKind = keyof typeof KINDS;

/** The kinds whose alarms may pop up (the panel's setting lists these). */
export const POPUP_KINDS = (Object.keys(KINDS) as MessageKind[]).filter((k) => 'pop' in KINDS[k]);

export const catOf = (k: MessageKind): MessageCat => KINDS[k]?.cat ?? 'city';

/** Where something happened: a building, a tile (its index on the map), a company, a city of Greece, or a site in Greece. */
export type Place = { building: number } | { tile: number } | { company: number } | { city: CityId } | { site: string };

export interface Message {
  id: number;
  tick: number;
  kind: MessageKind;
  u: Urgency;
  /** The full words (capped at WORDS_MAX characters). */
  words: string;
  /** A short title, when the words' first part won't do (missing: titleOf works it out). */
  title?: string;
  at?: Place;
  read?: true;
  pin?: true;
  /** Slice 51: what kind of thing it tells, within its kind, where the overview counts by it (a crime's: 'theft', 'picked', 'caught'…). */
  of?: string;
}

/** Where a news log has been heard up to: the tick of its last line heard, and how many lines of that tick. */
export type Cursor = [number, number];

export interface Messages {
  log: Message[];
  next: number;
  /** The tick the log begins: 0 for a new game; an older save's tick when it was loaded (its earlier news wasn't kept). */
  since: number;
  /** How far heard.ts has read Greece's, the army's and crime's news logs. */
  heard: { world: Cursor; army: Cursor; crime: Cursor };
  /** The facts heard.ts found true when it last looked (short keys), so each is said once as it becomes true. */
  seen: string[];
  /** The tick heard.ts last looked. */
  looked: number;
}

/** Three game years, at most this many messages. */
export const KEEP_TICKS = 3 * TICKS_PER_YEAR;
export const MAX_MESSAGES = 600;
/** A message's words are cut at this many characters. */
export const WORDS_MAX = 360;
/** The same words again within this long are not said twice. */
export const REPEAT_TICKS = 3 * TICKS_PER_DAY;

export function freshMessages(since = 0): Messages {
  return { log: [], next: 1, since, heard: { world: [-1, 0], army: [-1, 0], crime: [-1, 0] }, seen: [], looked: since };
}

/** Words capped at WORDS_MAX characters, cut at a space, with an ellipsis. */
export function capWords(words: string): string {
  const w = words.trim();
  if (w.length <= WORDS_MAX) return w;
  const cut = w.slice(0, WORDS_MAX - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > WORDS_MAX * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:·]+$/, '')}…`;
}

export interface Saying {
  kind: MessageKind;
  words: string;
  /** News (the default), WARNING or ALARM. */
  u?: Urgency;
  title?: string;
  at?: Place;
  /** When it happened, if not now (a line heard from a news log keeps its own tick). */
  tick?: number;
  /** Slice 51: what kind of thing it tells, within its kind (see Message). */
  of?: string;
}

/**
 * Write a message into the town's log: the only way in. Returns it, or null
 * when the same words were said within REPEAT_TICKS (it is not said twice).
 */
export function say(s: SimState, m: Saying): Message | null {
  const g = s.messages;
  const words = capWords(m.words);
  if (!words) return null;
  const tick = m.tick ?? s.tick;
  for (let i = g.log.length - 1; i >= 0 && tick - g.log[i].tick <= REPEAT_TICKS; i--) if (g.log[i].words === words) return null;
  const msg: Message = { id: g.next++, tick, kind: m.kind, u: m.u ?? NEWS, words };
  if (m.title) msg.title = m.title;
  if (m.at) msg.at = m.at;
  // Slice 51.
  if (m.of) msg.of = m.of;
  g.log.push(msg);
  prune(g, s.tick);
  return msg;
}

/** Let go of messages over three years old and any over the cap, oldest first, pinned ones last. */
function prune(g: Messages, tick: number): void {
  const old = tick - KEEP_TICKS;
  let stale = false;
  for (const m of g.log) {
    if (m.tick >= old) break;
    if (!m.pin) {
      stale = true;
      break;
    }
  }
  if (!stale && g.log.length <= MAX_MESSAGES) return;
  let log = g.log.filter((m) => m.pin || m.tick >= old);
  let over = log.length - MAX_MESSAGES;
  if (over > 0) log = log.filter((m) => m.pin || over-- <= 0);
  // (Only pins left over the cap: the oldest of them go too.)
  if (log.length > MAX_MESSAGES) log = log.slice(log.length - MAX_MESSAGES);
  g.log = log;
}

/** A message's title: its own, or its words up to their first stop (a colon, a full stop), at most about 70 characters. */
export function titleOf(m: Message): string {
  return m.title || titleFrom(m.words);
}

/** The title words would have: up to their first stop, at most about 70 characters. */
export function titleFrom(w: string): string {
  const STOP = /[:;.!?](\s|$)|\s·\s|\s\(/g;
  let t = w;
  // (Up to the first stop; past it while that leaves only a few words: "Raiders! 35 of Sparta’s men are in…", "The merchant
  // ship: her next call falls in winter", "Fire by the farm: the farm is burning…". Review of slice 44: more than 20 letters, not 12.)
  for (let x = STOP.exec(w); x; x = STOP.exec(w)) {
    t = w.slice(0, x.index + (w[x.index] === '!' || w[x.index] === '?' ? 1 : 0));
    if (t.length > 20) break;
    t = w;
  }
  // (Too long: up to a comma, if that leaves enough.)
  const comma = t.indexOf(', ', 12);
  if (t.length > 72 && comma > 0 && comma <= 72) t = t.slice(0, comma);
  if (t.length > 72) {
    const cut = t.slice(0, 70);
    const sp = cut.lastIndexOf(' ');
    t = `${(sp > 40 ? cut.slice(0, sp) : cut).replace(/[\s,]+$/, '')}…`;
  }
  return t;
}

/** Is a message about this place? */
export function isAt(m: Message, p: Place): boolean {
  const a = m.at;
  if (!a) return false;
  if ('building' in p) return 'building' in a && a.building === p.building;
  if ('tile' in p) return 'tile' in a && a.tile === p.tile;
  if ('company' in p) return 'company' in a && a.company === p.company;
  if ('city' in p) return 'city' in a && a.city === p.city;
  return 'site' in a && a.site === p.site;
}

/** The messages about a place, newest first (for a building's panel, slice 48). */
export function messagesAt(s: SimState, p: Place): Message[] {
  return s.messages.log.filter((m) => isAt(m, p)).reverse();
}

/** The messages in a filter (all of them for 'all'), newest first. */
export function messagesIn(s: SimState, cat: MessageCat | 'all'): Message[] {
  return s.messages.log.filter((m) => cat === 'all' || catOf(m.kind) === cat).reverse();
}

/** How many are unread, and the most urgent of them (-1 when none is). */
export function unread(s: SimState): { n: number; u: Urgency | -1 } {
  let n = 0;
  let u: Urgency | -1 = -1;
  for (const m of s.messages.log) {
    if (m.read) continue;
    n++;
    if (m.u > u) u = m.u;
  }
  return { n, u };
}

/** The player's command: mark messages read (or not), pin or unpin them, or mark them all read. Nothing else in the town moves. */
export function messagesCommand(s: SimState, c: Extract<Command, { type: 'messages' }>): void {
  const g = s.messages;
  if (c.act === 'allread') {
    for (const m of g.log) if (!m.read) m.read = true;
    return;
  }
  if (!Array.isArray(c.ids)) return;
  const ids = new Set(c.ids.filter((x) => Number.isInteger(x)));
  for (const m of g.log) {
    if (!ids.has(m.id)) continue;
    if (c.act === 'read') m.read = true;
    else if (c.act === 'unread') delete m.read;
    else if (c.act === 'pin') m.pin = true;
    else if (c.act === 'unpin') delete m.pin;
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const cursorOk = (c: unknown): boolean => Array.isArray(c) && c.length === 2 && c.every(fin);

/** Is a saved message log whole: its messages, ids, cursors and facts of the right kinds? */
export function messagesOk(g: unknown): boolean {
  if (!isObj(g) || !Array.isArray(g.log) || !fin(g.next) || !fin(g.since) || !fin(g.looked) || !Array.isArray(g.seen) || !g.seen.every((k) => typeof k === 'string')) return false;
  const h = g.heard;
  if (!isObj(h) || !cursorOk(h.world) || !cursorOk(h.army) || !cursorOk(h.crime)) return false;
  return g.log.every((m) => isObj(m) && fin(m.id) && fin(m.tick) && typeof m.kind === 'string' && m.kind in KINDS && (m.u === 0 || m.u === 1 || m.u === 2) && typeof m.words === 'string');
}

/**
 * A saved town whose message log is damaged or missing keeps everything else:
 * its log starts again, empty, from its tick (only the history is lost). For
 * the save reader, after migrating.
 */
export function mendMessages(st: unknown): void {
  if (!isObj(st) || messagesOk(st.messages)) return;
  const tick = fin(st.tick) ? st.tick : 0;
  const m = freshMessages(tick);
  // (Whatever the logs hold counts as heard: it isn't told again as new.)
  const end = (o: unknown): Cursor => {
    const list = isObj(o) && Array.isArray(o.news) ? (o.news as unknown[]).filter(isObj) : [];
    const last = list[list.length - 1];
    return last && fin(last.tick) ? [last.tick, list.filter((n) => n.tick === last.tick).length] : [-1, 0];
  };
  m.heard = { world: end(st.world), army: end(st.army), crime: end(st.crime) };
  st.messages = m;
}
