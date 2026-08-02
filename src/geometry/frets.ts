// True multiscale (fanned-fret) geometry.
//
// Each fret's distance from the nut is computed independently per side using
// standard equal-temperament fret spacing:
//
//   distance(n) = scaleLength * (1 - 2^(-n/12))
//
// The bass and treble edges are NOT parallel: they use different scale
// lengths, so a straight fret line rotated from a normal fretboard would be
// wrong. Instead we compute each side's fret distance independently, then
// connect the two resulting points to form the true fanned fret line.
//
// The "neutral fret" is the one fret where the bass and treble fret points
// share the same longitudinal (x) position — i.e. that fret is perpendicular
// to the neck centerline, like a single-scale guitar's would be. We achieve
// this by offsetting the treble-side nut position along x so that at the
// neutral fret, both sides land on the same x.

import type { FretPoint, Point } from './types';
import type { NeckParams } from './neckParams';

/** Standard equal-temperament distance from the nut for fret n on a given scale length. */
export function fretDistanceFromNut(scaleLength: number, fretNumber: number): number {
  return scaleLength * (1 - Math.pow(2, -fretNumber / 12));
}

/**
 * Width of the neck (nut-to-heel taper) at longitudinal position x. The taper
 * line extends past the heel so a fretboard overhang (frets beyond neckLength)
 * keeps its edges collinear with the rest of the board.
 */
function neckWidthAt(x: number, params: NeckParams): number {
  const t = Math.max(0, x / params.neckLength);
  return params.nutWidth + (params.heelWidth - params.nutWidth) * t;
}

/**
 * Compute all fret points (nut through fretCount) in neck-local coordinates:
 * x = 0 at the bass-side nut point, increasing toward the bridge; y = 0 on
 * the neck centerline, +y = bass side, -y = treble side.
 */
export function computeFanFrets(params: NeckParams): FretPoint[] {
  const { bassScale, trebleScale, neutralFret, fretCount } = params;

  // Longitudinal offset applied to the treble side so the neutral fret aligns
  // with the bass side at the same x (i.e. becomes perpendicular).
  const bassAtNeutral = fretDistanceFromNut(bassScale, neutralFret);
  const trebleAtNeutral = fretDistanceFromNut(trebleScale, neutralFret);
  const trebleOffsetX = bassAtNeutral - trebleAtNeutral;

  const points: FretPoint[] = [];
  for (let n = 0; n <= fretCount; n++) {
    const bassDistance = fretDistanceFromNut(bassScale, n);
    const trebleDistance = fretDistanceFromNut(trebleScale, n);

    const bassX = bassDistance;
    const trebleX = trebleOffsetX + trebleDistance;

    const bassPoint: Point = { x: bassX, y: neckWidthAt(bassX, params) / 2 };
    const treblePoint: Point = { x: trebleX, y: -neckWidthAt(trebleX, params) / 2 };

    points.push({ fretNumber: n, bassDistance, trebleDistance, bassPoint, treblePoint });
  }
  return points;
}

/** Convenience: x-position of the bridge on each side, in the same neck-local frame as computeFanFrets. */
export function computeBridgeX(params: NeckParams): { bassBridgeX: number; trebleBridgeX: number } {
  const bassAtNeutral = fretDistanceFromNut(params.bassScale, params.neutralFret);
  const trebleAtNeutral = fretDistanceFromNut(params.trebleScale, params.neutralFret);
  const trebleOffsetX = bassAtNeutral - trebleAtNeutral;
  return {
    bassBridgeX: params.bassScale,
    trebleBridgeX: trebleOffsetX + params.trebleScale,
  };
}

// --- Fan-line helpers -------------------------------------------------------
//
// Every "musical" transverse line on a fanned board (nut, each fret, bridge)
// is a fan line: for bass-side x, its treble-side x is
//   trebleFanOffset + (trebleScale / bassScale) * x
// (exact — substitute the fret-distance formula to verify). The nut, the
// fretboard/heel end, nut string slots, and pocket edges must all lie on fan
// lines or they visibly disagree with the fret angles.

