import { test, expect } from '@playwright/test';

const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=', 'base64');
const LUCENA = { latitude: 13.9311, longitude: 121.6173 };

test.beforeEach(async ({ context }) => {
  await context.route('https://m.me/**', (r) => r.fulfill({ contentType: 'text/html', body: '<title>Messenger stub</title>' }));
  await context.route('https://tile.openstreetmap.org/**', (r) => r.fulfill({ contentType: 'image/png', body: PNG_1PX }));
  await context.route('https://nominatim.openstreetmap.org/**', (r) =>
    r.fulfill({ json: { address: { road: 'Rizal St', village: 'Poblacion', town: 'Sariaya' }, display_name: 'Rizal St' } }));
});

async function fillValidOrder(page) {
  await page.getByLabel(/^Name/).fill('Juan Dela Cruz');
  await page.getByLabel('Contact Number').fill('+63 917-123-4567');
  await page.getByLabel('Exact Address').fill('123 Rizal St, Poblacion');
  await page.getByLabel('Landmark').fill('Blue gate beside the chapel');
  await page.getByLabel('Store/s').selectOption('jollibee-sariaya');
  await page.getByLabel('Order List').fill('1 Chickenjoy bucket');
  await page.locator('label.chip', { hasText: 'GCash' }).click();
}

test('sends a complete order: copies the message and opens Messenger', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/#order');
  await fillValidOrder(page);

  const popup = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Send Order' }).click();
  expect((await popup).url()).toContain('m.me/PakisuyoExpressSariaya');

  await page.bringToFront();
  await expect(page.getByRole('status')).toContainText('Order copied!');
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toBe([
    'NEW ORDER – Pakisuyo Express',
    'Name: Juan Dela Cruz',
    'Exact Address: 123 Rizal St, Poblacion',
    'Landmark: Blue gate beside the chapel',
    'Contact Number: 0917 123 4567',
    'Store/s: Jollibee Sariaya',
    'Order List: 1 Chickenjoy bucket',
    'Payment: GCash',
  ].join('\n'));
});

test('shows errors and focuses the first missing field', async ({ page, context }) => {
  await page.goto('/#order');
  let opened = false;
  context.on('page', () => { opened = true; });
  await page.getByRole('button', { name: 'Send Order' }).click();
  await expect(page.getByLabel(/^Name/)).toBeFocused();
  await expect(page.locator('#err-name')).toHaveText('Please enter your name.');
  await expect(page.locator('#err-payment')).toHaveText('Please choose how you will pay.');
  expect(opened).toBe(false);
});

test('falls back to a copy dialog when the clipboard is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) } });
  });
  await page.goto('/#order');
  await fillValidOrder(page);
  await page.getByRole('button', { name: 'Send Order' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('textarea')).toHaveValue(/NEW ORDER – Pakisuyo Express/);
  await expect(dialog.getByRole('link', { name: 'Open Messenger' })).toHaveAttribute('href', 'https://m.me/PakisuyoExpressSariaya');
});

test('tapping a restaurant card preselects the store', async ({ page }) => {
  await page.goto('/');
  await page.locator('#restaurants .store-card', { hasText: "Dunkin' Sariaya" }).click();
  await expect(page.getByLabel('Store/s')).toHaveValue('dunkin-sariaya');
});

test('"Other" store asks for a typed store name', async ({ page }) => {
  await page.goto('/#order');
  await page.getByLabel('Store/s').selectOption('other');
  await expect(page.getByLabel('Store name')).toBeVisible();
});

test.describe('location', () => {
  test.use({ geolocation: LUCENA, permissions: ['geolocation'] });

  test('GPS pin outside Sariaya warns but still allows the order, and adds the pin link', async ({ page, context }) => {
    await context.grantPermissions(['geolocation', 'clipboard-read', 'clipboard-write']);
    await page.goto('/#order');
    await page.getByRole('button', { name: /Use my current location/ }).click();
    await expect(page.getByText("Looks like you're outside our delivery area")).toBeVisible();
    await expect(page.getByLabel('Exact Address')).toHaveValue('Rizal St, Poblacion, Sariaya'); // autofilled (was empty)

    await fillValidOrder(page);
    const popup = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Send Order' }).click();
    await popup;
    await page.bringToFront();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain('📍 Pin: https://maps.google.com/?q=13.931100,121.617300');
  });

  test('never overwrites an address the customer already typed', async ({ page }) => {
    await page.goto('/#order');
    await page.getByLabel('Exact Address').fill('Purok 3, beside the chapel');
    await page.getByRole('button', { name: /Use my current location/ }).click();
    await expect(page.getByText(/Pin set/)).toBeVisible();
    await page.waitForTimeout(1500); // longer than the lookup debounce
    await expect(page.getByLabel('Exact Address')).toHaveValue('Purok 3, beside the chapel');
  });
});
