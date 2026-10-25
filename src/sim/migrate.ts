/**
 * Bringing an older saved state up to this version, so old towns load.
 *
 * Version 6 (phase 1) to 7 (slice 8, coin and the ledger): rent is gone,
 * taxes come in with a tax collector instead, and wages go out. The town
 * keeps its money; the rate is fair; the ledger starts this month with what
 * the treasury holds; nobody has been taxed or is owed wages yet; and the
 * new round record (where tax collectors have walked) starts empty. A
 * phase-1 town has no tax office, so the welcome back says to build one.
 *
 * Version 7 to 8 (slice 9, meat and cheese): every building gets empty
 * stores of meat and cheese, every home no meat or cheese yet, and every
 * walker carries none. Townhouses now need two kinds of food and fine houses
 * three, so every home's `grace` is six months after the tick it was saved
 * (GRACE): its food counts as missing from then at the earliest, and then the
 * usual ten days and two months follow before it goes down. That is time to
 * build a lodge and a dairy, for their workers to come, and for the first meat
 * and cheese to go round (a hunter's first trip takes a few weeks). The
 * home's panel says what it lacks from the start. The wild herds start whole
 * where they live, with their own generator.
 *
 * Version 8 to 9 (slice 10, olives and oil): every building gets empty
 * stores of goods (`goods`, `goodsIn`), every home no oil yet
 * (`goodsUntil`), no agora has stalls, and the oil vendor's round record
 * starts empty. Townhouses now need oil, so every home's grace is at least
 * eight months after loading (GRACE_OIL): time to plant a grove, build a
 * press, a storehouse and an oil stall, and for the first oil to go round
 * (a grove's first olives take two months to ripen). Food keeps the grace it
 * had, if longer.
 *
 * Version 9 to 10 (slice 11, fleece, wine and the villa): each of an
 * agora's stalls gets its own porter, so the one porter clock (`fetch`)
 * becomes one per good (the oil stall's keeps the old one), and the fleece
 * and wine vendors' round records start empty. Fine houses now need fleece,
 * so every fine house's grace is at least eight months after loading
 * (GRACE_GOODS): time to fence a pasture, build a storehouse and a fleece
 * stall, and for the first fleece to go round. (Only fine houses: no other
 * level needs anything new, and a townhouse can't become a fine house
 * without fleece in hand. The grace covers their food too, as it always has.)
 *
 * Version 10 to 11 (slice 12, fire and collapse): every building gets no
 * fire risk and no wear yet (nothing smouldering or creaking, no rubble),
 * the watchman's and the inspector's round records start empty, and fire
 * and wear build up from loading (`hazards` on), so a loaded town has most of
 * a year before the first smoulder: time to build watch posts and
 * architects' offices. Older undo entries have nothing to say about rubble.
 *
 * Version 11 to 12 (slice 13, the ship comes in): the trade record starts
 * fresh: nothing for sale yet, the usual amounts kept, and no ship due (a
 * town from before had no trading post; the schedule starts when one is
 * built, the first ship three months after).
 *
 * Version 12 to 13 (slice 14, a richer town): no household has left whole
 * for harsh taxes yet (`taxGone`). Everything else is as it was; the money
 * is retuned (the upper levels pay more tax), which a loaded town simply
 * plays on with.
 *
 * Version 13 to 14 (slice 15, the map of Greece): Greece is there now, fresh
 * from the town's seed and made as it is loaded, with every ruler between
 * wary and cordial and nothing open between you. Nothing in the city changes.
 *
 * Version 14 to 15 (the side panel): the stock book starts empty this
 * month, so a loaded town's goods show what it makes and uses from its
 * first month on (the year's chart fills in as it plays).
 *
 * Version 15 to 16 (slice 16, routes and traders): the route records take
 * their full shape, and no route could be opened before, so a loaded town has
 * none, and no caravans on the map. Nothing in the city changes.
 *
 * Version 16 to 17 (slice 17, prices that move): each city's prices stay
 * where they were and move from here on; nothing is pushing its stocks yet,
 * nothing traded is on record, and its next harvest is fair. Nothing in the
 * city changes.
 *
 * Version 17 to 18 (slice 18, rulers who remember): no gift is on its way
 * either way, every ruler's mood is where it was (the word it is now is the
 * one last said), none has sent you a gift yet, and every route is open (no
 * ruler could close one before). Your city dealt with Greece first when it
 * opened its first route, if it has. Nothing in the city changes.
 *
 * Version 18 to 19 (slice 19, favours, offers and tribute): no ruler has
 * asked anything of you yet (the list of deals was always empty), and every
 * gift on its way is a gift, not something sent for a request. Nothing in
 * the city changes.
 *
 * Slice 30 (Thieves in the night): no home is tempted to steal yet, no
 * thief is out and nothing has been stolen; crime (and with it taxes coming
 * in day by day and harsh taxes' harder bite) is on from loading.
 *
 * Slice 31 (Greece grows): Greece reaches its full table. Thebes, Argos,
 * Knossos, Rhodes and Memphis join it (shuffled from the save's own seed,
 * each ruler meeting your city for the first time), every ruler has a feeling
 * for each of them, every ruled city its people, wealth, army and fleet (the
 * first four's at exactly their usual size, so a loaded town's prices don't
 * move), nobody is anybody's vassal, and the six empty sites are free.
 * Nothing in the city changes.
 *
 * Slice 32 (Marble and timber): no tree has been felled yet; every
 * building's goods, and every trade record, gain marble and timber (padded
 * to however many goods there are now); Athens makes three times the marble
 * it uses, Troy three times the timber and Knossos two and a half times,
 * Memphis a quarter of the timber it uses, every other city just what it
 * uses (and a colony already on Naxos or Thasos adds its marble or timber
 * to what its founder makes), each at its usual price with nothing pushing
 * it; nothing is ticked for sale. Nothing in the city changes.
 *
 * Slice 33 (The turning year): the seasons are on from loading, no ship
 * held back by winter yet. The season itself is the tick's, so a loaded
 * town is in whatever season its date falls in, and its farms, groves and
 * flocks take that season's pace from its next tick.
 *
 * Slice 34 (Vassals and allies): an empty empire (no vassals, allies,
 * heralds, tribute, aid or calls to war), and every expedition's aim the
 * slice 28 one ('': a raid or a force for a debt or without cause). Rivals'
 * vassals stay as they were; nothing else changes.
 *
 * Slice 35 (Monuments): no monument has been marked out and no games are
 * planned; every building's goods are padded to however many goods there
 * are now. Nothing in the city changes.
 *
 * Slice 38 (Contested seas): no fleet has come to blockade your harbour;
 * every trireme's oars are whole and none is laid up under repair (a hurt
 * one is mended at her mooring as before); pirates are pirates (no
 * warships); every building's goods are padded to however many goods there
 * are now. Nothing in the city changes.
 *
 * Slice 39 (Ambitions): the ambitions are on from loading, with no
 * milestone recorded yet; on its first tick the town's look records what it
 * already meets, quietly (no fanfare, no reward, marked as already met), and
 * goes on from there.
 *
 * Slice 36 (The great houses): no home is an estate; every building's goods,
 * and every trade record, gain horses (padded to however many goods there
 * are now); Thebes breeds four horses for every one it uses and Argos a few
 * to spare, every other city just what it uses, each at its usual price
 * with nothing pushing it; nothing is ticked for sale or to buy. Ships held
 * back by winter keep the day they are due, and their next visit counts
 * from when they were due before the storms. Nothing in the city changes.
 *
 * Slice 37 (Colonies): you have no colony and no settlers on their way, and
 * no site has a colony that declared itself free. Rivals' colonies stay as
 * they were; nothing else changes.
 *
 * Slice 43 (Colonies that grow up): no goods are on their way out to a
 * colony. Each colony you hold stands at the stage its people make it (an
 * outpost, a settlement from 150, a town from 400, a city from 900), with no
 * works funded, nothing asked of you yet (its first ask comes about six
 * months after loading), no governor to choose, and its governor in office
 * since it was founded. What it sends is worked out afresh from its stage,
 * so a colony's next ship carries the new, smaller share of a cheap good.
 *
 * Slice 41 (Crimes of every kind): the new kinds of crime and gangs are on
 * from loading, with nothing smashed, no talk of burning, no quarter running
 * hot, no gang and nothing of the new kinds tallied yet. Nothing else changes.
 *
 * Slice 45 (The court and the prison): the law starts at its defaults (the
 * stocks for theft, pickpocketing and vandalism, a fine for smuggling, prison
 * for arson and a gang's men), with nobody waiting at a court, nobody in
 * prison, at labour or in the stocks, no prison restless, no execution or
 * exile remembered, and the monthly crime rate starting from the month the
 * save loads in. Nothing else changes.
 *
 * Pure: it only reshapes plain data (the herds are placed from the baked
 * map). What it can't recognise it leaves alone, for the save checks to
 * refuse in plain words.
 */
