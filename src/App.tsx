import { useDesignStore } from './state/store';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { EditorCanvas } from './components/Editor/EditorCanvas';
import { ReferenceOverlayProvider } from './state/ReferenceOverlayContext';
import './App.css';

export default function App() {
  const theme = useDesignStore((s) => s.settings.theme);

  return (
    <ReferenceOverlayProvider>
      <div className={`app-root theme-${theme}`}>
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
