/**
 * The gods of Greece (slice 58): Greece's cities have patron gods (the
 * groundwork's PATRONS), and the twelve watch what you do beyond your walls.
 *
 * - **Deeds in Greece** are remembered by the god they touch, each as an
 *   `honour` with a plain reason, at the moment they happen (one small call
 *   from where each happens): an expedition against a patron's city angers
 *   its patron (more without cause), plunder angers it a great deal more; a
 *   won expedition or a band broken at home pleases Ares, a war won well
 *   pleases Athena and a lost one is a foolish war to her; a gift that reaches
 *   a city while its festival is on pleases the festival's god; tribute paid
 *   (or the price of peace to a band) angers Ares and pleases nobody; a
 *   promise broken angers Zeus and Hera, and one kept pleases Zeus. Each
 *   returns its words for the line of news or the report where it happens.
 *   (Hermes and trade routes are slice 53's monthly reading of the city.)
 * - **Pious rulers** remember, on the first of each month, how their city's
 *   patron feels about you: one memory of their own kind (`piety`), replaced
 *   each month, forgotten when the patron is watchful or the ruler not pious.
 * - **Gods abroad.** The most loving god (not the target's own patron)
 *   blesses an expedition, and an angry or furious patron stands with their
 *   city's defenders (`godsAbroad`): factors on the two sides' strength, with
 *   a line for the report. Poseidon's mood tips the fights at sea
 *   (`seaTilt`): on the lanes your triremes' strength, in your bay how often
 *   your rams strike home and theirs.
 *
 * Nothing here acts while the gods' switch is off (every prepared history is
 * played with it off, so none moves), and a factor of exactly 1 is left
 * unapplied by the callers. Moods are read and written only through the
 * groundwork's API (pantheon.ts). Pure: no random numbers at all. It imports
 * only leaf modules, so no module's load order changes (see laurels.ts).
 */
