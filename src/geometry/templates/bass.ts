// Bass body presets. P-style is the S-style loop, stretched a little, with
// bass hardware. Violin is an original figure-8 short-scale at 30".

import { buildHardwareDefaults } from '../../state/hardwareDefaults';
import {
  LONG_BASS_SCALE_MM,
  SHORT_BASS_SCALE_MM,
  type NeckParams,
} from '../neckParams';
import type { PickupSettings, ControlSettings } from '../pickups';
import type { BodyFeatureId } from '../bodyFeatures';
import type { BodyTemplate } from './types';
import {
  STRAT_SEED,
  STRAT_DEFAULT_PARAMS,
  STRAT_PARAM_META,
  buildStratAnchorSpecs,
} from './strat';
import {
  buildTracedSpecs,
  tracedDefaultParams,
  tracedParamMeta,
  type TracedAnchor,
  type TracedBody,
} from './tracedSeed';

/** [id, feature, x, y, outgoingTangentDeg, inLen, outLen] */
type G1 = [string, BodyFeatureId, number, number, number, number, number];

function g1(spec: G1): TracedAnchor {
  const [id, feature, x, y, deg, inLen, outLen] = spec;
  const rad = (deg * Math.PI) / 180;
  const tx = Math.cos(rad);
  const ty = Math.sin(rad);
  return [id, feature, x, y, x - tx * inLen, y - ty * inLen, x + tx * outLen, y + ty * outLen, 0];
}

/** Mirror a bass-side G1 point onto the treble side, reversing walk direction. */
function mirrorG1(spec: G1, id: string, feature: BodyFeatureId): G1 {
  const [, , x, y, deg, inLen, outLen] = spec;
  return [id, feature, x, -y, -(deg + 180), outLen, inLen];
}

function tracedFromG1(bodyLength: number, bodyWidth: number, specs: G1[], priority: string[]): TracedBody {
  return { bodyLength, bodyWidth, priority, anchors: specs.map(g1) };
}

function bassTemplate(opts: {
  id: string;
  name: string;
  description: string;
  body: TracedBody;
  neck: NeckParams;
  pickups: PickupSettings;
  controls: Pick<ControlSettings, 'volumes' | 'tones' | 'selector'>;
  bridgeType: 'hardtail' | 'tom';
  headstockType: 'paddle' | '3x3';
  stringSpacing: number;
  controlOverrides: { x: number; y: number }[];
  pickupOverrides?: { x: number; y: number }[];
  pairOppositeByDefault?: boolean;
}): BodyTemplate {
  const neckJointX = opts.body.anchors.find((a) => a[0] === 'neckJoint')?.[2] ?? 0;
  const hardware = buildHardwareDefaults({
    joinX: neckJointX + opts.neck.neckInset,
    neckParams: opts.neck,
    bridgeType: opts.bridgeType,
    stringCount: 4,
    stringSpacing: opts.stringSpacing,
    pickupSettings: opts.pickups,
    controlSettings: opts.controls,
    controlOverrides: opts.controlOverrides,
    neckBoltSpanY: 22,
  });
  if (opts.pickupOverrides) {
    hardware.pickups = hardware.pickups.map((p, i) => {
      const o = opts.pickupOverrides![i];
      return o ? { ...p, x: o.x, y: o.y } : p;
    });
  }
  return {
    id: opts.id,
    name: opts.name,
    family: 'bass',
    description: opts.description,
    defaultParams: tracedDefaultParams(opts.body),
    paramMeta: tracedParamMeta(opts.body.anchors.length),
    buildAnchorSpecs: (params) => buildTracedSpecs(opts.body, params),
    defaultNeckParams: opts.neck,
    pairOppositeByDefault: opts.pairOppositeByDefault,
    presets: {
      pickups: opts.pickups,
      controls: opts.controls,
      bridgeType: opts.bridgeType,
      headstockType: opts.headstockType,
      stringCount: 4,
    },
    defaultHardware: hardware,
  };
}

// --- P-style: S-style body, stretched a little, with bass hardware ---

const P_NECK: NeckParams = {
  bassScale: LONG_BASS_SCALE_MM,
  trebleScale: LONG_BASS_SCALE_MM,
  neutralFret: 8,
  fretCount: 20,
  nutWidth: 41.5,
  heelWidth: 62,
  neckLength: 596,
  neckAngle: 0,
  neckInset: 70,
};

const P_PARAMS = {
  ...STRAT_DEFAULT_PARAMS,
  bodyLength: 490,
  bodyWidth: 336,
};
const P_SX = P_PARAMS.bodyLength / STRAT_DEFAULT_PARAMS.bodyLength;
const P_SY = P_PARAMS.bodyWidth / STRAT_DEFAULT_PARAMS.bodyWidth;
const P_PICKUPS = { neck: 'none', middle: 'p90', bridge: 'none' } as const;
const P_CONTROLS = { volumes: 1, tones: 1, selector: 'none' } as const;

