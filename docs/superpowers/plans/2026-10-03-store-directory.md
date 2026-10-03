# Store Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a searchable "All stores" directory of every food and drink place in Sariaya and Lucena (from OpenStreetMap plus hand-added stores), cut Featured down to 5 stores, and turn the order form's store field into a search box over the directory.

**Architecture:** A one-off Node script downloads OSM places and writes them to `public/data/directory.json`. Pure functions in `src/lib/directory.js` (categorise, assign town, dedupe, merge, search) are shared by the script, the browser and the tests. The browser fetches the JSON lazily the first time the All stores sheet or the store field needs it. A tiny `src/data/directory-meta.json` holds the count for the "Browse all N stores" button so the big file stays off the first load.

**Tech Stack:** Vite, vanilla ES modules, Vitest, Playwright, OpenStreetMap Overpass + Nominatim (build-time only).

**Spec:** `docs/superpowers/specs/2026-10-03-store-directory-design.md`

## Global Constraints

- Featured stores, in this order: Jollibee Sariaya, McDonald's Sariaya, Dunkin' Sariaya, Wings & Dims Corner, Dash Espresso.
- Categories (id → label): `fast-food` Fast food, `restaurant` Restaurants, `cafe` Cafés, `bakery` Bakeries, `bar` Bars. OSM tag mapping exactly as spec §4.1.
- Towns: `Sariaya`, `Lucena`, decided by point-in-polygon against their municipal boundaries.
- Attribution text: "Store list © OpenStreetMap contributors · Not all stores are official Pakisuyo partners."
- The directory loads lazily. The first page load must not include the store list. Lighthouse mobile stays ≥ 90 for Performance and Accessibility.
- The sheet opens at `#stores`. Back, ✕ and Esc close it.
- All store pictures go through `storeImageHtml(store, cls)` only.
- Order data uses a single `store` string. The message line is `Store/s: {store}`.
- English copy. No backend, analytics or stored customer data. Don't deploy or push without the user's OK.
- Commit messages: plain, **no Claude attribution / Co-Authored-By lines.**

**Decision carried from the spec, refined here:** spec §4.2/§6.2 say `src/data/directory.json` with a dynamic `import()`. This plan puts the file at `public/data/directory.json` and loads it with `fetch()`, because Vite turns a dynamically imported JSON into a hashed JS chunk that e2e tests can't swap for a fixture or make fail on purpose (spec §8 tests 1–6 require that). The behaviour the spec asks for is unchanged: lazy load, a loading state and a failure fallback.

## Review Focus

1. **Accents, apostrophes, `&` and capitals in store names and queries.** "dunkin", "Dúnkin'" and "wings and dims" must find the right stores. Tests: Task 1 (`normaliseName`), Task 2 (`searchStores`).
2. **The same chain in both towns**, and duplicate OSM pins of one shop. Jollibee in Lucena must stay while OSM's Jollibee in Sariaya is hidden behind the featured card, and two pins of one bakery 10 m apart show once. Tests: Task 1 (`dedupe`), Task 2 (`buildDirectory`).
3. **The directory file fails to load** (offline, slow data, blocked). The sheet must say so and the order form must still send a typed store. Tests: Task 6 e2e (route abort).
4. **Keyboard and screen-reader users in the store combobox and the sheet.** Enter picks a suggestion without submitting the form, Esc closes, focus returns to the right place after closing, and Back closes the sheet. Tests: Task 6 and Task 7 e2e.
5. **Searching while typing on a phone.** Re-rendering must never replace the focused input (Android keyboards), and the result count must update. Tests: Task 6 e2e (type into the sheet search and assert focus stays and rows change).

---

## File map

```
scripts/fetch-boundary.mjs        MODIFY: town as CLI arg → src/data/<town>-boundary.json
scripts/fetch-stores.mjs          NEW: Overpass → public/data/directory.json + src/data/directory-meta.json
scripts/fetch-images.mjs          MODIFY: owner files may be png|jpg|jpeg|webp; add 2 new featured targets
src/data/lucena-boundary.json     NEW (generated)
src/data/towns.js                 NEW: TOWNS [{ name, geometry }]
src/data/categories.js            NEW: DIRECTORY_CATEGORIES, categoryById()
src/data/extra-stores.js          NEW: EXTRA_STORES
src/data/stores.js                MODIFY: 5 featured stores; CATEGORIES built from DIRECTORY_CATEGORIES
src/data/directory-meta.json      NEW (generated)
public/data/directory.json        NEW (generated)
src/lib/polygon.js                NEW: isInside() moved out of geo.js (JSON-free, Node-importable)
src/lib/geo.js                    MODIFY: import/re-export isInside from polygon.js
src/lib/directory.js              NEW: normaliseName, categoryFor, townFor, distanceMeters, dedupe, fromOsmElement, buildDirectory, searchStores
src/lib/directory-data.js         NEW: loadDirectory() (fetch + merge, cached, retry after failure)
src/lib/images.js                 MODIFY: storeLogoHtml → storeImageHtml (+ category tile)
src/lib/validate.js               MODIFY: store string replaces storeId/storeOther
src/lib/order-message.js          MODIFY: Store/s from data.store
src/sections/restaurants.js       MODIFY: "Featured stores", 5 cards, Browse button
src/sections/store-sheet.js       NEW: All stores sheet
src/sections/store-combobox.js    NEW: order-form store combobox
src/sections/order-form.js        MODIFY: combobox replaces select + Other
src/demo/screens.js               MODIFY: storeImageHtml
src/main.js                       MODIFY: mount sheet, wire Browse
src/styles/sections.css           MODIFY: browse button, sheet, rows, combobox
tests/unit/directory.test.js      NEW
tests/unit/*.test.js              MODIFY: validate, order-message, cart, images, demo-state
tests/e2e/directory.spec.js       NEW
tests/e2e/order.spec.js, page.spec.js   MODIFY
README.md                         MODIFY
```

---

### Task 1: Directory core (polygon split, towns, categories, normalise, dedupe)

**Files:**
- Create: `src/lib/polygon.js`, `src/data/categories.js`, `src/data/towns.js`, `src/data/lucena-boundary.json` (generated), `src/lib/directory.js`, `tests/unit/directory.test.js`
- Modify: `src/lib/geo.js`, `scripts/fetch-boundary.mjs`, `package.json` (no script change needed; usage note)

**Interfaces:**
- Produces:
  - `isInside(lat, lng, geometry): boolean`, now in `src/lib/polygon.js` and still exported from `geo.js`
  - `DIRECTORY_CATEGORIES: Array<{ id, label, singular, icon, tile }>`, `categoryById(id)`
  - `TOWNS: Array<{ name: 'Sariaya'|'Lucena', geometry }>`
  - `normaliseName(s): string`, `categoryFor(tags): string|null`, `townFor(lat, lng, towns): string|null`, `distanceMeters(a, b): number`, `dedupe(stores, radiusM = 30): Store[]`, `fromOsmElement(el, towns): DirStore|null`
  - `DirStore = { id, name, category, town, lat, lng }`

- [ ] **Step 1: Make `fetch-boundary.mjs` take the town as an argument**

Replace the top of `scripts/fetch-boundary.mjs` (the `params`/query part) and the output path, so it reads:

```js
// One-off: download a town's municipal boundary from OpenStreetMap (ODbL) and save it as GeoJSON.
// Usage: npm run fetch:boundary -- Lucena   (default: Sariaya)
import { writeFile } from 'node:fs/promises';

const town = process.argv[2] ?? 'Sariaya';
const params = new URLSearchParams({
  q: `${town}, Quezon, Philippines`,
  format: 'jsonv2',
  polygon_geojson: '1',
  polygon_threshold: '0.0005',
  limit: '5',
});
```

Change the `writeFile` target to:

```js
await writeFile(new URL(`../src/data/${town.toLowerCase()}-boundary.json`, import.meta.url), `${JSON.stringify(feature)}\n`);
```

Leave the rest (the fetch, the `administrative` + Polygon pick, and the feature properties) unchanged.

- [ ] **Step 2: Fetch Lucena**

