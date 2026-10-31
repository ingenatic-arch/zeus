/**
 * Slice 60: gods in war, on both sides, in your streets. The gods' figures
 * are slice 56's (epiphany.ts keeps them in `gods.walks.figures`, the
 * renderer draws them); a god at war is one of them with `why` 'champion'
 * or 'foe', moved here instead of there. What only war needs lives in
 * `gods.war` (pantheon.ts's field, these types).
 *
 * - **Your champion.** While invaders are on your map (a war band, a landing
 *   or the ships bringing it, a lender's army), a god who loves you and whose
 *   sanctuary stands finished can be called (the `callgod` command, from the
 *   Army tab, or a sanctuary's panel at slice 54's merge), once a year each.
 *   They rise beside the danger with their flourish (in a day, not a visit's
 *   three), walk to the raiders over everything and strike, each their own
 *   way (STYLES): Ares and Athena hand to hand, hardest; Zeus lightning from
 *   afar; Poseidon a wave (and at a landing, at the ships sailing in);
 *   Apollo and Artemis arrows; Hephaestus fire; Hera blinding light; Demeter
 *   the earth heaving under them; Dionysus madness. Aphrodite and Hermes
 *   don't fight: they break the raiders' nerve (those near them lay down the
 *   fight a while, and the band breaks after a few such days). A band with a
 *   champion upon it breaks once a third of its men have fallen, not half.
 *   The raiders can't hurt a god (they never go for one). A champion stays
 *   until the band breaks or leaves, or WAR_STAY at most, and leaves where
 *   they stand.
 * - **Their champion.** A rival city's patron god (pantheon.ts `patronOf`)
 *   who is angry or furious with you marches with that city's band: decided
 *   once a day while the threat stands, the band gathers or marches, and
 *   always said first (an alarm naming the god and why; the band's chip and
 *   line say so). A god who cools past angry before the band reaches you
 *   stays home, and that is said too. On your map the god rises among the
 *   band and walks with it, striking your soldiers (heavy blows, each their
 *   own way) and setting buildings alight. Your soldiers can't hurt a god:
 *   holding out until the band breaks (or turning it, or paying it off)
 *   sends the god home with it.
 * - **Gods fight gods.** A champion called while an enemy god is on your map
 *   goes for the god first. The two fight in the street for DUEL_TICKS (great
 *   blows, sparks), then the weaker withdraws: your god's love for you
 *   (their mood) against the enemy god's anger (minus theirs), a tie to the
 *   defender, yours. Beaten, the enemy god leaves and their band breaks;
 *   beaten, your god leaves and the enemy god fights on.
 *
 * Nothing here moves with the gods switched off (so no demo's history has a
 * god at war), and nothing runs while no god is at war and no threat stands.
 * Pure: no random numbers at all; sums through dmath. Moods only through the
 * groundwork's API (moodOfGod, reasonsOf, moodRank, moodWord).
 */
import type { CoastMap } from '../map/bake';
import { datan2, dhypot } from '../map/dmath';
import { districtAt, districtTitle } from '../map/districts';
import { PLACES, type CityId } from '../map/greece';
import { breakNow } from './battle';
import { centreOf } from './buildings';
import { dateOfTick, formatYear, TICKS_PER_DAY, TICKS_PER_YEAR } from './clock';
import { atWar, middleOf, onLand, shoreNear, WAR_ARRIVE, WAR_LEAVE, type GodFigure, type WalkState } from './epiphany';
import { burnable, FIRE_BURNING, ignite } from './hazards';
import { mapOf } from '../map/lands';
import { ALARM, NEWS, say, WARNING } from './messages';
import { GODS, goddess, GOD_IDS, moodOfGod, moodRank, moodWord, noticed, patronOf, reasonsOf, type GodId } from './pantheon';
import { bandMen, live, raidersOf } from './raids';
import type { Building, Raid, SimState } from './state';
import { position } from './walk';
import { sanctuaryDone } from './sanctuaries';

// ---------------------------------------------------------------------------
// The state (in `gods.war`: see pantheon.ts).

/** A rival's patron god marching with that city's band (from the day it is said; `figure` 0 until the band is on your map). */
export interface GodMarch {
  raid: number;
  god: GodId;
  /** The god's figure in your city (0: the band hasn't reached you yet). */
  figure: number;
  /** When it was said. */
  since: number;
  /** Ticks until the god strikes again; when they last set a building alight. */
  cool: number;
  lastFire: number;
  /** Buildings set alight, your soldiers struck down (killed or wounded). */
  fires: number;
  felled: number;
}

/** A god who loves you, called to fight for you. */
export interface Champion {
  figure: number;
  god: GodId;
  /** Ticks until they strike again. */
  cool: number;
  /** Raiders struck down, ships struck; how many times they have shaken the raiders' nerve. */
  felled: number;
  ships: number;
  nerve: number;
}

/** Two gods fighting in your streets: your champion's figure (`a`) and the enemy god's (`b`). */
export interface Duel {
  a: number;
  b: number;
  since: number;
  ends: number;
}

/** How a god strikes (the renderer draws each its own way). `clash`: two gods' blows; `burn`: a building set alight. */
export type StrikeKind = 'spear' | 'bolt' | 'wave' | 'arrow' | 'fire' | 'light' | 'earth' | 'madness' | 'nerve' | 'clash' | 'burn';

/** One blow, kept a few days for the renderer (and for the mourning words: who a fallen soldier fell to). */
export interface Strike {
  id: number;
  t: number;
  god: GodId;
  kind: StrikeKind;
  /** From the god, to where it lands. */
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** Your soldiers it struck (by id), and a ship (0 none). */
  men: number[];
  ship: number;
}

/** Gods in war (`gods.war`). */
export interface Wars {
  marches: GodMarch[];
  champions: Champion[];
  duel: Duel | null;
  /** When each god last came to fight for you, by god. */
  called: Partial<Record<GodId, number>>;
  strikes: Strike[];
  next: number;
}

// ---------------------------------------------------------------------------
// The numbers (to tune by eye).

