import { useDesignStore } from '../../state/store';
import { useSvgDrag } from '../../hooks/useSvgDrag';
import { snapToGrid } from '../../geometry/snapping';
import type { HardwareState } from '../../state/hardwareDefaults';
import type { HardwarePosition } from '../../geometry/types';
import type { PickupType, SelectorType } from '../../geometry/pickups';
import { PICKUP_DIMENSIONS, PICKUP_SLOTS } from '../../geometry/pickups';
import { stringSlotOffsets } from '../../geometry/bridgeTypes';
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

/** Real-footprint pickup shapes, centered on the pickup position. */
function PickupShape({ type, selected }: { type: PickupType; selected: boolean }) {
  const stringCount = useDesignStore((s) => s.bridgeSettings.stringCount ?? 6);
  const dims = PICKUP_DIMENSIONS[type];
  const halfAlong = dims.along / 2;
  const halfAcross = dims.across / 2;
  const stroke = selected ? '#ff5533' : '#000';
  const strokeWidth = selected ? 1.5 : 0.8;
  // Pole pieces track string spread at the pickup (~same outer as bridge spacing).
  const poleSpan = Math.min(dims.across - 6, 10 + stringCount * 7);
  const poleYs = stringSlotOffsets(poleSpan, stringCount);

  if (type === 'single-coil') {
    return (
      <g>
        <rect
          x={-halfAlong}
          y={-halfAcross}
          width={dims.along}
          height={dims.across}
          rx={dims.radius}
          fill="#e8e2d2"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        {poleYs.map((y, i) => (
          <circle key={i} cx={0} cy={y} r={1.6} fill="#7d7d7d" />
        ))}
      </g>
    );
  }

  if (type === 'p90') {
    return (
      <g>
        <rect
          x={-halfAlong}
          y={-halfAcross}
          width={dims.along}
          height={dims.across}
          rx={dims.radius}
          fill="#1d1d1a"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        {poleYs.map((y, i) => (
          <circle key={i} cx={0} cy={y} r={1.8} fill="#9a9a9a" />
        ))}
        {/* Soapbar mounting screws between the poles and each end */}
        <circle cx={0} cy={-halfAcross + 5} r={1.4} fill="#666" />
        <circle cx={0} cy={halfAcross - 5} r={1.4} fill="#666" />
      </g>
    );
  }

  // Humbucker: two coil rows of pole pieces.
  return (
    <g>
      <rect
        x={-halfAlong}
        y={-halfAcross}
        width={dims.along}
        height={dims.across}
        rx={dims.radius}
        fill="#181818"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      {poleYs.map((y, i) => (
        <g key={i}>
          <circle cx={-9} cy={y} r={1.7} fill="#b9b9b9" />
          <circle cx={9} cy={y} r={1.7} fill="#8f8f8f" />
        </g>
      ))}
    </g>
  );
}

/** Metal dome knob with position indicator. ~19 mm diameter like a real pot knob. */
function KnobShape({ selected }: { selected: boolean }) {
  return (
    <g>
      <circle r={9.5} fill="#2c2c2c" stroke={selected ? '#ff5533' : '#000'} strokeWidth={selected ? 1.5 : 0.8} />
      <circle r={6.8} fill="#3d3d3d" />
      <line x1={0} y1={0} x2={0} y2={-8} stroke="#d0d0d0" strokeWidth={1.1} strokeLinecap="round" />
    </g>
  );
}

function SelectorShape({ type, rotation, selected }: { type: SelectorType; rotation: number; selected: boolean }) {
  const stroke = selected ? '#ff5533' : '#000';
  if (type === 'toggle') {
    return (
      <g>
        <circle r={8} fill="#c9b98d" stroke={stroke} strokeWidth={selected ? 1.5 : 0.8} />
        <circle r={3.2} fill="#f2ead2" stroke="#555" strokeWidth={0.5} />
      </g>
    );
  }
  // Blade switch: plate + travel slot + lever tip.
  return (
    <g transform={`rotate(${rotation})`}>
      <rect x={-7} y={-26} width={14} height={52} rx={4} fill="#1c1c1c" stroke={stroke} strokeWidth={selected ? 1.5 : 0.8} />
      <rect x={-1.5} y={-19} width={3} height={38} rx={1.5} fill="#555" />
      <circle cx={0} cy={-13} r={3} fill="#e0dcc8" stroke="#333" strokeWidth={0.5} />
      <circle cx={0} cy={22} r={1.3} fill="#888" />
      <circle cx={0} cy={-22} r={1.3} fill="#888" />
    </g>
  );
}

/** Bridge assembly (by type) + pickups + knobs + selector + saddles. */
export function Hardware({ stageRef }: { stageRef: React.RefObject<SVGGElement | null> }) {
  const hardware = useDesignStore((s) => s.hardware);
  const bridgeType = useDesignStore((s) => s.bridgeSettings.type);
  const pickupSettings = useDesignStore((s) => s.pickupSettings);
  const controlSettings = useDesignStore((s) => s.controlSettings);

  const saddleFill = bridgeType === 'tom' ? '#e8e8e8' : bridgeType === 'floyd-rose' ? '#888' : '#c0c0c0';

  return (
    <g id="hardware">
      <BridgeAssembly />
      {hardware.pickups.map((p, i) => {
        const type = pickupSettings[PICKUP_SLOTS[i]];
        if (type === 'none') return null;
        return (
          <DraggablePart
            key={`pickup-${i}`}
            name="pickups"
            index={i}
            item={p}
            stageRef={stageRef}
            render={(sel) => <PickupShape type={type} selected={sel} />}
          />
        );
      })}
      {hardware.controls.map((c, i) => (
        <DraggablePart
          key={`control-${i}`}
          name="controls"
          index={i}
          item={c}
          stageRef={stageRef}
          render={(sel) => <KnobShape selected={sel} />}
        />
      ))}
      {controlSettings.selector !== 'none' && (
        <DraggablePart
          name="selector"
          item={hardware.selector}
          stageRef={stageRef}
          render={(sel) => (
            <SelectorShape type={controlSettings.selector} rotation={hardware.selector.rotation} selected={sel} />
          )}
        />
      )}
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
