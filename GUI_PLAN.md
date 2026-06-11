# 🎯 make-slide GUI Presentation Web App 기획 및 설계서

본 기획서는 CLI 및 AI 스킬 기반으로 단일 HTML 슬라이드를 생성하던 기존 `make-slide` 프로젝트의 핵심 리소스(Themes, Layouts, Core JS/CSS, Export Specs)를 전면 활용하여, 사용자가 브라우저에서 시각적으로 슬라이드를 편집하고 내보낼 수 있는 **GUI 기반 WYSIWYG 프레젠테이션 애플리케이션**을 구축하기 위한 아키텍처 및 구현 계획입니다.

---

## 1. 프로젝트 개요 & 비전

### 1.1 배경 및 목적
* **기존 프로젝트의 가치**: `make-slide`는 이미 검증된 10개의 프리미엄 테마 디자인 스택, 4가지 핵심 레이아웃 구조, 12종의 슬라이드 타입 스펙을 보유하고 있습니다.
* **목표**: AI에 의존하는 CLI 방식에서 한 단계 나아가, Figma나 Canva와 같이 마우스 클릭과 타이핑만으로 슬라이드를 추가/편집하고 테마/레이아웃을 실시간 교체하며, 고품질 **HTML, PDF, PPTX**로 즉시 내보낼 수 있는 반응형 웹 저작 도구를 개발합니다.

### 1.2 핵심 사용자 경험 (UX)
1. **템플릿 보관함 (Slide Vault)**: 현재 선택된 테마 디자인이 적용된 12가지 슬라이드 레이아웃의 실시간 프리뷰를 제공하며, 원하는 슬라이드를 드래그 앤 드롭 또는 클릭으로 간편하게 캔버스에 추가합니다.
2. **실시간 테마 및 레이아웃 스위처**: 클릭 한 번으로 문서 전체의 CSS 변수 스택(배경색, 포인트 색상, 타이포그래피 등)과 레이아웃 구조(Centered, Wide, Split, Editorial)를 변경합니다.
3. **직관적인 WYSIWYG 편집**: 캔버스의 텍스트 요소를 더블클릭하여 수정하고, 이미지 플레이스홀더를 통해 즉석에서 이미지를 업로드하거나 Unsplash API로 검색해 배치합니다.
4. **원스톱 익스포트 (Export)**: 로컬 저장 및 프레젠테이션용 단일 HTML 파일, 인쇄 및 공유용 PDF, native/screenshot 방식의 PPTX 파일을 클라이언트 사이드에서 즉시 내보냅니다.

---

## 2. GUI 웹 애플리케이션 아키텍처

Figma 스타일의 고성능 슬라이드 편집기를 브라우저 상에서 매끄럽게 구동하기 위해 아래와 같은 아키텍처를 제안합니다.

```
┌────────────────────────────────────────────────────────┐
│                    GUI Editor App                      │
│                                                        │
│  ┌────────────────┐ ┌────────────────┐ ┌─────────────┐ │
│  │   Left Panel   │ │ Center Canvas  │ │ Right Panel │ │
│  │ (Slide Vault / │ │    (IFrame     │ │  (Design /  │ │
│  │   Thumbnails)  │ │   Isolation)   │ │ Customizer) │ │
│  └────────────────┘ └────────────────┘ └─────────────┘ │
└─────────────────────────┬──────────────────────────────┘
                          │ (Zustand Global State)
                          ▼
┌────────────────────────────────────────────────────────┐
│                   make-slide Core                      │
│                                                        │
│   /themes   ← [CSS Variables & Theme Definitions]      │
│   /layouts  ← [HTML Structures & Grid Definitions]     │
│   /core     ← [Base CSS, Navigation, Speaker Notes]    │
└────────────────────────────────────────────────────────┘
```

