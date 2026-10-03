# Pakisuyo Express Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Pakisuyo Express Sariaya pitch landing page: a branded, mobile-first site with a working Messenger order form (with map pin) and a tap-through "coming soon" app demo.

**Architecture:** A static Vite site written in vanilla ES modules. Pure logic lives in `src/lib/` and `src/demo/state.js` and is unit-tested with Vitest. Rendering lives in `src/sections/` and `src/demo/` as small `render(el)` functions that write HTML strings and wire events. Store, fee and payment data live in one place (`src/data/`). The map (Leaflet + OpenStreetMap) is lazy-loaded. End-to-end behaviour is checked with Playwright on a phone viewport.

**Tech Stack:** Vite, vanilla JavaScript (ESM), plain CSS with custom properties, Leaflet, Vitest, Playwright (Chromium), Lighthouse.

**Spec:** `docs/superpowers/specs/2026-10-03-pakisuyo-landing-page-design.md`

## Global Constraints

- All user-facing copy is in English (brand name "Pakisuyo" excepted). Statuses are exactly: `Order Placed`, `Preparing`, `Rider Assigned`, `Out for Delivery`, `Delivered`.
- Colours: `--brand-red: #E31B23`, `--brand-yellow: #FFD23F`, `--ink: #141414`, `--surface: #FFFFFF`, `--surface-muted: #F6F6F6`, `--yellow-soft: #FFF3C4`, `--success: #2A8A3E`. Every colour in CSS goes through a token (dark mode comes later).
- Font: Plus Jakarta Sans (400/500/700/800), Google Fonts, `display=swap`.
- Hours: 8AM–7PM, evaluated in `Asia/Manila` regardless of the device's timezone.
- Messenger: `https://m.me/PakisuyoExpressSariaya`. Facebook: `https://www.facebook.com/PakisuyoExpressSariaya`.
- Delivery fee: ₱50 for stores in Sariaya. For out-of-town stores the label is exactly `Out-of-town fee — confirmed by our team`. **No service fee.**
- Promo: code `PAKISUYO10`, ₱10 off delivery (demo only).
- Payment methods: Cash on Delivery, GCash, Maya, Card.
- No backend, no database, no analytics, no storage of customer data. Order data only goes to the clipboard and Messenger.
- Mobile-first, no horizontal scroll at 360px width, Lighthouse mobile ≥ 90 for Performance and Accessibility.
- Real brand logos and photos are for the **private pitch only**. The page ships with `noindex`.
- **Do not deploy anywhere without the user's explicit OK.**
- Commit messages: plain messages, **no `Co-Authored-By` or other Claude attribution lines.**

## Review Focus

1. **Phone numbers typed the way people really type them** (`+63 917…`, `917…` without the 0, dashes, spaces, brackets) should be accepted and normalised to `09XX XXX XXXX`. Wrong-length or non-`09` numbers should be rejected with a helpful message. Tests: Task 3.
2. **Clipboard blocked** (Facebook/Messenger in-app browsers, insecure origins, denied permission) should never fail silently. The fallback dialog should show the message with Copy and Open Messenger buttons. Tests: Task 8 (unit), Task 11 (e2e).
3. **A typed address must not be clobbered by the map.** If the customer typed an address and then pins or uses GPS, their text stays. A slow or older lookup must not overwrite a newer one. Tests: Task 6 (`shouldAutofill`, `latestOnly`), Task 11 (e2e).
4. **The visitor's device isn't on Manila time** (your laptop, a traveller), or it's 7:59 / 8:00 / 18:59 / 19:00. The hours badge should still be correct for Sariaya. Tests: Task 5 (unit), Task 10 (e2e with a foreign `timezoneId`).
5. **The owner mashes buttons in the demo** (double-taps Place Order, goes back from checkout, switches stores, restarts mid-tracking). There should be exactly one order, totals stay right, and no timers run away. Tests: Task 12 (reducer unit tests + e2e double-click).

---

## File map

```
index.html                          page shell, meta, fonts, section mount points
vite.config.js                      Vite + Vitest config
playwright.config.js                e2e config (Pixel 7, preview server)
netlify.toml                        build + noindex header (deploy only with OK)
README.md                           how to run, edit data, swap assets, deploy
scripts/fetch-boundary.mjs          one-off: Sariaya polygon from OSM → src/data/sariaya-boundary.json
scripts/fetch-images.mjs            one-off: Commons logos/photos → public/assets + images.json + CREDITS.md
scripts/export-logos.mjs            one-off: render logo PNGs (FB profile, icons) with Playwright
src/main.js                         imports styles, calls every section renderer
src/brand/logo.js                   markSvg / logoHorizontal / logoStacked (HTML strings)
src/data/contact.js                 MESSENGER_URL, FACEBOOK_URL, SELECT_STORE_EVENT
src/data/payments.js                PAYMENT_METHODS, paymentLabel()
src/data/stores.js                  STORES, CATEGORIES, fees, PROMO, COVERAGE, getStore()
src/data/sariaya-boundary.json      GeoJSON Feature (generated, committed)
src/data/images.json                image manifest (generated, committed; default empty)
src/lib/html.js                     escapeHtml()
src/lib/validate.js                 normalisePhone(), validateOrder(), FIELD_ORDER
src/lib/order-message.js            buildOrderMessage(), storeDisplayName()
src/lib/hours.js                    getHoursStatus(), manilaHour()
src/lib/cart.js                     emptyCart/addItem/removeItem/itemCount/totals/peso
src/lib/geo.js                      isInside(), isInsideSariaya(), mapsLink(), reverseGeocode(), formatAddress(), shouldAutofill()
src/lib/async.js                    latestOnly()
src/lib/clipboard.js                copyText(), copyFromTextarea()
src/lib/images.js                   initialsTile(), storeLogoHtml(), itemImageHtml(), installImageFallback()
src/sections/header.js | hero.js | restaurants.js | how-it-works.js | order-form.js | order-map.js | coverage.js | app-promo.js | footer.js
src/demo/state.js                   pure reducer + selectors for the demo
src/demo/screens.js                 HTML for each demo screen + captions
src/demo/demo.js                    mountDemo(): state loop, timers, events, focus restore
src/styles/tokens.css | base.css | sections.css | demo.css
public/assets/brand/icon.svg        favicon (shapes only)
public/assets/CREDITS.md            image credits (generated)
tests/unit/*.test.js                Vitest
tests/e2e/*.spec.js                 Playwright
```

---

### Task 1: Project scaffold, tokens and base styles

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.js`, `src/styles/tokens.css`, `src/styles/base.css`, `src/lib/html.js`, `tests/unit/html.test.js`
- Delete: `package-lock.json` (stale, wrong name; regenerated by npm)
- Modify: `.gitignore`

**Interfaces:**
- Produces: `escapeHtml(value: unknown): string`. The page shell has mount points `#site-header`, `#hero`, `#restaurants`, `#how`, `#order`, `#coverage`, `#app`, `#site-footer`. CSS tokens are as in Global Constraints, plus `--brand-red-dark`, `--ink-muted`, `--line`, `--danger`, `--radius-card`, `--radius-pill`, `--shadow-card`, `--font`, `--max-w`, `--gutter`. Utility classes: `.container`, `.section`, `.section-title`, `.section-lead`, `.btn`, `.btn--primary`, `.btn--light`, `.btn--ghost`, `.sr-only`, `.tile`, `.logo*`.

- [ ] **Step 1: Create `package.json` and install dependencies**

```json
{
  "name": "pakisuyo-express",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "fetch:boundary": "node scripts/fetch-boundary.mjs",
    "fetch:images": "node scripts/fetch-images.mjs",
    "export:logos": "node scripts/export-logos.mjs"
  }
}
```

Run:
```bash
rm package-lock.json
npm install -D vite vitest
npm install leaflet
```
Expected: `node_modules/` and a fresh `package-lock.json`.

- [ ] **Step 2: Create `vite.config.js`**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
  },
});
```

- [ ] **Step 3: Write the failing test `tests/unit/html.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../../src/lib/html.js';

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x">'&`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;');
  });

  it('stringifies non-strings and treats null/undefined as empty', () => {
    expect(escapeHtml(42)).toBe('42');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npx vitest run tests/unit/html.test.js`
Expected: FAIL, "Failed to load url ../../src/lib/html.js" (or similar).

- [ ] **Step 5: Implement `src/lib/html.js`**

```js
const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ENTITIES[ch]);
}
```

- [ ] **Step 6: Run it to verify it passes**

Run: `npx vitest run tests/unit/html.test.js`
Expected: PASS (2 tests).

- [ ] **Step 7: Create `src/styles/tokens.css`**

```css
:root {
  --brand-red: #E31B23;
  --brand-red-dark: #B8121A;
  --brand-yellow: #FFD23F;
  --yellow-soft: #FFF3C4;
  --ink: #141414;
  --ink-muted: #595959;
  --surface: #FFFFFF;
  --surface-muted: #F6F6F6;
  --line: #ECECEC;
  --success: #2A8A3E;
  --danger: #C81E1E;
  --radius-card: 16px;
  --radius-pill: 999px;
  --shadow-card: 0 2px 10px rgba(0, 0, 0, .08);
  --font: 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --max-w: 1120px;
  --gutter: 16px;
}
```

- [ ] **Step 8: Create `src/styles/base.css`**

```css
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; scroll-padding-top: 72px; }
body { margin: 0; font-family: var(--font); color: var(--ink); background: var(--surface); line-height: 1.5; overflow-x: hidden; }
img, svg { display: block; max-width: 100%; }
a { color: inherit; }
button, input, select, textarea { font: inherit; color: inherit; }
:focus-visible { outline: 3px solid var(--ink); outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation: none !important; transition: none !important; }
}

.container { width: 100%; max-width: var(--max-w); margin: 0 auto; padding: 0 var(--gutter); }
.section { padding: 56px 0; }
.section-title { font-size: clamp(1.6rem, 4vw, 2.25rem); font-weight: 800; letter-spacing: -.02em; line-height: 1.15; margin: 0 0 8px; }
.section-lead { color: var(--ink-muted); margin: 0 0 28px; max-width: 56ch; }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 10px 20px; border-radius: var(--radius-pill); border: 0; font-weight: 700; text-decoration: none; cursor: pointer; }
.btn--primary { background: var(--brand-red); color: var(--surface); }
.btn--primary:hover { background: var(--brand-red-dark); }
.btn--light { background: var(--surface); color: var(--ink); }
.btn--ghost { background: var(--surface-muted); color: var(--ink); }

.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.skip-link { position: absolute; left: -999px; }
.skip-link:focus { left: 16px; top: 16px; z-index: 100; background: var(--surface); padding: 8px 12px; border-radius: 8px; }

.tile { display: inline-flex; align-items: center; justify-content: center; font-weight: 800; border-radius: 12px; flex: none; }

.logo { --mark: 40px; display: inline-flex; align-items: center; gap: calc(var(--mark) * .25); text-decoration: none; color: var(--ink); }
.logo__text { display: flex; flex-direction: column; line-height: 1; }
.logo__name { font-weight: 800; font-size: calc(var(--mark) * .56); letter-spacing: -.02em; }
.logo__sub { font-weight: 700; font-size: calc(var(--mark) * .22); letter-spacing: .5em; color: var(--brand-red); margin-top: calc(var(--mark) * .08); }
.logo--stacked { flex-direction: column; text-align: center; }
.logo--stacked .logo__text { align-items: center; }
.logo--stacked .logo__name { font-size: calc(var(--mark) * .44); }
.logo--stacked .logo__sub { font-size: calc(var(--mark) * .16); padding-left: .5em; }
.logo--dark .logo__name, .logo--red .logo__name { color: var(--surface); }
.logo--dark .logo__sub, .logo--red .logo__sub { color: var(--brand-yellow); }
```

- [ ] **Step 9: Create `index.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pakisuyo Express Sariaya — Food delivery in Sariaya, Quezon</title>
  <meta name="description" content="Food and drinks from your favourite spots, delivered anywhere in Sariaya. Open daily 8AM–7PM.">
  <meta name="robots" content="noindex">
  <meta name="theme-color" content="#FFD23F">
  <meta property="og:title" content="Pakisuyo Express Sariaya">
  <meta property="og:description" content="Always ready for your Pakisuyo! Food delivery anywhere in Sariaya.">
  <link rel="icon" href="/assets/brand/icon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap">
</head>
<body>
  <a class="skip-link" href="#order">Skip to order form</a>
  <header id="site-header"></header>
  <main>
    <section id="hero"></section>
    <section id="restaurants"></section>
    <section id="how"></section>
    <section id="order"></section>
    <section id="coverage"></section>
    <section id="app"></section>
  </main>
  <footer id="site-footer"></footer>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 10: Create `src/main.js` (styles only for now)**

```js
import './styles/tokens.css';
import './styles/base.css';
```

- [ ] **Step 11: Add generated folders to `.gitignore`**

Append to `.gitignore`:
```
lighthouse*.json
lighthouse*.html
```

- [ ] **Step 12: Verify the build**

Run: `npm run build`
Expected: `dist/index.html` is produced with no errors.

- [ ] **Step 13: Commit**

```bash
git add package.json package-lock.json vite.config.js index.html src tests .gitignore
git commit -m "chore: scaffold Vite project with brand tokens and base styles"
```

---

### Task 2: Brand logo module and favicon

**Files:**
- Create: `src/brand/logo.js`, `public/assets/brand/icon.svg`, `tests/unit/logo.test.js`

**Interfaces:**
- Consumes: `.logo*` classes from Task 1.
- Produces:
  - `BRAND = { red: '#E31B23', yellow: '#FFD23F', ink: '#141414' }`
  - `markSvg({ size = 52, tile = BRAND.red, ink = BRAND.yellow, speedLines = true, rounded = true } = {}): string`
  - `logoHorizontal({ tone = 'light', size = 40 } = {}): string` (`tone`: `'light' | 'dark'`)
  - `logoStacked({ tone = 'light', size = 72, invertMark = tone === 'red' } = {}): string` (`tone`: `'light' | 'dark' | 'red'`)

- [ ] **Step 1: Write the failing test `tests/unit/logo.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { BRAND, markSvg, logoHorizontal, logoStacked } from '../../src/brand/logo.js';

describe('brand logo', () => {
  it('draws the P mark with speed lines by default', () => {
    const svg = markSvg();
    expect(svg).toContain(`fill="${BRAND.red}"`);
    expect(svg).toContain(`fill="${BRAND.yellow}"`);
    expect(svg.match(/<rect /g)).toHaveLength(4); // tile + 3 speed lines
  });

  it('drops speed lines for tiny icons', () => {
    expect(markSvg({ speedLines: false }).match(/<rect /g)).toHaveLength(1);
  });

  it('horizontal logo has the wordmark text and size variable', () => {
    const html = logoHorizontal({ size: 36 });
    expect(html).toContain('Pakisuyo');
    expect(html).toContain('EXPRESS');
    expect(html).toContain('--mark:36px');
    expect(html).toContain('logo--light');
  });

  it('stacked logo on red inverts the mark by default', () => {
    const html = logoStacked({ tone: 'red' });
    expect(html).toContain('logo--stacked');
    expect(html).toContain(`<rect width="64" height="64" rx="16" fill="${BRAND.yellow}"`);
  });

  it('stacked logo on red can keep the normal mark (FB profile)', () => {
    const html = logoStacked({ tone: 'red', invertMark: false });
    expect(html).toContain(`<rect width="64" height="64" rx="16" fill="${BRAND.red}"`);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/logo.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/brand/logo.js`**

```js
export const BRAND = { red: '#E31B23', yellow: '#FFD23F', ink: '#141414' };

const P_PATH = 'M23 14h15a12.5 12.5 0 0 1 0 25h-6v11h-9z M32 22v9h5a4.5 4.5 0 0 0 0-9z';
const SPEED_LINES = '<rect x="8" y="21" width="10" height="5" rx="2.5"/><rect x="5" y="31" width="13" height="5" rx="2.5"/><rect x="8" y="41" width="10" height="5" rx="2.5"/>';

export function markSvg({ size = 52, tile = BRAND.red, ink = BRAND.yellow, speedLines = true, rounded = true } = {}) {
  return `<svg class="logo__mark" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">`
    + `<rect width="64" height="64" rx="${rounded ? 16 : 0}" fill="${tile}"/>`
    + `<g fill="${ink}">${speedLines ? SPEED_LINES : ''}<path d="${P_PATH}" fill-rule="evenodd"/></g>`
    + '</svg>';
}

const wordmark = '<span class="logo__text"><span class="logo__name">Pakisuyo</span><span class="logo__sub">EXPRESS</span></span>';

export function logoHorizontal({ tone = 'light', size = 40 } = {}) {
  return `<span class="logo logo--${tone}" style="--mark:${size}px">${markSvg({ size })}${wordmark}</span>`;
}

