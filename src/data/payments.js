// Outline banknote with a peso sign; colour comes from CSS (currentColor).
const CASH_ICON = '<svg class="pay-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">'
  + '<rect x="2" y="6" width="20" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/>'
  + '<circle cx="5.6" cy="12" r="1.1" fill="currentColor"/><circle cx="18.4" cy="12" r="1.1" fill="currentColor"/>'
  + '<path d="M10.2 15.8V8.4h2.3a2.1 2.1 0 0 1 0 4.2h-2.3M8.8 10.1h5.6M8.8 11.4h5.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>'
  + '</svg>';

export const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery' },
  { id: 'gcash', label: 'GCash', logo: '/assets/payments/gcash.svg' },
];

export const paymentLabel = (id) => PAYMENT_METHODS.find((m) => m.id === id)?.label ?? null;

// GCash shows its real wordmark (the text is kept for screen readers); cash gets a drawn icon, no emoji.
export function paymentBadgeHtml(method) {
  if (method.logo) {
    return `<img class="pay-logo" src="${method.logo}" alt="" width="74" height="18" decoding="async"><span class="sr-only">${method.label}</span>`;
  }
  return `${CASH_ICON}<span>${method.label}</span>`;
}
