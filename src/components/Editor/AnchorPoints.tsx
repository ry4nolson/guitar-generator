import { useDesignStore } from '../../state/store';
import { useSvgDrag } from '../../hooks/useSvgDrag';
import { snapToGrid } from '../../geometry/snapping';
import type { BodyAnchorId } from '../../geometry/types';

/** One draggable anchor; Bézier handles only when this anchor (or its feature) is selected. */
function AnchorControl({
  id,
  stageRef,
  showHandles,
  dimmed,
}: {
  id: BodyAnchorId;
  stageRef: React.RefObject<SVGGElement | null>;
  showHandles: boolean;
  dimmed: boolean;
}) {
  const anchor = useDesignStore((s) => s.bodyAnchors.find((a) => a.id === id)!);
  const selected = useDesignStore((s) => s.selected);
  const select = useDesignStore((s) => s.select);
  const move = useDesignStore((s) => s.moveAnchorPoint);
  const settings = useDesignStore((s) => s.settings);

  const isSelected = (part: 'position' | 'handleIn' | 'handleOut') =>
    selected?.kind === 'anchor' && selected.id === id && selected.part === part;
  const isAnchorSelected = selected?.kind === 'anchor' && selected.id === id;

  const dragPosition = useSvgDrag(stageRef, (p) => {
    move(id, 'position', snapToGrid(p, settings.gridSize, settings.gridSnapEnabled));
  });
  const dragHandleIn = useSvgDrag(stageRef, (p) => {
    move(id, 'handleIn', snapToGrid(p, settings.gridSize, settings.gridSnapEnabled));
  });
  const dragHandleOut = useSvgDrag(stageRef, (p) => {
    move(id, 'handleOut', snapToGrid(p, settings.gridSize, settings.gridSnapEnabled));
  });

  const anchorColor = anchor.locked
    ? '#888'
    : isSelected('position') || isAnchorSelected
      ? '#ff5533'
      : dimmed
        ? '#5a7a9a'
        : '#2f8fff';
  const anchorRadius = isAnchorSelected || isSelected('position') ? 6 : dimmed ? 3.5 : 4.5;
  const opacity = dimmed ? 0.35 : 1;

  return (
    <g opacity={opacity}>
      {showHandles && (
        <>
          <line
            x1={anchor.position.x}
            y1={anchor.position.y}
            x2={anchor.handleIn.x}
            y2={anchor.handleIn.y}
            stroke="#ccc"
            strokeDasharray="2 2"
            strokeWidth={0.8}
          />
          <line
            x1={anchor.position.x}
            y1={anchor.position.y}
            x2={anchor.handleOut.x}
            y2={anchor.handleOut.y}
            stroke="#ccc"
            strokeDasharray="2 2"
            strokeWidth={0.8}
          />
          <circle
            cx={anchor.handleIn.x}
            cy={anchor.handleIn.y}
            r={isSelected('handleIn') ? 4.5 : 3.5}
            fill={isSelected('handleIn') ? '#ff5533' : '#7bd389'}
            stroke="#111"
            strokeWidth={0.5}
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
            r={isSelected('handleOut') ? 4.5 : 3.5}
            fill={isSelected('handleOut') ? '#ff5533' : '#7bd389'}
            stroke="#111"
            strokeWidth={0.5}
            onPointerDown={(e) => {
              e.stopPropagation();
              select({ kind: 'anchor', id, part: 'handleOut' });
              dragHandleOut(e);
            }}
            style={{ cursor: 'grab' }}
          />
        </>
      )}
      <circle
        cx={anchor.position.x}
        cy={anchor.position.y}
        r={anchorRadius}
        fill={anchorColor}
        stroke={isAnchorSelected ? '#fff' : '#111'}
        strokeWidth={isAnchorSelected ? 1.2 : 0.6}
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
  const anchors = useDesignStore((s) => s.bodyAnchors);
  const showPoints = useDesignStore((s) => s.settings.showPointsAndHandles);
  const selected = useDesignStore((s) => s.selected);
  if (!showPoints) return null;

  const visible = onlyIds ? anchors.filter((a) => onlyIds.includes(a.id)) : anchors;
  const selectedFeatureId =
    selected?.kind === 'feature' ? selected.id : selected?.kind === 'anchor' ? anchors.find((a) => a.id === selected.id)?.featureId : undefined;
  const selectedAnchorId = selected?.kind === 'anchor' ? selected.id : null;
  const hasSelection = selected?.kind === 'anchor' || selected?.kind === 'feature';

  return (
    <g id="anchor-points">
      {visible.map((a) => {
        const inSelectedFeature = selectedFeatureId !== undefined && a.featureId === selectedFeatureId;
        const isThisAnchor = selectedAnchorId === a.id;
        const showHandles = isThisAnchor || (selected?.kind === 'feature' && inSelectedFeature);
        const dimmed = hasSelection && !inSelectedFeature && !isThisAnchor;
        return (
          <AnchorControl
            key={a.id}
            id={a.id}
            stageRef={stageRef}
            showHandles={!!showHandles}
            dimmed={dimmed}
          />
        );
      })}
    </g>
  );
}
