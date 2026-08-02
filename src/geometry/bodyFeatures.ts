// The fixed set of semantic body-feature ids used by every template. A
// template's anchors each declare which feature they belong to; the anchor
// SET, topology, and count are template-specific, but the feature vocabulary
// (and therefore the sidebar/debug-overlay grouping) stays stable across
// templates. Not every template has to use every feature (e.g. the Flying V
// template has no rearWaist/hipContour anchors).

export type BodyFeatureId =
  | 'global'
  | 'neckTransition'
  | 'upperHorn'
  | 'upperBout'
  | 'rearWaist'
  | 'lowerBassBout'
  | 'lowerTrebleBout'
  | 'hipContour'
  | 'lowerHornCutaway'
  | 'tail';

export const BODY_FEATURE_IDS: Exclude<BodyFeatureId, 'global'>[] = [
  'neckTransition',
  'upperHorn',
  'upperBout',
  'rearWaist',
  'lowerBassBout',
  'lowerTrebleBout',
  'hipContour',
  'lowerHornCutaway',
  'tail',
];

export const BODY_FEATURE_LABELS: Record<BodyFeatureId, string> = {
  global: 'Global',
  neckTransition: 'Neck Transition',
  upperHorn: 'Upper Horn',
  upperBout: 'Upper Bout',
  rearWaist: 'Rear Waist',
  lowerBassBout: 'Lower Bass Bout',
  lowerTrebleBout: 'Lower Treble Bout',
  hipContour: 'Hip Contour',
  lowerHornCutaway: 'Lower Horn / Cutaway',
  tail: 'Tail',
};
