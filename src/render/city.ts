import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import type { SimState } from '../sim/state';
import { Animals } from './animals';
import { ArmyView } from './army';
import { FleetView } from './fleet';
import { Bridges } from './bridges';
import { FolkLooks } from './looks';
import { facingOf, Homes } from './homes';
import { routeOf } from '../sim/routes';
import { bandsAt, sheltering } from '../sim/raids';
import { cityShipColours, giftLook, ShipView, visitorLook } from './ship';
import { tributeShipAt } from '../sim/vassals';
import { SHIP_ANCHORED, SHIP_COMING } from '../sim/trade';
// Slice 37: your settlers' ship at anchor and sailing out.
import { visitorAt } from '../sim/routes';
import { Streets } from './streets';
import type { Plants } from './trees';
import { Walkers } from './walkers';
import { WallsView } from './walls';
import { Works } from './works';
import { Workfolk } from './workfolk';
// Slice 35: the masons' yards and the monuments.
import { MonumentsView } from './monuments';

const NO_ONE: ReadonlySet<number> = new Set();

/**
 * Everything the player has built and everyone walking about, read from the
 * sim state. Static parts (roads, homes, cleared trees) are rebuilt only for
 * the chunks that changed; walkers are redrawn every frame.
 */
export class CityView {
  readonly group = new THREE.Group();
  readonly streets: Streets;
  readonly homes: Homes;
  readonly walkers: Walkers;
  readonly works: Works;
  readonly workfolk: Workfolk;
  /** The masons' yards and the monuments, at every stage of their building (slice 35). */
  readonly monuments: MonumentsView;
  readonly bridges: Bridges;
  /** The walls, gates, towers and breaches (slice 25). */
  readonly walls: WallsView;
  readonly animals: Animals;
  /** The soldiers and their companies' banners (slice 23). */
  readonly army: ArmyView;
  /** The triremes and the enemy ships in the bay (slice 26). */
  readonly fleet: FleetView;
  /** The merchant ship, when she is in sight. */
  readonly ship = new ShipView();
  /** The sea routes' ships, by city, made as each route opens. */
  readonly visitors = new Map<string, ShipView>();
  /** Your gift ships, sailing out of the bay with a gift of goods for a ruler, by the city they sail for (made as the first sails; gifts to two cities can leave together). */
  readonly giftShips = new Map<string, ShipView>();
  /** (Slice 34) Vassals' tribute ships, by city (slice 37: your colonies' by 'colony:<site>'). */
  readonly tributeShips = new Map<string, ShipView>();
  /** (Slice 37) Your settlers' ships, by the site they sail for. */
  readonly colonyShips = new Map<string, ShipView>();
  /** The walkers' and animals' merged meshes. */
  readonly folk = new FolkLooks();
  private rev = -1;
  private tilesRev = -1;
  private tiles: number[] = [];
  private buildingKeys = new Map<number, { key: string; chunk: number }>();
  /** The cleared-plants list last drawn (the sim replaces it whenever it changes). */
  private cleared: readonly number[] | null = null;

  constructor(
    private readonly map: CoastMap,
    private readonly plants: Plants,
  ) {
    this.group.name = 'city';
    this.streets = new Streets(map);
    this.homes = new Homes(map);
    this.walkers = new Walkers(map, this.folk);
    this.works = new Works(map);
    this.bridges = new Bridges(map);
    this.walls = new WallsView(map);
    this.animals = new Animals(map, this.folk);
    this.army = new ArmyView(map, this.folk);
    this.fleet = new FleetView(map);
    this.walkers.ground = (x, z) => this.bridges.heightAt(x, z) ?? map.heightAt(x, z);
    // Slice 32: the works' people (quarrymen, loggers, sledges, miners).
    this.workfolk = new Workfolk(map, this.folk);
    this.workfolk.ground = this.walkers.ground;
    this.walkers.workfolk = this.workfolk;
    // Slice 35: the monuments, and where their builders and the games' visitors stand on them.
    this.monuments = new MonumentsView(map);
    this.workfolk.stand = (st, b, x, z) => this.monuments.standAt(st, b, x, z);
    this.army.ground = this.walkers.ground;
    this.group.add(this.streets.group, this.homes.group, this.works.group, this.bridges.group, this.walls.group, this.walkers.group, this.animals.group, this.army.group, this.folk.group, this.ship.group, this.fleet.group, this.monuments.group);
  }