export function logoStacked({ tone = 'light', size = 72, invertMark = tone === 'red' } = {}) {
  const mark = invertMark ? markSvg({ size, tile: BRAND.yellow, ink: BRAND.red }) : markSvg({ size });
  return `<span class="logo logo--stacked logo--${tone}" style="--mark:${size}px">${mark}${wordmark}</span>`;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run tests/unit/logo.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Create the favicon `public/assets/brand/icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#E31B23"/><g fill="#FFD23F"><rect x="8" y="21" width="10" height="5" rx="2.5"/><rect x="5" y="31" width="13" height="5" rx="2.5"/><rect x="8" y="41" width="10" height="5" rx="2.5"/><path d="M23 14h15a12.5 12.5 0 0 1 0 25h-6v11h-9z M32 22v9h5a4.5 4.5 0 0 0 0-9z" fill-rule="evenodd"/></g></svg>
```

- [ ] **Step 6: Commit**

```bash
git add src/brand tests/unit/logo.test.js public/assets/brand/icon.svg
git commit -m "feat: add Speed P logo system and favicon"
```

---

### Task 3: Payment data and order validation

**Files:**
- Create: `src/data/payments.js`, `src/lib/validate.js`, `tests/unit/validate.test.js`

**Interfaces:**
- Produces:
  - `PAYMENT_METHODS: Array<{ id: 'cod'|'gcash'|'maya'|'card', label: string, short: string, icon: string }>`
  - `paymentLabel(id: string): string | null`
  - `normalisePhone(raw: unknown): string | null`, which returns `'09XX XXX XXXX'` or null
  - `FIELD_ORDER: string[]`, which is `['name','phone','address','landmark','storeId','storeOther','orderList','payment']`
  - `validateOrder(data: OrderFormData): { valid: boolean, errors: Record<string,string> }`
  - `OrderFormData = { name, phone, address, landmark, storeId, storeOther, orderList, payment, notes: string; pin: {lat:number,lng:number} | null }`

- [ ] **Step 1: Create `src/data/payments.js`**

```js
export const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery', short: 'Cash on Delivery', icon: '💵' },
  { id: 'gcash', label: 'GCash', short: 'GCash', icon: '🟦' },
  { id: 'maya', label: 'Maya', short: 'Maya', icon: '🟩' },
  { id: 'card', label: 'Credit/Debit Card', short: 'Card', icon: '💳' },
];

export const paymentLabel = (id) => PAYMENT_METHODS.find((m) => m.id === id)?.label ?? null;
```

- [ ] **Step 2: Write the failing test `tests/unit/validate.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { normalisePhone, validateOrder } from '../../src/lib/validate.js';

const VALID = {
  name: 'Juan Dela Cruz',
  phone: '0917 123 4567',
  address: '123 Rizal St, Poblacion',
  landmark: 'Blue gate beside the chapel',
  storeId: 'jollibee-sariaya',
  storeOther: '',
  orderList: '1 Chickenjoy bucket',
  payment: 'gcash',
  notes: '',
  pin: null,
};

describe('normalisePhone', () => {
  it.each([
    ['09171234567', '0917 123 4567'],
    ['0917 123 4567', '0917 123 4567'],
    ['0917-123-4567', '0917 123 4567'],
    ['(0917) 123.4567', '0917 123 4567'],
    ['+639171234567', '0917 123 4567'],
    ['+63 917 123 4567', '0917 123 4567'],
    ['639171234567', '0917 123 4567'],
    ['9171234567', '0917 123 4567'],
  ])('accepts %s', (raw, expected) => {
    expect(normalisePhone(raw)).toBe(expected);
  });

  it.each(['', '0917123456', '091712345678', '08171234567', '+6309171234567', 'abc', '0917 123 456a'])(
    'rejects %s',
    (raw) => {
      expect(normalisePhone(raw)).toBeNull();
    },
  );

  it('rejects non-strings', () => {
    expect(normalisePhone(undefined)).toBeNull();
    expect(normalisePhone(9171234567)).toBeNull();
  });
});

describe('validateOrder', () => {
  it('accepts a complete order', () => {
    expect(validateOrder(VALID)).toEqual({ valid: true, errors: {} });
  });

  it.each(['name', 'address', 'landmark', 'orderList'])('requires %s (whitespace counts as empty)', (field) => {
    const result = validateOrder({ ...VALID, [field]: '   ' });
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors)).toEqual([field]);
  });

  it('rejects a bad phone number with a helpful message', () => {
    const { errors } = validateOrder({ ...VALID, phone: '1234' });
    expect(errors.phone).toMatch(/0917 123 4567/);
  });

  it('requires a store', () => {
    expect(validateOrder({ ...VALID, storeId: '' }).errors).toHaveProperty('storeId');
  });

  it('requires a typed store name when "other" is chosen', () => {
    expect(validateOrder({ ...VALID, storeId: 'other', storeOther: ' ' }).errors).toHaveProperty('storeOther');
    expect(validateOrder({ ...VALID, storeId: 'other', storeOther: 'Aling Nena Bakery' }).valid).toBe(true);
  });

  it('requires a known payment method', () => {
    expect(validateOrder({ ...VALID, payment: '' }).errors).toHaveProperty('payment');
    expect(validateOrder({ ...VALID, payment: 'bitcoin' }).errors).toHaveProperty('payment');
  });

  it('notes are optional', () => {
    expect(validateOrder({ ...VALID, notes: '' }).valid).toBe(true);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run tests/unit/validate.test.js`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement `src/lib/validate.js`**

```js
import { PAYMENT_METHODS } from '../data/payments.js';

export const FIELD_ORDER = ['name', 'phone', 'address', 'landmark', 'storeId', 'storeOther', 'orderList', 'payment'];

const REQUIRED_TEXT = {
  name: 'Please enter your name.',
  address: 'Please enter your exact address.',
  landmark: 'Please add a landmark so our rider can find you.',
  orderList: 'Please list what you want to order.',
};

export function normalisePhone(raw) {
  if (typeof raw !== 'string') return null;
  let digits = raw.replace(/[\s\-().]/g, '');
  if (digits.startsWith('+63')) digits = `0${digits.slice(3)}`;
  else if (/^63\d{10}$/.test(digits)) digits = `0${digits.slice(2)}`;
  else if (/^9\d{9}$/.test(digits)) digits = `0${digits}`;
  if (!/^09\d{9}$/.test(digits)) return null;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

export function validateOrder(data) {
  const errors = {};
  const text = (field) => String(data[field] ?? '').trim();

  for (const [field, message] of Object.entries(REQUIRED_TEXT)) {
    if (!text(field)) errors[field] = message;
  }
  if (!normalisePhone(data.phone)) errors.phone = 'Enter a PH mobile number, e.g. 0917 123 4567.';
  if (!text('storeId')) errors.storeId = 'Please choose a store.';
  else if (data.storeId === 'other' && !text('storeOther')) errors.storeOther = 'Please type the store name.';
  if (!PAYMENT_METHODS.some((m) => m.id === data.payment)) errors.payment = 'Please choose how you will pay.';

  return { valid: Object.keys(errors).length === 0, errors };
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npx vitest run tests/unit/validate.test.js`
Expected: PASS (all).

- [ ] **Step 6: Commit**

```bash
git add src/data/payments.js src/lib/validate.js tests/unit/validate.test.js
git commit -m "feat: add payment methods and order validation"
```

---

### Task 4: Store data and cart totals

**Files:**
- Create: `src/data/stores.js`, `src/data/contact.js`, `src/lib/cart.js`, `tests/unit/cart.test.js`

**Interfaces:**
- Produces:
  - `STORES: Array<Store>`, where `Store = { id, name, category, categoryLabel, town, eta, initials, color, textColor, emoji, menu: Array<{ id, name, price:number, emoji }> }`
  - `CATEGORIES: Array<{ id, label }>` (first is `{ id: 'all' }`)
  - `HOME_TOWN = 'Sariaya'`, `SARIAYA_DELIVERY_FEE = 50`, `PROMO = { code: 'PAKISUYO10', discount: 10 }`, `COVERAGE = { pickupTowns: string[], deliveryArea: string }`
  - `getStore(id): Store | null`
  - `MESSENGER_URL`, `FACEBOOK_URL`, `SELECT_STORE_EVENT = 'pakisuyo:select-store'`
  - `emptyCart(): Cart`, `addItem(cart, item): Cart`, `removeItem(cart, itemId): Cart`, `itemCount(cart): number`
  - `totals(cart, store, { promoApplied }?) → { subtotal, fee, feeKnown, discount, total, feeLabel, totalLabel }`
  - `peso(n): string`, e.g. `'₱ 198'`
  - `Cart = { lines: Array<{ id, name, price, qty }> }`. All cart functions return new objects and never mutate.

- [ ] **Step 1: Create `src/data/contact.js`**

```js
export const MESSENGER_URL = 'https://m.me/PakisuyoExpressSariaya';
export const FACEBOOK_URL = 'https://www.facebook.com/PakisuyoExpressSariaya';
export const SELECT_STORE_EVENT = 'pakisuyo:select-store';
```

- [ ] **Step 2: Create `src/data/stores.js`**

```js
export const HOME_TOWN = 'Sariaya';
export const SARIAYA_DELIVERY_FEE = 50;
export const PROMO = { code: 'PAKISUYO10', discount: 10 };

// Owner to confirm (spec §2): pick-up towns and delivery area.
export const COVERAGE = {
  pickupTowns: ['Sariaya', 'Lucena', 'Tayabas', 'Candelaria'],
  deliveryArea: 'Sariaya',
};

export const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'fast-food', label: 'Fast food' },
  { id: 'drinks', label: 'Coffee & drinks' },
  { id: 'cakes', label: 'Cakes' },
  { id: 'filipino', label: 'Filipino' },
];

// Towns marked "unverified" are guesses from their Facebook posts — confirm with the owner.
// Menu prices are samples for the demo only.
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
    id: 'dunkin-sariaya', name: "Dunkin' Sariaya", category: 'drinks', categoryLabel: 'Donuts & coffee',
    town: 'Sariaya', eta: '15–25 min', initials: 'DD', color: '#FF671F', textColor: '#FFFFFF', emoji: '🍩', menu: [],
  },
  {
    id: 'max-mango', name: 'Max Mango', category: 'drinks', categoryLabel: 'Mango drinks',
    town: 'Sariaya' /* unverified */, eta: '15–25 min', initials: 'MM', color: '#FFB000', textColor: '#141414', emoji: '🥭', menu: [],
  },
  {
    id: 'bukid-amyr', name: 'Bukid AMYR Restaurant', category: 'filipino', categoryLabel: 'Filipino',
    town: 'Sariaya' /* unverified */, eta: '25–35 min', initials: 'BA', color: '#3E7B27', textColor: '#FFFFFF', emoji: '🍛', menu: [],
  },
  {
    id: 'contis', name: "Conti's Bakeshop & Restaurant", category: 'cakes', categoryLabel: 'Cakes & meals',
    town: 'Lucena' /* unverified */, eta: '35–50 min', initials: 'CB', color: '#6B3FA0', textColor: '#FFFFFF', emoji: '🎂', menu: [],
  },
  {
    id: 'kope-right', name: 'KOPE-right', category: 'drinks', categoryLabel: 'Coffee',
    town: 'Sariaya' /* unverified */, eta: '15–25 min', initials: 'KR', color: '#6F4E37', textColor: '#FFFFFF', emoji: '☕', menu: [],
  },
];

export const getStore = (id) => STORES.find((s) => s.id === id) ?? null;
```

- [ ] **Step 3: Write the failing test `tests/unit/cart.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { emptyCart, addItem, removeItem, itemCount, totals, peso } from '../../src/lib/cart.js';
import { getStore } from '../../src/data/stores.js';

const jollibee = getStore('jollibee-sariaya');
const contis = getStore('contis'); // out of town
const [chickenjoy, , , cokeFloat] = jollibee.menu;

describe('cart', () => {
  it('adds new items and increments existing ones', () => {
    let cart = addItem(emptyCart(), chickenjoy);
    cart = addItem(cart, chickenjoy);
    cart = addItem(cart, cokeFloat);
    expect(cart.lines).toEqual([
      { id: 'chickenjoy-rice', name: '1-pc Chickenjoy w/ Rice', price: 99, qty: 2 },
      { id: 'coke-float', name: 'Coke Float', price: 59, qty: 1 },
    ]);
    expect(itemCount(cart)).toBe(3);
  });

  it('removes one at a time and drops lines at zero', () => {
    let cart = addItem(addItem(emptyCart(), chickenjoy), chickenjoy);
    cart = removeItem(cart, 'chickenjoy-rice');
    expect(cart.lines[0].qty).toBe(1);
    cart = removeItem(cart, 'chickenjoy-rice');
    expect(cart.lines).toEqual([]);
    expect(removeItem(cart, 'nope').lines).toEqual([]);
  });

  it('never mutates the cart it was given', () => {
    const before = addItem(emptyCart(), chickenjoy);
    const snapshot = structuredClone(before);
    addItem(before, chickenjoy);
    removeItem(before, 'chickenjoy-rice');
    expect(before).toEqual(snapshot);
  });
});

describe('totals', () => {
  const cart = addItem(addItem(emptyCart(), chickenjoy), cokeFloat); // 99 + 59

  it('charges ₱50 delivery for Sariaya stores', () => {
    expect(totals(cart, jollibee)).toEqual({
      subtotal: 158, fee: 50, feeKnown: true, discount: 0, total: 208,
      feeLabel: 'Delivery fee (within Sariaya)', totalLabel: 'Total',
    });
  });

  it('applies the PAKISUYO10 promo to the delivery fee', () => {
    const t = totals(cart, jollibee, { promoApplied: true });
    expect(t.discount).toBe(10);
    expect(t.total).toBe(198);
  });

  it('does not invent a fee for out-of-town stores, and ignores the promo', () => {
    expect(totals(cart, contis, { promoApplied: true })).toEqual({
      subtotal: 158, fee: 0, feeKnown: false, discount: 0, total: 158,
      feeLabel: 'Out-of-town fee — confirmed by our team', totalLabel: 'Total (excl. delivery)',
    });
  });

  it('formats pesos', () => {
    expect(peso(198)).toBe('₱ 198');
    expect(peso(1250)).toBe('₱ 1,250');
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npx vitest run tests/unit/cart.test.js`
Expected: FAIL (`src/lib/cart.js` not found).

- [ ] **Step 5: Implement `src/lib/cart.js`**

```js
import { HOME_TOWN, SARIAYA_DELIVERY_FEE, PROMO } from '../data/stores.js';

export const emptyCart = () => ({ lines: [] });

export function addItem(cart, item) {
  const existing = cart.lines.find((l) => l.id === item.id);
  const lines = existing
    ? cart.lines.map((l) => (l.id === item.id ? { ...l, qty: l.qty + 1 } : l))
    : [...cart.lines, { id: item.id, name: item.name, price: item.price, qty: 1 }];
  return { lines };
}

export function removeItem(cart, itemId) {
  const lines = cart.lines
    .map((l) => (l.id === itemId ? { ...l, qty: l.qty - 1 } : l))
    .filter((l) => l.qty > 0);
  return { lines };
}

export const itemCount = (cart) => cart.lines.reduce((n, l) => n + l.qty, 0);

export function totals(cart, store, { promoApplied = false } = {}) {
  const subtotal = cart.lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const feeKnown = store?.town === HOME_TOWN;
  const fee = feeKnown ? SARIAYA_DELIVERY_FEE : 0;
  const discount = promoApplied && feeKnown ? Math.min(PROMO.discount, fee) : 0;
  return {
    subtotal,
    fee,
    feeKnown,
    discount,
    total: subtotal + fee - discount,
    feeLabel: feeKnown ? 'Delivery fee (within Sariaya)' : 'Out-of-town fee — confirmed by our team',
    totalLabel: feeKnown ? 'Total' : 'Total (excl. delivery)',
  };
}

export const peso = (n) => `₱ ${n.toLocaleString('en-PH')}`;
```

- [ ] **Step 6: Run it to verify it passes**

Run: `npx vitest run tests/unit/cart.test.js`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/data/stores.js src/data/contact.js src/lib/cart.js tests/unit/cart.test.js
git commit -m "feat: add store data, fee rules and demo cart totals"
```

---

### Task 5: Opening hours in Manila time

**Files:**
- Create: `src/lib/hours.js`, `tests/unit/hours.test.js`

**Interfaces:**
- Produces: `OPEN_HOUR = 8`, `CLOSE_HOUR = 19`, `manilaHour(date: Date): number`, `getHoursStatus(date = new Date()): { isOpen: boolean, label: string }`. The label is exactly `'Open today 8AM–7PM'` or `'Closed now — opens 8AM'`.

- [ ] **Step 1: Write the failing test `tests/unit/hours.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { getHoursStatus, manilaHour } from '../../src/lib/hours.js';

// Manila is UTC+8 with no daylight saving, so instants below are unambiguous.
describe('hours', () => {
  it('reads the hour in Manila, not the machine timezone', () => {
    expect(manilaHour(new Date('2026-10-03T00:30:00Z'))).toBe(8);
    expect(manilaHour(new Date('2026-10-03T16:00:00Z'))).toBe(0); // midnight, not 24
  });

  it.each([
    ['2026-10-02T23:59:00Z', false], // 7:59 AM
    ['2026-10-03T00:00:00Z', true],  // 8:00 AM
    ['2026-10-03T10:59:00Z', true],  // 6:59 PM
    ['2026-10-03T11:00:00Z', false], // 7:00 PM
    ['2026-10-03T15:00:00Z', false], // 11:00 PM
  ])('%s → open=%s', (iso, isOpen) => {
    const status = getHoursStatus(new Date(iso));
    expect(status.isOpen).toBe(isOpen);
    expect(status.label).toBe(isOpen ? 'Open today 8AM–7PM' : 'Closed now — opens 8AM');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/hours.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/hours.js`**

```js
export const OPEN_HOUR = 8;
export const CLOSE_HOUR = 19;

const manilaHourFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila',
  hour: 'numeric',
  hourCycle: 'h23',
});

export function manilaHour(date) {
  return Number(manilaHourFormat.format(date));
}

export function getHoursStatus(date = new Date()) {
  const hour = manilaHour(date);
  const isOpen = hour >= OPEN_HOUR && hour < CLOSE_HOUR;
  return { isOpen, label: isOpen ? 'Open today 8AM–7PM' : 'Closed now — opens 8AM' };
}
```

- [ ] **Step 4: Run it to verify it passes, including under a foreign timezone**

Run: `npx vitest run tests/unit/hours.test.js && TZ=America/Los_Angeles npx vitest run tests/unit/hours.test.js`
Expected: PASS both times.

- [ ] **Step 5: Commit**

```bash
git add src/lib/hours.js tests/unit/hours.test.js
git commit -m "feat: add Manila-time opening hours status"
```

---

### Task 6: Geography (Sariaya boundary, pin links, address lookup)

**Files:**
- Create: `scripts/fetch-boundary.mjs`, `src/data/sariaya-boundary.json` (generated), `src/lib/geo.js`, `src/lib/async.js`, `tests/unit/geo.test.js`, `tests/unit/async.test.js`

**Interfaces:**
- Produces:
  - `SARIAYA_CENTER = { lat: 13.9626, lng: 121.5262 }`
  - `mapsLink(lat, lng): string`, e.g. `https://maps.google.com/?q=13.963400,121.526300`
  - `isInside(lat, lng, geometry: GeoJSON Polygon|MultiPolygon): boolean`
  - `isInsideSariaya(lat, lng): boolean`
  - `formatAddress(nominatimResult): string | null`
  - `reverseGeocode(lat, lng, { fetchFn?, signal? }?): Promise<string|null>` (never throws)
  - `shouldAutofill(currentValue: string, lastAutofilled: string|null): boolean`
  - `latestOnly(fn) → (...args) => Promise<{ stale: true } | { stale: false, value }>`

- [ ] **Step 1: Create `scripts/fetch-boundary.mjs`**

```js
// One-off: download Sariaya's municipal boundary from OpenStreetMap (ODbL) and save it as GeoJSON.
import { writeFile } from 'node:fs/promises';

const params = new URLSearchParams({
  q: 'Sariaya, Quezon, Philippines',
  format: 'jsonv2',
  polygon_geojson: '1',
  polygon_threshold: '0.0005',
  limit: '5',
});
const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
  headers: { 'User-Agent': 'pakisuyo-express-landing/0.1 (one-off build script)' },
});
if (!res.ok) throw new Error(`Nominatim responded ${res.status}`);

const places = await res.json();
const place = places.find((p) => p.type === 'administrative' && /Polygon/.test(p.geojson?.type ?? ''));
if (!place) throw new Error(`No administrative polygon found. Got: ${places.map((p) => `${p.type}:${p.display_name}`).join(' | ')}`);

const feature = {
  type: 'Feature',
  properties: {
    name: place.display_name,
    osm_id: place.osm_id,
    source: '© OpenStreetMap contributors (ODbL)',
    fetched: new Date().toISOString().slice(0, 10),
  },
  geometry: place.geojson,
};
await writeFile(new URL('../src/data/sariaya-boundary.json', import.meta.url), `${JSON.stringify(feature)}\n`);
console.log(`Saved ${place.display_name} (${place.geojson.type})`);
```

- [ ] **Step 2: Run it and check the result**

Run: `npm run fetch:boundary`
Expected: `Saved Sariaya, Quezon, Calabarzon, Philippines (Polygon)` or `(MultiPolygon)`, and `src/data/sariaya-boundary.json` exists. If it throws "No administrative polygon", read the printed candidates and adjust `q`, for example `Municipality of Sariaya`.

- [ ] **Step 3: Write the failing test `tests/unit/async.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { latestOnly } from '../../src/lib/async.js';

const deferred = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};

describe('latestOnly', () => {
  it('marks results of superseded calls as stale even if they resolve last', async () => {
    const first = deferred();
    const second = deferred();
    const calls = [first, second];
    const lookup = latestOnly(() => calls.shift().promise);

    const a = lookup('old');
    const b = lookup('new');
    second.resolve('new address');
    first.resolve('old address');

    expect(await b).toEqual({ stale: false, value: 'new address' });
    expect(await a).toEqual({ stale: true });
  });

  it('returns the value for a single call', async () => {
    const lookup = latestOnly(async (x) => x * 2);
    expect(await lookup(21)).toEqual({ stale: false, value: 42 });
  });
});
```

- [ ] **Step 4: Implement `src/lib/async.js`**

```js
// Wraps an async function so only the most recent call's result is "fresh".
export function latestOnly(fn) {
  let latest = 0;
  return async (...args) => {
    const id = ++latest;
    const value = await fn(...args);
    return id === latest ? { stale: false, value } : { stale: true };
  };
}
```

Run: `npx vitest run tests/unit/async.test.js`
Expected: PASS.

- [ ] **Step 5: Write the failing test `tests/unit/geo.test.js`**

```js
import { describe, it, expect, vi } from 'vitest';
import {
  mapsLink, isInside, isInsideSariaya, formatAddress, reverseGeocode, shouldAutofill, SARIAYA_CENTER,
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
    expect(shouldAutofill('Rizal St, Sariaya — 2nd floor', 'Rizal St, Sariaya')).toBe(false);
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run tests/unit/geo.test.js`
Expected: FAIL (module not found).

- [ ] **Step 7: Implement `src/lib/geo.js`**

```js
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
```

- [ ] **Step 8: Run it to verify it passes**

Run: `npx vitest run tests/unit/geo.test.js tests/unit/async.test.js`
Expected: PASS. If "town proper is inside" fails, open `src/data/sariaya-boundary.json`, check that `properties.name` is the Sariaya municipality and re-run Step 2. Don't change the test coordinates.

- [ ] **Step 9: Commit**

```bash
git add scripts/fetch-boundary.mjs src/data/sariaya-boundary.json src/lib/geo.js src/lib/async.js tests/unit/geo.test.js tests/unit/async.test.js
git commit -m "feat: add Sariaya boundary check, pin links and address lookup"
```

---

### Task 7: Messenger order message

**Files:**
- Create: `src/lib/order-message.js`, `tests/unit/order-message.test.js`

**Interfaces:**
- Consumes: `getStore` (Task 4), `paymentLabel` (Task 3), `normalisePhone` (Task 3), `mapsLink` (Task 6).
- Produces: `storeDisplayName(data: OrderFormData): string`, `buildOrderMessage(data: OrderFormData): string`. Callers must validate first.

- [ ] **Step 1: Write the failing test `tests/unit/order-message.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { buildOrderMessage } from '../../src/lib/order-message.js';

const BASE = {
  name: '  Juan Dela Cruz ',
  phone: '+63 917-123-4567',
  address: '123 Rizal St, Poblacion',
  landmark: 'Blue gate beside the chapel',
  storeId: 'jollibee-sariaya',
  storeOther: '',
  orderList: '1 Chickenjoy bucket\n2 Coke Float',
  payment: 'gcash',
  notes: '',
  pin: null,
};

describe('buildOrderMessage', () => {
  it('uses the exact field order the admins already use', () => {
    expect(buildOrderMessage(BASE)).toBe([
      'NEW ORDER – Pakisuyo Express',
      'Name: Juan Dela Cruz',
      'Exact Address: 123 Rizal St, Poblacion',
      'Landmark: Blue gate beside the chapel',
      'Contact Number: 0917 123 4567',
      'Store/s: Jollibee Sariaya',
      'Order List: 1 Chickenjoy bucket\n2 Coke Float',
      'Payment: GCash',
    ].join('\n'));
  });

  it('adds a tappable pin link after the landmark when a pin is set', () => {
    const lines = buildOrderMessage({ ...BASE, pin: { lat: 13.9634, lng: 121.5263 } }).split('\n');
    expect(lines[4]).toBe('📍 Pin: https://maps.google.com/?q=13.963400,121.526300');
  });

  it('adds notes only when filled', () => {
    expect(buildOrderMessage({ ...BASE, notes: '  Call when outside ' })).toMatch(/\nNotes: Call when outside$/);
    expect(buildOrderMessage({ ...BASE, notes: '   ' })).not.toContain('Notes:');
  });

  it('uses the typed store name for "other" and long payment labels', () => {
    const msg = buildOrderMessage({ ...BASE, storeId: 'other', storeOther: ' Aling Nena Bakery ', payment: 'card' });
    expect(msg).toContain('Store/s: Aling Nena Bakery');
    expect(msg).toContain('Payment: Credit/Debit Card');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/order-message.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/order-message.js`**

```js
import { getStore } from '../data/stores.js';
import { paymentLabel } from '../data/payments.js';
import { normalisePhone } from './validate.js';
import { mapsLink } from './geo.js';

export function storeDisplayName(data) {
  if (data.storeId === 'other') return data.storeOther.trim();
  return getStore(data.storeId)?.name ?? '';
}

export function buildOrderMessage(data) {
  const lines = [
    'NEW ORDER – Pakisuyo Express',
    `Name: ${data.name.trim()}`,
    `Exact Address: ${data.address.trim()}`,
    `Landmark: ${data.landmark.trim()}`,
  ];
  if (data.pin) lines.push(`📍 Pin: ${mapsLink(data.pin.lat, data.pin.lng)}`);
  lines.push(
    `Contact Number: ${normalisePhone(data.phone)}`,
    `Store/s: ${storeDisplayName(data)}`,
    `Order List: ${data.orderList.trim()}`,
    `Payment: ${paymentLabel(data.payment)}`,
  );
  const notes = (data.notes ?? '').trim();
  if (notes) lines.push(`Notes: ${notes}`);
  return lines.join('\n');
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run tests/unit/order-message.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/order-message.js tests/unit/order-message.test.js
git commit -m "feat: build Messenger order message in the admins' format"
```

---

### Task 8: Clipboard helpers

**Files:**
- Create: `src/lib/clipboard.js`, `tests/unit/clipboard.test.js`

**Interfaces:**
- Produces: `copyText(text, { nav?, win? }?): Promise<boolean>` (never throws) and `copyFromTextarea(textarea, doc?): boolean` (never throws).

- [ ] **Step 1: Write the failing test `tests/unit/clipboard.test.js`**

```js
import { describe, it, expect, vi } from 'vitest';
import { copyText, copyFromTextarea } from '../../src/lib/clipboard.js';

const secure = { isSecureContext: true };

describe('copyText', () => {
  it('writes to the clipboard in a secure context', async () => {
    const writeText = vi.fn(async () => {});
    await expect(copyText('hi', { nav: { clipboard: { writeText } }, win: secure })).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hi');
  });

  it('returns false when permission is denied', async () => {
    const nav = { clipboard: { writeText: async () => { throw new Error('NotAllowedError'); } } };
    await expect(copyText('hi', { nav, win: secure })).resolves.toBe(false);
  });

  it('returns false in insecure contexts or when the API is missing (in-app browsers)', async () => {
    const nav = { clipboard: { writeText: vi.fn() } };
    await expect(copyText('hi', { nav, win: { isSecureContext: false } })).resolves.toBe(false);
    expect(nav.clipboard.writeText).not.toHaveBeenCalled();
    await expect(copyText('hi', { nav: {}, win: secure })).resolves.toBe(false);
  });
});

describe('copyFromTextarea', () => {
  const textarea = () => ({ focus: vi.fn(), select: vi.fn() });

  it('selects the text and uses execCommand', () => {
    const ta = textarea();
    expect(copyFromTextarea(ta, { execCommand: () => true })).toBe(true);
    expect(ta.select).toHaveBeenCalled();
  });

  it('returns false when execCommand fails or throws', () => {
    expect(copyFromTextarea(textarea(), { execCommand: () => false })).toBe(false);
    expect(copyFromTextarea(textarea(), { execCommand: () => { throw new Error('nope'); } })).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/clipboard.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/clipboard.js`**

```js
export async function copyText(text, { nav = globalThis.navigator, win = globalThis } = {}) {
  if (!win?.isSecureContext || typeof nav?.clipboard?.writeText !== 'function') return false;
  try {
    await nav.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Legacy path for the fallback dialog: works inside a user click even where the async API is blocked.
export function copyFromTextarea(textarea, doc = globalThis.document) {
  textarea.focus();
  textarea.select();
  try {
    return doc.execCommand('copy') === true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run tests/unit/clipboard.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/clipboard.js tests/unit/clipboard.test.js
git commit -m "feat: add clipboard helpers with safe fallbacks"
```

---

### Task 9: Store images (manifest, fallbacks, fetch script)

**Files:**
- Create: `src/data/images.json`, `src/lib/images.js`, `tests/unit/images.test.js`, `scripts/fetch-images.mjs`, `public/assets/CREDITS.md` (generated)

**Interfaces:**
- Consumes: `escapeHtml` (Task 1), `Store` shape (Task 4).
- Produces:
  - `initialsTile(store, cls): string`
  - `storeLogoHtml(store, cls = 'store-logo'): string`, an `<img data-fallback=…>` if the manifest has the logo, otherwise the initials tile
  - `itemImageHtml(item, cls = 'item-img'): string`, an `<img>` or an emoji tile
  - `installImageFallback(doc = document): void`, which swaps broken `<img data-fallback>` for its fallback HTML
  - `images.json` shape: `{ "stores": { [storeId]: "/assets/…" }, "items": { [itemId]: "/assets/…" } }`

- [ ] **Step 1: Create the default manifest `src/data/images.json`**

```json
{
  "stores": {},
  "items": {}
}
```

- [ ] **Step 2: Write the failing test `tests/unit/images.test.js`**

```js
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/data/images.json', () => ({
  default: { stores: { 'jollibee-sariaya': '/assets/stores/jollibee-sariaya/logo.png' }, items: { yumburger: '/assets/y.png' } },
}));

const { initialsTile, storeLogoHtml, itemImageHtml } = await import('../../src/lib/images.js');
const { getStore } = await import('../../src/data/stores.js');

describe('images', () => {
  it('initials tile uses the store colours and hides from screen readers', () => {
    const html = initialsTile(getStore('bukid-amyr'), 'x');
    expect(html).toContain('>BA<');
    expect(html).toContain('background:#3E7B27');
    expect(html).toContain('aria-hidden="true"');
  });

  it('uses the manifest logo with an initials fallback attached', () => {
    const html = storeLogoHtml(getStore('jollibee-sariaya'), 'logo');
    expect(html).toContain('src="/assets/stores/jollibee-sariaya/logo.png"');
    expect(html).toContain('alt="Jollibee Sariaya logo"');
    expect(html).toContain('data-fallback="&lt;span');
  });

  it('falls back to initials when no logo exists', () => {
    expect(storeLogoHtml(getStore('mcdonalds-sariaya'), 'logo')).toContain('>MC<');
  });

  it('menu items use the manifest photo or an emoji tile', () => {
    const [chickenjoy, , yumburger] = getStore('jollibee-sariaya').menu;
    expect(itemImageHtml(yumburger, 'i')).toContain('src="/assets/y.png"');
    expect(itemImageHtml(chickenjoy, 'i')).toContain('🍗');
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run tests/unit/images.test.js`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement `src/lib/images.js`**

```js
import manifest from '../data/images.json';
import { escapeHtml } from './html.js';

export function initialsTile(store, cls) {
  return `<span class="${cls} tile" style="background:${store.color};color:${store.textColor}" aria-hidden="true">${escapeHtml(store.initials)}</span>`;
}

const emojiTile = (emoji, cls) => `<span class="${cls} tile" aria-hidden="true">${emoji}</span>`;

const imgWithFallback = (src, alt, cls, fallback) =>
  `<img class="${cls}" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" data-fallback="${escapeHtml(fallback)}">`;

export function storeLogoHtml(store, cls = 'store-logo') {
  const tile = initialsTile(store, cls);
  const src = manifest.stores?.[store.id];
  return src ? imgWithFallback(src, `${store.name} logo`, cls, tile) : tile;
}

export function itemImageHtml(item, cls = 'item-img') {
  const tile = emojiTile(item.emoji, cls);
  const src = manifest.items?.[item.id];
  return src ? imgWithFallback(src, item.name, cls, tile) : tile;
}

export function installImageFallback(doc = document) {
  doc.addEventListener('error', (event) => {
    const img = event.target;
    if (img instanceof HTMLImageElement && img.dataset.fallback) img.outerHTML = img.dataset.fallback;
  }, true);
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npx vitest run tests/unit/images.test.js`
Expected: PASS.

- [ ] **Step 6: Create `scripts/fetch-images.mjs`**

```js
// One-off: fetch brand logos and demo food photos from Wikimedia Commons, record credits,
// and write src/data/images.json. Files the owner already saved (…/<name>.png) always win.
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const UA = 'pakisuyo-express-landing/0.1 (one-off build script; private pitch)';
const ROOT = new URL('../public/assets/', import.meta.url);

// search: a Wikimedia Commons query. Set to null to skip (the page falls back to a tile).
const TARGETS = [
  { kind: 'stores', id: 'jollibee-sariaya', file: 'stores/jollibee-sariaya/logo', search: 'Jollibee logo' },
  { kind: 'stores', id: 'mcdonalds-sariaya', file: 'stores/mcdonalds-sariaya/logo', search: "McDonald's Golden Arches logo" },
  { kind: 'stores', id: 'dunkin-sariaya', file: 'stores/dunkin-sariaya/logo', search: "Dunkin' logo" },
  { kind: 'stores', id: 'max-mango', file: 'stores/max-mango/logo', search: 'Max Mango logo' },
  { kind: 'items', id: 'chickenjoy-rice', file: 'stores/jollibee-sariaya/items/chickenjoy-rice', search: 'Jollibee Chickenjoy' },
  { kind: 'items', id: 'jolly-spaghetti', file: 'stores/jollibee-sariaya/items/jolly-spaghetti', search: 'Jollibee spaghetti' },
  { kind: 'items', id: 'yumburger', file: 'stores/jollibee-sariaya/items/yumburger', search: 'Jollibee Yumburger' },
  { kind: 'items', id: 'coke-float', file: 'stores/jollibee-sariaya/items/coke-float', search: 'Coke float' },
];

const exists = (url) => access(url).then(() => true, () => false);
const stripHtml = (s = '') => s.replace(/<[^>]*>/g, '').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function searchCommons(query) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search', gsrnamespace: '6', gsrsearch: query, gsrlimit: '8',
    prop: 'imageinfo', iiprop: 'url|mime|extmetadata', iiurlwidth: '512',
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Commons responded ${res.status}`);
  const pages = Object.values((await res.json()).query?.pages ?? {}).sort((a, b) => a.index - b.index);
  return pages
    .map((p) => ({ title: p.title, info: p.imageinfo?.[0] }))
    .find((p) => p.info && /^image\/(png|jpeg|svg\+xml)$/.test(p.info.mime));
}

const manifest = { stores: {}, items: {} };
const credits = [];

for (const t of TARGETS) {
  const own = new URL(`${t.file}.png`, ROOT);
  if (await exists(own)) {
    manifest[t.kind][t.id] = `/assets/${t.file}.png`;
    credits.push(`- \`${t.file}.png\` — supplied by the project owner`);
    console.log(`✓ ${t.id}: using owner-supplied file`);
    continue;
  }
  if (!t.search) continue;

  const hit = await searchCommons(t.search);
  if (!hit) {
    console.warn(`✗ ${t.id}: nothing found for "${t.search}" — the page will use a fallback tile`);
    continue;
  }
  const src = hit.info.thumburl ?? hit.info.url;
  const ext = (src.match(/\.(png|jpe?g)(?:$|\?)/i)?.[1] ?? 'png').toLowerCase().replace('jpeg', 'jpg');
  const out = new URL(`${t.file}.${ext}`, ROOT);
  await mkdir(dirname(fileURLToPath(out)), { recursive: true });
  const img = await fetch(src, { headers: { 'User-Agent': UA } });
  if (!img.ok) {
    console.warn(`✗ ${t.id}: download failed (${img.status})`);
    continue;
  }
  await writeFile(out, Buffer.from(await img.arrayBuffer()));
  manifest[t.kind][t.id] = `/assets/${t.file}.${ext}`;
  const meta = hit.info.extmetadata ?? {};
  credits.push(`- \`${t.file}.${ext}\` — [${hit.title}](${hit.info.descriptionurl}) · ${stripHtml(meta.Artist?.value) || 'unknown author'} · ${meta.LicenseShortName?.value ?? 'see source'}`);
  console.log(`✓ ${t.id}: ${hit.title}`);
  await sleep(500);
}

await writeFile(new URL('../src/data/images.json', import.meta.url), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(new URL('CREDITS.md', ROOT), [
  '# Image credits',
  '',
  'Brand logos and brand food photos are for the private pitch only — replace them before any public launch (spec §9).',
  '',
  ...credits,
  '',
].join('\n'));
```

- [ ] **Step 7: Run it and check every image by eye**

Run: `npm run fetch:images`
Expected: a ✓ or ✗ line per target. Then **open every downloaded file** under `public/assets/stores/` and check it's the right brand or dish. For each wrong one: delete the file, change its `search` to a better query (or `null`), and re-run. Wrong images are worse than tiles.

- [ ] **Step 8: Run all unit tests**

Run: `npm test`
Expected: PASS (all files so far).

- [ ] **Step 9: Commit**

```bash
git add src/data/images.json src/lib/images.js tests/unit/images.test.js scripts/fetch-images.mjs public/assets
git commit -m "feat: add store logos and food photos with tile fallbacks"
```

---

### Task 10: Page sections (header, hero, restaurants, how it works, coverage, footer) + e2e setup

**Files:**
- Create: `src/sections/header.js`, `src/sections/hero.js`, `src/sections/restaurants.js`, `src/sections/how-it-works.js`, `src/sections/coverage.js`, `src/sections/footer.js`, `src/styles/sections.css`, `playwright.config.js`, `tests/e2e/page.spec.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `logoHorizontal`, `logoStacked` (Task 2); `getHoursStatus` (Task 5); `STORES`, `COVERAGE`, `SARIAYA_DELIVERY_FEE` (Task 4); `MESSENGER_URL`, `FACEBOOK_URL`, `SELECT_STORE_EVENT` (Task 4); `peso` (Task 4); `storeLogoHtml`, `installImageFallback` (Task 9); `escapeHtml` (Task 1).
- Produces: `renderHeader(el)`, `renderHero(el, { now }?)`, `renderRestaurants(el)`, `renderHowItWorks(el)`, `renderCoverage(el)`, `renderFooter(el)`. Store cards dispatch `document`-level `CustomEvent(SELECT_STORE_EVENT, { detail: { storeId } })`.

- [ ] **Step 1: Install Playwright and Chromium**

Run:
```bash
npm install -D @playwright/test
npx playwright install chromium
```
Expected: Chromium downloads. Fedora isn't an officially supported host: if the install complains about host requirements, re-run with `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 npx playwright install chromium`.

- [ ] **Step 2: Create `playwright.config.js`**

```js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  use: {
    ...devices['Pixel 7'],
    baseURL: 'http://localhost:4173',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 3: Write the failing e2e test `tests/e2e/page.spec.js`**

```js
import { test, expect } from '@playwright/test';

test.describe('page', () => {
  test('hero shows the tagline and calls to action', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Always ready for your Pakisuyo!');
    await expect(page.getByRole('link', { name: 'Message us' })).toHaveAttribute('href', 'https://m.me/PakisuyoExpressSariaya');
  });

  test('has no horizontal scroll on a phone', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('lists the featured restaurants', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('#restaurants .store-card');
    await expect(cards).toHaveCount(7);
    await expect(cards.first()).toContainText('Jollibee Sariaya');
  });

  test('mobile menu opens and closes', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Menu' });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.locator('#site-nav').getByRole('link', { name: 'How it works' }).click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});

test.describe('hours badge uses Manila time on a foreign device', () => {
  test.use({ timezoneId: 'America/Los_Angeles' });

  test('9PM in Manila is closed even though it is morning in LA', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-03T13:00:00Z')); // 21:00 Manila, 06:00 LA
    await page.goto('/');
    await expect(page.getByTestId('hours-badge')).toContainText('Closed now — opens 8AM');
  });

  test('10AM in Manila is open even though it is evening in LA', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-03T02:00:00Z')); // 10:00 Manila, 19:00 LA
    await page.goto('/');
    await expect(page.getByTestId('hours-badge')).toContainText('Open today 8AM–7PM');
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npx playwright test tests/e2e/page.spec.js`
Expected: FAIL (no heading, because sections aren't rendered yet).

- [ ] **Step 5: Create `src/sections/header.js`**

```js
import { logoHorizontal } from '../brand/logo.js';

const LINKS = [
  ['#restaurants', 'Restaurants'],
  ['#how', 'How it works'],
  ['#order', 'Order'],
  ['#app', 'App'],
];

export function renderHeader(el) {
  el.className = 'site-header';
  el.innerHTML = `
    <div class="container site-header__inner">
      <a href="#hero" class="site-header__brand" aria-label="Pakisuyo Express — back to top">${logoHorizontal({ size: 36 })}</a>
      <nav class="site-nav" id="site-nav" aria-label="Main">
        ${LINKS.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}
      </nav>
      <a class="btn btn--primary site-header__cta" href="#order">Order Now</a>
      <button class="site-header__toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Menu">☰</button>
    </div>`;

  const toggle = el.querySelector('.site-header__toggle');
  const nav = el.querySelector('#site-nav');
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });
}
```

- [ ] **Step 6: Create `src/sections/hero.js`**

```js
import { logoStacked } from '../brand/logo.js';
import { getHoursStatus } from '../lib/hours.js';
import { MESSENGER_URL } from '../data/contact.js';

export function renderHero(el, { now = new Date() } = {}) {
  const hours = getHoursStatus(now);
  el.className = 'hero';
  el.innerHTML = `
    <div class="container hero__inner">
      <div class="hero__copy">
        <span class="pill ${hours.isOpen ? 'pill--open' : 'pill--closed'}" data-testid="hours-badge">● ${hours.label}</span>
        <h1 class="hero__title">Always ready for your <span class="hero__accent">Pakisuyo!</span></h1>
        <p class="hero__sub">Food and drinks from your favourite spots, delivered anywhere in Sariaya.</p>
        <div class="hero__ctas">
          <a class="btn btn--primary" href="#order">Order Now</a>
          <a class="btn btn--light" href="${MESSENGER_URL}" target="_blank" rel="noopener">Message us</a>
        </div>
      </div>
      <div class="hero__visual" aria-hidden="true">
        <div class="hero__card">${logoStacked({ size: 96 })}</div>
        <span class="bubble bubble--1">🍗 Chickenjoy</span>
        <span class="bubble bubble--2">🧋 Milk tea</span>
        <span class="bubble bubble--3">🍰 Ube cake</span>
      </div>
    </div>`;
}
```

- [ ] **Step 7: Create `src/sections/restaurants.js`**

```js
import { STORES } from '../data/stores.js';
import { SELECT_STORE_EVENT } from '../data/contact.js';
import { storeLogoHtml } from '../lib/images.js';
import { escapeHtml } from '../lib/html.js';

export function renderRestaurants(el) {
  el.className = 'section restaurants';
  el.innerHTML = `
    <div class="container">
      <h2 class="section-title">Featured restaurants</h2>
      <p class="section-lead">Tap a store to start your order.</p>
      <ul class="store-grid">
        ${STORES.map((s) => `
          <li>
            <button type="button" class="store-card" data-store-id="${s.id}">
              ${storeLogoHtml(s, 'store-card__logo')}
              <span class="store-card__name">${escapeHtml(s.name)}</span>
              <span class="store-card__meta">${escapeHtml(s.categoryLabel)} · ${escapeHtml(s.town)}</span>
            </button>
          </li>`).join('')}
      </ul>
      <p class="restaurants__note">Don't see your store? We can pick up from almost anywhere — just ask.</p>
    </div>`;

  el.addEventListener('click', (e) => {
    const card = e.target.closest('[data-store-id]');
    if (!card) return;
    document.dispatchEvent(new CustomEvent(SELECT_STORE_EVENT, { detail: { storeId: card.dataset.storeId } }));
  });
}
```

- [ ] **Step 8: Create `src/sections/how-it-works.js`**

```js
const STEPS = [
  ['🏪', 'Choose your store', 'Pick from our featured restaurants — or any store you like.'],
  ['📝', 'Place your order', 'Fill in the order form. We copy it for you to send on Messenger.'],
  ['💳', 'Pay your way', 'Cash on Delivery, GCash, Maya or Card.'],
  ['🛵', 'Track your rider', 'We keep you posted from Preparing to Out for Delivery.'],
];

export function renderHowItWorks(el) {
  el.className = 'section how';
  el.innerHTML = `
    <div class="container">
      <h2 class="section-title">How it works</h2>
      <p class="section-lead">Four steps from craving to doorstep.</p>
      <ol class="steps">
        ${STEPS.map(([icon, title, text]) => `
          <li class="step">
            <span class="step__icon" aria-hidden="true">${icon}</span>
            <h3 class="step__title">${title}</h3>
            <p class="step__text">${text}</p>
          </li>`).join('')}
      </ol>
    </div>`;
}
```

- [ ] **Step 9: Create `src/sections/coverage.js`**

```js
import { COVERAGE, SARIAYA_DELIVERY_FEE } from '../data/stores.js';
import { MESSENGER_URL } from '../data/contact.js';
import { peso } from '../lib/cart.js';

const listOf = (items) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : items[0]);

export function renderCoverage(el) {
  el.className = 'section coverage';
  el.innerHTML = `
    <div class="container">
      <h2 class="section-title">Where we deliver</h2>
      <p class="section-lead">We pick up from stores in ${listOf(COVERAGE.pickupTowns)} and deliver within ${COVERAGE.deliveryArea}.</p>
      <div class="coverage__grid">
        <div class="info-card"><h3>🕗 Hours</h3><p>Open daily, 8AM–7PM</p></div>
        <div class="info-card"><h3>🛵 Delivery fee</h3><p>${peso(SARIAYA_DELIVERY_FEE)} for stores within Sariaya. Out-of-town stores: confirmed by our team.</p></div>
        <div class="info-card"><h3>💬 Questions?</h3><p><a href="${MESSENGER_URL}" target="_blank" rel="noopener">Message us on Messenger</a></p></div>
      </div>
    </div>`;
}
```

- [ ] **Step 10: Create `src/sections/footer.js`**

```js
import { logoStacked } from '../brand/logo.js';
import { MESSENGER_URL, FACEBOOK_URL } from '../data/contact.js';

export function renderFooter(el) {
  el.className = 'site-footer';
  el.innerHTML = `
    <div class="container site-footer__inner">
      ${logoStacked({ tone: 'dark', size: 56 })}
      <div>
        <p>Always ready for your Pakisuyo! · Est. 2022</p>
        <p>#PakisuyoExpressSince2022</p>
        <p>Open daily 8AM–7PM · Sariaya, Quezon</p>
      </div>
      <p>
        <a href="${MESSENGER_URL}" target="_blank" rel="noopener">Messenger</a> ·
        <a href="${FACEBOOK_URL}" target="_blank" rel="noopener">Facebook</a>
      </p>
    </div>`;
}
```

- [ ] **Step 11: Create `src/styles/sections.css`**

```css
/* Header */
.site-header { position: sticky; top: 0; z-index: 50; background: var(--brand-yellow); box-shadow: 0 1px 0 rgba(0, 0, 0, .06); }
.site-header__inner { display: flex; align-items: center; gap: 12px; min-height: 64px; position: relative; }
.site-header__brand { text-decoration: none; margin-right: auto; }
.site-nav { display: none; }
.site-nav a { font-weight: 600; text-decoration: none; padding: 10px 12px; border-radius: 8px; }
.site-nav a:hover { background: rgba(0, 0, 0, .06); }
.site-nav.is-open { display: flex; flex-direction: column; position: absolute; top: 64px; left: 0; right: 0; background: var(--brand-yellow); padding: 8px var(--gutter) 16px; box-shadow: 0 8px 16px rgba(0, 0, 0, .08); }
.site-header__cta { min-height: 40px; padding: 8px 16px; }
.site-header__toggle { width: 44px; height: 44px; border: 0; background: transparent; font-size: 1.5rem; cursor: pointer; }
@media (min-width: 860px) {
  .site-nav, .site-nav.is-open { display: flex; position: static; flex-direction: row; gap: 4px; padding: 0; box-shadow: none; }
  .site-header__toggle { display: none; }
}

/* Hero */
.hero { background: var(--brand-yellow); padding: 32px 0 56px; overflow: hidden; }
.hero__inner { display: grid; gap: 32px; align-items: center; }
@media (min-width: 860px) { .hero__inner { grid-template-columns: 1.1fr .9fr; } }
.pill { display: inline-flex; align-items: center; gap: 6px; border-radius: var(--radius-pill); padding: 6px 12px; font-size: .85rem; font-weight: 700; }
.pill--open { background: var(--ink); color: var(--brand-yellow); }
.pill--closed { background: var(--surface); color: var(--ink); }
.hero__title { font-size: clamp(2.4rem, 8vw, 4rem); font-weight: 800; line-height: 1.02; letter-spacing: -.035em; margin: 16px 0 12px; }
.hero__accent { color: var(--brand-red); }
.hero__sub { font-size: 1.1rem; max-width: 36ch; margin: 0 0 24px; }
.hero__ctas { display: flex; flex-wrap: wrap; gap: 12px; }
.hero__visual { position: relative; display: flex; justify-content: center; padding: 32px 8px; }
.hero__card { background: var(--surface); border-radius: 32px; padding: 36px 44px; box-shadow: 0 20px 40px rgba(0, 0, 0, .12); }
.bubble { position: absolute; background: var(--surface); border-radius: var(--radius-pill); padding: 8px 14px; font-weight: 700; font-size: .9rem; box-shadow: var(--shadow-card); animation: float 4s ease-in-out infinite; white-space: nowrap; }
.bubble--1 { top: 0; left: 2%; }
.bubble--2 { bottom: 4%; left: 0; animation-delay: -1.3s; }
.bubble--3 { top: 30%; right: 0; animation-delay: -2.6s; }
@keyframes float { 50% { transform: translateY(-8px); } }

/* Restaurants */
.store-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
.store-card { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 14px; border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--surface); text-align: left; cursor: pointer; transition: transform .15s, box-shadow .15s; }
.store-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-card); }
.store-card__logo { width: 56px; height: 56px; border-radius: 14px; object-fit: contain; font-size: 1.1rem; }
.store-card__name { font-weight: 800; line-height: 1.25; }
.store-card__meta { color: var(--ink-muted); font-size: .85rem; }
.restaurants__note { margin: 20px 0 0; color: var(--ink-muted); }

