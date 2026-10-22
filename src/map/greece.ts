/**
 * Greece as authored data: where the cities stand on the tabletop map of the
 * Aegean, the roads between them over the land and the sea lanes over the
 * water. The sim reads it for travel (how long a lane is, where along it a
 * ship is); the map view draws it. The coast outlines and hills of the relief
 * are in aegean.ts, which only the map view reads.
 *
 * Table units: x runs west to east, z north to south, as on the city map.
 * A degree of latitude is DEG units; longitude is narrowed by the cosine of
 * the Aegean's middle latitude, so the shapes keep their proportions.
 */

import { dcos, dhypot } from './dmath';

/**
 * A city of Greece, by its id ('athens'). Slice 31: the cities are data, a
 * table that grows by appending, so every array kept by city (the world's
 * cities, each ruler's feelings for the others) keeps its first places.
 */
export type CityId = string;
/** The cities of Greece, in the order the world record keeps them: yours first, then the four with rulers, then Tyre; then the five of slice 31. */
export const CITY_IDS: readonly CityId[] = ['home', 'athens', 'sparta', 'corinth', 'troy', 'tyre', 'thebes', 'argos', 'knossos', 'rhodes', 'memphis'];
/** The cities with a ruler (yours and Tyre have none to deal with). */
export const RULED: readonly CityId[] = ['athens', 'sparta', 'corinth', 'troy', 'thebes', 'argos', 'knossos', 'rhodes', 'memphis'];
/** How many cities Greece had before slice 31 (yours, the four, Tyre): what they shuffle from comes out as it always did. */
export const FIRST_CITIES = 6;
/** Is a city one of slice 31's newcomers (shuffled from a generator of their own)? */
export const newcomer = (id: CityId): boolean => CITY_IDS.indexOf(id) >= FIRST_CITIES;

/** The table's extent in longitude and latitude. */
export const LON0 = 20.0;
export const LON1 = 29.0;
export const LAT0 = 34.7;
export const LAT1 = 41.2;
/** Table units per degree of latitude. */
export const DEG = 20;
const COS = dcos((38.5 * Math.PI) / 180);
/** The table's size in units (x by z). */
export const TABLE_W = (LON1 - LON0) * COS * DEG;
export const TABLE_D = (LAT1 - LAT0) * DEG;

/** A longitude and latitude on the table, as x and z. */
export function project(lon: number, lat: number): [number, number] {
  return [(lon - LON0) * COS * DEG, (LAT1 - lat) * DEG];
}

export interface CityPlace {
  id: CityId;
  name: string;
  /** Where it stands (lon, lat). */
  lon: number;
  lat: number;
  /** Its colour (banner, sail, drover), sRGB hex. */
  colour: string;
  /** A second colour for trim (a sail's stripe). */
  trim: string;
  /** In a few words, what it is. */
  blurb: string;
}

/**
 * The cities. Yours stands at the head of the Argolic Gulf, between Corinth
 * (north, by road) and Sparta (south-west, over the hills), facing the sea to
 * the south as the city map does. Tyre is far off to the south-east, beyond
 * the table's edge: it stands at the corner, where its lane runs off.
 */
