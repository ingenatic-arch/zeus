/**
 * Greece grows (slice 31): every ruled city's people, wealth, army and
 * fleet rise and fall, for reasons it names; strong rivals found colonies on
 * the empty sites and take weaker neighbours as vassals.
 *
 * - **Sizes.** Each ruled city has `pop` (people), `wealth` (its treasury,
 *   drachmas), `army` (men under arms, on the scale of the garrisons and bands
 *   the game already uses) and `fleet` (ships; none for an inland city),
 *   shuffled about its character's when Greece is (world.ts: settle).
 * - **Once a month** each changes by named causes, each a small rate: its
 *   last harvest, your trade with it, its own taxes and trade against what
 *   its army, fleet and court cost, a war on and how one ended, a debt to you
 *   gone overdue, a lord's tribute, its colonies, and a pull back towards
 *   what its land and wealth can hold (which keeps every city between about
 *   half and twice its base however long the game runs). Its army and fleet
 *   follow what its people and wealth can keep. Each change is added to the
 *   city's record (`grew`) by cause and year, kept two years, so its page can
 *   say why it grew or shrank.
 * - **Colonies.** From the third year, a well-off ruled city at peace, not a
 *   vassal, with ships, may send settlers to the nearest free site: news when
 *   it says so, and three months later the colony is founded (unless the site
 *   was taken first). The site is then the founder's (`owner`), grows by
 *   itself, adds to the founder's people and wealth, and its good (if it is a
 *   trade good) to what the founder makes.
 * - **Vassals.** From the fourth year, a ruled city whose army is at least two
 *   and a half times a neighbour's, the neighbour cool or worse to it or
 *   lately beaten by it, may make it bow: the vassal's `lord` is set, it pays
 *   its lord a tenth of its income, and it goes to no war of its own (rivals.ts).
 *   It breaks free when its lord is beaten in a war or its own army grows to
 *   two thirds of its lord's.
 *
 * What it changes for your city goes through what the rulers already do:
 * prices and limits follow a city's people (world.ts: scaleOf), what a
 * ruler can lend its wealth (loans.ts), a band and a garrison its army
 * (raids.ts, loans.ts), tribute demands its people against yours
 * (favours.ts), and wars between rivals the two armies (rivals.ts). Nothing
 * here touches your city. What is random is a hash of Greece's seed and the
 * month. Pure.
 */