Run: `npm run -s fetch:boundary -- Lucena`
Expected: `Saved Lucena, Quezon, … (Polygon)` (or MultiPolygon), and `src/data/lucena-boundary.json` exists. Also check Sariaya didn't change: `git diff --stat src/data/sariaya-boundary.json` shows no changes.

- [ ] **Step 3: Move `isInside` into `src/lib/polygon.js`**

Create `src/lib/polygon.js` with the existing `pointInRing`, `pointInPolygon` and `isInside` functions, moved from `geo.js` unchanged:

```js
// Ray casting; ring coordinates are GeoJSON [lng, lat]. No JSON imports, so Node scripts can use it.
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
```

In `src/lib/geo.js`, delete those three functions and add at the top, under the boundary import:

```js
import { isInside } from './polygon.js';

export { isInside };
```

Run: `npx vitest run tests/unit/geo.test.js`
Expected: PASS (unchanged behaviour; `isInside` tests still import it from `geo.js`).

- [ ] **Step 4: Create `src/data/categories.js` and `src/data/towns.js`**

```js
// src/data/categories.js
export const DIRECTORY_CATEGORIES = [
  { id: 'fast-food', label: 'Fast food', singular: 'Fast food', icon: '🍗', tile: '#FFE9E9' },
  { id: 'restaurant', label: 'Restaurants', singular: 'Restaurant', icon: '🍽️', tile: '#E8F3E8' },
  { id: 'cafe', label: 'Cafés', singular: 'Café', icon: '☕', tile: '#EAE6F7' },
  { id: 'bakery', label: 'Bakeries', singular: 'Bakery', icon: '🥖', tile: '#F3EBDD' },
  { id: 'bar', label: 'Bars', singular: 'Bar', icon: '🍺', tile: '#FFF3C4' },
];

export const categoryById = (id) => DIRECTORY_CATEGORIES.find((c) => c.id === id) ?? null;
```

```js
// src/data/towns.js
import sariaya from './sariaya-boundary.json';
import lucena from './lucena-boundary.json';

export const TOWNS = [
  { name: 'Sariaya', geometry: sariaya.geometry },
  { name: 'Lucena', geometry: lucena.geometry },
];
```

- [ ] **Step 5: Write the failing test `tests/unit/directory.test.js`**

```js
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
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run tests/unit/directory.test.js`
Expected: FAIL (`src/lib/directory.js` not found).

- [ ] **Step 7: Implement `src/lib/directory.js` (core part)**

```js
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
```

- [ ] **Step 8: Run it to verify it passes**

Run: `npx vitest run tests/unit/directory.test.js tests/unit/geo.test.js`
Expected: PASS. If "Lucena City proper → Lucena" fails, open `src/data/lucena-boundary.json`, check `properties.name` is Lucena City and re-run Step 2. Don't change the test coordinates.

- [ ] **Step 9: Commit**

```bash
git add scripts/fetch-boundary.mjs src/data/lucena-boundary.json src/data/categories.js src/data/towns.js src/lib/polygon.js src/lib/geo.js src/lib/directory.js tests/unit/directory.test.js
git commit -m "feat: add directory core — towns, categories, name matching and dedupe"
```

---

### Task 2: Merge and search

**Files:**
- Create: `src/data/extra-stores.js`
- Modify: `src/lib/directory.js`, `tests/unit/directory.test.js`

**Interfaces:**
- Consumes: `normaliseName` (Task 1).
- Produces:
  - `EXTRA_STORES: DirStore-like[]` (`{ id, name, category, town }`)
  - `buildDirectory(osmStores, extraStores, featuredStores): Array<Store & { featured: boolean }>`
  - `searchStores(list, { query = '', town = 'all', category = 'all' } = {}): Store[]`

- [ ] **Step 1: Create `src/data/extra-stores.js`**

```js
// Stores OpenStreetMap doesn't know about. Add more here; no script re-run needed.
export const EXTRA_STORES = [
  { id: 'wings-dims-sariaya', name: 'Wings & Dims Corner', category: 'fast-food', town: 'Sariaya' },
  { id: 'dash-espresso-sariaya', name: 'Dash Espresso', category: 'cafe', town: 'Sariaya' },
];
```

- [ ] **Step 2: Append failing tests to `tests/unit/directory.test.js`**

Change the import line to:

```js
import {
  normaliseName, categoryFor, townFor, distanceMeters, dedupe, fromOsmElement, buildDirectory, searchStores,
} from '../../src/lib/directory.js';
```

Append:

```js
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
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run tests/unit/directory.test.js`
Expected: FAIL (`buildDirectory is not a function`).

- [ ] **Step 4: Append to `src/lib/directory.js`**

```js
// A featured store's name, with and without its trailing town ("Jollibee Sariaya" → also "jollibee").
function nameKeys(s) {
  const name = normaliseName(s.name);
  const town = normaliseName(s.town);
  return name.endsWith(` ${town}`) ? [name, name.slice(0, -town.length - 1)] : [name];
}

export function buildDirectory(osmStores, extraStores, featuredStores) {
  const taken = new Set(featuredStores.flatMap((s) => nameKeys(s).map((k) => `${k}|${s.town}`)));
  const rest = [...extraStores, ...osmStores]
    .filter((s) => !nameKeys(s).some((k) => taken.has(`${k}|${s.town}`)))
    .sort((a, b) => a.name.localeCompare(b.name));
  return [
    ...featuredStores.map((s) => ({ ...s, featured: true })),
    ...rest.map((s) => ({ ...s, featured: false })),
  ];
}

export function searchStores(list, { query = '', town = 'all', category = 'all' } = {}) {
  const q = normaliseName(query);
  const hits = [];
  list.forEach((s, index) => {
    if (town !== 'all' && s.town !== town) return;
    if (category !== 'all' && s.category !== category) return;
    if (!q) {
      hits.push({ s, rank: 0, index });
      return;
    }
    const name = normaliseName(s.name);
    const at = name.indexOf(q);
    if (at < 0) return;
    const rank = s.featured ? 0 : at === 0 ? 1 : name.includes(` ${q}`) ? 2 : 3;
    hits.push({ s, rank, index });
  });
  hits.sort((a, b) => a.rank - b.rank || (q ? a.s.name.localeCompare(b.s.name) : a.index - b.index));
  return hits.map((h) => h.s);
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npx vitest run tests/unit/directory.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/extra-stores.js src/lib/directory.js tests/unit/directory.test.js
git commit -m "feat: merge OSM and hand-added stores and rank directory search"
```

---

### Task 3: Featured stores, categories and store images

**Files:**
- Modify: `src/data/stores.js`, `src/lib/images.js`, `scripts/fetch-images.mjs`, `src/sections/restaurants.js` (rename call only), `src/demo/screens.js` (rename call only), `tests/unit/images.test.js`, `tests/unit/cart.test.js`, `tests/unit/demo-state.test.js`, `tests/e2e/page.spec.js`
- Add to git: `public/assets/stores/wings-dims-sariaya/logo.jpg`, `public/assets/stores/dash-espresso-sariaya/logo.jpg` (already on disk)

**Interfaces:**
- Consumes: `DIRECTORY_CATEGORIES`, `categoryById` (Task 1).
- Produces:
  - `STORES` is the 5 featured stores. Their `category` ids come from `DIRECTORY_CATEGORIES`.
  - `CATEGORIES = [{ id: 'all', label: 'All' }, ...DIRECTORY_CATEGORIES ids/labels]`
  - `storeImageHtml(store, cls = 'store-logo'): string`, which replaces `storeLogoHtml`
  - `categoryTile(categoryId, cls): string`

- [ ] **Step 1: Update the failing unit tests first**

In `tests/unit/images.test.js`, replace the two dynamic imports and the tests:

```js
const { initialsTile, storeImageHtml, itemImageHtml, categoryTile } = await import('../../src/lib/images.js');
const { getStore } = await import('../../src/data/stores.js');

describe('images', () => {
  it('initials tile uses the store colours and hides from screen readers', () => {
    const html = initialsTile({ initials: 'BA', color: '#3E7B27', textColor: '#FFFFFF' }, 'x');
    expect(html).toContain('>BA<');
    expect(html).toContain('background:#3E7B27');
    expect(html).toContain('aria-hidden="true"');
  });

  it('uses the manifest logo with a fallback attached', () => {
    const html = storeImageHtml(getStore('jollibee-sariaya'), 'logo');
    expect(html).toContain('src="/assets/stores/jollibee-sariaya/logo.png"');
    expect(html).toContain('alt="Jollibee Sariaya logo"');
    expect(html).toContain('data-fallback="&lt;span');
  });

  it('falls back to initials for featured stores without a logo', () => {
    expect(storeImageHtml(getStore('mcdonalds-sariaya'), 'logo')).toContain('>MC<');
  });

  it('gives directory stores a category icon tile', () => {
    const html = storeImageHtml({ id: 'osm-n1', name: 'Libra Bakery', category: 'bakery', town: 'Lucena' }, 'row');
    expect(html).toContain('🥖');
    expect(html).toContain('background:#F3EBDD');
    expect(categoryTile('unknown', 'x')).toContain('🍴');
  });

  it('menu items use the manifest photo or an emoji tile', () => {
    const [chickenjoy, , yumburger] = getStore('jollibee-sariaya').menu;
    expect(itemImageHtml(yumburger, 'i')).toContain('src="/assets/y.png"');
    expect(itemImageHtml(chickenjoy, 'i')).toContain('🍗');
  });
});
```

In `tests/unit/cart.test.js`, replace `const contis = getStore('contis'); // out of town` with:

```js
const outOfTown = { ...getStore('jollibee-sariaya'), id: 'fixture-lucena', town: 'Lucena' };
```

and replace `totals(cart, contis, { promoApplied: true })` with `totals(cart, outOfTown, { promoApplied: true })`.

In `tests/unit/demo-state.test.js`, replace the `visibleStores` test body with:

```js
    const base = { ...initialState(), screen: 'home' };
    expect(visibleStores({ ...base, category: 'cafe' }).map((s) => s.id)).toEqual(['dunkin-sariaya', 'dash-espresso-sariaya']);
    expect(visibleStores({ ...base, query: 'spaghetti' }).map((s) => s.id)).toEqual(['jollibee-sariaya']);
    expect(visibleStores({ ...base, query: '  DUNKIN ' }).map((s) => s.id)).toEqual(['dunkin-sariaya']);
    expect(visibleStores({ ...base, query: 'zzz' })).toEqual([]);
```

In `tests/e2e/page.spec.js`, replace the "lists the featured restaurants" test with:

```js
  test('shows exactly the 5 featured stores', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('#restaurants .store-card');
    await expect(cards).toHaveCount(5);
    await expect(cards).toContainText(['Jollibee Sariaya', "McDonald's Sariaya", "Dunkin' Sariaya", 'Wings & Dims Corner', 'Dash Espresso']);
  });
```

Run: `npx vitest run tests/unit/images.test.js tests/unit/demo-state.test.js tests/unit/cart.test.js`
Expected: FAIL (`storeImageHtml`/`categoryTile` not exported; `dash-espresso-sariaya` missing).

- [ ] **Step 2: Replace `STORES`/`CATEGORIES` in `src/data/stores.js`**

Add at the top: `import { DIRECTORY_CATEGORIES } from './categories.js';`

Replace the `CATEGORIES` constant and the whole `STORES` array (keep `HOME_TOWN`, `SARIAYA_DELIVERY_FEE`, `PROMO`, `COVERAGE` and `getStore` unchanged) with:

```js
export const CATEGORIES = [{ id: 'all', label: 'All' }, ...DIRECTORY_CATEGORIES.map(({ id, label }) => ({ id, label }))];

// The 5 featured stores, in display order. Menu prices are samples for the demo only.
export const STORES = [
  {
    id: 'jollibee-sariaya', name: 'Jollibee Sariaya', category: 'fast-food', categoryLabel: 'Fast food',
    town: 'Sariaya', eta: '20–30 min', initials: 'JB', color: '#E4002B', textColor: '#FFFFFF', emoji: '🍗',
    menu: [
      { id: 'chickenjoy-rice', name: '1-pc Chickenjoy w/ Rice', price: 99, emoji: '🍗' },
      { id: 'jolly-spaghetti', name: 'Jolly Spaghetti', price: 70, emoji: '🍝' },
      { id: 'yumburger', name: 'Yumburger', price: 45, emoji: '🍔' },
      { id: 'coke-float', name: 'Coke Float', price: 59, emoji: '🥤' },
    ],
  },
  {
    id: 'mcdonalds-sariaya', name: "McDonald's Sariaya", category: 'fast-food', categoryLabel: 'Fast food',
    town: 'Sariaya', eta: '20–30 min', initials: 'MC', color: '#DA291C', textColor: '#FFC72C', emoji: '🍟', menu: [],
  },
  {
    id: 'dunkin-sariaya', name: "Dunkin' Sariaya", category: 'cafe', categoryLabel: 'Donuts & coffee',
    town: 'Sariaya', eta: '15–25 min', initials: 'DD', color: '#FF671F', textColor: '#FFFFFF', emoji: '🍩', menu: [],
  },
  {
    id: 'wings-dims-sariaya', name: 'Wings & Dims Corner', category: 'fast-food', categoryLabel: 'Wings & dimsum',
    town: 'Sariaya', eta: '20–30 min', initials: 'WD', color: '#E31B23', textColor: '#FFFFFF', emoji: '🍗', menu: [],
  },
  {
    id: 'dash-espresso-sariaya', name: 'Dash Espresso', category: 'cafe', categoryLabel: 'Coffee',
    town: 'Sariaya', eta: '15–25 min', initials: 'DE', color: '#141414', textColor: '#FFFFFF', emoji: '☕', menu: [],
  },
];
```

- [ ] **Step 3: Update `src/lib/images.js`**

Add the import `import { categoryById } from '../data/categories.js';` and replace `storeLogoHtml` with:

```js
export function categoryTile(categoryId, cls) {
  const c = categoryById(categoryId);
  return `<span class="${cls} tile" style="background:${c?.tile ?? '#F6F6F6'}" aria-hidden="true">${c?.icon ?? '🍴'}</span>`;
}

// The only place that decides a store's picture (spec §6.4). Google Places photos would plug in here.
export function storeImageHtml(store, cls = 'store-logo') {
  const fallback = store.initials ? initialsTile(store, cls) : categoryTile(store.category, cls);
  const src = manifest.stores?.[store.id];
  return src ? imgWithFallback(src, `${store.name} logo`, cls, fallback) : fallback;
}
```

Then replace every `storeLogoHtml(` with `storeImageHtml(` in `src/sections/restaurants.js` and `src/demo/screens.js` (imports included):

Run: `grep -rn storeLogoHtml src tests`
Expected: no output.

- [ ] **Step 4: Let `fetch-images.mjs` pick up the owner's JPG logos**

In `scripts/fetch-images.mjs`:
- Delete the `max-mango` target line.
- Add two targets after the Dunkin' line:
  ```js
  { kind: 'stores', id: 'wings-dims-sariaya', file: 'stores/wings-dims-sariaya/logo' },
  { kind: 'stores', id: 'dash-espresso-sariaya', file: 'stores/dash-espresso-sariaya/logo' },
  ```
- Add this helper near `exists`:
  ```js
  async function findOwnFile(file) {
    for (const ext of ['png', 'jpg', 'jpeg', 'webp']) if (await exists(new URL(`${file}.${ext}`, ROOT))) return ext;
    return null;
  }
  ```
- Replace the owner-file block at the top of the loop (the `const own = new URL(`${t.file}.png`, ROOT)` … `continue; }` part) with this rule — **a target with neither `title` nor `search` is owner-supplied**:
  ```js
  if (!t.title && !t.search) {
    const ownExt = await findOwnFile(t.file);
    if (ownExt) {
      manifest[t.kind][t.id] = `/assets/${t.file}.${ownExt}`;
      credits.push(`- \`${t.file}.${ownExt}\` — supplied by the project owner (private pitch only)`);
      console.log(`✓ ${t.id}: using owner-supplied file`);
    }
    continue;
  }
  ```
  `title`/`search` targets now always download fresh.

Run: `npm run -s fetch:images`
Expected: ✓ lines for jollibee, mcdonalds, dunkin, wings-dims ("owner-supplied"), dash-espresso ("owner-supplied"), chickenjoy-rice and jolly-spaghetti. `src/data/images.json` lists both new logos as `.jpg`. `public/assets/CREDITS.md` has both "supplied by the project owner" lines.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (all files). Then `npx playwright test tests/e2e/page.spec.js tests/e2e/demo.spec.js`. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/stores.js src/lib/images.js scripts/fetch-images.mjs src/data/images.json public/assets src/sections/restaurants.js src/demo/screens.js tests/unit tests/e2e/page.spec.js
git commit -m "feat: cut featured to 5 stores and add category tiles for directory images"
```

