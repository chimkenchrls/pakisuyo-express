import { describe, it, expect } from 'vitest';
import { PAYMENT_METHODS, paymentLabel, paymentBadgeHtml } from '../../src/data/payments.js';

describe('payment methods', () => {
  it('offers only Cash on Delivery and GCash', () => {
    expect(PAYMENT_METHODS.map((m) => m.id)).toEqual(['cod', 'gcash']);
    expect(paymentLabel('maya')).toBeNull();
    expect(paymentLabel('card')).toBeNull();
  });

  it('shows the real GCash logo, with readable text for screen readers and tests', () => {
    const html = paymentBadgeHtml(PAYMENT_METHODS[1]);
    expect(html).toContain('src="/assets/payments/gcash.svg"');
    expect(html).toContain('alt=""');
    expect(html).toContain('<span class="sr-only">GCash</span>');
  });

  it('draws a cash icon instead of an emoji', () => {
    const html = paymentBadgeHtml(PAYMENT_METHODS[0]);
    expect(html).toContain('<svg');
    expect(html).toContain('Cash on Delivery');
    expect(html).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
