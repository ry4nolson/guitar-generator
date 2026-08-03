// Store-side helpers that keep hardware locked to neck scale lengths when
// the neck joint or scale params change. Geometry stays in geometry/scaleLock.ts.

import type { HardwarePosition, Point } from '../geometry/types';
import type { NeckParams } from '../geometry/neckParams';
import type { BridgeSettings } from '../geometry/bridgeTypes';
import { layoutSaddlesFromScale, neckPlacementFromAnchors } from '../geometry/scaleLock';
import { saddleClusterCenter } from '../geometry/strings';
import type { BodyAnchor } from '../geometry/types';
import type { HardwareState } from './hardwareDefaults';

function translatePos(p: HardwarePosition, dx: number, dy: number): HardwarePosition {
  if (p.locked || (dx === 0 && dy === 0)) return p;
  return { ...p, x: p.x + dx, y: p.y + dy };
}

/** Translate unlocked hardware by a body-space delta (used when the neck joint moves). */
export function translateHardware(hw: HardwareState, dx: number, dy: number): HardwareState {
  return {
    pickups: hw.pickups.map((p) => translatePos(p, dx, dy)),
    controls: hw.controls.map((c) => translatePos(c, dx, dy)),
    selector: translatePos(hw.selector, dx, dy),
    saddles: hw.saddles.map((s) => translatePos(s, dx, dy)),
    neckBolts: hw.neckBolts.map((b) => translatePos(b, dx, dy)),
  };
}

/**
 * Relayout unlocked saddles to the current scale lengths, and shift unlocked
 * pickups/knobs/selector with the bridge cluster. Neck bolts stay put
 * (heel-relative).
 */
export function relayoutHardwareToScale(
  hw: HardwareState,
  neckParams: NeckParams,
  bridgeSettings: BridgeSettings,
  joinPoint: Point,
): HardwareState {
  const placement = { joinPoint };
  const oldCenter = saddleClusterCenter(hw.saddles);
  const saddles = layoutSaddlesFromScale(neckParams, bridgeSettings, placement, hw.saddles);
  const newCenter = saddleClusterCenter(saddles);
  const dx = newCenter.x - oldCenter.x;
  const dy = newCenter.y - oldCenter.y;
  return {
    pickups: hw.pickups.map((p) => translatePos(p, dx, dy)),
    controls: hw.controls.map((c) => translatePos(c, dx, dy)),
    selector: translatePos(hw.selector, dx, dy),
    saddles,
    neckBolts: hw.neckBolts,
  };
}

/** Convenience: relayout from current body anchors' neckJoint. */
export function relayoutHardwareToAnchors(
  hw: HardwareState,
  neckParams: NeckParams,
  bridgeSettings: BridgeSettings,
  anchors: BodyAnchor[],
): HardwareState {
  const { joinPoint } = neckPlacementFromAnchors(anchors, neckParams);
  return relayoutHardwareToScale(hw, neckParams, bridgeSettings, joinPoint);
}
