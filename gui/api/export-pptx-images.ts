import type { VercelRequest, VercelResponse } from '@vercel/node';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import pptxgen from 'pptxgenjs';

interface SlideInput {
  html: string;
  notes?: string;
}

// POST { slides: { html, notes }[] } -> application/vnd.openxmlformats-...pptx
// Screenshots each single-slide document at 1280x720 and packs the PNGs full
// bleed into a 16:9 PPTX. Highest visual fidelity. See GUI_PLAN.md §5.3 Option B.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  const { slides } = (req.body ?? {}) as { slides?: SlideInput[] };
  if (!Array.isArray(slides) || slides.length === 0) {
    res.status(400).json({ error: 'slides[] is required' });
    return;
  }

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
    defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 2 },
  });
  try {
    const page = await browser.newPage();
    const pptx = new pptxgen();
    pptx.defineLayout({ name: 'MS16x9', width: 13.33, height: 7.5 });
    pptx.layout = 'MS16x9';

    for (const slide of slides) {
      await page.setContent(slide.html, { waitUntil: 'load' });
      await page.evaluate(() => (document as any).fonts?.ready).catch(() => {});
      const png = (await page.screenshot({ type: 'png', encoding: 'base64' })) as string;
      const pslide = pptx.addSlide();
      pslide.addImage({ data: `data:image/png;base64,${png}`, x: 0, y: 0, w: 13.33, h: 7.5 });
      if (slide.notes) pslide.addNotes(slide.notes);
    }

    const buf = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', 'attachment; filename="presentation.pptx"');
    res.end(buf);
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message ?? e) });
  } finally {
    await browser.close();
  }
}
