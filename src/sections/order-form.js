import { PAYMENT_METHODS } from '../data/payments.js';
import { MESSENGER_URL, SELECT_STORE_EVENT } from '../data/contact.js';
import { validateOrder, FIELD_ORDER } from '../lib/validate.js';
import { buildOrderMessage } from '../lib/order-message.js';
import { copyText, copyFromTextarea } from '../lib/clipboard.js';
import { reverseGeocode, addressAfterLookup } from '../lib/geo.js';
import { latestOnly } from '../lib/async.js';
import { loadDirectory } from '../lib/directory-data.js';
import { createOrderMap } from './order-map.js';
import { attachStoreCombobox } from './store-combobox.js';

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
        <div class="field field--required combo" id="field-store">
          <label for="f-store">Store/s</label>
          <input id="f-store" name="store" role="combobox" aria-autocomplete="list" aria-expanded="false"
            aria-controls="store-listbox" aria-describedby="err-store" autocomplete="off"
            placeholder="Type a store, e.g. Jollibee or Lugaw Queen">
          <ul id="store-listbox" class="combo__list" role="listbox" aria-label="Store suggestions" hidden></ul>
          <p class="field-error" id="err-store"></p>
        </div>
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
        const next = addressAfterLookup({ current: addressEl.value, lastAutofilled, result: result.value });
        if (next.value !== addressEl.value) {
          addressEl.value = next.value;
          if (next.value) setError('address', '');
        }
        lastAutofilled = next.lastAutofilled;
        statusEl.textContent = next.lookupFailed
          ? "Couldn't look up address — please type it."
          : 'Pin set. Drag it if it’s not exactly at your gate.';
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

  const storeInput = form.elements.store;
  attachStoreCombobox(storeInput, el.querySelector('#store-listbox'), {
    load: () => loadDirectory(),
    onPick: () => setError('store', ''),
  });

  form.addEventListener('input', (e) => { if (e.target.name) setError(e.target.name, ''); });
  form.addEventListener('change', (e) => { if (e.target.name) setError(e.target.name, ''); });

  document.addEventListener(SELECT_STORE_EVENT, (e) => {
    storeInput.value = e.detail.name;
    setError('store', '');
    el.scrollIntoView({ behavior: 'smooth' });
    if (e.detail.focus === 'orderList') form.elements.orderList.focus({ preventScroll: true });
  });

  function readForm() {
    const data = new FormData(form);
    const get = (key) => String(data.get(key) ?? '');
    return {
      name: get('name'), phone: get('phone'), address: get('address'), landmark: get('landmark'),
      store: get('store'), orderList: get('orderList'),
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
