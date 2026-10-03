import { buildDirectory } from './directory.js';
import { STORES } from '../data/stores.js';
import { EXTRA_STORES } from '../data/extra-stores.js';

export const DIRECTORY_URL = '/data/directory.json';

let cache;

// Loaded on first need (spec §6.2) so the first page load stays light. A failed load is retried next time.
export function loadDirectory({ fetchFn = globalThis.fetch } = {}) {
  cache ??= fetchFn(DIRECTORY_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`Directory failed to load (HTTP ${res.status})`);
      return res.json();
    })
    .then((data) => buildDirectory(data.stores, EXTRA_STORES, STORES))
    .catch((err) => {
      cache = undefined;
      throw err;
    });
  return cache;
}
