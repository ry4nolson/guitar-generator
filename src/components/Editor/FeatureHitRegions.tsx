import { useMemo, useRef } from 'react';
import { useDesignStore } from '../../state/store';
import { BODY_FEATURE_LABELS } from '../../geometry/bodyFeatures';
import { distinctFeatureIds, featureSegmentsPathD } from '../../geometry/svgPath';
import { clientToLocalPoint } from '../../hooks/useSvgDrag';

/**
 * Invisible (wide-stroke) click targets over each named body region, plus a
 * thin colored highlight redrawn on top of whichever feature is currently
 * selected. This is what makes "clicking a body region selects that
 * feature" work without splitting the single filled body-outline path into
 * per-segment fills (which would risk seams).
 *
 * Fully generic over the active template's anchor set: which features exist
 * and which anchors/segments they own is read directly off the current
 * anchors' own `featureId`, not a hardcoded per-template table.
 *
 * A plain click selects the feature; a drag moves every anchor the feature
 * owns together (whole-feature editing), via `moveFeatureAnchors`.
 */
export function FeatureHitRegions({ stageRef }: { stageRef: React.RefObject<SVGGElement | null> }) {
  const anchors = useDesignStore((s) => s.bodyAnchors);
  const selected = useDesignStore((s) => s.selected);
  const select = useDesignStore((s) => s.select);
  const moveFeatureAnchors = useDesignStore((s) => s.moveFeatureAnchors);
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);

  const featurePaths = useMemo(() => {
    const ids = distinctFeatureIds(anchors);
    return ids.map((featureId) => ({
      featureId,
      d: featureSegmentsPathD(anchors, featureId),
      anchorIds: anchors.filter((a) => a.featureId === featureId).map((a) => a.id),
    }));
  }, [anchors]);

  return (
    <g id="feature-hit-regions">
      {featurePaths.map(({ featureId, d, anchorIds }) => {
        const isSelected = selected?.kind === 'feature' && selected.id === featureId;
        return (
          <path
            key={featureId}
            d={d}
            fill="none"
            stroke={isSelected ? '#ff8844' : 'transparent'}
            strokeWidth={isSelected ? 2.5 : 14}
            style={{ cursor: 'grab', pointerEvents: 'stroke' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              select({ kind: 'feature', id: featureId });
              const group = stageRef.current;
              if (!group) return;
              const startLocal = clientToLocalPoint(e.nativeEvent, group);
              dragOrigin.current = startLocal;
              (e.target as Element).setPointerCapture?.(e.pointerId);

              const handleMove = (ev: PointerEvent) => {
                if (!dragOrigin.current) return;
                const p = clientToLocalPoint(ev, group);
                const dx = p.x - dragOrigin.current.x;
                const dy = p.y - dragOrigin.current.y;
                if (dx === 0 && dy === 0) return;
                dragOrigin.current = p;
                moveFeatureAnchors(anchorIds, dx, dy);
              };
              const handleUp = () => {
                dragOrigin.current = null;
                window.removeEventListener('pointermove', handleMove);
                window.removeEventListener('pointerup', handleUp);
              };
              window.addEventListener('pointermove', handleMove);
              window.addEventListener('pointerup', handleUp);
            }}
          >
            <title>{BODY_FEATURE_LABELS[featureId]}</title>
          </path>
        );
      })}
    </g>
  );
}
