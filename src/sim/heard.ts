/**
 * What the town hears (slice 44): every news source routed into the town's
 * message log (messages.ts), once each and never twice.
 *
 * - **The news logs.** Greece's (`world.news`: the rulers, raids, loans,
 *   vassals, colonies, fleets and blockades), the army's (`army.news`) and
 *   crime's (`crime.news`) are each read with a cursor, the tick and count
 *   last heard, at the end of every tick and as soon as commands are applied
 *   (a line a command pushes while paused is heard at once). Each line's kind
 *   and urgency come from its words (RULES) and where it is from. Greece's own
 *   doings are heard only once the town deals with Greece, as the lines under
 *   the top bar did. A line told by both the army and Greece (the same words,
 *   or the same up to their first stop within a fortnight) is said once.
 * - **The watchers.** What only shows in the state (a fire, the merchant ship
 *   sighted, a caravan in, a stage of a monument finished, a laurel, a new
 *   season, a loan due that the treasury can't meet, a ruler's ask nearly
 *   due) is said the tick it first becomes true. The facts true at the last
 *   look are kept as short keys (`seen`), so nothing is said twice, across a
 *   save too.
 *
 * Nothing here changes the town: it only reads, and writes the log through
 * `say`. Pure and deterministic.
 */
import type { CoastMap } from '../map/bake';
import { PLACES } from '../map/greece';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from './clock';
import { ALARM, NEWS, say, titleFrom, WARNING, type Cursor, type MessageKind, type Place, type Urgency } from './messages';
import { SEASON_NAMES, TICKS_PER_SEASON, seasonAt } from './seasons';
import type { SimState } from './state';
import type { CrimeNews } from './crime';
import { FIRE_BURNING, FIRE_SMOULDER } from './hazards';
import { burningLine, creakLine, dealLine, rubbleLine, shipLine, smoulderLine, traderLine } from './status';
import { openDeals } from './favours';
import { spendable } from './treasury';
import { ambitionTownLine } from './ambitions';
import { monumentTownLine } from './monumentstatus';
import { gamesSoon } from './monumentworks';
import { monumentName } from './monuments';
import { SHIP_COMING } from './trade';
import { raidLine } from './raids';

const cityName = (id: string): string => PLACES[id]?.name ?? id;

// ---------------------------------------------------------------------------
// The news logs.

/** Lines pushed to a log since its cursor, in order; moves the cursor to the log's end. */
function since<T extends { tick: number }>(list: readonly T[], cur: Cursor): T[] {
  const out: T[] = [];
  let same = 0;
  for (const n of list) {
    if (n.tick < cur[0]) continue;
    if (n.tick === cur[0] && ++same <= cur[1]) continue;
    out.push(n);
  }
  const last = list[list.length - 1];
  if (last) {
    let k = 0;
    for (const n of list) if (n.tick === last.tick) k++;
    cur[0] = last.tick;
    cur[1] = k;
  }
  return out;
}

