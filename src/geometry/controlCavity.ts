// Oriented control-cavity fit for the back-view route outline.
// Fits a padded rectangle to the knob/selector cluster along its principal axis.

import type { Point } from './types';

export interface OrientedCavity {
  /** Center of the cavity in body-local mm. */
  cx: number;
  cy: number;
  /** Length along the principal (cluster) axis, mm. */
  along: number;
  /** Width across the principal axis, mm. */
  across: number;
  /** Rotation of the long axis, degrees (SVG rotate). */
  rotation: number;
}

export interface ControlCavityOptions {
  /** Padding around the cluster footprint, mm. */
  pad: number;
  /** Extra degrees added after auto-fit. */
  rotationOffset?: number;
  /** Preferred angle (deg) when only one point is available (e.g. blade rotation). */
  hintAngleDeg?: number;
  minAlong?: number;
  minAcross?: number;
}

const DEFAULT_MIN = 36;

/**
 * Fit an oriented cavity to control centers. Returns null when there are no points.
 * Two or more points use PCA for the angle; a single point uses `hintAngleDeg`.
 */
export function fitControlCavity(points: Point[], opts: ControlCavityOptions): OrientedCavity | null {
  if (points.length === 0) return null;
  const pad = Math.max(0, opts.pad);
  const minAlong = opts.minAlong ?? DEFAULT_MIN;
  const minAcross = opts.minAcross ?? DEFAULT_MIN;
  const offset = opts.rotationOffset ?? 0;

  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;

  let angleDeg: number;
  if (points.length === 1) {
    angleDeg = opts.hintAngleDeg ?? 0;
  } else {
    // 2D PCA: principal axis of the covariance matrix.
    let xx = 0;
    let yy = 0;
    let xy = 0;
    for (const p of points) {
      const dx = p.x - cx;
      const dy = p.y - cy;
      xx += dx * dx;
      yy += dy * dy;
      xy += dx * dy;
    }
    // Degenerate (all points coincide) → fall back to hint.
    if (xx + yy < 1e-6) {
      angleDeg = opts.hintAngleDeg ?? 0;
    } else {
      angleDeg = (0.5 * Math.atan2(2 * xy, xx - yy) * 180) / Math.PI;
    }
  }

  angleDeg += offset;
  const rad = (angleDeg * Math.PI) / 180;
  const ux = Math.cos(rad);
  const uy = Math.sin(rad);
  const vx = -Math.sin(rad);
  const vy = Math.cos(rad);

  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const p of points) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const u = dx * ux + dy * uy;
    const v = dx * vx + dy * vy;
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }

  // Footprint of each pot/switch ≈ 20 mm; pad covers routing clearance.
  const FOOTPRINT = 10;
  let along = maxU - minU + 2 * (pad + FOOTPRINT);
  let across = maxV - minV + 2 * (pad + FOOTPRINT);
  along = Math.max(along, minAlong);
  across = Math.max(across, minAcross);

  // Re-center if padding made the box asymmetric around the point span.
  const midU = (minU + maxU) / 2;
  const midV = (minV + maxV) / 2;

  return {
    cx: cx + midU * ux + midV * vx,
    cy: cy + midU * uy + midV * vy,
    along,
    across,
    rotation: angleDeg,
  };
}
