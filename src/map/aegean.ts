/**
 * The Aegean's shape for the tabletop map, as authored data: coast outlines
 * (longitude, latitude), small islands as blobs, and the mountains as ridges.
 * Hand-traced and simplified, to be tuned by eye; only the map view reads it
 * (relief.ts turns it into a height field), so the city's first load never
 * carries it.
 */

/** A coast outline, as [lon, lat] points (either way round). */
export type Outline = ReadonlyArray<readonly [number, number]>;

/**
 * Mainland Greece with the Peloponnese (joined at the Isthmus of Corinth),
 * traced from off the table's north-west corner down the Ionian coast, along
 * the Gulf of Corinth's north shore to the isthmus and back along its south
 * shore, round the Peloponnese's three fingers and the Argolid, up past
 * Attica, Thessaly, Chalkidiki and Thrace to the Dardanelles, and back over
 * the top.
 */
const MAINLAND: Outline = [
  [19.4, 41.7], [19.4, 39.85], [20.05, 39.68], [20.2, 39.45], [20.42, 39.27], [20.68, 39.1], [20.76, 38.96],
  [20.7, 38.82], [20.64, 38.64], [20.84, 38.66], [21.08, 38.54], [21.14, 38.38], [21.4, 38.32], [21.62, 38.36], [21.78, 38.335],
  // The Gulf of Corinth's north shore, east to the isthmus.
  [22.0, 38.39], [22.3, 38.37], [22.42, 38.43], [22.6, 38.35], [22.85, 38.24], [23.05, 38.19], [23.2, 38.12], [23.15, 38.02], [22.98, 37.965],
  // …and its south shore, west to Rio.
  [22.89, 37.94], [22.7, 38.0], [22.42, 38.1], [22.15, 38.21], [21.95, 38.27], [21.79, 38.305],
  // The Peloponnese's west coast.
  [21.73, 38.25], [21.47, 38.2], [21.38, 38.05], [21.12, 37.93], [21.25, 37.76], [21.36, 37.6], [21.62, 37.36], [21.68, 37.2], [21.6, 37.0], [21.68, 36.9], [21.7, 36.8],
  // The Messenian Gulf, Cape Tainaron, the Laconian Gulf, Cape Maleas.
  [21.88, 36.72], [21.95, 36.85], [22.05, 36.98], [22.12, 37.03], [22.24, 36.9], [22.37, 36.66], [22.48, 36.38], [22.53, 36.56], [22.56, 36.75],
  [22.7, 36.8], [22.86, 36.68], [23.02, 36.5], [23.19, 36.43], [23.1, 36.6], [23.05, 36.75], [22.98, 36.95], [22.88, 37.15],
  // The Argolic Gulf: its west shore, the head (your city), Nafplio, and out round the Argolid.
  [22.77, 37.35], [22.71, 37.5], [22.72, 37.585], [22.78, 37.595], [22.83, 37.56], [22.9, 37.5], [23.05, 37.43], [23.15, 37.32],
  [23.3, 37.34], [23.49, 37.42], [23.45, 37.52], [23.3, 37.58], [23.15, 37.65], [23.12, 37.78], [23.02, 37.86], [23.0, 37.91],
  // The Saronic Gulf's north shore, Attica, the Euboean channel.
  [23.15, 37.95], [23.35, 37.98], [23.5, 38.03], [23.6, 37.95], [23.7, 37.88], [23.8, 37.78], [23.95, 37.7], [24.02, 37.65], [24.07, 37.75],
  [24.02, 37.9], [24.03, 38.05], [23.9, 38.25], [23.75, 38.33], [23.58, 38.44], [23.3, 38.58], [23.05, 38.73], [22.8, 38.84], [22.6, 38.9],
  // Thessaly, Pelion, Olympus, Thessaloniki.
  [22.85, 39.0], [22.95, 39.2], [22.95, 39.36], [23.1, 39.3], [23.25, 39.13], [23.35, 39.2], [23.2, 39.45], [22.95, 39.62], [22.7, 39.9],
  [22.6, 40.2], [22.6, 40.45], [22.9, 40.62],
  // Chalkidiki's three fingers.
  [22.95, 40.45], [23.25, 40.28], [23.35, 39.97], [23.55, 40.1], [23.45, 40.22], [23.65, 40.25], [23.8, 39.97], [23.95, 40.2], [24.15, 40.3],
  [24.4, 40.12], [24.3, 40.32], [23.9, 40.5], [23.85, 40.75],
  // Thrace to the Dardanelles.
  [24.15, 40.85], [24.4, 40.93], [24.8, 40.88], [25.2, 40.95], [25.6, 40.88], [25.9, 40.84], [26.05, 40.72], [26.25, 40.6], [26.5, 40.36],
  [26.18, 40.05], [26.35, 40.16], [26.55, 40.34], [26.68, 40.45], [27.0, 40.62], [27.5, 40.97], [28.0, 41.0], [29.6, 41.05], [29.6, 41.7],
];