/** What a line of news is, from its words: the first rule that matches (urgency -1: the line's own, a warning if it can't wait). */
const RULES: ReadonlyArray<[RegExp, MessageKind, Urgency | -1]> = [
  // Merge of slice 47: a colony's (or free ally's) militia sailing to your aid, ashore at your quay or sailing with your army are the war's
  // news; a strike from a colony sailing and coming back is the army's; a company landing in a colony, triremes stationed off one or home
  // from it, and a treaty signed are the colony's. All of them news, not warnings (a colony talking of freedom stays a warning).
  [/ sends its militia, |^The militia of .+ (are ashore at your quay|sail to meet your army)/, 'army', NEWS],
  [/ sails from .+ to raid | is back at .+ from /, 'army', NEWS],
  [/ has landed at .+ and holds it| to be stationed off | triremes? comes? home from |^You have signed a treaty with /, 'colony', NEWS],
  // A band in at the edge of your land or on your shore: the alarm.
  [/^Raiders! |army is in at the \w+ edge of your land|^Sails! .+ ships are in sight off your shore|army is ashore/, 'raid', ALARM],
  [/ships hold the mouth of your harbour/, 'blockade', ALARM],
  [/has risen and thrown off your rule|has declared itself free/, 'rebellion', ALARM],
  // (A blockade lifted or broken, a band gone or beaten: news, not a warning.)
  [/lifted its blockade|broken .+ blockade|will not blockade/, 'blockade', NEWS],
  [/blockad/, 'blockade', -1],
  [/\b(raiders|army)\b.*\b(have gone|has gone|have left|has left|sailed home|gone home|flee overland)\b|breaks? and runs? for|found nothing worth/, 'raid', NEWS],
  [/raiders|war band|army gathers|out of patience|will wait no longer/i, 'raid', -1],
  [/fleet|warships|triremes|pirates|ships of .+ are sailing for/i, 'fleet', -1],
  [/^Your army|your soldiers|raiding party|full force|expedition|to march with your army/i, 'army', -1],
  [/vassal|tribute is (on its way|in)|sends no tribute|has bowed to you| is arming|stands down|thought better of rising|alliance|as an ally|call to join|answer .+ call|^Your herald/i, 'vassal', -1],
  [/ (asks for|asks to borrow|demands|offers) |yearly tribute comes round/, 'deal', WARNING],
  [/loan|lend |borrow|owes you|you owe|debt/i, 'loan', -1],
];

/** A line of Greece's news, or the army's: its kind and urgency. */
export function kindOfLine(line: string, urgent: boolean, site: boolean, fallback: MessageKind, greece = false): { kind: MessageKind; u: Urgency } {
  // (Greece's own doings, its feuds, wars and festivals, are the News of Greece whatever they name.)
  if (greece) return { kind: 'greece', u: urgent ? WARNING : NEWS };
  for (const [re, kind, u] of RULES) {
    if (!re.test(line)) continue;
    // (A colony's own news is the empire's, unless it is its revolt or a fleet or raid against it.)
    if (site && (kind === 'vassal' || kind === 'loan' || kind === 'deal')) break;
    return { kind, u: u === -1 ? (urgent ? WARNING : NEWS) : u };
  }
  return { kind: site ? 'colony' : fallback, u: urgent ? WARNING : NEWS };
}

/** The same up to the first stop, a gate or wall named either way (as the town lines told the army's news and Greece's apart). */
const lead = (t: string): string => t.replace(/ your (gate|wall)/, ' the $1').split(/[:,]/)[0];

/** Was this told lately in other words, by the army or Greece (the war's messages of the last fortnight)? */
function toldLately(s: SimState, tick: number, line: string): boolean {
  const l = lead(line);
  const log = s.messages.log;
  for (let i = log.length - 1; i >= 0 && tick - log[i].tick < 14 * TICKS_PER_DAY; i--) {
    const m = log[i];
    if ((m.kind === 'army' || m.kind === 'raid' || m.kind === 'blockade' || m.kind === 'fleet') && lead(m.words) === l) return true;
  }
  return false;
}

/** Where a war's line is: the raiders' way in on your map while a band from that city is out, else the city. */
function warPlace(s: SimState, city: string): Place {
  const r = [...s.world.raids].reverse().find((x) => x.city === city && (x.phase === 'raiding' || x.phase === 'homeward' || x.phase === 'turned') && (x.shore >= 0 || x.edge >= 0));
  if (r) return { tile: r.shore >= 0 ? r.shore : r.edge };
  return { city };
}

/** Merge of slice 47: the trading post a colony's militia came ashore by, while they are ashore (0: none). */
function militiaQuay(s: SimState, site: string): number {
  const m = (s.empire.militia ?? []).find((x) => x.site === site && x.phase === 'ashore' && x.post > 0);
  return m && s.buildings.some((b) => b.id === m.post) ? m.post : 0;
}

