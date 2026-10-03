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
    await expect(cards).toContainText(['Jollibee Sariaya', "McDonald's Sariaya", "Dunkin' Sariaya", 'Wings & Dims Corner', 'Dash Espresso']);
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
