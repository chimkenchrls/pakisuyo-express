import manifest from '../data/images.json';
import { escapeHtml } from './html.js';

export function initialsTile(store, cls) {
  return `<span class="${cls} tile" style="background:${store.color};color:${store.textColor}" aria-hidden="true">${escapeHtml(store.initials)}</span>`;
}

const emojiTile = (emoji, cls) => `<span class="${cls} tile" aria-hidden="true">${emoji}</span>`;

const imgWithFallback = (src, alt, cls, fallback) =>
  `<img class="${cls}" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" data-fallback="${escapeHtml(fallback)}">`;

export function storeLogoHtml(store, cls = 'store-logo') {
  const tile = initialsTile(store, cls);
  const src = manifest.stores?.[store.id];
  return src ? imgWithFallback(src, `${store.name} logo`, cls, tile) : tile;
}

export function itemImageHtml(item, cls = 'item-img') {
  const tile = emojiTile(item.emoji, cls);
  const src = manifest.items?.[item.id];
  return src ? imgWithFallback(src, item.name, cls, tile) : tile;
}

export function installImageFallback(doc = document) {
  doc.addEventListener('error', (event) => {
    const img = event.target;
    if (img instanceof HTMLImageElement && img.dataset.fallback) img.outerHTML = img.dataset.fallback;
  }, true);
}
