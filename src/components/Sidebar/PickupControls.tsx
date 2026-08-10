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
  const pickups = useDesignStore((s) => s.hardware.pickups);
  const controlSettings = useDesignStore((s) => s.controlSettings);
  const selector = useDesignStore((s) => s.hardware.selector);
  const setPickupType = useDesignStore((s) => s.setPickupType);
  const setControlSetting = useDesignStore((s) => s.setControlSetting);
  const rotateHardware = useDesignStore((s) => s.rotateHardware);

  return (
    <section className="sidebar-section" id="sidebar-pickups">
      <h3>Pickups</h3>
      <p className="muted">Drag pickups along the strings (X only). Set angle below for slanted routes.</p>
      {PICKUP_SLOTS.map((slot, index) => {
        const type = pickupSettings[slot];
        const item = pickups[index];
        return (
          <div key={slot} className="pickup-slot-row" id={`sidebar-pickup-${slot}`}>
            <div className="pickup-slot-main">
              <span className="hardware-label">{PICKUP_SLOT_LABELS[slot]}</span>
              <div className="pickup-slot-buttons">
                {PICKUP_TYPE_META.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={type === t.id ? 'active' : ''}
                    title={t.description}
                    onClick={() => setPickupType(slot, t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            {type !== 'none' && item && (
              <div className="row-inline pickup-angle-row">
                <span>Angle</span>
                <input
                  type="range"
                  min={-45}
                  max={45}
                  step={0.5}
                  value={item.rotation}
                  disabled={item.locked}
                  onChange={(e) => rotateHardware('pickups', parseFloat(e.target.value), index)}
                  title="Pickup rotation (degrees)"
                />
                <input
                  type="number"
                  min={-45}
                  max={45}
                  step={0.5}
                  value={Math.round(item.rotation * 10) / 10}
                  disabled={item.locked}
                  onChange={(e) => rotateHardware('pickups', parseFloat(e.target.value) || 0, index)}
                  title="Degrees"
                />
                <span className="muted">°</span>
              </div>
            )}
          </div>
        );
      })}

      <h3 id="sidebar-controls" style={{ marginTop: 14 }}>
        Controls
      </h3>
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

      <h3 style={{ marginTop: 14 }}>Control cavity</h3>
      <p className="muted">Back-view route — auto-angled to the knob/selector cluster.</p>
      <div className="row-inline">
        <span>Pad</span>
        <input
          type="range"
          min={4}
          max={36}
          step={1}
          value={controlSettings.cavityPad ?? 14}
          onChange={(e) => setControlSetting('cavityPad', parseFloat(e.target.value))}
          style={{ flex: 1 }}
          title="Cavity padding (mm)"
        />
        <input
          type="number"
          min={4}
          max={36}
          step={1}
          value={Math.round(controlSettings.cavityPad ?? 14)}
          onChange={(e) => setControlSetting('cavityPad', parseFloat(e.target.value) || 14)}
          style={{ width: 52 }}
        />
        <span className="muted">mm</span>
      </div>
      <div className="row-inline">
        <span>Angle offset</span>
        <input
          type="range"
          min={-90}
          max={90}
          step={1}
          value={controlSettings.cavityRotationOffset ?? 0}
          onChange={(e) => setControlSetting('cavityRotationOffset', parseFloat(e.target.value))}
          style={{ flex: 1 }}
          title="Extra degrees on the auto-fitted cavity angle"
        />
        <input
          type="number"
          min={-90}
          max={90}
          step={1}
          value={Math.round(controlSettings.cavityRotationOffset ?? 0)}
          onChange={(e) => setControlSetting('cavityRotationOffset', parseFloat(e.target.value) || 0)}
          style={{ width: 52 }}
        />
        <span className="muted">°</span>
      </div>
    </section>
  );
}
