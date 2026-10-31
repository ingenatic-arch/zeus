/**
 * Slice 55: the monsters at the gates, drawn. Each of the seven is its own
 * figure built in code, several times a man's height (the Cyclops and Talos
 * tallest), with a silhouette of its own at the classic zoom:
 *
 * - the Cyclops: a hairy giant in hides with one great eye and a tree-trunk club;
 * - Talos: a man of bronze, square-cut, a red-hot nail at his ankle;
 * - the Minotaur: a man's body under a black bull's head, horns and a double axe;
 * - Medusa: a woman's body on a serpent's coils, snakes for hair, eyes that glow;
 * - the Hydra: a low dark body on short legs and five long necks that sway;
 * - the Chimera: a lion with a goat's head on its back and a serpent for a tail,
 *   fire at its mouth when it breathes;
 * - the Boar: a vast black boar with a bristled ridge and white tusks.
 *
 * They walk (legs swinging, Medusa's coils and the Hydra's necks swaying),
 * strike (arms up and down, a lunge for the beasts), limp when badly hurt,
 * and stand breathing before their lairs; healing, they are inside, unseen.
 * A bar over a hurt one's head shows its health.
 *
 * Their lairs: a cave mouth in a heap of rocks, a marsh pool ringed with reeds
 * and bones, a rocky den of jagged stones on the shore; a slain monster's
 * lair stays. Medusa's stone figures stand where she caught them and sink
 * from sight as their time runs out.
 *
 * It only reads the state.
 */
import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { hash2 } from '../map/noise';
import { MAKES, STONE_LAST, type Beast } from '../sim/monsters';
import type { Lair, MonsterId } from '../sim/pantheon';
import type { SimState } from '../sim/state';
import { col, PAL } from './palette';
import { lumpy } from './trees';

type P = { geo: THREE.BufferGeometry; color: string };

/** Parts into one geometry with their colours baked in (no finish: these are beasts, not buildings). */
function build(parts: P[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const colors: number[] = [];
  for (const { geo, color } of parts) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const p = g.attributes.position as THREE.BufferAttribute;
    const c = col(color);
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      colors.push(c.r, c.g, c.b);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  out.computeVertexNormals();
  out.computeBoundingSphere();
  return out;
}

const FLESH = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, metalness: 0 });
const METAL = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.42, metalness: 0.55 });
const FIRE = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, opacity: 0.9, depthWrite: false });

const blob = (r: number, seed: number, detail = 1): THREE.BufferGeometry => lumpy(new THREE.IcosahedronGeometry(r, detail), 0.22, seed);
const cyl = (r0: number, r1: number, h: number, seg = 6): THREE.BufferGeometry => new THREE.CylinderGeometry(r0, r1, h, seg);
const box = (x: number, y: number, z: number): THREE.BufferGeometry => new THREE.BoxGeometry(x, y, z);
const cone = (r: number, h: number, seg = 5): THREE.BufferGeometry => new THREE.ConeGeometry(r, h, seg);

/** A piece, a mesh of parts, under a parent; returns it. */
function piece(parent: THREE.Object3D, parts: P[], mat: THREE.Material = FLESH): THREE.Mesh {
  const m = new THREE.Mesh(build(parts), mat);
  parent.add(m);
  return m;
}

/** A joint at (x, y, z) under a parent (a hip, a shoulder, a neck's root), its parts hanging from it. */
function joint(parent: THREE.Object3D, x: number, y: number, z: number, parts: P[], mat: THREE.Material = FLESH): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  piece(g, parts, mat);
  return g;
}

/** A figure: its root (placed and turned), its body (bobbed and tilted), and the joints that move. */
interface Rig {
  kind: MonsterId;
  root: THREE.Group;
  body: THREE.Group;
  /** Legs, each with its swing (+1, -1); four-legged beasts swing them in diagonal pairs. */
  legs: Array<{ o: THREE.Object3D; s: number }>;
  /** Arms that strike (raised and brought down): each with how far it swings. */
  arms: Array<{ o: THREE.Object3D; k: number }>;
  /** Necks, snakes and coils that sway: each with its own phase. */
  sway: Array<{ o: THREE.Object3D; p: number; a: number; axis: 'y' | 'z' | 'x'; base: number }>;
  /** Fire at its mouth (the Chimera). */
  flame: THREE.Object3D | null;
  /** Its health bar (turned to the camera). */
  bar: THREE.Group;
  fill: THREE.Mesh;
  /** Four-legged: lunges rather than swings. */
  beast: boolean;
  /** The length of its stride (tiles), for its legs to keep pace with the ground. */
  stride: number;
}

function rig(kind: MonsterId, beast: boolean, stride: number): Rig {
  const root = new THREE.Group();
  root.name = `monster-${kind}`;
  const body = new THREE.Group();
  root.add(body);
  const bar = new THREE.Group();
  const back = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.1), new THREE.MeshBasicMaterial({ color: col('#2a1d16'), depthTest: false, transparent: true, opacity: 0.85 }));
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.07).translate(0.5, 0, 0), new THREE.MeshBasicMaterial({ color: col('#d8452e'), depthTest: false }));
  fill.position.set(-0.48, 0, 0.001);
  back.renderOrder = 10;
  fill.renderOrder = 11;
  bar.add(back, fill);
  bar.visible = false;
  return { kind, root, body, legs: [], arms: [], sway: [], flame: null, bar, fill, beast, stride };
}

// ---------------------------------------------------------------------------- the seven

const HIDE = '#7a5838';
/** The Chimera and the Boar are built at a beast's size and scaled up (their heights in MAKES are what they come to). */
const CHIMERA_SCALE = 1.3;
const BOAR_SCALE = 1.1;
const HAIR = '#3a2a1e';

