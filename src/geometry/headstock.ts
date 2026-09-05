// Headstock styles, editable outline anchors, and tuner layouts.
// Neck-local frame: nut at x=0, heel at +neckLength, headstock tip at −length.
// +y = bass, −y = treble.
//
// Headed styles seed a small Bezier anchor loop (nut corners locked). Users
// drag the free points/handles like the body outline; presets re-seed on type
// change or explicit reset.

import type { Point } from './types';
import type { NeckParams } from './neckParams';
import { trebleFanOffset } from './frets';
import { neckToBodySpace, type NeckPlacement } from './neckPlacement';
import { saddleClusterCenter } from './strings';
import type { HardwarePosition } from './types';
import { TRACED_HEADS, tracedHeadAnchors, type TracedHeadId } from './headstockOutlines';
import { clampHeadstockLocalPoint, maxTunerRowSpanMm } from './editLimits';

export type HeadstockType = 'headless' | 'paddle' | 'tele' | '6-inline' | '3x3' | 'pointy';

export type TunerLayout = 'none' | 'headless' | '6-inline' | '3x3';

export interface HeadstockSettings {
  type: HeadstockType;
  /** Length from nut face to tip, mm. Ignored when type is headless. */
  length: number;
  /** Overall head width at its widest point, mm. */
  tipWidth: number;
  /** Legacy 3×3 ear setting; kept for saved documents, no longer drives the outline. */
  earWidth: number;
  showTuners: boolean;
  tunerLayout: TunerLayout;
  /**
   * How far tuner centers sit inward from the outline edge (mm).
   * Higher = more toward the centerline.
   */
  tunerInset: number;
  /**
   * Fraction of tip→nut span kept clear at the tip (0.05–0.45).
   * Higher pulls the first/last pegs away from a narrow tip.
   */
  tunerTipClearance: number;
  /** Fraction of the flank kept clear between the nut and the first peg. */
  tunerNutClearance: number;
  /** Arc-length margin (mm) at each end of the tuner row along the edge. */
  tunerEndMargin: number;
  /** Extra degrees added to each peg wing angle. */
  tunerPegAngleOffset: number;
}

/** Editable headstock outline point in neck-local mm (closed loop, nut bass → tip → nut treble). */
export interface HeadstockAnchor {
  id: string;
  position: Point;
  handleIn: Point;
  handleOut: Point;
  /** Nut corners are always locked to the nut face. */
  locked: boolean;
  manuallyEdited: boolean;
  mirrorHandles: boolean;
  pairOpposite?: boolean;
}

export const NUT_BASS_ID = 'nutBass';
export const NUT_TREBLE_ID = 'nutTreble';

export const DEFAULT_HEADSTOCK_SETTINGS: HeadstockSettings = {
  type: 'paddle',
  length: 175,
  tipWidth: 93,
  earWidth: 28,
  showTuners: true,
  tunerLayout: '6-inline',
  tunerInset: 12,
  tunerTipClearance: 0.13,
  tunerNutClearance: 0.22,
  tunerEndMargin: 8,
  tunerPegAngleOffset: 0,
};

/** Preserved look for designs that were authored before headed necks existed. */
export const LEGACY_HEADLESS_SETTINGS: HeadstockSettings = {
  type: 'headless',
  length: 40,
  tipWidth: 40,
  earWidth: 20,
  showTuners: true,
  tunerLayout: 'headless',
  tunerInset: 12,
  tunerTipClearance: 0.14,
  tunerNutClearance: 0.12,
  tunerEndMargin: 8,
  tunerPegAngleOffset: 0,
};

/** Keep at least this many free (non-nut) outline points. */
export const MIN_FREE_HEADSTOCK_POINTS = 3;

