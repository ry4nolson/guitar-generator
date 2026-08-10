import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  normalizeDegrees,
  referenceImageLayout,
  rotationFromPointer,
  DEFAULT_REFERENCE_SETTINGS,
  createReferenceOverlayItem,
  loadReferenceOverlays,
  saveReferenceOverlays,
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

describe('multi-overlay persistence', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('round-trips multiple overlay settings', () => {
    const a = createReferenceOverlayItem({ opacity: 0.3, offsetX: 10 });
    const b = createReferenceOverlayItem({ opacity: 0.8, offsetY: -20, locked: true });
    saveReferenceOverlays({ overlays: [a, b], activeId: b.id });
    const loaded = loadReferenceOverlays();
    expect(loaded.overlays).toHaveLength(2);
    expect(loaded.activeId).toBe(b.id);
    expect(loaded.overlays[0].opacity).toBeCloseTo(0.3);
    expect(loaded.overlays[1].locked).toBe(true);
    expect(loaded.overlays[1].offsetY).toBe(-20);
  });

  it('migrates legacy single-overlay settings into an array', () => {
    store.set(
      'fretforge-reference-overlay-v2',
      JSON.stringify({ visible: true, locked: false, opacity: 0.36, scale: 0.52, rotation: -173, offsetX: -568, offsetY: -5 }),
    );
    const loaded = loadReferenceOverlays();
    expect(loaded.overlays).toHaveLength(1);
    expect(loaded.overlays[0].opacity).toBeCloseTo(0.36);
    expect(loaded.overlays[0].scale).toBeCloseTo(0.52);
    expect(loaded.overlays[0].rotation).toBe(-173);
    expect(loaded.overlays[0].offsetX).toBe(-568);
    expect(loaded.activeId).toBe(loaded.overlays[0].id);
    expect(store.has('fretforge-reference-overlay-v3')).toBe(true);
  });
});