---

### Task 4: Fetch the store list

**Files:**
- Create: `scripts/fetch-stores.mjs`, `public/data/directory.json` (generated), `src/data/directory-meta.json` (generated), `src/lib/directory-data.js`, `tests/unit/directory-data.test.js`
- Modify: `package.json` (add `fetch:stores`)

**Interfaces:**
- Consumes: `fromOsmElement`, `dedupe`, `buildDirectory` (Tasks 1–2); `STORES` (Task 3); `EXTRA_STORES` (Task 2).
- Produces:
  - `public/data/directory.json`: `{ meta: { source, fetched, count }, stores: DirStore[] }`
  - `src/data/directory-meta.json`: `{ count: number, fetched: string }`
  - `loadDirectory({ fetchFn? }?) → Promise<Store[]>`. The merged list is cached; after a failure the next call retries.
  - `DIRECTORY_URL = '/data/directory.json'`

- [ ] **Step 1: Write the failing test `tests/unit/directory-data.test.js`**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

let loadDirectory;
beforeEach(async () => {
  vi.resetModules();
  ({ loadDirectory } = await import('../../src/lib/directory-data.js'));
});

const ok = (stores) => vi.fn(async () => ({ ok: true, json: async () => ({ meta: {}, stores }) }));

describe('loadDirectory', () => {
  it('fetches the directory once and merges featured + extras', async () => {
    const fetchFn = ok([{ id: 'osm-n1', name: 'Libra Bakery', category: 'bakery', town: 'Lucena' }]);
    const list = await loadDirectory({ fetchFn });
    await loadDirectory({ fetchFn });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith('/data/directory.json');
    expect(list[0]).toMatchObject({ id: 'jollibee-sariaya', featured: true });
    expect(list.map((s) => s.id)).toContain('osm-n1');
  });

  it('rejects on failure and retries on the next call (Review Focus 3)', async () => {
    const failing = vi.fn(async () => ({ ok: false, status: 503 }));
    await expect(loadDirectory({ fetchFn: failing })).rejects.toThrow('503');
    const list = await loadDirectory({ fetchFn: ok([]) });
    expect(list).toHaveLength(5); // featured only (extras duplicate featured)
  });
});
```

Run: `npx vitest run tests/unit/directory-data.test.js`
Expected: FAIL (module not found).

- [ ] **Step 2: Implement `src/lib/directory-data.js`**

```js
import { buildDirectory } from './directory.js';
import { STORES } from '../data/stores.js';
import { EXTRA_STORES } from '../data/extra-stores.js';

export const DIRECTORY_URL = '/data/directory.json';

let cache;

// Loaded on first need (spec §6.2) so the first page load stays light. A failed load is retried next time.
export function loadDirectory({ fetchFn = globalThis.fetch } = {}) {
  cache ??= fetchFn(DIRECTORY_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`Directory failed to load (HTTP ${res.status})`);
      return res.json();
    })
    .then((data) => buildDirectory(data.stores, EXTRA_STORES, STORES))
    .catch((err) => {
      cache = undefined;
      throw err;
    });
  return cache;
}
```

Run: `npx vitest run tests/unit/directory-data.test.js`
Expected: PASS.

- [ ] **Step 3: Create `scripts/fetch-stores.mjs`**

```js
// One-off: download every named food & drink place in Sariaya and Lucena from OpenStreetMap (ODbL).
// Writes public/data/directory.json (loaded lazily by the page) and src/data/directory-meta.json (count for the button).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fromOsmElement, dedupe, buildDirectory } from '../src/lib/directory.js';
import { STORES } from '../src/data/stores.js';
import { EXTRA_STORES } from '../src/data/extra-stores.js';

const UA = 'pakisuyo-express-landing/0.1 (one-off build script)';
const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const towns = [
  { name: 'Sariaya', geometry: (await readJson('../src/data/sariaya-boundary.json')).geometry },
  { name: 'Lucena', geometry: (await readJson('../src/data/lucena-boundary.json')).geometry },
];

function bbox(geometries) {
  const points = geometries.flatMap((g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).flat(1).flat(1));
  const lats = points.map((p) => p[1]);
  const lngs = points.map((p) => p[0]);
  return [Math.min(...lats), Math.min(...lngs), Math.max(...lats), Math.max(...lngs)].map((n) => n.toFixed(4)).join(',');
}

const box = bbox(towns.map((t) => t.geometry));
const query = `[out:json][timeout:90];(`
  + `nwr["amenity"~"^(restaurant|fast_food|cafe|bar|ice_cream|food_court)$"]["name"](${box});`
  + `nwr["shop"~"^(bakery|beverages|coffee|pastry|confectionery|deli)$"]["name"](${box});`
  + ');out tags center;';

async function overpass(q) {
  for (const url of SERVERS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ data: q }),
      });
      if (res.ok && (res.headers.get('content-type') ?? '').includes('json')) return (await res.json()).elements;
      console.warn(`${url} → HTTP ${res.status}`);
    } catch (err) {
      console.warn(`${url} → ${err.message}`);
    }
  }
  throw new Error('No Overpass server answered — try again in a few minutes.');
}

const elements = await overpass(query);
const stores = dedupe(elements.map((el) => fromOsmElement(el, towns)).filter(Boolean))
  .sort((a, b) => a.town.localeCompare(b.town) || a.name.localeCompare(b.name));
const fetched = new Date().toISOString().slice(0, 10);

await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/data/directory.json', import.meta.url),
  `${JSON.stringify({ meta: { source: '© OpenStreetMap contributors (ODbL)', fetched, count: stores.length }, stores })}\n`);

const merged = buildDirectory(stores, EXTRA_STORES, STORES);
await writeFile(new URL('../src/data/directory-meta.json', import.meta.url), `${JSON.stringify({ count: merged.length, fetched })}\n`);

