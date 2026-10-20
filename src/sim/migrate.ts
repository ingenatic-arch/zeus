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
 * Pure: it only reshapes plain data (the herds are placed from the baked
 * map). What it can't recognise it leaves alone, for the save checks to
 * refuse in plain words.
 */
import { coastMap } from '../map/bake';
import { MAP_SIZE } from '../map/coast';
import { TICKS_PER_MONTH } from './clock';
import { FINE } from './buildings';
import { gi, GOOD_COUNT, OIL } from './foods';
import { SIM_STATE_VERSION, type SimState, type WorldCity } from './state';
import { FAIR } from './taxes';
import { freshLedger } from './treasury';
import { freshHerds, wildRng } from './wild';
import { DEFAULT_KEEP, freshTrade, OLD_GOODS, PRICES, TRADE_GOODS } from './trade';
import { armsOf, freshWorld, marketPrice, moodLevel, moodOf, normalStock, usualTrail } from './world';
import { freshArmy } from './army';
import { freshBook } from './stockbook';
import { nextFestival } from './festivals';
import type { CityId } from '../map/greece';

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

function from21(st: Record<string, unknown>): void {
  // Copper and armour (slice 23): every building's goods one copper and one armour longer, and every trade
  // record two trade goods longer. Each city of Greece makes and uses them by its character (armsOf), at its
  // usual price for them, with nothing pushing it; nothing was traded. No barracks, so no army.
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
