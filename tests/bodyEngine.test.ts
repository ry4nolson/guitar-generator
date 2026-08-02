import { describe, it, expect } from 'vitest';
import { buildAnchorsFromSpecs, type AnchorSpec } from '../src/geometry/bodyEngine';

/** Minimal 4-anchor closed square, used to test the engine in isolation from any template. */
function squareSpecs(continuity: AnchorSpec['continuity']): AnchorSpec[] {
  return [
    { id: 'a', featureId: 'tail', position: { x: 0, y: 0 }, continuity, inLength: 10, outLength: 10 },
    { id: 'b', featureId: 'tail', position: { x: 100, y: 0 }, continuity, inLength: 10, outLength: 10 },
    { id: 'c', featureId: 'tail', position: { x: 100, y: 100 }, continuity, inLength: 10, outLength: 10 },
    { id: 'd', featureId: 'tail', position: { x: 0, y: 100 }, continuity, inLength: 10, outLength: 10 },
  ];
}

describe('buildAnchorsFromSpecs', () => {
  it('throws if fewer than 3 anchors are given (cannot form a closed loop)', () => {
    expect(() =>
      buildAnchorsFromSpecs([
        { id: 'a', featureId: 'tail', position: { x: 0, y: 0 }, continuity: 'smooth', inLength: 5, outLength: 5 },
        { id: 'b', featureId: 'tail', position: { x: 10, y: 0 }, continuity: 'smooth', inLength: 5, outLength: 5 },
      ]),
    ).toThrow();
  });

  it('clamps handle length so it can never overshoot past the neighboring anchor (any continuity mode)', () => {
    for (const continuity of ['corner', 'tangent', 'smooth'] as const) {
      const specs = squareSpecs(continuity).map((s) => ({ ...s, inLength: 1000, outLength: 1000 }));
      const anchors = buildAnchorsFromSpecs(specs);
      for (let i = 0; i < anchors.length; i++) {
        const cur = anchors[i];
        const next = anchors[(i + 1) % anchors.length];
        const segLen = Math.hypot(next.position.x - cur.position.x, next.position.y - cur.position.y);
        const outHandleLen = Math.hypot(cur.handleOut.x - cur.position.x, cur.handleOut.y - cur.position.y);
        expect(outHandleLen).toBeLessThanOrEqual(segLen * 0.9 + 1e-6);
      }
    }
  });

  it("'corner' mode with angles pointing exactly at neighbors renders perfectly straight edges", () => {
    // A square's edges are axis-aligned: right, up, left, down.
    const cornerSquare = squareSpecs('corner').map((spec, i) => ({
      ...spec,
      outAngleDeg: [0, 90, 180, 270][i],
      inAngleDeg: [0, 90, 180, 270][(i + 3) % 4] + 180,
    }));
    const anchors = buildAnchorsFromSpecs(cornerSquare);
    // For a straight segment, handleOut/handleIn must be collinear with the anchor-to-neighbor line.
    for (let i = 0; i < anchors.length; i++) {
      const cur = anchors[i];
      const next = anchors[(i + 1) % anchors.length];
      const segDir = { x: next.position.x - cur.position.x, y: next.position.y - cur.position.y };
      const handleDir = { x: cur.handleOut.x - cur.position.x, y: cur.handleOut.y - cur.position.y };
      const cross = segDir.x * handleDir.y - segDir.y * handleDir.x;
      expect(Math.abs(cross)).toBeLessThan(1e-6);
    }
  });

  it("'smooth' mode derives collinear in/out handles from neighboring anchor positions", () => {
    const anchors = buildAnchorsFromSpecs(squareSpecs('smooth'));
    for (const a of anchors) {
      const inDir = { x: a.handleIn.x - a.position.x, y: a.handleIn.y - a.position.y };
      const outDir = { x: a.handleOut.x - a.position.x, y: a.handleOut.y - a.position.y };
      // Collinear and opposite: cross product ~0, dot product < 0.
      const cross = inDir.x * outDir.y - inDir.y * outDir.x;
      const dot = inDir.x * outDir.x + inDir.y * outDir.y;
      expect(Math.abs(cross)).toBeLessThan(1e-6);
      expect(dot).toBeLessThan(0);
    }
  });

  it('records the continuity mode and featureId on each built anchor (for the debug overlay/sidebar)', () => {
    const anchors = buildAnchorsFromSpecs(squareSpecs('tangent'));
    for (const a of anchors) {
      expect(a.continuity).toBe('tangent');
      expect(a.featureId).toBe('tail');
    }
  });
});