/** The Cyclops (3 tiles): a hairy giant in hides, one great eye, a tree-trunk club in his right hand. */
function cyclops(): Rig {
  const r = rig('cyclops', false, 1.6);
  const skin = '#b98762';
  const hip = 1.2;
  for (const z of [-0.26, 0.26]) {
    const leg = joint(r.body, 0, hip, z, [
      { geo: cyl(0.2, 0.15, 1.1, 7).translate(0, -0.55, 0), color: skin },
      { geo: box(0.36, 0.12, 0.24).translate(0.08, -1.14, 0), color: '#5a4030' },
    ]);
    r.legs.push({ o: leg, s: z < 0 ? 1 : -1 });
  }
  piece(r.body, [
    // Hides round his middle, a belly, a broad chest and hunched shoulders.
    { geo: lumpy(cyl(0.5, 0.56, 0.45, 9), 0.25, 551).translate(0, hip + 0.05, 0), color: HIDE },
    { geo: blob(0.55, 552).scale(0.85, 1.05, 1).translate(0.05, hip + 0.55, 0), color: skin },
    { geo: blob(0.6, 553).scale(0.8, 0.75, 1.15).translate(0, hip + 0.98, 0), color: skin },
    { geo: blob(0.3, 554, 0).scale(1, 0.6, 2.4).translate(-0.05, hip + 1.25, 0), color: '#4b3526' },
    // The head: low between the shoulders, a heavy brow, the one eye, a beard.
    { geo: blob(0.3, 555).scale(1, 1.05, 0.95).translate(0.2, hip + 1.52, 0), color: skin },
    { geo: blob(0.32, 556, 0).scale(0.9, 0.55, 1).translate(0.1, hip + 1.72, 0), color: HAIR },
    { geo: box(0.12, 0.08, 0.42).translate(0.44, hip + 1.62, 0), color: '#5a3e2b' },
    { geo: new THREE.SphereGeometry(0.13, 10, 8).scale(0.6, 1, 1).translate(0.47, hip + 1.52, 0), color: '#f4ecd8' },
    { geo: new THREE.SphereGeometry(0.06, 8, 6).translate(0.53, hip + 1.52, 0), color: '#2b1a10' },
    { geo: cone(0.22, 0.42, 6).rotateZ(Math.PI).translate(0.32, hip + 1.2, 0), color: HAIR },
  ]);
  // His arms: the left a fist, the right the club.
  const left = joint(r.body, 0.05, hip + 1.1, 0.62, [
    { geo: cyl(0.14, 0.12, 1.0, 6).translate(0, -0.5, 0), color: skin },
    { geo: blob(0.15, 557, 0).translate(0.02, -1.05, 0), color: skin },
  ]);
  left.rotation.x = -0.18;
  const right = joint(r.body, 0.05, hip + 1.1, -0.62, [
    { geo: cyl(0.14, 0.12, 1.0, 6).translate(0, -0.5, 0), color: skin },
    { geo: blob(0.15, 558, 0).translate(0.02, -1.05, 0), color: skin },
    // The club: a young tree, root end down, knots on it.
    { geo: lumpy(cyl(0.09, 0.2, 1.5, 7), 0.2, 559).rotateZ(-1.2).translate(0.55, -0.85, 0), color: '#6a4d33' },
    { geo: blob(0.16, 560, 0).translate(1.16, -0.6, 0), color: '#5a412b' },
  ]);
  right.rotation.x = 0.18;
  r.arms.push({ o: right, k: 1.9 }, { o: left, k: 0.5 });
  return r;
}

/** Talos (3.4 tiles): a man of bronze, square-cut, a crested helm, a red-hot nail at his ankle. */
function talos(): Rig {
  const r = rig('talos', false, 1.7);
  const bronze = '#c08d3e';
  const dark = '#8a5f24';
  const hip = 1.35;
  for (const z of [-0.26, 0.26]) {
    const parts: P[] = [
      { geo: box(0.28, 1.3, 0.26).translate(0, -0.62, 0), color: bronze },
      { geo: box(0.32, 0.18, 0.3).translate(0.02, -0.62, 0), color: dark },
      { geo: box(0.44, 0.12, 0.3).translate(0.08, -1.3, 0), color: dark },
    ];
    // (The one vein of ichor, stopped with a bronze nail glowing at his right ankle.)
    if (z < 0) parts.push({ geo: cyl(0.05, 0.05, 0.12, 6).rotateX(Math.PI / 2).translate(-0.12, -1.16, -0.12), color: '#ff7a2a' });
    r.legs.push({ o: joint(r.body, 0, hip, z, parts, METAL), s: z < 0 ? 1 : -1 });
  }
  piece(r.body, [
    { geo: box(0.5, 0.3, 0.72).translate(0, hip + 0.1, 0), color: dark },
    { geo: box(0.55, 0.8, 0.8).translate(0, hip + 0.65, 0), color: bronze },
    { geo: box(0.62, 0.42, 1.18).translate(0, hip + 1.18, 0), color: bronze },
    { geo: box(0.08, 0.5, 0.5).translate(0.3, hip + 0.85, 0), color: dark },
    { geo: box(0.2, 0.18, 0.2).translate(0, hip + 1.46, 0), color: dark },
    // The helm, its cheek guards and crest; eyes of fire.
    { geo: box(0.4, 0.42, 0.38).translate(0.03, hip + 1.72, 0), color: bronze },
    { geo: box(0.1, 0.22, 0.4).translate(0.2, hip + 1.62, 0), color: dark },
    { geo: box(0.55, 0.14, 0.07).translate(-0.02, hip + 2.0, 0), color: '#7a1f18' },
    { geo: box(0.04, 0.05, 0.08).translate(0.235, hip + 1.76, 0.09), color: '#ffb347' },
    { geo: box(0.04, 0.05, 0.08).translate(0.235, hip + 1.76, -0.09), color: '#ffb347' },
  ], METAL);
  const arm = (z: number, rock: boolean): THREE.Group =>
    joint(r.body, 0, hip + 1.22, z, [
      { geo: box(0.22, 1.15, 0.22).translate(0, -0.6, 0), color: bronze },
      { geo: box(0.28, 0.22, 0.28).translate(0, -1.25, 0), color: dark },
      ...(rock ? [{ geo: blob(0.3, 561, 0).translate(0.1, -1.45, 0), color: PAL.rockDark }] : []),
    ], METAL);
  const right = arm(-0.72, true);
  const left = arm(0.72, false);
  r.arms.push({ o: right, k: 1.8 }, { o: left, k: 1.2 });
  return r;
}

