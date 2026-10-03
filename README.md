# Pakisuyo Express Sariaya: pitch landing page

Mobile-first landing page for Pakisuyo Express Sariaya: a working Messenger order form with a map pin, and a tap-through preview of the future delivery app.

Design spec: `docs/superpowers/specs/2026-10-03-pakisuyo-landing-page-design.md`

## Run it

```bash
npm install
npm run dev          # local dev server
npm test             # unit tests (Vitest)
npm run test:e2e     # end-to-end tests (Playwright, phone viewport)
npm run build        # public (launch) build in dist/
```

## Pitch vs launch builds

One codebase, two builds:

| | Pitch (show the owner) | Launch (public site) |
|---|---|---|
| Commands | `npm run dev:pitch` / `npm run build:pitch` | `npm run dev` / `npm run build` |
| Jollibee, McDonald's, Dunkin' logos + Jollibee food photos | shown | replaced by initials / emoji tiles, files not shipped |
| Search engines | blocked (`noindex`) | allowed |

The switch lives in `.env.pitch` (`VITE_PITCH=true`); the protected images are listed in `src/lib/brand-assets.js`.
Wings & Dims and Dash Espresso logos appear in both, so get those stores' OK before launch.

## Editing content

- **Featured stores (exactly 5), sample menus, fees, promo, coverage towns:** `src/data/stores.js`
- **Stores missing from OpenStreetMap:** add them to `src/data/extra-stores.js` (no re-fetch needed)
- **Payment methods:** `src/data/payments.js`
- **Messenger / Facebook links:** `src/data/contact.js`

## Images

- Store logos and demo food photos live in `public/assets/stores/<store-id>/`.
- To use your own photo, save it as `public/assets/stores/jollibee-sariaya/items/<item-id>.png` and run `npm run fetch:images` (your files always win).
- Anything missing falls back to an initials or emoji tile automatically.
- Credits: `public/assets/CREDITS.md`.
- Directory stores without a logo show a category icon. All store pictures go through `storeImageHtml()` in `src/lib/images.js`, the one place to add Google Places photos later.

> **Brand logos and brand food photos are for the private pitch only.** Swap them for owner-owned or stock images before any public launch. Only files change, no code.

## Regenerating data

```bash
npm run fetch:boundary -- Lucena   # a town's boundary (default Sariaya)
npm run fetch:stores               # all food & drink places in Sariaya + Lucena → public/data/directory.json
npm run fetch:images     # logos/photos from Wikimedia Commons
npm run export:logos     # logo PNGs incl. 1080×1080 Facebook profile picture
```

## Connecting a domain (e.g. pakisuyoexpress.com)

1. Buy the domain (any registrar; `.com` ≈ ₱700–1,000/year).
2. Netlify → the site → **Domain management → Add a domain** → enter it.
3. At the registrar, either switch the nameservers to the ones Netlify shows (easiest), or add the `A`/`CNAME` records it lists.
4. Wait for DNS (minutes to a few hours); Netlify issues the free HTTPS certificate automatically. HTTPS is required for "Use my current location".

## Deploying

**Pitch site (for the owner): https://pakisuyoexpress.netlify.app**, private link with brand logos and `noindex`.
Upload a local pitch build as-is (Netlify must not rebuild it, or it would become the public version):

```bash
npm run build:pitch
npx netlify-cli deploy --prod --dir dist --no-build --site pakisuyoexpress
```

**Public launch (later):** run `npm run build` (no brand logos or photos, indexable) and deploy it the same way,
ideally to the owner's own domain (see "Connecting a domain" above). `netlify.toml` builds the public version
if the site is ever connected to GitHub for automatic deploys.
