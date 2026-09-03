// Pure string-path geometry: nut slots → bridge saddles in body-local mm.
// Multiscale necks are handled because nut points sit on the nut line in
// neck space and saddles already live in body space at their scale lengths.

import type { Point } from './types';
import type { NeckParams } from './neckParams';
import type { NutSettings, BridgeSettings } from './bridgeTypes';
import { intonationStagger, stringSlotOffsets } from './bridgeTypes';
import { fanLineX } from './frets';
import { neckToBodySpace, type NeckPlacement } from './neckPlacement';
import type { HardwarePosition } from './types';

export interface StringSegment {
  index: number;
  nut: Point;
  bridge: Point;
  /** Peg center when headed tuners are shown; otherwise null. */
  tuner: Point | null;
}

/** Dark nickel/steel tone — readable on cream/maple body fills. */
export const STRING_STROKE_COLOR = '#7a756c';

/**
 * Canvas stroke widths (mm), treble→bass. Scaled from a typical light electric
 * set so they read on body fills without a cartoon bass string. Index 0 = high E.
 */
export function stringStrokeWidths(count: number): number[] {
  const n = Math.max(1, count);
  const thin = 0.6;
  const thick = 1.75; // outer bass — visible but not a rope
  return Array.from({ length: n }, (_, i) => {
    const t = n <= 1 ? 0 : i / (n - 1);
    // Ease so extra low strings on 7–9 sets don't balloon past `thick`.
    const eased = t * t * 0.3 + t * 0.7;
    return Math.round((thin + (thick - thin) * eased) * 100) / 100;
  });
}

/** @deprecated Prefer stringStrokeWidths(count). Kept for 6-string call sites. */
export const STRING_STROKE_MM = stringStrokeWidths(6);

/** Nut-slot positions in body space for `stringCount` strings. */
export function computeNutStringPoints(
  neckParams: NeckParams,
  nutSettings: NutSettings,
  placement: NeckPlacement,
  stringCount = 6,
): Point[] {
  const offsets = stringSlotOffsets(nutSettings.stringSpacing, stringCount);
  // Compensated nut: tiny stagger along x (toward the bridge) peaking mid-set.
  return offsets.map((y, i) => {
    // Each string starts on the fanned fret-0 (nut) line, not at a flat x=0.
    let x = fanLineX(neckParams, 0, y, neckParams.nutWidth / 2);
    if (nutSettings.type === 'compensated') {
      const t = stringCount <= 1 ? 0 : i / (stringCount - 1);
      x += Math.sin(t * Math.PI) * 0.7;
    }
    return neckToBodySpace({ x, y }, neckParams, placement);
  });
}

/** Bridge endpoints from the six saddle positions (already body-local). */
export function computeBridgeStringPoints(saddles: HardwarePosition[]): Point[] {
  return saddles.map((s) => ({ x: s.x, y: s.y }));
}

export function computeStringSegments(
  nutPoints: Point[],
  bridgePoints: Point[],
  tunerPoints?: (Point | null)[] | null,
): StringSegment[] {
  const n = Math.min(nutPoints.length, bridgePoints.length);
  const out: StringSegment[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      index: i,
      nut: nutPoints[i],
      bridge: bridgePoints[i],
      tuner: tunerPoints?.[i] ?? null,
    });
  }
  return out;
}

/**
 * Lay out N saddle positions around a bridge center using the active
 * bridge string spacing. Preserves lock/visibility from any prior saddles.
 */
export function layoutSaddles(
  center: Point,
  bridgeSettings: BridgeSettings,
  prior?: HardwarePosition[],
): HardwarePosition[] {
  const count = bridgeSettings.stringCount ?? 6;
  const offsets = stringSlotOffsets(bridgeSettings.stringSpacing, count);
  const intonation = intonationStagger(count);
  return offsets.map((y, i) => {
    const prev = prior?.[i];
    return {
      x: center.x + (intonation[i] ?? 0),
      y: center.y + y,
      rotation: 0,
      visible: prev?.visible ?? true,
      locked: prev?.locked ?? false,
    };
  });
}

/** Average of current saddle positions — used as the bridge plate origin. */
export function saddleClusterCenter(saddles: HardwarePosition[]): Point {
  if (saddles.length === 0) return { x: 0, y: 0 };
  const sx = saddles.reduce((a, s) => a + s.x, 0) / saddles.length;
  const sy = saddles.reduce((a, s) => a + s.y, 0) / saddles.length;
  return { x: sx, y: sy };
}