/** The Minotaur (2.1 tiles): a man's body under a black bull's head, long pale horns, a double axe. */
function minotaur(): Rig {
  const r = rig('minotaur', false, 1.1);
  const skin = '#94623f';
  const fur = '#2f231c';
  const hip = 0.85;
  for (const z of [-0.18, 0.18]) {
    r.legs.push({
      o: joint(r.body, 0, hip, z, [
        { geo: cyl(0.13, 0.09, 0.8, 6).translate(0, -0.4, 0), color: fur },
        { geo: box(0.2, 0.1, 0.16).translate(0.04, -0.82, 0), color: '#1b1410' },
      ]),
      s: z < 0 ? 1 : -1,
    });
  }
  piece(r.body, [
    { geo: lumpy(cyl(0.3, 0.36, 0.3, 8), 0.2, 571).translate(0, hip + 0.02, 0), color: '#7a2a20' },
    { geo: blob(0.36, 572).scale(0.8, 1.2, 1).translate(0.02, hip + 0.45, 0), color: skin },
    { geo: blob(0.4, 573).scale(0.75, 0.7, 1.2).translate(0, hip + 0.78, 0), color: skin },
    // The bull's head, thrust forward on a thick neck: muzzle, a bronze ring, eyes, horns.
    { geo: blob(0.26, 574).scale(1, 1, 0.9).translate(0.12, hip + 1.02, 0), color: fur },
    { geo: blob(0.24, 575).scale(1.25, 0.95, 0.85).translate(0.3, hip + 1.16, 0), color: fur },
    { geo: blob(0.15, 576, 0).scale(1, 0.8, 1.05).translate(0.5, hip + 1.08, 0), color: '#4a372b' },
    { geo: new THREE.TorusGeometry(0.06, 0.016, 4, 10).rotateY(Math.PI / 2).translate(0.6, hip + 1.02, 0), color: PAL.bronze },
    { geo: new THREE.SphereGeometry(0.035, 6, 4).translate(0.42, hip + 1.24, 0.13), color: '#d84a1e' },
    { geo: new THREE.SphereGeometry(0.035, 6, 4).translate(0.42, hip + 1.24, -0.13), color: '#d84a1e' },
    { geo: cone(0.06, 0.48, 5).rotateX(-1.05).translate(0.28, hip + 1.38, 0.32), color: PAL.bone },
    { geo: cone(0.06, 0.48, 5).rotateX(1.05).translate(0.28, hip + 1.38, -0.32), color: PAL.bone },
  ]);
  // The axe in his right hand, held up; his left a fist.
  const right = joint(r.body, 0, hip + 0.8, -0.42, [
    { geo: cyl(0.09, 0.08, 0.7, 6).translate(0, -0.35, 0), color: skin },
    { geo: cyl(0.025, 0.025, 1.2, 4).rotateZ(-0.35).translate(0.15, -0.35, 0), color: PAL.wood },
    { geo: new THREE.CylinderGeometry(0.28, 0.28, 0.03, 10, 1, false, -0.9, 1.8).rotateX(Math.PI / 2).rotateZ(-0.35).translate(0.33, 0.1, 0), color: PAL.rockGrey },
    { geo: new THREE.CylinderGeometry(0.28, 0.28, 0.03, 10, 1, false, Math.PI - 0.9, 1.8).rotateX(Math.PI / 2).rotateZ(-0.35).translate(0.33, 0.1, 0), color: PAL.rockGrey },
  ]);
  const left = joint(r.body, 0, hip + 0.8, 0.42, [
    { geo: cyl(0.09, 0.08, 0.7, 6).translate(0, -0.35, 0), color: skin },
    { geo: blob(0.1, 577, 0).translate(0, -0.75, 0), color: skin },
  ]);
  r.arms.push({ o: right, k: 2.0 }, { o: left, k: 0.6 });
  return r;
}

/** Medusa (1.9 tiles): a woman's body on a serpent's coils, a crown of snakes, eyes that glow. */
function medusa(): Rig {
  const r = rig('medusa', false, 1.0);
  const scale = '#4f6e35';
  const belly = '#a8a565';
  const skin = '#9fae86';
  // The coils, from her waist round behind her in a loop and out to the tip of her tail (each sways on its own).
  const COIL: Array<[number, number]> = [
    [0.02, 0],
    [-0.32, 0.26],
    [-0.7, 0.16],
    [-0.82, -0.2],
    [-0.52, -0.46],
    [-0.12, -0.5],
    [0.2, -0.62],
  ];
  for (let i = 0; i < COIL.length; i++) {
    const rad = 0.26 - i * 0.028;
    const [cx, cz] = COIL[i];
    const [nx, nz] = COIL[Math.min(COIL.length - 1, i + 1)];
    const [px, pz] = COIL[Math.max(0, i - 1)];
    const g = joint(r.body, cx, rad * 0.85, cz, [
      { geo: blob(rad, 580 + i).scale(1.6, 0.8, 1), color: i % 2 ? scale : '#5c7c3e' },
      { geo: blob(rad * 0.7, 590 + i, 0).scale(1.5, 0.4, 0.8).translate(0, -rad * 0.5, 0), color: belly },
    ]);
    g.rotation.y = -Math.atan2(nz - pz, nx - px);
    r.sway.push({ o: g, p: i * 0.9, a: 0.05 + i * 0.03, axis: 'x', base: 0 });
  }
  piece(r.body, [
    // Her waist rising from the coils, a bronze girdle, a dark chiton over her breast, her head.
    { geo: cyl(0.2, 0.26, 0.5, 8).translate(0.05, 0.45, 0), color: scale },
    { geo: cyl(0.21, 0.21, 0.08, 8).translate(0.05, 0.72, 0), color: PAL.bronze },
    { geo: cyl(0.15, 0.2, 0.5, 8).translate(0.05, 0.98, 0), color: '#6b2f2a' },
    { geo: cyl(0.155, 0.155, 0.05, 8).translate(0.05, 1.18, 0), color: PAL.bronze },
    { geo: blob(0.2, 596).scale(0.8, 0.6, 1.3).translate(0.05, 1.2, 0), color: skin },
    { geo: cyl(0.06, 0.07, 0.14, 6).translate(0.06, 1.33, 0), color: skin },
    { geo: blob(0.15, 597).scale(1, 1.15, 0.95).translate(0.08, 1.48, 0), color: skin },
    { geo: new THREE.SphereGeometry(0.03, 6, 4).translate(0.21, 1.5, 0.055), color: '#ffe84a' },
    { geo: new THREE.SphereGeometry(0.03, 6, 4).translate(0.21, 1.5, -0.055), color: '#ffe84a' },
  ]);
  // The snakes of her hair, each its own, writhing.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const g = new THREE.Group();
    g.position.set(0.04 + Math.cos(a) * 0.1, 1.55, Math.sin(a) * 0.12);
    g.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9 + 0.2);
    r.body.add(g);
    piece(g, [
      { geo: cyl(0.018, 0.03, 0.26, 4).translate(0, 0.13, 0), color: i % 2 ? '#3f5a2a' : '#5e7a36' },
      { geo: blob(0.035, 600 + i, 0).scale(1.6, 0.8, 1).translate(0.03, 0.27, 0), color: '#2f4220' },
    ]);
    r.sway.push({ o: g, p: i * 1.7, a: 0.25, axis: 'x', base: g.rotation.x });
  }
  // Her arms: the right reaching out as she looks on her prey; the left holds a bronze knife.
  const right = joint(r.body, 0.05, 1.2, -0.25, [
    { geo: cyl(0.045, 0.04, 0.55, 5).translate(0, -0.27, 0), color: skin },
    { geo: blob(0.05, 610, 0).translate(0, -0.56, 0), color: skin },
  ]);
  const left = joint(r.body, 0.05, 1.2, 0.25, [
    { geo: cyl(0.045, 0.04, 0.55, 5).translate(0, -0.27, 0), color: skin },
    { geo: cone(0.03, 0.3, 4).rotateZ(-Math.PI / 2).translate(0.15, -0.56, 0), color: PAL.bronze },
  ]);
  r.arms.push({ o: right, k: 1.6 }, { o: left, k: 1.3 });
  return r;
}

