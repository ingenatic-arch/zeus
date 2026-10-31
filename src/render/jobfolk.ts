import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { hash2 } from '../map/noise';
import { footSide } from '../sim/buildings';
import { FIRE_BURNING } from '../sim/hazards';
import { rateOf } from '../sim/labour';
import type { Building, SimState } from '../sim/state';
import { groomModel } from './estates';
import { facingOf } from './homes';
import type { FolkLooks, Look } from './looks';
import { col, PAL } from './palette';
import { lumpy } from './trees';
import { leg, mergeTinted, type TPart } from './walkers';
import { ARM_Z, arms, body, mallet, rod, SHOULDER, type V3 } from './workfolk';
// Slice 54: a sanctuary's priests in their god's colour, on its temple's floor.
import { GODS } from '../sim/pantheon';
import { SANCTUARY_FLOOR } from './sanctuary';

/**
 * The people at work in the city's buildings (25 Oct, Oliver's ask: in the
 * original, every building had its workers in view doing things, and it gave
 * the city life). Drawn from how well each building is staffed (one to four,
 * none while nobody works there), not walkers of the sim: reapers and a
 * thresher at the farms, porters at the granaries and storehouses, the
 * priestess at her altar, actors rehearsing, the clerk at his coin, a woman
 * at each fountain, beaters in the olive groves, men at the press beam,
 * pickers in the vines, treaders in the vat, the smith at his anvil,
 * shipwrights at the hull, stonecutters, grooms. Each job has its own figure
 * and tool, and two or three poses taken in turn by the sim's clock (so they
 * stop when the game is paused and hurry when it runs fast).
 *
 * Render only. The quarrymen, loggers, miners, builders and the games'
 * visitors are drawn by the workfolk (workfolk.ts), the soldiers by the army.
 */

type Pose = Look[];

/** A woman of the town in a long dress (the tinted part), her hair up, facing +x. */
function woman(): TPart[] {
  return [
    leg(0, -0.025, 0.08, 0.018, PAL.skin),
    leg(0, 0.025, 0.08, 0.018, PAL.skin),
    { geo: new THREE.CylinderGeometry(0.052, 0.088, 0.27, 7).translate(0, 0.195, 0), color: '', tint: true },
    { geo: new THREE.IcosahedronGeometry(0.054, 0).translate(0.005, 0.36, 0), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.058, 0).scale(1, 0.75, 1).translate(-0.012, 0.385, 0), color: PAL.hair },
    { geo: new THREE.IcosahedronGeometry(0.03, 0).translate(-0.055, 0.4, 0), color: PAL.hair },
  ];
}

/** Arms for a woman (her shoulders a little narrower). */
const wArms = (h1: V3, h2: V3): TPart[] => [rod([0, SHOULDER - 0.01, ARM_Z - 0.006], h1, 0.015, PAL.skin, 0.013), rod([0, SHOULDER - 0.01, -ARM_Z + 0.006], h2, 0.015, PAL.skin, 0.013)];

/** Someone walking (the legs swing as they go): a man or a woman, carrying `load` on the head, on the shoulder, or in front. */
function carrier(woman_: boolean, load: 'basket' | 'sheaf' | 'sack' | 'amphora' | 'grapes' | 'hay' | 'none'): THREE.BufferGeometry {
  const parts: TPart[] = woman_
    ? [
        leg(0, -0.025, 0.1, 0.018, PAL.skin, -1),
        leg(0, 0.025, 0.1, 0.018, PAL.skin, 1),
        { geo: new THREE.CylinderGeometry(0.052, 0.085, 0.25, 7).translate(0, 0.205, 0), color: '', tint: true },
        { geo: new THREE.IcosahedronGeometry(0.054, 0).translate(0.005, 0.36, 0), color: PAL.skin },
        { geo: new THREE.IcosahedronGeometry(0.058, 0).scale(1, 0.75, 1).translate(-0.012, 0.385, 0), color: PAL.hair },
      ]
    : body(null, null);
  const head = load === 'basket' || load === 'grapes' || load === 'sheaf';
  if (head) {
    parts.push(rod([0, SHOULDER, ARM_Z], [0.0, 0.47, 0.05], 0.015, PAL.skin, 0.013));
    parts.push({ geo: new THREE.CylinderGeometry(0.08, 0.06, 0.06, 7).translate(0, 0.45, 0), color: PAL.basket });
    if (load === 'grapes') parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.065, 0), 0.3, 6101).scale(1, 0.5, 1).translate(0, 0.49, 0), color: PAL.grapeRipe });
    if (load === 'sheaf') parts.push({ geo: lumpy(new THREE.ConeGeometry(0.06, 0.2, 6), 0.1, 6102).rotateZ(Math.PI / 2).translate(0, 0.5, 0), color: PAL.sheaf });
    if (load === 'basket') parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.06, 0), 0.3, 6103).scale(1, 0.45, 1).translate(0, 0.485, 0), color: PAL.oliveRipe });
  } else if (load === 'sack' || load === 'amphora' || load === 'hay') {
    parts.push(rod([0, SHOULDER, ARM_Z], [0.02, 0.42, 0.07], 0.016, PAL.skin, 0.014));
    if (load === 'sack') parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.075, 0), 0.25, 6104).scale(1.3, 0.75, 0.9).translate(-0.01, 0.42, 0.06), color: PAL.sack });
    if (load === 'amphora') parts.push({ geo: new THREE.CylinderGeometry(0.035, 0.05, 0.2, 7).rotateZ(1.2).translate(0.0, 0.44, 0.07), color: PAL.amphora });
    if (load === 'hay') parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.09, 0), 0.35, 6105).scale(1.2, 0.7, 1).translate(0.02, 0.42, 0.07), color: PAL.hay });
  } else parts.push(rod([0, SHOULDER, ARM_Z], [0.02, 0.17, 0.09], 0.016, PAL.skin, 0.014));
  parts.push(rod([0, SHOULDER, -ARM_Z], [0.02, 0.17, -0.09], 0.016, PAL.skin, 0.014));
  return mergeTinted(parts);
}

