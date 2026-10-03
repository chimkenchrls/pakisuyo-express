import { PAYMENT_METHODS, paymentBadgeHtml } from '../data/payments.js';
import { MESSENGER_URL, SELECT_STORE_EVENT } from '../data/contact.js';
import { validateOrder, FIELD_ORDER, LIMITS, sanitisePhoneInput } from '../lib/validate.js';
import { buildOrderMessage } from '../lib/order-message.js';
import { copyText, copyFromTextarea } from '../lib/clipboard.js';
import { reverseGeocode, addressAfterLookup } from '../lib/geo.js';
import { latestOnly } from '../lib/async.js';
import { loadDirectory } from '../lib/directory-data.js';
import { loadDetails, saveDetails, clearDetails } from '../lib/saved-details.js';
import { deliveryFeeHint } from '../lib/fees.js';
import { createOrderMap } from './order-map.js';
import { attachStoreCombobox } from './store-combobox.js';

const field = (name, label, control, { required = true, hidden = false } = {}) => `
  <div class="field${required ? ' field--required' : ''}" id="field-${name}"${hidden ? ' hidden' : ''}>
    <label for="f-${name}">${label}</label>
    ${control}
    <p class="field-error" id="err-${name}"></p>
  </div>`;

const maxlength = (name) => (LIMITS[name] ? ` maxlength="${LIMITS[name]}"` : '');
const control = (tag, name, attrs = '') => (tag === 'textarea'
  ? `<textarea id="f-${name}" name="${name}" aria-describedby="err-${name}"${maxlength(name)} ${attrs}></textarea>`
  : `<input id="f-${name}" name="${name}" aria-describedby="err-${name}"${maxlength(name)} ${attrs}>`);