/** The Hydra (2.1 tiles to its heads): a low dark body on four short legs, five long necks, a heavy tail. */
function hydra(): Rig {
  const r = rig('hydra', true, 0.9);
  const hide = '#34502f';
  const pale = '#7f8f4c';
  const legAt: Array<[number, number, number]> = [
    [0.55, 0.32, 1],
    [0.55, -0.32, -1],
    [-0.55, 0.32, -1],
    [-0.55, -0.32, 1],
  ];
  for (const [lx, lz, s] of legAt) r.legs.push({ o: joint(r.body, lx, 0.55, lz, [{ geo: cyl(0.12, 0.1, 0.55, 6).translate(0, -0.27, 0), color: hide }, { geo: box(0.24, 0.08, 0.2).translate(0.06, -0.55, 0), color: '#1e2c1a' }]), s });
  piece(r.body, [
    { geo: blob(0.62, 620).scale(1.5, 0.72, 0.95).translate(0, 0.82, 0), color: hide },
    { geo: blob(0.5, 621).scale(1.6, 0.4, 0.9).translate(0, 0.58, 0), color: pale },
    // A ridge of plates down its back.
    ...[-0.6, -0.3, 0, 0.3].map((px, i) => ({ geo: cone(0.1, 0.24, 4).translate(px, 1.3 - Math.abs(px) * 0.25, 0), color: i % 2 ? '#22351f' : '#2c4428' })),
  ]);
  const tail = joint(r.body, -0.85, 0.8, 0, [{ geo: cone(0.3, 1.5, 6).rotateZ(Math.PI / 2 + 0.25).translate(-0.7, -0.2, 0), color: hide }]);
  r.sway.push({ o: tail, p: 0, a: 0.25, axis: 'y', base: 0 });
  // Five necks from its shoulders, fanned out, each with its own head.
  for (let i = 0; i < 5; i++) {
    const spread = (i - 2) * 0.32;
    const len = 1.05 + (i === 2 ? 0.25 : 0);
    const g = new THREE.Group();
    g.position.set(0.7, 1.0, spread * 0.6);
    g.rotation.set(spread * 1.1, 0, -0.55);
    r.body.add(g);
    piece(g, [
      { geo: cyl(0.06, 0.12, len, 6).translate(0, len / 2, 0), color: hide },
      { geo: blob(0.11, 630 + i, 0).scale(1.8, 0.75, 0.9).translate(0.1, len + 0.02, 0), color: '#2a4226' },
      { geo: cone(0.05, 0.16, 4).rotateZ(-Math.PI / 2).translate(0.32, len, 0), color: '#2a4226' },
      { geo: new THREE.SphereGeometry(0.025, 5, 3).translate(0.14, len + 0.08, 0.05), color: '#f2d24a' },
      { geo: new THREE.SphereGeometry(0.025, 5, 3).translate(0.14, len + 0.08, -0.05), color: '#f2d24a' },
    ]);
    r.sway.push({ o: g, p: i * 1.3, a: 0.22, axis: 'z', base: -0.55 });
    r.arms.push({ o: g, k: 0.5 });
  }
  return r;
}

/** The Chimera (1.6 tiles): a lion with a goat's head rising from its back and a serpent for a tail; fire at its mouth. */
function chimera(): Rig {
  const r = rig('chimera', true, 1.0);
  const tawny = '#c08a3e';
  const mane = '#6e3f1c';
  const legAt: Array<[number, number, number]> = [
    [0.45, 0.22, 1],
    [0.45, -0.22, -1],
    [-0.45, 0.22, -1],
    [-0.45, -0.22, 1],
  ];
  for (const [lx, lz, s] of legAt) r.legs.push({ o: joint(r.body, lx, 0.55, lz, [{ geo: cyl(0.12, 0.09, 0.55, 6).translate(0, -0.27, 0), color: tawny }, { geo: blob(0.08, 640, 0).scale(1.4, 0.6, 1).translate(0.04, -0.55, 0), color: '#9c6b2c' }]), s });
  piece(r.body, [
    { geo: blob(0.4, 641).scale(1.55, 0.75, 0.8).translate(0, 0.78, 0), color: tawny },
    // The lion's head in its great mane, jaws open.
    { geo: blob(0.36, 642).scale(0.9, 1.05, 1.1).translate(0.58, 1.02, 0), color: mane },
    { geo: blob(0.2, 643).scale(1.2, 0.95, 0.95).translate(0.8, 1.02, 0), color: tawny },
    { geo: box(0.2, 0.06, 0.16).translate(0.98, 0.92, 0), color: '#5a1a14' },
    { geo: new THREE.SphereGeometry(0.03, 6, 4).translate(0.92, 1.1, 0.08), color: '#ffcf3a' },
    { geo: new THREE.SphereGeometry(0.03, 6, 4).translate(0.92, 1.1, -0.08), color: '#ffcf3a' },
    // The goat's head on its back, on a neck of its own, with ridged horns curling back.
    { geo: cyl(0.07, 0.1, 0.45, 5).rotateZ(0.25).translate(-0.05, 1.15, 0), color: '#8e8577' },
    { geo: blob(0.13, 644, 0).scale(1.4, 0.9, 0.8).translate(0.05, 1.42, 0), color: '#b8ad9a' },
    { geo: new THREE.TorusGeometry(0.1, 0.03, 4, 8, Math.PI * 1.2).rotateZ(0.3).translate(-0.04, 1.55, 0.07), color: '#3b3128' },
    { geo: new THREE.TorusGeometry(0.1, 0.03, 4, 8, Math.PI * 1.2).rotateZ(0.3).translate(-0.04, 1.55, -0.07), color: '#3b3128' },
  ]);
  // The serpent tail, rising and swaying, its head up.
  const tail = joint(r.body, -0.6, 0.85, 0, [
    { geo: cyl(0.04, 0.08, 0.9, 5).rotateZ(0.9).translate(-0.34, 0.27, 0), color: '#4f6e35' },
    { geo: cyl(0.035, 0.04, 0.4, 5).rotateZ(-0.4).translate(-0.62, 0.68, 0), color: '#4f6e35' },
    { geo: blob(0.07, 645, 0).scale(1.6, 0.8, 1).translate(-0.5, 0.88, 0), color: '#33481f' },
  ]);
  r.sway.push({ o: tail, p: 0.5, a: 0.35, axis: 'x', base: 0 });
  // Its breath: a tongue of fire from the lion's jaws.
  const flame = new THREE.Group();
  flame.position.set(1.06, 0.95, 0);
  r.body.add(flame);
  piece(flame, [
    { geo: cone(0.18, 0.9, 7).rotateZ(-Math.PI / 2).translate(0.45, 0, 0), color: '#ff8a2a' },
    { geo: cone(0.1, 0.6, 6).rotateZ(-Math.PI / 2).translate(0.32, 0, 0), color: '#ffe17a' },
  ], FIRE);
  flame.visible = false;
  r.flame = flame;
  // (Built at a lion's size, then made monstrous.)
  r.body.scale.setScalar(CHIMERA_SCALE);
  r.stride *= CHIMERA_SCALE;
  return r;
}

