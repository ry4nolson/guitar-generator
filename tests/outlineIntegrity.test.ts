import { describe, it, expect, beforeEach } from 'vitest';
import {
  outlineSelfIntersects,
  shouldAcceptOutlineEdit,
  type OutlineCurveAnchor,
} from '../src/geometry/outlineIntegrity';
import { evaluateConstraints } from '../src/geometry/constraints';
import { useDesignStore } from '../src/state/store';
import { computeParametricAnchors } from '../src/geometry/bodyModel';
import { TELE_TEMPLATE } from '../src/geometry/templates';
import type { BodyAnchor } from '../src/geometry/types';

function knot(x: number, y: number): OutlineCurveAnchor {
  return {
    position: { x, y },
    handleIn: { x, y },
    handleOut: { x, y },
  };
}

function swapBodyAnchors(anchors: BodyAnchor[], idA: string, idB: string): BodyAnchor[] {
  const a = anchors.find((x) => x.id === idA)!;
  const b = anchors.find((x) => x.id === idB)!;
  return anchors.map((p) => {
    if (p.id === idA) {
      return {
        ...p,
        position: { ...b.position },
        handleIn: { ...b.handleIn },
        handleOut: { ...b.handleOut },
        manuallyEdited: true,
      };
    }
    if (p.id === idB) {
      return {
        ...p,
        position: { ...a.position },
        handleIn: { ...a.handleIn },
        handleOut: { ...a.handleOut },
        manuallyEdited: true,
      };
    }
    return p;
  });
}

describe('outlineSelfIntersects', () => {
  it('accepts a simple closed square', () => {
    expect(outlineSelfIntersects([knot(0, 0), knot(10, 0), knot(10, 10), knot(0, 10)])).toBe(false);
  });

  it('flags a bowtie (figure-8) as self-intersecting', () => {
    expect(outlineSelfIntersects([knot(0, 0), knot(10, 10), knot(10, 0), knot(0, 10)])).toBe(true);
  });

  it('flags a cubic that loops over itself', () => {
    const looped: OutlineCurveAnchor[] = [
      { position: { x: 0, y: 0 }, handleIn: { x: 0, y: 0 }, handleOut: { x: 80, y: 80 } },
      { position: { x: 10, y: 0 }, handleIn: { x: -70, y: 80 }, handleOut: { x: 10, y: 0 } },
      knot(10, 10),
      knot(0, 10),
    ];
    expect(outlineSelfIntersects(looped)).toBe(true);
  });

  it('flags adjacent cubics that cross away from their shared point (an ear)', () => {
    const ear: OutlineCurveAnchor[] = [
      { position: { x: 0, y: 0 }, handleIn: { x: 0, y: 0 }, handleOut: { x: 12, y: 12 } },
      { position: { x: 20, y: 0 }, handleIn: { x: 12, y: -12 }, handleOut: { x: 12, y: 12 } },
      { position: { x: 0, y: 1 }, handleIn: { x: 12, y: -12 }, handleOut: { x: 0, y: 1 } },
    ];
    expect(outlineSelfIntersects(ear)).toBe(true);
  });

  it('flags swapping non-adjacent Tele points as knotted', () => {
    const anchors = computeParametricAnchors(TELE_TEMPLATE, TELE_TEMPLATE.defaultParams);
    const tangled = swapBodyAnchors(anchors, 'upperHornTip', 'tailPoint');
    expect(outlineSelfIntersects(tangled)).toBe(true);
  });

  it('leaves every stock template default simple', () => {
    const anchors = computeParametricAnchors(TELE_TEMPLATE, TELE_TEMPLATE.defaultParams);
    expect(outlineSelfIntersects(anchors)).toBe(false);
  });
});

describe('shouldAcceptOutlineEdit', () => {
  const square = [knot(0, 0), knot(10, 0), knot(10, 10), knot(0, 10)];
  const bowtie = [knot(0, 0), knot(10, 10), knot(10, 0), knot(0, 10)];

  it('rejects a knot when the current outline is still simple', () => {
    expect(shouldAcceptOutlineEdit(square, bowtie)).toBe(false);
  });

  it('allows any edit once the outline is already knotted (so it can be untangled)', () => {
    expect(shouldAcceptOutlineEdit(bowtie, bowtie)).toBe(true);
    expect(shouldAcceptOutlineEdit(bowtie, square)).toBe(true);
  });
});

