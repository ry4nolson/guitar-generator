// Keeps nut ↔ bridge distance locked to the neck scale length(s).
//
// The neck heel sits at the body's neckJoint anchor. The nut is neckLength
// toward the headstock from that join. Bridge saddles must sit at each
// string's scale length from the nut — not as free-floating body hardware
// that drifts when the joint is dragged.

import type { BodyAnchor, HardwarePosition, Point } from './types';
import type { NeckParams } from './neckParams';
import type { BridgeSettings } from './bridgeTypes';
import { stringSlotOffsets } from './bridgeTypes';
import { computeBridgeX } from './frets';
import { neckToBodySpace, type NeckPlacement } from './neckPlacement';

/** Neck placement join: heel x from the neckJoint anchor, y on the body centerline. */
export function neckJoinPoint(anchors: BodyAnchor[]): Point {
  const joint = anchors.find((a) => a.id === 'neckJoint');
  return { x: joint?.position.x ?? 0, y: 0 };
}

export function neckPlacementFromAnchors(anchors: BodyAnchor[]): NeckPlacement {
  return { joinPoint: neckJoinPoint(anchors) };
}

/**
 * Ideal saddle positions from scale lengths + join. Bass string at bassScale,
 * treble at the fanned treble bridge x; middle strings interpolate.
 * Locked saddles keep their prior body position.
 */
export function layoutSaddlesFromScale(
  neckParams: NeckParams,
  bridgeSettings: BridgeSettings,
  placement: NeckPlacement,
  prior?: HardwarePosition[],
): HardwarePosition[] {
  const { bassBridgeX, trebleBridgeX } = computeBridgeX(neckParams);
  const offsets = stringSlotOffsets(bridgeSettings.stringSpacing, 6);
  // Small intonation stagger past the nominal scale (toward the tail).
  const intonation = [1.2, 0.6, 0, 0.4, 0.9, 1.5];

  return offsets.map((y, i) => {
    const prev = prior?.[i];
    if (prev?.locked) return prev;

    // offsets[0] is treble (−y), offsets[n-1] is bass (+y) — match fan bridge Xs.
    const t = offsets.length <= 1 ? 0 : i / (offsets.length - 1);
    const nominalX = trebleBridgeX + t * (bassBridgeX - trebleBridgeX);
    const p = neckToBodySpace({ x: nominalX + (intonation[i] ?? 0), y }, neckParams, placement);
    return {
      x: p.x,
      y: p.y,
      rotation: neckParams.neckAngle,
      visible: prev?.visible ?? true,
      locked: false,
    };
  });
}

/** Neck params that move the nut or the scale-end bridge positions in body space. */
export const SCALE_LOCK_NECK_KEYS: ReadonlyArray<keyof NeckParams> = [
  'bassScale',
  'trebleScale',
  'neckLength',
  'neckAngle',
  'neutralFret',
];

export function isScaleLockNeckKey(key: keyof NeckParams): boolean {
  return (SCALE_LOCK_NECK_KEYS as ReadonlyArray<string>).includes(key);
}
