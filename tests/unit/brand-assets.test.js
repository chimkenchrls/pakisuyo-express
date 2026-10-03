import { describe, it, expect } from 'vitest';
import { visibleManifest, BRAND_PROTECTED } from '../../src/lib/brand-assets.js';

const manifest = {
  stores: { 'jollibee-sariaya': '/a.png', 'wings-dims-sariaya': '/w.jpg', 'dunkin-sariaya': '/d.png' },
  items: { 'chickenjoy-rice': '/c.jpg', yumburger: '/y.jpg' },
};

describe('visibleManifest', () => {
  it('pitch build keeps everything', () => {
    expect(visibleManifest(manifest, { pitch: true })).toEqual(manifest);
  });

  it('launch build drops third-party brand logos and photos, keeps owner-approved ones', () => {
    expect(visibleManifest(manifest, { pitch: false })).toEqual({
      stores: { 'wings-dims-sariaya': '/w.jpg' },
      items: {},
    });
  });

  it('lists the protected brand assets explicitly', () => {
    expect([...BRAND_PROTECTED].sort()).toEqual(
      ['chickenjoy-rice', 'coke-float', 'dunkin-sariaya', 'jollibee-sariaya', 'jolly-spaghetti', 'mcdonalds-sariaya', 'yumburger'],
    );
  });
});