/** Hear what the three news logs have said since last time. */
export function hear(s: SimState): void {
  const h = s.messages.heard;
  // (Greece's first: a line both tell in the same words, a blockade's, keeps Greece's place and urgency.)
  for (const n of since(s.world.news, h.world)) {
    if (n.greece && !s.world.contact) continue;
    if (toldLately(s, n.tick, n.line)) continue;
    const site = n.city.startsWith('site:');
    // (Slice 48: an alarm is known by its kind; a line from before kinds, by its words.)
    const k = n.alarm ? { kind: n.alarm, u: ALARM as Urgency } : kindOfLine(n.line, !!n.urgent, site, 'greece', !!n.greece);
    // (Merge of slice 47: a colony's militia ashore at your quay are found there, at the trading post they landed by.)
    const quay = site && k.kind === 'army' ? militiaQuay(s, n.city.slice(5)) : 0;
    const at: Place = quay > 0 ? { building: quay } : site ? { site: n.city.slice(5) } : k.kind === 'raid' ? warPlace(s, n.city) : { city: n.city };
    say(s, { kind: k.kind, u: k.u, words: `${n.line}.`, tick: n.tick, at });
  }
  for (const n of since(s.army.news, h.army)) {
    if (toldLately(s, n.tick, n.line)) continue;
    const k = kindOfLine(n.line, false, false, 'army');
    say(s, { kind: k.kind, u: k.u, words: `${n.line}.`, tick: n.tick, at: n.at > 0 ? { building: n.at } : undefined });
  }
  for (const n of since(s.crime.news, h.crime)) say(s, { kind: n.kind === 'breakout' ? 'breakout' : 'crime', u: CRIME_URGENCY[n.kind] ?? NEWS, words: `${n.line}.`, tick: n.tick, at: n.at > 0 ? { building: n.at } : undefined, of: n.kind });
}

/**
 * How urgent crime's news is, by its kind (merge of slice 41): an arson an
 * alarm (its fire is a fire alarm of its own, which is what pops up); talk of
 * burning, a gang gathering, a gang taking its den and its men beating off a
 * watchman warnings; the rest (a crime done, a catch, a building smashed or
 * mended, the talk dying down, a gang broken up) news.
 *
 * Merge of slice 45: the court's news (one brought in for trial, a
 * sentence, one home again) is news; a prison growing restless is a
 * warning (said once as it is warned; the crime line under the top bar
 * keeps saying it while it stands), and its unrest eased is news; a
 * breakout is an alarm, and pops up (its own kind of message, under Crime).
 */
const CRIME_URGENCY: Partial<Record<CrimeNews['kind'], Urgency>> = { arson: ALARM, talk: WARNING, gathering: WARNING, gang: WARNING, beaten: WARNING, court: NEWS, sentence: NEWS, freed: NEWS, unrest: WARNING, breakout: ALARM, eased: NEWS };

// ---------------------------------------------------------------------------
// The watchers.

/** Keys kept from one daily look to the next (the daily watchers' facts start with this). */
const DAILY = 'd:';
/** How a ruler's ask (or threat) nearly due begins. */
const WAITING = 'Still waiting on you: ';
/** A ruler's ask still unanswered this long before it is due is said again, as a warning. */
const DUE_WARN = 7 * TICKS_PER_DAY;

const SEASON_WORDS = [
  'Spring: the fields green again and the flocks bear their young. Ships sail on time.',
  'Summer: the wheat ripens in the fields, and the olives and grapes swell on the slopes.',
  'Autumn: harvest time. The granaries fill, and the olives and grapes are picked. Winter is three months off.',
  'Winter: the fields give little until spring, storms hold ships back in the gulf, and most armies stay at home.',
];

/**
 * Look at the town, once a tick after everything else has moved, and say
 * what has become true since the last look. `heard` first (hear), then the
 * watchers.
 */