/** The Boar (1.2 tiles): a vast black boar with a bristled ridge and white tusks. */
function boar(): Rig {
  const r = rig('boar', true, 0.8);
  const hide = '#3a2c24';
  const legAt: Array<[number, number, number]> = [
    [0.5, 0.25, 1],
    [0.5, -0.25, -1],
    [-0.5, 0.25, -1],
    [-0.5, -0.25, 1],
  ];
  for (const [lx, lz, s] of legAt) r.legs.push({ o: joint(r.body, lx, 0.42, lz, [{ geo: cyl(0.1, 0.07, 0.42, 5).translate(0, -0.21, 0), color: hide }, { geo: box(0.12, 0.06, 0.12).translate(0.02, -0.42, 0), color: '#15100c' }]), s });
  piece(r.body, [
    { geo: blob(0.5, 650).scale(1.5, 0.82, 0.78).translate(-0.05, 0.75, 0), color: hide },
    { geo: blob(0.4, 651).scale(1, 1.05, 0.95).translate(0.45, 0.82, 0), color: '#2e231c' },
    // Its head and snout, low and forward; the tusks curving up; a red eye.
    { geo: blob(0.26, 652).scale(1.3, 0.9, 0.85).translate(0.82, 0.68, 0), color: hide },
    { geo: cyl(0.1, 0.13, 0.22, 6).rotateZ(Math.PI / 2).translate(1.1, 0.6, 0), color: '#5a4136' },
    { geo: cone(0.035, 0.32, 4).rotateZ(-0.5).translate(1.12, 0.66, 0.11), color: PAL.bone },
    { geo: cone(0.035, 0.32, 4).rotateZ(-0.5).translate(1.12, 0.66, -0.11), color: PAL.bone },
    { geo: new THREE.SphereGeometry(0.03, 5, 3).translate(0.95, 0.8, 0.14), color: '#d8341e' },
    { geo: new THREE.SphereGeometry(0.03, 5, 3).translate(0.95, 0.8, -0.14), color: '#d8341e' },
    { geo: cone(0.07, 0.18, 4).rotateZ(-0.6).translate(0.7, 0.98, 0.14), color: '#241a14' },
    { geo: cone(0.07, 0.18, 4).rotateZ(-0.6).translate(0.7, 0.98, -0.14), color: '#241a14' },
    // The bristles down its back.
    ...[-0.5, -0.3, -0.1, 0.1, 0.3, 0.5].map((px, i) => ({ geo: cone(0.07, 0.22 + (i % 2) * 0.06, 4).rotateZ(0.3).translate(px, 1.16 - Math.abs(px - 0.1) * 0.25, 0), color: '#15100c' })),
    { geo: cyl(0.02, 0.03, 0.3, 4).rotateZ(1.1).translate(-0.8, 0.82, 0), color: hide },
  ]);
  r.body.scale.setScalar(BOAR_SCALE);
  r.stride *= BOAR_SCALE;
  return r;
}

const MAKERS: Record<MonsterId, () => Rig> = { cyclops, talos, minotaur, medusa, hydra, chimera, boar };

// ---------------------------------------------------------------------------- the lairs

