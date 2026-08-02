// Extensible constraint engine.
//
// Each constraint is a pure function (DesignDocument) -> Violation[]. This is
// intentionally advisory-only for the MVP (surfaced in the sidebar as
// warnings) rather than a hard solver that auto-corrects geometry — adding
// auto-correction later only means changing how violations are consumed, not
// this module's shape. New constraints register by pushing onto
// `CONSTRAINTS`; nothing else needs to change.

import type { DesignDocument } from '../state/store';

export interface ConstraintViolation {
  constraintId: string;
  severity: 'warning' | 'error';
  message: string;
}

export type ConstraintFn = (doc: DesignDocument) => ConstraintViolation[];

export interface Constraint {
  id: string;
  label: string;
  evaluate: ConstraintFn;
}

const BRIDGE_CENTERLINE_TOLERANCE_MM = 15;
const MIN_WOOD_AROUND_NECK_POCKET_MM = 20;
const MIN_KNOB_TO_PICKUP_MM = 25;

function bridgeOnCenterline(doc: DesignDocument): ConstraintViolation[] {
  const y = doc.hardware.bridgeHumbucker.y;
  if (Math.abs(y) > BRIDGE_CENTERLINE_TOLERANCE_MM) {
    return [
      {
        constraintId: 'bridge-centerline',
        severity: 'warning',
        message: `Bridge is ${Math.abs(y).toFixed(1)}mm off centerline (tolerance ${BRIDGE_CENTERLINE_TOLERANCE_MM}mm).`,
      },
    ];
  }
  return [];
}

// Must match RoutesOverlay's pocket rectangle: the neck heel sits at the
// body's neckJoint anchor (see geometry/neckPlacement.ts — the neck extends
// in -x, AWAY from the body, from that point), and the pocket route is drawn
// a small overhang beyond it, not a full neckLength beyond it.
const NECK_POCKET_OVERHANG_MM = 6;

/** Approximates the neck pocket's edge nearest the pickup, in body-local x. */
function neckPocketRightEdge(doc: DesignDocument): number {
  const joinX = doc.bodyAnchors.find((a) => a.id === 'neckJoint')?.position.x ?? 0;
  return joinX + NECK_POCKET_OVERHANG_MM;
}

function minimumWoodAroundNeckPocket(doc: DesignDocument): ConstraintViolation[] {
  const pocketRightEdge = neckPocketRightEdge(doc);
  const pickupLeftEdge = doc.hardware.bridgeHumbucker.x - 18;
  const clearance = pickupLeftEdge - pocketRightEdge;
  if (clearance < MIN_WOOD_AROUND_NECK_POCKET_MM) {
    return [
      {
        constraintId: 'min-wood-neck-pocket',
        severity: clearance < 0 ? 'error' : 'warning',
        message: `Only ${clearance.toFixed(1)}mm of wood between the neck pocket and the pickup route (minimum ${MIN_WOOD_AROUND_NECK_POCKET_MM}mm).`,
      },
    ];
  }
  return [];
}

function pickupDoesNotOverlapNeckPocket(doc: DesignDocument): ConstraintViolation[] {
  const pocketRightEdge = neckPocketRightEdge(doc);
  const pickupLeftEdge = doc.hardware.bridgeHumbucker.x - 18;
  if (pickupLeftEdge < pocketRightEdge) {
    return [
      {
        constraintId: 'pickup-neck-overlap',
        severity: 'error',
        message: 'Pickup route physically overlaps the neck pocket.',
      },
    ];
  }
  return [];
}

function volumeKnobDistanceFromPickup(doc: DesignDocument): ConstraintViolation[] {
  const pickup = doc.hardware.bridgeHumbucker;
  const knob = doc.hardware.volumeKnob;
  const distance = Math.hypot(pickup.x - knob.x, pickup.y - knob.y);
  if (distance < MIN_KNOB_TO_PICKUP_MM) {
    return [
      {
        constraintId: 'knob-pickup-distance',
        severity: 'warning',
        message: `Volume knob is only ${distance.toFixed(1)}mm from the pickup (minimum ${MIN_KNOB_TO_PICKUP_MM}mm recommended).`,
      },
    ];
  }
  return [];
}

/** Pairwise bounding-circle overlap check across the hardware layout. */
function hardwareCollisionDetection(doc: DesignDocument): ConstraintViolation[] {
  const items: { name: string; x: number; y: number; r: number }[] = [
    { name: 'Bridge pickup', x: doc.hardware.bridgeHumbucker.x, y: doc.hardware.bridgeHumbucker.y, r: 18 },
    { name: 'Volume knob', x: doc.hardware.volumeKnob.x, y: doc.hardware.volumeKnob.y, r: 9 },
    ...doc.hardware.saddles.map((s, i) => ({ name: `Saddle ${i + 1}`, x: s.x, y: s.y, r: 3 })),
  ];
  const violations: ConstraintViolation[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance < a.r + b.r) {
        violations.push({
          constraintId: 'hardware-collision',
          severity: 'warning',
          message: `${a.name} overlaps ${b.name}.`,
        });
      }
    }
  }
  return violations;
}

export const CONSTRAINTS: Constraint[] = [
  { id: 'bridge-centerline', label: 'Bridge remains on centerline', evaluate: bridgeOnCenterline },
  { id: 'min-wood-neck-pocket', label: 'Minimum wood around neck pocket', evaluate: minimumWoodAroundNeckPocket },
  { id: 'pickup-neck-overlap', label: 'Pickup cannot overlap neck pocket', evaluate: pickupDoesNotOverlapNeckPocket },
  {
    id: 'knob-pickup-distance',
    label: 'Volume knob minimum distance from pickup',
    evaluate: volumeKnobDistanceFromPickup,
  },
  { id: 'hardware-collision', label: 'Hardware collision detection', evaluate: hardwareCollisionDetection },
];

export function evaluateConstraints(doc: DesignDocument): ConstraintViolation[] {
  return CONSTRAINTS.flatMap((c) => c.evaluate(doc));
}
