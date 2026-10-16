import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { hash2 } from '../map/noise';
import { speedOf } from '../sim/walk';
import type { SimState, Walker } from '../sim/state';
import { ChunkedInstances } from './chunks';
import { col, PAL } from './palette';
import { lumpy } from './trees';

export const WALKER_CHUNK = 32;
/** Space between people walking in a line. */
const SPACING = 0.36;

/**
 * A part of a walker's model. `leg` makes it a leg that swings as she walks:
 * [how far and which way it swings (+1, -1; less for an ox), the hip's x, the hip's height].
 */
type TPart = { geo: THREE.BufferGeometry; color: string; tint?: boolean; leg?: [number, number, number] };

/**
 * One full stride (two steps), in world units walked. Legs swing with the
 * distance a walker has covered (worked out in the shader from where she
 * stands), so her feet keep pace with the ground at any speed.
 */
export const STRIDE = 0.44;

/** Merge parts into one geometry with colours, a tint mask (1 where the per-person colour applies: the tunic) and the legs that swing. */
function mergeTinted(parts: TPart[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const colors: number[] = [];
  const tint: number[] = [];
  const legs: number[] = [];
  for (const { geo, color, tint: t, leg } of parts) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const p = g.attributes.position as THREE.BufferAttribute;
    const c = t ? new THREE.Color(1, 1, 1) : col(color);
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      colors.push(c.r, c.g, c.b);
      tint.push(t ? 1 : 0);
      legs.push(...(leg ?? [0, 0, 0]));
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  out.setAttribute('aTint', new THREE.Float32BufferAttribute(tint, 1));
  out.setAttribute('aLeg', new THREE.Float32BufferAttribute(legs, 3));
  out.computeVertexNormals();
  out.computeBoundingSphere();
  return out;
}

/** A little person, about 0.42 tall, facing +x, carrying a bundle on the head or the back. */
function person(load: 'head' | 'back'): THREE.BufferGeometry {
  const parts: TPart[] = [
    { geo: new THREE.CylinderGeometry(0.02, 0.018, 0.12, 4).translate(0, 0.06, 0.03), color: PAL.skin, leg: [1, 0, 0.12] },
    { geo: new THREE.CylinderGeometry(0.02, 0.018, 0.12, 4).translate(0, 0.06, -0.03), color: PAL.skin, leg: [-1, 0, 0.12] },
    { geo: new THREE.CylinderGeometry(0.055, 0.085, 0.21, 6).translate(0, 0.205, 0), color: '', tint: true },
    // Arms swing against the legs.
    { geo: new THREE.CylinderGeometry(0.016, 0.014, 0.15, 4).rotateX(0.18).translate(0, 0.23, 0.07), color: PAL.skin, leg: [-0.55, 0, 0.3] },
    { geo: new THREE.CylinderGeometry(0.016, 0.014, 0.15, 4).rotateX(-0.18).translate(0, 0.23, -0.07), color: PAL.skin, leg: [0.55, 0, 0.3] },
    { geo: new THREE.IcosahedronGeometry(0.058, 0).translate(0.005, 0.365, 0), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.06, 0).scale(1, 0.7, 1).translate(-0.012, 0.39, 0), color: PAL.hair },
  ];
  if (load === 'head') {
    parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.075, 0), 0.3, 51).scale(1.1, 0.6, 1).translate(0, 0.45, 0), color: PAL.bundleCream });
    // An arm up to steady it.
    parts.push({ geo: new THREE.CylinderGeometry(0.014, 0.014, 0.16, 4).translate(0.0, 0.36, 0.075), color: PAL.skin });
  } else {
    parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.08, 0), 0.3, 52).scale(0.8, 1, 1).translate(-0.085, 0.26, 0), color: PAL.bundleBlue });
  }
  return mergeTinted(parts);
}

/**
 * The water carrier: a woman in a long dress (the tinted part) with a pale
 * shawl, a terracotta water jar on her head and one arm raised to steady it.
 */
