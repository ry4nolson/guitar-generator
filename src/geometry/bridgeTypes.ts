// Bridge + nut configuration for realistic hardware options.
// Pure data + helpers — no React. String endpoints and saddle layouts are
// derived from these settings together with neck/hardware positions.

export type BridgeType = 'hardtail' | 'tom' | 'floyd-rose' | 'strat-tremolo';

export type NutType = 'standard' | 'locking' | 'compensated';

export interface BridgeSettings {
  type: BridgeType;
  /** Number of strings / saddles (6–12). */
  stringCount: number;
  /**
   * Center-to-center distance between the outer strings at the bridge, in mm.
   * Typical 6-string hardtails ≈ 52.5; 7-string ≈ 58–63; 8-string ≈ 70+.
   */
  stringSpacing: number;
  /** Visual saddle depth / intonation travel along the string, mm. */
  saddleTravel: number;
  /** TOM: distance from bridge centerline back to the stopbar, mm. */
  stopbarOffset: number;
  /** TOM: spacing between the two bridge posts, mm. */
  postSpacing: number;
}

export const MIN_STRING_COUNT = 6;
export const MAX_STRING_COUNT = 12;

/** Typical outer-to-outer bridge spacing for a given string count. */
export function suggestedBridgeSpacing(stringCount: number): number {
  const n = Math.max(2, stringCount);
  // ~10.5 mm per adjacent gap → 52.5 for 6, 63 for 7, 73.5 for 8, …
  return Math.round(10.5 * (n - 1) * 10) / 10;
}

/** Typical outer-to-outer nut spacing for a given string count. */
export function suggestedNutSpacing(stringCount: number): number {
  const n = Math.max(2, stringCount);
  // ~7 mm per adjacent gap → 35 for 6, 42 for 7, 49 for 8, …
  return Math.round(7 * (n - 1) * 10) / 10;
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
  { id: 'standard', label: 'Standard', description: 'Bone / synthetic nut with one slot per string.' },
  { id: 'locking', label: 'Locking', description: 'Floyd-style locking nut with clamp screws.' },
  { id: 'compensated', label: 'Compensated', description: 'Staggered slot positions for improved intonation.' },
];

export const DEFAULT_BRIDGE_SETTINGS: BridgeSettings = {
  type: 'hardtail',
  stringCount: 6,
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

/**
 * Y offsets for N strings given outer-to-outer spacing.
 * Index 0 = treble (−y), index N−1 = bass (+y) — matches fan / scale layout.
 */
export function stringSlotOffsets(outerSpacingMm: number, count = 6): number[] {
  if (count < 2) return [0];
  const step = outerSpacingMm / (count - 1);
  return Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * step);
}

/** Mild intonation stagger (mm toward the tail), treble→bass, length = count. */
export function intonationStagger(count: number): number[] {
  return Array.from({ length: count }, (_, i) => {
    const t = count <= 1 ? 0 : i / (count - 1);
    // Mild rise ≈0.3 … 1.5 (matches the classic 6-string visual stagger).
    return Math.round((0.3 + t * 1.2) * 100) / 100;
  });
}

export function bridgeTypeMeta(type: BridgeType) {
  return BRIDGE_TYPE_META.find((t) => t.id === type) ?? BRIDGE_TYPE_META[0];
}
