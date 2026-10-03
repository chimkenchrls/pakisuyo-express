import { describe, it, expect } from 'vitest';
import { normaliseName, categoryFor, townFor, distanceMeters, dedupe, fromOsmElement } from '../../src/lib/directory.js';
import { TOWNS } from '../../src/data/towns.js';

describe('normaliseName (Review Focus 1)', () => {
  it.each([
    ["Dunkin' Sariaya", 'dunkin sariaya'],
    ['DÚNKIN’', 'dunkin'],
    ['Wings & Dims Corner', 'wings and dims corner'],
    ["  McDonald's   Lucena ", 'mcdonalds lucena'],
    ['Café-Bar (24/7)', 'cafe bar 24 7'],
  ])('%s → %s', (raw, expected) => {
    expect(normaliseName(raw)).toBe(expected);
  });

  it('treats null as empty', () => {
    expect(normaliseName(undefined)).toBe('');
  });
});

describe('categoryFor', () => {
  it.each([
    [{ amenity: 'fast_food' }, 'fast-food'],
    [{ amenity: 'food_court' }, 'fast-food'],
    [{ amenity: 'restaurant' }, 'restaurant'],
    [{ amenity: 'cafe' }, 'cafe'],
    [{ amenity: 'ice_cream' }, 'cafe'],
    [{ shop: 'coffee' }, 'cafe'],
    [{ shop: 'beverages' }, 'cafe'],
    [{ shop: 'bakery' }, 'bakery'],
    [{ shop: 'pastry' }, 'bakery'],
    [{ shop: 'confectionery' }, 'bakery'],
    [{ shop: 'deli' }, 'bakery'],
    [{ amenity: 'bar' }, 'bar'],
  ])('%o → %s', (tags, expected) => {
    expect(categoryFor(tags)).toBe(expected);
  });

  it('returns null for anything else', () => {
    expect(categoryFor({ amenity: 'pharmacy' })).toBeNull();
    expect(categoryFor(undefined)).toBeNull();
  });
});

describe('townFor (real boundaries)', () => {
  it.each([
    ['Sariaya town proper', 13.9626, 121.5262, 'Sariaya'],
    ['Lucena City proper', 13.9311, 121.6173, 'Lucena'],
    ['Tayabas City proper', 14.0259, 121.5927, null],
    ['Manila', 14.5995, 120.9842, null],
  ])('%s → %s', (_n, lat, lng, town) => {
    expect(townFor(lat, lng, TOWNS)).toBe(town);
  });
});

describe('distanceMeters', () => {
  it('is about 111 m per 0.001° of latitude', () => {
    expect(distanceMeters({ lat: 13.96, lng: 121.52 }, { lat: 13.961, lng: 121.52 })).toBeCloseTo(111, 0);
  });
});

describe('dedupe (Review Focus 2)', () => {
  const at = (name, lat, id) => ({ id, name, category: 'bakery', town: 'Sariaya', lat, lng: 121.52 });

  it('drops the same name pinned within 30 m, keeping the first', () => {
    const out = dedupe([at('Libra Bakery', 13.96, 'a'), at('LIBRA BAKERY', 13.96009, 'b')]); // ~10 m apart
    expect(out.map((s) => s.id)).toEqual(['a']);
  });

  it('keeps the same name 500 m apart (two branches)', () => {
    const out = dedupe([at('Libra Bakery', 13.96, 'a'), at('Libra Bakery', 13.9645, 'b')]);
    expect(out).toHaveLength(2);
  });

  it('keeps different names at the same spot', () => {
    expect(dedupe([at('Libra Bakery', 13.96, 'a'), at('Gemini Bakery', 13.96, 'b')])).toHaveLength(2);
  });
});

describe('fromOsmElement', () => {
  it('maps a named node inside Sariaya', () => {
    expect(fromOsmElement({ type: 'node', id: 42, lat: 13.96261, lon: 121.526234, tags: { name: ' Sariaya Bread House ', shop: 'bakery' } }, TOWNS))
      .toEqual({ id: 'osm-n42', name: 'Sariaya Bread House', category: 'bakery', town: 'Sariaya', lat: 13.96261, lng: 121.52623 });
  });

  it('uses the center of ways and relations', () => {
    expect(fromOsmElement({ type: 'way', id: 7, center: { lat: 13.9311, lon: 121.6173 }, tags: { name: 'X', amenity: 'cafe' } }, TOWNS))
      .toMatchObject({ id: 'osm-w7', town: 'Lucena' });
  });

  it('rejects unnamed, uncategorised or out-of-town places', () => {
    expect(fromOsmElement({ type: 'node', id: 1, lat: 13.96, lon: 121.52, tags: { amenity: 'cafe' } }, TOWNS)).toBeNull();
    expect(fromOsmElement({ type: 'node', id: 1, lat: 13.96, lon: 121.52, tags: { name: 'X', amenity: 'bank' } }, TOWNS)).toBeNull();
    expect(fromOsmElement({ type: 'node', id: 1, lat: 14.5995, lon: 120.9842, tags: { name: 'X', amenity: 'cafe' } }, TOWNS)).toBeNull();
  });
});
