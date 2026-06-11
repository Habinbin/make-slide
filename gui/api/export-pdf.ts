import type { VercelRequest, VercelResponse } from '@vercel/node';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

// POST { html: string } -> application/pdf
// Renders a full standalone presentation HTML to a landscape PDF (one slide per
// page) using a Lambda-sized Chromium. See GUI_PLAN.md §5.2 Option B.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  const { html } = (req.body ?? {}) as { html?: string };
  if (!html) {
    res.status(400).json({ error: 'html is required' });
    return;
  }

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
    defaultViewport: { width: 1280, height: 720 },
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => (document as any).fonts?.ready).catch(() => {});
    await page.emulateMediaType('print');
    const pdf = await page.pdf({
      printBackground: true,
      landscape: true,
      width: '1280px',
      height: '720px',
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="presentation.pdf"');
    res.end(Buffer.from(pdf));
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message ?? e) });
  } finally {
    await browser.close();
  }
}