/** A god at war's pace (tiles a tick): a stride quicker than a visit's, the battle won't wait. */
export const WAR_PACE = 0.24;
/** A god marching with a band keeps up with it, at up to this pace. */
export const MARCH_PACE = 0.32;
/** The longest a champion stays. */
export const WAR_STAY = 10 * TICKS_PER_DAY;
/** A god answers a call to war at most once in this long. */
export const CALL_GAP = TICKS_PER_YEAR;
/** How long two gods fight, and how near they stand. */
export const DUEL_TICKS = 4 * TICKS_PER_DAY;
export const DUEL_GAP = 2;
/** A band with a champion upon it (within this many tiles) breaks once this share of its men have fallen (not half). */
export const NEAR_BAND = 10;
export const BREAK_SHARE = 1 / 3;
/** A band whose nerve has been shaken this many times breaks. */
export const NERVE_BREAK = 5;
/** How long a raider shaken by a god lays down the fight. */
export const SHAKEN = 50;
/** An enemy god's blows on your soldiers: this share of their blow on raiders, this much slower. */
export const FOE_HURT = 0.7;
export const FOE_SLOWER = 1.6;
/** An enemy god sets a building within this many tiles alight, at most once in this long, at most this many. */
export const BURN_REACH = 2.6;
export const BURN_GAP = 2 * TICKS_PER_DAY;
export const BURN_MOST = 4;
/** Blows are kept this long (the renderer's effects, and who a man fell to). */
const STRIKE_KEEP = 3 * TICKS_PER_DAY;
/** How far beside their band an enemy god walks. */
const BESIDE = 1.4;
/** How far onto your map (tiles) a band's middle comes before its god rises among it. */
const RISE_IN = 3;
/** How far from the danger a champion rises, towards the town. */
const RISE_OFF = 3.5;
/** How much a ship's hull a wave or a bolt takes. */
const SHIP_HURT = 55;

/** How each god fights: their blow, reach (tiles), the ticks between blows, how hard (a raider has 100), how wide it lands and how many it strikes at most, whether it shakes their nerve, whether it reaches ships at sea; and in words. */
export interface Style {
  kind: StrikeKind;
  range: number;
  every: number;
  hurt: number;
  area: number;
  /** The most men one blow strikes. */
  most: number;
  nerve: boolean;
  ships: boolean;
  /** "fights hand to hand with her spear and aegis". */
  words: string;
}

export const STYLES: Record<GodId, Style> = {
  zeus: { kind: 'bolt', range: 12, every: 12, hurt: 140, area: 1.3, most: 3, nerve: false, ships: true, words: 'throws lightning from the sky' },
  hera: { kind: 'light', range: 8, every: 10, hurt: 100, area: 0.6, most: 2, nerve: false, ships: false, words: 'strikes with a blinding light' },
  poseidon: { kind: 'wave', range: 9, every: 22, hurt: 100, area: 2.2, most: 4, nerve: false, ships: true, words: 'sends a wave over them, and at the ships' },
  demeter: { kind: 'earth', range: 7, every: 14, hurt: 100, area: 1.6, most: 3, nerve: false, ships: false, words: 'heaves the earth up under them' },
  athena: { kind: 'spear', range: 2.4, every: 5, hurt: 150, area: 0.9, most: 2, nerve: false, ships: false, words: 'fights hand to hand with her spear and aegis' },
  apollo: { kind: 'arrow', range: 10, every: 6, hurt: 120, area: 0, most: 1, nerve: false, ships: false, words: 'shoots his golden arrows' },
  artemis: { kind: 'arrow', range: 10, every: 5, hurt: 120, area: 0, most: 1, nerve: false, ships: false, words: 'shoots her silver arrows' },
  ares: { kind: 'spear', range: 2.4, every: 4, hurt: 160, area: 0.9, most: 2, nerve: false, ships: false, words: 'fights hand to hand with his spear' },
  aphrodite: { kind: 'nerve', range: 6, every: 12, hurt: 0, area: 5, most: 0, nerve: true, ships: false, words: 'doesn’t fight, but breaks their nerve: those near her lay down the fight' },
  hephaestus: { kind: 'fire', range: 7, every: 12, hurt: 100, area: 1.3, most: 3, nerve: false, ships: false, words: 'hurls fire from his forge' },
  hermes: { kind: 'nerve', range: 6, every: 12, hurt: 0, area: 5, most: 0, nerve: true, ships: false, words: 'doesn’t fight, but tricks and frightens them: those near him lose the will to fight' },
  dionysus: { kind: 'madness', range: 6, every: 14, hurt: 45, area: 1.6, most: 2, nerve: true, ships: false, words: 'drives them mad, so they strike at each other' },
};
/** A god who breaks nerve instead of fighting, marching against you, still unsettles your men: this much of a blow. */
const NERVE_FOE_HURT = 30;

// ---------------------------------------------------------------------------
// Words.

const she = (g: GodId): string => (goddess(g) ? 'she' : 'he');
const her = (g: GodId): string => (goddess(g) ? 'her' : 'his');
const cap = (t: string): string => (t ? t[0].toUpperCase() + t.slice(1) : t);
const cityName = (c: CityId): string => PLACES[c].name;
const whose = (c: CityId): string => (cityName(c).endsWith('s') ? `${cityName(c)}’` : `${cityName(c)}’s`);
const dayWords = (tick: number): string => {
  const d = dateOfTick(tick);
  return `${d.day} ${d.monthName} ${formatYear(d.yearBC)}`;
};
const bandWord = (r: Raid): string => (r.loan ? 'army' : 'raiders');

/** Why a god is angry with you, in words, from their reasons: "you paid tribute to Athens; you honoured Hephaestus, his rival" ('' with none). */
export function angerWhy(s: SimState, g: GodId): string {
  return reasonsOf(s, g)
    .filter((r) => r.worth < 0)
    .slice(0, 2)
    .map((r) => r.why)
    .join('; ');
}

/** Why a god loves you, in words, from their weightiest reason ('' with none). */
export function loveWhy(s: SimState, g: GodId): string {
  return reasonsOf(s, g).find((r) => r.worth > 0)?.why ?? '';
}