const byTown = Object.groupBy(stores, (s) => s.town);
console.log(`Saved ${stores.length} OSM stores (${Object.entries(byTown).map(([t, l]) => `${t}: ${l.length}`).join(', ')}) from ${elements.length} raw elements.`);
console.log(`Merged directory (featured + extras + OSM, duplicates removed): ${merged.length}`);
```

Add to `package.json` scripts: `"fetch:stores": "node scripts/fetch-stores.mjs",`

- [ ] **Step 4: Run it and sanity-check the data**

Run: `npm run -s fetch:stores`
Expected: two lines like `Saved 2xx OSM stores (Lucena: …, Sariaya: …) from …` and `Merged directory …: N`. Then check:

```bash
node -e "const d=require('./public/data/directory.json');const c={};for(const s of d.stores)c[s.category]=(c[s.category]||0)+1;console.log(d.meta, c);console.log(d.stores.filter(s=>/jollibee|lugaw|libra|bread house/i.test(s.name)).map(s=>s.name+' · '+s.town).join('\n'))"
ls -la public/data/directory.json
```
Expected: categories split across the 5 ids. Known places land in the right town (e.g. Lugaw Queen and Libra Bakery in Lucena, Sariaya Bread House in Sariaya). The file is well under 100 KB. If every Overpass server is busy, wait a few minutes and re-run; never hand-edit the JSON.

- [ ] **Step 5: Commit**

```bash
git add scripts/fetch-stores.mjs public/data/directory.json src/data/directory-meta.json src/lib/directory-data.js tests/unit/directory-data.test.js package.json
git commit -m "feat: fetch Sariaya and Lucena food places from OpenStreetMap"
```

---

### Task 5: Order data uses a single store string

**Files:**
- Modify: `src/lib/validate.js`, `src/lib/order-message.js`, `tests/unit/validate.test.js`, `tests/unit/order-message.test.js`

**Interfaces:**
- Produces: `OrderFormData = { name, phone, address, landmark, store, orderList, payment, notes, pin }`. `FIELD_ORDER = ['name','phone','address','landmark','store','orderList','payment']`. `storeDisplayName` is removed.

- [ ] **Step 1: Update the tests first**

In `tests/unit/validate.test.js`:
- In `VALID`, replace `storeId: 'jollibee-sariaya',` and `storeOther: '',` with `store: 'Jollibee Sariaya',`.
- Change the `it.each(['name', 'address', 'landmark', 'orderList'])` list to `['name', 'address', 'landmark', 'store', 'orderList']`.
- Delete the two tests `'requires a store'` and `'requires a typed store name when "other" is chosen'`, and add:
  ```js
  it('asks the customer to choose or type a store', () => {
    expect(validateOrder({ ...VALID, store: '' }).errors.store).toBe('Please choose or type a store.');
  });
  ```

In `tests/unit/order-message.test.js`:
- In `BASE`, replace `storeId: 'jollibee-sariaya',` and `storeOther: '',` with `store: ' Jollibee Sariaya ',`.
- Replace the last test with:
  ```js
  it('uses the store exactly as picked or typed (trimmed) and long payment labels', () => {
    const msg = buildOrderMessage({ ...BASE, store: '  Aling Nena Bakery ', payment: 'card' });
    expect(msg).toContain('Store/s: Aling Nena Bakery');
    expect(msg).toContain('Payment: Credit/Debit Card');
  });
  ```

Run: `npx vitest run tests/unit/validate.test.js tests/unit/order-message.test.js`
Expected: FAIL (store errors and message line wrong).

- [ ] **Step 2: Update `src/lib/validate.js`**

- `FIELD_ORDER` becomes `['name', 'phone', 'address', 'landmark', 'store', 'orderList', 'payment']`.
- Add `store: 'Please choose or type a store.',` to `REQUIRED_TEXT`, between `landmark` and `orderList`.
- Delete these two lines from `validateOrder`:
  ```js
  if (!text('storeId')) errors.storeId = 'Please choose a store.';
  else if (data.storeId === 'other' && !text('storeOther')) errors.storeOther = 'Please type the store name.';
  ```

- [ ] **Step 3: Update `src/lib/order-message.js`**

Delete the `getStore` import and the `storeDisplayName` function. Replace the store line with:

```js
    `Store/s: ${data.store.trim()}`,
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run tests/unit/validate.test.js tests/unit/order-message.test.js && grep -rn "storeId\|storeOther\|storeDisplayName" src/lib`
Expected: PASS, and grep prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validate.js src/lib/order-message.js tests/unit/validate.test.js tests/unit/order-message.test.js
git commit -m "refactor: order data carries the store as typed or picked"
```

(The order form still renders the old select until Task 7; e2e order tests are updated there.)

---

### Task 6: Featured section "Browse all" + All stores sheet

**Files:**
- Create: `src/sections/store-sheet.js`, `tests/e2e/directory.spec.js`, `tests/e2e/fixtures/directory.json`
- Modify: `src/sections/restaurants.js`, `src/main.js`, `src/styles/sections.css`

**Interfaces:**
- Consumes: `loadDirectory` (Task 4), `searchStores` (Task 2), `DIRECTORY_CATEGORIES`, `categoryById` (Task 1), `storeImageHtml` (Task 3), `SELECT_STORE_EVENT`, `escapeHtml`, `directory-meta.json`.
- Produces:
  - `mountStoreSheet({ returnFocus: () => HTMLElement|null }) → { openFromPage(): void }`
  - `renderRestaurants(el, { onBrowse })`
  - `SELECT_STORE_EVENT` detail is now `{ name: string, focus?: 'orderList' }`

- [ ] **Step 1: Create the e2e fixture `tests/e2e/fixtures/directory.json`**

```json
{
  "meta": { "source": "fixture", "fetched": "2026-10-03", "count": 6 },
  "stores": [
    { "id": "osm-n1", "name": "Jollibee", "category": "fast-food", "town": "Sariaya", "lat": 13.96, "lng": 121.52 },
    { "id": "osm-n2", "name": "Jollibee", "category": "fast-food", "town": "Lucena", "lat": 13.93, "lng": 121.61 },
    { "id": "osm-n3", "name": "Sariaya Bread House", "category": "bakery", "town": "Sariaya", "lat": 13.96, "lng": 121.52 },
    { "id": "osm-n4", "name": "Don Lauro's Restaurant", "category": "restaurant", "town": "Sariaya", "lat": 13.96, "lng": 121.52 },
    { "id": "osm-n5", "name": "Libra Bakery", "category": "bakery", "town": "Lucena", "lat": 13.93, "lng": 121.61 },
    { "id": "osm-n6", "name": "Lugaw Queen", "category": "fast-food", "town": "Lucena", "lat": 13.93, "lng": 121.61 }
  ]
}
```

- [ ] **Step 2: Write the failing e2e test `tests/e2e/directory.spec.js`**

```js
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const FIXTURE = readFileSync(new URL('./fixtures/directory.json', import.meta.url), 'utf8');

test.beforeEach(async ({ page }) => {
  await page.route('**/data/directory.json', (r) => r.fulfill({ contentType: 'application/json', body: FIXTURE }));
});

const rows = (page) => page.locator('.dir-row');

test('Browse all opens the sheet at #stores with search focused', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Browse all \d+ stores/ }).click();
  const sheet = page.getByRole('dialog', { name: 'All stores' });
  await expect(sheet).toBeVisible();
  await expect(page).toHaveURL(/#stores$/);
  await expect(sheet.getByLabel('Search stores')).toBeFocused();
  // featured 5 + OSM kept (Jollibee Lucena, Sariaya Bread House, Don Lauro's, Libra Bakery, Lugaw Queen) = 10;
  // OSM "Jollibee" in Sariaya and both extras are hidden behind featured cards.
  await expect(rows(page)).toHaveCount(10);
  await expect(sheet.getByText('10 stores')).toBeVisible();
});
```

Continue the file:

```js
test('filters by town and type, keeps focus while typing, and orders from a row', async ({ page }) => {
  await page.goto('/#stores');
  const sheet = page.getByRole('dialog', { name: 'All stores' });
  await sheet.getByLabel('Town').selectOption('Lucena');
  await expect(rows(page)).toHaveCount(3);
  for (const meta of await page.locator('.dir-row__meta').allTextContents()) expect(meta).toContain('Lucena');

  await sheet.getByRole('button', { name: 'Bakeries' }).click();
  await expect(rows(page)).toHaveCount(1);
  await expect(page.locator('.dir-row__meta')).toHaveText(['Bakery · Lucena']);

  await sheet.getByRole('button', { name: 'All', exact: true }).click();
  const search = sheet.getByLabel('Search stores');
  await search.pressSequentially('lug');
  await expect(search).toBeFocused(); // Review Focus 5
  await expect(rows(page)).toHaveCount(1);
  await expect(sheet.getByText('1 store', { exact: true })).toBeVisible();

  await sheet.getByRole('button', { name: 'Order from Lugaw Queen' }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByRole('combobox', { name: /Store/ })).toHaveValue('Lugaw Queen');
  await expect(page.getByLabel('Order List')).toBeFocused();
});

test('shows a helpful empty state', async ({ page }) => {
  await page.goto('/#stores');
  await page.getByLabel('Search stores').fill('zzzz');
  await expect(page.getByText(/No stores match “zzzz”/)).toBeVisible();
});

test('Back button and Esc close the sheet and return focus (Review Focus 4)', async ({ page }) => {
  await page.goto('/');
  const browse = page.getByRole('button', { name: /Browse all \d+ stores/ });
  await browse.click();
  await expect(page.getByRole('dialog', { name: 'All stores' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'All stores' })).toBeHidden();
  await expect(browse).toBeFocused();

  await browse.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'All stores' })).toBeHidden();
  await expect(page).not.toHaveURL(/#stores/);
});

test('says so when the store list cannot load (Review Focus 3)', async ({ page }) => {
  await page.unroute('**/data/directory.json');
  await page.route('**/data/directory.json', (r) => r.abort());
  await page.goto('/#stores');
  await expect(page.getByText("Couldn't load the store list — type any store in the order form.")).toBeVisible();
});
```