function carrier(): THREE.BufferGeometry {
  const jar = [
    new THREE.Vector2(0.0, 0),
    new THREE.Vector2(0.035, 0.005),
    new THREE.Vector2(0.07, 0.05),
    new THREE.Vector2(0.06, 0.1),
    new THREE.Vector2(0.025, 0.125),
    new THREE.Vector2(0.032, 0.15),
  ];
  const parts: TPart[] = [
    // A long dress to the ground, flaring a little.
    { geo: new THREE.CylinderGeometry(0.05, 0.095, 0.3, 7).translate(0, 0.16, 0), color: '', tint: true },
    { geo: new THREE.CylinderGeometry(0.062, 0.056, 0.05, 7).translate(0, 0.3, 0), color: PAL.carrierShawl },
    { geo: new THREE.CylinderGeometry(0.016, 0.014, 0.15, 4).rotateX(-0.2).translate(0.01, 0.23, -0.07), color: PAL.skin },
    // The arm up to the jar.
    { geo: new THREE.CylinderGeometry(0.014, 0.014, 0.17, 4).rotateX(0.25).translate(0.0, 0.37, 0.07), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.056, 0).translate(0.005, 0.36, 0), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.058, 0).scale(1, 0.72, 1).translate(-0.014, 0.385, 0), color: PAL.hair },
    // A little pad and the jar, lying a touch sideways like a hydria.
    { geo: new THREE.CylinderGeometry(0.04, 0.04, 0.015, 6).translate(0, 0.42, 0), color: PAL.carrierShawl },
    { geo: new THREE.LatheGeometry(jar, 7).scale(1.4, 1.35, 1.4).rotateZ(0.12).translate(0, 0.425, 0), color: PAL.pot },
  ];
  return mergeTinted(parts);
}

/**
 * The food vendor: a woman in a saffron dress (the tinted part) with a pale
 * headscarf, carrying a wide flat basket of round loaves on her head.
 */
function vendor(): THREE.BufferGeometry {
  const parts: TPart[] = [
    { geo: new THREE.CylinderGeometry(0.05, 0.095, 0.3, 7).translate(0, 0.16, 0), color: '', tint: true },
    { geo: new THREE.CylinderGeometry(0.03, 0.04, 0.1, 7, 1, true).translate(0, 0.3, 0), color: PAL.vendorScarf },
    { geo: new THREE.CylinderGeometry(0.016, 0.014, 0.15, 4).rotateX(-0.2).translate(0.01, 0.23, -0.07), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.014, 0.014, 0.17, 4).rotateX(0.25).translate(0.0, 0.37, 0.07), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.056, 0).translate(0.005, 0.36, 0), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.06, 0).scale(1, 0.72, 1).translate(-0.014, 0.385, 0), color: PAL.vendorScarf },
    // The basket and its loaves.
    { geo: new THREE.CylinderGeometry(0.115, 0.08, 0.04, 8).translate(0, 0.435, 0), color: PAL.basket },
  ];
  for (const [x, z] of [[0.04, 0.03], [-0.04, 0.04], [0.0, -0.05], [-0.06, -0.02], [0.06, -0.03]]) {
    parts.push({ geo: new THREE.IcosahedronGeometry(0.035, 0).scale(1, 0.6, 1).translate(x, 0.47, z), color: PAL.loaf });
  }
  return mergeTinted(parts);
}

/** Legs of a beast or a person: four (or two) thin posts. */
const leg = (x: number, z: number, h: number, r: number, color: string, swing = 0): TPart => ({ geo: new THREE.CylinderGeometry(r, r * 0.85, h, 4).translate(x, h / 2, z), color, leg: [swing, x, h] });

/**
 * The priestess: a woman in a long white robe (the tinted part) with a lilac
 * mantle over her shoulders and a lilac veil, carrying a shallow offering
 * bowl before her with a little flame in it.
 */
