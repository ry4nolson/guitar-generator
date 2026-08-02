// The generic per-feature curve engine that replaces the old single
// "universal Catmull-Rom tangent + radius-scaled handle length" formula.
//
// Instead of one shared formula for every anchor, each anchor is authored as
// an AnchorSpec that independently declares its own continuity mode and
// (for non-'smooth' modes) explicit in/out tangent directions and handle
// lengths. This is what lets templates give very different regions very
// different curve character — e.g. Flying V's wing tips are genuine sharp
// corners while Tele/Strat use smooth flowing curves throughout — without
// any region silently influencing another the way a single shared tangent
// formula could.
//
// Continuity modes:
//   - 'corner':  handleIn/handleOut point in independently authored
//                directions. If those directions are NOT opposite, the
//                curve has a real tangent discontinuity (a kink/corner).
//                If they ARE opposite (e.g. both pointing along the same
//                line as the previous/next anchor), the result renders as a
//                perfectly straight edge.
//   - 'tangent': handleIn/handleOut are forced collinear (tangent-continuous,
//                "C1"), using an authored angle, but their LENGTHS are
//                independently authored — this is the classic "smooth point
//                with adjustable handle lengths" found in vector editors.
//   - 'smooth':  collinear like 'tangent', but the angle is auto-derived
//                from the neighboring anchors' positions (Catmull-Rom-style)
//                rather than authored — an approximation of curvature
//                continuity ("C2-like") for regions that should just flow.
//
// Every handle length is clamped to at most 90% of the distance to the
// relevant neighbor, regardless of mode — this is a hard invariant that
// prevents the class of self-intersection bug seen in the original
// implementation (a handle overshooting past the anchor it's steering
// toward), for every anchor, uniformly, by construction.

import type { BodyAnchor, ContinuityMode, Point } from './types';
import type { BodyFeatureId } from './bodyFeatures';

export interface AnchorSpec {
  id: string;
  featureId: BodyFeatureId;
  position: Point;
  continuity: ContinuityMode;
  /** Direction (degrees, 0 = +x) the curve travels in as it arrives at this anchor's handleIn. Required for 'corner'/'tangent'; ignored for 'smooth'. */
  inAngleDeg?: number;
  /** Direction (degrees, 0 = +x) the curve travels in as it leaves this anchor's handleOut. Required for 'corner'/'tangent' (and 'tangent' defaults inAngleDeg to outAngleDeg+180 if omitted). */
  outAngleDeg?: number;
  inLength: number;
  outLength: number;
}

function dirFromAngle(deg: number): Point {
  const rad = (deg * Math.PI) / 180;
  return { x: Math.cos(rad), y: Math.sin(rad) };
}

function angleBetween(from: Point, to: Point): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

/** Clamp a handle length so it can never overshoot past the neighboring anchor it's steering toward. */
function clampHandleLength(length: number, distanceToNeighbor: number): number {
  return Math.min(Math.max(length, 0), distanceToNeighbor * 0.9);
}

/** Rotate/shear a point to apply the "forward lean" stance. Shared across all templates. */
export function applyForwardLean(p: Point, leanDeg: number, pivot: Point): Point {
  const rad = (leanDeg * Math.PI) / 180;
  const dx = p.x - pivot.x;
  const dy = p.y - pivot.y;
  return {
    x: pivot.x + dx * Math.cos(rad) - dy * Math.sin(rad) * 0.15,
    y: pivot.y + dy + dx * Math.sin(rad) * 0.35,
  };
}

/**
 * Builds the full closed-loop anchor set (positions + handles) from an
 * ordered array of AnchorSpecs. `manuallyEdited`/`locked` default to false —
 * callers (the store) are responsible for merging in any preserved
 * user-edited anchors afterward.
 */
export function buildAnchorsFromSpecs(specs: AnchorSpec[]): BodyAnchor[] {
  const n = specs.length;
  if (n < 3) throw new Error('A body template needs at least 3 anchors to form a closed loop.');

  return specs.map((spec, i) => {
    const prev = specs[(i - 1 + n) % n].position;
    const next = specs[(i + 1) % n].position;
    const distIn = Math.hypot(spec.position.x - prev.x, spec.position.y - prev.y);
    const distOut = Math.hypot(next.x - spec.position.x, next.y - spec.position.y);

    let inAngle: number;
    let outAngle: number;

    if (spec.continuity === 'smooth') {
      // Catmull-Rom-style: the tangent line through this anchor runs in the
      // direction from the previous anchor to the next one; both handles
      // sit on that line (collinear), approximating curvature continuity.
      const tangentAngle = angleBetween(prev, next);
      outAngle = tangentAngle;
      inAngle = tangentAngle + 180;
    } else if (spec.continuity === 'tangent') {
      outAngle = spec.outAngleDeg ?? 0;
      inAngle = spec.inAngleDeg ?? outAngle + 180;
    } else {
      // 'corner': fully independent authored directions.
      outAngle = spec.outAngleDeg ?? 0;
      inAngle = spec.inAngleDeg ?? outAngle + 180;
    }

    const inLen = clampHandleLength(spec.inLength, distIn);
    const outLen = clampHandleLength(spec.outLength, distOut);
    const inDir = dirFromAngle(inAngle);
    const outDir = dirFromAngle(outAngle);

    return {
      id: spec.id,
      featureId: spec.featureId,
      continuity: spec.continuity,
      position: spec.position,
      handleIn: { x: spec.position.x + inDir.x * inLen, y: spec.position.y + inDir.y * inLen },
      handleOut: { x: spec.position.x + outDir.x * outLen, y: spec.position.y + outDir.y * outLen },
      manuallyEdited: false,
      locked: false,
      mirrorHandles: spec.continuity !== 'corner',
    };
  });
}

/** Convenience for templates authoring 'corner'-mode straight edges: the exact angle from one resolved point to another. */
export { angleBetween };