  update(s: SimState, alpha: number, time: number, face?: THREE.Quaternion): void {
    if (s.rev !== this.rev) this.sync(s);
    this.homes.update(time, s.wind.angle, face);
    this.works.update(s, time);
    this.monuments.update(s, time);
    // Slice 32: the trees being chopped and felled, and the woods growing back.
    this.plants.works(s, alpha, time);
    this.folk.begin();
    // Raiders on the map: whoever is near them has run indoors (the sim's own rule), and is not drawn.
    const bands = bandsAt(s);
    this.walkers.hidden = bands.length ? new Set(s.walkers.filter((w) => sheltering(bands, w)).map((w) => w.id)) : NO_ONE;
    // (A gate's door opens for your own people going through it while raiders are about.)
    this.walls.frame(s, this.walkers.hidden);
    this.walkers.update(s, alpha, time);
    this.workfolk.miners(s, alpha);
    this.animals.update(s, alpha, time);
    this.army.update(s, alpha, time);
    this.folk.end();
    this.ship.update(s, alpha, time);
    this.fleet.update(s, alpha, time);
    for (const g of s.world.gifts) {
      if (g.from !== 'home' || g.phase !== 1 || !g.ship || this.giftShips.has(g.to)) continue;
      const view = new ShipView(giftLook(g.to), cityShipColours('home'), `ship-gift-${g.to}`, 0.7 + this.giftShips.size * 1.3);
      this.giftShips.set(g.to, view);
      this.group.add(view.group);
    }
    for (const view of this.giftShips.values()) view.update(s, alpha, time);
    for (const r of s.world.routes) {
      if (r.kind !== 'sea') continue;
      let view = this.visitors.get(r.city);
      if (!view) {
        const city = r.city;
        view = new ShipView((st, t) => {
          const route = routeOf(st, city, 'sea');
          return route ? visitorLook(route, t) : null;
        }, cityShipColours(city), `ship-${city}`, 1.3 + this.visitors.size * 2.1);
        this.visitors.set(r.city, view);
        this.group.add(view.group);
      }
    }
    for (const view of this.visitors.values()) view.update(s, alpha, time);
    // Slice 34: a vassal's tribute ship, laden coming in, riding at anchor while its cargo comes ashore (one view a city, as the gift ships).
    for (const x of s.empire.tribute) {
      // (Slice 37: a colony's share comes on its own ship, one view a colony.)
      const key = x.colony ? `colony:${x.colony}` : x.city;
      if (!x.ship || this.tributeShips.has(key)) continue;
      const city = x.city;
      const colony = x.colony;
      const view = new ShipView((st, tk) => {
        const tr = st.empire.tribute.find((y) => y.city === city && y.colony === colony && y.ship);
        const at = tr ? tributeShipAt(tr, tk) : null;
        if (!tr?.ship || !at) return null;
        const v = tr.ship;
        const coming = v.phase === SHIP_COMING;
        return { at, furled: v.phase === SHIP_ANCHORED || (coming && at.inward > v.stop - 0.015), laden: coming || (v.phase === SHIP_ANCHORED && tr.phase === 'bay'), calm: v.phase === SHIP_ANCHORED };
      }, cityShipColours(city), colony ? `ship-levy-colony-${colony}` : `ship-levy-${city}`, 0.4 + this.tributeShips.size * 1.7);
      this.tributeShips.set(key, view);
      this.group.add(view.group);
    }
    for (const view of this.tributeShips.values()) view.update(s, alpha, time);
    // Slice 37: your settlers' ship sailing in, riding at anchor off the jetty while the families are rowed out, and sailing out laden with them.
    for (const f of s.empire.foundings) {
      if (!f.ship || this.colonyShips.has(f.site)) continue;
      const site = f.site;
      const view = new ShipView((st, tk) => {
        const g = st.empire.foundings.find((y) => y.site === site && y.ship);
        const v = g?.ship;
        const at = v ? visitorAt(v, tk) : null;
        if (!g || !v || !at) return null;
        const coming = v.phase === SHIP_COMING;
        return { at, furled: v.phase === SHIP_ANCHORED || (coming && at.inward > v.stop - 0.015), laden: g.phase !== 'gathering' && g.people > 0, calm: v.phase === SHIP_ANCHORED };
      }, cityShipColours('home'), `ship-colony-${site}`, 1.1 + this.colonyShips.size * 1.5);
      this.colonyShips.set(site, view);
      this.group.add(view.group);
    }
    for (const view of this.colonyShips.values()) view.update(s, alpha, time);
  }

  private sync(s: SimState): void {
    const first = this.rev < 0;
    this.rev = s.rev;
    const size = this.map.size;
    const dirty = new Set<number>();
    // A changed tile changes its own chunk, and its neighbours' (roads join across). Only looked
    // for when the tiles changed (not when settlers arrive or a home changes level).
    const tilesChanged = s.tilesRev !== this.tilesRev;
    this.tilesRev = s.tilesRev;
    for (let t = 0; tilesChanged && t < s.tiles.length; t++) {
      if (!first && this.tiles[t] === s.tiles[t]) continue;
      if (first && s.tiles[t] === 0) continue;
      const tx = t % size;
      const tz = (t - tx) / size;
      for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = tx + dx;
        const z = tz + dz;
        if (x >= 0 && z >= 0 && x < size && z < size) dirty.add(this.streets.chunkKey(x, z));
      }
    }
    // A plot becoming a home (or a home a plot again) re-draws its patch of ground; so does a farm, granary or agora
    // turning to face a new road. The ground under a home is the same at every level above a plot (see plotGround), so
    // a home rising or falling back a level (a street of villas rising) doesn't rebuild its chunk (slice 14's review:
    // that was most of a big town's cost per frame). Only the chunks of buildings that came, went or changed.
    const keys = new Map<number, { key: string; chunk: number }>();
    for (const b of s.buildings) {
      const key = `${b.kind}:${b.level > 0 ? 1 : 0}${b.kind === 'home' || b.kind === 'fountain' || b.kind === 'shrine' || b.kind === 'taxoffice' ? '' : ':' + facingOf(s, size, b).toFixed(1)}`;
      const chunk = this.streets.chunkKey(b.x, b.z);
      keys.set(b.id, { key, chunk });
      if (this.buildingKeys.get(b.id)?.key !== key) dirty.add(chunk);
    }
    for (const [id, was] of this.buildingKeys) if (!keys.has(id)) dirty.add(was.chunk);
    this.buildingKeys = keys;
    if (tilesChanged) this.tiles = s.tiles.slice();
    if (dirty.size) this.streets.rebuild(s, dirty);
    this.homes.sync(s, !first);
    if (tilesChanged) this.bridges.sync(s);
    this.walls.sync(s);
    if (s.cleared !== this.cleared) {
      this.cleared = s.cleared;
      this.plants.sync(s.cleared);
    }
  }
}
