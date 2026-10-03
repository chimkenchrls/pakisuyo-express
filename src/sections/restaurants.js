import { STORES } from '../data/stores.js';
import { SELECT_STORE_EVENT } from '../data/contact.js';
import meta from '../data/directory-meta.json';
import { storeImageHtml } from '../lib/images.js';
import { escapeHtml } from '../lib/html.js';

export function renderRestaurants(el, { onBrowse }) {
  el.className = 'section restaurants';
  el.innerHTML = `
    <div class="container">
      <h2 class="section-title">Featured stores</h2>
      <p class="section-lead">Tap a store to start your order.</p>
      <ul class="store-grid">
        ${STORES.map((s) => `
          <li>
            <button type="button" class="store-card" data-name="${escapeHtml(s.name)}">
              ${storeImageHtml(s, 'store-card__logo')}
              <span class="store-card__name">${escapeHtml(s.name)}</span>
              <span class="store-card__meta">${escapeHtml(s.categoryLabel)} · ${escapeHtml(s.town)}</span>
            </button>
          </li>`).join('')}
      </ul>
      <div class="restaurants__browse">
        <button type="button" class="btn browse-btn" data-action="browse-stores">Browse all ${meta.count} stores →</button>
        <p class="restaurants__note">Sariaya &amp; Lucena · store list from OpenStreetMap</p>
      </div>
    </div>`;

  el.addEventListener('click', (e) => {
    const browse = e.target.closest('[data-action="browse-stores"]');
    if (browse) {
      onBrowse(browse);
      return;
    }
    const card = e.target.closest('.store-card');
    if (card) document.dispatchEvent(new CustomEvent(SELECT_STORE_EVENT, { detail: { name: card.dataset.name } }));
  });
}
