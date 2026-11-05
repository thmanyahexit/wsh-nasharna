// يصوّر الستوري PNG بمقاس 1080×1920
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const types = { '.html': 'text/html', '.json': 'application/json', '.mp4': 'video/mp4' };
const server = createServer(async (req, res) => {
  const p = '.' + decodeURIComponent(req.url.split('?')[0].replace(/\/$/, '/index.html'));
  try { const buf = await readFile(p); res.writeHead(200, { 'Content-Type': types[extname(p)] || 'application/octet-stream' }); res.end(buf); }
  catch { res.writeHead(404); res.end(); }
}).listen(8080);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto('http://localhost:8080/');
await page.waitForSelector('body[data-ready]', { timeout: 30000 }).catch(() => {});
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2000);
await page.locator('#story').screenshot({ path: 'story.png' });
await browser.close(); server.close();
console.log('story.png جاهز');
