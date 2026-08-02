// Flying-V-inspired template: angular symmetrical wings, narrow center
// "waist" (the notch between the wings, nearest the neck), mostly straight
// segments, sharp corners where appropriate. An original angular silhouette
// in this general family, not a traced/exact copy of any specific
// production instrument.
//
// Every anchor uses 'corner' continuity. For each anchor, inAngleDeg/
// outAngleDeg are computed to point EXACTLY at the previous/next anchor
// (via angleBetween on the already-resolved positions), and handle lengths
// are exactly 1/3 of the segment distance — the standard "collinear control
// points" technique for representing a straight line as a cubic Bezier
// segment. This is what makes the wing edges render as genuinely straight
// lines rather than approximated curves, while the wing tips / tail point
// still read as sharp corners (their in/out directions are NOT collinear
// with each other, since the edges change direction there).
//
// Symmetric about the centerline (y=0), unlike the offset Tele/Strat bodies:
// a Flying V doesn't have a bass/treble asymmetry the way an offset-cutaway
// body does.

import { angleBetween, type AnchorSpec } from '../bodyEngine';
import type { Point } from '../types';
import { buildHardwareDefaults } from '../../state/hardwareDefaults';
import { DEFAULT_NECK_PARAMS } from '../neckParams';
import type { BodyTemplate, TemplateParamMeta } from './types';

const PARAM_META: TemplateParamMeta[] = [
  { key: 'bodyLength', label: 'Body length', min: 400, max: 500, step: 1, unit: 'mm' },
  { key: 'bodyWidth', label: 'Body width', min: 300, max: 380, step: 1, unit: 'mm' },
  { key: 'forwardLean', label: 'Forward lean', min: -6, max: 12, step: 0.5, unit: 'deg' },
  { key: 'wingSpread', label: 'Wing spread', min: 0.75, max: 1.15, step: 0.01, unit: 'ratio', featureId: 'upperHorn' },
  { key: 'wingLength', label: 'Wing length', min: 0.5, max: 0.75, step: 0.01, unit: 'ratio', featureId: 'upperHorn' },
  { key: 'wingRootReach', label: 'Wing root position', min: 0.06, max: 0.22, step: 0.01, unit: 'ratio', featureId: 'neckTransition' },
  { key: 'tailPointSharpness', label: 'Tail point sharpness', min: 0, max: 1, step: 0.05, unit: 'ratio', featureId: 'tail' },
];

const DEFAULT_PARAMS: Record<string, number> = {
  bodyLength: 460,
  bodyWidth: 340,
  forwardLean: 3,
  wingSpread: 1.0,
  wingLength: 0.62,
  wingRootReach: 0.12,
  tailPointSharpness: 0.8,
};

function buildAnchorSpecs(params: Record<string, number>): AnchorSpec[] {
  const L = params.bodyLength;
  const W = params.bodyWidth;
  const halfW = W / 2;
  // 1 = perfectly sharp tail point (shoulders collapse onto the point); 0 = a
  // more rounded-off tail with visible shoulder anchors either side of it.
  const sharp = params.tailPointSharpness;
  const shoulderSpanY = 0.16 * halfW * (1 - sharp * 0.7);
  const shoulderX = L - (L - 0.97 * L) * (1 - sharp * 0.5);

  const positions: Record<string, Point> = {
    neckJoint: { x: 0.05 * L, y: 0 },
    upperWingRoot: { x: params.wingRootReach * L, y: 0.2 * halfW },
    upperWingBend: { x: 0.32 * L, y: 0.62 * halfW },
    upperWingTip: { x: params.wingLength * L, y: params.wingSpread * halfW },
    upperOuterCorner: { x: 0.88 * L, y: 0.55 * halfW },
    tailShoulderBass: { x: shoulderX, y: shoulderSpanY },
    tailPoint: { x: L, y: 0 },
    tailShoulderTreble: { x: shoulderX, y: -shoulderSpanY },
    lowerOuterCorner: { x: 0.88 * L, y: -0.55 * halfW },
    lowerWingTip: { x: params.wingLength * L, y: -params.wingSpread * halfW },
    lowerWingBend: { x: 0.32 * L, y: -0.62 * halfW },
    lowerWingRoot: { x: params.wingRootReach * L, y: -0.2 * halfW },
  };

  const order = [
    'neckJoint',
    'upperWingRoot',
    'upperWingBend',
    'upperWingTip',
    'upperOuterCorner',
    'tailShoulderBass',
    'tailPoint',
    'tailShoulderTreble',
    'lowerOuterCorner',
    'lowerWingTip',
    'lowerWingBend',
    'lowerWingRoot',
  ];

  const featureOf: Record<string, AnchorSpec['featureId']> = {
    neckJoint: 'neckTransition',
    upperWingRoot: 'upperHorn',
    upperWingBend: 'upperHorn',
    upperWingTip: 'upperHorn',
    upperOuterCorner: 'upperBout',
    tailShoulderBass: 'tail',
    tailPoint: 'tail',
    tailShoulderTreble: 'tail',
    lowerOuterCorner: 'lowerTrebleBout',
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
      continuity: 'corner',
      inAngleDeg: angleBetween(pos, prevPos),
      outAngleDeg: angleBetween(pos, nextPos),
      // 1/3 of the segment length is the standard "straight line as a cubic
      // Bezier" control-point placement — any collinear length works, this
      // one just reads naturally in the debug overlay's handle length.
      inLength: distIn / 3,
      outLength: distOut / 3,
    };
  });
}

export const FLYING_V_TEMPLATE: BodyTemplate = {
  id: 'flying-v',
  name: 'Flying-V-inspired',
  description: 'Angular symmetrical wings, narrow center notch, mostly straight edges with sharp corners.',
  defaultParams: DEFAULT_PARAMS,
  paramMeta: PARAM_META,
  buildAnchorSpecs,
  defaultNeckParams: { ...DEFAULT_NECK_PARAMS, neckLength: 480 },
  defaultHardware: buildHardwareDefaults({
    bridgeX: DEFAULT_PARAMS.bodyLength * 0.75,
    bridgeY: 0,
    neckJointX: DEFAULT_PARAMS.bodyLength * 0.05,
    neckBoltSpanX: 45,
    neckBoltSpanY: 16,
  }),
};
