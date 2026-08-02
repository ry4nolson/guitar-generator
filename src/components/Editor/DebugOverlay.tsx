import { useDesignStore } from '../../state/store';
import { BODY_FEATURE_IDS } from '../../geometry/bodyFeatures';
import type { ContinuityMode } from '../../geometry/types';
import type { BodyFeatureId } from '../../geometry/bodyFeatures';

// Fixed, distinguishable colors per feature so ownership reads at a glance
// regardless of which template/anchor-count is active.
const FEATURE_COLORS: Record<BodyFeatureId, string> = {
  global: '#999999',
  neckTransition: '#8b93a1',
  upperHorn: '#ff6b6b',
  upperBout: '#ffb400',
  rearWaist: '#2ecc71',
  lowerBassBout: '#2fbfd6',
  lowerTrebleBout: '#5c7cff',
  hipContour: '#c264ff',
  lowerHornCutaway: '#ff5ec4',
  tail: '#e0c341',
};

const CONTINUITY_ABBREV: Record<ContinuityMode, string> = {
  corner: 'corner',
  tangent: 'C1',
  smooth: 'C2~',
};

/**
 * Development/QA aid: anchor ids, feature ownership (color-coded), tangent
 * direction arrows (fixed visual length, independent of actual handle
 * length so they stay legible at any zoom/handle-length combination), and
 * continuity mode labels. Used to hunt down flat spots, unwanted bumps near
 * joins, cusps in regions meant to be smooth, and handles that visually
 * cross a neighboring anchor.
 *
 * Deliberately does NOT render a sampled curvature comb — that's a
 * meaningfully bigger rendering feature (needs per-point curvature
 * estimation + perpendicular offset sampling along each segment) and was
 * de-scoped for this pass; see the geometry-decisions report for the
 * follow-up note.
 */
export function DebugOverlay() {
  const anchors = useDesignStore((s) => s.bodyAnchors);

  return (
    <g id="debug-overlay" style={{ pointerEvents: 'none' }}>
      {BODY_FEATURE_IDS.map((featureId) => {
        const color = FEATURE_COLORS[featureId];
        const owned = anchors.filter((a) => a.featureId === featureId);
        return (
          <g key={featureId}>
            {owned.map((a) => {
              const tangentScale = 22;
              const inDir = { x: a.handleIn.x - a.position.x, y: a.handleIn.y - a.position.y };
              const inLen = Math.hypot(inDir.x, inDir.y) || 1;
              const outDir = { x: a.handleOut.x - a.position.x, y: a.handleOut.y - a.position.y };
              const outLen = Math.hypot(outDir.x, outDir.y) || 1;
              const inTip = {
                x: a.position.x + (inDir.x / inLen) * tangentScale,
                y: a.position.y + (inDir.y / inLen) * tangentScale,
              };
              const outTip = {
                x: a.position.x + (outDir.x / outLen) * tangentScale,
                y: a.position.y + (outDir.y / outLen) * tangentScale,
              };
              return (
                <g key={a.id}>
                  {/* Fixed-length tangent direction arrows (distinct from the actual, variable-length handles). */}
                  <line x1={a.position.x} y1={a.position.y} x2={inTip.x} y2={inTip.y} stroke={color} strokeWidth={1.2} opacity={0.85} />
                  <line x1={a.position.x} y1={a.position.y} x2={outTip.x} y2={outTip.y} stroke={color} strokeWidth={1.2} opacity={0.85} />
                  <circle cx={outTip.x} cy={outTip.y} r={1.6} fill={color} />
                  <circle cx={a.position.x} cy={a.position.y} r={2.4} fill="none" stroke={color} strokeWidth={1} />
                  {/* Text is drawn with a compensating scale(1,-1) so it reads upright despite the stage's own y-flip (and, for templates with a mirrored x, the x-flip too). */}
                  <g transform={`translate(${a.position.x + 5}, ${a.position.y}) scale(-1,-1)`}>
                    <text x={0} y={-3} fontSize={7} fill={color} style={{ fontFamily: 'monospace' }}>
                      {a.id}
                    </text>
                    <text x={0} y={5} fontSize={6} fill={color} opacity={0.75} style={{ fontFamily: 'monospace' }}>
                      {CONTINUITY_ABBREV[a.continuity]}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}
