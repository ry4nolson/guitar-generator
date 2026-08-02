// Pure geometry: turns BodyParams into the 8 named anchors (+ Bezier handles)
// that define the closed body outline.
//
// Coordinate convention (body-local space, mm):
//   x = 0 at the neck joint, increasing toward the tail (max ~= bodyLength)
//   y = 0 on the centerline, positive = bass/upper-bout side (rendered as
//       screen "up" — see EditorCanvas's `scale(-1,-1)` stage flip), negative
//       = treble/cutaway/horn side (screen "down")
//
// The outline is a closed loop of 8 anchors, each connected to the next by a
// cubic Bezier segment. Segment i runs from anchor[i] to anchor[(i+1) % 8],
// using anchor[i].handleOut and anchor[(i+1)%8].handleIn as control points.
// "forwardLean" is applied as the very last step: it shears every point along
// x proportionally to y, tilting the whole silhouette without touching the
// per-region math above.
//
// Handle strategy: every anchor uses the SAME Catmull-Rom-style tangent +
// radius-scaled handle length (computeHandles below), with no per-anchor
// hand-tuned overrides. Handle length is always capped at a fraction of the
// distance to the relevant neighbor, so a handle can never overshoot past
// the anchor it's steering toward, which holds uniformly for every anchor
// including the concave hip cutout.

import type { BodyAnchor, BodyAnchorId, Point } from './types';
import { BODY_ANCHOR_IDS } from './types';
import type { BodyParams } from './bodyParams';

/** Rotate/shear a point to apply the "forward lean" stance. */
function applyForwardLean(p: Point, leanDeg: number, pivot: Point): Point {
  const rad = (leanDeg * Math.PI) / 180;
  // Small-angle shear around the pivot (neck joint) keeps the silhouette
  // proportions intact while visually "leaning" the body forward.
  const dx = p.x - pivot.x;
  const dy = p.y - pivot.y;
  return {
    x: pivot.x + dx * Math.cos(rad) - dy * Math.sin(rad) * 0.15,
    y: pivot.y + dy + dx * Math.sin(rad) * 0.35,
  };
}

/** Raw, un-leaned anchor positions derived directly from params. */
function computeRawPositions(p: BodyParams): Record<BodyAnchorId, Point> {
  const L = p.bodyLength;
  const W = p.bodyWidth;
  const halfW = W / 2;

  const waistX = L * p.waistPosition;
  const hipCenterX = L * 0.6;

  const trebleApex: Point = { x: L * 0.85, y: -halfW * p.lowerBoutFullness * 0.8 };
  const hornShoulder: Point = { x: L * 0.18, y: halfW * 0.22 };
  const lowerHornShoulder: Point = { x: L * 0.24, y: -halfW * 0.58 };

  // The hip cutout must sit CLOSER to the centerline than both of its
  // neighbors to read as an inward notch. Anchoring it to an absolute
  // `-halfW + hipCutoutDepth` (as an earlier version did) ignored where its
  // neighbors actually were — for typical params that put it *further* from
  // the centerline than either neighbor, so it bulged outward instead of
  // cutting inward. Anchoring it to the neighbors' own average edge level,
  // then pulling inward by hipCutoutDepth, guarantees the notch direction is
  // always correct regardless of the other body params in play.
  const hipCutoutPoint: Point = {
    x: hipCenterX,
    y: (trebleApex.y + lowerHornShoulder.y) / 2 + p.hipCutoutDepth,
  };

  return {
    neckJoint: { x: L * 0.04, y: -halfW * 0.18 },
    hornShoulder,
    upperBoutApex: { x: L * 0.38, y: halfW },
    waistPoint: { x: waistX, y: halfW - p.waistDepth },
    lowerBoutBassApex: { x: L * 0.82, y: halfW * p.lowerBoutFullness },
    lowerBoutTrebleApex: trebleApex,
    hipCutoutPoint,
    lowerHornShoulder,
  };
}

/** Distance-proportional handle length so curvature scales sensibly with the shape size. */
function handleLength(a: Point, b: Point, radiusFactor: number): number {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  return Math.min(d * 0.45, radiusFactor);
}