/** A reaper with a sickle, bent to the wheat: the sickle through the stalks to one side, then the other. */
function reaper(side: 1 | -1): THREE.BufferGeometry {
  const parts = body(PAL.straw, null);
  const hand: V3 = [0.17, 0.15, side * 0.08];
  parts.push(...arms(hand, [0.15, 0.2, -side * 0.03]));
  // The sickle: a short handle and a hooked blade.
  parts.push(rod(hand, [0.22, 0.17, side * 0.08], 0.008, PAL.wood));
  parts.push({ geo: new THREE.TorusGeometry(0.05, 0.007, 3, 7, Math.PI * 1.2).rotateX(Math.PI / 2).translate(0.26, 0.17, side * 0.06), color: PAL.rockGrey });
  // A handful of stalks in the other hand.
  parts.push({ geo: new THREE.ConeGeometry(0.03, 0.14, 5).rotateZ(-0.4).translate(0.18, 0.25, -side * 0.03), color: PAL.sheaf });
  return mergeTinted(parts);
}

/** A thresher with a flail: raised over his shoulder, or brought down on the threshing floor. */
function thresher(up: boolean): THREE.BufferGeometry {
  const parts = body(null, null);
  if (up) {
    parts.push(...arms([0.04, 0.44, 0.03], [0.06, 0.38, -0.02]));
    parts.push(rod([0.04, 0.44, 0.0], [-0.1, 0.62, 0.0], 0.008, PAL.wood), rod([-0.1, 0.62, 0.0], [-0.24, 0.52, 0.0], 0.012, PAL.woodDark));
  } else {
    parts.push(...arms([0.16, 0.26, 0.03], [0.12, 0.3, -0.02]));
    parts.push(rod([0.16, 0.26, 0.0], [0.34, 0.3, 0.0], 0.008, PAL.wood), rod([0.34, 0.3, 0.0], [0.46, 0.02, 0.0], 0.012, PAL.woodDark));
  }
  return mergeTinted(parts);
}

/** A scribe or a clerk with a tablet in one hand, writing on it (or counting coin at a table: `table`). */
function scribe(k: 0 | 1, table = false): THREE.BufferGeometry {
  const parts = body(null, null);
  if (table) {
    parts.push(...arms([0.18, 0.27, k ? 0.06 : 0.02], [0.18, k ? 0.27 : 0.29, -0.04]));
  } else {
    const t: V3 = [0.13, 0.26, -0.04];
    parts.push(...arms([0.12, 0.28, k ? 0.0 : 0.04], t));
    parts.push({ geo: new THREE.BoxGeometry(0.06, 0.08, 0.012).rotateY(Math.PI / 2).rotateZ(0.5).translate(t[0] + 0.02, t[1] + 0.02, -0.01), color: PAL.tablet });
  }
  return mergeTinted(parts);
}

/** The priestess at the altar: her arms raised to the god, or a bowl held out over the fire. */
function priestess(raised: boolean): THREE.BufferGeometry {
  const parts = woman();
  parts.push({ geo: new THREE.CylinderGeometry(0.06, 0.07, 0.12, 7).translate(-0.005, 0.27, 0), color: PAL.priestessMantle });
  if (raised) parts.push(...wArms([0.08, 0.52, 0.12], [0.08, 0.52, -0.12]));
  else {
    parts.push(...wArms([0.17, 0.29, 0.03], [0.17, 0.29, -0.03]));
    parts.push({ geo: new THREE.CylinderGeometry(0.045, 0.025, 0.03, 8).translate(0.2, 0.31, 0), color: PAL.offeringBowl });
  }
  return mergeTinted(parts);
}

/** An actor in his mask, rehearsing: one arm flung up, both arms wide, or a hand to his heart. */
function actor(k: 0 | 1 | 2): THREE.BufferGeometry {
  const parts = body(null, null).map((p) => (p.color === PAL.skin && p.geo.boundingBox === null && isHead(p) ? { ...p, color: PAL.mask } : p));
  parts.push({ geo: new THREE.CylinderGeometry(0.075, 0.09, 0.08, 7).translate(0, 0.27, 0), color: PAL.actorCloak });
  if (k === 0) parts.push(...arms([0.06, 0.52, 0.1], [0.08, 0.18, -0.09]));
  else if (k === 1) parts.push(...arms([0.06, 0.36, 0.2], [0.06, 0.36, -0.2]));
  else parts.push(...arms([0.07, 0.3, -0.02], [0.14, 0.42, -0.08]));
  return mergeTinted(parts);
}
function isHead(p: TPart): boolean {
  p.geo.computeBoundingBox();
  const b = p.geo.boundingBox!;
  const y = (b.min.y + b.max.y) / 2;
  p.geo.boundingBox = null;
  return y > 0.33 && y < 0.38 && b.max.x - b.min.x < 0.13;
}

