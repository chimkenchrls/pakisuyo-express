import { describe, it, expect } from 'vitest';
import {
  normaliseName, categoryFor, townFor, distanceMeters, dedupe, fromOsmElement, buildDirectory, searchStores, storeLabel,
} from '../../src/lib/directory.js';
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

const store = (id, name, town, category = 'fast-food', extra = {}) => ({ id, name, town, category, ...extra });

describe('buildDirectory (Review Focus 2)', () => {
  const featured = [store('jollibee-sariaya', 'Jollibee Sariaya', 'Sariaya'), store('dash', 'Dash Espresso', 'Sariaya', 'cafe')];
  const extras = [store('dash-extra', 'Dash Espresso', 'Sariaya', 'cafe'), store('nena', 'Aling Nena Bakery', 'Sariaya', 'bakery')];
  const osm = [
    store('osm-n1', 'Jollibee', 'Sariaya'),
    store('osm-n2', 'Jollibee', 'Lucena'),
    store('osm-n3', 'Libra Bakery', 'Lucena', 'bakery'),
    store('osm-n4', 'JOLLIBEE SARIAYA', 'Sariaya'),
  ];
  const out = buildDirectory(osm, extras, featured);

  it('puts featured stores first, flagged, in featured order', () => {
    expect(out.slice(0, 2).map((s) => [s.id, s.featured])).toEqual([['jollibee-sariaya', true], ['dash', true]]);
  });

  it('hides entries that duplicate a featured store in the same town', () => {
    const ids = out.map((s) => s.id);
    expect(ids).not.toContain('osm-n1');
    expect(ids).not.toContain('osm-n4');
    expect(ids).not.toContain('dash-extra');
  });

  it('keeps the same chain in another town, plus extras, sorted by name', () => {
    expect(out.slice(2).map((s) => [s.id, s.featured])).toEqual([['nena', false], ['osm-n2', false], ['osm-n3', false]]);
  });
});

describe('searchStores', () => {
  const list = [
    store('f1', "Dunkin' Sariaya", 'Sariaya', 'cafe', { featured: true }),
    store('a', 'Bakery Ni Lola', 'Sariaya', 'bakery', { featured: false }),
    store('b', 'Libra Bakery', 'Lucena', 'bakery', { featured: false }),
    store('c', 'The Bakeshop', 'Lucena', 'bakery', { featured: false }),
    store('d', 'Lugaw Queen', 'Lucena', 'fast-food', { featured: false }),
    store('e', 'Wings & Dims Corner', 'Sariaya', 'fast-food', { featured: false }),
  ];
  const ids = (opts) => searchStores(list, opts).map((s) => s.id);

  it('returns everything in list order with no query or filters', () => {
    expect(ids({})).toEqual(['f1', 'a', 'b', 'c', 'd', 'e']);
  });

  it('ranks: starts-with, then word-starts-with, then other substring', () => {
    expect(ids({ query: 'bak' })).toEqual(['a', 'b', 'c']);
    expect(ids({ query: 'akery' })).toEqual(['a', 'b']);
  });

  it('puts featured matches first', () => {
    const withFeaturedBakery = [...list, store('f2', 'Zebra Bakery', 'Sariaya', 'bakery', { featured: true })];
    expect(searchStores(withFeaturedBakery, { query: 'bak' })[0].id).toBe('f2');
  });

  it('matches across accents, apostrophes and & (Review Focus 1)', () => {
    expect(ids({ query: 'DÚNKIN’' })).toEqual(['f1']);
    expect(ids({ query: 'wings and dims' })).toEqual(['e']);
    expect(ids({ query: 'wings & dims' })).toEqual(['e']);
  });

  it('combines town and category filters with the query (AND)', () => {
    expect(ids({ town: 'Lucena' })).toEqual(['b', 'c', 'd']);
    expect(ids({ town: 'Lucena', category: 'bakery' })).toEqual(['b', 'c']);
    expect(ids({ town: 'Lucena', category: 'bakery', query: 'libra' })).toEqual(['b']);
    expect(ids({ town: 'Sariaya', query: 'lugaw' })).toEqual([]);
  });
});

describe('storeLabel (what a pick puts in the order)', () => {
  it('adds the town so branches in different towns are distinguishable', () => {
    expect(storeLabel(store('osm-n2', 'Jollibee', 'Lucena'))).toBe('Jollibee (Lucena)');
  });

  it('leaves names that already end with their town alone', () => {
    expect(storeLabel(store('jollibee-sariaya', 'Jollibee Sariaya', 'Sariaya'))).toBe('Jollibee Sariaya');
    expect(storeLabel(store('x', "Dunkin' SARIAYA", 'Sariaya'))).toBe("Dunkin' SARIAYA");
  });
});
