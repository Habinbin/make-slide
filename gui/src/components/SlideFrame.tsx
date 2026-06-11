import { useMemo } from 'react';

const BASE_W = 1280;
const BASE_H = 720;

// Renders a slide document inside a fixed 1280x720 iframe, CSS-scaled to the
// requested display width while preserving 16:9. Used for the main canvas,
// deck thumbnails, and vault previews alike.
export function SlideFrame({ doc, width }: { doc: string; width: number }) {
  const scale = width / BASE_W;
  const height = useMemo(() => width * (BASE_H / BASE_W), [width]);
  return (
    <div className="slide-frame" style={{ width, height }}>
      <iframe
        title="slide"
        srcDoc={doc}
        scrolling="no"
        style={{
          width: BASE_W,
          height: BASE_H,
          border: 'none',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
