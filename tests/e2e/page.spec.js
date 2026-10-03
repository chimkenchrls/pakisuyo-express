import { test, expect } from '@playwright/test';

test.describe('page', () => {
  test('hero shows the tagline and calls to action', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Always ready for your Pakisuyo!');
    await expect(page.getByRole('link', { name: 'Message us', exact: true })).toHaveAttribute('href', 'https://m.me/PakisuyoExpressSariaya');
  });

  test('has no horizontal scroll on a phone', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('shows exactly the 5 featured stores', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('#restaurants .store-card');
    await expect(cards).toHaveCount(5);
    await expect(cards).toContainText(['La Barrida Sariaya', 'Bukid Amyr Restaurant', 'KOPE-RIGHT', 'Wings & Dims Corner', 'Dash Espresso']);
  });

  test('mobile menu opens and closes', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Menu' });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.locator('#site-nav').getByRole('link', { name: 'How it works' }).click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});

test.describe('hours badge uses Manila time on a foreign device', () => {
  test.use({ timezoneId: 'America/Los_Angeles' });

  test('9PM in Manila is closed even though it is morning in LA', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-03T13:00:00Z')); // 21:00 Manila, 06:00 LA
    await page.goto('/');
    await expect(page.getByTestId('hours-badge')).toContainText('Closed now · Opens 8AM');
  });

  test('10AM in Manila is open even though it is evening in LA', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-03T02:00:00Z')); // 10:00 Manila, 19:00 LA
    await page.goto('/');
    await expect(page.getByTestId('hours-badge')).toContainText('Open today 8AM–7PM');
  });
});

test('the ☰ menu button only appears on phones', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByRole('button', { name: 'Menu' })).toBeHidden();
  await expect(page.locator('#site-nav').getByRole('link', { name: 'How it works' })).toBeVisible();
});

test.describe('top bar colour follows the hero', () => {
  const bg = (page) => page.locator('.site-header').evaluate((el) => getComputedStyle(el).backgroundColor);
  const WHITE = 'rgb(255, 255, 255)';
  const YELLOW = 'rgb(255, 210, 63)';

  test('white over the hero, yellow once past it, white again on the way back', async ({ page }) => {
    await page.goto('/');
    await expect.poll(() => bg(page)).toBe(WHITE);
    await page.locator('#how').scrollIntoViewIfNeeded();
    await expect.poll(() => bg(page)).toBe(YELLOW);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect.poll(() => bg(page)).toBe(WHITE);
  });

  test('opening the page further down starts yellow', async ({ page }) => {
    await page.goto('/#order');
    await expect.poll(() => bg(page)).toBe(YELLOW);
  });

  test('the phone menu matches the bar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Menu' }).click();
    await expect.poll(() => page.locator('#site-nav').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(WHITE);
  });
});

test('the font is served by the site itself, not Google', async ({ page }) => {
  const external = [];
  page.on('request', (r) => { if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) external.push(r.url()); });
  await page.goto('/', { waitUntil: 'networkidle' });
  expect(external).toEqual([]);
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('800 16px "Plus Jakarta Sans"'))).toBe(true);
  const family = await page.locator('.hero__title').evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family).toContain('Plus Jakarta Sans');
});

test('the site says clearly that it is a portfolio demo', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#hero')).not.toContainText('Portfolio demo'); // kept out of the hero by design
  await expect(page.locator('#order')).toContainText('This website is a portfolio demo.');
  await expect(page.locator('#site-footer')).toContainText('Portfolio demo');
  await page.locator('#site-footer').getByRole('link', { name: 'About', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'About' })).toContainText('portfolio project');
});
