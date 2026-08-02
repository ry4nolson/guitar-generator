import { useDesignStore } from './state/store';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { EditorCanvas } from './components/Editor/EditorCanvas';
import './App.css';

export default function App() {
  const theme = useDesignStore((s) => s.settings.theme);

  return (
    <div className={`app-root theme-${theme}`}>
      <Toolbar />
      <div className="app-body">
        <main className="editor-pane">
          <EditorCanvas />
        </main>
        <Sidebar />
      </div>
    </div>
  );
}
