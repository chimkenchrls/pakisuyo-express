import { INFO_PAGES } from '../data/info-pages.js';
import { icon } from '../lib/icons.js';

// About / Privacy / Terms in one native <dialog>. Each has its own address (#about, #privacy, #terms)
// so it can be shared, and the phone's Back button closes it.
export function mountInfoModals() {
  const dialog = document.createElement('dialog');
  dialog.className = 'info-modal';
  dialog.setAttribute('aria-labelledby', 'info-modal-title');
  dialog.innerHTML = `
    <div class="info-modal__card">
      <div class="info-modal__head">
        <h2 id="info-modal-title" class="info-modal__title"></h2>
        <button type="button" class="info-modal__close" aria-label="Close">${icon('x')}</button>
      </div>
      <div class="info-modal__body" tabindex="-1"></div>
    </div>`;
  document.body.append(dialog);

  const titleEl = dialog.querySelector('.info-modal__title');
  const bodyEl = dialog.querySelector('.info-modal__body');
  let openedFromPage = false; // a link on this page pushed the #hash, so Back can undo it
  let returnTo = null;

  function open(id) {
    const page = INFO_PAGES[id];
    titleEl.textContent = page.title;
    bodyEl.innerHTML = `${page.draft ? '<p class="info-draft">Draft · to be reviewed by Pakisuyo Express</p>' : ''}${page.html}`;
    bodyEl.scrollTop = 0;
    if (!dialog.open) dialog.showModal();
    bodyEl.focus({ preventScroll: true }); // start on the text (arrow keys scroll); Tab reaches Close
  }

  function close() {
    if (!dialog.open) return;
    dialog.close();
    returnTo?.focus();
    returnTo = null;
  }

  function requestClose() {
    if (openedFromPage) {
      openedFromPage = false;
      history.back(); // hashchange → close()
    } else {
      history.replaceState(null, '', `${location.pathname}${location.search}`);
      close();
    }
  }

  function syncToHash() {
    const id = location.hash.slice(1);
    if (INFO_PAGES[id]) open(id);
    else close();
  }

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (link && INFO_PAGES[link.getAttribute('href').slice(1)]) {
      openedFromPage = true;
      returnTo = link;
    }
  });
  window.addEventListener('hashchange', syncToHash);

  dialog.querySelector('.info-modal__close').addEventListener('click', requestClose);
  dialog.addEventListener('cancel', (e) => { // Esc
    e.preventDefault();
    requestClose();
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) requestClose(); // the dimmed area around the card
  });

  syncToHash();
}
