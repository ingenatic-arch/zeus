/**
 * Ambitions (slice 39): what the city plays towards. Four ambitions (three
 * until slice 61) run side by side from the founding, and there is nothing to
 * pick (Oliver's choice, 21 Oct: "chase all three at once"): every town works
 * toward all of them, and whatever you do counts toward one of them.
 *
 * - **Master of Greece**: vassals and colonies, an army feared across
 *   Greece; its great monument is the Colossus.
 * - **The great trading city**: routes, trade and the richest treasury; its
 *   great monument is the Lighthouse.
 * - **A city of wonders**: monuments, grand estates and a great population;
 *   its great monument is the Stadium.
 * - **Beloved of the gods** (slice 61): a shrine to every one of the twelve,
 *   a first sanctuary, three gods loving at once, a monster slain by a hero;
 *   its crown is six sanctuaries standing (sanctuaries aren't monuments).
 *
 * Each has five milestones, from easy to grand, and each one names exactly
 * what it wants and how far you are ("2 of 3: Corinth, Argos"). A milestone
 * is looked at once a day and, reached, stays reached: a town line, a short
 * fanfare (the page's), a laurel on the panel and a small reward, named on
 * the panel before you reach it: a ruler's gift of coin (it comes by road or
 * sea, as their gifts do), settlers drawn by fame (newcomers come twice as
 * often for a while), or renown (every ruler warmer for a year). The last of
 * each is its great monument standing. All five reached, the ambition is
 * achieved ("Achieved in year 9"), and the city is proud of it for a year;
 * all four achieved is the grand finish, with a word from every ruler. Play
 * goes on after either.
 *
 * The milestones only read what the town already has: vassals (slice 34),
 * the army, routes, the ledger's sales, the treasury against Greece's
 * cities, homes and people, the monuments (slice 35) and the great estates
 * (slice 36, wired in at its merge) and your colonies (slice 37, wired in at
 * its merge).
 *
 * The switch: off in a bare state and while a demo's history is played (so
 * no history changes), on as a game starts or a demo opens. Switched on (and
 * in an older save, on its first tick) it records what the town has already
 * met quietly: no fanfare, no reward, marked as already met. Pure: nothing
 * here draws a random number.
 */
import { PLACES, RULED, type CityId } from '../map/greece';
import { GREAT_ESTATE } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { news, rulerGift, settleMood } from './diplomacy';
import { monumentName, monumentOf, progressOf, STAGE_COUNT, STAGES, type MonumentKind } from './monuments';
import type { SimState, WorldCity } from './state';
import { cityOf, fadeFor, moodOf, rulerName, rulerShort } from './world';
import { achieved, AMBITION_IN, AMBITIONS, laurelOf, MILESTONE_IDS, type AmbitionKind, type Laurel } from './laurels';
// Slice 61: Beloved of the gods reads the gods' moods through the groundwork's API (pantheon.ts, a leaf), the sanctuaries
// from the monuments' sites, and the monsters slain from the legends' record (no import of theirs, so no load order moves).
import { findBuilding } from './buildings';
import { GOD_IDS, GOD_MOODS, GODS, HEROES, HERO_IDS, MONSTERS, moodOfGod, type GodId } from './pantheon';
import { say } from './messages';

// ---------------------------------------------------------------------------
// The record, when an ambition was achieved and the city's pride (laurels.ts, which imports nothing but the clock).

export { achieved, AMBITION_IN, AMBITIONS, freshAmbition, GRAND_MOOD, laurelOf, MILESTONE_IDS, PRIDE_FOR, PRIDE_MOOD, prideMood, type Ambition, type AmbitionKind, type Laurel } from './laurels';

// ---------------------------------------------------------------------------
// The four ambitions and their milestones.

export const AMBITION_NAMES: Record<AmbitionKind, string> = { greece: 'Master of Greece', trade: 'The great trading city', wonders: 'A city of wonders', gods: 'Beloved of the gods' };
/** What each is about, in a line. */
export const AMBITION_WHAT: Record<AmbitionKind, string> = {
  greece: 'Vassals and colonies, and an army feared across Greece',
  trade: 'Routes, trade and the richest treasury in Greece',
  wonders: 'Monuments, grand estates and a great population',
  gods: 'Shrines to all twelve, great sanctuaries, and gods who love you',
};
/** Each ambition's great monument, its last milestone (Beloved of the gods has none: its crown is its sixth sanctuary). */
export const GREAT_MONUMENT: Partial<Record<AmbitionKind, MonumentKind>> = { greece: 'colossus', trade: 'lighthouse', wonders: 'stadium' };

/** A milestone's reward: a gift of coin from the warmest ruler, settlers drawn by fame for some months, or every ruler warmer for a year. */
export type Reward = { kind: 'gift'; dr: number } | { kind: 'fame'; months: number } | { kind: 'renown'; mood: number };

/** How far a town is towards a milestone: what it has, what it wants, and the two in words. */
export interface Progress {
  have: number;
  need: number;
  words: string;
}

export interface Milestone {
  id: string;
  ambition: AmbitionKind;
  /** Its name ("Lord of three cities") and what it wants, in a line; and the deed it honours, in words ("your rule over three cities"), for a ruler's gift and renown. */
  name: string;
  want: string;
  deed: string;
  reward: Reward;
  progress: (s: SimState) => Progress;
}

