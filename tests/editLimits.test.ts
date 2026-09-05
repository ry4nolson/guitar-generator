import { describe, it, expect, beforeEach } from 'vitest';
import {
  clampBodyAnchors,
  clampHeadstockAnchors,
  clampHeadstockLocalPoint,
  clampHardwareBodyPoint,
  clampNeckParam,
  HEADSTOCK_EDIT_LIMITS,
  HEADSTOCK_LENGTH_LIMITS,
  HEADSTOCK_WIDTH_LIMITS,
  BODY_EDIT_LIMITS,
  HARDWARE_EDIT_LIMITS,
  maxTunerRowSpanMm,
} from '../src/geometry/editLimits';
import {
  clampPointToHeadstockOutline,
  computeHeadstockOutlineLocal,
  computeTunerPositions,
  HEADSTOCK_TYPE_META,
  seedHeadstockAnchors,
  DEFAULT_HEADSTOCK_SETTINGS,
} from '../src/geometry/headstock';
import { DEFAULT_NECK_PARAMS } from '../src/geometry/neckParams';
import { bodyToNeckSpace } from '../src/geometry/neckPlacement';
import { neckJoinPoint } from '../src/geometry/scaleLock';
import { BODY_TEMPLATES } from '../src/geometry/templates';
import { computeParametricAnchors } from '../src/geometry/bodyModel';
import { useDesignStore } from '../src/state/store';
import type { Point } from '../src/geometry/types';

function handleLen(a: { position: Point; handleIn: Point; handleOut: Point }): number {
  return Math.max(
    Math.hypot(a.handleIn.x - a.position.x, a.handleIn.y - a.position.y),
    Math.hypot(a.handleOut.x - a.position.x, a.handleOut.y - a.position.y),
  );
}

describe('edit envelopes', () => {
  it('boxes a yanked headstock point back onto the nut-side pad', () => {
    const p = clampHeadstockLocalPoint({ x: -2400, y: 800 });
    expect(p.x).toBe(HEADSTOCK_EDIT_LIMITS.minX);
    expect(p.y).toBe(HEADSTOCK_EDIT_LIMITS.maxAbsY);
    const towardBody = clampHeadstockLocalPoint({ x: 400, y: -900 });
    expect(towardBody.x).toBe(HEADSTOCK_EDIT_LIMITS.maxX);
    expect(towardBody.y).toBe(-HEADSTOCK_EDIT_LIMITS.maxAbsY);
  });

  it('shortens insane handles without moving locked nut corners', () => {
    const nut = {
      locked: true,
      position: { x: 0, y: 21 },
      handleIn: { x: 0, y: 17 },
      handleOut: { x: -10, y: 23 },
    };
    const tip = {
      locked: false,
      position: { x: -1800, y: 0 },
      handleIn: { x: -2200, y: 400 },
      handleOut: { x: -1400, y: -400 },
    };
    const [n, t] = clampHeadstockAnchors([nut, tip]);
    expect(n).toEqual(nut);
    expect(t.position.x).toBe(HEADSTOCK_EDIT_LIMITS.minX);
    expect(handleLen(t)).toBeLessThanOrEqual(HEADSTOCK_EDIT_LIMITS.maxHandleLength + 1e-6);
  });

  it('leaves every stock headstock (incl. 12-string max dims) untouched', () => {
    for (const meta of HEADSTOCK_TYPE_META.filter((t) => t.id !== 'headless')) {
      for (const dims of [
        meta.defaultDims,
        { length: HEADSTOCK_LENGTH_LIMITS.max, tipWidth: HEADSTOCK_WIDTH_LIMITS.max },
      ]) {
        const settings = {
          ...DEFAULT_HEADSTOCK_SETTINGS,
          type: meta.id,
          ...dims,
        };
        const seeded = seedHeadstockAnchors(DEFAULT_NECK_PARAMS, settings, 12);
        expect(clampHeadstockAnchors(seeded), `${meta.id} ${dims.length}×${dims.tipWidth}`).toEqual(seeded);
      }
    }
  });

  it('leaves every stock body outline untouched', () => {
    for (const template of BODY_TEMPLATES) {
      const anchors = computeParametricAnchors(template, template.defaultParams);
      expect(clampBodyAnchors(anchors), template.id).toEqual(anchors);
    }
  });

  it('boxes body and hardware points that fly off the instrument', () => {
    const [a] = clampBodyAnchors([
      {
        locked: false,
        position: { x: 4000, y: -2000 },
        handleIn: { x: 4100, y: -2000 },
        handleOut: { x: 3900, y: -2000 },
      },
    ]);
    expect(a.position.x).toBe(BODY_EDIT_LIMITS.maxX);
    expect(a.position.y).toBe(-BODY_EDIT_LIMITS.maxAbsY);
    const hw = clampHardwareBodyPoint({ x: -900, y: 1200 });
    expect(hw.x).toBe(HARDWARE_EDIT_LIMITS.minX);
    expect(hw.y).toBe(HARDWARE_EDIT_LIMITS.maxAbsY);
  });

  it('clamps neck params to the slider ranges', () => {
    expect(clampNeckParam('neckLength', 900)).toBe(500);
    expect(clampNeckParam('neckAngle', 6)).toBe(5);
    expect(clampNeckParam('nutWidth', 10)).toBe(38);
  });
});

