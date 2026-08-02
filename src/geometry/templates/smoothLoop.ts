// Shared helpers for authoring template silhouettes with intentional proportions.
// Handle lengths as a fraction of the adjacent segment keep Catmull-Rom smooth
// curves from puffing into cloud-blobs (absolute radii near segment length
// clamp at 90% and read as melted ovals).

import type { Point } from '../types';
import type { AnchorSpec } from '../bodyEngine';
import type { BodyFeatureId } from '../bodyFeatures';

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
