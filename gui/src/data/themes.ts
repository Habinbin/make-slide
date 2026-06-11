// Static manifest of the make-slide themes. The directory names map 1:1 to
// /themes/<id>/reference.html served by Vite. Display metadata is hand-kept
// here; colors/fonts are parsed from each theme's :root at load time.
export interface ThemeMeta {
  id: string;
  name: string;
  description: string;
}

export const THEMES: ThemeMeta[] = [
  { id: 'minimal-dark', name: 'Minimal Dark', description: '테크 컨퍼런스 · 다크' },
  { id: 'minimal-light', name: 'Minimal Light', description: '깔끔한 라이트' },
  { id: 'keynote-apple', name: 'Keynote Apple', description: '애플 키노트풍' },
  { id: 'corporate', name: 'Corporate', description: '비즈니스 · 신뢰감' },
  { id: 'gradient-pop', name: 'Gradient Pop', description: '선명한 그라디언트' },
  { id: 'data-focus', name: 'Data Focus', description: '데이터 · 대시보드' },
  { id: 'magazine', name: 'Magazine', description: '에디토리얼 매거진' },
  { id: 'neon-terminal', name: 'Neon Terminal', description: '네온 터미널' },
  { id: 'paper', name: 'Paper', description: '종이 질감 · 따뜻함' },
  { id: 'playful', name: 'Playful', description: '경쾌하고 컬러풀' },
];

export const DEFAULT_THEME_ID = 'minimal-dark';