import { dhypot } from '../map/dmath';
import { PLACES, project, RULED, siteOf, SITES, type CityId } from '../map/greece';
import { hash2 } from '../map/noise';
import { dateOfTick, formatYear, MONTH_NAMES, TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { news } from './diplomacy';
import { FLEECE, OIL, WHEAT, COPPER, type Ware } from './foods';
import { FEUD, foeIn, mutual, PAIRS, warOf } from './rivals';
import type { Growth, Site, SimState, War, World, WorldCity } from './state';
import { tradeIndex } from './trade';
import { characterOf, cityOf, normalStock } from './world';

// ---------------------------------------------------------------------------
// The numbers.

/** A harvest's pull on a city's people over the year after it, failed to rich. */
const HARVEST_RATE = [-0.06, -0.02, 0, 0.02, 0.04];
/** Your trade with a city: a year's trade of this much (dr, both ways) adds a percent a year to its people, up to TRADE_MOST; merchants keep this share of it as wealth. */
const TRADE_PER = 3000;
const TRADE_MOST = 0.03;
const TRADE_PROFIT = 0.15;
/** A war on costs this share of its people a year, its army this much a month, and its upkeep doubles. */
const WAR_RATE = -0.02;
const WAR_LOSSES = 0.03;
/** How a war ended, at once: a defeat costs the loser people, army, fleet and wealth (a share of which goes to the winner); a win costs the winner some men, and brings it people and spoils; a peace costs both men. */
const DEFEAT = { pop: -0.06, army: -0.4, fleet: -0.4, wealth: -0.2 };
const SPOILS = 0.5;
const VICTORY = { pop: 0.02, army: -0.15, fleet: -0.15 };
const PEACE_LOSS = -0.15;
/** A debt to you gone overdue weighs on a city's people and wealth. */
const DEBT_RATE = -0.015;
const DEBT_WEALTH = -0.01;
/** A vassal's people grow a little slower, and it pays its lord this share of its income; a lord's grow a little faster for each vassal. */
const VASSAL_RATE = -0.01;
const LORD_RATE = 0.005;
const TRIBUTE_SHARE = 0.1;
/** Each colony adds this to its founder's people a year, and this much wealth a month for each of its people. */
const COLONY_RATE = 0.003;
const COLONY_COIN = 0.3;
/** The pull back towards what its land can hold: this share of the gap a year. What it can hold: its base, from 0.8 times (no wealth) to 1.6 times (twice its base wealth or more). */
const LAND_PULL = 0.08;
/** Wealth: taxes and trade bring in this share of its base wealth a month at its base people; its army and fleet cost this much at their base (a city with no fleet spends it on its army), and its court and temples spend this share of what it holds. At base it holds steady. */
const INCOME = 0.03;
const ARMY_COST = 0.01;
const FLEET_COST = 0.005;
const SPEND = 0.015;
/** Army and fleet move towards what its people and wealth can keep by this share of the gap a month. */
const MUSTER = 1 / 12;
const BUILD = 1 / 18;
/** Hard bounds, against its base, whatever happens. */
const POP_LEAST = 0.3;
const POP_MOST = 3;

/** Colonies: from the third year; a city needs this many ships, its wealth and people at least these shares of its base; one in so many months (more for a shrewd or greedy ruler, and for Rhodes); none within six years of its last. */
export const COLONY_FROM = 2 * TICKS_PER_YEAR;
const COLONY_SHIPS = 3;
const COLONY_WEALTH = 0.9;
const COLONY_POP = 0.95;
const COLONY_ODDS = 1 / 300;
const COLONY_GAP = 6 * TICKS_PER_YEAR;
/** What sending settlers costs the founder; how long before they land; how many they are; how big a colony grows; how fast. */
const COLONY_COST = 2000;
export const COLONY_SAIL = 90 * TICKS_PER_DAY;
const COLONY_SETTLERS = 300;
const COLONY_MOST = 2000;
const COLONY_GROWTH = 0.08;
/** What a colony adds to its founder's yearly make of its good, if that is a trade good. */
export const COLONY_MAKES = 600;
/** Vassals: from the fourth year; an army this many times the other's; at most this many vassals each; one in so many months (more if proud or warlike). */
export const VASSAL_FROM = 3 * TICKS_PER_YEAR;
const VASSAL_ARMY = 2.5;
const VASSALS_MOST = 2;
const VASSAL_ODDS = 1 / 30;
/** ...and the two cool to each other, this or worse (unless the lord beat it lately). */
const VASSAL_FEELING = -10;
/** Slice 34 (the finding of slice 31: Argos bowed to Sparta in most runs, their usual armies being far apart): a city bows only when it is weak, its army under this share of its usual, or lately beaten in a war. */
const VASSAL_WEAK = 0.8;
/** ...and not again by the lord it lately threw off, while it remembers breaking free (its 'freed' bond lasts two years, and is let go then: review of slice 34, this said four). */
const FREED_FOR = 2 * TICKS_PER_YEAR;
/** A vassal breaks free when its army reaches this share of its lord's. */
const FREE_ARMY = 2 / 3;
/** A defeat counts against a city in a vassal's eyes for this long. */
const BEATEN_FOR = 2 * TICKS_PER_YEAR;

/** How far a city reaches out, for colonies and vassals (1 if not given): Egypt looks to its river more than to the Aegean; Sparta and Thebes to their neighbours. */
const AMBITION: Record<string, number> = { memphis: 0.3, sparta: 1.3, thebes: 1.2 };

/** A site's good as a ware, where it is one already (marble and timber are the works line's, slice 32: wired in at merge). */
const SITE_WARES: Record<string, Ware> = { wheat: WHEAT, oil: OIL, fleece: FLEECE, copper: COPPER };

const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
/** A city's men under arms in words (slice 31 review: as the sim keeps them, on the scale of its garrison, its bands and your own soldiers). */
const men = (army: number): string => `${fmt(Math.round(army))} men`;
const name = (id: CityId): string => (id === 'home' ? 'your city' : (PLACES[id]?.name ?? id));
const round2 = (x: number): number => Math.round(x * 100) / 100;
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));
/** Greece's dice for a month and a purpose (a hash: its generator is never touched). */
const dice = (w: World, month: number, i: number, salt: number): number => hash2(month, i * 53 + salt, (w.seed ^ 0x67726f77) | 0);

