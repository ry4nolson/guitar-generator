import { describe, it, expect, beforeEach } from 'vitest';
import { darkenHex, lightenHex, bodyFinishStops, LEGACY_BODY_COLOR, LEGACY_FRETBOARD_COLOR, DEFAULT_HEADSTOCK_COLOR } from '../src/geometry/color';
import { useDesignStore, DEFAULT_BODY_COLOR, DEFAULT_FRETBOARD_COLOR } from '../src/state/store';
import { migrateDesignDocument, DESIGN_DOCUMENT_VERSION } from '../src/export/migrateDocument';
import { neckJoinPoint } from '../src/geometry/scaleLock';
import { getBodyTemplate } from '../src/geometry/templates';
import { computeParametricAnchors } from '../src/geometry/bodyModel';
import { defaultLayers } from '../src/state/layers';

describe('hex finish helpers', () => {
  it('mixes a hex color toward black', () => {
    expect(darkenHex('#ffffff', 0)).toBe('#ffffff');
    expect(darkenHex('#ffffff', 1)).toBe('#000000');
    expect(darkenHex('#d9c9a8', 0.18).startsWith('#')).toBe(true);
    expect(darkenHex('#d9c9a8', 0.18)).not.toBe('#d9c9a8');
  });

  it('mixes a hex color toward white', () => {
    expect(lightenHex('#000000', 0)).toBe('#000000');
    expect(lightenHex('#000000', 1)).toBe('#ffffff');
    expect(lightenHex('#c9973d', 0.28)).not.toBe('#c9973d');
  });

  it('builds a three-stop burst from a solid body color', () => {
    const stops = bodyFinishStops('#c9973d');
    expect(stops.mid).toBe('#c9973d');
    expect(stops.center).not.toBe(stops.mid);
    expect(stops.rim).not.toBe(stops.mid);
  });

  it('keeps black and white finishes nearly solid', () => {
    const black = bodyFinishStops('#1c1c1c');
    const white = bodyFinishStops('#f4f0e6');
    expect(black.center).not.toBe('#ffffff');
    expect(white.rim).not.toBe('#000000');
    expect(black.rim).not.toBe(black.mid);
  });
});

describe('appearance settings', () => {
  beforeEach(() => {
    useDesignStore.getState().resetToDefaults();
  });

  it('defaults body, fretboard, and headstock colors', () => {
    const s = useDesignStore.getState().settings;
    expect(s.bodyColor).toBe(DEFAULT_BODY_COLOR);
    expect(s.fretboardColor).toBe(DEFAULT_FRETBOARD_COLOR);
    expect(s.headstockColor).toBe(DEFAULT_HEADSTOCK_COLOR);
  });

  it('setBodyColor / setFretboardColor / setHeadstockColor update settings', () => {
    useDesignStore.getState().setBodyColor('#112233');
    useDesignStore.getState().setFretboardColor('#445566');
    useDesignStore.getState().setHeadstockColor('#778899');
    const s = useDesignStore.getState().settings;
    expect(s.bodyColor).toBe('#112233');
    expect(s.fretboardColor).toBe('#445566');
    expect(s.headstockColor).toBe('#778899');
  });

  it('defaults and clamps tracing opacities', () => {
    const s = useDesignStore.getState().settings;
    expect(s.bodyOpacity).toBe(1);
    expect(s.neckOpacity).toBe(1);
    expect(s.headstockOpacity).toBe(1);
    useDesignStore.getState().setNeckOpacity(0.4);
    useDesignStore.getState().setHeadstockOpacity(0.01);
    expect(useDesignStore.getState().settings.neckOpacity).toBe(0.4);
    expect(useDesignStore.getState().settings.headstockOpacity).toBe(0.05);
  });
});

describe('v6 → current migration', () => {
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
    const settings = migrated.settings as {
      bodyColor: string;
      fretboardColor: string;
      headstockColor: string;
      neckOpacity: number;
      headstockOpacity: number;
    };
    expect(settings.bodyColor).toBe(DEFAULT_BODY_COLOR);
    expect(settings.fretboardColor).toBe(DEFAULT_FRETBOARD_COLOR);
    expect(settings.headstockColor).toBe(DEFAULT_HEADSTOCK_COLOR);
    expect(settings.neckOpacity).toBe(1);
    expect(settings.headstockOpacity).toBe(1);
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

  it('upgrades the old plywood CAD fills to the new wood defaults', () => {
    const tele = getBodyTemplate('tele');
    const migrated = migrateDesignDocument({
      version: 6,
      templateId: tele.id,
      bodyParams: { ...tele.defaultParams },
      bodyAnchors: computeParametricAnchors(tele, tele.defaultParams),
      neckParams: { ...tele.defaultNeckParams },
      hardware: structuredClone(tele.defaultHardware),
      settings: { bodyColor: LEGACY_BODY_COLOR, fretboardColor: LEGACY_FRETBOARD_COLOR },
      layers: defaultLayers(),
    } as unknown as Record<string, unknown>);
    const settings = migrated.settings as { bodyColor: string; fretboardColor: string };
    expect(settings.bodyColor).toBe(DEFAULT_BODY_COLOR);
    expect(settings.fretboardColor).toBe(DEFAULT_FRETBOARD_COLOR);
  });

  it('leaves a custom finish alone', () => {
    const tele = getBodyTemplate('tele');
    const migrated = migrateDesignDocument({
      version: 6,
      templateId: tele.id,
      bodyParams: { ...tele.defaultParams },
      bodyAnchors: computeParametricAnchors(tele, tele.defaultParams),
      neckParams: { ...tele.defaultNeckParams },
      hardware: structuredClone(tele.defaultHardware),
      settings: { bodyColor: '#112233', fretboardColor: '#445566' },
      layers: defaultLayers(),
    } as unknown as Record<string, unknown>);
    const settings = migrated.settings as { bodyColor: string; fretboardColor: string };
    expect(settings.bodyColor).toBe('#112233');
    expect(settings.fretboardColor).toBe('#445566');
  });

  it('snaps legacy body-space neck bolts onto the heel (V.json-style)', () => {
    const tele = getBodyTemplate('tele');
    const anchors = computeParametricAnchors(tele, tele.defaultParams);
    const neck = { ...tele.defaultNeckParams, neckInset: 55 };
    const heelX = neckJoinPoint(anchors, neck).x;
    const hardware = structuredClone(tele.defaultHardware);
    // Old axis-aligned pattern with a row past the heel tip.
    hardware.neckBolts = [
      { x: heelX - 5, y: 16, rotation: 0, visible: true, locked: false },
      { x: heelX - 5, y: -16, rotation: 0, visible: true, locked: false },
      { x: heelX + 37, y: 16, rotation: 0, visible: true, locked: false },
      { x: heelX + 37, y: -16, rotation: 0, visible: true, locked: false },
    ];

    const v6 = {
      version: 6,
      templateId: tele.id,
      bodyParams: { ...tele.defaultParams },
      bodyAnchors: anchors,
      neckParams: neck,
      hardware,
      controlSettings: { volumes: 1, tones: 1, selector: 'blade-3' },
      settings: {},
      layers: defaultLayers(),
    };

    const migrated = migrateDesignDocument(v6 as unknown as Record<string, unknown>);
    expect(migrated.version).toBe(DESIGN_DOCUMENT_VERSION);
    const bolts = (migrated.hardware as typeof hardware).neckBolts;
    expect(bolts.every((b) => b.x < heelX - 1)).toBe(true);
    expect(bolts.every((b) => b.x > heelX - neck.neckInset - 1)).toBe(true);
  });
});
