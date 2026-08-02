import { useDesignStore } from '../../state/store';
import { LAYER_IDS, LAYER_LABELS } from '../../state/layers';

/** Figma-style layer list: per-layer visibility + lock, and click-to-select the layer as an inspection context. */
export function LayersPanel() {
  const layers = useDesignStore((s) => s.layers);
  const setVisible = useDesignStore((s) => s.setLayerVisible);
  const setLocked = useDesignStore((s) => s.setLayerLocked);

  return (
    <section className="sidebar-section">
      <h3>Layers</h3>
      {LAYER_IDS.map((id) => {
        const layer = layers[id];
        return (
          <div className="layer-row" key={id}>
            <span className="layer-label">{LAYER_LABELS[id]}</span>
            <button
              className={layer.locked ? 'active' : ''}
              onClick={() => setLocked(id, !layer.locked)}
              title="Lock layer"
            >
              {layer.locked ? '🔒' : '🔓'}
            </button>
            <button
              className={layer.visible ? '' : 'active'}
              onClick={() => setVisible(id, !layer.visible)}
              title="Toggle visibility"
            >
              {layer.visible ? '👁' : '🚫'}
            </button>
          </div>
        );
      })}
      <p className="muted">Per-layer export is planned; use the toolbar's blueprint/fabrication exports for now.</p>
    </section>
  );
}
