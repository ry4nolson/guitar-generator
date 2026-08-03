import { describe, it, expect } from 'vitest';
import {
  normalizeDegrees,
  referenceImageLayout,
  rotationFromPointer,
  DEFAULT_REFERENCE_SETTINGS,
} from '../src/state/referenceOverlay';

describe('referenceImageLayout', () => {
  it('places the image center from offsetX (left) and offsetY (mid-Y)', () => {
    const layout = referenceImageLayout(
      { ...DEFAULT_REFERENCE_SETTINGS, scale: 1, offsetX: 10, offsetY: 20, rotation: 15 },
      { width: 900, height: 450 },
    );
    expect(layout.width).toBe(450);
    expect(layout.height).toBe(225);
    expect(layout.cx).toBe(10 + 225);
    expect(layout.cy).toBe(20);
    expect(layout.rotation).toBe(15);
  });
});

describe('rotationFromPointer', () => {
  it('returns 0 when the pointer is straight "up" from center', () => {
    expect(rotationFromPointer(0, 0, 0, -50)).toBeCloseTo(0, 5);
  });

  it('returns ~90 when the pointer is to the right of center', () => {
    expect(rotationFromPointer(0, 0, 50, 0)).toBeCloseTo(90, 5);
  });
});

describe('normalizeDegrees', () => {
  it('wraps into (-180, 180]', () => {
    expect(normalizeDegrees(270)).toBe(-90);
    expect(normalizeDegrees(-270)).toBe(90);
    expect(normalizeDegrees(180)).toBe(180);
  });
});