import { coastMap } from '../map/bake';
import { MAP_SIZE } from '../map/coast';
import { TICKS_PER_MONTH } from './clock';
import { FINE } from './buildings';
import { gi, GOOD_COUNT, MARBLE, OIL, TIMBER } from './foods';
import { SIM_STATE_VERSION, type SimState, type WorldCity } from './state';
import { FAIR } from './taxes';
import { freshLedger } from './treasury';
import { freshHerds, wildRng } from './wild';
import { DEFAULT_KEEP, freshTrade, OLD_GOODS, PRICES, tradeIndex, TRADE_GOODS } from './trade';
import { armsOf, freshWorld, marketPrice, materialsOf, moodLevel, moodOf, normalStock, settle, usualTrail } from './world';
// Slice 36.
import { horsesOf } from './world';
import { HORSES } from './foods';
import { freshArmy } from './army';
import { freshBook } from './stockbook';
import { freshCrime } from './crime';
// Slice 33.
import { freshSeasons } from './seasons';
// Slice 34.
import { freshEmpire } from './vassals';
import { nextFestival } from './festivals';
import { SITES, type CityId } from '../map/greece';
import { COLONY_MAKES } from './growth';
// Slice 35.
import { freshGames, freshMonuments } from './monuments';
// Slice 39.
import { freshAmbition } from './laurels';
// Slice 43.
import { stageFor } from './colonyworks';

/** How long after loading a slice-8 save its homes' food can first count as missing (see the version 7 to 8 notes). */
export const GRACE = 6 * TICKS_PER_MONTH;

/** How long after loading a slice-9 save its homes' oil (and food) can first count as missing (see the version 8 to 9 notes). */
export const GRACE_OIL = 8 * TICKS_PER_MONTH;

/** How long after loading a slice-10 save its fine houses' fleece (and food and oil) can first count as missing (see the version 9 to 10 notes). */
export const GRACE_GOODS = 8 * TICKS_PER_MONTH;

/** The oldest state version this game can bring up to date. */
export const OLDEST_READABLE = 6;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Bring a parsed state up to SIM_STATE_VERSION in place. Returns the version
 * it was (so the game can say what changed), or 0 if it needed nothing or
 * can't be brought up (too old, too new, or not a state at all).
 */
export function migrate(st: unknown): number {
  if (!isObj(st) || typeof st.version !== 'number') return 0;
  const from = st.version;
  if (from >= SIM_STATE_VERSION || from < OLDEST_READABLE) return 0;
  if (from === 6) from6(st);
  if (st.version === 7) from7(st);
  if (st.version === 8) from8(st);
  if (st.version === 9) from9(st);
  if (st.version === 10) from10(st);
  if (st.version === 11) from11(st);
  if (st.version === 12) from12(st);
  if (st.version === 13) from13(st);
  if (st.version === 14) from14(st);
  if (st.version === 15) from15(st);
  if (st.version === 16) from16(st);
  if (st.version === 17) from17(st);
  if (st.version === 18) from18(st);
  if (st.version === 19) from19(st);
  if (st.version === 20) from20(st);
  if (st.version === 21) from21(st);
  if (st.version === 22) from22(st);
  if (st.version === 23) from23(st);
  if (st.version === 24) from24(st);
  if (st.version === 25) from25(st);
  if (st.version === 26) from26(st);
  if (st.version === 27) fromSlice30(st);
  if (st.version === 28) fromSlice31(st);
  if (st.version === 29) fromSlice32(st);
  if (st.version === 30) fromSlice33(st);
  if (st.version === 31) fromSlice34(st);
  if (st.version === 32) fromSlice35(st);
  if (st.version === 33) fromSlice38(st);
  if (st.version === 34) fromSlice39(st);
  if (st.version === 35) fromSlice36(st);
  if (st.version === 36) fromSlice37(st);
  if (st.version === 37) fromSlice43(st);
  if (st.version === 38) fromSlice41(st);
  if (st.version === 39) fromSlice45(st);
  return from;
}

