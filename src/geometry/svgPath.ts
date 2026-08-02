// Converts a closed-loop body anchor array into an SVG path `d` string using
// real cubic Bezier commands (C), so exported SVGs are genuine vector paths.
// Generic over anchor count/order — templates can use anywhere from ~8 to
// 16+ anchors; nothing here assumes a fixed topology.

import type { BodyAnchor, BodyAnchorId } from './types';
import type { BodyFeatureId } from './bodyFeatures';

export function anchorsToPathD(anchors: BodyAnchor[]): string {
  if (anchors.length === 0) return '';
  const n = anchors.length;
  let d = `M ${anchors[0].position.x.toFixed(3)} ${anchors[0].position.y.toFixed(3)} `;
  for (let i = 0; i < n; i++) {
    const cur = anchors[i];
    const next = anchors[(i + 1) % n];
    d += `C ${cur.handleOut.x.toFixed(3)} ${cur.handleOut.y.toFixed(3)}, `;
    d += `${next.handleIn.x.toFixed(3)} ${next.handleIn.y.toFixed(3)}, `;
    d += `${next.position.x.toFixed(3)} ${next.position.y.toFixed(3)} `;
  }
  d += 'Z';
  return d;
}

/**
 * Builds an open path covering just the segment(s) whose STARTING anchor
 * belongs to the given feature (in the anchors array's own winding order —
 * generic over anchor count/topology, unlike the old version which relied on
 * a fixed 8-anchor id list). Used for click-to-select hit regions and
 * highlight overlays scoped to one body feature, without duplicating the
 * whole-outline fill path.
 */
export function featureSegmentsPathD(anchors: BodyAnchor[], featureId: BodyFeatureId): string {
  const n = anchors.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    if (anchors[i].featureId !== featureId) continue;
    const cur = anchors[i];
    const next = anchors[(i + 1) % n];
    d += `M ${cur.position.x.toFixed(3)} ${cur.position.y.toFixed(3)} `;
    d += `C ${cur.handleOut.x.toFixed(3)} ${cur.handleOut.y.toFixed(3)}, `;
    d += `${next.handleIn.x.toFixed(3)} ${next.handleIn.y.toFixed(3)}, `;
    d += `${next.position.x.toFixed(3)} ${next.position.y.toFixed(3)} `;
  }
  return d.trim();
}

/** All distinct feature ids present in the current anchor set, in first-appearance order. */
export function distinctFeatureIds(anchors: BodyAnchor[]): BodyFeatureId[] {
  const seen = new Set<BodyFeatureId>();
  const order: BodyFeatureId[] = [];
  for (const a of anchors) {
    if (!seen.has(a.featureId)) {
      seen.add(a.featureId);
      order.push(a.featureId);
    }
  }
  return order;
}

export type { BodyAnchorId };
