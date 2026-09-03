// Shared seed → AnchorSpec helper for traced body silhouettes.
// Anchors are stored in compact tuples at the default body size; sliders
// scale the whole loop (and optional named deltas) so the default outline
// stays the traced shape.

import type { AnchorSpec } from '../bodyEngine';
import type { BodyFeatureId } from '../bodyFeatures';
import { selectAnchorOrder, MIN_BODY_ANCHORS } from './smoothLoop';
import type { TemplateParamMeta } from './types';

/** [id, featureId, x, y, handleIn.x, handleIn.y, handleOut.x, handleOut.y, corner(0|1)] */
export type TracedAnchor = [string, BodyFeatureId, number, number, number, number, number, number, 0 | 1];

export interface TracedBody {
  bodyLength: number;
  bodyWidth: number;
  anchors: TracedAnchor[];
  /** Survival order when the user drops the anchor count. Must start with neckJoint. */
  priority?: string[];
}

export function tracedParamMeta(maxAnchors: number): TemplateParamMeta[] {
  return [
    { key: 'bodyLength', label: 'Body length', min: 400, max: 560, step: 1, unit: 'mm' },
    { key: 'bodyWidth', label: 'Body width', min: 280, max: 460, step: 1, unit: 'mm' },
    { key: 'anchorCount', label: 'Anchor points', min: MIN_BODY_ANCHORS, max: maxAnchors, step: 1, unit: 'count' },
    { key: 'forwardLean', label: 'Forward lean', min: -4, max: 10, step: 0.5, unit: 'deg' },
  ];
}

export function tracedDefaultParams(body: TracedBody): Record<string, number> {
  return {
    bodyLength: body.bodyLength,
    bodyWidth: body.bodyWidth,
    anchorCount: body.anchors.length,
    forwardLean: 0,
  };
}

export function buildTracedSpecs(body: TracedBody, params: Record<string, number>): AnchorSpec[] {
  const sx = params.bodyLength / body.bodyLength;
  const sy = params.bodyWidth / body.bodyWidth;
  const order = body.anchors.map((a) => a[0]);
  const priority = body.priority ?? ['neckJoint', ...order.filter((id) => id !== 'neckJoint')];
  const keep = selectAnchorOrder(order, priority, params.anchorCount);
  const byId = new Map(body.anchors.map((a) => [a[0], a]));
  return keep.map((id) => {
    const [ , featureId, x, y, ix, iy, ox, oy, corner] = byId.get(id)!;
    const px = x * sx;
    const py = y * sy;
    const inDx = (ix - x) * sx;
    const inDy = (iy - y) * sy;
    const outDx = (ox - x) * sx;
    const outDy = (oy - y) * sy;
    return {
      id,
      featureId,
      position: { x: px, y: py },
      continuity: corner === 1 ? 'corner' : 'tangent',
      inAngleDeg: (Math.atan2(inDy, inDx) * 180) / Math.PI,
      outAngleDeg: (Math.atan2(outDy, outDx) * 180) / Math.PI,
      inLength: Math.hypot(inDx, inDy),
      outLength: Math.hypot(outDx, outDy),
    };
  });
}