function priestess(): THREE.BufferGeometry {
  const parts: TPart[] = [
    { geo: new THREE.CylinderGeometry(0.05, 0.1, 0.32, 7).translate(0, 0.16, 0), color: '', tint: true },
    // The mantle, a lilac cape falling from the shoulders down the back.
    { geo: new THREE.CylinderGeometry(0.066, 0.09, 0.2, 7, 1, true, Math.PI * 0.55, Math.PI * 0.9).translate(0, 0.22, 0), color: PAL.priestessMantle },
    { geo: new THREE.CylinderGeometry(0.064, 0.058, 0.05, 7).translate(0, 0.31, 0), color: PAL.priestessMantle },
    // Both arms forward, holding the bowl.
    { geo: new THREE.CylinderGeometry(0.014, 0.014, 0.14, 4).rotateZ(-1.2).translate(0.06, 0.27, 0.05), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.014, 0.014, 0.14, 4).rotateZ(-1.2).translate(0.06, 0.27, -0.05), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.065, 0.03, 0.03, 7).translate(0.13, 0.3, 0), color: PAL.offeringBowl },
    { geo: new THREE.ConeGeometry(0.026, 0.07, 4).translate(0.13, 0.35, 0), color: PAL.flame },
    { geo: new THREE.IcosahedronGeometry(0.056, 0).translate(0.005, 0.36, 0), color: PAL.skin },
    // The veil over her hair, falling to the shoulders.
    { geo: new THREE.IcosahedronGeometry(0.064, 0).scale(1, 0.85, 1).translate(-0.016, 0.38, 0), color: PAL.priestessMantle },
    { geo: new THREE.CylinderGeometry(0.05, 0.068, 0.08, 6).translate(-0.022, 0.32, 0), color: PAL.priestessMantle },
  ];
  return mergeTinted(parts);
}

/**
 * The actor: a man in a rose tunic (the tinted part) and a short saffron
 * cloak, wearing a big pale comic mask with a wide grin, one arm flung up as
 * if mid-speech and a scroll of the plays in the other hand.
 */
function actor(): THREE.BufferGeometry {
  const parts: TPart[] = [
    leg(0, -0.03, 0.12, 0.02, PAL.skin, -1),
    leg(0, 0.03, 0.12, 0.02, PAL.skin, 1),
    { geo: new THREE.CylinderGeometry(0.055, 0.088, 0.22, 6).translate(0, 0.21, 0), color: '', tint: true },
    { geo: new THREE.CylinderGeometry(0.07, 0.1, 0.16, 6, 1, true, Math.PI * 0.6, Math.PI * 0.8).translate(0, 0.24, 0), color: PAL.actorCloak },
    // An arm flung up, and one holding the scroll out.
    { geo: new THREE.CylinderGeometry(0.015, 0.014, 0.17, 4).rotateX(0.7).translate(0.0, 0.36, 0.1), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.015, 0.014, 0.15, 4).rotateZ(-0.9).translate(0.05, 0.25, -0.07), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.018, 0.018, 0.09, 5).rotateX(Math.PI / 2).translate(0.11, 0.21, -0.08), color: PAL.scroll },
    // The mask: a big pale face, dark eyes and a grinning mouth, and a wreath of ivy.
    { geo: new THREE.IcosahedronGeometry(0.075, 0).scale(0.8, 1.05, 1).translate(0.01, 0.38, 0), color: PAL.mask },
    { geo: new THREE.BoxGeometry(0.02, 0.018, 0.022).translate(0.066, 0.4, 0.028), color: PAL.door },
    { geo: new THREE.BoxGeometry(0.02, 0.018, 0.022).translate(0.066, 0.4, -0.028), color: PAL.door },
    { geo: new THREE.BoxGeometry(0.02, 0.022, 0.07).translate(0.066, 0.345, 0), color: PAL.actorMouth },
    { geo: new THREE.CylinderGeometry(0.07, 0.07, 0.025, 7).translate(-0.004, 0.44, 0), color: PAL.ivy },
  ];
  return mergeTinted(parts);
}

/**
 * The ox cart: a pale ox under a yoke drawing a two-wheeled cart, its driver
 * (tinted tunic) walking at the ox's head. `loaded` stacks sacks of wheat on
 * the cart's bed.
 */
