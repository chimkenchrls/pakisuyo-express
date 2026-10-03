// Renders the logo system to PNGs with the real web font, using Playwright's Chromium.
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { logoHorizontal, logoStacked, markSvg } from '../src/brand/logo.js';

const css = (await Promise.all(['tokens.css', 'base.css'].map((f) => readFile(new URL(`../src/styles/${f}`, import.meta.url), 'utf8')))).join('\n');
const out = (name) => fileURLToPath(new URL(`../public/assets/brand/${name}.png`, import.meta.url));

const VARIANTS = [
  { name: 'logo-horizontal', scale: 2, html: `<div class="pad" style="background:#fff">${logoHorizontal({ size: 96 })}</div>` },
  { name: 'logo-stacked', scale: 2, html: `<div class="pad" style="background:#fff">${logoStacked({ size: 160 })}</div>` },
  { name: 'logo-stacked-on-red', scale: 2, html: `<div class="pad" style="background:#E31B23">${logoStacked({ tone: 'red', size: 160 })}</div>` },
  { name: 'logo-fb-profile', scale: 2, html: `<div class="square" style="width:540px;height:540px;background:#E31B23">${logoStacked({ tone: 'red', invertMark: false, size: 180 })}</div>` },
  { name: 'icon-180', scale: 1, html: markSvg({ size: 180, rounded: false }) },
  { name: 'icon-32', scale: 1, html: markSvg({ size: 32 }) },
  { name: 'icon-16', scale: 1, html: markSvg({ size: 16, speedLines: false }) },
];

const browser = await chromium.launch();
for (const v of VARIANTS) {
  const page = await browser.newPage({ deviceScaleFactor: v.scale });
  await page.setContent(`<!doctype html><html><head>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&display=swap">
    <style>${css} body{margin:0;background:transparent} .pad{display:inline-block;padding:32px}
    .square{display:flex;align-items:center;justify-content:center}</style></head>
    <body><div id="root" style="display:inline-block">${v.html}</div></body></html>`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#root > *').first().screenshot({ path: out(v.name), omitBackground: true });
  console.log(`✓ ${v.name}.png`);
  await page.close();
}
await browser.close();
