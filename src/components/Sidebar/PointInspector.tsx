import { useDesignStore } from '../../state/store';

/** Shows the coordinates of whatever anchor/handle/hardware is currently selected, with numeric editing, lock, mirror, and reset controls. */
export function PointInspector() {
  const selected = useDesignStore((s) => s.selected);
  const anchors = useDesignStore((s) => s.bodyAnchors);
  const headstockAnchors = useDesignStore((s) => s.headstockAnchors);
  const symmetricEditing = useDesignStore((s) => s.settings.symmetricEditing);
  const toggleLock = useDesignStore((s) => s.toggleAnchorLock);
  const toggleMirror = useDesignStore((s) => s.toggleMirrorHandles);
  const togglePairOpposite = useDesignStore((s) => s.togglePairOpposite);
  const reset = useDesignStore((s) => s.resetAnchorPoint);
  const move = useDesignStore((s) => s.moveAnchorPoint);

  if (!selected) {
    return (
      <section className="sidebar-section" id="sidebar-inspector">
        <h3>Selected point</h3>
        <p className="muted">Click an anchor, handle, or body region to inspect it.</p>
      </section>
    );
  }

  if (selected.kind === 'anchor') {
    const anchor = anchors.find((a) => a.id === selected.id)!;
    const point = anchor[selected.part];
    return (
      <section className="sidebar-section" id="sidebar-inspector">
        <h3>Selected point</h3>
        <p>
          <strong>{anchor.id}</strong> · {selected.part}
        </p>
        <div className="coord-inputs">
          <label>
            x (mm)
            <input
              type="number"
              step={0.1}
              value={Math.round(point.x * 100) / 100}
              disabled={anchor.locked}
              onChange={(e) => move(anchor.id, selected.part, { x: parseFloat(e.target.value) || 0, y: point.y })}
            />
          </label>
          <label>
            y (mm)
            <input
              type="number"
              step={0.1}
              value={Math.round(point.y * 100) / 100}
              disabled={anchor.locked}
              onChange={(e) => move(anchor.id, selected.part, { x: point.x, y: parseFloat(e.target.value) || 0 })}
            />
          </label>
        </div>
        <div className="button-row">
          <button onClick={() => toggleLock(anchor.id)}>{anchor.locked ? 'Unlock point' : 'Lock point'}</button>
          <button onClick={() => reset(anchor.id)}>Reset point</button>
        </div>
        <label className="row-inline checkbox">
          <span>Mirror handles (smooth tangent)</span>
          <input type="checkbox" checked={anchor.mirrorHandles} onChange={() => toggleMirror(anchor.id)} />
        </label>
        {symmetricEditing && (
          <label className="row-inline checkbox">
            <span>Pair with opposite side</span>
            <input
              type="checkbox"
              checked={anchor.pairOpposite !== false}
              onChange={() => togglePairOpposite(anchor.id)}
            />
          </label>
        )}
        <p className="muted">
          Arrow keys nudge the anchor position (Shift = 10x step).
          {symmetricEditing
            ? anchor.pairOpposite === false
              ? ' This point is unpaired — drag it without moving the opposite side.'
              : ' Symmetric editing is on — uncheck Pair with opposite side to edit this point alone.'
            : ''}
        </p>
      </section>
    );
  }

  if (selected.kind === 'headstock') {
    const anchor = headstockAnchors.find((a) => a.id === selected.id);
    if (!anchor) return null;
    return (
      <section className="sidebar-section" id="sidebar-inspector">
        <h3>Headstock point</h3>
        <p>
          <strong>{anchor.id}</strong>
          {anchor.locked ? ' · locked to nut' : ` · ${selected.part}`}
        </p>
        <p className="muted">
          {anchor.locked
            ? 'Nut corners stay fixed to the nut face.'
            : `Drag on the canvas, or use arrow keys (Shift = 10×).${
                symmetricEditing ? ' Symmetric editing mirrors the opposite side.' : ''
              }`}
        </p>
      </section>
    );
  }

  if (selected.kind === 'feature') {
    return (
      <section className="sidebar-section" id="sidebar-inspector">
        <h3>Selected point</h3>
        <p>
          <strong>Feature:</strong> {selected.id}
        </p>
        <p className="muted">Drag the highlighted outline to move the whole feature, or use the panel below.</p>
      </section>
    );
  }

  if (selected.kind === 'reference') {
    return (
      <section className="sidebar-section" id="sidebar-inspector">
        <h3>Selected point</h3>
        <p>
          <strong>Reference overlay</strong>
        </p>
        <p className="muted">Use the Reference overlay panel to adjust opacity, scale, flip, and placement.</p>
      </section>
    );
  }

  return (
    <section className="sidebar-section" id="sidebar-inspector">
      <h3>Selected point</h3>
      <p>
        <strong>{String(selected.name)}</strong>
        {selected.index !== undefined ? ` #${selected.index + 1}` : ''}
      </p>
      <p className="muted">Use the Hardware panel to edit coordinates precisely.</p>
    </section>
  );
}
