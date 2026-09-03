// Traced headstock silhouettes.
//
// Each preset is our own G1 cubic loop fitted (≤ ~1.3 mm) to a sampled
// reference outline of the classic shape. Anchors sit on the drawing's feature
// points; handles were solved by least squares against the sampled curve.
// Proportions were measured from the outline drawings in Wikimedia Commons'
// "Guitar headstock outlines" category (GreyCat, CC BY-SA 3.0).
//
// Frame: normalised by nut→tip length. `d` runs 0 (nut face) → 1 (tip);
// `y` is bass (+) / treble (−) in the same unit. Loop order is nut-bass →
// bass flank → tip → treble flank → nut-treble (the nut face closes it).

import type { HeadstockAnchor } from './headstock';

/** [d, y, handleIn.d, handleIn.y, handleOut.d, handleOut.y, corner(0|1)] */
type TracedAnchor = [number, number, number, number, number, number, 0 | 1];

export interface TracedHead {
  /** Overall width ÷ nut→tip length of the reference. */
  widthRatio: number;
  /** Nut width ÷ nut→tip length of the reference. */
  nutRatio: number;
  anchors: TracedAnchor[];
}

export const TRACED_HEADS = {
  /** Fender Strat-style: angled straight tuner edge, treble-side bulb, scoop + bump. */
  strat: {
    widthRatio: 0.5325,
    nutRatio: 0.2439,
    anchors: [
      [0, 0.122, 0, 0.102, 0.0794, 0.1163, 1],
      [0.1778, 0.2032, 0.1347, 0.2067, 0.2231, 0.1996, 0],
      [0.9501, -0.0909, 0.8787, -0.0555, 0.9833, -0.1074, 0],
      [1, -0.1845, 1, -0.1492, 1, -0.258, 0],
      [0.8656, -0.3292, 0.941, -0.3275, 0.7415, -0.3322, 0],
      [0.7078, -0.2125, 0.7611, -0.234, 0.6558, -0.1914, 0],
      [0.2716, -0.256, 0.316, -0.284, 0.2258, -0.2271, 0],
      [0.1068, -0.1232, 0.2336, -0.1516, 0.0752, -0.1161, 0],
      [0, -0.1216, 0.0323, -0.1212, 0, -0.1016, 1],
    ],
  },
  /** Fender Tele-style: slimmer head, hooked tip, gentler scoop. */
  tele: {
    widthRatio: 0.4533,
    nutRatio: 0.2457,
    anchors: [
      [0, 0.1229, 0, 0.1029, 0.0284, 0.1193, 1],
      [0.0682, 0.1522, 0.0505, 0.1301, 0.084, 0.172, 0],
      [0.1355, 0.2034, 0.1062, 0.2047, 0.1595, 0.2023, 0],
      [0.9552, -0.0473, 0.9142, -0.0277, 0.9792, -0.0588, 0],
      [0.9999, -0.1281, 1.0025, -0.1018, 0.9928, -0.2017, 0],
      [0.8476, -0.2483, 0.9219, -0.2586, 0.7767, -0.2386, 0],
      [0.7124, -0.1806, 0.7503, -0.1848, 0.6725, -0.1762, 0],
      [0.5059, -0.2348, 0.5863, -0.24, 0.3641, -0.2257, 0],
      [0.0939, -0.118, 0.2304, -0.1304, 0.0628, -0.1152, 0],
      [0, -0.1227, 0.0309, -0.1193, 0, -0.1027, 1],
    ],
  },
  /**
   * Gibson-style open book: flared trapezoid, sharp ear tips, two crown humps
   * meeting at a shallow centre notch. Bass side traced, treble side mirrored.
   */
  openBook: {
    widthRatio: 0.461,
    nutRatio: 0.24,
    anchors: [
      [0, 0.12, 0, 0.1, 0.0626, 0.1313, 1],
      [0.178, 0.1969, 0.1296, 0.1558, 0.4309, 0.1739, 1],
      [0.9516, 0.2305, 0.7006, 0.1929, 0.9487, 0.1801, 1],
      [0.9837, 0.085, 0.9534, 0.1271, 0.9936, 0.0713, 0],
      [1, 0.0406, 1, 0.0579, 1, 0.0255, 0],
      [0.9869, 0, 0.9952, 0.0134, 0.9952, -0.0134, 1],
      [1, -0.0406, 1, -0.0255, 1, -0.0579, 0],
      [0.9837, -0.085, 0.9936, -0.0713, 0.9534, -0.1271, 0],
      [0.9516, -0.2305, 0.9487, -0.1801, 0.7006, -0.1929, 1],
      [0.178, -0.1969, 0.4309, -0.1739, 0.1296, -0.1558, 1],
      [0, -0.12, 0.0626, -0.1313, 0, -0.1, 1],
    ],
  },
  /** Superstrat shark fin: straight tuner edge, slanted end, treble-side point. */
  sharkFin: {
    widthRatio: 0.4187,
    nutRatio: 0.2243,
    anchors: [
      [0, 0.1122, 0, 0.0922, 0.0631, 0.108, 1],
      [0.126, 0.201, 0.0968, 0.1539, 0.3942, 0.1286, 1],
      [0.9304, -0.0163, 0.6623, 0.0562, 0.9164, -0.1131, 1],
      [0.9953, -0.1676, 0.9421, -0.1005, 1.0062, -0.1814, 0],
      [0.9838, -0.1939, 0.9962, -0.1882, 0.6884, -0.1857, 1],
      [0.1894, -0.2177, 0.488, -0.1497, 0.1416, -0.1666, 1],
      [0.0001, -0.1122, 0.0718, -0.117, 0.0001, -0.0922, 1],
    ],
  },
  /** Metal pointy: hooked bass shoulder, long straight tuner edge, treble-side spike. */
  pointy: {
    widthRatio: 0.7249,
    nutRatio: 0.2319,
    anchors: [
      [0.0004, 0.116, 0.0004, 0.096, 0.0974, 0.1044, 1],
      [0.2222, 0.2549, 0.1763, 0.1774, 0.2877, 0.22, 1],
      [0.8675, -0.1656, 0.842, -0.1354, 0.8779, -0.1779, 0],
      [0.9993, -0.4483, 0.9933, -0.4268, 1.0046, -0.4678, 0],
      [0.9692, -0.4674, 0.9842, -0.4741, 0.6289, -0.3158, 0],
      [-0.0004, -0.116, 0.4082, -0.1265, -0.0004, -0.096, 1],
    ],
  },
} satisfies Record<string, TracedHead>;

