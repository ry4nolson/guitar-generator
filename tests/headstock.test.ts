import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeHeadstockOutlineLocal,
  computeHeadstockOutlineBody,
  computeTunerPositions,
  DEFAULT_HEADSTOCK_SETTINGS,
  LEGACY_HEADLESS_SETTINGS,
} from '../src/geometry/headstock';
import { DEFAULT_NECK_PARAMS } from '../src/geometry/neckParams';
import { trebleFanOffset } from '../src/geometry/frets';
import { useDesignStore } from '../src/state/store';
import { migrateDesignDocument, DESIGN_DOCUMENT_VERSION } from '../src/export/migrateDocument';
import { getBodyTemplate } from '../src/geometry/templates';
import { computeParametricAnchors } from '../src/geometry/bodyModel';
import { defaultLayers } from '../src/state/layers';
import { DEFAULT_BRIDGE_SETTINGS } from '../src/geometry/bridgeTypes';

describe('headstock geometry', () => {
  it('returns null outline for headless', () => {
    expect(computeHeadstockOutlineLocal(DEFAULT_NECK_PARAMS, LEGACY_HEADLESS_SETTINGS)).toBeNull();
  });

  it('builds a closed paddle outline behind the (possibly fanned) nut line', () => {
    const local = computeHeadstockOutlineLocal(DEFAULT_NECK_PARAMS, DEFAULT_HEADSTOCK_SETTINGS)!;
    expect(local.length).toBeGreaterThanOrEqual(6);
    // No point may extend past the nut line; the treble base corner sits ON it.
    const nutLineMax = Math.max(0, trebleFanOffset(DEFAULT_NECK_PARAMS));
    expect(local.every((p) => p.x <= nutLineMax + 1e-9)).toBe(true);
    const trebleBase = local[local.length - 1];
    expect(trebleBase.x).toBeCloseTo(trebleFanOffset(DEFAULT_NECK_PARAMS), 9);
    const body = computeHeadstockOutlineBody(DEFAULT_NECK_PARAMS, DEFAULT_HEADSTOCK_SETTINGS, {
      joinPoint: { x: 30, y: 0 },
    });
    expect(body).toHaveLength(local.length);
  });

  it('places 6 inline tuners on a paddle headstock', () => {
    const tuners = computeTunerPositions(
      DEFAULT_NECK_PARAMS,
      DEFAULT_HEADSTOCK_SETTINGS,
      { joinPoint: { x: 25, y: 0 } },
      [],
    );
    expect(tuners).toHaveLength(6);
  });

  it('places N inline tuners when stringCount is higher', () => {
    const tuners = computeTunerPositions(
      DEFAULT_NECK_PARAMS,
      DEFAULT_HEADSTOCK_SETTINGS,
      { joinPoint: { x: 25, y: 0 } },
      [],
      8,
    );
    expect(tuners).toHaveLength(8);
  });

  it('places 6 bridge-end tuners for headless layout', () => {
    const tuners = computeTunerPositions(
      DEFAULT_NECK_PARAMS,
      { ...LEGACY_HEADLESS_SETTINGS, showTuners: true, tunerLayout: 'headless' },
      { joinPoint: { x: 25, y: 0 } },
      [
        { x: 200, y: -20, rotation: 0, visible: true, locked: false },
        { x: 200, y: -10, rotation: 0, visible: true, locked: false },
        { x: 200, y: 0, rotation: 0, visible: true, locked: false },
        { x: 200, y: 10, rotation: 0, visible: true, locked: false },
        { x: 200, y: 20, rotation: 0, visible: true, locked: false },
        { x: 200, y: 30, rotation: 0, visible: true, locked: false },
      ],
    );
    expect(tuners).toHaveLength(6);
  });
});

describe('headstock store actions', () => {
  beforeEach(() => {
    useDesignStore.getState().resetToDefaults();
  });

  it('defaults to a paddle headstock with 6-inline tuners', () => {
    const s = useDesignStore.getState().headstockSettings;
    expect(s.type).toBe('paddle');
    expect(s.tunerLayout).toBe('6-inline');
  });

  it('switching to headless sets bridge-end tuner layout', () => {
    useDesignStore.getState().setHeadstockType('headless');
    const s = useDesignStore.getState().headstockSettings;
    expect(s.type).toBe('headless');
    expect(s.tunerLayout).toBe('headless');
  });

  it('switching to 3×3 sets 3×3 tuners', () => {
    useDesignStore.getState().setHeadstockType('3x3');
    expect(useDesignStore.getState().headstockSettings.tunerLayout).toBe('3x3');
  });
});

describe('v4 → v5 migration adds headstock settings', () => {
  it('preserves a headless look for legacy documents', () => {
    const tele = getBodyTemplate('tele');
    const v4 = {
      version: 4,
      templateId: tele.id,
      bodyParams: { ...tele.defaultParams },
      bodyAnchors: computeParametricAnchors(tele, tele.defaultParams),
      neckParams: { ...tele.defaultNeckParams },
      hardware: structuredClone(tele.defaultHardware),
      bridgeSettings: { ...DEFAULT_BRIDGE_SETTINGS },
      nutSettings: { type: 'standard', stringSpacing: 35, thickness: 5 },
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
    const migrated = migrateDesignDocument(v4 as unknown as Record<string, unknown>);
    expect(migrated.version).toBe(DESIGN_DOCUMENT_VERSION);
    const hs = migrated.headstockSettings as { type: string; tunerLayout: string };
    expect(hs.type).toBe('headless');
    expect(hs.tunerLayout).toBe('headless');
  });
});
