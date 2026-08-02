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

/** Width of the neck (nut-to-heel taper) at longitudinal position x, given neck length. */
function neckWidthAt(x: number, params: NeckParams): number {
  const t = Math.max(0, Math.min(1, x / params.neckLength));
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
