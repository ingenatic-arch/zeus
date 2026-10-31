/**
 * Slice 57 (Blessings and wrath, the Olympus line): the gods' blessings.
 *
 * - **Asked** (the `bless` command, from a finished sanctuary's panel or the
 *   god's page): once a year per god, when the god is warm or better and
 *   their sanctuary stands finished.
 * - **Given unasked:** on the first of each month, with wrath's switch on
 *   (off while a demo's history plays), a loving god who has not blessed the
 *   city for UNASKED_GAP may give one (one in UNASKED_ODDS, by a hash of the
 *   seed, the god and the month).
 * - **Landing.** Either way the blessing lands at once, through the systems
 *   that already exist (BLESSINGS: each god their own, with how long it
 *   lasts), and is said with what it did; a lasting one is a spell in force
 *   (`gods.wrath.spells`, curse ''), read by the systems through pantheon.ts'
 *   lookups (godPace, godHunt, godCrime, godSettle, godMood, fairSeas,
 *   godPrice, godBond), and its end is said. The god comes in person to give
 *   it (slice 56's startVisit, reason 'blessing'), walking to the places they
 *   love and blessing each as slice 56 does; a sanctuary its own god walks in
 *   is honoured for the season (worship.ts' reading).
 *
 * Pure and deterministic: hashes of the seed only. Money through the treasury.
 */
