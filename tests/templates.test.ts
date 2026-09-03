import { describe, it, expect, beforeEach } from 'vitest';
import { computeParametricAnchors } from '../src/geometry/bodyModel';
import { BODY_TEMPLATES, getBodyTemplate, groupedTemplates, templateHardwareHint } from '../src/geometry/templates';
import { buildSvgDocument } from '../src/export/svgExport';
import { evaluateConstraints } from '../src/geometry/constraints';
import { useDesignStore, DESIGN_DOCUMENT_VERSION } from '../src/state/store';
import { defaultLayers } from '../src/state/layers';
import type { BodyAnchor, Point } from '../src/geometry/types';

function sampleClosedPath(anchors: BodyAnchor[], perSegment = 40): Point[] {
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

function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d1 = { x: p2.x - p1.x, y: p2.y - p1.y };
  const d2 = { x: p4.x - p3.x, y: p4.y - p3.y };
  const denom = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(denom) < 1e-9) return false;
  const t = ((p3.x - p1.x) * d2.y - (p3.y - p1.y) * d2.x) / denom;
  const u = ((p3.x - p1.x) * d1.y - (p3.y - p1.y) * d1.x) / denom;
  return t > 0 && t < 1 && u > 0 && u < 1;
}

function hasSelfIntersection(samples: Point[]): boolean {
  const m = samples.length - 1;
  for (let i = 0; i < m; i++) {
    for (let j = i + 2; j < m; j++) {
      if (i === 0 && j === m - 1) continue;
      if (segmentsIntersect(samples[i], samples[i + 1], samples[j], samples[j + 1])) return true;
    }
  }
  return false;
}

function turningAngleDeg(samples: Point[]): number[] {
  const angles: number[] = [];
  for (let i = 1; i < samples.length - 1; i++) {
    const v1 = { x: samples[i].x - samples[i - 1].x, y: samples[i].y - samples[i - 1].y };
    const v2 = { x: samples[i + 1].x - samples[i].x, y: samples[i + 1].y - samples[i].y };
    const n1 = Math.hypot(v1.x, v1.y);
    const n2 = Math.hypot(v2.x, v2.y);
    if (n1 < 1e-9 || n2 < 1e-9) continue;
    const cos = Math.min(1, Math.max(-1, (v1.x * v2.x + v1.y * v2.y) / (n1 * n2)));
    angles.push((Math.acos(cos) * 180) / Math.PI);
  }
  return angles;
}

describe('every template preset', () => {
  for (const template of BODY_TEMPLATES) {
    describe(template.name, () => {
      const anchors = computeParametricAnchors(template, template.defaultParams);
      const samples = sampleClosedPath(anchors);

      it('creates a closed path (first and last sample coincide)', () => {
        expect(samples[0].x).toBeCloseTo(samples[samples.length - 1].x, 6);
        expect(samples[0].y).toBeCloseTo(samples[samples.length - 1].y, 6);
      });

      it('contains no NaN or Infinity in any anchor position/handle', () => {
        for (const a of anchors) {
          for (const p of [a.position, a.handleIn, a.handleOut]) {
            expect(Number.isFinite(p.x)).toBe(true);
            expect(Number.isFinite(p.y)).toBe(true);
          }
        }
      });

      it('does not self-intersect at default params', () => {
        expect(hasSelfIntersection(samples)).toBe(false);
      });

      it("'smooth'-continuity anchors have approximately aligned (collinear, opposite) in/out tangents", () => {
        for (const a of anchors) {
          if (a.continuity !== 'smooth' && a.continuity !== 'tangent') continue;
          const inDir = { x: a.handleIn.x - a.position.x, y: a.handleIn.y - a.position.y };
          const outDir = { x: a.handleOut.x - a.position.x, y: a.handleOut.y - a.position.y };
          const inLen = Math.hypot(inDir.x, inDir.y);
          const outLen = Math.hypot(outDir.x, outDir.y);
          if (inLen < 1e-6 || outLen < 1e-6) continue;
          const cosAngle = (inDir.x * outDir.x + inDir.y * outDir.y) / (inLen * outLen);
          expect(cosAngle).toBeLessThan(-0.98);
        }
      });

      it('corner-continuity anchors keep independent (non-mirrored) handles', () => {
        const cornerAnchors = anchors.filter((a) => a.continuity === 'corner');
        if (cornerAnchors.length === 0) return;
        // The engine must not force-align corner handles; the template decides
        // whether they read as a kink or as a straight-into-arc (G1) join.
        expect(cornerAnchors.every((a) => a.mirrorHandles === false)).toBe(true);
      });

      it('body bounds stay within a reasonable tolerance of the declared length/width params', () => {
        const xs = anchors.map((a) => a.position.x);
        const ys = anchors.map((a) => a.position.y);
        const spanX = Math.max(...xs) - Math.min(...xs);
        const spanY = Math.max(...ys) - Math.min(...ys);
        const L = template.defaultParams.bodyLength;
        const W = template.defaultParams.bodyWidth;
        expect(spanX).toBeGreaterThan(L * 0.55);
        // Horns may extend slightly past the nominal bodyLength (forward of the neck joint).
        expect(spanX).toBeLessThan(L * 1.15);
        expect(spanY).toBeGreaterThan(W * 0.55);
        expect(spanY).toBeLessThan(W * 1.15);
      });

      it('default body dimensions stay in a realistic electric-guitar range', () => {
        const L = template.defaultParams.bodyLength;
        const W = template.defaultParams.bodyWidth;
        expect(L).toBeGreaterThanOrEqual(400);
        expect(L).toBeLessThanOrEqual(560);
        expect(W).toBeGreaterThanOrEqual(280);
        // Offset-V / explorer bodies are legitimately 375–434 mm tip-to-tip;
        // conventional double-cuts stay under ~360.
        const wide = new Set(['flying-v', 'kelly', 'rhoads', 'king-v', 'warrior']);
        expect(W).toBeLessThanOrEqual(wide.has(template.id) ? 450 : 360);
      });
    });
  }
});

