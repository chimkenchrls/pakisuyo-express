import { describe, it, expect } from 'vitest';
import { BRAND, markSvg, logoHorizontal, logoStacked } from '../../src/brand/logo.js';

describe('brand logo', () => {
  it('draws the P mark with speed lines by default', () => {
    const svg = markSvg();
    expect(svg).toContain(`fill="${BRAND.red}"`);
    expect(svg).toContain(`fill="${BRAND.yellow}"`);
    expect(svg.match(/<rect /g)).toHaveLength(4); // tile + 3 speed lines
  });

  it('drops speed lines for tiny icons', () => {
    expect(markSvg({ speedLines: false }).match(/<rect /g)).toHaveLength(1);
  });

  it('horizontal logo has the wordmark text and size variable', () => {
    const html = logoHorizontal({ size: 36 });
    expect(html).toContain('Pakisuyo');
    expect(html).toContain('EXPRESS');
    expect(html).toContain('--mark:36px');
    expect(html).toContain('logo--light');
  });

  it('stacked logo on red inverts the mark by default', () => {
    const html = logoStacked({ tone: 'red' });
    expect(html).toContain('logo--stacked');
    expect(html).toContain(`<rect width="64" height="64" rx="16" fill="${BRAND.yellow}"`);
  });

  it('stacked logo on red can keep the normal mark (FB profile)', () => {
    const html = logoStacked({ tone: 'red', invertMark: false });
    expect(html).toContain(`<rect width="64" height="64" rx="16" fill="${BRAND.red}"`);
  });
});