### 2.1 Iframe 기반 스타일 격리 (Canvas Sandbox)
* **문제점**: 웹앱의 UI 스타일(예: TailwindCSS)과 프레젠테이션 테마의 스타일(예: `neon-terminal`, `gradient-pop`)이 한 문서 내에서 섞이면 스타일 충돌 및 폰트 깨짐이 발생합니다.
* **해결책**: 슬라이드 편집 캔버스를 **`<iframe>` 내부**에 배치하여 완전히 독립된 환경을 제공합니다.
  * 부모 창(React App)은 슬라이드 구조 데이터(JSON/HTML)를 관리합니다.
  * Zustand 상태가 변경되면 iframe 내부로 DOM 데이터를 동기화하고 테마 CSS 변수를 주입합니다.
  * iframe 내부의 요소들에 `contenteditable="true"` 속성을 부여해 직접 텍스트 편집이 가능하도록 제어합니다.

---

## 3. 기존 `make-slide` 리소스 전면 활용 방안

기존 프로젝트의 디렉토리 구조를 API 및 에셋 파이프라인으로 직접 바인딩합니다.

### 3.1 테마 데이터베이스 (`/themes`) 활용
* GUI 앱 시작 시, `/themes/*/reference.html` 및 `README.md`를 스캔하여 테마 메타데이터를 추출합니다.
* **디자인 시스템 (CSS Variables) 바인딩**:
  * 테마 폴더 내의 `:root` 스타일 변수군(`--bg`, `--text`, `--accent`, `--surface`, `--border`, `--font-body`)을 파싱하여 GUI 우측 패널의 Color Picker 및 폰트 변경 도구와 실시간으로 양방향 바인딩합니다.
  * 예: 사용자가 우측 패널에서 Accent Color를 변경하면, iframe 내부의 `--accent` 변수값을 즉시 덮어씁니다.

### 3.2 레이아웃 & 슬라이드 타입 (`/layouts`, `/references/slide-types.md`) 활용
* **슬라이드 보관함 (Slide Vault) 데이터 구성**:
  * `/references/slide-types.md`에 기술된 12종의 슬라이드 사양(Title, Agenda, Divider, Content, Quote, Comparison, Flow, Grid, Chart, Code, Image, Closing)을 GUI의 템플릿 컴포넌트 목록으로 맵핑합니다.
  * 각 테마의 `reference.html`에 이미 완성형 마크업 예시가 존재하므로, 테마별 레이아웃 엔진이 각 마크업을 복사해와 새로운 슬라이드를 생성할 때 디폴트 뼈대(Scaffold)로 활용합니다.
  * **Layouts (`/layouts`)**에 정의된 구조(Centered, Split, Editorial 등)를 전체 슬라이드 혹은 개별 슬라이드의 최상위 CSS 클래스에 반영합니다.

### 3.3 내비게이션 & 프리젠테이션 로직 (`/core`) 활용
* 사용자가 편집을 마치고 **HTML로 내보내기**를 실행할 때:
  1. `/core/base.css`와 선택된 테마의 스타일시트를 결합하여 인라인 `<style>`로 주입합니다.
  2. `/core/navigation.js`(방향키/스와이프 이동), `/core/fullscreen.js`(F키 풀스크린), `/core/speaker-notes.js`(S키 발표자 노트)의 코드를 압축(minify)하여 HTML 하단 `<script>`에 포함시킵니다.
  3. 결과물로 **단 하나의 완전 무결한 HTML 파일**이 완성되어 오프라인에서도 완전하게 프리젠테이션 모드가 작동합니다.

---

## 4. 핵심 기능 설계 (Figma 스타일 연계)

제공된 Figma 템플릿 스크린샷과 연계하여 GUI 패널들의 기능적 책임을 정의합니다.

### 4.1 Left Panel: 슬라이드 아웃라인 & 보관함 (Slide Vault)
* **기능 1: Slides List (썸네일)**
  * 현재 프레젠테이션의 전체 슬라이드를 세로 그리드로 미리 보여줍니다.
  * `@hello-pangea/dnd`를 이용하여 슬라이드를 드래그 앤 드롭해 순서를 재정렬(Reorder)할 수 있습니다.
  * 슬라이드 추가, 복제(Duplicate), 삭제 버튼을 지원합니다.