/** Master of Greece: an army of this many men under arms (two full companies). */
export const ARMY_MEN = 32;
/** Lord of this many cities (vassals and colonies together). */
export const LORD_OF = 3;
/** Feared across Greece: your army at least as big as the strongest in Greece, and at least this. */
export const FEARED_LEAST = 40;
/** The great trading city: routes to this many cities; this much sold to the ship and traders in a month; trade with this many cities (Tyre's ship counts). */
export const ROUTE_CITIES = 2;
export const MARKET_DR = 600;
export const TRADE_CITIES = 5;
/** The richest treasury: at least as much as any city of Greece holds, and at least this. */
export const RICHEST_LEAST = 10000;
/** A city of wonders: a town of this many people; this many villas; this many great estates; a great city of this many people. */
export const TOWN_PEOPLE = 300;
export const VILLAS = 20;
export const ESTATES = 2;
export const GREAT_PEOPLE = 2000;
/** Slice 61, Beloved of the gods: this many gods loving at once; this many sanctuaries standing (the ambition's crown). */
export const LOVING_GODS = 3;
export const SANCTUARIES = 6;
/** Egypt is not Greece: Memphis' army and treasury don't count against "the strongest" and "the richest in Greece". */
const NOT_GREECE: readonly CityId[] = ['memphis'];

/** Settlers drawn by fame come twice as often: the settlers' clock runs a tick more each tick (see stepAmbition). */
export const FAME_PACE = 2;
/** Renown: every ruler warmer for this long (fading). */
export const RENOWN_FADE = TICKS_PER_YEAR;
/** The town line about a laurel stands this long. */
export const LINE_DAYS = 12;

const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const cityWord = (id: CityId): string => PLACES[id]?.name ?? id;
const whose = (id: CityId): string => (cityWord(id).endsWith('s') ? `${cityWord(id)}’` : `${cityWord(id)}’s`);
const list = (names: string[]): string => (names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

/** Your men under arms, ready or away (your own companies and hirelings, not allies' companies; not the wounded). */
export function menUnderArms(s: SimState): number {
  const own = new Set(s.army.companies.filter((c) => !c.ally).map((c) => c.id));
  let n = 0;
  for (const x of s.army.soldiers) if (own.has(x.company) && (x.state === 'ready' || x.state === 'away')) n++;
  return n;
}

/** Your vassals' cities, in the order they bowed. */
export const vassalCities = (s: SimState): CityId[] => s.empire.vassals.map((v) => v.city);

/**
 * Your colonies (slice 37, wired at its merge): the colonies you hold, by
 * their names ("Nea Thasos"), in the order they were founded. One that went
 * free or was taken is no longer yours, and no longer counts.
 */
export function colonyNames(s: SimState): string[] {
  return s.empire.colonies.filter((c) => s.world.sites.some((x) => x.id === c.site && x.owner === 'home')).map((c) => c.name);
}

/** Your great estates (slice 36, wired at its merge): the estates at the great estate's level with their noble house in. */
export function greatEstates(s: SimState): number {
  return s.buildings.reduce((a, b) => a + (b.kind === 'home' && b.estate && b.level === GREAT_ESTATE && b.people > 0 ? 1 : 0), 0);
}

/** The cities of Greece whose army or treasury counts against yours: ruled, peopled, not yours, not Egypt. */
const rivalsOf = (s: SimState): WorldCity[] => s.world.cities.filter((c) => c.id !== 'home' && c.ruler && c.pop > 0 && c.lord !== 'home' && !NOT_GREECE.includes(c.id));

/** The cities you trade with: your routes' (by name), and Tyre's if her ship has called at your trading post. */
export function tradingCities(s: SimState): string[] {
  const out: string[] = [];
  for (const r of s.world.routes) if (!out.includes(cityWord(r.city))) out.push(cityWord(r.city));
  if (s.trade.ship.visits > 0 && s.buildings.some((b) => b.kind === 'trading')) out.push('Tyre (her ship)');
  return out;
}

/** What the ship and the routes' traders paid for your goods: last month, and this month so far (not the visitors at the games). */
export function salesOf(s: SimState): { last: number; now: number } {
  const sum = (lines: SimState['ledger']['now']): number => lines.reduce((a, l) => a + (l.kind === 'sales' && l.what !== 'visitors at the games' ? l.amount : 0), 0);
  return { last: sum(s.ledger.last), now: sum(s.ledger.now) };
}

const homesAt = (s: SimState, level: number): number => s.buildings.reduce((a, b) => a + (b.kind === 'home' && b.level === level ? 1 : 0), 0);

/** "2 of 3: Corinth and Argos". */
const countWords = (have: number, need: number, what: string, names: string[]): string => `${have >= need ? fmt(have) : `${fmt(have)} of ${fmt(need)}`} ${what}${names.length ? `: ${list(names)}` : ''}`;

/** A great monument's milestone: standing (finished), or how far along it is. */
function monumentProgress(s: SimState, kind: MonumentKind): Progress {
  const x = monumentOf(s, kind);
  const name = monumentName(kind, true);
  if (!x) return { have: 0, need: 1, words: `${name} is not yet marked out` };
  if (x.finished) return { have: 1, need: 1, words: `${name} stands, finished in year ${yearOf(x.finished)}` };
  // (Review of slice 39: rounded down and kept under 1, so the laurel never comes in the last days before he stands.)
  const pct = Math.min(99, Math.floor(progressOf(x) * 100));
  const st = STAGES[kind][x.stage];
  const stage = st ? `${st.name.toLowerCase()} ${x.building ? 'going up' : 'waiting for its materials'}` : '';
  return { have: pct / 100, need: 1, words: `${name}: ${pct}% built, stage ${Math.min(STAGE_COUNT, x.stage + 1)} of ${STAGE_COUNT}${stage ? `, ${stage}` : ''}` };
}


// ---------------------------------------------------------------------------
// Slice 61: Beloved of the gods, read from what the town has.

/** "Zeus, Hera and Ares". */
const godList = (gods: readonly GodId[], or = false): string => (gods.length <= 1 ? (gods[0] ? GODS[gods[0]].name : '') : `${gods.slice(0, -1).map((g) => GODS[g].name).join(', ')} ${or ? 'or' : 'and'} ${GODS[gods[gods.length - 1]].name}`);

/** The gods with a shrine given to them (not "all the gods"), in the twelve's order. */
export const godsWithShrines = (s: SimState): GodId[] => GOD_IDS.filter((g) => s.buildings.some((b) => b.kind === 'shrine' && b.god === g));

/** The town's sanctuaries: those standing (finished, their building there; a dimmed one still stands), in the order they were marked out, and those rising with how far (0 to under 1). */
export function sanctuaryState(s: SimState): { standing: GodId[]; rising: Array<{ god: GodId; share: number; stage: number }> } {
  const standing: GodId[] = [];
  const rising: Array<{ god: GodId; share: number; stage: number }> = [];
  for (const x of s.monuments.sites) {
    if (x.kind !== 'sanctuary' || !x.god) continue;
    const b = findBuilding(s, x.id);
    if (!b || b.kind !== 'sanctuary') continue;
    if (x.finished) standing.push(x.god);
    // (As a great monument's: rounded down and kept under 1, so the laurel never comes before it stands.)
    else rising.push({ god: x.god, share: Math.min(0.99, Math.floor(progressOf(x) * 100) / 100), stage: x.stage });
  }
  return { standing, rising };
}

/** The mood a god is loving from. */
const LOVING_FROM = GOD_MOODS.find((m) => m.word === 'loving')?.from ?? 60;

/** The gods loving now, and the nearest of the rest (by mood). */
export function lovingGods(s: SimState): { loving: GodId[]; next: GodId | null; mood: number } {
  const loving: GodId[] = [];
  let next: GodId | null = null;
  let mood = -Infinity;
  for (const g of GOD_IDS) {
    const m = moodOfGod(s, g);
    if (m >= LOVING_FROM) loving.push(g);
    else if (m > mood) [next, mood] = [g, m];
  }
  return { loving, next, mood: Math.round(mood) };
}

const moodShown = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `\u2212${-n}` : '0');
const word = (n: number): string => GOD_MOODS.reduce((w, m) => (n >= m.from ? m.word : w), GOD_MOODS[0].word);

