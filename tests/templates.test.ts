import { describe, it, expect } from 'vitest';
import { computeParametricAnchors } from '../src/geometry/bodyModel';
import { BODY_TEMPLATES } from '../src/geometry/templates';
import type { BodyAnchor, Point } from '../src/geometry/types';

function cubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
    y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y,
  };
}

function sampleClosedPath(anchors: BodyAnchor[], perSegment = 40): Point[] {
  const n = anchors.length;
  const samples: Point[] = [];
  for (let i = 0; i < n; i++) {
    const cur = anchors[i];
    const next = anchors[(i + 1) % n];
    for (let s = 0; s < perSegment; s++) {
      const t = s / perSegment;
      samples.push(cubicBezier(cur.position, cur.handleOut, next.handleIn, next.position, t));
    }
  }
  samples.push(samples[0]);
  return samples;
}

function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d1 = { x: p2.x - p1.x, y: p2.y - p1.y };
  const d2 = { x: p4.x - p3.x, y: p4.y - p3.y };
  const denom = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(denom) < 1e-9) return false;
  const t = ((p3.x - p1.x) * d2.y - (p3.y - p1.y) * d2.x) / denom;
  const u = ((p3.x - p1.x) * d1.y - (p3.y - p1.y) * d1.x) / denom;
  return t > 0 && t < 1 && u > 0 && u < 1;
}

function hasSelfIntersection(samples: Point[]): boolean {
  const m = samples.length - 1;
  for (let i = 0; i < m; i++) {
    for (let j = i + 2; j < m; j++) {
      if (i === 0 && j === m - 1) continue; // adjacent wrap-around segment, not a real crossing
      if (segmentsIntersect(samples[i], samples[i + 1], samples[j], samples[j + 1])) return true;
    }
  }
  return false;
}

function turningAngleDeg(samples: Point[]): number[] {
  const angles: number[] = [];
  for (let i = 1; i < samples.length - 1; i++) {
    const v1 = { x: samples[i].x - samples[i - 1].x, y: samples[i].y - samples[i - 1].y };
    const v2 = { x: samples[i + 1].x - samples[i].x, y: samples[i + 1].y - samples[i].y };
    const n1 = Math.hypot(v1.x, v1.y);
    const n2 = Math.hypot(v2.x, v2.y);
    if (n1 < 1e-9 || n2 < 1e-9) continue;
    const cos = Math.min(1, Math.max(-1, (v1.x * v2.x + v1.y * v2.y) / (n1 * n2)));
    angles.push((Math.acos(cos) * 180) / Math.PI);
  }
  return angles;
}

describe('every template preset', () => {
  for (const template of BODY_TEMPLATES) {
    describe(template.name, () => {
      const anchors = computeParametricAnchors(template, template.defaultParams);
      const samples = sampleClosedPath(anchors);

      it('creates a closed path (first and last sample coincide)', () => {
        expect(samples[0].x).toBeCloseTo(samples[samples.length - 1].x, 6);
        expect(samples[0].y).toBeCloseTo(samples[samples.length - 1].y, 6);
      });

      it('contains no NaN or Infinity in any anchor position/handle', () => {
        for (const a of anchors) {
          for (const p of [a.position, a.handleIn, a.handleOut]) {
            expect(Number.isFinite(p.x)).toBe(true);
            expect(Number.isFinite(p.y)).toBe(true);
          }
        }
      });

      it('does not self-intersect at default params', () => {
        expect(hasSelfIntersection(samples)).toBe(false);
      });

      it("'smooth'-continuity anchors have approximately aligned (collinear, opposite) in/out tangents", () => {
        for (const a of anchors) {
          if (a.continuity !== 'smooth' && a.continuity !== 'tangent') continue;
          const inDir = { x: a.handleIn.x - a.position.x, y: a.handleIn.y - a.position.y };
          const outDir = { x: a.handleOut.x - a.position.x, y: a.handleOut.y - a.position.y };
          const inLen = Math.hypot(inDir.x, inDir.y);
          const outLen = Math.hypot(outDir.x, outDir.y);
          if (inLen < 1e-6 || outLen < 1e-6) continue;
          const cosAngle = (inDir.x * outDir.x + inDir.y * outDir.y) / (inLen * outLen);
          // Opposite directions => cosAngle close to -1 (handles point away from each other through the anchor).
          expect(cosAngle).toBeLessThan(-0.98);
        }
      });

      it('allows corner-continuity anchors to have discontinuous (non-opposite) tangents', () => {
        const cornerAnchors = anchors.filter((a) => a.continuity === 'corner');
        if (cornerAnchors.length === 0) return; // template doesn't use corners (e.g. Tele/Strat) — nothing to assert
        const hasADiscontinuity = cornerAnchors.some((a) => {
          const inDir = { x: a.handleIn.x - a.position.x, y: a.handleIn.y - a.position.y };
          const outDir = { x: a.handleOut.x - a.position.x, y: a.handleOut.y - a.position.y };
          const inLen = Math.hypot(inDir.x, inDir.y) || 1;
          const outLen = Math.hypot(outDir.x, outDir.y) || 1;
          const cosAngle = (inDir.x * outDir.x + inDir.y * outDir.y) / (inLen * outLen);
          return cosAngle > -0.98; // NOT opposite => a real corner/kink
        });
        expect(hasADiscontinuity).toBe(true);
      });

      it('body bounds stay within a reasonable tolerance of the declared length/width params', () => {
        const xs = anchors.map((a) => a.position.x);
        const ys = anchors.map((a) => a.position.y);
        const spanX = Math.max(...xs) - Math.min(...xs);
        const spanY = Math.max(...ys) - Math.min(...ys);
        const L = template.defaultParams.bodyLength;
        const W = template.defaultParams.bodyWidth;
        expect(spanX).toBeGreaterThan(L * 0.55);
        expect(spanX).toBeLessThan(L * 1.05);
        expect(spanY).toBeGreaterThan(W * 0.55);
        expect(spanY).toBeLessThan(W * 1.15);
      });
    });
  }
});

