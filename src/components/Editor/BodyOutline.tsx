import { anchorsToPathD } from '../../geometry/svgPath';
import { useDesignStore } from '../../state/store';

/** Renders the closed body outline as a single real vector path. Reused verbatim by the top and back views. */
export function BodyOutline({ variant }: { variant: 'top' | 'back' }) {
  const anchors = useDesignStore((s) => s.bodyAnchors);
  const d = anchorsToPathD(anchors);
  const isBack = variant === 'back';
  return (
    <g id="body-outline">
      <path
        d={d}
        fill={isBack ? 'var(--body-fill-back)' : 'var(--body-fill-top)'}
        fillOpacity={isBack ? 0.72 : 1}
        stroke="var(--outline-stroke)"
        strokeWidth={1.2}
      />
    </g>
  );
}
