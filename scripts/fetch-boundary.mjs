// One-off: download a town's municipal boundary from OpenStreetMap (ODbL) and save it as GeoJSON.
// Usage: npm run fetch:boundary -- Lucena   (default: Sariaya)
import { writeFile } from 'node:fs/promises';

const town = process.argv[2] ?? 'Sariaya';

async function findBoundary(query) {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    polygon_geojson: '1',
    polygon_threshold: '0.0005',
    limit: '5',
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'User-Agent': 'pakisuyo-express-landing/0.1 (one-off build script)' },
  });
  if (!res.ok) throw new Error(`Nominatim responded ${res.status}`);
  const places = await res.json();
  return {
    place: places.find((p) => p.type === 'administrative' && /Polygon/.test(p.geojson?.type ?? '')),
    seen: places.map((p) => `${p.type}:${p.display_name}`),
  };
}

// Independent cities like Lucena aren't filed under Quezon province, so fall back to a country-wide search.
let place;
const seen = [];
for (const query of [`${town}, Quezon, Philippines`, `${town}, Philippines`]) {
  const result = await findBoundary(query);
  seen.push(...result.seen);
  if ((place = result.place)) break;
  await new Promise((r) => setTimeout(r, 1100)); // Nominatim: max 1 request per second
}
if (!place) throw new Error(`No administrative polygon found. Got: ${seen.join(' | ')}`);

const feature = {
  type: 'Feature',
  properties: {
    name: place.display_name,
    osm_id: place.osm_id,
    source: '© OpenStreetMap contributors (ODbL)',
    fetched: new Date().toISOString().slice(0, 10),
  },
  geometry: place.geojson,
};
await writeFile(new URL(`../src/data/${town.toLowerCase()}-boundary.json`, import.meta.url), `${JSON.stringify(feature)}\n`);
console.log(`Saved ${place.display_name} (${place.geojson.type})`);
