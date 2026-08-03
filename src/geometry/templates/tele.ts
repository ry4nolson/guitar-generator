// Tele-inspired: compact single-cut solid body.
// Original silhouette in the Tele family — not a traced production outline.
//
// Authored as an intentional polyline that already reads as a Tele, then
// smoothed with short segment-relative handles (long handles were the main
// source of the previous "melted potato" look).

import type { Point } from '../types';
import { buildHardwareDefaults } from '../../state/hardwareDefaults';
import { DEFAULT_NECK_PARAMS } from '../neckParams';
import type { BodyTemplate, TemplateParamMeta } from './types';
import { buildSmoothLoop, selectAnchorOrder, MIN_BODY_ANCHORS } from './smoothLoop';

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

function buildAnchorSpecs(params: Record<string, number>) {
  const L = params.bodyLength;
  const hw = params.bodyWidth / 2;
  const horn = (params.upperHornReach / 22) * 18; // mm past the neck face
  const cut = (params.lowerHornReach / 12) * 14;
  const f = params.lowerBoutFullness;

  // Point list walks clockwise from the neck face. Coordinates chosen so the
  // raw polyline already looks like a Tele before smoothing.
  const positions: Record<string, Point> = {
    // Neck face sits slightly off-center toward treble (classic Tele pocket).
    neckJoint: { x: 0.06 * L, y: -0.04 * hw },
    // Upper horn: rounded shoulder that clears the frets, not a spike.
    upperHornTip: { x: 0.06 * L - horn, y: 0.62 * hw },
    upperHornShoulder: { x: 0.18 * L, y: 0.92 * hw },
    upperBoutApex: { x: 0.33 * L, y: hw },
    waistPoint: { x: params.waistPosition * L, y: hw - params.waistDepth },
    lowerBassBoutApex: { x: 0.72 * L, y: hw * f },
    // Squared-off rounded tail (Tele family), not a circle.
    tailShoulderBass: { x: 0.94 * L, y: 0.38 * hw * f },
    tailPoint: { x: L, y: 0 },
    tailShoulderTreble: { x: 0.94 * L, y: -0.36 * hw * f },
    lowerTrebleBoutApex: { x: 0.72 * L, y: -0.96 * hw * f },
    hipContourPoint: { x: 0.42 * L, y: -hw + params.hipCutoutDepth },
    // Small treble cutaway.
    lowerHornShoulder: { x: 0.18 * L, y: -0.7 * hw },
    lowerHornTip: { x: 0.07 * L, y: -0.42 * hw - cut * 0.3 },
  };

  const fullOrder = [
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

  // Which anchors survive at reduced anchor counts, most important first:
  // the 4-point skeleton (neck / top bout / tail / bottom bout), then horns,
  // then waist/hip refinement, then shoulder smoothing points.
  const priority = [
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

  const order = selectAnchorOrder(fullOrder, priority, params.anchorCount);

  const featureOf: Record<string, import('../bodyFeatures').BodyFeatureId> = {
    neckJoint: 'neckTransition',
    upperHornTip: 'upperHorn',
    upperHornShoulder: 'upperHorn',
    upperBoutApex: 'upperBout',
    waistPoint: 'rearWaist',
    lowerBassBoutApex: 'lowerBassBout',
    tailShoulderBass: 'tail',
    tailPoint: 'tail',
    tailShoulderTreble: 'tail',
    lowerTrebleBoutApex: 'lowerTrebleBout',
    hipContourPoint: 'hipContour',
    lowerHornShoulder: 'lowerHornCutaway',
    lowerHornTip: 'lowerHornCutaway',
  };

  // Short handles (~20% of segment) keep the outline close to the polyline.
  return buildSmoothLoop({ order, positions, featureOf, handleFraction: 0.2 });
}

export const TELE_TEMPLATE: BodyTemplate = {
  id: 'tele',
  name: 'Tele-inspired',
  description: 'Compact body, rounded upper bout, modest horn, shallow waist, broad lower bout.',
  defaultParams: DEFAULT_PARAMS,
  paramMeta: PARAM_META,
  buildAnchorSpecs,
  defaultNeckParams: { ...DEFAULT_NECK_PARAMS },
  defaultHardware: buildHardwareDefaults({
    // Heel position: pocket-mouth anchor + how deep the neck sets into the body.
    joinX: DEFAULT_PARAMS.bodyLength * 0.06 + DEFAULT_NECK_PARAMS.neckInset,
    neckParams: { ...DEFAULT_NECK_PARAMS },
  }),
};
