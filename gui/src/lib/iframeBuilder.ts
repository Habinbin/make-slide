import type { ParsedTheme } from './themeLoader';

// Builds a complete, self-contained HTML document (for an <iframe srcDoc>) that
// renders a single make-slide slide using the theme's own stylesheet. CSS var
// overrides from the design panel are appended as a final :root block so they
// win the cascade.
// Add "active" to the root slide element's class list, regardless of any
// theme-specific modifier classes (e.g. "slide slide-dark title-slide").
// Matching only `class="slide"` exactly would miss compound-class themes,
// leaving the slide at opacity:0 (renders as a blank/black box).
export function activate(slideHtml: string): string {
  return slideHtml.replace(/class="([^"]*)"/, 'class="$1 active"');
}

function overrideBlock(overrides: Record<string, string>): string {
  const keys = Object.keys(overrides);
  if (keys.length === 0) return '';
  const lines = keys.map((k) => `  ${k}: ${overrides[k]};`).join('\n');
  return `\n:root {\n${lines}\n}\n`;
}

export function buildSlideDoc(
  theme: ParsedTheme,
  slideHtml: string,
  overrides: Record<string, string> = {},
  layoutCss = ''
): string {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="UTF-8">
${theme.headLinks}
<style>
${theme.styleCss}
${overrideBlock(overrides)}
${layoutCss}
/* GUI canvas: single slide always visible; reveal animations forced to their
   end state so content shows instantly in the editor and thumbnails. */
.slide { transition: none !important; }
.slide .a { opacity: 1 !important; transform: none !important; animation: none !important; transition: none !important; }
</style>
</head>
<body>
<div class="deck">
${activate(slideHtml)}
</div>
</body>
</html>`;
}
