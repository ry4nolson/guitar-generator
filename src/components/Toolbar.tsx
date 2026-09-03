import { useRef } from 'react';
import { useDesignStore, type DesignDocument } from '../state/store';
import { downloadJson, deserializeDocument } from '../export/jsonPersistence';
import { buildSvgDocument, downloadSvg } from '../export/svgExport';
import { useReferenceOverlayContext } from '../state/ReferenceOverlayContext';
import { SplitMenu } from './chrome/SplitMenu';
import {
  IconExport,
  IconLoad,
  IconMark,
  IconMoon,
  IconRedo,
  IconReset,
  IconSave,
  IconSun,
  IconUndo,
} from './chrome/icons';

export function Toolbar() {
  const theme = useDesignStore((s) => s.settings.theme);
  const setTheme = useDesignStore((s) => s.setTheme);
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);
  const resetToDefaults = useDesignStore((s) => s.resetToDefaults);
  const resetBodyToTemplate = useDesignStore((s) => s.resetBodyToTemplate);
  const loadDocument = useDesignStore((s) => s.loadDocument);
  const past = useDesignStore((s) => s.past);
  const future = useDesignStore((s) => s.future);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toDocument: referenceOverlaysToDocument, hydrateFromDocument } = useReferenceOverlayContext();

  const currentDocument = (): DesignDocument => {
    const s = useDesignStore.getState();
    return {
      version: s.version,
      templateId: s.templateId,
      bodyParams: s.bodyParams,
      bodyAnchors: s.bodyAnchors,
      neckParams: s.neckParams,
      hardware: s.hardware,
      bridgeSettings: s.bridgeSettings,
      nutSettings: s.nutSettings,
      headstockSettings: s.headstockSettings,
      headstockAnchors: s.headstockAnchors,
      pickupSettings: s.pickupSettings,
      controlSettings: s.controlSettings,
      settings: s.settings,
      layers: s.layers,
      referenceOverlays: referenceOverlaysToDocument(),
    };
  };

  const handleSave = () => downloadJson(currentDocument());

  const handleLoadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const doc = deserializeDocument(text);
      loadDocument(doc);
      hydrateFromDocument(doc.referenceOverlays);
    } catch (err) {
      alert(`Could not load design: ${(err as Error).message}`);
    } finally {
      e.target.value = '';
    }
  };

  const exportSvg = (flavor: 'clean' | 'blueprint' | 'fabrication') => {
    const svg = buildSvgDocument(currentDocument(), flavor);
    downloadSvg(svg, `guitloft-${flavor}.svg`);
  };

  return (
    <header className="toolbar">
      <div className="toolbar-group">
        <span className="brand">
          <IconMark />
          Guitloft
        </span>
      </div>

      <span className="toolbar-divider" />

      <div className="toolbar-group">
        <button type="button" className="toolbar-btn" onClick={undo} disabled={past.length === 0} title="Undo (⌘Z)">
          <IconUndo />
          <span className="toolbar-btn-label">Undo</span>
        </button>
        <button type="button" className="toolbar-btn" onClick={redo} disabled={future.length === 0} title="Redo (⌘⇧Z)">
          <IconRedo />
          <span className="toolbar-btn-label">Redo</span>
        </button>
        <SplitMenu
          label="Reset"
          icon={<IconReset />}
          title="Reset body or entire design"
          items={[
            {
              label: 'Reset body',
              onClick: () =>
                confirm('Reset the body to the current template defaults?') && resetBodyToTemplate(),
            },
            {
              label: 'Reset all',
              onClick: () =>
                confirm('Reset the WHOLE design (body, neck, hardware, settings) to defaults?') &&
                resetToDefaults(),
            },
          ]}
        />
      </div>

      <span className="toolbar-divider" />

      <div className="toolbar-group">
        <button type="button" className="toolbar-btn" onClick={handleSave} title="Save JSON">
          <IconSave />
          <span className="toolbar-btn-label">Save</span>
        </button>
        <button type="button" className="toolbar-btn" onClick={handleLoadClick} title="Load JSON">
          <IconLoad />
          <span className="toolbar-btn-label">Load</span>
        </button>
        <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleFileChange} />
        <SplitMenu
          label="Export"
          icon={<IconExport />}
          title="Export SVG"
          items={[
            { label: 'Clean SVG', onClick: () => exportSvg('clean') },
            { label: 'Blueprint', onClick: () => exportSvg('blueprint') },
            { label: 'Fabrication (1:1 mm)', onClick: () => exportSvg('fabrication') },
          ]}
        />
      </div>

      <span className="toolbar-spacer" />

      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-btn icon-only"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
      </div>
    </header>
  );
}
