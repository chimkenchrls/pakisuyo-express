# Store Directory (Sariaya + Lucena): Design Spec

**Date:** 2026-10-03
**Status:** Awaiting review
**Builds on:** `docs/superpowers/specs/2026-10-03-pakisuyo-landing-page-design.md` (merged to `main`)

## 1. Purpose

Show customers, and the owner during the pitch, that Pakisuyo can pick up from almost any food or drink place in Sariaya and Lucena. The page gets a searchable list of every such store, and the order form's store field becomes a search box over that list.

**Success criteria**
- "All stores" lists every named food and drink place that OpenStreetMap has inside the Sariaya and Lucena municipal boundaries, plus hand-added stores.
- A customer can find a store by typing part of its name, in any capitalisation and with or without accents or punctuation, and order from it in one tap.
- First page load is no heavier than today. The list loads only when it's needed.
- Mobile Lighthouse stays ≥ 90 for Performance and Accessibility.

## 2. Research findings

- OpenStreetMap (Overpass API, 2026-10-03): about 216 food and drink places in the Sariaya bounding box and about 128 in central Lucena. The boxes overlap and include some places outside the towns, so the real count comes after filtering by boundary. 94% of them have names.
- **None** of the OSM places in the area has a photo (`image` / `wikimedia_commons` tags: 0).
- *Wings & Dims Corner* and *Dash Espresso* (both Sariaya) are **not** in OSM, so hand-added stores are required.
- Google Places has photos but needs a billing account. Its terms forbid saving its data or photos into the site, so photos would have to be loaded live with attribution. Deferred (§9).
- Copying listings from Facebook, Google Maps or Foodpanda is against those sites' terms. Rejected.

## 3. Decisions

| Topic | Decision |
|---|---|
| Where the full list lives | Featured cards stay + **"Browse all N stores →"** opens an **All stores** full-screen sheet on the same page; the order form's store field becomes a search box over the same list |
| Featured stores | Exactly 5: Jollibee Sariaya, McDonald's Sariaya, Dunkin' Sariaya, Wings & Dims Corner (Sariaya), Dash Espresso (Sariaya) |
| Removed from featured | Max Mango, Bukid AMYR Restaurant, Conti's Bakeshop & Restaurant, KOPE-right (still findable in All stores if OSM has them) |
| Data source | OpenStreetMap via a one-off script, saved into the repo; plus a hand-maintained extra-stores list |
| Images | Featured: real logos. Everyone else: category icon tile. All images go through one function so Google Places photos can be added later |
| Filter header | Search bar with a **town pill** ("📍 All towns ▾") on the right + **one horizontally scrolling row** of type chips (no emoji in chips) + a result count line |
| Sheet behaviour | Opens at `#stores`; Back button, ✕ and Esc close it |

## 4. Data

### 4.1 Categories

| Category id | Label | OSM tags |
|---|---|---|
| `fast-food` | Fast food | `amenity=fast_food`, `amenity=food_court` |
| `restaurant` | Restaurants | `amenity=restaurant` |
| `cafe` | Cafés | `amenity=cafe`, `amenity=ice_cream`, `shop=coffee`, `shop=beverages` |
| `bakery` | Bakeries | `shop=bakery`, `shop=pastry`, `shop=confectionery`, `shop=deli` |
| `bar` | Bars | `amenity=bar` |

Each category has an icon (🍗 🍽️ ☕ 🥖 🍺) and a soft tile colour, used only on icon tiles, not in the chips.

### 4.2 `scripts/fetch-stores.mjs` (one-off, re-runnable)

1. Download the Lucena municipal boundary from Nominatim the same way the Sariaya one was fetched, into `src/data/lucena-boundary.json`. Refactor `fetch-boundary.mjs` to take the town as an argument.
2. Query Overpass for all `nwr` with the tags in §4.1 inside the combined bounding box of both boundaries (`out tags center`). Try the main Overpass server first, then a mirror. Fail loudly if neither answers.
3. Keep only elements that have a `name`, whose point falls inside the Sariaya or Lucena polygon (assigned to that town), and whose tags map to a category.
4. Remove duplicates: same normalised name within 30 m keeps the first.
5. Write `src/data/directory.json`:
   ```json
   { "meta": { "source": "© OpenStreetMap contributors (ODbL)", "fetched": "2026-10-03", "count": 0 },
     "stores": [ { "id": "osm-n123", "name": "Sariaya Bread House", "category": "bakery", "town": "Sariaya", "lat": 13.96, "lng": 121.52 } ] }
   ```
   It is sorted by town, then name. The script also writes `src/data/directory-meta.json` with the merged count (after combining with extras and dropping featured duplicates) and the fetch date.