describe('parameter isolation between features', () => {
  const tele = BODY_TEMPLATES.find((t) => t.id === 'tele')!;

  it('changing upper-horn parameters primarily affects upper-horn-owned anchors', () => {
    const before = computeParametricAnchors(tele, tele.defaultParams);
    const after = computeParametricAnchors(tele, {
      ...tele.defaultParams,
      upperHornReach: tele.defaultParams.upperHornReach + 30,
      upperHornRadius: tele.defaultParams.upperHornRadius + 15,
    });

    const beforeById = new Map(before.map((a) => [a.id, a]));
    let movedNonHornAnchors = 0;
    let movedHornAnchors = 0;
    for (const a of after) {
      const prior = beforeById.get(a.id)!;
      const moved = Math.hypot(a.position.x - prior.position.x, a.position.y - prior.position.y) > 0.01;
      if (!moved) continue;
      if (a.featureId === 'upperHorn') movedHornAnchors++;
      else movedNonHornAnchors++;
    }
    expect(movedHornAnchors).toBeGreaterThan(0);
    expect(movedNonHornAnchors).toBe(0);
  });

  it('changing hip-contour parameters primarily affects hip-contour-owned anchors', () => {
    const before = computeParametricAnchors(tele, tele.defaultParams);
    const after = computeParametricAnchors(tele, {
      ...tele.defaultParams,
      hipCutoutDepth: tele.defaultParams.hipCutoutDepth + 15,
      hipCutoutRadius: tele.defaultParams.hipCutoutRadius + 20,
    });

    const beforeById = new Map(before.map((a) => [a.id, a]));
    let movedNonHipAnchors = 0;
    let movedHipAnchors = 0;
    for (const a of after) {
      const prior = beforeById.get(a.id)!;
      const moved = Math.hypot(a.position.x - prior.position.x, a.position.y - prior.position.y) > 0.01;
      if (!moved) continue;
      if (a.featureId === 'hipContour') movedHipAnchors++;
      else movedNonHipAnchors++;
    }
    expect(movedHipAnchors).toBeGreaterThan(0);
    expect(movedNonHipAnchors).toBe(0);
  });
});

describe('self-intersection across a range of parameter values (not just defaults)', () => {
  for (const template of BODY_TEMPLATES) {
    it(`${template.name}: stays self-intersection-free across a spread of body length/width`, () => {
      for (const bodyLength of [template.defaultParams.bodyLength * 0.9, template.defaultParams.bodyLength * 1.08]) {
        for (const bodyWidth of [template.defaultParams.bodyWidth * 0.9, template.defaultParams.bodyWidth * 1.08]) {
          const anchors = computeParametricAnchors(template, { ...template.defaultParams, bodyLength, bodyWidth });
          const samples = sampleClosedPath(anchors);
          expect(hasSelfIntersection(samples)).toBe(false);
        }
      }
    });
  }
});

describe('turning angle sanity (no accidental hidden cusps in smooth-only templates)', () => {
  const smoothTemplates = BODY_TEMPLATES.filter((t) => t.id !== 'flying-v');
  for (const template of smoothTemplates) {
    it(`${template.name}: max turning angle stays well below a sharp-corner threshold`, () => {
      const anchors = computeParametricAnchors(template, template.defaultParams);
      const samples = sampleClosedPath(anchors, 60);
      const angles = turningAngleDeg(samples);
      expect(Math.max(...angles)).toBeLessThan(25);
    });
  }
});