function from6(st: Record<string, unknown>): void {
  delete st.rent;
  st.taxRate = FAIR;
  const money = typeof st.money === 'number' ? st.money : 0;
  const tick = typeof st.tick === 'number' ? st.tick : 0;
  st.ledger = freshLedger(money, tick);
  if (isObj(st.rounds)) {
    const n = MAP_SIZE * MAP_SIZE;
    st.rounds.tax = { walked: new Array<number>(n).fill(0), exits: new Array<number>(n).fill(0) };
  }
  if (Array.isArray(st.buildings)) {
    for (const b of st.buildings) {
      if (!isObj(b)) continue;
      b.taxedAt = 0;
      b.taxPaid = 0;
      b.unpaid = 0;
      b.owed = 0;
    }
  }
  if (Array.isArray(st.walkers)) for (const w of st.walkers) if (isObj(w)) w.purse = [];
  st.version = 7;
}

function from7(st: Record<string, unknown>): void {
  const tick = typeof st.tick === 'number' ? st.tick : 0;
  if (Array.isArray(st.buildings)) {
    for (const b of st.buildings) {
      if (!isObj(b)) continue;
      b.meat = 0;
      b.cheese = 0;
      b.meatIn = 0;
      b.cheeseIn = 0;
      b.meatUntil = 0;
      b.cheeseUntil = 0;
      b.grace = b.kind === 'home' ? tick + GRACE : 0;
    }
  }
  if (Array.isArray(st.walkers)) {
    for (const w of st.walkers) {
      if (!isObj(w)) continue;
      w.food = 0;
      w.meat = 0;
      w.cheese = 0;
    }
  }
  st.wild = wildRng(typeof st.seed === 'number' ? st.seed : 0);
  const n = MAP_SIZE * MAP_SIZE;
  st.herds = Array.isArray(st.tiles) && st.tiles.length === n ? freshHerds(coastMap(), st as unknown as SimState) : [];
  st.version = 8;
}

function from8(st: Record<string, unknown>): void {
  const tick = typeof st.tick === 'number' ? st.tick : 0;
  const none = (): number[] => new Array<number>(GOOD_COUNT).fill(0);
  if (Array.isArray(st.buildings)) {
    for (const b of st.buildings) {
      if (!isObj(b)) continue;
      b.goods = none();
      b.goodsIn = none();
      b.goodsUntil = none();
      b.stalls = 0;
      b.vclock = none();
      b.fetch = 0;
      if (b.kind === 'home') b.grace = Math.max(typeof b.grace === 'number' ? b.grace : 0, tick + GRACE_OIL);
    }
  }
  if (isObj(st.rounds)) {
    const n = MAP_SIZE * MAP_SIZE;
    st.rounds.oil = { walked: new Array<number>(n).fill(0), exits: new Array<number>(n).fill(0) };
  }
  st.version = 9;
}

function from9(st: Record<string, unknown>): void {
  const tick = typeof st.tick === 'number' ? st.tick : 0;
  if (Array.isArray(st.buildings)) {
    for (const b of st.buildings) {
      if (!isObj(b)) continue;
      const fetch = typeof b.fetch === 'number' ? b.fetch : 0;
      b.fetch = new Array<number>(GOOD_COUNT).fill(0);
      (b.fetch as number[])[gi(OIL)] = fetch;
      if (b.kind === 'home' && typeof b.level === 'number' && b.level >= FINE) b.grace = Math.max(typeof b.grace === 'number' ? b.grace : 0, tick + GRACE_GOODS);
    }
  }
  if (isObj(st.rounds)) {
    const n = MAP_SIZE * MAP_SIZE;
    st.rounds.fleece = { walked: new Array<number>(n).fill(0), exits: new Array<number>(n).fill(0) };
    st.rounds.wine = { walked: new Array<number>(n).fill(0), exits: new Array<number>(n).fill(0) };
  }
  st.version = 10;
}

function from10(st: Record<string, unknown>): void {
  if (Array.isArray(st.buildings)) {
    for (const b of st.buildings) {
      if (!isObj(b)) continue;
      b.risk = 0;
      b.wear = 0;
      b.fire = 0;
      b.fireAt = 0;
      b.creakAt = 0;
      b.was = '';
      b.ruin = '';
    }
  }
  if (isObj(st.rounds)) {
    const n = MAP_SIZE * MAP_SIZE;
    st.rounds.fire = { walked: new Array<number>(n).fill(0), exits: new Array<number>(n).fill(0) };
    st.rounds.wear = { walked: new Array<number>(n).fill(0), exits: new Array<number>(n).fill(0) };
  }
  st.hazards = true;
  st.version = 11;
}

function from11(st: Record<string, unknown>): void {
  st.trade = freshTrade();
  st.version = 12;
}

function from12(st: Record<string, unknown>): void {
  st.taxGone = [];
  if (isObj(st.trade)) {
    st.trade.lost = TRADE_GOODS.map(() => 0);
    st.trade.lostAt = 0;
  }
  st.version = 13;
}

function from13(st: Record<string, unknown>): void {
  const seed = typeof st.seed === 'number' ? st.seed : 0;
  const tick = typeof st.tick === 'number' ? st.tick : 0;
  st.world = freshWorld(seed, tick, true);
  st.version = 14;
}

function from14(st: Record<string, unknown>): void {
  st.stocks = freshBook(typeof st.tick === 'number' ? st.tick : 0);
  st.version = 15;
}

function from15(st: Record<string, unknown>): void {
  // (No route could be opened before: whatever the list held, it starts empty, and so do the travellers on the map.)
  if (isObj(st.world)) {
    st.world.routes = [];
    st.world.travellers = [];
  }
  st.version = 16;
}

