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

- **Featured stores (exactly 5), sample menus, fees, promo, coverage towns:** `src/data/stores.js`
- **Stores missing from OpenStreetMap:** add them to `src/data/extra-stores.js` (no re-fetch needed)
- **Payment methods:** `src/data/payments.js`
- **Messenger / Facebook links:** `src/data/contact.js`

## Images

- Store logos and demo food photos live in `public/assets/stores/<store-id>/`.
- To use your own photo, save it as `public/assets/stores/jollibee-sariaya/items/<item-id>.png` and run `npm run fetch:images` (your files always win).
- Anything missing falls back to an initials or emoji tile automatically.
- Credits: `public/assets/CREDITS.md`.
- Directory stores without a logo show a category icon. All store pictures go through `storeImageHtml()` in `src/lib/images.js` — the one place to add Google Places photos later.

> **Brand logos and brand food photos are for the private pitch only.** Swap them for owner-owned or stock images before any public launch. Only files change, no code.

## Regenerating data

```bash
npm run fetch:boundary -- Lucena   # a town's boundary (default Sariaya)
npm run fetch:stores               # all food & drink places in Sariaya + Lucena → public/data/directory.json
npm run fetch:images     # logos/photos from Wikimedia Commons
npm run export:logos     # logo PNGs incl. 1080×1080 Facebook profile picture
```

## Deploying

Netlify is configured in `netlify.toml` (the site sends `noindex`). Deploying publishes a public URL, so only do it once the owner pitch link is approved:

```bash
npx netlify-cli deploy --build            # draft URL
npx netlify-cli deploy --build --prod     # production URL
```
