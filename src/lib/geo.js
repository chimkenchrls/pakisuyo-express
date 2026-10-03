import boundary from '../data/sariaya-boundary.json';

export const SARIAYA_CENTER = { lat: 13.9626, lng: 121.5262 };

export function mapsLink(lat, lng) {
  return `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

// Ray casting; ring coordinates are GeoJSON [lng, lat].
function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = (yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointInPolygon(lng, lat, rings) {
  if (!pointInRing(lng, lat, rings[0])) return false;
  return !rings.slice(1).some((hole) => pointInRing(lng, lat, hole));
}

export function isInside(lat, lng, geometry) {
  if (geometry.type === 'Polygon') return pointInPolygon(lng, lat, geometry.coordinates);
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.some((poly) => pointInPolygon(lng, lat, poly));
  throw new Error(`Unsupported geometry type: ${geometry.type}`);
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
