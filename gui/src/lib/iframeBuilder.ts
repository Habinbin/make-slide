import type { ParsedTheme } from './themeLoader';

// Builds a complete, self-contained HTML document (for an <iframe srcDoc>) that
// renders a single make-slide slide using the theme's own stylesheet. CSS var
// overrides from the design panel are appended as a final :root block so they
// win the cascade.
function activate(slideHtml: string): string {
  return slideHtml.replace('class="slide"', 'class="slide active"');
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
/* GUI canvas: a single slide is always visible, transitions disabled */
.slide { transition: none !important; }
</style>
</head>
<body>
<div class="deck">
${activate(slideHtml)}
</div>
</body>
</html>`;
}