/** A city's base sizes (its character's): people, wealth, army, fleet. */
export function baseOf(id: CityId): { pop: number; wealth: number; army: number; fleet: number } {
  const ch = characterOf(id);
  return ch ? { pop: ch.people, wealth: ch.wealth, army: ch.army, fleet: ch.fleet } : { pop: 0, wealth: 0, army: 0, fleet: 0 };
}

/** The game's year a tick is in (BC, counting down: the key a growth record is kept under). */
const yearOf = (tick: number): number => dateOfTick(tick).yearBC;

/** Add a change to a city's record, under its cause and this year. */
function note(c: WorldCity, tick: number, kind: string, why: string, d: Partial<Pick<Growth, 'pop' | 'wealth' | 'army' | 'fleet'>>): void {
  const year = yearOf(tick);
  let g = c.grew.find((x) => x.kind === kind && x.year === year && x.why === why);
  if (!g) {
    g = { kind, year, why, pop: 0, wealth: 0, army: 0, fleet: 0 };
    c.grew.push(g);
  }
  g.pop = round2(g.pop + (d.pop ?? 0));
  g.wealth = round2(g.wealth + (d.wealth ?? 0));
  g.army = round2(g.army + (d.army ?? 0));
  g.fleet = round2(g.fleet + (d.fleet ?? 0));
}

/** Apply a change and note it (slice 34: vassals.ts takes a vassal's tribute this way). */
export function change(c: WorldCity, tick: number, kind: string, why: string, d: Partial<Pick<Growth, 'pop' | 'wealth' | 'army' | 'fleet'>>): void {
  const b = baseOf(c.id);
  const before = { pop: c.pop, wealth: c.wealth, army: c.army, fleet: c.fleet };
  c.pop = round2(clamp(c.pop + (d.pop ?? 0), b.pop * POP_LEAST, b.pop * POP_MOST));
  c.wealth = round2(Math.max(0, c.wealth + (d.wealth ?? 0)));
  c.army = round2(Math.max(1, c.army + (d.army ?? 0)));
  c.fleet = round2(Math.max(0, c.fleet + (d.fleet ?? 0)));
  note(c, tick, kind, why, { pop: c.pop - before.pop, wealth: c.wealth - before.wealth, army: c.army - before.army, fleet: c.fleet - before.fleet });
}

/** What you traded with a city in the last twelve months, both ways, at its prices now (dr). */
export function tradeWithYou(c: WorldCity): number {
  let v = 0;
  c.dealt.forEach((months, k) => {
    const n = months.reduce((a, x) => a + Math.abs(x), 0);
    v += (n * (c.price[k] ?? 0)) / 100;
  });
  return v;
}

/** The cities a city is lord of. */
export const vassalsOf = (w: World, id: CityId): WorldCity[] => w.cities.filter((c) => c.lord === id);
/** The sites a city holds. */
export const coloniesOf = (w: World, id: CityId): Site[] => w.sites.filter((x) => x.owner === id);

// ---------------------------------------------------------------------------
// Each month.

/**
 * Greece's growth, on the first of each month: wars lately ended leave their
 * mark, then each ruled city's people, wealth, army and fleet move; then the
 * colonies (landings, growth, new settlers sent) and the vassals (bowing,
 * breaking free). Touches nothing but `world`.
 */
