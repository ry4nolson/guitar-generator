import { useMemo } from 'react';
import { anchorsToPathD } from '../../geometry/svgPath';
import { useDesignStore, DEFAULT_BODY_COLOR, DEFAULT_BODY_OPACITY } from '../../state/store';
import { useReferenceOverlayContext } from '../../state/ReferenceOverlayContext';
import { bodyFinishStops } from '../../geometry/color';

/** Renders the closed body outline as a single real vector path. Reused verbatim by the top and back views. */
export function BodyOutline({ variant }: { variant: 'top' | 'back' }) {
  const anchors = useDesignStore((s) => s.bodyAnchors);
  const bodyColor = useDesignStore((s) => s.settings.bodyColor) || DEFAULT_BODY_COLOR;
  const bodyOpacity = useDesignStore((s) => s.settings.bodyOpacity ?? DEFAULT_BODY_OPACITY);
  const { hasVisibleImage } = useReferenceOverlayContext();
  const d = anchorsToPathD(anchors);
  const isBack = variant === 'back';

  // With a visible reference, keep the body see-through for tracing even if
  // opacity is still at the opaque default (e.g. image loaded before this setting existed).
  let fillOpacity = hasVisibleImage && bodyOpacity >= 0.99 ? 0.5 : bodyOpacity;
  if (isBack) fillOpacity = Math.min(0.72, fillOpacity);

  const finish = useMemo(() => {
    const stops = bodyFinishStops(bodyColor);
    let sx = 0;
    let sy = 0;
    for (const a of anchors) {
      sx += a.position.x;
      sy += a.position.y;
    }
    const n = anchors.length || 1;
    const cx = sx / n;
    const cy = sy / n;
    let r = 80;
    for (const a of anchors) {
      r = Math.max(r, Math.hypot(a.position.x - cx, a.position.y - cy));
    }
    return { ...stops, cx, cy, r };
  }, [anchors, bodyColor]);

  const gradId = isBack ? 'body-finish-back' : 'body-finish-top';

  return (
    <g id="body-outline">
      <defs>
        <radialGradient
          id={gradId}
          cx={finish.cx}
          cy={finish.cy}
          r={finish.r}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={isBack ? finish.mid : finish.center} />
          <stop offset="48%" stopColor={finish.mid} />
          <stop offset="100%" stopColor={finish.rim} />
        </radialGradient>
      </defs>
      <path
        d={d}
        fill={`url(#${gradId})`}
        fillOpacity={fillOpacity}
        stroke="var(--outline-stroke)"
        strokeWidth={0.7}
      />
    </g>
  );
}