describe('Flying-V corner continuity', () => {
  const template = getBodyTemplate('flying-v');
  const anchors = computeParametricAnchors(template, template.defaultParams);

  const byId = new Map(anchors.map((a) => [a.id, a]));

  it('uses corner continuity on every anchor', () => {
    expect(anchors.every((a) => a.continuity === 'corner')).toBe(true);
  });

  it('renders the wing edges as true straight lines (handles collinear with the segment)', () => {
    const straightPairs: [string, string][] = [
      ['upperShoulderOuter', 'upperTipOuter'], // outer bass edge
      ['upperTipInner', 'crotchUpper'], // inner bass edge
      ['crotchLower', 'lowerTipInner'], // inner treble edge
      ['lowerTipOuter', 'lowerShoulderOuter'], // outer treble edge
      ['lowerShoulderFront', 'neckJoint'], // front edge
      ['neckJoint', 'upperShoulderFront'],
    ];
    for (const [fromId, toId] of straightPairs) {
      const from = byId.get(fromId)!;
      const to = byId.get(toId)!;
      const seg = { x: to.position.x - from.position.x, y: to.position.y - from.position.y };
      for (const h of [
        { x: from.handleOut.x - from.position.x, y: from.handleOut.y - from.position.y },
        { x: to.handleIn.x - to.position.x, y: to.handleIn.y - to.position.y },
      ]) {
        expect(Math.abs(seg.x * h.y - seg.y * h.x)).toBeLessThan(1e-6 * Math.hypot(seg.x, seg.y) * Math.hypot(h.x, h.y) + 1e-6);
      }
    }
  });

  it('rounds every corner with a G1 fillet (no pinched cusps at tips / crotch / shoulders)', () => {
    for (const a of anchors) {
      const inDir = { x: a.handleIn.x - a.position.x, y: a.handleIn.y - a.position.y };
      const outDir = { x: a.handleOut.x - a.position.x, y: a.handleOut.y - a.position.y };
      const cos =
        (inDir.x * outDir.x + inDir.y * outDir.y) / (Math.hypot(inDir.x, inDir.y) * Math.hypot(outDir.x, outDir.y));
      expect(cos).toBeLessThan(-0.999);
    }
  });

  it('places the rounded tips exactly at the declared length / half-width', () => {
    const { bodyLength, bodyWidth } = template.defaultParams;
    const samples = sampleClosedPath(anchors, 200);
    const maxX = Math.max(...samples.map((p) => p.x));
    const maxY = Math.max(...samples.map((p) => p.y));
    expect(maxX).toBeCloseTo(bodyLength, 0);
    expect(maxY).toBeCloseTo(bodyWidth / 2, 0);
  });

  it('places wing tips as the rearmost points (aft of the crotch)', () => {
    expect(byId.get('upperTipOuter')!.position.x).toBeGreaterThan(byId.get('crotchUpper')!.position.x);
  });

  it('keeps the outline symmetrical about the centerline', () => {
    const pairs: [string, string][] = [
      ['upperTipOuter', 'lowerTipOuter'],
      ['upperTipInner', 'lowerTipInner'],
      ['crotchUpper', 'crotchLower'],
      ['upperShoulderOuter', 'lowerShoulderOuter'],
    ];
    for (const [u, l] of pairs) {
      const upper = byId.get(u)!;
      const lower = byId.get(l)!;
      expect(upper.position.x).toBeCloseTo(lower.position.x, 6);
      expect(upper.position.y).toBeCloseTo(-lower.position.y, 6);
    }
  });

  it("matches '58-style proportions: ~121 mm front, crotch ~63% back, 424 mm tip-to-tip", () => {
    const front = byId.get('upperShoulderFront')!.position.y - byId.get('lowerShoulderFront')!.position.y;
    expect(front).toBeGreaterThan(80);
    expect(front).toBeLessThan(121);
    expect(byId.get('crotchUpper')!.position.x / template.defaultParams.bodyLength).toBeGreaterThan(0.55);
    expect(template.defaultParams.bodyWidth).toBe(424);
  });
});