export function stepGrowth(s: SimState): void {
  if (s.tick % TICKS_PER_MONTH !== 0 || s.tick === 0) return;
  const w = s.world;
  const month = Math.floor(s.tick / TICKS_PER_MONTH);
  for (const x of w.wars) if (x.ended > s.tick - TICKS_PER_MONTH && x.ended <= s.tick) warEnded(s, x);
  for (const c of w.cities) if (c.ruler && c.pop > 0) grow(s, c);
  colonies(s, month);
  vassals(s, month);
  // Records older than last year are let go.
  const keep = yearOf(s.tick) + 1;
  for (const c of w.cities) if (c.grew.some((g) => g.year > keep)) c.grew = c.grew.filter((g) => g.year <= keep);
}

/** A city's month: its people by each cause, its wealth, its army and fleet. */
function grow(s: SimState, c: WorldCity): void {
  const w = s.world;
  const t = s.tick;
  const b = baseOf(c.id);
  const m = 1 / 12;
  // People.
  const h = HARVEST_RATE[c.harvest] ?? 0;
  if (h) change(c, t, 'harvest', h > 0 ? 'good harvests' : 'poor harvests', { pop: c.pop * h * m });
  const traded = tradeWithYou(c);
  if (traded > 0) change(c, t, 'trade', 'trade with you', { pop: c.pop * Math.min(TRADE_MOST, (traded / TRADE_PER) * 0.01) * m, wealth: traded * TRADE_PROFIT * m });
  const war = warOf(w, c.id);
  if (war) {
    const foe = foeIn(war, c.id);
    change(c, t, 'war', `its war with ${name(foe)}`, { pop: c.pop * WAR_RATE * m, army: -c.army * WAR_LOSSES, fleet: war.by === 'sea' ? -c.fleet * WAR_LOSSES : 0 });
  }
  const owes = w.loans.some((l) => l.city === c.id && l.side === 'out' && l.state === 'overdue');
  if (owes) change(c, t, 'debt', 'its unpaid debt to you', { pop: c.pop * DEBT_RATE * m, wealth: b.wealth * DEBT_WEALTH });
  if (c.lord) change(c, t, 'vassal', `bowed to ${name(c.lord)}`, { pop: c.pop * VASSAL_RATE * m });
  const vassals = vassalsOf(w, c.id);
  if (vassals.length) change(c, t, 'lord', vassals.length > 1 ? `lord of ${vassals.map((v) => name(v.id)).join(' and ')}` : `lord of ${name(vassals[0].id)}`, { pop: c.pop * LORD_RATE * vassals.length * m });
  for (const site of coloniesOf(w, c.id)) change(c, t, 'colony', `its colony on ${siteOf(site.id)?.name ?? site.id}`, { pop: c.pop * COLONY_RATE * m, wealth: site.pop * COLONY_COIN });
  // The pull back towards what its land can hold, with its wealth.
  const hold = b.pop * (0.8 + 0.4 * clamp(c.wealth / Math.max(1, b.wealth), 0, 2));
  const gap = (hold - c.pop) / hold;
  if (Math.abs(gap) > 0.001) change(c, t, 'land', gap > 0 ? 'room to grow on its land' : 'more people than its land feeds', { pop: c.pop * gap * LAND_PULL * m });
  // Wealth: taxes and its own trade, against its army, fleet and court (and its tribute, as a vassal).
  const income = b.wealth * INCOME * (c.pop / b.pop);
  const upkeep = (b.fleet > 0 ? b.wealth * ARMY_COST * (c.army / b.army) + b.wealth * FLEET_COST * (c.fleet / b.fleet) : b.wealth * (ARMY_COST + FLEET_COST) * (c.army / b.army)) * (war ? 2 : 1);
  const spend = c.wealth * SPEND;
  change(c, t, 'own', 'its own taxes and trade, against its army, fleet and court', { wealth: income - upkeep - spend });
  // (Slice 34: a vassal of yours pays its tribute in caravans, vassals.ts.)
  if (c.lord && c.lord !== 'home') {
    const lord = cityOf(w, c.lord);
    const due = income * TRIBUTE_SHARE;
    change(c, t, 'vassal', `bowed to ${name(c.lord)}`, { wealth: -due });
    change(lord, t, 'lord', `tribute from ${name(c.id)}`, { wealth: due });
  }
  // Army and fleet: what its people and wealth can keep.
  const means = clamp(0.6 + 0.4 * (c.wealth / Math.max(1, b.wealth)), 0.6, 1.4);
  const army = b.army * (c.pop / b.pop) * means * (c.ruler?.traits.includes('warlike') ? 1.2 : 1);
  if (Math.abs(army - c.army) > 0.01) change(c, t, 'muster', army > c.army ? 'raising men' : 'letting men go home', { army: (army - c.army) * MUSTER });
  if (b.fleet > 0) {
    const fleet = b.fleet * (c.pop / b.pop) * means;
    if (Math.abs(fleet - c.fleet) > 0.01) change(c, t, 'muster', fleet > c.fleet ? 'building ships' : 'laying ships up', { fleet: (fleet - c.fleet) * BUILD });
  }
}

