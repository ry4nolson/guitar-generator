import { useState } from 'react';
import { useDesignStore } from '../../state/store';
import { BODY_PARAM_META } from '../../geometry/bodyParams';
import { GLOBAL_FEATURE, featureById } from '../../geometry/bodyFeatures';
import { ParamSlider } from './ParamSlider';

/**
 * Replaces the old flat 12-slider list: shows the always-relevant Global
 * (overall body dimensions) section, plus — only when a body region has been
 * clicked in the canvas — the handful of sliders that belong to that one
 * feature. The full flat list survives as a collapsed "advanced" fallback so
 * nothing is lost for power users who want everything in one place.
 */
export function FeaturePanel() {
  const params = useDesignStore((s) => s.bodyParams);
  const setParam = useDesignStore((s) => s.setBodyParam);
  const unit = useDesignStore((s) => s.settings.unit);
  const selected = useDesignStore((s) => s.selected);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const metaByKey = Object.fromEntries(BODY_PARAM_META.map((m) => [m.key, m]));
  const renderSlider = (key: (typeof BODY_PARAM_META)[number]['key']) => {
    const meta = metaByKey[key];
    if (!meta) return null;
    return (
      <ParamSlider
        key={meta.key}
        label={meta.label}
        value={params[meta.key]}
        min={meta.min}
        max={meta.max}
        step={meta.step}
        unit={meta.unit}
        displayUnit={unit}
        onChange={(v) => setParam(meta.key, v)}
      />
    );
  };

  const activeFeature = selected?.kind === 'feature' ? featureById(selected.id) : null;

  return (
    <section className="sidebar-section">
      <h3>Global</h3>
      {GLOBAL_FEATURE.paramKeys.map(renderSlider)}

      {activeFeature ? (
        <>
          <h3 className="feature-heading">{activeFeature.label}</h3>
          {activeFeature.paramKeys.length > 0 ? (
            activeFeature.paramKeys.map(renderSlider)
          ) : (
            <p className="muted">This feature has no dedicated sliders yet — edit its anchor/handles directly.</p>
          )}
        </>
      ) : (
        <p className="muted">Click a body region in the canvas to edit that feature.</p>
      )}

      <button className="link-button" onClick={() => setAdvancedOpen((v) => !v)}>
        {advancedOpen ? '▾' : '▸'} Advanced: all body parameters
      </button>
      {advancedOpen && <div className="advanced-params">{BODY_PARAM_META.map((m) => renderSlider(m.key))}</div>}
    </section>
  );
}