function from16(st: Record<string, unknown>): void {
  // Prices start to move: nothing is pushing any city's stock yet (its prices stay where they were and move from
  // here on), you have traded nothing with anyone in its record, the arrows are steady, and every harvest was and
  // will be fair. (A town brought up from before Greece already has all this from its fresh world.)
  const w = st.world;
  if (isObj(w) && Array.isArray(w.cities)) {
    for (const c of w.cities as Array<Record<string, unknown>>) {
      if (!isObj(c) || Array.isArray(c.yours)) continue;
      const price = Array.isArray(c.price) ? (c.price as number[]) : [];
      const make = Array.isArray(c.make) ? (c.make as number[]) : [];
      const need = Array.isArray(c.need) ? (c.need as number[]) : [];
      c.yours = TRADE_GOODS.map(() => 0);
      c.crop = TRADE_GOODS.map(() => 0);
      // (The arrow's trail at the price unrounded, as it will be from the first day, so every arrow starts steady.)
      // (Its goods then were the first six trade goods: from21 adds copper and armour.)
      c.trail = c.ruler && price.length === OLD_GOODS ? price.map((_, k) => usualTrail(k, make[k] ?? 0, need[k] ?? 0)) : price.slice();
      c.dealt = TRADE_GOODS.map(() => new Array<number>(12).fill(0));
      c.outlook = 2;
    }
  }
  st.version = 17;
}

function from18Fields(w: Record<string, unknown>, tick: number): void {
  if (!Array.isArray(w.gifts)) w.gifts = [];
  if (typeof w.nextGift !== 'number') w.nextGift = 1;
  const routes = Array.isArray(w.routes) ? (w.routes as Array<Record<string, unknown>>) : [];
  if (typeof w.contact !== 'number') w.contact = routes.reduce((a, r) => (isObj(r) && typeof r.opened === 'number' && (a === 0 || r.opened < a) ? Math.max(1, r.opened) : a), 0);
  for (const r of routes) if (isObj(r) && typeof r.closed !== 'number') r.closed = 0;
  if (!Array.isArray(w.cities)) return;
  for (const c of w.cities as Array<Record<string, unknown>>) {
    if (!isObj(c)) continue;
    if (typeof c.feel !== 'number') c.feel = c.ruler && Array.isArray(c.memories) ? moodLevel(moodOf(c as unknown as WorldCity, tick)) : 3;
    if (typeof c.gave !== 'number') c.gave = 0;
  }
}

function from17(st: Record<string, unknown>): void {
  if (isObj(st.world)) from18Fields(st.world, typeof st.tick === 'number' ? st.tick : 0);
  st.version = 18;
}

function from18(st: Record<string, unknown>): void {
  const w = st.world;
  if (isObj(w)) {
    w.deals = [];
    if (typeof w.nextDeal !== 'number') w.nextDeal = 1;
    if (Array.isArray(w.gifts)) for (const g of w.gifts as unknown[]) if (isObj(g) && typeof g.deal !== 'number') g.deal = 0;
  }
  st.version = 19;
}

function from19(st: Record<string, unknown>): void {
  // No threats and no raiders before: a tribute already marked angry (refused by a cold ruler) gets its threat on the next month's turn (raids.ts).
  const w = st.world;
  if (isObj(w)) {
    w.raids = [];
    if (typeof w.nextRaid !== 'number') w.nextRaid = 1;
  }
  st.version = 20;
}

function from20(st: Record<string, unknown>): void {
  // No wars and no feuds before; every ruler's feelings for the others as they were (their old ties), nothing passed between them yet; no war or festival pushing any price.
  const w = st.world;
  if (isObj(w)) {
    w.wars = [];
    if (typeof w.nextWar !== 'number') w.nextWar = 1;
    w.feuds = [];
    if (Array.isArray(w.cities)) {
      for (const c of w.cities as Array<Record<string, unknown>>) {
        if (!isObj(c)) continue;
        c.bonds = [];
        c.strife = TRADE_GOODS.map(() => 0);
        c.feast = TRADE_GOODS.map(() => 0);
        c.war = '';
        // (A festival already on when the town was saved is on, not news: it isn't announced again.)
        const n = typeof c.id === 'string' && typeof st.tick === 'number' ? nextFestival(c.id as CityId, st.tick) : null;
        c.festival = n && typeof st.tick === 'number' && st.tick >= n.start && st.tick < n.end ? n.end : 0;
      }
    }
  }
  st.version = 21;
}

/** Pad a list of numbers to `n` with `fill` (a list already that long is left as it is). */
function pad<T>(xs: unknown, n: number, fill: (k: number) => T): void {
  if (!Array.isArray(xs)) return;
  for (let k = xs.length; k < n; k++) xs.push(fill(k));
}

/** How many goods (and trade goods past the old six) there were at version 22: copper and armour (slice 32 padded later ones on in its own step). */
const GOODS_22 = 7;

function from21(st: Record<string, unknown>): void {
  // Copper and armour (slice 23): every building's goods one copper and one armour longer, and every trade
  // record two trade goods longer. Each city of Greece makes and uses them by its character (armsOf), at its
  // usual price for them, with nothing pushing it; nothing was traded. No barracks, so no army.
  const zero = (): number => 0;
  if (Array.isArray(st.buildings)) {
    for (const b of st.buildings as Array<Record<string, unknown>>) {
      if (!isObj(b)) continue;
      for (const k of ['goods', 'goodsIn', 'goodsUntil', 'vclock', 'fetch']) pad(b[k], GOODS_22, zero);
    }
  }
  if (Array.isArray(st.undo)) for (const e of st.undo as Array<Record<string, unknown>>) if (isObj(e) && Array.isArray(e.removedGoods)) for (const g of e.removedGoods) pad(g, GOODS_22, zero);
  // (Slice 32: to the goods of its day, copper and armour; later steps pad on to their own goods.)
  const g = OLD_GOODS + 2;
  if (isObj(st.trade)) {
    const t = st.trade;
    pad(t.sell, g, () => false);
    pad(t.keep, g, (k) => DEFAULT_KEEP[k]);
    pad(t.lost, g, zero);
    if (isObj(t.ship)) {
      pad(t.ship.hold, g, zero);
      pad(t.ship.lastBought, g, zero);
    }
  }
  const w = st.world;
  if (isObj(w)) {
    if (Array.isArray(w.cities)) {
      for (const c of w.cities as Array<Record<string, unknown>>) {
        if (!isObj(c) || !Array.isArray(c.make) || !Array.isArray(c.need) || !Array.isArray(c.price)) continue;
        const arms = armsOf(c.id as CityId);
        pad(c.make, g, (k) => (k === OLD_GOODS ? arms[0] : arms[2]));
        pad(c.need, g, (k) => (k === OLD_GOODS ? arms[1] : arms[3]));
        for (const k of ['yours', 'crop', 'strife', 'feast']) pad(c[k], g, zero);
        const make = c.make as number[];
        const need = c.need as number[];
        const usual = (k: number): number => (c.ruler ? marketPrice(k, make[k], need[k]) : PRICES[k]);
        pad(c.stock, g, (k) => Math.round(normalStock(c as unknown as WorldCity, k)));
        pad(c.price, g, usual);
        pad(c.trail, g, (k) => (c.ruler ? usualTrail(k, make[k], need[k]) : usual(k)));
        pad(c.history, g, (k) => new Array<number>(12).fill(usual(k)));
        pad(c.dealt, g, () => new Array<number>(12).fill(0));
      }
    }
    if (Array.isArray(w.routes)) {
      for (const r of w.routes as Array<Record<string, unknown>>) {
        if (!isObj(r)) continue;
        for (const k of ['sold', 'bought', 'upto', 'hold', 'unloaded', 'lastSold', 'lastBought']) pad(r[k], g, zero);
        pad(r.sell, g, () => false);
        pad(r.buy, g, () => false);
      }
    }
  }
  if (!isObj(st.army)) st.army = freshArmy();
  st.version = 22;
}

