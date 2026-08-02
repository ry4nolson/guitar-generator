// Shared helpers for authoring template silhouettes with intentional proportions.
// Handle lengths as a fraction of the adjacent segment keep Catmull-Rom smooth
// curves from puffing into cloud-blobs (absolute radii near segment length
// clamp at 90% and read as melted ovals).

import type { Point } from '../types';
import type { AnchorSpec } from '../bodyEngine';
import type { BodyFeatureId } from '../bodyFeatures';

/** Minimum anchors for a usable closed body loop. */
export const MIN_BODY_ANCHORS = 4;

/**
 * Pick which anchors survive at a reduced anchor count: keep the top
 * `anchorCount` ids from the template's priority list, in loop order.
 * Priority lists must put `neckJoint` within the first MIN_BODY_ANCHORS so it
 * can never be dropped. Count clamps to [MIN_BODY_ANCHORS, order.length].
 */
export function selectAnchorOrder(order: string[], priority: string[], anchorCount: number | undefined): string[] {
  const requested = Number.isFinite(anchorCount) ? (anchorCount as number) : order.length;
  const count = Math.round(Math.min(order.length, Math.max(MIN_BODY_ANCHORS, requested)));
  if (count >= order.length) return order;
  const keep = new Set(priority.slice(0, count));
  return order.filter((id) => keep.has(id));
}

/** Build smooth-continuity specs with handle lengths = fraction of each segment. */
export function buildSmoothLoop(opts: {
  order: string[];
  positions: Record<string, Point>;
  featureOf: Record<string, BodyFeatureId>;
  /** Per-anchor handle fraction of adjacent segment (default 0.32). */
  handleFraction?: Record<string, number> | number;
}): AnchorSpec[] {
  const { order, positions, featureOf } = opts;
  const n = order.length;
  const defaultFrac = typeof opts.handleFraction === 'number' ? opts.handleFraction : 0.32;
  const fracMap = typeof opts.handleFraction === 'object' ? opts.handleFraction : {};

  return order.map((id, i) => {
    const pos = positions[id];
    const prev = positions[order[(i - 1 + n) % n]];
    const next = positions[order[(i + 1) % n]];
    const distIn = Math.hypot(pos.x - prev.x, pos.y - prev.y);
    const distOut = Math.hypot(next.x - pos.x, next.y - pos.y);
    const frac = fracMap[id] ?? defaultFrac;
    return {
      id,
      featureId: featureOf[id],
      position: pos,
      continuity: 'smooth' as const,
      inLength: distIn * frac,
      outLength: distOut * frac,
    };
  });
}
