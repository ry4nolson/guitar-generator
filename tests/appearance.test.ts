import { describe, it, expect, beforeEach } from 'vitest';
import { darkenHex } from '../src/geometry/color';
import { useDesignStore, DEFAULT_BODY_COLOR, DEFAULT_FRETBOARD_COLOR } from '../src/state/store';
import { migrateDesignDocument, DESIGN_DOCUMENT_VERSION } from '../src/export/migrateDocument';
import { getBodyTemplate } from '../src/geometry/templates';
import { computeParametricAnchors } from '../src/geometry/bodyModel';
import { defaultLayers } from '../src/state/layers';

describe('darkenHex', () => {
  it('mixes a hex color toward black', () => {
    expect(darkenHex('#ffffff', 0)).toBe('#ffffff');
    expect(darkenHex('#ffffff', 1)).toBe('#000000');
    expect(darkenHex('#d9c9a8', 0.18).startsWith('#')).toBe(true);
    expect(darkenHex('#d9c9a8', 0.18)).not.toBe('#d9c9a8');
  });
});

describe('appearance settings', () => {
  beforeEach(() => {
    useDesignStore.getState().resetToDefaults();
  });

  it('defaults body and fretboard colors', () => {
    const s = useDesignStore.getState().settings;
    expect(s.bodyColor).toBe(DEFAULT_BODY_COLOR);
    expect(s.fretboardColor).toBe(DEFAULT_FRETBOARD_COLOR);
  });

  it('setBodyColor / setFretboardColor update settings', () => {
    useDesignStore.getState().setBodyColor('#112233');
    useDesignStore.getState().setFretboardColor('#445566');
    const s = useDesignStore.getState().settings;
    expect(s.bodyColor).toBe('#112233');
    expect(s.fretboardColor).toBe('#445566');
  });
});

describe('v6 → v7 migration', () => {
  it('rotates a legacy −25° blade selector to 65° and fills finish colors', () => {
    const tele = getBodyTemplate('tele');
    const anchors = computeParametricAnchors(tele, tele.defaultParams);
    const hardware = structuredClone(tele.defaultHardware);
    hardware.selector = { ...hardware.selector, rotation: -25, visible: true };

    const v6 = {
      version: 6,
      templateId: tele.id,
      bodyParams: { ...tele.defaultParams },
      bodyAnchors: anchors,
      neckParams: { ...tele.defaultNeckParams },
      hardware,
      pickupSettings: { neck: 'single-coil', middle: 'none', bridge: 'humbucker' },
      controlSettings: { volumes: 1, tones: 1, selector: 'blade-3' },
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

    const migrated = migrateDesignDocument(v6 as unknown as Record<string, unknown>);
    expect(migrated.version).toBe(DESIGN_DOCUMENT_VERSION);
    const hw = migrated.hardware as typeof hardware;
    expect(hw.selector.rotation).toBe(65);
    const settings = migrated.settings as { bodyColor: string; fretboardColor: string };
    expect(settings.bodyColor).toBe('#d9c9a8');
    expect(settings.fretboardColor).toBe('#caa46a');
  });

  it('leaves a custom blade angle alone', () => {
    const tele = getBodyTemplate('tele');
    const anchors = computeParametricAnchors(tele, tele.defaultParams);
    const hardware = structuredClone(tele.defaultHardware);
    hardware.selector = { ...hardware.selector, rotation: 12, visible: true };

    const v6 = {
      version: 6,
      templateId: tele.id,
      bodyParams: { ...tele.defaultParams },
      bodyAnchors: anchors,
      neckParams: { ...tele.defaultNeckParams },
      hardware,
      controlSettings: { volumes: 1, tones: 0, selector: 'blade-5' },
      settings: {},
      layers: defaultLayers(),
    };

    const migrated = migrateDesignDocument(v6 as unknown as Record<string, unknown>);
    const hw = migrated.hardware as typeof hardware;
    expect(hw.selector.rotation).toBe(12);
  });
});
