// Third-party brand logos/photos are for the private pitch only (spec §9). The public (launch) build drops them
// and the store falls back to its initials or icon tile. Owner-supplied logos (Wings & Dims, Dash) stay.
export const BRAND_PROTECTED = new Set([
  'jollibee-sariaya',
  'chickenjoy-rice', 'jolly-spaghetti', 'yumburger', 'coke-float',
]);

const keep = (entries, pitch) => Object.fromEntries(Object.entries(entries ?? {}).filter(([id]) => pitch || !BRAND_PROTECTED.has(id)));

export function visibleManifest(manifest, { pitch }) {
  return { stores: keep(manifest.stores, pitch), items: keep(manifest.items, pitch) };
}
