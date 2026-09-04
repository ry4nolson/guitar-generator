// Pickup + control (knobs / selector) configuration and default placement.
// Pure geometry — no React. Real-world footprint sizes in mm.

import type { Point, HardwarePosition } from './types';
import type { NeckParams } from './neckParams';
import { neckToBodySpace, type NeckPlacement } from './neckPlacement';
import { bridgePickupAlongOffset, type BridgeType } from './bridgeTypes';

export type PickupType = 'humbucker' | 'single-coil' | 'p90';
/** A pickup slot can also be empty. */
export type PickupSlotValue = PickupType | 'none';

export type PickupSlot = 'neck' | 'middle' | 'bridge';
/** Slot order matches `hardware.pickups` indexes 0/1/2. */
export const PICKUP_SLOTS: PickupSlot[] = ['neck', 'middle', 'bridge'];

export interface PickupSettings {
  neck: PickupSlotValue;
  middle: PickupSlotValue;
  bridge: PickupSlotValue;
}

export type SelectorType = 'none' | 'toggle' | 'blade-3' | 'blade-5';

export interface ControlSettings {
  /** Number of volume knobs (0–2). */
  volumes: number;
  /** Number of tone knobs (0–2). */
  tones: number;
  selector: SelectorType;
  /** Back-view control-cavity padding around the knob/selector cluster, mm. */
  cavityPad: number;
  /** Extra degrees added to the auto-fitted cavity angle. */
  cavityRotationOffset: number;
}

export const DEFAULT_PICKUP_SETTINGS: PickupSettings = {
  neck: 'single-coil',
  middle: 'none',
  bridge: 'humbucker',
};

export const DEFAULT_CONTROL_SETTINGS: ControlSettings = {
  volumes: 1,
  tones: 1,
  selector: 'blade-3',
  cavityPad: 14,
  cavityRotationOffset: 0,
};

/**
 * Footprint per type: `along` runs with the strings (body x), `across` spans
 * the strings (body y). Real-world sizes, not decorative guesses.
 */
export const PICKUP_DIMENSIONS: Record<PickupType, { along: number; across: number; radius: number }> = {
  humbucker: { along: 38, across: 70, radius: 3 },
  'single-coil': { along: 18, across: 70, radius: 8 },
  p90: { along: 36, across: 86, radius: 6 },
};

export const PICKUP_TYPE_META: { id: PickupSlotValue; label: string; description: string }[] = [
  { id: 'none', label: 'None', description: 'Empty slot — no pickup or route.' },
  { id: 'single-coil', label: 'Single', description: 'Classic single-coil (70 × 18 mm).' },
  { id: 'p90', label: 'P90', description: 'P90 soapbar (86 × 36 mm).' },
  { id: 'humbucker', label: 'HB', description: 'Full-size humbucker (70 × 38 mm).' },
];

export const SELECTOR_TYPE_META: { id: SelectorType; label: string; description: string }[] = [
  { id: 'none', label: 'None', description: 'No pickup selector.' },
  { id: 'toggle', label: 'Toggle', description: 'LP-style 3-way toggle on the bass upper bout.' },
  { id: 'blade-3', label: '3-way', description: '3-position blade switch near the controls.' },
  { id: 'blade-5', label: '5-way', description: '5-position blade switch near the controls.' },
];

export const PICKUP_SLOT_LABELS: Record<PickupSlot, string> = {
  neck: 'Neck',
  middle: 'Middle',
  bridge: 'Bridge',
};

/**
 * Wood the default layout leaves between the neck-pocket route and the neck
 * pickup route. Matches the pocket overhang (6) + minimum-wood constraint (20)
 * in geometry/constraints.ts, plus a little slack so defaults never warn.
 */
const NECK_PICKUP_POCKET_GAP_MM = 28;

/**
 * Default pickup centers in body space, ordered [neck, middle, bridge].
 * Bridge pickup sits ~45 mm in front of the scale line, or nested in an
 * ashtray plate when that bridge type is active. Neck pickup sits just
 * past the fretboard end with enough wood left around the pocket route for
 * its footprint; middle halfway between.
 */
export function defaultPickupPositions(
  neckParams: NeckParams,
  placement: NeckPlacement,
  settings: PickupSettings = DEFAULT_PICKUP_SETTINGS,
  bridgeType?: BridgeType,
): Point[] {
  const neckType = settings.neck === 'none' ? 'single-coil' : settings.neck;
  const neckX = neckParams.neckLength + NECK_PICKUP_POCKET_GAP_MM + PICKUP_DIMENSIONS[neckType].along / 2;
  const bridgeX = neckParams.bassScale + bridgePickupAlongOffset(bridgeType ?? 'hardtail');
  const middleX = (neckX + bridgeX) / 2;
  return [neckX, middleX, bridgeX].map((x) => neckToBodySpace({ x, y: 0 }, neckParams, placement));
}

/**
 * Volume/tone knob centers on the treble side behind the bridge, walking
 * diagonally toward the tail. Preserves prior positions/flags by index so
 * adding a knob doesn't move ones the user already placed.
 */
export function layoutControlKnobs(
  neckParams: NeckParams,
  placement: NeckPlacement,
  settings: ControlSettings,
  prior?: HardwarePosition[],
): HardwarePosition[] {
  const count = Math.max(0, settings.volumes) + Math.max(0, settings.tones);
  const out: HardwarePosition[] = [];
  for (let i = 0; i < count; i++) {
    const prev = prior?.[i];
    if (prev) {
      out.push(prev);
      continue;
    }
    // Strat-like cluster: volume just past the bridge on the treble side, tones
    // stepping toward the tail/rim — a tight triangle, not a long diagonal.
    const local = { x: neckParams.bassScale + 6 + i * 18, y: -50 - i * 14 };
    const p = neckToBodySpace(local, neckParams, placement);
    out.push({ x: p.x, y: p.y, rotation: 0, visible: true, locked: false });
  }
  return out;
}

/** Human label for control knob index i under the current settings. */
export function controlKnobLabel(settings: ControlSettings, i: number): string {
  if (i < settings.volumes) return settings.volumes > 1 ? `Volume ${i + 1}` : 'Volume';
  const t = i - settings.volumes;
  return settings.tones > 1 ? `Tone ${t + 1}` : 'Tone';
}

/** Default selector position + rotation for a selector type. */
export function defaultSelectorPosition(
  selector: SelectorType,
  neckParams: NeckParams,
  placement: NeckPlacement,
): { position: Point; rotation: number } {
  if (selector === 'toggle') {
    // LP-style: bass-side upper bout, forward of the neck pickup.
    return {
      position: neckToBodySpace({ x: neckParams.neckLength + 15, y: 62 }, neckParams, placement),
      rotation: 0,
    };
  }
  // Blade: treble side between the middle/bridge pickups and the knobs.
  // Glyph is tall along +y at 0°; ~82° puts the long axis nearly along the strings.
  return {
    position: neckToBodySpace({ x: neckParams.bassScale - 90, y: -52 }, neckParams, placement),
    rotation: 82,
  };
}