export const P_BASS_TEMPLATE: BodyTemplate = {
  id: 'p-bass',
  name: 'P-style',
  family: 'bass',
  description:
    'S-style body, stretched a little: split-P in the middle, vol + tone, hardtail, paddle head, 34" scale, 4 strings.',
  defaultParams: P_PARAMS,
  paramMeta: STRAT_PARAM_META,
  buildAnchorSpecs: buildStratAnchorSpecs,
  defaultNeckParams: P_NECK,
  presets: {
    pickups: P_PICKUPS,
    controls: P_CONTROLS,
    bridgeType: 'hardtail',
    headstockType: 'paddle',
    stringCount: 4,
  },
  defaultHardware: buildHardwareDefaults({
    joinX: STRAT_SEED.neckJoint.position.x * P_SX + P_NECK.neckInset,
    neckParams: P_NECK,
    bridgeType: 'hardtail',
    stringCount: 4,
    stringSpacing: 57,
    pickupSettings: P_PICKUPS,
    controlSettings: P_CONTROLS,
    controlOverrides: [
      { x: 328 * P_SX, y: -50 * P_SY },
      { x: 348 * P_SX, y: -64 * P_SY },
    ],
    neckBoltSpanY: 22,
  }),
};

// --- Violin: figure-8 short-scale, two soapbars ---

const V_NECK: NeckParams = {
  bassScale: SHORT_BASS_SCALE_MM,
  trebleScale: SHORT_BASS_SCALE_MM,
  neutralFret: 8,
  fretCount: 22,
  nutWidth: 42,
  heelWidth: 58,
  neckLength: 552,
  neckAngle: 0,
  neckInset: 48,
};

const V_NECK_JOINT: G1 = ['neckJoint', 'neckTransition', 0, 0, 78, 14, 22];

const V_BASS_SIDE: G1[] = [
  ['upperFront', 'upperHorn', 20, 58, 42, 26, 32],
  ['upperApex', 'upperBout', 90, 138, 8, 40, 40],
  ['upperRear', 'upperBout', 150, 102, -48, 32, 28],
  ['waist', 'rearWaist', 218, 58, 4, 30, 30],
  ['lowerFront', 'lowerBassBout', 282, 118, 52, 32, 40],
  ['lowerApex', 'lowerBassBout', 358, 168, 6, 46, 42],
  ['tailShoulder', 'tail', 428, 76, -68, 34, 26],
];

const V_TAIL: G1 = ['tailPoint', 'tail', 445, 0, -90, 26, 26];

const V_TREBLE: G1[] = [
  mirrorG1(V_BASS_SIDE[6], 'tailShoulderTreble', 'tail'),
  mirrorG1(V_BASS_SIDE[5], 'lowerTrebleApex', 'lowerTrebleBout'),
  mirrorG1(V_BASS_SIDE[4], 'lowerTrebleFront', 'lowerTrebleBout'),
  mirrorG1(V_BASS_SIDE[3], 'trebleWaist', 'rearWaist'),
  mirrorG1(V_BASS_SIDE[2], 'trebleUpperRear', 'upperBout'),
  mirrorG1(V_BASS_SIDE[1], 'trebleUpperApex', 'upperBout'),
  mirrorG1(V_BASS_SIDE[0], 'trebleUpperFront', 'upperHorn'),
];

const V_SPECS: G1[] = [V_NECK_JOINT, ...V_BASS_SIDE, V_TAIL, ...V_TREBLE];

const V_BODY = tracedFromG1(445, 336, V_SPECS, [
  'neckJoint',
  'upperApex',
  'tailPoint',
  'lowerTrebleApex',
  'waist',
  'lowerApex',
  'trebleWaist',
  'upperFront',
  'trebleUpperFront',
  'upperRear',
  'trebleUpperRear',
  'lowerFront',
  'lowerTrebleFront',
  'tailShoulder',
  'tailShoulderTreble',
]);

export const VIOLIN_BASS_TEMPLATE = bassTemplate({
  id: 'violin-bass',
  name: 'Violin',
  description:
    'Figure-8 short-scale bass: C-bouts, two soapbars, 2V/1T, split head, 30" scale, 4 strings.',
  body: V_BODY,
  neck: V_NECK,
  pickups: { neck: 'p90', middle: 'none', bridge: 'p90' },
  controls: { volumes: 2, tones: 1, selector: 'none' },
  bridgeType: 'hardtail',
  headstockType: '3x3',
  stringSpacing: 57,
  pairOppositeByDefault: true,
  controlOverrides: [
    { x: 348, y: -86 },
    { x: 372, y: -104 },
    { x: 392, y: -78 },
  ],
  pickupOverrides: [
    { x: 160, y: 0 },
    { x: 190, y: 0 },
    { x: 215, y: 0 },
  ],
});

export const BASS_TEMPLATES: BodyTemplate[] = [P_BASS_TEMPLATE, VIOLIN_BASS_TEMPLATE];
