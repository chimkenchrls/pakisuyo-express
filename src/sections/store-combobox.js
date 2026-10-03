import { searchStores, storeLabel } from '../lib/directory.js';
import { escapeHtml } from '../lib/html.js';

// WAI-ARIA 1.2 combobox over the store directory; any typed text is also a valid choice.
export function attachStoreCombobox(input, listbox, { load, onPick }) {
  let stores = null;
  let options = [];
  let active = -1;

  // On failure `stores` stays null so the next focus or keystroke retries (loadDirectory clears its cache).
  const ensureLoaded = () => (stores ? Promise.resolve() : load().then((list) => { stores = list; }).catch(() => {}));

  function close() {
    listbox.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  }

  const toOption = (s) => ({ value: storeLabel(s), html: `${escapeHtml(s.name)} <span class="combo__town">· ${escapeHtml(s.town)}</span>` });

  // Keep the field and its list clear of the sticky header and inside the screen (keyboard included).
  function fitList() {
    const headerBottom = (document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0) + 8;
    const scrollBy = (dy) => window.scrollBy({ top: dy, behavior: 'instant' });
    let rect = input.getBoundingClientRect();
    if (rect.top < headerBottom) {
      scrollBy(rect.top - headerBottom);
      rect = input.getBoundingClientRect();
    }
    const viewport = window.visualViewport?.height ?? window.innerHeight;
    let room = viewport - rect.bottom - 12;
    const wanted = 200;
    if (room < wanted && rect.top - headerBottom > 0) {
      scrollBy(Math.min(wanted - room, rect.top - headerBottom));
      rect = input.getBoundingClientRect();
      room = viewport - rect.bottom - 12;
    }
    listbox.style.maxHeight = `${Math.max(120, Math.min(320, room))}px`;
  }

  // Empty field: the whole list (featured first). Typing: best matches plus "use as typed".
  function render() {
    const typed = input.value.trim();
    if (!typed && !stores?.length) {
      close();
      return;
    }
    options = typed
      ? [
        ...(stores ? searchStores(stores, { query: typed }).slice(0, 6) : []).map(toOption),
        { value: typed, html: `Use “${escapeHtml(typed)}” as typed`, typed: true },
      ]
      : stores.map(toOption);
    active = Math.min(active, options.length - 1);
    listbox.innerHTML = options.map((o, i) => `
      <li role="option" id="store-opt-${i}" class="combo__option${o.typed ? ' combo__option--typed' : ''}" aria-selected="${i === active}" data-index="${i}">${o.html}</li>`).join('');
    const wasHidden = listbox.hidden;
    listbox.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    if (wasHidden) fitList();
    if (active >= 0) input.setAttribute('aria-activedescendant', `store-opt-${active}`);
    else input.removeAttribute('aria-activedescendant');
  }

  function pick(index) {
    input.value = options[index].value;
    close();
    onPick?.();
  }

  const openIfFocused = () => { if (document.activeElement === input) render(); };
  input.addEventListener('focus', () => { ensureLoaded().then(openIfFocused); });
  input.addEventListener('click', () => { if (listbox.hidden) ensureLoaded().then(openIfFocused); });
  input.addEventListener('input', () => {
    active = -1;
    render();
    if (!stores) ensureLoaded().then(() => { if (document.activeElement === input) render(); });
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (listbox.hidden) render();
      if (!options.length) return;
      active = e.key === 'ArrowDown' ? Math.min(active + 1, options.length - 1) : Math.max(active - 1, 0);
      render();
    } else if (e.key === 'Enter' && !listbox.hidden && active >= 0) {
      e.preventDefault(); // pick, don't submit the order
      pick(active);
    } else if (e.key === 'Escape' && !listbox.hidden) {
      e.preventDefault();
      close();
    }
  });
  input.addEventListener('blur', close);
  listbox.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus in the input
  listbox.addEventListener('click', (e) => {
    const li = e.target.closest('[data-index]');
    if (li) pick(Number(li.dataset.index));
  });
}
