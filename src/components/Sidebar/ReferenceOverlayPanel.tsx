import { useRef } from 'react';
import { useReferenceOverlayContext } from '../../state/ReferenceOverlayContext';
import {
  useDesignStore,
  DEFAULT_BODY_OPACITY,
  DEFAULT_NECK_OPACITY,
  DEFAULT_HEADSTOCK_OPACITY,
} from '../../state/store';

/** Sidebar controls for canvas reference-image overlays + tracing opacities. */
export function ReferenceOverlayPanel() {
  const {
    overlays,
    activeId,
    activeOverlay,
    setActiveId,
    addImageFile,
    replaceImageFile,
    removeOverlay,
    updateOverlay,
    hasAnyImage,
  } = useReferenceOverlayContext();

  const selected = useDesignStore((s) => s.selected);
  const select = useDesignStore((s) => s.select);
  const settings = useDesignStore((s) => s.settings);
  const setBodyOpacity = useDesignStore((s) => s.setBodyOpacity);
  const setNeckOpacity = useDesignStore((s) => s.setNeckOpacity);
  const setHeadstockOpacity = useDesignStore((s) => s.setHeadstockOpacity);

  const addFileRef = useRef<HTMLInputElement | null>(null);
  const replaceFileRef = useRef<HTMLInputElement | null>(null);

  const bodyOpacity = settings.bodyOpacity ?? DEFAULT_BODY_OPACITY;
  const neckOpacity = settings.neckOpacity ?? DEFAULT_NECK_OPACITY;
  const headstockOpacity = settings.headstockOpacity ?? DEFAULT_HEADSTOCK_OPACITY;

  const selectOverlay = (id: string) => {
    setActiveId(id);
    select({ kind: 'reference', id });
  };

  const onAddFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await addImageFile(file);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      e.target.value = '';
    }
  };

  const onReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeId) return;
    try {
      await replaceImageFile(activeId, file);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      e.target.value = '';
    }
  };

  const withImages = overlays.filter((o) => o.imageUrl);
  const overlayIndex = (id: string) => overlays.findIndex((o) => o.id === id) + 1;
  const isOverlaySelected = (id: string) => selected?.kind === 'reference' && selected.id === id;

  return (
    <section className="sidebar-section" id="sidebar-reference">
      <h3>Reference overlay</h3>
      <p className="muted">
        Optional PNG/JPEG/WebP images behind the outline for tracing. Drag an
        image onto the canvas to add one. Embedded in Save JSON; not included in
        SVG exports.
      </p>

      <div className="button-row">
        <button type="button" onClick={() => addFileRef.current?.click()}>
          {hasAnyImage ? 'Add image' : 'Upload image'}
        </button>
        {activeOverlay?.imageUrl && (
          <>
            <button type="button" onClick={() => replaceFileRef.current?.click()}>
              Replace
            </button>
            <button type="button" onClick={() => removeOverlay(activeOverlay.id)}>
              Remove
            </button>
          </>
        )}
      </div>
      <input
        ref={addFileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
        hidden
        onChange={onAddFile}
      />
      <input
        ref={replaceFileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
        hidden
        onChange={onReplaceFile}
      />

      {withImages.length > 1 && (
        <div className="reference-overlay-list" role="list">
          {withImages.map((o) => {
            const selectedItem = isOverlaySelected(o.id) || o.id === activeId;
            return (
              <button
                key={o.id}
                id={`sidebar-ref-${o.id}`}
                type="button"
                role="listitem"
                className={`reference-overlay-item${selectedItem ? ' active' : ''}${
                  isOverlaySelected(o.id) ? ' reference-overlay-item-selected' : ''
                }`}
                onClick={() => selectOverlay(o.id)}
              >
                Reference {overlayIndex(o.id)}
                {!o.settings.visible ? ' (hidden)' : o.settings.locked ? ' (locked)' : ''}
              </button>
            );
          })}
        </div>
      )}

      {activeOverlay?.imageUrl && (
        <div
          id={withImages.length <= 1 ? `sidebar-ref-${activeOverlay.id}` : undefined}
          className={
            isOverlaySelected(activeOverlay.id) ? 'reference-overlay-controls-selected' : undefined
          }
        >
          {withImages.length === 1 && (
            <p className="muted" style={{ marginBottom: 4 }}>
              Reference 1
            </p>
          )}
          <label className="row-inline checkbox">
            <span>Show reference</span>
            <input
              type="checkbox"
              checked={activeOverlay.settings.visible}
              onChange={(e) => updateOverlay(activeOverlay.id, { visible: e.target.checked })}
            />
          </label>
          <label className="row-inline checkbox">
            <span>Lock overlay</span>
            <input
              type="checkbox"
              checked={activeOverlay.settings.locked}
              onChange={(e) => updateOverlay(activeOverlay.id, { locked: e.target.checked })}
            />
          </label>
          <label className="row-inline checkbox">
            <span>Flip horizontal</span>
            <input
              type="checkbox"
              checked={activeOverlay.settings.flipH}
              disabled={activeOverlay.settings.locked}
              onChange={(e) => updateOverlay(activeOverlay.id, { flipH: e.target.checked })}
            />
          </label>
          <label className="row-inline checkbox">
            <span>Flip vertical</span>
            <input
              type="checkbox"
              checked={activeOverlay.settings.flipV}
              disabled={activeOverlay.settings.locked}
              onChange={(e) => updateOverlay(activeOverlay.id, { flipV: e.target.checked })}
            />
          </label>
          <label className="param-slider">
            <div className="param-slider-row">
              <span>Opacity</span>
              <span className="param-value">{Math.round(activeOverlay.settings.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.01}
              value={activeOverlay.settings.opacity}
              disabled={activeOverlay.settings.locked}
              onChange={(e) => updateOverlay(activeOverlay.id, { opacity: parseFloat(e.target.value) })}
            />
          </label>
          <label className="param-slider">
            <div className="param-slider-row">
              <span>Scale</span>
              <span className="param-value">{activeOverlay.settings.scale.toFixed(2)}×</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={4}
              step={0.01}
              value={activeOverlay.settings.scale}
              disabled={activeOverlay.settings.locked}
              onChange={(e) => updateOverlay(activeOverlay.id, { scale: parseFloat(e.target.value) })}
            />
          </label>
          <label className="param-slider">
            <div className="param-slider-row">
              <span>Rotation</span>
              <span className="param-value">{Math.round(activeOverlay.settings.rotation)}°</span>
            </div>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={activeOverlay.settings.rotation}
              disabled={activeOverlay.settings.locked}
              onChange={(e) => updateOverlay(activeOverlay.id, { rotation: parseFloat(e.target.value) })}
            />
          </label>
          <div className="coord-inputs">
            <label>
              X (mm)
              <input
                type="number"
                step={1}
                value={Math.round(activeOverlay.settings.offsetX)}
                disabled={activeOverlay.settings.locked}
                onChange={(e) =>
                  updateOverlay(activeOverlay.id, { offsetX: parseFloat(e.target.value) || 0 })
                }
              />
            </label>
            <label>
              Y (mm)
              <input
                type="number"
                step={1}
                value={Math.round(activeOverlay.settings.offsetY)}
                disabled={activeOverlay.settings.locked}
                onChange={(e) =>
                  updateOverlay(activeOverlay.id, { offsetY: parseFloat(e.target.value) || 0 })
                }
              />
            </label>
          </div>
          <label>
            Rotation (°)
            <input
              type="number"
              step={1}
              value={Math.round(activeOverlay.settings.rotation)}
              disabled={activeOverlay.settings.locked}
              onChange={(e) =>
                updateOverlay(activeOverlay.id, { rotation: parseFloat(e.target.value) || 0 })
              }
            />
          </label>
          <p className="muted">
            Unlocked: drag the blue frame to move, blue handle to rotate. Images embed in Save
            JSON; transform settings also save locally.
          </p>
        </div>
      )}

      <h4 className="sidebar-subsection-title">Tracing opacity</h4>
      <p className="muted">Lower fills so reference images show through the outline.</p>
      <label className="param-slider">
        <div className="param-slider-row">
          <span>Body opacity</span>
          <span className="param-value">{Math.round(bodyOpacity * 100)}%</span>
        </div>
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.01}
          value={bodyOpacity}
          onChange={(e) => setBodyOpacity(parseFloat(e.target.value))}
        />
      </label>
      <label className="param-slider">
        <div className="param-slider-row">
          <span>Neck opacity</span>
          <span className="param-value">{Math.round(neckOpacity * 100)}%</span>
        </div>
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.01}
          value={neckOpacity}
          onChange={(e) => setNeckOpacity(parseFloat(e.target.value))}
        />
      </label>
      <label className="param-slider">
        <div className="param-slider-row">
          <span>Headstock opacity</span>
          <span className="param-value">{Math.round(headstockOpacity * 100)}%</span>
        </div>
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.01}
          value={headstockOpacity}
          onChange={(e) => setHeadstockOpacity(parseFloat(e.target.value))}
        />
      </label>
    </section>
  );
}
