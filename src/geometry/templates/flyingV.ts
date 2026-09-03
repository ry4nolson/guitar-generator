// Flying-V-inspired: two straight-edged wings meeting at a rounded crotch.
// Built analytically from published '58-style proportions rather than traced
// (available V photos are shot at an angle, so a trace bakes in perspective):
//   tip-to-tip width ≈ 424 mm, front (shoulder) width ≈ 121 mm,
//   shoulder-to-crotch on the centerline ≈ 295 mm, ~1" tip radius, ~35 mm
//   crotch radius. Every straight edge is a corner-mode anchor whose handles
//   lie on the edge; each corner is rounded by a two-anchor circular fillet
//   (G1 into and out of the straight), so edges stay razor straight while tips,
//   crotch and shoulders read as machined radii instead of pinched cusps.
//
// Frame: x = 0 at the flat front edge (neck pocket mouth), +x toward the tips;
// +y is the bass side.

import type { AnchorSpec } from '../bodyEngine';
import type { BodyFeatureId } from '../bodyFeatures';
import type { Point } from '../types';
import { buildHardwareDefaults } from '../../state/hardwareDefaults';
import { DEFAULT_NECK_PARAMS } from '../neckParams';
import type { BodyTemplate, TemplateParamMeta } from './types';
import { selectAnchorOrder, MIN_BODY_ANCHORS } from './smoothLoop';

const PARAM_META: TemplateParamMeta[] = [
  { key: 'bodyLength', label: 'Body length', min: 420, max: 520, step: 1, unit: 'mm' },
  { key: 'bodyWidth', label: 'Tip-to-tip width', min: 340, max: 470, step: 1, unit: 'mm' },
  { key: 'anchorCount', label: 'Anchor points', min: MIN_BODY_ANCHORS, max: 11, step: 1, unit: 'count' },
  { key: 'forwardLean', label: 'Forward lean', min: -3, max: 6, step: 0.5, unit: 'deg' },
  { key: 'shoulderWidth', label: 'Front width', min: 90, max: 170, step: 1, unit: 'mm', featureId: 'neckTransition' },
  { key: 'shoulderRadius', label: 'Shoulder radius', min: 2, max: 40, step: 1, unit: 'mm', featureId: 'neckTransition' },
  { key: 'tipRadius', label: 'Tip radius', min: 4, max: 60, step: 1, unit: 'mm', featureId: 'upperHorn' },
  { key: 'notchDepth', label: 'Crotch position', min: 0.5, max: 0.8, step: 0.01, unit: 'ratio', featureId: 'tail' },
  { key: 'crotchRadius', label: 'Crotch radius', min: 4, max: 80, step: 1, unit: 'mm', featureId: 'tail' },
];

const DEFAULT_PARAMS: Record<string, number> = {
  bodyLength: 470,
  bodyWidth: 424,
  anchorCount: 11,
  forwardLean: 0,
  shoulderWidth: 121,
  shoulderRadius: 16,
  tipRadius: 25,
  notchDepth: 0.63,
  crotchRadius: 35,
};

const FULL_ORDER = [
  'neckJoint',
  'upperShoulderFront',
  'upperShoulderOuter',
  'upperTipOuter',
  'upperTipInner',
  'crotchUpper',
  'crotchLower',
  'lowerTipInner',
  'lowerTipOuter',
  'lowerShoulderOuter',
  'lowerShoulderFront',
];

// Reduced-count survival: the V skeleton (pocket, both tips, crotch), then the
// second half of each fillet, then the shoulders.
const PRIORITY = [
  'neckJoint',
  'upperTipOuter',
  'crotchUpper',
  'lowerTipOuter',
  'upperTipInner',
  'lowerTipInner',
  'crotchLower',
  'upperShoulderOuter',
  'lowerShoulderOuter',
  'upperShoulderFront',
  'lowerShoulderFront',
];