export type TracedHeadId = keyof typeof TRACED_HEADS;

/** Fraction of the length over which the nut-width correction fades out. */
const NUT_BLEND = 0.3;

/**
 * Scale a traced head to `length` (nut→tip) and `width` (widest point), in mm,
 * and blend the nut end onto the real nut width. Returns neck-local anchors
 * (x = −d, +y = bass); the caller glues/locks the first and last as nut corners.
 */
export function tracedHeadAnchors(
  head: TracedHead,
  length: number,
  width: number,
  nutHalf: number,
): HeadstockAnchor[] {
  const sy = width / head.widthRatio; // mm per unit of y
  const drawnNutHalf = (head.nutRatio / 2) * sy;
  const delta = nutHalf - drawnNutHalf;
  const map = (d: number, y: number) => {
    const fade = Math.max(0, 1 - d / NUT_BLEND);
    const yy = y * sy + Math.sign(y) * delta * fade;
    return { x: -d * length, y: yy };
  };
  const last = head.anchors.length - 1;
  return head.anchors.map(([d, y, id, iy, od, oy, corner], i) => ({
    id: `hs-${i}`,
    position: map(d, y),
    handleIn: map(id, iy),
    handleOut: map(od, oy),
    locked: i === 0 || i === last,
    manuallyEdited: false,
    mirrorHandles: corner === 0,
  }));
}
