import { describe, it, expect } from 'vitest';
import { buildOrderMessage } from '../../src/lib/order-message.js';

const BASE = {
  name: '  Juan Dela Cruz ',
  phone: '+63 917-123-4567',
  address: '123 Rizal St, Poblacion',
  landmark: 'Blue gate beside the chapel',
  store: ' Jollibee Sariaya ',
  orderList: '1 Chickenjoy bucket\n2 Coke Float',
  payment: 'gcash',
  notes: '',
  pin: null,
};

describe('buildOrderMessage', () => {
  it('uses the exact field order the admins already use', () => {
    expect(buildOrderMessage(BASE)).toBe([
      'NEW ORDER – Pakisuyo Express',
      'Name: Juan Dela Cruz',
      'Exact Address: 123 Rizal St, Poblacion',
      'Landmark: Blue gate beside the chapel',
      'Contact Number: 0917 123 4567',
      'Store/s: Jollibee Sariaya',
      'Order List: 1 Chickenjoy bucket\n2 Coke Float',
      'Payment: GCash',
    ].join('\n'));
  });

  it('adds a tappable pin link after the landmark when a pin is set', () => {
    const lines = buildOrderMessage({ ...BASE, pin: { lat: 13.9634, lng: 121.5263 } }).split('\n');
    expect(lines[4]).toBe('📍 Pin: https://maps.google.com/?q=13.963400,121.526300');
  });

  it('adds notes only when filled', () => {
    expect(buildOrderMessage({ ...BASE, notes: '  Call when outside ' })).toMatch(/\nNotes: Call when outside$/);
    expect(buildOrderMessage({ ...BASE, notes: '   ' })).not.toContain('Notes:');
  });

  it('uses the store exactly as picked or typed (trimmed) and long payment labels', () => {
    const msg = buildOrderMessage({ ...BASE, store: '  Aling Nena Bakery ', payment: 'card' });
    expect(msg).toContain('Store/s: Aling Nena Bakery');
    expect(msg).toContain('Payment: Credit/Debit Card');
  });
});
