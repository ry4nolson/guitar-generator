// Shared geometry types used across the app.
// All linear units are millimeters (mm) internally, regardless of display unit.

export interface Point {
  x: number;
  y: number;
}

/** A single named anchor on the body outline, with independent in/out Bezier handles. */
export interface BodyAnchor {
  /** Stable identifier, e.g. "upperBoutApex". Order matters: anchors form a closed loop. */
  id: BodyAnchorId;
  /** Absolute position in mm, body-local coordinate space. */
  position: Point;
  /** Incoming control handle (absolute position in mm) — controls the curve arriving at this anchor. */
  handleIn: Point;
  /** Outgoing control handle (absolute position in mm) — controls the curve leaving this anchor. */
  handleOut: Point;
  /** If true, the user has directly edited this anchor/handles; parametric recompute must not overwrite it. */
  manuallyEdited: boolean;
  /** If true, the point cannot be dragged in the editor. */
  locked: boolean;
  /** If true (default), dragging one handle mirrors the opposite handle to preserve tangency ("smooth point"). */
  mirrorHandles: boolean;
}

/**
 * The 8 anchors that define the closed body outline. Anchors are listed in
 * winding order; the segment between consecutive anchors (wrapping at the end)
 * carries the "named region" label used throughout the UI and exports.
 */
export const BODY_ANCHOR_IDS = [
  'neckJoint',
  'hornShoulder',
  'upperBoutApex',
  'waistPoint',
  'lowerBoutBassApex',
  'lowerBoutTrebleApex',
  'hipCutoutPoint',
  'lowerHornShoulder',
] as const;
export type BodyAnchorId = (typeof BODY_ANCHOR_IDS)[number];

/** Named region for the segment that starts at the anchor with the same array index. */
export const BODY_SEGMENT_NAMES: Record<BodyAnchorId, string> = {
  neckJoint: 'upper horn',
  hornShoulder: 'upper bout',
  upperBoutApex: 'rear upper bout',
  waistPoint: 'rear waist',
  lowerBoutBassApex: 'lower rear bout',
  lowerBoutTrebleApex: 'hip cutout',
  hipCutoutPoint: 'lower horn',
  lowerHornShoulder: 'neck-side cutaway',
};

export interface FretPoint {
  fretNumber: number;
  /** Distance from nut along the bass-side edge, in mm. */
  bassDistance: number;
  /** Distance from nut along the treble-side edge, in mm. */
  trebleDistance: number;
  /** Fret line endpoint on the bass side (body-local coords, mm). */
  bassPoint: Point;
  /** Fret line endpoint on the treble side (body-local coords, mm). */
  treblePoint: Point;
}

export interface HardwarePosition {
  x: number;
  y: number;
  rotation: number;
  visible: boolean;
  locked: boolean;
}

export type Unit = 'mm' | 'in';
export type ViewMode = 'top' | 'back' | 'construction';
export type Theme = 'dark' | 'light';