/** A woman at the fountain: bent with her jar to the spout, or lifting it, full, onto her head. */
function drawer(full: boolean): THREE.BufferGeometry {
  const parts = woman();
  if (!full) {
    parts.push(...wArms([0.2, 0.22, 0.04], [0.2, 0.22, -0.04]));
    parts.push({ geo: new THREE.CylinderGeometry(0.04, 0.05, 0.12, 7).translate(0.25, 0.2, 0), color: PAL.pot });
  } else {
    parts.push(...wArms([0.03, 0.46, 0.05], [0.03, 0.46, -0.05]));
    parts.push({ geo: new THREE.CylinderGeometry(0.04, 0.05, 0.12, 7).translate(0.0, 0.48, 0), color: PAL.pot });
  }
  return mergeTinted(parts);
}

/** Working at something in front of him at chest height, both hands on it, pushed out or drawn in (scraping a hide, a cheesemaker's paddle, the bellows' lever). */
function worker(out: boolean, tool: 'scraper' | 'paddle' | 'lever' | 'none', apron: string | null = null): THREE.BufferGeometry {
  const parts = body(null, apron);
  const h: V3 = out ? [0.2, 0.26, 0.0] : [0.12, 0.3, 0.0];
  if (tool === 'lever') {
    const y = out ? 0.42 : 0.24;
    parts.push(...arms([0.13, y, 0.03], [0.13, y, -0.03]));
  } else parts.push(...arms([h[0], h[1], 0.03], [h[0], h[1], -0.03]));
  if (tool === 'scraper') parts.push(rod([h[0], h[1], -0.06], [h[0], h[1], 0.06], 0.01, PAL.woodDark));
  if (tool === 'paddle') parts.push(rod([h[0], h[1], 0.0], [h[0] + 0.08, h[1] - 0.16, out ? 0.04 : -0.04], 0.008, PAL.wood));
  return mergeTinted(parts);
}

/** Someone tending a fire with a stick: poking in, or drawing back. */
function tender(k: 0 | 1): THREE.BufferGeometry {
  const parts = body(null, null);
  const h: V3 = k ? [0.16, 0.24, 0.04] : [0.13, 0.3, 0.04];
  parts.push(...arms(h, [0.03, 0.17, -0.09]));
  parts.push(rod(h, k ? [0.4, 0.04, 0.04] : [0.36, 0.14, 0.04], 0.007, PAL.charDark));
  return mergeTinted(parts);
}

/** A milker on a low stool at a goat's side, a pail under it, one hand then the other. */
function milker(k: 0 | 1): THREE.BufferGeometry {
  const parts: TPart[] = [];
  for (const z of [-0.03, 0.03]) parts.push(rod([0, 0.1, z], [0.12, 0.1, z], 0.02, PAL.skin), rod([0.12, 0.1, z], [0.13, 0.0, z], 0.018, PAL.skin));
  parts.push({ geo: new THREE.CylinderGeometry(0.056, 0.08, 0.2, 6).translate(0, 0.2, 0), color: '', tint: true });
  parts.push({ geo: new THREE.IcosahedronGeometry(0.056, 0).translate(0.02, 0.35, 0), color: PAL.skin });
  parts.push({ geo: new THREE.IcosahedronGeometry(0.06, 0).scale(1, 0.7, 1).translate(0.0, 0.38, 0), color: PAL.hair });
  parts.push(rod([0, 0.29, ARM_Z], [0.2, k ? 0.13 : 0.17, 0.03], 0.015, PAL.skin, 0.013), rod([0, 0.29, -ARM_Z], [0.2, k ? 0.17 : 0.13, -0.03], 0.015, PAL.skin, 0.013));
  parts.push({ geo: new THREE.CylinderGeometry(0.05, 0.05, 0.03, 6).translate(-0.02, 0.085, 0), color: PAL.woodDark });
  parts.push({ geo: new THREE.CylinderGeometry(0.045, 0.038, 0.07, 7).translate(0.22, 0.035, 0), color: PAL.wood });
  return mergeTinted(parts);
}

/** An olive beater, knocking the fruit down with a long pole: up in the crown, then drawn back. */
function beater(up: boolean): THREE.BufferGeometry {
  const parts = body(null, null);
  const h1: V3 = up ? [0.08, 0.42, 0.02] : [0.1, 0.32, 0.02];
  const h2: V3 = up ? [0.02, 0.32, -0.02] : [0.03, 0.24, -0.02];
  parts.push(...arms(h1, h2));
  parts.push(rod(h2, up ? [0.36, 0.98, 0.04] : [0.42, 0.78, 0.04], 0.007, PAL.wood));
  return mergeTinted(parts);
}

/** A picker in the vines: bent to a cluster with a knife, a basket at her feet. */
function picker(k: 0 | 1): THREE.BufferGeometry {
  const parts = woman();
  parts.push(...wArms([0.19, k ? 0.22 : 0.27, 0.05], [0.18, k ? 0.27 : 0.22, -0.04]));
  parts.push({ geo: new THREE.CylinderGeometry(0.06, 0.045, 0.07, 7).translate(0.08, 0.035, 0.12), color: PAL.basket });
  parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.045, 0), 0.3, 6111).scale(1, 0.5, 1).translate(0.08, 0.07, 0.12), color: PAL.grapeRipe });
  return mergeTinted(parts);
}

