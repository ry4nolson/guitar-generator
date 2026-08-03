// Headstock styles and tuner layouts. Pure geometry — no React.
// Neck-local frame: nut at x=0, heel at +neckLength, headstock tip at −length.

import type { Point } from './types';
import type { NeckParams } from './neckParams';
import { trebleFanOffset } from './frets';
import { neckToBodySpace, type NeckPlacement } from './neckPlacement';
import { saddleClusterCenter } from './strings';
import type { HardwarePosition } from './types';

export type HeadstockType = 'headless' | 'paddle' | '6-inline' | '3x3' | 'pointy';

export type TunerLayout = 'none' | 'headless' | '6-inline' | '3x3';

export interface HeadstockSettings {
  type: HeadstockType;
  /** Length from nut face to tip, mm. Ignored when type is headless. */
  length: number;
  /** Width at the tip (or narrowest end), mm. */
  tipWidth: number;
  /** Extra half-width of 3×3 “ears” past the nut width, mm. */
  earWidth: number;
  showTuners: boolean;
  tunerLayout: TunerLayout;
}

export const DEFAULT_HEADSTOCK_SETTINGS: HeadstockSettings = {
  type: 'paddle',
  length: 175,
  tipWidth: 68,
  earWidth: 30,
  showTuners: true,
  tunerLayout: '6-inline',
};

/** Preserved look for designs that were authored before headed necks existed. */
export const LEGACY_HEADLESS_SETTINGS: HeadstockSettings = {
  type: 'headless',
  length: 40,
  tipWidth: 40,
  earWidth: 20,
  showTuners: true,
  tunerLayout: 'headless',
};

export const HEADSTOCK_TYPE_META: {
  id: HeadstockType;
  label: string;
  description: string;
  defaultTunerLayout: TunerLayout;
}[] = [
  {
    id: 'headless',
    label: 'Headless',
    description: 'No headstock — tuners live at the bridge end of the body.',
    defaultTunerLayout: 'headless',
  },
  {
    id: 'paddle',
    label: 'Paddle',
    description: 'Classic rounded paddle headstock (Tele / Strat family).',
    defaultTunerLayout: '6-inline',
  },
  {
    id: '6-inline',
    label: '6-inline',
    description: 'Asymmetric headstock shaped for a single row of tuners.',
    defaultTunerLayout: '6-inline',
  },
  {
    id: '3x3',
    label: '3×3',
    description: 'Symmetrical winged headstock for three tuners per side.',
    defaultTunerLayout: '3x3',
  },
  {
    id: 'pointy',
    label: 'Pointy',
    description: 'Angular pointed tip — Explorer / metal-inspired silhouette.',
    defaultTunerLayout: '6-inline',
  },
];

export const TUNER_LAYOUT_META: { id: TunerLayout; label: string; description: string }[] = [
  { id: 'none', label: 'None', description: 'Hide tuners.' },
  { id: 'headless', label: 'Bridge-end', description: 'Six mini tuners past the bridge (headless).' },
  { id: '6-inline', label: '6-inline', description: 'Six tuners in a row on the bass side of the headstock.' },
  { id: '3x3', label: '3×3', description: 'Three tuners on each side of the headstock.' },
];

export function headstockTypeMeta(type: HeadstockType) {
  return HEADSTOCK_TYPE_META.find((t) => t.id === type) ?? HEADSTOCK_TYPE_META[1];
}

/**
 * Neck-local outline of the headstock (closed polygon), or null for headless.
 * Points run clockwise from the bass nut corner.
 */
export function computeHeadstockOutlineLocal(
  neckParams: NeckParams,
  settings: HeadstockSettings,
): Point[] | null {
  if (settings.type === 'headless') return null;

  const nutHalf = neckParams.nutWidth / 2;
  const tipHalf = Math.max(8, settings.tipWidth / 2);
  const L = Math.max(40, settings.length);
  const ear = settings.earWidth;

  const outline = computeOutlineShape(settings.type, L, nutHalf, tipHalf, ear);
  if (!outline) return null;

  // On a fanned board the nut face is angled (fret 0): the treble nut corner
  // sits trebleFanOffset further along, so the headstock base must meet it.
  const fanOffset = trebleFanOffset(neckParams);
  if (fanOffset === 0) return outline;
  return outline.map((p) => (p.x === 0 && p.y < 0 ? { ...p, x: fanOffset } : p));
}