export const HEADSTOCK_TYPE_META: {
  id: HeadstockType;
  label: string;
  description: string;
  defaultTunerLayout: TunerLayout;
  /**
   * Tip clearance that keeps the peg row on the straight tuner edge for this
   * silhouette (slanted / pointed ends need more room before the first peg).
   */
  defaultTipClearance: number;
  /** Flank fraction between the nut and the first peg (clears the nut flare). */
  defaultNutClearance: number;
  /** Natural nut→tip length and overall width of the traced reference, mm. */
  defaultDims: { length: number; tipWidth: number };
}[] = [
  {
    id: 'headless',
    label: 'Headless',
    description: 'No headstock — tuners live at the bridge end of the body.',
    defaultTunerLayout: 'headless',
    defaultTipClearance: 0.14,
    defaultNutClearance: 0.12,
    defaultDims: { length: 40, tipWidth: 40 },
  },
  {
    id: 'paddle',
    label: 'Paddle',
    description:
      'Angled straight tuner edge, bulb tip swelling to the treble side, scoop and bump below. Drag free points to reshape.',
    defaultTunerLayout: '6-inline',
    defaultTipClearance: 0.13,
    defaultNutClearance: 0.22,
    defaultDims: { length: 175, tipWidth: 93 },
  },
  {
    id: 'tele',
    label: 'Slim',
    description:
      'Slimmer head with a hooked tip and gentler treble scoop. Drag free points to reshape.',
    defaultTunerLayout: '6-inline',
    defaultTipClearance: 0.12,
    defaultNutClearance: 0.17,
    defaultDims: { length: 174, tipWidth: 79 },
  },
  {
    id: '6-inline',
    label: 'Shark fin',
    description:
      'Superstrat-style: straight tuner edge, slanted end, sharp point on the treble side. Drag free points to reshape.',
    defaultTunerLayout: '6-inline',
    defaultTipClearance: 0.17,
    defaultNutClearance: 0.17,
    defaultDims: { length: 191, tipWidth: 80 },
  },
  {
    id: '3x3',
    label: 'Open book',
    description:
      'Flared trapezoid, sharp ear tips, two crown humps meeting at a centre notch. Drag free points to reshape.',
    defaultTunerLayout: '3x3',
    defaultTipClearance: 0.24,
    defaultNutClearance: 0.12,
    defaultDims: { length: 178, tipWidth: 82 },
  },
  {
    id: 'pointy',
    label: 'Pointy',
    description:
      'Metal-style: hooked bass shoulder, long straight tuner edge out to a treble-side spike. Drag free points to reshape.',
    defaultTunerLayout: '6-inline',
    defaultTipClearance: 0.28,
    defaultNutClearance: 0.24,
    defaultDims: { length: 185, tipWidth: 134 },
  },
];

export const TUNER_LAYOUT_META: { id: TunerLayout; label: string; description: string }[] = [
  { id: 'none', label: 'None', description: 'Hide tuners.' },
  { id: 'headless', label: 'Bridge-end', description: 'Mini tuners past the bridge (one per string).' },
  { id: '6-inline', label: 'Inline', description: 'Single row along the bass edge — scales with string count.' },
  { id: '3x3', label: 'Split', description: 'Tuners split bass / treble (e.g. 3+3, 4+3, 4+4).' },
];

export function headstockTypeMeta(type: HeadstockType) {
  return HEADSTOCK_TYPE_META.find((t) => t.id === type) ?? HEADSTOCK_TYPE_META[1];
}

export function isHeadstockDirty(anchors: HeadstockAnchor[]): boolean {
  return anchors.some((a) => a.manuallyEdited && !a.locked);
}

/**
 * Map fretted string index (0 = treble / high E) to a tuner mark index.
 * Inline: tip→nut matches string 0→N−1 (high E at tip, low E at nut).
 * 3×3: bass-side pegs first (tip→nut), then treble-side pegs (tip→nut).
 */
export function mapStringIndexToTunerIndex(
  stringIndex: number,
  stringCount: number,
  layout: TunerLayout,
): number {
  const n = Math.max(1, stringCount);
  const i = Math.max(0, Math.min(n - 1, stringIndex));
  if (layout !== '3x3') return i;
  const bassCount = Math.ceil(n / 2);
  const trebleCount = Math.floor(n / 2);
  // Treble strings (0…) → treble-side pegs; bass strings → bass-side pegs.
  // Within each side, tip-first layout: highest of the side at tip index 0.
  if (i < trebleCount) return bassCount + i;
  return i - trebleCount;
}