import type { CoastMap } from '../map/bake';
import { capacity, centreOf, findBuilding, footprint, footSide, livedIn, recountPopulation } from './buildings';
import { dateOfTick, MONTH_NAMES, TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { ARMOUR, held, setHeld } from './foods';
import { moveIn } from './folk';
import { healAll } from './health';
import { putOut, unit } from './hazards';
import { NEWS, say } from './messages';
import { blessingFrom, GODS, GOD_IDS, HERA_BOND, herOf, moodAtLeast, moodOfGod, moodWord, type GodId } from './pantheon';
import { sanctuaryDone, sanctuaryName, sanctuaryOf } from './sanctuaries';
import { note } from './stockbook';
import { income } from './treasury';
import { startVisit } from './epiphany';
import { SEASON_NAMES, seasonAt } from './seasons';
import { TILE_EMPTY, type Building, type SimState } from './state';

// ---------------------------------------------------------------------------
// The numbers.

/** A season, and a year. */
export const SEASON = 3 * TICKS_PER_MONTH;
/** Asked: at most once in this long per god. Unasked: a loving god at most once in this long, one month in UNASKED_ODDS. */
export const ASK_EVERY = TICKS_PER_YEAR;
export const UNASKED_GAP = 2 * TICKS_PER_YEAR;
export const UNASKED_ODDS = 6;
/** Zeus's gift of coin. */
export const ZEUS_GIFT = 2000;

// ---------------------------------------------------------------------------
// Words.

const dayWords = (tick: number): string => {
  const d = dateOfTick(tick);
  return `${d.day} ${MONTH_NAMES[d.month]}`;
};
const she = (g: GodId): string => (herOf(g) === 'her' ? 'she' : 'he');
/** "until autumn", "until spring next year". */
function untilWords(s: SimState, until: number): string {
  const name = SEASON_NAMES[seasonAt(until)];
  return until - s.tick > 3 * SEASON ? `until ${name} next year` : `until ${name}`;
}

// ---------------------------------------------------------------------------
// The blessings.

interface Blessing {
  /** What it does, in a line (the card, the page, the panel). */
  does: string;
  /** How long it lasts once given (0: at once). */
  lasts: number;
  /** It lands: what it did, in words. */
  give: (s: SimState, map: CoastMap) => string;
  /** What ends with it, in words, for a lasting one ("the farms yield as before"). */
  ends?: string;
}

/** Zeus's lightning on raiders, one a day while his blessing is on (stepBlessings). */
function strikeRaider(s: SimState): boolean {
  const f = s.army.foes.find((x) => x.raid > 0 && x.state !== 'fallen' && x.hp > 0);
  if (!f) return false;
  // (The battle's own step sees him fall and does the rest: battle.ts' fallFoe.)
  f.hp = 0;
  s.rev++;
  return true;
}

export const BLESSINGS: Record<GodId, Blessing> = {
  zeus: {
    ends: 'his lightning no longer watches over your streets',
    does: `a gift of ${ZEUS_GIFT.toLocaleString('en-GB')} dr from the sky’s treasury, and for a season his lightning strikes down a raider on your map each day`,
    lasts: SEASON,
    give: (s) => {
      income(s, ZEUS_GIFT, 'worship', 'gift of Zeus');
      const struck = strikeRaider(s);
      return `${ZEUS_GIFT.toLocaleString('en-GB')} dr fall from the sky into your treasury${struck ? ', and his lightning struck down a raider on your map' : ''}; until the season turns, any raider on your map is struck down, one a day.`;
    },
  },
  hera: {
    ends: 'your colonies’ and vassals’ loyalty is their own again',
    does: 'every colony’s and vassal’s loyalty rises for a season, and a child is born in every house with room',
    lasts: SEASON,
    give: (s) => {
      let born = 0;
      for (const b of s.buildings) {
        if (!livedIn(b) || !b.family || b.people >= capacity(b)) continue;
        b.people++;
        moveIn(s, b, 1);
        born++;
      }
      if (born) recountPopulation(s);
      const ties = s.empire.vassals.length + s.empire.colonies.length;
      for (const v of s.empire.vassals) v.loyalty = Math.min(100, v.loyalty + HERA_BOND);
      for (const c of s.empire.colonies) c.loyalty = Math.min(100, c.loyalty + HERA_BOND);
      s.rev++;
      return `${born ? `a child is born in ${born === 1 ? 'one house' : `${born} houses`}` : 'no house has room for a child'}${ties ? `, and your ${ties === 1 ? 'colony or vassal is' : 'colonies and vassals are'} loyal${ties === 1 ? '' : ''} to you (+${HERA_BOND}) until the season turns` : ''}.`;
    },
  },
  poseidon: {
    ends: 'the seas are as fair or foul as the season makes them',
    does: 'fair seas for a year (no storm holds a ship back, the merchant ship sails a quarter quicker, enemy ships slower), and a tremor that clears every heap of rubble',
    lasts: TICKS_PER_YEAR,
    give: (s, map) => {
      const heaps = s.buildings.filter((b) => b.kind === 'rubble');
      for (const b of heaps) for (const t of footprint(map.size, b.x, b.z, footSide(b))) s.tiles[t] = TILE_EMPTY;
      if (heaps.length) {
        s.buildings = s.buildings.filter((b) => b.kind !== 'rubble');
        s.tilesRev++;
        s.rev++;
      }
      return `fair seas for a year: no winter storm holds a ship back, the merchant ship sails a quarter quicker, and enemy ships go slower${heaps.length ? `; and a gentle tremor shook ${heaps.length === 1 ? 'a heap of rubble' : `${heaps.length} heaps of rubble`} away, clear to build on` : ''}.`;
    },
  },
  demeter: {
    ends: 'the farms yield as before',
    does: 'every farm yields double for a season',
    lasts: SEASON,
    give: (s) => `every farm yields double ${untilWords(s, s.tick + SEASON)}, and the fields turn gold.`,
  },
  athena: {
    ends: 'the groves and presses work as before, and crime is what it was',
    does: 'the olive groves and presses work double for a season, and crime falls by half as people grow wise',
    lasts: SEASON,
    give: (s) => `the olive groves and presses work double, and homes are half as tempted to crime, ${untilWords(s, s.tick + SEASON)}.`,
  },
  apollo: {
    does: 'every sick home is healed, and a plague ends at once',
    lasts: 0,
    give: (s) => {
      const r = healAll(s, 'Apollo');
      return r.healed || r.plague ? `${r.healed ? `${r.healed === 1 ? 'one sick soul gets' : `${r.healed} sick get`} up from ${r.healed === 1 ? 'their bed' : 'their beds'}, healed` : 'nobody was sick'}${r.plague ? ', and the plague is over' : ''}.` : 'there was nobody sick to heal: the city is well, and glad of it.';
    },
  },
  artemis: {
    ends: 'the hunters bring home what they always did',
    does: 'the wild herds swell to whole, and for a season hunters bring home double',
    lasts: SEASON,
    give: (s) => {
      let grew = 0;
      for (const h of s.herds) {
        grew += Math.max(0, h.full - h.head);
        h.head = Math.max(h.head, h.full);
      }
      if (grew) s.rev++;
      return `${grew ? `the wild herds swell by ${grew} head, whole again` : 'the wild herds are whole'}, and hunters bring home double ${untilWords(s, s.tick + SEASON)}.`;
    },
  },
  ares: {
    does: 'armour for every soldier who waits for it, delivered to his barracks, and the wounded healed',
    lasts: 0,
    give: (s) => {
      let sets = 0;
      for (const c of s.army.companies) {
        if (c.kind !== 'hoplite' || c.hired || c.ally) continue;
        const b = findBuilding(s, c.barracks);
        if (!b) continue;
        const want = s.army.soldiers.filter((x) => x.company === c.id && !x.armed && (x.state === 'arming' || x.state === 'coming')).length;
        if (want <= 0) continue;
        setHeld(b, ARMOUR, held(b, ARMOUR) + want);
        note(s, ARMOUR, 'made', 'gift of Ares', want);
        sets += want;
      }
      let healed = 0;
      for (const x of s.army.soldiers) {
        if ((x.state === 'healing' || x.state === 'wounded' || x.state === 'ready') && x.hp < 100 && x.hp > 0) {
          x.hp = 100;
          healed++;
        }
      }
      if (sets || healed) s.rev++;
      return sets || healed ? `${sets ? `${sets === 1 ? 'a set' : `${sets} sets`} of bronze armour lie in your barracks for the men who waited` : 'no man waits for armour'}${healed ? `, and ${healed === 1 ? 'one wounded man is' : `${healed} wounded men are`} whole again` : ''}.` : 'your soldiers want for nothing: he nods, and goes.';
    },
  },
  aphrodite: {
    ends: 'homes and settlers are as they were',
    does: 'every home’s mood rises for a season, and settlers come twice as often',
    lasts: SEASON,
    give: (s) => `every home is happier, and settlers come twice as often, ${untilWords(s, s.tick + SEASON)}.`,
  },
  hephaestus: {
    ends: 'the forges and the masons work as before',
    does: 'every fire goes out at once, and for a season the armouries, mines and masons work double',
    lasts: SEASON,
    give: (s) => {
      let out = 0;
      for (const b of s.buildings) {
        if (b.fire === 0) continue;
        putOut(b);
        out++;
      }
      if (out) s.rev++;
      return `${out ? `${out === 1 ? 'the fire burning goes' : `the ${out} fires burning go`} out at once, and ` : ''}the armouries, mines and masons work double ${untilWords(s, s.tick + SEASON)}.`;
    },
  },
  hermes: {
    ends: 'your prices are the market’s again',
    does: 'your prices better for a season: a seventh more when you sell, a seventh less when you buy',
    lasts: SEASON,
    give: (s) => `your traders get a seventh more for what they sell and pay a seventh less for what they buy, ${untilWords(s, s.tick + SEASON)}.`,
  },
  dionysus: {
    ends: 'the vineyards and wineries yield as before',
    does: 'the vineyards and wineries yield double for a season, and a festival in every home',
    lasts: SEASON,
    give: (s) => {
      const g = GOD_IDS.indexOf('dionysus');
      let homes = 0;
      for (const b of s.buildings) {
        if (!livedIn(b)) continue;
        s.gods.festive[String(b.id)] = [s.tick, g];
        homes++;
      }
      return `the vineyards and wineries yield double ${untilWords(s, s.tick + SEASON)}, and ${homes ? `all ${homes} homes keep a festival of their own` : 'there is a festival in the streets'}.`;
    },
  },
};

// ---------------------------------------------------------------------------
// Asking.

/** The god's finished sanctuary's building, if it stands. */
const holyOf = (s: SimState, god: GodId): Building | undefined => {
  const x = sanctuaryDone(s, god) ? sanctuaryOf(s, god) : undefined;
  return x ? findBuilding(s, x.id) : undefined;
};

/** When a god may next be asked (a year after the last), or 0 if they may now. */
export function nextAsk(s: SimState, god: GodId): number {
  const last = s.gods.wrath.asked[god];
  return last !== undefined && s.tick - last < ASK_EVERY ? last + ASK_EVERY : 0;
}

/** Why a god's blessing can't be asked at this sanctuary now ('' if it can). */
export function blessRefusal(s: SimState, id: number): string {
  const b = findBuilding(s, id);
  if (!b || b.kind !== 'sanctuary' || !b.god) return 'A blessing is asked at a god’s finished sanctuary';
  const god = b.god;
  const G = GODS[god];
  if (holyOf(s, god)?.id !== b.id) return `${sanctuaryName(god, true)} is not finished: ${G.name}’s blessing waits for its consecration`;
  if (!s.gods.on) return 'The gods are not watching yet';
  const m = moodOfGod(s, god);
  if (!moodAtLeast(m, 'warm')) return `${G.name} is ${moodWord(m)} (${m}): ${she(god)} gives ${herOf(god)} blessing only when warm or better (+30)`;
  if (blessingFrom(s, god)) return `${G.name}’s blessing is on your city already, until ${dayWords(blessingFrom(s, god)!.until)}`;
  const next = nextAsk(s, god);
  if (next) return `You asked ${G.name}’s blessing on ${dayWords(s.gods.wrath.asked[god]!)}: once a year (the next from ${dayWords(next)})`;
  return '';
}

/** Ask a god's blessing at their sanctuary (the command): it lands at once, and the god comes. */
export function askBlessing(s: SimState, map: CoastMap, id: number): void {
  if (blessRefusal(s, id)) return;
  const god = findBuilding(s, id)!.god!;
  s.gods.wrath.asked[god] = s.tick;
  giveBlessing(s, map, god, true);
}

/**
 * A god gives their blessing (asked, or not): it lands at once, with its
 * spell if it lasts, said with what it did; and the god comes in person to
 * walk the places they love (refused, as any visit, with three gods walking or
 * the god here already). The hook for the other lines.
 */
export function giveBlessing(s: SimState, map: CoastMap, god: GodId, asked: boolean): void {
  const B = BLESSINGS[god];
  const w = s.gods.wrath;
  w.given[god] = s.tick;
  const did = B.give(s, map);
  if (B.lasts > 0) {
    const had = w.spells.findIndex((x) => x.god === god && x.curse === '');
    if (had >= 0) w.spells.splice(had, 1);
    w.spells.push({ god, curse: '', from: s.tick, until: s.tick + B.lasts });
  }
  s.rev++;
  const G = GODS[god];
  const holy = holyOf(s, god);
  say(s, {
    kind: 'gods',
    u: NEWS,
    title: `${G.name}’s blessing`,
    words: `${asked ? `${G.name} hears your prayer at ${herOf(god)} sanctuary and gives ${herOf(god)} blessing` : `${G.name} loves your city, and gives ${herOf(god)} blessing unasked`}: ${did}`,
    at: holy ? { building: holy.id } : undefined,
  });
  startVisit(s, god, 'blessing');
}

/** A spell of a blessing whose time is up: said. */
function lapse(s: SimState): void {
  const w = s.gods.wrath;
  for (let i = w.spells.length - 1; i >= 0; i--) {
    const x = w.spells[i];
    if (x.curse !== '' || x.until > s.tick) continue;
    w.spells.splice(i, 1);
    s.rev++;
    const G = GODS[x.god];
    say(s, { kind: 'gods', u: NEWS, title: `${G.name}’s blessing has run its course`, words: `${G.name}’s blessing has run its course: ${BLESSINGS[x.god].ends ?? 'things are as they were'}.` });
  }
}

/**
 * Once a day (sim.ts, after wrath): blessings whose time is up are said;
 * Zeus's lightning strikes a raider while his is on; and on the first of the
 * month, with wrath's switch on, a loving god may bless the city unasked.
 */
export function stepBlessings(s: SimState, map: CoastMap): void {
  const w = s.gods.wrath;
  if (!s.gods.on || s.tick % TICKS_PER_DAY !== 0) return;
  if (w.spells.length) {
    lapse(s);
    if (blessingFrom(s, 'zeus') && s.army.foes.length) strikeRaider(s);
  }
  if (!w.on || s.tick % TICKS_PER_MONTH !== 0) return;
  const month = Math.floor(s.tick / TICKS_PER_MONTH);
  for (const god of GOD_IDS) {
    if (!moodAtLeast(moodOfGod(s, god), 'loving')) continue;
    const last = w.given[god];
    if (last !== undefined && s.tick - last < UNASKED_GAP) continue;
    if (blessingFrom(s, god)) continue;
    if (unit(s.seed, GOD_IDS.indexOf(god) + 1, month, 0xb1e5) * UNASKED_ODDS >= 1) continue;
    giveBlessing(s, map, god, false);
    return;
  }
}

/** A blessing's time left, in words, for the panels: "until autumn". */
export const blessingUntil = (s: SimState, god: GodId): string | null => {
  const x = blessingFrom(s, god);
  return x ? untilWords(s, x.until) : null;
};

/** The middle of a god's finished sanctuary, if it stands (for the UI). */
export const sanctuarySpot = (s: SimState, god: GodId): [number, number] | null => {
  const b = holyOf(s, god);
  return b ? centreOf(b) : null;
};