describe('store refuses knotted body edits', () => {
  beforeEach(() => {
    useDesignStore.getState().resetToDefaults();
    useDesignStore.getState().resetAppSettings();
  });

  it('keeps a modest waist nudge', () => {
    const waist = useDesignStore.getState().bodyAnchors.find((a) => a.id === 'waistPoint')!;
    useDesignStore.getState().moveAnchorPoint('waistPoint', 'position', {
      x: waist.position.x,
      y: waist.position.y - 5,
    });
    const after = useDesignStore.getState().bodyAnchors.find((a) => a.id === 'waistPoint')!;
    expect(after.position.y).toBeCloseTo(waist.position.y - 5, 5);
  });

  it('does not let a point jump across the body onto another outline point', () => {
    const horn = useDesignStore.getState().bodyAnchors.find((a) => a.id === 'upperHornTip')!;
    const tail = useDesignStore.getState().bodyAnchors.find((a) => a.id === 'tailPoint')!;
    const before = { ...horn.position };
    const pastLen = useDesignStore.getState().past.length;
    useDesignStore.getState().moveAnchorPoint('upperHornTip', 'position', { ...tail.position });
    const after = useDesignStore.getState().bodyAnchors.find((a) => a.id === 'upperHornTip')!;
    expect(after.position).toEqual(before);
    expect(useDesignStore.getState().past).toHaveLength(pastLen);
    expect(outlineSelfIntersects(useDesignStore.getState().bodyAnchors)).toBe(false);
  });

  it('does not record undo for a rejected drag inside a history gesture', () => {
    const horn = useDesignStore.getState().bodyAnchors.find((a) => a.id === 'upperHornTip')!;
    const waist = useDesignStore.getState().bodyAnchors.find((a) => a.id === 'waistPoint')!;
    const hornOrigin = { ...horn.position };
    const waistOrigin = { ...waist.position };
    const tail = useDesignStore.getState().bodyAnchors.find((a) => a.id === 'tailPoint')!;
    useDesignStore.getState().beginHistoryGesture();
    useDesignStore.getState().moveAnchorPoint('upperHornTip', 'position', { ...tail.position });
    useDesignStore.getState().moveAnchorPoint('waistPoint', 'position', {
      x: waistOrigin.x,
      y: waistOrigin.y - 4,
    });
    useDesignStore.getState().endHistoryGesture();
    expect(useDesignStore.getState().bodyAnchors.find((a) => a.id === 'upperHornTip')!.position).toEqual(hornOrigin);
    expect(useDesignStore.getState().bodyAnchors.find((a) => a.id === 'waistPoint')!.position.y).toBeCloseTo(
      waistOrigin.y - 4,
      5,
    );
    useDesignStore.getState().undo();
    expect(useDesignStore.getState().bodyAnchors.find((a) => a.id === 'waistPoint')!.position).toEqual(waistOrigin);
  });

  it('rejects a feature drag that would knot the outline', () => {
    const horn = useDesignStore.getState().bodyAnchors.find((a) => a.id === 'upperHornTip')!;
    const before = { ...horn.position };
    const hornIds = useDesignStore
      .getState()
      .bodyAnchors.filter((a) => a.featureId === 'upperHorn')
      .map((a) => a.id);
    useDesignStore.getState().moveFeatureAnchors(hornIds, 320, -280);
    expect(useDesignStore.getState().bodyAnchors.find((a) => a.id === 'upperHornTip')!.position).toEqual(before);
  });

  it('flags an already-knotted loaded outline and still lets it be edited', () => {
    const s = useDesignStore.getState();
    const tangled = swapBodyAnchors(s.bodyAnchors, 'upperHornTip', 'tailPoint');
    expect(outlineSelfIntersects(tangled)).toBe(true);
    const violations = evaluateConstraints({ ...s, bodyAnchors: tangled });
    expect(violations.some((v) => v.constraintId === 'body-self-intersection')).toBe(true);

    useDesignStore.getState().loadDocument({
      version: s.version,
      templateId: s.templateId,
      bodyParams: s.bodyParams,
      bodyAnchors: tangled,
      neckParams: s.neckParams,
      hardware: s.hardware,
      bridgeSettings: s.bridgeSettings,
      nutSettings: s.nutSettings,
      headstockSettings: s.headstockSettings,
      headstockAnchors: s.headstockAnchors,
      pickupSettings: s.pickupSettings,
      controlSettings: s.controlSettings,
      settings: s.settings,
      layers: s.layers,
    });
    const horn = useDesignStore.getState().bodyAnchors.find((a) => a.id === 'upperHornTip')!;
    const further = { x: horn.position.x + 12, y: horn.position.y + 8 };
    useDesignStore.getState().moveAnchorPoint('upperHornTip', 'position', further);
    const after = useDesignStore.getState().bodyAnchors.find((a) => a.id === 'upperHornTip')!;
    expect(after.position.x).toBeCloseTo(further.x, 5);
    expect(after.position.y).toBeCloseTo(further.y, 5);
  });
});