/** A treader in the vat, skirt hitched up, holding the rope overhead: one knee up, then the other. */
function treader(k: 0 | 1): THREE.BufferGeometry {
  const parts: TPart[] = [];
  for (const side of [-1, 1]) {
    const up = (side === 1) === (k === 1);
    parts.push(rod([0, 0.13, side * 0.03], up ? [0.07, 0.09, side * 0.03] : [0.0, 0.0, side * 0.03], 0.02, PAL.skin));
    if (up) parts.push(rod([0.07, 0.09, side * 0.03], [0.05, 0.02, side * 0.03], 0.018, PAL.skin));
  }
  parts.push({ geo: new THREE.CylinderGeometry(0.056, 0.08, 0.17, 6).translate(0, 0.21, 0), color: '', tint: true });
  parts.push({ geo: new THREE.IcosahedronGeometry(0.056, 0).translate(0.005, 0.36, 0), color: PAL.skin });
  parts.push({ geo: new THREE.IcosahedronGeometry(0.06, 0).scale(1, 0.7, 1).translate(-0.012, 0.39, 0), color: PAL.hair });
  parts.push(...arms([0.02, 0.5, 0.06], [0.02, 0.5, -0.06]));
  return mergeTinted(parts);
}

/** A watchman with his spear upright and a shield, looking about. */
function sentry(): THREE.BufferGeometry {
  const parts = body(PAL.bronze, null);
  parts.push(...arms([0.06, 0.28, 0.1], [0.05, 0.2, -0.1]));
  parts.push(rod([0.06, 0.02, 0.1], [0.06, 0.72, 0.1], 0.007, PAL.wood), { geo: new THREE.ConeGeometry(0.014, 0.06, 4).translate(0.06, 0.75, 0.1), color: PAL.rockGrey });
  parts.push({ geo: new THREE.CylinderGeometry(0.07, 0.07, 0.014, 10).rotateX(Math.PI / 2).translate(0.03, 0.22, -0.11), color: PAL.watchRed });
  return mergeTinted(parts);
}

/** A smith at the anvil, his hammer raised or struck, the tongs in his other hand holding the glowing iron. */
function smith(up: boolean): THREE.BufferGeometry {
  const parts = body(null, PAL.leather);
  const tongs: V3 = [0.18, 0.24, -0.04];
  parts.push(rod([0, SHOULDER, -ARM_Z], tongs, 0.016, PAL.skin, 0.014), rod(tongs, [0.3, 0.22, -0.02], 0.006, PAL.charDark));
  parts.push({ geo: new THREE.BoxGeometry(0.06, 0.015, 0.02).translate(0.31, 0.22, -0.02), color: PAL.ember });
  const h: V3 = up ? [0.08, 0.5, 0.06] : [0.2, 0.28, 0.04];
  parts.push(rod([0, SHOULDER, ARM_Z], h, 0.016, PAL.skin, 0.014));
  parts.push(rod(h, up ? [0.0, 0.6, 0.06] : [0.3, 0.25, 0.02], 0.007, PAL.wood));
  parts.push({ geo: new THREE.BoxGeometry(0.05, 0.03, 0.03).translate(up ? 0.0 : 0.31, up ? 0.62 : 0.24, up ? 0.06 : 0.02), color: PAL.charDark });
  return mergeTinted(parts);
}

/** A shipwright or a stonecutter driving a chisel (or a trenail) with his mallet: raised, or struck. */
function chiseller(up: boolean, apron: string): THREE.BufferGeometry {
  const parts = body(null, apron);
  const chisel: V3 = [0.2, 0.24, -0.02];
  parts.push(rod([0, SHOULDER, -ARM_Z], chisel, 0.016, PAL.skin, 0.014), rod(chisel, [0.25, 0.2, -0.02], 0.006, PAL.charDark));
  if (up) parts.push(rod([0, SHOULDER, ARM_Z], [0.1, 0.46, 0.05], 0.016, PAL.skin, 0.014), ...mallet([0.1, 0.46, 0.05], [0.0, 0.57, 0.04]));
  else parts.push(rod([0, SHOULDER, ARM_Z], [0.16, 0.3, 0.03], 0.016, PAL.skin, 0.014), ...mallet([0.16, 0.3, 0.03], [0.22, 0.28, -0.02]));
  return mergeTinted(parts);
}

/** A sawyer at the sawhorse, the saw pushed through the plank or drawn back. */
function sawyer(out: boolean): THREE.BufferGeometry {
  const parts = body(null, PAL.hide);
  const h: V3 = out ? [0.22, 0.22, 0.02] : [0.12, 0.25, 0.02];
  parts.push(...arms(h, [0.17, 0.21, -0.1]));
  parts.push({ geo: new THREE.BoxGeometry(0.22, 0.04, 0.005).translate(h[0] + 0.11, h[1] - 0.04, 0.02), color: PAL.rockGrey });
  // The plank on its trestle, across in front of him.
  parts.push({ geo: new THREE.BoxGeometry(0.1, 0.02, 0.4).translate(0.3, 0.17, -0.05), color: PAL.timber });
  for (const z of [-0.2, 0.1]) parts.push(rod([0.26, 0.0, z], [0.3, 0.16, z], 0.008, PAL.woodDark), rod([0.34, 0.0, z], [0.3, 0.16, z], 0.008, PAL.woodDark));
  return mergeTinted(parts);
}

