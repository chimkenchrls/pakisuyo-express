import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const FIXTURE = readFileSync(new URL('./fixtures/directory.json', import.meta.url), 'utf8');

test.beforeEach(async ({ page }) => {
  await page.route('**/data/directory.json', (r) => r.fulfill({ contentType: 'application/json', body: FIXTURE }));
});

const rows = (page) => page.locator('.dir-row');

test('Browse all opens the sheet at #stores with search focused', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Browse all \d+ stores/ }).click();
  const sheet = page.getByRole('dialog', { name: 'All stores' });
  await expect(sheet).toBeVisible();
  await expect(page).toHaveURL(/#stores$/);
  await expect(sheet.getByLabel('Search stores')).toBeFocused();
  // featured 5 + OSM kept (Jollibee Lucena, Sariaya Bread House, Don Lauro's, Libra Bakery, Lugaw Queen) = 10;
  // OSM "Jollibee" in Sariaya and both extras are hidden behind featured cards.
  await expect(rows(page)).toHaveCount(10);
  await expect(sheet.getByText('10 stores')).toBeVisible();
});

test('filters by town and type, keeps focus while typing, and orders from a row', async ({ page }) => {
  await page.goto('/#stores');
  const sheet = page.getByRole('dialog', { name: 'All stores' });
  await sheet.getByLabel('Town').selectOption('Lucena');
  await expect(rows(page)).toHaveCount(3);
  for (const meta of await page.locator('.dir-row__meta').allTextContents()) expect(meta).toContain('Lucena');

  await sheet.getByRole('button', { name: 'Bakeries' }).click();
  await expect(rows(page)).toHaveCount(1);
  await expect(page.locator('.dir-row__meta')).toHaveText(['Bakery · Lucena']);

  await sheet.getByRole('button', { name: 'All', exact: true }).click();
  const search = sheet.getByLabel('Search stores');
  await search.pressSequentially('lug');
  await expect(search).toBeFocused(); // Review Focus 5
  await expect(rows(page)).toHaveCount(1);
  await expect(sheet.getByText('1 store', { exact: true })).toBeVisible();

  await sheet.getByRole('button', { name: 'Order from Lugaw Queen' }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByRole('combobox', { name: /Store/ })).toHaveValue('Lugaw Queen');
  await expect(page.getByLabel('Order List')).toBeFocused();
});

test('shows a helpful empty state', async ({ page }) => {
  await page.goto('/#stores');
  await page.getByLabel('Search stores').fill('zzzz');
  await expect(page.getByText(/No stores match “zzzz”/)).toBeVisible();
});

test('Back button and Esc close the sheet and return focus (Review Focus 4)', async ({ page }) => {
  await page.goto('/');
  const browse = page.getByRole('button', { name: /Browse all \d+ stores/ });
  await browse.click();
  await expect(page.getByRole('dialog', { name: 'All stores' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'All stores' })).toBeHidden();
  await expect(browse).toBeFocused();

  await browse.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'All stores' })).toBeHidden();
  await expect(page).not.toHaveURL(/#stores/);
});

test('says so when the store list cannot load (Review Focus 3)', async ({ page }) => {
  await page.unroute('**/data/directory.json');
  await page.route('**/data/directory.json', (r) => r.abort());
  await page.goto('/#stores');
  await expect(page.getByText("Couldn't load the store list — type any store in the order form.")).toBeVisible();
});
