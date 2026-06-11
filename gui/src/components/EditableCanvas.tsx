import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor } from '../state/store';
import { buildSlideDoc } from '../lib/iframeBuilder';
import { markEditable, serializeSlide, applyOverrides } from '../lib/editable';
import { ImagePicker } from './ImagePicker';

const BASE_W = 1280;
const BASE_H = 720;

export function EditableCanvas() {
  const theme = useEditor((s) => s.theme);
  const deck = useEditor((s) => s.deck);
  const selected = useEditor((s) => s.selected);
  const overrides = useEditor((s) => s.overrides);
  const error = useEditor((s) => s.error);
  const updateSlideHtml = useEditor((s) => s.updateSlideHtml);

  const slide = deck[selected] ?? null;
  const slideId = slide?.id ?? null;

  const boxRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [width, setWidth] = useState(880);
  const [picker, setPicker] = useState<{ el: HTMLElement; isImg: boolean } | null>(null);

  // Keep a ref to the latest commit fn so cleanup (slide switch) can flush edits.
  const commitRef = useRef<() => void>(() => {});

  // Fit-to-container sizing.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const avail = el.clientWidth - 80;
      const byHeight = (el.clientHeight - 80) * (BASE_W / BASE_H);
      setWidth(Math.max(320, Math.min(avail, byHeight, BASE_W)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // (Re)write the iframe document whenever the slide identity or theme changes.
  // Edits to the same slide do NOT retrigger this, preserving the caret.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !theme || !slide) return;
    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(buildSlideDoc(theme, slide.html, overrides));
    doc.close();

    const slideEl = doc.querySelector('.slide');
    if (!slideEl) return;
    markEditable(slideEl);

    const commit = () => {
      const el = doc.querySelector('.slide');
      if (!el) return;
      const html = serializeSlide(el);
      if (html !== slide.html) updateSlideHtml(slide.id, html);
    };
    commitRef.current = commit;

    let timer: number | undefined;
    const onInput = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(commit, 400);
    };
    const onFocusOut = () => {
      window.clearTimeout(timer);
      commit();
    };
    const onDblClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const img = target.closest('img') as HTMLImageElement | null;
      const placeholder = target.closest('.image-placeholder') as HTMLElement | null;
      if (img) setPicker({ el: img, isImg: true });
      else if (placeholder) setPicker({ el: placeholder, isImg: false });
    };

    doc.addEventListener('input', onInput);
    doc.addEventListener('focusout', onFocusOut);
    doc.addEventListener('dblclick', onDblClick);

    return () => {
      window.clearTimeout(timer);
      commitRef.current(); // flush before the document is replaced
      doc.removeEventListener('input', onInput);
      doc.removeEventListener('focusout', onFocusOut);
      doc.removeEventListener('dblclick', onDblClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideId, theme]);

  // Live-apply CSS var overrides without rewriting the document.
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (doc) applyOverrides(doc, overrides);
  }, [overrides, slideId, theme]);

  const applyImage = useCallback(
    (url: string) => {
      if (!picker) return;
      if (picker.isImg) {
        (picker.el as HTMLImageElement).src = url;
      } else {
        picker.el.style.backgroundImage = `url("${url}")`;
        picker.el.style.backgroundSize = 'cover';
        picker.el.style.backgroundPosition = 'center';
        // Hide placeholder hint text/icon so only the image shows.
        picker.el.querySelectorAll(':scope > *').forEach((c) => ((c as HTMLElement).style.display = 'none'));
      }
      commitRef.current();
      setPicker(null);
    },
    [picker]
  );

  const scale = width / BASE_W;
  const height = width * (BASE_H / BASE_W);

  return (
    <main className="canvas" ref={boxRef}>
      {error ? (
        <div className="canvas-msg error">⚠ {error}</div>
      ) : !theme || !slide ? (
        <div className="canvas-msg">슬라이드를 추가하세요</div>
      ) : (
        <div className="slide-frame canvas-stage" style={{ width, height }}>
          <iframe
            ref={iframeRef}
            title="canvas"
            scrolling="no"
            style={{
              width: BASE_W,
              height: BASE_H,
              border: 'none',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          />
        </div>
      )}
      {picker && (
        <ImagePicker
          onPick={applyImage}
          onClose={() => setPicker(null)}
        />
      )}
    </main>
  );
}
