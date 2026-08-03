import { describe, it, expect, beforeEach } from 'vitest';
import {
  stringSlotOffsets,
  DEFAULT_BRIDGE_SETTINGS,
  DEFAULT_NUT_SETTINGS,
  bridgeTypeMeta,
} from '../src/geometry/bridgeTypes';
import {
  computeNutStringPoints,
  computeBridgeStringPoints,
  computeStringSegments,
  layoutSaddles,
  saddleClusterCenter,
  STRING_STROKE_MM,
  stringStrokeWidths,
} from '../src/geometry/strings';
import { suggestedBridgeSpacing, suggestedNutSpacing } from '../src/geometry/bridgeTypes';
import { DEFAULT_NECK_PARAMS } from '../src/geometry/neckParams';
import { useDesignStore } from '../src/state/store';
import { migrateDesignDocument, DESIGN_DOCUMENT_VERSION } from '../src/export/migrateDocument';
import { buildSvgDocument } from '../src/export/svgExport';
import { getBodyTemplate } from '../src/geometry/templates';
import { computeParametricAnchors } from '../src/geometry/bodyModel';
import { defaultLayers } from '../src/state/layers';

describe('stringSlotOffsets', () => {
  it('places 6 slots symmetrically with the requested outer spacing', () => {
    const ys = stringSlotOffsets(52.5, 6);
    expect(ys).toHaveLength(6);
    expect(ys[5] - ys[0]).toBeCloseTo(52.5, 6);
    expect(ys[0]).toBeCloseTo(-ys[5], 6);
  });
});

describe('string gauges', () => {
  it('thickens from treble (high E) to bass (low E) without a cartoon bass', () => {
    expect(STRING_STROKE_MM).toHaveLength(6);
    for (let i = 1; i < STRING_STROKE_MM.length; i++) {
      expect(STRING_STROKE_MM[i]).toBeGreaterThan(STRING_STROKE_MM[i - 1]);
    }
    expect(STRING_STROKE_MM[5]).toBeLessThanOrEqual(1.85);
  });

  it('produces N gauges for multi-string sets', () => {
    expect(stringStrokeWidths(9)).toHaveLength(9);
    expect(stringStrokeWidths(9)[8]).toBeLessThanOrEqual(1.85);
  });
});

describe('suggested spacing', () => {
  it('scales outer spacing with string count', () => {
    expect(suggestedBridgeSpacing(6)).toBeCloseTo(52.5, 5);
    expect(suggestedBridgeSpacing(7)).toBeCloseTo(63, 5);
    expect(suggestedNutSpacing(6)).toBeCloseTo(35, 5);
    expect(suggestedNutSpacing(8)).toBeGreaterThan(suggestedNutSpacing(6));
  });
});

describe('string geometry', () => {
  it('produces 6 nut→bridge segments with finite coordinates', () => {
    const nut = computeNutStringPoints(DEFAULT_NECK_PARAMS, DEFAULT_NUT_SETTINGS, { joinPoint: { x: 20, y: 0 } });
    const saddles = layoutSaddles({ x: 350, y: 0 }, DEFAULT_BRIDGE_SETTINGS);
    const bridge = computeBridgeStringPoints(saddles);
    const segs = computeStringSegments(nut, bridge);
    expect(segs).toHaveLength(6);
    for (const s of segs) {
      expect(Number.isFinite(s.nut.x)).toBe(true);
      expect(Number.isFinite(s.bridge.x)).toBe(true);
    }
  });

  it('layoutSaddles respects outer string spacing', () => {
    const saddles = layoutSaddles({ x: 100, y: 0 }, { ...DEFAULT_BRIDGE_SETTINGS, stringSpacing: 50 });
    expect(saddles[5].y - saddles[0].y).toBeCloseTo(50, 5);
  });

  it('saddleClusterCenter averages saddle positions', () => {
    const saddles = layoutSaddles({ x: 200, y: 5 }, DEFAULT_BRIDGE_SETTINGS);
    const c = saddleClusterCenter(saddles);
    expect(c.x).toBeGreaterThan(199);
    expect(c.y).toBeCloseTo(5, 0);
  });
});