/** A war lately ended leaves its mark on both sides: a defeat, a win, a weary peace. */
function warEnded(s: SimState, x: War): void {
  const w = s.world;
  const a = cityOf(w, x.a);
  const b = cityOf(w, x.b);
  if (!a.pop || !b.pop) return;
  if (x.fate === 'peace') {
    for (const c of [a, b]) change(c, s.tick, 'peace', `the war with ${name(foeIn(x, c.id))}, ended in peace`, { army: c.army * PEACE_LOSS, fleet: x.by === 'sea' ? c.fleet * PEACE_LOSS : 0 });
    return;
  }
  const win = cityOf(w, x.fate);
  const lose = cityOf(w, foeIn(x, x.fate));
  const lost = lose.wealth * -DEFEAT.wealth;
  change(lose, s.tick, 'defeat', `lost its war with ${name(win.id)}`, { pop: lose.pop * DEFEAT.pop, army: lose.army * DEFEAT.army, fleet: x.by === 'sea' ? lose.fleet * DEFEAT.fleet : 0, wealth: -lost });
  change(win, s.tick, 'victory', `won its war with ${name(lose.id)}`, { pop: win.pop * VICTORY.pop, army: win.army * VICTORY.army, fleet: x.by === 'sea' ? win.fleet * VICTORY.fleet : 0, wealth: lost * SPOILS });
}

// ---------------------------------------------------------------------------
// Colonies.

/** How far a city is from a site on the table. */
function reach(id: CityId, site: string): number {
  const p = PLACES[id];
  const q = siteOf(site);
  if (!p || !q) return Infinity;
  const [x0, z0] = project(p.lon, p.lat);
  const [x1, z1] = project(q.lon, q.lat);
  return dhypot(x1 - x0, z1 - z0);
}

/** Why a city can't send settlers now ('' if it can). */
export function colonyRefusal(s: SimState, c: WorldCity): string {
  const w = s.world;
  const b = baseOf(c.id);
  if (!c.ruler || !c.pop) return 'no ruler';
  if (c.lord) return 'a vassal';
  if (warOf(w, c.id)) return 'at war';
  if (c.fleet < COLONY_SHIPS) return 'too few ships';
  if (c.wealth < b.wealth * COLONY_WEALTH) return 'too poor';
  if (c.pop < b.pop * COLONY_POP) return 'too few people';
  if (w.sites.some((x) => x.bound === c.id)) return 'settlers already on their way';
  if (w.sites.some((x) => x.owner === c.id && s.tick - x.since < COLONY_GAP)) return 'a colony founded lately';
  return '';
}

/** The nearest free site to a city with nobody bound for it, if any. */
export function nearestFree(w: World, id: CityId): Site | undefined {
  return w.sites.filter((x) => x.owner === '' && x.bound === '').sort((a, b) => reach(id, a.id) - reach(id, b.id))[0];
}