/**
 * Version 22 to 23 (slice 24, raiders fought in the streets): the army gains
 * its raiders man by man, arrows in the air, its news and the pay owed to men
 * dismissed (none of any); each company is a citizens' one, not fighting; each
 * soldier stands, fighting nobody; and each raid has no next target, nothing
 * taken from the treasury, nothing set alight on the way and nobody fallen.
 * A band already in the city when it was saved gets its men from its numbers
 * on the next tick (battle.ts).
 */
function from22(st: Record<string, unknown>): void {
  if (isObj(st.army)) {
    const a = st.army;
    if (!Array.isArray(a.foes)) a.foes = [];
    if (!Array.isArray(a.arrows)) a.arrows = [];
    if (!Array.isArray(a.news)) a.news = [];
    if (typeof a.owed !== 'number') a.owed = 0;
    for (const c of (Array.isArray(a.companies) ? a.companies : []) as Array<Record<string, unknown>>) {
      if (!isObj(c)) continue;
      if (typeof c.hired !== 'string') c.hired = '';
      if (typeof c.strong !== 'number') c.strong = 0;
      if (typeof c.routed !== 'boolean') c.routed = false;
    }
    for (const x of (Array.isArray(a.soldiers) ? a.soldiers : []) as Array<Record<string, unknown>>) {
      if (!isObj(x)) continue;
      for (const k of ['foe', 'cool', 'swung', 'fell']) if (typeof x[k] !== 'number') x[k] = 0;
    }
  }
  const w = st.world;
  if (isObj(w) && Array.isArray(w.raids)) {
    for (const r of w.raids as Array<Record<string, unknown>>) {
      if (!isObj(r)) continue;
      if (!Array.isArray(r.next)) r.next = [];
      for (const k of ['stole', 'fires', 'fallen', 'regained', 'coinBack', 'fought', 'killed', 'wounded']) if (typeof r[k] !== 'number') r[k] = 0;
      if (typeof r.broke !== 'boolean') r.broke = false;
    }
  }
  st.version = 23;
}

/**
 * Version 23 to 24 (slice 25, walls, gates and towers): the town has no walls,
 * and no raid is at a wall or has broken one.
 */
function from23(st: Record<string, unknown>): void {
  if (!Array.isArray(st.walls)) st.walls = [];
  const w = st.world;
  if (isObj(w) && Array.isArray(w.raids)) {
    for (const r of w.raids as Array<Record<string, unknown>>) {
      if (!isObj(r)) continue;
      if (typeof r.siege !== 'number') r.siege = -1;
      if (typeof r.breaches !== 'number') r.breaches = 0;
    }
  }
  st.version = 24;
}

/** Version 24 to 25 (slice 27, loans both ways). */
function from24(st: Record<string, unknown>): void {
  // (A version 24 save from the loans' own line of work, before walls reached it, has loans and no walls: it gets none. Slice 25's review.)
  if (!Array.isArray(st.walls)) from23(st);
  // No loans either way yet, and no gift on its way is a herald about one.
  const w = st.world;
  if (isObj(w)) {
    if (!Array.isArray(w.loans)) w.loans = [];
    if (typeof w.nextLoan !== 'number') w.nextLoan = 1;
    if (Array.isArray(w.gifts)) for (const g of w.gifts as unknown[]) if (isObj(g) && typeof g.loan !== 'number') g.loan = 0;
  }
  st.version = 25;
}

/**
 * Version 25 to 26 (slice 26, from the sea): no shipyard, trireme, enemy
 * ship or pirates yet; no raid has come ashore or lost a ship; no trader has
 * been robbed.
 */
function from25(st: Record<string, unknown>): void {
  if (!isObj(st.fleet)) st.fleet = { triremes: [], ships: [], pirates: [], reports: [], nextId: 1 };
  const w = st.world;
  if (isObj(w)) {
    if (Array.isArray(w.raids)) {
      for (const r of w.raids as Array<Record<string, unknown>>) {
        if (!isObj(r)) continue;
        if (typeof r.shore !== 'number') r.shore = -1;
        for (const k of ['ships', 'sunk', 'landed', 'drowned']) if (typeof r[k] !== 'number') r[k] = 0;
        if (typeof r.brokeAt !== 'string') r.brokeAt = '';
      }
    }
    if (Array.isArray(w.routes)) for (const r of w.routes as Array<Record<string, unknown>>) if (isObj(r) && typeof r.robbed !== 'number') r.robbed = 0;
  }
  st.version = 26;
}

/**
 * Version 26 to 27 (slice 28, debts unpaid): no loan has climbed a step, been
 * put off or seized from; no raid comes to collect a debt; no company is away
 * on an expedition, and there are none.
 */
