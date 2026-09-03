// Jackson-inspired body presets.
//
// Each silhouette is our own G1 cubic loop fitted to the body portion of the
// outline drawings in Wikimedia Commons' "Guitar outlines" category (GreyCat,
// CC BY-SA). The drawings include neck + headstock; those runs are clipped at
// the pocket mouth before fitting. Soloist is scaled to a 465 × 318 mm
// superstrat; the offset-V family keeps the drawing's own proportions.

import { buildHardwareDefaults } from '../../state/hardwareDefaults';
import { DEFAULT_NECK_PARAMS } from '../neckParams';
import type { BodyTemplate } from './types';
import {
  buildTracedSpecs,
  tracedDefaultParams,
  tracedParamMeta,
  type TracedBody,
} from './tracedSeed';

const SOLOIST: TracedBody = {
  bodyLength: 465,
  bodyWidth: 318,
  priority: ['neckJoint', 'p6', 'p3', 'p11', 'p5', 'p8', 'p9', 'p1', 'p14', 'p4', 'p7', 'p10', 'p2', 'p12', 'p13'],
  anchors: [
    ['neckJoint', 'neckTransition', 0, 0, -4.235, -8.146, 3.199, 6.153, 1],
    ['p1', 'upperHorn', 13.297, 25.136, 9.576, 20.373, 24.899, 39.986, 0],
    ['p2', 'upperHorn', 15.467, 64.216, 27.644, 45.985, -5.057, 94.942, 0],
    ['p3', 'upperHorn', -63.657, 100.162, -56.459, 83.893, -47.044, 134.834, 1],
    ['p4', 'upperHorn', 40.629, 112.293, 12.273, 125.761, 147.231, 61.662, 0],
    ['p5', 'lowerBassBout', 267.511, 137.02, 178.476, 145.231, 337.937, 130.524, 0],
    ['p6', 'tail', 351.511, -0.45, 350.773, 56.076, 351.976, -36.029, 0],
    ['p7', 'lowerTrebleBout', 325.742, -125.039, 351.837, -98.397, 299.418, -151.914, 0],
    ['p8', 'lowerTrebleBout', 212.811, -139.591, 246.097, -150.476, 185.285, -130.59, 0],
    ['p9', 'hipContour', 125.47, -100.013, 149.425, -104.904, 103.535, -95.534, 0],
    ['p10', 'lowerHornCutaway', 26.451, -120.649, 59.16, -123.393, 12.321, -119.464, 0],
    ['p11', 'lowerHornCutaway', -7.445, -104.627, -1.098, -118.519, -4.002, -89.167, 1],
    ['p12', 'lowerHornCutaway', 46.491, -83.121, 28.264, -98.786, 64.655, -67.51, 0],
    ['p13', 'lowerHornCutaway', 49.613, -27.014, 68.854, -43.73, 29.157, -25.648, 1],
    ['p14', 'lowerHornCutaway', -12.684, -24.456, 7.334, -26.512, -8.448, -16.308, 1],
  ],
};

const KELLY: TracedBody = {
  bodyLength: 519,
  bodyWidth: 381,
  priority: ['neckJoint', 'p4', 'p6', 'p3', 'p5', 'p1', 'p9', 'p2', 'p7', 'p8'],
  anchors: [
    ['neckJoint', 'neckTransition', 0, 0, 3.183, -8.19, -3.172, 8.163, 1],
    ['p1', 'upperBout', -9.564, 26.296, -6.218, 17.688, 18.383, 45.362, 1],
    ['p2', 'upperHorn', 45.393, 100.15, 26.553, 73.817, 149.284, 64.986, 1],
    ['p3', 'lowerBassBout', 258.841, 95.89, 147.002, 48.869, 329.215, 125.477, 0],
    ['p4', 'lowerBassBout', 450.643, 203.55, 385.682, 165.2, 419.952, 70.566, 1],
    ['p5', 'lowerTrebleBout', 288.67, -173.521, 375.46, -65.889, 133.078, -129.043, 1],
    ['p6', 'lowerHornCutaway', -68.351, -177.793, 113.249, -55.76, -65.675, -160.678, 1],
    ['p7', 'lowerHornCutaway', -57.833, -125.482, -61.383, -142.644, -36.359, -109.738, 1],
    ['p8', 'lowerHornCutaway', 6.678, -78.185, -14.954, -93.688, 27.154, -63.511, 0],
    ['p9', 'lowerHornCutaway', 10.719, -25.896, 49.317, -34.803, 7.367, -17.271, 1],
  ],
};

