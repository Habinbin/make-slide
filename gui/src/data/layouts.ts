// Static manifest of the make-slide structural layouts. Each maps to
// /layouts/<id>/reference.html, whose `.slide` ruleset defines how slide
// content is positioned. Applied as a global override on top of any theme.
export interface LayoutMeta {
  id: string;
  name: string;
  description: string;
}

// The empty id means "no override" — use the theme's own slide layout.
export const DEFAULT_LAYOUT_ID = '';

export const LAYOUTS: LayoutMeta[] = [
  { id: 'centered', name: 'Centered', description: '중앙 정렬 · 범용' },
  { id: 'wide', name: 'Wide', description: '좌측 정렬 · 전체 폭' },
  { id: 'split', name: 'Split', description: '2단 그리드' },
  { id: 'editorial', name: 'Editorial', description: '비대칭 · 하단 정렬' },
];