describe('parameter isolation between features', () => {
  const tele = BODY_TEMPLATES.find((t) => t.id === 'tele')!;

  it('changing upper-horn parameters primarily affects upper-horn-owned anchors', () => {
    const before = computeParametricAnchors(tele, tele.defaultParams);
    const after = computeParametricAnchors(tele, {
      ...tele.defaultParams,
      upperHornReach: tele.defaultParams.upperHornReach + 25,
    });

    const beforeById = new Map(before.map((a) => [a.id, a]));
    let movedNonHornAnchors = 0;
    let movedHornAnchors = 0;
    for (const a of after) {
      const prior = beforeById.get(a.id)!;
      const moved = Math.hypot(a.position.x - prior.position.x, a.position.y - prior.position.y) > 0.01;
      if (!moved) continue;
      if (a.featureId === 'upperHorn') movedHornAnchors++;
      else movedNonHornAnchors++;
    }
    expect(movedHornAnchors).toBeGreaterThan(0);
    expect(movedNonHornAnchors).toBe(0);
  });

  it('changing hip-contour parameters primarily affects hip-contour-owned anchors', () => {
    const before = computeParametricAnchors(tele, tele.defaultParams);
    const after = computeParametricAnchors(tele, {
      ...tele.defaultParams,
      hipCutoutDepth: tele.defaultParams.hipCutoutDepth + 12,
    });

    const beforeById = new Map(before.map((a) => [a.id, a]));
    let movedNonHipAnchors = 0;
    let movedHipAnchors = 0;
    for (const a of after) {
      const prior = beforeById.get(a.id)!;
      const moved = Math.hypot(a.position.x - prior.position.x, a.position.y - prior.position.y) > 0.01;
      if (!moved) continue;
      if (a.featureId === 'hipContour') movedHipAnchors++;
      else movedNonHipAnchors++;
    }
    expect(movedHipAnchors).toBeGreaterThan(0);
    expect(movedNonHipAnchors).toBe(0);
  });
});

describe('self-intersection across a range of parameter values (not just defaults)', () => {
  for (const template of BODY_TEMPLATES) {
    it(`${template.name}: stays self-intersection-free across a spread of body length/width`, () => {
      for (const bodyLength of [template.defaultParams.bodyLength * 0.9, template.defaultParams.bodyLength * 1.08]) {
        for (const bodyWidth of [template.defaultParams.bodyWidth * 0.9, template.defaultParams.bodyWidth * 1.08]) {
          const anchors = computeParametricAnchors(template, { ...template.defaultParams, bodyLength, bodyWidth });
          const samples = sampleClosedPath(anchors);
          expect(hasSelfIntersection(samples)).toBe(false);
        }
      }
    });
  }
});