/* How it works */
.how { background: var(--surface-muted); }
.steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.step { background: var(--surface); border-radius: var(--radius-card); padding: 20px; box-shadow: var(--shadow-card); }
.step__icon { font-size: 1.8rem; }
.step__title { font-size: 1.05rem; font-weight: 800; margin: 8px 0 4px; }
.step__text { margin: 0; color: var(--ink-muted); }

/* Coverage */
.coverage__grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.info-card { border: 1px solid var(--line); border-radius: var(--radius-card); padding: 20px; }
.info-card h3 { margin: 0 0 6px; font-size: 1.05rem; }
.info-card p { margin: 0; color: var(--ink-muted); }

/* Footer */
.site-footer { background: var(--ink); color: var(--surface); padding: 40px 0; }
.site-footer__inner { display: grid; gap: 20px; justify-items: start; }
@media (min-width: 860px) { .site-footer__inner { grid-template-columns: auto 1fr auto; align-items: center; } }
.site-footer p { margin: 0; color: #CFCFCF; }
.site-footer a { color: var(--brand-yellow); }
```

- [ ] **Step 12: Wire the sections in `src/main.js`**

```js
import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import { renderHeader } from './sections/header.js';
import { renderHero } from './sections/hero.js';
import { renderRestaurants } from './sections/restaurants.js';
import { renderHowItWorks } from './sections/how-it-works.js';
import { renderCoverage } from './sections/coverage.js';
import { renderFooter } from './sections/footer.js';
import { installImageFallback } from './lib/images.js';

const $ = (id) => document.getElementById(id);

installImageFallback(document);
renderHeader($('site-header'));
renderHero($('hero'));
renderRestaurants($('restaurants'));
renderHowItWorks($('how'));
renderCoverage($('coverage'));
renderFooter($('site-footer'));
```

- [ ] **Step 13: Run the e2e tests to verify they pass**

Run: `npx playwright test tests/e2e/page.spec.js`
Expected: PASS (6 tests).

- [ ] **Step 14: Look at it**

Run: `npm run dev`, open the printed URL in Firefox, and check it at phone width (Ctrl+Shift+M, 360px) and at desktop width. Compare with the approved style A mockup.

- [ ] **Step 15: Commit**

```bash
git add src/sections src/styles/sections.css src/main.js playwright.config.js tests/e2e/page.spec.js package.json package-lock.json
git commit -m "feat: add header, hero, restaurants, how-it-works, coverage and footer"
```

---

### Task 11: Order form with map pin and Messenger hand-off

**Files:**
- Create: `src/sections/order-form.js`, `src/sections/order-map.js`, `tests/e2e/order.spec.js`
- Modify: `src/styles/sections.css` (append form styles), `src/main.js`

**Interfaces:**
- Consumes: `STORES` (Task 4), `PAYMENT_METHODS` (Task 3), `validateOrder`, `FIELD_ORDER` (Task 3), `buildOrderMessage` (Task 7), `copyText`, `copyFromTextarea` (Task 8), `SARIAYA_CENTER`, `isInsideSariaya`, `reverseGeocode`, `shouldAutofill` (Task 6), `latestOnly` (Task 6), `MESSENGER_URL`, `SELECT_STORE_EVENT` (Task 4), `escapeHtml` (Task 1).
- Produces: `renderOrderForm(el)`, `createOrderMap({ mapEl, statusEl, warningEl, onPin }) → { ensure(): Promise<void>, setPin(lat, lng, { pan }?): Promise<void>, locate(): void }`.

- [ ] **Step 1: Write the failing e2e test `tests/e2e/order.spec.js`**

```js
import { test, expect } from '@playwright/test';

const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=', 'base64');
const LUCENA = { latitude: 13.9311, longitude: 121.6173 };

test.beforeEach(async ({ context }) => {
  await context.route('https://m.me/**', (r) => r.fulfill({ contentType: 'text/html', body: '<title>Messenger stub</title>' }));
  await context.route('https://tile.openstreetmap.org/**', (r) => r.fulfill({ contentType: 'image/png', body: PNG_1PX }));
  await context.route('https://nominatim.openstreetmap.org/**', (r) =>
    r.fulfill({ json: { address: { road: 'Rizal St', village: 'Poblacion', town: 'Sariaya' }, display_name: 'Rizal St' } }));
});

async function fillValidOrder(page) {
  await page.getByLabel(/^Name/).fill('Juan Dela Cruz');
  await page.getByLabel('Contact Number').fill('+63 917-123-4567');
  await page.getByLabel('Exact Address').fill('123 Rizal St, Poblacion');
  await page.getByLabel('Landmark').fill('Blue gate beside the chapel');
  await page.getByLabel('Store/s').selectOption('jollibee-sariaya');
  await page.getByLabel('Order List').fill('1 Chickenjoy bucket');
  await page.locator('label.chip', { hasText: 'GCash' }).click();
}

test('sends a complete order: copies the message and opens Messenger', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/#order');
  await fillValidOrder(page);

  const popup = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Send Order' }).click();
  expect((await popup).url()).toContain('m.me/PakisuyoExpressSariaya');

  await page.bringToFront();
  await expect(page.getByRole('status')).toContainText('Order copied!');
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toBe([
    'NEW ORDER – Pakisuyo Express',
    'Name: Juan Dela Cruz',
    'Exact Address: 123 Rizal St, Poblacion',
    'Landmark: Blue gate beside the chapel',
    'Contact Number: 0917 123 4567',
    'Store/s: Jollibee Sariaya',
    'Order List: 1 Chickenjoy bucket',
    'Payment: GCash',
  ].join('\n'));
});

