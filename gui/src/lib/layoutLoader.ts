// Fetches a make-slide layout reference.html and distills its `.slide` ruleset
// into a set of positioning overrides that can be injected on top of any theme.
// Slide-show mechanics (position/inset/opacity/transition) are intentionally
// excluded so only the visual arrangement changes.
const LAYOUT_KEYS = [
  'display',
  'flex-direction',
  'justify-content',
  'align-items',
  'text-align',
  'padding',
  'grid-template-columns',
  'grid-template-rows',
  'gap',
];

/** Returns a `.slide { ... !important }` override CSS string, or '' for no/unknown layout. */
export async function loadLayoutCss(id: string): Promise<string> {
  if (!id) return '';
  const res = await fetch(`/layouts/${id}/reference.html`);
  if (!res.ok) throw new Error(`레이아웃을 불러올 수 없습니다: ${id} (${res.status})`);
  const html = await res.text();
  const m = html.match(/\.slide\s*\{([^}]*)\}/);
  if (!m) return '';

  const kept: string[] = [];
  for (const decl of m[1].split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const key = decl.slice(0, i).trim();
    const val = decl.slice(i + 1).trim();
    if (key && val && LAYOUT_KEYS.includes(key)) kept.push(`  ${key}: ${val} !important;`);
  }
  return kept.length ? `.slide {\n${kept.join('\n')}\n}` : '';
}
