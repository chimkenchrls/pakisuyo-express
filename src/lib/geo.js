import boundary from '../data/sariaya-boundary.json';
import { isInside } from './polygon.js';

export { isInside };

export const SARIAYA_CENTER = { lat: 13.9626, lng: 121.5262 };

export function mapsLink(lat, lng) {
  return `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export function isInsideSariaya(lat, lng) {
  return isInside(lat, lng, boundary.geometry);
}

export function formatAddress(result) {
  if (!result) return null;
  const a = result.address ?? {};
  const street = [a.house_number, a.road].filter(Boolean).join(' ');
  const barangay = a.village ?? a.suburb ?? a.quarter ?? a.neighbourhood ?? a.hamlet;
  const town = a.town ?? a.municipality ?? a.city;
  const parts = [street, barangay, town].filter(Boolean);
  return parts.length ? parts.join(', ') : (result.display_name ?? null);
}

export async function reverseGeocode(lat, lng, { fetchFn = globalThis.fetch, signal } = {}) {
  const params = new URLSearchParams({ format: 'jsonv2', addressdetails: '1', zoom: '18', lat: String(lat), lon: String(lng) });
  try {
    const res = await fetchFn(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      signal,
      headers: { 'Accept-Language': 'en' },
    });
    if (!res.ok) return null;
    return formatAddress(await res.json());
  } catch {
    return null;
  }
}

// Only fill the address if it's empty or still holds our own last suggestion.
export function shouldAutofill(currentValue, lastAutofilled) {
  const current = currentValue.trim();
  return current === '' || current === (lastAutofilled ?? '').trim();
}

// Decides the address field after a lookup for the latest pin. Our own suggestion for an
// older pin is cleared on failure so it can't disagree with the pin; typed text always stays.
export function addressAfterLookup({ current, lastAutofilled, result }) {
  const ours = shouldAutofill(current, lastAutofilled);
  if (result) {
    return ours
      ? { value: result, lastAutofilled: result, lookupFailed: false }
      : { value: current, lastAutofilled, lookupFailed: false };
  }
  return ours
    ? { value: '', lastAutofilled: null, lookupFailed: true }
    : { value: current, lastAutofilled, lookupFailed: true };
}
