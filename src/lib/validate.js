import { PAYMENT_METHODS } from '../data/payments.js';

export const FIELD_ORDER = ['name', 'phone', 'address', 'landmark', 'storeId', 'storeOther', 'orderList', 'payment'];

const REQUIRED_TEXT = {
  name: 'Please enter your name.',
  address: 'Please enter your exact address.',
  landmark: 'Please add a landmark so our rider can find you.',
  orderList: 'Please list what you want to order.',
};

export function normalisePhone(raw) {
  if (typeof raw !== 'string') return null;
  // Country code (+63 / 0063 / 63), optionally followed by a redundant 0 ("+63 0917…"), or no leading 0 at all.
  const digits = raw.replace(/[\s\-().]/g, '').replace(/^(?:\+63|0063|63)?0?(?=9\d{9}$)/, '0');
  if (!/^09\d{9}$/.test(digits)) return null;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

export function validateOrder(data) {
  const errors = {};
  const text = (field) => String(data[field] ?? '').trim();

  for (const [field, message] of Object.entries(REQUIRED_TEXT)) {
    if (!text(field)) errors[field] = message;
  }
  if (!normalisePhone(data.phone)) errors.phone = 'Enter a PH mobile number, e.g. 0917 123 4567.';
  if (!text('storeId')) errors.storeId = 'Please choose a store.';
  else if (data.storeId === 'other' && !text('storeOther')) errors.storeOther = 'Please type the store name.';
  if (!PAYMENT_METHODS.some((m) => m.id === data.payment)) errors.payment = 'Please choose how you will pay.';

  return { valid: Object.keys(errors).length === 0, errors };
}
