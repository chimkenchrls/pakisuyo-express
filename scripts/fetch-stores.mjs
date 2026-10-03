// One-off: download every named food & drink place in Sariaya and Lucena from OpenStreetMap (ODbL).
// Writes public/data/directory.json (loaded lazily by the page) and src/data/directory-meta.json (count for the button).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import net from 'node:net';
import { fromOsmElement, dedupe, buildDirectory } from '../src/lib/directory.js';
import { STORES } from '../src/data/stores.js';
import { EXTRA_STORES } from '../src/data/extra-stores.js';

// Node's default 250 ms per IPv6/IPv4 attempt times out on slower connections (ETIMEDOUT); give each 2 s.
net.setDefaultAutoSelectFamilyAttemptTimeout(2000);

const UA = 'pakisuyo-express-landing/0.1 (one-off build script)';
const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const towns = [
  { name: 'Sariaya', geometry: (await readJson('../src/data/sariaya-boundary.json')).geometry },
  { name: 'Lucena', geometry: (await readJson('../src/data/lucena-boundary.json')).geometry },
];

function bbox(geometries) {
  const points = geometries.flatMap((g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).flat(1).flat(1));
  const lats = points.map((p) => p[1]);
  const lngs = points.map((p) => p[0]);
  return [Math.min(...lats), Math.min(...lngs), Math.max(...lats), Math.max(...lngs)].map((n) => n.toFixed(4)).join(',');
}

const box = bbox(towns.map((t) => t.geometry));
const query = `[out:json][timeout:90];(`
  + `nwr["amenity"~"^(restaurant|fast_food|cafe|bar|ice_cream|food_court)$"]["name"](${box});`
  + `nwr["shop"~"^(bakery|beverages|coffee|pastry|confectionery|deli)$"]["name"](${box});`
  + ');out tags center;';

async function overpass(q) {
  for (const url of SERVERS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ data: q }),
      });
      if (res.ok && (res.headers.get('content-type') ?? '').includes('json')) return (await res.json()).elements;
      console.warn(`${url} → HTTP ${res.status}`);
    } catch (err) {
      console.warn(`${url} → ${err.message}${err.cause ? ` (${err.cause.code ?? err.cause.message})` : ''}`);
    }
  }
  throw new Error('No Overpass server answered. Try again in a few minutes.');
}

const elements = await overpass(query);
const stores = dedupe(elements.map((el) => fromOsmElement(el, towns)).filter(Boolean))
  .sort((a, b) => a.town.localeCompare(b.town) || a.name.localeCompare(b.name));
const fetched = new Date().toISOString().slice(0, 10);

await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/data/directory.json', import.meta.url),
  `${JSON.stringify({ meta: { source: '© OpenStreetMap contributors (ODbL)', fetched, count: stores.length }, stores })}\n`);

const merged = buildDirectory(stores, EXTRA_STORES, STORES);
await writeFile(new URL('../src/data/directory-meta.json', import.meta.url), `${JSON.stringify({ count: merged.length, fetched })}\n`);

const byTown = Object.groupBy(stores, (s) => s.town);
console.log(`Saved ${stores.length} OSM stores (${Object.entries(byTown).map(([t, l]) => `${t}: ${l.length}`).join(', ')}) from ${elements.length} raw elements.`);
console.log(`Merged directory (featured + extras + OSM, duplicates removed): ${merged.length}`);
