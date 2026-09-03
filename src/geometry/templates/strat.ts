// Strat-inspired: offset double-cutaway solid body.
// Seed silhouette traced from a straight-on photo of a standard replacement
// body (461 × 324 mm class), fitted with G1 cubic Béziers at 16 feature
// anchors (max deviation from the traced edge ≈ 2.6 mm). Body param sliders
// apply as deltas from the seed so the default outline is the traced shape,
// not a re-smoothed Catmull-Rom loop.
//
// Frame: x runs from the upper-horn tip (x = 0) toward the tail (x ≈ L);
// +y is the bass side. The neck pocket mouth sits ~66 mm behind the horn tip.

import type { Point } from '../types';
import type { BodyFeatureId } from '../bodyFeatures';
import type { AnchorSpec } from '../bodyEngine';
import { buildHardwareDefaults } from '../../state/hardwareDefaults';
import { DEFAULT_NECK_PARAMS } from '../neckParams';
import type { BodyTemplate, TemplateParamMeta } from './types';
import { selectAnchorOrder, MIN_BODY_ANCHORS } from './smoothLoop';

const PARAM_META: TemplateParamMeta[] = [
  { key: 'bodyLength', label: 'Body length', min: 420, max: 500, step: 1, unit: 'mm' },
  { key: 'bodyWidth', label: 'Body width', min: 300, max: 350, step: 1, unit: 'mm' },
  { key: 'anchorCount', label: 'Anchor points', min: MIN_BODY_ANCHORS, max: 16, step: 1, unit: 'count' },
  { key: 'forwardLean', label: 'Forward lean', min: -4, max: 10, step: 0.5, unit: 'deg' },
  { key: 'upperHornReach', label: 'Upper horn reach', min: 30, max: 100, step: 1, unit: 'mm', featureId: 'upperHorn' },
  { key: 'waistDepth', label: 'Waist depth', min: 30, max: 90, step: 1, unit: 'mm', featureId: 'rearWaist' },
  { key: 'waistPosition', label: 'Waist position', min: 0.38, max: 0.56, step: 0.01, unit: 'ratio', featureId: 'rearWaist' },
  { key: 'lowerBoutFullness', label: 'Lower bout fullness', min: 0.92, max: 1.1, step: 0.01, unit: 'ratio', featureId: 'lowerBassBout' },
  { key: 'hipCutoutDepth', label: 'Hip cutout depth', min: 20, max: 70, step: 1, unit: 'mm', featureId: 'hipContour' },
  { key: 'lowerHornReach', label: 'Lower horn reach', min: -20, max: 40, step: 1, unit: 'mm', featureId: 'lowerHornCutaway' },
];

const DEFAULT_PARAMS: Record<string, number> = {
  bodyLength: 463,
  bodyWidth: 324,
  anchorCount: 16,
  forwardLean: 0,
  upperHornReach: 66,
  waistDepth: 59,
  waistPosition: 0.45,
  lowerBoutFullness: 1,
  hipCutoutDepth: 43,
  lowerHornReach: 0,
};

interface SeedAnchor {
  position: Point;
  handleIn: Point;
  handleOut: Point;
  featureId: BodyFeatureId;
}

