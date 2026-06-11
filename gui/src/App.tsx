import { useEffect } from 'react';
import { useEditor } from './state/store';
import { primeFonts } from './lib/fonts';
import { LeftPanel } from './components/LeftPanel';
import { EditableCanvas } from './components/EditableCanvas';
import { RightPanel } from './components/RightPanel';
import { Topbar } from './components/Topbar';
import { VaultDrawer } from './components/VaultDrawer';

export function App() {
  const themeId = useEditor((s) => s.themeId);
  const selectTheme = useEditor((s) => s.selectTheme);
  const headLinks = useEditor((s) => s.theme?.headLinks);
  const appTheme = useEditor((s) => s.appTheme);

  // Initial theme load.
  useEffect(() => {
    selectTheme(themeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warm the font cache in the parent doc so iframe thumbnails render reliably.
  useEffect(() => {
    if (headLinks) primeFonts(headLinks);
  }, [headLinks]);

  // App chrome light/dark.
  useEffect(() => {
    document.documentElement.setAttribute('data-app-theme', appTheme);
  }, [appTheme]);

  return (
    <div className="app">
      <Topbar />
      <div className="workspace">
        <LeftPanel />
        <EditableCanvas />
        <RightPanel />
      </div>
      <VaultDrawer />
    </div>
  );
}