/** The rising sanctuary furthest along, in words ("Apollo’s rising, 40% built, stage 2 of 3"). */
const risingWords = (r: { god: GodId; share: number; stage: number }): string => `${GODS[r.god].name}’s rising, ${Math.round(r.share * 100)}% built, stage ${Math.min(STAGE_COUNT, r.stage + 1)} of ${STAGE_COUNT}`;

/** A monster on your land, and who could slay it, for the words of a monster slain not yet. */
function monsterWords(s: SimState): string {
  const m = s.legends.monsters[0];
  if (!m) return 'none has come to your land (an angry god sends one)';
  const M = MONSTERS[m.kind];
  // (Review of slice 61: within the sentence, "the Calydonian Boar", not "The".)
  const name = M.name;
  const slayers = HERO_IDS.filter((h) => HEROES[h].slays.includes(m.kind)).map((h) => HEROES[h].name);
  const here = s.legends.heroes.find((c) => HEROES[c.hero].slays.includes(m.kind) && c.came >= 0 && c.state !== 'awaited');
  const hall = s.legends.heroes.find((c) => HEROES[c.hero].slays.includes(m.kind));
  const him = m.kind === 'medusa' ? 'her' : m.kind === 'cyclops' || m.kind === 'minotaur' || m.kind === 'talos' ? 'him' : 'it';
  const his = m.kind === 'medusa' ? 'her' : m.kind === 'cyclops' || m.kind === 'minotaur' || m.kind === 'talos' ? 'his' : 'its';
  const den = m.den === 'cave' ? 'cave' : m.den === 'marsh' ? 'marsh' : 'den';
  const who = here ? `${HEROES[here.hero].name} lives in your city and could slay ${him}` : hall ? `${HEROES[hall.hero].name}’s hall stands, waiting on ${hall.hero === 'atalanta' ? 'her' : 'his'} demands` : `only ${slayers.join(' or ')} can slay ${him}`;
  return `${name} ${m.state === 'coming' || m.state === 'settling' ? 'is coming' : `holds ${his} ${den}`}, and ${who}`;
}

/** The game's year a tick falls in, counted from the founding (year 1). */
export const yearOf = (tick: number): number => Math.floor(tick / TICKS_PER_YEAR) + 1;