export const PLACES: Record<CityId, CityPlace> = {
  home: { id: 'home', name: 'Nea Argos', lon: 22.76, lat: 37.605, colour: '#c8643b', trim: '#f1e6c8', blurb: 'your city, at the head of the Argolic Gulf' },
  athens: { id: 'athens', name: 'Athens', lon: 23.73, lat: 37.99, colour: '#3f6fb0', trim: '#f4f1e6', blurb: 'rich, clever and hungry for wheat' },
  sparta: { id: 'sparta', name: 'Sparta', lon: 22.43, lat: 37.08, colour: '#a8322d', trim: '#e8c25a', blurb: 'a city of soldiers in its valley, short of fine goods' },
  corinth: { id: 'corinth', name: 'Corinth', lon: 22.88, lat: 37.91, colour: '#d2902c', trim: '#5a3a22', blurb: 'the trading city on its isthmus, between two seas' },
  troy: { id: 'troy', name: 'Troy', lon: 26.24, lat: 39.96, colour: '#4e8a5a', trim: '#e9d9a0', blurb: 'far across the sea, wealthy in fleece and wine' },
  tyre: { id: 'tyre', name: 'Tyre', lon: 28.72, lat: 34.95, colour: '#7b3f8c', trim: '#f2e7c9', blurb: 'the Phoenician port whose merchant ship calls at your quay' },
  // Slice 31: the newcomers. Thebes in Boeotia; Argos, the old Argives, on the hills west of your plain; Knossos on Crete; Rhodes on its island's northern tip; Memphis, beyond the sea at the map's southern edge (as Tyre is at its corner).
  thebes: { id: 'thebes', name: 'Thebes', lon: 23.32, lat: 38.32, colour: '#5b6b2e', trim: '#e6d39a', blurb: 'the seven-gated city of Boeotia, rich in grain and proud of its spears' },
  argos: { id: 'argos', name: 'Argos', lon: 22.3, lat: 37.75, colour: '#8a5a8f', trim: '#efe2c4', blurb: 'the old Argives on their hills, who say your plain was theirs' },
  knossos: { id: 'knossos', name: 'Knossos', lon: 25.16, lat: 35.3, colour: '#b23a3a', trim: '#2f3f6e', blurb: 'the palace city of Crete, rich in oil and wine, mistress of the southern sea' },
  rhodes: { id: 'rhodes', name: 'Rhodes', lon: 28.14, lat: 36.36, colour: '#d06a2a', trim: '#f7efd8', blurb: 'the trading island of the sun, its ships in every harbour' },
  memphis: { id: 'memphis', name: 'Memphis', lon: 26.6, lat: 34.78, colour: '#c9a227', trim: '#2a5a8a', blurb: 'the great city of Egypt beyond the sea, rich in grain and gold' },
};

/** A road over the land or a lane over the sea, between your city and another, as lon, lat points from yours to theirs. */
export interface Way {
  id: string;
  /** The city at the far end. */
  to: CityId;
  kind: 'land' | 'sea';
  pts: ReadonlyArray<readonly [number, number]>;
  /** False for a road the map draws as the roads it runs along (Athens' and Thebes' through Corinth). */
  drawn?: false;
}

/** Where the Argolic Gulf opens to the sea: every lane from your city goes out past it. */
const GULF: ReadonlyArray<readonly [number, number]> = [
  [22.76, 37.605],
  [22.77, 37.57],
  [22.8, 37.48],
  [22.88, 37.36],
  [22.98, 37.26],
  [23.12, 37.2],
];

/** The road to Corinth, over the hills by Mycenae and the Nemea pass. */
const TO_CORINTH: ReadonlyArray<readonly [number, number]> = [[22.76, 37.605], [22.75, 37.72], [22.72, 37.8], [22.8, 37.87], [22.88, 37.91]];
/** Corinth to Athens, over the isthmus by Megara and Eleusis. */
const CORINTH_ATHENS: ReadonlyArray<readonly [number, number]> = [[22.88, 37.91], [23.0, 37.95], [23.2, 37.98], [23.35, 38.0], [23.55, 38.04], [23.73, 37.99]];
/** Slice 31: from Megara (on the road from Corinth to Athens) north over Kithairon to Thebes. */
const MEGARA_THEBES: ReadonlyArray<readonly [number, number]> = [[23.35, 38.0], [23.42, 38.1], [23.38, 38.2], [23.32, 38.32]];
/** Out of the gulf and south past the Argolid's tip, the way every lane to the south takes (Tyre's first). */
const SOUTH: ReadonlyArray<readonly [number, number]> = [...GULF, [23.4, 37.05], [24.05, 36.45]];
/** On from there between the islands and Crete, to off Crete's eastern cape. */
const PAST_CRETE: ReadonlyArray<readonly [number, number]> = [[25.0, 36.1], [26.0, 35.75]];

