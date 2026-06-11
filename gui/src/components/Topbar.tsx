import { useState } from 'react';
import { useEditor } from '../state/store';
import {
  exportHtml,
  exportPdf,
  exportPptx,
  exportPdfServer,
  exportPptxImagesServer,
} from '../lib/export';

export function Topbar() {
  const theme = useEditor((s) => s.theme);
  const deck = useEditor((s) => s.deck);
  const overrides = useEditor((s) => s.overrides);
  const layoutCss = useEditor((s) => s.layoutCss);
  const themeId = useEditor((s) => s.themeId);
  const appTheme = useEditor((s) => s.appTheme);
  const toggleAppTheme = useEditor((s) => s.toggleAppTheme);
  const [busy, setBusy] = useState<string | null>(null);
  const [server, setServer] = useState(false);

  const run = async (kind: string, fn: () => void | Promise<void>) => {
    if (!theme || deck.length === 0) return;
    setBusy(kind);
    try {
      await fn();
    } catch (e: any) {
      alert(`내보내기 실패: ${e?.message ?? e}`);
    } finally {
      setBusy(null);
    }
  };

  const disabled = !theme || deck.length === 0;

  return (
    <header className="topbar">
      <span className="brand">make-slide</span>
      <span className="topbar-sub">GUI Editor</span>
      <span className="topbar-theme">테마: {themeId}</span>
      <div className="topbar-actions">
        <button
          className="icon-btn"
          onClick={toggleAppTheme}
          title={appTheme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
        >
          {appTheme === 'dark' ? '☀' : '🌙'}
        </button>
        <label className="server-toggle" title="Vercel 서버리스(@sparticuz/chromium)로 고품질 렌더 — 배포 환경에서만 동작">
          <input type="checkbox" checked={server} onChange={(e) => setServer(e.target.checked)} />
          서버 렌더
        </label>
        <button disabled={disabled || !!busy} onClick={() => run('html', () => exportHtml(theme!, deck, overrides, layoutCss))}>
          {busy === 'html' ? '…' : 'HTML'}
        </button>
        <button
          disabled={disabled || !!busy}
          onClick={() =>
            run('pdf', () =>
              server
                ? exportPdfServer(theme!, deck, overrides, layoutCss)
                : exportPdf(theme!, deck, overrides, layoutCss)
            )
          }
        >
          {busy === 'pdf' ? '…' : 'PDF'}
        </button>
        <button
          className="primary"
          disabled={disabled || !!busy}
          onClick={() =>
            run('pptx', () =>
              server
                ? exportPptxImagesServer(theme!, deck, overrides, layoutCss)
                : exportPptx(theme!, deck, overrides, layoutCss)
            )
          }
        >
          {busy === 'pptx' ? '변환 중…' : 'PPTX'}
        </button>
      </div>
    </header>
  );
}