describe('turning angle sanity (no accidental hidden cusps in smooth-only templates)', () => {
  const smoothTemplates = BODY_TEMPLATES.filter((t) =>
    computeParametricAnchors(t, t.defaultParams).every((a) => a.continuity !== 'corner'),
  );
  for (const template of smoothTemplates) {
    it(`${template.name}: max turning angle stays well below a sharp-corner threshold`, () => {
      const anchors = computeParametricAnchors(template, template.defaultParams);
      const samples = sampleClosedPath(anchors, 60);
      const angles = turningAngleDeg(samples);
      expect(Math.max(...angles)).toBeLessThan(25);
    });
  }
});

describe('template switching', () => {
  beforeEach(() => {
    useDesignStore.getState().resetToDefaults();
  });

  it('preserves shared neck settings when switching templates', () => {
    const store = useDesignStore.getState();
    store.setNeckParam('bassScale', 660);
    store.setNeckParam('trebleScale', 640);
    store.setNeckParam('fretCount', 22);
    store.setNeckParam('nutWidth', 42);

    store.setTemplate('strat');

    const neck = useDesignStore.getState().neckParams;
    expect(neck.bassScale).toBe(660);
    expect(neck.trebleScale).toBe(640);
    expect(neck.fretCount).toBe(22);
    expect(neck.nutWidth).toBe(42);
    expect(useDesignStore.getState().templateId).toBe('strat');
  });

  it('resets template-specific body geometry and hardware when switching', () => {
    const store = useDesignStore.getState();
    const teleAnchors = store.bodyAnchors
      .map((a) => a.id)
      .sort()
      .join(',');
    store.moveAnchorPoint('upperHornTip', 'position', { x: 10, y: 80 });
    expect(useDesignStore.getState().isBodyDirty()).toBe(true);

    store.setTemplate('flying-v');

    const after = useDesignStore.getState();
    expect(after.templateId).toBe('flying-v');
    expect(after.isBodyDirty()).toBe(false);
    expect(after.bodyAnchors.every((a) => !a.manuallyEdited)).toBe(true);
    const vAnchors = after.bodyAnchors
      .map((a) => a.id)
      .sort()
      .join(',');
    expect(vAnchors).not.toBe(teleAnchors);
    expect(after.bodyParams.bodyLength).toBe(getBodyTemplate('flying-v').defaultParams.bodyLength);
  });

  it('preserves unit preference across template switches', () => {
    useDesignStore.getState().setUnit('in');
    useDesignStore.getState().setTemplate('strat');
    expect(useDesignStore.getState().settings.unit).toBe('in');
  });

  it('applies family presets: Strat gets 3 single coils, 5-way, tremolo; V gets 2 humbuckers, toggle, TOM, 3×3', () => {
    useDesignStore.getState().setTemplate('strat');
    let s = useDesignStore.getState();
    expect(s.pickupSettings).toEqual({ neck: 'single-coil', middle: 'single-coil', bridge: 'single-coil' });
    expect(s.hardware.pickups.every((p) => p.visible)).toBe(true);
    expect(s.controlSettings.selector).toBe('blade-5');
    expect(s.controlSettings.volumes + s.controlSettings.tones).toBe(3);
    expect(s.hardware.controls).toHaveLength(3);
    expect(s.bridgeSettings.type).toBe('strat-tremolo');
    expect(s.headstockSettings.type).toBe('paddle');

    useDesignStore.getState().setTemplate('flying-v');
    s = useDesignStore.getState();
    expect(s.pickupSettings).toEqual({ neck: 'humbucker', middle: 'none', bridge: 'humbucker' });
    expect(s.hardware.pickups[1].visible).toBe(false);
    expect(s.controlSettings.selector).toBe('toggle');
    expect(s.bridgeSettings.type).toBe('tom');
    expect(s.headstockSettings.type).toBe('3x3');
    expect(s.headstockSettings.tunerLayout).toBe('3x3');
    expect(s.hardware.tuners.length).toBe(6);
  });

  it('applies each family head at its natural proportions unless the outline was hand-sculpted', () => {
    useDesignStore.getState().setTemplate('strat');
    let s = useDesignStore.getState();
    expect(s.headstockSettings.type).toBe('paddle');
    expect(s.headstockSettings.length).toBe(175);
    expect(s.headstockSettings.tipWidth).toBe(93);

    // Sculpt the head, then re-apply a template with the same head type: the
    // outline survives because the type did not change.
    const free = s.headstockAnchors.find((a) => !a.locked)!;
    s.nudgeHeadstockAnchor(free.id, 3, 3);
    useDesignStore.getState().setTemplate('strat');
    s = useDesignStore.getState();
    expect(s.headstockAnchors.some((a) => a.manuallyEdited)).toBe(true);

    // A type change always re-seeds with the new family's dimensions.
    useDesignStore.getState().setTemplate('tele');
    s = useDesignStore.getState();
    expect(s.headstockSettings.type).toBe('tele');
    expect(s.headstockSettings.length).toBe(174);
    expect(s.headstockSettings.tipWidth).toBe(79);
    expect(s.headstockAnchors.some((a) => a.manuallyEdited)).toBe(false);
  });

  it('keeps multi-string bridge spacing when a preset changes the bridge type', () => {
    useDesignStore.getState().setStringCount(7);
    const spacing = useDesignStore.getState().bridgeSettings.stringSpacing;
    useDesignStore.getState().setTemplate('flying-v');
    expect(useDesignStore.getState().bridgeSettings.stringSpacing).toBe(spacing);
    expect(useDesignStore.getState().hardware.saddles).toHaveLength(7);
  });
});