/** "Ares is furious with you: you paid tribute to Athens". */
export function angerWords(s: SimState, g: GodId): string {
  const why = angerWhy(s, g);
  return `${GODS[g].name} is ${moodWord(moodOfGod(s, g))} with you${why ? `: ${why}` : ''}`;
}

/** Is a god angry or furious with you? */
export const angry = (s: SimState, g: GodId): boolean => moodRank(moodOfGod(s, g)) <= 1;
/** Does a god love you? */
export const loving = (s: SimState, g: GodId): boolean => moodRank(moodOfGod(s, g)) >= 6;

// ---------------------------------------------------------------------------
// Reading the war (the exports the panels, the Army tab and other lines read).

const warOf = (s: SimState): Wars => s.gods.war;

/** The god marching with a raid's band, if any. */
export const marchOf = (s: SimState, raid: number): GodMarch | undefined => warOf(s).marches.find((m) => m.raid === raid);
/** A champion by their figure's id. */
export const championOf = (s: SimState, figure: number): Champion | undefined => warOf(s).champions.find((c) => c.figure === figure);
/** A march by its god's figure's id. */
export const marchByFigure = (s: SimState, figure: number): GodMarch | undefined => (figure ? warOf(s).marches.find((m) => m.figure === figure) : undefined);
const raidOf = (s: SimState, id: number): Raid | undefined => s.world.raids.find((r) => r.id === id);
const figure = (s: SimState, id: number): GodFigure | undefined => (id ? s.gods.walks.figures.find((f) => f.id === id) : undefined);

/** The bands on your map now (on land or, from the sea, still in their ships), not yet broken. */
export function invaders(s: SimState): Raid[] {
  return s.world.raids.filter((r) => r.phase === 'raiding' && !r.broke && (!!raidersOf(s, r) || sailingIn(s, r)));
}
/** Ships of a band sailing in for your beach, not landed yet. */
const sailingIn = (s: SimState, r: Raid): boolean => r.shore >= 0 && r.landed === 0 && s.fleet.ships.some((e) => e.raid === r.id && e.state === 'sailing' && e.hp > 0);

/** Is this god's sanctuary finished and standing? (Slice 54's `sanctuaryDone`, merged into this line before this slice's check-in.) */
export function sanctuaryStands(s: SimState, god: GodId): boolean {
  return sanctuaryDone(s, god);
}

/** Why a god can't be called to fight for you now, or '' if they can. */
export function callRefusal(s: SimState, god: GodId): string {
  if (!GOD_IDS.includes(god)) return 'There is no such god';
  const g = GODS[god];
  if (!s.gods.on) return 'The gods are not watching';
  if (warOf(s).champions.some((c) => c.god === god)) return `${g.name} is fighting for you already`;
  if (warOf(s).marches.some((m) => m.god === god && m.figure)) return `${g.name} marches against you`;
  const came = warOf(s).called[god];
  if (came !== undefined && s.tick - came < CALL_GAP) return `${g.name} fought for you on ${dayWords(came)}: ${she(god)} will answer again from ${dayWords(came + CALL_GAP)}`;
  const mood = moodOfGod(s, god);
  if (moodRank(mood) < 6) return `${g.name} is only ${moodWord(mood)} towards you: only a god who loves you answers a call to war`;
  if (!sanctuaryStands(s, god)) return `${g.name} loves you, but has no finished sanctuary in your city to answer from`;
  if (!invaders(s).length) return 'No invaders are on your land to fight';
  return '';
}

/** The gods who could be called now, and why each of the others can't. */
export function callable(s: SimState): Array<{ god: GodId; why: string }> {
  return GOD_IDS.map((god) => ({ god, why: callRefusal(s, god) }));
}

// ---------------------------------------------------------------------------
// Calling a champion.

/** Where a band is now: its men's middle (those on their feet), else its walker's place, else its ships'. */
function bandAt(s: SimState, r: Raid): [number, number] | null {
  let x = 0;
  let z = 0;
  let n = 0;
  for (const f of s.army.foes) {
    if (f.raid !== r.id || f.state === 'fallen') continue;
    x += f.x;
    z += f.z;
    n++;
  }
  if (n) return [x / n, z / n];
  const w = raidersOf(s, r);
  if (w) return position(w);
  const ships = s.fleet.ships.filter((e) => e.raid === r.id && e.state !== 'sinking');
  if (ships.length) return [ships.reduce((a, e) => a + e.bx, 0) / ships.length, ships.reduce((a, e) => a + e.bz, 0) / ships.length];
  return null;
}

/** A new figure for a god at war, at a spot (said by the caller). */
function rise(s: SimState, god: GodId, why: 'champion' | 'foe', x: number, z: number, words: string, face: [number, number]): GodFigure {
  const w = s.gods.walks;
  const f: GodFigure = { id: w.next++, god, x, z, px: x, pz: z, heading: datan2(face[0] - x, face[1] - z), state: 'arriving', since: s.tick, why, words, stops: [], at: 0, came: s.tick, leaves: s.tick + WAR_STAY, blessed: [] };
  w.figures.push(f);
  s.rev++;
  return f;
}

/** "beside Sparta's raiders in the market quarter". */
function nearWords(map: CoastMap, x: number, z: number): string {
  const t = districtTitle(districtAt(map, x, z));
  return t ? ` ${t[0].toLowerCase()}${t.slice(1)}` : '';
}

/**
 * A god who loves you comes to fight for you (the `callgod` command). They
 * rise beside the danger (a god already visiting leaves their visit for it).
 * Returns the figure, or null if refused (see callRefusal).
 */