export function stepMessages(s: SimState, map: CoastMap): void {
  hear(s);
  const g = s.messages;
  const from = g.looked;
  const now = s.tick;
  // (Also run as commands are applied, paused or not, at the tick already looked at: then only the facts are looked at, and
  // nothing that happens at a tick is counted twice.)
  const moved = now > from;
  if (moved) g.looked = now;
  const was = new Set(g.seen);
  const keys: string[] = [];
  /** A fact true now: said if it wasn't at the last look. */
  const fact = (key: string, words: () => string, kind: MessageKind, u: Urgency, at?: Place, title?: (w: string) => string): void => {
    keys.push(key);
    if (was.has(key)) return;
    const w = words();
    say(s, { kind, u, words: w, at, title: title?.(w) });
  };
  /** Did something happen since the last look (its tick in (from, now])? */
  const lately = (t: number): boolean => moved && t > from && t <= now;

  // Fire and collapse.
  for (const b of s.buildings) {
    if (b.fire === FIRE_BURNING) fact(`F${b.id}`, () => burningLine(s, map, b), 'fire', ALARM, { building: b.id });
    else if (b.fire === FIRE_SMOULDER) fact(`S${b.id}`, () => smoulderLine(s, map, b), 'fire', WARNING, { building: b.id });
    if (b.creakAt > 0) fact(`C${b.id}`, () => creakLine(s, map, b), 'collapse', WARNING, { building: b.id });
    if (b.kind === 'rubble' && lately(b.placed)) say(s, { kind: 'collapse', words: rubbleLine(s, map, b), at: { building: b.id } });
  }

  // The merchant ship sighted, and goods lost with the trading post.
  const post = s.buildings.find((b) => b.kind === 'trading');
  if (post && s.trade.ship.phase === SHIP_COMING) fact('ship', () => shipLine(s), 'ship', NEWS, { building: post.id });
  const t = s.trade;
  if (!post && t.lostAt > 0 && now - t.lostAt < TICKS_PER_MONTH && t.lost.some((n) => n > 0)) fact(`lost:${t.lostAt}`, () => shipLine(s), 'ship', WARNING);
  // Caravans and ships on the routes: in, or turned back.
  for (const r of s.world.routes) {
    const tr = traderLine(s, r);
    if (!tr) continue;
    if (tr.missed) {
      if (lately(r.missedAt)) say(s, { kind: r.kind === 'land' ? 'caravan' : 'ship', u: WARNING, words: tr.text, at: tr.at ? { building: tr.at } : { city: r.city } });
    } else fact(`${r.kind === 'land' ? 'c' : 'v'}:${r.city}`, () => tr.text, r.kind === 'land' ? 'caravan' : 'ship', NEWS, tr.at ? { building: tr.at } : { city: r.city });
  }

  // The monuments: a stage or a monument finished, the games.
  for (const x of s.monuments.sites) {
    // (Slice 54: a sanctuary tells its own news, sanctuaries.ts.)
    if (x.kind === 'sanctuary') continue;
    const done = x.done[x.done.length - 1];
    if (x.finished && lately(x.finished)) say(s, { kind: 'monument', words: monumentWords(s, x.id, `${monumentName(x.kind, true)} is finished.`), at: { building: x.id } });
    else if (done !== undefined && lately(done)) say(s, { kind: 'monument', words: monumentWords(s, x.id, `${monumentName(x.kind, true)}: a stage is finished.`), at: { building: x.id } });
  }
  const games = s.monuments.games;
  const stadium = s.monuments.sites.find((x) => x.kind === 'stadium');
  if (stadium && gamesSoon(s)) fact(`gs${games.next}`, () => monumentWords(s, stadium.id, 'The games at the Stadium open soon.'), 'monument', NEWS, { building: stadium.id });
  if (stadium && games.until > now && games.next <= now) fact(`go${games.held}`, () => `The games open at the Stadium: visitors pour in from the roads, and every home is in a festival mood until ${games.until > now ? `${Math.ceil((games.until - now) / TICKS_PER_DAY)} days on` : 'they close'}.`, 'monument', NEWS, { building: stadium.id });

  // Laurels.
  const a = s.ambition;
  if (a.on) {
    if (a.reached.some((l) => !l.quiet && lately(l.tick)) || (a.grand && !a.grandQuiet && lately(a.grand))) {
      const line = ambitionTownLine(s);
      if (line) say(s, { kind: 'laurel', words: line });
    }
  }

  // A new season.
  if (moved && s.season.on && Math.floor(now / TICKS_PER_SEASON) !== Math.floor(from / TICKS_PER_SEASON)) say(s, { kind: 'season', words: SEASON_WORDS[seasonAt(now)], title: `${SEASON_NAMES[seasonAt(now)][0].toUpperCase()}${SEASON_NAMES[seasonAt(now)].slice(1)} begins` });

  // Daily: ships held back by winter, rulers' asks nearly due, loans the treasury can't meet, a monument stuck.
  if (moved && now % TICKS_PER_DAY === 0) {
    for (const [ship, days] of Object.entries(s.season.late)) {
      // (The merchant ship's and the sea routes'; a colony's or a vassal's ship says so in its own news.)
      const city = ship.endsWith('-sea') ? ship.slice(0, -4) : '';
      if (days <= 0 || (ship !== 'tyre' && !PLACES[city])) continue;
      const name = ship === 'tyre' ? 'The merchant ship' : `The ship from ${cityName(city)}`;
      fact(`${DAILY}late:${ship}`, () => `${name}: her next call falls in winter, and the storms in the gulf will hold her back ${days} ${days === 1 ? 'day' : 'days'}.`, 'ship', NEWS, ship === 'tyre' ? (post ? { building: post.id } : undefined) : { city });
    }
    for (const d of openDeals(s.world)) {
      if (d.gift || d.due - now > DUE_WARN || d.due <= now) continue;
      // (A threat: the price of peace, nearly due; it is told as a raid's.)
      const r = d.kind === 'threat' ? s.world.raids.find((x) => x.deal === d.id && x.phase === 'threat') : undefined;
      if (d.kind === 'threat' && !r) continue;
      // (Titled by what waits, not by "Still waiting on you".)
      fact(`${DAILY}due:${d.id}`, () => `${WAITING}${r ? raidLine(s, map, r) : dealLine(s, map, d)}`, r ? 'raid' : 'deal', WARNING, { city: d.city }, (w) => titleFrom(w.slice(WAITING.length)));
    }
    for (const l of s.world.loans) {
      if (l.side !== 'in' || l.state !== 'running' || l.due - now > TICKS_PER_MONTH || spendable(s) >= l.owed) continue;
      const n = Math.max(1, Math.ceil((l.due - now) / TICKS_PER_DAY));
      fact(`${DAILY}loan:${l.id}`, () => `Your loan from ${cityName(l.city)} is due in ${n === 1 ? '1 day' : `${n} days`}: ${Math.round(l.owed).toLocaleString('en-GB')} dr, and the treasury can spend ${Math.round(spendable(s)).toLocaleString('en-GB')} dr now.`, 'loan', WARNING, { city: l.city });
    }
    const stuck = monumentTownLine(s);
    if (stuck && /waits for .+ no (storehouse|granary)( or granary)? has any|waits for the armourers|no masons’ yard sends builders/.test(stuck.text)) {
      const x = s.monuments.sites.find((y) => y.id === stuck.at);
      // (Review of slice 54: a sanctuary's stuck site is told under the sanctuaries' kind, as the rest of its news is.)
      fact(`${DAILY}stuck:${stuck.at}:${x?.stage ?? 0}`, () => stuck.text, x?.kind === 'sanctuary' ? 'sanctuary' : 'monument', WARNING, { building: stuck.at });
    }
  } else for (const k of g.seen) if (k.startsWith(DAILY)) keys.push(k);
  g.seen = keys;
}

/** The monuments' own line about a site, if it is about that site now; else the fallback. */
function monumentWords(s: SimState, id: number, fallback: string): string {
  const l = monumentTownLine(s);
  return l && l.at === id ? l.text : fallback;
}
