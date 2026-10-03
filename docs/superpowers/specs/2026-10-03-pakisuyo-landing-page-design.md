# Pakisuyo Express Sariaya — Pitch Landing Page: Design Spec

**Date:** 2026-10-03
**Status:** Awaiting review
**Author:** Project owner (with Claude)

## 1. Purpose

Win Pakisuyo Express Sariaya as a client for a full FoodPanda/GrabFood-style delivery app. This landing page is the opener: a real, working, customer-facing site in their brand that also previews the app.

**Success criteria**
- The owner opens the link on their phone, recognises their own brand and workflow, and wants the app.
- The order form is useful on day one, even if they never buy the app.
- Mobile Lighthouse score of 90+ (performance and accessibility).

**Not the goal:** building the app itself. The app is a separate project, scoped after they sign.

## 2. Background (from research)

Sources: their Facebook profile (About, Photos, posts) and a real order conversation.

- **Name:** Pakisuyo Express (Sariaya), est. 2022. Facebook: `facebook.com/PakisuyoExpressSariaya`, Messenger: `m.me/PakisuyoExpressSariaya`.
- **Hours:** 8AM–7PM daily.
- **Audience:** 8.1K followers. Runs on a *personal profile* (category "Digital creator"), not a business Page.
- **Brand today:** Red circle logo with yellow "PAKISUYO EXPRESS"; yellow cover with red tagline **"Always ready for your Pakisuyo!"**; hashtag `#PakisuyoExpressSince2022`.
- **What they do:** Food and drink delivery from partner restaurants. Posts follow one template: restaurant name, food photo, "Book your delivery here: m.me/…".
- **Current ordering flow (all manual, in Messenger):**
  1. Customer asks whether a store is available.
  2. Admin sends a form: Name, Exact Address, Landmark, Contact Number, Store/s, Order List.
  3. "Noted po" → "Rider assigned" → admin forwards GCash payment details.
  4. Manual status messages: Preparing → Waiting for rider → Out for delivery.
- **Coverage (assumption, owner to confirm):** Pick up from stores in Sariaya, Lucena, Tayabas and Candelaria; deliver within Sariaya only.
- **Delivery fee:** ₱50 for stores within Sariaya. Out-of-town fee unknown; ask the owner in the pitch.

## 3. Decisions

| Topic | Decision |
|---|---|
| Page type | Option C: customer-facing site + "Coming soon: the app" section |
| Language | English (e.g. "Preparing", "Out for Delivery") |
| Visual style | **A · Sunny & Bold**: yellow hero like their cover, red CTAs, white content below |
| Dark mode | Not now. Colours defined as CSS custom properties so it can be added later |
| Logo | New: Speed "P" mark + Plus Jakarta Sans wordmark, title case (see §4) |
| Payments shown | Cash on Delivery, GCash, Maya, Credit/Debit Card |
| App demo | Tap-through (owner taps through a real flow) |
| Checkout | Foodpanda-style cards; **promo nudge kept**, **no service fee** |
| Images | Brand logos via Wikimedia where available; local stores get initial tiles; demo-store food photos optional (stock fallback) |

## 4. Logo system

**Mark ("Speed P"):** A rounded square (radius 25% of its size) in brand red `#E31B23`, with a bold yellow `#FFD23F` "P" and three yellow speed lines on the left.

**Wordmark:** "Pakisuyo" in Plus Jakarta Sans 800, tracking −0.5px; "EXPRESS" underneath in Plus Jakarta Sans 700, small, tracking ~5.5px, in red (yellow on dark/red backgrounds).

**Variants** (SVG, in `public/assets/brand/`):
- `logo-horizontal.svg`: mark left, stacked text right. Used in the site header.
- `logo-stacked.svg`: mark on top, text centred below. Used in the hero, demo splash and footer.
- `logo-stacked-on-red.svg`: inverted mark (yellow tile, red P) for red backgrounds.
- `logo-fb-profile.svg` / `.png`: stacked, inside a red circle. A proposed new Facebook profile picture, for the before/after moment in the pitch.
- `icon.svg` + favicons (64/32/16). The 16px version drops the speed lines.

The reference renderings are in `.superpowers/brainstorm/*/content/logo-system.html`.

## 5. Visual style (A · Sunny & Bold)

- **Colours (tokens):** `--brand-red: #E31B23`, `--brand-yellow: #FFD23F`, `--ink: #141414`, `--surface: #FFFFFF`, `--surface-muted: #F6F6F6`, `--yellow-soft: #FFF3C4`, `--success: #2A8A3E`.
- **Type:** Plus Jakarta Sans (400/500/700/800) from Google Fonts with `display=swap`.
- **Shapes:** Pill buttons, 14–16px card radius, soft shadows.
- **Layout:** Mobile-first, single column on phones and two columns on desktop where it helps (hero, demo). No horizontal scroll.
- **Imagery:** Food photos. No third-party images taken from their Facebook.

## 6. Page sections (top to bottom)

