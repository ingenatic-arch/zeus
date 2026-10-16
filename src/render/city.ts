import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import type { SimState } from '../sim/state';
import { Bridges } from './bridges';
import { facingOf, Homes } from './homes';
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
  private rev = -1;
  private tiles: number[] = [];
  private buildingsKey = '';

  constructor(
    private readonly map: CoastMap,
    private readonly plants: Plants,
  ) {
    this.group.name = 'city';
    this.streets = new Streets(map);
    this.homes = new Homes(map);
    this.walkers = new Walkers(map);
    this.works = new Works(map);
    this.bridges = new Bridges(map);
    this.walkers.ground = (x, z) => this.bridges.heightAt(x, z) ?? map.heightAt(x, z);
    this.group.add(this.streets.group, this.homes.group, this.works.group, this.bridges.group, this.walkers.group);
  }

  update(s: SimState, alpha: number, time: number): void {
    if (s.rev !== this.rev) this.sync(s);
    this.homes.update(time, s.wind.angle);
    this.works.update(s, time);
    this.walkers.update(s, alpha, time);
  }

  private sync(s: SimState): void {
    const first = this.rev < 0;
    this.rev = s.rev;
    const size = this.map.size;
    const dirty = new Set<number>();
    // A changed tile changes its own chunk, and its neighbours' (roads join across).
    for (let t = 0; t < s.tiles.length; t++) {
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
    const size2 = this.map.size;
    const key = s.buildings.map((b) => `${b.id}:${b.kind}:${b.level}${b.kind === 'home' || b.kind === 'fountain' ? '' : ':' + facingOf(s, size2, b).toFixed(1)}`).join(',');
    if (key !== this.buildingsKey) {
      for (const b of s.buildings) dirty.add(this.streets.chunkKey(b.x, b.z));
      this.buildingsKey = key;
    }
    this.tiles = s.tiles.slice();
    this.streets.rebuild(s, dirty);
    this.homes.sync(s, !first);
    this.bridges.sync(s);
    this.plants.sync(s.cleared);
  }
}