/** Asia Minor: from the Sea of Marmara down past Troy, Lesbos, Smyrna and Miletus to Caria. */
const ASIA: Outline = [
  [29.6, 40.95], [29.0, 40.4], [28.4, 40.38], [27.97, 40.35], [27.85, 40.5], [27.6, 40.45], [27.3, 40.4], [26.9, 40.38], [26.68, 40.33], [26.41, 40.15],
  [26.19, 40.0], [26.15, 39.8], [26.08, 39.48], [26.35, 39.47], [26.6, 39.55], [26.95, 39.58], [26.7, 39.35], [26.88, 39.05], [26.75, 38.75],
  [26.95, 38.55], [27.15, 38.42], [26.8, 38.45], [26.6, 38.65], [26.4, 38.6], [26.38, 38.3], [26.75, 38.2], [26.85, 38.0], [27.25, 37.85],
  [27.2, 37.6], [27.3, 37.4], [27.6, 37.3], [27.45, 37.06], [27.25, 37.0], [27.7, 37.05], [28.05, 37.05], [27.8, 36.86], [27.4, 36.7], [27.9, 36.74],
  [28.25, 36.82], [28.6, 36.75], [29.1, 36.65], [29.6, 36.55],
];

const EUBOEA: Outline = [
  [22.83, 38.83], [23.05, 39.02], [23.3, 39.02], [23.55, 38.82], [24.1, 38.65], [24.35, 38.45], [24.62, 38.15], [24.55, 37.97], [24.3, 38.08],
  [24.08, 38.2], [23.8, 38.37], [23.63, 38.48], [23.35, 38.63], [23.05, 38.79],
];

const CRETE: Outline = [
  [23.52, 35.56], [23.75, 35.6], [24.1, 35.58], [24.3, 35.36], [24.8, 35.42], [25.15, 35.34], [25.6, 35.31], [25.75, 35.17], [26.15, 35.3],
  [26.32, 35.25], [26.2, 35.0], [25.8, 34.98], [25.0, 34.93], [24.7, 35.08], [24.2, 35.2], [23.8, 35.24], [23.55, 35.27],
];

export const OUTLINES: readonly Outline[] = [MAINLAND, ASIA, EUBOEA, CRETE];

/** A small island: its centre, half its size each way (degrees), and a turn (radians, anticlockwise from east). */
export interface Isle {
  name: string;
  lon: number;
  lat: number;
  rx: number;
  ry: number;
  turn?: number;
}

