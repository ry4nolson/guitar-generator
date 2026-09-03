import type { HardwarePosition, Point } from '../geometry/types';
import type { NeckParams } from '../geometry/neckParams';
import { DEFAULT_BRIDGE_SETTINGS, bridgeTypeMeta, type BridgeType } from '../geometry/bridgeTypes';
import { layoutNeckBolts, layoutSaddlesFromScale } from '../geometry/scaleLock';
import {
  DEFAULT_CONTROL_SETTINGS,
  DEFAULT_PICKUP_SETTINGS,
  PICKUP_SLOTS,
  defaultPickupPositions,
  defaultSelectorPosition,
  layoutControlKnobs,
  type ControlSettings,
  type PickupSettings,
} from '../geometry/pickups';

/** Hardware layout, in body-local mm coordinates (same frame as body anchors). */
export interface HardwareState {
  /** 3 pickup slot positions: [neck, middle, bridge]. Hidden when the slot type is 'none'. */
  pickups: HardwarePosition[];
  /** Volume/tone knobs, ordered volumes first then tones. */
  controls: HardwarePosition[];
  /** Pickup selector switch (blade or toggle). Hidden when selector type is 'none'. */
  selector: HardwarePosition;
  /** Individual saddles (one per string), spaced across the bridge. */
  saddles: HardwarePosition[];
  /** 4-bolt neck attachment pattern (also used as back-view ferrules). */
  neckBolts: HardwarePosition[];
  /** Tuner posts (headstock or bridge-end). Auto-laid out; drag locks a peg in place. */
  tuners: HardwarePosition[];
}

/**
 * Builds a hardware layout locked to the neck scale lengths: saddles sit at
 * nut + scale from the neck joint; pickups/knobs/selector are placed at
 * scale-relative positions on the correct sides of the centerline.
 */
export function buildHardwareDefaults(opts: {
  joinX: number;
  neckParams: NeckParams;
  /** Outer-to-outer bridge string spacing, mm. Defaults to the bridge type's spacing. */
  stringSpacing?: number;
  /** Bridge family; sets default string spacing when `stringSpacing` is omitted. */
  bridgeType?: BridgeType;
  /** Which pickup slots are populated (drives per-slot visibility). */
  pickupSettings?: PickupSettings;
  /** Knob count + selector type to lay out. */
  controlSettings?: Pick<ControlSettings, 'volumes' | 'tones' | 'selector'>;
  /** Per-slot pickup rotation in degrees, [neck, middle, bridge] (e.g. slanted Strat bridge coil). */
  pickupRotations?: [number, number, number];
  /** Explicit body-space selector placement (e.g. V-style switch on the treble wing). */
  selectorOverride?: { position: Point; rotation: number };
  neckBoltSpanX?: number;
  neckBoltSpanY?: number;
}): HardwareState {
  const bridgeType = opts.bridgeType ?? DEFAULT_BRIDGE_SETTINGS.type;
  const spacing = opts.stringSpacing ?? bridgeTypeMeta(bridgeType).defaultSpacing;
  const bridgeSettings = { ...DEFAULT_BRIDGE_SETTINGS, type: bridgeType, stringSpacing: spacing };
  const placement = { joinPoint: { x: opts.joinX, y: 0 } };
  const saddles = layoutSaddlesFromScale(opts.neckParams, bridgeSettings, placement);
  const pickupSettings = opts.pickupSettings ?? DEFAULT_PICKUP_SETTINGS;
  const controlSettings: ControlSettings = { ...DEFAULT_CONTROL_SETTINGS, ...opts.controlSettings };

  const pickupPositions = defaultPickupPositions(opts.neckParams, placement, pickupSettings);
  const pickups: HardwarePosition[] = pickupPositions.map((p, i) => ({
    x: p.x,
    y: p.y,
    rotation: opts.pickupRotations?.[i] ?? 0,
    visible: pickupSettings[PICKUP_SLOTS[i]] !== 'none',
    locked: false,
  }));

  const controls = layoutControlKnobs(opts.neckParams, placement, controlSettings);
  const sel = opts.selectorOverride ?? defaultSelectorPosition(controlSettings.selector, opts.neckParams, placement);
  const selector: HardwarePosition = {
    x: sel.position.x,
    y: sel.position.y,
    rotation: sel.rotation,
    visible: controlSettings.selector !== 'none',
    locked: false,
  };

  const neckBolts = layoutNeckBolts(opts.neckParams, placement, {
    spanAlong: opts.neckBoltSpanX ?? 42,
    halfAcross: opts.neckBoltSpanY ?? 19,
  });

  return {
    pickups,
    controls,
    selector,
    saddles,
    neckBolts,
    tuners: [],
  };
}
