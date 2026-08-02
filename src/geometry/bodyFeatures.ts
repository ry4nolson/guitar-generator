// Semantic feature grouping over the 8 raw body anchors.
//
// The anchors themselves (geometry/types.ts) already carry semantic ids
// (`upperBoutApex`, `waistPoint`, ...) rather than anonymous indices — that
// part of the "semantic features, not anonymous points" requirement was
// already true of the underlying model. What was missing was a *feature*
// grouping above the anchor level so the UI can present "Upper Horn" /
// "Waist" / etc. as single selectable, editable units that each own one or
// more anchors and a matching subset of BodyParams sliders — this module is
// that grouping layer.

import type { BodyAnchorId } from './types';
import type { BodyParams } from './bodyParams';

export type BodyFeatureId =
  | 'global'
  | 'upperHorn'
  | 'upperBout'
  | 'waist'
  | 'lowerBout'
  | 'hipContour'
  | 'neckTransition';

export interface BodyFeatureMeta {
  id: BodyFeatureId;
  label: string;
  /** Anchors this feature owns/controls directly (for selection highlighting + filtered point overlay). */
  anchorIds: BodyAnchorId[];
  /** Which outline segments (by starting anchor id) visually belong to this feature, for click-to-select hit testing. */
  segmentStartIds: BodyAnchorId[];
  /** BodyParams sliders exposed when this feature is selected. */
  paramKeys: (keyof BodyParams)[];
}

export const BODY_FEATURES: BodyFeatureMeta[] = [
  {
    id: 'upperHorn',
    label: 'Upper Horn',
    anchorIds: ['neckJoint', 'hornShoulder'],
    segmentStartIds: ['neckJoint'],
    paramKeys: ['upperHornReach', 'upperHornRadius'],
  },
  {
    id: 'upperBout',
    label: 'Upper Bout',
    anchorIds: ['hornShoulder', 'upperBoutApex'],
    segmentStartIds: ['hornShoulder', 'upperBoutApex'],
    paramKeys: ['upperBoutRadius'],
  },
  {
    id: 'waist',
    label: 'Waist',
    anchorIds: ['waistPoint'],
    segmentStartIds: ['waistPoint'],
    paramKeys: ['waistDepth', 'waistPosition'],
  },
  {
    id: 'lowerBout',
    label: 'Lower Bout',
    anchorIds: ['lowerBoutBassApex', 'lowerBoutTrebleApex'],
    segmentStartIds: ['lowerBoutBassApex'],
    paramKeys: ['lowerBoutFullness'],
  },
  {
    id: 'hipContour',
    label: 'Hip Contour',
    anchorIds: ['hipCutoutPoint'],
    segmentStartIds: ['lowerBoutTrebleApex', 'hipCutoutPoint'],
    paramKeys: ['hipCutoutDepth', 'hipCutoutWidth', 'hipCutoutRadius'],
  },
  {
    id: 'neckTransition',
    label: 'Neck Transition',
    anchorIds: ['lowerHornShoulder'],
    segmentStartIds: ['lowerHornShoulder'],
    paramKeys: [],
  },
];

export const GLOBAL_FEATURE: BodyFeatureMeta = {
  id: 'global',
  label: 'Global',
  anchorIds: [],
  segmentStartIds: [],
  paramKeys: ['bodyLength', 'bodyWidth', 'forwardLean'],
};

export function featureForSegmentStart(anchorId: BodyAnchorId): BodyFeatureMeta | undefined {
  return BODY_FEATURES.find((f) => f.segmentStartIds.includes(anchorId));
}

export function featureById(id: BodyFeatureId): BodyFeatureMeta {
  if (id === 'global') return GLOBAL_FEATURE;
  return BODY_FEATURES.find((f) => f.id === id)!;
}
