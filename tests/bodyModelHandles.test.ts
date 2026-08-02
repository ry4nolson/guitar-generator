import { describe, it, expect } from 'vitest';
import { computeParametricAnchors } from '../src/geometry/bodyModel';
import { DEFAULT_BODY_PARAMS } from '../src/geometry/bodyParams';

/**
 * Regression test for a real self-intersection bug: the hip-cutout region's
 * handles were once computed as an absolute `hip.x ± hipCutoutWidth/2`
 * with no regard for which segment they belonged to, so a sufficiently wide
 * hipCutoutWidth pushed a handle's x past its own destination anchor —
 * the curve then had to loop backward to reach it, rendering as a
 * self-intersecting extra blob colliding with the rest of the outline.
 *
 * A handle's x should stay within (inclusive, small tolerance) the x-span of
 * the two anchors its segment connects, for the two hip-cutout segments
 * specifically (the segments whose handles are hand-tuned, rather than
 * derived from the general Catmull-Rom pass used elsewhere).
 */
describe('hip cutout handles stay within their own segment (no self-intersecting overshoot)', () => {
  function hipSegmentProblems(params = DEFAULT_BODY_PARAMS) {
    const anchors = computeParametricAnchors(params);
    const byId = new Map(anchors.map((a) => [a.id, a]));
    const trebleApex = byId.get('lowerBoutTrebleApex')!;
    const hip = byId.get('hipCutoutPoint')!;
    const hornShoulder = byId.get('lowerHornShoulder')!;
    const problems: string[] = [];

    const checkSegment = (a: typeof trebleApex, b: typeof trebleApex, label: string) => {
      const lo = Math.min(a.position.x, b.position.x);
      const hi = Math.max(a.position.x, b.position.x);
      const tolerance = (hi - lo) * 0.05 + 1;
      if (a.handleOut.x < lo - tolerance || a.handleOut.x > hi + tolerance) {
        problems.push(`${label}: ${a.id}.handleOut.x=${a.handleOut.x.toFixed(1)} outside [${lo.toFixed(1)}, ${hi.toFixed(1)}]`);
      }
      if (b.handleIn.x < lo - tolerance || b.handleIn.x > hi + tolerance) {
        problems.push(`${label}: ${b.id}.handleIn.x=${b.handleIn.x.toFixed(1)} outside [${lo.toFixed(1)}, ${hi.toFixed(1)}]`);
      }
    };

    checkSegment(trebleApex, hip, 'lowerBoutTrebleApex->hipCutoutPoint');
    checkSegment(hip, hornShoulder, 'hipCutoutPoint->lowerHornShoulder');
    return problems;
  }

  it('holds at default params', () => {
    expect(hipSegmentProblems()).toEqual([]);
  });

  it('holds at maximum hip cutout width (the parameter that triggered the original bug)', () => {
    expect(hipSegmentProblems({ ...DEFAULT_BODY_PARAMS, hipCutoutWidth: 200 })).toEqual([]);
  });

  it('holds at minimum hip cutout width', () => {
    expect(hipSegmentProblems({ ...DEFAULT_BODY_PARAMS, hipCutoutWidth: 40 })).toEqual([]);
  });

  it('holds across a range of body lengths and hip cutout positions', () => {
    for (const bodyLength of [360, 430, 480]) {
      for (const hipCutoutWidth of [40, 120, 200]) {
        const problems = hipSegmentProblems({ ...DEFAULT_BODY_PARAMS, bodyLength, hipCutoutWidth });
        expect(problems).toEqual([]);
      }
    }
  });
});

/**
 * Regression test for a real "shape reads as a bulge, not a notch" bug: the
 * hip-cutout anchor's y position was computed as an absolute
 * `-halfW + hipCutoutDepth`, without regard to where its neighboring
 * anchors actually were. For the shipped default params this put the
 * "cutout" anchor FURTHER from the centerline than both of its neighbors —
 * i.e. it bulged outward instead of notching inward, which is why the body
 * looked wrong even after the self-intersection was fixed.
 *
 * The hip-cutout anchor must sit strictly closer to the centerline (smaller
 * |y|) than both of its neighbors, for it to read as an inward notch.
 */
describe('hip cutout anchor reads as an inward notch, not an outward bulge', () => {
  function hipIsInwardNotch(params = DEFAULT_BODY_PARAMS) {
    const anchors = computeParametricAnchors(params);
    const byId = new Map(anchors.map((a) => [a.id, a]));
    const hip = byId.get('hipCutoutPoint')!;
    const trebleApex = byId.get('lowerBoutTrebleApex')!;
    const hornShoulder = byId.get('lowerHornShoulder')!;
    return Math.abs(hip.position.y) < Math.abs(trebleApex.position.y) && Math.abs(hip.position.y) < Math.abs(hornShoulder.position.y);
  }

  it('holds at default params', () => {
    expect(hipIsInwardNotch()).toBe(true);
  });

  it('holds across a range of (non-zero) hip cutout depths and body widths', () => {
    for (const hipCutoutDepth of [10, 34, 70]) {
      for (const bodyWidth of [260, 325, 360]) {
        expect(hipIsInwardNotch({ ...DEFAULT_BODY_PARAMS, hipCutoutDepth, bodyWidth })).toBe(true);
      }
    }
  });
});
