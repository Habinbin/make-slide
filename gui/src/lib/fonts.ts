// Warms the browser's HTTP cache for a theme's web fonts by adding the theme's
// stylesheet <link>s to the *parent* document head (deduped by href). The many
// slide iframes then reuse the cached font files instead of each racing to load
// the same Pretendard dynamic-subset, which otherwise causes some thumbnails to
// render with fallback (broken) glyphs.
export function primeFonts(headLinks: string): void {
  if (!headLinks) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = headLinks;
  tmp.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || /prism/i.test(href)) return; // fonts only, skip Prism theme css
    if (document.head.querySelector(`link[data-prime="${CSS.escape(href)}"]`)) return;
    const el = document.createElement('link');
    el.rel = 'stylesheet';
    el.href = href;
    el.setAttribute('data-prime', href);
    document.head.appendChild(el);
  });
}
