import { useDesignStore } from '../../state/store';

export function ViewSettings() {
  const settings = useDesignStore((s) => s.appSettings);
  const setUnit = useDesignStore((s) => s.setUnit);
  const setGridSize = useDesignStore((s) => s.setGridSize);
  const toggleGridSnap = useDesignStore((s) => s.toggleGridSnap);
  const toggleShowPoints = useDesignStore((s) => s.toggleShowPoints);
  const toggleSymmetricEditing = useDesignStore((s) => s.toggleSymmetricEditing);
  const toggleDebugOverlay = useDesignStore((s) => s.toggleDebugOverlay);
  const setCanvasPadding = useDesignStore((s) => s.setCanvasPadding);

  return (
    <section className="sidebar-section">
      <h3>Editor settings</h3>
      <div className="row-inline">
        <span>Units</span>
        <div className="segmented">
          <button className={settings.unit === 'mm' ? 'active' : ''} onClick={() => setUnit('mm')}>
            mm
          </button>
          <button className={settings.unit === 'in' ? 'active' : ''} onClick={() => setUnit('in')}>
            in
          </button>
        </div>
      </div>
      <div className="row-inline">
        <span>Grid size (mm)</span>
        <input
          type="number"
          min={1}
          max={50}
          value={settings.gridSize}
          onChange={(e) => setGridSize(parseFloat(e.target.value) || 1)}
        />
      </div>
      <div className="row-inline">
        <span>Fit padding (mm)</span>
        <input
          type="number"
          min={0}
          max={200}
          value={settings.canvasPadding}
          onChange={(e) => setCanvasPadding(parseFloat(e.target.value) || 0)}
        />
      </div>
      <label className="row-inline checkbox">
        <span>Snap to grid</span>
        <input type="checkbox" checked={settings.gridSnapEnabled} onChange={toggleGridSnap} />
      </label>
      <label className="row-inline checkbox">
        <span>Show points &amp; handles</span>
        <input type="checkbox" checked={settings.showPointsAndHandles} onChange={toggleShowPoints} />
      </label>
      <label className="row-inline checkbox">
        <span>Symmetric editing</span>
        <input
          type="checkbox"
          checked={settings.symmetricEditing ?? true}
          onChange={toggleSymmetricEditing}
        />
      </label>
      <p className="muted">
        When on, dragging a body or headstock point/handle also moves its mirror across the
        centerline. Turn off for cutaways and other one-sided edits.
      </p>
      <label className="row-inline checkbox">
        <span>Debug overlay (names / tangents / continuity)</span>
        <input type="checkbox" checked={settings.showDebugOverlay} onChange={toggleDebugOverlay} />
      </label>
      <p className="muted">
        Pinch or mouse-wheel = zoom · two-finger scroll or right-drag = pan · space+drag /
        middle-click = pan · Fit (F) / Reset View (0) · Esc clears selection · Delete resets a
        manual override (with confirm).
      </p>
    </section>
  );
}