* **기능 2: Slide Vault (템플릿 보관함)**
  * 12가지 핵심 슬라이드 타입별 레이아웃 컴포넌트 프리뷰를 보여줍니다.
  * 활성화된 테마의 스타일이 적용된 형태로 렌더링되어, 사용자는 결과물을 미리 직관적으로 인지한 채 원하는 슬라이드를 즉시 추가(Add all slides 혹은 개별 추가)할 수 있습니다.

### 4.2 Center Panel: WYSIWYG 편집 캔버스 (Editor Canvas)
* **텍스트 편집**:
  * 제목, 본문, 인용구, 카드 텍스트 등 모든 텍스트 영역에 마우스 호버 시 아웃라인 가이드가 그려지며, 클릭하면 바로 편집 가능한 상태가 됩니다. (`contenteditable` 활용)
* **이미지 처리**:
  * Unsplash API와 연동된 이미지 팝업창을 지원하여 키워드 검색 후 원하는 이미지를 바로 레이아웃의 `<img>` 태그에 적용할 수 있습니다.
  * 드래그 앤 드롭을 통한 로컬 이미지 업로드 및 Base64 인코딩 주입 기능을 지원하여 순수 단일 파일 배포 사양을 충족합니다.
* **차트 및 데이터 시각화**:
  * CSS-only로 정의된 바 차트나 KPI 카드 등의 수치 부분을 인라인 인풋창을 통해 손쉽게 업데이트할 수 있습니다.

### 4.3 Right Panel: 디자인 & 스타일 커스텀 패널 (Design & Customizer)
* **Template style (글로벌 템플릿 제어)**
  * 10가지 기본 테마 목록을 콤보박스로 배치하여 전체 프레젠테이션의 분위기를 한 번에 바꿉니다.
  * 현재 테마의 기본 폰트 페어(예: Montagu Slab + Source Serif Pro) 조합 정보를 보여줍니다.
* **Background (배경 수정)**
  * 단색(Solid Color): 컬러 피커를 통해 전체 혹은 개별 슬라이드의 배경색 수정.
  * 그라디언트(Gradient): 선형(Linear)/원형(Radial) 그라디언트 앵커를 추가 및 편집할 수 있도록 도구 지원.
  * 이미지(Image): 배경으로 사용할 로컬 파일 업로드 혹은 URL 연결.
* **Selection colors (컬러 팔레트)**
  * 해당 테마를 구성하는 주요 3~5가지 컬러 조합을 칩 형태로 노출하여, 디자인의 일관성을 잃지 않으면서도 세부 색상을 빠르게 수정할 수 있게 합니다.

---

## 5. 익스포트 엔진 (Export Pipeline) & Vercel 서버리스 연동

Vercel은 기본적으로 서버리스(Serverless) 및 에지(Edge) 환경이므로, 기존의 무거운 로컬 라이브러리(기본 Puppeteer 등)를 그대로 사용하면 AWS Lambda 용량 제한(50MB)이나 실행 시간 초과(Timeout) 문제가 발생할 수 있습니다. 따라서 **클라이언트 사이드 전용 방식**과 **서버리스 헬퍼 방식**을 결합한 하이브리드 익스포트 파이프라인을 구축합니다.

