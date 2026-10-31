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
  /** Loans (see loans.ts; one it refuses does nothing): ask a ruler (`city`) to lend you `amount` (500, 1,000, 2,000, 3,000 or 5,000), offer to lend one `amount` at `rate` percent over `months`, accept or decline the terms their herald brought (`loan` its id), or repay your loan early. Debts (slice 28, `loan` its id): ask for more time, withhold payment (a toggle), grant or deny a ruler's plea for time, forgive what a ruler owes you, or demand it. */
  | { type: 'loan'; act: 'ask' | 'offer' | 'accept' | 'decline' | 'repay' | 'time' | 'withhold' | 'grant' | 'deny' | 'forgive' | 'demand'; city?: string; amount?: number; rate?: number; months?: number; loan?: number }
  /** Send your soldiers against a city (see expeditionRefusal in expeditions.ts: one it refuses sends nobody): a raiding party (`raid`, one or two companies, for part of what it owes) or a full force (`force`, most of your army, for the whole debt). */
  | { type: 'expedition'; city: string; kind: 'raid' | 'force' }
  /** Raise a company of hoplites or archers at a barracks (its id; see raiseRefusal in army.ts: one it refuses raises nothing). */
  | { type: 'raise'; barracks: number; kind: 'hoplite' | 'archer' | 'horseman' }
  /** Hire a company of mercenaries at a barracks: 'cretan' archers or 'arcadian' hoplites (see hireRefusal in army.ts). */
  | { type: 'hire'; barracks: number; kind: string }
  /** Dismiss a company (its id): its men go home to their old jobs, and their armour back to the stores (hirelings walk off). */
  | { type: 'dismiss'; company: number }
  /** Send a company's banner to a tile (see marchRefusal in army.ts), or back to its barracks (`tile` -1). */
  | { type: 'banner'; company: number; tile: number }
  /** Order a trireme at a shipyard (its id; see orderRefusal in fleet.ts). */
  | { type: 'trireme'; yard: number }
  /** A trireme's order (its id): guard a sea `lane` (a way's id, such as 'athens-sea'), or come home and guard the bay. */
  | { type: 'fleet'; trireme: number; act: 'guard' | 'home' | 'repair'; lane?: string } // (Slice 38: 'repair'.)
  /** Slice 30: crime's switch (crime.ts; also taxes day by day, harsh taxes' harder bite and fire's gentler first year), on as a game starts or a demo opens, off while a demo's history is played. */
  | { type: 'crime'; on: boolean }
  /** Slice 33: the seasons' switch (seasons.ts), on as a game starts and from the first tick of every demo's history; off in a bare state. */
  | { type: 'seasons'; on: boolean }
  // Slice 34
  /** Your vassals and allies (vassals.ts; an act it refuses does nothing): set a vassal's tribute (`good` -1 coin or a trade good's index, `weight` 0 light, 1 fair, 2 heavy); demand that a city submit; offer a debtor its debt for its loyalty; offer an alliance, or end one; send a full force to conquer a city (or crush a vassal arming against you); join or refuse an ally's call to war (`call` its id). */
  | { type: 'empire'; act: 'tribute' | 'submit' | 'debt' | 'ally' | 'unally' | 'conquer' | 'join' | 'refuse'; city?: string; good?: number; weight?: number; call?: number }
  // Slice 39
  /** The ambitions' switch (ambitions.ts), on as a game starts or a demo opens (what is already met is recorded quietly), off while a demo's history is played. */
  | { type: 'ambition'; on: boolean }
  /** Slice 36: mark out 4 x 4 estates' plots with these top-left tiles, in order (see estateRefusal in build.ts). */
  | { type: 'estate'; at: number[] }
  // Slice 37
  /** Your colonies (colonies.ts; an act it refuses does nothing): found one on a free site; set a colony's share (`share` 0 light, 1 fair, 2 heavy); rename it; send triremes at home to guard it (all, or `n`); bring them home. */
  | { type: 'colony'; act: 'found' | 'share' | 'name' | 'guard' | 'recall'; site: string; share?: number; name?: string; n?: number }
  // Slice 43
  /** A colony's works, wants and governor (colonyworks.ts; an act it refuses does nothing): fund a work (`work`: fields, harbour, agora, temple, walls, trade); send what it asks for; choose candidate `n` to govern it; dismiss its governor. */
  | { type: 'colonyworks'; act: 'work' | 'want' | 'governor' | 'dismiss'; site: string; work?: string; n?: number }
  // Slice 41
  /** The new kinds of crime's and gangs' switch (misdeeds.ts, gangs.ts), beside crime's own: on as a game starts or a demo opens, off while a demo's history is played. */
  | { type: 'crimes'; on: boolean }
  // Slice 44: the town's messages, read or pinned (messages.ts).
  | { type: 'messages'; act: 'read' | 'unread' | 'pin' | 'unpin' | 'allread'; ids?: number[] }
  // Slice 48: a granary's or storehouse's rule for a ware (`mode`: 0 accept, 1 don't accept, 2 get, 3 empty; `limit`: 0 all of its room, 1 three quarters, 2 half, 3 a quarter), or for every ware at once (`all`: 'none' accepts nothing, 'all' everything, as built); a workplace paused, or given its workers first (storerules.ts).
  | { type: 'store'; id: number; ware?: number; mode?: number; limit?: number; all?: 'none' | 'all' }
  | { type: 'work'; id: number; paused?: boolean; first?: boolean }
  // Slice 45
  /** The law (justice.ts): the punishment the court gives for one kind of crime ('theft', 'pickpocket', 'vandal', 'arson', 'smuggling', or 'gang' for a gang's men), one of 'fine', 'stocks', 'prison', 'labour', 'exile', 'execution'. */
  | { type: 'law'; crime: string; punishment: string }
  // Slice 47
  /** A colonial empire (colonyempire.ts; an act it refuses does nothing): station a company (`company`, or the first at home) in a colony, or bring it home; station triremes at home off it (all, or `n`), or bring them home; strike at `city` from it with the company there; offer it a treaty that makes it a free ally; a shipment loading for it: sail with what is aboard, or call it off. */
  | { type: 'colonyempire'; act: 'station' | 'home' | 'ships' | 'shipshome' | 'strike' | 'free' | 'sail' | 'cancel'; site: string; company?: number; n?: number; city?: string }
  // Slice 49
  /** Health's switch (health.ts): on as a game starts or a demo opens, off while a demo's history is played. */
  | { type: 'health'; on: boolean }
  /** A quarantine for a season (on), or lifted (off). */
  | { type: 'quarantine'; on: boolean }
  // Phase 7 groundwork
  /** The gods' switch (pantheon.ts): on as a game starts or a demo opens, off while a demo's history is played. */
  | { type: 'gods'; on: boolean };

