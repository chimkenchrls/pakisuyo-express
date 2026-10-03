// One-off: fetch brand logos and demo food photos from Wikimedia Commons, record credits,
// and write src/data/images.json. Files the owner already saved (…/<name>.png) always win.
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const UA = 'pakisuyo-express-landing/0.1 (one-off build script; private pitch)';
const ROOT = new URL('../public/assets/', import.meta.url);

// title: an exact Commons file (preferred, checked by eye); search: a Commons query.
// Neither: a file already saved in public/assets (owner-supplied or from the brand's site), credited via `credit`.
// Neither set = skip, and the page falls back to a tile.
const TARGETS = [
  { kind: 'stores', id: 'jollibee-sariaya', file: 'stores/jollibee-sariaya/logo', title: 'File:Jollibee 2011 wordmark.svg' },
  { kind: 'stores', id: 'mcdonalds-sariaya', file: 'stores/mcdonalds-sariaya/logo', title: "File:McDonald's Golden Arches.svg" },
  { kind: 'stores', id: 'dunkin-sariaya', file: 'stores/dunkin-sariaya/logo', title: "File:Dunkin' logo.svg" },
  { kind: 'stores', id: 'wings-dims-sariaya', file: 'stores/wings-dims-sariaya/logo' },
  { kind: 'stores', id: 'dash-espresso-sariaya', file: 'stores/dash-espresso-sariaya/logo' },
  { kind: 'items', id: 'chickenjoy-rice', file: 'stores/jollibee-sariaya/items/chickenjoy-rice', credit: 'official product photo from jollibee.com.ph (private pitch only)' },
  { kind: 'items', id: 'jolly-spaghetti', file: 'stores/jollibee-sariaya/items/jolly-spaghetti', credit: 'official product photo from jollibee.com.ph (private pitch only)' },
  { kind: 'items', id: 'yumburger', file: 'stores/jollibee-sariaya/items/yumburger', credit: 'official product photo from jollibee.com.ph (private pitch only)' },
  { kind: 'items', id: 'coke-float', file: 'stores/jollibee-sariaya/items/coke-float', credit: 'official product photo from jollibee.com.ph (private pitch only)' },
];

const exists = (url) => access(url).then(() => true, () => false);
const stripHtml = (s = '') => s.replace(/<[^>]*>/g, '').trim();
async function findOwnFile(file) {
  for (const ext of ['png', 'jpg', 'jpeg', 'webp']) if (await exists(new URL(`${file}.${ext}`, ROOT))) return ext;
  return null;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function findOnCommons({ title, search }) {
  const lookup = title
    ? { titles: title }
    : { generator: 'search', gsrnamespace: '6', gsrsearch: search, gsrlimit: '8' };
  const params = new URLSearchParams({
    action: 'query', format: 'json', ...lookup, prop: 'imageinfo', iiprop: 'url|mime|extmetadata', iiurlwidth: '256',
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Commons responded ${res.status}`);
  const pages = Object.values((await res.json()).query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return pages
    .map((p) => ({ title: p.title, info: p.imageinfo?.[0] }))
    .find((p) => p.info && /^image\/(png|jpeg|svg\+xml)$/.test(p.info.mime));
}

const manifest = { stores: {}, items: {} };
// Assets that aren't store images but still need crediting (kept here so re-runs don't drop them).
const credits = [
  '- `payments/gcash.svg` · [File:GCash logo.svg](https://commons.wikimedia.org/wiki/File:GCash_logo.svg) · Moonrivers · Public domain (GCash acceptance mark, shown because the business accepts GCash)',
];

for (const t of TARGETS) {
  // A target with neither `title` nor `search` is owner-supplied.
  if (!t.title && !t.search) {
    const ownExt = await findOwnFile(t.file);
    if (ownExt) {
      manifest[t.kind][t.id] = `/assets/${t.file}.${ownExt}`;
      credits.push(`- \`${t.file}.${ownExt}\` · ${t.credit ?? 'supplied by the project owner (private pitch only)'}`);
      console.log(`✓ ${t.id}: using owner-supplied file`);
    }
    continue;
  }

  const hit = await findOnCommons(t);
  if (!hit) {
    console.warn(`✗ ${t.id}: nothing found for "${t.title ?? t.search}"; the page will use a fallback tile`);
    continue;
  }
  const src = hit.info.thumburl ?? hit.info.url;
  const ext = (src.match(/\.(png|jpe?g)(?:$|\?)/i)?.[1] ?? 'png').toLowerCase().replace('jpeg', 'jpg');
  const out = new URL(`${t.file}.${ext}`, ROOT);
  await mkdir(dirname(fileURLToPath(out)), { recursive: true });
  const img = await fetch(src, { headers: { 'User-Agent': UA } });
  if (!img.ok) {
    console.warn(`✗ ${t.id}: download failed (${img.status})`);
    continue;
  }
  await writeFile(out, Buffer.from(await img.arrayBuffer()));
  manifest[t.kind][t.id] = `/assets/${t.file}.${ext}`;
  const meta = hit.info.extmetadata ?? {};
  credits.push(`- \`${t.file}.${ext}\` · [${hit.title}](${hit.info.descriptionurl}) · ${stripHtml(meta.Artist?.value) || 'unknown author'} · ${meta.LicenseShortName?.value ?? 'see source'}`);
  console.log(`✓ ${t.id}: ${hit.title}`);
  await sleep(500);
}

await writeFile(new URL('../src/data/images.json', import.meta.url), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(new URL('CREDITS.md', ROOT), [
  '# Image credits',
  '',
  'Brand logos and brand food photos are for the private pitch only. Replace them before any public launch (spec §9).',
  '',
  ...credits,
  '',
].join('\n'));
