import { useDesignStore } from '../../state/store';
import { useSvgDrag } from '../../hooks/useSvgDrag';
import { snapToGrid } from '../../geometry/snapping';
import type { HardwareState } from '../../state/hardwareDefaults';
import type { HardwarePosition } from '../../geometry/types';
import type { PickupType, SelectorType } from '../../geometry/pickups';
import { PICKUP_DIMENSIONS, PICKUP_SLOTS } from '../../geometry/pickups';
import { stringSlotOffsets } from '../../geometry/bridgeTypes';
import { BridgeAssembly, SaddleGlyph } from './BridgeAssembly';

function DraggablePart({
  name,
  index,
  item,
  stageRef,
  render,
  /** When set, drag only updates that axis (other stays fixed). */
  axis = 'xy',
  /** Apply item.rotation on the outer transform (pickups). Selector rotates internally. */
  applyRotation = false,
}: {
  name: keyof HardwareState;
  index?: number;
  item: HardwarePosition;
  stageRef: React.RefObject<SVGGElement | null>;
  render: (selected: boolean) => React.ReactNode;
  axis?: 'xy' | 'x' | 'y';
  applyRotation?: boolean;
}) {
  const move = useDesignStore((s) => s.moveHardware);
  const select = useDesignStore((s) => s.select);
  const selected = useDesignStore((s) => s.selected);
  const settings = useDesignStore((s) => s.settings);
  const isSelected = selected?.kind === 'hardware' && selected.name === name && selected.index === index;

  const drag = useSvgDrag(stageRef, (p) => {
    const snapped = snapToGrid(p, settings.gridSize, settings.gridSnapEnabled);
    const point = {
      x: axis === 'y' ? item.x : snapped.x,
      y: axis === 'x' ? item.y : snapped.y,
    };
    move(name, point, index);
  });

  if (!item.visible) return null;
  const rotate = applyRotation ? ` rotate(${item.rotation})` : '';
  return (
    <g
      transform={`translate(${item.x},${item.y})${rotate}`}
      onPointerDown={(e) => {
        e.stopPropagation();
        select({ kind: 'hardware', name, index });
        if (!item.locked) drag(e);
      }}
      style={{
        cursor: item.locked ? 'not-allowed' : axis === 'x' ? 'ew-resize' : axis === 'y' ? 'ns-resize' : 'grab',
      }}
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
          fill="#efe6d0"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        <rect
          x={-halfAlong + 1.2}
          y={-halfAcross + 1.2}
          width={dims.along - 2.4}
          height={dims.across - 2.4}
          rx={Math.max(0, dims.radius - 1)}
          fill="#f7f1e0"
          opacity={0.55}
        />
        {poleYs.map((y, i) => (
          <circle key={i} cx={0} cy={y} r={1.6} fill="#6a6a68" stroke="#3a3a38" strokeWidth={0.25} />
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
          fill="#1a1916"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        {poleYs.map((y, i) => (
          <circle key={i} cx={0} cy={y} r={1.8} fill="#b8b4a8" stroke="#5a584e" strokeWidth={0.25} />
        ))}
        {/* Soapbar mounting screws between the poles and each end */}
        <circle cx={0} cy={-halfAcross + 5} r={1.4} fill="#8a8680" />
        <circle cx={0} cy={halfAcross - 5} r={1.4} fill="#8a8680" />
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
        fill="#161616"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      {poleYs.map((y, i) => (
        <g key={i}>
          <circle cx={-9} cy={y} r={1.7} fill="#d0ccc4" stroke="#6a6860" strokeWidth={0.25} />
          <circle cx={9} cy={y} r={1.7} fill="#a8a49c" stroke="#5a5850" strokeWidth={0.25} />
        </g>
      ))}
    </g>
  );
}

/** Metal dome knob with position indicator. ~19 mm diameter like a real pot knob. */
export function KnobShape({ selected, ghost = false }: { selected: boolean; ghost?: boolean }) {
  const stroke = selected ? '#ff5533' : ghost ? '#888' : '#000';
  return (
    <g opacity={ghost ? 0.4 : 1}>
      <circle r={9.5} fill={ghost ? 'none' : '#2a2a2a'} stroke={stroke} strokeWidth={selected ? 1.5 : 0.8} />
      {!ghost && (
        <>
          <circle r={7.2} fill="#3c3c3c" />
          <circle r={4.4} fill="#4e4e4e" />
          <circle cx={-2.2} cy={-2.6} r={2.1} fill="#6a6a6a" opacity={0.55} />
        </>
      )}
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={-8}
        stroke={ghost ? '#aaa' : '#e4e0d6'}
        strokeWidth={1.1}
        strokeLinecap="round"
      />
    </g>
  );
}

export function SelectorShape({
  type,
  rotation,
  selected,
  ghost = false,
}: {
  type: SelectorType;
  rotation: number;
  selected: boolean;
  ghost?: boolean;
}) {
  const stroke = selected ? '#ff5533' : ghost ? '#888' : '#000';
  if (type === 'toggle') {
    return (
      <g opacity={ghost ? 0.4 : 1}>
        <circle r={8} fill={ghost ? 'none' : '#c9b98d'} stroke={stroke} strokeWidth={selected ? 1.5 : 0.8} />
        {!ghost && <circle r={3.2} fill="#f2ead2" stroke="#555" strokeWidth={0.5} />}
      </g>
    );
  }
  // Blade switch: plate + travel slot + lever tip.
  return (
    <g transform={`rotate(${rotation})`} opacity={ghost ? 0.4 : 1}>
      <rect
        x={-7}
        y={-26}
        width={14}
        height={52}
        rx={4}
        fill={ghost ? 'none' : '#1c1c1c'}
        stroke={stroke}
        strokeWidth={selected ? 1.5 : 0.8}
      />
      {!ghost && (
        <>
          <rect x={-1.5} y={-19} width={3} height={38} rx={1.5} fill="#555" />
          <circle cx={0} cy={-13} r={3} fill="#e0dcc8" stroke="#333" strokeWidth={0.5} />
          <circle cx={0} cy={22} r={1.3} fill="#888" />
          <circle cx={0} cy={-22} r={1.3} fill="#888" />
        </>
      )}
    </g>
  );
}

/** Non-interactive ghost of front knobs/selector for back-view cavity alignment. */
export function ControlsGhost() {
  const hardware = useDesignStore((s) => s.hardware);
  const controlSettings = useDesignStore((s) => s.controlSettings);
  return (
    <g id="controls-ghost" style={{ pointerEvents: 'none' }}>
      {hardware.controls.map((c, i) =>
        c.visible ? (
          <g key={i} transform={`translate(${c.x},${c.y})`}>
            <KnobShape selected={false} ghost />
          </g>
        ) : null,
      )}
      {controlSettings.selector !== 'none' && hardware.selector.visible && (
        <g transform={`translate(${hardware.selector.x},${hardware.selector.y})`}>
          <SelectorShape
            type={controlSettings.selector}
            rotation={hardware.selector.rotation}
            selected={false}
            ghost
          />
        </g>
      )}
    </g>
  );
}

/** Bridge assembly (by type) + pickups + knobs + selector + saddles. */
export function Hardware({ stageRef }: { stageRef: React.RefObject<SVGGElement | null> }) {
  const hardware = useDesignStore((s) => s.hardware);
  const bridgeSettings = useDesignStore((s) => s.bridgeSettings);
  const pickupSettings = useDesignStore((s) => s.pickupSettings);
  const controlSettings = useDesignStore((s) => s.controlSettings);

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
            axis="x"
            applyRotation
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
          applyRotation
          render={(sel) => <SaddleGlyph settings={bridgeSettings} selected={sel} />}
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
            <circle r={4} fill="#b8b4ac" stroke={sel ? '#ff5533' : '#3a3834'} strokeWidth={sel ? 1.4 : 0.7} />
          )}
        />
      ))}
    </g>
  );
}
