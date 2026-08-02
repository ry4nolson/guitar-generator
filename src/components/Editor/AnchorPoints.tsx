import { useDesignStore } from '../../state/store';
import { useSvgDrag } from '../../hooks/useSvgDrag';
import { snapToGrid } from '../../geometry/snapping';
import type { BodyAnchorId } from '../../geometry/types';

/** One draggable anchor + its two handle grips and connecting handle lines. */
function AnchorControl({ id, stageRef }: { id: BodyAnchorId; stageRef: React.RefObject<SVGGElement | null> }) {
  const anchor = useDesignStore((s) => s.bodyAnchors.find((a) => a.id === id)!);
  const selected = useDesignStore((s) => s.selected);
  const select = useDesignStore((s) => s.select);
  const move = useDesignStore((s) => s.moveAnchorPoint);
  const settings = useDesignStore((s) => s.settings);

  const isSelected = (part: 'position' | 'handleIn' | 'handleOut') =>
    selected?.kind === 'anchor' && selected.id === id && selected.part === part;

  const dragPosition = useSvgDrag(stageRef, (p) => {
    move(id, 'position', snapToGrid(p, settings.gridSize, settings.gridSnapEnabled));
  });
  const dragHandleIn = useSvgDrag(stageRef, (p) => {
    move(id, 'handleIn', snapToGrid(p, settings.gridSize, settings.gridSnapEnabled));
  });
  const dragHandleOut = useSvgDrag(stageRef, (p) => {
    move(id, 'handleOut', snapToGrid(p, settings.gridSize, settings.gridSnapEnabled));
  });

  const anchorColor = anchor.locked ? '#888' : isSelected('position') ? '#ff5533' : '#2f8fff';

  return (
    <g>
      <line
        x1={anchor.position.x}
        y1={anchor.position.y}
        x2={anchor.handleIn.x}
        y2={anchor.handleIn.y}
        stroke="#aaa"
        strokeDasharray="2 2"
        strokeWidth={0.6}
      />
      <line
        x1={anchor.position.x}
        y1={anchor.position.y}
        x2={anchor.handleOut.x}
        y2={anchor.handleOut.y}
        stroke="#aaa"
        strokeDasharray="2 2"
        strokeWidth={0.6}
      />
      <circle
        cx={anchor.handleIn.x}
        cy={anchor.handleIn.y}
        r={3}
        fill={isSelected('handleIn') ? '#ff5533' : '#7bd389'}
        onPointerDown={(e) => {
          e.stopPropagation();
          select({ kind: 'anchor', id, part: 'handleIn' });
          dragHandleIn(e);
        }}
        style={{ cursor: 'grab' }}
      />
      <circle
        cx={anchor.handleOut.x}
        cy={anchor.handleOut.y}
        r={3}
        fill={isSelected('handleOut') ? '#ff5533' : '#7bd389'}
        onPointerDown={(e) => {
          e.stopPropagation();
          select({ kind: 'anchor', id, part: 'handleOut' });
          dragHandleOut(e);
        }}
        style={{ cursor: 'grab' }}
      />
      <circle
        cx={anchor.position.x}
        cy={anchor.position.y}
        r={4.5}
        fill={anchorColor}
        stroke="#111"
        strokeWidth={0.6}
        onPointerDown={(e) => {
          e.stopPropagation();
          select({ kind: 'anchor', id, part: 'position' });
          if (!anchor.locked) dragPosition(e);
        }}
        style={{ cursor: anchor.locked ? 'not-allowed' : 'grab' }}
      />
    </g>
  );
}

export function AnchorPoints({
  stageRef,
  onlyIds,
}: {
  stageRef: React.RefObject<SVGGElement | null>;
  /** Restrict which anchors are rendered (e.g. only the selected feature's anchors) to reduce clutter. */
  onlyIds?: BodyAnchorId[];
}) {
  // Select the anchors array itself (stable reference unless anchors actually
  // change) and derive ids in the render body — mapping inside the selector
  // would allocate a new array every call and break Zustand's snapshot
  // equality check, causing an infinite render loop.
  const anchors = useDesignStore((s) => s.bodyAnchors);
  const showPoints = useDesignStore((s) => s.settings.showPointsAndHandles);
  if (!showPoints) return null;
  const visible = onlyIds ? anchors.filter((a) => onlyIds.includes(a.id)) : anchors;
  return (
    <g id="anchor-points">
      {visible.map((a) => (
        <AnchorControl key={a.id} id={a.id} stageRef={stageRef} />
      ))}
    </g>
  );
}
