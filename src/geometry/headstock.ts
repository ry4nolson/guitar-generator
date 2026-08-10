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
  /**
   * How far tuner centers sit inward from the outline edge (mm).
   * Higher = more toward the centerline.
   */
  tunerInset: number;
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
}

export const NUT_BASS_ID = 'nutBass';
export const NUT_TREBLE_ID = 'nutTreble';

export const DEFAULT_HEADSTOCK_SETTINGS: HeadstockSettings = {
  type: 'paddle',
  length: 175,
  tipWidth: 72,
  earWidth: 28,
  showTuners: true,
  tunerLayout: '6-inline',
  tunerInset: 12,
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
};

/** Keep at least this many free (non-nut) outline points. */
export const MIN_FREE_HEADSTOCK_POINTS = 3;

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
    description: 'Rounded paddle — Tele / Strat family. Drag free points to reshape.',
    defaultTunerLayout: '6-inline',
  },
  {
    id: '6-inline',
    label: 'Asymmetric',
    description: 'Scooped treble, bass tuner ledge. Drag free points to reshape.',
    defaultTunerLayout: '6-inline',
  },
  {
    id: '3x3',
    label: 'Symmetrical',
    description: 'Winged split-tuner shape. Drag free points to reshape.',
    defaultTunerLayout: '3x3',
  },
  {
    id: 'pointy',
    label: 'Pointy',
    description: 'Tapered tip with solid shoulders. Drag free points to reshape.',
    defaultTunerLayout: '6-inline',
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
 * Inline layouts share the same order; 3×3 puts bass-side pegs first, then treble.
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
  const poly = parametricOutline(neckParams, settings, stringCount);
  if (!poly || poly.length < 3) return [];
  return polygonToAnchors(poly);
}

