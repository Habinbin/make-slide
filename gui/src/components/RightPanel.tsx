import { useEditor } from '../state/store';
import { THEMES } from '../data/themes';
import { LAYOUTS } from '../data/layouts';

// Friendly labels for well-known vars; anything else falls back to the raw
// custom-property name so the editor adapts to each theme's own palette.
const VAR_LABELS: Record<string, string> = {
  '--bg': '배경',
  '--surface': '표면 / 카드',
  '--border': '테두리',
  '--text': '본문 텍스트',
  '--text-primary': '본문 텍스트',
  '--text-secondary': '보조 텍스트',
  '--text-muted': '흐린 텍스트',
  '--accent': '강조색',
  '--accent-hover': '강조 hover',
  '--code-bg': '코드 배경',
};

// Normalize a CSS color into a 6-digit hex for <input type="color">. Returns
// null for values that aren't simple hex colors (gradients, rgb(), var refs).
function toHex(value: string): string | null {
  const v = value.trim();
  const m = v.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return null;
  const h = m[1];
  return h.length === 3 ? `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}` : `#${h}`;
}

export function RightPanel() {
  const theme = useEditor((s) => s.theme);
  const themeId = useEditor((s) => s.themeId);
  const overrides = useEditor((s) => s.overrides);
  const layoutId = useEditor((s) => s.layoutId);
  const selectTheme = useEditor((s) => s.selectTheme);
  const selectLayout = useEditor((s) => s.selectLayout);
  const setOverride = useEditor((s) => s.setOverride);

  const fontBody = theme?.vars['--font-body'] ?? '';
  const fontMono = theme?.vars['--font-mono'] ?? '';

  const colorVars = Object.keys(theme?.vars ?? {}).filter(
    (name) => toHex((theme!.vars[name] ?? '').trim()) !== null
  );

  return (
    <aside className="panel right">
      <section className="panel-section">
        <h2 className="panel-title">Template style</h2>
        <select className="theme-select" value={themeId} onChange={(e) => selectTheme(e.target.value)}>
          {THEMES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {t.description}
            </option>
          ))}
        </select>
        {fontBody && (
          <div className="font-info">
            <div><span>Body</span> {fontBody.split(',')[0].replace(/['"]/g, '')}</div>
            {fontMono && <div><span>Mono</span> {fontMono.split(',')[0].replace(/['"]/g, '')}</div>}
          </div>
        )}
      </section>

      <section className="panel-section">
        <h2 className="panel-title">Layout</h2>
        <p className="panel-hint">슬라이드 배치 구조를 전체 덱에 적용</p>
        <select className="theme-select" value={layoutId} onChange={(e) => selectLayout(e.target.value)}>
          <option value="">테마 기본</option>
          {LAYOUTS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} — {l.description}
            </option>
          ))}
        </select>
      </section>

      <section className="panel-section">
        <h2 className="panel-title">Selection colors</h2>
        <p className="panel-hint">테마 CSS 변수를 실시간 덮어쓰기</p>
        <div className="color-list">
          {colorVars.map((name) => {
            const raw = overrides[name] ?? theme!.vars[name];
            const hex = toHex(raw) ?? '#000000';
            return (
              <label key={name} className="color-row">
                <span className="color-label">{VAR_LABELS[name] ?? name}</span>
                <input type="color" value={hex} onChange={(e) => setOverride(name, e.target.value)} />
              </label>
            );
          })}
          {theme && colorVars.length === 0 && <p className="panel-hint">편집 가능한 색상 변수가 없습니다</p>}
        </div>
      </section>

      <section className="panel-section">
        <h2 className="panel-title">편집 팁</h2>
        <ul className="tips">
          <li>텍스트를 클릭해 바로 수정</li>
          <li>이미지·플레이스홀더 더블클릭 → 교체</li>
          <li>좌측 썸네일 드래그로 순서 변경</li>
        </ul>
      </section>
    </aside>
  );
}