The filtering, categorising and de-duplication logic lives in pure functions in `src/lib/directory.js`. The script and the tests both import them.

### 4.3 Hand-added stores: `src/data/extra-stores.js`

```js
export const EXTRA_STORES = [
  { id: 'wings-dims-sariaya', name: 'Wings & Dims Corner', category: 'fast-food', town: 'Sariaya' },
  { id: 'dash-espresso-sariaya', name: 'Dash Espresso', category: 'cafe', town: 'Sariaya' },
];
```

The owner can add more here, and they show in All stores and search without re-running the script.

### 4.4 Featured stores: `src/data/stores.js`

`STORES` becomes exactly the 5 featured stores, in the order listed in §3. Existing fields stay (`categoryLabel`, `eta`, `initials`, colours, `menu`). Jollibee keeps its sample menu. Wings & Dims and Dash Espresso get `town: 'Sariaya'`, an ETA, initials and colours.

- Logos: `public/assets/stores/wings-dims-sariaya/logo.jpg` (renamed from `wings&dims-sariaya`, since `&` is unsafe in URLs) and `public/assets/stores/dash-espresso-sariaya/logo.jpg`. Both are owner-supplied, private pitch only.
- `fetch-images.mjs` treats owner-supplied files of any of `png|jpg|jpeg|webp` as winning, not only `.png`. Re-running it records both in `images.json` and `CREDITS.md`.

### 4.5 Merged list

`buildDirectory(osmStores, extraStores, featured)` returns one list:

1. Featured stores first (flagged `featured: true`), in featured order.
2. Then everything else sorted by name, with:
   - extra stores and OSM stores combined;
   - any OSM or extra entry whose normalised name matches a featured store in the same town dropped (e.g. OSM "Jollibee" in Sariaya). The same chain in another town (Jollibee in Lucena) stays.

## 5. Search and filters

- **Normalise:** lowercase; strip accents (NFD + remove combining marks); replace `&` with "and"; remove apostrophes and other punctuation; collapse spaces. So "dunkin", "DUNKIN'" and "Dúnkin" all match "Dunkin' Sariaya", and "wings and dims" matches "Wings & Dims Corner".
- **Match:** the normalised query must be a substring of the normalised name.
- **Rank:**
  1. featured stores that match
  2. names that start with the query
  3. names where a word starts with the query
  4. other substring matches
  5. ties broken alphabetically
- **Filters:** town (`all` | `Sariaya` | `Lucena`) and category (`all` | one of §4.1). They combine with search using AND.
- **Result line:** "N stores" (or "1 store"). With no results: "No stores match “q”. You can still type it in the order form — we'll pick up from there."

## 6. UI

### 6.1 Featured section (replaces "Featured restaurants")

- Title "Featured stores", lead "Tap a store to start your order."
- 5 cards, using today's card style and logos.
- Below the grid, a dark pill button: **"Browse all {N} stores →"**. N comes from a tiny `src/data/directory-meta.json` (`{ "count": N, "fetched": "…" }`) that the script writes next to `directory.json`; N is the merged count after featured-duplicate removal, so the big JSON doesn't have to load first.
- Small line under it: "Sariaya & Lucena · store list from OpenStreetMap".
- Tapping a card fills the order form's store field with that store's name (same as today, now a text value) and scrolls to the form.

### 6.2 All stores sheet

- A full-screen overlay (`role="dialog"`, `aria-modal="true"`, labelled "All stores") with a yellow header holding:
  - title row: "All stores" and a ✕ button (accessible name "Close");
  - search input (`type="search"`, label "Search stores") with the **town pill** inside its right edge. The pill is a native `<select>` styled as a pill, showing "📍 All towns ▾", "📍 Sariaya ▾" or "📍 Lucena ▾";
  - one horizontally scrolling chip row: All · Fast food · Restaurants · Cafés · Bakeries · Bars (`aria-pressed`). On wide screens it wraps instead of scrolling.
