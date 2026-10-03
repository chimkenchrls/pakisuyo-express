import { CATEGORIES, PROMO, getStore } from '../data/stores.js';
import { PAYMENT_METHODS, paymentBadgeHtml } from '../data/payments.js';
import { itemCount, totals, peso } from '../lib/cart.js';
import { storeImageHtml, itemImageHtml } from '../lib/images.js';
import { logoStacked } from '../brand/logo.js';
import { escapeHtml } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { visibleStores, isTrackingDone, TRACKING_STEPS, DEMO_STORE_ID } from './state.js';

export const CAPTIONS = {
  splash: 'Your brand, front and centre.',
  home: 'Replaces: “Available po ba si Jollibee?” Now every store shows if it’s open.',
  store: 'Replaces: food posts on Facebook. Now it’s a menu customers can order from.',
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
      ${storeImageHtml(s, 'ds-row-logo')}
      <span><b>${escapeHtml(s.name)}</b>
        <span class="ds-meta">${escapeHtml(s.categoryLabel)} · ${s.eta} · <span class="ds-open">Open</span></span></span>
    </button>
  </li>`;

function home(state) {
  const stores = visibleStores(state);
  return `
    <div class="ds ds--home">
      <div class="ds-top">
        <p class="ds-deliver">${icon('map-pin', 'icon--brand')} Deliver to <b>Poblacion, Sariaya</b></p>
        <p class="ds-greet">Hungry? We got you.</p>
        <label class="sr-only" for="demo-search">Search stores or food</label>
        <input id="demo-search" class="ds-search" type="search" placeholder="Search stores or food"
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
      <button type="button" class="ds-back" data-action="BACK" aria-label="Back">${icon('arrow-left')}</button>
      <div class="ds-store-hero" style="background:${store.color}">${storeImageHtml(store, 'ds-store-logo')}</div>
      <div class="ds-pad">
        <h3 class="ds-h">${escapeHtml(store.name)}</h3>
        <p class="ds-muted">${store.menu.length ? 'Prices from jollibee.com.ph · may differ in-store' : `${escapeHtml(store.categoryLabel)} · ${store.eta}`}</p>
      </div>
      ${menu}
      ${count ? `<button type="button" class="ds-cartbar" data-action="GO_CHECKOUT"><span>${icon('shopping-bag')} ${count} item${count > 1 ? 's' : ''}</span><span>View cart · ${peso(subtotal)}</span></button>` : ''}
    </div>`;
}

function sheet(state) {
  return `
    <button type="button" class="ds-sheet-backdrop" data-action="CLOSE_SHEET" aria-label="Close payment options"></button>
    <div class="ds-sheet" role="dialog" aria-label="Choose payment method">
      <h4>Payment method</h4>
      ${PAYMENT_METHODS.map((m) => `
        <button type="button" class="ds-sheet-option${m.id === state.payment ? ' is-on' : ''}" data-action="SET_PAYMENT"
          data-payment="${m.id}" aria-pressed="${m.id === state.payment}"><span class="pay-badge">${paymentBadgeHtml(m)}</span>${m.id === state.payment ? `<span class="ds-check">${icon('check')}</span>` : ''}</button>`).join('')}
    </div>`;
}

function checkout(state) {
  const store = getStore(state.storeId);
  const t = totals(state.cart, store, { promoApplied: state.promoApplied });
  const method = PAYMENT_METHODS.find((m) => m.id === state.payment);
  const promo = !t.feeKnown ? '' : state.promoApplied
    ? `<p class="ds-promo is-applied">${icon('check-circle')} ${PROMO.code} applied: ₱${PROMO.discount} off delivery</p>`
    : `<button type="button" class="ds-promo" data-action="APPLY_PROMO">${icon('confetti')} First order? Use code <b>${PROMO.code}</b> for ₱${PROMO.discount} off delivery. <u>Apply</u></button>`;

  return `
    <div class="ds ds--checkout">
      <div class="ds-bar"><button type="button" class="ds-back ds-back--inline" data-action="BACK" aria-label="Back">${icon('arrow-left')}</button><b>Checkout</b></div>
      <section class="ds-card">
        <div class="ds-row"><b>Delivery address</b><span class="ds-link">Change</span></div>
        <div class="ds-map" aria-hidden="true">${icon('map-pin', 'icon--brand')}</div>
        <p><b>Purok 3, Brgy. Sampaloc, Sariaya</b></p>
        <p class="ds-muted">Landmark: Blue gate beside the chapel</p>
      </section>
      <section class="ds-card">
        <div class="ds-row"><b>Payment method</b><button type="button" class="ds-link" data-action="OPEN_SHEET">Change</button></div>
        <div class="ds-pm ds-row"><b class="pay-badge">${paymentBadgeHtml(method)}</b><b>${peso(t.total)}</b></div>
        ${promo}
      </section>
      <section class="ds-card">
        <b>Order summary</b>
        <p class="ds-muted">${escapeHtml(store.name)}</p>
        ${state.cart.lines.map((l) => `<div class="ds-row ds-line"><span>${l.qty}x ${escapeHtml(l.name)}</span><span>${peso(l.price * l.qty)}</span></div>`).join('')}
        <div class="ds-totals">
          <div class="ds-row ds-muted"><span>Subtotal</span><span>${peso(t.subtotal)}</span></div>
          <div class="ds-row ds-muted"><span>${t.feeLabel}</span><span>${t.feeKnown ? peso(t.fee) : 'TBC'}</span></div>
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
      <div class="ds-track-map" aria-hidden="true"><span class="ds-rider" style="--progress:${progress}">${icon('moped')}</span><span class="ds-dest">${icon('map-pin', 'icon--brand')}</span></div>
      <div class="ds-pad">
        <h3 class="ds-h">${done ? 'Delivered! Enjoy your meal.' : `Arriving in ~${12 - state.trackingStep * 3} min`}</h3>
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