export const WAYS: readonly Way[] = [
  { id: 'corinth-land', to: 'corinth', kind: 'land', pts: TO_CORINTH },
  // Up onto the Arcadian plateau by Tegea, then down the Eurotas valley.
  { id: 'sparta-land', to: 'sparta', kind: 'land', pts: [[22.76, 37.605], [22.62, 37.58], [22.48, 37.5], [22.42, 37.4], [22.42, 37.25], [22.43, 37.08]] },
  // Out of the gulf, round the Argolid's tip and up the Saronic Gulf to the Piraeus.
  { id: 'athens-sea', to: 'athens', kind: 'sea', pts: [...GULF, [23.4, 37.2], [23.62, 37.36], [23.6, 37.6], [23.6, 37.8], [23.63, 37.92], [23.73, 37.99]] },
  // The same way into the Saronic Gulf, then west to Corinth's eastern harbour.
  { id: 'corinth-sea', to: 'corinth', kind: 'sea', pts: [...GULF, [23.4, 37.2], [23.62, 37.36], [23.45, 37.68], [23.1, 37.86], [23.045, 37.872], [22.88, 37.91]] },
  // Through the Cyclades past Kea, round Euboea's southern cape, and north up the Aegean to the beach below Troy.
  { id: 'troy-sea', to: 'troy', kind: 'sea', pts: [...GULF, [23.4, 37.22], [23.95, 37.42], [24.3, 37.78], [24.65, 37.94], [25.05, 38.4], [25.5, 38.95], [25.75, 39.45], [25.95, 39.86], [26.12, 39.94], [26.24, 39.96]] },
  // South-east between the islands and Crete, past Karpathos, and off the table's edge towards Tyre.
  { id: 'tyre-sea', to: 'tyre', kind: 'sea', pts: [...GULF, [23.4, 37.05], [24.05, 36.45], [25.0, 36.1], [26.0, 35.75], [26.7, 35.3], [27.6, 35.2], [28.72, 34.95]] },
  // By road to Athens: to Corinth, then over the isthmus (the road drawn between them).
  { id: 'athens-land', to: 'athens', kind: 'land', pts: [...TO_CORINTH, ...CORINTH_ATHENS.slice(1)], drawn: false },
  // Slice 31. By road to Thebes: to Corinth, over the isthmus to Megara, and north over Kithairon (the roads drawn between them).
  { id: 'thebes-land', to: 'thebes', kind: 'land', pts: [...TO_CORINTH, ...CORINTH_ATHENS.slice(1, 4), ...MEGARA_THEBES.slice(1)], drawn: false },
  // West up onto the hills to Argos.
  { id: 'argos-land', to: 'argos', kind: 'land', pts: [[22.76, 37.605], [22.64, 37.64], [22.5, 37.7], [22.38, 37.74], [22.3, 37.75]] },
  // South past the Argolid and the Cyclades' western isles, and across to Crete's northern shore.
  { id: 'knossos-sea', to: 'knossos', kind: 'sea', pts: [...SOUTH, [24.7, 35.85], [25.1, 35.5], [25.16, 35.3]] },
  // The Tyre lane's way past Crete, north of Karpathos, and up to the harbour at Rhodes' northern tip.
  { id: 'rhodes-sea', to: 'rhodes', kind: 'sea', pts: [...SOUTH, ...PAST_CRETE, [26.7, 35.85], [27.3, 36.05], [27.75, 36.45], [28.14, 36.36]] },
  // The same way to Crete's eastern cape, then south across the open sea to Egypt.
  { id: 'memphis-sea', to: 'memphis', kind: 'sea', pts: [...SOUTH, ...PAST_CRETE, [26.55, 35.45], [26.6, 35.1], [26.6, 34.78]] },
];

/** Roads between the other cities (drawn on the table; Athens' caravans come by the first). */
export const OTHER_ROADS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  CORINTH_ATHENS,
  // Corinth to Sparta, through Arcadia.
  [[22.88, 37.91], [22.62, 37.78], [22.42, 37.4]],
  // Slice 31: Megara to Thebes, over Kithairon; Argos down to the road through Arcadia; Thebes to Athens by Eleusis.
  MEGARA_THEBES,
  [[23.38, 38.2], [23.45, 38.12], [23.55, 38.04]],
];

/**
 * A road or a lane between two rival cities, from `a` to `b` (as lon, lat
 * points), that their armies or fleets take when they go to war, and the
 * place on it where the two sides meet (a point of `pts`, by its index).
 */
export interface RivalWay {
  id: string;
  a: CityId;
  b: CityId;
  kind: 'land' | 'sea';
  pts: ReadonlyArray<readonly [number, number]>;
  /** Where the armies meet: the index of a point of `pts`, and its name ("Megara", "off Aegina"). */
  meet: number;
  place: string;
}