Run: `npx playwright test tests/e2e/directory.spec.js`
Expected: FAIL (no Browse button / no dialog).

- [ ] **Step 3: Create `src/sections/store-sheet.js`**

```js
import { DIRECTORY_CATEGORIES, categoryById } from '../data/categories.js';
import { SELECT_STORE_EVENT } from '../data/contact.js';
import { searchStores } from '../lib/directory.js';
import { loadDirectory } from '../lib/directory-data.js';
import { storeImageHtml } from '../lib/images.js';
import { escapeHtml } from '../lib/html.js';

const PAGE = 50;
const CHIPS = [{ id: 'all', label: 'All' }, ...DIRECTORY_CATEGORIES];

const rowHtml = (s) => `
  <li class="dir-row">
    ${storeImageHtml(s, 'dir-row__img')}
    <div class="dir-row__text">
      <b class="dir-row__name">${escapeHtml(s.name)}${s.featured ? ' <span class="badge">Featured</span>' : ''}</b>
      <span class="dir-row__meta">${escapeHtml(s.featured ? s.categoryLabel : categoryById(s.category)?.singular ?? '')} · ${escapeHtml(s.town)}</span>
    </div>
    <button type="button" class="dir-row__order" data-name="${escapeHtml(s.name)}" aria-label="Order from ${escapeHtml(s.name)}">Order →</button>
  </li>`;

export function mountStoreSheet({ returnFocus }) {
  const sheet = document.createElement('div');
  sheet.className = 'store-sheet';
  sheet.hidden = true;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-labelledby', 'store-sheet-title');
  sheet.innerHTML = `
    <div class="store-sheet__head">
      <div class="store-sheet__title-row">
        <h2 id="store-sheet-title" class="store-sheet__title">All stores</h2>
        <button type="button" class="store-sheet__close" aria-label="Close">✕</button>
      </div>
      <div class="store-sheet__search">
        <label class="sr-only" for="store-sheet-q">Search stores</label>
        <input id="store-sheet-q" type="search" placeholder="🔍 Search stores" autocomplete="off">
        <label class="sr-only" for="store-sheet-town">Town</label>
        <select id="store-sheet-town" class="store-sheet__town">
          <option value="all">📍 All towns</option><option value="Sariaya">📍 Sariaya</option><option value="Lucena">📍 Lucena</option>
        </select>
      </div>
      <div class="store-sheet__chips" role="group" aria-label="Store type">
        ${CHIPS.map((c) => `<button type="button" class="store-sheet__chip" data-category="${c.id}" aria-pressed="${c.id === 'all'}">${c.label}</button>`).join('')}
      </div>
    </div>
    <p class="store-sheet__count" aria-live="polite">Loading stores…</p>
    <ul class="store-sheet__list"></ul>
    <button type="button" class="btn btn--ghost store-sheet__more" hidden>Show 50 more</button>
    <p class="store-sheet__foot">Store list © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> · Not all stores are official Pakisuyo partners.</p>`;
  document.body.append(sheet);

  const input = sheet.querySelector('#store-sheet-q');
  const townSelect = sheet.querySelector('#store-sheet-town');
  const countEl = sheet.querySelector('.store-sheet__count');
  const listEl = sheet.querySelector('.store-sheet__list');
  const moreBtn = sheet.querySelector('.store-sheet__more');

  const state = { query: '', town: 'all', category: 'all', shown: PAGE };
  let stores = null;
  let failed = false;
  let openedFromPage = false;
  let afterClose = null;
  let searchTimer;

  function renderList() {
    if (failed) {
      countEl.textContent = "Couldn't load the store list — type any store in the order form.";
      listEl.innerHTML = '';
      moreBtn.hidden = true;
      return;
    }
    if (!stores) {
      countEl.textContent = 'Loading stores…';
      return;
    }
    const results = searchStores(stores, state);
    countEl.textContent = results.length
      ? `${results.length} ${results.length === 1 ? 'store' : 'stores'}`
      : `No stores match “${state.query}”. You can still type it in the order form — we'll pick up from there.`;
    listEl.innerHTML = results.slice(0, state.shown).map(rowHtml).join('');
    moreBtn.hidden = results.length <= state.shown;
  }

  function open() {
    if (!sheet.hidden) return;
    sheet.hidden = false;
    document.documentElement.classList.add('is-locked');
    input.focus();
    renderList();
    loadDirectory()
      .then((list) => { stores = list; failed = false; })
      .catch(() => { failed = true; })
      .finally(renderList);
  }

  function close() {
    if (sheet.hidden) return;
    sheet.hidden = true;
    document.documentElement.classList.remove('is-locked');
    const next = afterClose;
    afterClose = null;
    if (next) next();
    else returnFocus()?.focus();
  }

  function requestClose() {
    if (openedFromPage) {
      openedFromPage = false;
      history.back(); // hashchange → close()
    } else {
      history.replaceState(null, '', `${location.pathname}${location.search}`);
      close();
    }
  }

  const syncToHash = () => (location.hash === '#stores' ? open() : close());
  window.addEventListener('hashchange', syncToHash);
  syncToHash();

  sheet.querySelector('.store-sheet__close').addEventListener('click', requestClose);

  sheet.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      requestClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusables = [...sheet.querySelectorAll('button:not([hidden]), input, select, a[href]')].filter((el) => el.offsetParent !== null);
    const first = focusables[0];
    const last = focusables.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  input.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.query = input.value;
      state.shown = PAGE;
      renderList();
    }, 120);
  });

  townSelect.addEventListener('change', () => {
    state.town = townSelect.value;
    state.shown = PAGE;
    renderList();
  });

  sheet.querySelector('.store-sheet__chips').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-category]');
    if (!chip) return;
    state.category = chip.dataset.category;
    state.shown = PAGE;
    sheet.querySelectorAll('.store-sheet__chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    renderList();
  });

  moreBtn.addEventListener('click', () => {
    state.shown += PAGE;
    renderList();
  });

  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.dir-row__order');
    if (!btn) return;
    const { name } = btn.dataset;
    afterClose = () => document.dispatchEvent(new CustomEvent(SELECT_STORE_EVENT, { detail: { name, focus: 'orderList' } }));
    requestClose();
  });

  return {
    openFromPage() {
      openedFromPage = true;
      location.hash = 'stores';
    },
  };
}
```

- [ ] **Step 4: Update `src/sections/restaurants.js`**

```js
import { STORES } from '../data/stores.js';
import { SELECT_STORE_EVENT } from '../data/contact.js';
import meta from '../data/directory-meta.json';
import { storeImageHtml } from '../lib/images.js';
import { escapeHtml } from '../lib/html.js';

