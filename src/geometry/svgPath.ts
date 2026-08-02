// Converts the 8-anchor body outline into an SVG path `d` string using real
// cubic Bezier commands (C), so exported SVGs are genuine vector paths.

import type { BodyAnchor, BodyAnchorId } from './types';
import { BODY_ANCHOR_IDS } from './types';

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
 * Builds an open path covering just the segment(s) that start at the given
 * anchor ids (in the fixed BODY_ANCHOR_IDS winding order). Used for
 * click-to-select hit regions and highlight overlays scoped to one body
 * feature, without duplicating the whole-outline fill path.
 */
export function featureSegmentsPathD(anchors: BodyAnchor[], segmentStartIds: BodyAnchorId[]): string {
  const order = BODY_ANCHOR_IDS;
  const n = order.length;
  const byId = new Map(anchors.map((a) => [a.id, a] as const));
  let d = '';
  for (const startId of segmentStartIds) {
    const i = order.indexOf(startId);
    const cur = byId.get(order[i]);
    const next = byId.get(order[(i + 1) % n]);
    if (!cur || !next) continue;
    d += `M ${cur.position.x.toFixed(3)} ${cur.position.y.toFixed(3)} `;
    d += `C ${cur.handleOut.x.toFixed(3)} ${cur.handleOut.y.toFixed(3)}, `;
    d += `${next.handleIn.x.toFixed(3)} ${next.handleIn.y.toFixed(3)}, `;
    d += `${next.position.x.toFixed(3)} ${next.position.y.toFixed(3)} `;
  }
  return d.trim();
}
