// SG-inspired: double-cut solid body with pointed horns.
// Seed silhouette is the body path from Piemaster's CC0 "Gibson SG"
// Openclipart (#16718), rotated into Guitloft space and scaled to a
// 410 × 330 mm body. Feature sliders apply as deltas from the seed so the
// default outline stays the traced shape.
//
// Frame: x from the bass-horn tip toward the tail; +y is the bass side.
// The neck-pocket mouth sits ~45 mm behind the horn tip.

import type { Point } from '../types';
import type { BodyFeatureId } from '../bodyFeatures';
import type { AnchorSpec } from '../bodyEngine';
import { buildHardwareDefaults } from '../../state/hardwareDefaults';
import { DEFAULT_NECK_PARAMS } from '../neckParams';
import type { BodyTemplate, TemplateParamMeta } from './types';
import { selectAnchorOrder, MIN_BODY_ANCHORS } from './smoothLoop';

const PARAM_META: TemplateParamMeta[] = [
  { key: 'bodyLength', label: 'Body length', min: 400, max: 460, step: 1, unit: 'mm' },
  { key: 'bodyWidth', label: 'Body width', min: 290, max: 360, step: 1, unit: 'mm' },
  { key: 'anchorCount', label: 'Anchor points', min: MIN_BODY_ANCHORS, max: 15, step: 1, unit: 'count' },
  { key: 'forwardLean', label: 'Forward lean', min: -4, max: 10, step: 0.5, unit: 'deg' },
  { key: 'upperHornReach', label: 'Upper horn reach', min: 0, max: 70, step: 1, unit: 'mm', featureId: 'upperHorn' },
  { key: 'waistDepth', label: 'Waist depth', min: 0, max: 40, step: 1, unit: 'mm', featureId: 'rearWaist' },
  { key: 'waistPosition', label: 'Waist position', min: 0.32, max: 0.54, step: 0.01, unit: 'ratio', featureId: 'rearWaist' },
  { key: 'lowerBoutFullness', label: 'Lower bout fullness', min: 0.9, max: 1.08, step: 0.01, unit: 'ratio', featureId: 'lowerBassBout' },
  { key: 'hipCutoutDepth', label: 'Hip cutout depth', min: 0, max: 24, step: 1, unit: 'mm', featureId: 'hipContour' },
  { key: 'lowerHornReach', label: 'Lower horn reach', min: 0, max: 50, step: 1, unit: 'mm', featureId: 'lowerHornCutaway' },
];

const DEFAULT_PARAMS: Record<string, number> = {
  bodyLength: 410,
  bodyWidth: 330,
  anchorCount: 15,
  forwardLean: 0,
  upperHornReach: 45,
  waistDepth: 18,
  waistPosition: 0.43,
  lowerBoutFullness: 1,
  hipCutoutDepth: 8,
  lowerHornReach: 26,
};

interface SeedAnchor {
  position: Point;
  handleIn: Point;
  handleOut: Point;
  featureId: BodyFeatureId;
  corner?: boolean;
}

