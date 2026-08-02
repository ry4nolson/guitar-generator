// Bridge + nut configuration for realistic hardware options.
// Pure data + helpers — no React. String endpoints and saddle layouts are
// derived from these settings together with neck/hardware positions.

export type BridgeType = 'hardtail' | 'tom' | 'floyd-rose' | 'strat-tremolo';

export type NutType = 'standard' | 'locking' | 'compensated';

export interface BridgeSettings {
  type: BridgeType;
  /**
   * Center-to-center distance between the outer (low-E ↔ high-e) strings at
   * the bridge, in mm. Typical modern hardtails ≈ 52.5; TOM ≈ 51.5; Floyd ≈ 53.
   */
  stringSpacing: number;
  /** Visual saddle depth / intonation travel along the string, mm. */
  saddleTravel: number;
  /** TOM: distance from bridge centerline back to the stopbar, mm. */
  stopbarOffset: number;
  /** TOM: spacing between the two bridge posts, mm. */
  postSpacing: number;
}

export interface NutSettings {
  type: NutType;
  /** Center-to-center outer-string spacing at the nut, mm (usually ~35 for a 43 mm nut). */
  stringSpacing: number;
  /** Nut thickness along the neck axis (visual), mm. */
  thickness: number;
}

export const BRIDGE_TYPE_META: {
  id: BridgeType;
  label: string;
  description: string;
  defaultSpacing: number;
}[] = [
  {
    id: 'hardtail',
    label: 'Hardtail',
    description: 'Fixed bridge plate with individual saddles (Tele / modern hardtail family).',
    defaultSpacing: 52.5,
  },
  {
    id: 'tom',
    label: 'Tune-o-matic',
    description: 'Arched TOM bridge on two posts with a separate stopbar tailpiece.',
    defaultSpacing: 51.5,
  },
  {
    id: 'floyd-rose',
    label: 'Floyd Rose',
    description: 'Double-locking tremolo with fine tuners and locking saddles.',
    defaultSpacing: 53,
  },
  {
    id: 'strat-tremolo',
    label: 'Strat tremolo',
    description: 'Synchronized tremolo plate with six screws and stamped saddles.',
    defaultSpacing: 52.5,
  },
];

export const NUT_TYPE_META: { id: NutType; label: string; description: string }[] = [
  { id: 'standard', label: 'Standard', description: 'Bone / synthetic nut with six slots.' },
  { id: 'locking', label: 'Locking', description: 'Floyd-style locking nut with clamp screws.' },
  { id: 'compensated', label: 'Compensated', description: 'Staggered slot positions for improved intonation.' },
];

export const DEFAULT_BRIDGE_SETTINGS: BridgeSettings = {
  type: 'hardtail',
  stringSpacing: 52.5,
  saddleTravel: 18,
  stopbarOffset: 28,
  postSpacing: 74,
};

export const DEFAULT_NUT_SETTINGS: NutSettings = {
  type: 'standard',
  stringSpacing: 35,
  thickness: 5,
};

/** Y offsets for 6 strings given outer-to-outer spacing. Index 0 = bass (low E, +y). */
export function stringSlotOffsets(outerSpacingMm: number, count = 6): number[] {
  if (count < 2) return [0];
  const step = outerSpacingMm / (count - 1);
  return Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * step);
}

export function bridgeTypeMeta(type: BridgeType) {
  return BRIDGE_TYPE_META.find((t) => t.id === type) ?? BRIDGE_TYPE_META[0];
}
