/**
 * The map of Greece: a tabletop relief of the Aegean in its own scene and
 * camera, drawn on the city's renderer while it is open, with labels over
 * the cities, a hover card and each city's panel. This whole module is
 * loaded (and its scene built) the first time the map opens, so the city's
 * first load never pays for it.
 *
 * It only reads the sim; renaming your city goes out as a command.
 */
import * as THREE from 'three';
import { alongLine, CITY_IDS, lineLength, OTHER_ROADS, PLACES, project, TABLE_D, TABLE_W, wayOf, wayPoints, WAYS, type CityId } from '../../map/greece';
import type { Command } from '../../sim/commands';
import type { SimState } from '../../sim/state';
import { tyreShip } from '../../sim/world';
import { caravansOnMap, routeWay, visitorOnMap } from '../../sim/routes';
import { morph } from '../../ui/morph';
import { hoverHtml, labelHtml, moods, panelHtml } from '../../ui/greece';
import { routeEvent } from '../../ui/routes';
import { CameraRig, type CameraView, type RigLimits } from '../cameraRig';
import { caravanModel, cityModel, shipModel, tableModel, wayMarks } from './models';
import { buildRelief, reliefMesh, type Relief } from './relief';

/** Where the camera first looks: the whole Aegean, a little tilted, your city towards the lower left. */
const START: CameraView = { x: TABLE_W * 0.5, z: TABLE_D * 0.6, yaw: 0, dist: 146, tilt: -0.12 };
const LIMITS: RigLimits = { minDist: 24, maxDist: 175, x0: 0, z0: 0, x1: TABLE_W, z1: TABLE_D, pitchNear: 0.58, pitchFar: 1.12 };
/** How the cities stand out: your own and the four with rulers a little larger than life. */
const SCALE: Record<CityId, number> = { home: 1.7, athens: 2.0, sparta: 1.85, corinth: 1.8, troy: 2.0, tyre: 1.6 };

export interface GreeceHost {
  renderer: THREE.WebGLRenderer;
  canvas: HTMLCanvasElement;
  ui: HTMLElement;
  send: (c: Command) => void;
}

export class GreeceMap {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(40, 1, 0.5, 3000);
  readonly rig: CameraRig;
  readonly relief: Relief;
  /** How long building the scene took (ms of main-thread time, the first open). */
  readonly buildMs: number;
  open = false;
  /** The city whose panel is open, or null. */
  shown: CityId | null = null;
  hovered: CityId | 'ship' | null = null;
  private readonly host: GreeceHost;
  private readonly labels = new Map<CityId, HTMLElement>();
  private readonly layer: HTMLElement;
  private readonly card: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly body: HTMLElement;
  private readonly ship: THREE.Mesh;
  private readonly tyreLane: number[];
  /** The trade routes' ships and caravans, made as they are first needed (by route key; a caravan's by key and number). */
  private readonly travellers = new Map<string, THREE.Mesh>();
  private readonly mat: THREE.Material;
  private readonly home: THREE.Mesh;
  private homeSize = -1;
  private renaming = false;
  private draft = '';
  private panelAt = -Infinity;
  private labelAt = -Infinity;
  private pointer = { x: -1, y: -1 };
  private state: SimState | null = null;
  private readonly v = new THREE.Vector3();

