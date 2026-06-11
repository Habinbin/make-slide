# make-slide GUI Editor

브라우저 기반 WYSIWYG 슬라이드 편집기. 기존 `make-slide`의 테마/레이아웃/core 리소스를 그대로 활용합니다. (기획서: `../GUI_PLAN.md`)

## 실행

```bash
cd gui
npm install
npm run dev      # http://localhost:5180
npm run build    # dist/ 로 정적 빌드 (themes/layouts/core 포함)
```

## 구현 범위 (Phase 1~4 완료)

### Phase 1 — 에디터 셸
- **에셋 파이프라인**: `vite-plugin-static-copy`로 상위 `../themes`, `../layouts`, `../core`를 `/themes/...` 절대경로로 dev 서빙 + 빌드 포함.
- **레이아웃**: 좌측(작업 중 덱 썸네일, 세로 스크롤) / 중앙(iframe 격리 캔버스) / 우측(테마 스위처 + 레이아웃 + CSS 변수 컬러) / **하단 Slide Vault 드로어**(전폭·세로 스크롤·토글 개폐, 열렸을 때만 렌더).
- **앱 라이트/다크 모드**: 상단 ☀/🌙 토글, `[data-app-theme]` 기반, localStorage 저장(기본 라이트).
- **테마 간 슬라이드 타입 추론**: 클래스명이 테마마다 달라(`themeLoader.ts`) 주석 라벨 → 통합 클래스 힌트 → DOM 구조(표/인용/코드/리스트/이미지/위치) 순으로 추론해 10개 테마 모두에서 Vault 라벨·테마 전환 리맵이 일관 동작.
- **폰트 캐시 워밍**(`lib/fonts.ts`): 테마 폰트 링크를 부모 문서에 1회 주입해 다수 iframe 썸네일의 폰트 깨짐 방지.
- 테마 변경 시 덱 슬라이드를 같은 타입의 새 템플릿으로 리매핑해 전체 재스타일.
- **레이아웃 스위처**: 우측 패널 `Layout`에서 `/layouts/*`(Centered/Wide/Split/Editorial)를 테마처럼 선택. 각 레이아웃 `reference.html`의 `.slide` 배치 속성(display·정렬·padding·grid)을 추출해 전체 덱에 글로벌 오버라이드로 적용(`src/lib/layoutLoader.ts`). 캔버스·썸네일·익스포트(HTML/PDF/PPTX) 모두 반영.

### Phase 2 — 상태관리 & WYSIWYG 편집
- **Zustand 스토어**(`src/state/store.ts`)로 덱·선택·오버라이드 일원화.
- **DnD 순서변경**: `@hello-pangea/dnd`로 좌측 썸네일 드래그 재정렬.
- **인라인 편집**(`EditableCanvas`): 캔버스 텍스트를 클릭해 바로 수정(`contenteditable`), 편집 결과를 reload 없이 스토어에 커밋.
- **이미지 편집**: 이미지·플레이스홀더 더블클릭 → 로컬 업로드(Base64) / URL / Unsplash 검색(Access Key 필요).

### Phase 3 — 클라이언트 사이드 익스포트
- **HTML**: 검증된 테마 `reference.html` 셸을 재사용해 덱만 교체 → 단일 파일 다운로드(내비/풀스크린/발표자노트 스크립트 포함).
- **PDF**: 인쇄용 새 창 + `core/pdf-export.css`로 슬라이드당 1페이지 자동 인쇄(`window.print`).
- **PPTX**: `pptxgenjs`로 각 슬라이드를 오프스크린 렌더 → `getBoundingClientRect`/`getComputedStyle` 기반 **레이아웃 보존 native 텍스트/이미지** 매핑.

### Phase 4 — Vercel 서버리스(고품질) — `서버 렌더` 토글
- `api/export-pdf.ts`: `@sparticuz/chromium` + `puppeteer-core`로 PDF 렌더.
- `api/export-pptx-images.ts`: 슬라이드별 스크린샷(2x) → 이미지 풀블리드 PPTX.
- `vercel.json`에 함수 메모리/타임아웃 지정. 배포 환경에서만 동작(로컬 dev에는 `/api` 없음).

## 아키텍처 메모

- `src/lib/themeLoader.ts` — 테마 `reference.html`을 fetch → `DOMParser`로 head 링크 / `<style>` / `:root` 변수 / `.slide` 템플릿 + 원본 `rawHtml` 추출.
- `src/lib/iframeBuilder.ts` / `editable.ts` — 단일 슬라이드 iframe 문서 생성, 텍스트 리프 탐색·`contenteditable` 부여·직렬화·CSS 변수 라이브 오버라이드.
- `src/lib/export.ts` — HTML/PDF/PPTX(클라이언트) + 서버리스 helper.

## 배포 (Vercel)

Vercel 프로젝트의 **Root Directory = `gui`** 로 설정하면 `vercel.json`이 적용되어 정적 빌드(`dist/`) + `api/` 서버리스 함수가 함께 배포됩니다.

## 알려진 한계

- PPTX native(클라이언트)는 레이아웃 근사 매핑이라 픽셀 단위로 완벽하지 않음 → 정확도가 필요하면 `서버 렌더`(이미지 PPTX) 사용.
- Split·Editorial 레이아웃은 2단/비대칭 구조라 단일 컬럼 콘텐츠 슬라이드에선 한쪽이 비어 보일 수 있음(Centered·Wide는 모든 슬라이드에 범용).
- 색상 오버라이드는 hex 변수만 대상(그라디언트·rgba 변수 제외).
- Unsplash 검색은 사용자 Access Key 필요(브라우저 localStorage 저장).