test('shows errors and focuses the first missing field', async ({ page, context }) => {
  await page.goto('/#order');
  let opened = false;
  context.on('page', () => { opened = true; });
  await page.getByRole('button', { name: 'Send Order' }).click();
  await expect(page.getByLabel(/^Name/)).toBeFocused();
  await expect(page.locator('#err-name')).toHaveText('Please enter your name.');
  await expect(page.locator('#err-payment')).toHaveText('Please choose how you will pay.');
  expect(opened).toBe(false);
});

test('falls back to a copy dialog when the clipboard is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) } });
  });
  await page.goto('/#order');
  await fillValidOrder(page);
  await page.getByRole('button', { name: 'Send Order' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('textarea')).toHaveValue(/NEW ORDER – Pakisuyo Express/);
  await expect(dialog.getByRole('link', { name: 'Open Messenger' })).toHaveAttribute('href', 'https://m.me/PakisuyoExpressSariaya');
});

test('tapping a restaurant card preselects the store', async ({ page }) => {
  await page.goto('/');
  await page.locator('#restaurants .store-card', { hasText: "Dunkin' Sariaya" }).click();
  await expect(page.getByLabel('Store/s')).toHaveValue('dunkin-sariaya');
});

test('"Other" store asks for a typed store name', async ({ page }) => {
  await page.goto('/#order');
  await page.getByLabel('Store/s').selectOption('other');
  await expect(page.getByLabel('Store name')).toBeVisible();
});