function markup() {
  return `
    <div class="container order__inner">
      <div class="order__intro">
        <h2 class="section-title">Place your order</h2>
        <p class="section-lead">Fill this in and we'll copy it for you. Just paste it in Messenger and hit send.</p>
      </div>
      <form class="order-form" novalidate>
        ${field('name', 'Name', control('input', 'name', 'autocomplete="name"'))}
        <div class="field field--required" id="field-phone">
          <label for="f-phone">Contact Number</label>
          <input id="f-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel"
            placeholder="09171234567" aria-describedby="hint-phone err-phone">
          <p class="hint" id="hint-phone">11 digits starting with 09, e.g. 09171234567</p>
          <p class="field-error" id="err-phone"></p>
        </div>
        <fieldset class="field field--map">
          <legend>Delivery location</legend>
          <button type="button" class="btn btn--ghost" data-action="locate">📍 Use my current location</button>
          <div class="order-map" id="order-map" aria-label="Map: tap to drop a pin on your location"></div>
          <p class="hint" id="map-status" aria-live="polite">Tap the map to drop a pin. You can drag it to your exact gate.</p>
          <p class="warning" id="area-warning" hidden>Looks like you're outside our delivery area. Message us to check.</p>
        </fieldset>
        ${field('address', 'Exact Address', control('input', 'address', 'autocomplete="street-address"'))}
        ${field('landmark', 'Landmark', control('input', 'landmark', 'placeholder="e.g. Blue gate beside the chapel"'))}
        <div class="field field--required combo" id="field-store">
          <label for="f-store">Store/s</label>
          <input id="f-store" name="store" maxlength="${LIMITS.store}" role="combobox" aria-autocomplete="list" aria-expanded="false"
            aria-controls="store-listbox" aria-describedby="err-store" autocomplete="off"
            placeholder="Type a store, e.g. Jollibee or Lugaw Queen">
          <ul id="store-listbox" class="combo__list" role="listbox" aria-label="Store suggestions" hidden></ul>
          <p class="hint" id="store-fee" aria-live="polite"></p>
          <p class="field-error" id="err-store"></p>
        </div>
        ${field('orderList', 'Order List', control('textarea', 'orderList', 'rows="4" placeholder="e.g. 1 Chickenjoy bucket, 2 Coke Float"'))}
        <fieldset class="field field--required" id="field-payment" aria-describedby="err-payment">
          <legend>Payment method</legend>
          <div class="chips">
            ${PAYMENT_METHODS.map((m) => `
              <label class="chip"><input type="radio" name="payment" value="${m.id}"><span class="pay-badge">${paymentBadgeHtml(m)}</span></label>`).join('')}
          </div>
          <p class="field-error" id="err-payment"></p>
        </fieldset>
        <div class="field change" id="field-changeFor" hidden>
          <label for="f-changeFor">Paying cash? How much will you pay with? (optional)</label>
          <div class="change__chips">
            ${['Exact amount', '₱500', '₱1,000'].map((v) => `<button type="button" class="change__chip" data-change="${v}">${v}</button>`).join('')}
          </div>
          <input id="f-changeFor" name="changeFor" maxlength="${LIMITS.changeFor}" inputmode="numeric" placeholder="e.g. 1000" aria-describedby="err-changeFor" autocomplete="off">
          <p class="field-error" id="err-changeFor"></p>
        </div>
        ${field('notes', 'Notes (optional)', control('textarea', 'notes', 'rows="2" placeholder="e.g. Call when outside"'), { required: false })}
        <div class="remember">
          <label class="remember__label"><input type="checkbox" name="remember" checked> Remember my details on this phone</label>
          <button type="button" class="remember__clear" data-action="clear-saved" hidden>Not you? Clear saved details</button>
        </div>
        <button type="submit" class="btn btn--primary order-form__submit">Send Order</button>
        <p class="hint">Payment is settled with our team in Messenger. Nothing is charged here.</p>
        <p class="hint">Your details are only used for this delivery. If you tick “Remember”, they're saved on this phone only. We don't store them anywhere else.</p>
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

  const saved = loadDetails();
  let pin = saved?.pin ?? null;
  let lastAutofilled = null;
  let lookupTimer;
  let toastTimer;
  const lookup = latestOnly((lat, lng) => reverseGeocode(lat, lng));

  const orderMap = createOrderMap({
    mapEl: el.querySelector('#order-map'),
    statusEl,
    warningEl: el.querySelector('#area-warning'),
    initialPin: saved?.pin ?? null,
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
          ? "Couldn't look up the address. Please type it."
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
  const feeEl = el.querySelector('#store-fee');
  const updateFee = () => { feeEl.textContent = deliveryFeeHint(storeInput.value); };
  attachStoreCombobox(storeInput, el.querySelector('#store-listbox'), {
    load: () => loadDirectory(),
    onPick: () => { setError('store', ''); updateFee(); },
  });
  storeInput.addEventListener('input', updateFee);
  updateFee();

  // Contact number: digits only (max 11), pasted +63 numbers become 09…, checked when leaving the field.
  // No maxlength attribute: the browser would cut a pasted "+63 917 123 4567" before we can convert it.
  const phoneInput = form.elements.phone;
  phoneInput.addEventListener('input', () => {
    const clean = sanitisePhoneInput(phoneInput.value);
    if (clean !== phoneInput.value) phoneInput.value = clean;
  });
  phoneInput.addEventListener('blur', () => {
    if (!phoneInput.value) return;
    setError('phone', validateOrder({ phone: phoneInput.value }).errors.phone ?? '');
  });

  // Cash on delivery: "how much will you pay with?"
  const changeField = el.querySelector('#field-changeFor');
  const changeInput = form.elements.changeFor;
  form.addEventListener('change', (e) => {
    if (e.target.name === 'payment') changeField.hidden = e.target.value !== 'cod';
  });
  changeField.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-change]');
    if (!chip) return;
    changeInput.value = chip.dataset.change;
    setError('changeFor', '');
  });

  // Remember my details on this phone
  const clearSavedBtn = el.querySelector('[data-action="clear-saved"]');
  const CONTACT_FIELDS = ['name', 'phone', 'address', 'landmark'];
  if (saved) {
    CONTACT_FIELDS.forEach((f) => { form.elements[f].value = saved[f]; });
    phoneInput.value = sanitisePhoneInput(saved.phone);
    clearSavedBtn.hidden = false;
  }
  clearSavedBtn.addEventListener('click', () => {
    clearDetails();
    CONTACT_FIELDS.forEach((f) => { form.elements[f].value = ''; setError(f, ''); });
    pin = null;
    lastAutofilled = null;
    orderMap.clearPin();
    clearSavedBtn.hidden = true;
    form.elements.name.focus();
  });

  form.addEventListener('input', (e) => { if (e.target.name) setError(e.target.name, ''); });
  form.addEventListener('change', (e) => { if (e.target.name) setError(e.target.name, ''); });

  document.addEventListener(SELECT_STORE_EVENT, (e) => {
    storeInput.value = e.detail.name;
    setError('store', '');
    updateFee();
    el.scrollIntoView({ behavior: 'smooth' });
    if (e.detail.focus === 'orderList') form.elements.orderList.focus({ preventScroll: true });
  });

  function readForm() {
    const data = new FormData(form);
    const get = (key) => String(data.get(key) ?? '');
    return {
      name: get('name'), phone: get('phone'), address: get('address'), landmark: get('landmark'),
      store: get('store'), orderList: get('orderList'),
      payment: get('payment'), changeFor: get('changeFor'), notes: get('notes'), pin,
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
    if (form.elements.remember.checked) {
      saveDetails(data);
      clearSavedBtn.hidden = false;
    } else {
      clearDetails();
    }
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
