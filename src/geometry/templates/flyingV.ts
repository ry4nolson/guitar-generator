// Flying-V-inspired: thick symmetrical wings, shallow rearward V notch.
// Original angular silhouette — not a traced production outline.
//
// Tips are rearmost; notch opens aft but stays shallow so the center mass
// holds bridge/controls. Straight edges via corner continuity.

import { angleBetween, type AnchorSpec } from '../bodyEngine';
import type { Point } from '../types';
import { buildHardwareDefaults } from '../../state/hardwareDefaults';
import { DEFAULT_NECK_PARAMS } from '../neckParams';
import type { BodyTemplate, TemplateParamMeta } from './types';

const PARAM_META: TemplateParamMeta[] = [
  { key: 'bodyLength', label: 'Body length', min: 420, max: 480, step: 1, unit: 'mm' },
  { key: 'bodyWidth', label: 'Body width', min: 300, max: 360, step: 1, unit: 'mm' },
  { key: 'forwardLean', label: 'Forward lean', min: -3, max: 6, step: 0.5, unit: 'deg' },
  { key: 'wingSpread', label: 'Wing spread', min: 0.88, max: 1.02, step: 0.01, unit: 'ratio', featureId: 'upperHorn' },
  { key: 'wingLength', label: 'Wing tip position', min: 0.9, max: 1.0, step: 0.01, unit: 'ratio', featureId: 'upperHorn' },
  { key: 'wingRootWidth', label: 'Wing root width', min: 0.14, max: 0.32, step: 0.01, unit: 'ratio', featureId: 'neckTransition' },
  { key: 'notchDepth', label: 'Rear notch depth', min: 0.58, max: 0.8, step: 0.01, unit: 'ratio', featureId: 'tail' },
];

const DEFAULT_PARAMS: Record<string, number> = {
  bodyLength: 450,
  bodyWidth: 338,
  forwardLean: 0,
  wingSpread: 0.95,
  wingLength: 0.97,
  wingRootWidth: 0.2,
  notchDepth: 0.7,
};

function buildAnchorSpecs(params: Record<string, number>): AnchorSpec[] {
  const L = params.bodyLength;
  const hw = params.bodyWidth / 2;
  const tipX = params.wingLength * L;
  const tipY = params.wingSpread * hw;
  const notchX = params.notchDepth * L;
  const rootY = params.wingRootWidth * hw;
  // Inner trailing edge sits between tip and notch (never past the tip).
  const innerX = notchX + (tipX - notchX) * 0.35;
  const innerY = tipY * 0.16;

  const positions: Record<string, Point> = {
    neckJoint: { x: 0.045 * L, y: 0 },
    upperWingRoot: { x: 0.09 * L, y: rootY },
    // Outer edge flares early so each wing is a thick triangle.
    upperWingBend: { x: 0.5 * L, y: 0.9 * tipY },
    upperWingTip: { x: tipX, y: tipY },
    upperInnerEdge: { x: innerX, y: innerY },
    rearNotch: { x: notchX, y: 0 },
    lowerInnerEdge: { x: innerX, y: -innerY },
    lowerWingTip: { x: tipX, y: -tipY },
    lowerWingBend: { x: 0.5 * L, y: -0.9 * tipY },
    lowerWingRoot: { x: 0.09 * L, y: -rootY },
  };

  const order = [
    'neckJoint',
    'upperWingRoot',
    'upperWingBend',
    'upperWingTip',
    'upperInnerEdge',
    'rearNotch',
    'lowerInnerEdge',
    'lowerWingTip',
    'lowerWingBend',
    'lowerWingRoot',
  ];

  const featureOf: Record<string, AnchorSpec['featureId']> = {
    neckJoint: 'neckTransition',
    upperWingRoot: 'upperHorn',
    upperWingBend: 'upperHorn',
    upperWingTip: 'upperHorn',
    upperInnerEdge: 'upperBout',
    rearNotch: 'tail',
    lowerInnerEdge: 'lowerTrebleBout',
    lowerWingTip: 'lowerHornCutaway',
    lowerWingBend: 'lowerHornCutaway',
    lowerWingRoot: 'lowerHornCutaway',
  };

  const n = order.length;
  return order.map((id, i) => {
    const pos = positions[id];
    const prevPos = positions[order[(i - 1 + n) % n]];
    const nextPos = positions[order[(i + 1) % n]];
    const distIn = Math.hypot(pos.x - prevPos.x, pos.y - prevPos.y);
    const distOut = Math.hypot(nextPos.x - pos.x, nextPos.y - pos.y);
    return {
      id,
      featureId: featureOf[id],
      position: pos,
      continuity: 'corner' as const,
      inAngleDeg: angleBetween(pos, prevPos),
      outAngleDeg: angleBetween(pos, nextPos),
      inLength: distIn / 3,
      outLength: distOut / 3,
    };
  });
}

export const FLYING_V_TEMPLATE: BodyTemplate = {
  id: 'flying-v',
  name: 'Flying-V-inspired',
  description: 'Thick symmetrical wings, shallow rearward V notch, straight edges.',
  defaultParams: DEFAULT_PARAMS,
  paramMeta: PARAM_META,
  buildAnchorSpecs,
  defaultNeckParams: { ...DEFAULT_NECK_PARAMS, neckLength: 480 },
  defaultHardware: buildHardwareDefaults({
    bridgeX: DEFAULT_PARAMS.bodyLength * 0.5,
    bridgeY: 0,
    neckJointX: DEFAULT_PARAMS.bodyLength * 0.045,
    neckBoltSpanX: 42,
    neckBoltSpanY: 16,
  }),
};