function oxCart(loaded: boolean): THREE.BufferGeometry {
  const parts: TPart[] = [];
  // The ox, facing +x.
  const ox = 0.2;
  parts.push({ geo: lumpy(new THREE.BoxGeometry(0.4, 0.18, 0.17, 2, 1, 1), 0.1, 501).translate(ox, 0.27, 0), color: PAL.ox });
  // A humped shoulder and a pale belly.
  parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.09, 0), 0.1, 504).scale(1, 0.8, 0.9).translate(ox + 0.1, 0.35, 0), color: PAL.ox });
  parts.push({ geo: lumpy(new THREE.BoxGeometry(0.13, 0.11, 0.1), 0.08, 502).translate(ox + 0.26, 0.29, 0), color: PAL.ox });
  parts.push({ geo: new THREE.BoxGeometry(0.06, 0.06, 0.08).translate(ox + 0.33, 0.26, 0), color: PAL.oxDark });
  parts.push({ geo: new THREE.CylinderGeometry(0.009, 0.016, 0.2, 4).rotateX(Math.PI / 2).translate(ox + 0.25, 0.37, 0), color: PAL.horn });
  // A slow, diagonal gait: the near fore and the far hind leg together.
  for (const [x, z, w] of [[ox - 0.14, -0.055, 0.5], [ox - 0.14, 0.055, -0.5], [ox + 0.14, -0.055, -0.5], [ox + 0.14, 0.055, 0.5]]) parts.push(leg(x, z, 0.19, 0.026, PAL.oxDark, w));
  parts.push({ geo: new THREE.BoxGeometry(0.03, 0.03, 0.24).translate(ox + 0.18, 0.38, 0), color: PAL.woodDark });
  // The cart behind: a pole to the yoke, the bed, the wheels.
  parts.push({ geo: new THREE.BoxGeometry(0.4, 0.025, 0.025).translate(ox - 0.12, 0.26, 0), color: PAL.cart });
  const cx = -0.2;
  parts.push({ geo: new THREE.BoxGeometry(0.32, 0.04, 0.26).translate(cx, 0.2, 0), color: PAL.cart });
  parts.push({ geo: new THREE.BoxGeometry(0.32, 0.07, 0.02).translate(cx, 0.25, 0.125), color: PAL.woodDark });
  parts.push({ geo: new THREE.BoxGeometry(0.32, 0.07, 0.02).translate(cx, 0.25, -0.125), color: PAL.woodDark });
  for (const z of [-0.15, 0.15]) {
    parts.push({ geo: new THREE.CylinderGeometry(0.12, 0.12, 0.03, 8).rotateX(Math.PI / 2).translate(cx, 0.12, z), color: PAL.woodDark });
    parts.push({ geo: new THREE.CylinderGeometry(0.03, 0.03, 0.04, 6).rotateX(Math.PI / 2).translate(cx, 0.12, z), color: PAL.cart });
  }
  if (loaded) {
    // Golden sheaves piled on the bed, lying across it, ears outward, bound with a darker band.
    for (const [x, y, k] of [[-0.11, 0, 0], [-0.2, 0, 1], [-0.29, 0, 2], [-0.155, 0.06, 3], [-0.245, 0.06, 4], [-0.2, 0.115, 5]]) {
      const tilt = (hash2(k, 1, 505) - 0.5) * 0.3;
      parts.push({ geo: new THREE.CylinderGeometry(0.035, 0.05, 0.3, 5).rotateX(Math.PI / 2 + tilt).translate(x, 0.26 + y, 0), color: k % 2 ? PAL.sheaf : PAL.wheatGold });
      parts.push({ geo: new THREE.CylinderGeometry(0.04, 0.04, 0.025, 5).rotateX(Math.PI / 2).translate(x, 0.26 + y, 0), color: PAL.thatchDark });
    }
  }
  // The driver, walking beside the ox with a goad.
  const dz = 0.17;
  const dx = 0.3;
  parts.push(leg(dx, dz - 0.025, 0.11, 0.018, PAL.skin, -1), leg(dx, dz + 0.025, 0.11, 0.018, PAL.skin, 1));
  parts.push({ geo: new THREE.CylinderGeometry(0.05, 0.075, 0.19, 6).translate(dx, 0.19, dz), color: '', tint: true });
  parts.push({ geo: new THREE.IcosahedronGeometry(0.052, 0).translate(dx, 0.33, dz), color: PAL.skin });
  parts.push({ geo: new THREE.IcosahedronGeometry(0.054, 0).scale(1, 0.7, 1).translate(dx - 0.01, 0.355, dz), color: PAL.hair });
  parts.push({ geo: new THREE.CylinderGeometry(0.006, 0.006, 0.36, 3).rotateZ(-0.9).translate(dx + 0.1, 0.3, dz - 0.04), color: PAL.wood });
  return mergeTinted(parts);
}

/**
 * The porter: a man (tinted tunic) pushing a little two-wheeled handcart,
 * with sacks of grain on it when `loaded`.
 */