/** A shepherd with his crook, walking slowly. */
function shepherd(): THREE.BufferGeometry {
  const parts = body(null, null);
  parts.push({ geo: new THREE.CylinderGeometry(0.075, 0.09, 0.12, 7).translate(0, 0.26, 0), color: PAL.woolShade });
  parts.push(rod([0, SHOULDER, ARM_Z], [0.1, 0.3, 0.1], 0.016, PAL.skin, 0.014), rod([0, SHOULDER, -ARM_Z], [0.02, 0.17, -0.09], 0.016, PAL.skin, 0.014));
  parts.push(rod([0.12, 0.0, 0.1], [0.1, 0.6, 0.1], 0.007, PAL.wood));
  parts.push({ geo: new THREE.TorusGeometry(0.035, 0.006, 3, 8, Math.PI).translate(0.135, 0.6, 0.1), color: PAL.wood });
  return mergeTinted(parts);
}

/** A merchant or an architect at his table or board, one hand moving (weighing, drawing). */
function trader(k: 0 | 1, robe: string): THREE.BufferGeometry {
  const parts = woman().slice(2);
  parts.unshift(leg(0, -0.03, 0.06, 0.02, PAL.skin), leg(0, 0.03, 0.06, 0.02, PAL.skin));
  parts.push({ geo: new THREE.CylinderGeometry(0.07, 0.07, 0.1, 7).translate(0, 0.27, 0), color: robe });
  parts.push(...arms([0.18, k ? 0.3 : 0.26, 0.05], [0.16, 0.26, -0.05]));
  return mergeTinted(parts);
}

/** The bellows-boy, both hands on the bellows' lever: pulled down or let up. */
const bellows = (down: boolean): THREE.BufferGeometry => worker(!down, 'lever', PAL.leather);

/** A spot where someone works, in the building's frame: where (lx, lz), facing (local angle; 0 is +x), how high above the floor, or on the ground there (`own`). */
interface Spot {
  lx: number;
  lz: number;
  face: number;
  pose: Pose;
  /** Ticks for one round of poses. */
  T: number;
  tunic: THREE.Color;
  y?: number;
  own?: boolean;
  /** Standing in a yard piece that stands on the lowest ground under it (as Works places them): its middle and half-size. */
  piece?: [number, number, number];
  /** Walking to and fro between (lx, lz) and here (a pause at each end); or round a ring of this radius about (lx, lz). */
  to?: [number, number];
  ring?: number;
  /** Turning to look about, by up to this much either way. */
  look?: number;
}

/** How a building of a kind is placed: Works' frame, the Monuments' frame, or the homes' (the paved little buildings, mirrored at random). */
export interface Frames {
  works(s: SimState, b: Building): { x: number; y: number; z: number; yaw: number };
  monuments(s: SimState, b: Building): { x: number; y: number; z: number; yaw: number };
}

/** The winery's treading vat (works.ts WINERY_PIECES). */
const VAT: [number, number, number] = [0.4, -0.55, 0.42];

const SMALL: ReadonlySet<string> = new Set(['fountain', 'shrine', 'taxoffice', 'watchpost', 'architect']);
const MONUMENT: ReadonlySet<string> = new Set(['masons']);

/** A building with nobody drawn at work (a home, rubble, the agora, a monument): kept so it isn't planned again every frame. */
const NOBODY = { frame: { x: 0, y: 0, z: 0, yaw: 0, mirror: 1 }, list: [] as Spot[] };

// Slice 45: the magistrate's white robe, and the prison guards' dun tunics.
const MAGISTRATE_ROBE = '#ece4d2';
const GUARD_TUNIC = '#6b5a48';
// Slice 49: the physicians' white robes, the asklepieion's priest and attendants.
const HEALER_ROBE = '#f2ede2';
const ATTENDANT_TUNIC = '#9fb8b4';

const TUNICS = ['#8a7a52', '#7b5b3a', '#5f6a4a', '#a35a3a', '#4e6a86', '#b8ab8e'].map((c) => col(c));
const DRESSES = ['#b8573a', '#3f6f9a', '#d2a640', '#6f8a4e', '#8c5a7a', '#e2d6bc'].map((c) => col(c));

export class Jobfolk {
  private readonly P: Record<string, Pose>;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3(1, 1, 1);
  private readonly c = new THREE.Color();
  /** Each building's spots, by id, for the revision of the buildings they were worked out at. */
  private spots = new Map<number, { frame: { x: number; y: number; z: number; yaw: number; mirror: number }; list: Spot[] }>();
  private spotsRev = -1;
  ground: (x: number, z: number) => number;

