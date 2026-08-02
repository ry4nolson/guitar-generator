// Tele-inspired template: compact body, rounded upper bout, modest upper
// horn, shallow waist, broad rounded lower bout, small lower cutaway, no
// exaggerated hip notch. An original silhouette in this general family, not
// a traced/exact copy of any specific production instrument.
//
// All 13 anchors use 'smooth' continuity (flowing curves throughout, no
// corners) — the modest horn/cutaway read as gentle bumps, not points.
//
// Anchor ordering keeps the bass-edge sequence (neckJoint -> upperHornTip ->
// upperHornShoulder -> upperBoutApex) strictly increasing in y: an earlier
// version dipped y down then back up through this run, which rendered as an
// unwanted flat-spot/bump right at the horn-to-bout join. Monotonic
// progression through each edge run is what keeps the curve reading as one
// clean sweep instead of an S-wiggle.

import type { AnchorSpec } from '../bodyEngine';
import type { Point } from '../types';
import { buildHardwareDefaults } from '../../state/hardwareDefaults';
import { DEFAULT_NECK_PARAMS } from '../neckParams';
import type { BodyTemplate, TemplateParamMeta } from './types';

const PARAM_META: TemplateParamMeta[] = [
  { key: 'bodyLength', label: 'Body length', min: 380, max: 460, step: 1, unit: 'mm' },
  { key: 'bodyWidth', label: 'Body width', min: 280, max: 350, step: 1, unit: 'mm' },
  { key: 'forwardLean', label: 'Forward lean', min: -10, max: 20, step: 0.5, unit: 'deg' },
  { key: 'upperHornReach', label: 'Upper horn reach', min: 0, max: 60, step: 1, unit: 'mm', featureId: 'upperHorn' },
  { key: 'upperHornRadius', label: 'Upper horn radius', min: 16, max: 50, step: 1, unit: 'mm', featureId: 'upperHorn' },
  { key: 'upperBoutRadius', label: 'Upper bout radius', min: 90, max: 200, step: 1, unit: 'mm', featureId: 'upperBout' },
  { key: 'waistDepth', label: 'Waist depth', min: 0, max: 40, step: 1, unit: 'mm', featureId: 'rearWaist' },
  { key: 'waistPosition', label: 'Waist position', min: 0.35, max: 0.65, step: 0.01, unit: 'ratio', featureId: 'rearWaist' },
  { key: 'lowerBoutFullness', label: 'Lower bout fullness', min: 0.8, max: 1.2, step: 0.01, unit: 'ratio', featureId: 'lowerBassBout' },
  { key: 'hipCutoutDepth', label: 'Hip cutout depth', min: 0, max: 30, step: 1, unit: 'mm', featureId: 'hipContour' },
  { key: 'hipCutoutRadius', label: 'Hip cutout radius', min: 30, max: 100, step: 1, unit: 'mm', featureId: 'hipContour' },
  { key: 'lowerHornReach', label: 'Lower cutaway reach', min: 0, max: 40, step: 1, unit: 'mm', featureId: 'lowerHornCutaway' },
  { key: 'tailRadius', label: 'Tail radius', min: 50, max: 130, step: 1, unit: 'mm', featureId: 'tail' },
];

const DEFAULT_PARAMS: Record<string, number> = {
  bodyLength: 430,
  bodyWidth: 325,
  forwardLean: 6,
  upperHornReach: 42,
  upperHornRadius: 34,
  upperBoutRadius: 140,
  waistDepth: 22,
  waistPosition: 0.5,
  lowerBoutFullness: 0.98,
  hipCutoutDepth: 14,
  hipCutoutRadius: 70,
  lowerHornReach: 26,
  tailRadius: 90,
};

function buildAnchorSpecs(params: Record<string, number>): AnchorSpec[] {
  const L = params.bodyLength;
  const W = params.bodyWidth;
  const halfW = W / 2;
  const hornReachX = (params.upperHornReach / 42) * 0.02 * L;

  const positions: Record<string, Point> = {
    neckJoint: { x: 0.045 * L, y: -0.08 * halfW },
    upperHornTip: { x: 0.02 * L - hornReachX, y: 0.42 * halfW },
    upperHornShoulder: { x: 0.16 * L, y: 0.66 * halfW },
    upperBoutApex: { x: 0.4 * L, y: halfW },
    waistPoint: { x: params.waistPosition * L, y: halfW - params.waistDepth },
    lowerBassBoutApex: { x: 0.82 * L, y: halfW * params.lowerBoutFullness },
    tailShoulderBass: { x: 0.94 * L, y: halfW * params.lowerBoutFullness * 0.55 },
    tailPoint: { x: L, y: 0 },
    tailShoulderTreble: { x: 0.94 * L, y: -halfW * params.lowerBoutFullness * 0.5 },
    lowerTrebleBoutApex: { x: 0.83 * L, y: -halfW * params.lowerBoutFullness * 0.88 },
    hipContourPoint: { x: 0.58 * L, y: -halfW + params.hipCutoutDepth },
    lowerHornShoulder: { x: 0.3 * L, y: -halfW * 0.6 },
    lowerHornTip: { x: 0.15 * L, y: -halfW * 0.5 - params.lowerHornReach * 0.3 },
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
    upperHornShoulder: params.upperHornRadius * 0.8,
    upperBoutApex: params.upperBoutRadius,
    waistPoint: Math.max(18, 70 - params.waistDepth),
    lowerBassBoutApex: params.upperBoutRadius * 0.9,
    tailShoulderBass: params.tailRadius * 0.6,
    tailPoint: params.tailRadius,
    tailShoulderTreble: params.tailRadius * 0.6,
    lowerTrebleBoutApex: params.upperBoutRadius * 0.75,
    hipContourPoint: params.hipCutoutRadius,
    lowerHornShoulder: params.upperHornRadius * 0.6,
    lowerHornTip: params.upperHornRadius * 0.5,
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

export const TELE_TEMPLATE: BodyTemplate = {
  id: 'tele',
  name: 'Tele-inspired',
  description: 'Compact body, rounded upper bout, modest horn, shallow waist, broad lower bout.',
  defaultParams: DEFAULT_PARAMS,
  paramMeta: PARAM_META,
  buildAnchorSpecs,
  defaultNeckParams: { ...DEFAULT_NECK_PARAMS },
  defaultHardware: buildHardwareDefaults({
    bridgeX: DEFAULT_PARAMS.bodyLength * 0.855,
    bridgeY: -6,
    neckJointX: DEFAULT_PARAMS.bodyLength * 0.045,
  }),
};
