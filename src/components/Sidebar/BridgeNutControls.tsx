import { useDesignStore } from '../../state/store';
import {
  BRIDGE_TYPE_META,
  MAX_STRING_COUNT,
  MIN_STRING_COUNT,
  NUT_TYPE_META,
} from '../../geometry/bridgeTypes';
import { ParamSlider } from './ParamSlider';
import type { BridgeType, NutType } from '../../geometry/bridgeTypes';

/** Bridge type picker, string count, bridge/nut spacing, and show-strings toggle. */
export function BridgeNutControls() {
  const bridge = useDesignStore((s) => s.bridgeSettings);
  const nut = useDesignStore((s) => s.nutSettings);
  const setBridgeType = useDesignStore((s) => s.setBridgeType);
  const setBridgeSetting = useDesignStore((s) => s.setBridgeSetting);
  const setStringCount = useDesignStore((s) => s.setStringCount);
  const setNutType = useDesignStore((s) => s.setNutType);
  const setNutSetting = useDesignStore((s) => s.setNutSetting);
  const showStrings = useDesignStore((s) => s.layers.strings?.visible ?? false);
  const setShowStrings = useDesignStore((s) => s.setShowStrings);
  const unit = useDesignStore((s) => s.settings.unit);
  const stringCount = bridge.stringCount ?? 6;

  return (
    <section className="sidebar-section">
      <h3>Strings</h3>
      <div className="count-stepper">
        <span className="hardware-label">String count</span>
        <button
          type="button"
          disabled={stringCount <= MIN_STRING_COUNT}
          onClick={() => setStringCount(stringCount - 1)}
        >
          −
        </button>
        <span className="count-value">{stringCount}</span>
        <button
          type="button"
          disabled={stringCount >= MAX_STRING_COUNT}
          onClick={() => setStringCount(stringCount + 1)}
        >
          +
        </button>
      </div>
      <p className="muted">
        6–12 strings. Changing count rebuilds saddles and suggests nut/bridge spacing.
      </p>

      <h3 style={{ marginTop: 14 }}>Bridge</h3>
      <div className="bridge-type-grid">
        {BRIDGE_TYPE_META.map((t) => (
          <button
            key={t.id}
            type="button"
            className={bridge.type === t.id ? 'active' : ''}
            title={t.description}
            onClick={() => setBridgeType(t.id as BridgeType)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="muted">{BRIDGE_TYPE_META.find((t) => t.id === bridge.type)?.description}</p>
      <ParamSlider
        label="Bridge string spacing"
        value={bridge.stringSpacing}
        min={48}
        max={120}
        step={0.1}
        unit="mm"
        displayUnit={unit}
        onChange={(v) => setBridgeSetting('stringSpacing', v)}
      />
      <ParamSlider
        label="Saddle travel"
        value={bridge.saddleTravel}
        min={10}
        max={30}
        step={0.5}
        unit="mm"
        displayUnit={unit}
        onChange={(v) => setBridgeSetting('saddleTravel', v)}
      />
      {bridge.type === 'tom' && (
        <>
          <ParamSlider
            label="Stopbar offset"
            value={bridge.stopbarOffset}
            min={18}
            max={40}
            step={0.5}
            unit="mm"
            displayUnit={unit}
            onChange={(v) => setBridgeSetting('stopbarOffset', v)}
          />
          <ParamSlider
            label="TOM post spacing"
            value={bridge.postSpacing}
            min={68}
            max={100}
            step={0.5}
            unit="mm"
            displayUnit={unit}
            onChange={(v) => setBridgeSetting('postSpacing', v)}
          />
        </>
      )}

      <h3 className="feature-heading">Nut</h3>
      <div className="segmented" style={{ marginBottom: 8 }}>
        {NUT_TYPE_META.map((t) => (
          <button
            key={t.id}
            type="button"
            className={nut.type === t.id ? 'active' : ''}
            title={t.description}
            onClick={() => setNutType(t.id as NutType)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="muted">{NUT_TYPE_META.find((t) => t.id === nut.type)?.description}</p>
      <ParamSlider
        label="Nut string spacing"
        value={nut.stringSpacing}
        min={32}
        max={80}
        step={0.1}
        unit="mm"
        displayUnit={unit}
        onChange={(v) => setNutSetting('stringSpacing', v)}
      />
      <ParamSlider
        label="Nut thickness"
        value={nut.thickness}
        min={3}
        max={10}
        step={0.5}
        unit="mm"
        displayUnit={unit}
        onChange={(v) => setNutSetting('thickness', v)}
      />

      <label className="row-inline checkbox">
        <span>Show strings</span>
        <input type="checkbox" checked={showStrings} onChange={(e) => setShowStrings(e.target.checked)} />
      </label>
      <p className="muted">Strings also appear as a layer — toggle here or in the Layers panel.</p>
    </section>
  );
}
