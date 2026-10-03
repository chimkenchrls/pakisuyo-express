import { STORES } from '../data/stores.js';
import { SELECT_STORE_EVENT } from '../data/contact.js';
import { storeImageHtml } from '../lib/images.js';
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
              ${storeImageHtml(s, 'store-card__logo')}
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
