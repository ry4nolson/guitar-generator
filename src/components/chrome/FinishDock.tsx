import {
  useDesignStore,
  DEFAULT_BODY_COLOR,
  DEFAULT_FRETBOARD_COLOR,
  DEFAULT_HEADSTOCK_COLOR,
} from '../../state/store';
import { FINISH_PRESETS } from '../../geometry/finishes';

export function FinishDock() {
  const settings = useDesignStore((s) => s.settings);
  const setBodyColor = useDesignStore((s) => s.setBodyColor);
  const setFretboardColor = useDesignStore((s) => s.setFretboardColor);
  const setHeadstockColor = useDesignStore((s) => s.setHeadstockColor);

  const bodyColor = settings.bodyColor || DEFAULT_BODY_COLOR;
  const fretboardColor = settings.fretboardColor || DEFAULT_FRETBOARD_COLOR;
  const headstockColor = settings.headstockColor || DEFAULT_HEADSTOCK_COLOR;

  return (
    <div className="finish-dock" role="group" aria-label="Finish">
      <div className="finish-swatches">
        {FINISH_PRESETS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`finish-swatch${bodyColor === f.body && fretboardColor === f.board ? ' active' : ''}`}
            title={f.label}
            style={{ background: f.body }}
            onClick={() => {
              setBodyColor(f.body);
              setFretboardColor(f.board);
            }}
          />
        ))}
      </div>
      <label className="finish-well" title="Body color">
        <span>Body</span>
        <input type="color" value={bodyColor} onChange={(e) => setBodyColor(e.target.value)} />
      </label>
      <label className="finish-well" title="Fretboard color">
        <span>Board</span>
        <input type="color" value={fretboardColor} onChange={(e) => setFretboardColor(e.target.value)} />
      </label>
      <label className="finish-well" title="Headstock color">
        <span>Head</span>
        <input type="color" value={headstockColor} onChange={(e) => setHeadstockColor(e.target.value)} />
      </label>
      <button
        type="button"
        className="text-btn finish-reset"
        title="Reset finish colors"
        onClick={() => {
          setBodyColor(DEFAULT_BODY_COLOR);
          setFretboardColor(DEFAULT_FRETBOARD_COLOR);
          setHeadstockColor(DEFAULT_HEADSTOCK_COLOR);
        }}
      >
        Reset
      </button>
    </div>
  );
}
