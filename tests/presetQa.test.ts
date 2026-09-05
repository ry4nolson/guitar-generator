import { describe, it, expect, beforeEach } from 'vitest';
import { BODY_TEMPLATES, getBodyTemplate } from '../src/geometry/templates';
import { useDesignStore } from '../src/state/store';
import { DEFAULT_HEADSTOCK_SETTINGS, headstockTypeMeta, seedHeadstockAnchors, computeTunerPositions, computeHeadstockOutlineLocal } from '../src/geometry/headstock';
import { DEFAULT_NECK_PARAMS } from '../src/geometry/neckParams';
import { bodyToNeckSpace } from '../src/geometry/neckPlacement';
import type { Point } from '../src/geometry/types';

function sampleClosedPath(anchors: { position: Point; handleIn: Point; handleOut: Point }[], perSegment = 48): Point[] {
  const n = anchors.length;
  const samples: Point[] = [];
  for (let i = 0; i < n; i++) {
    const cur = anchors[i];
    const next = anchors[(i + 1) % n];
    for (let s = 0; s < perSegment; s++) {
      const t = s / perSegment;
      const mt = 1 - t;
      samples.push({
        x:
          mt ** 3 * cur.position.x +
          3 * mt ** 2 * t * cur.handleOut.x +
          3 * mt * t ** 2 * next.handleIn.x +
          t ** 3 * next.position.x,
        y:
          mt ** 3 * cur.position.y +
          3 * mt ** 2 * t * cur.handleOut.y +
          3 * mt * t ** 2 * next.handleIn.y +
          t ** 3 * next.position.y,
      });
    }
  }
  samples.push(samples[0]);
  return samples;
}

