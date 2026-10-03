import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/data/images.json', () => ({
  default: { stores: { 'jollibee-sariaya': '/assets/stores/jollibee-sariaya/logo.png' }, items: { yumburger: '/assets/y.png' } },
}));

const { initialsTile, storeLogoHtml, itemImageHtml } = await import('../../src/lib/images.js');
const { getStore } = await import('../../src/data/stores.js');

describe('images', () => {
  it('initials tile uses the store colours and hides from screen readers', () => {
    const html = initialsTile(getStore('bukid-amyr'), 'x');
    expect(html).toContain('>BA<');
    expect(html).toContain('background:#3E7B27');
    expect(html).toContain('aria-hidden="true"');
  });

  it('uses the manifest logo with an initials fallback attached', () => {
    const html = storeLogoHtml(getStore('jollibee-sariaya'), 'logo');
    expect(html).toContain('src="/assets/stores/jollibee-sariaya/logo.png"');
    expect(html).toContain('alt="Jollibee Sariaya logo"');
    expect(html).toContain('data-fallback="&lt;span');
  });

  it('falls back to initials when no logo exists', () => {
    expect(storeLogoHtml(getStore('mcdonalds-sariaya'), 'logo')).toContain('>MC<');
  });

  it('menu items use the manifest photo or an emoji tile', () => {
    const [chickenjoy, , yumburger] = getStore('jollibee-sariaya').menu;
    expect(itemImageHtml(yumburger, 'i')).toContain('src="/assets/y.png"');
    expect(itemImageHtml(chickenjoy, 'i')).toContain('🍗');
  });
});
