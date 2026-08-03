// Strat-inspired: offset double-cutaway solid body.
// Original silhouette in the Strat family — not a traced production outline.
//
// Longer bass horn, shorter treble horn, deeper waist than Tele, gentle hip.
// Short segment-relative handles keep curves taut.

import type { Point } from '../types';
import { buildHardwareDefaults } from '../../state/hardwareDefaults';
import { DEFAULT_NECK_PARAMS } from '../neckParams';
import type { BodyTemplate, TemplateParamMeta } from './types';
import { buildSmoothLoop, selectAnchorOrder, MIN_BODY_ANCHORS } from './smoothLoop';

const PARAM_META: TemplateParamMeta[] = [
  { key: 'bodyLength', label: 'Body length', min: 410, max: 470, step: 1, unit: 'mm' },
  { key: 'bodyWidth', label: 'Body width', min: 300, max: 355, step: 1, unit: 'mm' },
  { key: 'anchorCount', label: 'Anchor points', min: MIN_BODY_ANCHORS, max: 13, step: 1, unit: 'count' },
  { key: 'forwardLean', label: 'Forward lean', min: -4, max: 10, step: 0.5, unit: 'deg' },
  { key: 'upperHornReach', label: 'Upper horn reach', min: 20, max: 85, step: 1, unit: 'mm', featureId: 'upperHorn' },
  { key: 'waistDepth', label: 'Waist depth', min: 14, max: 46, step: 1, unit: 'mm', featureId: 'rearWaist' },
  { key: 'waistPosition', label: 'Waist position', min: 0.38, max: 0.56, step: 0.01, unit: 'ratio', featureId: 'rearWaist' },
  { key: 'lowerBoutFullness', label: 'Lower bout fullness', min: 0.92, max: 1.12, step: 0.01, unit: 'ratio', featureId: 'lowerBassBout' },
  { key: 'hipCutoutDepth', label: 'Hip cutout depth', min: 2, max: 24, step: 1, unit: 'mm', featureId: 'hipContour' },
  { key: 'lowerHornReach', label: 'Lower horn reach', min: 0, max: 34, step: 1, unit: 'mm', featureId: 'lowerHornCutaway' },
];

const DEFAULT_PARAMS: Record<string, number> = {
  bodyLength: 440,
  bodyWidth: 328,
  anchorCount: 13,
  forwardLean: 0,
  upperHornReach: 68,
  waistDepth: 30,
  waistPosition: 0.44,
  lowerBoutFullness: 1.01,
  hipCutoutDepth: 10,
  lowerHornReach: 18,
};

function buildAnchorSpecs(params: Record<string, number>) {
  const L = params.bodyLength;
  const hw = params.bodyWidth / 2;
  const horn = (params.upperHornReach / 68) * 48;
  const lower = (params.lowerHornReach / 18) * 18;
  const f = params.lowerBoutFullness;

  const positions: Record<string, Point> = {
    neckJoint: { x: 0.07 * L, y: -0.02 * hw },
    // Long upper horn reaching well past the neck face.
    upperHornTip: { x: 0.05 * L - horn, y: 0.44 * hw },
    upperHornShoulder: { x: 0.13 * L, y: 0.78 * hw },
    upperBoutApex: { x: 0.26 * L, y: hw },
    waistPoint: { x: params.waistPosition * L, y: hw - params.waistDepth },
    lowerBassBoutApex: { x: 0.7 * L, y: hw * f },
    tailShoulderBass: { x: 0.93 * L, y: 0.34 * hw * f },
    tailPoint: { x: L, y: 0.005 * hw },
    tailShoulderTreble: { x: 0.93 * L, y: -0.32 * hw * f },
    lowerTrebleBoutApex: { x: 0.7 * L, y: -0.94 * hw * f },
    hipContourPoint: { x: 0.4 * L, y: -hw + params.hipCutoutDepth },
    // Shorter lower horn — clearly offset from the upper.
    lowerHornShoulder: { x: 0.19 * L, y: -0.68 * hw },
    lowerHornTip: { x: 0.08 * L, y: -0.48 * hw - lower * 0.4 },
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

  // Reduced-count survival order: 4-point skeleton, then horns (the Strat's
  // defining offset cutaways), then waist/bout refinement, then shoulders.
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

  return buildSmoothLoop({
    order,
    positions,
    featureOf,
    handleFraction: {
      neckJoint: 0.18,
      upperHornTip: 0.18,
      upperHornShoulder: 0.2,
      upperBoutApex: 0.22,
      waistPoint: 0.2,
      lowerBassBoutApex: 0.22,
      tailShoulderBass: 0.2,
      tailPoint: 0.22,
      tailShoulderTreble: 0.2,
      lowerTrebleBoutApex: 0.22,
      hipContourPoint: 0.2,
      lowerHornShoulder: 0.18,
      lowerHornTip: 0.18,
    },
  });
}

export const STRAT_TEMPLATE: BodyTemplate = {
  id: 'strat',
  name: 'Strat-inspired',
  description: 'Offset double cutaway, longer upper horn, deeper waist, flowing lower bout.',
  defaultParams: DEFAULT_PARAMS,
  paramMeta: PARAM_META,
  buildAnchorSpecs,
  defaultNeckParams: { ...DEFAULT_NECK_PARAMS },
  defaultHardware: buildHardwareDefaults({
    // Heel position: pocket-mouth anchor + how deep the neck sets into the body.
    joinX: DEFAULT_PARAMS.bodyLength * 0.07 + DEFAULT_NECK_PARAMS.neckInset,
    neckParams: { ...DEFAULT_NECK_PARAMS },
  }),
};
