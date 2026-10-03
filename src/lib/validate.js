import { PAYMENT_METHODS } from '../data/payments.js';

export const FIELD_ORDER = ['name', 'phone', 'address', 'landmark', 'store', 'orderList', 'payment', 'changeFor', 'notes'];

// Max characters per field (also set as maxlength on the inputs).
export const LIMITS = { name: 60, address: 200, landmark: 120, store: 120, orderList: 500, notes: 300, changeFor: 20 };

// Minimum length once the field isn't empty, with the message to show.
const MIN_TEXT = {
  address: [5, 'Please add more detail to your address.'],
  landmark: [3, 'Please describe a landmark near you.'],
  orderList: [2, 'Please list what you want to order.'],
};

const NAME_CHARS = /^[\p{L}\p{M} .'’-]+$/u;
const OBVIOUS_FAKES = new Set(['09123456789', '09876543210']);

const REQUIRED_TEXT = {
  name: 'Please enter your name.',
  address: 'Please enter your exact address.',
  landmark: 'Please add a landmark so our rider can find you.',
  store: 'Please choose or type a store.',
  orderList: 'Please list what you want to order.',
};

export function normalisePhone(raw) {
  if (typeof raw !== 'string') return null;
  // Country code (+63 / 0063 / 63), optionally followed by a redundant 0 ("+63 0917…"), or no leading 0 at all.
  const digits = raw.replace(/[\s\-().]/g, '').replace(/^(?:\+63|0063|63)?0?(?=9\d{9}$)/, '0');
  if (!/^09\d{9}$/.test(digits)) return null;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

// What the phone field keeps while typing or pasting: a pasted "+63 917 …" becomes "0917…", digits only, max 11.
export function sanitisePhoneInput(raw) {
  return String(raw ?? '')
    .replace(/[^\d+]/g, '')
    .replace(/^(?:\+?63|0063)(?=9)/, '0')
    .replace(/\D/g, '')
    .slice(0, 11);
}

// 11 digits starting with 09, and not an obvious prank like 09000000000 or 09123456789.
function isValidPhone(raw) {
  const digits = String(raw ?? '').replace(/[\s-]/g, '');
  if (!/^09\d{9}$/.test(digits)) return false;
  return !OBVIOUS_FAKES.has(digits) && !/^09(\d)\1{8}$/.test(digits);
}

// COD "how much will you pay with?": '' → null, "Exact amount" → 'exact', "₱1,000" → 1000, anything else → NaN.
export function parseChangeFor(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  if (/^exact/i.test(text)) return 'exact';
  const digits = text.replace(/[₱,\s]/g, '');
  return /^[1-9]\d*$/.test(digits) ? Number(digits) : NaN;
}

export function validateOrder(data) {
  const errors = {};
  const text = (field) => String(data[field] ?? '').trim();

  for (const [field, message] of Object.entries(REQUIRED_TEXT)) {
    if (!text(field)) errors[field] = message;
  }
  const name = text('name');
  if (name && (!NAME_CHARS.test(name) || (name.match(/\p{L}/gu) ?? []).length < 2)) {
    errors.name = 'Please enter a real name (letters only).';
  }
  for (const [field, [min, message]] of Object.entries(MIN_TEXT)) {
    if (text(field) && text(field).length < min) errors[field] = message;
  }
  if (!isValidPhone(data.phone)) errors.phone = 'Invalid number';
  if (!PAYMENT_METHODS.some((m) => m.id === data.payment)) errors.payment = 'Please choose how you will pay.';
  if (data.payment === 'cod' && Number.isNaN(parseChangeFor(data.changeFor))) {
    errors.changeFor = 'Enter an amount like 500, or choose Exact amount.';
  }
  for (const [field, max] of Object.entries(LIMITS)) {
    if (text(field).length > max) errors[field] = `Too long. Please keep it under ${max} characters.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
