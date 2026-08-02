import type { HardwarePosition } from '../geometry/types';
import type { NeckParams } from '../geometry/neckParams';
import { DEFAULT_BRIDGE_SETTINGS } from '../geometry/bridgeTypes';
import { layoutSaddlesFromScale } from '../geometry/scaleLock';
import { saddleClusterCenter } from '../geometry/strings';

/** Hardware layout, in body-local mm coordinates (same frame as body anchors). */
export interface HardwareState {
  bridgeHumbucker: HardwarePosition;
  volumeKnob: HardwarePosition;
  /** 6 individual saddles (or string slots), spaced across the bridge. */
  saddles: HardwarePosition[];
  /** 4-bolt neck attachment pattern (also used as back-view ferrules). */
  neckBolts: HardwarePosition[];
}

/**
 * Builds a hardware layout locked to the neck scale lengths: saddles sit at
 * nut + scale from the neck joint, with pickup/knob/bolts relative to that.
 */
export function buildHardwareDefaults(opts: {
  joinX: number;
  neckParams: NeckParams;
  /** Outer-to-outer bridge string spacing, mm. Default 52.5. */
  stringSpacing?: number;
  neckBoltSpanX?: number;
  neckBoltSpanY?: number;
  /** Pickup offset toward the nut from the bridge cluster center, mm. */
  pickupOffsetX?: number;
  volumeOffsetX?: number;
  volumeOffsetY?: number;
}): HardwareState {
  const spacing = opts.stringSpacing ?? DEFAULT_BRIDGE_SETTINGS.stringSpacing;
  const bridgeSettings = { ...DEFAULT_BRIDGE_SETTINGS, stringSpacing: spacing };
  const placement = { joinPoint: { x: opts.joinX, y: 0 } };
  const saddles = layoutSaddlesFromScale(opts.neckParams, bridgeSettings, placement);
  const center = saddleClusterCenter(saddles);

  const boltSpanX = opts.neckBoltSpanX ?? 55;
  const boltSpanY = opts.neckBoltSpanY ?? 20;
  const boltStartX = opts.joinX - 5;
  const pickupOffsetX = opts.pickupOffsetX ?? -18;
  const volumeOffsetX = opts.volumeOffsetX ?? -60;
  const volumeOffsetY = opts.volumeOffsetY ?? 55;

  return {
    bridgeHumbucker: {
      x: center.x + pickupOffsetX,
      y: center.y,
      rotation: 0,
      visible: true,
      locked: false,
    },
    volumeKnob: {
      x: center.x + volumeOffsetX,
      y: center.y + volumeOffsetY,
      rotation: 0,
      visible: true,
      locked: false,
    },
    saddles,
    neckBolts: [
      { x: boltStartX, y: boltSpanY, rotation: 0, visible: true, locked: false },
      { x: boltStartX, y: -boltSpanY, rotation: 0, visible: true, locked: false },
      { x: boltStartX + boltSpanX, y: boltSpanY, rotation: 0, visible: true, locked: false },
      { x: boltStartX + boltSpanX, y: -boltSpanY, rotation: 0, visible: true, locked: false },
    ],
  };
}
