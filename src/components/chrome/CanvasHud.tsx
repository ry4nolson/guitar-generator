import { useDesignStore } from '../../state/store';
import type { ViewMode } from '../../geometry/types';
import { IconFit, IconMinus, IconPlus } from './icons';

const VIEWS: { key: ViewMode; label: string }[] = [
  { key: 'top', label: 'Top' },
  { key: 'back', label: 'Back' },
  { key: 'construction', label: 'Construction' },
];

export function ViewModeHud() {
  const view = useDesignStore((s) => s.appSettings.view);
  const setView = useDesignStore((s) => s.setView);

  return (
    <div className="view-hud segmented" role="group" aria-label="View">
      {VIEWS.map((v) => (
        <button
          key={v.key}
          type="button"
          className={view === v.key ? 'active' : ''}
          onClick={() => setView(v.key)}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

export function ViewportHud({
  onFit,
  onResetView,
  onZoomIn,
  onZoomOut,
}: {
  onFit: () => void;
  onResetView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}) {
  return (
    <div className="viewport-hud">
      <button type="button" className="toolbar-btn" onClick={onFit} title="Fit to screen (F)">
        <IconFit />
        Fit
      </button>
      <button
        type="button"
        className="toolbar-btn icon-only"
        onClick={onZoomOut}
        title="Zoom out"
        data-tooltip="Zoom out"
        aria-label="Zoom out"
      >
        <IconMinus />
      </button>
      <button
        type="button"
        className="toolbar-btn icon-only"
        onClick={onZoomIn}
        title="Zoom in"
        data-tooltip="Zoom in"
        aria-label="Zoom in"
      >
        <IconPlus />
      </button>
      <button type="button" className="toolbar-btn" onClick={onResetView} title="Reset view (0)">
        1:1
      </button>
    </div>
  );
}