function from26(st: Record<string, unknown>): void {
  const w = st.world;
  if (isObj(w)) {
    if (!Array.isArray(w.expeditions)) w.expeditions = [];
    if (typeof w.nextExpedition !== 'number') w.nextExpedition = 1;
    if (Array.isArray(w.loans))
      for (const l of w.loans as unknown[]) {
        if (!isObj(l)) continue;
        for (const k of ['step', 'stepAt', 'seized', 'extended', 'raid', 'demand', 'sent']) if (typeof l[k] !== 'number') l[k] = 0;
        // (A loan already overdue fell on its day.)
        if (typeof l.fell !== 'number') l.fell = l.state === 'overdue' && typeof l.due === 'number' ? l.due : 0;
        for (const k of ['withhold', 'reminded', 'demanded']) if (typeof l[k] !== 'boolean') l[k] = false;
      }
    if (Array.isArray(w.raids)) for (const r of w.raids as unknown[]) if (isObj(r) && typeof r.loan !== 'number') r.loan = 0;
  }
  const a = st.army;
  if (isObj(a) && Array.isArray(a.companies)) for (const c of a.companies as unknown[]) if (isObj(c) && typeof c.away !== 'number') c.away = 0;
  st.version = 27;
}

/** Slice 30 (thieves in the night): see the note above. Only its own fields, each only if it is missing. */
function fromSlice30(st: Record<string, unknown>): void {
  const zero = (): number => 0;
  if (Array.isArray(st.buildings))
    for (const b of st.buildings as unknown[]) {
      if (!isObj(b)) continue;
      if (typeof b.tempt !== 'number') b.tempt = 0;
      if (typeof b.robbedAt !== 'number') b.robbedAt = 0;
      for (const k of ['goods', 'goodsIn', 'goodsUntil', 'vclock', 'fetch']) pad(b[k], GOOD_COUNT, zero);
    }
  if (!isObj(st.crime)) st.crime = freshCrime(true);
  st.version = (st.version as number) + 1;
}

/**
 * Slice 31 (Greece grows): the newcomers, every city's size, the vassal
 * links and the sites, each only if absent (another line's fields are left
 * alone, and goods arrays are made as long as the trade goods are now).
 */
function fromSlice31(st: Record<string, unknown>): void {
  const w = st.world;
  if (isObj(w) && Array.isArray(w.cities)) {
    for (const c of w.cities as unknown[]) {
      if (!isObj(c)) continue;
      for (const k of ['pop', 'wealth', 'army', 'fleet', 'lordSince']) if (typeof c[k] !== 'number') c[k] = 0;
      if (typeof c.lord !== 'string') c.lord = '';
      if (!Array.isArray(c.grew)) c.grew = [];
    }
    settle(w as unknown as SimState['world'], typeof st.tick === 'number' ? st.tick : 0, false, false);
  }
  st.version = (st.version as number) + 1;
}

/**
 * Slice 32 (Marble and timber): see the notes at the top. It fills in only
 * its own field (`materials`) and pads every goods list to however many
 * goods there are now, whatever other steps have padded before it; the
 * trade goods it doesn't know (another slice's) are padded with nothing made
 * or used, for that slice's own step to set.
 */
function fromSlice32(st: Record<string, unknown>): void {
  if (!isObj(st.materials)) st.materials = { felled: [] };
  else if (!Array.isArray(st.materials.felled)) st.materials.felled = [];
  const zero = (): number => 0;
  if (Array.isArray(st.buildings)) {
    for (const b of st.buildings as Array<Record<string, unknown>>) {
      if (!isObj(b)) continue;
      for (const k of ['goods', 'goodsIn', 'goodsUntil', 'vclock', 'fetch']) pad(b[k], GOOD_COUNT, zero);
    }
  }
  if (Array.isArray(st.undo)) for (const e of st.undo as Array<Record<string, unknown>>) if (isObj(e) && Array.isArray(e.removedGoods)) for (const g of e.removedGoods) pad(g, GOOD_COUNT, zero);
  const g = TRADE_GOODS.length;
  if (isObj(st.trade)) {
    const t = st.trade;
    pad(t.sell, g, () => false);
    pad(t.keep, g, (k) => DEFAULT_KEEP[k] ?? 0);
    pad(t.lost, g, zero);
    if (isObj(t.ship)) {
      pad(t.ship.hold, g, zero);
      pad(t.ship.lastBought, g, zero);
    }
  }
  const w = st.world;
  if (!isObj(w)) return void (st.version = (st.version as number) + 1);
  if (Array.isArray(w.cities)) {
    for (const c of w.cities as Array<Record<string, unknown>>) {
      if (!isObj(c) || !Array.isArray(c.make) || !Array.isArray(c.need) || !Array.isArray(c.price)) continue;
      const mats = materialsOf(c.id as CityId);
      const made = (k: number, i: number): number => (TRADE_GOODS[k] === MARBLE ? mats[i] : TRADE_GOODS[k] === TIMBER ? mats[i + 2] : 0);
      const had = (c.make as unknown[]).length;
      pad(c.make, g, (k) => made(k, 0));
      pad(c.need, g, (k) => made(k, 1));
      for (const k of ['yours', 'crop', 'strife', 'feast']) pad(c[k], g, zero);
      const make = c.make as number[];
      const need = c.need as number[];
      // (Another line's step may have padded the lists to their merged length first, with nothing made or used
      // of marble and timber: every city makes and uses some, so those two are set here, with their prices. Review.)
      const unset = [tradeIndex(MARBLE), tradeIndex(TIMBER)].filter((k) => k >= 0 && k < make.length && !make[k] && !need[k]);
      for (const k of unset) {
        make[k] = made(k, 0);
        need[k] = made(k, 1);
      }
      // (Integrating slices 31 and 32: a colony already on Naxos or Thasos adds its marble or timber to what its founder makes, as one founded from now on does.)
      if (Array.isArray(w.sites))
        for (const x of w.sites as unknown[]) {
          if (!isObj(x) || x.owner !== c.id) continue;
          const good = SITES.find((p) => p.id === x.id)?.good;
          const k = good === 'marble' ? tradeIndex(MARBLE) : good === 'timber' ? tradeIndex(TIMBER) : -1;
          if (k >= 0 && (k >= had || unset.includes(k))) make[k] += COLONY_MAKES;
        }
      const usual = (k: number): number => (c.ruler ? marketPrice(k, make[k], need[k]) : PRICES[k]);
      pad(c.stock, g, (k) => Math.round(normalStock(c as unknown as WorldCity, k)));
      pad(c.price, g, usual);
      pad(c.trail, g, (k) => (c.ruler ? usualTrail(k, make[k], need[k]) : usual(k)));
      pad(c.history, g, (k) => new Array<number>(12).fill(usual(k)));
      pad(c.dealt, g, () => new Array<number>(12).fill(0));
      for (const k of unset) {
        if (Array.isArray(c.stock)) (c.stock as number[])[k] = Math.round(normalStock(c as unknown as WorldCity, k));
        if (Array.isArray(c.price)) (c.price as number[])[k] = usual(k);
        if (Array.isArray(c.trail)) (c.trail as number[])[k] = c.ruler ? usualTrail(k, make[k], need[k]) : usual(k);
        if (Array.isArray(c.history)) (c.history as number[][])[k] = new Array<number>(12).fill(usual(k));
      }
    }
  }
  if (Array.isArray(w.routes)) {
    for (const r of w.routes as Array<Record<string, unknown>>) {
      if (!isObj(r)) continue;
      for (const k of ['sold', 'bought', 'upto', 'hold', 'unloaded', 'lastSold', 'lastBought']) pad(r[k], g, zero);
      pad(r.sell, g, () => false);
      pad(r.buy, g, () => false);
    }
  }
  st.version = (st.version as number) + 1;
}

