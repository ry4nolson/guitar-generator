// Les Paul-inspired: single-cut solid body.
// Seed silhouette is the body path from Piemaster's CC0 "Gibson Les Paul"
// Openclipart (#16769 / Wikimedia File:Gibson Les Paul.svg), rotated into
// Guitloft space and scaled to a 430 × 315 mm body. Feature sliders apply
// as deltas from the seed so the default outline stays the traced shape.
//
// Frame: x from the neck-pocket mouth toward the tail; +y is the bass side.

import type { Point } from '../types';
import type { BodyFeatureId } from '../bodyFeatures';
import type { AnchorSpec } from '../bodyEngine';
import { buildHardwareDefaults } from '../../state/hardwareDefaults';
import { DEFAULT_NECK_PARAMS } from '../neckParams';
import type { BodyTemplate, TemplateParamMeta } from './types';
import { selectAnchorOrder, MIN_BODY_ANCHORS } from './smoothLoop';

const PARAM_META: TemplateParamMeta[] = [
  { key: 'bodyLength', label: 'Body length', min: 400, max: 480, step: 1, unit: 'mm' },
  { key: 'bodyWidth', label: 'Body width', min: 290, max: 350, step: 1, unit: 'mm' },
  { key: 'anchorCount', label: 'Anchor points', min: MIN_BODY_ANCHORS, max: 16, step: 1, unit: 'count' },
  { key: 'forwardLean', label: 'Forward lean', min: -4, max: 10, step: 0.5, unit: 'deg' },
  { key: 'upperHornReach', label: 'Upper horn reach', min: 0, max: 40, step: 1, unit: 'mm', featureId: 'upperHorn' },
  { key: 'waistDepth', label: 'Waist depth', min: 0, max: 40, step: 1, unit: 'mm', featureId: 'rearWaist' },
  { key: 'waistPosition', label: 'Waist position', min: 0.28, max: 0.5, step: 0.01, unit: 'ratio', featureId: 'rearWaist' },
  { key: 'lowerBoutFullness', label: 'Lower bout fullness', min: 0.9, max: 1.08, step: 0.01, unit: 'ratio', featureId: 'lowerBassBout' },
  { key: 'hipCutoutDepth', label: 'Hip cutout depth', min: 0, max: 24, step: 1, unit: 'mm', featureId: 'hipContour' },
  { key: 'lowerHornReach', label: 'Cutaway reach', min: 0, max: 36, step: 1, unit: 'mm', featureId: 'lowerHornCutaway' },
];