function porter(loaded: boolean): THREE.BufferGeometry {
  const parts: TPart[] = [
    leg(-0.02, -0.03, 0.12, 0.02, PAL.skin, -0.8),
    leg(-0.02, 0.03, 0.12, 0.02, PAL.skin, 0.8),
    { geo: new THREE.CylinderGeometry(0.055, 0.085, 0.21, 6).rotateZ(-0.15).translate(0, 0.205, 0), color: '', tint: true },
    { geo: new THREE.IcosahedronGeometry(0.058, 0).translate(0.03, 0.36, 0), color: PAL.skin },
    { geo: new THREE.IcosahedronGeometry(0.06, 0).scale(1, 0.7, 1).translate(0.018, 0.385, 0), color: PAL.hair },
    // Arms reaching to the handles.
    { geo: new THREE.CylinderGeometry(0.015, 0.014, 0.16, 4).rotateZ(-1.1).translate(0.08, 0.25, 0.07), color: PAL.skin },
    { geo: new THREE.CylinderGeometry(0.015, 0.014, 0.16, 4).rotateZ(-1.1).translate(0.08, 0.25, -0.07), color: PAL.skin },
  ];
  // The handcart ahead of him.
  const cx = 0.32;
  parts.push({ geo: new THREE.BoxGeometry(0.24, 0.03, 0.2).translate(cx, 0.15, 0), color: PAL.cart });
  parts.push({ geo: new THREE.BoxGeometry(0.24, 0.05, 0.015).translate(cx, 0.18, 0.1), color: PAL.woodDark });
  parts.push({ geo: new THREE.BoxGeometry(0.24, 0.05, 0.015).translate(cx, 0.18, -0.1), color: PAL.woodDark });
  for (const z of [-0.08, 0.08]) parts.push({ geo: new THREE.BoxGeometry(0.2, 0.015, 0.015).rotateZ(-0.35).translate(0.15, 0.21, z), color: PAL.cart });
  for (const z of [-0.12, 0.12]) parts.push({ geo: new THREE.CylinderGeometry(0.08, 0.08, 0.025, 8).rotateX(Math.PI / 2).translate(cx + 0.02, 0.08, z), color: PAL.woodDark });
  if (loaded) {
    for (const [x, z, y] of [[cx - 0.05, -0.05, 0], [cx + 0.06, 0.04, 0], [cx, 0, 0.07]]) {
      parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.065, 0), 0.15, 511).scale(1.15, 0.8, 0.85).translate(x, 0.21 + y, z), color: PAL.sack });
    }
  }
  return mergeTinted(parts);
}

const TUNICS = [PAL.tunicTerracotta, PAL.tunicOchre, PAL.tunicBlue, PAL.tunicCream, PAL.tunicGreen, PAL.tunicPlum];

function tintedMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nattribute float aTint;\nattribute vec3 aLeg;\nconst float STRIDE = ${STRIDE.toFixed(3)};`)
      // Legs swing about the hip with the distance walked: the phase comes from where she stands (roads run along x and z).
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
        // A walker standing still comes with its colour negated (see Walkers.update): legs together.
        #ifdef USE_INSTANCING_COLOR
        float moving = instanceColor.r < 0.0 ? 0.0 : 1.0;
        #else
        float moving = 1.0;
        #endif
        if (aLeg.x != 0.0 && moving > 0.0) {
          vec3 at = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          float a = sin((at.x + at.z) * 6.2831853 / STRIDE) * 0.5 * aLeg.x;
          vec2 d = transformed.xy - aLeg.yz;
          float c = cos(a);
          float s = sin(a);
          transformed.xy = aLeg.yz + vec2(d.x * c - d.y * s, d.x * s + d.y * c);
        }
        #endif`,
      )
      // The chunk has to be expanded here: at this point the shader still holds only its #include line.
      .replace('#include <color_vertex>', THREE.ShaderChunk.color_vertex.replace('vColor.rgb *= instanceColor.rgb;', 'vColor.rgb *= mix(vec3(1.0), abs(instanceColor.rgb), aTint);'));
  };
  mat.customProgramCacheKey = () => 'tinted-person';
  return mat;
}