export const MILESTONES: readonly Milestone[] = [
  // Master of Greece.
  {
    id: 'army',
    ambition: 'greece',
    name: 'An army under arms',
    want: `${ARMY_MEN} men under arms: two full companies`,
    deed: 'your army under arms',
    reward: { kind: 'gift', dr: 300 },
    progress: (s) => {
      const n = menUnderArms(s);
      return { have: n, need: ARMY_MEN, words: n ? `${fmt(n)} of ${ARMY_MEN} men under arms` : 'No soldiers yet: a barracks raises them' };
    },
  },
  {
    id: 'vassal',
    ambition: 'greece',
    name: 'A city bows to you',
    want: 'Your first vassal or colony',
    deed: 'a city bowing to you',
    reward: { kind: 'fame', months: 3 },
    progress: (s) => {
      const names = [...vassalCities(s).map(cityWord), ...colonyNames(s)];
      return { have: names.length, need: 1, words: names.length ? `${list(names)} ${names.length === 1 ? 'is' : 'are'} yours` : 'No vassal or colony yet: conquer, cow or buy a city' };
    },
  },
  {
    id: 'feared',
    ambition: 'greece',
    name: 'Feared across Greece',
    want: 'An army as big as the strongest in Greece',
    deed: 'your army, feared across Greece',
    reward: { kind: 'renown', mood: 5 },
    progress: (s) => {
      const n = menUnderArms(s);
      let top: WorldCity | null = null;
      for (const c of rivalsOf(s)) if (!top || c.army > top.army) top = c;
      const theirs = Math.round(top?.army ?? 0);
      const need = Math.max(FEARED_LEAST, theirs);
      const who = top ? `${whose(top.id)} ${fmt(theirs)}, the strongest in Greece` : 'no army in Greece to match';
      return { have: n, need, words: `Your army ${fmt(n)} men; ${who}${theirs < FEARED_LEAST ? ` (at least ${FEARED_LEAST} wanted)` : ''}` };
    },
  },
  {
    id: 'lord',
    ambition: 'greece',
    name: 'Lord of three cities',
    want: `${LORD_OF} vassals and colonies`,
    deed: 'your rule over three cities',
    reward: { kind: 'gift', dr: 1000 },
    progress: (s) => {
      const names = [...vassalCities(s).map(cityWord), ...colonyNames(s)];
      return { have: names.length, need: LORD_OF, words: countWords(names.length, LORD_OF, 'vassals and colonies', names) };
    },
  },
  {
    id: 'colossus',
    ambition: 'greece',
    name: 'The Colossus',
    want: 'The Colossus standing at the harbour mouth',
    deed: 'the Colossus',
    reward: { kind: 'renown', mood: 10 },
    progress: (s) => monumentProgress(s, 'colossus'),
  },
  // The great trading city.
  {
    id: 'routes',
    ambition: 'trade',
    name: 'Open for trade',
    want: `Trade routes to ${ROUTE_CITIES} cities`,
    deed: 'your trade routes',
    reward: { kind: 'gift', dr: 300 },
    progress: (s) => {
      const names: string[] = [];
      for (const r of s.world.routes) if (!names.includes(cityWord(r.city))) names.push(cityWord(r.city));
      return { have: names.length, need: ROUTE_CITIES, words: names.length ? countWords(names.length, ROUTE_CITIES, 'cities', names) : 'No route open yet: open one from a city’s page on the map of Greece' };
    },
  },
  {
    id: 'market',
    ambition: 'trade',
    name: 'A busy market',
    want: `${fmt(MARKET_DR)} dr of goods sold to the ship and traders in a month`,
    deed: 'your busy market',
    reward: { kind: 'fame', months: 3 },
    progress: (s) => {
      const { last, now } = salesOf(s);
      return { have: Math.max(last, now), need: MARKET_DR, words: `Sold ${fmt(last)} dr last month, ${fmt(now)} so far this month` };
    },
  },
  {
    id: 'cities',
    ambition: 'trade',
    name: 'Trade with half of Greece',
    want: `Trade with ${TRADE_CITIES} cities (Tyre’s ship counts)`,
    deed: 'your trade with half of Greece',
    reward: { kind: 'renown', mood: 5 },
    progress: (s) => {
      const names = tradingCities(s);
      return { have: names.length, need: TRADE_CITIES, words: names.length ? countWords(names.length, TRADE_CITIES, 'cities', names) : 'No trade yet' };
    },
  },
  {
    id: 'treasury',
    ambition: 'trade',
    name: 'The richest treasury in Greece',
    want: 'More drachmas than any city of Greece holds',
    deed: 'your treasury, the richest in Greece',
    reward: { kind: 'fame', months: 6 },
    progress: (s) => {
      let top: WorldCity | null = null;
      for (const c of rivalsOf(s)) if (!top || c.wealth > top.wealth) top = c;
      const theirs = Math.round(top?.wealth ?? 0);
      const need = Math.max(RICHEST_LEAST, theirs);
      return { have: Math.max(0, s.money), need, words: `Your treasury ${fmt(s.money)} dr; ${top ? `${whose(top.id)} ${fmt(theirs)}, the richest in Greece` : 'no treasury in Greece to match'}` };
    },
  },
  {
    id: 'lighthouse',
    ambition: 'trade',
    name: 'The Lighthouse',
    want: 'The Lighthouse burning on its headland',
    deed: 'the Lighthouse',
    reward: { kind: 'renown', mood: 10 },
    progress: (s) => monumentProgress(s, 'lighthouse'),
  },
  // A city of wonders.
  {
    id: 'town',
    ambition: 'wonders',
    name: 'A thriving town',
    want: `${fmt(TOWN_PEOPLE)} people`,
    deed: 'your thriving town',
    reward: { kind: 'gift', dr: 300 },
    progress: (s) => ({ have: s.population, need: TOWN_PEOPLE, words: `${fmt(s.population)} of ${fmt(TOWN_PEOPLE)} people` }),
  },
  {
    id: 'villas',
    ambition: 'wonders',
    name: 'Streets of villas',
    want: `${VILLAS} villas`,
    deed: 'your streets of villas',
    reward: { kind: 'fame', months: 3 },
    progress: (s) => {
      const n = homesAt(s, 6);
      return { have: n, need: VILLAS, words: n >= VILLAS ? `${fmt(n)} villas` : `${fmt(n)} of ${VILLAS} villas` };
    },
  },
  {
    id: 'estates',
    ambition: 'wonders',
    name: 'Grand estates',
    want: `${ESTATES} great estates`,
    deed: 'your grand estates',
    reward: { kind: 'renown', mood: 5 },
    progress: (s) => {
      const n = greatEstates(s);
      return { have: n, need: ESTATES, words: `${fmt(Math.min(n, ESTATES))} of ${ESTATES} great estates` };
    },
  },
  {
    id: 'great',
    ambition: 'wonders',
    name: 'A great city',
    want: `${fmt(GREAT_PEOPLE)} people`,
    deed: 'your great city',
    reward: { kind: 'gift', dr: 1000 },
    progress: (s) => ({ have: s.population, need: GREAT_PEOPLE, words: `${fmt(s.population)} of ${fmt(GREAT_PEOPLE)} people` }),
  },
  {
    id: 'stadium',
    ambition: 'wonders',
    name: 'The Stadium',
    want: 'The Stadium finished, its games to come',
    deed: 'the Stadium',
    reward: { kind: 'fame', months: 6 },
    progress: (s) => monumentProgress(s, 'stadium'),
  },
  // Slice 61: Beloved of the gods.
  {
    id: 'shrines',
    ambition: 'gods',
    name: 'A shrine to every god',
    want: 'A shrine given to each of the twelve',
    deed: 'your shrines to all twelve gods',
    reward: { kind: 'gift', dr: 300 },
    progress: (s) => {
      const have = godsWithShrines(s);
      const none = GOD_IDS.filter((g) => !have.includes(g));
      const n = have.length;
      return { have: n, need: GOD_IDS.length, words: n >= GOD_IDS.length ? 'A shrine to each of the twelve' : n === 0 ? 'No shrine given to a god yet: a shrine’s panel asks whom it serves' : `Shrines to ${n} of the twelve: none yet to ${godList(none, true)}` };
    },
  },
  {
    id: 'sanctuary',
    ambition: 'gods',
    name: 'A first sanctuary',
    want: 'A great sanctuary finished and standing',
    deed: 'your first sanctuary',
    reward: { kind: 'fame', months: 3 },
    progress: (s) => {
      const { standing, rising } = sanctuaryState(s);
      if (standing.length) return { have: 1, need: 1, words: `The sanctuary to ${GODS[standing[0]].name} stands` };
      const best = rising.sort((a, b) => b.share - a.share)[0];
      if (!best) return { have: 0, need: 1, words: 'No sanctuary yet: mark one out from the Mythology tab' };
      return { have: best.share, need: 1, words: `The sanctuary to ${GODS[best.god].name}: ${Math.round(best.share * 100)}% built, stage ${Math.min(STAGE_COUNT, best.stage + 1)} of ${STAGE_COUNT}` };
    },
  },
  {
    id: 'loving',
    ambition: 'gods',
    name: 'Loved on Olympus',
    want: `${LOVING_GODS} gods loving your city at once`,
    deed: 'the gods’ love for your city',
    reward: { kind: 'renown', mood: 5 },
    progress: (s) => {
      const { loving, next, mood } = lovingGods(s);
      const n = loving.length;
      const near = n < LOVING_GODS && next ? `; ${GODS[next].name} nearest, ${word(mood)} (${moodShown(mood)} of +${LOVING_FROM})` : '';
      return { have: Math.min(n, LOVING_GODS), need: LOVING_GODS, words: n === 0 ? `No god loves your city yet${near}` : `${n >= LOVING_GODS ? fmt(n) : `${n} of ${LOVING_GODS}`} gods loving: ${godList(loving)}${near}` };
    },
  },
  {
    id: 'slain',
    ambition: 'gods',
    name: 'A monster slain',
    want: 'A monster on your land slain by a hero',
    deed: 'the monster your hero slew',
    reward: { kind: 'gift', dr: 1000 },
    progress: (s) => {
      const d = s.legends.slain[0];
      if (d) return { have: 1, need: 1, words: `${MONSTERS[d.kind].name[0].toUpperCase()}${MONSTERS[d.kind].name.slice(1)} slain by ${d.by} in year ${yearOf(d.tick)}` };
      return { have: 0, need: 1, words: `No monster slain yet: ${monsterWords(s)}` };
    },
  },
  {
    id: 'sanctuaries',
    ambition: 'gods',
    name: 'Six sanctuaries',
    want: `${SANCTUARIES} great sanctuaries standing, the crown of the gods’ city`,
    deed: 'your six sanctuaries',
    reward: { kind: 'renown', mood: 10 },
    progress: (s) => {
      const { standing, rising } = sanctuaryState(s);
      const n = standing.length;
      if (n >= SANCTUARIES) return { have: n, need: SANCTUARIES, words: `${fmt(n)} sanctuaries standing: ${godList(standing)}` };
      const up = rising.sort((a, b) => b.share - a.share).slice(0, SANCTUARIES - n);
      const part = up.reduce((a, r) => a + r.share, 0);
      const now = n ? `${n} of ${SANCTUARIES} sanctuaries standing: ${godList(standing)}` : `No sanctuary standing yet`;
      return { have: n + Math.min(SANCTUARIES - n - 0.01, part), need: SANCTUARIES, words: `${now}${up.length ? `; ${up.map(risingWords).join('; ')}` : ''}` };
    },
  },
];