describe('template defaults are constraint-clean', () => {
  beforeEach(() => {
    useDesignStore.getState().resetToDefaults();
  });

  for (const template of BODY_TEMPLATES) {
    it(`${template.name}: fresh design raises no constraint warnings`, () => {
      useDesignStore.getState().setTemplate(template.id);
      const violations = evaluateConstraints(useDesignStore.getState());
      expect(violations.map((v) => v.message)).toEqual([]);
    });
  }
});

describe('SVG export excludes reference overlays', () => {
  it('never emits a reference-overlay image element', () => {
    const tele = getBodyTemplate('tele');
    const doc = {
      version: DESIGN_DOCUMENT_VERSION,
      templateId: tele.id,
      bodyParams: { ...tele.defaultParams },
      bodyAnchors: computeParametricAnchors(tele, tele.defaultParams),
      neckParams: { ...tele.defaultNeckParams },
      hardware: structuredClone(tele.defaultHardware),
      bridgeSettings: { type: 'hardtail' as const, stringSpacing: 52.5, saddleTravel: 18, stopbarOffset: 28, postSpacing: 74 },
      nutSettings: { type: 'standard' as const, stringSpacing: 35, thickness: 5 },
      headstockSettings: {
        type: 'paddle' as const,
        length: 175,
        tipWidth: 68,
        earWidth: 30,
        showTuners: true,
        tunerLayout: '6-inline' as const,
      },
      settings: {
        unit: 'mm' as const,
        theme: 'dark' as const,
        view: 'top' as const,
        gridSize: 5,
        gridSnapEnabled: false,
        showPointsAndHandles: true,
        showDebugOverlay: false,
        canvasPadding: 40,
      },
      layers: defaultLayers(),
    };
    for (const flavor of ['clean', 'blueprint', 'fabrication'] as const) {
      const svg = buildSvgDocument(doc, flavor);
      expect(svg).not.toMatch(/data-reference-overlay/);
      expect(svg).not.toMatch(/<image\b/i);
    }
  });
});

describe('template families', () => {
  it('assigns every template to a gallery family', () => {
    for (const t of BODY_TEMPLATES) {
      expect(['classic', 'v', 'superstrat']).toContain(t.family);
    }
  });

  it('groups Classic / V / Superstrat without dropping templates', () => {
    const groups = groupedTemplates(BODY_TEMPLATES);
    expect(groups.map((g) => g.id)).toEqual(['classic', 'v', 'superstrat']);
    expect(groups.flatMap((g) => g.templates).length).toBe(BODY_TEMPLATES.length);
  });

  it('builds a hardware hint for Strat', () => {
    const hint = templateHardwareHint(getBodyTemplate('strat'));
    expect(hint).toContain('SSS');
    expect(hint.length).toBeGreaterThan(3);
  });
});
