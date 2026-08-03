import { useRef } from 'react';
import { useReferenceOverlayContext } from '../../state/ReferenceOverlayContext';

/** Sidebar controls for the optional canvas reference-image overlay. */
export function ReferenceOverlayPanel() {
  const { settings, setSettings, imageUrl, hasImage, loadImageFile, removeImage } = useReferenceOverlayContext();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      loadImageFile(file);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <section className="sidebar-section">
      <h3>Reference overlay</h3>
      <p className="muted">Optional PNG/JPEG/WebP behind the outline for tracing. Not included in SVG exports.</p>
      <div className="button-row">
        <button type="button" onClick={() => fileRef.current?.click()}>
          {hasImage ? 'Replace image' : 'Upload image'}
        </button>
        {hasImage && (
          <button type="button" onClick={removeImage}>
            Remove
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
        hidden
        onChange={onFile}
      />

      {hasImage && (
        <>
          <label className="row-inline checkbox">
            <span>Show reference</span>
            <input
              type="checkbox"
              checked={settings.visible}
              onChange={(e) => setSettings({ visible: e.target.checked })}
            />
          </label>
          <label className="row-inline checkbox">
            <span>Lock overlay</span>
            <input
              type="checkbox"
              checked={settings.locked}
              onChange={(e) => setSettings({ locked: e.target.checked })}
            />
          </label>
          <label className="param-slider">
            <div className="param-slider-row">
              <span>Opacity</span>
              <span className="param-value">{Math.round(settings.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.01}
              value={settings.opacity}
              disabled={settings.locked}
              onChange={(e) => setSettings({ opacity: parseFloat(e.target.value) })}
            />
          </label>
          <label className="param-slider">
            <div className="param-slider-row">
              <span>Scale</span>
              <span className="param-value">{settings.scale.toFixed(2)}×</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={4}
              step={0.01}
              value={settings.scale}
              disabled={settings.locked}
              onChange={(e) => setSettings({ scale: parseFloat(e.target.value) })}
            />
          </label>
          <label className="param-slider">
            <div className="param-slider-row">
              <span>Rotation</span>
              <span className="param-value">{Math.round(settings.rotation)}°</span>
            </div>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={settings.rotation}
              disabled={settings.locked}
              onChange={(e) => setSettings({ rotation: parseFloat(e.target.value) })}
            />
          </label>
          <div className="coord-inputs">
            <label>
              X (mm)
              <input
                type="number"
                step={1}
                value={Math.round(settings.offsetX)}
                disabled={settings.locked}
                onChange={(e) => setSettings({ offsetX: parseFloat(e.target.value) || 0 })}
              />
            </label>
            <label>
              Y (mm)
              <input
                type="number"
                step={1}
                value={Math.round(settings.offsetY)}
                disabled={settings.locked}
                onChange={(e) => setSettings({ offsetY: parseFloat(e.target.value) || 0 })}
              />
            </label>
          </div>
          <label>
            Rotation (°)
            <input
              type="number"
              step={1}
              value={Math.round(settings.rotation)}
              disabled={settings.locked}
              onChange={(e) => setSettings({ rotation: parseFloat(e.target.value) || 0 })}
            />
          </label>
          {imageUrl && (
            <p className="muted">
              Unlocked: drag the blue frame to move, blue handle to rotate. Image is session-only; settings save locally.
            </p>
          )}
        </>
      )}
    </section>
  );
}
