// Tele-inspired: compact single-cut solid body.
// Seed silhouette authored from fretforge-design.json (traced reference), then
// morphable via the usual body param sliders. Handles are stored as tangent
// specs so the default outline matches the saved design, not a re-smoothed loop.

import type { Point } from '../types';
import type { BodyFeatureId } from '../bodyFeatures';
import type { AnchorSpec } from '../bodyEngine';
import type { HardwareState } from '../../state/hardwareDefaults';
import type { BodyTemplate, TemplateParamMeta } from './types';
import { selectAnchorOrder, MIN_BODY_ANCHORS } from './smoothLoop';
import { DEFAULT_NECK_PARAMS } from '../neckParams';

const PARAM_META: TemplateParamMeta[] = [
  { key: 'bodyLength', label: 'Body length', min: 400, max: 460, step: 1, unit: 'mm' },
  { key: 'bodyWidth', label: 'Body width', min: 300, max: 350, step: 1, unit: 'mm' },
  { key: 'anchorCount', label: 'Anchor points', min: MIN_BODY_ANCHORS, max: 13, step: 1, unit: 'count' },
  { key: 'forwardLean', label: 'Forward lean', min: -4, max: 10, step: 0.5, unit: 'deg' },
  { key: 'upperHornReach', label: 'Upper horn reach', min: 0, max: 45, step: 1, unit: 'mm', featureId: 'upperHorn' },
  { key: 'waistDepth', label: 'Waist depth', min: 0, max: 28, step: 1, unit: 'mm', featureId: 'rearWaist' },
  { key: 'waistPosition', label: 'Waist position', min: 0.42, max: 0.58, step: 0.01, unit: 'ratio', featureId: 'rearWaist' },
  { key: 'lowerBoutFullness', label: 'Lower bout fullness', min: 0.9, max: 1.06, step: 0.01, unit: 'ratio', featureId: 'lowerBassBout' },
  { key: 'hipCutoutDepth', label: 'Hip cutout depth', min: 0, max: 16, step: 1, unit: 'mm', featureId: 'hipContour' },
  { key: 'lowerHornReach', label: 'Lower cutaway reach', min: 0, max: 28, step: 1, unit: 'mm', featureId: 'lowerHornCutaway' },
];

const DEFAULT_PARAMS: Record<string, number> = {
  bodyLength: 430,
  bodyWidth: 324,
  anchorCount: 13,
  forwardLean: 0,
  upperHornReach: 22,
  waistDepth: 12,
  waistPosition: 0.5,
  lowerBoutFullness: 0.97,
  hipCutoutDepth: 3,
  lowerHornReach: 12,
};

interface SeedAnchor {
  position: Point;
  handleIn: Point;
  handleOut: Point;
  featureId: BodyFeatureId;
}

/** Absolute mm silhouette at DEFAULT_PARAMS body size (from fretforge-design.json). */
const SEED: Record<string, SeedAnchor> = {
  neckJoint: {
    position: { x: 49.693, y: -9.506 },
    handleIn: { x: 51.381, y: -22.578 },
    handleOut: { x: 46.915, y: 12 },
    featureId: 'neckTransition',
  },
  upperHornTip: {
    position: { x: 56.562, y: 30.856 },
    handleIn: { x: 92.028, y: -22.492 },
    handleOut: { x: 21.096, y: 84.205 },
    featureId: 'upperHorn',
  },
  upperHornShoulder: {
    position: { x: 45.455, y: 129.541 },
    handleIn: { x: 30.026, y: 122.458 },
    handleOut: { x: 57.413, y: 135.031 },
    featureId: 'upperHorn',
  },
  upperBoutApex: {
    position: { x: 109.977, y: 140.854 },
    handleIn: { x: 73.112, y: 146.119 },
    handleOut: { x: 146.842, y: 135.589 },
    featureId: 'upperBout',
  },
  waistPoint: {
    position: { x: 210.123, y: 115.587 },
    handleIn: { x: 174.883, y: 100.925 },
    handleOut: { x: 245.363, y: 130.248 },
    featureId: 'rearWaist',
  },
  lowerBassBoutApex: {
    position: { x: 361.41, y: 159.027 },
    handleIn: { x: 318.816, y: 170.145 },
    handleOut: { x: 404.003, y: 147.908 },
    featureId: 'lowerBassBout',
  },
  tailShoulderBass: {
    position: { x: 428.553, y: 89.506 },
    handleIn: { x: 420.324, y: 114.095 },
    handleOut: { x: 436.783, y: 64.916 },
    featureId: 'tail',
  },
  tailPoint: {
    position: { x: 435.561, y: 1.102 },
    handleIn: { x: 435.561, y: 14.112 },
    handleOut: { x: 435.561, y: -11.333 },
    featureId: 'tail',
  },
  tailShoulderTreble: {
    position: { x: 429, y: -82.904 },
    handleIn: { x: 439.452, y: -42.9 },
    handleOut: { x: 418.549, y: -122.908 },
    featureId: 'tail',
  },
  lowerTrebleBoutApex: {
    position: { x: 344.606, y: -157.111 },
    handleIn: { x: 403.699, y: -141.187 },
    handleOut: { x: 285.514, y: -173.035 },
    featureId: 'lowerTrebleBout',
  },
  hipContourPoint: {
    position: { x: 175.119, y: -118.886 },
    handleIn: { x: 215.761, y: -106.812 },
    handleOut: { x: 134.477, y: -130.961 },
    featureId: 'hipContour',
  },
  lowerHornShoulder: {
    position: { x: 41.96, y: -118.337 },
    handleIn: { x: 45.979, y: -158.019 },
    handleOut: { x: 37.942, y: -78.656 },
    featureId: 'lowerHornCutaway',
  },
  lowerHornTip: {
    position: { x: 107.269, y: -61.833 },
    handleIn: { x: 110.192, y: -119.309 },
    handleOut: { x: 104.346, y: -4.356 },
    featureId: 'lowerHornCutaway',
  },
};