  constructor(
    private readonly map: CoastMap,
    folk: FolkLooks,
    private readonly frames: Frames,
  ) {
    this.ground = (x, z) => map.heightAt(x, z);
    const L = (g: THREE.BufferGeometry): Look => folk.people.look(g);
    const two = (a: THREE.BufferGeometry, b: THREE.BufferGeometry): Pose => [L(a), L(b)];
    this.P = {
      reap: two(reaper(1), reaper(-1)),
      flail: two(thresher(true), thresher(false)),
      sheaf: two(carrier(true, 'sheaf'), carrier(true, 'sheaf')),
      sack: two(carrier(false, 'sack'), carrier(false, 'sack')),
      amphora: two(carrier(false, 'amphora'), carrier(false, 'amphora')),
      basket: two(carrier(true, 'basket'), carrier(true, 'basket')),
      grapes: two(carrier(true, 'grapes'), carrier(true, 'grapes')),
      hay: two(carrier(false, 'hay'), carrier(false, 'hay')),
      scribe: two(scribe(0), scribe(1)),
      clerk: two(scribe(0, true), scribe(1, true)),
      priestess: two(priestess(true), priestess(false)),
      actorA: [L(actor(0)), L(actor(1)), L(actor(2))],
      actorB: [L(actor(1)), L(actor(2)), L(actor(0))],
      drawer: two(drawer(false), drawer(true)),
      scrape: two(worker(true, 'scraper', PAL.hide), worker(false, 'scraper', PAL.hide)),
      stir: two(worker(true, 'paddle', PAL.cheeseRind), worker(false, 'paddle', PAL.cheeseRind)),
      push: two(worker(true, 'none'), worker(false, 'none')),
      tender: two(tender(0), tender(1)),
      milk: two(milker(0), milker(1)),
      beat: two(beater(true), beater(false)),
      pick: two(picker(0), picker(1)),
      tread: two(treader(0), treader(1)),
      sentry: [L(sentry())],
      smith: two(smith(true), smith(false)),
      bellows: two(bellows(true), bellows(false)),
      shipwright: two(chiseller(true, PAL.hide), chiseller(false, PAL.hide)),
      mason: two(chiseller(true, PAL.marbleShade), chiseller(false, PAL.marbleShade)),
      saw: two(sawyer(true), sawyer(false)),
      shepherd: [L(shepherd())],
      merchant: two(trader(0, PAL.bundleBlue), trader(1, PAL.bundleBlue)),
      architect: two(trader(0, PAL.inspectorScarf), trader(1, PAL.inspectorScarf)),
      groom: [folk.big.look(groomModel(false))],
    };
  }