/** Insert a free outline point between `afterId` and the next anchor. */
export function insertHeadstockAnchorAfter(
  anchors: HeadstockAnchor[],
  afterId: string,
): HeadstockAnchor[] {
  if (anchors.length < 2) return anchors;
  let i = anchors.findIndex((a) => a.id === afterId);
  if (i < 0) i = 0;
  // Never insert past the locked treble nut corner — place before it instead.
  if (anchors[i]?.id === NUT_TREBLE_ID) i = Math.max(0, i - 1);
  const a = anchors[i];
  const b = anchors[i + 1];
  if (!a || !b) return anchors;

  const mid = { x: (a.position.x + b.position.x) / 2, y: (a.position.y + b.position.y) / 2 };
  const dx = b.position.x - a.position.x;
  const dy = b.position.y - a.position.y;
  const len = Math.hypot(dx, dy) || 1;
  const hx = (dx / len) * 10;
  const hy = (dy / len) * 10;
  const neu: HeadstockAnchor = {
    id: `hs-${Date.now().toString(36)}`,
    position: mid,
    handleIn: { x: mid.x - hx, y: mid.y - hy },
    handleOut: { x: mid.x + hx, y: mid.y + hy },
    locked: false,
    manuallyEdited: true,
    mirrorHandles: true,
  };
  const next = [...anchors];
  next.splice(i + 1, 0, neu);
  return next;
}

/** Remove a free outline point (nut corners and the last few free points are protected). */
export function removeHeadstockAnchorById(
  anchors: HeadstockAnchor[],
  id: string,
): HeadstockAnchor[] {
  const target = anchors.find((a) => a.id === id);
  if (!target || target.locked) return anchors;
  const free = anchors.filter((a) => !a.locked).length;
  if (free <= MIN_FREE_HEADSTOCK_POINTS) return anchors;
  return anchors.filter((a) => a.id !== id);
}

/** Seed editable anchors from the active preset (empty when headless). */
export function seedHeadstockAnchors(
  neckParams: NeckParams,
  settings: HeadstockSettings,
  stringCount = 6,
): HeadstockAnchor[] {
  if (settings.type === 'headless') return [];
  const authored = authorHeadstockAnchors(neckParams, settings, stringCount);
  if (!authored || authored.length < 3) return [];
  return syncHeadstockNutCorners(authored, neckParams);
}

/** Keep nut corners glued to the nut face / fan line. */
export function syncHeadstockNutCorners(
  anchors: HeadstockAnchor[],
  neckParams: NeckParams,
): HeadstockAnchor[] {
  if (anchors.length < 2) return anchors;
  const nutHalf = neckParams.nutWidth / 2;
  const fan = trebleFanOffset(neckParams);
  // Handles ride along with the corner so the preset's first/last segment
  // keeps its shape; degenerate handles fall back to a tangent along the neck.
  const glue = (a: HeadstockAnchor, id: string, position: Point, fallbackIn: Point, fallbackOut: Point) => {
    const dx = position.x - a.position.x;
    const dy = position.y - a.position.y;
    const shift = (p: Point) => ({ x: p.x + dx, y: p.y + dy });
    const ok = (p: Point) => Number.isFinite(p?.x) && Number.isFinite(p?.y);
    return {
      ...a,
      id,
      locked: true,
      position,
      handleIn: ok(a.handleIn) ? shift(a.handleIn) : fallbackIn,
      handleOut: ok(a.handleOut) ? shift(a.handleOut) : fallbackOut,
    };
  };
  return anchors.map((a, i) => {
    if (i === 0 || a.id === NUT_BASS_ID) {
      const p = { x: 0, y: nutHalf };
      return glue(a, NUT_BASS_ID, p, { x: p.x, y: p.y - 4 }, { x: p.x - 10, y: p.y + 2 });
    }
    if (i === anchors.length - 1 || a.id === NUT_TREBLE_ID) {
      const p = { x: fan, y: -nutHalf };
      return glue(a, NUT_TREBLE_ID, p, { x: p.x - 10, y: p.y - 2 }, { x: p.x, y: p.y + 4 });
    }
    return a;
  });
}

