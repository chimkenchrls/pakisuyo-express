import { describe, it, expect } from 'vitest';
import { emptyCart, addItem, removeItem, itemCount, totals, peso } from '../../src/lib/cart.js';
import { getStore } from '../../src/data/stores.js';

const jollibee = getStore('jollibee-sariaya');
const contis = getStore('contis'); // out of town
const [chickenjoy, , , cokeFloat] = jollibee.menu;

describe('cart', () => {
  it('adds new items and increments existing ones', () => {
    let cart = addItem(emptyCart(), chickenjoy);
    cart = addItem(cart, chickenjoy);
    cart = addItem(cart, cokeFloat);
    expect(cart.lines).toEqual([
      { id: 'chickenjoy-rice', name: '1-pc Chickenjoy w/ Rice', price: 99, qty: 2 },
      { id: 'coke-float', name: 'Coke Float', price: 59, qty: 1 },
    ]);
    expect(itemCount(cart)).toBe(3);
  });

  it('removes one at a time and drops lines at zero', () => {
    let cart = addItem(addItem(emptyCart(), chickenjoy), chickenjoy);
    cart = removeItem(cart, 'chickenjoy-rice');
    expect(cart.lines[0].qty).toBe(1);
    cart = removeItem(cart, 'chickenjoy-rice');
    expect(cart.lines).toEqual([]);
    expect(removeItem(cart, 'nope').lines).toEqual([]);
  });

  it('never mutates the cart it was given', () => {
    const before = addItem(emptyCart(), chickenjoy);
    const snapshot = structuredClone(before);
    addItem(before, chickenjoy);
    removeItem(before, 'chickenjoy-rice');
    expect(before).toEqual(snapshot);
  });
});

describe('totals', () => {
  const cart = addItem(addItem(emptyCart(), chickenjoy), cokeFloat); // 99 + 59

  it('charges ₱50 delivery for Sariaya stores', () => {
    expect(totals(cart, jollibee)).toEqual({
      subtotal: 158, fee: 50, feeKnown: true, discount: 0, total: 208,
      feeLabel: 'Delivery fee (within Sariaya)', totalLabel: 'Total',
    });
  });

  it('applies the PAKISUYO10 promo to the delivery fee', () => {
    const t = totals(cart, jollibee, { promoApplied: true });
    expect(t.discount).toBe(10);
    expect(t.total).toBe(198);
  });

  it('does not invent a fee for out-of-town stores, and ignores the promo', () => {
    expect(totals(cart, contis, { promoApplied: true })).toEqual({
      subtotal: 158, fee: 0, feeKnown: false, discount: 0, total: 158,
      feeLabel: 'Out-of-town fee — confirmed by our team', totalLabel: 'Total (excl. delivery)',
    });
  });

  it('formats pesos', () => {
    expect(peso(198)).toBe('₱ 198');
    expect(peso(1250)).toBe('₱ 1,250');
  });
});
