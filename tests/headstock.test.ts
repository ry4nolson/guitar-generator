import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeHeadstockOutlineLocal,
  computeTunerPositions,
  layoutTunersAsHardware,
  seedHeadstockAnchors,
  syncHeadstockNutCorners,
  mapStringIndexToTunerIndex,
  NUT_BASS_ID,
  NUT_TREBLE_ID,
  DEFAULT_HEADSTOCK_SETTINGS,
  LEGACY_HEADLESS_SETTINGS,
  headstockTypeMeta,
} from '../src/geometry/headstock';
import { DEFAULT_NECK_PARAMS } from '../src/geometry/neckParams';
import { trebleFanOffset } from '../src/geometry/frets';
import { bodyToNeckSpace } from '../src/geometry/neckPlacement';
import { useDesignStore } from '../src/state/store';
import { migrateDesignDocument, DESIGN_DOCUMENT_VERSION } from '../src/export/migrateDocument';
import { getBodyTemplate } from '../src/geometry/templates';
import { computeParametricAnchors } from '../src/geometry/bodyModel';
import { defaultLayers } from '../src/state/layers';
import { DEFAULT_BRIDGE_SETTINGS } from '../src/geometry/bridgeTypes';

describe('headstock anchors', () => {
  it('seeds locked nut corners and free mid points', () => {
    const anchors = seedHeadstockAnchors(DEFAULT_NECK_PARAMS, DEFAULT_HEADSTOCK_SETTINGS, 6);
    expect(anchors.length).toBeGreaterThanOrEqual(6);
    expect(anchors[0].id).toBe(NUT_BASS_ID);
    expect(anchors[0].locked).toBe(true);
    expect(anchors[anchors.length - 1].id).toBe(NUT_TREBLE_ID);
    expect(anchors[anchors.length - 1].locked).toBe(true);
    expect(anchors.slice(1, -1).every((a) => !a.locked)).toBe(true);
  });

  it('scales every traced preset to the declared length and overall width', () => {
    for (const type of ['paddle', 'tele', '6-inline', '3x3', 'pointy'] as const) {
      const dims = headstockTypeMeta(type).defaultDims;
      const settings = { ...DEFAULT_HEADSTOCK_SETTINGS, type, ...dims };
      const anchors = seedHeadstockAnchors(DEFAULT_NECK_PARAMS, settings, 6);
      expect(anchors.length, type).toBeGreaterThanOrEqual(6);
      const outline = computeHeadstockOutlineLocal(DEFAULT_NECK_PARAMS, settings, 6, anchors)!;
      // Tip lands at the declared length; nothing pokes past the nut face.
      expect(Math.min(...outline.map((p) => p.x)), type).toBeCloseTo(-dims.length, 0);
      expect(Math.max(...outline.map((p) => p.x)), type).toBeLessThanOrEqual(
        Math.max(0, trebleFanOffset(DEFAULT_NECK_PARAMS)) + 0.01,
      );
      // Overall width (bass extreme to treble extreme) is the declared head width.
      const ys = outline.map((p) => p.y);
      expect(Math.max(...ys) - Math.min(...ys), type).toBeCloseTo(dims.tipWidth, 0);
      // Nut corners sit on the real nut width.
      expect(anchors[0].position.y).toBeCloseTo(DEFAULT_NECK_PARAMS.nutWidth / 2, 6);
      expect(anchors[anchors.length - 1].position.y).toBeCloseTo(-DEFAULT_NECK_PARAMS.nutWidth / 2, 6);
    }
  });

  it('keeps the inline tuner edge straight on shark-fin and pointy presets', () => {
    for (const type of ['6-inline', 'pointy'] as const) {
      const anchors = seedHeadstockAnchors(DEFAULT_NECK_PARAMS, { ...DEFAULT_HEADSTOCK_SETTINGS, type }, 6);
      // Bass flank runs nut → shoulder → far end; the shoulder's out-handle is
      // collinear with the straight tuner edge to the next anchor.
      const a = anchors[1];
      const b = anchors[2];
      const seg = { x: b.position.x - a.position.x, y: b.position.y - a.position.y };
      const h = { x: a.handleOut.x - a.position.x, y: a.handleOut.y - a.position.y };
      const cross = Math.abs(seg.x * h.y - seg.y * h.x) / (Math.hypot(seg.x, seg.y) * Math.hypot(h.x, h.y));
      expect(cross, type).toBeLessThan(0.05);
    }
  });

  it('puts the point on the treble side for shark-fin and pointy heads', () => {
    for (const type of ['6-inline', 'pointy'] as const) {
      const anchors = seedHeadstockAnchors(DEFAULT_NECK_PARAMS, { ...DEFAULT_HEADSTOCK_SETTINGS, type }, 6);
      const tip = anchors.reduce((best, a) => (a.position.x < best.position.x ? a : best));
      expect(tip.position.y, type).toBeLessThan(-10);
    }
  });

  it('Strat head: angled tuner edge, bulb swelling to the treble side, scoop below it', () => {
    const anchors = seedHeadstockAnchors(DEFAULT_NECK_PARAMS, DEFAULT_HEADSTOCK_SETTINGS, 6);
    const outline = computeHeadstockOutlineLocal(DEFAULT_NECK_PARAMS, DEFAULT_HEADSTOCK_SETTINGS, 6, anchors)!;
    const bassMax = Math.max(...outline.map((p) => p.y));
    const trebleMin = Math.min(...outline.map((p) => p.y));
    // The bulb is the widest feature and lives on the treble side.
    expect(-trebleMin).toBeGreaterThan(bassMax + 10);
    // The tip itself is past the centerline on the treble side (angled tuner edge).
    const tip = outline.reduce((b, p) => (p.x < b.x ? p : b));
    expect(tip.y).toBeLessThan(0);
    // Scoop: between the bulb and the bump the treble edge comes back toward the centerline.
    const bulbX = outline.find((p) => p.y === trebleMin)!.x;
    const scoop = outline.filter((p) => p.x > bulbX + 20 && p.x < -0.3 * DEFAULT_HEADSTOCK_SETTINGS.length && p.y < 0);
    expect(Math.max(...scoop.map((p) => p.y))).toBeGreaterThan(trebleMin + 15);
  });

  it('Open book head is symmetrical with a centre notch between two ear tips', () => {
    const settings = { ...DEFAULT_HEADSTOCK_SETTINGS, type: '3x3' as const, ...headstockTypeMeta('3x3').defaultDims };
    const anchors = seedHeadstockAnchors(DEFAULT_NECK_PARAMS, settings, 6);
    const free = anchors.slice(1, -1);
    for (const a of free) {
      const mirror = free.find((b) => Math.abs(b.position.x - a.position.x) < 0.5 && Math.abs(b.position.y + a.position.y) < 0.5);
      expect(mirror, `mirror of ${a.id}`).toBeDefined();
    }
    // Centre notch sits slightly short of the two crown humps.
    const centre = free.find((a) => Math.abs(a.position.y) < 0.5)!;
    const humps = free.filter((a) => Math.abs(a.position.x + settings.length) < 0.5);
    expect(humps.length).toBe(2);
    expect(centre.position.x).toBeGreaterThan(-settings.length + 1);
    const ears = free.filter((a) => Math.abs(a.position.y) > settings.tipWidth / 2 - 1);
    expect(ears.length).toBe(2);
    expect(ears.every((e) => !e.mirrorHandles)).toBe(true);
  });

  it('aims inline peg keys perpendicular to the drilled tuner row', () => {
    for (const type of ['paddle', 'tele', '6-inline', 'pointy'] as const) {
      const settings = { ...DEFAULT_HEADSTOCK_SETTINGS, type, ...headstockTypeMeta(type).defaultDims };
      const anchors = seedHeadstockAnchors(DEFAULT_NECK_PARAMS, settings, 6);
      const placement = { joinPoint: { x: 25, y: 0 } };
      const tuners = computeTunerPositions(DEFAULT_NECK_PARAMS, settings, placement, [], 6, anchors);
      const local = tuners.map((t) => bodyToNeckSpace(t.position, DEFAULT_NECK_PARAMS, placement));
      const first = local[0];
      const last = local[local.length - 1];
      const along = { x: last.x - first.x, y: last.y - first.y };
      const alongLen = Math.hypot(along.x, along.y) || 1;
      for (const t of tuners) {
        const rad = (t.pegAngleDeg * Math.PI) / 180;
        const out = { x: Math.cos(rad), y: Math.sin(rad) };
        const dot = (along.x * out.x + along.y * out.y) / alongLen;
        expect(Math.abs(dot), type).toBeLessThan(0.08);
        // Keys point outboard (bass / +y), not into the wood.
        expect(out.y, type).toBeGreaterThan(0.2);
      }
    }
  });

  it('drills inline tuner pegs on a straight line even around the paddle bulb', () => {
    const anchors = seedHeadstockAnchors(DEFAULT_NECK_PARAMS, DEFAULT_HEADSTOCK_SETTINGS, 6);
    const placement = { joinPoint: { x: 25, y: 0 } };
    const pegs = computeTunerPositions(DEFAULT_NECK_PARAMS, DEFAULT_HEADSTOCK_SETTINGS, placement, [], 6, anchors).map(
      (t) => bodyToNeckSpace(t.position, DEFAULT_NECK_PARAMS, placement),
    );
    const first = pegs[0];
    const last = pegs[pegs.length - 1];
    const len = Math.hypot(last.x - first.x, last.y - first.y);
    for (const p of pegs) {
      const dist = Math.abs((last.x - first.x) * (first.y - p.y) - (first.x - p.x) * (last.y - first.y)) / len;
      expect(dist).toBeLessThan(0.5);
    }
  });

  it('keeps nut corners on the nut face after sync', () => {
    const seeded = seedHeadstockAnchors(DEFAULT_NECK_PARAMS, DEFAULT_HEADSTOCK_SETTINGS, 6);
    const moved = seeded.map((a, i) =>
      i === 0 ? { ...a, position: { x: -10, y: 99 } } : a,
    );
    const synced = syncHeadstockNutCorners(moved, DEFAULT_NECK_PARAMS);
    expect(synced[0].position).toEqual({ x: 0, y: DEFAULT_NECK_PARAMS.nutWidth / 2 });
    expect(synced[synced.length - 1].position.x).toBeCloseTo(trebleFanOffset(DEFAULT_NECK_PARAMS), 9);
  });

  it('returns null outline for headless', () => {
    expect(computeHeadstockOutlineLocal(DEFAULT_NECK_PARAMS, LEGACY_HEADLESS_SETTINGS)).toBeNull();
    expect(seedHeadstockAnchors(DEFAULT_NECK_PARAMS, LEGACY_HEADLESS_SETTINGS)).toEqual([]);
  });

  it('places tuners from editable anchors', () => {
    const anchors = seedHeadstockAnchors(DEFAULT_NECK_PARAMS, DEFAULT_HEADSTOCK_SETTINGS, 8);
    const tuners = computeTunerPositions(
      DEFAULT_NECK_PARAMS,
      DEFAULT_HEADSTOCK_SETTINGS,
      { joinPoint: { x: 25, y: 0 } },
      [],
      8,
      anchors,
    );
    expect(tuners).toHaveLength(8);
  });

  it('preserves locked tuner hardware overrides on relayout', () => {
    const anchors = seedHeadstockAnchors(DEFAULT_NECK_PARAMS, DEFAULT_HEADSTOCK_SETTINGS, 6);
    const placement = { joinPoint: { x: 25, y: 0 } };
    const auto = layoutTunersAsHardware(
      DEFAULT_NECK_PARAMS,
      DEFAULT_HEADSTOCK_SETTINGS,
      placement,
      [],
      6,
      anchors,
    );
    expect(auto).toHaveLength(6);
    const prior = auto.map((t, i) =>
      i === 0 ? { ...t, x: t.x + 12, y: t.y - 5, locked: true } : t,
    );
    const next = layoutTunersAsHardware(
      DEFAULT_NECK_PARAMS,
      { ...DEFAULT_HEADSTOCK_SETTINGS, tunerInset: 20 },
      placement,
      [],
      6,
      anchors,
      prior,
    );
    expect(next[0].x).toBeCloseTo(prior[0].x);
    expect(next[0].y).toBeCloseTo(prior[0].y);
    expect(next[0].locked).toBe(true);
    // Unlocked pegs follow the new inset (pushed further in from the bass edge).
    const before = bodyToNeckSpace({ x: prior[1].x, y: prior[1].y }, DEFAULT_NECK_PARAMS, placement);
    const after = bodyToNeckSpace({ x: next[1].x, y: next[1].y }, DEFAULT_NECK_PARAMS, placement);
    expect(after.y).toBeLessThan(before.y - 0.5);
  });

  it('tip clearance pulls the tip peg (index 0) away from a narrow tip', () => {
    const anchors = seedHeadstockAnchors(DEFAULT_NECK_PARAMS, DEFAULT_HEADSTOCK_SETTINGS, 6);
    const placement = { joinPoint: { x: 25, y: 0 } };
    const tight = computeTunerPositions(
      DEFAULT_NECK_PARAMS,
      { ...DEFAULT_HEADSTOCK_SETTINGS, tunerTipClearance: 0.08 },
      placement,
      [],
      6,
      anchors,
    );
    const loose = computeTunerPositions(
      DEFAULT_NECK_PARAMS,
      { ...DEFAULT_HEADSTOCK_SETTINGS, tunerTipClearance: 0.35 },
      placement,
      [],
      6,
      anchors,
    );
    // Peg 0 is nearest the tip (most negative neck-local X → smaller body X).
    expect(loose[0].position.x).toBeGreaterThan(tight[0].position.x);
  });

  it('orders inline tuners tip→nut so high E does not cross low E', () => {
    const anchors = seedHeadstockAnchors(DEFAULT_NECK_PARAMS, DEFAULT_HEADSTOCK_SETTINGS, 6);
    const tuners = computeTunerPositions(
      DEFAULT_NECK_PARAMS,
      DEFAULT_HEADSTOCK_SETTINGS,
      { joinPoint: { x: 25, y: 0 } },
      [],
      6,
      anchors,
    );
    // Tip peg (0) is further past the nut than the nut-nearest peg (5).
    expect(tuners[0].position.x).toBeLessThan(tuners[5].position.x);
    expect(mapStringIndexToTunerIndex(0, 6, '6-inline')).toBe(0);
    expect(mapStringIndexToTunerIndex(5, 6, '6-inline')).toBe(5);
  });

  it('keeps auto-laid tuners inside the Bezier headstock silhouette', () => {
    const anchors = seedHeadstockAnchors(DEFAULT_NECK_PARAMS, DEFAULT_HEADSTOCK_SETTINGS, 6);
    // Pull a bass-side handle so the control polygon sits outside the curve —
    // placement must follow the sampled Bezier, not the control points.
    const sculpted = anchors.map((a, i) =>
      i === 2
        ? {
            ...a,
            handleIn: { x: a.position.x + 35, y: a.position.y + 45 },
            handleOut: { x: a.position.x - 35, y: a.position.y + 45 },
            manuallyEdited: true,
          }
        : a,
    );
    const placement = { joinPoint: { x: 25, y: 0 } };
    const outline = computeHeadstockOutlineLocal(
      DEFAULT_NECK_PARAMS,
      DEFAULT_HEADSTOCK_SETTINGS,
      6,
      sculpted,
    )!;
    expect(outline.length).toBeGreaterThan(sculpted.length * 4);
    const tuners = computeTunerPositions(
      DEFAULT_NECK_PARAMS,
      { ...DEFAULT_HEADSTOCK_SETTINGS, tunerInset: 14, tunerTipClearance: 0.18 },
      placement,
      [],
      6,
      sculpted,
    );
    expect(tuners).toHaveLength(6);
    for (const t of tuners) {
      const local = bodyToNeckSpace(t.position, DEFAULT_NECK_PARAMS, placement);
      expect(pointInPolygon(local, outline), `tuner ${t.index} outside outline`).toBe(true);
    }
  });

  it('keeps tuners inside a pointy tip with higher tip clearance', () => {
    const settings = {
      ...DEFAULT_HEADSTOCK_SETTINGS,
      type: 'pointy' as const,
      tunerLayout: '6-inline' as const,
      tunerTipClearance: 0.3,
      tunerInset: 11,
    };
    const anchors = seedHeadstockAnchors(DEFAULT_NECK_PARAMS, settings, 6);
    const placement = { joinPoint: { x: 25, y: 0 } };
    const outline = computeHeadstockOutlineLocal(DEFAULT_NECK_PARAMS, settings, 6, anchors)!;
    const tuners = computeTunerPositions(DEFAULT_NECK_PARAMS, settings, placement, [], 6, anchors);
    for (const t of tuners) {
      const local = bodyToNeckSpace(t.position, DEFAULT_NECK_PARAMS, placement);
      expect(pointInPolygon(local, outline), `tuner ${t.index} outside pointy outline`).toBe(true);
    }
  });
});