/** Closed cubic path `d` from neck-local anchors (for transforming in the caller). */
export function headstockAnchorsToPathD(anchors: HeadstockAnchor[]): string {
  if (anchors.length < 2) return '';
  const n = anchors.length;
  let d = `M ${anchors[0].position.x.toFixed(3)} ${anchors[0].position.y.toFixed(3)} `;
  for (let i = 0; i < n; i++) {
    const cur = anchors[i];
    const next = anchors[(i + 1) % n];
    d += `C ${cur.handleOut.x.toFixed(3)} ${cur.handleOut.y.toFixed(3)}, `;
    d += `${next.handleIn.x.toFixed(3)} ${next.handleIn.y.toFixed(3)}, `;
    d += `${next.position.x.toFixed(3)} ${next.position.y.toFixed(3)} `;
  }
  d += 'Z';
  return d;
}

/**
 * Neck-local outline samples for tuners/bounds.
 * Prefers editable anchors when present — densely samples the cubic Bezier
 * path (not just control points), so pegs follow the drawn silhouette.
 */
export function computeHeadstockOutlineLocal(
  neckParams: NeckParams,
  settings: HeadstockSettings,
  stringCount = 6,
  anchors?: HeadstockAnchor[] | null,
): Point[] | null {
  if (settings.type === 'headless') return null;
  if (anchors && anchors.length >= 3) {
    return sampleHeadstockBezierOutline(anchors, 14);
  }
  const seeded = seedHeadstockAnchors(neckParams, settings, stringCount);
  return seeded.length >= 3 ? sampleHeadstockBezierOutline(seeded, 14) : null;
}

/** Flatten closed cubic headstock anchors into a dense polyline (includes nut face). */
export function sampleHeadstockBezierOutline(
  anchors: HeadstockAnchor[],
  stepsPerSegment = 14,
): Point[] {
  const n = anchors.length;
  if (n < 2) return [];
  const steps = Math.max(4, Math.floor(stepsPerSegment));
  const out: Point[] = [{ ...anchors[0].position }];
  for (let i = 0; i < n; i++) {
    const cur = anchors[i];
    const next = anchors[(i + 1) % n];
    // Emit t = 1 (the joint itself) so sharp corners survive sampling.
    for (let s = 1; s <= steps; s++) {
      out.push(cubicBezierPoint(cur.position, cur.handleOut, next.handleIn, next.position, s / steps));
    }
  }
  // Close onto the first nut-bass point.
  const first = out[0];
  const last = out[out.length - 1];
  if (!last || Math.hypot(last.x - first.x, last.y - first.y) > 0.2) {
    out.push({ ...first });
  }
  return out;
}

function cubicBezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

export function computeHeadstockOutlineBody(
  neckParams: NeckParams,
  settings: HeadstockSettings,
  placement: NeckPlacement,
  stringCount = 6,
  anchors?: HeadstockAnchor[] | null,
): Point[] {
  const local = computeHeadstockOutlineLocal(neckParams, settings, stringCount, anchors);
  if (!local) return [];
  return local.map((p) => neckToBodySpace(p, neckParams, placement));
}

/** Body-space copy of anchors (for rendering / hit targets). */
export function headstockAnchorsToBody(
  anchors: HeadstockAnchor[],
  neckParams: NeckParams,
  placement: NeckPlacement,
): HeadstockAnchor[] {
  return anchors.map((a) => ({
    ...a,
    position: neckToBodySpace(a.position, neckParams, placement),
    handleIn: neckToBodySpace(a.handleIn, neckParams, placement),
    handleOut: neckToBodySpace(a.handleOut, neckParams, placement),
  }));
}

