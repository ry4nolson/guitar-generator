// Strat-inspired template: offset double cutaway, longer upper horn, shorter
// lower horn, deeper waist, rounder lower bout, balanced flowing curves. An
// original silhouette in this general family, not a traced/exact copy.
//
// Same 13-anchor topology/feature ownership as the Tele template (both are
// "offset double-cutaway" bodies at heart) — what differentiates the two is
// purely the anchor positions and radii the params resolve to: a much
// longer/further-reaching upper horn, a deeper waist pinch, and a fuller,
// rounder lower bout. All anchors use 'smooth' continuity for the "balanced
// flowing curves" the brief asks for.

import type { AnchorSpec } from '../bodyEngine';
import type { Point } from '../types';
import { buildHardwareDefaults } from '../../state/hardwareDefaults';
import { DEFAULT_NECK_PARAMS } from '../neckParams';
import type { BodyTemplate, TemplateParamMeta } from './types';

const PARAM_META: TemplateParamMeta[] = [
  { key: 'bodyLength', label: 'Body length', min: 390, max: 470, step: 1, unit: 'mm' },
  { key: 'bodyWidth', label: 'Body width', min: 285, max: 355, step: 1, unit: 'mm' },
  { key: 'forwardLean', label: 'Forward lean', min: -10, max: 20, step: 0.5, unit: 'deg' },
  { key: 'upperHornReach', label: 'Upper horn reach', min: 30, max: 100, step: 1, unit: 'mm', featureId: 'upperHorn' },
  { key: 'upperHornRadius', label: 'Upper horn radius', min: 20, max: 60, step: 1, unit: 'mm', featureId: 'upperHorn' },
  { key: 'upperBoutRadius', label: 'Upper bout radius', min: 100, max: 210, step: 1, unit: 'mm', featureId: 'upperBout' },
  { key: 'waistDepth', label: 'Waist depth', min: 10, max: 55, step: 1, unit: 'mm', featureId: 'rearWaist' },
  { key: 'waistPosition', label: 'Waist position', min: 0.32, max: 0.62, step: 0.01, unit: 'ratio', featureId: 'rearWaist' },
  { key: 'lowerBoutFullness', label: 'Lower bout fullness', min: 0.85, max: 1.3, step: 0.01, unit: 'ratio', featureId: 'lowerBassBout' },
  { key: 'hipCutoutDepth', label: 'Hip cutout depth', min: 5, max: 50, step: 1, unit: 'mm', featureId: 'hipContour' },
  { key: 'hipCutoutRadius', label: 'Hip cutout radius', min: 25, max: 90, step: 1, unit: 'mm', featureId: 'hipContour' },
  { key: 'lowerHornReach', label: 'Lower horn reach', min: 0, max: 30, step: 1, unit: 'mm', featureId: 'lowerHornCutaway' },
  { key: 'tailRadius', label: 'Tail radius', min: 60, max: 150, step: 1, unit: 'mm', featureId: 'tail' },
];

const DEFAULT_PARAMS: Record<string, number> = {
  bodyLength: 440,
  bodyWidth: 330,
  forwardLean: 6,
  upperHornReach: 70,
  upperHornRadius: 40,
  upperBoutRadius: 150,
  waistDepth: 34,
  waistPosition: 0.48,
  lowerBoutFullness: 1.02,
  hipCutoutDepth: 30,
  hipCutoutRadius: 55,
  lowerHornReach: 40,
  tailRadius: 110,
};

function buildAnchorSpecs(params: Record<string, number>): AnchorSpec[] {
  const L = params.bodyLength;
  const W = params.bodyWidth;
  const halfW = W / 2;
  const hornReachX = (params.upperHornReach / 70) * 0.015 * L;
  const lowerHornOffset = (params.lowerHornReach / 40) * 0.02 * halfW;

  const positions: Record<string, Point> = {
    neckJoint: { x: 0.05 * L, y: -0.06 * halfW },
    upperHornTip: { x: -0.015 * L - hornReachX, y: 0.4 * halfW },
    upperHornShoulder: { x: 0.12 * L, y: 0.62 * halfW },
    upperBoutApex: { x: 0.34 * L, y: halfW },
    waistPoint: { x: params.waistPosition * L, y: halfW - params.waistDepth },
    lowerBassBoutApex: { x: 0.8 * L, y: halfW * params.lowerBoutFullness },
    tailShoulderBass: { x: 0.93 * L, y: halfW * params.lowerBoutFullness * 0.5 },
    tailPoint: { x: L, y: 0 },
    tailShoulderTreble: { x: 0.93 * L, y: -halfW * params.lowerBoutFullness * 0.45 },
    lowerTrebleBoutApex: { x: 0.79 * L, y: -halfW * params.lowerBoutFullness * 0.8 },
    hipContourPoint: { x: 0.52 * L, y: -halfW + params.hipCutoutDepth },
    lowerHornShoulder: { x: 0.28 * L, y: -halfW * 0.58 },
    lowerHornTip: { x: 0.19 * L, y: -halfW * 0.68 - lowerHornOffset },
  };

  const order = [
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

  const featureOf: Record<string, AnchorSpec['featureId']> = {
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

  const radiusOf: Record<string, number> = {
    neckJoint: 26,
    upperHornTip: params.upperHornRadius,
    upperHornShoulder: params.upperHornRadius * 0.75,
    upperBoutApex: params.upperBoutRadius,
    waistPoint: Math.max(16, 60 - params.waistDepth),
    lowerBassBoutApex: params.upperBoutRadius * 0.9,
    tailShoulderBass: params.tailRadius * 0.55,
    tailPoint: params.tailRadius,
    tailShoulderTreble: params.tailRadius * 0.55,
    lowerTrebleBoutApex: params.upperBoutRadius * 0.7,
    hipContourPoint: params.hipCutoutRadius,
    lowerHornShoulder: params.upperHornRadius * 0.55,
    lowerHornTip: params.upperHornRadius * 0.45,
  };

  return order.map((id) => ({
    id,
    featureId: featureOf[id],
    position: positions[id],
    continuity: 'smooth',
    inLength: radiusOf[id],
    outLength: radiusOf[id],
  }));
}

export const STRAT_TEMPLATE: BodyTemplate = {
  id: 'strat',
  name: 'Strat-inspired',
  description: 'Offset double cutaway, longer upper horn, deeper waist, rounder lower bout.',
  defaultParams: DEFAULT_PARAMS,
  paramMeta: PARAM_META,
  buildAnchorSpecs,
  defaultNeckParams: { ...DEFAULT_NECK_PARAMS },
  defaultHardware: buildHardwareDefaults({
    bridgeX: DEFAULT_PARAMS.bodyLength * 0.85,
    bridgeY: -4,
    neckJointX: DEFAULT_PARAMS.bodyLength * 0.05,
  }),
};
