// Pure string-path geometry: nut slots → bridge saddles in body-local mm.
// Multiscale necks are handled because nut points sit on the nut line in
// neck space and saddles already live in body space at their scale lengths.

import type { Point } from './types';
import type { NeckParams } from './neckParams';
import type { NutSettings, BridgeSettings } from './bridgeTypes';
import { stringSlotOffsets } from './bridgeTypes';
import { fanLineX } from './frets';
import { neckToBodySpace, type NeckPlacement } from './neckPlacement';
import type { HardwarePosition } from './types';

export interface StringSegment {
  index: number;
  nut: Point;
  bridge: Point;
}

/** Six nut-slot positions in body space, spaced by nutSettings.stringSpacing. */
export function computeNutStringPoints(
  neckParams: NeckParams,
  nutSettings: NutSettings,
  placement: NeckPlacement,
): Point[] {
  const offsets = stringSlotOffsets(nutSettings.stringSpacing, 6);
  // Compensated nut: tiny stagger along x (toward the bridge) on the G/B strings.
  return offsets.map((y, i) => {
    // Each string starts on the fanned fret-0 (nut) line, not at a flat x=0.
    let x = fanLineX(neckParams, 0, y, neckParams.nutWidth / 2);
    if (nutSettings.type === 'compensated') {
      // Mild visual compensation — not a full Buzz Feiten table.
      const stagger = [0, 0.2, 0.4, 0.8, 0.5, 0.15][i] ?? 0;
      x += stagger;
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
): StringSegment[] {
  const n = Math.min(nutPoints.length, bridgePoints.length);
  const out: StringSegment[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ index: i, nut: nutPoints[i], bridge: bridgePoints[i] });
  }
  return out;
}

/**
 * Lay out six saddle positions around a bridge center using the active
 * bridge string spacing. Preserves lock/visibility from any prior saddles.
 */
export function layoutSaddles(
  center: Point,
  bridgeSettings: BridgeSettings,
  prior?: HardwarePosition[],
): HardwarePosition[] {
  const offsets = stringSlotOffsets(bridgeSettings.stringSpacing, 6);
  // Slight intonation stagger so saddles aren't a perfectly flat line.
  const intonation = [1.2, 0.6, 0, 0.4, 0.9, 1.5];
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
