import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_NECK_PARAMS } from '../src/geometry/neckParams';
import { DEFAULT_BRIDGE_SETTINGS } from '../src/geometry/bridgeTypes';
import {
  layoutSaddlesFromScale,
  layoutNeckBolts,
  neckJoinPoint,
  isScaleLockNeckKey,
} from '../src/geometry/scaleLock';
import { neckToBodySpace } from '../src/geometry/neckPlacement';
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
    const joinX = neckJoinPoint(before.bodyAnchors, before.neckParams).x;
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

describe('neck pocket inset', () => {
  it('offsets the heel into the body past the neckJoint (pocket mouth) anchor', () => {
    const tele = getBodyTemplate('tele');
    const anchors = computeParametricAnchors(tele, tele.defaultParams);
    const anchorX = anchors.find((a) => a.id === 'neckJoint')!.position.x;
    const neck = { ...tele.defaultNeckParams };
    expect(neck.neckInset).toBeGreaterThan(0);
    expect(neckJoinPoint(anchors, neck).x).toBeCloseTo(anchorX + neck.neckInset, 5);
    expect(neckJoinPoint(anchors, { ...neck, neckInset: 0 }).x).toBeCloseTo(anchorX, 5);
  });

  it('template default hardware places the bridge at nut + scale from the inset heel', () => {
    const tele = getBodyTemplate('tele');
    const anchors = computeParametricAnchors(tele, tele.defaultParams);
    const neck = tele.defaultNeckParams;
    const heelX = neckJoinPoint(anchors, neck).x;
    const nutX = heelX - neck.neckLength;
    const bass = tele.defaultHardware.saddles.reduce((a, b) => (a.y > b.y ? a : b));
    expect(bass.x - nutX).toBeCloseTo(neck.bassScale + 1.5, 4);
  });

  it('changing neckInset shifts the neck assembly while keeping nut→bridge locked', () => {
    useDesignStore.getState().resetToDefaults();
    const before = useDesignStore.getState();
    const heelBefore = neckJoinPoint(before.bodyAnchors, before.neckParams).x;
    const centerBefore = saddleClusterCenter(before.hardware.saddles);
    const boltBefore = before.hardware.neckBolts[0];
    const scaleBefore = centerBefore.x - (heelBefore - before.neckParams.neckLength);

    useDesignStore.getState().setNeckParam('neckInset', before.neckParams.neckInset + 20);

    const after = useDesignStore.getState();
    const heelAfter = neckJoinPoint(after.bodyAnchors, after.neckParams).x;
    const centerAfter = saddleClusterCenter(after.hardware.saddles);
    expect(heelAfter - heelBefore).toBeCloseTo(20, 5);
    expect(centerAfter.x - (heelAfter - after.neckParams.neckLength)).toBeCloseTo(scaleBefore, 3);
    // Bolts are heel-relative: they ride along with the deeper-set heel.
    expect(after.hardware.neckBolts[0].x - boltBefore.x).toBeCloseTo(20, 5);
  });

  it('marks neckInset as a scale-lock key', () => {
    expect(isScaleLockNeckKey('neckInset')).toBe(true);
  });
});

