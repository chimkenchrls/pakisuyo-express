import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/data/images.json', () => ({
  default: { stores: { 'jollibee-sariaya': '/assets/stores/jollibee-sariaya/logo.png' }, items: { yumburger: '/assets/y.png' } },
}));

const { initialsTile, storeImageHtml, itemImageHtml, categoryTile } = await import('../../src/lib/images.js');
const { getStore } = await import('../../src/data/stores.js');

describe('images', () => {
  it('initials tile uses the store colours and hides from screen readers', () => {
    const html = initialsTile({ initials: 'BA', color: '#3E7B27', textColor: '#FFFFFF' }, 'x');
    expect(html).toContain('>BA<');
    expect(html).toContain('background:#3E7B27');
    expect(html).toContain('aria-hidden="true"');
  });

  it('uses the manifest logo with a fallback attached', () => {
    const html = storeImageHtml(getStore('jollibee-sariaya'), 'logo');
    expect(html).toContain('src="/assets/stores/jollibee-sariaya/logo.png"');
    expect(html).toContain('alt="Jollibee Sariaya logo"');
    expect(html).toContain('data-fallback="&lt;span');
  });

  it('falls back to initials for featured stores without a logo', () => {
    expect(storeImageHtml(getStore('mcdonalds-sariaya'), 'logo')).toContain('>MC<');
  });

  it('gives directory stores a category icon tile', () => {
    const html = storeImageHtml({ id: 'osm-n1', name: 'Libra Bakery', category: 'bakery', town: 'Lucena' }, 'row');
    expect(html).toContain('🥖');
    expect(html).toContain('background:#F3EBDD');
    expect(categoryTile('unknown', 'x')).toContain('🍴');
  });

  it('menu items use the manifest photo or an emoji tile', () => {
    const [chickenjoy, , yumburger] = getStore('jollibee-sariaya').menu;
    expect(itemImageHtml(yumburger, 'i')).toContain('src="/assets/y.png"');
    expect(itemImageHtml(chickenjoy, 'i')).toContain('🍗');
  });
});