const TRACED_HEAD_FOR_TYPE: Partial<Record<HeadstockType, TracedHeadId>> = {
  paddle: 'strat',
  tele: 'tele',
  '6-inline': 'sharkFin',
  '3x3': 'openBook',
  pointy: 'pointy',
};

/**
 * Preset outline for a head type at the requested dimensions. Presets are
 * traced silhouettes (see headstockOutlines.ts) scaled to `length` × `tipWidth`
 * (multi-string necks grow both) and blended onto the real nut width.
 */
function authorHeadstockAnchors(
  neckParams: NeckParams,
  settings: HeadstockSettings,
  stringCount: number,
): HeadstockAnchor[] | null {
  const traced = TRACED_HEAD_FOR_TYPE[settings.type];
  if (!traced) return null;
  const nutHalf = neckParams.nutWidth / 2;
  const grow = Math.max(0, stringCount - 6) * 3.5;
  const length = Math.max(40, settings.length + grow * 2.5);
  const width = Math.max(nutHalf * 2 + 8, settings.tipWidth + grow * 0.7);
  return tracedHeadAnchors(TRACED_HEADS[traced], length, width, nutHalf);
}

/**
 * Keep a dragged peg on the wood. Points already inside stay put; anything
 * off the silhouette snaps to the nearest interior (a few mm in from the
 * edge so the post hole does not hang off).
 */
export function clampPointToHeadstockOutline(
  local: Point,
  outline: Point[] | null | undefined,
  edgeInset = 5,
): Point {
  if (!outline || outline.length < 3) return clampHeadstockLocalPoint(local);
  if (pointInPolygon(local, outline)) return local;
  const { point: edgePt } = closestOnPolyline(outline, local);
  return insetFromEdge(edgePt, outline, edgeInset, outline);
}

export interface TunerMark {
  index: number;
  position: Point;
  radius: number;
  pegAngleDeg: number;
}

export function computeTunerPositions(
  neckParams: NeckParams,
  settings: HeadstockSettings,
  placement: NeckPlacement,
  saddles: HardwarePosition[],
  stringCount = 6,
  anchors?: HeadstockAnchor[] | null,
): TunerMark[] {
  if (!settings.showTuners || settings.tunerLayout === 'none') return [];
  const n = Math.max(1, stringCount);
  const angleOffset = Number.isFinite(settings.tunerPegAngleOffset) ? settings.tunerPegAngleOffset : 0;

  if (settings.tunerLayout === 'headless') {
    return placeHeadlessTuners(neckParams, placement, saddles, n).map((t) => ({
      ...t,
      pegAngleDeg: t.pegAngleDeg + angleOffset,
    }));
  }

  const outline = computeHeadstockOutlineLocal(neckParams, settings, n, anchors);
  if (!outline || outline.length < 4) return [];

  const toBody = (local: Point, pegAngleDeg: number, index: number): TunerMark => ({
    index,
    position: neckToBodySpace(local, neckParams, placement),
    radius: n > 8 ? 3.6 : 4.2,
    pegAngleDeg: pegAngleDeg + neckParams.neckAngle + angleOffset,
  });

  const inset =
    typeof settings.tunerInset === 'number' && Number.isFinite(settings.tunerInset)
      ? settings.tunerInset
      : settings.type === '3x3'
        ? 11
        : 12;
  const tipClearance =
    typeof settings.tunerTipClearance === 'number' && Number.isFinite(settings.tunerTipClearance)
      ? clamp(settings.tunerTipClearance, 0.05, 0.45)
      : headstockTypeMeta(settings.type).defaultTipClearance;
  const nutClearance =
    typeof settings.tunerNutClearance === 'number' && Number.isFinite(settings.tunerNutClearance)
      ? clamp(settings.tunerNutClearance, 0.05, 0.45)
      : headstockTypeMeta(settings.type).defaultNutClearance;
  const endMargin =
    typeof settings.tunerEndMargin === 'number' && Number.isFinite(settings.tunerEndMargin)
      ? clamp(settings.tunerEndMargin, 0, 24)
      : 8;

  const trims = { inset, tipClearance, nutClearance, endMargin };
  if (settings.tunerLayout === '6-inline') {
    return placeAlongSide(outline, 'bass', n, trims, 'tip').map((p, i) => toBody(p.position, p.outAngleDeg, i));
  }

  const bassCount = Math.ceil(n / 2);
  const trebleCount = Math.floor(n / 2);
  // Follow the flared ears at constant inset — a straight row pulls the tip
  // pegs inward off the open-book silhouette.
  const bass = placeAlongSide(outline, 'bass', bassCount, trims, 'centre', false);
  const treble = placeAlongSide(outline, 'treble', trebleCount, trims, 'centre', false);
  const marks: TunerMark[] = bass.map((p, i) => toBody(p.position, p.outAngleDeg, i));
  for (let i = 0; i < treble.length; i++) marks.push(toBody(treble[i].position, treble[i].outAngleDeg, bassCount + i));
  return marks;
}

