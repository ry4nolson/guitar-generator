import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  normalizeDegrees,
  referenceImageLayout,
  rotationFromPointer,
  DEFAULT_REFERENCE_SETTINGS,
  createReferenceOverlayItem,
  loadReferenceOverlays,
  saveReferenceOverlays,
  normalizeReferenceOverlaysDocument,
  isAllowedImageDataUrl,
  isAllowedReferenceImageFile,
} from '../src/state/referenceOverlay';
import { migrateDesignDocument, DESIGN_DOCUMENT_VERSION } from '../src/export/migrateDocument';
import { serializeDocument, deserializeDocument } from '../src/export/jsonPersistence';
import { useDesignStore } from '../src/state/store';

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
    const b = createReferenceOverlayItem({ opacity: 0.8, offsetY: -20, locked: true, flipH: true });
    saveReferenceOverlays({ overlays: [a, b], activeId: b.id });
    const loaded = loadReferenceOverlays();
    expect(loaded.overlays).toHaveLength(2);
    expect(loaded.activeId).toBe(b.id);
    expect(loaded.overlays[0].opacity).toBeCloseTo(0.3);
    expect(loaded.overlays[0].flipH).toBe(false);
    expect(loaded.overlays[0].flipV).toBe(false);
    expect(loaded.overlays[1].locked).toBe(true);
    expect(loaded.overlays[1].offsetY).toBe(-20);
    expect(loaded.overlays[1].flipH).toBe(true);
    expect(loaded.overlays[1].flipV).toBe(false);
  });

  it('defaults flip flags to false and accepts both axes', () => {
    const item = createReferenceOverlayItem({ flipH: true, flipV: true });
    expect(item.flipH).toBe(true);
    expect(item.flipV).toBe(true);
    expect(createReferenceOverlayItem().flipH).toBe(false);
  });

  it('accepts png/jpeg/webp files by type or extension', () => {
    expect(isAllowedReferenceImageFile(new File([], 'a.png', { type: 'image/png' }))).toBe(true);
    expect(isAllowedReferenceImageFile(new File([], 'a.JPG', { type: '' }))).toBe(true);
    expect(isAllowedReferenceImageFile(new File([], 'a.gif', { type: 'image/gif' }))).toBe(false);
  });

  it('migrates legacy single-overlay settings into an array', () => {
    store.set(
      'fretforge-reference-overlay-v2',
      JSON.stringify({
        visible: true,
        locked: false,
        opacity: 0.36,
        scale: 0.52,
        rotation: -173,
        offsetX: -568,
        offsetY: -5,
      }),
    );
    const loaded = loadReferenceOverlays();
    expect(loaded.overlays).toHaveLength(1);
    expect(loaded.overlays[0].opacity).toBeCloseTo(0.36);
    expect(loaded.overlays[0].scale).toBeCloseTo(0.52);
    expect(loaded.overlays[0].rotation).toBe(-173);
    expect(loaded.overlays[0].offsetX).toBe(-568);
    expect(loaded.activeId).toBe(loaded.overlays[0].id);
    expect(store.has('guitloft-reference-overlay-v3')).toBe(true);
  });

  it('migrates FretForge v3 overlay settings onto the Guitloft key', () => {
    const item = createReferenceOverlayItem({ opacity: 0.22, offsetX: 8 });
    store.set(
      'fretforge-reference-overlay-v3',
      JSON.stringify({ overlays: [item], activeId: item.id }),
    );
    const loaded = loadReferenceOverlays();
    expect(loaded.overlays).toHaveLength(1);
    expect(loaded.overlays[0].opacity).toBeCloseTo(0.22);
    expect(loaded.activeId).toBe(item.id);
    expect(store.has('guitloft-reference-overlay-v3')).toBe(true);
  });
});

describe('reference overlay document embedding', () => {
  const tinyPng =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  it('accepts png/jpeg/webp data URLs only', () => {
    expect(isAllowedImageDataUrl(tinyPng)).toBe(true);
    expect(isAllowedImageDataUrl('data:image/gif;base64,AAAA')).toBe(false);
    expect(isAllowedImageDataUrl('https://example.com/a.png')).toBe(false);
  });

  it('normalizes document overlays and keeps base64 payloads', () => {
    const item = createReferenceOverlayItem({ opacity: 0.4, offsetX: 12 });
    const doc = normalizeReferenceOverlaysDocument({
      activeId: item.id,
      overlays: [
        { ...item, imageDataUrl: tinyPng },
        { id: 'settings-only' },
        { ...item, id: 'no-img', imageDataUrl: 'not-a-data-url' },
        { opacity: 0.5 }, // missing id — dropped
      ],
    });
    expect(doc.overlays).toHaveLength(3);
    expect(doc.overlays[0].imageDataUrl).toBe(tinyPng);
    expect(doc.overlays[1].id).toBe('settings-only');
    expect(doc.overlays[1].imageDataUrl).toBeUndefined();
    expect(doc.overlays[2].imageDataUrl).toBeUndefined();
    expect(doc.activeId).toBe(item.id);
  });

  it('round-trips base64 overlays through design JSON serialize/deserialize', () => {
    useDesignStore.getState().resetToDefaults();
    const s = useDesignStore.getState();
    const item = createReferenceOverlayItem({ scale: 0.7, rotation: 15 });
    const json = serializeDocument({
      version: DESIGN_DOCUMENT_VERSION,
      templateId: s.templateId,
      bodyParams: s.bodyParams,
      bodyAnchors: s.bodyAnchors,
      neckParams: s.neckParams,
      hardware: s.hardware,
      bridgeSettings: s.bridgeSettings,
      nutSettings: s.nutSettings,
      headstockSettings: s.headstockSettings,
      headstockAnchors: s.headstockAnchors,
      pickupSettings: s.pickupSettings,
      controlSettings: s.controlSettings,
      settings: s.settings,
      layers: s.layers,
      referenceOverlays: {
        activeId: item.id,
        overlays: [{ ...item, imageDataUrl: tinyPng }],
      },
    });
    expect(json).toContain('imageDataUrl');
    expect(json).toContain('base64,');

    const loaded = deserializeDocument(json);
    expect(loaded.version).toBe(DESIGN_DOCUMENT_VERSION);
    expect(loaded.referenceOverlays?.overlays).toHaveLength(1);
    expect(loaded.referenceOverlays?.overlays[0].imageDataUrl).toBe(tinyPng);
    expect(loaded.referenceOverlays?.overlays[0].scale).toBeCloseTo(0.7);
  });

  it('migrates v9 docs through to current with an empty referenceOverlays section', () => {
    useDesignStore.getState().resetToDefaults();
    const s = useDesignStore.getState();
    const migrated = migrateDesignDocument({
      version: 9,
      templateId: s.templateId,
      bodyParams: s.bodyParams,
      bodyAnchors: s.bodyAnchors,
      neckParams: s.neckParams,
      hardware: s.hardware,
      bridgeSettings: s.bridgeSettings,
      nutSettings: s.nutSettings,
      headstockSettings: s.headstockSettings,
      headstockAnchors: s.headstockAnchors,
      pickupSettings: s.pickupSettings,
      controlSettings: s.controlSettings,
      settings: s.settings,
      layers: s.layers,
    });
    expect(migrated.version).toBe(DESIGN_DOCUMENT_VERSION);
    expect(migrated.referenceOverlays).toEqual({ overlays: [], activeId: null });
  });
});
