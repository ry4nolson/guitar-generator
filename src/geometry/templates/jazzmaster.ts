// Jazzmaster-inspired: offset double-cut with rounded lobes, not S-style horns.
// Seed is a G1 cubic fit to the red outline on the user's technical grid
// drawing (tail-left, neck-right). The pocket U is replaced with a flat
// mouth at neckJoint; Guitloft draws the pocket overlay separately.
// Feature sliders apply as deltas from the seed.
//
// Frame: +x toward the tail; +y is the bass side.

import type { Point } from '../types';
import type { BodyFeatureId } from '../bodyFeatures';
import type { AnchorSpec } from '../bodyEngine';
import { buildHardwareDefaults } from '../../state/hardwareDefaults';
import { DEFAULT_NECK_PARAMS } from '../neckParams';
import type { BodyTemplate, TemplateParamMeta } from './types';
import { selectAnchorOrder, MIN_BODY_ANCHORS } from './smoothLoop';

const PARAM_META: TemplateParamMeta[] = [
  { key: 'bodyLength', label: 'Body length', min: 440, max: 520, step: 1, unit: 'mm' },
  { key: 'bodyWidth', label: 'Body width', min: 320, max: 360, step: 1, unit: 'mm' },
  { key: 'anchorCount', label: 'Anchor points', min: MIN_BODY_ANCHORS, max: 16, step: 1, unit: 'count' },
  { key: 'forwardLean', label: 'Forward lean', min: -4, max: 10, step: 0.5, unit: 'deg' },
  { key: 'upperHornReach', label: 'Upper lobe reach', min: 0, max: 55, step: 1, unit: 'mm', featureId: 'upperHorn' },
  { key: 'waistDepth', label: 'Waist depth', min: 15, max: 70, step: 1, unit: 'mm', featureId: 'rearWaist' },
  { key: 'waistPosition', label: 'Waist position', min: 0.4, max: 0.58, step: 0.01, unit: 'ratio', featureId: 'rearWaist' },
  { key: 'lowerBoutFullness', label: 'Lower bout fullness', min: 0.92, max: 1.1, step: 0.01, unit: 'ratio', featureId: 'lowerBassBout' },
  { key: 'hipCutoutDepth', label: 'Hip cutout depth', min: 10, max: 55, step: 1, unit: 'mm', featureId: 'hipContour' },
  { key: 'lowerHornReach', label: 'Lower lobe reach', min: -30, max: 40, step: 1, unit: 'mm', featureId: 'lowerHornCutaway' },
];

const DEFAULT_PARAMS: Record<string, number> = {
  bodyLength: 478,
  bodyWidth: 356,
  anchorCount: 16,
  forwardLean: 0,
  upperHornReach: 28,
  waistDepth: 40,
  waistPosition: 0.49,
  lowerBoutFullness: 1,
  hipCutoutDepth: 34,
  lowerHornReach: 0,
};

interface SeedAnchor {
  position: Point;
  handleIn: Point;
  handleOut: Point;
  featureId: BodyFeatureId;
  corner?: boolean;
}