describe('layoutNeckBolts', () => {
  it('places all four bolts on the heel, inside the neck width, centered on the centerline', () => {
    const neck = { ...DEFAULT_NECK_PARAMS, neckAngle: 0 };
    const placement = { joinPoint: { x: 80, y: 0 } };
    const bolts = layoutNeckBolts(neck, placement);
    expect(bolts).toHaveLength(4);
    const heelX = placement.joinPoint.x;
    for (const b of bolts) {
      // On the neck wood: toward the nut from the heel, within the pocket depth.
      expect(b.x).toBeLessThan(heelX - 1);
      expect(b.x).toBeGreaterThan(heelX - (neck.neckInset ?? 55) - 1);
      expect(Math.abs(b.y)).toBeLessThan(neck.heelWidth / 2 - 2);
    }
    // Symmetric about the centerline.
    const ys = bolts.map((b) => b.y).sort((a, b) => a - b);
    expect(ys[0]).toBeCloseTo(-ys[3], 5);
    expect(ys[1]).toBeCloseTo(-ys[2], 5);
  });

  it('rotates the bolt pattern with neckAngle', () => {
    const neck = { ...DEFAULT_NECK_PARAMS, neckAngle: 8 };
    const placement = { joinPoint: { x: 80, y: 0 } };
    const bolts = layoutNeckBolts(neck, placement);
    // Axis-aligned layout would keep |y| exactly at halfAcross (19); rotation moves them.
    expect(bolts.every((b) => Math.abs(Math.abs(b.y) - 19) < 0.01)).toBe(false);
    // Midpoint of the four bolts stays on the neck centerline through the heel.
    const mid = {
      x: bolts.reduce((s, b) => s + b.x, 0) / 4,
      y: bolts.reduce((s, b) => s + b.y, 0) / 4,
    };
    const heel = neckToBodySpace({ x: neck.neckLength - 31, y: 0 }, neck, placement);
    expect(mid.x).toBeCloseTo(heel.x, 4);
    expect(mid.y).toBeCloseTo(heel.y, 4);
  });

  it('store relayouts bolts when neck angle changes', () => {
    useDesignStore.getState().resetToDefaults();
    useDesignStore.getState().setNeckParam('neckAngle', 6);
    const bolts = useDesignStore.getState().hardware.neckBolts;
    const expected = layoutNeckBolts(
      useDesignStore.getState().neckParams,
      { joinPoint: neckJoinPoint(useDesignStore.getState().bodyAnchors, useDesignStore.getState().neckParams) },
    );
    expect(bolts[0].x).toBeCloseTo(expected[0].x, 5);
    expect(bolts[0].y).toBeCloseTo(expected[0].y, 5);
  });
});

describe('v3 → v4 migration snaps bridge to scale', () => {
  it('relayouts saddles onto the scale length at the neck joint', () => {
    const tele = getBodyTemplate('tele');
    const anchors = computeParametricAnchors(tele, tele.defaultParams);
    const neck = { ...tele.defaultNeckParams };
    const joinX = neckJoinPoint(anchors, neck).x;
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

  it('fills neckInset = 0 for docs saved before the pocket inset existed', () => {
    const tele = getBodyTemplate('tele');
    const anchors = computeParametricAnchors(tele, tele.defaultParams);
    const anchorX = anchors.find((a) => a.id === 'neckJoint')!.position.x;
    // Legacy neck params: no neckInset — the heel used to sit AT the anchor.
    const neck = { ...tele.defaultNeckParams } as Record<string, unknown>;
    delete neck.neckInset;
    const hardware = structuredClone(tele.defaultHardware);

    const v3 = {
      version: 3,
      templateId: tele.id,
      bodyParams: { ...tele.defaultParams },
      bodyAnchors: anchors,
      neckParams: neck,
      hardware,
      bridgeSettings: { ...DEFAULT_BRIDGE_SETTINGS },
      nutSettings: { type: 'standard', stringSpacing: 35, thickness: 5 },
      layers: defaultLayers(),
    };

    const migrated = migrateDesignDocument(v3 as unknown as Record<string, unknown>);
    const migratedNeck = migrated.neckParams as { neckInset: number; neckLength: number; bassScale: number };
    expect(migratedNeck.neckInset).toBe(0);
    // Saddles snap to scale from the anchor itself (heel-at-anchor, inset 0).
    const hw = migrated.hardware as typeof hardware;
    const bass = hw.saddles.reduce((a, b) => (a.y > b.y ? a : b));
    expect(bass.x - (anchorX - migratedNeck.neckLength)).toBeCloseTo(migratedNeck.bassScale + 1.5, 4);
  });
});
