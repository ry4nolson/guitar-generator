// Bilateral symmetry helpers for body / headstock outline editing.
// Reflects across the string centerline (y = 0) in the local space of the outline.

import type { Point } from './types';

export type OutlineEditPart = 'position' | 'handleIn' | 'handleOut';

/** Minimal anchor shape shared by body and headstock outlines. */
export interface SymAnchor {
  id: string;
  position: Point;
  handleIn: Point;
  handleOut: Point;
  locked: boolean;
  manuallyEdited: boolean;
  mirrorHandles: boolean;
  /** Unset / true = eligible for centerline pairing. False = stay independent. */
  pairOpposite?: boolean;
}

export function isPairOppositeEnabled(anchor: Pick<SymAnchor, 'pairOpposite'>): boolean {
  return anchor.pairOpposite !== false;
}

/** Points closer than this to y=0 are treated as on the centerline (self-partner). */
export const SYMMETRY_ON_AXIS_MM = 2;

/** Max distance from the reflected position to accept a partner (mm). */
export const SYMMETRY_MAX_PARTNER_DIST_MM = 45;

export function mirrorAcrossCenterline(p: Point): Point {
  return { x: p.x, y: -p.y };
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Find the opposite-side anchor that best matches the reflection of `id`.
 * Returns the same id when the point sits on the centerline.
 * Returns null when no suitable partner exists (asymmetric regions, locked-only matches).
 */
export function findCenterlinePartnerId(
  anchors: readonly SymAnchor[],
  id: string,
  maxDist = SYMMETRY_MAX_PARTNER_DIST_MM,
): string | null {
  const self = anchors.find((a) => a.id === id);
  if (!self) return null;
  if (Math.abs(self.position.y) <= SYMMETRY_ON_AXIS_MM) return self.id;

  const target = mirrorAcrossCenterline(self.position);
  let bestId: string | null = null;
  let bestDist = Infinity;
  for (const a of anchors) {
    if (a.id === id) continue;
    // Must live on the opposite side of the centerline.
    if (Math.sign(a.position.y) === Math.sign(self.position.y)) continue;
    const d = dist(a.position, target);
    if (d < bestDist) {
      bestDist = d;
      bestId = a.id;
    }
  }
  if (bestId == null || bestDist > maxDist) return null;
  return bestId;
}

/** Apply a primary point/handle edit (same rules as the editor store). */
export function applyPrimaryOutlineEdit<T extends SymAnchor>(
  anchor: T,
  part: OutlineEditPart,
  point: Point,
): T {
  if (anchor.locked) return anchor;
  if (part === 'position') {
    const dx = point.x - anchor.position.x;
    const dy = point.y - anchor.position.y;
    return {
      ...anchor,
      position: point,
      handleIn: { x: anchor.handleIn.x + dx, y: anchor.handleIn.y + dy },
      handleOut: { x: anchor.handleOut.x + dx, y: anchor.handleOut.y + dy },
      manuallyEdited: true,
    };
  }
  if (anchor.mirrorHandles) {
    const opposite = part === 'handleIn' ? 'handleOut' : 'handleIn';
    const mirrored = {
      x: 2 * anchor.position.x - point.x,
      y: 2 * anchor.position.y - point.y,
    };
    return { ...anchor, [part]: point, [opposite]: mirrored, manuallyEdited: true };
  }
  return { ...anchor, [part]: point, manuallyEdited: true };
}

/**
 * Build the partner anchor that keeps bilateral symmetry with `primary`.
 * Handle in/out are swapped under reflection because the outline winds the other way.
 */
export function mirrorPartnerFromPrimary<T extends SymAnchor>(partner: T, primary: T): T {
  if (partner.locked) return partner;
  if (partner.id === primary.id) {
    // On-axis: stay on the centerline; reflect handles across y = 0.
    const position = { x: primary.position.x, y: 0 };
    const hin =
      primary.handleIn.y >= 0 ? primary.handleIn : mirrorAcrossCenterline(primary.handleIn);
    return {
      ...partner,
      position,
      handleIn: hin,
      handleOut: mirrorAcrossCenterline(hin),
      manuallyEdited: true,
    };
  }
  return {
    ...partner,
    position: mirrorAcrossCenterline(primary.position),
    // Winding reverses across the mirror → swap in/out.
    handleIn: mirrorAcrossCenterline(primary.handleOut),
    handleOut: mirrorAcrossCenterline(primary.handleIn),
    manuallyEdited: true,
  };
}

/**
 * Edit one outline anchor and, when enabled, its centerline partner in the same pass.
 */
export function editOutlineWithSymmetry<T extends SymAnchor>(
  anchors: readonly T[],
  id: string,
  part: OutlineEditPart,
  point: Point,
  enabled: boolean,
): T[] {
  const primaryIdx = anchors.findIndex((a) => a.id === id);
  if (primaryIdx < 0) return anchors.slice() as T[];
  const primaryBefore = anchors[primaryIdx];
  if (primaryBefore.locked) return anchors.slice() as T[];

  let partnerId = enabled ? findCenterlinePartnerId(anchors, id) : null;
  if (partnerId && !isPairOppositeEnabled(primaryBefore)) partnerId = null;
  if (partnerId && partnerId !== id) {
    const partnerBefore = anchors.find((a) => a.id === partnerId);
    if (partnerBefore && !isPairOppositeEnabled(partnerBefore)) partnerId = null;
  }

  let primaryPoint = point;
  // On-axis points: clamp position to the centerline when symmetry is on.
  if (enabled && partnerId === id && part === 'position') {
    primaryPoint = { x: point.x, y: 0 };
  }

  const primary = applyPrimaryOutlineEdit(primaryBefore, part, primaryPoint);
  let partner: T | null = null;
  if (partnerId) {
    const partnerBefore = anchors.find((a) => a.id === partnerId);
    if (partnerBefore) {
      partner =
        partnerId === id
          ? mirrorPartnerFromPrimary(primary, primary)
          : mirrorPartnerFromPrimary(partnerBefore, primary);
    }
  }

  return anchors.map((a) => {
    if (a.id === id) return partnerId === id && partner ? partner : primary;
    if (partner && a.id === partner.id) return partner;
    return a;
  });
}
