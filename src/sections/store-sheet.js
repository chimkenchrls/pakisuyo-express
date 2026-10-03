import { DIRECTORY_CATEGORIES, categoryById } from '../data/categories.js';
import { SELECT_STORE_EVENT } from '../data/contact.js';
import { searchStores, storeLabel } from '../lib/directory.js';
import { loadDirectory } from '../lib/directory-data.js';
import { storeImageHtml } from '../lib/images.js';
import { escapeHtml } from '../lib/html.js';

const PAGE = 50;
const CHIPS = [{ id: 'all', label: 'All' }, ...DIRECTORY_CATEGORIES];

const rowHtml = (s) => `
  <li class="dir-row">
    ${storeImageHtml(s, 'dir-row__img')}
    <div class="dir-row__text">
      <b class="dir-row__name">${escapeHtml(s.name)}${s.featured ? ' <span class="badge">Featured</span>' : ''}</b>
      <span class="dir-row__meta">${escapeHtml(s.featured ? s.categoryLabel : categoryById(s.category)?.singular ?? '')} · ${escapeHtml(s.town)}</span>
    </div>
    <button type="button" class="dir-row__order" data-name="${escapeHtml(storeLabel(s))}" aria-label="Order from ${escapeHtml(s.name)}">Order →</button>
  </li>`;

export function mountStoreSheet({ returnFocus }) {
  const sheet = document.createElement('div');
  sheet.className = 'store-sheet';
  sheet.hidden = true;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-labelledby', 'store-sheet-title');
  sheet.innerHTML = `
    <div class="store-sheet__head">
      <div class="store-sheet__title-row">
        <h2 id="store-sheet-title" class="store-sheet__title">All stores</h2>
        <button type="button" class="store-sheet__close" aria-label="Close">✕</button>
      </div>
      <div class="store-sheet__search">
        <label class="sr-only" for="store-sheet-q">Search stores</label>
        <input id="store-sheet-q" type="search" placeholder="🔍 Search stores" autocomplete="off">
        <label class="sr-only" for="store-sheet-town">Town</label>
        <select id="store-sheet-town" class="store-sheet__town">
          <option value="all">📍 All towns</option><option value="Sariaya">📍 Sariaya</option><option value="Lucena">📍 Lucena</option>
        </select>
      </div>
      <div class="store-sheet__chips" role="group" aria-label="Store type">
        ${CHIPS.map((c) => `<button type="button" class="store-sheet__chip" data-category="${c.id}" aria-pressed="${c.id === 'all'}">${c.label}</button>`).join('')}
      </div>
    </div>
    <p class="store-sheet__count" aria-live="polite">Loading stores…</p>
    <ul class="store-sheet__list"></ul>
    <button type="button" class="btn btn--ghost store-sheet__more" hidden>Show 50 more</button>
    <p class="store-sheet__foot">Store list © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> · Not all stores are official Pakisuyo partners.</p>`;
  document.body.append(sheet);

  const input = sheet.querySelector('#store-sheet-q');
  const townSelect = sheet.querySelector('#store-sheet-town');
  const countEl = sheet.querySelector('.store-sheet__count');
  const listEl = sheet.querySelector('.store-sheet__list');
  const moreBtn = sheet.querySelector('.store-sheet__more');

  const state = { query: '', town: 'all', category: 'all', shown: PAGE };
  let stores = null;
  let failed = false;
  let openedFromPage = false;
  let afterClose = null;
  let returnTarget = null;
  let closingByUs = false; // our own history.back(): returning to e.g. #order is not "navigating away"
  let searchTimer;

  function renderList() {
    if (failed) {
      countEl.textContent = "Couldn't load the store list. Type any store in the order form.";
      listEl.innerHTML = '';
      moreBtn.hidden = true;
      return;
    }
    if (!stores) {
      countEl.textContent = 'Loading stores…';
      return;
    }
    const results = searchStores(stores, state);
    countEl.textContent = results.length
      ? `${results.length} ${results.length === 1 ? 'store' : 'stores'}`
      : `No stores match “${state.query}”. You can still type it in the order form and we'll pick it up from there.`;
    listEl.innerHTML = results.slice(0, state.shown).map(rowHtml).join('');
    moreBtn.hidden = results.length <= state.shown;
  }

  function open() {
    if (!sheet.hidden) return;
    sheet.hidden = false;
    document.documentElement.classList.add('is-locked');
    input.focus();
    renderList();
    loadDirectory()
      .then((list) => { stores = list; failed = false; })
      .catch(() => { failed = true; })
      .finally(renderList);
  }

  // navigatedAway: closed because the visitor followed a link (e.g. the header's "Order Now"),
  // so leave focus and scroll where that link put them.
  function close({ navigatedAway = false } = {}) {
    if (sheet.hidden) return;
    sheet.hidden = true;
    document.documentElement.classList.remove('is-locked');
    const next = afterClose;
    const target = returnTarget ?? returnFocus();
    afterClose = null;
    returnTarget = null;
    if (navigatedAway) {
      openedFromPage = false;
      return;
    }
    if (next) next();
    else target?.focus();
  }

  function requestClose() {
    if (openedFromPage) {
      openedFromPage = false;
      closingByUs = true;
      history.back(); // hashchange → close()
    } else {
      history.replaceState(null, '', `${location.pathname}${location.search}`);
      close();
    }
  }

  function syncToHash() {
    if (location.hash === '#stores') {
      open();
      return;
    }
    close({ navigatedAway: Boolean(location.hash) && !closingByUs });
    closingByUs = false;
  }
  window.addEventListener('hashchange', syncToHash);
  syncToHash();

  sheet.querySelector('.store-sheet__close').addEventListener('click', requestClose);

  sheet.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      requestClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusables = [...sheet.querySelectorAll('button:not([hidden]), input, select, a[href]')].filter((el) => el.offsetParent !== null);
    const first = focusables[0];
    const last = focusables.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  input.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.query = input.value;
      state.shown = PAGE;
      renderList();
    }, 120);
  });

  townSelect.addEventListener('change', () => {
    state.town = townSelect.value;
    state.shown = PAGE;
    renderList();
  });

  sheet.querySelector('.store-sheet__chips').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-category]');
    if (!chip) return;
    state.category = chip.dataset.category;
    state.shown = PAGE;
    sheet.querySelectorAll('.store-sheet__chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    renderList();
  });

  moreBtn.addEventListener('click', () => {
    state.shown += PAGE;
    renderList();
  });

  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.dir-row__order');
    if (!btn) return;
    const { name } = btn.dataset;
    afterClose = () => document.dispatchEvent(new CustomEvent(SELECT_STORE_EVENT, { detail: { name, focus: 'orderList' } }));
    requestClose();
  });

  return {
    openFromPage(trigger = null) {
      openedFromPage = true;
      returnTarget = trigger;
      location.hash = 'stores'; // adds a history entry so Back closes it
      open(); // open now; the async hashchange then finds it already open
    },
  };
}
