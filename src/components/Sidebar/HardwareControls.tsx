import { useDesignStore } from '../../state/store';
import type { HardwareState } from '../../state/hardwareDefaults';
import type { HardwarePosition } from '../../geometry/types';

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
  const move = useDesignStore((s) => s.moveHardware);
  const lock = useDesignStore((s) => s.toggleHardwareLock);
  const visibility = useDesignStore((s) => s.toggleHardwareVisibility);

  const named: { key: keyof HardwareState; label: string }[] = [
    { key: 'bridgeHumbucker', label: 'Bridge humbucker' },
    { key: 'volumeKnob', label: 'Volume knob' },
  ];

  return (
    <section className="sidebar-section">
      <h3>Hardware</h3>
      {named.map(({ key, label }) => (
        <Row
          key={key}
          label={label}
          item={hardware[key] as HardwarePosition}
          onMove={(x, y) => move(key, { x, y })}
          onLock={() => lock(key)}
          onVisibility={() => visibility(key)}
        />
      ))}
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