/** The kinds of walker with a job (all but settlers and leavers). */
export type ServiceKind = 'water' | 'food' | 'cart' | 'porter' | 'priestess' | 'actor';

/** Settler and leaver groups, water carriers, food vendors, priestesses, actors, ox carts and porters walking the roads, redrawn every frame. */
export class Walkers {
  readonly group = new THREE.Group();
  private readonly kinds: [ChunkedInstances, ChunkedInstances];
  private readonly carriers: ChunkedInstances;
  private readonly vendors: ChunkedInstances;
  private readonly priestesses: ChunkedInstances;
  private readonly actors: ChunkedInstances;
  /** Ox carts and porters: [empty, loaded]. */
  private readonly carts: [ChunkedInstances, ChunkedInstances];
  private readonly porters: [ChunkedInstances, ChunkedInstances];
  private readonly all: ChunkedInstances[];
  /** Where each walker with a job was drawn this frame (for hovering, clicking and following). */
  readonly serviceAt = new Map<number, { pos: THREE.Vector3; kind: ServiceKind }>();
  /** The height of the ground (or a bridge's deck) a walker stands on. */
  ground: (x: number, z: number) => number;
  private readonly paths = new Map<number, { route: number; cum: Float32Array }>();
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly c = new THREE.Color();
  private readonly e = new THREE.Euler();

  constructor(map: CoastMap) {
    this.group.name = 'walkers';
    this.ground = (x, z) => map.heightAt(x, z);
    const mat = tintedMaterial();
    const opts = { castShadow: true, receiveShadow: true, colors: true };
    this.kinds = [new ChunkedInstances('walkers-head', person('head'), mat, WALKER_CHUNK, opts), new ChunkedInstances('walkers-back', person('back'), mat, WALKER_CHUNK, opts)];
    this.carriers = new ChunkedInstances('walkers-water', carrier(), mat, WALKER_CHUNK, opts);
    this.vendors = new ChunkedInstances('walkers-food', vendor(), mat, WALKER_CHUNK, opts);
    this.priestesses = new ChunkedInstances('walkers-priestess', priestess(), mat, WALKER_CHUNK, opts);
    this.actors = new ChunkedInstances('walkers-actor', actor(), mat, WALKER_CHUNK, opts);
    this.carts = [new ChunkedInstances('walkers-cart', oxCart(false), mat, WALKER_CHUNK, opts), new ChunkedInstances('walkers-cart-loaded', oxCart(true), mat, WALKER_CHUNK, opts)];
    this.porters = [new ChunkedInstances('walkers-porter', porter(false), mat, WALKER_CHUNK, opts), new ChunkedInstances('walkers-porter-loaded', porter(true), mat, WALKER_CHUNK, opts)];
    this.all = [...this.kinds, this.carriers, this.vendors, this.priestesses, this.actors, ...this.carts, ...this.porters];
    for (const k of this.all) this.group.add(k.group);
  }

  get count(): number {
    let n = 0;
    for (const k of this.all) n += k.count;
    return n;
  }

  private cum(w: Walker): Float32Array {
    let e = this.paths.get(w.id);
    if (!e || e.route !== w.route) {
      const n = w.path.length / 2;
      const cum = new Float32Array(n);
      for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(w.path[i * 2] - w.path[i * 2 - 2], w.path[i * 2 + 1] - w.path[i * 2 - 1]);
      e = { route: w.route, cum };
      this.paths.set(w.id, e);
    }
    return e.cum;
  }

  /** Where along the path a distance falls: position and heading. */
  private at(w: Walker, cum: Float32Array, d: number): [number, number, number, number] {
    const n = cum.length;
    let i = 0;
    while (i < n - 2 && cum[i + 1] < d) i++;
    const len = cum[i + 1] - cum[i] || 1;
    const f = Math.min(1, Math.max(0, (d - cum[i]) / len));
    const x0 = w.path[i * 2];
    const z0 = w.path[i * 2 + 1];
    const x1 = w.path[i * 2 + 2];
    const z1 = w.path[i * 2 + 3];
    return [x0 + (x1 - x0) * f, z0 + (z1 - z0) * f, (x1 - x0) / len, (z1 - z0) / len];
  }