export function callGod(s: SimState, god: GodId): GodFigure | null {
  if (callRefusal(s, god)) return null;
  const map = mapOf(s);
  const bands = invaders(s);
  const r = bands[0];
  const at = bandAt(s, r);
  if (!at) return null;
  const war = warOf(s);
  war.called[god] = s.tick;
  const love = loveWhy(s, god);
  const words = `${she(god)} loves your city${love ? ` (${love})` : ''}, and you called on ${her(god)} against ${whose(r.city)} ${bandWord(r)}`;
  // (Visiting already, or posed: the visit ends there, what they blessed kept, and they rise anew beside the danger.)
  const was = s.gods.walks.figures.findIndex((o) => o.god === god);
  if (was >= 0) s.gods.walks.figures.splice(was, 1);
  // Beside the danger, a little towards the town (on the shore by their beach, if they haven't landed).
  const [mx, mz] = middleOf(s, map);
  let [x, z] = at;
  if (r.shore >= 0 && r.landed === 0) {
    const sh = shoreNear(map, (r.shore % map.size) + 0.5, Math.floor(r.shore / map.size) + 0.5);
    if (sh) [x, z] = sh;
  } else {
    const d = dhypot(mx - x, mz - z);
    if (d > 0.01) [x, z] = [x + ((mx - x) / d) * Math.min(RISE_OFF, d), z + ((mz - z) / d) * Math.min(RISE_OFF, d)];
    [x, z] = onLand(map, x, z);
  }
  const f = rise(s, god, 'champion', x, z, words, at);
  war.champions.push({ figure: f.id, god, cool: 0, felled: 0, ships: 0, nerve: 0 });
  const foe = war.marches.find((m) => m.figure && figure(s, m.figure));
  const st = STYLES[god];
  say(s, {
    kind: 'godwar',
    u: WARNING,
    title: `${GODS[god].name} answers your call`,
    words: `${GODS[god].name} answers your call and rises beside ${whose(r.city)} ${bandWord(r)}${nearWords(map, f.x, f.z)}: ${she(god)} ${st.words}.${foe ? ` ${GODS[foe.god].name} is with them: the two gods will fight.` : ''}`,
    at: { tile: Math.floor(f.z) * map.size + Math.floor(f.x) },
  });
  return f;
}

// ---------------------------------------------------------------------------
// Each tick.

/**
 * Once a tick, before the battle (so a raider a god strikes down falls this
 * tick): the gods at war move and strike, a duel goes on or ends; once a day,
 * with the gods on, a rival's patron who is angry with you joins its city's
 * band (or leaves it, calmed), and is said. Nothing with no god at war and
 * no threat standing.
 */
export function stepGodWar(s: SimState, map: CoastMap): void {
  const war = s.gods.war;
  if (war.strikes.length && s.tick - war.strikes[0].t > STRIKE_KEEP) war.strikes = war.strikes.filter((k) => s.tick - k.t <= STRIKE_KEEP);
  if (s.gods.on && s.tick % TICKS_PER_DAY === 0 && s.world.raids.length) marches(s);
  if (war.marches.length) for (const m of [...war.marches]) stepMarch(s, map, m);
  if (war.champions.length) for (const c of [...war.champions]) stepChampion(s, map, c);
  if (war.duel) stepDuel(s, map, war.duel);
  if (war.champions.length) breakSooner(s, map);
}

/** Once a day: each standing threat or band on its way whose city's patron is angry with you has its god with it (said); one whose god has cooled loses them (said). */
function marches(s: SimState): void {
  const war = s.gods.war;
  for (const r of s.world.raids) {
    const m = marchOf(s, r.id);
    // (Over, or the god already on your map with the band: no change now.)
    if (!live(r) || (m && m.figure)) {
      if (m && !m.figure && !live(r)) war.marches.splice(war.marches.indexOf(m), 1);
      continue;
    }
    const god = patronOf(r.city);
    if (!god) continue;
    const on = r.phase === 'threat' || r.phase === 'gathering' || r.phase === 'marching' || r.phase === 'raiding';
    if (!on) continue;
    if (!m) {
      if (!noticed(s) || !angry(s, god) || war.marches.some((o) => o.god === god)) continue;
      war.marches.push({ raid: r.id, god, figure: 0, since: s.tick, cool: 0, lastFire: -BURN_GAP, fires: 0, felled: 0 });
      const st = STYLES[god];
      say(s, {
        kind: 'godwar',
        u: ALARM,
        title: `${GODS[god].name} marches with ${cityName(r.city)}`,
        words: `${GODS[god].name} marches with ${whose(r.city)} ${bandWord(r)}: ${she(god)} is ${moodWord(moodOfGod(s, god))} with you${angerWhy(s, god) ? ` (${angerWhy(s, god)})` : ''}. In your streets ${she(god)} ${st.nerve && !st.hurt ? 'unsettles your soldiers' : 'strikes your soldiers'} and sets buildings alight, and your soldiers can’t hurt ${goddess(god) ? 'her' : 'him'}. Calm ${goddess(god) ? 'her' : 'him'} before they come, hold out until the band breaks, or call on a god who loves you.`,
        at: { city: r.city },
      });
      s.rev++;
    } else if (!angry(s, god) && r.phase !== 'raiding') {
      war.marches.splice(war.marches.indexOf(m), 1);
      say(s, { kind: 'godwar', u: WARNING, title: `${GODS[god].name} stays home`, words: `${GODS[god].name} no longer marches with ${whose(r.city)} ${bandWord(r)}: ${she(god)} is only ${moodWord(moodOfGod(s, god))} with you now.`, at: { city: r.city } });
      s.rev++;
    }
  }
}

/** A god set to go, gone: the figure leaves where it stands. */
function leave(s: SimState, f: GodFigure): void {
  if (f.state === 'leaving') return;
  f.state = 'leaving';
  f.since = s.tick;
  const d = s.gods.war.duel;
  if (d && (d.a === f.id || d.b === f.id)) s.gods.war.duel = null;
  s.rev++;
}

/** Step a figure towards a spot, at most `pace` and never closer than `stop`: whether it moved. */
function stepTo(f: GodFigure, x: number, z: number, pace: number, stop: number): boolean {
  const d = dhypot(x - f.x, z - f.z);
  if (d <= stop + 1e-6) return false;
  const step = Math.min(pace, d - stop);
  f.x += ((x - f.x) / d) * step;
  f.z += ((z - f.z) / d) * step;
  f.heading = datan2(x - f.x, z - f.z);
  return true;
}