/** Settlers land and found colonies; colonies grow; now and then a city sends settlers out. */
function colonies(s: SimState, month: number): void {
  const w = s.world;
  for (const site of w.sites) {
    if (site.bound && s.tick >= site.lands) land(s, site);
    if (site.owner && site.owner !== 'home') site.pop = round2(site.pop + site.pop * COLONY_GROWTH * (1 - site.pop / COLONY_MOST) / 12);
  }
  if (s.tick < COLONY_FROM) return;
  w.cities.forEach((c, i) => {
    if (colonyRefusal(s, c)) return;
    const t = c.ruler?.traits ?? [];
    const odds = COLONY_ODDS * (t.includes('shrewd') || t.includes('greedy') ? 1.5 : 1) * (c.id === 'rhodes' ? 2 : 1) * (AMBITION[c.id] ?? 1) * (c.pop / baseOf(c.id).pop);
    if (dice(w, month, i, 41) >= odds) return;
    const site = nearestFree(w, c.id);
    if (site) sendSettlers(s, c, site);
  });
}

/**
 * A city fits out ships for settlers bound for a site: a line of news, the
 * cost to its treasury, and three months until they land. (Demos call this
 * to stage a colony.)
 */
export function sendSettlers(s: SimState, c: WorldCity, site: Site, why = ''): void {
  const p = siteOf(site.id);
  site.bound = c.id;
  site.told = s.tick;
  site.lands = s.tick + COLONY_SAIL;
  change(c, s.tick, 'colony', `settlers sent to ${p?.name ?? site.id}`, { wealth: -COLONY_COST });
  told(s.world, s.tick, c.id, `${name(c.id)} is fitting out ships for settlers bound for ${p?.name ?? site.id}: they land within three months${why ? ` (${why})` : ''}`);
}

/** Settlers reach their site: a colony, unless it was taken first. */
function land(s: SimState, site: Site): void {
  const w = s.world;
  const by = site.bound as CityId;
  const p = siteOf(site.id);
  site.bound = '';
  if (site.owner) {
    told(w, s.tick, by, `${name(by)}’s settlers found ${p?.name ?? site.id} already taken by ${name(site.owner)}, and sailed home`);
    return;
  }
  site.owner = by;
  site.since = s.tick;
  site.pop = COLONY_SETTLERS;
  const c = cityOf(w, by);
  const ware = p ? SITE_WARES[p.good] : undefined;
  const k = ware === undefined ? -1 : tradeIndex(ware);
  if (k >= 0) c.make[k] += COLONY_MAKES;
  told(w, s.tick, by, `${cap(adjective(by))} settlers have founded a colony on ${p?.name ?? site.id}: ${p?.good ?? 'its goods'} for ${name(by)}`);
}

/** "Rhodian", "Athenian": a city's people as a word. */
export function adjective(id: CityId): string {
  return ADJECTIVES[id] ?? `${name(id)}’s`;
}
const ADJECTIVES: Record<string, string> = { home: 'your', athens: 'Athenian', sparta: 'Spartan', corinth: 'Corinthian', troy: 'Trojan', thebes: 'Theban', argos: 'Argive', knossos: 'Cretan', rhodes: 'Rhodian', memphis: 'Egyptian', tyre: 'Tyrian' };

// ---------------------------------------------------------------------------
// Vassals.

/** Why a city wouldn't take another as its vassal now ('' if it would). */
export function vassalRefusal(s: SimState, lord: WorldCity, v: WorldCity): string {
  const w = s.world;
  if (!lord.ruler || !v.ruler || !lord.pop || !v.pop) return 'no ruler';
  if (lord.lord || v.lord) return 'a vassal already';
  if (vassalsOf(w, lord.id).length >= VASSALS_MOST) return 'enough vassals';
  if (lord.army < v.army * VASSAL_ARMY) return 'not strong enough';
  const x = warOf(w, lord.id);
  if (x && foeIn(x, lord.id) === v.id) return 'at war';
  const beaten = w.wars.some((y) => y.ended > 0 && s.tick - y.ended < BEATEN_FOR && y.fate === lord.id && foeIn(y, lord.id) === v.id);
  if (!beaten && mutual(w, lord.id, v.id, s.tick) > VASSAL_FEELING) return 'on good enough terms';
  if (!beaten && (v.army >= baseOf(v.id).army * VASSAL_WEAK || mutual(w, lord.id, v.id, s.tick) > FEUD)) return 'not weak enough';
  if (v.bonds.some((b) => b.kind === 'freed' && b.city === lord.id && s.tick - b.tick < FREED_FOR)) return 'lately free of it';
  return '';
}

