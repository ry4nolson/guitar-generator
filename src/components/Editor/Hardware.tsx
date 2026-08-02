import { useDesignStore } from '../../state/store';
import { useSvgDrag } from '../../hooks/useSvgDrag';
import { snapToGrid } from '../../geometry/snapping';
import type { HardwareState } from '../../state/hardwareDefaults';
import type { HardwarePosition } from '../../geometry/types';
import { BridgeAssembly } from './BridgeAssembly';

function DraggablePart({
  name,
  index,
  item,
  stageRef,
  render,
}: {
  name: keyof HardwareState;
  index?: number;
  item: HardwarePosition;
  stageRef: React.RefObject<SVGGElement | null>;
  render: (selected: boolean) => React.ReactNode;
}) {
  const move = useDesignStore((s) => s.moveHardware);
  const select = useDesignStore((s) => s.select);
  const selected = useDesignStore((s) => s.selected);
  const settings = useDesignStore((s) => s.settings);
  const isSelected = selected?.kind === 'hardware' && selected.name === name && selected.index === index;

  const drag = useSvgDrag(stageRef, (p) => {
    move(name, snapToGrid(p, settings.gridSize, settings.gridSnapEnabled), index);
  });

  if (!item.visible) return null;
  return (
    <g
      transform={`translate(${item.x},${item.y})`}
      onPointerDown={(e) => {
        e.stopPropagation();
        select({ kind: 'hardware', name, index });
        if (!item.locked) drag(e);
      }}
      style={{ cursor: item.locked ? 'not-allowed' : 'grab' }}
    >
      {render(isSelected)}
    </g>
  );
}

/** Bridge assembly (by type) + pickup + volume + saddles. */
export function Hardware({ stageRef }: { stageRef: React.RefObject<SVGGElement | null> }) {
  const hardware = useDesignStore((s) => s.hardware);
  const bridgeType = useDesignStore((s) => s.bridgeSettings.type);

  const saddleFill = bridgeType === 'tom' ? '#e8e8e8' : bridgeType === 'floyd-rose' ? '#888' : '#c0c0c0';

  return (
    <g id="hardware">
      <BridgeAssembly />
      <DraggablePart
        name="bridgeHumbucker"
        item={hardware.bridgeHumbucker}
        stageRef={stageRef}
        render={(sel) => (
          <rect
            x={-18}
            y={-11}
            width={36}
            height={22}
            rx={4}
            fill="#181818"
            stroke={sel ? '#ff5533' : '#000'}
            strokeWidth={sel ? 1.5 : 0.8}
          />
        )}
      />
      <DraggablePart
        name="volumeKnob"
        item={hardware.volumeKnob}
        stageRef={stageRef}
        render={(sel) => (
          <circle r={9} fill="#3a3a3a" stroke={sel ? '#ff5533' : '#000'} strokeWidth={sel ? 1.5 : 0.8} />
        )}
      />
      {hardware.saddles.map((s, i) => (
        <DraggablePart
          key={i}
          name="saddles"
          index={i}
          item={s}
          stageRef={stageRef}
          render={(sel) => (
            <rect
              x={-6}
              y={-2.5}
              width={12}
              height={5}
              rx={1.5}
              fill={saddleFill}
              stroke={sel ? '#ff5533' : '#000'}
              strokeWidth={sel ? 1.2 : 0.6}
            />
          )}
        />
      ))}
    </g>
  );
}

/** Four individual neck ferrules/bolt markers — not a solid rectangular neck plate. */
export function NeckBolts({ stageRef }: { stageRef: React.RefObject<SVGGElement | null> }) {
  const bolts = useDesignStore((s) => s.hardware.neckBolts);
  return (
    <g id="neck-bolts">
      {bolts.map((b, i) => (
        <DraggablePart
          key={i}
          name="neckBolts"
          index={i}
          item={b}
          stageRef={stageRef}
          render={(sel) => (
            <circle r={4} fill="#999" stroke={sel ? '#ff5533' : '#000'} strokeWidth={sel ? 1.4 : 0.7} />
          )}
        />
      ))}
    </g>
  );
}
