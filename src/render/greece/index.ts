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
import { alongLine, CITY_IDS, lineLength, meetPoint, OTHER_ROADS, PLACES, project, RIVAL_WAYS, rivalPoints, RULED, SITES, TABLE_D, TABLE_W, wayOf, wayPoints, WAYS, type CityId } from '../../map/greece';
import { baseOf } from '../../sim/growth';
import { siteLabelHtml } from '../../ui/rivals';
import type { CoastMap } from '../../map/bake';
import type { Command } from '../../sim/commands';
import type { SimState } from '../../sim/state';
import { tyreShip } from '../../sim/world';
import { caravansOnMap, routeWay, visitorOnMap } from '../../sim/routes';
import { giftOnMap } from '../../sim/diplomacy';
import { raidOnMap } from '../../sim/raids';
import { expeditionMen, expeditionOnMap } from '../../sim/expeditions';
import { armiesOnMap } from '../../sim/rivals';
import { aidOnMap, tributeOnMap } from '../../sim/vassals';
import { stationAlong, triremeOnMap } from '../../sim/fleet';
import { FESTIVALS, festivalOn } from '../../sim/festivals';
import { fieldColour, newsHtml } from '../../ui/rivals';
import { morph } from '../../ui/morph';
import { loanEvent } from '../../ui/loans';
import { empireEvent } from '../../ui/empire';
import { CITY_TABS, cityOfTraveller, giftKey, hoverHtml, labelHtml, moods, panelHtml, type CityTab } from '../../ui/greece';
import { routeEvent } from '../../ui/routes';
import { CameraRig, type CameraView, type RigLimits } from '../cameraRig';
import { armyBody, armyModel, BODY, bandModel, caravanModel, cityModel, closedWay, festivalModel, fieldsModel, fleetModel, puffGeometry, shipModel, siteModel, swordsModel, tableModel, wayMarks } from './models';
import { buildRelief, reliefMesh, type Relief } from './relief';

/** Where the camera first looks: the whole Aegean, a little tilted, your city towards the lower left.
 * (Slice 31: drawn back and south so Memphis and Cyrene on the southern edge and Thasos in the north are on the table at first look.) */
const START: CameraView = { x: TABLE_W * 0.5, z: TABLE_D * 0.62, yaw: 0, dist: 170, tilt: -0.1 };
/** Travellers on the map are drawn larger from this camera distance on, up to FAR_MOST times. */
const FAR_FROM = 80;
const FAR_MOST = 1.8;
/** An army on a road is drawn larger from afar only up to this: the roads between the cities are short, and at FAR_MOST two armies at Megara reached into Corinth and Athens themselves (slice 22's review). */
const ARMY_FAR_MOST = 1.25;
/** Your expedition's army, alone on its road, may grow further from afar (slice 29). */
const EXPEDITION_FAR_MOST = 1.6;
const LIMITS: RigLimits = { minDist: 24, maxDist: 175, x0: 0, z0: 0, x1: TABLE_W, z1: TABLE_D, pitchNear: 0.58, pitchFar: 1.12 };
/** How the cities stand out: your own and the four with rulers a little larger than life (slice 31: the newcomers too, Argos the smallest and Memphis the greatest). */
const SCALE: Record<CityId, number> = { home: 1.7, athens: 2.0, sparta: 1.85, corinth: 1.8, troy: 2.0, tyre: 1.6, thebes: 1.8, argos: 1.5, knossos: 1.85, rhodes: 1.7, memphis: 2.1 };
/** (Slice 31) A ruled city's model grows and shrinks with its people against its usual number, in steps of a tenth so it never jitters: from three quarters to nearly half again as large. */
const GROW_LEAST = 0.75;
const GROW_MOST = 1.4;
/** A site's piece, a little larger than life as the towns are. */
const SITE_SCALE = 1.6;
/** How far from the pointer (screen pixels) a moving piece's body answers it. */
const BODY_REACH = 13;
/** Smoke puffs over each festival's altar. */
const PUFFS = 6;

export interface GreeceHost {
  renderer: THREE.WebGLRenderer;
  canvas: HTMLCanvasElement;
  ui: HTMLElement;
  send: (c: Command) => void;
  /** Your city's land (gifts of goods need to know their way out of it). */
  map: CoastMap;
}

