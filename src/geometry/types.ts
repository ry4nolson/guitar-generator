// Shared geometry types used across the app.
// All linear units are millimeters (mm) internally, regardless of display unit.

import type { BodyFeatureId } from './bodyFeatures';

export interface Point {
  x: number;
  y: number;
}

/** How a Bezier anchor's two handles relate to each other and to its neighbors. */
export type ContinuityMode =
  /** Independent in/out tangent directions — a genuine corner/kink (e.g. Flying V wing tips). */
  | 'corner'
  /** In/out handles are collinear (tangent continuous, "C1"), with independently authored lengths. */
  | 'tangent'
  /** Collinear handles with direction auto-derived from neighboring anchors (Catmull-Rom-style), approximating curvature continuity ("C2-like"). */
  | 'smooth';

/** Stable per-template anchor identifier, e.g. "upperHornTip". Anchor sets differ between templates. */
export type BodyAnchorId = string;

/** A single named anchor on the body outline, with independent in/out Bezier handles. */
export interface BodyAnchor {
  /** Stable identifier within the active template, e.g. "upperHornTip". Order matters: anchors form a closed loop. */
  id: BodyAnchorId;
  /** Which semantic feature owns this anchor (drives sidebar grouping, click-to-select, and per-feature reset). */
  featureId: BodyFeatureId;
  /** The continuity mode this anchor was authored with (kept for the debug overlay + informational display). */
  continuity: ContinuityMode;
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
  /** If true, dragging one handle mirrors the opposite handle to preserve tangency ("smooth point" editing behavior). Defaults from continuity !== 'corner'. */
  mirrorHandles: boolean;
  /**
   * When symmetric editing is on, pair this point with its centerline reflection.
   * Unset / true = paired. False = edit this point (and its old partner) alone.
   */
  pairOpposite?: boolean;
}

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