export const milestoneOf = (id: string): Milestone | undefined => MILESTONES.find((m) => m.id === id);
export const milestonesOf = (k: AmbitionKind): Milestone[] => MILESTONE_IDS[k].map((id) => MILESTONES.find((m) => m.id === id)!);
/** A milestone's place in its ambition (1 to 5). */
export const placeOf = (m: Milestone): number => milestonesOf(m.ambition).indexOf(m) + 1;

/** Is it met now? */
export const met = (p: Progress): boolean => p.have >= p.need;
/** How far towards it, 0 to 1. */
export const shareOf = (p: Progress): number => (p.need > 0 ? Math.max(0, Math.min(1, p.have / p.need)) : 1);


/** A reward in words, before it is given: "a gift of 300 dr from the warmest ruler". */
export function rewardWords(r: Reward): string {
  if (r.kind === 'gift') return `a gift of ${fmt(r.dr)} dr from the warmest ruler`;
  if (r.kind === 'fame') return `settlers drawn by fame: newcomers come twice as often for ${r.months} months`;
  return `every ruler ${r.mood} warmer, fading over a year`;
}

// ---------------------------------------------------------------------------
// Reaching them.

/** The ruler who sends a milestone's gift: the warmest (ties: the first in Greece's order). */
function warmest(s: SimState): WorldCity | null {
  let best: WorldCity | null = null;
  let bm = -Infinity;
  for (const id of RULED) {
    const c = cityOf(s.world, id);
    if (!c.ruler || c.pop <= 0) continue;
    const m = moodOf(c, s.tick);
    if (m > bm) {
      bm = m;
      best = c;
    }
  }
  return best;
}