/** A god's figure through its arrival and leaving: whether it is free to act this tick (risen, not leaving); gone once it has left. */
function settled(s: SimState, f: GodFigure): boolean {
  f.px = f.x;
  f.pz = f.z;
  if (f.state === 'arriving') {
    if (s.tick - f.since < WAR_ARRIVE) return false;
    f.state = 'walking';
    f.since = s.tick;
  }
  if (f.state === 'leaving') {
    if (s.tick - f.since >= WAR_LEAVE) {
      const w = s.gods.walks;
      w.figures.splice(w.figures.indexOf(f), 1);
      s.rev++;
    }
    return false;
  }
  return true;
}

function setState(s: SimState, f: GodFigure, st: WalkState): void {
  if (f.state === st) return;
  f.state = st;
  f.since = s.tick;
}

function strike(s: SimState, god: GodId, kind: StrikeKind, f: GodFigure, x1: number, z1: number, men: number[] = [], ship = 0): void {
  const war = s.gods.war;
  war.strikes.push({ id: war.next++, t: s.tick, god, kind, x0: f.x, z0: f.z, x1, z1, men, ship });
  f.heading = datan2(x1 - f.x, z1 - f.z);
}

/** One march's tick: the god rises with the band once it is on your map, walks with it, strikes your soldiers, sets buildings alight; goes home when the band breaks, turns or leaves. */
function stepMarch(s: SimState, map: CoastMap, m: GodMarch): void {
  const war = s.gods.war;
  const r = raidOf(s, m.raid);
  let f = figure(s, m.figure);
  if (m.figure && !f) {
    // (Gone: the march is over.)
    war.marches.splice(war.marches.indexOf(m), 1);
    return;
  }
  const band = r ? raidersOf(s, r) : undefined;
  if (!f) {
    // Not on your map yet: the god rises among the band as it comes onto your land (from the sea, as its men land).
    if (!r || (!live(r) && r.phase !== 'raiding')) {
      war.marches.splice(war.marches.indexOf(m), 1);
      return;
    }
    if (r.phase !== 'raiding' || !band || r.broke || r.end !== '') return;
    const at = bandAt(s, r);
    // (Once the band's middle is a little way onto your map: it walks in from beyond the edge.)
    if (!at || at[0] < RISE_IN || at[1] < RISE_IN || at[0] > map.size - RISE_IN || at[1] > map.size - RISE_IN) return;
    const [x, z] = onLand(map, at[0] + BESIDE, at[1]);
    const words = `${she(m.god)} is ${moodWord(moodOfGod(s, m.god))} with you${angerWhy(s, m.god) ? ` (${angerWhy(s, m.god)})` : ''}, and marches with ${whose(r.city)} ${bandWord(r)}`;
    f = rise(s, m.god, 'foe', x, z, words, at);
    f.leaves = -1;
    m.figure = f.id;
    say(s, {
      kind: 'godwar',
      u: ALARM,
      title: `${GODS[m.god].name} is in your city`,
      words: `${GODS[m.god].name} has come with ${whose(r.city)} ${bandWord(r)}${nearWords(map, x, z)}, towering among them. Your soldiers can’t hurt ${goddess(m.god) ? 'her' : 'him'}: hold out until the band breaks, or call on a god who loves you.`,
      at: { tile: Math.floor(z) * map.size + Math.floor(x) },
    });
    return;
  }
  if (!settled(s, f)) {
    // (Gone: the march is over.)
    if (!figure(s, m.figure)) war.marches.splice(war.marches.indexOf(m), 1);
    return;
  }
  // The band beaten, turned, paid off or gone: the god goes home with it.
  if (!r || !band || r.broke || r.end !== '' || r.phase !== 'raiding') {
    leave(s, f);
    const how = !r || !band ? 'goes home' : r.broke ? `goes home with ${whose(r.city)} beaten ${bandWord(r)}` : `goes home with ${whose(r.city)} ${bandWord(r)}`;
    const did = [m.felled ? `struck down ${m.felled} of your soldiers` : '', m.fires ? `set ${m.fires === 1 ? 'a building' : `${m.fires} buildings`} alight` : ''].filter(Boolean).join(' and ');
    say(s, { kind: 'godwar', u: NEWS, title: `${GODS[m.god].name} has gone`, words: `${GODS[m.god].name} ${how}${did ? `: ${she(m.god)} ${did}` : ''}.` });
    return;
  }
  // (Fighting your champion: the duel holds them.)
  const d = war.duel;
  if (d && d.b === f.id) return;
  // Walk beside the band.
  const at = bandAt(s, r);
  if (at) {
    const [bx, bz] = at;
    const moved = stepTo(f, bx + BESIDE * 0.7, bz + BESIDE * 0.7, MARCH_PACE, 0.4);
    setState(s, f, moved ? 'walking' : f.state === 'fighting' ? 'fighting' : 'walking');
  }
  // Strike your soldiers in reach.
  const st = STYLES[m.god];
  if (m.cool > 0) m.cool--;
  else {
    const reach = Math.max(st.range, 2.4);
    const t = nearestMan(s, f.x, f.z, reach);
    if (t) {
      const hurt = st.hurt ? st.hurt * FOE_HURT : NERVE_FOE_HURT;
      const area = st.nerve && !st.hurt ? 0.8 : st.area;
      const men: number[] = [];
      const hit = s.army.soldiers
        .filter((x) => x.state === 'ready' && x.company > 0 && x.hp > 0 && (x.id === t.id || dhypot(x.x - t.x, x.z - t.z) <= area))
        .sort((p, q) => dhypot(p.x - t.x, p.z - t.z) - dhypot(q.x - t.x, q.z - t.z) || p.id - q.id)
        .slice(0, Math.max(1, st.most));
      for (const x of hit) {
        x.hp -= hurt;
        men.push(x.id);
        if (x.hp <= 0) m.felled++;
      }
      strike(s, m.god, st.kind, f, t.x, t.z, men);
      m.cool = Math.round(st.every * FOE_SLOWER);
      setState(s, f, 'fighting');
    }
  }
  // Set a building alight now and then.
  if (s.hazards && m.fires < BURN_MOST && s.tick - m.lastFire >= BURN_GAP) {
    const b = burnNear(s, f.x, f.z, r);
    if (b) {
      ignite(s, b);
      m.fires++;
      m.lastFire = s.tick;
      const [cx, cz] = centreOf(b);
      strike(s, m.god, 'burn', f, cx, cz);
      s.rev++;
    }
  }
}

