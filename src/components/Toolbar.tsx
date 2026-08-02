import { useRef } from 'react';
import { useDesignStore, type DesignDocument } from '../state/store';
import { downloadJson, deserializeDocument } from '../export/jsonPersistence';
import { buildSvgDocument, downloadSvg } from '../export/svgExport';
import type { ViewMode } from '../geometry/types';

const VIEWS: { key: ViewMode; label: string }[] = [
  { key: 'top', label: 'Top' },
  { key: 'back', label: 'Back' },
  { key: 'construction', label: 'Construction' },
];

export function Toolbar() {
  const view = useDesignStore((s) => s.settings.view);
  const setView = useDesignStore((s) => s.setView);
  const theme = useDesignStore((s) => s.settings.theme);
  const setTheme = useDesignStore((s) => s.setTheme);
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);
  const resetToDefaults = useDesignStore((s) => s.resetToDefaults);
  const loadDocument = useDesignStore((s) => s.loadDocument);
  const past = useDesignStore((s) => s.past);
  const future = useDesignStore((s) => s.future);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentDocument = (): DesignDocument => {
    const s = useDesignStore.getState();
    return {
      version: s.version,
      bodyParams: s.bodyParams,
      bodyAnchors: s.bodyAnchors,
      neckParams: s.neckParams,
      hardware: s.hardware,
      settings: s.settings,
      layers: s.layers,
    };
  };

  const handleSave = () => downloadJson(currentDocument());

  const handleLoadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      loadDocument(deserializeDocument(text));
    } catch (err) {
      alert(`Could not load design: ${(err as Error).message}`);
    } finally {
      e.target.value = '';
    }
  };

  const exportSvg = (flavor: 'clean' | 'blueprint' | 'fabrication') => {
    const svg = buildSvgDocument(currentDocument(), flavor);
    downloadSvg(svg, `guitar-design-${flavor}.svg`);
  };

  return (
    <header className="toolbar">
      <div className="toolbar-group">
        <span className="brand">Headless Guitar Designer</span>
      </div>

      <div className="toolbar-group">
        {VIEWS.map((v) => (
          <button key={v.key} className={view === v.key ? 'active' : ''} onClick={() => setView(v.key)}>
            {v.label}
          </button>
        ))}
      </div>

      <div className="toolbar-group">
        <button onClick={undo} disabled={past.length === 0} title="Undo">
          ↶ Undo
        </button>
        <button onClick={redo} disabled={future.length === 0} title="Redo">
          ↷ Redo
        </button>
        <button onClick={() => confirm('Reset the whole design to defaults?') && resetToDefaults()}>Reset</button>
      </div>

      <div className="toolbar-group">
        <button onClick={handleSave}>Save JSON</button>
        <button onClick={handleLoadClick}>Load JSON</button>
        <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleFileChange} />
      </div>

      <div className="toolbar-group">
        <button onClick={() => exportSvg('clean')}>Export SVG</button>
        <button onClick={() => exportSvg('blueprint')}>Export blueprint</button>
        <button onClick={() => exportSvg('fabrication')}>Export fabrication (1:1 mm)</button>
      </div>

      <div className="toolbar-group">
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? '☀ Light' : '🌙 Dark'}
        </button>
      </div>
    </header>
  );
}