/** A lair, its mouth facing +x (local), built round (0, 0): the ground's height is found for each piece. */
function lairParts(den: Lair, seed: number): P[] {
  const out: P[] = [];
  const h = (i: number, k: number): number => hash2(seed + i, k, 5501);
  const bones = (cx: number, cz: number, n: number): void => {
    for (let i = 0; i < n; i++) {
      const a = h(i, 1) * Math.PI * 2;
      const d = 0.2 + h(i, 2) * 0.9;
      out.push({ geo: cyl(0.025, 0.02, 0.3 + h(i, 3) * 0.2, 4).rotateZ(Math.PI / 2).rotateY(h(i, 4) * 3).translate(cx + Math.cos(a) * d, 0.03, cz + Math.sin(a) * d), color: PAL.bone });
    }
    // A skull, and a ribcage's arcs.
    out.push({ geo: blob(0.09, seed + 7, 0).scale(1.2, 0.85, 1).translate(cx + 0.35, 0.07, cz - 0.25), color: '#e6dcc2' });
    for (let i = 0; i < 3; i++) out.push({ geo: new THREE.TorusGeometry(0.17, 0.018, 3, 8, Math.PI).rotateY(Math.PI / 2).translate(cx - 0.3 + i * 0.12, 0, cz + 0.35), color: PAL.bone });
  };
  if (den === 'cave') {
    // A heap of rock behind the mouth, a dark arch in its face, boulders either side.
    const rock = (r: number, k: number): THREE.BufferGeometry => lumpy(new THREE.DodecahedronGeometry(r, 0), 0.45, seed + k);
    out.push({ geo: rock(1.15, 1).scale(1.1, 0.8, 1.25).rotateY(0.4).translate(-1.35, 0.42, 0), color: '#8a7f72' });
    out.push({ geo: rock(0.8, 2).scale(1, 0.95, 0.9).rotateY(1.1).translate(-0.9, 0.55, 0.9), color: PAL.rockDark });
    out.push({ geo: rock(0.75, 3).scale(1, 1.05, 0.9).rotateY(2.3).translate(-0.95, 0.55, -0.95), color: '#9a8f80' });
    out.push({ geo: rock(0.62, 4).rotateY(0.7).translate(-1.75, 1.1, 0.15), color: PAL.rockDark });
    out.push({ geo: rock(0.45, 5).translate(-2.2, 0.35, -0.9), color: '#7b7166' });
    out.push({ geo: rock(0.4, 6).translate(-2.1, 0.3, 1.0), color: '#9a8f80' });
    out.push({ geo: new THREE.CylinderGeometry(0.55, 0.55, 0.9, 10, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI / 2).translate(-0.35, 0, 0), color: '#16120f' });
    out.push({ geo: box(0.7, 0.05, 1.1).translate(-0.2, 0.01, 0), color: '#2a221c' });
    out.push({ geo: lumpy(new THREE.DodecahedronGeometry(0.3, 0), 0.4, seed + 7).translate(0.25, 0.12, 1.1), color: PAL.rockDark });
    out.push({ geo: lumpy(new THREE.DodecahedronGeometry(0.24, 0), 0.4, seed + 8).translate(0.35, 0.1, -1.15), color: '#9a8f80' });
    bones(0.9, 0, 6);
  } else if (den === 'marsh') {
    // A black pool, mud round it, reeds standing thick on the far side, bones at its edge.
    out.push({ geo: new THREE.CylinderGeometry(1.4, 1.5, 0.06, 14).scale(1.2, 1, 0.9).translate(-0.9, 0.0, 0), color: '#5a5233' });
    out.push({ geo: new THREE.CylinderGeometry(1.05, 1.05, 0.08, 14).scale(1.2, 1, 0.85).translate(-0.95, 0.02, 0), color: '#2c3a33' });
    for (let i = 0; i < 46; i++) {
      const a = Math.PI * 0.35 + h(i, 5) * Math.PI * 1.3;
      const d = 1.2 + h(i, 6) * 0.8;
      const tall = 0.5 + h(i, 7) * 0.55;
      out.push({ geo: cone(0.04, tall, 3).rotateZ((h(i, 8) - 0.5) * 0.3).translate(-0.9 + Math.cos(a) * d * 1.2, tall / 2, Math.sin(a) * d), color: i % 3 ? PAL.reed : '#7d8a44' });
      if (i % 4 === 0) out.push({ geo: cyl(0.03, 0.03, 0.12, 4).translate(-0.9 + Math.cos(a) * d * 1.2, tall + 0.04, Math.sin(a) * d), color: '#5a3a24' });
    }
    // A dead tree.
    out.push({ geo: cyl(0.06, 0.12, 1.6, 5).rotateZ(0.2).translate(-2.4, 0.8, 1.0), color: '#4a3c2e' });
    out.push({ geo: cyl(0.03, 0.05, 0.7, 4).rotateZ(-0.9).translate(-2.1, 1.3, 1.0), color: '#4a3c2e' });
    bones(0.6, -0.2, 7);
  } else {
    // A rocky den: jagged dark stones in a horseshoe open to the land, weed and bones inside.
    for (let i = 0; i < 11; i++) {
      const a = Math.PI * 0.3 + (i / 10) * Math.PI * 1.4;
      const tall = 0.55 + h(i, 9) * 0.9 * (i % 3 === 1 ? 0.5 : 1);
      const lean = (h(i, 13) - 0.5) * 0.5;
      out.push({ geo: lumpy(cone(0.38 + h(i, 10) * 0.3, tall, 4), 0.35, seed + 20 + i).rotateY(h(i, 14) * 3).rotateZ(lean).rotateX(-lean * 0.6).translate(-0.9 + Math.cos(a) * 1.45, tall / 2 - 0.08, Math.sin(a) * 1.45), color: i % 2 ? '#5f5850' : '#77706a' });
    }
    out.push({ geo: new THREE.CylinderGeometry(1.1, 1.2, 0.05, 12).translate(-0.9, 0, 0), color: '#6d6650' });
    for (let i = 0; i < 6; i++) out.push({ geo: blob(0.14, seed + 40 + i, 0).scale(1.8, 0.3, 1).translate(-1.4 + h(i, 11) * 1.2, 0.04, -0.7 + h(i, 12) * 1.4), color: '#3d5a3a' });
    bones(0.3, 0.1, 6);
  }
  return out;
}

/** A turned-to-stone walker: a figure in grey, one arm up before its face. */
function stoneFigure(): THREE.BufferGeometry {
  const grey = '#a49c90';
  return build([
    { geo: cyl(0.02, 0.018, 0.12, 4).translate(0, 0.06, 0.03), color: grey },
    { geo: cyl(0.02, 0.018, 0.12, 4).translate(0, 0.06, -0.03), color: grey },
    { geo: cyl(0.055, 0.085, 0.21, 6).translate(0, 0.205, 0), color: '#9a9286' },
    { geo: cyl(0.016, 0.014, 0.16, 4).rotateZ(-2.2).translate(0.07, 0.33, 0.06), color: grey },
    { geo: cyl(0.016, 0.014, 0.15, 4).rotateX(-0.18).translate(0, 0.23, -0.07), color: grey },
    { geo: new THREE.IcosahedronGeometry(0.058, 0).translate(0.005, 0.365, 0), color: '#b0a89c' },
    { geo: cyl(0.1, 0.12, 0.04, 6).translate(0, 0.0, 0), color: '#8c857a' },
  ]);
}

// ---------------------------------------------------------------------------- the view

/** Where each monster was drawn this frame (for hovering and clicking): its feet, its height. */
export interface BeastShown {
  id: number;
  x: number;
  y: number;
  z: number;
  tall: number;
}

const STONE_CAP = 48;

