// Parametric controls for the body outline. Changing any of these recomputes
// the position of every anchor that has NOT been manually edited by the user
// (see geometry/bodyModel.ts). Manually edited anchors are frozen until reset.

export interface BodyParams {
  /** Overall body length, neck joint to tail, mm. Target ~430mm. */
  bodyLength: number;
  /** Overall body width across the widest bout, mm. Target ~325mm. */
  bodyWidth: number;
  /** Forward-leaning visual stance in degrees; shears the silhouette along the centerline. */
  forwardLean: number;
  /** How far the upper horn tip projects beyond the neck joint, mm. */
  upperHornReach: number;
  /** Radius of curvature at the upper horn tip, mm (bigger = rounder horn). */
  upperHornRadius: number;
  /** Radius of curvature of the main upper bout shoulder, mm. */
  upperBoutRadius: number;
  /** How deep the waist pinches in from the widest bout line, mm. */
  waistDepth: number;
  /** Longitudinal position of the waist pinch, 0 (near neck) - 1 (near tail). */
  waistPosition: number;
  /** Depth of the hip/forearm cutout concave notch, mm. */
  hipCutoutDepth: number;
  /** Longitudinal width/span of the hip cutout notch, mm. */
  hipCutoutWidth: number;
  /** Radius of curvature of the hip cutout notch, mm. */
  hipCutoutRadius: number;
  /** Fullness (0-1.3) of the lower bout relative to the upper bout — >1 makes the lower bout rounder/fuller. */
  lowerBoutFullness: number;
}

export const DEFAULT_BODY_PARAMS: BodyParams = {
  bodyLength: 430,
  bodyWidth: 325,
  forwardLean: 6,
  upperHornReach: 46,
  upperHornRadius: 30,
  upperBoutRadius: 150,
  waistDepth: 28,
  waistPosition: 0.52,
  hipCutoutDepth: 34,
  hipCutoutWidth: 120,
  hipCutoutRadius: 60,
  lowerBoutFullness: 0.92,
};

export interface BodyParamMeta {
  key: keyof BodyParams;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: 'mm' | 'deg' | 'ratio';
}

export const BODY_PARAM_META: BodyParamMeta[] = [
  { key: 'bodyLength', label: 'Body length', min: 360, max: 480, step: 1, unit: 'mm' },
  { key: 'bodyWidth', label: 'Body width', min: 260, max: 360, step: 1, unit: 'mm' },
  { key: 'forwardLean', label: 'Forward lean', min: -10, max: 20, step: 0.5, unit: 'deg' },
  { key: 'upperHornReach', label: 'Upper horn reach', min: 10, max: 80, step: 1, unit: 'mm' },
  { key: 'upperHornRadius', label: 'Upper horn radius', min: 10, max: 60, step: 1, unit: 'mm' },
  { key: 'upperBoutRadius', label: 'Upper bout radius', min: 80, max: 220, step: 1, unit: 'mm' },
  { key: 'waistDepth', label: 'Waist depth', min: 0, max: 60, step: 1, unit: 'mm' },
  { key: 'waistPosition', label: 'Waist position', min: 0.3, max: 0.75, step: 0.01, unit: 'ratio' },
  { key: 'hipCutoutDepth', label: 'Hip cutout depth', min: 0, max: 70, step: 1, unit: 'mm' },
  { key: 'hipCutoutWidth', label: 'Hip cutout width', min: 40, max: 200, step: 1, unit: 'mm' },
  { key: 'hipCutoutRadius', label: 'Hip cutout radius', min: 10, max: 120, step: 1, unit: 'mm' },
  { key: 'lowerBoutFullness', label: 'Lower bout fullness', min: 0.6, max: 1.3, step: 0.01, unit: 'ratio' },
];