function computeOutlineShape(
  type: HeadstockType,
  L: number,
  nutHalf: number,
  tipHalf: number,
  ear: number,
): Point[] | null {
  switch (type) {
    case 'paddle':
      return [
        { x: 0, y: nutHalf },
        { x: -L * 0.12, y: nutHalf + 3 },
        { x: -L * 0.55, y: tipHalf + 6 },
        { x: -L * 0.92, y: tipHalf + 2 },
        { x: -L, y: tipHalf * 0.55 },
        { x: -L, y: -tipHalf * 0.55 },
        { x: -L * 0.92, y: -tipHalf - 1 },
        { x: -L * 0.55, y: -tipHalf - 4 },
        { x: -L * 0.12, y: -nutHalf - 1 },
        { x: 0, y: -nutHalf },
      ];
    case '6-inline':
      // Wider on the bass (+y) side where the tuner row sits.
      return [
        { x: 0, y: nutHalf },
        { x: -L * 0.08, y: nutHalf + 8 },
        { x: -L * 0.45, y: tipHalf + 14 },
        { x: -L * 0.95, y: tipHalf + 10 },
        { x: -L, y: tipHalf * 0.3 },
        { x: -L, y: -tipHalf * 0.85 },
        { x: -L * 0.7, y: -tipHalf - 2 },
        { x: -L * 0.2, y: -nutHalf - 2 },
        { x: 0, y: -nutHalf },
      ];
    case '3x3':
      return [
        { x: 0, y: nutHalf },
        { x: -L * 0.1, y: nutHalf + ear * 0.35 },
        { x: -L * 0.35, y: nutHalf + ear },
        { x: -L * 0.55, y: nutHalf + ear * 0.85 },
        { x: -L * 0.85, y: tipHalf + 4 },
        { x: -L, y: tipHalf * 0.4 },
        { x: -L, y: -tipHalf * 0.4 },
        { x: -L * 0.85, y: -tipHalf - 4 },
        { x: -L * 0.55, y: -nutHalf - ear * 0.85 },
        { x: -L * 0.35, y: -nutHalf - ear },
        { x: -L * 0.1, y: -nutHalf - ear * 0.35 },
        { x: 0, y: -nutHalf },
      ];
    case 'pointy':
      return [
        { x: 0, y: nutHalf },
        { x: -L * 0.25, y: tipHalf + 10 },
        { x: -L * 0.75, y: tipHalf + 4 },
        { x: -L, y: 0 },
        { x: -L * 0.75, y: -tipHalf - 2 },
        { x: -L * 0.25, y: -tipHalf - 8 },
        { x: 0, y: -nutHalf },
      ];
    default:
      return null;
  }
}

export function computeHeadstockOutlineBody(
  neckParams: NeckParams,
  settings: HeadstockSettings,
  placement: NeckPlacement,
): Point[] {
  const local = computeHeadstockOutlineLocal(neckParams, settings);
  if (!local) return [];
  return local.map((p) => neckToBodySpace(p, neckParams, placement));
}

export interface TunerMark {
  index: number;
  position: Point;
  /** Post radius hint for drawing, mm. */
  radius: number;
}

/**
 * Tuner post centers in body space for `stringCount` strings.
 * Empty when showTuners is false or layout is none.
 * Headless layout parks posts past the bridge cluster toward the tail.
 */
export function computeTunerPositions(
  neckParams: NeckParams,
  settings: HeadstockSettings,
  placement: NeckPlacement,
  saddles: HardwarePosition[],
  stringCount = 6,
): TunerMark[] {
  if (!settings.showTuners || settings.tunerLayout === 'none') return [];
  const n = Math.max(1, stringCount);

  if (settings.tunerLayout === 'headless') {
    const center = saddleClusterCenter(saddles);
    // Past the bridge toward the tail (+x in body space when neckAngle ≈ 0).
    const base = neckToBodySpace(
      { x: neckParams.bassScale + 28, y: 0 },
      neckParams,
      placement,
    );
    // Prefer scale-derived x, fall back to saddle cluster if something is off.
    const originX = Number.isFinite(base.x) ? base.x : center.x + 28;
    const originY = center.y;
    const span = Math.max(48, 8 * (n - 1));
    return Array.from({ length: n }, (_, i) => {
      const t = n <= 1 ? 0.5 : i / (n - 1);
      return {
        index: i,
        position: { x: originX + (i % 2) * 7, y: originY - span / 2 + t * span },
        radius: 3.2,
      };
    });
  }

  const L = Math.max(40, settings.length);
  const nutHalf = neckParams.nutWidth / 2;

  if (settings.tunerLayout === '6-inline') {
    // Single row on the bass (+y) side of the headstock — works for any count.
    const x0 = -L * 0.18;
    const x1 = -L * 0.88;
    const y = nutHalf * 0.55 + 10;
    return Array.from({ length: n }, (_, i) => {
      const t = n <= 1 ? 0.5 : i / (n - 1);
      const local = { x: x0 + t * (x1 - x0), y };
      return {
        index: i,
        position: neckToBodySpace(local, neckParams, placement),
        radius: 4.2,
      };
    });
  }

  // Split layout: ceil(n/2) bass side, floor(n/2) treble side.
  const bassCount = Math.ceil(n / 2);
  const trebleCount = Math.floor(n / 2);
  const yBass = nutHalf * 0.35 + settings.earWidth * 0.55;
  const yTreble = -yBass;
  const marks: TunerMark[] = [];
  const placeRow = (count: number, y: number, startIndex: number) => {
    for (let i = 0; i < count; i++) {
      const t = count <= 1 ? 0.5 : i / (count - 1);
      const x = -L * (0.22 + t * 0.58);
      marks.push({
        index: startIndex + i,
        position: neckToBodySpace({ x, y }, neckParams, placement),
        radius: 4.2,
      });
    }
  };
  placeRow(bassCount, yBass, 0);
  placeRow(trebleCount, yTreble, bassCount);
  return marks;
}