1. **Header (sticky):** Horizontal logo; links to Restaurants · How it works · Order · App; red "Order Now" button (jumps to the form). On phones, the links collapse into a menu.
2. **Hero (yellow):** "Open today 8AM–7PM" pill (shows "Closed now — opens 8AM" outside hours, using Asia/Manila time); headline **"Always ready for your Pakisuyo!"** with "Pakisuyo!" in red; subline "Food and drinks from your favourite spots, delivered anywhere in Sariaya."; buttons **Order Now** and **Message us** (opens `m.me/PakisuyoExpressSariaya`); a food visual.
3. **Featured restaurants:** 7 cards in a grid with name, category and logo or initial tile. Stores: Jollibee Sariaya, McDonald's Sariaya, Dunkin' Sariaya, Max Mango, Bukid AMYR Restaurant, Conti's Bakeshop & Restaurant, KOPE-right. Tapping a card pre-selects that store in the order form and scrolls there. A note below reads "Don't see your store? We can pick up from almost anywhere — just ask."
4. **How it works:** 4 steps: Choose your store → Place your order → Pay your way → Track your rider.
5. **Order form:** see §7.
6. **Coverage & hours:** "We pick up from stores in Sariaya, Lucena, Tayabas and Candelaria and deliver within Sariaya." Hours 8AM–7PM. Delivery fee: ₱50 within Sariaya; out-of-town fee confirmed by the team. The coverage text is marked in `stores.js` / the copy for the owner to confirm.
7. **Coming soon: the Pakisuyo app (yellow band):** the tap-through demo phone (see §8) next to a short benefits list: order in a few taps, live rider tracking, pay with GCash/Maya/Card/COD, exclusive app promos.
8. **Footer:** Stacked logo, "Est. 2022", `#PakisuyoExpressSince2022`, Messenger and Facebook links, hours.

## 7. Order form (works today)

