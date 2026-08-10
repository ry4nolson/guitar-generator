import { describe, it, expect, beforeEach } from 'vitest';
import {
  editOutlineWithSymmetry,
  findCenterlinePartnerId,
  mirrorAcrossCenterline,
  type SymAnchor,
} from '../src/geometry/symmetricEdit';
import { useDesignStore } from '../src/state/store';

function anchor(
  id: string,
  x: number,
  y: number,
  opts: Partial<SymAnchor> = {},
): SymAnchor {
  return {
    id,
    position: { x, y },
    handleIn: { x: x - 5, y },
    handleOut: { x: x + 5, y },
    locked: false,
    manuallyEdited: false,
    mirrorHandles: true,
    ...opts,
  };
}

describe('symmetricEdit geometry', () => {
  const anchors = [
    anchor('bass', 100, 40),
    anchor('tip', 200, 0.5),
    anchor('treble', 100, -40),
    anchor('lonely', 50, 80), // no opposite-side neighbor nearby
  ];

  it('mirrors across the centerline', () => {
    expect(mirrorAcrossCenterline({ x: 10, y: 7 })).toEqual({ x: 10, y: -7 });
  });

  it('pairs opposite-side points by reflected position', () => {
    expect(findCenterlinePartnerId(anchors, 'bass')).toBe('treble');
    expect(findCenterlinePartnerId(anchors, 'treble')).toBe('bass');
  });

  it('treats near-centerline points as self-partners', () => {
    expect(findCenterlinePartnerId(anchors, 'tip')).toBe('tip');
  });

  it('returns null when no opposite partner is close enough', () => {
    expect(findCenterlinePartnerId(anchors, 'lonely')).toBeNull();
  });

  it('moves the partner position when symmetry is enabled', () => {
    const next = editOutlineWithSymmetry(anchors, 'bass', 'position', { x: 120, y: 55 }, true);
    const bass = next.find((a) => a.id === 'bass')!;
    const treble = next.find((a) => a.id === 'treble')!;
    expect(bass.position).toEqual({ x: 120, y: 55 });
    expect(treble.position).toEqual({ x: 120, y: -55 });
    expect(treble.handleIn).toEqual(mirrorAcrossCenterline(bass.handleOut));
    expect(treble.handleOut).toEqual(mirrorAcrossCenterline(bass.handleIn));
    expect(treble.manuallyEdited).toBe(true);
  });

  it('mirrors handle edits with in/out swap', () => {
    const next = editOutlineWithSymmetry(anchors, 'bass', 'handleOut', { x: 130, y: 50 }, true);
    const bass = next.find((a) => a.id === 'bass')!;
    const treble = next.find((a) => a.id === 'treble')!;
    expect(bass.handleOut).toEqual({ x: 130, y: 50 });
    // mirrorHandles also updates handleIn on primary; partner gets swapped mirrors.
    expect(treble.handleIn).toEqual(mirrorAcrossCenterline(bass.handleOut));
    expect(treble.handleOut).toEqual(mirrorAcrossCenterline(bass.handleIn));
  });

  it('does nothing to the partner when symmetry is off', () => {
    const next = editOutlineWithSymmetry(anchors, 'bass', 'position', { x: 120, y: 55 }, false);
    expect(next.find((a) => a.id === 'treble')!.position).toEqual({ x: 100, y: -40 });
  });

  it('clamps on-axis tip position to y = 0', () => {
    const next = editOutlineWithSymmetry(anchors, 'tip', 'position', { x: 210, y: 12 }, true);
    expect(next.find((a) => a.id === 'tip')!.position).toEqual({ x: 210, y: 0 });
  });

  it('does not move a locked partner', () => {
    const withLock = anchors.map((a) => (a.id === 'treble' ? { ...a, locked: true } : a));
    const next = editOutlineWithSymmetry(withLock, 'bass', 'position', { x: 120, y: 55 }, true);
    expect(next.find((a) => a.id === 'treble')!.position).toEqual({ x: 100, y: -40 });
    expect(next.find((a) => a.id === 'bass')!.position).toEqual({ x: 120, y: 55 });
  });
});

describe('symmetric editing in the store', () => {
  beforeEach(() => {
    useDesignStore.getState().resetToDefaults();
  });

  it('defaults to symmetric editing on', () => {
    expect(useDesignStore.getState().settings.symmetricEditing).toBe(true);
  });

  it('mirrors a free headstock point across the neck centerline', () => {
    const s0 = useDesignStore.getState();
    const free = s0.headstockAnchors.find((a) => !a.locked && a.position.y > 5);
    expect(free).toBeTruthy();
    if (!free) return;
    const partnerId = findCenterlinePartnerId(s0.headstockAnchors, free.id);
    expect(partnerId).toBeTruthy();
    expect(partnerId).not.toBe(free.id);

    const join = { x: 0, y: 0 }; // moveHeadstockAnchor converts body→neck; use neck-local via body approx
    // Nudge in body space: for default neck angle 0 / join, neck y ≈ body y near headstock.
    // Use store nudge which goes through moveHeadstockAnchor.
    const beforePartner = s0.headstockAnchors.find((a) => a.id === partnerId)!;
    useDesignStore.getState().nudgeHeadstockAnchor(free.id, 0, 8);
    const after = useDesignStore.getState().headstockAnchors;
    const moved = after.find((a) => a.id === free.id)!;
    const partner = after.find((a) => a.id === partnerId)!;
    expect(moved.position.y).toBeGreaterThan(free.position.y);
    expect(partner.position.y).toBeCloseTo(-moved.position.y, 5);
    expect(partner.position.x).toBeCloseTo(moved.position.x, 5);
    expect(partner.manuallyEdited).toBe(true);
    // Sanity: partner actually changed
    expect(partner.position.y).not.toBeCloseTo(beforePartner.position.y, 5);
    void join;
  });

  it('can disable symmetric editing', () => {
    useDesignStore.getState().toggleSymmetricEditing();
    expect(useDesignStore.getState().settings.symmetricEditing).toBe(false);
    const free = useDesignStore.getState().headstockAnchors.find((a) => !a.locked && a.position.y > 5)!;
    const partnerId = findCenterlinePartnerId(useDesignStore.getState().headstockAnchors, free.id)!;
    const beforeY = useDesignStore.getState().headstockAnchors.find((a) => a.id === partnerId)!.position.y;
    useDesignStore.getState().nudgeHeadstockAnchor(free.id, 0, 8);
    const afterY = useDesignStore.getState().headstockAnchors.find((a) => a.id === partnerId)!.position.y;
    expect(afterY).toBeCloseTo(beforeY, 5);
  });
});