describe('bridge type switching', () => {
  beforeEach(() => {
    useDesignStore.getState().resetToDefaults();
  });

  it('updates bridge type and relayouts saddle spacing to the type default', () => {
    useDesignStore.getState().setBridgeType('tom');
    const s = useDesignStore.getState();
    expect(s.bridgeSettings.type).toBe('tom');
    expect(s.bridgeSettings.stringSpacing).toBe(bridgeTypeMeta('tom').defaultSpacing);
    const span = s.hardware.saddles[5].y - s.hardware.saddles[0].y;
    expect(span).toBeCloseTo(bridgeTypeMeta('tom').defaultSpacing, 5);
  });

  it('selecting Floyd Rose promotes a standard nut to locking', () => {
    expect(useDesignStore.getState().nutSettings.type).toBe('standard');
    useDesignStore.getState().setBridgeType('floyd-rose');
    expect(useDesignStore.getState().nutSettings.type).toBe('locking');
  });

  it('setShowStrings toggles the strings layer', () => {
    useDesignStore.getState().setShowStrings(true);
    expect(useDesignStore.getState().layers.strings.visible).toBe(true);
    useDesignStore.getState().setShowStrings(false);
    expect(useDesignStore.getState().layers.strings.visible).toBe(false);
  });

  it('setStringCount rebuilds saddles and suggests wider spacing', () => {
    useDesignStore.getState().setStringCount(8);
    const s = useDesignStore.getState();
    expect(s.bridgeSettings.stringCount).toBe(8);
    expect(s.hardware.saddles).toHaveLength(8);
    expect(s.bridgeSettings.stringSpacing).toBeGreaterThan(52.5);
    expect(s.nutSettings.stringSpacing).toBeGreaterThan(35);
    const span = s.hardware.saddles[7].y - s.hardware.saddles[0].y;
    expect(span).toBeCloseTo(s.bridgeSettings.stringSpacing, 5);
  });

  it('setStringCount clamps to 6–12', () => {
    useDesignStore.getState().setStringCount(3);
    expect(useDesignStore.getState().bridgeSettings.stringCount).toBe(6);
    useDesignStore.getState().setStringCount(99);
    expect(useDesignStore.getState().bridgeSettings.stringCount).toBe(12);
  });
});

describe('design document migration', () => {
  it('upgrades a v2 document with bridge/nut defaults and a strings layer', () => {
    const tele = getBodyTemplate('tele');
    const v2 = {
      version: 2,
      templateId: tele.id,
      bodyParams: { ...tele.defaultParams },
      bodyAnchors: computeParametricAnchors(tele, tele.defaultParams),
      neckParams: { ...tele.defaultNeckParams },
      hardware: structuredClone(tele.defaultHardware),
      settings: {
        unit: 'mm',
        theme: 'dark',
        view: 'top',
        gridSize: 5,
        gridSnapEnabled: false,
        showPointsAndHandles: true,
        showDebugOverlay: false,
        canvasPadding: 40,
      },
      layers: defaultLayers(),
    };
    // Simulate a pre-strings layer registry.
    delete (v2.layers as { strings?: unknown }).strings;

    const migrated = migrateDesignDocument(v2 as unknown as Record<string, unknown>);
    expect(migrated.version).toBe(DESIGN_DOCUMENT_VERSION);
    expect(migrated.bridgeSettings).toBeTruthy();
    expect(migrated.nutSettings).toBeTruthy();
    expect((migrated.layers as { strings: { visible: boolean } }).strings).toBeTruthy();
  });
});

describe('SVG export with strings', () => {
  it('includes string lines when the strings layer is visible', () => {
    const tele = getBodyTemplate('tele');
    const layers = defaultLayers();
    layers.strings.visible = true;
    const doc = {
      version: DESIGN_DOCUMENT_VERSION,
      templateId: tele.id,
      bodyParams: { ...tele.defaultParams },
      bodyAnchors: computeParametricAnchors(tele, tele.defaultParams),
      neckParams: { ...tele.defaultNeckParams },
      hardware: structuredClone(tele.defaultHardware),
      bridgeSettings: { ...DEFAULT_BRIDGE_SETTINGS },
      nutSettings: { ...DEFAULT_NUT_SETTINGS },
      headstockSettings: { type: 'paddle' as const, length: 175, tipWidth: 68, earWidth: 30, showTuners: true, tunerLayout: '6-inline' as const },
      settings: {
        unit: 'mm' as const,
        theme: 'dark' as const,
        view: 'top' as const,
        gridSize: 5,
        gridSnapEnabled: false,
        showPointsAndHandles: true,
        showDebugOverlay: false,
        canvasPadding: 40,
      },
      layers,
    };
    const svg = buildSvgDocument(doc, 'clean');
    expect(svg).toMatch(/<g id="strings"/);
    expect(svg.match(/<line /g)?.length ?? 0).toBeGreaterThanOrEqual(6);
  });

  it('omits string lines from fabrication exports even if the layer is on', () => {
    const tele = getBodyTemplate('tele');
    const layers = defaultLayers();
    layers.strings.visible = true;
    const doc = {
      version: DESIGN_DOCUMENT_VERSION,
      templateId: tele.id,
      bodyParams: { ...tele.defaultParams },
      bodyAnchors: computeParametricAnchors(tele, tele.defaultParams),
      neckParams: { ...tele.defaultNeckParams },
      hardware: structuredClone(tele.defaultHardware),
      bridgeSettings: { ...DEFAULT_BRIDGE_SETTINGS },
      nutSettings: { ...DEFAULT_NUT_SETTINGS },
      headstockSettings: { type: 'headless' as const, length: 40, tipWidth: 40, earWidth: 20, showTuners: false, tunerLayout: 'none' as const },
      settings: {
        unit: 'mm' as const,
        theme: 'dark' as const,
        view: 'top' as const,
        gridSize: 5,
        gridSnapEnabled: false,
        showPointsAndHandles: true,
        showDebugOverlay: false,
        canvasPadding: 40,
      },
      layers,
    };
    const svg = buildSvgDocument(doc, 'fabrication');
    expect(svg).toMatch(/<g id="strings"><\/g>/);
  });
});
