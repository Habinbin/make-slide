import { saveAs } from 'file-saver';
import pptxgen from 'pptxgenjs';
import type { ParsedTheme } from './themeLoader';
import type { DeckSlide } from '../state/store';
import { getTextLeaves } from './editable';

function activate(html: string): string {
  return html.replace('class="slide"', 'class="slide active"');
}

function overrideStyle(overrides: Record<string, string>): string {
  const keys = Object.keys(overrides);
  if (!keys.length) return '';
  return `<style id="gui-overrides">:root {\n${keys
    .map((k) => `  ${k}: ${overrides[k]};`)
    .join('\n')}\n}</style>`;
}

/** A minimal standalone document containing a single slide (used for offscreen
 *  measurement and for the serverless screenshot pipeline). */
export function buildSingleDoc(
  theme: ParsedTheme,
  slideHtml: string,
  overrides: Record<string, string> = {},
  layoutCss = ''
): string {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">${theme.headLinks}<style>${theme.styleCss}\n.slide{transition:none!important}\n${layoutCss}</style>${overrideStyle(
    overrides
  )}</head><body><div class="deck">${activate(slideHtml)}</div></body></html>`;
}

/** Build a standalone presentation HTML by reusing the theme's reference shell
 *  and swapping in the current deck. The shell already carries the working
 *  navigation / fullscreen / speaker-notes script. */
export function buildDeckDoc(
  theme: ParsedTheme,
  deck: DeckSlide[],
  overrides: Record<string, string>,
  extraHeadHtml = '',
  layoutCss = ''
): string {
  const doc = new DOMParser().parseFromString(theme.rawHtml, 'text/html');
  const deckEl = doc.querySelector('.deck');
  if (deckEl) {
    deckEl.innerHTML = deck.map((s, i) => (i === 0 ? activate(s.html) : s.html)).join('\n');
  }
  const layoutBlock = layoutCss ? `<style id="gui-layout">${layoutCss}</style>` : '';
  doc.head.insertAdjacentHTML('beforeend', overrideStyle(overrides) + layoutBlock + extraHeadHtml);
  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}

export function exportHtml(
  theme: ParsedTheme,
  deck: DeckSlide[],
  overrides: Record<string, string>,
  layoutCss = ''
) {
  const html = buildDeckDoc(theme, deck, overrides, '', layoutCss);
  saveAs(new Blob([html], { type: 'text/html;charset=utf-8' }), 'presentation.html');
}

/** Open a print-ready window that self-triggers the browser's PDF dialog. */
export async function exportPdf(
  theme: ParsedTheme,
  deck: DeckSlide[],
  overrides: Record<string, string>,
  layoutCss = ''
) {
  let printCss = '';
  try {
    printCss = await (await fetch('/core/pdf-export.css')).text();
  } catch {
    /* fall back to whatever print rules the theme already ships */
  }
  const extra =
    `<style>${printCss}</style>` +
    `<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},400);});</script>`;
  const html = buildDeckDoc(theme, deck, overrides, extra, layoutCss);
  const w = window.open('', '_blank');
  if (!w) throw new Error('팝업이 차단되었습니다. 팝업을 허용해주세요.');
  w.document.open();
  w.document.write(html);
  w.document.close();
}

// ---- PPTX (layout-aware native export) ----

function rgbToHex(rgb: string): string {
  const m = rgb.match(/rgba?\(([^)]+)\)/);
  if (!m) return '000000';
  const [r, g, b] = m[1].split(',').map((n) => parseInt(n.trim(), 10));
  return [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function bgUrl(el: HTMLElement): string | null {
  const bg = getComputedStyle(el).backgroundImage;
  const m = bg.match(/url\(["']?(.*?)["']?\)/);
  return m ? m[1] : null;
}

const EMU_W = 13.33;
const EMU_H = 7.5;

/** Render a single slide into an offscreen 1280x720 iframe for measurement. */
async function renderOffscreen(
  theme: ParsedTheme,
  slideHtml: string,
  layoutCss: string
): Promise<HTMLIFrameElement> {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-99999px;top:0;width:1280px;height:720px;border:0;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(buildSingleDoc(theme, slideHtml, {}, layoutCss));
  doc.close();
  // Let layout settle and (best-effort) wait for web fonts.
  await Promise.race([
    (doc as any).fonts?.ready ?? Promise.resolve(),
    new Promise((r) => setTimeout(r, 1500)),
  ]);
  return iframe;
}

export async function exportPptx(
  theme: ParsedTheme,
  deck: DeckSlide[],
  overrides: Record<string, string>,
  layoutCss = ''
) {
  const pptx = new pptxgen();
  pptx.defineLayout({ name: 'MS16x9', width: EMU_W, height: EMU_H });
  pptx.layout = 'MS16x9';

  const ovColor = (name: string) => overrides[name];

  for (const s of deck) {
    const iframe = await renderOffscreen(theme, s.html, layoutCss);
    const doc = iframe.contentDocument!;
    const slideEl = doc.querySelector('.slide') as HTMLElement;
    const pslide = pptx.addSlide();

    // Background: override --bg wins, else computed body/slide color.
    const bodyBg = getComputedStyle(doc.body).backgroundColor;
    const slideBg = getComputedStyle(slideEl).backgroundColor;
    const bgHex = ovColor('--bg')?.replace('#', '') ?? rgbToHex(slideBg !== 'rgba(0, 0, 0, 0)' ? slideBg : bodyBg);
    pslide.background = { color: bgHex };

    // Text leaves.
    for (const el of getTextLeaves(slideEl)) {
      const text = (el.textContent ?? '').trim();
      if (!text) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const cs = getComputedStyle(el);
      pslide.addText(text, {
        x: (r.left / 1280) * EMU_W,
        y: (r.top / 720) * EMU_H,
        w: (r.width / 1280) * EMU_W,
        h: (r.height / 720) * EMU_H,
        fontSize: Math.max(6, parseFloat(cs.fontSize) * 0.75),
        color: rgbToHex(cs.color),
        bold: parseInt(cs.fontWeight, 10) >= 600,
        italic: cs.fontStyle === 'italic',
        align: (['left', 'center', 'right'].includes(cs.textAlign) ? cs.textAlign : 'left') as
          | 'left'
          | 'center'
          | 'right',
        valign: 'middle',
        fontFace: 'Arial',
        margin: 0,
        wrap: true,
      });
    }

    // Images (<img> + elements with a background image).
    const imgEls: Array<{ el: HTMLElement; url: string }> = [];
    doc.querySelectorAll('img').forEach((im) => {
      const src = (im as HTMLImageElement).src;
      if (src) imgEls.push({ el: im as HTMLElement, url: src });
    });
    doc.querySelectorAll('.image-placeholder, [style*="background-image"]').forEach((el) => {
      const url = bgUrl(el as HTMLElement);
      if (url) imgEls.push({ el: el as HTMLElement, url });
    });
    for (const { el, url } of imgEls) {
      const r = el.getBoundingClientRect();
      if (r.width < 2) continue;
      try {
        pslide.addImage({
          path: url,
          x: (r.left / 1280) * EMU_W,
          y: (r.top / 720) * EMU_H,
          w: (r.width / 1280) * EMU_W,
          h: (r.height / 720) * EMU_H,
        });
      } catch {
        /* skip unsupported image */
      }
    }

    // Speaker notes.
    if (s.notes) pslide.addNotes(s.notes);
    iframe.remove();
  }

  await pptx.writeFile({ fileName: 'presentation.pptx' });
}

// ---- Serverless (Vercel) helpers — high-fidelity, render-on-server ----
// These POST to the /api functions backed by @sparticuz/chromium. They are the
// "Option B" paths from GUI_PLAN.md §5 and require deployment to Vercel.

/** High-quality PDF rendered by headless Chromium on the server. */
export async function exportPdfServer(
  theme: ParsedTheme,
  deck: DeckSlide[],
  overrides: Record<string, string>,
  layoutCss = ''
) {
  let printCss = '';
  try {
    printCss = await (await fetch('/core/pdf-export.css')).text();
  } catch {
    /* ignore */
  }
  const html = buildDeckDoc(theme, deck, overrides, `<style>${printCss}</style>`, layoutCss);
  const res = await fetch('/api/export-pdf', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ html }),
  });
  if (!res.ok) throw new Error(`서버 PDF 변환 실패 (${res.status})`);
  saveAs(await res.blob(), 'presentation.pdf');
}

/** Pixel-perfect PPTX: each slide is screenshotted server-side and embedded. */
export async function exportPptxImagesServer(
  theme: ParsedTheme,
  deck: DeckSlide[],
  overrides: Record<string, string>,
  layoutCss = ''
) {
  const slides = deck.map((s) => ({ html: buildSingleDoc(theme, s.html, overrides, layoutCss), notes: s.notes }));
  const res = await fetch('/api/export-pptx-images', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ slides }),
  });
  if (!res.ok) throw new Error(`서버 PPTX 변환 실패 (${res.status})`);
  saveAs(await res.blob(), 'presentation.pptx');
}
