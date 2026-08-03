import type { CSSProperties } from 'react';
import { useDesignStore, DEFAULT_BODY_COLOR, DEFAULT_FRETBOARD_COLOR } from './state/store';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { EditorCanvas } from './components/Editor/EditorCanvas';
import { ReferenceOverlayProvider } from './state/ReferenceOverlayContext';
import { darkenHex } from './geometry/color';
import './App.css';

export default function App() {
  const theme = useDesignStore((s) => s.settings.theme);
  const bodyColor = useDesignStore((s) => s.settings.bodyColor) || DEFAULT_BODY_COLOR;
  const fretboardColor = useDesignStore((s) => s.settings.fretboardColor) || DEFAULT_FRETBOARD_COLOR;

  const finishVars = {
    '--body-fill-top': bodyColor,
    '--body-fill-back': darkenHex(bodyColor, 0.18),
    '--neck-fill': fretboardColor,
  } as CSSProperties;

  return (
    <ReferenceOverlayProvider>
      <div className={`app-root theme-${theme}`} style={finishVars}>
        <Toolbar />
        <div className="app-body">
          <main className="editor-pane">
            <EditorCanvas />
          </main>
          <Sidebar />
        </div>
      </div>
    </ReferenceOverlayProvider>
  );
}
