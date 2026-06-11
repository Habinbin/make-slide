// Fetches a make-slide theme reference.html and parses it into the pieces the
// GUI needs: the head <link> tags (web fonts / Prism), the theme <style> block,
// the :root CSS custom properties, and the individual .slide templates.

export interface SlideTemplate {
  id: string;
  type: string;
  label: string;
  html: string; // outerHTML of the .slide element, sans "active"
  notes: string;
}

export interface ParsedTheme {
  id: string;
  rawHtml: string; // the original reference.html, reused as the export shell
  headLinks: string; // concatenated <link> tags from <head>
  styleCss: string; // inner text of the theme <style> block
  vars: Record<string, string>; // parsed :root custom properties
  templates: SlideTemplate[];
}

// Best-effort slide-type inference from descendant class names. Order matters:
// the first matching selector wins.
const TYPE_RULES: Array<{ sel: string; type: string; label: string }> = [
  { sel: '.slide-title', type: 'title', label: 'Title' },
  { sel: '.toc-list', type: 'agenda', label: 'Agenda' },
  { sel: '.divider-number, .section-number', type: 'divider', label: 'Divider' },
  { sel: '.slide-quote', type: 'quote', label: 'Quote' },
  { sel: '.comparison', type: 'comparison', label: 'Comparison' },
  { sel: '.steps, .flow', type: 'flow', label: 'Flow' },
  { sel: '.cards', type: 'cards', label: 'Cards' },
  { sel: '.bar-chart, .metrics, .chart', type: 'chart', label: 'Chart' },
  { sel: '.code-container', type: 'code', label: 'Code' },
  { sel: '.image-placeholder', type: 'image', label: 'Image' },
  { sel: '.slide-closing', type: 'closing', label: 'Closing' },
  { sel: '.content-body', type: 'content', label: 'Content' },
];

function inferType(slide: Element, index: number): { type: string; label: string } {
  for (const rule of TYPE_RULES) {
    if (slide.querySelector(rule.sel)) return { type: rule.type, label: rule.label };
  }
  return { type: 'content', label: `Slide ${index + 1}` };
}

function parseRootVars(styleCss: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const rootMatch = styleCss.match(/:root\s*\{([^}]*)\}/);
  if (!rootMatch) return vars;
  const body = rootMatch[1];
  const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    vars[m[1].trim()] = m[2].trim();
  }
  return vars;
}

export async function loadTheme(themeId: string): Promise<ParsedTheme> {
  const res = await fetch(`/themes/${themeId}/reference.html`);
  if (!res.ok) throw new Error(`테마를 불러올 수 없습니다: ${themeId} (${res.status})`);
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const headLinks = Array.from(doc.head.querySelectorAll('link[rel="stylesheet"]'))
    .map((l) => l.outerHTML)
    .join('\n');

  const styleEl = doc.querySelector('style');
  const styleCss = styleEl ? styleEl.textContent ?? '' : '';
  const vars = parseRootVars(styleCss);

  const slideEls = Array.from(doc.querySelectorAll('.slide'));
  const templates: SlideTemplate[] = slideEls.map((el, i) => {
    el.classList.remove('active');
    const { type, label } = inferType(el, i);
    return {
      id: `${themeId}-${type}-${i}`,
      type,
      label,
      html: el.outerHTML,
      notes: el.getAttribute('data-notes') ?? '',
    };
  });

  return { id: themeId, rawHtml: html, headLinks, styleCss, vars, templates };
}
