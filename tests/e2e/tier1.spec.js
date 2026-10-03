import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const FIXTURE = readFileSync(new URL('./fixtures/directory.json', import.meta.url), 'utf8');
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=', 'base64');
const KEY = 'pakisuyo:customer:v1';

test.beforeEach(async ({ context }) => {
  await context.route('**/data/directory.json', (r) => r.fulfill({ contentType: 'application/json', body: FIXTURE }));
  await context.route('https://m.me/**', (r) => r.fulfill({ contentType: 'text/html', body: 'stub' }));
  await context.route('https://tile.openstreetmap.org/**', (r) => r.fulfill({ contentType: 'image/png', body: PNG_1PX }));
  await context.route('https://nominatim.openstreetmap.org/**', (r) => r.fulfill({ json: { address: { road: 'Rizal St', town: 'Sariaya' } } }));
});

const store = (page) => page.getByRole('combobox', { name: /Store/ });

async function fillOrder(page, { payment = 'GCash' } = {}) {
  await page.getByLabel(/^Name/).fill('Juan Dela Cruz');
  await page.getByLabel('Contact Number').fill('0917 123 4567');
  await page.getByLabel('Exact Address').fill('123 Rizal St, Poblacion');
  await page.getByLabel('Landmark').fill('Blue gate');
  await store(page).fill('Jollibee Sariaya');
  await page.getByLabel('Order List').fill('1 Chickenjoy');
  await page.locator('label.chip', { hasText: payment }).click();
}

async function send(page, context) {
  const popup = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Copy order & open Messenger' }).click();
  await popup;
  await page.bringToFront();
  return page.evaluate(() => navigator.clipboard.readText());
}

test('public build has no third-party brand logos and can be indexed', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#restaurants .store-card')).toHaveCount(5);
  await expect(page.locator('img[src*="jollibee-sariaya"], img[src*="mcdonalds-sariaya"], img[src*="dunkin-sariaya"]')).toHaveCount(0);
  await expect(page.locator('img[src*="wings-dims-sariaya"]')).toHaveCount(1); // owner-supplied logos stay
  await expect(page.locator('img[src*="labarrida-sariaya"], img[src*="bukid-amyr"], img[src*="kope-right"]')).toHaveCount(3);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  const res = await page.request.get('/assets/stores/jollibee-sariaya/logo.png');
  expect(res.headers()['content-type'] ?? '').not.toContain('image/png'); // file not shipped
});

test('a returning customer finds their details filled in, and can clear them', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/#order');
  await expect(page.getByLabel('Remember my details on this phone')).toBeChecked();
  await fillOrder(page);
  await send(page, context);

  await page.reload();
  await expect(page.getByLabel(/^Name/)).toHaveValue('Juan Dela Cruz');
  await expect(page.getByLabel('Contact Number')).toHaveValue('09171234567');
  await expect(page.getByLabel('Exact Address')).toHaveValue('123 Rizal St, Poblacion');
  await expect(page.getByLabel('Landmark')).toHaveValue('Blue gate');
  await expect(store(page)).toHaveValue(''); // per-order fields are never remembered
  await expect(page.getByLabel('Order List')).toHaveValue('');

  await page.getByRole('button', { name: 'Not you? Clear saved details' }).click();
  await expect(page.getByLabel(/^Name/)).toHaveValue('');
  await expect(page.getByLabel('Landmark')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Not you? Clear saved details' })).toBeHidden();
  await page.reload();
  await expect(page.getByLabel(/^Name/)).toHaveValue('');
});

test('unticking Remember stores nothing', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/#order');
  await fillOrder(page);
  await page.getByLabel('Remember my details on this phone').uncheck();
  await send(page, context);
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBeNull();
});

test('a saved pin comes back on the map without a new address lookup', async ({ page }) => {
  let lookups = 0;
  await page.route('https://nominatim.openstreetmap.org/**', (r) => { lookups += 1; r.fulfill({ json: {} }); });
  await page.addInitScript(([k]) => localStorage.setItem(k, JSON.stringify({
    name: 'Juan', phone: '0917 123 4567', address: 'Purok 3', landmark: 'Chapel', pin: { lat: 13.9311, lng: 121.6173 },
  })), [KEY]);
  await page.goto('/#order');
  await page.locator('#order-map').scrollIntoViewIfNeeded();
  await expect(page.locator('.order-pin')).toHaveCount(1);
  await expect(page.getByText("Looks like you're outside our delivery area")).toBeVisible(); // saved pin is in Lucena
  await page.waitForTimeout(1200);
  expect(lookups).toBe(0);
  await expect(page.getByLabel('Exact Address')).toHaveValue('Purok 3');
});

