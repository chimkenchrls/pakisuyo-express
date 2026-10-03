# Pakisuyo Express Sariaya

[![CI](https://github.com/chimkenchrls/pakisuyo-express/actions/workflows/ci.yml/badge.svg)](https://github.com/chimkenchrls/pakisuyo-express/actions/workflows/ci.yml)
[![Deploy](https://github.com/chimkenchrls/pakisuyo-express/actions/workflows/deploy.yml/badge.svg)](https://github.com/chimkenchrls/pakisuyo-express/actions/workflows/deploy.yml)

**Live:** https://pakisuyoexpress.netlify.app

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

## How changes ship

Every change goes through a pull request; `main` is protected and only accepts green builds.

1. **Branch → pull request.**
2. **CI** (`.github/workflows/ci.yml`) runs three required checks:
   - `checks`: unit tests (Vitest), public build and pitch build
   - `e2e`: Playwright end-to-end tests on a phone viewport (report uploaded on failure)
   - `lighthouse`: Lighthouse CI, median of 3 runs; fails below Performance 90 or Accessibility 95 (`lighthouserc.json`)
3. **Preview** (`.github/workflows/deploy.yml`): the PR's public build is deployed to `pr-<number>--pakisuyoexpress.netlify.app` and the link is commented on the PR. Previews require a Netlify login (Netlify's default protection for non-production deploys).
4. **Merge** once all checks pass.
5. **Production:** after CI succeeds on `main`, the exact tested commit is built and deployed to https://pakisuyoexpress.netlify.app, then `npm run smoke` checks the live site (title, app script, store list, no `noindex`, no brand images served). A failing smoke test fails the workflow.

**Secrets and settings (GitHub → Settings → Secrets and variables → Actions):**

| Name | Type | What |
|---|---|---|
| `NETLIFY_AUTH_TOKEN` | Secret | Netlify personal access token. Rotate with `gh secret set NETLIFY_AUTH_TOKEN`. |
| `NETLIFY_SITE_ID` | Variable | `6f251678-3b03-47f2-96f9-e5eeebf33bc4` |

**Owner pitch (local only):** the pitch build (brand logos and photos) is never deployed by CI. Its third-party images are not committed; they live only on the developer's machine in `public/assets/stores/jollibee-sariaya/`. To show it, run `npm run dev:pitch`. If it ever needs a link, deploy `npm run build:pitch` manually to a **separate** Netlify site, never production.