export const ISLES: readonly Isle[] = [
  // The Ionian islands.
  { name: 'Kefalonia', lon: 20.55, lat: 38.24, rx: 0.2, ry: 0.15, turn: 0.6 },
  { name: 'Ithaca', lon: 20.7, lat: 38.4, rx: 0.04, ry: 0.08 },
  { name: 'Zakynthos', lon: 20.82, lat: 37.78, rx: 0.12, ry: 0.11, turn: 0.5 },
  // The Saronic Gulf and Kythera.
  { name: 'Salamis', lon: 23.47, lat: 37.93, rx: 0.07, ry: 0.04 },
  { name: 'Aegina', lon: 23.49, lat: 37.73, rx: 0.06, ry: 0.05 },
  { name: 'Hydra', lon: 23.47, lat: 37.33, rx: 0.08, ry: 0.025, turn: 0.15 },
  { name: 'Kythera', lon: 22.99, lat: 36.25, rx: 0.06, ry: 0.11 },
  // The Cyclades.
  { name: 'Kea', lon: 24.33, lat: 37.62, rx: 0.05, ry: 0.07 },
  { name: 'Kythnos', lon: 24.42, lat: 37.4, rx: 0.04, ry: 0.07 },
  { name: 'Andros', lon: 24.85, lat: 37.84, rx: 0.15, ry: 0.06, turn: -0.75 },
  { name: 'Tinos', lon: 25.13, lat: 37.6, rx: 0.1, ry: 0.045, turn: -0.5 },
  { name: 'Mykonos', lon: 25.35, lat: 37.45, rx: 0.07, ry: 0.04 },
  { name: 'Syros', lon: 24.92, lat: 37.43, rx: 0.04, ry: 0.06 },
  { name: 'Serifos', lon: 24.48, lat: 37.15, rx: 0.05, ry: 0.05 },
  { name: 'Sifnos', lon: 24.7, lat: 36.98, rx: 0.04, ry: 0.06 },
  { name: 'Milos', lon: 24.42, lat: 36.7, rx: 0.12, ry: 0.06 },
  { name: 'Paros', lon: 25.15, lat: 37.05, rx: 0.08, ry: 0.07 },
  { name: 'Naxos', lon: 25.48, lat: 37.05, rx: 0.1, ry: 0.13 },
  { name: 'Ios', lon: 25.32, lat: 36.72, rx: 0.06, ry: 0.04 },
  { name: 'Amorgos', lon: 25.85, lat: 36.83, rx: 0.12, ry: 0.035, turn: 0.5 },
  { name: 'Thera', lon: 25.43, lat: 36.4, rx: 0.045, ry: 0.07 },
  { name: 'Anafi', lon: 25.77, lat: 36.36, rx: 0.04, ry: 0.03 },
  // The Dodecanese.
  { name: 'Astypalaia', lon: 26.35, lat: 36.58, rx: 0.08, ry: 0.04 },
  { name: 'Kalymnos', lon: 26.98, lat: 37.0, rx: 0.05, ry: 0.05 },
  { name: 'Leros', lon: 26.85, lat: 37.15, rx: 0.03, ry: 0.04 },
  { name: 'Patmos', lon: 26.55, lat: 37.32, rx: 0.03, ry: 0.04 },
  { name: 'Kos', lon: 27.15, lat: 36.84, rx: 0.17, ry: 0.05, turn: 0.2 },
  { name: 'Rhodes', lon: 27.98, lat: 36.18, rx: 0.3, ry: 0.13, turn: 0.85 },
  { name: 'Karpathos', lon: 27.15, lat: 35.6, rx: 0.06, ry: 0.2 },
  { name: 'Kasos', lon: 26.92, lat: 35.4, rx: 0.04, ry: 0.03 },
  // The eastern Aegean.
  { name: 'Ikaria', lon: 26.15, lat: 37.6, rx: 0.17, ry: 0.05, turn: -0.3 },
  { name: 'Samos', lon: 26.8, lat: 37.73, rx: 0.22, ry: 0.07 },
  { name: 'Chios', lon: 26.0, lat: 38.4, rx: 0.1, ry: 0.18 },
  { name: 'Psara', lon: 25.57, lat: 38.55, rx: 0.03, ry: 0.03 },
  { name: 'Lesbos', lon: 26.25, lat: 39.17, rx: 0.32, ry: 0.17 },
  { name: 'Lemnos', lon: 25.25, lat: 39.9, rx: 0.2, ry: 0.1 },
  { name: 'Imbros', lon: 25.85, lat: 40.17, rx: 0.13, ry: 0.06 },
  { name: 'Tenedos', lon: 26.03, lat: 39.82, rx: 0.04, ry: 0.03 },
  { name: 'Samothrace', lon: 25.55, lat: 40.46, rx: 0.1, ry: 0.05 },
  { name: 'Thasos', lon: 24.7, lat: 40.68, rx: 0.12, ry: 0.1 },
  // The Sporades.
  { name: 'Skiathos', lon: 23.47, lat: 39.17, rx: 0.06, ry: 0.03 },
  { name: 'Skopelos', lon: 23.7, lat: 39.12, rx: 0.08, ry: 0.04, turn: 0.3 },
  { name: 'Alonissos', lon: 23.88, lat: 39.17, rx: 0.08, ry: 0.03, turn: 0.4 },
  { name: 'Skyros', lon: 24.55, lat: 38.85, rx: 0.15, ry: 0.07, turn: -0.4 },
  // Tyre's island, at the table's south-east corner.
  { name: 'Tyre', lon: 28.72, lat: 34.95, rx: 0.07, ry: 0.05 },
];

/** A mountain ridge from a to b (a single peak if b is left out): its half-width in degrees and its height (table units). */
export interface Ridge {
  a: readonly [number, number];
  b?: readonly [number, number];
  w: number;
  h: number;
}

