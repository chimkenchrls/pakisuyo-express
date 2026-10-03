import { describe, it, expect } from 'vitest';
import { deliveryFeeHint } from '../../src/lib/fees.js';

describe('deliveryFeeHint', () => {
  it('gives the general rule before a store is chosen', () => {
    expect(deliveryFeeHint('')).toBe('Delivery fee: ₱ 50 within Sariaya · out-of-town stores: fee confirmed by our team');
  });

  it('shows ₱50 for Sariaya stores and typed names', () => {
    expect(deliveryFeeHint('Jollibee Sariaya')).toBe('Delivery fee: ₱ 50 within Sariaya');
    expect(deliveryFeeHint('Aling Nena Bakery')).toBe('Delivery fee: ₱ 50 within Sariaya');
  });

  it('flags stores from other towns', () => {
    expect(deliveryFeeHint('Jollibee (Lucena)')).toBe('Out-of-town fee: confirmed by our team');
    expect(deliveryFeeHint('libra bakery lucena')).toBe('Out-of-town fee: confirmed by our team');
    expect(deliveryFeeHint('Tayabas Pasalubong')).toBe('Out-of-town fee: confirmed by our team');
  });

  it("doesn't mistake words that merely contain a town name", () => {
    expect(deliveryFeeHint('Lucenadia Cafe')).toBe('Delivery fee: ₱ 50 within Sariaya');
  });
});