function pointInPolygon(pt: { x: number; y: number }, poly: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const inter = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-12) + xi;
    if (inter) inside = !inside;
  }
  return inside;
}

describe('headstock store actions', () => {
  beforeEach(() => {
    useDesignStore.getState().resetToDefaults();
  });

  it('defaults to the Tele head with locked nut corners', () => {
    const s = useDesignStore.getState();
    expect(s.headstockSettings.type).toBe('tele');
    expect(s.headstockAnchors[0].locked).toBe(true);
    expect(s.headstockAnchors[s.headstockAnchors.length - 1].locked).toBe(true);
  });

  it('switching type re-seeds the outline', () => {
    useDesignStore.getState().setHeadstockType('pointy');
    const s = useDesignStore.getState();
    expect(s.headstockSettings.type).toBe('pointy');
    expect(s.headstockAnchors.length).toBeGreaterThan(4);
    expect(s.headstockSettings.tunerLayout).toBe('6-inline');
  });

  it('moves a free headstock point in body space', () => {
    const id = useDesignStore.getState().headstockAnchors.find((a) => !a.locked)!.id;
    const before = useDesignStore.getState().headstockAnchors.find((a) => a.id === id)!;
    useDesignStore.getState().moveHeadstockAnchor(id, 'position', {
      x: before.position.x + 1000, // will convert — just ensure it updates
      y: before.position.y,
    });
    const after = useDesignStore.getState().headstockAnchors.find((a) => a.id === id)!;
    expect(after.manuallyEdited).toBe(true);
    expect(after.position.x).not.toBeCloseTo(before.position.x, 5);
  });

  it('refuses to move locked nut corners', () => {
    const before = useDesignStore.getState().headstockAnchors[0].position;
    useDesignStore.getState().moveHeadstockAnchor(NUT_BASS_ID, 'position', { x: 1, y: 1 });
    expect(useDesignStore.getState().headstockAnchors[0].position).toEqual(before);
  });

  it('adds and removes free outline points', () => {
    const beforeLen = useDesignStore.getState().headstockAnchors.length;
    useDesignStore.getState().insertHeadstockAnchor(NUT_BASS_ID);
    expect(useDesignStore.getState().headstockAnchors.length).toBe(beforeLen + 1);
    const neu = useDesignStore.getState().selected;
    expect(neu?.kind).toBe('headstock');
    if (neu?.kind === 'headstock') {
      useDesignStore.getState().removeHeadstockAnchor(neu.id);
      expect(useDesignStore.getState().headstockAnchors.length).toBe(beforeLen);
    }
  });
});