describe('tuner row on a stretched outline', () => {
  it('keeps pegs in a compact bank near the tip, not mid-wedge', () => {
    const seeded = seedHeadstockAnchors(DEFAULT_NECK_PARAMS, DEFAULT_HEADSTOCK_SETTINGS, 6);
    const stretched = seeded.map((a) => {
      if (a.locked) return a;
      const dx = -900;
      return {
        ...a,
        position: { x: a.position.x + dx, y: a.position.y },
        handleIn: { x: a.handleIn.x + dx, y: a.handleIn.y },
        handleOut: { x: a.handleOut.x + dx, y: a.handleOut.y },
        manuallyEdited: true,
      };
    });
    const placement = { joinPoint: { x: 25, y: 0 } };
    const tuners = computeTunerPositions(
      DEFAULT_NECK_PARAMS,
      DEFAULT_HEADSTOCK_SETTINGS,
      placement,
      [],
      6,
      stretched,
    );
    expect(tuners).toHaveLength(6);
    const local = tuners.map((t) => bodyToNeckSpace(t.position, DEFAULT_NECK_PARAMS, placement));
    const tipX = Math.min(...stretched.map((a) => a.position.x));
    const xs = local.map((p) => p.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThanOrEqual(maxTunerRowSpanMm(6) + 8);
    const meanX = xs.reduce((s, x) => s + x, 0) / xs.length;
    // Mid-wedge would sit near the nut (x≈0). The bank belongs on the far tip.
    expect(meanX).toBeLessThan((tipX + 0) / 2);
    for (const p of local) expect(p.x).toBeLessThan(-400);
  });
});

function pointInPolygon(pt: Point, poly: Point[]): boolean {
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

describe('tuner drag stays on the wood', () => {
  it('leaves an on-wood peg alone and snaps an off-wood peg back inside', () => {
    const anchors = seedHeadstockAnchors(DEFAULT_NECK_PARAMS, DEFAULT_HEADSTOCK_SETTINGS, 6);
    const outline = computeHeadstockOutlineLocal(
      DEFAULT_NECK_PARAMS,
      DEFAULT_HEADSTOCK_SETTINGS,
      6,
      anchors,
    )!;
    const inside = { x: -80, y: 12 };
    expect(pointInPolygon(inside, outline)).toBe(true);
    expect(clampPointToHeadstockOutline(inside, outline)).toEqual(inside);

    const off = clampPointToHeadstockOutline({ x: -80, y: 220 }, outline);
    expect(pointInPolygon(off, outline)).toBe(true);
    expect(Math.abs(off.y)).toBeLessThan(80);
  });

  it('store drag cannot park a tuner in empty space beside the head', () => {
    useDesignStore.getState().resetToDefaults();
    const before = useDesignStore.getState().hardware.tuners[0];
    expect(before).toBeTruthy();
    const target = { x: before.x + 400, y: before.y + 250 };
    useDesignStore.getState().moveHardware('tuners', target, 0);
    const after = useDesignStore.getState().hardware.tuners[0];
    const s = useDesignStore.getState();
    const outline = computeHeadstockOutlineLocal(
      s.neckParams,
      s.headstockSettings,
      s.bridgeSettings.stringCount ?? 6,
      s.headstockAnchors,
    )!;
    const local = bodyToNeckSpace(after, s.neckParams, {
      joinPoint: neckJoinPoint(s.bodyAnchors, s.neckParams),
    });
    expect(pointInPolygon(local, outline)).toBe(true);
    expect(Math.hypot(after.x - target.x, after.y - target.y)).toBeGreaterThan(200);
  });
});

describe('store applies the envelopes', () => {
  beforeEach(() => {
    useDesignStore.getState().resetToDefaults();
  });

  it('refuses to drag a headstock point down the neck or a metre past the tip', () => {
    const id = useDesignStore.getState().headstockAnchors.find((a) => !a.locked)!.id;
    useDesignStore.getState().moveHeadstockAnchor(id, 'position', { x: -4000, y: 0 });
    const after = useDesignStore.getState().headstockAnchors.find((a) => a.id === id)!;
    expect(after.position.x).toBeGreaterThanOrEqual(HEADSTOCK_EDIT_LIMITS.minX);
    expect(after.position.x).toBeLessThanOrEqual(HEADSTOCK_EDIT_LIMITS.maxX);
    expect(Math.abs(after.position.y)).toBeLessThanOrEqual(HEADSTOCK_EDIT_LIMITS.maxAbsY);
  });

  it('clamps an out-of-range neck length typed past the slider', () => {
    useDesignStore.getState().setNeckParam('neckLength', 2000);
    expect(useDesignStore.getState().neckParams.neckLength).toBe(500);
  });
});