/** Slice 36 (the great houses): see the note above. Only its own fields, if they are missing; goods lists padded to however many there are now. */
function fromSlice36(st: Record<string, unknown>): void {
  const zero = (): number => 0;
  if (Array.isArray(st.buildings)) {
    for (const b of st.buildings as Array<Record<string, unknown>>) {
      if (!isObj(b)) continue;
      if (typeof b.estate !== 'boolean') b.estate = false;
      for (const k of ['goods', 'goodsIn', 'goodsUntil', 'vclock', 'fetch']) pad(b[k], GOOD_COUNT, zero);
    }
  }
  if (Array.isArray(st.undo)) for (const e of st.undo as Array<Record<string, unknown>>) if (isObj(e) && Array.isArray(e.removedGoods)) for (const g of e.removedGoods) pad(g, GOOD_COUNT, zero);
  const g = TRADE_GOODS.length;
  if (isObj(st.trade)) {
    const t = st.trade;
    pad(t.sell, g, () => false);
    pad(t.keep, g, (k) => DEFAULT_KEEP[k] ?? 0);
    pad(t.lost, g, zero);
    if (isObj(t.ship)) {
      pad(t.ship.hold, g, zero);
      pad(t.ship.lastBought, g, zero);
    }
  }
  const w = st.world;
  if (!isObj(w)) return void (st.version = (st.version as number) + 1);
  const h = tradeIndex(HORSES);
  if (Array.isArray(w.cities)) {
    for (const c of w.cities as Array<Record<string, unknown>>) {
      if (!isObj(c) || !Array.isArray(c.make) || !Array.isArray(c.need) || !Array.isArray(c.price)) continue;
      const herd = horsesOf(c.id as CityId);
      pad(c.make, g, (k) => (k === h ? herd[0] : 0));
      pad(c.need, g, (k) => (k === h ? herd[1] : 0));
      for (const k of ['yours', 'crop', 'strife', 'feast']) pad(c[k], g, zero);
      const make = c.make as number[];
      const need = c.need as number[];
      // (An earlier step, or another line's, may have padded the lists to this length with no horses bred or used: every city has some.)
      const unset = h >= 0 && h < make.length && !make[h] && !need[h];
      if (unset) {
        make[h] = herd[0];
        need[h] = herd[1];
      }
      const usual = (k: number): number => (c.ruler ? marketPrice(k, make[k], need[k]) : PRICES[k]);
      pad(c.stock, g, (k) => Math.round(normalStock(c as unknown as WorldCity, k)));
      pad(c.price, g, usual);
      pad(c.trail, g, (k) => (c.ruler ? usualTrail(k, make[k], need[k]) : usual(k)));
      pad(c.history, g, (k) => new Array<number>(12).fill(usual(k)));
      pad(c.dealt, g, () => new Array<number>(12).fill(0));
      if (unset) {
        if (Array.isArray(c.stock)) (c.stock as number[])[h] = Math.round(normalStock(c as unknown as WorldCity, h));
        if (Array.isArray(c.price)) (c.price as number[])[h] = usual(h);
        if (Array.isArray(c.trail)) (c.trail as number[])[h] = c.ruler ? usualTrail(h, make[h], need[h]) : usual(h);
        if (Array.isArray(c.history)) (c.history as number[][])[h] = new Array<number>(12).fill(usual(h));
      }
    }
  }
  if (Array.isArray(w.routes)) {
    for (const r of w.routes as Array<Record<string, unknown>>) {
      if (!isObj(r)) continue;
      for (const k of ['sold', 'bought', 'hold', 'unloaded', 'lastSold', 'lastBought']) pad(r[k], g, zero);
      pad(r.upto, g, (k) => DEFAULT_KEEP[k] ?? 0);
      pad(r.sell, g, () => false);
      pad(r.buy, g, () => false);
    }
  }
  st.version = (st.version as number) + 1;
}

/** Slice 33 (the turning year): see the note above. Only its own field, if it is missing. */
function fromSlice33(st: Record<string, unknown>): void {
  if (!isObj(st.season)) st.season = freshSeasons(true);
  else {
    const se = st.season as Record<string, unknown>;
    if (typeof se.on !== 'boolean') se.on = true;
    if (!isObj(se.late)) se.late = {};
  }
  st.version = (st.version as number) + 1;
}

/** Slice 34 (Vassals and allies): see the note above. Only its own fields, each only if it is missing. */
function fromSlice34(st: Record<string, unknown>): void {
  if (!isObj(st.empire)) st.empire = freshEmpire();
  const w = st.world;
  if (isObj(w) && Array.isArray(w.expeditions)) for (const e of w.expeditions as unknown[]) if (isObj(e) && typeof e.aim !== 'string') e.aim = '';
  st.version = (st.version as number) + 1;
}
/**
 * Slice 35 (Monuments): see the notes at the top. It fills in only its own
 * field (`monuments`) if it is absent, and pads every building's goods to
 * however many goods there are now.
 */
function fromSlice35(st: Record<string, unknown>): void {
  if (!isObj(st.monuments)) st.monuments = freshMonuments();
  else {
    const m = st.monuments;
    if (!Array.isArray(m.sites)) m.sites = [];
    if (!isObj(m.games)) m.games = freshGames();
  }
  const zero = (): number => 0;
  if (Array.isArray(st.buildings)) {
    for (const b of st.buildings as Array<Record<string, unknown>>) {
      if (!isObj(b)) continue;
      for (const k of ['goods', 'goodsIn', 'goodsUntil', 'vclock', 'fetch']) pad(b[k], GOOD_COUNT, zero);
    }
  }
  st.version = (st.version as number) + 1;
}