  update(state: SimState, alpha: number, _time: number): void {
    for (const k of this.all) k.begin();
    const live = new Set<number>();
    const dress = col(PAL.carrierDress);
    const saffron = col(PAL.vendorDress);
    const robe = col(PAL.priestessRobe);
    const rose = col(PAL.actorTunic);
    for (const w of state.walkers) {
      live.add(w.id);
      const cum = this.cum(w);
      const total = cum[cum.length - 1];
      const lead = Math.min(total, cum[w.seg] + w.along + alpha * speedOf(w));
      if (w.kind !== 'settler' && w.kind !== 'leaver') {
        const [x, z, dx, dz] = this.at(w, cum, lead);
        const moving = lead < total && w.wait <= 0 ? 1 : 0;
        const cart = w.kind === 'cart';
        // In step with the legs (see STRIDE): highest as the legs pass, lowest at each footfall.
        const phase = ((x + z) * Math.PI * 2) / STRIDE;
        // A steadier walk than the settlers': she carries a full jar or basket; the cart rocks gently.
        const bob = Math.abs(Math.cos(phase)) * (cart ? 0.006 : 0.012) * moving;
        this.e.set(Math.sin(phase) * (cart ? 0.015 : 0.03) * moving, Math.atan2(-dz, dx), 0, 'YXZ');
        this.q.setFromEuler(this.e);
        this.p.set(x, this.ground(x, z) + 0.03 + bob, z);
        const sc = w.kind === 'water' || w.kind === 'food' || w.kind === 'priestess' ? 0.9 : 0.95;
        this.s.set(sc, sc, sc);
        this.m.compose(this.p, this.q, this.s);
        // The colour's sign tells the shader whether the legs swing (negated: standing still).
        const still = (c: THREE.Color): THREE.Color => (moving ? c : c.multiplyScalar(-1));
        if (w.kind === 'water') this.carriers.push(this.m, still(this.c.copy(dress)));
        else if (w.kind === 'food') this.vendors.push(this.m, still(this.c.copy(saffron)));
        else if (w.kind === 'priestess') this.priestesses.push(this.m, still(this.c.copy(robe)));
        else if (w.kind === 'actor') this.actors.push(this.m, still(this.c.copy(rose)));
        else {
          this.c.copy(col(TUNICS[Math.floor(hash2(w.origin, 3, 62) * TUNICS.length)]));
          (cart ? this.carts : this.porters)[w.load > 0 ? 1 : 0].push(this.m, still(this.c));
        }
        const v = this.serviceAt.get(w.id);
        if (v) v.pos.copy(this.p);
        else this.serviceAt.set(w.id, { pos: this.p.clone(), kind: w.kind });
        continue;
      }
      for (let k = 0; k < w.people; k++) {
        const d = Math.max(0, lead - k * SPACING);
        const [x0, z0, dx, dz] = this.at(w, cum, d);
        // Walk a little side by side rather than in a ruled line.
        const side = k === 0 ? 0 : (k % 2 ? 1 : -1) * 0.1;
        const x = x0 - dz * side;
        const z = z0 + dx * side;
        const seed = w.id * 7 + k;
        const phase = ((x + z) * Math.PI * 2) / STRIDE;
        const moving = d > 0 && d < total ? 1 : 0;
        const bob = Math.abs(Math.cos(phase)) * 0.018 * moving;
        const child = w.people >= 3 && k === w.people - 1;
        const sc = child ? 0.66 : 0.84 + 0.1 * hash2(seed, 1, 61);
        this.e.set(Math.sin(phase) * 0.06 * moving, Math.atan2(-dz, dx), 0, 'YXZ');
        this.q.setFromEuler(this.e);
        this.p.set(x, this.ground(x, z) + 0.03 + bob, z);
        this.s.set(sc, sc, sc);
        this.m.compose(this.p, this.q, this.s);
        this.c.copy(col(TUNICS[Math.floor(hash2(seed, 2, 62) * TUNICS.length)]));
        if (!moving) this.c.multiplyScalar(-1);
        this.kinds[k === 0 ? 0 : 1].push(this.m, this.c);
      }
    }
    for (const k of this.all) k.end();
    for (const id of this.paths.keys()) if (!live.has(id)) this.paths.delete(id);
    for (const id of this.serviceAt.keys()) if (!live.has(id)) this.serviceAt.delete(id);
  }
}