/** Absolute mm silhouette at DEFAULT_PARAMS body size (traced red outline). */
const SEED: Record<string, SeedAnchor> = {
  neckJoint: {
    position: { x: 0, y: 0 },
    handleIn: { x: 0, y: -30 },
    handleOut: { x: 0, y: 30 },
    featureId: 'neckTransition',
    corner: true,
  },
  upperCutawayInner: {
    position: { x: 0, y: 29.67 },
    handleIn: { x: 2.77, y: 20.28 },
    handleOut: { x: -4.2, y: 43.89 },
    featureId: 'upperHorn',
    corner: true,
  },
  upperHornTip: {
    position: { x: -17.17, y: 71.2 },
    handleIn: { x: -15.92, y: 56.42 },
    handleOut: { x: -19.13, y: 94.4 },
    featureId: 'upperHorn',
  },
  upperHornShoulder: {
    position: { x: 9.66, y: 136.47 },
    handleIn: { x: -13.29, y: 140.43 },
    handleOut: { x: 27.18, y: 133.44 },
    featureId: 'upperHorn',
  },
  upperBoutApex: {
    position: { x: 62.23, y: 124.6 },
    handleIn: { x: 50.4, y: 111.32 },
    handleOut: { x: 72.5, y: 136.14 },
    featureId: 'upperBout',
  },
  waistPoint: {
    position: { x: 108.36, y: 116.69 },
    handleIn: { x: 92.92, y: 116.24 },
    handleOut: { x: 175.4, y: 118.62 },
    featureId: 'rearWaist',
  },
  lowerBassBoutApex: {
    position: { x: 301.49, y: 179.98 },
    handleIn: { x: 234.66, y: 185.58 },
    handleOut: { x: 341.82, y: 176.6 },
    featureId: 'lowerBassBout',
  },
  tailShoulderBass: {
    position: { x: 410.92, y: 124.6 },
    handleIn: { x: 391.3, y: 160 },
    handleOut: { x: 442.73, y: 67.22 },
    featureId: 'tail',
  },
  tailPoint: {
    position: { x: 459.2, y: -68.23 },
    handleIn: { x: 459.2, y: -2.63 },
    handleOut: { x: 459.2, y: -96.42 },
    featureId: 'tail',
  },
  tailShoulderTreble: {
    position: { x: 435.6, y: -150.31 },
    handleIn: { x: 459.73, y: -135.74 },
    handleOut: { x: 416.58, y: -161.8 },
    featureId: 'tail',
  },
  lowerTrebleBoutApex: {
    position: { x: 373.37, y: -176.02 },
    handleIn: { x: 395.58, y: -175.38 },
    handleOut: { x: 315.01, y: -177.7 },
    featureId: 'lowerTrebleBout',
  },
  hipContourPoint: {
    position: { x: 206, y: -118.67 },
    handleIn: { x: 264.36, y: -117.08 },
    handleOut: { x: 166.57, y: -119.74 },
    featureId: 'hipContour',
  },
  lowerHornShoulder: {
    position: { x: 89.05, y: -143.39 },
    handleIn: { x: 128.43, y: -145.66 },
    handleOut: { x: 67.66, y: -142.16 },
    featureId: 'lowerHornCutaway',
  },
  lowerHornTip: {
    position: { x: 35.41, y: -106.8 },
    handleIn: { x: 33.47, y: -128.14 },
    handleOut: { x: 36.9, y: -90.41 },
    featureId: 'lowerHornCutaway',
  },
  lowerCutawayInner: {
    position: { x: 41.84, y: -57.36 },
    handleIn: { x: 47.79, y: -72.7 },
    handleOut: { x: 35.86, y: -41.92 },
    featureId: 'lowerHornCutaway',
  },
  lowerCutawayWall: {
    position: { x: 0, y: -29.67 },
    handleIn: { x: 10.34, y: -42.6 },
    handleOut: { x: -6.11, y: -22.02 },
    featureId: 'lowerHornCutaway',
    corner: true,
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
  const specs = order.map((id) => seedToTangentSpec(id, SEED[id], sx, sy));
  const byId = new Map(specs.map((s) => [s.id, s]));

  const lobeDx = -(params.upperHornReach - DEFAULT_PARAMS.upperHornReach) * sx;
  shiftX(byId.get('upperHornTip'), lobeDx);
  shiftX(byId.get('upperHornShoulder'), lobeDx * 0.45);
  shiftX(byId.get('upperCutawayInner'), lobeDx * 0.12);

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

/** 25.5" scale; 21 frets with neckLength parked at the last fret / cutaway. */
const JM_NECK = {
  ...DEFAULT_NECK_PARAMS,
  bassScale: 647.7,
  trebleScale: 647.7,
  fretCount: 21,
  neckInset: 70,
  neckLength: 452,
};

const JM_PICKUPS = { neck: 'single-coil', middle: 'none', bridge: 'single-coil' } as const;
const JM_CONTROLS = { volumes: 2, tones: 2, selector: 'blade-3' } as const;

const JM_HARDWARE = buildHardwareDefaults({
  joinX: SEED.neckJoint.position.x + JM_NECK.neckInset,
  neckParams: JM_NECK,
  bridgeType: 'strat-tremolo',
  pickupSettings: JM_PICKUPS,
  controlSettings: JM_CONTROLS,
  // Jazzmaster split: lead V/T + slider on the treble bout (not a Strat
  // triangle under the bridge); rhythm V/T as a tight pair on the bass bout.
  controlOverrides: [
    { x: 298, y: -90 },
    { x: 96, y: 88 },
    { x: 332, y: -116 },
    { x: 122, y: 74 },
  ],
  selectorOverride: { position: { x: 214, y: -86 }, rotation: 90 },
});
// Extra wood past the pocket so a 25.5"/24.75" fan (Tele's preserved
// scales) does not pull the neck coil under the 20 mm clearance.
JM_HARDWARE.pickups[0] = { ...JM_HARDWARE.pickups[0], x: JM_HARDWARE.pickups[0].x + 10 };

export const JAZZMASTER_TEMPLATE: BodyTemplate = {
  id: 'jazzmaster',
  name: 'J-style',
  family: 'classic',
  description:
    'Offset double-cut: rounded bass and treble lobes, no S-style horns. Two singles, lead + rhythm knobs, 3-way, tremolo, paddle.',
  defaultParams: DEFAULT_PARAMS,
  paramMeta: PARAM_META,
  buildAnchorSpecs,
  defaultNeckParams: JM_NECK,
  presets: {
    pickups: JM_PICKUPS,
    controls: JM_CONTROLS,
    bridgeType: 'strat-tremolo',
    headstockType: 'paddle',
  },
  defaultHardware: JM_HARDWARE,
};