export const RIDGES: readonly Ridge[] = [
  // Epirus, the Pindus and Thessaly.
  { a: [20.9, 40.5], b: [21.45, 39.45], w: 0.32, h: 3.0 },
  { a: [21.45, 39.45], b: [21.85, 38.8], w: 0.28, h: 2.6 },
  { a: [20.5, 39.9], b: [20.8, 39.4], w: 0.15, h: 1.8 },
  { a: [22.35, 40.08], w: 0.17, h: 4.6 },
  { a: [22.65, 39.78], w: 0.09, h: 2.0 },
  { a: [23.05, 39.38], w: 0.08, h: 1.7 },
  { a: [22.35, 39.06], w: 0.18, h: 1.6 },
  { a: [22.0, 40.6], b: [22.15, 40.2], w: 0.2, h: 2.6 },
  // Central Greece and Attica.
  { a: [22.55, 38.53], w: 0.14, h: 3.0 },
  { a: [22.2, 38.66], w: 0.18, h: 2.7 },
  { a: [21.6, 38.65], b: [22.0, 38.55], w: 0.18, h: 2.2 },
  { a: [22.85, 38.36], w: 0.11, h: 1.9 },
  { a: [23.35, 38.17], b: [23.75, 38.17], w: 0.09, h: 1.5 },
  { a: [23.84, 38.05], w: 0.06, h: 1.0 },
  { a: [23.78, 37.92], w: 0.04, h: 0.8 },
  { a: [23.1, 38.03], w: 0.07, h: 1.1 },
  // The Peloponnese.
  { a: [22.4, 37.95], w: 0.11, h: 2.9 },
  { a: [22.18, 37.96], w: 0.11, h: 2.6 },
  { a: [21.8, 37.95], w: 0.14, h: 2.5 },
  { a: [21.86, 38.18], w: 0.09, h: 2.0 },
  { a: [22.25, 37.55], w: 0.32, h: 1.7 },
  { a: [22.25, 37.66], w: 0.11, h: 2.3 },
  { a: [22.33, 37.18], b: [22.4, 36.6], w: 0.09, h: 3.3 },
  { a: [22.6, 37.35], b: [22.85, 36.9], w: 0.09, h: 2.4 },
  { a: [21.98, 37.45], w: 0.1, h: 2.0 },
  { a: [21.9, 37.15], w: 0.1, h: 1.2 },
  { a: [22.96, 37.66], w: 0.08, h: 1.4 },
  { a: [23.2, 37.48], w: 0.09, h: 1.0 },
  { a: [22.6, 37.75], w: 0.08, h: 1.3 },
  // Euboea.
  { a: [23.85, 38.62], w: 0.14, h: 2.2 },
  { a: [24.45, 38.07], w: 0.08, h: 1.6 },
  // Crete.
  { a: [24.05, 35.3], w: 0.14, h: 3.0 },
  { a: [24.8, 35.22], w: 0.14, h: 3.2 },
  { a: [25.5, 35.12], w: 0.13, h: 2.8 },
  { a: [25.95, 35.12], w: 0.09, h: 1.6 },
  // Asia Minor.
  { a: [26.85, 39.72], w: 0.24, h: 2.8 },
  { a: [26.5, 39.9], w: 0.22, h: 1.1 },
  { a: [27.3, 39.3], w: 0.3, h: 2.0 },
  { a: [27.4, 38.6], w: 0.2, h: 2.2 },
  { a: [28.0, 38.3], b: [28.6, 38.35], w: 0.2, h: 2.6 },
  { a: [27.2, 37.67], w: 0.07, h: 1.6 },
  { a: [27.55, 37.5], w: 0.1, h: 1.8 },
  { a: [27.8, 37.95], w: 0.15, h: 1.8 },
  { a: [28.4, 37.3], w: 0.4, h: 2.4 },
  { a: [29.2, 36.9], w: 0.4, h: 3.0 },
  { a: [28.6, 39.4], w: 0.8, h: 2.2 },
  { a: [29.2, 40.08], w: 0.2, h: 3.6 },
  // Thrace and Macedonia.
  { a: [24.5, 41.3], b: [25.6, 41.3], w: 0.3, h: 3.0 },
  { a: [24.05, 40.92], w: 0.1, h: 2.2 },
  { a: [24.33, 40.16], w: 0.05, h: 2.4 },
  { a: [23.4, 40.45], w: 0.2, h: 1.5 },
  { a: [26.4, 40.9], b: [27.2, 41.1], w: 0.3, h: 1.4 },
  // The islands.
  { a: [26.2, 39.2], w: 0.1, h: 1.3 },
  { a: [26.0, 38.45], w: 0.07, h: 1.4 },
  { a: [26.75, 37.73], w: 0.08, h: 1.6 },
  { a: [25.5, 37.05], w: 0.07, h: 1.3 },
  { a: [27.9, 36.15], w: 0.1, h: 1.4 },
  { a: [24.72, 40.68], w: 0.07, h: 1.5 },
  { a: [25.6, 40.45], w: 0.06, h: 2.0 },
  { a: [20.6, 38.2], w: 0.07, h: 2.0 },
  { a: [24.85, 37.85], w: 0.06, h: 1.2 },
  { a: [26.15, 37.6], w: 0.05, h: 1.3 },
  { a: [27.15, 35.6], w: 0.05, h: 1.4 },
];