/** Give a milestone's reward, and say what it came to. */
function give(s: SimState, m: Milestone): string {
  const r = m.reward;
  const what = m.deed;
  if (r.kind === 'gift') {
    const c = warmest(s);
    if (!c) return '';
    rulerGift(s, c, -1, r.dr, `in honour of ${what}`);
    return `${rulerName(c)} sends ${fmt(r.dr)} dr in honour of it`;
  }
  if (r.kind === 'fame') {
    s.ambition.fameUntil = Math.max(s.ambition.fameUntil, s.tick) + r.months * TICKS_PER_MONTH;
    return `settlers drawn by its fame come twice as often for ${r.months} months`;
  }
  for (const id of RULED) {
    const c = cityOf(s.world, id);
    if (!c.ruler || c.pop <= 0) continue;
    c.memories.push({ kind: 'renown', why: `Your city’s renown: ${what}`, amount: r.mood, tick: s.tick, fade: fadeFor(c, RENOWN_FADE, true) });
    const line = settleMood(s, c, `your city’s renown (${what})`);
    if (line) news(s.world, s.tick, c.id, line);
  }
  return `every ruler in Greece is ${r.mood} warmer for it`;
}

/** What each ruler says at the grand finish, by how they feel. */
function grandWords(s: SimState, c: WorldCity): string {
  const town = s.world.name;
  const mood = moodOf(c, s.tick);
  const t = c.ruler?.traits ?? [];
  if (mood >= 30) return `${rulerShort(c)} raises a cup to ${town}: “master of Greece, its greatest market and its wonder, beloved of the gods, and our friend”`;
  // (Slice 61: a pious ruler speaks of the gods.)
  if (t.includes('pious')) return `${rulerShort(c)} bows towards ${town}: “the gods themselves walk its streets, and its sanctuaries shine across the sea”`;
  if (t.includes('proud') || mood <= -30) return `${rulerShort(c)} grudges it, but owns it: “there is no city in Greece like ${town} now”`;
  if (t.includes('warlike')) return `${rulerShort(c)} salutes ${town}: “its army is feared, its ships are everywhere, and its Colossus looks down on us all”`;
  if (t.includes('greedy') || t.includes('shrewd')) return `${rulerShort(c)} counts it up: “${town} holds the richest treasury and the busiest quays in Greece”`;
  return `${rulerShort(c)} sends word: “all Greece speaks of ${town}, its Colossus, its Lighthouse and its games”`;
}

/**
 * Look at the town: record each milestone met, quietly or with its reward, and an ambition or all four achieved.
 * `only` (slice 61): look at these ambitions alone (quietly), for a record that had not known them.
 */
