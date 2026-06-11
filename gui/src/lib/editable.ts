// Helpers for turning a rendered slide document into an editable surface and
// serializing edits back to clean HTML.

const TEXT_TAGS = new Set([
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'LI', 'SPAN', 'BLOCKQUOTE',
  'FIGCAPTION', 'TD', 'TH', 'DT', 'DD', 'A', 'STRONG', 'EM', 'SMALL',
  'LABEL', 'CAPTION', 'CITE',
]);

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'IMG', 'SVG', 'CANVAS', 'VIDEO', 'BR', 'HR',
  'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'CODE', 'PRE',
]);

function hasDirectText(el: Element): boolean {
  return Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '');
}

function isCandidate(el: Element): boolean {
  if (SKIP_TAGS.has(el.tagName)) return false;
  return TEXT_TAGS.has(el.tagName) || hasDirectText(el);
}

/** The deepest text-bearing elements within `root` (leaf text nodes). */
export function getTextLeaves(root: Element): HTMLElement[] {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>('*')).filter(isCandidate);
  const candidateSet = new Set(candidates);
  return candidates.filter(
    (el) => !Array.from(el.querySelectorAll('*')).some((d) => candidateSet.has(d as HTMLElement))
  );
}

/** Mark the deepest text-bearing elements of `root` as contenteditable. */
export function markEditable(root: Element): void {
  for (const el of getTextLeaves(root)) {
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', 'false');
  }
}

/** Serialize a slide element to clean HTML, stripping editing artifacts. */
export function serializeSlide(slide: Element): string {
  const clone = slide.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'));
  clone.querySelectorAll('[spellcheck]').forEach((el) => el.removeAttribute('spellcheck'));
  clone.classList.remove('active');
  return clone.outerHTML;
}

/** Insert or update a live :root override style block inside a document. */
export function applyOverrides(doc: Document, overrides: Record<string, string>): void {
  const id = 'gui-overrides';
  let style = doc.getElementById(id) as HTMLStyleElement | null;
  if (!style) {
    style = doc.createElement('style');
    style.id = id;
    doc.head.appendChild(style);
  }
  const keys = Object.keys(overrides);
  style.textContent = keys.length
    ? `:root {\n${keys.map((k) => `  ${k}: ${overrides[k]};`).join('\n')}\n}`
    : '';
}
