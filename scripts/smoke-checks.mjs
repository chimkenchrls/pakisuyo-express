// Post-deploy checks for the public site. Pure (fetch is injected) so it is unit-tested.
// Only checks what is in the raw HTML/files: the page itself is rendered by JavaScript.
export async function runSmokeChecks(baseUrl, { fetchFn = globalThis.fetch } = {}) {
  const base = baseUrl.replace(/\/$/, '');
  const failures = [];

  const home = await fetchFn(`${base}/`, { headers: { 'Cache-Control': 'no-cache' } });
  if (!home.ok) return { ok: false, failures: [`home page returned ${home.status}`] };
  const html = await home.text();
  if (!/<title>[^<]*Pakisuyo Express/.test(html)) failures.push('page title is not Pakisuyo Express');
  if (/<meta name="robots" content="noindex">/.test(html)) failures.push('page has noindex (pitch build deployed?)');

  const script = html.match(/<script[^>]*type="module"[^>]*src="([^"]+)"/)?.[1];
  if (!script) failures.push('no app script found in the page');
  else {
    const js = await fetchFn(new URL(script, `${base}/`).href);
    if (!js.ok) failures.push(`app script ${script} returned ${js.status}`);
  }

  const dir = await fetchFn(`${base}/data/directory.json`);
  if (!dir.ok) failures.push(`directory.json returned ${dir.status}`);
  else {
    const { stores = [] } = await dir.json();
    if (stores.length < 100) failures.push(`directory.json has only ${stores.length} stores`);
  }

  // Third-party brand images are pitch-only. Some servers answer unknown paths with the home page,
  // so only an actual image response counts as "served".
  const brand = await fetchFn(`${base}/assets/stores/jollibee-sariaya/logo.png`);
  if (brand.ok && (brand.headers?.get('content-type') ?? '').startsWith('image/')) failures.push('brand image is publicly served');

  return { ok: failures.length === 0, failures };
}