export class MonstersView {
  readonly group = new THREE.Group();
  private readonly figures = new Map<number, Rig>();
  private readonly lairs = new Map<string, THREE.Mesh>();
  private readonly stones: THREE.InstancedMesh;
  /** Each monster's place, its walk, at the last two ticks seen. */
  private readonly was = new Map<number, { px: number; pz: number; x: number; z: number; pw: number; w: number }>();
  private tick = -1;
  /** Drawn this frame. */
  readonly shown: BeastShown[] = [];
  /** The lairs on the map, their monster (0 for a slain one's) and middle. */
  readonly lairsShown: Array<{ id: number; x: number; y: number; z: number }> = [];
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);

  constructor(private readonly map: CoastMap) {
    this.group.name = 'monsters';
    this.stones = new THREE.InstancedMesh(stoneFigure(), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }), STONE_CAP);
    this.stones.count = 0;
    this.stones.frustumCulled = false;
    this.group.add(this.stones);
  }

  private ground(x: number, z: number): number {
    return this.map.heightAt(x, z);
  }

  /** A lair's mesh: its pieces each set on the ground under it. */
  private lairMesh(tile: number, den: Lair, mouth: number, seed: number): THREE.Mesh {
    const n = this.map.size;
    const cx = (tile % n) + 0.5;
    const cz = Math.floor(tile / n) + 0.5;
    const c = Math.cos(mouth);
    const s = Math.sin(mouth);
    const parts = lairParts(den, seed).map(({ geo, color }) => {
      geo.computeBoundingBox();
      const bb = geo.boundingBox!;
      const lx = (bb.min.x + bb.max.x) / 2;
      const lz = (bb.min.z + bb.max.z) / 2;
      // Turned so local +x is the mouth's way (x' = x cos - z sin, z' = x sin + z cos), and set on the ground there (a little sunk).
      const wx = cx + lx * c - lz * s;
      const wz = cz + lx * s + lz * c;
      const g = geo.clone().rotateY(-mouth).translate(cx, this.ground(wx, wz) - 0.06, cz);
      return { geo: g, color };
    });
    const mesh = new THREE.Mesh(build(parts), FLESH);
    mesh.name = `lair-${den}`;
    return mesh;
  }

  update(s: SimState, alpha: number, time: number, face: THREE.Quaternion): void {
    const legends = s.legends;
    this.shown.length = 0;
    this.lairsShown.length = 0;
    if (!legends.monsters.length && !legends.slain.length && !legends.stones.length && !this.figures.size && !this.lairs.size) return;
    const n = this.map.size;
    // The lairs: each monster's from when it is on the map, and the slain ones'.
    const want = new Set<string>();
    const lairOf = (key: string, tile: number, den: Lair, mouth: number, seed: number, id: number): void => {
      want.add(key);
      let mesh = this.lairs.get(key);
      if (!mesh) {
        mesh = this.lairMesh(tile, den, mouth, seed);
        this.lairs.set(key, mesh);
        this.group.add(mesh);
      }
      const x = (tile % n) + 0.5;
      const z = Math.floor(tile / n) + 0.5;
      this.lairsShown.push({ id, x: x - Math.cos(mouth) * 1.2, y: this.ground(x, z) + 0.6, z: z - Math.sin(mouth) * 1.2 });
    };
    for (const m of legends.monsters) if (m.state !== 'coming') lairOf(`${m.kind}:${m.lair}`, m.lair, m.den, m.mouth, m.lair * 7 + 1, m.id);
    for (const d of legends.slain) {
      const x = d.lair % n;
      const z = Math.floor(d.lair / n);
      lairOf(`${d.kind}:${d.lair}`, d.lair, d.den, Math.atan2(n / 2 - z, n / 2 - x), d.lair * 7 + 1, 0);
    }
    for (const [key, mesh] of this.lairs) {
      if (want.has(key)) continue;
      this.group.remove(mesh);
      mesh.geometry.dispose();
      this.lairs.delete(key);
    }

    // Their places at the last two ticks.
    if (s.tick !== this.tick) {
      const jump = this.tick < 0 || s.tick - this.tick > 4 || s.tick < this.tick;
      this.tick = s.tick;
      for (const m of legends.monsters) {
        const w = this.was.get(m.id);
        if (!w || jump) this.was.set(m.id, { px: m.x, pz: m.z, x: m.x, z: m.z, pw: m.walked, w: m.walked });
        else Object.assign(w, { px: w.x, pz: w.z, pw: w.w, x: m.x, z: m.z, w: m.walked });
      }
    }
    const a = Math.max(0, Math.min(1, alpha));
    const now = s.tick + a;
    const live = new Set<number>();
    for (const m of legends.monsters) {
      // (Not yet come, or inside its lair healing: not seen.)
      if (m.state === 'coming' || m.state === 'healing') continue;
      const was = this.was.get(m.id);
      if (!was) continue;
      live.add(m.id);
      let r = this.figures.get(m.id);
      if (!r) {
        r = MAKERS[m.kind]();
        this.figures.set(m.id, r);
        this.group.add(r.root, r.bar);
      }
      this.pose(r, m, was, a, now, time, face);
      this.shown.push({ id: m.id, x: r.root.position.x, y: r.root.position.y, z: r.root.position.z, tall: MAKES[m.kind].tall });
    }
    for (const [id, r] of this.figures) {
      if (live.has(id)) continue;
      this.group.remove(r.root, r.bar);
      r.root.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      this.figures.delete(id);
      this.was.delete(id);
    }

    // Medusa's stone figures, sinking from sight in their last days.
    let k = 0;
    for (const st of legends.stones) {
      if (k >= STONE_CAP) break;
      const left = st.tick + STONE_LAST - now;
      const sink = left < 60 ? (1 - Math.max(0, left) / 60) * 0.45 : 0;
      this.q.setFromAxisAngle(this.up, -st.face);
      this.p.set(st.x, this.ground(st.x, st.z) - sink, st.z);
      this.s.set(1.05, 1.05, 1.05);
      this.m.compose(this.p, this.q, this.s);
      this.stones.setMatrixAt(k++, this.m);
    }
    this.stones.count = k;
    this.stones.instanceMatrix.needsUpdate = true;
  }

  /** A monster's pose this frame: where it stands, its stride, its blow, its sway, its health bar. */
  private pose(r: Rig, m: Beast, was: { px: number; pz: number; x: number; z: number; pw: number; w: number }, a: number, now: number, time: number, face: THREE.Quaternion): void {
    const make = MAKES[m.kind];
    const x = was.px + (was.x - was.px) * a;
    const z = was.pz + (was.z - was.pz) * a;
    const walked = was.pw + (was.w - was.pw) * a;
    const moving = Math.abs(was.x - was.px) + Math.abs(was.z - was.pz) > 1e-4;
    const hurt = m.hp / m.full;
    const limping = m.broke || hurt < 0.4;
    // The stride: legs swing with the ground walked; standing, a slow breath.
    const phase = (walked / r.stride) * Math.PI * 2;
    const swing = moving ? Math.sin(phase) * (r.beast ? 0.55 : 0.42) : 0;
    for (const l of r.legs) l.o.rotation.z = swing * l.s;
    // The blow: arms raised, then brought down (a beast lunges); the Chimera's fire as it breathes.
    const dt = now - m.swung;
    const striking = m.swung > 0 && dt >= 0 && dt < 9;
    const k = striking ? (dt < 4 ? dt / 4 : Math.max(0, 1 - (dt - 4) / 3)) : 0;
    const slam = striking && dt >= 4 && dt < 7 ? Math.sin(((dt - 4) / 3) * Math.PI) : 0;
    let lunge = 0;
    let tilt = 0;
    if (r.beast) {
      lunge = slam * 0.35;
      tilt = -k * 0.12 + slam * 0.18;
      for (const arm of r.arms) arm.o.rotation.z = -0.55 + (k * 0.5 - slam * 0.9) * arm.k;
    } else {
      // (Arms forward and up as it rears, down hard as it strikes: about z, the figure facing +x.)
      for (const arm of r.arms) arm.o.rotation.z = (moving ? -swing * 0.5 : 0) + k * arm.k - slam * arm.k * 0.6;
      tilt = -k * 0.1 + slam * 0.22;
    }
    if (r.flame) {
      const on = striking && m.kind === 'chimera';
      r.flame.visible = on;
      if (on) r.flame.scale.setScalar(0.6 + 0.5 * Math.sin(time * 30) * 0.2 + Math.min(1, dt / 3) * 0.6);
    }
    // Sway: necks, coils and snakes, faster when it is roused.
    const roused = striking || m.state === 'raiding' || m.fought >= m.swung - 20;
    const pace = roused ? 3.2 : 1.3;
    for (const w of r.sway) {
      const v = Math.sin(time * pace + w.p + (moving ? phase * 0.5 : 0)) * w.a;
      w.o.rotation[w.axis] = w.base + v;
    }
    // Hydra's necks strike too (they are its arms): darting forward over the sway.
    if (m.kind === 'hydra') for (let i = 0; i < r.arms.length; i++) r.arms[i].o.rotation.z += -slam * 0.5 * (i % 2 ? 1 : 0.6);
    // Its body: a heavy bob as it walks, a limp when badly hurt, breathing standing still.
    const bob = moving ? Math.abs(Math.cos(phase)) * make.tall * 0.025 : Math.sin(time * 1.4 + m.id) * make.tall * 0.006;
    r.body.position.set(lunge, bob - (limping && moving ? Math.max(0, Math.sin(phase)) * make.tall * 0.03 : 0), 0);
    r.body.rotation.set(limping ? 0.08 : 0, 0, tilt + (limping ? -0.06 : 0));
    // Placed and turned to face its way (+x to `face`).
    r.root.position.set(x, this.ground(x, z) - 0.02, z);
    r.root.rotation.set(0, -m.face, 0);
    // Its health bar, over its head, when hurt.
    const show = m.hp < m.full - 0.5;
    r.bar.visible = show;
    if (show) {
      r.bar.position.set(x, r.root.position.y + make.tall + 0.35, z);
      r.bar.quaternion.copy(face);
      const w = Math.max(0.6, make.tall * 0.45);
      r.bar.scale.set(w, w, 1);
      r.fill.scale.x = Math.max(0.01, hurt);
      (r.fill.material as THREE.MeshBasicMaterial).color.set(hurt < 0.4 ? '#c2281c' : hurt < 0.7 ? '#d8862e' : '#7aa83e');
    }
  }

  /** The monster nearest a screen point (its body, foot to head, on screen), or 0. */
  pick(camera: THREE.Camera, rect: { left: number; top: number; width: number; height: number }, sx: number, sy: number): number {
    let best = 0;
    let bd = Infinity;
    const v = new THREE.Vector3();
    const toScreen = (x: number, y: number, z: number): [number, number] | null => {
      v.set(x, y, z).project(camera);
      if (v.z > 1) return null;
      return [rect.left + (v.x * 0.5 + 0.5) * rect.width, rect.top + (-v.y * 0.5 + 0.5) * rect.height];
    };
    for (const o of this.shown) {
      const foot = toScreen(o.x, o.y, o.z);
      const head = toScreen(o.x, o.y + o.tall, o.z);
      if (!foot || !head) continue;
      // Within its outline: a capsule from foot to head, as wide as a third of its height on screen (at least a finger's breadth).
      const hx = head[0] - foot[0];
      const hy = head[1] - foot[1];
      const len2 = hx * hx + hy * hy || 1;
      const t = Math.max(0, Math.min(1, ((sx - foot[0]) * hx + (sy - foot[1]) * hy) / len2));
      const dx = sx - (foot[0] + hx * t);
      const dy = sy - (foot[1] + hy * t);
      const d = dx * dx + dy * dy;
      const room = Math.max(16, Math.sqrt(len2) * 0.4);
      if (d < room * room && d < bd) {
        bd = d;
        best = o.id;
      }
    }
    return best;
  }

  /** The lair nearest a screen point (within its heap on screen): its monster's id, or -1 for a slain one's, or 0. */
  pickLair(camera: THREE.Camera, rect: { left: number; top: number; width: number; height: number }, sx: number, sy: number): number {
    let best = 0;
    let bd = 40 * 40;
    const v = new THREE.Vector3();
    for (const o of this.lairsShown) {
      v.set(o.x, o.y, o.z).project(camera);
      if (v.z > 1) continue;
      const dx = rect.left + (v.x * 0.5 + 0.5) * rect.width - sx;
      const dy = rect.top + (-v.y * 0.5 + 0.5) * rect.height - sy;
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = o.id || -1;
      }
    }
    return best;
  }

  /** What is drawn (for the smoke test). */
  get counts(): { figures: number; lairs: number; stones: number } {
    return { figures: this.figures.size, lairs: this.lairs.size, stones: this.stones.count };
  }
}
