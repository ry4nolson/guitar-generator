// Closed body-outline integrity: detect self-intersecting cubics so the editor
// can refuse knotted, non-physical silhouettes. Pairwise cubic intersection
// (de Casteljau subdivision) plus a sampled polyline for export/QA helpers.

import type { Point } from './types';

/** Anchor fields needed to sample a cubic outline. BodyAnchor and headstock anchors both fit. */
export interface OutlineCurveAnchor {
  position: Point;
  handleIn: Point;
  handleOut: Point;
}

export const OUTLINE_SAMPLE_PER_SEGMENT = 40;

interface Cubic {
  p0: Point;
  p1: Point;
  p2: Point;
  p3: Point;
}

function cubicPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
    y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y,
  };
}

export function sampleClosedOutline(
  anchors: readonly OutlineCurveAnchor[],
  perSegment = OUTLINE_SAMPLE_PER_SEGMENT,
): Point[] {
  const n = anchors.length;
  const samples: Point[] = [];
  for (let i = 0; i < n; i++) {
    const cur = anchors[i];
    const next = anchors[(i + 1) % n];
    for (let s = 0; s < perSegment; s++) {
      samples.push(cubicPoint(cur.position, cur.handleOut, next.handleIn, next.position, s / perSegment));
    }
  }
  if (samples.length > 0) samples.push(samples[0]);
  return samples;
}

function dist2(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function mid(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function outlineCubics(anchors: readonly OutlineCurveAnchor[]): Cubic[] {
  const n = anchors.length;
  const cubics: Cubic[] = [];
  for (let i = 0; i < n; i++) {
    const cur = anchors[i];
    const next = anchors[(i + 1) % n];
    cubics.push({
      p0: cur.position,
      p1: cur.handleOut,
      p2: next.handleIn,
      p3: next.position,
    });
  }
  return cubics;
}

function cubicBBox(c: Cubic): { minX: number; maxX: number; minY: number; maxY: number } {
  const xs = [c.p0.x, c.p1.x, c.p2.x, c.p3.x];
  const ys = [c.p0.y, c.p1.y, c.p2.y, c.p3.y];
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function bboxesOverlap(
  a: { minX: number; maxX: number; minY: number; maxY: number },
  b: { minX: number; maxX: number; minY: number; maxY: number },
): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

function splitCubic(c: Cubic): [Cubic, Cubic] {
  const m01 = mid(c.p0, c.p1);
  const m12 = mid(c.p1, c.p2);
  const m23 = mid(c.p2, c.p3);
  const m012 = mid(m01, m12);
  const m123 = mid(m12, m23);
  const m = mid(m012, m123);
  return [
    { p0: c.p0, p1: m01, p2: m012, p3: m },
    { p0: m, p1: m123, p2: m23, p3: c.p3 },
  ];
}

/** Inclusive segment intersection, or null if they miss / are collinear. */
function segmentIntersectionPoint(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-12) return null;
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
  const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom;
  if (t < -1e-7 || t > 1 + 1e-7 || u < -1e-7 || u > 1 + 1e-7) return null;
  return { x: p1.x + t * d1x, y: p1.y + t * d1y };
}

const JOIN_IGNORE_MM2 = 0.5 * 0.5;

function nearIgnored(p: Point, ignore: readonly Point[]): boolean {
  return ignore.some((q) => dist2(p, q) <= JOIN_IGNORE_MM2);
}

function cubicsIntersect(a: Cubic, b: Cubic, ignore: readonly Point[], depth = 0): boolean {
  if (!bboxesOverlap(cubicBBox(a), cubicBBox(b))) return false;
  const flat = dist2(a.p0, a.p3) < 0.04 && dist2(b.p0, b.p3) < 0.04;
  if (depth >= 16 || flat) {
    const hit = segmentIntersectionPoint(a.p0, a.p3, b.p0, b.p3);
    return hit != null && !nearIgnored(hit, ignore);
  }
  const [aL, aR] = splitCubic(a);
  const [bL, bR] = splitCubic(b);
  return (
    cubicsIntersect(aL, bL, ignore, depth + 1) ||
    cubicsIntersect(aL, bR, ignore, depth + 1) ||
    cubicsIntersect(aR, bL, ignore, depth + 1) ||
    cubicsIntersect(aR, bR, ignore, depth + 1)
  );
}

function cubicSelfIntersects(c: Cubic): boolean {
  const [left, right] = splitCubic(c);
  return cubicsIntersect(left, right, [left.p3]);
}

function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const hit = segmentIntersectionPoint(p1, p2, p3, p4);
  return hit != null;
}

export function polylineSelfIntersects(samples: readonly Point[]): boolean {
  const m = samples.length - 1;
  for (let i = 0; i < m; i++) {
    for (let j = i + 2; j < m; j++) {
      if (i === 0 && j === m - 1) continue;
      if (segmentsIntersect(samples[i], samples[i + 1], samples[j], samples[j + 1])) return true;
    }
  }
  return false;
}

/** True when the closed cubic loop crosses itself (a body that could not be cut from a board). */
export function outlineSelfIntersects(anchors: readonly OutlineCurveAnchor[]): boolean {
  if (anchors.length < 3) return false;
  const cubics = outlineCubics(anchors);
  const n = cubics.length;
  for (let i = 0; i < n; i++) {
    if (cubicSelfIntersects(cubics[i])) return true;
    for (let j = i + 1; j < n; j++) {
      const ignore: Point[] = [];
      if (j === i + 1) ignore.push(cubics[i].p3);
      if (i === 0 && j === n - 1) ignore.push(cubics[i].p0);
      if (cubicsIntersect(cubics[i], cubics[j], ignore)) return true;
    }
  }
  return false;
}

/**
 * Keep a simple silhouette simple. If the current outline is already knotted
 * (loaded/autosaved file), allow the edit so the user can pull it apart.
 */
export function shouldAcceptOutlineEdit(
  current: readonly OutlineCurveAnchor[],
  proposed: readonly OutlineCurveAnchor[],
): boolean {
  if (!outlineSelfIntersects(proposed)) return true;
  return outlineSelfIntersects(current);
}