/** Absolute mm silhouette at DEFAULT_PARAMS body size (traced). */
const SEED: Record<string, SeedAnchor> = {
  neckJoint: {
    position: { x: 66.009, y: 0 },
    handleIn: { x: 66.009, y: -37.071 },
    handleOut: { x: 66.009, y: 29.484 },
    featureId: 'neckTransition',
  },
  upperCutawayInner: {
    position: { x: 86.31, y: 43.624 },
    handleIn: { x: 86.737, y: 14.111 },
    handleOut: { x: 85.314, y: 112.424 },
    featureId: 'upperHorn',
  },
  upperHornTip: {
    position: { x: 0, y: 109.306 },
    handleIn: { x: -0.148, y: 68.355 },
    handleOut: { x: 0.06, y: 125.867 },
    featureId: 'upperHorn',
  },
  upperHornShoulder: {
    position: { x: 33.707, y: 135.774 },
    handleIn: { x: 20.78, y: 132.647 },
    handleOut: { x: 43.313, y: 138.098 },
    featureId: 'upperHorn',
  },
  upperBoutApex: {
    position: { x: 63.2, y: 139.696 },
    handleIn: { x: 53.316, y: 139.97 },
    handleOut: { x: 115.958, y: 138.231 },
    featureId: 'upperBout',
  },
  waistPoint: {
    position: { x: 209.263, y: 102.934 },
    handleIn: { x: 160.988, y: 101.785 },
    handleOut: { x: 258.753, y: 104.111 },
    featureId: 'rearWaist',
  },
  lowerBassBoutApex: {
    position: { x: 361.88, y: 149.454 },
    handleIn: { x: 305.162, y: 150.804 },
    handleOut: { x: 400.751, y: 148.529 },
    featureId: 'lowerBassBout',
  },
  tailShoulderBass: {
    position: { x: 449.296, y: 77.445 },
    handleIn: { x: 434.514, y: 108.636 },
    handleOut: { x: 463.97, y: 46.483 },
    featureId: 'tail',
  },
  tailPoint: {
    position: { x: 462.83, y: -41.664 },
    handleIn: { x: 462.954, y: -7.356 },
    handleOut: { x: 462.713, y: -74.003 },
    featureId: 'tail',
  },
  tailShoulderTreble: {
    position: { x: 435.507, y: -146.38 },
    handleIn: { x: 457.571, y: -121.591 },
    handleOut: { x: 415.505, y: -168.852 },
    featureId: 'tail',
  },
  lowerTrebleBoutApex: {
    position: { x: 367.498, y: -174.23 },
    handleIn: { x: 396.781, y: -174.694 },
    handleOut: { x: 308.942, y: -173.301 },
    featureId: 'lowerTrebleBout',
  },
  hipContourPoint: {
    position: { x: 217.222, y: -131.363 },
    handleIn: { x: 260.671, y: -130.329 },
    handleOut: { x: 181.651, y: -132.209 },
    featureId: 'hipContour',
  },
  lowerHornShoulder: {
    position: { x: 113.76, y: -162.065 },
    handleIn: { x: 153.662, y: -162.223 },
    handleOut: { x: 99.435, y: -162.008 },
    featureId: 'lowerHornCutaway',
  },
  lowerHornTip: {
    position: { x: 67.882, y: -137.735 },
    handleIn: { x: 68.149, y: -156.202 },
    handleOut: { x: 67.392, y: -103.897 },
    featureId: 'lowerHornCutaway',
  },
  lowerCutawayInner: {
    position: { x: 135.295, y: -70.583 },
    handleIn: { x: 137.27, y: -131.225 },
    handleOut: { x: 134.304, y: -40.148 },
    featureId: 'lowerHornCutaway',
  },
  lowerCutawayWall: {
    position: { x: 96.439, y: -41.173 },
    handleIn: { x: 120.501, y: -41.173 },
    handleOut: { x: 56.529, y: -41.173 },
    featureId: 'lowerHornCutaway',
  },
};

const FULL_ORDER = [
  'neckJoint',
  'upperCutawayInner',
  'upperHornTip',
  'upperHornShoulder',
  'upperBoutApex',
  'waistPoint',
  'lowerBassBoutApex',
  'tailShoulderBass',
  'tailPoint',
  'tailShoulderTreble',
  'lowerTrebleBoutApex',
  'hipContourPoint',
  'lowerHornShoulder',
  'lowerHornTip',
  'lowerCutawayInner',
  'lowerCutawayWall',
];

// Reduced-count survival order: 4-point skeleton, then the horns (the
// offset double cutaway is the Strat's identity), then waist/bout refinement,
// then shoulders and cutaway detail.
const PRIORITY = [
  'neckJoint',
  'upperBoutApex',
  'tailPoint',
  'lowerTrebleBoutApex',
  'upperHornTip',
  'lowerHornTip',
  'waistPoint',
  'lowerBassBoutApex',
  'hipContourPoint',
  'lowerCutawayInner',
  'upperCutawayInner',
  'upperHornShoulder',
  'lowerHornShoulder',
  'tailShoulderBass',
  'tailShoulderTreble',
  'lowerCutawayWall',
];

function scalePoint(p: Point, sx: number, sy: number): Point {
  return { x: p.x * sx, y: p.y * sy };
}

