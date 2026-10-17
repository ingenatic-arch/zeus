import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import type { SimState } from '../sim/state';
import { Animals } from './animals';
import { Bridges } from './bridges';
import { FolkLooks } from './looks';
import { facingOf, Homes } from './homes';
import { ShipView } from './ship';
import { Streets } from './streets';
import type { Plants } from './trees';
import { Walkers } from './walkers';
import { Works } from './works';

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
  readonly bridges: Bridges;
  readonly animals: Animals;
  /** The merchant ship, when she is in sight. */
  readonly ship = new ShipView();
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
    this.animals = new Animals(map, this.folk);
    this.walkers.ground = (x, z) => this.bridges.heightAt(x, z) ?? map.heightAt(x, z);
    this.group.add(this.streets.group, this.homes.group, this.works.group, this.bridges.group, this.walkers.group, this.animals.group, this.folk.group, this.ship.group);
  }

  update(s: SimState, alpha: number, time: number): void {
    if (s.rev !== this.rev) this.sync(s);
    this.homes.update(time, s.wind.angle);
    this.works.update(s, time);
    this.folk.begin();
    this.walkers.update(s, alpha, time);
    this.animals.update(s, alpha, time);
    this.folk.end();
    this.ship.update(s, alpha, time);
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
    // Homes changing level re-draw their patch of ground; so does a farm, granary or agora turning to face a new road.
    // Only the chunks of buildings that came, went or changed (not every building's, as before).
    const keys = new Map<number, { key: string; chunk: number }>();
    for (const b of s.buildings) {
      const key = `${b.kind}:${b.level}${b.kind === 'home' || b.kind === 'fountain' || b.kind === 'shrine' || b.kind === 'taxoffice' ? '' : ':' + facingOf(s, size, b).toFixed(1)}`;
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
    if (s.cleared !== this.cleared) {
      this.cleared = s.cleared;
      this.plants.sync(s.cleared);
    }
  }
}