const FEATURE_OF: Record<string, BodyFeatureId> = {
  neckJoint: 'neckTransition',
  upperShoulderFront: 'upperBout',
  upperShoulderOuter: 'upperBout',
  upperTipOuter: 'upperHorn',
  upperTipInner: 'upperHorn',
  crotchUpper: 'tail',
  crotchLower: 'tail',
  lowerTipInner: 'lowerHornCutaway',
  lowerTipOuter: 'lowerHornCutaway',
  lowerShoulderOuter: 'lowerTrebleBout',
  lowerShoulderFront: 'lowerTrebleBout',
};

interface Resolved {
  position: Point;
  handleIn: Point;
  handleOut: Point;
}

function unit(v: Point): Point {
  const n = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / n, y: v.y / n };
}
function add(a: Point, b: Point, k = 1): Point {
  return { x: a.x + b.x * k, y: a.y + b.y * k };
}
function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}
function mirrorY(p: Point): Point {
  return { x: p.x, y: -p.y };
}

/**
 * Round the sharp corner at V (between neighbours P → V → N) with radius r.
 * Returns the two fillet anchors: `a` leaves the P–V straight and `b` lands
 * on the V–N straight. Both are G1: the straight-side handle runs along the
 * edge, the arc-side handle uses the standard cubic circular-arc length.
 * Straight-side handle lengths are filled in later (they depend on neighbours).
 */
function fillet(P: Point, V: Point, N: Point, r: number): { a: Resolved; b: Resolved; extreme: Point } {
  const u1 = unit(sub(P, V));
  const u2 = unit(sub(N, V));
  const cosPhi = Math.max(-1, Math.min(1, u1.x * u2.x + u1.y * u2.y));
  const phi = Math.acos(cosPhi); // interior angle at V
  const maxT = 0.45 * Math.min(Math.hypot(P.x - V.x, P.y - V.y), Math.hypot(N.x - V.x, N.y - V.y));
  const tRaw = r / Math.tan(phi / 2);
  const t = Math.min(tRaw, maxT);
  const rEff = t * Math.tan(phi / 2);
  const arcAngle = Math.PI - phi;
  const k = (4 / 3) * Math.tan(arcAngle / 4) * rEff;
  const A = add(V, u1, t);
  const B = add(V, u2, t);
  const bis = unit(add(u1, u2));
  const center = add(V, bis, rEff / Math.sin(phi / 2));
  return {
    a: { position: A, handleIn: A, handleOut: add(A, u1, -k) },
    b: { position: B, handleIn: add(B, u2, -k), handleOut: B },
    extreme: { x: center.x + rEff, y: center.y + rEff },
  };
}

function toSpec(id: string, r: Resolved, continuity: AnchorSpec['continuity']): AnchorSpec {
  const din = sub(r.handleIn, r.position);
  const dout = sub(r.handleOut, r.position);
  return {
    id,
    featureId: FEATURE_OF[id],
    position: r.position,
    continuity,
    inAngleDeg: (Math.atan2(din.y, din.x) * 180) / Math.PI,
    outAngleDeg: (Math.atan2(dout.y, dout.x) * 180) / Math.PI,
    inLength: Math.hypot(din.x, din.y),
    outLength: Math.hypot(dout.x, dout.y),
  };
}

/**
 * Build the upper (bass) half of the outline from a sharp polygon
 * S(0,s) → T(tip) → C(crotch, on axis), then mirror for the lower half.
 * Returns resolved anchors keyed by id plus the rounded tip's extreme point.
 */
function buildHalf(params: Record<string, number>, T: Point): { byId: Record<string, Resolved>; extreme: Point } {
  const s = params.shoulderWidth / 2;
  const S = { x: 0, y: s };
  const Sm = mirrorY(S);
  const C = { x: params.notchDepth * params.bodyLength, y: 0 };
  const Tm = mirrorY(T);

  const sh = fillet(Sm, S, T, params.shoulderRadius);
  const tip = fillet(S, T, C, params.tipRadius);
  const cr = fillet(T, C, Tm, params.crotchRadius);

  const byId: Record<string, Resolved> = {
    upperShoulderFront: sh.a,
    upperShoulderOuter: sh.b,
    upperTipOuter: tip.a,
    upperTipInner: tip.b,
    crotchUpper: cr.a,
    crotchLower: cr.b,
  };
  return { byId, extreme: tip.extreme };
}

