import { describe, it, expect } from 'vitest';
import {
  computeFanFrets,
  computeInlayDots,
  computeNeckOutlineLocal,
  fanLineX,
  fanTrebleX,
  fretDistanceFromNut,
  fretboardEndX,
  trebleFanOffset,
} from '../src/geometry/frets';
import { computeNutStringPoints } from '../src/geometry/strings';
import { DEFAULT_NECK_PARAMS } from '../src/geometry/neckParams';
import { DEFAULT_NUT_SETTINGS } from '../src/geometry/bridgeTypes';

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

describe('fan-line alignment (nut and board ends match fret angles)', () => {
  const params = { ...DEFAULT_NECK_PARAMS, bassScale: 686, trebleScale: 648 };

  it('fanTrebleX reproduces every fret line exactly', () => {
    const frets = computeFanFrets(params);
    for (const f of frets) {
      expect(fanTrebleX(params, f.bassPoint.x)).toBeCloseTo(f.treblePoint.x, 9);
    }
  });

  it('the neck outline nut edge coincides with the fret-0 line', () => {
    const outline = computeNeckOutlineLocal(params);
    const nut = computeFanFrets(params)[0];
    // Outline runs bass-nut, bass-heel, treble-heel, treble-nut.
    expect(outline[0].x).toBeCloseTo(nut.bassPoint.x, 9);
    expect(outline[3].x).toBeCloseTo(nut.treblePoint.x, 9);
  });

  it('the board-end edge lies on the fan line through fretboardEndX', () => {
    const outline = computeNeckOutlineLocal(params);
    expect(outline[1].x).toBe(fretboardEndX(params));
    expect(outline[2].x).toBeCloseTo(fanTrebleX(params, fretboardEndX(params)), 9);
  });

  it('collapses to a square outline when scales are equal', () => {
    const equal = { ...DEFAULT_NECK_PARAMS, trebleScale: DEFAULT_NECK_PARAMS.bassScale };
    const outline = computeNeckOutlineLocal(equal);
    expect(outline[3].x).toBeCloseTo(0, 9);
    expect(outline[2].x).toBeCloseTo(fretboardEndX(equal), 9);
  });

  it('fanLineX interpolates between the bass and treble edges', () => {
    const halfW = params.nutWidth / 2;
    expect(fanLineX(params, 0, halfW, halfW)).toBeCloseTo(0, 9);
    expect(fanLineX(params, 0, -halfW, halfW)).toBeCloseTo(trebleFanOffset(params), 9);
    expect(fanLineX(params, 0, 0, halfW)).toBeCloseTo(trebleFanOffset(params) / 2, 9);
  });

  it('nut string points are collinear with the fanned nut line', () => {
    const join = { x: 30, y: 0 };
    const flat = { ...params, neckAngle: 0 };
    const pts = computeNutStringPoints(flat, { ...DEFAULT_NUT_SETTINGS, type: 'standard' }, { joinPoint: join });
    // Slope of the nut line in body space: dx/dy = -trebleFanOffset / nutWidth.
    const expectedSlope = -trebleFanOffset(flat) / flat.nutWidth;
    for (let i = 1; i < pts.length; i++) {
      const slope = (pts[i].x - pts[0].x) / (pts[i].y - pts[0].y);
      expect(slope).toBeCloseTo(expectedSlope, 6);
    }
  });
});

describe('fretboard contains all frets', () => {
  it('the board end sits past the last fret on both sides', () => {
    const frets = computeFanFrets(DEFAULT_NECK_PARAMS);
    const last = frets[frets.length - 1];
    const endBass = fretboardEndX(DEFAULT_NECK_PARAMS);
    const endTreble = fanTrebleX(DEFAULT_NECK_PARAMS, endBass);
    expect(last.bassPoint.x).toBeLessThan(endBass);
    expect(last.treblePoint.x).toBeLessThan(endTreble);
  });

  it('fret endpoints lie exactly on the board edges, including past the heel', () => {
    const params = DEFAULT_NECK_PARAMS;
    const outline = computeNeckOutlineLocal(params);
    const frets = computeFanFrets(params);
    // Bass edge: from outline[0] to outline[1]; treble edge: outline[3] → outline[2].
    const bassSlope = (outline[1].y - outline[0].y) / (outline[1].x - outline[0].x);
    const trebleSlope = (outline[2].y - outline[3].y) / (outline[2].x - outline[3].x);
    for (const f of frets) {
      expect(f.bassPoint.y).toBeCloseTo(outline[0].y + bassSlope * (f.bassPoint.x - outline[0].x), 9);
      expect(f.treblePoint.y).toBeCloseTo(outline[3].y + trebleSlope * (f.treblePoint.x - outline[3].x), 9);
    }
  });

  it('the board stops at the heel when the fret count is short of it', () => {
    const short = { ...DEFAULT_NECK_PARAMS, fretCount: 20 };
    // Fret 20 at ~433mm < neckLength 460 → the heel bounds the board.
    expect(fretboardEndX(short)).toBe(short.neckLength);
  });
});

describe('inlay dots', () => {
  it('marks the standard frets, with doubles at the octaves', () => {
    const dots = computeInlayDots({ ...DEFAULT_NECK_PARAMS, fretCount: 24 });
    const byFret = new Map<number, number>();
    for (const d of dots) byFret.set(d.fret, (byFret.get(d.fret) ?? 0) + 1);
    expect([...byFret.keys()]).toEqual([3, 5, 7, 9, 12, 15, 17, 19, 21, 24]);
    expect(byFret.get(12)).toBe(2);
    expect(byFret.get(24)).toBe(2);
    expect(byFret.get(3)).toBe(1);
  });

  it('never marks frets beyond the fret count', () => {
    const dots = computeInlayDots({ ...DEFAULT_NECK_PARAMS, fretCount: 21 });
    expect(Math.max(...dots.map((d) => d.fret))).toBe(21);
  });

  it('centers each dot between its two frets', () => {
    const params = DEFAULT_NECK_PARAMS;
    for (const d of computeInlayDots(params)) {
      const lo = fretDistanceFromNut(params.bassScale, d.fret - 1);
      const hi = fretDistanceFromNut(params.bassScale, d.fret);
      // Fan shear moves x slightly off the bass midpoint but never outside the gap.
      expect(d.x).toBeGreaterThan(lo - (hi - lo) / 2);
      expect(d.x).toBeLessThan(hi);
      expect(d.radius).toBeGreaterThan(0);
    }
  });

  it('octave doubles are symmetric about the centerline', () => {
    const doubles = computeInlayDots(DEFAULT_NECK_PARAMS).filter((d) => d.fret === 12);
    expect(doubles[0].y).toBeCloseTo(-doubles[1].y, 9);
  });
});