/** What the build command builds. */
export type BuildKind = 'farm' | 'granary' | 'agora' | 'shrine' | 'theatre' | 'taxoffice' | 'lodge' | 'dairy' | 'grove' | 'press' | 'storehouse' | 'pasture' | 'vineyard' | 'winery' | 'watchpost' | 'architect' | 'trading' | 'yard' | 'mine' | 'armoury' | 'barracks' | 'tower' | 'shipyard' | 'quarry' | 'loggers' | 'masons' | 'lighthouse' | 'colossus' | 'stadium' | 'horsefarm' | 'court' | 'prison' | 'infirmary' | 'asklepieion';
export const BUILD_KINDS: readonly BuildKind[] = ['farm', 'granary', 'agora', 'shrine', 'theatre', 'taxoffice', 'lodge', 'dairy', 'grove', 'press', 'storehouse', 'pasture', 'vineyard', 'winery', 'watchpost', 'architect', 'trading', 'yard', 'mine', 'armoury', 'barracks', 'tower', 'shipyard', 'quarry', 'loggers', 'masons', 'lighthouse', 'colossus', 'stadium', 'horsefarm', 'court', 'prison', 'infirmary', 'asklepieion'];

export interface StampedCommand {
  /** The tick on which the command is applied. */
  tick: number;
  /** Order within the tick (queue order). */
  seq: number;
  command: Command;
}