/** The nearest of your soldiers in the ranks and on his feet, within reach. */
function nearestMan(s: SimState, x: number, z: number, reach: number): { id: number; x: number; z: number } | undefined {
  let best: { id: number; x: number; z: number } | undefined;
  let bd = reach;
  for (const m of s.army.soldiers) {
    if (m.state !== 'ready' || m.company <= 0) continue;
    const d = dhypot(m.x - x, m.z - z);
    if (d <= bd) [best, bd] = [m, d];
  }
  return best;
}

/** A building near the god to set alight: burnable, not burning, nor a store or the tax office the band came for (as raids.ts's torch spares them); the nearest. */
function burnNear(s: SimState, x: number, z: number, r: Raid): Building | undefined {
  let best: Building | undefined;
  let bd = Infinity;
  for (const b of s.buildings) {
    if (!burnable(b) || b.fire === FIRE_BURNING || b.kind === 'granary' || b.kind === 'storehouse' || b.kind === 'taxoffice' || b.id === r.target || r.next.includes(b.id)) continue;
    const [cx, cz] = centreOf(b);
    const d = dhypot(cx - x, cz - z) - (b.kind === 'home' ? 0.5 : 1.5);
    if (d <= BURN_REACH && (d < bd - 1e-9 || (Math.abs(d - bd) <= 1e-9 && best && b.id < best.id))) [best, bd] = [b, d];
  }
  return best;
}

/** One champion's tick: to the enemy god first, else the nearest raider (or, from the shore, a ship sailing in); strike in reach; leave when the bands are beaten or gone, or their time is up. */
function stepChampion(s: SimState, map: CoastMap, c: Champion): void {
  const war = s.gods.war;
  const f = figure(s, c.figure);
  if (!f || !atWar(f)) {
    war.champions.splice(war.champions.indexOf(c), 1);
    return;
  }
  if (!settled(s, f)) {
    if (!figure(s, c.figure)) war.champions.splice(war.champions.indexOf(c), 1);
    return;
  }
  const bands = invaders(s);
  if (!bands.length || s.tick >= f.leaves) {
    leave(s, f);
    const did = [c.felled ? `struck down ${c.felled} of the invaders` : '', c.ships ? `struck ${c.ships === 1 ? 'a ship' : `${c.ships} ships`}` : ''].filter(Boolean).join(' and ');
    say(s, { kind: 'godwar', u: NEWS, title: `${GODS[c.god].name} has gone`, words: `${GODS[c.god].name} has gone${did ? `: ${she(c.god)} ${did}` : ''}. ${cap(she(c.god))} will answer your call again from ${dayWords(f.came + CALL_GAP)}.` });
    return;
  }
  const d = war.duel;
  if (d && d.a === f.id) return;
  // An enemy god on your map: go for them first.
  const enemy = !d ? war.marches.map((m) => figure(s, m.figure)).find((o) => !!o && o.state !== 'arriving' && o.state !== 'leaving') : undefined;
  if (enemy) {
    if (!stepTo(f, enemy.x, enemy.z, WAR_PACE, DUEL_GAP)) startDuel(s, map, f, enemy);
    else setState(s, f, 'walking');
    return;
  }
  const st = STYLES[c.god];
  if (c.cool > 0) c.cool--;
  // The nearest raider on his feet, of a band not yet broken.
  const live = new Set(bands.map((r) => r.id));
  let t: { id: number; x: number; z: number } | undefined;
  let td = Infinity;
  for (const o of s.army.foes) {
    if (o.raid <= 0 || o.state === 'fallen' || !live.has(o.raid)) continue;
    const dd = dhypot(o.x - f.x, o.z - f.z);
    if (dd < td) [t, td] = [o, dd];
  }
  // (None ashore yet: a god who reaches ships strikes at them from the shore; the others wait there for the landing.)
  if (!t) {
    const e = st.ships ? nearestShip(s, f.x, f.z, bands) : undefined;
    if (e && dhypot(e.x - f.x, e.z - f.z) <= st.range + 3) {
      setState(s, f, 'fighting');
      if (c.cool === 0) {
        e.hp = Math.max(0, e.hp - SHIP_HURT);
        c.ships++;
        c.cool = st.every;
        strike(s, c.god, st.kind, f, e.x, e.z, [], e.id);
      }
    } else setState(s, f, 'walking');
    return;
  }
  const reach = st.range;
  if (td > reach * 0.9) {
    stepTo(f, t.x, t.z, WAR_PACE, reach * 0.8);
    setState(s, f, 'walking');
    if (td > reach) return;
  } else f.heading = datan2(t.x - f.x, t.z - f.z);
  if (c.cool > 0) return;
  setState(s, f, 'fighting');
  c.cool = st.every;
  if (st.hurt) {
    // (The man aimed at, and the nearest round him within the blow's spread, up to its most.)
    const hit = s.army.foes
      .filter((o) => o.raid > 0 && o.state !== 'fallen' && live.has(o.raid) && o.hp > 0 && (o.id === t!.id || dhypot(o.x - t!.x, o.z - t!.z) <= st.area))
      .sort((p, q) => dhypot(p.x - t!.x, p.z - t!.z) - dhypot(q.x - t!.x, q.z - t!.z) || p.id - q.id)
      .slice(0, st.most);
    for (const o of hit) {
      o.hp -= st.hurt;
      if (o.hp <= 0) c.felled++;
    }
  }
  if (st.nerve) {
    // Their nerve shaken: those near the god lay down the fight a while; the band's nerve is that much nearer breaking.
    for (const o of s.army.foes) {
      if (o.raid <= 0 || o.state === 'fallen' || !live.has(o.raid) || dhypot(o.x - f.x, o.z - f.z) > st.area + st.range) continue;
      o.calm = s.tick + SHAKEN;
      o.foe = 0;
      o.state = 'with';
    }
    c.nerve++;
  }
  strike(s, c.god, st.kind, f, t.x, t.z);
}

