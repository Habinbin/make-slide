// Fetches a make-slide theme reference.html and parses it into the pieces the
// GUI needs: the head <link> tags (web fonts / Prism), the theme <style> block,
// the :root CSS custom properties, and the individual .slide templates.

export interface SlideTemplate {
  id: string;
  type: string;
  label: string;
  html: string; // outerHTML of the .slide element, sans "active"
  notes: string;
  sourceIndex: number; // position within the theme's templates (remap fallback)
}

export interface ParsedTheme {
  id: string;
  rawHtml: string; // the original reference.html, reused as the export shell
  headLinks: string; // concatenated <link> tags from <head>
  styleCss: string; // inner text of the theme <style> block
  vars: Record<string, string>; // parsed :root custom properties
  templates: SlideTemplate[];
}

const TYPE_LABEL: Record<string, string> = {
  title: 'Title',
  agenda: 'Agenda',
  divider: 'Divider',
  content: 'Content',
  quote: 'Quote',
  comparison: 'Comparison',
  flow: 'Flow',
  cards: 'Cards',
  chart: 'Chart',
  code: 'Code',
  image: 'Image',
  closing: 'Closing',
};

// Map a slide-label comment ("<!-- Slide 3: Agenda / TOC -->") to a canonical type.
function typeFromComment(slide: Element): string | null {
  let n: Node | null = slide.previousSibling;
  for (let i = 0; n && i < 4; i++, n = n.previousSibling) {
    if (n.nodeType === 8) {
      const t = (n.textContent ?? '').toLowerCase();
      if (!/slide\s*\d/.test(t)) continue;
      if (/title/.test(t)) return 'title';
      if (/agenda|toc|contents/.test(t)) return 'agenda';
      if (/divider|section/.test(t)) return 'divider';
      if (/quote/.test(t)) return 'quote';
      if (/compar|before|after/.test(t)) return 'comparison';
      if (/flow|step|process|workflow/.test(t)) return 'flow';
      if (/card|feature/.test(t)) return 'cards';
      if (/chart|data|metric|stat/.test(t)) return 'chart';
      if (/code/.test(t)) return 'code';
      if (/image|placeholder|photo|visual/.test(t)) return 'image';
      if (/closing|thank|end/.test(t)) return 'closing';
      if (/content|body|text/.test(t)) return 'content';
      return null;
    }
  }
  return null;
}

// Class-name hints unified across the differing theme vocabularies.
function typeFromClass(slide: Element): string | null {
  const has = (sel: string) => slide.matches(sel) || !!slide.querySelector(sel);
  if (has('.slide-title, [class*="title-slide"]')) return 'title';
  if (has('.slide-closing, [class*="closing-slide"], [class*="closing"]')) return 'closing';
  if (has('.toc-list, [class*="toc"], [class*="agenda"]')) return 'agenda';
  if (has('.code-container, [class*="code-block"], pre code[class*="language"]')) return 'code';
  if (has('.image-placeholder, .img-placeholder, [class*="placeholder"]')) return 'image';
  if (has('.comparison, [class*="comparison"], [class*="compare"]')) return 'comparison';
  if (has('[class*="bar-chart"], [class*="bar-row"], [class*="chart"], [class*="metric"], [class*="kpi"], [class*="stat-"]'))
    return 'chart';
  if (has('.cards, [class*="card-grid"], [class*="cards"]')) return 'cards';
  if (has('.steps, .flow, [class*="step"], [class*="flow"]')) return 'flow';
  if (has('.slide-quote, [class*="quote"], [class*="blockquote"]')) return 'quote';
  if (has('[class*="divider"], [class*="section-number"]')) return 'divider';
  return null;
}

// Structural inference from the slide's actual DOM, independent of class names.
function typeFromStructure(slide: Element, index: number, total: number): string {
  if (slide.querySelector('pre, code[class*="language"]')) return 'code';
  if (slide.querySelector('blockquote')) return 'quote';
  if (slide.querySelector('[class*="bar"], [class*="chart"], svg, canvas')) return 'chart';
  if (slide.querySelector('table')) return 'comparison';
  if (slide.querySelector('img, [class*="placeholder"]')) return 'image';
  // Two balanced columns of text → comparison.
  if (slide.querySelectorAll('[class*="col"], [class*="column"]').length >= 2) return 'comparison';
  const lis = slide.querySelectorAll('li');
  if (lis.length >= 3) {
    const numbered = Array.from(lis).every((li) => /^\s*\d/.test(li.textContent ?? ''));
    return numbered ? 'agenda' : 'content';
  }
  if (index === 0) return 'title';
  if (index === total - 1) return 'closing';
  return 'content';
}

function inferType(slide: Element, index: number, total: number): { type: string; label: string } {
  const type =
    typeFromComment(slide) ??
    typeFromClass(slide) ??
    typeFromStructure(slide, index, total);
  return { type, label: TYPE_LABEL[type] ?? 'Slide' };
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
  const total = slideEls.length;
  const templates: SlideTemplate[] = slideEls.map((el, i) => {
    const { type, label } = inferType(el, i, total);
    el.classList.remove('active');
    return {
      id: `${themeId}-${type}-${i}`,
      type,
      label,
      html: el.outerHTML,
      notes: el.getAttribute('data-notes') ?? '',
      sourceIndex: i,
    };
  });

  return { id: themeId, rawHtml: html, headLinks, styleCss, vars, templates };
}
