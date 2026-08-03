import { useDesignStore } from '../../state/store';
import {
  PICKUP_SLOTS,
  PICKUP_SLOT_LABELS,
  PICKUP_TYPE_META,
  SELECTOR_TYPE_META,
} from '../../geometry/pickups';
import type { SelectorType } from '../../geometry/pickups';

const isBlade = (t: SelectorType) => t === 'blade-3' || t === 'blade-5';

function CountStepper({ label, value, min, max, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="count-stepper">
      <span className="hardware-label">{label}</span>
      <button type="button" disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <span className="count-value">{value}</span>
      <button type="button" disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}

/** Pickup slot types, knob counts, and selector switch configuration. */
export function PickupControls() {
  const pickupSettings = useDesignStore((s) => s.pickupSettings);
  const controlSettings = useDesignStore((s) => s.controlSettings);
  const selector = useDesignStore((s) => s.hardware.selector);
  const setPickupType = useDesignStore((s) => s.setPickupType);
  const setControlSetting = useDesignStore((s) => s.setControlSetting);
  const rotateHardware = useDesignStore((s) => s.rotateHardware);

  return (
    <section className="sidebar-section">
      <h3>Pickups</h3>
      {PICKUP_SLOTS.map((slot) => (
        <div key={slot} className="pickup-slot-row">
          <span className="hardware-label">{PICKUP_SLOT_LABELS[slot]}</span>
          <div className="pickup-slot-buttons">
            {PICKUP_TYPE_META.map((t) => (
              <button
                key={t.id}
                type="button"
                className={pickupSettings[slot] === t.id ? 'active' : ''}
                title={t.description}
                onClick={() => setPickupType(slot, t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <h3 style={{ marginTop: 14 }}>Controls</h3>
      <CountStepper
        label="Volume knobs"
        value={controlSettings.volumes}
        min={0}
        max={2}
        onChange={(v) => setControlSetting('volumes', v)}
      />
      <CountStepper
        label="Tone knobs"
        value={controlSettings.tones}
        min={0}
        max={2}
        onChange={(v) => setControlSetting('tones', v)}
      />
      <div className="bridge-type-grid" style={{ marginTop: 8 }}>
        {SELECTOR_TYPE_META.map((t) => (
          <button
            key={t.id}
            type="button"
            className={controlSettings.selector === t.id ? 'active' : ''}
            title={t.description}
            onClick={() => setControlSetting('selector', t.id as SelectorType)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="muted">{SELECTOR_TYPE_META.find((t) => t.id === controlSettings.selector)?.description}</p>
      {isBlade(controlSettings.selector) && (
        <div className="row-inline" style={{ marginTop: 8 }}>
          <span>Switch angle</span>
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={selector.rotation}
            disabled={selector.locked}
            onChange={(e) => rotateHardware('selector', parseFloat(e.target.value))}
            title="Blade switch rotation (degrees)"
            style={{ flex: 1 }}
          />
          <input
            type="number"
            min={-180}
            max={180}
            step={1}
            value={Math.round(selector.rotation)}
            disabled={selector.locked}
            onChange={(e) => rotateHardware('selector', parseFloat(e.target.value) || 0)}
            style={{ width: 56 }}
            title="Degrees"
          />
          <span className="muted">°</span>
        </div>
      )}
    </section>
  );
}
