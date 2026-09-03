// Computes the full drawing's bounding box (body outline + neck + hardware),
// so the canvas can genuinely "fit the whole guitar to the viewport," not
// just the body's own bodyLength x bodyWidth rectangle. The neck extends
// well beyond the body's own bounds (it runs from the body's neck-joint
// anchor out to the nut, in the -x direction — see neckPlacement.ts), so
// sizing the viewBox from bodyParams alone clips most of the neck off-canvas.

import type { BodyAnchor, Point } from './types';
import type { HardwareState } from '../state/hardwareDefaults';

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function expand(b: Bounds, p: Point, margin = 0): Bounds {
  return {
    minX: Math.min(b.minX, p.x - margin),
    maxX: Math.max(b.maxX, p.x + margin),
    minY: Math.min(b.minY, p.y - margin),
    maxY: Math.max(b.maxY, p.y + margin),
  };
}

export interface DesignBoundsOptions {
  /**
   * When true, Bezier handles inflate the box (useful if you must never clip
   * construction geometry). Default false so Fit maximizes the visible guitar
   * silhouette rather than empty handle overhang.
   */
  includeHandles?: boolean;
}

export function computeDesignBounds(
  bodyAnchors: BodyAnchor[],
  neckOutlinePoints: Point[],
  hardware: HardwareState,
  options: DesignBoundsOptions = {},
  /** Extra silhouette points (headstock, tuners, etc.). */
  extraPoints: Point[] = [],
): Bounds {
  const includeHandles = options.includeHandles ?? false;
  let bounds: Bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };

  for (const a of bodyAnchors) {
    bounds = expand(bounds, a.position);
    if (includeHandles) {
      bounds = expand(bounds, a.handleIn);
      bounds = expand(bounds, a.handleOut);
    }
  }
  for (const p of neckOutlinePoints) {
    bounds = expand(bounds, p);
  }
  for (const p of extraPoints) {
    bounds = expand(bounds, p, 6);
  }
  // Pickups can be up to ~86 mm across (P90); use the worst-case half-extent.
  for (const p of hardware.pickups) if (p.visible) bounds = expand(bounds, p, 44);
  for (const c of hardware.controls) if (c.visible) bounds = expand(bounds, c, 11);
  if (hardware.selector.visible) bounds = expand(bounds, hardware.selector, 27);
  for (const s of hardware.saddles) bounds = expand(bounds, s, 4);
  for (const b of hardware.neckBolts) bounds = expand(bounds, b, 4);
  for (const t of hardware.tuners ?? []) if (t.visible) bounds = expand(bounds, t, 6);

  if (!Number.isFinite(bounds.minX)) {
    // Degenerate fallback (should not happen with a real design document).
    return { minX: 0, maxX: 100, minY: -50, maxY: 50 };
  }
  return bounds;
}
