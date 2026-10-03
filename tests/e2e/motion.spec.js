import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const FIXTURE = readFileSync(new URL('./fixtures/directory.json', import.meta.url), 'utf8');
const running = (locator) => locator.evaluate((el) => el.getAnimations().filter((a) => a.playState === 'running').length);

test.beforeEach(async ({ context }) => {
  await context.route('**/data/directory.json', (r) => r.fulfill({ contentType: 'application/json', body: FIXTURE }));
  await context.route('https://m.me/**', (r) => r.fulfill({ contentType: 'text/html', body: 'stub' }));
});

test.describe('with motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('hero plays an entrance; the headline only slides so it is painted immediately', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/\bmotion\b/);
    const h1 = page.locator('.hero__title');
    expect(await h1.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    expect(await h1.evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
  });

  test('sections fade up once as they scroll into view', async ({ page }) => {
    await page.goto('/');
    const step = page.locator('.step').first();
    await expect(step).toHaveClass(/\breveal\b/);
    await expect(step).not.toHaveClass(/is-visible/);
    await step.scrollIntoViewIfNeeded();
    await expect(step).toHaveClass(/is-visible/);
  });

  test('demo: cart bar bumps on add, the current step pulses, and the moped drives smoothly', async ({ page }) => {
    await page.goto('/?demoStepMs=1500#app');
    const demo = page.getByTestId('demo-screen');
    await demo.scrollIntoViewIfNeeded();
    await demo.getByRole('button', { name: /Jollibee Sariaya/ }).click();
    await demo.getByRole('button', { name: 'Add Coke Float' }).click();
    expect(await running(demo.locator('.ds-cartbar'))).toBeGreaterThan(0);
    await demo.getByRole('button', { name: /View cart/ }).click();
    await demo.getByRole('button', { name: /Place Order/ }).click();
    expect(await running(demo.locator('.ds-step.is-now .ds-dot'))).toBeGreaterThan(0);
    // When the next step arrives the moped glides instead of jumping.
    await expect(demo.locator('.ds-step.is-now')).toContainText('Preparing', { timeout: 4000 });
    expect(await running(demo.locator('.ds-rider'))).toBeGreaterThan(0);
  });

  test('copying the order shows a toast with a check that draws itself', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/#order');
    await page.getByLabel(/^Name/).fill('Juan Dela Cruz');
    await page.getByLabel('Contact Number').fill('09171234567');
    await page.getByLabel('Exact Address').fill('123 Rizal St');
    await page.getByLabel('Landmark').fill('Blue gate');
    await page.getByRole('combobox', { name: /Store/ }).fill('Jollibee Sariaya');
    await page.getByLabel('Order List').fill('1 Chickenjoy');
    await page.locator('label.chip', { hasText: 'GCash' }).click();
    const popup = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Copy order & open Messenger' }).click();
    await popup;
    await page.bringToFront();
    const toast = page.getByRole('status');
    await expect(toast).toContainText('Order copied!');
    await expect(toast.locator('svg.toast__check')).toBeVisible();
  });

  test('buttons give press feedback', async ({ page }) => {
    await page.goto('/');
    const btn = page.locator('.hero .btn--primary');
    const transform = await btn.evaluate((el) => {
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      return getComputedStyle(el).transitionProperty;
    });
    expect(transform).toContain('transform');
  });
});

test.describe('with "reduce motion" on', () => {
  test.use({ reducedMotion: 'reduce' });

  test('nothing animates and everything is shown immediately', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveClass(/\bmotion\b/);
    const step = page.locator('.step').first();
    await step.scrollIntoViewIfNeeded();
    expect(await step.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    expect(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)).toBe(0);
  });
});