/** Sparta to Corinth through Arcadia, by Tegea and Mantinea (the road drawn between them, with Sparta's end down the Eurotas). */
const SPARTA_CORINTH: ReadonlyArray<readonly [number, number]> = [[22.43, 37.08], [22.42, 37.25], [22.42, 37.4], [22.52, 37.59], [22.62, 37.78], [22.88, 37.91]];
/** From Troy's beach down the Aegean and through the Cyclades past Andros and Kea, to the mouth of the Saronic Gulf (the Troy lane's way, the other way round). */
const TROY_SOUTH: ReadonlyArray<readonly [number, number]> = [[26.24, 39.96], [26.12, 39.94], [25.95, 39.86], [25.75, 39.45], [25.5, 38.95], [25.05, 38.4], [24.65, 37.94], [24.3, 37.78], [23.95, 37.42]];

/** The ways between the rival cities, by pair (RULED order: Athens, Sparta, Corinth, Troy, then slice 31's). Troy's are by sea. */
export const RIVAL_WAYS: readonly RivalWay[] = [
  // Athens to Sparta: over the isthmus, past Corinth, and down through Arcadia. Sparta's army marches all the way into Attica; they meet at Megara.
  { id: 'athens-sparta', a: 'athens', b: 'sparta', kind: 'land', pts: [...CORINTH_ATHENS.slice().reverse(), ...SPARTA_CORINTH.slice(0, -1).reverse()], meet: 2, place: 'Megara' },
  // Athens to Corinth over the isthmus: they meet at Megara, between them.
  { id: 'athens-corinth', a: 'athens', b: 'corinth', kind: 'land', pts: CORINTH_ATHENS.slice().reverse(), meet: 2, place: 'Megara' },
  // Troy's fleet comes down the Aegean; Athens' sails out round Sounion. They meet off Andros.
  { id: 'athens-troy', a: 'athens', b: 'troy', kind: 'sea', pts: [[23.73, 37.99], [23.63, 37.92], [23.6, 37.8], [23.6, 37.6], [23.62, 37.36], ...TROY_SOUTH.slice().reverse()], meet: 7, place: 'off Andros' },
  // Sparta to Corinth through Arcadia: they meet at Mantinea.
  { id: 'sparta-corinth', a: 'sparta', b: 'corinth', kind: 'land', pts: SPARTA_CORINTH, meet: 3, place: 'Mantinea' },
  // Sparta's ships sail from Gytheion round Cape Maleas and up through the islands; they meet Troy's off Maleas.
  { id: 'sparta-troy', a: 'sparta', b: 'troy', kind: 'sea', pts: [[22.6, 36.7], [22.66, 36.6], [22.88, 36.44], [23.12, 36.31], [23.5, 36.45], [23.95, 37.0], ...TROY_SOUTH.slice().reverse()], meet: 3, place: 'off Cape Maleas' },
  // Corinth's ships sail out of the Saronic Gulf past Aegina, where they meet Troy's.
  { id: 'corinth-troy', a: 'corinth', b: 'troy', kind: 'sea', pts: [[22.88, 37.91], [23.045, 37.872], [23.1, 37.86], [23.45, 37.68], [23.62, 37.36], ...TROY_SOUTH.slice().reverse()], meet: 3, place: 'off Aegina' },
  // Slice 31: the newcomers' neighbours. (A pair with no way between them is too far apart to come to blows.)
  // Athens to Thebes, by Eleusis and over Kithairon: they meet in the pass.
  { id: 'athens-thebes', a: 'athens', b: 'thebes', kind: 'land', pts: [[23.73, 37.99], [23.55, 38.04], [23.45, 38.12], [23.38, 38.2], [23.32, 38.32]], meet: 2, place: 'the pass over Kithairon' },
  // Corinth to Thebes, over the isthmus and by Megara: they meet at Megara.
  { id: 'corinth-thebes', a: 'corinth', b: 'thebes', kind: 'land', pts: [...CORINTH_ATHENS.slice(0, 4), ...MEGARA_THEBES.slice(1)], meet: 3, place: 'Megara' },
  // Sparta to Thebes, up through Arcadia, past Corinth and over the isthmus: Thebes' army marches into the Peloponnese, and they meet at Mantinea.
  { id: 'sparta-thebes', a: 'sparta', b: 'thebes', kind: 'land', pts: [...SPARTA_CORINTH, ...CORINTH_ATHENS.slice(1, 4), ...MEGARA_THEBES.slice(1)], meet: 3, place: 'Mantinea' },
  // Sparta to Argos, up to Tegea and over the hills: they meet at Tegea.
  { id: 'sparta-argos', a: 'sparta', b: 'argos', kind: 'land', pts: [[22.43, 37.08], [22.42, 37.25], [22.42, 37.4], [22.38, 37.55], [22.33, 37.66], [22.3, 37.75]], meet: 2, place: 'Tegea' },
  // Corinth to Argos, by Nemea: they meet there.
  { id: 'corinth-argos', a: 'corinth', b: 'argos', kind: 'land', pts: [[22.88, 37.91], [22.66, 37.84], [22.48, 37.8], [22.3, 37.75]], meet: 1, place: 'Nemea' },
  // Sparta's ships from Gytheion round Cape Maleas, past Kythera and across to Crete: they meet off Kythera.
  { id: 'sparta-knossos', a: 'sparta', b: 'knossos', kind: 'sea', pts: [[22.6, 36.7], [22.66, 36.6], [22.88, 36.44], [23.15, 36.42], [23.3, 36.15], [24.0, 35.9], [24.8, 35.6], [25.1, 35.45], [25.16, 35.3]], meet: 4, place: 'off Kythera' },
  // Athens round Sounion and south past Melos to Crete: they meet off Melos.
  { id: 'athens-knossos', a: 'athens', b: 'knossos', kind: 'sea', pts: [[23.73, 37.99], [23.63, 37.92], [23.6, 37.8], [23.6, 37.6], [23.62, 37.36], [23.95, 37.0], [24.1, 36.4], [24.7, 35.85], [25.1, 35.5], [25.16, 35.3]], meet: 6, place: 'off Melos' },
  // Athens through the Cyclades past Naxos to Rhodes: they meet off Naxos.
  { id: 'athens-rhodes', a: 'athens', b: 'rhodes', kind: 'sea', pts: [[23.73, 37.99], [23.63, 37.92], [23.6, 37.8], [23.6, 37.6], [23.62, 37.36], [24.3, 37.27], [24.75, 37.25], [25.0, 36.95], [25.35, 36.85], [25.9, 36.55], [26.8, 36.35], [27.75, 36.45], [28.14, 36.36]], meet: 8, place: 'off Naxos' },
  // Knossos east along Crete's shore and north of Karpathos to Rhodes: they meet off Karpathos.
  { id: 'knossos-rhodes', a: 'knossos', b: 'rhodes', kind: 'sea', pts: [[25.16, 35.3], [25.2, 35.48], [25.6, 35.5], [26.4, 35.55], [26.9, 35.9], [27.5, 36.2], [27.75, 36.45], [28.14, 36.36]], meet: 4, place: 'off Karpathos' },
  // Memphis north across the sea and round Crete's eastern cape to Knossos: they meet off the cape.
  { id: 'knossos-memphis', a: 'knossos', b: 'memphis', kind: 'sea', pts: [[25.16, 35.3], [25.2, 35.48], [25.8, 35.5], [26.55, 35.45], [26.6, 35.1], [26.6, 34.78]], meet: 3, place: 'off Cape Sidero' },
  // Memphis to Rhodes, south of Karpathos and up its eastern side: they meet south of Karpathos.
  { id: 'rhodes-memphis', a: 'rhodes', b: 'memphis', kind: 'sea', pts: [[28.14, 36.36], [28.35, 36.3], [28.25, 35.9], [27.8, 35.5], [27.3, 35.3], [26.6, 35.1], [26.6, 34.78]], meet: 4, place: 'south of Karpathos' },
];