/**
 * Auto-layout tuners as hardware positions. Locked prior entries keep their
 * x/y/rotation; unlocked slots follow the current outline/inset/layout.
 */
export function layoutTunersAsHardware(
  neckParams: NeckParams,
  settings: HeadstockSettings,
  placement: NeckPlacement,
  saddles: HardwarePosition[],
  stringCount = 6,
  anchors?: HeadstockAnchor[] | null,
  prior?: HardwarePosition[] | null,
): HardwarePosition[] {
  const marks = computeTunerPositions(neckParams, settings, placement, saddles, stringCount, anchors);
  return marks.map((m, i) => {
    const prev = prior?.[i];
    if (prev?.locked) return { ...prev };
    return {
      x: m.position.x,
      y: m.position.y,
      rotation: m.pegAngleDeg,
      visible: prev?.visible ?? true,
      locked: false,
    };
  });
}

function placeHeadlessTuners(
  neckParams: NeckParams,
  placement: NeckPlacement,
  saddles: HardwarePosition[],
  n: number,
): TunerMark[] {
  const center = saddleClusterCenter(saddles);
  const base = neckToBodySpace({ x: neckParams.bassScale + 28, y: 0 }, neckParams, placement);
  const originX = Number.isFinite(base.x) ? base.x : center.x + 28;
  const originY = center.y;
  const span = Math.max(48, 8 * (n - 1));
  return Array.from({ length: n }, (_, i) => {
    const t = n <= 1 ? 0.5 : i / (n - 1);
    return {
      index: i,
      position: { x: originX + (i % 2) * 7, y: originY - span / 2 + t * span },
      radius: 3.2,
      pegAngleDeg: 0,
    };
  });
}

interface RowTrims {
  inset: number;
  tipClearance: number;
  nutClearance: number;
  endMargin: number;
}

interface PlacedPeg {
  position: Point;
  /** Neck-local degrees; glyph +X aims outboard, perpendicular to the peg row. */
  outAngleDeg: number;
}

