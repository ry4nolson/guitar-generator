// Store-facing API on top of the generic per-feature engine (bodyEngine.ts)
// and the template registry (templates/index.ts). This module owns the
// "persistent geometry, not regenerated from scratch" rule: recomputing from
// params always preserves any anchor the user has manually edited or locked.

import type { BodyAnchor } from './types';
import type { BodyFeatureId } from './bodyFeatures';
import { applyForwardLean, buildAnchorsFromSpecs } from './bodyEngine';
import type { BodyTemplate } from './templates';

/** Build the full anchor set for a template + params (no manual overrides applied). */
export function computeParametricAnchors(template: BodyTemplate, params: Record<string, number>): BodyAnchor[] {
  const specs = template.buildAnchorSpecs(params);
  const built = buildAnchorsFromSpecs(specs);

  const pivot = built.find((a) => a.id === 'neckJoint')?.position;
  if (!pivot) {
    throw new Error(`Template "${template.id}" must include an anchor with id "neckJoint".`);
  }

  const leanDeg = params.forwardLean ?? 0;
  const pairOpposite = template.pairOppositeByDefault === true;
  return built.map((a) => ({
    ...a,
    pairOpposite,
    position: applyForwardLean(a.position, leanDeg, pivot),
    handleIn: applyForwardLean(a.handleIn, leanDeg, pivot),
    handleOut: applyForwardLean(a.handleOut, leanDeg, pivot),
  }));
}

/**
 * Recompute anchors from params, but preserve any anchor the user has
 * manually edited (and its lock state). This is the core rule that keeps the
 * model persistent instead of being regenerated on every slider change.
 * Only meaningful when the template hasn't changed (anchor ids still match);
 * switching templates goes through a separate full-replace action instead.
 */
export function recomputeAnchorsPreservingEdits(
  template: BodyTemplate,
  params: Record<string, number>,
  existing: BodyAnchor[],
): BodyAnchor[] {
  const fresh = computeParametricAnchors(template, params);
  return fresh.map((freshAnchor) => {
    const prior = existing.find((a) => a.id === freshAnchor.id);
    if (prior && (prior.manuallyEdited || prior.locked)) {
      return prior;
    }
    if (prior) {
      return {
        ...freshAnchor,
        locked: prior.locked,
        mirrorHandles: prior.mirrorHandles,
        pairOpposite: prior.pairOpposite,
      };
    }
    return freshAnchor;
  });
}

/** Reset a single anchor back to its parametric position. */
export function resetAnchor(
  id: string,
  template: BodyTemplate,
  params: Record<string, number>,
  existing: BodyAnchor[],
): BodyAnchor[] {
  const fresh = computeParametricAnchors(template, params);
  const freshAnchor = fresh.find((a) => a.id === id)!;
  return existing.map((a) =>
    a.id === id
      ? { ...freshAnchor, locked: a.locked, mirrorHandles: a.mirrorHandles, pairOpposite: a.pairOpposite }
      : a,
  );
}

/**
 * Reset EVERY anchor owned by a feature back to its parametric position —
 * "resetting an individual feature should reset all anchors and handles
 * owned by that feature", not just one point.
 */
export function resetFeature(
  featureId: BodyFeatureId,
  template: BodyTemplate,
  params: Record<string, number>,
  existing: BodyAnchor[],
): BodyAnchor[] {
  const fresh = computeParametricAnchors(template, params);
  const freshById = new Map(fresh.map((a) => [a.id, a] as const));
  return existing.map((a) => {
    if (a.featureId !== featureId) return a;
    const freshAnchor = freshById.get(a.id);
    if (!freshAnchor) return a;
    return { ...freshAnchor, locked: a.locked, mirrorHandles: a.mirrorHandles, pairOpposite: a.pairOpposite };
  });
}