/**
 * Slice 31: the empty sites, islands and capes where a city could be
 * founded, each with the good a city there would make, as a name: marble
 * and timber are wares of the works line (slice 32), so a site names its
 * good and the sim looks the ware up when there is one (growth.ts).
 */
export interface SitePlace {
  id: string;
  name: string;
  lon: number;
  lat: number;
  /** What a city there would make: 'marble', 'timber', 'copper', 'fleece', 'oil', 'wheat'. */
  good: string;
  /** In a few words, what it is. */
  blurb: string;
}
export const SITES: readonly SitePlace[] = [
  { id: 'naxos', name: 'Naxos', lon: 25.42, lat: 37.1, good: 'marble', blurb: 'the greatest of the Cyclades, its hills of white marble' },
  { id: 'thasos', name: 'Thasos', lon: 24.7, lat: 40.7, good: 'timber', blurb: 'a green island off Thrace, thick with pine and fir' },
  { id: 'kythnos', name: 'Kythnos', lon: 24.42, lat: 37.4, good: 'copper', blurb: 'a small dry island with old copper workings' },
  { id: 'melos', name: 'Melos', lon: 24.4, lat: 36.71, good: 'fleece', blurb: 'a round island on a sheltered bay, its slopes grazed by sheep' },
  { id: 'kythera', name: 'Kythera', lon: 22.99, lat: 36.25, good: 'oil', blurb: 'the island off Cape Maleas, where Aphrodite came ashore; its olives grow to the sea' },
  { id: 'cyrene', name: 'Cyrene', lon: 21.9, lat: 34.78, good: 'wheat', blurb: 'a green cape on the Libyan shore beyond the sea, good land for wheat' },
];
/** A site by its id. */
export const siteOf = (id: string): SitePlace | undefined => SITES.find((x) => x.id === id);

