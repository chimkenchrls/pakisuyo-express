// "Remember my details on this phone": contact fields + pin in localStorage, never sent anywhere.
export const STORAGE_KEY = 'pakisuyo:customer:v1';
const FIELDS = ['name', 'phone', 'address', 'landmark'];

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // some browsers throw just for touching localStorage when site data is blocked
  }
}

const validPin = (pin) => (Number.isFinite(pin?.lat) && Number.isFinite(pin?.lng) ? { lat: pin.lat, lng: pin.lng } : null);

export function loadDetails(storage = defaultStorage()) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const details = Object.fromEntries(FIELDS.map((f) => [f, typeof data?.[f] === 'string' ? data[f] : '']));
    return { ...details, pin: validPin(data?.pin) };
  } catch {
    return null;
  }
}

export function saveDetails(order, storage = defaultStorage()) {
  const details = Object.fromEntries(FIELDS.map((f) => [f, String(order[f] ?? '').trim()]));
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify({ ...details, pin: validPin(order.pin) }));
  } catch {
    // storage full or blocked: remembering is a convenience, never a reason to fail the order
  }
}

export function clearDetails(storage = defaultStorage()) {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
