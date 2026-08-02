import { useDesignStore } from '../../state/store';
import type { HardwarePosition } from '../../geometry/types';
import { PICKUP_SLOTS, PICKUP_SLOT_LABELS, controlKnobLabel } from '../../geometry/pickups';

function Row({ label, item, onMove, onLock, onVisibility }: {
  label: string;
  item: HardwarePosition;
  onMove: (x: number, y: number) => void;
  onLock: () => void;
  onVisibility: () => void;
}) {
  return (
    <div className="hardware-row">
      <span className="hardware-label">{label}</span>
      <input
        type="number"
        value={Math.round(item.x * 100) / 100}
        onChange={(e) => onMove(parseFloat(e.target.value) || 0, item.y)}
        title="X (mm)"
      />
      <input
        type="number"
        value={Math.round(item.y * 100) / 100}
        onChange={(e) => onMove(item.x, parseFloat(e.target.value) || 0)}
        title="Y (mm)"
      />
      <button onClick={onLock} className={item.locked ? 'active' : ''} title="Lock">
        {item.locked ? '🔒' : '🔓'}
      </button>
      <button onClick={onVisibility} className={item.visible ? '' : 'active'} title="Visibility">
        {item.visible ? '👁' : '🚫'}
      </button>
    </div>
  );
}

export function HardwareControls() {
  const hardware = useDesignStore((s) => s.hardware);
  const pickupSettings = useDesignStore((s) => s.pickupSettings);
  const controlSettings = useDesignStore((s) => s.controlSettings);
  const move = useDesignStore((s) => s.moveHardware);
  const lock = useDesignStore((s) => s.toggleHardwareLock);
  const visibility = useDesignStore((s) => s.toggleHardwareVisibility);

  return (
    <section className="sidebar-section">
      <h3>Hardware positions</h3>
      {hardware.pickups.map((p, i) => {
        const slot = PICKUP_SLOTS[i];
        if (pickupSettings[slot] === 'none') return null;
        return (
          <Row
            key={`pickup-${i}`}
            label={`${PICKUP_SLOT_LABELS[slot]} pickup`}
            item={p}
            onMove={(x, y) => move('pickups', { x, y }, i)}
            onLock={() => lock('pickups', i)}
            onVisibility={() => visibility('pickups', i)}
          />
        );
      })}
      {hardware.controls.map((c, i) => (
        <Row
          key={`control-${i}`}
          label={controlKnobLabel(controlSettings, i)}
          item={c}
          onMove={(x, y) => move('controls', { x, y }, i)}
          onLock={() => lock('controls', i)}
          onVisibility={() => visibility('controls', i)}
        />
      ))}
      {controlSettings.selector !== 'none' && (
        <Row
          label="Selector"
          item={hardware.selector}
          onMove={(x, y) => move('selector', { x, y })}
          onLock={() => lock('selector')}
          onVisibility={() => visibility('selector')}
        />
      )}
      <div className="hardware-group-label">Saddles</div>
      {hardware.saddles.map((s, i) => (
        <Row
          key={i}
          label={`Saddle ${i + 1}`}
          item={s}
          onMove={(x, y) => move('saddles', { x, y }, i)}
          onLock={() => lock('saddles', i)}
          onVisibility={() => visibility('saddles', i)}
        />
      ))}
      <div className="hardware-group-label">Neck bolts</div>
      {hardware.neckBolts.map((b, i) => (
        <Row
          key={i}
          label={`Bolt ${i + 1}`}
          item={b}
          onMove={(x, y) => move('neckBolts', { x, y }, i)}
          onLock={() => lock('neckBolts', i)}
          onVisibility={() => visibility('neckBolts', i)}
        />
      ))}
    </section>
  );
}