const RHOADS: TracedBody = {
  bodyLength: 554,
  bodyWidth: 410,
  priority: ['neckJoint', 'p2', 'p4', 'p3', 'p1', 'p5'],
  anchors: [
    ['neckJoint', 'neckTransition', 0, 0, 6.52, -33.187, -7.722, 39.306, 1],
    ['p1', 'upperBout', 18.52, 40.471, -0.053, 14.397, 182.238, 110.993, 1],
    ['p2', 'lowerBassBout', 549.182, 235.027, 379.142, 176.673, 454.6, 167.647, 1],
    ['p3', 'tail', 313.875, -17.023, 369.161, 86.349, 327.987, -76.234, 1],
    ['p4', 'lowerTrebleBout', 376.47, -175.2, 351.105, -121.006, 255.332, -135.78, 1],
    ['p5', 'lowerHornCutaway', 19.383, -39.828, 138.361, -85.107, 7.235, -18.805, 1],
  ],
};

const KING_V: TracedBody = {
  bodyLength: 501,
  bodyWidth: 434,
  priority: ['neckJoint', 'p2', 'p4', 'p3', 'p1', 'p5'],
  anchors: [
    ['neckJoint', 'neckTransition', 0, 0, -0.137, -39.289, 0.102, 29.178, 1],
    ['p1', 'upperHorn', 16.469, 42.262, -3.297, 22.686, 177.495, 101.893, 1],
    ['p2', 'lowerBassBout', 501.897, 216.831, 340.244, 158.718, 430.541, 150.811, 1],
    ['p3', 'tail', 320.715, -0.615, 363.749, 88.471, 361.992, -90.368, 1],
    ['p4', 'lowerTrebleBout', 500.782, -216.936, 431.874, -149.878, 339.632, -159.433, 1],
    ['p5', 'lowerHornCutaway', 16.846, -44.192, 177.362, -103.237, 0.376, -18.108, 1],
  ],
};

const WARRIOR: TracedBody = {
  bodyLength: 525,
  bodyWidth: 375,
  priority: ['neckJoint', 'p6', 'p13', 'p8', 'p1', 'p16', 'p4', 'p11', 'p2', 'p7', 'p9', 'p12', 'p3', 'p5', 'p10', 'p14', 'p15'],
  anchors: [
    ['neckJoint', 'neckTransition', 0, 0, 4.135, -7.865, -4.113, 7.822, 1],
    ['p1', 'upperBout', -12.516, 25.002, -8.215, 16.822, 15.515, 57.125, 1],
    ['p2', 'upperHorn', -63.402, 76.591, -46.562, 66.07, -56.347, 81.535, 1],
    ['p3', 'upperHorn', -33.493, 89.868, -42.119, 89.351, -14.892, 90.984, 0],
    ['p4', 'upperHorn', 61.748, 77.967, 39.497, 80.569, 157.022, 66.828, 0],
    ['p5', 'lowerBassBout', 239.095, 113.135, 154.614, 68.121, 299.603, 145.375, 0],
    ['p6', 'lowerBassBout', 419.712, 212.098, 359.377, 179.46, 430.644, 210.519, 1],
    ['p7', 'lowerBassBout', 452.509, 207.361, 441.577, 208.94, 389.7, 155.756, 1],
    ['p8', 'tail', 287.706, 7.871, 320.071, 83.394, 257.527, -62.549, 0],
    ['p9', 'lowerTrebleBout', 327.644, -146.482, 270.688, -99.665, 320.741, -148.429, 1],
    ['p10', 'lowerTrebleBout', 300.701, -154.082, 307.025, -153.293, 288.637, -155.588, 0],
    ['p11', 'lowerTrebleBout', 232.108, -133.404, 245.802, -138.369, 156.253, -105.906, 0],
    ['p12', 'hipContour', 82.679, -126.239, 162.841, -99.948, 43.033, -139.242, 0],
    ['p13', 'lowerHornCutaway', -37.786, -163.096, 2.186, -150.871, -49.199, -160.995, 1],
    ['p14', 'lowerHornCutaway', -72, -155.96, -60.625, -158.39, -43.062, -133.972, 1],
    ['p15', 'lowerHornCutaway', 34.132, -73.726, 14.668, -102.446, 47.219, -54.414, 0],
    ['p16', 'lowerHornCutaway', 13.541, -24.555, 29.034, -34.301, 9.226, -16.347, 1],
  ],
};

