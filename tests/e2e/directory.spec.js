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
  await expect(page.getByRole('combobox', { name: /Store/ })).toHaveValue('Lugaw Queen (Lucena)'); // town kept for the dispatcher
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
  await expect(page.getByText("Couldn't load the store list. Type any store in the order form.")).toBeVisible();
});

async function fillRest(page) {
  await page.getByLabel(/^Name/).fill('Juan Dela Cruz');
  await page.getByLabel('Contact Number').fill('0917 123 4567');
  await page.getByLabel('Exact Address').fill('123 Rizal St');
  await page.getByLabel('Landmark').fill('Blue gate');
  await page.getByLabel('Order List').fill('2 lugaw');
  await page.locator('label.chip', { hasText: 'GCash' }).click();
}

test('store combobox works with the keyboard only (Review Focus 4)', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await context.route('https://m.me/**', (r) => r.fulfill({ contentType: 'text/html', body: 'stub' }));
  await page.goto('/#order');
  const combo = page.getByRole('combobox', { name: /Store/ });
  await combo.pressSequentially('lugaw');
  await expect(page.getByRole('option', { name: /Lugaw Queen/ })).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(combo).toHaveAttribute('aria-activedescendant', /store-opt-0/);
  await page.keyboard.press('Enter'); // must pick, not submit
  await expect(combo).toHaveValue('Lugaw Queen (Lucena)');
  await expect(page.getByRole('listbox')).toBeHidden();
  await expect(page.locator('#err-name')).toBeEmpty(); // form was not submitted

  await fillRest(page);
  const popup = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Send Order' }).click();
  await popup;
  await page.bringToFront();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Store/s: Lugaw Queen (Lucena)');
});

test('picking a featured store keeps its name as is', async ({ page }) => {
  await page.goto('/#order');
  const combo = page.getByRole('combobox', { name: /Store/ });
  await combo.pressSequentially('jollibee');
  await page.getByRole('option', { name: /Jollibee Sariaya/ }).click();
  await expect(combo).toHaveValue('Jollibee Sariaya');
});

test('store suggestions recover after a failed load (patchy data)', async ({ page }) => {
  await page.unroute('**/data/directory.json');
  let calls = 0;
  await page.route('**/data/directory.json', (r) => (++calls === 1 ? r.abort() : r.fulfill({ contentType: 'application/json', body: FIXTURE })));
  await page.goto('/#order');
  const combo = page.getByRole('combobox', { name: /Store/ });
  await combo.focus(); // first load fails
  await expect.poll(() => calls).toBe(1);
  await page.getByLabel('Landmark').focus();
  await combo.pressSequentially('lugaw');
  await expect(page.getByRole('option', { name: /Lugaw Queen/ })).toBeVisible();
});

test('an unlisted store can be used as typed, and Esc closes the list', async ({ page }) => {
  await page.goto('/#order');
  const combo = page.getByRole('combobox', { name: /Store/ });
  await combo.fill('Aling Nena Bakery');
  await page.getByRole('option', { name: 'Use “Aling Nena Bakery” as typed' }).click();
  await expect(combo).toHaveValue('Aling Nena Bakery');
  await combo.press('End');
  await combo.pressSequentially('s');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toBeHidden();
});

test('the form still sends a typed store when the list fails to load (Review Focus 3)', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await context.route('https://m.me/**', (r) => r.fulfill({ contentType: 'text/html', body: 'stub' }));
  await page.unroute('**/data/directory.json');
  await page.route('**/data/directory.json', (r) => r.abort());
  await page.goto('/#order');
  await page.getByRole('combobox', { name: /Store/ }).fill('Lugaw Queen');
  await fillRest(page);
  const popup = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Send Order' }).click();
  await popup;
  await page.bringToFront();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Store/s: Lugaw Queen');
});