export function renderRestaurants(el, { onBrowse }) {
  el.className = 'section restaurants';
  el.innerHTML = `
    <div class="container">
      <h2 class="section-title">Featured stores</h2>
      <p class="section-lead">Tap a store to start your order.</p>
      <ul class="store-grid">
        ${STORES.map((s) => `
          <li>
            <button type="button" class="store-card" data-name="${escapeHtml(s.name)}">
              ${storeImageHtml(s, 'store-card__logo')}
              <span class="store-card__name">${escapeHtml(s.name)}</span>
              <span class="store-card__meta">${escapeHtml(s.categoryLabel)} · ${escapeHtml(s.town)}</span>
            </button>
          </li>`).join('')}
      </ul>
      <div class="restaurants__browse">
        <button type="button" class="btn browse-btn" data-action="browse-stores">Browse all ${meta.count} stores →</button>
        <p class="restaurants__note">Sariaya &amp; Lucena · store list from OpenStreetMap</p>
      </div>
    </div>`;

  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="browse-stores"]')) {
      onBrowse();
      return;
    }
    const card = e.target.closest('.store-card');
    if (card) document.dispatchEvent(new CustomEvent(SELECT_STORE_EVENT, { detail: { name: card.dataset.name } }));
  });
}
```

- [ ] **Step 5: Wire it in `src/main.js`**

Add the import `import { mountStoreSheet } from './sections/store-sheet.js';`, and replace `renderRestaurants($('restaurants'));` with:

```js
const storeSheet = mountStoreSheet({ returnFocus: () => document.querySelector('[data-action="browse-stores"]') });
renderRestaurants($('restaurants'), { onBrowse: () => storeSheet.openFromPage() });
```

- [ ] **Step 6: Append styles to `src/styles/sections.css`**

```css
/* Browse all + store sheet */
.restaurants__browse { display: grid; justify-items: start; gap: 8px; margin-top: 20px; }
.browse-btn { background: var(--ink); color: var(--brand-yellow); }
.browse-btn:hover { background: #000; }
.restaurants__note { margin: 0; color: var(--ink-muted); font-size: .85rem; }
html.is-locked { overflow: hidden; }
.store-sheet { position: fixed; inset: 0; z-index: 80; background: var(--surface); overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; animation: sheet-in .2s ease-out; }
.store-sheet[hidden] { display: none; }
@keyframes sheet-in { from { transform: translateY(24px); opacity: 0; } }
.store-sheet__head { position: sticky; top: 0; z-index: 1; background: var(--brand-yellow); padding: 12px var(--gutter) 10px; }
.store-sheet__title-row { display: flex; align-items: center; justify-content: space-between; max-width: var(--max-w); margin: 0 auto; }
.store-sheet__title { margin: 0; font-size: 1.3rem; font-weight: 800; letter-spacing: -.02em; }
.store-sheet__close { width: 44px; height: 44px; border: 0; background: transparent; font-size: 1.2rem; cursor: pointer; }
.store-sheet__search { position: relative; max-width: var(--max-w); margin: 8px auto 0; }
.store-sheet__search input { width: 100%; min-height: 46px; border: 0; border-radius: var(--radius-pill); padding: 10px 150px 10px 16px; background: var(--surface); }
.store-sheet__town { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); max-width: 140px; min-height: 34px; border: 0; border-radius: var(--radius-pill); padding: 4px 12px; background: var(--ink); color: var(--brand-yellow); font-weight: 700; font-size: .85rem; cursor: pointer; }
.store-sheet__chips { display: flex; gap: 6px; overflow-x: auto; max-width: var(--max-w); margin: 10px auto 0; padding-bottom: 2px; scrollbar-width: none; }
.store-sheet__chips::-webkit-scrollbar { display: none; }
@media (min-width: 860px) { .store-sheet__chips { flex-wrap: wrap; overflow: visible; } }
.store-sheet__chip { flex: none; min-height: 36px; border: 0; border-radius: var(--radius-pill); padding: 6px 14px; background: var(--surface); font-weight: 600; cursor: pointer; }
.store-sheet__chip[aria-pressed="true"] { background: var(--ink); color: var(--surface); }
.store-sheet__count, .store-sheet__list, .store-sheet__more, .store-sheet__foot { width: 100%; max-width: var(--max-w); margin-left: auto; margin-right: auto; }
.store-sheet__count { margin-top: 0; margin-bottom: 0; padding: 10px var(--gutter); color: var(--ink-muted); font-size: .9rem; border-bottom: 1px solid var(--line); }
.store-sheet__list { list-style: none; margin-top: 0; margin-bottom: 0; padding: 0; }
.dir-row { display: flex; align-items: center; gap: 12px; padding: 10px var(--gutter); border-bottom: 1px solid var(--line); }
.dir-row__img { width: 44px; height: 44px; border-radius: 12px; object-fit: contain; font-size: 1.3rem; flex: none; background: var(--surface); }
.dir-row__text { flex: 1; min-width: 0; display: grid; }
.dir-row__name { overflow-wrap: anywhere; }
.dir-row__meta { color: var(--ink-muted); font-size: .85rem; }
.dir-row__order { flex: none; min-height: 40px; border: 0; background: none; color: var(--brand-red); font-weight: 800; cursor: pointer; padding: 0 4px; }
.badge { display: inline-block; vertical-align: middle; margin-left: 4px; background: var(--brand-yellow); color: var(--ink); border-radius: 6px; padding: 0 6px; font-size: .7rem; font-weight: 800; }
.store-sheet__more { display: block; width: auto; margin: 14px auto; }
.store-sheet__more[hidden] { display: none; }
.store-sheet__foot { margin-top: auto; padding: 14px var(--gutter) 20px; color: var(--ink-muted); font-size: .8rem; }
```

- [ ] **Step 7: Make the order form accept `{ name }` from cards (temporary bridge)**

The form still has the `<select>` until Task 7. So that Task 6 can be tested on its own, Task 7 replaces the form wholesale. **Run only the sheet-specific tests now**, which don't touch the order form:

Run: `npx playwright test tests/e2e/directory.spec.js -g "Browse all opens|empty state|Back button|cannot load"`
Expected: PASS (4 tests). The "orders from a row" test needs Task 7's combobox and stays red until then.

- [ ] **Step 8: Commit**

```bash
git add src/sections/store-sheet.js src/sections/restaurants.js src/main.js src/styles/sections.css tests/e2e/directory.spec.js tests/e2e/fixtures/directory.json
git commit -m "feat: add All stores sheet with town and type filters"
```

---

### Task 7: Order form store combobox

**Files:**
- Create: `src/sections/store-combobox.js`
- Modify: `src/sections/order-form.js`, `src/styles/sections.css`, `tests/e2e/order.spec.js`, `tests/e2e/directory.spec.js` (append combobox tests)

**Interfaces:**
- Consumes: `loadDirectory`, `searchStores`, `escapeHtml`, `SELECT_STORE_EVENT` `{ name, focus? }`.
- Produces: `attachStoreCombobox(input, listbox, { load, onPick }) → void`

- [ ] **Step 1: Update `tests/e2e/order.spec.js`**

- Add to its `beforeEach`: `await context.route('**/data/directory.json', (r) => r.fulfill({ contentType: 'application/json', body: '{"meta":{},"stores":[]}' }));`
- In `fillValidOrder`, replace `await page.getByLabel('Store/s').selectOption('jollibee-sariaya');` with `await page.getByRole('combobox', { name: /Store/ }).fill('Jollibee Sariaya');`
- Replace the "tapping a restaurant card preselects the store" test with:
  ```js
  test('tapping a featured card fills the store', async ({ page }) => {
    await page.goto('/');
    await page.locator('#restaurants .store-card', { hasText: "Dunkin' Sariaya" }).click();
    await expect(page.getByRole('combobox', { name: /Store/ })).toHaveValue("Dunkin' Sariaya");
  });
  ```
- Delete the `'"Other" store asks for a typed store name'` test.

- [ ] **Step 2: Append combobox tests to `tests/e2e/directory.spec.js`**

```js
async function fillRest(page) {
  await page.getByLabel(/^Name/).fill('Juan Dela Cruz');
  await page.getByLabel('Contact Number').fill('0917 123 4567');
  await page.getByLabel('Exact Address').fill('123 Rizal St');
  await page.getByLabel('Landmark').fill('Blue gate');
  await page.getByLabel('Order List').fill('2 lugaw');
  await page.locator('label.chip', { hasText: 'GCash' }).click();
}

test('store combobox works with the keyboard only (Review Focus 4)', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await context.route('https://m.me/**', (r) => r.fulfill({ contentType: 'text/html', body: 'stub' }));
  await page.goto('/#order');
  const combo = page.getByRole('combobox', { name: /Store/ });
  await combo.pressSequentially('lugaw');
  await expect(page.getByRole('option', { name: /Lugaw Queen/ })).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(combo).toHaveAttribute('aria-activedescendant', /store-opt-0/);
  await page.keyboard.press('Enter'); // must pick, not submit
  await expect(combo).toHaveValue('Lugaw Queen');
  await expect(page.getByRole('listbox')).toBeHidden();
  await expect(page.locator('#err-name')).toBeEmpty(); // form was not submitted

  await fillRest(page);
  const popup = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Send Order' }).click();
  await popup;
  await page.bringToFront();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Store/s: Lugaw Queen');
});

test('an unlisted store can be used as typed, and Esc closes the list', async ({ page }) => {
  await page.goto('/#order');
  const combo = page.getByRole('combobox', { name: /Store/ });
  await combo.fill('Aling Nena Bakery');
  await page.getByRole('option', { name: 'Use “Aling Nena Bakery” as typed' }).click();
  await expect(combo).toHaveValue('Aling Nena Bakery');
  await combo.press('End');
  await combo.pressSequentially('s');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toBeHidden();
});

