import { isInside } from './polygon.js';

// Lowercase, strip accents, "&" → "and", drop apostrophes, collapse everything else to single spaces.
export function normaliseName(value) {
  return String(value ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const AMENITY = { fast_food: 'fast-food', food_court: 'fast-food', restaurant: 'restaurant', cafe: 'cafe', ice_cream: 'cafe', bar: 'bar' };
const SHOP = { coffee: 'cafe', beverages: 'cafe', bakery: 'bakery', pastry: 'bakery', confectionery: 'bakery', deli: 'bakery' };

export function categoryFor(tags = {}) {
  return AMENITY[tags?.amenity] ?? SHOP[tags?.shop] ?? null;
}

export function townFor(lat, lng, towns) {
  return towns.find((t) => isInside(lat, lng, t.geometry))?.name ?? null;
}

export function distanceMeters(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

export function dedupe(stores, radiusM = 30) {
  const kept = [];
  for (const s of stores) {
    const key = normaliseName(s.name);
    const dup = kept.some((k) => normaliseName(k.name) === key && distanceMeters(k, s) <= radiusM);
    if (!dup) kept.push(s);
  }
  return kept;
}

const round5 = (n) => Math.round(n * 1e5) / 1e5;

export function fromOsmElement(el, towns) {
  const name = el.tags?.name?.trim();
  const category = categoryFor(el.tags);
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!name || !category || lat == null || lng == null) return null;
  const town = townFor(lat, lng, towns);
  if (!town) return null;
  return { id: `osm-${el.type[0]}${el.id}`, name, category, town, lat: round5(lat), lng: round5(lng) };
}
