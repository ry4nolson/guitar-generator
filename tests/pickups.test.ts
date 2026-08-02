import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_NECK_PARAMS } from '../src/geometry/neckParams';
import { DEFAULT_BRIDGE_SETTINGS } from '../src/geometry/bridgeTypes';
import {
  PICKUP_DIMENSIONS,
  DEFAULT_CONTROL_SETTINGS,
  defaultPickupPositions,
  layoutControlKnobs,
  controlKnobLabel,
  defaultSelectorPosition,
} from '../src/geometry/pickups';
import { neckJoinPoint } from '../src/geometry/scaleLock';
import { useDesignStore } from '../src/state/store';
import { migrateDesignDocument, DESIGN_DOCUMENT_VERSION } from '../src/export/migrateDocument';
import { getBodyTemplate } from '../src/geometry/templates';
import { computeParametricAnchors } from '../src/geometry/bodyModel';
import { defaultLayers } from '../src/state/layers';
import { LEGACY_HEADLESS_SETTINGS } from '../src/geometry/headstock';

describe('pickup dimensions', () => {
  it('uses real-world footprints, not decorative sizes', () => {
    // Full-size humbucker ≈ 70 mm across the strings × 38 mm along them.
    expect(PICKUP_DIMENSIONS.humbucker.across).toBe(70);
    expect(PICKUP_DIMENSIONS.humbucker.along).toBe(38);
    // Single coil is the same width but much narrower along the strings.
    expect(PICKUP_DIMENSIONS['single-coil'].across).toBe(70);
    expect(PICKUP_DIMENSIONS['single-coil'].along).toBeLessThan(20);
    // P90 soapbar is the widest of the three.
    expect(PICKUP_DIMENSIONS.p90.across).toBeGreaterThan(80);
  });
});

describe('default pickup placement', () => {
  const join = { x: 30, y: 0 };
  const neck = { ...DEFAULT_NECK_PARAMS, neckAngle: 0 };

  it('orders slots neck < middle < bridge along the strings', () => {
    const [neckPos, middlePos, bridgePos] = defaultPickupPositions(neck, { joinPoint: join });
    expect(neckPos.x).toBeLessThan(middlePos.x);
    expect(middlePos.x).toBeLessThan(bridgePos.x);
  });

  it('puts the bridge pickup 45mm in front of the bass scale line', () => {
    const [, , bridgePos] = defaultPickupPositions(neck, { joinPoint: join });
    const nutX = join.x - neck.neckLength;
    expect(bridgePos.x - nutX).toBeCloseTo(neck.bassScale - 45, 5);
  });

  it('keeps the neck pickup clear of the fretboard end', () => {
    const [neckPos] = defaultPickupPositions(neck, { joinPoint: join });
    const nutX = join.x - neck.neckLength;
    expect(neckPos.x - nutX).toBeGreaterThan(neck.neckLength);
  });
});

describe('control knob layout', () => {
  const join = { x: 30, y: 0 };
  const neck = { ...DEFAULT_NECK_PARAMS, neckAngle: 0 };

  it('creates volumes + tones knobs behind the bridge on the treble side', () => {
    const knobs = layoutControlKnobs(neck, { joinPoint: join }, { volumes: 1, tones: 2, selector: 'none' });
    expect(knobs).toHaveLength(3);
    const nutX = join.x - neck.neckLength;
    for (const k of knobs) {
      expect(k.x - nutX).toBeGreaterThan(neck.bassScale); // behind the bridge
      expect(k.y).toBeLessThan(0); // treble side
    }
  });

  it('preserves prior knob positions when adding knobs', () => {
    const settings = { volumes: 1, tones: 0, selector: 'none' } as const;
    const first = layoutControlKnobs(neck, { joinPoint: join }, settings);
    const moved = [{ ...first[0], x: 999, y: -12 }];
    const grown = layoutControlKnobs(neck, { joinPoint: join }, { ...settings, tones: 1 }, moved);
    expect(grown[0].x).toBe(999);
    expect(grown).toHaveLength(2);
  });

  it('labels knobs volumes-first', () => {
    const settings = { volumes: 2, tones: 1, selector: 'none' } as const;
    expect(controlKnobLabel(settings, 0)).toBe('Volume 1');
    expect(controlKnobLabel(settings, 2)).toBe('Tone');
  });

  it('places a toggle selector on the bass side and a blade on the treble side', () => {
    const toggle = defaultSelectorPosition('toggle', neck, { joinPoint: join });
    const blade = defaultSelectorPosition('blade-5', neck, { joinPoint: join });
    expect(toggle.position.y).toBeGreaterThan(0);
    expect(blade.position.y).toBeLessThan(0);
  });
});

