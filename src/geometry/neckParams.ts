export interface NeckParams {
  /** Scale length on the bass (low-E) side, mm. Default 647.7mm = 25.5in. */
  bassScale: number;
  /** Scale length on the treble (high-E) side, mm. Default 628.65mm = 24.75in. */
  trebleScale: number;
  /** The fret number that is perpendicular to the centerline (the "true" fret). */
  neutralFret: number;
  /** Total number of frets. */
  fretCount: number;
  /** Width of the neck at the nut, mm. */
  nutWidth: number;
  /** Width of the neck at the body heel/joint, mm. */
  heelWidth: number;
  /** Overall neck length from nut to heel, mm (used to taper nut->heel width). */
  neckLength: number;
  /** Angle of the neck centerline relative to the body centerline, degrees. */
  neckAngle: number;
  /** How far the heel sets into the body past the neckJoint (pocket mouth) anchor, mm. */
  neckInset: number;
}

export const DEFAULT_NECK_PARAMS: NeckParams = {
  bassScale: 647.7,
  trebleScale: 628.65,
  neutralFret: 8,
  fretCount: 22,
  nutWidth: 43,
  heelWidth: 56,
  neckLength: 460,
  neckAngle: 0,
  neckInset: 55,
};

/** Long-scale bass (34"). */
export const LONG_BASS_SCALE_MM = 863.6;
/** Short-scale bass (30"). */
export const SHORT_BASS_SCALE_MM = 762;
/** Slider ceiling for bass/treble scale (40"). */
export const MAX_SCALE_MM = 40 * 25.4;
/** Scales at or above this read as bass for spacing / template neck lock. */
export const BASS_SCALE_THRESHOLD_MM = 750;

export function isBassScale(mm: number): boolean {
  return mm >= BASS_SCALE_THRESHOLD_MM;
}

export interface NeckParamMeta {
  key: keyof NeckParams;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: 'mm' | 'deg' | 'count';
}

export const NECK_PARAM_META: NeckParamMeta[] = [
  { key: 'bassScale', label: 'Bass scale length', min: 600, max: MAX_SCALE_MM, step: 0.05, unit: 'mm' },
  { key: 'trebleScale', label: 'Treble scale length', min: 580, max: MAX_SCALE_MM, step: 0.05, unit: 'mm' },
  { key: 'neutralFret', label: 'Neutral fret', min: 0, max: 24, step: 1, unit: 'count' },
  { key: 'fretCount', label: 'Fret count', min: 20, max: 27, step: 1, unit: 'count' },
  { key: 'nutWidth', label: 'Nut width', min: 28, max: 56, step: 0.5, unit: 'mm' },
  { key: 'heelWidth', label: 'Heel width', min: 50, max: 80, step: 0.5, unit: 'mm' },
  { key: 'neckLength', label: 'Neck length', min: 400, max: 700, step: 1, unit: 'mm' },
  { key: 'neckAngle', label: 'Neck angle', min: -5, max: 5, step: 0.1, unit: 'deg' },
  { key: 'neckInset', label: 'Neck pocket inset', min: 0, max: 90, step: 1, unit: 'mm' },
];
