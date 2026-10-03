import { HOME_TOWN, SARIAYA_DELIVERY_FEE, PROMO } from '../data/stores.js';

export const emptyCart = () => ({ lines: [] });

export function addItem(cart, item) {
  const existing = cart.lines.find((l) => l.id === item.id);
  const lines = existing
    ? cart.lines.map((l) => (l.id === item.id ? { ...l, qty: l.qty + 1 } : l))
    : [...cart.lines, { id: item.id, name: item.name, price: item.price, qty: 1 }];
  return { lines };
}

export function removeItem(cart, itemId) {
  const lines = cart.lines
    .map((l) => (l.id === itemId ? { ...l, qty: l.qty - 1 } : l))
    .filter((l) => l.qty > 0);
  return { lines };
}

export const itemCount = (cart) => cart.lines.reduce((n, l) => n + l.qty, 0);

export function totals(cart, store, { promoApplied = false } = {}) {
  const subtotal = cart.lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const feeKnown = store?.town === HOME_TOWN;
  const fee = feeKnown ? SARIAYA_DELIVERY_FEE : 0;
  const discount = promoApplied && feeKnown ? Math.min(PROMO.discount, fee) : 0;
  return {
    subtotal,
    fee,
    feeKnown,
    discount,
    total: subtotal + fee - discount,
    feeLabel: feeKnown ? 'Delivery fee (within Sariaya)' : 'Out-of-town fee: confirmed by our team',
    totalLabel: feeKnown ? 'Total' : 'Total (excl. delivery)',
  };
}

export const peso = (n) => `₱ ${n.toLocaleString('en-PH')}`;
