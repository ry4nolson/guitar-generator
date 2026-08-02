import type { HardwarePosition } from '../geometry/types';
import type { NeckParams } from '../geometry/neckParams';
import { DEFAULT_BRIDGE_SETTINGS } from '../geometry/bridgeTypes';
import { layoutSaddlesFromScale } from '../geometry/scaleLock';
import {
  DEFAULT_CONTROL_SETTINGS,
  DEFAULT_PICKUP_SETTINGS,
  PICKUP_SLOTS,
  defaultPickupPositions,
  defaultSelectorPosition,
  layoutControlKnobs,
} from '../geometry/pickups';

/** Hardware layout, in body-local mm coordinates (same frame as body anchors). */
export interface HardwareState {
  /** 3 pickup slot positions: [neck, middle, bridge]. Hidden when the slot type is 'none'. */
  pickups: HardwarePosition[];
  /** Volume/tone knobs, ordered volumes first then tones. */
  controls: HardwarePosition[];
  /** Pickup selector switch (blade or toggle). Hidden when selector type is 'none'. */
  selector: HardwarePosition;
  /** 6 individual saddles (or string slots), spaced across the bridge. */
  saddles: HardwarePosition[];
  /** 4-bolt neck attachment pattern (also used as back-view ferrules). */
  neckBolts: HardwarePosition[];
}

/**
 * Builds a hardware layout locked to the neck scale lengths: saddles sit at
 * nut + scale from the neck joint; pickups/knobs/selector are placed at
 * scale-relative positions on the correct sides of the centerline.
 */
export function buildHardwareDefaults(opts: {
  joinX: number;
  neckParams: NeckParams;
  /** Outer-to-outer bridge string spacing, mm. Default 52.5. */
  stringSpacing?: number;
  neckBoltSpanX?: number;
  neckBoltSpanY?: number;
}): HardwareState {
  const spacing = opts.stringSpacing ?? DEFAULT_BRIDGE_SETTINGS.stringSpacing;
  const bridgeSettings = { ...DEFAULT_BRIDGE_SETTINGS, stringSpacing: spacing };
  const placement = { joinPoint: { x: opts.joinX, y: 0 } };
  const saddles = layoutSaddlesFromScale(opts.neckParams, bridgeSettings, placement);

  const pickupPositions = defaultPickupPositions(opts.neckParams, placement);
  const pickups: HardwarePosition[] = pickupPositions.map((p, i) => ({
    x: p.x,
    y: p.y,
    rotation: 0,
    visible: DEFAULT_PICKUP_SETTINGS[PICKUP_SLOTS[i]] !== 'none',
    locked: false,
  }));

  const controls = layoutControlKnobs(opts.neckParams, placement, DEFAULT_CONTROL_SETTINGS);
  const sel = defaultSelectorPosition(DEFAULT_CONTROL_SETTINGS.selector, opts.neckParams, placement);
  const selector: HardwarePosition = {
    x: sel.position.x,
    y: sel.position.y,
    rotation: sel.rotation,
    visible: DEFAULT_CONTROL_SETTINGS.selector !== 'none',
    locked: false,
  };

  const boltSpanX = opts.neckBoltSpanX ?? 55;
  const boltSpanY = opts.neckBoltSpanY ?? 20;
  const boltStartX = opts.joinX - 5;

  return {
    pickups,
    controls,
    selector,
    saddles,
    neckBolts: [
      { x: boltStartX, y: boltSpanY, rotation: 0, visible: true, locked: false },
      { x: boltStartX, y: -boltSpanY, rotation: 0, visible: true, locked: false },
      { x: boltStartX + boltSpanX, y: boltSpanY, rotation: 0, visible: true, locked: false },
      { x: boltStartX + boltSpanX, y: -boltSpanY, rotation: 0, visible: true, locked: false },
    ],
  };
}