function pointInPolygon(pt: Point, poly: Point[]): boolean {
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

function distToSeg(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function distToPolyline(pt: Point, poly: Point[]): number {
  let min = Infinity;
  for (let i = 0; i < poly.length - 1; i++) min = Math.min(min, distToSeg(pt, poly[i], poly[i + 1]));
  return min;
}

describe('preset hardware sits on the wood', () => {
  beforeEach(() => {
    useDesignStore.getState().resetToDefaults();
  });

  for (const template of BODY_TEMPLATES) {
    it(`${template.name}: knobs and selector stay inside the body with wood around them`, () => {
      useDesignStore.getState().setTemplate(template.id);
      const s = useDesignStore.getState();
      const body = sampleClosedPath(s.bodyAnchors);
      const minEdge = 12;
      for (const c of s.hardware.controls.filter((c) => c.visible)) {
        expect(pointInPolygon(c, body), `knob at ${c.x.toFixed(1)},${c.y.toFixed(1)}`).toBe(true);
        expect(distToPolyline(c, body), `knob edge ${template.id}`).toBeGreaterThan(minEdge);
      }
      if (s.controlSettings.selector !== 'none' && s.hardware.selector.visible) {
        const sel = s.hardware.selector;
        expect(pointInPolygon(sel, body), `selector at ${sel.x.toFixed(1)},${sel.y.toFixed(1)}`).toBe(true);
        expect(distToPolyline(sel, body), `selector edge ${template.id}`).toBeGreaterThan(10);
      }
    });
  }
});

describe('preset electronics match the body family', () => {
  beforeEach(() => {
    useDesignStore.getState().resetToDefaults();
  });

  it('LP is 2V/2T with the toggle on the bass upper bout', () => {
    useDesignStore.getState().setTemplate('les-paul');
    const s = useDesignStore.getState();
    expect(s.controlSettings.volumes).toBe(2);
    expect(s.controlSettings.tones).toBe(2);
    expect(s.controlSettings.selector).toBe('toggle');
    expect(s.hardware.controls).toHaveLength(4);
    expect(s.hardware.selector.y).toBeGreaterThan(40);
    expect(s.bridgeSettings.type).toBe('tom');
    expect(s.headstockSettings.type).toBe('3x3');
  });

  it('Tele and Strat default to 22 frets so the last fret meets the cutaway', () => {
    expect(getBodyTemplate('tele').defaultNeckParams.fretCount).toBe(22);
    expect(getBodyTemplate('strat').defaultNeckParams.fretCount).toBe(22);
    expect(getBodyTemplate('les-paul').defaultNeckParams.fretCount).toBe(22);
    useDesignStore.getState().setTemplate('tele');
    expect(useDesignStore.getState().neckParams.fretCount).toBe(22);
    useDesignStore.getState().resetToDefaults();
    useDesignStore.getState().setTemplate('strat');
    expect(useDesignStore.getState().neckParams.fretCount).toBe(22);
  });

  it('Soloist is 1V/1T with a treble-side blade, not an LP toggle', () => {
    useDesignStore.getState().setTemplate('soloist');
    const s = useDesignStore.getState();
    expect(s.controlSettings.volumes).toBe(1);
    expect(s.controlSettings.tones).toBe(1);
    expect(s.controlSettings.selector).toBe('blade-3');
    expect(s.hardware.controls).toHaveLength(2);
    expect(s.hardware.selector.y).toBeLessThan(-40);
    expect(s.hardware.selector.rotation).toBeGreaterThan(70);
  });

  it('Rhoads, King V and Kelly put the toggle on the treble wing', () => {
    for (const id of ['rhoads', 'king-v', 'kelly'] as const) {
      useDesignStore.getState().resetToDefaults();
      useDesignStore.getState().setTemplate(id);
      const sel = useDesignStore.getState().hardware.selector;
      expect(sel.y, id).toBeLessThan(-40);
    }
  });

  it('Strat blade sits beside the pickups, nearly parallel to the strings', () => {
    useDesignStore.getState().setTemplate('strat');
    const s = useDesignStore.getState();
    const bridge = s.hardware.pickups[2];
    const sel = s.hardware.selector;
    expect(sel.y).toBeLessThan(-40);
    expect(sel.y).toBeGreaterThan(-70);
    expect(sel.x).toBeLessThan(bridge.x);
    expect(sel.rotation).toBeGreaterThan(75);
    expect(sel.rotation).toBeLessThan(90);
  });
});

describe('3×3 tuner inset follows the flared ears', () => {
  it('keeps bass and treble pegs at a similar distance from the outline', () => {
    const meta = headstockTypeMeta('3x3');
    const settings = {
      ...DEFAULT_HEADSTOCK_SETTINGS,
      type: '3x3' as const,
      tunerLayout: meta.defaultTunerLayout,
      tunerTipClearance: meta.defaultTipClearance,
      tunerNutClearance: meta.defaultNutClearance,
      ...meta.defaultDims,
    };
    const anchors = seedHeadstockAnchors(DEFAULT_NECK_PARAMS, settings, 6);
    const placement = { joinPoint: { x: 25, y: 0 } };
    const tuners = computeTunerPositions(DEFAULT_NECK_PARAMS, settings, placement, [], 6, anchors);
    expect(tuners).toHaveLength(6);

    const outline = computeHeadstockOutlineLocal(DEFAULT_NECK_PARAMS, settings, 6, anchors)!;
    const local = tuners.map((t) => bodyToNeckSpace(t.position, DEFAULT_NECK_PARAMS, placement));
    const bassFlank = outline.filter((p) => p.y > 6 && p.x < -8);
    const trebleFlank = outline.filter((p) => p.y < -6 && p.x < -8);
    const edges = local.map((p) => distToPolyline(p, p.y >= 0 ? bassFlank : trebleFlank));
    const mean = edges.reduce((a, b) => a + b, 0) / edges.length;
    const spread = Math.max(...edges) - Math.min(...edges);
    expect(spread, `inset mm: ${edges.map((e) => e.toFixed(1)).join(', ')}`).toBeLessThan(3);
    for (const e of edges) expect(Math.abs(e - mean)).toBeLessThan(2);
  });
});
