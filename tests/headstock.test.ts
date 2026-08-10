import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeHeadstockOutlineLocal,
  computeTunerPositions,
  seedHeadstockAnchors,
  syncHeadstockNutCorners,
  mapStringIndexToTunerIndex,
  NUT_BASS_ID,
  NUT_TREBLE_ID,
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

describe('headstock anchors', () => {
  it('seeds locked nut corners and free mid points', () => {
    const anchors = seedHeadstockAnchors(DEFAULT_NECK_PARAMS, DEFAULT_HEADSTOCK_SETTINGS, 6);
    expect(anchors.length).toBeGreaterThanOrEqual(6);
    expect(anchors[0].id).toBe(NUT_BASS_ID);
    expect(anchors[0].locked).toBe(true);
    expect(anchors[anchors.length - 1].id).toBe(NUT_TREBLE_ID);
    expect(anchors[anchors.length - 1].locked).toBe(true);
    expect(anchors.slice(1, -1).every((a) => !a.locked)).toBe(true);
  });

  it('keeps nut corners on the nut face after sync', () => {
    const seeded = seedHeadstockAnchors(DEFAULT_NECK_PARAMS, DEFAULT_HEADSTOCK_SETTINGS, 6);
    const moved = seeded.map((a, i) =>
      i === 0 ? { ...a, position: { x: -10, y: 99 } } : a,
    );
    const synced = syncHeadstockNutCorners(moved, DEFAULT_NECK_PARAMS);
    expect(synced[0].position).toEqual({ x: 0, y: DEFAULT_NECK_PARAMS.nutWidth / 2 });
    expect(synced[synced.length - 1].position.x).toBeCloseTo(trebleFanOffset(DEFAULT_NECK_PARAMS), 9);
  });

  it('returns null outline for headless', () => {
    expect(computeHeadstockOutlineLocal(DEFAULT_NECK_PARAMS, LEGACY_HEADLESS_SETTINGS)).toBeNull();
    expect(seedHeadstockAnchors(DEFAULT_NECK_PARAMS, LEGACY_HEADLESS_SETTINGS)).toEqual([]);
  });

  it('places tuners from editable anchors', () => {
    const anchors = seedHeadstockAnchors(DEFAULT_NECK_PARAMS, DEFAULT_HEADSTOCK_SETTINGS, 8);
    const tuners = computeTunerPositions(
      DEFAULT_NECK_PARAMS,
      DEFAULT_HEADSTOCK_SETTINGS,
      { joinPoint: { x: 25, y: 0 } },
      [],
      8,
      anchors,
    );
    expect(tuners).toHaveLength(8);
  });
});

describe('headstock store actions', () => {
  beforeEach(() => {
    useDesignStore.getState().resetToDefaults();
  });

  it('defaults to paddle anchors with locked nut corners', () => {
    const s = useDesignStore.getState();
    expect(s.headstockSettings.type).toBe('paddle');
    expect(s.headstockAnchors[0].locked).toBe(true);
    expect(s.headstockAnchors[s.headstockAnchors.length - 1].locked).toBe(true);
  });

  it('switching type re-seeds the outline', () => {
    useDesignStore.getState().setHeadstockType('pointy');
    const s = useDesignStore.getState();
    expect(s.headstockSettings.type).toBe('pointy');
    expect(s.headstockAnchors.length).toBeGreaterThan(4);
    expect(s.headstockSettings.tunerLayout).toBe('6-inline');
  });

  it('moves a free headstock point in body space', () => {
    const id = useDesignStore.getState().headstockAnchors.find((a) => !a.locked)!.id;
    const before = useDesignStore.getState().headstockAnchors.find((a) => a.id === id)!;
    useDesignStore.getState().moveHeadstockAnchor(id, 'position', {
      x: before.position.x + 1000, // will convert — just ensure it updates
      y: before.position.y,
    });
    const after = useDesignStore.getState().headstockAnchors.find((a) => a.id === id)!;
    expect(after.manuallyEdited).toBe(true);
    expect(after.position.x).not.toBeCloseTo(before.position.x, 5);
  });

  it('refuses to move locked nut corners', () => {
    const before = useDesignStore.getState().headstockAnchors[0].position;
    useDesignStore.getState().moveHeadstockAnchor(NUT_BASS_ID, 'position', { x: 1, y: 1 });
    expect(useDesignStore.getState().headstockAnchors[0].position).toEqual(before);
  });

  it('adds and removes free outline points', () => {
    const beforeLen = useDesignStore.getState().headstockAnchors.length;
    useDesignStore.getState().insertHeadstockAnchor(NUT_BASS_ID);
    expect(useDesignStore.getState().headstockAnchors.length).toBe(beforeLen + 1);
    const neu = useDesignStore.getState().selected;
    expect(neu?.kind).toBe('headstock');
    if (neu?.kind === 'headstock') {
      useDesignStore.getState().removeHeadstockAnchor(neu.id);
      expect(useDesignStore.getState().headstockAnchors.length).toBe(beforeLen);
    }
  });
});

describe('string→tuner mapping', () => {
  it('maps inline 1:1 and split treble/bass correctly', () => {
    expect(mapStringIndexToTunerIndex(0, 6, '6-inline')).toBe(0);
    expect(mapStringIndexToTunerIndex(5, 6, '6-inline')).toBe(5);
    // 3×3: high E → first treble peg (index 3), low E → last bass peg (index 2)
    expect(mapStringIndexToTunerIndex(0, 6, '3x3')).toBe(3);
    expect(mapStringIndexToTunerIndex(2, 6, '3x3')).toBe(5);
    expect(mapStringIndexToTunerIndex(3, 6, '3x3')).toBe(0);
    expect(mapStringIndexToTunerIndex(5, 6, '3x3')).toBe(2);
  });
});

describe('v8 → v9 migration seeds headstock anchors', () => {
  it('adds anchors when missing', () => {
    const tele = getBodyTemplate('tele');
    const v8 = {
      version: 8,
      templateId: tele.id,
      bodyParams: { ...tele.defaultParams },
      bodyAnchors: computeParametricAnchors(tele, tele.defaultParams),
      neckParams: { ...tele.defaultNeckParams },
      hardware: structuredClone(tele.defaultHardware),
      bridgeSettings: { ...DEFAULT_BRIDGE_SETTINGS },
      nutSettings: { type: 'standard', stringSpacing: 35, thickness: 5 },
      headstockSettings: { ...DEFAULT_HEADSTOCK_SETTINGS },
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
    const migrated = migrateDesignDocument(v8 as unknown as Record<string, unknown>);
    expect(migrated.version).toBe(DESIGN_DOCUMENT_VERSION);
    const hs = migrated.headstockAnchors as { id: string; locked: boolean }[];
    expect(hs.length).toBeGreaterThan(4);
    expect(hs[0].locked).toBe(true);
  });
});