/** The nearest ship of these bands still sailing in. */
function nearestShip(s: SimState, x: number, z: number, bands: readonly Raid[]): (typeof s.fleet.ships)[number] | undefined {
  const ids = new Set(bands.map((r) => r.id));
  let best: (typeof s.fleet.ships)[number] | undefined;
  let bd = Infinity;
  for (const e of s.fleet.ships) {
    if (!ids.has(e.raid) || e.state !== 'sailing' || e.hp <= 0) continue;
    const d = dhypot(e.x - x, e.z - z);
    if (d < bd) [best, bd] = [e, d];
  }
  return best;
}

/** A band with a champion upon it breaks sooner: at a third of its men fallen (not half), or its nerve shaken NERVE_BREAK times. */
function breakSooner(s: SimState, map: CoastMap): void {
  for (const r of invaders(s)) {
    const w = raidersOf(s, r);
    if (!w) continue;
    const at = bandAt(s, r);
    if (!at) continue;
    const near = s.gods.war.champions.filter((c) => {
      const f = figure(s, c.figure);
      return !!f && f.state !== 'arriving' && f.state !== 'leaving' && dhypot(f.x - at[0], f.z - at[1]) <= NEAR_BAND;
    });
    if (!near.length) continue;
    const nerve = near.reduce((a, c) => a + c.nerve, 0);
    const men = bandMen(r);
    // (Those struck down this tick, falling: counted.)
    const down = s.army.foes.filter((o) => o.raid === r.id && (o.state === 'fallen' || o.hp <= 0)).length;
    const lost = Math.max(r.fallen, down);
    if (lost < men * BREAK_SHARE && nerve < NERVE_BREAK) continue;
    const g = near[0].god;
    const why = nerve >= NERVE_BREAK && lost < men * BREAK_SHARE ? `${GODS[g].name} has broken their nerve` : `${GODS[g].name} is among them, and a third of their men have fallen`;
    breakNow(s, map, r, why);
    say(s, { kind: 'godwar', u: WARNING, title: `${whose(r.city)} ${bandWord(r)} break`, words: `${whose(r.city)} ${bandWord(r)} break and run: ${why}.` });
  }
}

// ---------------------------------------------------------------------------
// Gods fight gods.

/** Your champion's love and the enemy god's anger, as the duel weighs them. */
export function duelWeights(s: SimState, d: Duel): { love: number; anger: number; yours: GodId; theirs: GodId } | null {
  const a = figure(s, d.a);
  const b = figure(s, d.b);
  if (!a || !b) return null;
  return { love: Math.max(0, moodOfGod(s, a.god)), anger: Math.max(0, -moodOfGod(s, b.god)), yours: a.god, theirs: b.god };
}

function startDuel(s: SimState, map: CoastMap, a: GodFigure, b: GodFigure): void {
  const war = s.gods.war;
  war.duel = { a: a.id, b: b.id, since: s.tick, ends: s.tick + DUEL_TICKS };
  setState(s, a, 'fighting');
  setState(s, b, 'fighting');
  a.heading = datan2(b.x - a.x, b.z - a.z);
  b.heading = datan2(a.x - b.x, a.z - b.z);
  const love = Math.round(Math.max(0, moodOfGod(s, a.god)));
  const anger = Math.round(Math.max(0, -moodOfGod(s, b.god)));
  say(s, {
    kind: 'godwar',
    u: WARNING,
    title: `${GODS[a.god].name} and ${GODS[b.god].name} fight`,
    words: `${GODS[a.god].name} and ${GODS[b.god].name} fight in your streets${nearWords(map, a.x, a.z)}: ${her(a.god)} love for you (${love}) against ${her(b.god)} anger (${anger}). The stronger will win in a few days.`,
    at: { tile: Math.floor(a.z) * map.size + Math.floor(a.x) },
  });
  s.rev++;
}

/** A duel's tick: the two trade great blows; at its end the weaker withdraws (a tie to yours, the defender), and a beaten enemy god's band breaks. */
function stepDuel(s: SimState, map: CoastMap, d: Duel): void {
  const war = s.gods.war;
  const a = figure(s, d.a);
  const b = figure(s, d.b);
  if (!a || !b || a.state === 'leaving' || b.state === 'leaving') {
    war.duel = null;
    return;
  }
  a.px = a.x;
  a.pz = a.z;
  // (They circle a little as they fight, each facing the other.)
  a.heading = datan2(b.x - a.x, b.z - a.z);
  b.heading = datan2(a.x - b.x, a.z - b.z);
  const age = s.tick - d.since;
  if (age % 6 === 0) strike(s, age % 12 === 0 ? a.god : b.god, 'clash', age % 12 === 0 ? a : b, (a.x + b.x) / 2, (a.z + b.z) / 2);
  if (s.tick < d.ends) return;
  const w = duelWeights(s, d);
  if (!w) return;
  war.duel = null;
  const m = marchByFigure(s, b.id);
  const r = m ? raidOf(s, m.raid) : undefined;
  if (w.love >= w.anger) {
    // Yours wins: the enemy god withdraws, and their band breaks.
    leave(s, b);
    setState(s, a, 'walking');
    const band = r && raidersOf(s, r) && !r.broke ? r : undefined;
    if (band) breakNow(s, map, band, `${GODS[b.god].name} has fled before ${GODS[a.god].name}`);
    say(s, {
      kind: 'godwar',
      u: WARNING,
      title: `${GODS[a.god].name} has beaten ${GODS[b.god].name}`,
      words: `${GODS[a.god].name} has beaten ${GODS[b.god].name} in your streets: ${her(a.god)} love for you (${Math.round(w.love)}) was the stronger, and ${GODS[b.god].name} withdraws${band ? `. ${whose(band.city)} ${bandWord(band)} break and run` : ''}.`,
      at: { tile: Math.floor(a.z) * map.size + Math.floor(a.x) },
    });
  } else {
    leave(s, a);
    setState(s, b, 'walking');
    say(s, {
      kind: 'godwar',
      u: ALARM,
      title: `${GODS[b.god].name} has beaten ${GODS[a.god].name}`,
      words: `${GODS[b.god].name} has beaten ${GODS[a.god].name} in your streets: ${her(b.god)} anger at you (${Math.round(w.anger)}) was the stronger, and ${GODS[a.god].name} withdraws. Hold out until the band breaks.`,
      at: { tile: Math.floor(b.z) * map.size + Math.floor(b.x) },
    });
  }
  s.rev++;
}