/** Weak neighbours bow to strong ones; vassals whose lord was beaten, or who have grown strong, break free. */
function vassals(s: SimState, month: number): void {
  const w = s.world;
  for (const v of w.cities) {
    // (Slice 34: your vassals are held by their loyalty, vassals.ts.)
    if (!v.lord || v.lord === 'home') continue;
    const lord = cityOf(w, v.lord);
    const beaten = w.wars.find((y) => y.ended > v.lordSince && y.ended > s.tick - TICKS_PER_MONTH && (y.a === lord.id || y.b === lord.id) && y.fate !== 'peace' && y.fate !== lord.id);
    if (beaten || v.army >= lord.army * FREE_ARMY) {
      const was = v.lord;
      v.lord = '';
      v.lordSince = s.tick;
      v.bonds.push({ kind: 'freed', city: was, why: `threw off ${name(was)}’s rule`, amount: -10, tick: s.tick, fade: 2 * TICKS_PER_YEAR });
      told(w, s.tick, v.id, `${name(v.id)} has thrown off ${name(was)}’s rule: ${beaten ? `${name(was)} lost its war with ${name(foeIn(beaten, was))}` : `its army of ${men(v.army)} is a match for ${name(was)}’s ${men(lord.army)}`}`);
    }
  }
  if (s.tick < VASSAL_FROM) return;
  PAIRS.forEach(([x, y], i) => {
    const a = cityOf(w, x);
    const b = cityOf(w, y);
    const [lord, v] = a.army >= b.army ? [a, b] : [b, a];
    if (vassalRefusal(s, lord, v)) return;
    const t = lord.ruler?.traits ?? [];
    if (dice(w, month, i, 61) >= VASSAL_ODDS * (t.includes('proud') || t.includes('warlike') ? 1.5 : 1) * (AMBITION[lord.id] ?? 1)) return;
    bow(s, lord, v);
  });
}

/** A city bows to another: it is the other's vassal from today, with a line of news saying why. (Demos call this to stage one.) */
export function bow(s: SimState, lord: WorldCity, v: WorldCity, why = ''): void {
  const w = s.world;
  v.lord = lord.id;
  v.lordSince = s.tick;
  v.bonds.push({ kind: 'bowed', city: lord.id, why: `made to bow to ${name(lord.id)}`, amount: -10, tick: s.tick, fade: 3 * TICKS_PER_YEAR });
  const beaten = w.wars.some((y) => y.ended > 0 && s.tick - y.ended < BEATEN_FOR && y.fate === lord.id && foeIn(y, lord.id) === v.id);
  const reason = why || `its army of ${men(v.army)} against ${name(lord.id)}’s ${men(lord.army)}${beaten ? ', and the war it lost to them' : ''}`;
  told(w, s.tick, v.id, `${name(v.id)} has bowed to ${name(lord.id)}: ${reason}. ${name(v.id)} now pays ${name(lord.id)} tribute`);
}

// ---------------------------------------------------------------------------
// In words.

const cap = (t: string): string => `${t[0].toUpperCase()}${t.slice(1)}`;

/** A line of Greece's own news (the map's list always; under the top bar once your city has dealt with Greece). */
function told(w: World, tick: number, city: CityId, line: string): void {
  news(w, tick, city, line);
  w.news[w.news.length - 1].greece = true;
}

/** "since January 747 BC": the start of last year, from which a city's record counts. */
export function recordSince(tick: number): string {
  return `since ${MONTH_NAMES[0]} ${formatYear(yearOf(tick) + 1)}`;
}

