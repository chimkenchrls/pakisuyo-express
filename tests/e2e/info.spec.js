import { test, expect } from '@playwright/test';

const footerLink = (page, name) => page.locator('#site-footer').getByRole('link', { name, exact: true });

test('footer links open About, Privacy and Terms in a modal', async ({ page }) => {
  await page.goto('/');
  for (const [name, hash, phrase] of [
    ['About', '#about', 'since 2022'],
    ['Privacy', '#privacy', 'Data Privacy Act of 2012'],
    ['Terms & Conditions', '#terms', 'Draft'],
  ]) {
    await footerLink(page, name).click();
    const dialog = page.getByRole('dialog', { name });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${hash}$`));
    await expect(dialog).toContainText(phrase);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page).not.toHaveURL(new RegExp(`${hash}$`));
    await expect(footerLink(page, name)).toBeFocused();
  }
});

test('the modal closes with the close button, a tap outside, or the Back button', async ({ page }) => {
  await page.goto('/');
  await footerLink(page, 'Privacy').click();
  await page.getByRole('dialog', { name: 'Privacy' }).getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();

  await footerLink(page, 'About').click();
  await expect(page.getByRole('dialog', { name: 'About' })).toBeVisible();
  await page.mouse.click(5, 5); // the dimmed area outside the card
  await expect(page.getByRole('dialog')).toBeHidden();

  await footerLink(page, 'Terms & Conditions').click();
  await expect(page.getByRole('dialog', { name: 'Terms & Conditions' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('a shared link opens the right page directly', async ({ page }) => {
  await page.goto('/#terms');
  await expect(page.getByRole('dialog', { name: 'Terms & Conditions' })).toBeVisible();
});

test('privacy and terms describe what the site really does, without em-dashes or emoji', async ({ page }) => {
  await page.goto('/#privacy');
  const privacy = page.getByRole('dialog', { name: 'Privacy' });
  await expect(privacy).not.toContainText('Google');
  for (const phrase of ['Remember my details', 'OpenStreetMap', 'Messenger', 'No analytics']) {
    await expect(privacy).toContainText(phrase);
  }
  for (const id of ['privacy', 'terms', 'about']) {
    await page.goto(`/#${id}`);
    const text = await page.locator('dialog[open]').innerText();
    expect(text).not.toMatch(/—/);
    expect(text.replace(/[©®™₱]/g, '')).not.toMatch(/\p{Extended_Pictographic}/u);
  }
  await page.goto('/#terms');
  await expect(page.locator('dialog[open]')).toContainText('₱50');
});

test('the privacy note under the order button links to the full policy', async ({ page }) => {
  await page.goto('/#order');
  await page.locator('#order').getByRole('link', { name: 'Privacy' }).click();
  await expect(page.getByRole('dialog', { name: 'Privacy' })).toBeVisible();
});
