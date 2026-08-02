import { anchorsToPathD } from '../../geometry/svgPath';
import { useDesignStore } from '../../state/store';

/** Renders the closed body outline as a single real vector path. Reused verbatim by the top and back views. */
export function BodyOutline({ variant }: { variant: 'top' | 'back' }) {
  const anchors = useDesignStore((s) => s.bodyAnchors);
  const d = anchorsToPathD(anchors);
  return (
    <g id="body-outline">
      <path
        d={d}
        fill={variant === 'top' ? 'var(--body-fill-top)' : 'var(--body-fill-back)'}
        stroke="var(--outline-stroke)"
        strokeWidth={1.2}
      />
    </g>
  );
}