  /** The spots of a building of this kind, first the one taken by its first worker. */
  private plan(b: Building): Spot[] {
    const P = this.P;
    const t = (k: number): THREE.Color => TUNICS[(b.id + k) % TUNICS.length];
    const d = (k: number): THREE.Color => DRESSES[(b.id + k) % DRESSES.length];
    const at = (lx: number, lz: number, face: number, pose: Pose, T: number, tunic: THREE.Color, more: Partial<Spot> = {}): Spot => ({ lx, lz, face, pose, T, tunic, ...more });
    const E = 0;
    const W = Math.PI;
    const N = Math.PI / 2;
    const S = -Math.PI / 2;
    switch (b.kind) {
      case 'farm':
        return [at(0.3, -0.75, W, P.reap, 14, t(0)), at(0.8, 0.98, E, P.flail, 10, t(1)), at(0.3, 0.55, W, P.reap, 14, t(2)), at(0.5, 0.3, E, P.sheaf, 60, d(0), { to: [0.95, -0.25] })];
      case 'granary':
        return [at(1.25, 0.15, W, P.sack, 64, t(0), { to: [-0.12, 0.05] }), at(0.05, -0.5, E, P.scribe, 9, d(1)), at(1.25, -0.2, W, P.sack, 64, t(2), { to: [-0.12, -0.12] })];
      case 'shrine':
        // (Slice 53: at a dedicated shrine she wears her god's colour.)
        return [at(0.6, 0.0, E, P.priestess, 30, b.god ? new THREE.Color(GODS[b.god].colour) : col(PAL.priestessRobe), { y: 0.06 })];
      case 'theatre':
        return [at(0.88, -0.35, W, P.actorA, 30, col(PAL.actorTunic), { y: 0.2 }), at(0.88, 0.35, W, P.actorB, 36, col(PAL.tunicBlue), { y: 0.2 })];
      case 'taxoffice':
        return [at(0.56, 0.27, W, P.clerk, 8, col(PAL.collectorTunic), { y: 0.12 })];
      case 'watchpost':
        return [at(0.5, -0.3, E, P.sentry, 1, col(PAL.watchmanTunic), { y: 0.05, look: 0.8 })];
      case 'architect':
        return [at(0.46, 0.53, W, P.architect, 16, col(PAL.inspectorDress), { y: 0.05 })];
      case 'fountain':
        return [at(0.0, 0.84, N, P.drawer, 40, d(0), { y: 0.09 })];
      case 'lodge':
        return [at(0.35, 0.8, S, P.scrape, 10, col(PAL.hunterTunic)), at(0.72, -0.95, E, P.tender, 18, t(1))];
      case 'dairy':
        return [at(-0.35, 0.55, W, P.milk, 6, d(0)), at(0.8, 0.14, N, P.stir, 12, t(1))];
      case 'grove':
        return [at(-0.68, 0.05, W, P.beat, 9, t(0), { own: true }), at(0.27, -0.5, W, P.beat, 10, t(1), { own: true }), at(-0.5, -0.95, E, P.basket, 70, d(2), { own: true, to: [0.4, -0.95] }), at(0.66, 1.1, E, P.beat, 9, t(3), { own: true })];
      case 'press':
        return [at(0.42, 1.25, S, P.bellows, 16, t(0), { own: true }), at(1.3, -0.62, W, P.push, 14, t(1), { own: true }), at(1.05, 0.2, W, P.basket, 60, d(2), { to: [0.05, -0.66] })];
      case 'storehouse':
        return [at(1.25, 0.1, W, P.amphora, 60, t(0), { to: [-0.35, 0.3] }), at(1.25, -0.15, W, P.sack, 70, t(1), { to: [-0.35, -0.6] })];
      case 'pasture':
        return [at(-0.5, 0.0, E, P.shepherd, 360, t(0), { ring: 1.02 })];
      case 'vineyard':
        return [at(-0.9, -0.7, N, P.pick, 12, d(0), { own: true }), at(-0.2, 0.0, S, P.pick, 13, d(1), { own: true }), at(-0.95, 0.7, E, P.grapes, 80, d(2), { own: true, to: [0.55, 0.7] }), at(0.1, -0.7, N, P.pick, 12, d(3), { own: true })];
      case 'winery':
        return [at(0.4, -0.55, E, P.tread, 6, d(0), { piece: VAT, y: 0.16 }), at(1.15, 0.85, W, P.amphora, 64, t(1), { to: [0.0, 0.75] }), at(0.32, -0.45, W, P.tread, 6, d(2), { piece: VAT, y: 0.16 })];
      case 'trading':
        return [at(0.5, -0.4, E, P.merchant, 14, col(PAL.dockerTunic)), at(0.0, -0.45, E, P.scribe, 9, t(1))];
      case 'yard':
        return [at(-0.95, -0.55, S, P.hay, 70, t(0), { to: [-0.95, 0.4] })];
      case 'armoury':
        // (On the yard side of the anvil and at the quenching trough, out from under the forge's lean-to, arms.ts.)
        return [at(0.12, 0.95, W, P.smith, 7, t(0)), at(0.3, 0.86, S, P.smith, 11, t(1))];
      case 'shipyard':
        return [at(-0.1, -0.3, N, P.shipwright, 8, t(0)), at(0.7, -0.3, N, P.shipwright, 9, t(1)), at(-0.7, 0.75, E, P.saw, 8, t(2)), at(0.4, 0.6, E, P.sack, 70, t(3), { to: [-0.3, 0.6] })];
      case 'masons':
        return [at(0.24, 0.32, N, P.mason, 8, t(0)), at(-0.3, -0.25, W, P.mason, 9, t(1))];
      case 'horsefarm':
        return [at(-0.25, -1.0, E, P.groom, 120, t(0), { to: [1.0, -0.95] })];
      // Slice 45: the magistrate before his chair under the porch, the jurors by their benches with their voting tablets; the prison's guards at its gate and door, one pacing the yard.
      case 'court':
        return [at(0.24, 0.0, E, P.architect, 16, col(MAGISTRATE_ROBE), { y: 0.24 }), at(0.92, -0.6, S, P.scribe, 9, t(1)), at(1.2, 0.6, N, P.scribe, 10, t(2)), at(1.2, -0.6, S, P.scribe, 11, t(3)), at(0.92, 0.6, N, P.scribe, 9, t(4))];
      case 'prison':
        return [at(1.18, -0.42, E, P.sentry, 1, col(GUARD_TUNIC), { look: 0.8 }), at(-0.02, 0.4, E, P.sentry, 1, col(GUARD_TUNIC), { look: 0.6 }), at(0.3, -0.85, E, P.sentry, 50, col(GUARD_TUNIC), { to: [1.1, -0.85] }), at(1.18, 0.75, E, P.sentry, 1, col(GUARD_TUNIC), { look: 0.8 }), at(0.3, 0.85, E, P.sentry, 56, col(GUARD_TUNIC), { to: [1.0, 0.85] }), at(0.0, -0.4, E, P.sentry, 1, col(GUARD_TUNIC), { look: 0.5 })];
      // Slice 49: a physician under the infirmary's porch, one in the herb beds; at the asklepieion, the priest at the altar, attendants bent over the beds under the stoa, one carrying water from the spring to them, one in the herb garden.
      case 'infirmary':
        return [at(0.32, -0.25, E, P.architect, 16, col(HEALER_ROBE), { y: 0.05 }), at(0.72, 0.7, N, P.pick, 12, col(HEALER_ROBE), { y: 0.06 })];
      case 'asklepieion':
        return [at(1.05, 0.0, E, P.priestess, 30, col(PAL.priestessRobe), { y: 0.06 }), at(0.05, -1.28, S, P.pick, 12, col(ATTENDANT_TUNIC), { y: 0.06 }), at(0.55, 0.05, S, P.amphora, 70, col(ATTENDANT_TUNIC), { y: 0.06, to: [0.9, -1.28] }), at(0.75, -1.28, S, P.pick, 13, col(HEALER_ROBE), { y: 0.06 }), at(0.6, 1.25, N, P.pick, 12, d(1), { y: 0.06 })];
      // Slice 54: once a sanctuary is finished, its priests in their god's colour at the altar and at the temple's door, a servant bringing an amphora from the gate.
      case 'sanctuary': {
        if (b.level <= 0) return [];
        const robe = new THREE.Color(GODS[b.god ?? 'zeus'].colour);
        return [at(1.18, 0.0, E, P.priestess, 30, robe, { y: 0.02 }), at(1.55, -0.5, N, P.priestess, 34, robe, { y: 0.02 }), at(2.05, 0.28, W, P.amphora, 70, d(1), { y: 0.02, to: [1.82, 0.42] }), at(0.3, 0.0, E, P.priestess, 40, robe, { y: SANCTUARY_FLOOR })];
      }
      default:
        return [];
    }
  }

