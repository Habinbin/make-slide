import { useEditor } from '../state/store';
import { buildSlideDoc } from '../lib/iframeBuilder';
import { SlideFrame } from './SlideFrame';

// Full-width collapsible Slide Vault at the bottom of the editor. Items render
// only while open (keeps the iframe count — and font loading — light).
export function VaultDrawer() {
  const theme = useEditor((s) => s.theme);
  const overrides = useEditor((s) => s.overrides);
  const layoutCss = useEditor((s) => s.layoutCss);
  const addSlide = useEditor((s) => s.addSlide);
  const open = useEditor((s) => s.vaultOpen);
  const toggle = useEditor((s) => s.toggleVault);

  const count = theme?.templates.length ?? 0;

  return (
    <section className={`vault-drawer ${open ? 'open' : ''}`}>
      <button className="vault-drawer-head" onClick={toggle} aria-expanded={open}>
        <span className="vault-chevron">{open ? '▾' : '▸'}</span>
        <span className="vault-drawer-title">Slide Vault</span>
        <span className="vault-drawer-sub">현재 테마 레이아웃 {count}종 · 클릭하면 추가</span>
      </button>
      {open && (
        <div className="vault-drawer-body">
          {theme?.templates.map((t) => (
            <button key={t.id} className="vault-item" onClick={() => addSlide(t)} title={`${t.label} 추가`}>
              <SlideFrame doc={buildSlideDoc(theme, t.html, overrides, layoutCss)} width={208} />
              <span className="vault-label">{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
