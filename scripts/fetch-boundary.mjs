// One-off: download Sariaya's municipal boundary from OpenStreetMap (ODbL) and save it as GeoJSON.
import { writeFile } from 'node:fs/promises';

const params = new URLSearchParams({
  q: 'Sariaya, Quezon, Philippines',
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
const place = places.find((p) => p.type === 'administrative' && /Polygon/.test(p.geojson?.type ?? ''));
if (!place) throw new Error(`No administrative polygon found. Got: ${places.map((p) => `${p.type}:${p.display_name}`).join(' | ')}`);

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
await writeFile(new URL('../src/data/sariaya-boundary.json', import.meta.url), `${JSON.stringify(feature)}\n`);
console.log(`Saved ${place.display_name} (${place.geojson.type})`);
