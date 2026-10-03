import { describe, it, expect } from 'vitest';
import { normalisePhone, validateOrder, parseChangeFor, sanitisePhoneInput, LIMITS } from '../../src/lib/validate.js';

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

  it.each(['1234', '0917123456', '08171234567', '+639171234567', '09000000000', '09999999999', '09123456789', '09876543210'])(
    'says "Invalid number" for %s',
    (phone) => {
      expect(validateOrder({ ...VALID, phone }).errors.phone).toBe('Invalid number');
    },
  );

  it('accepts 11 digits starting with 09 (spaces from older saved details are fine)', () => {
    expect(validateOrder({ ...VALID, phone: '09171234567' }).valid).toBe(true);
    expect(validateOrder({ ...VALID, phone: '0917 123 4567' }).valid).toBe(true);
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

describe('sanitisePhoneInput (what the field keeps while typing or pasting)', () => {
  it.each([
    ['0917-123-4567', '09171234567'],
    ['+63 917 123 4567', '09171234567'],
    ['63 917 123 4567', '09171234567'],
    ['0063 917 123 4567', '09171234567'],
    ['639', '09'],
    ['abc0917', '0917'],
    ['091712345678', '09171234567'],
    ['', ''],
  ])('%s → %s', (raw, expected) => {
    expect(sanitisePhoneInput(raw)).toBe(expected);
  });
});

describe('validateOrder: field quality', () => {
  it.each([
    ['name', 'J', 'Please enter a real name (letters only).'],
    ['name', 'Juan123', 'Please enter a real name (letters only).'],
    ['address', 'Pob', 'Please add more detail to your address.'],
    ['landmark', 'ab', 'Please describe a landmark near you.'],
    ['orderList', 'x', 'Please list what you want to order.'],
  ])('%s %j → %s', (field, value, message) => {
    expect(validateOrder({ ...VALID, [field]: value }).errors[field]).toBe(message);
  });

  it.each(["Ma. Niña O'Brien-Santos", 'José Rizal'])('accepts real names like %s', (name) => {
    expect(validateOrder({ ...VALID, name }).valid).toBe(true);
  });

  it.each(Object.entries(LIMITS))('limits %s to %i characters', (field, max) => {
    const value = field === 'changeFor' ? '1'.repeat(max + 1) : 'a'.repeat(max + 1);
    const data = { ...VALID, payment: field === 'changeFor' ? 'cod' : VALID.payment, [field]: value };
    expect(validateOrder(data).errors[field]).toBe(`Too long. Please keep it under ${max} characters.`);
  });
});