**Fields** (* = required)
- Name *
- Contact Number *: PH mobile, accepts `09XXXXXXXXX`, `+639XXXXXXXXX`, with or without spaces or dashes; normalised to `09XX XXX XXXX` in the message.
- Delivery location: **"📍 Use my current location"** button + Leaflet map (OpenStreetMap tiles) centred on Sariaya town proper, with a draggable pin. Tapping the map also moves the pin.
- Exact Address *: auto-filled from the pin via Nominatim reverse geocoding (debounced, at most 1 request/second, only on pin change; identifies the app via the site's own URL as referrer, per Nominatim usage policy, and sends no personal email). Always editable. Required even without a pin.
- Landmark *
- Store/s *: a dropdown of the featured stores + "Other", which shows a free-text field.
- Order List *: textarea.
- Payment method *: chips for Cash on Delivery · GCash · Maya · Card.
- Notes: optional.

**Delivery-area check:** If the pin falls outside the Sariaya municipal boundary (a GeoJSON polygon stored in the repo, taken from OpenStreetMap), show a non-blocking warning: "Looks like you're outside our delivery area — message us to check." The order can still be sent.

**On "Send Order":**
1. Validate. Invalid fields get a red outline and an inline message, and focus moves to the first invalid field.
2. Build the message:
   ```
   NEW ORDER – Pakisuyo Express
   Name: …
   Exact Address: …
   Landmark: …
   📍 Pin: https://maps.google.com/?q=<lat>,<lng>     (only if a pin was set)
   Contact Number: 09XX XXX XXXX
   Store/s: …
   Order List: …
   Payment: GCash
   Notes: …                                          (only if filled)
   ```
3. Copy it to the clipboard (`navigator.clipboard.writeText`), then open `https://m.me/PakisuyoExpressSariaya` in a new tab, with a toast: "Order copied! Paste it in Messenger and hit send."
4. **Fallback:** If the clipboard is unavailable or rejected, show a modal with the message in a read-only textarea, a "Copy" button (using `execCommand('copy')` with the textarea selected), and an "Open Messenger" button.

**Error handling:**
- Location denied or unavailable: a short inline note; the map and manual pin still work.
- Nominatim fails or is slow: leave the address field as typed; no error is shown apart from a subtle "Couldn't look up address — please type it."
- Map tiles fail to load: the map area collapses and the typed fields still work.

**Privacy:** Nothing is stored or sent anywhere except the customer's own clipboard and Messenger. No analytics.

## 8. App demo (tap-through)

The demo is a phone frame on the page, running fully client-side on sample data from `stores.js`.

1. **Splash:** Stacked logo on red for about 1s; tap to skip.
2. **Home:** "Deliver to Poblacion, Sariaya"; a search bar that filters the store list; category chips (All / Fast food / Coffee / Cakes / Filipino); store rows with logo or initial tile, category, ETA and an Open badge.
3. **Store menu (demo store: Jollibee Sariaya):** About 4 items (Chickenjoy w/ Rice, Jolly Spaghetti, Yumburger, Coke Float) with photo, name and price, labelled **"Sample menu · prices for demo only"**. The + button adds to the cart, and the sticky cart bar shows the item count and total. Other stores open a "Menu coming soon" state with a button back to Jollibee.
4. **Checkout (Foodpanda-style cards on grey):**
   - Delivery address card: static map image, sample address, landmark, "Change" (non-functional in the demo).
   - Payment method card: the selected method and total, with "Change", which opens a bottom sheet (COD / GCash / Maya / Card) and updates the card.
   - Promo nudge: "First order? Use code **PAKISUYO10** for ₱10 off delivery." Tapping it applies a −₱10 line.
   - Order summary: `Nx Item … ₱price` lines, Subtotal, Delivery fee, (Promo), **Total**.
   - Fee rule: store in Sariaya → ₱50; store out of town → "Out-of-town fee — confirmed by our team" and the total is shown as "Total (excl. delivery)".
   - Sticky "Place Order · ₱total" button.
5. **Live tracking:** A rider icon moving along a path on a stylised map; "Arriving in ~N min"; order number `PX-####`; a status timeline that advances on its own every ~3s: **Order Placed → Preparing → Rider Assigned → Out for Delivery → Delivered**. At the end: "Delivered! Enjoy your meal 🎉" and a **"Restart demo"** button.

Each screen has a small caption outside the phone tying it to the manual step it replaces (e.g. "Replaces: typing out the order form in Messenger").

**Behaviour:** Demo state is in memory only and resets on "Restart demo". The demo respects `prefers-reduced-motion` (no rider animation; status changes become instant steps).

## 9. Images & assets

- **Brand logos (Jollibee, McDonald's, Dunkin', Max Mango):** Download from Wikimedia Commons where available, into `public/assets/stores/<slug>/logo.(svg|png)`. If one can't be found, use an initial tile.
- **Local stores (Bukid AMYR, Conti's, KOPE-right):** An initial tile (e.g. "BA") on a per-store brand colour defined in `stores.js`.
- **Demo-store food photos:** Optional user-supplied PNGs at `public/assets/stores/jollibee-sariaya/items/<item-slug>.png`. Otherwise free-license stock photos of similar food (Unsplash/Pexels licence). Attribution is recorded in `public/assets/CREDITS.md`.
- **Missing image:** Any `<img>` that fails to load swaps to the initial tile or emoji placeholder.
- **Trademark note:** Real brand logos are for the **private pitch only**. Before any public launch, swap them for owner-owned or stock assets; only files change, no code.

## 10. Technical design

**Stack:** Vite, vanilla JavaScript (ES modules), plain CSS with custom properties, Leaflet, Vitest, Playwright.

**Structure**
```
index.html
src/
  main.js                  # mounts sections, wires nav and scroll
  data/stores.js           # stores, categories, sample menus, fee rules, coverage copy
  data/sariaya-boundary.json
  lib/order-message.js     # buildOrderMessage(formData) -> string
  lib/validate.js          # validateOrder(formData) -> { valid, errors }, normalisePhone()
  lib/geo.js               # isInsideSariaya(lat,lng), mapsLink(lat,lng), reverseGeocode()
  lib/cart.js              # addItem/removeItem, totals({items, store, promo}) -> {subtotal, fee, discount, total, feeLabel}
  lib/hours.js             # isOpenNow(date, tz='Asia/Manila')
  lib/clipboard.js         # copyText(text) -> Promise<boolean>
  sections/{header,hero,restaurants,how-it-works,order-form,coverage,app-promo,footer}.js
  demo/{demo.js, screens/*.js}
  styles/{tokens.css, base.css, sections.css, demo.css}
public/assets/{brand/, stores/, CREDITS.md}
tests/unit/*.test.js
tests/e2e/*.spec.js
```

**Unit boundaries:** Everything in `lib/` is pure (or takes injected dependencies like `fetch` and `Date`) and is unit-tested. `sections/` and `demo/` only render and wire events.

**Testing**
- **Vitest:** `buildOrderMessage` (all fields, optional pin and notes omitted correctly), `validateOrder` and `normalisePhone` (valid and invalid PH numbers), `isInsideSariaya` (points inside, outside and near the boundary), `totals` (Sariaya fee, out-of-town label, promo discount), `isOpenNow` (before 8, between, after 7, Manila timezone).
- **Playwright (mobile viewport, e.g. Pixel 7):**
  1. Fill the form → Send → the clipboard contains the expected message and a Messenger tab opens.
  2. Clipboard denied → the fallback modal appears with the message.
  3. Tap through the demo: Jollibee → add 2 items → checkout → change payment to Maya → apply promo → Place Order → reach "Delivered".
- **Lighthouse (mobile):** 90+ for Performance and Accessibility before sharing.

**Hosting:** Netlify free tier (https, required for geolocation). **Publishing needs the user's explicit OK.** The pitch version is shared unlisted with the owner only.

## 11. Out of scope

Dark mode (planned post-sign), user accounts, real payments, a backend or database, saved addresses, a real menu or price catalogue, an admin or rider dashboard, analytics, and Tagalog localisation.

## 12. Open questions for the pitch meeting

- Exact coverage: which towns do they pick up from, and is delivery really Sariaya-only?
- Out-of-town delivery fee.
- Are they attached to the current logo, or open to the new system?
- Interest in moving from a personal profile to a Facebook business Page.