export interface SizeWhy {
  /** What it is now, what it was at the start of the record, and the change as a share. */
  now: number;
  was: number;
  share: number;
  /** The causes, biggest first: what each added (+) or took (−). */
  why: Array<{ why: string; n: number }>;
}

/** A city's people, wealth, army or fleet with its change since the start of last year and the reasons, biggest first (causes under a hundredth of the change are folded away). */
export function sizeWhy(c: WorldCity, what: 'pop' | 'wealth' | 'army' | 'fleet'): SizeWhy {
  const by = new Map<string, number>();
  for (const g of c.grew) by.set(g.why, (by.get(g.why) ?? 0) + g[what]);
  const total = [...by.values()].reduce((a, n) => a + n, 0);
  const now = c[what];
  const was = now - total;
  const least = Math.max(Math.abs(total) * 0.05, what === 'pop' ? Math.max(5, now * 0.003) : what === 'wealth' ? 50 : 0.3);
  const why = [...by.entries()]
    .map(([w2, n]) => ({ why: w2, n }))
    .filter((x) => Math.abs(x.n) >= least)
    .sort((a, b) => Math.abs(b.n) - Math.abs(a.n));
  return { now, was, share: was > 0 ? total / was : 0, why };
}

/** Growing, shrinking or steady over the last year or so: +1, -1, 0 (a twentieth either way). */
export function trendOf(c: WorldCity, what: 'pop' | 'wealth' | 'army' | 'fleet' = 'pop'): -1 | 0 | 1 {
  const x = sizeWhy(c, what);
  return x.share >= 0.05 ? 1 : x.share <= -0.05 ? -1 : 0;
}

/** A city's wealth in a word, against its base. */
export function wealthWord(c: WorldCity): string {
  const r = c.wealth / Math.max(1, baseOf(c.id).wealth);
  return r >= 1.5 ? 'very rich' : r >= 1.1 ? 'rich' : r >= 0.75 ? 'comfortable' : r >= 0.4 ? 'hard up' : 'poor';
}

/** "Argos, Sparta's vassal since 746 BC" or "": a city's standing with others. */
export function lordWords(c: WorldCity): string {
  if (!c.lord) return '';
  // (Slice 34: your own.)
  if (c.lord === 'home') return `your vassal since ${formatYear(yearOf(c.lordSince))}`;
  return `${name(c.lord)}’s vassal since ${formatYear(yearOf(c.lordSince))}`;
}

/** A site in words: "a Rhodian colony since 745 BC, about 640 people", "settlers from Rhodes land within 40 days", or "free". */
export function siteWords(s: SimState, site: Site): string {
  if (site.owner) return `${site.owner === 'home' ? 'your' : `a ${adjective(site.owner)}`} colony since ${formatYear(yearOf(site.since))}, about ${fmt(Math.round(site.pop / 10) * 10)} people`;
  if (site.bound) return `settlers from ${name(site.bound)} land within ${Math.max(1, Math.ceil((site.lands - s.tick) / TICKS_PER_DAY))} days`;
  return 'no city yet: a place to found one';
}

/** The normal stock a city keeps of a good now (for the page: what its size means for your trade). */
export const stockNow = (c: WorldCity, k: number): number => normalStock(c, k);

/** Every ruled city's people, wealth, army and fleet in a line each, for the probe and the smoke test. */
export const sizes = (w: World): Record<string, string> => Object.fromEntries(RULED.map((id) => cityOf(w, id)).map((c) => [c.id, `${fmt(c.pop)} people, ${fmt(c.wealth)} dr, ${men(c.army)}, ${fmt(c.fleet)} ships${c.lord ? `, ${c.lord}’s vassal` : ''}`]));

/** The sites as a list, for the probe and the smoke test. */
export const siteList = (w: World): string[] => w.sites.map((x) => `${x.id}: ${x.owner || (x.bound ? `${x.bound} bound` : 'free')}`);

/** Every site's place (for the map). */
export const SITE_PLACES = SITES;