import { PLACES, type CityId } from '../map/greece';
import { TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { festivalOf, festivalOn, type Festival } from './festivals';
import { GOD_IDS, GODS, goddess, honour, moodOfGod, moodRank, moodWord, patronOf, type GodId } from './pantheon';
import type { Deal, Expedition, Memory, SimState, WorldCity } from './state';

// ---------------------------------------------------------------------------
// The numbers (tuned by eye).

/** How long a deed in Greece is remembered: the heavier ones two years, the rest a year. */
export const DEED_LONG = 2 * TICKS_PER_YEAR;
export const DEED_FADE = TICKS_PER_YEAR;
/** An expedition against a patron's city: with cause, and without. Plunder (a won expedition's takings) on top. */
export const WAR_CAUSE = 8;
export const WAR_FREE = 20;
export const PLUNDER = 20;
/** Ares, for an expedition won or a band broken at home; Athena, for a war won well, or lost (a foolish war). */
export const ARES_WON = 6;
export const ATHENA_WON = 4;
export const ATHENA_FOOLISH = 4;
/** A gift arriving while a city's festival is on: this share of what the ruler makes of it, to the festival's god, within these. */
export const FEAST_SHARE = 0.5;
export const FEAST_LEAST = 3;
export const FEAST_MOST = 10;
/** Tribute paid, or the price of peace to a band: against Ares. */
export const TRIBUTE_ARES = 6;
/** A promise broken: Zeus and Hera; one kept: Zeus. */
export const BROKEN_ZEUS = 8;
export const BROKEN_HERA = 5;
export const KEPT_ZEUS = 3;
/** What a pious ruler makes of their patron's mood towards you, from furious to loving (pantheon.ts' seven words). */
export const PIETY: readonly number[] = [-10, -6, -3, 0, 2, 4, 8];
/** A loving god's blessing on an expedition: your strength counts this much more. An angry and a furious patron: their defenders, this much more. */
export const BLESSING = 1.25;
export const PATRON_ANGRY = 1.2;
export const PATRON_FURIOUS = 1.4;
/** Poseidon's mood at sea, from furious to loving: your side's strength on a lane, how often your rams strike home in the bay (and theirs, the other way). */
export const SEA_TILT: readonly number[] = [0.7, 0.8, 0.9, 1, 1.05, 1.15, 1.3];

const name = (id: CityId): string => PLACES[id].name;
const whose = (id: CityId): string => (name(id).endsWith('s') ? `${name(id)}’` : `${name(id)}’s`);
const her = (g: GodId): string => (goddess(g) ? 'her' : 'his');
const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const cap = (t: string): string => (t ? `${t[0].toUpperCase()}${t.slice(1)}` : t);
/** "Athena, Athens’ patron". */
export const patronWords = (g: GodId, city: CityId): string => `${GODS[g].name}, ${whose(city)} patron`;

/** Remember a deed (the kind every deed in Greece shares), and give back what it was worth. */
function deed(s: SimState, god: GodId, amount: number, why: string, fade: number): number {
  honour(s, god, amount, 'greece', why, fade);
  return amount;
}

// ---------------------------------------------------------------------------
// The festivals' gods.

/** The god a festival of Greece is held for. */
export const festivalGod = (f: Festival): GodId => f.god;

/** The god of a city's festival if it is on at a tick, else null. */
export function feastGodOn(city: CityId, tick: number): GodId | null {
  const f = festivalOn(city, tick) ? festivalOf(city) : undefined;
  return f ? f.god : null;
}

// ---------------------------------------------------------------------------
// Deeds.

/**
 * An expedition has fought at its city (expeditions.ts' fight): its patron
 * remembers the war (`cause` as the rulers judge it) and any plunder, Ares a
 * win, Athena a war won well or a foolish one. The report's sentence ('' with
 * the gods off, or nothing to say).
 */
export function expeditionDeeds(s: SimState, e: Expedition, cause: boolean): string {
  if (!s.gods.on) return '';
  const city = e.city;
  const bits: string[] = [];
  const p = patronOf(city);
  if (p) {
    const war = deed(s, p, -(cause ? WAR_CAUSE : WAR_FREE), `you made war on ${name(city)}, ${her(p)} city${cause ? '' : ', without cause'}`, DEED_LONG);
    const plundered = e.won && (e.coin > 0 || e.goods > 0);
    const loot = plundered ? deed(s, p, -PLUNDER, `you plundered ${name(city)}`, DEED_LONG) : 0;
    bits.push(`${patronWords(p, city)}, will not forget the war (${signed(war)})${loot ? `, nor the plunder (${signed(loot)})` : ''}`);
  }
  if (e.won) bits.push(`Ares is pleased with the victory (${signed(deed(s, 'ares', ARES_WON, `your soldiers won at ${name(city)}`, DEED_FADE))})`);
  if (p !== 'athena') {
    if (e.won && cause) bits.push(`Athena likes a war won well (${signed(deed(s, 'athena', ATHENA_WON, `a war won well, at ${name(city)}`, DEED_FADE))})`);
    else if (!e.won) bits.push(`Athena thinks it a foolish war (${signed(deed(s, 'athena', -ATHENA_FOOLISH, `a foolish war, lost at ${name(city)}`, DEED_FADE))})`);
  }
  return bits.length ? `${bits.join('. ')}.` : '';
}

/** A band of raiders broken by your soldiers, or sunk in your bay (raids.ts' settle): Ares remembers it. Words for the line of news ('' with the gods off). */
export function bandBeaten(s: SimState, city: CityId, sunk: boolean): string {
  if (!s.gods.on) return '';
  const n = deed(s, 'ares', ARES_WON, sunk ? `your triremes sank ${whose(city)} raiders` : `your soldiers broke ${whose(city)} raiders`, DEED_FADE);
  return `Ares is pleased (${signed(n)})`;
}

/** A gift of yours reached a city (diplomacy.ts' arrive), its ruler's memory of it `worth`: if the city's festival is on, its god is pleased. Words for the line of news ('' if not). */
export function feastGift(s: SimState, city: CityId, worth: number): string {
  if (!s.gods.on) return '';
  const g = feastGodOn(city, s.tick);
  const f = festivalOf(city);
  if (!g || !f) return '';
  const n = Math.max(FEAST_LEAST, Math.min(FEAST_MOST, Math.round(worth * FEAST_SHARE)));
  deed(s, g, n, `your gift reached ${name(city)} during ${f.name}`, DEED_FADE);
  return `${GODS[g].name}, whose feast it is, is pleased (${signed(n)})`;
}

/** You paid tribute to a city, or a band's price of peace (favours.ts, raids.ts): Ares minds. Words for the line of news ('' with the gods off). */
export function tributePaid(s: SimState, city: CityId, peace: boolean): string {
  if (!s.gods.on) return '';
  const n = deed(s, 'ares', -TRIBUTE_ARES, peace ? `you paid ${whose(city)} raiders to go` : `you paid tribute to ${name(city)}`, DEED_FADE);
  return `Ares despises it (${signed(n)})`;
}

/**
 * A ruler remembers your answer to a deal (favours.ts' remember): a promise
 * broken angers Zeus and Hera (a promised request never sent or refused, a
 * year's deal not kept); one kept pleases Zeus; tribute paid angers Ares.
 * Words for the line of news ('' if the gods don't mind, or are off).
 */
export function dealDeeds(s: SimState, d: Deal, m: Memory): string {
  if (!s.gods.on) return '';
  const city = d.city;
  if (m.kind === 'paid' && d.kind === 'tribute') return tributePaid(s, city, false);
  if (m.kind === 'broken' || m.kind === 'reneged') {
    const why = `you broke your promise to ${name(city)}`;
    const z = deed(s, 'zeus', -BROKEN_ZEUS, why, DEED_LONG);
    const h = deed(s, 'hera', -BROKEN_HERA, why, DEED_LONG);
    return `Zeus and Hera saw it (${signed(z)}, ${signed(h)})`;
  }
  if ((m.kind === 'met' && d.promised && d.state === 'met') || m.kind === 'kept') {
    return `Zeus, who loves a promise kept, is pleased (${signed(deed(s, 'zeus', KEPT_ZEUS, `you kept your promise to ${name(city)}`, DEED_FADE))})`;
  }
  return '';
}

// ---------------------------------------------------------------------------
// Pious rulers.

/** What a pious ruler makes of their patron's mood towards you now (0 if not pious, no patron, or the patron watchful). */
export function pietyOf(s: SimState, c: WorldCity): number {
  const p = patronOf(c.id);
  if (!p || !c.ruler || !c.ruler.traits.includes('pious')) return 0;
  return PIETY[moodRank(moodOfGod(s, p))];
}

/** The word that goes after a mood's word: angry, displeased or pleased "with", watchful "of", warm or loving "towards". */
export const moodWith = (word: string): string => (word === 'watchful' ? 'of' : word === 'warm' || word === 'loving' ? 'towards' : 'with');

/** The reason a pious ruler gives: "pious: Athena, Athens’ patron, is angry with your city". */
export function pietyWhy(s: SimState, c: WorldCity): string {
  const p = patronOf(c.id) as GodId;
  const word = moodWord(moodOfGod(s, p));
  return `pious: ${patronWords(p, c.id)}, is ${word} ${moodWith(word)} your city`;
}

/** Once a tick (after the gods): on the first of each month, each pious ruler's memory of their patron's mood, replaced. Nothing with the gods off. */
export function stepGreeceGods(s: SimState): void {
  if (!s.gods.on || s.tick % TICKS_PER_MONTH !== 0) return;
  for (const c of s.world.cities) {
    if (!c.ruler) continue;
    const n = pietyOf(s, c);
    const had = c.memories.some((m) => m.kind === 'piety');
    if (!had && n === 0) continue;
    const why = n ? pietyWhy(s, c) : '';
    const old = c.memories.find((m) => m.kind === 'piety');
    if (old && old.amount === n && old.why === why) continue;
    c.memories = c.memories.filter((m) => m.kind !== 'piety');
    if (n) c.memories.push({ kind: 'piety', why, amount: n, tick: s.tick, fade: 0 });
  }
}

// ---------------------------------------------------------------------------
// Gods abroad.

/** The gods' hands in an expedition against a city: factors on your strength and theirs, who blessed it and whose patron stood against it, and the report's words. */
export interface Abroad {
  ours: number;
  theirs: number;
  blessed: GodId | null;
  against: GodId | null;
  words: string[];
}

const NONE: Abroad = { ours: 1, theirs: 1, blessed: null, against: null, words: [] };

/** The god who would bless an expedition against a city now: the most loving (60 or more), never the city's own patron; the first in the twelve's order of equals. */
export function blesser(s: SimState, city: CityId): GodId | null {
  const p = patronOf(city);
  let best: GodId | null = null;
  let most = -Infinity;
  for (const g of GOD_IDS) {
    if (g === p) continue;
    const m = moodOfGod(s, g);
    if (moodWord(m) !== 'loving' || m <= most) continue;
    most = m;
    best = g;
  }
  return best;
}

/** How the gods would weigh in on an expedition against a city now (nothing with the gods off). */
export function godsAbroad(s: SimState, city: CityId): Abroad {
  if (!s.gods.on) return NONE;
  const out: Abroad = { ours: 1, theirs: 1, blessed: null, against: null, words: [] };
  const b = blesser(s, city);
  if (b) {
    out.ours = BLESSING;
    out.blessed = b;
    out.words.push(`${GODS[b].name}, who loves your city, blessed them as they set out: the odds were the better for it.`);
  }
  const p = patronOf(city);
  const word = p ? moodWord(moodOfGod(s, p)) : '';
  if (p && (word === 'angry' || word === 'furious')) {
    out.theirs = word === 'furious' ? PATRON_FURIOUS : PATRON_ANGRY;
    out.against = p;
    out.words.push(`${patronWords(p, city)}, is ${word} with you, and stood with ${whose(city)} men: the odds were the worse for it.`);
  }
  return out;
}

/** The same, said before you send them (the city's page): '' if no god would weigh in. */
export function abroadWords(s: SimState, city: CityId): string {
  const a = godsAbroad(s, city);
  const bits: string[] = [];
  if (a.blessed) bits.push(`${GODS[a.blessed].name} loves your city and would bless them (your strength counts a quarter more)`);
  if (a.against) bits.push(`${patronWords(a.against, city)}, is ${moodWord(moodOfGod(s, a.against))} with you and would stand with its men (theirs counts ${a.theirs >= PATRON_FURIOUS ? 'two fifths' : 'a fifth'} more)`);
  return bits.length ? `${cap(bits.join('; '))}.` : '';
}

/** Poseidon's lean at sea now: 1 with the gods off or him watchful. */
export function seaTilt(s: SimState): number {
  if (!s.gods.on) return 1;
  return SEA_TILT[moodRank(moodOfGod(s, 'poseidon'))];
}

/** Poseidon's lean in words, for a fight at sea, fought (or, `now`, being joined) ('' when he doesn't lean). */
export function seaWords(s: SimState, now = false): string {
  const t = seaTilt(s);
  if (t === 1) return '';
  const word = moodWord(moodOfGod(s, 'poseidon'));
  const ran = now ? 'runs' : 'ran';
  return t > 1 ? `Poseidon is ${word} ${moodWith(word)} you, and the sea ${ran} with your oars` : `Poseidon is ${word} with you, and the sea ${ran} against your oars`;
}
