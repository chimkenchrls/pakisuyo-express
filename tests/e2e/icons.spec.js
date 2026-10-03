import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const FIXTURE = readFileSync(new URL('./fixtures/directory.json', import.meta.url), 'utf8');
// Emoji plus the text symbols we replaced with icons (☰ ✕ ✓ ● ← →).
const GLYPHS = /[\p{Extended_Pictographic}☰✕✓●←→]/u;

const visibleGlyphs = (page) => page.evaluate((src) => {
  const re = new RegExp(src, 'u');
  const found = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || el.closest('[hidden], script, style, template') || !el.getClientRects().length) continue;
    const text = n.textContent.replace(/[©®™]/g, ''); // legal marks (e.g. the OpenStreetMap credit) are not emoji
    if (re.test(text)) found.push(text.trim().slice(0, 40));
  }
  for (const el of document.querySelectorAll('input[placeholder], textarea[placeholder], option')) {
    const text = el.placeholder ?? el.textContent;
    if (re.test(text)) found.push(text.slice(0, 40));
  }
  return found;
}, GLYPHS.source);

test.beforeEach(async ({ page }) => {
  await page.route('**/data/directory.json', (r) => r.fulfill({ contentType: 'application/json', body: FIXTURE }));
});

test('no emoji or symbol glyphs on the page, in the store panel, or in the app demo', async ({ page }) => {
  await page.goto('/?demoStepMs=100');
  expect(await visibleGlyphs(page)).toEqual([]);
  await expect(page.locator('.how svg.icon')).toHaveCount(4);

  await page.getByRole('button', { name: /Browse all \d+ stores/ }).click();
  await expect(page.locator('.dir-row')).toHaveCount(11);
  expect(await visibleGlyphs(page)).toEqual([]);
  await page.keyboard.press('Escape');

  const demo = page.getByTestId('demo-screen');
  await demo.scrollIntoViewIfNeeded();
  await demo.getByRole('button', { name: /Jollibee Sariaya/ }).click();
  await demo.getByRole('button', { name: 'Add Coke Float' }).click();
  expect(await visibleGlyphs(page)).toEqual([]);
  await demo.getByRole('button', { name: /View cart/ }).click();
  await demo.getByRole('button', { name: 'Change' }).click();
  expect(await visibleGlyphs(page)).toEqual([]);
  await demo.getByRole('button', { name: /Cash on Delivery/ }).click();
  await demo.getByRole('button', { name: /PAKISUYO10/ }).click();
  await demo.getByRole('button', { name: /Place Order/ }).click();
  await expect(demo.getByText('Delivered! Enjoy your meal.')).toBeVisible({ timeout: 5000 });
  expect(await visibleGlyphs(page)).toEqual([]);
});

test('icon-only buttons keep their names', async ({ page }) => {
  await page.goto('/#stores');
  await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
});
