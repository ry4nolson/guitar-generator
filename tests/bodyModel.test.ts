import { describe, it, expect } from 'vitest';
import { computeParametricAnchors, recomputeAnchorsPreservingEdits, resetAnchor } from '../src/geometry/bodyModel';
import { DEFAULT_BODY_PARAMS } from '../src/geometry/bodyParams';
import { BODY_ANCHOR_IDS } from '../src/geometry/types';

describe('computeParametricAnchors', () => {
  it('produces 8 named anchors', () => {
    const anchors = computeParametricAnchors(DEFAULT_BODY_PARAMS);
    expect(anchors).toHaveLength(8);
    expect(anchors.map((a) => a.id)).toEqual([...BODY_ANCHOR_IDS]);
  });

  it('spans roughly the requested body length and width', () => {
    const anchors = computeParametricAnchors(DEFAULT_BODY_PARAMS);
    const xs = anchors.map((a) => a.position.x);
    const ys = anchors.map((a) => a.position.y);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    expect(spanX).toBeGreaterThan(DEFAULT_BODY_PARAMS.bodyLength * 0.6);
    expect(spanX).toBeLessThan(DEFAULT_BODY_PARAMS.bodyLength * 1.05);
    expect(spanY).toBeGreaterThan(DEFAULT_BODY_PARAMS.bodyWidth * 0.6);
  });
});

describe('recomputeAnchorsPreservingEdits', () => {
  it('overwrites unedited anchors when params change', () => {
    const initial = computeParametricAnchors(DEFAULT_BODY_PARAMS);
    const changedParams = { ...DEFAULT_BODY_PARAMS, bodyWidth: DEFAULT_BODY_PARAMS.bodyWidth + 40 };
    const recomputed = recomputeAnchorsPreservingEdits(changedParams, initial);
    const apex = recomputed.find((a) => a.id === 'upperBoutApex')!;
    const originalApex = initial.find((a) => a.id === 'upperBoutApex')!;
    expect(apex.position.y).not.toBeCloseTo(originalApex.position.y, 3);
  });

  it('freezes manually edited anchors even when params change', () => {
    const initial = computeParametricAnchors(DEFAULT_BODY_PARAMS);
    const edited = initial.map((a) =>
      a.id === 'upperBoutApex' ? { ...a, position: { x: 999, y: 999 }, manuallyEdited: true } : a,
    );
    const changedParams = { ...DEFAULT_BODY_PARAMS, bodyWidth: DEFAULT_BODY_PARAMS.bodyWidth + 40 };
    const recomputed = recomputeAnchorsPreservingEdits(changedParams, edited);
    const apex = recomputed.find((a) => a.id === 'upperBoutApex')!;
    expect(apex.position).toEqual({ x: 999, y: 999 });
  });

  it('resetAnchor reverts a manually edited anchor back to its parametric position', () => {
    const initial = computeParametricAnchors(DEFAULT_BODY_PARAMS);
    const edited = initial.map((a) =>
      a.id === 'waistPoint' ? { ...a, position: { x: 1, y: 1 }, manuallyEdited: true } : a,
    );
    const reset = resetAnchor('waistPoint', DEFAULT_BODY_PARAMS, edited);
    const waist = reset.find((a) => a.id === 'waistPoint')!;
    const originalWaist = initial.find((a) => a.id === 'waistPoint')!;
    expect(waist.position).toEqual(originalWaist.position);
    expect(waist.manuallyEdited).toBe(false);
  });
});