test('the form still sends a typed store when the list fails to load (Review Focus 3)', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await context.route('https://m.me/**', (r) => r.fulfill({ contentType: 'text/html', body: 'stub' }));
  await page.unroute('**/data/directory.json');
  await page.route('**/data/directory.json', (r) => r.abort());
  await page.goto('/#order');
  await page.getByRole('combobox', { name: /Store/ }).fill('Lugaw Queen');
  await fillRest(page);
  const popup = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Send Order' }).click();
  await popup;
  await page.bringToFront();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Store/s: Lugaw Queen');
});
```

Run: `npx playwright test tests/e2e/directory.spec.js tests/e2e/order.spec.js`
Expected: FAIL (no combobox yet).

- [ ] **Step 3: Create `src/sections/store-combobox.js`**

```js
import { searchStores } from '../lib/directory.js';
import { escapeHtml } from '../lib/html.js';

// WAI-ARIA 1.2 combobox over the store directory; any typed text is also a valid choice.
export function attachStoreCombobox(input, listbox, { load, onPick }) {
  let stores = null;
  let options = [];
  let active = -1;

  const ensureLoaded = () => (stores ? Promise.resolve() : load().then((list) => { stores = list; }).catch(() => { stores = []; }));

  function close() {
    listbox.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  }

  function render() {
    const typed = input.value.trim();
    if (!typed) {
      close();
      return;
    }
    const matches = stores ? searchStores(stores, { query: typed }).slice(0, 6) : [];
    options = [
      ...matches.map((s) => ({ value: s.name, html: `${escapeHtml(s.name)} <span class="combo__town">· ${escapeHtml(s.town)}</span>` })),
      { value: typed, html: `Use “${escapeHtml(typed)}” as typed`, typed: true },
    ];
    active = Math.min(active, options.length - 1);
    listbox.innerHTML = options.map((o, i) => `
      <li role="option" id="store-opt-${i}" class="combo__option${o.typed ? ' combo__option--typed' : ''}" aria-selected="${i === active}" data-index="${i}">${o.html}</li>`).join('');
    listbox.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    if (active >= 0) input.setAttribute('aria-activedescendant', `store-opt-${active}`);
    else input.removeAttribute('aria-activedescendant');
  }

  function pick(index) {
    input.value = options[index].value;
    close();
    onPick?.();
  }

  input.addEventListener('focus', () => { ensureLoaded(); });
  input.addEventListener('input', () => {
    active = -1;
    render();
    if (!stores) ensureLoaded().then(() => { if (document.activeElement === input) render(); });
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (listbox.hidden) render();
      if (!options.length) return;
      active = e.key === 'ArrowDown' ? Math.min(active + 1, options.length - 1) : Math.max(active - 1, 0);
      render();
    } else if (e.key === 'Enter' && !listbox.hidden && active >= 0) {
      e.preventDefault(); // pick, don't submit the order
      pick(active);
    } else if (e.key === 'Escape' && !listbox.hidden) {
      e.preventDefault();
      close();
    }
  });
  input.addEventListener('blur', close);
  listbox.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus in the input
  listbox.addEventListener('click', (e) => {
    const li = e.target.closest('[data-index]');
    if (li) pick(Number(li.dataset.index));
  });
}
```

- [ ] **Step 4: Update `src/sections/order-form.js`**

1. Imports: delete `import { STORES } from '../data/stores.js';`, then add:
   ```js
   import { loadDirectory } from '../lib/directory-data.js';
   import { attachStoreCombobox } from './store-combobox.js';
   ```
   Also delete `import { escapeHtml } from '../lib/html.js';` (its only use was the store `<option>` list).
2. In `markup()`, replace both the `${field('storeId', ...)}` block and the `${field('storeOther', ...)}` line with:
   ```js
        <div class="field field--required combo" id="field-store">
          <label for="f-store">Store/s</label>
          <input id="f-store" name="store" role="combobox" aria-autocomplete="list" aria-expanded="false"
            aria-controls="store-listbox" aria-describedby="err-store" autocomplete="off"
            placeholder="Type a store, e.g. Jollibee or Lugaw Queen">
          <ul id="store-listbox" class="combo__list" role="listbox" aria-label="Store suggestions" hidden></ul>
          <p class="field-error" id="err-store"></p>
        </div>
   ```
3. In `renderOrderForm`, delete `const storeSelect = …`, `const storeOtherField = …`, the `syncStoreOther` function and its `change` listener. Add:
   ```js
  const storeInput = form.elements.store;
  attachStoreCombobox(storeInput, el.querySelector('#store-listbox'), {
    load: () => loadDirectory(),
    onPick: () => setError('store', ''),
  });
   ```
4. Replace the `SELECT_STORE_EVENT` listener with:
   ```js
  document.addEventListener(SELECT_STORE_EVENT, (e) => {
    storeInput.value = e.detail.name;
    setError('store', '');
    el.scrollIntoView({ behavior: 'smooth' });
    if (e.detail.focus === 'orderList') form.elements.orderList.focus({ preventScroll: true });
  });
   ```
5. In `readForm`, replace `storeId: get('storeId'), storeOther: get('storeOther'),` with `store: get('store'),`.

Run: `grep -n "storeId\|storeOther\|STORES" src/sections/order-form.js`
Expected: no output.

- [ ] **Step 5: Append combobox styles to `src/styles/sections.css`**

```css
/* Store combobox */
.combo { position: relative; }
.combo__list { position: absolute; left: 0; right: 0; top: calc(100% - 4px); z-index: 20; list-style: none; margin: 0; padding: 4px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 8px 24px rgba(0, 0, 0, .12); max-height: 280px; overflow-y: auto; }
.combo__list[hidden] { display: none; }
.combo__option { padding: 10px 12px; border-radius: 8px; cursor: pointer; }
.combo__option[aria-selected="true"], .combo__option:hover { background: var(--yellow-soft); }
.combo__option--typed { color: var(--brand-red); font-weight: 700; }
.combo__town { color: var(--ink-muted); font-weight: 400; }
```

- [ ] **Step 6: Run all tests**

Run: `npm test && npx playwright test`
Expected: PASS (unit and every e2e file, including the directory tests that were red at the end of Task 6).

- [ ] **Step 7: Commit**

```bash
git add src/sections/store-combobox.js src/sections/order-form.js src/styles/sections.css tests/e2e/order.spec.js tests/e2e/directory.spec.js
git commit -m "feat: search the store directory from the order form"
```

---

### Task 8: Docs, visual check and Lighthouse

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update `README.md`**

Under "Editing content", add:
```markdown
- **Featured stores (exactly 5):** `src/data/stores.js`
- **Stores missing from OpenStreetMap:** add them to `src/data/extra-stores.js` (no re-fetch needed)
```
Under "Regenerating data", add:
```markdown
npm run fetch:boundary -- Lucena   # a town's boundary (default Sariaya)
npm run fetch:stores               # all food & drink places in Sariaya + Lucena → public/data/directory.json
```
Under "Images", add: `- Directory stores without a logo show a category icon. All store pictures go through storeImageHtml() in src/lib/images.js — the one place to add Google Places photos later.`

- [ ] **Step 2: Visual check at phone and desktop width**

Run `npm run build && npx vite preview --port 4173`. Screenshot (Playwright, Pixel 7 and 1280×900):
- the featured section,
- `/#stores` with no filter,
- `/#stores` filtered to Lucena + Bakeries,
- the order form with "lug" typed in Store/s.

Check:
- the header is 2 lines (search with the town pill, then one chip row), not 4;
- no horizontal page scroll;
- logos render;
- category tiles show.

Stop the preview server afterwards (`fuser -k 4173/tcp`).

- [ ] **Step 3: Lighthouse**

Run the same Lighthouse command as the landing-page plan (Task 13, Step 5) against `npm run build` + preview.
Expected: performance ≥ 90, accessibility ≥ 90. Also check the store list isn't in the first load:
`grep -l "Libra Bakery" dist/assets/*.js` prints nothing (the data lives only in `dist/data/directory.json`).

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: document store directory data and scripts"
```