```
                    ┌───────────────────────────┐
                    │     GUI Slide Editor      │
                    └─────────────┬─────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   HTML Export    │    │    PDF Export    │    │   PPTX Export    │
├──────────────────┤    ├──────────────────┤    ├──────────────────┤
│ • Pure Client    │    │ • [Option A]     │    │ • [Option A]     │
│   (Zustand State │    │   Pure Client    │    │   Pure Client    │
│   -> HTML Blob)  │    │   (window.print  │    │   (PptxGenJS     │
│ • static 에셋    │    │   with CSS)      │    │   Native Text/   │
│   인라인 병합    │    │ • [Option B]     │    │   Shape Map)     │
│ • 즉시 다운로드  │    │   Serverless API │    │ • [Option B]     │
│                  │    │   (Sparticuz +   │    │   Serverless API │
│                  │    │   Chromium PDF)  │    │   (Image Slide)  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

### 5.1 HTML 내보내기 (100% 클라이언트 사이드)
* **메커니즘**: 서버를 거치지 않고 브라우저 내에서 완전히 처리하여 Vercel의 서버 자원을 0으로 유지합니다.
* **프로세스**:
  1. Zustand 상태에 기록된 슬라이드 구조 데이터(JSON)를 HTML 마크업으로 가공합니다.
  2. Vite를 통해 static 에셋으로 배포된 `/core/base.css`, 테마 CSS, `/core/navigation.js` 등을 브라우저 `fetch`로 로드하여 단일 HTML 텍스트 파일 내에 인라인으로 결합합니다.
  3. `Blob` 객체를 생성하여 다운로드 처리합니다.
     ```javascript
     const blob = new Blob([fullHtmlString], { type: 'text/html;charset=utf-8' });
     saveAs(blob, "presentation.html");
     ```

### 5.2 PDF 내보내기 (하이브리드 지원)
* **방법 1: 브라우저 인쇄 모드 (클라이언트 사이드 - 기본)**
  * 사용자가 내보내기 버튼 클릭 시 `window.print()`를 트리거합니다.
  * `@media print` CSS가 캔버스 외부 UI를 모두 숨기고 가로형 프레젠테이션 비율로 분할하여 로컬 PDF 인쇄를 유도합니다. Vercel 서버 부하가 전혀 없어 가장 비용 효율적입니다.
* **방법 2: Vercel Serverless Function PDF 생성 (고품질 인쇄)**
  * `@sparticuz/chromium` (용량 최적화된 AWS Lambda용 크로미움)과 `puppeteer-core`를 활용한 서버리스 API 함수(`/api/export-pdf.ts`)를 작성합니다.
  * 클라이언트가 마크업 데이터를 POST로 요청하면, Vercel Serverless Function이 Chromium을 실행하여 해당 슬라이드를 PDF 버퍼로 렌더링하고 스트림으로 반환합니다.

### 5.3 PPTX 내보내기 (하이브리드 지원)
* **방법 1: PptxGenJS 기반 클라이언트 사이드 변환 (Native - 권장)**
  * 브라우저 환경에서 `pptxgenjs` 모듈을 직접 구동합니다.
  * 슬라이드 배열을 순회하며 마크업 내부의 `<h1>`, `<p>`, `<ul>` 텍스트 요소들의 좌표를 분석하고, 파워포인트 호환 폰트(Arial 등)를 할당하여 브라우저 내에서 직접 `.pptx` 파일로 패키징해 다운로드합니다. 서버 비용이 들지 않고 다운로드가 즉각적입니다.
* **방법 2: 스크린샷 이미지 PPTX 변환 (서버리스 헬퍼)**
  * 렌더링 품질을 100% 복제하기 위한 스크린샷 방식은 Vercel API(`/api/export-pptx-images.ts`)로 이관합니다.
  * `@sparticuz/chromium`을 사용하여 백그라운드에서 각 슬라이드를 캡처(1280x720 PNG)한 후, PptxGenJS(NodeJS 환경)를 통해 캡처 이미지를 PPTX 각 페이지에 꽉 차게 삽입하여 클라이언트에 바이너리 형태로 제공합니다.

---

## 6. 개발 기술 스택 제안 (Vercel 최적화)

| 레이어 | 기술 스택 | Vercel 배포/서버리스 고려사양 |
|---|---|---|
| **프레임워크** | **React + Vite** (TypeScript) | 빌드된 정적 에셋이 Vercel CDN을 통해 전 세계 에지에 초고속 서빙됨. |
| **에셋 파이프라인** | **Static Directory Copy** | `/themes`, `/layouts`, `/core` 에셋을 Vite의 `public/` 하위 폴더로 구성하여, 브라우저가 `/themes/minimal-dark/reference.html` 등을 CDN 캐시로 신속히 fetch하도록 구현. |
| **상태 관리** | **Zustand** | 가벼운 스토어 기반으로 클라이언트 데이터 동기화. |
| **PPTX 생성** | **PptxGenJS** (Pure JS) | 클라이언트 사이드에서 native PPTX 변환을 처리하여 서버 트래픽 최소화. |
| **서버리스 캡처 API** | **@sparticuz/chromium** + **puppeteer-core** | Vercel의 Serverless Function 용량 제한(50MB)을 충족하기 위한 전용 경량 크로미움 스택. |
| **서버리스 플랫폼** | **Vercel Serverless Functions** | `/api` 디렉토리 하위에 익스포트 엔드포인트 구성. |

---

## 7. Vercel 배포 및 서버리스 환경 설정

### 7.1 에셋 동적 서빙 구성
Vite 빌드 시 기존의 layouts, themes, core를 빌드 결과물(`dist`)에 포함하기 위해, 프로젝트 구조 내의 해당 디렉토리들을 `public/` 디렉토리와 연동하거나 Vite 빌드 스크립트를 변경합니다.
* **Vite Config 연동 예시**:
  `themes/`, `layouts/`, `core/`에 위치한 reference 정적 파일을 빌드 타임에 `public/` 폴더 내로 심볼릭 링크하거나 `vite-plugin-static-copy`를 활용해 빌드 출력물에 통합합니다.

### 7.2 Vercel 설정 파일 (`vercel.json`) 작성
서버리스 함수 용량 확보 및 Puppeteer 구동에 필요한 메모리 설정을 기재합니다.

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    },
    {
      "src": "api/**/*.ts",
      "use": "@vercel/node"
    }
  ],
  "functions": {
    "api/export-pdf.ts": {
      "memory": 1024,
      "maxDuration": 15
    },
    "api/export-pptx-images.ts": {
      "memory": 1024,
      "maxDuration": 15
    }
  },
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

---

## 8. 단계별 실행 로드맵 (Roadmap)

### Phase 1: Vite + React UI 개발 및 정적 에셋 로딩 (1~2주)
* Vite 프로젝트를 생성하고, `themes/`, `layouts/`, `core/` 파일들을 브라우저에서 `/themes/...` 형태의 절대경로로 페치할 수 있도록 개발 에셋 파이프라인을 구축합니다.
* 캔버스를 `<iframe>` 내부에 렌더링하고, 테마 목록 클릭 시 해당하는 테마의 reference HTML을 페치해와 iframe DOM을 주입하고 CSS 변수를 설정하는 프로토타입을 완성합니다.

### Phase 2: WYSIWYG 편집 및 로컬 상태 관리 (2주)
* Zustand 스토어를 이용해 슬라이드 목록 상태(순서, 데이터 내용 등)를 관리합니다.
* Left Panel의 썸네일 드래그 앤 드롭 및 Slide Vault 목록 추가, Center Panel의 `contenteditable` 연동 인라인 텍스트 수정 및 이미지 업로드/Unsplash 검색 UI를 구현합니다.

### Phase 3: 100% 클라이언트 사이드 익스포트 파이프라인 개발 (1주)
* Vercel 서버 비용 부담 없이 즉각 동작 가능한 **HTML 내보내기**와 **PptxGenJS 기반 클라이언트 사이드 PPTX 내보내기**, 브라우저 `window.print()`를 활용한 **PDF 내보내기**를 완성합니다.

### Phase 4: Vercel 서버리스 헬퍼 API 구축 및 배포 (1~2주)
* Vercel Serverless Function 환경에서 작동하는 `@sparticuz/chromium` + `puppeteer-core` 렌더러 `/api/export-pdf` 및 `/api/export-pptx-images`를 개발합니다.
* Vercel 배포를 실행하고 서버리스 콜드 스타트 및 실행 시간 초과(Timeout) 한계 대응을 위한 최적화(예: 이미지 퀄리티 및 크기 최적화)를 진행합니다.

