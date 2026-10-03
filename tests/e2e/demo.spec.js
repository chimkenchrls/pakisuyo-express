import { test, expect } from '@playwright/test';

test('owner can tap through a whole order', async ({ page }) => {
  await page.goto('/?demoStepMs=150#app');
  const demo = page.getByTestId('demo-screen');
  await demo.scrollIntoViewIfNeeded(); // splash waits until the phone is actually on screen

  await demo.getByRole('button', { name: /Jollibee Sariaya/ }).click(); // splash auto-skips after 1s
  await expect(demo.getByText('Sample menu · prices for demo only')).toBeVisible();
  await demo.getByRole('button', { name: 'Add 1-pc Chickenjoy w/ Rice' }).click();
  await demo.getByRole('button', { name: 'Add Coke Float' }).click();
  await demo.getByRole('button', { name: /View cart · ₱ 158/ }).click();

  await expect(demo.getByText('Delivery fee (within Sariaya)')).toBeVisible();
  await demo.getByRole('button', { name: 'Change' }).click();
  await demo.getByRole('button', { name: /Maya/ }).click();
  await expect(demo.locator('.ds-pm')).toContainText('Maya');
  await demo.getByRole('button', { name: /PAKISUYO10/ }).click();
  await expect(demo.getByText('Promo (PAKISUYO10)')).toBeVisible();

  // 99 + 59 + 50 − 10 = 198. A double-tap must place exactly one order.
  await demo.getByRole('button', { name: 'Place Order · ₱ 198' }).dblclick();
  await expect(demo.locator('.ds-step')).toHaveCount(5);
  await expect(demo.getByText('Delivered! Enjoy your meal 🎉')).toBeVisible({ timeout: 5000 });

  await demo.getByRole('button', { name: 'Restart demo' }).click();
  await expect(demo.getByRole('button', { name: /Jollibee Sariaya/ })).toBeVisible();
});

test('stores without a menu point back to the demo store', async ({ page }) => {
  await page.goto('/#app');
  const demo = page.getByTestId('demo-screen');
  await demo.scrollIntoViewIfNeeded(); // splash waits until the phone is actually on screen
  await demo.getByRole('button', { name: /McDonald's Sariaya/ }).click();
  await expect(demo.getByText('Menu coming soon for this store.')).toBeVisible();
  await demo.getByRole('button', { name: 'Try Jollibee Sariaya' }).click();
  await expect(demo.getByText('Sample menu · prices for demo only')).toBeVisible();
});

test('search keeps focus while typing and filters stores', async ({ page }) => {
  await page.goto('/#app');
  const demo = page.getByTestId('demo-screen');
  await demo.scrollIntoViewIfNeeded(); // splash waits until the phone is actually on screen
  const search = demo.getByLabel('Search stores or food');
  await search.pressSequentially('spag');
  await expect(search).toBeFocused();
  await expect(search).toHaveValue('spag');
  await expect(demo.locator('.ds-store')).toHaveCount(1);
});
