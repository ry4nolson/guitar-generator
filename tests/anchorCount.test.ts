import { describe, it, expect, beforeEach } from 'vitest';
import { BODY_TEMPLATES, getBodyTemplate } from '../src/geometry/templates';
import { computeParametricAnchors } from '../src/geometry/bodyModel';
import { selectAnchorOrder, MIN_BODY_ANCHORS } from '../src/geometry/templates/smoothLoop';
import { useDesignStore } from '../src/state/store';

describe('selectAnchorOrder', () => {
  const order = ['a', 'b', 'c', 'd', 'e', 'f'];
  const priority = ['a', 'd', 'f', 'b', 'c', 'e'];

  it('keeps the top-priority ids in loop order', () => {
    expect(selectAnchorOrder(order, priority, 4)).toEqual(['a', 'b', 'd', 'f']);
  });

  it('clamps below the minimum and above the full count', () => {
    expect(selectAnchorOrder(order, priority, 1)).toHaveLength(MIN_BODY_ANCHORS);
    expect(selectAnchorOrder(order, priority, 99)).toEqual(order);
  });

  it('treats a missing count as the full set', () => {
    expect(selectAnchorOrder(order, priority, undefined)).toEqual(order);
  });
});

describe('configurable anchor count per template', () => {
  it('defaults to the full authored anchor set', () => {
    for (const t of BODY_TEMPLATES) {
      const full = computeParametricAnchors(t, t.defaultParams);
      expect(t.defaultParams.anchorCount).toBe(full.length);
      const meta = t.paramMeta.find((m) => m.key === 'anchorCount')!;
      expect(meta.min).toBe(MIN_BODY_ANCHORS);
      expect(meta.max).toBe(full.length);
    }
  });

  it('reduces to exactly N anchors and always keeps neckJoint', () => {
    for (const t of BODY_TEMPLATES) {
      for (const count of [4, 5, 7]) {
        const anchors = computeParametricAnchors(t, { ...t.defaultParams, anchorCount: count });
        expect(anchors).toHaveLength(count);
        expect(anchors.some((a) => a.id === 'neckJoint')).toBe(true);
      }
    }
  });

  it('keeps reduced sets in the same loop order as the full set', () => {
    for (const t of BODY_TEMPLATES) {
      const full = computeParametricAnchors(t, t.defaultParams).map((a) => a.id);
      const reduced = computeParametricAnchors(t, { ...t.defaultParams, anchorCount: 6 }).map((a) => a.id);
      const positionsInFull = reduced.map((id) => full.indexOf(id));
      for (let i = 1; i < positionsInFull.length; i++) {
        expect(positionsInFull[i]).toBeGreaterThan(positionsInFull[i - 1]);
      }
    }
  });
});

describe('anchor count in the store', () => {
  beforeEach(() => {
    useDesignStore.getState().resetToDefaults();
  });

  it('setBodyParam(anchorCount) resizes the persisted anchors', () => {
    useDesignStore.getState().setBodyParam('anchorCount', 6);
    let s = useDesignStore.getState();
    expect(s.bodyAnchors).toHaveLength(6);
    expect(s.bodyAnchors.some((a) => a.id === 'neckJoint')).toBe(true);

    const full = getBodyTemplate(s.templateId).defaultParams.anchorCount;
    useDesignStore.getState().setBodyParam('anchorCount', full);
    s = useDesignStore.getState();
    expect(s.bodyAnchors).toHaveLength(full);
  });

  it('preserves manual edits on anchors that survive the reduction', () => {
    // tailPoint is priority #3 for the Tele, so it survives at count 6.
    useDesignStore.getState().moveAnchorPoint('tailPoint', 'position', { x: 500, y: 12 });
    useDesignStore.getState().setBodyParam('anchorCount', 6);
    const tail = useDesignStore.getState().bodyAnchors.find((a) => a.id === 'tailPoint')!;
    expect(tail.position).toEqual({ x: 500, y: 12 });
    expect(tail.manuallyEdited).toBe(true);
  });

  it('clears the selection when the selected anchor is dropped', () => {
    useDesignStore.getState().select({ kind: 'anchor', id: 'tailShoulderBass', part: 'position' });
    useDesignStore.getState().setBodyParam('anchorCount', 4);
    expect(useDesignStore.getState().selected).toBeNull();
  });

  it('keeps the selection when the selected anchor survives', () => {
    useDesignStore.getState().select({ kind: 'anchor', id: 'neckJoint', part: 'position' });
    useDesignStore.getState().setBodyParam('anchorCount', 4);
    expect(useDesignStore.getState().selected).toEqual({ kind: 'anchor', id: 'neckJoint', part: 'position' });
  });

  it('does not move the neck joint (and thus hardware) when the count changes', () => {
    const before = useDesignStore.getState();
    const saddleBefore = before.hardware.saddles[0].x;
    useDesignStore.getState().setBodyParam('anchorCount', 5);
    const after = useDesignStore.getState();
    expect(after.hardware.saddles[0].x).toBeCloseTo(saddleBefore, 9);
  });
});