const FULL_ORDER = [
  'neckJoint',
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
];

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
  'upperHornShoulder',
  'lowerHornShoulder',
  'tailShoulderBass',
  'tailShoulderTreble',
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
  const horn = byId.get('upperHornTip');
  if (horn) {
    horn.position = {
      ...horn.position,
      x: horn.position.x - ((params.upperHornReach - DEFAULT_PARAMS.upperHornReach) / 22) * 18 * sx,
    };
  }

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

  const hip = byId.get('hipContourPoint');
  if (hip) {
    hip.position = {
      ...hip.position,
      y: hip.position.y + (params.hipCutoutDepth - DEFAULT_PARAMS.hipCutoutDepth) * sy,
    };
  }

  const lowerTip = byId.get('lowerHornTip');
  if (lowerTip) {
    const dCut = ((params.lowerHornReach - DEFAULT_PARAMS.lowerHornReach) / 12) * 14 * sy;
    lowerTip.position = { ...lowerTip.position, y: lowerTip.position.y - dCut * 0.3 };
  }

  return specs;
}

const TELE_NECK = { ...DEFAULT_NECK_PARAMS };

/** Hardware layout from fretforge-design.json (matches the seeded body + neck). */
const TELE_HARDWARE: HardwareState = {
  pickups: [
    // Heel ends at 104.7; leave >20 mm of wood past the pocket route overhang.
    { x: 142.693, y: 0, rotation: 0, visible: true, locked: false },
    { x: 191.043, y: 0, rotation: 0, visible: false, locked: false },
    { x: 247.393, y: 0, rotation: 0, visible: true, locked: false },
  ],
  controls: [
    { x: 306.581, y: -90.617, rotation: 0, visible: true, locked: false },
    { x: 350.906, y: -90.725, rotation: 0, visible: true, locked: false },
  ],
  selector: { x: 267.068, y: -92.266, rotation: 90, visible: true, locked: false },
  saddles: [
    { x: 280.692, y: -26.25, rotation: 0, visible: true, locked: false },
    { x: 283.332, y: -15.75, rotation: 0, visible: true, locked: false },
    { x: 285.972, y: -5.25, rotation: 0, visible: true, locked: false },
    { x: 288.613, y: 5.25, rotation: 0, visible: true, locked: false },
    { x: 291.253, y: 15.75, rotation: 0, visible: true, locked: false },
    { x: 293.893, y: 26.25, rotation: 0, visible: true, locked: false },
  ],
  neckBolts: [
    { x: 94.693, y: 19, rotation: 0, visible: true, locked: false },
    { x: 94.693, y: -19, rotation: 0, visible: true, locked: false },
    { x: 52.693, y: 19, rotation: 0, visible: true, locked: false },
    { x: 52.693, y: -19, rotation: 0, visible: true, locked: false },
  ],
  tuners: [],
};

export const TELE_TEMPLATE: BodyTemplate = {
  id: 'tele',
  name: 'Tele-inspired',
  family: 'classic',
  description: 'Traced compact single-cut: rounded upper bout, modest horn, shallow waist, broad lower bout.',
  defaultParams: DEFAULT_PARAMS,
  paramMeta: PARAM_META,
  buildAnchorSpecs,
  defaultNeckParams: TELE_NECK,
  presets: {
    pickups: { neck: 'single-coil', middle: 'none', bridge: 'single-coil' },
    controls: { volumes: 1, tones: 1, selector: 'blade-3' },
    bridgeType: 'tele-ashtray',
    headstockType: 'tele',
  },
  defaultHardware: structuredClone(TELE_HARDWARE),
};
