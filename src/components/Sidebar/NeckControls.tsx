import { useDesignStore } from '../../state/store';
import { NECK_PARAM_META } from '../../geometry/neckParams';
import { ParamSlider } from './ParamSlider';

export function NeckControls() {
  const params = useDesignStore((s) => s.neckParams);
  const setParam = useDesignStore((s) => s.setNeckParam);
  const unit = useDesignStore((s) => s.settings.unit);

  return (
    <section className="sidebar-section">
      <h3>Neck &amp; fan-frets</h3>
      {NECK_PARAM_META.map((meta) => (
        <ParamSlider
          key={meta.key}
          label={meta.label}
          value={params[meta.key]}
          min={meta.min}
          max={meta.max}
          step={meta.step}
          unit={meta.unit === 'count' ? 'ratio' : meta.unit}
          displayUnit={unit}
          onChange={(v) => setParam(meta.key, meta.unit === 'count' ? Math.round(v) : v)}
        />
      ))}
    </section>
  );
}