function look(s: SimState, quiet: boolean, only?: readonly AmbitionKind[]): void {
  const a = s.ambition;
  const done = new Set(a.reached.map((l) => l.id));
  const before = AMBITIONS.filter((k) => achieved(s, k).tick > 0);
  for (const m of MILESTONES) {
    if (done.has(m.id) || (only && !only.includes(m.ambition)) || !met(m.progress(s))) continue;
    a.reached.push({ id: m.id, tick: s.tick, quiet, note: quiet ? '' : give(s, m) });
    s.rev++;
  }
  // (Slice 61: a quiet look has looked at every ambition.)
  if (quiet) a.known = [...AMBITIONS];
  if (quiet) {
    if (!a.grand && AMBITIONS.every((k) => achieved(s, k).tick > 0)) {
      a.grand = s.tick;
      a.grandQuiet = true;
    }
    return;
  }
  for (const k of AMBITIONS) {
    if (before.includes(k) || achieved(s, k).tick === 0) continue;
    const c = warmest(s);
    if (c) news(s.world, s.tick, c.id, `${rulerName(c)}: all Greece calls ${s.world.name} ${AMBITION_IN[k]} now`);
  }
  if (!a.grand && AMBITIONS.every((k) => achieved(s, k).tick > 0)) {
    a.grand = s.tick;
    a.grandQuiet = false;
    // The grand finish: a word from every ruler.
    for (const id of RULED) {
      const c = cityOf(s.world, id);
      if (!c.ruler || c.pop <= 0) continue;
      news(s.world, s.tick, c.id, grandWords(s, c));
    }
  }
}

/** Switch ambitions on or off (a command). Switched on, it records at once what the town has already met, quietly. */
export function setAmbition(s: SimState, on: boolean): void {
  const a = s.ambition;
  if (a.on === on) return;
  a.on = on;
  if (on) {
    a.looked = true;
    look(s, true);
  }
}

/** Once a tick: settlers drawn by fame; once a day, the milestones (nothing with the switch off). */
export function stepAmbition(s: SimState): void {
  const a = s.ambition;
  if (!a.on) return;
  // An older save, or a town switched on without a look: what it already has is recorded quietly.
  if (!a.looked) {
    a.looked = true;
    look(s, true);
    return;
  }
  // Slice 61: a record from before an ambition was added (Beloved of the gods) looks at it quietly, and says so once.
  if (a.known.length < AMBITIONS.length) {
    meetNew(s);
    return;
  }
  // Fame: the settlers' clock runs FAME_PACE times as fast (never past its next look).
  if (a.fameUntil > s.tick && s.settlerClock > 1) s.settlerClock -= FAME_PACE - 1;
  if (s.tick % TICKS_PER_DAY === 0) look(s, false);
}

/**
 * Slice 61: the ambitions a record has not looked at (an older save's: Beloved of the gods), looked at quietly
 * (what the town already meets recorded with no reward and no fanfare), and one message saying so.
 */
function meetNew(s: SimState): void {
  const a = s.ambition;
  const fresh = AMBITIONS.filter((k) => !a.known.includes(k));
  const had = new Set(a.reached.map((l) => l.id));
  look(s, true, fresh);
  for (const k of fresh) {
    const got = milestonesOf(k).filter((m) => !had.has(m.id) && laurelOf(s, m.id));
    const all = got.length === milestonesOf(k).length;
    const words = got.length
      ? `A new ambition beside the other three: ${AMBITION_NAMES[k]}. Your city already has ${all ? 'all five' : `${got.length} of its 5`} milestones (${list(got.map((m) => m.name.toLowerCase()))})${all ? ': achieved' : ''}. The laurel in the top bar shows the rest.`
      : `A new ambition beside the other three: ${AMBITION_NAMES[k]}, ${AMBITION_WHAT[k][0].toLowerCase()}${AMBITION_WHAT[k].slice(1)}. The laurel in the top bar shows how near you are.`;
    say(s, { kind: 'laurel', title: `A fourth ambition: ${AMBITION_NAMES[k]}`, words });
  }
}

// ---------------------------------------------------------------------------
// What the panel, the chip and the town line say.

/** A milestone as the panel shows it. */
export interface MilestoneView {
  id: string;
  place: number;
  name: string;
  want: string;
  reward: string;
  /** Reached: when, already met when opened, and what its reward came to. */
  reached: number;
  quiet: boolean;
  note: string;
  /** Not yet: how far, in words and as a share. */
  words: string;
  share: number;
  /** Is it the great monument? */
  monument: boolean;
}

/** An ambition as the panel shows it. */
export interface AmbitionView {
  kind: AmbitionKind;
  name: string;
  what: string;
  /** Achieved: when (0: not yet), and whether it was already when the town was opened. */
  achieved: number;
  quiet: boolean;
  count: number;
  milestones: MilestoneView[];
}

/** The four side by side, for the panel. */
export function ambitionView(s: SimState): AmbitionView[] {
  return AMBITIONS.map((k) => {
    const milestones = milestonesOf(k).map((m, i): MilestoneView => {
      const l = laurelOf(s, m.id);
      const p = m.progress(s);
      return { id: m.id, place: i + 1, name: m.name, want: m.want, reward: rewardWords(m.reward), reached: l?.tick ?? 0, quiet: l?.quiet ?? false, note: l?.note ?? '', words: p.words, share: l ? 1 : shareOf(p), monument: i === 4 };
    });
    const a = achieved(s, k);
    return { kind: k, name: AMBITION_NAMES[k], what: AMBITION_WHAT[k], achieved: a.tick, quiet: a.quiet, count: milestones.filter((m) => m.reached).length, milestones };
  });
}