function buildAnchorSpecs(params: Record<string, number>): AnchorSpec[] {
  const L = params.bodyLength;
  const halfW = params.bodyWidth / 2;

  // Iterate the sharp tip vertex so the *rounded* tip lands exactly on
  // (bodyLength, bodyWidth/2). Converges in a few passes (fillet offset is
  // a smooth function of the tip angle).
  let T: Point = { x: L, y: halfW };
  let half = buildHalf(params, T);
  for (let i = 0; i < 6; i++) {
    T = { x: T.x + (L - half.extreme.x), y: T.y + (halfW - half.extreme.y) };
    half = buildHalf(params, T);
  }

  const upper = half.byId;
  const mirror = (r: Resolved): Resolved => ({
    position: mirrorY(r.position),
    handleIn: mirrorY(r.handleOut),
    handleOut: mirrorY(r.handleIn),
  });
  // Mirroring reverses traversal, so each lower anchor swaps in/out handles;
  // lowerTipInner is on the crotch-side edge, lowerTipOuter on the outer edge.
  const resolved: Record<string, Resolved> = {
    ...upper,
    lowerTipInner: mirror(upper.upperTipInner),
    lowerTipOuter: mirror(upper.upperTipOuter),
    lowerShoulderOuter: mirror(upper.upperShoulderOuter),
    lowerShoulderFront: mirror(upper.upperShoulderFront),
    neckJoint: { position: { x: 0, y: 0 }, handleIn: { x: 0, y: 0 }, handleOut: { x: 0, y: 0 } },
  };

  // Straight-edge handles: the zero-length placeholders left by fillet()
  // become 1/3 of the straight run to the neighbouring anchor (rendered as a
  // straight line since both ends' handles lie on the segment).
  const n = FULL_ORDER.length;
  for (let i = 0; i < n; i++) {
    const id = FULL_ORDER[i];
    const cur = resolved[id];
    const prev = resolved[FULL_ORDER[(i - 1 + n) % n]];
    const next = resolved[FULL_ORDER[(i + 1) % n]];
    if (cur.handleIn.x === cur.position.x && cur.handleIn.y === cur.position.y) {
      cur.handleIn = add(cur.position, sub(prev.position, cur.position), 1 / 3);
    }
    if (cur.handleOut.x === cur.position.x && cur.handleOut.y === cur.position.y) {
      cur.handleOut = add(cur.position, sub(next.position, cur.position), 1 / 3);
    }
  }

  const order = selectAnchorOrder(FULL_ORDER, PRIORITY, params.anchorCount);
  return order.map((id) => toSpec(id, resolved[id], 'corner'));
}

const V_NECK = { ...DEFAULT_NECK_PARAMS, neckLength: 470, neckInset: 60 };
const V_PICKUPS = { neck: 'humbucker', middle: 'none', bridge: 'humbucker' } as const;
const V_CONTROLS = { volumes: 2, tones: 1, selector: 'toggle' } as const;

export const FLYING_V_TEMPLATE: BodyTemplate = {
  id: 'flying-v',
  name: 'Flying-V-inspired',
  family: 'v',
  description: "Straight-edged wings with '58-style proportions: 424 mm tip-to-tip, rounded tips, shoulders and crotch.",
  defaultParams: DEFAULT_PARAMS,
  paramMeta: PARAM_META,
  buildAnchorSpecs,
  defaultNeckParams: V_NECK,
  presets: {
    pickups: V_PICKUPS,
    controls: V_CONTROLS,
    bridgeType: 'tom',
    headstockType: '3x3',
  },
  defaultHardware: buildHardwareDefaults({
    // Pocket mouth is the flat front edge (x = 0); heel sets `neckInset` deep.
    joinX: V_NECK.neckInset,
    neckParams: V_NECK,
    bridgeType: 'tom',
    pickupSettings: V_PICKUPS,
    controlSettings: V_CONTROLS,
    // Toggle rides the treble wing aft of the knobs, V-style.
    selectorOverride: { position: { x: 345, y: -118 }, rotation: 0 },
    neckBoltSpanX: 42,
    neckBoltSpanY: 16,
  }),
};