// ---------------------------------------------------------------------------
// Words for the hover and the panel.

/** What a god at war is doing, for their hover tip: who, what, why they fight, and what can be done; null for a god not at war. */
export function warStatus(s: SimState, f: GodFigure): { title: string; detail: string } | null {
  if (!atWar(f)) return null;
  const g = GODS[f.god];
  const lines = [cap(warDoing(s, f)), cap(warWhy(s, f))];
  const d = s.gods.war.duel;
  if (d && (d.a === f.id || d.b === f.id)) lines.push(duelLine(s, d));
  lines.push(warHelp(s, f));
  return { title: `${g.name}, ${g.epithet}`, detail: lines.filter(Boolean).join('\n') };
}

/** What a god at war is doing now: "fighting Sparta's raiders by the granary". */
export function warDoing(s: SimState, f: GodFigure): string {
  const war = s.gods.war;
  const d = war.duel;
  if (f.state === 'arriving') return f.why === 'champion' ? 'rising to fight for you' : 'rising among the band';
  if (f.state === 'leaving') return 'leaving your city';
  if (d && (d.a === f.id || d.b === f.id)) {
    const o = figure(s, d.a === f.id ? d.b : d.a);
    return o ? `fighting ${GODS[o.god].name}` : 'fighting';
  }
  if (f.why === 'foe') {
    const m = marchByFigure(s, f.id);
    const r = m ? raidOf(s, m.raid) : undefined;
    const st = STYLES[f.god];
    if (!r) return 'with the band';
    return `${f.state === 'fighting' ? (st.nerve && !st.hurt ? 'unsettling your soldiers' : 'striking at your soldiers') : 'marching'} with ${whose(r.city)} ${bandWord(r)}`;
  }
  const r = invaders(s)[0];
  return f.state === 'fighting' ? `${STYLES[f.god].nerve && !STYLES[f.god].hurt ? 'shaking the nerve of' : 'striking'} ${r ? `${whose(r.city)} ${bandWord(r)}` : 'the invaders'}` : `going for ${r ? `${whose(r.city)} ${bandWord(r)}` : 'the invaders'}`;
}

/** Why a god at war fights: "Ares marches with Sparta: he is furious with you: you paid tribute to Athens". */
export function warWhy(s: SimState, f: GodFigure): string {
  if (f.why === 'foe') {
    const m = marchByFigure(s, f.id);
    const r = m ? raidOf(s, m.raid) : undefined;
    const why = angerWhy(s, f.god);
    return `${GODS[f.god].name} marches with ${r ? cityName(r.city) : 'the band'}: ${she(f.god)} is ${moodWord(moodOfGod(s, f.god))} with you${why ? ` (${why})` : ''}`;
  }
  const why = loveWhy(s, f.god);
  return `${GODS[f.god].name} fights for you: ${she(f.god)} loves your city${why ? ` (${why})` : ''}`;
}

/** What can be done about a god at war, or what they will do. */
export function warHelp(s: SimState, f: GodFigure): string {
  if (f.state === 'leaving') return '';
  if (f.why === 'foe') {
    const callers = callable(s).filter((c) => !c.why);
    const call = callers.length ? `call on ${callers.map((c) => GODS[c.god].name).join(' or ')} (the Army tab)` : 'call on a god who loves you, from a sanctuary of theirs';
    return `Your soldiers can’t hurt ${goddess(f.god) ? 'her' : 'him'}. Hold out until the band breaks, or ${call}`;
  }
  const st = STYLES[f.god];
  const c = championOf(s, f.id);
  const done = c && (c.felled || c.ships || c.nerve) ? ` · so far ${[c.felled ? `${c.felled} struck down` : '', c.ships ? `${c.ships} ${c.ships === 1 ? 'ship' : 'ships'} struck` : '', c.nerve ? `their nerve shaken ${c.nerve === 1 ? 'once' : `${c.nerve} times`}` : ''].filter(Boolean).join(', ')}` : '';
  const days = Math.max(1, Math.ceil((f.leaves - s.tick) / TICKS_PER_DAY));
  return `${cap(she(f.god))} ${st.words}${done}. Gone once the band breaks, within ${days} ${days === 1 ? 'day' : 'days'}`;
}

/** A duel in a line: "Athena's love (78) against Ares' anger (64): Athena will win, in 2 days". */
export function duelLine(s: SimState, d: Duel): string {
  const w = duelWeights(s, d);
  if (!w) return '';
  const days = Math.max(1, Math.ceil((d.ends - s.tick) / TICKS_PER_DAY));
  const wins = w.love >= w.anger ? w.yours : w.theirs;
  const pos = (g: GodId): string => (GODS[g].name.endsWith('s') ? `${GODS[g].name}’` : `${GODS[g].name}’s`);
  return `${pos(w.yours)} love (${Math.round(w.love)}) against ${pos(w.theirs)} anger (${Math.round(w.anger)}): ${GODS[wins].name} will win, in ${days} ${days === 1 ? 'day' : 'days'}${w.love === w.anger ? ' (a tie goes to the defender)' : ''}`;
}

/** The band's god, for the raid's chip and line: "Ares with them" (null for none). */
export function marchWords(s: SimState, r: Raid): { chip: string; line: string } | null {
  const m = marchOf(s, r.id);
  if (!m) return null;
  const g = GODS[m.god];
  return { chip: `${g.name} with them`, line: `${g.name} marches with them: ${angerWords(s, m.god).replace(`${g.name} is `, `${she(m.god)} is `)}` };
}