/** Keep nut corners glued to the nut face / fan line. */
export function syncHeadstockNutCorners(
  anchors: HeadstockAnchor[],
  neckParams: NeckParams,
): HeadstockAnchor[] {
  if (anchors.length < 2) return anchors;
  const nutHalf = neckParams.nutWidth / 2;
  const fan = trebleFanOffset(neckParams);
  return anchors.map((a, i) => {
    if (i === 0 || a.id === NUT_BASS_ID) {
      const position = { x: 0, y: nutHalf };
      return {
        ...a,
        id: NUT_BASS_ID,
        locked: true,
        position,
        handleIn: { x: position.x - 8, y: position.y },
        handleOut: { x: position.x - 10, y: position.y + 2 },
      };
    }
    if (i === anchors.length - 1 || a.id === NUT_TREBLE_ID) {
      const position = { x: fan, y: -nutHalf };
      return {
        ...a,
        id: NUT_TREBLE_ID,
        locked: true,
        position,
        handleIn: { x: position.x - 10, y: position.y - 2 },
        handleOut: { x: position.x - 8, y: position.y },
      };
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
 * Prefers editable anchors when present; otherwise parametric preset.
 */
export function computeHeadstockOutlineLocal(
  neckParams: NeckParams,
  settings: HeadstockSettings,
  stringCount = 6,
  anchors?: HeadstockAnchor[] | null,
): Point[] | null {
  if (settings.type === 'headless') return null;
  if (anchors && anchors.length >= 3) {
    return anchors.map((a) => ({ ...a.position }));
  }
  return parametricOutline(neckParams, settings, stringCount);
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

function parametricOutline(
  neckParams: NeckParams,
  settings: HeadstockSettings,
  stringCount: number,
): Point[] | null {
  const nutHalf = neckParams.nutWidth / 2;
  const tipGrow = Math.max(0, stringCount - 6) * 3.5;
  const tipHalf = Math.max(nutHalf + 4, settings.tipWidth / 2 + tipGrow * 0.35);
  const L = Math.max(40, settings.length + tipGrow * 2.5);
  const ear = settings.earWidth + tipGrow * 0.4;
  const outline = computeOutlineShape(settings.type, L, nutHalf, tipHalf, ear);
  if (!outline) return null;
  const fanOffset = trebleFanOffset(neckParams);
  if (fanOffset === 0) return outline;
  return outline.map((p, i) => (i === outline.length - 1 ? { ...p, x: fanOffset } : p));
}

/** Editable control polygons (~8–10 points) — smooth handles do the rest. */
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
        { x: -L * 0.2, y: tipHalf * 0.55 },
        { x: -L * 0.55, y: tipHalf + 2 },
        { x: -L * 0.88, y: tipHalf * 0.75 },
        { x: -L, y: 0 },
        { x: -L * 0.88, y: -tipHalf * 0.7 },
        { x: -L * 0.55, y: -tipHalf },
        { x: -L * 0.2, y: -tipHalf * 0.45 },
        { x: 0, y: -nutHalf },
      ];
    case '6-inline':
      return [
        { x: 0, y: nutHalf },
        { x: -L * 0.15, y: nutHalf + 12 },
        { x: -L * 0.45, y: tipHalf + 14 },
        { x: -L * 0.82, y: tipHalf + 6 },
        { x: -L, y: tipHalf * 0.15 },
        { x: -L * 0.75, y: -tipHalf * 0.65 },
        { x: -L * 0.35, y: -nutHalf - 4 },
        { x: 0, y: -nutHalf },
      ];
    case '3x3':
      return [
        { x: 0, y: nutHalf },
        { x: -L * 0.12, y: nutHalf + ear * 0.55 },
        { x: -L * 0.38, y: nutHalf + ear },
        { x: -L * 0.7, y: tipHalf + 4 },
        { x: -L, y: 0 },
        { x: -L * 0.7, y: -tipHalf - 4 },
        { x: -L * 0.38, y: -nutHalf - ear },
        { x: -L * 0.12, y: -nutHalf - ear * 0.55 },
        { x: 0, y: -nutHalf },
      ];
    case 'pointy': {
      const shoulder = Math.max(tipHalf + 6, nutHalf + 16);
      return [
        { x: 0, y: nutHalf },
        { x: -L * 0.18, y: shoulder },
        { x: -L * 0.45, y: shoulder - 4 },
        { x: -L * 0.72, y: tipHalf * 0.45 },
        { x: -L, y: 0 },
        { x: -L * 0.72, y: -tipHalf * 0.4 },
        { x: -L * 0.45, y: -shoulder + 6 },
        { x: -L * 0.18, y: -shoulder + 2 },
        { x: 0, y: -nutHalf },
      ];
    }
    default:
      return null;
  }
}

function polygonToAnchors(poly: Point[]): HeadstockAnchor[] {
  const n = poly.length;
  return poly.map((pos, i) => {
    const prev = poly[(i - 1 + n) % n];
    const next = poly[(i + 1) % n];
    const distIn = Math.hypot(pos.x - prev.x, pos.y - prev.y);
    const distOut = Math.hypot(next.x - pos.x, next.y - pos.y);
    // Catmull-Rom-ish tangent through neighbors.
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const tlen = Math.hypot(tx, ty) || 1;
    const ux = tx / tlen;
    const uy = ty / tlen;
    const inLen = distIn * 0.28;
    const outLen = distOut * 0.28;
    const locked = i === 0 || i === n - 1;
    return {
      id: i === 0 ? NUT_BASS_ID : i === n - 1 ? NUT_TREBLE_ID : `hs-${i}`,
      position: { ...pos },
      handleIn: { x: pos.x - ux * inLen, y: pos.y - uy * inLen },
      handleOut: { x: pos.x + ux * outLen, y: pos.y + uy * outLen },
      locked,
      manuallyEdited: false,
      mirrorHandles: true,
    };
  });
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

  if (settings.tunerLayout === 'headless') {
    return placeHeadlessTuners(neckParams, placement, saddles, n);
  }

  const outline = computeHeadstockOutlineLocal(neckParams, settings, n, anchors);
  if (!outline || outline.length < 4) return [];

  const toBody = (local: Point, pegAngleDeg: number, index: number): TunerMark => ({
    index,
    position: neckToBodySpace(local, neckParams, placement),
    radius: n > 8 ? 3.6 : 4.2,
    pegAngleDeg: pegAngleDeg + neckParams.neckAngle,
  });

  const inset =
    typeof settings.tunerInset === 'number' && Number.isFinite(settings.tunerInset)
      ? settings.tunerInset
      : settings.type === '3x3'
        ? 11
        : 12;

  if (settings.tunerLayout === '6-inline') {
    return placeAlongSide(outline, 'bass', n, settings.type, inset).map((p, i) => toBody(p, 90, i));
  }

  const bassCount = Math.ceil(n / 2);
  const trebleCount = Math.floor(n / 2);
  const bass = placeAlongSide(outline, 'bass', bassCount, settings.type, inset);
  const treble = placeAlongSide(outline, 'treble', trebleCount, settings.type, inset);
  const marks: TunerMark[] = bass.map((p, i) => toBody(p, 90, i));
  for (let i = 0; i < treble.length; i++) marks.push(toBody(treble[i], -90, bassCount + i));
  return marks;
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

function placeAlongSide(
  outline: Point[],
  side: 'bass' | 'treble',
  count: number,
  type: HeadstockType,
  inset: number,
): Point[] {
  if (count <= 0) return [];
  const edge = extractSideEdge(outline, side);
  if (edge.length < 2) return [];

  const xs = edge.map((p) => p.x);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const tipPad = type === 'pointy' ? 0.28 : 0.12;
  const nutPad = 0.14;
  const usableMin = xMin * (1 - tipPad);
  const usableMax = xMax - Math.abs(xMin) * nutPad;
  const lo = Math.min(usableMin, usableMax);
  const hi = Math.max(usableMin, usableMax);
  const clipped = clipPolylineToXRange(edge, lo, hi);
  const densified = densifyPolyline(clipped.length >= 2 ? clipped : edge, 48);
  if (densified.length < 2) return [];

  return sampleArcLength(densified, count).map((p) => ({
    x: p.x,
    y: p.y - Math.sign(p.y || (side === 'bass' ? 1 : -1)) * inset,
  }));
}

function extractSideEdge(outline: Point[], side: 'bass' | 'treble'): Point[] {
  const tipIdx = outline.reduce((best, p, i) => (p.x < outline[best].x ? i : best), 0);
  if (side === 'bass') return outline.slice(0, tipIdx + 1);
  return outline.slice(tipIdx).reverse();
}

function clipPolylineToXRange(pts: Point[], xLo: number, xHi: number): Point[] {
  const lo = Math.min(xLo, xHi);
  const hi = Math.max(xLo, xHi);
  const out: Point[] = [];
  const pushUnique = (p: Point) => {
    const prev = out[out.length - 1];
    if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) > 0.25) out.push(p);
  };
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (a.x >= lo && a.x <= hi) pushUnique(a);
    if (Math.abs(b.x - a.x) > 1e-9) {
      for (const xb of [lo, hi]) {
        const u = (xb - a.x) / (b.x - a.x);
        if (u > 0 && u < 1) pushUnique({ x: xb, y: a.y + u * (b.y - a.y) });
      }
    }
  }
  const last = pts[pts.length - 1];
  if (last.x >= lo && last.x <= hi) pushUnique(last);
  if (out.length >= 2) return out;
  return pts.filter((p) => p.x >= lo - 1e-6 && p.x <= hi + 1e-6);
}

function densifyPolyline(pts: Point[], segments: number): Point[] {
  const total = polylineLength(pts);
  if (total < 1e-6) return pts;
  return Array.from({ length: segments + 1 }, (_, i) => pointAtArcLength(pts, (i / segments) * total));
}

function sampleArcLength(pts: Point[], count: number): Point[] {
  const total = polylineLength(pts);
  if (count === 1) return [pointAtArcLength(pts, total * 0.5)];
  const margin = Math.min(total * 0.06, 8);
  const usable = Math.max(total - 2 * margin, total * 0.5);
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    return pointAtArcLength(pts, margin + t * usable);
  });
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
