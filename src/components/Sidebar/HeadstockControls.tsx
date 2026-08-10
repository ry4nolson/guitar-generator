import { useDesignStore } from '../../state/store';
import {
  HEADSTOCK_TYPE_META,
  MIN_FREE_HEADSTOCK_POINTS,
  NUT_BASS_ID,
  NUT_TREBLE_ID,
  TUNER_LAYOUT_META,
} from '../../geometry/headstock';
import type { HeadstockType, TunerLayout } from '../../geometry/headstock';
import { ParamSlider } from './ParamSlider';

/** Headstock style, dimensions, outline points, and tuner layout. */
export function HeadstockControls() {
  const hs = useDesignStore((s) => s.headstockSettings);
  const anchors = useDesignStore((s) => s.headstockAnchors);
  const selected = useDesignStore((s) => s.selected);
  const setType = useDesignStore((s) => s.setHeadstockType);
  const setSetting = useDesignStore((s) => s.setHeadstockSetting);
  const setTunerLayout = useDesignStore((s) => s.setTunerLayout);
  const resetShape = useDesignStore((s) => s.resetHeadstockShape);
  const insertAnchor = useDesignStore((s) => s.insertHeadstockAnchor);
  const removeAnchor = useDesignStore((s) => s.removeHeadstockAnchor);
  const unit = useDesignStore((s) => s.settings.unit);
  const headed = hs.type !== 'headless';

  const selectedId = selected?.kind === 'headstock' ? selected.id : null;
  const selectedFree =
    selectedId != null &&
    selectedId !== NUT_BASS_ID &&
    selectedId !== NUT_TREBLE_ID &&
    anchors.some((a) => a.id === selectedId && !a.locked);
  const freeCount = anchors.filter((a) => !a.locked).length;
  const canRemove = selectedFree && freeCount > MIN_FREE_HEADSTOCK_POINTS;

  return (
    <section className="sidebar-section" id="sidebar-headstock">
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
        <p className="muted">
          Purple points drag freely; grey nut corners stay locked. Select a point to edit Bézier
          handles, or add/remove points below.
        </p>
      )}

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
          <div className="bridge-type-grid" style={{ marginTop: 8 }}>
            <button type="button" onClick={() => insertAnchor(selectedId ?? NUT_BASS_ID)}>
              Add outline point
            </button>
            <button type="button" disabled={!canRemove} onClick={() => removeAnchor()}>
              Remove selected
            </button>
          </div>
          <button type="button" onClick={resetShape}>
            Reset shape to preset
          </button>
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
          {headed && hs.tunerLayout !== 'headless' && (
            <ParamSlider
              label="Tuner inset"
              value={hs.tunerInset ?? 12}
              min={4}
              max={28}
              step={0.5}
              unit="mm"
              displayUnit={unit}
              onChange={(v) => setSetting('tunerInset', v)}
            />
          )}
          <p className="muted">Tuner count follows Strings under Bridge &amp; nut (6–12).</p>
        </>
      )}
    </section>
  );
}
