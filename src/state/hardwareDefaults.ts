import type { HardwarePosition } from '../geometry/types';

/** Default hardware layout, in body-local mm coordinates (same frame as body anchors). */
export interface HardwareState {
  bridgeHumbucker: HardwarePosition;
  volumeKnob: HardwarePosition;
  /** 6 individual headless saddles, spaced across the bridge position. */
  saddles: HardwarePosition[];
  /** 4-bolt neck attachment pattern (also used as back-view ferrules). */
  neckBolts: HardwarePosition[];
}

// Bridge sits near the tail, roughly on the body centerline (y small, biased
// slightly toward the treble side which is typical for a single-bridge-pickup layout).
const bridgeX = 345;
const bridgeY = -6;
const saddleSpacing = 10.5;

export const DEFAULT_HARDWARE: HardwareState = {
  bridgeHumbucker: { x: bridgeX - 18, y: bridgeY, rotation: 0, visible: true, locked: false },
  volumeKnob: { x: bridgeX - 60, y: 55, rotation: 0, visible: true, locked: false },
  saddles: Array.from({ length: 6 }, (_, i) => ({
    x: bridgeX,
    y: bridgeY + (i - 2.5) * saddleSpacing,
    rotation: 0,
    visible: true,
    locked: false,
  })),
  neckBolts: [
    { x: 40, y: 20, rotation: 0, visible: true, locked: false },
    { x: 40, y: -20, rotation: 0, visible: true, locked: false },
    { x: 95, y: 20, rotation: 0, visible: true, locked: false },
    { x: 95, y: -20, rotation: 0, visible: true, locked: false },
  ],
};
