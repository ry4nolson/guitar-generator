// Hard envelopes for canvas / numeric edits.
//
// Sliders already have min/max, but outline points and hardware can be dragged
// (or typed) anywhere. Without a box, one yanked headstock point turns the
// silhouette into a metre-long triangle and the tuner row follows that edge.

import type { Point } from './types';
import type { NeckParams } from './neckParams';
import { NECK_PARAM_META } from './neckParams';

/** Slider + store range for a headed nut→tip length (headless keeps ~40mm). */
export const HEADSTOCK_LENGTH_LIMITS = { min: 120, max: 220 };

/** Slider + store range for overall head width. */
export const HEADSTOCK_WIDTH_LIMITS = { min: 50, max: 150 };

/**
 * Neck-local box for free headstock outline points and their handles.
 * Nut face is x = 0; the tip lives at negative x. Generous enough for a
 * 12-string pointy preset at max slider size, tight enough that a beta
 * tester cannot stretch the head down the fretboard or off the canvas.
 */
export const HEADSTOCK_EDIT_LIMITS = {
  minX: -300,
  maxX: 28,
  maxAbsY: 120,
  maxHandleLength: 160,
} as const;

/** Body-local box for outline points. Covers Rhoads / King V at max sliders. */
export const BODY_EDIT_LIMITS = {
  minX: -180,
  maxX: 720,
  maxAbsY: 340,
  maxHandleLength: 260,
} as const;

/** Body-local box for pickups, knobs, saddles, bolts (not headed tuners). */
export const HARDWARE_EDIT_LIMITS = {
  minX: -120,
  maxX: 780,
  maxAbsY: 340,
} as const;

/**
 * Auto-laid pegs stay at most this far apart. A stretched outline used to
 * space the whole nut→tip flank, which parked the bank in the middle of
 * the wedge instead of on the head.
 */
export const MAX_TUNER_PEG_SPACING_MM = 32;

export interface BoxLimits {
  minX: number;
  maxX: number;
  maxAbsY: number;
  maxHandleLength: number;
}

export interface OutlineEditAnchor {
  locked: boolean;
  position: Point;
  handleIn: Point;
  handleOut: Point;
}

export function clampNumber(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function clampPointToBox(
  p: Point,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
): Point {
  return { x: clampNumber(p.x, minX, maxX), y: clampNumber(p.y, minY, maxY) };
}

export function clampHandleToAnchor(handle: Point, anchor: Point, maxLen: number): Point {
  const dx = handle.x - anchor.x;
  const dy = handle.y - anchor.y;
  const len = Math.hypot(dx, dy);
  if (!Number.isFinite(len) || len <= maxLen) return handle;
  if (len < 1e-9) return anchor;
  const s = maxLen / len;
  return { x: anchor.x + dx * s, y: anchor.y + dy * s };
}

function clampAnchorToBox<T extends OutlineEditAnchor>(anchor: T, box: BoxLimits): T {
  const { minX, maxX, maxAbsY, maxHandleLength } = box;
  const position = anchor.locked
    ? anchor.position
    : clampPointToBox(anchor.position, minX, maxX, -maxAbsY, maxAbsY);
  const handleIn = clampHandleToAnchor(
    clampPointToBox(anchor.handleIn, minX, maxX, -maxAbsY, maxAbsY),
    position,
    maxHandleLength,
  );
  const handleOut = clampHandleToAnchor(
    clampPointToBox(anchor.handleOut, minX, maxX, -maxAbsY, maxAbsY),
    position,
    maxHandleLength,
  );
  if (
    position.x === anchor.position.x &&
    position.y === anchor.position.y &&
    handleIn.x === anchor.handleIn.x &&
    handleIn.y === anchor.handleIn.y &&
    handleOut.x === anchor.handleOut.x &&
    handleOut.y === anchor.handleOut.y
  ) {
    return anchor;
  }
  return { ...anchor, position, handleIn, handleOut };
}

export function clampHeadstockLocalPoint(p: Point): Point {
  const { minX, maxX, maxAbsY } = HEADSTOCK_EDIT_LIMITS;
  return clampPointToBox(p, minX, maxX, -maxAbsY, maxAbsY);
}

export function clampHeadstockAnchors<T extends OutlineEditAnchor>(anchors: T[]): T[] {
  return anchors.map((a) => clampAnchorToBox(a, HEADSTOCK_EDIT_LIMITS));
}

export function clampBodyAnchors<T extends OutlineEditAnchor>(anchors: T[]): T[] {
  return anchors.map((a) => clampAnchorToBox(a, BODY_EDIT_LIMITS));
}

export function clampHardwareBodyPoint(p: Point): Point {
  const { minX, maxX, maxAbsY } = HARDWARE_EDIT_LIMITS;
  return clampPointToBox(p, minX, maxX, -maxAbsY, maxAbsY);
}

export function clampNeckParam(key: keyof NeckParams, value: number): number {
  const meta = NECK_PARAM_META.find((m) => m.key === key);
  if (!meta) return value;
  return clampNumber(value, meta.min, meta.max);
}

export function maxTunerRowSpanMm(count: number): number {
  return Math.max(36, (Math.max(1, count) - 1) * MAX_TUNER_PEG_SPACING_MM);
}