function placeAlongSide(
  outline: Point[],
  side: 'bass' | 'treble',
  count: number,
  { inset, tipClearance, nutClearance, endMargin }: RowTrims,
  splitAt: 'tip' | 'centre',
  straighten = true,
): PlacedPeg[] {
  if (count <= 0) return [];
  // nut → tip along the chosen flank of the closed outline.
  const edge = extractSideEdge(outline, side, splitAt);
  if (edge.length < 2) return [];

  const densified = densifyPolyline(edge, 64);
  if (densified.length < 2) return [];
  const total = polylineLength(densified);
  if (total < 1e-3) return [];

  // Tip-first: index 0 near tip (high E for inline). Trim tip/nut by fraction of
  // arc length — more stable than x-range clipping on scooped/curved flanks.
  const tipFirst = [...densified].reverse();
  const tipTrim = total * tipClearance;
  const nutTrim = total * nutClearance;
  const pad = Math.min(endMargin, total * 0.08);
  const start = Math.min(tipTrim + pad, total * 0.42);
  const end = Math.max(total - nutTrim - pad, start + total * 0.2);
  // Keep the bank compact near the tip. Spreading across a dragged-out
  // hypotenuse is what parked pegs in the middle of a metre-long wedge.
  const span = Math.min(end - start, maxTunerRowSpanMm(count));

  const raw = Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const edgePt = pointAtArcLength(tipFirst, start + t * span);
    return insetFromEdge(edgePt, tipFirst, inset, outline);
  });
  const pts = straighten ? straightenRow(raw, outline) : raw;
  const outAngleDeg = rowOutwardAngle(pts, outline);
  return pts.map((position) => ({ position, outAngleDeg }));
}

/**
 * Outward normal of a drilled peg row, in neck-local degrees. Keys share one
 * angle so a straight tuner edge gets a matching bank of parallel pegs.
 */
function rowOutwardAngle(pts: Point[], outline: Point[]): number {
  const c = polygonCentroid(outline);
  if (pts.length === 0) return 90;
  if (pts.length === 1) {
    return (Math.atan2(pts[0].y - c.y, pts[0].x - c.x) * 180) / Math.PI;
  }
  const mid = {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  };
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of pts) {
    const dx = p.x - mid.x;
    const dy = p.y - mid.y;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const u = { x: Math.cos(theta), y: Math.sin(theta) };
  let nx = -u.y;
  let ny = u.x;
  if (nx * (mid.x - c.x) + ny * (mid.y - c.y) < 0) {
    nx = -nx;
    ny = -ny;
  }
  return (Math.atan2(ny, nx) * 180) / Math.PI;
}

/**
 * Real tuner rows are drilled on a straight line even when the edge curves
 * (Fender bulb, flared ears). Fit a line through the nut-side pegs — the
 * ones on the straight part of the flank — and project every peg onto it,
 * nudging toward the centerline if that would leave the silhouette.
 */
function straightenRow(pts: Point[], outline: Point[]): Point[] {
  if (pts.length < 3) return pts;
  const ref = pts.slice(Math.floor(pts.length / 3));
  const c = polygonCentroid(ref);
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of ref) {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  // Principal axis of the reference pegs.
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const u = { x: Math.cos(theta), y: Math.sin(theta) };
  return pts.map((p) => {
    const along = (p.x - c.x) * u.x + (p.y - c.y) * u.y;
    const onLine = { x: c.x + u.x * along, y: c.y + u.y * along };
    if (pointInPolygon(onLine, outline)) return onLine;
    // Slide toward the centerline (y = 0) until the peg is back on the wood.
    for (const k of [0.9, 0.8, 0.7, 0.6, 0.5, 0.4]) {
      const q = { x: onLine.x, y: onLine.y * k };
      if (pointInPolygon(q, outline)) return q;
    }
    return p;
  });
}

/**
 * Offset a point on the edge into the headstock interior along the local
 * inward normal. Shrinks the offset if needed so the post stays inside the
 * silhouette (fixes pegs flying off scooped / pointy tips).
 */