- Result count line, then the list. Each row is the store image (logo or category tile), name, a "Featured" badge if featured, "Category · Town", and an **"Order →"** button (accessible name "Order from {name}").
- The list renders 50 rows, with "Show 50 more" to extend. Changing the search or filters resets to 50.
- Footer: "Store list © OpenStreetMap contributors · Not all stores are official Pakisuyo partners." The first part links to the OSM copyright page.
- **Open:** the "Browse all" button sets `location.hash = 'stores'`, and a `hashchange` listener opens the sheet. The sheet also opens on page load with `#stores`. Focus moves to the search input, and the page behind can't scroll.
- **Close:** ✕, Esc or the phone's Back button. ✕ and Esc call `history.back()` when the sheet was opened from the page, and otherwise clear the hash. Focus goes back to the "Browse all" button.
- **Order →:** closes the sheet, fills the store field, clears any store error, scrolls to the order form and focuses Order List.
- Data loads on first open with a dynamic `import('../data/directory.json')`. Until it loads, the sheet shows "Loading stores…". If loading fails, it shows "Couldn't load the store list — type any store in the order form." and the form keeps working.
- Search input is debounced by 120 ms. Re-rendering updates only the list and count, never the header, so the input keeps focus and the Android keyboard isn't disturbed.

### 6.3 Order form store field

- Replaces the `<select>` and the "Other / Store name" field with one text input labelled **"Store/s"** (required), following the WAI-ARIA 1.2 combobox pattern (`role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`).
- Loads the directory on first focus. From 1 typed character, it shows up to 6 ranked matches (§5) as "Name · Town", plus a final option **Use “{typed}” as typed**.
- Keyboard: ↓/↑ move, Enter picks, Esc closes the list. A tap or click picks. Picking puts the store name into the input.
- Whatever text is in the field when the order is sent is what goes in the message, whether picked or typed.

### 6.4 Images

`storeImageHtml(store, cls)` in `src/lib/images.js` is **the only place** that decides a store's picture:

1. a logo from `images.json` if there is one (with the existing broken-image fallback);
2. otherwise the category icon tile for directory stores;
3. otherwise the initials tile.

Google Places photos (§9) would be added inside this function only.

## 7. Changes to existing behaviour

- **Order data:** `storeId`/`storeOther` are replaced by `store` (string). Validation requires `store` (trimmed) with the message "Please choose or type a store." `buildOrderMessage` writes `Store/s: {store}`. `FIELD_ORDER` and the e2e tests are updated to match.
- **Featured cards:** `SELECT_STORE_EVENT` now carries `{ name }` instead of `{ storeId }`.
- **App demo:** lists the 5 featured stores. Jollibee keeps its sample menu, and the others show "Menu coming soon". With no out-of-town featured store, the demo no longer shows the out-of-town fee label. The rule stays in `totals()`, and its unit test uses a fixture store with `town: 'Lucena'` instead of Conti's.
- **Demo categories:** the chips (`CATEGORIES`) change to the §4.1 set.
- **Coverage copy** is unchanged.

## 8. Testing

**Unit tests (Vitest)**
- `normaliseName`: case, accents, `&`→and, apostrophes, extra spaces.
- `categoryFor(tags)`: every row of §4.1; unknown tags → null.
- `townFor(lat, lng)`: points in Sariaya, Lucena and neither, using the real boundaries.
- `dedupe`: same name within 30 m removed; same name 500 m apart kept.
- `buildDirectory`: featured first; OSM "Jollibee" in Sariaya dropped; Jollibee in Lucena kept; extras included; rest alphabetical.
- `searchStores(list, { query, town, category })`: ranking order from §5; filters combine with AND; empty query returns everything filtered.
- `validateOrder` / `buildOrderMessage`: updated for `store`.
- `storeImageHtml`: logo, then category tile, then initials.

**End-to-end tests (Playwright, Pixel 7)**
1. Featured shows exactly the 5 cards, and "Browse all N stores" opens the sheet (URL `#stores`, search focused).
2. In the sheet:
   - choose Lucena in the town pill → every row says Lucena;
   - tap the "Bakeries" chip → every row says Bakery;
   - tap "Order →" → the sheet closes, the store field is filled and Order List is focused.
3. The browser Back button closes the sheet, and focus returns to "Browse all".
4. Order form combobox with the keyboard only: type, then ↓, then Enter fills the store; sending produces `Store/s: {name}` in the copied message.
5. Typing a store that isn't listed → "Use “…” as typed" → the order sends with that text.
6. Directory JSON fails to load (route aborted) → the sheet shows the fallback message and the form still sends.

These e2e tests use a small fixture `directory.json` served through a Playwright route, so they don't depend on the real data's contents.

## 9. Out of scope / later

- **Google Places photos:** add inside `storeImageHtml`, loaded live with attribution, using a billing-enabled API key restricted by HTTP referrer or a small serverless proxy. This decision belongs to the post-sign app work.
- Opening hours, menus and ratings for directory stores; a map view of stores; towns beyond Sariaya and Lucena; automatic periodic refresh of the store list.