/**
 * Slice 38 (Contested seas): see the notes at the top. It fills in only its
 * own fields (the fleet's `blockades`, each trireme's `oars` and `mend`) if
 * they are absent, and pads every building's goods to however many goods
 * there are now.
 */
function fromSlice38(st: Record<string, unknown>): void {
  const f = st.fleet;
  if (isObj(f)) {
    if (!Array.isArray(f.blockades)) f.blockades = [];
    if (Array.isArray(f.triremes)) {
      for (const t of f.triremes as unknown[]) {
        if (!isObj(t)) continue;
        if (typeof t.oars !== 'number') t.oars = 100;
        if (typeof t.mend !== 'boolean') t.mend = false;
      }
    }
  }
  const zero = (): number => 0;
  if (Array.isArray(st.buildings)) {
    for (const b of st.buildings as Array<Record<string, unknown>>) {
      if (!isObj(b)) continue;
      for (const k of ['goods', 'goodsIn', 'goodsUntil', 'vclock', 'fetch']) pad(b[k], GOOD_COUNT, zero);
    }
  }
  st.version = (st.version as number) + 1;
}

/**
 * Slice 39 (Ambitions): see the notes at the top. It fills in only its own
 * field (`ambition`) if it is absent: on, nothing recorded, and not yet
 * looked at (its first tick records what is already met, quietly).
 */
function fromSlice39(st: Record<string, unknown>): void {
  if (!isObj(st.ambition)) st.ambition = freshAmbition(true);
  else {
    const a = st.ambition;
    if (typeof a.on !== 'boolean') a.on = true;
    if (typeof a.looked !== 'boolean') a.looked = false;
    if (!Array.isArray(a.reached)) a.reached = [];
    if (typeof a.fameUntil !== 'number') a.fameUntil = 0;
    if (typeof a.grand !== 'number') a.grand = 0;
    if (typeof a.grandQuiet !== 'boolean') a.grandQuiet = false;
  }
  st.version = (st.version as number) + 1;
}

/** Slice 37 (Colonies): see the note above. Only its own fields, each only if it is missing. */
function fromSlice37(st: Record<string, unknown>): void {
  if (isObj(st.empire)) {
    const e = st.empire as Record<string, unknown>;
    if (!Array.isArray(e.colonies)) e.colonies = [];
    if (!Array.isArray(e.foundings)) e.foundings = [];
  }
  const w = st.world;
  if (isObj(w) && Array.isArray(w.sites)) for (const x of w.sites as unknown[]) if (isObj(x) && typeof x.free !== 'string') x.free = '';
  st.version = (st.version as number) + 1;
}

/**
 * Slice 43 (Colonies that grow up): see the note above. Only its own fields,
 * each only if it is missing: the empire's `cargoes`, and each colony's
 * stage, works, want, boosts and governor candidates.
 */
function fromSlice43(st: Record<string, unknown>): void {
  if (isObj(st.empire)) {
    const e = st.empire as Record<string, unknown>;
    if (!Array.isArray(e.cargoes)) e.cargoes = [];
    const sites = isObj(st.world) && Array.isArray(st.world.sites) ? (st.world.sites as unknown[]) : [];
    const tick = typeof st.tick === 'number' ? st.tick : 0;
    if (Array.isArray(e.colonies)) {
      for (const c of e.colonies as unknown[]) {
        if (!isObj(c)) continue;
        const x = sites.find((y) => isObj(y) && y.id === c.site) as Record<string, unknown> | undefined;
        const pop = typeof x?.pop === 'number' ? x.pop : 0;
        if (typeof c.stage !== 'number') c.stage = stageFor(pop);
        if (!Array.isArray(c.works)) c.works = [];
        if (c.want === undefined) c.want = null;
        if (typeof c.wantNext !== 'number') c.wantNext = tick + 6 * TICKS_PER_MONTH;
        if (!Array.isArray(c.boosts)) c.boosts = [];
        if (!Array.isArray(c.candidates)) c.candidates = [];
        if (typeof c.chooseBy !== 'number') c.chooseBy = 0;
        if (typeof c.govSince !== 'number') c.govSince = typeof c.since === 'number' ? c.since : tick;
      }
    }
  }
  st.version = (st.version as number) + 1;
}

/**
 * Slice 41 (Crimes of every kind): see the note above. Only its own fields in
 * `crime`, each only if it is missing: the new kinds on, nothing smashed, no
 * talk, no heat, no gang, and the month's tallies' new counts at nothing.
 */
function fromSlice41(st: Record<string, unknown>): void {
  const c = st.crime;
  if (isObj(c)) {
    if (typeof c.kinds !== 'boolean') c.kinds = true;
    for (const k of ['broken', 'talk', 'heat', 'seats', 'gangs']) if (!Array.isArray(c[k])) c[k] = [];
    if (typeof c.arsonAt !== 'number') c.arsonAt = 0;
    for (const t of [c.now, c.last]) {
      if (!isObj(t)) continue;
      for (const k of ['picked', 'smashed', 'arson', 'smuggled', 'skimmed', 'beaten']) if (typeof t[k] !== 'number') t[k] = 0;
    }
  }
  st.version = (st.version as number) + 1;
}

/**
 * Slice 45 (The court and the prison): see the note above. Only its own
 * fields in `crime`, each only if it is missing: the default law, no cases,
 * nobody held, nobody in the stocks, no restless prison, this month's rate
 * empty, no months closed and nothing cut.
 */
function fromSlice45(st: Record<string, unknown>): void {
  const c = st.crime;
  if (isObj(c)) {
    if (!isObj(c.law)) c.law = { theft: 'stocks', pickpocket: 'stocks', vandal: 'stocks', arson: 'prison', smuggling: 'fine', gang: 'prison' };
    for (const k of ['cases', 'held', 'stocks', 'jails', 'rates']) if (!Array.isArray(c[k])) c[k] = [];
    const tick = typeof st.tick === 'number' ? st.tick : 0;
    if (!isObj(c.rate)) c.rate = { month: Math.floor(tick / TICKS_PER_MONTH), people: 0, n: [0, 0, 0, 0, 0, 0], caught: 0, tried: 0 };
    if (!isObj(c.cut)) c.cut = { tick: 0, what: '', who: '' };
  }
  st.version = (st.version as number) + 1;
}