/** Absolute mm silhouette at DEFAULT_PARAMS body size (Piemaster body path). */
const SEED: Record<string, SeedAnchor> = {
  neckJoint: {
    position: { x: 45.396, y: 0.0 },
    handleIn: { x: 45.396, y: -24.0 },
    handleOut: { x: 45.396, y: 24.0 },
    featureId: 'neckTransition',
  },
  upperHornInner: {
    position: { x: 45.396, y: 35.36 },
    handleIn: { x: 45.396, y: 19.448 },
    handleOut: { x: 52.374, y: 46.798 },
    featureId: 'upperHorn',
    corner: true,
  },
  upperCutawayInner: {
    position: { x: 57.388, y: 75.354 },
    handleIn: { x: 66.173, y: 52.181 },
    handleOut: { x: 47.335, y: 101.9 },
    featureId: 'upperHorn',
  },
  upperHornTip: {
    position: { x: 0.0, y: 88.449 },
    handleIn: { x: 23.471, y: 96.424 },
    handleOut: { x: 2.522, y: 120.217 },
    featureId: 'upperHorn',
    corner: true,
  },
  upperBoutApex: {
    position: { x: 75.047, y: 150.036 },
    handleIn: { x: 37.398, y: 141.077 },
    handleOut: { x: 111.239, y: 158.648 },
    featureId: 'upperBout',
  },
  waistPoint: {
    position: { x: 176.857, y: 128.661 },
    handleIn: { x: 145.36, y: 143.126 },
    handleOut: { x: 200.574, y: 117.768 },
    featureId: 'rearWaist',
  },
  lowerBassBoutApex: {
    position: { x: 233.656, y: 142.86 },
    handleIn: { x: 221.122, y: 127.594 },
    handleOut: { x: 348.265, y: 223.188 },
    featureId: 'lowerBassBout',
  },
  tailPoint: {
    position: { x: 410.0, y: 23.496 },
    handleIn: { x: 402.059, y: 114.317 },
    handleOut: { x: 417.303, y: -74.162 },
    featureId: 'tail',
  },
  lowerTrebleBoutApex: {
    position: { x: 291.42, y: -179.964 },
    handleIn: { x: 404.899, y: -171.244 },
    handleOut: { x: 269.432, y: -181.655 },
    featureId: 'lowerTrebleBout',
  },
  hipContourPoint: {
    position: { x: 223.015, y: -141.553 },
    handleIn: { x: 246.026, y: -163.849 },
    handleOut: { x: 215.364, y: -134.132 },
    featureId: 'hipContour',
  },
  hipInner: {
    position: { x: 171.506, y: -140.258 },
    handleIn: { x: 208.051, y: -118.509 },
    handleOut: { x: 143.13, y: -157.147 },
    featureId: 'hipContour',
  },
  lowerHornShoulder: {
    position: { x: 103.576, y: -159.857 },
    handleIn: { x: 125.525, y: -160.485 },
    handleOut: { x: 78.507, y: -159.151 },
    featureId: 'lowerHornCutaway',
  },
  lowerHornTip: {
    position: { x: 19.694, y: -112.439 },
    handleIn: { x: 53.827, y: -152.08 },
    handleOut: { x: 35.807, y: -109.879 },
    featureId: 'lowerHornCutaway',
    corner: true,
  },
  lowerCutawayInner: {
    position: { x: 60.985, y: -88.386 },
    handleIn: { x: 53.553, y: -107.325 },
    handleOut: { x: 69.111, y: -67.697 },
    featureId: 'lowerHornCutaway',
  },
  lowerCutawayWall: {
    position: { x: 45.396, y: -35.36 },
    handleIn: { x: 60.3, y: -47.44 },
    handleOut: { x: 45.396, y: -19.448 },
    featureId: 'lowerHornCutaway',
    corner: true,
  },
};

const FULL_ORDER = [
  'neckJoint',
  'upperHornInner',
  'upperCutawayInner',
  'upperHornTip',
  'upperBoutApex',
  'waistPoint',
  'lowerBassBoutApex',
  'tailPoint',
  'lowerTrebleBoutApex',
  'hipContourPoint',
  'hipInner',
  'lowerHornShoulder',
  'lowerHornTip',
  'lowerCutawayInner',
  'lowerCutawayWall',
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
  'lowerCutawayInner',
  'upperCutawayInner',
  'lowerHornShoulder',
  'hipInner',
  'upperHornInner',
  'lowerCutawayWall',
];

function scalePoint(p: Point, sx: number, sy: number): Point {
  return { x: p.x * sx, y: p.y * sy };
}