/** Treble-side x of the nut (fret 0) — the fan's longitudinal offset. Zero when scales match. */
export function trebleFanOffset(params: NeckParams): number {
  return (
    fretDistanceFromNut(params.bassScale, params.neutralFret) -
    fretDistanceFromNut(params.trebleScale, params.neutralFret)
  );
}

/** Treble-side x on the fan line whose bass-side x is `bassX`. */
export function fanTrebleX(params: NeckParams, bassX: number): number {
  return trebleFanOffset(params) + (params.trebleScale / params.bassScale) * bassX;
}

/** X at cross position y on the fan line through bass-side `bassX`, spanning y = ±halfWidth. */
export function fanLineX(params: NeckParams, bassX: number, y: number, halfWidth: number): number {
  if (halfWidth <= 0) return bassX;
  const t = (halfWidth - y) / (2 * halfWidth);
  return bassX + (fanTrebleX(params, bassX) - bassX) * t;
}

/** Board continues this far past the last fret, mm. */
const FRETBOARD_END_MARGIN = 5;

/**
 * Bass-side x where the fretboard ends: the heel, or just past the last fret
 * when the fret count runs beyond the heel (the classic overhang over the body).
 */
export function fretboardEndX(params: NeckParams): number {
  const lastFret = fretDistanceFromNut(params.bassScale, params.fretCount);
  return Math.max(params.neckLength, lastFret + FRETBOARD_END_MARGIN);
}

/**
 * Neck outline in neck-local space — the nut edge and board end follow the
 * fret fan, and the board extends past the heel when frets overhang it.
 */
export function computeNeckOutlineLocal(params: NeckParams): Point[] {
  const endBassX = fretboardEndX(params);
  const endTrebleX = fanTrebleX(params, endBassX);
  const nutTrebleX = trebleFanOffset(params);
  // Each edge corner sits on the taper locus y = ±width(x)/2 at its own x, so
  // fret endpoints (which use the same locus) land exactly on the edges.
  return [
    { x: 0, y: params.nutWidth / 2 },
    { x: endBassX, y: neckWidthAt(endBassX, params) / 2 },
    { x: endTrebleX, y: -neckWidthAt(endTrebleX, params) / 2 },
    { x: nutTrebleX, y: -neckWidthAt(nutTrebleX, params) / 2 },
  ];
}

// --- Inlays -----------------------------------------------------------------

export interface InlayDot {
  fret: number;
  /** Center in neck-local coordinates. */
  x: number;
  y: number;
  radius: number;
}

const INLAY_FRETS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24, 27];

/**
 * Standard dot inlays, centered between fret n−1 and fret n on the fan line
 * through that midpoint. Octave frets (12, 24) get double dots.
 */
export function computeInlayDots(params: NeckParams): InlayDot[] {
  const dots: InlayDot[] = [];
  for (const n of INLAY_FRETS) {
    if (n > params.fretCount) break;
    const bassMid =
      (fretDistanceFromNut(params.bassScale, n - 1) + fretDistanceFromNut(params.bassScale, n)) / 2;
    const half = neckWidthAt(bassMid, params) / 2;
    // Dots shrink slightly up the neck as the fret gaps tighten.
    const gap = fretDistanceFromNut(params.bassScale, n) - fretDistanceFromNut(params.bassScale, n - 1);
    const radius = Math.min(3, gap * 0.18);
    if (n % 12 === 0) {
      for (const y of [half * 0.42, -half * 0.42]) {
        dots.push({ fret: n, x: fanLineX(params, bassMid, y, half), y, radius });
      }
    } else {
      dots.push({ fret: n, x: fanLineX(params, bassMid, 0, half), y: 0, radius });
    }
  }
  return dots;
}