/** The way between two rival cities (either way round), if there is one. */
export const rivalWay = (x: CityId, y: CityId): RivalWay | undefined => RIVAL_WAYS.find((w) => (w.a === x && w.b === y) || (w.a === y && w.b === x));

/** A rival way's points on the table (x, z pairs), from `a` to `b`. */
export const rivalPoints = (w: RivalWay): number[] => w.pts.flatMap(([lon, lat]) => project(lon, lat));

/** Where on the table a rival way's meeting place is. */
export function meetPoint(w: RivalWay): { x: number; z: number } {
  const p = alongLine(rivalPoints(w), meetAlong(w));
  return { x: p.x, z: p.z };
}

/** How far along a rival way (from `a`) its meeting place is. */
export function meetAlong(w: RivalWay): number {
  const p = rivalPoints(w);
  return lineLength(p.slice(0, (w.meet + 1) * 2));
}

/** A way's points on the table (x, z pairs), from your city out. */
export function wayPoints(w: Way): number[] {
  return w.pts.flatMap(([lon, lat]) => project(lon, lat));
}

/** A polyline's length (x, z pairs). */
export function lineLength(p: readonly number[]): number {
  let l = 0;
  for (let i = 0; i + 3 < p.length; i += 2) l += dhypot(p[i + 2] - p[i], p[i + 3] - p[i + 1]);
  return l;
}

/** The point a distance along a polyline (clamped to its ends), and the way it runs there (a unit vector). */
export function alongLine(p: readonly number[], d: number): { x: number; z: number; dx: number; dz: number } {
  let left = Math.max(0, d);
  for (let i = 0; i + 3 < p.length; i += 2) {
    const sx = p[i + 2] - p[i];
    const sz = p[i + 3] - p[i + 1];
    const l = dhypot(sx, sz);
    if (left <= l || i + 4 >= p.length - 1) {
      const f = l > 0 ? Math.min(1, left / l) : 0;
      return { x: p[i] + sx * f, z: p[i + 1] + sz * f, dx: l > 0 ? sx / l : 1, dz: l > 0 ? sz / l : 0 };
    }
    left -= l;
  }
  return { x: p[0] ?? 0, z: p[1] ?? 0, dx: 1, dz: 0 };
}

const byId = new Map(WAYS.map((w) => [w.id, w]));
/** A way by its id (they are fixed). */
export const wayOf = (id: string): Way => byId.get(id) as Way;

/** How far out along the Tyre lane the city's horizon is: the gulf's mouth, where her sail first shows from your quay. */
export const HORIZON_ALONG = lineLength(GULF.flatMap(([lon, lat]) => project(lon, lat))) + 0.6;

/** How far out along a road your map's edge is: where a caravan steps off the table's road into your city. */
export const EDGE_ALONG = 0.9;
