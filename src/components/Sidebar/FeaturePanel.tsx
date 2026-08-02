import { useState } from 'react';
import { useDesignStore } from '../../state/store';
import { getBodyTemplate } from '../../geometry/templates';
import { BODY_FEATURE_LABELS } from '../../geometry/bodyFeatures';
import { ParamSlider } from './ParamSlider';

/**
 * Shows the always-relevant Global (overall body dimensions) section, plus —
 * only when a body region has been clicked in the canvas — the handful of
 * sliders that belong to that one feature. Generic over the active
 * template's own `paramMeta`, so switching templates automatically shows the
 * right sliders without any per-template UI code. The full flat list
 * survives as a collapsed "advanced" fallback so nothing is lost for power
 * users who want everything in one place.
 */
export function FeaturePanel() {
  const templateId = useDesignStore((s) => s.templateId);
  const params = useDesignStore((s) => s.bodyParams);
  const setParam = useDesignStore((s) => s.setBodyParam);
  const unit = useDesignStore((s) => s.settings.unit);
  const selected = useDesignStore((s) => s.selected);
  const resetFeature = useDesignStore((s) => s.resetFeature);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const template = getBodyTemplate(templateId);
  const globalMeta = template.paramMeta.filter((m) => !m.featureId);
  const activeFeatureId = selected?.kind === 'feature' ? selected.id : null;
  const featureMeta = activeFeatureId ? template.paramMeta.filter((m) => m.featureId === activeFeatureId) : [];

  const renderSlider = (meta: (typeof template.paramMeta)[number]) => (
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

  return (
    <section className="sidebar-section">
      <h3>Global</h3>
      {globalMeta.map(renderSlider)}

      {activeFeatureId ? (
        <>
          <h3 className="feature-heading">{BODY_FEATURE_LABELS[activeFeatureId]}</h3>
          {featureMeta.length > 0 ? (
            featureMeta.map(renderSlider)
          ) : (
            <p className="muted">This feature has no dedicated sliders yet — edit its anchors/handles directly.</p>
          )}
          <button className="link-button" onClick={() => resetFeature(activeFeatureId)}>
            Reset this feature
          </button>
        </>
      ) : (
        <p className="muted">Click a body region in the canvas to edit that feature.</p>
      )}

      <button className="link-button" onClick={() => setAdvancedOpen((v) => !v)}>
        {advancedOpen ? '▾' : '▸'} Advanced: all body parameters
      </button>
      {advancedOpen && <div className="advanced-params">{template.paramMeta.map(renderSlider)}</div>}
    </section>
  );
}