const HH = { neck: 'humbucker', middle: 'none', bridge: 'humbucker' } as const;
const V_CONTROLS = { volumes: 2, tones: 1, selector: 'toggle' } as const;
const METAL_NECK = { ...DEFAULT_NECK_PARAMS, fretCount: 24, neckInset: 60, neckLength: 470 };

function jacksonTemplate(opts: {
  id: string;
  name: string;
  description: string;
  body: TracedBody;
  headstockType: '6-inline' | 'pointy';
  bridgeType: 'floyd-rose' | 'tom';
}): BodyTemplate {
  const neck = opts.bridgeType === 'floyd-rose' ? { ...METAL_NECK, neckInset: 70 } : METAL_NECK;
  return {
    id: opts.id,
    name: opts.name,
    family: 'superstrat',
    description: opts.description,
    defaultParams: tracedDefaultParams(opts.body),
    paramMeta: tracedParamMeta(opts.body.anchors.length),
    buildAnchorSpecs: (params) => buildTracedSpecs(opts.body, params),
    defaultNeckParams: neck,
    presets: {
      pickups: HH,
      controls: V_CONTROLS,
      bridgeType: opts.bridgeType,
      headstockType: opts.headstockType,
    },
    defaultHardware: buildHardwareDefaults({
      joinX: neck.neckInset,
      neckParams: neck,
      bridgeType: opts.bridgeType,
      pickupSettings: HH,
      controlSettings: V_CONTROLS,
      neckBoltSpanX: 42,
      neckBoltSpanY: 16,
    }),
  };
}

export const SOLOIST_TEMPLATE = jacksonTemplate({
  id: 'soloist',
  name: 'Soloist-inspired',
  description: 'Traced superstrat: long bass horn, deep treble cutaway, flat tail, Floyd + two humbuckers.',
  body: SOLOIST,
  headstockType: '6-inline',
  bridgeType: 'floyd-rose',
});

export const KELLY_TEMPLATE = jacksonTemplate({
  id: 'kelly',
  name: 'Kelly-inspired',
  description: 'Traced offset V: long bass wing, hooked treble horn, sharp crotch.',
  body: KELLY,
  headstockType: 'pointy',
  bridgeType: 'tom',
});

export const RHOADS_TEMPLATE = jacksonTemplate({
  id: 'rhoads',
  name: 'Rhoads-inspired',
  description: 'Traced offset V: extra-long bass wing, shorter treble wing, deep crotch.',
  body: RHOADS,
  headstockType: 'pointy',
  bridgeType: 'tom',
});

export const KING_V_TEMPLATE = jacksonTemplate({
  id: 'king-v',
  name: 'King-V-inspired',
  description: 'Traced symmetrical pointed V: sharp tips, deep crotch, straight wings.',
  body: KING_V,
  headstockType: 'pointy',
  bridgeType: 'tom',
});

export const WARRIOR_TEMPLATE = jacksonTemplate({
  id: 'warrior',
  name: 'Warrior-inspired',
  description: 'Traced explorer-like: hooked bass wing, pointed treble horn, notched tail.',
  body: WARRIOR,
  headstockType: 'pointy',
  bridgeType: 'tom',
});

export const JACKSON_TEMPLATES: BodyTemplate[] = [
  SOLOIST_TEMPLATE,
  KELLY_TEMPLATE,
  RHOADS_TEMPLATE,
  KING_V_TEMPLATE,
  WARRIOR_TEMPLATE,
];
