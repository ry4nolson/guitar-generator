import { describe, it, expect, beforeEach } from 'vitest';
import { migrateDesignDocument } from '../src/export/migrateDocument';
import { NECK_PARAM_META } from '../src/geometry/neckParams';
import { getBodyTemplate } from '../src/geometry/templates';
import { LAYER_IDS } from '../src/state/layers';
import {
  APP_SETTINGS_KEY,
  loadAppSettings,
  type AppSettings,
} from '../src/state/appSettings';
import {
  loadReferenceOverlays,
  saveReferenceOverlays,
} from '../src/state/referenceOverlay';
import { AUTOSAVE_KEY, useDesignStore } from '../src/state/store';

describe('design autosave', () => {
  beforeEach(() => {
    localStorage.removeItem(AUTOSAVE_KEY);
    localStorage.removeItem(APP_SETTINGS_KEY);
    localStorage.removeItem('guitloft-reference-overlay-v3');
    useDesignStore.getState().resetToDefaults();
    useDesignStore.getState().resetAppSettings();
  });

  it('writes the current guitar to localStorage', () => {
    useDesignStore.getState().setNeckParam('fretCount', 24);
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as { neckParams: { fretCount: number } };
    expect(parsed.neckParams.fretCount).toBe(24);
  });

  it('keeps every sidebar setting after the refresh migration', () => {
    const store = useDesignStore.getState();
    const template = getBodyTemplate(store.templateId);

    for (const meta of template.paramMeta) {
      const current = store.bodyParams[meta.key];
      const next = current === meta.max ? meta.min : Math.min(meta.max, current + meta.step);
      useDesignStore.getState().setBodyParam(meta.key, next);
    }
    const s = useDesignStore.getState();
    // String count rewrites spacing and nut/heel; set it first, then the user's values.
    s.setStringCount(7);
    for (const meta of NECK_PARAM_META) {
      const current = useDesignStore.getState().neckParams[meta.key];
      const next = current === meta.max ? meta.min : Math.min(meta.max, current + meta.step);
      useDesignStore.getState().setNeckParam(meta.key, next);
    }

    s.setBridgeType('tom');
    s.setBridgeSetting('stringSpacing', 58);
    s.setBridgeSetting('saddleTravel', 14);
    s.setBridgeSetting('stopbarOffset', 42);
    s.setBridgeSetting('postSpacing', 74);
    s.setShowStrings(true);
    s.setNutType('compensated');
    s.setNutSetting('stringSpacing', 40);
    s.setNutSetting('thickness', 6);

    s.setHeadstockType('pointy');
    s.setHeadstockSetting('length', 200);
    s.setHeadstockSetting('tipWidth', 120);
    s.setHeadstockSetting('showTuners', true);
    s.setTunerLayout('6-inline');
    s.setHeadstockSetting('tunerInset', 18);
    // 0.2 used to be treated as a legacy default and wiped on every load.
    s.setHeadstockSetting('tunerTipClearance', 0.2);
    s.setHeadstockSetting('tunerNutClearance', 0.31);
    s.setHeadstockSetting('tunerEndMargin', 14);
    s.setHeadstockSetting('tunerPegAngleOffset', 15);

    s.setPickupType('neck', 'humbucker');
    s.setPickupType('middle', 'p90');
    s.setPickupType('bridge', 'single-coil');
    s.setControlSetting('volumes', 2);
    s.setControlSetting('tones', 2);
    s.setControlSetting('selector', 'toggle');
    s.setControlSetting('cavityPad', 22);
    s.setControlSetting('cavityRotationOffset', 12);
    s.rotateHardware('pickups', 8, 2);
    s.rotateHardware('selector', 40);

    s.moveHardware('tuners', { x: 12, y: -30 }, 0);
    const lockedTuner = useDesignStore.getState().hardware.tuners[0];

    s.setBodyColor('#112233');
    s.setFretboardColor('#445566');
    s.setHeadstockColor('#778899');
    s.setBodyOpacity(0.4);
    s.setNeckOpacity(0.55);
    s.setHeadstockOpacity(0.7);

    for (const id of LAYER_IDS) {
      s.setLayerVisible(id, id === 'strings' || id === 'dimensions');
      s.setLayerLocked(id, id === 'body' || id === 'hardware');
    }

    const app: AppSettings = {
      unit: 'mm',
      theme: 'light',
      view: 'back',
      gridSize: 12,
      gridSnapEnabled: true,
      showPointsAndHandles: false,
      showDebugOverlay: true,
      canvasPadding: 80,
      symmetricEditing: false,
    };
    s.setUnit(app.unit);
    s.setTheme(app.theme);
    s.setView(app.view);
    s.setGridSize(app.gridSize);
    s.toggleGridSnap();
    s.toggleShowPoints();
    s.toggleSymmetricEditing();
    s.toggleDebugOverlay();
    s.setCanvasPadding(app.canvasPadding);

    saveReferenceOverlays({
      activeId: 'ref-a',
      overlays: [
        {
          id: 'ref-a',
          visible: false,
          locked: true,
          opacity: 0.8,
          scale: 1.5,
          rotation: 15,
          offsetX: 20,
          offsetY: -10,
          flipH: true,
          flipV: true,
        },
      ],
    });

    const before = useDesignStore.getState();
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    expect(raw).toBeTruthy();
    const migrated = migrateDesignDocument(JSON.parse(raw!));

    expect(migrated.bodyParams).toEqual(before.bodyParams);
    expect(migrated.neckParams).toEqual(before.neckParams);
    expect(migrated.bridgeSettings).toEqual(before.bridgeSettings);
    expect(migrated.nutSettings).toEqual(before.nutSettings);
    expect(migrated.headstockSettings).toEqual(before.headstockSettings);
    expect(migrated.headstockSettings).toMatchObject({
      length: 200,
      tipWidth: 120,
      tunerTipClearance: 0.2,
      tunerNutClearance: 0.31,
    });
    expect(migrated.pickupSettings).toEqual(before.pickupSettings);
    expect(migrated.controlSettings).toEqual(before.controlSettings);
    expect(migrated.settings).toMatchObject({
      bodyColor: '#112233',
      fretboardColor: '#445566',
      headstockColor: '#778899',
      bodyOpacity: 0.4,
      neckOpacity: 0.55,
      headstockOpacity: 0.7,
    });
    expect(migrated.layers).toEqual(before.layers);
    expect(migrated.templateId).toBe(before.templateId);

    const tuners = (migrated.hardware as { tuners: { x: number; y: number; locked: boolean }[] }).tuners;
    expect(tuners[0]).toMatchObject({
      x: lockedTuner.x,
      y: lockedTuner.y,
      locked: true,
    });
    const pickups = (migrated.hardware as { pickups: { rotation: number }[] }).pickups;
    expect(pickups[2].rotation).toBe(8);
    const selector = (migrated.hardware as { selector: { rotation: number } }).selector;
    expect(selector.rotation).toBe(40);

    expect(loadAppSettings()).toEqual(app);
    expect(loadReferenceOverlays()).toEqual({
      activeId: 'ref-a',
      overlays: [
        {
          id: 'ref-a',
          visible: false,
          locked: true,
          opacity: 0.8,
          scale: 1.5,
          rotation: 15,
          offsetX: 20,
          offsetY: -10,
          flipH: true,
          flipV: true,
        },
      ],
    });
  });
});
