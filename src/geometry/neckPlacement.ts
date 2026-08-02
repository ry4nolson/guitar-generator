// Places neck-local geometry (nut at x=0, centerline along x) into body-local
// space: rotate by neckAngle around the neck/body join point, then translate
// so the heel sits at the body's neck joint.

import type { Point } from './types';
import type { NeckParams } from './neckParams';

export interface NeckPlacement {
  /** Where the heel (body joint) sits in body-local coordinates. */
  joinPoint: Point;
}

export function neckToBodySpace(p: Point, params: NeckParams, placement: NeckPlacement): Point {
  const rad = (params.neckAngle * Math.PI) / 180;
  // Neck-local x runs from nut (0) to heel (neckLength). We want the heel
  // anchored at the join point, with the nut extending back toward x=0 (left).
  const localX = p.x - params.neckLength;
  const rotated = {
    x: localX * Math.cos(rad) - p.y * Math.sin(rad),
    y: localX * Math.sin(rad) + p.y * Math.cos(rad),
  };
  return { x: placement.joinPoint.x + rotated.x, y: placement.joinPoint.y + rotated.y };
}
