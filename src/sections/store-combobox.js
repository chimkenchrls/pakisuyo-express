import { searchStores } from '../lib/directory.js';
import { escapeHtml } from '../lib/html.js';

// WAI-ARIA 1.2 combobox over the store directory; any typed text is also a valid choice.
export function attachStoreCombobox(input, listbox, { load, onPick }) {
  let stores = null;
  let options = [];
  let active = -1;

  const ensureLoaded = () => (stores ? Promise.resolve() : load().then((list) => { stores = list; }).catch(() => { stores = []; }));

  function close() {
    listbox.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  }

  function render() {
    const typed = input.value.trim();
    if (!typed) {
      close();
      return;
    }
    const matches = stores ? searchStores(stores, { query: typed }).slice(0, 6) : [];
    options = [
      ...matches.map((s) => ({ value: s.name, html: `${escapeHtml(s.name)} <span class="combo__town">· ${escapeHtml(s.town)}</span>` })),
      { value: typed, html: `Use “${escapeHtml(typed)}” as typed`, typed: true },
    ];
    active = Math.min(active, options.length - 1);
    listbox.innerHTML = options.map((o, i) => `
      <li role="option" id="store-opt-${i}" class="combo__option${o.typed ? ' combo__option--typed' : ''}" aria-selected="${i === active}" data-index="${i}">${o.html}</li>`).join('');
    listbox.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    if (active >= 0) input.setAttribute('aria-activedescendant', `store-opt-${active}`);
    else input.removeAttribute('aria-activedescendant');
  }

  function pick(index) {
    input.value = options[index].value;
    close();
    onPick?.();
  }

  input.addEventListener('focus', () => { ensureLoaded(); });
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