/** Which ambition the chip offers first when two are as far along (phase 5 review: not an army for a town of tents). */
const FIRST: Record<AmbitionKind, number> = { wonders: 0, trade: 1, greece: 2, gods: 3 };

/**
 * The nearest milestone not yet reached, across all four: each ambition's
 * next one (its lowest not yet reached), and of those the furthest
 * along (ties: wonders, trade, Greece; phase 5 review: it was Greece first,
 * so a town of tents was offered an army under arms). Null once all are reached. (Slice 40:
 * it was the furthest along of all fifteen, so a new town's chip named the
 * richest treasury in Greece, a quarter of the way there with its first
 * 5,000 dr, ahead of open for trade.)
 */
export function nearest(s: SimState): { m: Milestone; p: Progress; share: number } | null {
  let best: { m: Milestone; p: Progress; share: number } | null = null;
  const next = new Set<AmbitionKind>();
  for (const m of MILESTONES) {
    if (laurelOf(s, m.id) || next.has(m.ambition)) continue;
    next.add(m.ambition);
    const p = m.progress(s);
    const share = shareOf(p);
    // (Even, as at the founding when nothing is begun: the town's own ambition first, then trade, then Greece.)
    if (!best || share > best.share + 1e-9 || (share > best.share - 1e-9 && FIRST[m.ambition] < FIRST[best.m.ambition])) best = { m, p, share };
  }
  return best;
}

/** The laurels in all, and how many there are. */
export const laurelCount = (s: SimState): number => s.ambition.reached.length;
export const MILESTONE_COUNT = MILESTONES.length;

/**
 * The town line for the newest laurel (not one already met when the town
 * was opened), for LINE_DAYS days: what it was, for which ambition, and its
 * reward; an ambition achieved, or all four.
 */
export function ambitionTownLine(s: SimState): string {
  const a = s.ambition;
  if (!a.on) return '';
  // (Review of slice 61: a save from before, opened just after its grand finish with three, keeps its old words.)
  if (a.grand && !a.grandQuiet && s.tick - a.grand < LINE_DAYS * TICKS_PER_DAY) {
    return achieved(s, 'gods').tick > 0
      ? `All four ambitions achieved: ${s.world.name} is master of Greece, its greatest market, its wonder and beloved of the gods. Every ruler sends word, and the city celebrates. Play on as long as you like.`
      : `All three ambitions achieved: ${s.world.name} is master of Greece, its greatest market and its wonder. Every ruler sends word, and the city celebrates. Play on as long as you like.`;
  }
  let last: Laurel | undefined;
  for (const l of a.reached) if (!l.quiet && (!last || l.tick >= last.tick)) last = l;
  if (!last || s.tick - last.tick >= LINE_DAYS * TICKS_PER_DAY) return '';
  const m = milestoneOf(last.id);
  if (!m) return '';
  const k = m.ambition;
  const done = achieved(s, k);
  if (done.tick === last.tick && !done.quiet) return `${AMBITION_NAMES[k]}: achieved in year ${yearOf(done.tick)}, with ${m.deed}${last.note ? `; ${last.note}` : ''}. The other ambitions carry on.`;
  const count = milestonesOf(k).filter((x) => laurelOf(s, x.id)).length;
  return `A laurel for ${AMBITION_IN[k]} (${count} of 5): ${m.name[0].toLowerCase()}${m.name.slice(1)}${last.note ? `. ${last.note[0].toUpperCase()}${last.note.slice(1)}` : ''}.`;
}

/** Fame drawing settlers, for the population's tooltip ('' none). */
export function fameWords(s: SimState): string {
  const a = s.ambition;
  if (!a.on || a.fameUntil <= s.tick) return '';
  const days = Math.ceil((a.fameUntil - s.tick) / TICKS_PER_DAY);
  return `Your city’s fame draws settlers: newcomers come twice as often for ${days} more days.`;
}

/**
 * Slice 61: one ambition in a line, for Olympus and the overview's Gods page:
 * its laurels, and its next milestone with how far ("Beloved of the gods: 2 of
 * 5 laurels. Next, loved on Olympus (2 of 3 gods loving: …)"). '' with the
 * ambitions off.
 */
export function ambitionLine(s: SimState, k: AmbitionKind): string {
  if (!s.ambition.on) return '';
  const ms = milestonesOf(k);
  const won = ms.filter((m) => laurelOf(s, m.id)).length;
  const a = achieved(s, k);
  if (a.tick) return `${AMBITION_NAMES[k]}: achieved in year ${yearOf(a.tick)}, all 5 laurels won.`;
  const next = ms.find((m) => !laurelOf(s, m.id));
  if (!next) return '';
  const w = next.progress(s).words;
  return `${AMBITION_NAMES[k]}: ${won} of 5 laurels. Next, ${next.name[0].toLowerCase()}${next.name.slice(1)} (${w[0].toLowerCase()}${w.slice(1)}).`;
}
