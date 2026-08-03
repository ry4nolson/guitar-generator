import { useMemo } from 'react';
import { useDesignStore } from '../../state/store';
import { useSvgDrag } from '../../hooks/useSvgDrag';
import { snapToGrid } from '../../geometry/snapping';
import { headstockAnchorsToBody } from '../../geometry/headstock';
import { useNeckGeometry } from '../../hooks/useNeckGeometry';

/** Draggable headstock outline points — nut corners stay locked. */
export function HeadstockAnchors({ stageRef }: { stageRef: React.RefObject<SVGGElement | null> }) {
  const anchors = useDesignStore((s) => s.headstockAnchors);
  const showPoints = useDesignStore((s) => s.settings.showPointsAndHandles);
  const selected = useDesignStore((s) => s.selected);
  const select = useDesignStore((s) => s.select);
  const move = useDesignStore((s) => s.moveHeadstockAnchor);
  const settings = useDesignStore((s) => s.settings);
  const headstockType = useDesignStore((s) => s.headstockSettings.type);
  const { neckParams, joinPoint } = useNeckGeometry();

  const bodyAnchors = useMemo(
    () => headstockAnchorsToBody(anchors, neckParams, { joinPoint }),
    [anchors, neckParams, joinPoint],
  );

  if (!showPoints || headstockType === 'headless' || bodyAnchors.length === 0) return null;

  return (
    <g id="headstock-anchors">
      {bodyAnchors.map((a) => {
        const isSelected = selected?.kind === 'headstock' && selected.id === a.id;
        const partSelected = (part: 'position' | 'handleIn' | 'handleOut') =>
          selected?.kind === 'headstock' && selected.id === a.id && selected.part === part;

        return (
          <HeadstockAnchorControl
            key={a.id}
            id={a.id}
            locked={a.locked}
            position={a.position}
            handleIn={a.handleIn}
            handleOut={a.handleOut}
            isSelected={!!isSelected}
            partSelected={partSelected}
            showHandles={!!isSelected && !a.locked}
            stageRef={stageRef}
            onSelect={(part) => select({ kind: 'headstock', id: a.id, part })}
            onMove={(part, p) =>
              move(a.id, part, snapToGrid(p, settings.gridSize, settings.gridSnapEnabled))
            }
          />
        );
      })}
    </g>
  );
}

function HeadstockAnchorControl({
  id,
  locked,
  position,
  handleIn,
  handleOut,
  isSelected,
  partSelected,
  showHandles,
  stageRef,
  onSelect,
  onMove,
}: {
  id: string;
  locked: boolean;
  position: { x: number; y: number };
  handleIn: { x: number; y: number };
  handleOut: { x: number; y: number };
  isSelected: boolean;
  partSelected: (part: 'position' | 'handleIn' | 'handleOut') => boolean;
  showHandles: boolean;
  stageRef: React.RefObject<SVGGElement | null>;
  onSelect: (part: 'position' | 'handleIn' | 'handleOut') => void;
  onMove: (part: 'position' | 'handleIn' | 'handleOut', p: { x: number; y: number }) => void;
}) {
  const dragPosition = useSvgDrag(stageRef, (p) => onMove('position', p));
  const dragHandleIn = useSvgDrag(stageRef, (p) => onMove('handleIn', p));
  const dragHandleOut = useSvgDrag(stageRef, (p) => onMove('handleOut', p));

  const color = locked ? '#888' : isSelected || partSelected('position') ? '#ff5533' : '#9b59d0';
  const r = isSelected || partSelected('position') ? 5.5 : 4;

  return (
    <g>
      {showHandles && (
        <>
          <line
            x1={position.x}
            y1={position.y}
            x2={handleIn.x}
            y2={handleIn.y}
            stroke="#ccc"
            strokeDasharray="2 2"
            strokeWidth={0.8}
          />
          <line
            x1={position.x}
            y1={position.y}
            x2={handleOut.x}
            y2={handleOut.y}
            stroke="#ccc"
            strokeDasharray="2 2"
            strokeWidth={0.8}
          />
          <circle
            cx={handleIn.x}
            cy={handleIn.y}
            r={partSelected('handleIn') ? 4.5 : 3.5}
            fill={partSelected('handleIn') ? '#ff5533' : '#7bd389'}
            stroke="#111"
            strokeWidth={0.5}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelect('handleIn');
              dragHandleIn(e);
            }}
            style={{ cursor: 'grab' }}
          />
          <circle
            cx={handleOut.x}
            cy={handleOut.y}
            r={partSelected('handleOut') ? 4.5 : 3.5}
            fill={partSelected('handleOut') ? '#ff5533' : '#7bd389'}
            stroke="#111"
            strokeWidth={0.5}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelect('handleOut');
              dragHandleOut(e);
            }}
            style={{ cursor: 'grab' }}
          />
        </>
      )}
      <circle
        cx={position.x}
        cy={position.y}
        r={r}
        fill={color}
        stroke={isSelected ? '#fff' : '#111'}
        strokeWidth={isSelected ? 1.2 : 0.6}
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect('position');
          if (!locked) dragPosition(e);
        }}
        style={{ cursor: locked ? 'not-allowed' : 'grab' }}
      >
        <title>{locked ? `${id} (locked to nut)` : id}</title>
      </circle>
    </g>
  );
}