/** (Slice 31) Where a label hanging below its place stands (its bottom), let down further if a bar it is under would still cover it: at 1600 x 900 Troy's hung under the lines below the top bar. */
function clearOf(bars: ReadonlyArray<[number, number, number]>, lx: number, lw: number, lh: number, ly: number): number {
  for (const [barL, barR, barB] of bars) if (lx + lw / 2 > barL && lx - lw / 2 < barR && ly - lh < barB + 4) ly = barB + 4 + lh;
  return ly;
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
  /** A city, the Tyre ship ('ship'), or a route's trader on the map ('trav:' and its key, such as 'trav:corinth-land-0'). */
  hovered: CityId | 'ship' | `trav:${string}` | null = null;
  private readonly host: GreeceHost;
  private readonly labels = new Map<CityId, HTMLElement>();
  /** (Slice 31) Each city's model, drawn larger or smaller with its people (the step it is drawn at), and each site's piece and label (with what it shows now: free, or whose colony at what size). */
  private readonly towns = new Map<CityId, THREE.Mesh>();
  private readonly grown = new Map<CityId, number>();
  private readonly sites = new Map<string, { mesh: THREE.Mesh; look: string }>();
  private readonly siteLabels = new Map<string, HTMLElement>();
  /** Where the cities' labels stand on the screen this frame (left, top, right, bottom), for the sites' labels to keep clear of. */
  private placed: Array<[number, number, number, number]> = [];
  /** Each label's size on screen (measured when its words are refreshed), to see what passes under it. */
  private readonly labelSize = new Map<CityId, [number, number]>();
  private readonly layer: HTMLElement;
  private readonly card: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly body: HTMLElement;
  private readonly ship: THREE.Mesh;
  private readonly tyreLane: number[];
  /** The trade routes' ships and caravans, made as they are first needed (by route key; a caravan's by key and number); gifts, bands, armies and fleets, and the swords where a war's armies meet. */
  private readonly travellers = new Map<string, THREE.Mesh>();
  /** Each ruled city's fields, coloured by its harvest. */
  private readonly fields = new Map<CityId, THREE.Mesh>();
  /** A war's way drawn red while it is closed (by rival way), made as first needed. */
  private readonly closed = new Map<string, THREE.InstancedMesh>();
  /** Each festival's banners round its city and the smoke over its altar, made as first needed. */
  private readonly feasts = new Map<CityId, { banners: THREE.Mesh; puffs: THREE.Mesh[] }>();
  private readonly news: HTMLElement;
  private newsOpen = true;
  private newsHtml = '';
  private readonly mat: THREE.Material;
  private readonly home: THREE.Mesh;
  private homeSize = -1;
  private renaming = false;
  private draft = '';
  /** The tab a ruled city's page shows (remembered from city to city while the map is open). */
  private tab: CityTab = 'ruler';
  private panelAt = -Infinity;
  private labelAt = -Infinity;
  /** The top bar and the City button on the screen, and the lines under the top bar: left, right and bottom of each (measured with the labels' words). */
  private barRect: Array<[number, number, number]> | null = null;
  private siteSize = new Map<string, [number, number]>();
  private armyTag!: HTMLElement;
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
    // (Slice 31: and Thebes' runs through Corinth and Megara, drawn as its own last stretch; a way marked not drawn is made of others.)
    const roads = [...WAYS.filter((w) => w.kind === 'land' && w.drawn !== false).map(wayPoints), ...OTHER_ROADS.map((r) => r.flatMap(([lon, lat]) => project(lon, lat)))];
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
      this.towns.set(id, m);
      if (id === 'home') home = m;
    }
    // (Slice 31) The empty sites: a cairn and a pennant, or a colony's houses in its founder's colours.
    for (const site of SITES) {
      const m = new THREE.Mesh(siteModel('#efe6cf', '#efe6cf', 0), mat);
      const [x, z] = project(site.lon, site.lat);
      m.position.set(x, this.relief.heightAt(x, z), z);
      m.scale.setScalar(SITE_SCALE);
      m.castShadow = true;
      m.name = `greece-site-${site.id}`;
      scene.add(m);
      this.sites.set(site.id, { mesh: m, look: '' });
    }
    this.home = home as THREE.Mesh;
    // Each ruled city's fields, beside it on its plain: the flattest dry ground a little way out, in front of it as the map is first seen (its label stands behind it).
    RULED.forEach((id, i) => {
      const [cx, cz] = this.at(id);
      const h = this.relief.heightAt;
      let best: [number, number, number, number] | null = null;
      for (const rad of [3.4, 4.4, 5.4, 6.4])
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2;
          const x = cx + Math.cos(a) * rad;
          const z = cz + Math.sin(a) * rad;
          const turn = a + Math.PI / 2;
          const hs: number[] = [];
          for (const u of [-1.5, 0, 1.5]) for (const v of [-1.5, 0, 1.5]) hs.push(h(x + u * Math.cos(turn) - v * Math.sin(turn), z + u * Math.sin(turn) + v * Math.cos(turn)));
          if (Math.min(...hs) < 0.15) continue;
          // (Clear of the other towns, yours above all. Behind the city its label stands over it: only if there is nowhere else, and then as far back as may be, beyond the label; slice 22, Athens' fields were under its label.)
          if (CITY_IDS.some((o) => o !== id && Math.hypot(this.at(o)[0] - x, this.at(o)[1] - z) < rad + 1.5)) continue;
          const score = Math.max(...hs) - Math.min(...hs) + (Math.sin(a) < -0.2 ? 8 + (6.4 - rad) * 2 : 0) + rad * 0.15;
          if (!best || score < best[3]) best = [x, z, turn, score];
        }
      if (!best) return;
      const [x, z, turn] = best;
      const m = new THREE.Mesh(fieldsModel(x, z, turn, i + 3, h), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true, color: '#a8b45a', polygonOffset: true, polygonOffsetFactor: -2 }));
      m.receiveShadow = true;
      m.name = `greece-fields-${id}`;
      m.userData.at = [x, h(x, z), z];
      scene.add(m);
      this.fields.set(id, m);
    });
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
    // (First in the page's overlay, so the lines under the top bar and the panels stand over the cities' labels.)
    host.ui.prepend(layer);
    this.layer = layer;
    for (const id of CITY_IDS) {
      const el = document.createElement('div');
      el.className = `glabel ${id}`;
      el.style.setProperty('--c', PLACES[id].colour);
      layer.appendChild(el);
      this.labels.set(id, el);
    }
    for (const site of SITES) {
      const el = document.createElement('div');
      el.className = `glabel site ${site.id}`;
      el.style.setProperty('--c', '#b8a27a');
      // (Before the cities' labels, so a city's stands over a site's where they meet.)
      layer.prepend(el);
      this.siteLabels.set(site.id, el);
    }
    // (Slice 31: a tag over your army on the march, standing over the cities' labels: from the opening view it was hard to pick out by Nea Argos'.)
    const tag = document.createElement('div');
    tag.className = 'glabel armytag';
    tag.style.setProperty('--c', PLACES.home.colour);
    tag.style.display = 'none';
    layer.appendChild(tag);
    this.armyTag = tag;
    const card = document.createElement('div');
    card.className = 'greece-card';
    card.hidden = true;
    host.ui.appendChild(card);
    this.card = card;
    // The News of Greece: the latest lines, newest first; a line opens its city's page; the heading folds it away.
    const news = document.createElement('div');
    news.className = 'greece-news';
    news.hidden = true;
    host.ui.appendChild(news);
    this.news = news;
    news.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('.nhead')) {
        this.newsOpen = !this.newsOpen;
        this.newsHtml = '';
        if (this.state) this.drawNews(this.state);
        return;
      }
      const li = t.closest('li[data-city]') as HTMLElement | null;
      if (li?.dataset.city) this.show(li.dataset.city as CityId);
    });
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
      // A loan's buttons: ask, offer (and choosing its terms), accept, decline, repay (ui/loans.ts).
      if (loanEvent(e, host.send) || empireEvent(e, host.send)) {
        this.labelAt = -Infinity;
        setTimeout(() => this.redraw(), 0);
        return;
      }
      const t = e.target as HTMLElement;
      const tab = t.closest('button[data-tab]') as HTMLButtonElement | null;
      const gift = t.closest('button[data-gift]') as HTMLButtonElement | null;
      const deal = t.closest('button[data-deal]') as HTMLButtonElement | null;
      const guard = t.closest('button[data-guard]') as HTMLButtonElement | null;
      const trihome = t.closest('button[data-trihome]') as HTMLButtonElement | null;
      if ((guard && !guard.disabled) || trihome) {
        // A trireme sent to guard the lane, or brought home (slice 26).
        if (guard) host.send({ type: 'fleet', trireme: Number(guard.dataset.guard), act: 'guard', lane: guard.dataset.lane ?? '' });
        else if (trihome) host.send({ type: 'fleet', trireme: Number(trihome.dataset.trihome), act: 'home' });
        this.labelAt = -Infinity;
        setTimeout(() => this.redraw(), 0);
      } else if (deal && !deal.disabled) {
        host.send({ type: 'answer', deal: Number(deal.dataset.deal), act: deal.dataset.act as 'promise' | 'send' | 'refuse' | 'take' | 'decline' | 'goods' });
        // (The labels too, at once: a seal gone, a band turned.)
        this.labelAt = -Infinity;
        setTimeout(() => this.redraw(), 0);
      } else if (tab) {
        this.tab = (CITY_TABS as readonly string[]).includes(tab.dataset.tab ?? '') ? (tab.dataset.tab as CityTab) : 'ruler';
        this.redraw(true);
        this.panel.scrollTop = 0;
      } else if (gift && !gift.disabled && this.shown) {
        host.send({ type: 'gift', city: this.shown, good: Number(gift.dataset.gift), amount: Number(gift.dataset.amount) });
        this.labelAt = -Infinity;
        setTimeout(() => this.redraw(), 0);
      } else if (t.closest('.renamebtn') && this.state) {
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
    this.news.hidden = !on;
    if (!on) {
      this.card.hidden = true;
      this.panel.hidden = true;
      this.hovered = null;
      this.renaming = false;
      this.tab = 'ruler';
    } else if (this.shown) this.panel.hidden = false;
    document.body.classList.toggle('greece-open', on);
  }

  /** Open a city's panel (null closes it), on a tab if given. */
  show(id: CityId | null, tab?: CityTab): void {
    this.shown = id;
    if (tab) this.tab = tab;
    this.renaming = false;
    this.panel.hidden = !id || !this.open;
    this.redraw(true);
  }

  /** The city whose label is under a screen point (labels let the pointer through to the canvas), or the city (or the ship) nearest it, within a finger's width. */
  pick(sx: number, sy: number): CityId | 'ship' | `trav:${string}` | null {
    // A moving piece under the pointer comes first (they are small, and often pass under a city's label): anywhere along its body, from its tail to its head, as it shows on the screen; the nearest.
    const r0 = this.host.canvas.getBoundingClientRect();
    const screen = (x: number, y: number, z: number): [number, number] | null => {
      this.v.set(x, y, z).project(this.camera);
      if (this.v.z > 1) return null;
      return [r0.left + (this.v.x * 0.5 + 0.5) * r0.width, r0.top + (-this.v.y * 0.5 + 0.5) * r0.height];
    };
    let near: `trav:${string}` | null = null;
    let nd = BODY_REACH * BODY_REACH;
    for (const [key, m] of this.travellers) {
      if (!m.visible) continue;
      const [back, front] = (m.userData.body as [number, number] | undefined) ?? [0, 0];
      // Its own +x, turned and scaled as it stands.
      const k = m.scale.x;
      const fx = Math.cos(m.rotation.y) * k;
      const fz = -Math.sin(m.rotation.y) * k;
      const swords = /^war-\d+$/.test(key);
      const y = m.position.y + (swords ? 0 : 0.3 * k);
      const a = screen(m.position.x + fx * back, y, m.position.z + fz * back);
      const b = screen(m.position.x + fx * front, y, m.position.z + fz * front);
      if (!a || !b) continue;
      // (A war's swords, small and standing between the two armies' heads, come first when the pointer is about as near them: slice 22's review.)
      const d = swords ? segmentDist2(sx, sy, a, b) * 0.25 - 1 : segmentDist2(sx, sy, a, b);
      if (d < nd) {
        nd = d;
        near = `trav:${key}`;
      }
    }
    if (near) return near;
    for (const id of CITY_IDS) {
      const el = this.labels.get(id) as HTMLElement;
      if (el.style.display === 'none') continue;
      const b = el.getBoundingClientRect();
      // (A little round the label, and its stem down to the city.)
      if (sx >= b.left - 3 && sx <= b.right + 3 && sy >= b.top - 3 && sy <= b.bottom + 7) return id;
    }
    // (Slice 31) A site's label, or its piece.
    for (const [id, el] of this.siteLabels) {
      if (el.style.display === 'none') continue;
      const b = el.getBoundingClientRect();
      if (sx >= b.left - 3 && sx <= b.right + 3 && sy >= b.top - 3 && sy <= b.bottom + 7) return `trav:site-${id}`;
    }
    // A city's fields, a little way from it (under the labels, which come first).
    for (const [id, m] of this.fields) {
      const [fx, fy, fz] = m.userData.at as [number, number, number];
      const p = screen(fx, fy + 0.05, fz);
      if (!p) continue;
      const d = (p[0] - sx) ** 2 + (p[1] - sy) ** 2;
      if (d < 15 * 15 && d < nd) {
        nd = d;
        near = `trav:fields-${id}`;
      }
    }
    if (near) return near;
    const r = this.host.canvas.getBoundingClientRect();
    let best: CityId | 'ship' | `trav:${string}` | null = null;
    let bd = 34 * 34;
    const test = (id: CityId | 'ship' | `trav:${string}`, x: number, y: number, z: number, reach = 1): void => {
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
    for (const [id, x] of this.sites) test(`trav:site-${id}`, x.mesh.position.x, x.mesh.position.y + 0.4, x.mesh.position.z, 0.6);
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
    // (A trader opens its city's page.)
    if (p?.startsWith('trav:') && !this.state) return;
    // (Your expedition opens its city's Loans tab, where its report is: slice 28.)
    // (Slice 34: a vassal's tribute, men coming to your aid, and your army sent to conquer open its Empire tab.)
    const conquer = p?.startsWith('trav:exp-') && this.state?.world.expeditions.find((x) => x.id === Number(p.split('-')[1]))?.aim === 'conquer';
    const empire = conquer || p?.startsWith('trav:levy-') || p?.startsWith('trav:aid-');
    this.show(p === 'ship' ? 'tyre' : p?.startsWith('trav:') ? cityOfTraveller(this.state as SimState, p.slice(5)) : (p as CityId | null), empire ? 'empire' : p?.startsWith('trav:exp-') ? 'loans' : undefined);
  }

  private drawCard(): void {
    const s = this.state;
    if (!s || !this.hovered || !this.open) {
      this.card.hidden = true;
      return;
    }
    morph(this.card, hoverHtml(s, this.hovered));
    this.card.className = `greece-card${this.hovered !== 'ship' && this.hovered !== 'home' && this.hovered !== 'tyre' && !this.hovered.startsWith('trav:') ? ' ruled' : ''}`;
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
    const html = panelHtml(s, this.shown, this.renaming, this.draft, this.tab, this.host.map);
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
    this.drawFeasts(s, time);
    // Labels over the cities.
    const r = canvas.getBoundingClientRect();
    const refresh = time - this.labelAt > 0.5;
    if (refresh) this.labelAt = time;
    // Where the travellers and gifts on the roads and lanes are on the screen: a label they pass under fades, so they can be seen (the road from Corinth runs right under the labels).
    const under: Array<[number, number]> = [];
    for (const m of this.travellers.values()) {
      if (!m.visible) continue;
      this.v.copy(m.position).project(this.camera);
      under.push([r.left + (this.v.x * 0.5 + 0.5) * r.width, r.top + (-this.v.y * 0.5 + 0.5) * r.height]);
    }
    // (The top bar and the City button hanging under it: a label that would stand under them hangs below its city instead. Slice 22: Troy's sat under the City button.)
    if (refresh || !this.barRect) {
      const a = document.querySelector('.topbar')?.getBoundingClientRect();
      const b = document.querySelector('.greece-btn')?.getBoundingClientRect();
      this.barRect = [a && b ? [Math.min(a.left, b.left), Math.max(a.right, b.right), Math.max(a.bottom, b.bottom)] : a ? [a.left, a.right, a.bottom] : [0, 0, 0]];
      // (Slice 31: and the lines under the top bar, where they show; at 1600 × 900 Troy's label sat under them. And the News of Greece: at 1280 × 720 Rhodes's sat under it.)
      for (const l of document.querySelectorAll('.townlines > .townline:not(.folded), .townlines > .townlines-more:not([hidden]), .greece-news')) {
        const q = l.getBoundingClientRect();
        if (q.height > 0) this.barRect.push([q.left, q.right, q.bottom]);
      }
    }
    const bars = this.barRect;
    // Where each label would stand (its bottom middle), and its size.
    const spots: Array<{ id: CityId; el: HTMLElement; off: boolean; lx: number; ly: number; at: number; lw: number; lh: number; below: boolean; gy: number }> = [];
    for (const id of CITY_IDS) {
      const el = this.labels.get(id) as HTMLElement;
      const [x, z] = this.at(id);
      const ground = this.relief.heightAt(x, z);
      this.v.set(x, ground + 1.5 * SCALE[id] * (this.grown.get(id) ?? 1), z).project(this.camera);
      const off = this.v.z > 1 || this.v.x < -1.1 || this.v.x > 1.1 || this.v.y < -1.1 || this.v.y > 1.1;
      el.style.display = off ? 'none' : '';
      const lx = r.left + (this.v.x * 0.5 + 0.5) * r.width;
      let ly = r.top + (-this.v.y * 0.5 + 0.5) * r.height;
      let size = this.labelSize.get(id);
      if (refresh || !size) {
        size = [el.offsetWidth, el.offsetHeight];
        this.labelSize.set(id, size);
      }
      const [lw, lh] = size;
      const below = bars.some(([barL, barR, barB]) => ly - lh - 8 < barB && lx + lw / 2 > barL && lx - lw / 2 < barR);
      this.v.set(x, ground, z).project(this.camera);
      const gy = r.top + (-this.v.y * 0.5 + 0.5) * r.height;
      if (below) ly = clearOf(bars, lx, lw, lh, gy + 10 + lh);
      spots.push({ id, el, off, lx, ly, at: ly, lw, lh, below, gy });
    }
    // (Slice 31: with eleven cities the labels round the Saronic Gulf ran into each other. Your city's stands where it is; then, from the
    // lowest on the screen up, a label that would overlap one already placed is lifted clear of it on a longer stem, or, hanging below its city, let down.)
    const placed: Array<[number, number, number, number]> = [];
    const order = spots.filter((p) => !p.off).sort((a, b) => Number(b.id === 'home') - Number(a.id === 'home') || b.ly - a.ly);
    const settle = (p: (typeof spots)[number]): void => {
      for (let guard = 0; guard < 8; guard++) {
        const hit = placed.find(([l, t, rr, bb]) => p.lx - p.lw / 2 < rr + 2 && p.lx + p.lw / 2 > l - 2 && p.ly - p.lh < bb + 2 && p.ly > t - 2);
        if (!hit) break;
        p.ly = p.below ? hit[3] + 3 + p.lh : hit[1] - 3;
      }
    };
    for (const p of order) {
      settle(p);
      // (Lifted up under a bar, it hangs below its city instead, if there is room there; at 1280 x 720 with five lines there isn't for Thebes, and it stays lifted.)
      if (!p.below && p.ly < p.at - 0.5 && bars.some(([barL, barR, barB]) => p.ly - p.lh - 2 < barB && p.lx + p.lw / 2 > barL && p.lx - p.lw / 2 < barR)) {
        const was = { ly: p.ly, at: p.at };
        p.below = true;
        p.at = p.ly = clearOf(bars, p.lx, p.lw, p.lh, p.gy + 10 + p.lh);
        settle(p);
        if (p.ly - p.at > p.lh * 1.5) Object.assign(p, was, { below: false });
      }
      placed.push([p.lx - p.lw / 2, p.ly - p.lh, p.lx + p.lw / 2, p.ly]);
    }
    for (const { id, el, off, lx, ly, at, lw, lh, below } of spots) {
      const lift = below ? ly - at : at - ly;
      el.style.transform = `translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px) translate(-50%, -100%)`;
      el.classList.toggle('below', below);
      el.classList.toggle('lifted', lift > 0.5);
      if (lift > 0.5) el.style.setProperty('--stem', `${(5 + lift).toFixed(1)}px`);
      el.classList.toggle('hot', this.hovered === id || this.shown === id);
      el.classList.toggle('veil', !off && under.some(([px, py]) => Math.abs(px - lx) < lw / 2 + 6 && py > ly - lh - 6 && py < ly + 10));
      if (refresh) morph(el, labelHtml(s, id));
    }
    this.placed = placed;
    if (refresh) {
      for (const [id, m] of this.fields) (m.material as THREE.MeshStandardMaterial).color.set(fieldColour(s, id));
      this.drawNews(s);
      this.drawSizes(s);
    }
    this.drawSites(s, r, refresh, under);
    this.drawArmyTag(s, r, refresh);
    if (time - this.panelAt > 0.5) {
      this.panelAt = time;
      this.redraw();
      if (this.hovered) this.drawCard();
    }
  }

  /** (Slice 31) The tag over your army while it is out on the map (by road or by sea), with its men. */
  private drawArmyTag(s: SimState, r: DOMRect, refresh: boolean): void {
    const e = s.world.expeditions.find((x) => this.travellers.get(`exp-${x.id}`)?.visible);
    const m = e && this.travellers.get(`exp-${e.id}`);
    if (!e || !m) {
      this.armyTag.style.display = 'none';
      return;
    }
    this.v.set(m.position.x, m.position.y + 1.4 * m.scale.y, m.position.z).project(this.camera);
    const off = this.v.z > 1 || this.v.x < -1.1 || this.v.x > 1.1 || this.v.y < -1.1 || this.v.y > 1.1;
    this.armyTag.style.display = off ? 'none' : '';
    const lx = r.left + (this.v.x * 0.5 + 0.5) * r.width;
    let ly = r.top + (-this.v.y * 0.5 + 0.5) * r.height;
    let size = this.siteSize.get('army');
    if (refresh || !size || !this.armyTag.textContent) {
      this.armyTag.textContent = `Your army · ${expeditionMen(s, e)} men`;
      size = [this.armyTag.offsetWidth, this.armyTag.offsetHeight];
      this.siteSize.set('army', size);
    }
    const [lw, lh] = size;
    // (Where it would stand over a city's label, at the city it marches on, it hangs below the army instead; and where that would
    // cover another's (review of slice 31: in #report it hid Nea Argos', by Corinth), it stands beside the army, east or west.)
    const hits = (x: number, y: number): boolean => this.placed.some(([l, t, rr, bb]) => x - lw / 2 < rr && x + lw / 2 > l && y - lh < bb && y > t);
    this.v.set(m.position.x, m.position.y, m.position.z).project(this.camera);
    const gy = r.top + (-this.v.y * 0.5 + 0.5) * r.height;
    const spots: Array<[number, number, '' | 'below' | 'beside']> = [
      [lx, ly, ''],
      [lx, gy + 10 + lh, 'below'],
      [lx + lw / 2 + 12, (ly + gy) / 2 + lh / 2, 'beside'],
      [lx - lw / 2 - 12, (ly + gy) / 2 + lh / 2, 'beside'],
    ];
    const [x, y, how] = spots.find(([sx, sy]) => !hits(sx, sy)) ?? spots[0];
    ly = y;
    this.armyTag.classList.toggle('below', how === 'below');
    this.armyTag.classList.toggle('beside', how === 'beside');
    this.armyTag.style.transform = `translate(${x.toFixed(1)}px, ${ly.toFixed(1)}px) translate(-50%, -100%)`;
  }

  /** (Slice 31) Each ruled city's model at the step its people stand at against its usual number. */
  private drawSizes(s: SimState): void {
    for (const id of RULED) {
      const c = s.world.cities.find((x) => x.id === id);
      const m = this.towns.get(id);
      if (!c || !m || !c.pop) continue;
      const k = Math.max(GROW_LEAST, Math.min(GROW_MOST, Math.round(Math.sqrt(c.pop / baseOf(id).pop) * 10) / 10));
      if (this.grown.get(id) === k) continue;
      this.grown.set(id, k);
      m.scale.setScalar(SCALE[id] * k);
    }
  }

  /** (Slice 31) The sites: each piece as it stands (free, or a colony at its size in its founder's colours), and its label. */
  private drawSites(s: SimState, r: DOMRect, refresh: boolean, under: Array<[number, number]>): void {
    for (const x of s.world.sites) {
      const piece = this.sites.get(x.id);
      const el = this.siteLabels.get(x.id);
      if (!piece || !el) continue;
      const owner = x.owner ? PLACES[x.owner as CityId] : undefined;
      const look = owner ? `${x.owner}:${Math.max(3, Math.min(12, Math.round(3 + x.pop / 200)))}` : '';
      if (look !== piece.look) {
        piece.look = look;
        piece.mesh.geometry.dispose();
        piece.mesh.geometry = siteModel(owner?.colour ?? '#efe6cf', owner?.trim ?? '#efe6cf', owner ? x.pop : 0);
        el.classList.toggle('held', !!owner);
        el.style.setProperty('--c', owner?.colour ?? '#b8a27a');
      }
      const m = piece.mesh;
      this.v.set(m.position.x, m.position.y + 1.25 * SITE_SCALE, m.position.z).project(this.camera);
      const off = this.v.z > 1 || this.v.x < -1.1 || this.v.x > 1.1 || this.v.y < -1.1 || this.v.y > 1.1;
      el.style.display = off ? 'none' : '';
      const lx = r.left + (this.v.x * 0.5 + 0.5) * r.width;
      let ly = r.top + (-this.v.y * 0.5 + 0.5) * r.height;
      if (refresh) morph(el, siteLabelHtml(s, x.id));
      let size = this.siteSize.get(x.id);
      if (refresh || !size) {
        size = [el.offsetWidth, el.offsetHeight];
        this.siteSize.set(x.id, size);
      }
      const [lw, lh] = size;
      // (Like a city's, a label that would stand under the top bar or the lines under it hangs below its site: Thasos's did.)
      const below = (this.barRect ?? []).some(([barL, barR, barB]) => ly - lh - 8 < barB && lx + lw / 2 > barL && lx - lw / 2 < barR);
      if (below) {
        this.v.set(m.position.x, m.position.y, m.position.z).project(this.camera);
        ly = clearOf(this.barRect ?? [], lx, lw, lh, r.top + (-this.v.y * 0.5 + 0.5) * r.height + 10 + lh);
      }
      el.classList.toggle('below', below);
      el.style.transform = `translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px) translate(-50%, -100%)`;
      el.classList.toggle('hot', this.hovered === `trav:site-${x.id}`);
      if (refresh) {
        // (Faded where a traveller passes under it, or where a city's label stands over it.)
        const city = this.placed.some(([l, t, rr, bb]) => lx - lw / 2 < rr && lx + lw / 2 > l && ly - lh < bb && ly > t);
        el.classList.toggle('veil', !off && (city || under.some(([px, py]) => Math.abs(px - lx) < lw / 2 + 6 && py > ly - lh - 6 && py < ly + 10)));
      }
    }
  }

  /** The trade routes' ships on their lanes and caravans on their roads (hidden when at home, or in your city). */
  private drawTravellers(s: SimState, tick: number, time: number): void {
    const seen = new Set<string>();
    // (Drawn larger the farther the camera is, up to nearly twice at the opening view, so armies, bands, caravans and gifts read from across the table and stay life-size close up: slice 22.)
    const far = Math.min(FAR_MOST, Math.max(1, this.rig.distance / FAR_FROM));
    const piece = (key: string, make: () => THREE.BufferGeometry, body: readonly [number, number]): THREE.Mesh => {
      let m = this.travellers.get(key);
      if (!m) {
        m = new THREE.Mesh(make(), this.mat);
        m.userData.body = body;
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
        const m = piece(`${r.city}-sea`, () => shipModel(PLACES[city].colour, PLACES[city].trim), BODY.ship);
        const p = alongLine(line, Math.max(0.9, Math.min(L - 1.1, v.along)));
        const dir = v.homeward ? 1 : -1;
        m.position.set(p.x, 0.02 + Math.sin(time * 1.7 + 1.3) * 0.03, p.z);
        m.rotation.set(Math.sin(time * 1.3 + 0.7) * 0.04, -Math.atan2(p.dz * dir, p.dx * dir), 0);
        m.scale.setScalar(far);
      } else {
        const all = caravansOnMap(s, r, tick);
        all.forEach((c, i) => {
          const m = piece(`${r.city}-land-${i}`, () => caravanModel(PLACES[city].colour), BODY.caravan);
          const p = alongLine(line, Math.max(0.6, Math.min(L - 0.9, c.along)));
          const dir = c.homeward ? 1 : -1;
          m.position.set(p.x, this.relief.heightAt(p.x, p.z), p.z);
          // (A little larger than life, as the towns are, to be seen from across the table.)
          m.scale.setScalar(1.6 * far);
          m.rotation.set(0, -Math.atan2(p.dz * dir, p.dx * dir), 0);
        });
      }
    }
    // Gifts on their way: yours in your colours, a ruler's in theirs; by road a little caravan, by sea a ship.
    for (const g of s.world.gifts) {
      const at = giftOnMap(g, tick);
      if (!at) continue;
      const line = wayPoints(wayOf(g.way));
      const L = lineLength(line);
      const city = g.from === 'home' ? 'home' : g.from;
      const dir = at.homeward ? 1 : -1;
      if (g.by === 'sea') {
        const m = piece(giftKey(g), () => shipModel(PLACES[city].colour, PLACES[city].trim), BODY.ship);
        const p = alongLine(line, Math.max(0.9, Math.min(L - 1.1, at.along)));
        m.position.set(p.x, 0.02 + Math.sin(time * 1.7 + 2.1) * 0.03, p.z);
        m.rotation.set(Math.sin(time * 1.3 + 1.1) * 0.04, -Math.atan2(p.dz * dir, p.dx * dir), 0);
        m.scale.setScalar(far);
      } else {
        const m = piece(giftKey(g), () => caravanModel(PLACES[city].colour), BODY.caravan);
        const p = alongLine(line, Math.max(0.6, Math.min(L - 0.9, at.along)));
        m.position.set(p.x, this.relief.heightAt(p.x, p.z), p.z);
        m.scale.setScalar(1.4 * far);
        m.rotation.set(0, -Math.atan2(p.dz * dir, p.dx * dir), 0);
      }
    }
    // War bands: gathering at their city (a camp round a banner), marching on yours, turned back or going home; Troy's by sea, a ship with a dark sail.
    for (const r of s.world.raids) {
      const at = raidOnMap(r, tick);
      if (!at) continue;
      const line = wayPoints(wayOf(r.way));
      const L = lineLength(line);
      const city = r.city;
      const dir = at.homeward ? 1 : -1;
      if (r.by === 'sea' && !at.gathering) {
        const m = piece(`raid-${r.id}`, () => shipModel('#3a2a26', PLACES[city].colour), BODY.ship);
        const p = alongLine(line, Math.max(0.9, Math.min(L - 1.1, at.along)));
        m.position.set(p.x, 0.02 + Math.sin(time * 1.7 + 0.4) * 0.03, p.z);
        m.rotation.set(Math.sin(time * 1.3 + 0.2) * 0.04, -Math.atan2(p.dz * dir, p.dx * dir), 0);
        m.scale.setScalar(1.15 * far);
      } else {
        const key = `raid-${r.id}${at.gathering ? '-camp' : ''}`;
        const m = piece(key, () => bandModel(PLACES[city].colour, PLACES[city].trim, at.gathering), at.gathering ? BODY.camp : BODY.band);
        const p = alongLine(line, Math.max(0.6, Math.min(L - (at.gathering ? 1.6 : 0.9), at.along)));
        m.position.set(p.x, this.relief.heightAt(p.x, p.z), p.z);
        // (Larger than life, as the caravans are, and more so: a band must be seen coming.)
        m.scale.setScalar(2.3 * far);
        m.rotation.set(0, at.gathering ? 0 : -Math.atan2(p.dz * dir, p.dx * dir), 0);
      }
    }
    // Your expedition (slice 28): a little army in your colours along the road to their city and home again; crossed swords while it fights there.
    for (const e of s.world.expeditions) {
      const at = expeditionOnMap(e, tick);
      if (!at) continue;
      const line = wayPoints(wayOf(e.way));
      const L = lineLength(line);
      // (Figures, not men: a rival's army of thousands is 8 to 14; your few dozen are 3 to 9.)
      const men = Math.max(5, Math.min(9, Math.round(expeditionMen(s, e) / 5)));
      const { colour, trim } = PLACES.home;
      const dir = at.homeward ? -1 : 1;
      if (e.by === 'sea') {
        // (By sea: your triremes carrying it, drawn as one ship in your colours along the lane, as your guards are.)
        const ship = piece(`exp-${e.id}`, () => shipModel(colour, trim), BODY.ship);
        const q = alongLine(line, Math.max(0.9, Math.min(L - (at.fighting ? 1.8 : 1.1), at.along)));
        ship.position.set(q.x, 0.02 + Math.sin(time * 1.6 + e.id) * 0.03, q.z);
        ship.rotation.set(Math.sin(time * 1.2 + e.id) * 0.04, -Math.atan2(q.dz * dir, q.dx * dir), 0);
        ship.scale.setScalar(0.95 * far);
      }
      const m = e.by === 'sea' ? undefined : piece(`exp-${e.id}`, () => armyModel(colour, trim, men), armyBody(men));
      // (Slice 29: drawn half again as large as before, and larger from afar than a rival's army may be: alone on its road, it was hard to pick out between the cities' labels.)
      const k = Math.min(far, EXPEDITION_FAR_MOST);
      // (Drawn larger from afar, it grows back from its head, as the rivals' armies do; at their city it stands a little short of it.)
      if (m) {
        const grow = (k - 1) * 3.1 * armyBody(men)[1];
        const p = alongLine(line, Math.max(1.2, Math.min(L - (at.fighting ? 2.2 : 1.2), at.along - dir * grow)));
        m.position.set(p.x, this.relief.heightAt(p.x, p.z), p.z);
        m.rotation.set(0, -Math.atan2(p.dz * dir, p.dx * dir), 0);
        m.scale.setScalar(3.1 * k);
      }
      if (at.fighting) {
        const sw = piece(`exp-${e.id}-swords`, () => swordsModel(), [-0.45, 0.45]);
        const q = alongLine(line, Math.max(1.2, L - 1.2));
        sw.position.set(q.x, this.relief.heightAt(q.x, q.z) + 0.25 + Math.sin(time * 1.6) * 0.06, q.z);
        sw.rotation.set(0, time * 0.5, 0);
        sw.scale.setScalar(1.15 * far);
      }
    }
    // Slice 34: a vassal's tribute coming to you (a caravan in its colours on its road, or its ship on its lane), and a vassal's or ally's company marching to your aid and home again.
    for (const t of s.empire.tribute) {
      const at = tributeOnMap(t, tick);
      if (!at) continue;
      const line = wayPoints(wayOf(t.way));
      const L = lineLength(line);
      const { colour, trim } = PLACES[t.city];
      if (t.by === 'sea') {
        const m = piece(`levy-${t.id}`, () => shipModel(colour, trim), BODY.ship);
        const p = alongLine(line, Math.max(0.9, Math.min(L - 1.1, at.along)));
        m.position.set(p.x, 0.02 + Math.sin(time * 1.7 + t.id) * 0.03, p.z);
        m.rotation.set(Math.sin(time * 1.3 + t.id) * 0.04, -Math.atan2(-p.dz, -p.dx), 0);
        m.scale.setScalar(far);
      } else {
        const m = piece(`levy-${t.id}`, () => caravanModel(colour), BODY.caravan);
        const p = alongLine(line, Math.max(0.6, Math.min(L - 0.9, at.along)));
        m.position.set(p.x, this.relief.heightAt(p.x, p.z), p.z);
        m.scale.setScalar(1.6 * far);
        m.rotation.set(0, -Math.atan2(-p.dz, -p.dx), 0);
      }
    }
    for (const a of s.empire.aid) {
      const at = aidOnMap(a, tick);
      if (!at) continue;
      const line = wayPoints(wayOf(a.way));
      const L = lineLength(line);
      const { colour, trim } = PLACES[a.city];
      const men = Math.max(3, Math.min(6, Math.round(a.men / 3)));
      const dir = at.homeward ? 1 : -1;
      const m = piece(`aid-${a.id}`, () => armyModel(colour, trim, men), armyBody(men));
      const p = alongLine(line, Math.max(1.2, Math.min(L - 1.2, at.along)));
      m.position.set(p.x, this.relief.heightAt(p.x, p.z), p.z);
      m.rotation.set(0, -Math.atan2(p.dz * dir, p.dx * dir), 0);
      m.scale.setScalar(2.4 * Math.min(far, EXPEDITION_FAR_MOST));
    }
    // Pirates on a lane (a dark galley at their place), and your triremes out on the lanes in your colours (slice 26).
    for (const p of s.fleet.pirates) {
      if (p.state !== 'seen' && p.state !== 'preying') continue;
      const line = wayPoints(wayOf(p.way));
      const L = lineLength(line);
      const m = piece(`pirates-${p.id}`, () => shipModel('#2b2421', '#8c2a1e'), BODY.ship);
      const at = alongLine(line, Math.max(0.9, Math.min(L - 1.1, stationAlong(p.way) + 0.7)));
      m.position.set(at.x, 0.02 + Math.sin(time * 1.4 + p.id) * 0.03, at.z);
      m.rotation.set(Math.sin(time * 1.1 + p.id) * 0.05, -Math.atan2(-at.dz, -at.dx) + Math.sin(time * 0.3 + p.id) * 0.4, 0);
      m.scale.setScalar(1.1 * far);
    }
    for (const t of s.fleet.triremes) {
      const at = triremeOnMap(t, tick);
      // (Away with your soldiers (slice 28): drawn as the expedition's ship instead.)
      if (!at || t.order === 'away') continue;
      const line = wayPoints(wayOf(t.lane));
      const L = lineLength(line);
      const dir = at.homeward ? -1 : 1;
      const m = piece(`trireme-${t.id}`, () => shipModel(PLACES.home.colour, PLACES.home.trim), BODY.ship);
      const p = alongLine(line, Math.max(0.9, Math.min(L - 1.1, at.along - (at.station ? 0.7 : 0))));
      m.position.set(p.x, 0.02 + Math.sin(time * 1.6 + t.id) * 0.03, p.z);
      m.rotation.set(Math.sin(time * 1.2 + t.id) * 0.04, -Math.atan2(p.dz * dir, p.dx * dir), 0);
      m.scale.setScalar(0.95 * far);
    }
    // Wars between rivals: each side's army (or fleet) out on the way between them, standing facing the other, or going home; crossed swords where they meet while it lasts; the way drawn red, closed.
    const red = new Set<string>();
    for (const x of s.world.wars) {
      const way = RIVAL_WAYS.find((w) => w.id === x.way);
      if (!way) continue;
      const line = rivalPoints(way);
      const L = lineLength(line);
      for (const a of armiesOnMap(x, tick)) {
        const { colour, trim } = PLACES[a.city];
        const men = a.city === x.a ? x.menA : x.menB;
        const m = a.by === 'sea' ? piece(`war-${x.id}-${a.city}`, () => fleetModel(colour, trim), BODY.fleet) : piece(`war-${x.id}-${a.city}`, () => armyModel(colour, trim, men), armyBody(men));
        const dir = a.facing;
        // (Drawn larger from afar, an army grows backwards from its head, where the sim has it: two armies facing each other at the opening view would otherwise run into each other.)
        const k = a.by === 'sea' ? far : Math.min(far, ARMY_FAR_MOST);
        const grow = (k - 1) * (a.by === 'sea' ? 1.25 * BODY.fleet[1] : 2.1 * armyBody(men)[1]);
        const p = alongLine(line, Math.max(1.2, Math.min(L - 1.2, a.along - dir * grow)));
        if (a.by === 'sea') {
          m.position.set(p.x, 0.02 + Math.sin(time * 1.5 + x.id) * 0.03, p.z);
          m.rotation.set(Math.sin(time * 1.2 + x.id) * 0.03, -Math.atan2(p.dz * dir, p.dx * dir), 0);
          m.scale.setScalar(1.25 * far);
        } else {
          m.position.set(p.x, this.relief.heightAt(p.x, p.z), p.z);
          m.rotation.set(0, -Math.atan2(p.dz * dir, p.dx * dir), 0);
          // (Larger than life, as the bands are: an army must be seen from across the table.)
          m.scale.setScalar(2.1 * k);
        }
      }
      if (x.ended) continue;
      red.add(way.id);
      const at = meetPoint(way);
      const sw = piece(`war-${x.id}`, () => swordsModel(), [-0.45, 0.45]);
      const ground = way.kind === 'land' ? this.relief.heightAt(at.x, at.z) : 0;
      sw.position.set(at.x, ground + 0.25 + Math.sin(time * 1.6) * 0.06, at.z);
      sw.rotation.set(0, time * 0.5, 0);
      sw.scale.setScalar(1.15 * far);
    }
    for (const way of RIVAL_WAYS) {
      let m = this.closed.get(way.id);
      if (!m && !red.has(way.id)) continue;
      if (!m) {
        m = closedWay(rivalPoints(way), way.kind, this.relief.heightAt);
        m.name = `greece-closed-${way.id}`;
        this.closed.set(way.id, m);
        this.scene.add(m);
      }
      m.visible = red.has(way.id);
    }
    for (const [key, m] of this.travellers) {
      if (seen.has(key)) continue;
      // A gift that has arrived is gone for good: its piece goes too (a route's trader comes again; a band's camp or march is over; an army home, a war over).
      if (key.startsWith('gift-') || key.startsWith('raid-') || key.startsWith('war-') || key.startsWith('pirates-') || key.startsWith('trireme-') || key.startsWith('exp-') || key.startsWith('levy-') || key.startsWith('aid-')) {
        this.scene.remove(m);
        m.geometry.dispose();
        this.travellers.delete(key);
      } else m.visible = false;
    }
  }

  /** A festival on: banners round the city, and smoke rising from its altar. */
  private drawFeasts(s: SimState, time: number): void {
    for (const f of FESTIVALS) {
      const on = festivalOn(f.city, s.tick);
      let fe = this.feasts.get(f.city);
      if (!fe && !on) continue;
      const [x, z] = this.at(f.city);
      const k = SCALE[f.city];
      const y0 = this.relief.heightAt(x, z);
      if (!fe) {
        const banners = new THREE.Mesh(festivalModel(PLACES[f.city].colour, PLACES[f.city].trim, 1.45), this.mat);
        banners.position.set(x, y0, z);
        banners.scale.setScalar(k);
        banners.castShadow = true;
        banners.name = `greece-festival-${f.city}`;
        this.scene.add(banners);
        const geo = puffGeometry();
        const puffs: THREE.Mesh[] = [];
        for (let i = 0; i < PUFFS; i++) {
          const pm = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#a29b90', roughness: 1, transparent: true, opacity: 0.75, depthWrite: false, flatShading: true }));
          pm.name = `greece-smoke-${f.city}`;
          this.scene.add(pm);
          puffs.push(pm);
        }
        fe = { banners, puffs };
        this.feasts.set(f.city, fe);
      }
      fe.banners.visible = on;
      // The altar stands before the city (festivalModel's), the smoke rising and spreading from it, drifting a little east.
      const ax = x + 1.45 * 0.55 * k;
      const az = z + 1.45 * 0.55 * k;
      fe.puffs.forEach((pm, i) => {
        pm.visible = on;
        if (!on) return;
        const u = (time * 0.22 + i / PUFFS) % 1;
        pm.position.set(ax + u * 0.9 + Math.sin(time + i) * 0.08, y0 + 0.5 * k + u * 3.2, az - u * 0.3);
        pm.scale.setScalar(0.9 + u * 3);
        (pm.material as THREE.MeshStandardMaterial).opacity = 0.8 * (1 - u) * Math.min(1, u * 6);
      });
    }
  }

  /** The News of Greece, newest first (redrawn only when it changes). */
  private drawNews(s: SimState): void {
    const html = newsHtml(s, this.newsOpen);
    if (html === this.newsHtml) return;
    this.newsHtml = html;
    this.news.innerHTML = html;
  }

  render(): void {
    this.host.renderer.render(this.scene, this.camera);
  }

  /** For the probe: a screen point two thirds of the way from a moving piece's head to its tail. */
  bodyPoint(key: string): { x: number; y: number } | null {
    const m = this.travellers.get(key);
    if (!m || !m.visible) return null;
    const [back, front] = (m.userData.body as [number, number] | undefined) ?? [0, 0];
    const k = m.scale.x;
    const along = front + (back - front) * 0.67;
    const r = this.host.canvas.getBoundingClientRect();
    this.v.set(m.position.x + Math.cos(m.rotation.y) * k * along, m.position.y + 0.3 * k, m.position.z - Math.sin(m.rotation.y) * k * along).project(this.camera);
    return { x: r.left + (this.v.x * 0.5 + 0.5) * r.width, y: r.top + (-this.v.y * 0.5 + 0.5) * r.height };
  }

  /** For the probe: what the map shows. */
  info(): { open: boolean; built: boolean; buildMs: number; shown: string; tab: string; hovered: string; panel: string; card: string; ship: { x: number; z: number; visible: boolean }; cities: Record<string, { x: number; y: number }>; moods: Record<string, string>; name: string; view: Required<CameraView>; travellers: Record<string, { x: number; y: number }>; news: string; fields: Record<string, string>; closed: string[]; feasts: string[]; sites: Record<string, string>; grown: Record<string, number>; siteLabels: Record<string, { x: number; y: number; text: string }> } {
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
      tab: this.tab,
      hovered: this.hovered ?? '',
      panel: this.panel.hidden ? '' : (this.body.textContent ?? ''),
      card: this.card.hidden ? '' : (this.card.textContent ?? ''),
      ship: { x: this.ship.position.x, z: this.ship.position.z, visible: this.ship.visible },
      cities,
      moods: this.state ? moods(this.state) : {},
      name: this.state?.world.name ?? '',
      view: this.rig.view,
      travellers,
      news: this.news.hidden ? '' : (this.news.textContent ?? ''),
      fields: Object.fromEntries([...this.fields].map(([id, m]) => [id, `#${(m.material as THREE.MeshStandardMaterial).color.getHexString()} at ${(m.userData.at as number[]).map((v) => v.toFixed(1)).join(',')}`])),
      closed: [...this.closed].filter(([, m]) => m.visible).map(([k]) => k),
      feasts: [...this.feasts].filter(([, f]) => f.banners.visible).map(([k]) => k),
      // (Slice 31.)
      sites: Object.fromEntries([...this.sites].map(([k, v]) => [k, v.look || 'free'])),
      grown: Object.fromEntries(this.grown),
      siteLabels: Object.fromEntries(
        [...this.siteLabels].map(([k, el]) => {
          const b = el.getBoundingClientRect();
          return [k, { x: b.left + b.width / 2, y: b.top + b.height / 2, text: el.textContent ?? '' }];
        }),
      ),
    };
  }
}

/** How far (squared, in pixels) a screen point is from a segment. */
function segmentDist2(px: number, py: number, a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = dx * dx + dy * dy;
  const u = len > 0 ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / len)) : 0;
  const x = a[0] + dx * u - px;
  const y = a[1] + dy * u - py;
  return x * x + y * y;
}

export function createGreece(host: GreeceHost, now: () => number): GreeceMap {
  return new GreeceMap(host, now);
}
