export const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery', short: 'Cash on Delivery', icon: '💵' },
  { id: 'gcash', label: 'GCash', short: 'GCash', icon: '🟦' },
  { id: 'maya', label: 'Maya', short: 'Maya', icon: '🟩' },
  { id: 'card', label: 'Credit/Debit Card', short: 'Card', icon: '💳' },
];

export const paymentLabel = (id) => PAYMENT_METHODS.find((m) => m.id === id)?.label ?? null;