  /** Where a building stands and which way it faces (and whether it is mirrored, as the homes' little buildings are at random). */
  private frameOf(s: SimState, b: Building): { x: number; y: number; z: number; yaw: number; mirror: number } {
    if (SMALL.has(b.kind)) {
      const half = footSide(b) / 2;
      const x = b.x + half;
      const z = b.z + half;
      // (The paved little buildings stand at the middle of their footprint; all but the fountain are mirrored at random, homes.ts.)
      const mirror = b.kind !== 'fountain' && hash2(b.id, 2, 40) < 0.5 ? -1 : 1;
      return { x, y: this.map.heightAt(x, z) + 0.01, z, yaw: facingOf(s, this.map.size, b), mirror };
    }
    // (Slice 54: a sanctuary stands in the monuments' frame.)
    const f = MONUMENT.has(b.kind) || b.kind === 'sanctuary' ? this.frames.monuments(s, b) : this.frames.works(s, b);
    return { ...f, mirror: 1 };
  }

  /** The lowest ground under a yard piece (its middle, corners and edges), as Works stands it. */
  private lowest(f: { x: number; z: number; mirror: number }, c: number, sn: number, [px, pz, r]: [number, number, number]): number {
    let low = Infinity;
    for (const i of [-1, 0, 1]) {
      for (const j of [-1, 0, 1]) {
        const lx = px + i * r;
        const lz = (pz + j * r) * f.mirror;
        low = Math.min(low, this.map.heightAt(f.x + lx * c + lz * sn, f.z - lx * sn + lz * c));
      }
    }
    return low + 0.01;
  }

  private place(x: number, y: number, z: number, yaw: number, sc: number): void {
    this.e.set(0, yaw, 0, 'YXZ');
    this.q.setFromEuler(this.e);
    this.p.set(x, y, z);
    this.s.set(sc, sc, sc);
    this.m.compose(this.p, this.q, this.s);
  }

  update(s: SimState, alpha: number): void {
    if (s.rev !== this.spotsRev) {
      this.spotsRev = s.rev;
      this.spots.clear();
    }
    const now = s.tick + alpha;
    for (const b of s.buildings) {
      let got = this.spots.get(b.id);
      if (!got) {
        const list = this.plan(b);
        got = list.length ? { frame: this.frameOf(s, b), list } : NOBODY;
        this.spots.set(b.id, got);
      }
      if (!got.list.length) continue;
      // (Nobody stays at work in a burning building.)
      if (b.fire === FIRE_BURNING) continue;
      const rate = rateOf(b);
      if (rate <= 0) continue;
      const n = Math.max(1, Math.min(got.list.length, Math.round(rate * 4)));
      const f = got.frame;
      const c = Math.cos(f.yaw);
      const sn = Math.sin(f.yaw);
      for (let i = 0; i < n; i++) {
        const sp = got.list[i];
        const seed = hash2(b.id, i, 6201);
        let lx = sp.lx;
        let lz = sp.lz;
        let face = sp.face;
        let moving = false;
        if (sp.ring) {
          const a = ((now / sp.T + seed) % 1) * Math.PI * 2;
          lx = sp.lx + Math.cos(a) * sp.ring;
          lz = sp.lz + Math.sin(a) * sp.ring;
          face = Math.atan2(-Math.cos(a), -Math.sin(a));
          moving = true;
        } else if (sp.to) {
          const ph = (now / sp.T + seed) % 1;
          const out = ph < 0.5;
          const g = out ? ph * 2 : (ph - 0.5) * 2;
          const k = Math.min(1, Math.max(0, (g - 0.12) / 0.76));
          moving = k > 0 && k < 1;
          const along = out ? k : 1 - k;
          lx = sp.lx + (sp.to[0] - sp.lx) * along;
          lz = sp.lz + (sp.to[1] - sp.lz) * along;
          const dx = (sp.to[0] - sp.lx) * (out ? 1 : -1);
          const dz = (sp.to[1] - sp.lz) * (out ? 1 : -1);
          face = Math.atan2(-dz, dx);
        }
        if (sp.look) face += Math.sin((now / 60 + seed) * Math.PI * 2) * sp.look;
        // Into the world: mirrored (z flipped) like the building, then turned.
        const mz = lz * f.mirror;
        const x = f.x + lx * c + mz * sn;
        const z = f.z - lx * sn + mz * c;
        const floor = sp.piece ? this.lowest(f, c, sn, sp.piece) : sp.own ? Math.max(f.y - 0.01, this.ground(x, z)) : f.y;
        const fy = f.mirror < 0 ? -face : face;
        this.place(x, floor + (sp.y ?? 0) + (moving ? 0.01 : 0), z, f.yaw + fy, 0.92);
        this.c.copy(sp.tunic);
        if (!moving) this.c.multiplyScalar(-1);
        const pose = sp.pose;
        const which = moving || pose.length === 1 ? 0 : Math.floor(((now / sp.T + seed) % 1) * pose.length);
        pose[which].push(this.m, this.c);
      }
    }
  }
}
