import {
  useDesignStore,
  DEFAULT_BODY_COLOR,
  DEFAULT_FRETBOARD_COLOR,
} from '../../state/store';

export function ViewSettings() {
  const settings = useDesignStore((s) => s.settings);
  const setUnit = useDesignStore((s) => s.setUnit);
  const setGridSize = useDesignStore((s) => s.setGridSize);
  const setBodyColor = useDesignStore((s) => s.setBodyColor);
  const setFretboardColor = useDesignStore((s) => s.setFretboardColor);
  const toggleGridSnap = useDesignStore((s) => s.toggleGridSnap);
  const toggleShowPoints = useDesignStore((s) => s.toggleShowPoints);
  const toggleSymmetricEditing = useDesignStore((s) => s.toggleSymmetricEditing);
  const toggleDebugOverlay = useDesignStore((s) => s.toggleDebugOverlay);
  const setCanvasPadding = useDesignStore((s) => s.setCanvasPadding);

  const bodyColor = settings.bodyColor || DEFAULT_BODY_COLOR;
  const fretboardColor = settings.fretboardColor || DEFAULT_FRETBOARD_COLOR;

  return (
    <section className="sidebar-section">
      <h3>Appearance</h3>
      <label className="row-inline color-row">
        <span>Body</span>
        <input
          type="color"
          value={bodyColor}
          onChange={(e) => setBodyColor(e.target.value)}
          title="Body color"
        />
        <button type="button" className="text-btn" onClick={() => setBodyColor(DEFAULT_BODY_COLOR)}>
          Reset
        </button>
      </label>
      <label className="row-inline color-row">
        <span>Fretboard</span>
        <input
          type="color"
          value={fretboardColor}
          onChange={(e) => setFretboardColor(e.target.value)}
          title="Fretboard color"
        />
        <button type="button" className="text-btn" onClick={() => setFretboardColor(DEFAULT_FRETBOARD_COLOR)}>
          Reset
        </button>
      </label>

      <h3 style={{ marginTop: 14 }}>Editor settings</h3>
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
        Scroll = zoom at cursor · middle-click or space+drag = pan · Fit (F) / Reset View (0) · Esc clears
        selection · Delete resets a manual override (with confirm).
      </p>
    </section>
  );
}
