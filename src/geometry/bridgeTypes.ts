// Bridge + nut configuration for realistic hardware options.
// Pure data + helpers — no React. String endpoints and saddle layouts are
// derived from these settings together with neck/hardware positions.

export type BridgeType = 'hardtail' | 'tele-ashtray' | 'tom' | 'floyd-rose' | 'strat-tremolo';

/** Local +X is toward the tail. Ashtray pickup window sits this far toward the nut from the saddle cluster. */
export const ASHTRAY_PICKUP_OFFSET_X = -48.3;
/** Treble side of the window leans toward the tail, like a vintage Tele plate. */
export const ASHTRAY_PICKUP_ANGLE_DEG = 14;

export type NutType = 'standard' | 'locking' | 'compensated';

export interface BridgeSettings {
  type: BridgeType;
  /** Number of strings / saddles (1–12). */
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

export const MIN_STRING_COUNT = 1;
export const MAX_STRING_COUNT = 12;

/** Adjacent-string gap at the bridge, mm. Guitar ~10.5; bass ~19. */
export const GUITAR_BRIDGE_GAP_MM = 10.5;
export const BASS_BRIDGE_GAP_MM = 19;
/** Adjacent-string gap at the nut, mm. Guitar ~7; bass ~11.5. */
export const GUITAR_NUT_GAP_MM = 7;
export const BASS_NUT_GAP_MM = 11.5;

export interface StringSpacingOpts {
  /** Wider bass gaps (P/J ~19 mm bridge, ~11.5 mm nut). */
  bass?: boolean;
}

/** Typical outer-to-outer bridge spacing for a given string count. */
export function suggestedBridgeSpacing(stringCount: number, opts?: StringSpacingOpts): number {
  const n = Math.max(2, stringCount);
  const gap = opts?.bass ? BASS_BRIDGE_GAP_MM : GUITAR_BRIDGE_GAP_MM;
  // Guitar: 52.5 for 6, 63 for 7, 73.5 for 8. Bass: 57 for 4, 76 for 5.
  return Math.round(gap * (n - 1) * 10) / 10;
}

/** Typical outer-to-outer nut spacing for a given string count. */
export function suggestedNutSpacing(stringCount: number, opts?: StringSpacingOpts): number {
  const n = Math.max(2, stringCount);
  const gap = opts?.bass ? BASS_NUT_GAP_MM : GUITAR_NUT_GAP_MM;
  // Guitar: 35 for 6, 42 for 7, 49 for 8. Bass: 34.5 for 4, 46 for 5.
  return Math.round(gap * (n - 1) * 10) / 10;
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
    description: 'Fixed bridge plate with individual saddles (modern hardtail / no pickup in the plate).',
    defaultSpacing: 52.5,
  },
  {
    id: 'tele-ashtray',
    label: 'Ashtray',
    description: 'Vintage chrome plate with a slanted pickup window, raised rim, and string-through holes.',
    defaultSpacing: 52.5,
  },
  {
    id: 'tom',
    label: 'TOM',
    description: 'Arched TOM bridge on two posts with a separate stopbar tailpiece.',
    defaultSpacing: 51.5,
  },
  {
    id: 'floyd-rose',
    label: 'Double-lock',
    description: 'Double-locking tremolo with fine tuners and locking saddles.',
    defaultSpacing: 53,
  },
  {
    id: 'strat-tremolo',
    label: 'Sync tremolo',
    description: 'Synchronized tremolo plate with six screws and stamped saddles.',
    defaultSpacing: 52.5,
  },
];

export const NUT_TYPE_META: { id: NutType; label: string; description: string }[] = [
  { id: 'standard', label: 'Standard', description: 'Bone / synthetic nut with one slot per string.' },
  { id: 'locking', label: 'Locking', description: 'Clamp-screw locking nut (pairs with a double-lock bridge).' },
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

/** Distance from the saddle cluster toward the nut for a nested bridge pickup, or -45 when the pickup is separate. */
export function bridgePickupAlongOffset(type: BridgeType): number {
  return type === 'tele-ashtray' ? ASHTRAY_PICKUP_OFFSET_X : -45;
}
