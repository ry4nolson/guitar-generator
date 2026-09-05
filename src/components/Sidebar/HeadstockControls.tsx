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
import { HEADSTOCK_LENGTH_LIMITS, HEADSTOCK_WIDTH_LIMITS } from '../../geometry/editLimits';

/** Headstock style, dimensions, outline points, and tuner layout. */
export function HeadstockControls() {
  const hs = useDesignStore((s) => s.headstockSettings);
  const anchors = useDesignStore((s) => s.headstockAnchors);
  const selected = useDesignStore((s) => s.selected);
  const setType = useDesignStore((s) => s.setHeadstockType);
  const setSetting = useDesignStore((s) => s.setHeadstockSetting);
  const setTunerLayout = useDesignStore((s) => s.setTunerLayout);
  const resetShape = useDesignStore((s) => s.resetHeadstockShape);
  const resetTunerPositions = useDesignStore((s) => s.resetTunerPositions);
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
          Purple points drag within a practical headstock area — they cannot stretch down the
          neck or off the canvas. Grey nut corners stay locked. Select a point to edit Bézier
          handles, or add/remove points below.
        </p>
      )}

      {headed && (
        <>
          <ParamSlider
            label="Headstock length"
            value={hs.length}
            min={HEADSTOCK_LENGTH_LIMITS.min}
            max={HEADSTOCK_LENGTH_LIMITS.max}
            step={1}
            unit="mm"
            displayUnit={unit}
            onChange={(v) => setSetting('length', v)}
          />
          <ParamSlider
            label="Head width"
            value={hs.tipWidth}
            min={HEADSTOCK_WIDTH_LIMITS.min}
            max={HEADSTOCK_WIDTH_LIMITS.max}
            step={1}
            unit="mm"
            displayUnit={unit}
            onChange={(v) => setSetting('tipWidth', v)}
          />
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
            <>
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
              <ParamSlider
                label="Tip clearance"
                value={hs.tunerTipClearance ?? 0.14}
                min={0.05}
                max={0.4}
                step={0.01}
                unit="ratio"
                displayUnit={unit}
                onChange={(v) => setSetting('tunerTipClearance', v)}
              />
              <ParamSlider
                label="Nut clearance"
                value={hs.tunerNutClearance ?? 0.12}
                min={0.05}
                max={0.4}
                step={0.01}
                unit="ratio"
                displayUnit={unit}
                onChange={(v) => setSetting('tunerNutClearance', v)}
              />
              <ParamSlider
                label="End margin"
                value={hs.tunerEndMargin ?? 8}
                min={0}
                max={20}
                step={0.5}
                unit="mm"
                displayUnit={unit}
                onChange={(v) => setSetting('tunerEndMargin', v)}
              />
            </>
          )}
          <ParamSlider
            label="Peg angle offset"
            value={hs.tunerPegAngleOffset ?? 0}
            min={-90}
            max={90}
            step={1}
            unit="deg"
            displayUnit={unit}
            onChange={(v) => setSetting('tunerPegAngleOffset', v)}
          />
          <button type="button" onClick={() => resetTunerPositions()}>
            Reset tuner positions
          </button>
          <p className="muted">
            Auto layout keeps pegs in a compact row along the bass edge (or split ears), not
            stretched along the whole outline. Drag pegs to fine-tune — they stay on the
            headstock wood. Dragged pegs stay put when you reshape the outline; unlock them
            (or reset) to follow auto layout again. Count follows Strings under Bridge &amp;
            nut (6–12).
          </p>
        </>
      )}
    </section>
  );
}
