import { getStore } from '../data/stores.js';
import { paymentLabel } from '../data/payments.js';
import { normalisePhone } from './validate.js';
import { mapsLink } from './geo.js';

export function storeDisplayName(data) {
  if (data.storeId === 'other') return data.storeOther.trim();
  return getStore(data.storeId)?.name ?? '';
}

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
    `Store/s: ${storeDisplayName(data)}`,
    `Order List: ${data.orderList.trim()}`,
    `Payment: ${paymentLabel(data.payment)}`,
  );
  const notes = (data.notes ?? '').trim();
  if (notes) lines.push(`Notes: ${notes}`);
  return lines.join('\n');
}
