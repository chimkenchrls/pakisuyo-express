import { describe, it, expect } from 'vitest';
import { normalisePhone, validateOrder, parseChangeFor } from '../../src/lib/validate.js';

const VALID = {
  name: 'Juan Dela Cruz',
  phone: '0917 123 4567',
  address: '123 Rizal St, Poblacion',
  landmark: 'Blue gate beside the chapel',
  store: 'Jollibee Sariaya',
  orderList: '1 Chickenjoy bucket',
  payment: 'gcash',
  notes: '',
  pin: null,
};

describe('normalisePhone', () => {
  it.each([
    ['09171234567', '0917 123 4567'],
    ['0917 123 4567', '0917 123 4567'],
    ['0917-123-4567', '0917 123 4567'],
    ['(0917) 123.4567', '0917 123 4567'],
    ['+639171234567', '0917 123 4567'],
    ['+63 917 123 4567', '0917 123 4567'],
    ['639171234567', '0917 123 4567'],
    ['9171234567', '0917 123 4567'],
    ['+63 0917 123 4567', '0917 123 4567'],
    ['+6309171234567', '0917 123 4567'],
    ['0063 917 123 4567', '0917 123 4567'],
  ])('accepts %s', (raw, expected) => {
    expect(normalisePhone(raw)).toBe(expected);
  });

  it.each(['', '0917123456', '091712345678', '08171234567', '+63 917 123 456', 'abc', '0917 123 456a'])(
    'rejects %s',
    (raw) => {
      expect(normalisePhone(raw)).toBeNull();
    },
  );

  it('rejects non-strings', () => {
    expect(normalisePhone(undefined)).toBeNull();
    expect(normalisePhone(9171234567)).toBeNull();
  });
});

describe('validateOrder', () => {
  it('accepts a complete order', () => {
    expect(validateOrder(VALID)).toEqual({ valid: true, errors: {} });
  });

  it.each(['name', 'address', 'landmark', 'store', 'orderList'])('requires %s (whitespace counts as empty)', (field) => {
    const result = validateOrder({ ...VALID, [field]: '   ' });
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors)).toEqual([field]);
  });

  it('rejects a bad phone number with a helpful message', () => {
    const { errors } = validateOrder({ ...VALID, phone: '1234' });
    expect(errors.phone).toMatch(/0917 123 4567/);
  });

  it('asks the customer to choose or type a store', () => {
    expect(validateOrder({ ...VALID, store: '' }).errors.store).toBe('Please choose or type a store.');
  });

  it('requires a known payment method', () => {
    expect(validateOrder({ ...VALID, payment: '' }).errors).toHaveProperty('payment');
    expect(validateOrder({ ...VALID, payment: 'bitcoin' }).errors).toHaveProperty('payment');
  });

  it('notes are optional', () => {
    expect(validateOrder({ ...VALID, notes: '' }).valid).toBe(true);
  });
});

describe('parseChangeFor (COD change)', () => {
  it.each([
    ['', null],
    ['   ', null],
    ['Exact amount', 'exact'],
    ['exact', 'exact'],
    ['500', 500],
    ['₱1,000', 1000],
    [' 1 000 ', 1000],
  ])('%s → %s', (raw, expected) => {
    expect(parseChangeFor(raw)).toBe(expected);
  });

  it.each(['abc', '0', '-50', '12.5', '₱'])('%s is invalid', (raw) => {
    expect(Number.isNaN(parseChangeFor(raw))).toBe(true);
  });
});

describe('validateOrder: change for COD', () => {
  it('is optional', () => {
    expect(validateOrder({ ...VALID, payment: 'cod', changeFor: '' }).valid).toBe(true);
  });

  it('rejects an unreadable amount, only for COD', () => {
    expect(validateOrder({ ...VALID, payment: 'cod', changeFor: 'abc' }).errors.changeFor)
      .toBe('Enter an amount like 500, or choose Exact amount.');
    expect(validateOrder({ ...VALID, payment: 'gcash', changeFor: 'abc' }).valid).toBe(true);
  });
});
