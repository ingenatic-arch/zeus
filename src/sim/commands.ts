/**
 * Every player action reaches the simulation as a command through one queue.
 * A command is stamped with the tick it applies on and applied at the start of
 * that tick, in the order it was queued. The applied commands form a log;
 * replaying the log on a fresh sim with the same seed gives the same state.
 *
 * Commands carry exactly what to build (tile lists), not how the tool chose
 * it, so a replay never depends on the route-finding of the day.
 */
export type Command =
  /** Lay road on these tiles (tile indices), in order; a run of wet tiles is a bridge, laid whole or not at all. */
  | { type: 'road'; tiles: number[] }
  /** Draw wall over these tiles (tile indices), in order: a stretch on open dry ground, a gate over a road, a cracked or broken stretch mended (slice 25: see walls.ts). */
  | { type: 'wall'; tiles: number[] }
  /** Mark out 2 x 2 housing plots with these top-left tiles, in order. */
  | { type: 'plots'; at: number[] }
  /** Build 2 x 2 fountains with these top-left tiles, in order. */
  | { type: 'fountain'; at: number[] }
  /** Build farms, granaries, the agora, theatres, hunting lodges, dairies, olive groves, olive presses, storehouses, sheep pastures, vineyards or wineries (3 x 3), the trading post (3 x 3), or shrines, tax offices, watch posts and architects' offices (2 x 2), with these top-left tiles, in order. */
  | { type: 'build'; kind: BuildKind; at: number[] }
  /** Set the tax rate: 0 (none) to 4 (harsh). */
  | { type: 'tax'; rate: number }
  /** Add a stall for a good (by its ware number: oil is 4, fleece 5, wine 7) to the agora covering tile `at`. */
  | { type: 'stall'; at: number; good: number }
  /** Clear a rectangle of tiles (inclusive): roads, homes, and trees on empty ground. */
  | { type: 'clear'; x0: number; z0: number; x1: number; z1: number }
  /** Undo the last build action. */
  | { type: 'undo' }
  /** Let fire risk and wear build up (on in every game: see SimState.hazards), or not. */
  | { type: 'hazards'; on: boolean }
  /** The trading post: sell a good to the ship or not (`sell`), and how much of it the city keeps (`keep`, measures); the good by its ware number (wheat 0, meat 1, cheese 2, oil 4, fleece 5, wine 7). */
  | { type: 'trade'; good: number; sell?: boolean; keep?: number }
  /** Rename your city (see nameRefusal in world.ts: a name it refuses changes nothing). */
  | { type: 'name'; name: string }
  /** Open a trade route to a city, by land or by sea, for its fee (see routeRefusal in routes.ts: a route it refuses opens nothing). */
  | { type: 'route'; city: string; kind: 'land' | 'sea' }
  /** A route's trade in a good (by its ware number): sell it to them, buy it from them, and buying, how much to stock the stores up to. */
  | { type: 'deal'; city: string; kind: 'land' | 'sea'; good: number; sell?: boolean; buy?: boolean; upto?: number }
  /** Send a ruler a gift: drachmas (`good` -1: 100, 250 or 500) or goods from the stores (a ware number: 200, 400 or 800); see giftRefusal in diplomacy.ts (a gift it refuses sends nothing). */
  | { type: 'gift'; city: string; good: number; amount: number }
  /** Answer a ruler's request, offer or demand for tribute (a deal's id; see answerRefusal in favours.ts: an answer it refuses does nothing): promise it, send what it asks (or pay the tribute), refuse it, take or decline an offer. */
  | { type: 'answer'; deal: number; act: 'promise' | 'send' | 'refuse' | 'take' | 'decline' | 'goods' }
  /** Raise a company of hoplites or archers at a barracks (its id; see raiseRefusal in army.ts: one it refuses raises nothing). */
  | { type: 'raise'; barracks: number; kind: 'hoplite' | 'archer' }
  /** Hire a company of mercenaries at a barracks: 'cretan' archers or 'arcadian' hoplites (see hireRefusal in army.ts). */
  | { type: 'hire'; barracks: number; kind: string }
  /** Dismiss a company (its id): its men go home to their old jobs, and their armour back to the stores (hirelings walk off). */
  | { type: 'dismiss'; company: number }
  /** Send a company's banner to a tile (see marchRefusal in army.ts), or back to its barracks (`tile` -1). */
  | { type: 'banner'; company: number; tile: number };

/** What the build command builds. */
export type BuildKind = 'farm' | 'granary' | 'agora' | 'shrine' | 'theatre' | 'taxoffice' | 'lodge' | 'dairy' | 'grove' | 'press' | 'storehouse' | 'pasture' | 'vineyard' | 'winery' | 'watchpost' | 'architect' | 'trading' | 'yard' | 'mine' | 'armoury' | 'barracks' | 'tower';
export const BUILD_KINDS: readonly BuildKind[] = ['farm', 'granary', 'agora', 'shrine', 'theatre', 'taxoffice', 'lodge', 'dairy', 'grove', 'press', 'storehouse', 'pasture', 'vineyard', 'winery', 'watchpost', 'architect', 'trading', 'yard', 'mine', 'armoury', 'barracks', 'tower'];

export interface StampedCommand {
  /** The tick on which the command is applied. */
  tick: number;
  /** Order within the tick (queue order). */
  seq: number;
  command: Command;
}
