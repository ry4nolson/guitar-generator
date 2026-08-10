import { anchorsToPathD } from '../../geometry/svgPath';
import { useDesignStore, DEFAULT_BODY_OPACITY } from '../../state/store';
import { useReferenceOverlayContext } from '../../state/ReferenceOverlayContext';

/** Renders the closed body outline as a single real vector path. Reused verbatim by the top and back views. */
export function BodyOutline({ variant }: { variant: 'top' | 'back' }) {
  const anchors = useDesignStore((s) => s.bodyAnchors);
  const bodyOpacity = useDesignStore((s) => s.settings.bodyOpacity ?? DEFAULT_BODY_OPACITY);
  const { hasVisibleImage } = useReferenceOverlayContext();
  const d = anchorsToPathD(anchors);
  const isBack = variant === 'back';

  // With a visible reference, keep the body see-through for tracing even if
  // opacity is still at the opaque default (e.g. image loaded before this setting existed).
  let fillOpacity = hasVisibleImage && bodyOpacity >= 0.99 ? 0.5 : bodyOpacity;
  if (isBack) fillOpacity = Math.min(0.72, fillOpacity);

  return (
    <g id="body-outline">
      <path
        d={d}
        fill={isBack ? 'var(--body-fill-back)' : 'var(--body-fill-top)'}
        fillOpacity={fillOpacity}
        stroke="var(--outline-stroke)"
        strokeWidth={1.2}
      />
    </g>
  );
}