  constructor(host: GreeceHost, now: () => number) {
    const t0 = now();
    this.host = host;
    const scene = this.scene;
    scene.background = new THREE.Color('#3a2c21');
    scene.fog = new THREE.Fog('#3a2c21', 260, 520);
    this.relief = buildRelief();
    scene.add(reliefMesh(this.relief));
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(TABLE_W, TABLE_D).rotateX(-Math.PI / 2).translate(TABLE_W / 2, 0, TABLE_D / 2),
      new THREE.MeshStandardMaterial({ color: '#3d9fc0', transparent: true, opacity: 0.42, roughness: 0.18, metalness: 0.05, depthWrite: false }),
    );
    water.name = 'greece-water';
    water.renderOrder = 1;
    scene.add(water);
    scene.add(tableModel());
    const lanes = WAYS.filter((w) => w.kind === 'sea').map(wayPoints);
    // (The road to Athens runs through Corinth: it is the two roads already drawn.)
    const roads = [...WAYS.filter((w) => w.kind === 'land' && w.id !== 'athens-land').map(wayPoints), ...OTHER_ROADS.map((r) => r.flatMap(([lon, lat]) => project(lon, lat)))];
    scene.add(wayMarks(roads, lanes, this.relief.heightAt));
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, flatShading: true });
    this.mat = mat;
    let home: THREE.Mesh | null = null;
    for (const id of CITY_IDS) {
      const m = new THREE.Mesh(cityModel(id), mat);
      const [x, z] = this.at(id);
      m.position.set(x, this.relief.heightAt(x, z), z);
      m.scale.setScalar(SCALE[id]);
      m.castShadow = true;
      m.name = `greece-city-${id}`;
      scene.add(m);
      if (id === 'home') home = m;
    }
    this.home = home as THREE.Mesh;
    this.tyreLane = wayPoints(wayOf('tyre-sea'));
    this.ship = new THREE.Mesh(shipModel(PLACES.tyre.colour, PLACES.tyre.trim), mat);
    this.ship.castShadow = true;
    this.ship.name = 'greece-ship';
    scene.add(this.ship);
    // Light: a warm low sun from the south-west across the table, and the room's glow.
    scene.add(new THREE.HemisphereLight('#fff1d8', '#6a4a30', 1.35));
    const sun = new THREE.DirectionalLight('#ffe7c4', 2.4);
    sun.position.set(TABLE_W * 0.5 - 70, 110, TABLE_D * 0.5 + 60);
    sun.target.position.set(TABLE_W / 2, 0, TABLE_D / 2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -95;
    sc.right = 95;
    sc.top = 95;
    sc.bottom = -95;
    sc.near = 10;
    sc.far = 320;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.05;
    scene.add(sun, sun.target);
    this.rig = new CameraRig(this.camera, this.relief, START, LIMITS);

    // The labels, the hover card and the panel.
    const layer = document.createElement('div');
    layer.className = 'greece-labels';
    layer.hidden = true;
    host.ui.appendChild(layer);
    this.layer = layer;
    for (const id of CITY_IDS) {
      const el = document.createElement('div');
      el.className = `glabel ${id}`;
      el.style.setProperty('--c', PLACES[id].colour);
      layer.appendChild(el);
      this.labels.set(id, el);
    }
    const card = document.createElement('div');
    card.className = 'greece-card';
    card.hidden = true;
    host.ui.appendChild(card);
    this.card = card;
    const panel = document.createElement('div');
    panel.className = 'household greece-panel';
    panel.hidden = true;
    panel.innerHTML = '<button class="close" title="Close (Esc)" aria-label="Close">×</button><div class="body"></div>';
    host.ui.appendChild(panel);
    this.panel = panel;
    this.body = panel.querySelector('.body') as HTMLElement;
    (panel.querySelector('.close') as HTMLElement).addEventListener('click', () => this.show(null));
    // A trade route's buttons: open it, tick a good, stock up to more or less (the panel redraws at once to show it).
    const routes = (e: Event): void => {
      if (this.state && routeEvent(e, this.state, host.send)) setTimeout(() => this.redraw(), 0);
    };
    this.body.addEventListener('change', routes);
    this.body.addEventListener('click', (e) => {
      routes(e);
      const t = e.target as HTMLElement;
      if (t.closest('.renamebtn') && this.state) {
        this.renaming = true;
        this.draft = this.state.world.name;
        this.redraw(true);
        const input = this.body.querySelector('input') as HTMLInputElement | null;
        input?.focus();
        input?.select();
      } else if (t.closest('.cancel')) {
        this.renaming = false;
        this.redraw(true);
      }
    });
    this.body.addEventListener('input', (e) => {
      const t = e.target as HTMLInputElement;
      if (t.name !== 'cityname') return;
      this.draft = t.value;
      const why = this.body.querySelector('.why');
      const ok = this.body.querySelector('.ok') as HTMLButtonElement | null;
      if (!this.state || !ok) return;
      // Only the warning and the button change while typing (the box itself is left alone).
      const html = panelHtml(this.state, 'home', true, this.draft);
      const t2 = document.createElement('template');
      t2.innerHTML = html;
      ok.disabled = !!(t2.content.querySelector('.ok') as HTMLButtonElement | null)?.disabled;
      const nw = t2.content.querySelector('.why');
      if (nw && !why) ok.closest('form')?.insertAdjacentElement('afterend', nw);
      else if (!nw && why) why.remove();
      else if (nw && why) why.textContent = nw.textContent;
    });
    this.body.addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = this.body.querySelector('.ok') as HTMLButtonElement | null;
      if (ok?.disabled) return;
      host.send({ type: 'name', name: this.draft });
      this.renaming = false;
      (document.activeElement as HTMLElement | null)?.blur?.();
      setTimeout(() => this.redraw(true), 0);
    });
    this.body.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.renaming) {
        e.stopPropagation();
        this.renaming = false;
        this.redraw(true);
      }
    });
    this.buildMs = now() - t0;
  }

  /** A city's place on the table (Tyre's ship moors beside its island). */
  at(id: CityId): [number, number] {
    return project(PLACES[id].lon, PLACES[id].lat);
  }

  toggle(on = !this.open): void {
    if (on === this.open) return;
    this.open = on;
    this.layer.hidden = !on;
    if (!on) {
      this.card.hidden = true;
      this.panel.hidden = true;
      this.hovered = null;
      this.renaming = false;
    } else if (this.shown) this.panel.hidden = false;
    document.body.classList.toggle('greece-open', on);
  }

  /** Open a city's panel (null closes it). */
  show(id: CityId | null): void {
    this.shown = id;
    this.renaming = false;
    this.panel.hidden = !id || !this.open;
    this.redraw(true);
  }

  /** The city whose label is under a screen point (labels let the pointer through to the canvas), or the city (or the ship) nearest it, within a finger's width. */
  pick(sx: number, sy: number): CityId | 'ship' | null {
    for (const id of CITY_IDS) {
      const el = this.labels.get(id) as HTMLElement;
      if (el.style.display === 'none') continue;
      const b = el.getBoundingClientRect();
      // (A little round the label, and its stem down to the city.)
      if (sx >= b.left - 3 && sx <= b.right + 3 && sy >= b.top - 3 && sy <= b.bottom + 7) return id;
    }
    const r = this.host.canvas.getBoundingClientRect();
    let best: CityId | 'ship' | null = null;
    let bd = 34 * 34;
    const test = (id: CityId | 'ship', x: number, y: number, z: number, reach = 1): void => {
      this.v.set(x, y, z).project(this.camera);
      if (this.v.z > 1) return;
      const dx = r.left + (this.v.x * 0.5 + 0.5) * r.width - sx;
      const dy = r.top + (-this.v.y * 0.5 + 0.5) * r.height - sy;
      const d = (dx * dx + dy * dy) / (reach * reach);
      if (d < bd) {
        bd = d;
        best = id;
      }
    };
    for (const id of CITY_IDS) {
      const [x, z] = this.at(id);
      test(id, x, this.relief.heightAt(x, z) + 0.6, z);
    }
    if (this.ship.visible) test('ship', this.ship.position.x, 0.6, this.ship.position.z, 0.8);
    return best;
  }

  hover(sx: number, sy: number): void {
    this.pointer = { x: sx, y: sy };
    this.hovered = sx < 0 ? null : this.pick(sx, sy);
    this.host.canvas.style.cursor = this.hovered ? 'pointer' : '';
    this.drawCard();
  }

  click(sx: number, sy: number): void {
    const p = this.pick(sx, sy);
    this.show(p === 'ship' ? 'tyre' : p);
  }

  private drawCard(): void {
    const s = this.state;
    if (!s || !this.hovered || !this.open) {
      this.card.hidden = true;
      return;
    }
    morph(this.card, hoverHtml(s, this.hovered));
    this.card.className = `greece-card${this.hovered !== 'ship' && this.hovered !== 'home' && this.hovered !== 'tyre' ? ' ruled' : ''}`;
    this.card.hidden = false;
    // Below and to the right of the pointer, or where there is no room for it there, above or to the left (never over the city it is about).
    const w = this.card.offsetWidth;
    const h = this.card.offsetHeight;
    const x = this.pointer.x + 18 + w <= innerWidth - 12 ? this.pointer.x + 18 : Math.max(12, this.pointer.x - 18 - w);
    const y = this.pointer.y + 18 + h <= innerHeight - 12 ? this.pointer.y + 18 : Math.max(12, this.pointer.y - 18 - h);
    this.card.style.left = `${x}px`;
    this.card.style.top = `${y}px`;
  }

  private redraw(now = false): void {
    const s = this.state;
    if (!s || !this.shown) return;
    if (!now && this.renaming) return;
    const html = panelHtml(s, this.shown, this.renaming, this.draft);
    if (now) this.body.innerHTML = html;
    else morph(this.body, html);
  }

  /** Each frame while open: the ship, the labels, the panel. */
  update(s: SimState, alpha: number, time: number, dt: number): void {
    this.state = s;
    this.rig.update(dt);
    const canvas = this.host.canvas;
    const aspect = (canvas.clientWidth || innerWidth) / (canvas.clientHeight || innerHeight);
    if (Math.abs(this.camera.aspect - aspect) > 1e-3) {
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
    }
    // Your city grows on the table with its people.
    const size = Math.round(s.population / 70);
    if (size !== this.homeSize) {
      this.homeSize = size;
      this.home.geometry.dispose();
      this.home.geometry = cityModel('home', s.population);
    }
    // The Tyre ship, where the city's own ship is (between ticks, smoothly), bobbing a little.
    const t = tyreShip(s, s.tick + alpha);
    const L = lineLength(this.tyreLane);
    const along = Math.max(0.9, Math.min(L - 1.1, t.along));
    const p = alongLine(this.tyreLane, along);
    this.ship.position.set(p.x, 0.02 + Math.sin(time * 1.7) * 0.03, p.z);
    const dir = t.homeward || t.where === 'tyre' ? 1 : -1;
    this.ship.rotation.set(Math.sin(time * 1.3) * 0.04, -Math.atan2(p.dz * dir, p.dx * dir), 0);
    this.drawTravellers(s, s.tick + alpha, time);
    // Labels over the cities.
    const r = canvas.getBoundingClientRect();
    const refresh = time - this.labelAt > 0.5;
    if (refresh) this.labelAt = time;
    for (const id of CITY_IDS) {
      const el = this.labels.get(id) as HTMLElement;
      const [x, z] = this.at(id);
      this.v.set(x, this.relief.heightAt(x, z) + 1.5 * SCALE[id], z).project(this.camera);
      const off = this.v.z > 1 || this.v.x < -1.1 || this.v.x > 1.1 || this.v.y < -1.1 || this.v.y > 1.1;
      el.style.display = off ? 'none' : '';
      el.style.transform = `translate(${(r.left + (this.v.x * 0.5 + 0.5) * r.width).toFixed(1)}px, ${(r.top + (-this.v.y * 0.5 + 0.5) * r.height).toFixed(1)}px) translate(-50%, -100%)`;
      el.classList.toggle('hot', this.hovered === id || this.shown === id);
      if (refresh) morph(el, labelHtml(s, id));
    }
    if (time - this.panelAt > 0.5) {
      this.panelAt = time;
      this.redraw();
      if (this.hovered) this.drawCard();
    }
  }

  /** The trade routes' ships on their lanes and caravans on their roads (hidden when at home, or in your city). */
  private drawTravellers(s: SimState, tick: number, time: number): void {
    const seen = new Set<string>();
    const piece = (key: string, make: () => THREE.BufferGeometry): THREE.Mesh => {
      let m = this.travellers.get(key);
      if (!m) {
        m = new THREE.Mesh(make(), this.mat);
        m.castShadow = true;
        m.name = `greece-${key}`;
        this.travellers.set(key, m);
        this.scene.add(m);
      }
      seen.add(key);
      m.visible = true;
      return m;
    };
    for (const r of s.world.routes) {
      const way = routeWay(r.city, r.kind);
      if (!way) continue;
      const line = wayPoints(wayOf(way.way));
      const L = lineLength(line);
      const city = r.city as CityId;
      if (r.kind === 'sea') {
        const v = visitorOnMap(r, tick);
        if (v.where === 'home') continue;
        const m = piece(`${r.city}-sea`, () => shipModel(PLACES[city].colour, PLACES[city].trim));
        const p = alongLine(line, Math.max(0.9, Math.min(L - 1.1, v.along)));
        const dir = v.homeward ? 1 : -1;
        m.position.set(p.x, 0.02 + Math.sin(time * 1.7 + 1.3) * 0.03, p.z);
        m.rotation.set(Math.sin(time * 1.3 + 0.7) * 0.04, -Math.atan2(p.dz * dir, p.dx * dir), 0);
      } else {
        const all = caravansOnMap(s, r, tick);
        all.forEach((c, i) => {
          const m = piece(`${r.city}-land-${i}`, () => caravanModel(PLACES[city].colour));
          const p = alongLine(line, Math.max(0.6, Math.min(L - 0.9, c.along)));
          const dir = c.homeward ? 1 : -1;
          m.position.set(p.x, this.relief.heightAt(p.x, p.z), p.z);
          // (A little larger than life, as the towns are, to be seen from across the table.)
          m.scale.setScalar(1.6);
          m.rotation.set(0, -Math.atan2(p.dz * dir, p.dx * dir), 0);
        });
      }
    }
    for (const [key, m] of this.travellers) if (!seen.has(key)) m.visible = false;
  }

  render(): void {
    this.host.renderer.render(this.scene, this.camera);
  }

  /** For the probe: what the map shows. */
  info(): { open: boolean; built: boolean; buildMs: number; shown: string; hovered: string; panel: string; card: string; ship: { x: number; z: number; visible: boolean }; cities: Record<string, { x: number; y: number }>; moods: Record<string, string>; name: string; view: Required<CameraView>; travellers: Record<string, { x: number; y: number }> } {
    const r = this.host.canvas.getBoundingClientRect();
    const cities: Record<string, { x: number; y: number }> = {};
    for (const id of CITY_IDS) {
      const [x, z] = this.at(id);
      this.v.set(x, this.relief.heightAt(x, z) + 0.6, z).project(this.camera);
      cities[id] = { x: r.left + (this.v.x * 0.5 + 0.5) * r.width, y: r.top + (-this.v.y * 0.5 + 0.5) * r.height };
    }
    this.v.copy(this.ship.position).setY(0.6).project(this.camera);
    cities.ship = { x: r.left + (this.v.x * 0.5 + 0.5) * r.width, y: r.top + (-this.v.y * 0.5 + 0.5) * r.height };
    // The trade routes' ships and caravans in sight, by route key (a caravan's with its number), where they are on the screen.
    const travellers: Record<string, { x: number; y: number }> = {};
    for (const [key, m] of this.travellers) {
      if (!m.visible) continue;
      this.v.copy(m.position).setY(m.position.y + 0.4).project(this.camera);
      travellers[key] = { x: r.left + (this.v.x * 0.5 + 0.5) * r.width, y: r.top + (-this.v.y * 0.5 + 0.5) * r.height };
    }
    return {
      open: this.open,
      built: true,
      buildMs: this.buildMs,
      shown: this.shown ?? '',
      hovered: this.hovered ?? '',
      panel: this.panel.hidden ? '' : (this.body.textContent ?? ''),
      card: this.card.hidden ? '' : (this.card.textContent ?? ''),
      ship: { x: this.ship.position.x, z: this.ship.position.z, visible: this.ship.visible },
      cities,
      moods: this.state ? moods(this.state) : {},
      name: this.state?.world.name ?? '',
      view: this.rig.view,
      travellers,
    };
  }
}

export function createGreece(host: GreeceHost, now: () => number): GreeceMap {
  return new GreeceMap(host, now);
}