describe('string→tuner mapping', () => {
  it('maps inline 1:1 and split treble/bass correctly', () => {
    expect(mapStringIndexToTunerIndex(0, 6, '6-inline')).toBe(0);
    expect(mapStringIndexToTunerIndex(5, 6, '6-inline')).toBe(5);
    // 3×3: high E → first treble peg (index 3), low E → last bass peg (index 2)
    expect(mapStringIndexToTunerIndex(0, 6, '3x3')).toBe(3);
    expect(mapStringIndexToTunerIndex(2, 6, '3x3')).toBe(5);
    expect(mapStringIndexToTunerIndex(3, 6, '3x3')).toBe(0);
    expect(mapStringIndexToTunerIndex(5, 6, '3x3')).toBe(2);
  });
});

describe('v8 → v9 migration seeds headstock anchors', () => {
  it('adds anchors when missing', () => {
    const tele = getBodyTemplate('tele');
    const v8 = {
      version: 8,
      templateId: tele.id,
      bodyParams: { ...tele.defaultParams },
      bodyAnchors: computeParametricAnchors(tele, tele.defaultParams),
      neckParams: { ...tele.defaultNeckParams },
      hardware: structuredClone(tele.defaultHardware),
      bridgeSettings: { ...DEFAULT_BRIDGE_SETTINGS },
      nutSettings: { type: 'standard', stringSpacing: 35, thickness: 5 },
      headstockSettings: { ...DEFAULT_HEADSTOCK_SETTINGS },
      settings: {
        unit: 'mm',
        theme: 'dark',
        view: 'top',
        gridSize: 5,
        gridSnapEnabled: false,
        showPointsAndHandles: true,
        showDebugOverlay: false,
        canvasPadding: 40,
      },
      layers: defaultLayers(),
    };
    const migrated = migrateDesignDocument(v8 as unknown as Record<string, unknown>);
    expect(migrated.version).toBe(DESIGN_DOCUMENT_VERSION);
    const hs = migrated.headstockAnchors as { id: string; locked: boolean }[];
    expect(hs.length).toBeGreaterThan(4);
    expect(hs[0].locked).toBe(true);
  });
});
