import { useEffect } from 'react';
import { useEditor } from './state/store';
import { LeftPanel } from './components/LeftPanel';
import { EditableCanvas } from './components/EditableCanvas';
import { RightPanel } from './components/RightPanel';
import { Topbar } from './components/Topbar';

export function App() {
  const themeId = useEditor((s) => s.themeId);
  const selectTheme = useEditor((s) => s.selectTheme);

  // Initial theme load.
  useEffect(() => {
    selectTheme(themeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app">
      <Topbar />
      <div className="workspace">
        <LeftPanel />
        <EditableCanvas />
        <RightPanel />
      </div>
    </div>
  );
}