test('cash on delivery asks how much they will pay with', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/#order');
  const changeField = page.getByLabel('Paying cash? How much will you pay with? (optional)');
  await expect(changeField).toBeHidden();
  await fillOrder(page, { payment: 'Cash on Delivery' });
  await expect(changeField).toBeVisible();
  await page.getByRole('button', { name: '₱1,000' }).click();
  await expect(changeField).toHaveValue('₱1,000');
  expect(await send(page, context)).toContain('Payment: Cash on Delivery\nChange for: ₱1,000');

  await page.locator('label.chip', { hasText: 'GCash' }).click();
  await expect(changeField).toBeHidden();
});

test('an unreadable cash amount is caught before sending', async ({ page }) => {
  await page.goto('/#order');
  await fillOrder(page, { payment: 'Cash on Delivery' });
  await page.getByLabel('Paying cash? How much will you pay with? (optional)').fill('lots');
  await page.getByRole('button', { name: 'Copy order & open Messenger' }).click();
  await expect(page.locator('#err-changeFor')).toHaveText('Enter an amount like 500, or choose Exact amount.');
});

test('the delivery fee line follows the chosen store', async ({ page }) => {
  await page.goto('/#order');
  const fee = page.locator('#store-fee');
  await expect(fee).toHaveText(/₱ 50 within Sariaya · out-of-town stores/);
  await store(page).pressSequentially('lugaw');
  await page.getByRole('option', { name: /Lugaw Queen/ }).click();
  await expect(fee).toHaveText('Out-of-town fee: confirmed by our team');
  await store(page).fill('Aling Nena Bakery');
  await expect(fee).toHaveText('Delivery fee: ₱ 50 within Sariaya');
});

test('privacy is explained next to the order button and in the footer', async ({ page }) => {
  await page.goto('/#order');
  await expect(page.getByText("Your details are only used for this delivery.")).toBeVisible();
  await page.locator('#site-footer').getByRole('link', { name: 'Privacy', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Privacy' })).toContainText('OpenStreetMap');
});

test.describe('contact number', () => {
  const phone = (page) => page.getByLabel('Contact Number');

  test('keeps digits only, max 11, and turns a pasted +63 number into 09…', async ({ page }) => {
    await page.goto('/#order');
    await expect(phone(page)).toHaveAttribute('inputmode', 'numeric');
    await phone(page).pressSequentially('0917-123-4567');
    await expect(phone(page)).toHaveValue('09171234567');
    await phone(page).pressSequentially('8');
    await expect(phone(page)).toHaveValue('09171234567');
    await phone(page).fill('+63 917 123 4567');
    await expect(phone(page)).toHaveValue('09171234567');
  });

  test('says "Invalid number" when leaving a wrong number, and clears it once fixed', async ({ page }) => {
    await page.goto('/#order');
    await phone(page).fill('0817123');
    await page.getByLabel('Exact Address').focus();
    await expect(page.locator('#err-phone')).toHaveText('Invalid number');
    await phone(page).fill('09171234567');
    await page.getByLabel('Exact Address').focus();
    await expect(page.locator('#err-phone')).toBeEmpty();
  });

  test('rejects an obvious fake on Send', async ({ page }) => {
    await page.goto('/#order');
    await fillOrder(page);
    await phone(page).fill('09000000000');
    await page.getByRole('button', { name: 'Copy order & open Messenger' }).click();
    await expect(page.locator('#err-phone')).toHaveText('Invalid number');
    await expect(phone(page)).toBeFocused();
  });
});

test('other fields reject junk and cap their length', async ({ page }) => {
  await page.goto('/#order');
  await expect(page.getByLabel(/^Name/)).toHaveAttribute('maxlength', '60');
  await expect(page.getByLabel('Order List')).toHaveAttribute('maxlength', '500');
  await fillOrder(page);
  await page.getByLabel(/^Name/).fill('J');
  await page.getByLabel('Exact Address').fill('Pob');
  await page.getByRole('button', { name: 'Copy order & open Messenger' }).click();
  await expect(page.locator('#err-name')).toHaveText('Please enter a real name (letters only).');
  await expect(page.locator('#err-address')).toHaveText('Please add more detail to your address.');
});

test('payment is Cash on Delivery or GCash only, with the GCash logo', async ({ page }) => {
  await page.goto('/#order');
  const chips = page.locator('#field-payment label.chip');
  await expect(chips).toHaveCount(2);
  await expect(chips).toContainText(['Cash on Delivery', 'GCash']);
  await expect(chips.nth(1).locator('img[src="/assets/payments/gcash.svg"]')).toBeVisible();
  await expect(page.locator('#how')).toContainText('Cash on Delivery or GCash');
  await expect(page.locator('#app')).not.toContainText(/Maya|Card/);
});