/**
 * Compute smooth (Catmull-Rom-like) handles for every anchor, then scale the
 * handle reach for each anchor's outgoing/incoming segment using the radius
 * params so "upper bout radius" / "hip cutout radius" etc. have a visible,
 * intuitive effect on curvature. Handle length is always capped at a
 * fraction of the distance to the relevant neighbor, so a handle can never
 * overshoot past the anchor it's steering toward — this holds for every
 * anchor uniformly, including the concave hip cutout.
 */
function computeHandles(
  positions: Record<BodyAnchorId, Point>,
  p: BodyParams,
): Record<BodyAnchorId, { handleIn: Point; handleOut: Point }> {
  const ids = BODY_ANCHOR_IDS;
  const n = ids.length;
  const result = {} as Record<BodyAnchorId, { handleIn: Point; handleOut: Point }>;

  // Per-anchor radius influence: how "round" the curve should be through this anchor.
  const radiusFor: Record<BodyAnchorId, number> = {
    neckJoint: 35,
    hornShoulder: p.upperHornRadius,
    upperBoutApex: p.upperBoutRadius,
    waistPoint: Math.max(20, 90 - p.waistDepth),
    lowerBoutBassApex: p.upperBoutRadius * 0.9,
    lowerBoutTrebleApex: p.upperBoutRadius * 0.6,
    hipCutoutPoint: Math.min(p.hipCutoutRadius, p.hipCutoutWidth * 0.5),
    lowerHornShoulder: p.upperHornRadius * 0.7,
  };

  for (let i = 0; i < n; i++) {
    const prev = positions[ids[(i - 1 + n) % n]];
    const cur = positions[ids[i]];
    const next = positions[ids[(i + 1) % n]];

    // Tangent direction through this anchor (Catmull-Rom style average).
    const tangent = { x: next.x - prev.x, y: next.y - prev.y };
    const tLen = Math.hypot(tangent.x, tangent.y) || 1;
    const unit = { x: tangent.x / tLen, y: tangent.y / tLen };

    const outLen = handleLength(cur, next, radiusFor[ids[i]]);
    const inLen = handleLength(prev, cur, radiusFor[ids[i]]);

    result[ids[i]] = {
      handleIn: { x: cur.x - unit.x * inLen, y: cur.y - unit.y * inLen },
      handleOut: { x: cur.x + unit.x * outLen, y: cur.y + unit.y * outLen },
    };
  }

  return result;
}

/** Build the full set of 8 parametric anchors from body params (no manual overrides applied). */
export function computeParametricAnchors(p: BodyParams): BodyAnchor[] {
  const positions = computeRawPositions(p);
  const handles = computeHandles(positions, p);
  const pivot = positions.neckJoint;

  return BODY_ANCHOR_IDS.map((id) => {
    const pos = applyForwardLean(positions[id], p.forwardLean, pivot);
    const hi = applyForwardLean(handles[id].handleIn, p.forwardLean, pivot);
    const ho = applyForwardLean(handles[id].handleOut, p.forwardLean, pivot);
    return {
      id,
      position: pos,
      handleIn: hi,
      handleOut: ho,
      manuallyEdited: false,
      mirrorHandles: true,
      locked: false,
    };
  });
}

/**
 * Recompute anchors from params, but preserve any anchor the user has
 * manually edited (and its lock state). This is the core rule that keeps the
 * model persistent instead of being regenerated on every slider change.
 */
export function recomputeAnchorsPreservingEdits(
  params: BodyParams,
  existing: BodyAnchor[],
): BodyAnchor[] {
  const fresh = computeParametricAnchors(params);
  return fresh.map((freshAnchor) => {
    const prior = existing.find((a) => a.id === freshAnchor.id);
    if (prior && (prior.manuallyEdited || prior.locked)) {
      return prior;
    }
    return freshAnchor;
  });
}

/** Reset a single anchor back to its parametric position. */
export function resetAnchor(id: BodyAnchorId, params: BodyParams, existing: BodyAnchor[]): BodyAnchor[] {
  const fresh = computeParametricAnchors(params);
  const freshAnchor = fresh.find((a) => a.id === id)!;
  return existing.map((a) => (a.id === id ? { ...freshAnchor, locked: a.locked, mirrorHandles: a.mirrorHandles } : a));
}