function seedToSpec(id: string, seed: SeedAnchor, sx: number, sy: number): AnchorSpec {
  const position = scalePoint(seed.position, sx, sy);
  const handleIn = scalePoint(seed.handleIn, sx, sy);
  const handleOut = scalePoint(seed.handleOut, sx, sy);
  const inDx = handleIn.x - position.x;
  const inDy = handleIn.y - position.y;
  const outDx = handleOut.x - position.x;
  const outDy = handleOut.y - position.y;
  const outAngleDeg = (Math.atan2(outDy, outDx) * 180) / Math.PI;
  return {
    id,
    featureId: seed.featureId,
    position,
    continuity: seed.corner ? 'corner' : 'tangent',
    inAngleDeg: seed.corner ? (Math.atan2(inDy, inDx) * 180) / Math.PI : outAngleDeg + 180,
    outAngleDeg,
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
  const specs = order.map((id) => seedToSpec(id, SEED[id], sx, sy));
  const byId = new Map(specs.map((s) => [s.id, s]));

  const hornDx = -(params.upperHornReach - DEFAULT_PARAMS.upperHornReach) * sx;
  shiftX(byId.get('upperHornTip'), hornDx);
  shiftX(byId.get('upperCutawayInner'), hornDx * 0.45);
  shiftX(byId.get('upperHornInner'), hornDx * 0.15);

  const waist = byId.get('waistPoint');
  if (waist) {
    waist.position = {
      x: waist.position.x + (params.waistPosition - DEFAULT_PARAMS.waistPosition) * L,
      y: waist.position.y - (params.waistDepth - DEFAULT_PARAMS.waistDepth) * sy,
    };
  }

  const fScale = params.lowerBoutFullness / DEFAULT_PARAMS.lowerBoutFullness;
  for (const id of ['lowerBassBoutApex', 'lowerTrebleBoutApex', 'tailPoint'] as const) {
    const a = byId.get(id);
    if (a) a.position = { ...a.position, y: a.position.y * fScale };
  }

  const hipDy = (params.hipCutoutDepth - DEFAULT_PARAMS.hipCutoutDepth) * sy;
  shiftY(byId.get('hipContourPoint'), hipDy);
  shiftY(byId.get('hipInner'), hipDy * 0.6);

  const lowerDx = -(params.lowerHornReach - DEFAULT_PARAMS.lowerHornReach) * sx;
  shiftX(byId.get('lowerHornTip'), lowerDx);
  shiftX(byId.get('lowerHornShoulder'), lowerDx * 0.5);

  return specs;
}

/** 24.75" scale both sides; neckLength parks fret 22 at the heel / cutaway. */
const SG_NECK = {
  ...DEFAULT_NECK_PARAMS,
  bassScale: 628.65,
  trebleScale: 628.65,
  fretCount: 22,
  neckInset: 70,
  neckLength: 451,
};

const SG_PICKUPS = { neck: 'humbucker', middle: 'none', bridge: 'humbucker' } as const;
const SG_CONTROLS = { volumes: 2, tones: 2, selector: 'toggle' } as const;

export const SG_TEMPLATE: BodyTemplate = {
  id: 'sg',
  name: 'SG',
  family: 'classic',
  description:
    'Double-cut: pointed horns, thin waist, compact body. Two humbuckers, 2V/2T, treble-horn toggle, TOM, 3×3.',
  defaultParams: DEFAULT_PARAMS,
  paramMeta: PARAM_META,
  buildAnchorSpecs,
  defaultNeckParams: SG_NECK,
  presets: {
    pickups: SG_PICKUPS,
    controls: SG_CONTROLS,
    bridgeType: 'tom',
    headstockType: '3x3',
  },
  defaultHardware: buildHardwareDefaults({
    joinX: SEED.neckJoint.position.x + SG_NECK.neckInset,
    neckParams: SG_NECK,
    bridgeType: 'tom',
    pickupSettings: SG_PICKUPS,
    controlSettings: SG_CONTROLS,
    // Four-knob diamond on the lower treble bout.
    controlOverrides: [
      { x: 268, y: -62 },
      { x: 300, y: -78 },
      { x: 286, y: -98 },
      { x: 318, y: -114 },
    ],
    // Classic SG toggle sits in the root of the treble horn.
    selectorOverride: { position: { x: 88, y: -88 }, rotation: 0 },
  }),
};
