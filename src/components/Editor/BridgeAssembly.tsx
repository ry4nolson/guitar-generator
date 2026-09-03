import { useMemo } from 'react';
import { useDesignStore } from '../../state/store';
import { saddleClusterCenter } from '../../geometry/strings';
import { bridgePlateSvgMarkup, saddleGlyphSvgMarkup, saddleHitSize } from '../../geometry/bridgeGlyph';
import type { BridgeSettings } from '../../geometry/bridgeTypes';

/** Non-interactive plate / posts drawn under the saddles for the active bridge type. */
export function BridgeAssembly() {
  const saddles = useDesignStore((s) => s.hardware.saddles);
  const bridge = useDesignStore((s) => s.bridgeSettings);
  const center = useMemo(() => saddleClusterCenter(saddles), [saddles]);
  const rotation = saddles[0]?.rotation ?? 0;
  const markup = bridgePlateSvgMarkup(bridge);

  return (
    <g
      id="bridge-assembly"
      transform={`translate(${center.x}, ${center.y}) rotate(${rotation})`}
      style={{ pointerEvents: 'none' }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

/** Type-specific saddle at the string contact point (local origin). */
export function SaddleGlyph({ settings, selected }: { settings: BridgeSettings; selected: boolean }) {
  const hit = saddleHitSize(settings);
  const markup = saddleGlyphSvgMarkup(settings, { selected });
  return (
    <g>
      <g dangerouslySetInnerHTML={{ __html: markup }} />
      <rect x={-hit.along / 2} y={-hit.across / 2} width={hit.along} height={hit.across} fill="transparent" />
    </g>
  );
}
