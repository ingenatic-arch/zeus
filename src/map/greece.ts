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

/** The cities of Greece, in the order the world record keeps them: yours first, then the four with rulers, then Tyre. */
export type CityId = 'home' | 'athens' | 'sparta' | 'corinth' | 'troy' | 'tyre';
export const CITY_IDS: readonly CityId[] = ['home', 'athens', 'sparta', 'corinth', 'troy', 'tyre'];
/** The cities with a ruler (yours and Tyre have none to deal with). */
export const RULED: readonly CityId[] = ['athens', 'sparta', 'corinth', 'troy'];

/** The table's extent in longitude and latitude. */
export const LON0 = 20.0;
export const LON1 = 29.0;
export const LAT0 = 34.7;
export const LAT1 = 41.2;
/** Table units per degree of latitude. */
export const DEG = 20;
const COS = Math.cos((38.5 * Math.PI) / 180);
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
};

/** A road over the land or a lane over the sea, between your city and another, as lon, lat points from yours to theirs. */
export interface Way {
  id: string;
  /** The city at the far end. */
  to: CityId;
  kind: 'land' | 'sea';
  pts: ReadonlyArray<readonly [number, number]>;
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
  { id: 'athens-land', to: 'athens', kind: 'land', pts: [...TO_CORINTH, ...CORINTH_ATHENS.slice(1)] },
];

/** Roads between the other cities (drawn on the table; Athens' caravans come by the first). */
export const OTHER_ROADS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  CORINTH_ATHENS,
  // Corinth to Sparta, through Arcadia.
  [[22.88, 37.91], [22.62, 37.78], [22.42, 37.4]],
];

/** A way's points on the table (x, z pairs), from your city out. */
export function wayPoints(w: Way): number[] {
  return w.pts.flatMap(([lon, lat]) => project(lon, lat));
}

/** A polyline's length (x, z pairs). */
export function lineLength(p: readonly number[]): number {
  let l = 0;
  for (let i = 0; i + 3 < p.length; i += 2) l += Math.hypot(p[i + 2] - p[i], p[i + 3] - p[i + 1]);
  return l;
}

/** The point a distance along a polyline (clamped to its ends), and the way it runs there (a unit vector). */
export function alongLine(p: readonly number[], d: number): { x: number; z: number; dx: number; dz: number } {
  let left = Math.max(0, d);
  for (let i = 0; i + 3 < p.length; i += 2) {
    const sx = p[i + 2] - p[i];
    const sz = p[i + 3] - p[i + 1];
    const l = Math.hypot(sx, sz);
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
