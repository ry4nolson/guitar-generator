import { mmToDisplay, displayToMm } from '../../geometry/units';
import type { Unit } from '../../geometry/types';
import { useDesignStore } from '../../state/store';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: 'mm' | 'deg' | 'ratio' | 'count';
  displayUnit: Unit;
  onChange: (value: number) => void;
}

/** A labeled slider + numeric readout, converting mm <-> the user's chosen display unit. */
export function ParamSlider({ label, value, min, max, step, unit, displayUnit, onChange }: Props) {
  const beginHistoryGesture = useDesignStore((s) => s.beginHistoryGesture);
  const endHistoryGesture = useDesignStore((s) => s.endHistoryGesture);
  const isLength = unit === 'mm';
  const shownValue = isLength ? mmToDisplay(value, displayUnit) : value;
  const shownMin = isLength ? mmToDisplay(min, displayUnit) : min;
  const shownMax = isLength ? mmToDisplay(max, displayUnit) : max;
  const shownStep = isLength ? (displayUnit === 'in' ? step / 25.4 : step) : step;
  const suffix = unit === 'mm' ? displayUnit : unit === 'deg' ? '°' : '';

  return (
    <label className="param-slider">
      <div className="param-slider-row">
        <span>{label}</span>
        <span className="param-value">
          {shownValue.toFixed(unit === 'ratio' ? 2 : displayUnit === 'in' && isLength ? 3 : 1)}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={shownMin}
        max={shownMax}
        step={shownStep}
        value={shownValue}
        onPointerDown={() => beginHistoryGesture()}
        onPointerUp={() => endHistoryGesture()}
        onPointerCancel={() => endHistoryGesture()}
        onChange={(e) => {
          const raw = parseFloat(e.target.value);
          onChange(isLength ? displayToMm(raw, displayUnit) : raw);
        }}
      />
    </label>
  );
}