function insetFromEdge(edgePt: Point, edge: Point[], inset: number, outline: Point[]): Point {
  const { tx, ty } = closestOnPolyline(edge, edgePt);
  let txx = tx;
  let tyy = ty;
  const len = Math.hypot(txx, tyy) || 1;
  txx /= len;
  tyy /= len;
  // Candidate normals (perpendicular to tangent).
  let nx = -tyy;
  let ny = txx;
  const probe = { x: edgePt.x + nx * Math.min(inset, 4), y: edgePt.y + ny * Math.min(inset, 4) };
  if (!pointInPolygon(probe, outline)) {
    nx = -nx;
    ny = -ny;
  }
  for (const scale of [1, 0.85, 0.7, 0.55, 0.4, 0.25, 0.15]) {
    const pt = { x: edgePt.x + nx * inset * scale, y: edgePt.y + ny * inset * scale };
    if (pointInPolygon(pt, outline)) return pt;
  }
  // Last resort: nudge toward outline centroid.
  const c = polygonCentroid(outline);
  let dx = c.x - edgePt.x;
  let dy = c.y - edgePt.y;
  const dlen = Math.hypot(dx, dy) || 1;
  dx /= dlen;
  dy /= dlen;
  for (const d of [inset, inset * 0.5, 3, 2, 1]) {
    const pt = { x: edgePt.x + dx * d, y: edgePt.y + dy * d };
    if (pointInPolygon(pt, outline)) return pt;
  }
  return { x: edgePt.x + dx * 2, y: edgePt.y + dy * 2 };
}

function closestOnPolyline(pts: Point[], p: Point): { point: Point; dist: number; tx: number; ty: number } {
  let best = pts[0] ?? { x: 0, y: 0 };
  let bestD = Infinity;
  let tx = 1;
  let ty = 0;
  const last = pts.length - 1;
  for (let i = 0; i < last; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 < 1e-12 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    const q = { x: a.x + t * dx, y: a.y + t * dy };
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (d < bestD) {
      bestD = d;
      best = q;
      tx = dx;
      ty = dy;
    }
  }
  return { point: best, dist: bestD, tx, ty };
}

function pointInPolygon(pt: Point, poly: Point[]): boolean {
  if (poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi || 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function polygonCentroid(poly: Point[]): Point {
  let x = 0;
  let y = 0;
  for (const p of poly) {
    x += p.x;
    y += p.y;
  }
  const n = poly.length || 1;
  return { x: x / n, y: y / n };
}

/**
 * Split the closed outline into its bass / treble flanks (nut → far end).
 * `'tip'` splits at the farthest point (inline rows run all the way out to
 * it); `'centre'` splits where the far end crosses the centerline so a split
 * layout gets two equal flanks even when the crown has off-centre humps.
 */
function extractSideEdge(outline: Point[], side: 'bass' | 'treble', splitAt: 'tip' | 'centre' = 'tip'): Point[] {
  // Drop the closing duplicate if present so tip search stays on the flank.
  const pts =
    outline.length > 2 &&
    Math.hypot(outline[0].x - outline[outline.length - 1].x, outline[0].y - outline[outline.length - 1].y) < 0.5
      ? outline.slice(0, -1)
      : outline;
  const minX = Math.min(...pts.map((p) => p.x));
  const cost = (p: Point) => (splitAt === 'tip' ? p.x : p.x - minX + Math.abs(p.y));
  const tipIdx = pts.reduce((best, p, i) => (cost(p) < cost(pts[best]) ? i : best), 0);
  if (side === 'bass') return pts.slice(0, tipIdx + 1);
  // The closed loop ends by running back across the nut face (x ≈ 0); strip
  // it so the treble flank starts at the treble nut corner, not the bass one.
  const treble = pts.slice(tipIdx).reverse();
  let skip = 0;
  while (skip < treble.length - 2 && treble[skip].x > -1) skip++;
  return treble.slice(Math.max(0, skip - 1));
}

function densifyPolyline(pts: Point[], segments: number): Point[] {
  const total = polylineLength(pts);
  if (total < 1e-6) return pts;
  return Array.from({ length: segments + 1 }, (_, i) => pointAtArcLength(pts, (i / segments) * total));
}

function polylineLength(pts: Point[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return len;
}

function pointAtArcLength(pts: Point[], dist: number): Point {
  if (pts.length === 0) return { x: 0, y: 0 };
  if (dist <= 0) return pts[0];
  let remaining = dist;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (remaining <= seg || i === pts.length - 1) {
      const t = seg < 1e-9 ? 0 : remaining / seg;
      return {
        x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t,
        y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t,
      };
    }
    remaining -= seg;
  }
  return pts[pts.length - 1];
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
