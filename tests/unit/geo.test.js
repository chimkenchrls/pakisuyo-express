import { describe, it, expect, vi } from 'vitest';
import {
  mapsLink, isInside, isInsideSariaya, formatAddress, reverseGeocode, shouldAutofill, addressAfterLookup, SARIAYA_CENTER,
} from '../../src/lib/geo.js';

// A 2x2 square around (0,0) with a 1x1 hole, coords in GeoJSON [lng, lat] order.
const square = { type: 'Polygon', coordinates: [[[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]] };
const withHole = {
  type: 'Polygon',
  coordinates: [square.coordinates[0], [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5], [-0.5, -0.5]]],
};
const multi = { type: 'MultiPolygon', coordinates: [square.coordinates, [[[5, 5], [6, 5], [6, 6], [5, 6], [5, 5]]]] };

describe('isInside', () => {
  it('handles polygons, holes and multipolygons', () => {
    expect(isInside(0.9, 0.9, square)).toBe(true);
    expect(isInside(2, 2, square)).toBe(false);
    expect(isInside(0, 0, withHole)).toBe(false);
    expect(isInside(0.8, 0.8, withHole)).toBe(true);
    expect(isInside(5.5, 5.5, multi)).toBe(true);
    expect(isInside(3, 3, multi)).toBe(false);
  });

  it('rejects unsupported geometry', () => {
    expect(() => isInside(0, 0, { type: 'Point', coordinates: [0, 0] })).toThrow(/Unsupported/);
  });
});

describe('isInsideSariaya (real boundary)', () => {
  it('town proper is inside', () => {
    expect(isInsideSariaya(SARIAYA_CENTER.lat, SARIAYA_CENTER.lng)).toBe(true);
  });

  it.each([
    ['Lucena City proper', 13.9311, 121.6173],
    ['Tayabas City proper', 14.0259, 121.5927],
    ['Candelaria town proper', 13.9311, 121.4233],
    ['Manila', 14.5995, 120.9842],
  ])('%s is outside', (_name, lat, lng) => {
    expect(isInsideSariaya(lat, lng)).toBe(false);
  });
});

describe('mapsLink', () => {
  it('builds a tappable Google Maps link with 6 decimals', () => {
    expect(mapsLink(13.9634, 121.5263)).toBe('https://maps.google.com/?q=13.963400,121.526300');
  });
});

describe('formatAddress', () => {
  it('joins street, barangay and town', () => {
    expect(formatAddress({ address: { house_number: '12', road: 'Rizal St', village: 'Poblacion', town: 'Sariaya' } }))
      .toBe('12 Rizal St, Poblacion, Sariaya');
  });

  it('falls back through barangay-like keys and to display_name', () => {
    expect(formatAddress({ address: { suburb: 'Sampaloc 1', municipality: 'Sariaya' } })).toBe('Sampaloc 1, Sariaya');
    expect(formatAddress({ address: {}, display_name: 'Somewhere, Quezon' })).toBe('Somewhere, Quezon');
    expect(formatAddress(null)).toBeNull();
  });
});

describe('reverseGeocode', () => {
  it('queries Nominatim for the pin and formats the answer', async () => {
    const fetchFn = vi.fn(async () => ({ ok: true, json: async () => ({ address: { road: 'Rizal St', town: 'Sariaya' } }) }));
    await expect(reverseGeocode(13.96, 121.52, { fetchFn })).resolves.toBe('Rizal St, Sariaya');
    const [url] = fetchFn.mock.calls[0];
    expect(url).toContain('nominatim.openstreetmap.org/reverse');
    expect(url).toContain('lat=13.96');
    expect(url).toContain('lon=121.52');
  });

  it('returns null instead of throwing on HTTP errors or network failure', async () => {
    await expect(reverseGeocode(1, 1, { fetchFn: async () => ({ ok: false }) })).resolves.toBeNull();
    await expect(reverseGeocode(1, 1, { fetchFn: async () => { throw new Error('offline'); } })).resolves.toBeNull();
  });
});

describe('shouldAutofill', () => {
  it('fills an empty field', () => {
    expect(shouldAutofill('', null)).toBe(true);
    expect(shouldAutofill('   ', 'x')).toBe(true);
  });

  it('replaces its own previous suggestion', () => {
    expect(shouldAutofill('Rizal St, Sariaya', 'Rizal St, Sariaya')).toBe(true);
  });

  it('never overwrites what the customer typed', () => {
    expect(shouldAutofill('Purok 3, blue gate', null)).toBe(false);
    expect(shouldAutofill('Rizal St, Sariaya, 2nd floor', 'Rizal St, Sariaya')).toBe(false);
  });
});

describe('addressAfterLookup', () => {
  it('fills an empty field and remembers the suggestion', () => {
    expect(addressAfterLookup({ current: '', lastAutofilled: null, result: 'Rizal St, Sariaya' }))
      .toEqual({ value: 'Rizal St, Sariaya', lastAutofilled: 'Rizal St, Sariaya', lookupFailed: false });
  });

  it('keeps typed text when a lookup succeeds', () => {
    expect(addressAfterLookup({ current: 'Purok 3', lastAutofilled: null, result: 'Rizal St, Sariaya' }))
      .toEqual({ value: 'Purok 3', lastAutofilled: null, lookupFailed: false });
  });

  it('clears our own stale suggestion when the lookup for a moved pin fails', () => {
    expect(addressAfterLookup({ current: 'Rizal St, Sariaya', lastAutofilled: 'Rizal St, Sariaya', result: null }))
      .toEqual({ value: '', lastAutofilled: null, lookupFailed: true });
  });

  it('keeps typed text when a lookup fails', () => {
    expect(addressAfterLookup({ current: 'Purok 3', lastAutofilled: 'Rizal St, Sariaya', result: null }))
      .toEqual({ value: 'Purok 3', lastAutofilled: 'Rizal St, Sariaya', lookupFailed: true });
  });
});