const DEFAULT_PARAMS: Record<string, number> = {
  bodyLength: 430,
  bodyWidth: 315,
  anchorCount: 16,
  forwardLean: 0,
  upperHornReach: 16,
  waistDepth: 12,
  waistPosition: 0.35,
  lowerBoutFullness: 1,
  hipCutoutDepth: 6,
  lowerHornReach: 14,
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
    position: { x: 15.53, y: 0 },
    handleIn: { x: 15.53, y: -32 },
    handleOut: { x: 15.53, y: 32 },
    featureId: 'neckTransition',
  },
  upperHornInner: {
    position: { x: 31.964, y: 31.244 },
    handleIn: { x: 25.39, y: 18.74 },
    handleOut: { x: 26.871, y: 35.425 },
    featureId: 'upperHorn',
    corner: true,
  },
  upperHornShoulder: {
    position: { x: 14.448, y: 41.526 },
    handleIn: { x: 17.287, y: 35.86 },
    handleOut: { x: 8.086, y: 54.267 },
    featureId: 'upperHorn',
  },
  upperHornTip: {
    position: { x: 18.591, y: 82.0 },
    handleIn: { x: 13.257, y: 70.265 },
    handleOut: { x: 28.559, y: 102.594 },
    featureId: 'upperHorn',
  },
  upperBoutApex: {
    position: { x: 72.886, y: 108.119 },
    handleIn: { x: 49.059, y: 114.296 },
    handleOut: { x: 97.981, y: 101.606 },
    featureId: 'upperBout',
  },
  waistPoint: {
    position: { x: 151.911, y: 83.356 },
    handleIn: { x: 118.932, y: 82.594 },
    handleOut: { x: 187.643, y: 94.147 },
    featureId: 'rearWaist',
  },
  lowerBassBoutApex: {
    position: { x: 245.506, y: 140.79 },
    handleIn: { x: 212.793, y: 124.935 },
    handleOut: { x: 280.696, y: 157.853 },
    featureId: 'lowerBassBout',
  },
  tailShoulderBass: {
    position: { x: 362.413, y: 133.417 },
    handleIn: { x: 320.083, y: 162.368 },
    handleOut: { x: 390.657, y: 114.115 },
    featureId: 'tail',
  },
  tailPoint: {
    position: { x: 424.577, y: 49.314 },
    handleIn: { x: 412.772, y: 88.751 },
    handleOut: { x: 437.227, y: 6.912 },
    featureId: 'tail',
  },
  tailShoulderTreble: {
    position: { x: 429.724, y: -78.632 },
    handleIn: { x: 438.0, y: -35.361 },
    handleOut: { x: 418.21, y: -138.871 },
    featureId: 'tail',
  },
  lowerTrebleBoutApex: {
    position: { x: 333.303, y: -173.995 },
    handleIn: { x: 375.526, y: -158.549 },
    handleOut: { x: 263.098, y: -199.648 },
    featureId: 'lowerTrebleBout',
  },
  hipContourPoint: {
    position: { x: 175.31, y: -118.152 },
    handleIn: { x: 220.927, y: -149.991 },
    handleOut: { x: 139.718, y: -93.321 },
    featureId: 'hipContour',
  },
  lowerHornShoulder: {
    position: { x: 112.487, y: -108.749 },
    handleIn: { x: 136.553, y: -104.95 },
    handleOut: { x: 79.733, y: -129.267 },
    featureId: 'lowerHornCutaway',
  },
  lowerHornTip: {
    position: { x: 43.233, y: -116.987 },
    handleIn: { x: 57.938, y: -129.701 },
    handleOut: { x: 70.885, y: -84.842 },
    featureId: 'lowerHornCutaway',
  },
  lowerCutawayInner: {
    position: { x: 40.154, y: -39.723 },
    handleIn: { x: 88.707, y: -54.892 },
    handleOut: { x: 27.959, y: -38.913 },
    featureId: 'lowerHornCutaway',
  },
  lowerCutawayWall: {
    position: { x: 0, y: -29.542 },
    handleIn: { x: 14.53, y: -33.957 },
    handleOut: { x: 6.21, y: -17.73 },
    featureId: 'lowerHornCutaway',
    corner: true,
  },
};

const FULL_ORDER = [
  'neckJoint',
  'upperHornInner',
  'upperHornShoulder',
  'upperHornTip',
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
  'upperHornShoulder',
  'lowerHornShoulder',
  'tailShoulderBass',
  'tailShoulderTreble',
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
  shiftX(byId.get('upperHornShoulder'), hornDx * 0.55);
  shiftX(byId.get('upperHornInner'), hornDx * 0.2);

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
  shiftX(byId.get('lowerHornShoulder'), lowerDx * 0.45);

  return specs;
}

/** 24.75" scale both sides; neckLength parks fret 22 at the heel / cutaway. */
const LP_NECK = {
  ...DEFAULT_NECK_PARAMS,
  bassScale: 628.65,
  trebleScale: 628.65,
  fretCount: 22,
  neckInset: 70,
  neckLength: 451,
};

const LP_PICKUPS = { neck: 'humbucker', middle: 'none', bridge: 'humbucker' } as const;
const LP_CONTROLS = { volumes: 2, tones: 2, selector: 'toggle' } as const;

export const LES_PAUL_TEMPLATE: BodyTemplate = {
  id: 'les-paul',
  name: 'LP',
  family: 'classic',
  description:
    'Single-cut: rounded upper bout, Venetian cutaway, carved waist. Two humbuckers, 2V/2T, toggle, TOM, 3×3.',
  defaultParams: DEFAULT_PARAMS,
  paramMeta: PARAM_META,
  buildAnchorSpecs,
  defaultNeckParams: LP_NECK,
  presets: {
    pickups: LP_PICKUPS,
    controls: LP_CONTROLS,
    bridgeType: 'tom',
    headstockType: '3x3',
  },
  defaultHardware: buildHardwareDefaults({
    joinX: SEED.neckJoint.position.x + LP_NECK.neckInset,
    neckParams: LP_NECK,
    bridgeType: 'tom',
    pickupSettings: LP_PICKUPS,
    controlSettings: LP_CONTROLS,
    // Classic four-knob diamond on the lower treble bout.
    controlOverrides: [
      { x: 288, y: -56 },
      { x: 326, y: -70 },
      { x: 306, y: -98 },
      { x: 344, y: -112 },
    ],
    selectorOverride: { position: { x: 92, y: 78 }, rotation: 0 },
  }),
};
