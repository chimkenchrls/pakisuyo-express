import rawManifest from '../data/images.json';
import { escapeHtml } from './html.js';
import { categoryById } from '../data/categories.js';
import { visibleManifest } from './brand-assets.js';
import { icon } from './icons.js';

// `npm run build:pitch` / `dev:pitch` set VITE_PITCH=true; the public build leaves third-party brand images out.
const manifest = visibleManifest(rawManifest, { pitch: import.meta.env.VITE_PITCH === 'true' });

export function initialsTile(store, cls) {
  return `<span class="${cls} tile" style="background:${store.color};color:${store.textColor}" aria-hidden="true">${escapeHtml(store.initials)}</span>`;
}

const iconTile = (name, cls) => `<span class="${cls} tile tile--icon" aria-hidden="true">${icon(name)}</span>`;

const imgWithFallback = (src, alt, cls, fallback) =>
  `<img class="${cls}" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" data-fallback="${escapeHtml(fallback)}">`;

export function categoryTile(categoryId, cls) {
  const c = categoryById(categoryId);
  return `<span class="${cls} tile tile--icon" style="background:${c?.tile ?? '#F6F6F6'}" aria-hidden="true">${icon(c?.icon ?? 'fork-knife')}</span>`;
}

// The only place that decides a store's picture (spec §6.4). Google Places photos would plug in here.
export function storeImageHtml(store, cls = 'store-logo') {
  const fallback = store.initials ? initialsTile(store, cls) : categoryTile(store.category, cls);
  const src = manifest.stores?.[store.id];
  return src ? imgWithFallback(src, `${store.name} logo`, cls, fallback) : fallback;
}

export function itemImageHtml(item, cls = 'item-img') {
  const tile = iconTile(item.icon ?? 'bowl-food', cls);
  const src = manifest.items?.[item.id];
  return src ? imgWithFallback(src, item.name, cls, tile) : tile;
}

export function installImageFallback(doc = document) {
  doc.addEventListener('error', (event) => {
    const img = event.target;
    if (img instanceof HTMLImageElement && img.dataset.fallback) img.outerHTML = img.dataset.fallback;
  }, true);
}
