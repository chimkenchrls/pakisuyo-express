# Pakisuyo Express Sariaya

[![CI](https://github.com/chimkenchrls/pakisuyo-express/actions/workflows/ci.yml/badge.svg)](https://github.com/chimkenchrls/pakisuyo-express/actions/workflows/ci.yml)
[![Deploy](https://github.com/chimkenchrls/pakisuyo-express/actions/workflows/deploy.yml/badge.svg)](https://github.com/chimkenchrls/pakisuyo-express/actions/workflows/deploy.yml)

**Live site:** https://pakisuyoexpress.netlify.app

## Overview

This repository contains a mobile-first website for Pakisuyo Express, a food and beverage delivery service in Sariaya, Quezon, Philippines. The business currently takes every order by hand through Facebook Messenger. The website replaces that manual form with a structured order flow, a searchable directory of local stores, and an interactive preview of a future delivery app.

The project was built as a portfolio piece, with the business owner's permission. It is maintained with an automated delivery pipeline: every change is tested, previewed, and deployed through GitHub Actions.

## Features

- **Structured ordering.** Customers complete one validated form (name, mobile number, address, landmark, store, order list, payment method). The order is formatted in the layout the business already uses, copied to the clipboard, and handed to Messenger.
- **Location capture.** A map with a draggable pin and an optional "Use my current location" action. The pin is converted into a street address and checked against the Sariaya municipal boundary, and the order includes a Google Maps link for the rider.
- **Store directory.** More than 150 food and beverage places in Sariaya and Lucena, sourced from OpenStreetMap, with search, town and category filters, and duplicate removal.
- **Input validation.** Philippine mobile numbers (11 digits starting with 09, with conversion of pasted +63 numbers), minimum and maximum field lengths, and cash-on-delivery change amounts.
- **Returning customers.** Contact details and the map pin can be remembered in the customer's own browser. Nothing is stored on a server.
- **App preview.** A tap-through demonstration of browsing, checkout, and live order tracking.
- **Accessibility and performance.** Keyboard and screen-reader support, reduced-motion support, a self-hosted font, and Lighthouse budgets enforced in CI.

## Technology

| Area | Tools |
|---|---|
| Front end | Vite, vanilla JavaScript (ES modules), CSS custom properties |
| Maps and data | Leaflet, OpenStreetMap tiles, Nominatim, Overpass API |
| Icons and type | Phosphor Icons (duotone), Plus Jakarta Sans (self-hosted) |
| Testing | Vitest (unit), Playwright (end-to-end), Lighthouse CI |
| Delivery | GitHub Actions, Netlify, netlify-cli pinned through a lockfile |

## Repository structure

```
.github/workflows/   CI and deployment pipelines
docs/superpowers/    Design specifications and implementation plans
public/              Static assets and the generated store directory
scripts/             Data fetching, logo export, and post-deploy smoke checks
src/data/            Store, payment, category, and page content
src/lib/             Pure, unit-tested logic (validation, geography, search, pricing)
src/sections/        Page sections and interactive components
src/demo/            The app preview (state machine and screens)
tests/unit/          Vitest unit tests
tests/e2e/           Playwright end-to-end tests
tools/netlify/       Pinned deployment tooling with its own lockfile
```

## Getting started

**Requirements:** Node.js 22 (see `.nvmrc`) and npm.

```bash
npm ci
npm run dev
```

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server (public build) |
| `npm run build` | Produce the public build in `dist/` |
| `npm run preview` | Serve the contents of `dist/` locally |
| `npm test` | Run the unit tests |
| `npm run test:e2e` | Run the end-to-end tests on a phone-sized viewport |
| `npm run smoke -- <url>` | Run the post-deployment smoke checks against a URL |

Playwright needs a browser the first time: `npx playwright install chromium`.

## Testing

- **Unit tests** cover the pure logic in `src/lib/` and `scripts/`: phone and field validation, the Messenger message format, opening hours in the Asia/Manila time zone, the boundary check, directory search and ranking, delivery fees, and the smoke checks.
- **End-to-end tests** run the built site in Chromium on a mobile viewport. They cover ordering, clipboard fallbacks, the store directory, keyboard use, modals, motion preferences, and the absence of third-party brand assets in the public build.
- **Lighthouse CI** runs three times per change and fails if the median Performance score falls below 90 or the median Accessibility score falls below 95.

## Continuous integration and delivery

All changes reach `main` through pull requests. The branch is protected: a pull request is required, the three CI checks must pass on the latest commit, and the rules also apply to administrators.

| Stage | Trigger | What happens |
|---|---|---|
| `checks` | Pull request, push to `main` | Install, unit tests, public build, pitch build |
| `e2e` | Pull request, push to `main` | Playwright end-to-end suite; the report is uploaded on failure |
| `lighthouse` | Pull request, push to `main` | Lighthouse CI with performance and accessibility budgets; reports are uploaded |
| Preview deploy | Pull request from this repository | The public build is deployed to `pr-<number>--pakisuyoexpress.netlify.app`, and the link is posted on the pull request |
| Production deploy | CI success on a push to `main` | The exact tested commit is built and deployed to production, then the smoke checks run against the live site |

**Safeguards**

- Production deploys only the commit that CI tested, and only if it is still the latest commit on `main`, so re-running an older workflow cannot roll the site back.
- Forked pull requests do not receive secrets. No pull-request text (titles or branch names) is passed into shell commands.
- Workflows use least-privilege permissions. Production deploys run one at a time.
- The Netlify CLI is installed from its own lockfile (`tools/netlify/`) with integrity checks, before the deployment token is present.
- The smoke checks confirm that the page and its application script load, the store directory is available, the page is indexable, and no third-party brand image is served.
- Preview deploys require a Netlify login, which is Netlify's default protection for non-production deploys.

**Configuration** (GitHub, Settings, Secrets and variables, Actions)

| Name | Type | Description |
|---|---|---|
| `NETLIFY_AUTH_TOKEN` | Secret | Netlify personal access token. Rotate with `gh secret set NETLIFY_AUTH_TOKEN`. |
| `NETLIFY_SITE_ID` | Variable | Identifier of the Netlify site that receives production and preview deploys. |

## Build variants

The same code produces two builds.

| | Public build | Pitch build |
|---|---|---|
| Commands | `npm run dev`, `npm run build` | `npm run dev:pitch`, `npm run build:pitch` |
| Third-party brand logos and product photos | Replaced by initials or category tiles; files are not shipped | Shown |
| Search engine indexing | Allowed | Blocked (`noindex`) |
| Deployed by CI | Yes | No |

The pitch build was used only for a private presentation to the business owner. Its third-party images are not committed to this repository, and the list of protected images is defined in `src/lib/brand-assets.js`. Logos of the featured stores appear in both builds.

## Content and data maintenance

| Content | Location |
|---|---|
| Featured stores, demo menu, fees, coverage towns | `src/data/stores.js` |
| Stores missing from OpenStreetMap | `src/data/extra-stores.js` |
| Payment methods | `src/data/payments.js` |
| About, Privacy, and Terms pages | `src/data/info-pages.js` |
| Messenger and Facebook links | `src/data/contact.js` |

Data can be regenerated with the following scripts:

```bash
npm run fetch:boundary -- Lucena   # municipal boundary (default: Sariaya)
npm run fetch:stores               # store directory for Sariaya and Lucena
npm run fetch:images               # store logos and image credits
npm run export:logos               # brand logo files, including a 1080 x 1080 profile image
```

All store images are rendered through `storeImageHtml()` in `src/lib/images.js`, so a different image source can be introduced in a single place.

## Custom domain

1. Register the domain with any registrar.
2. In Netlify, open the site, select Domain management, then Add a domain.
3. At the registrar, either use Netlify's name servers or add the DNS records that Netlify lists.
4. Netlify issues the HTTPS certificate automatically. HTTPS is required for the location feature.

## Attribution

- Map data and the store directory: © OpenStreetMap contributors, available under the Open Database License (ODbL).
- Icons: Phosphor Icons (MIT License).
- Typeface: Plus Jakarta Sans (SIL Open Font License).
- Image sources and licences are listed in `public/assets/CREDITS.md`.
- Store names and logos belong to their respective owners. Logos of the featured stores are shown for demonstration and will be removed on request.
- Pakisuyo Express Sariaya permitted the use of this project in the author's portfolio. The site is not an official channel of the business.
