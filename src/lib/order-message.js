import { paymentLabel } from '../data/payments.js';
import { normalisePhone, parseChangeFor } from './validate.js';
import { peso } from './cart.js';
import { mapsLink } from './geo.js';

export function buildOrderMessage(data) {
  const lines = [
    'NEW ORDER – Pakisuyo Express',
    `Name: ${data.name.trim()}`,
    `Exact Address: ${data.address.trim()}`,
    `Landmark: ${data.landmark.trim()}`,
  ];
  if (data.pin) lines.push(`📍 Pin: ${mapsLink(data.pin.lat, data.pin.lng)}`);
  lines.push(
    `Contact Number: ${normalisePhone(data.phone)}`,
    `Store/s: ${data.store.trim()}`,
    `Order List: ${data.orderList.trim()}`,
    `Payment: ${paymentLabel(data.payment)}`,
  );
  const change = data.payment === 'cod' ? parseChangeFor(data.changeFor) : null;
  if (change === 'exact') lines.push('Change for: Exact amount (no change needed)');
  else if (Number.isFinite(change)) lines.push(`Change for: ${peso(change).replace(' ', '')}`);
  const notes = (data.notes ?? '').trim();
  if (notes) lines.push(`Notes: ${notes}`);
  return lines.join('\n');
}
