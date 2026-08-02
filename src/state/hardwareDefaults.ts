import type { HardwarePosition } from '../geometry/types';

/** Hardware layout, in body-local mm coordinates (same frame as body anchors). */
export interface HardwareState {
  bridgeHumbucker: HardwarePosition;
  volumeKnob: HardwarePosition;
  /** 6 individual headless saddles, spaced across the bridge position. */
  saddles: HardwarePosition[];
  /** 4-bolt neck attachment pattern (also used as back-view ferrules). */
  neckBolts: HardwarePosition[];
}

/**
 * Builds a sensible hardware layout for a given body silhouette. Each
 * template calls this with its own tail-area geometry rather than sharing
 * one global default — body proportions differ enough between templates
 * (a Flying V's symmetric tail point vs. a Tele/Strat's offset bout) that a
 * single hardware layout wouldn't fit all three.
 */
export function buildHardwareDefaults(opts: {
  bridgeX: number;
  bridgeY?: number;
  neckJointX: number;
  neckBoltSpanX?: number;
  neckBoltSpanY?: number;
}): HardwareState {
  const bridgeY = opts.bridgeY ?? 0;
  const saddleSpacing = 10.5;
  const boltSpanX = opts.neckBoltSpanX ?? 55;
  const boltSpanY = opts.neckBoltSpanY ?? 20;
  const boltStartX = opts.neckJointX - 5;

  return {
    bridgeHumbucker: { x: opts.bridgeX - 18, y: bridgeY, rotation: 0, visible: true, locked: false },
    volumeKnob: { x: opts.bridgeX - 60, y: bridgeY + 55, rotation: 0, visible: true, locked: false },
    saddles: Array.from({ length: 6 }, (_, i) => ({
      x: opts.bridgeX,
      y: bridgeY + (i - 2.5) * saddleSpacing,
      rotation: 0,
      visible: true,
      locked: false,
    })),
    neckBolts: [
      { x: boltStartX, y: boltSpanY, rotation: 0, visible: true, locked: false },
      { x: boltStartX, y: -boltSpanY, rotation: 0, visible: true, locked: false },
      { x: boltStartX + boltSpanX, y: boltSpanY, rotation: 0, visible: true, locked: false },
      { x: boltStartX + boltSpanX, y: -boltSpanY, rotation: 0, visible: true, locked: false },
    ],
  };
}