test.describe('location', () => {
  test.use({ geolocation: LUCENA, permissions: ['geolocation'] });

  test('GPS pin outside Sariaya warns but still allows the order, and adds the pin link', async ({ page, context }) => {
    await context.grantPermissions(['geolocation', 'clipboard-read', 'clipboard-write']);
    await page.goto('/#order');
    await page.getByRole('button', { name: /Use my current location/ }).click();
    await expect(page.getByText("Looks like you're outside our delivery area")).toBeVisible();
    await expect(page.getByLabel('Exact Address')).toHaveValue('Rizal St, Poblacion, Sariaya'); // autofilled (was empty)

    await fillValidOrder(page);
    const popup = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Send Order' }).click();
    await popup;
    await page.bringToFront();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain('📍 Pin: https://maps.google.com/?q=13.931100,121.617300');
  });

  test('never overwrites an address the customer already typed', async ({ page }) => {
    await page.goto('/#order');
    await page.getByLabel('Exact Address').fill('Purok 3, beside the chapel');
    await page.getByRole('button', { name: /Use my current location/ }).click();
    await expect(page.getByText(/Pin set/)).toBeVisible();
    await page.waitForTimeout(1500); // longer than the lookup debounce
    await expect(page.getByLabel('Exact Address')).toHaveValue('Purok 3, beside the chapel');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test tests/e2e/order.spec.js`
Expected: FAIL (there's no form yet).

- [ ] **Step 3: Create `src/sections/order-map.js`**

```js
import { SARIAYA_CENTER, isInsideSariaya } from '../lib/geo.js';

export function createOrderMap({ mapEl, statusEl, warningEl, onPin }) {
  let L;
  let map;
  let marker;
  let ready;

  function ensure() {
    ready ??= (async () => {
      L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      map = L.map(mapEl, { scrollWheelZoom: false }).setView([SARIAYA_CENTER.lat, SARIAYA_CENTER.lng], 15);
      const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      let loaded = 0;
      let failed = 0;
      tiles.on('tileload', () => { loaded += 1; });
      tiles.on('tileerror', () => {
        failed += 1;
        if (!loaded && failed >= 3) {
          mapEl.hidden = true;
          statusEl.textContent = "The map couldn't load — just type your address and landmark below.";
        }
      });
      map.on('click', (e) => setPin(e.latlng.lat, e.latlng.lng));
    })();
    return ready;
  }

  function update(lat, lng) {
    warningEl.hidden = isInsideSariaya(lat, lng);
    statusEl.textContent = 'Pin set. Drag it if it’s not exactly at your gate.';
    onPin({ lat, lng });
  }

  async function setPin(lat, lng, { pan = false } = {}) {
    await ensure();
    if (!marker) {
      marker = L.marker([lat, lng], {
        draggable: true,
        keyboard: true,
        title: 'Your delivery pin',
        icon: L.divIcon({ className: 'order-pin', html: '<span></span>', iconSize: [28, 40], iconAnchor: [14, 40] }),
      }).addTo(map);
      marker.on('dragend', () => {
        const p = marker.getLatLng();
        update(p.lat, p.lng);
      });
    } else {
      marker.setLatLng([lat, lng]);
    }
    if (pan) map.setView([lat, lng], 17);
    update(lat, lng);
  }

  function locate() {
    if (!('geolocation' in navigator)) {
      statusEl.textContent = "Your browser can't share location — tap the map to drop a pin instead.";
      return;
    }
    statusEl.textContent = 'Finding you…';
    navigator.geolocation.getCurrentPosition(
      (pos) => setPin(pos.coords.latitude, pos.coords.longitude, { pan: true }),
      () => {
        statusEl.textContent = "Couldn't get your location — tap the map to drop a pin instead.";
        ensure();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  return { ensure, setPin, locate };
}
```

- [ ] **Step 4: Create `src/sections/order-form.js`**

```js
import { STORES } from '../data/stores.js';
import { PAYMENT_METHODS } from '../data/payments.js';
import { MESSENGER_URL, SELECT_STORE_EVENT } from '../data/contact.js';
import { validateOrder, FIELD_ORDER } from '../lib/validate.js';
import { buildOrderMessage } from '../lib/order-message.js';
import { copyText, copyFromTextarea } from '../lib/clipboard.js';
import { reverseGeocode, shouldAutofill } from '../lib/geo.js';
import { latestOnly } from '../lib/async.js';
import { escapeHtml } from '../lib/html.js';
import { createOrderMap } from './order-map.js';

const field = (name, label, control, { required = true, hidden = false } = {}) => `
  <div class="field${required ? ' field--required' : ''}" id="field-${name}"${hidden ? ' hidden' : ''}>
    <label for="f-${name}">${label}</label>
    ${control}
    <p class="field-error" id="err-${name}"></p>
  </div>`;

const control = (tag, name, attrs = '') => (tag === 'textarea'
  ? `<textarea id="f-${name}" name="${name}" aria-describedby="err-${name}" ${attrs}></textarea>`
  : `<input id="f-${name}" name="${name}" aria-describedby="err-${name}" ${attrs}>`);

function markup() {
  return `
    <div class="container order__inner">
      <div class="order__intro">
        <h2 class="section-title">Place your order</h2>
        <p class="section-lead">Fill this in and we'll copy it for you — just paste it in Messenger and hit send.</p>
      </div>
      <form class="order-form" novalidate>
        ${field('name', 'Name', control('input', 'name', 'autocomplete="name"'))}
        ${field('phone', 'Contact Number', control('input', 'phone', 'type="tel" inputmode="tel" autocomplete="tel" placeholder="0917 123 4567"'))}
        <fieldset class="field field--map">
          <legend>Delivery location</legend>
          <button type="button" class="btn btn--ghost" data-action="locate">📍 Use my current location</button>
          <div class="order-map" id="order-map" aria-label="Map — tap to drop a pin on your location"></div>
          <p class="hint" id="map-status" aria-live="polite">Tap the map to drop a pin. You can drag it to your exact gate.</p>
          <p class="warning" id="area-warning" hidden>Looks like you're outside our delivery area — message us to check.</p>
        </fieldset>
        ${field('address', 'Exact Address', control('input', 'address', 'autocomplete="street-address"'))}
        ${field('landmark', 'Landmark', control('input', 'landmark', 'placeholder="e.g. Blue gate beside the chapel"'))}
        ${field('storeId', 'Store/s', `
          <select id="f-storeId" name="storeId" aria-describedby="err-storeId">
            <option value="">Choose a store</option>
            ${STORES.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}
            <option value="other">Other (type it in)</option>
          </select>`)}
        ${field('storeOther', 'Store name', control('input', 'storeOther', 'placeholder="e.g. Aling Nena Bakery"'), { hidden: true })}
        ${field('orderList', 'Order List', control('textarea', 'orderList', 'rows="4" placeholder="e.g. 1 Chickenjoy bucket, 2 Coke Float"'))}
        <fieldset class="field field--required" id="field-payment" aria-describedby="err-payment">
          <legend>Payment method</legend>
          <div class="chips">
            ${PAYMENT_METHODS.map((m) => `
              <label class="chip"><input type="radio" name="payment" value="${m.id}"><span>${m.icon} ${m.short}</span></label>`).join('')}
          </div>
          <p class="field-error" id="err-payment"></p>
        </fieldset>
        ${field('notes', 'Notes (optional)', control('textarea', 'notes', 'rows="2" placeholder="e.g. Call when outside"'), { required: false })}
        <button type="submit" class="btn btn--primary order-form__submit">Send Order</button>
        <p class="hint">Payment is settled with our team in Messenger. Nothing is charged here.</p>
      </form>
    </div>
    <div class="toast" role="status" aria-live="polite" hidden></div>
    <dialog class="fallback" aria-labelledby="fallback-title">
      <h3 id="fallback-title">Copy your order</h3>
      <p class="hint">We couldn't copy it automatically. Copy the text below, then paste it in Messenger.</p>
      <textarea readonly aria-label="Your order message"></textarea>
      <div class="fallback__actions">
        <button type="button" class="btn btn--primary" data-action="fallback-copy">Copy</button>
        <a class="btn btn--light" href="${MESSENGER_URL}" target="_blank" rel="noopener">Open Messenger</a>
        <button type="button" class="btn btn--ghost" data-action="fallback-close">Close</button>
      </div>
    </dialog>`;
}

export function renderOrderForm(el) {
  el.className = 'section order';
  el.innerHTML = markup();

  const form = el.querySelector('form');
  const addressEl = form.elements.address;
  const storeSelect = form.elements.storeId;
  const storeOtherField = el.querySelector('#field-storeOther');
  const statusEl = el.querySelector('#map-status');
  const toast = el.querySelector('.toast');
  const dialog = el.querySelector('dialog');
  const dialogText = dialog.querySelector('textarea');

  let pin = null;
  let lastAutofilled = null;
  let lookupTimer;
  let toastTimer;
  const lookup = latestOnly((lat, lng) => reverseGeocode(lat, lng));

  const orderMap = createOrderMap({
    mapEl: el.querySelector('#order-map'),
    statusEl,
    warningEl: el.querySelector('#area-warning'),
    onPin: (p) => {
      pin = p;
      clearTimeout(lookupTimer);
      lookupTimer = setTimeout(async () => {
        const result = await lookup(p.lat, p.lng);
        if (result.stale) return;
        if (!result.value) {
          statusEl.textContent = "Couldn't look up address — please type it.";
          return;
        }
        if (shouldAutofill(addressEl.value, lastAutofilled)) {
          addressEl.value = result.value;
          lastAutofilled = result.value;
          setError('address', '');
        }
      }, 800);
    },
  });

  new IntersectionObserver((entries, observer) => {
    if (entries.some((e) => e.isIntersecting)) {
      observer.disconnect();
      orderMap.ensure();
    }
  }, { rootMargin: '300px' }).observe(el.querySelector('#order-map'));

  el.querySelector('[data-action="locate"]').addEventListener('click', () => orderMap.locate());

  function setError(name, message) {
    const err = el.querySelector(`#err-${name}`);
    if (err) err.textContent = message;
    form.querySelectorAll(`[name="${name}"]`).forEach((c) => {
      if (message) c.setAttribute('aria-invalid', 'true');
      else c.removeAttribute('aria-invalid');
    });
  }

  const syncStoreOther = () => { storeOtherField.hidden = storeSelect.value !== 'other'; };
  storeSelect.addEventListener('change', syncStoreOther);

  form.addEventListener('input', (e) => { if (e.target.name) setError(e.target.name, ''); });
  form.addEventListener('change', (e) => { if (e.target.name) setError(e.target.name, ''); });

  document.addEventListener(SELECT_STORE_EVENT, (e) => {
    storeSelect.value = e.detail.storeId;
    syncStoreOther();
    setError('storeId', '');
    el.scrollIntoView({ behavior: 'smooth' });
  });

  function readForm() {
    const data = new FormData(form);
    const get = (key) => String(data.get(key) ?? '');
    return {
      name: get('name'), phone: get('phone'), address: get('address'), landmark: get('landmark'),
      storeId: get('storeId'), storeOther: get('storeOther'), orderList: get('orderList'),
      payment: get('payment'), notes: get('notes'), pin,
    };
  }

  function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 5000);
  }

  function openFallback(message) {
    dialogText.value = message;
    dialog.showModal();
  }

  dialog.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'fallback-copy') {
      e.target.textContent = copyFromTextarea(dialogText) ? 'Copied!' : 'Select the text and copy it';
    }
    if (action === 'fallback-close') dialog.close();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = readForm();
    const { valid, errors } = validateOrder(data);
    for (const name of FIELD_ORDER) setError(name, errors[name] ?? '');
    if (!valid) {
      const first = FIELD_ORDER.find((name) => errors[name]);
      form.querySelector(`[name="${first}"]`)?.focus();
      return;
    }

    const message = buildOrderMessage(data);
    if (!(await copyText(message))) {
      openFallback(message);
      return;
    }
    const tab = window.open(MESSENGER_URL, '_blank');
    if (!tab) {
      openFallback(message); // pop-up blocked: the dialog has an Open Messenger link
      return;
    }
    tab.opener = null;
    showToast('Order copied! Paste it in Messenger and hit send.');
  });
}
```

- [ ] **Step 5: Append the form styles to `src/styles/sections.css`**

```css
/* Order form */
.order__inner { display: grid; gap: 24px; }
@media (min-width: 860px) { .order__inner { grid-template-columns: .8fr 1.2fr; align-items: start; } }
.order-form { display: grid; gap: 16px; background: var(--surface); border: 1px solid var(--line); border-radius: 20px; padding: 20px; }
.field { display: grid; gap: 6px; border: 0; margin: 0; padding: 0; min-width: 0; }
.field[hidden] { display: none; }
.field > label, .field > legend { font-weight: 700; padding: 0; margin-bottom: 6px; }
.field--required > label::after, .field--required > legend::after { content: ' *'; color: var(--brand-red); }
.field input, .field select, .field textarea { width: 100%; min-height: 44px; padding: 10px 12px; border: 1.5px solid #D9D9D9; border-radius: 12px; background: var(--surface); }
.field input:focus, .field select:focus, .field textarea:focus { border-color: var(--ink); outline: none; }
[aria-invalid="true"] { border-color: var(--danger) !important; }
.field-error { margin: 0; color: var(--danger); font-size: .85rem; }
.field-error:empty { display: none; }
.hint { margin: 0; color: var(--ink-muted); font-size: .85rem; }
.warning { margin: 0; background: var(--yellow-soft); border-radius: 10px; padding: 8px 12px; font-size: .9rem; font-weight: 600; }
.order-map { height: 220px; margin: 8px 0; border-radius: 14px; overflow: hidden; background: var(--surface-muted); z-index: 0; }
.order-pin span { display: block; width: 28px; height: 28px; background: var(--brand-red); border: 3px solid var(--surface); border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 2px 6px rgba(0, 0, 0, .35); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { position: relative; cursor: pointer; }
.chip input { position: absolute; inset: 0; opacity: 0; margin: 0; cursor: pointer; }
.chip span { display: inline-flex; align-items: center; min-height: 44px; padding: 8px 14px; border: 1.5px solid #D9D9D9; border-radius: 12px; font-weight: 600; }
.chip input:checked + span { border-color: var(--brand-red); background: #FFF0F0; }
.chip input:focus-visible + span { outline: 3px solid var(--ink); outline-offset: 2px; }
.order-form__submit { width: 100%; }
.toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 60; background: var(--ink); color: var(--surface); padding: 12px 18px; border-radius: 12px; font-weight: 600; width: max-content; max-width: calc(100% - 32px); box-shadow: 0 8px 24px rgba(0, 0, 0, .25); }
.toast[hidden] { display: none; }
.fallback { border: 0; border-radius: 20px; padding: 20px; width: min(480px, calc(100% - 32px)); }
.fallback::backdrop { background: rgba(0, 0, 0, .5); }
.fallback h3 { margin: 0 0 6px; }
.fallback textarea { width: 100%; min-height: 200px; margin-top: 12px; border: 1.5px solid #D9D9D9; border-radius: 12px; padding: 10px; font-size: .9rem; }
.fallback__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
```

- [ ] **Step 6: Wire it into `src/main.js`**

Add the import next to the other section imports:
```js
import { renderOrderForm } from './sections/order-form.js';
```
Add after `renderHowItWorks($('how'));`:
```js
renderOrderForm($('order'));
```

- [ ] **Step 7: Run the e2e tests to verify they pass**

Run: `npx playwright test tests/e2e/order.spec.js tests/e2e/page.spec.js`
Expected: PASS. If the clipboard test fails with "Document is not focused", check that `page.bringToFront()` comes before `readText()`.

- [ ] **Step 8: Try it by hand**

Run `npm run dev` and, in Firefox at phone width: submit an empty form, tap the map to drop a pin, drag the pin, choose "Other", and send a full order (Messenger opens and the paste contains the order).

- [ ] **Step 9: Commit**

```bash
git add src/sections/order-form.js src/sections/order-map.js src/styles/sections.css src/main.js tests/e2e/order.spec.js
git commit -m "feat: add order form with map pin and Messenger hand-off"
```

---

### Task 12: "Coming soon" app section with tap-through demo

**Files:**
- Create: `src/demo/state.js`, `src/demo/screens.js`, `src/demo/demo.js`, `src/sections/app-promo.js`, `src/styles/demo.css`, `tests/unit/demo-state.test.js`, `tests/e2e/demo.spec.js`
- Modify: `src/main.js`, `src/styles/sections.css` (append app-promo styles)

**Interfaces:**
- Consumes: `STORES`, `CATEGORIES`, `getStore`, `PROMO` (Task 4), `emptyCart`, `addItem`, `removeItem`, `itemCount`, `totals`, `peso` (Task 4), `PAYMENT_METHODS` (Task 3), `storeLogoHtml`, `itemImageHtml` (Task 9), `logoStacked` (Task 2), `escapeHtml` (Task 1).
- Produces:
  - `TRACKING_STEPS`, `DEMO_STORE_ID`, `initialState()`, `reducer(state, action)` (returns the **same object** when an action doesn't apply), `visibleStores(state, stores?)`, `isTrackingDone(state)`
  - `renderScreen(state): string`, `CAPTIONS: Record<screen, string>`
  - `mountDemo(root, { stepMs?, splashMs? }?) → { getState, dispatch }`
  - `renderAppPromo(el)`
  - Action types: `SKIP_SPLASH`, `SEARCH{query}`, `SET_CATEGORY{category}`, `OPEN_STORE{storeId}`, `ADD_ITEM{itemId}`, `REMOVE_ITEM{itemId}`, `GO_CHECKOUT`, `BACK`, `OPEN_SHEET`, `CLOSE_SHEET`, `SET_PAYMENT{payment}`, `APPLY_PROMO`, `PLACE_ORDER{orderNo}`, `ADVANCE_TRACKING`, `RESTART`.

- [ ] **Step 1: Write the failing test `tests/unit/demo-state.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { initialState, reducer, visibleStores, isTrackingDone, TRACKING_STEPS } from '../../src/demo/state.js';

const run = (actions, state = initialState()) => actions.reduce(reducer, state);
const toCheckout = [
  { type: 'SKIP_SPLASH' },
  { type: 'OPEN_STORE', storeId: 'jollibee-sariaya' },
  { type: 'ADD_ITEM', itemId: 'chickenjoy-rice' },
  { type: 'ADD_ITEM', itemId: 'coke-float' },
  { type: 'GO_CHECKOUT' },
];

describe('demo reducer — happy path', () => {
  it('walks splash → home → store → checkout → tracking → delivered', () => {
    let s = run(toCheckout);
    expect(s.screen).toBe('checkout');
    s = run([{ type: 'OPEN_SHEET' }, { type: 'SET_PAYMENT', payment: 'maya' }, { type: 'APPLY_PROMO' }], s);
    expect(s).toMatchObject({ payment: 'maya', sheetOpen: false, promoApplied: true });
    s = reducer(s, { type: 'PLACE_ORDER', orderNo: 'PX-1234' });
    expect(s).toMatchObject({ screen: 'tracking', trackingStep: 0, orderNo: 'PX-1234' });
    for (let i = 0; i < 10; i++) s = reducer(s, { type: 'ADVANCE_TRACKING' });
    expect(s.trackingStep).toBe(TRACKING_STEPS.length - 1); // capped at Delivered
    expect(isTrackingDone(s)).toBe(true);
  });
});

describe('demo reducer — button mashing (Review Focus 5)', () => {
  it('a second PLACE_ORDER is a no-op (same object)', () => {
    const placed = reducer(run(toCheckout), { type: 'PLACE_ORDER', orderNo: 'PX-1' });
    expect(reducer(placed, { type: 'PLACE_ORDER', orderNo: 'PX-2' })).toBe(placed);
  });

  it('cannot check out an empty cart', () => {
    const s = run([{ type: 'SKIP_SPLASH' }, { type: 'OPEN_STORE', storeId: 'jollibee-sariaya' }]);
    expect(reducer(s, { type: 'GO_CHECKOUT' })).toBe(s);
  });

  it('BACK from checkout keeps the cart and closes the sheet', () => {
    const s = run([...toCheckout, { type: 'OPEN_SHEET' }, { type: 'BACK' }]);
    expect(s).toMatchObject({ screen: 'store', sheetOpen: false });
    expect(s.cart.lines).toHaveLength(2);
  });

  it('opening a different store clears the cart and promo', () => {
    let s = run([...toCheckout, { type: 'APPLY_PROMO' }, { type: 'BACK' }, { type: 'BACK' }]);
    s = reducer(s, { type: 'OPEN_STORE', storeId: 'mcdonalds-sariaya' });
    expect(s.cart.lines).toEqual([]);
    expect(s.promoApplied).toBe(false);
  });

  it('reopening the same store keeps the cart', () => {
    const s = run([...toCheckout, { type: 'BACK' }, { type: 'BACK' }, { type: 'OPEN_STORE', storeId: 'jollibee-sariaya' }]);
    expect(s.cart.lines).toHaveLength(2);
  });

  it('RESTART mid-tracking resets everything and skips the splash', () => {
    const s = run([...toCheckout, { type: 'PLACE_ORDER', orderNo: 'PX-1' }, { type: 'ADVANCE_TRACKING' }, { type: 'RESTART' }]);
    expect(s).toEqual({ ...initialState(), screen: 'home' });
  });

  it('ignores unknown stores, items and payments', () => {
    const s = run(toCheckout);
    expect(reducer(s, { type: 'OPEN_STORE', storeId: 'nope' })).toBe(s);
    expect(reducer(s, { type: 'SET_PAYMENT', payment: 'bitcoin' })).toBe(s);
    const store = run(toCheckout.slice(0, 2));
    expect(reducer(store, { type: 'ADD_ITEM', itemId: 'nope' })).toBe(store);
  });

  it('ADVANCE_TRACKING outside tracking is a no-op', () => {
    const s = run(toCheckout);
    expect(reducer(s, { type: 'ADVANCE_TRACKING' })).toBe(s);
  });
});

describe('visibleStores', () => {
  it('filters by category and by search over names and menu items', () => {
    const base = { ...initialState(), screen: 'home' };
    expect(visibleStores({ ...base, category: 'cakes' }).map((s) => s.id)).toEqual(['contis']);
    expect(visibleStores({ ...base, query: 'spaghetti' }).map((s) => s.id)).toEqual(['jollibee-sariaya']);
    expect(visibleStores({ ...base, query: '  DUNKIN ' }).map((s) => s.id)).toEqual(['dunkin-sariaya']);
    expect(visibleStores({ ...base, query: 'zzz' })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/demo-state.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/demo/state.js`**

```js
import { STORES, getStore } from '../data/stores.js';
import { PAYMENT_METHODS } from '../data/payments.js';
import { emptyCart, addItem, removeItem, itemCount } from '../lib/cart.js';

export const TRACKING_STEPS = ['Order Placed', 'Preparing', 'Rider Assigned', 'Out for Delivery', 'Delivered'];
export const DEMO_STORE_ID = 'jollibee-sariaya';

export const initialState = () => ({
  screen: 'splash',
  query: '',
  category: 'all',
  storeId: null,
  cart: emptyCart(),
  payment: 'gcash',
  sheetOpen: false,
  promoApplied: false,
  trackingStep: 0,
  orderNo: null,
});

const BACK_TO = { store: 'home', checkout: 'store' };

// Returns the same state object when an action doesn't apply, so callers can skip re-rendering.
export function reducer(state, action) {
  switch (action.type) {
    case 'SKIP_SPLASH':
      return state.screen === 'splash' ? { ...state, screen: 'home' } : state;
    case 'SEARCH':
      return { ...state, query: action.query };
    case 'SET_CATEGORY':
      return { ...state, category: action.category };
    case 'OPEN_STORE': {
      if (!getStore(action.storeId)) return state;
      const same = action.storeId === state.storeId;
      return {
        ...state,
        screen: 'store',
        storeId: action.storeId,
        cart: same ? state.cart : emptyCart(),
        promoApplied: same ? state.promoApplied : false,
      };
    }
    case 'ADD_ITEM': {
      const item = getStore(state.storeId)?.menu.find((i) => i.id === action.itemId);
      return item ? { ...state, cart: addItem(state.cart, item) } : state;
    }
    case 'REMOVE_ITEM':
      return { ...state, cart: removeItem(state.cart, action.itemId) };
    case 'GO_CHECKOUT':
      return state.screen === 'store' && itemCount(state.cart) > 0 ? { ...state, screen: 'checkout' } : state;
    case 'BACK':
      return BACK_TO[state.screen] ? { ...state, screen: BACK_TO[state.screen], sheetOpen: false } : state;
    case 'OPEN_SHEET':
      return state.screen === 'checkout' ? { ...state, sheetOpen: true } : state;
    case 'CLOSE_SHEET':
      return state.sheetOpen ? { ...state, sheetOpen: false } : state;
    case 'SET_PAYMENT':
      return PAYMENT_METHODS.some((m) => m.id === action.payment)
        ? { ...state, payment: action.payment, sheetOpen: false }
        : state;
    case 'APPLY_PROMO':
      return state.screen === 'checkout' && !state.promoApplied ? { ...state, promoApplied: true } : state;
    case 'PLACE_ORDER':
      return state.screen === 'checkout' && itemCount(state.cart) > 0
        ? { ...state, screen: 'tracking', trackingStep: 0, orderNo: action.orderNo, sheetOpen: false }
        : state;
    case 'ADVANCE_TRACKING':
      return state.screen === 'tracking' && state.trackingStep < TRACKING_STEPS.length - 1
        ? { ...state, trackingStep: state.trackingStep + 1 }
        : state;
    case 'RESTART':
      return { ...initialState(), screen: 'home' };
    default:
      return state;
  }
}

export function visibleStores(state, stores = STORES) {
  const q = state.query.trim().toLowerCase();
  return stores.filter((s) => (state.category === 'all' || s.category === state.category)
    && (!q
      || s.name.toLowerCase().includes(q)
      || s.categoryLabel.toLowerCase().includes(q)
      || s.menu.some((i) => i.name.toLowerCase().includes(q))));
}

export const isTrackingDone = (state) => state.screen === 'tracking' && state.trackingStep === TRACKING_STEPS.length - 1;
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run tests/unit/demo-state.test.js`
Expected: PASS.

- [ ] **Step 5: Create `src/demo/screens.js`**

```js
import { CATEGORIES, PROMO, getStore } from '../data/stores.js';
import { PAYMENT_METHODS } from '../data/payments.js';
import { itemCount, totals, peso } from '../lib/cart.js';
import { storeLogoHtml, itemImageHtml } from '../lib/images.js';
import { logoStacked } from '../brand/logo.js';
import { escapeHtml } from '../lib/html.js';
import { visibleStores, isTrackingDone, TRACKING_STEPS, DEMO_STORE_ID } from './state.js';

export const CAPTIONS = {
  splash: 'Your brand, front and centre.',
  home: 'Replaces: “Available po ba si Jollibee?” — every store shows if it’s open.',
  store: 'Replaces: food posts on Facebook — now a menu customers can order from.',
  checkout: 'Replaces: typing out the order form and forwarding GCash details.',
  tracking: 'Replaces: “Preparing… Out for delivery…” messages sent by hand.',
};

const splash = () => `
  <button type="button" class="ds ds--splash" data-action="SKIP_SPLASH" aria-label="Skip intro">
    ${logoStacked({ tone: 'red', size: 72 })}
  </button>`;

const storeRow = (s) => `
  <li>
    <button type="button" class="ds-store" data-action="OPEN_STORE" data-store-id="${s.id}">
      ${storeLogoHtml(s, 'ds-row-logo')}
      <span><b>${escapeHtml(s.name)}</b>
        <span class="ds-meta">${escapeHtml(s.categoryLabel)} · ${s.eta} · <span class="ds-open">Open</span></span></span>
    </button>
  </li>`;

function home(state) {
  const stores = visibleStores(state);
  return `
    <div class="ds ds--home">
      <div class="ds-top">
        <p class="ds-deliver">📍 Deliver to <b>Poblacion, Sariaya</b></p>
        <p class="ds-greet">Hungry? We got you.</p>
        <label class="sr-only" for="demo-search">Search stores or food</label>
        <input id="demo-search" class="ds-search" type="search" placeholder="🔍 Search stores or food"
          value="${escapeHtml(state.query)}" data-focus-key="search" autocomplete="off">
        <div class="ds-chips" role="group" aria-label="Categories">
          ${CATEGORIES.map((c) => `
            <button type="button" class="ds-chip${state.category === c.id ? ' is-on' : ''}" data-action="SET_CATEGORY"
              data-category="${c.id}" aria-pressed="${state.category === c.id}">${c.label}</button>`).join('')}
        </div>
      </div>
      <ul class="ds-stores">
        ${stores.length ? stores.map(storeRow).join('') : `<li class="ds-empty">No stores match “${escapeHtml(state.query)}”.</li>`}
      </ul>
    </div>`;
}

function storeScreen(state) {
  const store = getStore(state.storeId);
  const count = itemCount(state.cart);
  const { subtotal } = totals(state.cart, store);
  const qty = (id) => state.cart.lines.find((l) => l.id === id)?.qty ?? 0;
  const menu = store.menu.length
    ? `<ul class="ds-menu">${store.menu.map((i) => `
        <li class="ds-item">
          ${itemImageHtml(i, 'ds-item-img')}
          <div class="ds-item-text"><b>${escapeHtml(i.name)}</b><span>${peso(i.price)}</span></div>
          <div class="ds-qty">
            ${qty(i.id) ? `<button type="button" class="ds-round ds-round--ghost" data-action="REMOVE_ITEM" data-item-id="${i.id}" aria-label="Remove one ${escapeHtml(i.name)}">−</button><span>${qty(i.id)}</span>` : ''}
            <button type="button" class="ds-round" data-action="ADD_ITEM" data-item-id="${i.id}" aria-label="Add ${escapeHtml(i.name)}">+</button>
          </div>
        </li>`).join('')}</ul>`
    : `<div class="ds-soon"><p>Menu coming soon for this store.</p>
        <button type="button" class="ds-btn" data-action="OPEN_STORE" data-store-id="${DEMO_STORE_ID}">Try Jollibee Sariaya</button></div>`;

  return `
    <div class="ds ds--store">
      <button type="button" class="ds-back" data-action="BACK" aria-label="Back">←</button>
      <div class="ds-store-hero" style="background:${store.color}">${storeLogoHtml(store, 'ds-store-logo')}</div>
      <div class="ds-pad">
        <h3 class="ds-h">${escapeHtml(store.name)}</h3>
        <p class="ds-muted">${store.menu.length ? 'Sample menu · prices for demo only' : `${escapeHtml(store.categoryLabel)} · ${store.eta}`}</p>
      </div>
      ${menu}
      ${count ? `<button type="button" class="ds-cartbar" data-action="GO_CHECKOUT"><span>🛒 ${count} item${count > 1 ? 's' : ''}</span><span>View cart · ${peso(subtotal)}</span></button>` : ''}
    </div>`;
}

function sheet(state) {
  return `
    <button type="button" class="ds-sheet-backdrop" data-action="CLOSE_SHEET" aria-label="Close payment options"></button>
    <div class="ds-sheet" role="dialog" aria-label="Choose payment method">
      <h4>Payment method</h4>
      ${PAYMENT_METHODS.map((m) => `
        <button type="button" class="ds-sheet-option${m.id === state.payment ? ' is-on' : ''}" data-action="SET_PAYMENT"
          data-payment="${m.id}" aria-pressed="${m.id === state.payment}"><span>${m.icon} ${m.label}</span>${m.id === state.payment ? '<span aria-hidden="true">✓</span>' : ''}</button>`).join('')}
    </div>`;
}

function checkout(state) {
  const store = getStore(state.storeId);
  const t = totals(state.cart, store, { promoApplied: state.promoApplied });
  const method = PAYMENT_METHODS.find((m) => m.id === state.payment);
  const promo = !t.feeKnown ? '' : state.promoApplied
    ? `<p class="ds-promo is-applied">✅ ${PROMO.code} applied — ₱${PROMO.discount} off delivery</p>`
    : `<button type="button" class="ds-promo" data-action="APPLY_PROMO">🎉 First order? Use code <b>${PROMO.code}</b> for ₱${PROMO.discount} off delivery. <u>Apply</u></button>`;

  return `
    <div class="ds ds--checkout">
      <div class="ds-bar"><button type="button" class="ds-back ds-back--inline" data-action="BACK" aria-label="Back">←</button><b>Checkout</b></div>
      <section class="ds-card">
        <div class="ds-row"><b>Delivery address</b><span class="ds-link">Change</span></div>
        <div class="ds-map" aria-hidden="true">📍</div>
        <p><b>Purok 3, Brgy. Sampaloc, Sariaya</b></p>
        <p class="ds-muted">Landmark: Blue gate beside the chapel</p>
      </section>
      <section class="ds-card">
        <div class="ds-row"><b>Payment method</b><button type="button" class="ds-link" data-action="OPEN_SHEET">Change</button></div>
        <div class="ds-pm ds-row"><span>${method.icon} <b>${method.label}</b></span><b>${peso(t.total)}</b></div>
        ${promo}
      </section>
      <section class="ds-card">
        <b>Order summary</b>
        <p class="ds-muted">${escapeHtml(store.name)}</p>
        ${state.cart.lines.map((l) => `<div class="ds-row ds-line"><span>${l.qty}x ${escapeHtml(l.name)}</span><span>${peso(l.price * l.qty)}</span></div>`).join('')}
        <div class="ds-totals">
          <div class="ds-row ds-muted"><span>Subtotal</span><span>${peso(t.subtotal)}</span></div>
          <div class="ds-row ds-muted"><span>${t.feeLabel}</span><span>${t.feeKnown ? peso(t.fee) : '—'}</span></div>
          ${t.discount ? `<div class="ds-row ds-discount"><span>Promo (${PROMO.code})</span><span>−${peso(t.discount)}</span></div>` : ''}
          <div class="ds-row ds-total"><span>${t.totalLabel}</span><span>${peso(t.total)}</span></div>
        </div>
      </section>
      <button type="button" class="ds-cartbar ds-cartbar--center" data-action="PLACE_ORDER">Place Order · ${peso(t.total)}</button>
      ${state.sheetOpen ? sheet(state) : ''}
    </div>`;
}

function stepClass(i, state) {
  if (i < state.trackingStep || (i === state.trackingStep && isTrackingDone(state))) return 'is-done';
  return i === state.trackingStep ? 'is-now' : '';
}

function tracking(state) {
  const done = isTrackingDone(state);
  const progress = state.trackingStep / (TRACKING_STEPS.length - 1);
  return `
    <div class="ds ds--tracking">
      <div class="ds-track-map" aria-hidden="true"><span class="ds-rider" style="--progress:${progress}">🛵</span><span class="ds-dest">📍</span></div>
      <div class="ds-pad">
        <h3 class="ds-h">${done ? 'Delivered! Enjoy your meal 🎉' : `Arriving in ~${12 - state.trackingStep * 3} min`}</h3>
        <p class="ds-muted">Order #${state.orderNo} · ${escapeHtml(getStore(state.storeId).name)}</p>
      </div>
      <ol class="ds-timeline">
        ${TRACKING_STEPS.map((label, i) => `
          <li class="ds-step ${stepClass(i, state)}"${i === state.trackingStep ? ' aria-current="step"' : ''}>
            <span class="ds-dot"></span><span>${label}${i === 2 && state.trackingStep >= 2 ? ' · Rider: Kuya J.' : ''}</span>
          </li>`).join('')}
      </ol>
      ${done ? '<button type="button" class="ds-cartbar ds-cartbar--center" data-action="RESTART">Restart demo</button>' : ''}
    </div>`;
}

const SCREENS = { splash, home, store: storeScreen, checkout, tracking };

export const renderScreen = (state) => SCREENS[state.screen](state);
```

- [ ] **Step 6: Create `src/demo/demo.js`**

```js
import { initialState, reducer, isTrackingDone } from './state.js';
import { renderScreen, CAPTIONS } from './screens.js';

const ID_KEYS = ['storeId', 'itemId', 'category', 'payment'];

// Identifies a control across re-renders so keyboard focus survives.
const focusKeyOf = (el) => el?.dataset?.focusKey
  ?? (el?.dataset?.action ? [el.dataset.action, ...ID_KEYS.map((k) => el.dataset[k] ?? '')].join('|') : null);

const stepMsFromUrl = () => Number(new URLSearchParams(window.location.search).get('demoStepMs')) || 3000;

export function mountDemo(root, { stepMs = stepMsFromUrl(), splashMs = 1000 } = {}) {
  let state = initialState();
  let trackingTimer = null;

  root.innerHTML = `
    <div class="demo">
      <div class="phone" role="region" aria-label="Pakisuyo app demo">
        <div class="phone__screen" data-testid="demo-screen" tabindex="-1"></div>
      </div>
      <p class="demo__caption" aria-live="polite"></p>
    </div>`;
  const screenEl = root.querySelector('.phone__screen');
  const captionEl = root.querySelector('.demo__caption');

  function syncTimer() {
    const shouldRun = state.screen === 'tracking' && !isTrackingDone(state);
    if (shouldRun && !trackingTimer) trackingTimer = setInterval(() => dispatch({ type: 'ADVANCE_TRACKING' }), stepMs);
    if (!shouldRun && trackingTimer) {
      clearInterval(trackingTimer);
      trackingTimer = null;
    }
  }

  function render(previousScreen) {
    const active = document.activeElement;
    const hadFocus = screenEl.contains(active);
    const key = hadFocus ? focusKeyOf(active) : null;
    const selection = key === 'search' ? [active.selectionStart, active.selectionEnd] : null;

    screenEl.innerHTML = renderScreen(state);
    captionEl.textContent = CAPTIONS[state.screen];

    if (!hadFocus) return;
    const target = [...screenEl.querySelectorAll('[data-action], [data-focus-key]')].find((el) => focusKeyOf(el) === key);
    if (target && state.screen === previousScreen) {
      target.focus();
      if (selection) target.setSelectionRange(...selection);
    } else {
      screenEl.focus();
    }
  }

  function dispatch(action) {
    const previousScreen = state.screen;
    const next = reducer(state, action);
    if (next === state) return;
    state = next;
    syncTimer();
    render(previousScreen);
  }

  screenEl.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    if (!button) return;
    const { action, storeId, itemId, category, payment } = button.dataset;
    const orderNo = action === 'PLACE_ORDER' ? `PX-${1000 + Math.floor(Math.random() * 9000)}` : undefined;
    dispatch({ type: action, storeId, itemId, category, payment, orderNo });
  });

  screenEl.addEventListener('input', (e) => {
    if (e.target.dataset.focusKey === 'search') dispatch({ type: 'SEARCH', query: e.target.value });
  });

  // Show the splash only once the owner scrolls to the demo, then move on.
  new IntersectionObserver((entries, observer) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      setTimeout(() => dispatch({ type: 'SKIP_SPLASH' }), splashMs);
    }
  }, { threshold: 0.4 }).observe(root);

  render(state.screen);
  return { getState: () => state, dispatch };
}
```

- [ ] **Step 7: Create `src/sections/app-promo.js`**

```js
import { mountDemo } from '../demo/demo.js';

const BENEFITS = [
  '🛒 Order in a few taps — no more typing forms',
  '🛵 Live rider tracking, from Preparing to Delivered',
  '💳 Pay with GCash, Maya, Card or Cash on Delivery',
  '🎉 Exclusive app-only promos',
];

export function renderAppPromo(el) {
  el.className = 'section app-promo';
  el.innerHTML = `
    <div class="container app-promo__inner">
      <div>
        <span class="eyebrow">Coming soon</span>
        <h2 class="section-title">The Pakisuyo app</h2>
        <p class="section-lead">Everything you do in Messenger today, in a few taps. Try it — tap the phone.</p>
        <ul class="benefits">${BENEFITS.map((b) => `<li>${b}</li>`).join('')}</ul>
      </div>
      <div id="demo-root"></div>
    </div>`;
  mountDemo(el.querySelector('#demo-root'));
}
```

- [ ] **Step 8: Append the app-promo styles to `src/styles/sections.css`**

```css
/* App promo */
.app-promo { background: var(--brand-yellow); }
.app-promo__inner { display: grid; gap: 32px; align-items: center; }
@media (min-width: 860px) { .app-promo__inner { grid-template-columns: 1fr 1fr; } }
.app-promo .section-lead { color: var(--ink); }
.eyebrow { display: inline-block; background: var(--ink); color: var(--brand-yellow); font-weight: 800; font-size: .75rem; letter-spacing: .12em; text-transform: uppercase; border-radius: var(--radius-pill); padding: 6px 12px; margin-bottom: 12px; }
.benefits { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.benefits li { background: var(--surface); border-radius: 14px; padding: 12px 14px; font-weight: 600; }
```

- [ ] **Step 9: Create `src/styles/demo.css`**

```css
.demo { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.phone { width: min(320px, 100%); aspect-ratio: 9 / 18.5; border: 10px solid var(--ink); border-radius: 40px; background: var(--surface); overflow: hidden; box-shadow: 0 24px 48px rgba(0, 0, 0, .2); position: relative; }
.phone__screen { position: absolute; inset: 0; overflow-y: auto; overscroll-behavior: contain; font-size: 14px; outline: none; }
.demo__caption { margin: 0; max-width: 34ch; text-align: center; font-weight: 600; min-height: 3em; }

.ds { min-height: 100%; position: relative; background: var(--surface); padding-bottom: 72px; }
.ds button { font: inherit; cursor: pointer; color: inherit; }
.ds--splash { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border: 0; background: var(--brand-red); padding: 0; }
.ds-top { background: var(--brand-yellow); padding: 14px; }
.ds-deliver { margin: 0; font-size: .8rem; }
.ds-greet { margin: 6px 0 10px; font-weight: 800; font-size: 1.15rem; letter-spacing: -.01em; }
.ds-search { width: 100%; border: 0; border-radius: var(--radius-pill); padding: 10px 14px; min-height: 40px; }
.ds-chips { display: flex; gap: 6px; overflow-x: auto; margin-top: 10px; padding-bottom: 2px; }
.ds-chip { border: 0; border-radius: var(--radius-pill); padding: 6px 12px; background: var(--surface); font-weight: 600; white-space: nowrap; }
.ds-chip.is-on { background: var(--brand-red); color: var(--surface); }
.ds-stores, .ds-menu { list-style: none; margin: 0; padding: 0; }
.ds-store { display: flex; gap: 10px; align-items: center; width: 100%; padding: 10px 14px; border: 0; border-bottom: 1px solid var(--line); background: var(--surface); text-align: left; }
.ds-store b { display: block; }
.ds-row-logo { width: 46px; height: 46px; border-radius: 12px; object-fit: contain; font-size: .9rem; }
.ds-meta { color: var(--ink-muted); font-size: .8rem; }
.ds-open { color: var(--success); font-weight: 700; }
.ds-empty { padding: 24px 14px; color: var(--ink-muted); }
.ds-back { position: absolute; top: 10px; left: 10px; width: 36px; height: 36px; border-radius: 50%; border: 0; background: var(--surface); box-shadow: var(--shadow-card); z-index: 2; }
.ds-back--inline { position: static; box-shadow: none; background: transparent; }
.ds-store-hero { height: 120px; display: flex; align-items: center; justify-content: center; }
.ds-store-logo { width: 72px; height: 72px; background: var(--surface); border-radius: 18px; padding: 6px; object-fit: contain; font-size: 1.2rem; }
.ds-pad { padding: 12px 14px; }
.ds-h { margin: 0; font-size: 1.1rem; font-weight: 800; }
.ds-muted { margin: 0; color: var(--ink-muted); font-size: .8rem; }
.ds-item { display: flex; gap: 10px; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--line); }
.ds-item-img { width: 56px; height: 56px; border-radius: 12px; object-fit: cover; font-size: 1.6rem; background: var(--yellow-soft); }
.ds-item-text { flex: 1; display: grid; }
.ds-qty { display: flex; align-items: center; gap: 8px; }
.ds-round { width: 32px; height: 32px; border-radius: 50%; border: 0; background: var(--brand-red); color: var(--surface) !important; font-weight: 800; font-size: 1.1rem; }
.ds-round--ghost { background: var(--surface-muted); color: var(--ink) !important; }
.ds-soon { padding: 20px 14px; display: grid; gap: 10px; justify-items: start; }
.ds-soon p { margin: 0; }
.ds-btn { border: 0; border-radius: var(--radius-pill); padding: 10px 16px; background: var(--brand-red); color: var(--surface) !important; font-weight: 700; }
.ds-cartbar { position: absolute; left: 10px; right: 10px; bottom: 10px; display: flex; justify-content: space-between; align-items: center; border: 0; border-radius: var(--radius-pill); padding: 12px 16px; background: var(--brand-red); color: var(--surface) !important; font-weight: 800; z-index: 3; }
.ds-cartbar--center { justify-content: center; }
.ds--checkout { background: var(--surface-muted); }
.ds-bar { display: flex; align-items: center; gap: 6px; background: var(--brand-yellow); padding: 8px 10px; font-size: 1rem; }
.ds-card { background: var(--surface); margin: 8px; border-radius: 14px; padding: 12px; display: grid; gap: 6px; }
.ds-card p { margin: 0; }
.ds-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.ds-link { border: 0; background: none; color: var(--brand-red) !important; font-weight: 700; padding: 0; }
.ds-map { height: 64px; border-radius: 10px; background: repeating-linear-gradient(45deg, #E8F0E3 0 8px, #DFE9D8 8px 16px); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; }
.ds-pm { border: 1.5px solid var(--line); border-radius: 10px; padding: 10px; }
.ds-promo { border: 0; text-align: left; background: var(--yellow-soft); border-radius: 10px; padding: 8px 10px; font-size: .8rem; }
.ds-promo.is-applied { background: #E6F4EA; }
.ds-line { font-size: .85rem; }
.ds-totals { border-top: 1px dashed #DDD; margin-top: 4px; padding-top: 6px; display: grid; gap: 3px; font-size: .85rem; }
.ds-discount { color: var(--success); font-weight: 700; }
.ds-total { font-weight: 800; font-size: 1rem; }
.ds-sheet-backdrop { position: absolute; inset: 0; width: 100%; background: rgba(0, 0, 0, .4); border: 0; z-index: 4; }
.ds-sheet { position: absolute; left: 0; right: 0; bottom: 0; background: var(--surface); border-radius: 18px 18px 0 0; padding: 14px; z-index: 5; display: grid; gap: 8px; animation: sheet-up .2s ease-out; }
.ds-sheet h4 { margin: 0 0 4px; }
.ds-sheet-option { display: flex; justify-content: space-between; border: 1.5px solid var(--line); border-radius: 12px; padding: 12px; background: var(--surface); text-align: left; font-weight: 600; }
.ds-sheet-option.is-on { border-color: var(--brand-red); background: #FFF0F0; }
@keyframes sheet-up { from { transform: translateY(100%); } }
.ds-track-map { height: 150px; position: relative; background: repeating-linear-gradient(45deg, #E8F0E3 0 10px, #DFE9D8 10px 20px); }
.ds-rider { position: absolute; top: 50%; left: calc(8% + var(--progress) * 70%); transform: translateY(-50%); font-size: 1.8rem; transition: left .6s ease; }
.ds-dest { position: absolute; top: 50%; right: 8%; transform: translateY(-50%); font-size: 1.6rem; }
.ds-timeline { list-style: none; margin: 0; padding: 4px 14px 0; display: grid; gap: 10px; }
.ds-step { display: flex; gap: 10px; align-items: center; font-size: .9rem; color: var(--ink-muted); }
.ds-dot { width: 14px; height: 14px; border-radius: 50%; background: #DDD; flex: none; }
.ds-step.is-done { color: var(--ink); }
.ds-step.is-done .ds-dot { background: var(--success); }
.ds-step.is-now { color: var(--ink); font-weight: 800; }
.ds-step.is-now .ds-dot { background: var(--brand-red); box-shadow: 0 0 0 5px #FFD5D6; }
```

- [ ] **Step 10: Wire it into `src/main.js`**

Add the imports:
```js
import './styles/demo.css';
import { renderAppPromo } from './sections/app-promo.js';
```
Add after `renderCoverage($('coverage'));`:
```js
renderAppPromo($('app'));
```

- [ ] **Step 11: Write the e2e test `tests/e2e/demo.spec.js`**

```js
import { test, expect } from '@playwright/test';

test('owner can tap through a whole order', async ({ page }) => {
  await page.goto('/?demoStepMs=150#app');
  const demo = page.getByTestId('demo-screen');

  await demo.getByRole('button', { name: /Jollibee Sariaya/ }).click(); // splash auto-skips after 1s
  await expect(demo.getByText('Sample menu · prices for demo only')).toBeVisible();
  await demo.getByRole('button', { name: 'Add 1-pc Chickenjoy w/ Rice' }).click();
  await demo.getByRole('button', { name: 'Add Coke Float' }).click();
  await demo.getByRole('button', { name: /View cart · ₱ 158/ }).click();

  await expect(demo.getByText('Delivery fee (within Sariaya)')).toBeVisible();
  await demo.getByRole('button', { name: 'Change' }).click();
  await demo.getByRole('button', { name: /Maya/ }).click();
  await expect(demo.locator('.ds-pm')).toContainText('Maya');
  await demo.getByRole('button', { name: /PAKISUYO10/ }).click();
  await expect(demo.getByText('Promo (PAKISUYO10)')).toBeVisible();

  // 99 + 59 + 50 − 10 = 198. A double-tap must place exactly one order.
  await demo.getByRole('button', { name: 'Place Order · ₱ 198' }).dblclick();
  await expect(demo.locator('.ds-step')).toHaveCount(5);
  await expect(demo.getByText('Delivered! Enjoy your meal 🎉')).toBeVisible({ timeout: 5000 });

  await demo.getByRole('button', { name: 'Restart demo' }).click();
  await expect(demo.getByRole('button', { name: /Jollibee Sariaya/ })).toBeVisible();
});

test('stores without a menu point back to the demo store', async ({ page }) => {
  await page.goto('/#app');
  const demo = page.getByTestId('demo-screen');
  await demo.getByRole('button', { name: /McDonald's Sariaya/ }).click();
  await expect(demo.getByText('Menu coming soon for this store.')).toBeVisible();
  await demo.getByRole('button', { name: 'Try Jollibee Sariaya' }).click();
  await expect(demo.getByText('Sample menu · prices for demo only')).toBeVisible();
});

test('search keeps focus while typing and filters stores', async ({ page }) => {
  await page.goto('/#app');
  const demo = page.getByTestId('demo-screen');
  const search = demo.getByLabel('Search stores or food');
  await search.pressSequentially('spag');
  await expect(search).toBeFocused();
  await expect(search).toHaveValue('spag');
  await expect(demo.locator('.ds-store')).toHaveCount(1);
});
```

- [ ] **Step 12: Run all tests**

Run: `npm test && npx playwright test`
Expected: PASS (unit and e2e).

- [ ] **Step 13: Try it by hand**

Run `npm run dev` and tap through the demo at phone width and at desktop width in Firefox. Check the captions change per screen and the rider moves.

- [ ] **Step 14: Commit**

```bash
git add src/demo src/sections/app-promo.js src/styles/demo.css src/styles/sections.css src/main.js tests/unit/demo-state.test.js tests/e2e/demo.spec.js
git commit -m "feat: add coming-soon app section with tap-through demo"
```

---

### Task 13: Logo exports, Lighthouse check, README and Netlify config

**Files:**
- Create: `scripts/export-logos.mjs`, `public/assets/brand/*.png` (generated), `netlify.toml`, `README.md`
- Modify: `index.html` (apple-touch-icon and PNG icons)

**Interfaces:**
- Consumes: `logoHorizontal`, `logoStacked`, `markSvg` (Task 2); `tokens.css`, `base.css` (Task 1).
- Produces: `public/assets/brand/logo-horizontal.png`, `logo-stacked.png`, `logo-stacked-on-red.png`, `logo-fb-profile.png` (1080×1080), `icon-180.png`, `icon-32.png`, `icon-16.png`.

- [ ] **Step 1: Create `scripts/export-logos.mjs`**

```js
// Renders the logo system to PNGs with the real web font, using Playwright's Chromium.
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { logoHorizontal, logoStacked, markSvg } from '../src/brand/logo.js';

const css = (await Promise.all(['tokens.css', 'base.css'].map((f) => readFile(new URL(`../src/styles/${f}`, import.meta.url), 'utf8')))).join('\n');
const out = (name) => fileURLToPath(new URL(`../public/assets/brand/${name}.png`, import.meta.url));

const VARIANTS = [
  { name: 'logo-horizontal', scale: 2, html: `<div class="pad" style="background:#fff">${logoHorizontal({ size: 96 })}</div>` },
  { name: 'logo-stacked', scale: 2, html: `<div class="pad" style="background:#fff">${logoStacked({ size: 160 })}</div>` },
  { name: 'logo-stacked-on-red', scale: 2, html: `<div class="pad" style="background:#E31B23">${logoStacked({ tone: 'red', size: 160 })}</div>` },
  { name: 'logo-fb-profile', scale: 2, html: `<div class="square" style="width:540px;height:540px;background:#E31B23">${logoStacked({ tone: 'red', invertMark: false, size: 180 })}</div>` },
  { name: 'icon-180', scale: 1, html: markSvg({ size: 180, rounded: false }) },
  { name: 'icon-32', scale: 1, html: markSvg({ size: 32 }) },
  { name: 'icon-16', scale: 1, html: markSvg({ size: 16, speedLines: false }) },
];

const browser = await chromium.launch();
for (const v of VARIANTS) {
  const page = await browser.newPage({ deviceScaleFactor: v.scale });
  await page.setContent(`<!doctype html><html><head>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&display=swap">
    <style>${css} body{margin:0;background:transparent} .pad{display:inline-block;padding:32px}
    .square{display:flex;align-items:center;justify-content:center}</style></head>
    <body><div id="root" style="display:inline-block">${v.html}</div></body></html>`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#root > *').first().screenshot({ path: out(v.name), omitBackground: true });
  console.log(`✓ ${v.name}.png`);
  await page.close();
}
await browser.close();
```

- [ ] **Step 2: Run it and look at the results**

Run: `npm run export:logos`
Expected: 7 ✓ lines. Open `public/assets/brand/logo-fb-profile.png` and the others and check the font is Plus Jakarta Sans (geometric, bold), not a fallback serif. The FB profile image should be 1080×1080 (`file public/assets/brand/logo-fb-profile.png`).

- [ ] **Step 3: Add PNG icons to `index.html`**

Replace the single `<link rel="icon" …>` line with:
```html
  <link rel="icon" href="/assets/brand/icon.svg" type="image/svg+xml">
  <link rel="icon" href="/assets/brand/icon-32.png" sizes="32x32" type="image/png">
  <link rel="icon" href="/assets/brand/icon-16.png" sizes="16x16" type="image/png">
  <link rel="apple-touch-icon" href="/assets/brand/icon-180.png">
```

- [ ] **Step 4: Create `netlify.toml`**

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[headers]]
  for = "/*"
  [headers.values]
    X-Robots-Tag = "noindex"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

- [ ] **Step 5: Run Lighthouse on the production build**

Run:
```bash
npm run build
npx vite preview --port 4173 --strictPort &
PREVIEW_PID=$!
sleep 2
CHROME_PATH="$(node -e "console.log(require('@playwright/test').chromium.executablePath())")" \
  npx --yes lighthouse http://localhost:4173 --only-categories=performance,accessibility \
  --chrome-flags="--headless=new" --output=json --output-path=./lighthouse.json --quiet
kill $PREVIEW_PID
node -e "const r=require('./lighthouse.json');for(const[k,v]of Object.entries(r.categories))console.log(k,Math.round(v.score*100))"
```
Expected: `performance ≥ 90` and `accessibility ≥ 90`. If either is below 90, open the report's failing audits (`node -e "const r=require('./lighthouse.json');Object.values(r.audits).filter(a=>a.score!==null&&a.score<0.9).forEach(a=>console.log(a.id,'-',a.title))"`), fix them, and re-run. Common fixes: add `width`/`height` to `<img>` in `images.js`, or raise the contrast of a muted text colour.

- [ ] **Step 6: Create `README.md`**

````markdown
# Pakisuyo Express Sariaya — pitch landing page

Mobile-first landing page for Pakisuyo Express Sariaya: a working Messenger order form with a map pin, and a tap-through preview of the future delivery app.

Design spec: `docs/superpowers/specs/2026-10-03-pakisuyo-landing-page-design.md`

## Run it

```bash
npm install
npm run dev          # local dev server
npm test             # unit tests (Vitest)
npm run test:e2e     # end-to-end tests (Playwright, phone viewport)
npm run build        # production build in dist/
```

## Editing content

- **Stores, sample menus, fees, promo, coverage towns:** `src/data/stores.js`
- **Payment methods:** `src/data/payments.js`
- **Messenger / Facebook links:** `src/data/contact.js`

## Images

- Store logos and demo food photos live in `public/assets/stores/<store-id>/`.
- To use your own photo, save it as `public/assets/stores/jollibee-sariaya/items/<item-id>.png` and run `npm run fetch:images` (your files always win).
- Anything missing falls back to an initials or emoji tile automatically.
- Credits: `public/assets/CREDITS.md`.

> **Brand logos and brand food photos are for the private pitch only.** Swap them for owner-owned or stock images before any public launch. Only files change, no code.

## Regenerating data

```bash
npm run fetch:boundary   # Sariaya polygon from OpenStreetMap
npm run fetch:images     # logos/photos from Wikimedia Commons
npm run export:logos     # logo PNGs incl. 1080×1080 Facebook profile picture
```

## Deploying

Netlify is configured in `netlify.toml` (the site sends `noindex`). Deploying publishes a public URL, so only do it once the owner pitch link is approved:

```bash
npx netlify-cli deploy --build            # draft URL
npx netlify-cli deploy --build --prod     # production URL
```
````

- [ ] **Step 7: Run everything one last time**

Run: `npm test && npx playwright test && npm run build`
Expected: all PASS and the build succeeds.

- [ ] **Step 8: Commit**

```bash
git add scripts/export-logos.mjs public/assets/brand index.html netlify.toml README.md
git commit -m "chore: export logo PNGs, add Netlify config and README"
```

- [ ] **Step 9: Push and ask before deploying**

Run: `git push`
Then **stop and ask the user** whether to deploy to Netlify. Don't run `netlify deploy` without an explicit yes.
