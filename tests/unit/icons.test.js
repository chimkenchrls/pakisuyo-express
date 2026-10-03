import { describe, it, expect } from 'vitest';
import { icon } from '../../src/lib/icons.js';

describe('icon', () => {
  it('returns an inline duotone SVG that follows the text colour and hides from screen readers', () => {
    const svg = icon('moped');
    expect(svg).toMatch(/^<svg /);
    expect(svg).toContain('class="icon"');
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).toContain('focusable="false"');
    expect(svg).toContain('fill="currentColor"');
    expect(svg).toContain('opacity="0.2"'); // the duotone tint
  });

  it('adds extra classes', () => {
    expect(icon('map-pin', 'icon--sm')).toContain('class="icon icon--sm"');
  });

  it('fails loudly on a name that is not bundled', () => {
    expect(() => icon('drumstick')).toThrow(/Unknown icon: drumstick/);
  });
});
