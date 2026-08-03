import { describe, it, expect } from 'vitest';
import { fitControlCavity } from '../src/geometry/controlCavity';

describe('fitControlCavity', () => {
  it('returns null for an empty cluster', () => {
    expect(fitControlCavity([], { pad: 14 })).toBeNull();
  });

  it('fits a single point using the hint angle', () => {
    const c = fitControlCavity([{ x: 100, y: -50 }], { pad: 14, hintAngleDeg: 30 });
    expect(c).not.toBeNull();
    expect(c!.cx).toBeCloseTo(100, 5);
    expect(c!.cy).toBeCloseTo(-50, 5);
    expect(c!.rotation).toBeCloseTo(30, 5);
    expect(c!.along).toBeGreaterThanOrEqual(36);
    expect(c!.across).toBeGreaterThanOrEqual(36);
  });

  it('aligns the cavity with a diagonal knob/switch cluster', () => {
    // Three controls on a ~45° line (treble-side wing).
    const pts = [
      { x: 0, y: 0 },
      { x: 20, y: -20 },
      { x: 40, y: -40 },
    ];
    const c = fitControlCavity(pts, { pad: 10 });
    expect(c).not.toBeNull();
    // Principal axis of this set is −45° (or +135°); either is fine.
    const abs = Math.abs(c!.rotation);
    expect(abs === 45 || Math.abs(abs - 135) < 1 || Math.abs(abs - 45) < 1).toBe(true);
    // Longer along the cluster than across it.
    expect(c!.along).toBeGreaterThan(c!.across);
  });

  it('applies rotationOffset on top of the auto-fit angle', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
    ];
    const base = fitControlCavity(pts, { pad: 10 })!;
    const offset = fitControlCavity(pts, { pad: 10, rotationOffset: 15 })!;
    expect(offset.rotation).toBeCloseTo(base.rotation + 15, 5);
  });

  it('grows with pad', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
    ];
    const tight = fitControlCavity(pts, { pad: 4 })!;
    const loose = fitControlCavity(pts, { pad: 24 })!;
    expect(loose.along).toBeGreaterThan(tight.along);
    expect(loose.across).toBeGreaterThan(tight.across);
  });
});
