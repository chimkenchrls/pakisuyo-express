import { COVERAGE, SARIAYA_DELIVERY_FEE } from '../data/stores.js';
import { MESSENGER_URL } from '../data/contact.js';
import { peso } from '../lib/cart.js';
import { icon } from '../lib/icons.js';

const listOf = (items) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : items[0]);

export function renderCoverage(el) {
  el.className = 'section coverage';
  el.innerHTML = `
    <div class="container">
      <h2 class="section-title">Where we deliver</h2>
      <p class="section-lead">We pick up from stores in ${listOf(COVERAGE.pickupTowns)} and deliver within ${COVERAGE.deliveryArea}.</p>
      <div class="coverage__grid">
        <div class="info-card"><h3>${icon('clock', 'icon--brand')}Hours</h3><p>Open daily, 8AM–7PM</p></div>
        <div class="info-card"><h3>${icon('moped', 'icon--brand')}Delivery fee</h3><p>${peso(SARIAYA_DELIVERY_FEE)} for stores within Sariaya. Out-of-town stores: confirmed by our team.</p></div>
        <div class="info-card"><h3>${icon('chat-circle-dots', 'icon--brand')}Questions?</h3><p><a href="${MESSENGER_URL}" target="_blank" rel="noopener">Message us on Messenger</a></p></div>
      </div>
    </div>`;
}
