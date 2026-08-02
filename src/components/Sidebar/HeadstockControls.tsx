import { useDesignStore } from '../../state/store';
import { HEADSTOCK_TYPE_META, TUNER_LAYOUT_META } from '../../geometry/headstock';
import type { HeadstockType, TunerLayout } from '../../geometry/headstock';
import { ParamSlider } from './ParamSlider';

/** Headstock style, dimensions, and tuner layout. */
export function HeadstockControls() {
  const hs = useDesignStore((s) => s.headstockSettings);
  const setType = useDesignStore((s) => s.setHeadstockType);
  const setSetting = useDesignStore((s) => s.setHeadstockSetting);
  const setTunerLayout = useDesignStore((s) => s.setTunerLayout);
  const unit = useDesignStore((s) => s.settings.unit);
  const headed = hs.type !== 'headless';

  return (
    <section className="sidebar-section">
      <h3>Headstock</h3>
      <div className="bridge-type-grid">
        {HEADSTOCK_TYPE_META.map((t) => (
          <button
            key={t.id}
            type="button"
            className={hs.type === t.id ? 'active' : ''}
            title={t.description}
            onClick={() => setType(t.id as HeadstockType)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="muted">{HEADSTOCK_TYPE_META.find((t) => t.id === hs.type)?.description}</p>

      {headed && (
        <>
          <ParamSlider
            label="Headstock length"
            value={hs.length}
            min={120}
            max={220}
            step={1}
            unit="mm"
            displayUnit={unit}
            onChange={(v) => setSetting('length', v)}
          />
          <ParamSlider
            label="Tip width"
            value={hs.tipWidth}
            min={40}
            max={100}
            step={1}
            unit="mm"
            displayUnit={unit}
            onChange={(v) => setSetting('tipWidth', v)}
          />
          {hs.type === '3x3' && (
            <ParamSlider
              label="Ear width"
              value={hs.earWidth}
              min={12}
              max={45}
              step={1}
              unit="mm"
              displayUnit={unit}
              onChange={(v) => setSetting('earWidth', v)}
            />
          )}
        </>
      )}

      <h3 style={{ marginTop: 14 }}>Tuners</h3>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={hs.showTuners}
          onChange={(e) => setSetting('showTuners', e.target.checked)}
        />
        Show tuners
      </label>
      {hs.showTuners && (
        <>
          <div className="bridge-type-grid">
            {TUNER_LAYOUT_META.filter((t) => t.id !== 'none').map((t) => (
              <button
                key={t.id}
                type="button"
                className={hs.tunerLayout === t.id ? 'active' : ''}
                title={t.description}
                onClick={() => setTunerLayout(t.id as TunerLayout)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="muted">{TUNER_LAYOUT_META.find((t) => t.id === hs.tunerLayout)?.description}</p>
        </>
      )}
    </section>
  );
}
