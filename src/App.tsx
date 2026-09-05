import type { CSSProperties } from 'react';
import { useDesignStore, DEFAULT_BODY_COLOR, DEFAULT_FRETBOARD_COLOR, DEFAULT_HEADSTOCK_COLOR } from './state/store';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { EditorCanvas } from './components/Editor/EditorCanvas';
import { TemplateGalleryOverlay } from './components/chrome/TemplatePicker';
import { ReferenceImageDropZone } from './components/Editor/ReferenceImageDropZone';
import { ReferenceOverlayProvider } from './state/ReferenceOverlayContext';
import { darkenHex } from './geometry/color';
import './App.css';
import './chrome.css';

export default function App() {
  const theme = useDesignStore((s) => s.appSettings.theme);
  const bodyColor = useDesignStore((s) => s.settings.bodyColor) || DEFAULT_BODY_COLOR;
  const fretboardColor = useDesignStore((s) => s.settings.fretboardColor) || DEFAULT_FRETBOARD_COLOR;
  const headstockColor = useDesignStore((s) => s.settings.headstockColor) || DEFAULT_HEADSTOCK_COLOR;

  const finishVars = {
    '--body-fill-top': bodyColor,
    '--body-fill-back': darkenHex(bodyColor, 0.18),
    '--neck-fill': fretboardColor,
    '--headstock-fill': headstockColor,
  } as CSSProperties;

  return (
    <ReferenceOverlayProvider>
      <div className={`app-root theme-${theme}`} style={finishVars}>
        <Toolbar />
        <div className="app-body">
          <main className="editor-pane">
            <ReferenceImageDropZone>
              <EditorCanvas />
            </ReferenceImageDropZone>
          </main>
          <Sidebar />
        </div>
        <TemplateGalleryOverlay />
      </div>
    </ReferenceOverlayProvider>
  );
}
