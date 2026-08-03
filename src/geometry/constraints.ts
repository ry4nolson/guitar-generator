// Extensible constraint engine.
//
// Each constraint is a pure function (DesignDocument) -> Violation[]. This is
// intentionally advisory-only for the MVP (surfaced in the sidebar as
// warnings) rather than a hard solver that auto-corrects geometry — adding
// auto-correction later only means changing how violations are consumed, not
// this module's shape. New constraints register by pushing onto
// `CONSTRAINTS`; nothing else needs to change.

import type { DesignDocument } from '../state/store';
import { saddleClusterCenter } from './strings';
import { neckJoinPoint } from './scaleLock';
import { PICKUP_DIMENSIONS, PICKUP_SLOTS, PICKUP_SLOT_LABELS, controlKnobLabel } from './pickups';
import type { PickupType } from './pickups';

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

/** Active pickups as (slot label, position, real dimensions). */
function activePickups(doc: DesignDocument) {
  return doc.hardware.pickups.flatMap((p, i) => {
    const slot = PICKUP_SLOTS[i];
    const type = doc.pickupSettings[slot];
    if (type === 'none' || !p.visible) return [];
    return [{ slot, label: `${PICKUP_SLOT_LABELS[slot]} pickup`, position: p, dims: PICKUP_DIMENSIONS[type as PickupType] }];
  });
}

function bridgeOnCenterline(doc: DesignDocument): ConstraintViolation[] {
  const y = saddleClusterCenter(doc.hardware.saddles).y;
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

// Must match RoutesOverlay's pocket rectangle: the neck heel sits neckInset mm
// past the body's neckJoint (pocket mouth) anchor (see geometry/scaleLock.ts),
// and the pocket route is drawn a small overhang beyond the heel.
const NECK_POCKET_OVERHANG_MM = 6;

/** Approximates the neck pocket's edge nearest the pickups, in body-local x. */
function neckPocketRightEdge(doc: DesignDocument): number {
  return neckJoinPoint(doc.bodyAnchors, doc.neckParams).x + NECK_POCKET_OVERHANG_MM;
}

function minimumWoodAroundNeckPocket(doc: DesignDocument): ConstraintViolation[] {
  const pocketRightEdge = neckPocketRightEdge(doc);
  const violations: ConstraintViolation[] = [];
  for (const p of activePickups(doc)) {
    const pickupLeftEdge = p.position.x - p.dims.along / 2;
    const clearance = pickupLeftEdge - pocketRightEdge;
    if (clearance >= 0 && clearance < MIN_WOOD_AROUND_NECK_POCKET_MM) {
      violations.push({
        constraintId: 'min-wood-neck-pocket',
        severity: 'warning',
        message: `Only ${clearance.toFixed(1)}mm of wood between the neck pocket and the ${p.label.toLowerCase()} route (minimum ${MIN_WOOD_AROUND_NECK_POCKET_MM}mm).`,
      });
    }
  }
  return violations;
}

function pickupDoesNotOverlapNeckPocket(doc: DesignDocument): ConstraintViolation[] {
  const pocketRightEdge = neckPocketRightEdge(doc);
  const violations: ConstraintViolation[] = [];
  for (const p of activePickups(doc)) {
    const pickupLeftEdge = p.position.x - p.dims.along / 2;
    if (pickupLeftEdge < pocketRightEdge) {
      violations.push({
        constraintId: 'pickup-neck-overlap',
        severity: 'error',
        message: `${p.label} route physically overlaps the neck pocket.`,
      });
    }
  }
  return violations;
}

function knobDistanceFromPickups(doc: DesignDocument): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];
  doc.hardware.controls.forEach((knob, i) => {
    if (!knob.visible) return;
    for (const p of activePickups(doc)) {
      const distance = Math.hypot(p.position.x - knob.x, p.position.y - knob.y);
      if (distance < MIN_KNOB_TO_PICKUP_MM) {
        violations.push({
          constraintId: 'knob-pickup-distance',
          severity: 'warning',
          message: `${controlKnobLabel(doc.controlSettings, i)} knob is only ${distance.toFixed(1)}mm from the ${p.label.toLowerCase()} (minimum ${MIN_KNOB_TO_PICKUP_MM}mm recommended).`,
        });
      }
    }
  });
  return violations;
}

/** Pairwise bounding-circle overlap check across the hardware layout. */
function hardwareCollisionDetection(doc: DesignDocument): ConstraintViolation[] {
  const items: { name: string; x: number; y: number; r: number }[] = [
    ...activePickups(doc).map((p) => ({
      name: p.label,
      x: p.position.x,
      y: p.position.y,
      // Along-axis half-extent: pickups sitting side by side across strings is fine.
      r: p.dims.along / 2,
    })),
    ...doc.hardware.controls
      .filter((c) => c.visible)
      .map((c, i) => ({ name: `${controlKnobLabel(doc.controlSettings, i)} knob`, x: c.x, y: c.y, r: 10 })),
    ...(doc.controlSettings.selector !== 'none' && doc.hardware.selector.visible
      ? [{ name: 'Selector', x: doc.hardware.selector.x, y: doc.hardware.selector.y, r: 8 }]
      : []),
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
    label: 'Knob minimum distance from pickups',
    evaluate: knobDistanceFromPickups,
  },
  { id: 'hardware-collision', label: 'Hardware collision detection', evaluate: hardwareCollisionDetection },
];

export function evaluateConstraints(doc: DesignDocument): ConstraintViolation[] {
  return CONSTRAINTS.flatMap((c) => c.evaluate(doc));
}
