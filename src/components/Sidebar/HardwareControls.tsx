import { useDesignStore } from '../../state/store';
import type { HardwarePosition } from '../../geometry/types';
import { PICKUP_SLOTS, PICKUP_SLOT_LABELS, controlKnobLabel } from '../../geometry/pickups';

function Row({
  id,
  label,
  item,
  highlighted,
  onMove,
  onLock,
  onVisibility,
  /** Pickups: lock Y (along-string only) and show angle instead. */
  alongStringOnly = false,
  /** Tuners: show X/Y plus a peg angle field. */
  showAngle = false,
  onRotate,
}: {
  id?: string;
  label: string;
  item: HardwarePosition;
  highlighted?: boolean;
  onMove: (x: number, y: number) => void;
  onLock: () => void;
  onVisibility: () => void;
  alongStringOnly?: boolean;
  showAngle?: boolean;
  onRotate?: (deg: number) => void;
}) {
  return (
    <div id={id} className={`hardware-row${highlighted ? ' hardware-row-selected' : ''}`}>
      <span className="hardware-label">{label}</span>
      <input
        type="number"
        value={Math.round(item.x * 100) / 100}
        onChange={(e) => onMove(parseFloat(e.target.value) || 0, item.y)}
        title="X (mm)"
      />
      {alongStringOnly ? (
        <input
          type="number"
          value={Math.round(item.rotation)}
          onChange={(e) => onRotate?.(parseFloat(e.target.value) || 0)}
          title="Angle (°)"
        />
      ) : (
        <input
          type="number"
          value={Math.round(item.y * 100) / 100}
          onChange={(e) => onMove(item.x, parseFloat(e.target.value) || 0)}
          title="Y (mm)"
        />
      )}
      {showAngle && !alongStringOnly && (
        <input
          type="number"
          value={Math.round(item.rotation)}
          onChange={(e) => onRotate?.(parseFloat(e.target.value) || 0)}
          title="Angle (°)"
        />
      )}
      <button onClick={onLock} className={item.locked ? 'active' : ''} title="Lock">
        {item.locked ? '🔒' : '🔓'}
      </button>
      <button onClick={onVisibility} className={item.visible ? '' : 'active'} title="Visibility">
        {item.visible ? '👁' : '🚫'}
      </button>
    </div>
  );
}

export function HardwareControls({
  group = 'all',
}: {
  group?: 'all' | 'tuners' | 'body' | 'saddles' | 'electronics' | 'bolts';
}) {
  const hardware = useDesignStore((s) => s.hardware);
  const pickupSettings = useDesignStore((s) => s.pickupSettings);
  const controlSettings = useDesignStore((s) => s.controlSettings);
  const selected = useDesignStore((s) => s.selected);
  const move = useDesignStore((s) => s.moveHardware);
  const rotate = useDesignStore((s) => s.rotateHardware);
  const lock = useDesignStore((s) => s.toggleHardwareLock);
  const visibility = useDesignStore((s) => s.toggleHardwareVisibility);

  const isHw = (name: string, index?: number) =>
    selected?.kind === 'hardware' &&
    selected.name === name &&
    (index === undefined || selected.index === index);

  const showElectronics = group === 'all' || group === 'body' || group === 'electronics';
  const showSaddles = group === 'all' || group === 'body' || group === 'saddles';
  const showBolts = group === 'all' || group === 'body' || group === 'bolts';
  const showTuners = group === 'all' || group === 'tuners';
  const sectionId = showTuners && !showElectronics && !showSaddles && !showBolts
    ? 'sidebar-tuners'
    : showSaddles && !showElectronics
      ? 'sidebar-hw-saddles'
      : 'sidebar-hardware';

  return (
    <section className="sidebar-section" id={sectionId}>
      {showElectronics && (
        <>
          <h3>Pickup &amp; control positions</h3>
          <p className="muted">Pickup rows: X + angle (°), Y on centerline.</p>
          {hardware.pickups.map((p, i) => {
            const slot = PICKUP_SLOTS[i];
            if (pickupSettings[slot] === 'none') return null;
            return (
              <Row
                key={`pickup-${i}`}
                id={`sidebar-hw-pickups-${i}`}
                label={`${PICKUP_SLOT_LABELS[slot]} pickup`}
                item={p}
                highlighted={isHw('pickups', i)}
                alongStringOnly
                onMove={(x, y) => move('pickups', { x, y }, i)}
                onRotate={(deg) => rotate('pickups', deg, i)}
                onLock={() => lock('pickups', i)}
                onVisibility={() => visibility('pickups', i)}
              />
            );
          })}
          {hardware.controls.map((c, i) => (
            <Row
              key={`control-${i}`}
              id={`sidebar-hw-controls-${i}`}
              label={controlKnobLabel(controlSettings, i)}
              item={c}
              highlighted={isHw('controls', i)}
              onMove={(x, y) => move('controls', { x, y }, i)}
              onLock={() => lock('controls', i)}
              onVisibility={() => visibility('controls', i)}
            />
          ))}
          {controlSettings.selector !== 'none' && (
            <Row
              id="sidebar-hw-selector"
              label="Selector"
              item={hardware.selector}
              highlighted={isHw('selector')}
              onMove={(x, y) => move('selector', { x, y })}
              onLock={() => lock('selector')}
              onVisibility={() => visibility('selector')}
            />
          )}
        </>
      )}
      {showSaddles && (
        <>
          {showElectronics ? (
            <div className="hardware-group-label">Saddles</div>
          ) : (
            <>
              <h3>Saddles</h3>
              <p className="muted">Drag on the canvas or type X/Y to intonate a saddle.</p>
            </>
          )}
          {hardware.saddles.map((s, i) => (
            <Row
              key={i}
              id={`sidebar-hw-saddles-${i}`}
              label={`Saddle ${i + 1}`}
              item={s}
              highlighted={isHw('saddles', i)}
              onMove={(x, y) => move('saddles', { x, y }, i)}
              onLock={() => lock('saddles', i)}
              onVisibility={() => visibility('saddles', i)}
            />
          ))}
        </>
      )}
      {showBolts && (
        <>
          {showElectronics || showSaddles ? (
            <div className="hardware-group-label">Neck bolts</div>
          ) : (
            <h3>Neck bolts</h3>
          )}
          {hardware.neckBolts.map((b, i) => (
            <Row
              key={i}
              id={`sidebar-hw-neckBolts-${i}`}
              label={`Bolt ${i + 1}`}
              item={b}
              highlighted={isHw('neckBolts', i)}
              onMove={(x, y) => move('neckBolts', { x, y }, i)}
              onLock={() => lock('neckBolts', i)}
              onVisibility={() => visibility('neckBolts', i)}
            />
          ))}
        </>
      )}
      {showTuners && (
        <>
          <h3>{showElectronics || showSaddles || showBolts ? 'Tuners' : 'Tuner positions'}</h3>
          <p className="muted">X/Y + peg angle; lock keeps a peg from following outline auto-layout.</p>
          {(hardware.tuners ?? []).map((t, i) => (
            <Row
              key={`tuner-${i}`}
              id={`sidebar-hw-tuners-${i}`}
              label={`Tuner ${i + 1}`}
              item={t}
              highlighted={isHw('tuners', i)}
              showAngle
              onMove={(x, y) => move('tuners', { x, y }, i)}
              onRotate={(deg) => rotate('tuners', deg, i)}
              onLock={() => lock('tuners', i)}
              onVisibility={() => visibility('tuners', i)}
            />
          ))}
        </>
      )}
    </section>
  );
}
