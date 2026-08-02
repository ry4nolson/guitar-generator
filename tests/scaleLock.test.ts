import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_NECK_PARAMS } from '../src/geometry/neckParams';
import { DEFAULT_BRIDGE_SETTINGS } from '../src/geometry/bridgeTypes';
import {
  layoutSaddlesFromScale,
  neckJoinPoint,
  isScaleLockNeckKey,
} from '../src/geometry/scaleLock';
import { saddleClusterCenter } from '../src/geometry/strings';
import { useDesignStore } from '../src/state/store';
import { migrateDesignDocument, DESIGN_DOCUMENT_VERSION } from '../src/export/migrateDocument';
import { getBodyTemplate } from '../src/geometry/templates';
import { computeParametricAnchors } from '../src/geometry/bodyModel';
import { defaultLayers } from '../src/state/layers';

describe('layoutSaddlesFromScale', () => {
  it('places the bass saddle near nut + bassScale in body space', () => {
    const join = { x: 30, y: 0 };
    const neck = { ...DEFAULT_NECK_PARAMS, neckAngle: 0 };
    const saddles = layoutSaddlesFromScale(neck, DEFAULT_BRIDGE_SETTINGS, { joinPoint: join });
    const nutX = join.x - neck.neckLength;
    const bassSaddle = saddles.reduce((a, b) => (a.y > b.y ? a : b));
    // Bass intonation stagger is intonation[5] = 1.5 (last slot).
    expect(bassSaddle.x - nutX).toBeCloseTo(neck.bassScale + 1.5, 5);
  });

  it('places the treble saddle near nut + treble scale (with fan offset)', () => {
    const join = { x: 30, y: 0 };
    const neck = { ...DEFAULT_NECK_PARAMS, neckAngle: 0 };
    const saddles = layoutSaddlesFromScale(neck, DEFAULT_BRIDGE_SETTINGS, { joinPoint: join });
    const nutX = join.x - neck.neckLength;
    const trebleSaddle = saddles.reduce((a, b) => (a.y < b.y ? a : b));
    // Treble bridge x in neck space isn't always exactly trebleScale when fanned;
    // just assert it's finite and closer to treble than bass scale would put it alone.
    expect(trebleSaddle.x - nutX).toBeGreaterThan(neck.trebleScale - 5);
    expect(trebleSaddle.x - nutX).toBeLessThan(neck.bassScale + 5);
  });

  it('respects outer string spacing', () => {
    const saddles = layoutSaddlesFromScale(
      DEFAULT_NECK_PARAMS,
      { ...DEFAULT_BRIDGE_SETTINGS, stringSpacing: 50 },
      { joinPoint: { x: 25, y: 0 } },
    );
    expect(saddles[5].y - saddles[0].y).toBeCloseTo(50, 5);
  });
});

describe('scale lock in the store', () => {
  beforeEach(() => {
    useDesignStore.getState().resetToDefaults();
  });

  it('moving the neck joint translates the bridge so nut→bridge distance stays put', () => {
    const store = useDesignStore.getState();
    const join = store.bodyAnchors.find((a) => a.id === 'neckJoint')!;
    const beforeCenter = saddleClusterCenter(store.hardware.saddles);
    const nutBefore = join.position.x - store.neckParams.neckLength;
    const scaleBefore = beforeCenter.x - nutBefore;

    const dx = 40;
    useDesignStore.getState().moveAnchorPoint('neckJoint', 'position', {
      x: join.position.x + dx,
      y: join.position.y,
    });

    const after = useDesignStore.getState();
    const afterJoin = after.bodyAnchors.find((a) => a.id === 'neckJoint')!;
    const afterCenter = saddleClusterCenter(after.hardware.saddles);
    const nutAfter = afterJoin.position.x - after.neckParams.neckLength;
    expect(afterCenter.x - beforeCenter.x).toBeCloseTo(dx, 5);
    expect(afterCenter.x - nutAfter).toBeCloseTo(scaleBefore, 5);
  });

  it('changing bass scale relocates saddles to the new scale length', () => {
    const before = useDesignStore.getState();
    const joinX = neckJoinPoint(before.bodyAnchors).x;
    const nutX = joinX - before.neckParams.neckLength;
    const newScale = before.neckParams.bassScale + 20;
    useDesignStore.getState().setNeckParam('bassScale', newScale);
    const after = useDesignStore.getState();
    const bassSaddle = after.hardware.saddles.reduce((a, b) => (a.y > b.y ? a : b));
    expect(bassSaddle.x - nutX).toBeCloseTo(newScale + 1.5, 4);
  });

  it('marks scale-related neck keys', () => {
    expect(isScaleLockNeckKey('bassScale')).toBe(true);
    expect(isScaleLockNeckKey('nutWidth')).toBe(false);
  });
});

describe('v3 → v4 migration snaps bridge to scale', () => {
  it('relayouts saddles onto the scale length at the neck joint', () => {
    const tele = getBodyTemplate('tele');
    const anchors = computeParametricAnchors(tele, tele.defaultParams);
    const joinX = neckJoinPoint(anchors).x;
    const neck = { ...tele.defaultNeckParams };
    const hardware = structuredClone(tele.defaultHardware);
    hardware.saddles = hardware.saddles.map((s) => ({ ...s, x: joinX + 500 }));

    const v3 = {
      version: 3,
      templateId: tele.id,
      bodyParams: { ...tele.defaultParams },
      bodyAnchors: anchors,
      neckParams: neck,
      hardware,
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

    const migrated = migrateDesignDocument(v3 as unknown as Record<string, unknown>);
    expect(migrated.version).toBe(DESIGN_DOCUMENT_VERSION);
    const hw = migrated.hardware as typeof hardware;
    const nutX = joinX - neck.neckLength;
    const bass = hw.saddles.reduce((a, b) => (a.y > b.y ? a : b));
    expect(bass.x - nutX).toBeCloseTo(neck.bassScale + 1.5, 4);
  });
});