describe('pickup/control store actions', () => {
  beforeEach(() => {
    useDesignStore.getState().resetToDefaults();
  });

  it('defaults to neck single-coil + bridge humbucker with vol/tone and a 3-way', () => {
    const s = useDesignStore.getState();
    expect(s.pickupSettings).toEqual({ neck: 'single-coil', middle: 'none', bridge: 'humbucker' });
    expect(s.hardware.pickups[0].visible).toBe(true);
    expect(s.hardware.pickups[1].visible).toBe(false);
    expect(s.hardware.pickups[2].visible).toBe(true);
    expect(s.hardware.controls).toHaveLength(2);
    expect(s.controlSettings.selector).toBe('blade-3');
    expect(s.hardware.selector.visible).toBe(true);
  });

  it('setPickupType toggles slot visibility and seats new pickups at slot defaults', () => {
    useDesignStore.getState().setPickupType('middle', 'p90');
    let s = useDesignStore.getState();
    expect(s.hardware.pickups[1].visible).toBe(true);
    const [, expectedMiddle] = defaultPickupPositions(s.neckParams, {
      joinPoint: neckJoinPoint(s.bodyAnchors),
    });
    expect(s.hardware.pickups[1].x).toBeCloseTo(expectedMiddle.x, 5);

    useDesignStore.getState().setPickupType('middle', 'none');
    s = useDesignStore.getState();
    expect(s.hardware.pickups[1].visible).toBe(false);
  });

  it('setControlSetting resizes the knob list without moving existing knobs', () => {
    const before = useDesignStore.getState().hardware.controls[0];
    useDesignStore.getState().setControlSetting('tones', 2);
    const s = useDesignStore.getState();
    expect(s.hardware.controls).toHaveLength(3);
    expect(s.hardware.controls[0]).toEqual(before);
  });

  it('setControlSetting hides/shows the selector', () => {
    useDesignStore.getState().setControlSetting('selector', 'none');
    expect(useDesignStore.getState().hardware.selector.visible).toBe(false);
    useDesignStore.getState().setControlSetting('selector', 'toggle');
    const s = useDesignStore.getState();
    expect(s.hardware.selector.visible).toBe(true);
    expect(s.hardware.selector.y).toBeGreaterThan(0); // reseated to bass-side toggle spot
  });
});

describe('v5 → v6 migration', () => {
  it('converts bridgeHumbucker/volumeKnob into pickup/control slots in place', () => {
    const tele = getBodyTemplate('tele');
    const anchors = computeParametricAnchors(tele, tele.defaultParams);
    const newHardware = structuredClone(tele.defaultHardware);
    const legacyHardware = {
      bridgeHumbucker: { x: 250, y: 2, rotation: 0, visible: true, locked: false },
      volumeKnob: { x: 300, y: -50, rotation: 0, visible: true, locked: true },
      saddles: newHardware.saddles,
      neckBolts: newHardware.neckBolts,
    };

    const v5 = {
      version: 5,
      templateId: tele.id,
      bodyParams: { ...tele.defaultParams },
      bodyAnchors: anchors,
      neckParams: { ...tele.defaultNeckParams },
      hardware: legacyHardware,
      bridgeSettings: { ...DEFAULT_BRIDGE_SETTINGS },
      nutSettings: { type: 'standard', stringSpacing: 35, thickness: 5 },
      headstockSettings: { ...LEGACY_HEADLESS_SETTINGS },
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

    const migrated = migrateDesignDocument(v5 as unknown as Record<string, unknown>);
    expect(migrated.version).toBe(DESIGN_DOCUMENT_VERSION);
    const hw = migrated.hardware as typeof newHardware;
    // Legacy bridge pickup and volume knob keep their exact positions.
    expect(hw.pickups[2]).toMatchObject({ x: 250, y: 2 });
    expect(hw.controls[0]).toMatchObject({ x: 300, y: -50, locked: true });
    // Legacy docs stay visually identical: only the bridge slot is populated.
    expect(migrated.pickupSettings).toEqual({ neck: 'none', middle: 'none', bridge: 'humbucker' });
    expect(migrated.controlSettings).toEqual({ volumes: 1, tones: 0, selector: 'none' });
    expect(hw.selector.visible).toBe(false);
  });

  it('leaves already-current hardware untouched but fills default settings', () => {
    const tele = getBodyTemplate('tele');
    const anchors = computeParametricAnchors(tele, tele.defaultParams);
    const hardware = structuredClone(tele.defaultHardware);
    const v5 = {
      version: 5,
      templateId: tele.id,
      bodyParams: { ...tele.defaultParams },
      bodyAnchors: anchors,
      neckParams: { ...tele.defaultNeckParams },
      hardware,
      layers: defaultLayers(),
    };
    const migrated = migrateDesignDocument(v5 as unknown as Record<string, unknown>);
    expect(migrated.hardware).toEqual(hardware);
    expect(migrated.pickupSettings).toBeDefined();
    expect(migrated.controlSettings).toEqual(DEFAULT_CONTROL_SETTINGS);
  });
});
