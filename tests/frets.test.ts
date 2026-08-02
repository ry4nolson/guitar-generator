import { describe, it, expect } from 'vitest';
import { computeFanFrets, fretDistanceFromNut } from '../src/geometry/frets';
import { DEFAULT_NECK_PARAMS } from '../src/geometry/neckParams';

describe('fretDistanceFromNut', () => {
  it('fret 12 is exactly half the scale length from the nut', () => {
    const scale = 647.7;
    const d12 = fretDistanceFromNut(scale, 12);
    expect(d12).toBeCloseTo(scale / 2, 9);
  });

  it('fret 0 is at the nut (distance 0)', () => {
    expect(fretDistanceFromNut(647.7, 0)).toBeCloseTo(0, 9);
  });
});

describe('computeFanFrets', () => {
  const frets = computeFanFrets(DEFAULT_NECK_PARAMS);

  it('produces fretCount + 1 points (including the nut)', () => {
    expect(frets).toHaveLength(DEFAULT_NECK_PARAMS.fretCount + 1);
  });

  it('fret spacing decreases monotonically toward the bridge (bass side)', () => {
    const spacings: number[] = [];
    for (let i = 1; i < frets.length; i++) {
      spacings.push(frets[i].bassDistance - frets[i - 1].bassDistance);
    }
    for (let i = 1; i < spacings.length; i++) {
      expect(spacings[i]).toBeLessThan(spacings[i - 1]);
    }
  });

  it('fret spacing decreases monotonically toward the bridge (treble side)', () => {
    const spacings: number[] = [];
    for (let i = 1; i < frets.length; i++) {
      spacings.push(frets[i].trebleDistance - frets[i - 1].trebleDistance);
    }
    for (let i = 1; i < spacings.length; i++) {
      expect(spacings[i]).toBeLessThan(spacings[i - 1]);
    }
  });

  it('fret 12 sits at exactly half of each side scale length from its own nut', () => {
    const f12 = frets.find((f) => f.fretNumber === 12)!;
    expect(f12.bassDistance).toBeCloseTo(DEFAULT_NECK_PARAMS.bassScale / 2, 9);
    expect(f12.trebleDistance).toBeCloseTo(DEFAULT_NECK_PARAMS.trebleScale / 2, 9);
  });

  it('bass and treble endpoints differ in x when scales differ (true fan, not a rotated rectangle)', () => {
    const f1 = frets.find((f) => f.fretNumber === 1)!;
    const f20 = frets.find((f) => f.fretNumber === 20)!;
    expect(Math.abs(f1.bassPoint.x - f1.treblePoint.x)).toBeGreaterThan(0.01);
    expect(Math.abs(f20.bassPoint.x - f20.treblePoint.x)).toBeGreaterThan(0.01);
    expect(Math.abs(f1.bassPoint.x - f1.treblePoint.x)).not.toBeCloseTo(
      Math.abs(f20.bassPoint.x - f20.treblePoint.x),
      3,
    );
  });

  it('the neutral fret is perpendicular to the centerline within a small tolerance', () => {
    const neutral = frets.find((f) => f.fretNumber === DEFAULT_NECK_PARAMS.neutralFret)!;
    expect(Math.abs(neutral.bassPoint.x - neutral.treblePoint.x)).toBeLessThan(1e-6);
  });

  it('equal scales collapse to a normal (non-fanned) fretboard', () => {
    const equalParams = { ...DEFAULT_NECK_PARAMS, trebleScale: DEFAULT_NECK_PARAMS.bassScale };
    const equalFrets = computeFanFrets(equalParams);
    for (const f of equalFrets) {
      expect(Math.abs(f.bassPoint.x - f.treblePoint.x)).toBeLessThan(1e-9);
    }
  });
});
