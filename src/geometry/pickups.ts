// Pickup + control (knobs / selector) configuration and default placement.
// Pure geometry — no React. Real-world footprint sizes in mm.

import type { Point, HardwarePosition } from './types';
import type { NeckParams } from './neckParams';
import { neckToBodySpace, type NeckPlacement } from './neckPlacement';

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
 * Default pickup centers in body space, ordered [neck, middle, bridge].
 * Bridge pickup ~45 mm in front of the bridge line; neck pickup just past
 * the fretboard end; middle halfway between.
 */
export function defaultPickupPositions(neckParams: NeckParams, placement: NeckPlacement): Point[] {
  const neckX = neckParams.neckLength + 30;
  const bridgeX = neckParams.bassScale - 45;
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
    const local = { x: neckParams.bassScale + 28 + i * 24, y: -60 - i * 11 };
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
  // Long axis roughly parallel to the strings (Strat-style), slight rake.
  return {
    position: neckToBodySpace({ x: neckParams.bassScale - 70, y: -78 }, neckParams, placement),
    rotation: 65,
  };
}
