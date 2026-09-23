import { useRef, useState } from 'react';
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

function formatShown(value: number, digits: number): string {
  return value.toFixed(digits);
}

/** Parse a typed readout. Trailing unit text ("25.5 in") is ignored. */
function parseTyped(raw: string): number | null {
  const cleaned = raw.trim().replace(/(in|mm|°)$/i, '').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** A labeled slider plus a typeable readout. Lengths follow the display unit. */
export function ParamSlider({ label, value, min, max, step, unit, displayUnit, onChange }: Props) {
  const beginHistoryGesture = useDesignStore((s) => s.beginHistoryGesture);
  const endHistoryGesture = useDesignStore((s) => s.endHistoryGesture);
  const isLength = unit === 'mm';
  const shownValue = isLength ? mmToDisplay(value, displayUnit) : value;
  const shownMin = isLength ? mmToDisplay(min, displayUnit) : min;
  const shownMax = isLength ? mmToDisplay(max, displayUnit) : max;
  const shownStep = isLength ? (displayUnit === 'in' ? step / 25.4 : step) : step;
  const suffix = unit === 'mm' ? displayUnit : unit === 'deg' ? '°' : '';
  const digits = unit === 'ratio' ? 2 : displayUnit === 'in' && isLength ? 3 : 1;
  const formatted = formatShown(shownValue, digits);
  const [draft, setDraft] = useState<string | null>(null);
  const cancelRef = useRef(false);

  function commit(raw: string) {
    const parsed = parseTyped(raw);
    if (parsed === null) return;
    const clamped = Math.min(shownMax, Math.max(shownMin, parsed));
    const next = isLength ? displayToMm(clamped, displayUnit) : clamped;
    if (Math.abs(next - value) > 1e-6) onChange(next);
  }

  return (
    <div className="param-slider">
      <div className="param-slider-row">
        <span>{label}</span>
        <span className="param-value">
          <input
            aria-label={label}
            inputMode="decimal"
            value={draft ?? formatted}
            onFocus={(e) => {
              beginHistoryGesture();
              setDraft(formatted);
              e.currentTarget.select();
            }}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={(e) => {
              if (!cancelRef.current) commit(e.currentTarget.value);
              cancelRef.current = false;
              setDraft(null);
              endHistoryGesture();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') {
                cancelRef.current = true;
                setDraft(null);
                e.currentTarget.blur();
              }
            }}
          />
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={shownMin}
        max={shownMax}
        step={shownStep}
        value={shownValue}
        aria-label={`${label} slider`}
        onPointerDown={() => beginHistoryGesture()}
        onPointerUp={() => endHistoryGesture()}
        onPointerCancel={() => endHistoryGesture()}
        onChange={(e) => {
          const raw = parseFloat(e.target.value);
          onChange(isLength ? displayToMm(raw, displayUnit) : raw);
        }}
      />
    </div>
  );
}