function seedToTangentSpec(id: string, seed: SeedAnchor, sx: number, sy: number): AnchorSpec {
  const position = scalePoint(seed.position, sx, sy);
  const handleIn = scalePoint(seed.handleIn, sx, sy);
  const handleOut = scalePoint(seed.handleOut, sx, sy);
  const inDx = handleIn.x - position.x;
  const inDy = handleIn.y - position.y;
  const outDx = handleOut.x - position.x;
  const outDy = handleOut.y - position.y;
  return {
    id,
    featureId: seed.featureId,
    position,
    continuity: 'tangent',
    inAngleDeg: (Math.atan2(inDy, inDx) * 180) / Math.PI,
    outAngleDeg: (Math.atan2(outDy, outDx) * 180) / Math.PI,
    inLength: Math.hypot(inDx, inDy),
    outLength: Math.hypot(outDx, outDy),
  };
}

function shiftX(spec: AnchorSpec | undefined, dx: number) {
  if (spec && dx !== 0) spec.position = { ...spec.position, x: spec.position.x + dx };
}

function shiftY(spec: AnchorSpec | undefined, dy: number) {
  if (spec && dy !== 0) spec.position = { ...spec.position, y: spec.position.y + dy };
}

function buildAnchorSpecs(params: Record<string, number>): AnchorSpec[] {
  const L0 = DEFAULT_PARAMS.bodyLength;
  const W0 = DEFAULT_PARAMS.bodyWidth;
  const sx = params.bodyLength / L0;
  const sy = params.bodyWidth / W0;
  const L = params.bodyLength;

  const order = selectAnchorOrder(FULL_ORDER, PRIORITY, params.anchorCount);
  const specs = order.map((id) => seedToTangentSpec(id, SEED[id], sx, sy));
  const byId = new Map(specs.map((s) => [s.id, s]));

  // Feature sliders apply as deltas from the seeded defaults (isolation-friendly).
  const hornDx = -(params.upperHornReach - DEFAULT_PARAMS.upperHornReach) * sx;
  shiftX(byId.get('upperHornTip'), hornDx);
  shiftX(byId.get('upperHornShoulder'), hornDx * 0.55);
  shiftX(byId.get('upperCutawayInner'), hornDx * 0.15);

  const waist = byId.get('waistPoint');
  if (waist) {
    waist.position = {
      x: waist.position.x + (params.waistPosition - DEFAULT_PARAMS.waistPosition) * L,
      y: waist.position.y - (params.waistDepth - DEFAULT_PARAMS.waistDepth) * sy,
    };
  }

  const fScale = params.lowerBoutFullness / DEFAULT_PARAMS.lowerBoutFullness;
  for (const id of ['lowerBassBoutApex', 'lowerTrebleBoutApex', 'tailShoulderBass', 'tailShoulderTreble'] as const) {
    const a = byId.get(id);
    if (a) a.position = { ...a.position, y: a.position.y * fScale };
  }

  shiftY(byId.get('hipContourPoint'), (params.hipCutoutDepth - DEFAULT_PARAMS.hipCutoutDepth) * sy);

  const lowerDx = -(params.lowerHornReach - DEFAULT_PARAMS.lowerHornReach) * sx;
  shiftX(byId.get('lowerHornTip'), lowerDx);
  shiftX(byId.get('lowerHornShoulder'), lowerDx * 0.5);

  return specs;
}

/** Real Strat pockets are ~3" deep; the pocket mouth is the neckJoint anchor. */
const STRAT_NECK = { ...DEFAULT_NECK_PARAMS, neckInset: 70 };

export const STRAT_TEMPLATE: BodyTemplate = {
  id: 'strat',
  name: 'Strat-inspired',
  family: 'classic',
  description: 'Traced offset double cutaway: long bass horn, deep treble cutaway, sculpted waist, flowing lower bout.',
  defaultParams: DEFAULT_PARAMS,
  paramMeta: PARAM_META,
  buildAnchorSpecs,
  defaultNeckParams: STRAT_NECK,
  presets: {
    pickups: { neck: 'single-coil', middle: 'single-coil', bridge: 'single-coil' },
    controls: { volumes: 1, tones: 2, selector: 'blade-5' },
    bridgeType: 'strat-tremolo',
    headstockType: 'paddle',
  },
  defaultHardware: buildHardwareDefaults({
    joinX: SEED.neckJoint.position.x + STRAT_NECK.neckInset,
    neckParams: STRAT_NECK,
    bridgeType: 'strat-tremolo',
    pickupSettings: { neck: 'single-coil', middle: 'single-coil', bridge: 'single-coil' },
    controlSettings: { volumes: 1, tones: 2, selector: 'blade-5' },
    // Classic slanted bridge single coil (treble side toward the bridge).
    pickupRotations: [0, 0, 10],
  }),
};
