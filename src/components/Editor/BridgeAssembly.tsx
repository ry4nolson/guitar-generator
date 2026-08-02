import { useMemo } from 'react';
import { useDesignStore } from '../../state/store';
import { saddleClusterCenter } from '../../geometry/strings';
import type { BridgeSettings } from '../../geometry/bridgeTypes';

/** Non-interactive plate / posts drawn under the saddles for the active bridge type. */
export function BridgeAssembly() {
  const saddles = useDesignStore((s) => s.hardware.saddles);
  const bridge = useDesignStore((s) => s.bridgeSettings);
  const center = useMemo(() => saddleClusterCenter(saddles), [saddles]);

  return (
    <g id="bridge-assembly" transform={`translate(${center.x}, ${center.y})`} style={{ pointerEvents: 'none' }}>
      {bridge.type === 'hardtail' && <HardtailPlate settings={bridge} />}
      {bridge.type === 'tom' && <TomAssembly settings={bridge} />}
      {bridge.type === 'floyd-rose' && <FloydPlate settings={bridge} />}
      {bridge.type === 'strat-tremolo' && <StratTremPlate settings={bridge} />}
    </g>
  );
}

function HardtailPlate({ settings }: { settings: BridgeSettings }) {
  const half = settings.stringSpacing / 2 + 6;
  const depth = settings.saddleTravel + 8;
  return (
    <g>
      <rect x={-8} y={-half} width={depth} height={half * 2} rx={2} fill="#2a2a2a" stroke="#111" strokeWidth={0.8} />
      <rect x={-4} y={-half + 2} width={3} height={half * 2 - 4} fill="#1a1a1a" />
    </g>
  );
}

function TomAssembly({ settings }: { settings: BridgeSettings }) {
  const halfPost = settings.postSpacing / 2;
  const halfBridge = settings.stringSpacing / 2 + 4;
  return (
    <g>
      {/* Bridge bar */}
      <rect x={-5} y={-halfBridge} width={10} height={halfBridge * 2} rx={2} fill="#c8c8c8" stroke="#333" strokeWidth={0.7} />
      <circle cx={0} cy={-halfPost} r={3.5} fill="#888" stroke="#222" strokeWidth={0.6} />
      <circle cx={0} cy={halfPost} r={3.5} fill="#888" stroke="#222" strokeWidth={0.6} />
      {/* Stopbar behind the bridge (toward the tail = +x in body space) */}
      <rect
        x={settings.stopbarOffset - 4}
        y={-halfBridge + 2}
        width={8}
        height={halfBridge * 2 - 4}
        rx={2}
        fill="#b0b0b0"
        stroke="#333"
        strokeWidth={0.7}
      />
      <circle cx={settings.stopbarOffset} cy={-halfPost + 4} r={2.8} fill="#777" />
      <circle cx={settings.stopbarOffset} cy={halfPost - 4} r={2.8} fill="#777" />
    </g>
  );
}

function FloydPlate({ settings }: { settings: BridgeSettings }) {
  const half = settings.stringSpacing / 2 + 8;
  const depth = settings.saddleTravel + 14;
  return (
    <g>
      <rect x={-10} y={-half} width={depth} height={half * 2} rx={1.5} fill="#1f1f1f" stroke="#000" strokeWidth={0.9} />
      {/* Fine-tuner row toward the tail */}
      {[-2, -1, 0, 1, 2, 3].map((i) => (
        <circle key={i} cx={depth - 14} cy={(i - 0.5) * (settings.stringSpacing / 5)} r={2.2} fill="#555" stroke="#111" strokeWidth={0.4} />
      ))}
      {/* Pivot posts */}
      <circle cx={-6} cy={-half + 4} r={2} fill="#666" />
      <circle cx={-6} cy={half - 4} r={2} fill="#666" />
    </g>
  );
}

function StratTremPlate({ settings }: { settings: BridgeSettings }) {
  const half = settings.stringSpacing / 2 + 7;
  const depth = settings.saddleTravel + 10;
  return (
    <g>
      <rect x={-6} y={-half} width={depth} height={half * 2} rx={1} fill="#d8d8d8" stroke="#444" strokeWidth={0.7} />
      {/* Six mounting screws along the front (nut-facing) edge */}
      {[-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((i) => (
        <circle key={i} cx={-3} cy={i * (settings.stringSpacing / 5)} r={1.6} fill="#666" stroke="#222" strokeWidth={0.35} />
      ))}
    </g>
  );
}
